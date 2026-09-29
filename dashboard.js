/* =========================================================
   GAAWOW EMS
   DASHBOARD.JS
   Super Admin Dashboard
   + Academic Results
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIG
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
   PAGE NAVIGATION
   ========================================================= */

function openPage(page) {

  if (!page) {
    return;
  }

  window.location.href = page;
}


/* =========================================================
   HTML SECURITY
   ========================================================= */

function escapeHtml(value) {

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
   SUPER ADMIN CHECK
   ========================================================= */

async function checkSuperAdmin() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .auth
        .getSession();


    if (
      error ||
      !data ||
      !data.session
    ) {

      window.location.href =
        "index.html";

      return false;
    }


    const user =
      data.session.user;


    const {
      data: profile,
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "full_name, role, institution_id, is_active"
        )
        .eq(
          "id",
          user.id
        )
        .single();


    if (
      profileError ||
      !profile
    ) {

      console.error(
        "Profile error:",
        profileError
      );

      alert(
        "Unable to load your profile."
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


    if (
      profile.is_active === false
    ) {

      alert(
        "Your account is inactive."
      );

      await supabaseClient
        .auth
        .signOut();

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
      "Super Admin Check Error:",
      error
    );

    return false;
  }
}


/* =========================================================
   TOP DASHBOARD COUNTS
   ========================================================= */

async function loadCounts() {

  try {

    const institutions =
      await supabaseClient
        .from("institutions")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        );


    const students =
      await supabaseClient
        .from("students")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        );


    const teachers =
      await supabaseClient
        .from("profiles")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "role",
          "teacher"
        );


    const certificates =
      await supabaseClient
        .from("certificates")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
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
        institutions.count ?? "0";
    }


    if (studentEl) {

      studentEl.textContent =
        students.count ?? "0";
    }


    if (teacherEl) {

      teacherEl.textContent =
        teachers.count ?? "0";
    }


    if (certificateEl) {

      certificateEl.textContent =
        certificates.count ?? "0";
    }


    if (institutions.error) {

      console.error(
        "Institutions count error:",
        institutions.error
      );
    }


    if (students.error) {

      console.error(
        "Students count error:",
        students.error
      );
    }


    if (teachers.error) {

      console.error(
        "Teachers count error:",
        teachers.error
      );
    }


    if (certificates.error) {

      console.error(
        "Certificates count error:",
        certificates.error
      );
    }

  } catch (error) {

    console.error(
      "Dashboard Counts Error:",
      error
    );
  }
}


/* =========================================================
   RESULT PERCENTAGE
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
    Number(
      result.score
    );


  const maxScore =
    Number(
      result.max_score
    );


  if (
    !isNaN(score) &&
    !isNaN(maxScore) &&
    maxScore > 0
  ) {

    return (
      score /
      maxScore
    ) * 100;
  }


  return 0;
}


/* =========================================================
   PASS / FAIL
   ========================================================= */

function isResultPassed(result) {

  const grade =
    String(
      result.grade || ""
    )
      .trim()
      .toUpperCase();


  if (
    grade === "F"
  ) {

    return false;
  }


  return (
    getResultPercentage(result) >=
    50
  );
}


/* =========================================================
   SUBJECT ORDER
   ========================================================= */

const ACADEMIC_SUBJECT_ORDER = [

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


/* =========================================================
   ACADEMIC RESULTS
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

    /* -----------------------------------------
       RESULTS
       ----------------------------------------- */

    const {
      data: results,
      error: resultsError
    } =
      await supabaseClient
        .from("results")
        .select(
          "id, student_id, subject_id, score, max_score, percentage, grade, is_published"
        );


    if (resultsError) {

      throw resultsError;
    }


    /* -----------------------------------------
       SUBJECTS

       IMPORTANT:
       Only existing columns are requested.
       is_active is NOT requested.
       ----------------------------------------- */

    const {
      data: subjects,
      error: subjectsError
    } =
      await supabaseClient
        .from("subjects")
        .select(
          "id, name, code"
        );


    if (subjectsError) {

      throw subjectsError;
    }


    const resultList =
      results || [];


    const subjectList =
      subjects || [];


    /* -----------------------------------------
       TOTAL RESULTS
       ----------------------------------------- */

    const totalResults =
      resultList.length;


    /* -----------------------------------------
       PUBLISHED
       ----------------------------------------- */

    const publishedResults =
      resultList.filter(
        result =>
          result.is_published === true
      ).length;


    /* -----------------------------------------
       PENDING
       ----------------------------------------- */

    const pendingResults =
      totalResults -
      publishedResults;


    /* -----------------------------------------
       PASSED
       ----------------------------------------- */

    const passedResults =
      resultList.filter(
        isResultPassed
      ).length;


    /* -----------------------------------------
       FAILED
       ----------------------------------------- */

    const failedResults =
      totalResults -
      passedResults;


    /* -----------------------------------------
       AVERAGE
       ----------------------------------------- */

    const percentages =
      resultList.map(
        getResultPercentage
      );


    const average =
      percentages.length > 0
        ? percentages.reduce(
            (
              sum,
              value
            ) =>
              sum + value,
            0
          ) /
          percentages.length
        : 0;


    /* -----------------------------------------
       STUDENTS WITH RESULTS
       ----------------------------------------- */

    const studentsWithResults =
      new Set(
        resultList
          .map(
            result =>
              result.student_id
          )
          .filter(Boolean)
      ).size;


    /* -----------------------------------------
       UPDATE CARD
       ----------------------------------------- */

    function setValue(
      id,
      value
    ) {

      const element =
        document.getElementById(
          id
        );


      if (element) {

        element.textContent =
          value;
      }
    }


    setValue(
      "academicTotalResults",
      totalResults
    );


    setValue(
      "academicPublishedResults",
      publishedResults
    );


    setValue(
      "academicPendingResults",
      pendingResults
    );


    setValue(
      "academicPassedResults",
      passedResults
    );


    setValue(
      "academicFailedResults",
      failedResults
    );


    setValue(
      "academicAverage",
      average.toFixed(2) +
      "%"
    );


    setValue(
      "academicStudentsWithResults",
      studentsWithResults
    );


    setValue(
      "academicSubjectCount",
      subjectList.length
    );


    /* -----------------------------------------
       SORT SUBJECTS
       ----------------------------------------- */

    subjectList.sort(
      (
        a,
        b
      ) => {

        const aName =
          String(
            a.name || ""
          )
            .trim()
            .toLowerCase();


        const bName =
          String(
            b.name || ""
          )
            .trim()
            .toLowerCase();


        const aIndex =
          ACADEMIC_SUBJECT_ORDER
            .indexOf(
              aName
            );


        const bIndex =
          ACADEMIC_SUBJECT_ORDER
            .indexOf(
              bName
            );


        if (
          aIndex === -1 &&
          bIndex === -1
        ) {

          return aName.localeCompare(
            bName
          );
        }


        if (
          aIndex === -1
        ) {

          return 1;
        }


        if (
          bIndex === -1
        ) {

          return -1;
        }


        return (
          aIndex -
          bIndex
        );
      }
    );


    /* -----------------------------------------
       SUBJECT TABLE
       ----------------------------------------- */

    if (!rowsEl) {

      return;
    }


    if (
      subjectList.length === 0
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
        subjectList
          .map(
            (
              subject,
              index
            ) => {

              const subjectResults =
                resultList.filter(
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
                      (
                        sum,
                        value
                      ) =>
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


    /* -----------------------------------------
       STATUS
       ----------------------------------------- */

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


    const ids = [

      "academicTotalResults",

      "academicPublishedResults",

      "academicPendingResults",

      "academicPassedResults",

      "academicFailedResults",

      "academicStudentsWithResults",

      "academicSubjectCount"

    ];


    ids.forEach(
      id => {

        const element =
          document.getElementById(
            id
          );


        if (element) {

          element.textContent =
            "0";
        }

      }
    );


    const averageEl =
      document.getElementById(
        "academicAverage"
      );


    if (averageEl) {

      averageEl.textContent =
        "0%";
    }


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

function setupLogout() {

  const logoutBtn =
    document.getElementById(
      "logoutBtn"
    );


  if (!logoutBtn) {

    return;
  }


  logoutBtn.addEventListener(
    "click",
    async function () {

      this.disabled =
        true;


      this.textContent =
        "LOGGING OUT...";


      try {

        await supabaseClient
          .auth
          .signOut();

      } catch (error) {

        console.error(
          "Logout error:",
          error
        );
      }


      sessionStorage.clear();


      window.location.href =
        "index.html";
    }
  );
}


/* =========================================================
   START DASHBOARD
   ========================================================= */

async function startDashboard() {

  try {

    const allowed =
      await checkSuperAdmin();


    if (!allowed) {

      return;
    }


    setupLogout();


    await Promise.all([

      loadCounts(),

      loadDashboardAcademicResults()

    ]);


  } catch (error) {

    console.error(
      "Dashboard Start Error:",
      error
    );
  }
}


/* =========================================================
   DOM READY
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startDashboard
  );

} else {

  startDashboard();
}
