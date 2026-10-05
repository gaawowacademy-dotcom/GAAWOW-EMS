// ============================================================
// GAAWOW EMS — SECURE ROLE-BASED LOGIN
// Supabase Auth → profiles.role → Student/Staff Dashboard
// ============================================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_ANON_KEY =
  "YOUR_SUPABASE_PUBLISHABLE_KEY";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

// ------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------

const REDIRECTS = {
  super_admin: "dashboard.html",
  school_admin: "school-dashboard.html",
  teacher: "teacher.html",
  parent: "parent.html",
  student: "student.html"
};

// ------------------------------------------------------------
// DOM
// ------------------------------------------------------------

const emailInput =
  document.getElementById("email") ||
  document.getElementById("loginEmail");

const passwordInput =
  document.getElementById("password") ||
  document.getElementById("loginPassword");

const loginBtn =
  document.getElementById("loginBtn") ||
  document.getElementById("loginButton");

const messageEl =
  document.getElementById("loginMessage") ||
  document.getElementById("message");

// ------------------------------------------------------------
// MESSAGE
// ------------------------------------------------------------

function showMessage(message, type = "error") {
  if (!messageEl) {
    console.log(message);
    return;
  }

  messageEl.textContent = message;
  messageEl.className = `login-message ${type}`;
  messageEl.style.display = "block";
}

function clearMessage() {
  if (!messageEl) return;

  messageEl.textContent = "";
  messageEl.style.display = "none";
}

// ------------------------------------------------------------
// LOADING
// ------------------------------------------------------------

function setLoading(loading) {
  if (!loginBtn) return;

  loginBtn.disabled = loading;

  if (loading) {
    loginBtn.dataset.originalText =
      loginBtn.textContent;

    loginBtn.textContent = "Signing in...";
  } else {
    loginBtn.textContent =
      loginBtn.dataset.originalText ||
      "Login";
  }
}

// ------------------------------------------------------------
// GET CURRENT USER ROLE
// ------------------------------------------------------------

async function getUserRole(userId) {
  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        is_active,
        institution_id
      `)
      .eq("id", userId)
      .maybeSingle();

  if (error) {
    console.error("Profile lookup error:", error);
    throw new Error(
      "Unable to verify your account profile."
    );
  }

  if (!data) {
    throw new Error(
      "Your account profile was not found."
    );
  }

  if (data.is_active !== true) {
    throw new Error(
      "Your account is inactive. Please contact the administrator."
    );
  }

  return data;
}

// ------------------------------------------------------------
// VERIFY STUDENT ACCOUNT
// ------------------------------------------------------------

async function verifyStudent(userId) {
  const { data, error } =
    await supabaseClient
      .from("students")
      .select(`
        id,
        student_id,
        full_name,
        profile_id,
        auth_user_id,
        account_enabled,
        login_username
      `)
      .eq("auth_user_id", userId)
      .maybeSingle();

  if (error) {
    console.error("Student lookup error:", error);

    throw new Error(
      "Unable to verify your student account."
    );
  }

  if (!data) {
    throw new Error(
      "Student account record was not found."
    );
  }

  if (data.account_enabled !== true) {
    throw new Error(
      "Your student account is disabled."
    );
  }

  // Important security check:
  // students.auth_user_id must match logged-in Auth user
  if (data.auth_user_id !== userId) {
    throw new Error(
      "Student account verification failed."
    );
  }

  // profile_id should normally point to the same profile
  if (
    data.profile_id !== null &&
    data.profile_id !== userId
  ) {
    throw new Error(
      "Student profile linkage is invalid."
    );
  }

  return data;
}

// ------------------------------------------------------------
// UPDATE LAST LOGIN
// ------------------------------------------------------------

async function updateLastLogin(userId, role) {
  try {
    if (role === "student") {
      await supabaseClient
        .from("students")
        .update({
          last_login_at: new Date().toISOString()
        })
        .eq("auth_user_id", userId);
    }
  } catch (error) {
    // Do not block login because analytics failed
    console.warn(
      "Last login update failed:",
      error
    );
  }
}

// ------------------------------------------------------------
// REDIRECT BY ROLE
// ------------------------------------------------------------

async function redirectByRole(profile, user) {
  const role = profile.role;

  console.log("Authenticated user:", user.id);
  console.log("Profile role:", role);

  // ----------------------------------------------------------
  // STUDENT
  // ----------------------------------------------------------

  if (role === "student") {
    const student =
      await verifyStudent(user.id);

    // Optional session information
    sessionStorage.setItem(
      "student_id",
      student.student_id
    );

    sessionStorage.setItem(
      "student_name",
      student.full_name
    );

    sessionStorage.setItem(
      "user_role",
      "student"
    );

    await updateLastLogin(
      user.id,
      "student"
    );

    window.location.replace(
      REDIRECTS.student
    );

    return;
  }

  // ----------------------------------------------------------
  // SUPER ADMIN
  // ----------------------------------------------------------

  if (role === "super_admin") {
    sessionStorage.setItem(
      "user_role",
      "super_admin"
    );

    window.location.replace(
      REDIRECTS.super_admin
    );

    return;
  }

  // ----------------------------------------------------------
  // SCHOOL ADMIN
  // ----------------------------------------------------------

  if (role === "school_admin") {
    sessionStorage.setItem(
      "user_role",
      "school_admin"
    );

    window.location.replace(
      REDIRECTS.school_admin
    );

    return;
  }

  // ----------------------------------------------------------
  // TEACHER
  // ----------------------------------------------------------

  if (role === "teacher") {
    sessionStorage.setItem(
      "user_role",
      "teacher"
    );

    window.location.replace(
      REDIRECTS.teacher
    );

    return;
  }

  // ----------------------------------------------------------
  // PARENT
  // ----------------------------------------------------------

  if (role === "parent") {
    sessionStorage.setItem(
      "user_role",
      "parent"
    );

    window.location.replace(
      REDIRECTS.parent
    );

    return;
  }

  throw new Error(
    "Your account role is not supported."
  );
}

// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------

async function login() {
  clearMessage();

  const email =
    emailInput?.value.trim() || "";

  const password =
    passwordInput?.value || "";

  if (!email) {
    showMessage(
      "Please enter your email or username."
    );
    return;
  }

  if (!password) {
    showMessage(
      "Please enter your password."
    );
    return;
  }

  setLoading(true);

  try {
    // --------------------------------------------------------
    // SUPABASE AUTH
    // --------------------------------------------------------

    const {
      data: authData,
      error: authError
    } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error(
        "Supabase login error:",
        authError
      );

      throw new Error(
        "Invalid email/username or password."
      );
    }

    if (!authData?.user) {
      throw new Error(
        "Login failed. No authenticated user returned."
      );
    }

    const user = authData.user;

    // --------------------------------------------------------
    // PROFILE
    // --------------------------------------------------------

    const profile =
      await getUserRole(user.id);

    // --------------------------------------------------------
    // ROLE REDIRECT
    // --------------------------------------------------------

    await redirectByRole(
      profile,
      user
    );

  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    // If something fails after Auth login,
    // sign the user out so there is no half-authenticated state.
    try {
      await supabaseClient.auth.signOut();
    } catch (_) {}

    showMessage(
      error.message ||
      "Login failed. Please try again."
    );

  } finally {
    setLoading(false);
  }
}

// ------------------------------------------------------------
// LOGIN BUTTON
// ------------------------------------------------------------

if (loginBtn) {
  loginBtn.addEventListener(
    "click",
    login
  );
}

// ------------------------------------------------------------
// ENTER KEY
// ------------------------------------------------------------

[emailInput, passwordInput]
  .filter(Boolean)
  .forEach(input => {
    input.addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          event.preventDefault();
          login();
        }
      }
    );
  });

// ------------------------------------------------------------
// CHECK EXISTING SESSION
// ------------------------------------------------------------

async function checkExistingSession() {
  try {
    const {
      data: {
        session
      }
    } =
      await supabaseClient.auth.getSession();

    if (!session?.user) {
      return;
    }

    const profile =
      await getUserRole(
        session.user.id
      );

    await redirectByRole(
      profile,
      session.user
    );

  } catch (error) {
    console.warn(
      "Existing session check:",
      error.message
    );

    await supabaseClient.auth.signOut();
  }
}

checkExistingSession();
