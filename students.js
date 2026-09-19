/* =========================================================
   GAAWOW EMS
   STUDENTS MODULE
   V3.2 FINAL
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupKf1b_s0RjIbAi5g_RqLCs145";

const PHOTO_BUCKET = "student-photos";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =========================================================
   STATE
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
   HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showMessage(message, type = "info") {
  const box = $("message");

  if (!box) return;

  box.textContent = message;

  box.style.display = "block";

  if (type === "success") {
    box.style.background = "#dcfce7";
    box.style.color = "#166534";
    box.style.border = "1px solid #86efac";
  } else if (type === "error") {
    box.style.background = "#fee2e2";
    box.style.color = "#991b1b";
    box.style.border = "1px solid #fca5a5";
  } else {
    box.style.background = "#dbeafe";
    box.style.color = "#1e40af";
    box.style.border = "1px solid #93c5fd";
  }
}

function clearMessage() {
  const box = $("message");

  if (!box) return;

  box.textContent = "";
  box.style.display = "none";
}

function getErrorMessage(error) {
  if (!error) return "Unknown error.";

  if (typeof error === "string") return error;

  return (
    error.message ||
    error.error_description ||
    error.details ||
    error.hint ||
    "Unknown Supabase error."
  );
}

function setLoading(text = "Loading...") {
  const body = $("studentsTableBody");

  if (!body) return;

  body.innerHTML = `
    <tr>
      <td colspan="100%" style="padding:40px;text-align:center;">
        <div style="font-size:18px;font-weight:700;color:#0B4DA2;">
          ${escapeHTML(text)}
        </div>
        <div style="margin-top:8px;color:#64748b;">
          Please wait...
        </div>
      </td>
    </tr>
  `;
}

function setEmpty(message = "No students found.") {
  const body = $("studentsTableBody");

  if (!body) return;

  body.innerHTML = `
    <tr>
      <td colspan="100%" style="padding:40px;text-align:center;color:#64748b;">
        ${escapeHTML(message)}
      </td>
    </tr>
  `;
}

function setTableError(message) {
  const body = $("studentsTableBody");

  if (!body) return;

  body.innerHTML = `
    <tr>
      <td colspan="100%" style="padding:40px;text-align:center;">
        <div style="font-size:18px;font-weight:700;color:#dc2626;">
          Failed to load students
        </div>

        <div style="margin-top:8px;color:#475569;">
          ${escapeHTML(message)}
        </div>

        <button
          type="button"
          onclick="window.loadStudents()"
          style="
            margin-top:16px;
            padding:10px 18px;
            border:none;
            border-radius:8px;
            background:#0B4DA2;
            color:white;
            font-weight:700;
            cursor:pointer;
          "
        >
          Retry
        </button>
      </td>
    </tr>
  `;
}

/* =========================================================
   ROLE HELPERS
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
   AUTH
   ========================================================= */

async function getCurrentUser() {
  const {
    data,
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    throw new Error(
      "Authentication error: " + getErrorMessage(error)
    );
  }

  if (!data?.user) {
    throw new Error(
      "You are not logged in. Please login again."
    );
  }

  return data.user;
}

/* =========================================================
   PROFILE
   ========================================================= */

async function loadCurrentProfile(userId) {
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
    throw new Error(
      "Profile loading failed: " +
      getErrorMessage(error)
    );
  }

  if (!data) {
    throw new Error(
      "Your profile was not found in the profiles table."
    );
  }

  if (data.is_active === false) {
    throw new Error(
      "Your EMS account is inactive."
    );
  }

  return data;
}

/* =========================================================
   INSTITUTIONS
   ========================================================= */

async function loadInstitutions() {
  const select = $("institutionSelect");

  if (!select) return;

  select.innerHTML = `
    <option value="">Loading institutions...</option>
  `;

  let query = supabaseClient
    .from("institutions")
    .select(`
      id,
      name,
      is_active
    `)
    .order("name");

  if (!isSuperAdmin()) {
    if (!currentProfile?.institution_id) {
      throw new Error(
        "Your profile has no institution assigned."
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
    throw new Error(
      "Institution loading failed: " +
      getErrorMessage(error)
    );
  }

  institutions = data || [];

  select.innerHTML = "";

  if (!institutions.length) {
    select.innerHTML = `
      <option value="">No institution found</option>
    `;

    if (isSuperAdmin()) {
      throw new Error(
        "No institutions were found."
      );
    }

    return;
  }

  const placeholder = document.createElement("option");

  placeholder.value = "";
  placeholder.textContent = "Select Institution";

  select.appendChild(placeholder);

  institutions.forEach((institution) => {
    if (institution.is_active === false) return;

    const option = document.createElement("option");

    option.value = institution.id;
    option.textContent = institution.name;

    select.appendChild(option);
  });

  if (!isSuperAdmin()) {
    select.value = currentProfile.institution_id;
    select.disabled = true;
  } else {
    select.disabled = false;
  }
}

/* =========================================================
   STUDENTS QUERY
   ========================================================= */

async function fetchStudents() {
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
        "No institution is assigned to your profile."
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
    throw new Error(
      "Student loading failed: " +
      getErrorMessage(error)
    );
  }

  return data || [];
}

/* =========================================================
   LOAD STUDENTS
   ========================================================= */

async function loadStudents() {
  if (isLoadingStudents) return;

  isLoadingStudents = true;

  setLoading("Loading students...");
  clearMessage();

  try {
    students = await fetchStudents();

    updateStatistics();
    renderStudents();

  } catch (error) {
    console.error(
      "[GAAWOW EMS] loadStudents error:",
      error
    );

    students = [];

    updateStatistics();

    setTableError(
      getErrorMessage(error)
    );

    showMessage(
      getErrorMessage(error),
      "error"
    );

  } finally {
    isLoadingStudents = false;
  }
}

/* =========================================================
   FILTERING
   ========================================================= */

function getFilteredStudents() {
  const search =
    ($("searchInput")?.value || "")
      .trim()
      .toLowerCase();

  const status =
    $("statusFilter")?.value || "";

  return students.filter((student) => {
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

    return matchesSearch && matchesStatus;
  });
}

/* =========================================================
   RENDER
   ========================================================= */

function renderStudents() {
  const body = $("studentsTableBody");

  if (!body) return;

  const filtered = getFilteredStudents();

  if (!filtered.length) {
    setEmpty(
      students.length
        ? "No students match your search/filter."
        : "No students found."
    );

    return;
  }

  body.innerHTML = filtered
    .map((student, index) => {

      const photo = student.photo_url
        ? `
          <img
            src="${escapeHTML(student.photo_url)}"
            alt="Student"
            style="
              width:42px;
              height:42px;
              object-fit:cover;
              border-radius:50%;
              border:2px solid #D4AF37;
            "
            onerror="this.style.display='none'"
          >
        `
        : `
          <div
            style="
              width:42px;
              height:42px;
              border-radius:50%;
              background:#e2e8f0;
              display:flex;
              align-items:center;
              justify-content:center;
              font-weight:800;
              color:#475569;
            "
          >
            ${(student.full_name || "?")
              .charAt(0)
              .toUpperCase()}
          </div>
        `;

      const status = student.status || "active";

      const statusHTML = `
        <span
          style="
            display:inline-block;
            padding:5px 10px;
            border-radius:999px;
            font-size:12px;
            font-weight:700;
            background:
              ${
                status === "active"
                  ? "#dcfce7"
                  : status === "graduated"
                  ? "#dbeafe"
                  : "#fee2e2"
              };
            color:
              ${
                status === "active"
                  ? "#166534"
                  : status === "graduated"
                  ? "#1e40af"
                  : "#991b1b"
              };
          "
        >
          ${escapeHTML(status)}
        </span>
      `;

      return `
        <tr>
          <td>${index + 1}</td>

          <td>
            <div style="
              display:flex;
              align-items:center;
              gap:10px;
            ">
              ${photo}

              <div>
                <div style="font-weight:800;">
                  ${escapeHTML(
                    student.full_name || "-"
                  )}
                </div>

                <div style="
                  font-size:12px;
                  color:#64748b;
                ">
                  ${escapeHTML(
                    student.student_id || "-"
                  )}
                </div>
              </div>
            </div>
          </td>

          <td>
            ${escapeHTML(
              student.gender || "-"
            )}
          </td>

          <td>
            ${escapeHTML(
              student.phone || "-"
            )}
          </td>

          <td>
            ${escapeHTML(
              student.email || "-"
            )}
          </td>

          <td>
            ${statusHTML}
          </td>

          <td>
            <div style="
              display:flex;
              gap:6px;
              flex-wrap:wrap;
            ">

              <button
                type="button"
                onclick="window.viewStudent('${student.id}')"
                style="
                  padding:7px 10px;
                  border:none;
                  border-radius:6px;
                  background:#0B4DA2;
                  color:#fff;
                  cursor:pointer;
                "
              >
                View
              </button>

              <button
                type="button"
                onclick="window.editStudent('${student.id}')"
                style="
                  padding:7px 10px;
                  border:none;
                  border-radius:6px;
                  background:#D4AF37;
                  color:#111827;
                  cursor:pointer;
                  font-weight:700;
                "
              >
                Edit
              </button>

              <button
                type="button"
                onclick="window.deleteStudent('${student.id}')"
                style="
                  padding:7px 10px;
                  border:none;
                  border-radius:6px;
                  background:#dc2626;
                  color:#fff;
                  cursor:pointer;
                "
              >
                Delete
              </button>

            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

/* =========================================================
   STATISTICS
   ========================================================= */

function updateStatistics() {
  const total = students.length;

  const active =
    students.filter(
      s => s.status === "active"
    ).length;

  const graduated =
    students.filter(
      s => s.status === "graduated"
    ).length;

  const other =
    students.filter(
      s =>
        s.status !== "active" &&
        s.status !== "graduated"
    ).length;

  if ($("totalStudents"))
    $("totalStudents").textContent = total;

  if ($("activeStudents"))
    $("activeStudents").textContent = active;

  if ($("graduatedStudents"))
    $("graduatedStudents").textContent = graduated;

  if ($("otherStudents"))
    $("otherStudents").textContent = other;
}

/* =========================================================
   PHOTO VALIDATION
   ========================================================= */

function validatePhoto(file) {
  if (!file) return true;

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
      "Photo size must be 5MB or less."
    );
  }

  return true;
}

/* =========================================================
   PHOTO PREVIEW
   ========================================================= */

function handlePhotoSelection(event) {
  const file =
    event.target.files?.[0];

  selectedPhotoFile = file || null;

  if (!file) {
    return;
  }

  try {
    validatePhoto(file);

    const preview = $("photoPreview");

    if (!preview) return;

    const reader =
      new FileReader();

    reader.onload = function () {
      preview.src = reader.result;
      preview.style.display = "block";
    };

    reader.readAsDataURL(file);

  } catch (error) {
    selectedPhotoFile = null;

    if ($("photoInput")) {
      $("photoInput").value = "";
    }

    showMessage(
      getErrorMessage(error),
      "error"
    );
  }
}

/* =========================================================
   SAFE FILE NAME
   ========================================================= */

function safeFileExtension(file) {
  const type = file.type;

  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";

  return "jpg";
}

/* =========================================================
   PHOTO UPLOAD
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
      "Student database ID is missing for photo upload."
    );
  }

  validatePhoto(file);

  const extension =
    safeFileExtension(file);

  const uniqueName =
    `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const filePath =
    `students/${databaseId}/${uniqueName}`;

  console.log(
    "[GAAWOW EMS] Uploading photo:",
    filePath
  );

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
    throw new Error(
      "Photo upload failed: " +
      getErrorMessage(uploadError)
    );
  }

  const {
    data
  } = supabaseClient
    .storage
    .from(PHOTO_BUCKET)
    .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error(
      "Photo uploaded, but public URL could not be created."
    );
  }

  console.log(
    "[GAAWOW EMS] Photo URL:",
    data.publicUrl
  );

  return data.publicUrl;
}

/* =========================================================
   RESET FORM
   ========================================================= */

function resetForm() {
  const form = $("studentForm");

  if (form) {
    form.reset();
  }

  editingStudent = null;
  selectedPhotoFile = null;

  if ($("editStudentDbId"))
    $("editStudentDbId").value = "";

  if ($("formTitle"))
    $("formTitle").textContent =
      "Add Student";

  if ($("saveButton")) {
    $("saveButton").textContent =
      "Save Student";

    $("saveButton").disabled =
      false;
  }

  const preview =
    $("photoPreview");

  if (preview) {
    preview.src = "";
    preview.style.display = "none";
  }

  if ($("institutionSelect")) {
    if (isSuperAdmin()) {
      $("institutionSelect").value = "";
    } else if (
      currentProfile?.institution_id
    ) {
      $("institutionSelect").value =
        currentProfile.institution_id;
    }
  }

  clearMessage();
}

/* =========================================================
   ADD MODE
   ========================================================= */

function startAddStudent() {
  resetForm();

  if ($("formTitle"))
    $("formTitle").textContent =
      "Add Student";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================================
   EDIT STUDENT
   ========================================================= */

async function editStudent(databaseId) {
  clearMessage();

  try {
    const student =
      students.find(
        s => s.id === databaseId
      );

    if (!student) {
      throw new Error(
        "Student record was not found."
      );
    }

    if (
      !isSuperAdmin() &&
      student.institution_id !==
        currentProfile.institution_id
    ) {
      throw new Error(
        "You cannot edit a student from another institution."
      );
    }

    editingStudent = student;

    if ($("editStudentDbId"))
      $("editStudentDbId").value =
        student.id;

    if ($("formTitle"))
      $("formTitle").textContent =
        "Edit Student";

    if ($("institutionSelect"))
      $("institutionSelect").value =
        student.institution_id || "";

    if ($("studentId"))
      $("studentId").value =
        student.student_id || "";

    if ($("status"))
      $("status").value =
        student.status || "active";

    if ($("fullName"))
      $("fullName").value =
        student.full_name || "";

    if ($("gender"))
      $("gender").value =
        student.gender || "";

    if ($("dateOfBirth"))
      $("dateOfBirth").value =
        student.date_of_birth || "";

    if ($("phone"))
      $("phone").value =
        student.phone || "";

    if ($("email"))
      $("email").value =
        student.email || "";

    if ($("admissionDate"))
      $("admissionDate").value =
        student.admission_date || "";

    if ($("address"))
      $("address").value =
        student.address || "";

    if ($("photoInput"))
      $("photoInput").value = "";

    selectedPhotoFile = null;

    const preview =
      $("photoPreview");

    if (preview) {
      if (student.photo_url) {
        preview.src =
          student.photo_url;

        preview.style.display =
          "block";
      } else {
        preview.src = "";
        preview.style.display =
          "none";
      }
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  } catch (error) {
    console.error(
      "[GAAWOW EMS] editStudent:",
      error
    );

    showMessage(
      getErrorMessage(error),
      "error"
    );
  }
}

/* =========================================================
   SAVE STUDENT
   ========================================================= */

async function saveStudent(event) {
  if (event) {
    event.preventDefault();
  }

  if (isSaving) return;

  isSaving = true;

  const button =
    $("saveButton");

  if (button) {
    button.disabled = true;
    button.textContent =
      "Saving...";
  }

  clearMessage();

  try {

    const institutionId =
      $("institutionSelect")?.value ||
      currentProfile?.institution_id;

    const studentId =
      $("studentId")?.value.trim();

    const fullName =
      $("fullName")?.value.trim();

    const gender =
      $("gender")?.value || null;

    const dateOfBirth =
      $("dateOfBirth")?.value || null;

    const phone =
      $("phone")?.value.trim() || null;

    const email =
      $("email")?.value.trim() || null;

    const admissionDate =
      $("admissionDate")?.value || null;

    const address =
      $("address")?.value.trim() || null;

    const status =
      $("status")?.value ||
      "active";

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

    if (!isSuperAdmin()) {
      if (
        institutionId !==
        currentProfile.institution_id
      ) {
        throw new Error(
          "You cannot save a student outside your institution."
        );
      }
    }

    if (selectedPhotoFile) {
      validatePhoto(
        selectedPhotoFile
      );
    }

    /* ==========================================
       EDIT
       ========================================== */

    if (editingStudent) {

      const dbId =
        editingStudent.id;

      const payload = {
        institution_id:
          institutionId,
        student_id:
          studentId,
        full_name:
          fullName,
        gender:
          gender,
        date_of_birth:
          dateOfBirth,
        phone:
          phone,
        email:
          email,
        admission_date:
          admissionDate,
        address:
          address,
        status:
          status,
        updated_at:
          new Date().toISOString()
      };

      const {
        error: updateError
      } = await supabaseClient
        .from("students")
        .update(payload)
        .eq("id", dbId);

      if (updateError) {
        throw new Error(
          "Student update failed: " +
          getErrorMessage(
            updateError
          )
        );
      }

      /* Upload NEW photo only */
      if (selectedPhotoFile) {

        showMessage(
          "Student updated. Uploading photo...",
          "info"
        );

        const photoUrl =
          await uploadStudentPhoto(
            selectedPhotoFile,
            dbId
          );

        const {
          error:
            photoDbError
        } =
          await supabaseClient
            .from("students")
            .update({
              photo_url:
                photoUrl,
              updated_at:
                new Date().toISOString()
            })
            .eq("id", dbId);

        if (photoDbError) {
          throw new Error(
            "Student updated, but photo URL could not be saved: " +
            getErrorMessage(
              photoDbError
            )
          );
        }
      }

      showMessage(
        "STUDENT DATA UPDATED SUCCESSFULLY.",
        "success"
      );

    }

    /* ==========================================
       CREATE
       ========================================== */

    else {

      const payload = {
        institution_id:
          institutionId,
        student_id:
          studentId,
        full_name:
          fullName,
        gender:
          gender,
        date_of_birth:
          dateOfBirth,
        phone:
          phone,
        email:
          email,
        address:
          address,
        admission_date:
          admissionDate,
        status:
          status
      };

      /*
       IMPORTANT:
       Photo is intentionally NOT inserted here.
       Student DB row is created first so we have
       the exact UUID for Storage path.
      */

      const {
        data: insertedRows,
        error: insertError
      } = await supabaseClient
        .from("students")
        .insert(payload)
        .select(`
          id,
          student_id,
          institution_id,
          full_name,
          photo_url
        `);

      if (insertError) {
        throw new Error(
          "Student save failed: " +
          getErrorMessage(
            insertError
          )
        );
      }

      const insertedStudent =
        insertedRows?.[0];

      if (!insertedStudent?.id) {
        throw new Error(
          "Student was created, but the database ID was not returned."
        );
      }

      /* ======================================
         PHOTO
         ====================================== */

      if (selectedPhotoFile) {

        showMessage(
          "Student created. Uploading photo...",
          "info"
        );

        const photoUrl =
          await uploadStudentPhoto(
            selectedPhotoFile,
            insertedStudent.id
          );

        const {
          error:
            photoDbError
        } =
          await supabaseClient
            .from("students")
            .update({
              photo_url:
                photoUrl,
              updated_at:
                new Date().toISOString()
            })
            .eq(
              "id",
              insertedStudent.id
            );

        if (photoDbError) {
          throw new Error(
            "Student was created, but photo URL could not be saved: " +
            getErrorMessage(
              photoDbError
            )
          );
        }
      }

      showMessage(
        "STUDENT SAVED SUCCESSFULLY.",
        "success"
      );
    }

    resetForm();

    await loadStudents();

    /*
      Keep success message after reload.
    */
    showMessage(
      editingStudent
        ? "STUDENT DATA UPDATED SUCCESSFULLY."
        : "STUDENT SAVED SUCCESSFULLY.",
      "success"
    );

  } catch (error) {

    console.error(
      "[GAAWOW EMS] saveStudent error:",
      error
    );

    showMessage(
      getErrorMessage(error),
      "error"
    );

  } finally {

    isSaving = false;

    if (button) {
      button.disabled = false;
      button.textContent =
        "Save Student";
    }
  }
}

/* =========================================================
   DELETE
   ========================================================= */

async function deleteStudent(databaseId) {
  clearMessage();

  try {

    const student =
      students.find(
        s => s.id === databaseId
      );

    if (!student) {
      throw new Error(
        "Student not found."
      );
    }

    if (
      !isSuperAdmin() &&
      student.institution_id !==
        currentProfile.institution_id
    ) {
      throw new Error(
        "You cannot delete a student from another institution."
      );
    }

    const confirmed =
      window.confirm(
        `Delete student "${student.full_name}"? This action cannot be undone.`
      );

    if (!confirmed) return;

    const {
      error
    } = await supabaseClient
      .from("students")
      .delete()
      .eq(
        "id",
        databaseId
      );

    if (error) {
      throw new Error(
        "Student deletion failed: " +
        getErrorMessage(error)
      );
    }

    showMessage(
      "STUDENT DELETED SUCCESSFULLY.",
      "success"
    );

    await loadStudents();

    showMessage(
      "STUDENT DELETED SUCCESSFULLY.",
      "success"
    );

  } catch (error) {

    console.error(
      "[GAAWOW EMS] deleteStudent:",
      error
    );

    showMessage(
      getErrorMessage(error),
      "error"
    );
  }
}

/* =========================================================
   VIEW STUDENT
   ========================================================= */

function viewStudent(databaseId) {
  const student =
    students.find(
      s => s.id === databaseId
    );

  if (!student) {
    showMessage(
      "Student record not found.",
      "error"
    );

    return;
  }

  const modal =
    $("profileModal");

  const content =
    $("profileContent");

  if (!modal || !content) {
    alert(
      `${student.full_name}\nStudent ID: ${student.student_id}`
    );

    return;
  }

  const photoHTML =
    student.photo_url
      ? `
        <img
          src="${escapeHTML(student.photo_url)}"
          alt="Student photo"
          style="
            width:130px;
            height:130px;
            object-fit:cover;
            border-radius:12px;
            border:3px solid #D4AF37;
          "
        >
      `
      : `
        <div style="
          width:130px;
          height:130px;
          border-radius:12px;
          background:#e2e8f0;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:42px;
          font-weight:800;
          color:#475569;
        ">
          ${(student.full_name || "?")
            .charAt(0)
            .toUpperCase()}
        </div>
      `;

  content.innerHTML = `
    <div style="
      display:flex;
      gap:20px;
      align-items:center;
      margin-bottom:20px;
      flex-wrap:wrap;
    ">
      ${photoHTML}

      <div>
        <h2 style="
          margin:0 0 6px;
          color:#0B1E63;
        ">
          ${escapeHTML(
            student.full_name || "-"
          )}
        </h2>

        <div style="color:#64748b;">
          Student ID:
          <strong>
            ${escapeHTML(
              student.student_id || "-"
            )}
          </strong>
        </div>
      </div>
    </div>

    <div style="
      display:grid;
      grid-template-columns:
        repeat(auto-fit,minmax(220px,1fr));
      gap:12px;
    ">

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
        student.status
      )}

      ${profileItem(
        "Address",
        student.address
      )}

      ${profileItem(
        "Emergency Contact",
        student.emergency_contact_name
      )}

      ${profileItem(
        "Emergency Phone",
        student.emergency_contact_phone
      )}

    </div>
  `;

  modal.style.display =
    "flex";
}

function profileItem(label, value) {
  return `
    <div style="
      padding:12px;
      background:#f8fafc;
      border-radius:8px;
      border:1px solid #e2e8f0;
    ">
      <div style="
        font-size:12px;
        color:#64748b;
        margin-bottom:4px;
      ">
        ${escapeHTML(label)}
      </div>

      <div style="
        font-weight:700;
        color:#1e293b;
      ">
        ${escapeHTML(value || "-")}
      </div>
    </div>
  `;
}

/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeProfileModal() {
  const modal =
    $("profileModal");

  if (modal) {
    modal.style.display =
      "none";
  }
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEvents() {

  const form =
    $("studentForm");

  if (
    form &&
    !form.dataset.eventsReady
  ) {
    form.addEventListener(
      "submit",
      saveStudent
    );

    form.dataset.eventsReady =
      "true";
  }

  const photoInput =
    $("photoInput");

  if (
    photoInput &&
    !photoInput.dataset.eventsReady
  ) {
    photoInput.addEventListener(
      "change",
      handlePhotoSelection
    );

    photoInput.dataset.eventsReady =
      "true";
  }

  const searchInput =
    $("searchInput");

  if (
    searchInput &&
    !searchInput.dataset.eventsReady
  ) {
    searchInput.addEventListener(
      "input",
      renderStudents
    );

    searchInput.dataset.eventsReady =
      "true";
  }

  const statusFilter =
    $("statusFilter");

  if (
    statusFilter &&
    !statusFilter.dataset.eventsReady
  ) {
    statusFilter.addEventListener(
      "change",
      renderStudents
    );

    statusFilter.dataset.eventsReady =
      "true";
  }

  const modal =
    $("profileModal");

  if (
    modal &&
    !modal.dataset.eventsReady
  ) {
    modal.addEventListener(
      "click",
      function (event) {

        if (
          event.target === modal
        ) {
          closeProfileModal();
        }

      }
    );

    modal.dataset.eventsReady =
      "true";
  }
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeStudentsPage() {

  if (isInitialized) return;

  isInitialized = true;

  setLoading(
    "Connecting to GAAWOW EMS..."
  );

  try {

    console.log(
      "[GAAWOW EMS] Students V3.2 starting..."
    );

    /* 1. AUTH */
    currentUser =
      await getCurrentUser();

    console.log(
      "[GAAWOW EMS] Auth OK:",
      currentUser.id
    );

    /* 2. PROFILE */
    currentProfile =
      await loadCurrentProfile(
        currentUser.id
      );

    console.log(
      "[GAAWOW EMS] Profile OK:",
      currentProfile
    );

    /* 3. INSTITUTIONS */
    await loadInstitutions();

    /* 4. EVENTS */
    setupEvents();

    /* 5. STUDENTS */
    await loadStudents();

    console.log(
      "[GAAWOW EMS] Students module ready."
    );

  } catch (error) {

    console.error(
      "[GAAWOW EMS] INITIALIZATION ERROR:",
      error
    );

    setTableError(
      getErrorMessage(error)
    );

    showMessage(
      getErrorMessage(error),
      "error"
    );

  }
}

/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.loadStudents =
  loadStudents;

window.startAddStudent =
  startAddStudent;

window.editStudent =
  editStudent;

window.deleteStudent =
  deleteStudent;

window.viewStudent =
  viewStudent;

window.closeProfileModal =
  closeProfileModal;

window.saveStudent =
  saveStudent;

/* =========================================================
   DOM READY
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeStudentsPage,
    { once: true }
  );

} else {

  initializeStudentsPage();

}
