/*
  GAAWOW ACADEMY - Authentication Letter
  This file is ready for GitHub Pages.
  Replace demo data with your Supabase/EMS record when connecting the system.
*/

const EMS_VERIFY_BASE =
  "https://gaawowacademy-dotcom.github.io/GAAWOW-EMS/verify.html";

const demoRecord = {
  status: "VALID",
  documentId: "AUTH-00001",
  issueDate: "29 September 2026",
  studentName: "Student Full Name",
  studentId: "STU-00001",
  admissionDate: "01 January 2026",
  course: "General Health",
  courseId: "GH-001",
  completionDate: "30 June 2026"
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "";
}

function buildVerificationUrl(code) {
  return `${EMS_VERIFY_BASE}?code=${encodeURIComponent(code)}`;
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

function renderAuthenticationLetter(record) {
  const data = { ...demoRecord, ...record };

  setText("status", data.status || "VALID");
  setText("documentId", data.documentId);
  setText("issueDate", formatDate(data.issueDate));

  setText("studentName", data.studentName);
  setText("studentId", data.studentId);
  setText("admissionDate", formatDate(data.admissionDate));

  setText("course", data.course);
  setText("courseId", data.courseId);
  setText("completionDate", formatDate(data.completionDate));

  setText("authenticatedOn", formatDate(data.issueDate));

  const verificationCode =
    data.verificationCode || data.documentId || data.certificateId;

  const verifyUrl = buildVerificationUrl(verificationCode);
  setText("verifyUrl", verifyUrl);
  createQRCode(verifyUrl);

  document.title =
    `Authentication Letter - ${data.studentName || "GAAWOW ACADEMY"}`;
}

function loadDemo() {
  renderAuthenticationLetter(demoRecord);
}

function clearLetter() {
  const ids = [
    "status", "documentId", "issueDate", "studentName", "studentId",
    "admissionDate", "course", "courseId", "completionDate",
    "authenticatedOn", "verifyUrl"
  ];

  ids.forEach(id => setText(id, ""));
  const qr = document.getElementById("qrcode");
  if (qr) qr.innerHTML = "";
}

/*
  EMS/Supabase integration point.

  Example:
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("certificate_id", certificateId)
    .single();

  Then:
  renderAuthenticationLetter({
    documentId: data.certificate_id,
    studentName: data.student_name,
    course: data.course,
    ...
  });
*/

document.addEventListener("DOMContentLoaded", () => {
  loadDemo();
});
