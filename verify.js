/* ============================================================
   GAAWOW EMS
   PUBLIC CERTIFICATE VERIFICATION + ACADEMIC RESULTS
   V2.0
   ------------------------------------------------------------
   No login required.
   Public verification uses the secure Supabase RPC:
   verify_certificate_with_results(text)

   Academic results shown:
   1. First Aid
   2. Anatomy & Physiology
   3. Epidemiology
   4. Parasitology
   5. Pathology
   6. Nutrition
   7. Pharmacology
   8. Practice

   Maximum total = 800
   ============================================================ */

(() => {
  "use strict";

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

  const $ = (id) => document.getElementById(id);

  const STATUS_INFO = {
    valid: {
      label: "VALID",
      icon: "✔",
      cls: "ok",
      heading: "Authentic Certificate"
    },

    graduated: {
      label: "GRADUATED",
      icon: "✔",
      cls: "ok",
      heading: "Authentic Certificate"
    },

    pending: {
      label: "PENDING",
      icon: "⏳",
      cls: "warn",
      heading: "Certificate Pending"
    },

    expired: {
      label: "EXPIRED",
      icon: "⚠",
      cls: "warn",
      heading: "Certificate Expired"
    },

    revoked: {
      label: "REVOKED",
      icon: "✖",
      cls: "bad",
      heading: "Certificate Revoked"
    }
  };


  /* ------------------------------------------------------------
     SECURITY
     ------------------------------------------------------------ */

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  /* ------------------------------------------------------------
     DATE
     ------------------------------------------------------------ */

  function formatDate(value) {
    if (!value) return "—";

    const d = new Date(`${value}T00:00:00`);

    if (Number.isNaN(d.getTime())) {
      return escapeHtml(value);
    }

    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }


  /* ------------------------------------------------------------
     URL VERIFY CODE
     ------------------------------------------------------------ */

  function codeFromUrl() {
    const params =
      new URLSearchParams(window.location.search);

    return (params.get("code") || "").trim();
  }


  /* ------------------------------------------------------------
     RESULT CONTAINER
     ------------------------------------------------------------ */

  function setResultView(html) {
    const result = $("result");

    if (!result) return;

    result.innerHTML = html;
    result.style.display = "block";
  }


  /* ------------------------------------------------------------
     LOADING
     ------------------------------------------------------------ */

  function showLoading() {

    setResultView(`
      <div class="panel neutral">

        <div class="spinner"></div>

        <p>Checking certificate...</p>

      </div>
    `);
  }


  /* ------------------------------------------------------------
     NOT FOUND
     ------------------------------------------------------------ */

  function showNotFound(code) {

    setResultView(`

      <div class="panel bad">

        <div class="icon">✖</div>

        <h2>Certificate Not Found</h2>

        <p>
          No certificate matches the code
          <span class="code">
            ${escapeHtml(code || "(empty)")}
          </span>.
          Check the QR code or the code printed on the
          certificate and try again.
        </p>

      </div>

    `);
  }


  /* ------------------------------------------------------------
     DATABASE ERROR
     ------------------------------------------------------------ */

  function showBlocked(errorMessage) {

    setResultView(`

      <div class="panel bad">

        <div class="icon">⚠</div>

        <h2>Verification Unavailable</h2>

        <p>
          The certificate database could not be reached
          right now.
        </p>

        <p class="tech">
          ${escapeHtml(errorMessage)}
        </p>

      </div>

    `);
  }


  /* ------------------------------------------------------------
     GRADE
     ------------------------------------------------------------ */

  function calculateGrade(value) {

    const p = Number(value);

    if (Number.isNaN(p)) return "—";

    if (p >= 90) return "A+";
    if (p >= 80) return "A";
    if (p >= 70) return "B";
    if (p >= 60) return "C";
    if (p >= 50) return "D";

    return "F";
  }


  /* ------------------------------------------------------------
     ACADEMIC RESULTS TABLE
     ------------------------------------------------------------ */

  function renderAcademicResults(results) {

    if (!Array.isArray(results) || results.length === 0) {

      return `

        <div class="academic-section">

          <h3>Academic Results</h3>

          <div class="panel neutral">

            <p>
              Academic results have not yet been published.
            </p>

          </div>

        </div>

      `;
    }


    const sortedResults = [...results].sort((a, b) => {

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

      const aName =
        String(a.subject_name || "")
          .trim()
          .toLowerCase();

      const bName =
        String(b.subject_name || "")
          .trim()
          .toLowerCase();

      const ai = order.indexOf(aName);
      const bi = order.indexOf(bName);

      if (ai === -1 && bi === -1) {
        return aName.localeCompare(bName);
      }

      if (ai === -1) return 1;
      if (bi === -1) return -1;

      return ai - bi;
    });


    const rows = sortedResults.map((result, index) => {

      const score =
        result.score !== null &&
        result.score !== undefined
          ? Number(result.score)
          : 0;

      const maxScore =
        result.max_score !== null &&
        result.max_score !== undefined
          ? Number(result.max_score)
          : 100;

      const percentage =
        result.percentage !== null &&
        result.percentage !== undefined
          ? Number(result.percentage)
          : maxScore > 0
            ? (score / maxScore) * 100
            : 0;

      const grade =
        result.grade ||
        calculateGrade(percentage);


      return `

        <tr>

          <td>
            ${index + 1}
          </td>

          <td>
            <strong>
              ${escapeHtml(result.subject_name || "—")}
            </strong>
          </td>

          <td>
            ${escapeHtml(result.score ?? "—")}
          </td>

          <td>
            ${escapeHtml(result.max_score ?? 100)}
          </td>

          <td>
            ${percentage.toFixed(2)}%
          </td>

          <td>
            <strong>
              ${escapeHtml(grade)}
            </strong>
          </td>

        </tr>

      `;
    }).join("");


    return `

      <div class="academic-section">

        <h3>Academic Results</h3>

        <div class="academic-table-wrapper">

          <table class="academic-table">

            <thead>

              <tr>

                <th>#</th>
                <th>Subject</th>
                <th>Score</th>
                <th>Max</th>
                <th>Percentage</th>
                <th>Grade</th>

              </tr>

            </thead>

            <tbody>

              ${rows}

            </tbody>

          </table>

        </div>

      </div>

    `;
  }


  /* ------------------------------------------------------------
     ACADEMIC SUMMARY
     ------------------------------------------------------------ */

  function renderAcademicSummary(summary) {

    if (!summary) return "";

    const totalScore =
      Number(summary.total_score || 0);

    const totalMax =
      Number(summary.total_max_score || 0);

    const average =
      Number(summary.average || 0);

    const grade =
      summary.overall_grade ||
      calculateGrade(average);

    const finalResult =
      String(summary.final_result || "FAIL")
        .toUpperCase();

    const resultClass =
      finalResult === "PASS"
        ? "ok"
        : "bad";


    return `

      <div class="academic-summary">

        <div class="summary-card">

          <span>Total Score</span>

          <strong>
            ${totalScore} / ${totalMax}
          </strong>

        </div>


        <div class="summary-card">

          <span>Average</span>

          <strong>
            ${average.toFixed(2)}%
          </strong>

        </div>


        <div class="summary-card">

          <span>Overall Grade</span>

          <strong>
            ${escapeHtml(grade)}
          </strong>

        </div>


        <div class="summary-card ${resultClass}">

          <span>Final Result</span>

          <strong>
            ${escapeHtml(finalResult)}
          </strong>

        </div>

      </div>

    `;
  }


  /* ------------------------------------------------------------
     CERTIFICATE VIEW
     ------------------------------------------------------------ */

  function showCertificate(payload) {

    const cert =
      payload.certificate || {};

    const student =
      payload.student || {};

    const academicResults =
      payload.academic_results || [];

    const summary =
      payload.summary || {};


    const statusKey =
      String(cert.status || "valid")
        .toLowerCase();


    const info =
      STATUS_INFO[statusKey] ||
      STATUS_INFO.valid;


    const today =
      new Date()
        .toISOString()
        .slice(0, 10);


    const pastExpiry =
      cert.expiry_date &&
      cert.expiry_date < today &&
      statusKey !== "revoked";


    const effective =
      pastExpiry
        ? STATUS_INFO.expired
        : info;


    const studentName =
      student.full_name ||
      cert.student_name ||
      "—";


    const courseName =
      cert.course_name ||
      "—";


    setResultView(`

      <div class="panel ${effective.cls}">

        <div class="icon">
          ${effective.icon}
        </div>

        <h2>
          ${effective.heading}
        </h2>

        <div class="badge ${effective.cls}">
          ${escapeHtml(
            pastExpiry
              ? "EXPIRED"
              : effective.label
          )}
        </div>


        <div class="cert-grid">

          <div class="cert-item">

            <strong>Student Name</strong>

            <span>
              ${escapeHtml(studentName)}
            </span>

          </div>


          <div class="cert-item">

            <strong>Student ID</strong>

            <span>
              ${escapeHtml(
                student.student_id || "—"
              )}
            </span>

          </div>


          <div class="cert-item">

            <strong>Course / Program</strong>

            <span>
              ${escapeHtml(courseName)}
            </span>

          </div>


          <div class="cert-item">

            <strong>Certificate No</strong>

            <span>
              ${escapeHtml(
                cert.certificate_no || "—"
              )}
            </span>

          </div>


          <div class="cert-item">

            <strong>Certificate Type</strong>

            <span>
              ${escapeHtml(
                cert.certificate_type || "—"
              )}
            </span>

          </div>


          <div class="cert-item">

            <strong>Issue Date</strong>

            <span>
              ${formatDate(cert.issue_date)}
            </span>

          </div>


          <div class="cert-item">

            <strong>Expiry Date</strong>

            <span>
              ${formatDate(cert.expiry_date)}
            </span>

          </div>

        </div>


        ${renderAcademicResults(
          academicResults
        )}


        ${renderAcademicSummary(
          summary
        )}


        <p class="footnote">

          Issued by GAAWOW Academy • Verify code

          <span class="code">

            ${escapeHtml(
              cert.verify_code || ""
            )}

          </span>

        </p>

      </div>

    `);
  }


  /* ------------------------------------------------------------
     VERIFY USING SUPABASE RPC
     ------------------------------------------------------------ */

  async function verify(code) {

    if (!code) {

      setResultView(`

        <div class="panel neutral">

          <div class="icon">🔍</div>

          <h2>Enter a Verify Code</h2>

          <p>
            Scan the QR code on a GAAWOW certificate,
            or type its verify code below.
          </p>

        </div>

      `);

      return;
    }


    showLoading();


    try {

      /*
       * IMPORTANT:
       * We no longer read certificates directly.
       *
       * The RPC returns:
       * certificate
       * student
       * academic_results
       * summary
       */

      const {
        data,
        error
      } = await supabaseClient.rpc(
        "verify_certificate_with_results",
        {
          p_verify_code: code
        }
      );


      if (error) {
        throw error;
      }


      if (!data) {

        showNotFound(code);

        return;
      }


      if (data.success === false) {

        if (
          String(data.message || "")
            .toLowerCase()
            .includes("not found")
        ) {

          showNotFound(code);

        } else {

          showBlocked(
            data.message ||
            "Verification failed."
          );

        }

        return;
      }


      if (!data.certificate) {

        showNotFound(code);

        return;
      }


      showCertificate(data);

    } catch (error) {

      console.error(
        "Verify RPC error:",
        error
      );

      showBlocked(
        error.message ||
        String(error)
      );
    }

  }


  /* ------------------------------------------------------------
     FORM
     ------------------------------------------------------------ */

  function setupForm() {

    const form =
      $("verifyForm");

    const input =
      $("codeInput");


    if (!form || !input) {
      return;
    }


    form.addEventListener(
      "submit",
      (e) => {

        e.preventDefault();


        const code =
          input.value.trim();


        const url =
          new URL(
            window.location.href
          );


        if (code) {

          url.searchParams.set(
            "code",
            code
          );

        } else {

          url.searchParams.delete(
            "code"
          );

        }


        window.history.replaceState(
          {},
          "",
          url
        );


        verify(code);

      }
    );

  }


  /* ------------------------------------------------------------
     INIT
     ------------------------------------------------------------ */

  function init() {

    const code =
      codeFromUrl();


    if ($("codeInput")) {

      $("codeInput").value =
        code;

    }


    setupForm();

    verify(code);

  }


  document.addEventListener(
    "DOMContentLoaded",
    init
  );

})();
