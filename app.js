// =====================================================
// GAAWOW EMS — PARENT PORTAL V2
// =====================================================

// SUPABASE CONFIG
const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_..."; // KU HAY KEY-GAAGA SAXDA AH

const { createClient } = supabase;

const db = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// =====================================================
// ELEMENTS
// =====================================================

const loginPage =
  document.getElementById("loginPage");

const dashboardPage =
  document.getElementById("dashboardPage");

const loginForm =
  document.getElementById("loginForm");

const loginButton =
  document.getElementById("loginButton");

const message =
  document.getElementById("message");

const logoutButton =
  document.getElementById("logoutButton");

const studentsContainer =
  document.getElementById("studentsContainer");

const welcomeTitle =
  document.getElementById("welcomeTitle");

const parentEmail =
  document.getElementById("parentEmail");


// =====================================================
// SHOW LOGIN
// =====================================================

function showLogin() {

  loginPage.style.display = "flex";

  dashboardPage.style.display = "none";

}


// =====================================================
// SHOW DASHBOARD
// =====================================================

function showDashboard() {

  loginPage.style.display = "none";

  dashboardPage.style.display = "block";

}


// =====================================================
// LOGIN
// =====================================================

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();

      const email =
        document
          .getElementById("email")
          .value
          .trim();

      const password =
        document
          .getElementById("password")
          .value;

      loginButton.disabled = true;

      loginButton.textContent =
        "LOGGING IN...";

      message.style.color =
        "#0B4DA2";

      message.textContent =
        "Checking your account...";

      try {

        // ---------------------------------------------
        // SUPABASE LOGIN
        // ---------------------------------------------

        const {
          data,
          error
        } =
          await db.auth.signInWithPassword({

            email: email,

            password: password

          });


        if (error) {

          throw error;

        }


        const user =
          data.user;


        console.log(
          "Logged-in user:",
          user
        );


        // ---------------------------------------------
        // GET ACCESSIBLE STUDENTS
        // ---------------------------------------------

        const {
          data: students,
          error: studentError
        } =
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
          "Accessible students:",
          students
        );


        // ---------------------------------------------
        // DISPLAY DASHBOARD
        // ---------------------------------------------

        welcomeTitle.textContent =
          "Welcome to GAAWOW EMS";

        parentEmail.textContent =
          user.email;


        renderStudents(
          students || []
        );


        showDashboard();


      }

      catch (error) {

        console.error(
          "Login error:",
          error
        );

        message.style.color =
          "#DC2626";

        message.textContent =
          error.message ||
          "Login failed.";

      }

      finally {

        loginButton.disabled =
          false;

        loginButton.textContent =
          "LOGIN";

      }

    }
  );

}


// =====================================================
// RENDER STUDENTS
// =====================================================

function renderStudents(students) {

  studentsContainer.innerHTML = "";


  if (!students.length) {

    studentsContainer.innerHTML = `
      <div class="empty">
        <strong>No students found.</strong>
        <br>
        No student is currently linked to this parent account.
      </div>
    `;

    return;

  }


  students.forEach(
    function (student) {

      const card =
        document.createElement("div");

      card.className =
        "student-card";


      card.innerHTML = `

        <div class="student-icon">
          🎓
        </div>

        <h3>
          ${escapeHtml(student.full_name)}
        </h3>

        <p>
          Student ID:
          ${escapeHtml(student.id)}
        </p>

        <div class="student-status">
          <span class="status-dot"></span>
          Active Student
        </div>

        <div class="student-actions">

          <button
            class="student-action"
            onclick="showComingSoon('Academic Progress')"
          >
            📊 Progress
          </button>

          <button
            class="student-action"
            onclick="showComingSoon('Attendance')"
          >
            📅 Attendance
          </button>

          <button
            class="student-action"
            onclick="showComingSoon('Exams & Grades')"
          >
            📝 Grades
          </button>

          <button
            class="student-action"
            onclick="showComingSoon('Certificates')"
          >
            🏆 Certificates
          </button>

        </div>

      `;


      studentsContainer.appendChild(
        card
      );

    }
  );

}


// =====================================================
// COMING SOON
// =====================================================

function showComingSoon(moduleName) {

  alert(
    moduleName +
    " will be connected to the GAAWOW EMS database in the next step."
  );

}


// =====================================================
// LOGOUT
// =====================================================

if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    async function () {

      logoutButton.disabled =
        true;

      logoutButton.textContent =
        "LOGGING OUT...";


      try {

        const {
          error
        } =
          await db.auth.signOut();


        if (error) {

          throw error;

        }


        studentsContainer.innerHTML =
          "";

        parentEmail.textContent =
          "";

        message.textContent =
          "";

        showLogin();


      }

      catch (error) {

        console.error(
          "Logout error:",
          error
        );

        alert(
          "Logout failed. Please try again."
        );

      }

      finally {

        logoutButton.disabled =
          false;

        logoutButton.textContent =
          "LOGOUT";

      }

    }
  );

}


// =====================================================
// CHECK EXISTING SESSION
// =====================================================

async function checkSession() {

  try {

    const {
      data,
      error
    } =
      await db.auth.getSession();


    if (error) {

      throw error;

    }


    if (
      data &&
      data.session &&
      data.session.user
    ) {

      const user =
        data.session.user;


      const {
        data: students,
        error: studentError
      } =
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


      welcomeTitle.textContent =
        "Welcome to GAAWOW EMS";

      parentEmail.textContent =
        user.email;


      renderStudents(
        students || []
      );


      showDashboard();

    }

    else {

      showLogin();

    }

  }

  catch (error) {

    console.error(
      "Session check error:",
      error
    );

    showLogin();

  }

}


// =====================================================
// SECURITY — ESCAPE HTML
// =====================================================

function escapeHtml(value) {

  const div =
    document.createElement("div");

  div.textContent =
    value ?? "";

  return div.innerHTML;

}


// =====================================================
// START APPLICATION
// =====================================================

checkSession();
