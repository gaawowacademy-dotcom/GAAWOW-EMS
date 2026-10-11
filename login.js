// ============================================================
// GAAWOW EMS — SECURE ROLE-BASED LOGIN V9
// Supabase Auth -> profiles.role -> Authorized Portal
//
// PRESERVED:
// - Existing Supabase project configuration
// - All five roles
// - Student account verification
// - Student last-login update
// - Role session storage
// - Existing portal filenames
//
// IMPROVED:
// - Accurate authentication error handling
// - Safer login button and form handling
// - Profile lookup diagnostics
// - Session validation
// - Duplicate login prevention
// - Teacher portal routing
// ============================================================

"use strict";

// ============================================================
// 1. SUPABASE CONFIGURATION
// ============================================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2AvWfupKf1b_s0RjIbAi5g_RqLCs145";

if (!window.supabase) {
  throw new Error(
    "Supabase library is missing. Check the Supabase CDN script in login.html."
  );
}

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
// 2. ROLE REDIRECTS
// ============================================================

const REDIRECTS = {
  super_admin: "./dashboard.html",
  school_admin: "./school-dashboard.html",
  teacher: "./teacher-portal.html",
  parent: "./parent.html",
  student: "./student.html"
};


// ============================================================
// 3. DOM ELEMENTS
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

let loginInProgress = false;
let redirectInProgress = false;


// ============================================================
// 4. MESSAGE HANDLING
// ============================================================

function showMessage(message, type = "error") {
  console.log(`[LOGIN ${type.toUpperCase()}]`, message);

  if (!messageEl) {
    return;
  }

  messageEl.textContent = message;
  messageEl.className = `login-message ${type}`;
  messageEl.style.display = "block";
  messageEl.setAttribute("role", "alert");
}

function clearMessage() {
  if (!messageEl) return;

  messageEl.textContent = "";
  messageEl.style.display = "none";
}


// ============================================================
// 5. LOADING STATE
// ============================================================

function setLoading(loading) {
  if (!loginBtn) return;

  loginBtn.disabled = loading;

  if (loading) {
    if (!loginBtn.dataset.originalText) {
      loginBtn.dataset.originalText =
        loginBtn.textContent;
    }

    loginBtn.textContent = "Signing in...";
    loginBtn.setAttribute("aria-busy", "true");
  } else {
    loginBtn.textContent =
      loginBtn.dataset.originalText || "🔐 Sign In";

    loginBtn.removeAttribute("aria-busy");
  }
}


// ============================================================
// 6. NORMALIZE AUTH ERROR
// ============================================================

function getLoginErrorMessage(error) {
  const message =
    String(error?.message || "").toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return (
      "Email ama password khaldan. " +
      "Hubi email-ka ama dib u deji password-ka."
    );
  }

  if (message.includes("email not confirmed")) {
    return (
      "Email-ka lama xaqiijin. " +
      "Fadlan xaqiiji email-kaaga ama la xiriir maamulka."
    );
  }

  if (
    message.includes("too many requests") ||
    message.includes("rate limit")
  ) {
    return (
      "Isku dayo badan ayaa dhacay. " +
      "Sug wax yar ka hor intaadan mar kale gelin."
    );
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network")
  ) {
    return (
      "Xiriirka internet-ka ama Supabase ayaa cilad leh. " +
      "Hubi internet-kaaga."
    );
  }

  return (
    error?.message ||
    "Login-ku wuu fashilmay. Fadlan mar kale isku day."
  );
}


// ============================================================
// 7. GET USER PROFILE
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
      "[LOGIN] Profile lookup failed:",
      error.message
    );

    throw new Error(
      "Login-ku wuu guulaystay, laakiin profile-ka lama xaqiijin. " +
      "Hubi profiles table-ka iyo RLS policies."
    );
  }

  if (!data) {
    throw new Error(
      "Account-kaaga Auth wuu jiraa, laakiin profile-ka profiles table-ka lagama helin."
    );
  }

  if (data.id !== userId) {
    throw new Error(
      "Profile ID-ga iyo Auth User ID-gu isma waafaqaan."
    );
  }

  if (data.is_active !== true) {
    throw new Error(
      "Account-kaagu ma shaqaynayo. La xiriir maamulka GAAWOW EMS."
    );
  }

  const role =
    String(data.role || "")
      .trim()
      .toLowerCase();

  if (!Object.prototype.hasOwnProperty.call(
    REDIRECTS,
    role
  )) {
    throw new Error(
      `Role-ka "${role || "unknown"}" lama aqoonsan. La xiriir maamulka.`
    );
  }

  return {
    ...data,
    role
  };
}


// ============================================================
// 8. VERIFY STUDENT
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
      "[LOGIN] Student lookup failed:",
      error.message
    );

    throw new Error(
      "Student account-ka lama xaqiijin karin. " +
      "Hubi students table-ka iyo RLS policies."
    );
  }

  if (!data) {
    throw new Error(
      "Student account record lagama helin students table-ka."
    );
  }

  if (data.auth_user_id !== userId) {
    throw new Error(
      "Student account verification failed."
    );
  }

  if (data.account_enabled !== true) {
    throw new Error(
      "Student account-ka waa la joojiyey. La xiriir maamulka."
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
// 9. UPDATE STUDENT LAST LOGIN
// ============================================================

async function updateStudentLastLogin(userId) {
  try {
    const {
      error
    } = await supabaseClient
      .from("students")
      .update({
        last_login_at: new Date().toISOString()
      })
      .eq("auth_user_id", userId);

    if (error) {
      console.warn(
        "[LOGIN] Last-login update failed:",
        error.message
      );
    }
  } catch (error) {
    console.warn(
      "[LOGIN] Last-login update exception:",
      error?.message || error
    );
  }
}


// ============================================================
// 10. STORE ROLE SESSION
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

  sessionStorage.setItem(
    "user_name",
    profile.full_name || user.email || ""
  );

  if (profile.institution_id) {
    sessionStorage.setItem(
      "institution_id",
      profile.institution_id
    );
  } else {
    sessionStorage.removeItem("institution_id");
  }
}


// ============================================================
// 11. REDIRECT BY ROLE
// ============================================================

async function redirectByRole(profile, user) {
  const role =
    String(profile.role || "")
      .trim()
      .toLowerCase();

  console.info(
    "[LOGIN] Authenticated user:",
    user.id
  );

  console.info(
    "[LOGIN] Role:",
    role
  );

  if (!REDIRECTS[role]) {
    throw new Error(
      `Role-ka "${role}" lama taageero.`
    );
  }

  // ----------------------------------------------------------
  // STUDENT
  // ----------------------------------------------------------

  if (role === "student") {
    const student =
      await verifyStudent(user.id);

    sessionStorage.setItem(
      "student_id",
      student.student_id || ""
    );

    sessionStorage.setItem(
      "student_name",
      student.full_name || profile.full_name || ""
    );

    storeRoleSession(profile, user);

    await updateStudentLastLogin(user.id);

    redirectInProgress = true;

    window.location.replace(REDIRECTS.student);

    return;
  }

  // ----------------------------------------------------------
  // SUPER ADMIN
  // ----------------------------------------------------------

  if (role === "super_admin") {
    storeRoleSession(profile, user);

    redirectInProgress = true;

    window.location.replace(REDIRECTS.super_admin);

    return;
  }

  // ----------------------------------------------------------
  // SCHOOL ADMIN
  // ----------------------------------------------------------

  if (role === "school_admin") {
    storeRoleSession(profile, user);

    redirectInProgress = true;

    window.location.replace(REDIRECTS.school_admin);

    return;
  }

  // ----------------------------------------------------------
  // TEACHER
  // ----------------------------------------------------------

  if (role === "teacher") {
    storeRoleSession(profile, user);

    console.info(
      "[LOGIN] Teacher login confirmed:",
      user.email
    );

    redirectInProgress = true;

    window.location.replace(REDIRECTS.teacher);

    return;
  }

  // ----------------------------------------------------------
  // PARENT
  // ----------------------------------------------------------

  if (role === "parent") {
    storeRoleSession(profile, user);

    redirectInProgress = true;

    window.location.replace(REDIRECTS.parent);

    return;
  }

  throw new Error(
    `Role-ka "${role}" lama taageero.`
  );
}


// ============================================================
// 12. MAIN LOGIN
// ============================================================

async function login(event) {
  if (event) {
    event.preventDefault();
  }

  if (loginInProgress || redirectInProgress) {
    return;
  }

  clearMessage();

  const email =
    String(emailInput?.value || "")
      .trim()
      .toLowerCase();

  const password =
    String(passwordInput?.value || "");

  if (!email) {
    showMessage(
      "Fadlan geli email-kaaga."
    );

    emailInput?.focus();

    return;
  }

  if (!password) {
    showMessage(
      "Fadlan geli password-kaaga."
    );

    passwordInput?.focus();

    return;
  }

  loginInProgress = true;
  setLoading(true);

  try {
    // --------------------------------------------------------
    // AUTHENTICATION
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
        "[LOGIN] Supabase Auth error:",
        authError.message
      );

      throw new Error(
        getLoginErrorMessage(authError)
      );
    }

    if (!authData?.user?.id) {
      throw new Error(
        "Supabase ma soo celin user account sax ah."
      );
    }

    const user = authData.user;

    console.info(
      "[LOGIN] Authentication successful."
    );

    // --------------------------------------------------------
    // PROFILE VERIFICATION
    // --------------------------------------------------------

    let profile;

    try {
      profile = await getUserProfile(user.id);
    } catch (profileError) {
      /*
       * Keep the authenticated session when profile lookup
       * fails. This helps distinguish profile/RLS problems
       * from invalid credentials.
       */
      throw profileError;
    }

    // --------------------------------------------------------
    // ROLE ROUTING
    // --------------------------------------------------------

    await redirectByRole(profile, user);

  } catch (error) {
    console.error(
      "[LOGIN] Login process failed:",
      error
    );

    /*
     * Do not automatically sign out here.
     * A profile lookup or redirect-related failure does not
     * mean that the password was incorrect.
     *
     * A failed sign-in does not establish a valid session,
     * while a successful sign-in followed by a profile error
     * should remain diagnosable.
     */

    showMessage(
      error?.message ||
      "Login-ku wuu fashilmay. Fadlan mar kale isku day."
    );

  } finally {
    loginInProgress = false;

    if (!redirectInProgress) {
      setLoading(false);
    }
  }
}


// ============================================================
// 13. LOGIN BUTTON
// ============================================================

if (loginBtn) {
  loginBtn.addEventListener(
    "click",
    login
  );
} else {
  console.error(
    "[LOGIN] Login button not found. " +
    "Expected #loginBtn or #loginButton."
  );
}


// ============================================================
// 14. ENTER KEY
// ============================================================

[emailInput, passwordInput]
  .filter(Boolean)
  .forEach(input => {
    input.addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          event.preventDefault();
          login(event);
        }
      }
    );
  });


// ============================================================
// 15. PREVENT FORM RELOAD
// ============================================================

const loginForm =
  emailInput?.closest("form") ||
  passwordInput?.closest("form");

if (loginForm) {
  loginForm.addEventListener(
    "submit",
    login
  );
}


// ============================================================
// 16. CHECK EXISTING SESSION
// ============================================================

async function checkExistingSession() {
  try {
    const {
      data,
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      console.warn(
        "[LOGIN] Existing session check failed:",
        error.message
      );

      return;
    }

    const session = data?.session;

    if (!session?.user) {
      return;
    }

    const profile =
      await getUserProfile(session.user.id);

    await redirectByRole(
      profile,
      session.user
    );

  } catch (error) {
    console.warn(
      "[LOGIN] Existing session could not be routed:",
      error?.message || error
    );

    /*
     * Do not automatically sign out.
     * Show the issue only if the user is still on the login
     * page and has not started another login attempt.
     */
    if (!loginInProgress && !redirectInProgress) {
      showMessage(
        error?.message ||
        "Session-ka lama xaqiijin karin."
      );
    }
  }
}


// ============================================================
// 17. INITIALIZE
// ============================================================

if (!emailInput || !passwordInput) {
  console.error(
    "[LOGIN] Required login inputs are missing. " +
    "Check login.html IDs."
  );
}

checkExistingSession();
