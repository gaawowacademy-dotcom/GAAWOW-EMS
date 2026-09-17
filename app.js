// ==========================================
// GAAWOW EMS — FAST LOGIN V2
// ==========================================

// Supabase Configuration
const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1_b0RjIbAi5g_RqLCs145";

// Create Supabase Client
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


// ==========================================
// DOM ELEMENTS
// ==========================================

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");


// ==========================================
// MESSAGE
// ==========================================

function showMessage(text, type = "info") {

  if (!message) return;

  message.textContent = text;

  if (type === "success") {
    message.style.color = "#16A34A";
  } else if (type === "error") {
    message.style.color = "#DC2626";
  } else {
    message.style.color = "#64748B";
  }
}


// ==========================================
// FAST REDIRECT
// ==========================================

function goToDashboard() {
  window.location.replace("dashboard.html");
}


// ==========================================
// LOGIN
// ==========================================

if (loginForm) {

  loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {

      showMessage(
        "Please enter your email and password.",
        "error"
      );

      return;
    }

    // Prevent double-click login
    loginButton.disabled = true;
    loginButton.textContent = "LOGGING IN...";

    showMessage(
      "Checking your account...",
      "info"
    );

    try {

      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) {

        console.error(
          "Supabase Login Error:",
          error
        );

        showMessage(
          error.message || "Login failed.",
          "error"
        );

        loginButton.disabled = false;
        loginButton.textContent = "LOGIN";

        return;
      }


      // ====================================
      // SUCCESS
      // ====================================

      if (data?.user) {

        sessionStorage.setItem(
          "gaawow_user_id",
          data.user.id
        );

        sessionStorage.setItem(
          "gaawow_user_email",
          data.user.email || email
        );

        showMessage(
          "Login successful! Welcome to GAAWOW EMS.",
          "success"
        );

        console.log(
          "GAAWOW EMS User:",
          data.user.id
        );

        // No artificial 1-second delay
        goToDashboard();
      }

    }

    catch (err) {

      console.error(
        "Unexpected Login Error:",
        err
      );

      showMessage(
        "Something went wrong. Please try again.",
        "error"
      );

      loginButton.disabled = false;
      loginButton.textContent = "LOGIN";
    }

  });

}


// ==========================================
// EXISTING SESSION
// ==========================================

async function checkExistingSession() {

  try {

    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {

      console.error(
        "Session Error:",
        error
      );

      return;
    }

    if (data?.session?.user) {

      const user = data.session.user;

      sessionStorage.setItem(
        "gaawow_user_id",
        user.id
      );

      sessionStorage.setItem(
        "gaawow_user_email",
        user.email || ""
      );

      console.log(
        "Existing GAAWOW EMS session:",
        user.email
      );

      // Waxaan hadda ka dhigaynaa inuu login page-ka
      // ku sii jiro haddii user-ku horey u login yahay.
      // Dashboard redirect waxaa maamuli kara index.html.
    }

  }

  catch (error) {

    console.error(
      "Session Check Error:",
      error
    );

  }

}


// ==========================================
// START
// ==========================================

checkExistingSession();
