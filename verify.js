/* =========================================================
   GAAWOW EMS
   PUBLIC CERTIFICATE VERIFICATION
   + ACADEMIC RESULTS
   FINAL STABLE VERSION
   ========================================================= */

"use strict";

document.addEventListener("DOMContentLoaded", function () {

  /* =======================================================
     SUPABASE CONFIG
     ======================================================= */

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  if (!window.supabase) {
    console.error("Supabase library not loaded.");
    return;
  }

  const supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );


  /* =======================================================
     DOM
     ======================================================= */

  const form =
    document.getElementById("verifyForm");

  const codeInput =
    document.getElementById("codeInput");

  const resultBox =
    document.getElementById("result");


  if (!form || !codeInput || !resultBox) {

    console.error(
      "Verify page elements are missing."
    );

    return;
  }


  /* =======================================================
     SUBJECT ORDER
     ======================================================= */

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


  /* =======================================================
     STATUS
     ======================================================= */

  const STATUS_INFO = {

    valid: {
      label: "VALID",
      icon: "✔",
      className: "ok",
      title: "Authentic Certificate"
    },

    graduated: {
      label: "GRADUATED",
      icon: "✔",
      className: "ok",
      title: "Authentic Certificate"
    },

    pending: {
      label: "PENDING",
      icon: "⏳",
      className: "warn",
      title: "Certificate Pending"
    },

    expired: {
      label: "EXPIRED",
      icon: "⚠",
      className: "warn",
      title: "Certificate Expired"
    },

    revoked: {
      label: "REVOKED",
      icon: "✖",
      className: "bad",
      title: "Certificate Revoked"
    }

  };


  /* =======================================================
     HTML ESCAPE
     ======================================================= */

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


  /* =======================================================
     DATE
     ======================================================= */

  function formatDate(value) {

    if (!value) {
      return "—";
    }

    const raw =
      String(value).trim();

    const date =
      new Date(raw + "T00:00:00");

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return escapeHtml(raw);
    }

    return date.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    );
  }


  /* =======================================================
     GRADE
     ======================================================= */

  function calculateGrade(value) {

    const percentage =
      Number(value);

    if (
      Number.isNaN(
        percentage
      )
    ) {
      return "F";
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


  /* =======================================================
     VERIFY CODE NORMALIZER
     ======================================================= */

  function normalizeVerifyCode(value) {

    let raw =
      String(value || "").trim();

    if (!raw) {
      return "";
    }

    /* Full URL */

    try {

      const url =
        new URL(raw);

      const code =
        url.searchParams.get("code");

      if (code) {

        return decodeURIComponent(
          code
        ).trim();

      }

    } catch (_) {
      /* Normal code */
    }


    /* verify.html?code=XXXX */

    const lower =
      raw.toLowerCase();

    const marker =
      "code=";

    const position =
      lower.indexOf(marker);

    if (position !== -1) {

      raw =
        raw.substring(
          position + marker.length
        );

      raw =
        raw.split("&")[0];

      try {

        raw =
          decodeURIComponent(raw);

      } catch (_) {}

    }


    return raw.trim();
  }


  /* =======================================================
     SHOW RESULT
     ======================================================= */

  function setResult(html) {

    resultBox.innerHTML =
      html;

    resultBox.style.display =
      "block";
  }


  /* =======================================================
     LOADING
     ======================================================= */

  function showLoading() {

    setResult(`

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


  /* =======================================================
     ERROR
     ======================================================= */

  function showError(message) {

    setResult(`

      <div class="panel bad">

        <div class="icon">
          ⚠
        </div>

        <h2>
          Verification Unavailable
        </h2>

        <p>
          ${escapeHtml(
            message ||
            "Verification service error."
          )}
        </p>

      </div>

    `);
  }


  /* =======================================================
     NOT FOUND
     ======================================================= */

  function showNotFound(code) {

    setResult(`

      <div class="panel bad">

        <div class="icon">
          ✖
        </div>

        <h2>
          Certificate Not Found
        </h2>

        <p>
          No certificate matches:
        </p>

        <p>
          <span class="code">
            ${escapeHtml(code)}
          </span>
        </p>

        <p>
          Please check the verification code
          and try again.
        </p>

      </div>

    `);
  }


  /* =======================================================
     ACADEMIC RESULTS
     ======================================================= */

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


    const sorted =
      [...results].sort(
        function (a, b) {

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

          const aIndex =
            SUBJECT_ORDER.indexOf(
              aName
            );

          const bIndex =
            SUBJECT_ORDER.indexOf(
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

          if (aIndex === -1) {
            return 1;
          }

          if (bIndex === -1) {
            return -1;
          }

          return aIndex - bIndex;
        }
      );


    const rows =
      sorted
        .map(
          function (item, index) {

            const score =
              Number(
                item.score || 0
              );

            const maxScore =
              Number(
                item.max_score || 100
              );

            let percentage =
              item.percentage !== null &&
              item.percentage !== undefined
                ? Number(item.percentage)
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
              item.grade ||
              calculateGrade(
                percentage
              );

            return `

              <tr>

                <td>
                  ${index + 1}
                </td>

                <td>
                  <strong>
                    ${escapeHtml(
                      item.subject_name ||
                      "—"
                    )}
                  </strong>
                </td>

                <td>
                  ${escapeHtml(score)}
                </td>

                <td>
                  ${escapeHtml(maxScore)}
                </td>

                <td>
                  ${percentage.toFixed(2)}%
                </td>

                <td>
                  <strong>
                    ${escapeHtml(grade)}
                  </strong>
                </td>

                <td>
                  ${escapeHtml(
                    item.remarks ||
                    "—"
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

                <th>Subject</th>

                <th>Score</th>

                <th>Max</th>

                <th>Percentage</th>

                <th>Grade</th>

                <th>Remarks</th>

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


  /* =======================================================
     ACADEMIC SUMMARY
     ======================================================= */

  function renderAcademicSummary(summary) {

    if (!summary) {
      return "";
    }

    const total =
      Number(
        summary.total_score || 0
      );

    const max =
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
            ${total} / ${max}
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
            ${escapeHtml(grade)}
          </strong>

        </div>


        <div
          class="summary-card ${resultClass}"
        >

          <span>
            Final Result
          </span>

          <strong>
            ${escapeHtml(finalResult)}
          </strong>

        </div>

      </div>

    `;
  }


  /* =======================================================
     CERTIFICATE DISPLAY
     ======================================================= */

  function showCertificate(payload) {

    const certificate =
      payload.certificate || {};

    const student =
      payload.student || {};

    const results =
      payload.academic_results || [];

    const summary =
      payload.summary || {};


    const status =
      String(
        certificate.status ||
        "valid"
      ).toLowerCase();


    const statusInfo =
      STATUS_INFO[status] ||
      STATUS_INFO.valid;


    const certificateGrid = `

      <div class="cert-grid">

        <div class="cert-item">

          <strong>
            Student
          </strong>

          <span>
            ${escapeHtml(
              student.full_name ||
              certificate.student_name ||
              "—"
            )}
          </span>

        </div>


        <div class="cert-item">

          <strong>
            Student ID
          </strong>

          <span>
            ${escapeHtml(
              student.student_id ||
              "—"
            )}
          </span>

        </div>


        <div class="cert-item">

          <strong>
            Certificate No
          </strong>

          <span>
            ${escapeHtml(
              certificate.certificate_no ||
              "—"
            )}
          </span>

        </div>


        <div class="cert-item">

          <strong>
            Certificate ID
          </strong>

          <span>
            ${escapeHtml(
              certificate.certificate_id ||
              "—"
            )}
          </span>

        </div>


        <div class="cert-item">

          <strong>
            Course
          </strong>

          <span>
            ${escapeHtml(
              certificate.course_name ||
              "—"
            )}
          </span>

        </div>


        <div class="cert-item">

          <strong>
            Certificate Type
          </strong>

          <span>
            ${escapeHtml(
              certificate.certificate_type ||
              "—"
            )}
          </span>

        </div>


        <div class="cert-item">

          <strong>
            Issue Date
          </strong>

          <span>
            ${formatDate(
              certificate.issue_date
            )}
          </span>

        </div>


        <div class="cert-item">

          <strong>
            Expiry Date
          </strong>

          <span>
            ${formatDate(
              certificate.expiry_date
            )}
          </span>

        </div>


        <div class="cert-item">

          <strong>
            Verify Code
          </strong>

          <span class="code">
            ${escapeHtml(
              certificate.verify_code ||
              "—"
            )}
          </span>

        </div>

      </div>

    `;


    setResult(`

      <div class="panel ${statusInfo.className}">

        <div class="icon">
          ${statusInfo.icon}
        </div>

        <h2>
          ${statusInfo.title}
        </h2>

        <div
          class="badge ${statusInfo.className}"
        >
          ${statusInfo.label}
        </div>

      </div>


      ${certificateGrid}


      ${renderAcademicResults(results)}


      ${renderAcademicSummary(summary)}


      <div class="footnote">

        This verification result is generated
        directly from the GAAWOW Academy
        Education Management System.

      </div>

    `);
  }


  /* =======================================================
     VERIFY FUNCTION
     ======================================================= */

  async function verifyCertificate(code) {

    const normalized =
      normalizeVerifyCode(code);


    if (!normalized) {

      setResult(`

        <div class="panel neutral">

          <div class="icon">
            🔍
          </div>

          <h2>
            Enter a Verify Code
          </h2>

          <p>
            Please enter the certificate
            verification code.
          </p>

        </div>

      `);

      return;
    }


    showLoading();


    try {

      console.log(
        "Verifying certificate:",
        normalized
      );


      const response =
        await supabaseClient.rpc(
          "verify_certificate_with_results",
          {
            p_verify_code:
              normalized
          }
        );


      console.log(
        "Verification response:",
        response
      );


      if (response.error) {

        console.error(
          "RPC error:",
          response.error
        );

        showError(
          response.error.message ||
          "Verification service error."
        );

        return;
      }


      const data =
        response.data;


      if (!data) {

        showNotFound(
          normalized
        );

        return;
      }


      if (
        data.success === false
      ) {

        showNotFound(
          normalized
        );

        return;
      }


      if (
        !data.certificate
      ) {

        showNotFound(
          normalized
        );

        return;
      }


      showCertificate(
        data
      );

    } catch (error) {

      console.error(
        "Verification error:",
        error
      );

      showError(
        error.message ||
        "Unable to verify certificate."
      );
    }
  }


  /* =======================================================
     FORM SUBMIT
     ======================================================= */

  form.addEventListener(
    "submit",
    function (event) {

      event.preventDefault();

      verifyCertificate(
        codeInput.value
      );

    }
  );


  /* =======================================================
     URL CODE AUTO VERIFY
     ======================================================= */

  try {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const urlCode =
      params.get("code");

    if (urlCode) {

      codeInput.value =
        normalizeVerifyCode(
          urlCode
        );

      verifyCertificate(
        codeInput.value
      );

    }

  } catch (error) {

    console.error(
      "URL verification error:",
      error
    );

  }

});
