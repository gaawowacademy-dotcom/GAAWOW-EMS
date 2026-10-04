/* ============================================================
   GAAWOW EMS
   STUDENT ACCOUNT CREATION V1
   ------------------------------------------------------------
   PURPOSE:
   - Super Admin ONLY
   - Create Student Login Account
   - Username + Password
   - Confirm Password
   - Generate Username
   - Generate Secure Password
   - Show / Hide Password
   - Create Account
   - Reset Password
   - Enable / Disable Account
   - Link auth_user_id
   - Account Status
   - Copy credentials
   - No temporary/test student
   - Works with existing Students Module V5.3
   ------------------------------------------------------------
   REQUIRED SUPABASE EDGE FUNCTION:

       create-student-account

   Expected request:

       {
         student_id: "...",
         username: "...",
         password: "...",
         action: "create" | "reset" | "enable" | "disable"
       }

   Expected success response:

       {
         success: true,
         action: "create",
         student_id: "...",
         username: "...",
         auth_user_id: "...",
         account_enabled: true
       }

   ============================================================ */

(() => {

  "use strict";


  /* ============================================================
     CONFIG
     ============================================================ */

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiic.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const EDGE_FUNCTION =
    "create-student-account";

  const LOAD_TIMEOUT =
    15000;

  const MIN_PASSWORD_LENGTH =
    8;

  const MAX_USERNAME_LENGTH =
    30;


  /* ============================================================
     SUPABASE CLIENT
     ============================================================ */

  if (!window.supabase) {

    console.error(
      "Supabase library is not available."
    );

    return;
  }


  const accountSupabase =
    window.supabase.createClient(
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


  /* ============================================================
     STATE
     ============================================================ */

  let currentUser =
    null;

  let currentProfile =
    null;

  let students =
    [];

  let selectedStudent =
    null;

  let initialized =
    false;

  let busy =
    false;


  /* ============================================================
     DOM HELPER
     ============================================================ */

  const $ =
    (id) =>
      document.getElementById(id);


  /* ============================================================
     HTML ESCAPE
     ============================================================ */

  function escapeHtml(
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
     ERROR MESSAGE
     ============================================================ */

  function getErrorMessage(
    error
  ) {

    if (!error) {

      return "Unknown error.";
    }

    return (
      error.message ||
      error.error_description ||
      error.details ||
      error.hint ||
      String(error)
    );
  }


  /* ============================================================
     TIMEOUT
     ============================================================ */

  function withTimeout(
    promise,
    ms = LOAD_TIMEOUT
  ) {

    return Promise.race([

      promise,

      new Promise(
        (_, reject) => {

          setTimeout(
            () => {

              reject(
                new Error(
                  "Request timed out. Please check your Supabase connection."
                )
              );

            },
            ms
          );

        }
      )

    ]);
  }


  /* ============================================================
     MESSAGE
     ============================================================ */

  function showMessage(
    message,
    type = "success"
  ) {

    const box =
      $("studentAccountMessage");

    if (!box) {

      console.log(
        `[${type}]`,
        message
      );

      return;
    }

    box.className =
      `message ${type}`;

    box.textContent =
      message;

    box.style.display =
      "block";
  }


  function clearMessage() {

    const box =
      $("studentAccountMessage");

    if (!box) {
      return;
    }

    box.className =
      "message";

    box.textContent =
      "";

    box.style.display =
      "none";
  }


  /* ============================================================
     SUCCESS RESULT
     ============================================================ */

  function showResult(
    result,
    action
  ) {

    const box =
      $("studentAccountResult");

    if (!box) {
      return;
    }

    const student =
      selectedStudent;

    if (!student) {
      return;
    }

    const username =
      result?.username ||
      $("studentUsername")
        ?.value ||
      "—";

    const studentId =
      result?.student_id ||
      student.student_id ||
      "—";

    const authUserId =
      result?.auth_user_id ||
      "—";

    const actionLabel =
      action === "reset"
        ? "PASSWORD RESET SUCCESSFULLY"
        : action === "disable"
          ? "ACCOUNT DISABLED"
          : action === "enable"
            ? "ACCOUNT ENABLED"
            : "ACCOUNT CREATED SUCCESSFULLY";


    box.innerHTML = `

      <div class="account-result-card">

        <div class="account-result-icon">
          ${
            action === "disable"
              ? "🔒"
              : "✅"
          }
        </div>

        <h3>
          ${escapeHtml(
            actionLabel
          )}
        </h3>

        <div class="account-result-grid">

          <div class="account-result-item">
            <span>Student</span>
            <strong>
              ${escapeHtml(
                student.full_name
              )}
            </strong>
          </div>

          <div class="account-result-item">
            <span>Student ID</span>
            <strong>
              ${escapeHtml(
                studentId
              )}
            </strong>
          </div>

          <div class="account-result-item">
            <span>Username</span>
            <strong id="resultUsername">
              ${escapeHtml(
                username
              )}
            </strong>
          </div>

          <div class="account-result-item">
            <span>Account Status</span>
            <strong>
              ${
                action === "disable"
                  ? "Disabled"
                  : "Active"
              }
            </strong>
          </div>

          <div class="account-result-item account-auth-id">
            <span>Auth User ID</span>
            <strong>
              ${escapeHtml(
                authUserId
              )}
            </strong>
          </div>

        </div>

        ${
          action === "create" ||
          action === "reset"

            ? `

              <div class="credential-warning">

                🔐
                <strong>
                  Save the credentials securely.
                </strong>

                <br>

                The password will not be readable
                again after leaving this screen.

              </div>

              <div class="result-actions">

                <button
                  type="button"
                  id="copyUsernameResult"
                  class="btn-small"
                >
                  📋 Copy Username
                </button>

                <button
                  type="button"
                  id="copyCredentialsResult"
                  class="btn-small"
                >
                  📋 Copy Account Info
                </button>

              </div>

            `

            : ""

        }

      </div>

    `;

    box.style.display =
      "block";


    const copyUsername =
      $("copyUsernameResult");

    if (copyUsername) {

      copyUsername.addEventListener(
        "click",
        () => {

          copyText(
            username
          );

        }
      );

    }


    const copyCredentials =
      $("copyCredentialsResult");

    if (copyCredentials) {

      copyCredentials.addEventListener(
        "click",
        () => {

          const password =
            $("studentPassword")
              ?.value ||
            "";

          const text =

`GAAWOW ACADEMY
Student Account

Student:
${student.full_name}

Student ID:
${studentId}

Username:
${username}

Password:
${password}

Account Status:
Active`;

          copyText(
            text
          );

        }
      );

    }

  }


  function hideResult() {

    const box =
      $("studentAccountResult");

    if (!box) {
      return;
    }

    box.innerHTML =
      "";

    box.style.display =
      "none";
  }


  /* ============================================================
     COPY
     ============================================================ */

  async function copyText(
    text
  ) {

    if (!text) {

      showMessage(
        "Nothing to copy.",
        "error"
      );

      return;
    }

    try {

      if (
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {

        await navigator.clipboard.writeText(
          text
        );

      } else {

        const textarea =
          document.createElement(
            "textarea"
          );

        textarea.value =
          text;

        textarea.style.position =
          "fixed";

        textarea.style.opacity =
          "0";

        document.body.appendChild(
          textarea
        );

        textarea.select();

        document.execCommand(
          "copy"
        );

        textarea.remove();
      }

      showMessage(
        "Copied successfully.",
        "success"
      );

    } catch (error) {

      console.error(
        "Copy error:",
        error
      );

      showMessage(
        "Could not copy. Please copy it manually.",
        "error"
      );
    }
  }


  /* ============================================================
     AUTHENTICATED USER
     ============================================================ */

  async function loadCurrentUser() {

    const {
      data,
      error
    } =
      await withTimeout(
        accountSupabase.auth.getUser()
      );

    if (error) {
      throw error;
    }

    if (
      !data ||
      !data.user
    ) {

      throw new Error(
        "No authenticated user found. Please login again."
      );
    }

    currentUser =
      data.user;

    return currentUser;
  }


  /* ============================================================
     PROFILE
     ============================================================ */

  async function loadCurrentProfile() {

    if (!currentUser) {

      throw new Error(
        "Authenticated user is missing."
      );
    }

    const {
      data,
      error
    } =
      await withTimeout(

        accountSupabase
          .from("profiles")
          .select(
            "id,institution_id,full_name,role,is_active"
          )
          .eq(
            "id",
            currentUser.id
          )
          .maybeSingle()

      );


    if (error) {
      throw error;
    }


    if (!data) {

      throw new Error(
        "Your EMS profile was not found."
      );
    }


    if (
      data.is_active === false
    ) {

      throw new Error(
        "Your EMS profile is inactive."
      );
    }


    currentProfile =
      data;

    return currentProfile;
  }


  /* ============================================================
     SUPER ADMIN CHECK
     ============================================================ */

  function isSuperAdmin() {

    return (
      currentProfile &&
      currentProfile.role ===
        "super_admin"
    );
  }


  /* ============================================================
     SUPER ADMIN UI
     ============================================================ */

  function applySuperAdminAccess() {

    const section =
      $("studentAccountCreationSection");

    if (!section) {
      return;
    }


    if (!isSuperAdmin()) {

      section.style.display =
        "none";

      console.warn(
        "Student Account Creation: Super Admin only."
      );

      return;
    }


    section.style.display =
      "";


    const badge =
      $("studentAccountRoleBadge");

    if (badge) {

      badge.textContent =
        "SUPER ADMIN ONLY";

      badge.style.display =
        "inline-flex";
    }

  }


  /* ============================================================
     LOAD STUDENTS
     ============================================================ */

  async function loadStudents() {

    const select =
      $("studentAccountStudentSelect");

    if (!select) {
      return;
    }


    select.innerHTML =
      `
        <option value="">
          Loading students...
        </option>
      `;


    try {

      let query =
        accountSupabase
          .from("students")
          .select(`
            id,
            institution_id,
            student_id,
            full_name,
            status,
            account_enabled,
            auth_user_id,
            email,
            phone
          `)
          .order(
            "full_name",
            {
              ascending: true
            }
          );


      /*
       * Super Admin can manage
       * students from all institutions.
       */

      const {
        data,
        error
      } =
        await withTimeout(
          query
        );


      if (error) {
        throw error;
      }


      students =
        data || [];


      renderStudentSelect();


    } catch (error) {

      console.error(
        "Student account student loading error:",
        error
      );


      students =
        [];


      select.innerHTML =
        `
          <option value="">
            Failed to load students
          </option>
        `;


      showMessage(
        `Students could not be loaded: ${getErrorMessage(error)}`,
        "error"
      );

    }

  }


  /* ============================================================
     RENDER STUDENT SELECT
     ============================================================ */

  function renderStudentSelect() {

    const select =
      $("studentAccountStudentSelect");

    if (!select) {
      return;
    }


    select.innerHTML =
      "";


    const defaultOption =
      document.createElement(
        "option"
      );

    defaultOption.value =
      "";

    defaultOption.textContent =
      "-- Select Student --";

    select.appendChild(
      defaultOption
    );


    if (!students.length) {

      return;
    }


    students.forEach(
      (student) => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          student.id;


        const accountText =

          student.account_enabled &&
          student.auth_user_id

            ? " • Account Active"

            : " • No Account";


        option.textContent =

          `${student.student_id || "NO-ID"} — ` +
          `${student.full_name || "Unnamed Student"}` +
          accountText;


        select.appendChild(
          option
        );

      }
    );

  }


  /* ============================================================
     STUDENT SELECTED
     ============================================================ */

  function handleStudentSelection() {

    const select =
      $("studentAccountStudentSelect");

    if (!select) {
      return;
    }


    const id =
      select.value;


    selectedStudent =
      students.find(
        (student) =>
          String(student.id) ===
          String(id)
      ) || null;


    clearMessage();

    hideResult();


    if (!selectedStudent) {

      clearStudentPreview();

      updateAccountButtons();

      return;
    }


    renderStudentPreview();

    updateAccountButtons();

    generateSuggestedUsername();

  }


  /* ============================================================
     STUDENT PREVIEW
     ============================================================ */

  function renderStudentPreview() {

    const student =
      selectedStudent;

    if (!student) {
      return;
    }


    const name =
      $("accountStudentName");

    const id =
      $("accountStudentId");

    const status =
      $("accountStudentStatus");

    const phone =
      $("accountStudentPhone");

    const email =
      $("accountStudentEmail");


    if (name) {

      name.textContent =
        student.full_name ||
        "—";
    }


    if (id) {

      id.textContent =
        student.student_id ||
        "—";
    }


    if (status) {

      status.textContent =
        student.status ||
        "—";


      status.className =
        `status status-${String(
          student.status ||
          ""
        ).toLowerCase()}`;
    }


    if (phone) {

      phone.textContent =
        student.phone ||
        "—";
    }


    if (email) {

      email.textContent =
        student.email ||
        "—";
    }

  }


  function clearStudentPreview() {

    const fields = [

      "accountStudentName",

      "accountStudentId",

      "accountStudentStatus",

      "accountStudentPhone",

      "accountStudentEmail"

    ];


    fields.forEach(
      (id) => {

        const element =
          $(id);

        if (element) {

          element.textContent =
            "—";
        }

      }
    );

  }


  /* ============================================================
     ACCOUNT STATUS
     ============================================================ */

  function getAccountStatus() {

    if (!selectedStudent) {

      return "No Student";
    }


    if (
      selectedStudent.account_enabled ===
        true &&
      selectedStudent.auth_user_id
    ) {

      return "Active";
    }


    if (
      selectedStudent.auth_user_id &&
      selectedStudent.account_enabled ===
        false
    ) {

      return "Disabled";
    }


    return "No Account";
  }


  function updateAccountStatusDisplay() {

    const status =
      $("studentAccountStatus");

    if (!status) {
      return;
    }


    const value =
      getAccountStatus();


    status.textContent =
      value;


    if (value === "Active") {

      status.className =
        "status status-active";

    }

    else if (
      value === "Disabled"
    ) {

      status.className =
        "status status-inactive";

    }

    else {

      status.className =
        "status status-pending";
    }

  }


  /* ============================================================
     ACCOUNT BUTTONS
     ============================================================ */

  function updateAccountButtons() {

    const createButton =
      $("createStudentAccountButton");

    const resetButton =
      $("resetStudentPasswordButton");

    const enableButton =
      $("enableStudentAccountButton");

    const disableButton =
      $("disableStudentAccountButton");


    if (!selectedStudent) {

      if (createButton) {
        createButton.disabled =
          true;
      }

      if (resetButton) {
        resetButton.disabled =
          true;
      }

      if (enableButton) {
        enableButton.disabled =
          true;
      }

      if (disableButton) {
        disableButton.disabled =
          true;
      }


      updateAccountStatusDisplay();

      return;
    }


    const hasAccount =
      !!(
        selectedStudent.auth_user_id
      );


    const active =
      (
        selectedStudent.account_enabled ===
          true &&
        hasAccount
      );


    const disabled =
      (
        selectedStudent.account_enabled ===
          false &&
        hasAccount
      );


    if (createButton) {

      createButton.disabled =
        hasAccount;
    }


    if (resetButton) {

      resetButton.disabled =
        !active;
    }


    if (enableButton) {

      enableButton.disabled =
        !disabled;
    }


    if (disableButton) {

      disableButton.disabled =
        !active;
    }


    updateAccountStatusDisplay();

  }


  /* ============================================================
     USERNAME NORMALIZATION
     ============================================================ */

  function normalizeUsername(
    value
  ) {

    return String(
      value || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        "."
      )
      .replace(
        /[^a-z0-9._-]/g,
        ""
      )
      .replace(
        /\.{2,}/g,
        "."
      )
      .slice(
        0,
        MAX_USERNAME_LENGTH
      );

  }


  /* ============================================================
     GENERATE USERNAME
     ============================================================ */

  function generateSuggestedUsername() {

    if (!selectedStudent) {
      return;
    }


    const input =
      $("studentUsername");

    if (!input) {
      return;
    }


    /*
     * Do not overwrite an existing username
     * typed by Super Admin.
     */

    if (
      input.value.trim()
    ) {

      return;
    }


    const name =
      normalizeUsername(
        selectedStudent.full_name
      );


    if (!name) {
      return;
    }


    const parts =
      name
        .split(".")
        .filter(Boolean);


    let username =
      name;


    if (parts.length >= 2) {

      username =
        `${parts[0]}.${parts[1]}`;
    }


    /*
     * Add Student ID suffix
     * to make username easier to keep unique.
     */

    const studentId =
      String(
        selectedStudent.student_id ||
        ""
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      );


    if (studentId) {

      const suffix =
        studentId.slice(
          -4
        );


      username =
        `${username}${suffix}`;
    }


    input.value =
      normalizeUsername(
        username
      );

  }


  /* ============================================================
     RANDOM USERNAME
     ============================================================ */

  function generateRandomUsername() {

    if (!selectedStudent) {

      showMessage(
        "Please select a student first.",
        "error"
      );

      return;
    }


    const input =
      $("studentUsername");

    if (!input) {
      return;
    }


    const name =
      normalizeUsername(
        selectedStudent.full_name
      )
      .replace(
        /\./g,
        ""
      );


    const base =
      name.slice(
        0,
        12
      ) ||
      "student";


    const random =
      Math.floor(
        1000 +
        Math.random() *
        9000
      );


    input.value =
      `${base}${random}`;

  }


  /* ============================================================
     PASSWORD VALIDATION
     ============================================================ */

  function validatePassword(
    password
  ) {

    if (!password) {

      throw new Error(
        "Password is required."
      );
    }


    if (
      password.length <
      MIN_PASSWORD_LENGTH
    ) {

      throw new Error(
        `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`
      );
    }


    if (
      password.length >
      128
    ) {

      throw new Error(
        "Password cannot exceed 128 characters."
      );
    }


    /*
     * Recommended password complexity.
     */

    if (!/[A-Z]/.test(password)) {

      throw new Error(
        "Password must contain at least one uppercase letter."
      );
    }


    if (!/[a-z]/.test(password)) {

      throw new Error(
        "Password must contain at least one lowercase letter."
      );
    }


    if (!/[0-9]/.test(password)) {

      throw new Error(
        "Password must contain at least one number."
      );
    }


    return true;
  }


  /* ============================================================
     PASSWORD GENERATOR
     ============================================================ */

  function generateSecurePassword(
    length = 12
  ) {

    const uppercase =
      "ABCDEFGHJKLMNPQRSTUVWXYZ";

    const lowercase =
      "abcdefghijkmnopqrstuvwxyz";

    const numbers =
      "23456789";

    const symbols =
      "!@#$%&*";

    const all =
      uppercase +
      lowercase +
      numbers +
      symbols;


    function randomChar(
      source
    ) {

      return source.charAt(
        Math.floor(
          Math.random() *
          source.length
        )
      );
    }


    let password =

      randomChar(
        uppercase
      ) +

      randomChar(
        lowercase
      ) +

      randomChar(
        numbers
      ) +

      randomChar(
        symbols
      );


    while (
      password.length <
      length
    ) {

      password +=
        randomChar(
          all
        );
    }


    /*
     * Shuffle password.
     */

    password =
      password
        .split("")
        .sort(
          () =>
            Math.random() -
            0.5
        )
        .join("");


    return password;

  }


  function handleGeneratePassword() {

    const passwordInput =
      $("studentPassword");

    const confirmInput =
      $("studentPasswordConfirm");


    if (!passwordInput) {
      return;
    }


    const password =
      generateSecurePassword(
        14
      );


    passwordInput.value =
      password;


    if (confirmInput) {

      confirmInput.value =
        password;
    }


    updatePasswordStrength();

    showMessage(
      "Secure password generated.",
      "success"
    );

  }


  /* ============================================================
     PASSWORD STRENGTH
     ============================================================ */

  function updatePasswordStrength() {

    const input =
      $("studentPassword");

    const meter =
      $("studentPasswordStrength");

    if (
      !input ||
      !meter
    ) {

      return;
    }


    const password =
      input.value;


    let score =
      0;


    if (
      password.length >=
      8
    ) {
      score++;
    }


    if (
      password.length >=
      12
    ) {
      score++;
    }


    if (
      /[A-Z]/.test(password)
    ) {
      score++;
    }


    if (
      /[a-z]/.test(password)
    ) {
      score++;
    }


    if (
      /[0-9]/.test(password)
    ) {
      score++;
    }


    if (
      /[^A-Za-z0-9]/.test(password)
    ) {
      score++;
    }


    let text =
      "Password strength: Weak";


    if (score >= 5) {

      text =
        "Password strength: Strong";

    }

    else if (score >= 3) {

      text =
        "Password strength: Medium";
    }


    meter.textContent =
      text;


    meter.dataset.score =
      String(
        score
      );

  }


  /* ============================================================
     PASSWORD MATCH
     ============================================================ */

  function passwordsMatch() {

    const password =
      $("studentPassword")
        ?.value ||
      "";

    const confirm =
      $("studentPasswordConfirm")
        ?.value ||
      "";


    const indicator =
      $("studentPasswordMatch");


    if (!indicator) {
      return;
    }


    if (!confirm) {

      indicator.textContent =
        "";

      return;
    }


    if (
      password ===
      confirm
    ) {

      indicator.textContent =
        "✓ Passwords match";

      indicator.className =
        "password-match success";

    } else {

      indicator.textContent =
        "✕ Passwords do not match";

      indicator.className =
        "password-match error";
    }

  }


  /* ============================================================
     SHOW / HIDE PASSWORD
     ============================================================ */

  function togglePassword(
    inputId,
    buttonId
  ) {

    const input =
      $(inputId);

    const button =
      $(buttonId);


    if (!input) {
      return;
    }


    if (
      input.type ===
      "password"
    ) {

      input.type =
        "text";


      if (button) {

        button.textContent =
          "🙈 Hide";
      }

    } else {

      input.type =
        "password";


      if (button) {

        button.textContent =
          "👁 Show";
      }

    }

  }


  /* ============================================================
     FORM DATA
     ============================================================ */

  function getAccountFormData() {

    return {

      username:
        normalizeUsername(
          $("studentUsername")
            ?.value
        ),

      password:
        $("studentPassword")
          ?.value ||
        "",

      confirmPassword:
        $("studentPasswordConfirm")
          ?.value ||
        ""

    };

  }


  /* ============================================================
     VALIDATE ACCOUNT FORM
     ============================================================ */

  function validateAccountForm(
    data
  ) {

    if (!isSuperAdmin()) {

      throw new Error(
        "Access denied. Super Admin only."
      );
    }


    if (!selectedStudent) {

      throw new Error(
        "Please select a student."
      );
    }


    if (
      !selectedStudent.id
    ) {

      throw new Error(
        "Student database ID is missing."
      );
    }


    if (
      !selectedStudent.student_id
    ) {

      throw new Error(
        "Student ID is missing."
      );
    }


    if (
      selectedStudent.status !==
      "active"
    ) {

      throw new Error(
        "Only active students can receive a login account."
      );
    }


    if (
      selectedStudent.auth_user_id
    ) {

      throw new Error(
        "This student already has an account. Use Reset Password instead."
      );
    }


    if (!data.username) {

      throw new Error(
        "Username is required."
      );
    }


    if (
      data.username.length <
      4
    ) {

      throw new Error(
        "Username must contain at least 4 characters."
      );
    }


    if (
      !/^[a-z0-9][a-z0-9._-]*$/.test(
        data.username
      )
    ) {

      throw new Error(
        "Username may contain only lowercase letters, numbers, dot, underscore, and hyphen."
      );
    }


    validatePassword(
      data.password
    );


    if (
      data.password !==
      data.confirmPassword
    ) {

      throw new Error(
        "Password and Confirm Password do not match."
      );
    }


    return true;
  }


  /* ============================================================
     INVOKE EDGE FUNCTION
     ============================================================ */

  async function invokeAccountFunction(
    payload
  ) {

    const {
      data,
      error
    } =
      await withTimeout(

        accountSupabase
          .functions
          .invoke(
            EDGE_FUNCTION,
            {
              body:
                payload
            }
          )

      );


    if (error) {

      console.error(
        "Edge Function error:",
        error
      );

      throw new Error(
        getErrorMessage(
          error
        )
      );
    }


    if (
      !data
    ) {

      throw new Error(
        "No response received from the account service."
      );
    }


    if (
      data.success !==
      true
    ) {

      throw new Error(
        data.error ||
        data.message ||
        "Student account operation failed."
      );
    }


    return data;

  }


  /* ============================================================
     CREATE ACCOUNT
     ============================================================ */

  async function createStudentAccount() {

    if (busy) {
      return;
    }


    clearMessage();
    hideResult();


    try {

      if (!isSuperAdmin()) {

        throw new Error(
          "Access denied. Super Admin only."
        );
      }


      const formData =
        getAccountFormData();


      validateAccountForm(
        formData
      );


      const confirmed =
        window.confirm(

          `Create login account for:

${selectedStudent.full_name}

Student ID:
${selectedStudent.student_id}

Username:
${formData.username}

Continue?`

        );


      if (!confirmed) {
        return;
      }


      setBusy(
        true,
        "Creating account..."
      );


      const result =
        await invokeAccountFunction({

          action:
            "create",

          student_id:
            selectedStudent.student_id,

          student_db_id:
            selectedStudent.id,

          username:
            formData.username,

          password:
            formData.password

        });


      showResult(
        result,
        "create"
      );


      showMessage(
        `Student account created successfully for ${selectedStudent.student_id}.`,
        "success"
      );


      await refreshSelectedStudent();


      /*
       * Do not clear password immediately.
       * Super Admin may need to copy credentials.
       */

      updateAccountButtons();


    } catch (error) {

      console.error(
        "Create student account error:",
        error
      );


      showMessage(
        `Account creation failed: ${getErrorMessage(error)}`,
        "error"
      );


    } finally {

      setBusy(
        false
      );

    }

  }


  /* ============================================================
     RESET PASSWORD
     ============================================================ */

  async function resetStudentPassword() {

    if (busy) {
      return;
    }


    clearMessage();
    hideResult();


    try {

      if (!isSuperAdmin()) {

        throw new Error(
          "Access denied. Super Admin only."
        );
      }


      if (!selectedStudent) {

        throw new Error(
          "Please select a student."
        );
      }


      if (
        !selectedStudent.auth_user_id
      ) {

        throw new Error(
          "This student does not have an account yet."
        );
      }


      if (
        selectedStudent.account_enabled !==
        true
      ) {

        throw new Error(
          "This account is disabled. Enable the account first."
        );
      }


      const passwordInput =
        $("studentPassword");

      const confirmInput =
        $("studentPasswordConfirm");


      const password =
        passwordInput
          ?.value ||
        "";


      const confirmPassword =
        confirmInput
          ?.value ||
        "";


      validatePassword(
        password
      );


      if (
        password !==
        confirmPassword
      ) {

        throw new Error(
          "Password and Confirm Password do not match."
        );
      }


      const confirmed =
        window.confirm(

          `Reset password for:

${selectedStudent.full_name}

Student ID:
${selectedStudent.student_id}

Username:
${selectedStudent.username || $("studentUsername")?.value || "Existing username"}

Continue?`

        );


      if (!confirmed) {
        return;
      }


      setBusy(
        true,
        "Resetting password..."
      );


      const result =
        await invokeAccountFunction({

          action:
            "reset",

          student_id:
            selectedStudent.student_id,

          student_db_id:
            selectedStudent.id,

          username:
            normalizeUsername(
              $("studentUsername")
                ?.value ||
              selectedStudent.username ||
              ""
            ),

          password:
            password

        });


      showResult(
        result,
        "reset"
      );


      showMessage(
        "Student password reset successfully.",
        "success"
      );


    } catch (error) {

      console.error(
        "Reset student password error:",
        error
      );


      showMessage(
        `Password reset failed: ${getErrorMessage(error)}`,
        "error"
      );


    } finally {

      setBusy(
        false
      );

    }

  }


  /* ============================================================
     ENABLE ACCOUNT
     ============================================================ */

  async function enableStudentAccount() {

    if (busy) {
      return;
    }


    try {

      if (!isSuperAdmin()) {

        throw new Error(
          "Access denied. Super Admin only."
        );
      }


      if (!selectedStudent) {

        throw new Error(
          "Please select a student."
        );
      }


      if (
        !selectedStudent.auth_user_id
      ) {

        throw new Error(
          "This student has no account."
        );
      }


      const confirmed =
        window.confirm(

          `Enable login account for:

${selectedStudent.full_name}
${selectedStudent.student_id}

Continue?`

        );


      if (!confirmed) {
        return;
      }


      setBusy(
        true,
        "Enabling account..."
      );


      const result =
        await invokeAccountFunction({

          action:
            "enable",

          student_id:
            selectedStudent.student_id,

          student_db_id:
            selectedStudent.id

        });


      showResult(
        result,
        "enable"
      );


      showMessage(
        "Student account enabled successfully.",
        "success"
      );


      await refreshSelectedStudent();


    } catch (error) {

      console.error(
        "Enable account error:",
        error
      );


      showMessage(
        `Account enable failed: ${getErrorMessage(error)}`,
        "error"
      );


    } finally {

      setBusy(
        false
      );

    }

  }


  /* ============================================================
     DISABLE ACCOUNT
     ============================================================ */

  async function disableStudentAccount() {

    if (busy) {
      return;
    }


    try {

      if (!isSuperAdmin()) {

        throw new Error(
          "Access denied. Super Admin only."
        );
      }


      if (!selectedStudent) {

        throw new Error(
          "Please select a student."
        );
      }


      if (
        !selectedStudent.auth_user_id
      ) {

        throw new Error(
          "This student has no account."
        );
      }


      const confirmed =
        window.confirm(

          `Disable login account for:

${selectedStudent.full_name}
${selectedStudent.student_id}

The student will no longer be able to login.

Continue?`

        );


      if (!confirmed) {
        return;
      }


      setBusy(
        true,
        "Disabling account..."
      );


      const result =
        await invokeAccountFunction({

          action:
            "disable",

          student_id:
            selectedStudent.student_id,

          student_db_id:
            selectedStudent.id

        });


      showResult(
        result,
        "disable"
      );


      showMessage(
        "Student account disabled successfully.",
        "success"
      );


      await refreshSelectedStudent();


    } catch (error) {

      console.error(
        "Disable account error:",
        error
      );


      showMessage(
        `Account disable failed: ${getErrorMessage(error)}`,
        "error"
      );


    } finally {

      setBusy(
        false
      );

    }

  }


  /* ============================================================
     REFRESH SELECTED STUDENT
     ============================================================ */

  async function refreshSelectedStudent() {

    if (!selectedStudent) {
      return;
    }


    const selectedId =
      selectedStudent.id;


    const {
      data,
      error
    } =
      await withTimeout(

        accountSupabase
          .from("students")
          .select(`
            id,
            institution_id,
            student_id,
            full_name,
            status,
            account_enabled,
            auth_user_id,
            email,
            phone
          `)
          .eq(
            "id",
            selectedId
          )
          .maybeSingle()

      );


    if (error) {
      throw error;
    }


    if (!data) {
      return;
    }


    selectedStudent =
      data;


    const index =
      students.findIndex(
        (student) =>
          String(student.id) ===
          String(data.id)
      );


    if (index >= 0) {

      students[index] =
        data;
    }


    renderStudentPreview();

    updateAccountButtons();

  }


  /* ============================================================
     BUSY STATE
     ============================================================ */

  function setBusy(
    value,
    text = "Processing..."
  ) {

    busy =
      value;


    const buttons = [

      $("createStudentAccountButton"),

      $("resetStudentPasswordButton"),

      $("enableStudentAccountButton"),

      $("disableStudentAccountButton"),

      $("generateUsernameButton"),

      $("generatePasswordButton")

    ];


    buttons.forEach(
      (button) => {

        if (!button) {
          return;
        }


        if (value) {

          button.dataset.oldText =
            button.textContent;

          button.disabled =
            true;


          if (
            button.id ===
            "createStudentAccountButton"
          ) {

            button.textContent =
              text;
          }

        } else {

          if (
            button.dataset.oldText
          ) {

            button.textContent =
              button.dataset.oldText;
          }

        }

      }
    );


    if (!value) {

      updateAccountButtons();
    }

  }


  /* ============================================================
     CLEAR ACCOUNT FORM
     ============================================================ */

  function resetAccountForm() {

    selectedStudent =
      null;


    const select =
      $("studentAccountStudentSelect");

    if (select) {

      select.value =
        "";
    }


    const fields = [

      "studentUsername",

      "studentPassword",

      "studentPasswordConfirm"

    ];


    fields.forEach(
      (id) => {

        const element =
          $(id);

        if (element) {

          element.value =
            "";
        }

      }
    );


    clearStudentPreview();

    clearMessage();

    hideResult();

    updateAccountButtons();

    updatePasswordStrength();

    passwordsMatch();

  }


  /* ============================================================
     REQUIRED ELEMENTS
     ============================================================ */

  function checkRequiredElements() {

    const section =
      $("studentAccountCreationSection");


    /*
     * Section is optional from the
     * JavaScript perspective.
     *
     * This prevents the Students Module
     * from breaking if HTML has not yet
     * been added.
     */

    if (!section) {

      console.warn(
        "Student Account Creation section not found. Add the V1 HTML section."
      );

      return false;
    }


    const required = [

      "studentAccountStudentSelect",

      "studentUsername",

      "studentPassword",

      "studentPasswordConfirm",

      "createStudentAccountButton"

    ];


    const missing =
      required.filter(
        (id) =>
          !$(id)
      );


    if (missing.length) {

      console.warn(

        "Student Account Creation missing HTML elements:",

        missing.join(
          ", "
        )

      );


      return false;
    }


    return true;

  }


  /* ============================================================
     EVENT LISTENERS
     ============================================================ */

  function setupEventListeners() {

    $("studentAccountStudentSelect")
      ?.addEventListener(
        "change",
        handleStudentSelection
      );


    $("studentUsername")
      ?.addEventListener(
        "input",
        (event) => {

          event.target.value =
            normalizeUsername(
              event.target.value
            );

        }
      );


    $("studentPassword")
      ?.addEventListener(
        "input",
        () => {

          updatePasswordStrength();

          passwordsMatch();

        }
      );


    $("studentPasswordConfirm")
      ?.addEventListener(
        "input",
        passwordsMatch
      );


    $("createStudentAccountButton")
      ?.addEventListener(
        "click",
        createStudentAccount
      );


    $("resetStudentPasswordButton")
      ?.addEventListener(
        "click",
        resetStudentPassword
      );


    $("enableStudentAccountButton")
      ?.addEventListener(
        "click",
        enableStudentAccount
      );


    $("disableStudentAccountButton")
      ?.addEventListener(
        "click",
        disableStudentAccount
      );


    $("generateUsernameButton")
      ?.addEventListener(
        "click",
        generateRandomUsername
      );


    $("generatePasswordButton")
      ?.addEventListener(
        "click",
        handleGeneratePassword
      );


    $("showStudentPasswordButton")
      ?.addEventListener(
        "click",
        () => {

          togglePassword(
            "studentPassword",
            "showStudentPasswordButton"
          );

        }
      );


    $("showStudentPasswordConfirmButton")
      ?.addEventListener(
        "click",
        () => {

          togglePassword(
            "studentPasswordConfirm",
            "showStudentPasswordConfirmButton"
          );

        }
      );


    $("clearStudentAccountFormButton")
      ?.addEventListener(
        "click",
        resetAccountForm
      );


    $("refreshStudentAccountsButton")
      ?.addEventListener(
        "click",
        async () => {

          clearMessage();

          await loadStudents();

          resetAccountForm();

        }
      );

  }


  /* ============================================================
     INITIALIZATION
     ============================================================ */

  async function initStudentAccountCreation() {

    if (initialized) {
      return;
    }


    initialized =
      true;


    try {

      /*
       * If HTML section does not exist,
       * do not break Students Module.
       */

      if (
        !checkRequiredElements()
      ) {

        return;
      }


      await loadCurrentUser();

      await loadCurrentProfile();


      /*
       * SECURITY:
       * Student Account Creation is
       * SUPER ADMIN ONLY.
       */

      if (!isSuperAdmin()) {

        applySuperAdminAccess();

        return;
      }


      applySuperAdminAccess();

      setupEventListeners();

      await loadStudents();

      resetAccountForm();


      console.log(
        "GAAWOW Student Account Creation V1 initialized."
      );


    } catch (error) {

      console.error(
        "Student Account Creation initialization error:",
        error
      );


      showMessage(
        `Student Account Creation failed to initialize: ${getErrorMessage(error)}`,
        "error"
      );

    }

  }


  /* ============================================================
     GLOBAL API
     ============================================================ */

  window.GAAWOWStudentAccount = {

    init:
      initStudentAccountCreation,

    create:
      createStudentAccount,

    resetPassword:
      resetStudentPassword,

    enable:
      enableStudentAccount,

    disable:
      disableStudentAccount,

    refresh:
      loadStudents,

    resetForm:
      resetAccountForm

  };


  /* ============================================================
     BOOT
     ============================================================ */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initStudentAccountCreation,
      {
        once: true
      }
    );

  } else {

    initStudentAccountCreation();

  }


})();
