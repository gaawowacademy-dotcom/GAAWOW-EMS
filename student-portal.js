/* ============================================================
   GAAWOW ACADEMY / GAAWOW EMS
   STUDENT PORTAL JS V6.3 FINAL

   PURPOSE:
   - Load authenticated student
   - Load student profile
   - Load enrollment
   - Load Institution
   - Load Department
   - Load Course / Program
   - Load Class
   - Load Academic Year
   - Load Status
   - Load Grades / Results
   - Load Certificates
   - Load Payments
   - Load Notifications
   - Handle Logout
   - Never hard-code a student's identity

   DATABASE RELATION:

   auth.users
       ↓ auth_user_id
   students
       ↓ student_id
   enrollments
       ├── institution
       ├── course
       ├── class
       ├── department
       └── academic year

   ============================================================ */

"use strict";


/* ============================================================
   1. SUPABASE CONFIG
   ============================================================ */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


if (!window.supabase) {
  console.error(
    "Supabase library was not loaded."
  );
  throw new Error(
    "Supabase library was not loaded."
  );
}


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );


/* ============================================================
   2. GLOBAL STATE
   ============================================================ */

let currentUser = null;
let currentStudent = null;
let currentEnrollment = null;

let currentInstitution = null;
let currentCourse = null;
let currentDepartment = null;
let currentClass = null;

let gradesData = [];
let certificatesData = [];
let paymentsData = [];
let notificationsData = [];


/* ============================================================
   3. DOM HELPERS
   ============================================================ */

function $(id) {
  return document.getElementById(id);
}


function setText(id, value, fallback = "—") {
  const el = $(id);

  if (!el) {
    return;
  }

  const finalValue =
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
      ? value
      : fallback;

  el.textContent = finalValue;
}


function setHTML(id, html) {
  const el = $(id);

  if (!el) {
    return;
  }

  el.innerHTML = html;
}


function show(id) {
  const el = $(id);

  if (!el) {
    return;
  }

  el.classList.remove("hidden");

  el.style.display = "";
}


function hide(id) {
  const el = $(id);

  if (!el) {
    return;
  }

  el.classList.add("hidden");
}


function escapeHTML(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* ============================================================
   4. GENERIC VALUE FINDER
   ============================================================ */

function firstValue(object, keys, fallback = null) {

  if (!object) {
    return fallback;
  }

  for (const key of keys) {

    if (
      object[key] !== undefined &&
      object[key] !== null &&
      String(object[key]).trim() !== ""
    ) {
      return object[key];
    }
  }

  return fallback;
}


/* ============================================================
   5. DATE FORMATTER
   ============================================================ */

function formatDate(value) {

  if (!value) {
    return "—";
  }

  try {

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );

  } catch (error) {

    return String(value);
  }
}


/* ============================================================
   6. MESSAGE
   ============================================================ */

function showMessage(
  message,
  type = "info"
) {

  const el = $("portalMessage");

  if (!el) {
    return;
  }

  el.textContent = message;

  el.className =
    `message ${type}`;

  el.style.display = "block";
}


function clearMessage() {

  const el = $("portalMessage");

  if (!el) {
    return;
  }

  el.textContent = "";
  el.className = "message";
  el.style.display = "none";
}


/* ============================================================
   7. LOADING SCREEN
   ============================================================ */

function showPortalLoading() {

  const loading =
    $("portalLoading");

  const app =
    $("portalApp");

  if (loading) {
    loading.style.display = "flex";
  }

  if (app) {
    app.classList.add("hidden");
  }
}


function hidePortalLoading() {

  const loading =
    $("portalLoading");

  const app =
    $("portalApp");

  if (loading) {
    loading.style.display = "none";
  }

  if (app) {
    app.classList.remove("hidden");
    app.style.display = "";
  }
}


/* ============================================================
   8. LOGOUT
   ============================================================ */

async function logoutStudent() {

  try {

    await supabaseClient.auth.signOut();

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

  } finally {

    window.location.href =
      "student-login.html";
  }
}


/* ============================================================
   9. AUTHENTICATED USER
   ============================================================ */

async function getAuthenticatedUser() {

  const {
    data,
    error
  } =
    await supabaseClient.auth.getUser();

  if (error) {

    console.error(
      "getUser error:",
      error
    );

    return null;
  }

  return data?.user || null;
}


/* ============================================================
   10. LOAD STUDENT BY AUTH USER ID
   ============================================================ */

async function loadStudent(userId) {

  if (!userId) {
    return null;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("students")
      .select("*")
      .eq(
        "auth_user_id",
        userId
      )
      .maybeSingle();


  if (error) {

    console.error(
      "Student query error:",
      error
    );

    throw error;
  }


  return data || null;
}


/* ============================================================
   11. LOAD ENROLLMENT
   ============================================================ */

async function loadEnrollment(studentId) {

  if (!studentId) {
    return null;
  }


  /*
     IMPORTANT:

     We DO NOT use academic_year_id here.

     Previous SQL error:
     column "academic_year_id" does not exist.

     Therefore we select "*" and inspect the real
     enrollment record dynamically.
  */

  let result =
    await supabaseClient
      .from("enrollments")
      .select("*")
      .eq(
        "student_id",
        studentId
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(20);


  if (result.error) {

    console.error(
      "Enrollment query error:",
      result.error
    );

    /*
       Fallback for schemas using student_uuid
       instead of student_id.
    */

    result =
      await supabaseClient
        .from("enrollments")
        .select("*")
        .eq(
          "student_uuid",
          studentId
        )
        .limit(20);
  }


  if (result.error) {

    console.error(
      "Enrollment fallback error:",
      result.error
    );

    return null;
  }


  const rows =
    Array.isArray(result.data)
      ? result.data
      : [];


  if (!rows.length) {
    return null;
  }


  /*
     Prefer active enrollment.
  */

  const active =
    rows.find(row => {

      const status =
        String(
          firstValue(
            row,
            [
              "status",
              "enrollment_status",
              "student_status"
            ],
            ""
          )
        ).toLowerCase();

      return (
        status === "active" ||
        status === "enrolled"
      );
    });


  return active || rows[0];
}


/* ============================================================
   12. GENERIC TABLE RECORD BY ID
   ============================================================ */

async function getRecordById(
  tableName,
  id
) {

  if (!id) {
    return null;
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from(tableName)
      .select("*")
      .eq("id", id)
      .maybeSingle();


  if (error) {

    console.warn(
      `Could not load ${tableName}:`,
      error.message
    );

    return null;
  }


  return data || null;
}


/* ============================================================
   13. LOAD ACADEMIC RELATIONS
   ============================================================ */

async function loadAcademicRelations(
  enrollment
) {

  if (!enrollment) {
    return;
  }


  /* ----------------------------------------------------------
     INSTITUTION
     ---------------------------------------------------------- */

  const institutionId =
    firstValue(
      enrollment,
      [
        "institution_id",
        "institution_uuid",
        "institutionId"
      ]
    );


  if (institutionId) {

    currentInstitution =
      await getRecordById(
        "institutions",
        institutionId
      );
  }


  /*
     Sometimes enrollment can contain institution
     as an embedded object.
  */

  if (
    !currentInstitution &&
    enrollment.institution &&
    typeof enrollment.institution === "object"
  ) {

    currentInstitution =
      enrollment.institution;
  }


  /* ----------------------------------------------------------
     COURSE
     ---------------------------------------------------------- */

  const courseId =
    firstValue(
      enrollment,
      [
        "course_id",
        "course_uuid",
        "courseId",
        "program_id"
      ]
    );


  if (courseId) {

    currentCourse =
      await getRecordById(
        "courses",
        courseId
      );
  }


  if (
    !currentCourse &&
    enrollment.course &&
    typeof enrollment.course === "object"
  ) {

    currentCourse =
      enrollment.course;
  }


  /* ----------------------------------------------------------
     DEPARTMENT
     ---------------------------------------------------------- */

  let departmentId =
    firstValue(
      enrollment,
      [
        "department_id",
        "department_uuid",
        "departmentId"
      ]
    );


  /*
     If department_id is not in enrollment,
     look inside course.
  */

  if (
    !departmentId &&
    currentCourse
  ) {

    departmentId =
      firstValue(
        currentCourse,
        [
          "department_id",
          "department_uuid",
          "departmentId"
        ]
      );
  }


  if (departmentId) {

    currentDepartment =
      await getRecordById(
        "departments",
        departmentId
      );
  }


  if (
    !currentDepartment &&
    enrollment.department &&
    typeof enrollment.department === "object"
  ) {

    currentDepartment =
      enrollment.department;
  }


  /* ----------------------------------------------------------
     CLASS
     ---------------------------------------------------------- */

  const classId =
    firstValue(
      enrollment,
      [
        "class_id",
        "class_uuid",
        "classId"
      ]
    );


  if (classId) {

    currentClass =
      await getRecordById(
        "classes",
        classId
      );
  }


  if (
    !currentClass &&
    enrollment.class &&
    typeof enrollment.class === "object"
  ) {

    currentClass =
      enrollment.class;
  }
}


/* ============================================================
   14. EXTRACT ACADEMIC YEAR
   ============================================================ */

function getAcademicYear() {

  /*
     IMPORTANT:
     No academic_year_id is required.
  */

  const sources = [
    currentEnrollment,
    currentClass,
    currentCourse,
    currentInstitution
  ];


  for (const source of sources) {

    if (!source) {
      continue;
    }


    const value =
      firstValue(
        source,
        [
          "academic_year",
          "academicYear",
          "year",
          "school_year",
          "academic_session",
          "session",
          "year_name",
          "academic_year_name"
        ]
      );


    if (value) {
      return value;
    }
  }


  return "—";
}


/* ============================================================
   15. GET STUDENT NAME
   ============================================================ */

function getStudentFullName() {

  const name =
    firstValue(
      currentStudent,
      [
        "full_name",
        "name",
        "student_name",
        "display_name"
      ]
    );


  if (name) {
    return name;
  }


  const firstName =
    firstValue(
      currentStudent,
      [
        "first_name",
        "firstname"
      ],
      ""
    );


  const middleName =
    firstValue(
      currentStudent,
      [
        "middle_name",
        "middlename"
      ],
      ""
    );


  const lastName =
    firstValue(
      currentStudent,
      [
        "last_name",
        "lastname",
        "surname"
      ],
      ""
    );


  const combined =
    [
      firstName,
      middleName,
      lastName
    ]
      .filter(Boolean)
      .join(" ")
      .trim();


  return combined || "Student";
}


/* ============================================================
   16. RENDER STUDENT PROFILE
   ============================================================ */

function renderStudentProfile() {

  if (!currentStudent) {
    return;
  }


  const fullName =
    getStudentFullName();


  const studentId =
    firstValue(
      currentStudent,
      [
        "student_id",
        "student_number",
        "registration_number",
        "reg_no"
      ]
    );


  const email =
    firstValue(
      currentStudent,
      [
        "email",
        "student_email"
      ],
      currentUser?.email || "—"
    );


  const phone =
    firstValue(
      currentStudent,
      [
        "phone",
        "phone_number",
        "mobile",
        "mobile_number"
      ]
    );


  const gender =
    firstValue(
      currentStudent,
      [
        "gender",
        "sex"
      ]
    );


  const dob =
    firstValue(
      currentStudent,
      [
        "date_of_birth",
        "dob",
        "birth_date"
      ]
    );


  const address =
    firstValue(
      currentStudent,
      [
        "address",
        "student_address",
        "residence"
      ]
    );


  const admissionDate =
    firstValue(
      currentStudent,
      [
        "admission_date",
        "date_admitted",
        "registered_at"
      ]
    );


  const photo =
    firstValue(
      currentStudent,
      [
        "photo_url",
        "profile_photo",
        "profile_image",
        "image_url",
        "avatar_url",
        "photo"
      ]
    );


  /* ----------------------------------------------------------
     HEADER
     ---------------------------------------------------------- */

  setText(
    "studentNameTop",
    fullName,
    "Student"
  );


  setText(
    "studentName",
    fullName,
    "Student"
  );


  setText(
    "welcomeStudentName",
    `${fullName} 👋`,
    "Student 👋"
  );


  /* ----------------------------------------------------------
     STUDENT ID
     ---------------------------------------------------------- */

  setText(
    "studentNumber",
    studentId
  );


  setText(
    "profileStudentId",
    studentId
  );


  /* ----------------------------------------------------------
     PROFILE
     ---------------------------------------------------------- */

  setText(
    "studentFullName",
    fullName
  );


  setText(
    "profileEmail",
    email
  );


  setText(
    "profilePhone",
    phone
  );


  setText(
    "profileGender",
    gender
  );


  setText(
    "studentAdmissionDate",
    formatDate(admissionDate)
  );


  setText(
    "profileAddress",
    address
  );


  /* ----------------------------------------------------------
     DATE OF BIRTH
     ---------------------------------------------------------- */

  const dobEl =
    $("profileDateOfBirth");

  if (dobEl) {

    dobEl.textContent =
      formatDate(dob);
  }


  /* ----------------------------------------------------------
     ENROLLMENT DATE
     ---------------------------------------------------------- */

  const enrollmentDate =
    firstValue(
      currentEnrollment,
      [
        "enrollment_date",
        "admission_date",
        "start_date",
        "created_at"
      ]
    );


  setText(
    "studentEnrollmentDate",
    formatDate(enrollmentDate)
  );


  /* ----------------------------------------------------------
     LAST LOGIN
     ---------------------------------------------------------- */

  const lastLogin =
    firstValue(
      currentStudent,
      [
        "last_login_at",
        "last_login",
        "last_seen_at"
      ]
    );


  setText(
    "lastLogin",
    formatDate(lastLogin)
  );


  setText(
    "studentLastLogin",
    formatDate(lastLogin)
  );


  /* ----------------------------------------------------------
     LOGIN USERNAME
     ---------------------------------------------------------- */

  const username =
    firstValue(
      currentStudent,
      [
        "login_username",
        "username",
        "student_username"
      ],
      currentUser?.email || "—"
    );


  setText(
    "loginUsername",
    username
  );


  /* ----------------------------------------------------------
     PHOTO
     ---------------------------------------------------------- */

  const photoEl =
    $("studentPhoto");


  if (photoEl && photo) {

    photoEl.src = photo;

    photoEl.onerror =
      function () {

        this.onerror = null;

        this.src =
          "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";
      };
  }


  /* ----------------------------------------------------------
     ACCOUNT ENABLED / STATUS
     ---------------------------------------------------------- */

  const accountEnabled =
    currentStudent.account_enabled;


  const status =
    firstValue(
      currentStudent,
      [
        "status",
        "account_status"
      ],
      "active"
    );


  const active =
    accountEnabled === false
      ? false
      : String(status).toLowerCase() !==
        "inactive";


  renderAccountStatus(
    active
  );
}


/* ============================================================
   17. RENDER ACCOUNT STATUS
   ============================================================ */

function renderAccountStatus(
  active
) {

  const statusText =
    active
      ? "Active"
      : "Inactive";


  const accountStatus =
    $("accountStatus");


  if (accountStatus) {

    accountStatus.textContent =
      statusText;

    accountStatus.classList.toggle(
      "inactive",
      !active
    );
  }


  setText(
    "studentAccountStatus",
    statusText
  );


  setText(
    "profileAccountStatus",
    statusText
  );


  setText(
    "enrollmentStatus",
    statusText
  );


  setText(
    "studentEnrollmentStatus",
    statusText
  );


  setText(
    "enrollmentStatusValue",
    statusText
  );


  setText(
    "academicStatus",
    statusText
  );
}


/* ============================================================
   18. RENDER ACADEMIC INFORMATION
   ============================================================ */

function renderAcademicInformation() {

  const institutionName =
    firstValue(
      currentInstitution,
      [
        "name",
        "institution_name",
        "title"
      ]
    ) ||
    firstValue(
      currentEnrollment,
      [
        "institution_name"
      ]
    );


  const courseName =
    firstValue(
      currentCourse,
      [
        "name",
        "course_name",
        "title",
        "program_name"
      ]
    ) ||
    firstValue(
      currentEnrollment,
      [
        "course_name",
        "program_name"
      ]
    );


  const departmentName =
    firstValue(
      currentDepartment,
      [
        "name",
        "department_name",
        "title"
      ]
    ) ||
    firstValue(
      currentEnrollment,
      [
        "department_name"
      ]
    );


  const className =
    firstValue(
      currentClass,
      [
        "name",
        "class_name",
        "title"
      ]
    ) ||
    firstValue(
      currentEnrollment,
      [
        "class_name"
      ]
    );


  const academicYear =
    getAcademicYear();


  const status =
    firstValue(
      currentEnrollment,
      [
        "status",
        "enrollment_status"
      ],
      "active"
    );


  /* ----------------------------------------------------------
     MAIN COMPATIBILITY IDS
     ---------------------------------------------------------- */

  const institutionIds = [
    "institutionName",
    "studentInstitution",
    "institution",
    "profileInstitution",
    "dashboardInstitution"
  ];


  const courseIds = [
    "courseName",
    "studentCourse",
    "course",
    "profileCourse",
    "programName",
    "studentProgram",
    "dashboardCourse"
  ];


  const departmentIds = [
    "departmentName",
    "studentDepartment",
    "department",
    "profileDepartment",
    "dashboardDepartment"
  ];


  const classIds = [
    "className",
    "studentClass",
    "class",
    "profileClass",
    "dashboardClass"
  ];


  const academicYearIds = [
    "academicYear",
    "studentAcademicYear",
    "classAcademicYear"
  ];


  institutionIds.forEach(
    id =>
      setText(
        id,
        institutionName
      )
  );


  courseIds.forEach(
    id =>
      setText(
        id,
        courseName
      )
  );


  departmentIds.forEach(
    id =>
      setText(
        id,
        departmentName
      )
  );


  classIds.forEach(
    id =>
      setText(
        id,
        className
      )
  );


  academicYearIds.forEach(
    id =>
      setText(
        id,
        academicYear
      )
  );


  setText(
    "enrollmentStatus",
    status
  );


  setText(
    "studentEnrollmentStatus",
    status
  );


  setText(
    "enrollmentStatusValue",
    status
  );


  setText(
    "academicStatus",
    status
  );


  /* ----------------------------------------------------------
     TOP DASHBOARD COURSE
     ---------------------------------------------------------- */

  setText(
    "dashboardCourse",
    courseName
  );


  /* ----------------------------------------------------------
     RENDER VISIBLE ACADEMIC SUMMARY
     ---------------------------------------------------------- */

  const container =
    $("academicSummary");


  if (!container) {
    return;
  }


  container.innerHTML = `
    <div class="academic-summary-grid">

      <div class="academic-item">
        <span>Institution</span>
        <strong>
          ${escapeHTML(institutionName || "—")}
        </strong>
      </div>

      <div class="academic-item">
        <span>Department</span>
        <strong>
          ${escapeHTML(departmentName || "—")}
        </strong>
      </div>

      <div class="academic-item">
        <span>Course / Program</span>
        <strong>
          ${escapeHTML(courseName || "—")}
        </strong>
      </div>

      <div class="academic-item">
        <span>Class</span>
        <strong>
          ${escapeHTML(className || "—")}
        </strong>
      </div>

      <div class="academic-item">
        <span>Academic Year</span>
        <strong>
          ${escapeHTML(
            academicYear || "—"
          )}
        </strong>
      </div>

      <div class="academic-item">
        <span>Status</span>
        <strong class="academic-status">
          ${escapeHTML(
            String(status || "Active")
          )}
        </strong>
      </div>

    </div>
  `;
}


/* ============================================================
   19. LOAD GRADES
   ============================================================ */

async function loadGrades() {

  gradesData = [];


  /*
     First try grades table.
  */

  let result =
    await supabaseClient
      .from("grades")
      .select("*")
      .eq(
        "student_id",
        currentStudent.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (
    !result.error &&
    Array.isArray(result.data)
  ) {

    gradesData =
      result.data;
  }


  /*
     If grades table is empty or unavailable,
     try results table used by the existing EMS.
  */

  if (!gradesData.length) {

    const results =
      await supabaseClient
        .from("results")
        .select("*")
        .eq(
          "student_id",
          currentStudent.id
        )
        .eq(
          "is_published",
          true
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (
      !results.error &&
      Array.isArray(results.data)
    ) {

      gradesData =
        results.data;
    }
  }


  renderGrades();
}


/* ============================================================
   20. RENDER GRADES
   ============================================================ */

function renderGrades() {

  const container =
    $("gradesContainer");


  if (!container) {
    return;
  }


  setText(
    "resultsCount",
    gradesData.length
  );


  if (!gradesData.length) {

    container.innerHTML = `
      <div class="empty-message">
        No grade records available yet.
      </div>
    `;

    return;
  }


  const rows =
    gradesData.map(
      (grade, index) => {

        const subject =
          firstValue(
            grade,
            [
              "subject_name",
              "subject",
              "course_name",
              "name"
            ],
            "Subject"
          );


        const exam =
          firstValue(
            grade,
            [
              "exam_name",
              "exam",
              "assessment_name"
            ],
            "—"
          );


        const score =
          firstValue(
            grade,
            [
              "score",
              "marks",
              "total_score",
              "grade"
            ],
            "—"
          );


        const max =
          firstValue(
            grade,
            [
              "max_score",
              "total_marks",
              "maximum_score"
            ]
          );


        const gradeValue =
          firstValue(
            grade,
            [
              "letter_grade",
              "grade_letter",
              "result"
            ],
            ""
          );


        return `
          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              ${escapeHTML(subject)}
            </td>

            <td>
              ${escapeHTML(exam)}
            </td>

            <td>
              ${escapeHTML(score)}
              ${
                max
                  ? ` / ${escapeHTML(max)}`
                  : ""
              }
            </td>

            <td>
              ${escapeHTML(gradeValue || "—")}
            </td>

          </tr>
        `;
      }
    )
    .join("");


  container.innerHTML = `
    <div class="grades-table-wrap">

      <table class="student-grades-table">

        <thead>

          <tr>
            <th>#</th>
            <th>Subject</th>
            <th>Exam</th>
            <th>Score</th>
            <th>Grade</th>
          </tr>

        </thead>

        <tbody>
          ${rows}
        </tbody>

      </table>

    </div>
  `;
}


/* ============================================================
   21. LOAD CERTIFICATES
   ============================================================ */

async function loadCertificates() {

  certificatesData = [];


  const result =
    await supabaseClient
      .from("certificates")
      .select("*")
      .eq(
        "student_id",
        currentStudent.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (
    !result.error &&
    Array.isArray(result.data)
  ) {

    certificatesData =
      result.data;
  }


  renderCertificates();
}


/* ============================================================
   22. RENDER CERTIFICATES
   ============================================================ */

function renderCertificates() {

  setText(
    "certificatesCount",
    certificatesData.length
  );


  const container =
    $("certificatesContainer");


  if (!container) {
    return;
  }


  if (!certificatesData.length) {

    container.innerHTML = `
      <div class="certificate-list">

        <div class="empty-message">
          No certificates available yet.
        </div>

      </div>
    `;

    return;
  }


  const html =
    certificatesData.map(
      certificate => {

        const title =
          firstValue(
            certificate,
            [
              "certificate_name",
              "title",
              "name",
              "certificate_type"
            ],
            "Certificate"
          );


        const status =
          firstValue(
            certificate,
            [
              "status"
            ],
            "Issued"
          );


        const date =
          firstValue(
            certificate,
            [
              "issue_date",
              "issued_at",
              "created_at"
            ]
          );


        const number =
          firstValue(
            certificate,
            [
              "certificate_number",
              "certificate_no",
              "serial_number"
            ]
          );


        return `
          <div class="certificate-item">

            <strong>
              ${escapeHTML(title)}
            </strong>

            <span>
              ${escapeHTML(status)}
            </span>

            ${
              number
                ? `
                  <small>
                    Certificate No:
                    ${escapeHTML(number)}
                  </small>
                `
                : ""
            }

            <small>
              ${escapeHTML(
                formatDate(date)
              )}
            </small>

          </div>
        `;
      }
    )
    .join("");


  container.innerHTML = `
    <div class="certificate-list">
      ${html}
    </div>
  `;
}


/* ============================================================
   23. LOAD PAYMENTS
   ============================================================ */

async function loadPayments() {

  paymentsData = [];


  const result =
    await supabaseClient
      .from("payments")
      .select("*")
      .eq(
        "student_id",
        currentStudent.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (
    !result.error &&
    Array.isArray(result.data)
  ) {

    paymentsData =
      result.data;
  }


  renderPayments();
}


/* ============================================================
   24. RENDER PAYMENTS
   ============================================================ */

function renderPayments() {

  const container =
    $("paymentsContainer");


  if (!container) {
    return;
  }


  if (!paymentsData.length) {

    container.innerHTML = `
      <div class="payments-list">

        <div class="empty-message">
          No payment records available yet.
        </div>

      </div>
    `;

    return;
  }


  const html =
    paymentsData.map(
      payment => {

        const amount =
          firstValue(
            payment,
            [
              "amount",
              "paid_amount",
              "payment_amount"
            ],
            "0"
          );


        const status =
          firstValue(
            payment,
            [
              "status",
              "payment_status"
            ],
            "Paid"
          );


        const method =
          firstValue(
            payment,
            [
              "payment_method",
              "method",
              "channel"
            ],
            "—"
          );


        const date =
          firstValue(
            payment,
            [
              "payment_date",
              "paid_at",
              "created_at"
            ]
          );


        const reference =
          firstValue(
            payment,
            [
              "reference",
              "transaction_id",
              "receipt_number"
            ]
          );


        return `
          <div class="payment-item">

            <strong>
              ${escapeHTML(amount)}
            </strong>

            <span>
              ${escapeHTML(status)}
            </span>

            <small>
              Method:
              ${escapeHTML(method)}
            </small>

            <small>
              Date:
              ${escapeHTML(
                formatDate(date)
              )}
            </small>

            ${
              reference
                ? `
                  <small>
                    Reference:
                    ${escapeHTML(reference)}
                  </small>
                `
                : ""
            }

          </div>
        `;
      }
    )
    .join("");


  container.innerHTML = `
    <div class="payments-list">
      ${html}
    </div>
  `;
}


/* ============================================================
   25. LOAD NOTIFICATIONS
   ============================================================ */

async function loadNotifications() {

  notificationsData = [];


  const result =
    await supabaseClient
      .from("student_notifications")
      .select("*")
      .eq(
        "student_id",
        currentStudent.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (
    !result.error &&
    Array.isArray(result.data)
  ) {

    notificationsData =
      result.data;
  }


  renderNotifications();
}


/* ============================================================
   26. RENDER NOTIFICATIONS
   ============================================================ */

function renderNotifications() {

  const container =
    $("notificationsList");


  if (!container) {
    return;
  }


  const unread =
    notificationsData.filter(
      item =>
        item.is_read === false ||
        item.read_at === null
    ).length;


  setText(
    "notificationsCount",
    unread || notificationsData.length
  );


  if (!notificationsData.length) {

    container.innerHTML = `
      <div class="empty-message">
        No notifications available.
      </div>
    `;

    return;
  }


  container.innerHTML =
    notificationsData
      .map(
        notification => {

          const title =
            firstValue(
              notification,
              [
                "title",
                "subject",
                "notification_title"
              ],
              "Notification"
            );


          const message =
            firstValue(
              notification,
              [
                "message",
                "body",
                "content",
                "description"
              ],
              ""
            );


          const isUnread =
            notification.is_read === false;


          return `
            <div
              class="
                notification-item
                ${isUnread ? "unread" : ""}
              "
            >

              <strong>
                ${escapeHTML(title)}
              </strong>

              <p>
                ${escapeHTML(message)}
              </p>

            </div>
          `;
        }
      )
      .join("");
}


/* ============================================================
   27. MARK ALL NOTIFICATIONS READ
   ============================================================ */

async function markAllNotificationsRead() {

  if (!currentStudent?.id) {
    return;
  }


  const result =
    await supabaseClient
      .from("student_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq(
        "student_id",
        currentStudent.id
      )
      .eq(
        "is_read",
        false
      );


  if (result.error) {

    console.warn(
      "Could not mark notifications read:",
      result.error
    );

    return;
  }


  await loadNotifications();
}


/* ============================================================
   28. LOAD EVERYTHING
   ============================================================ */

async function loadStudentPortal() {

  showPortalLoading();

  clearMessage();


  try {

    /* --------------------------------------------------------
       AUTH
       -------------------------------------------------------- */

    currentUser =
      await getAuthenticatedUser();


    if (!currentUser) {

      window.location.href =
        "student-login.html";

      return;
    }


    console.log(
      "Authenticated user:",
      currentUser.id
    );


    /* --------------------------------------------------------
       STUDENT
       -------------------------------------------------------- */

    currentStudent =
      await loadStudent(
        currentUser.id
      );


    if (!currentStudent) {

      throw new Error(
        "Student account was not found."
      );
    }


    console.log(
      "Student loaded:",
      currentStudent
    );


    /* --------------------------------------------------------
       ENROLLMENT
       -------------------------------------------------------- */

    currentEnrollment =
      await loadEnrollment(
        currentStudent.id
      );


    console.log(
      "Enrollment loaded:",
      currentEnrollment
    );


    /* --------------------------------------------------------
       PROFILE
       -------------------------------------------------------- */

    renderStudentProfile();


    /* --------------------------------------------------------
       ACADEMIC RELATIONS
       -------------------------------------------------------- */

    if (currentEnrollment) {

      await loadAcademicRelations(
        currentEnrollment
      );
    }


    /* --------------------------------------------------------
       ACADEMIC INFORMATION
       -------------------------------------------------------- */

    renderAcademicInformation();


    /* --------------------------------------------------------
       OTHER DATA
       -------------------------------------------------------- */

    await Promise.allSettled([

      loadGrades(),

      loadCertificates(),

      loadPayments(),

      loadNotifications()

    ]);


    /* --------------------------------------------------------
       SHOW PORTAL
       -------------------------------------------------------- */

    hidePortalLoading();


    console.log(
      "Student Portal V6.3 loaded successfully."
    );


  } catch (error) {

    console.error(
      "Student Portal V6.3 error:",
      error
    );


    showPortalError(
      error
    );
  }
}


/* ============================================================
   29. PORTAL ERROR
   ============================================================ */

function showPortalError(error) {

  hidePortalLoading();


  const message =
    error?.message ||
    "Unable to load student information.";


  showMessage(
    message,
    "error"
  );


  console.error(
    "Portal error:",
    error
  );
}


/* ============================================================
   30. LOGOUT BUTTONS
   ============================================================ */

function setupLogoutButtons() {

  const logoutBtn =
    $("logoutBtn");


  const studentLogoutBtn =
    $("studentLogoutBtn");


  if (logoutBtn) {

    logoutBtn.addEventListener(
      "click",
      logoutStudent
    );
  }


  if (studentLogoutBtn) {

    studentLogoutBtn.addEventListener(
      "click",
      logoutStudent
    );
  }
}


/* ============================================================
   31. MARK READ BUTTON
   ============================================================ */

function setupNotificationButton() {

  const button =
    $("markAllReadBtn");


  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    markAllNotificationsRead
  );
}


/* ============================================================
   32. AUTH STATE LISTENER
   ============================================================ */

function setupAuthListener() {

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

        window.location.href =
          "student-login.html";

        return;
      }


      /*
         Do not reload continuously on
         TOKEN_REFRESHED.
      */

      if (
        event === "SIGNED_IN"
      ) {

        if (
          session?.user
        ) {

          currentUser =
            session.user;
        }
      }

    }
  );
}


/* ============================================================
   33. DEBUG INFORMATION
   ============================================================ */

function exposeDebugData() {

  /*
     Useful from browser console:

     window.GAAWOW_PORTAL.student
     window.GAAWOW_PORTAL.enrollment
     window.GAAWOW_PORTAL.institution
     window.GAAWOW_PORTAL.course
     window.GAAWOW_PORTAL.department
     window.GAAWOW_PORTAL.class
  */

  window.GAAWOW_PORTAL = {

    get user() {
      return currentUser;
    },

    get student() {
      return currentStudent;
    },

    get enrollment() {
      return currentEnrollment;
    },

    get institution() {
      return currentInstitution;
    },

    get course() {
      return currentCourse;
    },

    get department() {
      return currentDepartment;
    },

    get class() {
      return currentClass;
    },

    get grades() {
      return gradesData;
    },

    get certificates() {
      return certificatesData;
    },

    get payments() {
      return paymentsData;
    },

    get notifications() {
      return notificationsData;
    }

  };
}


/* ============================================================
   34. INITIALIZE
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    console.log(
      "GAAWOW Student Portal V6.3 starting..."
    );


    setupLogoutButtons();

    setupNotificationButton();

    setupAuthListener();

    exposeDebugData();

    await loadStudentPortal();

  }
);


/* ============================================================
   END OF STUDENT PORTAL JS V6.3 FINAL
   ============================================================ */
