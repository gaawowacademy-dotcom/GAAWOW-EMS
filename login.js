
"use strict";

/* =========================================================
   GAAWOW EMS - SECURE LOGIN
   Supabase Authentication
   Six system roles
   Forgot Password / Email Recovery
   ========================================================= */

(() => {
  // -------------------------------------------------------
  // 1. SUPABASE CONFIGURATION
  // -------------------------------------------------------

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const RESET_PASSWORD_URL =
    "https://gaawowacademy-dotcom.github.io/GAAWOW-EMS/reset-password.html";

  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase library was not loaded.");
    return;
  }

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    }
  );

  // -------------------------------------------------------
  // 2. HTML ELEMENTS
  // -------------------------------------------------------

  const loginForm =
    document.getElementById("loginForm");

  const emailInput =
    document.getElementById("email");

  const passwordInput =
    document.getElementById("password");

  const loginButton =
    document.getElementById("loginBtn");

  const messageBox =
    document.getElementById("loginMessage");

  const forgotPasswordBtn =
    document.getElementById("forgotPasswordBtn");

  if (
    !loginForm ||
    !emailInput ||
    !passwordInput ||
    !loginButton ||
    !messageBox ||
    !forgotPasswordBtn
  ) {
    console.error(
      "[GAAWOW LOGIN] Required HTML element is missing."
    );
    return;
  }

  let loginInProgress = false;
  let resetInProgress = false;

  // -------------------------------------------------------
  // 3. MESSAGE HANDLER
  // -------------------------------------------------------

  function showMessage(message, type = "error") {
    messageBox.textContent = message;
    messageBox.className = "login-message " + type;
  }

  function clearMessage() {
    messageBox.textContent = "";
    messageBox.className = "login-message";
  }

  // -------------------------------------------------------
  // 4. ROLE ROUTES
  // -------------------------------------------------------

  const ROLE_ROUTES = {
    super_admin: "./dashboard.html",
    school_admin: "./school-dashboard.html",
    teacher: "./teacher-portal.html",
    parent: "./parent.html",
    student: "./student.html",
    finance_manager: "./financial.html"
  };

  function redirectByRole(role) {
    const destination = ROLE_ROUTES[role];

    if (!destination) {
      showMessage(
        "Your account role is not authorized to access this system."
      );
      return false;
    }

    window.location.replace(destination);
    return true;
  }

  // -------------------------------------------------------
  // 5. PROFILE STATUS CHECK
  // -------------------------------------------------------

  function profileIsInactive(profile) {
    if (!profile) return true;

    if (profile.is_active === false) return true;
    if (profile.active === false) return true;

    const status = String(
      profile.status || profile.account_status || ""
    ).toLowerCase();

    return [
      "inactive",
      "disabled",
      "suspended",
      "blocked"
    ].includes(status);
  }

  // -------------------------------------------------------
  // 6. GET USER PROFILE
  // -------------------------------------------------------

  async function getUserProfile(userId) {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[PROFILE ERROR]", error);
      throw new Error(
        "Unable to verify your account profile. Please try again."
      );
    }

    if (!data) {
      throw new Error(
        "Your account profile was not found. Please contact GAAWOW EMS administration."
      );
    }

    if (profileIsInactive(data)) {
      throw new Error(
        "Your account is inactive or suspended. Please contact your administrator."
      );
    }

    if (!data.role || !ROLE_ROUTES[data.role]) {
      throw new Error(
        "Your account has no valid system role. Contact your administrator."
      );
    }

    return data;
  }

  // -------------------------------------------------------
  // 7. VERIFY STUDENT ACCOUNT
  // -------------------------------------------------------

  async function verifyStudent(userId) {
    const { data, error } = await supabaseClient
      .from("students")
      .select("*")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[STUDENT VERIFICATION ERROR]", error);
      throw new Error(
        "Unable to verify your student record. Please contact the school."
      );
    }

    if (!data) {
      throw new Error(
        "Your student record was not found or is not linked to this login account."
      );
    }

    if (data.account_enabled === false) {
      throw new Error(
        "Your student login account is disabled. Please contact the school."
      );
    }

    return data;
  }

  // -------------------------------------------------------
  // 8. COMPLETE AUTHENTICATED LOGIN
  // -------------------------------------------------------

  async function completeLogin(user) {
    if (!user || !user.id) {
      throw new Error("Authentication session is invalid.");
    }

    const profile = await getUserProfile(user.id);

    if (profile.role === "student") {
      await verifyStudent(user.id);
    }

    redirectByRole(profile.role);
  }

  // -------------------------------------------------------
  // 9. LOGIN FORM
  // -------------------------------------------------------

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (loginInProgress) return;

    clearMessage();

    const email = String(emailInput.value || "")
      .trim()
      .toLowerCase();

    const password = String(passwordInput.value || "");

    if (!email || !password) {
      showMessage("Please enter your email and password.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      showMessage("Please enter a valid email address.");
      emailInput.focus();
      return;
    }

    loginInProgress = true;
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        console.error("[LOGIN AUTH ERROR]", error);

        if (
          error.message.toLowerCase().includes("invalid login credentials")
        ) {
          throw new Error(
            "Incorrect email or password. Please try again."
          );
        }

        if (
          error.message.toLowerCase().includes("email not confirmed")
        ) {
          throw new Error(
            "Your email address has not been confirmed yet."
          );
        }

        throw new Error(error.message);
      }

      if (!data || !data.user) {
        throw new Error("Login failed. Please try again.");
      }

      await completeLogin(data.user);

    } catch (error) {
      console.error("[GAAWOW LOGIN ERROR]", error);

      showMessage(
        error.message ||
        "Login failed. Please try again."
      );

      loginInProgress = false;
      loginButton.disabled = false;
      loginButton.textContent = "🔐 Sign In";
    }
  });

  // -------------------------------------------------------
  // 10. FORGOT PASSWORD
  // -------------------------------------------------------

  forgotPasswordBtn.addEventListener("click", async function () {
    if (resetInProgress) return;

    clearMessage();

    const email = String(emailInput.value || "")
      .trim()
      .toLowerCase();

    if (!email) {
      showMessage(
        "Please enter your registered email address first."
      );

      emailInput.focus();
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      showMessage("Please enter a valid email address.");
      emailInput.focus();
      return;
    }

    resetInProgress = true;
    forgotPasswordBtn.disabled = true;
    forgotPasswordBtn.textContent = "Sending email...";

    try {
      const { error } =
        await supabaseClient.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: RESET_PASSWORD_URL
          }
        );

      if (error) {
        console.error("[PASSWORD RESET ERROR]", error);
        throw error;
      }

      showMessage(
        "Password reset request submitted. If this email belongs to an account, check your Inbox and Spam folder.",
        "success"
      );

    } catch (error) {
      console.error("[FORGOT PASSWORD ERROR]", error);

      showMessage(
        error.message ||
        "Unable to send the password reset email. Please try again."
      );

    } finally {
      resetInProgress = false;
      forgotPasswordBtn.disabled = false;
      forgotPasswordBtn.textContent = "Forgot Password?";
    }
  });

  // -------------------------------------------------------
  // 11. CHECK EXISTING SESSION
  // -------------------------------------------------------

  async function checkExistingSession() {
    try {
      const { data, error } =
        await supabaseClient.auth.getSession();

      if (error) {
        console.error("[SESSION CHECK ERROR]", error);
        return;
      }

      const session = data && data.session;

      if (!session || !session.user) {
        return;
      }

      loginButton.disabled = true;
      loginButton.textContent = "Checking account...";

      await completeLogin(session.user);

    } catch (error) {
      console.error("[EXISTING SESSION ERROR]", error);

      loginButton.disabled = false;
      loginButton.textContent = "🔐 Sign In";

      showMessage(
        error.message ||
        "Unable to verify your existing session."
      );
    }
  }

  // -------------------------------------------------------
  // 12. START LOGIN SYSTEM
  // -------------------------------------------------------

  checkExistingSession();

  console.log("GAAWOW EMS Secure Login initialized.");

})();
