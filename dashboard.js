const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

const welcomeText =
  document.getElementById("welcomeText");

const userName =
  document.getElementById("userName");

const userEmail =
  document.getElementById("userEmail");

const avatar =
  document.getElementById("avatar");

const logoutBtn =
  document.getElementById("logoutBtn");


async function loadDashboard() {

  try {

    // =========================
    // 1. CHECK LOGIN SESSION
    // =========================

    const {
      data,
      error
    } = await supabaseClient.auth.getSession();


    if (error) {

      console.error(
        "Session error:",
        error
      );

      window.location.href =
        "index.html";

      return;
    }


    const session =
      data.session;


    if (!session) {

      window.location.href =
        "index.html";

      return;
    }


    // =========================
    // 2. GET LOGGED-IN USER
    // =========================

    const user =
      session.user;


    const email =
      user.email || "User";


    // =========================
    // 3. GET PROFILE
    // =========================

    const {
      data: profile,
      error: profileError
    } = await supabaseClient
      .from("profiles")
      .select(
        "full_name, role, institution_id, is_active"
      )
      .eq("id", user.id)
      .single();


    if (profileError) {

      console.error(
        "Profile error:",
        profileError
      );

      welcomeText.textContent =
        "Signed in as " + email;

    }


    // =========================
    // 4. USER NAME
    // =========================

    const name =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      email.split("@")[0];


    userName.textContent =
      name;


    userEmail.textContent =
      email;


    welcomeText.textContent =
      "Signed in as " + email;


    avatar.textContent =
      name
        .charAt(0)
        .toUpperCase();


    // =========================
    // 5. GET ROLE
    // =========================

    const role =
      profile?.role || "student";


    console.log(
      "Logged-in user:",
      email
    );

    console.log(
      "User role:",
      role
    );

    console.log(
      "Institution:",
      profile?.institution_id
    );


    // =========================
    // 6. SHOW ROLE ON DASHBOARD
    // =========================

    const roleElement =
      document.getElementById("userRole");


    if (roleElement) {

      roleElement.textContent =
        role
          .replace("_", " ")
          .toUpperCase();

    }


    // =========================
    // 7. SUPER ADMIN
    // =========================

    if (role === "super_admin") {

      console.log(
        "SUPER ADMIN ACCESS"
      );


      // If a Super Admin dashboard
      // exists, open it.
      const superAdminPage =
        "super-admin.html";


      // Check if the page exists
      // before redirecting.
      fetch(superAdminPage, {
        method: "HEAD"
      })
      .then(function(response) {

        if (response.ok) {

          window.location.href =
            superAdminPage;

        } else {

          console.log(
            "super-admin.html not found."
          );

        }

      })
      .catch(function(error) {

        console.error(
          "Super Admin page check error:",
          error
        );

      });

    }


    // =========================
    // 8. SCHOOL ADMIN
    // =========================

    if (role === "school_admin") {

      console.log(
        "SCHOOL ADMIN ACCESS"
      );

    }


    // =========================
    // 9. TEACHER
    // =========================

    if (role === "teacher") {

      console.log(
        "TEACHER ACCESS"
      );

    }


    // =========================
    // 10. PARENT
    // =========================

    if (role === "parent") {

      console.log(
        "PARENT ACCESS"
      );

    }


    // =========================
    // 11. STUDENT
    // =========================

    if (role === "student") {

      console.log(
        "STUDENT ACCESS"
      );

    }


  } catch (error) {

    console.error(
      "Dashboard error:",
      error
    );

    window.location.href =
      "index.html";

  }

}


// =========================
// LOGOUT
// =========================

logoutBtn.addEventListener(
  "click",
  async function () {

    logoutBtn.disabled = true;

    logoutBtn.textContent =
      "LOGGING OUT...";


    const {
      error
    } =
      await supabaseClient.auth.signOut();


    if (error) {

      console.error(
        "Logout error:",
        error
      );

      logoutBtn.disabled = false;

      logoutBtn.textContent =
        "LOGOUT";

      return;
    }


    sessionStorage.clear();


    window.location.href =
      "index.html";

  }
);


// =========================
// START DASHBOARD
// =========================

loadDashboard();
