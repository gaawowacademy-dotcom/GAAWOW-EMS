"use strict";

/* =========================================================
   GAAWOW ACADEMY EMS
   AUTHENTICATION LETTER
   FINAL FRONTEND VERSION
   20261002-1
   ========================================================= */


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


/* =========================================================
   DEFAULT AUTHENTICATION LETTER RECORD
   =========================================================
   Official current record:

   ID:
   6dd8c33c-a815-4e61-a182-27193ea38d60

   Reference:
   CERT-2026-329223

   Authentication ID:
   CERT_GA_2026_329223_2PYJM

   Verification Code:
   GAW-2026-JQ8K3JCF
   ========================================================= */

const CERTIFICATE_RECORD_ID =
  "6dd8c33c-a815-4e61-a182-27193ea38d60";


/* =========================================================
   OFFICIAL VERIFICATION PAGE
   ========================================================= */

const VERIFICATION_PAGE =
  "https://gaawowacademy-dotcom.github.io/GAAWOW-EMS/verify-auth.html";


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
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


function safeText(value) {

  return (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  )
    ? "N/A"
    : String(value);

}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function formatDate(value) {

  if (!value) {
    return "N/A";
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return safeText(value);
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  );

}


function numericScore(value) {

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;

}


function calculateGrade(score) {

  if (score === null) {
    return "N/A";
  }

  if (score >= 80) {
    return "A";
  }

  if (score >= 70) {
    return "B";
  }

  if (score >= 60) {
    return "C";
  }

  if (score >= 50) {
    return "D";
  }

  return "F";

}


/* =========================================================
   PAGE STATE
   ========================================================= */

function showDocument() {

  const loading =
    $("loading");

  const error =
    $("errorState");

  const page =
    $("authenticationLetter");


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

    page.removeAttribute(
      "hidden"
    );

    page.style.display =
      "block";

    page.style.visibility =
      "visible";

    page.style.opacity =
      "1";

  }

}


function showError(
  title,
  details = ""
) {

  console.error(
    "[GAAWOW AUTH LETTER]",
    title,
    details
  );


  const loading =
    $("loading");

  const page =
    $("authenticationLetter");

  const error =
    $("errorState");

  const message =
    $("errorMessage");

  const detail =
    $("errorDetails");


  if (loading) {

    loading.hidden = true;
    loading.style.display = "none";

  }


  if (page) {

    page.hidden = true;
    page.style.display = "none";

  }


  if (message) {
    message.textContent =
      title;
  }


  if (detail) {
    detail.textContent =
      details;
  }


  if (error) {

    error.hidden = false;

    error.removeAttribute(
      "hidden"
    );

    error.style.display =
      "block";

  }

}


/* =========================================================
   URL PARAMETERS
   ========================================================= */

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

    code:
      params.get("code"),

    record_id:
      params.get("record_id")

  };

}


/* =========================================================
   SUPABASE
   ========================================================= */

function getSupabase() {

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {

    throw new Error(
      "Supabase JavaScript library lama soo load-gareyn."
    );

  }


  return window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

}


/* =========================================================
   LOAD CERTIFICATE
   ========================================================= */

async function loadCertificate(
  supabase,
  params
) {

  /*
   * IMPORTANT:
   *
   * Explicit URL parameters have priority.
   *
   * If no URL parameter exists,
   * the official default record is used.
   */


  const explicitRecordId =
    firstAvailable(
      params.regen,
      params.record_id
    );


  /* -------------------------------------------------------
     1. RECORD UUID FROM URL
     ------------------------------------------------------- */

  if (explicitRecordId) {

    const result =
      await supabase
        .from("certificates")
        .select("*")
        .eq(
          "id",
          explicitRecordId
        )
        .limit(1)
        .maybeSingle();


    if (result.error) {
      throw result.error;
    }


    if (result.data) {
      return result.data;
    }

  }


  /* -------------------------------------------------------
     2. CERTIFICATE ID FROM URL
     ------------------------------------------------------- */

  if (params.id) {

    const result =
      await supabase
        .from("certificates")
        .select("*")
        .eq(
          "certificate_id",
          params.id
        )
        .limit(1)
        .maybeSingle();


    if (result.error) {
      throw result.error;
    }


    if (result.data) {
      return result.data;
    }

  }


  /* -------------------------------------------------------
     3. VERIFICATION CODE FROM URL
     ------------------------------------------------------- */

  if (params.code) {

    const result =
      await supabase
        .from("certificates")
        .select("*")
        .eq(
          "verify_code",
          params.code
        )
        .limit(1)
        .maybeSingle();


    if (result.error) {
      throw result.error;
    }


    if (result.data) {
      return result.data;
    }

  }


  /* -------------------------------------------------------
     4. OFFICIAL DEFAULT RECORD
     ------------------------------------------------------- */

  const defaultResult =
    await supabase
      .from("certificates")
      .select("*")
      .eq(
        "id",
        CERTIFICATE_RECORD_ID
      )
      .limit(1)
      .maybeSingle();


  if (defaultResult.error) {
    throw defaultResult.error;
  }


  if (!defaultResult.data) {

    throw new Error(
      "Official Authentication Letter record lama helin."
    );

  }


  return defaultResult.data;

}


/* =========================================================
   AUTHENTICATION TYPE
   ========================================================= */

function isAuthenticationLetter(
  record
) {

  const type =
    String(
      record?.certificate_type || ""
    )
      .trim()
      .toLowerCase();


  const id =
    String(
      record?.certificate_id || ""
    )
      .trim()
      .toUpperCase();


  const number =
    String(
      record?.certificate_no || ""
    )
      .trim()
      .toUpperCase();


  return (

    type ===
      "authentication_letter"

    ||

    type.includes(
      "authentication"
    )

    ||

    id.startsWith(
      "GAA-AUTH-"
    )

    ||

    number.startsWith(
      "GAA-AUTH-"
    )

    ||

    (
      type ===
        "authentication_letter"
    )

  );

}


/* =========================================================
   BUILD OFFICIAL VERIFICATION URL
   ========================================================= */

function buildVerificationURL(
  record
) {

  const verifyCode =
    String(
      record?.verify_code || ""
    ).trim();


  const certificateId =
    String(
      record?.certificate_id || ""
    ).trim();


  if (
    !verifyCode ||
    !certificateId
  ) {

    return null;

  }


  return (
    VERIFICATION_PAGE +
    "?code=" +
    encodeURIComponent(
      verifyCode
    ) +
    "&id=" +
    encodeURIComponent(
      certificateId
    )
  );

}


/* =========================================================
   RENDER BASIC CERTIFICATE
   ========================================================= */

function renderCertificate(
  record
) {

  if ($("studentName")) {

    $("studentName").textContent =
      safeText(
        record.student_name_snapshot
      );

  }


  if ($("courseName")) {

    $("courseName").textContent =
      safeText(
        record.course_name_snapshot
      );

  }


  if ($("referenceNo")) {

    $("referenceNo").textContent =
      safeText(
        record.certificate_no
      );

  }


  if ($("authenticationId")) {

    $("authenticationId").textContent =
      safeText(
        record.certificate_id
      );

  }


  if ($("verificationCode")) {

    $("verificationCode").textContent =
      safeText(
        record.verify_code
      );

  }


  if ($("issueDate")) {

    $("issueDate").textContent =
      formatDate(
        record.issue_date
      );

  }


  if ($("expiryDate")) {

    $("expiryDate").textContent =
      formatDate(
        record.expiry_date
      );

  }


  if ($("status")) {

    $("status").textContent =
      safeText(
        record.status
      ).toUpperCase();

  }


  if ($("dateCompleted")) {

    $("dateCompleted").textContent =
      "N/A";

  }


  if ($("completionDate")) {

    $("completionDate").textContent =
      "N/A";

  }


  /* QR */

  renderQR(
    record
  );

}


/* =========================================================
   LOAD STUDENT
   ========================================================= */

async function loadStudent(
  supabase,
  record
) {

  if (!record?.student_id) {
    return null;
  }


  const result =
    await supabase
      .from("students")
      .select(
        "id,full_name,student_id,admission_date,photo_url"
      )
      .eq(
        "id",
        record.student_id
      )
      .limit(1)
      .maybeSingle();


  if (result.error) {

    console.warn(
      "[AUTH LETTER] Student query:",
      result.error
    );

    return null;

  }


  return (
    result.data ||
    null
  );

}


/* =========================================================
   RENDER STUDENT
   ========================================================= */

function renderStudent(
  student
) {

  if (!student) {
    return;
  }


  if ($("studentName")) {

    $("studentName").textContent =
      firstAvailable(
        student.full_name,
        "N/A"
      );

  }


  /* -------------------------------------------------------
     DATE STARTED
     Official source:
     students.admission_date
     ------------------------------------------------------- */

  if ($("dateStarted")) {

    $("dateStarted").textContent =
      formatDate(
        student.admission_date
      );

  }


  if ($("startDate")) {

    $("startDate").textContent =
      formatDate(
        student.admission_date
      );

  }


  /* -------------------------------------------------------
     PHOTO
     ------------------------------------------------------- */

  if (
    $("studentPhoto") &&
    student.photo_url
  ) {

    $("studentPhoto").src =
      student.photo_url;

    $("studentPhoto").style.display =
      "block";

  }

}


/* =========================================================
   RPC VERIFICATION
   ========================================================= */

async function verifyRPC(
  supabase,
  record
) {

  try {

    const result =
      await supabase.rpc(
        "verify_authentication_letter",
        {
          p_code:
            record.verify_code,

          p_id:
            record.certificate_id
        }
      );


    if (result.error) {

      console.warn(
        "[AUTH LETTER] RPC:",
        result.error
      );

      return null;

    }


    if (
      Array.isArray(
        result.data
      )
    ) {

      return (
        result.data[0] ||
        null
      );

    }


    return (
      result.data ||
      null
    );

  } catch (error) {

    console.warn(
      "[AUTH LETTER] RPC exception:",
      error
    );

    return null;

  }

}


/* =========================================================
   RENDER RPC DATA
   ========================================================= */

function renderRPC(
  data,
  record
) {

  if (!data) {
    return;
  }


  /*
   * RPC data is accepted only when it belongs
   * to the SAME verification code and authentication ID.
   */

  const rpcCode =
    String(
      data.verification_code || ""
    ).trim();


  const rpcId =
    String(
      data.authentication_id || ""
    ).trim();


  const recordCode =
    String(
      record?.verify_code || ""
    ).trim();


  const recordId =
    String(
      record?.certificate_id || ""
    ).trim();


  if (
    rpcCode &&
    recordCode &&
    rpcCode !== recordCode
  ) {

    console.warn(
      "[AUTH LETTER] RPC code mismatch."
    );

    return;

  }


  if (
    rpcId &&
    recordId &&
    rpcId !== recordId
  ) {

    console.warn(
      "[AUTH LETTER] RPC authentication ID mismatch."
    );

    return;

  }


  if (
    $("referenceNo") &&
    data.reference_no
  ) {

    $("referenceNo").textContent =
      data.reference_no;

  }


  if (
    $("authenticationId") &&
    data.authentication_id
  ) {

    $("authenticationId").textContent =
      data.authentication_id;

  }


  if (
    $("verificationCode") &&
    data.verification_code
  ) {

    $("verificationCode").textContent =
      data.verification_code;

  }


  if (
    $("studentName") &&
    data.student_name
  ) {

    $("studentName").textContent =
      data.student_name;

  }


  if (
    $("courseName") &&
    data.course_name
  ) {

    $("courseName").textContent =
      data.course_name;

  }


  if (
    $("issueDate") &&
    data.issue_date
  ) {

    $("issueDate").textContent =
      formatDate(
        data.issue_date
      );

  }


  if (
    $("expiryDate") &&
    data.expiry_date
  ) {

    $("expiryDate").textContent =
      formatDate(
        data.expiry_date
      );

  }


  if (
    $("status") &&
    data.status
  ) {

    $("status").textContent =
      data.status.toUpperCase();

  }


  if (
    $("studentPhoto") &&
    data.student_photo_url
  ) {

    $("studentPhoto").src =
      data.student_photo_url;

    $("studentPhoto").style.display =
      "block";

  }


  /*
   * Re-render QR after RPC,
   * guaranteeing that displayed verification
   * information and QR remain synchronized.
   */

  renderQR(
    record
  );

}


/* =========================================================
   QR CODE
   ========================================================= */

function renderQR(
  record
) {

  const container =
    $("qrcode");


  if (!container) {

    console.warn(
      "[AUTH LETTER] QR container #qrcode lama helin."
    );

    return;

  }


  container.innerHTML =
    "";


  const verifyCode =
    String(
      record?.verify_code || ""
    ).trim();


  const certificateId =
    String(
      record?.certificate_id || ""
    ).trim();


  /* -------------------------------------------------------
     VALIDATE QR DATA
     ------------------------------------------------------- */

  if (
    !verifyCode ||
    !certificateId
  ) {

    console.error(
      "[AUTH LETTER] QR data missing:",
      {
        verifyCode,
        certificateId
      }
    );


    container.innerHTML = `
      <div style="
        font-size:11px;
        color:#b00020;
        text-align:center;
        padding:8px;
      ">
        QR verification unavailable
      </div>
    `;


    return;

  }


  /* -------------------------------------------------------
     BUILD OFFICIAL URL
     ------------------------------------------------------- */

  const verificationURL =
    buildVerificationURL(
      record
    );


  if (!verificationURL) {

    container.innerHTML = `
      <div style="
        font-size:11px;
        color:#b00020;
        text-align:center;
        padding:8px;
      ">
        Verification URL unavailable
      </div>
    `;


    return;

  }


  /* -------------------------------------------------------
     DEBUG
     ------------------------------------------------------- */

  console.log(
    "[AUTH LETTER] QR VERIFY CODE:",
    verifyCode
  );


  console.log(
    "[AUTH LETTER] QR AUTHENTICATION ID:",
    certificateId
  );


  console.log(
    "[AUTH LETTER] QR URL:",
    verificationURL
  );


  /* -------------------------------------------------------
     QR LIBRARY
     ------------------------------------------------------- */

  if (
    window.QRCode &&
    typeof window.QRCode === "function"
  ) {

    try {

      const level =
        window.QRCode.CorrectLevel
          ? window.QRCode.CorrectLevel.H
          : 2;


      new QRCode(
        container,
        {
          text:
            verificationURL,

          width:
            145,

          height:
            145,

          colorDark:
            "#0B1E63",

          colorLight:
            "#FFFFFF",

          correctLevel:
            level
        }
      );


      console.log(
        "[AUTH LETTER] QR CREATED:",
        verificationURL
      );


      return;

    } catch (error) {

      console.warn(
        "[AUTH LETTER] QR library failed:",
        error
      );

    }

  }


  /* -------------------------------------------------------
     FALLBACK QR SERVER
     ------------------------------------------------------- */

  const image =
    document.createElement(
      "img"
    );


  image.src =
    "https://api.qrserver.com/v1/create-qr-code/" +
    "?size=180x180" +
    "&data=" +
    encodeURIComponent(
      verificationURL
    );


  image.alt =
    "GAAWOW Academy Authentication Verification QR";


  image.width =
    145;

  image.height =
    145;


  image.style.display =
    "block";

  image.style.width =
    "145px";

  image.style.height =
    "145px";

  image.style.objectFit =
    "contain";


  image.onerror =
    function () {

      console.error(
        "[AUTH LETTER] QR fallback failed."
      );


      container.innerHTML = `
        <div style="
          font-size:11px;
          color:#b00020;
          text-align:center;
          padding:8px;
        ">
          QR unavailable
        </div>
      `;

    };


  container.appendChild(
    image
  );


  console.log(
    "[AUTH LETTER] QR FALLBACK CREATED:",
    verificationURL
  );

}


/* =========================================================
   LOAD SUBJECT NAMES
   ========================================================= */

async function loadSubjectNames(
  supabase,
  rows
) {

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


  if (!subjectIds.length) {
    return {};
  }


  try {

    const result =
      await supabase
        .from("subjects")
        .select("*")
        .in(
          "id",
          subjectIds
        );


    if (result.error) {

      console.warn(
        "[AUTH LETTER] Subjects query:",
        result.error
      );

      return {};

    }


    const map = {};


    for (
      const subject
      of result.data || []
    ) {

      const name =
        firstAvailable(
          subject.name,
          subject.subject_name,
          subject.title,
          subject.subject,
          subject.code
        );


      if (name) {

        map[
          String(subject.id)
        ] = name;

      }

    }


    return map;

  } catch (error) {

    console.warn(
      "[AUTH LETTER] Subject names exception:",
      error
    );

    return {};

  }

}


/* =========================================================
   ACADEMIC RESULTS
   ========================================================= */

async function loadResults(
  supabase,
  record
) {

  const container =
    $("academicResults");


  if (!container) {
    return;
  }


  if (!record?.student_id) {
    return;
  }


  try {

    /* -----------------------------------------------------
       LOAD PUBLISHED RESULTS
       ----------------------------------------------------- */

    const result =
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


    if (result.error) {

      console.warn(
        "[AUTH LETTER] Results:",
        result.error
      );

      return;

    }


    const rows =
      result.data || [];


    if (!rows.length) {

      container.innerHTML =
        '<div class="no-results">No published academic results available.</div>';

      return;

    }


    /* -----------------------------------------------------
       SUBJECT NAMES
       ----------------------------------------------------- */

    const subjectMap =
      await loadSubjectNames(
        supabase,
        rows
      );


    /* -----------------------------------------------------
       BUILD NORMALIZED RESULTS
       ----------------------------------------------------- */

    const normalizedRows =
      rows.map(
        row => {

          const score =
            numericScore(
              firstAvailable(
                row.score,
                row.marks,
                row.total_score,
                row.mark,
                row.points
              )
            );


          let subjectName =
            firstAvailable(
              row.subject_name,
              row.subject,
              row.name
            );


          if (
            !subjectName &&
            row.subject_id
          ) {

            subjectName =
              subjectMap[
                String(
                  row.subject_id
                )
              ];

          }


          const existingGrade =
            firstAvailable(
              row.grade,
              row.grade_name
            );


          const grade =
            existingGrade ||
            calculateGrade(
              score
            );


          return {

            subject:
              subjectName ||
              "Subject",

            score:
              score,

            grade:
              grade,

            raw:
              row

          };

        }
      );


    /* -----------------------------------------------------
       SORT
       ----------------------------------------------------- */

    normalizedRows.sort(
      (a, b) => {

        const aOrder =
          Number(
            a.raw?.subject_order ??
            a.raw?.order_no ??
            a.raw?.sort_order ??
            9999
          );


        const bOrder =
          Number(
            b.raw?.subject_order ??
            b.raw?.order_no ??
            b.raw?.sort_order ??
            9999
          );


        return (
          aOrder -
          bOrder
        );

      }
    );


    /* -----------------------------------------------------
       TOTAL
       ----------------------------------------------------- */

    const scoredRows =
      normalizedRows.filter(
        row =>
          row.score !== null
      );


    const total =
      scoredRows.reduce(
        (
          sum,
          row
        ) =>
          sum +
          row.score,
        0
      );


    /*
     * The Gaawow Authentication Letter
     * currently uses 8 subjects x 100 = 800.
     */

    const maxTotal =
      scoredRows.length *
      100;


    const percentage =
      maxTotal > 0
        ? (
            total /
            maxTotal
          ) *
          100
        : null;


    const overallGrade =
      percentage !== null
        ? calculateGrade(
            percentage
          )
        : "N/A";


    /* -----------------------------------------------------
       BUILD TABLE
       ----------------------------------------------------- */

    let html = `
      <div class="results-table-wrapper">

        <table class="results-table">

          <thead>
            <tr>
              <th>Subject</th>
              <th>Score</th>
              <th>Grade</th>
            </tr>
          </thead>

          <tbody>
    `;


    for (
      const row
      of normalizedRows
    ) {

      html += `
        <tr>

          <td>
            ${escapeHTML(
              row.subject
            )}
          </td>

          <td>
            ${
              row.score === null
                ? "N/A"
                : escapeHTML(
                    row.score
                  )
            }
          </td>

          <td>
            ${escapeHTML(
              row.grade
            )}
          </td>

        </tr>
      `;

    }


    /* -----------------------------------------------------
       TOTAL ROW
       ----------------------------------------------------- */

    html += `
        <tr class="results-total-row">

          <td>
            <strong>TOTAL</strong>
          </td>

          <td>
            <strong>
              ${escapeHTML(total)}
              /
              ${escapeHTML(maxTotal)}
            </strong>
          </td>

          <td>
            <strong>
              ${escapeHTML(
                overallGrade
              )}
            </strong>
          </td>

        </tr>
    `;


    /* -----------------------------------------------------
       PERCENTAGE ROW
       ----------------------------------------------------- */

    if (
      percentage !== null
    ) {

      html += `
        <tr class="results-percentage-row">

          <td colspan="2">
            <strong>OVERALL PERCENTAGE</strong>
          </td>

          <td>
            <strong>
              ${percentage.toFixed(1)}%
            </strong>
          </td>

        </tr>
      `;

    }


    html += `
          </tbody>

        </table>

      </div>
    `;


    container.innerHTML =
      html;


    /* -----------------------------------------------------
       DEBUG RESULT
       ----------------------------------------------------- */

    console.log(
      "[AUTH LETTER] Academic Results:",
      {
        subjects:
          normalizedRows.length,

        total:
          total,

        maxTotal:
          maxTotal,

        percentage:
          percentage,

        grade:
          overallGrade
      }
    );


  } catch (error) {

    console.warn(
      "[AUTH LETTER] Academic results exception:",
      error
    );

  }

}


/* =========================================================
   REMOVE LOCATION
   ========================================================= */

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

    '[data-field="founder-location"]',

    '[data-field="g-founder-location"]',

    '[data-field="scc-location"]'

  ];


  selectors.forEach(
    selector => {

      document
        .querySelectorAll(
          selector
        )
        .forEach(
          element => {

            element.remove();

          }
        );

    }
  );

}


/* =========================================================
   PRINT
   ========================================================= */

function setupPrint() {

  const button =
    $("printButton");


  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    () => {

      window.print();

    }
  );

}


/* =========================================================
   RETRY
   ========================================================= */

function setupRetry() {

  const button =
    $("retryButton");


  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    () => {

      window.location.reload();

    }
  );

}


/* =========================================================
   START
   ========================================================= */

async function start() {

  console.log(
    "GAAWOW AUTHENTICATION LETTER 20261002-1"
  );


  try {

    /* -----------------------------------------------------
       UI
       ----------------------------------------------------- */

    setupPrint();

    setupRetry();


    /* -----------------------------------------------------
       SUPABASE
       ----------------------------------------------------- */

    const supabase =
      getSupabase();


    /* -----------------------------------------------------
       URL PARAMETERS
       ----------------------------------------------------- */

    const params =
      getParams();


    console.log(
      "[AUTH LETTER] URL PARAMETERS:",
      params
    );


    /* -----------------------------------------------------
       LOAD CERTIFICATE
       ----------------------------------------------------- */

    const record =
      await loadCertificate(
        supabase,
        params
      );


    console.log(
      "[AUTH LETTER] SELECTED RECORD:",
      {
        id:
          record.id,

        certificate_no:
          record.certificate_no,

        certificate_id:
          record.certificate_id,

        verify_code:
          record.verify_code,

        certificate_type:
          record.certificate_type
      }
    );


    /* -----------------------------------------------------
       TYPE CHECK
       ----------------------------------------------------- */

    if (
      !isAuthenticationLetter(
        record
      )
    ) {

      throw new Error(
        "Record-kan ma aha Authentication Letter."
      );

    }


    /* -----------------------------------------------------
       SECURITY CHECK
       ----------------------------------------------------- */

    if (
      record.status &&
      String(
        record.status
      )
        .toLowerCase() !==
      "valid"
    ) {

      console.warn(
        "[AUTH LETTER] Document status:",
        record.status
      );

    }


    /* -----------------------------------------------------
       RENDER DATABASE RECORD FIRST
       ----------------------------------------------------- */

    renderCertificate(
      record
    );


    removeFounderLocation();


    showDocument();


    /* -----------------------------------------------------
       LOAD STUDENT
       ----------------------------------------------------- */

    const student =
      await loadStudent(
        supabase,
        record
      );


    renderStudent(
      student
    );


    /* -----------------------------------------------------
       RPC VERIFICATION
       ----------------------------------------------------- */

    const verified =
      await verifyRPC(
        supabase,
        record
      );


    renderRPC(
      verified,
      record
    );


    /* -----------------------------------------------------
       RESULTS
       ----------------------------------------------------- */

    await loadResults(
      supabase,
      record
    );


    /* -----------------------------------------------------
       FINAL QR RENDER
       -----------------------------------------------------
       This is intentional.
       It guarantees the final QR is generated
       from the same record displayed on screen.
       ----------------------------------------------------- */

    renderQR(
      record
    );


    /* -----------------------------------------------------
       FINAL LOCATION CLEANUP
       ----------------------------------------------------- */

    removeFounderLocation();


    /* -----------------------------------------------------
       READY
       ----------------------------------------------------- */

    console.log(
      "[AUTH LETTER] READY"
    );


    console.log(
      "[AUTH LETTER] FINAL VERIFICATION:",
      buildVerificationURL(
        record
      )
    );


  } catch (error) {

    console.error(
      "[AUTH LETTER] FATAL ERROR:",
      error
    );


    showError(
      "Authentication Letter lama soo bandhigi karin.",
      error?.message ||
      String(error)
    );

  }

}


/* =========================================================
   BOOT
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    start
  );

} else {

  start();

}
