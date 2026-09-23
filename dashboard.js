const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function openPage(page) {
  window.location.href = page;
}

async function checkSuperAdmin() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data.session) {
    window.location.href = "index.html";
    return false;
  }

  const user = data.session.user;

  const { data: profile, error: profileError } =
    await supabaseClient
      .from("profiles")
      .select("full_name, role, institution_id, is_active")
      .eq("id", user.id)
      .single();

  if (profileError || !profile) {
    console.error("Profile error:", profileError);
    alert("Unable to load your profile.");
    return false;
  }

  if (profile.role !== "super_admin") {
    alert("Access denied. Super Admin only.");
    window.location.href = "index.html";
    return false;
  }

  if (profile.is_active === false) {
    alert("Your account is inactive.");
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
    return false;
  }

  const welcome = document.getElementById("superAdminWelcome");
  if (welcome && profile.full_name) {
    welcome.textContent = `Welcome, ${profile.full_name}`;
  }

  return true;
}

async function loadCounts() {
  const institutions = await supabaseClient
    .from("institutions")
    .select("id", { count: "exact", head: true });

  const students = await supabaseClient
    .from("students")
    .select("id", { count: "exact", head: true });

  const teachers = await supabaseClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "teacher");

  const certificates = await supabaseClient
    .from("certificates")
    .select("id", { count: "exact", head: true });

  const setCount = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? "0";
  };

  setCount("institutionCount", institutions.count);
  setCount("studentCount", students.count);
  setCount("teacherCount", teachers.count);
  setCount("certificateCount", certificates.count);
}

async function logout() {
  await supabaseClient.auth.signOut();
  sessionStorage.clear();
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
});

async function startDashboard() {
  const allowed = await checkSuperAdmin();
  if (!allowed) return;
  await loadCounts();
}

startDashboard();
