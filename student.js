const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ============================================================
// GAAWOW STUDENT PORTAL V6
// Student → Institution → Enrollment → Course
//                    → Department → Class
// Also keeps Results / Certificates / Notifications
// ============================================================

let currentUser = null;
let currentProfile = null;
let currentStudent = null;
let currentAcademic = null;

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function $(id) {
  return document.getElementById(id);
}

function setText(id, value, fallback = "") {
  const el = $(id);

  if (!el) return;

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    el.textContent = fallback;
  } else {
    el.textContent = String(value);
  }
}

function show(id) {
  const el = $(id);
  if (el) el.classList.remove("hidden");
}

function hide(id) {
  const el = $(id);
  if (el) el.classList.add("hidden");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function cleanStatus(value) {
  if (!value) return "";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ------------------------------------------------------------
// LOADING / ERROR
// ------------------------------------------------------------

function hidePortalLoading() {
  const loading = $("portalLoading");
  const app = $("portalApp");

  if (loading) loading.classList.add("hidden");
  if (app) app.classList.remove("hidden");
}

function showPortalError(message) {
  console.error(message);

  const loading = $("portalLoading");

  if (loading) {
    loading.innerHTML = `
      <div style="
        max-width:420px;
        margin:auto;
        padding:30px;
        text-align:center;
      ">
        <div style="font-size:45px;">⚠️</div>
        <h3>Unable to Load Student Portal</h3>
        <p style="margin-top:10px;color:#64748B;">
          ${escapeHtml(message)}
        </p>
        <button
          type="button"
          onclick="location.reload()"
          style="
            margin-top:18px;
            padding:10px 18px;
            border:0;
            border-radius:10px;
            background:#0B1E63;
            color:white;
            cursor:pointer;
          "
        >
          Try Again
        </button>
      </div>
    `;
  }
}

// ------------------------------------------------------------
// AUTH
// ------------------------------------------------------------

async function getCurrentUser() {
  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Auth error:", error);
    return null;
  }

  return user;
}

// ------------------------------------------------------------
// PROFILE
// ------------------------------------------------------------

async function loadStudentProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select(`
      id,
      institution_id,
      full_name,
      phone,
      avatar_url,
      role,
      is_active
    `)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      "Unable to load student profile: " + error.message
    );
  }

  if (!data) {
    throw new Error("Student profile was not found.");
  }

  if (data.role !== "student") {
    throw new Error("This account is not a student account.");
  }

  if (data.is_active !== true) {
    throw new Error("Your student account is inactive.");
  }

  return data;
}

// ------------------------------------------------------------
// STUDENT
// ------------------------------------------------------------

async function loadStudent(userId) {
  const { data, error } = await supabaseClient
    .from("students")
    .select(`
      id,
      institution_id,
      profile_id,
      student_id,
      full_name,
      gender,
      date_of_birth,
      phone,
      email,
      address,
      photo_url,
      admission_date,
      status,
      account_enabled,
      auth_user_id,
      login_username,
      account_created_at,
      last_login_at,
      password_changed_at
    `)
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      "Unable to load student record: " + error.message
    );
  }

  if (!data) {
    throw new Error(
      "Student record is not linked to this login account."
    );
  }

  if (data.account_enabled !== true) {
    throw new Error("Student account is disabled.");
  }

  return data;
}

// ------------------------------------------------------------
// ACADEMIC RELATIONSHIPS
// Student
//   └── Enrollment
//         ├── Institution
//         ├── Course
//         │     └── Department
//         └── Class
// ------------------------------------------------------------

async function loadAcademicData(studentId) {
  // First get enrollment
  const {
    data: enrollment,
    error: enrollmentError
  } = await supabaseClient
    .from("enrollments")
    .select(`
      id,
      institution_id,
      student_id,
      course_id,
      class_id,
      enrollment_number,
      enrollment_date,
      start_date,
      end_date,
      status
    `)
    .eq("student_id", studentId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (enrollmentError) {
    console.error("Enrollment error:", enrollmentError);
    return null;
  }

  if (!enrollment) {
    return null;
  }

  // ----------------------------------------------------------
  // Institution
  // ----------------------------------------------------------

  let institution = null;

  if (enrollment.institution_id) {
    const { data, error } = await supabaseClient
      .from("institutions")
      .select(`
        id,
        name,
        code,
        email,
        phone,
        address,
        city,
        country,
        logo_url,
        website_url,
        is_active
      `)
      .eq("id", enrollment.institution_id)
      .maybeSingle();

    if (!error) {
      institution = data;
    } else {
      console.error("Institution error:", error);
    }
  }

  // ----------------------------------------------------------
  // Course
  // ----------------------------------------------------------

  let course = null;

  if (enrollment.course_id) {
    const { data, error } = await supabaseClient
      .from("courses")
      .select(`
        id,
        institution_id,
        department_id,
        name,
        code,
        description,
        duration_months,
        fee,
        is_active
      `)
      .eq("id", enrollment.course_id)
      .maybeSingle();

    if (!error) {
      course = data;
    } else {
      console.error("Course error:", error);
    }
  }

  // ----------------------------------------------------------
  // Department
  // ----------------------------------------------------------

  let department = null;

  if (course?.department_id) {
    const { data, error } = await supabaseClient
      .from("departments")
      .select(`
        id,
        institution_id,
        name,
        code,
        description,
        head_profile_id,
        is_active
      `)
      .eq("id", course.department_id)
      .maybeSingle();

    if (!error) {
      department = data;
    } else {
      console.error("Department error:", error);
    }
  }

  // ----------------------------------------------------------
  // Class
  // ----------------------------------------------------------

  let classData = null;

  if (enrollment.class_id) {
    const { data, error } = await supabaseClient
      .from("classes")
      .select(`
        id,
        institution_id,
        course_id,
        name,
        code,
        academic_year,
        teacher_id,
        room,
        start_date,
        end_date,
        is_active
      `)
      .eq("id", enrollment.class_id)
      .maybeSingle();

    if (!error) {
      classData = data;
    } else {
      console.error("Class error:", error);
    }
  }

  return {
    enrollment,
    institution,
    course,
    department,
    classData
  };
}

// ------------------------------------------------------------
// DISPLAY STUDENT
// ------------------------------------------------------------

function renderStudent(student, profile, user) {
  const fullName =
    student.full_name ||
    profile.full_name ||
    "Student";

  // Header
  setText("studentNameTop", fullName);
  setText("welcomeName", fullName);

  // Profile
  setText("studentFullName", fullName);
  setText("studentIdField", student.student_id);
  setText(
    "studentEmail",
    student.email || user.email || ""
  );
  setText(
    "studentPhone",
    student.phone || profile.phone || ""
  );
  setText("studentGender", student.gender);
  setText(
    "admissionDate",
    formatDate(student.admission_date)
  );

  // Some older HTML IDs
  setText("studentName", fullName);
  setText("studentId", student.student_id);
  setText(
    "studentStatus",
    cleanStatus(student.status)
  );

  // Student ID
  setText("studentNumber", student.student_id);

  // Photo
  const photo = $("studentPhoto");

  if (photo) {
    photo.src =
      student.photo_url ||
      profile.avatar_url ||
      "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";

    photo.onerror = () => {
      photo.onerror = null;
      photo.src =
        "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";
    };
  }
}

// ------------------------------------------------------------
// DISPLAY ACADEMIC RELATIONSHIPS
// ------------------------------------------------------------

function renderAcademicData(academic) {
  if (!academic) {
    console.warn("No active enrollment found.");

    // Do not use "—"
    setText("institutionName", "");
    setText("courseName", "");
    setText("departmentName", "");
    setText("className", "");
    setText("academicStatus", "");

    return;
  }

  const {
    enrollment,
    institution,
    course,
    department,
    classData
  } = academic;

  currentAcademic = academic;

  // ----------------------------------------------------------
  // Institution
  // ----------------------------------------------------------

  setText(
    "institutionName",
    institution?.name
  );

  setText(
    "institutionCode",
    institution?.code
  );

  // ----------------------------------------------------------
  // Course
  // ----------------------------------------------------------

  setText(
    "courseName",
    course?.name
  );

  setText(
    "courseCode",
    course?.code
  );

  // ----------------------------------------------------------
  // Department
  // ----------------------------------------------------------

  setText(
    "departmentName",
    department?.name
  );

  setText(
    "departmentCode",
    department?.code
  );

  // ----------------------------------------------------------
  // Class
  // ----------------------------------------------------------

  setText(
    "className",
    classData?.name
  );

  setText(
    "classCode",
    classData?.code
  );

  setText(
    "academicYear",
    classData?.academic_year
  );

  // ----------------------------------------------------------
  // Enrollment
  // ----------------------------------------------------------

  setText(
    "enrollmentStatus",
    cleanStatus(enrollment?.status)
  );

  setText(
    "academicStatus",
    cleanStatus(enrollment?.status)
  );

  setText(
    "enrollmentDate",
    formatDate(enrollment?.enrollment_date)
  );

  console.log("✅ Academic relationships loaded:", {
    institution: institution?.name,
    course: course?.name,
    department: department?.name,
    class: classData?.name,
    status: enrollment?.status
  });
}

// ------------------------------------------------------------
// RESULTS
// ------------------------------------------------------------

async function loadResults(studentId) {
  const message = $("resultsMessage");
  const table = $("resultsTable");
  const body = $("resultsBody");
  const count = $("resultsCount");

  if (message) {
    message.textContent = "Loading results...";
    message.classList.remove("hidden");
  }

  if (table) {
    table.classList.add("hidden");
  }

  if (body) {
    body.innerHTML = "";
  }

  const { data, error } = await supabaseClient
    .from("results")
    .select(`
      id,
      student_id,
      subject_id,
      exam_id,
      score,
      percentage,
      grade,
      remarks,
      created_at,
      subjects (
        id,
        name,
        code
      ),
      exams (
        id,
        name,
        exam_type
      )
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Results error:", error);

    if (message) {
      message.textContent = "Unable to load results.";
    }

    return;
  }

  const results = data || [];

  if (count) {
    count.textContent = results.length;
  }

  if (!results.length) {
    if (message) {
      message.textContent = "No academic results available yet.";
    }

    return;
  }

  if (message) {
    message.classList.add("hidden");
  }

  if (table) {
    table.classList.remove("hidden");
  }

  if (body) {
    body.innerHTML = results
      .map(result => {
        const subject =
          result.subjects?.name ||
          result.subjects?.code ||
          "";

        const exam =
          result.exams?.name ||
          result.exams?.exam_type ||
          "";

        return `
          <tr>
            <td>${escapeHtml(subject)}</td>
            <td>${escapeHtml(exam)}</td>
            <td>${escapeHtml(result.score ?? "")}</td>
            <td>${escapeHtml(result.percentage ?? "")}</td>
            <td>${escapeHtml(result.grade ?? "")}</td>
            <td>${escapeHtml(result.remarks ?? "")}</td>
          </tr>
        `;
      })
      .join("");
  }
}

// ------------------------------------------------------------
// CERTIFICATES
// ------------------------------------------------------------

async function loadCertificates(studentId) {
  const message = $("certificatesMessage");
  const list = $("certificatesList");
  const count = $("certificatesCount");

  if (message) {
    message.textContent = "Loading certificates...";
    message.classList.remove("hidden");
  }

  if (list) {
    list.innerHTML = "";
  }

  const { data, error } = await supabaseClient
    .from("certificates")
    .select(`
      id,
      certificate_number,
      title,
      status,
      issued_at,
      course_id,
      verification_code
    `)
    .eq("student_id", studentId)
    .order("issued_at", { ascending: false });

  if (error) {
    console.error("Certificates error:", error);

    if (message) {
      message.textContent =
        "Unable to load certificates.";
    }

    return;
  }

  const certificates = data || [];

  if (count) {
    count.textContent = certificates.length;
  }

  if (!certificates.length) {
    if (message) {
      message.textContent =
        "No certificates available yet.";
    }

    return;
  }

  if (message) {
    message.classList.add("hidden");
  }

  if (list) {
    list.innerHTML = certificates
      .map(cert => {
        return `
          <div class="certificate-item">
            <div>
              <strong>
                ${escapeHtml(
                  cert.title ||
                  "Certificate"
                )}
              </strong>

              <small>
                Certificate No:
                ${escapeHtml(
                  cert.certificate_number || ""
                )}
              </small>

              <small>
                Issued:
                ${escapeHtml(
                  formatDate(cert.issued_at)
                )}
              </small>
            </div>

            <span>
              ${escapeHtml(
                cleanStatus(cert.status)
              )}
            </span>
          </div>
        `;
      })
      .join("");
  }
}

// ------------------------------------------------------------
// NOTIFICATIONS
// ------------------------------------------------------------

async function loadNotifications(studentId) {
  const list = $("notificationsList");
  const count = $("notificationsCount");

  if (!list) return;

  list.innerHTML = `
    <div class="empty-message">
      Loading notifications...
    </div>
  `;

  const { data, error } = await supabaseClient
    .from("student_notifications")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error("Notifications error:", error);

    list.innerHTML = `
      <div class="empty-message">
        Unable to load notifications.
      </div>
    `;

    return;
  }

  const notifications = data || [];

  if (count) {
    count.textContent = notifications.length;
  }

  if (!notifications.length) {
    list.innerHTML = `
      <div class="empty-message">
        No notifications available.
      </div>
    `;

    return;
  }

  list.innerHTML = notifications
    .map(notification => {
      return `
        <div class="notification-item">
          <strong>
            ${escapeHtml(
              notification.title ||
              "Notification"
            )}
          </strong>

          <p>
            ${escapeHtml(
              notification.message ||
              ""
            )}
          </p>

          <small>
            ${escapeHtml(
              formatDate(
                notification.created_at
              )
            )}
          </small>
        </div>
      `;
    })
    .join("");
}

// ------------------------------------------------------------
// MARK NOTIFICATIONS READ
// ------------------------------------------------------------

async function markAllNotificationsRead() {
  if (!currentStudent?.id) return;

  const { error } = await supabaseClient
    .from("student_notifications")
    .update({
      is_read: true
    })
    .eq("student_id", currentStudent.id)
    .eq("is_read", false);

  if (error) {
    console.error(
      "Mark notifications read error:",
      error
    );

    alert("Unable to mark notifications as read.");
    return;
  }

  await loadNotifications(currentStudent.id);
}

// ------------------------------------------------------------
// LAST LOGIN
// ------------------------------------------------------------

async function updateLastLogin(studentId, userId) {
  const { error } = await supabaseClient
    .from("students")
    .update({
      last_login_at: new Date().toISOString()
    })
    .eq("id", studentId)
    .eq("auth_user_id", userId);

  if (error) {
    console.warn(
      "Unable to update last login:",
      error.message
    );
  }
}

// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------

async function logoutStudent() {
  try {
    await supabaseClient.auth.signOut();
  } finally {
    window.location.href = "login.html";
  }
}

// ------------------------------------------------------------
// MAIN PORTAL
// ------------------------------------------------------------

async function loadStudentPortal() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      window.location.href = "login.html";
      return;
    }

    currentUser = user;

    // 1. Profile
    const profile =
      await loadStudentProfile(user.id);

    currentProfile = profile;

    // 2. Student
    const student =
      await loadStudent(user.id);

    currentStudent = student;

    // 3. Student information
    renderStudent(
      student,
      profile,
      user
    );

    // 4. Academic relationships
    const academic =
      await loadAcademicData(student.id);

    renderAcademicData(academic);

    // 5. Results
    await loadResults(student.id);

    // 6. Certificates
    await loadCertificates(student.id);

    // 7. Notifications
    await loadNotifications(student.id);

    // 8. Last login
    await updateLastLogin(
      student.id,
      user.id
    );

    // 9. Show portal
    hidePortalLoading();

    console.log(
      "✅ Student Portal V6 loaded successfully:",
      student.student_id
    );

  } catch (error) {
    console.error(
      "Student Portal V6 Error:",
      error
    );

    showPortalError(
      error.message ||
      "Unable to load student portal."
    );
  }
}

// ------------------------------------------------------------
// DOM READY
// ------------------------------------------------------------

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadStudentPortal();

    const logoutBtn =
      $("logoutBtn");

    if (logoutBtn) {
      logoutBtn.addEventListener(
        "click",
        logoutStudent
      );
    }

    const markAllReadBtn =
      $("markAllReadBtn");

    if (markAllReadBtn) {
      markAllReadBtn.addEventListener(
        "click",
        markAllNotificationsRead
      );
    }
  }
);

// ------------------------------------------------------------
// AUTH STATE
// If student logs out from another tab/device
// ------------------------------------------------------------

supabaseClient.auth.onAuthStateChange(
  (event, session) => {

    if (
      event === "SIGNED_OUT" ||
      !session
    ) {
      window.location.href =
        "login.html";
    }
  }
);
