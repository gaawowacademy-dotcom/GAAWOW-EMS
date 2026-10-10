/* =========================================================
   GAAWOW EMS — SUPER ADMIN DASHBOARD
   Secure Role-Based Access
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   NAVIGATION
   ========================================================= */

function openPage(page) {
  window.location.href = page;
}


/* =========================================================
   AUTH + ROLE CHECK
   ========================================================= */

async function checkDashboardAccess() {

  try {

    const {
      data: sessionData,
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (
      sessionError ||
      !sessionData ||
      !sessionData.session
    ) {

      window.location.replace("index.html");
      return false;
    }


    const user =
      sessionData.session.user;
console.log("CURRENT AUTH USER ID:", user.id);
console.log("CURRENT AUTH EMAIL:", user.email);

    /* -----------------------------------------
       LOAD PROFILE
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
        "Profile error:",
        profileError
      );

      await supabaseClient.auth.signOut();

      window.location.replace("index.html");

      return false;
    }


    if (!profile) {

      console.error(
        "No profile found for:",
        user.id
      );

      await supabaseClient.auth.signOut();

      window.location.replace("index.html");

      return false;
    }


    /* -----------------------------------------
       ACCOUNT ACTIVE CHECK
    ----------------------------------------- */

    if (profile.is_active !== true) {

      alert(
        "Your account is inactive."
      );

      await supabaseClient.auth.signOut();

      window.location.replace("index.html");

      return false;
    }


    /* =====================================================
       IMPORTANT:
       STUDENT MUST NEVER STAY ON SUPER ADMIN DASHBOARD
       ===================================================== */

    if (profile.role === "student") {

      console.log(
        "Student detected. Redirecting..."
      );

      window.location.replace(
        "student.html"
      );

      return false;
    }


    /* -----------------------------------------
       OTHER ROLES
    ----------------------------------------- */

    if (
      profile.role !== "super_admin"
    ) {

      alert(
        "Access denied. Super Admin only."
      );

      window.location.replace(
        "index.html"
      );

      return false;
    }


    /* -----------------------------------------
       SUPER ADMIN APPROVED
    ----------------------------------------- */

    const welcome =
      document.getElementById(
        "superAdminWelcome"
      );

    if (welcome) {

      welcome.textContent =
        profile.full_name
          ? `Welcome, ${profile.full_name}`
          : "Welcome, GAAWOW Academy";
    }


    return true;

  } catch (error) {

    console.error(
      "Dashboard authentication error:",
      error
    );

    window.location.replace(
      "index.html"
    );

    return false;
  }
}


/* =========================================================
   LOAD SYSTEM COUNTS
   ========================================================= */

async function loadSystemCounts() {

  try {

    const [
      institutions,
      students,
      teachers,
      certificates
    ] = await Promise.all([

      supabaseClient
        .from("institutions")
        .select("id", {
          count: "exact",
          head: true
        }),

      supabaseClient
        .from("students")
        .select("id", {
          count: "exact",
          head: true
        }),

      supabaseClient
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq("role", "teacher"),

      supabaseClient
        .from("certificates")
        .select("id", {
          count: "exact",
          head: true
        })
    ]);


    if (institutions.error)
      console.error(
        "Institutions:",
        institutions.error
      );

    if (students.error)
      console.error(
        "Students:",
        students.error
      );

    if (teachers.error)
      console.error(
        "Teachers:",
        teachers.error
      );

    if (certificates.error)
      console.error(
        "Certificates:",
        certificates.error
      );


    const institutionEl =
      document.getElementById(
        "institutionCount"
      );

    const studentEl =
      document.getElementById(
        "studentCount"
      );

    const teacherEl =
      document.getElementById(
        "teacherCount"
      );

    const certificateEl =
      document.getElementById(
        "certificateCount"
      );


    if (institutionEl) {

      institutionEl.textContent =
        institutions.count ?? 0;
    }

    if (studentEl) {

      studentEl.textContent =
        students.count ?? 0;
    }

    if (teacherEl) {

      teacherEl.textContent =
        teachers.count ?? 0;
    }

    if (certificateEl) {

      certificateEl.textContent =
        certificates.count ?? 0;
    }

  } catch (error) {

    console.error(
      "System count error:",
      error
    );
  }
}


/* =========================================================
   ACADEMIC RESULTS
   ========================================================= */

async function loadAcademicResults() {

  const statusEl =
    document.getElementById(
      "academicResultsStatus"
    );

  const rowsEl =
    document.getElementById(
      "academicSubjectRows"
    );


  try {

    /*
     * NOTE:
     * This section intentionally handles
     * missing/unknown academic tables safely.
     *
     * Your existing academic-results logic
     * can remain here if already implemented.
     */

    if (statusEl) {

      statusEl.textContent =
        "Live";
    }

    /*
     * Do not break the whole dashboard if
     * the academic table/RLS is unavailable.
     */

    const {
      data,
      error
    } = await supabaseClient
      .from("grades")
      .select("*")
      .limit(1000);


    if (error) {

      console.warn(
        "Academic results unavailable:",
        error.message
      );

      if (statusEl) {

        statusEl.textContent =
          "Unavailable";
      }

      if (rowsEl) {

        rowsEl.innerHTML = `
          <tr>
            <td
              colspan="5"
              class="academic-error"
            >
              Academic results could not be loaded.
            </td>
          </tr>
        `;
      }

      return;
    }


    const results =
      Array.isArray(data)
        ? data
        : [];


    /* -----------------------------------------
       TOTAL
    ----------------------------------------- */

    const total =
      results.length;


    const totalEl =
      document.getElementById(
        "academicTotalResults"
      );

    if (totalEl)
      totalEl.textContent = total;


    /* -----------------------------------------
       SUBJECT COUNT
    ----------------------------------------- */

    const subjects =
      new Set();


    results.forEach(row => {

      const subject =
        row.subject_id ??
        row.subject ??
        row.subject_name;

      if (subject) {

        subjects.add(
          String(subject)
        );
      }
    });


    const subjectCountEl =
      document.getElementById(
        "academicSubjectCount"
      );

    if (subjectCountEl) {

      subjectCountEl.textContent =
        subjects.size;
    }


    /* -----------------------------------------
       EMPTY STATE
    ----------------------------------------- */

    if (!results.length) {

      if (rowsEl) {

        rowsEl.innerHTML = `
          <tr>
            <td
              colspan="5"
              class="academic-loading"
            >
              No academic results found.
            </td>
          </tr>
        `;
      }

      return;
    }


    /*
     * Generic subject grouping.
     */

    const grouped = {};


    results.forEach(row => {

      const subject =
        row.subject_name ??
        row.subject ??
        row.subject_id ??
        "Unknown Subject";


      const key =
        String(subject);


      if (!grouped[key]) {

        grouped[key] = {
          total: 0,
          published: 0,
          scores: []
        };
      }


      grouped[key].total++;


      if (
        row.published === true ||
        row.status === "published"
      ) {

        grouped[key].published++;
      }


      const score =
        Number(
          row.score ??
          row.marks ??
          row.grade ??
          row.percentage
        );


      if (
        Number.isFinite(score)
      ) {

        grouped[key].scores.push(
          score
        );
      }

    });


    /* -----------------------------------------
       TABLE
    ----------------------------------------- */

    if (rowsEl) {

      rowsEl.innerHTML = "";

      const entries =
        Object.entries(grouped);


      entries.forEach(
        ([subject, item], index) => {

          const average =
            item.scores.length
              ? (
                  item.scores.reduce(
                    (a, b) => a + b,
                    0
                  ) /
                  item.scores.length
                ).toFixed(1)
              : "0";


          const tr =
            document.createElement("tr");


          tr.innerHTML = `
            <td>${index + 1}</td>

            <td>
              ${escapeHtml(subject)}
            </td>

            <td>
              ${item.total}
            </td>

            <td>
              ${item.published}
            </td>

            <td>
              ${average}%
            </td>
          `;


          rowsEl.appendChild(tr);

        }
      );
    }


    if (statusEl) {

      statusEl.textContent =
        `${results.length} result(s)`;
    }


  } catch (error) {

    console.error(
      "Academic results error:",
      error
    );

    if (statusEl) {

      statusEl.textContent =
        "Error";
    }
  }
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {

  const logoutBtn =
    document.getElementById(
      "logoutBtn"
    );


  if (!logoutBtn)
    return;


  logoutBtn.addEventListener(
    "click",
    async () => {

      logoutBtn.disabled = true;

      logoutBtn.textContent =
        "Logging out...";


      try {

        await supabaseClient.auth.signOut();

      } catch (error) {

        console.error(
          "Logout error:",
          error
        );

      }


      sessionStorage.clear();


      window.location.replace(
        "index.html"
      );
    }
  );
}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  (event, session) => {

    if (
      event === "SIGNED_OUT" ||
      !session
    ) {

      window.location.replace(
        "index.html"
      );
    }
  }
);


/* =========================================================
   START DASHBOARD
   ========================================================= */

async function startDashboard() {

  /*
   * IMPORTANT:
   * Check role BEFORE loading dashboard data.
   */

  const allowed =
    await checkDashboardAccess();


  if (!allowed) {

    return;
  }


  await Promise.all([
    loadSystemCounts(),
    loadAcademicResults()
  ]);


  setupLogout();
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  startDashboard
);
