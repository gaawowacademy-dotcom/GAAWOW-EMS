/* ============================================================
   GAAWOW EMS
   Certificate Generator V7.6
   DATABASE-SAFE / ENROLLMENT FIX

   Design:
   - Existing certificate.html preserved
   - Existing certificate-template.png preserved
   - A4 Landscape
   - HD Canvas
   - GAAWOW Academy Navy / Gold / White

   Database:
   - Supabase
   - institutions
   - profiles
   - students
   - enrollments
   - courses
   - certificates

   IMPORTANT:
   enrollments schema:
   id
   institution_id
   student_id
   course_id
   class_id
   enrollment_number
   enrollment_date
   start_date
   end_date
   status
   ============================================================ */

"use strict";

/* ============================================================
   1. SUPABASE CONFIG
   ============================================================ */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* ============================================================
   2. GLOBAL STATE
   ============================================================ */

let currentUser = null;
let currentProfile = null;

let institutions = [];
let students = [];
let enrollments = [];
let courses = [];

let selectedInstitutionId = null;
let selectedStudent = null;
let selectedEnrollment = null;
let selectedCourse = null;

let certificateTemplate = null;

const canvas =
  document.getElementById("certificateCanvas");

const ctx =
  canvas ? canvas.getContext("2d") : null;


/* ============================================================
   3. HELPER FUNCTIONS
   ============================================================ */

function $(id) {
  return document.getElementById(id);
}


function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function showMessage(message, type = "info") {
  console.log(`[${type}] ${message}`);

  const existing =
    document.getElementById("certificateMessage");

  if (existing) {
    existing.textContent = message;

    existing.style.display = "block";

    if (type === "error") {
      existing.style.color = "#DC2626";
    } else if (type === "success") {
      existing.style.color = "#16A34A";
    } else {
      existing.style.color = "#0B4DA2";
    }

    return;
  }

  alert(message);
}


function clearMessage() {
  const el =
    document.getElementById("certificateMessage");

  if (el) {
    el.textContent = "";
    el.style.display = "none";
  }
}


function setValue(id, value) {
  const el = $(id);

  if (!el) return;

  el.value =
    value === null ||
    value === undefined
      ? ""
      : value;
}


function getValue(id) {
  const el = $(id);

  if (!el) return "";

  return el.value?.trim() || "";
}


function formatDate(dateValue) {
  if (!dateValue) return "";

  const date =
    new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  );
}


function todayISO() {
  const d = new Date();

  const year =
    d.getFullYear();

  const month =
    String(d.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(d.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function generateCertificateNumber() {
  const year =
    new Date().getFullYear();

  const random =
    Math.floor(
      100000 +
      Math.random() * 900000
    );

  return `GA-CERT-${year}-${random}`;
}


function generateCertificateId() {
  const year =
    new Date().getFullYear();

  const random =
    Math.floor(
      100000 +
      Math.random() * 900000
    );

  return `GA-${year}-${random}`;
}


function generateVerifyCode() {
  const year =
    new Date().getFullYear();

  const random =
    Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();

  return `GAW-${year}-${random}`;
}


/* ============================================================
   4. GET CURRENT SESSION
   ============================================================ */

async function loadCurrentUser() {

  clearMessage();

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();

  if (error) {
    console.error(
      "Session error:",
      error
    );

    showMessage(
      `Session error: ${error.message}`,
      "error"
    );

    return false;
  }

  currentUser =
    data?.session?.user || null;

  if (!currentUser) {

    showMessage(
      "Login session lama helin. Fadlan marka hore login samee.",
      "error"
    );

    return false;
  }

  return true;
}


/* ============================================================
   5. LOAD PROFILE
   ============================================================ */

async function loadCurrentProfile() {

  if (!currentUser) {
    return false;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        institution_id,
        active
      `)
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();

  if (error) {

    console.error(
      "Profile error:",
      error
    );

    showMessage(
      `Profile error: ${error.message}`,
      "error"
    );

    return false;
  }

  currentProfile = data;

  if (!currentProfile) {

    showMessage(
      "Profile-ka user-kan lama helin.",
      "error"
    );

    return false;
  }

  console.log(
    "Current profile:",
    currentProfile
  );

  return true;
}


/* ============================================================
   6. INSTITUTION FIELD
   ============================================================ */

function ensureInstitutionField() {

  let select =
    document.getElementById(
      "institutionSelect"
    );

  if (select) {
    return select;
  }

  const studentSelect =
    document.getElementById(
      "studentSelect"
    );

  if (!studentSelect) {
    console.warn(
      "studentSelect not found."
    );

    return null;
  }

  const parent =
    studentSelect.parentElement;

  if (!parent) {
    return null;
  }

  const wrapper =
    document.createElement("div");

  wrapper.style.marginBottom =
    "12px";

  wrapper.innerHTML = `
    <label
      for="institutionSelect"
      style="
        display:block;
        margin-bottom:6px;
        font-weight:600;
      "
    >
      Institution
    </label>

    <select
      id="institutionSelect"
      style="
        width:100%;
        padding:10px;
        border:1px solid #d1d5db;
        border-radius:8px;
        background:#fff;
      "
    >
      <option value="">
        Select Institution
      </option>
    </select>
  `;

  parent.parentNode.insertBefore(
    wrapper,
    parent
  );

  select =
    document.getElementById(
      "institutionSelect"
    );

  select.addEventListener(
    "change",
    async function () {

      selectedInstitutionId =
        this.value || null;

      selectedStudent = null;
      selectedEnrollment = null;
      selectedCourse = null;

      setValue(
        "studentSelect",
        ""
      );

      clearStudentFields();

      if (
        selectedInstitutionId
      ) {

        await loadStudents(
          selectedInstitutionId
        );

      } else {

        clearStudentSelect();
      }
    }
  );

  return select;
}


/* ============================================================
   7. LOAD INSTITUTIONS
   ============================================================ */

async function loadInstitutions() {

  const select =
    ensureInstitutionField();

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      Loading institutions...
    </option>
  `;

  const {
    data,
    error
  } =
    await supabaseClient
      .from("institutions")
      .select(`
        id,
        name
      `)
      .order(
        "name",
        {
          ascending: true
        }
      );

  if (error) {

    console.error(
      "Institution error:",
      error
    );

    showMessage(
      `Institution error: ${error.message}`,
      "error"
    );

    return;
  }

  institutions =
    data || [];

  select.innerHTML = `
    <option value="">
      Select Institution
    </option>
  `;

  institutions.forEach(
    institution => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        institution.id;

      option.textContent =
        institution.name;

      select.appendChild(
        option
      );
    }
  );

  /* -----------------------------------------
     SUPER ADMIN
     ----------------------------------------- */

  if (
    currentProfile?.role ===
    "super_admin"
  ) {

    select.disabled = false;

    return;
  }

  /* -----------------------------------------
     OTHER USERS
     ----------------------------------------- */

  if (
    currentProfile?.institution_id
  ) {

    selectedInstitutionId =
      currentProfile.institution_id;

    select.value =
      selectedInstitutionId;

    select.disabled = true;

    await loadStudents(
      selectedInstitutionId
    );
  }
}


/* ============================================================
   8. STUDENT SELECT
   ============================================================ */

function clearStudentSelect() {

  const select =
    $("studentSelect");

  if (!select) return;

  select.innerHTML = `
    <option value="">
      Select Student
    </option>
  `;
}


function clearStudentFields() {

  setValue(
    "studentName",
    ""
  );

  setValue(
    "studentId",
    ""
  );

  setValue(
    "courseSelect",
    ""
  );

  setValue(
    "dateStarted",
    ""
  );

  setValue(
    "dateCompleted",
    ""
  );

  setValue(
    "certificateNo",
    ""
  );

  setValue(
    "certificateId",
    ""
  );

  setValue(
    "verifyCode",
    ""
  );
}


/* ============================================================
   9. LOAD STUDENTS
   ============================================================ */

async function loadStudents(
  institutionId
) {

  const select =
    $("studentSelect");

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      Loading students...
    </option>
  `;

  if (!institutionId) {

    clearStudentSelect();

    return;
  }

  const {
    data,
    error
  } =
    await supabaseClient
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
        status
      `)
      .eq(
        "institution_id",
        institutionId
      )
      .order(
        "full_name",
        {
          ascending: true
        }
      );

  if (error) {

    console.error(
      "Students error:",
      error
    );

    select.innerHTML = `
      <option value="">
        Error loading students
      </option>
    `;

    showMessage(
      `Students error: ${error.message}`,
      "error"
    );

    return;
  }

  students =
    data || [];

  clearStudentSelect();

  if (!students.length) {

    select.innerHTML = `
      <option value="">
        No students found
      </option>
    `;

    return;
  }

  students.forEach(
    student => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        student.id;

      option.textContent =
        `${student.student_id || ""} — ${student.full_name || ""}`;

      select.appendChild(
        option
      );
    }
  );

  select.onchange =
    async function () {

      const studentId =
        this.value;

      if (!studentId) {

        selectedStudent = null;
        selectedEnrollment = null;
        selectedCourse = null;

        clearStudentFields();

        return;
      }

      await selectStudent(
        studentId
      );
    };
}


/* ============================================================
   10. SELECT STUDENT
   ============================================================ */

async function selectStudent(
  studentId
) {

  clearMessage();

  selectedStudent =
    students.find(
      student =>
        String(student.id) ===
        String(studentId)
    ) || null;

  if (!selectedStudent) {

    showMessage(
      "Student-ka lama helin.",
      "error"
    );

    return;
  }

  console.log(
    "Selected student:",
    selectedStudent
  );

  setValue(
    "studentName",
    selectedStudent.full_name
  );

  setValue(
    "studentId",
    selectedStudent.student_id
  );

  /* Generate certificate identifiers */

  if (!getValue("certificateNo")) {
    setValue(
      "certificateNo",
      generateCertificateNumber()
    );
  }

  if (!getValue("certificateId")) {
    setValue(
      "certificateId",
      generateCertificateId()
    );
  }

  if (!getValue("verifyCode")) {
    setValue(
      "verifyCode",
      generateVerifyCode()
    );
  }

  await loadStudentEnrollments(
    selectedStudent.id
  );
}


/* ============================================================
   11. LOAD ENROLLMENTS
   ============================================================ */

async function loadStudentEnrollments(
  studentId
) {

  selectedEnrollment = null;
  selectedCourse = null;

  const courseSelect =
    $("courseSelect");

  if (courseSelect) {

    courseSelect.innerHTML = `
      <option value="">
        Loading enrolled courses...
      </option>
    `;
  }

  console.log(
    "Loading enrollments for students.id:",
    studentId
  );

  /*
     IMPORTANT:

     Correct relationship:

     enrollments.student_id
              =
     students.id
  */

  const {
    data,
    error
  } =
    await supabaseClient
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
      .eq(
        "student_id",
        studentId
      )
      .order(
        "enrollment_date",
        {
          ascending: false
        }
      );

  if (error) {

    console.error(
      "ENROLLMENT SUPABASE ERROR:",
      error
    );

    if (courseSelect) {

      courseSelect.innerHTML = `
        <option value="">
          Enrollment error
        </option>
      `;
    }

    showMessage(
      `Enrollment error: ${error.message}`,
      "error"
    );

    return;
  }

  enrollments =
    data || [];

  console.log(
    "Student enrollments:",
    enrollments
  );

  if (!enrollments.length) {

    if (courseSelect) {

      courseSelect.innerHTML = `
        <option value="">
          No enrollment found
        </option>
      `;
    }

    showMessage(
      "Student-kan enrollment looma helin.",
      "error"
    );

    return;
  }

  await loadCoursesForEnrollments(
    enrollments
  );
}


/* ============================================================
   12. LOAD COURSES
   ============================================================ */

async function loadCoursesForEnrollments(
  enrollmentRows
) {

  const courseIds =
    [
      ...new Set(
        enrollmentRows
          .map(
            row =>
              row.course_id
          )
          .filter(Boolean)
      )
    ];

  if (!courseIds.length) {

    showMessage(
      "Enrollment-ka wuxuu leeyahay course_id la'aan.",
      "error"
    );

    return;
  }

  console.log(
    "Course IDs:",
    courseIds
  );

  const {
    data,
    error
  } =
    await supabaseClient
      .from("courses")
      .select(`
        id,
        institution_id,
        name,
        code,
        description,
        is_active
      `)
      .in(
        "id",
        courseIds
      );

  if (error) {

    console.error(
      "Course error:",
      error
    );

    showMessage(
      `Course error: ${error.message}`,
      "error"
    );

    return;
  }

  courses =
    data || [];

  console.log(
    "Courses:",
    courses
  );

  populateCourseSelect(
    enrollmentRows,
    courses
  );
}


/* ============================================================
   13. COURSE SELECT
   ============================================================ */

function populateCourseSelect(
  enrollmentRows,
  courseRows
) {

  const select =
    $("courseSelect");

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      Select Course
    </option>
  `;

  enrollmentRows.forEach(
    enrollment => {

      const course =
        courseRows.find(
          item =>
            String(item.id) ===
            String(
              enrollment.course_id
            )
        );

      if (!course) {
        return;
      }

      const option =
        document.createElement(
          "option"
        );

      option.value =
        enrollment.id;

      option.dataset.courseId =
        course.id;

      option.textContent =
        `${course.name || "Course"}${course.code ? ` (${course.code})` : ""}`;

      select.appendChild(
        option
      );
    }
  );

  select.onchange =
    function () {

      const enrollmentId =
        this.value;

      if (!enrollmentId) {
        return;
      }

      const enrollment =
        enrollmentRows.find(
          row =>
            String(row.id) ===
            String(enrollmentId)
        );

      if (!enrollment) {
        return;
      }

      const course =
        courseRows.find(
          row =>
            String(row.id) ===
            String(
              enrollment.course_id
            )
        );

      selectedEnrollment =
        enrollment;

      selectedCourse =
        course || null;

      applyEnrollmentToForm();

      console.log(
        "Selected enrollment:",
        selectedEnrollment
      );

      console.log(
        "Selected course:",
        selectedCourse
      );
    };

  /*
     Automatically select first active enrollment.
  */

  const activeEnrollment =
    enrollmentRows.find(
      row =>
        String(row.status || "")
          .toLowerCase() ===
        "active"
    ) ||
    enrollmentRows[0];

  if (activeEnrollment) {

    select.value =
      activeEnrollment.id;

    select.dispatchEvent(
      new Event("change")
    );
  }
}


/* ============================================================
   14. APPLY ENROLLMENT
   ============================================================ */

function applyEnrollmentToForm() {

  if (!selectedEnrollment) {
    return;
  }

  if (selectedCourse) {

    /*
       Some HTML versions may have
       courseName instead of courseSelect.
    */

    if ($("courseName")) {

      setValue(
        "courseName",
        selectedCourse.name
      );
    }
  }

  setValue(
    "dateStarted",
    selectedEnrollment.start_date ||
    selectedEnrollment.enrollment_date ||
    ""
  );

  /*
     Correct schema uses end_date.
  */

  setValue(
    "dateCompleted",
    selectedEnrollment.end_date ||
    ""
  );

  /*
     Keep certificate number/id/verify code.
  */

  if (!getValue("certificateNo")) {

    setValue(
      "certificateNo",
      generateCertificateNumber()
    );
  }

  if (!getValue("certificateId")) {

    setValue(
      "certificateId",
      generateCertificateId()
    );
  }

  if (!getValue("verifyCode")) {

    setValue(
      "verifyCode",
      generateVerifyCode()
    );
  }

  showMessage(
    "Student iyo Enrollment si guul leh ayaa loo helay.",
    "success"
  );
}


/* ============================================================
   15. TEMPLATE PATH
   ============================================================ */

function getTemplatePath() {

  /*
     certificate-template.png
     wuxuu ku jiraa isla folder-ka
     GAAWOW EMS.
  */

  return "./certificate-template.png";
}


/* ============================================================
   16. LOAD TEMPLATE
   ============================================================ */

function loadCertificateTemplate() {

  return new Promise(
    (resolve, reject) => {

      const img =
        new Image();

      img.onload =
        function () {

          certificateTemplate =
            img;

          resolve(img);
        };

      img.onerror =
        function () {

          console.error(
            "Certificate template failed:",
            getTemplatePath()
          );

          reject(
            new Error(
              "certificate-template.png lama heli karo."
            )
          );
        };

      img.src =
        getTemplatePath();
    }
  );
}


/* ============================================================
   17. DRAW TEMPLATE
   ============================================================ */

async function drawCertificate() {

  if (!canvas || !ctx) {

    showMessage(
      "Certificate canvas lama helin.",
      "error"
    );

    return;
  }

  if (!certificateTemplate) {

    try {

      await loadCertificateTemplate();

    } catch (error) {

      showMessage(
        error.message,
        "error"
      );

      return;
    }
  }

  /*
     Preserve existing template proportions.
  */

  canvas.width =
    1536;

  canvas.height =
    1024;

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.drawImage(
    certificateTemplate,
    0,
    0,
    canvas.width,
    canvas.height
  );

  drawCertificateText();
}


/* ============================================================
   18. DRAW TEXT
   ============================================================ */

function drawCertificateText() {

  if (!ctx) {
    return;
  }

  const studentName =
    getValue("studentName");

  const studentId =
    getValue("studentId");

  let courseName = "";

  if (
    selectedCourse &&
    selectedCourse.name
  ) {

    courseName =
      selectedCourse.name;

  } else if ($("courseName")) {

    courseName =
      getValue("courseName");
  }

  const dateStarted =
    getValue("dateStarted");

  const dateCompleted =
    getValue("dateCompleted");

  /*
     These positions intentionally remain
     separate from the template background.
     If your existing V7.5 had custom positions,
     they can be retained here.
  */

  ctx.textAlign =
    "center";

  ctx.textBaseline =
    "middle";

  /*
     Student name
  */

  if (studentName) {

    ctx.fillStyle =
      "#0B1E63";

    ctx.font =
      "bold 54px Georgia";

    ctx.fillText(
      studentName,
      canvas.width / 2,
      470
    );
  }

  /*
     Course
  */

  if (courseName) {

    ctx.fillStyle =
      "#D4AF37";

    ctx.font =
      "bold 34px Arial";

    ctx.fillText(
      courseName,
      canvas.width / 2,
      560
    );
  }

  /*
     Student ID
  */

  if (studentId) {

    ctx.fillStyle =
      "#1F2937";

    ctx.font =
      "22px Arial";

    ctx.fillText(
      `Student ID: ${studentId}`,
      canvas.width / 2,
      610
    );
  }

  /*
     Dates
  */

  if (
    dateStarted ||
    dateCompleted
  ) {

    ctx.fillStyle =
      "#1F2937";

    ctx.font =
      "20px Arial";

    const dateText =
      [
        dateStarted
          ? `Start: ${formatDate(dateStarted)}`
          : "",
        dateCompleted
          ? `Completion: ${formatDate(dateCompleted)}`
          : ""
      ]
        .filter(Boolean)
        .join("   |   ");

    ctx.fillText(
      dateText,
      canvas.width / 2,
      650
    );
  }
}


/* ============================================================
   19. PREVIEW
   ============================================================ */

async function previewCertificate() {

  if (!selectedStudent) {

    showMessage(
      "Fadlan dooro student.",
      "error"
    );

    return;
  }

  if (!selectedEnrollment) {

    showMessage(
      "Fadlan dooro enrollment/course.",
      "error"
    );

    return;
  }

  await drawCertificate();
}


/* ============================================================
   20. GENERATE
   ============================================================ */

async function generateCertificate() {

  if (!selectedStudent) {

    showMessage(
      "Fadlan marka hore dooro student.",
      "error"
    );

    return;
  }

  if (!selectedEnrollment) {

    showMessage(
      "Student-kan enrollment lama helin.",
      "error"
    );

    return;
  }

  if (!selectedCourse) {

    showMessage(
      "Course-ka enrollment-ka lama helin.",
      "error"
    );

    return;
  }

  if (!getValue("certificateNo")) {

    setValue(
      "certificateNo",
      generateCertificateNumber()
    );
  }

  if (!getValue("certificateId")) {

    setValue(
      "certificateId",
      generateCertificateId()
    );
  }

  if (!getValue("verifyCode")) {

    setValue(
      "verifyCode",
      generateVerifyCode()
    );
  }

  if (!getValue("issueDate")) {

    setValue(
      "issueDate",
      todayISO()
    );
  }

  await drawCertificate();

  showMessage(
    "Certificate-ka waa la generate gareeyey.",
    "success"
  );
}


/* ============================================================
   21. SAVE CERTIFICATE
   ============================================================ */

async function saveCertificate() {

  if (!selectedStudent) {

    showMessage(
      "Student lama dooran.",
      "error"
    );

    return;
  }

  if (!selectedEnrollment) {

    showMessage(
      "Enrollment lama dooran.",
      "error"
    );

    return;
  }

  if (!selectedCourse) {

    showMessage(
      "Course lama helin.",
      "error"
    );

    return;
  }

  const certificateNo =
    getValue("certificateNo") ||
    generateCertificateNumber();

  const certificateId =
    getValue("certificateId") ||
    generateCertificateId();

  const verifyCode =
    getValue("verifyCode") ||
    generateVerifyCode();

  const issueDate =
    getValue("issueDate") ||
    todayISO();

  setValue(
    "certificateNo",
    certificateNo
  );

  setValue(
    "certificateId",
    certificateId
  );

  setValue(
    "verifyCode",
    verifyCode
  );

  setValue(
    "issueDate",
    issueDate
  );

  /*
     Build certificate record.

     Only columns known from the current
     certificate schema are used.
  */

  const payload = {

    institution_id:
      selectedEnrollment.institution_id ||
      selectedStudent.institution_id,

    student_id:
      selectedStudent.id,

    course_id:
      selectedCourse.id,

    certificate_no:
      certificateNo,

    certificate_id:
      certificateId,

    verify_code:
      verifyCode,

    student_name:
      selectedStudent.full_name,

    course_name:
      selectedCourse.name,

    issue_date:
      issueDate,

    expiry_date:
      null,

    status:
      "valid"
  };

  console.log(
    "Certificate payload:",
    payload
  );

  const {
    data,
    error
  } =
    await supabaseClient
      .from("certificates")
      .insert(
        payload
      )
      .select()
      .single();

  if (error) {

    console.error(
      "Certificate save error:",
      error
    );

    showMessage(
      `Certificate save error: ${error.message}`,
      "error"
    );

    return;
  }

  console.log(
    "Saved certificate:",
    data
  );

  showMessage(
    "Certificate-ka si guul leh ayaa loo kaydiyey.",
    "success"
  );

  return data;
}


/* ============================================================
   22. HD DOWNLOAD
   ============================================================ */

function downloadHD() {

  if (!canvas) {

    showMessage(
      "Canvas lama helin.",
      "error"
    );

    return;
  }

  const link =
    document.createElement("a");

  const studentName =
    getValue("studentName")
      .replace(
        /[^a-z0-9]+/gi,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  const certificateNo =
    getValue("certificateNo") ||
    "certificate";

  link.download =
    `${certificateNo}-${studentName || "GAAWOW"}.png`;

  link.href =
    canvas.toDataURL(
      "image/png",
      1.0
    );

  link.click();
}


/* ============================================================
   23. PRINT
   ============================================================ */

function printCertificate() {

  if (!canvas) {
    return;
  }

  const image =
    canvas.toDataURL(
      "image/png",
      1.0
    );

  const printWindow =
    window.open(
      "",
      "_blank"
    );

  if (!printWindow) {

    showMessage(
      "Browser-ku wuxuu xannibay print window.",
      "error"
    );

    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>

    <html>
      <head>

        <title>
          GAAWOW Certificate
        </title>

        <style>

          @page {
            size: A4 landscape;
            margin: 0;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: white;
          }

          img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

        </style>

      </head>

      <body>

        <img
          src="${image}"
          alt="GAAWOW Certificate"
        />

        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>

      </body>
    </html>
  `);

  printWindow.document.close();
}


/* ============================================================
   24. NEW CERTIFICATE
   ============================================================ */

function newCertificate() {

  selectedStudent = null;
  selectedEnrollment = null;
  selectedCourse = null;

  const studentSelect =
    $("studentSelect");

  if (studentSelect) {
    studentSelect.value = "";
  }

  clearStudentFields();

  setValue(
    "issueDate",
    todayISO()
  );

  setValue(
    "certificateNo",
    generateCertificateNumber()
  );

  setValue(
    "certificateId",
    generateCertificateId()
  );

  setValue(
    "verifyCode",
    generateVerifyCode()
  );

  if (ctx && canvas) {

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    if (certificateTemplate) {

      ctx.drawImage(
        certificateTemplate,
        0,
        0,
        canvas.width,
        canvas.height
      );
    }
  }

  clearMessage();
}


/* ============================================================
   25. BUTTON EVENT BINDINGS
   ============================================================ */

function bindButtons() {

  /*
     Multiple possible IDs are supported
     so existing certificate.html design
     does not need to be changed.
  */

  const generateBtn =
    $("generateBtn") ||
    $("generateCertificateBtn");

  const previewBtn =
    $("previewBtn") ||
    $("previewCertificateBtn");

  const saveBtn =
    $("saveBtn") ||
    $("saveCertificateBtn");

  const downloadBtn =
    $("downloadBtn") ||
    $("hdDownloadBtn") ||
    $("downloadHD");

  const printBtn =
    $("printBtn") ||
    $("printCertificateBtn");

  const newBtn =
    $("newBtn") ||
    $("newCertificateBtn");


  if (generateBtn) {

    generateBtn.onclick =
      generateCertificate;
  }


  if (previewBtn) {

    previewBtn.onclick =
      previewCertificate;
  }


  if (saveBtn) {

    saveBtn.onclick =
      saveCertificate;
  }


  if (downloadBtn) {

    downloadBtn.onclick =
      downloadHD;
  }


  if (printBtn) {

    printBtn.onclick =
      printCertificate;
  }


  if (newBtn) {

    newBtn.onclick =
      newCertificate;
  }
}


/* ============================================================
   26. COURSE SELECT FALLBACK
   ============================================================ */

function ensureCourseSelectListener() {

  const select =
    $("courseSelect");

  if (!select) {
    return;
  }

  /*
     Listener is already assigned inside
     populateCourseSelect().
  */
}


/* ============================================================
   27. INITIALIZE
   ============================================================ */

async function initializeCertificateGenerator() {

  console.log(
    "GAAWOW EMS Certificate Generator V7.6 starting..."
  );

  try {

    const sessionOK =
      await loadCurrentUser();

    if (!sessionOK) {
      return;
    }

    const profileOK =
      await loadCurrentProfile();

    if (!profileOK) {
      return;
    }

    ensureInstitutionField();

    bindButtons();

    await loadInstitutions();

    /*
       Initial date
    */

    if ($("issueDate")) {

      if (!getValue("issueDate")) {

        setValue(
          "issueDate",
          todayISO()
        );
      }
    }

    /*
       Initial certificate identifiers
    */

    if ($("certificateNo")) {

      if (!getValue("certificateNo")) {

        setValue(
          "certificateNo",
          generateCertificateNumber()
        );
      }
    }

    if ($("certificateId")) {

      if (!getValue("certificateId")) {

        setValue(
          "certificateId",
          generateCertificateId()
        );
      }
    }

    if ($("verifyCode")) {

      if (!getValue("verifyCode")) {

        setValue(
          "verifyCode",
          generateVerifyCode()
        );
      }
    }

    /*
       Load background template.
    */

    try {

      await loadCertificateTemplate();

      if (canvas && ctx) {

        canvas.width =
          1536;

        canvas.height =
          1024;

        ctx.drawImage(
          certificateTemplate,
          0,
          0,
          canvas.width,
          canvas.height
        );
      }

    } catch (templateError) {

      console.error(
        templateError
      );

      showMessage(
        "certificate-template.png lama helin. Hubi inuu ku jiro isla folder-ka certificate.html.",
        "error"
      );
    }

    console.log(
      "GAAWOW Certificate Generator V7.6 READY"
    );

  } catch (error) {

    console.error(
      "Certificate generator initialization error:",
      error
    );

    showMessage(
      `Initialization error: ${error.message}`,
      "error"
    );
  }
}


/* ============================================================
   28. GLOBAL EXPORTS
   ============================================================ */

window.generateCertificate =
  generateCertificate;

window.previewCertificate =
  previewCertificate;

window.saveCertificate =
  saveCertificate;

window.downloadHD =
  downloadHD;

window.printCertificate =
  printCertificate;

window.newCertificate =
  newCertificate;

window.loadStudents =
  loadStudents;

window.loadStudentEnrollments =
  loadStudentEnrollments;


/* ============================================================
   29. START
   ============================================================ */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeCertificateGenerator
  );

} else {

  initializeCertificateGenerator();
}
