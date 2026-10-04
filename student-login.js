"use strict";

/* =========================================================
   GAAWOW ACADEMY EMS
   STUDENT LOGIN
   Version: V2
   Uses: student-login Edge Function
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

let supabaseClient = null;


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
   SUPABASE
   ========================================================= */

function initializeSupabase() {

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    throw new Error(
      "Supabase library lama soo degin."
    );
  }

  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
  message,
  type = "error"
) {

  if (!messageBox) return;

  messageBox.textContent =
    message;

  messageBox.className =
    `message show ${type}`;
}


function clearMessage() {

  if (!messageBox) return;

  messageBox.textContent = "";

  messageBox.className =
    "message";
}


/* =========================================================
   LOADING
   ========================================================= */

function setLoading(isLoading) {

  if (loginButton) {
    loginButton.disabled =
      isLoading;
  }

  if (loginButtonText) {
    loginButtonText.textContent =
      isLoading
        ? "Signing in..."
        : "Sign In";
  }

  if (loginSpinner) {
    loginSpinner.hidden =
      !isLoading;
  }
}


/* =========================================================
   PASSWORD TOGGLE
   ========================================================= */

if (togglePassword) {

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
}


/* =========================================================
   LOGIN
   ========================================================= */

if (form) {

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

        /*
         * IMPORTANT:
         * Login is handled by the
         * student-login Edge Function.
         */

        const {
          data,
          error
        } =
          await supabaseClient.functions.invoke(
            "student-login",
            {
              body: {
                email,
                password
              }
            }
          );


        console.log(
          "STUDENT LOGIN DATA:",
          data
        );

        console.log(
          "STUDENT LOGIN ERROR:",
          error
        );


        if (error) {

          throw new Error(
            error.message ||
            "Student login function failed."
          );
        }


        if (!data) {

          throw new Error(
            "Student login did not return a response."
          );
        }


        /*
         * Function-level error
         */

        if (
          data.success === false
        ) {

          throw new Error(
            data.message ||
            "Email ama password-ka waa khalad."
          );
        }


        /*
         * Successful login
         */

        if (
          data.success === true
        ) {

          showMessage(
            "Login successful. Opening your portal...",
            "success"
          );


          /*
           * If Edge Function returned a
           * Supabase session, save it.
           */

          if (
            data.session?.access_token &&
            data.session?.refresh_token
          ) {

            const {
              error: sessionError
            } =
              await supabaseClient.auth.setSession({
                access_token:
                  data.session.access_token,

                refresh_token:
                  data.session.refresh_token
              });


            if (sessionError) {

              console.warn(
                "Session setup warning:",
                sessionError
              );
            }
          }


          /*
           * Store basic student information
           * for the portal.
           */

          if (
            data.student
          ) {

            sessionStorage.setItem(
              "gaawow_student",
              JSON.stringify(
                data.student
              )
            );
          }


          setTimeout(
            () => {

              window.location.href =
                "student-portal.html";

            },
            500
          );

          return;
        }


        throw new Error(
          "Student login response is invalid."
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
}


/* =========================================================
   ERROR TRANSLATION
   ========================================================= */

function getFriendlyAuthError(
  error
) {

  const message =
    String(
      error?.message || ""
    ).toLowerCase();


  if (
    message.includes(
      "invalid login"
    ) ||
    message.includes(
      "invalid credentials"
    ) ||
    message.includes(
      "invalid email"
    ) ||
    message.includes(
      "invalid password"
    )
  ) {

    return (
      "Email ama password-ka waa khalad."
    );
  }


  if (
    message.includes(
      "account disabled"
    ) ||
    message.includes(
      "account is disabled"
    ) ||
    message.includes(
      "account_enabled"
    )
  ) {

    return (
      "Student account-kan wali lama hawlgelin."
    );
  }


  if (
    message.includes(
      "student not found"
    )
  ) {

    return (
      "Student account-ka lama helin."
    );
  }


  if (
    message.includes(
      "failed to fetch"
    )
  ) {

    return (
      "Internet connection ama Supabase connection ayaa cilad qaba."
    );
  }


  if (
    message.includes(
      "function"
    )
  ) {

    return (
      "Student login service ayaa cilad qaba. Fadlan mar kale isku day."
    );
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
       * Only redirect if a real Supabase
       * session already exists.
       */

      window.location.href =
        "student-portal.html";
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

    if (currentYear) {

      currentYear.textContent =
        new Date().getFullYear();
    }


    try {

      initializeSupabase();

      await checkExistingSession();

    }

    catch (error) {

      console.error(
        error
      );

      showMessage(
        error.message
      );

    }

  }
);
