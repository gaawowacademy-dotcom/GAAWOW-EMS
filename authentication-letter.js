"use strict";

const EMS_VERIFY_BASE =
  "https://gaawowacademy-dotcom.github.io/GAAWOW-EMS/verify-auth.html";

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiic5.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

function formatDate(value) {
  if (!value) return "";

  const raw = String(value);
  const date = new Date(
    raw.length === 10 ? raw + "T00:00:00" : raw
  );

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value ?? "";
  }
}

function buildVerificationUrl(code, id) {
  const params = new URLSearchParams();

  params.set("code", code);

  if (id) {
    params.set("id", id);
  }

  return EMS_VERIFY_BASE + "?" + params.toString();
}

function createQRCode(url) {
  const box = document.getElementById("qrcode");

  if (!box) return;

  box.innerHTML = "";

  if (typeof QRCode === "undefined") {
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

function renderAuthenticationLetter(data) {

  setText(
    "status",
    String(data.status || "VALID").toUpperCase()
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
    formatDate(data.admissionDate)
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
    formatDate(data.completionDate)
  );

  setText(
    "authenticatedOn",
    formatDate(data.issueDate)
  );

  const verificationCode =
    data.verificationCode ||
    data.verifyCode ||
    data.documentId;

  const verifyUrl =
    buildVerificationUrl(
      verificationCode,
      data.recordId
    );

  setText(
    "verifyUrl",
    verifyUrl
  );

  createQRCode(verifyUrl);

  document.title =
    "Authentication Letter - " +
    (data.studentName || "GAAWOW ACADEMY");
}

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

  if (!recordId) {
    throw new Error(
      "Authentication Letter record ID lama helin."
    );
  }

  const { data, error } =
    await supabaseClient
      .from("certificates")
      .select("*")
      .eq("id", recordId)
      .maybeSingle();

  if (error) {
    throw new Error(
      "Supabase error: " + error.message
    );
  }

  if (!data) {
    throw new Error(
      "Authentication Letter record lama helin."
    );
  }

  renderAuthenticationLetter({

    recordId: data.id,

    status:
      data.status || "valid",

    documentId:
      data.certificate_no ||
      data.certificate_id ||
      "",

    issueDate:
      data.issue_date,

    studentName:
      data.student_name_snapshot ||
      "",

    studentId:
      data.student_id ||
      "",

    admissionDate:
      data.admission_date,

    course:
      data.course_name_snapshot ||
      "",

    courseId:
      data.course_id ||
      "",

    completionDate:
      data.date_completed ||
      data.issue_date,

    verificationCode:
      data.verify_code ||
      data.certificate_id ||
      data.certificate_no ||
      ""
  });
}

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    try {

      await loadAuthenticationLetter();

    } catch (error) {

      console.error(error);

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
