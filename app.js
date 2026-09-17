// ==========================================
// GAAWOW EMS — SUPABASE CONFIGURATION
// FAST LOGIN V4
// ==========================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b0RjIbAi5g_RqLCs145";


// ==========================================
// CREATE SUPABASE CLIENT
// ==========================================

if (!window.supabase) {
  console.error("Supabase library not loaded.");
  throw new Error("Supabase library not loaded.");
}

const supabaseClient =
  window.supabase.createClient(
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


// ==========================================
// DOM ELEMENTS
// ==========================================

const loginForm =
  document.getElementById("loginForm");

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const loginButton =
  document.getElementById("loginButton");

const message =
  document.getElementById("message");


// ==========================================
// MESSAGE
// ==========================================

function showMessage(
  text,
  type = "info"
) {

  if (!message) return;

  message.textContent = text;

  if (type === "success") {
    message.style.color = "#16A34A";
  }

  else if (type === "error") {
    message.style.color = "#DC2626";
  }

  else {
    message.style.color = "#64748B";
  }
}


// ==========================================
// BUTTON
// ==========================================

function setLoading(loading) {

  if (!loginButton) return;

  loginButton.disabled = loading;

  loginButton.textContent =
    loading
      ? "LOGGING IN..."
      : "LOGIN";
}


// ==========================================
// SAVE USER
// ==========================================

function saveUser(user) {

  if (!user) return;

  sessionStorage.setItem(
    "gaawow_user_id",
    user.id
  );

  sessionStorage.setItem(
    "gaawow_user_email",
    user.email || ""
  );
}


// ==========================================
// LOGIN
// ==========================================

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();

      const email =
        emailInput?.value.trim() || "";

      const password =
        passwordInput?.value || "";


      if (!email || !password) {

        showMessage(
          "Please enter your email and password.",
          "error"
        );

        return;
      }


      setLoading(true);

      showMessage(
        "Checking your account...",
        "info"
      );


      try {

        const {
          data,
          error
        } =
          await supabaseClient.auth
            .signInWithPassword({
              email: email,
              password: password
            });


        // ==================================
        // LOGIN ERROR
        // ==================================

        if (error) {

          console.error(
            "GAAWOW EMS LOGIN ERROR:",
            error
          );

          showMessage(
            error.message ||
            "Login failed.",
            "error"
          );

          setLoading(false);

          return;
        }


        // ==================================
        // LOGIN SUCCESS
        // ==================================

        if (data?.user) {

          saveUser(data.user);

          console.log(
            "GAAWOW EMS USER:",
            data.user.id
          );

          showMessage(
            "Login successful! Welcome to GAAWOW EMS.",
            "success"
          );

          // Immediate redirect
          window.location.replace(
            "dashboard.html"
          );

          return;
        }


        showMessage(
          "Login failed. User account not found.",
          "error"
        );

      }

      catch (error) {

        console.error(
          "GAAWOW EMS UNEXPECTED ERROR:",
          error
        );

        showMessage(
          "Unable to connect to GAAWOW EMS.",
          "error"
        );

      }

      finally {

        setLoading(false);

      }

    }
  );

}


// ==========================================
// CHECK EXISTING SESSION
// ==========================================

async function checkExistingSession() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .getSession();


    if (error) {

      console.error(
        "SESSION ERROR:",
        error
      );

      return;
    }


    if (data?.session?.user) {

      saveUser(
        data.session.user
      );

      console.log(
        "Existing session:",
        data.session.user.email
      );

    }

  }

  catch (error) {

    console.error(
      "SESSION CHECK ERROR:",
      error
    );

  }

}


// ==========================================
// AUTH STATE
// ==========================================

supabaseClient.auth.onAuthStateChange(
  function (event, session) {

    if (
      event === "SIGNED_IN" &&
      session?.user
    ) {

      saveUser(
        session.user
      );

    }

  }
);


// ==========================================
// START
// ==========================================

checkExistingSession();
