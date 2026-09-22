/* ============================================================
   GAAWOW EMS
   CERTIFICATES LIST MODULE V1.0
   ------------------------------------------------------------
   Lists every certificate saved by the Certificate Generator
   (table "certificates"). No PNG/PDF is stored in the database,
   so "Regenerate" re-opens the generator with the same student,
   course, certificate number and verify code pre-loaded, and
   Save there updates this same record instead of creating a new
   one (see certificate.js, ?regen=<id>).
   ============================================================ */

(() => {
  "use strict";

  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const $ = (id) => document.getElementById(id);

  let currentUser = null;
  let currentProfile = null;
  let certificates = [];

  function showMessage(text, type = "info") {
    const box = $("message");
    if (!box) return;
    box.className = `message ${type}`;
    box.textContent = text;
    box.style.display = "block";
  }

  function getErrorMessage(error) {
    if (!error) return "Unknown error";
    return error.message || error.error_description || error.details || String(error);
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "—";
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return escapeHtml(value);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function isSuperAdmin() {
    return currentProfile?.role === "super_admin";
  }

  function statusClass(status) {
    return `status status-${String(status || "valid").toLowerCase()}`;
  }

  /* ---------------- AUTH ---------------- */

  async function loadAuth() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) throw new Error(`Authentication error: ${error.message}`);
    if (!data?.user) {
      window.location.href = "index.html";
      return false;
    }
    currentUser = data.user;
    return true;
  }

  async function loadProfile() {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id,full_name,role,institution_id,is_active")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) throw new Error(`Profile database error: ${error.message}`);
    if (!data) throw new Error("Your EMS profile was not found.");
    if (data.is_active === false) throw new Error("Your EMS account is inactive.");

    currentProfile = data;
  }

  /* ---------------- DATA ---------------- */

  async function loadCertificates() {
    const tbody = $("certTableBody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty">Loading certificates...</td></tr>`;
    }

    let query = supabaseClient
      .from("certificates")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isSuperAdmin() && currentProfile?.institution_id) {
      query = query.eq("institution_id", currentProfile.institution_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Certificates database error: ${error.message}`);

    certificates = data || [];
    updateStats();
    renderTable();
  }

  function updateStats() {
    const total = certificates.length;
    const valid = certificates.filter((c) => ["valid", "graduated"].includes(c.status)).length;
    const expired = certificates.filter((c) => c.status === "expired").length;
    const revoked = certificates.filter((c) => c.status === "revoked").length;

    if ($("totalCerts")) $("totalCerts").textContent = total;
    if ($("validCerts")) $("validCerts").textContent = valid;
    if ($("expiredCerts")) $("expiredCerts").textContent = expired;
    if ($("revokedCerts")) $("revokedCerts").textContent = revoked;
  }

  /* ---------------- FILTER + RENDER ---------------- */

  function filtered() {
    const search = ($("searchInput")?.value || "").trim().toLowerCase();
    const status = $("statusFilter")?.value || "";

    return certificates.filter((c) => {
      const searchable = [
        c.certificate_no,
        c.certificate_id,
        c.verify_code,
        c.student_name_snapshot,
        c.course_name_snapshot
      ].filter(Boolean).join(" ").toLowerCase();

      return (!search || searchable.includes(search)) &&
             (!status || c.status === status);
    });
  }

  function renderTable() {
    const tbody = $("certTableBody");
    if (!tbody) return;

    const rows = filtered();

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty">No certificates found.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((c) => `
      <tr>
        <td><strong>${escapeHtml(c.certificate_no || "—")}</strong>
          <div class="sub">${escapeHtml(c.certificate_id || "")}</div></td>
        <td>${escapeHtml(c.student_name_snapshot || "—")}</td>
        <td>${escapeHtml(c.course_name_snapshot || "—")}</td>
        <td>${formatDate(c.issue_date)}</td>
        <td><span class="${statusClass(c.status)}">${escapeHtml((c.status || "valid").toUpperCase())}</span></td>
        <td class="mono">${escapeHtml(c.verify_code || "—")}</td>
        <td>
          <div class="actions">
            <button type="button" class="btn-small action-view" data-action="view" data-id="${escapeHtml(c.id)}">View</button>
            <button type="button" class="btn-small action-regen" data-action="regen" data-id="${escapeHtml(c.id)}">Regenerate</button>
            <button type="button" class="btn-small action-verify" data-action="verify" data-code="${escapeHtml(c.verify_code || "")}">Verify</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  /* ---------------- VIEW MODAL ---------------- */

  function viewCertificate(id) {
    const c = certificates.find((x) => String(x.id) === String(id));
    if (!c) return showMessage("Certificate not found.", "error");

    const modal = $("certModal");
    const content = $("certModalContent");
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="profile-grid">
        <div class="profile-item"><strong>Certificate No</strong><span>${escapeHtml(c.certificate_no || "—")}</span></div>
        <div class="profile-item"><strong>Certificate ID</strong><span>${escapeHtml(c.certificate_id || "—")}</span></div>
        <div class="profile-item"><strong>Student</strong><span>${escapeHtml(c.student_name_snapshot || "—")}</span></div>
        <div class="profile-item"><strong>Course</strong><span>${escapeHtml(c.course_name_snapshot || "—")}</span></div>
        <div class="profile-item"><strong>Type</strong><span>${escapeHtml(c.certificate_type || "—")}</span></div>
        <div class="profile-item"><strong>Status</strong><span>${escapeHtml((c.status || "valid").toUpperCase())}</span></div>
        <div class="profile-item"><strong>Issue Date</strong><span>${formatDate(c.issue_date)}</span></div>
        <div class="profile-item"><strong>Expiry Date</strong><span>${formatDate(c.expiry_date)}</span></div>
        <div class="profile-item"><strong>Verify Code</strong><span class="mono">${escapeHtml(c.verify_code || "—")}</span></div>
        <div class="profile-item" style="grid-column:1/-1"><strong>Verification Link</strong>
          <span><a href="${escapeHtml(c.verification_url || "#")}" target="_blank" rel="noopener">${escapeHtml(c.verification_url || "—")}</a></span></div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-primary" id="modalRegenBtn">Regenerate / Download</button>
        <a class="btn-secondary" href="${escapeHtml(c.verification_url || "#")}" target="_blank" rel="noopener">Open Verify Page</a>
      </div>
    `;

    $("modalRegenBtn")?.addEventListener("click", () => goRegenerate(c.id));

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    const modal = $("certModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  function goRegenerate(id) {
    window.location.href = `certificate.html?regen=${encodeURIComponent(id)}`;
  }

  function goVerify(code) {
    if (!code) return showMessage("Verify code is missing.", "error");
    window.location.href = `verify.html?code=${encodeURIComponent(code)}`;
  }

  /* ---------------- EVENTS ---------------- */

  function handleTableClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    if (action === "view") viewCertificate(button.dataset.id);
    else if (action === "regen") goRegenerate(button.dataset.id);
    else if (action === "verify") goVerify(button.dataset.code);
  }

  function setupEvents() {
    $("certTableBody")?.addEventListener("click", handleTableClick);
    $("searchInput")?.addEventListener("input", renderTable);
    $("statusFilter")?.addEventListener("change", renderTable);
    $("refreshBtn")?.addEventListener("click", async () => {
      showMessage("Refreshing...", "info");
      await loadCertificates();
      showMessage("Certificates refreshed.", "success");
    });
    $("newCertBtn")?.addEventListener("click", () => {
      window.location.href = "certificate.html";
    });
    $("closeCertModal")?.addEventListener("click", closeModal);

    const modal = $("certModal");
    modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }

  /* ---------------- INIT ---------------- */

  async function init() {
    try {
      showMessage("Loading certificates...", "info");

      const authenticated = await loadAuth();
      if (!authenticated) return;

      await loadProfile();
      setupEvents();
      await loadCertificates();

      showMessage("", "info");
      $("message").style.display = "none";
    } catch (e) {
      console.error("Certificates module error:", e);
      showMessage(e.message || "Unable to load certificates.", "error");

      const tbody = $("certTableBody");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty">${escapeHtml(e.message || "Loading failed.")}</td></tr>`;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
