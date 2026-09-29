/* ============================================================
   GAAWOW EMS
   PUBLIC CERTIFICATE VERIFICATION
   + ACADEMIC RESULTS
   VERSION 102
   ============================================================ */

(() => {

  "use strict";


  /* ==========================================================
     SUPABASE
     ========================================================== */

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


  if (!window.supabase) {

    console.error(
      "Supabase library was not loaded."
    );

    return;
  }


  const supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );


  /* ==========================================================
     DOM
     ========================================================== */

  const $ = (id) =>
    document.getElementById(id);


  /* ==========================================================
     STATUS
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
     SUBJECT ORDER
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
     DATE
     ========================================================== */

  function formatDate(value) {

    if (!value) {
      return "—";
    }

    const raw =
      String(value).trim();

    const date =
      new Date(
        `${raw}T00:00:00`
      );

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


  /* ==========================================================
     NORMALIZE VERIFY CODE

     Accepts:

     GAW-2026-V8AN5Q2F

     OR:

     https://.../verify.html?code=GAW-2026-V8AN5Q2F

     OR:

     verify.html?code=GAW-2026-V8AN5Q2F
     ========================================================== */

  function normalizeVerifyCode(value) {

    let raw =
      String(value || "").trim();


    if (!raw) {
      return "";
    }


    /*
     * Remove accidental surrounding quotes.
     */

    raw =
      raw.replace(
        /^["']|["']$/g,
        ""
      ).trim();


    /*
     * Full URL
     */

    try {

      const parsed =
        new URL(raw);

      const code =
        parsed.searchParams.get(
          "code"
        );

      if (code) {

        return decodeURIComponent(
          code
        )
        .trim()
        .toUpperCase();

      }

    } catch (_) {

      /*
       * It is not a complete URL.
       */

    }


    /*
     * Partial URL containing code=
     */

    const lower =
      raw.toLowerCase();

    const marker =
      "code=";

    const position =
      lower.indexOf(marker);


    if (position !== -1) {

      let extracted =
        raw.substring(
          position +
          marker.length
        );


      extracted =
        extracted.split("&")[0];


      try {

        extracted =
          decodeURIComponent(
            extracted
          );

      } catch (_) {}


      if (
        extracted.trim()
      ) {

        return extracted
          .trim()
          .toUpperCase();

      }
    }


    /*
     * Normal code
     */

    return raw.toUpperCase();
  }


  /* ==========================================================
     READ CODE FROM PAGE URL
     ========================================================== */

  function codeFromUrl() {

    try {

      const params =
        new URLSearchParams(
          window.location.search
        );


      const raw =
        params.get("code") || "";


      return normalizeVerifyCode(
        raw
      );

    } catch (_) {

      return "";
    }
  }


  /* ==========================================================
     WRITE RESULT
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
     EMPTY
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
          certificate, or enter the verification
          code below.
        </p>

      </div>

    `);
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
     NOT FOUND
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
            ${escapeHtml(
              code || "(empty)"
            )}
          </span>.
        </p>

        <p>
          Check the QR code or verification
          code and try again.
        </p>

      </div>

    `);
  }


  /* ==========================================================
     SERVER ERROR
     ========================================================== */

  function showBlocked(message) {

    setResultView(`

      <div class="panel bad">

        <div class="icon">
          ⚠
        </div>

        <h2>
          Verification Unavailable
        </h2>

        <p>
          The certificate database could not
          be reached right now.
        </p>

        <p class="tech">
          ${escapeHtml(
            message ||
            "Unknown verification error."
          )}
        </p>

      </div>

    `);
  }


  /* ==========================================================
     GRADE
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
                    result.remarks ||
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
     SUMMARY
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


        <div class="
          summary-card
          ${resultClass}
        ">

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
     CERTIFICATE
     ========================================================== */

  function showCertificate(payload) {

    const cert =
      payload.certificate ||
      {};


    const student =
      payload.student ||
      {};


    const academicResults =
      Array.isArray(
        payload.academic_results
      )
        ? payload.academic_results
        : [];


    const summary =
      payload.summary ||
      {};


    const statusKey =
      String(
        cert.status ||
        "valid"
      ).toLowerCase();


    const info =
      STATUS_INFO[
        statusKey
      ] ||
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

            <strong>
              Student Name
            </strong>

            <span>
              ${escapeHtml(
                studentName
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
              Course / Program
            </strong>

            <span>
              ${escapeHtml(
                courseName
              )}
            </span>

          </div>


          <div class="cert-item">

            <strong>
              Certificate No
            </strong>

            <span>
              ${escapeHtml(
                cert.certificate_no ||
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
                cert.certificate_id ||
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
                cert.certificate_type ||
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
                cert.issue_date
              )}
            </span>

          </div>


          <div class="cert-item">

            <strong>
              Expiry Date
            </strong>

            <span>
              ${formatDate(
                cert.expiry_date
              )}
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

          Issued by GAAWOW Academy
          • Verify Code

          <span class="code">

            ${escapeHtml(
              cert.verify_code ||
              ""
            )}

          </span>

        </p>


      </div>

    `);
  }


  /* ==========================================================
     URL UPDATE
     ========================================================== */

  function updateBrowserUrl(code) {

    try {

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


      /*
       * replaceState does NOT reload the page.
       */

      window.history.replaceState(
        {
          verifyCode: code
        },
        "",
        url.pathname +
        url.search +
        url.hash
      );


    } catch (error) {

      console.warn(
        "Could not update browser URL:",
        error
      );

    }
  }


  /* ==========================================================
     VERIFY
     ========================================================== */

  async function verify(inputValue) {

    const code =
      normalizeVerifyCode(
        inputValue
      );


    if (!code) {

      showEmptyCode();

      return;
    }


    const input =
      $("codeInput");


    if (input) {

      input.value =
        code;

    }


    /*
     * Keep code in browser URL.
     * This makes refresh safe.
     */

    updateBrowserUrl(
      code
    );


    showLoading();


    try {

      const {
        data,
        error
      } =
        await supabaseClient.rpc(

          "verify_certificate_with_results",

          {
            p_verify_code:
              code
          }

        );


      if (error) {

        console.error(
          "Supabase RPC error:",
          error
        );

        throw error;
      }


      if (!data) {

        showNotFound(
          code
        );

        return;
      }


      if (
        data.success === false
      ) {

        const message =
          String(
            data.message ||
            ""
          );


        if (
          message
            .toLowerCase()
            .includes(
              "not found"
            )
        ) {

          showNotFound(
            code
          );

        } else {

          showBlocked(
            message ||
            "Verification failed."
          );
        }

        return;
      }


      if (
        !data.certificate
      ) {

        showNotFound(
          code
        );

        return;
      }


      showCertificate(
        data
      );


    } catch (error) {

      console.error(
        "Certificate verification error:",
        error
      );


      showBlocked(

        error &&
        error.message

          ? error.message

          : String(
              error ||
              "Unknown error"
            )

      );

    }

  }


  /* ==========================================================
     FORM
     ========================================================== */

  function setupForm() {

    const form =
      $("verifyForm");


    const input =
      $("codeInput");


    if (
      !form ||
      !input
    ) {

      console.error(
        "Verification form not found."
      );

      return;
    }


    form.addEventListener(
      "submit",
      (event) => {

        event.preventDefault();


        const code =
          normalizeVerifyCode(
            input.value
          );


        if (!code) {

          showEmptyCode();

          return;
        }


        input.value =
          code;


        verify(
          code
        );

      }
    );


    /*
     * If a complete QR URL is pasted,
     * normalize it immediately.
     */

    input.addEventListener(
      "blur",
      () => {

        const value =
          normalizeVerifyCode(
            input.value
          );


        if (value) {

          input.value =
            value;

        }

      }
    );

  }


  /* ==========================================================
     INITIALIZE
     ========================================================== */

  function init() {

    const code =
      codeFromUrl();


    const input =
      $("codeInput");


    if (input) {

      input.value =
        code;

    }


    setupForm();


    /*
     * IMPORTANT:
     * If URL contains ?code=...
     * automatically verify.
     */

    if (code) {

      verify(
        code
      );

    } else {

      showEmptyCode();

    }

  }


  /* ==========================================================
     START
     ========================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once:true
      }
    );

  } else {

    init();

  }


})();
