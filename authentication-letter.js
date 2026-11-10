
/* ============================================================
   GAAWOW ACADEMY EMS
   AUTHENTICATION LETTER
   VERSION: 20261110-7

   Compatible with:
   authentication-letter.html
   authentication-letter.css

   SECURITY:
   Uses verify_authentication_letter RPC.
   NEVER reads certificates table directly.
   ============================================================ */

(() => {
  "use strict";

  // ==========================================================
  // 1. SUPABASE CONFIGURATION
  // ==========================================================

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  // IMPORTANT:
  // Copy your EXISTING Supabase publishable/anon key here.
  // Do not use your service_role key.

  const SUPABASE_KEY =
    "PASTE_YOUR_EXISTING_SUPABASE_PUBLISHABLE_KEY_HERE";

  const RPC_NAME =
    "verify_authentication_letter";

  let db = null;
  let verifiedRecord = null;
  let loading = false;

  // ==========================================================
  // 2. HTML ELEMENTS
  // ==========================================================

  const el = (id) => document.getElementById(id);

  function setText(id, value, fallback = "N/A") {
    const node = el(id);

    if (!node) return;

    const valid =
      value !== null &&
      value !== undefined &&
      String(value).trim() !== "";

    node.textContent = valid
      ? String(value)
      : fallback;
  }

  function hide(id) {
    const node = el(id);
    if (node) node.hidden = true;
  }

  function show(id) {
    const node = el(id);
    if (node) node.hidden = false;
  }

  // ==========================================================
  // 3. DATE FORMAT
  // ==========================================================

  function formatDate(value) {
    if (!value) return "N/A";

    const date = new Date(
      String(value).substring(0, 10) + "T00:00:00"
    );

    if (Number.isNaN(date.getTime())) {
      return String(value);
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

  // ==========================================================
  // 4. PAGE STATES
  // ==========================================================

  function showLoading() {
    show("loading");
    hide("errorState");
    hide("authenticationLetter");
  }

  function hideLoading() {
    hide("loading");
  }

  function showError(message, details = "") {
    hideLoading();
    hide("authenticationLetter");
    show("errorState");

    setText("errorMessage", message);

    const detailNode = el("errorDetails");

    if (detailNode) {
      detailNode.textContent = details;
    }
  }

  function showDocument() {
    hideLoading();
    hide("errorState");
    show("authenticationLetter");
  }

  // ==========================================================
  // 5. READ VERIFICATION URL
  // ==========================================================

  function getVerificationParameters() {
    const params = new URLSearchParams(
      window.location.search
    );

    const firstValue = (...names) => {
      for (const name of names) {
        const value = params.get(name);

        if (value && value.trim()) {
          return value.trim();
        }
      }

      return "";
    };

    return {
      code: firstValue(
        "code",
        "verification_code",
        "verify_code",
        "vc"
      ),

      id: firstValue(
        "id",
        "authentication_id",
        "record_id",
        "certificate_id",
        "reference_no"
      )
    };
  }

  // ==========================================================
  // 6. INITIALIZE SUPABASE
  // ==========================================================

  function initializeSupabase() {

    if (!window.supabase) {
      throw new Error(
        "Supabase JavaScript library lama soo gelin. " +
        "Hubi Supabase CDN ee HTML."
      );
    }

    if (
      !SUPABASE_KEY ||
      SUPABASE_KEY.includes("PASTE_YOUR")
    ) {
      throw new Error(
        "Supabase publishable key lama gelin. " +
        "Ku dar key-ga saxda ah ee mashruucaaga."
      );
    }

    if (!db) {
      db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );
    }

    return db;
  }

  // ==========================================================
  // 7. SECURE RPC VERIFICATION
  // ==========================================================

  async function getCertificate() {

    const params =
      getVerificationParameters();

    if (!params.code) {
      throw new Error(
        "Verification code kuma jiro link-ga. " +
        "Fadlan fur link-ga rasmiga ah ee xaqiijinta."
      );
    }

    const client = initializeSupabase();

    const { data, error } = await client.rpc(
      RPC_NAME,
      {
        p_code: params.code,
        p_id: params.id || null
      }
    );

    if (error) {
      console.error("Supabase RPC:", error);

      throw new Error(
        "Supabase verification error: " +
        error.message
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(
        "Shahaadada lama helin. " +
        "Verification code ama Authentication ID waa khaldan yahay."
      );
    }

    return data[0];
  }

  // ==========================================================
  // 8. STUDENT PHOTO
  // ==========================================================

  function renderPhoto(record) {

    const photo = el("studentPhoto");
    const placeholder = el("photoPlaceholder");

    const url = record.student_photo_url;

    if (!photo) return;

    if (!url) {
      photo.removeAttribute("src");
      photo.style.display = "none";

      if (placeholder) {
        placeholder.style.display = "grid";
      }

      return;
    }

    photo.onload = () => {
      photo.style.display = "block";

      if (placeholder) {
        placeholder.style.display = "none";
      }
    };

    photo.onerror = () => {
      photo.style.display = "none";

      if (placeholder) {
        placeholder.style.display = "grid";
      }
    };

    photo.src = url;
  }

  // ==========================================================
  // 9. STUDENT INFORMATION
  // ==========================================================

  function renderStudent(record) {

    setText(
      "studentName",
      record.student_name
    );

    setText(
      "courseName",
      record.course_name
    );

    // Student ID is not currently displayed in the
    // supplied HTML. Keep the record available.

    setDate(
      "dateStarted",
      record.date_started
    );

    setDate(
      "dateCompleted",
      record.date_completed
    );

    // Academic period section uses different HTML IDs.

    setDate(
      "startDate",
      record.date_started
    );

    setDate(
      "completionDate",
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

    renderPhoto(record);
  }

  // ==========================================================
  // 10. DOCUMENT STATUS
  // ==========================================================

  function renderStatus(record) {

    const statusNode = el("status");

    const status = String(
      record.status || "unknown"
    ).trim().toLowerCase();

    const labels = {
      valid: "VALID",
      graduated: "GRADUATED",
      pending: "PENDING",
      expired: "EXPIRED",
      revoked: "REVOKED"
    };

    setText(
      "status",
      labels[status] || status.toUpperCase()
    );

    if (!statusNode) return;

    statusNode.classList.remove(
      "valid",
      "invalid",
      "pending",
      "expired",
      "revoked"
    );

    if (
      status === "valid" ||
      status === "graduated"
    ) {
      statusNode.classList.add("valid");

    } else if (status === "pending") {
      statusNode.classList.add("pending");

    } else {
      statusNode.classList.add(
        status === "expired"
          ? "expired"
          : "revoked"
      );
    }
  }

  // ==========================================================
  // 11. ACADEMIC RESULTS
  // ==========================================================

  function getValue(item, keys) {

    for (const key of keys) {

      if (
        item[key] !== undefined &&
        item[key] !== null
      ) {
        return item[key];
      }
    }

    return "—";
  }

  function renderResults(record) {

    const container = el("academicResults");

    if (!container) return;

    container.replaceChildren();

    const results = Array.isArray(
      record.academic_results
    )
      ? record.academic_results
      : [];

    if (results.length === 0) {

      const message =
        document.createElement("div");

      message.className = "results-empty";

      message.textContent =
        "No published academic results available.";

      container.appendChild(message);

      return;
    }

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "results-table-wrapper";

    const table =
      document.createElement("table");

    table.className = "results-table";

    const columns = [
      {
        label: "SUBJECT",
        keys: [
          "subject_name",
          "subject",
          "course_name",
          "name"
        ]
      },
      {
        label: "SCORE",
        keys: [
          "score",
          "marks",
          "total_score",
          "obtained_marks"
        ]
      },
      {
        label: "MAX SCORE",
        keys: [
          "max_score",
          "maximum_score",
          "total_max_score"
        ]
      },
      {
        label: "GRADE",
        keys: [
          "grade",
          "overall_grade"
        ]
      },
      {
        label: "RESULT",
        keys: [
          "result",
          "status",
          "final_result"
        ]
      }
    ];

    const thead =
      document.createElement("thead");

    const headerRow =
      document.createElement("tr");

    columns.forEach((column) => {

      const th =
        document.createElement("th");

      th.textContent = column.label;

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    const tbody =
      document.createElement("tbody");

    results.forEach((item) => {

      const row =
        document.createElement("tr");

      columns.forEach((column, index) => {

        const td =
          document.createElement("td");

        const value =
          getValue(item, column.keys);

        td.textContent = String(value);

        if (index === 1 || index === 2) {
          td.classList.add("score");
        }

        if (index === 3) {
          td.classList.add("grade");
        }

        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    wrapper.appendChild(table);

    container.appendChild(wrapper);
  }

  // ==========================================================
  // 12. VERIFICATION INFORMATION
  // ==========================================================

  function renderAuthentication(record) {

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

    const qrContainer = el("qrcode");

    if (!qrContainer) return;

    qrContainer.replaceChildren();

    const verificationUrl =
      record.verification_url ||
      window.location.href;

    if (!window.QRCode) {

      console.warn(
        "QRCode library is not loaded."
      );

      return;
    }

    new window.QRCode(qrContainer, {
      text: verificationUrl,
      width: 120,
      height: 120,
      colorDark: "#0B1E63",
      colorLight: "#FFFFFF",
      correctLevel:
        window.QRCode.CorrectLevel.M
    });
  }

  // ==========================================================
  // 13. COMPLETE DOCUMENT
  // ==========================================================

  function renderDocument(record) {

    // Do not render an unverified or empty record.

    if (!record || !record.verification_code) {
      throw new Error(
        "Verification record is incomplete."
      );
    }

    verifiedRecord = record;

    renderStudent(record);

    renderStatus(record);

    renderResults(record);

    renderAuthentication(record);

    showDocument();

    console.log(
      "GAAWOW EMS: Authentication Letter loaded.",
      record.reference_no
    );
  }

  // ==========================================================
  // 14. LOAD DOCUMENT
  // ==========================================================

  async function loadAuthenticationLetter() {

    if (loading) return;

    loading = true;

    verifiedRecord = null;

    showLoading();

    try {

      const record =
        await getCertificate();

      renderDocument(record);

    } catch (error) {

      console.error(
        "GAAWOW Authentication Letter:",
        error
      );

      showError(
        "Certificate record lama akhrin karin",
        error.message
      );

    } finally {

      loading = false;
    }
  }

  // ==========================================================
  // 15. PRINT / SAVE PDF
  // ==========================================================

  function printDocument() {

    if (!verifiedRecord) {

      alert(
        "Please verify the authentication letter first."
      );

      return;
    }

    window.print();
  }

  // ==========================================================
  // 16. EVENT LISTENERS
  // ==========================================================

  function initializeEvents() {

    const printButton =
      el("printButton");

    const retryButton =
      el("retryButton");

    if (printButton) {

      printButton.addEventListener(
        "click",
        printDocument
      );
    }

    if (retryButton) {

      retryButton.addEventListener(
        "click",
        loadAuthenticationLetter
      );
    }
  }

  // ==========================================================
  // 17. APPLICATION START
  // ==========================================================

  function startApplication() {

    // Hide the document until successful verification.

    hide("authenticationLetter");

    initializeEvents();

    loadAuthenticationLetter();
  }

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      startApplication,
      { once: true }
    );

  } else {

    startApplication();
  }

})();
