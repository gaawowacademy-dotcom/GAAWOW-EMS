const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

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

function showMessage(text, type = "info") {

  if (!message) return;

  message.textContent = text;

  message.style.color =
    type === "success"
      ? "#16A34A"
      : type === "error"
      ? "#DC2626"
      : "#64748B";
}

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();

      const email =
        emailInput.value.trim();

      const password =
        passwordInput.value;

      if (!email || !password) {

        showMessage(
          "Please enter your email and password.",
          "error"
        );

        return;
      }

      loginButton.disabled = true;
      loginButton.textContent = "LOGGING IN...";

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
              email,
              password
            });

        if (error) {

          console.error(
            "Supabase Login Error:",
            error
          );

          showMessage(
            error.message ||
            "Login failed.",
            "error"
          );

          return;
        }

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
            "Login successful!",
            "success"
          );

          window.location.replace(
            "dashboard.html"
          );
        }

      } catch (error) {

        console.error(
          "Unexpected Error:",
          error
        );

        showMessage(
          "Unable to connect to GAAWOW EMS.",
          "error"
        );

      } finally {

        loginButton.disabled = false;
        loginButton.textContent = "LOGIN";

      }
    }
  );
}


// Check existing session
async function checkExistingSession() {

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();

  if (error) {

    console.error(
      "Session Error:",
      error
    );

    return;
  }

  if (data?.session?.user) {

    sessionStorage.setItem(
      "gaawow_user_id",
      data.session.user.id
    );

    sessionStorage.setItem(
      "gaawow_user_email",
      data.session.user.email || ""
    );
  }
}

checkExistingSession();
