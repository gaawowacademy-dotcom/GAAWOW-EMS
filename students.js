/* =========================================================
   GAAWOW EMS
   STUDENTS MODULE V2 FINAL

   DATABASE-SAFE
   Based on the verified working Students schema.

   Supabase:
   - profiles
   - institutions
   - students

   Roles:
   - super_admin
   - school_admin
   - teacher
   - student
   - parent
   ========================================================= */


/* =========================================================
   1. SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


if (
  !window.supabase ||
  typeof window.supabase.createClient !== "function"
) {
  console.error(
    "Supabase CDN was not loaded."
  );

  throw new Error(
    "Supabase library unavailable."
  );
}


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   2. GLOBAL STATE
   ========================================================= */

let students = [];
let institutions = [];

let currentUser = null;
let currentProfile = null;

let currentRole = null;
let currentInstitutionId = null;

let editingStudentId = null;


/* =========================================================
   3. DOM REFERENCES
   ========================================================= */

const studentsBody =
  document.getElementById(
    "studentsBody"
  );

const institutionSelect =
  document.getElementById(
    "institutionId"
  );

const searchInput =
  document.getElementById(
    "searchInput"
  );

const statusFilter =
  document.getElementById(
    "statusFilter"
  );


/* =========================================================
   4. MESSAGE HELPER
   ========================================================= */

function showMessage(
  message,
  type = "info"
) {

  console.log(
    `[${type}] ${message}`
  );


  let box =
    document.getElementById(
      "message"
    );


  if (!box) {

    box =
      document.createElement(
        "div"
      );

    box.id =
      "message";

    box.style.position =
      "fixed";

    box.style.top =
      "20px";

    box.style.right =
      "20px";

    box.style.zIndex =
      "99999";

    box.style.padding =
      "12px 18px";

    box.style.borderRadius =
      "8px";

    box.style.fontWeight =
      "600";

    box.style.maxWidth =
      "420px";

    document.body.appendChild(
      box
    );
  }


  box.textContent =
    message;


  if (type === "error") {

    box.style.background =
      "#DC2626";

    box.style.color =
      "#FFFFFF";

  } else if (
    type === "success"
  ) {

    box.style.background =
      "#16A34A";

    box.style.color =
      "#FFFFFF";

  } else {

    box.style.background =
      "#0B4DA2";

    box.style.color =
      "#FFFFFF";
  }


  box.style.display =
    "block";


  clearTimeout(
    box._hideTimer
  );


  box._hideTimer =
    setTimeout(
      () => {

        box.style.display =
          "none";

      },
      6000
    );
}


/* =========================================================
   5. LOADING HELPERS
   ========================================================= */

function showInstitutionLoading() {

  if (!institutionSelect) {
    return;
  }


  institutionSelect.innerHTML = `
    <option value="">
      Loading institutions...
    </option>
  `;
}


function showStudentLoading() {

  if (!studentsBody) {
    return;
  }


  studentsBody.innerHTML = `
    <tr>
      <td
        colspan="7"
        class="loading"
      >
        Loading students...
      </td>
    </tr>
  `;
}


/* =========================================================
   6. SESSION
   ========================================================= */

async function checkSession() {

  try {

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
        "Unable to check session: " +
        error.message,
        "error"
      );

      return false;
    }


    if (
      !data ||
      !data.session
    ) {

      window.location.href =
        "index.html";

      return false;
    }


    currentUser =
      data.session.user;


    return true;

  } catch (error) {

    console.error(
      "Unexpected session error:",
      error
    );

    showMessage(
      "Unexpected session error.",
      "error"
    );

    return false;
  }
}


/* =========================================================
   7. LOAD CURRENT PROFILE
   ========================================================= */

async function loadCurrentProfile() {

  try {

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
        .single();


    if (error) {

      console.error(
        "Profile error:",
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
      "Current profile:",
      currentProfile
    );


    /* -----------------------------------------
       ACTIVE CHECK
       ----------------------------------------- */

    if (
      profile.is_active === false
    ) {

      await supabaseClient.auth.signOut();

      window.location.href =
        "index.html";

      return false;
    }


    return true;

  } catch (error) {

    console.error(
      "Unexpected profile error:",
      error
    );

    showMessage(
      "Unexpected profile error.",
      "error"
    );

    return false;
  }
}


/* =========================================================
   8. LOAD INSTITUTIONS
   ========================================================= */

async function loadInstitutions() {

  if (!institutionSelect) {

    console.warn(
      "institutionId select not found in HTML."
    );

    return false;
  }


  showInstitutionLoading();


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
      institutions
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


    /* -----------------------------------------
       SUPER ADMIN
       ----------------------------------------- */

    if (
      currentRole ===
      "super_admin"
    ) {

      institutionSelect.disabled =
        false;

      institutionSelect.required =
        true;

    } else {

      institutionSelect.disabled =
        true;

      institutionSelect.required =
        false;


      if (
        currentInstitutionId
      ) {

        institutionSelect.value =
          currentInstitutionId;
      }
    }


    return true;

  } catch (error) {

    console.error(
      "Unexpected institution error:",
      error
    );


    institutionSelect.innerHTML = `
      <option value="">
        Unable to load institutions
      </option>
    `;


    showMessage(
      "Unexpected institution loading error.",
      "error"
    );


    return false;
  }
}


/* =========================================================
   9. LOAD STUDENTS
   EXACT VERIFIED STUDENTS SCHEMA
   ========================================================= */

async function loadStudents() {

  if (!studentsBody) {

    console.error(
      "studentsBody was not found."
    );

    showMessage(
      "Students table container not found in students.html.",
      "error"
    );

    return false;
  }


  showStudentLoading();


  try {

    /* -----------------------------------------
       BASE QUERY
       ----------------------------------------- */

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


    /* -----------------------------------------
       SUPER ADMIN
       ALL STUDENTS
       ----------------------------------------- */

    if (
      currentRole ===
      "super_admin"
    ) {

      console.log(
        "Super Admin: loading ALL students."
      );

      // IMPORTANT:
      // No institution filter.

    } else {

      /* ---------------------------------------
         OTHER ROLES
         --------------------------------------- */

      if (
        !currentInstitutionId
      ) {

        students = [];


        studentsBody.innerHTML = `
          <tr>
            <td
              colspan="7"
              class="empty"
            >
              Institution not assigned to this account.
            </td>
          </tr>
        `;


        showMessage(
          "Institution not assigned to this account.",
          "error"
        );


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


    /* -----------------------------------------
       EXECUTE
       ----------------------------------------- */

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


      students = [];


      studentsBody.innerHTML = `
        <tr>
          <td
            colspan="7"
            class="empty"
          >
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
      "Students loaded:",
      students.length,
      students
    );


    renderStudents();


    return true;

  } catch (error) {

    console.error(
      "Unexpected students error:",
      error
    );


    students = [];


    studentsBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="empty"
        >
          Unexpected error while loading students.
        </td>
      </tr>
    `;


    showMessage(
      "Unexpected students loading error.",
      "error"
    );


    return false;
  }
}


/* =========================================================
   10. RENDER STUDENTS
   ========================================================= */

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


  const selectedStatus =
    statusFilter
      ? statusFilter.value
      : "";


  let filtered =
    [...students];


  /* -----------------------------------------
     SEARCH
     ----------------------------------------- */

  if (search) {

    filtered =
      filtered.filter(
        student => {

          const text =
            [
              student.student_id,
              student.full_name,
              student.gender,
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


  /* -----------------------------------------
     STATUS
     ----------------------------------------- */

  if (
    selectedStatus
  ) {

    filtered =
      filtered.filter(
        student =>
          student.status ===
          selectedStatus
      );
  }


  /* -----------------------------------------
     EMPTY
     ----------------------------------------- */

  if (
    filtered.length === 0
  ) {

    studentsBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="empty"
        >
          No students found.
        </td>
      </tr>
    `;

    return;
  }


  /* -----------------------------------------
     ROWS
     ----------------------------------------- */

  studentsBody.innerHTML =
    filtered
      .map(
        student =>
          `
          <tr>

            <td>
              ${escapeHtml(
                student.student_id || ""
              )}
            </td>

            <td>
              ${escapeHtml(
                student.full_name || ""
              )}
            </td>

            <td>
              ${escapeHtml(
                student.gender || ""
              )}
            </td>

            <td>
              ${escapeHtml(
                student.phone || ""
              )}
            </td>

            <td>
              ${escapeHtml(
                student.email || ""
              )}
            </td>

            <td>
              ${escapeHtml(
                student.status || ""
              )}
            </td>

            <td>
              <button
                type="button"
                onclick="editStudent('${student.id}')"
              >
                Edit
              </button>

              <button
                type="button"
                onclick="deleteStudent('${student.id}')"
              >
                Delete
              </button>
            </td>

          </tr>
          `
      )
      .join("");
}


/* =========================================================
   11. HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


/* =========================================================
   12. SEARCH EVENTS
   ========================================================= */

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


/* =========================================================
   13. EDIT STUDENT
   ========================================================= */

function editStudent(id) {

  const student =
    students.find(
      item =>
        item.id === id
    );


  if (!student) {

    showMessage(
      "Student not found.",
      "error"
    );

    return;
  }


  editingStudentId =
    id;


  const fields = {

    institutionId:
      student.institution_id,

    studentId:
      student.student_id,

    fullName:
      student.full_name,

    gender:
      student.gender,

    dateOfBirth:
      student.date_of_birth,

    phone:
      student.phone,

    email:
      student.email,

    address:
      student.address,

    admissionDate:
      student.admission_date,

    status:
      student.status,

    emergencyContactName:
      student.emergency_contact_name,

    emergencyContactPhone:
      student.emergency_contact_phone,

    photoUrl:
      student.photo_url
  };


  Object.entries(
    fields
  ).forEach(
    ([id, value]) => {

      const input =
        document.getElementById(
          id
        );


      if (input) {

        input.value =
          value || "";
      }
    }
  );


  const modal =
    document.getElementById(
      "studentModal"
    );


  if (modal) {

    modal.style.display =
      "flex";
  }
}


window.editStudent =
  editStudent;


/* =========================================================
   14. DELETE STUDENT
   ========================================================= */

async function deleteStudent(id) {

  const student =
    students.find(
      item =>
        item.id === id
    );


  if (!student) {

    showMessage(
      "Student not found.",
      "error"
    );

    return;
  }


  const confirmed =
    window.confirm(
      `Delete student "${student.full_name}"?`
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
      "Unable to delete student: " +
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


window.deleteStudent =
  deleteStudent;


/* =========================================================
   15. CLOSE MODAL
   ========================================================= */

function closeStudentModal() {

  const modal =
    document.getElementById(
      "studentModal"
    );


  if (modal) {

    modal.style.display =
      "none";
  }


  editingStudentId =
    null;
}


window.closeStudentModal =
  closeStudentModal;


/* =========================================================
   16. RESET FORM
   ========================================================= */

function resetStudentForm() {

  const form =
    document.getElementById(
      "studentForm"
    );


  if (form) {

    form.reset();
  }


  editingStudentId =
    null;


  if (
    currentRole !==
    "super_admin" &&
    institutionSelect &&
    currentInstitutionId
  ) {

    institutionSelect.value =
      currentInstitutionId;
  }
}


/* =========================================================
   17. START STUDENTS PAGE
   ========================================================= */

async function startStudentsPage() {

  console.log(
    "========================================"
  );

  console.log(
    "GAAWOW EMS Students V2 FINAL starting..."
  );

  console.log(
    "Supabase URL:",
    SUPABASE_URL
  );

  console.log(
    "========================================"
  );


  /* -----------------------------------------
     DOM CHECK
     ----------------------------------------- */

  if (!studentsBody) {

    console.error(
      "studentsBody missing."
    );

    showMessage(
      "studentsBody is missing from students.html.",
      "error"
    );

    return;
  }


  /* -----------------------------------------
     SESSION
     ----------------------------------------- */

  const authenticated =
    await checkSession();


  if (!authenticated) {
    return;
  }


  /* -----------------------------------------
     PROFILE
     ----------------------------------------- */

  const profileLoaded =
    await loadCurrentProfile();


  if (!profileLoaded) {
    return;
  }


  /* -----------------------------------------
     LOAD INSTITUTIONS
     ----------------------------------------- */

  await loadInstitutions();


  /* -----------------------------------------
     LOAD STUDENTS
     ----------------------------------------- */

  await loadStudents();


  console.log(
    "========================================"
  );

  console.log(
    "Students V2 FINAL ready."
  );

  console.log(
    "========================================"
  );
}


/* =========================================================
   18. START ONLY ONCE
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      startStudentsPage();

    },
    {
      once: true
    }
  );

} else {

  startStudentsPage();
}
