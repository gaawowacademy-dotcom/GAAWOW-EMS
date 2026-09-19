/* =========================================================
   GAAWOW EMS
   CERTIFICATES MANAGEMENT V5
   FINAL DATABASE-SAFE VERSION

   SUPABASE:
   - Publishable key
   - RLS compatible
   - Role aware

   CERTIFICATES TABLE:
   - NO enrollment_id
   - enrollment_id is NOT queried
   - enrollment_id is NOT displayed
   - enrollment_id is NOT deleted/updated

   FEATURES:
   - Authentication
   - Profile / role handling
   - Institution filtering
   - Search
   - Status filtering
   - Statistics
   - View certificate
   - Public verification
   - Delete certificate
   - Loading state
   - Error handling
   - Refresh
   ========================================================= */


/* =========================================================
   1. SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   2. GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let certificates = [];
let institutions = [];

let isLoading = false;


/* =========================================================
   3. DOM HELPER
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


/* =========================================================
   4. HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {

  if (
    value === null ||
    value === undefined
  ) {
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
   5. MESSAGE
   ========================================================= */

function showMessage(
  message,
  type = "info"
) {

  const element = $("message");

  if (!element) {
    console.log(message);
    return;
  }

  element.textContent = message;

  element.className =
    `message ${type}`;

  element.style.display = "block";
}


function hideMessage() {

  const element = $("message");

  if (!element) return;

  element.style.display = "none";
}


/* =========================================================
   6. LOADING
   ========================================================= */

function setLoading(value) {

  isLoading = value;

  const loading =
    $("loading");

  if (loading) {
    loading.style.display =
      value ? "block" : "none";
  }

  const refresh =
    $("refreshBtn");

  if (refresh) {
    refresh.disabled = value;
  }
}


/* =========================================================
   7. DATE FORMAT
   ========================================================= */

function formatDate(value) {

  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return escapeHTML(value);
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}


/* =========================================================
   8. STATUS
   ========================================================= */

function normalizeStatus(status) {

  return String(
    status || ""
  )
    .trim()
    .toLowerCase();
}


function getStatusClass(status) {

  const normalized =
    normalizeStatus(status);

  switch (normalized) {

    case "valid":
      return "valid";

    case "pending":
      return "pending";

    case "revoked":
      return "revoked";

    case "expired":
      return "expired";

    default:
      return "inactive";
  }
}


function statusBadge(status) {

  const value =
    status || "Unknown";

  return `
    <span class="status-badge ${getStatusClass(value)}">
      ${escapeHTML(value)}
    </span>
  `;
}


/* =========================================================
   9. AUTHENTICATION
   ========================================================= */

async function loadCurrentUser() {

  const {
    data,
    error
  } =
    await supabaseClient.auth.getUser();

  if (error) {

    console.error(
      "Supabase authentication error:",
      error
    );

    throw new Error(
      `Authentication error: ${error.message}`
    );
  }

  if (!data || !data.user) {

    window.location.href =
      "index.html";

    return false;
  }

  currentUser =
    data.user;

  return true;
}


/* =========================================================
   10. LOAD PROFILE
   ========================================================= */

async function loadCurrentProfile() {

  if (!currentUser) {
    throw new Error(
      "Authenticated user was not found."
    );
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        institution_id,
        is_active
      `)
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();

  if (error) {

    console.error(
      "Profile error:",
      error
    );

    throw new Error(
      `Profile database error: ${error.message}`
    );
  }

  if (!data) {

    throw new Error(
      "Your EMS profile was not found."
    );
  }

  currentProfile =
    data;

  if (
    data.is_active === false
  ) {

    throw new Error(
      "Your EMS account is inactive."
    );
  }

  return data;
}


/* =========================================================
   11. ROLE CHECK
   ========================================================= */

function getUserRole() {

  if (!currentProfile) {
    return null;
  }

  return String(
    currentProfile.role || ""
  )
    .trim()
    .toLowerCase();
}


function isSuperAdmin() {

  return (
    getUserRole() ===
    "super_admin"
  );
}


function canManageCertificates() {

  const role =
    getUserRole();

  return [
    "super_admin",
    "school_admin"
  ].includes(role);
}


/* =========================================================
   12. LOAD INSTITUTIONS
   ========================================================= */

async function loadInstitutions() {

  const filter =
    $("institutionFilter");

  if (!filter) {
    return;
  }

  filter.innerHTML =
    `<option value="">All Institutions</option>`;

  let query =
    supabaseClient
      .from("institutions")
      .select(`
        id,
        name
      `)
      .order(
        "name",
        {
          ascending: true
        }
      );


  /*
    SUPER ADMIN:
    Can request all institutions.

    OTHER ROLES:
    Restricted to their own institution.
  */

  if (
    !isSuperAdmin() &&
    currentProfile.institution_id
  ) {

    query =
      query.eq(
        "id",
        currentProfile.institution_id
      );
  }


  const {
    data,
    error
  } = await query;


  if (error) {

    console.error(
      "Institutions error:",
      error
    );

    throw new Error(
      `Institutions database error: ${error.message}`
    );
  }


  institutions =
    data || [];


  institutions.forEach(
    institution => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        institution.id;

      option.textContent =
        institution.name;

      filter.appendChild(
        option
      );
    }
  );


  /*
    School admin:
    automatically stay on own institution.
  */

  if (
    !isSuperAdmin() &&
    currentProfile.institution_id
  ) {

    filter.value =
      currentProfile.institution_id;
  }
}


/* =========================================================
   13. LOAD CERTIFICATES
   ========================================================= */

async function loadCertificates() {

  setLoading(true);
  hideMessage();

  try {

    /*
      IMPORTANT:

      The certificates table DOES NOT contain
      enrollment_id.

      Therefore this query intentionally contains
      NO enrollment_id.
    */

    let query =
      supabaseClient
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
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    /*
      ROLE / INSTITUTION SECURITY

      RLS remains the actual database security layer.

      This client-side restriction is an additional
      UI/data filter.
    */

    if (
      !isSuperAdmin() &&
      currentProfile.institution_id
    ) {

      query =
        query.eq(
          "institution_id",
          currentProfile.institution_id
        );
    }


    const {
      data,
      error
    } = await query;


    if (error) {

      console.error(
        "Certificates query error:",
        error
      );

      throw new Error(
        `Certificates database error: ${error.message}`
      );
    }


    certificates =
      data || [];


    updateStatistics(
      certificates
    );

    applyFilters();


  } catch (error) {

    console.error(
      "Load certificates failed:",
      error
    );

    certificates = [];

    updateStatistics([]);

    renderCertificates([]);

    showMessage(
      error.message ||
      "Unable to load certificates.",
      "error"
    );

  } finally {

    setLoading(false);
  }
}


/* =========================================================
   14. FILTER
   ========================================================= */

function getFilteredCertificates() {

  const searchInput =
    $("searchInput");

  const statusFilter =
    $("statusFilter");

  const institutionFilter =
    $("institutionFilter");


  const search =
    String(
      searchInput?.value || ""
    )
      .trim()
      .toLowerCase();


  const status =
    String(
      statusFilter?.value || ""
    )
      .trim()
      .toLowerCase();


  const institutionId =
    String(
      institutionFilter?.value || ""
    ).trim();


  return certificates.filter(
    certificate => {

      const matchesSearch =
        !search ||

        String(
          certificate.student_name || ""
        )
          .toLowerCase()
          .includes(search) ||

        String(
          certificate.student_id || ""
        )
          .toLowerCase()
          .includes(search) ||

        String(
          certificate.course_name || ""
        )
          .toLowerCase()
          .includes(search) ||

        String(
          certificate.certificate_no || ""
        )
          .toLowerCase()
          .includes(search) ||

        String(
          certificate.certificate_id || ""
        )
          .toLowerCase()
          .includes(search) ||

        String(
          certificate.verify_code || ""
        )
          .toLowerCase()
          .includes(search);


      const matchesStatus =
        !status ||
        normalizeStatus(
          certificate.status
        ) === status;


      const matchesInstitution =
        !institutionId ||
        certificate.institution_id ===
          institutionId;


      return (
        matchesSearch &&
        matchesStatus &&
        matchesInstitution
      );
    }
  );
}


/* =========================================================
   15. APPLY FILTERS
   ========================================================= */

function applyFilters() {

  const filtered =
    getFilteredCertificates();

  renderCertificates(
    filtered
  );
}


/* =========================================================
   16. RENDER TABLE
   ========================================================= */

function renderCertificates(
  data
) {

  const body =
    $("certificatesBody");

  if (!body) {
    return;
  }


  if (
    !data ||
    data.length === 0
  ) {

    body.innerHTML = `
      <tr>
        <td
          colspan="100%"
          style="
            text-align:center;
            padding:40px;
          "
        >
          No certificates found.
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML =
    data.map(
      certificate => {

        return `
          <tr>

            <td>
              <strong>
                ${escapeHTML(
                  certificate.certificate_no ||
                  "—"
                )}
              </strong>
            </td>

            <td>
              ${escapeHTML(
                certificate.student_name ||
                "—"
              )}
            </td>

            <td>
              ${escapeHTML(
                certificate.course_name ||
                "—"
              )}
            </td>

            <td>
              ${escapeHTML(
                certificate.certificate_id ||
                "—"
              )}
            </td>

            <td>
              ${escapeHTML(
                certificate.verify_code ||
                "—"
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
                    certificate.verify_code ||
                    ""
                  )}')"
                >
                  Verify
                </button>

                ${
                  canManageCertificates()
                    ? `
                      <button
                        type="button"
                        class="btn btn-delete"
                        onclick="deleteCertificate('${certificate.id}')"
                      >
                        Delete
                      </button>
                    `
                    : ""
                }

              </div>

            </td>

          </tr>
        `;
      }
    )
    .join("");
}


/* =========================================================
   17. STATISTICS
   ========================================================= */

function updateStatistics(
  data
) {

  const list =
    Array.isArray(data)
      ? data
      : [];


  const total =
    list.length;


  const valid =
    list.filter(
      certificate =>
        normalizeStatus(
          certificate.status
        ) === "valid"
    ).length;


  const pending =
    list.filter(
      certificate =>
        normalizeStatus(
          certificate.status
        ) === "pending"
    ).length;


  const revoked =
    list.filter(
      certificate =>
        normalizeStatus(
          certificate.status
        ) === "revoked"
    ).length;


  if ($("totalCount")) {
    $("totalCount")
      .textContent = total;
  }

  if ($("validCount")) {
    $("validCount")
      .textContent = valid;
  }

  if ($("pendingCount")) {
    $("pendingCount")
      .textContent = pending;
  }

  if ($("revokedCount")) {
    $("revokedCount")
      .textContent = revoked;
  }
}


/* =========================================================
   18. CLEAR FILTERS
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
      !isSuperAdmin() &&
      currentProfile?.institution_id
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
   19. GET INSTITUTION NAME
   ========================================================= */

function getInstitutionName(
  institutionId
) {

  if (!institutionId) {
    return "—";
  }

  const institution =
    institutions.find(
      item =>
        item.id === institutionId
    );

  return institution
    ? institution.name
    : institutionId;
}


/* =========================================================
   20. VIEW CERTIFICATE
   ========================================================= */

function viewCertificate(
  id
) {

  const certificate =
    certificates.find(
      item =>
        item.id === id
    );


  if (!certificate) {

    showMessage(
      "Certificate not found.",
      "error"
    );

    return;
  }


  const modal =
    $("viewModal");

  const modalBody =
    $("modalBody");


  if (
    !modal ||
    !modalBody
  ) {

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
            certificate.student_name ||
            "—"
          )}
        </span>
      </div>


      <div class="detail-row">
        <strong>Student UUID</strong>
        <span>
          ${escapeHTML(
            certificate.student_id ||
            "—"
          )}
        </span>
      </div>


      <div class="detail-row">
        <strong>Course</strong>
        <span>
          ${escapeHTML(
            certificate.course_name ||
            "—"
          )}
        </span>
      </div>


      <div class="detail-row">
        <strong>Course UUID</strong>
        <span>
          ${escapeHTML(
            certificate.course_id ||
            "—"
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
            certificate.certificate_no ||
            "—"
          )}
        </span>
      </div>


      <div class="detail-row">
        <strong>Certificate ID</strong>
        <span>
          ${escapeHTML(
            certificate.certificate_id ||
            "—"
          )}
        </span>
      </div>


      <div class="detail-row">
        <strong>Verify Code</strong>
        <span>
          ${escapeHTML(
            certificate.verify_code ||
            "—"
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
        <span
          style="
            word-break:break-all;
          "
        >
          ${escapeHTML(
            certificate.hash_code ||
            "—"
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


  modal.style.display =
    "flex";
}


/* =========================================================
   21. CLOSE MODAL
   ========================================================= */

function closeModal() {

  const modal =
    $("viewModal");

  if (modal) {

    modal.style.display =
      "none";
  }
}


/* =========================================================
   22. VERIFY
   ========================================================= */

function verifyCertificate(
  code
) {

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
   23. DELETE CERTIFICATE
   ========================================================= */

async function deleteCertificate(
  id
) {

  /*
    Only super_admin and school_admin
    may use the management delete action.

    RLS remains the final security layer.
  */

  if (!canManageCertificates()) {

    showMessage(
      "You do not have permission to delete certificates.",
      "error"
    );

    return;
  }


  const certificate =
    certificates.find(
      item =>
        item.id === id
    );


  if (!certificate) {

    showMessage(
      "Certificate not found.",
      "error"
    );

    return;
  }


  const confirmed =
    window.confirm(
      `Delete certificate ${
        certificate.certificate_no ||
        ""
      }?\n\nThis action cannot be undone.`
    );


  if (!confirmed) {
    return;
  }


  try {

    setLoading(true);
    hideMessage();


    const {
      error
    } =
      await supabaseClient
        .from("certificates")
        .delete()
        .eq(
          "id",
          id
        );


    if (error) {

      console.error(
        "Delete error:",
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

    console.error(
      "Delete certificate failed:",
      error
    );

    showMessage(
      error.message ||
      "Unable to delete certificate.",
      "error"
    );


  } finally {

    setLoading(false);
  }
}


/* =========================================================
   24. REFRESH
   ========================================================= */

async function refreshCertificates() {

  if (isLoading) {
    return;
  }

  await loadCertificates();
}


/* =========================================================
   25. NAVIGATION
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
   26. EVENTS
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
      refreshCertificates
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

        if (
          event.target === modal
        ) {

          closeModal();
        }
      }
    );
  }


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape"
      ) {

        closeModal();
      }
    }
  );
}


/* =========================================================
   27. INITIALIZATION
   ========================================================= */

async function initCertificatesPage() {

  try {

    setLoading(true);

    hideMessage();


    /*
      1. Authenticate
    */

    const authenticated =
      await loadCurrentUser();


    if (!authenticated) {
      return;
    }


    /*
      2. Load profile / role
    */

    await loadCurrentProfile();


    /*
      3. Load institutions
    */

    await loadInstitutions();


    /*
      4. Register UI events
    */

    setupEvents();


    /*
      5. Load certificates
    */

    await loadCertificates();


  } catch (error) {

    console.error(
      "Certificates page initialization failed:",
      error
    );


    showMessage(
      error.message ||
      "Unable to initialize Certificates Management.",
      "error"
    );


  } finally {

    setLoading(false);
  }
}


/* =========================================================
   28. GLOBAL FUNCTIONS
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

window.refreshCertificates =
  refreshCertificates;

window.openGenerator =
  openGenerator;

window.openDashboard =
  openDashboard;


/* =========================================================
   29. START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initCertificatesPage
);
