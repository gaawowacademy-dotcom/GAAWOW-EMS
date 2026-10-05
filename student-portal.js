/* ============================================================
   GAAWOW EMS
   STUDENT PORTAL JS V6.2 FINAL
   ------------------------------------------------------------
   DATABASE RELATIONSHIP

   auth.users
        ↓
   students.auth_user_id
        ↓
   students.id
        ↓
   enrollments.student_id
        ↓
   ├── institutions
   ├── courses
   │      └── departments
   └── classes

   FIXED FOR:
   Student ID: GA-2026-000119
   Student: Maxamed Mad Yarow

   Includes:
   ✅ Authentication
   ✅ Student Profile
   ✅ Institution
   ✅ Department
   ✅ Course
   ✅ Class
   ✅ Enrollment Status
   ✅ Academic Year
   ✅ Grades
   ✅ Certificates
   ✅ Payments
   ✅ Notifications placeholders
   ✅ Loading screen
   ✅ Error handling
   ✅ Debug information
   ✅ Logout

   IMPORTANT:
   This file expects:

   student-portal.html
   student-portal.js
   ============================================================ */

(() => {
  "use strict";


  /* ============================================================
     CONFIG
     ============================================================ */

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_ANON_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


  /* ============================================================
     SUPABASE CHECK
     ============================================================ */

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    console.error(
      "GAAWOW STUDENT PORTAL: Supabase library is not loaded."
    );

    return;
  }


  /* ============================================================
     SUPABASE CLIENT
     ============================================================ */

  const supabase =
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
     HELPERS
     ============================================================ */

  const $ = (id) =>
    document.getElementById(id);


  const firstElement = (...ids) => {

    for (const id of ids) {

      const element = $(id);

      if (element) {
        return element;
      }

    }

    return null;
  };


  const setText = (
    ids,
    value,
    fallback = "—"
  ) => {

    const element =
      Array.isArray(ids)
        ? firstElement(...ids)
        : $(ids);

    if (!element) return;

    const hasValue =
      value !== null &&
      value !== undefined &&
      String(value).trim() !== "";

    element.textContent =
      hasValue
        ? String(value)
        : fallback;
  };


  const setHTML = (
    ids,
    html
  ) => {

    const element =
      Array.isArray(ids)
        ? firstElement(...ids)
        : $(ids);

    if (!element) return;

    element.innerHTML = html;
  };


  const escapeHTML = (
    value
  ) => {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };


  const formatDate = (
    date
  ) => {

    if (!date) {
      return "—";
    }

    try {

      const parsed =
        new Date(date);

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return String(date);
      }

      return parsed.toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );

    } catch {

      return String(date);

    }
  };


  const formatMoney = (
    amount
  ) => {

    if (
      amount === null ||
      amount === undefined ||
      amount === ""
    ) {
      return "—";
    }

    const number =
      Number(amount);

    if (
      Number.isNaN(number)
    ) {
      return String(amount);
    }

    return number.toLocaleString();
  };


  const normalize = (
    value
  ) => {

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .trim()
      .toLowerCase();
  };


  /* ============================================================
     GLOBAL STATE
     ============================================================ */

  let currentUser = null;

  let currentStudent = null;

  let currentEnrollment = null;

  let currentAcademic = {

    institution: null,

    course: null,

    department: null,

    class: null,

    status: null,

    academicYear: null

  };


  /* ============================================================
     DEBUG
     ============================================================ */

  const DEBUG = true;


  const debug = (
    label,
    data
  ) => {

    if (!DEBUG) return;

    console.log(
      `[GAAWOW STUDENT PORTAL V6.2] ${label}`,
      data ?? ""
    );

  };


  /* ============================================================
     LOADING SCREEN
     ============================================================ */

  function showLoading() {

    const loading =
      $("portalLoading");

    const app =
      $("portalApp");

    if (loading) {

      loading.style.display =
        "flex";

    }

    if (app) {

      app.classList.add(
        "hidden"
      );

    }

  }


  function hideLoading() {

    const loading =
      $("portalLoading");

    const app =
      $("portalApp");

    if (loading) {

      loading.style.display =
        "none";

    }

    if (app) {

      app.classList.remove(
        "hidden"
      );

    }

  }


  /* ============================================================
     MESSAGE
     ============================================================ */

  function showMessage(
    message,
    type = "info"
  ) {

    const element =
      firstElement(
        "message",
        "portalMessage",
        "studentMessage"
      );

    if (!element) {

      console.log(
        `[${type}]`,
        message
      );

      return;

    }

    element.textContent =
      message;

    element.className =
      `message ${type}`;

    element.style.display =
      "block";

  }


  function hideMessage() {

    const element =
      firstElement(
        "message",
        "portalMessage",
        "studentMessage"
      );

    if (!element) return;

    element.style.display =
      "none";

  }


  /* ============================================================
     AUTHENTICATION
     ============================================================ */

  async function getCurrentSession() {

    debug(
      "Checking Supabase session..."
    );

    const {
      data,
      error
    } =
      await supabase.auth.getSession();

    if (error) {

      console.error(
        "SESSION ERROR:",
        error
      );

      throw error;

    }

    if (
      !data ||
      !data.session ||
      !data.session.user
    ) {

      throw new Error(
        "Your login session has expired. Please login again."
      );

    }

    currentUser =
      data.session.user;

    debug(
      "Authenticated user:",
      currentUser
    );

    return data.session;

  }


  /* ============================================================
     LOAD STUDENT
     ------------------------------------------------------------
     PRIMARY:
       students.auth_user_id = auth.users.id
     ============================================================ */

  async function loadStudent() {

    if (
      !currentUser ||
      !currentUser.id
    ) {

      throw new Error(
        "Authenticated user was not found."
      );

    }


    debug(
      "Loading student using auth_user_id:",
      currentUser.id
    );


    const {
      data,
      error
    } =
      await supabase
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
          account_enabled,
          auth_user_id,
          login_username,
          account_created_at,
          last_login_at,
          password_changed_at
        `)
        .eq(
          "auth_user_id",
          currentUser.id
        )
        .maybeSingle();


    if (error) {

      console.error(
        "STUDENT QUERY ERROR:",
        error
      );

      throw new Error(
        `Student profile could not be loaded: ${error.message}`
      );

    }


    if (!data) {

      throw new Error(
        "No student record is linked to this login account."
      );

    }


    currentStudent =
      data;


    debug(
      "Student loaded:",
      currentStudent
    );


    return currentStudent;

  }


  /* ============================================================
     LOAD ENROLLMENTS
     ------------------------------------------------------------
     IMPORTANT:

       enrollments.student_id
             =
       students.id

     This first attempts embedded relationships.
     If relationship embedding fails,
     it falls back to independent queries.
     ============================================================ */

  async function loadAcademicInformation() {

    if (
      !currentStudent ||
      !currentStudent.id
    ) {

      throw new Error(
        "Student record is required before loading enrollment."
      );

    }


    debug(
      "Loading enrollment for student UUID:",
      currentStudent.id
    );


    /*
      ==========================================================
      METHOD 1
      Relationship query
      ==========================================================
    */

    let enrollmentRows = [];

    let relationshipError = null;


    const {
      data,
      error
    } =
      await supabase
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
          updated_at,

          institutions (
            id,
            name,
            code,
            email,
            phone,
            address,
            city,
            country,
            logo_url,
            website_url,
            is_active
          ),

          courses (
            id,
            institution_id,
            department_id,
            name,
            code,
            description,
            duration_months,
            fee,
            is_active,

            departments (
              id,
              institution_id,
              name,
              code,
              description,
              head_profile_id,
              is_active
            )
          ),

          classes (
            id,
            institution_id,
            course_id,
            name,
            code,
            academic_year,
            teacher_id,
            room,
            start_date,
            end_date,
            is_active
          )
        `)
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


    if (error) {

      relationshipError =
        error;

      console.warn(
        "Relationship enrollment query failed:",
        error.message
      );

    } else {

      enrollmentRows =
        data || [];

    }


    /*
      ==========================================================
      METHOD 2
      Fallback independent query
      ==========================================================
    */

    if (
      relationshipError ||
      enrollmentRows.length === 0
    ) {

      debug(
        "Using independent enrollment fallback..."
      );


      const {
        data: simpleEnrollments,
        error: simpleError
      } =
        await supabase
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
            currentStudent.id
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          );


      if (simpleError) {

        console.error(
          "ENROLLMENT FALLBACK ERROR:",
          simpleError
        );

        /*
          No enrollment is not necessarily
          a fatal student error.
        */

        enrollmentRows =
          [];

      } else {

        enrollmentRows =
          simpleEnrollments || [];

      }


      /*
        Load relationships independently.
      */

      if (
        enrollmentRows.length
      ) {

        enrollmentRows =
          await hydrateEnrollments(
            enrollmentRows
          );

      }

    }


    /*
      ==========================================================
      SELECT ACTIVE ENROLLMENT
      ==========================================================
    */

    const activeEnrollment =
      enrollmentRows.find(
        item =>
          normalize(item.status) ===
          "active"
      ) ||
      enrollmentRows[0] ||
      null;


    if (!activeEnrollment) {

      currentEnrollment =
        null;

      currentAcademic = {

        institution: null,

        course: null,

        department: null,

        class: null,

        status: null,

        academicYear: null

      };


      debug(
        "No enrollment found for student.",
        currentStudent.id
      );


      return null;

    }


    currentEnrollment =
      activeEnrollment;


    const institution =
      activeEnrollment.institutions ||
      activeEnrollment.institution ||
      null;


    const course =
      activeEnrollment.courses ||
      activeEnrollment.course ||
      null;


    const department =
      course?.departments ||
      course?.department ||
      activeEnrollment.departments ||
      activeEnrollment.department ||
      null;


    const classInfo =
      activeEnrollment.classes ||
      activeEnrollment.class ||
      null;


    const academicYear =
      classInfo?.academic_year ||
      activeEnrollment.academic_year ||
      activeEnrollment.academic_year_name ||
      null;


    currentAcademic = {

      institution,

      course,

      department,

      class: classInfo,

      status:
        activeEnrollment.status ||
        null,

      academicYear

    };


    debug(
      "Current enrollment:",
      currentEnrollment
    );

    debug(
      "Current academic:",
      currentAcademic
    );


    return currentAcademic;

  }


  /* ============================================================
     HYDRATE ENROLLMENTS
     ------------------------------------------------------------ */

  async function hydrateEnrollments(
    enrollments
  ) {

    if (
      !Array.isArray(
        enrollments
      )
    ) {

      return [];

    }


    const hydrated = [];


    for (
      const enrollment
      of enrollments
    ) {

      let institution =
        null;

      let course =
        null;

      let department =
        null;

      let classInfo =
        null;


      /*
        Institution
      */

      if (
        enrollment.institution_id
      ) {

        const {
          data
        } =
          await supabase
            .from("institutions")
            .select(`
              id,
              name,
              code,
              email,
              phone,
              address,
              city,
              country,
              logo_url,
              website_url,
              is_active
            `)
            .eq(
              "id",
              enrollment.institution_id
            )
            .maybeSingle();

        institution =
          data || null;

      }


      /*
        Course
      */

      if (
        enrollment.course_id
      ) {

        const {
          data
        } =
          await supabase
            .from("courses")
            .select(`
              id,
              institution_id,
              department_id,
              name,
              code,
              description,
              duration_months,
              fee,
              is_active
            `)
            .eq(
              "id",
              enrollment.course_id
            )
            .maybeSingle();

        course =
          data || null;

      }


      /*
        Department
      */

      if (
        course?.department_id
      ) {

        const {
          data
        } =
          await supabase
            .from("departments")
            .select(`
              id,
              institution_id,
              name,
              code,
              description,
              head_profile_id,
              is_active
            `)
            .eq(
              "id",
              course.department_id
            )
            .maybeSingle();

        department =
          data || null;

      }


      /*
        Class
      */

      if (
        enrollment.class_id
      ) {

        const {
          data
        } =
          await supabase
            .from("classes")
            .select(`
              id,
              institution_id,
              course_id,
              name,
              code,
              academic_year,
              teacher_id,
              room,
              start_date,
              end_date,
              is_active
            `)
            .eq(
              "id",
              enrollment.class_id
            )
            .maybeSingle();

        classInfo =
          data || null;

      }


      hydrated.push({

        ...enrollment,

        institutions:
          institution,

        courses:
          course
            ? {
                ...course,
                departments:
                  department
              }
            : null,

        classes:
          classInfo

      });

    }


    return hydrated;

  }


  /* ============================================================
     RENDER STUDENT PROFILE
     ============================================================ */

  function renderStudent() {

    if (!currentStudent) {
      return;
    }


    /*
      Full name
    */

    setText(
      [
        "studentName",
        "studentFullName",
        "profileName",
        "welcomeStudentName",
        "studentNameTop"
      ],
      currentStudent.full_name
    );


    /*
      Student ID
    */

    setText(
      [
        "studentId",
        "profileStudentId",
        "studentNumber",
        "dashboardStudentId"
      ],
      currentStudent.student_id
    );


    /*
      Email
    */

    setText(
      [
        "studentEmail",
        "profileEmail"
      ],
      currentStudent.email ||
      currentUser?.email
    );


    /*
      Phone
    */

    setText(
      [
        "studentPhone",
        "profilePhone"
      ],
      currentStudent.phone
    );


    /*
      Gender
    */

    setText(
      [
        "studentGender",
        "profileGender"
      ],
      currentStudent.gender
    );


    /*
      Address
    */

    setText(
      [
        "studentAddress",
        "profileAddress"
      ],
      currentStudent.address
    );


    /*
      Admission date
    */

    setText(
      [
        "admissionDate",
        "studentAdmissionDate"
      ],
      formatDate(
        currentStudent.admission_date
      )
    );


    /*
      Login username
    */

    setText(
      [
        "loginUsername"
      ],
      currentStudent.login_username
    );


    /*
      Student photo
    */

    const photoElements = [

      $("studentPhoto"),

      $("profilePhoto"),

      $("studentAvatar"),

      $("avatar")

    ].filter(Boolean);


    for (
      const image
      of photoElements
    ) {

      if (
        currentStudent.photo_url
      ) {

        image.src =
          currentStudent.photo_url;

        image.alt =
          currentStudent.full_name ||
          "Student";

      }

    }


    /*
      Emergency contact if HTML supports it.
    */

    setText(
      [
        "emergencyContactName"
      ],
      currentStudent.emergency_contact_name
    );


    setText(
      [
        "emergencyContactPhone"
      ],
      currentStudent.emergency_contact_phone
    );

  }


  /* ============================================================
     RENDER ACADEMIC INFORMATION
     ============================================================ */

  function renderAcademicInformation() {

    const institution =
      currentAcademic.institution;

    const course =
      currentAcademic.course;

    const department =
      currentAcademic.department;

    const classInfo =
      currentAcademic.class;


    /*
      Institution
    */

    setText(
      [
        "institutionName",
        "studentInstitution",
        "institution",
        "profileInstitution",
        "dashboardInstitution"
      ],
      institution?.name
    );


    setText(
      [
        "institutionCode",
        "studentInstitutionCode"
      ],
      institution?.code
    );


    /*
      Course
    */

    setText(
      [
        "courseName",
        "studentCourse",
        "course",
        "profileCourse",
        "programName",
        "studentProgram",
        "dashboardCourse"
      ],
      course?.name
    );


    setText(
      [
        "courseCode",
        "studentCourseCode"
      ],
      course?.code
    );


    /*
      Department
    */

    setText(
      [
        "departmentName",
        "studentDepartment",
        "department",
        "profileDepartment",
        "dashboardDepartment"
      ],
      department?.name
    );


    setText(
      [
        "departmentCode",
        "studentDepartmentCode"
      ],
      department?.code
    );


    /*
      Class
    */

    setText(
      [
        "className",
        "studentClass",
        "class",
        "profileClass",
        "dashboardClass"
      ],
      classInfo?.name
    );


    setText(
      [
        "classCode",
        "studentClassCode"
      ],
      classInfo?.code
    );


    /*
      Enrollment status
    */

    setText(
      [
        "enrollmentStatus",
        "studentEnrollmentStatus",
        "enrollmentStatusValue",
        "academicStatus"
      ],
      currentAcademic.status
    );


    /*
      Academic year
    */

    setText(
      [
        "academicYear",
        "studentAcademicYear",
        "classAcademicYear"
      ],
      currentAcademic.academicYear
    );


    /*
      Combined summary
    */

    renderAcademicSummary();

  }


  /* ============================================================
     ACADEMIC SUMMARY
     ============================================================ */

  function renderAcademicSummary() {

    const element =
      firstElement(
        "academicSummary",
        "studentAcademicSummary",
        "academicInformation"
      );


    if (!element) {
      return;
    }


    const institution =
      currentAcademic.institution;

    const course =
      currentAcademic.course;

    const department =
      currentAcademic.department;

    const classInfo =
      currentAcademic.class;

    const status =
      currentAcademic.status;

    const year =
      currentAcademic.academicYear;


    element.innerHTML = `

      <div class="academic-summary-grid">

        <div class="academic-item">

          <span>
            Institution
          </span>

          <strong>
            ${escapeHTML(
              institution?.name ||
              "—"
            )}
          </strong>

        </div>


        <div class="academic-item">

          <span>
            Department
          </span>

          <strong>
            ${escapeHTML(
              department?.name ||
              "—"
            )}
          </strong>

        </div>


        <div class="academic-item">

          <span>
            Course
          </span>

          <strong>
            ${escapeHTML(
              course?.name ||
              "—"
            )}
          </strong>

        </div>


        <div class="academic-item">

          <span>
            Class
          </span>

          <strong>
            ${escapeHTML(
              classInfo?.name ||
              "—"
            )}
          </strong>

        </div>


        <div class="academic-item">

          <span>
            Academic Year
          </span>

          <strong>
            ${escapeHTML(
              year ||
              "—"
            )}
          </strong>

        </div>


        <div class="academic-item">

          <span>
            Status
          </span>

          <strong class="academic-status">

            ${escapeHTML(
              status ||
              "—"
            )}

          </strong>

        </div>

      </div>

    `;

  }


  /* ============================================================
     ACCOUNT STATUS
     ============================================================ */

  function renderAccountStatus() {

    const enabled =
      currentStudent?.account_enabled === true;


    setText(
      [
        "accountStatus",
        "studentAccountStatus",
        "profileAccountStatus"
      ],
      enabled
        ? "Active"
        : "Disabled"
    );


    const elements = [

      $("accountStatus"),

      $("studentAccountStatus"),

      $("profileAccountStatus")

    ].filter(Boolean);


    for (
      const element
      of elements
    ) {

      element.classList.remove(
        "active",
        "inactive",
        "success",
        "error"
      );


      element.classList.add(
        enabled
          ? "active"
          : "inactive"
      );

    }

  }


  /* ============================================================
     LAST LOGIN
     ============================================================ */

  function renderLastLogin() {

    setText(
      [
        "lastLogin",
        "studentLastLogin",
        "lastLoginAt"
      ],
      formatDate(
        currentStudent?.last_login_at
      )
    );

  }


  /* ============================================================
     GRADES
     ============================================================ */

  async function loadGrades() {

    if (
      !currentStudent?.id
    ) {
      return;
    }


    const container =
      firstElement(
        "gradesContainer",
        "gradesList",
        "studentGrades",
        "resultsContainer"
      );


    if (!container) {
      return;
    }


    try {

      const {
        data,
        error
      } =
        await supabase
          .from("grades")
          .select(`
            id,
            institution_id,
            student_id,
            exam_id,
            entered_by,
            score,
            grade,
            created_at,
            updated_at
          `)
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


      if (error) {

        console.warn(
          "GRADES ERROR:",
          error.message
        );

        return;

      }


      renderGradesFallback(
        container,
        data || []
      );


      /*
        Dashboard count
      */

      setText(
        [
          "resultsCount"
        ],
        data?.length || 0,
        "0"
      );


    } catch (error) {

      console.warn(
        "GRADES EXCEPTION:",
        error
      );

    }

  }


  function renderGradesFallback(
    container,
    grades
  ) {

    if (
      container.dataset
        .managedByExistingPortal ===
      "true"
    ) {

      return;

    }


    if (
      !grades ||
      grades.length === 0
    ) {

      container.innerHTML = `

        <div class="empty-state">

          No grades available yet.

        </div>

      `;

      return;

    }


    container.innerHTML = `

      <div class="grades-table-wrap">

        <table class="student-grades-table">

          <thead>

            <tr>

              <th>
                Exam
              </th>

              <th>
                Score
              </th>

              <th>
                Grade
              </th>

              <th>
                Date
              </th>

            </tr>

          </thead>


          <tbody>

            ${grades.map(
              item => `

                <tr>

                  <td>
                    ${escapeHTML(
                      item.exam_id ||
                      "—"
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      item.score ??
                      "—"
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      item.grade ||
                      "—"
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      formatDate(
                        item.created_at
                      )
                    )}
                  </td>

                </tr>

              `
            ).join("")}

          </tbody>

        </table>

      </div>

    `;

  }


  /* ============================================================
     CERTIFICATES
     ============================================================ */

  async function loadCertificates() {

    if (
      !currentStudent?.id
    ) {
      return;
    }


    const container =
      firstElement(
        "certificatesContainer",
        "certificatesList",
        "studentCertificates"
      );


    if (!container) {
      return;
    }


    try {

      const {
        data,
        error
      } =
        await supabase
          .from("certificates")
          .select(`
            id,
            student_id,
            institution_id,
            course_id,
            certificate_number,
            status,
            issued_at,
            created_at
          `)
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


      if (error) {

        console.warn(
          "CERTIFICATES ERROR:",
          error.message
        );

        return;

      }


      setText(
        [
          "certificatesCount"
        ],
        data?.length || 0,
        "0"
      );


      if (
        container.dataset
          .managedByExistingPortal ===
        "true"
      ) {

        return;

      }


      if (
        !data ||
        data.length === 0
      ) {

        container.innerHTML = `

          <div class="empty-state">

            No certificates available yet.

          </div>

        `;

        return;

      }


      container.innerHTML =
        data.map(
          certificate => `

            <div class="certificate-item">

              <strong>

                ${escapeHTML(
                  certificate.certificate_number ||
                  "Certificate"
                )}

              </strong>


              <span>

                ${escapeHTML(
                  certificate.status ||
                  "valid"
                )}

              </span>


              <small>

                ${escapeHTML(
                  formatDate(
                    certificate.issued_at ||
                    certificate.created_at
                  )
                )}

              </small>

            </div>

          `
        ).join("");


    } catch (error) {

      console.warn(
        "CERTIFICATES EXCEPTION:",
        error
      );

    }

  }


  /* ============================================================
     PAYMENTS
     ============================================================ */

  async function loadPayments() {

    if (
      !currentStudent?.id
    ) {
      return;
    }


    const container =
      firstElement(
        "paymentsContainer",
        "paymentsList",
        "studentPayments"
      );


    if (!container) {
      return;
    }


    try {

      const {
        data,
        error
      } =
        await supabase
          .from("payments")
          .select(`
            id,
            student_id,
            institution_id,
            invoice_id,
            amount,
            status,
            created_at
          `)
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


      if (error) {

        console.warn(
          "PAYMENTS ERROR:",
          error.message
        );

        return;

      }


      if (
        container.dataset
          .managedByExistingPortal ===
        "true"
      ) {

        return;

      }


      if (
        !data ||
        data.length === 0
      ) {

        container.innerHTML = `

          <div class="empty-state">

            No payment records available.

          </div>

        `;

        return;

      }


      container.innerHTML =
        data.map(
          payment => `

            <div class="payment-item">

              <strong>

                ${escapeHTML(
                  formatMoney(
                    payment.amount
                  )
                )}

              </strong>


              <span>

                ${escapeHTML(
                  payment.status ||
                  "pending"
                )}

              </span>


              <small>

                ${escapeHTML(
                  formatDate(
                    payment.created_at
                  )
                )}

              </small>

            </div>

          `
        ).join("");


    } catch (error) {

      console.warn(
        "PAYMENTS EXCEPTION:",
        error
      );

    }

  }


  /* ============================================================
     NOTIFICATIONS
     ------------------------------------------------------------
     This V6.2 does NOT invent a database structure.
     Existing notification system remains untouched.
     ============================================================ */

  function initializeNotifications() {

    const container =
      $("notificationsList");


    if (!container) {
      return;
    }


    /*
      Keep existing notification content
      if another module already manages it.
    */

    if (
      container.dataset
        .managedByExistingPortal ===
      "true"
    ) {

      return;

    }


    if (
      container.children.length === 0
    ) {

      container.innerHTML = `

        <div class="empty-message">

          No notifications available.

        </div>

      `;

    }

  }


  /* ============================================================
     LOGOUT
     ============================================================ */

  async function logout() {

    try {

      const {
        error
      } =
        await supabase.auth.signOut();


      if (error) {
        throw error;
      }


      window.location.href =
        "login.html";


    } catch (error) {

      console.error(
        "LOGOUT ERROR:",
        error
      );


      showMessage(
        "Logout failed. Please try again.",
        "error"
      );

    }

  }


  /* ============================================================
     BIND LOGOUT
     ============================================================ */

  function bindLogout() {

    const buttons = [

      $("logoutBtn"),

      $("studentLogoutBtn"),

      $("logoutButton")

    ].filter(Boolean);


    for (
      const button
      of buttons
    ) {

      /*
        Prevent duplicate listeners.
      */

      if (
        button.dataset
          .logoutBound ===
        "true"
      ) {

        continue;

      }


      button.dataset
        .logoutBound =
        "true";


      button.addEventListener(
        "click",
        event => {

          event.preventDefault();

          logout();

        }
      );

    }

  }


  /* ============================================================
     AUTH STATE LISTENER
     ============================================================ */

  function listenForAuthChanges() {

    if (
      window.__GAAWOW_STUDENT_AUTH_LISTENER__
    ) {

      return;

    }


    window.__GAAWOW_STUDENT_AUTH_LISTENER__ =
      true;


    supabase.auth.onAuthStateChange(
      (
        event,
        session
      ) => {

        debug(
          "AUTH EVENT:",
          event
        );


        if (
          event ===
          "SIGNED_OUT"
        ) {

          window.location.href =
            "login.html";

          return;

        }


        if (
          session?.user
        ) {

          currentUser =
            session.user;

        }

      }
    );

  }


  /* ============================================================
     SHOW DEBUG INFORMATION
     ============================================================ */

  function showDebugInformation() {

    /*
      This only logs to console.
      It does not expose sensitive information
      inside the visible portal.
    */

    debug(
      "FINAL STUDENT:",
      {
        id:
          currentStudent?.id,

        student_id:
          currentStudent?.student_id,

        full_name:
          currentStudent?.full_name,

        auth_user_id:
          currentStudent?.auth_user_id
      }
    );


    debug(
      "FINAL ENROLLMENT:",
      currentEnrollment
    );


    debug(
      "FINAL ACADEMIC:",
      currentAcademic
    );

  }


  /* ============================================================
     VALIDATE EXPECTED STUDENT
     ------------------------------------------------------------
     We do NOT hard-code the student as the login identity.
     We only use GA-2026-000119 as a diagnostic check.
     ============================================================ */

  function validateStudentForDebug() {

    if (!currentStudent) {
      return;
    }


    if (
      currentStudent.student_id ===
      "GA-2026-000119"
    ) {

      debug(
        "EXPECTED STUDENT CONFIRMED:",
        "GA-2026-000119"
      );

    } else {

      debug(
        "LOGGED-IN STUDENT:",
        currentStudent.student_id
      );

    }

  }


  /* ============================================================
     MAIN INIT
     ============================================================ */

  async function init() {

    showLoading();

    hideMessage();


    try {

      /*
        ========================================================
        1. AUTH
        ========================================================
      */

      await getCurrentSession();


      /*
        ========================================================
        2. STUDENT
        ========================================================
      */

      await loadStudent();


      /*
        ========================================================
        3. ENROLLMENT + ACADEMIC
        ========================================================
      */

      await loadAcademicInformation();


      /*
        ========================================================
        4. RENDER STUDENT
        ========================================================
      */

      renderStudent();


      /*
        ========================================================
        5. RENDER ACADEMIC
        ========================================================
      */

      renderAcademicInformation();


      /*
        ========================================================
        6. ACCOUNT
        ========================================================
      */

      renderAccountStatus();

      renderLastLogin();


      /*
        ========================================================
        7. OTHER MODULES
        ========================================================
      */

      await Promise.allSettled([

        loadGrades(),

        loadCertificates(),

        loadPayments()

      ]);


      /*
        ========================================================
        8. NOTIFICATIONS
        ========================================================
      */

      initializeNotifications();


      /*
        ========================================================
        9. LOGOUT
        ========================================================
      */

      bindLogout();


      /*
        ========================================================
        10. AUTH LISTENER
        ========================================================
      */

      listenForAuthChanges();


      /*
        ========================================================
        11. DEBUG
        ========================================================
      */

      validateStudentForDebug();

      showDebugInformation();


      /*
        ========================================================
        12. SHOW PORTAL
        ========================================================
      */

      hideLoading();


      debug(
        "STUDENT PORTAL V6.2 READY."
      );


    } catch (error) {

      console.error(
        "================================================"
      );

      console.error(
        "GAAWOW STUDENT PORTAL V6.2 ERROR"
      );

      console.error(
        error
      );

      console.error(
        "================================================"
      );


      /*
        Hide loading
      */

      hideLoading();


      /*
        Show error
      */

      showMessage(
        error?.message ||
        "Unable to load Student Portal.",
        "error"
      );


      /*
        Hide portal content
        so the error is clear.
      */

      const protectedArea =
        firstElement(
          "studentPortal",
          "dashboard",
          "portalContent",
          "mainContent"
        );


      if (
        protectedArea
      ) {

        protectedArea.style.display =
          "none";

      }

    }

  }


  /* ============================================================
     START
     ============================================================ */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }


})();
