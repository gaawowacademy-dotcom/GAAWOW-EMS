/* =========================================================
   GAAWOW EMS — PARENT PORTAL
   Phase 3
========================================================= */


/* =========================================================
   SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkKf1b_s0RjIbAi5g_RqLCs145";

const db =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   DOM ELEMENTS
========================================================= */

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


/* =========================================================
   DASHBOARD SUMMARY ELEMENTS
========================================================= */

const summaryProgress =
  document.getElementById("summaryProgress");

const summaryCourses =
  document.getElementById("summaryCourses");

const summaryAttendance =
  document.getElementById("summaryAttendance");

const summaryScore =
  document.getElementById("summaryScore");

const summaryCompleted =
  document.getElementById("summaryCompleted");

const summaryCourseText =
  document.getElementById("summaryCourseText");


/* =========================================================
   STATE
========================================================= */

let currentUser = null;

let currentParent = null;

let accessibleStudents = [];

let selectedStudentId = null;

let currentModule = null;


/* =========================================================
   LOGIN
========================================================= */

loginForm.addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();

    const email =
      document.getElementById("email").value.trim();

    const password =
      document.getElementById("password").value;

    if (!email || !password) {

      showMessage(
        "Please enter email and password.",
        "error"
      );

      return;
    }

    setLoginLoading(true);

    clearMessage();

    try {

      const {
        data,
        error
      } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Login failed.");
      }

      currentUser = data.user;


      /* Load parent */

      currentParent =
        await loadParentData(currentUser.id);


      if (!currentParent) {

        await db.auth.signOut();

        currentUser = null;

        throw new Error(
          "Parent profile was not found. Please contact GAAWOW Academy."
        );
      }


      /* Load linked students */

      accessibleStudents =
        await loadParentStudents(
          currentParent.id
        );


      if (!accessibleStudents.length) {

        await db.auth.signOut();

        currentUser = null;
        currentParent = null;

        throw new Error(
          "No students are linked to this parent account."
        );
      }


      /* Show dashboard */

      renderParentHeader();

      renderStudents();

      populateStudentSelector();

      showDashboard();


      /* Load first student's summary */

      if (accessibleStudents.length) {

        selectedStudentId =
          accessibleStudents[0].id;

        await loadDashboardSummary(
          selectedStudentId
        );

        openFirstStudentModule();
      }

      clearMessage();

    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      showMessage(
        getFriendlyError(error),
        "error"
      );

    } finally {

      setLoginLoading(false);

    }

  }
);


/* =========================================================
   LOAD PARENT DATA
========================================================= */

async function loadParentData(profileId) {

  const {
    data,
    error
  } = await db
    .from("parents")
    .select(`
      id,
      institution_id,
      profile_id,
      full_name,
      phone,
      email,
      address,
      occupation,
      created_at,
      updated_at
    `)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {

    console.error(
      "Parent query error:",
      error
    );

    throw error;
  }

  return data;
}


/* =========================================================
   LOAD PARENT STUDENTS
========================================================= */

async function loadParentStudents(parentId) {

  const {
    data: links,
    error: linkError
  } = await db
    .from("parent_students")
    .select(`
      id,
      parent_id,
      student_id,
      relationship,
      is_primary
    `)
    .eq("parent_id", parentId);

  if (linkError) {

    console.error(
      "Parent students link error:",
      linkError
    );

    throw linkError;
  }

  if (!links || !links.length) {
    return [];
  }

  const studentIds =
    links
      .map(row => row.student_id)
      .filter(Boolean);

  if (!studentIds.length) {
    return [];
  }


  const {
    data: students,
    error: studentError
  } = await db
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
    `)
    .in("id", studentIds);

  if (studentError) {

    console.error(
      "Students query error:",
      studentError
    );

    throw studentError;
  }


  return (students || []).map(student => {

    const link =
      links.find(
        item =>
          item.student_id === student.id
      );

    return {
      ...student,
      relationship:
        link?.relationship || "Parent",
      is_primary:
        Boolean(link?.is_primary)
    };

  });

}


/* =========================================================
   HEADER
========================================================= */

function renderParentHeader() {

  const name =
    currentParent?.full_name ||
    "Parent";

  const email =
    currentUser?.email ||
    currentParent?.email ||
    "";

  welcomeTitle.textContent =
    `Welcome, ${name}`;

  parentEmail.textContent =
    email;

}


/* =========================================================
   RENDER STUDENTS
========================================================= */

function renderStudents() {

  studentsContainer.innerHTML = "";

  const count =
    accessibleStudents.length;

  studentCount.textContent =
    `${count} ${count === 1 ? "Student" : "Students"}`;


  if (!count) {

    studentsContainer.innerHTML = `
      <div class="empty">
        No linked students found.
      </div>
    `;

    return;
  }


  accessibleStudents.forEach(student => {

    const card =
      document.createElement("div");

    card.className =
      "student-card";

    card.dataset.studentId =
      student.id;


    const photoHtml =
      student.photo_url
        ? `
          <img
            class="student-photo"
            src="${safeUrl(student.photo_url)}"
            alt="${escapeHtml(student.full_name || "Student")}"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          >
          <div
            class="student-placeholder"
            style="display:none;"
          >
            ${getInitials(student.full_name)}
          </div>
        `
        : `
          <div class="student-placeholder">
            ${getInitials(student.full_name)}
          </div>
        `;


    card.innerHTML = `

      <div class="student-main">

        ${photoHtml}

        <div>

          <div class="student-name">
            ${escapeHtml(student.full_name || "Unnamed Student")}
          </div>

          <div class="student-id">
            ID:
            ${escapeHtml(student.student_id || "N/A")}
          </div>

        </div>

      </div>

      <span class="relationship">
        ${escapeHtml(student.relationship || "Parent")}
      </span>

      <button
        type="button"
        class="student-open"
      >
        View Student
      </button>

    `;


    card
      .querySelector(".student-open")
      .addEventListener(
        "click",
        () => {

          selectedStudentId =
            student.id;

          populateStudentSelector();

          studentSelector.value =
            student.id;

          loadDashboardSummary(
            student.id
          );

          openStudentModule(
            "progress",
            student.id
          );

        }
      );


    studentsContainer.appendChild(card);

  });


  updateActiveStudent();

}


/* =========================================================
   UPDATE ACTIVE STUDENT
========================================================= */

function updateActiveStudent() {

  document
    .querySelectorAll(".student-card")
    .forEach(card => {

      card.classList.toggle(
        "active",
        card.dataset.studentId ===
        selectedStudentId
      );

    });

}


/* =========================================================
   STUDENT SELECTOR
========================================================= */

function populateStudentSelector() {

  if (!studentSelector) {
    return;
  }

  studentSelector.innerHTML = "";

  accessibleStudents.forEach(student => {

    const option =
      document.createElement("option");

    option.value =
      student.id;

    option.textContent =
      `${student.full_name} — ${student.student_id || "No ID"}`;

    studentSelector.appendChild(option);

  });


  if (selectedStudentId) {

    studentSelector.value =
      selectedStudentId;

  } else if (accessibleStudents.length) {

    selectedStudentId =
      accessibleStudents[0].id;

    studentSelector.value =
      selectedStudentId;

  }

}


/* =========================================================
   STUDENT SELECTOR CHANGE
========================================================= */

studentSelector.addEventListener(
  "change",
  async function () {

    const studentId =
      this.value;

    if (!studentId) {
      return;
    }

    selectedStudentId =
      studentId;

    updateActiveStudent();

    await loadDashboardSummary(
      studentId
    );

    if (currentModule) {

      await openStudentModule(
        currentModule,
        studentId
      );

    }

  }
);


/* =========================================================
   SERVICE BUTTONS
========================================================= */

document
  .querySelectorAll(".service-card")
  .forEach(card => {

    card.addEventListener(
      "click",
      async function () {

        const moduleName =
          this.dataset.module;

        if (!selectedStudentId) {
          return;
        }

        await openStudentModule(
          moduleName,
          selectedStudentId
        );

      }
    );

  });


/* =========================================================
   OPEN FIRST MODULE
========================================================= */

function openFirstStudentModule() {

  if (!accessibleStudents.length) {
    return;
  }

  const first =
    accessibleStudents[0];

  selectedStudentId =
    first.id;

  populateStudentSelector();

  openStudentModule(
    "progress",
    first.id
  );

}


/* =========================================================
   OPEN MODULE
========================================================= */

async function openStudentModule(
  moduleName,
  studentId
) {

  selectedStudentId =
    studentId;

  currentModule =
    moduleName;

  updateActiveStudent();

  if (studentSelector) {

    studentSelector.value =
      studentId;

  }

  await loadDashboardSummary(
    studentId
  );


  contentPanel.classList.remove(
    "hidden"
  );

  contentBody.innerHTML = `
    <div class="loading">
      Loading...
    </div>
  `;


  switch (moduleName) {

    case "progress":

      contentTitle.textContent =
        "Academic Progress";

      await loadProgress(
        studentId
      );

      break;


    case "attendance":

      contentTitle.textContent =
        "Attendance";

      await loadAttendance(
        studentId
      );

      break;


    case "results":

      contentTitle.textContent =
        "Results & Grades";

      await loadResults(
        studentId
      );

      break;


    case "courses":

      contentTitle.textContent =
        "Courses";

      await loadCourses(
        studentId
      );

      break;


    case "certificates":

      contentTitle.textContent =
        "Certificates";

      await loadCertificates(
        studentId
      );

      break;


    case "profile":

      contentTitle.textContent =
        "Student Profile";

      renderStudentProfile(
        studentId
      );

      break;


    default:

      contentTitle.textContent =
        "Student Information";

      contentBody.innerHTML = `
        <div class="empty">
          Select a service.
        </div>
      `;

  }

}


/* =========================================================
   DASHBOARD SUMMARY
========================================================= */

async function loadDashboardSummary(
  studentId
) {

  if (summaryProgress)
    summaryProgress.textContent = "—";

  if (summaryCourses)
    summaryCourses.textContent = "Loading...";

  if (summaryAttendance)
    summaryAttendance.textContent = "—";

  if (summaryScore)
    summaryScore.textContent = "—";

  if (summaryCompleted)
    summaryCompleted.textContent = "—";

  if (summaryCourseText)
    summaryCourseText.textContent =
      "Completed courses";


  const {
    data,
    error
  } = await db
    .from("academic_progress")
    .select(`
      academic_year,
      total_courses,
      completed_courses,
      attendance_percentage,
      average_score,
      remarks,
      updated_at
    `)
    .eq("student_id", studentId)
    .order(
      "updated_at",
      { ascending: false }
    )
    .limit(1)
    .maybeSingle();


  if (error) {

    console.error(
      "Academic summary error:",
      error
    );

    if (summaryCourses)
      summaryCourses.textContent =
        "No progress data";

    return;
  }


  if (!data) {

    if (summaryCourses)
      summaryCourses.textContent =
        "No progress data";

    if (summaryCourseText)
      summaryCourseText.textContent =
        "No academic record";

    return;
  }


  const totalCourses =
    Number(data.total_courses || 0);

  const completedCourses =
    Number(data.completed_courses || 0);


  const progress =
    totalCourses > 0
      ? Math.round(
          (completedCourses / totalCourses) * 100
        )
      : 0;


  const attendance =
    data.attendance_percentage !== null &&
    data.attendance_percentage !== undefined
      ? Number(
          data.attendance_percentage
        ).toFixed(0) + "%"
      : "—";


  const score =
    data.average_score !== null &&
    data.average_score !== undefined
      ? Number(
          data.average_score
        ).toFixed(0) + "%"
      : "—";


  if (summaryProgress)
    summaryProgress.textContent =
      progress + "%";


  if (summaryCourses)
    summaryCourses.textContent =
      `${completedCourses} of ${totalCourses} courses completed`;


  if (summaryAttendance)
    summaryAttendance.textContent =
      attendance;


  if (summaryScore)
    summaryScore.textContent =
      score;


  if (summaryCompleted)
    summaryCompleted.textContent =
      `${completedCourses}/${totalCourses}`;


  if (summaryCourseText) {

    summaryCourseText.textContent =
      data.academic_year
        ? `Academic Year ${data.academic_year}`
        : "Completed courses";

  }

}


/* =========================================================
   ACADEMIC PROGRESS
========================================================= */

async function loadProgress(
  studentId
) {

  const {
    data: progress,
    error
  } = await db
    .from("academic_progress")
    .select(`
      academic_year,
      total_courses,
      completed_courses,
      attendance_percentage,
      average_score,
      remarks,
      updated_at
    `)
    .eq("student_id", studentId)
    .order(
      "updated_at",
      { ascending: false }
    )
    .limit(1)
    .maybeSingle();


  if (error) {

    renderError(error);

    return;
  }


  if (!progress) {

    contentBody.innerHTML = `
      <div class="empty">
        No academic progress record is available for this student yet.
      </div>
    `;

    return;
  }


  const total =
    Number(progress.total_courses || 0);

  const completed =
    Number(progress.completed_courses || 0);

  const progressPercent =
    total > 0
      ? Math.round((completed / total) * 100)
      : 0;


  const attendance =
    progress.attendance_percentage != null
      ? Number(progress.attendance_percentage).toFixed(0)
      : "0";


  const score =
    progress.average_score != null
      ? Number(progress.average_score).toFixed(0)
      : "0";


  contentBody.innerHTML = `

    <div class="stats-row">

      <div class="mini-stat">
        <span>Total Courses</span>
        <strong>${total}</strong>
      </div>

      <div class="mini-stat">
        <span>Completed</span>
        <strong>${completed}</strong>
      </div>

      <div class="mini-stat">
        <span>Attendance</span>
        <strong>${attendance}%</strong>
      </div>

      <div class="mini-stat">
        <span>Average Score</span>
        <strong>${score}%</strong>
      </div>

    </div>


    <div class="progress-box">

      <div class="progress-header">
        <span>Course Completion</span>
        <span>${progressPercent}%</span>
      </div>

      <div class="progress-track">

        <div
          class="progress-fill"
          style="width:${Math.min(progressPercent, 100)}%"
        ></div>

      </div>

    </div>


    <div class="profile-item">

      <span>Academic Year</span>

      <strong>
        ${escapeHtml(
          progress.academic_year || "N/A"
        )}
      </strong>

    </div>


    <br>


    <div class="profile-item">

      <span>Teacher / Academic Remarks</span>

      <strong>
        ${escapeHtml(
          progress.remarks || "No remarks"
        )}
      </strong>

    </div>

  `;

}


/* =========================================================
   ATTENDANCE
========================================================= */

async function loadAttendance(
  studentId
) {

  const {
    data: attendance,
    error
  } = await db
    .from("attendance")
    .select(`
      id,
      lesson_id,
      status,
      notes,
      recorded_at
    `)
    .eq("student_id", studentId)
    .order(
      "recorded_at",
      { ascending: false }
    );


  if (error) {

    renderError(error);

    return;
  }


  if (!attendance || !attendance.length) {

    contentBody.innerHTML = `
      <div class="empty">
        No attendance records are available yet.
      </div>
    `;

    return;
  }


  const lessonIds =
    attendance
      .map(row => row.lesson_id)
      .filter(Boolean);


  let lessons = [];


  if (lessonIds.length) {

    const {
      data,
      error: lessonError
    } = await db
      .from("lessons")
      .select(`
        id,
        title,
        lesson_date,
        start_time,
        end_time,
        room
      `)
      .in("id", lessonIds);


    if (lessonError) {

      console.error(
        "Lessons error:",
        lessonError
      );

    } else {

      lessons = data || [];

    }

  }


  const lessonMap =
    new Map(
      lessons.map(
        lesson => [lesson.id, lesson]
      )
    );


  let present = 0;
  let absent = 0;
  let late = 0;


  attendance.forEach(row => {

    const status =
      String(
        row.status || ""
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

  });


  const total =
    attendance.length;


  const percentage =
    total
      ? Math.round(
          (present / total) * 100
        )
      : 0;


  contentBody.innerHTML = `

    <div class="stats-row">

      <div class="mini-stat">
        <span>Total Records</span>
        <strong>${total}</strong>
      </div>

      <div class="mini-stat">
        <span>Present</span>
        <strong>${present}</strong>
      </div>

      <div class="mini-stat">
        <span>Absent</span>
        <strong>${absent}</strong>
      </div>

      <div class="mini-stat">
        <span>Late</span>
        <strong>${late}</strong>
      </div>

    </div>


    <div class="progress-box">

      <div class="progress-header">
        <span>Attendance Rate</span>
        <span>${percentage}%</span>
      </div>

      <div class="progress-track">

        <div
          class="progress-fill"
          style="width:${Math.min(percentage,100)}%"
        ></div>

      </div>

    </div>


    <div class="table-wrap">

      <table class="data-table">

        <thead>

          <tr>
            <th>Date</th>
            <th>Lesson</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>

        </thead>

        <tbody>

          ${attendance.map(row => {

            const lesson =
              lessonMap.get(
                row.lesson_id
              );

            return `

              <tr>

                <td>
                  ${formatDate(
                    lesson?.lesson_date ||
                    row.recorded_at
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    lesson?.title ||
                    "Lesson"
                  )}
                </td>

                <td>
                  ${formatStatus(
                    row.status
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    row.notes || "—"
                  )}
                </td>

              </tr>

            `;

          }).join("")}

        </tbody>

      </table>

    </div>

  `;

}


/* =========================================================
   RESULTS
========================================================= */

async function loadResults(
  studentId
) {

  const {
    data: results,
    error
  } = await db
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
    .eq("student_id", studentId)
    .eq("is_published", true)
    .order(
      "created_at",
      { ascending: false }
    );


  if (error) {

    renderError(error);

    return;
  }


  if (!results || !results.length) {

    contentBody.innerHTML = `
      <div class="empty">

        <div style="font-size:35px;margin-bottom:10px;">
          📝
        </div>

        <strong>No Published Results</strong>

        <p style="margin-top:5px;">
          Results will appear here when they are published by GAAWOW Academy.
        </p>

      </div>
    `;

    return;
  }


  const examIds =
    [...new Set(
      results
        .map(row => row.exam_id)
        .filter(Boolean)
    )];


  const subjectIds =
    [...new Set(
      results
        .map(row => row.subject_id)
        .filter(Boolean)
    )];


  let exams = [];
  let subjects = [];


  if (examIds.length) {

    const {
      data,
      error: examError
    } = await db
      .from("exams")
      .select(`
        id,
        title,
        exam_type,
        exam_date,
        max_score
      `)
      .in("id", examIds);


    if (!examError) {
      exams = data || [];
    } else {
      console.error(
        "Exam lookup error:",
        examError
      );
    }

  }


  if (subjectIds.length) {

    const {
      data,
      error: subjectError
    } = await db
      .from("subjects")
      .select(`
        id,
        name,
        code,
        max_score
      `)
      .in("id", subjectIds);


    if (!subjectError) {
      subjects = data || [];
    } else {
      console.error(
        "Subject lookup error:",
        subjectError
      );
    }

  }


  const examMap =
    new Map(
      exams.map(
        exam => [exam.id, exam]
      )
    );


  const subjectMap =
    new Map(
      subjects.map(
        subject => [subject.id, subject]
      )
    );


  contentBody.innerHTML = `

    <div class="table-wrap">

      <table class="data-table">

        <thead>

          <tr>
            <th>Exam</th>
            <th>Date</th>
            <th>Subject</th>
            <th>Score</th>
            <th>Percentage</th>
            <th>Grade</th>
            <th>Remarks</th>
          </tr>

        </thead>

        <tbody>

          ${results.map(row => {

            const exam =
              examMap.get(
                row.exam_id
              );

            const subject =
              subjectMap.get(
                row.subject_id
              );

            const percentage =
              row.percentage != null
                ? Number(row.percentage).toFixed(1)
                : row.max_score
                  ? (
                      Number(row.score) /
                      Number(row.max_score) *
                      100
                    ).toFixed(1)
                  : "—";


            return `

              <tr>

                <td>
                  ${escapeHtml(
                    exam?.title ||
                    "Exam"
                  )}
                </td>

                <td>
                  ${formatDate(
                    exam?.exam_date
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    subject?.name ||
                    "Subject"
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    String(row.score ?? "—")
                  )}
                  /
                  ${escapeHtml(
                    String(
                      row.max_score ??
                      subject?.max_score ??
                      exam?.max_score ??
                      100
                    )
                  )}
                </td>

                <td>
                  <strong>
                    ${percentage}%
                  </strong>
                </td>

                <td>
                  <span class="badge badge-neutral">
                    ${escapeHtml(
                      row.grade || "—"
                    )}
                  </span>
                </td>

                <td>
                  ${escapeHtml(
                    row.remarks || "—"
                  )}
                </td>

              </tr>

            `;

          }).join("")}

        </tbody>

      </table>

    </div>

  `;

}


/* =========================================================
   COURSES
========================================================= */

async function loadCourses(
  studentId
) {

  const {
    data: enrollments,
    error
  } = await db
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
    .eq("student_id", studentId)
    .order(
      "created_at",
      { ascending: false }
    );


  if (error) {

    renderError(error);

    return;
  }


  if (!enrollments || !enrollments.length) {

    contentBody.innerHTML = `
      <div class="empty">
        No course enrollment records are available.
      </div>
    `;

    return;
  }


  const courseIds =
    [...new Set(
      enrollments
        .map(row => row.course_id)
        .filter(Boolean)
    )];


  const classIds =
    [...new Set(
      enrollments
        .map(row => row.class_id)
        .filter(Boolean)
    )];


  let courses = [];
  let classes = [];


  if (courseIds.length) {

    const {
      data,
      error: courseError
    } = await db
      .from("courses")
      .select(`
        id,
        name,
        code,
        description,
        duration_months,
        is_active
      `)
      .in("id", courseIds);


    if (!courseError) {
      courses = data || [];
    }

  }


  if (classIds.length) {

    const {
      data,
      error: classError
    } = await db
      .from("classes")
      .select(`
        id,
        name,
        code,
        academic_year,
        room,
        start_date,
        end_date,
        is_active
      `)
      .in("id", classIds);


    if (!classError) {
      classes = data || [];
    }

  }


  const courseMap =
    new Map(
      courses.map(
        course => [course.id, course]
      )
    );


  const classMap =
    new Map(
      classes.map(
        item => [item.id, item]
      )
    );


  contentBody.innerHTML = `

    <div class="students-grid">

      ${enrollments.map(enrollment => {

        const course =
          courseMap.get(
            enrollment.course_id
          );

        const classInfo =
          classMap.get(
            enrollment.class_id
          );


        return `

          <div class="student-card">

            <div
              class="service-icon"
              style="font-size:30px;"
            >
              📚
            </div>

            <div class="student-name">
              ${escapeHtml(
                course?.name ||
                "Course"
              )}
            </div>

            <div class="student-id">
              Code:
              ${escapeHtml(
                course?.code || "N/A"
              )}
            </div>

            <span class="relationship">
              ${formatStatus(
                enrollment.status
              )}
            </span>

            <div style="margin-top:13px;font-size:12px;color:#64748B;">

              <div>
                Class:
                ${escapeHtml(
                  classInfo?.name ||
                  "N/A"
                )}
              </div>

              <div>
                Academic Year:
                ${escapeHtml(
                  classInfo?.academic_year ||
                  "N/A"
                )}
              </div>

              <div>
                Start:
                ${formatDate(
                  enrollment.start_date
                )}
              </div>

            </div>

          </div>

        `;

      }).join("")}

    </div>

  `;

}


/* =========================================================
   CERTIFICATES
========================================================= */

async function loadCertificates(
  studentId
) {

  const {
    data: certificates,
    error
  } = await db
    .from("certificates")
    .select(`
      id,
      course_id,
      certificate_no,
      certificate_id,
      verify_code,
      hash_code,
      issue_date,
      expiry_date,
      status,
      certificate_url,
      pdf_url,
      qr_url,
      student_name_snapshot,
      course_name_snapshot,
      created_at
    `)
    .eq("student_id", studentId)
    .order(
      "issue_date",
      { ascending: false }
    );


  if (error) {

    renderError(error);

    return;
  }


  if (!certificates || !certificates.length) {

    contentBody.innerHTML = `
      <div class="empty">

        <div style="font-size:35px;margin-bottom:10px;">
          🏆
        </div>

        <strong>No Certificates Yet</strong>

        <p style="margin-top:5px;">
          Certificates will appear here when issued.
        </p>

      </div>
    `;

    return;
  }


  contentBody.innerHTML = `

    ${certificates.map(cert => {

      const certificateUrl =
        safeUrl(cert.certificate_url);

      const pdfUrl =
        safeUrl(cert.pdf_url);

      const qrUrl =
        safeUrl(cert.qr_url);


      return `

        <div class="certificate-card">

          <h3>
            ${escapeHtml(
              cert.course_name_snapshot ||
              "Certificate"
            )}
          </h3>

          <p>
            Certificate No:
            <strong>
              ${escapeHtml(
                cert.certificate_no ||
                cert.certificate_id ||
                "N/A"
              )}
            </strong>
          </p>

          <p>
            Issue Date:
            ${formatDate(
              cert.issue_date
            )}
          </p>

          <p>
            Status:
            ${formatStatus(
              cert.status
            )}
          </p>


          <div class="certificate-actions">

            ${
              pdfUrl
                ? `
                  <a
                    class="action-button"
                    href="${pdfUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View / Download PDF
                  </a>
                `
                : ""
            }


            ${
              certificateUrl
                ? `
                  <a
                    class="action-button gold"
                    href="${certificateUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Certificate
                  </a>
                `
                : ""
            }


            ${
              qrUrl
                ? `
                  <a
                    class="action-button gold"
                    href="${qrUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    QR
                  </a>
                `
                : ""
            }

          </div>

        </div>

      `;

    }).join("")}

  `;

}


/* =========================================================
   STUDENT PROFILE
========================================================= */

function renderStudentProfile(
  studentId
) {

  const student =
    accessibleStudents.find(
      item =>
        item.id === studentId
    );


  if (!student) {

    contentBody.innerHTML = `
      <div class="empty">
        Student profile could not be found.
      </div>
    `;

    return;
  }


  const photo =
    student.photo_url
      ? `
        <img
          class="profile-photo"
          src="${safeUrl(student.photo_url)}"
          alt="${escapeHtml(student.full_name || "Student")}"
        >
      `
      : `
        <div class="student-placeholder">
          ${getInitials(student.full_name)}
        </div>
      `;


  contentBody.innerHTML = `

    <div class="profile-header">

      ${photo}

      <div>

        <h3>
          ${escapeHtml(
            student.full_name ||
            "Unnamed Student"
          )}
        </h3>

        <p>
          Student ID:
          ${escapeHtml(
            student.student_id ||
            "N/A"
          )}
        </p>

      </div>

    </div>


    <div class="profile-grid">

      ${profileItem(
        "Student ID",
        student.student_id
      )}

      ${profileItem(
        "Gender",
        student.gender
      )}

      ${profileItem(
        "Date of Birth",
        formatDate(student.date_of_birth)
      )}

      ${profileItem(
        "Phone",
        student.phone
      )}

      ${profileItem(
        "Email",
        student.email
      )}

      ${profileItem(
        "Address",
        student.address
      )}

      ${profileItem(
        "Admission Date",
        formatDate(student.admission_date)
      )}

      ${profileItem(
        "Status",
        formatStatusText(student.status)
      )}

      ${profileItem(
        "Emergency Contact",
        student.emergency_contact_name
      )}

      ${profileItem(
        "Emergency Phone",
        student.emergency_contact_phone
      )}

    </div>

  `;

}


/* =========================================================
   PROFILE ITEM
========================================================= */

function profileItem(
  label,
  value
) {

  return `

    <div class="profile-item">

      <span>
        ${escapeHtml(label)}
      </span>

      <strong>
        ${escapeHtml(
          value ?? "—"
        )}
      </strong>

    </div>

  `;

}


/* =========================================================
   SHOW DASHBOARD
========================================================= */

function showDashboard() {

  loginPage.classList.add(
    "hidden"
  );

  dashboardPage.classList.remove(
    "hidden"
  );

}


/* =========================================================
   LOGOUT
========================================================= */

logoutButton.addEventListener(
  "click",
  async function () {

    try {

      await db.auth.signOut();

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }


    currentUser = null;
    currentParent = null;
    accessibleStudents = [];
    selectedStudentId = null;
    currentModule = null;


    resetDashboardSummary();

    contentPanel.classList.add(
      "hidden"
    );

    contentBody.innerHTML = "";

    studentsContainer.innerHTML = "";

    studentSelector.innerHTML = "";


    dashboardPage.classList.add(
      "hidden"
    );

    loginPage.classList.remove(
      "hidden"
    );


    loginForm.reset();

    clearMessage();

  }
);


/* =========================================================
   SESSION CHECK
========================================================= */

async function checkSession() {

  try {

    const {
      data,
      error
    } = await db.auth.getSession();


    if (error) {
      throw error;
    }


    const session =
      data?.session;


    if (!session?.user) {

      showLogin();

      return;
    }


    currentUser =
      session.user;


    currentParent =
      await loadParentData(
        currentUser.id
      );


    if (!currentParent) {

      await db.auth.signOut();

      showLogin();

      return;
    }


    accessibleStudents =
      await loadParentStudents(
        currentParent.id
      );


    if (!accessibleStudents.length) {

      await db.auth.signOut();

      showLogin();

      showMessage(
        "No students are linked to this parent account.",
        "error"
      );

      return;
    }


    renderParentHeader();

    renderStudents();

    populateStudentSelector();

    showDashboard();


    if (accessibleStudents.length) {

      selectedStudentId =
        accessibleStudents[0].id;

      await loadDashboardSummary(
        selectedStudentId
      );

      openFirstStudentModule();

    }


  } catch (error) {

    console.error(
      "Session check error:",
      error
    );

    showLogin();

  }

}


/* =========================================================
   SHOW LOGIN
========================================================= */

function showLogin() {

  dashboardPage.classList.add(
    "hidden"
  );

  loginPage.classList.remove(
    "hidden"
  );

}


/* =========================================================
   RESET SUMMARY
========================================================= */

function resetDashboardSummary() {

  if (summaryProgress)
    summaryProgress.textContent = "—";

  if (summaryCourses)
    summaryCourses.textContent = "Loading...";

  if (summaryAttendance)
    summaryAttendance.textContent = "—";

  if (summaryScore)
    summaryScore.textContent = "—";

  if (summaryCompleted)
    summaryCompleted.textContent = "—";

  if (summaryCourseText)
    summaryCourseText.textContent =
      "Completed courses";

}


/* =========================================================
   LOGIN LOADING
========================================================= */

function setLoginLoading(
  loading
) {

  if (!loginButton) {
    return;
  }


  loginButton.disabled =
    loading;


  loginButton.textContent =
    loading
      ? "Logging in..."
      : "Login";

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
  text,
  type = "error"
) {

  if (!message) {
    return;
  }


  message.textContent =
    text;

  message.className =
    `message ${type}`;

}


function clearMessage() {

  if (!message) {
    return;
  }


  message.textContent =
    "";

  message.className =
    "message";

}


/* =========================================================
   ERROR
========================================================= */

function renderError(
  error
) {

  console.error(
    error
  );


  contentBody.innerHTML = `

    <div class="error-box">

      <strong>
        Unable to load this information.
      </strong>

      <p style="margin-top:5px;">
        Please try again later.
      </p>

    </div>

  `;

}


/* =========================================================
   FRIENDLY ERROR
========================================================= */

function getFriendlyError(
  error
) {

  const message =
    String(
      error?.message ||
      error ||
      ""
    );


  if (
    message.toLowerCase()
      .includes("invalid login credentials")
  ) {

    return "Email ama password-ka waa khalad.";

  }


  if (
    message.toLowerCase()
      .includes("email not confirmed")
  ) {

    return "Email-ka account-ka weli lama xaqiijin.";

  }


  if (
    message.toLowerCase()
      .includes("fetch")
  ) {

    return "Internet connection ama Supabase connection-ka ayaa dhibaato qaba.";

  }


  return message ||
    "Waxaa dhacay qalad. Fadlan isku day mar kale.";

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
  value
) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(value);


  if (Number.isNaN(
    date.getTime()
  )) {

    return escapeHtml(
      String(value)
    );

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


/* =========================================================
   FORMAT STATUS
========================================================= */

function formatStatus(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return `
      <span class="badge badge-neutral">
        —
      </span>
    `;

  }


  const text =
    String(value);


  const lower =
    text.toLowerCase();


  let badgeClass =
    "badge-neutral";


  if (
    lower.includes("present") ||
    lower.includes("active") ||
    lower.includes("completed") ||
    lower.includes("pass") ||
    lower.includes("valid")
  ) {

    badgeClass =
      "badge-success";

  } else if (
    lower.includes("absent") ||
    lower.includes("inactive") ||
    lower.includes("fail") ||
    lower.includes("invalid") ||
    lower.includes("cancel")
  ) {

    badgeClass =
      "badge-danger";

  } else if (
    lower.includes("late") ||
    lower.includes("pending")
  ) {

    badgeClass =
      "badge-warning";

  }


  return `

    <span class="badge ${badgeClass}">
      ${escapeHtml(
        formatStatusText(text)
      )}
    </span>

  `;

}


/* =========================================================
   STATUS TEXT
========================================================= */

function formatStatusText(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return "—";

  }


  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, char =>
      char.toUpperCase()
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
  value
) {

  if (
    value === null ||
    value === undefined
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


/* =========================================================
   SAFE URL
========================================================= */

function safeUrl(
  value
) {

  if (!value) {
    return "";
  }


  try {

    const url =
      new URL(
        String(value),
        window.location.href
      );


    if (
      url.protocol === "http:" ||
      url.protocol === "https:"
    ) {

      return url.href;

    }

  } catch (error) {

    console.warn(
      "Invalid URL:",
      value
    );

  }


  return "";

}


/* =========================================================
   INITIALS
========================================================= */

function getInitials(
  name
) {

  if (!name) {
    return "S";
  }


  const parts =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  if (parts.length === 1) {

    return parts[0]
      .substring(0, 2)
      .toUpperCase();

  }


  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();

}


/* =========================================================
   START
========================================================= */

checkSession();
