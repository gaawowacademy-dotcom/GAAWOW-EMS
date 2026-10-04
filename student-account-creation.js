/* ============================================================
   GAAWOW EMS
   STUDENT ACCOUNT CREATION MODULE
   ------------------------------------------------------------
   V5.4
   - Super Admin ONLY
   - Create Student Account
   - Reset Student Password
   - Uses Supabase Edge Function
   - No password stored in students table
   - No service-role key in browser
   - auth_user_id handled by server function
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     CONFIG
     ============================================================ */

  const EDGE_FUNCTION_NAME =
    "create-student-account";

  const MIN_PASSWORD_LENGTH =
    8;


  /* ============================================================
     STATE
     ============================================================ */

  let supabaseClient =
    null;

  let currentProfile =
    null;

  let currentUser =
    null;

  let initialized =
    false;

  let busy =
    false;


  /* ============================================================
     HELPERS
     ============================================================ */

  const $ =
    (id) =>
      document.getElementById(id);


  function errorMessage(error) {

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


  function isSuperAdmin() {

    return (
      currentProfile &&
      currentProfile.role ===
        "super_admin"
    );
  }


  function getPassword() {

    const password =
      window.prompt(
        "Enter temporary password.\n\nMinimum 8 characters:"
      );

    if (password === null) {
      return null;
    }

    const value =
      password.trim();

    if (!value) {

      showAccountMessage(
        "Password cannot be empty.",
        "error"
      );

      return null;
    }

    if (
      value.length <
      MIN_PASSWORD_LENGTH
    ) {

      showAccountMessage(
        `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
        "error"
      );

      return null;
    }

    return value;
  }


  function showAccountMessage(
    message,
    type = "success"
  ) {

    const box =
      $("message");

    if (!box) {
      return;
    }

    box.className =
      `message ${type}`;

    box.textContent =
      message;

    box.style.display =
      "block";
  }


  /* ============================================================
     INITIALIZE
     ============================================================ */

  function initialize(
    client,
    user,
    profile
  ) {

    if (initialized) {
      return;
    }

    supabaseClient =
      client;

    currentUser =
      user;

    currentProfile =
      profile;

    initialized =
      true;

    exposeGlobals();
  }


  /* ============================================================
     SECURITY
     ============================================================ */

  function verifySuperAdmin() {

    if (!currentUser) {

      throw new Error(
        "No authenticated user found."
      );
    }

    if (!currentProfile) {

      throw new Error(
        "Your profile could not be loaded."
      );
    }

    if (
      currentProfile.is_active ===
      false
    ) {

      throw new Error(
        "Your EMS profile is inactive."
      );
    }

    if (
      currentProfile.role !==
      "super_admin"
    ) {

      throw new Error(
        "Only Super Admin can manage student accounts."
      );
    }
  }


  /* ============================================================
     CREATE / RESET
     ============================================================ */

  async function manageStudentAccount(
    student,
    mode = "create"
  ) {

    if (busy) {
      return null;
    }

    try {

      verifySuperAdmin();

      if (!student) {

        throw new Error(
          "Student record was not provided."
        );
      }

      if (!student.id) {

        throw new Error(
          "Student database ID is missing."
        );
      }

      if (!student.student_id) {

        throw new Error(
          "Student ID is missing."
        );
      }

      if (
        student.status !==
        "active"
      ) {

        throw new Error(
          "Only active students can have an active login account."
        );
      }

      const isReset =
        mode === "reset";

      const password =
        getPassword();

      if (!password) {
        return null;
      }

      const action =
        isReset
          ? "reset the password for"
          : "create an account for";

      const confirmed =
        window.confirm(
          `Are you sure you want to ${action}:\n\n${student.full_name}\nStudent ID: ${student.student_id}?`
        );

      if (!confirmed) {
        return null;
      }

      busy =
        true;

      showAccountMessage(
        isReset
          ? "Resetting student password..."
          : "Creating student account...",
        "warning"
      );

      const {
        data,
        error
      } =
        await supabaseClient
          .functions
          .invoke(
            EDGE_FUNCTION_NAME,
            {
              body: {

                mode:
                  isReset
                    ? "reset"
                    : "create",

                student_db_id:
                  student.id,

                student_id:
                  student.student_id,

                password:
                  password
              }
            }
          );

      if (error) {

        console.error(
          "Student account Edge Function error:",
          error
        );

        throw new Error(
          error.message ||
          "Student account service failed."
        );
      }

      if (
        !data ||
        data.success !==
        true
      ) {

        throw new Error(
          data?.error ||
          "Student account operation failed."
        );
      }

      showAccountMessage(

        isReset

          ? `Password reset successfully for ${student.student_id}.`

          : `Student account created successfully for ${student.student_id}.`,

        "success"
      );

      return data;

    } catch (error) {

      console.error(
        "Student account operation:",
        error
      );

      showAccountMessage(
        `Student account operation failed: ${errorMessage(error)}`,
        "error"
      );

      return null;

    } finally {

      busy =
        false;
    }
  }


  /* ============================================================
     CREATE
     ============================================================ */

  async function createStudentAccount(
    student
  ) {

    return manageStudentAccount(
      student,
      "create"
    );
  }


  /* ============================================================
     RESET PASSWORD
     ============================================================ */

  async function resetStudentPassword(
    student
  ) {

    return manageStudentAccount(
      student,
      "reset"
    );
  }


  /* ============================================================
     GLOBAL API
     ============================================================ */

  function exposeGlobals() {

    window.createStudentAccount =
      createStudentAccount;

    window.resetStudentPassword =
      resetStudentPassword;

    window.GAAWOWStudentAccounts = {

      initialize,

      createStudentAccount,

      resetStudentPassword,

      manageStudentAccount

    };
  }


  exposeGlobals();

})();
