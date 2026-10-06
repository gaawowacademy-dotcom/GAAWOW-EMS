// ==========================================
// GAAWOW EMS - Supabase Configuration
// ==========================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

// Create Supabase client
const supabaseClient = window.supabase.createClient(
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

// ==========================================
// DOM ELEMENTS
// ==========================================

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");

// ==========================================
// MESSAGE
// ==========================================

function showMessage(text, type = "info") {
  message.textContent = text;

  if (type === "success") {
    message.style.color = "#16A34A";
  } else if (type === "error") {
    message.style.color = "#DC2626";
  } else {
    message.style.color = "#64748B";
  }
}

// ==========================================
// DETERMINE USER PORTAL
// ==========================================

async function redirectAfterLogin(user) {

  if (!user || !user.id) {
    throw new Error("User session is missing.");
  }

  console.log("Checking user type:", user.id);

  /*
   * IMPORTANT:
   * students table does NOT contain department_id.
   *
   * We only check auth_user_id here.
   */

  const { data: student, error: studentError } =
    await supabaseClient
      .from("students")
      .select("id,student_id,full_name,auth_user_id,account_enabled")
      .eq("auth_user_id", user.id)
      .maybeSingle();

  // --------------------------------------
  // Student found
  // --------------------------------------

  if (!studentError && student) {

    console.log("Student account detected:", student);

    if (student.account_enabled === false) {
      throw new Error(
        "Your student account is currently disabled. Please contact GAAWOW Academy."
      );
    }

    sessionStorage.setItem(
      "gaawow_student_id",
      student.id
    );

    sessionStorage.setItem(
      "gaawow_student_number",
      student.student_id || ""
    );

    sessionStorage.setItem(
      "gaawow_student_name",
      student.full_name || ""
    );

    /*
     * STUDENT PORTAL V8
     *
     * This page must contain the complete V8
     * single-file student portal.
     */
    window.location.href = "student-portal.html?v=8";

    return;
  }

  // --------------------------------------
  // Student lookup error
  // --------------------------------------

  if (studentError) {
    console.warn(
      "Student lookup failed:",
      studentError
    );
  }

  // --------------------------------------
  // Non-student user
  // --------------------------------------

  console.log(
    "No student record found. Redirecting to dashboard."
  );

  window.location.href = "dashboard.html";
}

// ==========================================
// LOGIN
// ==========================================

loginForm.addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage(
        "Please enter your email and password.",
        "error"
      );
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "LOGGING IN...";

    showMessage(
      "Checking your account...",
      "info"
    );

    try {

      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });

      // --------------------------------------
      // Supabase login error
      // --------------------------------------

      if (error) {

        console.error(
          "Supabase Login Error:",
          error
        );

        showMessage(
          error.message || "Login failed.",
          "error"
        );

        return;
      }

      // --------------------------------------
      // Login successful
      // --------------------------------------

      if (!data?.user) {
        throw new Error(
          "Login succeeded but no user session was returned."
        );
      }

      const user = data.user;

      console.log(
        "Logged in user:",
        user
      );

      showMessage(
        "Login successful! Opening your portal...",
        "success"
      );

      // Save session information
      sessionStorage.setItem(
        "gaawow_user_id",
        user.id
      );

      sessionStorage.setItem(
        "gaawow_user_email",
        user.email || email
      );

      // --------------------------------------
      // Redirect according to account type
      // --------------------------------------

      await redirectAfterLogin(user);

    } catch (err) {

      console.error(
        "GAAWOW Login Error:",
        err
      );

      showMessage(
        err?.message ||
        "Something went wrong. Please try again.",
        "error"
      );

    } finally {

      loginButton.disabled = false;
      loginButton.textContent = "LOGIN";

    }
  }
);

// ==========================================
// CHECK EXISTING SESSION
// ==========================================

async function checkExistingSession() {

  try {

    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {

      console.error(
        "Session Error:",
        error
      );

      return;
    }

    if (data?.session?.user) {

      console.log(
        "Existing session found:",
        data.session.user.email
      );

      /*
       * We intentionally do NOT automatically
       * redirect here.
       *
       * This prevents login page loops.
       */
    }

  } catch (error) {

    console.error(
      "Session Check Error:",
      error
    );
  }
}

// ==========================================
// START
// ==========================================

checkExistingSession();
