const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


const PAGE_SIZE = 15;

let currentPage = 1;
let totalLogs = 0;


const searchInput =
  document.getElementById("searchInput");

const actionFilter =
  document.getElementById("actionFilter");

const moduleFilter =
  document.getElementById("moduleFilter");

const dateFilter =
  document.getElementById("dateFilter");

const logsBody =
  document.getElementById("logsBody");


/* =========================
   DASHBOARD
========================= */

function goDashboard() {

  window.location.href =
    "dashboard.html";
}


/* =========================
   SUPER ADMIN CHECK
========================= */

async function checkSuperAdmin() {

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();


  if (
    error ||
    !data.session
  ) {

    window.location.href =
      "index.html";

    return false;
  }


  const user =
    data.session.user;


  const {
    data: profile,
    error: profileError
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "full_name, role, institution_id, is_active"
      )
      .eq(
        "id",
        user.id
      )
      .single();


  if (
    profileError ||
    !profile
  ) {

    console.error(
      "Profile error:",
      profileError
    );

    alert(
      "Unable to load your profile."
    );

    return false;
  }


  if (
    profile.role !==
    "super_admin"
  ) {

    alert(
      "Access denied. Super Admin only."
    );

    window.location.href =
      "dashboard.html";

    return false;
  }


  if (
    profile.is_active === false
  ) {

    alert(
      "Your account is inactive."
    );

    await supabaseClient
      .auth
      .signOut();

    window.location.href =
      "index.html";

    return false;
  }


  return true;
}


/* =========================
   LOAD FILTER OPTIONS
========================= */

async function loadFilters() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("audit_logs")
        .select(
          "action, module"
        );


    if (error) {
      throw error;
    }


    const actions = [
      ...new Set(
        (data || [])
          .map(row => row.action)
          .filter(Boolean)
      )
    ].sort();


    const modules = [
      ...new Set(
        (data || [])
          .map(row => row.module)
          .filter(Boolean)
      )
    ].sort();


    actionFilter.innerHTML =
      `<option value="">All Actions</option>`;


    actions.forEach(action => {

      const option =
        document.createElement("option");

      option.value =
        action;

      option.textContent =
        action;

      actionFilter.appendChild(
        option
      );

    });


    moduleFilter.innerHTML =
      `<option value="">All Modules</option>`;


    modules.forEach(module => {

      const option =
        document.createElement("option");

      option.value =
        module;

      option.textContent =
        module;

      moduleFilter.appendChild(
        option
      );

    });

  } catch (error) {

    console.error(
      "Filter error:",
      error
    );

  }
}


/* =========================
   LOAD AUDIT LOGS
========================= */

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
      supabaseClient
        .from("audit_logs")
        .select(
          "*",
          {
            count: "exact"
          }
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    const search =
      searchInput.value.trim();

    const action =
      actionFilter.value;

    const module =
      moduleFilter.value;

    const date =
      dateFilter.value;


    /* ACTION */

    if (action) {

      query =
        query.eq(
          "action",
          action
        );
    }


    /* MODULE */

    if (module) {

      query =
        query.eq(
          "module",
          module
        );
    }


    /* DATE */

    if (date) {

      const start =
        `${date}T00:00:00`;

      const end =
        `${date}T23:59:59`;


      query =
        query
          .gte(
            "created_at",
            start
          )
          .lte(
            "created_at",
            end
          );
    }


    /* SEARCH */

    if (search) {

      query =
        query.or(
          `action.ilike.%${search}%,module.ilike.%${search}%,description.ilike.%${search}%`
        );
    }


    /* PAGINATION */

    const from =
      (currentPage - 1) *
      PAGE_SIZE;

    const to =
      from +
      PAGE_SIZE -
      1;


    query =
      query.range(
        from,
        to
      );


    const {
      data,
      error,
      count
    } =
      await query;


    if (error) {
      throw error;
    }


    totalLogs =
      count || 0;


    renderLogs(
      data || []
    );


    updatePagination();

  } catch (error) {

    console.error(
      "Audit Logs error:",
      error
    );


    logsBody.innerHTML = `
      <tr>
        <td colspan="6" class="error">
          Failed to load audit logs.
          <br>
          ${escapeHtml(
            error.message ||
            "Unknown error"
          )}
        </td>
      </tr>
    `;

  }
}


/* =========================
   RENDER LOGS
========================= */

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


  logsBody.innerHTML =
    logs.map(log => {

      const date =
        log.created_at
          ? new Date(
              log.created_at
            ).toLocaleString()
          : "—";


      return `
        <tr>

          <td class="date">
            ${escapeHtml(date)}
          </td>

          <td class="record-id">
            ${escapeHtml(
              log.user_id ||
              "System"
            )}
          </td>

          <td>
            <span class="action">
              ${escapeHtml(
                log.action ||
                "—"
              )}
            </span>
          </td>

          <td class="module">
            ${escapeHtml(
              log.module ||
              "—"
            )}
          </td>

          <td class="record-id">
            ${escapeHtml(
              log.record_id ||
              "—"
            )}
          </td>

          <td class="details">
            ${escapeHtml(
              log.description ||
              "—"
            )}
          </td>

        </tr>
      `;

    }).join("");
}


/* =========================
   PAGINATION
========================= */

function updatePagination() {

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalLogs /
        PAGE_SIZE
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


function previousPage() {

  if (
    currentPage >
    1
  ) {

    currentPage--;

    loadLogs();
  }
}


function nextPage() {

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalLogs /
        PAGE_SIZE
      )
    );


  if (
    currentPage <
    totalPages
  ) {

    currentPage++;

    loadLogs();
  }
}


/* =========================
   HTML SECURITY
========================= */

function escapeHtml(value) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


/* =========================
   SEARCH
========================= */

let searchTimer;

searchInput.addEventListener(
  "input",
  () => {

    clearTimeout(
      searchTimer
    );


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


/* =========================
   START
========================= */

async function startAuditLogs() {

  const allowed =
    await checkSuperAdmin();


  if (!allowed) {
    return;
  }


  await loadFilters();

  await loadLogs();
}


startAuditLogs();
