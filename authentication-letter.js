
(() => {
  "use strict";

  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjAi5g_RqLCs145";
  const RPC_NAME = "verify_authentication_letter";

  const $ = (id) => document.getElementById(id);

  const params = new URLSearchParams(window.location.search);
  const code = (params.get("code") || "").trim();
  const recordId = (params.get("id") || "").trim();

  function showError(message, details = "") {
    $("loading").hidden = true;
    $("authenticationLetter").hidden = true;
    $("errorState").hidden = false;
    $("errorMessage").textContent = message;
    $("errorDetails").textContent = details;
  }

  function text(id, value, fallback = "—") {
    const el = $(id);
    if (!el) return;

    el.textContent =
      value === null || value === undefined || value === ""
        ? fallback
        : String(value);
  }

  function formatDate(value, fallback = "—") {
    if (!value) return fallback;

    const raw = String(value).slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);

    if (!match) return fallback;

    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function safeHttpsUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function addCell(row, value, className = "") {
    const cell = document.createElement("td");

    cell.textContent =
      value === null || value === undefined || value === ""
        ? "—"
        : String(value);

    if (className) cell.className = className;

    row.appendChild(cell);
  }

  function renderResults(results) {
    const body = $("academicResults");
    body.replaceChildren();

    if (!Array.isArray(results) || results.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 7;
      cell.className = "empty-row";
      cell.textContent =
        "No published final assessment results are available. Academic result is PENDING.";

      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    results.forEach((item, index) => {
      const row = document.createElement("tr");

      const subject =
        item.subject_name ||
        item.exam_title ||
        item.subject ||
        "Unnamed subject";

      const score = item.score ?? "—";
      const maxScore = item.max_score ?? "—";
      const grade = item.grade || "—";

      const resultText =
        item.remarks ||
        (String(grade).trim().toUpperCase() === "F"
          ? "FAIL"
          : "RECORDED");

      const normalizedResult = String(resultText).toUpperCase();

      const resultClass =
        normalizedResult.includes("FAIL")
          ? "result-fail"
          : normalizedResult.includes("PASS")
            ? "result-pass"
            : "";

      addCell(row, index + 1);
      addCell(row, subject);
      addCell(row, formatDate(item.exam_date));
      addCell(row, score);
      addCell(row, maxScore);
      addCell(row, grade);
      addCell(row, resultText, resultClass);

      body.appendChild(row);
    });
  }

  function renderSummary(summary, results) {
    const hasPublishedResults =
      Array.isArray(results) && results.length > 0;

    const panel = $("summaryPanel");
    panel.hidden = false;

    // No published final results: never display FAIL or zero scores.
    if (!hasPublishedResults) {
      text("summarySubjects", "0");
      text("summaryScore", "N/A");
      text("summaryAverage", "N/A");
      text("summaryGrade", "N/A");
      text("summaryFailed", "0");
      text("summaryFinal", "PENDING");

      $("summaryFinal").className = "result-pending";
      return;
    }

    const s =
      summary && typeof summary === "object"
        ? summary
        : {};

    text("summarySubjects", s.subjects_count ?? results.length);

    const totalScore = s.total_score;
    const totalMaxScore = s.total_max_score;

    text(
      "summaryScore",
      totalScore !== null &&
      totalScore !== undefined &&
      totalMaxScore !== null &&
      totalMaxScore !== undefined
        ? `${totalScore} / ${totalMaxScore}`
        : "N/A"
    );

    const average = s.average ?? s.percentage;

    text(
      "summaryAverage",
      average !== null && average !== undefined
        ? `${Number(average).toFixed(2)}%`
        : "N/A"
    );

    text("summaryGrade", s.overall_grade || "—");
    text("summaryFailed", s.failed_subjects ?? 0);
    text("summaryFinal", s.final_result || "—");

    const final = $("summaryFinal").textContent.trim().toUpperCase();

    $("summaryFinal").className =
      final === "PASS"
        ? "result-pass"
        : final === "FAIL"
          ? "result-fail"
          : final === "PENDING"
            ? "result-pending"
            : "";
  }

  function renderPhoto(urlValue) {
    const img = $("studentPhoto");
    const placeholder = $("photoPlaceholder");
    const url = safeHttpsUrl(urlValue);

    img.hidden = true;
    placeholder.hidden = false;

    if (!url) return;

    img.onload = () => {
      img.hidden = false;
      placeholder.hidden = true;
    };

    img.onerror = () => {
      img.hidden = true;
      placeholder.hidden = false;
    };

    img.src = url;
  }

  function renderQr(urlValue) {
    const url = safeHttpsUrl(urlValue);
    const qr = $("qrcode");

    qr.replaceChildren();

    if (!url) {
      $("verificationUrlText").textContent =
        "Official verification link is unavailable.";
      return;
    }

    $("verificationUrlText").textContent = url;

    // QR failure must not prevent the official letter from displaying.
    if (typeof QRCode === "undefined") {
      const note = document.createElement("span");
      note.textContent = "QR code unavailable. Use the verification link.";
      qr.appendChild(note);
      return;
    }

    try {
      new QRCode(qr, {
        text: url,
        width: 70,
        height: 70,
        colorDark: "#0B1E63",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (_) {
      qr.textContent = "QR unavailable";
    }
  }

  function renderStatus(status) {
    const value = String(status || "unknown").toLowerCase();

    text("status", value.replace(/_/g, " "));

    $("status").className =
      "status-pill status-" +
      value.replace(/[^a-z0-9_-]/g, "");

    return value;
  }

  function renderRecord(record) {
    if (!record || typeof record !== "object") {
      throw new Error(
        "The verification service returned an empty record."
      );
    }

    if (
      !record.verification_code ||
      String(record.verification_code).toUpperCase() !==
        code.toUpperCase()
    ) {
      throw new Error(
        "The returned verification code does not match the code in this link."
      );
    }

    text("referenceNo", record.reference_no);
    text("authenticationId", record.authentication_id);
    text("verificationCode", record.verification_code);

    text("studentName", record.student_name);
    text("studentId", record.student_id);
    text("courseName", record.course_name);

    text(
      "institutionName",
      record.institution_name,
      "GAAWOW ACADEMY"
    );

    text("admissionDate", formatDate(record.admission_date));
    text("dateStarted", formatDate(record.date_started));

    text(
      "dateCompleted",
      formatDate(record.date_completed, "Not Completed")
    );

    text("startDate", formatDate(record.date_started));

    text(
      "completionDate",
      formatDate(record.date_completed, "Not Completed")
    );

    text("issueDate", formatDate(record.issue_date));

    text(
      "expiryDate",
      formatDate(record.expiry_date, "No expiry stated")
    );

    // Document status is independent of academic result.
    const status = renderStatus(record.status);

    const results = Array.isArray(record.academic_results)
      ? record.academic_results
      : [];

    renderPhoto(record.student_photo_url);
    renderResults(results);
    renderSummary(record.summary, results);
    renderQr(record.verification_url);

    $("loading").hidden = true;
    $("errorState").hidden = true;
    $("authenticationLetter").hidden = false;

    const printable =
      status === "valid" || status === "graduated";

    $("printButton").disabled = !printable;

    if (!printable) {
      $("printButton").textContent =
        "Printing unavailable: document is " + status;
    } else {
      $("printButton").textContent = "Print / Save as PDF";
    }
  }

  async function loadLetter() {
    $("errorState").hidden = true;
    $("authenticationLetter").hidden = true;
    $("loading").hidden = false;

    if (!code) {
      showError(
        "Verification code is missing.",
        "Open the official letter link containing ?code=YOUR_VERIFICATION_CODE."
      );
      return;
    }

    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ) {
      showError(
        "The verification service could not start.",
        "The Supabase library did not load. Check your internet connection."
      );
      return;
    }

    try {
      const client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

      const { data, error } = await client.rpc(
        RPC_NAME,
        {
          p_code: code,
          p_id: recordId || null
        }
      );

      if (error) {
        throw new Error(
          error.message || "Database verification failed."
        );
      }

      const rows = Array.isArray(data)
        ? data
        : data
          ? [data]
          : [];

      if (rows.length !== 1) {
        throw new Error(
          rows.length === 0
            ? "No matching authentication letter was found. Check the link or contact the academy."
            : "More than one record was returned. Please contact the academy administrator."
        );
      }

      renderRecord(rows[0]);

    } catch (error) {
      showError(
        "The authentication record could not be verified.",
        error && error.message
          ? error.message
          : "Please try again later."
      );
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("retryButton").addEventListener("click", loadLetter);

    $("printButton").addEventListener("click", () => {
      if (!$("printButton").disabled) {
        window.print();
      }
    });

    loadLetter();
  });

})();
