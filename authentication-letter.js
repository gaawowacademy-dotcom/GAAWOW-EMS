/* ============================================================
   GAAWOW ACADEMY
   AUTHENTICATION LETTER
   FIXED LOADING VERSION
============================================================ */

(() => {

  "use strict";

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


  const $ = (selector) =>
    document.querySelector(selector);


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


  function formatDate(value) {

    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return "N/A";
    }

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }
    ).format(d);

  }


  function normalizeType(value) {

    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

  }


  function setText(selector, value) {

    const element = $(selector);

    if (!element) return;

    element.textContent =
      firstAvailable(value, "N/A");

  }


  function showPage() {

    const loading = $("#loading");
    const error = $("#errorState");
    const page = $("#authenticationLetter");

    if (loading) {
      loading.hidden = true;
      loading.style.display = "none";
    }

    if (error) {
      error.hidden = true;
      error.style.display = "none";
    }

    if (page) {
      page.hidden = false;
      page.style.display = "block";
    }

  }


  function showError(message, details = "") {

    const loading = $("#loading");
    const error = $("#errorState");
    const messageBox = $("#errorMessage");
    const detailsBox = $("#errorDetails");

    if (loading) {
      loading.hidden = true;
      loading.style.display = "none";
    }

    if (error) {
      error.hidden = false;
      error.style.display = "flex";
    }

    if (messageBox) {
      messageBox.textContent = message;
    }

    if (detailsBox) {
      detailsBox.textContent = details;
    }

  }


  function getParams() {

    const params =
      new URLSearchParams(
        window.location.search
      );

    return {

      regen:
        params.get("regen"),

      id:
        params.get("id"),

      record_id:
        params.get("record_id"),

      code:
        params.get("code")

    };

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
     FETCH RECORD
  ========================================================== */

  async function getRecord(supabase, params) {

    let result;

    const recordId =
      firstAvailable(
        params.regen,
        params.record_id
      );


    /* --------------------------------------------------------
       SEARCH BY DATABASE UUID
    -------------------------------------------------------- */

    if (recordId) {

      result =
        await supabase
          .from("certificates")
          .select("*")
          .eq("id", recordId)
          .maybeSingle();

      if (result.error) {
        throw result.error;
      }

      if (result.data) {
        return result.data;
      }

    }


    /* --------------------------------------------------------
       SEARCH BY CERTIFICATE ID
    -------------------------------------------------------- */

    if (params.id) {

      result =
        await supabase
          .from("certificates")
          .select("*")
          .eq(
            "certificate_id",
            params.id
          )
          .maybeSingle();

      if (result.error) {
        throw result.error;
      }

      if (result.data) {
        return result.data;
      }

    }


    /* --------------------------------------------------------
       SEARCH BY VERIFICATION CODE
    -------------------------------------------------------- */

    if (params.code) {

      result =
        await supabase
          .from("certificates")
          .select("*")
          .eq(
            "verify_code",
            params.code
          )
          .maybeSingle();

      if (result.error) {
        throw result.error;
      }

      if (result.data) {
        return result.data;
      }

    }


    throw new Error(
      "Authentication Letter record lama helin."
    );

  }


  /* ==========================================================
     CHECK TYPE
  ========================================================== */

  function checkAuthentication(record) {

    const type =
      normalizeType(
        record.certificate_type
      );


    const id =
      String(
        firstAvailable(
          record.certificate_id,
          record.certificate_no
        ) || ""
      ).toUpperCase();


    return (
      type === "authentication_letter" ||
      type.includes("authentication") ||
      id.startsWith("GAA-AUTH-")
    );

  }


  /* ==========================================================
     RPC
  ========================================================== */

  async function getRPCData(
    supabase,
    record
  ) {

    try {

      const code =
        firstAvailable(
          record.verify_code,
          record.verification_code
        );


      const authId =
        firstAvailable(
          record.certificate_id,
          record.authentication_id
        );


      if (!code) {
        return null;
      }


      const response =
        await supabase.rpc(
          "verify_authentication_letter",
          {
            p_code: code,
            p_id: authId || null
          }
        );


      if (response.error) {

        console.warn(
          "RPC warning:",
          response.error
        );

        return null;

      }


      if (Array.isArray(response.data)) {

        return response.data[0] || null;

      }


      return response.data || null;

    } catch (error) {

      console.warn(
        "RPC failed:",
        error
      );

      return null;

    }

  }


  /* ==========================================================
     STUDENT
  ========================================================== */

  async function getStudent(
    supabase,
    record
  ) {

    if (!record.student_id) {
      return null;
    }


    try {

      const response =
        await supabase
          .from("students")
          .select("*")
          .eq(
            "id",
            record.student_id
          )
          .maybeSingle();


      if (response.error) {
        return null;
      }


      return response.data || null;

    } catch {

      return null;

    }

  }


  /* ==========================================================
     RENDER STUDENT
  ========================================================== */

  function renderStudent(
    record,
    rpc,
    student
  ) {

    const studentName =
      firstAvailable(

        rpc?.student_name,

        record.student_name_snapshot,

        student?.full_name,

        student?.student_name,

        student?.name

      );


    const courseName =
      firstAvailable(

        rpc?.course_name,

        record.course_name_snapshot,

        record.course_name,

        student?.course_name,

        student?.program_name

      );


    /*
      IMPORTANT:
      ONLY real Authentication Letter dates.
    */

    const dateStarted =
      firstAvailable(

        rpc?.date_started,

        record.date_started

      );


    const dateCompleted =
      firstAvailable(

        rpc?.date_completed,

        record.date_completed

      );


    setText(
      "#studentName",
      studentName
    );


    setText(
      "#courseName",
      courseName
    );


    setText(
      "#dateStarted",
      formatDate(dateStarted)
    );


    setText(
      "#dateCompleted",
      formatDate(dateCompleted)
    );


    setText(
      "#startDate",
      formatDate(dateStarted)
    );


    setText(
      "#completionDate",
      formatDate(dateCompleted)
    );


    /* PHOTO */

    const photo =
      firstAvailable(

        rpc?.student_photo_url,

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
        photo;

      photoElement.style.display =
        "block";


      if (placeholder) {
        placeholder.style.display =
          "none";
      }

    }

  }


  /* ==========================================================
     RENDER AUTH INFO
  ========================================================== */

  function renderAuth(
    record,
    rpc
  ) {

    setText(
      "#referenceNo",

      firstAvailable(

        rpc?.reference_no,

        record.certificate_no,

        record.reference_no

      )
    );


    setText(
      "#authenticationId",

      firstAvailable(

        rpc?.authentication_id,

        record.certificate_id,

        record.authentication_id

      )
    );


    setText(
      "#verificationCode",

      firstAvailable(

        rpc?.verification_code,

        record.verify_code,

        record.verification_code

      )
    );

  }


  /* ==========================================================
     STATUS
  ========================================================== */

  function renderStatus(
    record,
    rpc
  ) {

    const status =
      firstAvailable(
        rpc?.status,
        record.status,
        "valid"
      );


    const element =
      $("#status");


    if (!element) return;


    element.textContent =
      String(status)
        .toUpperCase();


    element.className =
      "status-badge";


    const normalized =
      String(status)
        .toLowerCase();


    if (
      normalized === "expired"
    ) {

      element.classList.add(
        "expired"
      );

    }


    if (
      normalized === "revoked" ||
      normalized === "invalid"
    ) {

      element.classList.add(
        "invalid"
      );

    }

  }


  /* ==========================================================
     DATES
  ========================================================== */

  function renderDates(
    record,
    rpc
  ) {

    setText(
      "#issueDate",

      formatDate(
        firstAvailable(
          rpc?.issue_date,
          record.issue_date
        )
      )
    );


    setText(
      "#expiryDate",

      formatDate(
        firstAvailable(
          rpc?.expiry_date,
          record.expiry_date
        )
      )
    );

  }


  /* ==========================================================
     QR
  ========================================================== */

  function renderQR(
    record,
    rpc
  ) {

    const container =
      $("#qrcode");


    if (!container) return;


    container.innerHTML = "";


    if (
      typeof window.QRCode === "undefined"
    ) {

      container.innerHTML =
        "<small>QR unavailable</small>";

      return;

    }


    const code =
      firstAvailable(
        rpc?.verification_code,
        record.verify_code
      );


    const authId =
      firstAvailable(
        rpc?.authentication_id,
        record.certificate_id
      );


    let verificationURL =
      firstAvailable(
        rpc?.verification_url,
        record.verification_url
      );


    if (!verificationURL) {

      verificationURL =
        window.location.origin +
        "/GAAWOW-EMS/verify-auth.html" +
        "?code=" +
        encodeURIComponent(
          code || ""
        ) +
        "&id=" +
        encodeURIComponent(
          authId || ""
        );

    }


    new QRCode(
      container,
      {
        text: verificationURL,
        width: 116,
        height: 116
      }
    );

  }


  /* ==========================================================
     ACADEMIC RESULTS
     IMPORTANT:
     Results failure NEVER blocks document.
  ========================================================== */

  async function renderResults(
    supabase,
    record
  ) {

    const container =
      $("#academicResults");


    if (!container) return;


    if (!record.student_id) {

      container.innerHTML = `
        <div class="results-empty">
          No published academic results available.
        </div>
      `;

      return;

    }


    try {

      const response =
        await supabase
          .from("results")
          .select("*")
          .eq(
            "student_id",
            record.student_id
          )
          .eq(
            "is_published",
            true
          );


      if (
        response.error
      ) {

        throw response.error;

      }


      const rows =
        response.data || [];


      if (!rows.length) {

        container.innerHTML = `
          <div class="results-empty">
            No published academic results available.
          </div>
        `;

        return;

      }


      let subjects = [];


      const ids =
        [
          ...new Set(
            rows
              .map(
                r => r.subject_id
              )
              .filter(Boolean)
          )
        ];


      if (ids.length) {

        try {

          const subjectResponse =
            await supabase
              .from("subjects")
              .select("*")
              .in(
                "id",
                ids
              );


          if (
            !subjectResponse.error
          ) {

            subjects =
              subjectResponse.data || [];

          }

        } catch {

          subjects = [];

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


      const data =
        rows.map(
          row => {

            const subject =
              subjectMap.get(
                String(
                  row.subject_id
                )
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


      const html =
        data.map(
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
        ).join("");


      container.innerHTML = `

        <table class="results-table">

          <thead>

            <tr>

              <th>#</th>

              <th>SUBJECT</th>

              <th>SCORE</th>

              <th>GRADE</th>

            </tr>

          </thead>

          <tbody>

            ${html}

          </tbody>

        </table>

      `;

    } catch (error) {

      console.warn(
        "Results unavailable:",
        error
      );


      container.innerHTML = `

        <div class="results-empty">
          Academic results are not available.
        </div>

      `;

    }

  }


  function escapeHTML(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  /* ==========================================================
     REMOVE LOCATION
  ========================================================== */

  function removeLocation() {

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
            element =>
              element.remove()
          );

      }
    );

  }


  /* ==========================================================
     PRINT
  ========================================================== */

  function setupPrint() {

    const button =
      $("#printButton");


    if (!button) return;


    button.onclick =
      () => window.print();

  }


  /* ==========================================================
     MAIN
  ========================================================== */

  async function start() {

    console.log(
      "GAAWOW Authentication Letter: START"
    );


    try {

      const supabase =
        getSupabase();


      console.log(
        "Supabase initialized"
      );


      const params =
        getParams();


      console.log(
        "URL parameters:",
        params
      );


      if (
        !params.regen &&
        !params.id &&
        !params.record_id &&
        !params.code
      ) {

        throw new Error(
          "URL-ga record ID ama verification code ma laha."
        );

      }


      console.log(
        "Fetching certificate..."
      );


      const record =
        await getRecord(
          supabase,
          params
        );


      console.log(
        "Certificate record:",
        record
      );


      if (
        !checkAuthentication(record)
      ) {

        throw new Error(
          "Record-kan ma aha Authentication Letter."
        );

      }


      /*
        SHOW THE DOCUMENT NOW.

        RPC/results must NOT block page.
      */

      showPage();


      /* ------------------------------------------------------
         Render immediately from certificate row
      ------------------------------------------------------ */

      renderStudent(
        record,
        null,
        null
      );


      renderAuth(
        record,
        null
      );


      renderStatus(
        record,
        null
      );


      renderDates(
        record,
        null
      );


      renderQR(
        record,
        null
      );


      removeLocation();


      /* ------------------------------------------------------
         Load additional data in background
      ------------------------------------------------------ */

      const rpc =
        await getRPCData(
          supabase,
          record
        );


      const student =
        await getStudent(
          supabase,
          record
        );


      renderStudent(
        record,
        rpc,
        student
      );


      renderAuth(
        record,
        rpc
      );


      renderStatus(
        record,
        rpc
      );


      renderDates(
        record,
        rpc
      );


      renderQR(
        record,
        rpc
      );


      /*
        Academic results are optional.
        They can never keep the document loading.
      */

      await renderResults(
        supabase,
        record
      );


      removeLocation();


      console.log(
        "GAAWOW Authentication Letter: COMPLETE"
      );

    } catch (error) {

      console.error(
        "GAAWOW Authentication Letter ERROR:",
        error
      );


      showError(
        error?.message ||
          "Authentication Letter lama soo bandhigi karin.",

        error?.stack ||
          ""
      );

    }

  }


  /* ==========================================================
     INIT
  ========================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      setupPrint();

      start();

    }
  );

})();
