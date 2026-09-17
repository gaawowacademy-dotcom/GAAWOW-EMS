/* =========================================================
   GAAWOW EMS — Certificate Generator V5
   Backend + Generate Logic
   ========================================================= */

const GAAWOW_CONFIG = {
  SUPABASE_URL: "https://mytyvqwrxnxpxnxpiicj.supabase.co",
  SUPABASE_KEY: "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145",
  LOGO_URL: "https://i.ibb.co/4ZCRpm30/gaawow-logo.png",
  VERIFY_URL: "https://gaawowacademy-dotcom.github.io/GAAWOW-EMS/verify.html"
};

/* ---------- Helpers ---------- */

function gaawowEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m];
  });
}

function gaawowDate(value) {
  if (!value) return "—";

  const d = new Date(value + "T00:00:00");

  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleDateString("en-GB").replaceAll("/", " / ");
}

function gaawowRandom(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

function gaawowYear() {
  return new Date().getFullYear();
}

function gaawowQR(value) {
  return (
    "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=" +
    encodeURIComponent(value)
  );
}

/* ---------- Generate IDs ---------- */

function generateCertificateNumber() {
  const year = gaawowYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  const code = gaawowRandom(6);

  return `GA-C-${year}-${random}-${code}`;
}

function generateCertificateId() {
  return `CERT_GA_${gaawowYear()}_${gaawowRandom(8)}`;
}

function generateVerifyCode() {
  return gaawowRandom(8);
}

/* ---------- Form ---------- */

function getCertificateData() {
  const fields = [
    "student_name",
    "student_id",
    "certificate_id",
    "certificate_no",
    "verify_code",
    "course_name",
    "start_date",
    "completion_date",
    "issue_date",
    "status",
    "photo_url"
  ];

  const data = {};

  fields.forEach(function (field) {
    const element = document.getElementById(field);

    data[field] = element
      ? element.value.trim()
      : "";
  });

  return data;
}

/* ---------- Generate Certificate ---------- */

function generateCertificate() {
  try {
    const studentName = document.getElementById("student_name").value.trim();
    const courseName = document.getElementById("course_name").value.trim();

    if (!studentName) {
      showMessage("Please enter Student Name first.", "err");
      document.getElementById("student_name").focus();
      return;
    }

    if (!courseName) {
      showMessage("Please enter Course Name first.", "err");
      document.getElementById("course_name").focus();
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    document.getElementById("certificate_no").value =
      generateCertificateNumber();

    document.getElementById("certificate_id").value =
      generateCertificateId();

    document.getElementById("verify_code").value =
      generateVerifyCode();

    if (!document.getElementById("issue_date").value) {
      document.getElementById("issue_date").value = today;
    }

    if (!document.getElementById("completion_date").value) {
      document.getElementById("completion_date").value = today;
    }

    if (!document.getElementById("status").value) {
      document.getElementById("status").value = "COMPLETED";
    }

    renderCertificate();

    showMessage(
      "Certificate generated successfully. You can now Preview or Save to Supabase.",
      "ok"
    );

    document.getElementById("sheet").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error("Generate Certificate Error:", error);

    showMessage(
      "Certificate generation failed: " + error.message,
      "err"
    );
  }
}

/* ---------- Render ---------- */

function renderCertificate() {
  const x = getCertificateData();

  const verifyUrl =
    GAAWOW_CONFIG.VERIFY_URL +
    "?certificate=" +
    encodeURIComponent(
      x.verify_code || x.certificate_no || x.certificate_id
    );

  const photo =
    x.photo_url ||
    "https://via.placeholder.com/280x350?text=STUDENT+PHOTO";

  const sheet = document.getElementById("sheet");

  if (!sheet) return;

  sheet.innerHTML = `
    <div class="certificate-frame">

      <div class="gold-inner"></div>

      <div class="corner corner-tl"></div>
      <div class="corner corner-tr"></div>
      <div class="corner corner-bl"></div>
      <div class="corner corner-br"></div>

      <div class="watermark">G</div>

      <div class="certificate-content">

        <div class="left-column">

          <div class="photo-box">
            <img
              src="${gaawowEscape(photo)}"
              alt="Student Photo"
              onerror="this.src='https://via.placeholder.com/280x350?text=STUDENT+PHOTO'"
            >
          </div>

          <div class="student-meta">

            <div class="meta">
              <b>STUDENT ID</b>
              <span>${gaawowEscape(x.student_id || "—")}</span>
            </div>

            <div class="meta">
              <b>CERTIFICATE NO.</b>
              <span>${gaawowEscape(x.certificate_no || "—")}</span>
            </div>

            <div class="meta">
              <b>DATE STARTED</b>
              <span>${gaawowDate(x.start_date)}</span>
            </div>

            <div class="meta">
              <b>DATE COMPLETED</b>
              <span>${gaawowDate(x.completion_date)}</span>
            </div>

            <div class="meta">
              <b>DATE ISSUED</b>
              <span>${gaawowDate(x.issue_date)}</span>
            </div>

          </div>

        </div>

        <div class="center-column">

          <img
            class="academy-logo"
            src="${GAAWOW_CONFIG.LOGO_URL}"
            alt="GAAWOW Academy"
          >

          <div class="academy-name">
            GAAWOW ACADEMY
          </div>

          <div class="motto">
            Ilayska Aqoonta iyo Xirfadda
          </div>

          <div class="certificate-title">
            CERTIFICATE
          </div>

          <div class="certificate-subtitle">
            OF COMPLETION
          </div>

          <div class="presented">
            This certificate is proudly presented to
          </div>

          <div class="student-name">
            ${gaawowEscape(x.student_name || "STUDENT NAME")}
          </div>

          <div class="completion-text">
            for successfully completing the required training
            and demonstrating satisfactory achievement in
          </div>

          <div class="course-name">
            ${gaawowEscape(x.course_name || "COURSE NAME")}
          </div>

          <div class="location">
            Bur Hakaba Bay, Somalia
          </div>

          <div class="verification-line">
            Certificate ID:
            <strong>${gaawowEscape(x.certificate_id || "—")}</strong>
          </div>

        </div>

        <div class="right-column">

          <div class="verify-title">
            VERIFY
          </div>

          <div class="qr-box">
            <img
              src="${gaawowQR(verifyUrl)}"
              alt="Verification QR Code"
            >
          </div>

          <div class="verify-code">
            ${gaawowEscape(x.verify_code || "—")}
          </div>

          <div class="scan-text">
            Scan QR code to verify
            certificate authenticity
          </div>

          <div class="verify-url">
            ${GAAWOW_CONFIG.VERIFY_URL}
          </div>

        </div>

      </div>

      <div class="signature-area">

        <div class="signature">
          <div class="signature-line"></div>
          <strong>ACADEMY DIRECTOR</strong>
          <span>GAAWOW Academy</span>
        </div>

        <div class="seal">
          <div class="seal-circle">
            GAAWOW<br>
            ACADEMY
          </div>
        </div>

        <div class="signature">
          <div class="signature-line"></div>
          <strong>AUTHORIZED SIGNATURE</strong>
          <span>Academic Affairs</span>
        </div>

      </div>

      <div class="certificate-footer">
        <span>Bur Hakaba Bay, Somalia</span>
        <span>615228824 / 625228824</span>
        <span>GAAWOW Academy</span>
      </div>

    </div>
  `;
}

/* Alias used by older HTML buttons */
function render() {
  renderCertificate();
}

/* ---------- Supabase Save ---------- */

async function gaawowSaveCertificate(payload) {

  const response = await fetch(
    GAAWOW_CONFIG.SUPABASE_URL + "/rest/v1/certificates",
    {
      method: "POST",

      headers: {
        apikey: GAAWOW_CONFIG.SUPABASE_KEY,
        Authorization: "Bearer " + GAAWOW_CONFIG.SUPABASE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },

      body: JSON.stringify(payload)
    }
  );

  const text = await response.text();

  if (!response.ok) {
    let message = text;

    try {
      const json = JSON.parse(text);
      message =
        json.message ||
        json.error_description ||
        json.hint ||
        json.details ||
        text;
    } catch (_) {}

    throw new Error(message);
  }

  if (!text) {
    return true;
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    return true;
  }
}

/* ---------- Save Certificate ---------- */

async function saveCertificate() {

  const x = getCertificateData();

  if (!x.student_name) {
    showMessage("Please enter Student Name.", "err");
    return;
  }

  if (!x.course_name) {
    showMessage("Please enter Course Name.", "err");
    return;
  }

  if (!x.certificate_no) {
    generateCertificate();
  }

  const current = getCertificateData();

  const payload = {
    certificate_no: current.certificate_no,
    certificate_id: current.certificate_id,
    verify_code: current.verify_code,
    student_name: current.student_name,
    course_name: current.course_name,
    issue_date: current.issue_date || null,
    expiry_date: null,
    status: (current.status || "completed").toLowerCase()
  };

  try {

    showMessage("Saving certificate to Supabase...", "ok");

    await gaawowSaveCertificate(payload);

    showMessage(
      "Certificate saved successfully to Supabase.",
      "ok"
    );

  } catch (error) {

    console.error("Supabase Certificate Error:", error);

    showMessage(
      "Certificate was NOT saved.<br><br>" +
      "<strong>Supabase error:</strong><br>" +
      gaawowEscape(error.message),
      "err"
    );
  }
}

/* ---------- Messages ---------- */

function showMessage(message, type) {

  const box = document.getElementById("msg");

  if (!box) return;

  box.innerHTML =
    `<div class="msg ${type}">${message}</div>`;
}

/* ---------- Print ---------- */

function printCertificate() {

  const x = getCertificateData();

  if (!x.student_name || !x.certificate_no) {
    generateCertificate();
    return;
  }

  window.print();
}

/* ---------- Clear / New Certificate ---------- */

function newCertificate() {

  const fields = [
    "student_name",
    "student_id",
    "certificate_id",
    "certificate_no",
    "verify_code",
    "course_name",
    "start_date",
    "completion_date",
    "issue_date",
    "photo_url"
  ];

  fields.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const status = document.getElementById("status");

  if (status) {
    status.value = "COMPLETED";
  }

  const sheet = document.getElementById("sheet");

  if (sheet) {
    sheet.innerHTML = "";
  }

  showMessage(
    "Ready for a new certificate.",
    "ok"
  );
}

/* ---------- Page Ready ---------- */

document.addEventListener("DOMContentLoaded", function () {

  const generateButton =
    document.getElementById("generateBtn");

  if (generateButton) {
    generateButton.addEventListener(
      "click",
      generateCertificate
    );
  }

  const previewButton =
    document.getElementById("previewBtn");

  if (previewButton) {
    previewButton.addEventListener(
      "click",
      renderCertificate
    );
  }

  const saveButton =
    document.getElementById("saveBtn");

  if (saveButton) {
    saveButton.addEventListener(
      "click",
      saveCertificate
    );
  }

  const printButton =
    document.getElementById("printBtn");

  if (printButton) {
    printButton.addEventListener(
      "click",
      printCertificate
    );
  }

  const newButton =
    document.getElementById("newBtn");

  if (newButton) {
    newButton.addEventListener(
      "click",
      newCertificate
    );
  }

});
