/* =========================================================
   GAAWOW EMS
   STUDENTS MODULE V3.3 FINAL
   ---------------------------------------------------------
   - Supabase connection diagnostics
   - Authentication check
   - Role / institution handling
   - Students CRUD
   - Search + status filter
   - Student photo upload
   - Photo preview
   - Safe error handling
   - Cache-busting friendly
   ---------------------------------------------------------
   Database:
   students
   profiles
   institutions

   Storage:
   student-photos
   ========================================================= */

"use strict";

/* =========================================================
   1. SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const PHOTO_BUCKET = "student-photos";


/* =========================================================
   2. SUPABASE CLIENT CHECK
   ========================================================= */

if (!window.supabase) {
  throw new Error(
    "Supabase library lama soo degin. Hubi supabase-js CDN-ka students.html."
  );
}

if (!window.supabase.createClient) {
  throw new Error(
    "Supabase createClient lama helin. Hubi nooca supabase-js."
  );
}

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* =========================================================
   3. STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let students = [];
let institutions = [];

let editingStudent = null;
let selectedPhotoFile = null;

let isInitialized = false;
let isLoadingStudents = false;
let isSaving = false;


/* =========================================================
   4. DOM HELPER
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


/* =========================================================
   5. HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   6. MESSAGE
   ========================================================= */

function showMessage(message, type = "info") {
  const box = $("message");

  if (!box) return;

  box.textContent = message;

  box.style.display = "block";

  box.style.padding = "12px";
  box.style.marginBottom = "15px";
  box.style.borderRadius = "8px";

  if (type === "success") {
    box.style.background = "#dcfce7";
    box.style.color = "#166534";
  } else if (type === "error") {
    box.style.background = "#fee2e2";
    box.style.color = "#991b1b";
  } else if (type === "warning") {
    box.style.background = "#fef3c7";
    box.style.color = "#92400e";
  } else {
    box.style.background = "#dbeafe";
    box.style.color = "#1e3a8a";
  }
}


function clearMessage() {
  const box = $("message");

  if (!box) return;

  box.textContent = "";
  box.style.display = "none";
}


/* =========================================================
   7. ERROR MESSAGE
   ========================================================= */

function getErrorMessage(error) {
  if (!error) return "Unknown error";

  if (typeof error === "string") {
    return error;
  }

  return (
    error.message ||
    error.error_description ||
    error.details ||
    error.hint ||
    "Unknown Supabase error"
  );
}


/* =========================================================
   8. LOADING
   ========================================================= */

function setLoading(active, text = "Loading...") {
  const button = $("saveButton");

  if (button) {
    button.disabled = active;
    button.textContent = active ? text : "Save Student";
  }
}


/* =========================================================
   9. ROLE HELPERS
   ========================================================= */

function isSuperAdmin() {
  return currentProfile?.role === "super_admin";
}


function isInstitutionAdmin() {
  return (
    currentProfile?.role === "school_admin" ||
    currentProfile?.role === "teacher"
  );
}


/* =========================================================
   10. STEP 1
   SUPABASE CONNECTION TEST
   ========================================================= */

async function testSupabaseConnection() {

  console.log("STEP 1: SUPABASE CONNECTION");

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

    const responseText = await response.text();

    console.log(
      "Supabase connection status:",
      response.status
    );

    if (!response.ok) {

      let detail = responseText;

      try {
        const json = JSON.parse(responseText);

        detail =
          json.message ||
          json.error_description ||
          json.error ||
          responseText;

      } catch (_) {}

      throw new Error(
        `Supabase connection failed (${response.status}): ${detail}`
      );
    }

    console.log("Supabase connection: OK");

    return true;

  } catch (error) {

    console.error(
      "SUPABASE CONNECTION ERROR:",
      error
    );

    throw new Error(
      `Supabase Connection Error: ${getErrorMessage(error)}`
    );
  }
}


/* =========================================================
   11. STEP 2
   AUTHENTICATION
   ========================================================= */

async function getCurrentUser() {

  console.log("STEP 2: AUTHENTICATION");

  try {

    const {
      data,
      error
    } = await supabaseClient.auth.getUser();

    if (error) {
      throw error;
    }

    if (!data?.user) {

      throw new Error(
        "No authenticated user found. Please login again."
      );
    }

    currentUser = data.user;

    console.log(
      "Authenticated user:",
      currentUser.id
    );

    return currentUser;

  } catch (error) {

    console.error(
      "AUTH ERROR:",
      error
    );

    throw new Error(
      `Authentication error: ${getErrorMessage(error)}`
    );
  }
}


/* =========================================================
   12. STEP 3
   LOAD PROFILE
   ========================================================= */

async function loadCurrentProfile(userId) {

  console.log("STEP 3: PROFILE");

  try {

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
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {

      throw new Error(
        "Profile not found for this account."
      );
    }

    currentProfile = data;

    console.log(
      "Profile:",
      currentProfile
    );

    if (currentProfile.is_active === false) {

      throw new Error(
        "Your account is inactive."
      );
    }

    return currentProfile;

  } catch (error) {

    console.error(
      "PROFILE ERROR:",
      error
    );

    throw new Error(
      `Profile error: ${getErrorMessage(error)}`
    );
  }
}


/* =========================================================
   13. STEP 4
   LOAD INSTITUTIONS
   ========================================================= */

async function loadInstitutions() {

  console.log("STEP 4: INSTITUTIONS");

  try {

    let query = supabaseClient
      .from("institutions")
      .select(`
        id,
        name
      `)
      .order("name", {
        ascending: true
      });

    if (!isSuperAdmin()) {

      if (!currentProfile?.institution_id) {

        throw new Error(
          "Your account is not linked to an institution."
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

    console.log(
      "Institutions loaded:",
      institutions.length
    );

  } catch (error) {

    console.error(
      "INSTITUTIONS ERROR:",
      error
    );

    throw new Error(
      `Institutions error: ${getErrorMessage(error)}`
    );
  }
}


/* =========================================================
   14. INSTITUTION SELECT
   ========================================================= */

function renderInstitutionSelect() {

  const select = $("institutionSelect");

  if (!select) return;

  select.innerHTML = "";

  if (institutions.length === 0) {

    select.innerHTML =
      `<option value="">No institution found</option>`;

    return;
  }

  institutions.forEach(institution => {

    const option =
      document.createElement("option");

    option.value = institution.id;
    option.textContent = institution.name;

    select.appendChild(option);
  });

  if (!isSuperAdmin()) {

    select.value =
      currentProfile.institution_id;

    select.disabled = true;

  } else {

    select.disabled = false;
  }
}


/* =========================================================
   15. STEP 5
   FETCH STUDENTS
   ========================================================= */

async function fetchStudents() {

  console.log("STEP 5: STUDENTS");

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

  if (!isSuperAdmin()) {

    if (!currentProfile?.institution_id) {

      throw new Error(
        "Institution ID is missing from your profile."
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

  console.log(
    "Students loaded:",
    students.length
  );

  return students;
}


/* =========================================================
   16. LOAD STUDENTS
   ========================================================= */

async function loadStudents() {

  if (isLoadingStudents) return;

  isLoadingStudents = true;

  try {

    setTableLoading();

    await fetchStudents();

    updateStatistics();

    renderStudents();

  } catch (error) {

    console.error(
      "STUDENTS ERROR:",
      error
    );

    setTableError(
      getErrorMessage(error)
    );

  } finally {

    isLoadingStudents = false;
  }
}


/* =========================================================
   17. TABLE LOADING
   ========================================================= */

function setTableLoading() {

  const body = $("studentsTableBody");

  if (!body) return;

  body.innerHTML = `
    <tr>
      <td colspan="10" style="text-align:center;padding:25px;">
        Loading students...
      </td>
    </tr>
  `;
}


function setTableError(message) {

  const body = $("studentsTableBody");

  if (!body) return;

  body.innerHTML = `
    <tr>
      <td colspan="10"
          style="text-align:center;padding:25px;color:#b91c1c;">
        ${escapeHTML(message)}
        <br><br>
        <button onclick="loadStudents()">
          Retry
        </button>
      </td>
    </tr>
  `;
}


function setEmpty() {

  const body = $("studentsTableBody");

  if (!body) return;

  body.innerHTML = `
    <tr>
      <td colspan="10"
          style="text-align:center;padding:25px;">
        No students found.
      </td>
    </tr>
  `;
}


/* =========================================================
   18. STATISTICS
   ========================================================= */

function updateStatistics() {

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

  if ($("totalStudents")) {
    $("totalStudents").textContent = total;
  }

  if ($("activeStudents")) {
    $("activeStudents").textContent = active;
  }

  if ($("graduatedStudents")) {
    $("graduatedStudents").textContent =
      graduated;
  }

  if ($("otherStudents")) {
    $("otherStudents").textContent =
      other;
  }
}


/* =========================================================
   19. FILTER
   ========================================================= */

function getFilteredStudents() {

  const search =
    ($("searchInput")?.value || "")
      .trim()
      .toLowerCase();

  const status =
    $("statusFilter")?.value || "";

  return students.filter(student => {

    const matchesSearch =
      !search ||
      String(student.student_id || "")
        .toLowerCase()
        .includes(search) ||
      String(student.full_name || "")
        .toLowerCase()
        .includes(search) ||
      String(student.phone || "")
        .toLowerCase()
        .includes(search) ||
      String(student.email || "")
        .toLowerCase()
        .includes(search);

    const matchesStatus =
      !status ||
      student.status === status;

    return (
      matchesSearch &&
      matchesStatus
    );
  });
}


/* =========================================================
   20. RENDER STUDENTS
   ========================================================= */

function renderStudents() {

  const body =
    $("studentsTableBody");

  if (!body) return;

  const filtered =
    getFilteredStudents();

  if (filtered.length === 0) {

    setEmpty();

    return;
  }

  body.innerHTML =
    filtered.map(student => {

      const photo =
        student.photo_url
          ? `
            <img
              src="${escapeHTML(student.photo_url)}"
              alt="Student"
              style="
                width:42px;
                height:42px;
                object-fit:cover;
                border-radius:50%;
              "
            >
          `
          : `
            <div style="
              width:42px;
              height:42px;
              border-radius:50%;
              background:#e5e7eb;
              display:flex;
              align-items:center;
              justify-content:center;
              font-size:18px;
            ">
              👤
            </div>
          `;

      return `
        <tr>

          <td>
            ${photo}
          </td>

          <td>
            ${escapeHTML(student.student_id)}
          </td>

          <td>
            ${escapeHTML(student.full_name)}
          </td>

          <td>
            ${escapeHTML(student.gender || "-")}
          </td>

          <td>
            ${escapeHTML(student.phone || "-")}
          </td>

          <td>
            ${escapeHTML(student.email || "-")}
          </td>

          <td>
            ${escapeHTML(student.status || "-")}
          </td>

          <td>
            ${student.admission_date
              ? escapeHTML(student.admission_date)
              : "-"
            }
          </td>

          <td>
            <button
              type="button"
              onclick="viewStudent('${student.id}')">
              View
            </button>

            <button
              type="button"
              onclick="editStudent('${student.id}')">
              Edit
            </button>

            ${
              isSuperAdmin() || isInstitutionAdmin()
                ? `
                  <button
                    type="button"
                    onclick="deleteStudent('${student.id}')">
                    Delete
                  </button>
                `
                : ""
            }
          </td>

        </tr>
      `;

    }).join("");
}


/* =========================================================
   21. PHOTO VALIDATION
   ========================================================= */

function validatePhoto(file) {

  if (!file) return true;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {

    showMessage(
      "Photo-ga waa inuu noqdaa JPG, PNG ama WEBP.",
      "error"
    );

    return false;
  }

  const maxSize =
    5 * 1024 * 1024;

  if (file.size > maxSize) {

    showMessage(
      "Photo-ga kama weynaan karo 5MB.",
      "error"
    );

    return false;
  }

  return true;
}


/* =========================================================
   22. PHOTO PREVIEW
   ========================================================= */

function handlePhotoPreview() {

  const input =
    $("photoInput");

  const preview =
    $("photoPreview");

  if (!input || !preview) return;

  const file =
    input.files?.[0];

  selectedPhotoFile =
    file || null;

  if (!file) {

    preview.src = "";
    preview.style.display = "none";

    return;
  }

  if (!validatePhoto(file)) {

    input.value = "";
    selectedPhotoFile = null;

    return;
  }

  const reader =
    new FileReader();

  reader.onload = function(event) {

    preview.src =
      event.target.result;

    preview.style.display =
      "block";
  };

  reader.readAsDataURL(file);
}


/* =========================================================
   23. PHOTO UPLOAD
   ========================================================= */

async function uploadStudentPhoto(
  file,
  databaseId
) {

  if (!file) {
    return null;
  }

  if (!databaseId) {

    throw new Error(
      "Student database ID is missing."
    );
  }

  if (!validatePhoto(file)) {

    throw new Error(
      "Invalid student photo."
    );
  }

  console.log(
    "PHOTO UPLOAD START:",
    databaseId
  );

  const extension =
    file.name.includes(".")
      ? file.name
          .split(".")
          .pop()
          .toLowerCase()
      : "jpg";

  const uniqueName =
    `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const filePath =
    `students/${databaseId}/${uniqueName}`;

  const {
    error: uploadError
  } = await supabaseClient
    .storage
    .from(PHOTO_BUCKET)
    .upload(
      filePath,
      file,
      {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      }
    );

  if (uploadError) {

    console.error(
      "PHOTO STORAGE ERROR:",
      uploadError
    );

    throw new Error(
      `Photo upload failed: ${getErrorMessage(uploadError)}`
    );
  }

  const {
    data
  } = supabaseClient
    .storage
    .from(PHOTO_BUCKET)
    .getPublicUrl(filePath);

  const publicUrl =
    data?.publicUrl;

  if (!publicUrl) {

    throw new Error(
      "Photo uploaded, but public URL could not be generated."
    );
  }

  console.log(
    "PHOTO UPLOAD SUCCESS:",
    publicUrl
  );

  return publicUrl;
}


/* =========================================================
   24. RESET FORM
   ========================================================= */

function resetStudentForm() {

  const form =
    $("studentForm");

  if (form) {
    form.reset();
  }

  if ($("editStudentDbId")) {
    $("editStudentDbId").value = "";
  }

  editingStudent = null;
  selectedPhotoFile = null;

  if ($("formTitle")) {
    $("formTitle").textContent =
      "Add Student";
  }

  if ($("photoPreview")) {

    $("photoPreview").src = "";
    $("photoPreview").style.display =
      "none";
  }

  if ($("institutionSelect")) {

    if (!isSuperAdmin() &&
        currentProfile?.institution_id) {

      $("institutionSelect").value =
        currentProfile.institution_id;

    }
  }

  clearMessage();
}


/* =========================================================
   25. EDIT STUDENT
   ========================================================= */

window.editStudent = function(studentDbId) {

  const student =
    students.find(
      s => s.id === studentDbId
    );

  if (!student) {

    showMessage(
      "Student-ka lama helin.",
      "error"
    );

    return;
  }

  editingStudent = student;

  if ($("editStudentDbId")) {
    $("editStudentDbId").value =
      student.id;
  }

  if ($("institutionSelect")) {
    $("institutionSelect").value =
      student.institution_id || "";
  }

  if ($("studentId")) {
    $("studentId").value =
      student.student_id || "";
  }

  if ($("fullName")) {
    $("fullName").value =
      student.full_name || "";
  }

  if ($("gender")) {
    $("gender").value =
      student.gender || "";
  }

  if ($("dateOfBirth")) {
    $("dateOfBirth").value =
      student.date_of_birth || "";
  }

  if ($("phone")) {
    $("phone").value =
      student.phone || "";
  }

  if ($("email")) {
    $("email").value =
      student.email || "";
  }

  if ($("admissionDate")) {
    $("admissionDate").value =
      student.admission_date || "";
  }

  if ($("address")) {
    $("address").value =
      student.address || "";
  }

  if ($("status")) {
    $("status").value =
      student.status || "active";
  }

  selectedPhotoFile = null;

  if ($("photoInput")) {
    $("photoInput").value = "";
  }

  if ($("photoPreview")) {

    if (student.photo_url) {

      $("photoPreview").src =
        student.photo_url;

      $("photoPreview").style.display =
        "block";

    } else {

      $("photoPreview").src = "";
      $("photoPreview").style.display =
        "none";
    }
  }

  if ($("formTitle")) {
    $("formTitle").textContent =
      "Edit Student";
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};


/* =========================================================
   26. VIEW STUDENT
   ========================================================= */

window.viewStudent = function(studentDbId) {

  const student =
    students.find(
      s => s.id === studentDbId
    );

  if (!student) {

    showMessage(
      "Student-ka lama helin.",
      "error"
    );

    return;
  }

  const modal =
    $("profileModal");

  const content =
    $("profileContent");

  if (!modal || !content) return;

  content.innerHTML = `

    <div style="text-align:center;margin-bottom:20px;">

      ${
        student.photo_url
          ? `
            <img
              src="${escapeHTML(student.photo_url)}"
              style="
                width:120px;
                height:120px;
                object-fit:cover;
                border-radius:50%;
              "
            >
          `
          : `
            <div style="
              width:120px;
              height:120px;
              border-radius:50%;
              margin:auto;
              background:#e5e7eb;
              display:flex;
              align-items:center;
              justify-content:center;
              font-size:45px;
            ">
              👤
            </div>
          `
      }

      <h2>
        ${escapeHTML(student.full_name)}
      </h2>

      <p>
        ${escapeHTML(student.student_id)}
      </p>

    </div>

    <p>
      <strong>Gender:</strong>
      ${escapeHTML(student.gender || "-")}
    </p>

    <p>
      <strong>Date of Birth:</strong>
      ${escapeHTML(student.date_of_birth || "-")}
    </p>

    <p>
      <strong>Phone:</strong>
      ${escapeHTML(student.phone || "-")}
    </p>

    <p>
      <strong>Email:</strong>
      ${escapeHTML(student.email || "-")}
    </p>

    <p>
      <strong>Address:</strong>
      ${escapeHTML(student.address || "-")}
    </p>

    <p>
      <strong>Admission Date:</strong>
      ${escapeHTML(student.admission_date || "-")}
    </p>

    <p>
      <strong>Status:</strong>
      ${escapeHTML(student.status || "-")}
    </p>

    <p>
      <strong>Emergency Contact:</strong>
      ${escapeHTML(student.emergency_contact_name || "-")}
    </p>

    <p>
      <strong>Emergency Phone:</strong>
      ${escapeHTML(student.emergency_contact_phone || "-")}
    </p>

  `;

  modal.style.display = "flex";
};


/* =========================================================
   27. CLOSE MODAL
   ========================================================= */

function closeProfileModal() {

  const modal =
    $("profileModal");

  if (modal) {
    modal.style.display = "none";
  }
}


/* =========================================================
   28. SAVE STUDENT
   ========================================================= */

async function saveStudent(event) {

  event.preventDefault();

  if (isSaving) return;

  clearMessage();

  isSaving = true;

  setLoading(
    true,
    editingStudent
      ? "Updating..."
      : "Saving..."
  );

  try {

    /* -----------------------------------------------------
       VALIDATION
       ----------------------------------------------------- */

    const institutionId =
      $("institutionSelect")?.value;

    const studentId =
      $("studentId")?.value.trim();

    const fullName =
      $("fullName")?.value.trim();

    if (!institutionId) {

      throw new Error(
        "Please select an institution."
      );
    }

    if (!studentId) {

      throw new Error(
        "Student ID is required."
      );
    }

    if (!fullName) {

      throw new Error(
        "Full name is required."
      );
    }

    if (
      !isSuperAdmin() &&
      institutionId !== currentProfile.institution_id
    ) {

      throw new Error(
        "You cannot save a student outside your institution."
      );
    }

    /* -----------------------------------------------------
       PHOTO
       ----------------------------------------------------- */

    const photoFile =
      selectedPhotoFile ||
      $("photoInput")?.files?.[0] ||
      null;

    if (
      photoFile &&
      !validatePhoto(photoFile)
    ) {

      throw new Error(
        "Please select a valid photo."
      );
    }

    /* -----------------------------------------------------
       PAYLOAD
       ----------------------------------------------------- */

    const payload = {

      institution_id:
        institutionId,

      student_id:
        studentId,

      full_name:
        fullName,

      gender:
        $("gender")?.value || null,

      date_of_birth:
        $("dateOfBirth")?.value || null,

      phone:
        $("phone")?.value.trim() || null,

      email:
        $("email")?.value.trim() || null,

      address:
        $("address")?.value.trim() || null,

      admission_date:
        $("admissionDate")?.value || null,

      status:
        $("status")?.value || "active",

      updated_at:
        new Date().toISOString()
    };


    /* =====================================================
       UPDATE
       ===================================================== */

    if (editingStudent) {

      console.log(
        "UPDATING STUDENT:",
        editingStudent.id
      );

      const {
        data,
        error
      } = await supabaseClient
        .from("students")
        .update(payload)
        .eq("id", editingStudent.id)
        .select(`
          id,
          institution_id,
          student_id,
          full_name,
          photo_url
        `)
        .single();

      if (error) {
        throw error;
      }

      console.log(
        "STUDENT UPDATED:",
        data
      );

      /* ---------------------------------------------------
         PHOTO UPDATE
         --------------------------------------------------- */

      if (photoFile) {

        showMessage(
          "Student updated. Uploading new photo...",
          "info"
        );

        const photoUrl =
          await uploadStudentPhoto(
            photoFile,
            editingStudent.id
          );

        const {
          error: photoDbError
        } = await supabaseClient
          .from("students")
          .update({
            photo_url: photoUrl,
            updated_at:
              new Date().toISOString()
          })
          .eq(
            "id",
            editingStudent.id
          );

        if (photoDbError) {
          throw photoDbError;
        }
      }

      showMessage(
        photoFile
          ? "STUDENT DATA UPDATED. Photo-ga cusubna waa la kaydiyey."
          : "STUDENT DATA UPDATED.",
        "success"
      );

    }


    /* =====================================================
       INSERT
       ===================================================== */

    else {

      console.log(
        "CREATING STUDENT"
      );

      const {
        data,
        error
      } = await supabaseClient
        .from("students")
        .insert(payload)
        .select(`
          id,
          institution_id,
          student_id,
          full_name,
          photo_url
        `)
        .single();

      if (error) {
        throw error;
      }

      console.log(
        "STUDENT CREATED:",
        data
      );

      /* ---------------------------------------------------
         PHOTO UPLOAD
         --------------------------------------------------- */

      if (photoFile) {

        showMessage(
          "STUDENT SAVED SUCCESSFULLY. Uploading photo...",
          "info"
        );

        const photoUrl =
          await uploadStudentPhoto(
            photoFile,
            data.id
          );

        const {
          error: photoDbError
        } = await supabaseClient
          .from("students")
          .update({
            photo_url: photoUrl,
            updated_at:
              new Date().toISOString()
          })
          .eq(
            "id",
            data.id
          );

        if (photoDbError) {
          throw photoDbError;
        }

        showMessage(
          "STUDENT SAVED SUCCESSFULLY. Photo-gana waa la kaydiyey.",
          "success"
        );

      } else {

        showMessage(
          "STUDENT SAVED SUCCESSFULLY.",
          "success"
        );
      }
    }


    /* =====================================================
       RESET + RELOAD
       ===================================================== */

    resetStudentForm();

    await loadStudents();

  } catch (error) {

    console.error(
      "SAVE STUDENT ERROR:",
      error
    );

    showMessage(
      getErrorMessage(error),
      "error"
    );

  } finally {

    isSaving = false;

    setLoading(
      false
    );
  }
}


/* =========================================================
   29. DELETE STUDENT
   ========================================================= */

window.deleteStudent = async function(studentDbId) {

  const student =
    students.find(
      s => s.id === studentDbId
    );

  if (!student) {

    showMessage(
      "Student-ka lama helin.",
      "error"
    );

    return;
  }

  const confirmed =
    confirm(
      `Delete student "${student.full_name}"?`
    );

  if (!confirmed) return;

  try {

    showMessage(
      "Deleting student...",
      "info"
    );

    const {
      error
    } = await supabaseClient
      .from("students")
      .delete()
      .eq(
        "id",
        studentDbId
      );

    if (error) {
      throw error;
    }

    showMessage(
      "STUDENT DELETED SUCCESSFULLY.",
      "success"
    );

    await loadStudents();

  } catch (error) {

    console.error(
      "DELETE STUDENT ERROR:",
      error
    );

    showMessage(
      `Delete failed: ${getErrorMessage(error)}`,
      "error"
    );
  }
};


/* =========================================================
   30. EVENTS
   ========================================================= */

function setupEvents() {

  console.log(
    "Setting up Students events..."
  );

  const form =
    $("studentForm");

  if (form &&
      !form.dataset.studentsEvents) {

    form.addEventListener(
      "submit",
      saveStudent
    );

    form.dataset.studentsEvents =
      "true";
  }


  const photoInput =
    $("photoInput");

  if (
    photoInput &&
    !photoInput.dataset.studentsEvents
  ) {

    photoInput.addEventListener(
      "change",
      handlePhotoPreview
    );

    photoInput.dataset.studentsEvents =
      "true";
  }


  const searchInput =
    $("searchInput");

  if (
    searchInput &&
    !searchInput.dataset.studentsEvents
  ) {

    searchInput.addEventListener(
      "input",
      renderStudents
    );

    searchInput.dataset.studentsEvents =
      "true";
  }


  const statusFilter =
    $("statusFilter");

  if (
    statusFilter &&
    !statusFilter.dataset.studentsEvents
  ) {

    statusFilter.addEventListener(
      "change",
      renderStudents
    );

    statusFilter.dataset.studentsEvents =
      "true";
  }


  const closeButtons =
    document.querySelectorAll(
      "[data-close-profile-modal]"
    );

  closeButtons.forEach(button => {

    if (button.dataset.studentsEvents) {
      return;
    }

    button.addEventListener(
      "click",
      closeProfileModal
    );

    button.dataset.studentsEvents =
      "true";
  });


  window.addEventListener(
    "click",
    event => {

      const modal =
        $("profileModal");

      if (
        modal &&
        event.target === modal
      ) {

        closeProfileModal();
      }
    }
  );
}


/* =========================================================
   31. RESET BUTTON
   ========================================================= */

function setupResetButton() {

  const buttons =
    document.querySelectorAll(
      "[data-reset-student-form]"
    );

  buttons.forEach(button => {

    if (button.dataset.studentsReset) {
      return;
    }

    button.addEventListener(
      "click",
      resetStudentForm
    );

    button.dataset.studentsReset =
      "true";
  });
}


/* =========================================================
   32. GLOBAL FUNCTIONS
   ========================================================= */

window.loadStudents =
  loadStudents;

window.resetStudentForm =
  resetStudentForm;

window.closeProfileModal =
  closeProfileModal;

window.saveStudent =
  saveStudent;


/* =========================================================
   33. INITIALIZATION
   ========================================================= */

async function initializeStudentsPage() {

  if (isInitialized) {

    console.warn(
      "Students page already initialized."
    );

    return;
  }

  isInitialized = true;

  console.log(
    "========================================"
  );

  console.log(
    "GAAWOW EMS STUDENTS V3.3"
  );

  console.log(
    "Initialization started..."
  );

  console.log(
    "========================================"
  );


  try {

    clearMessage();

    /* -----------------------------------------------------
       STEP 1
       ----------------------------------------------------- */

    showMessage(
      "Connecting to Supabase...",
      "info"
    );

    await testSupabaseConnection();


    /* -----------------------------------------------------
       STEP 2
       ----------------------------------------------------- */

    showMessage(
      "Checking authentication...",
      "info"
    );

    await getCurrentUser();


    /* -----------------------------------------------------
       STEP 3
       ----------------------------------------------------- */

    showMessage(
      "Loading profile...",
      "info"
    );

    await loadCurrentProfile(
      currentUser.id
    );


    /* -----------------------------------------------------
       STEP 4
       ----------------------------------------------------- */

    showMessage(
      "Loading institutions...",
      "info"
    );

    await loadInstitutions();


    /* -----------------------------------------------------
       EVENTS
       ----------------------------------------------------- */

    setupEvents();

    setupResetButton();


    /* -----------------------------------------------------
       STEP 5
       ----------------------------------------------------- */

    showMessage(
      "Loading students...",
      "info"
    );

    await loadStudents();


    /* -----------------------------------------------------
       SUCCESS
       ----------------------------------------------------- */

    showMessage(
      "Students module loaded successfully.",
      "success"
    );

    console.log(
      "Students module READY."
    );

  } catch (error) {

    console.error(
      "STUDENTS INITIALIZATION FAILED:",
      error
    );

    showMessage(
      getErrorMessage(error),
      "error"
    );

  }
}


/* =========================================================
   34. START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeStudentsPage,
    {
      once: true
    }
  );

} else {

  initializeStudentsPage();
}


/* =========================================================
   END
   ========================================================= */
