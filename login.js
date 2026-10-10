// ============================================================
// GAAWOW EMS — SECURE ROLE-BASED LOGIN V8
// Supabase Auth → profiles.role → Authorized Portal
//
// ROLE ROUTING:
// super_admin  → dashboard.html
// school_admin → school-dashboard.html
// teacher      → teacher-portal.html
// parent       → parent.html
// student      → student.html
// ============================================================

"use strict";

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2AvWfupKf1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    }
  );


// ============================================================
// REDIRECT CONFIGURATION
// ============================================================

const REDIRECTS = {
  super_admin: "./dashboard.html",

  school_admin: "./school-dashboard.html",

  // IMPORTANT:
  // Teacher MUST NOT go to teacher.html.
  // teacher.html is Super Admin Teacher Management.
  teacher: "./teacher-portal.html",

  parent: "./parent.html",

  student: "./student.html"
};


// ============================================================
// DOM
// ============================================================

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


// ============================================================
// MESSAGE
// ============================================================

function showMessage(message, type = "error") {

  if (!messageEl) {
    console.log(message);
    return;
  }

  messageEl.textContent = message;

  messageEl.className =
    `login-message ${type}`;

  messageEl.style.display =
    "block";
}


function clearMessage() {

  if (!messageEl) return;

  messageEl.textContent = "";

  messageEl.style.display =
    "none";
}


// ============================================================
// LOADING
// ============================================================

function setLoading(loading) {

  if (!loginBtn) return;

  loginBtn.disabled =
    loading;

  if (loading) {

    loginBtn.dataset.originalText =
      loginBtn.textContent;

    loginBtn.textContent =
      "Signing in...";

  } else {

    loginBtn.textContent =
      loginBtn.dataset.originalText ||
      "🔐 Sign In";
  }
}


// ============================================================
// GET USER PROFILE
// ============================================================

async function getUserProfile(userId) {

  if (!userId) {
    throw new Error(
      "Authenticated user ID is missing."
    );
  }

  const {
    data,
    error
  } = await supabaseClient
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

    console.error(
      "Profile lookup error:",
      error
    );

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


// ============================================================
// VERIFY STUDENT
// ============================================================

async function verifyStudent(userId) {

  const {
    data,
    error
  } = await supabaseClient
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

    console.error(
      "Student lookup error:",
      error
    );

    throw new Error(
      "Unable to verify your student account."
    );
  }


  if (!data) {

    throw new Error(
      "Student account record was not found."
    );
  }


  if (data.auth_user_id !== userId) {

    throw new Error(
      "Student account verification failed."
    );
  }


  if (data.account_enabled !== true) {

    throw new Error(
      "Your student account is disabled."
    );
  }


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


// ============================================================
// UPDATE STUDENT LAST LOGIN
// ============================================================

async function updateStudentLastLogin(userId) {

  try {

    await supabaseClient
      .from("students")
      .update({
        last_login_at:
          new Date().toISOString()
      })
      .eq(
        "auth_user_id",
        userId
      );

  } catch (error) {

    console.warn(
      "Last login update failed:",
      error
    );

  }

}


// ============================================================
// STORE ROLE SESSION
// ============================================================

function storeRoleSession(profile, user) {

  sessionStorage.setItem(
    "user_role",
    profile.role
  );

  sessionStorage.setItem(
    "user_id",
    user.id
  );

  if (profile.full_name) {

    sessionStorage.setItem(
      "user_name",
      profile.full_name
    );
  }

  if (profile.institution_id) {

    sessionStorage.setItem(
      "institution_id",
      profile.institution_id
    );
  }
}


// ============================================================
// ROLE REDIRECT
// ============================================================

async function redirectByRole(
  profile,
  user
) {

  const role =
    String(profile.role || "")
      .trim()
      .toLowerCase();


  console.log(
    "Authenticated user:",
    user.id
  );

  console.log(
    "Profile role:",
    role
  );


  // ----------------------------------------------------------
  // STUDENT
  // ----------------------------------------------------------

  if (role === "student") {

    const student =
      await verifyStudent(
        user.id
      );


    sessionStorage.setItem(
      "student_id",
      student.student_id
    );

    sessionStorage.setItem(
      "student_name",
      student.full_name
    );

    storeRoleSession(
      profile,
      user
    );


    await updateStudentLastLogin(
      user.id
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

    storeRoleSession(
      profile,
      user
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

    storeRoleSession(
      profile,
      user
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
  storeRoleSession(profile, user);

  alert(
    "Teacher login confirmed.\n" +
    "Email: " + user.email + "\n" +
    "Role: " + profile.role + "\n" +
    "Opening Teacher Portal..."
  );

  window.location.href = "./teacher-portal.html";
  return;
}
    console.log(
      "Teacher detected → Teacher Portal"
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

    storeRoleSession(
      profile,
      user
    );


    window.location.replace(
      REDIRECTS.parent
    );

    return;
  }


  // ----------------------------------------------------------
  // UNKNOWN ROLE
  // ----------------------------------------------------------

  throw new Error(
    `Your account role "${role}" is not supported.`
  );
}


// ============================================================
// LOGIN
// ============================================================

async function login() {

  clearMessage();

  const email =
    emailInput?.value
      .trim()
      .toLowerCase() || "";

  const password =
    passwordInput?.value || "";


  if (!email) {

    showMessage(
      "Please enter your email address."
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
    // AUTHENTICATION
    // --------------------------------------------------------

    const {
      data: authData,
      error: authError
    } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });


    if (authError) {

      console.error(
        "Supabase login error:",
        authError
      );

      throw new Error(
        "Invalid email or password."
      );
    }


    if (!authData?.user) {

      throw new Error(
        "Login failed. No authenticated user returned."
      );
    }


    const user =
      authData.user;


    // --------------------------------------------------------
    // PROFILE
    // --------------------------------------------------------

    const profile =
      await getUserProfile(
        user.id
      );


    // --------------------------------------------------------
    // ROLE ROUTING
    // --------------------------------------------------------

    await redirectByRole(
      profile,
      user
    );

  }


  catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );


    try {

      await supabaseClient.auth.signOut();

    } catch (_) {}


    showMessage(
      error.message ||
      "Login failed. Please try again."
    );

  }


  finally {

    setLoading(false);

  }

}


// ============================================================
// LOGIN BUTTON
// ============================================================

if (loginBtn) {

  loginBtn.addEventListener(
    "click",
    login
  );

}


// ============================================================
// ENTER KEY
// ============================================================

[
  emailInput,
  passwordInput
]
  .filter(Boolean)
  .forEach(input => {

    input.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter"
        ) {

          event.preventDefault();

          login();
        }

      }
    );

  });


// ============================================================
// CHECK EXISTING SESSION
// ============================================================

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
      await getUserProfile(
        session.user.id
      );


    await redirectByRole(
      profile,
      session.user
    );

  }


  catch (error) {

    console.warn(
      "Existing session check:",
      error.message
    );


    try {

      await supabaseClient.auth.signOut();

    } catch (_) {}

  }

}


// ============================================================
// START
// ============================================================

checkExistingSession();
