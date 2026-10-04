/* ============================================================
   GAAWOW EMS — STUDENTS.JS
   Version: V1
   Super Admin Student Management
============================================================ */

/* ============================================================
   SUPABASE CONFIGURATION
============================================================ */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


/* ============================================================
   CONFIG
============================================================ */

const CONFIG = {

  studentsTable: "students",

  institutionsTable: "institutions",

  storageBucket: "student-photos",

  idPrefix: "GA",

  photoMaxSizeMB: 10,

  pageYear: new Date().getFullYear()

};


/* ============================================================
   GLOBAL STATE
============================================================ */

let students = [];

let institutions = [];

let editingStudent = null;

let selectedPhotoFile = null;


/* ============================================================
   DOM HELPERS
============================================================ */

const $ = (id) =>
  document.getElementById(id);


/* ============================================================
   DOM ELEMENTS
============================================================ */

const messageBox =
  $("message");

const studentForm =
  $("studentForm");

const studentIdInput =
  $("studentId");

const editStudentDbId =
  $("editStudentDbId");

const fullNameInput =
  $("fullName");

const genderInput =
  $("gender");

const dateOfBirthInput =
  $("dateOfBirth");

const phoneInput =
  $("phone");

const emailInput =
  $("email");

const admissionDateInput =
  $("admissionDate");

const statusInput =
  $("status");

const addressInput =
  $("address");

const institutionSelect =
  $("institutionSelect");

const photoInput =
  $("photoInput");

const photoPreview =
  $("photoPreview");

const photoPlaceholder =
  $("photoPlaceholder");

const accountStatus =
  $("accountStatus");

const createAccountButton =
  $("createAccountButton");

const resetPasswordButton =
  $("resetPasswordButton");

const progressWrap =
  $("progressWrap");

const progressBar =
  $("progressBar");

const progressText =
  $("progressText");

const studentsTableBody =
  $("studentsTableBody");

const searchInput =
  $("searchInput");

const statusFilter =
  $("statusFilter");

const profileModal =
  $("profileModal");

const profileContent =
  $("profileContent");

const formTitle =
  $("formTitle");

const saveButton =
  $("saveButton");


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  initStudentsPage
);


async function initStudentsPage() {

  try {

    setMessage(
      "Loading student management system...",
      "warning"
    );

    await loadInstitutions();

    await loadStudents();

    setupEvents();

    setMessage(
      "",
      ""
    );

  } catch (error) {

    console.error(
      "Initialization error:",
      error
    );

    setMessage(
      "System initialization failed: " +
      getErrorMessage(error),
      "error"
    );

  }

}


/* ============================================================
   EVENTS
============================================================ */

function setupEvents() {

  studentForm?.addEventListener(
    "submit",
    handleStudentSubmit
  );

  $("addStudentButton")?.addEventListener(
    "click",
    () => {

      resetStudentForm();

      fullNameInput?.focus();

    }
  );

  $("resetFormButton")?.addEventListener(
    "click",
    resetStudentForm
  );

  $("refreshStudentsButton")?.addEventListener(
    "click",
    async () => {

      await loadStudents();

    }
  );

  searchInput?.addEventListener(
    "input",
    renderStudents
  );

  statusFilter?.addEventListener(
    "change",
    renderStudents
  );

  photoInput?.addEventListener(
    "change",
    handlePhotoSelection
  );

  $("closeProfileModal")?.addEventListener(
    "click",
    closeProfileModal
  );

  profileModal?.addEventListener(
    "click",
    event => {

      if (
        event.target === profileModal
      ) {

        closeProfileModal();

      }

    }
  );

  createAccountButton?.addEventListener(
    "click",
    handleCreateAccount
  );

  resetPasswordButton?.addEventListener(
    "click",
    handleResetPassword
  );

}


/* ============================================================
   MESSAGE
============================================================ */

function setMessage(
  text,
  type = ""
) {

  if (!messageBox) {
    return;
  }

  messageBox.textContent =
    text || "";

  messageBox.className =
    "message";

  if (type) {

    messageBox.classList.add(
      type
    );

  }

  if (!text) {

    messageBox.style.display =
      "none";

  } else {

    messageBox.style.display =
      "block";

  }

}


/* ============================================================
   ERROR MESSAGE
============================================================ */

function getErrorMessage(error) {

  if (!error) {
    return "Unknown error";
  }

  if (
    typeof error === "string"
  ) {
    return error;
  }

  return (
    error.message ||
    error.error_description ||
    "Unknown Supabase error"
  );

}


/* ============================================================
   LOAD INSTITUTIONS
============================================================ */

async function loadInstitutions() {

  if (!institutionSelect) {
    return;
  }

  institutionSelect.innerHTML = `
    <option value="">
      Loading institutions...
    </option>
  `;

  const {
    data,
    error
  } = await supabaseClient

    .from(CONFIG.institutionsTable)

    .select("*")

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

    institutionSelect.innerHTML = `
      <option value="">
        Unable to load institutions
      </option>
    `;

    throw error;

  }


  institutions =
    data || [];


  institutionSelect.innerHTML = `
    <option value="">
      Select institution
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
        institution.name ||
        institution.institution_name ||
        institution.title ||
        "Unnamed Institution";

      institutionSelect.appendChild(
        option
      );

    }
  );

}


/* ============================================================
   LOAD STUDENTS
============================================================ */

async function loadStudents() {

  studentsTableBody.innerHTML = `
    <tr>
      <td
        colspan="10"
        class="empty"
      >
        Loading students...
      </td>
    </tr>
  `;


  const {
    data,
    error
  } = await supabaseClient

    .from(CONFIG.studentsTable)

    .select(`
      *,
      institutions (
        id,
        name
      )
    `)

    .order(
      "created_at",
      {
        ascending: false
      }
    );


  if (error) {

    console.error(
      "Students loading error:",
      error
    );

    studentsTableBody.innerHTML = `
      <tr>
        <td
          colspan="10"
          class="empty"
        >
          Failed to load students.
        </td>
      </tr>
    `;

    throw error;

  }


  students =
    data || [];


  renderStudents();

  updateStatistics();

}


/* ============================================================
   GENERATE STUDENT ID
============================================================ */

async function generateStudentId() {

  const year =
    new Date().getFullYear();


  const {
    data,
    error
  } = await supabaseClient

    .from(CONFIG.studentsTable)

    .select("student_id")

    .like(
      "student_id",
      `${CONFIG.idPrefix}-${year}-%`
    )

    .order(
      "student_id",
      {
        ascending: false
      }
    )

    .limit(1);


  if (error) {

    console.error(
      "Student ID generation error:",
      error
    );

    throw error;

  }


  let nextNumber = 1;


  if (
    data &&
    data.length > 0 &&
    data[0].student_id
  ) {

    const lastId =
      data[0].student_id;


    const match =
      lastId.match(
        /(\d+)$/
      );


    if (match) {

      nextNumber =
        parseInt(
          match[1],
          10
        ) + 1;

    }

  }


  const paddedNumber =
    String(nextNumber)
      .padStart(
        6,
        "0"
      );


  return `${CONFIG.idPrefix}-${year}-${paddedNumber}`;

}


/* ============================================================
   HANDLE STUDENT SUBMIT
============================================================ */

async function handleStudentSubmit(
  event
) {

  event.preventDefault();


  try {

    if (!validateStudentForm()) {
      return;
    }


    disableForm(
      true
    );


    setProgress(
      10,
      "Preparing student record..."
    );


    const studentData =
      await collectStudentData();


    if (editingStudent) {

      await updateStudent(
        editingStudent.id,
        studentData
      );

    } else {

      await createStudent(
        studentData
      );

    }


    setProgress(
      100,
      "Student saved successfully."
    );


    setMessage(
      editingStudent
        ? "Student updated successfully."
        : "Student registered successfully.",
      "success"
    );


    await loadStudents();


    setTimeout(
      () => {

        resetStudentForm();

      },
      500
    );


  } catch (error) {

    console.error(
      "Save student error:",
      error
    );

    setMessage(
      getErrorMessage(error),
      "error"
    );

  } finally {

    disableForm(
      false
    );


    setTimeout(
      () => {

        hideProgress();

      },
      700
    );

  }

}


/* ============================================================
   VALIDATE FORM
============================================================ */

function validateStudentForm() {

  const institution =
    institutionSelect?.value.trim();

  const fullName =
    fullNameInput?.value.trim();

  const admissionDate =
    admissionDateInput?.value.trim();

  if (!institution) {

    setMessage(
      "Please select an institution.",
      "error"
    );

    institutionSelect.focus();

    return false;

  }


  if (!fullName) {

    setMessage(
      "Please enter the student's full name.",
      "error"
    );

    fullNameInput.focus();

    return false;

  }


  if (!admissionDate) {

    setMessage(
      "Please select the admission date.",
      "error"
    );

    admissionDateInput.focus();

    return false;

  }


  if (
    emailInput?.value &&
    !isValidEmail(
      emailInput.value.trim()
    )
  ) {

    setMessage(
      "Please enter a valid email address.",
      "error"
    );

    emailInput.focus();

    return false;

  }


  return true;

}


/* ============================================================
   EMAIL VALIDATION
============================================================ */

function isValidEmail(
  email
) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);

}


/* ============================================================
   COLLECT STUDENT DATA
============================================================ */

async function collectStudentData() {

  let studentId =
    studentIdInput.value.trim();


  if (!editingStudent) {

    setProgress(
      20,
      "Generating Student ID..."
    );

    studentId =
      await generateStudentId();

    studentIdInput.value =
      studentId;

  }


  let photoUrl =
    editingStudent?.photo_url ||
    editingStudent?.photo ||
    null;


  if (selectedPhotoFile) {

    setProgress(
      35,
      "Uploading student photo..."
    );

    photoUrl =
      await uploadStudentPhoto(
        selectedPhotoFile,
        studentId
      );

  }


  return {

    student_id:
      studentId,

    institution_id:
      institutionSelect.value,

    full_name:
      fullNameInput.value.trim(),

    gender:
      genderInput.value || null,

    date_of_birth:
      dateOfBirthInput.value || null,

    phone:
      phoneInput.value.trim() || null,

    email:
      emailInput.value.trim() || null,

    admission_date:
      admissionDateInput.value || null,

    status:
      statusInput.value || "active",

    address:
      addressInput.value.trim() || null,

    photo_url:
      photoUrl

  };

}


/* ============================================================
   CREATE STUDENT
============================================================ */

async function createStudent(
  studentData
) {

  setProgress(
    60,
    "Creating student record..."
  );


  const {
    data,
    error
  } = await supabaseClient

    .from(CONFIG.studentsTable)

    .insert(
      studentData
    )

    .select()

    .single();


  if (error) {

    console.error(
      "Create student error:",
      error
    );

    throw error;

  }


  editingStudent =
    data;

}


/* ============================================================
   UPDATE STUDENT
============================================================ */

async function updateStudent(
  dbId,
  studentData
) {

  setProgress(
    60,
    "Updating student record..."
  );


  const {
    data,
    error
  } = await supabaseClient

    .from(CONFIG.studentsTable)

    .update(
      studentData
    )

    .eq(
      "id",
      dbId
    )

    .select()

    .single();


  if (error) {

    console.error(
      "Update student error:",
      error
    );

    throw error;

  }


  editingStudent =
    data;

}


/* ============================================================
   PHOTO SELECTION
============================================================ */

function handlePhotoSelection(
  event
) {

  const file =
    event.target.files?.[0];


  if (!file) {

    selectedPhotoFile =
      null;

    return;

  }


  const maxSize =
    CONFIG.photoMaxSizeMB *
    1024 *
    1024;


  if (
    file.size > maxSize
  ) {

    setMessage(
      `Photo must be smaller than ${CONFIG.photoMaxSizeMB}MB.`,
      "error"
    );

    photoInput.value =
      "";

    selectedPhotoFile =
      null;

    return;

  }


  if (
    ![
      "image/jpeg",
      "image/png",
      "image/webp"
    ].includes(
      file.type
    )
  ) {

    setMessage(
      "Only JPG, PNG and WEBP images are allowed.",
      "error"
    );

    photoInput.value =
      "";

    selectedPhotoFile =
      null;

    return;

  }


  selectedPhotoFile =
    file;


  const reader =
    new FileReader();


  reader.onload =
    function(event) {

      photoPreview.src =
        event.target.result;

      photoPreview.style.display =
        "block";

      photoPlaceholder.style.display =
        "none";

    };


  reader.readAsDataURL(
    file
  );

}


/* ============================================================
   UPLOAD PHOTO
============================================================ */

async function uploadStudentPhoto(
  file,
  studentId
) {

  const extension =
    getFileExtension(
      file.name
    );


  const safeId =
    studentId
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );


  const filePath =
    `${safeId}_${Date.now()}.${extension}`;


  const {
    error: uploadError
  } = await supabaseClient

    .storage

    .from(
      CONFIG.storageBucket
    )

    .upload(
      filePath,
      file,
      {
        cacheControl:
          "3600",

        upsert:
          false

      }
    );


  if (uploadError) {

    console.error(
      "Photo upload error:",
      uploadError
    );

    throw new Error(
      "Photo upload failed: " +
      uploadError.message
    );

  }


  const {
    data
  } = supabaseClient

    .storage

    .from(
      CONFIG.storageBucket
    )

    .getPublicUrl(
      filePath
    );


  return data.publicUrl;

}


/* ============================================================
   FILE EXTENSION
============================================================ */

function getFileExtension(
  filename
) {

  const parts =
    filename.split(".");

  return (
    parts.pop() ||
    "jpg"
  ).toLowerCase();

}


/* ============================================================
   RENDER STUDENTS
============================================================ */

function renderStudents() {

  const search =
    (
      searchInput?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const selectedStatus =
    statusFilter?.value ||
    "";


  let filtered =
    students.filter(
      student => {

        const searchable =
          [
            student.student_id,
            student.full_name,
            student.phone,
            student.email,
            student.gender
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


        const matchesSearch =
          !search ||
          searchable.includes(
            search
          );


        const matchesStatus =
          !selectedStatus ||
          student.status ===
            selectedStatus;


        return (
          matchesSearch &&
          matchesStatus
        );

      }
    );


  if (!filtered.length) {

    studentsTableBody.innerHTML = `
      <tr>
        <td
          colspan="10"
          class="empty"
        >
          No students found.
        </td>
      </tr>
    `;

    return;

  }


  studentsTableBody.innerHTML =
    filtered
      .map(
        student =>
          createStudentRow(
            student
          )
      )
      .join("");


  bindTableActions();

}


/* ============================================================
   CREATE STUDENT ROW
============================================================ */

function createStudentRow(
  student
) {

  const photo =
    student.photo_url ||
    student.photo ||
    "";


  const photoHTML =
    photo

      ? `
        <img
          src="${escapeAttribute(photo)}"
          class="student-photo"
          alt="Student"
          onerror="this.style.display='none'"
        >
      `

      : `
        <div class="initials">
          ${getInitials(
            student.full_name
          )}
        </div>
      `;


  const account =
    student.auth_user_id ||
    student.user_id ||
    student.account_created
      ? `
        <span class="status status-active">
          Active
        </span>
      `
      : `
        <span class="status status-inactive">
          No Account
        </span>
      `;


  return `

    <tr>

      <td>
        ${photoHTML}
      </td>

      <td>
        <strong>
          ${escapeHTML(
            student.student_id ||
            "-"
          )}
        </strong>
      </td>

      <td>
        <strong>
          ${escapeHTML(
            student.full_name ||
            "-"
          )}
        </strong>
      </td>

      <td>
        ${escapeHTML(
          student.gender ||
          "-"
        )}
      </td>

      <td>
        ${escapeHTML(
          student.phone ||
          "-"
        )}
      </td>

      <td>
        ${escapeHTML(
          student.email ||
          "-"
        )}
      </td>

      <td>
        ${statusBadge(
          student.status
        )}
      </td>

      <td>
        ${formatDate(
          student.admission_date
        )}
      </td>

      <td>
        ${account}
      </td>

      <td>

        <div class="actions">

          <button
            type="button"
            class="btn-small action-view"
            data-action="view"
            data-id="${student.id}"
          >
            View
          </button>

          <button
            type="button"
            class="btn-small action-edit"
            data-action="edit"
            data-id="${student.id}"
          >
            Edit
          </button>

          ${
            !(
              student.auth_user_id ||
              student.user_id ||
              student.account_created
            )
              ? `
                <button
                  type="button"
                  class="btn-small action-create-account"
                  data-action="account"
                  data-id="${student.id}"
                >
                  Account
                </button>
              `
              : `
                <button
                  type="button"
                  class="btn-small action-reset-password"
                  data-action="reset"
                  data-id="${student.id}"
                >
                  Reset
                </button>
              `
          }

          <button
            type="button"
            class="btn-small action-delete"
            data-action="delete"
            data-id="${student.id}"
          >
            Delete
          </button>

        </div>

      </td>

    </tr>

  `;

}


/* ============================================================
   BIND TABLE ACTIONS
============================================================ */

function bindTableActions() {

  document
    .querySelectorAll(
      "[data-action]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const action =
              button.dataset.action;

            const id =
              button.dataset.id;


            const student =
              students.find(
                item =>
                  String(item.id) ===
                  String(id)
              );


            if (!student) {
              return;
            }


            if (
              action === "view"
            ) {

              viewStudent(
                student
              );

            }


            if (
              action === "edit"
            ) {

              editStudent(
                student
              );

            }


            if (
              action === "delete"
            ) {

              deleteStudent(
                student
              );

            }


            if (
              action === "account"
            ) {

              editStudent(
                student
              );

              setTimeout(
                () => {
                  handleCreateAccount();
                },
                100
              );

            }


            if (
              action === "reset"
            ) {

              editStudent(
                student
              );

              setTimeout(
                () => {
                  handleResetPassword();
                },
                100
              );

            }

          }
        );

      }
    );

}


/* ============================================================
   STATUS BADGE
============================================================ */

function statusBadge(
  status
) {

  const value =
    status || "inactive";


  const label =
    capitalize(
      value
    );


  return `
    <span
      class="status status-${escapeAttribute(value)}"
    >
      ${escapeHTML(label)}
    </span>
  `;

}


/* ============================================================
   VIEW STUDENT
============================================================ */

function viewStudent(
  student
) {

  const photo =
    student.photo_url ||
    student.photo ||
    "";


  profileContent.innerHTML = `

    <div class="profile-top">

      ${
        photo

          ? `
            <img
              src="${escapeAttribute(photo)}"
              class="profile-photo"
              alt="Student"
            >
          `

          : `
            <div class="profile-photo">
              <div class="initials">
                ${getInitials(
                  student.full_name
                )}
              </div>
            </div>
          `
      }

      <div>

        <div class="profile-name">
          ${escapeHTML(
            student.full_name ||
            "-"
          )}
        </div>

        <div class="profile-id">
          ${escapeHTML(
            student.student_id ||
            "-"
          )}
        </div>

      </div>

    </div>


    <div class="profile-grid">

      ${profileItem(
        "Institution",
        getInstitutionName(
          student
        )
      )}

      ${profileItem(
        "Gender",
        student.gender
      )}

      ${profileItem(
        "Date of Birth",
        formatDate(
          student.date_of_birth
        )
      )}

      ${profileItem(
        "Phone",
        student.phone
      )}

      ${profileItem(
        "Email",
        student.email
      )}

      ${profileItem(
        "Admission Date",
        formatDate(
          student.admission_date
        )
      )}

      ${profileItem(
        "Status",
        capitalize(
          student.status
        )
      )}

      ${profileItem(
        "Address",
        student.address
      )}

    </div>

  `;


  profileModal.classList.add(
    "show"
  );

  profileModal.setAttribute(
    "aria-hidden",
    "false"
  );

}


/* ============================================================
   PROFILE ITEM
============================================================ */

function profileItem(
  label,
  value
) {

  return `

    <div class="profile-item">

      <strong>
        ${escapeHTML(
          label
        )}
      </strong>

      <span>
        ${escapeHTML(
          value ||
          "-"
        )}
      </span>

    </div>

  `;

}


/* ============================================================
   CLOSE PROFILE MODAL
============================================================ */

function closeProfileModal() {

  profileModal.classList.remove(
    "show"
  );

  profileModal.setAttribute(
    "aria-hidden",
    "true"
  );

}


/* ============================================================
   EDIT STUDENT
============================================================ */

function editStudent(
  student
) {

  editingStudent =
    student;


  editStudentDbId.value =
    student.id;


  studentIdInput.value =
    student.student_id ||
    "";


  fullNameInput.value =
    student.full_name ||
    "";


  genderInput.value =
    student.gender ||
    "";


  dateOfBirthInput.value =
    student.date_of_birth ||
    "";


  phoneInput.value =
    student.phone ||
    "";


  emailInput.value =
    student.email ||
    "";


  admissionDateInput.value =
    student.admission_date ||
    "";


  statusInput.value =
    student.status ||
    "active";


  addressInput.value =
    student.address ||
    "";


  institutionSelect.value =
    student.institution_id ||
    "";


  selectedPhotoFile =
    null;


  photoInput.value =
    "";


  const photo =
    student.photo_url ||
    student.photo ||
    "";


  if (photo) {

    photoPreview.src =
      photo;

    photoPreview.style.display =
      "block";

    photoPlaceholder.style.display =
      "none";

  } else {

    photoPreview.style.display =
      "none";

    photoPlaceholder.style.display =
      "flex";

  }


  formTitle.textContent =
    "Edit Student";


  saveButton.textContent =
    "Update Student";


  updateAccountUI(
    student
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* ============================================================
   RESET FORM
============================================================ */

function resetStudentForm() {

  editingStudent =
    null;


  selectedPhotoFile =
    null;


  studentForm.reset();


  editStudentDbId.value =
    "";


  studentIdInput.value =
    "";


  formTitle.textContent =
    "Add Student";


  saveButton.textContent =
    "Save Student";


  statusInput.value =
    "active";


  photoInput.value =
    "";


  photoPreview.src =
    "";


  photoPreview.style.display =
    "none";


  photoPlaceholder.style.display =
    "flex";


  updateAccountUI(
    null
  );


  hideProgress();

}


/* ============================================================
   ACCOUNT UI
============================================================ */

function updateAccountUI(
  student
) {

  if (!student) {

    accountStatus.textContent =
      "No Account";

    accountStatus.className =
      "status status-inactive";

    createAccountButton.style.display =
      "none";

    resetPasswordButton.style.display =
      "none";

    return;

  }


  const hasAccount =
    Boolean(
      student.auth_user_id ||
      student.user_id ||
      student.account_created
    );


  if (hasAccount) {

    accountStatus.textContent =
      "Account Active";

    accountStatus.className =
      "status status-active";

    createAccountButton.style.display =
      "none";

    resetPasswordButton.style.display =
      "inline-flex";

  } else {

    accountStatus.textContent =
      "No Account";

    accountStatus.className =
      "status status-inactive";

    createAccountButton.style.display =
      "inline-flex";

    resetPasswordButton.style.display =
      "none";

  }

}


/* ============================================================
   CREATE STUDENT ACCOUNT
============================================================ */

async function handleCreateAccount() {

  if (!editingStudent) {

    setMessage(
      "Please save/select a student first.",
      "warning"
    );

    return;

  }


  const email =
    editingStudent.email ||
    emailInput.value.trim();


  if (!email) {

    setMessage(
      "Student email is required before creating a login account.",
      "error"
    );

    return;

  }


  const confirmed =
    confirm(
      `Create login account for ${editingStudent.full_name}?\n\nEmail: ${email}`
    );


  if (!confirmed) {
    return;
  }


  /*
    IMPORTANT:

    Supabase Auth Admin account creation
    CANNOT safely be performed directly
    from browser using the publishable key.

    It should be handled by a Supabase
    Edge Function / secure backend.
  */


  setMessage(
    "Student account creation requires the secure Supabase Edge Function. The student record is ready, but Auth Admin must not be exposed in browser JavaScript.",
    "warning"
  );

}


/* ============================================================
   RESET PASSWORD
============================================================ */

async function handleResetPassword() {

  if (!editingStudent) {

    setMessage(
      "Please select a student first.",
      "warning"
    );

    return;

  }


  const email =
    editingStudent.email ||
    emailInput.value.trim();


  if (!email) {

    setMessage(
      "Student email is required.",
      "error"
    );

    return;

  }


  const confirmed =
    confirm(
      `Send password reset email to:\n\n${email}?`
    );


  if (!confirmed) {
    return;
  }


  try {

    setMessage(
      "Sending password reset email...",
      "warning"
    );


    const {
      error
    } = await supabaseClient
      .auth
      .resetPasswordForEmail(
        email,
        {
          redirectTo:
            window.location.origin +
            "/reset-password.html"
        }
      );


    if (error) {
      throw error;
    }


    setMessage(
      "Password reset email sent successfully.",
      "success"
    );


  } catch (error) {

    console.error(
      "Password reset error:",
      error
    );

    setMessage(
      "Password reset failed: " +
      getErrorMessage(error),
      "error"
    );

  }

}


/* ============================================================
   DELETE STUDENT
============================================================ */

async function deleteStudent(
  student
) {

  const confirmed =
    confirm(
      `Delete student?\n\n${student.full_name}\n${student.student_id}\n\nThis action cannot be undone.`
    );


  if (!confirmed) {
    return;
  }


  try {

    setMessage(
      "Deleting student...",
      "warning"
    );


    const {
      error
    } = await supabaseClient

      .from(
        CONFIG.studentsTable
      )

      .delete()

      .eq(
        "id",
        student.id
      );


    if (error) {
      throw error;
    }


    setMessage(
      "Student deleted successfully.",
      "success"
    );


    await loadStudents();


  } catch (error) {

    console.error(
      "Delete student error:",
      error
    );

    setMessage(
      "Delete failed: " +
      getErrorMessage(error),
      "error"
    );

  }

}


/* ============================================================
   STATISTICS
============================================================ */

function updateStatistics() {

  const total =
    students.length;


  const active =
    students.filter(
      student =>
        student.status ===
        "active"
    ).length;


  const graduated =
    students.filter(
      student =>
        student.status ===
        "graduated"
    ).length;


  const other =
    total -
    active -
    graduated;


  $("totalStudents").textContent =
    total;


  $("activeStudents").textContent =
    active;


  $("graduatedStudents").textContent =
    graduated;


  $("otherStudents").textContent =
    other;

}


/* ============================================================
   PROGRESS
============================================================ */

function setProgress(
  percent,
  text
) {

  progressWrap.style.display =
    "block";


  progressBar.style.width =
    `${percent}%`;


  progressText.textContent =
    text || "";

}


function hideProgress() {

  progressWrap.style.display =
    "none";

  progressBar.style.width =
    "0%";

  progressText.textContent =
    "";

}


/* ============================================================
   DISABLE FORM
============================================================ */

function disableForm(
  disabled
) {

  const controls =
    studentForm.querySelectorAll(
      "input, select, textarea, button"
    );


  controls.forEach(
    control => {

      control.disabled =
        disabled;

    }
  );


  if (!disabled) {

    updateAccountUI(
      editingStudent
    );

  }

}


/* ============================================================
   INSTITUTION NAME
============================================================ */

function getInstitutionName(
  student
) {

  if (
    student.institutions?.name
  ) {

    return student.institutions.name;

  }


  const institution =
    institutions.find(
      item =>
        String(item.id) ===
        String(
          student.institution_id
        )
    );


  return (
    institution?.name ||
    institution?.institution_name ||
    "-"
  );

}


/* ============================================================
   DATE FORMAT
============================================================ */

function formatDate(
  value
) {

  if (!value) {
    return "-";
  }


  try {

    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return value;

    }


    return date.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    );

  } catch {

    return value;

  }

}


/* ============================================================
   CAPITALIZE
============================================================ */

function capitalize(
  value
) {

  if (!value) {
    return "";
  }


  return String(value)
    .charAt(0)
    .toUpperCase() +
    String(value)
      .slice(1);

}


/* ============================================================
   INITIALS
============================================================ */

function getInitials(
  name
) {

  if (!name) {
    return "👤";
  }


  const parts =
    String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2);


  return parts
    .map(
      part =>
        part
          .charAt(0)
          .toUpperCase()
    )
    .join("");

}


/* ============================================================
   ESCAPE HTML
============================================================ */

function escapeHTML(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


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


/* ============================================================
   ESCAPE ATTRIBUTE
============================================================ */

function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  );

}


/* ============================================================
   SUPABASE CONNECTION TEST
============================================================ */

async function testSupabaseConnection() {

  try {

    const {
      error
    } = await supabaseClient

      .from(
        CONFIG.studentsTable
      )

      .select(
        "id",
        {
          head: true,
          count: "exact"
        }
      );


    if (error) {

      console.error(
        "Supabase connection/table test failed:",
        error
      );

      return false;

    }


    console.log(
      "✅ Supabase connected successfully."
    );

    return true;


  } catch (error) {

    console.error(
      "Supabase connection failed:",
      error
    );

    return false;

  }

}


/* ============================================================
   START CONNECTION TEST
============================================================ */

setTimeout(
  () => {

    testSupabaseConnection();

  },
  1000
);


/* ============================================================
   GLOBAL EXPORTS
============================================================ */

window.GaawowStudents = {

  reload:
    loadStudents,

  reset:
    resetStudentForm,

  testConnection:
    testSupabaseConnection,

  generateStudentId:
    generateStudentId

};


/* ============================================================
   END
============================================================ */
