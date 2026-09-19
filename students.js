/* =========================================================
   GAAWOW EMS
   Certificate Generator V7.9 FINAL

   DATABASE-SAFE
   STUDENT MODULE ALIGNED VERSION

   IMPORTANT:
   - Certificate HTML DESIGN IS NOT CHANGED
   - Uses the SAME student-loading logic as students.js
   - Super Admin = ALL students
   - Other roles = own institution students
   - Enrollment uses start_date / end_date
   - Certificate canvas = 1536 × 1024
   ========================================================= */


/* =========================================================
   1. SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   2. GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let students = [];
let enrollments = [];
let courses = [];

let selectedStudent = null;
let selectedEnrollment = null;
let selectedCourse = null;

let certificateTemplate = null;

const CERTIFICATE_WIDTH = 1536;
const CERTIFICATE_HEIGHT = 1024;


/* =========================================================
   3. DOM HELPER
   ========================================================= */

function getElement(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }

  return null;
}


/* =========================================================
   4. DOM ELEMENTS
   ========================================================= */

const studentSelect =
  getElement(
    "studentSelect",
    "studentIdSelect",
    "certificateStudent",
    "student"
  );

const fullNameInput =
  getElement(
    "fullName",
    "studentName",
    "certificateStudentName"
  );

const studentIdInput =
  getElement(
    "studentId",
    "studentCode",
    "certificateStudentId"
  );

const courseSelect =
  getElement(
    "courseSelect",
    "certificateCourse",
    "course"
  );

const dateStartedInput =
  getElement(
    "dateStarted",
    "startDate",
    "dateStart",
    "courseStartDate"
  );

const dateCompletedInput =
  getElement(
    "dateCompleted",
    "completionDate",
    "dateCompleted",
    "courseEndDate"
  );

const certificateNoInput =
  getElement(
    "certificateNo",
    "certificateNumber",
    "certNo"
  );

const certificateIdInput =
  getElement(
    "certificateId",
    "certId"
  );

const verifyCodeInput =
  getElement(
    "verifyCode",
    "verificationCode"
  );

const issueDateInput =
  getElement(
    "issueDate",
    "certificateIssueDate"
  );

const statusInput =
  getElement(
    "status",
    "certificateStatus"
  );

const directorInput =
  getElement(
    "directorName",
    "director"
  );

const academicHeadInput =
  getElement(
    "academicHead",
    "academicHeadName"
  );

const institutionSelect =
  getElement(
    "institutionId",
    "certificateInstitution",
    "institutionSelect"
  );

const canvas =
  getElement(
    "certificateCanvas",
    "canvas",
    "certificatePreview"
  );


/* =========================================================
   5. SMALL UTILITIES
   ========================================================= */

function showMessage(message, type = "info") {
  console.log(`[${type}] ${message}`);

  const box =
    getElement(
      "message",
      "statusMessage",
      "certificateMessage",
      "alertMessage"
    );

  if (!box) return;

  box.textContent = message;

  box.className =
    `message ${type}`;

  box.style.display = "block";

  setTimeout(() => {
    box.style.display = "none";
  }, 5000);
}


function setSelectLoading(select, text = "Loading...") {
  if (!select) return;

  select.innerHTML = "";

  const option =
    document.createElement("option");

  option.value = "";
  option.textContent = text;

  select.appendChild(option);
}


function setSelectEmpty(select, text = "No data found") {
  if (!select) return;

  select.innerHTML = "";

  const option =
    document.createElement("option");

  option.value = "";
  option.textContent = text;

  select.appendChild(option);
}


function clearInput(input) {
  if (input) input.value = "";
}


function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().split("T")[0];
}


function formatDisplayDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day =
    String(date.getUTCDate()).padStart(2, "0");

  const month =
    String(date.getUTCMonth() + 1).padStart(2, "0");

  const year =
    date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}


function generateRandomCode(length = 8) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < length; i++) {
    result +=
      chars[
        Math.floor(
          Math.random() * chars.length
        )
      ];
  }

  return result;
}


function generateCertificateNumber() {
  const year =
    new Date().getFullYear();

  return `CERT-${year}-${generateRandomCode(6)}`;
}


function generateCertificateId() {
  return `GA-CERT-${generateRandomCode(8)}`;
}


function generateVerifyCode() {
  return `GAW-${new Date().getFullYear()}-${generateRandomCode(8)}`;
}


/* =========================================================
   6. SESSION + PROFILE
   SAME LOGIC AS STUDENTS MODULE
   ========================================================= */

async function checkSession() {

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
      "Unable to check login session.",
      "error"
    );

    return false;
  }

  if (!data || !data.session) {

    window.location.href =
      "index.html";

    return false;
  }

  currentUser =
    data.session.user;


  /* -----------------------------------------
     LOAD PROFILE
     ----------------------------------------- */

  const {
    data: profile,
    error: profileError
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
      .single();


  if (profileError) {

    console.error(
      "Profile error:",
      profileError
    );

    showMessage(
      "Unable to load user profile: " +
      profileError.message,
      "error"
    );

    return false;
  }


  if (!profile) {

    showMessage(
      "User profile not found.",
      "error"
    );

    return false;
  }


  currentProfile =
    profile;


  console.log(
    "Certificate profile:",
    currentProfile
  );


  /* -----------------------------------------
     ACTIVE CHECK
     ----------------------------------------- */

  if (
    profile.is_active === false
  ) {

    await supabaseClient.auth.signOut();

    window.location.href =
      "index.html";

    return false;
  }


  return true;
}


/* =========================================================
   7. LOAD INSTITUTIONS
   OPTIONAL ONLY
   DOES NOT CONTROL STUDENT LOADING
   ========================================================= */

async function loadInstitutions() {

  if (!institutionSelect) {
    return;
  }

  institutionSelect.innerHTML = `
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
      "Load institutions error:",
      error
    );

    institutionSelect.innerHTML = `
      <option value="">
        Unable to load institutions
      </option>
    `;

    return;
  }


  const institutions =
    data || [];


  institutionSelect.innerHTML = `
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

      institutionSelect.appendChild(
        option
      );
    }
  );


  /* -----------------------------------------
     SUPER ADMIN
     ----------------------------------------- */

  if (
    currentProfile &&
    currentProfile.role ===
      "super_admin"
  ) {

    institutionSelect.style.display =
      "";

  } else {

    institutionSelect.style.display =
      "none";

  }
}


/* =========================================================
   8. LOAD STUDENTS
   EXACTLY ALIGNED WITH students.js

   SUPER ADMIN:
   NO institution filter

   OTHER ROLES:
   institution_id filter
   ========================================================= */

async function loadStudentsForCertificate() {

  if (!studentSelect) {

    console.error(
      "Student select element not found."
    );

    return;
  }


  setSelectLoading(
    studentSelect,
    "Loading students..."
  );


  /* -----------------------------------------
     BASE QUERY
     SAME COLUMNS AS students.js
     ----------------------------------------- */

  let query =
    supabaseClient
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
        emergency_contact_name,
        emergency_contact_phone,
        created_at,
        updated_at
      `);


  /* -----------------------------------------
     SUPER ADMIN
     SEE ALL STUDENTS
     ----------------------------------------- */

  if (
    currentProfile.role ===
    "super_admin"
  ) {

    // IMPORTANT:
    // No institution filter.

  } else {

    /* ---------------------------------------
       OTHER ROLES
       --------------------------------------- */

    if (
      !currentProfile.institution_id
    ) {

      setSelectEmpty(
        studentSelect,
        "Institution not assigned"
      );

      showMessage(
        "This account has no institution assigned.",
        "error"
      );

      return;
    }


    query =
      query.eq(
        "institution_id",
        currentProfile.institution_id
      );
  }


  /* -----------------------------------------
     EXECUTE QUERY
     ----------------------------------------- */

  const {
    data,
    error
  } =
    await query.order(
      "created_at",
      {
        ascending: false
      }
    );


  if (error) {

    console.error(
      "Load certificate students error:",
      error
    );

    setSelectEmpty(
      studentSelect,
      "Unable to load students"
    );

    showMessage(
      "Unable to load students: " +
      error.message,
      "error"
    );

    return;
  }


  students =
    data || [];


  console.log(
    "Certificate students loaded:",
    students.length,
    students
  );


  /* -----------------------------------------
     POPULATE STUDENT SELECT
     ----------------------------------------- */

  studentSelect.innerHTML = `
    <option value="">
      Select Student
    </option>
  `;


  if (
    students.length === 0
  ) {

    setSelectEmpty(
      studentSelect,
      "No students found"
    );

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


      const studentCode =
        student.student_id
          ? ` — ${student.student_id}`
          : "";


      option.textContent =
        `${student.full_name || "Unnamed Student"}${studentCode}`;


      studentSelect.appendChild(
        option
      );
    }
  );
}


/* =========================================================
   9. LOAD ENROLLMENTS FOR SELECTED STUDENT
   DATABASE-SAFE
   Uses start_date / end_date
   ========================================================= */

async function loadEnrollmentsForStudent(
  studentUUID
) {

  enrollments = [];

  selectedEnrollment = null;


  if (!studentUUID) {
    return;
  }


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
        status,
        created_at,
        updated_at
      `)
      .eq(
        "student_id",
        studentUUID
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Load enrollments error:",
      error
    );

    showMessage(
      "Unable to load student enrollment: " +
      error.message,
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


  if (
    enrollments.length > 0
  ) {

    selectedEnrollment =
      enrollments[0];
  }
}


/* =========================================================
   10. LOAD COURSES FROM ENROLLMENTS
   ========================================================= */

async function loadCoursesForStudent(
  studentUUID
) {

  if (!courseSelect) {
    return;
  }


  courseSelect.innerHTML = `
    <option value="">
      Loading courses...
    </option>
  `;


  await loadEnrollmentsForStudent(
    studentUUID
  );


  if (
    enrollments.length === 0
  ) {

    setSelectEmpty(
      courseSelect,
      "No enrolled courses found"
    );

    clearInput(
      dateStartedInput
    );

    clearInput(
      dateCompletedInput
    );

    return;
  }


  const courseIds =
    [
      ...new Set(
        enrollments
          .map(
            enrollment =>
              enrollment.course_id
          )
          .filter(Boolean)
      )
    ];


  if (
    courseIds.length === 0
  ) {

    setSelectEmpty(
      courseSelect,
      "No courses found"
    );

    return;
  }


  /* -----------------------------------------
     COURSE QUERY
     ----------------------------------------- */

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
      )
      .order(
        "name",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "Load courses error:",
      error
    );

    setSelectEmpty(
      courseSelect,
      "Unable to load courses"
    );

    showMessage(
      "Unable to load courses: " +
      error.message,
      "error"
    );

    return;
  }


  courses =
    data || [];


  console.log(
    "Student courses:",
    courses
  );


  courseSelect.innerHTML = `
    <option value="">
      Select Course
    </option>
  `;


  courses.forEach(
    course => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        course.id;

      option.textContent =
        course.code
          ? `${course.name} (${course.code})`
          : course.name;

      courseSelect.appendChild(
        option
      );
    }
  );


  /* -----------------------------------------
     SELECT FIRST COURSE
     ----------------------------------------- */

  if (
    courses.length > 0
  ) {

    const firstCourse =
      courses[0];

    courseSelect.value =
      firstCourse.id;

    selectedCourse =
      firstCourse;


    updateDatesFromEnrollment(
      firstCourse.id
    );
  }
}


/* =========================================================
   11. UPDATE DATES FROM ENROLLMENT
   ========================================================= */

function updateDatesFromEnrollment(
  courseUUID
) {

  const enrollment =
    enrollments.find(
      item =>
        item.course_id ===
        courseUUID
    );


  if (!enrollment) {
    return;
  }


  selectedEnrollment =
    enrollment;


  if (
    dateStartedInput
  ) {

    dateStartedInput.value =
      formatDate(
        enrollment.start_date
      );
  }


  if (
    dateCompletedInput
  ) {

    dateCompletedInput.value =
      formatDate(
        enrollment.end_date
      );
  }


  console.log(
    "Selected enrollment:",
    enrollment
  );
}


/* =========================================================
   12. HANDLE STUDENT CHANGE
   ========================================================= */

async function handleStudentChange() {

  if (!studentSelect) {
    return;
  }


  const studentUUID =
    studentSelect.value;


  if (!studentUUID) {

    selectedStudent =
      null;

    selectedEnrollment =
      null;

    selectedCourse =
      null;

    enrollments = [];
    courses = [];


    clearInput(
      fullNameInput
    );

    clearInput(
      studentIdInput
    );

    if (courseSelect) {
      setSelectEmpty(
        courseSelect,
        "Select Course"
      );
    }

    clearInput(
      dateStartedInput
    );

    clearInput(
      dateCompletedInput
    );

    return;
  }


  selectedStudent =
    students.find(
      student =>
        student.id ===
        studentUUID
    );


  if (!selectedStudent) {

    console.error(
      "Selected student not found in local array."
    );

    return;
  }


  /* -----------------------------------------
     AUTO-FILL STUDENT DATA
     ----------------------------------------- */

  if (fullNameInput) {

    fullNameInput.value =
      selectedStudent.full_name || "";
  }


  if (studentIdInput) {

    studentIdInput.value =
      selectedStudent.student_id || "";
  }


  /* -----------------------------------------
     LOAD COURSES
     ----------------------------------------- */

  await loadCoursesForStudent(
    studentUUID
  );


  /* -----------------------------------------
     GENERATE CERTIFICATE IDENTIFIERS
     ----------------------------------------- */

  generateCertificateIdentifiers();
}


/* =========================================================
   13. HANDLE COURSE CHANGE
   ========================================================= */

function handleCourseChange() {

  if (!courseSelect) {
    return;
  }


  const courseUUID =
    courseSelect.value;


  selectedCourse =
    courses.find(
      course =>
        course.id ===
        courseUUID
    ) || null;


  if (courseUUID) {

    updateDatesFromEnrollment(
      courseUUID
    );
  }
}


/* =========================================================
   14. CERTIFICATE IDENTIFIERS
   ========================================================= */

function generateCertificateIdentifiers() {

  if (
    certificateNoInput &&
    !certificateNoInput.value
  ) {

    certificateNoInput.value =
      generateCertificateNumber();
  }


  if (
    certificateIdInput &&
    !certificateIdInput.value
  ) {

    certificateIdInput.value =
      generateCertificateId();
  }


  if (
    verifyCodeInput &&
    !verifyCodeInput.value
  ) {

    verifyCodeInput.value =
      generateVerifyCode();
  }


  if (
    issueDateInput &&
    !issueDateInput.value
  ) {

    issueDateInput.value =
      new Date()
        .toISOString()
        .split("T")[0];
  }


  if (
    statusInput &&
    !statusInput.value
  ) {

    statusInput.value =
      "valid";
  }
}


/* =========================================================
   15. TEMPLATE PRELOAD
   IMPORTANT:
   Existing certificate-template.png
   ========================================================= */

function loadCertificateTemplate() {

  return new Promise(
    (resolve, reject) => {

      const image =
        new Image();

      image.onload =
        () => {

          certificateTemplate =
            image;

          console.log(
            "Certificate template loaded successfully."
          );

          resolve(image);
        };


      image.onerror =
        () => {

          console.error(
            "Unable to load certificate-template.png"
          );

          reject(
            new Error(
              "Unable to load certificate-template.png"
            )
          );
        };


      image.src =
        "./certificate-template.png";
    }
  );
}


/* =========================================================
   16. CANVAS SETUP
   ========================================================= */

function setupCanvas() {

  if (!canvas) {

    console.warn(
      "Certificate canvas not found."
    );

    return null;
  }


  canvas.width =
    CERTIFICATE_WIDTH;

  canvas.height =
    CERTIFICATE_HEIGHT;


  canvas.style.maxWidth =
    "100%";

  canvas.style.height =
    "auto";


  return canvas.getContext(
    "2d"
  );
}


/* =========================================================
   17. DRAW CERTIFICATE
   ========================================================= */

function drawCertificate() {

  if (!certificateTemplate) {

    console.error(
      "Certificate template not loaded."
    );

    return false;
  }


  const ctx =
    setupCanvas();


  if (!ctx) {
    return false;
  }


  /* -----------------------------------------
     BACKGROUND TEMPLATE
     ----------------------------------------- */

  ctx.clearRect(
    0,
    0,
    CERTIFICATE_WIDTH,
    CERTIFICATE_HEIGHT
  );


  ctx.drawImage(
    certificateTemplate,
    0,
    0,
    CERTIFICATE_WIDTH,
    CERTIFICATE_HEIGHT
  );


  /* -----------------------------------------
     DATA
     ----------------------------------------- */

  const studentName =
    selectedStudent?.full_name ||
    fullNameInput?.value ||
    "";

  const studentCode =
    selectedStudent?.student_id ||
    studentIdInput?.value ||
    "";

  const courseName =
    selectedCourse?.name ||
    (
      courseSelect &&
      courseSelect.options[
        courseSelect.selectedIndex
      ]
        ? courseSelect.options[
            courseSelect.selectedIndex
          ].textContent
        : ""
    );


  const started =
    dateStartedInput?.value || "";

  const completed =
    dateCompletedInput?.value || "";

  const certificateNo =
    certificateNoInput?.value || "";

  const certificateId =
    certificateIdInput?.value || "";

  const verifyCode =
    verifyCodeInput?.value || "";

  const issueDate =
    issueDateInput?.value || "";


  /* -----------------------------------------
     TEXT SETTINGS

     IMPORTANT:
     These are intentionally conservative.
     Existing background/template remains the
     primary design.
     ----------------------------------------- */

  ctx.textAlign =
    "center";

  ctx.textBaseline =
    "middle";


  /* -----------------------------------------
     STUDENT NAME
     ----------------------------------------- */

  if (studentName) {

    ctx.font =
      "bold 58px Georgia";

    ctx.fillStyle =
      "#0B1E63";

    ctx.fillText(
      studentName,
      768,
      490,
      1250
    );
  }


  /* -----------------------------------------
     COURSE
     ----------------------------------------- */

  if (courseName) {

    ctx.font =
      "bold 34px Georgia";

    ctx.fillStyle =
      "#0B4DA2";

    ctx.fillText(
      courseName,
      768,
      585,
      1100
    );
  }


  /* -----------------------------------------
     STUDENT ID
     ----------------------------------------- */

  if (studentCode) {

    ctx.font =
      "22px Arial";

    ctx.fillStyle =
      "#1F2937";

    ctx.fillText(
      `Student ID: ${studentCode}`,
      768,
      640
    );
  }


  /* -----------------------------------------
     DATES
     ----------------------------------------- */

  if (
    started ||
    completed
  ) {

    ctx.font =
      "20px Arial";

    ctx.fillStyle =
      "#1F2937";


    let dateText = "";


    if (started) {

      dateText +=
        `Started: ${formatDisplayDate(started)}`;
    }


    if (completed) {

      if (dateText) {
        dateText += "   ";
      }

      dateText +=
        `Completed: ${formatDisplayDate(completed)}`;
    }


    ctx.fillText(
      dateText,
      768,
      690
    );
  }


  /* -----------------------------------------
     CERTIFICATE NUMBER
     ----------------------------------------- */

  if (certificateNo) {

    ctx.textAlign =
      "left";

    ctx.font =
      "18px Arial";

    ctx.fillStyle =
      "#1F2937";

    ctx.fillText(
      `Certificate No: ${certificateNo}`,
      110,
      910
    );
  }


  /* -----------------------------------------
     VERIFY CODE
     ----------------------------------------- */

  if (verifyCode) {

    ctx.textAlign =
      "right";

    ctx.fillText(
      `Verify Code: ${verifyCode}`,
      1426,
      910
    );
  }


  /* -----------------------------------------
     ISSUE DATE
     ----------------------------------------- */

  if (issueDate) {

    ctx.textAlign =
      "center";

    ctx.font =
      "18px Arial";

    ctx.fillText(
      `Issued: ${formatDisplayDate(issueDate)}`,
      768,
      950
    );
  }


  ctx.textAlign =
    "center";


  return true;
}


/* =========================================================
   18. HASH CODE
   ========================================================= */

async function generateHashCode(
  value
) {

  const encoder =
    new TextEncoder();

  const data =
    encoder.encode(
      value
    );


  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );


  const hashArray =
    Array.from(
      new Uint8Array(
        hashBuffer
      )
    );


  return hashArray
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


/* =========================================================
   19. COLLECT CERTIFICATE DATA
   ========================================================= */

function collectCertificateData() {

  const studentUUID =
    studentSelect?.value || null;

  const courseUUID =
    courseSelect?.value || null;


  const student =
    students.find(
      item =>
        item.id ===
        studentUUID
    ) || selectedStudent;


  const course =
    courses.find(
      item =>
        item.id ===
        courseUUID
    ) || selectedCourse;


  return {

    institution_id:
      currentProfile?.institution_id ||
      student?.institution_id ||
      null,

    student_id:
      studentUUID,

    course_id:
      courseUUID,

    certificate_no:
      certificateNoInput?.value ||
      "",

    certificate_id:
      certificateIdInput?.value ||
      "",

    verify_code:
      verifyCodeInput?.value ||
      "",

    issue_date:
      issueDateInput?.value ||
      null,

    expiry_date:
      null,

    status:
      statusInput?.value ||
      "valid",

    student_name:
      student?.full_name ||
      fullNameInput?.value ||
      "",

    course_name:
      course?.name ||
      "",

    enrollment_id:
      selectedEnrollment?.id ||
      null
  };
}


/* =========================================================
   20. SAVE CERTIFICATE
   ========================================================= */

async function saveCertificate() {

  const certificate =
    collectCertificateData();


  if (!certificate.student_id) {

    showMessage(
      "Please select a student.",
      "error"
    );

    return null;
  }


  if (!certificate.course_id) {

    showMessage(
      "Please select a course.",
      "error"
    );

    return null;
  }


  if (!certificate.certificate_no) {

    showMessage(
      "Certificate number is required.",
      "error"
    );

    return null;
  }


  if (!certificate.certificate_id) {

    showMessage(
      "Certificate ID is required.",
      "error"
    );

    return null;
  }


  if (!certificate.verify_code) {

    showMessage(
      "Verification code is required.",
      "error"
    );

    return null;
  }


  /* -----------------------------------------
     HASH SOURCE
     ----------------------------------------- */

  const hashSource =
    [
      certificate.certificate_no,
      certificate.certificate_id,
      certificate.verify_code,
      certificate.student_id,
      certificate.course_id,
      certificate.issue_date || ""
    ].join("|");


  certificate.hash_code =
    await generateHashCode(
      hashSource
    );


  console.log(
    "Saving certificate:",
    certificate
  );


  const {
    data,
    error
  } =
    await supabaseClient
      .from("certificates")
      .insert(
        certificate
      )
      .select()
      .single();


  if (error) {

    console.error(
      "Save certificate error:",
      error
    );

    showMessage(
      "Unable to save certificate: " +
      error.message,
      "error"
    );

    return null;
  }


  showMessage(
    "Certificate saved successfully.",
    "success"
  );


  console.log(
    "Certificate saved:",
    data
  );


  return data;
}


/* =========================================================
   21. PREVIEW / GENERATE
   ========================================================= */

function generateCertificate() {

  generateCertificateIdentifiers();

  const success =
    drawCertificate();


  if (success) {

    showMessage(
      "Certificate generated successfully.",
      "success"
    );
  }


  return success;
}


/* =========================================================
   22. HD DOWNLOAD
   ========================================================= */

function downloadCertificateHD() {

  if (!drawCertificate()) {
    return;
  }


  if (!canvas) {
    return;
  }


  const link =
    document.createElement(
      "a"
    );


  const certificateNo =
    certificateNoInput?.value ||
    "certificate";


  link.download =
    `${certificateNo}.png`;


  link.href =
    canvas.toDataURL(
      "image/png",
      1.0
    );


  document.body.appendChild(
    link
  );


  link.click();


  link.remove();


  showMessage(
    "HD certificate downloaded.",
    "success"
  );
}


/* =========================================================
   23. PRINT
   ========================================================= */

function printCertificate() {

  if (!drawCertificate()) {
    return;
  }


  if (!canvas) {
    return;
  }


  const imageData =
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
      "Please allow pop-ups to print the certificate.",
      "error"
    );

    return;
  }


  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>GAAWOW Certificate</title>

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

        body {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        img {
          width: 100%;
          height: auto;
          display: block;
        }
      </style>
    </head>

    <body>
      <img src="${imageData}">
    </body>
    </html>
  `);


  printWindow.document.close();


  printWindow.onload =
    () => {

      printWindow.focus();

      printWindow.print();

      setTimeout(
        () => {
          printWindow.close();
        },
        1000
      );
    };
}


/* =========================================================
   24. NEW CERTIFICATE
   ========================================================= */

function newCertificate() {

  selectedStudent =
    null;

  selectedEnrollment =
    null;

  selectedCourse =
    null;

  students = [];
  enrollments = [];
  courses = [];


  if (studentSelect) {

    studentSelect.value =
      "";
  }


  clearInput(
    fullNameInput
  );

  clearInput(
    studentIdInput
  );

  clearInput(
    dateStartedInput
  );

  clearInput(
    dateCompletedInput
  );

  clearInput(
    certificateNoInput
  );

  clearInput(
    certificateIdInput
  );

  clearInput(
    verifyCodeInput
  );


  if (issueDateInput) {

    issueDateInput.value =
      new Date()
        .toISOString()
        .split("T")[0];
  }


  if (statusInput) {

    statusInput.value =
      "valid";
  }


  if (courseSelect) {

    courseSelect.innerHTML = `
      <option value="">
        Select Course
      </option>
    `;
  }


  generateCertificateIdentifiers();


  if (canvas) {

    const ctx =
      canvas.getContext("2d");

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
        CERTIFICATE_WIDTH,
        CERTIFICATE_HEIGHT
      );
    }
  }


  showMessage(
    "New certificate ready.",
    "info"
  );
}


/* =========================================================
   25. EVENT LISTENERS
   ========================================================= */

function setupCertificateEvents() {

  /* -----------------------------------------
     STUDENT
     ----------------------------------------- */

  if (studentSelect) {

    studentSelect.addEventListener(
      "change",
      handleStudentChange
    );
  }


  /* -----------------------------------------
     COURSE
     ----------------------------------------- */

  if (courseSelect) {

    courseSelect.addEventListener(
      "change",
      handleCourseChange
    );
  }


  /* -----------------------------------------
     INSTITUTION
     
     NOTE:
     Institution does NOT control student
     loading anymore.

     This event is only for UI compatibility.
     ----------------------------------------- */

  if (institutionSelect) {

    institutionSelect.addEventListener(
      "change",
      async () => {

        console.log(
          "Institution changed:",
          institutionSelect.value
        );
      }
    );
  }


  /* -----------------------------------------
     GENERATE BUTTON
     ----------------------------------------- */

  const generateButton =
    getElement(
      "generateBtn",
      "generateCertificateBtn",
      "btnGenerate"
    );


  if (generateButton) {

    generateButton.addEventListener(
      "click",
      generateCertificate
    );
  }


  /* -----------------------------------------
     PREVIEW BUTTON
     ----------------------------------------- */

  const previewButton =
    getElement(
      "previewBtn",
      "previewCertificateBtn",
      "btnPreview"
    );


  if (previewButton) {

    previewButton.addEventListener(
      "click",
      generateCertificate
    );
  }


  /* -----------------------------------------
     SAVE BUTTON
     ----------------------------------------- */

  const saveButton =
    getElement(
      "saveBtn",
      "saveCertificateBtn",
      "btnSave"
    );


  if (saveButton) {

    saveButton.addEventListener(
      "click",
      saveCertificate
    );
  }


  /* -----------------------------------------
     HD DOWNLOAD
     ----------------------------------------- */

  const downloadButton =
    getElement(
      "downloadBtn",
      "downloadHD",
      "hdDownloadBtn",
      "btnDownload"
    );


  if (downloadButton) {

    downloadButton.addEventListener(
      "click",
      downloadCertificateHD
    );
  }


  /* -----------------------------------------
     PRINT
     ----------------------------------------- */

  const printButton =
    getElement(
      "printBtn",
      "printCertificateBtn",
      "btnPrint"
    );


  if (printButton) {

    printButton.addEventListener(
      "click",
      printCertificate
    );
  }


  /* -----------------------------------------
     NEW
     ----------------------------------------- */

  const newButton =
    getElement(
      "newBtn",
      "newCertificateBtn",
      "btnNew"
    );


  if (newButton) {

    newButton.addEventListener(
      "click",
      newCertificate
    );
  }
}


/* =========================================================
   26. GLOBAL FUNCTIONS
   Allows existing HTML onclick="" to continue working
   ========================================================= */

window.generateCertificate =
  generateCertificate;

window.previewCertificate =
  generateCertificate;

window.saveCertificate =
  saveCertificate;

window.downloadCertificateHD =
  downloadCertificateHD;

window.printCertificate =
  printCertificate;

window.newCertificate =
  newCertificate;

window.loadStudentsForCertificate =
  loadStudentsForCertificate;


/* =========================================================
   27. START CERTIFICATE PAGE
   ========================================================= */

async function startCertificatePage() {

  console.log(
    "GAAWOW EMS Certificate Generator V7.9 starting..."
  );


  /* -----------------------------------------
     SESSION
     ----------------------------------------- */

  const authenticated =
    await checkSession();


  if (!authenticated) {
    return;
  }


  console.log(
    "Authenticated as:",
    currentProfile
  );


  /* -----------------------------------------
     OPTIONAL INSTITUTIONS
     ----------------------------------------- */

  await loadInstitutions();


  /* -----------------------------------------
     LOAD TEMPLATE
     ----------------------------------------- */

  try {

    await loadCertificateTemplate();

  } catch (error) {

    console.error(
      "Template error:",
      error
    );

    showMessage(
      "Certificate template could not be loaded.",
      "error"
    );

    return;
  }


  /* -----------------------------------------
     SETUP CANVAS
     ----------------------------------------- */

  setupCanvas();


  /* -----------------------------------------
     EVENTS
     ----------------------------------------- */

  setupCertificateEvents();


  /* -----------------------------------------
     IMPORTANT:
     STUDENTS ARE LOADED DIRECTLY.

     NO institution dependency.
     SAME LOGIC AS students.js.
     ----------------------------------------- */

  await loadStudentsForCertificate();


  /* -----------------------------------------
     INITIAL CERTIFICATE VALUES
     ----------------------------------------- */

  generateCertificateIdentifiers();


  /* -----------------------------------------
     INITIAL PREVIEW
     ----------------------------------------- */

  if (
    certificateTemplate &&
    canvas
  ) {

    const ctx =
      canvas.getContext("2d");

    ctx.drawImage(
      certificateTemplate,
      0,
      0,
      CERTIFICATE_WIDTH,
      CERTIFICATE_HEIGHT
    );
  }


  console.log(
    "GAAWOW EMS Certificate Generator V7.9 ready."
  );
}


/* =========================================================
   28. START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startCertificatePage
  );

} else {

  startCertificatePage();
}
