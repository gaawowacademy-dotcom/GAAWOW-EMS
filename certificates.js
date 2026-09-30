"use strict";

/* =========================================
   GAAWOW EMS
   CERTIFICATES DATABASE MODULE
========================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiic5.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

/* -----------------------------------------
   SUPABASE CLIENT
----------------------------------------- */

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    db: {
      schema: "public"
    },

    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);


/* -----------------------------------------
   CERTIFICATE COLUMNS
----------------------------------------- */

const CERTIFICATE_COLUMNS = `
  id,
  student_id,
  certificate_no,
  certificate_id,
  verify_code,
  issue_date,
  expiry_date,
  status,
  student_name_snapshot,
  certificate_type
`;


/* -----------------------------------------
   LOAD CERTIFICATES
----------------------------------------- */

async function loadCertificatesFromDatabase() {

  console.log(
    "GAAWOW EMS: Connecting to Supabase..."
  );

  try {

    const {
      data,
      error
    } = await db
      .from("certificates")
      .select(CERTIFICATE_COLUMNS)
      .order("issue_date", {
        ascending: false
      });

    if (error) {

      console.error(
        "Supabase database error:",
        error
      );

      throw new Error(
        error.message ||
        "Supabase database request failed."
      );
    }

    console.log(
      "GAAWOW EMS: Certificates loaded:",
      data
    );

    return data || [];

  } catch (error) {

    console.error(
      "GAAWOW EMS: Connection failed:",
      error
    );

    throw error;
  }
}


/* -----------------------------------------
   TEST CONNECTION
----------------------------------------- */

async function testCertificatesConnection() {

  try {

    const {
      data,
      error
    } = await db
      .from("certificates")
      .select("id")
      .limit(1);

    if (error) {

      console.error(
        "TEST FAILED:",
        error
      );

      return false;
    }

    console.log(
      "GAAWOW EMS: Supabase connection OK",
      data
    );

    return true;

  } catch (error) {

    console.error(
      "TEST CONNECTION ERROR:",
      error
    );

    return false;
  }
}


/* -----------------------------------------
   OPEN DOCUMENT
----------------------------------------- */

function openCertificateDocument(row) {

  if (!row || !row.id) {
    console.error(
      "Certificate record ID missing."
    );
    return;
  }

  const id =
    encodeURIComponent(row.id);

  if (
    row.certificate_type ===
    "certificate"
  ) {

    window.location.href =
      `certificate.html?regen=${id}`;

    return;
  }


  if (
    row.certificate_type ===
    "diploma"
  ) {

    window.location.href =
      `certificate.html?regen=${id}&type=diploma`;

    return;
  }


  if (
    row.certificate_type ===
    "authentication_letter"
  ) {

    window.location.href =
      `authentication-letter.html?regen=${id}`;

    return;
  }


  console.error(
    "Unknown certificate type:",
    row.certificate_type
  );
}


/* -----------------------------------------
   VERIFY DOCUMENT
----------------------------------------- */

function verifyCertificate(code) {

  if (!code) {

    console.error(
      "Verification code missing."
    );

    return;
  }

  window.location.href =
    `verify.html?code=${encodeURIComponent(code)}`;
}


/* -----------------------------------------
   START
----------------------------------------- */

window.GAAWOWCertificates = {

  db,

  loadCertificates:
    loadCertificatesFromDatabase,

  testConnection:
    testCertificatesConnection,

  openDocument:
    openCertificateDocument,

  verify:
    verifyCertificate

};
