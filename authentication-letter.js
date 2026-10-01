/* =========================================================
   GAAWOW ACADEMY EMS
   AUTHENTICATION LETTER
   authentication-letter.js
   Version: 20261001-5
   ========================================================= */

"use strict";

/* =========================================================
   CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const PAGE_TIMEOUT = 12000;


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


function text(value) {

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "N/A";
  }

  return String(value);
}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(value) {

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return text(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}


/* =========================================================
   NORMALIZE TYPE
   ========================================================= */

function normalizeType(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

}


/* =========================================================
   TIMEOUT
   ========================================================= */

function timeoutPromise(ms, message) {

  return new Promise((_, reject) => {

    setTimeout(() => {
      reject(new Error(message));
    }, ms);

  });

}


async function withTimeout(promise, ms, message) {

  return Promise.race([
    promise,
    timeoutPromise(ms, message)
  ]);

}


/* =========================================================
   PAGE STATE
   ========================================================= */

function showLoading() {
function showLoading() {

  const loading = $("loading");
  const error = $("errorState");
  const documentPage = $("authenticationLetter");

  if (loading) {
    loading.hidden = false;
    loading.removeAttribute("hidden");
    loading.style.display = "flex";
  }

  if (error) {
    error.hidden = true;
    error.style.display = "none";
  }

  if (documentPage) {
    documentPage.hidden = true;
    documentPage.style.display = "none";
  }

}


function showPage() {

  const loading = $("loading");
  const error = $("errorState");
  const documentPage = $("authenticationLetter");

  if (loading) {
    loading.style.display = "none";
    loading.hidden = true;
  }

  if (error) {
    error.style.display = "none";
    error.hidden = true;
  }

  if (documentPage) {
    documentPage.hidden = false;
    documentPage.removeAttribute("hidden");
    documentPage.style.display = "block";
    documentPage.style.visibility = "visible";
    documentPage.style.opacity = "1";
  }

}


function showError(message, details = "") {

  console.error(
    "[GAAWOW AUTH LETTER ERROR]",
    message,
    details
  );

  const loading = $("loading");
  const error = $("errorState");
  const documentPage = $("authenticationLetter");
  const errorMessage = $("errorMessage");
  const errorDetails = $("errorDetails");

  if (loading) {
    loading.style.display = "none";
  }

  if (documentPage) {
    documentPage.style.display = "none";
  }

  if (errorMessage) {
    errorMessage.textContent =
      message || "Authentication Letter could not be loaded.";
  }

  if (errorDetails) {

    errorDetails.textContent =
      details
        ? String(details)
        : "";

  }

  if (error) {
  error.hidden = false;
  error.removeAttribute("hidden");
  error.style.display = "block";
}

}


/* =========================================================
   URL PARAMETERS
   ========================================================= */

function getParams() {

  const params = new URLSearchParams(
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


/* =========================================================
   SUPABASE
   ========================================================= */

function getSupabase() {

  if (
    typeof window.supabase === "undefined" ||
    typeof window.supabase.createClient !== "function"
  ) {

    throw new Error(
      "Supabase library lama soo load-gareyn."
    );

  }

  return window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

}


/* =========================================================
   GET CERTIFICATE RECORD
   ========================================================= */

async function getRecord(supabase, params) {

  console.log(
    "[AUTH LETTER] URL parameters:",
    params
  );


  const recordId =
    firstAvailable(
      params.regen,
      params.record_id
    );


  /* -------------------------------------------------------
     1. REGEN / RECORD UUID
     ------------------------------------------------------- */

  if (recordId) {

    console.log(
      "[AUTH LETTER] Searching certificate by id:",
      recordId
    );


    const result =
      await withTimeout(

        supabase
          .from("certificates")
          .select("*")
          .eq("id", recordId)
          .limit(1)
          .maybeSingle(),

        PAGE_TIMEOUT,

        "Certificates query timeout kadib 12 seconds."

      );


    if (result.error) {

      console.error(
        "[AUTH LETTER] Supabase ID query error:",
        result.error
      );

      throw result.error;

    }


    if (result.data) {

      console.log(
        "[AUTH LETTER] Record found by UUID:",
        result.data
      );

      return result.data;

    }

  }


  /* -------------------------------------------------------
     2. CERTIFICATE ID
     ------------------------------------------------------- */

  if (params.id) {

    console.log(
      "[AUTH LETTER] Searching by certificate_id:",
      params.id
    );


    const result =
      await withTimeout(

        supabase
          .from("certificates")
          .select("*")
          .eq("certificate_id", params.id)
          .limit(1)
          .maybeSingle(),

        PAGE_TIMEOUT,

        "Certificate ID query timeout kadib 12 seconds."

      );


    if (result.error) {

      console.error(
        "[AUTH LETTER] certificate_id query error:",
        result.error
      );

      throw result.error;

    }


    if (result.data) {

      console.log(
        "[AUTH LETTER] Record found by certificate_id:",
        result.data
      );

      return result.data;

    }

  }


  /* -------------------------------------------------------
     3. VERIFICATION CODE
     ------------------------------------------------------- */

  if (params.code) {

    console.log(
      "[AUTH LETTER] Searching by verify_code:",
      params.code
    );


    const result =
      await withTimeout(

        supabase
          .from("certificates")
          .select("*")
          .eq("verify_code", params.code)
          .limit(1)
          .maybeSingle(),

        PAGE_TIMEOUT,

        "Verification code query timeout kadib 12 seconds."

      );


    if (result.error) {

      console.error(
        "[AUTH LETTER] verify_code query error:",
        result.error
      );

      throw result.error;

    }


    if (result.data) {

      console.log(
        "[AUTH LETTER] Record found by verify_code:",
        result.data
      );

      return result.data;

    }

  }


  return null;

}


/* =========================================================
   AUTHENTICATION LETTER CHECK
   ========================================================= */

function checkAuthentication(record) {

  if (!record) {
    return false;
  }


  const type =
    normalizeType(
      record.certificate_type
    );


  const certificateId =
    String(
      record.certificate_id || ""
    ).toUpperCase();


  const certificateNo =
    String(
      record.certificate_no || ""
    ).toUpperCase();


  console.log(
    "[AUTH LETTER] Type:",
    type
  );


  console.log(
    "[AUTH LETTER] Certificate ID:",
    certificateId
  );


  console.log(
    "[AUTH LETTER] Certificate No:",
    certificateNo
  );


  if (
    type === "authentication_letter" ||
    type === "authenticationletter"
  ) {

    return true;

  }


  if (
    type.includes("authentication")
  ) {

    return true;

  }


  if (
    certificateId.startsWith("GAA-AUTH-")
  ) {

    return true;

  }


  if (
    certificateNo.startsWith("GAA-AUTH-")
  ) {

    return true;

  }


  return false;

}


/* =========================================================
   RPC
   ========================================================= */

async function getRPCData(supabase, record) {

  try {

    const code =
      firstAvailable(
        record.verify_code
      );


    const id =
      firstAvailable(
        record.certificate_id
      );


    if (!code) {

      console.warn(
        "[AUTH LETTER] No verification code for RPC."
      );

      return null;

    }


    console.log(
      "[AUTH LETTER] Calling verify_authentication_letter RPC..."
    );


    const result =
      await withTimeout(

        supabase.rpc(
          "verify_authentication_letter",
          {
            p_code: code,
            p_id: id || null
          }
        ),

        8000,

        "Authentication verification RPC timeout."

      );


    if (result.error) {

      console.warn(
        "[AUTH LETTER] RPC error:",
        result.error
      );

      return null;

    }


    let data = result.data;


    if (Array.isArray(data)) {
      data = data[0] || null;
    }


    console.log(
      "[AUTH LETTER] RPC data:",
      data
    );


    return data || null;

  } catch (error) {

    console.warn(
      "[AUTH LETTER] RPC failed:",
      error
    );

    return null;

  }

}


/* =========================================================
   STUDENT FALLBACK
   ========================================================= */

async function getStudent(supabase, studentId) {

  if (!studentId) {
    return null;
  }


  try {

    const result =
      await withTimeout(

        supabase
          .from("students")
          .select("*")
          .eq("id", studentId)
          .limit(1)
          .maybeSingle(),

        6000,

        "Student query timeout."

      );


    if (result.error) {

      console.warn(
        "[AUTH LETTER] Student query error:",
        result.error
      );

      return null;

    }


    return result.data || null;

  } catch (error) {

    console.warn(
      "[AUTH LETTER] Student fallback failed:",
      error
    );

    return null;

  }

}


/* =========================================================
   STUDENT RENDER
   ========================================================= */

function renderStudent(record, rpc, student) {

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

      student?.course_name,

      student?.program_name

    );


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


  const studentPhoto =
    firstAvailable(

      rpc?.student_photo_url,

      record.student_photo_url,

      student?.photo_url,

      student?.student_photo_url,

      student?.photo

    );


  if ($("studentName")) {

    $("studentName").textContent =
      text(studentName);

  }


  if ($("courseName")) {

    $("courseName").textContent =
      text(courseName);

  }


  if ($("dateStarted")) {

    $("dateStarted").textContent =
      formatDate(dateStarted);

  }


  if ($("dateCompleted")) {

    $("dateCompleted").textContent =
      formatDate(dateCompleted);

  }


  if ($("studentPhoto")) {

    if (studentPhoto) {

      $("studentPhoto").src =
        studentPhoto;

      $("studentPhoto").style.display =
        "block";

    } else {

      $("studentPhoto").removeAttribute("src");

    }

  }

}


/* =========================================================
   AUTHENTICATION INFORMATION
   ========================================================= */

function renderAuth(record, rpc) {

  const referenceNo =
    firstAvailable(

      rpc?.reference_no,

      record.certificate_no

    );


  const authenticationId =
    firstAvailable(

      rpc?.authentication_id,

      record.certificate_id

    );


  const verificationCode =
    firstAvailable(

      rpc?.verification_code,

      record.verify_code

    );


  if ($("referenceNo")) {

    $("referenceNo").textContent =
      text(referenceNo);

  }


  if ($("authenticationId")) {

    $("authenticationId").textContent =
      text(authenticationId);

  }


  if ($("verificationCode")) {

    $("verificationCode").textContent =
      text(verificationCode);

  }

}


/* =========================================================
   STATUS
   ========================================================= */

function renderStatus(record, rpc) {

  const status =
    firstAvailable(

      rpc?.status,

      record.status

    );


  if (!$("status")) {
    return;
  }


  const value =
    String(status || "valid")
      .trim();


  $("status").textContent =
    value.toUpperCase();


  $("status").className =
    "status " +
    value.toLowerCase();

}


/* =========================================================
   DATES
   ========================================================= */

function renderDates(record, rpc) {

  const startDate =
    firstAvailable(

      rpc?.date_started,

      record.date_started

    );


  const completionDate =
    firstAvailable(

      rpc?.date_completed,

      record.date_completed

    );


  const issueDate =
    firstAvailable(

      rpc?.issue_date,

      record.issue_date

    );


  const expiryDate =
    firstAvailable(

      rpc?.expiry_date,

      record.expiry_date

    );


  if ($("startDate")) {

    $("startDate").textContent =
      formatDate(startDate);

  }


  if ($("completionDate")) {

    $("completionDate").textContent =
      formatDate(completionDate);

  }


  if ($("issueDate")) {

    $("issueDate").textContent =
      formatDate(issueDate);

  }


  if ($("expiryDate")) {

    $("expiryDate").textContent =
      formatDate(expiryDate);

  }

}


/* =========================================================
   QR CODE
   ========================================================= */

function renderQR(record, rpc) {

  const container =
    $("qrcode");


  if (!container) {
    return;
  }


  container.innerHTML = "";


  const verificationUrl =
    firstAvailable(

      rpc?.verification_url,

      record.verification_url,

      buildVerificationURL(record)

    );


  if (!verificationUrl) {

    console.warn(
      "[AUTH LETTER] Verification URL missing."
    );

    return;

  }


  console.log(
    "[AUTH LETTER] QR URL:",
    verificationUrl
  );


  if (
    typeof window.QRCode !== "undefined"
  ) {

    try {

      new QRCode(container, {

        text: verificationUrl,

        width: 145,

        height: 145,

        colorDark: "#0B1E63",

        colorLight: "#FFFFFF",

        correctLevel:
          QRCode.CorrectLevel.H

      });

      return;

    } catch (error) {

      console.warn(
        "[AUTH LETTER] QRCode library error:",
        error
      );

    }

  }


  const img =
    document.createElement("img");


  img.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" +
    encodeURIComponent(
      verificationUrl
    );


  img.alt =
    "Verification QR Code";


  img.width = 145;
  img.height = 145;


  container.appendChild(img);

}


function buildVerificationURL(record) {

  const code =
    record?.verify_code;


  const id =
    record?.certificate_id;


  if (!code) {
    return null;
  }


  const base =
    window.location.origin +
    "/GAAWOW-EMS/verify-auth.html";


  const query =
    new URLSearchParams();


  query.set(
    "code",
    code
  );


  if (id) {

    query.set(
      "id",
      id
    );

  }


  return (
    base +
    "?" +
    query.toString()
  );

}


/* =========================================================
   ACADEMIC RESULTS
   ========================================================= */

async function renderResults(supabase, record) {

  const container =
    $("academicResults");


  if (!container) {
    return;
  }


  if (!record.student_id) {

    container.innerHTML =
      "<div class=\"no-results\">No academic results available.</div>";

    return;

  }


  try {

    console.log(
      "[AUTH LETTER] Loading academic results..."
    );


    const resultsResponse =
      await withTimeout(

        supabase
          .from("results")
          .select("*")
          .eq("student_id", record.student_id)
          .eq("is_published", true),

        7000,

        "Academic results query timeout."

      );


    if (resultsResponse.error) {

      console.warn(
        "[AUTH LETTER] Results error:",
        resultsResponse.error
      );

      container.innerHTML =
        "<div class=\"no-results\">Academic results unavailable.</div>";

      return;

    }


    const results =
      resultsResponse.data || [];


    if (!results.length) {

      container.innerHTML =
        "<div class=\"no-results\">No published academic results available.</div>";

      return;

    }


    const subjectIds =
      [
        ...new Set(
          results
            .map(row => row.subject_id)
            .filter(Boolean)
        )
      ];


    let subjects = [];


    if (subjectIds.length) {

      const subjectsResponse =
        await withTimeout(

          supabase
            .from("subjects")
            .select("*")
            .in("id", subjectIds),

          6000,

          "Subjects query timeout."

        );


      if (
        !subjectsResponse.error
      ) {

        subjects =
          subjectsResponse.data || [];

      }

    }


    const subjectMap =
      new Map();


    subjects.forEach(subject => {

      subjectMap.set(
        subject.id,
        subject
      );

    });


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


    results.forEach(row => {

      const subject =
        subjectMap.get(
          row.subject_id
        );


      const subjectName =
        firstAvailable(

          row.subject_name,

          subject?.name,

          subject?.subject_name,

          "Subject"

        );


      const score =
        firstAvailable(

          row.score,

          row.marks,

          row.total_score

        );


      const grade =
        firstAvailable(

          row.grade,

          row.grade_name

        );


      html += `

        <tr>

          <td>
            ${escapeHTML(subjectName)}
          </td>

          <td>
            ${escapeHTML(
              score ?? "N/A"
            )}
          </td>

          <td>
            ${escapeHTML(
              grade ?? "N/A"
            )}
          </td>

        </tr>

      `;

    });


    html += `

          </tbody>

        </table>

      </div>

    `;


    container.innerHTML =
      html;


    console.log(
      "[AUTH LETTER] Academic results loaded:",
      results.length
    );


  } catch (error) {

    console.warn(
      "[AUTH LETTER] Academic results failed:",
      error
    );


    container.innerHTML =
      "<div class=\"no-results\">Academic results unavailable.</div>";

  }

}


/* =========================================================
   REMOVE LOCATION FROM FOUNDER / SIGNATURE
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


  document
    .querySelectorAll(
      ".signature, .founder, .g-founder, .director, .scc"
    )
    .forEach(block => {

      const elements =
        block.querySelectorAll(
          "*"
        );


      elements.forEach(element => {

        const value =
          String(
            element.textContent || ""
          ).trim();


        if (
          /^location\s*:/i.test(value)
        ) {

          element.remove();

        }

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
    () =>
