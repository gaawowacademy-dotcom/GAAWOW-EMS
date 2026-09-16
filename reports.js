// ============================================================
// GAAWOW EMS — REPORTS CENTER
// Complete reports.js
// ============================================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

// ============================================================
// GLOBAL VARIABLES
// ============================================================

let currentUser = null;
let currentProfile = null;
let institutions = [];
let currentReportTitle = "";
let currentReportData = [];


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await checkAuthentication();
    await loadInstitutions();
    await loadSummary();

    setupEvents();

  } catch (error) {
    console.error(error);
    showError(
      "System Error",
      error.message || "Something went wrong."
    );
  }
});


// ============================================================
// AUTHENTICATION
// ============================================================

async function checkAuthentication() {

  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session) {
    window.location.href = "index.html";
    return;
  }

  currentUser = session.user;

  // Load profile
  const {
    data: profile,
    error: profileError
  } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    alert("Profile not found.");
    window.location.href = "dashboard.html";
    return;
  }

  currentProfile = profile;

  // Only Super Admin can access Reports
  if (profile.role !== "super_admin") {
    alert("Access denied. Super Admin only.");
    window.location.href = "dashboard.html";
    return;
  }

  if (profile.is_active === false) {
    alert("Your account is inactive.");
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  }
}


// ============================================================
// LOAD INSTITUTIONS
// ============================================================

async function loadInstitutions() {

  const {
    data,
    error
  } = await supabaseClient
    .from("institutions")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Institutions:", error);
    return;
  }

  institutions = data || [];

  const select =
    document.getElementById("institutionFilter");

  if (!select) return;

  select.innerHTML =
    `<option value="">All Institutions</option>`;

  institutions.forEach(inst => {

    const option =
      document.createElement("option");

    option.value = inst.id;
    option.textContent =
      inst.name || inst.code || inst.id;

    select.appendChild(option);
  });
}


// ============================================================
// SUMMARY CARDS
// ============================================================

async function loadSummary() {

  await Promise.all([
    loadCount(
      "students",
      "studentCount"
    ),

    loadTeacherCount(),

    loadCount(
      "certificates",
      "certificateCount"
    ),

    loadCount(
      "institutions",
      "institutionCount"
    )
  ]);
}


async function loadCount(
  table,
  elementId
) {

  const {
    count,
    error
  } = await supabaseClient
    .from(table)
    .select("*", {
      count: "exact",
      head: true
    });

  if (error) {

    console.error(
      `${table} count error:`,
      error
    );

    setText(elementId, "0");
    return;
  }

  setText(
    elementId,
    count ?? 0
  );
}


async function loadTeacherCount() {

  const {
    count,
    error
  } = await supabaseClient
    .from("profiles")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("role", "teacher");

  if (error) {

    console.error(
      "Teacher count error:",
      error
    );

    setText(
      "teacherCount",
      "0"
    );

    return;
  }

  setText(
    "teacherCount",
    count ?? 0
  );
}


// ============================================================
// EVENTS
// ============================================================

function setupEvents() {

  const search =
    document.getElementById("searchInput");

  if (search) {

    search.addEventListener(
      "input",
      () => {

        if (currentReportData.length > 0) {
          filterCurrentReport();
        }
      }
    );
  }


  const year =
    document.getElementById("yearFilter");

  if (year) {

    year.addEventListener(
      "change",
      () => {

        if (currentReportData.length > 0) {
          filterCurrentReport();
        }
      }
    );
  }


  const institution =
    document.getElementById(
      "institutionFilter"
    );

  if (institution) {

    institution.addEventListener(
      "change",
      () => {

        if (currentReportData.length > 0) {
          filterCurrentReport();
        }
      }
    );
  }
}


// ============================================================
// REPORT SELECTOR
// ============================================================

function openReport(reportName) {

  switch (reportName) {

    case "academic":
      academicReport();
      break;

    case "students":
      studentsReport();
      break;

    case "teachers":
      teachersReport();
      break;

    case "attendance":
      attendanceReport();
      break;

    case "grades":
      gradesReport();
      break;

    case "certificates":
      certificatesReport();
      break;

    case "financial":
      financialReport();
      break;

    case "institutions":
      institutionsReport();
      break;

    case "system":
      systemReport();
      break;

    default:
      console.warn(
        "Unknown report:",
        reportName
      );
  }
}


// ============================================================
// ACADEMIC REPORT
// FIXED: No attendance column
// ============================================================

async function academicReport() {

  showLoading(
    "Loading Academic Report..."
  );

  const {
    data,
    error
  } = await supabaseClient
    .from("academic_progress")
    .select("*")
    .limit(500);

  if (error) {

    showError(
      "Academic Report",
      error.message
    );

    return;
  }

  renderReportTable(
    "Academic Progress Report",
    data || []
  );
}


// ============================================================
// STUDENTS REPORT
// ============================================================

async function studentsReport() {

  showLoading(
    "Loading Students Report..."
  );

  const {
    data,
    error
  } = await supabaseClient
    .from("students")
    .select("*")
    .limit(500);

  if (error) {

    showError(
      "Students Report",
      error.message
    );

    return;
  }

  renderReportTable(
    "Students Report",
    data || []
  );
}


// ============================================================
// TEACHERS REPORT
// FIXED: No profiles.email
// ============================================================

async function teachersReport() {

  showLoading(
    "Loading Teachers Report..."
  );

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("role", "teacher")
    .limit(500);

  if (error) {

    showError(
      "Teachers Report",
      error.message
    );

    return;
  }

  renderReportTable(
    "Teachers Report",
    data || []
  );
}


// ============================================================
// ATTENDANCE REPORT
// FIXED: No attendance.created_at
// ============================================================

async function attendanceReport() {

  showLoading(
    "Loading Attendance Report..."
  );

  const {
    data,
    error
  } = await supabaseClient
    .from("attendance")
    .select("*")
    .limit(500);

  if (error) {

    showError(
      "Attendance Report",
      error.message
    );

    return;
  }

  renderReportTable(
    "Attendance Report",
    data || []
  );
}


// ============================================================
// GRADES / EXAMS REPORT
// ============================================================

async function gradesReport() {

  showLoading(
    "Loading Exams & Grades Report..."
  );

  const {
    data,
    error
  } = await supabaseClient
    .from("grades")
    .select("*")
    .limit(500);

  if (error) {

    showError(
      "Grades Report",
      error.message
    );

    return;
  }

  renderReportTable(
    "Exams & Grades Report",
    data || []
  );
}


// ============================================================
// CERTIFICATES REPORT
// ============================================================

async function certificatesReport() {

  showLoading(
    "Loading Certificates Report..."
  );

  const {
    data,
    error
  } = await supabaseClient
    .from("certificates")
    .select("*")
    .limit(500);

  if (error) {

    showError(
      "Certificates Report",
      error.message
    );

    return;
  }

  renderReportTable(
    "Certificates Report",
    data || []
  );
}


// ============================================================
// FINANCIAL REPORT
// ============================================================

async function financialReport() {

  showLoading(
    "Loading Financial Report..."
  );

  const {
    data,
    error
  } = await supabaseClient
    .from("payments")
    .select("*")
    .limit(500);

  if (error) {

    showError(
      "Financial Report",
      error.message
    );

    return;
  }

  renderReportTable(
    "Financial Report",
    data || []
  );
}


// ============================================================
// INSTITUTIONS REPORT
// ============================================================

async function institutionsReport() {

  showLoading(
    "Loading Institutions Report..."
  );

  const {
    data,
    error
  } = await supabaseClient
    .from("institutions")
    .select("*")
    .limit(500);

  if (error) {

    showError(
      "Institutions Report",
      error.message
    );

    return;
  }

  renderReportTable(
    "Institutions Report",
    data || []
  );
}


// ============================================================
// SYSTEM / AUDIT REPORT
// ============================================================

async function systemReport() {

  showLoading(
    "Loading System Report..."
  );

  const {
    data,
    error
  } = await supabaseClient
    .from("audit_logs")
    .select("*")
    .order(
      "created_at",
      { ascending: false }
    )
    .limit(500);

  if (error) {

    showError(
      "System Report",
      error.message
    );

    return;
  }

  renderReportTable(
    "System Audit Report",
    data || []
  );
}


// ============================================================
// RENDER REPORT
// ============================================================

function renderReportTable(
  title,
  data
) {

  currentReportTitle = title;
  currentReportData = data || [];

  const result =
    document.getElementById(
      "reportResult"
    );

  if (!result) return;

  if (!data || data.length === 0) {

    result.innerHTML = `
      <div class="empty-report">
        <div style="font-size:42px;">📊</div>

        <h3>No Data Found</h3>

        <p>
          There are no records available
          for this report.
        </p>
      </div>
    `;

    return;
  }

  const filtered =
    applyFilters(data);

  result.innerHTML = buildTable(
    title,
    filtered
  );

  result.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


// ============================================================
// FILTER REPORT
// ============================================================

function filterCurrentReport() {

  if (!currentReportData) return;

  const filtered =
    applyFilters(
      currentReportData
    );

  const result =
    document.getElementById(
      "reportResult"
    );

  if (!result) return;

  result.innerHTML =
    buildTable(
      currentReportTitle,
      filtered
    );
}


function applyFilters(data) {

  let result =
    [...data];

  // Search
  const search =
    (
      document.getElementById(
        "searchInput"
      )?.value || ""
    )
      .trim()
      .toLowerCase();

  if (search) {

    result =
      result.filter(row => {

        return Object.values(row)
          .some(value =>
            String(
              value ?? ""
            )
              .toLowerCase()
              .includes(search)
          );
      });
  }


  // Institution filter
  const institutionId =
    document.getElementById(
      "institutionFilter"
    )?.value || "";

  if (
    institutionId &&
    result.length
  ) {

    result =
      result.filter(row => {

        return (
          row.institution_id ===
          institutionId
        );
      });
  }


  // Year filter
  const year =
    document.getElementById(
      "yearFilter"
    )?.value || "";

  if (year) {

    result =
      result.filter(row => {

        const values =
          Object.values(row);

        return values.some(value => {

          if (!value) return false;

          const text =
            String(value);

          return (
            text.includes(year)
          );
        });
      });
  }

  return result;
}


// ============================================================
// BUILD TABLE
// ============================================================

function buildTable(
  title,
  data
) {

  if (!data.length) {

    return `
      <div class="empty-report">
        <div style="font-size:42px;">🔎</div>

        <h3>No Matching Records</h3>

        <p>
          Try changing the search or filters.
        </p>
      </div>
    `;
  }


  const columns =
    getColumns(data);


  let html = `

    <div class="report-header">

      <div>
        <h2>${escapeHTML(title)}</h2>

        <p>
          ${data.length} record(s)
        </p>
      </div>

      <button
        class="print-btn"
        onclick="printReport()"
      >
        🖨️ Print
      </button>

    </div>

    <div class="table-wrapper">

      <table class="report-table">

        <thead>
          <tr>
  `;


  columns.forEach(column => {

    html += `
      <th>
        ${escapeHTML(
          formatColumnName(column)
        )}
      </th>
    `;
  });


  html += `
          </tr>
        </thead>

        <tbody>
  `;


  data.forEach(row => {

    html += "<tr>";

    columns.forEach(column => {

      html += `
        <td>
          ${formatCell(
            row[column],
            column
          )}
        </td>
      `;
    });

    html += "</tr>";
  });


  html += `

        </tbody>

      </table>

    </div>
  `;


  return html;
}


// ============================================================
// DETERMINE TABLE COLUMNS
// ============================================================

function getColumns(data) {

  const set =
    new Set();

  data.forEach(row => {

    Object.keys(row)
      .forEach(key =>
        set.add(key)
      );
  });


  return Array.from(set);
}


// ============================================================
// FORMAT COLUMN NAME
// ============================================================

function formatColumnName(
  column
) {

  return column
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      char =>
        char.toUpperCase()
    );
}


// ============================================================
// FORMAT CELL
// ============================================================

function formatCell(
  value,
  column
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return `
      <span class="muted">
        —
      </span>
    `;
  }


  // Boolean
  if (
    typeof value ===
    "boolean"
  ) {

    return value
      ? `<span class="badge success">Yes</span>`
      : `<span class="badge danger">No</span>`;
  }


  // JSON / Object
  if (
    typeof value ===
      "object"
  ) {

    return `
      <pre class="json-cell">${
        escapeHTML(
          JSON.stringify(
            value,
            null,
            2
          )
        )
      }</pre>
    `;
  }


  const text =
    String(value);


  // Status
  if (
    column
      .toLowerCase()
      .includes("status")
  ) {

    const status =
      text.toLowerCase();

    let className =
      "info";

    if (
      [
        "active",
        "valid",
        "paid",
        "completed",
        "success"
      ].includes(status)
    ) {

      className =
        "success";
    }

    if (
      [
        "inactive",
        "invalid",
        "failed",
        "cancelled",
        "suspended"
      ].includes(status)
    ) {

      className =
        "danger";
    }

    return `
      <span class="badge ${className}">
        ${escapeHTML(text)}
      </span>
    `;
  }


  // Long text
  if (text.length > 120) {

    return `
      <span
        title="${escapeHTML(text)}"
      >
        ${escapeHTML(
          text.substring(
            0,
            120
          )
        )}...
      </span>
    `;
  }


  return escapeHTML(text);
}


// ============================================================
// PRINT REPORT
// ============================================================

function printReport() {

  if (
    !currentReportData ||
    currentReportData.length === 0
  ) {

    alert(
      "There is no report to print."
    );

    return;
  }


  const filtered =
    applyFilters(
      currentReportData
    );


  const table =
    buildTable(
      currentReportTitle,
      filtered
    );


  const logo =
    "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";


  const printWindow =
    window.open(
      "",
      "_blank"
    );


  if (!printWindow) {

    alert(
      "Please allow pop-ups to print the report."
    );

    return;
  }


  printWindow.document.write(`

    <!DOCTYPE html>

    <html>

    <head>

      <meta charset="UTF-8">

      <title>
        ${escapeHTML(
          currentReportTitle
        )} — GAAWOW EMS
      </title>

      <style>

        body {
          font-family:
            Arial,
            sans-serif;

          margin: 30px;

          color: #1F2937;
        }

        .print-brand {
          text-align: center;

          margin-bottom: 25px;
        }

        .print-brand img {
          width: 90px;

          height: 90px;

          object-fit: contain;
        }

        .print-brand h1 {
          margin: 8px 0 3px;

          color: #0B1E63;
        }

        .print-brand p {
          margin: 0;

          color: #555;
        }

        .report-header {
          display: flex;

          justify-content:
            space-between;

          align-items: center;

          border-bottom:
            2px solid #D4AF37;

          padding-bottom: 10px;

          margin-bottom: 15px;
        }

        .report-header h2 {
          color: #0B4DA2;
        }

        .print-btn {
          display: none;
        }

        .table-wrapper {
          overflow: visible;
        }

        table {
          width: 100%;

          border-collapse:
            collapse;

          font-size: 10px;
        }

        th {
          background:
            #0B1E63;

          color: white;

          padding: 8px;

          border: 1px solid #ddd;

          text-align: left;
        }

        td {
          padding: 7px;

          border: 1px solid #ddd;

          vertical-align: top;
        }

        tr:nth-child(even) {
          background:
            #f7f7f7;
        }

        .badge {
          padding:
            3px 7px;

          border-radius:
            10px;
        }

        .json-cell {
          white-space:
            pre-wrap;
        }

        .muted {
          color: #999;
        }

        @page {
          size: landscape;

          margin: 12mm;
        }

      </style>

    </head>

    <body>

      <div class="print-brand">

        <img
          src="${logo}"
          alt="GAAWOW Academy"
        >

        <h1>
          GAAWOW EMS
        </h1>

        <p>
          Ilayska Aqoonta iyo Xirfadda
        </p>

        <p>
          Bur Hakaba Bay, Somalia
        </p>

      </div>

      ${table}

    </body>

    </html>

  `);


  printWindow.document.close();

  setTimeout(() => {

    printWindow.focus();

    printWindow.print();

  }, 500);
}


// ============================================================
// REFRESH
// ============================================================

async function refreshReports() {

  const button =
    document.getElementById(
      "refreshBtn"
    );

  if (button) {

    button.disabled = true;

    button.innerHTML =
      "⏳ Refreshing...";
  }


  try {

    await loadInstitutions();
    await loadSummary();

    currentReportData = [];

    const result =
      document.getElementById(
        "reportResult"
      );

    if (result) {

      result.innerHTML = `
        <div class="empty-report">
          <div style="font-size:42px;">
            📊
          </div>

          <h3>
            Reports Center
          </h3>

          <p>
            Select a report above to view data.
          </p>
        </div>
      `;
    }

  } catch (error) {

    console.error(error);

    showError(
      "Refresh Error",
      error.message
    );

  } finally {

    if (button) {

      button.disabled = false;

      button.innerHTML =
        "🔄 Refresh";
    }
  }
}


// ============================================================
// LOADING
// ============================================================

function showLoading(
  message
) {

  const result =
    document.getElementById(
      "reportResult"
    );

  if (!result) return;

  result.innerHTML = `

    <div class="empty-report">

      <div
        style="
          font-size:42px;
          animation:
            spin 1s linear infinite;
        "
      >
        ⏳
      </div>

      <h3>
        ${escapeHTML(message)}
      </h3>

      <p>
        Please wait...
      </p>

    </div>

  `;
}


// ============================================================
// ERROR
// ============================================================

function showError(
  title,
  message
) {

  const result =
    document.getElementById(
      "reportResult"
    );

  if (!result) {

    alert(
      `${title}: ${message}`
    );

    return;
  }


  result.innerHTML = `

    <div class="empty-report error-report">

      <div style="font-size:42px;">
        ⚠️
      </div>

      <h3>
        ${escapeHTML(title)}
      </h3>

      <p>
        ${escapeHTML(message)}
      </p>

      <button
        onclick="refreshReports()"
        class="print-btn"
      >
        🔄 Try Again
      </button>

    </div>

  `;
}


// ============================================================
// HELPER — SET TEXT
// ============================================================

function setText(
  elementId,
  value
) {

  const element =
    document.getElementById(
      elementId
    );

  if (element) {

    element.textContent =
      value;
  }
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(
  value
) {

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


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

  try {

    await supabaseClient.auth.signOut();

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

  } finally {

    sessionStorage.clear();

    localStorage.removeItem(
      "supabase.auth.token"
    );

    window.location.href =
      "index.html";
  }
}


// ============================================================
// DASHBOARD
// ============================================================

function goDashboard() {

  window.location.href =
    "dashboard.html";
}


// ============================================================
// GLOBAL FUNCTIONS
// ============================================================

window.openReport =
  openReport;

window.academicReport =
  academicReport;

window.studentsReport =
  studentsReport;

window.teachersReport =
  teachersReport;

window.attendanceReport =
  attendanceReport;

window.gradesReport =
  gradesReport;

window.certificatesReport =
  certificatesReport;

window.financialReport =
  financialReport;

window.institutionsReport =
  institutionsReport;

window.systemReport =
  systemReport;

window.printReport =
  printReport;

window.refreshReports =
  refreshReports;

window.logout =
  logout;

window.goDashboard =
  goDashboard;


// ============================================================
// END
// ============================================================
