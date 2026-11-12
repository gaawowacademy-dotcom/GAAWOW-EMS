
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
    if (el) {
      el.textContent =
        value === null || value === undefined || value === ""
          ? fallback
          : String(value);
    }
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

    if (className) {
      cell.className = className;
    }

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
        "No published final assessment results are available.";

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
        (String(grade).toUpperCase() === "F"
          ? "FAIL"
          : "RECORDED");

      const resultClass =
        String(resultText).toLowerCase().includes("fail")
          ? "result-fail"
          : String(resultText).toLowerCase().includes("pass")
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

  function renderSummary(summary) {
    const s =
      summary && typeof summary === "object"
        ? summary
        : {};

    $("summaryPanel").hidden = false;

    text("summarySubjects", s.subjects_count ?? 0);

    text(
      "summaryScore",
      `${s.total_score ?? 0} / ${s.total_max_score ?? 0}`
    );

    text(
      "summaryAverage",
      `${Number(s.average ?? s.percentage ?? 0).toFixed(2)}%`
    );

    text("summaryGrade", s.overall_grade || "—");
    text("summaryFailed", s.failed_subjects ?? 0);
    text("summaryFinal", s.final_result || "—");

    const final = $("summaryFinal").textContent.toUpperCase();

    $("summaryFinal").className =
      final === "PASS"
        ? "result-pass"
        : final === "FAIL"
          ? "result-fail"
          : "";
  }

  function renderPhoto(urlValue) {
    const url = safeHttpsUrl(urlValue);

    if (!url) return;

    const img = $("studentPhoto");

    img.onload = () => {
      img.hidden = false;
      $("photoPlaceholder").hidden = true;
    };

    img.onerror = () => {
      img.hidden = true;
      $("photoPlaceholder").hidden = false;
    };

    img.src = url;
  }

  function renderQr(urlValue) {
    const url = safeHttpsUrl(urlValue);

    if (!url) {
      throw new Error(
        "The official verification URL is missing or is not a secure HTTPS link."
      );
    }

    if (typeof QRCode === "undefined") {
      throw new Error(
        "The QR code library did not load. Check your internet connection and try again."
      );
    }

    $("qrcode").replaceChildren();

    new QRCode($("qrcode"), {
      text: url,
      width: 70,
      height: 70,
      colorDark: "#0B1E63",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });

    $("verificationUrlText").textContent = url;
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
      record.verification_code.toUpperCase() !== code.toUpperCase()
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

    const status = renderStatus(record.status);

    renderPhoto(record.student_photo_url);
    renderResults(record.academic_results);
    renderSummary(record.summary);
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
    $("retryButton").addEventListener(
      "click",
      loadLetter
    );

    $("printButton").addEventListener("click", () => {
      if (!$("printButton").disabled) {
        window.print();
      }
    });

    loadLetter();
  });

})();
