/* =========================================================
   GAAWOW EMS
   STUDENTS MODULE V3.0
   DATABASE + STORAGE SAFE

   Supabase:
   - students
   - institutions
   - profiles
   - storage bucket: student-photos

   Flow:
   Student Save
        ↓
   students table
        ↓
   Photo Upload
        ↓
   Supabase Storage
        ↓
   photo_url
        ↓
   Student Profile
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const STORAGE_BUCKET = "student-photos";

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


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


function escapeHtml(value) {

  if (value === null || value === undefined) {
    return "";
  }

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

  box.className = "message " + type;
  box.textContent = message;
  box.style.display = "block";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function clearMessage() {

  const box = $("message");

  if (!box) return;

  box.textContent = "";
  box.className = "message";
  box.style.display = "none";
}


function todayISO() {

  const d = new Date();

  const month =
    String(d.getMonth() + 1).padStart(2, "0");

  const day =
    String(d.getDate()).padStart(2, "0");

  return `${d.getFullYear()}-${month}-${day}`;
}


function normalizeStatus(status) {

  const allowed = [
    "active",
    "inactive",
    "graduated",
    "suspended",
    "withdrawn"
  ];

  return allowed.includes(status)
    ? status
    : "active";
}


function statusClass(status) {

  return "status status-" +
    normalizeStatus(status);
}


function defaultAvatar(name = "Student") {

  const initials =
    String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(x => x.charAt(0))
      .join("")
      .toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="200"
         height="200"
         viewBox="0 0 200 200">

      <rect width="200"
            height="200"
            fill="#0B1E63"/>

      <circle
        cx="100"
        cy="78"
        r="38"
        fill="#D4AF37"/>

      <path
        d="M40 180
           C45 130 75 115 100 115
           C125 115 155 130 160 180Z"
        fill="#D4AF37"/>

      <text
        x="100"
        y="195"
        text-anchor="middle"
        font-family="Arial"
        font-size="12"
        fill="white">
        ${escapeHtml(initials)}
      </text>

    </svg>
  `;

  return "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(svg);
}


function getInstitutionName(id) {

  const institution =
    institutions.find(
      item => item.id === id
    );

  return institution
    ? institution.name
    : "Unknown Institution";
}


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
   AUTHENTICATION
   ========================================================= */

async function checkAuth() {

  const {
    data,
    error
  } = await supabaseClient.auth.getSession();

  if (error) {

    showMessage(
      "Authentication error:\n" +
      getErrorMessage(error),
      "error"
    );

    return false;
  }

  if (!data || !data.session) {

    showMessage(
      "You are not logged in.\nPlease login to GAAWOW EMS first.",
      "error"
    );

    setTimeout(() => {

      window.location.href = "index.html";

    }, 1500);

    return false;
  }

  currentUser =
    data.session.user;

  return true;
}


/* =========================================================
   LOAD CURRENT PROFILE
   ========================================================= */

async function loadCurrentProfile() {

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      institution_id,
      is_active
    `)
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {

    showMessage(
      "Profile-ka lama akhrin karin.\n\n" +
      "Supabase error:\n" +
      getErrorMessage(error),
      "error"
    );

    return false;
  }

  if (!data) {

    showMessage(
      "Profile-ka user-kan lama helin.\n\n" +
      "User ID: " + currentUser.id,
      "error"
    );

    return false;
  }

  currentProfile = data;

  if (data.is_active === false) {

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

  if (!select) return false;

  select.innerHTML =
    `<option value="">Loading...</option>`;

  let query =
    supabaseClient
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
    sees all institutions.

    Other roles:
    sees own institution only.
  */

  if (
    currentProfile.role !== "super_admin"
  ) {

    if (!currentProfile.institution_id) {

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
  } = await query;

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

  institutions = data || [];

  select.innerHTML =
    `<option value="">Select Institution</option>`;

  institutions.forEach(inst => {

    const option =
      document.createElement("option");

    option.value = inst.id;
    option.textContent = inst.name;

    select.appendChild(option);
  });

  /*
    Non-super-admin:
    automatically select own institution
  */

  if (
    currentProfile.role !== "super_admin" &&
    currentProfile.institution_id
  ) {

    select.value =
      currentProfile.institution_id;

    select.disabled = true;
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
      .order("created_at", {
        ascending: false
      });

  /*
    Super Admin:
    all students.

    Other roles:
    own institution only.
  */

  if (
    currentProfile.role !== "super_admin"
  ) {

    if (!currentProfile.institution_id) {

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
  } = await query;

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

  students = data || [];

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
      s => normalizeStatus(s.status) === "active"
    ).length;

  const graduated =
    students.filter(
      s => normalizeStatus(s.status) === "graduated"
    ).length;

  const other =
    total - active - graduated;

  $("totalStudents").textContent =
    total;

  $("activeStudents").textContent =
    active;

  $("graduatedStudents").textContent =
    graduated;

  $("otherStudents").textContent =
    other;
}


/* =========================================================
   RENDER STUDENTS
   ========================================================= */

function renderStudents() {

  const tbody =
    $("studentsTableBody");

  if (!tbody) return;

  const search =
    ($("searchInput")?.value || "")
      .trim()
      .toLowerCase();

  const statusFilter =
    $("statusFilter")?.value || "";

  let filtered =
    students.filter(student => {

      const searchable = [
        student.student_id,
        student.full_name,
        student.phone,
        student.email,
        getInstitutionName(
          student.institution_id
        )
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        searchable.includes(search);

      const matchesStatus =
        !statusFilter ||
        normalizeStatus(student.status) ===
          statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });

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
    defaultAvatar(student.full_name);

  const status =
    normalizeStatus(student.status);

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
          ${escapeHtml(student.student_id || "-")}
        </strong>
      </td>

      <td>
        ${escapeHtml(student.full_name || "-")}
      </td>

      <td>
        ${escapeHtml(student.gender || "-")}
      </td>

      <td>
        ${escapeHtml(student.phone || "-")}
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
            class="btn-primary small-btn"
            onclick="viewStudent('${student.id}')"
          >
            View
          </button>

          <button
            class="btn-success small-btn"
            onclick="editStudent('${student.id}')"
          >
            Edit
          </button>

          ${
            canDelete()
              ? `
                <button
                  class="btn-danger small-btn"
                  onclick="deleteStudent('${student.id}')"
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
   DELETE PERMISSION
   ========================================================= */

function canDelete() {

  return [
    "super_admin",
    "school_admin"
  ].includes(
    currentProfile?.role
  );
}


/* =========================================================
   PHOTO SELECTION
   ========================================================= */

function handlePhotoSelection(event) {

  const file =
    event.target.files?.[0];

  selectedPhotoFile = null;

  if (!file) {

    if (editingStudent?.photo_url) {

      $("photoPreview").src =
        editingStudent.photo_url;

    } else {

      $("photoPreview").src =
        defaultAvatar(
          $("fullName")?.value || "Student"
        );
    }

    return;
  }

  /*
    5MB limit
  */

  if (file.size > 5 * 1024 * 1024) {

    showMessage(
      "Photo-ga waa inuu ka yar yahay 5MB.",
      "error"
    );

    event.target.value = "";
    return;
  }

  /*
    Allowed formats
  */

  const allowed =
    [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

  if (!allowed.includes(file.type)) {

    showMessage(
      "Photo-ga waa inuu noqdaa JPG, PNG ama WEBP.",
      "error"
    );

    event.target.value = "";
    return;
  }

  selectedPhotoFile = file;

  const reader =
    new FileReader();

  reader.onload = function(e) {

    $("photoPreview").src =
      e.target.result;
  };

  reader.readAsDataURL(file);
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

  const extension =
    (
      file.name.split(".").pop() ||
      "jpg"
    )
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const safeStudentId =
    String(studentId)
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      );

  const fileName =
    `${safeStudentId}-${Date.now()}.${extension}`;

  const filePath =
    `students/${safeStudentId}/${fileName}`;

  $("progressWrap").style.display =
    "block";

  $("progressBar").style.width =
    "20%";

  $("progressText").textContent =
    "Uploading photo...";

  const {
    error: uploadError
  } =
    await supabaseClient.storage
      .from(STORAGE_BUCKET)
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

    $("progressBar").style.width =
      "0%";

    $("progressText").textContent =
      "Upload failed";

    throw new Error(
      "Photo upload failed:\n" +
      getErrorMessage(uploadError)
    );
  }

  $("progressBar").style.width =
    "80%";

  const {
    data
  } =
    supabaseClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

  const publicUrl =
    data?.publicUrl;

  if (!publicUrl) {

    throw new Error(
      "Photo waa la upload-gareeyay laakiin public URL lama helin."
    );
  }

  $("progressBar").style.width =
    "100%";

  $("progressText").textContent =
    "Photo uploaded successfully";

  return publicUrl;
}


/* =========================================================
   DUPLICATE STUDENT ID CHECK
   ========================================================= */

async function checkDuplicateStudentId(
  studentId,
  editingId = null
) {

  let query =
    supabaseClient
      .from("students")
      .select("id, student_id")
      .eq(
        "student_id",
        studentId
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
  } = await query;

  if (error) {

    throw new Error(
      "Student ID lama hubin karin:\n" +
      getErrorMessage(error)
    );
  }

  return (
    data &&
    data.length > 0
  );
}


/* =========================================================
   SAVE STUDENT
   ========================================================= */

async function saveStudent(event) {

  if (event) {
    event.preventDefault();
  }

  if (isSaving) {
    return;
  }

  clearMessage();

  try {

    isSaving = true;

    const saveButton =
      $("saveButton");

    if (saveButton) {

      saveButton.disabled = true;
      saveButton.textContent =
        "Saving...";
    }

    /*
      Make sure user is authenticated.
    */

    if (!currentUser) {

      const ok =
        await checkAuth();

      if (!ok) {
        return;
      }
    }

    if (!currentProfile) {

      const ok =
        await loadCurrentProfile();

      if (!ok) {
        return;
      }
    }

    /*
      Read form values.
    */

    const institutionId =
      $("institutionSelect").value.trim();

    const studentId =
      $("studentId").value.trim();

    const fullName =
      $("fullName").value.trim();

    const gender =
      $("gender").value || null;

    const dateOfBirth =
      $("dateOfBirth").value || null;

    const phone =
      $("phone").value.trim() || null;

    const email =
      $("email").value.trim() || null;

    const address =
      $("address").value.trim() || null;

    const admissionDate =
      $("admissionDate").value ||
      todayISO();

    const status =
      normalizeStatus(
        $("status").value
      );

    const editingId =
      $("editStudentDbId").value.trim() ||
      null;


    /* =====================================================
       VALIDATION
       ===================================================== */

    if (!institutionId) {

      throw new Error(
        "Fadlan dooro Institution."
      );
    }

    if (!studentId) {

      throw new Error(
        "Student ID waa qasab."
      );
    }

    if (!fullName) {

      throw new Error(
        "Full Name waa qasab."
      );
    }

    /*
      Non-super-admin cannot create
      student under another institution.
    */

    if (
      currentProfile.role !== "super_admin" &&
      institutionId !==
        currentProfile.institution_id
    ) {

      throw new Error(
        "Ma lihid permission aad student uga sameyso institution-kan."
      );
    }


    /* =====================================================
       DUPLICATE CHECK
       ===================================================== */

    showMessage(
      "Checking Student ID...",
      "info"
    );

    const duplicate =
      await checkDuplicateStudentId(
        studentId,
        editingId
      );

    if (duplicate) {

      throw new Error(
        `Student ID "${studentId}" hore ayaa loo isticmaalay. Fadlan isticmaal ID kale.`
      );
    }


    /* =====================================================
       PAYLOAD
       ===================================================== */

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
        status,

      updated_at:
        new Date().toISOString()
    };


    /* =====================================================
       CREATE STUDENT
       ===================================================== */

    if (!editingId) {

      showMessage(
        "Saving student to database...",
        "info"
      );

      /*
        IMPORTANT:
        Student is created FIRST.

        Photo upload happens AFTER.
        Therefore Storage failure will NOT
        prevent student creation.
      */

      const {
        error: insertError
      } =
        await supabaseClient
          .from("students")
          .insert([
            payload
          ]);

      if (insertError) {

        throw new Error(
          "Student database save failed:\n\n" +
          getErrorMessage(insertError)
        );
      }


      /* =================================================
         PHOTO UPLOAD AFTER STUDENT CREATION
         ================================================= */

      if (selectedPhotoFile) {

        try {

          showMessage(
            "Student waa la kaydiyay.\nPhoto-ga hadda ayaa la upload-gareynayaa...",
            "info"
          );

          const photoUrl =
            await uploadStudentPhoto(
              selectedPhotoFile,
              studentId
            );

          if (photoUrl) {

            const {
              error: photoDbError
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
                  "student_id",
                  studentId
                )
                .eq(
                  "institution_id",
                  institutionId
                );

            if (photoDbError) {

              throw new Error(
                "Student waa la kaydiyay laakiin photo_url lama update-gareyn:\n" +
                getErrorMessage(photoDbError)
              );
            }
          }

        } catch (photoError) {

          /*
            Student remains saved.
          */

          showMessage(
            `STUDENT SAVED SUCCESSFULLY.\n\n` +
            `Laakiin Photo-ga lama kaydin.\n\n` +
            getErrorMessage(photoError),
            "error"
          );

          resetForm();
          await loadStudents();
          return;
        }
      }


      /* =================================================
         SUCCESS
         ================================================= */

      showMessage(
        "Student si guul leh ayaa loo daray." +
        (
          selectedPhotoFile
            ? "\nPhoto-gana Storage + photo_url waa la kaydiyay."
            : ""
        ),
        "success"
      );

    }


    /* =====================================================
       UPDATE STUDENT
       ===================================================== */

    else {

      showMessage(
        "Updating student...",
        "info"
      );

      const {
        error: updateError
      } =
        await supabaseClient
          .from("students")
          .update(payload)
          .eq(
            "id",
            editingId
          );

      if (updateError) {

        throw new Error(
          "Student update failed:\n\n" +
          getErrorMessage(updateError)
        );
      }


      /* =================================================
         NEW PHOTO DURING EDIT
         ================================================= */

      if (selectedPhotoFile) {

        try {

          showMessage(
            "Student waa la update-gareeyay.\nPhoto-ga cusub ayaa la upload-gareynayaa...",
            "info"
          );

          const photoUrl =
            await uploadStudentPhoto(
              selectedPhotoFile,
              studentId
            );

          const {
            error: photoDbError
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
                editingId
              );

          if (photoDbError) {

            throw new Error(
              "Photo URL update failed:\n" +
              getErrorMessage(photoDbError)
            );
          }

        } catch (photoError) {

          showMessage(
            `STUDENT DATA UPDATED.\n\n` +
            `Laakiin photo-ga cusub lama kaydin.\n\n` +
            getErrorMessage(photoError),
            "error"
          );

          resetForm();
          await loadStudents();
          return;
        }
      }


      showMessage(
        "Student si guul leh ayaa loo update-gareeyay.",
        "success"
      );
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
      getErrorMessage(error),
      "error"
    );

  } finally {

    isSaving = false;

    const saveButton =
      $("saveButton");

    if (saveButton) {

      saveButton.disabled = false;

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

  const year =
    new Date().getFullYear();

  let number =
    students.length + 1;

  let id = "";

  do {

    id =
      `GA-${year}-${String(number).padStart(6, "0")}`;

    number++;

  } while (
    students.some(
      s =>
        String(s.student_id)
          .toLowerCase() ===
        id.toLowerCase()
    )
  );

  $("studentId").value =
    id;
}


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
      "Student-ka lama helin.",
      "error"
    );

    return;
  }

  editingStudent =
    student;

  $("editStudentDbId").value =
    student.id;

  $("institutionSelect").value =
    student.institution_id || "";

  $("studentId").value =
    student.student_id || "";

  $("fullName").value =
    student.full_name || "";

  $("gender").value =
    student.gender || "";

  $("dateOfBirth").value =
    student.date_of_birth || "";

  $("phone").value =
    student.phone || "";

  $("email").value =
    student.email || "";

  $("address").value =
    student.address || "";

  $("admissionDate").value =
    student.admission_date ||
    "";

  $("status").value =
    normalizeStatus(student.status);

  selectedPhotoFile =
    null;

  $("photoInput").value =
    "";

  $("photoPreview").src =
    student.photo_url ||
    defaultAvatar(student.full_name);

  $("formTitle").textContent =
    "Edit Student";

  $("saveButton").textContent =
    "Update Student";

  $("studentForm").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

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

  $("editStudentDbId").value =
    "";

  $("studentId").value =
    "";

  $("fullName").value =
    "";

  $("gender").value =
    "";

  $("dateOfBirth").value =
    "";

  $("phone").value =
    "";

  $("email").value =
    "";

  $("address").value =
    "";

  $("admissionDate").value =
    todayISO();

  $("status").value =
    "active";

  $("photoInput").value =
    "";

  $("photoPreview").src =
    defaultAvatar("Student");

  $("formTitle").textContent =
    "Add New Student";

  $("saveButton").textContent =
    "Save Student";

  $("progressWrap").style.display =
    "none";

  $("progressBar").style.width =
    "0%";

  $("progressText").textContent =
    "Uploading...";


  /*
    Restore institution selection.
  */

  if (
    currentProfile &&
    currentProfile.role !== "super_admin"
  ) {

    $("institutionSelect").value =
      currentProfile.institution_id || "";

  } else {

    $("institutionSelect").value =
      "";
  }
}


/* =========================================================
   VIEW STUDENT
   ========================================================= */

function viewStudent(id) {

  const student =
    students.find(
      s => String(s.id) === String(id)
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
    defaultAvatar(student.full_name);

  $("profileContent").innerHTML = `

    <div class="profile-top">

      <img
        class="profile-photo"
        src="${escapeHtml(photo)}"
        alt="Student"
        onerror="this.src='${defaultAvatar(student.full_name)}'"
      >

      <h2>
        ${escapeHtml(student.full_name || "-")}
      </h2>

      <p>
        ${escapeHtml(student.student_id || "-")}
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
        student.status
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

  $("profileModal")
    .classList
    .add("show");
}


/* =========================================================
   PROFILE ITEM
   ========================================================= */

function profileItem(label, value) {

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

  $("profileModal")
    .classList
    .remove("show");
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
      s => String(s.id) === String(id)
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
      `Ma hubtaa inaad delete-gareyso student-kan?\n\n${student.full_name}\n${student.student_id}`
    );

  if (!confirmed) {
    return;
  }

  try {

    showMessage(
      "Deleting student...",
      "info"
    );

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

      throw new Error(
        "Delete failed:\n" +
        getErrorMessage(error)
      );
    }

    showMessage(
      "Student si guul leh ayaa loo delete-gareeyay.",
      "success"
    );

    await loadStudents();

  } catch (error) {

    console.error(
      "DELETE STUDENT ERROR:",
      error
    );

    showMessage(
      getErrorMessage(error),
      "error"
    );
  }
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function goDashboard() {

  window.location.href =
    "dashboard.html";
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEvents() {

  /*
    Form submit
  */

  const form =
    $("studentForm");

  if (form) {

    form.addEventListener(
      "submit",
      saveStudent
    );
  }


  /*
    Photo selection
  */

  const photoInput =
    $("photoInput");

  if (photoInput) {

    photoInput.addEventListener(
      "change",
      handlePhotoSelection
    );
  }


  /*
    Search
  */

  const searchInput =
    $("searchInput");

  if (searchInput) {

    searchInput.addEventListener(
      "input",
      renderStudents
    );
  }


  /*
    Status filter
  */

  const statusFilter =
    $("statusFilter");

  if (statusFilter) {

    statusFilter.addEventListener(
      "change",
      renderStudents
    );
  }


  /*
    Modal background close
  */

  const modal =
    $("profileModal");

  if (modal) {

    modal.addEventListener(
      "click",
      function(event) {

        if (
          event.target === modal
        ) {

          closeProfile();
        }
      }
    );
  }


  /*
    Auto generate Student ID
  */

  const studentId =
    $("studentId");

  if (studentId) {

    studentId.addEventListener(
      "dblclick",
      function() {

        if (!studentId.value.trim()) {
          generateStudentId();
        }
      }
    );
  }
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initialize() {

  try {

    clearMessage();

    /*
      Initial photo
    */

    $("photoPreview").src =
      defaultAvatar("Student");

    $("admissionDate").value =
      todayISO();


    /*
      Authentication
    */

    const authenticated =
      await checkAuth();

    if (!authenticated) {
      return;
    }


    /*
      Profile
    */

    const profileLoaded =
      await loadCurrentProfile();

    if (!profileLoaded) {
      return;
    }


    /*
      Institutions
    */

    const institutionsLoaded =
      await loadInstitutions();

    if (!institutionsLoaded) {
      return;
    }


    /*
      Students
    */

    await loadStudents();


    /*
      Events
    */

    setupEvents();


    /*
      Generate initial ID
    */

    generateStudentId();


    /*
      Ready
    */

    showMessage(
      `Students Module diyaar ah.\nRole: ${currentProfile.role}`,
      "success"
    );

    setTimeout(
      clearMessage,
      2500
    );

  } catch (error) {

    console.error(
      "INITIALIZATION ERROR:",
      error
    );

    showMessage(
      "Students Module lama initialize-gareyn.\n\n" +
      getErrorMessage(error),
      "error"
    );
  }
}


/* =========================================================
   MAKE FUNCTIONS AVAILABLE TO HTML
   ========================================================= */

window.saveStudent =
  saveStudent;

window.resetForm =
  resetForm;

window.editStudent =
  editStudent;

window.viewStudent =
  viewStudent;

window.deleteStudent =
  deleteStudent;

window.closeProfile =
  closeProfile;

window.goDashboard =
  goDashboard;

window.generateStudentId =
  generateStudentId;


/* =========================================================
   START
   ========================================================= */

window.addEventListener(
  "DOMContentLoaded",
  initialize
);
