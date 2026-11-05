
/* =========================================================
   GAAWOW EMS — SUPER ADMIN DASHBOARD
   Version: 2026.11.05
   Secure Role-Based Access
   Academic Results & Subjects Display Fix
   ========================================================= */


/* =========================================================
   1. SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


if (!window.supabase) {

  console.error("Supabase library was not loaded.");

  alert(
    "System connection error. Please refresh the page."
  );

  throw new Error("Supabase library unavailable.");
}


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   2. GLOBAL STATE
   ========================================================= */

let dashboardStarted = false;
let dashboardAuthorized = false;
let authRedirecting = false;


/* =========================================================
   3. NAVIGATION
   ========================================================= */

window.openPage = function(page) {

  if (!page) {
    console.error("Page destination is missing.");
    return;
  }

  window.location.href = page;

};


/* =========================================================
   4. HELPER FUNCTIONS
   ========================================================= */

function getElement(id) {

  return document.getElementById(id);

}


function setText(id, value) {

  const element = getElement(id);

  if (element) {
    element.textContent = value;
  }

}


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function showAcademicMessage(message, type = "loading") {

  const rowsEl =
    getElement("academicSubjectRows");

  if (!rowsEl) return;

  rowsEl.innerHTML = `
    <tr>
      <td colspan="5"
          class="academic-${type}">
        ${escapeHtml(message)}
      </td>
    </tr>
  `;

}


function formatNumber(value) {

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString();

}


function redirectToLogin() {

  if (authRedirecting) return;

  authRedirecting = true;

  window.location.replace("index.html");

}


/* =========================================================
   5. AUTHENTICATION AND ROLE CHECK
   ========================================================= */

async function checkDashboardAccess() {

  try {

    const {
      data: sessionData,
      error: sessionError
    } = await supabaseClient.auth.getSession();


    if (sessionError) {

      console.error(
        "Session error:",
        sessionError
      );

      redirectToLogin();

      return false;
    }


    const session =
      sessionData?.session;


    if (!session) {

      console.warn(
        "No active authentication session."
      );

      redirectToLogin();

      return false;
    }


    const user =
      session.user;


    console.log(
      "CURRENT AUTH USER ID:",
      user.id
    );

    console.log(
      "CURRENT AUTH EMAIL:",
      user.email
    );


    /* -----------------------------------------
       LOAD USER PROFILE
    ----------------------------------------- */

    const {
      data: profile,
      error: profileError
    } = await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        is_active
      `)
      .eq("id", user.id)
      .maybeSingle();


    if (profileError) {

      console.error(
        "Profile loading error:",
        profileError
      );

      alert(
        "Unable to verify your account. Please try again."
      );

      redirectToLogin();

      return false;
    }


    if (!profile) {

      console.error(
        "No profile found for authenticated user."
      );

      redirectToLogin();

      return false;
    }


    /* -----------------------------------------
       ACTIVE ACCOUNT CHECK
    ----------------------------------------- */

    if (profile.is_active !== true) {

      alert(
        "Your account is inactive. Contact the system administrator."
      );

      await supabaseClient.auth.signOut();

      redirectToLogin();

      return false;
    }


    /* -----------------------------------------
       ROLE CHECK
    ----------------------------------------- */

    if (profile.role === "student") {

      window.location.replace(
        "student.html"
      );

      return false;
    }


    if (profile.role !== "super_admin") {

      alert(
        "Access denied. Super Admin privileges are required."
      );

      redirectToLogin();

      return false;
    }


    /* -----------------------------------------
       SUPER ADMIN APPROVED
    ----------------------------------------- */

    const welcome =
      getElement("superAdminWelcome");


    if (welcome) {

      welcome.textContent =
        profile.full_name
          ? `Welcome, ${profile.full_name}`
          : "Welcome, GAAWOW Academy";

    }


    console.log(
      "SUPER ADMIN ACCESS APPROVED."
    );


    dashboardAuthorized = true;

    return true;


  } catch (error) {

    console.error(
      "Dashboard authentication error:",
      error
    );

    redirectToLogin();

    return false;

  }

}


/* =========================================================
   6. LOAD SYSTEM STATISTICS
   ========================================================= */

async function loadSystemCounts() {

  const queries = [

    {
      name: "institutions",
      table: "institutions",
      element: "institutionCount"
    },

    {
      name: "students",
      table: "students",
      element: "studentCount"
    },

    {
      name: "teachers",
      table: "profiles",
      element: "teacherCount",
      filter: {
        column: "role",
        value: "teacher"
      }
    },

    {
      name: "certificates",
      table: "certificates",
      element: "certificateCount"
    }

  ];


  await Promise.all(

    queries.map(async item => {

      try {

        let query =
          supabaseClient
            .from(item.table)
            .select("id", {
              count: "exact",
              head: true
            });


        if (item.filter) {

          query = query.eq(
            item.filter.column,
            item.filter.value
          );

        }


        const {
          count,
          error
        } = await query;


        if (error) {

          console.error(
            `${item.name} count error:`,
            error
          );

          setText(
            item.element,
            "!"
          );

          return;
        }


        setText(
          item.element,
          formatNumber(count ?? 0)
        );


      } catch (error) {

        console.error(
          `${item.name} unexpected error:`,
          error
        );

        setText(
          item.element,
          "!"
        );

      }

    })

  );

}


/* =========================================================
   7. ACADEMIC RESULTS
   ========================================================= */

async function loadAcademicResults() {

  const statusEl =
    getElement("academicResultsStatus");


  if (statusEl) {
    statusEl.textContent = "Loading...";
  }


  showAcademicMessage(
    "Loading academic results...",
    "loading"
  );


  try {

    /* -----------------------------------------
       1. LOAD ALL GRADES
    ----------------------------------------- */

    const {
      data: grades,
      error: gradesError
    } = await supabaseClient
      .from("grades")
      .select("*")
      .limit(1000);


    if (gradesError) {

      console.error(
        "Grades loading error:",
        gradesError
      );

      throw gradesError;
    }


    const results =
      Array.isArray(grades)
        ? grades
        : [];


    /* -----------------------------------------
       2. LOAD EXAMS
    ----------------------------------------- */

    const {
      data: exams,
      error: examsError
    } = await supabaseClient
      .from("exams")
      .select("*")
      .limit(1000);


    if (examsError) {

      console.warn(
        "Exam information unavailable:",
        examsError.message
      );

    }


    const examList =
      Array.isArray(exams)
        ? exams
        : [];


    const examMap = new Map();


    examList.forEach(exam => {

      if (exam.id) {

        examMap.set(
          String(exam.id),
          exam
        );

      }

    });


    /* -----------------------------------------
       3. LOAD ALL ACTIVE SUBJECTS
       IMPORTANT:
       Subjects are loaded independently
       from grades.

       This ensures Nutrition and other
       subjects appear even without results.
    ----------------------------------------- */

    const {
      data: subjects,
      error: subjectsError
    } = await supabaseClient
      .from("subjects")
      .select("*")
      .eq("is_active", true)
      .order("name");


    if (subjectsError) {

      console.error(
        "Subjects loading error:",
        subjectsError
      );

      throw subjectsError;
    }


    const subjectList =
      Array.isArray(subjects)
        ? subjects
        : [];


    const subjectMap = new Map();


    subjectList.forEach(subject => {

      if (subject.id) {

        subjectMap.set(
          String(subject.id),
          subject
        );

      }

    });


    /* -----------------------------------------
       4. INITIALIZE SUBJECT GROUPS
       Every active subject starts with zero
       results and zero published results.
    ----------------------------------------- */

    const groups = new Map();


    subjectList.forEach(subject => {

      if (!subject.id) return;

      const groupKey =
        String(subject.id);


      groups.set(
        groupKey,
        {

          name:
            subject.name ||
            subject.subject_name ||
            "Unnamed Subject",

          total: 0,

          published: 0,

          percentages: []

        }
      );

    });


    /* -----------------------------------------
       5. SUMMARY VARIABLES
    ----------------------------------------- */

    const uniqueStudents = new Set();

    const uniqueSubjects = new Set();


    let passed = 0;
    let failed = 0;

    let percentageTotal = 0;
    let percentageCount = 0;

    let published = 0;
    let pending = 0;

    let publicationAvailable = false;


    /* -----------------------------------------
       6. PROCESS RESULTS
    ----------------------------------------- */

    results.forEach(row => {

      /* STUDENTS */

      if (row.student_id) {

        uniqueStudents.add(
          String(row.student_id)
        );

      }


      /* EXAM */

      const exam =
        examMap.get(
          String(row.exam_id)
        );


      /* SUBJECT */

      const subjectId =
        exam?.subject_id ??
        row.subject_id ??
        null;


      const subject =
        subjectId
          ? subjectMap.get(
              String(subjectId)
            )
          : null;


      const subjectName =
        subject?.name ??
        subject?.subject_name ??
        subject?.title ??
        subject?.subject_name_en ??
        (
          subjectId
            ? `Subject ${subjectId}`
            : exam?.title
              ? exam.title
              : "Unassigned Subject"
        );


      const groupKey =
        subjectId
          ? String(subjectId)
          : String(
              exam?.title ??
              row.exam_id ??
              "unassigned"
            );


      uniqueSubjects.add(groupKey);


      /* CREATE GROUP IF NOT ALREADY AVAILABLE */

      if (!groups.has(groupKey)) {

        groups.set(
          groupKey,
          {

            name: subjectName,

            total: 0,

            published: 0,

            percentages: []

          }
        );

      }


      const group =
        groups.get(groupKey);


      group.total++;


      /* -------------------------------------
         PUBLICATION STATUS
      ------------------------------------- */

      const publicationField =
        [
          "is_published",
          "published",
          "publication_status"
        ].find(key => {

          return Object.prototype.hasOwnProperty.call(
            row,
            key
          );

        });


      if (publicationField) {

        publicationAvailable = true;


        const publicationValue =
          row[publicationField];


        const isPublished =
          publicationValue === true ||
          String(publicationValue).toLowerCase() === "published";


        if (isPublished) {

          published++;

          group.published++;

        } else {

          pending++;

        }

      }


      /* -------------------------------------
         SCORE AND AVERAGE
      ------------------------------------- */

      const score =
        Number(row.score);


      const maxScore =
        Number(exam?.max_score);


      if (
        Number.isFinite(score) &&
        Number.isFinite(maxScore) &&
        maxScore > 0
      ) {

        const percentage =
          (score / maxScore) * 100;


        if (
          percentage >= 0 &&
          percentage <= 100
        ) {

          percentageTotal += percentage;

          percentageCount++;

          group.percentages.push(
            percentage
          );

        }

      }


      /* -------------------------------------
         PASS / FAIL
      ------------------------------------- */

      const grade =
        String(row.grade ?? "")
          .trim()
          .toUpperCase();


      if (
        [
          "A", "A+", "A-",
          "B", "B+", "B-",
          "C", "C+", "C-",
          "D", "D+", "D-"
        ].includes(grade)
      ) {

        passed++;

      } else if (
        grade === "F"
      ) {

        failed++;

      }

    });


    /* -----------------------------------------
       7. SUBJECT COUNT
       Count all active subjects, including
       subjects that have no grades.
    ----------------------------------------- */

    const subjectCount =
      subjectList.length;


    /* -----------------------------------------
       8. UPDATE SUMMARY CARDS
    ----------------------------------------- */

    setText(
      "academicTotalResults",
      formatNumber(results.length)
    );


    setText(
      "academicPublishedResults",
      publicationAvailable
        ? formatNumber(published)
        : "N/A"
    );


    setText(
      "academicPendingResults",
      publicationAvailable
        ? formatNumber(pending)
        : "N/A"
    );


    setText(
      "academicPassedResults",
      formatNumber(passed)
    );


    setText(
      "academicFailedResults",
      formatNumber(failed)
    );


    const average =
      percentageCount
        ? (
            percentageTotal /
            percentageCount
          ).toFixed(1)
        : "N/A";


    setText(
      "academicAverage",
      average === "N/A"
        ? average
        : `${average}%`
    );


    setText(
      "academicStudentsWithResults",
      formatNumber(uniqueStudents.size)
    );


    setText(
      "academicSubjectCount",
      formatNumber(subjectCount)
    );


    /* -----------------------------------------
       9. BUILD RESULTS BY SUBJECT TABLE
    ----------------------------------------- */

    const rowsEl =
      getElement("academicSubjectRows");


    if (rowsEl) {

      rowsEl.innerHTML = "";


      const entries =
        Array.from(groups.entries())
          .sort((a, b) =>
            a[1].name.localeCompare(
              b[1].name
            )
          );


      if (!entries.length) {

        showAcademicMessage(
          "No active subjects found.",
          "loading"
        );

      } else {

        entries.forEach(
          ([key, item], index) => {

            const averagePercentage =
              item.percentages.length
                ? (
                    item.percentages.reduce(
                      (a, b) => a + b,
                      0
                    ) /
                    item.percentages.length
                  ).toFixed(1)
                : "N/A";


            const publishedValue =
              publicationAvailable
                ? item.published
                : "N/A";


            const tr =
              document.createElement("tr");


            const values = [

              index + 1,

              item.name,

              item.total,

              publishedValue,

              averagePercentage === "N/A"
                ? "N/A"
                : `${averagePercentage}%`

            ];


            values.forEach(value => {

              const td =
                document.createElement("td");


              td.textContent =
                String(value);


              tr.appendChild(td);

            });


            rowsEl.appendChild(tr);

          }

        );

      }

    }


    /* -----------------------------------------
       10. UPDATE STATUS
    ----------------------------------------- */

    if (statusEl) {

      statusEl.textContent =
        `${results.length} result(s) · ${subjectCount} subject(s)`;

    }


    /* -----------------------------------------
       11. DEBUG INFORMATION
    ----------------------------------------- */

    const nutritionFound =
      subjectList.some(subject => {

        return String(subject.name || "")
          .trim()
          .toLowerCase() === "nutrition";

      });


    console.log(
      "ACADEMIC DASHBOARD SUCCESS:",
      {

        totalResults:
          results.length,

        activeSubjects:
          subjectList.length,

        displayedSubjects:
          groups.size,

        nutritionFound:
          nutritionFound,

        studentsWithResults:
          uniqueStudents.size,

        publishedResults:
          published,

        pendingResults:
          pending

      }
    );


  } catch (error) {

    console.error(
      "Academic results error:",
      error
    );


    if (statusEl) {

      statusEl.textContent =
        "Unavailable";

    }


    showAcademicMessage(
      "Academic results could not be loaded. Check database access and table structure.",
      "error"
    );

  }

}


/* =========================================================
   8. LOGOUT
   ========================================================= */

function setupLogout() {

  const logoutBtn =
    getElement("logoutBtn");


  if (!logoutBtn) {

    console.warn(
      "Logout button not found."
    );

    return;
  }


  logoutBtn.addEventListener(
    "click",
    async () => {

      logoutBtn.disabled = true;

      logoutBtn.textContent =
        "Logging out...";


      try {

        const {
          error
        } = await supabaseClient.auth.signOut();


        if (error) {

          console.error(
            "Logout error:",
            error
          );

        }


      } catch (error) {

        console.error(
          "Logout exception:",
          error
        );

      }


      sessionStorage.clear();


      redirectToLogin();

    }

  );

}


/* =========================================================
   9. AUTH STATE LISTENER
   ========================================================= */

supabaseClient.auth.onAuthStateChange(

  (event, session) => {

    console.log(
      "Authentication event:",
      event
    );


    if (
      event === "SIGNED_OUT"
    ) {

      redirectToLogin();

    }

  }

);


/* =========================================================
   10. START DASHBOARD
   ========================================================= */

async function startDashboard() {

  if (dashboardStarted) return;

  dashboardStarted = true;


  console.log(
    "Starting GAAWOW EMS Super Admin Dashboard..."
  );


  /* -----------------------------------------
     CHECK ACCESS FIRST
  ----------------------------------------- */

  const allowed =
    await checkDashboardAccess();


  if (!allowed) {

    console.warn(
      "Dashboard access denied."
    );

    return;

  }


  /* -----------------------------------------
     INITIALIZE LOGOUT
  ----------------------------------------- */

  setupLogout();


  /* -----------------------------------------
     LOAD DASHBOARD DATA
  ----------------------------------------- */

  await Promise.allSettled([

    loadSystemCounts(),

    loadAcademicResults()

  ]);


  console.log(
    "GAAWOW EMS Dashboard initialized."
  );

}


/* =========================================================
   11. DOM READY
   ========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startDashboard,
    { once: true }
  );

} else {

  startDashboard();

}


/* =========================================================
   END OF DASHBOARD.JS
   ========================================================= */
