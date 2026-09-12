const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


// ============================================
// GLOBAL VARIABLES
// ============================================

let students = [];
let institutions = [];

let currentUser = null;
let currentRole = null;
let currentInstitutionId = null;


// ============================================
// ELEMENTS
// ============================================

const studentsBody =
  document.getElementById("studentsBody");

const searchInput =
  document.getElementById("searchInput");

const statusFilter =
  document.getElementById("statusFilter");

const studentForm =
  document.getElementById("studentForm");

const studentModal =
  document.getElementById("studentModal");

const viewModal =
  document.getElementById("viewModal");

const messageBox =
  document.getElementById("message");

const institutionSelect =
  document.getElementById("institutionId");

const institutionGroup =
  document.getElementById("institutionGroup");


// ============================================
// SESSION + PROFILE
// ============================================

async function checkSession() {

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();


  if (error || !data.session) {

    window.location.href =
      "index.html";

    return false;
  }


  currentUser =
    data.session.user;


  const {
    data: profile,
    error: profileError
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
      .single();


  if (profileError) {

    console.error(
      "Profile error:",
      profileError
    );

    showMessage(
      "Unable to load user profile.",
      "error"
    );

    return false;
  }


  if (!profile) {

    showMessage(
      "User profile not found.",
      "error"
    );

    return false;
  }


  currentRole =
    profile.role;

  currentInstitutionId =
    profile.institution_id;


  console.log(
    "Current role:",
    currentRole
  );

  console.log(
    "Current institution:",
    currentInstitutionId
  );


  if (profile.is_active === false) {

    await supabaseClient.auth.signOut();

    window.location.href =
      "index.html";

    return false;
  }


  return true;
}


// ============================================
// LOAD INSTITUTIONS
// ============================================

async function loadInstitutions() {

  institutionSelect.innerHTML = `
    <option value="">
      Loading institutions...
    </option>
  `;


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
      "Load institutions error:",
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


    return;
  }


  institutions =
    data || [];


  institutionSelect.innerHTML = `
    <option value="">
      Select Institution
    </option>
  `;


  institutions.forEach(
    institution => {

      const option =
        document.createElement("option");

      option.value =
        institution.id;

      option.textContent =
        institution.name;

      institutionSelect.appendChild(
        option
      );

    }
  );


  // ==========================================
  // ROLE BEHAVIOR
  // ==========================================

  if (
    currentRole === "super_admin"
  ) {

    institutionGroup.style.display =
      "flex";

    institutionSelect.required =
      true;

  } else {

    institutionGroup.style.display =
      "none";

    institutionSelect.required =
      false;

  }
}


// ============================================
// LOAD STUDENTS
// ============================================

async function loadStudents() {

  studentsBody.innerHTML = `
    <tr>
      <td colspan="7" class="loading">
        Loading students...
      </td>
    </tr>
  `;


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


  // ==========================================
  // SUPER ADMIN
  // ==========================================

  if (
    currentRole === "super_admin"
  ) {

    // No institution filter.
    // Super Admin sees ALL students.

  }


  // ==========================================
  // OTHER USERS
  // ==========================================

  else {

    if (!currentInstitutionId) {

      studentsBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty">
            Institution not assigned to this account.
          </td>
        </tr>
      `;

      return;
    }


    query =
      query.eq(
        "institution_id",
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
      "Load students error:",
      error
    );


    showMessage(
      "Unable to load students: " +
      error.message,
      "error"
    );


    studentsBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty">
          Unable to load students.
        </td>
      </tr>
    `;


    return;
  }


  students =
    data || [];


  console.log(
    "Students loaded:",
    students.length
  );


  renderStudents();
}


// ============================================
// RENDER STUDENTS
// ============================================

function renderStudents() {

  const search =
    searchInput.value
      .trim()
      .toLowerCase();


  const status =
    statusFilter.value;


  const filtered =
    students.filter(
      student => {

        const matchesSearch =
          !search ||
          (student.student_id || "")
            .toLowerCase()
            .includes(search) ||

          (student.full_name || "")
            .toLowerCase()
            .includes(search) ||

          (student.phone || "")
            .toLowerCase()
            .includes(search);


        const matchesStatus =
          !status ||
          student.status === status;


        return (
          matchesSearch &&
          matchesStatus
        );

      }
    );


  if (!filtered.length) {

    studentsBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty">
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

          const admission =
            formatDate(
              student.admission_date
            );


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
                  )}">

                  ${escapeHtml(
                    student.status || "-"
                  )}

                </span>
              </td>


              <td>
                ${admission}
              </td>


              <td>

                <div class="actions">

                  <button
                    class="action-btn view"
                    onclick="viewStudent('${student.id}')">

                    View

                  </button>


                  <button
                    class="action-btn edit"
                    onclick="editStudent('${student.id}')">

                    Edit

                  </button>


                  <button
                    class="action-btn delete"
                    onclick="deleteStudent('${student.id}')">

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


// ============================================
// OPEN ADD MODAL
// ============================================

function openAddModal() {

  studentForm.reset();


  document.getElementById(
    "editId"
  ).value = "";


  document.getElementById(
    "modalTitle"
  ).textContent =
    "Add Student";


  document.getElementById(
    "saveButton"
  ).textContent =
    "Save Student";


  document.getElementById(
    "status"
  ).value =
    "active";


  // ==========================================
  // SUPER ADMIN
  // ==========================================

  if (
    currentRole === "super_admin"
  ) {

    institutionSelect.value =
      "";


    institutionSelect.disabled =
      false;

  }


  // ==========================================
  // SCHOOL ADMIN / TEACHER
  // ==========================================

  else {

    institutionSelect.value =
      currentInstitutionId || "";

    institutionSelect.disabled =
      true;

  }


  studentModal.style.display =
    "block";
}


// ============================================
// EDIT STUDENT
// ============================================

function editStudent(id) {

  const student =
    students.find(
      item => item.id === id
    );


  if (!student) {
    return;
  }


  document.getElementById(
    "editId"
  ).value =
    student.id;


  document.getElementById(
    "studentId"
  ).value =
    student.student_id || "";


  document.getElementById(
    "fullName"
  ).value =
    student.full_name || "";


  document.getElementById(
    "gender"
  ).value =
    student.gender || "";


  document.getElementById(
    "dateOfBirth"
  ).value =
    student.date_of_birth || "";


  document.getElementById(
    "phone"
  ).value =
    student.phone || "";


  document.getElementById(
    "email"
  ).value =
    student.email || "";


  document.getElementById(
    "address"
  ).value =
    student.address || "";


  document.getElementById(
    "admissionDate"
  ).value =
    student.admission_date || "";


  document.getElementById(
    "status"
  ).value =
    student.status || "active";


  document.getElementById(
    "emergencyContactName"
  ).value =
    student.emergency_contact_name || "";


  document.getElementById(
    "emergencyContactPhone"
  ).value =
    student.emergency_contact_phone || "";


  document.getElementById(
    "photoUrl"
  ).value =
    student.photo_url || "";


  // Set institution
  institutionSelect.value =
    student.institution_id || "";


  document.getElementById(
    "modalTitle"
  ).textContent =
    "Edit Student";


  document.getElementById(
    "saveButton"
  ).textContent =
    "Update Student";


  // Super Admin can change institution.
  // Other roles cannot.

  if (
    currentRole === "super_admin"
  ) {

    institutionSelect.disabled =
      false;

  } else {

    institutionSelect.disabled =
      true;

  }


  studentModal.style.display =
    "block";
}


// ============================================
// SAVE / UPDATE STUDENT
// ============================================

studentForm.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();


    const saveButton =
      document.getElementById(
        "saveButton"
      );


    saveButton.disabled =
      true;


    saveButton.textContent =
      "Saving...";


    const editId =
      document.getElementById(
        "editId"
      ).value;


    // ========================================
    // DETERMINE INSTITUTION
    // ========================================

    let selectedInstitutionId =
      institutionSelect.value;


    // For non-super-admin users,
    // force their own institution.

    if (
      currentRole !== "super_admin"
    ) {

      selectedInstitutionId =
        currentInstitutionId;

    }


    if (!selectedInstitutionId) {

      saveButton.disabled =
        false;


      saveButton.textContent =
        editId
          ? "Update Student"
          : "Save Student";


      showMessage(
        "Please select an institution.",
        "error"
      );


      return;
    }


    // ========================================
    // STUDENT DATA
    // ========================================

    const studentData = {

      student_id:
        document.getElementById(
          "studentId"
        ).value.trim(),

      full_name:
        document.getElementById(
          "fullName"
        ).value.trim(),

      gender:
        document.getElementById(
          "gender"
        ).value || null,

      date_of_birth:
        document.getElementById(
          "dateOfBirth"
        ).value || null,

      phone:
        document.getElementById(
          "phone"
        ).value.trim() || null,

      email:
        document.getElementById(
          "email"
        ).value.trim() || null,

      address:
        document.getElementById(
          "address"
        ).value.trim() || null,

      admission_date:
        document.getElementById(
          "admissionDate"
        ).value || null,

      status:
        document.getElementById(
          "status"
        ).value,

      emergency_contact_name:
        document.getElementById(
          "emergencyContactName"
        ).value.trim() || null,

      emergency_contact_phone:
        document.getElementById(
          "emergencyContactPhone"
        ).value.trim() || null,

      photo_url:
        document.getElementById(
          "photoUrl"
        ).value.trim() || null

    };


    let result;


    // ========================================
    // UPDATE
    // ========================================

    if (editId) {

      result =
        await supabaseClient
          .from("students")
          .update({

            ...studentData,

            institution_id:
              selectedInstitutionId

          })
          .eq(
            "id",
            editId
          );

    }


    // ========================================
    // INSERT
    // ========================================

    else {

      result =
        await supabaseClient
          .from("students")
          .insert({

            ...studentData,

            institution_id:
              selectedInstitutionId

          });

    }


    saveButton.disabled =
      false;


    if (result.error) {

      console.error(
        "Save student error:",
        result.error
      );


      showMessage(
        result.error.message,
        "error"
      );


      saveButton.textContent =
        editId
          ? "Update Student"
          : "Save Student";


      return;
    }


    saveButton.textContent =
      "Saved ✓";


    closeModal();


    showMessage(
      editId
        ? "Student updated successfully."
        : "Student added successfully.",
      "success"
    );


    await loadStudents();

  }
);


// ============================================
// VIEW STUDENT
// ============================================

function viewStudent(id) {

  const student =
    students.find(
      item => item.id === id
    );


  if (!student) {
    return;
  }


  const institution =
    institutions.find(
      item =>
        item.id === student.institution_id
    );


  const institutionName =
    institution
      ? institution.name
      : student.institution_id || "-";


  const photo =
    student.photo_url
      ? `
        <img
          src="${escapeHtml(
            student.photo_url
          )}"
          style="
            width:90px;
            height:90px;
            object-fit:cover;
            border-radius:50%;
            margin-bottom:15px;
          "
        >
      `
      : "";


  document.getElementById(
    "studentDetails"
  ).innerHTML = `

    <div style="text-align:center;">

      ${photo}

      <h2 style="color:#0B1E63;">
        ${escapeHtml(
          student.full_name || "-"
        )}
      </h2>

      <p>
        ${escapeHtml(
          student.student_id || "-"
        )}
      </p>

    </div>


    <hr style="margin:18px 0;">


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
      ${escapeHtml(
        student.status || "-"
      )}
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


// ============================================
// DELETE STUDENT
// ============================================

async function deleteStudent(id) {

  const student =
    students.find(
      item => item.id === id
    );


  if (!student) {
    return;
  }


  const confirmed =
    confirm(
      `Delete ${student.full_name}?`
    );


  if (!confirmed) {
    return;
  }


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
      "Delete student error:",
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
}


// ============================================
// MODAL FUNCTIONS
// ============================================

function closeModal() {

  studentModal.style.display =
    "none";
}


function closeViewModal() {

  viewModal.style.display =
    "none";
}


// ============================================
// SEARCH
// ============================================

searchInput.addEventListener(
  "input",
  renderStudents
);


statusFilter.addEventListener(
  "change",
  renderStudents
);


// ============================================
// DASHBOARD
// ============================================

function goDashboard() {

  window.location.href =
    "dashboard.html";
}


// ============================================
// MESSAGE
// ============================================

function showMessage(
  text,
  type
) {

  messageBox.textContent =
    text;


  messageBox.className =
    "message " + type;


  setTimeout(
    () => {

      messageBox.className =
        "message";

    },
    4000
  );
}


// ============================================
// HELPERS
// ============================================

function formatDate(date) {

  if (!date) {
    return "-";
  }


  return new Date(date)
    .toLocaleDateString();
}


function escapeHtml(value) {

  return String(value)
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


// ============================================
// START
// ============================================

async function startStudentsPage() {

  const authenticated =
    await checkSession();


  if (!authenticated) {
    return;
  }


  await loadInstitutions();

  await loadStudents();
}


startStudentsPage();
