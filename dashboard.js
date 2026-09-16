const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


function openPage(page) {
  window.location.href = page;
}


async function checkSuperAdmin() {

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();


  if (
    error ||
    !data.session
  ) {

    window.location.href =
      "index.html";

    return false;
  }


  const user =
    data.session.user;


  const {
    data: profile,
    error: profileError
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "full_name, role, institution_id, is_active"
      )
      .eq(
        "id",
        user.id
      )
      .single();


  if (
    profileError ||
    !profile
  ) {

    console.error(
      "Profile error:",
      profileError
    );

    alert(
      "Unable to load your profile."
    );

    return false;
  }


  if (
    profile.role !==
    "super_admin"
  ) {

    alert(
      "Access denied. Super Admin only."
    );

    window.location.href =
      "index.html";

    return false;
  }


  if (
    profile.is_active === false
  ) {

    alert(
      "Your account is inactive."
    );

    await supabaseClient
      .auth
      .signOut();

    window.location.href =
      "index.html";

    return false;
  }


  return true;
}


async function loadCounts() {

  const institutions =
    await supabaseClient
      .from("institutions")
      .select(
        "id",
        {
          count: "exact",
          head: true
        }
      );


  const students =
    await supabaseClient
      .from("students")
      .select(
        "id",
        {
          count: "exact",
          head: true
        }
      );


  const teachers =
    await supabaseClient
      .from("profiles")
      .select(
        "id",
        {
          count: "exact",
          head: true
        }
      )
      .eq(
        "role",
        "teacher"
      );


  const certificates =
    await supabaseClient
      .from("certificates")
      .select(
        "id",
        {
          count: "exact",
          head: true
        }
      );


  document.getElementById(
    "institutionCount"
  ).textContent =
    institutions.count ?? "0";


  document.getElementById(
    "studentCount"
  ).textContent =
    students.count ?? "0";


  document.getElementById(
    "teacherCount"
  ).textContent =
    teachers.count ?? "0";


  document.getElementById(
    "certificateCount"
  ).textContent =
    certificates.count ?? "0";
}


document
  .getElementById("logoutBtn")
  .addEventListener(
    "click",
    async function () {

      this.disabled = true;

      this.textContent =
        "LOGGING OUT...";


      await supabaseClient
        .auth
        .signOut();


      sessionStorage.clear();


      window.location.href =
        "index.html";
    }
  );


async function startDashboard() {

  const allowed =
    await checkSuperAdmin();


  if (!allowed) {
    return;
  }


  await loadCounts();
}


startDashboard();
