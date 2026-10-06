/* ============================================================
   GAAWOW ACADEMY / GAAWOW EMS
   STUDENT PORTAL JS V6.4 FINAL

   PURPOSE
   ------------------------------------------------------------
   - Authenticated student
   - Student profile
   - Enrollment
   - Institution
   - Department
   - Course / Program
   - Class
   - Academic Year
   - Enrollment Status
   - Grades
   - Results
   - Certificates
   - Payments
   - Notifications
   - Logout

   IMPORTANT
   ------------------------------------------------------------
   - NO student identity is hard-coded
   - NO academic_year_id is required
   - Enrollment is loaded from the authenticated student
   - HTML IDs are aligned with this JS
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
  console.error("Supabase library was not loaded.");
  throw new Error("Supabase library was not loaded.");
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
let resultsData = [];
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

  const valid =
    value !== undefined &&
    value !== null &&
    String(value).trim() !== "";

  el.textContent =
    valid ? String(value) : fallback;
}


function setHTML(id, html) {

  const el = $(id);

  if (!el) {
    return;
  }

  el.innerHTML = html;
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
   4. VALUE FINDER
   ============================================================ */

function firstValue(
  object,
  keys,
  fallback = null
) {

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
}


/* ============================================================
   6. LOADING
   ============================================================ */

function showPortalLoading() {

  const loading = $("portalLoading");
  const app = $("studentPortal");

  if (loading) {
    loading.style.display = "flex";
  }

  if (app) {
    app.style.display = "none";
  }
}


function hidePortalLoading() {

  const loading = $("portalLoading");
  const app = $("studentPortal");

  if (loading) {
    loading.style.display = "none";
  }

  if (app) {
    app.style.display = "";
  }
}


/* ============================================================
   7. MESSAGE
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
  el.className = `message ${type}`;
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
   9. AUTH USER
   ============================================================ */

async function getAuthenticatedUser() {

  const {
    data,
    error
  } = await supabaseClient.auth.getUser();

  if (error) {

    console.error(
      "Authentication error:",
      error
    );

    return null;
  }

  return data?.user || null;
}


/* ============================================================
   10. LOAD STUDENT
   ============================================================ */

async function loadStudent(userId) {

  if (!userId) {
    return null;
  }

  const {
    data,
    error
  } = await supabaseClient
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

async function loadEnrollment(student) {

  if (!student) {
    return null;
  }

  const studentUuid =
    firstValue(
      student,
      ["id", "student_uuid"]
    );

  const studentId =
    firstValue(
      student,
      [
        "student_id",
        "student_number",
        "registration_number"
      ]
    );


  /*
     IMPORTANT
     ----------------------------------------------------------
     We do NOT use academic_year_id.
     We first search using student_id.
  */

  let rows = [];


  /* ----------------------------------------------------------
     OPTION 1: students.id
  ---------------------------------------------------------- */

  if (studentUuid) {

    const result =
      await supabaseClient
        .from("enrollments")
        .select("*")
        .eq(
          "student_id",
          studentUuid
        );

    if (
      !result.error &&
      Array.isArray(result.data)
    ) {
      rows = result.data;
    }
  }


  /* ----------------------------------------------------------
     OPTION 2: student_id contains student number
  ---------------------------------------------------------- */

  if (
    !rows.length &&
    studentId
  ) {

    const result =
      await supabaseClient
        .from("enrollments")
        .select("*")
        .eq(
          "student_id",
          studentId
        );

    if (
      !result.error &&
      Array.isArray(result.data)
    ) {
      rows = result.data;
    }
  }


  /* ----------------------------------------------------------
     OPTION 3: student_uuid
  ---------------------------------------------------------- */

  if (
    !rows.length &&
    studentUuid
  ) {

    const result =
      await supabaseClient
        .from("enrollments")
        .select("*")
        .eq(
          "student_uuid",
          studentUuid
        );

    if (
      !result.error &&
      Array.isArray(result.data)
    ) {
      rows = result.data;
    }
  }


  if (!rows.length) {
    return null;
  }


  /* ----------------------------------------------------------
     PREFER ACTIVE ENROLLMENT
  ---------------------------------------------------------- */

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
   12. GENERIC RECORD
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
  } = await supabaseClient
    .from(tableName)
    .select("*")
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (error) {

    console.warn(
      `${tableName} relation unavailable:`,
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

  currentInstitution = null;
  currentCourse = null;
  currentDepartment = null;
  currentClass = null;


  if (!enrollment) {
    return;
  }


  /* ==========================================================
     INSTITUTION
  ========================================================== */

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


  if (
    !currentInstitution &&
    enrollment.institution &&
    typeof enrollment.institution === "object"
  ) {

    currentInstitution =
      enrollment.institution;
  }


  /* ==========================================================
     COURSE
  ========================================================== */

  const courseId =
    firstValue(
      enrollment,
      [
        "course_id",
        "course_uuid",
        "courseId",
        "program_id",
        "program_uuid"
      ]
    );


  if (courseId) {

    currentCourse =
      await getRecordById(
        "courses",
        courseId
      );


    if (!currentCourse) {

      currentCourse =
        await getRecordById(
          "programs",
          courseId
        );
    }
  }


  if (
    !currentCourse &&
    enrollment.course &&
    typeof enrollment.course === "object"
  ) {

    currentCourse =
      enrollment.course;
  }


  /* ==========================================================
     DEPARTMENT
  ========================================================== */

  let departmentId =
    firstValue(
      enrollment,
      [
        "department_id",
        "department_uuid",
        "departmentId"
      ]
    );


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


  /* ==========================================================
     CLASS
  ========================================================== */

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
   14. ACADEMIC YEAR
   ============================================================ */

function getAcademicYear() {

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
          "school_year",
          "academic_session",
          "session",
          "year_name",
          "academic_year_name",
          "year"
        ]
      );


    if (value) {
      return value;
    }
  }


  return "—";
}


/* ============================================================
   15. STUDENT NAME
   ============================================================ */

function getStudentFullName() {

  const directName =
    firstValue(
      currentStudent,
      [
        "full_name",
        "name",
        "student_name",
        "display_name"
      ]
    );


  if (directName) {
    return directName;
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


  return [
    firstName,
    middleName,
    lastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Student";
}


/* ============================================================
   16. STUDENT ID
   ============================================================ */

function getStudentId() {

  return firstValue(
    currentStudent,
    [
      "student_id",
      "student_number",
      "registration_number",
      "reg_no"
    ],
    "—"
  );
}


/* ============================================================
   17. RENDER PROFILE
   ============================================================ */

function renderStudentProfile() {

  if (!currentStudent) {
    return;
  }


  const fullName =
    getStudentFullName();

  const studentId =
    getStudentId();


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
     NAME
  ---------------------------------------------------------- */

  setText(
    "studentName",
    fullName
  );

  setText(
    "welcomeStudentName",
    `${fullName} 👋`
  );

  setText(
    "profileName",
    fullName
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

  setText(
    "studentId",
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
    "studentEmail",
    email
  );

  setText(
    "studentPhone",
    phone
  );

  setText(
    "studentGender",
    gender
  );

  setText(
    "studentAddress",
    address
  );


  /* ----------------------------------------------------------
     DOB
  ---------------------------------------------------------- */

  setText(
    "profileDateOfBirth",
    formatDate(dob)
  );


  /* ----------------------------------------------------------
     ADMISSION DATE
  ---------------------------------------------------------- */

  setText(
    "admissionDate",
    formatDate(admissionDate)
  );


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


  /* ----------------------------------------------------------
     USERNAME
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


  if (photoEl) {

    photoEl.src =
      photo ||
      "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";


    photoEl.onerror =
      function () {

        this.onerror = null;

        this.src =
          "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";
      };
  }


  /* ----------------------------------------------------------
     ACCOUNT STATUS
  ---------------------------------------------------------- */

  const accountEnabled =
    currentStudent.account_enabled;


  const accountStatus =
    firstValue(
      currentStudent,
      [
        "account_status",
        "status"
      ],
      "active"
    );


  const accountActive =
    accountEnabled === false
      ? false
      : String(accountStatus)
          .toLowerCase() !== "inactive";


  renderAccountStatus(
    accountActive
  );
}


/* ============================================================
   18. ACCOUNT STATUS
   ============================================================ */

function renderAccountStatus(
  active
) {

  const value =
    active
      ? "Active"
      : "Inactive";


  const accountStatus =
    $("accountStatus");


  if (accountStatus) {

    accountStatus.textContent =
      value;

    accountStatus.classList.toggle(
      "inactive",
      !active
    );
  }


  setText(
    "studentAccountStatus",
    value
  );
}


/* ============================================================
   19. ENROLLMENT STATUS
   ============================================================ */

function getEnrollmentStatus() {

  return firstValue(
    currentEnrollment,
    [
      "enrollment_status",
      "status",
      "student_status"
    ],
    "Active"
  );
}


/* ============================================================
   20. RENDER ACADEMIC INFORMATION
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


  const institutionCode =
    firstValue(
      currentInstitution,
      [
        "code",
        "institution_code",
        "short_code"
      ]
    ) ||
    firstValue(
      currentEnrollment,
      [
        "institution_code"
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


  const courseCode =
    firstValue(
      currentCourse,
      [
        "code",
        "course_code",
        "program_code"
      ]
    ) ||
    firstValue(
      currentEnrollment,
      [
        "course_code",
        "program_code"
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


  const departmentCode =
    firstValue(
      currentDepartment,
      [
        "code",
        "department_code"
      ]
    ) ||
    firstValue(
      currentEnrollment,
      [
        "department_code"
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


  const classCode =
    firstValue(
      currentClass,
      [
        "code",
        "class_code"
      ]
    ) ||
    firstValue(
      currentEnrollment,
      [
        "class_code"
      ]
    );


  const academicYear =
    getAcademicYear();


  const enrollmentStatus =
    getEnrollmentStatus();


  /* ----------------------------------------------------------
     TOP CARDS
  ---------------------------------------------------------- */

  setText(
    "institutionName",
    institutionName
  );

  setText(
    "courseName",
    courseName
  );

  setText(
    "departmentName",
    departmentName
  );

  setText(
    "className",
    className
  );

  setText(
    "academicYear",
    academicYear
  );


  setText(
    "institutionCode",
    institutionCode
  );

  setText(
    "courseCode",
    courseCode
  );

  setText(
    "departmentCode",
    departmentCode
  );

  setText(
    "classCode",
    classCode
  );


  /* ----------------------------------------------------------
     QUICK CARDS
  ---------------------------------------------------------- */

  setText(
    "studentInstitution",
    institutionName
  );

  setText(
    "studentCourse",
    courseName
  );

  setText(
    "studentDepartment",
    departmentName
  );

  setText(
    "studentClass",
    className
  );

  setText(
    "studentAcademicYear",
    academicYear
  );


  /* ----------------------------------------------------------
     STATUS
  ---------------------------------------------------------- */

  setText(
    "enrollmentStatus",
    enrollmentStatus
  );

  setText(
    "studentEnrollmentStatus",
    enrollmentStatus
  );

  setText(
    "enrollmentStatusValue",
    enrollmentStatus
  );

  setText(
    "academicStatus",
    enrollmentStatus
  );


  /* ----------------------------------------------------------
     SUMMARY
  ---------------------------------------------------------- */

  const summary =
    $("academicSummary");


  if (!summary) {
    return;
  }


  summary.innerHTML = `

    <div class="academic-summary-grid">

      <div class="academic-item">

        <span>Institution</span>

        <strong>
          ${escapeHTML(
            institutionName || "—"
          )}
        </strong>

        <small>
          ${escapeHTML(
            institutionCode || ""
          )}
        </small>

      </div>


      <div class="academic-item">

        <span>Department</span>

        <strong>
          ${escapeHTML(
            departmentName || "—"
          )}
        </strong>

        <small>
          ${escapeHTML(
            departmentCode || ""
          )}
        </small>

      </div>


      <div class="academic-item">

        <span>Course / Program</span>

        <strong>
          ${escapeHTML(
            courseName || "—"
          )}
        </strong>

        <small>
          ${escapeHTML(
            courseCode || ""
          )}
        </small>

      </div>


      <div class="academic-item">

        <span>Class</span>

        <strong>
          ${escapeHTML(
            className || "—"
          )}
        </strong>

        <small>
          ${escapeHTML(
            classCode || ""
          )}
        </small>

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

        <span>Enrollment Status</span>

        <strong class="academic-status">
          ${escapeHTML(
            enrollmentStatus || "Active"
          )}
        </strong>

      </div>

    </div>
  `;
}


/* ============================================================
   21. GENERIC STUDENT TABLE LOADER
   ============================================================ */

async function loadStudentTable(
  tableName,
  student
) {

  const studentUuid =
    firstValue(
      student,
      ["id", "student_uuid"]
    );


  const studentNumber =
    firstValue(
      student,
      [
        "student_id",
        "student_number"
      ]
    );


  const enrollmentId =
    currentEnrollment?.id;


  /* ----------------------------------------------------------
     TRY student_id = UUID
  ---------------------------------------------------------- */

  if (studentUuid) {

    const result =
      await supabaseClient
        .from(tableName)
        .select("*")
        .eq(
          "student_id",
          studentUuid
        );


    if (
      !result.error &&
      Array.isArray(result.data)
    ) {

      return result.data;
    }
  }


  /* ----------------------------------------------------------
     TRY student_id = STUDENT NUMBER
  ---------------------------------------------------------- */

  if (studentNumber) {

    const result =
      await supabaseClient
        .from(tableName)
        .select("*")
        .eq(
          "student_id",
          studentNumber
        );


    if (
      !result.error &&
      Array.isArray(result.data)
    ) {

      return result.data;
    }
  }


  /* ----------------------------------------------------------
     TRY student_uuid
  ---------------------------------------------------------- */

  if (studentUuid) {

    const result =
      await supabaseClient
        .from(tableName)
        .select("*")
        .eq(
          "student_uuid",
          studentUuid
        );


    if (
      !result.error &&
      Array.isArray(result.data)
    ) {

      return result.data;
    }
  }


  /* ----------------------------------------------------------
     TRY enrollment_id
  ---------------------------------------------------------- */

  if (enrollmentId) {

    const result =
      await supabaseClient
        .from(tableName)
        .select("*")
        .eq(
          "enrollment_id",
          enrollmentId
        );


    if (
      !result.error &&
      Array.isArray(result.data)
    ) {

      return result.data;
    }
  }


  return [];
}


/* ============================================================
   22. LOAD GRADES
   ============================================================ */

async function loadGrades() {

  gradesData = [];


  if (!currentStudent) {
    renderGrades();
    return;
  }


  gradesData =
    await loadStudentTable(
      "grades",
      currentStudent
    );


  renderGrades();
}


/* ============================================================
   23. RENDER GRADES
   ============================================================ */

function renderGrades() {

  const container =
    $("gradesContainer");


  if (!container) {
    return;
  }


  setText(
    "resultsCount",
    gradesData.length,
    "0"
  );


  if (!gradesData.length) {

    container.innerHTML = `
      <div class="empty-state">
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
              "total_score"
            ],
            "—"
          );


        const maxScore =
          firstValue(
            grade,
            [
              "max_score",
              "total_marks",
              "maximum_score"
            ]
          );


        const letter =
          firstValue(
            grade,
            [
              "letter_grade",
              "grade_letter",
              "grade",
              "result"
            ],
            "—"
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
                maxScore
                  ? ` / ${escapeHTML(maxScore)}`
                  : ""
              }
            </td>

            <td>
              ${escapeHTML(letter)}
            </td>

          </tr>

        `;
      }
    )
    .join("");


  container.innerHTML = `

    <div class="table-responsive">

      <table class="student-table">

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
   24. LOAD RESULTS
   ============================================================ */

async function loadResults() {

  resultsData = [];


  if (!currentStudent) {
    renderResults();
    return;
  }


  resultsData =
    await loadStudentTable(
      "results",
      currentStudent
    );


  /*
     If results table contains unpublished records,
     filter only when is_published exists.
  */

  if (
    resultsData.length &&
    Object.prototype.hasOwnProperty.call(
      resultsData[0],
      "is_published"
    )
  ) {

    resultsData =
      resultsData.filter(
        item =>
          item.is_published === true
      );
  }


  renderResults();
}


/* ============================================================
   25. RENDER RESULTS
   ============================================================ */

function renderResults() {

  const container =
    $("resultsContainer");


  if (!container) {
    return;
  }


  setText(
    "resultsCountBadge",
    `${resultsData.length} RESULTS`
  );


  if (!resultsData.length) {

    container.innerHTML = `
      <div class="empty-state">
        No published results available yet.
      </div>
    `;

    return;
  }


  const rows =
    resultsData.map(
      (result, index) => {

        const subject =
          firstValue(
            result,
            [
              "subject_name",
              "subject",
              "course_name",
              "name"
            ],
            "Subject"
          );


        const score =
          firstValue(
            result,
            [
              "score",
              "marks",
              "total_score"
            ],
            "—"
          );


        const grade =
          firstValue(
            result,
            [
              "grade",
              "letter_grade",
              "grade_letter",
              "result"
            ],
            "—"
          );


        const status =
          firstValue(
            result,
            [
              "status",
              "result_status"
            ],
            "Published"
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
              ${escapeHTML(score)}
            </td>

            <td>
              ${escapeHTML(grade)}
            </td>

            <td>
              ${escapeHTML(status)}
            </td>

          </tr>

        `;
      }
    )
    .join("");


  container.innerHTML = `

    <div class="table-responsive">

      <table class="student-table">

        <thead>

          <tr>
            <th>#</th>
            <th>Subject</th>
            <th>Score</th>
            <th>Grade</th>
            <th>Status</th>
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
   26. LOAD CERTIFICATES
   ============================================================ */

async function loadCertificates() {

  certificatesData = [];


  if (!currentStudent) {
    renderCertificates();
    return;
  }


  certificatesData =
    await loadStudentTable(
      "certificates",
      currentStudent
    );


  renderCertificates();
}


/* ============================================================
   27. RENDER CERTIFICATES
   ============================================================ */

function renderCertificates() {

  const container =
    $("certificatesContainer");


  setText(
    "certificatesCount",
    certificatesData.length,
    "0"
  );


  if (!container) {
    return;
  }


  if (!certificatesData.length) {

    container.innerHTML = `
      <div class="empty-state">
        No certificates available yet.
      </div>
    `;

    return;
  }


  container.innerHTML =
    certificatesData
      .map(
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


          const number =
            firstValue(
              certificate,
              [
                "certificate_number",
                "certificate_no",
                "serial_number"
              ]
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


          return `

            <div class="certificate-item">

              <div>

                <strong>
                  ${escapeHTML(title)}
                </strong>

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

              </div>


              <div>

                <span class="status-pill">
                  ${escapeHTML(status)}
                </span>

                <small>
                  ${escapeHTML(
                    formatDate(date)
                  )}
                </small>

              </div>

            </div>

          `;
        }
      )
      .join("");
}


/* ============================================================
   28. LOAD PAYMENTS
   ============================================================ */

async function loadPayments() {

  paymentsData = [];


  if (!currentStudent) {
    renderPayments();
    return;
  }


  paymentsData =
    await loadStudentTable(
      "payments",
      currentStudent
    );


  renderPayments();
}


/* ============================================================
   29. RENDER PAYMENTS
   ============================================================ */

function renderPayments() {

  const container =
    $("paymentsContainer");


  setText(
    "paymentsCount",
    paymentsData.length,
    "0"
  );


  if (!container) {
    return;
  }


  if (!paymentsData.length) {

    container.innerHTML = `
      <div class="empty-state">
        No payment records available yet.
      </div>
    `;

    return;
  }


  container.innerHTML =
    paymentsData
      .map(
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

              <span class="status-pill">
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
}


/* ============================================================
   30. LOAD NOTIFICATIONS
   ============================================================ */

async function loadNotifications() {

  notificationsData = [];


  if (!currentStudent) {
    renderNotifications();
    return;
  }


  notificationsData =
    await loadStudentTable(
      "student_notifications",
      currentStudent
    );


  renderNotifications();
}


/* ============================================================
   31. RENDER NOTIFICATIONS
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
        (
          item.is_read === undefined &&
          !item.read_at
        )
    ).length;


  setText(
    "notificationsCount",
    unread
  );


  if (!notificationsData.length) {

    container.innerHTML = `
      <div class="empty-state">
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


          const unread =
            notification.is_read === false;


          return `

            <div
              class="
                notification-item
                ${unread ? "unread" : ""}
              "
            >

              <strong>
                ${escapeHTML(title)}
              </strong>

              <p>
                ${escapeHTML(message)}
              </p>

              <small>
                ${escapeHTML(
                  formatDate(
                    notification.created_at
                  )
                )}
              </small>

            </div>

          `;
        }
      )
      .join("");
}


/* ============================================================
   32. MARK NOTIFICATIONS READ
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
        read_at:
          new Date().toISOString()
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
      "Could not mark notifications:",
      result.error
    );

    return;
  }


  await loadNotifications();
}


/* ============================================================
   33. LOAD ALL PORTAL DATA
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
        "Student account was not found for this login."
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
        currentStudent
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

      loadResults(),

      loadCertificates(),

      loadPayments(),

      loadNotifications()

    ]);


    /* --------------------------------------------------------
       SHOW
    -------------------------------------------------------- */

    hidePortalLoading();


    console.log(
      "GAAWOW Student Portal V6.4 loaded successfully."
    );

  } catch (error) {

    console.error(
      "Student Portal V6.4 error:",
      error
    );


    showPortalError(error);
  }
}


/* ============================================================
   34. ERROR
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
}


/* ============================================================
   35. LOGOUT BUTTONS
   ============================================================ */

function setupLogoutButtons() {

  const buttons = [
    $("logoutBtn"),
    $("studentLogoutBtn")
  ];


  buttons.forEach(button => {

    if (!button) {
      return;
    }


    button.addEventListener(
      "click",
      logoutStudent
    );

  });
}


/* ============================================================
   36. NOTIFICATION BUTTON
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
   37. AUTH STATE
   ============================================================ */

function setupAuthListener() {

  supabaseClient.auth.onAuthStateChange(
    (
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


      if (
        event === "SIGNED_IN" &&
        session?.user
      ) {

        currentUser =
          session.user;
      }

    }
  );
}


/* ============================================================
   38. DEBUG
   ============================================================ */

function exposeDebugData() {

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

    get academicYear() {
      return getAcademicYear();
    },

    get grades() {
      return gradesData;
    },

    get results() {
      return resultsData;
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
   39. INITIALIZE
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    console.log(
      "GAAWOW Student Portal V6.4 starting..."
    );


    setupLogoutButtons();

    setupNotificationButton();

    setupAuthListener();

    exposeDebugData();

    await loadStudentPortal();

  }
);


/* ============================================================
   END
   ============================================================ */
