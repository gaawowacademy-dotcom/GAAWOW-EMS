/* =========================================================
   GAAWOW EMS — CERTIFICATE GENERATOR V4
   ========================================================= */

const GAAWOW_CONFIG = {
  SUPABASE_URL:
    "https://mytyvqwrxnxpxnxpiicj.supabase.co",

  SUPABASE_KEY:
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145",

  LOGO_URL:
    "https://i.ibb.co/4ZCRpm30/gaawow-logo.png",

  VERIFY_URL:
    "https://gaawowacademy-dotcom.github.io/GAAWOW-EMS/verify.html"
};


/* =========================================================
   HELPERS
   ========================================================= */

function gaawowEscape(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    function (m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[m];
    }
  );
}


function gaawowDate(value) {
  if (!value) return "—";

  const d = new Date(value + "T00:00:00");

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d
    .toLocaleDateString("en-GB")
    .replaceAll("/", " / ");
}


function gaawowQR(value) {
  return (
    "https://api.qrserver.com/v1/create-qr-code/" +
    "?size=400x400&data=" +
    encodeURIComponent(value)
  );
}


function randomCode(length = 6) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return result;
}


function generateCertificateNo() {
  const year = new Date().getFullYear();

  return (
    "GA-C-" +
    year +
    "-" +
    String(
      Math.floor(Math.random() * 9999) + 1
    ).padStart(4, "0") +
    "-" +
    randomCode(6)
  );
}


function generateCertificateId() {
  return (
    "CERT_GA_" +
    new Date().getFullYear() +
    "_" +
    randomCode(8)
  );
}


function generateVerifyCode() {
  return randomCode(8);
}


/* =========================================================
   SUPABASE SAVE
   ========================================================= */

async function gaawowSaveCertificate(payload) {

  const response = await fetch(
    GAAWOW_CONFIG.SUPABASE_URL +
      "/rest/v1/certificates",
    {
      method: "POST",

      headers: {
        apikey: GAAWOW_CONFIG.SUPABASE_KEY,

        Authorization:
          "Bearer " +
          GAAWOW_CONFIG.SUPABASE_KEY,

        "Content-Type":
          "application/json",

        Prefer:
          "return=representation"
      },

      body: JSON.stringify(payload)
    }
  );


  if (!response.ok) {

    let errorText = "";

    try {
      errorText =
        await response.text();
    } catch {
      errorText =
        "Unknown Supabase error.";
    }

    throw new Error(
      "Supabase Error: " +
      errorText
    );
  }


  return await response.json();
}


/* =========================================================
   EXPORT
   ========================================================= */

window.GAAWOW_CONFIG =
  GAAWOW_CONFIG;

window.gaawowEscape =
  gaawowEscape;

window.gaawowDate =
  gaawowDate;

window.gaawowQR =
  gaawowQR;

window.gaawowSaveCertificate =
  gaawowSaveCertificate;

window.generateCertificateNo =
  generateCertificateNo;

window.generateCertificateId =
  generateCertificateId;

window.generateVerifyCode =
  generateVerifyCode;
