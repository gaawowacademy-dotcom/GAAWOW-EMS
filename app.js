// =====================================================
// GAAWOW EMS — PARENT PORTAL V1
// =====================================================

// =====================================================
// SUPABASE CONFIG
// =====================================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const { createClient } = supabase;

const db = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// =====================================================
// ELEMENTS
// =====================================================

const loginPage =
  document.getElementById("loginPage");

const dashboardPage =
  document.getElementById("dashboardPage");

const loginForm =
  document.getElementById("loginForm");

const loginButton =
  document.getElementById("loginButton");

const message =
  document.getElementById("message");

const logoutButton =
  document.getElementById("logoutButton");

const studentsContainer =
  document.getElementById("studentsContainer");

const welcomeTitle =
  document.getElementById("welcomeTitle");

const parentEmail =
  document.getElementById("parentEmail");

const studentCount =
  document.getElementById("studentCount");

const contentPanel =
  document.getElementById("contentPanel");

const contentTitle =
  document.getElementById("contentTitle");

const contentBody =
  document.getElementById("contentBody");

const studentSelector =
  document.getElementById("studentSelector");


// =====================================================
// APPLICATION STATE
// =====================================================

let currentUser = null;

let currentParent = null;

let accessibleStudents = [];

let selectedStudentId = null;

let currentModule = null;


// =====================================================
// SHOW LOGIN
// =====================================================

function showLogin() {

  loginPage.style.display = "flex";

  dashboardPage.style.display = "none";

  closeContentPanel();

}


// =====================================================
// SHOW DASHBOARD
// =====================================================

function showDashboard() {

  loginPage.style.display = "none";

  dashboardPage.style.display = "block";

}


// =====================================================
// LOGIN
// =====================================================

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();

      const email =
        document
          .getElementById("email")
          .value
          .trim();

      const password =
        document
          .getElementById("password")
          .value;

      loginButton.disabled = true;

      loginButton.textContent =
        "SIGNING IN...";

      message.style.color =
        "#0B4DA2";

      message.textContent =
        "Checking your account...";

      try {

        const {
          data,
          error
        } =
          await db.auth.signInWithPassword({
            email: email,
            password: password
          });

        if (error) {
          throw error;
        }

        currentUser =
          data.user;

        console.log(
          "Logged-in user:",
          currentUser
        );


        // -----------------------------------------
        // LOAD PARENT
        // -----------------------------------------

        await loadParentData(
          currentUser.id
        );


        // -----------------------------------------
        // LOAD CHILDREN
        // -----------------------------------------

        await loadParentStudents(
          currentParent.id
        );


        welcomeTitle.textContent =
          "Welcome to GAAWOW EMS";

        parentEmail.textContent =
          currentParent.email ||
          currentUser.email ||
          "";

        renderStudents(
          accessibleStudents
        );

        populateStudentSelector();

        showDashboard();

        message.textContent = "";


      } catch (error) {

        console.error(
          "Login error:",
          error
        );

        message.style.color =
          "#DC2626";

        message.textContent =
          error.message ||
          "Login failed. Please check your details.";

      } finally {

        loginButton.disabled =
          false;

        loginButton.textContent =
          "LOGIN TO PARENT PORTAL";

      }

    }
  );

}


// =====================================================
// LOAD PARENT
// =====================================================

async function loadParentData(profileId) {

  const {
    data,
    error
  } =
    await db
      .from("parents")
      .select(`
        id,
        profile_id,
        institution_id,
        full_name,
        phone,
        email,
        address,
        occupation
      `)
      .eq(
        "profile_id",
        profileId
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {

    throw new Error(
      "Parent profile was not found. Please contact GAAWOW Academy."
    );

  }

  currentParent =
    data;

  console.log(
    "Parent:",
    currentParent
  );

}


// =====================================================
// LOAD ONLY LINKED STUDENTS
// =====================================================

async function loadParentStudents(parentId) {

  // -----------------------------------------
  // GET LINKS
  // -----------------------------------------

  const {
    data: links,
    error: linkError
  } =
    await db
      .from("parent_students")
      .select(`
        student_id,
        relationship,
        is_primary
      `)
      .eq(
        "parent_id",
        parentId
      );

  if (linkError) {
    throw linkError;
  }


  if (!links || !links.length) {

    accessibleStudents = [];

    return;

  }


  const studentIds =
    links
      .map(
        item => item.student_id
      )
      .filter(Boolean);


  if (!studentIds.length) {

    accessibleStudents = [];

    return;

  }


  // -----------------------------------------
  // GET STUDENTS
  // -----------------------------------------

  const {
    data: students,
    error: studentError
  } =
    await db
      .from("students")
      .select(`
        id,
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
        institution_id
      `)
      .in(
        "id",
        studentIds
      );

  if (studentError) {
    throw studentError;
  }


  // -----------------------------------------
  // MERGE RELATIONSHIP
  // -----------------------------------------

  accessibleStudents =
    (students || []).map(
      student => {

        const link =
          links.find(
            item =>
              item.student_id ===
              student.id
          );

        return {
          ...student,

          relationship:
            link?.relationship || "",

          is_primary:
            link?.is_primary || false
        };

      }
    );


  console.log(
    "Parent accessible students:",
    accessibleStudents
  );

}


// =====================================================
// RENDER STUDENTS
// =====================================================

function renderStudents(students) {

  studentsContainer.innerHTML = "";

  studentCount.textContent =
    students.length +
    (
      students.length === 1
        ? " student"
        : " students"
    );


  if (!students.length) {

    studentsContainer.innerHTML = `
      <div class="empty">
        <strong>
          No Students Found
        </strong>

        No student is currently linked
        to this parent account.
      </div>
    `;

    return;

  }


  students.forEach(
    function (student) {

      const card =
        document.createElement("div");

      card.className =
        "student-card";


      const status =
        formatStatus(
          student.status
        );


      card.innerHTML = `

        <div class="student-header">

          <div class="student-icon">
            🎓
          </div>

          <div class="student-name">

            <h3>
              ${escapeHtml(
                student.full_name
              )}
            </h3>

            <div class="student-id">

              Student ID:
              ${escapeHtml(
                student.student_id ||
                "Not assigned"
              )}

            </div>

          </div>

        </div>


        <div class="student-status">

          <span class="status-dot"></span>

          ${escapeHtml(status)}

        </div>


        <div class="student-actions">

          <button
            class="student-action"
            onclick="openStudentModule(
              '${student.id}',
              'progress'
            )"
          >
            📊 Progress
          </button>


          <button
            class="student-action"
            onclick="openStudentModule(
              '${student.id}',
              'attendance'
            )"
          >
            📅 Attendance
          </button>


          <button
            class="student-action"
            onclick="openStudentModule(
              '${student.id}',
              'results'
            )"
          >
            📝 Grades
          </button>


          <button
            class="student-action"
            onclick="openStudentModule(
              '${student.id}',
              'certificates'
            )"
          >
            🏆 Certificates
          </button>

        </div>

      `;

      studentsContainer.appendChild(
        card
      );

    }
  );

}


// =====================================================
// STUDENT SELECTOR
// =====================================================

function populateStudentSelector() {

  studentSelector.innerHTML = "";

  accessibleStudents.forEach(
    student => {

      const option =
        document.createElement("option");

      option.value =
        student.id;

      option.textContent =
        student.full_name;

      studentSelector.appendChild(
        option
      );

    }
  );

}


// =====================================================
// OPEN FIRST STUDENT MODULE
// =====================================================

function openFirstStudentModule(moduleName) {

  if (!accessibleStudents.length) {

    alert(
      "No student is linked to this parent account."
    );

    return;

  }

  openStudentModule(
    accessibleStudents[0].id,
    moduleName
  );

}


// =====================================================
// OPEN STUDENT MODULE
// =====================================================

async function openStudentModule(
  studentId,
  moduleName
) {

  const student =
    accessibleStudents.find(
      item =>
        item.id === studentId
    );

  if (!student) {

    alert(
      "You do not have access to this student."
    );

    return;

  }


  selectedStudentId =
    studentId;

  currentModule =
    moduleName;


  studentSelector.value =
    studentId;


  contentPanel.style.display =
    "block";


  contentPanel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });


  const titles = {

    progress:
      "📊 Academic Progress",

    attendance:
      "📅 Attendance",

    results:
      "📝 Results & Grades",

    courses:
      "📚 Courses & Enrollment",

    certificates:
      "🏆 Certificates",

    profile:
      "👤 Student Profile"

  };


  contentTitle.textContent =
    titles[moduleName] ||
    "Student Information";


  contentBody.innerHTML = `
    <div class="loading">
      Loading ${escapeHtml(
        titles[moduleName] ||
        "information"
      )}...
    </div>
  `;


  try {

    switch (moduleName) {

      case "progress":
        await loadProgress(
          studentId
        );
        break;

      case "attendance":
        await loadAttendance(
          studentId
        );
        break;

      case "results":
        await loadResults(
          studentId
        );
        break;

      case "courses":
        await loadCourses(
          studentId
        );
        break;

      case "certificates":
        await loadCertificates(
          studentId
        );
        break;

      case "profile":
        renderStudentProfile(
          student
        );
        break;

      default:

        contentBody.innerHTML =
          `<div class="empty">
            Module not found.
          </div>`;

    }


  } catch (error) {

    console.error(
      "Module error:",
      error
    );

    contentBody.innerHTML = `
      <div class="empty">

        <strong>
          Unable to load information
        </strong>

        ${escapeHtml(
          error.message ||
          "Please try again."
        )}

      </div>
    `;

  }

}


// =====================================================
// CHANGE SELECTED STUDENT
// =====================================================

function changeSelectedStudent() {

  const studentId =
    studentSelector.value;

  if (!studentId) {
    return;
  }

  openStudentModule(
    studentId,
    currentModule
  );

}


// =====================================================
// PROGRESS
// =====================================================

async function loadProgress(studentId) {

  const [
    attendanceResult,
    resultsResult
  ] =
    await Promise.all([

      db
        .from("attendance")
        .select(`
          id,
          status
        `)
        .eq(
          "student_id",
          studentId
        ),

      db
        .from("results")
        .select(`
          id,
          score,
          max_score,
          percentage,
          grade,
          is_published
        `)
        .eq(
          "student_id",
          studentId
        )
        .eq(
          "is_published",
          true
        )

    ]);


  if (attendanceResult.error) {
    throw attendanceResult.error;
  }

  if (resultsResult.error) {
    throw resultsResult.error;
  }


  const attendance =
    attendanceResult.data || [];

  const results =
    resultsResult.data || [];


  let present = 0;
  let absent = 0;
  let late = 0;


  attendance.forEach(
    item => {

      const status =
        String(
          item.status || ""
        ).toLowerCase();

      if (
        status.includes("present")
      ) {
        present++;

      } else if (
        status.includes("absent")
      ) {
        absent++;

      } else if (
        status.includes("late")
      ) {
        late++;
      }

    }
  );


  const percentages =
    results
      .map(
        r =>
          Number(
            r.percentage
          )
      )
      .filter(
        n => !Number.isNaN(n)
      );


  const average =
    percentages.length
      ? (
          percentages.reduce(
            (a, b) => a + b,
            0
          ) /
          percentages.length
        ).toFixed(1)
      : null;


  contentBody.innerHTML = `

    <div class="profile-grid">

      <div class="profile-field">
        <small>Published Results</small>
        <strong>
          ${results.length}
        </strong>
      </div>

      <div class="profile-field">
        <small>Average Score</small>
        <strong>
          ${
            average !== null
              ? average + "%"
              : "No data"
          }
        </strong>
      </div>

      <div class="profile-field">
        <small>Present</small>
        <strong>
          ${present}
        </strong>
      </div>

      <div class="profile-field">
        <small>Absent</small>
        <strong>
          ${absent}
        </strong>
      </div>

      <div class="profile-field">
        <small>Late</small>
        <strong>
          ${late}
        </strong>
      </div>

    </div>

  `;

}


// =====================================================
// ATTENDANCE
// =====================================================

async function loadAttendance(studentId) {

  const {
    data,
    error
  } =
    await db
      .from("attendance")
      .select(`
        id,
        status,
        notes,
        recorded_at,
        lesson_id
      `)
      .eq(
        "student_id",
        studentId
      )
      .order(
        "recorded_at",
        {
          ascending: false
        }
      );


  if (error) {
    throw error;
  }


  if (!data || !data.length) {

    contentBody.innerHTML = `
      <div class="empty">
        <strong>
          No Attendance Records
        </strong>

        Attendance records for this student
        are not available yet.
      </div>
    `;

    return;

  }


  const lessonIds =
    [
      ...new Set(
        data
          .map(
            item =>
              item.lesson_id
          )
          .filter(Boolean)
      )
    ];


  let lessons = [];


  if (lessonIds.length) {

    const {
      data: lessonData,
      error: lessonError
    } =
      await db
        .from("lessons")
        .select(`
          id,
          title,
          lesson_date,
          start_time,
          end_time,
          room
        `)
        .in(
          "id",
          lessonIds
        );

    if (lessonError) {
      throw lessonError;
    }

    lessons =
      lessonData || [];

  }


  const lessonMap =
    new Map(
      lessons.map(
        lesson => [
          lesson.id,
          lesson
        ]
      )
    );


  contentBody.innerHTML = `

    <div class="data-list">

      ${data.map(
        item => {

          const lesson =
            lessonMap.get(
              item.lesson_id
            );

          return `

            <div class="data-item">

              <div class="data-item-title">

                ${
                  escapeHtml(
                    lesson?.title ||
                    "Lesson"
                  )
                }

              </div>

              <div class="data-item-meta">

                Date:
                ${
                  escapeHtml(
                    lesson?.lesson_date ||
                    formatDate(
                      item.recorded_at
                    )
                  )
                }

                <br>

                Status:
                <span class="badge badge-success">
                  ${
                    escapeHtml(
                      formatStatus(
                        item.status
                      )
                    )
                  }
                </span>

                ${
                  lesson?.room
                    ? `
                      <br>
                      Room:
                      ${escapeHtml(
                        lesson.room
                      )}
                    `
                    : ""
                }

                ${
                  item.notes
                    ? `
                      <br>
                      Notes:
                      ${escapeHtml(
                        item.notes
                      )}
                    `
                    : ""
                }

              </div>

            </div>

          `;

        }
      ).join("")}

    </div>

  `;

}


// =====================================================
// RESULTS
// =====================================================

async function loadResults(studentId) {

  const {
    data,
    error
  } =
    await db
      .from("results")
      .select(`
        id,
        exam_id,
        subject_id,
        score,
        max_score,
        percentage,
        grade,
        remarks,
        is_published,
        created_at
      `)
      .eq(
        "student_id",
        studentId
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


  if (error) {
    throw error;
  }


  if (!data || !data.length) {

    contentBody.innerHTML = `
      <div class="empty">

        <strong>
          No Published Results
        </strong>

        Results will appear here after
        they are published by GAAWOW Academy.

      </div>
    `;

    return;

  }


  const examIds =
    [
      ...new Set(
        data
          .map(
            item =>
              item.exam_id
          )
          .filter(Boolean)
      )
    ];


  const subjectIds =
    [
      ...new Set(
        data
          .map(
            item =>
              item.subject_id
          )
          .filter(Boolean)
      )
    ];


  let exams = [];
  let subjects = [];


  if (examIds.length) {

    const {
      data: examData,
      error: examError
    } =
      await db
        .from("exams")
        .select(`
          id,
          title,
          exam_type,
          exam_date,
          course_id
        `)
        .in(
          "id",
          examIds
        );

    if (examError) {
      throw examError;
    }

    exams =
      examData || [];

  }


  if (subjectIds.length) {

    const {
      data: subjectData,
      error: subjectError
    } =
      await db
        .from("subjects")
        .select(`
          id,
          name,
          code
        `)
        .in(
          "id",
          subjectIds
        );

    if (subjectError) {
      throw subjectError;
    }

    subjects =
      subjectData || [];

  }


  const examMap =
    new Map(
      exams.map(
        exam => [
          exam.id,
          exam
        ]
      )
    );


  const subjectMap =
    new Map(
      subjects.map(
        subject => [
          subject.id,
          subject
        ]
      )
    );


  contentBody.innerHTML = `

    <div class="data-list">

      ${data.map(
        result => {

          const exam =
            examMap.get(
              result.exam_id
            );

          const subject =
            subjectMap.get(
              result.subject_id
            );


          return `

            <div class="data-item">

              <div class="data-item-title">

                ${
                  escapeHtml(
                    subject?.name ||
                    "Subject"
                  )
                }

                ${
                  subject?.code
                    ? `
                      —
                      ${escapeHtml(
                        subject.code
                      )}
                    `
                    : ""
                }

              </div>

              <div class="data-item-meta">

                Exam:
                ${
                  escapeHtml(
                    exam?.title ||
                    "Exam"
                  )
                }

                <br>

                Date:
                ${
                  escapeHtml(
                    exam?.exam_date ||
                    "—"
                  )
                }

                <br>

                Score:
                <strong>
                  ${escapeHtml(
                    result.score
                  )}
                  /
                  ${escapeHtml(
                    result.max_score
                  )}
                </strong>

                <br>

                Percentage:
                <strong>
                  ${
                    result.percentage ??
                    "—"
                  }%
                </strong>

                <br>

                Grade:
                <span class="badge badge-gold">
                  ${
                    escapeHtml(
                      result.grade ||
                      "—"
                    )
                  }
                </span>

                ${
                  result.remarks
                    ? `
                      <br>
                      Remarks:
                      ${escapeHtml(
                        result.remarks
                      )}
                    `
                    : ""
                }

              </div>

            </div>

          `;

        }
      ).join("")}

    </div>

  `;

}


// =====================================================
// COURSES + ENROLLMENTS
// =====================================================

async function loadCourses(studentId) {

  const {
    data,
    error
  } =
    await db
      .from("enrollments")
      .select(`
        id,
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


  if (!data || !data.length) {

    contentBody.innerHTML = `
      <div class="empty">

        <strong>
          No Course Enrollment
        </strong>

        No course enrollment was found
        for this student.

      </div>
    `;

    return;

  }


  const courseIds =
    [
      ...new Set(
        data
          .map(
            item =>
              item.course_id
          )
          .filter(Boolean)
      )
    ];


  const classIds =
    [
      ...new Set(
        data
          .map(
            item =>
              item.class_id
          )
          .filter(Boolean)
      )
    ];


  let courses = [];
  let classes = [];


  if (courseIds.length) {

    const {
      data: courseData,
      error: courseError
    } =
      await db
        .from("courses")
        .select(`
          id,
          name,
          code,
          description,
          duration_months,
          fee,
          department_id
        `)
        .in(
          "id",
          courseIds
        );

    if (courseError) {
      throw courseError;
    }

    courses =
      courseData || [];

  }


  if (classIds.length) {

    const {
      data: classData,
      error: classError
    } =
      await db
        .from("classes")
        .select(`
          id,
          name,
          code,
          academic_year,
          room,
          is_active
        `)
        .in(
          "id",
          classIds
        );

    if (classError) {
      throw classError;
    }

    classes =
      classData || [];

  }


  const courseMap =
    new Map(
      courses.map(
        course => [
          course.id,
          course
        ]
      )
    );


  const classMap =
    new Map(
      classes.map(
        item => [
          item.id,
          item
        ]
      )
    );


  contentBody.innerHTML = `

    <div class="data-list">

      ${data.map(
        enrollment => {

          const course =
            courseMap.get(
              enrollment.course_id
            );

          const classInfo =
            classMap.get(
              enrollment.class_id
            );


          return `

            <div class="data-item">

              <div class="data-item-title">

                ${
                  escapeHtml(
                    course?.name ||
                    "Course"
                  )
                }

              </div>

              <div class="data-item-meta">

                Course Code:
                ${
                  escapeHtml(
                    course?.code ||
                    "—"
                  )
                }

                <br>

                Enrollment No:
                ${
                  escapeHtml(
                    enrollment.enrollment_number ||
                    "—"
                  )
                }

                <br>

                Class:
                ${
                  escapeHtml(
                    classInfo?.name ||
                    "—"
                  )
                }

                ${
                  classInfo?.academic_year
                    ? `
                      (${escapeHtml(
                        classInfo.academic_year
                      )})
                    `
                    : ""
                }

                <br>

                Enrollment Date:
                ${
                  escapeHtml(
                    enrollment.enrollment_date ||
                    "—"
                  )
                }

                <br>

                Status:
                <span class="badge badge-success">
                  ${
                    escapeHtml(
                      formatStatus(
                        enrollment.status
                      )
                    )
                  }
                </span>

              </div>

            </div>

          `;

        }
      ).join("")}

    </div>

  `;

}


// =====================================================
// CERTIFICATES
// =====================================================

async function loadCertificates(studentId) {

  const {
    data,
    error
  } =
    await db
      .from("certificates")
      .select(`
        id,
        course_id,
        certificate_no,
        certificate_id,
        verify_code,
        issue_date,
        expiry_date,
        status,
        certificate_url,
        pdf_url,
        qr_url,
        student_name_snapshot,
        course_name_snapshot
      `)
      .eq(
        "student_id",
        studentId
      )
      .order(
        "issue_date",
        {
          ascending: false
        }
      );


  if (error) {
    throw error;
  }


  if (!data || !data.length) {

    contentBody.innerHTML = `
      <div class="empty">

        <strong>
          No Certificates
        </strong>

        No certificate has been issued
        to this student yet.

      </div>
    `;

    return;

  }


  contentBody.innerHTML = `

    <div class="data-list">

      ${data.map(
        certificate => {

          return `

            <div class="data-item">

              <div class="data-item-title">

                🏆
                ${
                  escapeHtml(
                    certificate.course_name_snapshot ||
                    "Certificate"
                  )
                }

              </div>

              <div class="data-item-meta">

                Certificate No:
                <strong>
                  ${
                    escapeHtml(
                      certificate.certificate_no
                    )
                  }
                </strong>

                <br>

                Certificate ID:
                ${
                  escapeHtml(
                    certificate.certificate_id
                  )
                }

                <br>

                Issue Date:
                ${
                  escapeHtml(
                    certificate.issue_date
                  )
                }

                ${
                  certificate.expiry_date
                    ? `
                      <br>
                      Expiry Date:
                      ${escapeHtml(
                        certificate.expiry_date
                      )}
                    `
                    : ""
                }

                <br>

                Status:
                <span class="badge badge-success">
                  ${
                    escapeHtml(
                      formatStatus(
                        certificate.status
                      )
                    )
                  }
                </span>


                <div class="certificate-actions">

                  ${
                    certificate.pdf_url
                      ? `
                        <a
                          class="small-button"
                          href="${safeUrl(
                            certificate.pdf_url
                          )}"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          📄 View PDF
                        </a>
                      `
                      : ""
                  }


                  ${
                    certificate.certificate_url
                      ? `
                        <a
                          class="small-button"
                          href="${safeUrl(
                            certificate.certificate_url
                          )}"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          🎓 Certificate
                        </a>
                      `
                      : ""
                  }


                  ${
                    certificate.qr_url
                      ? `
                        <a
                          class="small-button gold"
                          href="${safeUrl(
                            certificate.qr_url
                          )}"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          🔳 QR
                        </a>
                      `
                      : ""
                  }

                </div>

              </div>

            </div>

          `;

        }
      ).join("")}

    </div>

  `;

}


// =====================================================
// STUDENT PROFILE
// =====================================================

function renderStudentProfile(student) {

  contentBody.innerHTML = `

    <div class="profile-grid">

      <div class="profile-field">

        <small>Full Name</small>

        <strong>
          ${escapeHtml(
            student.full_name
          )}
        </strong>

      </div>


      <div class="profile-field">

        <small>Student ID</small>

        <strong>
          ${escapeHtml(
            student.student_id ||
            "—"
          )}
        </strong>

      </div>


      <div class="profile-field">

        <small>Gender</small>

        <strong>
          ${escapeHtml(
            student.gender ||
            "—"
          )}
        </strong>

      </div>


      <div class="profile-field">

        <small>Date of Birth</small>

        <strong>
          ${escapeHtml(
            student.date_of_birth ||
            "—"
          )}
        </strong>

      </div>


      <div class="profile-field">

        <small>Phone</small>

        <strong>
          ${escapeHtml(
            student.phone ||
            "—"
          )}
        </strong>

      </div>


      <div class="profile-field">

        <small>Email</small>

        <strong>
          ${escapeHtml(
            student.email ||
            "—"
          )}
        </strong>

      </div>


      <div class="profile-field">

        <small>Admission Date</small>

        <strong>
          ${escapeHtml(
            student.admission_date ||
            "—"
          )}
        </strong>

      </div>


      <div class="profile-field">

        <small>Status</small>

        <strong>
          ${escapeHtml(
            formatStatus(
              student.status
            )
          )}
        </strong>

      </div>


      <div class="profile-field">

        <small>Address</small>

        <strong>
          ${escapeHtml(
            student.address ||
            "—"
          )}
        </strong>

      </div>


      <div class="profile-field">

        <small>Parent Relationship</small>

        <strong>
          ${escapeHtml(
            student.relationship ||
            "—"
          )}
        </strong>

      </div>

    </div>

  `;

}


// =====================================================
// CLOSE CONTENT
// =====================================================

function closeContentPanel() {

  if (!contentPanel) {
    return;
  }

  contentPanel.style.display =
    "none";

  currentModule =
    null;

}


// =====================================================
// LOGOUT
// =====================================================

if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    async function () {

      logoutButton.disabled =
        true;

      logoutButton.textContent =
        "LOGGING OUT...";


      try {

        const {
          error
        } =
          await db.auth.signOut();

        if (error) {
          throw error;
        }


        currentUser =
          null;

        currentParent =
          null;

        accessibleStudents =
          [];

        selectedStudentId =
          null;

        currentModule =
          null;


        studentsContainer.innerHTML =
          "";

        parentEmail.textContent =
          "";

        message.textContent =
          "";

        showLogin();


      } catch (error) {

        console.error(
          "Logout error:",
          error
        );

        alert(
          "Logout failed. Please try again."
        );


      } finally {

        logoutButton.disabled =
          false;

        logoutButton.textContent =
          "LOGOUT";

      }

    }
  );

}


// =====================================================
// CHECK EXISTING SESSION
// =====================================================

async function checkSession() {

  try {

    const {
      data,
      error
    } =
      await db.auth.getSession();


    if (error) {
      throw error;
    }


    if (
      data &&
      data.session &&
      data.session.user
    ) {

      currentUser =
        data.session.user;


      await loadParentData(
        currentUser.id
      );


      await loadParentStudents(
        currentParent.id
      );


      welcomeTitle.textContent =
        "Welcome to GAAWOW EMS";

      parentEmail.textContent =
        currentParent.email ||
        currentUser.email ||
        "";


      renderStudents(
        accessibleStudents
      );


      populateStudentSelector();


      showDashboard();


    } else {

      showLogin();

    }


  } catch (error) {

    console.error(
      "Session check error:",
      error
    );

    showLogin();

  }

}


// =====================================================
// SECURITY — ESCAPE HTML
// =====================================================

function escapeHtml(value) {

  const div =
    document.createElement("div");

  div.textContent =
    value ?? "";

  return div.innerHTML;

}


// =====================================================
// SAFE URL
// =====================================================

function safeUrl(value) {

  if (!value) {
    return "#";
  }

  try {

    const url =
      new URL(
        value,
        window.location.href
      );

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return "#";
    }

    return url.href;

  } catch {

    return "#";

  }

}


// =====================================================
// FORMAT STATUS
// =====================================================

function formatStatus(value) {

  if (!value) {
    return "Unknown";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      char =>
        char.toUpperCase()
    );

}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(value) {

  if (!value) {
    return "—";
  }

  try {

    return new Date(value)
      .toLocaleDateString();

  } catch {

    return String(value);

  }

}


// =====================================================
// START
// =====================================================

checkSession();
