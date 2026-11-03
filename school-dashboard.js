/* =====================================================
   GAAWOW EMS
   SCHOOL ADMIN DASHBOARD
   File: school-dashboard.js
   Version: 1.0
   ===================================================== */

(() => {
  "use strict";

  // ==========================================
  // 1. SUPABASE CONFIGURATION
  // ==========================================

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  // Beddel haddii login page-kaagu magac kale leeyahay.
  const LOGIN_PAGE = "index.html";

  // ==========================================
  // 2. INITIALIZE SUPABASE
  // ==========================================

  if (!window.supabase) {
    showFatalError(
      "Supabase library could not be loaded. Check your internet connection."
    );
    return;
  }

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

  // ==========================================
  // 3. HTML ELEMENTS
  // ==========================================

  const adminNameElement =
    document.getElementById("adminName");

  const schoolNameElement =
    document.getElementById("schoolName");

  const logoutBtn =
    document.getElementById("logoutBtn");

  const noticeElement =
    document.getElementById("dashboardNotice");

  // ==========================================
  // 4. NOTICE MESSAGE
  // ==========================================

  function showNotice(message, type = "info") {
    if (!noticeElement) return;

    noticeElement.textContent = message;
    noticeElement.className = `notice show ${type}`;
  }

  function hideNotice() {
    if (!noticeElement) return;

    noticeElement.textContent = "";
    noticeElement.className = "notice";
  }

  function showFatalError(message) {
    const container = document.querySelector(".container");

    if (container) {
      container.innerHTML = `
        <section style="
          background:white;
          padding:25px;
          border-radius:12px;
          border:1px solid #f2caca;
          color:#a32323;
          margin-top:25px;
          font-family:Arial,sans-serif;
        ">
          <h2>GAAWOW EMS Error</h2>
          <p>${escapeHTML(message)}</p>
          <button onclick="location.reload()" style="
            background:#0B1E63;
            color:white;
            border:0;
            padding:10px 18px;
            border-radius:7px;
            cursor:pointer;
          ">Retry</button>
        </section>
      `;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[character]
    );
  }

  // ==========================================
  // 5. REDIRECT TO LOGIN
  // ==========================================

  function redirectToLogin() {
    window.location.replace(LOGIN_PAGE);
  }

  // ==========================================
  // 6. VERIFY SCHOOL ADMIN
  // ==========================================

  async function verifySchoolAdmin() {
    try {
      showNotice("Verifying your account...", "info");

      // Check current session
      const {
        data: sessionData,
        error: sessionError
      } = await db.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const session = sessionData.session;

      if (!session) {
        redirectToLogin();
        return;
      }

      // Verify authenticated user
      const {
        data: userData,
        error: userError
      } = await db.auth.getUser();

      if (userError || !userData.user) {
        await db.auth.signOut();
        redirectToLogin();
        return;
      }

      const user = userData.user;

      // ======================================
      // 7. LOAD USER PROFILE
      // ======================================

      const {
        data: profile,
        error: profileError
      } = await db
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role,
          is_active,
          institution_id
        `)
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError);

        showFatalError(
          "Unable to verify your profile. Please check your Supabase profiles permissions and RLS policies."
        );

        return;
      }

      if (!profile) {
        await db.auth.signOut();
        redirectToLogin();
        return;
      }

      // ======================================
      // 8. CHECK ROLE
      // ======================================

      if (profile.role !== "school_admin") {
        showNotice(
          "Access denied. This dashboard is only for School Admin accounts.",
          "error"
        );

        await db.auth.signOut();

        setTimeout(redirectToLogin, 2000);
        return;
      }

      // ======================================
      // 9. CHECK ACCOUNT STATUS
      // ======================================

      if (profile.is_active !== true) {
        showNotice(
          "Your School Admin account is inactive. Contact Super Admin.",
          "error"
        );

        await db.auth.signOut();

        setTimeout(redirectToLogin, 2500);
        return;
      }

      // ======================================
      // 10. CHECK INSTITUTION ASSIGNMENT
      // ======================================

      if (!profile.institution_id) {
        showFatalError(
          "Your School Admin account has not been assigned to an institution. Contact Super Admin."
        );

        return;
      }

      // ======================================
      // 11. LOAD INSTITUTION
      // ======================================

      const {
        data: institution,
        error: institutionError
      } = await db
        .from("institutions")
        .select("id,name,code,is_active")
        .eq("id", profile.institution_id)
        .maybeSingle();

      if (institutionError) {
        console.error(
          "Institution error:",
          institutionError
        );

        showFatalError(
          "Unable to load your institution. Check institutions table permissions and RLS."
        );

        return;
      }

      if (!institution) {
        showFatalError(
          "Your assigned institution could not be found. Contact Super Admin."
        );

        return;
      }

      if (institution.is_active === false) {
        showFatalError(
          "Your institution is currently inactive. Contact Super Admin."
        );

        return;
      }

      // ======================================
      // 12. DISPLAY ADMIN INFORMATION
      // ======================================

      if (adminNameElement) {
        adminNameElement.textContent =
          profile.full_name || user.email || "School Admin";
      }

      if (schoolNameElement) {
        schoolNameElement.textContent =
          institution.name || "Institution";
      }

      hideNotice();

      // Save non-sensitive display information
      // for this page session only.
      window.GAAWOW_SCHOOL_ADMIN = {
        userId: user.id,
        fullName: profile.full_name,
        institutionId: institution.id,
        institutionName: institution.name,
        institutionCode: institution.code
      };

      console.log(
        "GAAWOW School Admin Dashboard initialized."
      );

    } catch (error) {
      console.error(
        "School Dashboard Error:",
        error
      );

      showFatalError(
        error.message ||
        "An unexpected error occurred while loading your dashboard."
      );
    }
  }

  // ==========================================
  // 13. LOGOUT
  // ==========================================

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const confirmed = confirm(
        "Are you sure you want to logout?"
      );

      if (!confirmed) return;

      logoutBtn.disabled = true;
      logoutBtn.textContent = "Logging out...";

      try {
        const { error } = await db.auth.signOut();

        if (error) throw error;

        redirectToLogin();

      } catch (error) {
        console.error("Logout error:", error);

        logoutBtn.disabled = false;
        logoutBtn.textContent = "Logout";

        showNotice(
          "Logout failed. Please try again.",
          "error"
        );
      }
    });
  }

  // ==========================================
  // 14. START DASHBOARD
  // ==========================================

  document.addEventListener("DOMContentLoaded", () => {
    verifySchoolAdmin();
  });

})();
