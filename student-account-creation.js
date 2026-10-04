"use strict";

/* =========================================================
   GAAWOW ACADEMY EMS
   STUDENT ACCOUNT CREATION
   SUPER ADMIN ONLY
   VERSION 1.0

   File:
   student-account-creation.js

   PURPOSE:
   - Search students
   - Select student
   - Create Student Auth account
   - Generate password
   - Show credentials once
   - Copy credentials
   - Prepare Reset / Enable / Disable actions

   IMPORTANT:
   - NEVER put SUPABASE SERVICE ROLE KEY here.
   - Account creation is handled by Supabase Edge Function.
   ========================================================= */


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const STUDENT_ACCOUNT_SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const STUDENT_ACCOUNT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

if (
  !window.supabase ||
  typeof window.supabase.createClient !== "function"
) {

  throw new Error(
    "Supabase library lama soo degin."
  );

}


const studentAccountSupabase =
  window.supabase.createClient(
    STUDENT_ACCOUNT_SUPABASE_URL,
    STUDENT_ACCOUNT_SUPABASE_PUBLISHABLE_KEY,
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

let selectedAccountStudent = null;

let accountCreationBusy = false;


/* =========================================================
   DOM HELPER
   ========================================================= */

function account$(id) {

  return document.getElementById(id);

}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initStudentAccountCreation();

  }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

function initStudentAccountCreation() {

  bindStudentAccountEvents();

  clearStudentAccountUI();

}


/* =========================================================
   EVENT BINDINGS
   ========================================================= */

function bindStudentAccountEvents() {

  /* -----------------------------------------
     SEARCH BUTTON
     ----------------------------------------- */

  const searchButton =
    account$(
      "accountStudentSearchBtn"
    );

  if (searchButton) {

    searchButton.addEventListener(
      "click",
      searchStudents
    );

  }


  /* -----------------------------------------
     SEARCH ENTER KEY
     ----------------------------------------- */

  const searchInput =
    account$(
      "accountStudentSearch"
    );

  if (searchInput) {

    searchInput.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter"
        ) {

          event.preventDefault();

          searchStudents();

        }

      }
    );

  }


  /* -----------------------------------------
     GENERATE PASSWORD
     ----------------------------------------- */

  const generatePasswordButton =
    account$(
      "generateAccountPasswordBtn"
    );

  if (generatePasswordButton) {

    generatePasswordButton.addEventListener(
      "click",
      () => {

        const password =
          generateSecurePassword(12);

        const input =
          account$(
            "accountPassword"
          );

        if (input) {

          input.type =
            "text";

          input.value =
            password;

        }

      }
    );

  }


  /* -----------------------------------------
     CREATE ACCOUNT
     ----------------------------------------- */

  const createButton =
    account$(
      "createStudentAccountBtn"
    );

  if (createButton) {

    createButton.addEventListener(
      "click",
      createStudentAccount
    );

  }


  /* -----------------------------------------
     RESET PASSWORD
     ----------------------------------------- */

  const resetButton =
    account$(
      "resetStudentAccountBtn"
    );

  if (resetButton) {

    resetButton.addEventListener(
      "click",
      resetStudentPassword
    );

  }


  /* -----------------------------------------
     DISABLE ACCOUNT
     ----------------------------------------- */

  const disableButton =
    account$(
      "disableStudentAccountBtn"
    );

  if (disableButton) {

    disableButton.addEventListener(
      "click",
      disableStudentAccount
    );

  }


  /* -----------------------------------------
     ENABLE ACCOUNT
     ----------------------------------------- */

  const enableButton =
    account$(
      "enableStudentAccountBtn"
    );

  if (enableButton) {

    enableButton.addEventListener(
      "click",
      enableStudentAccount
    );

  }


  /* -----------------------------------------
     COPY BUTTONS
     ----------------------------------------- */

  document.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-copy]"
        );

      if (!button) return;

      const targetId =
        button.getAttribute(
          "data-copy"
        );

      copyElementText(
        targetId,
        button
      );

    }
  );


  /* -----------------------------------------
     COPY FULL CREDENTIALS
     ----------------------------------------- */

  const copyFullButton =
    account$(
      "copyFullStudentCredentialsBtn"
    );

  if (copyFullButton) {

    copyFullButton.addEventListener(
      "click",
      copyFullStudentCredentials
    );

  }


  /* -----------------------------------------
     COPY LOGIN URL
     ----------------------------------------- */

  const copyLoginUrlButton =
    account$(
      "copyStudentLoginUrlBtn"
    );

  if (copyLoginUrlButton) {

    copyLoginUrlButton.addEventListener(
      "click",
      async () => {

        const value =
          account$(
            "studentLoginUrl"
          )?.textContent?.trim();

        if (!value || value === "--") {

          showAccountMessage(
            "Student Login URL lama helin.",
            "error"
          );

          return;

        }

        await copyText(
          value,
          copyLoginUrlButton
        );

      }
    );

  }

}


/* =========================================================
   SEARCH STUDENTS
   ========================================================= */

async function searchStudents() {

  if (accountCreationBusy) {
    return;
  }


  const input =
    account$(
      "accountStudentSearch"
    );


  const query =
    input?.value
      ?.trim();


  if (!query) {

    showAccountMessage(
      "Fadlan geli Student ID ama magaca ardayga.",
      "warning"
    );

    input?.focus();

    return;

  }


  setSearchButtonLoading(
    true
  );


  hideAccountMessage();


  try {

    /*
     * Verify current session
     */

    const session =
      await getCurrentSession();


    if (!session?.user) {

      redirectSuperAdminLogin();

      return;

    }


    /*
     * Search by Student ID
     * OR full name
     */

    const escapedQuery =
      query.replace(
        /[%_]/g,
        "\\$&"
      );


    const {
      data,
      error
    } =
      await studentAccountSupabase
        .from("students")
        .select(`
          id,
          student_id,
          full_name,
          email,
          phone,
          status,
          account_enabled,
          auth_user_id,
          login_username,
          account_created_at,
          last_login_at
        `)
        .or(
          `student_id.ilike.%${escapedQuery}%,full_name.ilike.%${escapedQuery}%`
        )
        .order(
          "full_name",
          {
            ascending: true
          }
        )
        .limit(25);


    if (error) {

      console.error(
        "STUDENT SEARCH ERROR:",
        error
      );

      showAccountMessage(
        "Ardayda lama raadin karin: " +
        error.message,
        "error"
      );

      return;

    }


    const students =
      data || [];


    renderStudentSearchResults(
      students
    );


  }

  catch (error) {

    console.error(
      "STUDENT SEARCH EXCEPTION:",
      error
    );

    showAccountMessage(
      error.message ||
      "Student search failed.",
      "error"
    );

  }

  finally {

    setSearchButtonLoading(
      false
    );

  }

}


/* =========================================================
   RENDER SEARCH RESULTS
   ========================================================= */

function renderStudentSearchResults(
  students
) {

  const container =
    account$(
      "accountStudentResults"
    );

  const list =
    account$(
      "accountStudentResultsList"
    );


  if (!container || !list) {
    return;
  }


  list.innerHTML =
    "";


  if (!students.length) {

    container.classList.remove(
      "hidden"
    );


    list.innerHTML = `
      <div class="empty-message">
        🔎 Arday lama helin.
      </div>
    `;

    return;

  }


  students.forEach(
    student => {

      const item =
        document.createElement(
          "button"
        );


      item.type =
        "button";

      item.className =
        "student-account-result";


      item.innerHTML = `

        <div class="student-result-main">

          <strong>
            ${escapeHtml(
              student.full_name ||
              "Unnamed Student"
            )}
          </strong>

          <span>
            ${escapeHtml(
              student.student_id ||
              "--"
            )}
          </span>

        </div>

        <div class="student-result-status">

          ${getAccountStatusBadge(
            student
          )}

        </div>

      `;


      item.addEventListener(
        "click",
        () => {

          selectAccountStudent(
            student
          );

        }
      );


      list.appendChild(
        item
      );

    }
  );


  container.classList.remove(
    "hidden"
  );

}


/* =========================================================
   SELECT STUDENT
   ========================================================= */

function selectAccountStudent(
  student
) {

  if (!student) {
    return;
  }


  selectedAccountStudent =
    student;


  renderSelectedStudent(
    student
  );


  hideAccountMessage();


  const card =
    account$(
      "selectedAccountStudentCard"
    );


  if (card) {

    card.classList.remove(
      "hidden"
    );

  }


  /*
   * Hide search results
   */

  const results =
    account$(
      "accountStudentResults"
    );

  if (results) {

    results.classList.add(
      "hidden"
    );

  }


  /*
   * Scroll selected student into view
   */

  card?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


/* =========================================================
   RENDER SELECTED STUDENT
   ========================================================= */

function renderSelectedStudent(
  student
) {

  setText(
    "accountSelectedStudentId",
    student.student_id ||
    "--"
  );


  setText(
    "accountSelectedStudentName",
    student.full_name ||
    "--"
  );


  setText(
    "accountSelectedStudentEmail",
    student.email ||
    "--"
  );


  const username =
    String(
      student.login_username ||
      student.student_id ||
      ""
    )
      .trim()
      .toLowerCase();


  const usernameInput =
    account$(
      "accountUsername"
    );


  if (usernameInput) {

    usernameInput.value =
      username;

  }


  updateAccountControls(
    student
  );

}


/* =========================================================
   UPDATE ACCOUNT CONTROLS
   ========================================================= */

function updateAccountControls(
  student
) {

  const status =
    account$(
      "selectedAccountStatus"
    );


  const accountStatus =
    account$(
      "accountSelectedStudentAccount"
    );


  const createButton =
    account$(
      "createStudentAccountBtn"
    );

  const resetButton =
    account$(
      "resetStudentAccountBtn"
    );

  const disableButton =
    account$(
      "disableStudentAccountBtn"
    );

  const enableButton =
    account$(
      "enableStudentAccountBtn"
    );


  const hasAccount =
    Boolean(
      student.auth_user_id
    );


  const enabled =
    student.account_enabled !== false;


  if (!hasAccount) {

    setText(
      "selectedAccountStatus",
      "No Account"
    );

    setText(
      "accountSelectedStudentAccount",
      "Not Created"
    );


    if (status) {

      status.className =
        "status-badge status-warning";

    }


    createButton?.classList.remove(
      "hidden"
    );

    resetButton?.classList.add(
      "hidden"
    );

    disableButton?.classList.add(
      "hidden"
    );

    enableButton?.classList.add(
      "hidden"
    );

    return;

  }


  /*
   * Existing account
   */

  if (enabled) {

    setText(
      "selectedAccountStatus",
      "Active"
    );

    setText(
      "accountSelectedStudentAccount",
      "Active"
    );


    if (status) {

      status.className =
        "status-badge status-success";

    }


    createButton?.classList.add(
      "hidden"
    );

    resetButton?.classList.remove(
      "hidden"
    );

    disableButton?.classList.remove(
      "hidden"
    );

    enableButton?.classList.add(
      "hidden"
    );

  }

  else {

    setText(
      "selectedAccountStatus",
      "Disabled"
    );

    setText(
      "accountSelectedStudentAccount",
      "Disabled"
    );


    if (status) {

      status.className =
        "status-badge status-danger";

    }


    createButton?.classList.add(
      "hidden"
    );

    resetButton?.classList.add(
      "hidden"
    );

    disableButton?.classList.add(
      "hidden"
    );

    enableButton?.classList.remove(
      "hidden"
    );

  }

}


/* =========================================================
   CREATE STUDENT ACCOUNT
   ========================================================= */

async function createStudentAccount() {

  if (
    accountCreationBusy
  ) {
    return;
  }


  if (
    !selectedAccountStudent
  ) {

    showAccountMessage(
      "Fadlan marka hore dooro arday.",
      "warning"
    );

    return;

  }


  const student =
    selectedAccountStudent;


  if (
    student.auth_user_id
  ) {

    showAccountMessage(
      "Ardaygan horey ayuu u leeyahay account.",
      "warning"
    );

    updateAccountControls(
      student
    );

    return;

  }


  const username =
    String(
      student.login_username ||
      student.student_id ||
      ""
    )
      .trim()
      .toLowerCase();


  if (!username) {

    showAccountMessage(
      "Student ID lama hayo. Username lama abuuri karo.",
      "error"
    );

    return;

  }


  const passwordInput =
    account$(
      "accountPassword"
    );


  let password =
    passwordInput?.value?.trim() ||
    "";


  /*
   * If password empty,
   * generate secure password.
   */

  if (!password) {

    password =
      generateSecurePassword(
        12
      );

    if (passwordInput) {

      passwordInput.type =
        "text";

      passwordInput.value =
        password;

    }

  }


  if (
    password.length < 8
  ) {

    showAccountMessage(
      "Password-ku waa inuu ahaadaa ugu yaraan 8 characters.",
      "warning"
    );

    passwordInput?.focus();

    return;

  }


  const confirmed =
    window.confirm(
      `Ma hubtaa inaad account u samaynayso:\n\n` +
      `${student.full_name || ""}\n` +
      `${student.student_id || ""}\n\n` +
      `Username: ${username}`
    );


  if (!confirmed) {
    return;
  }


  setAccountCreationBusy(
    true
  );


  try {

    const session =
      await getCurrentSession();


    if (!session?.user) {

      redirectSuperAdminLogin();

      return;

    }


    /*
     * Create account through Edge Function.
     *
     * IMPORTANT:
     * No Service Role Key here.
     */

    const {
      data: result,
      error
    } =
      await studentAccountSupabase.functions.invoke(
        "create-student-account",
        {
          body: {
            student_id:
              student.id,

            password:
              password
          }
        }
      );


    if (error) {

      console.error(
        "CREATE ACCOUNT FUNCTION ERROR:",
        error
      );

      throw new Error(
        error.message ||
        "Student account creation failed."
      );

    }


    if (
      !result?.success
    ) {

      throw new Error(
        result?.message ||
        "Student account creation failed."
      );

    }


    /*
     * Update local student object
     */

    selectedAccountStudent = {
      ...student,

      auth_user_id:
        result.auth_user_id,

      login_username:
        result.credentials?.username ||
        username,

      account_enabled:
        true,

      account_created_at:
        new Date().toISOString()
    };


    /*
     * Render credentials
     */

    showCreatedCredentials(
      selectedAccountStudent,
      result.credentials?.username ||
        username,
      result.credentials?.password ||
        password
    );


    /*
     * Update controls
     */

    updateAccountControls(
      selectedAccountStudent
    );


    showAccountMessage(
      "✅ Student account si guul leh ayaa loo sameeyay.",
      "success"
    );


    /*
     * Clear password input
     * after displaying credentials.
     */

    if (passwordInput) {

      passwordInput.value =
        "";

    }


  }

  catch (error) {

    console.error(
      "CREATE STUDENT ACCOUNT EXCEPTION:",
      error
    );


    showAccountMessage(
      error.message ||
      "Unable to create student account.",
      "error"
    );

  }

  finally {

    setAccountCreationBusy(
      false
    );

  }

}


/* =========================================================
   SHOW CREATED CREDENTIALS
   ========================================================= */

function showCreatedCredentials(
  student,
  username,
  password
) {

  setText(
    "credentialStudentName",
    student.full_name ||
    "--"
  );


  setText(
    "createdStudentUsername",
    username ||
    "--"
  );


  setText(
    "createdStudentPassword",
    password ||
    "--"
  );


  const loginUrl =
    new URL(
      "student-login.html",
      window.location.href
    ).href;


  setText(
    "studentLoginUrl",
    loginUrl
  );


  const box =
    account$(
      "createdStudentCredentials"
    );


  if (box) {

    box.classList.remove(
      "hidden"
    );


    box.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }

}


/* =========================================================
   COPY FULL CREDENTIALS
   ========================================================= */

async function copyFullStudentCredentials() {

  if (
    !selectedAccountStudent
  ) {

    showAccountMessage(
      "Student lama dooran.",
      "warning"
    );

    return;

  }


  const username =
    account$(
      "createdStudentUsername"
    )?.textContent?.trim();


  const password =
    account$(
      "createdStudentPassword"
    )?.textContent?.trim();


  const loginUrl =
    account$(
      "studentLoginUrl"
    )?.textContent?.trim();


  if (
    !username ||
    username === "--" ||
    !password ||
    password === "--"
  ) {

    showAccountMessage(
      "Credentials lama helin.",
      "warning"
    );

    return;

  }


  const text =
`GAAWOW ACADEMY
STUDENT LOGIN CREDENTIALS

Student:
${selectedAccountStudent.full_name || "--"}

Student ID:
${selectedAccountStudent.student_id || "--"}

Username:
${username}

Password:
${password}

Student Login:
${loginUrl}

IMPORTANT:
Please keep these credentials private.`;


  await copyText(
    text,
    account$(
      "copyFullStudentCredentialsBtn"
    )
  );

}


/* =========================================================
   RESET PASSWORD
   ========================================================= */

async function resetStudentPassword() {

  if (
    accountCreationBusy
  ) {
    return;
  }


  if (
    !selectedAccountStudent?.auth_user_id
  ) {

    showAccountMessage(
      "Student-kan ma laha account.",
      "warning"
    );

    return;

  }


  const generated =
    generateSecurePassword(
      12
    );


  const confirmed =
    window.confirm(
      `Reset password-ka student-kan?\n\n` +
      `${selectedAccountStudent.full_name}\n` +
      `${selectedAccountStudent.student_id}\n\n` +
      `New Password:\n${generated}`
    );


  if (!confirmed) {
    return;
  }


  setAccountCreationBusy(
    true
  );


  try {

    const result =
      await invokeAdminFunction(
        "reset-student-password",
        {
          student_id:
            selectedAccountStudent.id,

          password:
            generated
        }
      );


    if (
      !result?.success
    ) {

      throw new Error(
        result?.message ||
        "Password reset failed."
      );

    }


    showCreatedCredentials(
      selectedAccountStudent,
      selectedAccountStudent.login_username ||
      selectedAccountStudent.student_id,
      result.password ||
      generated
    );


    showAccountMessage(
      "✅ Student password successfully reset.",
      "success"
    );


  }

  catch (error) {

    console.error(
      "RESET PASSWORD ERROR:",
      error
    );

    showAccountMessage(
      error.message ||
      "Password reset failed.",
      "error"
    );

  }

  finally {

    setAccountCreationBusy(
      false
    );

  }

}


/* =========================================================
   DISABLE ACCOUNT
   ========================================================= */

async function disableStudentAccount() {

  if (
    accountCreationBusy
  ) {
    return;
  }


  if (
    !selectedAccountStudent?.auth_user_id
  ) {

    showAccountMessage(
      "Student-kan ma laha account.",
      "warning"
    );

    return;

  }


  const confirmed =
    window.confirm(
      `Ma hubtaa inaad disable-gareyso account-ka?\n\n` +
      `${selectedAccountStudent.full_name}\n` +
      `${selectedAccountStudent.student_id}`
    );


  if (!confirmed) {
    return;
  }


  setAccountCreationBusy(
    true
  );


  try {

    const result =
      await invokeAdminFunction(
        "disable-student-account",
        {
          student_id:
            selectedAccountStudent.id
        }
      );


    if (
      !result?.success
    ) {

      throw new Error(
        result?.message ||
        "Unable to disable account."
      );

    }


    selectedAccountStudent = {
      ...selectedAccountStudent,

      account_enabled:
        false
    };


    updateAccountControls(
      selectedAccountStudent
    );


    showAccountMessage(
      "🚫 Student account waa la disable-gareeyay.",
      "success"
    );

  }

  catch (error) {

    console.error(
      "DISABLE ACCOUNT ERROR:",
      error
    );

    showAccountMessage(
      error.message ||
      "Unable to disable student account.",
      "error"
    );

  }

  finally {

    setAccountCreationBusy(
      false
    );

  }

}


/* =========================================================
   ENABLE ACCOUNT
   ========================================================= */

async function enableStudentAccount() {

  if (
    accountCreationBusy
  ) {
    return;
  }


  if (
    !selectedAccountStudent?.auth_user_id
  ) {

    showAccountMessage(
      "Student-kan ma laha account.",
      "warning"
    );

    return;

  }


  const confirmed =
    window.confirm(
      `Enable student account?\n\n` +
      `${selectedAccountStudent.full_name}\n` +
      `${selectedAccountStudent.student_id}`
    );


  if (!confirmed) {
    return;
  }


  setAccountCreationBusy(
    true
  );


  try {

    const result =
      await invokeAdminFunction(
        "enable-student-account",
        {
          student_id:
            selectedAccountStudent.id
        }
      );


    if (
      !result?.success
    ) {

      throw new Error(
        result?.message ||
        "Unable to enable account."
      );

    }


    selectedAccountStudent = {
      ...selectedAccountStudent,

      account_enabled:
        true
    };


    updateAccountControls(
      selectedAccountStudent
    );


    showAccountMessage(
      "✅ Student account waa la enable-gareeyay.",
      "success"
    );

  }

  catch (error) {

    console.error(
      "ENABLE ACCOUNT ERROR:",
      error
    );

    showAccountMessage(
      error.message ||
      "Unable to enable student account.",
      "error"
    );

  }

  finally {

    setAccountCreationBusy(
      false
    );

  }

}


/* =========================================================
   GENERIC ADMIN EDGE FUNCTION
   ========================================================= */

async function invokeAdminFunction(
  functionName,
  body
) {

  const session =
    await getCurrentSession();


  if (!session?.user) {

    redirectSuperAdminLogin();

    throw new Error(
      "Admin session has expired."
    );

  }


  const {
    data,
    error
  } =
    await studentAccountSupabase.functions.invoke(
      functionName,
      {
        body
      }
    );


  if (error) {

    throw new Error(
      error.message ||
      `Function ${functionName} failed.`
    );

  }


  return data;

}


/* =========================================================
   CURRENT SESSION
   ========================================================= */

async function getCurrentSession() {

  const {
    data,
    error
  } =
    await studentAccountSupabase.auth.getSession();


  if (error) {

    console.error(
      "GET SESSION ERROR:",
      error
    );

    return null;

  }


  return data?.session ||
    null;

}


/* =========================================================
   SECURE PASSWORD GENERATOR
   ========================================================= */

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
    "@#$%";

  const all =
    uppercase +
    lowercase +
    numbers +
    symbols;


  const password = [];


  /*
   * Guarantee at least one character
   * from each category.
   */

  password.push(
    randomCharacter(
      uppercase
    )
  );

  password.push(
    randomCharacter(
      lowercase
    )
  );

  password.push(
    randomCharacter(
      numbers
    )
  );

  password.push(
    randomCharacter(
      symbols
    )
  );


  while (
    password.length <
    length
  ) {

    password.push(
      randomCharacter(
        all
      )
    );

  }


  /*
   * Secure shuffle
   */

  for (
    let i = password.length - 1;
    i > 0;
    i--
  ) {

    const random =
      new Uint32Array(1);

    crypto.getRandomValues(
      random
    );

    const j =
      random[0] %
      (i + 1);


    [
      password[i],
      password[j]
    ] =
    [
      password[j],
      password[i]
    ];

  }


  return password.join("");

}


/* =========================================================
   RANDOM CHARACTER
   ========================================================= */

function randomCharacter(
  characters
) {

  const random =
    new Uint32Array(1);

  crypto.getRandomValues(
    random
  );

  return characters[
    random[0] %
    characters.length
  ];

}


/* =========================================================
   COPY TEXT
   ========================================================= */

async function copyText(
  text,
  button = null
) {

  if (!text) {
    return false;
  }


  try {

    await navigator.clipboard.writeText(
      text
    );


    if (button) {

      const original =
        button.textContent;

      button.textContent =
        "✓ Copied";

      setTimeout(
        () => {

          button.textContent =
            original;

        },
        1500
      );

    }


    showAccountMessage(
      "📋 Copied successfully.",
      "success"
    );


    return true;

  }

  catch (error) {

    console.error(
      "COPY ERROR:",
      error
    );


    /*
     * Fallback
     */

    try {

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

      textarea.focus();

      textarea.select();

      document.execCommand(
        "copy"
      );

      textarea.remove();


      showAccountMessage(
        "📋 Copied successfully.",
        "success"
      );


      return true;

    }

    catch (fallbackError) {

      console.error(
        "COPY FALLBACK ERROR:",
        fallbackError
      );


      showAccountMessage(
        "Copy failed. Fadlan gacanta ku copy garee.",
        "error"
      );


      return false;

    }

  }

}


/* =========================================================
   COPY ELEMENT TEXT
   ========================================================= */

async function copyElementText(
  elementId,
  button = null
) {

  const element =
    account$(
      elementId
    );


  if (!element) {

    showAccountMessage(
      "Copy target lama helin.",
      "error"
    );

    return;

  }


  const text =
    element.textContent.trim();


  if (
    !text ||
    text === "--"
  ) {

    showAccountMessage(
      "Wax la copy gareeyo lama helin.",
      "warning"
    );

    return;

  }


  await copyText(
    text,
    button
  );

}


/* =========================================================
   ACCOUNT STATUS BADGE
   ========================================================= */

function getAccountStatusBadge(
  student
) {

  if (
    !student.auth_user_id
  ) {

    return `
      <span class="status-badge status-warning">
        No Account
      </span>
    `;

  }


  if (
    student.account_enabled === false
  ) {

    return `
      <span class="status-badge status-danger">
        Disabled
      </span>
    `;

  }


  return `
    <span class="status-badge status-success">
      Active
    </span>
  `;

}


/* =========================================================
   ACCOUNT BUSY
   ========================================================= */

function setAccountCreationBusy(
  busy
) {

  accountCreationBusy =
    busy;


  const buttons = [

    account$(
      "createStudentAccountBtn"
    ),

    account$(
      "resetStudentAccountBtn"
    ),

    account$(
      "disableStudentAccountBtn"
    ),

    account$(
      "enableStudentAccountBtn"
    ),

    account$(
      "generateAccountPasswordBtn"
    ),

    account$(
      "accountStudentSearchBtn"
    )

  ];


  buttons.forEach(
    button => {

      if (!button) return;

      button.disabled =
        busy;

    }
  );


  const createButton =
    account$(
      "createStudentAccountBtn"
    );


  if (
    busy &&
    createButton &&
    !createButton.classList.contains(
      "hidden"
    )
  ) {

    createButton.dataset.oldText =
      createButton.textContent;

    createButton.textContent =
      "Creating...";

  }


  if (
    !busy &&
    createButton &&
    createButton.dataset.oldText
  ) {

    createButton.textContent =
      createButton.dataset.oldText;

    delete createButton.dataset.oldText;

  }

}


/* =========================================================
   SEARCH BUTTON LOADING
   ========================================================= */

function setSearchButtonLoading(
  loading
) {

  const button =
    account$(
      "accountStudentSearchBtn"
    );


  if (!button) {
    return;
  }


  if (loading) {

    button.dataset.oldText =
      button.textContent;

    button.textContent =
      "Searching...";

    button.disabled =
      true;

  }

  else {

    button.textContent =
      button.dataset.oldText ||
      "Search";

    button.disabled =
      false;

    delete button.dataset.oldText;

  }

}


/* =========================================================
   SHOW ACCOUNT MESSAGE
   ========================================================= */

function showAccountMessage(
  message,
  type = "info"
) {

  const element =
    account$(
      "studentAccountMessage"
    );


  if (!element) {

    console.log(
      `[Student Account ${type}]`,
      message
    );

    return;

  }


  element.textContent =
    message;


  element.className =
    "account-message";


  element.classList.add(
    `account-message-${type}`
  );


  element.classList.remove(
    "hidden"
  );


}


/* =========================================================
   HIDE MESSAGE
   ========================================================= */

function hideAccountMessage() {

  const element =
    account$(
      "studentAccountMessage"
    );


  if (element) {

    element.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   CLEAR UI
   ========================================================= */

function clearStudentAccountUI() {

  selectedAccountStudent =
    null;


  const selectedCard =
    account$(
      "selectedAccountStudentCard"
    );


  if (selectedCard) {

    selectedCard.classList.add(
      "hidden"
    );

  }


  const results =
    account$(
      "accountStudentResults"
    );


  if (results) {

    results.classList.add(
      "hidden"
    );

  }


  const credentials =
    account$(
      "createdStudentCredentials"
    );


  if (credentials) {

    credentials.classList.add(
      "hidden"
    );

  }


  hideAccountMessage();


  setText(
    "accountSelectedStudentId",
    "--"
  );

  setText(
    "accountSelectedStudentName",
    "--"
  );

  setText(
    "accountSelectedStudentEmail",
    "--"
  );

  setText(
    "accountSelectedStudentAccount",
    "--"
  );

  setText(
    "selectedAccountStatus",
    "--"
  );

  setText(
    "credentialStudentName",
    "--"
  );

  setText(
    "createdStudentUsername",
    "--"
  );

  setText(
    "createdStudentPassword",
    "--"
  );

  setText(
    "studentLoginUrl",
    "--"
  );


  const username =
    account$(
      "accountUsername"
    );

  if (username) {

    username.value =
      "";

  }


  const password =
    account$(
      "accountPassword"
    );

  if (password) {

    password.value =
      "";

  }

}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
  id,
  value
) {

  const element =
    account$(
      id
    );


  if (element) {

    element.textContent =
      value ??
      "--";

  }

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(
  value
) {

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
   REDIRECT SUPER ADMIN LOGIN
   ========================================================= */

function redirectSuperAdminLogin() {

  /*
   * Change this filename if your existing
   * Super Admin login page uses another name.
   */

  window.location.href =
    "login.html";

}


/* =========================================================
   OPTIONAL:
   Refresh selected student from database
   ========================================================= */

async function refreshSelectedAccountStudent() {

  if (
    !selectedAccountStudent?.id
  ) {
    return;
  }


  const {
    data,
    error
  } =
    await studentAccountSupabase
      .from("students")
      .select(`
        id,
        student_id,
        full_name,
        email,
        phone,
        status,
        account_enabled,
        auth_user_id,
        login_username,
        account_created_at,
        last_login_at
      `)
      .eq(
        "id",
        selectedAccountStudent.id
      )
      .maybeSingle();


  if (
    error ||
    !data
  ) {

    console.error(
      "REFRESH STUDENT ERROR:",
      error
    );

    return;

  }


  selectedAccountStudent =
    data;


  renderSelectedStudent(
    data
  );

}


/* =========================================================
   EXPOSE OPTIONAL FUNCTIONS
   ========================================================= */

window.GaawowStudentAccounts = {

  searchStudents,

  selectAccountStudent,

  createStudentAccount,

  resetStudentPassword,

  disableStudentAccount,

  enableStudentAccount,

  refreshSelectedAccountStudent,

  generateSecurePassword

};


/* =========================================================
   END
   ========================================================= */
