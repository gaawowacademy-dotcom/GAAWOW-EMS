/* =========================================================
   GAAWOW EMS
   STUDENTS MODULE
   V3 FINAL
   DATABASE-SAFE VERSION
   ========================================================= */

"use strict";


// =========================================================
// SUPABASE CONFIG
// =========================================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b1_s0RjIbAi5g_RqLCs145";


// =========================================================
// SUPABASE CLIENT
// =========================================================

if (!window.supabase) {
  console.error(
    "GAAWOW EMS ERROR: Supabase CDN is not loaded."
  );

  alert(
    "System error: Supabase library failed to load."
  );
}

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


// =========================================================
// GLOBAL VARIABLES
// =========================================================

let students = [];
let institutions = [];

let currentUser = null;
let currentProfile = null;

let currentRole = null;
let currentInstitutionId = null;


// =========================================================
// DOM ELEMENTS
// =========================================================

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


// =========================================================
// REQUIRED ELEMENT CHECK
// =========================================================

function checkRequiredElements() {

  const elements = {
    studentsBody,
    searchInput,
    statusFilter,
    studentForm,
    studentModal,
    viewModal,
    institutionSelect
  };

  const missing = [];

  Object.entries(elements).forEach(
    ([name, element]) => {

      if (!element) {
        missing.push(name);
      }

    }
  );

  if (missing.length) {

    console.error(
      "GAAWOW EMS - Missing HTML elements:",
      missing
    );

    showMessage(
      "Students page error. Missing: " +
      missing.join(", "),
      "error"
    );

    return false;
  }

  return true;
}


// =========================================================
// SESSION
// =========================================================

async function checkSession() {

  try {

    console.log(
      "Checking Supabase session..."
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


    if (!data || !data.session) {

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
      "Authenticated user:",
      currentUser.id
    );


    return true;

  } catch (error) {

    console.error(
      "checkSession exception:",
      error
    );

    showMessage(
      "Unable to check login session.",
      "error"
    );

    return false;
  }
}


// =========================================================
// LOAD PROFILE
// =========================================================

async function loadCurrentProfile() {

  try {

    console.log(
      "Loading current profile..."
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
        "Profile query error:",
        error
      );

      showMessage(
        "Unable to load profile: " +
        error.message,
        "error"
      );

      return false;
    }


    if (!profile) {

      console.error(
        "No profile found for:",
        currentUser.id
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
      "Profile loaded:",
      profile
    );

    console.log(
      "Role:",
      currentRole
    );

    console.log(
      "Institution:",
      currentInstitutionId
    );


    if (
      profile.is_active === false
    ) {

      showMessage(
        "Your account is inactive.",
        "error"
      );

      await supabaseClient.auth.signOut();

      setTimeout(() => {

        window.location.href =
          "index.html";

      }, 1000);

      return false;
    }


    return true;

  } catch (error) {

    console.error(
      "loadCurrentProfile exception:",
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
      "institutionId element not found."
    );

    return false;
  }


  institutionSelect.innerHTML = `
    <option value="">
      Loading institutions...
    </option>
  `;


  institutionSelect.disabled =
    true;


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
        "Institution query error:",
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
      "Institutions loaded:",
      institutions.length
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
    // ROLE CONTROL
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
          "flex";

      }


      console.log(
        "Super Admin: institution selector enabled."
      );

    } else {

      institutionSelect.disabled =
        true;

      institutionSelect.required =
        false;


      if (institutionGroup) {

        institutionGroup.style.display =
          "none";

      }


      if (currentInstitutionId) {

        institutionSelect.value =
          currentInstitutionId;

      }


      console.log(
        "Institution locked to:",
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
      "studentsBody element not found."
    );

    return false;
  }


  studentsBody.innerHTML = `
    <tr>
      <td colspan="7" class="loading">
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
    // SCHOOL ADMIN / TEACHER
    // =====================================================

    else {

      if (!currentInstitutionId) {

        console.error(
          "No institution assigned to this user."
        );


        studentsBody.innerHTML = `
          <tr>
            <td colspan="7" class="empty">
              Institution not assigned to this account.
            </td>
          </tr>
        `;

        return false;
      }


      console.log(
        "Loading students for institution:",
        currentInstitutionId
      );


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
        "Students query error:",
        error
      );


      studentsBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty">
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
      "Students loaded successfully:",
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
        <td colspan="7" class="empty">
          Student loading failed.
        </td>
      </tr>
    `;


    showMessage(
      "Student loading failed.",
      "error"
    );


    return false;
  }
}


// =========================================================
// RENDER STUDENTS
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
          (
            student.student_id || ""
          )
          .toString()
          .toLowerCase();


        const fullName =
          (
            student.full_name || ""
          )
          .toString()
          .toLowerCase();


        const phone =
          (
            student.phone || ""
          )
          .toString()
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
                  )}"
                >

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
                    onclick="viewStudent('${student.id}')"
                  >
                    View
                  </button>

                  <button
                    class="action-btn edit"
                    onclick="editStudent('${student.id}')"
                  >
                    Edit
                  </button>

                  <button
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
// OPEN ADD MODAL
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
        item.id === id
    );


  if (!student) {
    return;
  }


  const fields = {

    editId:
      student.id,

    studentId:
      student.student_id || "",

    fullName:
      student.full_name || "",

    gender:
      student.gender || "",

    dateOfBirth:
      student.date_of_birth || "",

    phone:
      student.phone || "",

    email:
      student.email || "",

    address:
      student.address || "",

    admissionDate:
      student.admission_date || "",

    status:
      student.status || "active",

    emergencyContactName:
      student.emergency_contact_name || "",

    emergencyContactPhone:
      student.emergency_contact_phone || "",

    photoUrl:
      student.photo_url || ""

  };


  Object.entries(fields)
    .forEach(
      ([id, value]) => {

        const element =
          document.getElementById(id);

        if (element) {
          element.value =
            value;
        }

      }
    );


  institutionSelect.value =
    student.institution_id || "";


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

  }


  institutionSelect.disabled =
    currentRole !== "super_admin";


  studentModal.style.display =
    "block";
}


// =========================================================
// SAVE / UPDATE
// =========================================================

if (studentForm) {

  studentForm.addEventListener(
    "submit",
    async function(event) {

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
        document.getElementById(
          "editId"
        )?.value || "";


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


      const studentData = {

        student_id:
          document.getElementById(
            "studentId"
          )?.value
            .trim(),

        full_name:
          document.getElementById(
            "fullName"
          )?.value
            .trim(),

        gender:
          document.getElementById(
            "gender"
          )?.value || null,

        date_of_birth:
          document.getElementById(
            "dateOfBirth"
          )?.value || null,

        phone:
          document.getElementById(
            "phone"
          )?.value
            .trim() || null,

        email:
          document.getElementById(
            "email"
          )?.value
            .trim() || null,

        address:
          document.getElementById(
            "address"
          )?.value
            .trim() || null,

        admission_date:
          document.getElementById(
            "admissionDate"
          )?.value || null,

        status:
          document.getElementById(
            "status"
          )?.value || "active",

        emergency_contact_name:
          document.getElementById(
            "emergencyContactName"
          )?.value
            .trim() || null,

        emergency_contact_phone:
          document.getElementById(
            "emergencyContactPhone"
          )?.value
            .trim() || null,

        photo_url:
          document.getElementById(
            "photoUrl"
          )?.value
            .trim() || null,

        institution_id:
          selectedInstitutionId

      };


      try {

        let result;


        // =================================================
        // UPDATE
        // =================================================

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


        // =================================================
        // INSERT
        // =================================================

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
            "Save student error:",
            result.error
          );


          showMessage(
            result.error.message,
            "error"
          );


          if (saveButton) {

            saveButton.disabled =
              false;

            saveButton.textContent =
              editId
                ? "Update Student"
                : "Save Student";

          }

          return;
        }


        showMessage(
          editId
            ? "Student updated successfully."
            : "Student added successfully.",
          "success"
        );


        if (saveButton) {

          saveButton.textContent =
            "Saved ✓";

        }


        closeModal();


        await loadStudents();

      } catch (error) {

        console.error(
          "Student save exception:",
          error
        );


        showMessage(
          "Unexpected error while saving student.",
          "error"
        );


        if (saveButton) {

          saveButton.disabled =
            false;

          saveButton.textContent =
            editId
              ? "Update Student"
              : "Save Student";

        }
      }

    }
  );
}


// =========================================================
// VIEW STUDENT
// =========================================================

function viewStudent(id) {

  const student =
    students.find(
      item =>
        item.id === id
    );


  if (!student) {
    return;
  }


  const institution =
    institutions.find(
      item =>
        item.id ===
        student.institution_id
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
          alt="Student Photo"
        >
      `
      : "";


  const details =
    document.getElementById(
      "studentDetails"
    );


  if (!details) {
    return;
  }


  details.innerHTML = `

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


// =========================================================
// DELETE STUDENT
// =========================================================

async function deleteStudent(id) {

  const student =
    students.find(
      item =>
        item.id === id
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

  } catch (error) {

    console.error(
      "Delete exception:",
      error
    );


    showMessage(
      "Unexpected delete error.",
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
// SEARCH
// =========================================================

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
  type = "error"
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
    "message " + type;


  setTimeout(
    () => {

      if (messageBox) {

        messageBox.className =
          "message";

      }

    },
    4000
  );
}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(date) {

  if (!date) {
    return "-";
  }


  const parsed =
    new Date(date);


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {

    return "-";
  }


  return parsed.toLocaleDateString();
}


// =========================================================
// ESCAPE HTML
// =========================================================

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


// =========================================================
// START
// =========================================================

async function startStudentsPage() {

  console.log(
    "===================================="
  );

  console.log(
    "GAAWOW EMS Students V3 starting..."
  );

  console.log(
    "===================================="
  );


  if (!checkRequiredElements()) {

    return;
  }


  const authenticated =
    await checkSession();


  if (!authenticated) {

    return;
  }


  const profileLoaded =
    await loadCurrentProfile();


  if (!profileLoaded) {

    return;
  }


  await loadInstitutions();

  await loadStudents();


  console.log(
    "GAAWOW EMS Students V3 ready."
  );
}


// =========================================================
// START AFTER DOM READY
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
