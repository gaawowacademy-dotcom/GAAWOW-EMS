"use strict";

const SUPABASE_URL =
"https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
"sb_publishable_2AvWfupKf1b_s0RjIbAi5g_RqLCs145";

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

const $ = (id) => document.getElementById(id);

const loginForm = $("loginForm");
const emailInput = $("email");
const passwordInput = $("password");
const loginButton = $("loginButton");
const message = $("message");

function showMessage(text, type = "info") {
if (!message) return;

message.textContent = text;
message.style.color =
type === "success" ? "#16A34A" :
type === "error" ? "#DC2626" :
"#64748B";
}

/* =====================================================
ROLE-BASED REDIRECTS
===================================================== */

const ROLE_REDIRECTS = {
super_admin: "./dashboard.html",
school_admin: "./school-dashboard.html",
teacher: "./teacher-portal.html",
parent: "./parent.html",
student: "./student.html"
};

/* =====================================================
LOAD AND VERIFY PROFILE
===================================================== */

async function getUserProfile(user) {
const { data: profile, error } = await supabaseClient
.from("profiles")
.select("id, full_name, role, is_active, institution_id")
.eq("id", user.id)
.maybeSingle();

if (error) {
console.error("Profile loading error:", error);
throw new Error(
"Profile-ka lama akhrin karo. Hubi rukhsadaha Supabase."
);
}

if (!profile) {
throw new Error(
"Akoonkaaga kuma jiro profiles table-ka GAAWOW EMS."
);
}

if (profile.is_active !== true) {
throw new Error(
"Akoonkaagu ma shaqaynayo. Fadlan la xiriir maamulka."
);
}

return profile;
}

/* =====================================================
STUDENT ACCOUNT VERIFICATION
===================================================== */

async function verifyStudent(user) {
const { data: student, error } = await supabaseClient
.from("students")
.select(
"id, student_id, full_name, auth_user_id, account_enabled"
)
.eq("auth_user_id", user.id)
.maybeSingle();

if (error) {
console.error("Student lookup error:", error);
throw new Error(
"Xogta ardayga lama akhrin karo. Fadlan la xiriir maamulka."
);
}

if (!student) {
throw new Error(
"Akoonkaagu ma laha diiwaan arday oo ku xiran. Fadlan la xiriir maamulka."
);
}

if (student.account_enabled === false) {
throw new Error(
"Akoonka ardayga waa la joojiyey. Fadlan la xiriir maamulka."
);
}

sessionStorage.setItem("gaawow_student_id", student.id);
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

/* =====================================================
ROUTE AUTHENTICATED USER BY ROLE
===================================================== */

async function redirectAfterLogin(user) {
const profile = await getUserProfile(user);

if (profile.role === "student") {
await verifyStudent(user);
}

const destination = ROLE_REDIRECTS[profile.role];

if (!destination) {
throw new Error(
"Role-ka akoonkan lama aqoonsana. Fadlan la xiriir maamulka."
);
}

sessionStorage.setItem("gaawow_user_id", user.id);
sessionStorage.setItem(
"gaawow_user_email",
user.email || ""
);
sessionStorage.setItem(
"gaawow_user_role",
profile.role
);

showMessage(
"Login successful! Opening your portal...",
"success"
);

window.location.replace(destination);
}

/* =====================================================
EXISTING SYSTEM LOGIN
===================================================== */

if (loginForm) {
loginForm.addEventListener("submit", async (event) => {
event.preventDefault();

const email = emailInput?.value.trim();
const password = passwordInput?.value;

if (!email || !password) {
  showMessage(
    "Please enter your email and password.",
    "error"
  );
  return;
}

loginButton.disabled = true;
loginButton.textContent = "LOGGING IN...";

showMessage("Checking your account...");

try {
  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    throw new Error(
      "Email ama password khaldan. Fadlan mar kale isku day."
    );
  }

  if (!data?.user) {
    throw new Error(
      "Login-ku ma soo celin user sax ah."
    );
  }

  await redirectAfterLogin(data.user);

} catch (error) {
  console.error("System login error:", error);

  showMessage(
    error.message || "Login failed. Please try again.",
    "error"
  );

} finally {
  loginButton.disabled = false;
  loginButton.textContent = "LOGIN";
}

});
}
