/* ============================================================
   GAAWOW EMS
   PUBLIC CERTIFICATE VERIFICATION
   + ACADEMIC RESULTS
   V3.0
   ------------------------------------------------------------
   Features:
   - Verify code
   - Full verification URL support
   - QR URL support
   - Supabase RPC verification
   - Certificate status
   - Student information
   - Academic results
   - 8 subjects
   - Total / Average / Grade / PASS-FAIL
   - Published results only
   - Mobile friendly
   ============================================================ */

(() => {
  "use strict";

  /* ==========================================================
     SUPABASE CONFIG
     ========================================================== */

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  if (!window.supabase) {
    console.error("Supabase library was not loaded.");
    return;
  }

  const supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );


  /* ==========================================================
     DOM HELPER
     ========================================================== */

  const $ = (id) => document.getElementById(id);


  /* ==========================================================
     STATUS INFORMATION
     ========================================================== */

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


  /* ==========================================================
     8 OFFICIAL SUBJECTS
     ========================================================== */

  const SUBJECT_ORDER = [

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


  /* ==========================================================
     HTML SECURITY
     ========================================================== */

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


  /* ==========================================================
     DATE FORMAT
     ========================================================== */

  function formatDate(value) {

    if (!value) {
      return "—";
    }

    const raw =
      String(value).trim();

    const d =
      new Date(`${raw}T00:00:00`);

    if (
      Number.isNaN(
        d.getTime()
      )
    ) {
      return escapeHtml(raw);
    }

    return d.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    );
  }


  /* ==========================================================
     NORMALIZE VERIFY CODE
     ----------------------------------------------------------
     Accepts:

     1. GAW-2026-V8AN5Q2F

     2. https://gaawowacademy-dotcom.github.io/
        GAAWOW-EMS/verify.html?code=GAW-2026-V8AN5Q2F

     3. URL encoded verification links
     ========================================================== */

  function normalizeVerifyCode(value) {

    const raw =
      String(value || "").trim();

    if (!raw) {
      return "";
    }

    /* ----------------------------------------------
       CASE 1:
       Full URL
       ---------------------------------------------- */

    try {

      const parsed =
        new URL(raw);

      const code =
        parsed.searchParams.get("code");

      if (code) {

        return decodeURIComponent(
          code
        ).trim();
      }

    } catch (_) {

      /* Not a URL.
         Continue as normal code. */

    }


    /* ----------------------------------------------
       CASE 2:
       Sometimes user pastes:

       verify.html?code=GAW-2026-XXXX
       ---------------------------------------------- */

    const lower =
      raw.toLowerCase();

    const marker =
      "code=";

    const position =
      lower.indexOf(marker);

    if (position !== -1) {

      let extracted =
        raw.substring(
          position + marker.length
        );

      extracted =
        extracted.split("&")[0];

      try {

        extracted =
          decodeURIComponent(
            extracted
          );

      } catch (_) {}

      if (extracted.trim()) {

        return extracted.trim();
      }
    }


    /* ----------------------------------------------
       CASE 3:
       Normal code
       ---------------------------------------------- */

    return raw;
  }


  /* ==========================================================
     GET CODE FROM PAGE URL
     ========================================================== */

  function codeFromUrl() {

    try {

      const params =
        new URLSearchParams(
          window.location.search
        );

      const rawCode =
        params.get("code") || "";

      return normalizeVerifyCode(
        rawCode
      );

    } catch (_) {

      return "";
    }
  }


  /* ==========================================================
     SHOW RESULT
     ========================================================== */

  function setResultView(html) {

    const result =
      $("result");

    if (!result) {
      return;
    }

    result.innerHTML =
      html;

    result.style.display =
      "block";
  }


  /* ==========================================================
     LOADING
     ========================================================== */

  function showLoading() {

    setResultView(`

      <div class="panel neutral">

        <div class="spinner"></div>

        <h2>
          Checking Certificate
        </h2>

        <p>
          Please wait while GAAWOW Academy
          verifies the certificate.
        </p>

      </div>

    `);
  }


  /* ==========================================================
     EMPTY CODE
     ========================================================== */

  function showEmptyCode() {

    setResultView(`

      <div class="panel neutral">

        <div class="icon">
          🔍
        </div>

        <h2>
          Enter a Verify Code
        </h2>

        <p>
          Scan the QR code on a GAAWOW Academy
          certificate or enter the verification
          code below.
        </p>

      </div>

    `);
  }


  /* ==========================================================
     CERTIFICATE NOT FOUND
     ========================================================== */

  function showNotFound(code) {

    setResultView(`

      <div class="panel bad">

        <div class="icon">
          ✖
        </div>

        <h2>
          Certificate Not Found
        </h2>

        <p>
          No certificate matches the code
          <span class="code">
            ${escapeHtml(code || "(empty)")}
          </span>.
        </p>

        <p>
          Please check the QR code or
          verification code and try again.
        </p>

      </div>

    `);
  }


  /* ==========================================================
     DATABASE / SERVER ERROR
     ========================================================== */

  function showBlocked(errorMessage) {

    setResultView(`

      <div class="panel bad">

        <div class="icon">
          ⚠
        </div>

        <h2>
          Verification Unavailable
        </h2>

        <p>
          The certificate verification service
          could not be reached right now.
        </p>

        <p class="tech">
          ${escapeHtml(
            errorMessage ||
            "Unknown verification error."
          )}
        </p>

      </div>

    `);
  }


  /* ==========================================================
     GRADE CALCULATOR
     ========================================================== */

  function calculateGrade(value) {

    const percentage =
      Number(value);

    if (
      Number.isNaN(
        percentage
      )
    ) {
      return "—";
    }

    if (percentage >= 90) {
      return "A+";
    }

    if (percentage >= 80) {
      return "A";
    }

    if (percentage >= 70) {
      return "B";
    }

    if (percentage >= 60) {
      return "C";
    }

    if (percentage >= 50) {
      return "D";
    }

    return "F";
  }


  /* ==========================================================
     ACADEMIC RESULTS
     ========================================================== */

  function renderAcademicResults(results) {

    if (
      !Array.isArray(results) ||
      results.length === 0
    ) {

      return `

        <div class="academic-section">

          <h3>
            Academic Results
          </h3>

          <div class="panel neutral">

            <p>
              Academic results have not yet
              been published.
            </p>

          </div>

        </div>

      `;
    }


    /* ----------------------------------------------
       Sort according to official subject order
       ---------------------------------------------- */

    const sortedResults =
      [...results].sort(
        (a, b) => {

          const aName =
            String(
              a.subject_name || ""
            )
            .trim()
            .toLowerCase();

          const bName =
            String(
              b.subject_name || ""
            )
            .trim()
            .toLowerCase();

          const ai =
            SUBJECT_ORDER.indexOf(
              aName
            );

          const bi =
            SUBJECT_ORDER.indexOf(
              bName
            );

          if (
            ai === -1 &&
            bi === -1
          ) {
            return aName.localeCompare(
              bName
            );
          }

          if (ai === -1) {
            return 1;
          }

          if (bi === -1) {
            return -1;
          }

          return ai - bi;
        }
      );


    /* ----------------------------------------------
       Create rows
       ---------------------------------------------- */

    const rows =
      sortedResults
        .map(
          (result, index) => {

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

            let percentage =
              result.percentage !== null &&
              result.percentage !== undefined
                ? Number(result.percentage)
                : (
                    maxScore > 0
                      ? (
                          score /
                          maxScore
                        ) * 100
                      : 0
                  );

            if (
              Number.isNaN(
                percentage
              )
            ) {
              percentage = 0;
            }

            const grade =
              result.grade ||
              calculateGrade(
                percentage
              );

            const remarks =
              result.remarks ||
              "";


            return `

              <tr>

                <td>
                  ${index + 1}
                </td>

                <td>

                  <strong>
                    ${escapeHtml(
                      result.subject_name ||
                      "—"
                    )}
                  </strong>

                </td>

                <td>
                  ${escapeHtml(
                    result.score ??
                    "—"
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    result.max_score ??
                    100
                  )}
                </td>

                <td>
                  ${percentage.toFixed(2)}%
                </td>

                <td>

                  <strong>
                    ${escapeHtml(
                      grade
                    )}
                  </strong>

                </td>

                <td>
                  ${escapeHtml(
                    remarks || "—"
                  )}
                </td>

              </tr>

            `;
          }
        )
        .join("");


    return `

      <div class="academic-section">

        <h3>
          Academic Results
        </h3>

        <div class="academic-table-wrapper">

          <table class="academic-table">

            <thead>

              <tr>

                <th>#</th>

                <th>
                  Subject
                </th>

                <th>
                  Score
                </th>

                <th>
                  Max
                </th>

                <th>
                  Percentage
                </th>

                <th>
                  Grade
                </th>

                <th>
                  Remarks
                </th>

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


  /* ==========================================================
     ACADEMIC SUMMARY
     ========================================================== */

  function renderAcademicSummary(summary) {

    if (!summary) {
      return "";
    }

    const totalScore =
      Number(
        summary.total_score || 0
      );

    const totalMax =
      Number(
        summary.total_max_score || 0
      );

    const average =
      Number(
        summary.average || 0
      );

    const grade =
      summary.overall_grade ||
      calculateGrade(
        average
      );

    const finalResult =
      String(
        summary.final_result ||
        "FAIL"
      ).toUpperCase();

    const resultClass =
      finalResult === "PASS"
        ? "ok"
        : "bad";


    return `

      <div class="academic-summary">

        <div class="summary-card">

          <span>
            Total Score
          </span>

          <strong>
            ${totalScore} / ${totalMax}
          </strong>

        </div>


        <div class="summary-card">

          <span>
            Average
          </span>

          <strong>
            ${average.toFixed(2)}%
          </strong>

        </div>


        <div class="summary-card">

          <span>
            Overall Grade
          </span>

          <strong>
            ${escapeHtml(
              grade
            )}
          </strong>

        </div>


        <div class="summary-card ${resultClass}">

          <span>
            Final Result
          </span>

          <strong>
            ${escapeHtml(
              finalResult
            )}
          </strong>

        </div>

      </div>

    `;
  }


  /* ==========================================================
     CERTIFICATE VIEW
     ========================================================== */

  function showCertificate(payload) {

    const cert =
      payload.certificate ||
      {};

    const student =
      payload.student ||
      {};

    const academicResults =
      payload.academic_results ||
      [];

    const summary =
      payload.summary ||
      {};


    /* ----------------------------------------------
       Status
       ---------------------------------------------- */

    const statusKey =
      String(
        cert.status ||
        "valid"
      ).toLowerCase();

    const info =
      STATUS_INFO[
