const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const CREATE_TEACHER_FUNCTION_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co/functions/v1/create-teacher";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

let teachers = [];
let institutions = [];

let currentUser = null;
let currentProfile = null;


/* ================================
   START
================================ */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    await checkAccess();

    document
      .getElementById("searchInput")
      .addEventListener(
        "input",
        renderTeachers
      );

    document
      .getElementById("institutionFilter")
      .addEventListener(
        "change",
        renderTeachers
      );

    document
      .getElementById("statusFilter")
      .addEventListener(
        "change",
        renderTeachers
      );

    document
      .getElementById("teacherForm")
      .addEventListener(
        "submit",
        saveTeacher
      );
  }
);


/* ================================
   CHECK SUPER ADMIN
================================ */

async function checkAccess() {

  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();

  if (
    sessionError ||
    !sessionData.session
  ) {
    location.href = "index.html";
    return;
  }

  currentUser =
    sessionData.session.user;

  const {
    data: profile,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "id,full_name,phone,avatar_url,role,institution_id,is_active"
      )
      .eq(
        "id",
        currentUser.id
      )
      .single();

  if (error || !profile) {

    alert(
      "Profile not found."
    );

    location.href =
      "dashboard.html";

    return;
  }

  currentProfile = profile;

  if (
    profile.role !==
    "super_admin"
  ) {

    alert(
      "Access denied. Super Admin only."
    );

    location.href =
      "dashboard.html";

    return;
  }

  await loadInstitutions();

  await loadTeachers();
}


/* ================================
   LOAD INSTITUTIONS
================================ */

async function loadInstitutions() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("institutions")
      .select("id,name")
      .order(
        "name",
        {
          ascending: true
        }
      );

  if (error) {

    console.error(error);

    alert(
      "Failed to load institutions:\n\n" +
      error.message
    );

    return;
  }

  institutions =
    data || [];

  const filter =
    document.getElementById(
      "institutionFilter"
    );

  const select =
    document.getElementById(
      "institutionId"
    );

  filter.innerHTML =
    `<option value="">All Institutions</option>`;

  select.innerHTML =
    `<option value="">Select Institution</option>`;

  institutions.forEach(
    institution => {

      filter.innerHTML += `
        <option value="${institution.id}">
          ${escapeHtml(institution.name)}
        </option>
      `;

      select.innerHTML += `
        <option value="${institution.id}">
          ${escapeHtml(institution.name)}
        </option>
      `;
    }
  );
}


/* ================================
   LOAD TEACHERS
================================ */

async function loadTeachers() {

  const tbody =
    document.getElementById(
      "teachersTableBody"
    );

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="loading">
        Loading teachers...
      </td>
    </tr>
  `;

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        phone,
        avatar_url,
        role,
        institution_id,
        is_active
      `)
      .eq(
        "role",
        "teacher"
      )
      .order(
        "full_name",
        {
          ascending: true
        }
      );

  if (error) {

    console.error(
      "Teachers error:",
      error
    );

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty">
          Failed to load teachers.
          <br><br>
          ${escapeHtml(error.message)}
        </td>
      </tr>
    `;

    return;
  }

  teachers =
    (data || []).map(
      teacher => {

        const institution =
          institutions.find(
            item =>
              item.id ===
              teacher.institution_id
          );

        return {
          ...teacher,
          institution_name:
            institution
              ? institution.name
              : "Unknown Institution"
        };
      }
    );

  renderTeachers();
}


/* ================================
   RENDER
================================ */

function renderTeachers() {

  const tbody =
    document.getElementById(
      "teachersTableBody"
    );

  const search =
    document
      .getElementById(
        "searchInput"
      )
      .value
      .toLowerCase()
      .trim();

  const institutionId =
    document.getElementById(
      "institutionFilter"
    ).value;

  const status =
    document.getElementById(
      "statusFilter"
    ).value;

  let filtered =
    teachers.filter(
      teacher => {

        const matchesSearch =
          !search ||
          String(
            teacher.full_name || ""
          )
            .toLowerCase()
            .includes(search) ||

          String(
            teacher.phone || ""
          )
            .toLowerCase()
            .includes(search) ||

          String(
            teacher.id || ""
          )
            .toLowerCase()
            .includes(search);

        const matchesInstitution =
          !institutionId ||
          teacher.institution_id ===
            institutionId;

        const matchesStatus =
          !status ||
          (
            status === "active"
              ? teacher.is_active === true
              : teacher.is_active === false
          );

        return (
          matchesSearch &&
          matchesInstitution &&
          matchesStatus
        );
      }
    );

  if (!filtered.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty">
          No teachers found.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    filtered
      .map(
        (teacher, index) => {

          const statusClass =
            teacher.is_active
              ? "active"
              : "inactive";

          const statusText =
            teacher.is_active
              ? "Active"
              : "Inactive";

          return `
            <tr>

              <td>
                ${index + 1}
              </td>

              <td>
                <strong>
                  ${escapeHtml(
                    teacher.full_name ||
                    "Unnamed Teacher"
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  teacher.phone ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  teacher.institution_name ||
                  "—"
                )}
              </td>

              <td>
                Teacher
              </td>

              <td>
                <span class="status ${statusClass}">
                  ${statusText}
                </span>
              </td>

              <td>

                <div class="actions">

                  <button
                    class="action-btn view"
                    onclick="viewTeacher('${teacher.id}')">
                    View
                  </button>

                  <button
                    class="action-btn edit"
                    onclick="editTeacher('${teacher.id}')">
                    Edit
                  </button>

                  <button
                    class="action-btn toggle"
                    onclick="toggleTeacher('${teacher.id}')">
                    ${teacher.is_active
                      ? "Disable"
                      : "Activate"}
                  </button>

                  <button
                    class="action-btn delete"
                    onclick="deleteTeacher('${teacher.id}')">
                    Delete
                  </button>

                </div>

              </td>

            </tr>
          `;
        }
      )
      .join("");
}


/* ================================
   OPEN ADD
================================ */

function openAddTeacher() {

  document
    .getElementById(
      "teacherForm"
    )
    .reset();

  document
    .getElementById(
      "editId"
    )
    .value = "";

  document
    .getElementById(
      "modalTitle"
    )
    .textContent =
      "Add Teacher";

  document
    .getElementById(
      "saveBtn"
    )
    .textContent =
      "Create Teacher";

  document
    .getElementById(
      "password"
    ).required = true;

  document
    .getElementById(
      "teacherModal"
    )
    .classList.add(
      "show"
    );
}


/* ================================
   CLOSE MODAL
================================ */

function closeTeacherModal() {

  document
    .getElementById(
      "teacherModal"
    )
    .classList.remove(
      "show"
    );
}


/* ================================
   SAVE / CREATE TEACHER
================================ */

async function saveTeacher(event) {

  event.preventDefault();

  const saveBtn =
    document.getElementById(
      "saveBtn"
    );

  const editId =
    document.getElementById(
      "editId"
    ).value.trim();

  const fullName =
    document.getElementById(
      "fullName"
    ).value.trim();

  const email =
    document.getElementById(
      "email"
    ).value.trim();

  const phone =
    document.getElementById(
      "phone"
    ).value.trim();

  const password =
    document.getElementById(
      "password"
    ).value;

  const avatarUrl =
    document.getElementById(
      "avatarUrl"
    ).value.trim();

  const institutionId =
    document.getElementById(
      "institutionId"
    ).value;

  const isActive =
    document.getElementById(
      "isActive"
    ).value === "true";


  if (!fullName) {

    alert(
      "Please enter teacher name."
    );

    return;
  }


  if (!editId && !email) {

    alert(
      "Please enter teacher email."
    );

    return;
  }


  if (!editId && !password) {

    alert(
      "Please enter teacher password."
    );

    return;
  }


  if (!institutionId) {

    alert(
      "Please select an institution."
    );

    return;
  }


  saveBtn.disabled = true;

  saveBtn.textContent =
    editId
      ? "Updating..."
      : "Creating...";


  try {

    /* ============================
       EDIT EXISTING TEACHER
    ============================ */

    if (editId) {

      const {
        error
      } =
        await supabaseClient
          .from("profiles")
          .update({

            full_name:
              fullName,

            phone:
              phone || null,

            avatar_url:
              avatarUrl || null,

            institution_id:
              institutionId,

            is_active:
              isActive,

            updated_at:
              new Date().toISOString()

          })
          .eq(
            "id",
            editId
          );


      if (error) {
        throw error;
      }


      alert(
        "Teacher updated successfully!"
      );

      closeTeacherModal();

      await loadTeachers();

      return;
    }


    /* ============================
       CREATE NEW TEACHER
    ============================ */

    const {
      data: sessionData,
      error: sessionError
    } =
      await supabaseClient.auth.getSession();


    if (
      sessionError ||
      !sessionData.session
    ) {

      throw new Error(
        "Your Super Admin session has expired. Please login again."
      );
    }


    const accessToken =
      sessionData.session.access_token;


    const response =
      await fetch(
        CREATE_TEACHER_FUNCTION_URL,
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${accessToken}`,

            "apikey":
              SUPABASE_KEY

          },

          body:
            JSON.stringify({

              email:
                email,

              password:
                password,

              full_name:
                fullName,

              phone:
                phone || null,

              avatar_url:
                avatarUrl || null,

              institution_id:
                institutionId,

              is_active:
                isActive

            })
        }
      );


    let resultData = null;

    try {
      resultData =
        await response.json();
    } catch (jsonError) {
      resultData = null;
    }


    if (!response.ok) {

      const message =
        resultData?.error ||
        resultData?.message ||
        `Create Teacher failed. HTTP ${response.status}`;

      throw new Error(
        message
      );
    }


    alert(
      "Teacher account created successfully!"
    );


    closeTeacherModal();

    await loadTeachers();


  } catch (error) {

    console.error(
      "Create Teacher Error:",
      error
    );

    alert(
      "Failed to create/update teacher:\n\n" +
      error.message
    );

  } finally {

    saveBtn.disabled = false;

    saveBtn.textContent =
      editId
        ? "Update Teacher"
        : "Create Teacher";
  }
}


/* ================================
   EDIT
================================ */

function editTeacher(id) {

  const teacher =
    teachers.find(
      item =>
        item.id === id
    );

  if (!teacher) {

    alert(
      "Teacher not found."
    );

    return;
  }


  document
    .getElementById(
      "editId"
    )
    .value =
      teacher.id;


  document
    .getElementById(
      "fullName"
    )
    .value =
      teacher.full_name || "";


  document
    .getElementById(
      "email"
    )
    .value = "";


  document
    .getElementById(
      "email"
    )
    .disabled = true;


  document
    .getElementById(
      "password"
    )
    .value = "";


  document
    .getElementById(
      "password"
    ).required = false;


  document
    .getElementById(
      "phone"
    )
    .value =
      teacher.phone || "";


  document
    .getElementById(
      "avatarUrl"
    )
    .value =
      teacher.avatar_url || "";


  document
    .getElementById(
      "institutionId"
    )
    .value =
      teacher.institution_id || "";


  document
    .getElementById(
      "isActive"
    )
    .value =
      teacher.is_active
        ? "true"
        : "false";


  document
    .getElementById(
      "modalTitle"
    )
    .textContent =
      "Edit Teacher";


  document
    .getElementById(
      "saveBtn"
    )
    .textContent =
      "Update Teacher";


  document
    .getElementById(
      "teacherModal"
    )
    .classList.add(
      "show"
    );
}


/* ================================
   VIEW
================================ */

function viewTeacher(id) {

  const teacher =
    teachers.find(
      item =>
        item.id === id
    );

  if (!teacher) {
    return;
  }

  const avatar =
    teacher.avatar_url ||
    "https://via.placeholder.com/100";


  document
    .getElementById(
      "viewContent"
    )
    .innerHTML = `

      <div class="profile-box">

        <img
          class="avatar"
          src="${escapeHtml(avatar)}"
          alt="Teacher">

        <div>

          <div class="profile-name">
            ${escapeHtml(
              teacher.full_name ||
              "Unnamed Teacher"
            )}
          </div>

          <div class="detail">
            <strong>Role:</strong>
            Teacher
          </div>

          <div class="detail">
            <strong>Phone:</strong>
            ${escapeHtml(
              teacher.phone ||
              "Not provided"
            )}
          </div>

          <div class="detail">
            <strong>Institution:</strong>
            ${escapeHtml(
              teacher.institution_name ||
              "Unknown"
            )}
          </div>

          <div class="detail">
            <strong>User ID:</strong>
            ${escapeHtml(
              teacher.id
            )}
          </div>

          <div class="detail">
            <strong>Status:</strong>
            ${
              teacher.is_active
                ? "Active"
                : "Inactive"
            }
          </div>

        </div>

      </div>
  `;


  document
    .getElementById(
      "viewModal"
    )
    .classList.add(
      "show"
    );
}


/* ================================
   CLOSE VIEW
================================ */

function closeViewModal() {

  document
    .getElementById(
      "viewModal"
    )
    .classList.remove(
      "show"
    );
}


/* ================================
   TOGGLE STATUS
================================ */

async function toggleTeacher(id) {

  const teacher =
    teachers.find(
      item =>
        item.id === id
    );

  if (!teacher) {
    return;
  }

  const newStatus =
    !teacher.is_active;

  const action =
    newStatus
      ? "activate"
      : "disable";


  if (
    !confirm(
      `Are you sure you want to ${action} this teacher?`
    )
  ) {
    return;
  }


  const {
    error
  } =
    await supabaseClient
      .from("profiles")
      .update({

        is_active:
          newStatus,

        updated_at:
          new Date().toISOString()

      })
      .eq(
        "id",
        id
      );


  if (error) {

    alert(
      "Failed:\n\n" +
      error.message
    );

    return;
  }


  await loadTeachers();
}


/* ================================
   DELETE
================================ */

async function deleteTeacher(id) {

  const teacher =
    teachers.find(
      item =>
        item.id === id
    );

  if (!teacher) {
    return;
  }


  const confirmed =
    confirm(
      "Delete this teacher profile?\n\n" +
      (teacher.full_name || "")
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } =
    await supabaseClient
      .from("profiles")
      .delete()
      .eq(
        "id",
        id
      );


  if (error) {

    alert(
      "Failed to delete teacher:\n\n" +
      error.message
    );

    return;
  }


  alert(
    "Teacher profile deleted successfully."
  );


  await loadTeachers();
}


/* ================================
   ESCAPE HTML
================================ */

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


/* ================================
   MODAL CLICK OUTSIDE
================================ */

document.addEventListener(
  "click",
  event => {

    if (
      event.target.id ===
      "teacherModal"
    ) {
      closeTeacherModal();
    }

    if (
      event.target.id ===
      "viewModal"
    ) {
      closeViewModal();
    }

  }
);
