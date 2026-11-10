
/* =========================================================
   GAAWOW EMS
   AUTHENTICATION LETTER
   VERSION: 20261110-6
   FIX: RPC ONLY - NO DIRECT CERTIFICATES TABLE ACCESS
   ========================================================= */

(() => {
  "use strict";

  // ==========================================
  // 1. SUPABASE CONFIGURATION
  // ==========================================

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const DEFAULT_RECORD_ID =
    "c7366afd-5d9b-475b-af84-6c4a4c0dc8b9";

  let supabaseClient = null;
  let currentRecord = null;

  // ==========================================
  // 2. DOM HELPERS
  // ==========================================

  const $ = (id) => document.getElementById(id);

  function setText(id, value, fallback = "—") {
    const element = $(id);
    if (!element) return;

    element.textContent =
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
        ? String(value)
        : fallback;
  }

  function showElement(id) {
    const element = $(id);
    if (element) element.style.display = "";
  }

  function hideElement(id) {
    const element = $(id);
    if (element) element.style.display = "none";
  }

  function setImage(id, url) {
    const element = $(id);
    if (!element || !url) return;

    element.src = url;
    element.style.display = "";
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function setDate(id, value) {
    setText(id, formatDate(value));
  }

  // ==========================================
  // 3. PAGE STATES
  // ==========================================

  function showLoading() {
    showElement("loading");
    hideElement("errorState");
    hideElement("authenticationLetter");
  }

  function hideLoading() {
    hideElement("loading");
  }

  function showError(message, details = "") {
    hideLoading();
    hideElement("authenticationLetter");
    showElement("errorState");

    setText("errorMessage", message);
    setText("errorDetails", details, "");
  }

  function showLetter() {
    hideLoading();
    hideElement("errorState");
    showElement("authenticationLetter");
  }

  // ==========================================
  // 4. GET VERIFICATION PARAMETERS
  // ==========================================

  function getParameters() {
    const params = new URLSearchParams(
      window.location.search
    );

    return {
      code: (
        params.get("code") ||
        ""
      ).trim(),

      id: (
        params.get("id") ||
        params.get("record_id") ||
        ""
      ).trim()
    };
  }

  // ==========================================
  // 5. SUPABASE INITIALIZATION
  // ==========================================

  function initializeSupabase() {
    if (!window.supabase) {
      throw new Error(
        "Supabase library lama soo gelin. Hubi CDN script-ka HTML."
      );
    }

    if (!supabaseClient) {
      supabaseClient =
        window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_KEY
        );
    }

    return supabaseClient;
  }

  // ==========================================
  // 6. SECURE CERTIFICATE VERIFICATION
  // IMPORTANT:
  // NO .from("certificates").select()
  // ==========================================

  async function fetchCertificate() {

    const parameters = getParameters();

    const verificationCode = parameters.code;
    const recordId =
      parameters.id || DEFAULT_RECORD_ID;

    if (!verificationCode) {
      throw new Error(
        "Verification code lama helin. " +
        "Fadlan isticmaal link-ga saxda ah ee shahaadada."
      );
    }

    const client = initializeSupabase();

    const { data, error } = await client.rpc(
      "verify_authentication_letter",
      {
        p_code: verificationCode,
        p_id: recordId || null
      }
    );

    if (error) {
      console.error(
        "Certificate RPC Error:",
        error
      );

      throw new Error(
        "Shahaadada lama xaqiijin karin: " +
        error.message
      );
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error(
        "Shahaadada lama helin. Hubi verification code iyo authentication ID."
      );
    }

    return data[0];
  }

  // ==========================================
  // 7. DOCUMENT STATUS
  // ==========================================

  function renderStatus(record) {

    const status = (
      record.status || "unknown"
    ).toLowerCase();

    setText("status", status.toUpperCase());

    const statusElement = $("status");

    if (statusElement) {

      statusElement.classList.remove(
        "valid",
        "expired",
        "revoked",
        "pending"
      );

      if (
        ["valid", "graduated"].includes(status)
      ) {
        statusElement.classList.add("valid");

      } else if (status === "expired") {
        statusElement.classList.add("expired");

      } else if (status === "pending") {
        statusElement.classList.add("pending");

      } else {
        statusElement.classList.add("revoked");
      }
    }
  }

  // ==========================================
  // 8. STUDENT AND INSTITUTION DETAILS
  // ==========================================

  function renderStudent(record) {

    setText(
      "studentName",
      record.student_name
    );

    setText(
      "studentId",
      record.student_id
    );

    setText(
      "courseName",
      record.course_name
    );

    setText(
      "institutionName",
      record.institution_name
    );

    setText(
      "referenceNo",
      record.reference_no
    );

    setText(
      "authenticationId",
      record.authentication_id
    );

    setText(
      "verificationCode",
      record.verification_code
    );

    setDate(
      "dateStarted",
      record.date_started
    );

    setDate(
      "dateCompleted",
      record.date_completed
    );

    setDate(
      "issueDate",
      record.issue_date
    );

    setDate(
      "expiryDate",
      record.expiry_date
    );

    setDate(
      "admissionDate",
      record.admission_date
    );

    if (record.student_photo_url) {

      setImage(
        "studentPhoto",
        record.student_photo_url
      );

      setImage(
        "studentImage",
        record.student_photo_url
      );
    }

    renderStatus(record);
  }

  // ==========================================
  // 9. ACADEMIC RESULTS
  // ==========================================

  function renderAcademicResults(record) {

    const results = Array.isArray(
      record.academic_results
    )
      ? record.academic_results
      : [];

    const container = $("academicResults");

    if (container) {

      container.replaceChildren();

      if (results.length === 0) {

        const message =
          document.createElement("p");

        message.textContent =
          "No published academic results available.";

        container.appendChild(message);

      } else {

        const table =
          document.createElement("table");

        table.className = "results-table";

        const thead =
          document.createElement("thead");

        const header =
          document.createElement("tr");

        [
          "Subject",
          "Score",
          "Maximum Score",
          "Grade",
          "Result"
        ].forEach((label) => {

          const th =
            document.createElement("th");

          th.textContent = label;
          header.appendChild(th);

        });

        thead.appendChild(header);
        table.appendChild(thead);

        const tbody =
          document.createElement("tbody");

        results.forEach((item) => {

          const tr =
            document.createElement("tr");

          const values = [
            item.subject_name ||
            item.subject ||
            item.course_name,

            item.score ??
            item.marks ??
            item.total_score,

            item.max_score ??
            item.maximum_score,

            item.grade,

            item.result ||
            item.status
          ];

          values.forEach((value) => {

            const td =
              document.createElement("td");

            td.textContent =
              value === null ||
              value === undefined
                ? "—"
                : String(value);

            tr.appendChild(td);
          });

          tbody.appendChild(tr);

        });

        table.appendChild(tbody);
        container.appendChild(table);
      }
    }

    // Optional result counters
    const summary =
      record.summary || {};

    setText(
      "subjectsCount",
      summary.subjects_count
    );

    setText(
      "average",
      summary.average !== undefined
        ? Number(summary.average).toFixed(2)
        : null
    );

    setText(
      "overallGrade",
      summary.overall_grade
    );

    setText(
      "finalResult",
      summary.final_result
    );

    setText(
      "totalScore",
      summary.total_score
    );

    setText(
      "totalMaxScore",
      summary.total_max_score
    );

    setText(
      "percentage",
      summary.percentage !== undefined
        ? Number(summary.percentage).toFixed(2) + "%"
        : null
    );

    setText(
      "failedSubjects",
      summary.failed_subjects
    );
  }

  // ==========================================
  // 10. VERIFICATION URL AND QR
  // ==========================================

  function renderVerification(record) {

    const url =
      record.verification_url ||
      window.location.href;

    const link = $("verificationUrl");

    if (link) {

      link.href = url;
      link.textContent = url;
    }

    const qrContainer = $("qrCode");

    if (
      qrContainer &&
      window.QRCode
    ) {

      qrContainer.replaceChildren();

      new QRCode(qrContainer, {
        text: url,
        width: 120,
        height: 120
      });
    }
  }

  // ==========================================
  // 11. COMPLETE DOCUMENT RENDERING
  // ==========================================

  function renderCertificate(record) {

    currentRecord = record;

    renderStudent(record);

    renderAcademicResults(record);

    renderVerification(record);

    showLetter();

    console.log(
      "GAAWOW EMS: Certificate verified successfully.",
      record.reference_no
    );
  }

  // ==========================================
  // 12. MAIN LOAD FUNCTION
  // ==========================================

  async function loadAuthenticationLetter() {

    showLoading();

    try {

      const record =
        await fetchCertificate();

      renderCertificate(record);

    } catch (error) {

      console.error(
        "Authentication Letter Error:",
        error
      );

      showError(
        "Certificate record lama akhrin karin",
        error.message
      );
    }
  }

  // ==========================================
  // 13. PRINT
  // ==========================================

  function printLetter() {

    if (!currentRecord) {
      alert(
        "Certificate lama xaqiijin. Print lama samayn karo."
      );

      return;
    }

    window.print();
  }

  // ==========================================
  // 14. EVENT LISTENERS
  // ==========================================

  function initializeEvents() {

    const printButton = $("printButton");

    if (printButton) {
      printButton.addEventListener(
        "click",
        printLetter
      );
    }

    const retryButton = $("retryButton");

    if (retryButton) {
      retryButton.addEventListener(
        "click",
        loadAuthenticationLetter
      );
    }
  }

  // ==========================================
  // 15. START APPLICATION
  // ==========================================

  function start() {

    initializeEvents();

    loadAuthenticationLetter();
  }

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );

  } else {

    start();
  }

})();
