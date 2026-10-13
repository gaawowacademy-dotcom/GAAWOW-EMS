(() => {
"use strict";

/* =========================================================
   GAAWOW EMS STUDENT PORTAL V8.0
   Student identity: authenticated auth_user_id -> students.id
   Uses actual database table names and UUID relationships.
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce"
    }
  }
);

const $ = id => document.getElementById(id);

const escapeHTML = value => String(value ?? "").replace(
  /[&<>'"]/g,
  c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;"
  })[c]
);

function setText(id, value, fallback = "—") {
  const el = $(id);
  if (el) {
    el.textContent =
      value === null || value === undefined || value === ""
        ? fallback
        : String(value);
  }
}

function firstValue(obj, keys, fallback = null) {
  for (const key of keys) {
    const value = obj?.[key];

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return fallback;
}

function formatDate(value) {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return String(value);
  }

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function showStatus(message, type = "info") {
  const el = $("status");
  if (!el) return;

  el.className = `status show ${type}`;
  el.textContent = message;
}

function clearStatus() {
  const el = $("status");
  if (el) el.className = "status";
}

function setBoxMessage(id, message, error = false) {
  const el = $(id);
  if (!el) return;

  el.className = "box empty";
  el.textContent = message;

  if (error) {
    el.style.color = "#991B1B";
  } else {
    el.style.color = "";
  }
}

/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function getCurrentUser() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  let session = sessionData.session;

  if (!session?.access_token) {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) throw error;

    session = data.session;
  }

  if (!session?.access_token) {
    const error = new Error(
      "Your login session has expired. Please log in again."
    );

    error.code = "SESSION_MISSING";
    throw error;
  }

  const { data, error } = await supabase.auth.getUser(
    session.access_token
  );

  if (error) throw error;

  if (!data.user) {
    throw new Error("Authenticated user could not be verified.");
  }

  return data.user;
}

/* =========================================================
   LOAD ONLY THE STUDENT LINKED TO THIS AUTH ACCOUNT
   Never identify a student by email alone.
   ========================================================= */

async function loadStudent(user) {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Your student record is not linked to this login. " +
      "Please contact the GAAWOW EMS administrator."
    );
  }

  if (data.auth_user_id !== user.id) {
    throw new Error("Student account verification failed.");
  }

  if (data.account_enabled === false) {
    throw new Error(
      "Your student account is disabled. Please contact the administrator."
    );
  }

  return data;
}

/* =========================================================
   DATABASE READ HELPERS
   Each request is scoped to the authenticated student's UUID.
   ========================================================= */

async function readMany(table, studentUUID, orderColumn = "created_at") {
  if (!studentUUID) {
    return { rows: [], error: new Error("Student UUID is missing.") };
  }

  try {
    let query = supabase
      .from(table)
      .select("*")
      .eq("student_id", studentUUID);

    if (orderColumn) {
      query = query.order(orderColumn, { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.warn(`Unable to load ${table}:`, error.message);
      return { rows: [], error };
    }

    return {
      rows: Array.isArray(data) ? data : [],
      error: null
    };
  } catch (error) {
    console.warn(`Unable to load ${table}:`, error);
    return { rows: [], error };
  }
}

async function readById(table, id) {
  if (!id) return null;

  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.warn(`${table} lookup:`, error.message);
      return null;
    }

    return data || null;
  } catch (error) {
    console.warn(`${table} lookup:`, error);
    return null;
  }
}

/* =========================================================
   PROFILE AND INSTITUTION
   ========================================================= */

async function loadProfile(student) {
  if (!student.profile_id) return null;

  const profile = await readById("profiles", student.profile_id);

  if (!profile) return null;

  // Refuse to use a profile with an unexpected role.
  if (String(profile.role || "").toLowerCase() !== "student") {
    console.warn("Linked profile does not have the student role.");
    return null;
  }

  return profile;
}

async function loadInstitution(student) {
  return readById("institutions", student.institution_id);
}

/* =========================================================
   ENROLLMENTS AND ACADEMIC RELATIONS
   ========================================================= */

async function loadEnrollments(student) {
  const result = await readMany(
    "enrollments",
    student.id,
    "created_at"
  );

  if (result.error) {
    console.warn("Enrollment loading failed.");
  }

  return result.rows;
}

async function loadAcademicData(enrollments) {
  const output = [];

  for (const enrollment of enrollments) {
    const [course, studentClass] = await Promise.all([
      readById("courses", enrollment.course_id),
      readById("classes", enrollment.class_id)
    ]);

    let department = null;

    if (course?.department_id) {
      department = await readById(
        "departments",
        course.department_id
      );
    }

    output.push({
      enrollment,
      course,
      studentClass,
      department
    });
  }

  return output;
}

/* =========================================================
   PROFILE RENDERING
   ========================================================= */

function renderProfile(student, profile, institution, user, academic) {
  const primaryAcademic = academic.find(item =>
    item.course || item.studentClass || item.department
  ) || academic[0] || {};

  const course = primaryAcademic.course;
  const studentClass = primaryAcademic.studentClass;
  const department = primaryAcademic.department;
  const enrollment = primaryAcademic.enrollment;

  const displayName =
    student.full_name ||
    profile?.full_name ||
    user.user_metadata?.full_name ||
    "Student";

  setText("welcomeName", displayName);
  setText("studentId", student.student_id);
  setText("fullName", displayName);
  setText("email", student.email || profile?.email || user.email);
  setText("phone", student.phone || profile?.phone);

  setText("gender", student.gender);
  setText("dob", formatDate(
    firstValue(student, ["date_of_birth", "dob", "birth_date"])
  ));

  setText("enrollmentDate", formatDate(
    firstValue(student, ["admission_date"]) ||
    firstValue(enrollment, ["enrollment_date", "start_date"])
  ));

  setText("address", student.address);

  const emergency = [
    student.emergency_contact_name,
    student.emergency_contact_phone
  ].filter(Boolean).join(" · ");

  setText("emergencyContact", emergency);

  setText("institutionName", institution?.name);
  setText("accountStatus",
    student.account_enabled === false
      ? "Disabled"
      : (student.status || "Active")
  );

  setText("courseName", course?.name || course?.code);
  setText("departmentName", department?.name);
  setText("academicCourse", course?.name || course?.code);
  setText("className", studentClass?.name || studentClass?.code);
  setText(
    "academicYear",
    studentClass?.academic_year ||
    enrollment?.academic_year
  );
  setText("academicStatus", enrollment?.status || student.status);

  const photo = $("studentPhoto");

  if (photo) {
    const url = student.photo_url || profile?.avatar_url;

    if (url) {
      photo.src = url;
      photo.alt = `Photo of ${displayName}`;
      photo.onerror = () => {
        photo.removeAttribute("src");
        photo.alt = "Student photo unavailable";
      };
    } else {
      photo.removeAttribute("src");
      photo.alt = "No student photo";
    }
  }
}

/* =========================================================
   GENERIC RECORD RENDERER
   ========================================================= */

function renderRecords(boxId, rows, config, loadError) {
  const box = $(boxId);
  if (!box) return;

  if (!rows.length) {
    box.className = "box empty";
    box.style.color = loadError ? "#991B1B" : "";

    box.textContent = loadError
      ? "Unable to load this section. The database may restrict access; please contact the administrator."
      : config.emptyMessage || "No records available yet.";

    return;
  }

  box.style.color = "";
  box.className = "box records";

  box.innerHTML = rows.map((row, index) => {
    const title = firstValue(row, config.titleKeys) ||
      `${config.title} ${index + 1}`;

    const status = firstValue(row, config.statusKeys, "Recorded");

    const fields = config.fields.map(field => {
      let value = firstValue(row, field.keys, "—");

      if (field.date) {
        value = formatDate(value);
      }

      if (field.money && value !== "—") {
        const currency = row.currency || "USD";
        value = `${value} ${currency}`;
      }

      return `
        <div>
          <small>${escapeHTML(field.label)}</small>
          <b>${escapeHTML(value)}</b>
        </div>
      `;
    }).join("");

    const url = firstValue(row, config.urlKeys || []);

    let linkHTML = "";

    if (url && /^https?:\/\//i.test(String(url))) {
      linkHTML = `
        <a class="record-link"
           href="${escapeHTML(url)}"
           target="_blank"
           rel="noopener noreferrer">
          ${escapeHTML(config.linkLabel || "Open")}
        </a>
      `;
    }

    return `
      <article class="record-card">
        <div class="record-head">
          <strong>${escapeHTML(title)}</strong>
          <span class="pill">${escapeHTML(status)}</span>
        </div>
        <div class="record-grid">${fields}</div>
        ${linkHTML}
      </article>
    `;
  }).join("");
}

/* =========================================================
   ATTENDANCE
   ========================================================= */

function renderAttendance(rows, error) {
  renderRecords("attendanceBox", rows, {
    title: "Attendance",
    emptyMessage: "No attendance records have been recorded for your account yet.",
    titleKeys: ["lesson_title", "title", "lesson_name"],
    statusKeys: ["status"],
    fields: [
      { label: "Status", keys: ["status"] },
      { label: "Date", keys: ["recorded_at"], date: true },
      { label: "Notes", keys: ["notes"] }
    ]
  }, error);
}

/* =========================================================
   RESULTS
   ========================================================= */

function renderResults(rows, error) {
  const visibleRows = rows.filter(row =>
    row.is_published !== false
  );

  renderRecords("resultsBox", visibleRows, {
    title: "Examination Result",
    emptyMessage: "No published examination results are available yet.",
    titleKeys: ["exam_name", "subject_name", "title", "exam_title"],
    statusKeys: ["grade"],
    fields: [
      { label: "Score", keys: ["score"] },
      { label: "Maximum", keys: ["max_score"] },
      { label: "Percentage", keys: ["percentage"] },
      { label: "Grade", keys: ["grade"] },
      { label: "Remarks", keys: ["remarks"] },
      { label: "Date", keys: ["created_at"], date: true }
    ]
  }, error);
}

/* =========================================================
   GRADES
   ========================================================= */

function renderGrades(rows, error) {
  renderRecords("gradesBox", rows, {
    title: "Grade",
    emptyMessage: "No grade records available yet.",
    titleKeys: ["subject_name", "exam_name", "title", "grade"],
    statusKeys: ["grade"],
    fields: [
      { label: "Score", keys: ["score"] },
      { label: "Grade", keys: ["grade"] },
      { label: "Remarks", keys: ["remarks"] },
      { label: "Date", keys: ["created_at"], date: true }
    ]
  }, error);
}

/* =========================================================
   CERTIFICATES
   ========================================================= */

function renderCertificates(rows, error) {
  renderRecords("certificatesBox", rows, {
    title: "Certificate",
    emptyMessage: "No certificates are available for your account yet.",
    titleKeys: [
      "course_name_snapshot",
      "certificate_no",
      "certificate_id",
      "certificate_type"
    ],
    statusKeys: ["status"],
    fields: [
      { label: "Certificate No.", keys: ["certificate_no", "certificate_id"] },
      { label: "Course", keys: ["course_name_snapshot"] },
      { label: "Issue Date", keys: ["issue_date"], date: true },
      { label: "Expiry Date", keys: ["expiry_date"], date: true }
    ],
    urlKeys: ["certificate_url", "pdf_url"],
    linkLabel: "View Certificate"
  }, error);
}

/* =========================================================
   PAYMENTS
   ========================================================= */

function renderPayments(rows, error) {
  renderRecords("paymentsBox", rows, {
    title: "Payment",
    emptyMessage: "No payment records are available for your account yet.",
    titleKeys: [
      "transaction_reference",
      "provider_transaction_id",
      "payment_method"
    ],
    statusKeys: ["status"],
    fields: [
      { label: "Amount", keys: ["amount"], money: true },
      { label: "Method", keys: ["payment_method"] },
      { label: "Reference", keys: ["transaction_reference", "provider_transaction_id"] },
      { label: "Paid Date", keys: ["paid_at"], date: true }
    ]
  }, error);
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function renderNotifications(rows, error) {
  renderRecords("notificationsBox", rows, {
    title: "Notification",
    emptyMessage: "You have no notifications yet.",
    titleKeys: ["title"],
    statusKeys: ["is_read"],
    fields: [
      { label: "Message", keys: ["message"] },
      { label: "Type", keys: ["notification_type"] },
      { label: "Received", keys: ["created_at"], date: true }
    ]
  }, error);
}

/* =========================================================
   MAIN LOADER
   ========================================================= */

async function loadPortal() {
  try {
    clearStatus();
    showStatus("Verifying your account...", "info");

    const user = await getCurrentUser();

    const student = await loadStudent(user);

    const [profile, institution, enrollments] = await Promise.all([
      loadProfile(student),
      loadInstitution(student),
      loadEnrollments(student)
    ]);

    const academic = await loadAcademicData(enrollments);

    renderProfile(
      student,
      profile,
      institution,
      user,
      academic
    );

    showStatus("Loading your academic records...", "info");

    const results = await Promise.all([
      readMany("attendance", student.id, "recorded_at"),
      readMany("results", student.id, "created_at"),
      readMany("grades", student.id, "created_at"),
      readMany("certificates", student.id, "created_at"),
      readMany("payments", student.id, "created_at"),
      readMany("student_notifications", student.id, "created_at")
    ]);

    renderAttendance(results[0].rows, results[0].error);
    renderResults(results[1].rows, results[1].error);
    renderGrades(results[2].rows, results[2].error);
    renderCertificates(results[3].rows, results[3].error);
    renderPayments(results[4].rows, results[4].error);
    renderNotifications(results[5].rows, results[5].error);

    showStatus(
      "Your student portal has loaded. Sections without records will show an empty message.",
      "success"
    );

    setTimeout(clearStatus, 5000);

  } catch (error) {
    console.error("GAAWOW STUDENT PORTAL:", error);

    if (
      error?.code === "SESSION_MISSING" ||
      /jwt expired|not authenticated/i.test(error?.message || "")
    ) {
      window.location.replace("index.html");
      return;
    }

    showStatus(
      error?.message || "Unable to load the student portal.",
      "error"
    );
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

$("logoutBtn")?.addEventListener("click", async () => {
  const button = $("logoutBtn");

  button.disabled = true;
  button.textContent = "LOGGING OUT...";

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Logout error:", error);
    button.disabled = false;
    button.textContent = "LOGOUT";
    showStatus("Logout failed. Please try again.", "error");
    return;
  }

  window.location.replace("index.html");
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" && !session) {
    window.location.replace("index.html");
  }
});

loadPortal();

})();
