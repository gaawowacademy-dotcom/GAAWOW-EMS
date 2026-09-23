const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function openPage(page) { window.location.href = page; }

async function checkSuperAdmin() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session) {
    window.location.href = "index.html";
    return false;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("full_name, role, institution_id, is_active")
    .eq("id", data.session.user.id)
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
  const results = await Promise.all([
    supabaseClient.from("institutions").select("id", { count: "exact", head: true }),
    supabaseClient.from("students").select("id", { count: "exact", head: true }),
    supabaseClient.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
    supabaseClient.from("certificates").select("id", { count: "exact", head: true })
  ]);

  const ids = ["institutionCount", "studentCount", "teacherCount", "certificateCount"];
  results.forEach((r, i) => {
    if (r.error) console.error("Count error:", r.error);
    const el = document.getElementById(ids[i]);
    if (el) el.textContent = r.count ?? "0";
  });
}

async function logout() {
  await supabaseClient.auth.signOut();
  sessionStorage.clear();
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  const allowed = await checkSuperAdmin();
  if (allowed) await loadCounts();
});
