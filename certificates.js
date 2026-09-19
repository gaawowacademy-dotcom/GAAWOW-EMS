/* =========================================================
   GAAWOW EMS
   Certificates Management V4
   DATABASE-SAFE VERSION

   IMPORTANT:
   - certificates table DOES NOT contain enrollment_id
   - enrollment_id is NOT selected
   - enrollment_id is NOT displayed
   - Existing certificates schema preserved
   - Design/UI handled by certificates.html
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;
let certificates = [];
let institutions = [];

/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function showMessage(message, type = "info") {
  const el = $("message");

  if (!el) return;

  el.textContent = message;
  el.className = `message ${type}`;
  el.style.display = "block";
}

function hideMessage() {
  const el = $("message");

  if (!el) return;

  el.style.display = "none";
}

function showLoading(show = true) {
  const loading = $("loading");

  if (!loading) return;

  loading.style.display = show ? "block" : "none";
}

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDate(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return escapeHTML(dateValue);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

/* =========================================================
   STATUS
   ========================================================= */

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function statusBadge(status) {
  const normalized = normalizeStatus(status);

  let className = "status-badge";

  if (normalized === "valid") {
    className += " valid";
  } else if (normalized === "pending") {
    className += " pending";
  } else if (normalized === "revoked") {
    className += " revoked";
  } else if (normalized === "expired") {
    className += " expired";
  } else {
    className += " inactive";
  }

  return `
    <span class="${className}">
      ${escapeHTML(status || "Unknown")}
    </span>
  `;
}

/* =========================================================
   AUTH
   ========================================================= */

async function loadCurrentUser() {
  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Auth error:", error);
    throw error;
  }

  if (!user) {
    window.location.href = "index.html";
    return false;
  }

  currentUser = user;

  return true;
}

/* =========================================================
   PROFILE
   ========================================================= */

async function loadCurrentProfile() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      institution_id,
      is_active
    `)
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Profile error:", error);
    throw error;
  }

  if (!data) {
    throw new Error("User profile was not found.");
  }

  currentProfile = data;

  if (data.is_active === false) {
    throw new Error("Your account is inactive.");
  }

  return data;
}

/* =========================================================
   LOAD INSTITUTIONS
   ========================================================= */

async function loadInstitutions() {
  const filter = $("institutionFilter");

  if (!filter) return;

  filter.innerHTML = `
    <option value="">All Institutions</option>
  `;

  let query = supabaseClient
    .from("institutions")
    .select("id, name")
    .order("name", { ascending: true });

  /*
    Super admin:
    - Can see all institutions

    Other roles:
    - Only their institution
  */

  if (
    currentProfile.role !== "super_admin" &&
    currentProfile.institution_id
  ) {
    query = query.eq(
      "id",
      currentProfile.institution_id
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Institutions error:", error);
    throw error;
  }

  institutions = data || [];

  institutions.forEach((institution) => {
    const option = document.createElement("option");

    option.value = institution.id;
    option.textContent = institution.name;

    filter.appendChild(option);
  });

  if (
    currentProfile.role !== "super_admin" &&
    currentProfile.institution_id
  ) {
    filter.value = currentProfile.institution_id;
  }
}

/* =========================================================
   LOAD CERTIFICATES
   ========================================================= */

async function loadCertificates() {
  showLoading(true);
  hideMessage();

  try {
    /*
      IMPORTANT DATABASE FIX

      There is NO enrollment_id in certificates.

      Therefore DO NOT add:

      enrollment_id

      to this select.
    */

    let query = supabaseClient
      .from("certificates")
      .select(`
        id,
        institution_id,
        student_id,
        course_id,
        certificate_no,
        certificate_id,
        verify_code,
        hash_code,
        issue_date,
        expiry_date,
        status,
        student_name,
        course_name,
        created_at
      `)
      .order("created_at", {
        ascending: false
      });

    /*
      Institution security
    */

    if (
      currentProfile.role !== "super_admin" &&
      currentProfile.institution_id
    ) {
      query = query.eq(
        "institution_id",
        currentProfile.institution_id
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Certificates query error:", error);

      throw new Error(
        `Certificates database error: ${error.message}`
      );
    }

    certificates = data || [];

    renderCertificates(certificates);
    updateStatistics(certificates);

  } catch (error) {
    console.error(error);

    certificates = [];

    renderCertificates([]);

    showMessage(
      error.message ||
      "Unable to load certificates.",
      "error"
    );

  } finally {
    showLoading(false);
  }
}

/* =========================================================
   FILTER CERTIFICATES
   ========================================================= */

function getFilteredCertificates() {
  const searchInput = $("searchInput");
  const statusFilter = $("statusFilter");
  const institutionFilter = $("institutionFilter");

  const search = String(
    searchInput?.value || ""
  )
    .trim()
    .toLowerCase();

  const status = String(
    statusFilter?.value || ""
  )
    .trim()
    .toLowerCase();

  const institutionId = String(
    institutionFilter?.value || ""
  ).trim();

  return certificates.filter((certificate) => {

    const matchesSearch =
      !search ||
      String(certificate.student_name || "")
        .toLowerCase()
        .includes(search) ||
      String(certificate.student_id || "")
        .toLowerCase()
        .includes(search) ||
      String(certificate.course_name || "")
        .toLowerCase()
        .includes(search) ||
      String(certificate.certificate_no || "")
        .toLowerCase()
        .includes(search) ||
      String(certificate.certificate_id || "")
        .toLowerCase()
        .includes(search) ||
      String(certificate.verify_code || "")
        .toLowerCase()
        .includes(search);

    const matchesStatus =
      !status ||
      normalizeStatus(certificate.status) === status;

    const matchesInstitution =
      !institutionId ||
      certificate.institution_id === institutionId;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesInstitution
    );
  });
}

/* =========================================================
   RENDER TABLE
   ========================================================= */

function renderCertificates(data) {
  const body = $("certificatesBody");

  if (!body) return;

  if (!data || data.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="100%" style="text-align:center;padding:40px;">
          No certificates found.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = data.map((certificate) => {

    return `
      <tr>

        <td>
          <strong>
            ${escapeHTML(
              certificate.certificate_no || "—"
            )}
          </strong>
        </td>

        <td>
          ${escapeHTML(
            certificate.student_name || "—"
          )}
        </td>

        <td>
          ${escapeHTML(
            certificate.course_name || "—"
          )}
        </td>

        <td>
          ${escapeHTML(
            certificate.certificate_id || "—"
          )}
        </td>

        <td>
          ${escapeHTML(
            certificate.verify_code || "—"
          )}
        </td>

        <td>
          ${formatDate(
            certificate.issue_date
          )}
        </td>

        <td>
          ${statusBadge(
            certificate.status
          )}
        </td>

        <td>
          <div class="action-buttons">

            <button
              type="button"
              class="btn btn-view"
              onclick="viewCertificate('${certificate.id}')"
            >
              View
            </button>

            <button
              type="button"
              class="btn btn-verify"
              onclick="verifyCertificate('${escapeHTML(
                certificate.verify_code || ""
              )}')"
            >
              Verify
            </button>

            <button
              type="button"
              class="btn btn-delete"
              onclick="deleteCertificate('${certificate.id}')"
            >
              Delete
            </button>

          </div>
        </td>

      </tr>
    `;

  }).join("");
}

/* =========================================================
   STATISTICS
   ========================================================= */

function updateStatistics(data) {
  const total =
    Array.isArray(data)
      ? data.length
      : 0;

  const valid =
    data.filter(
      c => normalizeStatus(c.status) === "valid"
    ).length;

  const pending =
    data.filter(
      c => normalizeStatus(c.status) === "pending"
    ).length;

  const revoked =
    data.filter(
      c => normalizeStatus(c.status) === "revoked"
    ).length;

  if ($("totalCount")) {
    $("totalCount").textContent = total;
  }

  if ($("validCount")) {
    $("validCount").textContent = valid;
  }

  if ($("pendingCount")) {
    $("pendingCount").textContent = pending;
  }

  if ($("revokedCount")) {
    $("revokedCount").textContent = revoked;
  }
}

/* =========================================================
   APPLY FILTERS
   ========================================================= */

function applyFilters() {
  const filtered = getFilteredCertificates();

  renderCertificates(filtered);
}

/* =========================================================
   CLEAR FILTERS
   ========================================================= */

function clearFilters() {
  if ($("searchInput")) {
    $("searchInput").value = "";
  }

  if ($("statusFilter")) {
    $("statusFilter").value = "";
  }

  if ($("institutionFilter")) {

    if (
      currentProfile &&
      currentProfile.role !== "super_admin" &&
      currentProfile.institution_id
    ) {
      $("institutionFilter").value =
        currentProfile.institution_id;
    } else {
      $("institutionFilter").value = "";
    }
  }

  applyFilters();
}

/* =========================================================
   VIEW CERTIFICATE
   ========================================================= */

function viewCertificate(id) {
  const certificate =
    certificates.find(
      item => item.id === id
    );

  if (!certificate) {
    showMessage(
      "Certificate not found.",
      "error"
    );

    return;
  }

  const modal = $("viewModal");
  const modalBody = $("modalBody");

  if (!modal || !modalBody) {
    /*
      Fallback if the modal is not present.
    */

    alert(
      [
        `Certificate No: ${certificate.certificate_no || "—"}`,
        `Certificate ID: ${certificate.certificate_id || "—"}`,
        `Student: ${certificate.student_name || "—"}`,
        `Course: ${certificate.course_name || "—"}`,
        `Verify Code: ${certificate.verify_code || "—"}`,
        `Issue Date: ${formatDate(certificate.issue_date)}`,
        `Expiry Date: ${formatDate(certificate.expiry_date)}`,
        `Status: ${certificate.status || "—"}`
      ].join("\n")
    );

    return;
  }

  modalBody.innerHTML = `
    <div class="certificate-details">

      <div class="detail-row">
        <strong>Student</strong>
        <span>
          ${escapeHTML(
            certificate.student_name || "—"
          )}
        </span>
      </div>

      <div class="detail-row">
        <strong>Student UUID</strong>
        <span>
          ${escapeHTML(
            certificate.student_id || "—"
          )}
        </span>
      </div>

      <div class="detail-row">
        <strong>Course</strong>
        <span>
          ${escapeHTML(
            certificate.course_name || "—"
          )}
        </span>
      </div>

      <div class="detail-row">
        <strong>Course UUID</strong>
        <span>
          ${escapeHTML(
            certificate.course_id || "—"
          )}
        </span>
      </div>

      <div class="detail-row">
        <strong>Institution</strong>
        <span>
          ${escapeHTML(
            getInstitutionName(
              certificate.institution_id
            )
          )}
        </span>
      </div>

      <div class="detail-row">
        <strong>Certificate No</strong>
        <span>
          ${escapeHTML(
            certificate.certificate_no || "—"
          )}
        </span>
      </div>

      <div class="detail-row">
        <strong>Certificate ID</strong>
        <span>
          ${escapeHTML(
            certificate.certificate_id || "—"
          )}
        </span>
      </div>

      <div class="detail-row">
        <strong>Verify Code</strong>
        <span>
          ${escapeHTML(
            certificate.verify_code || "—"
          )}
        </span>
      </div>

      <div class="detail-row">
        <strong>Issue Date</strong>
        <span>
          ${formatDate(
            certificate.issue_date
          )}
        </span>
      </div>

      <div class="detail-row">
        <strong>Expiry Date</strong>
        <span>
          ${formatDate(
            certificate.expiry_date
          )}
        </span>
      </div>

      <div class="detail-row">
        <strong>Status</strong>
        <span>
          ${statusBadge(
            certificate.status
          )}
        </span>
      </div>

      <div class="detail-row">
        <strong>Verification Hash</strong>
        <span style="word-break:break-all;">
          ${escapeHTML(
            certificate.hash_code || "—"
          )}
        </span>
      </div>

      <div class="detail-row">
        <strong>Created</strong>
        <span>
          ${formatDate(
            certificate.created_at
          )}
        </span>
      </div>

    </div>
  `;

  modal.style.display = "flex";
}

/* =========================================================
   INSTITUTION NAME
   ========================================================= */

function getInstitutionName(id) {
  if (!id) return "—";

  const institution =
    institutions.find(
      item => item.id === id
    );

  return institution
    ? institution.name
    : id;
}

/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeModal() {
  const modal = $("viewModal");

  if (modal) {
    modal.style.display = "none";
  }
}

/* =========================================================
   VERIFY CERTIFICATE
   ========================================================= */

function verifyCertificate(code) {
  if (!code) {
    showMessage(
      "Verification code is missing.",
      "error"
    );

    return;
  }

  window.location.href =
    `verify.html?code=${encodeURIComponent(code)}`;
}

/* =========================================================
   DELETE CERTIFICATE
   ========================================================= */

async function deleteCertificate(id) {
  const certificate =
    certificates.find(
      item => item.id === id
    );

  if (!certificate) {
    showMessage(
      "Certificate not found.",
      "error"
    );

    return;
  }

  const confirmed = window.confirm(
    `Delete certificate ${
      certificate.certificate_no || ""
    }?\n\nThis action cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  try {
    showLoading(true);
    hideMessage();

    const { error } =
      await supabaseClient
        .from("certificates")
        .delete()
        .eq("id", id);

    if (error) {
      console.error(
        "Delete certificate error:",
        error
      );

      throw new Error(
        `Unable to delete certificate: ${error.message}`
      );
    }

    showMessage(
      "Certificate deleted successfully.",
      "success"
    );

    await loadCertificates();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "Unable to delete certificate.",
      "error"
    );

  } finally {
    showLoading(false);
  }
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function openGenerator() {
  window.location.href =
    "certificate.html";
}

function openDashboard() {
  window.location.href =
    "dashboard.html";
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEvents() {

  const searchInput =
    $("searchInput");

  const statusFilter =
    $("statusFilter");

  const institutionFilter =
    $("institutionFilter");

  const clearFiltersButton =
    $("clearFiltersBtn");

  const refreshButton =
    $("refreshBtn");

  const closeModalButton =
    $("closeModalBtn");

  const generateButton =
    $("generateCertificateBtn");

  const backDashboardButton =
    $("backDashboardBtn");

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      applyFilters
    );
  }

  if (statusFilter) {
    statusFilter.addEventListener(
      "change",
      applyFilters
    );
  }

  if (institutionFilter) {
    institutionFilter.addEventListener(
      "change",
      applyFilters
    );
  }

  if (clearFiltersButton) {
    clearFiltersButton.addEventListener(
      "click",
      clearFilters
    );
  }

  if (refreshButton) {
    refreshButton.addEventListener(
      "click",
      async () => {
        await loadCertificates();
      }
    );
  }

  if (closeModalButton) {
    closeModalButton.addEventListener(
      "click",
      closeModal
    );
  }

  if (generateButton) {
    generateButton.addEventListener(
      "click",
      openGenerator
    );
  }

  if (backDashboardButton) {
    backDashboardButton.addEventListener(
      "click",
      openDashboard
    );
  }

  const modal =
    $("viewModal");

  if (modal) {
    modal.addEventListener(
      "click",
      event => {
        if (event.target === modal) {
          closeModal();
        }
      }
    );
  }

  document.addEventListener(
    "keydown",
    event => {
      if (event.key === "Escape") {
        closeModal();
      }
    }
  );
}

/* =========================================================
   INITIALIZE
   ========================================================= */

async function initCertificatesPage() {

  try {

    showLoading(true);

    const authenticated =
      await loadCurrentUser();

    if (!authenticated) {
      return;
    }

    await loadCurrentProfile();

    await loadInstitutions();

    setupEvents();

    await loadCertificates();

  } catch (error) {

    console.error(
      "Certificates initialization error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to initialize Certificates Management.",
      "error"
    );

  } finally {

    showLoading(false);

  }
}

/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.viewCertificate =
  viewCertificate;

window.verifyCertificate =
  verifyCertificate;

window.deleteCertificate =
  deleteCertificate;

window.closeModal =
  closeModal;

window.clearFilters =
  clearFilters;

window.applyFilters =
  applyFilters;

window.openGenerator =
  openGenerator;

window.openDashboard =
  openDashboard;

/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initCertificatesPage
);
