/* =========================================================
   GAAWOW EMS
   DASHBOARD - ACADEMIC RESULTS
   ========================================================= */

async function loadDashboardAcademicResults() {

  const statusEl = document.getElementById("academicResultsStatus");
  const rowsEl = document.getElementById("academicSubjectRows");

  if (statusEl) statusEl.textContent = "Loading...";

  if (rowsEl) {
    rowsEl.innerHTML = `
      <tr>
        <td colspan="5" class="academic-loading">
          Loading academic results...
        </td>
      </tr>
    `;
  }

  try {

    /* Get results */
    const { data: results, error: resultsError } =
      await supabaseClient
        .from("results")
        .select(`
          id,
          student_id,
          subject_id,
          score,
          max_score,
          percentage,
          grade,
          is_published
        `);

    if (resultsError) {
      throw resultsError;
    }

    /* Get subjects */
    const { data: subjects, error: subjectsError } =
      await supabaseClient
        .from("subjects")
        .select(`
          id,
          name,
          code,
          is_active
        `);

    if (subjectsError) {
      throw subjectsError;
    }

    const resultList = results || [];
    const subjectList = (subjects || [])
      .filter(subject => subject.is_active !== false);

    /* -----------------------------
       TOTAL RESULTS
       ----------------------------- */

    const totalResults = resultList.length;

    const publishedResults =
      resultList.filter(
        result => result.is_published === true
      ).length;

    const pendingResults =
      totalResults - publishedResults;


    /* -----------------------------
       PASS / FAIL
       ----------------------------- */

    function getResultPercentage(result) {

      if (
        result.percentage !== null &&
        result.percentage !== undefined &&
        !isNaN(Number(result.percentage))
      ) {
        return Number(result.percentage);
      }

      const score = Number(result.score);
      const max = Number(result.max_score);

      if (!isNaN(score) && !isNaN(max) && max > 0) {
        return (score / max) * 100;
      }

      return 0;
    }

    function isPassed(result) {

      const grade =
        String(result.grade || "")
          .trim()
          .toUpperCase();

      if (grade === "F") {
        return false;
      }

      return getResultPercentage(result) >= 50;
    }

    const passedResults =
      resultList.filter(isPassed).length;

    const failedResults =
      totalResults - passedResults;


    /* -----------------------------
       AVERAGE
       ----------------------------- */

    const percentages =
      resultList.map(getResultPercentage);

    const average =
      percentages.length > 0
        ? percentages.reduce(
            (sum, value) => sum + value,
            0
          ) / percentages.length
        : 0;


    /* -----------------------------
       STUDENTS WITH RESULTS
       ----------------------------- */

    const studentsWithResults =
      new Set(
        resultList
          .map(result => result.student_id)
          .filter(Boolean)
      ).size;


    /* -----------------------------
       UPDATE DASHBOARD CARDS
       ----------------------------- */

    const setValue = (id, value) => {

      const element =
        document.getElementById(id);

      if (element) {
        element.textContent = value;
      }
    };

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
      average.toFixed(2) + "%"
    );

    setValue(
      "academicStudentsWithResults",
      studentsWithResults
    );

    setValue(
      "academicSubjectCount",
      subjectList.length
    );


    /* -----------------------------
       SUBJECT ORDER
       ----------------------------- */

    const subjectOrder = [
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

    subjectList.sort((a, b) => {

      const aName =
        String(a.name || "")
          .trim()
          .toLowerCase();

      const bName =
        String(b.name || "")
          .trim()
          .toLowerCase();

      const aIndex =
        subjectOrder.indexOf(aName);

      const bIndex =
        subjectOrder.indexOf(bName);

      if (aIndex === -1 && bIndex === -1) {
        return aName.localeCompare(bName);
      }

      if (aIndex === -1) return 1;

      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });


    /* -----------------------------
       SUBJECT TABLE
       ----------------------------- */

    if (!rowsEl) return;

    if (subjectList.length === 0) {

      rowsEl.innerHTML = `
        <tr>
          <td colspan="5" class="academic-loading">
            No subjects found.
          </td>
        </tr>
      `;

    } else {

      rowsEl.innerHTML =
        subjectList.map((subject, index) => {

          const subjectResults =
            resultList.filter(
              result =>
                result.subject_id === subject.id
            );

          const published =
            subjectResults.filter(
              result =>
                result.is_published === true
            ).length;

          const subjectPercentages =
            subjectResults.map(
              getResultPercentage
            );

          const subjectAverage =
            subjectPercentages.length > 0
              ? subjectPercentages.reduce(
                  (sum, value) => sum + value,
                  0
                ) / subjectPercentages.length
              : 0;

          return `
            <tr>

              <td>
                ${index + 1}
              </td>

              <td>
                <strong>
                  ${escapeHtml(
                    subject.name || "Unknown Subject"
                  )}
                </strong>

                ${
                  subject.code
                    ? `
                      <span style="
                        display:block;
                        color:#94A3B8;
                        font-size:10px;
                        font-weight:400;
                        margin-top:2px;
                      ">
                        ${escapeHtml(subject.code)}
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

        }).join("");
    }


    if (statusEl) {

      statusEl.textContent =
        `${totalResults} result(s)`;
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

    ids.forEach(id => {

      const element =
        document.getElementById(id);

      if (element) {
        element.textContent = "0";
      }

    });

    const averageEl =
      document.getElementById(
        "academicAverage"
      );

    if (averageEl) {
      averageEl.textContent = "0%";
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
   START ACADEMIC RESULTS
   ========================================================= */

loadDashboardAcademicResults();
