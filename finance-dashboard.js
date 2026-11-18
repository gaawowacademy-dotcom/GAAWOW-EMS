
"use strict";

/* =========================================================
   GAAWOW EMS - FINANCE MANAGER DASHBOARD
   Role restricted: finance_manager
   Institution restricted through verified profile
   ========================================================= */

(() => {
  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const LOGIN_PAGE = "index.html";

  let db = null;
  let currentProfile = null;
  let currentInstitution = null;

  const $ = (id) => document.getElementById(id);

  function showError(message) {
    const errorBox = $("accessError");
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = message;
    }

    const loading = $("loadingScreen");
    if (loading) loading.hidden = true;

    const app = $("dashboardApp");
    if (app) app.hidden = true;
  }

  function normalizeRole(role) {
    return String(role || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  function getClient() {
    if (db) return db;

    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ) {
      throw new Error("Supabase library lama soo shubin.");
    }

    db = window.supabase.createClient(
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

    return db;
  }

  async function loadInstitution(institutionId) {
    if (!institutionId) return null;

    const { data, error } = await getClient()
      .from("institutions")
      .select("id, name, code")
      .eq("id", institutionId)
      .maybeSingle();

    if (error) {
      console.error("Institution lookup error:", error);
      throw new Error(
        "Machadka account-ka laguma xaqiijin karin. Fadlan la xiriir Super Admin."
      );
    }

    if (!data) {
      throw new Error(
        "Machadka Finance Manager-ka lama helin."
      );
    }

    return data;
  }

  function setProfileDetails(profile, institution) {
    const fullName =
      profile.full_name || "Finance Manager";

    const institutionText = institution
      ? institution.name +
        (institution.code ? " (" + institution.code + ")" : "")
      : "Not assigned";

    $("managerName").textContent = fullName;
    $("welcomeName").textContent = fullName;
    $("managerAvatar").textContent =
      fullName.trim().split(/\s+/).slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");

    $("institutionName").textContent =
      "Institution: " + institutionText;

    $("profileName").textContent = fullName;
    $("profileRole").textContent = profile.role;
    $("profileInstitution").textContent = institutionText;
    $("profileStatus").textContent =
      profile.is_active ? "Active" : "Inactive";
    $("profileId").textContent = profile.id;
  }

  async function verifyAccess() {
    const client = getClient();

    const {
      data: { session },
      error: sessionError
    } = await client.auth.getSession();

    if (sessionError) throw sessionError;

    if (!session || !session.user) {
      window.location.replace(LOGIN_PAGE);
      return false;
    }

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id, full_name, role, is_active, institution_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile verification error:", profileError);
      throw new Error(
        "Profile-ka lama akhrin karin. Hubi profiles RLS."
      );
    }

    if (!profile) {
      await client.auth.signOut();
      window.location.replace(LOGIN_PAGE);
      return false;
    }

    if (normalizeRole(profile.role) !== "finance_manager") {
      await client.auth.signOut();
      window.location.replace(LOGIN_PAGE);
      return false;
    }

    if (profile.is_active !== true) {
      await client.auth.signOut();
      throw new Error(
        "Akoonka Finance Manager waa inactive. La xiriir Super Admin."
      );
    }

    if (!profile.institution_id) {
      throw new Error(
        "Finance Manager-kan machad looma qoondeyn. La xiriir Super Admin."
      );
    }

    currentProfile = profile;
    currentInstitution = await loadInstitution(
      profile.institution_id
    );

    return true;
  }

  function showDashboard() {
    $("loadingScreen").hidden = true;
    $("accessError").hidden = true;
    $("dashboardApp").hidden = false;

    setProfileDetails(currentProfile, currentInstitution);
  }

  function openSection(sectionName) {
    const validSections = [
      "overview",
      "invoices",
      "payments",
      "graduation",
      "reports",
      "profile"
    ];

    if (!validSections.includes(sectionName)) return;

    document.querySelectorAll(".page-section").forEach((section) => {
      section.classList.toggle(
        "active",
        section.id === "section-" + sectionName
      );
    });

    document.querySelectorAll(".nav-link[data-section]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.section === sectionName
      );
    });

    const titles = {
      overview: "Finance Overview",
      invoices: "Student Invoices",
      payments: "Payments Verification",
      graduation: "Graduation Fee Clearance",
      reports: "Financial Reports",
      profile: "My Profile"
    };

    $("pageTitle").textContent = titles[sectionName];
  }

  function initializeNavigation() {
    document.querySelectorAll("[data-section]").forEach((button) => {
      button.addEventListener("click", () => {
        openSection(button.dataset.section);
      });
    });
  }

  async function logout() {
    const confirmed = window.confirm(
      "Ma hubtaa inaad ka baxdo GAAWOW EMS?"
    );

    if (!confirmed) return;

    const { error } = await getClient().auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      alert("Logout wuu fashilmay. Fadlan mar kale isku day.");
      return;
    }

    window.location.replace(LOGIN_PAGE);
  }

  async function initialize() {
    try {
      initializeNavigation();

      $("logoutBtn").addEventListener("click", logout);

      const authorized = await verifyAccess();

      if (!authorized) return;

      showDashboard();

      console.info("GAAWOW Finance Dashboard initialized.", {
        role: currentProfile.role,
        institution_id: currentProfile.institution_id
      });

    } catch (error) {
      console.error("Finance Dashboard error:", error);

      showError(
        error.message ||
        "Dashboard-ka lama furi karin. Fadlan la xiriir maamulka."
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

})();
