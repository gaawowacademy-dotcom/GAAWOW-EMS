/* =========================================================
   GAAWOW EMS
   SUPER ADMIN DASHBOARD
   COMPLETE DASHBOARD JAVASCRIPT
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIGURATION
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
   COMMON HELPERS
   ========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}


function openPage(page) {
  window.location.href = page;
}


/* =========================================================
   SUPER ADMIN AUTHENTICATION
   ========================================================= */

async function checkSuperAdmin() {

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

      window.location.href = "index.html";

      return false;
    }


    const session =
      sessionData?.session;


    if (!session) {

      window.location.href =
        "index.html";

      return false;
    }


    const {
      data: profile,
      error: profileError
    } = await supabaseClient
      .from("profiles")
      .select("full_name,role")
      .eq("id", session.user.id)
      .single();


    if (profileError || !profile) {

      console.error(
        "Profile error:",
        profileError
      );

      alert(
        "Unable to load your EMS profile."
      );

      return false;
    }


    if (
      profile.role !==
      "super_admin"
    ) {

      alert(
        "Access denied. Super Admin only."
      );

      window.location.href =
        "index.html";

      return false;
    }


    const welcome =
      document.getElementById(
        "superAdminWelcome"
      );


    if (
      welcome &&
      profile.full_name
    ) {

      welcome.textContent =
        "Welcome, " +
        profile.full_name;
    }


    return true;

  } catch (error) {

    console.error(
      "Authentication error:",
      error
    );

    window.location.href =
      "index.html";

    return false;
  }
}


/* =========================================================
   SYSTEM MANAGEMENT COUNTS
   ========================================================= */

async function loadSystemCounts() {

  try {

    const [
      institutionsResponse,
      studentsResponse,
      teachersResponse,
      certificatesResponse
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


    if (
      institutionsResponse.error
    ) {

      console.error(
        "Institutions count error:",
        institutionsResponse.error
      );
    }


    if (
      studentsResponse.error
    ) {

      console.error(
        "Students count error:",
        studentsResponse.error
      );
    }


    if (
      teachersResponse.error
    ) {

      console.error(
        "Teachers count error:",
        teachersResponse.error
      );
    }


    if (
      certificatesResponse.error
    ) {

      console.error(
        "Certificates count error:",
        certificatesResponse.error
      );
    }


    setText(
      "institutionCount",
      institutionsResponse.count ?? 0
    );


    setText(
      "studentCount",
      studentsResponse.count ?? 0
    );


    setText(
      "teacherCount",
      teachersResponse.count ?? 0
    );


    setText(
      "certificateCount",
      certificatesResponse.count ?? 0
    );


  } catch (error) {

    console.error(
      "System counts error:",
      error
    );


    setText(
      "institutionCount",
      "0"
    );

    setText(
      "studentCount",
      "0"
    );

    setText(
      "teacherCount",
      "0"
    );

    setText(
      "certificateCount",
      "0"
    );
  }
}


/* =========================================================
   ACADEMIC RESULT PERCENTAGE
   ========================================================= */

function getResultPercentage(result) {

  if (
    result.percentage !== null &&
    result.percentage !== undefined &&
    !isNaN(
      Number(result.percentage)
    )
  ) {

    return Number(
      result.percentage
    );
  }


  const score =
    Number(result.score);


  const maxScore =
    Number(result.max_score);


  if (
    !isNaN(score) &&
    !isNaN(maxScore) &&
    maxScore > 0
  ) {

    return (
      score / maxScore
    ) * 100;
  }


  return 0;
}


/* =========================================================
   PASS / FAIL
   ========================================================= */

function isResultPassed(result) {

  const grade =
    String(result.grade || "")
      .trim()
      .toUpperCase();


  if (grade === "F") {
    return false;
  }


  return (
    getResultPercentage(result) >= 50
  );
}


/* =========================================================
   SUBJECT ORDER
   ========================================================= */

function sortAcademicSubjects(subjects) {

  const order = [

    "first aid",

    "anatomy & physiology",

    "anatomy and physiology",

    "epidemiology",

    "epi",

    "parasitology",

    "pathology",

    "nutrition",

    "pharmacology",

    "practice"

  ];


  return subjects.sort(
    (a, b) => {

      const aName =
        String(a.name || "")
          .trim()
          .toLowerCase();


      const bName =
        String(b.name || "")
          .trim()
          .toLowerCase();


      const aIndex =
        order.indexOf(aName);


      const bIndex =
        order.indexOf(bName);


      if (
        aIndex === -1 &&
        bIndex === -1
      ) {

        return aName.localeCompare(
          bName
        );
      }


      if (aIndex === -1) {
        return 1;
      }


      if (bIndex === -1) {
        return -1;
      }


      return aIndex - bIndex;
    }
  );
}


/* =========================================================
   ACADEMIC RESULTS DASHBOARD
   ========================================================= */

async function loadDashboardAcademicResults() {

  const statusEl =
    document.getElementById(
      "academicResultsStatus"
    );


  const rowsEl =
    document.getElementById(
      "academicSubjectRows"
    );


  if (statusEl) {

    statusEl.textContent =
      "Loading...";
  }


  if (rowsEl) {

    rowsEl.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="academic-loading"
        >
          Loading academic results...
        </td>
      </tr>
    `;
  }


  try {

    /* -----------------------------------------------------
       LOAD RESULTS + SUBJECTS
       ----------------------------------------------------- */

    const [
      resultsResponse,
      subjectsResponse
    ] = await Promise.all([

      supabaseClient
        .from("results")
        .select(
          "id,student_id,subject_id,score,max_score,percentage,grade,is_published"
        ),

      supabaseClient
        .from("subjects")
        .select(
          "id,name,code,is_active"
        )
        .order("name")

    ]);


    if (
      resultsResponse.error
    ) {

      throw resultsResponse.error;
    }


    if (
      subjectsResponse.error
    ) {

      throw subjectsResponse.error;
    }


    const results =
      resultsResponse.data || [];


    let subjects =
      subjectsResponse.data || [];


    /* -----------------------------------------------------
       ACTIVE SUBJECTS
       ----------------------------------------------------- */

    const activeSubjects =
      subjects.filter(
        subject =>
          subject.is_active !== false
      );


    subjects =
      activeSubjects.length
        ? activeSubjects
        : subjects;


    /* -----------------------------------------------------
       TOTAL RESULTS
       ----------------------------------------------------- */

    const totalResults =
      results.length;


    /* -----------------------------------------------------
       PUBLISHED RESULTS
       ----------------------------------------------------- */

    const publishedResults =
      results.filter(
        result =>
          result.is_published === true
      ).length;


    /* -----------------------------------------------------
       PENDING RESULTS
       ----------------------------------------------------- */

    const pendingResults =
      totalResults -
      publishedResults;


    /* -----------------------------------------------------
       PASSED RESULTS
       ----------------------------------------------------- */

    const passedResults =
      results.filter(
        isResultPassed
      ).length;


    /* -----------------------------------------------------
       FAILED RESULTS
       ----------------------------------------------------- */

    const failedResults =
      totalResults -
      passedResults;


    /* -----------------------------------------------------
       AVERAGE
       ----------------------------------------------------- */

    const percentages =
      results.map(
        getResultPercentage
      );


    const average =
      percentages.length > 0

        ? percentages.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          percentages.length

        : 0;


    /* -----------------------------------------------------
       STUDENTS WITH RESULTS
       ----------------------------------------------------- */

    const studentsWithResults =
      new Set(
        results
          .map(
            result =>
              result.student_id
          )
          .filter(Boolean)
      ).size;


    /* -----------------------------------------------------
       UPDATE ACADEMIC CARDS
       ----------------------------------------------------- */

    setText(
      "academicTotalResults",
      totalResults
    );


    setText(
      "academicPublishedResults",
      publishedResults
    );


    setText(
      "academicPendingResults",
      pendingResults
    );


    setText(
      "academicPassedResults",
      passedResults
    );


    setText(
      "academicFailedResults",
      failedResults
    );


    setText(
      "academicAverage",
      average.toFixed(2) +
      "%"
    );


    setText(
      "academicStudentsWithResults",
      studentsWithResults
    );


    setText(
      "academicSubjectCount",
      subjects.length
    );


    /* -----------------------------------------------------
       SORT SUBJECTS
       ----------------------------------------------------- */

    sortAcademicSubjects(
      subjects
    );


    /* -----------------------------------------------------
       SUBJECT TABLE
       ----------------------------------------------------- */

    if (!rowsEl) {
      return;
    }


    if (
      subjects.length === 0
    ) {

      rowsEl.innerHTML = `
        <tr>
          <td
            colspan="5"
            class="academic-loading"
          >
            No subjects found.
          </td>
        </tr>
      `;

    } else {

      rowsEl.innerHTML =
        subjects
          .map(
            (subject, index) => {

              const subjectResults =
                results.filter(
                  result =>
                    result.subject_id ===
                    subject.id
                );


              const published =
                subjectResults.filter(
                  result =>
                    result.is_published ===
                    true
                ).length;


              const subjectPercentages =
                subjectResults.map(
                  getResultPercentage
                );


              const subjectAverage =
                subjectPercentages.length > 0

                  ? subjectPercentages.reduce(
                      (sum, value) =>
                        sum + value,
                      0
                    ) /
                    subjectPercentages.length

                  : 0;


              return `
                <tr>

                  <td>
                    ${index + 1}
                  </td>

                  <td>

                    <strong>
                      ${escapeHtml(
                        subject.name ||
                        "Unknown Subject"
                      )}
                    </strong>

                    ${
                      subject.code
                        ? `
                          <span
                            style="
                              display:block;
                              color:#94A3B8;
                              font-size:10px;
                              font-weight:400;
                              margin-top:2px;
                            "
                          >
                            ${escapeHtml(
                              subject.code
                            )}
                          </span>
                        `
                        : ""
                    }

                  </td>

                  <td>
                    ${subjectResults.length}
                  </td>

                  <td>
                    ${published}
                  </td>

                  <td>
                    <strong>
                      ${subjectAverage.toFixed(2)}%
                    </strong>
                  </td>

                </tr>
              `;

            }
          )
          .join("");
    }


    /* -----------------------------------------------------
       STATUS
       ----------------------------------------------------- */

    if (statusEl) {

      statusEl.textContent =
        totalResults +
        " result(s)";
    }


  } catch (error) {

    console.error(
      "Academic Results Dashboard Error:",
      error
    );


    /* Reset cards if loading fails */

    const resetIds = [

      "academicTotalResults",

      "academicPublishedResults",

      "academicPendingResults",

      "academicPassedResults",

      "academicFailedResults",

      "academicStudentsWithResults",

      "academicSubjectCount"

    ];


    resetIds.forEach(
      id => {

        setText(
          id,
          "0"
        );

      }
    );


    setText(
      "academicAverage",
      "0%"
    );


    if (statusEl) {

      statusEl.textContent =
        "Could not load";
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
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutDashboard() {

  try {

    await supabaseClient.auth.signOut();

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

  } finally {

    sessionStorage.clear();

    window.location.href =
      "index.html";
  }
}


/* =========================================================
   DASHBOARD INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    /* Logout */

    const logoutButton =
      document.getElementById(
        "logoutBtn"
      );


    if (logoutButton) {

      logoutButton.addEventListener(
        "click",
        logoutDashboard
      );
    }


    /* Check Super Admin */

    const allowed =
      await checkSuperAdmin();


    if (!allowed) {
      return;
    }


    /* Load dashboard data */

    await Promise.all([

      loadSystemCounts(),

      loadDashboardAcademicResults()

    ]);

  }
);
