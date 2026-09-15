const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


const searchInput =
  document.getElementById("searchInput");

const verifyBtn =
  document.getElementById("verifyBtn");

const message =
  document.getElementById("message");

const certificate =
  document.getElementById("certificate");


function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function showMessage(text, type) {

  message.textContent = text;

  message.className =
    "message " + type;
}


function hideMessage() {

  message.textContent = "";

  message.className =
    "message";
}


function formatDate(date) {

  if (!date) {
    return "—";
  }

  const d =
    new Date(date + "T00:00:00");

  if (isNaN(d.getTime())) {
    return date;
  }

  return d.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  );
}


function getCurrentStatus(cert) {

  if (cert.status === "revoked") {
    return "revoked";
  }

  if (
    cert.expiry_date &&
    new Date(cert.expiry_date + "T23:59:59") < new Date()
  ) {
    return "expired";
  }

  if (cert.status === "expired") {
    return "expired";
  }

  return "valid";
}


function clearCertificate() {

  certificate.style.display = "none";

  document.getElementById("studentName").textContent = "—";
  document.getElementById("courseName").textContent = "—";
  document.getElementById("certificateNo").textContent = "—";
  document.getElementById("certificateId").textContent = "—";
  document.getElementById("verifyCode").textContent = "—";
  document.getElementById("issueDate").textContent = "—";
  document.getElementById("expiryDate").textContent = "—";
  document.getElementById("status").textContent = "—";

  document.getElementById("certificateLink").style.display =
    "none";

  document.getElementById("pdfLink").style.display =
    "none";

  document.getElementById("qrLink").style.display =
    "none";
}


function showCertificate(cert) {

  const currentStatus =
    getCurrentStatus(cert);

  document.getElementById("studentName").textContent =
    cert.student_name_snapshot || "—";

  document.getElementById("courseName").textContent =
    cert.course_name_snapshot || "—";

  document.getElementById("certificateNo").textContent =
    cert.certificate_no || "—";

  document.getElementById("certificateId").textContent =
    cert.certificate_id || "—";

  document.getElementById("verifyCode").textContent =
    cert.verify_code || "—";

  document.getElementById("issueDate").textContent =
    formatDate(cert.issue_date);

  document.getElementById("expiryDate").textContent =
    formatDate(cert.expiry_date);


  const statusElement =
    document.getElementById("status");

  statusElement.textContent =
    currentStatus.toUpperCase();

  statusElement.className =
    "value status-" + currentStatus;


  const statusBadge =
    document.getElementById("statusBadge");

  if (currentStatus === "valid") {

    statusBadge.textContent =
      "✓ CERTIFICATE VERIFIED";

    statusBadge.style.background =
      "#16a34a";

  } else if (currentStatus === "revoked") {

    statusBadge.textContent =
      "✕ CERTIFICATE REVOKED";

    statusBadge.style.background =
      "#dc2626";

  } else {

    statusBadge.textContent =
      "⚠ CERTIFICATE EXPIRED";

    statusBadge.style.background =
      "#b45309";
  }


  setupLink(
    "certificateLink",
    cert.certificate_url,
    "View Certificate"
  );

  setupLink(
    "pdfLink",
    cert.pdf_url,
    "View PDF"
  );

  setupLink(
    "qrLink",
    cert.qr_url,
    "QR Verification"
  );


  certificate.style.display =
    "block";
}


function setupLink(id, url, text) {

  const link =
    document.getElementById(id);

  if (url && url.trim() !== "") {

    link.href = url;

    link.textContent = text;

    link.style.display =
      "block";

  } else {

    link.style.display =
      "none";
  }
}


async function verifyCertificate() {

  const search =
    searchInput.value.trim();

  if (!search) {

    clearCertificate();

    showMessage(
      "Please enter a Certificate ID, Certificate No, or Verify Code.",
      "error"
    );

    return;
  }


  hideMessage();

  clearCertificate();

  verifyBtn.disabled = true;

  verifyBtn.textContent =
    "VERIFYING...";


  try {

    const escaped =
      search.replace(/,/g, "");


    const { data, error } =
      await supabaseClient
        .from("certificates")
        .select("*")
        .or(
          `certificate_id.eq.${escaped},certificate_no.eq.${escaped},verify_code.eq.${escaped}`
        )
        .limit(1);


    if (error) {

      console.error(
        "Certificate verification error:",
        error
      );

      throw error;
    }


    if (!data || data.length === 0) {

      showMessage(
        "Certificate not found. Please check the Certificate ID, Certificate No, or Verify Code.",
        "error"
      );

      return;
    }


    const cert =
      data[0];


    showCertificate(cert);


    if (getCurrentStatus(cert) === "valid") {

      showMessage(
        "Certificate successfully verified.",
        "success"
      );

    } else if (
      getCurrentStatus(cert) === "revoked"
    ) {

      showMessage(
        "This certificate has been revoked.",
        "error"
      );

    } else {

      showMessage(
        "This certificate has expired.",
        "error"
      );
    }

  } catch (error) {

    console.error(error);

    showMessage(
      "Unable to verify certificate. Please try again.",
      "error"
    );

  } finally {

    verifyBtn.disabled =
      false;

    verifyBtn.textContent =
      "VERIFY";
  }
}


verifyBtn.addEventListener(
  "click",
  verifyCertificate
);


searchInput.addEventListener(
  "keydown",
  function(event) {

    if (event.key === "Enter") {
      verifyCertificate();
    }

  }
);


// Automatic verification when URL contains ?code=...
window.addEventListener(
  "DOMContentLoaded",
  function() {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const code =
      params.get("code");

    if (code) {

      searchInput.value =
        code;

      verifyCertificate();
    }

  }
);
