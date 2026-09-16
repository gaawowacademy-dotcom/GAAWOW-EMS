const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const PAGE_SIZE = 15;

let currentPage = 1;
let totalLogs = 0;

let allActions = [];
let allModules = [];

const searchInput = document.getElementById("searchInput");
const actionFilter = document.getElementById("actionFilter");
const moduleFilter = document.getElementById("moduleFilter");
const dateFilter = document.getElementById("dateFilter");
const logsBody = document.getElementById("logsBody");

async function supabaseFetch(path, options = {}) {

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const count = response.headers.get("Content-Range");

  return {
    data: await response.json(),
    count
  };
}


async function checkSuperAdmin() {

  const sessionResponse = await fetch(
    `${SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization":
          `Bearer ${localStorage.getItem("access_token") || ""}`
      }
    }
  );

  if (!sessionResponse.ok) {
    window.location.href = "index.html";
    return false;
  }

  const user = await sessionResponse.json();

  if (!user || !user.id) {
    window.location.href = "index.html";
    return false;
  }

  const profileResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=id,role,is_active`,
    {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization":
          `Bearer ${localStorage.getItem("access_token") || SUPABASE_KEY}`
      }
    }
  );

  if (!profileResponse.ok) {
    alert("Unable to verify administrator profile.");
    window.location.href = "dashboard.html";
    return false;
  }

  const profiles = await profileResponse.json();

  if (
    !profiles.length ||
    profiles[0].role !== "super_admin" ||
    profiles[0].is_active === false
  ) {
    alert("Access denied. Super Admin only.");
    window.location.href = "dashboard.html";
    return false;
  }

  return true;
}


async function loadFilters() {

  try {

    const result = await supabaseFetch(
      "audit_logs?select=action,module"
    );

    allActions = [
      ...new Set(
        result.data
          .map(x => x.action)
          .filter(Boolean)
      )
    ].sort();

    allModules = [
      ...new Set(
        result.data
          .map(x => x.module)
          .filter(Boolean)
      )
    ].sort();

    actionFilter.innerHTML =
      `<option value="">All Actions</option>`;

    allActions.forEach(action => {

      const option = document.createElement("option");

      option.value = action;
      option.textContent = action;

      actionFilter.appendChild(option);

    });

    moduleFilter.innerHTML =
      `<option value="">All Modules</option>`;

    allModules.forEach(module => {

      const option = document.createElement("option");

      option.value = module;
      option.textContent = module;

      moduleFilter.appendChild(option);

    });

  } catch (error) {

    console.error("Filter error:", error);

  }
}


async function loadLogs() {

  logsBody.innerHTML = `
    <tr>
      <td colspan="6" class="loading">
        Loading audit logs...
      </td>
    </tr>
  `;

  try {

    let query =
      "audit_logs?select=*&order=created_at.desc";

    const search =
      searchInput.value.trim();

    const action =
      actionFilter.value;

    const module =
      moduleFilter.value;

    const date =
      dateFilter.value;


    if (action) {
      query += `&action=eq.${encodeURIComponent(action)}`;
    }

    if (module) {
      query += `&module=eq.${encodeURIComponent(module)}`;
    }

    if (date) {

      query +=
        `&created_at=gte.${date}T00:00:00` +
        `&created_at=lt.${date}T23:59:59`;
    }


    if (search) {

      const encoded =
        encodeURIComponent(`*${search}*`);

      query +=
        `&or=(action.ilike.${encoded},module.ilike.${encoded},description.ilike.${encoded})`;
    }


    const from =
      (currentPage - 1) * PAGE_SIZE;

    const to =
      from + PAGE_SIZE - 1;


    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${query}`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization":
            `Bearer ${localStorage.getItem("access_token") || SUPABASE_KEY}`,
          "Range": `${from}-${to}`,
          "Prefer": "count=exact"
        }
      }
    );


    if (!response.ok) {

      const error =
        await response.text();

      throw new Error(error);
    }


    const logs =
      await response.json();


    const contentRange =
      response.headers.get("Content-Range");


    if (contentRange) {

      const match =
        contentRange.match(/\/(\d+)$/);

      if (match) {
        totalLogs =
          parseInt(match[1]);
      }

    } else {

      totalLogs =
        logs.length;
    }


    renderLogs(logs);

    updatePagination();

  } catch (error) {

    console.error(error);

    logsBody.innerHTML = `
      <tr>
        <td colspan="6" class="error">
          Failed to load audit logs.
          <br>
          ${escapeHtml(error.message)}
        </td>
      </tr>
    `;

  }
}


function renderLogs(logs) {

  if (!logs.length) {

    logsBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          No audit logs found.
        </td>
      </tr>
    `;

    return;
  }


  logsBody.innerHTML = logs.map(log => {

    const date =
      log.created_at
        ? new Date(log.created_at).toLocaleString()
        : "—";

    return `
      <tr>

        <td class="date">
          ${escapeHtml(date)}
        </td>

        <td>
          ${escapeHtml(log.user_id || "System")}
        </td>

        <td>
          <span class="action">
            ${escapeHtml(log.action || "—")}
          </span>
        </td>

        <td class="module">
          ${escapeHtml(log.module || "—")}
        </td>

        <td class="record-id">
          ${escapeHtml(log.record_id || "—")}
        </td>

        <td class="details">
          ${escapeHtml(log.description || "—")}
        </td>

      </tr>
    `;

  }).join("");

}


function updatePagination() {

  const totalPages =
    Math.max(
      1,
      Math.ceil(totalLogs / PAGE_SIZE)
    );

  document.getElementById("pageInfo").textContent =
    `Page ${currentPage} of ${totalPages}`;

  document.getElementById("prevBtn").disabled =
    currentPage <= 1;

  document.getElementById("nextBtn").disabled =
    currentPage >= totalPages;
}


function previousPage() {

  if (currentPage > 1) {

    currentPage--;

    loadLogs();
  }
}


function nextPage() {

  const totalPages =
    Math.max(
      1,
      Math.ceil(totalLogs / PAGE_SIZE)
    );

  if (currentPage < totalPages) {

    currentPage++;

    loadLogs();
  }
}


function goDashboard() {

  window.location.href =
    "dashboard.html";
}


function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


let searchTimer;

searchInput.addEventListener(
  "input",
  () => {

    clearTimeout(searchTimer);

    searchTimer =
      setTimeout(() => {

        currentPage = 1;

        loadLogs();

      }, 400);
  }
);


actionFilter.addEventListener(
  "change",
  () => {

    currentPage = 1;

    loadLogs();

  }
);


moduleFilter.addEventListener(
  "change",
  () => {

    currentPage = 1;

    loadLogs();

  }
);


dateFilter.addEventListener(
  "change",
  () => {

    currentPage = 1;

    loadLogs();

  }
);


async function init() {

  const allowed =
    await checkSuperAdmin();

  if (!allowed) return;

  await loadFilters();

  await loadLogs();
}


init();
