const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


let institutions = [];

let editingId = null;


const tableBody =
  document.getElementById(
    "institutionsTable"
  );

const searchInput =
  document.getElementById(
    "searchInput"
  );

const statusFilter =
  document.getElementById(
    "statusFilter"
  );

const modal =
  document.getElementById(
    "institutionModal"
  );

const modalTitle =
  document.getElementById(
    "modalTitle"
  );

const institutionForm =
  document.getElementById(
    "institutionForm"
  );

const institutionName =
  document.getElementById(
    "institutionName"
  );

const institutionStatus =
  document.getElementById(
    "institutionStatus"
  );

const message =
  document.getElementById(
    "message"
  );

const saveBtn =
  document.getElementById(
    "saveBtn"
  );


/* =========================
   AUTH + SUPER ADMIN CHECK
========================= */

async function checkSuperAdmin() {

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();


  if (
    error ||
    !data.session
  ) {

    window.location.href =
      "index.html";

    return false;
  }


  const user =
    data.session.user;


  const {
    data: profile,
    error: profileError
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "role, is_active"
      )
      .eq(
        "id",
        user.id
      )
      .single();


  if (
    profileError ||
    !profile
  ) {

    alert(
      "Unable to load your profile."
    );

    return false;
  }


  if (
    profile.role !==
    "super_admin"
  ) {

    alert(
      "Access denied. Super Admin only."
    );

    window.location.href =
      "dashboard.html";

    return false;
  }


  if (
    profile.is_active !== true
  ) {

    alert(
      "Your account is inactive."
    );

    await supabaseClient.auth.signOut();

    window.location.href =
      "index.html";

    return false;
  }


  return true;
}


/* =========================
   LOAD INSTITUTIONS
========================= */

async function loadInstitutions() {

  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="loading">
        Loading institutions...
      </td>
    </tr>
  `;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("institutions")
      .select(
        "id, name, created_at"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Institutions error:",
      error
    );

    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          Unable to load institutions.
          <br>
          ${escapeHtml(error.message)}
        </td>
      </tr>
    `;

    return;
  }


  institutions =
    data || [];


  renderInstitutions();
}


/* =========================
   RENDER
========================= */

function renderInstitutions() {

  const search =
    searchInput.value
      .trim()
      .toLowerCase();


  const status =
    statusFilter.value;


  const filtered =
    institutions.filter(
      institution => {

        const matchesSearch =
          !search ||
          institution.name
            .toLowerCase()
            .includes(search);


        /*
          The current institutions table
          does not necessarily have a status
          column.

          Therefore existing institutions
          are treated as active.
        */

        const institutionStatus =
          "active";


        const matchesStatus =
          status === "all" ||
          status === institutionStatus;


        return (
          matchesSearch &&
          matchesStatus
        );

      }
    );


  if (
    filtered.length === 0
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
    filtered
      .map(
        (
          institution,
          index
        ) => {

          const created =
            institution.created_at
              ? new Date(
                  institution.created_at
                ).toLocaleDateString()
              : "—";


          return `

            <tr>

              <td>
                ${index + 1}
              </td>

              <td>
                <strong>
                  ${escapeHtml(
                    institution.name
                  )}
                </strong>
              </td>

              <td>
                <small>
                  ${escapeHtml(
                    institution.id
                  )}
                </small>
              </td>

              <td>

                <span
                  class="status active"
                >
                  ACTIVE
                </span>

              </td>

              <td>
                ${created}
              </td>

              <td>

                <div class="actions">

                  <button
                    class="action-btn view-btn"
                    onclick="viewInstitution('${institution.id}')"
                  >
                    View
                  </button>

                  <button
                    class="action-btn edit-btn"
                    onclick="editInstitution('${institution.id}')"
                  >
                    Edit
                  </button>

                  <button
                    class="action-btn toggle-btn"
                    onclick="toggleInstitution('${institution.id}')"
                  >
                    Disable
                  </button>

                </div>

              </td>

            </tr>

          `;

        }
      )
      .join("");
}


/* =========================
   OPEN ADD MODAL
========================= */

function openAddModal() {

  editingId = null;

  modalTitle.textContent =
    "Add Institution";

  institutionForm.reset();

  institutionStatus.value =
    "active";

  saveBtn.textContent =
    "Save Institution";

  modal.classList.add(
    "show"
  );
}


/* =========================
   CLOSE MODAL
========================= */

function closeModal() {

  modal.classList.remove(
    "show"
  );

  institutionForm.reset();

  editingId = null;
}


/* =========================
   EDIT
========================= */

function editInstitution(id) {

  const institution =
    institutions.find(
      item =>
        item.id === id
    );


  if (!institution) {
    return;
  }


  editingId =
    institution.id;


  modalTitle.textContent =
    "Edit Institution";


  institutionName.value =
    institution.name || "";


  institutionStatus.value =
    "active";


  saveBtn.textContent =
    "Update Institution";


  modal.classList.add(
    "show"
  );
}


/* =========================
   VIEW
========================= */

function viewInstitution(id) {

  const institution =
    institutions.find(
      item =>
        item.id === id
    );


  if (!institution) {
    return;
  }


  alert(
    "Institution\n\n" +
    "Name: " +
    institution.name +
    "\n\nID: " +
    institution.id
  );
}


/* =========================
   SAVE
========================= */

institutionForm.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();


    const name =
      institutionName.value
        .trim();


    if (!name) {

      showMessage(
        "Institution name is required.",
        "error"
      );

      return;
    }


    saveBtn.disabled =
      true;


    saveBtn.textContent =
      editingId
        ? "Updating..."
        : "Saving...";


    if (!editingId) {

      /*
        Add new institution
      */

      const {
        error
      } =
        await supabaseClient
          .from("institutions")
          .insert({
            name: name
          });


      if (error) {

        console.error(
          "Insert error:",
          error
        );

        showMessage(
          error.message,
          "error"
        );

      } else {

        showMessage(
          "Institution added successfully.",
          "success"
        );

        closeModal();

        await loadInstitutions();

      }

    } else {

      /*
        Update institution
      */

      const {
        error
      } =
        await supabaseClient
          .from("institutions")
          .update({
            name: name
          })
          .eq(
            "id",
            editingId
          );


      if (error) {

        console.error(
          "Update error:",
          error
        );

        showMessage(
          error.message,
          "error"
        );

      } else {

        showMessage(
          "Institution updated successfully.",
          "success"
        );

        closeModal();

        await loadInstitutions();

      }

    }


    saveBtn.disabled =
      false;


    saveBtn.textContent =
      editingId
        ? "Update Institution"
        : "Save Institution";

  }
);


/* =========================
   TOGGLE
========================= */

async function toggleInstitution(id) {

  const institution =
    institutions.find(
      item =>
        item.id === id
    );


  if (!institution) {
    return;
  }


  /*
    NOTE:
    The current institutions table
    shown in the project does not
    contain a status column.

    Therefore we do not modify
    the database here yet.
  */

  alert(
    "Institution status management will be enabled after the institutions table gets an 'is_active' column."
  );
}


/* =========================
   SEARCH
========================= */

searchInput.addEventListener(
  "input",
  renderInstitutions
);


statusFilter.addEventListener(
  "change",
  renderInstitutions
);


/* =========================
   BUTTONS
========================= */

document
  .getElementById(
    "addInstitutionBtn"
  )
  .addEventListener(
    "click",
    openAddModal
  );


document
  .getElementById(
    "closeModalBtn"
  )
  .addEventListener(
    "click",
    closeModal
  );


document
  .getElementById(
    "cancelModalBtn"
  )
  .addEventListener(
    "click",
    closeModal
  );


modal.addEventListener(
  "click",
  function(event) {

    if (
      event.target === modal
    ) {

      closeModal();

    }

  }
);


/* =========================
   MESSAGE
========================= */

function showMessage(
  text,
  type
) {

  message.textContent =
    text;

  message.className =
    "message " + type;


  setTimeout(
    function() {

      message.className =
        "message";

    },
    4000
  );
}


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value) {

  return String(value ?? "")
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


/* =========================
   START
========================= */

async function start() {

  const allowed =
    await checkSuperAdmin();


  if (!allowed) {
    return;
  }


  await loadInstitutions();

}


start();
