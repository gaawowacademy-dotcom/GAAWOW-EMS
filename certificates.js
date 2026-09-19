/* =========================================================
   GAAWOW EMS
   Certificates Management V2
   DATABASE-SAFE / ERROR-SAFE

   Purpose:
   - View issued certificates
   - Search
   - Status filter
   - Institution filter
   - View details
   - Verify
   - Delete
   - Link to Certificate Generator

   Generator:
   certificate.html
   ========================================================= */


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


/* =========================================================
   CLIENT
   ========================================================= */

let supabaseClient = null;

function createSupabaseClient() {

  if (!window.supabase) {
    throw new Error(
      "Supabase library failed to load. Check certificate.html script order."
    );
  }

  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

  return supabaseClient;
}


/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let certificates = [];
let institutions = [];


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(message, type = "info") {

  const box = $("message");

  if (!box) {
    console.log(`[${type}] ${message}`);
    return;
  }

  box.textContent = message;

  box.className = `message ${type}`;
}


function clearMessage() {

  const box = $("message");

  if (!box) return;

  box.textContent = "";

  box.className = "message";
}


/* =========================================================
   LOADING
   ========================================================= */

function setLoading(show, text = "Loading certificates...") {

  const loading = $("loading");

  if (!loading) return;

  if (show) {

    loading.style.display = "block";
    loading.textContent = text;

  } else {

    loading.style.display = "none";

  }
}


/* =========================================================
   AUTH
   ========================================================= */

async function loadSession() {

  if (!supabaseClient) {
    throw new Error("Supabase client is not initialized.");
  }

  const result =
    await supabaseClient.auth.getSession();

  const data = result?.data;
  const error = result?.error;

  if (error) {
    throw new Error(
      `Session error: ${error.message}`
    );
  }

  currentUser =
    data?.session?.user || null;

  if (!currentUser) {

    window.location.href = "index.html";

    return false;

  }

  return true;
}


/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile() {

  if (!currentUser) {
    throw new Error("User session not found.");
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "id,full_name,role,institution_id,is_active"
      )
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();


  if (error) {

    throw new Error(
      `Profile loading failed: ${error.message}`
    );

  }


  if (!data) {

    throw new Error(
      "Profile not found for the logged-in account."
    );

  }


  currentProfile = data;


  if (currentProfile.is_active === false) {

    throw new Error(
      "Your account is inactive."
    );

  }


  const allowedRoles = [
    "super_admin",
    "school_admin",
    "teacher"
  ];


  if (
    !allowedRoles.includes(
      currentProfile.role
    )
  ) {

    throw new Error(
      `Unauthorized role: ${currentProfile.role || "unknown"}`
    );

  }


  return currentProfile;
}


/* =========================================================
   LOAD INSTITUTIONS
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
      .select(
        "id,name,code,is_active"
      )
      .order(
        "name",
        {
          ascending: true
        }
      );


  if (
    currentProfile.role !== "super_admin"
  ) {

    if (!currentProfile.institution_id) {

      throw new Error(
        "Your profile has no institution assigned."
      );

    }

    query =
      query.eq(
        "id",
        currentProfile.institution_id
      );

  }


  const {
    data,
    error
  } =
    await query;


  if (error) {

    throw new Error(
      `Institutions loading failed: ${error.message}`
    );

  }


  institutions =
    data || [];


  institutions.forEach(
    institution => {

      const option =
        document.createElement("option");

      option.value =
        institution.id;

      option.textContent =
        institution.code
          ? `${institution.name} (${institution.code})`
          : institution.name;

      filter.appendChild(
        option
      );

    }
  );


  /*
     Non-super-admin:
     lock institution selector
  */

  if (
    currentProfile.role !== "super_admin"
  ) {

    filter.disabled = true;

  } else {

    filter.disabled = false;

  }

}


/* =========================================================
   LOAD CERTIFICATES
   ========================================================= */

async function loadCertificates() {

  setLoading(
    true,
    "Loading certificates..."
  );


  try {

    if (!currentProfile) {
      throw new Error(
        "User profile is not loaded."
      );
    }


    let query =
      supabaseClient
        .from("certificates")
        .select(
          [
            "id",
            "institution_id",
            "student_id",
            "course_id",
            "enrollment_id",
            "certificate_no",
            "certificate_id",
            "verify_code",
            "hash_code",
            "issue_date",
            "expiry_date",
            "status",
            "student_name",
            "course_name",
            "created_at"
          ].join(",")
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    /*
       SECURITY FILTER
    */

    if (
      currentProfile.role !== "super_admin"
    ) {

      if (!currentProfile.institution_id) {

        throw new Error(
          "No institution is assigned to your account."
        );

      }


      query =
        query.eq(
          "institution_id",
          currentProfile.institution_id
        );

    } else {

      const institutionId =
        $("institutionFilter")?.value || "";


      if (institutionId) {

        query =
          query.eq(
            "institution_id",
            institutionId
          );

      }

    }


    const {
      data,
      error
    } =
      await query;


    if (error) {

      /*
         IMPORTANT:
         Show actual Supabase error.
      */

      console.error(
        "Certificates query error:",
        error
      );


      throw new Error(
        `Certificates database error: ${error.message}`
      );

    }


    certificates =
      Array.isArray(data)
        ? data
        : [];


    renderCertificates();

    updateStats();


    if (!certificates.length) {

      showMessage(
        "No issued certificates found.",
        "info"
      );

    }


  } finally {

    /*
       IMPORTANT:
       Loading ALWAYS stops,
       even when query fails.
    */

    setLoading(false);

  }

}


/* =========================================================
   RENDER
   ========================================================= */

function renderCertificates() {

  const body =
    $("certificatesBody");


  if (!body) {

    console.warn(
      "certificatesBody element not found."
    );

    return;

  }


  const search =
    (
      $("searchInput")?.value || ""
    )
      .trim()
      .toLowerCase();


  const status =
    $("statusFilter")?.value || "";


  let filtered =
    [...certificates];


  /*
     SEARCH
  */

  if (search) {

    filtered =
      filtered.filter(
        certificate => {

          const values = [

            certificate.certificate_no,
            certificate.certificate_id,
            certificate.verify_code,
            certificate.student_name,
            certificate.course_name

          ];


          return values.some(
            value =>
              String(
                value || ""
              )
                .toLowerCase()
                .includes(search)
          );

        }
      );

  }


  /*
     STATUS FILTER
  */

  if (status) {

    filtered =
      filtered.filter(
        certificate =>
          String(
            certificate.status || ""
          ).toLowerCase() ===
          String(status).toLowerCase()
      );

  }


  body.innerHTML = "";


  if (!filtered.length) {

    body.innerHTML = `
      <tr>
        <td
          colspan="8"
          class="empty"
        >
          No certificates found.
        </td>
      </tr>
    `;

    return;

  }


  filtered.forEach(
    certificate => {

      const row =
        document.createElement("tr");


      const institution =
        institutions.find(
          item =>
            item.id ===
            certificate.institution_id
        );


      const institutionName =
        institution?.name ||
        "—";


      row.innerHTML = `

        <td>

          <strong>
            ${escapeHtml(
              certificate.certificate_no || "—"
            )}
          </strong>

          <div class="muted">

            ${escapeHtml(
              certificate.certificate_id || ""
            )}

          </div>

        </td>


        <td>
          ${escapeHtml(
            certificate.student_name || "—"
          )}
        </td>


        <td>
          ${escapeHtml(
            certificate.course_name || "—"
          )}
        </td>


        <td>
          ${escapeHtml(
            institutionName
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

          <strong>
            ${escapeHtml(
              certificate.verify_code || "—"
            )}
          </strong>

        </td>


        <td>

          <div class="row-actions">

            <button
              type="button"
              class="small-btn small-view"
              data-action="view"
              data-id="${escapeAttr(
                certificate.id
              )}"
            >
              View
            </button>


            <button
              type="button"
              class="small-btn small-verify"
              data-action="verify"
              data-code="${escapeAttr(
                certificate.verify_code || ""
              )}"
            >
              Verify
            </button>


            ${
              currentProfile.role === "super_admin" ||
              currentProfile.role === "school_admin"
                ? `
                  <button
                    type="button"
                    class="small-btn small-delete"
                    data-action="delete"
                    data-id="${escapeAttr(
                      certificate.id
                    )}"
                  >
                    Delete
                  </button>
                `
                : ""
            }

          </div>

        </td>

      `;


      body.appendChild(row);

    }
  );

}


/* =========================================================
   STATS
   ========================================================= */

function updateStats() {

  const total =
    certificates.length;


  const valid =
    certificates.filter(
      item =>
        String(
          item.status || ""
        ).toLowerCase() === "valid"
    ).length;


  const pending =
    certificates.filter(
      item =>
        String(
          item.status || ""
        ).toLowerCase() === "pending"
    ).length;


  const revoked =
    certificates.filter(
      item =>
        String(
          item.status || ""
        ).toLowerCase() === "revoked"
    ).length;


  if ($("totalCount")) {

    $("totalCount").textContent =
      total;

  }


  if ($("validCount")) {

    $("validCount").textContent =
      valid;

  }


  if ($("pendingCount")) {

    $("pendingCount").textContent =
      pending;

  }


  if ($("revokedCount")) {

    $("revokedCount").textContent =
      revoked;

  }

}


/* =========================================================
   STATUS BADGE
   ========================================================= */

function statusBadge(status) {

  const safe =
    String(
      status || ""
    ).toLowerCase();


  const label =
    safe
      ? safe.toUpperCase()
      : "UNKNOWN";


  let className =
    "badge";


  if (safe === "valid") {

    className +=
      " badge-valid";

  } else if (safe === "pending") {

    className +=
      " badge-pending";

  } else if (safe === "expired") {

    className +=
      " badge-expired";

  } else if (safe === "revoked") {

    className +=
      " badge-revoked";

  } else if (safe === "graduated") {

    className +=
      " badge-graduated";

  }


  return `
    <span class="${className}">
      ${escapeHtml(label)}
    </span>
  `;

}


/* =========================================================
   VIEW CERTIFICATE
   ========================================================= */

function viewCertificate(id) {

  const certificate =
    certificates.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!certificate) {

    showMessage(
      "Certificate not found.",
      "error"
    );

    return;

  }


  const institution =
    institutions.find(
      item =>
        String(item.id) ===
        String(
          certificate.institution_id
        )
    );


  const modalBody =
    $("modalBody");


  if (!modalBody) {

    showMessage(
      "Certificate details window is missing.",
      "error"
    );

    return;

  }


  modalBody.innerHTML = `

    <div class="detail-grid">

      <div class="detail">
        <div class="detail-label">
          Student
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.student_name || "—"
          )}
        </div>
      </div>


      <div class="detail">
        <div class="detail-label">
          Student UUID
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.student_id || "—"
          )}
        </div>
      </div>


      <div class="detail">
        <div class="detail-label">
          Course
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.course_name || "—"
          )}
        </div>
      </div>


      <div class="detail">
        <div class="detail-label">
          Course UUID
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.course_id || "—"
          )}
        </div>
      </div>


      <div class="detail">
        <div class="detail-label">
          Institution
        </div>

        <div class="detail-value">
          ${escapeHtml(
            institution?.name || "—"
          )}
        </div>
      </div>


      <div class="detail">
        <div class="detail-label">
          Certificate No
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.certificate_no || "—"
          )}
        </div>
      </div>


      <div class="detail">
        <div class="detail-label">
          Certificate ID
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.certificate_id || "—"
          )}
        </div>
      </div>


      <div class="detail">
        <div class="detail-label">
          Verify Code
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.verify_code || "—"
          )}
        </div>
      </div>


      <div class="detail">
        <div class="detail-label">
          Issue Date
        </div>

        <div class="detail-value">
          ${formatDate(
            certificate.issue_date
          )}
        </div>
      </div>


      <div class="detail">
        <div class="detail-label">
          Expiry Date
        </div>

        <div class="detail-value">
          ${
            certificate.expiry_date
              ? formatDate(
                  certificate.expiry_date
                )
              : "No Expiry"
          }
        </div>
      </div>


      <div class="detail">
        <div class="detail-label">
          Status
        </div>

        <div class="detail-value">
          ${statusBadge(
            certificate.status
          )}
        </div>
      </div>


      <div class="detail">
        <div class="detail-label">
          Enrollment ID
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.enrollment_id || "—"
          )}
        </div>
      </div>


      <div
        class="detail"
        style="grid-column:1/-1"
      >

        <div class="detail-label">
          Verification Hash
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.hash_code || "—"
          )}
        </div>

      </div>

    </div>

  `;


  $("viewModal")
    ?.classList.add("show");

}


/* =========================================================
   DELETE
   ========================================================= */

async function deleteCertificate(id) {

  const certificate =
    certificates.find(
      item =>
        String(item.id) ===
        String(id)
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
        certificate.certificate_no || ""
      }?\n\nThis action cannot be undone.`
    );


  if (!confirmed) {
    return;
  }


  try {

    showMessage(
      "Deleting certificate...",
      "info"
    );


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

      throw new Error(
        `Delete failed: ${error.message}`
      );

    }


    showMessage(
      "Certificate deleted successfully.",
      "success"
    );


    await loadCertificates();


  } catch (error) {

    console.error(
      "Delete Certificate Error:",
      error
    );


    showMessage(
      error.message ||
      "Unable to delete certificate.",
      "error"
    );

  }

}


/* =========================================================
   VERIFY
   ========================================================= */

function verifyCertificate(
  verifyCode
) {

  if (!verifyCode) {

    showMessage(
      "Verification code is missing.",
      "error"
    );

    return;

  }


  window.location.href =
    `verify.html?code=${encodeURIComponent(
      verifyCode
    )}`;

}


/* =========================================================
   FILTERS
   ========================================================= */

function clearFilters() {

  if ($("searchInput")) {

    $("searchInput").value = "";

  }


  if ($("statusFilter")) {

    $("statusFilter").value = "";

  }


  if (
    $("institutionFilter") &&
    currentProfile?.role === "super_admin"
  ) {

    $("institutionFilter").value = "";

  }


  renderCertificates();

}


/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {


  $("backDashboardBtn")
    ?.addEventListener(
      "click",
      () => {

        window.location.href =
          "dashboard.html";

      }
    );


  $("generateCertificateBtn")
    ?.addEventListener(
      "click",
      () => {

        window.location.href =
          "certificate.html";

      }
    );


  $("refreshBtn")
    ?.addEventListener(
      "click",
      async () => {

        try {

          clearMessage();

          await loadCertificates();

          showMessage(
            "Certificates refreshed successfully.",
            "success"
          );

        } catch (error) {

          console.error(
            "Refresh error:",
            error
          );

          showMessage(
            error.message ||
            "Unable to refresh certificates.",
            "error"
          );

        }

      }
    );


  $("searchInput")
    ?.addEventListener(
      "input",
      renderCertificates
    );


  $("statusFilter")
    ?.addEventListener(
      "change",
      renderCertificates
    );


  $("institutionFilter")
    ?.addEventListener(
      "change",
      async () => {

        try {

          clearMessage();

          await loadCertificates();

        } catch (error) {

          console.error(
            "Institution filter error:",
            error
          );

          showMessage(
            error.message ||
            "Unable to filter certificates.",
            "error"
          );

        }

      }
    );


  $("clearFilterBtn")
    ?.addEventListener(
      "click",
      clearFilters
    );


  $("closeModalBtn")
    ?.addEventListener(
      "click",
      () => {

        $("viewModal")
          ?.classList.remove("show");

      }
    );


  $("viewModal")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("viewModal")
        ) {

          $("viewModal")
            .classList.remove("show");

        }

      }
    );


  $("certificatesBody")
    ?.addEventListener(
      "click",
      async event => {

        const button =
          event.target.closest(
            "button[data-action]"
          );


        if (!button) {
          return;
        }


        const action =
          button.dataset.action;


        if (action === "view") {

          viewCertificate(
            button.dataset.id
          );

          return;

        }


        if (action === "verify") {

          verifyCertificate(
            button.dataset.code
          );

          return;

        }


        if (action === "delete") {

          await deleteCertificate(
            button.dataset.id
          );

        }

      }
    );

}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(dateString) {

  if (!dateString) {
    return "—";
  }


  /*
     Handle both:
     YYYY-MM-DD
     and full ISO timestamp
  */

  let date;


  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      String(dateString)
    )
  ) {

    date =
      new Date(
        `${dateString}T00:00:00`
      );

  } else {

    date =
      new Date(dateString);

  }


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return escapeHtml(
      dateString
    );

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
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function escapeAttr(value) {

  return escapeHtml(value);

}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initialize() {

  setLoading(
    true,
    "Loading certificates..."
  );


  try {

    clearMessage();


    /*
       1. Supabase
    */

    createSupabaseClient();


    /*
       2. Session
    */

    const authenticated =
      await loadSession();


    if (!authenticated) {
      return;
    }


    /*
       3. Profile
    */

    await loadProfile();


    /*
       4. Institutions
    */

    await loadInstitutions();


    /*
       5. Events
    */

    bindEvents();


    /*
       6. Certificates
    */

    await loadCertificates();


  } catch (error) {

    console.error(
      "GAAWOW Certificates V2 Error:",
      error
    );


    setLoading(false);


    showMessage(
      error.message ||
      "Certificates page could not load.",
      "error"
    );


    /*
       Also expose error in console
       for debugging.
    */

    console.error(
      "Full error:",
      {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      }
    );

  } finally {

    /*
       FINAL SAFETY:
       Never leave Loading certificates...
       visible after initialization.
    */

    setLoading(false);

  }

}


/* =========================================================
   START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initialize,
    {
      once: true
    }
  );

} else {

  initialize();

}
