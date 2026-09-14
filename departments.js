const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

let allDepartments = [];
let institutions = [];
let teachers = [];


// ==========================================
// START
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

  document
    .getElementById("searchInput")
    .addEventListener("input", applyFilters);

  document
    .getElementById("institutionFilter")
    .addEventListener("change", applyFilters);

  document
    .getElementById("statusFilter")
    .addEventListener("change", applyFilters);

  document
    .getElementById("departmentForm")
    .addEventListener("submit", saveDepartment);

  await checkAccess();

});


// ==========================================
// ACCESS CHECK
// ==========================================

async function checkAccess() {

  try {

    const {
      data: {
        session
      }
    } = await supabaseClient.auth.getSession();

    if (!session) {

      alert("Please login first.");

      window.location.href = "index.html";

      return;

    }

    const {
      data: profile,
      error
    } = await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        is_active
      `)
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {

      console.error(error);

      alert(
        "Unable to verify your profile."
      );

      return;

    }

    if (!profile) {

      alert("Profile not found.");

      return;

    }

    if (profile.role !== "super_admin") {

      alert(
        "Access denied. Super Admin only."
      );

      window.location.href =
        "dashboard.html";

      return;

    }

    if (profile.is_active === false) {

      alert(
        "Your account is inactive."
      );

      return;

    }

    await loadInstitutions();

    await loadTeachers();

    await loadDepartments();

  } catch (error) {

    console.error(error);

    alert(
      "System error: " +
      error.message
    );

  }

}


// ==========================================
// LOAD INSTITUTIONS
// ==========================================

async function loadInstitutions() {

  const {
    data,
    error
  } = await supabaseClient
    .from("institutions")
    .select("id, name")
    .order("name");

  if (error) {

    console.error(
      "Institution error:",
      error
    );

    alert(
      "Failed to load institutions: " +
      error.message
    );

    return;

  }

  institutions = data || [];

  const filter =
    document.getElementById(
      "institutionFilter"
    );

  const formSelect =
    document.getElementById(
      "institutionId"
    );

  filter.innerHTML =
    `<option value="">All Institutions</option>`;

  formSelect.innerHTML =
    `<option value="">Select Institution</option>`;

  institutions.forEach(institution => {

    filter.innerHTML += `
      <option value="${institution.id}">
        ${escapeHtml(institution.name)}
      </option>
    `;

    formSelect.innerHTML += `
      <option value="${institution.id}">
        ${escapeHtml(institution.name)}
      </option>
    `;

  });

}


// ==========================================
// LOAD TEACHERS
// ==========================================

async function loadTeachers() {

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      institution_id,
      is_active
    `)
    .eq("role", "teacher")
    .order("full_name");

  if (error) {

    console.error(
      "Teacher error:",
      error
    );

    // Teacher list is optional for Department Head.
    teachers = [];

    return;

  }

  teachers = data || [];

  populateTeacherSelect();

}


// ==========================================
// TEACHER SELECT
// ==========================================

function populateTeacherSelect() {

  const select =
    document.getElementById(
      "headProfileId"
    );

  select.innerHTML =
    `<option value="">No Department Head</option>`;

  teachers.forEach(teacher => {

    select.innerHTML += `
      <option value="${teacher.id}">
        ${escapeHtml(
          teacher.full_name ||
          "Unnamed Teacher"
        )}
      </option>
    `;

  });

}


// ==========================================
// LOAD DEPARTMENTS
// ==========================================

async function loadDepartments() {

  const tbody =
    document.getElementById(
      "departmentsBody"
    );

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="loading">
        Loading departments...
      </td>
    </tr>
  `;

  const {
    data,
    error
  } = await supabaseClient
    .from("departments")
    .select(`
      id,
      institution_id,
      name,
      code,
      description,
      head_profile_id,
      is_active,
      created_at,
      updated_at
    `)
    .order("name", {
      ascending: true
    });

  if (error) {

    console.error(
      "Department error:",
      error
    );

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          Failed to load departments.<br>
          ${escapeHtml(error.message)}
        </td>
      </tr>
    `;

    return;

  }

  allDepartments = data || [];

  updateStats();

  applyFilters();

}


// ==========================================
// FILTERS
// ==========================================

function applyFilters() {

  const search =
    document
      .getElementById("searchInput")
      .value
      .trim()
      .toLowerCase();

  const institutionId =
    document.getElementById(
      "institutionFilter"
    ).value;

  const status =
    document.getElementById(
      "statusFilter"
    ).value;

  let filtered =
    allDepartments.filter(department => {

      const matchesSearch =
        !search ||
        (department.name || "")
          .toLowerCase()
          .includes(search) ||
        (department.code || "")
          .toLowerCase()
          .includes(search);

      const matchesInstitution =
        !institutionId ||
        department.institution_id ===
          institutionId;

      const matchesStatus =
        !status ||
        String(department.is_active) ===
          status;

      return (
        matchesSearch &&
        matchesInstitution &&
        matchesStatus
      );

    });

  renderDepartments(filtered);

}


// ==========================================
// RENDER
// ==========================================

function renderDepartments(data) {

  const tbody =
    document.getElementById(
      "departmentsBody"
    );

  if (!data.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          No departments found.
        </td>
      </tr>
    `;

    return;

  }

  tbody.innerHTML = data.map(
    department => {

      const institution =
        institutions.find(
          item =>
            item.id ===
            department.institution_id
        );

      const head =
        teachers.find(
          teacher =>
            teacher.id ===
            department.head_profile_id
        );

      const statusClass =
        department.is_active
          ? "active"
          : "inactive";

      const statusText =
        department.is_active
          ? "Active"
          : "Inactive";

      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(
                department.name
              )}
            </strong>
          </td>

          <td>
            <span class="code">
              ${escapeHtml(
                department.code
              )}
            </span>
          </td>

          <td>
            ${escapeHtml(
              institution?.name ||
              "Unknown"
            )}
          </td>

          <td>
            ${escapeHtml(
              head?.full_name ||
              "Not assigned"
            )}
          </td>

          <td>
            <span class="status ${statusClass}">
              ${statusText}
            </span>
          </td>

          <td>

            <div class="actions">

              <button
                class="action-btn edit"
                onclick="editDepartment('${department.id}')"
              >
                Edit
              </button>

              <button
                class="action-btn toggle"
                onclick="toggleDepartment('${department.id}')"
              >
                ${department.is_active
                  ? "Deactivate"
                  : "Activate"}
              </button>

            </div>

          </td>

        </tr>
      `;

    }
  ).join("");

}


// ==========================================
// STATS
// ==========================================

function updateStats() {

  const total =
    allDepartments.length;

  const active =
    allDepartments.filter(
      item => item.is_active
    ).length;

  const inactive =
    allDepartments.filter(
      item => !item.is_active
    ).length;

  document.getElementById(
    "totalDepartments"
  ).textContent = total;

  document.getElementById(
    "activeDepartments"
  ).textContent = active;

  document.getElementById(
    "inactiveDepartments"
  ).textContent = inactive;

}


// ==========================================
// OPEN ADD MODAL
// ==========================================

function openAddModal() {

  document.getElementById(
    "departmentForm"
  ).reset();

  document.getElementById(
    "departmentId"
  ).value = "";

  document.getElementById(
    "modalTitle"
  ).textContent =
    "Add Department";

  document.getElementById(
    "saveBtn"
  ).textContent =
    "Save Department";

  document.getElementById(
    "isActive"
  ).value = "true";

  document.getElementById(
    "departmentModal"
  ).classList.add("show");

}


// ==========================================
// EDIT DEPARTMENT
// ==========================================

function editDepartment(id) {

  const department =
    allDepartments.find(
      item => item.id === id
    );

  if (!department) {

    alert(
      "Department not found."
    );

    return;

  }

  document.getElementById(
    "departmentId"
  ).value =
    department.id;

  document.getElementById(
    "institutionId"
  ).value =
    department.institution_id;

  document.getElementById(
    "departmentName"
  ).value =
    department.name || "";

  document.getElementById(
    "departmentCode"
  ).value =
    department.code || "";

  document.getElementById(
    "departmentDescription"
  ).value =
    department.description || "";

  document.getElementById(
    "headProfileId"
  ).value =
    department.head_profile_id || "";

  document.getElementById(
    "isActive"
  ).value =
    String(
      department.is_active
    );

  document.getElementById(
    "modalTitle"
  ).textContent =
    "Edit Department";

  document.getElementById(
    "saveBtn"
  ).textContent =
    "Update Department";

  document.getElementById(
    "departmentModal"
  ).classList.add("show");

}


// ==========================================
// SAVE / UPDATE
// ==========================================

async function saveDepartment(event) {

  event.preventDefault();

  const saveBtn =
    document.getElementById(
      "saveBtn"
    );

  saveBtn.disabled = true;

  saveBtn.textContent =
    "Saving...";

  try {

    const id =
      document.getElementById(
        "departmentId"
      ).value;

    const institutionId =
      document.getElementById(
        "institutionId"
      ).value;

    const name =
      document.getElementById(
        "departmentName"
      ).value
      .trim();

    const code =
      document.getElementById(
        "departmentCode"
      ).value
      .trim()
      .toUpperCase();

    const description =
      document.getElementById(
        "departmentDescription"
      ).value
      .trim();

    const headProfileId =
      document.getElementById(
        "headProfileId"
      ).value || null;

    const isActive =
      document.getElementById(
        "isActive"
      ).value === "true";

    if (!institutionId) {

      alert(
        "Please select an institution."
      );

      return;

    }

    if (!name) {

      alert(
        "Department name is required."
      );

      return;

    }

    if (!code) {

      alert(
        "Department code is required."
      );

      return;

    }

    const payload = {

      institution_id:
        institutionId,

      name:
        name,

      code:
        code,

      description:
        description || null,

      head_profile_id:
        headProfileId,

      is_active:
        isActive,

      updated_at:
        new Date().toISOString()

    };


    // UPDATE

    if (id) {

      const {
        error
      } = await supabaseClient
        .from("departments")
        .update(payload)
        .eq("id", id);

      if (error) {

        throw error;

      }

      alert(
        "Department updated successfully."
      );

    }

    // INSERT

    else {

      const {
        error
      } = await supabaseClient
        .from("departments")
        .insert({

          ...payload,

          created_at:
            new Date().toISOString()

        });

      if (error) {

        throw error;

      }

      alert(
        "Department created successfully."
      );

    }

    closeModal();

    await loadDepartments();

  } catch (error) {

    console.error(
      "Save department error:",
      error
    );

    alert(
      "Failed to save department:\n\n" +
      error.message
    );

  } finally {

    saveBtn.disabled = false;

    saveBtn.textContent =
      document.getElementById(
        "departmentId"
      ).value
        ? "Update Department"
        : "Save Department";

  }

}


// ==========================================
// ACTIVATE / DEACTIVATE
// ==========================================

async function toggleDepartment(id) {

  const department =
    allDepartments.find(
      item => item.id === id
    );

  if (!department) {

    return;

  }

  const newStatus =
    !department.is_active;

  const action =
    newStatus
      ? "activate"
      : "deactivate";

  const confirmed =
    confirm(
      `Are you sure you want to ${action} "${department.name}"?`
    );

  if (!confirmed) {

    return;

  }

  const {
    error
  } = await supabaseClient
    .from("departments")
    .update({

      is_active:
        newStatus,

      updated_at:
        new Date().toISOString()

    })
    .eq("id", id);

  if (error) {

    console.error(error);

    alert(
      "Failed to update status:\n\n" +
      error.message
    );

    return;

  }

  alert(
    `Department ${newStatus
      ? "activated"
      : "deactivated"} successfully.`
  );

  await loadDepartments();

}


// ==========================================
// CLOSE MODAL
// ==========================================

function closeModal() {

  document.getElementById(
    "departmentModal"
  ).classList.remove("show");

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(value) {

  if (value === null ||
      value === undefined) {

    return "";

  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}
