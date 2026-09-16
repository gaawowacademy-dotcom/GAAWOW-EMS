const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

const verifyCodeInput =
  document.getElementById("verifyCode");

const verifyBtn =
  document.getElementById("verifyBtn");

const message =
  document.getElementById("message");

const result =
  document.getElementById("result");

const statusEl =
  document.getElementById("status");

const certificateNo =
  document.getElementById("certificateNo");

const certificateId =
  document.getElementById("certificateId");

const verificationCode =
  document.getElementById("verificationCode");

const studentName =
  document.getElementById("studentName");

const courseName =
  document.getElementById("courseName");

const issueDate =
  document.getElementById("issueDate");

const expiryDate =
  document.getElementById("expiryDate");

const links =
  document.getElementById("links");


function showMessage(text, type) {

  message.textContent = text;

  message.className =
    "message " + type;

  message.style.display = "block";
}


function hideMessage() {

  message.style.display = "none";

}


function formatDate(value) {

  if (!value) {
    return "—";
  }

  const date = new Date(value + "T00:00:00");

  if (isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}


function calculateStatus(cert) {

  if (cert.status === "revoked") {
    return "revoked";
  }

  if (
    cert.expiry_date &&
    new Date(cert.expiry_date + "T23:59:59") < new Date()
  ) {
    return "expired";
  }

  return "valid";
}


function clearResult() {

  result.style.display = "none";

  links.innerHTML = "";

}


function displayCertificate(cert) {

  const effectiveStatus =
    calculateStatus(cert);

  certificateNo.textContent =
    cert.certificate_no || "—";

  certificateId.textContent =
    cert.certificate_id || "—";

  verificationCode.textContent =
    cert.verify_code || "—";

  studentName.textContent =
    cert.student_name || "—";

  courseName.textContent =
    cert.course_name || "—";

  issueDate.textContent =
    formatDate(cert.issue_date);

  expiryDate.textContent =
    formatDate(cert.expiry_date);

  statusEl.textContent =
    effectiveStatus.toUpperCase();

  statusEl.style.background =
    effectiveStatus === "valid"
      ? "#16A34A"
      : effectiveStatus === "expired"
      ? "#D97706"
      : "#DC2626";

  links.innerHTML = "";

  result.style.display = "block";

  if (cert.certificate_url) {

    const a = document.createElement("a");

    a.href = cert.certificate_url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Certificate";

    links.appendChild(a);
  }

  if (cert.pdf_url) {

    const a = document.createElement("a");

    a.href = cert.pdf_url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "PDF";

    links.appendChild(a);
  }

  if (cert.qr_url) {

    const a = document.createElement("a");

    a.href = cert.qr_url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "QR Link";

    links.appendChild(a);
  }

}


async function verifyCertificate() {

  const search =
    verifyCodeInput.value.trim();

  clearResult();
  hideMessage();

  if (!search) {

    showMessage(
      "Please enter a certificate number, ID, or verification code.",
      "error"
    );

    verifyCodeInput.focus();

    return;
  }

  verifyBtn.disabled = true;
  verifyBtn.textContent = "VERIFYING...";

  try {

    const { data, error } =
      await supabaseClient.rpc(
        "verify_certificate",
        {
          search_code: search
        }
      );

    if (error) {

      console.error(
        "Verification error:",
        error
      );

      throw error;
    }

    if (!data || data.length === 0) {

      showMessage(
        "Certificate not found. Please check the code and try again.",
        "error"
      );

      return;
    }

    displayCertificate(data[0]);

    showMessage(
      "Certificate successfully verified.",
      "success"
    );

  } catch (error) {

    console.error(error);

    showMessage(
      "Unable to verify certificate. Please try again.",
      "error"
    );

  } finally {

    verifyBtn.disabled = false;
    verifyBtn.textContent =
      "VERIFY CERTIFICATE";

  }

}


verifyBtn.addEventListener(
  "click",
  verifyCertificate
);


verifyCodeInput.addEventListener(
  "keydown",
  function(event) {

    if (event.key === "Enter") {
      verifyCertificate();
    }

  }
);


// Automatically verify ?code=...
const params =
  new URLSearchParams(
    window.location.search
  );

const urlCode =
  params.get("code");

if (urlCode) {

  verifyCodeInput.value =
    urlCode;

  verifyCertificate();

}
