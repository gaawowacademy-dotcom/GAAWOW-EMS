"use strict";

/* =========================================================
   GAAWOW EMS SECURE LOGIN V2
   One Supabase client
   System Login + Teacher Login
   Role-based access
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupKf1b_s0RjIbAi5g_RqLCs145";


/* =========================================================
   INITIALIZE SUPABASE ONCE
   ========================================================= */

if (!window.supabase || !window.supabase.createClient) {
  throw new Error(
    "Supabase library lama soo shuban. Hubi internet-ka iyo CDN-ka."
  );
}

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


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const $ = (id) => document.getElementById(id);

const systemTab = $("systemTab");
const teacherTab = $("teacherTab");

const systemSection = $("systemLoginSection");
const teacherSection = $("teacherLoginSection");

const loginForm = $("loginForm");
const emailInput = $("email");
const passwordInput = $("password");
const loginButton = $("loginButton");

const teacherLoginForm = $("teacherLoginForm");
const teacherEmailInput = $("teacherEmail");
const teacherPasswordInput = $("teacherPassword");
const teacherLoginButton = $("teacherLoginBtn");

const message = $("message");


/* =========================================================
   STATUS MESSAGE
   ========================================================= */

function showMessage(text, type = "info") {
  if (!message) return;

  message.textContent = text;
  message.className = type;
}


/* =========================================================
   ROLE ROUTES
   ========================================================= */

const ROLE_REDIRECTS = {
  super_admin: "./dashboard.html",
  school_admin: "./school-dashboard.html",
  teacher: "./teacher-portal.html",
  parent: "./parent.html",
  student: "./student-portal.html?v=8"
};


/* =========================================================
   LOGIN MODE SWITCHER
   ========================================================= */

let loginInProgress = false;

function setLoginMode(mode) {
  const isTeacher = mode === "teacher";

  systemSection.hidden = isTeacher;
  teacherSection.hidden = !isTeacher;

  systemTab.classList.toggle("active", !isTeacher);
  teacherTab.classList.toggle("active", isTeacher);

  systemTab.setAttribute(
    "aria-pressed",
    String(!isTeacher)
  );

  teacherTab.setAttribute(
    "aria-pressed",
    String(isTeacher)
  );

  // Disable hidden form fields so they cannot block submission.

  emailInput.disabled = isTeacher;
  passwordInput.disabled = isTeacher;
  loginButton.disabled = isTeacher || loginInProgress;

  teacherEmailInput.disabled = !isTeacher;
  teacherPasswordInput.disabled = !isTeacher;
  teacherLoginButton.disabled =
    !isTeacher || loginInProgress;

  if (!loginInProgress) {
    showMessage("", "info");
  }
}

systemTab.addEventListener("click", () => {
  if (!loginInProgress) {
    setLoginMode("system");
  }
});

teacherTab.addEventListener("click", () => {
  if (!loginInProgress) {
    setLoginMode("teacher");
  }
});


/* =========================================================
   SHOW / HIDE PASSWORD
   ========================================================= */

document.querySelectorAll(".toggle-password").forEach((button) => {
  button.addEventListener("click", () => {
    const input = $(button.dataset.target);

    if (!input) return;

    const show = input.type === "password";

    input.type = show ? "text" : "password";
    button.textContent = show ? "Hide" : "Show";

    button.setAttribute(
      "aria-label",
      show ? "Hide password" : "Show password"
    );
  });
});


/* =========================================================
   LOAD CURRENT USER PROFILE
   ========================================================= */

async function getUserProfile(user) {
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select(
      "id, full_name, role, is_active, institution_id"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("PROFILE LOOKUP ERROR:", error);

    throw new Error(
      "Akoonka waa la xaqiijiyey, laakiin profile-ka lama akhrin karo. " +
      "Hubi profiles RLS policies-ka Supabase."
    );
  }

  if (!profile) {
    throw new Error(
      "Account-kan kuma jiro profiles table-ka. " +
      "Fadlan hubi profile-ka Supabase."
    );
  }

  if (profile.is_active !== true) {
    throw new Error(
      "Akoonkaagu ma shaqaynayo. Fadlan la xiriir maamulka."
    );
  }

  return profile;
}


/* =========================================================
   VERIFY STUDENT ACCOUNT
   ========================================================= */

async function verifyStudent(user) {
  const { data: student, error } = await supabaseClient
    .from("students")
    .select(
      "id, student_id, full_name, auth_user_id, account_enabled"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("STUDENT LOOKUP ERROR:", error);

    throw new Error(
      "Xogta ardayga lama akhrin karo. Hubi rukhsadaha students table-ka."
    );
  }

  if (!student) {
    throw new Error(
      "Account-kan lama xiriirin diiwaan arday. " +
      "Fadlan la xiriir maamulka."
    );
  }

  if (student.account_enabled === false) {
    throw new Error(
      "Akoonka ardayga waa la joojiyey. Fadlan la xiriir maamulka."
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

  return student;
}


/* =========================================================
   CLEAR OLD LOGIN METADATA
   ========================================================= */

function clearLoginMetadata() {
  [
    "gaawow_user_id",
    "gaawow_user_email",
    "gaawow_user_role",
    "gaawow_student_id",
    "gaawow_student_number",
    "gaawow_student_name"
  ].forEach((key) => {
    sessionStorage.removeItem(key);
  });
}


/* =========================================================
   SAVE LOGIN METADATA
   ========================================================= */

function saveLoginMetadata(user, profile) {
  sessionStorage.setItem(
    "gaawow_user_id",
    user.id
  );

  sessionStorage.setItem(
    "gaawow_user_email",
    user.email || ""
  );

  sessionStorage.setItem(
    "gaawow_user_role",
    profile.role
  );
}


/* =========================================================
   VALIDATE ROLE AND OPEN PORTAL
   ========================================================= */

async function redirectAfterLogin(user, requiredRole = null) {
  const profile = await getUserProfile(user);

  // Teacher Login must only accept the teacher role.

  if (requiredRole && profile.role !== requiredRole) {
    throw new Error(
      requiredRole === "teacher"
        ? "Akoonkan ma laha teacher role. Isticmaal System Login haddii aad tahay maamule."
        : "Role-ka akoonka lama oggola."
    );
  }

  const destination = ROLE_REDIRECTS[profile.role];

  if (!destination) {
    throw new Error(
      "Role-ka akoonkan lama aqoonsana: " + profile.role
    );
  }

  if (profile.role === "student") {
    await verifyStudent(user);
  }

  saveLoginMetadata(user, profile);

  console.info(
    "GAAWOW EMS login verified:",
    profile.role
  );

  showMessage(
    "Login successful. Opening your portal...",
    "success"
  );

  window.location.replace(destination);
}


/* =========================================================
   FRIENDLY AUTHENTICATION ERRORS
   ========================================================= */

function getAuthErrorMessage(error) {
  console.error("SUPABASE AUTH ERROR:", error);

  const code = error?.code || "";
  const messageText = error?.message || "";

  if (
    code === "invalid_credentials" ||
    /invalid login credentials/i.test(messageText)
  ) {
    return (
      "Supabase ma aqbalin email-ka ama password-ka. " +
      "Hubi email-ka iyo password-ka, ama dib u deji password-ka."
    );
  }

  if (/email not confirmed/i.test(messageText)) {
    return (
      "Email-ka weli lama xaqiijin. Hubi email-kaaga " +
      "ama Authentication settings-ka Supabase."
    );
  }

  if (/too many requests/i.test(messageText)) {
    return (
      "Isku dayo badan ayaa dhacay. Sug wax yar ka hor intaadan mar kale gelin."
    );
  }

  if (/failed to fetch|networkerror|fetch failed/i.test(messageText)) {
    return (
      "Xiriirka Supabase wuu fashilmay. Hubi internet-ka iyo Supabase URL-ka."
    );
  }

  return messageText ||
    "Login-ku wuu fashilmay. Hubi Console-ka si aad u aragto sababta.";
}


/* =========================================================
   SHARED LOGIN HANDLER
   ========================================================= */

async function handleLogin({
  email,
  password,
  requiredRole,
  button,
  originalButtonText
}) {
  if (loginInProgress) return;

  if (!email || !password) {
    showMessage(
      "Fadlan geli email-ka iyo password-ka.",
      "error"
    );
    return;
  }

  loginInProgress = true;

  loginButton.disabled = true;
  teacherLoginButton.disabled = true;

  button.textContent = "VERIFYING...";

  showMessage(
    "Waxaa la xaqiijinayaa account-kaaga...",
    "info"
  );

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    if (!data || !data.user) {
      throw new Error(
        "Supabase ma soo celin user sax ah."
      );
    }

    await redirectAfterLogin(
      data.user,
      requiredRole
    );

  } catch (error) {
    console.error("GAAWOW EMS LOGIN FAILURE:", error);

    showMessage(
      getAuthErrorMessage(error),
      "error"
    );

  } finally {
    loginInProgress = false;

    loginButton.disabled = false;
    teacherLoginButton.disabled = false;

    setLoginMode(
      teacherSection.hidden ? "system" : "teacher"
    );

    button.textContent = originalButtonText;
  }
}


/* =========================================================
   SYSTEM LOGIN
   ========================================================= */

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  await handleLogin({
    email,
    password,
    requiredRole: null,
    button: loginButton,
    originalButtonText: "LOGIN"
  });
});


/* =========================================================
   TEACHER LOGIN
   ========================================================= */

teacherLoginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const email = teacherEmailInput.value.trim();
    const password = teacherPasswordInput.value;

    await handleLogin({
      email,
      password,
      requiredRole: "teacher",
      button: teacherLoginButton,
      originalButtonText: "LOGIN AS TEACHER"
    });
  }
);


/* =========================================================
   INITIALIZE LOGIN PAGE
   ========================================================= */

clearLoginMetadata();

setLoginMode("system");

console.info("GAAWOW EMS Secure Login initialized.");
