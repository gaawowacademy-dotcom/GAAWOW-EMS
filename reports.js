// ============================================================
// GAAWOW EMS — REPORTS CENTER
// COMPLETE FIXED VERSION
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

let currentReport = "";
let currentReportTitle = "";
let currentData = [];


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    try {

      await checkAuthentication();

      await loadInstitutions();

      await loadDashboardStats();

      setupFilters();

    } catch (error) {

      console.error(
        "INITIALIZATION ERROR:",
        error
      );

      showAlert(
        "System Error: " +
        error.message,
        "error"
      );
    }
  }
);


// ============================================================
// AUTHENTICATION
// ============================================================

async function checkAuthentication() {

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();

  if (error) {
    throw error;
  }

  const session =
    data.session;

  if (!session) {

    window.location.href =
      "index.html";

    return;
  }

  currentUser =
    session.user;


  // Get profile
  const {
    data: profile,
    error: profileError
  } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();


  if (profileError) {

    throw profileError;
  }


  if (!profile) {

    showAlert(
      "Profile not found.",
      "error"
    );

    setTimeout(
      () => {
        window.location.href =
          "dashboard.html";
      },
      1500
    );

    return;
  }


  currentProfile =
    profile;


  // Super Admin only
  if (
    profile.role !==
    "super_admin"
  ) {

    showAlert(
      "Access denied. Super Admin only.",
      "error"
    );

    setTimeout(
      () => {
        window.location.href =
          "dashboard.html";
      },
      1500
    );

    return;
  }


  // Active check
  if (
    profile.is_active ===
    false
  ) {

    await supabaseClient.auth.signOut();

    window.location.href =
      "index.html";
  }
}


// ============================================================
// LOAD INSTITUTIONS
// ============================================================

async function loadInstitutions() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("institutions")
      .select("*")
      .order(
        "name",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "INSTITUTION ERROR:",
      error
    );

    showAlert(
      "Institution loading failed: " +
      error.message,
      "error"
    );

    return;
  }


  institutions =
    data || [];


  const select =
    document.getElementById(
      "institutionFilter"
    );


  if (!select) return;


  select.innerHTML =
    `
      <option value="">
        All Institutions
      </option>
    `;


  institutions.forEach(
    institution => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        institution.id;

      option.textContent =
        institution.name ||
        institution.code ||
        "Institution";

      select.appendChild(
        option
      );
    }
  );
}


// ============================================================
// DASHBOARD STATISTICS
// ============================================================

async function loadDashboardStats() {

  await Promise.all([
    getCount(
      "students",
      "studentsCount"
    ),

    getTeacherCount(),

    getCount(
      "certificates",
      "certificatesCount"
    ),

    getCount(
      "institutions",
      "institutionsCount"
    )
  ]);
}


// ============================================================
// GENERIC COUNT
// ============================================================

async function getCount(
  table,
  elementId
) {

  const {
    count,
    error
  } =
    await supabaseClient
      .from(table)
      .select(
        "*",
        {
          count: "exact",
          head: true
        }
      );


  if (error) {

    console.error(
      table +
      " COUNT ERROR:",
      error
    );

    setElement(
      elementId,
      "0"
    );

    return;
  }


  setElement(
    elementId,
    count ?? 0
  );
}


// ============================================================
// TEACHER COUNT
// ============================================================

async function getTeacherCount() {

  const {
    count,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "*",
        {
          count: "exact",
          head: true
        }
      )
      .eq(
        "role",
        "teacher"
      );


  if (error) {

    console.error(
      "TEACHER COUNT ERROR:",
      error
    );

    setElement(
      "teachersCount",
      "0"
    );

    return;
  }


  setElement(
    "teachersCount",
    count ?? 0
  );
}


// ============================================================
// IMPORTANT
// HTML CALLS runReport()
// ============================================================

async function runReport(
  reportName
) {

  currentReport =
    reportName;


  switch (
    reportName
  ) {

    case "academic":

      await academicReport();

      break;


    case "students":

      await studentsReport();

      break;


    case "teachers":

      await teachersReport();

      break;


    case "attendance":

      await attendanceReport();

      break;


    case "grades":

      await gradesReport();

      break;


    case "certificates":

      await certificatesReport();

      break;


    case "financial":

      await financialReport();

      break;


    case "institutions":

      await institutionsReport();

      break;


    case "system":

      await systemReport();

      break;


    default:

      showAlert(
        "Unknown report type.",
        "error"
      );
  }
}


// ============================================================
// ACADEMIC REPORT
// NO attendance COLUMN
// ============================================================

async function academicReport() {

  showResultLoading(
    "Loading Academic Report..."
  );


  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        "academic_progress"
      )
      .select("*")
      .limit(500);


  if (error) {

    showReportError(
      "Academic Report",
      error
    );

    return;
  }


  currentData =
    data || [];


  renderReport(
    "Academic Progress Report",
    currentData
  );
}


// ============================================================
// STUDENT REPORT
// ============================================================

async function studentsReport() {

  showResultLoading(
    "Loading Student Report..."
  );


  const {
    data,
    error
  } =
    await supabaseClient
      .from("students")
      .select("*")
      .limit(500);


  if (error) {

    showReportError(
      "Student Report",
      error
    );

    return;
  }


  currentData =
    data || [];


  renderReport(
    "Student Report",
    currentData
  );
}


// ============================================================
// TEACHER REPORT
// NO profiles.email
// ============================================================

async function teachersReport() {

  showResultLoading(
    "Loading Teacher Report..."
  );


  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq(
        "role",
        "teacher"
      )
      .limit(500);


  if (error) {

    showReportError(
      "Teacher Report",
      error
    );

    return;
  }


  currentData =
    data || [];


  renderReport(
    "Teacher Report",
    currentData
  );
}


// ============================================================
// ATTENDANCE REPORT
// NO created_at
// ============================================================

async function attendanceReport() {

  showResultLoading(
    "Loading Attendance Report..."
  );


  const {
    data,
    error
  } =
    await supabaseClient
      .from("attendance")
      .select("*")
      .limit(500);


  if (error) {

    showReportError(
      "Attendance Report",
      error
    );

    return;
  }


  currentData =
    data || [];


  renderReport(
    "Attendance Report",
    currentData
  );
}


// ============================================================
// GRADES REPORT
// ============================================================

async function gradesReport() {

  showResultLoading(
    "Loading Exams & Grades Report..."
  );


  const {
    data,
    error
  } =
    await supabaseClient
      .from("grades")
      .select("*")
      .limit(500);


  if (error) {

    showReportError(
      "Exams & Grades Report",
      error
    );

    return;
  }


  currentData =
    data || [];


  renderReport(
    "Exams & Grades Report",
    currentData
  );
}


// ============================================================
// CERTIFICATES REPORT
// ============================================================

async function certificatesReport() {

  showResultLoading(
    "Loading Certificates Report..."
  );


  const {
    data,
    error
  } =
    await supabaseClient
      .from("certificates")
      .select("*")
      .limit(500);


  if (error) {

    showReportError(
      "Certificates Report",
      error
    );

    return;
  }


  currentData =
    data || [];


  renderReport(
    "Certificates Report",
    currentData
  );
}


// ============================================================
// FINANCIAL REPORT
// ============================================================

async function financialReport() {

  showResultLoading(
    "Loading Financial Report..."
  );


  const {
    data,
    error
  } =
    await supabaseClient
      .from("payments")
      .select("*")
      .limit(500);


  if (error) {

    showReportError(
      "Financial Report",
      error
    );

    return;
  }


  currentData =
    data || [];


  renderReport(
    "Financial Report",
    currentData
  );
}


// ============================================================
// INSTITUTION REPORT
// ============================================================

async function institutionsReport() {

  showResultLoading(
    "Loading Institution Report..."
  );


  const {
    data,
    error
  } =
    await supabaseClient
      .from("institutions")
      .select("*")
      .limit(500);


  if (error) {

    showReportError(
      "Institution Report",
      error
    );

    return;
  }


  currentData =
    data || [];


  renderReport(
    "Institution Report",
    currentData
  );
}


// ============================================================
// SYSTEM REPORT
// ============================================================

async function systemReport() {

  showResultLoading(
    "Loading System Report..."
  );


  const {
    data,
    error
  } =
    await supabaseClient
      .from("audit_logs")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(500);


  if (error) {

    showReportError(
      "System Report",
      error
    );

    return;
  }


  currentData =
    data || [];


  renderReport(
    "System Audit Report",
    currentData
  );
}


// ============================================================
// RENDER REPORT
// ============================================================

function renderReport(
  title,
  data
) {

  currentReportTitle =
    title;


  const result =
    document.getElementById(
      "reportResult"
    );

  const content =
    document.getElementById(
      "resultContent"
    );

  const resultTitle =
    document.getElementById(
      "resultTitle"
    );


  if (!result || !content) {

    console.error(
      "Report result elements not found."
    );

    return;
  }


  // SHOW RESULT
  result.style.display =
    "block";


  if (resultTitle) {

    resultTitle.textContent =
      title;
  }


  if (
    !data ||
    data.length === 0
  ) {

    content.innerHTML = `

      <div class="empty">

        <div
          style="
            font-size:45px;
            margin-bottom:10px;
          "
        >
          📊
        </div>

        <strong>
          No records found
        </strong>

        <p>
          This report has no data.
        </p>

      </div>

    `;

    return;
  }


  const filtered =
    applyFilters(
      data
    );


  if (
    filtered.length === 0
  ) {

    content.innerHTML = `

      <div class="empty">

        <div
          style="
            font-size:40px;
          "
        >
          🔎
        </div>

        <strong>
          No matching records
        </strong>

        <p>
          Try changing the filters.
        </p>

      </div>

    `;

    return;
  }


  content.innerHTML =
    createTable(
      filtered
    );


  // Scroll to report
  setTimeout(
    () => {

      result.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    },
    100
  );
}


// ============================================================
// CREATE TABLE
// ============================================================

function createTable(
  data
) {

  const columns =
    collectColumns(
      data
    );


  let html = `

    <div class="table-wrap">

      <table>

        <thead>

          <tr>
  `;


  columns.forEach(
    column => {

      html += `
        <th>
          ${escapeHTML(
            formatColumn(
              column
            )
          )}
        </th>
      `;
    }
  );


  html += `

          </tr>

        </thead>

        <tbody>
  `;


  data.forEach(
    row => {

      html += "<tr>";


      columns.forEach(
        column => {

          html += `
            <td>
              ${formatValue(
                row[column],
                column
              )}
            </td>
          `;
        }
      );


      html += "</tr>";
    }
  );


  html += `

        </tbody>

      </table>

    </div>
  `;


  return html;
}


// ============================================================
// COLLECT COLUMNS
// ============================================================

function collectColumns(
  data
) {

  const columns =
    new Set();


  data.forEach(
    row => {

      Object.keys(row)
        .forEach(
          key =>
            columns.add(
              key
            )
        );
    }
  );


  return Array.from(
    columns
  );
}


// ============================================================
// FORMAT COLUMN
// ============================================================

function formatColumn(
  column
) {

  return column
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      letter =>
        letter.toUpperCase()
    );
}


// ============================================================
// FORMAT VALUE
// ============================================================

function formatValue(
  value,
  column
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return "—";
  }


  // Boolean
  if (
    typeof value ===
    "boolean"
  ) {

    return value
      ? `<span class="badge green">Yes</span>`
      : `<span class="badge red">No</span>`;
  }


  // Object / JSON
  if (
    typeof value ===
    "object"
  ) {

    return `
      <pre style="
        white-space:pre-wrap;
        font-size:11px;
        margin:0;
      ">
${escapeHTML(
  JSON.stringify(
    value,
    null,
    2
  )
)}
      </pre>
    `;
  }


  const text =
    String(value);


  // STATUS BADGES
  if (
    column
      .toLowerCase()
      .includes("status")
  ) {

    const status =
      text.toLowerCase();


    if (
      [
        "active",
        "valid",
        "paid",
        "completed"
      ].includes(
        status
      )
    ) {

      return `
        <span class="badge green">
          ${escapeHTML(text)}
        </span>
      `;
    }


    if (
      [
        "inactive",
        "invalid",
        "failed",
        "suspended",
        "cancelled"
      ].includes(
        status
      )
    ) {

      return `
        <span class="badge red">
          ${escapeHTML(text)}
        </span>
      `;
    }


    return `
      <span class="badge blue">
        ${escapeHTML(text)}
      </span>
    `;
  }


  return escapeHTML(
    text
  );
}


// ============================================================
// FILTERS
// ============================================================

function setupFilters() {

  const search =
    document.getElementById(
      "searchInput"
    );

  const year =
    document.getElementById(
      "yearFilter"
    );

  const institution =
    document.getElementById(
      "institutionFilter"
    );


  if (search) {

    search.addEventListener(
      "input",
      applyCurrentFilters
    );
  }


  if (year) {

    year.addEventListener(
      "change",
      applyCurrentFilters
    );
  }


  if (institution) {

    institution.addEventListener(
      "change",
      applyCurrentFilters
    );
  }
}


// ============================================================
// APPLY CURRENT FILTERS
// ============================================================

function applyCurrentFilters() {

  if (
    !currentData ||
    currentData.length === 0
  ) {

    return;
  }


  renderReport(
    currentReportTitle,
    currentData
  );
}


// ============================================================
// FILTER DATA
// ============================================================

function applyFilters(
  data
) {

  let result =
    [...data];


  // SEARCH
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
      result.filter(
        row => {

          return Object.values(
            row
          ).some(
            value =>
              String(
                value ?? ""
              )
                .toLowerCase()
                .includes(
                  search
                )
          );
        }
      );
  }


  // INSTITUTION
  const institutionId =
    document.getElementById(
      "institutionFilter"
    )?.value || "";


  if (institutionId) {

    result =
      result.filter(
        row =>
          String(
            row.institution_id ||
            ""
          ) ===
          institutionId
      );
  }


  // YEAR
  const year =
    document.getElementById(
      "yearFilter"
    )?.value || "";


  if (year) {

    result =
      result.filter(
        row => {

          return Object.values(
            row
          ).some(
            value => {

              if (
                value ===
                null ||
                value ===
                undefined
              ) {

                return false;
              }


              return String(
                value
              ).includes(
                year
              );
            }
          );
        }
      );
  }


  return result;
}


// ============================================================
// LOADING
// ============================================================

function showResultLoading(
  message
) {

  const result =
    document.getElementById(
      "reportResult"
    );

  const content =
    document.getElementById(
      "resultContent"
    );


  if (!result || !content)
    return;


  result.style.display =
    "block";


  content.innerHTML = `

    <div class="loading">

      ⏳ ${escapeHTML(
        message
      )}

    </div>

  `;


  result.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


// ============================================================
// REPORT ERROR
// ============================================================

function showReportError(
  title,
  error
) {

  console.error(
    title,
    error
  );


  const result =
    document.getElementById(
      "reportResult"
    );

  const content =
    document.getElementById(
      "resultContent"
    );

  const resultTitle =
    document.getElementById(
      "resultTitle"
    );


  if (!result || !content)
    return;


  result.style.display =
    "block";


  if (resultTitle) {

    resultTitle.textContent =
      title;
  }


  content.innerHTML = `

    <div
      class="empty"
      style="
        color:#991B1B;
        background:#FEF2F2;
      "
    >

      <div
        style="
          font-size:42px;
          margin-bottom:10px;
        "
      >
        ⚠️
      </div>

      <strong>
        ${escapeHTML(
          title
        )}
      </strong>

      <p>
        ${escapeHTML(
          error?.message ||
          "Unknown database error."
        )}
      </p>

    </div>

  `;
}


// ============================================================
// ALERT
// ============================================================

function showAlert(
  message,
  type = "success"
) {

  const box =
    document.getElementById(
      "alertBox"
    );


  if (!box) {

    console.log(
      message
    );

    return;
  }


  box.textContent =
    message;


  box.className =
    "alert show " +
    (
      type === "error"
        ? "error"
        : "success"
    );


  setTimeout(
    () => {

      box.classList.remove(
        "show"
      );

    },
    5000
  );
}


// ============================================================
// PRINT REPORT
// ============================================================

function printReport() {

  if (
    !currentData ||
    currentData.length === 0
  ) {

    alert(
      "No report data available."
    );

    return;
  }


  const filtered =
    applyFilters(
      currentData
    );


  if (
    filtered.length === 0
  ) {

    alert(
      "No records available to print."
    );

    return;
  }


  const table =
    createTable(
      filtered
    );


  const printWindow =
    window.open(
      "",
      "_blank"
    );


  if (!printWindow) {

    alert(
      "Please allow pop-ups to print."
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

        body{
          font-family:Arial,Helvetica,sans-serif;
          margin:25px;
          color:#1F2937;
        }

        .brand{
          text-align:center;
          margin-bottom:25px;
        }

        .brand img{
          width:85px;
          height:85px;
          object-fit:contain;
        }

        .brand h1{
          color:#0B1E63;
          margin:8px 0 3px;
        }

        .brand p{
          margin:3px;
          color:#64748B;
        }

        h2{
          color:#0B4DA2;
          border-bottom:2px solid #D4AF37;
          padding-bottom:8px;
        }

        table{
          width:100%;
          border-collapse:collapse;
          font-size:10px;
        }

        th{
          background:#0B1E63;
          color:white;
          padding:7px;
          border:1px solid #ddd;
          text-align:left;
        }

        td{
          padding:6px;
          border:1px solid #ddd;
          vertical-align:top;
        }

        tr:nth-child(even){
          background:#F8FAFC;
        }

        .badge{
          padding:3px 7px;
          border-radius:12px;
        }

        @page{
          size:landscape;
          margin:10mm;
        }

      </style>

    </head>

    <body>

      <div class="brand">

        <img
          src="https://i.ibb.co/4ZCRpm30/gaawow-logo.png"
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

      <h2>
        ${escapeHTML(
          currentReportTitle
        )}
      </h2>

      ${table}

    </body>

    </html>

  `);


  printWindow.document.close();


  setTimeout(
    () => {

      printWindow.focus();

      printWindow.print();

    },
    500
  );
}


// ============================================================
// NAVIGATION
// ============================================================

function goDashboard() {

  window.location.href =
    "dashboard.html";
}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

  try {

    await supabaseClient.auth.signOut();

  } catch (error) {

    console.error(
      "LOGOUT ERROR:",
      error
    );

  } finally {

    sessionStorage.clear();

    window.location.href =
      "index.html";
  }
}


// ============================================================
// HELPER
// ============================================================

function setElement(
  id,
  value
) {

  const element =
    document.getElementById(
      id
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

  return String(
    value
  )
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
// GLOBAL FUNCTIONS
// ============================================================

window.runReport =
  runReport;

window.loadDashboardStats =
  loadDashboardStats;

window.printReport =
  printReport;

window.goDashboard =
  goDashboard;

window.logout =
  logout;


// ============================================================
// END GAAWOW EMS REPORTS
// ============================================================
