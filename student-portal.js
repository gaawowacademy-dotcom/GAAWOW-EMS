/* ============================================================
   GAAWOW EMS
   STUDENT PORTAL JS V6 FINAL
   ------------------------------------------------------------
   Relationship:
     auth.users
          ↓
     students.auth_user_id
          ↓
     enrollments.student_id
          ├── institutions
          ├── courses
          │      └── departments
          └── classes

   Keeps:
     ✅ Grades
     ✅ Certificates
     ✅ Payments
     ✅ Notifications
     ✅ Student authentication
     ✅ Student profile

   Adds:
     ✅ Institution
     ✅ Course
     ✅ Department
     ✅ Class
     ✅ Enrollment Status
     ✅ Academic Year
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

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    console.error("Supabase library is not loaded.");
    return;
  }

  const supabase = window.supabase.createClient(
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

  const $ = (id) => document.getElementById(id);

  const firstElement = (...ids) => {
    for (const id of ids) {
      const element = $(id);
      if (element) return element;
    }
    return null;
  };

  const setText = (ids, value, fallback = "—") => {
    const element = Array.isArray(ids)
      ? firstElement(...ids)
      : $(ids);

    if (!element) return;

    const text =
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
        ? String(value)
        : fallback;

    element.textContent = text;
  };

  const setHTML = (ids, html) => {
    const element = Array.isArray(ids)
      ? firstElement(...ids)
      : $(ids);

    if (!element) return;

    element.innerHTML = html;
  };

  const escapeHTML = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const formatDate = (date) => {
    if (!date) return "—";

    try {
      return new Date(date).toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );
    } catch {
      return date;
    }
  };

  const formatMoney = (amount) => {
    if (
      amount === null ||
      amount === undefined ||
      amount === ""
    ) {
      return "—";
    }

    const number = Number(amount);

    if (Number.isNaN(number)) {
      return String(amount);
    }

    return number.toLocaleString();
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
     MESSAGE
     ============================================================ */

  function showMessage(message, type = "info") {
    const element = firstElement(
      "message",
      "portalMessage",
      "studentMessage"
    );

    if (!element) {
      console.log(`[${type}]`, message);
      return;
    }

    element.textContent = message;
    element.className = `message ${type}`;
    element.style.display = "block";
  }

  function hideMessage() {
    const element = firstElement(
      "message",
      "portalMessage",
      "studentMessage"
    );

    if (!element) return;

    element.style.display = "none";
  }


  /* ============================================================
     AUTHENTICATION
     ============================================================ */

  async function getCurrentSession() {
    const {
      data,
      error
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (!data?.session?.user) {
      throw new Error(
        "Your login session has expired. Please login again."
      );
    }

    return data.session;
  }


  /* ============================================================
     LOAD STUDENT
     ------------------------------------------------------------
     IMPORTANT:
     Student login is identified using:

       students.auth_user_id = auth.users.id
     ============================================================ */

  async function loadStudent() {

    if (!currentUser?.id) {
      throw new Error("Authenticated student user not found.");
    }

    const {
      data,
      error
    } = await supabase
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
      .eq("auth_user_id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error(
        "STUDENT LOAD ERROR:",
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

    currentStudent = data;

    return data;
  }


  /* ============================================================
     LOAD ACADEMIC RELATIONSHIPS
     ------------------------------------------------------------
     students
        ↓
     enrollments
        ↓
     institutions
     courses
        ↓
     departments
     classes
     ============================================================ */

  async function loadAcademicInformation() {

    if (!currentStudent?.id) {
      throw new Error(
        "Student record is required before loading academic information."
      );
    }

    /*
      We use the student's UUID:

        enrollments.student_id = students.id
    */

    const {
      data: enrollments,
      error
    } = await supabase
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
      .eq("student_id", currentStudent.id)
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (error) {
      console.error(
        "ACADEMIC RELATIONSHIP ERROR:",
        error
      );

      throw new Error(
        `Academic information could not be loaded: ${error.message}`
      );
    }

    /*
      Prefer active enrollment.
    */

    const activeEnrollment =
      (enrollments || []).find(
        (item) => item.status === "active"
      ) ||
      enrollments?.[0] ||
      null;

    if (!activeEnrollment) {

      currentEnrollment = null;

      currentAcademic = {
        institution: null,
        course: null,
        department: null,
        class: null,
        status: null,
        academicYear: null
      };

      return null;
    }

    currentEnrollment = activeEnrollment;

    const institution =
      activeEnrollment.institutions || null;

    const course =
      activeEnrollment.courses || null;

    const department =
      course?.departments || null;

    const classInfo =
      activeEnrollment.classes || null;

    currentAcademic = {
      institution,
      course,
      department,
      class: classInfo,
      status: activeEnrollment.status,
      academicYear:
        classInfo?.academic_year || null
    };

    return currentAcademic;
  }


  /* ============================================================
     RENDER BASIC STUDENT INFORMATION
     ============================================================ */

  function renderStudent() {

    if (!currentStudent) return;

    setText(
      [
        "studentName",
        "studentFullName",
        "profileName",
        "welcomeStudentName"
      ],
      currentStudent.full_name
    );

    setText(
      [
        "studentId",
        "profileStudentId",
        "studentNumber",
        "dashboardStudentId"
      ],
      currentStudent.student_id
    );

    setText(
      [
        "studentEmail",
        "profileEmail"
      ],
      currentStudent.email ||
      currentUser?.email
    );

    setText(
      [
        "studentPhone",
        "profilePhone"
      ],
      currentStudent.phone
    );

    setText(
      [
        "studentGender",
        "profileGender"
      ],
      currentStudent.gender
    );

    setText(
      [
        "studentAddress",
        "profileAddress"
      ],
      currentStudent.address
    );

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
      Student photo
    */

    const photoElements = [
      $("studentPhoto"),
      $("profilePhoto"),
      $("studentAvatar"),
      $("avatar")
    ].filter(Boolean);

    for (const image of photoElements) {

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
  }


  /* ============================================================
     RENDER ACADEMIC INFORMATION
     ------------------------------------------------------------
     THIS IS THE MAIN V6 FIX.
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
      INSTITUTION
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
      COURSE
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
      DEPARTMENT
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
      CLASS
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
      STATUS
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
      Optional combined academic card
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

    if (!element) return;

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
          <span>Institution</span>
          <strong>
            ${escapeHTML(
              institution?.name || "—"
            )}
          </strong>
        </div>

        <div class="academic-item">
          <span>Department</span>
          <strong>
            ${escapeHTML(
              department?.name || "—"
            )}
          </strong>
        </div>

        <div class="academic-item">
          <span>Course</span>
          <strong>
            ${escapeHTML(
              course?.name || "—"
            )}
          </strong>
        </div>

        <div class="academic-item">
          <span>Class</span>
          <strong>
            ${escapeHTML(
              classInfo?.name || "—"
            )}
          </strong>
        </div>

        <div class="academic-item">
          <span>Academic Year</span>
          <strong>
            ${escapeHTML(
              year || "—"
            )}
          </strong>
        </div>

        <div class="academic-item">
          <span>Status</span>
          <strong class="academic-status">
            ${escapeHTML(
              status || "—"
            )}
          </strong>
        </div>

      </div>
    `;
  }


  /* ============================================================
     GRADES
     ------------------------------------------------------------
     Existing grades logic should continue to work.
     This function ONLY loads student-owned grades.
     ============================================================ */

  async function loadGrades() {

    if (!currentStudent?.id) return;

    const container =
      firstElement(
        "gradesContainer",
        "gradesList",
        "studentGrades",
        "resultsContainer"
      );

    /*
      If the page has no grades element,
      don't interfere with anything.
    */

    if (!container) return;

    try {

      const {
        data,
        error
      } = await supabase
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
          "Grades could not be loaded:",
          error.message
        );

        return;
      }

      /*
        Do not replace an existing Grades UI
        unless the page explicitly contains
        a simple grades container.
      */

      if (
        container.dataset.managedByExistingPortal ===
        "true"
      ) {
        return;
      }

      renderGradesFallback(
        container,
        data || []
      );

    } catch (error) {

      console.warn(
        "GRADES ERROR:",
        error
      );
    }
  }


  function renderGradesFallback(
    container,
    grades
  ) {

    if (!grades.length) {

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
              <th>Exam</th>
              <th>Score</th>
              <th>Grade</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            ${grades.map((item) => `
              <tr>
                <td>
                  ${escapeHTML(
                    item.exam_id || "—"
                  )}
                </td>

                <td>
                  ${escapeHTML(
                    item.score ?? "—"
                  )}
                </td>

                <td>
                  ${escapeHTML(
                    item.grade || "—"
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
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }


  /* ============================================================
     CERTIFICATES
     ============================================================ */

  async function loadCertificates() {

    if (!currentStudent?.id) return;

    const container =
      firstElement(
        "certificatesContainer",
        "certificatesList",
        "studentCertificates"
      );

    if (!container) return;

    try {

      const {
        data,
        error
      } = await supabase
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
          "Certificates could not be loaded:",
          error.message
        );

        return;
      }

      if (
        container.dataset.managedByExistingPortal ===
        "true"
      ) {
        return;
      }

      if (!data?.length) {

        container.innerHTML = `
          <div class="empty-state">
            No certificates available yet.
          </div>
        `;

        return;
      }

      container.innerHTML = data.map(
        (certificate) => `
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
        "CERTIFICATES ERROR:",
        error
      );
    }
  }


  /* ============================================================
     PAYMENTS
     ============================================================ */

  async function loadPayments() {

    if (!currentStudent?.id) return;

    const container =
      firstElement(
        "paymentsContainer",
        "paymentsList",
        "studentPayments"
      );

    if (!container) return;

    try {

      const {
        data,
        error
      } = await supabase
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
          "Payments could not be loaded:",
          error.message
        );

        return;
      }

      if (
        container.dataset.managedByExistingPortal ===
        "true"
      ) {
        return;
      }

      if (!data?.length) {

        container.innerHTML = `
          <div class="empty-state">
            No payment records available.
          </div>
        `;

        return;
      }

      container.innerHTML = data.map(
        (payment) => `
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
        "PAYMENTS ERROR:",
        error
      );
    }
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

    for (const element of elements) {

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
     LOGOUT
     ============================================================ */

  async function logout() {

    try {

      const {
        error
      } = await supabase.auth.signOut();

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


  function bindLogout() {

    const buttons = [
      $("logoutBtn"),
      $("studentLogoutBtn"),
      $("logoutButton")
    ].filter(Boolean);

    for (const button of buttons) {

      button.addEventListener(
        "click",
        (event) => {

          event.preventDefault();

          logout();
        }
      );
    }
  }


  /* ============================================================
     AUTH STATE
     ============================================================ */

  function listenForAuthChanges() {

    supabase.auth.onAuthStateChange(
      (event, session) => {

        console.log(
          "Student Portal Auth:",
          event
        );

        if (
          event === "SIGNED_OUT"
        ) {
          window.location.href =
            "login.html";
        }

        if (
          event === "TOKEN_REFRESHED" &&
          session?.user
        ) {
          currentUser =
            session.user;
        }
      }
    );
  }


  /* ============================================================
     MAIN INIT
     ============================================================ */

  async function init() {

    try {

      hideMessage();

      /*
        1. Authentication
      */

      const session =
        await getCurrentSession();

      currentUser =
        session.user;

      console.log(
        "GAAWOW Student Portal V6:",
        currentUser.id
      );


      /*
        2. Student
      */

      await loadStudent();


      /*
        3. Academic relationships
      */

      await loadAcademicInformation();


      /*
        4. Render
      */

      renderStudent();

      renderAcademicInformation();

      renderAccountStatus();

      renderLastLogin();


      /*
        5. Existing modules
           These are intentionally isolated.
      */

      await Promise.allSettled([
        loadGrades(),
        loadCertificates(),
        loadPayments()
      ]);


      /*
        6. Logout
      */

      bindLogout();

      listenForAuthChanges();


      /*
        7. Debug information
      */

      console.log(
        "Student:",
        currentStudent
      );

      console.log(
        "Enrollment:",
        currentEnrollment
      );

      console.log(
        "Academic:",
        currentAcademic
      );

    } catch (error) {

      console.error(
        "STUDENT PORTAL V6 INIT ERROR:",
        error
      );

      showMessage(
        error?.message ||
        "Unable to load Student Portal.",
        "error"
      );

      /*
        Do NOT redirect immediately.
        This makes debugging easier.
      */

      const protectedArea =
        firstElement(
          "studentPortal",
          "dashboard",
          "portalContent",
          "mainContent"
        );

      if (protectedArea) {
        protectedArea.style.display =
          "none";
      }
    }
  }


  /* ============================================================
     START
     ============================================================ */

  if (
    document.readyState === "loading"
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
