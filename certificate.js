/* =========================================================
   GAAWOW EMS
   Certificate Generator V7.8 FINAL
   DATABASE-SAFE + PUBLISHABLE KEY
   =========================================================

   Design:
   - Existing certificate.html preserved
   - Existing certificate-template.png preserved
   - A4 Landscape
   - Canvas: 1536 × 1024
   - HD Download / Print
   - Signature areas preserved

   Supabase:
   - Profiles
   - Institutions
   - Students
   - Enrollments
   - Courses
   - Certificates

   IMPORTANT:
   - Frontend-safe Publishable Key
   - NEVER use service_role / secret key here
   ========================================================= */


/* =========================================================
   1. SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


/* =========================================================
   2. SUPABASE CLIENT
   ========================================================= */

let supabaseClient = null;

try {
  if (typeof window.supabase !== "undefined") {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );
  } else {
    console.error("Supabase CDN library was not loaded.");
  }
} catch (error) {
  console.error("Supabase initialization error:", error);
}


/* =========================================================
   3. GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let institutions = [];
let students = [];
let enrollments = [];
let courses = [];

let currentCertificate = null;

let certificateBackground = null;


/* =========================================================
   4. DOM HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


function firstExisting(...ids) {
  for (const id of ids) {
    const element = $(id);
    if (element) return element;
  }
  return null;
}


function setValue(ids, value) {
  const element = firstExisting(...ids);

  if (!element) return;

  if ("value" in element) {
    element.value = value ?? "";
  } else {
    element.textContent = value ?? "";
  }
}


function getValue(ids) {
  const element = firstExisting(...ids);

  if (!element) return "";

  return ("value" in element)
    ? String(element.value || "").trim()
    : String(element.textContent || "").trim();
}


function setText(ids, value) {
  const element = firstExisting(...ids);

  if (!element) return;

  element.textContent = value ?? "";
}


/* =========================================================
   5. STATUS / MESSAGE
   ========================================================= */

function showMessage(message, type = "info") {

  const existing =
    firstExisting(
      "message",
      "statusMessage",
      "alert",
      "errorMessage",
      "successMessage"
    );

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

  console.log(`[${type}] ${message}`);
}


function clearMessage() {

  const existing =
    firstExisting(
      "message",
      "statusMessage",
      "alert",
      "errorMessage",
      "successMessage"
    );

  if (existing) {
    existing.textContent = "";
    existing.style.display = "none";
  }
}


/* =========================================================
   6. SAFE ERROR HANDLER
   ========================================================= */

function readableError(error) {

  if (!error) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.message) {
    return error.message;
  }

  if (error.error_description) {
    return error.error_description;
  }

  return JSON.stringify(error);
}


/* =========================================================
   7. AUTH SESSION
   ========================================================= */

async function getCurrentSession() {

  if (!supabaseClient) {
    throw new Error("Supabase client is not initialized.");
  }

  const {
    data,
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    throw error;
  }

  return data?.session || null;
}


/* =========================================================
   8. LOAD CURRENT USER
   ========================================================= */

async function loadCurrentUser() {

  try {

    const session = await getCurrentSession();

    if (!session || !session.user) {

      currentUser = null;

      showMessage(
        "Please login first before using Certificate Generator.",
        "error"
      );

      return null;
    }

    currentUser = session.user;

    return currentUser;

  } catch (error) {

    console.error("Session error:", error);

    showMessage(
      `Authentication error: ${readableError(error)}`,
      "error"
    );

    return null;
  }
}


/* =========================================================
   9. LOAD PROFILE
   ========================================================= */

async function loadCurrentProfile() {

  if (!currentUser) {
    return null;
  }

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {

      showMessage(
        "Profile not found for the logged-in user.",
        "error"
      );

      return null;
    }

    currentProfile = data;

    console.log("Current profile:", currentProfile);

    return currentProfile;

  } catch (error) {

    console.error("Profile error:", error);

    showMessage(
      `Profile error: ${readableError(error)}`,
      "error"
    );

    return null;
  }
}


/* =========================================================
   10. ENSURE INSTITUTION SELECT
   ========================================================= */

function ensureInstitutionSelector() {

  let select =
    firstExisting(
      "institutionSelect",
      "institution",
      "institution_id"
    );

  if (select) {
    return select;
  }

  const studentSelect =
    firstExisting(
      "studentSelect",
      "student",
      "student_id"
    );

  if (!studentSelect) {
    return null;
  }

  const parent =
    studentSelect.parentElement;

  if (!parent) {
    return null;
  }

  const wrapper = document.createElement("div");

  wrapper.className = "form-group";

  wrapper.innerHTML = `
    <label for="institutionSelect">
      Institution
    </label>

    <select id="institutionSelect">
      <option value="">
        Loading institutions...
      </option>
    </select>
  `;

  parent.parentElement.insertBefore(
    wrapper,
    parent
  );

  return $("institutionSelect");
}


/* =========================================================
   11. LOAD INSTITUTIONS
   ========================================================= */

async function loadInstitutions() {

  const select = ensureInstitutionSelector();

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("institutions")
      .select("*")
      .order("name", {
        ascending: true
      });

    if (error) {
      throw error;
    }

    institutions = data || [];

    if (!select) {
      console.warn(
        "Institution selector was not found."
      );
      return institutions;
    }

    select.innerHTML = "";

    const defaultOption =
      document.createElement("option");

    defaultOption.value = "";

    defaultOption.textContent =
      "Select Institution";

    select.appendChild(defaultOption);

    institutions.forEach(institution => {

      const option =
        document.createElement("option");

      option.value = institution.id;

      option.textContent =
        institution.name || institution.id;

      select.appendChild(option);
    });

    /*
      Super admin:
      no automatic institution selection.
      User chooses institution manually.
    */

    if (
      currentProfile &&
      currentProfile.role !== "super_admin" &&
      currentProfile.institution_id
    ) {

      select.value =
        currentProfile.institution_id;

      await loadStudents(
        currentProfile.institution_id
      );
    }

    return institutions;

  } catch (error) {

    console.error(
      "Institution loading error:",
      error
    );

    if (select) {

      select.innerHTML = `
        <option value="">
          Unable to load institutions
        </option>
      `;
    }

    showMessage(
      `Institution loading error: ${readableError(error)}`,
      "error"
    );

    return [];
  }
}


/* =========================================================
   12. LOAD STUDENTS
   ========================================================= */

async function loadStudents(institutionId) {

  const studentSelect =
    firstExisting(
      "studentSelect",
      "student",
      "student_id"
    );

  if (!institutionId) {

    students = [];

    if (studentSelect) {

      studentSelect.innerHTML = `
        <option value="">
          Select institution first
        </option>
      `;
    }

    return [];
  }

  try {

    let query =
      supabaseClient
        .from("students")
        .select("*")
        .order("full_name", {
          ascending: true
        });

    query =
      query.eq(
        "institution_id",
        institutionId
      );

    const {
      data,
      error
    } = await query;

    if (error) {
      throw error;
    }

    students = data || [];

    if (studentSelect) {

      studentSelect.innerHTML = "";

      const defaultOption =
        document.createElement("option");

      defaultOption.value = "";

      defaultOption.textContent =
        students.length
          ? "Select Student"
          : "No students found";

      studentSelect.appendChild(
        defaultOption
      );

      students.forEach(student => {

        const option =
          document.createElement("option");

        option.value = student.id;

        option.textContent =
          `${student.full_name || "Unnamed Student"}`
          +
          (
            student.student_id
              ? ` — ${student.student_id}`
              : ""
          );

        studentSelect.appendChild(
          option
        );
      });
    }

    return students;

  } catch (error) {

    console.error(
      "Student loading error:",
      error
    );

    showMessage(
      `Student loading error: ${readableError(error)}`,
      "error"
    );

    return [];
  }
}


/* =========================================================
   13. LOAD ENROLLMENTS
   ========================================================= */

async function loadEnrollments(studentId) {

  if (!studentId) {

    enrollments = [];

    return [];
  }

  try {

    const {
      data,
      error
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
      throw error;
    }

    enrollments = data || [];

    console.log(
      "Student enrollments:",
      enrollments
    );

    return enrollments;

  } catch (error) {

    console.error(
      "Enrollment loading error:",
      error
    );

    showMessage(
      `Enrollment error: ${readableError(error)}`,
      "error"
    );

    return [];
  }
}


/* =========================================================
   14. LOAD COURSES
   ========================================================= */

async function loadCourses(courseIds = []) {

  if (!courseIds.length) {

    courses = [];

    return [];
  }

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("courses")
      .select("*")
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
      throw error;
    }

    courses = data || [];

    return courses;

  } catch (error) {

    console.error(
      "Course loading error:",
      error
    );

    showMessage(
      `Course loading error: ${readableError(error)}`,
      "error"
    );

    return [];
  }
}


/* =========================================================
   15. COURSE SELECTOR
   ========================================================= */

function populateCourseSelector(
  enrollmentRows
) {

  const courseSelect =
    firstExisting(
      "courseSelect",
      "course",
      "course_id"
    );

  if (!courseSelect) {
    return;
  }

  courseSelect.innerHTML = "";

  const defaultOption =
    document.createElement("option");

  defaultOption.value = "";

  defaultOption.textContent =
    enrollmentRows.length
      ? "Select Course"
      : "No enrolled courses";

  courseSelect.appendChild(
    defaultOption
  );

  enrollmentRows.forEach(row => {

    const course =
      courses.find(
        c => c.id === row.course_id
      );

    if (!course) {
      return;
    }

    const option =
      document.createElement("option");

    option.value = course.id;

    option.textContent =
      `${course.name || "Unnamed Course"}`
      +
      (
        course.code
          ? ` — ${course.code}`
          : ""
      );

    courseSelect.appendChild(
      option
    );
  });
}


/* =========================================================
   16. LOAD STUDENT ENROLLMENTS + COURSES
   ========================================================= */

async function handleStudentChange() {

  const studentId =
    getValue([
      "studentSelect",
      "student",
      "student_id"
    ]);

  if (!studentId) {
    return;
  }

  clearMessage();

  const rows =
    await loadEnrollments(
      studentId
    );

  if (!rows.length) {

    const courseSelect =
      firstExisting(
        "courseSelect",
        "course",
        "course_id"
      );

    if (courseSelect) {

      courseSelect.innerHTML = `
        <option value="">
          No enrollment found
        </option>
      `;
    }

    showMessage(
      "This student has no enrollment record.",
      "error"
    );

    return;
  }

  const courseIds =
    [
      ...new Set(
        rows
          .map(row => row.course_id)
          .filter(Boolean)
      )
    ];

  await loadCourses(
    courseIds
  );

  populateCourseSelector(
    rows
  );
}


/* =========================================================
   17. SELECTED STUDENT
   ========================================================= */

function getSelectedStudent() {

  const studentId =
    getValue([
      "studentSelect",
      "student",
      "student_id"
    ]);

  if (!studentId) {
    return null;
  }

  return (
    students.find(
      student =>
        student.id === studentId
    ) || null
  );
}


/* =========================================================
   18. SELECTED COURSE
   ========================================================= */

function getSelectedCourse() {

  const courseId =
    getValue([
      "courseSelect",
      "course",
      "course_id"
    ]);

  if (!courseId) {
    return null;
  }

  return (
    courses.find(
      course =>
        course.id === courseId
    ) || null
  );
}


/* =========================================================
   19. SELECTED ENROLLMENT
   ========================================================= */

function getSelectedEnrollment() {

  const student =
    getSelectedStudent();

  const course =
    getSelectedCourse();

  if (!student || !course) {
    return null;
  }

  return (
    enrollments.find(
      enrollment =>
        enrollment.student_id === student.id &&
        enrollment.course_id === course.id
    ) || null
  );
}


/* =========================================================
   20. AUTO-FILL STUDENT DATA
   ========================================================= */

function fillStudentData() {

  const student =
    getSelectedStudent();

  if (!student) {
    return;
  }

  setValue(
    [
      "studentFullName",
      "fullName",
      "studentName",
      "student_name"
    ],
    student.full_name
  );

  setValue(
    [
      "studentId",
      "studentID",
      "student_id"
    ],
    student.student_id
  );

  const institutionSelect =
    firstExisting(
      "institutionSelect",
      "institution",
      "institution_id"
    );

  if (
    institutionSelect &&
    student.institution_id
  ) {

    institutionSelect.value =
      student.institution_id;
  }
}


/* =========================================================
   21. AUTO-FILL COURSE / DATES
   ========================================================= */

function fillEnrollmentData() {

  const enrollment =
    getSelectedEnrollment();

  if (!enrollment) {
    return;
  }

  setValue(
    [
      "dateStarted",
      "startDate",
      "start_date",
      "date_started"
    ],
    enrollment.start_date || ""
  );

  setValue(
    [
      "dateCompleted",
      "completedDate",
      "completionDate",
      "endDate",
      "end_date",
      "date_completed"
    ],
    enrollment.end_date || ""
  );
}


/* =========================================================
   22. DATE FORMAT
   ========================================================= */

function formatDate(
  dateValue
) {

  if (!dateValue) {
    return "";
  }

  const date =
    new Date(
      `${dateValue}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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


/* =========================================================
   23. CERTIFICATE NUMBER
   ========================================================= */

function generateCertificateNumber() {

  const year =
    new Date().getFullYear();

  const random =
    Math.floor(
      100000 +
      Math.random() * 900000
    );

  return `CERT-${year}-${random}`;
}


/* =========================================================
   24. CERTIFICATE ID
   ========================================================= */

function generateCertificateId() {

  const year =
    new Date().getFullYear();

  const random =
    Math.floor(
      10000 +
      Math.random() * 90000
    );

  return `GA-CERT-${year}-${random}`;
}


/* =========================================================
   25. VERIFY CODE
   ========================================================= */

function generateVerifyCode() {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (
    let i = 0;
    i < 10;
    i++
  ) {

    code +=
      chars[
        Math.floor(
          Math.random() *
          chars.length
        )
      ];
  }

  return `GAW-${code}`;
}


/* =========================================================
   26. HASH CODE
   ========================================================= */

async function createHashCode(
  text
) {

  try {

    const encoder =
      new TextEncoder();

    const data =
      encoder.encode(text);

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

  } catch (error) {

    console.warn(
      "Hash generation failed:",
      error
    );

    return "";
  }
}


/* =========================================================
   27. CERTIFICATE FORM DATA
   ========================================================= */

function getCertificateFormData() {

  const student =
    getSelectedStudent();

  const course =
    getSelectedCourse();

  const enrollment =
    getSelectedEnrollment();

  const institutionId =
    getValue([
      "institutionSelect",
      "institution",
      "institution_id"
    ]);

  const institution =
    institutions.find(
      item =>
        item.id === institutionId
    );

  const fullName =
    getValue([
      "studentFullName",
      "fullName",
      "studentName",
      "student_name"
    ]) ||
    student?.full_name ||
    "";

  const studentId =
    getValue([
      "studentId",
      "studentID",
      "student_id"
    ]) ||
    student?.student_id ||
    "";

  const courseName =
    course?.name ||
    getValue([
      "courseName",
      "course_name"
    ]);

  const dateStarted =
    getValue([
      "dateStarted",
      "startDate",
      "start_date",
      "date_started"
    ]) ||
    enrollment?.start_date ||
    "";

  const dateCompleted =
    getValue([
      "dateCompleted",
      "completedDate",
      "completionDate",
      "endDate",
      "end_date",
      "date_completed"
    ]) ||
    enrollment?.end_date ||
    "";

  const certificateNo =
    getValue([
      "certificateNo",
      "certificateNumber",
      "certificate_no"
    ]) ||
    generateCertificateNumber();

  const certificateId =
    getValue([
      "certificateId",
      "certificate_id"
    ]) ||
    generateCertificateId();

  const verifyCode =
    getValue([
      "verifyCode",
      "verify_code"
    ]) ||
    generateVerifyCode();

  const issueDate =
    getValue([
      "issueDate",
      "issue_date"
    ]) ||
    new Date()
      .toISOString()
      .split("T")[0];

  const status =
    getValue([
      "certificateStatus",
      "status"
    ]) ||
    "valid";

  const director =
    getValue([
      "directorName",
      "director",
      "director_name"
    ]);

  const academicHead =
    getValue([
      "academicHead",
      "academicHeadName",
      "academic_head"
    ]);

  return {

    institution_id:
      institutionId ||
      student?.institution_id ||
      null,

    institution_name:
      institution?.name ||
      "",

    student_id:
      student?.id ||
      null,

    student_number:
      studentId,

    student_name:
      fullName,

    course_id:
      course?.id ||
      null,

    course_name:
      courseName,

    enrollment_id:
      enrollment?.id ||
      null,

    enrollment_number:
      enrollment?.enrollment_number ||
      "",

    start_date:
      dateStarted ||
      null,

    end_date:
      dateCompleted ||
      null,

    certificate_no:
      certificateNo,

    certificate_id:
      certificateId,

    verify_code:
      verifyCode,

    issue_date:
      issueDate,

    status:
      status,

    director_name:
      director,

    academic_head:
      academicHead
  };
}


/* =========================================================
   28. LOAD TEMPLATE
   ========================================================= */

function loadCertificateTemplate() {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const image =
        new Image();

      image.crossOrigin =
        "anonymous";

      image.onload = () => {

        certificateBackground =
          image;

        resolve(image);
      };

      image.onerror =
        () => {

          reject(
            new Error(
              "certificate-template.png could not be loaded."
            )
          );
        };

      image.src =
        "./certificate-template.png";
    }
  );
}


/* =========================================================
   29. CANVAS
   ========================================================= */

function getCertificateCanvas() {

  return firstExisting(
    "certificateCanvas",
    "canvas"
  );
}


/* =========================================================
   30. DRAW TEMPLATE
   ========================================================= */

async function prepareCanvas() {

  const canvas =
    getCertificateCanvas();

  if (!canvas) {

    throw new Error(
      "certificateCanvas was not found in certificate.html."
    );
  }

  canvas.width =
    1536;

  canvas.height =
    1024;

  const ctx =
    canvas.getContext("2d");

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  if (!certificateBackground) {

    await loadCertificateTemplate();
  }

  ctx.drawImage(
    certificateBackground,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return {
    canvas,
    ctx
  };
}


/* =========================================================
   31. TEXT DRAW HELPER
   ========================================================= */

function drawCenteredText(
  ctx,
  text,
  x,
  y,
  font,
  fillStyle = "#111827"
) {

  ctx.save();

  ctx.font =
    font;

  ctx.fillStyle =
    fillStyle;

  ctx.textAlign =
    "center";

  ctx.textBaseline =
    "middle";

  ctx.fillText(
    text || "",
    x,
    y
  );

  ctx.restore();
}


/* =========================================================
   32. DRAW CERTIFICATE
   ========================================================= */

async function drawCertificate(
  certificateData
) {

  const {
    canvas,
    ctx
  } = await prepareCanvas();

  /*
    IMPORTANT:
    Existing background/template remains untouched.

    Text positions are intentionally conservative.
    If the existing certificate.html already contains
    its own preview renderer, this canvas remains the
    HD export surface.
  */

  const centerX =
    canvas.width / 2;

  /*
    Student name
  */

  drawCenteredText(
    ctx,
    certificateData.student_name,
    centerX,
    455,
    "bold 54px Georgia",
    "#0B1E63"
  );

  /*
    Course
  */

  drawCenteredText(
    ctx,
    certificateData.course_name,
    centerX,
    535,
    "bold 34px Georgia",
    "#0B4DA2"
  );

  /*
    Certificate number
  */

  drawCenteredText(
    ctx,
    certificateData.certificate_no,
    centerX,
    875,
    "bold 20px Arial",
    "#1F2937"
  );

  /*
    Issue date
  */

  drawCenteredText(
    ctx,
    formatDate(
      certificateData.issue_date
    ),
    centerX,
    910,
    "18px Arial",
    "#1F2937"
  );

  return canvas;
}


/* =========================================================
   33. PREVIEW
   ========================================================= */

async function previewCertificate() {

  try {

    clearMessage();

    const data =
      getCertificateFormData();

    if (!data.student_name) {

      showMessage(
        "Please select a student first.",
        "error"
      );

      return;
    }

    if (!data.course_name) {

      showMessage(
        "Please select a course first.",
        "error"
      );

      return;
    }

    currentCertificate =
      data;

    await drawCertificate(
      data
    );

    showMessage(
      "Certificate preview generated successfully.",
      "success"
    );

  } catch (error) {

    console.error(
      "Preview error:",
      error
    );

    showMessage(
      `Preview error: ${readableError(error)}`,
      "error"
    );
  }
}


/* =========================================================
   34. SAVE CERTIFICATE
   ========================================================= */

async function saveCertificate() {

  try {

    clearMessage();

    const data =
      getCertificateFormData();

    if (!data.student_name) {

      showMessage(
        "Please select a student.",
        "error"
      );

      return;
    }

    if (!data.course_id) {

      showMessage(
        "Please select a course.",
        "error"
      );

      return;
    }

    if (!data.institution_id) {

      showMessage(
        "Please select an institution.",
        "error"
      );

      return;
    }

    /*
      Prevent accidental duplicate generation
      when the same certificate number is already
      stored.
    */

    const existing =
      await supabaseClient
        .from("certificates")
        .select("id")
        .eq(
          "certificate_no",
          data.certificate_no
        )
        .maybeSingle();

    if (existing.error) {

      throw existing.error;
    }

    if (existing.data) {

      showMessage(
        "This certificate number already exists.",
        "error"
      );

      return;
    }

    /*
      Generate hash.
    */

    const hashSource =
      [
        data.certificate_no,
        data.certificate_id,
        data.verify_code,
        data.student_name,
        data.course_name,
        data.issue_date
      ].join("|");

    data.hash_code =
      await createHashCode(
        hashSource
      );

    /*
      Build database payload.

      Existing schema may contain additional
      columns. We only send fields known to
      the certificate system.
    */

    const payload = {

      institution_id:
        data.institution_id,

      student_id:
        data.student_id,

      course_id:
        data.course_id,

      certificate_no:
        data.certificate_no,

      certificate_id:
        data.certificate_id,

      verify_code:
        data.verify_code,

      hash_code:
        data.hash_code,

      issue_date:
        data.issue_date,

      expiry_date:
        null,

      status:
        data.status || "valid",

      student_name:
        data.student_name,

      course_name:
        data.course_name,

      enrollment_id:
        data.enrollment_id || null
    };


    const {
      data: saved,
      error
    } = await supabaseClient
      .from("certificates")
      .insert(
        payload
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    currentCertificate =
      {
        ...data,
        ...saved
      };

    /*
      Put generated values back into UI.
    */

    setValue(
      [
        "certificateNo",
        "certificateNumber",
        "certificate_no"
      ],
      data.certificate_no
    );

    setValue(
      [
        "certificateId",
        "certificate_id"
      ],
      data.certificate_id
    );

    setValue(
      [
        "verifyCode",
        "verify_code"
      ],
      data.verify_code
    );

    showMessage(
      "Certificate saved successfully to Supabase.",
      "success"
    );

    return saved;

  } catch (error) {

    console.error(
      "Certificate save error:",
      error
    );

    showMessage(
      `Save error: ${readableError(error)}`,
      "error"
    );

    return null;
  }
}


/* =========================================================
   35. GENERATE
   ========================================================= */

async function generateCertificate() {

  try {

    clearMessage();

    const data =
      getCertificateFormData();

    if (!data.student_name) {

      showMessage(
        "Please select a student.",
        "error"
      );

      return;
    }

    if (!data.course_name) {

      showMessage(
        "Please select a course.",
        "error"
      );

      return;
    }

    currentCertificate =
      data;

    await drawCertificate(
      data
    );

    /*
      Fill generated values.
    */

    setValue(
      [
        "certificateNo",
        "certificateNumber",
        "certificate_no"
      ],
      data.certificate_no
    );

    setValue(
      [
        "certificateId",
        "certificate_id"
      ],
      data.certificate_id
    );

    setValue(
      [
        "verifyCode",
        "verify_code"
      ],
      data.verify_code
    );

    showMessage(
      "Certificate generated successfully.",
      "success"
    );

  } catch (error) {

    console.error(
      "Generate error:",
      error
    );

    showMessage(
      `Generate error: ${readableError(error)}`,
      "error"
    );
  }
}


/* =========================================================
   36. HD DOWNLOAD
   ========================================================= */

async function downloadHD() {

  try {

    if (!currentCertificate) {

      currentCertificate =
        getCertificateFormData();
    }

    const canvas =
      await drawCertificate(
        currentCertificate
      );

    const link =
      document.createElement("a");

    const safeName =
      (
        currentCertificate.student_name ||
        "Student"
      )
        .replace(
          /[^a-z0-9_\-]+/gi,
          "_"
        );

    link.download =
      `GAAWOW-Certificate-${safeName}.png`;

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
      "HD certificate downloaded successfully.",
      "success"
    );

  } catch (error) {

    console.error(
      "HD download error:",
      error
    );

    showMessage(
      `HD download error: ${readableError(error)}`,
      "error"
    );
  }
}


/* =========================================================
   37. PRINT
   ========================================================= */

async function printCertificate() {

  try {

    if (!currentCertificate) {

      currentCertificate =
        getCertificateFormData();
    }

    const canvas =
      await drawCertificate(
        currentCertificate
      );

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

          img {
            width: 297mm;
            height: 198mm;
            object-fit: contain;
            display: block;
            margin: 0 auto;
          }

        </style>
      </head>

      <body>

        <img
          src="${image}"
          alt="GAAWOW Academy Certificate"
        />

        <script>

          window.onload = function () {

            setTimeout(
              function () {

                window.print();

              },
              500
            );

          };

        <\/script>

      </body>
      </html>
    `);

    printWindow.document.close();

    showMessage(
      "Print window opened successfully.",
      "success"
    );

  } catch (error) {

    console.error(
      "Print error:",
      error
    );

    showMessage(
      `Print error: ${readableError(error)}`,
      "error"
    );
  }
}


/* =========================================================
   38. NEW CERTIFICATE
   ========================================================= */

function newCertificate() {

  currentCertificate =
    null;

  const fields = [

    "certificateNo",
    "certificateNumber",
    "certificate_no",

    "certificateId",
    "certificate_id",

    "verifyCode",
    "verify_code",

    "dateStarted",
    "startDate",
    "start_date",
    "date_started",

    "dateCompleted",
    "completedDate",
    "completionDate",
    "endDate",
    "end_date",
    "date_completed"
  ];

  fields.forEach(
    id => {

      const element =
        $(id);

      if (element) {
        element.value = "";
      }
    }
  );

  const studentSelect =
    firstExisting(
      "studentSelect",
      "student",
      "student_id"
    );

  if (studentSelect) {
    studentSelect.value = "";
  }

  const courseSelect =
    firstExisting(
      "courseSelect",
      "course",
      "course_id"
    );

  if (courseSelect) {

    courseSelect.innerHTML = `
      <option value="">
        Select Course
      </option>
    `;
  }

  clearMessage();

  const canvas =
    getCertificateCanvas();

  if (canvas) {

    const ctx =
      canvas.getContext("2d");

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }
}


/* =========================================================
   39. EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

  const institutionSelect =
    firstExisting(
      "institutionSelect",
      "institution",
      "institution_id"
    );

  if (institutionSelect) {

    institutionSelect.addEventListener(
      "change",
      async function () {

        await loadStudents(
          this.value
        );
      }
    );
  }


  const studentSelect =
    firstExisting(
      "studentSelect",
      "student",
      "student_id"
    );

  if (studentSelect) {

    studentSelect.addEventListener(
      "change",
      async function () {

        fillStudentData();

        await handleStudentChange();
      }
    );
  }


  const courseSelect =
    firstExisting(
      "courseSelect",
      "course",
      "course_id"
    );

  if (courseSelect) {

    courseSelect.addEventListener(
      "change",
      function () {

        fillEnrollmentData();
      }
    );
  }


  /*
    Buttons
  */

  const generateButton =
    firstExisting(
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


  const previewButton =
    firstExisting(
      "previewBtn",
      "previewCertificateBtn",
      "btnPreview"
    );

  if (previewButton) {

    previewButton.addEventListener(
      "click",
      previewCertificate
    );
  }


  const saveButton =
    firstExisting(
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


  const hdButton =
    firstExisting(
      "downloadBtn",
      "downloadHD",
      "hdDownloadBtn",
      "btnHD"
    );

  if (hdButton) {

    hdButton.addEventListener(
      "click",
      downloadHD
    );
  }


  const printButton =
    firstExisting(
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


  const newButton =
    firstExisting(
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
   40. INITIALIZATION
   ========================================================= */

async function initializeCertificateGenerator() {

  console.log(
    "=============================================="
  );

  console.log(
    "GAAWOW EMS Certificate Generator V7.8 FINAL"
  );

  console.log(
    "=============================================="
  );

  clearMessage();

  if (!supabaseClient) {

    showMessage(
      "Supabase client failed to initialize.",
      "error"
    );

    return;
  }

  try {

    /*
      1. Session
    */

    const user =
      await loadCurrentUser();

    if (!user) {
      return;
    }


    /*
      2. Profile
    */

    const profile =
      await loadCurrentProfile();

    if (!profile) {
      return;
    }


    /*
      3. Institutions
    */

    await loadInstitutions();


    /*
      4. Template preload
    */

    try {

      await loadCertificateTemplate();

      console.log(
        "Certificate template loaded."
      );

    } catch (templateError) {

      console.error(
        "Template error:",
        templateError
      );

      showMessage(
        `Template error: ${readableError(templateError)}`,
        "error"
      );
    }


    /*
      5. Events
    */

    setupEventListeners();


    /*
      6. Final status
    */

    console.log(
      "Certificate Generator initialized successfully."
    );

  } catch (error) {

    console.error(
      "Certificate Generator initialization error:",
      error
    );

    showMessage(
      `Initialization error: ${readableError(error)}`,
      "error"
    );
  }
}


/* =========================================================
   41. AUTH STATE
   ========================================================= */

if (supabaseClient) {

  supabaseClient.auth.onAuthStateChange(
    async (
      event,
      session
    ) => {

      console.log(
        "Auth event:",
        event
      );

      if (
        event === "SIGNED_OUT"
      ) {

        currentUser = null;

        currentProfile = null;

        showMessage(
          "You have been signed out.",
          "error"
        );

        return;
      }

      if (
        event === "SIGNED_IN" &&
        session?.user
      ) {

        currentUser =
          session.user;

        await loadCurrentProfile();

        await loadInstitutions();
      }
    }
  );
}


/* =========================================================
   42. GLOBAL FUNCTIONS
   ========================================================= */

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

window.loadInstitutions =
  loadInstitutions;

window.loadStudents =
  loadStudents;


/* =========================================================
   43. START
   ========================================================= */

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
