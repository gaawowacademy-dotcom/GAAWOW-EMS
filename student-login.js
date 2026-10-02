"use strict";

/* =========================================================
   GAAWOW ACADEMY EMS
   STUDENT LOGIN
   Version: 20261002-1
   ========================================================= */


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


/* =========================================================
   INITIALIZE
   ========================================================= */

let supabaseClient = null;


function initializeSupabase() {

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    throw new Error(
      "Supabase library lama soo degin."
    );
  }


  if (
    SUPABASE_URL.includes("PASTE_") ||
    SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")
  ) {
    throw new Error(
      "Supabase URL iyo Publishable Key wali lama gelin."
    );
  }


  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );
}


/* =========================================================
   ELEMENTS
   ========================================================= */

const form =
  document.getElementById("studentLoginForm");

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const togglePassword =
  document.getElementById("togglePassword");

const loginButton =
  document.getElementById("loginButton");

const loginButtonText =
  document.getElementById("loginButtonText");

const loginSpinner =
  document.getElementById("loginSpinner");

const messageBox =
  document.getElementById("loginMessage");

const currentYear =
  document.getElementById("currentYear");


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
  message,
  type = "error"
) {

  messageBox.textContent = message;

  messageBox.className =
    `message show ${type}`;
}


function clearMessage() {

  messageBox.textContent = "";

  messageBox.className =
    "message";
}


/* =========================================================
   LOADING
   ========================================================= */

function setLoading(isLoading) {

  loginButton.disabled = isLoading;

  loginButtonText.textContent =
    isLoading
      ? "Signing in..."
      : "Sign In";

  loginSpinner.hidden =
    !isLoading;
}


/* =========================================================
   PASSWORD TOGGLE
   ========================================================= */

togglePassword.addEventListener(
  "click",
  () => {

    const isPassword =
      passwordInput.type === "password";

    passwordInput.type =
      isPassword
        ? "text"
        : "password";

    togglePassword.textContent =
      isPassword
        ? "🙈"
        : "👁";

    togglePassword.setAttribute(
      "aria-label",
      isPassword
        ? "Hide password"
        : "Show password"
    );

  }
);


/* =========================================================
   LOGIN
   ========================================================= */

form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearMessage();

    const email =
      emailInput.value
        .trim()
        .toLowerCase();

    const password =
      passwordInput.value;


    if (!email || !password) {

      showMessage(
        "Please enter your email and password."
      );

      return;
    }


    setLoading(true);


    try {

      const {
        data,
        error
      } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });


      if (error) {
        throw error;
      }


      if (!data?.user) {
        throw new Error(
          "Login failed. User account was not returned."
        );
      }


      /*
       * Confirm that the logged-in account
       * is actually a student account.
       */

      const {
        data: profile,
        error: profileError
      } =
        await supabaseClient
          .from("profiles")
          .select(
            "id, full_name, role, is_active"
          )
          .eq("id", data.user.id)
          .maybeSingle();


      if (profileError) {
        throw profileError;
      }


      if (!profile) {

        await supabaseClient.auth.signOut();

        throw new Error(
          "Student profile lama helin."
        );
      }


      if (
        profile.role !== "student"
      ) {

        await supabaseClient.auth.signOut();

        throw new Error(
          "Account-kan ma aha Student account."
        );
      }


      if (
        profile.is_active === false
      ) {

        await supabaseClient.auth.signOut();

        throw new Error(
          "Student account-kan waa la xiray. Fadlan la xiriir maamulka."
        );
      }


      /*
       * Confirm student record exists
       * and is linked to this Auth account.
       */

      const {
        data: student,
        error: studentError
      } =
        await supabaseClient
          .from("students")
          .select(
            "id, student_id, full_name, profile_id, status"
          )
          .eq("profile_id", data.user.id)
          .maybeSingle();


      if (studentError) {
        throw studentError;
      }


      if (!student) {

        await supabaseClient.auth.signOut();

        throw new Error(
          "Student record-ka lama xiriirin account-kan."
        );
      }


      if (
        String(student.status)
          .toLowerCase() !== "active"
      ) {

        await supabaseClient.auth.signOut();

        throw new Error(
          "Student record-kan ma aha active."
        );
      }


      showMessage(
        "Login successful. Opening your portal...",
        "success"
      );


      /*
       * Small delay so the success message
       * can be seen before redirect.
       */

      setTimeout(
        () => {

          window.location.href =
            "student-portal.html";

        },
        500
      );

    }

    catch (error) {

      console.error(
        "Student login error:",
        error
      );


      showMessage(
        getFriendlyAuthError(error)
      );

    }

    finally {

      setLoading(false);

    }

  }
);


/* =========================================================
   ERROR TRANSLATION
   ========================================================= */

function getFriendlyAuthError(error) {

  const message =
    String(
      error?.message || ""
    ).toLowerCase();


  if (
    message.includes(
      "invalid login credentials"
    )
  ) {

    return "Email ama password-ka waa khalad.";
  }


  if (
    message.includes(
      "email not confirmed"
    )
  ) {

    return "Email-ka account-kan wali lama xaqiijin.";
  }


  if (
    message.includes(
      "too many requests"
    )
  ) {

    return "Attempts badan ayaa dhacay. Fadlan wax yar sug kadib isku day.";
  }


  if (
    message.includes(
      "failed to fetch"
    )
  ) {

    return "Internet connection ama Supabase connection ayaa cilad qaba.";
  }


  return (
    error?.message ||
    "Login failed. Fadlan mar kale isku day."
  );
}


/* =========================================================
   SESSION CHECK
   ========================================================= */

async function checkExistingSession() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {
      return;
    }


    if (
      data?.session?.user
    ) {

      /*
       * Don't redirect blindly.
       * Verify that it is actually a student.
       */

      const {
        data: profile
      } =
        await supabaseClient
          .from("profiles")
          .select(
            "role, is_active"
          )
          .eq(
            "id",
            data.session.user.id
          )
          .maybeSingle();


      if (
        profile?.role === "student" &&
        profile?.is_active !== false
      ) {

        window.location.href =
          "student-portal.html";
      }

    }

  }

  catch (error) {

    console.warn(
      "Session check failed:",
      error
    );

  }
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    currentYear.textContent =
      new Date().getFullYear();

    try {

      initializeSupabase();

      await checkExistingSession();

    }

    catch (error) {

      console.error(error);

      showMessage(
        error.message
      );

    }

  }
);
