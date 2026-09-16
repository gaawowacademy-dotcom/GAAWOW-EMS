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


function clearCertificate() {

  certificate.style.display =
    "none";

  document.getElementById(
    "studentName"
  ).textContent = "";

  document.getElementById(
    "courseName"
  ).textContent = "";

  document.getElementById(
    "certificateNo"
  ).textContent = "";

  document.getElementById(
    "certificateId"
  ).textContent = "";

  document.getElementById(
    "verifyCode"
  ).textContent = "";

  document.getElementById(
    "issueDate"
  ).textContent = "";

  document.getElementById(
    "expiryDate"
  ).textContent = "";

  document.getElementById(
    "status"
  ).textContent = "";

  document.getElementById(
    "statusBadge"
  ).textContent = "";

  hideLink("certificateLink");
  hideLink("pdfLink");
  hideLink("qrLink");
}


function hideLink(id) {

  const link =
    document.getElementById(id);

  link.style.display =
    "none";

  link.href = "#";
}


function setupLink(id, url) {

  const link =
    document.getElementById(id);

  if (
    url &&
    url.trim() !== ""
  ) {

    link.href =
      url.trim();

    link.style.display =
      "block";

  } else {

    hideLink(id);
  }
}


function calculateStatus(cert) {

  if (cert.status === "revoked") {
    return "revoked";
  }

  if (
    cert.expiry_date &&
    new Date(
      cert.expiry_date + "T23:59:59"
    ) < new Date()
  ) {
    return "expired";
  }

  if (cert.status === "expired") {
    return "expired";
  }

  return "valid";
}


function displayCertificate(cert) {

  const currentStatus =
    calculateStatus(cert);


  document.getElementById(
    "studentName"
  ).textContent =
    cert.student_name || "—";


  document.getElementById(
    "courseName"
  ).textContent =
    cert.course_name || "—";


  document.getElementById(
    "certificateNo"
  ).textContent =
    cert.certificate_no || "—";


  document.getElementById(
    "certificateId"
  ).textContent =
    cert.certificate_id || "—";


  document.getElementById(
    "verifyCode"
  ).textContent =
    cert.verify_code || "—";


  document.getElementById(
    "issueDate"
  ).textContent =
    formatDate(cert.issue_date);


  document.getElementById(
    "expiryDate"
  ).textContent =
    formatDate(cert.expiry_date);


  const status =
    document.getElementById("status");


  status.textContent =
    currentStatus.toUpperCase();


  status.className =
    "info-value status-" +
    currentStatus;


  const badge =
    document.getElementById(
      "statusBadge"
    );


  if (currentStatus === "valid") {

    badge.textContent =
      "✓ CERTIFICATE VERIFIED";

    badge.style.background =
      "#16a34a";

  } else if (
    currentStatus === "revoked"
  ) {

    badge.textContent =
      "✕ CERTIFICATE REVOKED";

    badge.style.background =
      "#dc2626";

  } else {

    badge.textContent =
      "⚠ CERTIFICATE EXPIRED";

    badge.style.background =
      "#b45309";
  }


  /*
    These fields are intentionally
    not returned by the RPC yet.
    They will work automatically
    if added later.
  */

  setupLink(
    "certificateLink",
    cert.certificate_url
  );

  setupLink(
    "pdfLink",
    cert.pdf_url
  );

  setupLink(
    "qrLink",
    cert.qr_url
  );


  certificate.style.display =
    "block";
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


  clearCertificate();

  hideMessage();


  verifyBtn.disabled =
    true;

  verifyBtn.textContent =
    "VERIFYING...";


  try {

    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        "verify_certificate",
        {
          search_code: search
        }
      );


    if (error) {

      console.error(
        "RPC Error:",
        error
      );

      throw error;
    }


    if (
      !data ||
      data.length === 0
    ) {

      showMessage(
        "Certificate not found. Please check your Certificate ID, Certificate No, or Verify Code.",
        "error"
      );

      return;
    }


    const cert =
      data[0];


    displayCertificate(cert);


    const currentStatus =
      calculateStatus(cert);


    if (
      currentStatus === "valid"
    ) {

      showMessage(
        "✓ Certificate successfully verified.",
        "success"
      );

    } else if (
      currentStatus === "revoked"
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

    console.error(
      "Verification failed:",
      error
    );


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

    if (
      event.key === "Enter"
    ) {

      verifyCertificate();
    }

  }
);


/*
  Automatic verification
  Example:

  verify.html?code=GAW-2026-001
*/

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
