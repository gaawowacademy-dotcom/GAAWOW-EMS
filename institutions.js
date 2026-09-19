// ==========================================
// GAAWOW EMS — INSTITUTIONS MANAGEMENT V2
// DATABASE-SAFE / SUPABASE V2
// ==========================================


// ==========================================
// SUPABASE CONFIG
// ==========================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


// ==========================================
// GLOBALS
// ==========================================

let supabaseClient = null;

let allInstitutions = [];

let currentUser = null;

let currentProfile = null;


// ==========================================
// DASHBOARD
// ==========================================

function goDashboard() {
  window.location.href = "dashboard.html";
}


// ==========================================
// ESCAPE HTML
// ==========================================

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


// ==========================================
// MESSAGE
// ==========================================

function showMessage(text, type = "info") {

  const message =
    document.getElementById("message");

  if (!message) {
    return;
  }

  message.textContent = text;

  if (type === "success") {
    message.style.color = "#16A34A";
  }
  else if (type === "error") {
    message.style.color = "#DC2626";
  }
  else {
    message.style.color = "#0B4DA2";
  }
}


// ==========================================
// INITIALIZE SUPABASE
// ==========================================

function initializeSupabase() {

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {

    console.error(
      "Supabase CDN did not load."
    );

    showMessage(
      "Supabase library failed to load. Please refresh the page.",
      "error"
    );

    return false;
  }

  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

  console.log(
    "Supabase initialized successfully."
  );

  return true;
}


// ==========================================
// CHECK SESSION + SUPER ADMIN
// ==========================================

async function checkSuperAdmin() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {

      console.error(
        "SESSION ERROR:",
        error
      );

      showMessage(
        "Session error: " + error.message,
        "error"
      );

      return false;
    }


    if (!data || !data.session) {

      alert(
        "No active session.\n\nPlease login again."
      );

      window.location.href =
        "index.html";

      return false;
    }


    currentUser =
      data.session.user;


    console.log(
      "Logged user:",
      currentUser.email
    );


    // ======================================
    // LOAD PROFILE
    // ======================================

    const {
      data: profile,
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id, full_name, role, institution_id, is_active"
        )
        .eq(
          "id",
          currentUser.id
        )
        .maybeSingle();


    if (profileError) {

      console.error(
        "PROFILE ERROR:",
        profileError
      );

      showMessage(
        "Unable to load profile:\n" +
        profileError.message,
        "error"
      );

      return false;
    }


    if (!profile) {

      showMessage(
        "No profile found for this login account.",
        "error"
      );

      return false;
    }


    currentProfile =
      profile;


    // ======================================
    // ROLE
    // ======================================

    if (
      profile.role !== "super_admin"
    ) {

      alert(
        "Access denied.\n\n" +
        "Current role: " +
        profile.role
      );

      window.location.href =
        "index.html";

      return false;
    }


    // ======================================
    // ACTIVE
    // ======================================

    if (
      profile.is_active === false
    ) {

      alert(
        "Your Super Admin account is inactive."
      );

      await supabaseClient.auth.signOut();

      window.location.href =
        "index.html";

      return false;
    }


    console.log(
      "SUPER ADMIN ACCESS GRANTED"
    );

    return true;

  }
  catch (error) {

    console.error(
      "CHECK SUPER ADMIN FAILED:",
      error
    );

    showMessage(
      "Unexpected error:\n" +
      error.message,
      "error"
    );

    return false;
  }
}


// ==========================================
// LOAD INSTITUTIONS
// ==========================================

async function loadInstitutions() {

  const tableBody =
    document.getElementById(
      "institutionsTableBody"
    );


  if (tableBody) {

    tableBody.innerHTML = `
      <tr>
        <td colspan="6"
            style="text-align:center;padding:30px;">
          Loading institutions...
        </td>
      </tr>
    `;
  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("institutions")
        .select(
          "id, name, code, email, phone, address, city, country, logo_url, website_url, is_active, created_at, updated_at"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        "LOAD INSTITUTIONS ERROR:",
        error
      );

      if (tableBody) {

        tableBody.innerHTML = `
          <tr>
            <td colspan="6"
                style="text-align:center;padding:30px;color:#DC2626;">
              Unable to load institutions.<br><br>
              ${escapeHTML(error.message)}
            </td>
          </tr>
        `;
      }

      return false;
    }


    allInstitutions =
      data || [];


    renderInstitutions(
      allInstitutions
    );


    console.log(
      "Institutions loaded:",
      allInstitutions.length
    );


    return true;

  }
  catch (error) {

    console.error(
      "LOAD INSTITUTIONS FAILED:",
      error
    );

    if (tableBody) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="6"
              style="text-align:center;padding:30px;color:#DC2626;">
            Unexpected error:<br><br>
            ${escapeHTML(error.message)}
          </td>
        </tr>
      `;
    }

    return false;
  }
}


// ==========================================
// RENDER INSTITUTIONS
// ==========================================

function renderInstitutions(
  institutions
) {

  const tableBody =
    document.getElementById(
      "institutionsTableBody"
    );


  if (!tableBody) {

    console.error(
      "institutionsTableBody not found."
    );

    return;
  }


  if (
    !institutions ||
    institutions.length === 0
  ) {

    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          No institutions found.
        </td>
      </tr>
    `;

    return;
  }


  tableBody.innerHTML =
    institutions
      .map(
        function (institution) {

          const active =
            institution.is_active !== false;


          const status =
            active
              ? "ACTIVE"
              : "INACTIVE";


          const statusClass =
            active
              ? "active"
              : "inactive";


          return `
            <tr>

              <td>
                <strong>
                  ${escapeHTML(
                    institution.name || "-"
                  )}
                </strong>
              </td>

              <td>
                ${escapeHTML(
                  institution.code || "-"
                )}
              </td>

              <td>
                ${escapeHTML(
                  institution.city || "-"
                )}
              </td>

              <td>
                ${escapeHTML(
                  institution.phone || "-"
                )}
              </td>

              <td>
                <span class="status ${statusClass}">
                  ${status}
                </span>
              </td>

              <td>

                <button
                  class="action-btn view-btn"
                  onclick="viewInstitution('${institution.id}')"
                >
                  VIEW
                </button>

                <button
                  class="action-btn edit-btn"
                  onclick="editInstitution('${institution.id}')"
                >
                  EDIT
                </button>

                <button
                  class="action-btn toggle-btn"
                  onclick="toggleInstitution('${institution.id}')"
                >
                  ${active ? "DISABLE" : "ACTIVATE"}
                </button>

                <button
                  class="action-btn delete-btn"
                  onclick="deleteInstitution('${institution.id}')"
                >
                  DELETE
                </button>

              </td>

            </tr>
          `;

        }
      )
      .join("");
}


// ==========================================
// ADD / EDIT FORM
// ==========================================

async function handleInstitutionSubmit(
  event
) {

  event.preventDefault();


  const form =
    document.getElementById(
      "institutionForm"
    );


  const button =
    document.getElementById(
      "saveBtn"
    );


  if (!form || !button) {
    return;
  }


  const editId =
    document
      .getElementById("editId")
      .value
      .trim();


  const name =
    document
      .getElementById("name")
      .value
      .trim();


  const code =
    document
      .getElementById("code")
      .value
      .trim()
      .toUpperCase();


  const email =
    document
      .getElementById("email")
      .value
      .trim();


  const phone =
    document
      .getElementById("phone")
      .value
      .trim();


  const address =
    document
      .getElementById("address")
      .value
      .trim();


  const city =
    document
      .getElementById("city")
      .value
      .trim();


  const country =
    document
      .getElementById("country")
      .value
      .trim();


  const website_url =
    document
      .getElementById("website_url")
      .value
      .trim();


  const logo_url =
    document
      .getElementById("logo_url")
      .value
      .trim();


  // ======================================
  // VALIDATION
  // ======================================

  if (!name) {

    showMessage(
      "Please enter institution name.",
      "error"
    );

    return;
  }


  if (!code) {

    showMessage(
      "Please enter institution code.",
      "error"
    );

    return;
  }


  button.disabled =
    true;


  button.textContent =
    editId
      ? "UPDATING..."
      : "ADDING...";


  showMessage(
    editId
      ? "Updating institution..."
      : "Checking institution...",
    "info"
  );


  try {

    // ====================================
    // DUPLICATE CODE CHECK
    // ====================================

    let duplicateQuery =
      supabaseClient
        .from("institutions")
        .select("id, name, code")
        .eq("code", code);


    if (editId) {

      duplicateQuery =
        duplicateQuery.neq(
          "id",
          editId
        );
    }


    const {
      data: existing,
      error: duplicateError
    } =
      await duplicateQuery
        .maybeSingle();


    if (duplicateError) {

      console.error(
        "DUPLICATE CHECK ERROR:",
        duplicateError
      );

      showMessage(
        "Unable to check institution:\n" +
        duplicateError.message,
        "error"
      );

      return;
    }


    if (existing) {

      showMessage(
        "Institution code already exists: " +
        existing.code,
        "error"
      );

      return;
    }


    // ====================================
    // PAYLOAD
    // ====================================

    const payload = {

      name:
        name,

      code:
        code,

      email:
        email || null,

      phone:
        phone || null,

      address:
        address || null,

      city:
        city || null,

      country:
        country || "Somalia",

      website_url:
        website_url || null,

      logo_url:
        logo_url || null

    };


    // ====================================
    // UPDATE
    // ====================================

    if (editId) {

      const {
        data,
        error
      } =
        await supabaseClient
          .from("institutions")
          .update(payload)
          .eq("id", editId)
          .select()
          .single();


      if (error) {

        console.error(
          "UPDATE ERROR:",
          error
        );

        showMessage(
          "Unable to update institution:\n" +
          error.message,
          "error"
        );

        return;
      }


      console.log(
        "INSTITUTION UPDATED:",
        data
      );


      showMessage(
        "✓ Institution updated successfully.",
        "success"
      );


      alert(
        "✓ Institution updated successfully!"
      );


      resetForm();


      await loadInstitutions();

      return;
    }


    // ====================================
    // INSERT
    // ====================================

    payload.is_active =
      true;


    const {
      data,
      error
    } =
      await supabaseClient
        .from("institutions")
        .insert([payload])
        .select()
        .single();


    if (error) {

      console.error(
        "INSERT ERROR:",
        error
      );

      showMessage(
        "Unable to add institution:\n" +
        error.message,
        "error"
      );

      return;
    }


    console.log(
      "INSTITUTION CREATED:",
      data
    );


    showMessage(
      "✓ Institution added successfully.",
      "success"
    );


    alert(
      '✓ Institution "' +
      name +
      '" added successfully!'
    );


    resetForm();


    await loadInstitutions();

  }
  catch (error) {

    console.error(
      "SAVE INSTITUTION FAILED:",
      error
    );

    showMessage(
      "Unexpected error:\n" +
      error.message,
      "error"
    );

  }
  finally {

    button.disabled =
      false;

    const edit =
      document
        .getElementById("editId")
        .value
        .trim();

    button.textContent =
      edit
        ? "UPDATE INSTITUTION"
        : "ADD INSTITUTION";
  }
}


// ==========================================
// EDIT INSTITUTION
// ==========================================

function editInstitution(
  id
) {

  const institution =
    allInstitutions.find(
      function (item) {
        return item.id === id;
      }
    );


  if (!institution) {

    alert(
      "Institution not found."
    );

    return;
  }


  document
    .getElementById("editId")
    .value =
      institution.id;


  document
    .getElementById("name")
    .value =
      institution.name || "";


  document
    .getElementById("code")
    .value =
      institution.code || "";


  document
    .getElementById("email")
    .value =
      institution.email || "";


  document
    .getElementById("phone")
    .value =
      institution.phone || "";


  document
    .getElementById("address")
    .value =
      institution.address || "";


  document
    .getElementById("city")
    .value =
      institution.city || "";


  document
    .getElementById("country")
    .value =
      institution.country || "Somalia";


  document
    .getElementById("website_url")
    .value =
      institution.website_url || "";


  document
    .getElementById("logo_url")
    .value =
      institution.logo_url || "";


  document
    .getElementById("formTitle")
    .textContent =
      "✏️ Edit Institution";


  document
    .getElementById("saveBtn")
    .textContent =
      "UPDATE INSTITUTION";


  showMessage(
    "Editing: " +
    institution.name,
    "info"
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ==========================================
// RESET FORM
// ==========================================

function resetForm() {

  const form =
    document.getElementById(
      "institutionForm"
    );


  if (form) {
    form.reset();
  }


  const editId =
    document.getElementById(
      "editId"
    );


  if (editId) {
    editId.value = "";
  }


  const country =
    document.getElementById(
      "country"
    );


  if (country) {
    country.value =
      "Somalia";
  }


  const title =
    document.getElementById(
      "formTitle"
    );


  if (title) {
    title.textContent =
      "➕ Add Institution";
  }


  const button =
    document.getElementById(
      "saveBtn"
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "ADD INSTITUTION";
  }


  showMessage(
    "",
    "info"
  );
}


// ==========================================
// VIEW INSTITUTION
// ==========================================

function viewInstitution(
  id
) {

  const institution =
    allInstitutions.find(
      function (item) {
        return item.id === id;
      }
    );


  if (!institution) {

    alert(
      "Institution not found."
    );

    return;
  }


  const active =
    institution.is_active !== false;


  const details =
    document.getElementById(
      "institutionDetails"
    );


  if (!details) {
    return;
  }


  details.innerHTML = `

    <div class="detail">
      <strong>Institution Name</strong>
      <span>
        ${escapeHTML(
          institution.name || "-"
        )}
      </span>
    </div>

    <div class="detail">
      <strong>Institution Code</strong>
      <span>
        ${escapeHTML(
          institution.code || "-"
        )}
      </span>
    </div>

    <div class="detail">
      <strong>Email</strong>
      <span>
        ${escapeHTML(
          institution.email || "-"
        )}
      </span>
    </div>

    <div class="detail">
      <strong>Phone</strong>
      <span>
        ${escapeHTML(
          institution.phone || "-"
        )}
      </span>
    </div>

    <div class="detail">
      <strong>Address</strong>
      <span>
        ${escapeHTML(
          institution.address || "-"
        )}
      </span>
    </div>

    <div class="detail">
      <strong>City</strong>
      <span>
        ${escapeHTML(
          institution.city || "-"
        )}
      </span>
    </div>

    <div class="detail">
      <strong>Country</strong>
      <span>
        ${escapeHTML(
          institution.country || "-"
        )}
      </span>
    </div>

    <div class="detail">
      <strong>Status</strong>
      <span>
        ${active ? "ACTIVE" : "INACTIVE"}
      </span>
    </div>

    <div class="detail">
      <strong>Website</strong>
      <span>
        ${escapeHTML(
          institution.website_url || "-"
        )}
      </span>
    </div>

    <div class="detail">
      <strong>Logo URL</strong>
      <span>
        ${escapeHTML(
          institution.logo_url || "-"
        )}
      </span>
    </div>

    <div class="detail">
      <strong>Created</strong>
      <span>
        ${formatDate(
          institution.created_at
        )}
      </span>
    </div>

    <div class="detail">
      <strong>Updated</strong>
      <span>
        ${formatDate(
          institution.updated_at
        )}
      </span>
    </div>

  `;


  document
    .getElementById(
      "viewModal"
    )
    .classList.add("show");
}


// ==========================================
// CLOSE VIEW MODAL
// ==========================================

function closeViewModal() {

  const modal =
    document.getElementById(
      "viewModal"
    );


  if (modal) {
    modal.classList.remove("show");
  }
}


// ==========================================
// TOGGLE ACTIVE / INACTIVE
// ==========================================

async function toggleInstitution(
  id
) {

  const institution =
    allInstitutions.find(
      function (item) {
        return item.id === id;
      }
    );


  if (!institution) {

    alert(
      "Institution not found."
    );

    return;
  }


  const newStatus =
    institution.is_active === false;


  const action =
    newStatus
      ? "activate"
      : "deactivate";


  const confirmed =
    confirm(
      "Are you sure you want to " +
      action +
      ' "' +
      institution.name +
      '"?'
    );


  if (!confirmed) {
    return;
  }


  try {

    const {
      error
    } =
      await supabaseClient
        .from("institutions")
        .update({
          is_active:
            newStatus
        })
        .eq(
          "id",
          id
        );


    if (error) {

      console.error(
        "TOGGLE ERROR:",
        error
      );

      alert(
        "Unable to change institution status:\n\n" +
        error.message
      );

      return;
    }


    alert(
      "✓ Institution " +
      (
        newStatus
          ? "activated"
          : "deactivated"
      ) +
      " successfully."
    );


    await loadInstitutions();

  }
  catch (error) {

    console.error(
      "TOGGLE FAILED:",
      error
    );

    alert(
      "Unexpected error:\n\n" +
      error.message
    );
  }
}


// ==========================================
// DELETE INSTITUTION
// ==========================================

async function deleteInstitution(
  id
) {

  const institution =
    allInstitutions.find(
      function (item) {
        return item.id === id;
      }
    );


  if (!institution) {

    alert(
      "Institution not found."
    );

    return;
  }


  const confirmed =
    confirm(
      'WARNING!\n\n' +
      'You are about to delete:\n\n' +
      institution.name +
      '\n\n' +
      'This action may fail if students, teachers, courses, or other records depend on this institution.\n\n' +
      'Continue?'
    );


  if (!confirmed) {
    return;
  }


  try {

    const {
      error
    } =
      await supabaseClient
        .from("institutions")
        .delete()
        .eq(
          "id",
          id
        );


    if (error) {

      console.error(
        "DELETE ERROR:",
        error
      );

      alert(
        "Unable to delete institution.\n\n" +
        error.message +
        "\n\n" +
        "If this institution has related records, deactivate it instead."
      );

      return;
    }


    alert(
      "✓ Institution deleted successfully."
    );


    await loadInstitutions();

  }
  catch (error) {

    console.error(
      "DELETE FAILED:",
      error
    );

    alert(
      "Unexpected error:\n\n" +
      error.message
    );
  }
}


// ==========================================
// SEARCH
// ==========================================

function setupSearch() {

  const searchInput =
    document.getElementById(
      "searchInput"
    );


  if (!searchInput) {
    return;
  }


  searchInput.addEventListener(
    "input",
    function () {

      const search =
        this.value
          .trim()
          .toLowerCase();


      if (!search) {

        renderInstitutions(
          allInstitutions
        );

        return;
      }


      const filtered =
        allInstitutions.filter(
          function (institution) {

            return (

              String(
                institution.name || ""
              )
                .toLowerCase()
                .includes(search)

              ||

              String(
                institution.code || ""
              )
                .toLowerCase()
                .includes(search)

              ||

              String(
                institution.city || ""
              )
                .toLowerCase()
                .includes(search)

              ||

              String(
                institution.phone || ""
              )
                .toLowerCase()
                .includes(search)

              ||

              String(
                institution.email || ""
              )
                .toLowerCase()
                .includes(search)

              ||

              String(
                institution.country || ""
              )
                .toLowerCase()
                .includes(search)

            );

          }
        );


      renderInstitutions(
        filtered
      );

    }
  );
}


// ==========================================
// FORM EVENTS
// ==========================================

function setupForm() {

  const form =
    document.getElementById(
      "institutionForm"
    );


  if (form) {

    form.addEventListener(
      "submit",
      handleInstitutionSubmit
    );
  }


  const clearBtn =
    document.getElementById(
      "clearBtn"
    );


  if (clearBtn) {

    clearBtn.addEventListener(
      "click",
      resetForm
    );
  }
}


// ==========================================
// MODAL OUTSIDE CLICK
// ==========================================

function setupModal() {

  const modal =
    document.getElementById(
      "viewModal"
    );


  if (!modal) {
    return;
  }


  modal.addEventListener(
    "click",
    function (event) {

      if (event.target === modal) {

        closeViewModal();
      }

    }
  );
}


// ==========================================
// DATE FORMAT
// ==========================================

function formatDate(
  value
) {

  if (!value) {
    return "-";
  }


  try {

    return new Date(
      value
    ).toLocaleString();

  }
  catch {

    return String(value);
  }
}


// ==========================================
// START PAGE
// ==========================================

async function startInstitutionsPage() {

  console.log(
    "================================"
  );

  console.log(
    "GAAWOW EMS Institutions V2"
  );

  console.log(
    "Starting..."
  );

  console.log(
    "================================"
  );


  // ======================================
  // SUPABASE
  // ======================================

  if (!initializeSupabase()) {
    return;
  }


  // ======================================
  // UI EVENTS
  // ======================================

  setupForm();

  setupSearch();

  setupModal();


  // ======================================
  // AUTH
  // ======================================

  const allowed =
    await checkSuperAdmin();


  if (!allowed) {
    return;
  }


  // ======================================
  // LOAD DATA
  // ======================================

  await loadInstitutions();

}


// ==========================================
// DOM READY
// ==========================================

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startInstitutionsPage
  );

}
else {

  startInstitutionsPage();

}
