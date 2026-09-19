/* =========================================================
   GAAWOW EMS
   STUDENTS MODULE V3.1
   FULL REPLACEMENT
   DATABASE + STORAGE SAFE

   Tables:
   - students
   - institutions
   - profiles

   Storage:
   - student-photos

   Features:
   - Add Student
   - Edit Student
   - Delete Student
   - View Student
   - Search
   - Status Filter
   - Institution Scope
   - Photo Upload
   - Photo URL Update
   - Super Admin = all institutions
   - Other roles = own institution
   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const STORAGE_BUCKET =
  "student-photos";

const MAX_PHOTO_SIZE =
  5 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];


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

let currentUser = null;
let currentProfile = null;

let students = [];
let institutions = [];

let selectedPhotoFile = null;
let editingStudent = null;

let isSaving = false;
let isInitialized = false;


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


/* =========================================================
   SAFE HTML
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
   ERROR HELPER
   ========================================================= */

function getErrorMessage(error) {

  if (!error) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  return (
    error.message ||
    error.details ||
    error.hint ||
    error.code ||
    "Unknown Supabase error"
  );
}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
  message,
  type = "info"
) {

  const box = $("message");

  if (!box) {
    return;
  }

  box.className =
    "message " + type;

  box.textContent =
    message;

  box.style.display =
    "block";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function clearMessage() {

  const box = $("message");

  if (!box) {
    return;
  }

  box.textContent = "";

  box.className =
    "message";

  box.style.display =
    "none";
}


/* =========================================================
   DATE
   ========================================================= */

function todayISO() {

  const d =
    new Date();

  const month =
    String(
      d.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      d.getDate()
    ).padStart(2, "0");

  return (
    `${d.getFullYear()}-${month}-${day}`
  );
}


/* =========================================================
   STATUS
   ========================================================= */

const VALID_STATUSES = [
  "active",
  "inactive",
  "graduated",
  "suspended",
  "withdrawn"
];


function normalizeStatus(status) {

  return VALID_STATUSES.includes(
    String(status || "").toLowerCase()
  )
    ? String(status).toLowerCase()
    : "active";
}


function statusClass(status) {

  return (
    "status status-" +
    normalizeStatus(status)
  );
}


/* =========================================================
   DEFAULT AVATAR
   ========================================================= */

function defaultAvatar(
  name = "Student"
) {

  const initials =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        x => x.charAt(0)
      )
      .join("")
      .toUpperCase();

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 200 200"
    >

      <rect
        width="200"
        height="200"
        fill="#0B1E63"
      />

      <circle
        cx="100"
        cy="78"
        r="38"
        fill="#D4AF37"
      />

      <path
        d="
          M40 180
          C45 130 75 115 100 115
          C125 115 155 130 160 180
          Z
        "
        fill="#D4AF37"
      />

      <text
        x="100"
        y="195"
        text-anchor="middle"
        font-family="Arial"
        font-size="12"
        fill="white"
      >
        ${escapeHtml(initials)}
      </text>

    </svg>
  `;

  return (
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(svg)
  );
}


/* =========================================================
   INSTITUTION NAME
   ========================================================= */

function getInstitutionName(id) {

  const institution =
    institutions.find(
      item =>
        String(item.id) ===
        String(id)
    );

  return institution
    ? institution.name
    : "Unknown Institution";
}


/* =========================================================
   PERMISSION
   ========================================================= */

function isSuperAdmin() {

  return (
    currentProfile?.role ===
    "super_admin"
  );
}


function canDelete() {

  return [
    "super_admin",
    "school_admin"
  ].includes(
    currentProfile?.role
  );
}


function canManageInstitution(
  institutionId
) {

  if (!currentProfile) {
    return false;
  }

  if (isSuperAdmin()) {
    return true;
  }

  return (
    String(
      currentProfile.institution_id
    ) ===
    String(institutionId)
  );
}


/* =========================================================
   AUTH
   ========================================================= */

async function checkAuth() {

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();

  if (error) {

    showMessage(
      "Authentication error:\n" +
      getErrorMessage(error),
      "error"
    );

    return false;
  }

  if (
    !data ||
    !data.session
  ) {

    showMessage(
      "You are not logged in.\nPlease login to GAAWOW EMS first.",
      "error"
    );

    setTimeout(
      () => {
        window.location.href =
          "index.html";
      },
      1500
    );

    return false;
  }

  currentUser =
    data.session.user;

  return true;
}


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadCurrentProfile() {

  const {
    data,
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

    showMessage(
      "Profile-ka lama akhrin karin.\n\n" +
      getErrorMessage(error),
      "error"
    );

    return false;
  }

  if (!data) {

    showMessage(
      "Profile-ka user-kan lama helin.\n\n" +
      "User ID: " +
      currentUser.id,
      "error"
    );

    return false;
  }

  currentProfile =
    data;

  if (
    data.is_active === false
  ) {

    showMessage(
      "Account-kan waa inactive.",
      "error"
    );

    return false;
  }

  return true;
}


/* =========================================================
   LOAD INSTITUTIONS
   ========================================================= */

async function loadInstitutions() {

  const select =
    $("institutionSelect");

  if (!select) {
    return false;
  }

  select.innerHTML =
    `<option value="">Loading...</option>`;

  let query =
    supabaseClient
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

  if (!isSuperAdmin()) {

    if (
      !currentProfile.institution_id
    ) {

      select.innerHTML =
        `<option value="">No institution assigned</option>`;

      showMessage(
        "User-ka institution looma qoondeyn.",
        "error"
      );

      return false;
    }

    query =
      query.eq(
        "id",
        currentProfile.institution_id
      );
  }

  const {
    data,
    error
  } =
    await query;

  if (error) {

    select.innerHTML =
      `<option value="">Unable to load</option>`;

    showMessage(
      "Institutions lama soo qaadi karin.\n\n" +
      getErrorMessage(error),
      "error"
    );

    return false;
  }

  institutions =
    data || [];

  select.innerHTML =
    `<option value="">Select Institution</option>`;

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

      select.appendChild(
        option
      );
    }
  );

  if (
    !isSuperAdmin() &&
    currentProfile.institution_id
  ) {

    select.value =
      currentProfile.institution_id;

    select.disabled =
      true;

  } else {

    select.disabled =
      false;
  }

  return true;
}


/* =========================================================
   LOAD STUDENTS
   ========================================================= */

async function loadStudents() {

  const tbody =
    $("studentsTableBody");

  if (tbody) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="loading">
          Loading students...
        </td>
      </tr>
    `;
  }

  let query =
    supabaseClient
      .from("students")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (!isSuperAdmin()) {

    if (
      !currentProfile.institution_id
    ) {

      showMessage(
        "Institution ID lama helin.",
        "error"
      );

      return false;
    }

    query =
      query.eq(
        "institution_id",
        currentProfile.institution_id
      );
  }

  const {
    data,
    error
  } =
    await query;

  if (error) {

    if (tbody) {

      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty">
            Unable to load students.
          </td>
        </tr>
      `;
    }

    showMessage(
      "Students lama soo qaadi karin.\n\n" +
      getErrorMessage(error),
      "error"
    );

    return false;
  }

  students =
    data || [];

  renderStudents();
  updateStats();

  return true;
}


/* =========================================================
   STATS
   ========================================================= */

function updateStats() {

  const total =
    students.length;

  const active =
    students.filter(
      student =>
        normalizeStatus(
          student.status
        ) === "active"
    ).length;

  const graduated =
    students.filter(
      student =>
        normalizeStatus(
          student.status
        ) === "graduated"
    ).length;

  const other =
    Math.max(
      0,
      total -
      active -
      graduated
    );

  const totalEl =
    $("totalStudents");

  const activeEl =
    $("activeStudents");

  const graduatedEl =
    $("graduatedStudents");

  const otherEl =
    $("otherStudents");

  if (totalEl) {
    totalEl.textContent =
      total;
  }

  if (activeEl) {
    activeEl.textContent =
      active;
  }

  if (graduatedEl) {
    graduatedEl.textContent =
      graduated;
  }

  if (otherEl) {
    otherEl.textContent =
      other;
  }
}


/* =========================================================
   SEARCH + FILTER
   ========================================================= */

function renderStudents() {

  const tbody =
    $("studentsTableBody");

  if (!tbody) {
    return;
  }

  const search =
    (
      $("searchInput")?.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const statusFilter =
    $("statusFilter")?.value ||
    "";

  const filtered =
    students.filter(
      student => {

        const searchable = [
          student.student_id,
          student.full_name,
          student.phone,
          student.email,
          student.gender,
          getInstitutionName(
            student.institution_id
          )
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
          !statusFilter ||
          normalizeStatus(
            student.status
          ) ===
          statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );

  if (!filtered.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          No students found.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    filtered
      .map(studentRow)
      .join("");
}


/* =========================================================
   STUDENT ROW
   ========================================================= */

function studentRow(student) {

  const photo =
    student.photo_url ||
    defaultAvatar(
      student.full_name
    );

  const status =
    normalizeStatus(
      student.status
    );

  return `
    <tr>

      <td>
        <img
          class="student-photo"
          src="${escapeHtml(photo)}"
          alt="Student"
          onerror="this.src='${defaultAvatar(student.full_name)}'"
        >
      </td>

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
        ${escapeHtml(
          getInstitutionName(
            student.institution_id
          )
        )}
      </td>

      <td>
        <span class="${statusClass(status)}">
          ${escapeHtml(status)}
        </span>
      </td>

      <td>

        <div class="table-actions">

          <button
            type="button"
            class="btn-primary small-btn"
            onclick="viewStudent('${escapeHtml(student.id)}')"
          >
            View
          </button>

          <button
            type="button"
            class="btn-success small-btn"
            onclick="editStudent('${escapeHtml(student.id)}')"
          >
            Edit
          </button>

          ${
            canDelete()
              ? `
                <button
                  type="button"
                  class="btn-danger small-btn"
                  onclick="deleteStudent('${escapeHtml(student.id)}')"
                >
                  Delete
                </button>
              `
              : ""
          }

        </div>

      </td>

    </tr>
  `;
}


/* =========================================================
   PHOTO PREVIEW
   ========================================================= */

function setPhotoPreview(
  url,
  name = "Student"
) {

  const preview =
    $("photoPreview");

  if (!preview) {
    return;
  }

  preview.src =
    url ||
    defaultAvatar(name);
}


/* =========================================================
   PHOTO SELECTION
   ========================================================= */

function handlePhotoSelection(
  event
) {

  const input =
    event.target;

  const file =
    input.files?.[0] ||
    null;

  selectedPhotoFile =
    null;

  if (!file) {

    setPhotoPreview(
      editingStudent?.photo_url,
      editingStudent?.full_name ||
      $("fullName")?.value ||
      "Student"
    );

    return;
  }

  if (
    file.size >
    MAX_PHOTO_SIZE
  ) {

    showMessage(
      "Photo-ga waa inuu ka yar yahay 5MB.",
      "error"
    );

    input.value =
      "";

    setPhotoPreview(
      editingStudent?.photo_url,
      editingStudent?.full_name ||
      $("fullName")?.value ||
      "Student"
    );

    return;
  }

  if (
    !ALLOWED_PHOTO_TYPES.includes(
      file.type
    )
  ) {

    showMessage(
      "Photo-ga waa inuu noqdaa JPG, PNG ama WEBP.",
      "error"
    );

    input.value =
      "";

    setPhotoPreview(
      editingStudent?.photo_url,
      editingStudent?.full_name ||
      $("fullName")?.value ||
      "Student"
    );

    return;
  }

  selectedPhotoFile =
    file;

  const reader =
    new FileReader();

  reader.onload =
    function(e) {

      setPhotoPreview(
        e.target.result,
        $("fullName")?.value ||
        "Student"
      );
    };

  reader.onerror =
    function() {

      selectedPhotoFile =
        null;

      showMessage(
        "Photo preview lama akhrin karin.",
        "error"
      );
    };

  reader.readAsDataURL(
    file
  );
}


/* =========================================================
   PROGRESS
   ========================================================= */

function showProgress(
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
        Math.min(
          100,
          percent
        )
      )}%`;
  }

  if (label) {
    label.textContent =
      text || "Uploading...";
  }
}


function hideProgress() {

  const wrap =
    $("progressWrap");

  if (wrap) {
    wrap.style.display =
      "none";
  }

  const bar =
    $("progressBar");

  if (bar) {
    bar.style.width =
      "0%";
  }

  const label =
    $("progressText");

  if (label) {
    label.textContent =
      "Uploading...";
  }
}


/* =========================================================
   UPLOAD STUDENT PHOTO
   ========================================================= */

async function uploadStudentPhoto(
  file,
  studentDbId,
  studentId
) {

  if (!file) {
    return null;
  }

  if (!studentDbId) {

    throw new Error(
      "Student database ID lama helin."
    );
  }

  if (
    file.size >
    MAX_PHOTO_SIZE
  ) {

    throw new Error(
      "Photo-ga waa inuu ka yar yahay 5MB."
    );
  }

  if (
    !ALLOWED_PHOTO_TYPES.includes(
      file.type
    )
  ) {

    throw new Error(
      "Photo-ga waa inuu noqdaa JPG, PNG ama WEBP."
    );
  }

  const extensionMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  const extension =
    extensionMap[file.type] ||
    "jpg";

  const safeDbId =
    String(studentDbId)
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      );

  const safeStudentId =
    String(
      studentId || "student"
    )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      );

  const uniqueName =
    `${safeStudentId}-${Date.now()}.${extension}`;

  /*
    DB UUID ayaa path-ka saldhig looga dhigay.
    Tani waxay ka hortagaysaa isku dhaca
    Student IDs.
  */

  const filePath =
    `students/${safeDbId}/${uniqueName}`;

  showProgress(
    15,
    "Preparing photo upload..."
  );

  const {
    error: uploadError
  } =
    await supabaseClient.storage
      .from(
        STORAGE_BUCKET
      )
      .upload(
        filePath,
        file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType:
            file.type
        }
      );

  if (uploadError) {

    showProgress(
      0,
      "Upload failed"
    );

    throw new Error(
      "Photo upload failed: " +
      getErrorMessage(
        uploadError
      )
    );
  }

  showProgress(
    75,
    "Photo uploaded. Creating URL..."
  );

  const {
    data: publicData
  } =
    supabaseClient.storage
      .from(
        STORAGE_BUCKET
      )
      .getPublicUrl(
        filePath
      );

  const publicUrl =
    publicData?.publicUrl ||
    null;

  if (!publicUrl) {

    throw new Error(
      "Photo waa la upload-gareeyay laakiin public URL lama helin."
    );
  }

  showProgress(
    100,
    "Photo uploaded successfully"
  );

  return {
    publicUrl,
    filePath
  };
}


/* =========================================================
   DUPLICATE STUDENT ID
   ========================================================= */

async function checkDuplicateStudentId(
  studentId,
  institutionId,
  editingId = null
) {

  let query =
    supabaseClient
      .from("students")
      .select(
        "id, student_id, institution_id"
      )
      .eq(
        "student_id",
        studentId
      )
      .eq(
        "institution_id",
        institutionId
      );

  if (editingId) {

    query =
      query.neq(
        "id",
        editingId
      );
  }

  const {
    data,
    error
  } =
    await query;

  if (error) {

    throw new Error(
      "Student ID lama hubin karin:\n" +
      getErrorMessage(error)
    );
  }

  return (
    Array.isArray(data) &&
    data.length > 0
  );
}


/* =========================================================
   FORM DATA
   ========================================================= */

function readStudentForm() {

  const institutionId =
    $("institutionSelect")?.value.trim() ||
    "";

  const studentId =
    $("studentId")?.value.trim() ||
    "";

  const fullName =
    $("fullName")?.value.trim() ||
    "";

  const gender =
    $("gender")?.value ||
    null;

  const dateOfBirth =
    $("dateOfBirth")?.value ||
    null;

  const phone =
    $("phone")?.value.trim() ||
    null;

  const email =
    $("email")?.value.trim() ||
    null;

  const address =
    $("address")?.value.trim() ||
    null;

  const admissionDate =
    $("admissionDate")?.value ||
    todayISO();

  const status =
    normalizeStatus(
      $("status")?.value
    );

  const editingId =
    $("editStudentDbId")?.value.trim() ||
    null;

  return {
    institutionId,
    studentId,
    fullName,
    gender,
    dateOfBirth,
    phone,
    email,
    address,
    admissionDate,
    status,
    editingId
  };
}


/* =========================================================
   VALIDATE FORM
   ========================================================= */

function validateStudentForm(
  formData
) {

  if (
    !formData.institutionId
  ) {

    throw new Error(
      "Fadlan dooro Institution."
    );
  }

  if (
    !formData.studentId
  ) {

    throw new Error(
      "Student ID waa qasab."
    );
  }

  if (
    !formData.fullName
  ) {

    throw new Error(
      "Full Name waa qasab."
    );
  }

  if (
    !canManageInstitution(
      formData.institutionId
    )
  ) {

    throw new Error(
      "Ma lihid permission aad student uga sameyso ama uga maamusho institution-kan."
    );
  }
}


/* =========================================================
   BUILD PAYLOAD
   ========================================================= */

function buildStudentPayload(
  formData
) {

  return {

    institution_id:
      formData.institutionId,

    student_id:
      formData.studentId,

    full_name:
      formData.fullName,

    gender:
      formData.gender,

    date_of_birth:
      formData.dateOfBirth,

    phone:
      formData.phone,

    email:
      formData.email,

    address:
      formData.address,

    admission_date:
      formData.admissionDate,

    status:
      formData.status,

    updated_at:
      new Date().toISOString()
  };
}


/* =========================================================
   SAVE STUDENT
   ========================================================= */

async function saveStudent(
  event
) {

  if (event) {
    event.preventDefault();
  }

  if (isSaving) {
    return;
  }

  clearMessage();

  const saveButton =
    $("saveButton");

  try {

    isSaving =
      true;

    if (saveButton) {

      saveButton.disabled =
        true;

      saveButton.textContent =
        "Saving...";
    }

    /*
      AUTH
    */

    if (!currentUser) {

      const authenticated =
        await checkAuth();

      if (!authenticated) {
        return;
      }
    }

    /*
      PROFILE
    */

    if (!currentProfile) {

      const profileLoaded =
        await loadCurrentProfile();

      if (!profileLoaded) {
        return;
      }
    }

    /*
      FORM
    */

    const formData =
      readStudentForm();

    validateStudentForm(
      formData
    );

    /*
      DUPLICATE
    */

    showMessage(
      "Checking Student ID...",
      "info"
    );

    const duplicate =
      await checkDuplicateStudentId(
        formData.studentId,
        formData.institutionId,
        formData.editingId
      );

    if (duplicate) {

      throw new Error(
        `Student ID "${formData.studentId}" hore ayaa institution-kan loogu isticmaalay. Fadlan isticmaal ID kale.`
      );
    }

    const payload =
      buildStudentPayload(
        formData
      );


    /* =====================================================
       CREATE
       ===================================================== */

    if (!formData.editingId) {

      showMessage(
        "Saving student to database...",
        "info"
      );

      const {
        data: insertedStudent,
        error: insertError
      } =
        await supabaseClient
          .from("students")
          .insert([
            payload
          ])
          .select(
            "id, student_id, institution_id, full_name, photo_url"
          )
          .single();

      if (insertError) {

        throw new Error(
          "Student database save failed:\n\n" +
          getErrorMessage(
            insertError
          )
        );
      }

      if (!insertedStudent) {

        throw new Error(
          "Student waa la insert-gareeyay laakiin record-ka lama soo celin."
        );
      }


      /* =================================================
         PHOTO AFTER DB INSERT
         ================================================= */

      if (selectedPhotoFile) {

        try {

          showMessage(
            "STUDENT SAVED SUCCESSFULLY.\n\n" +
            "Photo-ga hadda ayaa Storage loo upload-gareynayaa...",
            "info"
          );

          const uploaded =
            await uploadStudentPhoto(
              selectedPhotoFile,
              insertedStudent.id,
              insertedStudent.student_id
            );

          /*
            IMPORTANT:
            Update using exact DB UUID.
          */

          const {
            error:
              photoDbError
          } =
            await supabaseClient
              .from("students")
              .update({
                photo_url:
                  uploaded.publicUrl,

                updated_at:
                  new Date().toISOString()
              })
              .eq(
                "id",
                insertedStudent.id
              );

          if (photoDbError) {

            throw new Error(
              "Photo waa la upload-gareeyay laakiin photo_url lama kaydin:\n" +
              getErrorMessage(
                photoDbError
              )
            );
          }

          showMessage(
            "STUDENT SAVED SUCCESSFULLY.\n\n" +
            "Photo + photo_url si guul leh ayaa loo kaydiyay.",
            "success"
          );

        } catch (photoError) {

          /*
            IMPORTANT:
            Student remains in database.
          */

          console.error(
            "CREATE PHOTO ERROR:",
            photoError
          );

          showMessage(
            "STUDENT SAVED SUCCESSFULLY.\n\n" +
            "Laakiin Photo-ga lama kaydin.\n\n" +
            getErrorMessage(
              photoError
            ),
            "error"
          );

          resetForm();

          await loadStudents();

          return;
        }

      } else {

        showMessage(
          "Student si guul leh ayaa loo daray.",
          "success"
        );
      }
    }


    /* =====================================================
       UPDATE
       ===================================================== */

    else {

      showMessage(
        "Updating student...",
        "info"
      );

      /*
        First get existing student.
        This protects institution scope and
        allows correct photo handling.
      */

      const {
        data: existingStudent,
        error:
          existingStudentError
      } =
        await supabaseClient
          .from("students")
          .select(
            "id, student_id, institution_id, full_name, photo_url"
          )
          .eq(
            "id",
            formData.editingId
          )
          .maybeSingle();

      if (existingStudentError) {

        throw new Error(
          "Existing student lama akhrin karin:\n" +
          getErrorMessage(
            existingStudentError
          )
        );
      }

      if (!existingStudent) {

        throw new Error(
          "Student-ka la edit-gareynayo lama helin."
        );
      }

      if (
        !canManageInstitution(
          existingStudent.institution_id
        )
      ) {

        throw new Error(
          "Ma lihid permission aad student-kan ku edit-gareyso."
        );
      }

      /*
        Prevent moving another institution's
        student by non-super-admin.
      */

      if (
        !canManageInstitution(
          formData.institutionId
        )
      ) {

        throw new Error(
          "Ma lihid permission institution-kan."
        );
      }


      const {
        error: updateError
      } =
        await supabaseClient
          .from("students")
          .update(
            payload
          )
          .eq(
            "id",
            formData.editingId
          );

      if (updateError) {

        throw new Error(
          "Student update failed:\n\n" +
          getErrorMessage(
            updateError
          )
        );
      }


      /* =================================================
         NEW PHOTO DURING EDIT
         ================================================= */

      if (selectedPhotoFile) {

        try {

          showMessage(
            "STUDENT DATA UPDATED.\n\n" +
            "Photo-ga cusub ayaa Storage loo upload-gareynayaa...",
            "info"
          );

          const uploaded =
            await uploadStudentPhoto(
              selectedPhotoFile,
              formData.editingId,
              formData.studentId
            );

          const {
            error:
              photoDbError
          } =
            await supabaseClient
              .from("students")
              .update({
                photo_url:
                  uploaded.publicUrl,

                updated_at:
                  new Date().toISOString()
              })
              .eq(
                "id",
                formData.editingId
              );

          if (photoDbError) {

            throw new Error(
              "Photo waa la upload-gareeyay laakiin photo_url lama update-gareyn:\n" +
              getErrorMessage(
                photoDbError
              )
            );
          }

          showMessage(
            "STUDENT DATA UPDATED.\n\n" +
            "Photo-ga cusub + photo_url si guul leh ayaa loo kaydiyay.",
            "success"
          );

        } catch (photoError) {

          console.error(
            "UPDATE PHOTO ERROR:",
            photoError
          );

          showMessage(
            "STUDENT DATA UPDATED.\n\n" +
            "Laakiin photo-ga cusub lama kaydin.\n\n" +
            getErrorMessage(
              photoError
            ),
            "error"
          );

          resetForm();

          await loadStudents();

          return;
        }

      } else {

        showMessage(
          "Student si guul leh ayaa loo update-gareeyay.",
          "success"
        );
      }
    }


    /* =====================================================
       FINISH
       ===================================================== */

    resetForm();

    await loadStudents();

  } catch (error) {

    console.error(
      "SAVE STUDENT ERROR:",
      error
    );

    showMessage(
      "Student lama kaydin.\n\n" +
      getErrorMessage(
        error
      ),
      "error"
    );

  } finally {

    isSaving =
      false;

    if (saveButton) {

      saveButton.disabled =
        false;

      saveButton.textContent =
        editingStudent
          ? "Update Student"
          : "Save Student";
    }
  }
}


/* =========================================================
   GENERATE STUDENT ID
   ========================================================= */

function generateStudentId() {

  const input =
    $("studentId");

  if (!input) {
    return;
  }

  const year =
    new Date().getFullYear();

  let number =
    1;

  let id = "";

  const existingIds =
    new Set(
      students.map(
        student =>
          String(
            student.student_id ||
            ""
          ).toLowerCase()
      )
    );

  do {

    id =
      `GA-${year}-${String(number).padStart(6, "0")}`;

    number++;

  } while (
    existingIds.has(
      id.toLowerCase()
    )
  );

  input.value =
    id;
}


/* =========================================================
   EDIT STUDENT
   ========================================================= */

function editStudent(id) {

  const student =
    students.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!student) {

    showMessage(
      "Student-ka lama helin.",
      "error"
    );

    return;
  }

  if (
    !canManageInstitution(
      student.institution_id
    )
  ) {

    showMessage(
      "Ma lihid permission aad student-kan ku edit-gareyso.",
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
      student.id || "";
  }

  const institution =
    $("institutionSelect");

  if (institution) {
    institution.value =
      student.institution_id || "";
  }

  const studentId =
    $("studentId");

  if (studentId) {
    studentId.value =
      student.student_id || "";
  }

  const fullName =
    $("fullName");

  if (fullName) {
    fullName.value =
      student.full_name || "";
  }

  const gender =
    $("gender");

  if (gender) {
    gender.value =
      student.gender || "";
  }

  const dob =
    $("dateOfBirth");

  if (dob) {
    dob.value =
      student.date_of_birth || "";
  }

  const phone =
    $("phone");

  if (phone) {
    phone.value =
      student.phone || "";
  }

  const email =
    $("email");

  if (email) {
    email.value =
      student.email || "";
  }

  const address =
    $("address");

  if (address) {
    address.value =
      student.address || "";
  }

  const admission =
    $("admissionDate");

  if (admission) {
    admission.value =
      student.admission_date || "";
  }

  const status =
    $("status");

  if (status) {
    status.value =
      normalizeStatus(
        student.status
      );
  }

  selectedPhotoFile =
    null;

  const photoInput =
    $("photoInput");

  if (photoInput) {
    photoInput.value =
      "";
  }

  setPhotoPreview(
    student.photo_url,
    student.full_name
  );

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
      "Update Student";
  }

  const form =
    $("studentForm");

  if (form) {

    form.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  showMessage(
    "Editing: " +
    student.full_name,
    "info"
  );
}


/* =========================================================
   RESET FORM
   ========================================================= */

function resetForm() {

  editingStudent =
    null;

  selectedPhotoFile =
    null;

  const editId =
    $("editStudentDbId");

  if (editId) {
    editId.value =
      "";
  }

  const studentId =
    $("studentId");

  if (studentId) {
    studentId.value =
      "";
  }

  const fullName =
    $("fullName");

  if (fullName) {
    fullName.value =
      "";
  }

  const gender =
    $("gender");

  if (gender) {
    gender.value =
      "";
  }

  const dob =
    $("dateOfBirth");

  if (dob) {
    dob.value =
      "";
  }

  const phone =
    $("phone");

  if (phone) {
    phone.value =
      "";
  }

  const email =
    $("email");

  if (email) {
    email.value =
      "";
  }

  const address =
    $("address");

  if (address) {
    address.value =
      "";
  }

  const admission =
    $("admissionDate");

  if (admission) {
    admission.value =
      todayISO();
  }

  const status =
    $("status");

  if (status) {
    status.value =
      "active";
  }

  const photoInput =
    $("photoInput");

  if (photoInput) {
    photoInput.value =
      "";
  }

  setPhotoPreview(
    null,
    "Student"
  );

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
      "Save Student";
  }

  hideProgress();

  /*
    Institution:
    Super Admin = blank
    Other roles = own institution
  */

  const institution =
    $("institutionSelect");

  if (institution) {

    if (
      currentProfile &&
      !isSuperAdmin()
    ) {

      institution.value =
        currentProfile.institution_id ||
        "";

    } else {

      institution.value =
        "";
    }
  }
}


/* =========================================================
   VIEW STUDENT
   ========================================================= */

function viewStudent(id) {

  const student =
    students.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!student) {

    showMessage(
      "Student-ka lama helin.",
      "error"
    );

    return;
  }

  const photo =
    student.photo_url ||
    defaultAvatar(
      student.full_name
    );

  const content =
    $("profileContent");

  if (!content) {
    return;
  }

  content.innerHTML = `

    <div class="profile-top">

      <img
        class="profile-photo"
        src="${escapeHtml(photo)}"
        alt="Student"
        onerror="this.src='${defaultAvatar(student.full_name)}'"
      >

      <h2>
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

    <div class="profile-grid">

      ${profileItem(
        "Student ID",
        student.student_id
      )}

      ${profileItem(
        "Institution",
        getInstitutionName(
          student.institution_id
        )
      )}

      ${profileItem(
        "Full Name",
        student.full_name
      )}

      ${profileItem(
        "Gender",
        student.gender
      )}

      ${profileItem(
        "Date of Birth",
        student.date_of_birth
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
        student.admission_date
      )}

      ${profileItem(
        "Status",
        normalizeStatus(
          student.status
        )
      )}

      ${profileItem(
        "Address",
        student.address
      )}

      ${profileItem(
        "Photo URL",
        student.photo_url
      )}

    </div>
  `;

  const modal =
    $("profileModal");

  if (modal) {

    modal.classList.add(
      "show"
    );
  }
}


/* =========================================================
   PROFILE ITEM
   ========================================================= */

function profileItem(
  label,
  value
) {

  return `
    <div class="profile-item">

      <small>
        ${escapeHtml(label)}
      </small>

      <strong>
        ${escapeHtml(
          value || "-"
        )}
      </strong>

    </div>
  `;
}


/* =========================================================
   CLOSE PROFILE
   ========================================================= */

function closeProfile() {

  const modal =
    $("profileModal");

  if (modal) {

    modal.classList.remove(
      "show"
    );
  }
}


/* =========================================================
   DELETE STUDENT
   ========================================================= */

async function deleteStudent(id) {

  if (!canDelete()) {

    showMessage(
      "Ma lihid permission aad student ku delete-gareyso.",
      "error"
    );

    return;
  }

  const student =
    students.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!student) {

    showMessage(
      "Student-ka lama helin.",
      "error"
    );

    return;
  }

  if (
    !canManageInstitution(
      student.institution_id
    )
  ) {

    showMessage(
      "Ma lihid permission institution-kan.",
      "error"
    );

    return;
  }

  const confirmed =
    window.confirm(
      `Ma hubtaa inaad delete-gareyso student-kan?\n\n` +
      `${student.full_name}\n` +
      `${student.student_id}`
    );

  if (!confirmed) {
    return;
  }

  try {

    showMessage(
      "Deleting student...",
      "info"
    );

    /*
      Delete DB record first.
     
