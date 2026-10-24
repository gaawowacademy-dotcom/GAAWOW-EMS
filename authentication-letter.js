"use strict";

/* =========================================================
   GAAWOW ACADEMY EMS
   AUTHENTICATION LETTER
   COMPLETE FRONTEND VERSION
   VERSION: 20261024-4
   ========================================================= */

/* ================= SUPABASE CONFIG ================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const CERTIFICATE_RECORD_ID =
  "c7366afd-5d9b-475b-af84-6c4a4c0dc8b9";

const VERIFICATION_PAGE =
  "https://gaawowacademy-dotcom.github.io/GAAWOW-EMS/verify-auth.html";

const OFFICIAL_LOGO_PATH = "logo.png";

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
  if (!value) return "N/A";

  /*
   * Parse YYYY-MM-DD as a local calendar date.
   * This avoids displaying the previous day in
   * some time zones.
   */
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
   OFFICIAL BRANDING
   ========================================================= */

function setupOfficialBranding() {
  const logoPath = OFFICIAL_LOGO_PATH;

  /* 1. DOCUMENT WATERMARK */

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

    watermarkLogo.onerror = function () {
      console.error(
        "[AUTH LETTER] Watermark logo not found:",
        logoPath
      );
    };
  }

  /* 2. HEADER LOGO */

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

    logo.onerror = function () {
      console.error(
        "[AUTH LETTER] Header logo not found:",
        logoPath
      );
    };

    headerSeal.appendChild(logo);

    headerSeal.setAttribute(
      "aria-label",
      "Official GAAWOW Academy Logo"
    );

    headerSeal.classList.add(
      "gaawow-official-logo-seal"
    );
  }

  /* 3. OFFICIAL STAMP */

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

    logo.onerror = function () {
      console.error(
        "[AUTH LETTER] Stamp logo not found:",
        logoPath
      );
    };

    const label = document.createElement("span");

    label.className = "official-stamp-label";
    label.textContent = "OFFICIAL";

    stamp.append(logo, label);
  }

  /* 4. STUDENT PHOTO FALLBACK */

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

    if (
      studentPhoto.complete &&
      studentPhoto.naturalWidth > 0
    ) {
      studentPhoto.style.display = "block";

      if (photoPlaceholder) {
        photoPlaceholder.style.display = "none";
      }
    }
  }

  console.log(
    "[AUTH LETTER] Official branding initialized."
  );
}

/* ================= PAGE STATE ================= */

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
      "Supabase JavaScript library lama soo load-gareyn."
    );
  }

  return window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}

/* ================= LOAD CERTIFICATE ================= */

async function loadCertificate(supabase, params) {
  const explicitRecordId = firstAvailable(
    params.regen,
    params.record_id
  );

  /* 1. RECORD UUID */

  if (explicitRecordId) {
    const result = await supabase
      .from("certificates")
      .select("*")
      .eq("id", explicitRecordId)
      .limit(1)
      .maybeSingle();

    if (result.error) throw result.error;

    if (result.data) {
      return result.data;
    }
  }

  /* 2. CERTIFICATE ID */

  if (params.id) {
    const result = await supabase
      .from("certificates")
      .select("*")
      .eq("certificate_id", params.id)
      .limit(1)
      .maybeSingle();

    if (result.error) throw result.error;

    if (result.data) {
      return result.data;
    }
  }

  /* 3. VERIFICATION CODE */

  if (params.code) {
    const result = await supabase
      .from("certificates")
      .select("*")
      .eq("verify_code", params.code)
      .limit(1)
      .maybeSingle();

    if (result.error) throw result.error;

    if (result.data) {
      return result.data;
    }
  }

  /* 4. DEFAULT RECORD */

  const result = await supabase
    .from("certificates")
    .select("*")
    .eq("id", CERTIFICATE_RECORD_ID)
    .limit(1)
    .maybeSingle();

  if (result.error) throw result.error;

  if (!result.data) {
    throw new Error(
      "Official Authentication Letter record lama helin."
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

/* ================= VERIFICATION URL ================= */

function buildVerificationURL(record) {
  const verifyCode = String(
    record?.verify_code || ""
  ).trim();

  const certificateId = String(
    record?.certificate_id || ""
  ).trim();

  if (!verifyCode || !certificateId) {
    return null;
  }

  return (
    VERIFICATION_PAGE +
    "?code=" +
    encodeURIComponent(verifyCode) +
    "&id=" +
    encodeURIComponent(certificateId)
  );
}

/* ================= RENDER CERTIFICATE ================= */

function renderCertificate(record) {
  if ($("studentName")) {
    $("studentName").textContent =
      safeText(record.student_name_snapshot);
  }

  if ($("courseName")) {
    $("courseName").textContent =
      safeText(record.course_name_snapshot);
  }

  if ($("referenceNo")) {
    $("referenceNo").textContent =
      safeText(record.certificate_no);
  }

  if ($("authenticationId")) {
    $("authenticationId").textContent =
      safeText(record.certificate_id);
  }

  if ($("verificationCode")) {
    $("verificationCode").textContent =
      safeText(record.verify_code);
  }

  if ($("issueDate")) {
    $("issueDate").textContent =
      formatDate(
        record.issue_date || record.created_at
      );
  }

  if ($("expiryDate")) {
    $("expiryDate").textContent =
      formatDate(record.expiry_date);
  }

  if ($("status")) {
    $("status").textContent =
      safeText(record.status).toUpperCase();
  }

  /*
   * The real completion date is loaded from
   * enrollments.end_date or classes.end_date.
   * It is rendered after the student lookup.
   */

  if ($("dateCompleted")) {
    $("dateCompleted").textContent = "N/A";
  }

  if ($("completionDate")) {
    $("completionDate").textContent = "N/A";
  }

  renderQR(record);
}

/* ================= LOAD STUDENT ================= */

async function loadStudent(supabase, record) {
  if (!record?.student_id) {
    console.warn(
      "[AUTH LETTER] Certificate has no student_id."
    );

    return null;
  }

  const result = await supabase
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
      result.error.message
    );

    return null;
  }

  return result.data || null;
}

/* ================= LOAD COURSE COMPLETION DATE ================= */

/*
 * Priority:
 * 1. enrollments.end_date
 * 2. classes.end_date
 *
 * The function does not invent a date.
 */

async function loadCompletionDate(
  supabase,
  record,
  student
) {
  const studentId =
    record?.student_id || student?.id;

  if (!studentId) {
    console.warn(
      "[AUTH LETTER] Student ID missing; cannot load completion date."
    );

    return null;
  }

  try {
    /* 1. LOAD ENROLLMENTS */

    const enrollmentResult = await supabase
      .from("enrollments")
      .select("id,student_id,class_id,end_date")
      .eq("student_id", studentId);

    if (enrollmentResult.error) {
      console.warn(
        "[AUTH LETTER] Enrollment query failed:",
        enrollmentResult.error.message
      );
    }

    const enrollments = enrollmentResult.data || [];

    /*
     * Prefer an enrollment that has an end date.
     * If there are multiple dated enrollments, this
     * uses the latest end date.
     */

    const datedEnrollments = enrollments
      .filter(enrollment => enrollment.end_date)
      .sort((a, b) => {
        return String(b.end_date).localeCompare(
          String(a.end_date)
        );
      });

    if (datedEnrollments.length > 0) {
      const completionDate =
        datedEnrollments[0].end_date;

      console.log(
        "[AUTH LETTER] Completion date source: enrollments.end_date",
        completionDate
      );

      return completionDate;
    }

    /* 2. CHECK THE ENROLLED CLASSES */

    const classIds = [
      ...new Set(
        enrollments
          .map(enrollment => enrollment.class_id)
          .filter(Boolean)
      )
    ];

    /*
     * If the certificate has a class_id, include it
     * as a possible class reference.
     */

    if (record?.class_id) {
      classIds.push(record.class_id);
    }

    const uniqueClassIds = [...new Set(classIds)];

    const classEndDates = [];

    for (const classId of uniqueClassIds) {
      const classResult = await supabase
        .from("classes")
        .select("id,end_date")
        .eq("id", classId)
        .maybeSingle();

      if (classResult.error) {
        console.warn(
          "[AUTH LETTER] Class query failed:",
          classResult.error.message
        );

        continue;
      }

      if (classResult.data?.end_date) {
        classEndDates.push(
          classResult.data.end_date
        );
      }
    }

    if (classEndDates.length > 0) {
      classEndDates.sort((a, b) => {
        return String(b).localeCompare(String(a));
      });

      const completionDate = classEndDates[0];

      console.log(
        "[AUTH LETTER] Completion date source: classes.end_date",
        completionDate
      );

      return completionDate;
    }

    console.warn(
      "[AUTH LETTER] No end_date found for this student's enrollment or class."
    );

    return null;
  } catch (error) {
    console.error(
      "[AUTH LETTER] Completion date lookup failed:",
      error
    );

    return null;
  }
}

/* ================= RENDER STUDENT ================= */

function renderStudent(
  student,
  completionDate = null
) {
  if (!student) {
    console.warn(
      "[AUTH LETTER] Student record unavailable."
    );

    return;
  }

  /* STUDENT NAME */

  if ($("studentName")) {
    $("studentName").textContent =
      safeText(student.full_name);
  }

  /* STUDENT ID */

  if ($("studentId")) {
    $("studentId").textContent =
      safeText(student.student_id);
  }

  /* ADMISSION / START DATE */

  if ($("dateStarted")) {
    $("dateStarted").textContent =
      formatDate(student.admission_date);
  }

  if ($("startDate")) {
    $("startDate").textContent =
      formatDate(student.admission_date);
  }

  /* COURSE COMPLETION DATE */

  if ($("dateCompleted")) {
    $("dateCompleted").textContent =
      formatDate(completionDate);
  }

  if ($("completionDate")) {
    $("completionDate").textContent =
      formatDate(completionDate);
  }

  /* STUDENT PHOTO */

  if ($("studentPhoto")) {
    if (student.photo_url) {
      $("studentPhoto").src = student.photo_url;
      $("studentPhoto").style.display = "block";
    } else {
      $("studentPhoto").removeAttribute("src");
      $("studentPhoto").style.display = "none";

      if ($("photoPlaceholder")) {
        $("photoPlaceholder").style.display = "flex";
      }
    }
  }

  console.log(
    "[AUTH LETTER] STUDENT DATE CHECK:",
    {
      student_id: student.student_id || null,
      admission_date:
        student.admission_date || null,
      completion_date: completionDate || null
    }
  );
}

/* ================= RPC VERIFICATION ================= */

async function verifyRPC(supabase, record) {
  try {
    const result = await supabase.rpc(
      "verify_authentication_letter",
      {
        p_code: record.verify_code,
        p_id: record.certificate_id
      }
    );

    if (result.error) {
      console.warn(
        "[AUTH LETTER] RPC:",
        result.error.message
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

/* ================= RENDER RPC DATA ================= */

function renderRPC(data, record) {
  if (!data) return;

  const rpcCode = String(
    data.verification_code || ""
  ).trim();

  const rpcId = String(
    data.authentication_id || ""
  ).trim();

  const recordCode = String(
    record?.verify_code || ""
  ).trim();

  const recordId = String(
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

  const fields = [
    ["referenceNo", "reference_no"],
    ["authenticationId", "authentication_id"],
    ["verificationCode", "verification_code"],
    ["studentName", "student_name"],
    ["courseName", "course_name"],
    ["issueDate", "issue_date"],
    ["expiryDate", "expiry_date"],
    ["status", "status"]
  ];

  for (const [elementId, field] of fields) {
    const element = $(elementId);

    if (
      element &&
      data[field] !== null &&
      data[field] !== undefined &&
      data[field] !== ""
    ) {
      element.textContent =
        ["issueDate", "expiryDate"].includes(elementId)
          ? formatDate(data[field])
          : (
              elementId === "status"
                ? String(data[field]).toUpperCase()
                : String(data[field])
            );
    }
  }

  if (
    $("studentPhoto") &&
    data.student_photo_url
  ) {
    $("studentPhoto").src =
      data.student_photo_url;

    $("studentPhoto").style.display = "block";
  }

  renderQR(record);
}

/* ================= QR CODE ================= */

function renderQR(record) {
  const container = $("qrcode");

  if (!container) {
    console.warn(
      "[AUTH LETTER] QR container #qrcode lama helin."
    );

    return;
  }

  container.innerHTML = "";

  const verifyCode = String(
    record?.verify_code || ""
  ).trim();

  const certificateId = String(
    record?.certificate_id || ""
  ).trim();

  if (!verifyCode || !certificateId) {
    container.textContent =
      "QR verification unavailable";

    return;
  }

  const verificationURL =
    buildVerificationURL(record);

  if (!verificationURL) {
    container.textContent =
      "Verification URL unavailable";

    return;
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
        text: verificationURL,
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

  /*
   * Fallback QR image service.
   * This requires an internet connection.
   */

  const image = document.createElement("img");

  image.src =
    "https://api.qrserver.com/v1/create-qr-code/" +
    "?size=180x180&data=" +
    encodeURIComponent(verificationURL);

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
    container.textContent = "QR unavailable";
  };

  container.appendChild(image);
}

/* ================= SUBJECT NAMES ================= */

async function loadSubjectNames(supabase, rows) {
  const subjectIds = [
    ...new Set(
      rows
        .map(row => row.subject_id)
        .filter(Boolean)
    )
  ];

  if (!subjectIds.length) {
    return {};
  }

  try {
    const result = await supabase
      .from("subjects")
      .select("*")
      .in("id", subjectIds);

    if (result.error) {
      console.warn(
        "[AUTH LETTER] Subjects query:",
        result.error.message
      );

      return {};
    }

    const map = {};

    for (const subject of result.data || []) {
      const name = firstAvailable(
        subject.name,
        subject.subject_name,
        subject.title,
        subject.subject,
        subject.code
      );

      if (name) {
        map[String(subject.id)] = name;
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

/* ================= ACADEMIC RESULTS ================= */

async function loadResults(supabase, record) {
  const container = $("academicResults");

  if (!container || !record?.student_id) {
    return;
  }

  try {
    const result = await supabase
      .from("results")
      .select("*")
      .eq("student_id", record.student_id)
      .eq("is_published", true);

    if (result.error) {
      console.warn(
        "[AUTH LETTER] Results:",
        result.error.message
      );

      return;
    }

    const rows = result.data || [];

    if (!rows.length) {
      container.innerHTML =
        '<div class="no-results">No published academic results available.</div>';

      return;
    }

    const subjectMap = await loadSubjectNames(
      supabase,
      rows
    );

    const normalizedRows = rows.map(row => {
      const score = numericScore(
        firstAvailable(
          row.score,
          row.marks,
          row.total_score,
          row.mark,
          row.points
        )
      );

      let subjectName = firstAvailable(
        row.subject_name,
        row.subject,
        row.name
      );

      if (
        !subjectName &&
        row.subject_id
      ) {
        subjectName =
          subjectMap[String(row.subject_id)];
      }

      const grade =
        firstAvailable(
          row.grade,
          row.grade_name
        ) || calculateGrade(score);

      return {
        subject: subjectName || "Subject",
        score,
        grade,
        raw: row
      };
    });

    normalizedRows.sort((a, b) => {
      const aOrder = Number(
        a.raw?.subject_order ??
        a.raw?.order_no ??
        a.raw?.sort_order ??
        9999
      );

      const bOrder = Number(
        b.raw?.subject_order ??
        b.raw?.order_no ??
        b.raw?.sort_order ??
        9999
      );

      return aOrder - bOrder;
    });

    const scoredRows = normalizedRows.filter(
      row => row.score !== null
    );

    const total = scoredRows.reduce(
      (sum, row) => sum + row.score,
      0
    );

    const maxTotal =
      scoredRows.length * 100;

    const percentage = maxTotal > 0
      ? (total / maxTotal) * 100
      : null;

    const overallGrade =
      percentage !== null
        ? calculateGrade(percentage)
        : "N/A";

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
      <tr class="results-total-row">
        <td><strong>TOTAL</strong></td>
        <td>
          <strong>${escapeHTML(total)} / ${escapeHTML(maxTotal)}</strong>
        </td>
        <td><strong>${escapeHTML(overallGrade)}</strong></td>
      </tr>
    `;

    if (percentage !== null) {
      html += `
        <tr class="results-percentage-row">
          <td colspan="2">
            <strong>OVERALL PERCENTAGE</strong>
          </td>
          <td>
            <strong>${percentage.toFixed(1)}%</strong>
          </td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

    console.log(
      "[AUTH LETTER] Academic Results:",
      {
        subjects: normalizedRows.length,
        total,
        maxTotal,
        percentage,
        grade: overallGrade
      }
    );
  } catch (error) {
    console.warn(
      "[AUTH LETTER] Academic results exception:",
      error
    );
  }
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

  if (
    !button ||
    button.dataset.printReady === "true"
  ) {
    return;
  }

  button.dataset.printReady = "true";

  button.addEventListener("click", function () {
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
    "GAAWOW AUTHENTICATION LETTER 20261024-4"
  );

  try {
    setupPrint();
    setupRetry();
    setupOfficialBranding();

    const supabase = getSupabase();
    const params = getParams();

    console.log(
      "[AUTH LETTER] URL PARAMETERS:",
      params
    );

    /* 1. LOAD CERTIFICATE */

    const record = await loadCertificate(
      supabase,
      params
    );

    console.log(
      "[AUTH LETTER] SELECTED RECORD:",
      {
        id: record.id,
        certificate_no: record.certificate_no,
        certificate_id: record.certificate_id,
        verify_code: record.verify_code,
        certificate_type: record.certificate_type
      }
    );

    /* 2. VALIDATE DOCUMENT TYPE */

    if (!isAuthenticationLetter(record)) {
      throw new Error(
        "Record-kan ma aha Authentication Letter."
      );
    }

    /* 3. CHECK STATUS */

    if (
      record.status &&
      String(record.status).toLowerCase() !== "valid"
    ) {
      console.warn(
        "[AUTH LETTER] Document status:",
        record.status
      );
    }

    /* 4. RENDER CERTIFICATE */

    renderCertificate(record);

    removeFounderLocation();

    showDocument();

    /* 5. LOAD STUDENT */

    const student = await loadStudent(
      supabase,
      record
    );

    /* 6. LOAD REAL COMPLETION DATE */

    const completionDate = await loadCompletionDate(
      supabase,
      record,
      student
    );

    /* 7. RENDER STUDENT AND DATES */

    renderStudent(
      student,
      completionDate
    );

    console.log(
      "[AUTH LETTER] DATE CHECK:",
      {
        admission_date:
          student?.admission_date || null,
        completion_date:
          completionDate || null
      }
    );

    /* 8. VERIFY AUTHENTICATION LETTER */

    const verified = await verifyRPC(
      supabase,
      record
    );

    renderRPC(
      verified,
      record
    );

    /*
     * Render the completion date again after RPC.
     * This ensures that the RPC rendering does not
     * accidentally replace the course completion date.
     */

    if ($("dateCompleted")) {
      $("dateCompleted").textContent =
        formatDate(completionDate);
    }

    if ($("completionDate")) {
      $("completionDate").textContent =
        formatDate(completionDate);
    }

    /* 9. LOAD ACADEMIC RESULTS */

    await loadResults(
      supabase,
      record
    );

    /* 10. FINALIZE DOCUMENT */

    renderQR(record);

    removeFounderLocation();

    console.log(
      "[AUTH LETTER] READY"
    );

    console.log(
      "[AUTH LETTER] FINAL VERIFICATION:",
      buildVerificationURL(record)
    );
  } catch (error) {
    console.error(
      "[AUTH LETTER] FATAL ERROR:",
      error
    );

    showError(
      "Authentication Letter lama soo bandhigi karin.",
      error?.message || String(error)
    );
  }
}

/* ================= BOOT ================= */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContent
