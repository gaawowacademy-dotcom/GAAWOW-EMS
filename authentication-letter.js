"use strict";

/* =========================================================
   GAAWOW ACADEMY EMS
   AUTHENTICATION LETTER
   FINAL FRONTEND VERSION
   20261001-6
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const CERTIFICATE_RECORD_ID =
  "e9eb8433-7d61-4648-ab9c-7e6cbff2d3b6";


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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return safeText(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}


/* =========================================================
   PAGE STATE
   ========================================================= */

function showDocument() {

  const loading = $("loading");
  const error = $("errorState");
  const page = $("authenticationLetter");

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
    page.removeAttribute("hidden");
    page.style.display = "block";
    page.style.visibility = "visible";
    page.style.opacity = "1";
  }

}


function showError(title, details = "") {

  console.error(
    "[GAAWOW AUTH LETTER]",
    title,
    details
  );

  const loading = $("loading");
  const page = $("authenticationLetter");
  const error = $("errorState");
  const message = $("errorMessage");
  const detail = $("errorDetails");

  if (loading) {
    loading.hidden = true;
    loading.style.display = "none";
  }

  if (page) {
    page.hidden = true;
    page.style.display = "none";
  }

  if (message) {
    message.textContent = title;
  }

  if (detail) {
    detail.textContent = details;
  }

  if (error) {
    error.hidden = false;
    error.removeAttribute("hidden");
    error.style.display = "block";
  }
}


/* =========================================================
   URL
   ========================================================= */

function getParams() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  return {
    regen: params.get("regen"),
    id: params.get("id"),
    code: params.get("code"),
    record_id: params.get("record_id")
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

async function loadCertificate(supabase, params) {

  let query = null;

  const recordId =
    firstAvailable(
      params.regen,
      params.record_id,
      CERTIFICATE_RECORD_ID
    );

  if (recordId) {

    query =
      await supabase
        .from("certificates")
        .select("*")
        .eq("id", recordId)
        .limit(1)
        .maybeSingle();

  }


  if (
    (!query || !query.data) &&
    params.id
  ) {

    query =
      await supabase
        .from("certificates")
        .select("*")
        .eq("certificate_id", params.id)
        .limit(1)
        .maybeSingle();

  }


  if (
    (!query || !query.data) &&
    params.code
  ) {

    query =
      await supabase
        .from("certificates")
        .select("*")
        .eq("verify_code", params.code)
        .limit(1)
        .maybeSingle();

  }


  if (!query) {
    throw new Error(
      "Certificate query lama la sameyn."
    );
  }


  if (query.error) {
    throw query.error;
  }


  if (!query.data) {
    throw new Error(
      "Authentication Letter record lama helin."
    );
  }


  return query.data;
}


/* =========================================================
   AUTHENTICATION TYPE
   ========================================================= */

function isAuthenticationLetter(record) {

  const type =
    String(
      record.certificate_type || ""
    )
      .trim()
      .toLowerCase();

  const id =
    String(
      record.certificate_id || ""
    )
      .trim()
      .toUpperCase();

  const number =
    String(
      record.certificate_no || ""
    )
      .trim()
      .toUpperCase();


  return (
    type === "authentication_letter" ||
    type.includes("authentication") ||
    id.startsWith("GAA-AUTH-") ||
    number.startsWith("GAA-AUTH-")
  );
}


/* =========================================================
   RENDER BASIC CERTIFICATE
   ========================================================= */

function renderCertificate(record) {

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


  /* -------------------------------------------------------
     Verification URL
     ------------------------------------------------------- */

  renderQR(record);

}


/* =========================================================
   LOAD STUDENT
   ========================================================= */

async function loadStudent(
  supabase,
  record
) {

  if (!record.student_id) {
    return null;
  }


  const result =
    await supabase
      .from("students")
      .select(
        "id,full_name,student_id,admission_date,photo_url"
      )
      .eq("id", record.student_id)
      .limit(1)
      .maybeSingle();


  if (result.error) {

    console.warn(
      "[AUTH LETTER] Student query:",
      result.error
    );

    return null;
  }


  return result.data || null;
}


/* =========================================================
   RENDER STUDENT
   ========================================================= */

function renderStudent(student) {

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


  /* DATE STARTED
     Official source:
     students.admission_date
  */

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


  /* PHOTO */

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


    if (Array.isArray(result.data)) {
      return result.data[0] || null;
    }


    return result.data || null;

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

function renderRPC(data) {

  if (!data) {
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
      formatDate(data.issue_date);

  }


  if (
    $("expiryDate") &&
    data.expiry_date
  ) {

    $("expiryDate").textContent =
      formatDate(data.expiry_date);

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

}


/* =========================================================
   QR
   ========================================================= */

function renderQR(record) {
function renderQR() {
  const qrBox = document.getElementById("qrCode");
  if (!qrBox || !record) return;

  qrBox.innerHTML = "";

  const verifyCode = String(record.verify_code || "").trim();
  const authenticationId = String(record.certificate_id || "").trim();

  if (!verifyCode || !authenticationId) {
    qrBox.innerHTML = "<span>QR unavailable</span>";
    return;
  }

  const verifyUrl =
    `https://gaawowacademy-dotcom.github.io/GAAWOW-EMS/verify-auth.html` +
    `?code=${encodeURIComponent(verifyCode)}` +
    `&id=${encodeURIComponent(authenticationId)}`;

  if (typeof QRCode !== "undefined") {
    new QRCode(qrBox, {
      text: verifyUrl,
      width: 120,
      height: 120,
      correctLevel: QRCode.CorrectLevel.H
    });
  } else {
    const img = document.createElement("img");

    img.src =
      "https://api.qrserver.com/v1/create-qr-code/" +
      "?size=120x120&data=" +
      encodeURIComponent(verifyUrl);

    img.alt = "Authentication Verification QR Code";
    img.width = 120;
    img.height = 120;

    qrBox.appendChild(img);
  }
}


  const image =
    document.createElement("img");

  image.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" +
    encodeURIComponent(
      verificationURL
    );

  image.alt =
    "Authentication Letter Verification QR";

  image.width = 145;
  image.height = 145;

  container.appendChild(image);
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


  if (!record.student_id) {
    return;
  }


  try {

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


    for (const row of rows) {

      html += `
        <tr>
          <td>
            ${escapeHTML(
              firstAvailable(
                row.subject_name,
                row.subject,
                row.name,
                "Subject"
              )
            )}
          </td>

          <td>
            ${escapeHTML(
              firstAvailable(
                row.score,
                row.marks,
                row.total_score,
                "N/A"
              )
            )}
          </td>

          <td>
            ${escapeHTML(
              firstAvailable(
                row.grade,
                row.grade_name,
                "N/A"
              )
            )}
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


  selectors.forEach(selector => {

    document
      .querySelectorAll(selector)
      .forEach(element => {
        element.remove();
      });

  });

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
    () => window.print()
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
    () => window.location.reload()
  );

}


/* =========================================================
   START
   ========================================================= */

async function start() {

  console.log(
    "GAAWOW AUTHENTICATION LETTER 20261001-6"
  );


  try {

    setupPrint();
    setupRetry();


    /* -----------------------------------------------------
       SUPABASE
       ----------------------------------------------------- */

    const supabase =
      getSupabase();


    /* -----------------------------------------------------
       URL
       ----------------------------------------------------- */

    const params =
      getParams();


    /* -----------------------------------------------------
       CERTIFICATE
       ----------------------------------------------------- */

    const record =
      await loadCertificate(
        supabase,
        params
      );


    console.log(
      "[AUTH LETTER] Certificate:",
      record
    );


    /* -----------------------------------------------------
       TYPE
       ----------------------------------------------------- */

    if (
      !isAuthenticationLetter(record)
    ) {

      throw new Error(
        "Record-kan ma aha Authentication Letter."
      );

    }


    /* -----------------------------------------------------
       SHOW DOCUMENT IMMEDIATELY
       ----------------------------------------------------- */

    renderCertificate(record);

    removeFounderLocation();

    showDocument();


    /* -----------------------------------------------------
       STUDENT
       ----------------------------------------------------- */

    const student =
      await loadStudent(
        supabase,
        record
      );


    renderStudent(student);


    /* -----------------------------------------------------
       RPC
       ----------------------------------------------------- */

    const verified =
      await verifyRPC(
        supabase,
        record
      );


    renderRPC(verified);


    /* -----------------------------------------------------
       RESULTS
       ----------------------------------------------------- */

    loadResults(
      supabase,
      record
    );


    console.log(
      "[AUTH LETTER] READY"
    );


  } catch (error) {

    showError(
      "Authentication Letter lama soo bandhigi karin.",
      error?.message || String(error)
    );

  }

}


/* =========================================================
   BOOT
   ========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    start
  );

} else {

  start();

}
