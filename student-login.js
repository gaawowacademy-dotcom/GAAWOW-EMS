/* =========================================================
   GAAWOW ACADEMY EMS
   STUDENT LOGIN
   Replace only SUPABASE_URL and SUPABASE_ANON_KEY.
   ========================================================= */

"use strict";

const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const form = document.getElementById("loginForm");
const studentIdInput = document.getElementById("studentId");
const passwordInput = document.getElementById("password");
const messageBox = document.getElementById("message");
const loginBtn = document.getElementById("loginBtn");
const loginText = document.getElementById("loginText");
const spinner = document.getElementById("loginSpinner");

function showMessage(text, type = "error") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

function setLoading(loading) {
  loginBtn.disabled = loading;
  spinner.classList.toggle("hidden", !loading);
  loginText.textContent = loading ? "Signing In..." : "Sign In";
}

function normalizeStudentId(value) {
  return String(value || "").trim().toUpperCase();
}

/*
  Student ID is used to find the student's auth email.
  The profiles table should contain:
  id, student_id, email, role, is_active
*/
async function getStudentAccount(studentId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,student_id,email,role,is_active")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const studentId = normalizeStudentId(studentIdInput.value);
  const password = passwordInput.value;

  if (!studentId || !password) {
    showMessage("Please enter your Student ID and password.");
    return;
  }

  setLoading(true);
  messageBox.className = "message hidden";

  try {
    const account = await getStudentAccount(studentId);

    if (!account) {
      throw new Error("Student account was not found.");
    }

    if (account.role !== "student") {
      throw new Error("This account is not a Student Account. Please use the correct login portal.");
    }

    if (account.is_active === false) {
      throw new Error("Your student account is currently inactive. Please contact GAAWOW Academy administration.");
    }

    if (!account.email) {
      throw new Error("No login email is connected to this student account.");
    }

    const { error: signInError } =
      await supabaseClient.auth.signInWithPassword({
        email: account.email,
        password
      });

    if (signInError) throw signInError;

    window.location.href = "student-portal.html";
  } catch (error) {
    console.error("Student login error:", error);
    showMessage(error.message || "Unable to sign in. Please check your credentials.");
  } finally {
    setLoading(false);
  }
});

document.getElementById("togglePassword").addEventListener("click", (event) => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  event.currentTarget.textContent = isPassword ? "Hide" : "Show";
});

document.getElementById("forgotBtn").addEventListener("click", async () => {
  const studentId = normalizeStudentId(studentIdInput.value);

  if (!studentId) {
    showMessage("Enter your Student ID first so we can find your account.");
    studentIdInput.focus();
    return;
  }

  try {
    const account = await getStudentAccount(studentId);

    if (!account || account.role !== "student" || !account.email) {
      throw new Error("Student account could not be found.");
    }

    const redirectTo =
      `${window.location.origin}${window.location.pathname.replace(
        "student-login.html",
        "student-reset.html"
      )}`;

    const { error } = await supabaseClient.auth.resetPasswordForEmail(
      account.email,
      { redirectTo }
    );

    if (error) throw error;

    showMessage("Password reset instructions have been sent to the email connected to your student account.", "success");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Unable to start password reset.");
  }
});

/* If an authenticated user opens Student Login, send them to the portal. */
(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session) {
    window.location.href = "student-portal.html";
  }
})();
