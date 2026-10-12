(() => {
"use strict";

/* =========================================================
   GAAWOW EMS — STUDENT PORTAL V7.3
   FIX: Missing department_id / optional academic columns
   Uses existing students table columns safely
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const PORTAL_VERSION = "7.3.0";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce"
    },
    global: {
      headers: {
        "x-gaawow-portal-version": PORTAL_VERSION
      }
    }
  }
);

const $ = id => document.getElementById(id);

function text(id, value) {
  const e = $(id);
  if (e) {
    e.textContent =
      value === null || value === undefined || value === ""
        ? "—"
        : String(value);
  }
}

function fmtDate(value) {
  if (!value) return "—";

  const d = new Date(value);

  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
}

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;"
  })[c]);
}

function showStatus(message, type = "info") {
  const e = $("status");
  if (!e) return;

  e.className = `status show ${type}`;
  e.textContent = message;
}

function clearStatus() {
  const e = $("status");
  if (e) e.className = "status";
}

/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function currentUser() {
  let {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  if (!session?.access_token) {
    const refreshed = await supabase.auth.refreshSession();

    if (refreshed.error) throw refreshed.error;

    session = refreshed.data.session;
  }

  if (!session?.access_token) {
    const error = new Error(
      "Login session is missing or expired. Please login again."
    );

    error.code = "SESSION_MISSING";
    throw error;
  }

  const { data, error } = await supabase.auth.getUser(
    session.access_token
  );

  if (error) {
    const message = String(error.message || "");

    if (/invalid api key/i.test(message)) {
      const e = new Error(
        "Supabase rejected the Publishable API key. " +
        "Confirm the current key in Supabase Settings → API."
      );

      e.code = "INVALID_API_KEY";
      throw e;
    }

    throw error;
  }

  return data.user;
}

/* =========================================================
   LOAD STUDENT
   FIX: select("*") avoids requesting nonexistent columns
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
      "Student profile was not found or is not linked to this login account."
    );
  }

  if (data.auth_user_id !== user.id) {
    throw new Error("Student account verification failed.");
  }

  return data;
}

/* =========================================================
   SAFE DATA LOOKUPS
   ========================================================= */

async function tryRows(table, filters) {
  for (const filter of filters) {
    try {
      let query = supabase.from(table).select("*");

      for (const [column, value] of Object.entries(filter)) {
        if (value === null || value === undefined || value === "") {
          query = null;
          break;
        }

        query = query.eq(column, value);
      }

      if (!query) continue;

      const { data, error } = await query;

      if (!error && Array.isArray(data) && data.length) {
        return data;
      }
    } catch (error) {
      console.warn(`${table} lookup:`, error);
    }
  }

  return [];
}

async function tryOneById(table, id) {
  if (!id) return null;

  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) return data;
  } catch (error) {
    console.warn(`${table} ID lookup:`, error);
  }

  return null;
}

function firstValue(object, keys) {
  for (const key of keys) {
    if (
      object &&
      object[key] !== undefined &&
      object[key] !== null &&
      String(object[key]).trim() !== ""
    ) {
      return object[key];
    }
  }

  return null;
}

async function loadNamedRelation(tableNames, id) {
  if (!id) return null;

  for (const table of tableNames) {
    const row = await tryOneById(table, id);

    if (row) return row;
  }

  return null;
}

async function loadInstitution(student) {
  return loadNamedRelation(
    ["institutions"],
    student.institution_id
  );
}

/* =========================================================
   OPTIONAL ACADEMIC RELATIONS
   FIX: missing department_id/course_id/class_id are allowed
   ========================================================= */

async function loadAcademicRelations(student) {
  const departmentId = firstValue(student, [
    "department_id"
  ]);

  const courseId = firstValue(student, [
    "course_id",
    "program_id"
  ]);

  const classId = firstValue(student, [
    "class_id",
    "student_class_id"
  ]);

  const [department, course, studentClass] =
    await Promise.all([
      loadNamedRelation(
        ["departments", "academic_departments"],
        departmentId
      ),

      loadNamedRelation(
        ["courses", "academic_courses", "programs"],
        courseId
      ),

      loadNamedRelation(
        ["classes", "academic_classes", "student_classes"],
        classId
      )
    ]);

  return {
    department,
    course,
    studentClass
  };
}

/* =========================================================
   GRADES, CERTIFICATES, PAYMENTS
   ========================================================= */

async function loadPortalRows(table, student, user) {
  return tryRows(table, [
    { student_id: student.id },
    { student_db_id: student.id },
    { student_uuid: student.id },
    { auth_user_id: user.id },
    { student_id: student.student_id }
  ]);
}

/* =========================================================
   DISPLAY HELPERS
   ========================================================= */

function relationName(row, fallback) {
  const name = row
    ? firstValue(row, [
        "name",
        "title",
        "course_name",
        "course_title",
        "department_name",
        "class_name",
        "program_name",
        "label"
      ])
    : null;

  return name || fallback || null;
}

function valueFor(row, keys, fallback = "—") {
  const value = firstValue(row, keys);

  return value === null ? fallback : value;
}

/* =========================================================
   RENDER STUDENT PROFILE
   ========================================================= */

function renderStudent(student, institution, relations, user) {
  text(
    "welcomeName",
    firstValue(student, ["full_name"]) || "Student"
  );

  text("studentId", student.student_id);

  const courseName =
    relationName(relations.course, null) ||
    firstValue(student, [
      "course_name",
      "program_name",
      "course",
      "program"
    ]);

  const departmentName =
    relationName(relations.department, null) ||
    firstValue(student, ["department_name"]);

  const className =
    relationName(relations.studentClass, null) ||
    firstValue(student, ["class_name"]);

  text("courseName", courseName);

  text(
    "institutionName",
    institution?.name || student.institution_name
  );

  text(
    "accountStatus",
    student.account_enabled === false
      ? "Disabled"
      : student.status || "Active"
  );

  text("fullName", student.full_name);
  text("email", student.email || user.email);
  text("phone", student.phone);
  text("gender", student.gender);

  // Actual database column is commonly dob, not date_of_birth.
  text(
    "dob",
    fmtDate(
      firstValue(student, [
        "dob",
        "date_of_birth",
        "birth_date"
      ])
    )
  );

  text(
    "enrollmentDate",
    fmtDate(
      firstValue(student, [
        "enrollment_date",
        "admission_date"
      ])
    )
  );

  text("departmentName", departmentName);
  text("academicCourse", courseName);
  text("className", className);
  text("academicStatus", student.status);

  const img = $("studentPhoto");

  if (img) {
    if (student.photo_url) {
      img.src = student.photo_url;
      img.alt = `Photo of ${student.full_name || "student"}`;

      img.onerror = () => {
        img.removeAttribute("src");
        img.alt = "No student photo";
      };
    } else {
      img.removeAttribute("src");
      img.alt = "No student photo";
    }
  }
}

/* =========================================================
   GRADES
   ========================================================= */

function renderGrades(rows) {
  const box = $("gradesBox");
  if (!box) return;

  if (!rows.length) {
    box.className = "box empty";
    box.textContent = "No grade records available yet.";
    return;
  }

  box.className = "box records";

  box.innerHTML = rows.map((row, index) => `
    <article class="record-card">
      <div class="record-head">
        <strong>${esc(valueFor(row, [
          "subject_name",
          "subject",
          "subject_title",
          "course_name",
          "title"
        ], `Subject ${index + 1}`))}</strong>

        <span>${esc(valueFor(row, [
          "grade",
          "letter_grade"
        ]))}</span>
      </div>

      <div class="record-grid">
        <div>
          <small>Score</small>
          <b>${esc(valueFor(row, [
            "score",
            "mark",
            "marks",
            "total_score"
          ]))}</b>
        </div>

        <div>
          <small>Exam</small>
          <b>${esc(valueFor(row, [
            "exam_name",
            "exam",
            "assessment",
            "assessment_name"
          ]))}</b>
        </div>

        <div>
          <small>Semester</small>
          <b>${esc(valueFor(row, [
            "semester",
            "term",
            "academic_term"
          ]))}</b>
        </div>

        <div>
          <small>Date</small>
          <b>${esc(fmtDate(firstValue(row, [
            "exam_date",
            "date",
            "created_at"
          ])))}</b>
        </div>
      </div>
    </article>
  `).join("");
}

/* =========================================================
   CERTIFICATES
   ========================================================= */

function renderCertificates(rows) {
  const box = $("certificatesBox");
  if (!box) return;

  if (!rows.length) {
    box.className = "box empty";
    box.textContent = "No certificates available yet.";
    return;
  }

  box.className = "box records";

  box.innerHTML = rows.map((row, index) => `
    <article class="record-card">
      <div class="record-head">
        <strong>${esc(valueFor(row, [
          "certificate_name",
          "title",
          "name",
          "certificate_title"
        ], `Certificate ${index + 1}`))}</strong>

        <span>${esc(valueFor(row, [
          "status",
          "certificate_status"
        ], "Issued"))}</span>
      </div>

      <div class="record-grid">
        <div>
          <small>Certificate No.</small>
          <b>${esc(valueFor(row, [
            "certificate_number",
            "certificate_no",
            "number",
            "serial_number"
          ]))}</b>
        </div>

        <div>
          <small>Issue Date</small>
          <b>${esc(fmtDate(firstValue(row, [
            "issue_date",
            "issued_at",
            "date",
            "created_at"
          ])))}</b>
        </div>

        <div>
          <small>Course</small>
          <b>${esc(valueFor(row, [
            "course_name",
            "course",
            "program_name"
          ]))}</b>
        </div>

        <div>
          <small>Verification</small>
          <b>${esc(valueFor(row, [
            "verification_code",
            "verification_id"
          ]))}</b>
        </div>
      </div>
    </article>
  `).join("");
}

/* =========================================================
   PAYMENTS
   ========================================================= */

function renderPayments(rows) {
  const box = $("paymentsBox");
  if (!box) return;

  if (!rows.length) {
    box.className = "box empty";
    box.textContent = "No payment records available yet.";
    return;
  }

  box.className = "box records";

  box.innerHTML = rows.map((row, index) => `
    <article class="record-card">
      <div class="record-head">
        <strong>${esc(valueFor(row, [
          "description",
          "payment_type",
          "title",
          "invoice_number"
        ], `Payment ${index + 1}`))}</strong>

        <span>${esc(valueFor(row, [
          "status",
          "payment_status"
        ]))}</span>
      </div>

      <div class="record-grid">
        <div>
          <small>Amount</small>
          <b>${esc(valueFor(row, [
            "amount",
            "paid_amount",
            "total_amount",
            "fee"
          ]))}</b>
        </div>

        <div>
          <small>Method</small>
          <b>${esc(valueFor(row, [
            "payment_method",
            "method",
            "paid_via"
          ]))}</b>
        </div>

        <div>
          <small>Receipt / Invoice</small>
          <b>${esc(valueFor(row, [
            "receipt_number",
            "receipt_no",
            "invoice_number",
            "transaction_id"
          ]))}</b>
        </div>

        <div>
          <small>Date</small>
          <b>${esc(fmtDate(firstValue(row, [
            "payment_date",
            "paid_at",
            "date",
            "created_at"
          ])))}</b>
        </div>
      </div>
    </article>
  `).join("");
}

/* =========================================================
   MAIN PORTAL LOADER
   ========================================================= */

async function loadPortal() {
  try {
    clearStatus();

    const user = await currentUser();

    if (!user) {
      window.location.replace("index.html");
      return;
    }

    showStatus(
      "Loading your student portal...",
      "info"
    );

    const student = await loadStudent(user);

    const [institution, relations] = await Promise.all([
      loadInstitution(student),
      loadAcademicRelations(student)
    ]);

    renderStudent(
      student,
      institution,
      relations,
      user
    );

    const [grades, certificates, payments] =
      await Promise.all([
        loadPortalRows("grades", student, user),
        loadPortalRows("certificates", student, user),
        loadPortalRows("payments", student, user)
      ]);

    renderGrades(grades);
    renderCertificates(certificates);
    renderPayments(payments);

    showStatus(
      "Student portal loaded successfully.",
      "success"
    );

    setTimeout(clearStatus, 2500);

  } catch (error) {
    console.error("STUDENT PORTAL ERROR:", error);

    const message = String(
      error?.message || "Unable to load student portal."
    );

    if (
      error?.code === "INVALID_API_KEY" ||
      /invalid api key/i.test(message)
    ) {
      showStatus(
        "Invalid Supabase API key. Check Supabase Settings → API.",
        "error"
      );
    } else {
      showStatus(message, "error");
    }
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

  sessionStorage.clear();
  window.location.replace("index.html");
});

/* =========================================================
   AUTH STATE
   ========================================================= */

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" && !session) {
    window.location.replace("index.html");
  }
});

/* START */
loadPortal();

})();
