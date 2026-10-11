"use strict";

(() => {
const SUPABASE_URL =
"https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
"sb_publishable_2AvWfupKf1b_s0RjIbAi5g_RqLCs145";

const client = window.supabase.createClient(
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

const form = document.getElementById("teacherLoginForm");
const emailInput = document.getElementById("teacherEmail");
const passwordInput = document.getElementById("teacherPassword");
const button = document.getElementById("teacherLoginBtn");
const message = document.getElementById("teacherLoginMessage");

if (!form || !emailInput || !passwordInput || !button || !message) {
console.error("Teacher Login HTML elements are missing.");
return;
}

function showMessage(text, isError = true) {
message.textContent = text;
message.style.color = isError ? "#b42318" : "#137333";
}

async function verifyTeacher(user) {
const { data: profile, error } = await client
.from("profiles")
.select("id, full_name, role, is_active")
.eq("id", user.id)
.maybeSingle();

if (error) {
  console.error("Teacher profile verification failed:", error);
  throw new Error("Xaqiijinta akoonka way fashilantay. Mar kale isku day.");
}

if (!profile) {
  throw new Error("Akoonkan lama xiriirin profile-ka nidaamka.");
}

if (profile.is_active !== true) {
  throw new Error("Akoonka waa la joojiyey. La xiriir maamulka.");
}

if (profile.role !== "teacher") {
  throw new Error("Gelitaankan waxaa loogu talagalay macallimiinta oo keliya.");
}

return profile;

}

async function routeExistingSession() {
const { data: { session }, error } =
await client.auth.getSession();

if (error || !session) return;

try {
  const profile = await verifyTeacher(session.user);

  if (profile.role === "teacher") {
    window.location.replace("./teacher-portal.html");
  }
} catch (error) {
  // Session-ka lama tirtirayo haddii role-ku aanu teacher ahayn.
  // Tani waxay ka hortagaysaa in Teacher Login-ku tirtiro
  // session-ka Super Admin ama School Admin.
  console.info("No active teacher session:", error.message);
}

}

form.addEventListener("submit", async (event) => {
event.preventDefault();

const email = emailInput.value.trim();
const password = passwordInput.value;

if (!email || !password) {
  showMessage("Fadlan geli email-ka iyo password-ka.");
  return;
}

button.disabled = true;
button.textContent = "Checking account...";
showMessage("Akoonka waa la xaqiijinayaa...", false);

try {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error("Email ama password khaldan. Fadlan mar kale isku day.");
  }

  await verifyTeacher(data.user);

  showMessage("Gelitaanku waa guulaystay. Teacher Portal ayaa furmaya...", false);

  window.location.replace("./teacher-portal.html");

} catch (error) {
  console.error("Teacher login error:", error);

  showMessage(
    error.message || "Gelitaanku wuu fashilmay. Mar kale isku day."
  );

  // Haddii login-ku guulaystay laakiin role-ku khaldan yahay,
  // ha samayn signOut guud oo saameyn kara session kale.
} finally {
  button.disabled = false;
  button.textContent = "Login as Teacher";
}

});

routeExistingSession();
})();
