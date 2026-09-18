/* ============================================================
   GAAWOW EMS
   CERTIFICATE GENERATOR V7.7 FINAL
   ============================================================

   DATABASE VERIFIED:

   auth.users
        ↓
   profiles
        ↓
   institutions
        ↓
   students
        ↓
   enrollments
        ↓
   courses
        ↓
   certificates

   VERIFIED PROFILES:
   - id = auth.users.id
   - role
   - institution_id
   - is_active

   VERIFIED ENROLLMENTS:
   - id
   - institution_id
   - student_id
   - course_id
   - class_id
   - enrollment_number
   - enrollment_date
   - start_date
   - end_date
   - status

   VERIFIED COURSES:
   - id
   - institution_id
   - name
   - code
   - description
   - is_active

   DESIGN:
   - Existing certificate.html preserved
   - Existing certificate-template.png preserved
   - HD canvas
   - A4 landscape
   ============================================================ */

"use strict";


/* ============================================================
   1. SUPABASE CONFIGURATION
   ============================================================ */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

/*
   IMPORTANT:
   Replace only the value below with your Supabase
   anon/public key if your existing certificate.js
   does not already contain it.

   NEVER use service_role key in GitHub Pages.
*/

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

let certificateSaved = false;


/* ============================================================
   3. DOM HELPERS
   ============================================================ */

function $(id) {
  return document.getElementById(id);
}


function firstElement(...ids) {

  for (const id of ids) {

    const element = $(id);

    if (element) {
      return element;
    }
  }

  return null;
}


function getValue(...ids) {

  const element =
    firstElement(...ids);

  if (!element) {
    return "";
  }

  return (
    element.value ||
    ""
  ).trim();
}


function setValue(
  value,
  ...ids
) {

  const element =
    firstElement(...ids);

  if (!element) {
    return;
  }

  element.value =
    value === null ||
    value === undefined
      ? ""
      : value;
}


/* ============================================================
   4. MESSAGE SYSTEM
   ============================================================ */

function showMessage(
  message,
  type = "info"
) {

  console.log(
    `[GAAWOW Certificate ${type}]`,
    message
  );

  const messageBox =
    $("certificateMessage");

  if (messageBox) {

    messageBox.textContent =
      message;

    messageBox.style.display =
      "block";

    if (type === "error") {

      messageBox.style.color =
        "#DC2626";

    } else if (type === "success") {

      messageBox.style.color =
        "#16A34A";

    } else {

      messageBox.style.color =
        "#0B4DA2";
    }

    return;
  }

  /*
     Do not use alert for normal success messages.
     Use it only for errors when no message element exists.
  */

  if (type === "error") {
    alert(message);
  }
}


function clearMessage() {

  const messageBox =
    $("certificateMessage");

  if (!messageBox) {
    return;
  }

  messageBox.textContent =
    "";

  messageBox.style.display =
    "none";
}


/* ============================================================
   5. DATE HELPERS
   ============================================================ */

function todayISO() {

  const date =
    new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return (
    `${year}-${month}-${day}`
  );
}


function formatDate(
  value
) {

  if (!value) {
    return "";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
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


/* ============================================================
   6. CERTIFICATE NUMBER GENERATORS
   ============================================================ */

function generateCertificateNumber() {

  const year =
    new Date().getFullYear();

  const random =
    Math.floor(
      100000 +
      Math.random() * 900000
    );

  return (
    `GA-CERT-${year}-${random}`
  );
}


function generateCertificateId() {

  const year =
    new Date().getFullYear();

  const random =
    Math.floor(
      100000 +
      Math.random() * 900000
    );

  return (
    `GA-${year}-${random}`
  );
}


function generateVerifyCode() {

  const year =
    new Date().getFullYear();

  const random =
    Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();

  return (
    `GAW-${year}-${random}`
  );
}


/* ============================================================
   7. GET SESSION
   ============================================================ */

async function loadCurrentUser() {

  clearMessage();

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {

      console.error(
        "AUTH SESSION ERROR:",
        error
      );

      showMessage(
        `Login session error: ${error.message}`,
        "error"
      );

      return false;
    }

    currentUser =
      data?.session?.user ||
      null;

    if (!currentUser) {

      showMessage(
        "Login session lama helin. Fadlan marka hore login samee.",
        "error"
      );

      return false;
    }

    console.log(
      "Authenticated user:",
      currentUser.id,
      currentUser.email
    );

    return true;

  } catch (error) {

    console.error(
      "SESSION EXCEPTION:",
      error
    );

    showMessage(
      `Session error: ${error.message}`,
      "error"
    );

    return false;
  }
}


/* ============================================================
   8. LOAD PROFILE
   ============================================================ */

async function loadCurrentProfile() {

  if (!currentUser) {

    showMessage(
      "Authenticated user lama helin.",
      "error"
    );

    return false;
  }

  console.log(
    "Loading profile for:",
    currentUser.id
  );

  try {

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
          is_active
        `)
        .eq(
          "id",
          currentUser.id
        )
        .maybeSingle();

    if (error) {

      console.error(
        "PROFILE SUPABASE ERROR:",
        error
      );

      showMessage(
        `Profile error: ${error.message}`,
        "error"
      );

      return false;
    }

    if (!data) {

      console.error(
        "PROFILE NOT FOUND:",
        currentUser.id
      );

      showMessage(
        "Profile-ka user-kan lama helin.",
        "error"
      );

      return false;
    }

    currentProfile =
      data;

    console.log(
      "Current profile:",
      currentProfile
    );

    if (
      currentProfile.is_active === false
    ) {

      showMessage(
        "Account-kan waa inactive.",
        "error"
      );

      return false;
    }

    return true;

  } catch (error) {

    console.error(
      "PROFILE EXCEPTION:",
      error
    );

    showMessage(
      `Profile error: ${error.message}`,
      "error"
    );

    return false;
  }
}


/* ============================================================
   9. INSTITUTION SELECTOR
   ============================================================ */

function ensureInstitutionField() {

  let select =
    firstElement(
      "institutionSelect",
      "institution_select"
    );

  if (select) {
    return select;
  }

  const studentSelect =
    firstElement(
      "studentSelect",
      "student_select"
    );

  if (!studentSelect) {

    console.warn(
      "Student select not found."
    );

    return null;
  }

  const studentParent =
    studentSelect.parentElement;

  if (!studentParent) {
    return null;
  }

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.id =
    "certificateInstitutionWrapper";

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

  studentParent.parentNode.insertBefore(
    wrapper,
    studentParent
  );

  select =
    $("institutionSelect");

  select.addEventListener(
    "change",
    async function () {

      selectedInstitutionId =
        this.value ||
        null;

      selectedStudent =
        null;

      selectedEnrollment =
        null;

      selectedCourse =
        null;

      certificateSaved =
        false;

      clearStudentFields();

      clearCourseSelect();

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
   10. LOAD INSTITUTIONS
   ============================================================ */

async function loadInstitutions() {

  const select =
    ensureInstitutionField();

  if (!select) {
    return false;
  }

  select.innerHTML = `
    <option value="">
      Loading institutions...
    </option>
  `;

  try {

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
        "INSTITUTION ERROR:",
        error
      );

      showMessage(
        `Institution error: ${error.message}`,
        "error"
      );

      return false;
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


    /* --------------------------------------------------------
       SUPER ADMIN
       -------------------------------------------------------- */

    if (
      currentProfile?.role ===
      "super_admin"
    ) {

      select.disabled =
        false;

      return true;
    }


    /* --------------------------------------------------------
       INSTITUTION USER
       -------------------------------------------------------- */

    if (
      currentProfile?.institution_id
    ) {

      selectedInstitutionId =
        currentProfile.institution_id;

      select.value =
        selectedInstitutionId;

      select.disabled =
        true;

      await loadStudents(
        selectedInstitutionId
      );
    }

    return true;

  } catch (error) {

    console.error(
      "INSTITUTION EXCEPTION:",
      error
    );

    showMessage(
      `Institution error: ${error.message}`,
      "error"
    );

    return false;
  }
}


/* ============================================================
   11. STUDENT SELECTOR
   ============================================================ */

function clearStudentSelect() {

  const select =
    firstElement(
      "studentSelect",
      "student_select"
    );

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      Select Student
    </option>
  `;
}


function clearCourseSelect() {

  const select =
    firstElement(
      "courseSelect",
      "course_select"
    );

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      Select Course
    </option>
  `;
}


function clearStudentFields() {

  setValue(
    "",
    "studentName",
    "student_name",
    "fullName",
    "full_name"
  );

  setValue(
    "",
    "studentId",
    "student_id"
  );

  setValue(
    "",
    "courseName",
    "course_name"
  );

  setValue(
    "",
    "dateStarted",
    "date_started",
    "startDate",
    "start_date"
  );

  setValue(
    "",
    "dateCompleted",
    "date_completed",
    "completionDate",
    "completion_date"
  );

  setValue(
    "",
    "certificateNo",
    "certificate_no"
  );

  setValue(
    "",
    "certificateId",
    "certificate_id"
  );

  setValue(
    "",
    "verifyCode",
    "verify_code"
  );
}


/* ============================================================
   12. LOAD STUDENTS
   ============================================================ */

async function loadStudents(
  institutionId
) {

  const select =
    firstElement(
      "studentSelect",
      "student_select"
    );

  if (!select) {

    console.warn(
      "studentSelect not found."
    );

    return false;
  }

  select.innerHTML = `
    <option value="">
      Loading students...
    </option>
  `;

  if (!institutionId) {

    clearStudentSelect();

    return false;
  }

  console.log(
    "Loading students for institution:",
    institutionId
  );

  try {

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
        "STUDENT ERROR:",
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

      return false;
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

      showMessage(
        "Institution-kan students kama helin.",
        "info"
      );

      return true;
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
          [
            student.student_id,
            student.full_name
          ]
            .filter(Boolean)
            .join(" — ");

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

          selectedStudent =
            null;

          selectedEnrollment =
            null;

          selectedCourse =
            null;

          clearStudentFields();
          clearCourseSelect();

          return;
        }

        await selectStudent(
          studentId
        );
      };

    return true;

  } catch (error) {

    console.error(
      "STUDENT EXCEPTION:",
      error
    );

    showMessage(
      `Students error: ${error.message}`,
      "error"
    );

    return false;
  }
}


/* ============================================================
   13. SELECT STUDENT
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

    return false;
  }

  console.log(
    "SELECTED STUDENT:",
    selectedStudent
  );

  certificateSaved =
    false;

  setValue(
    selectedStudent.full_name,
    "studentName",
    "student_name",
    "fullName",
    "full_name"
  );

  setValue(
    selectedStudent.student_id,
    "studentId",
    "student_id"
  );

  /*
     Generate identifiers only if empty.
  */

  if (
    !getValue(
      "certificateNo",
      "certificate_no"
    )
  ) {

    setValue(
      generateCertificateNumber(),
      "certificateNo",
      "certificate_no"
    );
  }

  if (
    !getValue(
      "certificateId",
      "certificate_id"
    )
  ) {

    setValue(
      generateCertificateId(),
      "certificateId",
      "certificate_id"
    );
  }

  if (
    !getValue(
      "verifyCode",
      "verify_code"
    )
  ) {

    setValue(
      generateVerifyCode(),
      "verifyCode",
      "verify_code"
    );
  }

  return await loadStudentEnrollments(
    selectedStudent.id
  );
}


/* ============================================================
   14. LOAD ENROLLMENTS
   ============================================================ */

async function loadStudentEnrollments(
  studentId
) {

  selectedEnrollment =
    null;

  selectedCourse =
    null;

  clearCourseSelect();

  const courseSelect =
    firstElement(
      "courseSelect",
      "course_select"
    );

  if (courseSelect) {

    courseSelect.innerHTML = `
      <option value="">
        Loading enrolled courses...
      </option>
    `;
  }

  console.log(
    "================================================"
  );

  console.log(
    "LOADING ENROLLMENTS"
  );

  console.log(
    "students.id:",
    studentId
  );

  console.log(
    "================================================"
  );

  try {

    /*
       VERIFIED DATABASE RELATIONSHIP:

       students.id
            =
       enrollments.student_id
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
        "================================================"
      );

      console.error(
        "ENROLLMENT SUPABASE ERROR:"
      );

      console.error(
        error
      );

      console.error(
        "================================================"
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

      return false;
    }

    enrollments =
      data || [];

    console.log(
      "ENROLLMENTS FOUND:",
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

      return false;
    }

    return await loadCoursesForEnrollments(
      enrollments
    );

  } catch (error) {

    console.error(
      "ENROLLMENT EXCEPTION:",
      error
    );

    showMessage(
      `Enrollment error: ${error.message}`,
      "error"
    );

    return false;
  }
}


/* ============================================================
   15. LOAD COURSES
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

  console.log(
    "COURSE IDS:",
    courseIds
  );

  if (!courseIds.length) {

    showMessage(
      "Enrollment-ka course_id ma laha.",
      "error"
    );

    return false;
  }

  try {

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
        "COURSE SUPABASE ERROR:",
        error
      );

      showMessage(
        `Course error: ${error.message}`,
        "error"
      );

      return false;
    }

    courses =
      data || [];

    console.log(
      "COURSES FOUND:",
      courses
    );

    if (!courses.length) {

      showMessage(
        "Course-ka enrollment-ka ku jira lama helin.",
        "error"
      );

      return false;
    }

    return populateCourseSelect(
      enrollmentRows,
      courses
    );

  } catch (error) {

    console.error(
      "COURSE EXCEPTION:",
      error
    );

    showMessage(
      `Course error: ${error.message}`,
      "error"
    );

    return false;
  }
}


/* ============================================================
   16. POPULATE COURSE SELECT
   ============================================================ */

function populateCourseSelect(
  enrollmentRows,
  courseRows
) {

  const select =
    firstElement(
      "courseSelect",
      "course_select"
    );

  if (!select) {

    /*
       If the HTML has no course selector,
       automatically use the first enrollment.
    */

    const firstEnrollment =
      enrollmentRows.find(
        row =>
          String(
            row.status || ""
          ).toLowerCase() ===
          "active"
      ) ||
      enrollmentRows[0];

    if (firstEnrollment) {

      applyEnrollment(
        firstEnrollment,
        courseRows
      );
    }

    return true;
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
        course.code
          ? `${course.name} (${course.code})`
          : course.name;

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

        selectedEnrollment =
          null;

        selectedCourse =
          null;

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

      applyEnrollment(
        enrollment,
        courseRows
      );
    };


  /*
     Automatically select active enrollment.
  */

  const activeEnrollment =
    enrollmentRows.find(
      row =>
        String(
          row.status || ""
        ).toLowerCase() ===
        "active"
    ) ||
    enrollmentRows[0];


  if (activeEnrollment) {

    select.value =
      activeEnrollment.id;

    applyEnrollment(
      activeEnrollment,
      courseRows
    );
  }

  return true;
}


/* ============================================================
   17. APPLY ENROLLMENT
   ============================================================ */

function applyEnrollment(
  enrollment,
  courseRows
) {

  const course =
    courseRows.find(
      item =>
        String(item.id) ===
        String(
          enrollment.course_id
        )
    ) || null;

  selectedEnrollment =
    enrollment;

  selectedCourse =
    course;

  console.log(
    "SELECTED ENROLLMENT:",
    selectedEnrollment
  );

  console.log(
    "SELECTED COURSE:",
    selectedCourse
  );


  if (selectedCourse) {

    setValue(
      selectedCourse.name,
      "courseName",
      "course_name"
    );
  }


  /*
     VERIFIED ENROLLMENT DATE COLUMNS:

     start_date
     end_date

     No completed_date.
     No completion_date.
  */

  setValue(
    enrollment.start_date ||
    enrollment.enrollment_date ||
    "",
    "dateStarted",
    "date_started",
    "startDate",
    "start_date"
  );


  setValue(
    enrollment.end_date ||
    "",
    "dateCompleted",
    "date_completed",
    "completionDate",
    "completion_date"
  );


  /*
     Certificate identifiers.
  */

  if (
    !getValue(
      "certificateNo",
      "certificate_no"
    )
  ) {

    setValue(
      generateCertificateNumber(),
      "certificateNo",
      "certificate_no"
    );
  }


  if (
    !getValue(
      "certificateId",
      "certificate_id"
    )
  ) {

    setValue(
      generateCertificateId(),
      "certificateId",
      "certificate_id"
    );
  }


  if (
    !getValue(
      "verifyCode",
      "verify_code"
    )
  ) {

    setValue(
      generateVerifyCode(),
      "verifyCode",
      "verify_code"
    );
  }


  showMessage(
    `Enrollment loaded: ${selectedCourse?.name || "Course"}`,
    "success"
  );

  return true;
}


/* ============================================================
   18. CERTIFICATE TEMPLATE
   ============================================================ */

function getTemplatePath() {

  /*
     IMPORTANT:

     certificate-template.png
     must be in the SAME folder as
     certificate.html.
  */

  return "./certificate-template.png";
}


function loadCertificateTemplate() {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const image =
        new Image();

      image.onload =
        function () {

          certificateTemplate =
            image;

          console.log(
            "Certificate template loaded successfully."
          );

          resolve(image);
        };


      image.onerror =
        function () {

          console.error(
            "Certificate template failed:",
            getTemplatePath()
          );

          reject(
            new Error(
              "certificate-template.png lama heli karo. Hubi inuu ku jiro isla folder-ka certificate.html."
            )
          );
        };


      image.src =
        getTemplatePath();
    }
  );
}


/* ============================================================
   19. CANVAS
   ============================================================ */

function getCanvas() {

  return firstElement(
    "certificateCanvas"
  );
}


function getCanvasContext() {

  const canvas =
    getCanvas();

  if (!canvas) {
    return null;
  }

  return canvas.getContext(
    "2d"
  );
}


/* ============================================================
   20. DRAW TEMPLATE
   ============================================================ */

async function drawCertificate() {

  const canvas =
    getCanvas();

  const ctx =
    getCanvasContext();

  if (!canvas || !ctx) {

    showMessage(
      "certificateCanvas lama helin.",
      "error"
    );

    return false;
  }


  if (!certificateTemplate) {

    try {

      await loadCertificateTemplate();

    } catch (error) {

      showMessage(
        error.message,
        "error"
      );

      return false;
    }
  }


  /*
     HD certificate canvas.

     A4 landscape ratio:
     297 / 210 = 1.414

     1536 / 1024 = 1.5

     We preserve the existing V7 canvas
     dimensions to avoid changing the
     existing design.
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


  /*
     Draw original template.
  */

  ctx.drawImage(
    certificateTemplate,
    0,
    0,
    canvas.width,
    canvas.height
  );


  /*
     Add generated information.
  */

  drawCertificateText();


  return true;
}


/* ============================================================
   21. DRAW CERTIFICATE TEXT
   ============================================================ */

function drawCertificateText() {

  const canvas =
    getCanvas();

  const ctx =
    getCanvasContext();

  if (!canvas || !ctx) {
    return;
  }


  const studentName =
    getValue(
      "studentName",
      "student_name",
      "fullName",
      "full_name"
    );


  const studentId =
    getValue(
      "studentId",
      "student_id"
    );


  const courseName =
    selectedCourse?.name ||
    getValue(
      "courseName",
      "course_name"
    );


  const startDate =
    getValue(
      "dateStarted",
      "date_started",
      "startDate",
      "start_date"
    );


  const endDate =
    getValue(
      "dateCompleted",
      "date_completed",
      "completionDate",
      "completion_date"
    );


  /*
     IMPORTANT:

     The existing certificate-template.png
     remains the background.

     These text positions are kept minimal
     and can be adjusted later if your
     exact template requires different
     coordinates.
  */


  ctx.textAlign =
    "center";

  ctx.textBaseline =
    "middle";


  /*
     STUDENT NAME
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
     COURSE
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
     STUDENT ID
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
     DATES
  */

  if (
    startDate ||
    endDate
  ) {

    ctx.fillStyle =
      "#1F2937";

    ctx.font =
      "20px Arial";

    const dateText =
      [
        startDate
          ? `Start: ${formatDate(startDate)}`
          : "",

        endDate
          ? `Completion: ${formatDate(endDate)}`
          : ""
      ]
        .filter(Boolean)
        .join(
          "   |   "
        );

    ctx.fillText(
      dateText,
      canvas.width / 2,
      650
    );
  }
}


/* ============================================================
   22. PREVIEW
   ============================================================ */

async function previewCertificate() {

  clearMessage();

  if (!selectedStudent) {

    showMessage(
      "Fadlan dooro Student.",
      "error"
    );

    return false;
  }


  if (!selectedEnrollment) {

    showMessage(
      "Student-kan Enrollment lama helin.",
      "error"
    );

    return false;
  }


  if (!selectedCourse) {

    showMessage(
      "Course-ka Enrollment-ka lama helin.",
      "error"
    );

    return false;
  }


  return await drawCertificate();
}


/* ============================================================
   23. GENERATE CERTIFICATE
   ============================================================ */

async function generateCertificate() {

  clearMessage();

  if (!selectedStudent) {

    showMessage(
      "Fadlan marka hore dooro Student.",
      "error"
    );

    return false;
  }


  if (!selectedEnrollment) {

    showMessage(
      "Student-kan Enrollment lama helin.",
      "error"
    );

    return false;
  }


  if (!selectedCourse) {

    showMessage(
      "Course-ka Enrollment-ka lama helin.",
      "error"
    );

    return false;
  }


  /*
     Generate identifiers.
  */

  if (
    !getValue(
      "certificateNo",
      "certificate_no"
    )
  ) {

    setValue(
      generateCertificateNumber(),
      "certificateNo",
      "certificate_no"
    );
  }


  if (
    !getValue(
      "certificateId",
      "certificate_id"
    )
  ) {

    setValue(
      generateCertificateId(),
      "certificateId",
      "certificate_id"
    );
  }


  if (
    !getValue(
      "verifyCode",
      "verify_code"
    )
  ) {

    setValue(
      generateVerifyCode(),
      "verifyCode",
      "verify_code"
    );
  }


  if (
    !getValue(
      "issueDate",
      "issue_date"
    )
  ) {

    setValue(
      todayISO(),
      "issueDate",
      "issue_date"
    );
  }


  const drawn =
    await drawCertificate();

  if (!drawn) {
    return false;
  }


  certificateSaved =
    false;


  showMessage(
    "Certificate-ka waa la generate gareeyey.",
    "success"
  );

  return true;
}


/* ============================================================
   24. BUILD CERTIFICATE PAYLOAD
   ============================================================ */

function buildCertificatePayload() {

  if (
    !selectedStudent ||
    !selectedEnrollment ||
    !selectedCourse
  ) {
    return null;
  }


  const certificateNo =
    getValue(
      "certificateNo",
      "certificate_no"
    ) ||
    generateCertificateNumber();


  const certificateId =
    getValue(
      "certificateId",
      "certificate_id"
    ) ||
    generateCertificateId();


  const verifyCode =
    getValue(
      "verifyCode",
      "verify_code"
    ) ||
    generateVerifyCode();


  const issueDate =
    getValue(
      "issueDate",
      "issue_date"
    ) ||
    todayISO();


  setValue(
    certificateNo,
    "certificateNo",
    "certificate_no"
  );

  setValue(
    certificateId,
    "certificateId",
    "certificate_id"
  );

  setValue(
    verifyCode,
    "verifyCode",
    "verify_code"
  );

  setValue(
    issueDate,
    "issueDate",
    "issue_date"
  );


  return {

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
}


/* ============================================================
   25. SAVE CERTIFICATE
   ============================================================ */

async function saveCertificate() {

  clearMessage();

  if (!selectedStudent) {

    showMessage(
      "Student lama dooran.",
      "error"
    );

    return null;
  }


  if (!selectedEnrollment) {

    showMessage(
      "Enrollment lama dooran.",
      "error"
    );

    return null;
  }


  if (!selectedCourse) {

    showMessage(
      "Course lama helin.",
      "error"
    );

    return null;
  }


  const payload =
    buildCertificatePayload();


  if (!payload) {

    showMessage(
      "Certificate data lama diyaarin karin.",
      "error"
    );

    return null;
  }


  console.log(
    "CERTIFICATE PAYLOAD:",
    payload
  );


  try {

    /*
       Save to certificates table.
    */

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
        "CERTIFICATE SAVE ERROR:",
        error
      );

      showMessage(
        `Certificate save error: ${error.message}`,
        "error"
      );

      return null;
    }


    certificateSaved =
      true;


    console.log(
      "CERTIFICATE SAVED:",
      data
    );


    showMessage(
      "Certificate-ka si guul leh ayaa loo kaydiyey.",
      "success"
    );


    return data;

  } catch (error) {

    console.error(
      "CERTIFICATE SAVE EXCEPTION:",
      error
    );

    showMessage(
      `Certificate save error: ${error.message}`,
      "error"
    );

    return null;
  }
}


/* ============================================================
   26. HD DOWNLOAD
   ============================================================ */

function downloadHD() {

  const canvas =
    getCanvas();

  if (!canvas) {

    showMessage(
      "Certificate canvas lama helin.",
      "error"
    );

    return;
  }


  const certificateNo =
    getValue(
      "certificateNo",
      "certificate_no"
    ) ||
    "GAAWOW-Certificate";


  const studentName =
    getValue(
      "studentName",
      "student_name",
      "fullName",
      "full_name"
    );


  const cleanStudentName =
    studentName
      ? studentName
          .replace(
            /[^a-z0-9]+/gi,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          )
      : "Student";


  const link =
    document.createElement(
      "a"
    );


  link.download =
    `${certificateNo}-${cleanStudentName}.png`;


  link.href =
    canvas.toDataURL(
      "image/png",
      1.0
    );


  document.body.appendChild(
    link
  );


  link.click();


  document.body.removeChild(
    link
  );
}


/* ============================================================
   27. PRINT
   ============================================================ */

function printCertificate() {

  const canvas =
    getCanvas();

  if (!canvas) {

    showMessage(
      "Certificate canvas lama helin.",
      "error"
    );

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
      "Browser-ku wuxuu xannibay Print window.",
      "error"
    );

    return;
  }


  printWindow.document.write(`
    <!DOCTYPE html>

    <html>

      <head>

        <meta
          charset="UTF-8"
        >

        <title>
          GAAWOW Academy Certificate
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
            background: #ffffff;
          }

          body {
            display: flex;
            align-items: center;
            justify-content: center;
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
          alt="GAAWOW Academy Certificate"
        >

        <script>

          window.onload = function() {

            setTimeout(
              function() {
                window.print();
              },
              300
            );

          };

        <\/script>

      </body>

    </html>
  `);


  printWindow.document.close();
}


/* ============================================================
   28. NEW CERTIFICATE
   ============================================================ */

function newCertificate() {

  selectedStudent =
    null;

  selectedEnrollment =
    null;

  selectedCourse =
    null;

  certificateSaved =
    false;


  const studentSelect =
    firstElement(
      "studentSelect",
      "student_select"
    );

  if (studentSelect) {

    studentSelect.value =
      "";
  }


  clearStudentFields();

  clearCourseSelect();


  setValue(
    todayISO(),
    "issueDate",
    "issue_date"
  );


  setValue(
    generateCertificateNumber(),
    "certificateNo",
    "certificate_no"
  );


  setValue(
    generateCertificateId(),
    "certificateId",
    "certificate_id"
  );


  setValue(
    generateVerifyCode(),
    "verifyCode",
    "verify_code"
  );


  const canvas =
    getCanvas();

  const ctx =
    getCanvasContext();


  if (
    canvas &&
    ctx &&
    certificateTemplate
  ) {

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
  }


  clearMessage();
}


/* ============================================================
   29. BUTTON BINDING
   ============================================================ */

function bindButtons() {

  const generateButton =
    firstElement(
      "generateBtn",
      "generateCertificateBtn"
    );


  const previewButton =
    firstElement(
      "previewBtn",
      "previewCertificateBtn"
    );


  const saveButton =
    firstElement(
      "saveBtn",
      "saveCertificateBtn"
    );


  const downloadButton =
    firstElement(
      "downloadBtn",
      "hdDownloadBtn",
      "downloadHD"
    );


  const printButton =
    firstElement(
      "printBtn",
      "printCertificateBtn"
    );


  const newButton =
    firstElement(
      "newBtn",
      "newCertificateBtn"
    );


  if (generateButton) {

    generateButton.onclick =
      generateCertificate;
  }


  if (previewButton) {

    previewButton.onclick =
      previewCertificate;
  }


  if (saveButton) {

    saveButton.onclick =
      saveCertificate;
  }


  if (downloadButton) {

    downloadButton.onclick =
      downloadHD;
  }


  if (printButton) {

    printButton.onclick =
      printCertificate;
  }


  if (newButton) {

    newButton.onclick =
      newCertificate;
  }


  console.log(
    "Certificate buttons bound."
  );
}


/* ============================================================
   30. INITIALIZE
   ============================================================ */

async function initializeCertificateGenerator() {

  console.log(
    "================================================"
  );

  console.log(
    "GAAWOW EMS CERTIFICATE GENERATOR V7.7 FINAL"
  );

  console.log(
    "================================================"
  );


  /*
     STEP 1
  */

  const sessionOK =
    await loadCurrentUser();


  if (!sessionOK) {
    return;
  }


  /*
     STEP 2
  */

  const profileOK =
    await loadCurrentProfile();


  if (!profileOK) {
    return;
  }


  /*
     STEP 3
  */

  ensureInstitutionField();


  /*
     STEP 4
  */

  bindButtons();


  /*
     STEP 5
  */

  const institutionOK =
    await loadInstitutions();


  if (!institutionOK) {
    return;
  }


  /*
     STEP 6
     Initial dates / identifiers
  */

  if (
    !getValue(
      "issueDate",
      "issue_date"
    )
  ) {

    setValue(
      todayISO(),
      "issueDate",
      "issue_date"
    );
  }


  if (
    !getValue(
      "certificateNo",
      "certificate_no"
    )
  ) {

    setValue(
      generateCertificateNumber(),
      "certificateNo",
      "certificate_no"
    );
  }


  if (
    !getValue(
      "certificateId",
      "certificate_id"
    )
  ) {

    setValue(
      generateCertificateId(),
      "certificateId",
      "certificate_id"
    );
  }


  if (
    !getValue(
      "verifyCode",
      "verify_code"
    )
  ) {

    setValue(
      generateVerifyCode(),
      "verifyCode",
      "verify_code"
    );
  }


  /*
     STEP 7
     Load certificate background.
  */

  try {

    await loadCertificateTemplate();

    const canvas =
      getCanvas();

    const ctx =
      getCanvasContext();


    if (
      canvas &&
      ctx &&
      certificateTemplate
    ) {

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

  } catch (error) {

    console.error(
      "TEMPLATE ERROR:",
      error
    );

    showMessage(
      error.message,
      "error"
    );

    /*
       Do not stop the rest of the application.
    */
  }


  console.log(
    "================================================"
  );

  console.log(
    "V7.7 FINAL READY"
  );

  console.log(
    "================================================"
  );
}


/* ============================================================
   31. GLOBAL FUNCTIONS
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

window.selectStudent =
  selectStudent;


/* ============================================================
   32. START APPLICATION
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
