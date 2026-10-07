/* =========================================================
   GAAWOW EMS
   TEACHER MANAGEMENT
   teacher.js V4
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const CREATE_TEACHER_FUNCTION_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co/functions/v1/create-teacher";


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let teachers = [];
let institutions = [];

let currentUser = null;
let currentProfile = null;


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    try {

      await checkAccess();

      const searchInput =
        document.getElementById("searchInput");

      const institutionFilter =
        document.getElementById(
          "institutionFilter"
        );

      const statusFilter =
        document.getElementById(
          "statusFilter"
        );

      const teacherForm =
        document.getElementById(
          "teacherForm"
        );

      if (searchInput) {
        searchInput.addEventListener(
          "input",
          renderTeachers
        );
      }

      if (institutionFilter) {
        institutionFilter.addEventListener(
          "change",
          renderTeachers
        );
      }

      if (statusFilter) {
        statusFilter.addEventListener(
          "change",
          renderTeachers
        );
      }

      if (teacherForm) {
        teacherForm.addEventListener(
          "submit",
          saveTeacher
        );
      }

    } catch (error) {

      console.error(
        "Teacher page initialization error:",
        error
      );

    }

  }
);


/* =========================================================
   CHECK SUPER ADMIN ACCESS
   ========================================================= */

async function checkAccess() {

  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();


  if (
    sessionError ||
    !sessionData ||
    !sessionData.session
  ) {

    alert(
      "Your login session has expired. Please login again."
    );

    location.href = "index.html";

    return;
  }


  currentUser =
    sessionData.session.user;


  /* -----------------------------------------
     LOAD CURRENT PROFILE
     ----------------------------------------- */

  const {
    data: profile,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone,
        avatar_url,
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
      "Current profile error:",
      error
    );

    alert(
      "Unable to verify your profile.\n\n" +
      error.message
    );

    location.href =
      "dashboard.html";

    return;
  }


  if (!profile) {

    alert(
      "Profile not found."
    );

    location.href =
      "dashboard.html";

    return;
  }


  currentProfile =
    profile;


  /* -----------------------------------------
     SUPER ADMIN ONLY
     ----------------------------------------- */

  if (
    profile.role !==
    "super_admin"
  ) {

    alert(
      "Access denied.\n\nSuper Admin only."
    );

    location.href =
      "dashboard.html";

    return;
  }


  if (
    profile.is_active === false
  ) {

    alert(
      "Your account is inactive."
    );

    await supabaseClient.auth.signOut();

    location.href =
      "index.html";

    return;
  }


  /* -----------------------------------------
     LOAD DATA
     ----------------------------------------- */

  await loadInstitutions();

  await loadTeachers();
}


/* =========================================================
   LOAD INSTITUTIONS
   ========================================================= */

async function loadInstitutions() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("institutions")
      .select(
        "id,name"
      )
      .order(
        "name",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "Institutions error:",
      error
    );

    alert(
      "Failed to load institutions.\n\n" +
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


  if (filter) {

    filter.innerHTML =
      `<option value="">
        All Institutions
      </option>`;

  }


  if (select) {

    select.innerHTML =
      `<option value="">
        Select Institution
      </option>`;

  }


  institutions.forEach(
    institution => {

      const safeName =
        escapeHtml(
          institution.name
        );


      if (filter) {

        filter.innerHTML +=
          `<option value="${institution.id}">
             ${safeName}
           </option>`;

      }


      if (select) {

        select.innerHTML +=
          `<option value="${institution.id}">
             ${safeName}
           </option>`;

      }

    }
  );

}


/* =========================================================
   LOAD TEACHERS
   ========================================================= */

async function loadTeachers() {

  const tbody =
    document.getElementById(
      "teachersTableBody"
    );


  if (tbody) {

    tbody.innerHTML =
      `<tr>
         <td colspan="7"
             class="loading">
           Loading teachers...
         </td>
       </tr>`;

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
        email,
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
      "Teachers load error:",
      error
    );


    if (tbody) {

      tbody.innerHTML =
        `<tr>
           <td colspan="7"
               class="empty">
             Failed to load teachers.
             <br><br>
             ${escapeHtml(error.message)}
           </td>
         </tr>`;

    }

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


/* =========================================================
   RENDER TEACHERS
   ========================================================= */

function renderTeachers() {

  const tbody =
    document.getElementById(
      "teachersTableBody"
    );


  if (!tbody) return;


  const searchInput =
    document.getElementById(
      "searchInput"
    );


  const institutionFilter =
    document.getElementById(
      "institutionFilter"
    );


  const statusFilter =
    document.getElementById(
      "statusFilter"
    );


  const search =
    searchInput
      ? searchInput.value
          .toLowerCase()
          .trim()
      : "";


  const institutionId =
    institutionFilter
      ? institutionFilter.value
      : "";


  const status =
    statusFilter
      ? statusFilter.value
      : "";


  const filtered =
    teachers.filter(
      teacher => {

        const fullName =
          String(
            teacher.full_name || ""
          ).toLowerCase();


        const email =
          String(
            teacher.email || ""
          ).toLowerCase();


        const phone =
          String(
            teacher.phone || ""
          ).toLowerCase();


        const id =
          String(
            teacher.id || ""
          ).toLowerCase();


        const matchesSearch =
          !search ||
          fullName.includes(search) ||
          email.includes(search) ||
          phone.includes(search) ||
          id.includes(search);


        const matchesInstitution =
          !institutionId ||
          teacher.institution_id ===
            institutionId;


        const matchesStatus =
          !status ||
          (
            status === "active" &&
            teacher.is_active === true
          ) ||
          (
            status === "inactive" &&
            teacher.is_active === false
          );


        return (
          matchesSearch &&
          matchesInstitution &&
          matchesStatus
        );

      }
    );


  if (!filtered.length) {

    tbody.innerHTML =
      `<tr>
         <td colspan="7"
             class="empty">
           No teachers found.
         </td>
       </tr>`;

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


          const teacherName =
            teacher.full_name ||
            "Unnamed Teacher";


          const email =
            teacher.email ||
            "Email not set";


          return `
            <tr>

              <td>
                ${index + 1}
              </td>

              <td>
                <strong>
                  ${escapeHtml(
                    teacherName
                  )}
                </strong>

                <div style="
                  font-size:12px;
                  color:#777;
                  margin-top:3px;
                ">
                  ${escapeHtml(email)}
                </div>
              </td>

              <td>
                ${escapeHtml(
                  teacher.phone || "—"
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
                    type="button"
                    class="action-btn view"
                    onclick="viewTeacher('${teacher.id}')"
                  >
                    View
                  </button>

                  <button
                    type="button"
                    class="action-btn edit"
                    onclick="editTeacher('${teacher.id}')"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="action-btn toggle"
                    onclick="toggleTeacher('${teacher.id}')"
                  >
                    ${
                      teacher.is_active
                        ? "Disable"
                        : "Activate"
                    }
                  </button>

                  <button
                    type="button"
                    class="action-btn delete"
                    onclick="deleteTeacher('${teacher.id}')"
                  >
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


/* =========================================================
   OPEN ADD TEACHER
   ========================================================= */

function openAddTeacher() {

  const form =
    document.getElementById(
      "teacherForm"
    );


  if (form) {
    form.reset();
  }


  document.getElementById(
    "editId"
  ).value = "";


  document.getElementById(
    "modalTitle"
  ).textContent =
    "Add Teacher";


  document.getElementById(
    "saveBtn"
  ).textContent =
    "Create Teacher";


  const email =
    document.getElementById(
      "email"
    );


  if (email) {

    email.disabled =
      false;

    email.readOnly =
      false;

    email.required =
      true;

  }


  const password =
    document.getElementById(
      "password"
    );


  if (password) {

    password.value = "";

    password.required =
      true;

  }


  const status =
    document.getElementById(
      "isActive"
    );


  if (status) {

    status.value =
      "true";

  }


  document.getElementById(
    "teacherModal"
  ).classList.add(
    "show"
  );
}


/* =========================================================
   CLOSE TEACHER MODAL
   ========================================================= */

function closeTeacherModal() {

  const modal =
    document.getElementById(
      "teacherModal"
    );


  if (modal) {

    modal.classList.remove(
      "show"
    );

  }

}


/* =========================================================
   SAVE TEACHER
   CREATE / UPDATE
   ========================================================= */

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
    ).value.trim()
      .toLowerCase();


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


  /* -----------------------------------------
     VALIDATION
     ----------------------------------------- */

  if (!fullName) {

    alert(
      "Please enter teacher full name."
    );

    return;
  }


  if (!editId && !email) {

    alert(
      "Please enter teacher email."
    );

    return;
  }


  if (
    !editId &&
    !isValidEmail(email)
  ) {

    alert(
      "Please enter a valid email address."
    );

    return;
  }


  if (!editId && !password) {

    alert(
      "Please enter teacher password."
    );

    return;
  }


  if (
    !editId &&
    password.length < 6
  ) {

    alert(
      "Password must contain at least 6 characters."
    );

    return;
  }


  if (!institutionId) {

    alert(
      "Please select an institution."
    );

    return;
  }


  /* -----------------------------------------
     DISABLE BUTTON
     ----------------------------------------- */

  saveBtn.disabled =
    true;


  saveBtn.textContent =
    editId
      ? "Updating..."
      : "Creating...";


  try {

    /* =====================================================
       UPDATE EXISTING TEACHER
       ===================================================== */

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
        "Teacher profile updated successfully!"
      );


      closeTeacherModal();


      await loadTeachers();


      return;
    }


    /* =====================================================
       CREATE NEW TEACHER
       ===================================================== */

    const {
      data: sessionData,
      error: sessionError
    } =
      await supabaseClient.auth.getSession();


    if (
      sessionError ||
      !sessionData ||
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


    let resultData =
      null;


    try {

      resultData =
        await response.json();

    } catch {

      resultData =
        null;

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


    if (
      resultData &&
      resultData.success === false
    ) {

      throw new Error(
        resultData.error ||
        "Teacher creation failed."
      );

    }


    alert(
      "Teacher account created successfully!"
    );


    closeTeacherModal();


    await loadTeachers();


  } catch (error) {

    console.error(
      "Teacher Save Error:",
      error
    );


    alert(
      "Failed to create/update teacher:\n\n" +
      (
        error?.message ||
        "Unknown error"
      )
    );


  } finally {

    saveBtn.disabled =
      false;


    saveBtn.textContent =
      editId
        ? "Update Teacher"
        : "Create Teacher";

  }

}


/* =========================================================
   EDIT TEACHER
   ========================================================= */

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


  document.getElementById(
    "editId"
  ).value =
    teacher.id;


  document.getElementById(
    "fullName"
  ).value =
    teacher.full_name || "";


  /* -----------------------------------------
     EMAIL
     -----------------------------------------
     Email is displayed from profiles.email.
     Auth email is not changed from client side.
     ----------------------------------------- */

  const email =
    document.getElementById(
      "email"
    );


  if (email) {

    email.value =
      teacher.email || "";

    email.disabled =
      true;

    email.readOnly =
      true;

    email.required =
      false;

  }


  /* -----------------------------------------
     PASSWORD
     ----------------------------------------- */

  const password =
    document.getElementById(
      "password"
    );


  if (password) {

    password.value =
      "";

    password.required =
      false;

  }


  /* -----------------------------------------
     OTHER FIELDS
     ----------------------------------------- */

  document.getElementById(
    "phone"
  ).value =
    teacher.phone || "";


  document.getElementById(
    "avatarUrl"
  ).value =
    teacher.avatar_url || "";


  document.getElementById(
    "institutionId"
  ).value =
    teacher.institution_id || "";


  document.getElementById(
    "isActive"
  ).value =
    teacher.is_active
      ? "true"
      : "false";


  document.getElementById(
    "modalTitle"
  ).textContent =
    "Edit Teacher";


  document.getElementById(
    "saveBtn"
  ).textContent =
    "Update Teacher";


  document.getElementById(
    "teacherModal"
  ).classList.add(
    "show"
  );

}


/* =========================================================
   VIEW TEACHER
   ========================================================= */

function viewTeacher(id) {

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


  const avatar =
    teacher.avatar_url ||
    "https://via.placeholder.com/100";


  const email =
    teacher.email ||
    "Not provided";


  const status =
    teacher.is_active
      ? "Active"
      : "Inactive";


  const viewContent =
    document.getElementById(
      "viewContent"
    );


  if (!viewContent) return;


  viewContent.innerHTML = `

    <div class="profile-box">

      <img
        class="avatar"
        src="${escapeHtml(avatar)}"
        alt="Teacher"
        onerror="this.src='https://via.placeholder.com/100'"
      >

      <div>

        <div class="profile-name">
          ${escapeHtml(
            teacher.full_name ||
            "Unnamed Teacher"
          )}
        </div>

        <div class="detail">
          <strong>Email:</strong>
          ${escapeHtml(email)}
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
          ${status}
        </div>

      </div>

    </div>

  `;


  document.getElementById(
    "viewModal"
  ).classList.add(
    "show"
  );

}


/* =========================================================
   CLOSE VIEW MODAL
   ========================================================= */

function closeViewModal() {

  const modal =
    document.getElementById(
      "viewModal"
    );


  if (modal) {

    modal.classList.remove(
      "show"
    );

  }

}


/* =========================================================
   TOGGLE TEACHER STATUS
   ========================================================= */

async function toggleTeacher(id) {

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


  const newStatus =
    !teacher.is_active;


  const action =
    newStatus
      ? "activate"
      : "disable";


  const confirmed =
    confirm(
      `Are you sure you want to ${action} this teacher?\n\n` +
      `${teacher.full_name || ""}`
    );


  if (!confirmed) {
    return;
  }


  try {

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
      throw error;
    }


    alert(
      newStatus
        ? "Teacher activated successfully."
        : "Teacher disabled successfully."
    );


    await loadTeachers();


  } catch (error) {

    console.error(
      "Toggle teacher error:",
      error
    );


    alert(
      "Failed to change teacher status:\n\n" +
      error.message
    );

  }

}


/* =========================================================
   DELETE TEACHER PROFILE
   ========================================================= */

async function deleteTeacher(id) {

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


  const confirmed =
    confirm(
      "WARNING\n\n" +
      "This will delete the teacher profile.\n\n" +
      `Teacher: ${teacher.full_name || ""}\n` +
      `Email: ${teacher.email || ""}\n\n` +
      "Do you want to continue?"
    );


  if (!confirmed) {
    return;
  }


  try {

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
      throw error;
    }


    alert(
      "Teacher profile deleted successfully."
    );


    await loadTeachers();


  } catch (error) {

    console.error(
      "Delete teacher error:",
      error
    );


    alert(
      "Failed to delete teacher:\n\n" +
      error.message
    );

  }

}


/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function isValidEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);

}


/* =========================================================
   ESCAPE HTML
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


/* =========================================================
   MODAL OUTSIDE CLICK
   ========================================================= */

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


/* =========================================================
   PASSWORD SHOW / HIDE
   Supports existing HTML password toggle button
   ========================================================= */

function togglePassword() {

  const password =
    document.getElementById(
      "password"
    );


  if (!password) return;


  if (
    password.type ===
    "password"
  ) {

    password.type =
      "text";

  } else {

    password.type =
      "password";

  }

}
