/* =========================================================
   GAAWOW EMS
   STUDENTS MANAGEMENT
   V4 FINAL
   =========================================================

   Database:
   Supabase

   Table:
   students

   Roles:
   super_admin
   school_admin
   teacher
   ========================================================= */


"use strict";


// =========================================================
// SUPABASE CONFIG
// =========================================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


// =========================================================
// GLOBAL STATE
// =========================================================

let supabaseClient = null;

let students = [];

let institutions = [];

let currentUser = null;

let currentProfile = null;

let currentRole = null;

let currentInstitutionId = null;


// =========================================================
// DOM
// =========================================================

let studentsBody;

let searchInput;

let statusFilter;

let studentForm;

let studentModal;

let viewModal;

let messageBox;

let institutionSelect;

let institutionGroup;


// =========================================================
// INITIALIZE DOM
// =========================================================

function initializeDOM() {

  studentsBody =
    document.getElementById(
      "studentsBody"
    );

  searchInput =
    document.getElementById(
      "searchInput"
    );

  statusFilter =
    document.getElementById(
      "statusFilter"
    );

  studentForm =
    document.getElementById(
      "studentForm"
    );

  studentModal =
    document.getElementById(
      "studentModal"
    );

  viewModal =
    document.getElementById(
      "viewModal"
    );

  messageBox =
    document.getElementById(
      "message"
    );

  institutionSelect =
    document.getElementById(
      "institutionId"
    );

  institutionGroup =
    document.getElementById(
      "institutionGroup"
    );

}


// =========================================================
// CREATE SUPABASE CLIENT
// =========================================================

function initializeSupabase() {

  if (
    !window.supabase
  ) {

    console.error(
      "GAAWOW EMS: Supabase library is unavailable."
    );

    showMessage(
      "Supabase library is unavailable. Please refresh the page.",
      "error"
    );

    return false;
  }


  try {

    supabaseClient =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );


    console.log(
      "GAAWOW EMS: Supabase client initialized."
    );


    return true;

  } catch (error) {

    console.error(
      "Supabase client error:",
      error
    );

    showMessage(
      "Unable to connect to Supabase.",
      "error"
    );

    return false;
  }
}


// =========================================================
// SESSION
// =========================================================

async function checkSession() {

  try {

    console.log(
      "Checking authentication..."
    );


    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {

      console.error(
        "Session error:",
        error
      );

      showMessage(
        "Session error: " +
        error.message,
        "error"
      );

      return false;
    }


    if (
      !data ||
      !data.session
    ) {

      console.warn(
        "No active session."
      );


      window.location.href =
        "index.html";


      return false;
    }


    currentUser =
      data.session.user;


    console.log(
      "Logged-in user:",
      currentUser.id
    );


    return true;

  } catch (error) {

    console.error(
      "checkSession error:",
      error
    );

    showMessage(
      "Unable to verify login session.",
      "error"
    );

    return false;
  }
}


// =========================================================
// PROFILE
// =========================================================

async function loadCurrentProfile() {

  try {

    console.log(
      "Loading user profile..."
    );


    const {
      data: profile,
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

      showMessage(
        "Unable to load user profile: " +
        error.message,
        "error"
      );

      return false;
    }


    if (!profile) {

      console.error(
        "Profile not found."
      );

      showMessage(
        "User profile not found.",
        "error"
      );

      return false;
    }


    currentProfile =
      profile;


    currentRole =
      profile.role;


    currentInstitutionId =
      profile.institution_id;


    console.log(
      "Profile:",
      profile
    );


    if (
      profile.is_active === false
    ) {

      showMessage(
        "Your account is inactive.",
        "error"
      );


      await supabaseClient.auth.signOut();


      setTimeout(
        () => {

          window.location.href =
            "index.html";

        },
        1000
      );


      return false;
    }


    return true;

  } catch (error) {

    console.error(
      "loadCurrentProfile error:",
      error
    );

    showMessage(
      "Unexpected profile error.",
      "error"
    );

    return false;
  }
}


// =========================================================
// LOAD INSTITUTIONS
// =========================================================

async function loadInstitutions() {

  console.log(
    "Loading institutions..."
  );


  if (!institutionSelect) {

    console.error(
      "institutionId element missing."
    );

    return false;
  }


  institutionSelect.innerHTML = `
    <option value="">
      Loading institutions...
    </option>
  `;


  try {

    const {
      data,
      error
    } =
      await supabaseClient
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


    if (error) {

      console.error(
        "Institution query failed:",
        error
      );


      institutionSelect.innerHTML = `
        <option value="">
          Unable to load institutions
        </option>
      `;


      showMessage(
        "Unable to load institutions: " +
        error.message,
        "error"
      );


      return false;
    }


    institutions =
      data || [];


    console.log(
      "Institutions:",
      institutions
    );


    institutionSelect.innerHTML = `
      <option value="">
        Select Institution
      </option>
    `;


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


        institutionSelect.appendChild(
          option
        );

      }
    );


    // =====================================================
    // SUPER ADMIN
    // =====================================================

    if (
      currentRole === "super_admin"
    ) {

      institutionSelect.disabled =
        false;

      institutionSelect.required =
        true;


      if (institutionGroup) {

        institutionGroup.style.display =
          "block";

      }


      console.log(
        "Super Admin: all institutions available."
      );

    }


    // =====================================================
    // OTHER ROLES
    // =====================================================

    else {

      institutionSelect.disabled =
        true;

      institutionSelect.required =
        false;


      if (institutionGroup) {

        institutionGroup.style.display =
          "block";

      }


      if (currentInstitutionId) {

        institutionSelect.value =
          currentInstitutionId;

      }


      console.log(
        "User institution:",
        currentInstitutionId
      );
    }


    return true;

  } catch (error) {

    console.error(
      "loadInstitutions exception:",
      error
    );


    institutionSelect.innerHTML = `
      <option value="">
        Institution loading failed
      </option>
    `;


    showMessage(
      "Institution loading failed.",
      "error"
    );


    return false;
  }
}


// =========================================================
// LOAD STUDENTS
// =========================================================

async function loadStudents() {

  console.log(
    "Loading students..."
  );


  if (!studentsBody) {

    console.error(
      "studentsBody element missing."
    );

    return false;
  }


  studentsBody.innerHTML = `
    <tr>
      <td
        colspan="7"
        class="loading"
      >
        Loading students...
      </td>
    </tr>
  `;


  try {

    let query =
      supabaseClient
        .from("students")
        .select(`
          id,
          institution_id,
          profile_id,
          student_id,
          full_name,
          gender,
          date_of_birth,
          phone,
          email,
          address,
          photo_url,
          admission_date,
          status,
          emergency_contact_name,
          emergency_contact_phone,
          created_at,
          updated_at
        `);


    // =====================================================
    // SUPER ADMIN
    // =====================================================

    if (
      currentRole === "super_admin"
    ) {

      console.log(
        "Super Admin: loading ALL students."
      );

    }


    // =====================================================
    // OTHER USERS
    // =====================================================

    else {

      if (!currentInstitutionId) {

        studentsBody.innerHTML = `
          <tr>
            <td
              colspan="7"
              class="empty"
            >
              Institution not assigned to this account.
            </td>
          </tr>
        `;


        return false;
      }


      query =
        query.eq(
          "institution_id",
          currentInstitutionId
        );


      console.log(
        "Institution filter:",
        currentInstitutionId
      );
    }


    const {
      data,
      error
    } =
      await query.order(
        "created_at",
        {
          ascending: false
        }
      );


    if (error) {

      console.error(
        "Students query failed:",
        error
      );


      studentsBody.innerHTML = `
        <tr>
          <td
            colspan="7"
            class="empty"
          >
            Unable to load students.
          </td>
        </tr>
      `;


      showMessage(
        "Unable to load students: " +
        error.message,
        "error"
      );


      return false;
    }


    students =
      data || [];


    console.log(
      "Students loaded:",
      students.length
    );


    renderStudents();


    return true;

  } catch (error) {

    console.error(
      "loadStudents exception:",
      error
    );


    studentsBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="empty"
        >
          Student loading failed.
        </td>
      </tr>
    `;


    showMessage(
      "Student loading failed: " +
      error.message,
      "error"
    );


    return false;
  }
}


// =========================================================
// RENDER
// =========================================================

function renderStudents() {

  if (!studentsBody) {
    return;
  }


  const search =
    searchInput
      ? searchInput.value
          .trim()
          .toLowerCase()
      : "";


  const status =
    statusFilter
      ? statusFilter.value
      : "";


  const filtered =
    students.filter(
      student => {

        const studentId =
          String(
            student.student_id || ""
          )
          .toLowerCase();


        const fullName =
          String(
            student.full_name || ""
          )
          .toLowerCase();


        const phone =
          String(
            student.phone || ""
          )
          .toLowerCase();


        const matchesSearch =
          !search ||
          studentId.includes(search) ||
          fullName.includes(search) ||
          phone.includes(search);


        const matchesStatus =
          !status ||
          student.status === status;


        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );


  if (
    filtered.length === 0
  ) {

    studentsBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="empty"
        >
          No students found.
        </td>
      </tr>
    `;


    return;
  }


  studentsBody.innerHTML =
    filtered
      .map(
        student => {

          return `
            <tr>

              <td>
                <strong>
                  ${escapeHtml(
                    student.student_id || "-"
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  student.full_name || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  student.gender || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  student.phone || "-"
                )}
              </td>

              <td>

                <span
                  class="status ${escapeHtml(
                    student.status || ""
                  )}"
                >
                  ${escapeHtml(
                    student.status || "-"
                  )}
                </span>

              </td>

              <td>
                ${formatDate(
                  student.admission_date
                )}
              </td>

              <td>

                <div class="actions">

                  <button
                    type="button"
                    class="action-btn view"
                    onclick="viewStudent('${student.id}')"
                  >
                    View
                  </button>

                  <button
                    type="button"
                    class="action-btn edit"
                    onclick="editStudent('${student.id}')"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="action-btn delete"
                    onclick="deleteStudent('${student.id}')"
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


// =========================================================
// ADD STUDENT
// =========================================================

function openAddModal() {

  if (!studentForm) {
    return;
  }


  studentForm.reset();


  const editId =
    document.getElementById(
      "editId"
    );

  const modalTitle =
    document.getElementById(
      "modalTitle"
    );

  const saveButton =
    document.getElementById(
      "saveButton"
    );

  const status =
    document.getElementById(
      "status"
    );


  if (editId) {
    editId.value = "";
  }


  if (modalTitle) {

    modalTitle.textContent =
      "Add Student";

  }


  if (saveButton) {

    saveButton.textContent =
      "Save Student";

    saveButton.disabled =
      false;

  }


  if (status) {

    status.value =
      "active";

  }


  if (
    currentRole === "super_admin"
  ) {

    institutionSelect.value =
      "";

    institutionSelect.disabled =
      false;

  } else {

    institutionSelect.value =
      currentInstitutionId || "";

    institutionSelect.disabled =
      true;

  }


  studentModal.style.display =
    "block";
}


// =========================================================
// EDIT STUDENT
// =========================================================

function editStudent(id) {

  const student =
    students.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!student) {

    showMessage(
      "Student record not found.",
      "error"
    );

    return;
  }


  setValue(
    "editId",
    student.id
  );

  setValue(
    "studentId",
    student.student_id
  );

  setValue(
    "fullName",
    student.full_name
  );

  setValue(
    "gender",
    student.gender
  );

  setValue(
    "dateOfBirth",
    student.date_of_birth
  );

  setValue(
    "phone",
    student.phone
  );

  setValue(
    "email",
    student.email
  );

  setValue(
    "address",
    student.address
  );

  setValue(
    "admissionDate",
    student.admission_date
  );

  setValue(
    "status",
    student.status || "active"
  );

  setValue(
    "emergencyContactName",
    student.emergency_contact_name
  );

  setValue(
    "emergencyContactPhone",
    student.emergency_contact_phone
  );

  setValue(
    "photoUrl",
    student.photo_url
  );


  institutionSelect.value =
    student.institution_id || "";


  institutionSelect.disabled =
    currentRole !== "super_admin";


  const modalTitle =
    document.getElementById(
      "modalTitle"
    );

  const saveButton =
    document.getElementById(
      "saveButton"
    );


  if (modalTitle) {

    modalTitle.textContent =
      "Edit Student";

  }


  if (saveButton) {

    saveButton.textContent =
      "Update Student";

    saveButton.disabled =
      false;

  }


  studentModal.style.display =
    "block";
}


// =========================================================
// SAVE STUDENT
// =========================================================

async function saveStudent(
  event
) {

  event.preventDefault();


  const saveButton =
    document.getElementById(
      "saveButton"
    );


  if (saveButton) {

    saveButton.disabled =
      true;

    saveButton.textContent =
      "Saving...";

  }


  const editId =
    getValue("editId");


  let selectedInstitutionId =
    institutionSelect.value;


  if (
    currentRole !== "super_admin"
  ) {

    selectedInstitutionId =
      currentInstitutionId;

  }


  if (!selectedInstitutionId) {

    if (saveButton) {

      saveButton.disabled =
        false;

      saveButton.textContent =
        editId
          ? "Update Student"
          : "Save Student";

    }


    showMessage(
      "Please select an institution.",
      "error"
    );


    return;
  }


  const studentId =
    getValue(
      "studentId"
    ).trim();


  const fullName =
    getValue(
      "fullName"
    ).trim();


  if (!studentId) {

    showMessage(
      "Student ID is required.",
      "error"
    );


    resetSaveButton(
      saveButton,
      editId
    );


    return;
  }


  if (!fullName) {

    showMessage(
      "Student full name is required.",
      "error"
    );


    resetSaveButton(
      saveButton,
      editId
    );


    return;
  }


  const studentData = {

    institution_id:
      selectedInstitutionId,

    student_id:
      studentId,

    full_name:
      fullName,

    gender:
      getValue("gender") ||
      null,

    date_of_birth:
      getValue("dateOfBirth") ||
      null,

    phone:
      getValue("phone").trim() ||
      null,

    email:
      getValue("email").trim() ||
      null,

    address:
      getValue("address").trim() ||
      null,

    admission_date:
      getValue("admissionDate") ||
      null,

    status:
      getValue("status") ||
      "active",

    emergency_contact_name:
      getValue(
        "emergencyContactName"
      ).trim() ||
      null,

    emergency_contact_phone:
      getValue(
        "emergencyContactPhone"
      ).trim() ||
      null,

    photo_url:
      getValue(
        "photoUrl"
      ).trim() ||
      null

  };


  try {

    let result;


    // ===================================================
    // UPDATE
    // ===================================================

    if (editId) {

      result =
        await supabaseClient
          .from("students")
          .update(
            studentData
          )
          .eq(
            "id",
            editId
          );

    }


    // ===================================================
    // INSERT
    // ===================================================

    else {

      result =
        await supabaseClient
          .from("students")
          .insert(
            studentData
          );

    }


    if (result.error) {

      console.error(
        "Student save error:",
        result.error
      );


      showMessage(
        result.error.message,
        "error"
      );


      resetSaveButton(
        saveButton,
        editId
      );


      return;
    }


    showMessage(
      editId
        ? "Student updated successfully."
        : "Student added successfully.",
      "success"
    );


    closeModal();


    await loadStudents();


  } catch (error) {

    console.error(
      "Student save exception:",
      error
    );


    showMessage(
      "Unable to save student: " +
      error.message,
      "error"
    );


    resetSaveButton(
      saveButton,
      editId
    );
  }
}


// =========================================================
// VIEW STUDENT
// =========================================================

function viewStudent(id) {

  const student =
    students.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!student) {

    showMessage(
      "Student record not found.",
      "error"
    );

    return;
  }


  const institution =
    institutions.find(
      item =>
        String(item.id) ===
        String(
          student.institution_id
        )
    );


  const institutionName =
    institution
      ? institution.name
      : student.institution_id || "-";


  const details =
    document.getElementById(
      "studentDetails"
    );


  if (!details) {
    return;
  }


  let photo = "";


  if (student.photo_url) {

    photo = `
      <img
        src="${escapeHtml(
          student.photo_url
        )}"
        alt="Student Photo"
        style="
          width:95px;
          height:95px;
          object-fit:cover;
          border-radius:50%;
          border:3px solid #D4AF37;
          margin-bottom:12px;
        "
        onerror="this.style.display='none'"
      >
    `;
  }


  details.innerHTML = `

    <div
      style="
        text-align:center;
        margin-bottom:20px;
      "
    >

      ${photo}

      <h2
        style="
          color:#0B1E63;
          margin:0;
        "
      >
        ${escapeHtml(
          student.full_name || "-"
        )}
      </h2>

      <p
        style="
          color:#64748b;
          margin:4px 0;
        "
      >
        ${escapeHtml(
          student.student_id || "-"
        )}
      </p>

    </div>


    <hr
      style="
        border:0;
        border-top:
          1px solid #e5e7eb;
        margin:18px 0;
      "
    >


    <p>
      <strong>Institution:</strong>
      ${escapeHtml(
        institutionName
      )}
    </p>


    <p>
      <strong>Gender:</strong>
      ${escapeHtml(
        student.gender || "-"
      )}
    </p>


    <p>
      <strong>Date of Birth:</strong>
      ${formatDate(
        student.date_of_birth
      )}
    </p>


    <p>
      <strong>Phone:</strong>
      ${escapeHtml(
        student.phone || "-"
      )}
    </p>


    <p>
      <strong>Email:</strong>
      ${escapeHtml(
        student.email || "-"
      )}
    </p>


    <p>
      <strong>Address:</strong>
      ${escapeHtml(
        student.address || "-"
      )}
    </p>


    <p>
      <strong>Admission Date:</strong>
      ${formatDate(
        student.admission_date
      )}
    </p>


    <p>
      <strong>Status:</strong>

      <span
        class="status ${escapeHtml(
          student.status || ""
        )}"
      >
        ${escapeHtml(
          student.status || "-"
        )}
      </span>

    </p>


    <p>
      <strong>Emergency Contact:</strong>
      ${escapeHtml(
        student.emergency_contact_name || "-"
      )}
    </p>


    <p>
      <strong>Emergency Phone:</strong>
      ${escapeHtml(
        student.emergency_contact_phone || "-"
      )}
    </p>

  `;


  viewModal.style.display =
    "block";
}


// =========================================================
// DELETE
// =========================================================

async function deleteStudent(id) {

  const student =
    students.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!student) {

    showMessage(
      "Student record not found.",
      "error"
    );

    return;
  }


  const confirmed =
    window.confirm(
      `Delete ${student.full_name || "this student"}?`
    );


  if (!confirmed) {
    return;
  }


  try {

    const {
      error
    } =
      await supabaseClient
        .from("students")
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


      showMessage(
        error.message,
        "error"
      );


      return;
    }


    showMessage(
      "Student deleted successfully.",
      "success"
    );


    await loadStudents();


  } catch (error) {

    console.error(
      "Delete exception:",
      error
    );


    showMessage(
      "Unable to delete student: " +
      error.message,
      "error"
    );
  }
}


// =========================================================
// MODALS
// =========================================================

function closeModal() {

  if (studentModal) {

    studentModal.style.display =
      "none";

  }
}


function closeViewModal() {

  if (viewModal) {

    viewModal.style.display =
      "none";

  }
}


// =========================================================
// CLOSE MODALS BY BACKDROP
// =========================================================

window.addEventListener(
  "click",
  function(event) {

    if (
      event.target ===
      studentModal
    ) {

      closeModal();

    }


    if (
      event.target ===
      viewModal
    ) {

      closeViewModal();

    }

  }
);


// =========================================================
// SEARCH
// =========================================================

function initializeSearch() {

  if (searchInput) {

    searchInput.addEventListener(
      "input",
      renderStudents
    );

  }


  if (statusFilter) {

    statusFilter.addEventListener(
      "change",
      renderStudents
    );

  }
}


// =========================================================
// DASHBOARD
// =========================================================

function goDashboard() {

  window.location.href =
    "dashboard.html";
}


// =========================================================
// MESSAGE
// =========================================================

function showMessage(
  text,
  type = "info"
) {

  if (!messageBox) {

    console.log(
      `[${type}] ${text}`
    );

    return;
  }


  messageBox.textContent =
    text;


  messageBox.className =
    "message " +
    type;


  clearTimeout(
    showMessage.timer
  );


  showMessage.timer =
    setTimeout(
      () => {

        if (messageBox) {

          messageBox.className =
            "message";

          messageBox.textContent =
            "";

        }

      },
      5000
    );
}


// =========================================================
// FORM HELPERS
// =========================================================

function getValue(id) {

  const element =
    document.getElementById(id);


  return element
    ? element.value || ""
    : "";
}


function setValue(
  id,
  value
) {

  const element =
    document.getElementById(id);


  if (element) {

    element.value =
      value || "";

  }
}


function resetSaveButton(
  button,
  editId
) {

  if (!button) {
    return;
  }


  button.disabled =
    false;


  button.textContent =
    editId
      ? "Update Student"
      : "Save Student";
}


// =========================================================
// DATE
// =========================================================

function formatDate(value) {

  if (!value) {
    return "-";
  }


  const text =
    String(value);


  // PostgreSQL date:
  // YYYY-MM-DD

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      text
    )
  ) {

    const parts =
      text.split("-");


    return (
      parts[2] +
      "/" +
      parts[1] +
      "/" +
      parts[0]
    );
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "-";
  }


  return date.toLocaleDateString(
    "en-GB"
  );
}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(
  value
) {

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


// =========================================================
// START
// =========================================================

async function startStudentsPage() {

  console.log(
    "========================================"
  );

  console.log(
    "GAAWOW EMS — Students V4"
  );

  console.log(
    "Starting..."
  );

  console.log(
    "========================================"
  );


  // =====================================================
  // DOM
  // =====================================================

  initializeDOM();


  if (
    !studentsBody ||
    !studentForm ||
    !institutionSelect
  ) {

    console.error(
      "Required Students HTML elements are missing."
    );


    showMessage(
      "Students page HTML is incomplete.",
      "error"
    );


    return;
  }


  initializeSearch();


  // =====================================================
  // SUPABASE
  // =====================================================

  if (
    !initializeSupabase()
  ) {

    return;
  }


  // =====================================================
  // AUTH
  // =====================================================

  const authenticated =
    await checkSession();


  if (!authenticated) {

    return;
  }


  // =====================================================
  // PROFILE
  // =====================================================

  const profileLoaded =
    await loadCurrentProfile();


  if (!profileLoaded) {

    return;
  }


  // =====================================================
  // INSTITUTIONS
  // =====================================================

  await loadInstitutions();


  // =====================================================
  // STUDENTS
  // =====================================================

  await loadStudents();


  console.log(
    "========================================"
  );

  console.log(
    "GAAWOW EMS — Students V4 READY"
  );

  console.log(
    "========================================"
  );
}


// =========================================================
// START AFTER PAGE LOAD
// =========================================================

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startStudentsPage,
    {
      once: true
    }
  );

} else {

  startStudentsPage();

}


// =========================================================
// GLOBAL FUNCTIONS
// =========================================================

window.openAddModal =
  openAddModal;

window.editStudent =
  editStudent;

window.viewStudent =
  viewStudent;

window.deleteStudent =
  deleteStudent;

window.closeModal =
  closeModal;

window.closeViewModal =
  closeViewModal;

window.goDashboard =
  goDashboard;
