/* =========================================================
   GAAWOW EMS
   Certificates Management V1

   Purpose:
   - View issued certificates
   - Search certificates
   - Filter by status
   - Filter by institution
   - View certificate details
   - Open verification
   - Delete certificate
   - Link to Certificate Generator

   This file DOES NOT generate certificates.

   Generator:
   certificate.html
   ========================================================= */


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


/* =========================================================
   CLIENT
   ========================================================= */

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let certificates = [];
let institutions = [];


/* =========================================================
   DOM
   ========================================================= */

function $(id){

  return document.getElementById(id);

}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
  message,
  type="info"
){

  const box =
    $("message");

  if(!box) return;

  box.textContent =
    message;

  box.className =
    `message ${type}`;

}


function clearMessage(){

  const box =
    $("message");

  if(!box) return;

  box.textContent =
    "";

  box.className =
    "message";

}


/* =========================================================
   AUTH
   ========================================================= */

async function loadSession(){

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();


  if(error){

    throw error;

  }


  currentUser =
    data?.session?.user || null;


  if(!currentUser){

    window.location.href =
      "index.html";

    return false;

  }


  return true;

}


/* =========================================================
   PROFILE
   ========================================================= */

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
        role,
        institution_id,
        is_active
      `)
      .eq(
        "id",
        currentUser.id
      )
      .single();


  if(error){

    throw error;

  }


  currentProfile =
    data;


  if(!currentProfile){

    throw new Error(
      "Profile not found."
    );

  }


  if(!currentProfile.is_active){

    throw new Error(
      "Your account is inactive."
    );

  }


  const allowedRoles = [
    "super_admin",
    "school_admin",
    "teacher"
  ];


  if(
    !allowedRoles.includes(
      currentProfile.role
    )
  ){

    throw new Error(
      "You are not authorized to manage certificates."
    );

  }


  return currentProfile;

}


/* =========================================================
   LOAD INSTITUTIONS
   ========================================================= */

async function loadInstitutions(){

  const filter =
    $("institutionFilter");


  if(!filter){

    return;

  }


  filter.innerHTML =
    `<option value="">
       All Institutions
     </option>`;


  let query =
    supabaseClient
      .from("institutions")
      .select(`
        id,
        name,
        code,
        is_active
      `)
      .order("name");


  /*
     Non-super-admin users
     only see their institution.
  */

  if(
    currentProfile.role !== "super_admin"
  ){

    if(!currentProfile.institution_id){

      throw new Error(
        "Your profile has no institution."
      );

    }


    query =
      query.eq(
        "id",
        currentProfile.institution_id
      );

  }


  const {
    data,
    error
  } =
    await query;


  if(error){

    throw error;

  }


  institutions =
    data || [];


  institutions.forEach(
    institution => {

      const option =
        document.createElement("option");

      option.value =
        institution.id;

      option.textContent =
        institution.code
          ? `${institution.name} (${institution.code})`
          : institution.name;

      filter.appendChild(
        option
      );

    }
  );

}


/* =========================================================
   LOAD CERTIFICATES
   ========================================================= */

async function loadCertificates(){

  const loading =
    $("loading");


  if(loading){

    loading.style.display =
      "block";

    loading.textContent =
      "Loading certificates...";

  }


  const institutionId =
    $("institutionFilter")?.value || "";


  let query =
    supabaseClient
      .from("certificates")
      .select(`
        id,
        institution_id,
        student_id,
        course_id,
        enrollment_id,
        certificate_no,
        certificate_id,
        verify_code,
        hash_code,
        issue_date,
        expiry_date,
        status,
        student_name,
        course_name,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending:false
        }
      );


  /*
     Institution security filter.
  */

  if(
    currentProfile.role !== "super_admin"
  ){

    query =
      query.eq(
        "institution_id",
        currentProfile.institution_id
      );

  }else if(institutionId){

    query =
      query.eq(
        "institution_id",
        institutionId
      );

  }


  const {
    data,
    error
  } =
    await query;


  if(error){

    throw error;

  }


  certificates =
    data || [];


  renderCertificates();


  updateStats();


  if(loading){

    loading.style.display =
      "none";

  }

}


/* =========================================================
   RENDER
   ========================================================= */

function renderCertificates(){

  const body =
    $("certificatesBody");


  if(!body){

    return;

  }


  const search =
    (
      $("searchInput")?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const status =
    $("statusFilter")?.value ||
    "";


  let filtered =
    [...certificates];


  /*
     Search.
  */

  if(search){

    filtered =
      filtered.filter(
        certificate => {

          const values = [

            certificate.certificate_no,

            certificate.certificate_id,

            certificate.verify_code,

            certificate.student_name,

            certificate.course_name

          ];


          return values.some(
            value =>
              String(
                value || ""
              )
                .toLowerCase()
                .includes(search)
          );

        }
      );

  }


  /*
     Status.
  */

  if(status){

    filtered =
      filtered.filter(
        certificate =>
          certificate.status === status
      );

  }


  body.innerHTML =
    "";


  if(!filtered.length){

    body.innerHTML = `

      <tr>

        <td
          colspan="8"
          class="empty"
        >
          No certificates found.
        </td>

      </tr>

    `;

    return;

  }


  filtered.forEach(
    certificate => {

      const row =
        document.createElement("tr");


      const institution =
        institutions.find(
          item =>
            item.id ===
            certificate.institution_id
        );


      const institutionName =
        institution?.name ||
        "—";


      row.innerHTML = `

        <td>
          <strong>
            ${escapeHtml(
              certificate.certificate_no || "—"
            )}
          </strong>

          <div class="muted">
            ${escapeHtml(
              certificate.certificate_id || ""
            )}
          </div>
        </td>


        <td>
          ${escapeHtml(
            certificate.student_name || "—"
          )}
        </td>


        <td>
          ${escapeHtml(
            certificate.course_name || "—"
          )}
        </td>


        <td>
          ${escapeHtml(
            institutionName
          )}
        </td>


        <td>
          ${formatDate(
            certificate.issue_date
          )}
        </td>


        <td>
          ${statusBadge(
            certificate.status
          )}
        </td>


        <td>
          <strong>
            ${escapeHtml(
              certificate.verify_code || "—"
            )}
          </strong>
        </td>


        <td>

          <div class="row-actions">

            <button
              type="button"
              class="small-btn small-view"
              data-action="view"
              data-id="${certificate.id}"
            >
              View
            </button>


            <button
              type="button"
              class="small-btn small-verify"
              data-action="verify"
              data-code="${escapeAttr(
                certificate.verify_code || ""
              )}"
            >
              Verify
            </button>


            ${
              currentProfile.role === "super_admin"
              || currentProfile.role === "school_admin"
              ? `
                <button
                  type="button"
                  class="small-btn small-delete"
                  data-action="delete"
                  data-id="${certificate.id}"
                >
                  Delete
                </button>
              `
              : ""
            }

          </div>

        </td>

      `;


      body.appendChild(
        row
      );

    }
  );

}


/* =========================================================
   STATS
   ========================================================= */

function updateStats(){

  const total =
    certificates.length;


  const valid =
    certificates.filter(
      item =>
        item.status === "valid"
    ).length;


  const pending =
    certificates.filter(
      item =>
        item.status === "pending"
    ).length;


  const revoked =
    certificates.filter(
      item =>
        item.status === "revoked"
    ).length;


  if($("totalCount")){

    $("totalCount").textContent =
      total;

  }


  if($("validCount")){

    $("validCount").textContent =
      valid;

  }


  if($("pendingCount")){

    $("pendingCount").textContent =
      pending;

  }


  if($("revokedCount")){

    $("revokedCount").textContent =
      revoked;

  }

}


/* =========================================================
   STATUS BADGE
   ========================================================= */

function statusBadge(status){

  const safe =
    String(
      status || ""
    ).toLowerCase();


  const label =
    safe
      ? safe.toUpperCase()
      : "UNKNOWN";


  let className =
    "badge";


  if(
    [
      "valid"
    ].includes(safe)
  ){

    className +=
      " badge-valid";

  }else if(
    safe === "graduated"
  ){

    className +=
      " badge-graduated";

  }else if(
    safe === "pending"
  ){

    className +=
      " badge-pending";

  }else if(
    safe === "expired"
  ){

    className +=
      " badge-expired";

  }else if(
    safe === "revoked"
  ){

    className +=
      " badge-revoked";

  }


  return `
    <span class="${className}">
      ${escapeHtml(label)}
    </span>
  `;

}


/* =========================================================
   VIEW
   ========================================================= */

function viewCertificate(id){

  const certificate =
    certificates.find(
      item =>
        item.id === id
    );


  if(!certificate){

    showMessage(
      "Certificate not found.",
      "error"
    );

    return;

  }


  const institution =
    institutions.find(
      item =>
        item.id ===
        certificate.institution_id
    );


  const modalBody =
    $("modalBody");


  if(!modalBody){

    return;

  }


  modalBody.innerHTML = `

    <div class="detail-grid">


      <div class="detail">

        <div class="detail-label">
          Student
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.student_name || "—"
          )}
        </div>

      </div>


      <div class="detail">

        <div class="detail-label">
          Student UUID
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.student_id || "—"
          )}
        </div>

      </div>


      <div class="detail">

        <div class="detail-label">
          Course
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.course_name || "—"
          )}
        </div>

      </div>


      <div class="detail">

        <div class="detail-label">
          Course UUID
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.course_id || "—"
          )}
        </div>

      </div>


      <div class="detail">

        <div class="detail-label">
          Institution
        </div>

        <div class="detail-value">
          ${escapeHtml(
            institution?.name || "—"
          )}
        </div>

      </div>


      <div class="detail">

        <div class="detail-label">
          Certificate No
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.certificate_no || "—"
          )}
        </div>

      </div>


      <div class="detail">

        <div class="detail-label">
          Certificate ID
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.certificate_id || "—"
          )}
        </div>

      </div>


      <div class="detail">

        <div class="detail-label">
          Verify Code
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.verify_code || "—"
          )}
        </div>

      </div>


      <div class="detail">

        <div class="detail-label">
          Issue Date
        </div>

        <div class="detail-value">
          ${formatDate(
            certificate.issue_date
          )}
        </div>

      </div>


      <div class="detail">

        <div class="detail-label">
          Expiry Date
        </div>

        <div class="detail-value">
          ${
            certificate.expiry_date
              ? formatDate(
                  certificate.expiry_date
                )
              : "No Expiry"
          }
        </div>

      </div>


      <div class="detail">

        <div class="detail-label">
          Status
        </div>

        <div class="detail-value">
          ${statusBadge(
            certificate.status
          )}
        </div>

      </div>


      <div class="detail">

        <div class="detail-label">
          Enrollment ID
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.enrollment_id || "—"
          )}
        </div>

      </div>


      <div
        class="detail"
        style="grid-column:1/-1"
      >

        <div class="detail-label">
          Verification Hash
        </div>

        <div class="detail-value">
          ${escapeHtml(
            certificate.hash_code || "—"
          )}
        </div>

      </div>


    </div>

  `;


  $("viewModal")
    ?.classList.add(
      "show"
    );

}


/* =========================================================
   DELETE
   ========================================================= */

async function deleteCertificate(id){

  const certificate =
    certificates.find(
      item =>
        item.id === id
    );


  if(!certificate){

    return;

  }


  const confirmed =
    window.confirm(
      `Delete certificate ${certificate.certificate_no || ""}?\n\nThis action cannot be undone.`
    );


  if(!confirmed){

    return;

  }


  try{

    showMessage(
      "Deleting certificate...",
      "info"
    );


    const {
      error
    } =
      await supabaseClient
        .from("certificates")
        .delete()
        .eq(
          "id",
          id
        );


    if(error){

      throw error;

    }


    showMessage(
      "Certificate deleted successfully.",
      "success"
    );


    await loadCertificates();


  }catch(error){

    console.error(
      "Delete Certificate Error:",
      error
    );


    showMessage(
      error.message ||
      "Unable to delete certificate.",
      "error"
    );

  }

}


/* =========================================================
   VERIFY
   ========================================================= */

function verifyCertificate(
  verifyCode
){

  if(!verifyCode){

    showMessage(
      "Verification code is missing.",
      "error"
    );

    return;

  }


  /*
     Open existing working
     verification page.
  */

  window.location.href =
    `verify.html?code=${encodeURIComponent(
      verifyCode
    )}`;

}


/* =========================================================
   FILTERS
   ========================================================= */

function clearFilters(){

  if($("searchInput")){

    $("searchInput").value =
      "";

  }


  if($("statusFilter")){

    $("statusFilter").value =
      "";

  }


  if(
    $("institutionFilter") &&
    currentProfile.role === "super_admin"
  ){

    $("institutionFilter").value =
      "";

  }


  renderCertificates();

}


/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents(){

  $("backDashboardBtn")
    ?.addEventListener(
      "click",
      () => {

        window.location.href =
          "dashboard.html";

      }
    );


  $("generateCertificateBtn")
    ?.addEventListener(
      "click",
      () => {

        window.location.href =
          "certificate.html";

      }
    );


  $("refreshBtn")
    ?.addEventListener(
      "click",
      async () => {

        try{

          clearMessage();

          await loadCertificates();

          showMessage(
            "Certificates refreshed.",
            "success"
          );

        }catch(error){

          console.error(error);

          showMessage(
            error.message ||
            "Unable to refresh certificates.",
            "error"
          );

        }

      }
    );


  $("searchInput")
    ?.addEventListener(
      "input",
      renderCertificates
    );


  $("statusFilter")
    ?.addEventListener(
      "change",
      renderCertificates
    );


  $("institutionFilter")
    ?.addEventListener(
      "change",
      async () => {

        try{

          await loadCertificates();

        }catch(error){

          console.error(error);

          showMessage(
            error.message ||
            "Unable to filter certificates.",
            "error"
          );

        }

      }
    );


  $("clearFilterBtn")
    ?.addEventListener(
      "click",
      clearFilters
    );


  $("closeModalBtn")
    ?.addEventListener(
      "click",
      () => {

        $("viewModal")
          ?.classList.remove(
            "show"
          );

      }
    );


  $("viewModal")
    ?.addEventListener(
      "click",
      event => {

        if(
          event.target ===
          $("viewModal")
        ){

          $("viewModal")
            .classList.remove(
              "show"
            );

        }

      }
    );


  /*
     Table actions.
  */

  $("certificatesBody")
    ?.addEventListener(
      "click",
      async event => {

        const button =
          event.target.closest(
            "button[data-action]"
          );


        if(!button){

          return;

        }


        const action =
          button.dataset.action;


        if(action === "view"){

          viewCertificate(
            button.dataset.id
          );

        }


        if(action === "verify"){

          verifyCertificate(
            button.dataset.code
          );

        }


        if(action === "delete"){

          await deleteCertificate(
            button.dataset.id
          );

        }

      }
    );

}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(
  dateString
){

  if(!dateString){

    return "—";

  }


  const date =
    new Date(
      `${dateString}T00:00:00`
    );


  if(
    Number.isNaN(
      date.getTime()
    )
  ){

    return escapeHtml(
      dateString
    );

  }


  return date.toLocaleDateString(
    "en-GB",
    {
      day:"2-digit",
      month:"short",
      year:"numeric"
    }
  );

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value){

  return String(
    value ?? ""
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


function escapeAttr(value){

  return escapeHtml(
    value
  );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initialize(){

  try{

    clearMessage();


    if(
      !window.supabase
    ){

      throw new Error(
        "Supabase library failed to load."
      );

    }


    const authenticated =
      await loadSession();


    if(!authenticated){

      return;

    }


    await loadProfile();


    await loadInstitutions();


    bindEvents();


    await loadCertificates();


  }catch(error){

    console.error(
      "Certificates Management Error:",
      error
    );


    const loading =
      $("loading");


    if(loading){

      loading.style.display =
        "none";

    }


    showMessage(
      error.message ||
      "Certificates page could not load.",
      "error"
    );

  }

}


/* =========================================================
   START
   ========================================================= */

if(
  document.readyState ===
  "loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    initialize
  );

}else{

  initialize();

}
