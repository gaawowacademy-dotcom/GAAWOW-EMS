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


/* ELEMENTS */

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


/* DASHBOARD */

function goDashboard() {

  window.location.href =
    "dashboard.html";
}


/* SUPER ADMIN */

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

    await supabaseClient
      .auth
      .signOut();

    window.location.href =
      "index.html";

    return false;
  }


  return true;
}


/* LOAD MODULE FILTER */

async function loadModuleFilter() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("audit_logs")
      .select("module");


  if (error) {

    console.error(
      "Module filter:",
      error
    );

    return;
  }


  const modules = [
    ...new Set(
      (data || [])
        .map(row => row.module)
        .filter(Boolean)
    )
  ].sort();


  modules.forEach(module => {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      module;

    option.textContent =
      module;

    moduleFilter.appendChild(
      option
    );

  });
}


/* SUMMARY */

async function loadSummary() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("audit_logs")
      .select("action");


  if (error) {

    console.error(
      "Summary error:",
      error
    );

    return;
  }


  const rows =
    data || [];


  const insert =
    rows.filter(
      x => x.action === "INSERT"
    ).length;


  const update =
    rows.filter(
      x => x.action === "UPDATE"
    ).length;


  const deleteCount =
    rows.filter(
      x => x.action === "DELETE"
    ).length;


  document.getElementById(
    "totalCount"
  ).textContent =
    rows.length;


  document.getElementById(
    "insertCount"
  ).textContent =
    insert;


  document.getElementById(
    "updateCount"
  ).textContent =
    update;


  document.getElementById(
    "deleteCount"
  ).textContent =
    deleteCount;
}


/* LOAD LOGS */

async function loadLogs() {

  logsBody.innerHTML = `
    <tr>
      <td colspan="8" class="loading">
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


    if (action) {

      query =
        query.eq(
          "action",
          action
        );
    }


    if (module) {

      query =
        query.eq(
          "module",
          module
        );
    }


    if (date) {

      query =
        query
          .gte(
            "created_at",
            `${date}T00:00:00`
          )
          .lt(
            "created_at",
            `${date}T23:59:59`
          );
    }


    if (search) {

      query =
        query.or(
          `action.ilike.%${search}%,module.ilike.%${search}%,description.ilike.%${search}%,user_id.eq.${search}`
        );
    }


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
      error
    );


    logsBody.innerHTML = `
      <tr>
        <td
          colspan="8"
          class="error"
        >
          Failed to load audit logs.
          <br>
          ${escapeHtml(
            error.message
          )}
        </td>
      </tr>
    `;

  }
}


/* RENDER */

function renderLogs(logs) {

  if (!logs.length) {

    logsBody.innerHTML = `
      <tr>
        <td
          colspan="8"
          class="empty"
        >
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


      const action =
        String(
          log.action || ""
        ).toUpperCase();


      let badgeClass =
        "badge";


      if (
        action === "INSERT"
      ) {

        badgeClass +=
          " insert";

      } else if (
        action === "UPDATE"
      ) {

        badgeClass +=
          " update";

      } else if (
        action === "DELETE"
      ) {

        badgeClass +=
          " delete";
      }


      return `
        <tr>

          <td class="date">
            ${escapeHtml(date)}
          </td>


          <td>
            <div class="user-name">
              ${escapeHtml(
                log.user_id ||
                "System"
              )}
            </div>
          </td>


          <td>
            <div class="institution">
              ${escapeHtml(
                log.institution_id ||
                "Global"
              )}
            </div>
          </td>


          <td>
            <span class="${badgeClass}">
              ${escapeHtml(
                action || "—"
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


          <td>

            <button
              class="view-btn"
              onclick='viewDetails(${JSON.stringify(log)})'
            >
              View
            </button>

          </td>

        </tr>
      `;

    }).join("");
}


/* DETAILS */

function viewDetails(log) {

  const modal =
    document.getElementById(
      "detailsModal"
    );

  const content =
    document.getElementById(
      "modalContent"
    );


  const date =
    log.created_at
      ? new Date(
          log.created_at
        ).toLocaleString()
      : "—";


  const oldData =
    log.old_data
      ? JSON.stringify(
          log.old_data,
          null,
          2
        )
      : "No previous data";


  const newData =
    log.new_data
      ? JSON.stringify(
          log.new_data,
          null,
          2
        )
      : "No new data";


  content.innerHTML = `

    <div class="info-grid">

      <div class="info-item">
        <small>Date & Time</small>
        <strong>
          ${escapeHtml(date)}
        </strong>
      </div>


      <div class="info-item">
        <small>Action</small>
        <strong>
          ${escapeHtml(
            log.action ||
            "—"
          )}
        </strong>
      </div>


      <div class="info-item">
        <small>Module</small>
        <strong>
          ${escapeHtml(
            log.module ||
            "—"
          )}
        </strong>
      </div>


      <div class="info-item">
        <small>User ID</small>
        <strong>
          ${escapeHtml(
            log.user_id ||
            "System"
          )}
        </strong>
      </div>


      <div class="info-item">
        <small>Institution ID</small>
        <strong>
          ${escapeHtml(
            log.institution_id ||
            "Global"
          )}
        </strong>
      </div>


      <div class="info-item">
        <small>Record ID</small>
        <strong>
          ${escapeHtml(
            log.record_id ||
            "—"
          )}
        </strong>
      </div>


      <div class="info-item">
        <small>IP Address</small>
        <strong>
          ${escapeHtml(
            log.ip_address ||
            "Not recorded"
          )}
        </strong>
      </div>


      <div class="info-item">
        <small>User Agent</small>
        <strong>
          ${escapeHtml(
            log.user_agent ||
            "Not recorded"
          )}
        </strong>
      </div>

    </div>


    <div class="info-item">
      <small>Description</small>
      <strong>
        ${escapeHtml(
          log.description ||
          "—"
        )}
      </strong>
    </div>


    <h4 class="data-title">
      Old Data
    </h4>

    <pre>${escapeHtml(
      oldData
    )}</pre>


    <h4 class="data-title">
      New Data
    </h4>

    <pre>${escapeHtml(
      newData
    )}</pre>

  `;


  modal.style.display =
    "block";
}


/* CLOSE MODAL */

function closeModal(event) {

  if (
    event &&
    event.target &&
    event.target.id !==
      "detailsModal"
  ) {
    return;
  }


  document.getElementById(
    "detailsModal"
  ).style.display =
    "none";
}


/* PAGINATION */

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
    currentPage > 1
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


/* SEARCH */

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


/* SECURITY */

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


/* START */

async function startAuditLogs() {

  const allowed =
    await checkSuperAdmin();


  if (!allowed) {
    return;
  }


  await loadModuleFilter();

  await loadSummary();

  await loadLogs();
}


startAuditLogs();
