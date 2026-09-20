/* =========================================================
   GAAWOW EMS
   STUDENTS MODULE V3.5 FINAL

   Database:
   - Supabase
   - students
   - profiles
   - institutions

   Storage:
   - student-photos

   IMPORTANT:
   - Matched with students.html V3.5
   - No duplicate initialization
   - DOM null-safe
   - Photo upload supported
   - Super Admin sees all institutions
   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const PHOTO_BUCKET =
  "student-photos";


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

if (!window.supabase) {
  console.error("Supabase library was not loaded.");
  throw new Error("Supabase library was not loaded.");
}

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;
let institutions = [];
let students = [];
let editingStudent = null;
let isSaving = false;


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(message, type = "info", duration = 5000) {

  const box = $("message");

  if (!box) {
    console.warn("Message element not found:", message);
    return;
  }

  box.className = "";
  box.textContent = message;

  if (type === "success") {
    box.classList.add("success");
  } else if (type === "error") {
    box.classList.add("error");
  } else {
    box.classList.add("info");
  }

  box.style.display = "block";

  if (duration > 0) {
    window.clearTimeout(showMessage.timer);

    showMessage.timer = window.setTimeout(() => {

      if (box) {
        box.style.display = "none";
        box.textContent = "";
        box.className = "";
      }

    }, duration);
  }
}


function clearMessage() {

  const box = $("message");

  if (!box) return;

  box.style.display = "none";
  box.textContent = "";
  box.className = "";
}


/* =========================================================
   ERROR HELPER
   ========================================================= */

function getErrorMessage(error) {

  if (!error) {
    return "Unknown error.";
  }

  if (typeof error === "string") {
    return error;
  }

  return (
    error.message ||
    error.error_description ||
    error.details ||
    error.hint ||
    "Unknown error."
  );
}


/* =========================================================
   SUPABASE CONNECTION CHECK
   ========================================================= */

async function checkSupabaseConnection() {

  try {

    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/settings`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_KEY
        }
      }
    );

    if (!response.ok) {

      console.warn(
        "Supabase connection check returned:",
        response.status
      );

      return false;
    }

    return true;

  } catch (error) {

    console.warn(
      "Supabase connection test failed:",
      error
    );

    return false;
  }
}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function loadCurrentUser() {

  const {
    data,
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data || !data.user) {
    throw new Error(
      "No authenticated user found. Please login again."
    );
  }

  currentUser = data.user;

  return currentUser;
}


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadCurrentProfile() {

  if (!currentUser) {
    throw new Error("User is not authenticated.");
  }

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select(`
      id,
      user_id,
      institution_id,
      full_name,
      role,
      is_active
    `)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Your profile was not found in the profiles table."
    );
  }

  if (data.is_active === false) {
    throw new Error(
      "Your account is inactive."
    );
  }

  currentProfile = data;

  return data;
}


/* =========================================================
   ROLE HELPERS
   ========================================================= */

function isSuperAdmin() {

  return (
    currentProfile &&
    currentProfile.role === "super_admin"
  );
}


function isSchoolAdmin() {

  return (
    currentProfile &&
    (
      currentProfile.role === "school_admin" ||
      currentProfile.role === "super_admin"
    )
  );
}


/* =========================================================
   LOAD INSTITUTIONS
   ========================================================= */

async function loadInstitutions() {

  let query = supabaseClient
    .from("institutions")
    .select(`
      id,
      name
    `)
    .order("name", {
      ascending: true
    });


  /*
   Super Admin:
   - sees all institutions

   Other users:
   - only own institution
  */

  if (!isSuperAdmin()) {

    if (!currentProfile.institution_id) {

      throw new Error(
        "Your profile does not have an institution assigned."
      );
    }

    query = query.eq(
      "id",
      currentProfile.institution_id
    );
  }


  const {
    data,
    error
  } = await query;

  if (error) {
    throw error;
  }

  institutions = data || [];

  renderInstitutionSelect();

  return institutions;
}


/* =========================================================
   RENDER INSTITUTION SELECT
   ========================================================= */

function renderInstitutionSelect() {

  const select = $("institutionSelect");

  if (!select) {
    console.error(
      "Missing DOM element: #institutionSelect"
    );
    return;
  }

  select.innerHTML = "";

  const placeholder =
    document.createElement("option");

  placeholder.value = "";
  placeholder.textContent =
    "Select Institution";

  select.appendChild(placeholder);


  institutions.forEach(institution => {

    const option =
      document.createElement("option");

    option.value = institution.id;

    option.textContent =
      institution.name || "Unnamed Institution";

    select.appendChild(option);
  });


  /*
   Non-super-admin:
   automatically select own institution
  */

  if (
    !isSuperAdmin() &&
    currentProfile &&
    currentProfile.institution_id
  ) {

    select.value =
      currentProfile.institution_id;

    select.disabled = true;

  } else {

    select.disabled = false;
  }
}


/* =========================================================
   LOAD STUDENTS
   ========================================================= */

async function loadStudents() {

  const body = $("studentsTableBody");

  if (body) {

    body.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="loading">
            Loading students...
          </div>
        </td>
      </tr>
    `;
  }


  let query = supabaseClient
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
    `)
    .order("created_at", {
      ascending: false
    });


  /*
   Super Admin:
   all students

   Other users:
   own institution
  */

  if (!isSuperAdmin()) {

    if (!currentProfile.institution_id) {

      throw new Error(
        "Your profile does not have an institution."
      );
    }

    query = query.eq(
      "institution_id",
      currentProfile.institution_id
    );
  }


  const {
    data,
    error
  } = await query;

  if (error) {
    throw error;
  }

  students = data || [];

  renderStats();
  renderStudents();

  return students;
}


/* =========================================================
   STATS
   ========================================================= */

function renderStats() {

  const total =
    students.length;

  const active =
    students.filter(
      s => s.status === "active"
    ).length;

  const graduated =
    students.filter(
      s => s.status === "graduated"
    ).length;

  const other =
    total - active - graduated;


  const totalEl =
    $("totalStudents");

  const activeEl =
    $("activeStudents");

  const graduatedEl =
    $("graduatedStudents");

  const otherEl =
    $("otherStudents");


  if (totalEl) {
    totalEl.textContent = total;
  }

  if (activeEl) {
    activeEl.textContent = active;
  }

  if (graduatedEl) {
    graduatedEl.textContent = graduated;
  }

  if (otherEl) {
    otherEl.textContent = other;
  }
}


/* =========================================================
   SEARCH / FILTER
   ========================================================= */

function getFilteredStudents() {

  const searchEl =
    $("searchInput");

  const statusEl =
    $("statusFilter");


  const search =
    searchEl
      ? searchEl.value.trim().toLowerCase()
      : "";

  const status =
    statusEl
      ? statusEl.value
      : "";


  return students.filter(student => {

    const matchesStatus =
      !status ||
      student.status === status;


    if (!search) {
      return matchesStatus;
    }


    const searchable = [
      student.student_id,
      student.full_name,
      student.gender,
      student.phone,
      student.email,
      student.address,
      student.status
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();


    return (
      matchesStatus &&
      searchable.includes(search)
    );
  });
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   INITIALS
   ========================================================= */

function getInitials(name) {

  if (!name) {
    return "?";
  }

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
   STATUS HTML
   ========================================================= */

function statusHtml(status) {

  const safeStatus =
    status || "inactive";

  const className =
    `status-${safeStatus}`;

  return `
    <span class="status ${className}">
      ${escapeHtml(safeStatus)}
    </span>
  `;
}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(dateValue) {

  if (!dateValue) {
    return "—";
  }

  try {

    const date =
      new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return escapeHtml(dateValue);
    }

    return date.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );

  } catch {
    return escapeHtml(dateValue);
  }
}


/* =========================================================
   RENDER STUDENTS
   ========================================================= */

function renderStudents() {

  const body =
    $("studentsTableBody");

  if (!body) {

    console.error(
      "CRITICAL: #studentsTableBody does not exist."
    );

    return;
  }


  const filtered =
    getFilteredStudents();


  if (!filtered.length) {

    body.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty">
            <strong>No students found</strong>
            Try changing your search or status filter.
          </div>
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML =
    filtered.map(student => {

      const photo =
        student.photo_url
          ? `
            <img
              class="student-photo"
              src="${escapeHtml(student.photo_url)}"
              alt="${escapeHtml(student.full_name)}"
              loading="lazy"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            />
            <div
              class="avatar"
              style="display:none"
            >
              ${escapeHtml(
                getInitials(student.full_name)
              )}
            </div>
          `
          : `
            <div class="avatar">
              ${escapeHtml(
                getInitials(student.full_name)
              )}
            </div>
          `;


      return `
        <tr>

          <td>
            ${photo}
          </td>

          <td>
            <strong>
              ${escapeHtml(student.student_id)}
            </strong>
          </td>

          <td>
            <strong>
              ${escapeHtml(student.full_name)}
            </strong>
          </td>

          <td>
            ${escapeHtml(student.gender || "—")}
          </td>

          <td>
            ${escapeHtml(student.phone || "—")}
          </td>

          <td>
            ${escapeHtml(student.email || "—")}
          </td>

          <td>
            ${statusHtml(student.status)}
          </td>

          <td>
            ${formatDate(student.admission_date)}
          </td>

          <td>

            <div class="actions">

              <button
                type="button"
                class="btn btn-small btn-primary"
                data-action="view"
                data-id="${escapeHtml(student.id)}"
              >
                View
              </button>

              <button
                type="button"
                class="btn btn-small btn-gold"
                data-action="edit"
                data-id="${escapeHtml(student.id)}"
              >
                Edit
              </button>

              <button
                type="button"
                class="btn btn-small btn-danger"
                data-action="delete"
                data-id="${escapeHtml(student.id)}"
              >
                Delete
              </button>

            </div>

          </td>

        </tr>
      `;

    }).join("");
}


/* =========================================================
   FORM DATA
   ========================================================= */

function getFormData() {

  const institutionSelect =
    $("institutionSelect");

  const studentId =
    $("studentId");

  const fullName =
    $("fullName");

  const gender =
    $("gender");

  const dateOfBirth =
    $("dateOfBirth");

  const phone =
    $("phone");

  const email =
    $("email");

  const address =
    $("address");

  const admissionDate =
    $("admissionDate");

  const status =
    $("status");


  return {

    institution_id:
      institutionSelect
        ? institutionSelect.value
        : "",

    student_id:
      studentId
        ? studentId.value.trim()
        : "",

    full_name:
      fullName
        ? fullName.value.trim()
        : "",

    gender:
      gender
        ? (gender.value || null)
        : null,

    date_of_birth:
      dateOfBirth
        ? (dateOfBirth.value || null)
        : null,

    phone:
      phone
        ? (phone.value.trim() || null)
        : null,

    email:
      email
        ? (email.value.trim() || null)
        : null,

    address:
      address
        ? (address.value.trim() || null)
        : null,

    admission_date:
      admissionDate
        ? (admissionDate.value || null)
        : null,

    status:
      status
        ? status.value
        : "active"
  };
}


/* =========================================================
   VALIDATE FORM
   ========================================================= */

function validateForm(data) {

  if (!data.institution_id) {
    throw new Error(
      "Please select an institution."
    );
  }

  if (!data.student_id) {
    throw new Error(
      "Student ID is required."
    );
  }

  if (!data.full_name) {
    throw new Error(
      "Student full name is required."
    );
  }

  if (!data.status) {
    throw new Error(
      "Student status is required."
    );
  }


  /*
   Non-super-admin cannot choose another institution
  */

  if (
    !isSuperAdmin() &&
    currentProfile &&
    currentProfile.institution_id !==
      data.institution_id
  ) {

    throw new Error(
      "You can only manage students in your own institution."
    );
  }
}


/* =========================================================
   PHOTO VALIDATION
   ========================================================= */

function validatePhoto(file) {

  if (!file) {
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];


  if (!allowedTypes.includes(file.type)) {

    throw new Error(
      "Photo must be JPG, PNG, or WEBP."
    );
  }


  const maxSize =
    5 * 1024 * 1024;


  if (file.size > maxSize) {

    throw new Error(
      "Photo must be smaller than 5MB."
    );
  }
}


/* =========================================================
   PHOTO PREVIEW
   ========================================================= */

function handlePhotoPreview() {

  const input =
    $("photoInput");

  const preview =
    $("photoPreview");

  const placeholder =
    $("photoPlaceholder");


  if (!input) return;


  const file =
    input.files &&
    input.files[0];


  if (!file) {

    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }

    if (placeholder) {
      placeholder.style.display = "flex";
    }

    return;
  }


  try {
    validatePhoto(file);
  } catch (error) {

    input.value = "";

    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }

    if (placeholder) {
      placeholder.style.display = "flex";
    }

    showMessage(
      getErrorMessage(error),
      "error"
    );

    return;
  }


  const reader =
    new FileReader();


  reader.onload = function(event) {

    if (preview) {

      preview.src =
        event.target.result;

      preview.style.display =
        "block";
    }

    if (placeholder) {
      placeholder.style.display =
        "none";
    }
  };


  reader.readAsDataURL(file);
}


/* =========================================================
   FILE EXTENSION
   ========================================================= */

function getFileExtension(file) {

  if (!file) {
    return "jpg";
  }

  const name =
    file.name || "";

  const parts =
    name.split(".");

  if (parts.length < 2) {
    return "jpg";
  }

  return parts[
    parts.length - 1
  ].toLowerCase();
}


/* =========================================================
   PROGRESS
   ========================================================= */

function setProgress(
  percent,
  text
) {

  const wrap =
    $("progressWrap");

  const bar =
    $("progressBar");

  const label =
    $("progressText");


  if (wrap) {
    wrap.style.display =
      "block";
  }

  if (bar) {
    bar.style.width =
      `${Math.max(
        0,
        Math.min(100, percent)
      )}%`;
  }

  if (label) {
    label.textContent =
      text || "Processing...";
  }
}


function hideProgress() {

  const wrap =
    $("progressWrap");

  if (wrap) {
    wrap.style.display =
      "none";
  }
}


/* =========================================================
   UPLOAD PHOTO
   ========================================================= */

async function uploadStudentPhoto(
  studentDbId,
  file
) {

  if (!studentDbId) {
    throw new Error(
      "Student database ID is missing."
    );
  }

  if (!file) {
    return null;
  }


  validatePhoto(file);


  const extension =
    getFileExtension(file);


  const uniqueName =
    `${Date.now()}-${crypto.randomUUID()}.${extension}`;


  const filePath =
    `students/${studentDbId}/${uniqueName}`;


  setProgress(
    10,
    "Uploading student photo..."
  );


  const {
    error
  } = await supabaseClient
    .storage
    .from(PHOTO_BUCKET)
    .upload(
      filePath,
      file,
      {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      }
    );


  if (error) {
    throw error;
  }


  setProgress(
    90,
    "Preparing photo URL..."
  );


  const {
    data
  } = supabaseClient
    .storage
    .from(PHOTO_BUCKET)
    .getPublicUrl(filePath);


  if (
    !data ||
    !data.publicUrl
  ) {

    throw new Error(
      "Photo uploaded, but public URL could not be created."
    );
  }


  setProgress(
    100,
    "Photo uploaded successfully."
  );


  return data.publicUrl;
}


/* =========================================================
   CREATE STUDENT
   ========================================================= */

async function createStudent(
  payload,
  photoFile
) {

  /*
   Generate UUID locally.

   This avoids depending on INSERT...RETURNING
   when RLS policies affect SELECT permissions.
  */

  const studentDbId =
    crypto.randomUUID();


  const insertPayload = {
    id: studentDbId,
    institution_id:
      payload.institution_id,
    student_id:
      payload.student_id,
    full_name:
      payload.full_name,
    gender:
      payload.gender,
    date_of_birth:
      payload.date_of_birth,
    phone:
      payload.phone,
    email:
      payload.email,
    address:
      payload.address,
    admission_date:
      payload.admission_date,
    status:
      payload.status
  };


  /*
   First save student.
  */

  const {
    error: insertError
  } = await supabaseClient
    .from("students")
    .insert(insertPayload);


  if (insertError) {
    throw insertError;
  }


  /*
   Photo is optional.

   Student remains saved even if
   photo upload fails.
  */

  if (photoFile) {

    try {

      const photoUrl =
        await uploadStudentPhoto(
          studentDbId,
          photoFile
        );


      const {
        error: photoUpdateError
      } = await supabaseClient
        .from("students")
        .update({
          photo_url: photoUrl,
          updated_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          studentDbId
        );


      if (photoUpdateError) {

        return {
          success: true,
          photoError:
            photoUpdateError,
          studentDbId
        };
      }


      return {
        success: true,
        photoUploaded: true,
        studentDbId
      };

    } catch (photoError) {

      return {
        success: true,
        photoError,
        studentDbId
      };
    }
  }


  return {
    success: true,
    photoUploaded: false,
    studentDbId
  };
}


/* =========================================================
   UPDATE STUDENT
   ========================================================= */

async function updateStudent(
  studentDbId,
  payload,
  photoFile
) {

  const updatePayload = {
    institution_id:
      payload.institution_id,
    student_id:
      payload.student_id,
    full_name:
      payload.full_name,
    gender:
      payload.gender,
    date_of_birth:
      payload.date_of_birth,
    phone:
      payload.phone,
    email:
      payload.email,
    address:
      payload.address,
    admission_date:
      payload.admission_date,
    status:
      payload.status,
    updated_at:
      new Date().toISOString()
  };


  const {
    error: updateError
  } = await supabaseClient
    .from("students")
    .update(updatePayload)
    .eq("id", studentDbId);


  if (updateError) {
    throw updateError;
  }


  /*
   If no new photo was selected,
   keep existing photo.
  */

  if (!photoFile) {

    return {
      success: true,
      photoUploaded: false
    };
  }


  /*
   Upload new photo.
  */

  try {

    const photoUrl =
      await uploadStudentPhoto(
        studentDbId,
        photoFile
      );


    const {
      error: photoUpdateError
    } = await supabaseClient
      .from("students")
      .update({
        photo_url: photoUrl,
        updated_at:
          new Date().toISOString()
      })
      .eq(
        "id",
        studentDbId
      );


    if (photoUpdateError) {

      return {
        success: true,
        photoError:
          photoUpdateError
      };
    }


    return {
      success: true,
      photoUploaded: true
    };

  } catch (photoError) {

    return {
      success: true,
      photoError
    };
  }
}


/* =========================================================
   SAVE FORM
   ========================================================= */

async function handleStudentSubmit(
  event
) {

  event.preventDefault();


  if (isSaving) {
    return;
  }


  isSaving = true;

  clearMessage();


  const saveButton =
    $("saveButton");


  if (saveButton) {

    saveButton.disabled =
      true;

    saveButton.textContent =
      editingStudent
        ? "UPDATING..."
        : "SAVING...";
  }


  try {

    const payload =
      getFormData();


    validateForm(payload);


    const photoInput =
      $("photoInput");


    const photoFile =
      photoInput &&
      photoInput.files &&
      photoInput.files[0]
        ? photoInput.files[0]
        : null;


    if (photoFile) {
      validatePhoto(photoFile);
    }


    /*
     EDIT
    */

    if (editingStudent) {

      const result =
        await updateStudent(
          editingStudent.id,
          payload,
          photoFile
        );


      if (
        result &&
        result.photoError
      ) {

        showMessage(
          "STUDENT DATA UPDATED. Photo upload failed: " +
          getErrorMessage(
            result.photoError
          ),
          "error",
          9000
        );

      } else {

        showMessage(
          "STUDENT DATA UPDATED SUCCESSFULLY.",
          "success"
        );
      }

    }

    /*
     CREATE
    */

    else {

      const result =
        await createStudent(
          payload,
          photoFile
        );


      if (
        result &&
        result.photoError
      ) {

        showMessage(
          "STUDENT SAVED SUCCESSFULLY. Photo upload failed: " +
          getErrorMessage(
            result.photoError
          ),
          "error",
          9000
        );

      } else {

        showMessage(
          photoFile
            ? "STUDENT SAVED SUCCESSFULLY. Photo uploaded successfully."
            : "STUDENT SAVED SUCCESSFULLY.",
          "success"
        );
      }
    }


    /*
     Refresh table.
    */

    await loadStudents();


    /*
     Reset form.
    */

    resetStudentForm();


  } catch (error) {

    console.error(
      "Student save error:",
      error
    );

    showMessage(
      getErrorMessage(error),
      "error",
      9000
    );

  } finally {

    isSaving = false;

    hideProgress();

    if (saveButton) {

      saveButton.disabled =
        false;

      saveButton.textContent =
        "SAVE STUDENT";
    }
  }
}


/* =========================================================
   RESET FORM
   ========================================================= */

function resetStudentForm() {

  editingStudent = null;


  const form =
    $("studentForm");

  if (form) {
    form.reset();
  }


  const editId =
    $("editStudentDbId");

  if (editId) {
    editId.value = "";
  }


  const formTitle =
    $("formTitle");

  if (formTitle) {
    formTitle.textContent =
      "Add New Student";
  }


  const saveButton =
    $("saveButton");

  if (saveButton) {
    saveButton.textContent =
      "SAVE STUDENT";
  }


  const preview =
    $("photoPreview");

  if (preview) {
    preview.src = "";
    preview.style.display =
      "none";
  }


  const placeholder =
    $("photoPlaceholder");

  if (placeholder) {
    placeholder.style.display =
      "flex";
  }


  const photoInput =
    $("photoInput");

  if (photoInput) {
    photoInput.value = "";
  }


  hideProgress();


  /*
   Restore own institution
   for non-super-admin.
  */

  const institutionSelect =
    $("institutionSelect");


  if (
    institutionSelect &&
    !isSuperAdmin() &&
    currentProfile &&
    currentProfile.institution_id
  ) {

    institutionSelect.value =
      currentProfile.institution_id;
  }


  /*
   Default status.
  */

  const status =
    $("status");

  if (status) {
    status.value = "active";
  }


  /*
   Default admission date = today
   only if empty.
  */

  const admissionDate =
    $("admissionDate");


  if (
    admissionDate &&
    !admissionDate.value
  ) {

    admissionDate.value =
      new Date()
        .toISOString()
        .split("T")[0];
  }
}


/* =========================================================
   EDIT STUDENT
   ========================================================= */

function editStudent(studentDbId) {

  const student =
    students.find(
      s => s.id === studentDbId
    );


  if (!student) {

    showMessage(
      "Student record was not found.",
      "error"
    );

    return;
  }


  editingStudent =
    student;


  const editId =
    $("editStudentDbId");

  if (editId) {
    editId.value =
      student.id;
  }


  const institution =
    $("institutionSelect");

  if (institution) {
    institution.value =
      student.institution_id || "";
  }


  const fields = {

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
      student.status || "active"
  };


  Object.entries(fields)
    .forEach(([id, value]) => {

      const element =
        $(id);

      if (element) {
        element.value =
          value;
      }
    });


  /*
   Existing photo preview
  */

  const preview =
    $("photoPreview");

  const placeholder =
    $("photoPlaceholder");


  if (
    preview &&
    student.photo_url
  ) {

    preview.src =
      student.photo_url;

    preview.style.display =
      "block";

    if (placeholder) {
      placeholder.style.display =
        "none";
    }

  } else {

    if (preview) {
      preview.src = "";
      preview.style.display =
        "none";
    }

    if (placeholder) {
      placeholder.style.display =
        "flex";
    }
  }


  const formTitle =
    $("formTitle");

  if (formTitle) {
    formTitle.textContent =
      "Edit Student";
  }


  const saveButton =
    $("saveButton");

  if (saveButton) {
    saveButton.textContent =
      "UPDATE STUDENT";
  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   VIEW STUDENT
   ========================================================= */

function viewStudent(studentDbId) {

  const student =
    students.find(
      s => s.id === studentDbId
    );


  if (!student) {

    showMessage(
      "Student record was not found.",
      "error"
    );

    return;
  }


  const modal =
    $("profileModal");

  const content =
    $("profileContent");


  if (!modal || !content) {

    console.error(
      "Profile modal DOM elements are missing."
    );

    return;
  }


  const institution =
    institutions.find(
      i =>
        i.id ===
        student.institution_id
    );


  const photoHtml =
    student.photo_url
      ? `
        <img
          class="profile-photo"
          src="${escapeHtml(student.photo_url)}"
          alt="${escapeHtml(student.full_name)}"
        />
      `
      : `
        <div
          class="profile-photo"
          style="
            display:flex;
            align-items:center;
            justify-content:center;
            background:#0B1E63;
            color:white;
            font-weight:800;
            font-size:25px;
          "
        >
          ${escapeHtml(
            getInitials(student.full_name)
          )}
        </div>
      `;


  content.innerHTML = `

    <div class="profile-top">

      ${photoHtml}

      <div>

        <div class="profile-name">
          ${escapeHtml(
            student.full_name
          )}
        </div>

        <div class="profile-id">
          Student ID:
          <strong>
            ${escapeHtml(
              student.student_id
            )}
          </strong>
        </div>

      </div>

    </div>


    <div class="profile-grid">

      <div class="profile-item">
        <small>Institution</small>
        <strong>
          ${escapeHtml(
            institution
              ? institution.name
              : "—"
          )}
        </strong>
      </div>

      <div class="profile-item">
        <small>Status</small>
        <strong>
          ${statusHtml(
            student.status
          )}
        </strong>
      </div>

      <div class="profile-item">
        <small>Gender</small>
        <strong>
          ${escapeHtml(
            student.gender || "—"
          )}
        </strong>
      </div>

      <div class="profile-item">
        <small>Date of Birth</small>
        <strong>
          ${formatDate(
            student.date_of_birth
          )}
        </strong>
      </div>

      <div class="profile-item">
        <small>Phone</small>
        <strong>
          ${escapeHtml(
            student.phone || "—"
          )}
        </strong>
      </div>

      <div class="profile-item">
        <small>Email</small>
        <strong>
          ${escapeHtml(
            student.email || "—"
          )}
        </strong>
      </div>

      <div class="profile-item">
        <small>Admission Date</small>
        <strong>
          ${formatDate(
            student.admission_date
          )}
        </strong>
      </div>

      <div class="profile-item">
        <small>Created</small>
        <strong>
          ${formatDate(
            student.created_at
          )}
        </strong>
      </div>

      <div class="profile-item">
        <small>Emergency Contact</small>
        <strong>
          ${escapeHtml(
            student.emergency_contact_name ||
            "—"
          )}
        </strong>
      </div>

      <div class="profile-item">
        <small>Emergency Phone</small>
        <strong>
          ${escapeHtml(
            student.emergency_contact_phone ||
            "—"
          )}
        </strong>
      </div>

      <div
        class="profile-item"
        style="grid-column:1/-1"
      >
        <small>Address</small>
        <strong>
          ${escapeHtml(
            student.address || "—"
          )}
        </strong>
      </div>

    </div>
  `;


  modal.classList.add("show");
  modal.setAttribute(
    "aria-hidden",
    "false"
  );
}


/* =========================================================
   CLOSE PROFILE MODAL
   ========================================================= */

function closeProfileModal() {

  const modal =
    $("profileModal");

  if (!modal) return;

  modal.classList.remove("show");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );
}


/* =========================================================
   DELETE STUDENT
   ========================================================= */

async function deleteStudent(studentDbId) {

  const student =
    students.find(
      s => s.id === studentDbId
    );


  if (!student) {

    showMessage(
      "Student record was not found.",
      "error"
    );

    return;
  }


  const confirmed =
    window.confirm(
      `Are you sure you want to delete "${student.full_name}"?\n\nThis action cannot be undone.`
    );


  if (!confirmed) {
    return;
  }


  try {

    showMessage(
      "Deleting student...",
      "info",
      0
    );


    const {
      error
    } = await supabaseClient
      .from("students")
      .delete()
      .eq("id", studentDbId);


    if (error) {
      throw error;
    }


    await loadStudents();


    showMessage(
      "STUDENT DELETED SUCCESSFULLY.",
      "success"
    );


  } catch (error) {

    console.error(
      "Delete student error:",
      error
    );

    showMessage(
      "Delete failed: " +
      getErrorMessage(error),
      "error",
      9000
    );
  }
}


/* =========================================================
   TABLE ACTION HANDLER
   ========================================================= */

function handleTableClick(event) {

  const button =
    event.target.closest(
      "button[data-action]"
    );


  if (!button) {
    return;
  }


  const action =
    button.dataset.action;

  const id =
    button.dataset.id;


  if (!id) {
    return;
  }


  if (action === "view") {

    viewStudent(id);

  } else if (action === "edit") {

    editStudent(id);

  } else if (action === "delete") {

    deleteStudent(id);
  }
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

  const form =
    $("studentForm");

  if (form) {

    form.addEventListener(
      "submit",
      handleStudentSubmit
    );
  }


  const resetButton =
    $("resetFormButton");

  if (resetButton) {

    resetButton.addEventListener(
      "click",
      resetStudentForm
    );
  }


  const addButton =
    $("addStudentButton");

  if (addButton) {

    addButton.addEventListener(
      "click",
      () => {

        resetStudentForm();

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
    );
  }


  const photoInput =
    $("photoInput");

  if (photoInput) {

    photoInput.addEventListener(
      "change",
      handlePhotoPreview
    );
  }


  const searchInput =
    $("searchInput");

  if (searchInput) {

    searchInput.addEventListener(
      "input",
      renderStudents
    );
  }


  const statusFilter =
    $("statusFilter");

  if (statusFilter) {

    statusFilter.addEventListener(
      "change",
      renderStudents
    );
  }


  const tableBody =
    $("studentsTableBody");

  if (tableBody) {

    tableBody.addEventListener(
      "click",
      handleTableClick
    );
  }


  const closeModal =
    $("closeProfileModal");

  if (closeModal) {

    closeModal.addEventListener(
      "click",
      closeProfileModal
    );
  }


  const modal =
    $("profileModal");

  if (modal) {

    modal.addEventListener(
      "click",
      event => {

        if (
          event.target === modal
        ) {
          closeProfileModal();
        }
      }
    );
  }


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape"
      ) {
        closeProfileModal();
      }
    }
  );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initStudentsPage() {

  console.log(
    "GAAWOW EMS Students V3.5 starting..."
  );


  try {

    /*
     Basic DOM verification
    */

    const requiredIds = [
      "message",
      "totalStudents",
      "activeStudents",
      "graduatedStudents",
      "otherStudents",
      "studentForm",
      "institutionSelect",
      "studentId",
      "fullName",
      "studentsTableBody"
    ];


    const missingIds =
      requiredIds.filter(
        id => !$(id)
      );


    if (missingIds.length) {

      console.error(
        "Missing DOM elements:",
        missingIds
      );

      throw new Error(
        "Students page HTML is incomplete. Missing: " +
        missingIds.join(", ")
      );
    }


    /*
     Test connection
    */

    const connected =
      await checkSupabaseConnection();


    if (!connected) {

      console.warn(
        "Supabase connection test failed, continuing with auth."
      );
    }


    /*
     Authentication
    */

    await loadCurrentUser();


    /*
     Profile
    */

    await loadCurrentProfile();


    console.log(
      "Logged user:",
      currentUser.email
    );

    console.log(
      "Profile:",
      currentProfile
    );


    /*
     Event listeners
    */

    setupEventListeners();


    /*
     Institutions
    */

    await loadInstitutions();


    /*
     Students
    */

    await loadStudents();


    /*
     Form defaults
    */

    resetStudentForm();


    console.log(
      "GAAWOW EMS Students V3.5 loaded successfully."
    );


  } catch (error) {

    console.error(
      "Students initialization failed:",
      error
    );


    showMessage(
      "Students module error: " +
      getErrorMessage(error),
      "error",
      0
    );
  }
}


/* =========================================================
   START ONLY AFTER DOM READY
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initStudentsPage,
    {
      once: true
    }
  );

} else {

  initStudentsPage();
}


/* =========================================================
   OPTIONAL GLOBAL FUNCTIONS
   Useful if another existing dashboard/page
   calls these names.
   ========================================================= */

window.viewStudent =
  viewStudent;

window.editStudent =
  editStudent;

window.deleteStudent =
  deleteStudent;

window.closeProfileModal =
  closeProfileModal;

window.resetStudentForm =
  resetStudentForm;
