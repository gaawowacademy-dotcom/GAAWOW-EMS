/* ============================================================
   GAAWOW ACADEMY
   AUTHENTICATION LETTER JS
   Version: 20261001-4
============================================================ */

(() => {

  "use strict";


  /* ==========================================================
     CONFIG
  ========================================================== */

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


  const MSG = {

    noRecord:
      "Record-ka Authentication Letter lama helin.",

    notAuth:
      "Record-kan ma aha Authentication Letter.",

    connection:
      "Waxaa cilad ka jirta xiriirka Supabase.",

    invalid:
      "Authentication Letter-ka lama xaqiijin karo."

  };


  /* ==========================================================
     HELPERS
  ========================================================== */

  const $ = (selector) =>
    document.querySelector(selector);


  function text(selector, value) {

    const element = $(selector);

    if (!element) return;

    element.textContent =
      value === null ||
      value === undefined ||
      String(value).trim() === ""
        ? "N/A"
        : String(value);
  }


  function firstAvailable(...values) {

    for (const value of values) {

      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {

        return value;

      }

    }

    return null;
  }


  function escapeHTML(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  function normalizeType(value) {

    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

  }


  function formatDate(value) {

    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {

      return "N/A";

    }


    const raw =
      String(value).trim();


    const date =
      new Date(raw);


    if (
      Number.isNaN(date.getTime())
    ) {

      return raw;

    }


    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }
    ).format(date);

  }


  function withTimeout(
    promise,
    milliseconds = 15000
  ) {

    return Promise.race([

      promise,

      new Promise((_, reject) => {

        setTimeout(() => {

          reject(
            new Error(
              "Request timed out."
            )
          );

        }, milliseconds);

      })

    ]);

  }


  function getSupabase() {

    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ) {

      throw new Error(
        "Supabase library lama soo dejin."
      );

    }


    return window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

  }


  /* ==========================================================
     URL PARAMETERS
  ========================================================== */

  function getParameters() {

    const params =
      new URLSearchParams(
        window.location.search
      );


    return {

      regen:
        params.get("regen"),

      id:
        params.get("id"),

      recordId:
        params.get("record_id"),

      code:
        params.get("code")

    };

  }


  /* ==========================================================
     AUTHENTICATION TYPE CHECK
  ========================================================== */

  function isAuthenticationLetter(record) {

    if (!record) return false;


    const type =
      normalizeType(
        record.certificate_type
      );


    if (
      type === "authentication_letter"
    ) {

      return true;

    }


    if (
      type.includes("authentication")
    ) {

      return true;

    }


    const certificateId =
      String(
        firstAvailable(
          record.certificate_id,
          record.certificate_no
        ) || ""
      ).toUpperCase();


    if (
      certificateId.startsWith("GAA-AUTH-")
    ) {

      return true;

    }


    return false;

  }


  /* ==========================================================
     FETCH RECORD
  ========================================================== */

  async function fetchAuthenticationRecord(
    supabase,
    params
  ) {

    let record = null;


    /* --------------------------------------------------------
       1. RECORD UUID
    -------------------------------------------------------- */

    if (
      params.regen ||
      params.id ||
      params.recordId
    ) {

      const id =
        firstAvailable(
          params.regen,
          params.id,
          params.recordId
        );


      const result =
        await withTimeout(

          supabase
            .from("certificates")
            .select("*")
            .eq("id", id)
            .maybeSingle()

        );


      if (result.error) {

        throw result.error;

      }


      record =
        result.data || null;

    }


    /* --------------------------------------------------------
       2. CERTIFICATE ID
    -------------------------------------------------------- */

    if (
      !record &&
      params.id
    ) {

      const result =
        await withTimeout(

          supabase
            .from("certificates")
            .select("*")
            .eq("certificate_id", params.id)
            .maybeSingle()

        );


      if (result.error) {

        throw result.error;

      }


      record =
        result.data || null;

    }


    /* --------------------------------------------------------
       3. VERIFICATION CODE
    -------------------------------------------------------- */

    if (
      !record &&
      params.code
    ) {

      const result =
        await withTimeout(

          supabase
            .from("certificates")
            .select("*")
            .eq("verify_code", params.code)
            .maybeSingle()

        );


      if (result.error) {

        throw result.error;

      }


      record =
        result.data || null;

    }


    if (!record) {

      throw new Error(
        MSG.noRecord
      );

    }


    if (
      !isAuthenticationLetter(record)
    ) {

      throw new Error(
        MSG.notAuth
      );

    }


    return record;

  }


  /* ==========================================================
     RPC EXTRA DATA
  ========================================================== */

  async function loadAuthenticationExtras(
    supabase,
    record
  ) {

    const code =
      firstAvailable(
        record.verify_code,
        record.verification_code
      );


    const authenticationId =
      firstAvailable(
        record.certificate_id,
        record.authentication_id
      );


    if (!code) {

      return {
        data: null,
        error: null
      };

    }


    const result =
      await withTimeout(

        supabase.rpc(
          "verify_authentication_letter",
          {
            p_code: code,
            p_id:
              authenticationId || null
          }
        )

      );


    return result;

  }


  /* ==========================================================
     STUDENT FALLBACK
  ========================================================== */

  async function loadStudentFallback(
    supabase,
    record
  ) {

    if (!record.student_id) {

      return null;

    }


    try {

      const result =
        await withTimeout(

          supabase
            .from("students")
            .select("*")
            .eq(
              "id",
              record.student_id
            )
            .maybeSingle()

        );


      if (result.error) {

        return null;

      }


      return result.data || null;

    } catch {

      return null;

    }

  }


  /* ==========================================================
     STUDENT INFORMATION
  ========================================================== */

  function renderStudentInformation(
    record,
    extras,
    student
  ) {

    const data =
      extras || {};


    const studentName =
      firstAvailable(

        data.student_name,

        record.student_name_snapshot,

        student?.full_name,

        student?.student_name,

        student?.name

      );


    const courseName =
      firstAvailable(

        data.course_name,

        record.course_name_snapshot,

        record.course_name,

        student?.course_name,

        student?.program_name

      );


    /* --------------------------------------------------------
       IMPORTANT DATE LOGIC

       Only use actual authentication dates.
       Do NOT use admission/enrollment dates automatically.
    -------------------------------------------------------- */

    const dateStarted =
      firstAvailable(

        data.date_started,

        record.date_started

      );


    const dateCompleted =
      firstAvailable(

        data.date_completed,

        record.date_completed

      );


    text(
      "#studentName",
      studentName || "N/A"
    );


    text(
      "#courseName",
      courseName || "N/A"
    );


    text(
      "#dateStarted",
      formatDate(dateStarted)
    );


    text(
      "#dateCompleted",
      formatDate(dateCompleted)
    );


    text(
      "#startDate",
      formatDate(dateStarted)
    );


    text(
      "#completionDate",
      formatDate(dateCompleted)
    );


    /* --------------------------------------------------------
       PHOTO
    -------------------------------------------------------- */

    const photo =
      firstAvailable(

        data.student_photo_url,

        record.student_photo_url,

        student?.student_photo_url,

        student?.photo_url,

        student?.photo

      );


    const photoElement =
      $("#studentPhoto");


    const placeholder =
      $("#photoPlaceholder");


    if (
      photoElement &&
      photo
    ) {

      photoElement.src =
        String(photo);

      photoElement.style.display =
        "block";


      if (placeholder) {

        placeholder.style.display =
          "none";

      }

    } else {

      if (photoElement) {

        photoElement.style.display =
          "none";

      }


      if (placeholder) {

        placeholder.style.display =
          "flex";

      }

    }

  }


  /* ==========================================================
     AUTHENTICATION INFORMATION
  ========================================================== */

  function renderAuthenticationInformation(
    record,
    extras
  ) {

    const data =
      extras || {};


    const referenceNo =
      firstAvailable(

        data.reference_no,

        record.certificate_no,

        record.reference_no

      );


    const authenticationId =
      firstAvailable(

        data.authentication_id,

        record.certificate_id,

        record.authentication_id

      );


    const verificationCode =
      firstAvailable(

        data.verification_code,

        record.verify_code,

        record.verification_code

      );


    text(
      "#referenceNo",
      referenceNo || "N/A"
    );


    text(
      "#authenticationId",
      authenticationId || "N/A"
    );


    text(
      "#verificationCode",
      verificationCode || "N/A"
    );

  }


  /* ==========================================================
     STATUS
  ========================================================== */

  function renderStatus(
    record,
    extras
  ) {

    const status =
      firstAvailable(

        extras?.status,

        record.status,

        "valid"

      );


    const element =
      $("#status");


    if (!element) return;


    const cleanStatus =
      String(status)
        .trim()
        .toUpperCase();


    element.textContent =
      cleanStatus;


    element.classList.remove(
      "invalid",
      "revoked",
      "expired"
    );


    const normalized =
      cleanStatus.toLowerCase();


    if (
      normalized === "revoked" ||
      normalized === "invalid"
    ) {

      element.classList.add(
        "invalid"
      );

    }


    if (
      normalized === "expired"
    ) {

      element.classList.add(
        "expired"
      );

    }

  }


  /* ==========================================================
     ISSUE / EXPIRY DATES
  ========================================================== */

  function renderIssueDates(
    record,
    extras
  ) {

    const issueDate =
      firstAvailable(

        extras?.issue_date,

        record.issue_date

      );


    const expiryDate =
      firstAvailable(

        extras?.expiry_date,

        record.expiry_date

      );


    text(
      "#issueDate",
      formatDate(issueDate)
    );


    text(
      "#expiryDate",
      formatDate(expiryDate)
    );

  }


  /* ==========================================================
     QR CODE
  ========================================================== */

  function renderQRCode(
    record,
    extras
  ) {

    const container =
      $("#qrcode");


    if (!container) return;


    container.innerHTML = "";


    const verificationUrl =
      firstAvailable(

        extras?.verification_url,

        record.verification_url

      );


    const code =
      firstAvailable(

        extras?.verification_code,

        record.verify_code

      );


    const authenticationId =
      firstAvailable(

        extras?.authentication_id,

        record.certificate_id

      );


    let url =
      verificationUrl;


    if (!url) {

      const current =
        window.location.origin +
        window.location.pathname
          .replace(
            "authentication-letter.html",
            "verify-auth.html"
          );


      const params =
        new URLSearchParams();


      if (code) {

        params.set(
          "code",
          code
        );

      }


      if (authenticationId) {

        params.set(
          "id",
          authenticationId
        );

      }


      url =
        `${current}?${params.toString()}`;

    }


    if (
      typeof window.QRCode === "undefined"
    ) {

      container.textContent =
        "QR unavailable";

      return;

    }


    new window.QRCode(
      container,
      {
        text: url,
        width: 116,
        height: 116,
        correctLevel:
          window.QRCode.CorrectLevel.M
      }
    );

  }


  /* ==========================================================
     ACADEMIC RESULTS
  ========================================================== */

  async function loadAcademicResults(
    supabase,
    record
  ) {

    const container =
      $("#academicResults");


    if (!container) {

      return;

    }


    if (!record.student_id) {

      container.innerHTML = `
        <div class="results-empty">
          No academic results available.
        </div>
      `;

      return;

    }


    try {

      const result =
        await withTimeout(

          supabase
            .from("results")
            .select("*")
            .eq(
              "student_id",
              record.student_id
            )
            .eq(
              "is_published",
              true
            )
            .order(
              "created_at",
              {
                ascending: true
              }
            )

        );


      if (result.error) {

        throw result.error;

      }


      const rows =
        Array.isArray(result.data)
          ? result.data
          : [];


      if (!rows.length) {

        container.innerHTML = `
          <div class="results-empty">
            No published academic results available.
          </div>
        `;

        return;

      }


      const subjectIds =
        [
          ...new Set(
            rows
              .map(
                row =>
                  row.subject_id
              )
              .filter(Boolean)
          )
        ];


      let subjects = [];


      if (subjectIds.length) {

        const subjectResult =
          await withTimeout(

            supabase
              .from("subjects")
              .select("*")
              .in(
                "id",
                subjectIds
              )

          );


        if (
          !subjectResult.error
        ) {

          subjects =
            subjectResult.data || [];

        }

      }


      const subjectMap =
        new Map();


      subjects.forEach(
        subject => {

          subjectMap.set(
            String(subject.id),
            subject
          );

        }
      );


      const normalizedRows =
        rows.map(
          row => {

            const subject =
              subjectMap.get(
                String(row.subject_id)
              );


            return {

              subject:
                firstAvailable(

                  row.subject_name,

                  row.name,

                  subject?.name,

                  subject?.subject_name,

                  "N/A"

                ),

              score:
                firstAvailable(

                  row.score,

                  row.marks,

                  row.mark,

                  row.final_score

                ),

              grade:
                firstAvailable(

                  row.grade,

                  row.letter_grade

                )

            };

          }
        );


      let total = 0;

      let hasNumericScore = false;


      normalizedRows.forEach(
        row => {

          const number =
            Number(row.score);


          if (
            Number.isFinite(number)
          ) {

            total += number;

            hasNumericScore = true;

          }

        }
      );


      const body =
        normalizedRows
          .map(
            (row, index) => `

              <tr>

                <td>
                  ${index + 1}
                </td>

                <td>
                  ${escapeHTML(
                    row.subject
                  )}
                </td>

                <td class="score">
                  ${escapeHTML(
                    row.score ?? "N/A"
                  )}
                </td>

                <td class="grade">
                  ${escapeHTML(
                    row.grade ?? "N/A"
                  )}
                </td>

              </tr>

            `
          )
          .join("");


      container.innerHTML = `

        <table class="results-table">

          <thead>

            <tr>

              <th style="width:8%">
                #
              </th>

              <th>
                SUBJECT
              </th>

              <th style="width:18%">
                SCORE
              </th>

              <th style="width:18%">
                GRADE
              </th>

            </tr>

          </thead>

          <tbody>

            ${body}

          </tbody>

        </table>

        ${
          hasNumericScore
            ? `
              <div class="results-total">

                <span>
                  TOTAL SCORE
                </span>

                <strong>
                  ${total}
                </strong>

              </div>
            `
            : ""
        }

      `;

    } catch (error) {

      console.warn(
        "Academic results:",
        error
      );


      container.innerHTML = `

        <div class="results-empty">

          Academic results are not available
          for this authentication record.

        </div>

      `;

    }

  }


  /* ==========================================================
     REMOVE FOUNDER LOCATION
  ========================================================== */

  function removeFounderLocation() {

    const selectors = [

      ".founder-location",

      ".g-founder-location",

      ".scc-location",

      "#founderLocation",

      "#gFounderLocation",

      "#g-founder-location",

      "#sccLocation",

      "#scc-location",

      "[data-field='founder-location']",

      "[data-field='g-founder-location']",

      "[data-field='scc-location']"

    ];


    selectors.forEach(
      selector => {

        document
          .querySelectorAll(selector)
          .forEach(
            element => {

              element.remove();

            }
          );

      }
    );


    /* --------------------------------------------------------
       Remove common Location: labels if they appear inside
       signature/founder areas.
    -------------------------------------------------------- */

    document
      .querySelectorAll(
        ".signature-section *"
      )
      .forEach(
        element => {

          const value =
            String(
              element.textContent || ""
            ).trim();


          if (
            /^location\s*:/i.test(
              value
            )
          ) {

            element.remove();

          }

        }
      );

  }


  /* ==========================================================
     SHOW DOCUMENT
  ========================================================== */

  function showDocument() {

    const loading =
      $("#loading");


    const errorState =
      $("#errorState");


    const page =
      $("#authenticationLetter");


    if (loading) {

      loading.hidden = true;

    }


    if (errorState) {

      errorState.hidden = true;

    }


    if (page) {

      page.hidden = false;

    }

  }


  /* ==========================================================
     SHOW ERROR
  ========================================================== */

  function showError(error) {

    const loading =
      $("#loading");


    const errorState =
      $("#errorState");


    const message =
      $("#errorMessage");


    const details =
      $("#errorDetails");


    if (loading) {

      loading.hidden = true;

    }


    if (errorState) {

      errorState.hidden = false;

    }


    const cleanMessage =
      error?.message ||
      MSG.invalid;


    if (message) {

      message.textContent =
        cleanMessage;

    }


    if (details) {

      details.textContent =
        error?.stack ||
        cleanMessage;

    }

  }


  /* ==========================================================
     PRINT
  ========================================================== */

  function setupPrint() {

    const button =
      $("#printButton");


    if (!button) return;


    button.addEventListener(
      "click",
      () => {

        window.print();

      }
    );

  }


  /* ==========================================================
     RETRY
  ========================================================== */

  function setupRetry() {

    const button =
      $("#retryButton");


    if (!button) return;


    button.addEventListener(
      "click",
      () => {

        window.location.reload();

      }
    );

  }


  /* ==========================================================
     MAIN LOADER
  ========================================================== */

  async function loadAuthenticationLetter() {

    try {

      const supabase =
        getSupabase();


      const params =
        getParameters();


      if (
        !params.regen &&
        !params.id &&
        !params.recordId &&
        !params.code
      ) {

        throw new Error(
          "Record ID ama verification code lama helin."
        );

      }


      /* ------------------------------------------------------
         FETCH CERTIFICATE RECORD
      ------------------------------------------------------ */

      const record =
        await fetchAuthenticationRecord(
          supabase,
          params
        );


      /* ------------------------------------------------------
         RPC EXTRA DATA
      ------------------------------------------------------ */

      let extras = null;


      try {

        const rpc =
          await loadAuthenticationExtras(
            supabase,
            record
          );


        if (
          !rpc.error &&
          rpc.data
        ) {

          extras =
            Array.isArray(rpc.data)
              ? rpc.data[0] || null
              : rpc.data;

        }

      } catch (rpcError) {

        console.warn(
          "Authentication RPC:",
          rpcError
        );

      }


      /* ------------------------------------------------------
         STUDENT FALLBACK
      ------------------------------------------------------ */

      const student =
        await loadStudentFallback(
          supabase,
          record
        );


      /* ------------------------------------------------------
         RENDER
      ------------------------------------------------------ */

      renderStudentInformation(
        record,
        extras,
        student
      );


      renderAuthenticationInformation(
        record,
        extras
      );


      renderStatus(
        record,
        extras
      );


      renderIssueDates(
        record,
        extras
      );


      renderQRCode(
        record,
        extras
      );


      await loadAcademicResults(
        supabase,
        record
      );


      removeFounderLocation();


      showDocument();

    } catch (error) {

      console.error(
        "Authentication Letter Error:",
        error
      );


      showError(error);

    }

  }


  /* ==========================================================
     INIT
  ========================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      setupPrint();

      setupRetry();

      loadAuthenticationLetter();

    }
  );

})();
