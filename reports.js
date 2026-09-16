const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

let currentUser = null;
let currentProfile = null;
let institutions = [];

document.addEventListener(
  "DOMContentLoaded",
  initReports
);


// =====================================================
// INIT
// =====================================================

async function initReports(){

  try{

    const {
      data:{session},
      error
    } =
    await supabaseClient.auth.getSession();

    if(error) throw error;

    if(!session){

      window.location.href =
        "index.html";

      return;
    }

    currentUser =
      session.user;

    await loadProfile();

    if(
      !currentProfile ||
      currentProfile.role !== "super_admin"
    ){

      showAlert(
        "Only Super Admin can access Reports.",
        "error"
      );

      setTimeout(()=>{
        window.location.href =
          "dashboard.html";
      },1500);

      return;
    }

    await loadInstitutions();

    await loadDashboardStats();

  }catch(error){

    console.error(error);

    showAlert(
      error.message,
      "error"
    );

  }

}


// =====================================================
// PROFILE
// =====================================================

async function loadProfile(){

  const {
    data,
    error
  } =
  await supabaseClient
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      role,
      institution_id,
      is_active
    `)
    .eq(
      "id",
      currentUser.id
    )
    .maybeSingle();

  if(error) throw error;

  currentProfile = data;

}


// =====================================================
// INSTITUTIONS
// =====================================================

async function loadInstitutions(){

  const {
    data,
    error
  } =
  await supabaseClient
    .from("institutions")
    .select(`
      id,
      name,
      code,
      is_active
    `)
    .order(
      "name",
      {ascending:true}
    );

  if(error) throw error;

  institutions =
    data || [];

  const select =
    document.getElementById(
      "institutionFilter"
    );

  select.innerHTML =
    `<option value="">
      All Institutions
    </option>`;

  institutions.forEach(inst=>{

    const option =
      document.createElement(
        "option"
      );

    option.value =
      inst.id;

    option.textContent =
      inst.name;

    select.appendChild(
      option
    );

  });

}


// =====================================================
// DASHBOARD STATS
// =====================================================

async function loadDashboardStats(){

  await loadCount(
    "students",
    "studentsCount"
  );

  await loadCount(
    "profiles",
    "teachersCount",
    "teacher"
  );

  await loadCount(
    "certificates",
    "certificatesCount"
  );

  await loadCount(
    "institutions",
    "institutionsCount"
  );

}


// =====================================================
// COUNT
// =====================================================

async function loadCount(
  table,
  elementId,
  role = null
){

  try{

    let query =
      supabaseClient
        .from(table)
        .select(
          "*",
          {
            count:"exact",
            head:true
          }
        );

    if(
      table === "profiles" &&
      role
    ){

      query =
        query.eq(
          "role",
          role
        );

    }

    const {
      count,
      error
    } =
    await query;

    if(error){

      console.warn(
        table,
        error.message
      );

      document.getElementById(
        elementId
      ).textContent = "0";

      return;
    }

    document.getElementById(
      elementId
    ).textContent =
      count || 0;

  }catch(error){

    console.error(error);

    document.getElementById(
      elementId
    ).textContent = "0";

  }

}


// =====================================================
// REPORT ROUTER
// =====================================================

async function runReport(type){

  const result =
    document.getElementById(
      "reportResult"
    );

  const content =
    document.getElementById(
      "resultContent"
    );

  const title =
    document.getElementById(
      "resultTitle"
    );

  result.style.display =
    "block";

  content.innerHTML =
    `<div class="loading">
      Loading report...
    </div>`;

  window.scrollTo({
    top:result.offsetTop - 20,
    behavior:"smooth"
  });


  try{

    if(type === "academic")
      await academicReport();

    else if(type === "students")
      await studentsReport();

    else if(type === "teachers")
      await teachersReport();

    else if(type === "attendance")
      await attendanceReport();

    else if(type === "grades")
      await gradesReport();

    else if(type === "certificates")
      await certificatesReport();

    else if(type === "financial")
      await financialReport();

    else if(type === "institutions")
      await institutionsReport();

    else if(type === "system")
      await systemReport();

  }catch(error){

    console.error(error);

    title.textContent =
      "Report Error";

    content.innerHTML =
      `<div class="empty">
        ${escapeHtml(
          error.message
        )}
      </div>`;

  }

}


// =====================================================
// ACADEMIC
// =====================================================

async function academicReport(){

  document.getElementById(
    "resultTitle"
  ).textContent =
    "Academic Progress Report";

  const {
    data,
    error
  } =
  await supabaseClient
    .from("academic_progress")
    .select(`
      id,
      student_id,
      academic_year,
      total_courses,
      completed_courses,
      attendance,
      average_score,
      remarks
    `)
    .order(
      "academic_year",
      {ascending:false}
    )
    .limit(200);

  if(error) throw error;

  if(!data || !data.length){

    renderEmpty(
      "No academic progress records found."
    );

    return;
  }

  renderTable(
    [
      "Student ID",
      "Academic Year",
      "Courses",
      "Completed",
      "Attendance",
      "Average Score",
      "Remarks"
    ],
    data.map(row=>[
      row.student_id,
      row.academic_year,
      row.total_courses,
      row.completed_courses,
      row.attendance ?? "—",
      row.average_score ?? "—",
      row.remarks || "—"
    ])
  );

}


// =====================================================
// STUDENTS
// =====================================================

async function studentsReport(){

  document.getElementById(
    "resultTitle"
  ).textContent =
    "Student Report";

  let query =
    supabaseClient
      .from("students")
      .select(`
        student_id,
        full_name,
        gender,
        phone,
        email,
        status,
        institution_id
      `)
      .order(
        "full_name"
      )
      .limit(500);

  const institution =
    getInstitutionFilter();

  if(institution){

    query =
      query.eq(
        "institution_id",
        institution
      );

  }

  const {
    data,
    error
  } =
  await query;

  if(error) throw error;

  if(!data || !data.length){

    renderEmpty(
      "No students found."
    );

    return;
  }

  renderTable(
    [
      "Student ID",
      "Name",
      "Gender",
      "Phone",
      "Email",
      "Status"
    ],
    data.map(row=>[
      row.student_id,
      row.full_name,
      row.gender || "—",
      row.phone || "—",
      row.email || "—",
      statusBadge(row.status)
    ])
  );

}


// =====================================================
// TEACHERS
// =====================================================

async function teachersReport(){

  document.getElementById(
    "resultTitle"
  ).textContent =
    "Teacher Report";

  const {
    data,
    error
  } =
  await supabaseClient
    .from("profiles")
    .select(`
      full_name,
      email,
      role,
      institution_id,
      is_active
    `)
    .eq(
      "role",
      "teacher"
    )
    .order(
      "full_name"
    )
    .limit(500);

  if(error) throw error;

  if(!data || !data.length){

    renderEmpty(
      "No teachers found."
    );

    return;
  }

  renderTable(
    [
      "Teacher",
      "Email",
      "Institution",
      "Active"
    ],
    data.map(row=>[
      row.full_name || "—",
      row.email || "—",
      institutionName(
        row.institution_id
      ),
      row.is_active
        ? statusBadge("active")
        : statusBadge("inactive")
    ])
  );

}


// =====================================================
// ATTENDANCE
// =====================================================

async function attendanceReport(){

  document.getElementById(
    "resultTitle"
  ).textContent =
    "Attendance Report";

  const {
    data,
    error
  } =
  await supabaseClient
    .from("attendance")
    .select("*")
    .order(
      "created_at",
      {ascending:false}
    )
    .limit(300);

  if(error) throw error;

  if(!data || !data.length){

    renderEmpty(
      "No attendance records found."
    );

    return;
  }

  const keys =
    Object.keys(data[0]);

  renderTable(
    keys.slice(0,8),
    data.map(row=>
      keys.slice(0,8).map(
        key=>row[key] ?? "—"
      )
    )
  );

}


// =====================================================
// GRADES
// =====================================================

async function gradesReport(){

  document.getElementById(
    "resultTitle"
  ).textContent =
    "Exams & Grades Report";

  const {
    data,
    error
  } =
  await supabaseClient
    .from("grades")
    .select("*")
    .limit(300);

  if(error) throw error;

  if(!data || !data.length){

    renderEmpty(
      "No grade records found."
    );

    return;
  }

  const keys =
    Object.keys(data[0]);

  renderTable(
    keys.slice(0,8),
    data.map(row=>
      keys.slice(0,8).map(
        key=>row[key] ?? "—"
      )
    )
  );

}


// =====================================================
// CERTIFICATES
// =====================================================

async function certificatesReport(){

  document.getElementById(
    "resultTitle"
  ).textContent =
    "Certificate Report";

  const {
    data,
    error
  } =
  await supabaseClient
    .from("certificates")
    .select(`
      certificate_no,
      certificate_id,
      verify_code,
      student_name_snapshot,
      course_name_snapshot,
      issue_date,
      expiry_date,
      status
    `)
    .order(
      "issue_date",
      {ascending:false}
    )
    .limit(500);

  if(error) throw error;

  if(!data || !data.length){

    renderEmpty(
      "No certificates found."
    );

    return;
  }

  renderTable(
    [
      "Certificate No",
      "Certificate ID",
      "Verify Code",
      "Student",
      "Course",
      "Issue Date",
      "Expiry",
      "Status"
    ],
    data.map(row=>[
      row.certificate_no,
      row.certificate_id,
      row.verify_code,
      row.student_name_snapshot,
      row.course_name_snapshot,
      row.issue_date,
      row.expiry_date || "—",
      statusBadge(row.status)
    ])
  );

}


// =====================================================
// FINANCIAL
// =====================================================

async function financialReport(){

  document.getElementById(
    "resultTitle"
  ).textContent =
    "Financial Report";

  const {
    data,
    error
  } =
  await supabaseClient
    .from("payments")
    .select("*")
    .order(
      "created_at",
      {ascending:false}
    )
    .limit(300);

  if(error) throw error;

  if(!data || !data.length){

    renderEmpty(
      "No payment records found."
    );

    return;
  }

  const keys =
    Object.keys(data[0]);

  renderTable(
    keys.slice(0,8),
    data.map(row=>
      keys.slice(0,8).map(
        key=>row[key] ?? "—"
      )
    )
  );

}


// =====================================================
// INSTITUTIONS
// =====================================================

async function institutionsReport(){

  document.getElementById(
    "resultTitle"
  ).textContent =
    "Institution Report";

  const {
    data,
    error
  } =
  await supabaseClient
    .from("institutions")
    .select(`
      name,
      code,
      email,
      phone,
      city,
      country,
      is_active,
      created_at
    `)
    .order(
      "name"
    );

  if(error) throw error;

  if(!data || !data.length){

    renderEmpty(
      "No institutions found."
    );

    return;
  }

  renderTable(
    [
      "Institution",
      "Code",
      "Email",
      "Phone",
      "City",
      "Country",
      "Status"
    ],
    data.map(row=>[
      row.name,
      row.code || "—",
      row.email || "—",
      row.phone || "—",
      row.city || "—",
      row.country || "—",
      row.is_active
        ? statusBadge("active")
        : statusBadge("inactive")
    ])
  );

}


// =====================================================
// SYSTEM / AUDIT
// =====================================================

async function systemReport(){

  document.getElementById(
    "resultTitle"
  ).textContent =
    "System Activity Report";

  const {
    data,
    error
  } =
  await supabaseClient
    .from("audit_logs")
    .select(`
      created_at,
      action,
      module,
      user_id,
      institution_id,
      record_id,
      description
    `)
    .order(
      "created_at",
      {ascending:false}
    )
    .limit(300);

  if(error) throw error;

  if(!data || !data.length){

    renderEmpty(
      "No audit records found."
    );

    return;
  }

  renderTable(
    [
      "Date",
      "Action",
      "Module",
      "User ID",
      "Institution",
      "Record ID",
      "Description"
    ],
    data.map(row=>[
      formatDate(row.created_at),
      actionBadge(row.action),
      row.module,
      shortId(row.user_id),
      institutionName(
        row.institution_id
      ),
      shortId(row.record_id),
      row.description || "—"
    ])
  );

}


// =====================================================
// RENDER TABLE
// =====================================================

function renderTable(
  headers,
  rows
){

  const content =
    document.getElementById(
      "resultContent"
    );

  let html =
    `<div class="table-wrap">
      <table>
        <thead>
          <tr>`;

  headers.forEach(header=>{
    html +=
      `<th>${escapeHtml(
        header
      )}</th>`;
  });

  html +=
    `</tr>
     </thead>
     <tbody>`;

  rows.forEach(row=>{

    html += "<tr>";

    row.forEach(cell=>{

      html +=
        `<td>${
          typeof cell === "string" &&
          cell.startsWith("<span")
            ? cell
            : escapeHtml(cell)
        }</td>`;

    });

    html += "</tr>";

  });

  html +=
    `</tbody>
     </table>
     </div>`;

  content.innerHTML =
    html;

}


// =====================================================
// EMPTY
// =====================================================

function renderEmpty(message){

  document.getElementById(
    "resultContent"
  ).innerHTML =
    `<div class="empty">
      ${escapeHtml(message)}
    </div>`;

}


// =====================================================
// HELPERS
// =====================================================

function getInstitutionFilter(){

  return document.getElementById(
    "institutionFilter"
  ).value;

}


function institutionName(id){

  if(!id)
    return "—";

  const institution =
    institutions.find(
      x=>x.id === id
    );

  return institution
    ? institution.name
    : shortId(id);

}


function shortId(id){

  if(!id)
    return "—";

  const value =
    String(id);

  if(value.length <= 12)
    return value;

  return value.substring(0,8) +
    "...";
}


function statusBadge(status){

  const value =
    String(status || "")
      .toLowerCase();

  let cls = "gray";

  if(
    value === "active" ||
    value === "valid" ||
    value === "graduated"
  )
    cls = "green";

  else if(
    value === "inactive" ||
    value === "pending"
  )
    cls = "orange";

  else if(
    value === "suspended" ||
    value === "withdrawn" ||
    value === "expired"
  )
    cls = "red";

  return `
    <span class="badge ${cls}">
      ${escapeHtml(status)}
    </span>
  `;

}


function actionBadge(action){

  const value =
    String(action || "")
      .toUpperCase();

  let cls = "gray";

  if(value === "INSERT")
    cls = "green";

  if(value === "UPDATE")
    cls = "blue";

  if(value === "DELETE")
    cls = "red";

  return `
    <span class="badge ${cls}">
      ${escapeHtml(value)}
    </span>
  `;

}


function formatDate(date){

  if(!date)
    return "—";

  try{

    return new Date(date)
      .toLocaleString(
        "en-GB",
        {
          day:"2-digit",
          month:"short",
          year:"numeric",
          hour:"2-digit",
          minute:"2-digit"
        }
      );

  }catch{

    return date;

  }

}


function escapeHtml(value){

  if(
    value === null ||
    value === undefined
  )
    return "";

  return String(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}


// =====================================================
// PRINT
// =====================================================

function printReport(){

  const content =
    document.getElementById(
      "resultContent"
    ).innerHTML;

  const title =
    document.getElementById(
      "resultTitle"
    ).textContent;

  const printWindow =
    window.open(
      "",
      "_blank"
    );

  printWindow.document.write(`
    <html>
    <head>
      <title>
        GAAWOW EMS — ${escapeHtml(title)}
      </title>

      <style>

        body{
          font-family:Arial;
          padding:30px;
        }

        h1{
          color:#0B1E63;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:20px;
        }

        th,td{
          border:1px solid #ddd;
          padding:8px;
          text-align:left;
          font-size:12px;
        }

        th{
          background:#f1f5f9;
        }

      </style>
    </head>

    <body>

      <h1>GAAWOW EMS</h1>

      <h2>
        ${escapeHtml(title)}
      </h2>

      ${content}

    </body>
    </html>
  `);

  printWindow.document.close();

  printWindow.focus();

  setTimeout(()=>{
    printWindow.print();
    printWindow.close();
  },500);

}


// =====================================================
// ALERT
// =====================================================

function showAlert(
  message,
  type="success"
){

  const box =
    document.getElementById(
      "alertBox"
    );

  box.textContent =
    message;

  box.className =
    `alert show ${type}`;

  setTimeout(()=>{
    box.className =
      "alert";
  },4000);

}


// =====================================================
// NAVIGATION
// =====================================================

function goDashboard(){

  window.location.href =
    "dashboard.html";

}


async function logout(){

  await supabaseClient.auth.signOut();

  sessionStorage.clear();

  window.location.href =
    "index.html";

}
