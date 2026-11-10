
"use strict";

/* =========================================================
   GAAWOW ACADEMY EMS
   AUTHENTICATION LETTER
   SECURE RPC VERSION
   VERSION: 20261110-5

   IMPORTANT:
   - HTML unchanged
   - CSS unchanged
   - Official logo unchanged
   - A4 LANDSCAPE preserved
   - RPC verification required before display
   ========================================================= */

/* ================= SUPABASE CONFIG ================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const CERTIFICATE_RECORD_ID =
  "c7366afd-5d9b-475b-af84-6c4a4c0dc8b9";

const OFFICIAL_LOGO_PATH = "logo.png";

const AUTH_VERSION = "20261110-5";

/* ================= SECURITY STATE ================= */

let authenticationVerified = false;
let verifiedRPCData = null;
let verifiedCertificate = null;
let verificationURL = null;

/* ================= HELPERS ================= */

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

function formatDate(value) {
  if (!value) return "N/A";

  const dateString = String(value).trim();

  let date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString
      .split("-")
      .map(Number);

    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateString);
  }

  if (Number.isNaN(date.getTime())) {
    return safeText(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function numericScore(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function calculateGrade(score) {
  if (score === null) return "N/A";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";

  return "F";
}

/* =========================================================
   SECURITY: HIDE DOCUMENT IMMEDIATELY
   ========================================================= */

function lockDocument() {
  authenticationVerified = false;
  verifiedRPCData = null;
  verifiedCertificate = null;
  verificationURL = null;

  const page = $("authenticationLetter");
  const loading = $("loading");
  const error = $("errorState");
  const printButton = $("printButton");

  if (page) {
    page.hidden = true;
    page.style.display = "none";
    page.style.visibility = "hidden";
  }

  if (loading) {
    loading.hidden = false;
    loading.style.display = "block";
  }

  if (error) {
    error.hidden = true;
    error.style.display = "none";
  }

  if (printButton) {
    printButton.disabled = true;
  }
}

/* ================= OFFICIAL BRANDING ================= */

function setupOfficialBranding() {
  const logoPath = OFFICIAL_LOGO_PATH;

  /* WATERMARK */

  const watermark = document.querySelector(
    ".document-watermark"
  );

  if (watermark) {
    let watermarkLogo = watermark.querySelector("img");

    if (!watermarkLogo) {
      watermarkLogo = document.createElement("img");
      watermark.appendChild(watermarkLogo);
    }

    watermarkLogo.src = logoPath;
    watermarkLogo.alt = "";
    watermarkLogo.setAttribute("aria-hidden", "true");

    Object.assign(watermark.style, {
      position: "absolute",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
      overflow: "hidden",
      zIndex: "0"
    });

    Object.assign(watermarkLogo.style, {
      width: "320px",
      height: "320px",
      maxWidth: "55%",
      objectFit: "contain",
      opacity: "0.055",
      filter: "none"
    });
  }

  /* HEADER LOGO */

  const headerSeal = document.querySelector(".header-seal");

  if (headerSeal) {
    headerSeal.replaceChildren();

    const logo = document.createElement("img");

    logo.src = logoPath;
    logo.alt = "Official GAAWOW Academy Logo";
    logo.className = "official-seal-logo";

    Object.assign(logo.style, {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      display: "block"
    });

    headerSeal.appendChild(logo);

    headerSeal.setAttribute(
      "aria-label",
      "Official GAAWOW Academy Logo"
    );

    headerSeal.classList.add(
      "gaawow-official-logo-seal"
    );
  }

  /* OFFICIAL STAMP */

  const stamp = document.querySelector(".stamp-circle");

  if (stamp) {
    stamp.replaceChildren();

    stamp.classList.add("gaawow-official-stamp");

    const logo = document.createElement("img");

    logo.src = logoPath;
    logo.alt = "GAAWOW Academy Official Logo";
    logo.className = "official-stamp-logo";

    Object.assign(logo.style, {
      width: "65%",
      height: "65%",
      objectFit: "contain",
      display: "block",
      margin: "0 auto"
    });

    const label = document.createElement("span");

    label.className = "official-stamp-label";
    label.textContent = "OFFICIAL";

    stamp.append(logo, label);
  }

  /* STUDENT PHOTO */

  const studentPhoto = $("studentPhoto");
  const photoPlaceholder = $("photoPlaceholder");

  if (studentPhoto) {
    studentPhoto.addEventListener("load", function () {
      if (photoPlaceholder) {
        photoPlaceholder.style.display = "none";
      }

      studentPhoto.style.display = "block";
    });

    studentPhoto.addEventListener("error", function () {
      studentPhoto.style.display = "none";

      if (photoPlaceholder) {
        photoPlaceholder.style.display = "flex";
      }
    });
  }

  console.log(
    "[AUTH LETTER] Official branding initialized."
  );
}

/* ================= PAGE STATE ================= */

function showDocument() {
  if (!authenticationVerified) {
    throw new Error(
      "Security blocked document display: RPC verification not completed."
    );
  }

  const loading = $("loading");
  const error = $("errorState");
  const page = $("authenticationLetter");
  const printButton = $("printButton");

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

  if (printButton) {
    printButton.disabled = false;
  }
}

function showError(title, details = "") {
  console.error(
    "[GAAWOW AUTH LETTER]",
    title,
    details
  );

  /* Always lock the document on failure. */

  authenticationVerified = false;
  verifiedRPCData = null;

  const loading = $("loading");
  const page = $("authenticationLetter");
  const error = $("errorState");
  const message = $("errorMessage");
  const detail = $("errorDetails");
  const printButton = $("printButton");

  if (loading) {
    loading.hidden = true;
    loading.style.display = "none";
  }

  if (page) {
    page.hidden = true;
    page.style.display = "none";
    page.style.visibility = "hidden";
  }

  if (printButton) {
    printButton.disabled = true;
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

/* ================= URL PARAMETERS ================= */

function getParams() {
  const params = new URLSearchParams(
    window.location.search
  );

  return {
    regen: params.get("regen"),
    id: params.get("id"),
    code: params.get("code"),
    record_id: params.get("record_id")
  };
}

/* ================= SUPABASE ================= */

function getSupabase() {
  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    throw new Error(
      "Supabase JavaScript library lama soo load-gareyn. Hubi internet-ka."
    );
  }

  return window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          "X-Client-Info": "gaawow-auth-letter-" + AUTH_VERSION
        }
      }
    }
  );
}

/* ================= LOAD CERTIFICATE ================= */

async function loadCertificate(supabase, params) {
  const explicitRecordId = firstAvailable(
    params.regen,
    params.record_id
  );

  let query;

  if (explicitRecordId) {
    query = supabase
      .from("certificates")
      .select("*")
      .eq("id", explicitRecordId);
  } else if (params.id) {
    query = supabase
      .from("certificates")
      .select("*")
      .eq("certificate_id", params.id);
  } else if (params.code) {
    query = supabase
      .from("certificates")
      .select("*")
      .eq("verify_code", params.code);
  } else {
    query = supabase
      .from("certificates")
      .select("*")
      .eq("id", CERTIFICATE_RECORD_ID);
  }

  const result = await query.maybeSingle();

  if (result.error) {
    throw new Error(
      "Certificate record lama akhrin karin: " +
      result.error.message
    );
  }

  if (!result.data) {
    throw new Error(
      "Authentication Letter record lama helin."
    );
  }

  return result.data;
}

/* ================= DOCUMENT TYPE ================= */

function isAuthenticationLetter(record) {
  const type = String(
    record?.certificate_type || ""
  )
    .trim()
    .toLowerCase();

  const id = String(
    record?.certificate_id || ""
  )
    .trim()
    .toUpperCase();

  const number = String(
    record?.certificate_no || ""
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

/* ================= RPC VERIFICATION ================= */

/*
 * IMPORTANT:
 *
 * Your SQL test uses:
 *
 * verify_authentication_letter(
 *   c.verify_code,
 *   c.id::text
 * )
 *
 * Therefore p_id MUST receive record.id.
 * It must NOT receive record.certificate_id.
 */

async function verifyRPC(supabase, record) {
  if (!record?.id || !record?.verify_code) {
    throw new Error(
      "Certificate UUID ama verification code ayaa maqan."
    );
  }

  console.log(
    "[AUTH LETTER] Starting official RPC verification."
  );

  let result;

  try {
    result = await supabase.rpc(
      "verify_authentication_letter",
      {
        p_code: record.verify_code,
        p_id: String(record.id)
      }
    );
  } catch (error) {
    throw new Error(
      "RPC connection failure: " +
      (error?.message || String(error))
    );
  }

  if (result.error) {
    throw new Error(
      "Supabase RPC verification failed: " +
      result.error.message
    );
  }

  const data = result.data;

  let verifiedData = null;

  if (Array.isArray(data)) {
    if (data.length !== 1) {
      throw new Error(
        "RPC verification returned an unexpected number of records."
      );
    }

    verifiedData = data[0];
  } else if (
    data &&
    typeof data === "object"
  ) {
    verifiedData = data;
  }

  if (!verifiedData) {
    throw new Error(
      "RPC did not return a valid verification record."
    );
  }

  return verifiedData;
}

/* ================= VALIDATE RPC RESULT ================= */

function validateRPCResult(data, record) {
  if (!data || !record) {
    throw new Error(
      "Verification data is missing."
    );
  }

  /* 1. VERIFICATION CODE */

  const rpcCode = String(
    data.verification_code || ""
  ).trim();

  const recordCode = String(
    record.verify_code || ""
  ).trim();

  if (!rpcCode || rpcCode !== recordCode) {
    throw new Error(
      "Verification code mismatch. Document rejected."
    );
  }

  /* 2. AUTHENTICATION ID */

  const rpcId = String(
    data.authentication_id || ""
  ).trim();

  const recordId = String(
    record.certificate_id || ""
  ).trim();

  if (!rpcId || rpcId !== recordId) {
    throw new Error(
      "Authentication ID mismatch. Document rejected."
    );
  }

  /* 3. DOCUMENT STATUS */

  const status = String(
    data.status || ""
  )
    .trim()
    .toLowerCase();

  if (status !== "valid") {
    throw new Error(
      "This Authentication Letter is not valid. Status: " +
      safeText(data.status)
    );
  }

  /* 4. REFERENCE NUMBER */

  if (!data.reference_no) {
    throw new Error(
      "Official reference number missing from RPC."
    );
  }

  /* 5. STUDENT IDENTITY */

  if (!data.student_id || !data.student_name) {
    throw new Error(
      "Student identity information is incomplete."
    );
  }

  /* 6. COURSE */

  if (!data.course_name) {
    throw new Error(
      "Course information missing from RPC."
    );
  }

  /* 7. VERIFICATION URL */

  if (!data.verification_url) {
    throw new Error(
      "Official verification URL missing from RPC."
    );
  }

  let parsedURL;

  try {
    parsedURL = new URL(data.verification_url);
  } catch (error) {
    throw new Error(
      "RPC returned an invalid verification URL."
    );
  }

  if (parsedURL.protocol !== "https:") {
    throw new Error(
      "Verification URL must use HTTPS."
    );
  }

  const urlCode = parsedURL.searchParams.get("code");

  if (urlCode !== rpcCode) {
    throw new Error(
      "QR verification URL does not match the verified code."
    );
  }

  /* ALL CHECKS PASSED */

  console.log(
    "[AUTH LETTER] RPC VALIDATION PASSED.",
    {
      reference_no: data.reference_no,
      authentication_id: rpcId,
      student_id: data.student_id,
      status: status,
      verification_url: data.verification_url
    }
  );

  return true;
}

/* ================= VERIFICATION URL ================= */

function buildVerificationURL(record, rpcData) {
  const url = String(
    rpcData?.verification_url || ""
  ).trim();

  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") {
      return null;
    }

    if (
      parsed.searchParams.get("code") !==
      String(rpcData.verification_code)
    ) {
      return null;
    }

    return url;
  } catch (error) {
    return null;
  }
}

/* ================= RENDER CERTIFICATE ================= */

function renderCertificate(record, rpcData) {
  const fields = [
    ["studentName", rpcData.student_name],
    ["courseName", rpcData.course_name],
    ["referenceNo", rpcData.reference_no],
    ["authenticationId", rpcData.authentication_id],
    ["verificationCode", rpcData.verification_code],
    ["issueDate", rpcData.issue_date],
    ["expiryDate", rpcData.expiry_date]
  ];

  for (const [id, value] of fields) {
    const element = $(id);

    if (element) {
      if (id === "issueDate" || id === "expiryDate") {
        element.textContent = formatDate(value);
      } else {
        element.textContent = safeText(value);
      }
    }
  }

  /* OFFICIAL DOCUMENT STATUS */

  if ($("status")) {
    $("status").textContent =
      String(rpcData.status).toUpperCase();
  }

  /* START DATE */

  if ($("dateStarted")) {
    $("dateStarted").textContent =
      formatDate(rpcData.date_started);
  }

  if ($("startDate")) {
    $("startDate").textContent =
      formatDate(rpcData.date_started);
  }

  /* COMPLETION DATE */

  const completionDate = rpcData.date_completed;

  const completionText = completionDate
    ? formatDate(completionDate)
    : "Not Completed";

  if ($("dateCompleted")) {
    $("dateCompleted").textContent = completionText;
  }

  if ($("completionDate")) {
    $("completionDate").textContent = completionText;
  }

  /* STUDENT ID */

  if ($("studentId")) {
    $("studentId").textContent =
      safeText(rpcData.student_id);
  }

  renderQR(rpcData);

  console.log(
    "[AUTH LETTER] Certificate rendered from verified RPC data."
  );
}

/* ================= STUDENT PHOTO ================= */

function setStudentPhoto(photoURL) {
  const photo = $("studentPhoto");
  const placeholder = $("photoPlaceholder");

  if (!photo) return;

  if (!photoURL) {
    photo.removeAttribute("src");
    photo.style.display = "none";

    if (placeholder) {
      placeholder.style.display = "flex";
    }

    return;
  }

  photo.src = photoURL;
  photo.style.display = "block";
}

/* ================= LOAD STUDENT ================= */

async function loadStudent(supabase, record) {
  if (!record?.student_id) {
    return null;
  }

  const result = await supabase
    .from("students")
    .select(
      "id,full_name,student_id,admission_date,photo_url"
    )
    .eq("id", record.student_id)
    .maybeSingle();

  if (result.error) {
    console.warn(
      "[AUTH LETTER] Student lookup unavailable:",
      result.error.message
    );

    return null;
  }

  return result.data || null;
}

/* ================= RENDER STUDENT ================= */

function renderStudent(student, rpcData) {
  const studentName = firstAvailable(
    rpcData?.student_name,
    student?.full_name
  );

  const studentId = firstAvailable(
    rpcData?.student_id,
    student?.student_id
  );

  const startDate = firstAvailable(
    rpcData?.date_started,
    student?.admission_date
  );

  if ($("studentName")) {
    $("studentName").textContent =
      safeText(studentName);
  }

  if ($("studentId")) {
    $("studentId").textContent =
      safeText(studentId);
  }

  if ($("dateStarted")) {
    $("dateStarted").textContent =
      formatDate(startDate);
  }

  if ($("startDate")) {
    $("startDate").textContent =
      formatDate(startDate);
  }

  /*
   * RPC date_completed is authoritative.
   * NULL means Not Completed.
   * Never invent a completion date.
   */

  const completed = rpcData?.date_completed;

  const completionText = completed
    ? formatDate(completed)
    : "Not Completed";

  if ($("dateCompleted")) {
    $("dateCompleted").textContent =
      completionText;
  }

  if ($("completionDate")) {
    $("completionDate").textContent =
      completionText;
  }

  setStudentPhoto(
    firstAvailable(
      rpcData?.student_photo_url,
      student?.photo_url
    )
  );
}

/* ================= QR CODE ================= */

function renderQR(rpcData) {
  const container = $("qrcode");

  if (!container) {
    console.warn(
      "[AUTH LETTER] QR container not found."
    );

    return;
  }

  container.replaceChildren();

  const url = buildVerificationURL(
    verifiedCertificate,
    rpcData
  );

  if (!url) {
    container.textContent =
      "QR verification unavailable";

    throw new Error(
      "Verified QR URL is unavailable."
    );
  }

  if (
    window.QRCode &&
    typeof window.QRCode === "function"
  ) {
    try {
      const level = window.QRCode.CorrectLevel
        ? window.QRCode.CorrectLevel.H
        : 2;

      new window.QRCode(container, {
        text: url,
        width: 145,
        height: 145,
        colorDark: "#0B1E63",
        colorLight: "#FFFFFF",
        correctLevel: level
      });

      return;
    } catch (error) {
      console.warn(
        "[AUTH LETTER] QR library failed:",
        error
      );
    }
  }

  /* QR IMAGE FALLBACK */

  const image = document.createElement("img");

  image.src =
    "https://api.qrserver.com/v1/create-qr-code/" +
    "?size=180x180&data=" +
    encodeURIComponent(url);

  image.alt =
    "GAAWOW Academy Authentication Verification QR";

  image.width = 145;
  image.height = 145;

  Object.assign(image.style, {
    display: "block",
    width: "145px",
    height: "145px",
    objectFit: "contain"
  });

  image.onerror = function () {
    container.replaceChildren();

    const message = document.createElement("span");

    message.textContent = "QR unavailable";

    container.appendChild(message);
  };

  container.appendChild(image);
}

/* ================= ACADEMIC RESULTS ================= */

function normalizeAcademicResult(row) {
  const score = numericScore(
    firstAvailable(
      row.score,
      row.marks,
      row.total_score,
      row.mark,
      row.points,
      row.percentage
    )
  );

  const subject = firstAvailable(
    row.subject_name,
    row.subject,
    row.name,
    row.title
  );

  const grade = firstAvailable(
    row.grade,
    row.grade_name
  ) || calculateGrade(score);

  return {
    subject: subject || "Subject",
    score,
    grade
  };
}

/* ================= RENDER ACADEMIC RESULTS ================= */

function renderAcademicResults(rpcData) {
  const container = $("academicResults");

  if (!container) return;

  const rows = Array.isArray(rpcData?.academic_results)
    ? rpcData.academic_results
    : [];

  const summary = rpcData?.summary || {};

  if (!rows.length) {
    container.innerHTML =
      '<div class="no-results">No published academic results available.</div>';

    return;
  }

  const normalizedRows = rows.map(
    normalizeAcademicResult
  );

  let total = 0;
  let count = 0;

  for (const row of normalizedRows) {
    if (row.score !== null) {
      total += row.score;
      count++;
    }
  }

  const average = firstAvailable(
    summary.average,
    count > 0
      ? (total / count).toFixed(2)
      : null
  );

  const overallGrade = firstAvailable(
    summary.overall_grade,
    "N/A"
  );

  const finalResult = firstAvailable(
    summary.final_result,
    "N/A"
  );

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

  for (const row of normalizedRows) {
    html += `
      <tr>
        <td>${escapeHTML(row.subject)}</td>
        <td>${
          row.score === null
            ? "N/A"
            : escapeHTML(row.score)
        }</td>
        <td>${escapeHTML(row.grade)}</td>
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
    </div>

    <div class="results-summary">
      <p>
        <strong>Published Subjects:</strong>
        ${normalizedRows.length}
      </p>

      <p>
        <strong>Average:</strong>
        ${escapeHTML(average)}%
      </p>

      <p>
        <strong>Overall Grade:</strong>
        ${escapeHTML(overallGrade)}
      </p>

      <p>
        <strong>Final Academic Result:</strong>
        ${escapeHTML(finalResult)}
      </p>
    </div>
  `;

  container.innerHTML = html;

  console.log(
    "[AUTH LETTER] Academic results rendered:",
    {
      published_subjects: normalizedRows.length,
      average,
      overall_grade: overallGrade,
      final_result: finalResult
    }
  );
}

/* ================= REMOVE LOCATION ================= */

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

/* ================= PRINT ================= */

function setupPrint() {
  const button = $("printButton");

  if (!button) return;

  button.disabled = true;

  if (button.dataset.printReady === "true") {
    return;
  }

  button.dataset.printReady = "true";

  button.addEventListener("click", function () {
    if (
      !authenticationVerified ||
      !verifiedRPCData ||
      !verifiedCertificate
    ) {
      console.error(
        "[AUTH LETTER] Printing blocked: verification incomplete."
      );

      return;
    }

    window.print();
  });
}

/* ================= RETRY ================= */

function setupRetry() {
  const button = $("retryButton");

  if (
    !button ||
    button.dataset.retryReady === "true"
  ) {
    return;
  }

  button.dataset.retryReady = "true";

  button.addEventListener("click", function () {
    window.location.reload();
  });
}

/* ================= START ================= */

async function start() {
  console.log(
    "GAAWOW AUTHENTICATION LETTER " + AUTH_VERSION
  );

  /* LOCK BEFORE ANY DATABASE OPERATION */

  lockDocument();

  try {
    setupPrint();
    setupRetry();
    setupOfficialBranding();

    /* 1. CONNECT TO SUPABASE */

    const supabase = getSupabase();

    const params = getParams();

    console.log(
      "[AUTH LETTER] URL PARAMETERS:",
      params
    );

    /* 2. LOAD CERTIFICATE */

    const record = await loadCertificate(
      supabase,
      params
    );

    verifiedCertificate = record;

    console.log(
      "[AUTH LETTER] RECORD SELECTED:",
      {
        id: record.id,
        certificate_no: record.certificate_no,
        certificate_id: record.certificate_id,
        certificate_type: record.certificate_type
      }
    );

    /* 3. CHECK DOCUMENT TYPE */

    if (!isAuthenticationLetter(record)) {
      throw new Error(
        "This record is not an Authentication Letter."
      );
    }

    /* 4. RPC VERIFICATION */

    const rpcData = await verifyRPC(
      supabase,
      record
    );

    /* 5. VALIDATE ALL RPC FIELDS */

    validateRPCResult(
      rpcData,
      record
    );

    /* 6. SAVE VERIFIED DATA */

    verifiedRPCData = rpcData;

    verificationURL = buildVerificationURL(
      record,
      rpcData
    );

    if (!verificationURL) {
      throw new Error(
        "Official QR verification URL could not be validated."
      );
    }

    authenticationVerified = true;

    console.log(
      "[AUTH LETTER] AUTHENTICATION SUCCESS",
      {
        reference_no: rpcData.reference_no,
        authentication_id: rpcData.authentication_id,
        verification_code: rpcData.verification_code,
        document_status: rpcData.status,
        verification_url: verificationURL
      }
    );

    /* 7. LOAD STUDENT DETAILS */

    let student = null;

    try {
      student = await loadStudent(
        supabase,
        record
      );
    } catch (error) {
      console.warn(
        "[AUTH LETTER] Student lookup unavailable:",
        error.message
      );
    }

    /* 8. RENDER VERIFIED CERTIFICATE */

    renderCertificate(
      record,
      rpcData
    );

    /* 9. RENDER STUDENT */

    renderStudent(
      student,
      rpcData
    );

    /* 10. RENDER RPC ACADEMIC RESULTS */

    renderAcademicResults(
      rpcData
    );

    /* 11. REMOVE UNWANTED LOCATION */

    removeFounderLocation();

    /* 12. FINAL SECURITY CHECK */

    if (
      !authenticationVerified ||
      !verifiedRPCData ||
      verifiedRPCData.status.toLowerCase() !== "valid"
    ) {
      throw new Error(
        "Final verification check failed."
      );
    }

    /* 13. SHOW DOCUMENT */

    showDocument();

    console.log(
      "[AUTH LETTER] READY",
      {
        version: AUTH_VERSION,
        verification: "PASS",
        document_status: "VALID",
        academic_result:
          rpcData.summary?.final_result || "N/A",
        completion_status:
          rpcData.date_completed
            ? "COMPLETED"
            : "NOT COMPLETED"
      }
    );

  } catch (error) {
    console.error(
      "[AUTH LETTER] FATAL ERROR:",
      error
    );

    showError(
      "Authentication Letter lama soo bandhigi karin.",
      error?.message ||
      "Verification failed. Please check your internet connection and try again."
    );
  }
}

/* ================= BOOT ================= */

function bootAuthenticationLetter() {
  start();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    bootAuthenticationLetter,
    { once: true }
  );
} else {
  bootAuthenticationLetter();
}
