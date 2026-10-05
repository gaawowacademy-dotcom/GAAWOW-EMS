/* ============================================================
   GAAWOW EMS
   STUDENTS MODULE V6.1
   Student Management + Student Login Accounts
   SUPER ADMIN ONLY
   ============================================================ */

"use strict";

/* ============================================================
   CONFIG
   ============================================================ */

const STUDENTS_TABLE = "students";
const PROFILES_TABLE = "profiles";
const EDGE_FUNCTION = "create-student-account";

/*
  IMPORTANT:
  Your HTML must already create the Supabase client as:

  window.supabaseClient

  Example in HTML:

  const supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
  );

  window.supabaseClient = supabaseClient;

  NEVER put service-role/secret key in this file.
*/

/* ============================================================
   GLOBAL STATE
   ============================================================ */

let currentUser = null;
let currentProfile = null;

let studentsCache = [];
let currentStudent = null;
let editingStudentId = null;

let isLoadingStudents = false;
let isSavingStudent = false;
let isCreatingAccount = false;

/* ============================================================
   DOM HELPERS
   ============================================================ */

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function getElement(...selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);

    if (element) {
      return element;
    }
  }

  return null;
}

function byId(id) {
  return document.getElementById(id);
}

/* ============================================================
   MESSAGE / TOAST
   ============================================================ */

function showMessage(message, type = "info") {
  const messageEl = getElement(
    "#message",
    "#messages",
    "#studentMessage",
    "#formMessage"
  );

  if (!messageEl) {
    console.log(`[${type}] ${message}`);
    return;
  }

  messageEl.textContent = message;

  messageEl.classList.remove(
    "hidden",
    "success",
    "error",
    "warning",
    "info"
  );

  messageEl.classList.add(type);

  clearTimeout(showMessage.timer);

  showMessage.timer = setTimeout(() => {
    messageEl.classList.add("hidden");
  }, 6000);
}

function showSuccess(message) {
  showMessage(message, "success");
}

function showError(message) {
  showMessage(message, "error");
}

function showWarning(message) {
  showMessage(message, "warning");
}

/* ============================================================
   SUPABASE CLIENT
   ============================================================ */

function getSupabase() {
  if (window.supabaseClient) {
    return window.supabaseClient;
  }

  /*
    Some existing versions may use:
    window.sb
    window.supabaseApp
  */

  if (window.sb) {
    return window.sb;
  }

  if (window.supabaseApp) {
    return window.supabaseApp;
  }

  throw new Error(
    "Supabase client not found. Make sure window.supabaseClient is initialized before students.js."
  );
}

/* ============================================================
   SESSION
   ============================================================ */

async function getCurrentSession() {
  const supabase = getSupabase();

  const {
    data,
    error
  } = await supabase.auth.getSession();

  if (error) {
    console.error("GET SESSION ERROR:", error);
    throw new Error("Unable to read login session.");
  }

  return data?.session || null;
}

/* ============================================================
   SUPER ADMIN AUTH CHECK
   ============================================================ */

async function verifySuperAdmin() {
  try {
    const supabase = getSupabase();

    const session = await getCurrentSession();

    if (!session || !session.access_token) {
      currentUser = null;
      currentProfile = null;

      showError(
        "Access denied or login session expired. Please login again."
      );

      return false;
    }

    currentUser = session.user;

    /*
      IMPORTANT:
      Do NOT trust only user_metadata.role.

      Database profile is the source of truth.
    */

    const {
      data: profile,
      error: profileError
    } = await supabase
      .from(PROFILES_TABLE)
      .select("id, full_name, role, is_active")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("PROFILE ERROR:", profileError);

      showError(
        "Unable to verify your Super Admin profile."
      );

      return false;
    }

    if (!profile) {
      currentProfile = null;

      showError(
        "Your account does not have a Super Admin profile."
      );

      return false;
    }

    if (profile.role !== "super_admin") {
      currentProfile = profile;

      showError(
        "Super Admin access required."
      );

      return false;
    }

    if (profile.is_active !== true) {
      currentProfile = profile;

      showError(
        "Your Super Admin account is inactive."
      );

      return false;
    }

    currentProfile = profile;

    return true;

  } catch (error) {
    console.error("VERIFY SUPER ADMIN ERROR:", error);

    showError(
      error?.message ||
      "Unable to verify Super Admin access."
    );

    return false;
  }
}

/* ============================================================
   AUTH STATE LISTENER
   ============================================================ */

function setupAuthListener() {
  try {
    const supabase = getSupabase();

    supabase.auth.onAuthStateChange((event, session) => {
      console.log("AUTH EVENT:", event);

      if (!session) {
        currentUser = null;
        currentProfile = null;
      }
    });

  } catch (error) {
    console.error("AUTH LISTENER ERROR:", error);
  }
}

/* ============================================================
   ESCAPE HTML
   ============================================================ */

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

/* ============================================================
   FORMAT DATE
   ============================================================ */

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

/* ============================================================
   EMAIL VALIDATION
   ============================================================ */

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email || "").trim()
  );
}

/* ============================================================
   PASSWORD GENERATOR
   ============================================================ */

function generateTemporaryPassword(length = 12) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%";

  const all =
    upper +
    lower +
    numbers +
    symbols;

  let password = "";

  password += upper[
    Math.floor(Math.random() * upper.length)
  ];

  password += lower[
    Math.floor(Math.random() * lower.length)
  ];

  password += numbers[
    Math.floor(Math.random() * numbers.length)
  ];

  password += symbols[
    Math.floor(Math.random() * symbols.length)
  ];

  while (password.length < length) {
    password += all[
      Math.floor(Math.random() * all.length)
    ];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/* ============================================================
   CLIPBOARD
   ============================================================ */

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));

    showSuccess("Copied successfully.");

  } catch (error) {
    console.error("COPY ERROR:", error);

    /*
      Fallback for older mobile browsers.
    */

    const textarea = document.createElement("textarea");

    textarea.value = String(text);

    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);

    textarea.select();

    try {
      document.execCommand("copy");
      showSuccess("Copied successfully.");
    } catch {
      showError("Could not copy automatically.");
    }

    textarea.remove();
  }
}

/* ============================================================
   LOAD STUDENTS
   ============================================================ */

async function loadStudents() {
  if (isLoadingStudents) {
    return;
  }

  isLoadingStudents = true;

  const tableBody = getElement(
    "#studentsTableBody",
    "#studentTableBody",
    "#students-table-body"
  );

  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="20" style="text-align:center;padding:30px;">
          Loading students...
        </td>
      </tr>
    `;
  }

  try {
    const allowed = await verifySuperAdmin();

    if (!allowed) {
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="20" style="text-align:center;padding:30px;">
              Access denied.
            </td>
          </tr>
        `;
      }

      return;
    }

    const supabase = getSupabase();

    const {
      data,
      error
    } = await supabase
      .from(STUDENTS_TABLE)
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
        updated_at,
        account_enabled,
        auth_user_id,
        login_username,
        account_created_at,
        last_login_at,
        password_changed_at
      `)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      console.error("LOAD STUDENTS ERROR:", error);

      throw new Error(
        error.message ||
        "Unable to load students."
      );
    }

    studentsCache = data || [];

    renderStudents(studentsCache);

  } catch (error) {
    console.error("LOAD STUDENTS ERROR:", error);

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="20" style="text-align:center;padding:30px;color:#b91c1c;">
            ${escapeHtml(
              error?.message ||
              "Unable to load students."
            )}
          </td>
        </tr>
      `;
    }

    showError(
      error?.message ||
      "Unable to load students."
    );

  } finally {
    isLoadingStudents = false;
  }
}

/* ============================================================
   ACCOUNT STATUS
   ============================================================ */

function getAccountStatus(student) {
  if (
    student?.auth_user_id &&
    student?.account_enabled === true
  ) {
    return {
      text: "Account Active",
      className: "account-active"
    };
  }

  if (student?.auth_user_id) {
    return {
      text: "Account Disabled",
      className: "account-disabled"
    };
  }

  return {
    text: "No Account",
    className: "no-account"
  };
}

/* ============================================================
   RENDER STUDENTS
   ============================================================ */

function renderStudents(students) {
  const tableBody = getElement(
    "#studentsTableBody",
    "#studentTableBody",
    "#students-table-body"
  );

  if (!tableBody) {
    console.warn(
      "studentsTableBody was not found."
    );

    return;
  }

  if (!students || students.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="20" style="text-align:center;padding:30px;">
          No students found.
        </td>
      </tr>
    `;

    return;
  }

  tableBody.innerHTML = students
    .map((student, index) => {

      const account = getAccountStatus(student);

      const gender =
        student.gender
          ? escapeHtml(student.gender)
          : "—";

      const phone =
        student.phone
          ? escapeHtml(student.phone)
          : "—";

      const email =
        student.email
          ? escapeHtml(student.email)
          : "—";

      const status =
        student.status
          ? escapeHtml(student.status)
          : "—";

      return `
        <tr data-student-id="${escapeHtml(student.id)}">

          <td>
            ${index + 1}
          </td>

          <td>
            ${escapeHtml(student.student_id || "—")}
          </td>

          <td>
            <strong>
              ${escapeHtml(student.full_name || "—")}
            </strong>
          </td>

          <td>
            ${gender}
          </td>

          <td>
            ${phone}
          </td>

          <td>
            ${email}
          </td>

          <td>
            <span class="status-badge">
              ${status}
            </span>
          </td>

          <td>
            ${formatDate(student.admission_date)}
          </td>

          <td>
            <span class="account-badge ${account.className}">
              ${escapeHtml(account.text)}
            </span>
          </td>

          <td>
            <div class="student-actions">

              <button
                type="button"
                class="student-action view-student-btn"
                data-id="${escapeHtml(student.id)}"
              >
                View
              </button>

              <button
                type="button"
                class="student-action edit-student-btn"
                data-id="${escapeHtml(student.id)}"
              >
                Edit
              </button>

              ${
                student.auth_user_id
                  ? `
                    <button
                      type="button"
                      class="student-action reset-password-btn"
                      data-id="${escapeHtml(student.id)}"
                    >
                      Reset Password
                    </button>
                  `
                  : `
                    <button
                      type="button"
                      class="student-action create-account-btn"
                      data-id="${escapeHtml(student.id)}"
                    >
                      Create Account
                    </button>
                  `
              }

              <button
                type="button"
                class="student-action delete-student-btn"
                data-id="${escapeHtml(student.id)}"
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

/* ============================================================
   SEARCH / FILTER
   ============================================================ */

function filterStudents() {
  const searchInput = getElement(
    "#studentSearch",
    "#searchStudent",
    "#studentSearchInput"
  );

  const statusSelect = getElement(
    "#statusFilter",
    "#studentStatusFilter"
  );

  const search =
    String(searchInput?.value || "")
      .trim()
      .toLowerCase();

  const status =
    String(statusSelect?.value || "")
      .trim()
      .toLowerCase();

  const filtered = studentsCache.filter(student => {

    const searchable = [
      student.student_id,
      student.full_name,
      student.phone,
      student.email,
      student.gender,
      student.status
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search ||
      searchable.includes(search);

    const matchesStatus =
      !status ||
      status === "all" ||
      String(student.status || "")
        .toLowerCase() === status;

    return matchesSearch && matchesStatus;
  });

  renderStudents(filtered);
}

/* ============================================================
   FIND STUDENT
   ============================================================ */

function findStudent(studentDbId) {
  return studentsCache.find(
    student =>
      String(student.id) === String(studentDbId)
  ) || null;
}

/* ============================================================
   OPEN STUDENT ACCOUNT MODAL
   ============================================================ */

function openStudentAccountModal(student, mode = "create") {
  if (!student) {
    showError("Student record was not found.");
    return;
  }

  currentStudent = student;

  ensureStudentAccountModal();

  const modal = byId("studentAccountModal");

  const createView =
    byId("studentAccountCreateView");

  const successView =
    byId("studentAccountSuccessView");

  const title =
    byId("studentAccountModalTitle");

  const studentName =
    byId("studentAccountStudentName");

  const studentId =
    byId("studentAccountStudentId");

  const email =
    byId("studentAccountEmail");

  const username =
    byId("studentAccountUsername");

  const password =
    byId("studentAccountPassword");

  const createBtn =
    byId("createStudentAccountBtn");

  if (!modal) {
    return;
  }

  if (title) {
    title.textContent =
      mode === "reset"
        ? "Reset Student Password"
        : "Create Student Login Account";
  }

  if (studentName) {
    studentName.textContent =
      student.full_name || "—";
  }

  if (studentId) {
    studentId.textContent =
      student.student_id || "—";
  }

  const studentEmail =
    String(student.email || "")
      .trim()
      .toLowerCase();

  if (email) {
    email.value = studentEmail;
  }

  if (username) {
    username.value =
      student.login_username ||
      studentEmail ||
      "";
  }

  if (password) {
    password.value =
      generateTemporaryPassword(12);

    password.type = "password";
  }

  if (createBtn) {
    createBtn.textContent =
      mode === "reset"
        ? "Reset Password"
        : "Create Account";

    createBtn.dataset.mode = mode;
  }

  if (createView) {
    createView.classList.remove("hidden");
  }

  if (successView) {
    successView.classList.add("hidden");
  }

  modal.classList.remove("hidden");

  document.body.classList.add(
    "student-account-modal-open"
  );

  setTimeout(() => {
    password?.focus();
  }, 100);
}

/* ============================================================
   CLOSE ACCOUNT MODAL
   ============================================================ */

function closeStudentAccountModal() {
  const modal =
    byId("studentAccountModal");

  if (!modal) {
    return;
  }

  modal.classList.add("hidden");

  document.body.classList.remove(
    "student-account-modal-open"
  );

  currentStudent = null;
}

/* ============================================================
   CREATE / RESET ACCOUNT
   ============================================================ */

async function submitStudentAccount(mode = "create") {
  if (isCreatingAccount) {
    return;
  }

  if (!currentStudent) {
    showError(
      "No student has been selected."
    );

    return;
  }

  const passwordEl =
    byId("studentAccountPassword");

  const emailEl =
    byId("studentAccountEmail");

  const password =
    String(passwordEl?.value || "");

  const email =
    String(emailEl?.value || "")
      .trim()
      .toLowerCase();

  if (!email || !validEmail(email)) {
    showError(
      "Please enter a valid student email."
    );

    emailEl?.focus();

    return;
  }

  if (password.length < 8) {
    showError(
      "Password must contain at least 8 characters."
    );

    passwordEl?.focus();

    return;
  }

  if (mode === "create" &&
      currentStudent.auth_user_id) {

    showWarning(
      "This student already has an account. Use Reset Password."
    );

    return;
  }

  if (mode === "reset" &&
      !currentStudent.auth_user_id) {

    showWarning(
      "This student does not have an account yet. Create the account first."
    );

    return;
  }

  isCreatingAccount = true;

  const button =
    byId("createStudentAccountBtn");

  const originalText =
    button?.textContent ||
    "";

  if (button) {
    button.disabled = true;
    button.textContent =
      mode === "reset"
        ? "Resetting..."
        : "Creating...";
  }

  try {
    const supabase = getSupabase();

    /*
      ----------------------------------------------------------
      IMPORTANT FIX
      ----------------------------------------------------------
      Explicitly get the CURRENT ACCESS TOKEN.

      This prevents:

      "Authorization header is required."

      from happening when invoke() does not have a usable session.
    */

    const session =
      await getCurrentSession();

    if (!session?.access_token) {
      throw new Error(
        "Your login session has expired. Please login again."
      );
    }

    /*
      Verify Super Admin one more time immediately
      before performing the sensitive operation.
    */

    const allowed =
      await verifySuperAdmin();

    if (!allowed) {
      throw new Error(
        "Super Admin access required."
      );
    }

    const action =
      mode === "reset"
        ? "reset"
        : "create";

    /*
      IMPORTANT:
      student_db_id is the UUID primary key
      from students.id.

      This is NOT student_id such as GA-2026-000118.
    */

    const payload = {
      action,

      student_db_id:
        currentStudent.id,

      student_id:
        currentStudent.student_id,

      password,

      email,

      full_name:
        currentStudent.full_name
    };

    console.log(
      "STUDENT ACCOUNT REQUEST:",
      {
        action,
        student_db_id: currentStudent.id,
        student_id: currentStudent.student_id,
        email
      }
    );

    /*
      Explicit Authorization header.
    */

    const {
      data,
      error
    } = await supabase.functions.invoke(
      EDGE_FUNCTION,
      {
        body: payload,

        headers: {
          Authorization:
            `Bearer ${session.access_token}`
        }
      }
    );

    console.log(
      "STUDENT ACCOUNT RESPONSE:",
      data
    );

    if (error) {
      console.error(
        "EDGE FUNCTION ERROR:",
        error
      );

      /*
        Supabase Functions may return the HTTP error
        without exposing the JSON body directly.
      */

      let errorMessage =
        error.message ||
        "Student account operation failed.";

      if (
        String(errorMessage)
          .toLowerCase()
          .includes("unauthorized")
      ) {
        errorMessage =
          "Access denied. Please login again as Super Admin.";
      }

      throw new Error(errorMessage);
    }

    if (!data) {
      throw new Error(
        "The Edge Function returned an empty response."
      );
    }

    if (data.success !== true) {
      throw new Error(
        data.error ||
        "Student account operation failed."
      );
    }

    /*
      ----------------------------------------------------------
      SUCCESS
      ----------------------------------------------------------
    */

    showAccountSuccess({
      action,
      student: currentStudent,
      email:
        data.email ||
        email,

      username:
        data.username ||
        email,

      password,

      user_id:
        data.user_id ||
        null
    });

    /*
      Refresh database records.
    */

    await loadStudents();

  } catch (error) {
    console.error(
      "SUBMIT STUDENT ACCOUNT ERROR:",
      error
    );

    showError(
      error?.message ||
      "Unable to create/reset student account."
    );

  } finally {
    isCreatingAccount = false;

    if (button) {
      button.disabled = false;
      button.textContent =
        originalText ||
        (
          mode === "reset"
            ? "Reset Password"
            : "Create Account"
        );
    }
  }
}

/* ============================================================
   SUCCESS VIEW
   ============================================================ */

function showAccountSuccess(result) {
  const createView =
    byId("studentAccountCreateView");

  const successView =
    byId("studentAccountSuccessView");

  const successTitle =
    byId("studentAccountSuccessTitle");

  const successStudent =
    byId("studentAccountSuccessStudent");

  const successUsername =
    byId("studentAccountSuccessUsername");

  const successPassword =
    byId("studentAccountSuccessPassword");

  const successMessage =
    byId("studentAccountSuccessMessage");

  if (createView) {
    createView.classList.add("hidden");
  }

  if (successView) {
    successView.classList.remove("hidden");
  }

  if (successTitle) {
    successTitle.textContent =
      result.action === "reset"
        ? "Password Reset Successfully"
        : "Account Created Successfully";
  }

  if (successStudent) {
    successStudent.textContent =
      result.student?.full_name ||
      "Student";
  }

  if (successUsername) {
    successUsername.textContent =
      result.username ||
      result.email ||
      "—";
  }

  if (successPassword) {
    successPassword.textContent =
      result.password ||
      "—";
  }

  if (successMessage) {
    successMessage.textContent =
      result.action === "reset"
        ? "The student's password has been updated successfully."
        : "The student login account has been created successfully.";
  }
}

/* ============================================================
   ENSURE PROFESSIONAL MODAL
   ============================================================ */

function ensureStudentAccountModal() {
  if (byId("studentAccountModal")) {
    return;
  }

  const style = document.createElement("style");

  style.textContent = `
    .student-account-modal {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(10, 25, 55, .62);
      backdrop-filter: blur(6px);
    }

    .student-account-modal.hidden {
      display: none !important;
    }

    .student-account-card {
      width: min(560px, 100%);
      max-height: 92vh;
      overflow-y: auto;
      background: #fff;
      border-radius: 22px;
      box-shadow: 0 25px 70px rgba(0,0,0,.28);
      overflow: hidden;
    }

    .student-account-header {
      background: linear-gradient(
        135deg,
        #102866,
        #173d91
      );
      color: #fff;
      padding: 22px 24px;
      position: relative;
    }

    .student-account-header h2 {
      margin: 0;
      font-size: 22px;
    }

    .student-account-header p {
      margin: 7px 0 0;
      opacity: .88;
      font-size: 13px;
    }

    .student-account-close {
      position: absolute;
      top: 15px;
      right: 15px;
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 50%;
      background: rgba(255,255,255,.15);
      color: #fff;
      font-size: 23px;
      cursor: pointer;
    }

    .student-account-body {
      padding: 24px;
    }

    .student-account-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }

    .student-account-info-box {
      padding: 13px;
      background: #f5f8ff;
      border: 1px solid #e2e8f5;
      border-radius: 13px;
    }

    .student-account-label {
      display: block;
      font-size: 11px;
      color: #667085;
      margin-bottom: 5px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .student-account-value {
      font-weight: 700;
      color: #13265d;
      word-break: break-word;
    }

    .student-account-field {
      margin-bottom: 16px;
    }

    .student-account-field label {
      display: block;
      margin-bottom: 7px;
      font-size: 13px;
      font-weight: 700;
      color: #172b63;
    }

    .student-account-field input {
      width: 100%;
      box-sizing: border-box;
      height: 46px;
      border: 1px solid #d5ddec;
      border-radius: 11px;
      padding: 0 13px;
      font-size: 14px;
      outline: none;
    }

    .student-account-field input:focus {
      border-color: #315ab8;
      box-shadow: 0 0 0 3px rgba(49,90,184,.12);
    }

    .student-password-row {
      display: flex;
      gap: 8px;
    }

    .student-password-row input {
      flex: 1;
    }

    .student-password-btn {
      width: 47px;
      border: 1px solid #d5ddec;
      border-radius: 11px;
      background: #f5f7fb;
      cursor: pointer;
    }

    .student-account-note {
      background: #fff8e7;
      border: 1px solid #f5df9d;
      color: #72550b;
      border-radius: 12px;
      padding: 12px;
      font-size: 12px;
      line-height: 1.5;
      margin-top: 10px;
    }

    .student-account-security {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      background: #eef7ff;
      border: 1px solid #cfe4fb;
      border-radius: 13px;
      padding: 13px;
      margin-top: 18px;
      color: #173c70;
      font-size: 12px;
      line-height: 1.5;
    }

    .student-account-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 18px 24px;
      border-top: 1px solid #edf0f5;
    }

    .student-modal-btn {
      min-height: 44px;
      border: 0;
      border-radius: 11px;
      padding: 0 18px;
      font-weight: 700;
      cursor: pointer;
    }

    .student-modal-btn.cancel {
      background: #eef1f6;
      color: #344054;
    }

    .student-modal-btn.primary {
      background: #173b8f;
      color: #fff;
    }

    .student-modal-btn.success {
      background: #138a52;
      color: #fff;
    }

    .student-modal-btn:disabled {
      opacity: .55;
      cursor: not-allowed;
    }

    .student-account-success {
      text-align: center;
    }

    .student-success-icon {
      width: 70px;
      height: 70px;
      margin: 0 auto 15px;
      border-radius: 50%;
      background: #dcfce7;
      color: #15803d;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 35px;
    }

    .student-credential {
      margin-top: 12px;
      text-align: left;
      padding: 14px;
      background: #f7f9fc;
      border: 1px solid #e2e8f0;
      border-radius: 13px;
    }

    .student-credential-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }

    .student-credential-row code {
      flex: 1;
      padding: 10px;
      border-radius: 9px;
      background: #fff;
      border: 1px solid #e0e5ed;
      overflow-wrap: anywhere;
    }

    .copy-credential-btn {
      border: 0;
      border-radius: 8px;
      background: #e8eefc;
      color: #173b8f;
      padding: 9px 11px;
      cursor: pointer;
      font-weight: 700;
    }

    .hidden {
      display: none !important;
    }

    .account-badge {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
    }

    .account-active {
      background: #dcfce7;
      color: #166534;
    }

    .account-disabled {
      background: #fef3c7;
      color: #92400e;
    }

    .no-account {
      background: #fee2e2;
      color: #991b1b;
    }

    .student-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .student-action {
      border: 0;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }

    .view-student-btn {
      background: #e5efff;
      color: #17458f;
    }

    .edit-student-btn {
      background: #fff3c4;
      color: #815400;
    }

    .create-account-btn {
      background: #d9f8e5;
      color: #126b39;
    }

    .reset-password-btn {
      background: #eee4ff;
      color: #6530a8;
    }

    .delete-student-btn {
      background: #ffe0e0;
      color: #a32626;
    }

    @media (max-width: 600px) {
      .student-account-modal {
        padding: 10px;
      }

      .student-account-card {
        border-radius: 17px;
      }

      .student-account-info {
        grid-template-columns: 1fr;
      }

      .student-account-footer {
        flex-direction: column-reverse;
      }

      .student-modal-btn {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);

  const modal = document.createElement("div");

  modal.id = "studentAccountModal";

  modal.className =
    "student-account-modal hidden";

  modal.innerHTML = `
    <div
      class="student-account-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studentAccountModalTitle"
    >

      <div class="student-account-header">

        <button
          type="button"
          class="student-account-close"
          id="closeStudentAccountModal"
          aria-label="Close"
        >
          ×
        </button>

        <h2 id="studentAccountModalTitle">
          Create Student Login Account
        </h2>

        <p>
          Secure student login account management.
        </p>

      </div>

      <div class="student-account-body">

        <div
          id="studentAccountCreateView"
        >

          <div class="student-account-info">

            <div class="student-account-info-box">

              <span class="student-account-label">
                Student Name
              </span>

              <div
                class="student-account-value"
                id="studentAccountStudentName"
              >
                —
              </div>

            </div>

            <div class="student-account-info-box">

              <span class="student-account-label">
                Student ID
              </span>

              <div
                class="student-account-value"
                id="studentAccountStudentId"
              >
                —
              </div>

            </div>

          </div>

          <div class="student-account-field">

            <label for="studentAccountEmail">
              Email Address
            </label>

            <input
              type="email"
              id="studentAccountEmail"
              autocomplete="email"
              placeholder="student@example.com"
            />

          </div>

          <div class="student-account-field">

            <label for="studentAccountUsername">
              Login Username
            </label>

            <input
              type="text"
              id="studentAccountUsername"
              readonly
            />

          </div>

          <div class="student-account-field">

            <label for="studentAccountPassword">
              Temporary Password
            </label>

            <div class="student-password-row">

              <input
                type="password"
                id="studentAccountPassword"
                autocomplete="new-password"
                placeholder="Minimum 8 characters"
              />

              <button
                type="button"
                class="student-password-btn"
                id="toggleStudentPassword"
                title="Show/Hide Password"
              >
                👁
              </button>

              <button
                type="button"
                class="student-password-btn"
                id="generateStudentPassword"
                title="Generate Password"
              >
                🔄
              </button>

            </div>

            <div class="student-account-note">
              Password must contain at least 8 characters.
            </div>

          </div>

          <div class="student-account-security">

            <div>🔐</div>

            <div>
              <strong>Secure Account</strong><br>
              The account is created through Supabase
              securely. The Service Role / Secret key is
              never exposed to the browser.
            </div>

          </div>

        </div>

        <div
          id="studentAccountSuccessView"
          class="student-account-success hidden"
        >

          <div class="student-success-icon">
            ✓
          </div>

          <h2 id="studentAccountSuccessTitle">
            Account Created Successfully
          </h2>

          <p id="studentAccountSuccessMessage">
            The student login account has been created successfully.
          </p>

          <p>
            <strong>Student:</strong>
            <span id="studentAccountSuccessStudent">
              —
            </span>
          </p>

          <div class="student-credential">

            <strong>Username</strong>

            <div class="student-credential-row">

              <code id="studentAccountSuccessUsername">
                —
              </code>

              <button
                type="button"
                class="copy-credential-btn"
                data-copy-target="studentAccountSuccessUsername"
              >
                Copy
              </button>

            </div>

          </div>

          <div class="student-credential">

            <strong>Temporary Password</strong>

            <div class="student-credential-row">

              <code id="studentAccountSuccessPassword">
                —
              </code>

              <button
                type="button"
                class="copy-credential-btn"
                data-copy-target="studentAccountSuccessPassword"
              >
                Copy
              </button>

            </div>

          </div>

          <div class="student-account-note">
            ⚠️ Save these credentials securely.
            Give the temporary password only to the student.
          </div>

        </div>

      </div>

      <div class="student-account-footer">

        <button
          type="button"
          class="student-modal-btn cancel"
          id="cancelStudentAccountBtn"
        >
          Cancel
        </button>

        <button
          type="button"
          class="student-modal-btn primary"
          id="createStudentAccountBtn"
          data-mode="create"
        >
          Create Account
        </button>

        <button
          type="button"
          class="student-modal-btn success hidden"
          id="doneStudentAccountBtn"
        >
          Done
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  bindStudentAccountModalEvents();
}

/* ============================================================
   MODAL EVENTS
   ============================================================ */

function bindStudentAccountModalEvents() {
  const modal =
    byId("studentAccountModal");

  const closeBtn =
    byId("closeStudentAccountModal");

  const cancelBtn =
    byId("cancelStudentAccountBtn");

  const createBtn =
    byId("createStudentAccountBtn");

  const doneBtn =
    byId("doneStudentAccountBtn");

  const generateBtn =
    byId("generateStudentPassword");

  const toggleBtn =
    byId("toggleStudentPassword");

  closeBtn?.addEventListener(
    "click",
    closeStudentAccountModal
  );

  cancelBtn?.addEventListener(
    "click",
    closeStudentAccountModal
  );

  doneBtn?.addEventListener(
    "click",
    closeStudentAccountModal
  );

  createBtn?.addEventListener(
    "click",
    async () => {

      const mode =
        createBtn.dataset.mode === "reset"
          ? "reset"
          : "create";

      await submitStudentAccount(mode);

      if (byId("studentAccountSuccessView") &&
          !byId("studentAccountSuccessView").classList.contains("hidden")) {

        createBtn.classList.add("hidden");
        doneBtn?.classList.remove("hidden");
        cancelBtn?.classList.add("hidden");
      }
    }
  );

  generateBtn?.addEventListener(
    "click",
    () => {

      const password =
        byId("studentAccountPassword");

      if (!password) {
        return;
      }

      password.value =
        generateTemporaryPassword(12);

      password.type = "text";

      setTimeout(() => {
        password.type = "password";
      }, 1800);
    }
  );

  toggleBtn?.addEventListener(
    "click",
    () => {

      const password =
        byId("studentAccountPassword");

      if (!password) {
        return;
      }

      password.type =
        password.type === "password"
          ? "text"
          : "password";
    }
  );

  modal?.addEventListener(
    "click",
    event => {

      if (event.target === modal) {
        closeStudentAccountModal();
      }

      const copyBtn =
        event.target.closest(
          ".copy-credential-btn"
        );

      if (copyBtn) {

        const targetId =
          copyBtn.dataset.copyTarget;

        const target =
          byId(targetId);

        if (target) {
          copyText(
            target.textContent.trim()
          );
        }
      }
    }
  );
}

/* ============================================================
   CREATE ACCOUNT FROM STUDENT
   ============================================================ */

function handleCreateAccount(studentDbId) {
  const student =
    findStudent(studentDbId);

  if (!student) {
    showError(
      "Student record not found."
    );

    return;
  }

  if (student.auth_user_id) {
    showWarning(
      "This student already has a login account. Use Reset Password."
    );

    return;
  }

  if (!student.email) {
    showError(
      "This student does not have an email address. Add the email first."
    );

    return;
  }

  openStudentAccountModal(
    student,
    "create"
  );
}

/* ============================================================
   RESET PASSWORD
   ============================================================ */

function handleResetPassword(studentDbId) {
  const student =
    findStudent(studentDbId);

  if (!student) {
    showError(
      "Student record not found."
    );

    return;
  }

  if (!student.auth_user_id) {
    showWarning(
      "This student does not have a login account yet."
    );

    return;
  }

  openStudentAccountModal(
    student,
    "reset"
  );
}

/* ============================================================
   VIEW STUDENT
   ============================================================ */

function handleViewStudent(studentDbId) {
  const student =
    findStudent(studentDbId);

  if (!student) {
    showError(
      "Student record not found."
    );

    return;
  }

  /*
    Use existing viewStudent function if available.
  */

  if (
    typeof window.viewStudent === "function"
  ) {
    window.viewStudent(student);
    return;
  }

  const details = `
Student ID: ${student.student_id || "—"}
Name: ${student.full_name || "—"}
Gender: ${student.gender || "—"}
Phone: ${student.phone || "—"}
Email: ${student.email || "—"}
Status: ${student.status || "—"}
Account: ${
    student.auth_user_id
      ? "Active Account"
      : "No Account"
  }
  `;

  alert(details);
}

/* ============================================================
   EDIT STUDENT
   ============================================================ */

function handleEditStudent(studentDbId) {
  const student =
    findStudent(studentDbId);

  if (!student) {
    showError(
      "Student record not found."
    );

    return;
  }

  editingStudentId =
    student.id;

  /*
    Fill common existing form fields.
  */

  setValue(
    [
      "#studentId",
      "#student_id"
    ],
    student.student_id
  );

  setValue(
    [
      "#fullName",
      "#full_name"
    ],
    student.full_name
  );

  setValue(
    [
      "#gender"
    ],
    student.gender
  );

  setValue(
    [
      "#dateOfBirth",
      "#date_of_birth"
    ],
    student.date_of_birth
  );

  setValue(
    [
      "#phone"
    ],
    student.phone
  );

  setValue(
    [
      "#email"
    ],
    student.email
  );

  setValue(
    [
      "#address"
    ],
    student.address
  );

  setValue(
    [
      "#admissionDate",
      "#admission_date"
    ],
    student.admission_date
  );

  setValue(
    [
      "#status"
    ],
    student.status
  );

  setValue(
    [
      "#institutionSelect",
      "#institution_id"
    ],
    student.institution_id
  );

  /*
    Scroll to form.
  */

  const form =
    getElement(
      "#studentForm",
      "#addStudentForm"
    );

  form?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  showMessage(
    `Editing ${student.full_name}`,
    "info"
  );
}

/* ============================================================
   SET VALUE
   ============================================================ */

function setValue(selectors, value) {
  const element =
    getElement(...selectors);

  if (!element) {
    return;
  }

  element.value =
    value ?? "";
}

/* ============================================================
   DELETE STUDENT
   ============================================================ */

async function handleDeleteStudent(studentDbId) {
  const student =
    findStudent(studentDbId);

  if (!student) {
    showError(
      "Student record not found."
    );

    return;
  }

  /*
    Prevent accidental deletion of an account-linked student.
    Existing system can override this with window.deleteStudent.
  */

  if (
    typeof window.deleteStudent === "function"
  ) {
    window.deleteStudent(student);
    return;
  }

  const confirmed =
    confirm(
      `Delete student "${student.full_name}"?\n\nThis action cannot be undone.`
    );

  if (!confirmed) {
    return;
  }

  try {
    const allowed =
      await verifySuperAdmin();

    if (!allowed) {
      return;
    }

    const supabase =
      getSupabase();

    const {
      error
    } = await supabase
      .from(STUDENTS_TABLE)
      .delete()
      .eq("id", student.id);

    if (error) {
      throw error;
    }

    showSuccess(
      "Student deleted successfully."
    );

    await loadStudents();

  } catch (error) {
    console.error(
      "DELETE STUDENT ERROR:",
      error
    );

    showError(
      error?.message ||
      "Unable to delete student."
    );
  }
}

/* ============================================================
   EVENT DELEGATION
   ============================================================ */

function setupStudentTableEvents() {
  const tableBody =
    getElement(
      "#studentsTableBody",
      "#studentTableBody",
      "#students-table-body"
    );

  if (!tableBody) {
    return;
  }

  tableBody.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest("button");

      if (!button) {
        return;
      }

      const studentDbId =
        button.dataset.id;

      if (!studentDbId) {
        return;
      }

      if (
        button.classList.contains(
          "create-account-btn"
        )
      ) {
        handleCreateAccount(
          studentDbId
        );

        return;
      }

      if (
        button.classList.contains(
          "reset-password-btn"
        )
      ) {
        handleResetPassword(
          studentDbId
        );

        return;
      }

      if (
        button.classList.contains(
          "view-student-btn"
        )
      ) {
        handleViewStudent(
          studentDbId
        );

        return;
      }

      if (
        button.classList.contains(
          "edit-student-btn"
        )
      ) {
        handleEditStudent(
          studentDbId
        );

        return;
      }

      if (
        button.classList.contains(
          "delete-student-btn"
        )
      ) {
        handleDeleteStudent(
          studentDbId
        );

        return;
      }
    }
  );
}

/* ============================================================
   REFRESH BUTTON
   ============================================================ */

function setupRefreshButton() {
  const refreshButton =
    getElement(
      "#refreshStudents",
      "#refreshStudentList",
      "#refreshStudentsBtn",
      ".refresh-students"
    );

  if (!refreshButton) {
    return;
  }

  refreshButton.addEventListener(
    "click",
    async () => {

      refreshButton.disabled = true;

      const original =
        refreshButton.innerHTML;

      refreshButton.innerHTML =
        "↻ Refreshing...";

      try {
        await loadStudents();
      } finally {
        refreshButton.disabled = false;
        refreshButton.innerHTML =
          original;
      }
    }
  );
}

/* ============================================================
   SEARCH EVENTS
   ============================================================ */

function setupSearchEvents() {
  const searchInput =
    getElement(
      "#studentSearch",
      "#searchStudent",
      "#studentSearchInput"
    );

  const statusSelect =
    getElement(
      "#statusFilter",
      "#studentStatusFilter"
    );

  searchInput?.addEventListener(
    "input",
    filterStudents
  );

  statusSelect?.addEventListener(
    "change",
    filterStudents
  );
}

/* ============================================================
   GLOBAL CREATE ACCOUNT SUPPORT
   ============================================================ */

window.openStudentAccountModal =
  openStudentAccountModal;

window.handleCreateAccount =
  handleCreateAccount;

window.handleResetPassword =
  handleResetPassword;

window.loadStudents =
  loadStudents;

window.refreshStudents =
  loadStudents;

window.verifyStudentSuperAdmin =
  verifySuperAdmin;

/* ============================================================
   INITIALIZATION
   ============================================================ */

async function initStudentsModule() {
  console.log(
    "GAAWOW EMS Students V6.1 initializing..."
  );

  try {
    /*
      Supabase must exist before this module starts.
    */

    getSupabase();

    ensureStudentAccountModal();

    setupAuthListener();

    setupStudentTableEvents();

    setupRefreshButton();

    setupSearchEvents();

    /*
      Initial secure load.
    */

    await loadStudents();

    console.log(
      "GAAWOW EMS Students V6.1 ready."
    );

  } catch (error) {
    console.error(
      "STUDENTS MODULE INIT ERROR:",
      error
    );

    showError(
      error?.message ||
      "Students module could not start."
    );
  }
}

/* ============================================================
   START
   ============================================================ */

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initStudentsModule,
    {
      once: true
    }
  );
} else {
  initStudentsModule();
}
