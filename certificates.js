"use strict";

const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiic5.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const COLUMNS =
  "id,student_id,certificate_no,certificate_id,verify_code,issue_date,expiry_date,status,student_name_snapshot,certificate_type";

let allCertificates = [];

const $ = id => document.getElementById(id);

function esc(v) {
  return String(v ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function date(v) {
  if (!v) return "—";
  const d = new Date(String(v).length === 10 ? v+"T00:00:00" : v);
  return Number.isNaN(d.getTime()) ? String(v) :
    d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
}

function typeName(v) {
  return v === "authentication_letter" ? "Authentication Letter" :
         v === "diploma" ? "Diploma" : "Certificate";
}

function status(v) {
  return String(v || "valid").toLowerCase();
}

function errorBox(msg) {
  if ($("errorTitle")) $("errorTitle").textContent = "Certificates connection error";
  if ($("errorMessage")) $("errorMessage").textContent = msg;
  if ($("errorBox")) $("errorBox").style.display = "block";
}

function stats(rows) {
  $("totalStat").textContent = rows.length;
  $("validStat").textContent =
    rows.filter(x => ["valid","graduated"].includes(status(x.status))).length;
  $("expiredStat").textContent =
    rows.filter(x => status(x.status) === "expired").length;
  $("revokedStat").textContent =
    rows.filter(x => status(x.status) === "revoked").length;
}

async function getCertificates() {
  const url =
    SUPABASE_URL +
    "/rest/v1/certificates?select=" +
    encodeURIComponent(COLUMNS) +
    "&order=issue_date.desc";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const r = await fetch(url, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Accept": "application/json"
      },
      cache: "no-store",
      signal: controller.signal
    });

    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch (_) {}

    if (!r.ok) {
      throw new Error(
        "HTTP " + r.status + ": " +
        (data?.message || data?.hint || data?.error || text)
      );
    }

    if (!Array.isArray(data))
      throw new Error("Supabase returned unexpected data.");

    return data;
  } catch (e) {
    if (e.name === "AbortError")
      throw new Error("Supabase timeout after 12 seconds.");
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

function filtered() {
  const q = ($("searchInput")?.value || "").toLowerCase().trim();
  const s = $("statusFilter")?.value || "";
  const t = $("typeFilter")?.value || "";

  return allCertificates.filter(x => {
    const hay = [
      x.student_name_snapshot, x.student_id, x.certificate_no,
      x.certificate_id, x.verify_code, x.certificate_type
    ].join(" ").toLowerCase();

    return (!q || hay.includes(q)) &&
           (!s || status(x.status) === s) &&
           (!t || x.certificate_type === t);
  });
}

function render() {
  const body = $("certBody");
  if (!body) return;

  const rows = filtered();
  body.innerHTML = "";

  if (!rows.length) {
    $("certTable").style.display = "none";
    $("empty").style.display = "block";
    $("empty").textContent =
      allCertificates.length ?
      "No records match your search/filter." :
      "No certificate records found.";
    return;
  }

  $("empty").style.display = "none";
  $("certTable").style.display = "table";

  rows.forEach(x => {
    const tr = document.createElement("tr");
    const st = status(x.status);

    tr.innerHTML = `
      <td>
        <div class="name">${esc(x.student_name_snapshot || "Unknown student")}</div>
        <div class="code">${esc(x.student_id || "")}</div>
      </td>
      <td><span class="type">${esc(typeName(x.certificate_type))}</span></td>
      <td><span class="code">${esc(x.certificate_no || "—")}</span></td>
      <td><span class="code">${esc(x.certificate_id || "—")}</span></td>
      <td>${esc(date(x.issue_date))}</td>
      <td><span class="badge ${esc(st)}">${esc(st)}</span></td>
      <td>
        <div class="actions">
          <button class="action view">View</button>
          <button class="action open">Open</button>
          <button class="action verify">Verify</button>
        </div>
      </td>`;

    tr.querySelector(".view").onclick = () => view(x);
    tr.querySelector(".open").onclick = () => openDocument(x);
    tr.querySelector(".verify").onclick = () => {
      location.href = "verify.html?code=" + encodeURIComponent(x.verify_code || "");
    };

    body.appendChild(tr);
  });
}

function view(x) {
  if (!$("modalBody")) return;
  $("modalBody").innerHTML = `
    <div class="detail-grid">
      <div class="detail"><label>Student</label><div>${esc(x.student_name_snapshot)}</div></div>
      <div class="detail"><label>Type</label><div>${esc(typeName(x.certificate_type))}</div></div>
      <div class="detail"><label>Certificate No.</label><div>${esc(x.certificate_no)}</div></div>
      <div class="detail"><label>Certificate ID</label><div>${esc(x.certificate_id)}</div></div>
      <div class="detail"><label>Verify Code</label><div>${esc(x.verify_code)}</div></div>
      <div class="detail"><label>Student ID</label><div>${esc(x.student_id)}</div></div>
      <div class="detail"><label>Issue Date</label><div>${esc(date(x.issue_date))}</div></div>
      <div class="detail"><label>Status</label><div>${esc(x.status || "valid")}</div></div>
    </div>`;
  $("modalOpen").onclick = () => openDocument(x);
  $("modalBackdrop").style.display = "flex";
}

function openDocument(x) {
  const id = encodeURIComponent(x.id);
  if (x.certificate_type === "authentication_letter")
    location.href = "authentication-letter.html?regen=" + id;
  else if (x.certificate_type === "diploma")
    location.href = "certificate.html?regen=" + id + "&type=diploma";
  else
    location.href = "certificate.html?regen=" + id;
}

function loadCertificates() {
  if ($("loading")) $("loading").style.display = "block";
  if ($("certTable")) $("certTable").style.display = "none";
  if ($("empty")) $("empty").style.display = "none";

  getCertificates()
    .then(rows => {
      allCertificates = rows;
      stats(rows);
      render();
      console.log("GAAWOW: loaded", rows.length, "records");
    })
    .catch(e => {
      console.error(e);
      stats([]);
      errorBox(e.message || String(e));
      if ($("empty")) {
        $("empty").style.display = "block";
        $("empty").textContent = "Database connection failed.";
      }
    })
    .finally(() => {
      if ($("loading")) $("loading").style.display = "none";
    });
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

function hideModal() {
  if ($("modalBackdrop")) $("modalBackdrop").style.display = "none";
}

function closeModal(e) {
  if (e.target === $("modalBackdrop")) hideModal();
}

window.loadCertificates = loadCertificates;
window.clearFilters = clearFilters;
window.goGenerate = goGenerate;
window.hideModal = hideModal;
window.closeModal = closeModal;

document.addEventListener("DOMContentLoaded", () => {
  $("searchInput")?.addEventListener("input", render);
  $("statusFilter")?.addEventListener("change", render);
  $("typeFilter")?.addEventListener("change", render);
  $("modalBackdrop")?.addEventListener("click", closeModal);
  loadCertificates();
});
