/* =========================================================
   GAAWOW EMS
   STUDENTS.JS — STUDENT ACCOUNT MANAGEMENT
   Supabase + create-student-account Edge Function
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );


/* =========================================================
   STATE
   ========================================================= */

let selectedStudent = null;

let generatedPassword = "";


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


function showElement(element) {
  if (!element) return;

  element.classList.remove(
    "hidden",
  );
}


function hideElement(element) {
  if (!element) return;

  element.classList.add(
    "hidden",
  );
}


function setText(id, value) {
  const element = $(id);

  if (!element) return;

  element.textContent =
    value ?? "--";
}


/* =========================================================
   PASSWORD GENERATOR
   ========================================================= */

function generateStudentPassword(
  length = 12,
) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";

  const values =
    new Uint32Array(length);

  crypto.getRandomValues(values);

  let password = "";

  for (let i = 0; i < length; i++) {
    password +=
      chars[
        values[i] % chars.length
      ];
  }

  return password;
}


/* =========================================================
   OPEN STUDENT ACCOUNT MODAL
   ========================================================= */

async function openStudentAccountModal(
  student,
) {
  if (!student) {
    alert(
      "Student information is missing.",
    );

    return;
  }

  selectedStudent =
    student;

  generatedPassword = "";

  /*
   * Student ID
   *
   * Prefer:
   * GA-2026-00001
   */

  const studentCode =
    student.student_id ??
    student.studentId ??
    student.id ??
    "";

  setText(
    "accountStudentName",
    student.full_name ??
      student.fullName ??
      "--",
  );

  setText(
    "accountStudentId",
    studentCode,
  );

  const usernameInput =
    $(
      "studentAccountUsername",
    );

  if (usernameInput) {
    usernameInput.value =
      String(
        student.login_username ??
          studentCode ??
          "",
      )
        .trim()
        .toLowerCase();
  }

  const passwordInput =
    $(
      "studentAccountPassword",
    );

  if (passwordInput) {
    passwordInput.value =
      "";
  }

  hideElement(
    $("studentAccountResult"),
  );

  const createButton =
    $(
      "confirmCreateStudentAccount",
    );

  if (createButton) {
    createButton.disabled =
      false;

    createButton.textContent =
      "🔐 Create Account";
  }

  showElement(
    $("studentAccountModal"),
  );
}


/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeStudentAccountModal() {
  selectedStudent = null;

  generatedPassword = "";

  hideElement(
    $("studentAccountModal"),
  );
}


/* =========================================================
   GENERATE PASSWORD BUTTON
   ========================================================= */

function generateStudentPasswordUI() {
  const password =
    generateStudentPassword(
      12,
    );

  generatedPassword =
    password;

  const input =
    $(
      "studentAccountPassword",
    );

  if (input) {
    input.type =
      "text";

    input.value =
      password;
  }
}


/* =========================================================
   CREATE STUDENT ACCOUNT
   ========================================================= */

async function createStudentAccount() {
  if (!selectedStudent) {
    alert(
      "Please select a student first.",
    );

    return;
  }

  /*
   * =======================================================
   * GET CURRENT SESSION
   * =======================================================
   */

  const {
    data: sessionData,
    error: sessionError,
  } =
    await supabaseClient.auth
      .getSession();

  if (
    sessionError ||
    !sessionData.session
  ) {
    alert(
      "Access denied or login session expired.",
    );

    window.location.href =
      "index.html";

    return;
  }

  /*
   * =======================================================
   * GET CURRENT USER
   * =======================================================
   */

  const user =
    sessionData.session.user;

  if (!user) {
    alert(
      "Login session expired.",
    );

    window.location.href =
      "index.html";

    return;
  }

  /*
   * =======================================================
   * VERIFY SUPER ADMIN BEFORE REQUEST
   * =======================================================
   */

  const {
    data: profile,
    error: profileError,
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "id, role, is_active",
      )
      .eq(
        "id",
        user.id,
      )
      .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    console.error(
      "Profile error:",
      profileError,
    );

    alert(
      "Unable to verify Super Admin profile.",
    );

    return;
  }

  if (
    profile.role !==
    "super_admin"
  ) {
    alert(
      "Access denied. Super Admin only.",
    );

    return;
  }

  if (
    profile.is_active !==
    true
  ) {
    alert(
      "Your Super Admin account is inactive.",
    );

    await supabaseClient.auth
      .signOut();

    window.location.href =
      "index.html";

    return;
  }

  /*
   * =======================================================
   * STUDENT ID
   * =======================================================
   */

  const studentId =
    String(
      selectedStudent.student_id ??
        selectedStudent.studentId ??
        "",
    ).trim();

  if (!studentId) {
    alert(
      "Student ID is missing.",
    );

    return;
  }

  /*
   * =======================================================
   * USERNAME
   * =======================================================
   */

  const usernameInput =
    $(
      "studentAccountUsername",
    );

  const username =
    String(
      usernameInput?.value ??
        "",
    )
      .trim()
      .toLowerCase();

  if (!username) {
    alert(
      "Username is required.",
    );

    return;
  }

  /*
   * =======================================================
   * PASSWORD
   * =======================================================
   *
   * Empty = Edge Function generates one.
   */

  const passwordInput =
    $(
      "studentAccountPassword",
    );

  const password =
    String(
      passwordInput?.value ??
        "",
    ).trim();

  /*
   * =======================================================
   * UI LOADING
   * =======================================================
   */

  const button =
    $(
      "confirmCreateStudentAccount",
    );

  if (button) {
    button.disabled =
      true;

    button.textContent =
      "⏳ Creating Account...";
  }

  try {
    /*
     * =====================================================
     * INVOKE EDGE FUNCTION
     * =====================================================
     *
     * supabase.functions.invoke()
     * automatically sends the current session
     * authorization token.
     */

    const {
      data,
      error,
    } =
      await supabaseClient.functions
        .invoke(
          "create-student-account",
          {
            body: {
              student_id:
                studentId,

              username,

              password:
                password || undefined,
            },
          },
        );

    /*
     * =====================================================
     * EDGE FUNCTION ERROR
     * =====================================================
     */

    if (error) {
      console.error(
        "Edge Function error:",
        error,
      );

      let message =
        error.message ||
        "Unable to create student account.";

      /*
       * Try to read actual JSON error
       */

      if (error.context) {
        try {
          const errorBody =
            await error.context.json();

          if (
            errorBody?.error
          ) {
            message =
              errorBody.error;
          }
        } catch {
          // Ignore JSON parsing failure.
        }
      }

      throw new Error(
        message,
      );
    }

    /*
     * =====================================================
     * FUNCTION RESPONSE ERROR
     * =====================================================
     */

    if (
      !data ||
      data.success !== true
    ) {
      throw new Error(
        data?.error ||
          "Student account creation failed.",
      );
    }

    /*
     * =====================================================
     * SUCCESS
     * =====================================================
     */

    const createdUsername =
      data.account?.username ??
      username;

    const createdPassword =
      data.account?.password ??
      password;

    /*
     * Display result
     */

    setText(
      "createdUsername",
      createdUsername,
    );

    setText(
      "createdPassword",
      createdPassword,
    );

    showElement(
      $("studentAccountResult"),
    );

    /*
     * Disable create button.
     */

    if (button) {
      button.disabled =
        true;

      button.textContent =
        "✅ Account Created";
    }

    /*
     * Update selected student locally.
     */

    selectedStudent =
      {
        ...selectedStudent,

        auth_user_id:
          data.account
            ?.auth_user_id ??
          selectedStudent.auth_user_id,

        login_username:
          createdUsername,

        account_enabled:
          true,
      };

    /*
     * Optional refresh event.
     */

    window.dispatchEvent(
      new CustomEvent(
        "studentAccountCreated",
        {
          detail: {
            student:
              selectedStudent,

            account: {
              username:
                createdUsername,

              password:
                createdPassword,

              auth_user_id:
                data.account
                  ?.auth_user_id,
            },
          },
        },
      ),
    );

    /*
     * Do NOT auto-copy password.
     */

  } catch (error) {
    console.error(
      "Create student account error:",
      error,
    );

    alert(
      error?.message ||
        "Unable to create student account.",
    );

    if (button) {
      button.disabled =
        false;

      button.textContent =
        "🔐 Create Account";
    }
  }
}


/* =========================================================
   COPY CREDENTIALS
   ========================================================= */

async function copyStudentCredentials() {
  const username =
    $(
      "createdUsername",
    )?.textContent?.trim() ||
    "";

  const password =
    $(
      "createdPassword",
    )?.textContent?.trim() ||
    "";

  if (
    !username ||
    !password
  ) {
    alert(
      "No credentials available.",
    );

    return;
  }

  const text =
    `GAAWOW ACADEMY — Student Login\n\n` +
    `Username: ${username}\n` +
    `Password: ${password}`;

  try {
    await navigator.clipboard.writeText(
      text,
    );

    const button =
      $(
        "copyStudentCredentials",
      );

    if (button) {
      const oldText =
        button.textContent;

      button.textContent =
        "✅ Copied";

      setTimeout(() => {
        button.textContent =
          oldText;
      }, 1800);
    }

  } catch (error) {
    console.error(
      "Clipboard error:",
      error,
    );

    /*
     * Fallback
     */

    const textarea =
      document.createElement(
        "textarea",
      );

    textarea.value =
      text;

    textarea.style.position =
      "fixed";

    textarea.style.opacity =
      "0";

    document.body.appendChild(
      textarea,
    );

    textarea.select();

    document.execCommand(
      "copy",
    );

    textarea.remove();

    alert(
      "Username and password copied.",
    );
  }
}


/* =========================================================
   FIND STUDENT BY STUDENT ID
   ========================================================= */

async function getStudentByStudentId(
  studentId,
) {
  if (!studentId) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabaseClient
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
        account_enabled,
        auth_user_id,
        login_username,
        account_created_at,
        last_login_at,
        password_changed_at
      `)
      .eq(
        "student_id",
        studentId,
      )
      .maybeSingle();

  if (error) {
    console.error(
      "Student lookup error:",
      error,
    );

    return null;
  }

  return data;
}


/* =========================================================
   OPEN FROM BUTTON
   =========================================================
   Supports buttons such as:
 *
 * <button
 *   class="create-student-account"
 *   data-student-id="GA-2026-00001">
 *   🔐 Create Student Account
 * </button>
 */

async function handleCreateAccountButton(
  button,
) {
  const studentId =
    button.dataset.studentId;

  const studentName =
    button.dataset.studentName;

  if (!studentId) {
    alert(
      "Student ID is missing from the button.",
    );

    return;
  }

  /*
   * If complete student object is already
   * available in data attributes.
   */

  if (studentName) {
    await openStudentAccountModal({
      student_id:
        studentId,

      full_name:
        studentName,

      login_username:
        button.dataset.username ||
        "",
    });

    return;
  }

  /*
   * Otherwise load student from database.
   */

  button.disabled =
    true;

  try {
    const student =
      await getStudentByStudentId(
        studentId,
      );

    if (!student) {
      alert(
        `Student "${studentId}" was not found.`,
      );

      return;
    }

    if (
      student.auth_user_id
    ) {
      alert(
        "This student already has a login account.",
      );

      return;
    }

    await openStudentAccountModal(
      student,
    );

  } finally {
    button.disabled =
      false;
  }
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function initializeStudentAccountUI() {
  /*
   * Open modal button
   */

  document.addEventListener(
    "click",
    async (event) => {
      const button =
        event.target.closest(
          "#createStudentAccountBtn, .create-student-account",
        );

      if (!button) {
        return;
      }

      /*
       * If an external students page already
       * set window.selectedStudentForAccount,
       * use it.
       */

      if (
        window.selectedStudentForAccount
      ) {
        await openStudentAccountModal(
          window.selectedStudentForAccount,
        );

        return;
      }

      await handleCreateAccountButton(
        button,
      );
    },
  );


  /*
   * Close button
   */

  const closeButton =
    $(
      "closeStudentAccountModal",
    );

  if (closeButton) {
    closeButton.addEventListener(
      "click",
      closeStudentAccountModal,
    );
  }


  /*
   * Generate password
   */

  const generateButton =
    $(
      "generateStudentPasswordBtn",
    );

  if (generateButton) {
    generateButton.addEventListener(
      "click",
      generateStudentPasswordUI,
    );
  }


  /*
   * Create account
   */

  const createButton =
    $(
      "confirmCreateStudentAccount",
    );

  if (createButton) {
    createButton.addEventListener(
      "click",
      createStudentAccount,
    );
  }


  /*
   * Copy credentials
   */

  const copyButton =
    $(
      "copyStudentCredentials",
    );

  if (copyButton) {
    copyButton.addEventListener(
      "click",
      copyStudentCredentials,
    );
  }


  /*
   * Close by clicking overlay
   */

  const modal =
    $(
      "studentAccountModal",
    );

  if (modal) {
    modal.addEventListener(
      "click",
      (event) => {
        if (
          event.target === modal
        ) {
          closeStudentAccountModal();
        }
      },
    );
  }


  /*
   * ESC closes modal
   */

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape"
      ) {
        closeStudentAccountModal();
      }
    },
  );
}


/* =========================================================
   SESSION / AUTH CHECK
   ========================================================= */

async function checkStudentsPageAccess() {
  const {
    data,
    error,
  } =
    await supabaseClient.auth
      .getSession();

  if (
    error ||
    !data.session
  ) {
    window.location.href =
      "index.html";

    return false;
  }

  const user =
    data.session.user;

  const {
    data: profile,
    error: profileError,
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "id, role, is_active",
      )
      .eq(
        "id",
        user.id,
      )
      .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    await supabaseClient.auth
      .signOut();

    window.location.href =
      "index.html";

    return false;
  }

  if (
    profile.is_active !==
    true
  ) {
    await supabaseClient.auth
      .signOut();

    alert(
      "Your account is inactive.",
    );

    window.location.href =
      "index.html";

    return false;
  }

  /*
   * Students management page:
   * Super Admin only.
   */

  if (
    profile.role !==
    "super_admin"
  ) {
    alert(
      "Access denied. Super Admin only.",
    );

    window.location.href =
      "index.html";

    return false;
  }

  return true;
}


/* =========================================================
   ACCOUNT CREATED EVENT
   ========================================================= */

window.addEventListener(
  "studentAccountCreated",
  (event) => {
    console.log(
      "Student account created:",
      event.detail,
    );

    /*
     * If your students table has an
     * account status column, refresh it here.
     *
     * Example:
     *
     * loadStudents();
     */
  },
);


/* =========================================================
   GLOBAL API
   =========================================================
   Allows your existing student list to call:
 *
 * openStudentAccountModal(student)
 *
 * Example:
 *
 * onclick="openStudentAccountModal(student)"
 */

window.openStudentAccountModal =
  openStudentAccountModal;

window.closeStudentAccountModal =
  closeStudentAccountModal;

window.createStudentAccount =
  createStudentAccount;

window.getStudentByStudentId =
  getStudentByStudentId;


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    initializeStudentAccountUI();

    /*
     * Access check.
     *
     * If your students.html is already protected
     * by another script, you can remove this call
     * from this file.
     */

    await checkStudentsPageAccess();
  },
);
