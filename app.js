// ==========================================
// GAAWOW EMS - SUPABASE LOGIN
// ==========================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

// Load Supabase library
const { createClient } = supabase;

const db = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ==========================================
// LOGIN
// ==========================================

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");

if (loginForm) {

  loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email =
      document.getElementById("email").value.trim();

    const password =
      document.getElementById("password").value;

    loginButton.disabled = true;
    loginButton.textContent = "LOGGING IN...";

    message.style.color = "#0B4DA2";
    message.textContent = "Checking your account...";

    try {

      const { data, error } =
        await db.auth.signInWithPassword({
          email: email,
          password: password
        });

      if (error) {
        throw error;
      }

      message.style.color = "#16A34A";
      message.textContent =
        "Login successful. Loading your dashboard...";

      // Get logged-in user
      const user = data.user;

      console.log("Logged-in user:", user);

      // ======================================
      // CHECK STUDENT ACCESS
      // ======================================

      const { data: students, error: studentError } =
        await db
          .from("students")
          .select(`
            id,
            full_name,
            institution_id
          `);

      if (studentError) {
        throw studentError;
      }

      console.log(
        "Students accessible to this account:",
        students
      );

      // ======================================
      // SHOW TEST RESULT
      // ======================================

      if (students && students.length > 0) {

        const studentNames =
          students
            .map(student => student.full_name)
            .join(", ");

        message.innerHTML =
          `<strong>Login successful!</strong><br>
           Student(s) you can access:<br>
           ${studentNames}`;

      } else {

        message.innerHTML =
          `<strong>Login successful!</strong><br>
           No students were found for this account.`;

      }

    } catch (error) {

      console.error("Login error:", error);

      message.style.color = "#DC2626";

      message.textContent =
        error.message ||
        "Login failed. Please check your email and password.";

    } finally {

      loginButton.disabled = false;
      loginButton.textContent = "LOGIN";

    }

  });

}
