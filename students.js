/* =========================================================
   GAAWOW EMS
   STUDENTS MANAGEMENT V2.0

   FEATURES:
   - Students CRUD
   - Supabase Auth
   - Institution filtering
   - Student Photo Upload
   - Supabase Storage
   - students.photo_url
   - Student Profile
   - Search
   - Status filter
   - Photo preview
   - Certificate-compatible photo_url

   STORAGE BUCKET:
   student-photos

   DATABASE:
   students
   profiles
   institutions
   ========================================================= */


const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


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


/* =========================================================
   HELPERS
========================================================= */

const $ = (id) =>
  document.getElementById(id);


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function showMessage(
  message,
  type = "info"
) {

  const box =
    $("message");

  box.className =
    `message ${type}`;

  box.textContent =
    message;

}


function clearMessage() {

  const box =
    $("message");

  box.className =
    "message";

  box.textContent =
    "";

}


function todayISO() {

  const d =
    new Date();

  return [
    d.getFullYear(),
    String(
      d.getMonth() + 1
    ).padStart(2, "0"),
    String(
      d.getDate()
    ).padStart(2, "0")
  ].join("-");

}


function normalizeStatus(
  value
) {

  return String(
    value || ""
  )
    .toLowerCase()
    .trim();

}


function statusClass(
  status
) {

  const s =
    normalizeStatus(status);

  if (s === "active")
    return "badge-active";

  if (s === "graduated")
    return "badge-graduated";

  if (s === "suspended")
    return "badge-suspended";

  if (s === "withdrawn")
    return "badge-withdrawn";

  return "badge-inactive";

}


function defaultAvatar(
  name = "Student"
) {

  const letter =
    String(name)
      .trim()
      .charAt(0)
      .toUpperCase() || "S";

  return (
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg"
           width="200"
           height="200"
           viewBox="0 0 200 200">

        <rect
          width="200"
          height="200"
          fill="#E5E7EB"
        />

        <circle
          cx="100"
          cy="75"
          r="42"
          fill="#94A3B8"
        />

        <path
          d="M30 190c8-45 38-68 70-68s62 23 70 68"
          fill="#94A3B8"
        />

        <text
          x="100"
          y="188"
          text-anchor="middle"
          font-family="Arial"
          font-size="24"
          font-weight="bold"
          fill="#0B1E63">
          ${letter}
        </text>

      </svg>
    `)
  );

}


/* =========================================================
   AUTHENTICATION
========================================================= */

async function checkAuth() {

  const {
    data,
    error
  } =
    await supabaseClient
      .auth
      .getSession();


  if (error) {

    throw error;

  }


  currentUser =
    data?.session?.user || null;


  if (!currentUser) {

    window.location.href =
      "index.html";

    return false;

  }


  return true;

}


/* =========================================================
   PROFILE / ROLE
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
      .single();


  if (error) {

    throw error;

  }


  currentProfile =
    data;


  if (
    !currentProfile.is_active
  ) {

    throw new Error(
      "Your account is inactive."
    );

  }


  console.log(
    "GAAWOW EMS profile:",
    currentProfile
  );

}


/* =========================================================
   INSTITUTIONS
========================================================= */

async function loadInstitutions() {

  const select =
    $("institution_id");


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
          ascending:true
        }
      );


  if (error) {

    throw error;

  }


  institutions =
    data || [];


  select.innerHTML =
    `<option value="">
       Select Institution
     </option>`;


  institutions
    .forEach(
      institution => {

        /*
         * Super Admin:
         * sees all institutions.
         *
         * School Admin:
         * sees own institution.
         */

        if (
          currentProfile.role ===
          "super_admin"
          ||
          institution.id ===
          currentProfile.institution_id
        ) {

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

      }
    );


  if (
    currentProfile.role !==
    "super_admin"
    &&
    currentProfile.institution_id
  ) {

    select.value =
      currentProfile.institution_id;

    select.disabled =
      true;

  }

}


/* =========================================================
   LOAD STUDENTS
========================================================= */

async function loadStudents() {

  $("studentsBody").innerHTML =
    `
      <tr>
        <td
          colspan="5"
          class="loading"
        >
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
      `)
      .order(
        "created_at",
        {
          ascending:false
        }
      );


  /*
   * Client-side institution filter
   *
   * RLS remains the final security layer.
   */

  if (
    currentProfile.role !==
      "super_admin"
    &&
    currentProfile.institution_id
  ) {

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

    throw error;

  }


  students =
    data || [];


  updateStats();

  renderStudents();

}


/* =========================================================
   STATS
========================================================= */

function updateStats() {

  $("totalStudents").textContent =
    students.length;


  $("activeStudents").textContent =
    students.filter(
      s =>
        normalizeStatus(
          s.status
        ) === "active"
    ).length;


  $("graduatedStudents").textContent =
    students.filter(
      s =>
        normalizeStatus(
          s.status
        ) === "graduated"
    ).length;


  $("photoStudents").textContent =
    students.filter(
      s =>
        !!s.photo_url
    ).length;

}


/* =========================================================
   RENDER STUDENTS
========================================================= */

function renderStudents() {

  const body =
    $("studentsBody");


  const search =
    String(
      $("searchInput")
        .value || ""
    )
      .toLowerCase()
      .trim();


  const statusFilter =
    normalizeStatus(
      $("statusFilter")
        .value
    );


  let rows =
    [...students];


  if (search) {

    rows =
      rows.filter(
        student => {

          const text =
            [
              student.student_id,
              student.full_name,
              student.phone,
              student.email,
              student.address
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return text.includes(
            search
          );

        }
      );

  }


  if (statusFilter) {

    rows =
      rows.filter(
        student =>
          normalizeStatus(
            student.status
          ) === statusFilter
      );

  }


  if (!rows.length) {

    body.innerHTML =
      `
        <tr>
          <td
            colspan="5"
            class="loading"
          >
            No students found.
          </td>
        </tr>
      `;

    return;

  }


  body.innerHTML =
    rows
      .map(
        student =>
          studentRow(student)
      )
      .join("");

}


/* =========================================================
   STUDENT ROW
========================================================= */

function studentRow(
  student
) {

  const avatar =
    student.photo_url ||
    defaultAvatar(
      student.full_name
    );


  const status =
    normalizeStatus(
      student.status
    ) || "inactive";


  const institution =
    institutions.find(
      i =>
        i.id ===
        student.institution_id
    );


  return `
    <tr>

      <td>

        <div class="student-cell">

          <img
            class="student-avatar"
            src="${escapeHtml(avatar)}"
            alt="Student Photo"
            onerror="
              this.src='${defaultAvatar(
                student.full_name
              )}'
            "
          >

          <div>

            <div class="student-name">
              ${escapeHtml(
                student.full_name ||
                "Unnamed Student"
              )}
            </div>

            <div class="student-id">
              ${escapeHtml(
                student.student_id ||
                "No Student ID"
              )}
            </div>

          </div>

        </div>

      </td>


      <td>
        ${escapeHtml(
          institution?.name ||
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

        <span
          class="badge ${statusClass(
            status
          )}"
        >
          ${escapeHtml(
            status
          )}
        </span>

      </td>


      <td>

        <div class="actions">

          <button
            class="action-btn view"
            onclick="viewStudent(
              '${student.id}'
            )"
          >
            VIEW
          </button>

          <button
            class="action-btn edit"
            onclick="editStudent(
              '${student.id}'
            )"
          >
            EDIT
          </button>

          ${
            canDelete()
              ? `
                <button
                  class="action-btn delete"
                  onclick="deleteStudent(
                    '${student.id}'
                  )"
                >
                  DELETE
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
   PERMISSIONS
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

$("photoInput")
  .addEventListener(
    "change",
    handlePhotoSelection
  );


function handlePhotoSelection(
  event
) {

  clearMessage();


  const file =
    event.target.files?.[0];


  if (!file) {

    selectedPhotoFile =
      null;

    return;

  }


  const allowed =
    [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];


  if (
    !allowed.includes(
      file.type
    )
  ) {

    event.target.value =
      "";

    selectedPhotoFile =
      null;

    showMessage(
      "Only JPG, PNG or WEBP images are allowed.",
      "error"
    );

    return;

  }


  const maxSize =
    5 * 1024 * 1024;


  if (
    file.size >
    maxSize
  ) {

    event.target.value =
      "";

    selectedPhotoFile =
      null;

    showMessage(
      "Photo must be 5MB or smaller.",
      "error"
    );

    return;

  }


  selectedPhotoFile =
    file;


  const reader =
    new FileReader();


  reader.onload =
    function(e) {

      $("photoPlaceholder")
        .style.display =
        "none";


      $("photoPreview")
        .src =
        e.target.result;


      $("photoPreview")
        .style.display =
        "block";

    };


  reader.readAsDataURL(
    file
  );

}


/* =========================================================
   UPLOAD PHOTO
========================================================= */

async function uploadStudentPhoto(
  studentId,
  file
) {

  if (!file) {

    return null;

  }


  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();


  const safeStudentId =
    String(
      studentId
    )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      );


  const fileName =
    `${safeStudentId}-${Date.now()}.${extension}`;


  const filePath =
    `students/${safeStudentId}/${fileName}`;


  $("uploadProgress")
    .style.display =
    "block";


  $("progressBar")
    .style.width =
    "20%";


  const {
    error
  } =
    await supabaseClient
      .storage
      .from("student-photos")
      .upload(
        filePath,
        file,
        {
          cacheControl:
            "3600",

          upsert:
            false,

          contentType:
            file.type
        }
      );


  if (error) {

    $("uploadProgress")
      .style.display =
      "none";

    throw error;

  }


  $("progressBar")
    .style.width =
    "80%";


  const {
    data
  } =
    supabaseClient
      .storage
      .from("student-photos")
      .getPublicUrl(
        filePath
      );


  $("progressBar")
    .style.width =
    "100%";


  setTimeout(
    () => {

      $("uploadProgress")
        .style.display =
        "none";

      $("progressBar")
        .style.width =
        "0%";

    },
    500
  );


  return data.publicUrl;

}


/* =========================================================
   SAVE STUDENT
========================================================= */

async function saveStudent() {

  clearMessage();


  const saveBtn =
    $("saveBtn");


  saveBtn.disabled =
    true;


  try {

    const recordId =
      $("recordId").value;


    const institutionId =
      $("institution_id").value;


    const fullName =
      $("full_name")
        .value
        .trim();


    if (!institutionId) {

      throw new Error(
        "Please select an institution."
      );

    }


    if (!fullName) {

      throw new Error(
        "Student full name is required."
      );

    }


    /*
     * Student ID
     */

    let studentId =
      $("student_id")
        .value
        .trim();


    if (!studentId) {

      studentId =
        generateStudentId();

    }


    const payload = {

      institution_id:
        institutionId,

      student_id:
        studentId,

      full_name:
        fullName,

      gender:
        $("gender").value ||
        null,

      date_of_birth:
        $("date_of_birth").value ||
        null,

      phone:
        $("phone").value.trim() ||
        null,

      email:
        $("email").value.trim() ||
        null,

      address:
        $("address").value.trim() ||
        null,

      admission_date:
        $("admission_date").value ||
        todayISO(),

      status:
        $("status").value ||
        "active"

    };


    /*
     * UPDATE
     */

    if (recordId) {

      /*
       * Upload new photo first
       */

      if (
        selectedPhotoFile
      ) {

        showMessage(
          "Uploading student photo...",
          "info"
        );


        const photoUrl =
          await uploadStudentPhoto(
            studentId,
            selectedPhotoFile
          );


        payload.photo_url =
          photoUrl;

      }


      const {
        error
      } =
        await supabaseClient
          .from("students")
          .update(
            payload
          )
          .eq(
            "id",
            recordId
          );


      if (error) {

        throw error;

      }


      showMessage(
        "Student updated successfully.",
        "success"
      );

    }


    /*
     * INSERT
     */

    else {

      /*
       * Upload photo before
       * database insert so
       * photo_url is available.
       */

      if (
        selectedPhotoFile
      ) {

        showMessage(
          "Uploading student photo...",
          "info"
        );


        const photoUrl =
          await uploadStudentPhoto(
            studentId,
            selectedPhotoFile
          );


        payload.photo_url =
          photoUrl;

      }


      const {
        data,
        error
      } =
        await supabaseClient
          .from("students")
          .insert(
            payload
          )
          .select()
          .single();


      if (error) {

        throw error;

      }


      console.log(
        "Student created:",
        data
      );


      showMessage(
        "Student registered successfully.",
        "success"
      );

    }


    await loadStudents();


    resetForm(
      false
    );


  } catch (error) {

    console.error(
      "Save student error:",
      error
    );


    showMessage(
      error?.message ||
      "Unable to save student.",
      "error"
    );

  } finally {

    saveBtn.disabled =
      false;

  }

}


/* =========================================================
   GENERATE STUDENT ID
========================================================= */

function generateStudentId() {

  const year =
    new Date()
      .getFullYear();


  const random =
    Math.floor(
      100000 +
      Math.random() *
      900000
    );


  return `GA-${year}-${random}`;

}


/* =========================================================
   EDIT STUDENT
========================================================= */

function editStudent(
  id
) {

  clearMessage();


  const student =
    students.find(
      s =>
        String(s.id) ===
        String(id)
    );


  if (!student) {

    showMessage(
      "Student record not found.",
      "error"
    );

    return;

  }


  $("formTitle")
    .textContent =
    "Edit Student";


  $("recordId")
    .value =
    student.id;


  $("institution_id")
    .value =
    student.institution_id ||
    "";


  $("student_id")
    .value =
    student.student_id ||
    "";


  $("full_name")
    .value =
    student.full_name ||
    "";


  $("gender")
    .value =
    student.gender ||
    "";


  $("date_of_birth")
    .value =
    student.date_of_birth ||
    "";


  $("phone")
    .value =
    student.phone ||
    "";


  $("email")
    .value =
    student.email ||
    "";


  $("address")
    .value =
    student.address ||
    "";


  $("admission_date")
    .value =
    student.admission_date ||
    "";


  $("status")
    .value =
    student.status ||
    "active";


  $("oldPhotoUrl")
    .value =
    student.photo_url ||
    "";


  selectedPhotoFile =
    null;


  $("photoInput")
    .value =
    "";


  if (
    student.photo_url
  ) {

    $("photoPlaceholder")
      .style.display =
      "none";


    $("photoPreview")
      .src =
      student.photo_url;


    $("photoPreview")
      .style.display =
      "block";

  }

  else {

    $("photoPlaceholder")
      .style.display =
      "flex";


    $("photoPreview")
      .style.display =
      "none";

  }


  $("saveBtn")
    .textContent =
    "UPDATE STUDENT";


  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

}


/* =========================================================
   RESET FORM
========================================================= */

function resetForm(
  showMessageAfter = true
) {

  $("recordId")
    .value =
    "";


  $("oldPhotoUrl")
    .value =
    "";


  $("student_id")
    .value =
    "";


  $("full_name")
    .value =
    "";


  $("gender")
    .value =
    "";


  $("date_of_birth")
    .value =
    "";


  $("phone")
    .value =
    "";


  $("email")
    .value =
    "";


  $("address")
    .value =
    "";


  $("admission_date")
    .value =
    todayISO();


  $("status")
    .value =
    "active";


  $("photoInput")
    .value =
    "";


  selectedPhotoFile =
    null;


  $("photoPreview")
    .removeAttribute(
      "src"
    );


  $("photoPreview")
    .style.display =
    "none";


  $("photoPlaceholder")
    .style.display =
    "flex";


  $("formTitle")
    .textContent =
    "Add Student";


  $("saveBtn")
    .textContent =
    "SAVE STUDENT";


  if (
    currentProfile?.role !==
    "super_admin"
  ) {

    $("institution_id")
      .value =
      currentProfile
        ?.institution_id ||
      "";

  }

  else {

    $("institution_id")
      .value =
      "";

  }


  if (
    showMessageAfter
  ) {

    clearMessage();

  }

}


/* =========================================================
   VIEW STUDENT PROFILE
========================================================= */

function viewStudent(
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
      "Student record not found.",
      "error"
    );

    return;

  }


  const institution =
    institutions.find(
      i =>
        i.id ===
        student.institution_id
    );


  const photo =
    student.photo_url ||
    defaultAvatar(
      student.full_name
    );


  const status =
    normalizeStatus(
      student.status
    ) || "inactive";


  $("profileContent")
    .innerHTML = `

      <div class="profile-top">

        <img
          class="profile-photo"
          src="${escapeHtml(photo)}"
          alt="Student Photo"
          onerror="
            this.src='${defaultAvatar(
              student.full_name
            )}'
          "
        >

        <div>

          <div class="profile-name">
            ${escapeHtml(
              student.full_name ||
              "Unnamed Student"
            )}
          </div>

          <div class="profile-id">
            Student ID:
            ${escapeHtml(
              student.student_id ||
              "—"
            )}
          </div>

          <div style="margin-top:8px">

            <span
              class="badge ${statusClass(
                status
              )}"
            >
              ${escapeHtml(
                status
              )}
            </span>

          </div>

        </div>

      </div>


      <div class="profile-grid">

        ${profileItem(
          "Institution",
          institution?.name || "—"
        )}

        ${profileItem(
          "Gender",
          student.gender || "—"
        )}

        ${profileItem(
          "Date of Birth",
          student.date_of_birth || "—"
        )}

        ${profileItem(
          "Phone",
          student.phone || "—"
        )}

        ${profileItem(
          "Email",
          student.email || "—"
        )}

        ${profileItem(
          "Admission Date",
          student.admission_date || "—"
        )}

        ${profileItem(
          "Address",
          student.address || "—"
        )}

        ${profileItem(
          "Photo",
          student.photo_url
            ? "Uploaded"
            : "No photo"
        )}

      </div>

    `;


  $("profileModal")
    .classList
    .add("show");

}


function profileItem(
  label,
  value
) {

  return `

    <div class="profile-item">

      <div class="profile-label">
        ${escapeHtml(
          label
        )}
      </div>

      <div class="profile-value">
        ${escapeHtml(
          value
        )}
      </div>

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


$("profileModal")
  .addEventListener(
    "click",
    function(event) {

      if (
        event.target ===
        $("profileModal")
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

  if (!canDelete()) {

    showMessage(
      "You do not have permission to delete students.",
      "error"
    );

    return;

  }


  const student =
    students.find(
      s =>
        String(s.id) ===
        String(id)
    );


  if (!student) {

    return;

  }


  const confirmed =
    window.confirm(
      `Delete student "${student.full_name}"?\n\nThis action cannot be undone.`
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

      throw error;

    }


    showMessage(
      "Student deleted successfully.",
      "success"
    );


    await loadStudents();


  } catch (error) {

    console.error(
      "Delete student error:",
      error
    );


    showMessage(
      error?.message ||
      "Unable to delete student.",
      "error"
    );

  }

}


/* =========================================================
   NAVIGATION
========================================================= */

function goDashboard() {

  window.location.href =
    "dashboard.html";

}


/* =========================================================
   INITIALIZE
========================================================= */

async function initialize() {

  try {

    clearMessage();


    const authenticated =
      await checkAuth();


    if (!authenticated)
      return;


    await loadCurrentProfile();


    await loadInstitutions();


    resetForm(
      false
    );


    await loadStudents();


    console.log(
      "GAAWOW EMS Students Module V2 loaded successfully."
    );


  } catch (error) {

    console.error(
      "Students module initialization error:",
      error
    );


    showMessage(
      error?.message ||
      "Unable to load Students Module.",
      "error"
    );

  }

}


/* =========================================================
   START
========================================================= */

initialize();
