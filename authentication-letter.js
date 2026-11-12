
(() => {
  "use strict";

  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjAi5g_RqLCs145";
  const RPC_NAME = "verify_authentication_letter";

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const code = (params.get("code") || "").trim();
  const recordId = (params.get("id") || "").trim();

  let verifiedRecord = null;
  let verificationInProgress = false;

  function showError(message, details = "") {
    $("loading").hidden = true;
    $("authenticationLetter").hidden = true;
    $("errorState").hidden = false;
    $("errorMessage").textContent = message;
    $("errorDetails").textContent = details;
    $("generateButton").disabled = true;
  }

  function setText(id, value, fallback = "—") {
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

      const grade = item.grade || "—";

      const resultText =
        item.remarks ||
        (
          String(grade).trim().toUpperCase() === "F"
            ? "FAIL"
            : "RECORDED"
        );

      const normalized = String(resultText).toUpperCase();

      const resultClass = normalized.includes("FAIL")
        ? "result-fail"
        : normalized.includes("PASS")
          ? "result-pass"
          : "";

      addCell(row, index + 1);
      addCell(row, subject);
      addCell(row, formatDate(item.exam_date));
      addCell(row, item.score);
      addCell(row, item.max_score);
      addCell(row, grade);
      addCell(row, resultText, resultClass);

      body.appendChild(row);
    });
  }

  function renderSummary(summary, results) {
    const hasResults = Array.isArray(results) && results.length > 0;

    $("summaryPanel").hidden = false;
    $("academicPendingNote").hidden = hasResults;

    if (!hasResults) {
      setText("summarySubjects", "0");
      setText("summaryScore", "N/A");
      setText("summaryAverage", "N/A");
      setText("summaryGrade", "N/A");
      setText("summaryFailed", "0");
      setText("summaryFinal", "PENDING");

      $("summaryFinal").className = "result-pending";
      return;
    }

    const s =
      summary && typeof summary === "object"
        ? summary
        : {};

    setText("summarySubjects", s.subjects_count ?? results.length);

    const total = s.total_score;
    const maximum = s.total_max_score;

    setText(
      "summaryScore",
      total !== null && total !== undefined &&
      maximum !== null && maximum !== undefined
        ? `${total} / ${maximum}`
        : "N/A"
    );

    const average = s.average ?? s.percentage;

    setText(
      "summaryAverage",
      average !== null && average !== undefined
        ? `${Number(average).toFixed(2)}%`
        : "N/A"
    );

    setText("summaryGrade", s.overall_grade || "—");
    setText("summaryFailed", s.failed_subjects ?? 0);
    setText("summaryFinal", s.final_result || "—");

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

  function renderPhoto(value) {
    const img = $("studentPhoto");
    const placeholder = $("photoPlaceholder");
    const url = safeHttpsUrl(value);

    img.hidden = true;
    placeholder.hidden = false;
    img.removeAttribute("src");

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

  function renderQr(value) {
    const url = safeHttpsUrl(value);
    const qr = $("qrcode");

    qr.replaceChildren();

    if (!url) {
      setText(
        "verificationUrlText",
        "Official verification link is unavailable."
      );
      return;
    }

    setText("verificationUrlText", url);

    if (typeof QRCode === "undefined") {
      const note = document.createElement("span");
      note.textContent = "QR unavailable. Use the verification link.";
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
    const safeClass = value.replace(/[^a-z0-9_-]/g, "");

    setText("status", value.replace(/_/g, " "));
    $("status").className = "status-pill status-" + safeClass;

    return value;
  }

  function renderCertification(record) {
    const name = record.student_name || "the named student";
    const studentId = record.student_id || "—";
    const course = record.course_name || "the stated programme";

    const admission = record.admission_date
      ? ` admitted on ${formatDate(record.admission_date)}`
      : "";

    const issued = record.issue_date
      ? ` This letter is issued on ${formatDate(record.issue_date)}`
      : " This letter is issued";

    $("certifyText").textContent =
      `This is to certify that ${name} (Student ID: ${studentId}) ` +
      `is a registered student of GAAWOW ACADEMY in the programme of ` +
      `${course},${admission}.${issued} and may be verified online ` +
      `using the details below.`;
  }

  function renderRecord(record) {
    if (!record || typeof record !== "object") {
      throw new Error("The verification service returned an empty record.");
    }

    if (
      !record.verification_code ||
      String(record.verification_code).toUpperCase() !== code.toUpperCase()
    ) {
      throw new Error(
        "The returned verification code does not match this link."
      );
    }

    setText("referenceNo", record.reference_no);
    setText("authenticationId", record.authentication_id);
    setText("verificationCode", record.verification_code);

    setText("studentName", record.student_name);
    setText("studentId", record.student_id);
    setText("courseName", record.course_name);
    setText("institutionName", record.institution_name, "GAAWOW ACADEMY");

    setText("admissionDate", formatDate(record.admission_date));
    setText("dateStarted", formatDate(record.date_started));
    setText(
      "dateCompleted",
      formatDate(record.date_completed, "Not Completed")
    );

    setText("issueDate", formatDate(record.issue_date));
    setText(
      "expiryDate",
      formatDate(record.expiry_date, "No expiry stated")
    );

    renderCertification(record);

    // Document status and academic result are separate.
    const status = renderStatus(record.status);

    $("authenticationLetter").dataset.status = status;

    const results = Array.isArray(record.academic_results)
      ? record.academic_results
      : [];

    renderPhoto(record.student_photo_url);
    renderResults(results);
    renderSummary(record.summary, results);
    renderQr(record.verification_url);

    setText(
      "verifiedAt",
      "Verified online: " + new Date().toLocaleString("en-GB")
    );

    $("loading").hidden = true;
    $("errorState").hidden = true;
    $("authenticationLetter").hidden = false;

    const printable =
      status === "valid" || status === "graduated";

    $("printButton").disabled = !printable;
    $("printButton").textContent = printable
      ? "Print / Save as PDF"
      : "Printing unavailable: document is " + status;

    $("generateButton").disabled = false;
    $("verifyButton").disabled = false;

    setText("verificationCheck", "Online verification successful.");
    $("verificationCheck").className = "verification-success";

    verifiedRecord = record;
  }

  async function verifyLetter() {
    if (verificationInProgress) return;

    if (!code) {
      showError(
        "Verification code is missing.",
        "Open the official link containing ?code=YOUR_VERIFICATION_CODE."
      );
      return;
    }

    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ) {
      showError(
        "The verification service could not start.",
        "Supabase library did not load. Check your internet connection."
      );
      return;
    }

    verificationInProgress = true;

    $("loading").hidden = false;
    $("errorState").hidden = true;
    $("authenticationLetter").hidden = true;
    $("verifyButton").disabled = true;
    $("generateButton").disabled = true;

    try {
      const client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

      const { data, error } = await client.rpc(RPC_NAME, {
        p_code: code,
        p_id: recordId || null
      });

      if (error) {
        throw new Error(error.message || "Database verification failed.");
      }

      const rows = Array.isArray(data)
        ? data
        : data
          ? [data]
          : [];

      if (rows.length !== 1) {
        throw new Error(
          rows.length === 0
            ? "No matching authentication letter was found."
            : "More than one record was returned. Contact the administrator."
        );
      }

      renderRecord(rows[0]);

    } catch (error) {
      verifiedRecord = null;

      showError(
        "The authentication record could not be verified.",
        error && error.message
          ? error.message
          : "Please try again later."
      );

    } finally {
      verificationInProgress = false;
      $("verifyButton").disabled = false;
    }
  }

  function generateDocument() {
    if (!verifiedRecord) {
      setText(
        "verificationCheck",
        "Verify the official record before generating the document."
      );
      return;
    }

    const status = String(verifiedRecord.status || "").toLowerCase();

    if (status !== "valid" && status !== "graduated") {
      setText(
        "verificationCheck",
        "This document cannot be printed because its status is " + status + "."
      );
      return;
    }

    $("authenticationLetter").hidden = false;
    $("authenticationLetter").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    setText("verificationCheck", "Document generated successfully.");
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("retryButton").addEventListener("click", verifyLetter);

    $("verifyButton").addEventListener("click", verifyLetter);

    $("generateButton").addEventListener("click", generateDocument);

    $("printButton").addEventListener("click", () => {
      if (
        !$("printButton").disabled &&
        verifiedRecord
      ) {
        window.print();
      }
    });

    verifyLetter();
  });
})();
