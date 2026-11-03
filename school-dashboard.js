/* =========================================================
   GAAWOW EMS — SCHOOL ADMIN DASHBOARD
   Secure Institution-Based Access
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

let currentInstitutionId = null;


/* =========================================================
   NAVIGATION
   ========================================================= */

function openPage(page) {
  window.location.href = page;
}


/* =========================================================
   AUTHENTICATION AND ROLE VERIFICATION
   ========================================================= */

async function checkDashboardAccess() {

  try {

    const {
      data: sessionData,
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (
      sessionError ||
      !sessionData?.session
    ) {

      window.location.replace("index.html");
      return false;
    }

    const user = sessionData.session.user;

    /* LOAD USER PROFILE */

    const {
      data: profile,
      error: profileError
    } = await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        is_active,
        institution_id
      `)
      .eq("id", user.id)
      .maybeSingle();


    if (profileError || !profile) {

      console.error(
        "Profile verification failed:",
        profileError
      );

      await supabaseClient.auth.signOut();

      window.location.replace("index.html");

      return false;
    }


    /* ACCOUNT ACTIVE CHECK */

    if (profile.is_active !== true) {

      alert("Your account is inactive.");

      await supabaseClient.auth.signOut();

      window.location.replace("index.html");

      return false;
    }


    /* SUPER ADMIN REDIRECTION */

    if (profile.role === "super_admin") {

      window.location.replace("dashboard.html");

      return false;
    }


    /* SCHOOL ADMIN ROLE CHECK */

    if (
      profile.role !== "school_admin"
    ) {

      alert(
        "Access denied. School Admin only."
      );

      window.location.replace("index.html");

      return false;
    }


    /* INSTITUTION CHECK */

    if (!profile.institution_id) {

      alert(
        "Your account has no institution assigned. Contact Super Admin."
      );

      await supabaseClient.auth.signOut();

      window.location.replace("index.html");

      return false;
    }


    currentInstitutionId =
      profile.institution_id;


    /* WELCOME MESSAGE */

    const welcome =
      document.getElementById(
        "schoolAdminWelcome"
      );

    if (welcome) {

      welcome.textContent =
        profile.full_name
          ? `Welcome, ${profile.full_name}`
          : "Welcome, School Admin";
    }


    await loadInstitutionName();

    const status =
      document.getElementById("systemStatus");

    if (status) {
      status.textContent = "Secure session active";
    }

    return true;

  } catch (error) {

    console.error(
      "Dashboard authentication error:",
      error
    );

    window.location.replace("index.html");

    return false;
  }
}


/* =========================================================
   INSTITUTION INFORMATION
   ========================================================= */

async function loadInstitutionName() {

  const element =
    document.getElementById("institutionName");

  if (!element) return;

  const {
    data,
    error
  } = await supabaseClient
    .from("institutions")
    .select("*")
    .eq("id", currentInstitutionId)
    .maybeSingle();


  if (error) {

    console.error(
      "Institution information:",
      error
    );

    element.textContent =
      "Institution dashboard";

    return;
  }


  if (data) {

    const name =
      data.name ||
      data.institution_name ||
      "Your Institution";

    element.textContent =
      name + " — Institution Dashboard";
  }
}


/* =========================================================
   HELPER: UPDATE HTML ELEMENT
   ========================================================= */

function setDashboardValue(id, value) {

  const element =
    document.getElementById(id);

  if (element) {

    element.textContent =
      value === null || value === undefined
        ? "N/A"
        : value;
  }
}


/* =========================================================
   LOAD INSTITUTION COUNTS
   ========================================================= */

async function countInstitutionRecords(table) {

  const {
    count,
    error
  } = await supabaseClient
    .from(table)
    .select("id", {
      count: "exact",
      head: true
    })
    .eq(
      "institution_id",
      currentInstitutionId
    );


  if (error) {

    console.error(
      `${table} count error:`,
      error
    );

    return null;
  }

  return count ?? 0;
}


/* =========================================================
   COUNT TEACHERS AND PARENTS
   ========================================================= */

async function countProfilesByRole(role) {

  const {
    count,
    error
  } = await supabaseClient
    .from("profiles")
    .select("id", {
      count: "exact",
      head: true
    })
    .eq(
      "institution_id",
      currentInstitutionId
    )
    .eq("role", role);


  if (error) {

    console.error(
      `${role} count error:`,
      error
    );

    return null;
  }

  return count ?? 0;
}


/* =========================================================
   LOAD DASHBOARD STATISTICS
   ========================================================= */

async function loadInstitutionCounts() {

  const [
    students,
    teachers,
    parents,
    certificates
  ] = await Promise.all([

    countInstitutionRecords("students"),

    countProfilesByRole("teacher"),

    countProfilesByRole("parent"),

    countInstitutionRecords("certificates")

  ]);


  setDashboardValue(
    "studentCount",
    students
  );

  setDashboardValue(
    "teacherCount",
    teachers
  );

  setDashboardValue(
    "parentCount",
    parents
  );

  setDashboardValue(
    "certificateCount",
    certificates
  );
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

    const {
      data,
      error
    } = await supabaseClient
      .from("grades")
      .select("*")
      .eq(
        "institution_id",
        currentInstitutionId
      )
      .limit(1000);


    if (error) {

      throw error;
    }


    const results =
      Array.isArray(data) ? data : [];


    /* TOTAL RESULTS */

    const total =
      results.length;


    /* PUBLISHED RESULTS */

    const published =
      results.filter(row =>

        row.is_published === true ||
        row.published === true ||
        row.status === "published"

      ).length;


    setDashboardValue(
      "academicTotalResults",
      total
    );

    setDashboardValue(
      "academicPublishedResults",
      published
    );

    setDashboardValue(
      "academicPendingResults",
      total - published
    );


    /* GROUP BY SUBJECT */

    const grouped = {};


    results.forEach(row => {

      const subject =
        row.subject_name ||
        row.subject ||
        row.subject_id ||
        "Unknown Subject";


      const key = String(subject);


      if (!grouped[key]) {

        grouped[key] = {
          total: 0,
          published: 0,
          scores: []
        };
      }


      grouped[key].total++;


      if (
        row.is_published === true ||
        row.published === true ||
        row.status === "published"
      ) {

        grouped[key].published++;
      }


      const rawScore =
        row.score ??
        row.marks ??
        row.percentage;


      if (
        rawScore !== null &&
        rawScore !== undefined &&
        rawScore !== ""
      ) {

        const score = Number(rawScore);

        if (Number.isFinite(score)) {

          grouped[key].scores.push(score);
        }
      }

    });


    const subjects =
      Object.entries(grouped);


    setDashboardValue(
      "academicSubjectCount",
      subjects.length
    );


    /* EMPTY RESULTS */

    if (!results.length) {

      if (rowsEl) {

        rowsEl.innerHTML = `
          <tr>
            <td colspan="5" class="loading">
              No academic results found.
            </td>
          </tr>
        `;
      }

      if (statusEl) {
        statusEl.textContent = "No results";
      }

      return;
    }


    /* RESULTS TABLE */

    if (rowsEl) {

      rowsEl.innerHTML = "";

      subjects.forEach(
        ([subject, item], index) => {

          const average =
            item.scores.length
              ? (
                  item.scores.reduce(
                    (a, b) => a + b,
                    0
                  ) / item.scores.length
                ).toFixed(1) + "%"
              : "N/A";


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
              ${average}
            </td>
          `;


          rowsEl.appendChild(tr);

        }
      );
    }


    if (statusEl) {

      statusEl.textContent =
        `${total} institution result(s)`;
    }


  } catch (error) {

    console.error(
      "Academic results error:",
      error
    );

    if (statusEl) {
      statusEl.textContent = "Unavailable";
    }

    if (rowsEl) {

      rowsEl.innerHTML = `
        <tr>
          <td colspan="5" class="loading">
            Academic results could not be loaded.
            Please check the grades table and RLS policies.
          </td>
        </tr>
      `;
    }

    [
      "academicTotalResults",
      "academicPublishedResults",
      "academicPendingResults",
      "academicSubjectCount"
    ].forEach(id => setDashboardValue(id, "N/A"));
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {

  const logoutBtn =
    document.getElementById("logoutBtn");


  if (!logoutBtn) return;


  logoutBtn.addEventListener(
    "click",
    async () => {

      logoutBtn.disabled = true;

      logoutBtn.textContent =
        "Logging out...";


      try {

        const { error } =
          await supabaseClient.auth.signOut();

        if (error) {
          console.error("Logout error:", error);
        }

      } catch (error) {

        console.error(
          "Logout error:",
          error
        );
      }


      sessionStorage.clear();

      window.location.replace("index.html");
    }
  );
}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  (event) => {

    if (event === "SIGNED_OUT") {

      window.location.replace("index.html");
    }
  }
);


/* =========================================================
   START DASHBOARD
   ========================================================= */

async function startDashboard() {

  const allowed =
    await checkDashboardAccess();


  if (!allowed) return;


  await Promise.all([

    loadInstitutionCounts(),

    loadAcademicResults()

  ]);


  setupLogout();
}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  startDashboard
);
