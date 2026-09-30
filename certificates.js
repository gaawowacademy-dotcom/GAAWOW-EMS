"use strict";

/* =========================================================
   GAAWOW ACADEMY EMS
   Certificates Module
   Complete certificates.js
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const COLUMNS =
  "id,student_id,certificate_no,certificate_id,verify_code,issue_date,expiry_date,status,student_name_snapshot,certificate_type";

let allCertificates = [];

/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function date(value) {
  if (!value) return "—";

  const d = new Date(
    String(value).length === 10
      ? value + "T00:00:00"
      : value
  );

  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
}

function typeName(type) {
  if (type === "authentication_letter")
    return "Authentication Letter";

  if (type === "diploma")
    return "Diploma";

  return "Certificate";
}

function status(value) {
  return String(value || "valid").toLowerCase();
}

/* =========================================================
   ERROR BOX
   ========================================================= */

function errorBox(message) {
  if ($("errorTitle"))
    $("errorTitle").textContent = "Certificates connection error";

  if ($("errorMessage"))
    $("errorMessage").textContent = message;

  if ($("errorBox"))
    $("errorBox").style.display = "block";
}

/* =========================================================
   STATS
   ========================================================= */

function stats(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];

  if ($("totalStat"))
    $("totalStat").textContent = safeRows.length;

  if ($("validStat")) {
    $("validStat").textContent =
      safeRows.filter(x =>
        ["valid", "graduated"].includes(status(x.status))
      ).length;
  }

  if ($("expiredStat")) {
    $("expiredStat").textContent =
      safeRows.filter(x =>
        status(x.status) === "expired"
      ).length;
  }

  if ($("revokedStat")) {
    $("revokedStat").textContent =
      safeRows.filter(x =>
        status(x.status) === "revoked"
      ).length;
  }
}

/* =========================================================
   LOAD CERTIFICATES FROM SUPABASE
   ========================================================= */

async function getCertificates() {

  const url =
    SUPABASE_URL +
    "/rest/v1/certificates?select=" +
    encodeURIComponent(COLUMNS) +
    "&order=issue_date.desc";

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 12000);

  try {

    const response = await fetch(url, {
      method: "GET",

      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Accept": "application/json"
      },

      cache: "no-store",
      signal: controller.signal
    });

    const text = await response.text();

    let data = null;

    try {
      data = JSON.parse(text);
    } catch (_) {
      data = null;
    }

    if (!response.ok) {

      throw new Error(
        "HTTP " +
        response.status +
        ": " +
        (
          data?.message ||
          data?.hint ||
          data?.error ||
          text ||
          "Supabase request failed."
        )
      );
    }

    if (!Array.isArray(data)) {
      throw new Error(
        "Supabase returned unexpected data."
      );
    }

    return data;

  } catch (error) {

    if (error.name === "AbortError") {
      throw new Error(
        "Supabase timeout after 12 seconds."
      );
    }

    throw error;

  } finally {

    clearTimeout(timeout);
  }
}

/* =========================================================
   FILTER
   ========================================================= */

function filtered() {

  const q =
    ($("searchInput")?.value || "")
      .toLowerCase()
      .trim();

  const selectedStatus =
    $("statusFilter")?.value || "";

  const selectedType =
    $("typeFilter")?.value || "";

  return allCertificates.filter(x => {

    const haystack = [
      x.student_name_snapshot,
      x.student_id,
      x.certificate_no,
      x.certificate_id,
      x.verify_code,
      x.certificate_type
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!q || haystack.includes(q)) &&
      (
        !selectedStatus ||
        status(x.status) === selectedStatus
      ) &&
      (
        !selectedType ||
        x.certificate_type === selectedType
      )
    );
  });
}

/* =========================================================
   RENDER TABLE
   ========================================================= */

function render() {

  const body = $("certBody");

  if (!body)
    return;

  const rows = filtered();

  body.innerHTML = "";

  if (!rows.length) {

    if ($("certTable"))
      $("certTable").style.display = "none";

    if ($("empty")) {
      $("empty").style.display = "block";

      $("empty").textContent =
        allCertificates.length
          ? "No records match your search/filter."
          : "No certificate records found.";
    }

    return;
  }

  if ($("empty"))
    $("empty").style.display = "none";

  if ($("certTable"))
    $("certTable").style.display = "table";

  rows.forEach(x => {

    const tr = document.createElement("tr");

    const st = status(x.status);

    tr.innerHTML = `
      <td>
        <div class="name">
          ${esc(
            x.student_name_snapshot ||
            "Unknown student"
          )}
        </div>

        <div class="code">
          ${esc(x.student_id || "")}
        </div>
      </td>

      <td>
        <span class="type">
          ${esc(typeName(x.certificate_type))}
        </span>
      </td>

      <td>
        <span class="code">
          ${esc(x.certificate_no || "—")}
        </span>
      </td>

      <td>
        <span class="code">
          ${esc(x.certificate_id || "—")}
        </span>
      </td>

      <td>
        ${esc(date(x.issue_date))}
      </td>

      <td>
        <span class="badge ${esc(st)}">
          ${esc(st)}
        </span>
      </td>

      <td>
        <div class="actions">

          <button
            type="button"
            class="action view">
            View
          </button>

          <button
            type="button"
            class="action open">
            Open
          </button>

          <button
            type="button"
            class="action verify">
            Verify
          </button>

        </div>
      </td>
    `;

    /* VIEW */
    tr.querySelector(".view").onclick = () => {
      view(x);
    };

    /* OPEN */
    tr.querySelector(".open").onclick = () => {
      openDocumentChoice(x);
    };

    /* VERIFY */
    tr.querySelector(".verify").onclick = () => {
      verifyDocument(x);
    };

    body.appendChild(tr);
  });
}

/* =========================================================
   VIEW DETAILS
   ========================================================= */

function view(x) {

  if (!$("modalBody"))
    return;

  $("modalBody").innerHTML = `
    <div class="detail-grid">

      <div class="detail">
        <label>Student</label>
        <div>
          ${esc(x.student_name_snapshot)}
        </div>
      </div>

      <div class="detail">
        <label>Type</label>
        <div>
          ${esc(typeName(x.certificate_type))}
        </div>
      </div>

      <div class="detail">
        <label>Certificate No.</label>
        <div>
          ${esc(x.certificate_no)}
        </div>
      </div>

      <div class="detail">
        <label>Certificate ID</label>
        <div>
          ${esc(x.certificate_id)}
        </div>
      </div>

      <div class="detail">
        <label>Verify Code</label>
        <div>
          ${esc(x.verify_code)}
        </div>
      </div>

      <div class="detail">
        <label>Student ID</label>
        <div>
          ${esc(x.student_id)}
        </div>
      </div>

      <div class="detail">
        <label>Issue Date</label>
        <div>
          ${esc(date(x.issue_date))}
        </div>
      </div>

      <div class="detail">
        <label>Status</label>
        <div>
          ${esc(x.status || "valid")}
        </div>
      </div>

    </div>
  `;

  if ($("modalOpen")) {
    $("modalOpen").onclick = () => {
      hideModal();
      openDocumentChoice(x);
    };
  }

  if ($("modalBackdrop"))
    $("modalBackdrop").style.display = "flex";
}

/* =========================================================
   OPEN CHOICE
   ========================================================= */

function openDocumentChoice(x) {

  /*
    Waxaa muhiim ah:
    Open hadda si toos ah uma furayo Generate.

    Marka Open la riixo waxaa soo baxaya
    doorasho:
      1. Open Certificate / Generate
      2. Open Authentication Letter
  */

  const existing = document.getElementById(
    "gaawowOpenChoice"
  );

  if (existing)
    existing.remove();

  const modal = document.createElement("div");

  modal.id = "gaawowOpenChoice";

  modal.innerHTML = `
    <div class="gaawow-choice-overlay">

      <div class="gaawow-choice-box">

        <button
          type="button"
          class="gaawow-choice-close"
          id="gaawowChoiceClose">
          ×
        </button>

        <div class="gaawow-choice-icon">
          📄
        </div>

        <h2>
          Open Document
        </h2>

        <p>
          Dooro dokumentiga aad rabto inaad furto.
        </p>

        <div class="gaawow-choice-student">
          <strong>
            ${esc(
              x.student_name_snapshot ||
              "Student"
            )}
          </strong>

          <span>
            ${esc(
              typeName(x.certificate_type)
            )}
          </span>
        </div>

        <div class="gaawow-choice-buttons">

          <button
            type="button"
            id="gaawowOpenCertificate"
            class="gaawow-choice-btn primary">
            📜 Open Certificate / Generate
          </button>

          <button
            type="button"
            id="gaawowOpenAuth"
            class="gaawow-choice-btn secondary">
            📄 Open Authentication Letter
          </button>

        </div>

        <button
          type="button"
          id="gaawowChoiceCancel"
          class="gaawow-choice-cancel">
          Cancel
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  /* Dynamic styling */
  if (!document.getElementById("gaawowChoiceStyles")) {

    const style = document.createElement("style");

    style.id = "gaawowChoiceStyles";

    style.textContent = `
      .gaawow-choice-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(0, 0, 0, .55);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      }

      .gaawow-choice-box {
        width: min(430px, 100%);
        background: #ffffff;
        border-radius: 18px;
        padding: 28px;
        position: relative;
        box-sizing: border-box;
        box-shadow: 0 20px 60px rgba(0,0,0,.25);
        text-align: center;
        font-family: Arial, sans-serif;
      }

      .gaawow-choice-close {
        position: absolute;
        top: 10px;
        right: 14px;
        border: 0;
        background: transparent;
        font-size: 28px;
        cursor: pointer;
        color: #555;
      }

      .gaawow-choice-icon {
        width: 58px;
        height: 58px;
        margin: 0 auto 12px;
        border-radius: 50%;
        background: #f5f7fa;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
      }

      .gaawow-choice-box h2 {
        margin: 0 0 8px;
        color: #0B1E63;
        font-size: 22px;
      }

      .gaawow-choice-box p {
        margin: 0 0 18px;
        color: #666;
        font-size: 14px;
      }

      .gaawow-choice-student {
        background: #f5f7fa;
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 18px;
      }

      .gaawow-choice-student strong {
        display: block;
        color: #0B1E63;
        margin-bottom: 4px;
      }

      .gaawow-choice-student span {
        color: #777;
        font-size: 13px;
      }

      .gaawow-choice-buttons {
        display: grid;
        gap: 10px;
      }

      .gaawow-choice-btn {
        width: 100%;
        border: 0;
        border-radius: 10px;
        padding: 13px 15px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .gaawow-choice-btn.primary {
        background: #0B1E63;
        color: #ffffff;
      }

      .gaawow-choice-btn.secondary {
        background: #D4AF37;
        color: #ffffff;
      }

      .gaawow-choice-btn:hover {
        opacity: .9;
      }

      .gaawow-choice-cancel {
        margin-top: 13px;
        border: 0;
        background: transparent;
        color: #666;
        cursor: pointer;
        font-size: 14px;
      }

      @media (max-width: 480px) {
        .gaawow-choice-box {
          padding: 23px 18px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* Certificate / Generate */
  document
    .getElementById("gaawowOpenCertificate")
    ?.addEventListener("click", () => {

      closeDocumentChoice();

      openCertificate(x);

    });

  /* Authentication Letter */
  document
    .getElementById("gaawowOpenAuth")
    ?.addEventListener("click", () => {

      closeDocumentChoice();

      openAuthenticationLetter(x);

    });

  /* Close */
  document
    .getElementById("gaawowChoiceClose")
    ?.addEventListener("click", closeDocumentChoice);

  document
    .getElementById("gaawowChoiceCancel")
    ?.addEventListener("click", closeDocumentChoice);

  modal
    .querySelector(".gaawow-choice-overlay")
    ?.addEventListener("click", event => {

      if (
        event.target.classList.contains(
          "gaawow-choice-overlay"
        )
      ) {
        closeDocumentChoice();
      }

    });
}

/* =========================================================
   CLOSE CHOICE
   ========================================================= */

function closeDocumentChoice() {

  const modal =
    document.getElementById(
      "gaawowOpenChoice"
    );

  if (modal)
    modal.remove();
}

/* =========================================================
   OPEN CERTIFICATE / GENERATE
   ========================================================= */

function openCertificate(x) {

  if (!x || !x.id) {
    alert(
      "Certificate record ID lama helin."
    );
    return;
  }

  const id =
    encodeURIComponent(x.id);

  /*
    Certificate iyo Diploma
    waxay tagayaan certificate.html
  */

  if (x.certificate_type === "diploma") {

    location.href =
      "certificate.html?regen=" +
      id +
      "&type=diploma";

    return;
  }

  location.href =
    "certificate.html?regen=" +
    id;
}

/* =========================================================
   OPEN AUTHENTICATION LETTER
   ========================================================= */

function openAuthenticationLetter(x) {

  if (!x || !x.id) {

    alert(
      "Authentication Letter record ID lama helin."
    );

    return;
  }

  /*
    Authentication Letter wuxuu ka soo qaadanayaa
    isla record-ka public.certificates.

    URL:
    authentication-letter.html?regen=<certificate.id>
  */

  const id =
    encodeURIComponent(x.id);

  location.href =
    "authentication-letter.html?regen=" +
    id;
}

/* =========================================================
   VERIFY
   ========================================================= */

function verifyDocument(x) {

  if (!x || !x.verify_code) {

    alert(
      "Verification code lama helin."
    );

    return;
  }

  const code =
    encodeURIComponent(
      x.verify_code
    );

  const id =
    x.id
      ? "&id=" +
        encodeURIComponent(x.id)
      : "";

  /*
    Authentication Letter
    wuxuu u tagayaa verify-auth.html.

    Certificate/Diploma
    wuxuu u tagayaa verify.html.
  */

  if (
    x.certificate_type ===
    "authentication_letter"
  ) {

    location.href =
      "verify-auth.html?code=" +
      code +
      id;

    return;
  }

  location.href =
    "verify.html?code=" +
    code;
}

/* =========================================================
   GENERATE BUTTON
   ========================================================= */

function goGenerate() {

  location.href =
    "certificate.html";
}

/* =========================================================
   CLEAR FILTERS
   ========================================================= */

function clearFilters() {

  if ($("searchInput"))
    $("searchInput").value = "";

  if ($("statusFilter"))
    $("statusFilter").value = "";

  if ($("typeFilter"))
    $("typeFilter").value = "";

  render();
}

/* =========================================================
   MODAL
   ========================================================= */

function hideModal() {

  if ($("modalBackdrop"))
    $("modalBackdrop").style.display = "none";
}

function closeModal(event) {

  if (
    $("modalBackdrop") &&
    event.target === $("modalBackdrop")
  ) {
    hideModal();
  }
}

/* =========================================================
   LOAD
   ========================================================= */

function loadCertificates() {

  if ($("loading"))
    $("loading").style.display = "block";

  if ($("certTable"))
    $("certTable").style.display = "none";

  if ($("empty"))
    $("empty").style.display = "none";

  if ($("errorBox"))
    $("errorBox").style.display = "none";

  getCertificates()

    .then(rows => {

      allCertificates =
        Array.isArray(rows)
          ? rows
          : [];

      stats(allCertificates);

      render();

      console.log(
        "GAAWOW: loaded",
        allCertificates.length,
        "certificate records"
      );

    })

    .catch(error => {

      console.error(
        "GAAWOW Certificates Error:",
        error
      );

      allCertificates = [];

      stats([]);

      errorBox(
        error?.message ||
        String(error)
      );

      if ($("empty")) {

        $("empty").style.display =
          "block";

        $("empty").textContent =
          "Database connection failed.";
      }

    })

    .finally(() => {

      if ($("loading"))
        $("loading").style.display = "none";

    });
}

/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.loadCertificates =
  loadCertificates;

window.clearFilters =
  clearFilters;

window.goGenerate =
  goGenerate;

window.hideModal =
  hideModal;

window.closeModal =
  closeModal;

window.openDocumentChoice =
  openDocumentChoice;

window.openAuthenticationLetter =
  openAuthenticationLetter;

window.openCertificate =
  openCertificate;

/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    $("searchInput")
      ?.addEventListener(
        "input",
        render
      );

    $("statusFilter")
      ?.addEventListener(
        "change",
        render
      );

    $("typeFilter")
      ?.addEventListener(
        "change",
        render
      );

    $("modalBackdrop")
      ?.addEventListener(
        "click",
        closeModal
      );

    loadCertificates();
  }
);
