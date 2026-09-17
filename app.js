// ==========================================
// GAAWOW EMS — FAST LOGIN
// ==========================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

// PUT THE CURRENT SUPABASE PUBLISHABLE KEY HERE
const SUPABASE_KEY =
  "PASTE_CURRENT_PUBLISHABLE_KEY_HERE";


// ==========================================
// SUPABASE
// ==========================================

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
// DOM
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

function showMessage(text, type = "info") {

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
// LOGIN BUTTON
// ==========================================

function setLoading(isLoading) {

  if (!loginButton) return;

  loginButton.disabled = isLoading;

  loginButton.textContent =
    isLoading ? "LOGGING IN..." : "LOGIN";
}


// ==========================================
// SAVE SESSION
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
              email,
              password
            });


        if (error) {

          console.error(
            "LOGIN ERROR:",
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


        if (!data?.user) {

          showMessage(
            "Login failed. User account was not returned.",
            "error"
          );

          setLoading(false);

          return;
        }


        // Save user
        saveUser(data.user);


        showMessage(
          "Login successful!",
          "success"
        );


        console.log(
          "GAAWOW EMS USER:",
          data.user.id
        );


        // Immediate redirect
        window.location.replace(
          "dashboard.html"
        );

      }

      catch (error) {

        console.error(
          "UNEXPECTED LOGIN ERROR:",
          error
        );

        showMessage(
          "Connection error. Please try again.",
          "error"
        );

        setLoading(false);
      }

    }
  );

}


// ==========================================
// EXISTING SESSION
// ==========================================

async function checkSession() {

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

checkSession();
