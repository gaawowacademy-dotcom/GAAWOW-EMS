"use strict";

/* =========================================
   GAAWOW EMS SCHOOL ADMIN DASHBOARD
   Institution-scoped dashboard
========================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupKf1b_s0RjIbAi5g_RqLCs145";

const db = window.supabase.createClient(
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

let currentInstitutionId = null;

const $ = id => document.getElementById(id);


/* =========================================
   ERROR MESSAGE
========================================= */

function showError(message) {
  const box = $("errorMessage");

  if (!box) return;

  box.textContent = message;
  box.style.display = "block";
}


/* =========================================
   AUTHENTICATION AND ROLE VERIFICATION
========================================= */

async function verifySchoolAdmin() {

  const {
    data: sessionData,
    error: sessionError
  } = await db.auth.getSession();

  if (
    sessionError ||
    !sessionData?.session
  ) {
    window.location.replace("index.html");
    return false;
  }

  const user = sessionData.session.user;

  const {
    data: profile,
    error: profileError
  } = await db
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      is_active,
      institution_id
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {

    console.error(
      "School Admin profile error:",
      profileError
    );

    showError(
      "Your profile could not be verified."
    );

    return false;
  }

  if (profile.is_active !== true) {

    await db.auth.signOut();

    window.location.replace("index.html");

    return false;
  }

  if (profile.role !== "school_admin") {

    const routes = {
      super_admin: "dashboard.html",
      teacher: "teacher-portal.html",
      parent: "parent.html",
      student: "student-portal.html?v=8"
    };

    const destination =
      routes[profile.role] || "index.html";

    window.location.replace(destination);

    return false;
  }

  if (!profile.institution_id) {

    showError(
      "School Admin account has no institution assigned. Contact Super Admin."
    );

    return false;
  }

  currentInstitutionId = profile.institution_id;

  $("welcomeName").textContent =
    `Welcome, ${profile.full_name || "School Administrator"}`;

  return await loadInstitution(profile.institution_id);
}


/* =========================================
   INSTITUTION DETAILS
========================================= */

async function loadInstitution(institutionId) {

  const {
    data,
    error
  } = await db
    .from("institutions")
    .select("*")
    .eq("id", institutionId)
    .maybeSingle();

  if (error) {

    console.error(
      "Institution loading error:",
      error
    );

    $("institutionName").textContent =
      "Institution information unavailable";

    return true;
  }

  if (!data) {

    showError(
      "Your institution record could not be found."
    );

    return false;
  }

  const institutionName =
    data.name ||
    data.institution_name ||
    data.school_name ||
    data.title ||
    "Your Institution";

  $("institutionName").textContent =
    institutionName;

  return true;
}


/* =========================================
   INSTITUTION-SCOPED COUNT
========================================= */

async function countRecords(
  table,
  elementId,
  extraFilters = []
) {

  const element = $(elementId);

  try {

    let query = db
      .from(table)
      .select("id", {
        count: "exact",
        head: true
      })
      .eq(
        "institution_id",
        currentInstitutionId
      );

    for (const filter of extraFilters) {

      query = query.eq(
        filter.column,
        filter.value
      );

    }

    const {
      count,
      error
    } = await query;

    if (error) {
      throw error;
    }

    element.textContent = count ?? 0;

  } catch (error) {

    console.error(
      `Count error (${table}):`,
      error
    );

    element.textContent = "N/A";
  }
}


/* =========================================
   LOAD DASHBOARD STATISTICS
========================================= */

async function loadStatistics() {

  if (!currentInstitutionId) return;

  await Promise.all([

    countRecords(
      "students",
      "studentCount"
    ),

    countRecords(
      "profiles",
      "teacherCount",
      [
        {
          column: "role",
          value: "teacher"
        }
      ]
    ),

    countRecords(
      "courses",
      "courseCount"
    ),

    countRecords(
      "classes",
      "classCount"
    ),

    countRecords(
      "exams",
      "examCount"
    ),

    countRecords(
      "grades",
      "gradeCount"
    ),

    countRecords(
      "certificates",
      "certificateCount"
    ),

    countRecords(
      "attendance",
      "attendanceCount"
    )

  ]);
}


/* =========================================
   LOGOUT
========================================= */

function setupLogout() {

  const button = $("logoutBtn");

  if (!button) return;

  button.addEventListener(
    "click",
    async () => {

      button.disabled = true;
      button.textContent = "Logging out...";

      const {
        error
      } = await db.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
      }

      [
        "gaawow_user_id",
        "gaawow_user_email",
        "gaawow_user_role"
      ].forEach(key => {
        sessionStorage.removeItem(key);
      });

      window.location.replace("index.html");

    }
  );
}


/* =========================================
   AUTH STATE
========================================= */

db.auth.onAuthStateChange(
  (event) => {

    if (event === "SIGNED_OUT") {
      window.location.replace("index.html");
    }

  }
);


/* =========================================
   START
========================================= */

async function startSchoolDashboard() {

  if (!window.supabase) {

    showError(
      "Supabase library failed to load."
    );

    return;
  }

  const allowed =
    await verifySchoolAdmin();

  if (!allowed) return;

  await loadStatistics();

  setupLogout();

}


document.addEventListener(
  "DOMContentLoaded",
  startSchoolDashboard
);
