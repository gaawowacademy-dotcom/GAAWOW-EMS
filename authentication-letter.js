"use strict";

/* =========================================================
   GAAWOW ACADEMY
   Authentication Letter
   Student + Certificate Database Connection
   ========================================================= */

const EMS_VERIFY_BASE =
  "https://gaawowacademy-dotcom.github.io/GAAWOW-EMS/verify-auth.html";

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiic5.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient = window.supabase
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    )
  : null;


/* =========================================================
   HELPERS
   ========================================================= */

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent =
      value === null || value === undefined
        ? ""
        : String(value);
  }
}


function formatDate(value) {
  if (!value) return "";

  const raw = String(value);

  const date = new Date(
    raw.length === 10
      ? raw + "T00:00:00"
      : raw
  );

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}


/* =========================================================
   VERIFICATION URL
   ========================================================= */

function buildVerificationUrl(code, recordId) {

  const params = new URLSearchParams();

  if (code) {
    params.set("code", code);
  }

  if (recordId) {
    params.set("id", recordId);
  }

  return EMS_VERIFY_BASE + "?" + params.toString();
}


/* =========================================================
   QR CODE
   ========================================================= */

function createQRCode(url) {

  const box =
    document.getElementById("qrcode");

  if (!box) return;

  box.innerHTML = "";

  if (
    typeof QRCode === "undefined"
  ) {
    box.textContent = "QR";
    return;
  }

  new QRCode(box, {
    text: url,
    width: 74,
    height: 74,
    colorDark: "#0B1E63",
    colorLight: "#FFFFFF",
    correctLevel: QRCode.CorrectLevel.H
  });
}


/* =========================================================
   RENDER LETTER
   ========================================================= */

function renderAuthenticationLetter(data) {

  setText(
    "status",
    String(
      data.status || "VALID"
    ).toUpperCase()
  );

  setText(
    "documentId",
    data.documentId || ""
  );

  setText(
    "issueDate",
    formatDate(data.issueDate)
  );

  setText(
    "studentName",
    data.studentName || ""
  );

  setText(
    "studentId",
    data.studentId || ""
  );

  setText(
    "admissionDate",
    formatDate(
      data.admissionDate
    )
  );

  setText(
    "course",
    data.course || ""
  );

  setText(
    "courseId",
    data.courseId || ""
  );

  setText(
    "completionDate",
    formatDate(
      data.completionDate
    )
  );

  setText(
    "authenticatedOn",
    formatDate(
      data.issueDate
    )
  );


  const verificationCode =
    data.verificationCode ||
    data.verifyCode ||
    data.documentId ||
    "";


  const verifyUrl =
    buildVerificationUrl(
      verificationCode,
      data.recordId
    );


  setText(
    "verifyUrl",
    verifyUrl
  );


  createQRCode(
    verifyUrl
  );


  document.title =
    "Authentication Letter - " +
    (
      data.studentName ||
      "GAAWOW ACADEMY"
    );
}


/* =========================================================
   LOAD CERTIFICATE RECORD
   ========================================================= */

async function loadCertificateRecord(recordId) {

  const result =
    await supabaseClient
      .from("certificates")
      .select("*")
      .eq("id", recordId)
      .maybeSingle();


  if (result.error) {

    throw new Error(
      "Certificates database error: " +
      result.error.message
    );
  }


  if (!result.data) {

    throw new Error(
      "Certificate record lama helin."
    );
  }


  return result.data;
}


/* =========================================================
   LOAD STUDENT
   ========================================================= */

async function loadStudent(studentId) {

  if (!studentId) {
    return null;
  }


  const result =
    await supabaseClient
      .from("students")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();


  if (result.error) {

    console.warn(
      "Student lookup warning:",
      result.error.message
    );

    return null;
  }


  return result.data || null;
}


/* =========================================================
   MAIN LOADER
   ========================================================= */

async function loadAuthenticationLetter() {

  if (!supabaseClient) {

    throw new Error(
      "Supabase library lama helin."
    );
  }


  const params =
    new URLSearchParams(
      window.location.search
    );


  const recordId =
    params.get("regen");


  /* -----------------------------------------
     REQUIRE REAL DATABASE RECORD
     ----------------------------------------- */

  if (!recordId) {

    throw new Error(
      "Authentication Letter record ID lama helin."
    );
  }


  /* -----------------------------------------
     GET CERTIFICATE
     ----------------------------------------- */

  const certificate =
    await loadCertificateRecord(
      recordId
    );


  /* -----------------------------------------
     GET STUDENT
     ----------------------------------------- */

  const student =
    await loadStudent(
      certificate.student_id
    );


  /* -----------------------------------------
     STUDENT DATA
     Priority:
     students table first
     certificate snapshot second
     ----------------------------------------- */

  const studentName =
    student?.full_name ||
    certificate.student_name_snapshot ||
    "";


  const studentId =
    student?.student_id ||
    certificate.student_id ||
    "";


  const admissionDate =
    student?.admission_date ||
    certificate.admission_date ||
    "";


  /* -----------------------------------------
     COURSE
     ----------------------------------------- */

  const courseName =
    certificate.course_name_snapshot ||
    certificate.course_name ||
    "";


  const courseId =
    certificate.course_id ||
    "";


  /* -----------------------------------------
     COMPLETION DATE
     ----------------------------------------- */

  const completionDate =
    certificate.date_completed ||
    certificate.completion_date ||
    certificate.issue_date ||
    "";


  /* -----------------------------------------
     DOCUMENT ID
     ----------------------------------------- */

  const documentId =
    certificate.certificate_no ||
    certificate.certificate_id ||
    "";


  /* -----------------------------------------
     VERIFICATION CODE
     ----------------------------------------- */

  const verificationCode =
    certificate.verify_code ||
    certificate.certificate_id ||
    certificate.certificate_no ||
    "";


  /* -----------------------------------------
     RENDER
     ----------------------------------------- */

  renderAuthenticationLetter({

    recordId:
      certificate.id,

    status:
      certificate.status ||
      "valid",

    documentId:
      documentId,

    issueDate:
      certificate.issue_date,

    studentName:
      studentName,

    studentId:
      studentId,

    admissionDate:
      admissionDate,

    course:
      courseName,

    courseId:
      courseId,

    completionDate:
      completionDate,

    verificationCode:
      verificationCode
  });
}


/* =========================================================
   PAGE START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    try {

      await loadAuthenticationLetter();

    } catch (error) {

      console.error(
        "Authentication Letter Error:",
        error
      );


      setText(
        "status",
        "ERROR"
      );


      setText(
        "documentId",
        error.message
      );
    }

  }
);
