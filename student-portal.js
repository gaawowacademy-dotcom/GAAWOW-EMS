/* ============================================================
   GAAWOW EMS
   STUDENT PORTAL JS V6.1 FINAL

   Purpose:
   - Student authentication
   - Load student using auth_user_id
   - Load institution
   - Load enrollment / department / course / class
   - Load grades
   - Load certificates
   - Load payments
   - Load notifications
   - Support the V6 student-portal.html IDs
   - Support older portal IDs
   - Handle loading screen correctly
   - Never expose Supabase service-role key

   Supabase:
   https://mytyvqwrxnxpxnxpiicj.supabase.co
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     1. SUPABASE
     ============================================================ */

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_ANON_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    console.error(
      "GAAWOW Student Portal: Supabase library is not loaded."
    );

    showStartupError(
      "System could not start. Supabase library is not loaded."
    );

    return;
  }

  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );


  /* ============================================================
     2. DOM HELPERS
     ============================================================ */

  const $ = (id) =>
    document.getElementById(id);

  const first = (...ids) => {
    for (const id of ids) {
      const element = $(id);

      if (element) {
        return element;
      }
    }

    return null;
  };


  /* ============================================================
     3. DOM REFERENCES
     ============================================================ */

  const els = {

    /* Main portal */
    loading:
      $("portalLoading"),

    app:
      $("portalApp"),

    portal:
      $("studentPortal"),

    message:
      first(
        "portalMessage",
        "message"
      ),

    /* Names */
    welcomeName:
      first(
        "welcomeStudentName",
        "studentNameTop",
        "studentName"
      ),

    studentNameTop:
      $("studentNameTop"),

    studentName:
      $("studentName"),

    /* Student ID */
    studentNumber:
      first(
        "studentNumber",
        "studentId",
        "profileStudentId"
      ),

    profileStudentId:
      $("profileStudentId"),

    /* Profile */
    studentFullName:
      first(
        "studentFullName",
        "fullName"
      ),

    profileEmail:
      first(
        "profileEmail",
        "email"
      ),

    profilePhone:
      first(
        "profilePhone",
        "phone"
      ),

    profileGender:
      first(
        "profileGender",
        "gender"
      ),

    profileAddress:
      first(
        "profileAddress",
        "address"
      ),

    studentPhoto:
      first(
        "studentPhoto",
        "photoPreview"
      ),

    studentAdmissionDate:
      first(
        "studentAdmissionDate",
        "admissionDate",
        "enrollmentDate"
      ),

    dateOfBirth:
      first(
        "dateOfBirth",
        "studentDateOfBirth"
      ),

    enrollmentDate:
      first(
        "enrollmentDate",
        "studentEnrollmentDate"
      ),

    lastLogin:
      first(
        "lastLogin",
        "studentLastLogin"
      ),

    loginUsername:
      $("loginUsername"),

    /* Account */
    accountStatus:
      first(
        "accountStatus",
        "studentAccountStatus",
        "profileAccountStatus"
      ),

    /* Academic */
    academicSummary:
      first(
        "academicSummary",
        "studentAcademicSummary",
        "academicInformation"
      ),

    institutionName:
      first(
        "institutionName",
        "studentInstitution",
        "institution",
        "profileInstitution",
        "dashboardInstitution"
      ),

    institutionCode:
      first(
        "institutionCode",
        "studentInstitutionCode"
      ),

    departmentName:
      first(
        "departmentName",
        "studentDepartment",
        "department",
        "profileDepartment",
        "dashboardDepartment"
      ),

    departmentCode:
      first(
        "departmentCode",
        "studentDepartmentCode"
      ),

    courseName:
      first(
        "courseName",
        "studentCourse",
        "course",
        "profileCourse",
        "programName",
        "studentProgram",
        "dashboardCourse"
      ),

    courseCode:
      first(
        "courseCode",
        "studentCourseCode"
      ),

    className:
      first(
        "className",
        "studentClass",
        "class",
        "profileClass",
        "dashboardClass"
      ),

    classCode:
      first(
        "classCode",
        "studentClassCode"
      ),

    academicYear:
      first(
        "academicYear",
        "studentAcademicYear",
        "classAcademicYear"
      ),

    enrollmentStatus:
      first(
        "enrollmentStatus",
        "studentEnrollmentStatus",
        "enrollmentStatusValue",
        "academicStatus"
      ),

    /* Records */
    grades:
      first(
        "gradesContainer",
        "gradesList",
        "studentGrades",
        "resultsContainer"
      ),

    certificates:
      first(
        "certificatesContainer",
        "certificatesList",
        "studentCertificates"
      ),

    payments:
      first(
        "paymentsContainer",
        "paymentsList",
        "studentPayments"
      ),

    notifications:
      first(
        "notificationsList",
        "studentNotifications"
      ),

    /* Counters */
    resultsCount:
      $("resultsCount"),

    certificatesCount:
      $("certificatesCount"),

    notificationsCount:
      $("notificationsCount"),

    /* Buttons */
    logout:
      first(
        "logoutBtn",
        "studentLogoutBtn"
      ),

    logout2:
      $("studentLogoutBtn"),

    markAllRead:
      $("markAllReadBtn"),
  };


  /* ============================================================
     4. STATE
     ============================================================ */

  let currentSession = null;

  let currentStudent = null;

  let currentEnrollment = null;

  let currentInstitution = null;

  let currentDepartment = null;

  let currentCourse = null;

  let currentClass = null;

  let currentAcademicYear = null;

  let currentGrades = [];

  let currentCertificates = [];

  let currentPayments = [];

  let currentNotifications = [];

  let initialized = false;


  /* ============================================================
     5. BASIC HELPERS
     ============================================================ */

  function safeString(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "";
    }

    return String(value).trim();
  }


  function displayValue(value) {
    const text = safeString(value);

    return text || "—";
  }


  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function normalize(value) {
    return safeString(value)
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
  }


  function getObjectValue(
    object,
    keys
  ) {
    if (!object) {
      return "";
    }

    for (const key of keys) {
      if (
        Object.prototype.hasOwnProperty.call(
          object,
          key
        )
      ) {
        const value = object[key];

        if (
          value !== null &&
          value !== undefined &&
          value !== ""
        ) {
          return value;
        }
      }
    }

    return "";
  }


  function setText(
    element,
    value
  ) {
    if (!element) return;

    element.textContent =
      displayValue(value);
  }


  function setHtml(
    element,
    html
  ) {
    if (!element) return;

    element.innerHTML = html;
  }


  function formatDate(value) {
    if (!value) {
      return "—";
    }

    try {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      return new Intl.DateTimeFormat(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      ).format(date);

    } catch {
      return String(value);
    }
  }


  function formatDateTime(value) {
    if (!value) {
      return "—";
    }

    try {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      return new Intl.DateTimeFormat(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(date);

    } catch {
      return String(value);
    }
  }


  function formatMoney(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return String(value);
    }

    return number.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }


  /* ============================================================
     6. MESSAGE
     ============================================================ */

  function showMessage(
    text,
    type = "info"
  ) {
    const element = els.message;

    if (!element) {
      return;
    }

    element.textContent =
      safeString(text);

    element.className =
      `message ${type}`;

    element.style.display =
      "block";
  }


  function hideMessage() {
    const element = els.message;

    if (!element) {
      return;
    }

    element.textContent = "";

    element.className =
      "message";

    element.style.display =
      "none";
  }


  function showStartupError(
    text
  ) {
    const loading =
      $("portalLoading");

    if (loading) {
      loading.innerHTML = `
        <div style="
          max-width:420px;
          padding:25px;
          text-align:center;
        ">
          <div style="
            font-size:42px;
            margin-bottom:12px;
          ">⚠️</div>

          <h3 style="
            color:#0B1E63;
            margin-bottom:8px;
          ">
            Student Portal Error
          </h3>

          <p style="
            color:#64748B;
            font-size:13px;
            line-height:1.6;
          ">
            ${escapeHtml(text)}
          </p>

          <button
            type="button"
            onclick="location.reload()"
            style="
              margin-top:18px;
              border:0;
              background:#0B1E63;
              color:#fff;
              padding:11px 18px;
              border-radius:9px;
              cursor:pointer;
              font-weight:700;
            "
          >
            Reload
          </button>
        </div>
      `;
    }
  }


  /* ============================================================
     7. LOADING SCREEN
     ============================================================ */

  function showLoadingScreen() {
    if (els.loading) {
      els.loading.classList.remove(
        "hidden"
      );

      els.loading.style.display =
        "flex";
    }

    if (els.app) {
      els.app.classList.add(
        "hidden"
      );

      els.app.style.display =
        "none";
    }
  }


  function showPortal() {
    if (els.loading) {
      els.loading.classList.add(
        "hidden"
      );

      els.loading.style.display =
        "none";
    }

    if (els.app) {
      els.app.classList.remove(
        "hidden"
      );

      els.app.style.display =
        "block";
    }
  }


  /* ============================================================
     8. AUTH SESSION
     ============================================================ */

  async function getSession() {
    const {
      data,
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (!data?.session?.user?.id) {
      throw new Error(
        "Access denied or login session expired. Please login again."
      );
    }

    return data.session;
  }


  async function refreshSession() {
    const {
      data,
      error,
    } = await supabase.auth.refreshSession();

    if (error) {
      console.warn(
        "GAAWOW session refresh error:",
        error
      );

      return null;
    }

    return data?.session || null;
  }


  /* ============================================================
     9. LOAD STUDENT
     ============================================================ */

  async function loadCurrentStudent(
    userId
  ) {
    console.log(
      "GAAWOW Student Portal: loading student for auth_user_id:",
      userId
    );

    const {
      data,
      error,
    } = await supabase
      .from("students")
      .select("*")
      .eq(
        "auth_user_id",
        userId
      )
      .maybeSingle();

    if (error) {
      console.error(
        "STUDENT QUERY ERROR:",
        error
      );

      throw new Error(
        `Student information could not be loaded: ${error.message}`
      );
    }

    if (!data) {
      throw new Error(
        "Your login account is not linked to a student record. Please contact GAAWOW Academy administration."
      );
    }

    console.log(
      "GAAWOW Student Portal: student loaded:",
      data
    );

    return data;
  }


  /* ============================================================
     10. RENDER BASIC STUDENT DATA
     ============================================================ */

  function renderStudent(
    student
  ) {
    currentStudent =
      student;

    const fullName =
      getObjectValue(
        student,
        [
          "full_name",
          "name",
          "student_name",
          "fullname",
        ]
      );

    const studentId =
      getObjectValue(
        student,
        [
          "student_id",
          "registration_number",
          "registration_no",
          "admission_number",
        ]
      );

    const email =
      getObjectValue(
        student,
        [
          "email",
          "student_email",
        ]
      );

    const phone =
      getObjectValue(
        student,
        [
          "phone",
          "phone_number",
          "mobile",
          "mobile_number",
        ]
      );

    const gender =
      getObjectValue(
        student,
        [
          "gender",
          "sex",
        ]
      );

    const address =
      getObjectValue(
        student,
        [
          "address",
          "residence",
          "location",
        ]
      );

    const dob =
      getObjectValue(
        student,
        [
          "date_of_birth",
          "dob",
          "birth_date",
        ]
      );

    const admissionDate =
      getObjectValue(
        student,
        [
          "admission_date",
          "enrollment_date",
          "admitted_at",
        ]
      );

    const photo =
      getObjectValue(
        student,
        [
          "photo_url",
          "photo",
          "profile_photo",
          "avatar_url",
          "image_url",
        ]
      );

    const status =
      getObjectValue(
        student,
        [
          "status",
          "student_status",
        ]
      );

    const accountEnabled =
      getObjectValue(
        student,
        [
          "account_enabled",
          "is_active",
        ]
      );

    const username =
      getObjectValue(
        student,
        [
          "login_username",
          "username",
          "email",
        ]
      );

    const lastLogin =
      getObjectValue(
        student,
        [
          "last_login_at",
          "last_login",
        ]
      );

    /* Name */
    setText(
      els.welcomeName,
      fullName
    );

    setText(
      els.studentNameTop,
      fullName
    );

    setText(
      els.studentName,
      fullName
    );

    setText(
      els.studentFullName,
      fullName
    );

    /* ID */
    setText(
      els.studentNumber,
      studentId
    );

    setText(
      els.profileStudentId,
      studentId
    );

    /* Contact */
    setText(
      els.profileEmail,
      email
    );

    setText(
      els.profilePhone,
      phone
    );

    setText(
      els.profileGender,
      gender
    );

    setText(
      els.profileAddress,
      address
    );

    /* DOB */
    setText(
      els.dateOfBirth,
      formatDate(dob)
    );

    /* Admission */
    setText(
      els.studentAdmissionDate,
      formatDate(admissionDate)
    );

    setText(
      els.enrollmentDate,
      formatDate(admissionDate)
    );

    /* Login */
    setText(
      els.loginUsername,
      username
    );

    setText(
      els.lastLogin,
      formatDateTime(lastLogin)
    );

    /* Account */
    renderAccountStatus(
      status,
      accountEnabled
    );

    /* Photo */
    renderPhoto(
      photo,
      fullName
    );

    /* Student email can also populate old IDs */
    const oldEmail =
      $("email");

    if (oldEmail) {
      oldEmail.textContent =
        displayValue(email);
    }

    /* Debug */
    console.log(
      "GAAWOW Student Portal basic data rendered."
    );
  }


  /* ============================================================
     11. PHOTO
     ============================================================ */

  function renderPhoto(
    photoUrl,
    fullName
  ) {
    if (!els.studentPhoto) {
      return;
    }

    if (photoUrl) {
      els.studentPhoto.src =
        photoUrl;

      els.studentPhoto.alt =
        `${fullName || "Student"} photo`;

      els.studentPhoto.onerror =
        () => {
          els.studentPhoto.src =
            "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";
        };

      return;
    }

    els.studentPhoto.src =
      "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";

    els.studentPhoto.alt =
      "GAAWOW Academy";
  }


  /* ============================================================
     12. ACCOUNT STATUS
     ============================================================ */

  function renderAccountStatus(
    status,
    accountEnabled
  ) {
    let active =
      false;

    if (
      accountEnabled === true ||
      accountEnabled === "true" ||
      accountEnabled === 1
    ) {
      active = true;
    }

    if (
      safeString(status).toLowerCase() ===
        "active"
    ) {
      active = true;
    }

    const text =
      active
        ? "Active"
        : (
            safeString(status) ||
            "Inactive"
          );

    const elements = [
      $("accountStatus"),
      $("studentAccountStatus"),
      $("profileAccountStatus"),
    ].filter(Boolean);

    for (const element of elements) {
      element.textContent =
        text;

      element.classList.toggle(
        "inactive",
        !active
      );

      element.classList.toggle(
        "active",
        active
      );
    }
  }


  /* ============================================================
     13. GENERIC TABLE LOADER
     ============================================================ */

  async function queryTable(
    tableName,
    options = {}
  ) {
    try {
      let query =
        supabase
          .from(tableName)
          .select("*");

      if (options.limit) {
        query =
          query.limit(
            options.limit
          );
      }

      if (options.order) {
        query =
          query.order(
            options.order.column,
            {
              ascending:
                options.order.ascending ??
                false,
            }
          );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        console.warn(
          `GAAWOW Portal: ${tableName} query failed:`,
          error.message
        );

        return {
          data: null,
          error,
        };
      }

      return {
        data: data || [],
        error: null,
      };

    } catch (error) {
      console.warn(
        `GAAWOW Portal: ${tableName} exception:`,
        error
      );

      return {
        data: null,
        error,
      };
    }
  }


  /* ============================================================
     14. FIND RECORD BY ID
     ============================================================ */

  function findById(
    records,
    id
  ) {
    if (
      !Array.isArray(records) ||
      !id
    ) {
      return null;
    }

    const target =
      String(id);

    return (
      records.find(
        (row) =>
          String(
            row?.id ?? ""
          ) === target
      ) || null
    );
  }


  /* ============================================================
     15. LOAD INSTITUTION
     ============================================================ */

  async function loadInstitution(
    student
  ) {
    const institutionId =
      getObjectValue(
        student,
        [
          "institution_id",
        ]
      );

    if (!institutionId) {
      console.warn(
        "Student has no institution_id."
      );

      return null;
    }

    const {
      data,
      error,
    } = await supabase
      .from("institutions")
      .select("*")
      .eq(
        "id",
        institutionId
      )
      .maybeSingle();

    if (error) {
      console.warn(
        "Institution query failed:",
        error.message
      );

      return null;
    }

    currentInstitution =
      data || null;

    return currentInstitution;
  }


  /* ============================================================
     16. LOAD ENROLLMENT
     ============================================================ */

  async function loadEnrollment(
    student
  ) {
    const studentDbId =
      student?.id;

    const studentAuthId =
      student?.auth_user_id;

    const candidates = [
      "enrollments",
      "student_enrollments",
      "enrollment",
    ];

    for (
      const tableName of candidates
    ) {
      const result =
        await queryTable(
          tableName,
          {
            limit: 100,
          }
        );

      if (
        !Array.isArray(
          result.data
        ) ||
        !result.data.length
      ) {
        continue;
      }

      const records =
        result.data;

      const matching =
        records.find(
          (row) => {
            const ids = [
              row.student_id,
              row.student_db_id,
              row.student_uuid,
              row.student,
            ]
              .filter(
                (value) =>
                  value !== null &&
                  value !== undefined
              )
              .map(String);

            if (
              studentDbId &&
              ids.includes(
                String(studentDbId)
              )
            ) {
              return true;
            }

            if (
              studentAuthId &&
              ids.includes(
                String(studentAuthId)
              )
            ) {
              return true;
            }

            return false;
          }
        );

      if (matching) {
        console.log(
          `GAAWOW Portal: enrollment found in ${tableName}`,
          matching
        );

        currentEnrollment =
          matching;

        return matching;
      }
    }

    console.warn(
      "No enrollment record found."
    );

    return null;
  }


  /* ============================================================
     17. LOAD ACADEMIC TABLES
     ============================================================ */

  async function loadAcademicRelations(
    enrollment,
    student
  ) {
    let department = null;
    let course = null;
    let studentClass = null;
    let academicYear = null;

    const departmentId =
      getObjectValue(
        enrollment,
        [
          "department_id",
        ]
      ) ||
      getObjectValue(
        student,
        [
          "department_id",
        ]
      );

    const courseId =
      getObjectValue(
        enrollment,
        [
          "course_id",
          "program_id",
        ]
      ) ||
      getObjectValue(
        student,
        [
          "course_id",
          "program_id",
        ]
      );

    const classId =
      getObjectValue(
        enrollment,
        [
          "class_id",
          "classroom_id",
        ]
      ) ||
      getObjectValue(
        student,
        [
          "class_id",
        ]
      );

    const academicYearId =
      getObjectValue(
        enrollment,
        [
          "academic_year_id",
          "academic_session_id",
        ]
      ) ||
      getObjectValue(
        student,
        [
          "academic_year_id",
        ]
      );


    /* ----------------------------------------------------------
       Department
       ---------------------------------------------------------- */

    if (departmentId) {
      const result =
        await queryTable(
          "departments",
          {
            limit: 1000,
          }
        );

      department =
        findById(
          result.data,
          departmentId
        );
    }


    /* ----------------------------------------------------------
       Course
       ---------------------------------------------------------- */

    if (courseId) {
      const candidates = [
        "courses",
        "programs",
      ];

      for (
        const tableName of candidates
      ) {
        const result =
          await queryTable(
            tableName,
            {
              limit: 1000,
            }
          );

        course =
          findById(
            result.data,
            courseId
          );

        if (course) {
          break;
        }
      }
    }


    /* ----------------------------------------------------------
       Class
       ---------------------------------------------------------- */

    if (classId) {
      const candidates = [
        "classes",
        "student_classes",
        "classrooms",
      ];

      for (
        const tableName of candidates
      ) {
        const result =
          await queryTable(
            tableName,
            {
              limit: 1000,
            }
          );

        studentClass =
          findById(
            result.data,
            classId
          );

        if (studentClass) {
          break;
        }
      }
    }


    /* ----------------------------------------------------------
       Academic Year
       ---------------------------------------------------------- */

    if (academicYearId) {
      const candidates = [
        "academic_years",
        "academic_sessions",
        "academic_year",
      ];

      for (
        const tableName of candidates
      ) {
        const result =
          await queryTable(
            tableName,
            {
              limit: 1000,
            }
          );

        academicYear =
          findById(
            result.data,
            academicYearId
          );

        if (academicYear) {
          break;
        }
      }
    }


    currentDepartment =
      department;

    currentCourse =
      course;

    currentClass =
      studentClass;

    currentAcademicYear =
      academicYear;

    return {
      department,
      course,
      studentClass,
      academicYear,
    };
  }


  /* ============================================================
     18. RESOLVE ACADEMIC VALUES DIRECTLY
     ============================================================ */

  function resolveAcademicValues(
    student,
    enrollment,
    relations
  ) {
    const department =
      relations?.department;

    const course =
      relations?.course;

    const studentClass =
      relations?.studentClass;

    const academicYear =
      relations?.academicYear;

    const institution =
      currentInstitution;


    const institutionName =
      getObjectValue(
        institution,
        [
          "name",
          "institution_name",
          "title",
        ]
      ) ||
      getObjectValue(
        student,
        [
          "institution_name",
        ]
      );


    const institutionCode =
      getObjectValue(
        institution,
        [
          "code",
          "institution_code",
          "short_code",
        ]
      ) ||
      getObjectValue(
        student,
        [
          "institution_code",
        ]
      );


    const departmentName =
      getObjectValue(
        department,
        [
          "name",
          "department_name",
          "title",
        ]
      ) ||
      getObjectValue(
        enrollment,
        [
          "department_name",
        ]
      ) ||
      getObjectValue(
        student,
        [
          "department_name",
        ]
      );


    const departmentCode =
      getObjectValue(
        department,
        [
          "code",
          "department_code",
          "short_code",
        ]
      ) ||
      getObjectValue(
        enrollment,
        [
          "department_code",
        ]
      );


    const courseName =
      getObjectValue(
        course,
        [
          "name",
          "course_name",
          "program_name",
          "title",
        ]
      ) ||
      getObjectValue(
        enrollment,
        [
          "course_name",
          "program_name",
        ]
      ) ||
      getObjectValue(
        student,
        [
          "course_name",
          "program_name",
        ]
      );


    const courseCode =
      getObjectValue(
        course,
        [
          "code",
          "course_code",
          "program_code",
          "short_code",
        ]
      ) ||
      getObjectValue(
        enrollment,
        [
          "course_code",
          "program_code",
        ]
      );


    const className =
      getObjectValue(
        studentClass,
        [
          "name",
          "class_name",
          "title",
          "class_label",
        ]
      ) ||
      getObjectValue(
        enrollment,
        [
          "class_name",
          "class_label",
        ]
      ) ||
      getObjectValue(
        student,
        [
          "class_name",
        ]
      );


    const classCode =
      getObjectValue(
        studentClass,
        [
          "code",
          "class_code",
          "short_code",
        ]
      ) ||
      getObjectValue(
        enrollment,
        [
          "class_code",
        ]
      );


    const year =
      getObjectValue(
        academicYear,
        [
          "name",
          "year",
          "academic_year",
          "title",
          "label",
        ]
      ) ||
      getObjectValue(
        enrollment,
        [
          "academic_year",
          "academic_year_name",
          "year",
        ]
      ) ||
      getObjectValue(
        studentClass,
        [
          "academic_year",
          "year",
        ]
      ) ||
      getObjectValue(
        student,
        [
          "academic_year",
        ]
      );


    const status =
      getObjectValue(
        enrollment,
        [
          "status",
          "enrollment_status",
        ]
      ) ||
      getObjectValue(
        student,
        [
          "status",
        ]
      );


    return {
      institutionName,
      institutionCode,
      departmentName,
      departmentCode,
      courseName,
      courseCode,
      className,
      classCode,
      academicYear:
        year,
      status,
    };
  }


  /* ============================================================
     19. RENDER ACADEMIC INFORMATION
     ============================================================ */

  function renderAcademicSummary(
    values
  ) {
    const {
      institutionName,
      institutionCode,
      departmentName,
      departmentCode,
      courseName,
      courseCode,
      className,
      classCode,
      academicYear,
      status,
    } = values;


    /* Hidden / compatibility IDs */

    setText(
      els.institutionName,
      institutionName
    );

    setText(
      els.institutionCode,
      institutionCode
    );

    setText(
      els.departmentName,
      departmentName
    );

    setText(
      els.departmentCode,
      departmentCode
    );

    setText(
      els.courseName,
      courseName
    );

    setText(
      els.courseCode,
      courseCode
    );

    setText(
      els.className,
      className
    );

    setText(
      els.classCode,
      classCode
    );

    setText(
      els.academicYear,
      academicYear
    );

    setText(
      els.enrollmentStatus,
      status
    );


    /* ----------------------------------------------------------
       Academic summary card
       ---------------------------------------------------------- */

    if (els.academicSummary) {
      els.academicSummary.innerHTML = `
        <div class="academic-summary-grid">

          <div class="academic-item">
            <span>Institution</span>
            <strong>
              ${escapeHtml(
                displayValue(
                  institutionName
                )
              )}
            </strong>
          </div>

          <div class="academic-item">
            <span>Department</span>
            <strong>
              ${escapeHtml(
                displayValue(
                  departmentName
                )
              )}
            </strong>
          </div>

          <div class="academic-item">
            <span>Course / Program</span>
            <strong>
              ${escapeHtml(
                displayValue(
                  courseName
                )
              )}
            </strong>
          </div>

          <div class="academic-item">
            <span>Class</span>
            <strong>
              ${escapeHtml(
                displayValue(
                  className
                )
              )}
            </strong>
          </div>

          <div class="academic-item">
            <span>Academic Year</span>
            <strong>
              ${escapeHtml(
                displayValue(
                  academicYear
                )
              )}
            </strong>
          </div>

          <div class="academic-item">
            <span>Status</span>
            <strong class="academic-status">
              ${escapeHtml(
                displayValue(
                  status
                )
              )}
            </strong>
          </div>

        </div>
      `;
    }


    console.log(
      "GAAWOW Academic values:",
      values
    );
  }


  /* ============================================================
     20. RECORD MATCHING
     ============================================================ */

  function recordBelongsToStudent(
    row,
    student
  ) {
    if (!row || !student) {
      return false;
    }

    const possibleStudentIds = [
      student.id,
      student.auth_user_id,
      student.student_id,
    ]
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          value !== ""
      )
      .map(String);


    const possibleRowValues = [
      row.student_id,
      row.student_db_id,
      row.student_uuid,
      row.student_auth_id,
      row.auth_user_id,
      row.student,
    ]
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          value !== ""
      )
      .map(String);


    return possibleRowValues.some(
      (value) =>
        possibleStudentIds.includes(
          value
        )
    );
  }


  /* ============================================================
     21. LOAD STUDENT RECORDS
     ============================================================ */

  async function loadStudentRecords(
    student
  ) {
    const recordConfigs = {

      grades: [
        "grades",
        "student_grades",
        "results",
        "student_results",
        "marks",
      ],

      certificates: [
        "certificates",
        "student_certificates",
      ],

      payments: [
        "payments",
        "student_payments",
        "payment_records",
        "fees_payments",
      ],

      notifications: [
        "notifications",
        "student_notifications",
      ],
    };


    /* ----------------------------------------------------------
       GRADES
       ---------------------------------------------------------- */

    currentGrades =
      await loadMatchingRecords(
        recordConfigs.grades,
        student
      );


    /* ----------------------------------------------------------
       CERTIFICATES
       ---------------------------------------------------------- */

    currentCertificates =
      await loadMatchingRecords(
        recordConfigs.certificates,
        student
      );


    /* ----------------------------------------------------------
       PAYMENTS
       ---------------------------------------------------------- */

    currentPayments =
      await loadMatchingRecords(
        recordConfigs.payments,
        student
      );


    /* ----------------------------------------------------------
       NOTIFICATIONS
       ---------------------------------------------------------- */

    currentNotifications =
      await loadMatchingRecords(
        recordConfigs.notifications,
        student
      );


    renderGrades(
      currentGrades
    );

    renderCertificates(
      currentCertificates
    );

    renderPayments(
      currentPayments
    );

    renderNotifications(
      currentNotifications
    );


    updateCounters();
  }


  /* ============================================================
     22. MATCHING RECORDS
     ============================================================ */

  async function loadMatchingRecords(
    tableNames,
    student
  ) {
    for (
      const tableName of tableNames
    ) {
      const result =
        await queryTable(
          tableName,
          {
            limit: 500,
          }
        );

      if (
        !Array.isArray(
          result.data
        ) ||
        !result.data.length
      ) {
        continue;
      }

      const matching =
        result.data.filter(
          (row) =>
            recordBelongsToStudent(
              row,
              student
            )
        );

      if (matching.length) {
        console.log(
          `GAAWOW Portal: ${matching.length} records loaded from ${tableName}`
        );

        return matching;
      }
    }

    return [];
  }


  /* ============================================================
     23. RENDER GRADES
     ============================================================ */

  function renderGrades(
    records
  ) {
    const container =
      els.grades;

    if (!container) {
      return;
    }

    if (!records.length) {
      container.innerHTML = `
        <div class="empty-message">
          No grade records available yet.
        </div>
      `;

      return;
    }


    const rows =
      records.map(
        (row) => {

          const subject =
            getObjectValue(
              row,
              [
                "subject_name",
                "subject",
                "course_name",
                "course",
                "module_name",
                "module",
                "title",
              ]
            );

          const assessment =
            getObjectValue(
              row,
              [
                "assessment_name",
                "assessment",
                "exam_name",
                "exam_type",
                "type",
              ]
            );

          const score =
            getObjectValue(
              row,
              [
                "score",
                "marks",
                "mark",
                "obtained_marks",
                "grade",
              ]
            );

          const maxScore =
            getObjectValue(
              row,
              [
                "max_score",
                "total_marks",
                "maximum_marks",
              ]
            );

          const letter =
            getObjectValue(
              row,
              [
                "letter_grade",
                "grade_letter",
                "grade",
              ]
            );

          const status =
            getObjectValue(
              row,
              [
                "status",
                "result_status",
              ]
            );

          return `
            <tr>

              <td>
                ${escapeHtml(
                  displayValue(
                    subject
                  )
                )}
              </td>

              <td>
                ${escapeHtml(
                  displayValue(
                    assessment
                  )
                )}
              </td>

              <td>
                ${escapeHtml(
                  displayValue(
                    score
                  )
                )}
                ${
                  maxScore
                    ? ` / ${escapeHtml(
                        String(
                          maxScore
                        )
                      )}`
                    : ""
                }
              </td>

              <td>
                ${escapeHtml(
                  displayValue(
                    letter
                  )
                )}
              </td>

              <td>
                ${escapeHtml(
                  displayValue(
                    status
                  )
                )}
              </td>

            </tr>
          `;
        }
      ).join("");


    container.innerHTML = `
      <div class="table-wrapper">

        <table class="data-table">

          <thead>
            <tr>
              <th>Subject</th>
              <th>Assessment</th>
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
     24. RENDER CERTIFICATES
     ============================================================ */

  function renderCertificates(
    records
  ) {
    const container =
      els.certificates;

    if (!container) {
      return;
    }

    if (!records.length) {
      container.innerHTML = `
        <div class="empty-message">
          No certificates available yet.
        </div>
      `;

      return;
    }


    container.innerHTML = `
      <div class="certificate-list">

        ${records
          .map(
            (row) => {

              const title =
                getObjectValue(
                  row,
                  [
                    "certificate_name",
                    "name",
                    "title",
                    "certificate_type",
                    "course_name",
                  ]
                );

              const status =
                getObjectValue(
                  row,
                  [
                    "status",
                    "certificate_status",
                  ]
                );

              const issueDate =
                getObjectValue(
                  row,
                  [
                    "issue_date",
                    "issued_at",
                    "created_at",
                    "date",
                  ]
                );

              const certificateNo =
                getObjectValue(
                  row,
                  [
                    "certificate_number",
                    "certificate_no",
                    "serial_number",
                    "serial",
                  ]
                );

              const fileUrl =
                getObjectValue(
                  row,
                  [
                    "file_url",
                    "certificate_url",
                    "download_url",
                    "pdf_url",
                    "url",
                  ]
                );


              return `
                <div class="certificate-item">

                  <strong>
                    ${escapeHtml(
                      displayValue(
                        title
                      )
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      displayValue(
                        status ||
                        "Issued"
                      )
                    )}
                  </span>

                  <small>
                    Issued:
                    ${escapeHtml(
                      formatDate(
                        issueDate
                      )
                    )}
                  </small>

                  ${
                    certificateNo
                      ? `
                        <small>
                          Certificate No:
                          ${escapeHtml(
                            certificateNo
                          )}
                        </small>
                      `
                      : ""
                  }

                  ${
                    fileUrl
                      ? `
                        <a
                          href="${escapeHtml(
                            fileUrl
                          )}"
                          target="_blank"
                          rel="noopener noreferrer"
                          style="
                            margin-top:7px;
                            display:inline-block;
                            color:#0B4DA2;
                            font-size:11px;
                            font-weight:800;
                            text-decoration:none;
                          "
                        >
                          View Certificate
                        </a>
                      `
                      : ""
                  }

                </div>
              `;
            }
          )
          .join("")}

      </div>
    `;
  }


  /* ============================================================
     25. RENDER PAYMENTS
     ============================================================ */

  function renderPayments(
    records
  ) {
    const container =
      els.payments;

    if (!container) {
      return;
    }

    if (!records.length) {
      container.innerHTML = `
        <div class="empty-message">
          No payment records available yet.
        </div>
      `;

      return;
    }


    container.innerHTML = `
      <div class="payments-list">

        ${records
          .map(
            (row) => {

              const amount =
                getObjectValue(
                  row,
                  [
                    "amount",
                    "paid_amount",
                    "payment_amount",
                    "total",
                  ]
                );

              const currency =
                getObjectValue(
                  row,
                  [
                    "currency",
                    "currency_code",
                  ]
                );

              const status =
                getObjectValue(
                  row,
                  [
                    "status",
                    "payment_status",
                  ]
                );

              const date =
                getObjectValue(
                  row,
                  [
                    "payment_date",
                    "paid_at",
                    "created_at",
                    "date",
                  ]
                );

              const reference =
                getObjectValue(
                  row,
                  [
                    "reference",
                    "payment_reference",
                    "receipt_number",
                    "receipt_no",
                  ]
                );


              return `
                <div class="payment-item">

                  <strong>
                    ${
                      currency
                        ? escapeHtml(
                            currency
                          ) + " "
                        : ""
                    }${escapeHtml(
                      formatMoney(
                        amount
                      )
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      displayValue(
                        status ||
                        "Recorded"
                      )
                    )}
                  </span>

                  <small>
                    Date:
                    ${escapeHtml(
                      formatDate(
                        date
                      )
                    )}
                  </small>

                  ${
                    reference
                      ? `
                        <small>
                          Reference:
                          ${escapeHtml(
                            reference
                          )}
                        </small>
                      `
                      : ""
                  }

                </div>
              `;
            }
          )
          .join("")}

      </div>
    `;
  }


  /* ============================================================
     26. RENDER NOTIFICATIONS
     ============================================================ */

  function renderNotifications(
    records
  ) {
    const container =
      els.notifications;

    if (!container) {
      return;
    }

    if (!records.length) {
      container.innerHTML = `
        <div class="empty-message">
          No notifications available.
        </div>
      `;

      return;
    }


    container.innerHTML =
      records
        .map(
          (row) => {

            const title =
              getObjectValue(
                row,
                [
                  "title",
                  "subject",
                  "name",
                ]
              );

            const message =
              getObjectValue(
                row,
                [
                  "message",
                  "body",
                  "content",
                  "description",
                ]
              );

            const date =
              getObjectValue(
                row,
                [
                  "created_at",
                  "date",
                  "sent_at",
                ]
              );

            const read =
              getObjectValue(
                row,
                [
                  "is_read",
                  "read",
                  "read_status",
                ]
              );

            return `
              <div
                class="notification-item ${
                  read === true ||
                  read === "true"
                    ? ""
                    : "unread"
                }"
              >

                <strong>
                  ${escapeHtml(
                    displayValue(
                      title ||
                      "Notification"
                    )
                  )}
                </strong>

                <p>
                  ${escapeHtml(
                    displayValue(
                      message
                    )
                  )}
                </p>

                <small style="
                  display:block;
                  margin-top:5px;
                  color:#94A3B8;
                  font-size:10px;
                ">
                  ${escapeHtml(
                    formatDateTime(
                      date
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
     27. COUNTERS
     ============================================================ */

  function updateCounters() {
    setText(
      els.resultsCount,
      currentGrades.length
    );

    setText(
      els.certificatesCount,
      currentCertificates.length
    );

    setText(
      els.notificationsCount,
      currentNotifications.length
    );
  }


  /* ============================================================
     28. MARK NOTIFICATIONS READ
     ============================================================ */

  async function markAllNotificationsRead() {
    if (
      !currentNotifications.length
    ) {
      return;
    }

    const tableCandidates = [
      "notifications",
      "student_notifications",
    ];


    for (
      const tableName of tableCandidates
    ) {
      const result =
        await queryTable(
          tableName,
          {
            limit: 500,
          }
        );

      if (
        !Array.isArray(
          result.data
        )
      ) {
        continue;
      }

      const matching =
        result.data.filter(
          (row) =>
            recordBelongsToStudent(
              row,
              currentStudent
            )
        );


      if (!matching.length) {
        continue;
      }


      for (
        const row of matching
      ) {
        if (
          row.is_read === true
        ) {
          continue;
        }

        const {
          error,
        } = await supabase
          .from(tableName)
          .update({
            is_read: true,
          })
          .eq(
            "id",
            row.id
          );

        if (error) {
          console.warn(
            `Unable to mark notification ${row.id} as read:`,
            error.message
          );
        }
      }

      await loadStudentRecords(
        currentStudent
      );

      showMessage(
        "All available notifications have been marked as read.",
        "success"
      );

      return;
    }

    showMessage(
      "Notifications could not be updated.",
      "warning"
    );
  }


  /* ============================================================
     29. LOGOUT
     ============================================================ */

  async function logout() {
    try {
      await supabase.auth.signOut();

    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );

    } finally {
      window.location.href =
        "index.html";
    }
  }


  /* ============================================================
     30. AUTH LISTENER
     ============================================================ */

  function bindAuthListener() {
    supabase.auth.onAuthStateChange(
      async (event) => {

        console.log(
          "GAAWOW Student Auth Event:",
          event
        );


        if (
          event === "SIGNED_OUT"
        ) {
          window.location.href =
            "index.html";

          return;
        }


        if (
          event === "TOKEN_REFRESHED"
        ) {
          return;
        }


        if (
          event === "USER_UPDATED"
        ) {
          try {
            await reloadPortal();
          } catch (
            error
          ) {
            console.error(
              "USER UPDATED RELOAD ERROR:",
              error
            );
          }
        }
      }
    );
  }


  /* ============================================================
     31. FULL PORTAL LOAD
     ============================================================ */

  async function reloadPortal() {
    showLoadingScreen();

    hideMessage();


    try {
      currentSession =
        await getSession();


      const student =
        await loadCurrentStudent(
          currentSession.user.id
        );


      renderStudent(
        student
      );


      /* Institution */
      currentInstitution =
        await loadInstitution(
          student
        );


      /* Enrollment */
      currentEnrollment =
        await loadEnrollment(
          student
        );


      /* Academic relationships */
      const relations =
        await loadAcademicRelations(
          currentEnrollment,
          student
        );


      /* Academic values */
      const academicValues =
        resolveAcademicValues(
          student,
          currentEnrollment,
          relations
        );


      renderAcademicSummary(
        academicValues
      );


      /* Grades / Certificates / Payments / Notifications */
      await loadStudentRecords(
        student
      );


      showPortal();


      console.log(
        "================================================="
      );

      console.log(
        "GAAWOW STUDENT PORTAL V6.1 READY"
      );

      console.log(
        "Student:",
        currentStudent
      );

      console.log(
        "Institution:",
        currentInstitution
      );

      console.log(
        "Enrollment:",
        currentEnrollment
      );

      console.log(
        "Department:",
        currentDepartment
      );

      console.log(
        "Course:",
        currentCourse
      );

      console.log(
        "Class:",
        currentClass
      );

      console.log(
        "Academic Year:",
        currentAcademicYear
      );

      console.log(
        "Grades:",
        currentGrades
      );

      console.log(
        "Certificates:",
        currentCertificates
      );

      console.log(
        "Payments:",
        currentPayments
      );

      console.log(
        "Notifications:",
        currentNotifications
      );

      console.log(
        "================================================="
      );


    } catch (error) {

      console.error(
        "GAAWOW STUDENT PORTAL ERROR:",
        error
      );


      if (
        safeString(
          error?.message
        ).toLowerCase()
          .includes("session")
      ) {
        showStartupError(
          error.message
        );

      } else {
        showStartupError(
          error?.message ||
          "Unable to load student portal."
        );
      }

      return;
    }
  }


  /* ============================================================
     32. EVENT BINDINGS
     ============================================================ */

  function bindEvents() {

    /* Logout */
    if (els.logout) {
      els.logout.addEventListener(
        "click",
        logout
      );
    }

    if (
      els.logout2 &&
      els.logout2 !== els.logout
    ) {
      els.logout2.addEventListener(
        "click",
        logout
      );
    }


    /* Mark all read */
    if (els.markAllRead) {
      els.markAllRead.addEventListener(
        "click",
        markAllNotificationsRead
      );
    }
  }


  /* ============================================================
     33. INITIALIZE
     ============================================================ */

  async function init() {

    if (initialized) {
      return;
    }

    initialized =
      true;


    showLoadingScreen();


    bindEvents();

    bindAuthListener();


    await reloadPortal();
  }


  /* ============================================================
     34. START
     ============================================================ */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true,
      }
    );

  } else {
    init();
  }


})();
