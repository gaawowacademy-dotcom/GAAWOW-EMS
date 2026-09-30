"use strict";

/* =========================================================
   GAAWOW EMS - CERTIFICATES MODULE
   Database connection lives ONLY in this file.
========================================================= */

const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiic5.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

let db = null;
let allCertificates = [];
let currentModalId = null;

const SELECT_COLUMNS = [
  "id",
  "student_id",
  "certificate_no",
  "certificate_id",
  "verify_code",
  "issue_date",
  "expiry_date",
  "status",
  "student_name_snapshot",
  "certificate_type"
].join(",");

function $(id) {
  return document.getElementById(id);
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(String(value).length === 10 ? value + "T00:00:00" : value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function prettyType(type) {
  if (type === "authentication_letter") return "Authentication Letter";
  if (type === "diploma") return "Diploma";
  return "Certificate";
}

function statusOf(row) {
  return String(row.status || "valid").toLowerCase();
}

function showError(title, message) {
  if ($("errorTitle")) $("errorTitle").textContent = title;
  if ($("errorMessage")) $("errorMessage").textContent = message;
  if ($("errorBox")) $("errorBox").style.display = "block";
}

function hideError() {
  if ($("errorBox")) $("errorBox").style.display = "none";
}

function setLoading(on) {
  if ($("loading")) $("loading").style.display = on ? "block" : "none";
}

function showToast(message) {
  const box = $("toast");
  if (!box) return;
  box.textContent = message;
  box.style.display = "block";
  clearTimeout(window.__gaToast);
  window.__gaToast = setTimeout(() => box.style.display = "none", 3000);
}

function updateStats(rows) {
  $("totalStat").textContent = rows.length;
  $("validStat").textContent =
    rows.filter(r => ["valid", "graduated"].includes(statusOf(r))).length;
  $("expiredStat").textContent =
    rows.filter(r => statusOf(r) === "expired").length;
  $("revokedStat").textContent =
    rows.filter(r => statusOf(r) === "revoked").length;
}

function getFilteredRows() {
  const q = ($("searchInput")?.value || "").trim().toLowerCase();
  const status = $("statusFilter")?.value || "";
  const type = $("typeFilter")?.value || "";

  return allCertificates.filter(row => {
    const haystack = [
      row.student_name_snapshot,
      row.certificate_no,
      row.certificate_id,
      row.verify_code,
      row.student_id,
      row.certificate_type
    ].join(" ").toLowerCase();

    return (!q || haystack.includes(q))
      && (!status || statusOf(row) === status)
      && (!type || row.certificate_type === type);
  });
}

function render() {
  const body = $("certBody");
  if (!body) return;

  const rows = getFilteredRows();
  body.innerHTML = "";

  if (!rows.length) {
    $("certTable").style.display = "none";
    $("empty").style.display = "block";
    $("empty").textContent = allCertificates.length
      ? "No records match your search/filter."
      : "No certificate records found.";
    return;
  }

  $("empty").style.display = "none";
  $("certTable").style.display = "table";

  rows.forEach(row => {
    const tr = document.createElement("tr");
    const status = statusOf(row);

    tr.innerHTML = `
      <td>
        <div class="name">${esc(row.student_name_snapshot || "Unknown student")}</div>
        <div class="code">${esc(row.student_id || "")}</div>
      </td>
      <td><span class="type">${esc(prettyType(row.certificate_type))}</span></td>
      <td><span class="code">${esc(row.certificate_no || "—")}</span></td>
      <td><span class="code">${esc(row.certificate_id || "—")}</span></td>
      <td>${esc(formatDate(row.issue_date))}</td>
      <td><span class="badge ${esc(status)}">${esc(status)}</span></td>
      <td>
        <div class="actions">
          <button class="action js-view" data-id="${esc(row.id)}">View</button>
          <button class="action js-regenerate" data-id="${esc(row.id)}">Regenerate</button>
          <button class="action js-verify" data-code="${esc(row.verify_code || "")}">Verify</button>
        </div>
      </td>
    `;

    tr.querySelector(".js-view").addEventListener("click", () => viewDocument(row.id));
    tr.querySelector(".js-regenerate").addEventListener("click", () => openDocument(row.id));
    tr.querySelector(".js-verify").addEventListener("click", () => verifyDocument(row.verify_code));

    body.appendChild(tr);
  });
}

function findRow(id) {
  return allCertificates.find(r => r.id === id);
}

function viewDocument(id) {
  const row = findRow(id);
  if (!row) return showToast("Record not found.");

  currentModalId = id;

  $("modalBody").innerHTML = `
    <div class="detail-grid">
      <div class="detail"><label>Student</label><div>${esc(row.student_name_snapshot)}</div></div>
      <div class="detail"><label>Document Type</label><div>${esc(prettyType(row.certificate_type))}</div></div>
      <div class="detail"><label>Certificate No.</label><div class="code">${esc(row.certificate_no)}</div></div>
      <div class="detail"><label>Certificate ID</label><div class="code">${esc(row.certificate_id)}</div></div>
      <div class="detail"><label>Verification Code</label><div class="code">${esc(row.verify_code)}</div></div>
      <div class="detail"><label>Student ID</label><div class="code">${esc(row.student_id)}</div></div>
      <div class="detail"><label>Issue Date</label><div>${esc(formatDate(row.issue_date))}</div></div>
      <div class="detail"><label>Expiry Date</label><div>${esc(formatDate(row.expiry_date))}</div></div>
      <div class="detail"><label>Status</label><div>${esc(row.status || "valid")}</div></div>
    </div>
  `;

  $("modalOpen").onclick = () => openDocument(id);
  $("modalBackdrop").style.display = "flex";
}

function hideModal() {
  $("modalBackdrop").style.display = "none";
}

function closeModal(event) {
  if (event.target === $("modalBackdrop")) hideModal();
}

function openDocument(id) {
  const row = findRow(id);
  if (!row) return showToast("Record not found.");

  const encoded = encodeURIComponent(row.id);

  if (row.certificate_type === "certificate") {
    location.href = `certificate.html?regen=${encoded}`;
  } else if (row.certificate_type === "diploma") {
    location.href = `certificate.html?regen=${encoded}&type=diploma`;
  } else if (row.certificate_type === "authentication_letter") {
    location.href = `authentication-letter.html?regen=${encoded}`;
  } else {
    showToast("Unknown document type.");
  }
}

function verifyDocument(code) {
  if (!code) return showToast("Verification code not available.");
  location.href = `verify.html?code=${encodeURIComponent(code)}`;
}

function clearFilters() {
  $("searchInput").value = "";
  $("statusFilter").value = "";
  $("typeFilter").value = "";
  render();
}

function goGenerate() {
  location.href = "certificate.html";
}

/* ---------------------------------------------------------
   DATABASE CONNECTION WITH TIMEOUT
--------------------------------------------------------- */

async function fetchCertificates() {
  if (!window.supabase) {
    throw new Error(
      "Supabase JS library lama soo degin. Hubi internet-ka ama CDN script-ka."
    );
  }

  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    db: { schema: "public" },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        "x-client-info": "gaawow-ems-certificates"
      }
    }
  });

  const request = db
    .from("certificates")
    .select(SELECT_COLUMNS)
    .order("issue_date", { ascending: false });

  const timeout = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(
        "Supabase request timeout: 15 seconds. Browser-ku jawaab kama helin Supabase."
      )),
      15000
    );
  });

  const result = await Promise.race([request, timeout]);

  if (result.error) {
    throw new Error(
      `${result.error.message || "Supabase query failed"}`
      + (result.error.code ? ` [${result.error.code}]` : "")
    );
  }

  return result.data || [];
}

/* ---------------------------------------------------------
   LOAD
--------------------------------------------------------- */

async function loadCertificates() {
  hideError();
  setLoading(true);
  $("certTable").style.display = "none";
  $("empty").style.display = "none";

  try {
    allCertificates = await fetchCertificates();

    console.log(
      "GAAWOW EMS: Supabase connected. Certificates:",
      allCertificates.length
    );

    updateStats(allCertificates);
    render();

    if (!allCertificates.length) {
      $("empty").style.display = "block";
      $("empty").textContent = "No certificate records found.";
    }

  } catch (error) {
    console.error("GAAWOW EMS Certificates Error:", error);

    showError(
      "Certificates database connection failed",
      error.message || String(error)
    );

    $("empty").style.display = "block";
    $("empty").textContent = "Certificates could not be loaded.";

  } finally {
    setLoading(false);
  }
}

/* ---------------------------------------------------------
   EVENTS
--------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  $("searchInput")?.addEventListener("input", render);
  $("statusFilter")?.addEventListener("change", render);
  $("typeFilter")?.addEventListener("change", render);

  $("modalBackdrop")?.addEventListener("click", closeModal);

  loadCertificates();
});

/* Make buttons accessible to existing inline HTML */
window.loadCertificates = loadCertificates;
window.clearFilters = clearFilters;
window.goGenerate = goGenerate;
window.hideModal = hideModal;
window.closeModal = closeModal;
window.viewDocument = viewDocument;
window.regenerateDocument = openDocument;
window.verifyDocument = verifyDocument;
