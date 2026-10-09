/* =========================================================
   GAAWOW EMS — TEACHER PORTAL V1
   Teacher-only authentication and profile portal
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupKf1b_s0RjIbAi5g_RqLCs145";

const LOGIN_PAGE = "./index.html";
const DASHBOARD_PAGE = "./dashboard.html";

let supabaseClient = null;
let currentUser = null;
let currentProfile = null;
let currentInstitution = null;


/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

function $(id) {
  return document.getElementById(id);
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function photoPlaceholder(name = "Teacher") {

  const initials = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(x => x[0].toUpperCase())
    .join("") || "T";

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg"
         width="160"
         height="160"
         viewBox="0 0 160 160">

      <rect width="160"
            height="160"
            rx="80"
            fill="#0B1E63"/>

      <text x="80"
            y="95"
            text-anchor="middle"
            font-family="Arial"
            font-size="54"
            font-weight="700"
            fill="#D4AF37">
        ${initials}
      </text>

    </svg>
  `)}`;
}


function showError(message) {

  const box = $("errorBox");

  if (!box) return;

  box.style.display = "block";
  box.textContent = message;
}


function hideLoading() {

  const screen = $("loadingScreen");

  if (screen) {
    screen.style.display = "none";
  }
}


function setLoadingText(text) {

  const element = $("loadingText");

  if (element) {
    element.textContent = text;
  }
}


/* ---------------------------------------------------------
   Supabase
--------------------------------------------------------- */

if (window.supabase) {

  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

} else {

  showError(
    "Supabase library could not be loaded."
  );

}


/* ---------------------------------------------------------
   Get Login Session
--------------------------------------------------------- */

async function getSession() {

  if (!supabaseClient) {
    throw new Error(
      "Supabase client is not available."
    );
  }

  const {
    data,
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    throw error;
  }

  if (!data?.session) {

    window.location.href =
      LOGIN_PAGE;

    return null;
  }

  currentUser =
    data.session.user;

  return data.session;
}


/* ---------------------------------------------------------
   Load Teacher Profile
--------------------------------------------------------- */

async function loadTeacherProfile() {

  setLoadingText(
    "Loading teacher profile..."
  );

  const session =
    await getSession();

  if (!session) {
    return false;
  }


  /*
    IMPORTANT:

    We intentionally query the profile by
    the authenticated user's ID.

    We DO NOT trust email supplied by
    the browser.
  */

  let result =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone,
        avatar_url,
        role,
        institution_id,
        is_active
      `)
      .eq("id", currentUser.id)
      .maybeSingle();


  /*
    Fallback for schema where email
    is unavailable in profiles.
  */

  if (
    result.error &&
    /email|column/i.test(
      result.error.message || ""
    )
  ) {

    result =
      await supabaseClient
        .from("profiles")
        .select(`
          id,
          full_name,
          phone,
          avatar_url,
          role,
          institution_id,
          is_active
        `)
        .eq("id", currentUser.id)
        .maybeSingle();
  }


  const {
    data: profile,
    error
  } = result;


  if (error) {

    console.error(
      "Profile loading error:",
      error
    );

    throw new Error(
      "Teacher profile could not be loaded: " +
      error.message
    );
  }


  if (!profile) {

    throw new Error(
      "No profile was found for this account."
    );
  }


  const role = String(profile.role || "")
  .trim()
  .toLowerCase();

console.log("Teacher Portal Debug:", {
  userId: currentUser.id,
  email: currentUser.email,
  profileId: profile.id,
  role: role,
  isActive: profile.is_active
});

if (role !== "teacher") {
  alert(
    "Access denied.\n\n" +
    "This portal is for teachers only.\n" +
    "Detected role: " + (role || "missing")
  );

  window.location.replace(LOGIN_PAGE);
  return false;
}

  /*
    SECURITY CHECK #2
  */

  if (
    profile.is_active !== true
  ) {

    alert(
      "Your teacher account is inactive.\n\n" +
      "Please contact the Academy administration."
    );

    await supabaseClient.auth.signOut();

    window.location.href =
      LOGIN_PAGE;

    return false;
  }


  currentProfile =
    profile;


  await loadInstitution();


  renderTeacherProfile();


  return true;
}


/* ---------------------------------------------------------
   Institution
--------------------------------------------------------- */

async function loadInstitution() {

  if (!currentProfile?.institution_id) {

    currentInstitution = null;

    return;
  }


  const {
    data,
    error
  } = await supabaseClient
    .from("institutions")
    .select("id,name")
    .eq(
      "id",
      currentProfile.institution_id
    )
    .maybeSingle();


  if (error) {

    console.warn(
      "Institution could not be loaded:",
      error.message
    );

    currentInstitution = null;

    return;
  }


  currentInstitution =
    data || null;
}


/* ---------------------------------------------------------
   Render Teacher Profile
--------------------------------------------------------- */

function renderTeacherProfile() {

  const profile =
    currentProfile;


  const name =
    profile.full_name ||
    "Teacher";


  const email =
    profile.email ||
    currentUser?.email ||
    "—";


  const phone =
    profile.phone ||
    "—";


  const institution =
    currentInstitution?.name ||
    "Not assigned";


  const avatar =
    profile.avatar_url ||
    photoPlaceholder(name);


  const profileAvatar =
    $("profileAvatar");

  const topAvatar =
    $("topAvatar");


  if (profileAvatar) {

    profileAvatar.src =
      avatar;

    profileAvatar.onerror =
      () => {

        profileAvatar.onerror = null;

        profileAvatar.src =
          photoPlaceholder(name);
      };
  }


  if (topAvatar) {

    topAvatar.src =
      avatar;

    topAvatar.onerror =
      () => {

        topAvatar.onerror = null;

        topAvatar.src =
          photoPlaceholder(name);
      };
  }


  if ($("profileName")) {

    $("profileName").textContent =
      name;
  }


  if ($("topName")) {

    $("topName").textContent =
      name;
  }


  if ($("welcomeName")) {

    $("welcomeName").textContent =
      name.split(" ")[0] || name;
  }


  if ($("profileEmail")) {

    $("profileEmail").textContent =
      email;
  }


  if ($("profilePhone")) {

    $("profilePhone").textContent =
      phone;
  }


  if ($("profileInstitution")) {

    $("profileInstitution").textContent =
      institution;
  }


  if ($("profileStatus")) {

    $("profileStatus").textContent =
      profile.is_active
        ? "Active"
        : "Inactive";
  }
}


/* ---------------------------------------------------------
   Coming Soon
--------------------------------------------------------- */

function comingSoon(moduleName) {

  alert(
    `${moduleName}\n\n` +
    "Teacher Portal V1 waa diyaar.\n\n" +
    "Module-kan waxaa lagu xiriirinayaa database-ka " +
    "tallaabada xigta."
  );
}


window.comingSoon =
  comingSoon;


/* ---------------------------------------------------------
   Profile
--------------------------------------------------------- */

function showProfile() {

  const profileCard =
    document.querySelector(
      ".profile-card"
    );

  if (profileCard) {

    profileCard.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
}


window.showProfile =
  showProfile;


/* ---------------------------------------------------------
   Logout
--------------------------------------------------------- */

async function logout() {

  try {

    if (supabaseClient) {

      await supabaseClient.auth.signOut();
    }

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

  } finally {

    window.location.href =
      LOGIN_PAGE;
  }
}


$("logoutBtn")?.addEventListener(
  "click",
  async () => {

    const confirmed =
      confirm(
        "Are you sure you want to logout?"
      );

    if (!confirmed) return;

    await logout();
  }
);


/* ---------------------------------------------------------
   Auth State
--------------------------------------------------------- */

if (supabaseClient) {

  supabaseClient.auth.onAuthStateChange(
    (event, session) => {

      console.log(
        "Auth event:",
        event
      );

      if (
        event === "SIGNED_OUT"
      ) {

        window.location.href =
          LOGIN_PAGE;
      }

    }
  );
}


/* ---------------------------------------------------------
   Error Handling
--------------------------------------------------------- */

window.addEventListener(
  "error",
  event => {

    console.error(
      "Teacher Portal error:",
      event.error ||
      event.message
    );

  }
);


window.addEventListener(
  "unhandledrejection",
  event => {

    console.error(
      "Teacher Portal promise error:",
      event.reason
    );

  }
);


/* ---------------------------------------------------------
   Initialize
--------------------------------------------------------- */

window.addEventListener(
  "DOMContentLoaded",
  async () => {

    try {

      if (!supabaseClient) {

        showError(
          "Supabase could not initialize."
        );

        hideLoading();

        return;
      }


      const allowed =
        await loadTeacherProfile();


      if (!allowed) {
        return;
      }


      /*
        V1 statistics intentionally remain
        zero until the exact database
        relationships are connected.
      */

      $("studentsCount").textContent =
        "0";

      $("subjectsCount").textContent =
        "0";

      $("classesCount").textContent =
        "0";

      $("examsCount").textContent =
        "0";


      hideLoading();


    } catch (error) {

      console.error(
        "Teacher Portal initialization failed:",
        error
      );


      showError(
        error.message ||
        "Teacher Portal could not be loaded."
      );


      hideLoading();
    }

  }
);
