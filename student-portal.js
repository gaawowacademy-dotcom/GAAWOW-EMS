/* =========================================================
   GAAWOW ACADEMY EMS
   STUDENT PORTAL + ROLE GUARD
   ========================================================= */

"use strict";

const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2AvWfupkF1_b_s0RjIbAi5g_RqLCs145";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const portalContent = document.getElementById("portalContent");
const accessDenied = document.getElementById("accessDenied");
const dataPanel = document.getElementById("dataPanel");
const panelTitle = document.getElementById("panelTitle");
const panelBody = document.getElementById("panelBody");
const portalMessage = document.getElementById("portalMessage");

let currentUser = null;
let currentProfile = null;

function showPortalMessage(text, type = "error") {
  portalMessage.textContent = text;
  portalMessage.className = `message ${type}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showDenied() {
  portalContent.classList.add("hidden");
  accessDenied.classList.remove("hidden");
}

function showPortal() {
  accessDenied.classList.add("hidden");
  portalContent.classList.remove("hidden");
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "student-login.html";
}

async function loadCurrentProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/*
  HARD ROLE GUARD:
  A Student account is allowed here.
  Any other role is denied.
*/
async function initializePortal() {
  try {
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();

    if (sessionError) throw sessionError;

    const session = sessionData?.session;

    if (!session) {
      window.location.href = "student-login.html";
      return;
    }

    currentUser = session.user;
    currentProfile = await loadCurrentProfile(currentUser.id);

    if (!currentProfile) {
      throw new Error("Your profile could not be found.");
    }

    const role = String(currentProfile.role || "").toLowerCase();

    if (role !== "student") {
      showDenied();
      return;
    }

    if (currentProfile.is_active === false) {
      await logout();
      return;
    }

    showPortal();

    document.getElementById("studentName").textContent =
      currentProfile.full_name || "Student";

    document.getElementById("studentMeta").textContent =
      `${currentProfile.student_id || "Student ID unavailable"} · Student Account`;

    document.getElementById("studentIdBadge").textContent =
      currentProfile.student_id || "STUDENT";
  } catch (error) {
    console.error("Portal initialization error:", error);
    showDenied();
  }
}

/* Denied screen actions */
document.getElementById("goStudentBtn").addEventListener("click", () => {
  window.location.href = "student-portal.html";
});

document.getElementById("deniedLogoutBtn").addEventListener("click", logout);

document.getElementById("okBtn").addEventListener("click", () => {
  window.history.back();
});

document.getElementById("logoutBtn").addEventListener("click", logout);

/* Portal cards */
document.querySelectorAll("[data-section]").forEach((button) => {
  button.addEventListener("click", () => openSection(button.dataset.section));
});

document.getElementById("closePanel").addEventListener("click", () => {
  dataPanel.classList.add("hidden");
});

document.getElementById("changePasswordBtn").addEventListener("click", async () => {
  const newPassword = window.prompt(
    "Enter a new password (minimum 8 characters):"
  );

  if (!newPassword) return;

  if (newPassword.length < 8) {
    showPortalMessage("Password must contain at least 8 characters.");
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({
    password: newPassword
  });

  if (error) {
    showPortalMessage(error.message);
    return;
  }

  showPortalMessage("Password changed successfully.", "success");
});

async function openSection(section) {
  dataPanel.classList.remove("hidden");
  panelBody.innerHTML = `<div class="loading">Loading...</div>`;

  const titles = {
    profile: "My Profile",
    courses: "My Courses",
    results: "My Results",
    certificates: "My Certificates",
    authentication: "Authentication Letters"
  };

  panelTitle.textContent = titles[section] || "Student Information";

  try {
    if (section === "profile") {
      renderProfile();
      return;
    }

    if (section === "courses") {
      await loadCourses();
      return;
    }

    if (section === "results") {
      await loadResults();
      return;
    }

    if (section === "certificates") {
      await loadCertificates();
      return;
    }

    if (section === "authentication") {
      await loadAuthenticationLetters();
      return;
    }

    panelBody.innerHTML = "<p>No section selected.</p>";
  } catch (error) {
    console.error(error);
    panelBody.innerHTML =
      `<div class="message error">${escapeHtml(error.message || "Unable to load data.")}</div>`;
  }
}

function renderProfile() {
  panelBody.innerHTML = `
    <div class="info-grid">
      <div><span>Full Name</span><strong>${escapeHtml(currentProfile.full_name || "N/A")}</strong></div>
      <div><span>Student ID</span><strong>${escapeHtml(currentProfile.student_id || "N/A")}</strong></div>
      <div><span>Email</span><strong>${escapeHtml(currentUser.email || currentProfile.email || "N/A")}</strong></div>
      <div><span>Role</span><strong>Student</strong></div>
      <div><span>Account Status</span><strong>${currentProfile.is_active === false ? "Inactive" : "Active"}</strong></div>
    </div>
  `;
}

/*
  These queries intentionally use student_id/current user ownership.
  Adjust column names only if your existing EMS schema differs.
*/
async function loadCourses() {
  const studentId = currentProfile.student_id;

  const { data, error } = await supabaseClient
    .from("students")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw error;

  panelBody.innerHTML = `
    <p>Your student record was found.</p>
    <div class="info-grid">
      <div><span>Student ID</span><strong>${escapeHtml(studentId)}</strong></div>
      <div><span>Student Record</span><strong>${data ? "Active" : "Not found"}</strong></div>
    </div>
    <p class="muted">
      Connect your existing course/enrollment table here if your EMS stores
      student-course relationships separately.
    </p>
  `;
}

async function loadResults() {
  /*
    This is a safe placeholder because the existing EMS may have different
    result-table/RPC structures. Do not expose another student's results.
  */
  panelBody.innerHTML = `
    <div class="empty-state">
      <div>📝</div>
      <h3>Academic Results</h3>
      <p>Only published results belonging to your Student ID should appear here.</p>
      <p class="muted">Connect this card to your existing academic-results RPC/table.</p>
    </div>
  `;
}

async function loadCertificates() {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select("id,certificate_no,certificate_id,certificate_type,course_name_snapshot,issue_date,expiry_date,status,verification_url")
    .eq("student_id", currentProfile.student_id)
    .order("issue_date", { ascending: false });

  if (error) throw error;

  if (!data?.length) {
    panelBody.innerHTML = `<div class="empty-state"><div>🎓</div><h3>No certificates found</h3><p>No certificate is currently linked to your Student ID.</p></div>`;
    return;
  }

  panelBody.innerHTML = data.map((cert) => `
    <div class="record-row">
      <div>
        <strong>${escapeHtml(cert.course_name_snapshot || cert.certificate_type || "Certificate")}</strong>
        <small>${escapeHtml(cert.certificate_no || cert.certificate_id || "")}</small>
      </div>
      <span class="status">${escapeHtml(cert.status || "N/A")}</span>
    </div>
  `).join("");
}

async function loadAuthenticationLetters() {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select("id,certificate_no,certificate_id,certificate_type,course_name_snapshot,issue_date,expiry_date,status,verification_url")
    .eq("student_id", currentProfile.student_id)
    .eq("certificate_type", "authentication_letter")
    .order("issue_date", { ascending: false });

  if (error) throw error;

  if (!data?.length) {
    panelBody.innerHTML = `<div class="empty-state"><div>📄</div><h3>No authentication letters found</h3><p>No authentication letter is currently linked to your Student ID.</p></div>`;
    return;
  }

  panelBody.innerHTML = data.map((letter) => `
    <div class="record-row">
      <div>
        <strong>Authentication Letter</strong>
        <small>${escapeHtml(letter.certificate_no || letter.certificate_id || "")}</small>
      </div>
      <div class="record-actions">
        <span class="status">${escapeHtml(letter.status || "N/A")}</span>
        ${letter.verification_url
          ? `<a class="secondary-btn inline-btn" href="${escapeHtml(letter.verification_url)}" target="_blank" rel="noopener">Verify</a>`
          : ""}
      </div>
    </div>
  `).join("");
}

initializePortal();
