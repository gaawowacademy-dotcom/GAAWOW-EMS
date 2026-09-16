const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


let allLogs = [];
let filteredLogs = [];

let currentPage = 1;
const pageSize = 15;

let usersMap = {};
let institutionsMap = {};


document.addEventListener("DOMContentLoaded", init);


async function init() {

  try {

    showLoading(true);

    const {
      data: sessionData,
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    const session = sessionData?.session;

    if (!session) {
      window.location.href = "index.html";
      return;
    }

    const userId = session.user.id;

    const {
      data: profile,
      error: profileError
    } = await supabaseClient
      .from("profiles")
      .select("full_name, role, institution_id, is_active")
      .eq("id", userId)
      .single();

    if (profileError) {
      throw profileError;
    }

    if (
      profile.role !== "super_admin" ||
      profile.is_active !== true
    ) {
      showError(
        "Access denied. Audit Logs are available to Super Admin only."
      );

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 2500);

      return;
    }

    await loadUsers();
    await loadInstitutions();
    await loadModules();
    await loadLogs();

  } catch (error) {

    console.error(error);

    showError(
      error.message || "Unable to load Audit Logs."
    );

  } finally {

    showLoading(false);

  }
}


/* =========================
   LOAD USERS
========================= */

async function loadUsers() {

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select("id, full_name, email, role");

  if (error) {
    console.warn("Users could not be loaded:", error);
    return;
  }

  usersMap = {};

  (data || []).forEach(user => {

    usersMap[user.id] = {
      name:
        user.full_name ||
        user.email ||
        "Unknown User",

      email:
        user.email || "",

      role:
        user.role || ""
    };

  });

}


/* =========================
   LOAD INSTITUTIONS
========================= */

async function loadInstitutions() {

  const {
    data,
    error
  } = await supabaseClient
    .from("institutions")
    .select("id, name, code");

  if (error) {
    console.warn(
      "Institutions could not be loaded:",
      error
    );
    return;
  }

  institutionsMap = {};

  (data || []).forEach(inst => {

    institutionsMap[inst.id] = {
      name:
        inst.name ||
        "Unknown Institution",

      code:
        inst.code || ""
    };

  });

}


/* =========================
   LOAD MODULES
========================= */

async function loadModules() {

  const {
    data,
    error
  } = await supabaseClient
    .from("audit_logs")
    .select("module")
    .not("module", "is", null);

  if (error) {
    console.warn(error);
    return;
  }

  const modules = [
    ...new Set(
      (data || [])
        .map(row => row.module)
        .filter(Boolean)
    )
  ].sort();

  const select =
    document.getElementById("moduleFilter");

  modules.forEach(module => {

    const option =
      document.createElement("option");

    option.value = module;
    option.textContent = module;

    select.appendChild(option);

  });

}


/* =========================
   LOAD LOGS
========================= */

async function loadLogs() {

  const {
    data,
    error
  } = await supabaseClient
    .from("audit_logs")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  allLogs = data || [];

  updateSummary();

  applyFilters();

}


/* =========================
   SUMMARY
========================= */

function updateSummary() {

  const total =
    allLogs.length;

  const inserts =
    allLogs.filter(
      x => x.action === "INSERT"
    ).length;

  const updates =
    allLogs.filter(
      x => x.action === "UPDATE"
    ).length;

  const deletes =
    allLogs.filter(
      x => x.action === "DELETE"
    ).length;

  document.getElementById("totalLogs")
    .textContent = total;

  document.getElementById("insertLogs")
    .textContent = inserts;

  document.getElementById("updateLogs")
    .textContent = updates;

  document.getElementById("deleteLogs")
    .textContent = deletes;
}


/* =========================
   FILTERS
========================= */

function applyFilters() {

  const search =
    document.getElementById(
      "searchInput"
    ).value
      .trim()
      .toLowerCase();

  const action =
    document.getElementById(
      "actionFilter"
    ).value;

  const module =
    document.getElementById(
      "moduleFilter"
    ).value;

  const date =
    document.getElementById(
      "dateFilter"
    ).value;


  filteredLogs =
    allLogs.filter(log => {

      const user =
        usersMap[log.user_id];

      const institution =
        institutionsMap[
          log.institution_id
        ];


      const userName =
        user?.name?.toLowerCase() || "";

      const userEmail =
        user?.email?.toLowerCase() || "";

      const institutionName =
        institution?.name?.toLowerCase() || "";


      const searchText = [

        log.action,
        log.module,
        log.description,
        log.record_id,
        userName,
        userEmail,
        institutionName

      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();


      const searchMatch =
        !search ||
        searchText.includes(search);


      const actionMatch =
        !action ||
        log.action === action;


      const moduleMatch =
        !module ||
        log.module === module;


      let dateMatch = true;

      if (date) {

        dateMatch =
          log.created_at &&
          log.created_at.startsWith(date);

      }


      return (
        searchMatch &&
        actionMatch &&
        moduleMatch &&
        dateMatch
      );

    });


  currentPage = 1;

  renderLogs();

}


/* =========================
   RENDER
========================= */

function renderLogs() {

  const table =
    document.getElementById(
      "logsTable"
    );

  const tbody =
    document.getElementById(
      "logsBody"
    );

  const empty =
    document.getElementById(
      "empty"
    );


  tbody.innerHTML = "";


  if (filteredLogs.length === 0) {

    table.style.display = "none";
    empty.style.display = "block";

    updatePagination();

    return;

  }


  table.style.display = "table";
  empty.style.display = "none";


  const start =
    (currentPage - 1) *
    pageSize;

  const end =
    start + pageSize;

  const pageLogs =
    filteredLogs.slice(
      start,
      end
    );


  pageLogs.forEach(log => {

    const row =
      document.createElement("tr");


    const user =
      usersMap[log.user_id];

    const institution =
      institutionsMap[
        log.institution_id
      ];


    const userName =
      user?.name ||
      "System / Unknown";

    const userRole =
      user?.role ||
      "";

    const institutionName =
      institution?.name ||
      "—";


    const date =
      formatDate(log.created_at);


    const badge =
      getActionBadge(
        log.action
      );


    const recordId =
      log.record_id ||
      "—";


    row.innerHTML = `

      <td>
        <strong>${escapeHtml(date.date)}</strong>
        <div class="sub">
          ${escapeHtml(date.time)}
        </div>
      </td>

      <td>
        <div class="user-name">
          ${escapeHtml(userName)}
        </div>

        ${
          userRole
            ? `<div class="sub">
                ${escapeHtml(userRole)}
              </div>`
            : ""
        }
      </td>

      <td>
        <strong>
          ${escapeHtml(institutionName)}
        </strong>

        ${
          institution?.code
            ? `<div class="sub">
                ${escapeHtml(institution.code)}
              </div>`
            : ""
        }
      </td>

      <td>
        ${badge}
      </td>

      <td>
        <strong>
          ${escapeHtml(
            log.module || "—"
          )}
        </strong>
      </td>

      <td>
        <span
          title="${escapeHtml(recordId)}"
          style="
            font-family:monospace;
            font-size:11px;
          "
        >
          ${escapeHtml(
            shortId(recordId)
          )}
        </span>
      </td>

      <td>
        ${escapeHtml(
          log.description || "—"
        )}
      </td>

      <td>
        <button
          class="view-btn"
          onclick='openDetails(${JSON.stringify(
            log
          )})'
        >
          View
        </button>
      </td>

    `;

    tbody.appendChild(row);

  });


  updatePagination();

}


/* =========================
   ACTION BADGE
========================= */

function getActionBadge(action) {

  const safe =
    action || "OTHER";

  const cls =
    safe === "INSERT"
      ? "insert"
      : safe === "UPDATE"
      ? "update"
      : safe === "DELETE"
      ? "delete"
      : "other";

  return `
    <span class="badge ${cls}">
      ${escapeHtml(safe)}
    </span>
  `;

}


/* =========================
   DETAILS
========================= */

function openDetails(log) {

  const user =
    usersMap[log.user_id];

  const institution =
    institutionsMap[
      log.institution_id
    ];


  document.getElementById(
    "dDate"
  ).textContent =
    formatFullDate(
      log.created_at
    );


  document.getElementById(
    "dAction"
  ).innerHTML =
    getActionBadge(
      log.action
    );


  document.getElementById(
    "dModule"
  ).textContent =
    log.module || "—";


  document.getElementById(
    "dUser"
  ).textContent =
    user
      ? `${user.name}${user.role ? " (" + user.role + ")" : ""}`
      : log.user_id || "—";


  document.getElementById(
    "dInstitution"
  ).textContent =
    institution
      ? `${institution.name}${institution.code ? " (" + institution.code + ")" : ""}`
      : log.institution_id || "—";


  document.getElementById(
    "dRecord"
  ).textContent =
    log.record_id || "—";


  document.getElementById(
    "dIP"
  ).textContent =
    log.ip_address || "Not recorded";


  document.getElementById(
    "dAgent"
  ).textContent =
    log.user_agent || "Not recorded";


  document.getElementById(
    "dDescription"
  ).textContent =
    log.description || "—";


  document.getElementById(
    "oldData"
  ).textContent =
    prettyJSON(
      log.old_data
    );


  document.getElementById(
    "newData"
  ).textContent =
    prettyJSON(
      log.new_data
    );


  document.getElementById(
    "detailsModal"
  ).style.display = "block";

}


/* =========================
   MODAL
========================= */

document.getElementById(
  "closeModal"
).addEventListener(
  "click",
  closeModal
);


document.getElementById(
  "detailsModal"
).addEventListener(
  "click",
  event => {

    if (
      event.target.id ===
      "detailsModal"
    ) {
      closeModal();
    }

  }
);


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape"
    ) {
      closeModal();
    }

  }
);


function closeModal() {

  document.getElementById(
    "detailsModal"
  ).style.display = "none";

}


/* =========================
   FILTER EVENTS
========================= */

document.getElementById(
  "searchInput"
).addEventListener(
  "input",
  applyFilters
);


document.getElementById(
  "actionFilter"
).addEventListener(
  "change",
  applyFilters
);


document.getElementById(
  "moduleFilter"
).addEventListener(
  "change",
  applyFilters
);


document.getElementById(
  "dateFilter"
).addEventListener(
  "change",
  applyFilters
);


document.getElementById(
  "clearBtn"
).addEventListener(
  "click",
  () => {

    document.getElementById(
      "searchInput"
    ).value = "";

    document.getElementById(
      "actionFilter"
    ).value = "";

    document.getElementById(
      "moduleFilter"
    ).value = "";

    document.getElementById(
      "dateFilter"
    ).value = "";

    applyFilters();

  }
);


/* =========================
   PAGINATION
========================= */

document.getElementById(
  "prevBtn"
).addEventListener(
  "click",
  () => {

    if (currentPage > 1) {

      currentPage--;

      renderLogs();

    }

  }
);


document.getElementById(
  "nextBtn"
).addEventListener(
  "click",
  () => {

    const totalPages =
      Math.ceil(
        filteredLogs.length /
        pageSize
      );

    if (
      currentPage <
      totalPages
    ) {

      currentPage++;

      renderLogs();

    }

  }
);


function updatePagination() {

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredLogs.length /
        pageSize
      )
    );


  document.getElementById(
    "pageInfo"
  ).textContent =
    `Page ${currentPage} of ${totalPages}`;


  document.getElementById(
    "prevBtn"
  ).disabled =
    currentPage <= 1;


  document.getElementById(
    "nextBtn"
  ).disabled =
    currentPage >= totalPages;

}


/* =========================
   HELPERS
========================= */

function formatDate(value) {

  if (!value) {

    return {
      date: "—",
      time: ""
    };

  }


  const d =
    new Date(value);


  return {

    date:
      d.toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      ),

    time:
      d.toLocaleTimeString(
        "en-GB",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      )

  };

}


function formatFullDate(value) {

  if (!value) {
    return "—";
  }

  return new Date(value)
    .toLocaleString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }
    );

}


function shortId(id) {

  if (!id || id === "—") {
    return "—";
  }

  if (id.length <= 16) {
    return id;
  }

  return (
    id.substring(0, 8) +
    "..." +
    id.substring(id.length - 6)
  );

}


function prettyJSON(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "{}";
  }

  try {

    return JSON.stringify(
      value,
      null,
      2
    );

  } catch {

    return String(value);

  }

}


function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================
   UI
========================= */

function showLoading(show) {

  document.getElementById(
    "loading"
  ).style.display =
    show
      ? "block"
      : "none";

}


function showError(message) {

  const box =
    document.getElementById(
      "errorBox"
    );

  box.textContent =
    message;

  box.style.display =
    "block";

}
