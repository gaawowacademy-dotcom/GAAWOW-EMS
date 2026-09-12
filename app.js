// ==========================================
// GAAWOW EMS - SUPABASE LOGIN
// ==========================================

const SUPABASE_URL =
  "https://mujmcunlmkvtbjslaely.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

// Create Supabase client
const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// Get page elements
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");

// ==========================================
// LOGIN
// ==========================================

loginForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  const email = document
    .getElementById("email")
    .value
    .trim();

  const password = document
    .getElementById("password")
    .value;

  loginButton.disabled = true;
  loginButton.textContent = "LOGGING IN...";

  message.style.color = "#0B4DA2";
  message.textContent = "Checking your account...";

  try {

    // Login with Supabase
    const { data, error } =
      await db.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {
      throw error;
    }

    console.log("LOGIN SUCCESS:", data.user);

    // Get accessible students
    const {
      data: students,
      error: studentError
    } = await db
      .from("students")
      .select("id, full_name, institution_id");

    if (studentError) {
      throw studentError;
    }

    // Show result
    message.style.color = "#16A34A";

    if (students && students.length > 0) {

      const studentNames = students
        .map(student => student.full_name)
        .join(", ");

      message.innerHTML = `
        <strong>Login successful!</strong><br><br>
        Student(s) you can access:<br>
        <strong>${studentNames}</strong>
      `;

    } else {

      message.innerHTML = `
        <strong>Login successful!</strong><br><br>
        No students found for this parent account.
      `;
    }

  } catch (error) {

    console.error("LOGIN ERROR:", error);

    message.style.color = "#DC2626";

    message.textContent =
      error.message ||
      "Login failed. Please check your email and password.";

  } finally {

    loginButton.disabled = false;
    loginButton.textContent = "LOGIN";

  }

});
