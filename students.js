/* =========================================================
   GAAWOW EMS
   STUDENTS.JS V6
   SUPER ADMIN STUDENT MANAGEMENT
========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


/* =========================================================
   DOM
========================================================= */

const $ = (id) =>
  document.getElementById(id);

const messageEl =
  $("message");

const studentForm =
  $("studentForm");

const institutionSelect =
  $("institutionSelect");

const studentIdInput =
  $("studentId");

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

const photoInput =
  $("photoInput");

const photoPreview =
  $("photoPreview");

const photoPlaceholder =
  $("photoPlaceholder");

const editStudentDbId =
  $("editStudentDbId");

const saveButton =
  $("saveButton");

const resetFormButton =
  $("resetFormButton");

const addStudentButton =
  $("addStudentButton");

const refreshStudentsButton =
  $("refreshStudentsButton");

const searchInput =
  $("searchInput");

const statusFilter =
  $("statusFilter");

const studentsTableBody =
  $("studentsTableBody");

const formTitle =
  $("formTitle");

const createAccountButton =
  $("createAccountButton");

const resetPasswordButton =
  $("resetPasswordButton");

const accountStatus =
  $("accountStatus");

const progressWrap =
  $("progressWrap");

const progressBar =
  $("progressBar");

const progressText =
  $("progressText");

const totalStudents =
  $("totalStudents");

const activeStudents =
  $("activeStudents");

const graduatedStudents =
  $("graduatedStudents");

const otherStudents =
  $("otherStudents");

const profileModal =
  $("profileModal");

const profileContent =
  $("profileContent");

const closeProfileModal =
  $("closeProfileModal");


/* =========================================================
   STATE
========================================================= */

let students = [];

let institutions = [];

let editingStudent = null;

let isSaving = false;


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
  text,
  type = "success"
) {
  if (!messageEl) return;

  messageEl.textContent = text;

  messageEl.className =
    `message ${type}`;

  messageEl.style.display =
    "block";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  setTimeout(() => {
    if (
      messageEl.textContent === text
    ) {
      messageEl.style.display =
        "none";
    }
  }, 6000);
}


function clearMessage() {
  if (!messageEl) return;

  messageEl.textContent = "";

  messageEl.className =
    "message";

  messageEl.style.display =
    "none";
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   DATE
========================================================= */

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(
      `${value}T00:00:00`
    ).toLocaleDateString(
      "en-GB",
      {
        year: "numeric",
        month: "short",
        day: "2-digit"
      }
    );
  } catch {
    return value;
  }
}


/* =========================================================
   CURRENT YEAR
========================================================= */

function currentAcademicYear() {
  return new Date()
    .getFullYear()
    .toString();
}


/* =========================================================
   GENERATE STUDENT ID
========================================================= */

async function generateStudentId() {
  const year =
    currentAcademicYear();

  const prefix =
    `GA-${year}-`;

  const {
    data,
    error
  } = await supabaseClient
    .from("students")
    .select("student_id")
    .like(
      "student_id",
      `${prefix}%`
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

    throw new Error(
      "Unable to generate Student ID."
    );
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
        /^GA-\d{4}-(\d+)$/
      );

    if (match) {
      nextNumber =
        parseInt(
          match[1],
          10
        ) + 1;
    }
  }

  return (
    `${prefix}` +
    String(nextNumber)
      .padStart(6, "0")
  );
}


/* =========================================================
   SET GENERATED ID
========================================================= */

async function prepareNewStudentId() {
  if (
    editStudentDbId.value
  ) {
    return;
  }

  try {
    studentIdInput.value =
      "Generating...";

    studentIdInput.value =
      await generateStudentId();
  } catch (error) {
    studentIdInput.value = "";

    showMessage(
      error.message,
      "error"
    );
  }
}


/* =========================================================
   LOAD INSTITUTIONS
========================================================= */

async function loadInstitutions() {
  institutionSelect.innerHTML =
    `<option value="">
       Loading institutions...
     </option>`;

  /*
     Assumption:
     institutions table contains:
     id
     name

     If your institution table uses
     another name, change only this query.
  */

  const {
    data,
    error
  } = await supabaseClient
    .from("institutions")
    .select("id, name")
    .order(
      "name",
      {
        ascending: true
      }
    );

  if (error) {
    console.error(
      "Institution error:",
      error
    );

    institutionSelect.innerHTML =
      `<option value="">
         Unable to load institutions
       </option>`;

    showMessage(
      "Institutions could not be loaded: " +
      error.message,
      "error"
    );

    return;
  }

  institutions =
    data || [];

  institutionSelect.innerHTML =
    `<option value="">
       Select institution
     </option>`;

  institutions.forEach(
    (institution) => {
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
}


/* =========================================================
   LOAD STUDENTS
========================================================= */

async function loadStudents() {
  studentsTableBody.innerHTML =
    `<tr>
       <td colspan="10" class="empty">
         Loading students...
       </td>
     </tr>`;

  const {
    data,
    error
  } = await supabaseClient
    .from("students")
    .select(`
      id,
      student_id,
      institution_id,
      full_name,
      gender,
      date_of_birth,
      phone,
      email,
      admission_date,
      status,
      address,
      photo_url,
      auth_user_id,
      created_at
    `)
    .order(
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

    studentsTableBody.innerHTML =
      `<tr>
         <td colspan="10" class="empty">
           Could not load students.
           <br>
           ${escapeHtml(error.message)}
         </td>
       </tr>`;

    showMessage(
      "Students could not be loaded: " +
      error.message,
      "error"
    );

    return;
  }

  students =
    data || [];

  updateStatistics();

  renderStudents();
}


/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics() {
  const total =
    students.length;

  const active =
    students.filter(
      s =>
        s.status === "active"
    ).length;

  const graduated =
    students.filter(
      s =>
        s.status ===
        "graduated"
    ).length;

  const other =
    total -
    active -
    graduated;

  totalStudents.textContent =
    total;

  activeStudents.textContent =
    active;

  graduatedStudents.textContent =
    graduated;

  otherStudents.textContent =
    other;
}


/* =========================================================
   FILTER STUDENTS
========================================================= */

function getFilteredStudents() {
  const search =
    (
      searchInput.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const status =
    statusFilter.value;

  return students.filter(
    (student) => {
      const searchable = [
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
        !status ||
        student.status === status;

      return (
        matchesSearch &&
        matchesStatus
      );
    }
  );
}


/* =========================================================
   STATUS BADGE
========================================================= */

function statusBadge(status) {
  const safeStatus =
    status || "inactive";

  const label =
    safeStatus
      .charAt(0)
      .toUpperCase() +
    safeStatus.slice(1);

  return `
    <span class="status status-${escapeHtml(
      safeStatus
    )}">
      ${escapeHtml(label)}
    </span>
  `;
}


/* =========================================================
   ACCOUNT BADGE
========================================================= */

function accountBadge(student) {
  if (
    student.auth_user_id
  ) {
    return `
      <span class="status status-active">
        Account Active
      </span>
    `;
  }

  return `
    <span class="status status-inactive">
      No Account
    </span>
  `;
}


/* =========================================================
   PHOTO
========================================================= */

function studentPhoto(student) {
  if (student.photo_url) {
    return `
      <img
        class="student-photo"
        src="${escapeHtml(
          student.photo_url
        )}"
        alt="Student"
        onerror="
          this.style.display='none';
          this.nextElementSibling.style.display='flex';
        "
      >
      <div
        class="initials"
        style="display:none;"
      >
        ${getInitials(
          student.full_name
        )}
      </div>
    `;
  }

  return `
    <div class="initials">
      ${getInitials(
        student.full_name
      )}
    </div>
  `;
}


function getInitials(name) {
  if (!name) return "👤";

  const parts =
    name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .substring(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderStudents() {
  const filtered =
    getFilteredStudents();

  if (!filtered.length) {
    studentsTableBody.innerHTML =
      `<tr>
         <td colspan="10" class="empty">
           No students found.
         </td>
       </tr>`;

    return;
  }

  studentsTableBody.innerHTML =
    filtered
      .map(
        (student) => `
        <tr>

          <td>
            ${studentPhoto(student)}
          </td>

          <td>
            <strong>
              ${escapeHtml(
                student.student_id ||
                "—"
              )}
            </strong>
          </td>

          <td>
            <strong>
              ${escapeHtml(
                student.full_name ||
                "—"
              )}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              student.gender ||
              "—"
            )}
          </td>

          <td>
            ${escapeHtml(
              student.phone ||
              "—"
            )}
          </td>

          <td>
            ${escapeHtml(
              student.email ||
              "—"
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
            ${accountBadge(
              student
            )}
          </td>

          <td>

            <div class="actions">

              <button
                type="button"
                class="btn-small action-view"
                onclick="
                  viewStudent('${student.id}')
                "
              >
                View
              </button>

              <button
                type="button"
                class="btn-small action-edit"
                onclick="
                  editStudent('${student.id}')
                "
              >
                Edit
              </button>

              ${
                student.auth_user_id
                  ? `
                    <button
                      type="button"
                      class="btn-small action-reset-password"
                      onclick="
                        resetStudentPassword(
                          '${student.id}'
                        )
                      "
                    >
                      Reset Password
                    </button>
                  `
                  : `
                    <button
                      type="button"
                      class="btn-small action-create-account"
                      onclick="
                        createStudentAccount(
                          '${student.id}'
                        )
                      "
                    >
                      Create Account
                    </button>
                  `
              }

              <button
                type="button"
                class="btn-small action-delete"
                onclick="
                  deleteStudent('${student.id}')
                "
              >
                Delete
              </button>

            </div>

          </td>

        </tr>
      `
      )
      .join("");
}


/* =========================================================
   IMAGE OPTIMIZATION
========================================================= */

function optimizeImage(file) {
  return new Promise(
    (resolve, reject) => {
      if (!file) {
        resolve(null);
        return;
      }

      if (
        file.size >
        10 * 1024 * 1024
      ) {
        reject(
          new Error(
            "Photo must be less than 10MB."
          )
        );

        return;
      }

      const reader =
        new FileReader();

      reader.onload = () => {
        const img =
          new Image();

        img.onload = () => {
          const maxSize = 1200;

          let width =
            img.width;

          let height =
            img.height;

          if (
            width > maxSize ||
            height > maxSize
          ) {
            const ratio =
              Math.min(
                maxSize / width,
                maxSize / height
              );

            width =
              Math.round(
                width * ratio
              );

            height =
              Math.round(
                height * ratio
              );
          }

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width =
            width;

          canvas.height =
            height;

          const ctx =
            canvas.getContext(
              "2d"
            );

          ctx.drawImage(
            img,
            0,
            0,
            width,
            height
          );

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(
                  new Error(
                    "Could not process image."
                  )
                );

                return;
              }

              resolve(blob);
            },
            "image/jpeg",
            0.82
          );
        };

        img.onerror = () => {
          reject(
            new Error(
              "Invalid image file."
            )
          );
        };

        img.src =
          reader.result;
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Could not read image."
          )
        );
      };

      reader.readAsDataURL(
        file
      );
    }
  );
}


/* =========================================================
   UPLOAD PHOTO
========================================================= */

async function uploadStudentPhoto(
  file,
  studentId
) {
  if (!file) {
    return null;
  }

  const blob =
    await optimizeImage(file);

  const fileName =
    `${studentId}-${Date.now()}.jpg`;

  const path =
    `students/${fileName}`;

  const {
    error
  } =
    await supabaseClient.storage
      .from("student-photos")
      .upload(
        path,
        blob,
        {
          contentType:
            "image/jpeg",
          upsert: true
        }
      );

  if (error) {
    throw new Error(
      "Photo upload failed: " +
      error.message
    );
  }

  const {
    data
  } =
    supabaseClient.storage
      .from("student-photos")
      .getPublicUrl(path);

  return data.publicUrl;
}


/* =========================================================
   SAVE STUDENT
========================================================= */

studentForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (isSaving) return;

    clearMessage();

    const institutionId =
      institutionSelect.value;

    const fullName =
      fullNameInput.value.trim();

    const admissionDate =
      admissionDateInput.value;

    if (!institutionId) {
      showMessage(
        "Please select an institution.",
        "warning"
      );

      institutionSelect.focus();

      return;
    }

    if (!fullName) {
      showMessage(
        "Full Name is required.",
        "warning"
      );

      fullNameInput.focus();

      return;
    }

    if (!admissionDate) {
      showMessage(
        "Admission Date is required.",
        "warning"
      );

      admissionDateInput.focus();

      return;
    }

    isSaving = true;

    saveButton.disabled =
      true;

    showProgress(
      10,
      "Preparing student..."
    );

    try {
      let studentId =
        studentIdInput.value.trim();

      if (!editStudentDbId.value) {
        if (
          !studentId ||
          studentId ===
            "Generating..."
        ) {
          studentId =
            await generateStudentId();
        }
      }

      showProgress(
        30,
        "Uploading photo..."
      );

      let photoUrl =
        editingStudent?.photo_url ||
        null;

      if (
        photoInput.files &&
        photoInput.files[0]
      ) {
        photoUrl =
          await uploadStudentPhoto(
            photoInput.files[0],
            studentId
          );
      }

      showProgress(
        65,
        "Saving student record..."
      );

      const payload = {
        institution_id:
          institutionId,

        student_id:
          studentId,

        full_name:
          fullName,

        gender:
          genderInput.value ||
          null,

        date_of_birth:
          dateOfBirthInput.value ||
          null,

        phone:
          phoneInput.value.trim() ||
          null,

        email:
          emailInput.value
            .trim()
            .toLowerCase() ||
          null,

        admission_date:
          admissionDate,

        status:
          statusInput.value,

        address:
          addressInput.value.trim() ||
          null,

        photo_url:
          photoUrl
      };

      let result;

      if (editStudentDbId.value) {
        result =
          await supabaseClient
            .from("students")
            .update(payload)
            .eq(
              "id",
              editStudentDbId.value
            )
            .select()
            .single();
      } else {
        result =
          await supabaseClient
            .from("students")
            .insert(payload)
            .select()
            .single();
      }

      if (result.error) {
        throw result.error;
      }

      showProgress(
        100,
        "Student saved successfully."
      );

      showMessage(
        editStudentDbId.value
          ? "Student updated successfully."
          : `Student created successfully. ID: ${studentId}`,
        "success"
      );

      await loadStudents();

      resetStudentForm();

    } catch (error) {
      console.error(
        "SAVE STUDENT ERROR:",
        error
      );

      showMessage(
        error.message ||
          "Student could not be saved.",
        "error"
      );

    } finally {
      isSaving = false;

      saveButton.disabled =
        false;

      setTimeout(
        hideProgress,
        1200
      );
    }
  }
);


/* =========================================================
   EDIT STUDENT
========================================================= */

function editStudent(id) {
  const student =
    students.find(
      s => String(s.id) === String(id)
    );

  if (!student) {
    showMessage(
      "Student not found.",
      "error"
    );

    return;
  }

  editingStudent =
    student;

  editStudentDbId.value =
    student.id;

  formTitle.textContent =
    "Edit Student";

  saveButton.textContent =
    "Update Student";

  institutionSelect.value =
    student.institution_id || "";

  studentIdInput.value =
    student.student_id || "";

  fullNameInput.value =
    student.full_name || "";

  genderInput.value =
    student.gender || "";

  dateOfBirthInput.value =
    student.date_of_birth || "";

  phoneInput.value =
    student.phone || "";

  emailInput.value =
    student.email || "";

  admissionDateInput.value =
    student.admission_date || "";

  statusInput.value =
    student.status || "active";

  addressInput.value =
    student.address || "";

  photoInput.value = "";

  if (student.photo_url) {
    photoPreview.src =
      student.photo_url;

    photoPreview.style.display =
      "block";

    photoPlaceholder.style.display =
      "none";
  } else {
    photoPreview.removeAttribute(
      "src"
    );

    photoPreview.style.display =
      "none";

    photoPlaceholder.style.display =
      "block";
  }

  updateAccountControls(
    student
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   RESET FORM
========================================================= */

function resetStudentForm() {
  editingStudent = null;

  studentForm.reset();

  editStudentDbId.value =
    "";

  formTitle.textContent =
    "Add Student";

  saveButton.textContent =
    "Save Student";

  photoPreview.removeAttribute(
    "src"
  );

  photoPreview.style.display =
    "none";

  photoPlaceholder.style.display =
    "block";

  accountStatus.textContent =
    "No Account";

  accountStatus.className =
    "status status-inactive";

  createAccountButton.style.display =
    "none";

  resetPasswordButton.style.display =
    "none";

  hideProgress();

  prepareNewStudentId();
}


resetFormButton.addEventListener(
  "click",
  () => {
    resetStudentForm();
  }
);


addStudentButton.addEventListener(
  "click",
  () => {
    resetStudentForm();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
);


/* =========================================================
   ACCOUNT CONTROLS
========================================================= */

function updateAccountControls(
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

  if (student.auth_user_id) {
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


/* =========================================================
   GET SUPER ADMIN SESSION
========================================================= */

async function getSuperAdminSession() {
  const {
    data,
    error
  } =
    await supabaseClient.auth
      .getSession();

  if (error) {
    throw new Error(
      "Could not read login session."
    );
  }

  if (
    !data ||
    !data.session ||
    !data.session.access_token
  ) {
    throw new Error(
      "Super Admin session not found. Please login again."
    );
  }

  return data.session;
}


/* =========================================================
   VERIFY SUPER ADMIN
========================================================= */

async function verifySuperAdmin() {
  const {
    data,
    error
  } =
    await supabaseClient.auth
      .getUser();

  if (error || !data.user) {
    throw new Error(
      "You are not logged in."
    );
  }

  const role =
    data.user.app_metadata?.role ||
    data.user.user_metadata?.role ||
    "";

  if (
    role !== "super_admin" &&
    role !== "superadmin"
  ) {
    throw new Error(
      "Super Admin access required."
    );
  }

  return data.user;
}


/* =========================================================
   EDGE FUNCTION CALL
========================================================= */

async function callStudentAccountFunction(
  body
) {
  const session =
    await getSuperAdminSession();

  /*
     We intentionally use fetch here
     so the Authorization header is
     completely visible and controlled.
  */

  const response =
    await fetch(
      `${SUPABASE_URL}/functions/v1/create-student-account`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "apikey":
            SUPABASE_ANON_KEY,

          "Authorization":
            `Bearer ${session.access_token}`
        },

        body:
          JSON.stringify(body)
      }
    );

  let result;

  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      "Edge Function returned an invalid JSON response."
    );
  }

  if (
    !response.ok ||
    !result.success
  ) {
    throw new Error(
      result.error ||
        "Student account operation failed."
    );
  }

  return result;
}


/* =========================================================
   CREATE STUDENT ACCOUNT
========================================================= */

async function createStudentAccount(
  id = null
) {
  try {
    await verifySuperAdmin();

    let student;

    if (id) {
      student =
        students.find(
          s =>
            String(s.id) ===
            String(id)
        );
    } else {
      student =
        editingStudent;
    }

    if (!student) {
      throw new Error(
        "Please select a student first."
      );
    }

    if (student.auth_user_id) {
      showMessage(
        "This student already has an account.",
        "warning"
      );

      return;
    }

    if (!student.email) {
      showMessage(
        "Student email is required before creating a login account.",
        "warning"
      );

      editStudent(
        student.id
      );

      emailInput.focus();

      return;
    }

    /*
       Generate password locally.
       It is sent only through HTTPS
       to the Edge Function.
    */

    const password =
      prompt(
        `Create password for ${student.full_name}\n\nMinimum 8 characters:`
      );

    if (password === null) {
      return;
    }

    if (
      password.length < 8
    ) {
      showMessage(
        "Password must contain at least 8 characters.",
        "warning"
      );

      return;
    }

    showProgress(
      25,
      "Verifying Super Admin..."
    );

    const result =
      await callStudentAccountFunction(
        {
          action: "create",

          student_id:
            student.student_id,

          student_db_id:
            student.id,

          email:
            student.email,

          password,

          full_name:
            student.full_name
        }
      );

    showProgress(
      100,
      "Account created successfully."
    );

    showMessage(
      `Student account created successfully for ${student.full_name}.`,
      "success"
    );

    /*
       Password is intentionally NOT
       displayed in the page after creation.
    */

    await loadStudents();

    const updated =
      students.find(
        s =>
          String(s.id) ===
          String(student.id)
      );

    if (updated) {
      editStudent(
        updated.id
      );
    }

  } catch (error) {
    console.error(
      "CREATE ACCOUNT ERROR:",
      error
    );

    showMessage(
      error.message ||
        "Could not create student account.",
      "error"
    );
  } finally {
    setTimeout(
      hideProgress,
      1500
    );
  }
}


/* =========================================================
   RESET PASSWORD
========================================================= */

async function resetStudentPassword(
  id = null
) {
  try {
    await verifySuperAdmin();

    const student =
      students.find(
        s =>
          String(s.id) ===
          String(id)
      );

    if (!student) {
      throw new Error(
        "Student not found."
      );
    }

    if (!student.auth_user_id) {
      throw new Error(
        "This student has no login account."
      );
    }

    const password =
      prompt(
        `Enter a NEW password for ${student.full_name}\n\nMinimum 8 characters:`
      );

    if (password === null) {
      return;
    }

    if (
      password.length < 8
    ) {
      showMessage(
        "Password must contain at least 8 characters.",
        "warning"
      );

      return;
    }

    showProgress(
      30,
      "Resetting password..."
    );

    await callStudentAccountFunction(
      {
        action:
          "reset_password",

        student_db_id:
          student.id,

        password
      }
    );

    showProgress(
      100,
      "Password reset successfully."
    );

    showMessage(
      `Password reset successfully for ${student.full_name}.`,
      "success"
    );

  } catch (error) {
    console.error(
      "RESET PASSWORD ERROR:",
      error
    );

    showMessage(
      error.message ||
        "Password reset failed.",
      "error"
    );
  } finally {
    setTimeout(
      hideProgress,
      1500
    );
  }
}


/* =========================================================
   VIEW STUDENT
========================================================= */

function viewStudent(id) {
  const student =
    students.find(
      s =>
        String(s.id) ===
        String(id)
    );

  if (!student) {
    showMessage(
      "Student not found.",
      "error"
    );

    return;
  }

  const institution =
    institutions.find(
      i =>
        String(i.id) ===
        String(
          student.institution_id
        )
    );

  const institutionName =
    institution?.name ||
    "—";

  profileContent.innerHTML = `
    <div class="profile-top">

      ${
        student.photo_url
          ? `
            <img
              class="profile-photo"
              src="${escapeHtml(
                student.photo_url
              )}"
              alt="Student"
            >
          `
          : `
            <div
              class="profile-photo"
              style="font-size:32px;"
            >
              ${getInitials(
                student.full_name
              )}
            </div>
          `
      }

      <div>

        <div class="profile-name">
          ${escapeHtml(
            student.full_name
          )}
        </div>

        <div class="profile-id">
          ${escapeHtml(
            student.student_id ||
            "—"
          )}
        </div>

        <div style="margin-top:8px;">
          ${statusBadge(
            student.status
          )}
        </div>

      </div>

    </div>

    <div class="profile-grid">

      <div class="profile-item">
        <strong>Institution</strong>
        <span>
          ${escapeHtml(
            institutionName
          )}
        </span>
      </div>

      <div class="profile-item">
        <strong>Student ID</strong>
        <span>
          ${escapeHtml(
            student.student_id ||
            "—"
          )}
        </span>
      </div>

      <div class="profile-item">
        <strong>Gender</strong>
        <span>
          ${escapeHtml(
            student.gender ||
            "—"
          )}
        </span>
      </div>

      <div class="profile-item">
        <strong>Date of Birth</strong>
        <span>
          ${formatDate(
            student.date_of_birth
          )}
        </span>
      </div>

      <div class="profile-item">
        <strong>Phone</strong>
        <span>
          ${escapeHtml(
            student.phone ||
            "—"
          )}
        </span>
      </div>

      <div class="profile-item">
        <strong>Email</strong>
        <span>
          ${escapeHtml(
            student.email ||
            "—"
          )}
        </span>
      </div>

      <div class="profile-item">
        <strong>Admission Date</strong>
        <span>
          ${formatDate(
            student.admission_date
          )}
        </span>
      </div>

      <div class="profile-item">
        <strong>Account</strong>
        <span>
          ${
            student.auth_user_id
              ? "Active"
              : "No Account"
          }
        </span>
      </div>

      <div
        class="profile-item"
        style="grid-column:1/-1;"
      >
        <strong>Address</strong>
        <span>
          ${escapeHtml(
            student.address ||
            "—"
          )}
        </span>
      </div>

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


/* =========================================================
   CLOSE PROFILE
========================================================= */

function closeProfile() {
  profileModal.classList.remove(
    "show"
  );

  profileModal.setAttribute(
    "aria-hidden",
    "true"
  );
}


closeProfileModal.addEventListener(
  "click",
  closeProfile
);


profileModal.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      profileModal
    ) {
      closeProfile();
    }
  }
);


/* =========================================================
   DELETE STUDENT
========================================================= */

async function deleteStudent(
  id
) {
  const student =
    students.find(
      s =>
        String(s.id) ===
        String(id)
    );

  if (!student) {
    showMessage(
      "Student not found.",
      "error"
    );

    return;
  }

  const confirmed =
    confirm(
      `Delete student "${student.full_name}" (${student.student_id})?\n\nThis action cannot be undone.`
    );

  if (!confirmed) {
    return;
  }

  try {
    await verifySuperAdmin();

    /*
       NOTE:
       Database RLS must permit the
       Super Admin to delete students.
    */

    const {
      error
    } =
      await supabaseClient
        .from("students")
        .delete()
        .eq(
          "id",
          student.id
        );

    if (error) {
      throw error;
    }

    showMessage(
      "Student deleted successfully.",
      "success"
    );

    await loadStudents();

    resetStudentForm();

  } catch (error) {
    console.error(
      "DELETE STUDENT ERROR:",
      error
    );

    showMessage(
      error.message ||
        "Could not delete student.",
      "error"
    );
  }
}


/* =========================================================
   PHOTO PREVIEW
========================================================= */

photoInput.addEventListener(
  "change",
  () => {
    const file =
      photoInput.files?.[0];

    if (!file) {
      photoPreview.removeAttribute(
        "src"
      );

      photoPreview.style.display =
        "none";

      photoPlaceholder.style.display =
        "block";

      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      showMessage(
        "Photo must be less than 10MB.",
        "warning"
      );

      photoInput.value = "";

      return;
    }

    const reader =
      new FileReader();

    reader.onload =
      (event) => {
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
);


/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener(
  "input",
  renderStudents
);


statusFilter.addEventListener(
  "change",
  renderStudents
);


/* =========================================================
   REFRESH
========================================================= */

refreshStudentsButton.addEventListener(
  "click",
  async () => {
    try {
      await loadInstitutions();

      await loadStudents();

      showMessage(
        "Student records refreshed.",
        "success"
      );

    } catch (error) {
      console.error(error);
    }
  }
);


/* =========================================================
   PROGRESS
========================================================= */

function showProgress(
  percent,
  text
) {
  progressWrap.style.display =
    "block";

  progressBar.style.width =
    `${percent}%`;

  progressText.textContent =
    text;
}


function hideProgress() {
  progressWrap.style.display =
    "none";

  progressBar.style.width =
    "0%";

  progressText.textContent =
    "";
}


/* =========================================================
   ACCOUNT BUTTONS
========================================================= */

createAccountButton.addEventListener(
  "click",
  () => {
    createStudentAccount();
  }
);


resetPasswordButton.addEventListener(
  "click",
  () => {
    resetStudentPassword(
      editStudentDbId.value
    );
  }
);


/* =========================================================
   AUTH STATE
========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {
    console.log(
      "AUTH EVENT:",
      event
    );

    if (!session) {
      showMessage(
        "Your login session has expired. Please login again.",
        "warning"
      );
    }
  }
);


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeStudentsPage() {
  try {
    clearMessage();

    /*
       Verify Super Admin before
       loading management data.
    */

    await verifySuperAdmin();

    await loadInstitutions();

    await loadStudents();

    await prepareNewStudentId();

  } catch (error) {
    console.error(
      "INITIALIZATION ERROR:",
      error
    );

    studentsTableBody.innerHTML =
      `<tr>
        <td
          colspan="10"
          class="empty"
        >
          Access denied or login session expired.
          <br>
          ${escapeHtml(
            error.message
          )}
        </td>
      </tr>`;

    showMessage(
      error.message ||
        "Unable to initialize Students page.",
      "error"
    );
  }
}


/* =========================================================
   START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    initializeStudentsPage();
  }
);
