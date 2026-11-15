
"use strict";

// ============================================================
// GAAWOW EMS - SECURE ROLE-BASED LOGIN
// Supports all six system roles
// ============================================================

// 1. SUPABASE CONFIGURATION

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjAi5g_RqLCs145";

if (!window.supabase) {
  throw new Error("Supabase library is missing.");
}

const supabaseClient = window.supabase.createClient(
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

// 2. ROLE REDIRECTS

const REDIRECTS = {
  super_admin: "./dashboard.html",
  school_admin: "./school-dashboard.html",
  teacher: "./teacher-portal.html",
  parent: "./parent.html",
  student: "./student.html",
  finance_manager: "./financial.html"
};

// 3. DOM ELEMENTS

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

const loginForm =
  document.getElementById("loginForm") ||
  emailInput?.closest("form") ||
  passwordInput?.closest("form");

let loginInProgress = false;
let redirectInProgress = false;

// 4. MESSAGE HANDLING

function showMessage(message, type = "error") {
  console.log(`[LOGIN ${type.toUpperCase()}]`, message);

  if (!messageEl) return;

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

// 5. LOADING STATE

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

// 6. AUTH ERROR HANDLING

function getLoginErrorMessage(error) {
  const message =
    String(error?.message || "").toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "Email ama password khaldan. Hubi xogtaada.";
  }

  if (message.includes("email not confirmed")) {
    return "Email-ka lama xaqiijin. La xiriir maamulka.";
  }

  if (
    message.includes("too many requests") ||
    message.includes("rate limit")
  ) {
    return "Isku dayo badan ayaa dhacay. Sug wax yar.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network")
  ) {
    return "Xiriirka internet-ka ama Supabase ayaa cilad leh.";
  }

  return error?.message ||
    "Login-ku wuu fashilmay. Mar kale isku day.";
}

// 7. GET AUTHENTICATED USER PROFILE

async function getUserProfile(userId) {
  if (!userId) {
    throw new Error("Authenticated user ID is missing.");
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      role,
      is_active,
      institution_id
    `)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[LOGIN] Profile lookup:", error);

    throw new Error(
      "Profile-ka lama akhrin karin. Hubi profiles RLS policy."
    );
  }

  if (!data) {
    throw new Error(
      "Auth account waa jiraa, laakiin profile lagama helin."
    );
  }

  if (data.id !== userId) {
    throw new Error("Profile ID iyo Auth ID isma waafaqaan.");
  }

  if (data.is_active !== true) {
    throw new Error(
      "Account-ka waa la joojiyey. La xiriir maamulka."
    );
  }

  const role = String(data.role || "")
    .trim()
    .toLowerCase();

  if (!Object.prototype.hasOwnProperty.call(
    REDIRECTS,
    role
  )) {
    throw new Error(
      `Role-ka "${role || "unknown"}" lama aqoonsan.`
    );
  }

  return {
    ...data,
    role
  };
}

// 8. VERIFY STUDENT ACCOUNT

async function verifyStudent(userId) {
  const { data, error } = await supabaseClient
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
    console.error("[LOGIN] Student lookup:", error);

    throw new Error(
      "Student account lama xaqiijin karin. Hubi RLS policies."
    );
  }

  if (!data) {
    throw new Error(
      "Student account record lagama helin students table-ka."
    );
  }

  if (data.account_enabled !== true) {
    throw new Error(
      "Student account-ka waa la joojiyey."
    );
  }

  if (
    data.profile_id &&
    data.profile_id !== userId
  ) {
    throw new Error("Student profile linkage waa khaldan yahay.");
  }

  return data;
}

// 9. UPDATE STUDENT LAST LOGIN

async function updateStudentLastLogin(userId) {
  try {
    const { error } = await supabaseClient
      .from("students")
      .update({
        last_login_at: new Date().toISOString()
      })
      .eq("auth_user_id", userId);

    if (error) {
      console.warn(
        "[LOGIN] Last login update failed:",
        error.message
      );
    }
  } catch (error) {
    console.warn(
      "[LOGIN] Last login exception:",
      error?.message || error
    );
  }
}

// 10. STORE ROLE SESSION

function storeRoleSession(profile, user) {
  sessionStorage.setItem("user_role", profile.role);
  sessionStorage.setItem("user_id", user.id);

  sessionStorage.setItem(
    "user_name",
    profile.full_name || user.email || ""
  );

  sessionStorage.setItem(
    "user_email",
    user.email || profile.email || ""
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

// 11. ROLE REDIRECT

async function redirectByRole(profile, user) {
  const role = String(profile.role || "")
    .trim()
    .toLowerCase();

  const destination = REDIRECTS[role];

  if (!destination) {
    throw new Error(`Role-ka "${role}" lama taageero.`);
  }

  if (redirectInProgress) return;

  console.info("[LOGIN] User:", user.id);
  console.info("[LOGIN] Role:", role);
  console.info("[LOGIN] Destination:", destination);

  // STUDENT
  if (role === "student") {
    const student = await verifyStudent(user.id);

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
  }

  // ALL OTHER ROLES
  else {
    storeRoleSession(profile, user);
  }

  // FINANCE MANAGER
  if (role === "finance_manager") {
    console.info(
      "[LOGIN] Finance Manager authenticated:",
      user.email
    );
  }

  redirectInProgress = true;

  window.location.replace(destination);
}

// 12. MAIN LOGIN

async function login(event) {
  if (event) {
    event.preventDefault();
  }

  if (loginInProgress || redirectInProgress) {
    return;
  }

  clearMessage();

  const email = String(emailInput?.value || "")
    .trim()
    .toLowerCase();

  const password = String(passwordInput?.value || "");

  if (!email) {
    showMessage("Fadlan geli email-kaaga.");
    emailInput?.focus();
    return;
  }

  if (!password) {
    showMessage("Fadlan geli password-kaaga.");
    passwordInput?.focus();
    return;
  }

  loginInProgress = true;
  setLoading(true);

  try {
    // AUTHENTICATION

    const { data: authData, error: authError } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (authError) {
      throw new Error(getLoginErrorMessage(authError));
    }

    if (!authData?.user?.id) {
      throw new Error("Supabase user account sax ah ma soo celin.");
    }

    const user = authData.user;

    // PROFILE VERIFICATION

    const profile = await getUserProfile(user.id);

    // ROLE REDIRECTION

    await redirectByRole(profile, user);

  } catch (error) {
    console.error("[LOGIN] Process failed:", error);

    showMessage(
      error?.message ||
      "Login-ku wuu fashilmay. Mar kale isku day."
    );

  } finally {
    loginInProgress = false;

    if (!redirectInProgress) {
      setLoading(false);
    }
  }
}

// 13. FORM SUBMISSION
// One handler only. Prevents duplicate login attempts.

if (loginForm) {
  loginForm.addEventListener("submit", login);
} else if (loginBtn) {
  loginBtn.addEventListener("click", login);
} else {
  console.error("[LOGIN] Login form/button not found.");
}

// 14. CHECK EXISTING SESSION

async function checkExistingSession() {
  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.warn("[LOGIN] Session check:", error.message);
      return;
    }

    const session = data?.session;

    if (!session?.user) return;

    const profile = await getUserProfile(
      session.user.id
    );

    await redirectByRole(profile, session.user);

  } catch (error) {
    console.warn(
      "[LOGIN] Existing session:",
      error?.message || error
    );

    if (!loginInProgress && !redirectInProgress) {
      showMessage(error?.message || "Session lama xaqiijin karin.");
    }
  }
}

// 15. INITIALIZE

if (!emailInput || !passwordInput) {
  console.error(
    "[LOGIN] Email or password input is missing."
  );
}

checkExistingSession();
