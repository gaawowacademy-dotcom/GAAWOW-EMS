/* =========================================================
   GAAWOW EMS
   Certificate Generator V7.3
   DATABASE-SAFE COURSE + ENROLLMENT VERSION

   A4 Landscape 297 × 210 mm

   DATA SOURCES:
   students       → student information + photo_url
   courses        → course information
   enrollments    → enrollment + started/completed dates
   certificates   → certificate records

   DESIGN:
   Existing certificate.html/template is preserved.
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
   GLOBAL STATE
   ========================================================= */

let students = [];
let courses = [];
let enrollments = [];

let selectedStudent = null;
let selectedCourse = null;
let selectedEnrollment = null;


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


function elementExists(id) {
  return !!$(id);
}


function todayISO() {

  const d = new Date();

  return d.toISOString().split("T")[0];
}


function addYears(dateString, years) {

  if (!dateString) {
    return todayISO();
  }

  const d =
    new Date(dateString + "T00:00:00");

  d.setFullYear(
    d.getFullYear() + years
  );

  return d.toISOString().split("T")[0];
}


function formatDate(dateValue) {

  if (!dateValue) {
    return "";
  }

  try {

    const d =
      new Date(dateValue + "T00:00:00");

    if (Number.isNaN(d.getTime())) {
      return dateValue;
    }

    return d.toISOString().split("T")[0];

  } catch {

    return dateValue;
  }
}


function randomChars(length) {

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


function showMessage(
  text,
  type = "success"
) {

  const box = $("message");

  if (!box) {
    console.log(text);
    return;
  }

  box.style.display = "block";
  box.textContent = text;

  if (type === "error") {

    box.style.background = "#fee2e2";
    box.style.color = "#991b1b";

  } else {

    box.style.background = "#dcfce7";
    box.style.color = "#166534";
  }
}


/* =========================================================
   FIND ELEMENTS SAFELY
   ========================================================= */

function findFirstElement(ids) {

  for (const id of ids) {

    const element = $(id);

    if (element) {
      return element;
    }
  }

  return null;
}


/* =========================================================
   AUTOMATIC CERTIFICATE IDS
   ========================================================= */

function generateCertificateNo() {

  const year =
    new Date().getFullYear();

  const random =
    Math.floor(
      1000 + Math.random() * 9000
    );

  return `CERT-${year}-${random}`;
}


function generateCertificateId() {

  const random =
    Math.floor(
      1000 + Math.random() * 9000
    );

  return `GA-CERT-${random}`;
}


function generateVerifyCode() {

  return (
    `GAW-${randomChars(4)}-${randomChars(4)}`
  );
}


function generateHashCode() {

  const timestamp =
    Date.now()
      .toString(36)
      .toUpperCase();

  return (
    `GA-${timestamp}-${randomChars(8)}`
  );
}


function generateAllIds() {

  if ($("certificate_no")) {

    $("certificate_no").value =
      generateCertificateNo();
  }

  if ($("certificate_id")) {

    $("certificate_id").value =
      generateCertificateId();
  }

  if ($("verify_code")) {

    $("verify_code").value =
      generateVerifyCode();
  }
}


/* =========================================================
   LOAD STUDENTS
   ========================================================= */

async function loadStudents() {

  const select =
    $("student_select");

  if (!select) {

    console.error(
      "student_select element not found."
    );

    return;
  }

  select.innerHTML =
    `<option value="">Loading students...</option>`;

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
        .order(
          "full_name",
          {
            ascending: true
          }
        );


    if (error) {
      throw error;
    }


    students =
      data || [];


    select.innerHTML =
      `<option value="">Select Student</option>`;


    students.forEach(
      student => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          student.id ||
          student.student_id;

        option.textContent =
          `${student.full_name || "Unnamed"} — ${student.student_id || ""}`;

        select.appendChild(
          option
        );
      }
    );


    if (!students.length) {

      select.innerHTML =
        `<option value="">No students found</option>`;

      showMessage(
        "No students were found in Student Registration.",
        "error"
      );

      return;
    }


  } catch (error) {

    console.error(
      "Student loading error:",
      error
    );

    select.innerHTML =
      `<option value="">Unable to load students</option>`;

    showMessage(
      "Unable to load students: " +
      (error.message || error),
      "error"
    );
  }
}


/* =========================================================
   LOAD COURSES
   ========================================================= */

async function loadCourses(
  institutionId = null
) {

  const courseSelect =
    findFirstElement([
      "course_select",
      "course_name_select"
    ]);


  if (!courseSelect) {

    console.warn(
      "No course select found. " +
      "Course input will remain available."
    );

    return;
  }


  courseSelect.innerHTML =
    `<option value="">Loading courses...</option>`;


  try {

    /*
      IMPORTANT:
      We read directly from courses table.

      No TEST COURSE A hard-coding.
    */

    let query =
      supabaseClient
        .from("courses")
        .select(`
          id,
          institution_id,
          name,
          code,
          description,
          is_active
        `)
        .eq(
          "is_active",
          true
        )
        .order(
          "name",
          {
            ascending: true
          }
        );


    /*
      If student institution is known,
      only show courses belonging to
      that institution.
    */

    if (institutionId) {

      query =
        query.eq(
          "institution_id",
          institutionId
        );
    }


    const {
      data,
      error
    } =
      await query;


    if (error) {
      throw error;
    }


    courses =
      data || [];


    courseSelect.innerHTML =
      `<option value="">Select Course</option>`;


    courses.forEach(
      course => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          course.id;

        option.textContent =
          `${course.name || "Unnamed Course"}${course.code ? " — " + course.code : ""}`;

        option.dataset.courseName =
          course.name || "";

        option.dataset.courseCode =
          course.code || "";

        courseSelect.appendChild(
          option
        );
      }
    );


    if (!courses.length) {

      courseSelect.innerHTML =
        `<option value="">No active courses found</option>`;

      showMessage(
        "No active courses found for this institution.",
        "error"
      );
    }


  } catch (error) {

    console.error(
      "Course loading error:",
      error
    );

    courseSelect.innerHTML =
      `<option value="">Unable to load courses</option>`;

    showMessage(
      "Unable to load courses: " +
      (error.message || error),
      "error"
    );
  }
}


/* =========================================================
   LOAD ENROLLMENTS
   ========================================================= */

async function loadEnrollmentsForStudent(
  student
) {

  if (!student) {
    enrollments = [];
    return [];
  }


  try {

    /*
      select("*") is intentional here.

      It allows V7.3 to work with the existing
      enrollment schema without assuming a single
      date-column naming convention.
    */

    const {
      data,
      error
    } =
      await supabaseClient
        .from("enrollments")
        .select("*");


    if (error) {
      throw error;
    }


    const studentId =
      String(
        student.id || ""
      );


    const studentCode =
      String(
        student.student_id || ""
      );


    enrollments =
      (data || []).filter(
        enrollment => {

          const possibleStudentIds = [

            enrollment.student_id,

            enrollment.student_uuid,

            enrollment.student_profile_id,

            enrollment.profile_id

          ]
          .filter(
            value =>
              value !== null &&
              value !== undefined
          )
          .map(
            value =>
              String(value)
          );


          return (
            possibleStudentIds.includes(
              studentId
            ) ||
            possibleStudentIds.includes(
              studentCode
            )
          );
        }
      );


    return enrollments;


  } catch (error) {

    console.error(
      "Enrollment loading error:",
      error
    );

    /*
      Enrollment table may have RLS
      or may not be readable.

      Do not stop the entire certificate
      generator. The user can still select
      the course manually.
    */

    enrollments = [];

    return [];
  }
}


/* =========================================================
   ENROLLMENT COURSE MATCH
   ========================================================= */

function findEnrollmentForCourse(
  course
) {

  if (!course || !enrollments.length) {
    return null;
  }


  const courseId =
    String(
      course.id || ""
    );


  const courseCode =
    String(
      course.code || ""
    );


  const courseName =
    String(
      course.name || ""
    )
      .trim()
      .toLowerCase();


  const found =
    enrollments.find(
      enrollment => {

        const possibleCourseIds = [

          enrollment.course_id,

          enrollment.course_uuid

        ]
        .filter(
          value =>
            value !== null &&
            value !== undefined
        )
        .map(
          value =>
            String(value)
        );


        if (
          possibleCourseIds.includes(
            courseId
          )
        ) {

          return true;
        }


        const enrollmentCode =
          String(
            enrollment.course_code || ""
          )
            .trim()
            .toLowerCase();


        const enrollmentName =
          String(
            enrollment.course_name || ""
          )
            .trim()
            .toLowerCase();


        return (
          courseCode &&
          enrollmentCode ===
          courseCode.toLowerCase()
        ) ||
        (
          courseName &&
          enrollmentName ===
          courseName
        );
      }
    );


  return found || null;
}


/* =========================================================
   FIND ENROLLMENT DATE
   ========================================================= */

function getEnrollmentStartDate(
  enrollment
) {

  if (!enrollment) {
    return "";
  }


  const possibleFields = [

    "date_started",
    "started_at",
    "start_date",
    "enrollment_date",
    "date_enrolled",
    "created_at"

  ];


  for (
    const field of possibleFields
  ) {

    if (
      enrollment[field]
    ) {

      return formatDate(
        enrollment[field]
      );
    }
  }


  return "";
}


function getEnrollmentCompletedDate(
  enrollment
) {

  if (!enrollment) {
    return "";
  }


  const possibleFields = [

    "date_completed",
    "completed_at",
    "completion_date",
    "date_completion"

  ];


  for (
    const field of possibleFields
  ) {

    if (
      enrollment[field]
    ) {

      return formatDate(
        enrollment[field]
      );
    }
  }


  return "";
}


/* =========================================================
   STUDENT SELECTION
   ========================================================= */

async function handleStudentSelection() {

  const value =
    $("student_select").value;


  selectedStudent =
    students.find(
      student =>
        String(student.id) ===
          String(value) ||

        String(student.student_id) ===
          String(value)
    );


  if (!selectedStudent) {

    $("full_name").value = "";
    $("student_id").value = "";

    selectedCourse = null;
    selectedEnrollment = null;

    return;
  }


  $("full_name").value =
    selectedStudent.full_name || "";


  $("student_id").value =
    selectedStudent.student_id || "";


  /*
    Student photo
  */

  updateStudentPhoto(
    selectedStudent.photo_url
  );


  /*
    Generate certificate IDs
  */

  generateAllIds();


  /*
    Load institution-specific courses
  */

  await loadCourses(
    selectedStudent.institution_id
  );


  /*
    Load this student's enrollments
  */

  await loadEnrollmentsForStudent(
    selectedStudent
  );


  /*
    If the course select already has a value,
    match it with enrollment.
  */

  const courseSelect =
    findFirstElement([
      "course_select",
      "course_name_select"
    ]);


  if (
    courseSelect &&
    courseSelect.value
  ) {

    handleCourseSelection();
  }


  generateCertificate();
}


/* =========================================================
   COURSE SELECTION
   ========================================================= */

function handleCourseSelection() {

  const courseSelect =
    findFirstElement([
      "course_select",
      "course_name_select"
    ]);


  if (!courseSelect) {
    return;
  }


  const courseId =
    courseSelect.value;


  selectedCourse =
    courses.find(
      course =>
        String(course.id) ===
        String(courseId)
    );


  if (!selectedCourse) {

    selectedEnrollment = null;

    return;
  }


  /*
    Put course name into existing
    certificate_name field.
  */

  if ($("course_name")) {

    $("course_name").value =
      selectedCourse.name || "";
  }


  /*
    Match enrollment.
  */

  selectedEnrollment =
    findEnrollmentForCourse(
      selectedCourse
    );


  /*
    Date Started
  */

  const startedDate =
    getEnrollmentStartDate(
      selectedEnrollment
    );


  /*
    Date Completed
  */

  const completedDate =
    getEnrollmentCompletedDate(
      selectedEnrollment
    );


  /*
    Support optional fields if they
    exist in certificate.html.
  */

  const startedInput =
    findFirstElement([
      "date_started",
      "start_date"
    ]);


  const completedInput =
    findFirstElement([
      "date_completed",
      "completed_date"
    ]);


  if (
    startedInput &&
    startedDate
  ) {

    startedInput.value =
      startedDate;
  }


  if (
    completedInput &&
    completedDate
  ) {

    completedInput.value =
      completedDate;
  }


  /*
    If the existing certificate UI
    uses issue_date, use completed date
    when available.
  */

  if (
    $("issue_date") &&
    completedDate
  ) {

    $("issue_date").value =
      completedDate;
  }


  generateCertificate();
}


/* =========================================================
   STUDENT PHOTO
   ========================================================= */

function updateStudentPhoto(
  photoUrl
) {

  if (!photoUrl) {
    return;
  }


  /*
    Support common image IDs without
    breaking the existing certificate.
  */

  const image =
    findFirstElement([
      "student_photo",
      "preview_student_photo",
      "certificate_student_photo",
      "studentPhoto"
    ]);


  if (!image) {
    return;
  }


  image.src =
    photoUrl;

  image.style.display =
    "block";

  image.crossOrigin =
    "anonymous";
}


/* =========================================================
   QR CODE
   ========================================================= */

function getVerificationURL() {

  const verifyCode =
    encodeURIComponent(
      $("verify_code")?.value || ""
    );


  return (
    "https://gaawowacademy-dotcom.github.io/" +
    "GAAWOW-EMS/verify.html?code=" +
    verifyCode
  );
}


function updateQRCode() {

  const qr =
    $("qr_code");


  if (!qr) {
    return;
  }


  const url =
    encodeURIComponent(
      getVerificationURL()
    );


  /*
    QR image is generated remotely.
    Verification destination remains
    the official GAAWOW EMS verify.html.
  */

  qr.src =
    "https://api.qrserver.com/v1/create-qr-code/" +
    "?size=300x300&margin=5&data=" +
    url;


  qr.alt =
    "GAAWOW EMS Certificate Verification QR";
}


/* =========================================================
   RENDER CERTIFICATE
   ========================================================= */

function generateCertificate() {

  const name =
    $("full_name")?.value.trim() ||
    "STUDENT NAME";


  const studentId =
    $("student_id")?.value.trim() ||
    "—";


  const course =
    $("course_name")?.value.trim() ||
    "COURSE NAME";


  const certNo =
    $("certificate_no")?.value.trim() ||
    generateCertificateNo();


  const certId =
    $("certificate_id")?.value.trim() ||
    generateCertificateId();


  const verify =
    $("verify_code")?.value.trim() ||
    generateVerifyCode();


  const issue =
    $("issue_date")?.value ||
    todayISO();


  const director =
    $("director_name")?.value.trim() ||
    "GAAWOW Academy";


  const signatory =
    $("signatory_name")?.value.trim() ||
    "Authorized Signatory";


  $("certificate_no").value =
    certNo;


  $("certificate_id").value =
    certId;


  $("verify_code").value =
    verify;


  $("issue_date").value =
    issue;


  if (
    $("expiry_date") &&
    !$("expiry_date").value
  ) {

    $("expiry_date").value =
      addYears(
        issue,
        3
      );
  }


  /*
    Existing certificate template IDs.
    No CSS/template changes.
  */

  if ($("preview_name")) {

    $("preview_name").textContent =
      name.toUpperCase();
  }


  if ($("preview_student_id")) {

    $("preview_student_id").textContent =
      `Student ID: ${studentId}`;
  }


  if ($("preview_course")) {

    $("preview_course").textContent =
      course;
  }


  if ($("preview_cert_no")) {

    $("preview_cert_no").textContent =
      certNo;
  }


  if ($("preview_cert_id")) {

    $("preview_cert_id").textContent =
      certId;
  }


  if ($("preview_verify")) {

    $("preview_verify").textContent =
      verify;
  }


  if ($("preview_issue")) {

    $("preview_issue").textContent =
      issue;
  }


  if ($("preview_director")) {

    $("preview_director").textContent =
      director;
  }


  if ($("preview_signatory")) {

    $("preview_signatory").textContent =
      signatory;
  }


  updateQRCode();


  return true;
}


/* =========================================================
   PREVIEW
   ========================================================= */

function previewCertificate() {

  generateCertificate();


  if ($("certificate")) {

    $("certificate").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }


  showMessage(
    "Certificate preview updated."
  );
}


/* =========================================================
   BUILD CERTIFICATE DATABASE RECORD
   ========================================================= */

function buildCertificateRecord() {

  const record = {

    certificate_no:
      $("certificate_no")?.value || "",

    certificate_id:
      $("certificate_id")?.value || "",

    verify_code:
      $("verify_code")?.value || "",

    hash_code:
      generateHashCode(),

    issue_date:
      $("issue_date")?.value || todayISO(),

    expiry_date:
      $("expiry_date")?.value ||
      addYears(
        $("issue_date")?.value ||
        todayISO(),
        3
      ),

    status:
      "valid",

    student_name:
      $("full_name")?.value || "",

    course_name:
      $("course_name")?.value || ""

  };


  /*
    Add IDs only when they exist in the
    existing database/UI context.
  */

  if (
    selectedStudent?.id
  ) {

    record.student_id =
      selectedStudent.id;
  }


  if (
    selectedStudent?.institution_id
  ) {

    record.institution_id =
      selectedStudent.institution_id;
  }


  if (
    selectedCourse?.id
  ) {

    record.course_id =
      selectedCourse.id;
  }


  if (
    selectedEnrollment?.id
  ) {

    record.enrollment_id =
      selectedEnrollment.id;
  }


  return record;
}


/* =========================================================
   REMOVE UNKNOWN DATABASE COLUMNS
   ========================================================= */

function cleanRecordForFallback(
  record,
  error
) {

  const message =
    String(
      error?.message || ""
    ).toLowerCase();


  /*
    If Supabase rejects an optional
    column because it does not exist,
    remove that column and allow the
    original V7 fields to save.
  */

  const optionalColumns = [

    "student_id",
    "institution_id",
    "course_id",
    "enrollment_id"

  ];


  for (
    const column of optionalColumns
  ) {

    if (
      message.includes(
        column.toLowerCase()
      )
    ) {

      delete record[column];
    }
  }


  return record;
}


/* =========================================================
   SAVE TO SUPABASE
   ========================================================= */

async function saveCertificate() {

  try {

    if (!selectedStudent) {

      throw new Error(
        "Please select a student first."
      );
    }


    if (
      $("course_name") &&
      !$("course_name").value.trim()
    ) {

      throw new Error(
        "Please select a course first."
      );
    }


    generateCertificate();


    let record =
      buildCertificateRecord();


    let {
      data,
      error
    } =
      await supabaseClient
        .from("certificates")
        .insert([
          record
        ])
        .select()
        .single();


    /*
      If optional new relationship columns
      are not present in certificates table,
      retry using the original safe fields.
    */

    if (
      error &&
      (
        error.message.includes(
          "student_id"
        ) ||
        error.message.includes(
          "institution_id"
        ) ||
        error.message.includes(
          "course_id"
        ) ||
        error.message.includes(
          "enrollment_id"
        )
      )
    ) {

      console.warn(
        "Retrying certificate save with compatible columns..."
      );


      record =
        cleanRecordForFallback(
          record,
          error
        );


      const retry =
        await supabaseClient
          .from("certificates")
          .insert([
            record
          ])
          .select()
          .single();


      data =
        retry.data;

      error =
        retry.error;
    }


    if (error) {

      console.error(
        "Certificate save error:",
        error
      );

      throw error;
    }


    showMessage(
      "Certificate saved successfully. Certificate No: " +
      data.certificate_no
    );


  } catch (error) {

    console.error(
      "Certificate save failed:",
      error
    );


    showMessage(
      "Save failed: " +
      (
        error.message ||
        error
      ),
      "error"
    );
  }
}


/* =========================================================
   HD DOWNLOAD
   ========================================================= */

async function downloadCertificate() {

  try {

    generateCertificate();


    if (
      typeof html2canvas ===
      "undefined"
    ) {

      throw new Error(
        "HD download library is not loaded."
      );
    }


    const certificate =
      $("certificate");


    if (!certificate) {

      throw new Error(
        "Certificate preview element not found."
      );
    }


    showMessage(
      "Preparing HD certificate..."
    );


    const canvas =
      await html2canvas(
        certificate,
        {

          scale: 3,

          useCORS: true,

          allowTaint: false,

          backgroundColor:
            "#ffffff",

          logging: false
        }
      );


    const link =
      document.createElement("a");


    const safeName =
      (
        $("full_name")?.value ||
        "Student"
      )
        .replace(
          /[^a-z0-9]+/gi,
          "-"
        )
        .replace(
          /^-+|-+$/g,
          ""
        );


    link.download =
      `GAAWOW-Certificate-${safeName || "Student"}.png`;


    link.href =
      canvas.toDataURL(
        "image/png",
        1.0
      );


    link.click();


    showMessage(
      "HD certificate downloaded successfully."
    );


  } catch (error) {

    console.error(
      "Download error:",
      error
    );


    showMessage(
      "HD download failed: " +
      (
        error.message ||
        error
      ),
      "error"
    );
  }
}


/* =========================================================
   NEW CERTIFICATE
   ========================================================= */

function newCertificate() {

  selectedStudent = null;
  selectedCourse = null;
  selectedEnrollment = null;


  if ($("student_select")) {

    $("student_select").value =
      "";
  }


  const courseSelect =
    findFirstElement([
      "course_select",
      "course_name_select"
    ]);


  if (courseSelect) {

    courseSelect.value =
      "";
  }


  if ($("full_name")) {

    $("full_name").value =
      "";
  }


  if ($("student_id")) {

    $("student_id").value =
      "";
  }


  if ($("course_name")) {

    $("course_name").value =
      "";
  }


  if ($("issue_date")) {

    $("issue_date").value =
      todayISO();
  }


  if ($("expiry_date")) {

    $("expiry_date").value =
      addYears(
        todayISO(),
        3
      );
  }


  if ($("director_name")) {

    $("director_name").value =
      "GAAWOW Academy";
  }


  if ($("signatory_name")) {

    $("signatory_name").value =
      "Authorized Signatory";
  }


  generateAllIds();

  generateCertificate();


  showMessage(
    "New certificate ready."
  );
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

  /*
    Student
  */

  if ($("student_select")) {

    $("student_select")
      .addEventListener(
        "change",
        handleStudentSelection
      );
  }


  /*
    Course select
  */

  const courseSelect =
    findFirstElement([
      "course_select",
      "course_name_select"
    ]);


  if (courseSelect) {

    courseSelect
      .addEventListener(
        "change",
        handleCourseSelection
      );
  }


  /*
    Manual course input.
    This keeps compatibility with
    the existing certificate.html.
  */

  if ($("course_name")) {

    $("course_name")
      .addEventListener(
        "input",
        generateCertificate
      );
  }


  if ($("director_name")) {

    $("director_name")
      .addEventListener(
        "input",
        generateCertificate
      );
  }


  if ($("signatory_name")) {

    $("signatory_name")
      .addEventListener(
        "input",
        generateCertificate
      );
  }


  if ($("issue_date")) {

    $("issue_date")
      .addEventListener(
        "change",
        generateCertificate
      );
  }


  if ($("expiry_date")) {

    $("expiry_date")
      .addEventListener(
        "change",
        generateCertificate
      );
  }
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    /*
      Default dates
    */

    if ($("issue_date")) {

      $("issue_date").value =
        todayISO();
    }


    if ($("expiry_date")) {

      $("expiry_date").value =
        addYears(
          todayISO(),
          3
        );
    }


    /*
      Automatic IDs
    */

    generateAllIds();


    /*
      Events
    */

    setupEventListeners();


    /*
      Initial certificate
    */

    generateCertificate();


    /*
      Load students
    */

    await loadStudents();


    /*
      Load courses initially.

      If no student is selected yet,
      this loads active courses without
      institution filtering. Once a student
      is selected, loadCourses() runs again
      using that student's institution_id.
    */

    await loadCourses();


    console.log(
      "GAAWOW EMS Certificate Generator V7.3 initialized successfully."
    );
  }
);
