
"use strict";

(() => {
  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const CREATE_URL =
    SUPABASE_URL + "/functions/v1/create-finance-manager";

  const MANAGE_URL =
    SUPABASE_URL + "/functions/v1/manage-finance-manager";

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const $ = id => document.getElementById(id);

  let session = null;
  let currentPassword = "";
  let isCreating = false;

  // Normalize database roles
  function normalizeRole(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  // Display messages without changing page design
  function showMessage(id, message, type = "error") {
    const el = $(id);
    if (!el) return;

    el.textContent = message;
    el.className = "message " + type;
  }

  function clearMessage(id) {
    const el = $(id);
    if (!el) return;

    el.textContent = "";
    el.className = "message";
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  // 1. Secure Edge Function request
  async function apiRequest(url, payload) {
    const { data, error } = await db.auth.getSession();

    if (error) {
      throw new Error("Session error: " + error.message);
    }

    session = data.session;

    const accessToken = session?.access_token;

    if (!accessToken) {
      throw new Error(
        "Session-ka wuu dhacay. Fadlan dib u gal."
      );
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + accessToken,
        "apikey": SUPABASE_KEY
      },
      body: JSON.stringify(payload)
    });

    let result = {};

    try {
      result = await response.json();
    } catch {
      throw new Error(
        "Server-ku ma soo celin jawaab sax ah. HTTP " +
        response.status
      );
    }

    if (!response.ok || result.success === false) {
      const details = result.details
        ? " | Details: " + result.details
        : "";

      const code = result.code
        ? " | Code: " + result.code
        : "";

      throw new Error(
        (result.message || result.error || "Request failed") +
        code +
        details
      );
    }

    return result;
  }

  // 2. Verify active Super Admin
  async function initialize() {
    try {
      const { data, error } = await db.auth.getSession();

      if (error) throw error;

      session = data.session;

      if (!session) {
        location.replace("index.html");
        return;
      }

      const { data: profile, error: profileError } =
        await db
          .from("profiles")
          .select("id,role,is_active,is_primary_admin")
          .eq("id", session.user.id)
          .maybeSingle();

      if (profileError) throw profileError;

      if (
        !profile ||
        profile.id !== session.user.id ||
        normalizeRole(profile.role) !== "super_admin" ||
        profile.is_active !== true
      ) {
        document.body.innerHTML =
          "<div style='padding:40px;text-align:center'>" +
          "<h2>Access Denied</h2>" +
          "<p>Only active Super Admin accounts can access this page.</p>" +
          "<a href='index.html'>Return to Login</a></div>";

        return;
      }

      await loadInstitutions();
      await loadManagers();

    } catch (error) {
      console.error("Finance Manager Initialization:", error);

      showMessage(
        "pageMessage",
        error.message || "Page initialization failed."
      );
    }
  }

  // 3. Load active institutions
  async function loadInstitutions() {
    const select = $("institution_id");

    if (!select) {
      throw new Error(
        "HTML element institution_id lama helin."
      );
    }

    select.innerHTML =
      '<option value="">Loading...</option>';

    const { data, error } = await db
      .from("institutions")
      .select("id,name,code,is_active")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    select.innerHTML =
      '<option value="">Select Institution</option>';

    (data || []).forEach(inst => {
      const option = document.createElement("option");

      option.value = inst.id;
      option.textContent =
        inst.name + " (" + inst.code + ")";

      select.appendChild(option);
    });

    if (!data || data.length === 0) {
      select.innerHTML =
        '<option value="">No active institutions found</option>';
    }
  }

  // 4. Create Finance Manager
  async function createManager(event) {
    event.preventDefault();

    if (isCreating) return;

    clearMessage("createMessage");

    const button = $("createBtn");

    const full_name = $("full_name").value.trim();
    const email = $("email").value.trim().toLowerCase();
    const phone = $("phone").value.trim();
    const institution_id = $("institution_id").value;
    const password = $("password").value;

    if (!full_name || !email || !institution_id || !password) {
      showMessage(
        "createMessage",
        "Fadlan buuxi dhammaan meelaha muhiimka ah."
      );
      return;
    }

    if (full_name.length < 3 || full_name.length > 120) {
      showMessage(
        "createMessage",
        "Magaca waa inuu u dhexeeyaa 3 ilaa 120 xaraf."
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage(
        "createMessage",
        "Fadlan geli email sax ah."
      );
      return;
    }

    if (password.length < 8) {
      showMessage(
        "createMessage",
        "Password-ku waa inuu ugu yaraan 8 xaraf noqdaa."
      );
      return;
    }

    isCreating = true;
    button.disabled = true;
    button.textContent = "Creating Account...";

    try {
      const result = await apiRequest(CREATE_URL, {
        full_name,
        email,
        password,
        institution_id,
        phone: phone || null
      });

      // Account was successfully created
      currentPassword = password;

      $("generatedPassword").textContent = password;
      $("passwordResult").style.display = "block";

      $("createForm").reset();

      showMessage(
        "createMessage",
        result.message ||
          "Finance Manager account created successfully.",
        "success"
      );

      // Refresh list separately.
      // A list-loading error must not undo creation success.
      await loadManagers();

    } catch (error) {
      console.error("Create Finance Manager:", error);

      showMessage(
        "createMessage",
        error.message || "Could not create Finance Manager."
      );

    } finally {
      isCreating = false;
      button.disabled = false;
      button.textContent = "+ Create Finance Manager";
    }
  }

  // 5. Load Finance Managers
  async function loadManagers() {
    const loading = $("loading");
    const table = $("managerTable");

    loading.style.display = "block";
    table.innerHTML = "";

    clearMessage("listMessage");

    try {
      const { data: managers, error } = await db
        .from("profiles")
        .select(
          "id,full_name,email,phone,institution_id,is_active,is_primary_admin,role"
        )
        .eq("role", "finance_manager")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const institutionIds = [
        ...new Set(
          (managers || [])
            .map(manager => manager.institution_id)
            .filter(Boolean)
        )
      ];

      const institutionMap = {};

      if (institutionIds.length) {
        const { data: institutions, error: instError } =
          await db
            .from("institutions")
            .select("id,name,code,is_active")
            .in("id", institutionIds);

        if (instError) throw instError;

        (institutions || []).forEach(inst => {
          institutionMap[inst.id] =
            inst.name + " (" + inst.code + ")";
        });
      }

      loading.style.display = "none";

      if (!managers || managers.length === 0) {
        table.innerHTML =
          '<tr><td colspan="6" class="empty">' +
          "No Finance Managers found.</td></tr>";

        return;
      }

      table.innerHTML = managers.map(manager => {
        const active = manager.is_active === true;

        return `
          <tr>
            <td>${escapeHTML(manager.full_name)}</td>
            <td>${escapeHTML(manager.email || "-")}</td>
            <td>${escapeHTML(manager.phone || "-")}</td>
            <td>${escapeHTML(
              institutionMap[manager.institution_id] || "Not assigned"
            )}</td>
            <td>
              <span class="status ${active ? "active" : "inactive"}">
                ${active ? "Active" : "Inactive"}
              </span>
            </td>
            <td>
              <button
                class="${active ? "red" : "green"}"
                data-action="${active ? "deactivate" : "activate"}"
                data-id="${escapeHTML(manager.id)}"
                ${manager.is_primary_admin ? "disabled" : ""}
                type="button">
                ${active ? "Deactivate" : "Activate"}
              </button>
            </td>
          </tr>
        `;
      }).join("");

    } catch (error) {
      console.error("Load Managers:", error);

      loading.style.display = "none";

      table.innerHTML =
        '<tr><td colspan="6" class="empty">' +
        "Unable to load Finance Managers.</td></tr>";

      showMessage(
        "listMessage",
        error.message || "Could not load Finance Managers."
      );
    }
  }

  // 6. Activate / Deactivate Finance Manager
  async function changeStatus(action, adminId) {
    if (!["activate", "deactivate"].includes(action)) {
      showMessage("listMessage", "Invalid account action.");
      return;
    }

    if (!adminId) {
      showMessage("listMessage", "Finance Manager ID is missing.");
      return;
    }

    const label =
      action === "activate" ? "Activate" : "Deactivate";

    const confirmed = window.confirm(
      "Are you sure you want to " + label +
      " this Finance Manager?"
    );

    if (!confirmed) return;

    try {
      const result = await apiRequest(MANAGE_URL, {
        action,
        admin_id: adminId
      });

      showMessage(
        "listMessage",
        result.message ||
          "Account status updated successfully.",
        "success"
      );

      await loadManagers();

    } catch (error) {
      console.error("Manage Finance Manager:", error);

      showMessage(
        "listMessage",
        error.message || "Could not update account status."
      );
    }
  }

  // 7. Copy temporary password
  async function copyPassword() {
    if (!currentPassword) {
      showMessage(
        "createMessage",
        "Ma jiro password la koobiyeeyo."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(currentPassword);

      $("copyPassword").textContent = "Copied!";

    } catch (error) {
      console.error("Copy Password:", error);

      showMessage(
        "createMessage",
        "Copy failed. Please copy the password manually."
      );
    }
  }

  // 8. Event listeners
  $("createForm").addEventListener(
    "submit",
    createManager
  );

  $("refreshBtn").addEventListener(
    "click",
    loadManagers
  );

  $("copyPassword").addEventListener(
    "click",
    copyPassword
  );

  $("managerTable").addEventListener("click", event => {
    const target = event.target;

    if (!target || typeof target.closest !== "function") {
      return;
    }

    const button = target.closest("button[data-action]");

    if (!button || button.disabled) return;

    changeStatus(
      button.dataset.action,
      button.dataset.id
    );
  });

  // 9. Clear temporary password from memory on page exit
  window.addEventListener("pagehide", () => {
    currentPassword = "";

    const passwordOutput = $("generatedPassword");

    if (passwordOutput) {
      passwordOutput.textContent = "";
    }
  });

  // 10. Start page
  initialize();

})();
