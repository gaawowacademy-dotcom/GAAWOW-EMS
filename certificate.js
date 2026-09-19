/* =========================================================
   GAAWOW EMS
   Certificate Generator V8 FINAL

   DATABASE-SAFE
   PUBLISHABLE KEY
   ORIGINAL TEMPLATE PRESERVED

   Canvas:
   1536 × 1024
   A4 Landscape

   Database:
   profiles
   institutions
   students
   enrollments
   courses
   certificates

   IMPORTANT:
   Frontend-safe publishable key only.
   NEVER use service_role / secret key.
   ========================================================= */


/* =========================================================
   1. SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


/* =========================================================
   2. GLOBAL STATE
   ========================================================= */

let supabaseClient = null;

let currentUser = null;
let currentProfile = null;

let institutions = [];
let students = [];
let enrollments = [];
let courses = [];

let currentCertificate = null;

let certificateBackground = null;


/* =========================================================
   3. DOM HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


function firstExisting(...ids) {

  for (const id of ids) {

    const element = $(id);

    if (element) {
      return element;
    }
  }

  return null;
}


function setValue(ids, value) {

  const element =
    firstExisting(...ids);

  if (!element) {
    return;
  }

  if ("value" in element) {

    element.value =
      value ?? "";

  } else {

    element.textContent =
      value ?? "";
  }
}


function getValue(ids) {

  const element =
    firstExisting(...ids);

  if (!element) {
    return "";
  }

  if ("value" in element) {

    return String(
      element.value || ""
    ).trim();

  }

  return String(
    element.textContent || ""
  ).trim();
}


function setText(ids, value) {

  const element =
    firstExisting(...ids);

  if (!element) {
    return;
  }

  element.textContent =
    value ?? "";
}


/* =========================================================
   4. MESSAGE SYSTEM
   ========================================================= */

function showMessage(
  message,
  type = "info"
) {

  const element =
    $("message");

  if (!element) {

    console.log(
      `[${type}] ${message}`
    );

    return;
  }

  element.textContent =
    message;

  element.style.display =
    "block";

  element.className =
    `message ${type}`;

}


function clearMessage() {

  const element =
    $("message");

  if (!element) {
    return;
  }

  element.textContent =
    "";

  element.style.display =
    "none";

  element.className =
    "message";
}


/* =========================================================
   5. ERROR HANDLER
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

  try {

    return JSON.stringify(
      error
    );

  } catch {

    return "Unknown error";
  }
}


/* =========================================================
   6. SUPABASE INITIALIZATION
   ========================================================= */

function initializeSupabase() {

  try {

    if (
      !window.supabase ||
      typeof window.supabase.createClient !==
        "function"
    ) {

      console.error(
        "Supabase CDN library was not loaded."
      );

      return false;
    }

    supabaseClient =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

    return true;

  } catch (error) {

    console.error(
      "Supabase initialization error:",
      error
    );

    return false;
  }
}


/* =========================================================
   7. AUTH SESSION
   ========================================================= */

async function getCurrentSession() {

  if (!supabaseClient) {

    throw new Error(
      "Supabase client is not initialized."
    );
  }

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();

  if (error) {
    throw error;
  }

  return data?.session || null;
}


/* =========================================================
   8. LOAD CURRENT USER
   ========================================================= */

async function loadCurrentUser() {

  const session =
    await getCurrentSession();

  if (
    !session ||
    !session.user
  ) {

    currentUser =
      null;

    showMessage(
      "Please login first before using Certificate Generator.",
      "error"
    );

    return null;
  }

  currentUser =
    session.user;

  return currentUser;
}


/* =========================================================
   9. LOAD PROFILE
   ========================================================= */

async function loadCurrentProfile() {

  if (!currentUser) {
    return null;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq(
        "id",
        currentUser.id
      )
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

  currentProfile =
    data;

  console.log(
    "Current profile:",
    currentProfile
  );

  return currentProfile;
}


/* =========================================================
   10. INSTITUTION SELECTOR
   ========================================================= */

function getInstitutionSelect() {

  return firstExisting(
    "institutionSelect",
    "institution_select",
    "institution",
    "institution_id"
  );
}


/* =========================================================
   11. STUDENT SELECTOR
   ========================================================= */

function getStudentSelect() {

  return firstExisting(
    "student_select",
    "studentSelect",
    "student",
    "student_id"
  );
}


/* =========================================================
   12. COURSE SELECTOR
   ========================================================= */

function getCourseSelect() {

  return firstExisting(
    "course_select",
    "courseSelect",
    "course",
    "course_id"
  );
}


/* =========================================================
   13. ENSURE INSTITUTION SELECTOR
   ========================================================= */

function ensureInstitutionSelector() {

  let select =
    getInstitutionSelect();

  if (select) {
    return select;
  }

  const studentSelect =
    getStudentSelect();

  if (!studentSelect) {

    console.warn(
      "Student selector not found."
    );

    return null;
  }

  const field =
    studentSelect.closest(
      ".field"
    );

  if (!field) {
    return null;
  }

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "field";

  wrapper.innerHTML = `
    <label for="institutionSelect">
      Select Institution
    </label>

    <select id="institutionSelect">
      <option value="">
        Loading institutions...
      </option>
    </select>
  `;

  field.parentElement.insertBefore(
    wrapper,
    field
  );

  return $(
    "institutionSelect"
  );
}


/* =========================================================
   14. LOAD INSTITUTIONS
   ========================================================= */

async function loadInstitutions() {

  const select =
    ensureInstitutionSelector();

  if (!select) {

    throw new Error(
      "Institution selector not found."
    );
  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("institutions")
        .select("*")
        .order(
          "name",
          {
            ascending:true
          }
        );

    if (error) {
      throw error;
    }

    institutions =
      data || [];

    select.innerHTML = "";

    const defaultOption =
      document.createElement(
        "option"
      );

    defaultOption.value =
      "";

    defaultOption.textContent =
      "Select Institution";

    select.appendChild(
      defaultOption
    );


    institutions.forEach(
      institution => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          institution.id;

        option.textContent =
          institution.name ||
          institution.code ||
          institution.id;

        select.appendChild(
          option
        );

      }
    );


    /*
      Non-super-admin:
      automatically use own institution.
    */

    if (
      currentProfile &&
      currentProfile.role !==
        "super_admin" &&
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

    select.innerHTML = `
      <option value="">
        Unable to load institutions
      </option>
    `;

    throw error;
  }
}


/* =========================================================
   15. LOAD STUDENTS
   ========================================================= */

async function loadStudents(
  institutionId
) {

  const studentSelect =
    getStudentSelect();

  if (!institutionId) {

    students =
      [];

    if (studentSelect) {

      studentSelect.innerHTML = `
        <option value="">
          Select institution first
        </option>
      `;
    }

    resetCourseSelector();

    return [];
  }


  try {

    if (studentSelect) {

      studentSelect.innerHTML = `
        <option value="">
          Loading students...
        </option>
      `;
    }


    const {
      data,
      error
    } =
      await supabaseClient
        .from("students")
        .select("*")
        .eq(
          "institution_id",
          institutionId
        )
        .order(
          "full_name",
          {
            ascending:true
          }
        );


    if (error) {
      throw error;
    }


    students =
      data || [];


    if (studentSelect) {

      studentSelect.innerHTML =
        "";

      const defaultOption =
        document.createElement(
          "option"
        );

      defaultOption.value =
        "";

      defaultOption.textContent =
        students.length
          ? "Select Student"
          : "No students found";

      studentSelect.appendChild(
        defaultOption
      );


      students.forEach(
        student => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            student.id;

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

        }
      );
    }


    return students;

  } catch (error) {

    console.error(
      "Student loading error:",
      error
    );

    if (studentSelect) {

      studentSelect.innerHTML = `
        <option value="">
          Unable to load students
        </option>
      `;
    }

    showMessage(
      `Student loading error: ${readableError(error)}`,
      "error"
    );

    return [];
  }
}


/* =========================================================
   16. LOAD ENROLLMENTS
   ========================================================= */

async function loadEnrollments(
  studentId
) {

  if (!studentId) {

    enrollments =
      [];

    return [];
  }


  try {

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
            ascending:false
          }
        );


    if (error) {
      throw error;
    }


    enrollments =
      data || [];


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
   17. LOAD COURSES
   ========================================================= */

async function loadCourses(
  courseIds = []
) {

  if (!courseIds.length) {

    courses =
      [];

    return [];
  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("courses")
        .select("*")
        .in(
          "id",
          courseIds
        )
        .order(
          "name",
          {
            ascending:true
          }
        );


    if (error) {
      throw error;
    }


    courses =
      data || [];


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
   18. RESET COURSE SELECTOR
   ========================================================= */

function resetCourseSelector(
  message = "Select student first"
) {

  const select =
    getCourseSelect();

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      ${message}
    </option>
  `;
}


/* =========================================================
   19. POPULATE COURSE SELECTOR
   ========================================================= */

function populateCourseSelector(
  enrollmentRows
) {

  const courseSelect =
    getCourseSelect();

  if (!courseSelect) {
    return;
  }


  courseSelect.innerHTML =
    "";


  const defaultOption =
    document.createElement(
      "option"
    );

  defaultOption.value =
    "";

  defaultOption.textContent =
    enrollmentRows.length
      ? "Select Course"
      : "No enrolled courses";

  courseSelect.appendChild(
    defaultOption
  );


  enrollmentRows.forEach(
    enrollment => {

      const course =
        courses.find(
          item =>
            item.id ===
            enrollment.course_id
        );


      if (!course) {
        return;
      }


      /*
        Avoid duplicate course options
        if the student has multiple
        enrollment records for same course.
      */

      const alreadyAdded =
        Array.from(
          courseSelect.options
        ).some(
          option =>
            option.value ===
            course.id
        );


      if (alreadyAdded) {
        return;
      }


      const option =
        document.createElement(
          "option"
        );

      option.value =
        course.id;

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

    }
  );
}


/* =========================================================
   20. HANDLE STUDENT CHANGE
   ========================================================= */

async function handleStudentChange() {

  const studentId =
    getValue([
      "student_select",
      "studentSelect",
      "student",
      "student_id"
    ]);


  if (!studentId) {

    resetCourseSelector();

    return;
  }


  clearMessage();


  const rows =
    await loadEnrollments(
      studentId
    );


  if (!rows.length) {

    resetCourseSelector(
      "No enrollment found"
    );

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
          .map(
            row =>
              row.course_id
          )
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
   21. GET SELECTED STUDENT
   ========================================================= */

function getSelectedStudent() {

  const studentId =
    getValue([
      "student_select",
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
        String(student.id) ===
        String(studentId)
    ) || null
  );
}


/* =========================================================
   22. GET SELECTED COURSE
   ========================================================= */

function getSelectedCourse() {

  const courseId =
    getValue([
      "course_select",
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
        String(course.id) ===
        String(courseId)
    ) || null
  );
}


/* =========================================================
   23. GET SELECTED ENROLLMENT
   ========================================================= */

function getSelectedEnrollment() {

  const student =
    getSelectedStudent();

  const course =
    getSelectedCourse();


  if (
    !student ||
    !course
  ) {
    return null;
  }


  /*
    Use most recent matching enrollment.
  */

  const matches =
    enrollments.filter(
      enrollment =>
        String(enrollment.student_id) ===
          String(student.id) &&
        String(enrollment.course_id) ===
          String(course.id)
    );


  if (!matches.length) {
    return null;
  }


  return matches[0];
}


/* =========================================================
   24. FILL STUDENT DATA
   ========================================================= */

function fillStudentData() {

  const student =
    getSelectedStudent();


  if (!student) {

    setValue(
      [
        "full_name",
        "studentFullName",
        "fullName",
        "studentName",
        "student_name"
      ],
      ""
    );

    setValue(
      [
        "student_id",
        "studentId",
        "studentID"
      ],
      ""
    );

    return;
  }


  setValue(
    [
      "full_name",
      "studentFullName",
      "fullName",
      "studentName",
      "student_name"
    ],
    student.full_name
  );


  setValue(
    [
      "student_id",
      "studentId",
      "studentID"
    ],
    student.student_id
  );


  /*
    Student photo.
    If photo_url exists, show it.
    The certificate template itself is not changed.
  */

  const photo =
    $("student_photo");


  if (
    photo &&
    student.photo_url
  ) {

    photo.src =
      student.photo_url;

    photo.style.display =
      "block";

  } else if (photo) {

    photo.removeAttribute(
      "src"
    );

    photo.style.display =
      "none";
  }


  /*
    Keep institution synchronized.
  */

  const institutionSelect =
    getInstitutionSelect();


  if (
    institutionSelect &&
    student.institution_id
  ) {

    institutionSelect.value =
      student.institution_id;
  }
}


/* =========================================================
   25. FILL ENROLLMENT DATA
   ========================================================= */

function fillEnrollmentData() {

  const enrollment =
    getSelectedEnrollment();


  if (!enrollment) {

    setValue(
      [
        "date_started",
        "dateStarted",
        "startDate",
        "start_date",
        "date_started"
      ],
      ""
    );


    setValue(
      [
        "date_completed",
        "dateCompleted",
        "completedDate",
        "completionDate",
        "endDate",
        "end_date",
        "date_completed"
      ],
      ""
    );


    return;
  }


  /*
    IMPORTANT:
    Correct database fields:
    start_date
    end_date
  */

  setValue(
    [
      "date_started",
      "dateStarted",
      "startDate",
      "start_date"
    ],
    enrollment.start_date || ""
  );


  setValue(
    [
      "date_completed",
      "dateCompleted",
      "completedDate",
      "completionDate",
      "endDate",
      "end_date"
    ],
    enrollment.end_date || ""
  );
}


/* =========================================================
   26. DATE FORMAT
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
      day:"2-digit",
      month:"long",
      year:"numeric"
    }
  );
}


/* =========================================================
   27. CERTIFICATE NUMBER
   ========================================================= */

function generateCertificateNumber() {

  const year =
    new Date()
      .getFullYear();


  const random =
    Math.floor(
      100000 +
      Math.random() * 900000
    );


  return `CERT-${year}-${random}`;
}


/* =========================================================
   28. CERTIFICATE ID
   ========================================================= */

function generateCertificateId() {

  const year =
    new Date()
      .getFullYear();


  const random =
    Math.floor(
      10000 +
      Math.random() * 90000
    );


  return `GA-CERT-${year}-${random}`;
}


/* =========================================================
   29. VERIFY CODE
   ========================================================= */

function generateVerifyCode() {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


  let code =
    "";


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
   30. HASH CODE
   ========================================================= */

async function createHashCode(
  text
) {

  try {

    const encoder =
      new TextEncoder();


    const data =
      encoder.encode(
        text
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
            .padStart(
              2,
              "0"
            )
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
   31. GET CERTIFICATE FORM DATA
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
      "institution_select",
      "institution",
      "institution_id"
    ]);


  const institution =
    institutions.find(
      item =>
        String(item.id) ===
        String(institutionId)
    );


  const fullName =
    getValue([
      "full_name",
      "studentFullName",
      "fullName",
      "studentName",
      "student_name"
    ]) ||
    student?.full_name ||
    "";


  const studentNumber =
    getValue([
      "student_id",
      "studentId",
      "studentID"
    ]) ||
    student?.student_id ||
    "";


  const courseName =
    course?.name ||
    getValue([
      "courseName",
      "course_name"
    ]) ||
    "";


  const dateStarted =
    getValue([
      "date_started",
      "dateStarted",
      "startDate",
      "start_date"
    ]) ||
    enrollment?.start_date ||
    "";


  const dateCompleted =
    getValue([
      "date_completed",
      "dateCompleted",
      "completedDate",
      "completionDate",
      "endDate",
      "end_date"
    ]) ||
    enrollment?.end_date ||
    "";


  const certificateNo =
    getValue([
      "certificate_no",
      "certificateNo",
      "certificateNumber"
    ]) ||
    generateCertificateNumber();


  const certificateId =
    getValue([
      "certificate_id",
      "certificateId"
    ]) ||
    generateCertificateId();


  const verifyCode =
    getValue([
      "verify_code",
      "verifyCode"
    ]) ||
    generateVerifyCode();


  const issueDate =
    getValue([
      "issue_date",
      "issueDate"
    ]) ||
    new Date()
      .toISOString()
      .split("T")[0];


  const status =
    getValue([
      "status",
      "certificateStatus"
    ]) ||
    "valid";


  const director =
    getValue([
      "director_name",
      "directorName",
      "director"
    ]);


  const academicHead =
    getValue([
      "academic_head_name",
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
      studentNumber,

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
   32. LOAD ORIGINAL TEMPLATE
   ========================================================= */

function loadCertificateTemplate() {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      if (
        certificateBackground
      ) {

        resolve(
          certificateBackground
        );

        return;
      }


      const image =
        new Image();


      image.onload =
        function() {

          certificateBackground =
            image;

          resolve(
            image
          );
        };


      image.onerror =
        function() {

          reject(
            new Error(
              "certificate-template.png could not be loaded. Make sure the file is in the same repository folder as certificate.html."
            )
          );
        };


      image.src =
        "./certificate-template.png";
    }
  );
}


/* =========================================================
   33. GET CANVAS
   ========================================================= */

function getCertificateCanvas() {

  return firstExisting(
    "certificateCanvas",
    "canvas"
  );
}


/* =========================================================
   34. PREPARE CANVAS
   ========================================================= */

async function prepareCanvas() {

  const canvas =
    getCertificateCanvas();


  if (!canvas) {

    throw new Error(
      "certificateCanvas was not found."
    );
  }


  /*
    HD canvas.
  */

  canvas.width =
    1536;

  canvas.height =
    1024;


  const ctx =
    canvas.getContext(
      "2d"
    );


  if (!ctx) {

    throw new Error(
      "Could not create 2D canvas context."
    );
  }


  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  if (!certificateBackground) {

    await loadCertificateTemplate();
  }


  /*
    IMPORTANT:
    Original template is drawn as-is.
  */

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
   35. DRAW CENTERED TEXT
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
   36. DRAW CERTIFICATE
   ========================================================= */

async function drawCertificate(
  certificateData
) {

  const {
    canvas,
    ctx
  } =
    await prepareCanvas();


  const centerX =
    canvas.width / 2;


  /*
    =======================================================
    ORIGINAL TEMPLATE
    =======================================================

    The PNG remains untouched.

    Only dynamic certificate information
    is written on top.
  */


  /*
    STUDENT NAME
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
    COURSE
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
    CERTIFICATE NUMBER
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
    ISSUE DATE
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
   37. GENERATE
   ========================================================= */

async function generateCertificate() {

  try {

    clearMessage();


    const data =
      getCertificateFormData();


    if (
      !data.institution_id
    ) {

      showMessage(
        "Please select an institution first.",
        "error"
      );

      return;
    }


    if (
      !data.student_id ||
      !data.student_name
    ) {

      showMessage(
        "Please select a student.",
        "error"
      );

      return;
    }


    if (
      !data.course_id ||
      !data.course_name
    ) {

      showMessage(
        "Please select a course.",
        "error"
      );

      return;
    }


    /*
      Generate certificate.
    */

    currentCertificate =
      data;


    await drawCertificate(
      data
    );


    /*
      Put generated values into UI.
    */

    setValue(
      [
        "certificate_no",
        "certificateNo",
        "certificateNumber"
      ],
      data.certificate_no
    );


    setValue(
      [
        "certificate_id",
        "certificateId"
      ],
      data.certificate_id
    );


    setValue(
      [
        "verify_code",
        "verifyCode"
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
   38. PREVIEW
   ========================================================= */

async function previewCertificate() {

  try {

    clearMessage();


    const data =
      getCertificateFormData();


    if (
      !data.institution_id
    ) {

      showMessage(
        "Please select an institution first.",
        "error"
      );

      return;
    }


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
   39. SAVE CERTIFICATE
   ========================================================= */

async function saveCertificate() {

  try {

    clearMessage();


    const data =
      getCertificateFormData();


    /*
      Validation
    */

    if (
      !data.institution_id
    ) {

      showMessage(
        "Please select an institution.",
        "error"
      );

      return;
    }


    if (
      !data.student_id ||
      !data.student_name
    ) {

      showMessage(
        "Please select a student.",
        "error"
      );

      return;
    }


    if (
      !data.course_id ||
      !data.course_name
    ) {

      showMessage(
        "Please select a course.",
        "error"
      );

      return;
    }


    /*
      Ensure certificate is rendered first.
    */

    currentCertificate =
      data;


    await drawCertificate(
      data
    );


    /*
      Check duplicate certificate number.
    */

    const {
      data: existing,
      error: existingError
    } =
      await supabaseClient
        .from("certificates")
        .select("id")
        .eq(
          "certificate_no",
          data.certificate_no
        )
        .maybeSingle();


    if (existingError) {
      throw existingError;
    }


    if (existing) {

      showMessage(
        "This certificate number already exists. Click New to create another certificate.",
        "error"
      );

      return;
    }


    /*
      Generate verification hash.
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
      DATABASE-SAFE PAYLOAD

      Only known certificate columns
      are sent.
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


    /*
      Insert certificate.
    */

    const {
      data: saved,
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
      throw error;
    }


    currentCertificate =
      {
        ...data,
        ...saved
      };


    /*
      Update UI with generated IDs.
    */

    setValue(
      [
        "certificate_no",
        "certificateNo",
        "certificateNumber"
      ],
      data.certificate_no
    );


    setValue(
      [
        "certificate_id",
        "certificateId"
      ],
      data.certificate_id
    );


    setValue(
      [
        "verify_code",
        "verifyCode"
      ],
      data.verify_code
    );


    showMessage(
      "Certificate saved successfully to Supabase.",
      "success"
    );


    console.log(
      "Saved certificate:",
      saved
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
   40. HD DOWNLOAD
   ========================================================= */

async function downloadHD() {

  try {

    clearMessage();


    if (!currentCertificate) {

      currentCertificate =
        getCertificateFormData();
    }


    if (
      !currentCertificate.student_name ||
      !currentCertificate.course_name
    ) {

      showMessage(
        "Generate or preview the certificate first.",
        "error"
      );

      return;
    }


    const canvas =
      await drawCertificate(
        currentCertificate
      );


    const link =
      document.createElement(
        "a"
      );


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
        "image/png"
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


/*
  Compatibility alias.

  The old HTML called downloadCertificate().
*/

async function downloadCertificate() {

  return downloadHD();
}


/* =========================================================
   41. PRINT A4
   ========================================================= */

async function printCertificate() {

  try {

    clearMessage();


    if (!currentCertificate) {

      currentCertificate =
        getCertificateFormData();
    }


    if (
      !currentCertificate.student_name ||
      !currentCertificate.course_name
    ) {

      showMessage(
        "Generate or preview the certificate first.",
        "error"
      );

      return;
    }


    const canvas =
      await drawCertificate(
        currentCertificate
      );


    const image =
      canvas.toDataURL(
        "image/png"
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


    printWindow.document.open();


    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

      <head>

        <title>
          GAAWOW Academy Certificate
        </title>

        <style>

          @page{
            size:A4 landscape;
            margin:0;
          }

          html,
          body{
            margin:0;
            padding:0;
            width:100%;
            height:100%;
            background:#fff;
          }

          body{
            display:flex;
            align-items:center;
            justify-content:center;
          }

          img{
            width:297mm;
            height:210mm;
            object-fit:contain;
            display:block;
          }

        </style>

      </head>

      <body>

        <img
          src="${image}"
          alt="GAAWOW Academy Certificate"
        >

        <script>

          window.onload = function(){

            setTimeout(
              function(){

                window.print();

              },
              600
            );

          };

        <\/script>

      </body>

      </html>
    `);


    printWindow.document.close();


    showMessage(
      "A4 certificate print window opened successfully.",
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
   42. NEW CERTIFICATE
   ========================================================= */

function newCertificate() {

  currentCertificate =
    null;


  /*
    Clear generated certificate fields.
  */

  [
    "certificate_no",
    "certificate_id",
    "verify_code"
  ].forEach(
    id => {

      const element =
        $(id);

      if (element) {
        element.value =
          "";
      }

    }
  );


  /*
    Clear enrollment dates.
  */

  [
    "date_started",
    "date_completed"
  ].forEach(
    id => {

      const element =
        $(id);

      if (element) {
        element.value =
          "";
      }

    }
  );


  /*
    Clear student.
  */

  const studentSelect =
    getStudentSelect();


  if (studentSelect) {
    studentSelect.value =
      "";
  }


  /*
    Clear student fields.
  */

  setValue(
    [
      "full_name",
      "studentFullName",
      "fullName",
      "studentName",
      "student_name"
    ],
    ""
  );


  setValue(
    [
      "student_id",
      "studentId",
      "studentID"
    ],
    ""
  );


  /*
    Clear photo.
  */

  const photo =
    $("student_photo");


  if (photo) {

    photo.removeAttribute(
      "src"
    );

    photo.style.display =
      "none";
  }


  /*
    Reset course.
  */

  resetCourseSelector();


  /*
    Issue date = today.
  */

  setValue(
    [
      "issue_date",
      "issueDate"
    ],
    new Date()
      .toISOString()
      .split("T")[0]
  );


  /*
    Status.
  */

  setValue(
    [
      "status",
      "certificateStatus"
    ],
    "graduated"
  );


  /*
    Clear canvas.
  */

  const canvas =
    getCertificateCanvas();


  if (canvas) {

    const ctx =
      canvas.getContext(
        "2d"
      );


    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }


  clearMessage();
}


/* =========================================================
   43. EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

  /*
    Institution
  */

  const institutionSelect =
    getInstitutionSelect();


  if (institutionSelect) {

    institutionSelect.addEventListener(
      "change",
      async function() {

        clearMessage();

        await loadStudents(
          this.value
        );

      }
    );
  }


  /*
    Student
  */

  const studentSelect =
    getStudentSelect();


  if (studentSelect) {

    studentSelect.addEventListener(
      "change",
      async function() {

        clearMessage();

        fillStudentData();

        await handleStudentChange();

      }
    );
  }


  /*
    Course
  */

  const courseSelect =
    getCourseSelect();


  if (courseSelect) {

    courseSelect.addEventListener(
      "change",
      function() {

        clearMessage();

        fillEnrollmentData();

      }
    );
  }


  /*
    Generate
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


  /*
    Preview
  */

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


  /*
    Save
  */

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


  /*
    HD Download
  */

  const downloadButton =
    firstExisting(
      "downloadBtn",
      "downloadCertificateBtn",
      "hdDownloadBtn",
      "btnHD"
    );


  if (downloadButton) {

    downloadButton.addEventListener(
      "click",
      downloadHD
    );
  }


  /*
    Print
  */

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


  /*
    New
  */

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
   44. AUTH STATE
   ========================================================= */

function setupAuthListener() {

  if (!supabaseClient) {
    return;
  }


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
        event ===
        "SIGNED_OUT"
      ) {

        currentUser =
          null;

        currentProfile =
          null;

        showMessage(
          "You have been signed out.",
          "error"
        );

        return;
      }


      if (
        event ===
          "SIGNED_IN" &&
        session?.user
      ) {

        currentUser =
          session.user;


        try {

          await loadCurrentProfile();

          await loadInstitutions();

        } catch (error) {

          console.error(
            "Auth refresh error:",
            error
          );

        }
      }

    }
  );
}


/* =========================================================
   45. INITIALIZATION
   ========================================================= */

async function initializeCertificateGenerator() {

  console.log(
    "=============================================="
  );

  console.log(
    "GAAWOW EMS Certificate Generator V8 FINAL"
  );

  console.log(
    "DATABASE-SAFE"
  );

  console.log(
    "=============================================="
  );


  clearMessage();


  /*
    1. Supabase
  */

  if (!initializeSupabase()) {

    showMessage(
      "Supabase client failed to initialize. Please check the CDN connection.",
      "error"
    );

    return;
  }


  try {

    /*
      2. Authentication
    */

    const user =
      await loadCurrentUser();


    if (!user) {
      return;
    }


    /*
      3. Profile
    */

    const profile =
      await loadCurrentProfile();


    if (!profile) {
      return;
    }


    /*
      4. Institution selector
    */

    ensureInstitutionSelector();


    /*
      5. Load institutions
    */

    try {

      await loadInstitutions();

    } catch (error) {

      showMessage(
        `Institution loading error: ${readableError(error)}`,
        "error"
      );

      return;
    }


    /*
      6. Template preload
    */

    try {

      await loadCertificateTemplate();

      console.log(
        "certificate-template.png loaded successfully."
      );

    } catch (templateError) {

      console.error(
        "Template loading error:",
        templateError
      );

      showMessage(
        `Template error: ${readableError(templateError)}`,
        "error"
      );
    }


    /*
      7. Events
    */

    setupEventListeners();


    /*
      8. Set today's issue date
    */

    const issueDate =
      $("issue_date");


    if (
      issueDate &&
      !issueDate.value
    ) {

      issueDate.value =
        new Date()
          .toISOString()
          .split("T")[0];
    }


    /*
      9. Final
    */

    console.log(
      "Certificate Generator V8 initialized successfully."
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
   46. GLOBAL FUNCTIONS
   ========================================================= */

window.generateCertificate =
  generateCertificate;

window.previewCertificate =
  previewCertificate;

window.saveCertificate =
  saveCertificate;

window.downloadHD =
  downloadHD;

window.downloadCertificate =
  downloadCertificate;

window.printCertificate =
  printCertificate;

window.newCertificate =
  newCertificate;

window.loadInstitutions =
  loadInstitutions;

window.loadStudents =
  loadStudents;


/* =========================================================
   47. START
   ========================================================= */

function startCertificateGenerator() {

  /*
    Supabase CDN must be available first.
  */

  if (
    window.supabase &&
    typeof window.supabase.createClient ===
      "function"
  ) {

    initializeCertificateGenerator();

    return;
  }


  /*
    Small retry protects against CDN timing.
  */

  let attempts =
    0;


  const timer =
    setInterval(
      function() {

        attempts++;


        if (
          window.supabase &&
          typeof window.supabase.createClient ===
            "function"
        ) {

          clearInterval(
            timer
          );

          initializeCertificateGenerator();

          return;
        }


        if (
          attempts >= 50
        ) {

          clearInterval(
            timer
          );

          showMessage(
            "Supabase CDN library failed to load.",
            "error"
          );
        }

      },
      100
    );
}


/* =========================================================
   DOM READY
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    function() {

      setupAuthListener();

      startCertificateGenerator();

    }
  );

} else {

  setupAuthListener();

  startCertificateGenerator();
}
