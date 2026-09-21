/* =========================================================
   GAAWOW EMS
   CERTIFICATE GENERATOR V8.0
   TEMPLATE-SAFE / DATABASE-SAFE

   Template:
   ./certificate-template.png

   Uses existing certificates schema only.
   No schema changes.
   ========================================================= */

const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const TEMPLATE_CANDIDATES = [
  "./certificate-template.png",
  "./Certificate.template.png",
  "./Certificate-template.png"
];

const W = 1536;
const H = 1024;

let currentUser = null;
let currentProfile = null;
let institutions = [];
let students = [];
let courses = [];
let templateImage = null;
let generated = false;
let saved = false;

const $ = id => document.getElementById(id);

function showMessage(text, type = "info") {
  const el = $("message");
  if (!el) return;
  el.textContent = text;
  el.className = `message ${type}`;
}

function hideMessage() {
  const el = $("message");
  if (el) {
    el.textContent = "";
    el.className = "message";
  }
}

function setPreviewStatus(text) {
  const el = $("previewStatus");
  if (el) el.textContent = text;
}

function escapeHTML(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "DD/MM/YYYY";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function safeFileName(value) {
  return String(value || "certificate")
    .replace(/[^\w\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
}

function role() {
  return String(currentProfile?.role || "").toLowerCase().trim();
}

function isSuperAdmin() {
  return role() === "super_admin";
}

function canGenerate() {
  return ["super_admin", "school_admin"].includes(role());
}

/* ---------------- AUTH ---------------- */

async function loadAuth() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) throw new Error(`Authentication error: ${error.message}`);

  if (!data?.user) {
    window.location.href = "index.html";
    return false;
  }

  currentUser = data.user;
  return true;
}

async function loadProfile() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,full_name,role,institution_id,is_active")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) throw new Error(`Profile database error: ${error.message}`);
  if (!data) throw new Error("Your EMS profile was not found.");
  if (data.is_active === false) throw new Error("Your EMS account is inactive.");

  currentProfile = data;

  if (!canGenerate()) {
    throw new Error("You do not have permission to generate certificates.");
  }
}

/* ---------------- TEMPLATE ---------------- */

function loadImage(url, crossOrigin = false) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image could not be loaded: ${url}`));
    img.src = url;
  });
}

async function loadOfficialTemplate() {
  let lastError = null;

  for (const path of TEMPLATE_CANDIDATES) {
    try {
      const url = new URL(path, document.baseURI).href;
      const img = await loadImage(url, false);
      templateImage = img;
      setPreviewStatus(`Official template loaded: ${path.replace("./", "")}`);
      drawTemplateOnly();
      return;
    } catch (e) {
      console.warn("Template load failed:", path, e);
      lastError = e;
    }
  }

  throw lastError || new Error("certificate-template.png was not found in the GAAWOW-EMS root.");
}

function drawTemplateOnly() {
  if (!templateImage) return;
  const canvas = $("certificateCanvas");
  if (!canvas) return;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(templateImage, 0, 0, W, H);
}

/* ---------------- DATA ---------------- */

async function loadInstitutions() {
  const select = $("institutionSelect");
  select.innerHTML = `<option value="">Select institution</option>`;

  let query = supabaseClient
    .from("institutions")
    .select("id,name")
    .order("name", { ascending: true });

  if (!isSuperAdmin() && currentProfile?.institution_id) {
    query = query.eq("id", currentProfile.institution_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Institutions database error: ${error.message}`);

  institutions = data || [];

  for (const item of institutions) {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.name;
    select.appendChild(opt);
  }

  if (currentProfile?.institution_id) {
    select.value = currentProfile.institution_id;
  }

  select.disabled = !isSuperAdmin();
}

async function loadStudents() {
  const select = $("studentSelect");
  select.innerHTML = `<option value="">Loading students...</option>`;

  let query = supabaseClient
    .from("students")
    .select(`
      id,
      institution_id,
      profile_id,
      student_id,
      full_name,
      gender,
      date_of_birth,
      phone,
      email,
      address,
      photo_url,
      admission_date,
      status
    `)
    .order("full_name", { ascending: true });

  if (!isSuperAdmin() && currentProfile?.institution_id) {
    query = query.eq("institution_id", currentProfile.institution_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Students database error: ${error.message}`);

  students = data || [];
  populateStudentSelect();
}

function populateStudentSelect() {
  const select = $("studentSelect");
  select.innerHTML = `<option value="">Select student</option>`;

  for (const student of students) {
    const opt = document.createElement("option");
    opt.value = student.id;
    opt.textContent = `${student.full_name || "Unnamed"} — ${student.student_id || student.id}`;
    select.appendChild(opt);
  }
}

async function loadCourses(institutionId) {
  const select = $("courseSelect");
  if (!select) return;

  select.innerHTML = `<option value="">Loading courses...</option>`;
  select.disabled = true;

  try {
    let query = supabaseClient
      .from("courses")
      .select("id,institution_id,name,code,description,is_active")
      .order("name", { ascending: true });

    // Only restrict by institution when a concrete institution is selected.
    if (institutionId) {
      query = query.eq("institution_id", institutionId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Courses database error: ${error.message}`);

    courses = (data || []).filter(c => c.is_active !== false);

    select.innerHTML = `<option value="">${courses.length ? "Select course" : "No active courses found"}</option>`;

    for (const course of courses) {
      const opt = document.createElement("option");
      opt.value = course.id;
      opt.textContent = course.code ? `${course.name} (${course.code})` : course.name;
      select.appendChild(opt);
    }

    select.disabled = false;

    if (!courses.length) {
      showMessage(
        institutionId
          ? "No active courses were found for the selected institution."
          : "No active courses were found.",
        "info"
      );
    }
  } catch (e) {
    courses = [];
    select.innerHTML = `<option value="">Course loading failed</option>`;
    select.disabled = false;
    throw e;
  }
}

/* ---------------- ID GENERATION ---------------- */

function randomCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateCertificateNumbers() {
  const year = new Date().getFullYear();
  const stamp = String(Date.now()).slice(-6);

  $("certificateNo").value = `CERT-${year}-${stamp}`;
  $("certificateId").value = `CERT_GA_${year}_${stamp}_${randomCode(5)}`;
  $("verifyCode").value = `GAW-${year}-${randomCode(8)}`;
}

/* ---------------- FORM ---------------- */

function selectedStudent() {
  return students.find(s => s.id === $("studentSelect").value) || null;
}

function selectedCourse() {
  return courses.find(c => c.id === $("courseSelect").value) || null;
}

function institutionForCertificate() {
  const selected = $("institutionSelect").value;
  if (selected) return selected;
  return currentProfile?.institution_id || null;
}

function syncStudent() {
  const student = selectedStudent();

  if (!student) {
    $("studentName").value = "";
    $("dateStarted").value = "";
    $("photoBox").style.display = "none";
    $("studentPhotoPreview").removeAttribute("src");
    return;
  }

  $("studentName").value = student.full_name || "";
  $("dateStarted").value = student.admission_date || "";

  if (student.photo_url) {
    $("studentPhotoPreview").src = student.photo_url;
    $("photoBox").style.display = "block";
  } else {
    $("photoBox").style.display = "none";
  }

  if (student.institution_id) {
    if (isSuperAdmin()) {
      $("institutionSelect").value = student.institution_id;
    }
    loadCourses(student.institution_id).catch(e => {
      console.error("Student course load failed:", e);
      showMessage(e.message || "Unable to load courses for this student.", "error");
    });
  }
}

function syncCourse() {
  const course = selectedCourse();
  $("courseName").value = course?.name || "";
}

function setDefaultDates() {
  const today = todayISO();
  if (!$("issueDate").value) $("issueDate").value = today;
  if (!$("dateCompleted").value) $("dateCompleted").value = $("issueDate").value || today;
  if (!$("status").value) $("status").value = "valid";
}

/* ---------------- CANVAS HELPERS ---------------- */

function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth, startSize, fontFamily, weight = "400") {
  let size = startSize;
  while (size > 12) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 1;
  }
  return size;
}

function drawCentered(ctx, text, x, y, maxWidth, size, font, color, weight = "400") {
  const actual = fitText(ctx, text, maxWidth, size, font, weight);
  ctx.font = `${weight} ${actual}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function drawLeft(ctx, text, x, y, size, font, color, weight = "400") {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function isDarkPlaceholderPixel(r, g, b) {
  const avg = (r + g + b) / 3;
  return avg < 175 && r < 150 && g < 160 && b < 185;
}

function eraseTextByInpainting(ctx, x, y, w, h) {
  const image = ctx.getImageData(x, y, w, h);
  const d = image.data;
  const original = new Uint8ClampedArray(d);

  const get = (px, py) => {
    if (px < 0 || py < 0 || px >= w || py >= h) return null;
    const i = (py * w + px) * 4;
    return [original[i], original[i + 1], original[i + 2]];
  };

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      const r = original[i], g = original[i + 1], b = original[i + 2];

      if (!isDarkPlaceholderPixel(r, g, b)) continue;

      let replacement = null;

      // Find clean background vertically. This preserves the template's
      // subtle paper texture/graphics instead of painting a flat rectangle.
      for (let distance = 2; distance <= 55 && !replacement; distance++) {
        const candidates = [get(px, py - distance), get(px, py + distance)];
        for (const c of candidates) {
          if (!c) continue;
          if (!isDarkPlaceholderPixel(c[0], c[1], c[2])) {
            replacement = c;
            break;
          }
        }
      }

      if (!replacement) replacement = [246, 243, 237];

      d[i] = replacement[0];
      d[i + 1] = replacement[1];
      d[i + 2] = replacement[2];
      d[i + 3] = 255;
    }
  }

  ctx.putImageData(image, x, y);
}

function eraseRegionWithPaper(ctx, x, y, w, h) {
  // Used only for the status value and the verification URL, where the
  // original template contains a fixed sample value that must disappear.
  const image = ctx.getImageData(x, y, w, h);
  const d = image.data;
  const original = new Uint8ClampedArray(d);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      const r = original[i], g = original[i + 1], b = original[i + 2];
      const avg = (r + g + b) / 3;

      // Preserve the white/cream paper and remove colored/black sample text.
      if (avg < 210 || (g > r * 0.9 && g > b * 0.9 && g > 125 && r < 230)) {
        d[i] = 246;
        d[i + 1] = 243;
        d[i + 2] = 237;
        d[i + 3] = 255;
      }
    }
  }

  ctx.putImageData(image, x, y);
}

async function drawStudentPhoto(ctx, url) {
  if (!url) return;

  try {
    const img = await loadImage(url, true);
    const x = 96, y = 183, size = 230;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, 106, 0, Math.PI * 2);
    ctx.clip();

    const ratio = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    const sw = img.naturalWidth * ratio;
    const sh = img.naturalHeight * ratio;

    ctx.drawImage(
      img,
      x + (size - sw) / 2,
      y + (size - sh) / 2,
      sw,
      sh
    );

    ctx.restore();

    /* Keep the original gold circular frame visually intact. */
    ctx.save();
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, 106, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } catch (e) {
    console.warn("Student photo could not be loaded:", e);
  }
}

async function drawQR(ctx, code) {
  if (!code || !window.QRCode) return;

  const verifyUrl =
    `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "")}verify.html?code=${encodeURIComponent(code)}`;

  const qrCanvas = document.createElement("canvas");

  await QRCode.toCanvas(qrCanvas, verifyUrl, {
    width: 190,
    margin: 0,
    errorCorrectionLevel: "H",
    color: {
      dark: "#111111",
      light: "#ffffff"
    }
  });

  /* Exact QR zone from the supplied 1536x1024 template. */
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(1260, 402, 210, 210);
  ctx.drawImage(qrCanvas, 1270, 410, 190, 190);
}

/* ---------------- RENDER ---------------- */

function valueOf(id, fallback = "") {
  return $(id)?.value?.trim() || fallback;
}

function clearDynamicArea(ctx, x, y, w, h) {
  // Soft paper cleanup for dynamic text only. It intentionally does not
  // touch fixed icons, labels, borders, signatures or artwork.
  eraseTextByInpainting(ctx, x, y, w, h);
}

async function renderCertificate() {
  if (!templateImage) {
    throw new Error("Certificate template is not loaded.");
  }

  const student = selectedStudent();
  const course = selectedCourse();

  if (!student) throw new Error("Please select a student.");
  if (!course) throw new Error("Please select a course.");

  const canvas = $("certificateCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  canvas.width = W;
  canvas.height = H;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(templateImage, 0, 0, W, H);

  const navy = "#0B1E63";
  const gold = "#B98216";
  const ink = "#111827";

  /* -------------------------------------------------------
     Remove only the template placeholder text.
     Icons, borders, gold lines and background remain.
     ------------------------------------------------------- */

  // Clean ONLY the areas containing replaceable sample values.
  // Fixed labels/icons/gold rules/background remain untouched.
  clearDynamicArea(ctx, 112, 452, 255, 48);   // Student ID value
  clearDynamicArea(ctx, 112, 517, 255, 48);   // Certificate ID value
  clearDynamicArea(ctx, 112, 582, 255, 48);   // Course value
  clearDynamicArea(ctx, 112, 647, 255, 48);   // Date Started value
  clearDynamicArea(ctx, 112, 712, 255, 48);   // Date Completed value
  clearDynamicArea(ctx, 112, 777, 255, 48);   // Date Issued value

  // Main name/course placeholders.
  clearDynamicArea(ctx, 480, 466, 700, 120);
  clearDynamicArea(ctx, 560, 638, 520, 86);

  // Status sample text only; preserve the green border/pill.
  clearDynamicArea(ctx, 125, 844, 138, 28);

  // Old verification URL only.
  clearDynamicArea(ctx, 1225, 642, 285, 38);

  /* Student photo */
  await drawStudentPhoto(ctx, student.photo_url);

  /* Left information */
  drawLeft(ctx, student.student_id || "—", 120, 477, 17, "Arial", ink, "400");
  drawLeft(ctx, $("certificateId").value || "—", 120, 542, 16, "Arial", ink, "400");
  drawLeft(ctx, course.name || "—", 120, 607, 16, "Arial", ink, "400");
  drawLeft(ctx, formatDate($("dateStarted").value), 120, 672, 16, "Arial", ink, "400");
  drawLeft(ctx, formatDate($("dateCompleted").value), 120, 737, 16, "Arial", ink, "400");

  /* Status pill */
  const statusText = String($("status").value || "valid").toUpperCase();
  roundedRect(ctx, 120, 846, 145, 34, 5);
  ctx.fillStyle = "#f7fbf7";
  ctx.fill();
  ctx.strokeStyle = "#16A34A";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawCentered(ctx, statusText, 192, 863, 130, 15, "Arial", "#166534", "700");

  /* Main student name */
  drawCentered(
    ctx,
    student.full_name || "Student Name",
    800,
    529,
    650,
    73,
    '"Great Vibes", cursive',
    navy,
    "400"
  );

  /* Course name */
  drawCentered(
    ctx,
    course.name || "Course Name",
    800,
    680,
    510,
    38,
    '"Cinzel", Georgia, serif',
    navy,
    "700"
  );

  /* Date issued */
  drawLeft(ctx, formatDate($("issueDate").value), 120, 802, 16, "Arial", ink, "400");

  /* Optional Grade / Score. The field is deliberately optional and is not
     written to the existing certificates table because that column does not
     exist in the current schema. It is rendered only when supplied. */
  const gradeScore = valueOf("gradeScore");
  if (gradeScore) {
    drawCentered(ctx, `GRADE / SCORE: ${gradeScore}`, 1365, 792, 290, 15, "Arial", ink, "700");
  }

  /* Authority / signatory text uses the existing signature positions. */
  const authority = valueOf("awardingAuthority", "Gaawow Academy");
  const director = valueOf("directorName", "Abdirahman H. Mohamed");
  const academicHead = valueOf("academicHeadName", "Hodan Yusuf");

  // The template already contains the signature artwork/lines. These values
  // replace only the editable names beneath those fixed signature areas.
  clearDynamicArea(ctx, 405, 832, 260, 48);
  clearDynamicArea(ctx, 995, 832, 260, 48);
  drawCentered(ctx, director, 530, 855, 250, 24, '"Great Vibes", cursive', navy, "400");
  drawCentered(ctx, academicHead, 1120, 855, 250, 24, '"Great Vibes", cursive', navy, "400");
  drawCentered(ctx, "DIRECTOR", 530, 895, 220, 15, "Arial", ink, "700");
  drawCentered(ctx, "ACADEMIC HEAD", 1120, 895, 220, 15, "Arial", ink, "700");
  drawCentered(ctx, authority, 530, 922, 220, 13, "Arial", ink, "400");
  drawCentered(ctx, authority, 1120, 922, 220, 13, "Arial", ink, "400");

  /* QR */
  await drawQR(ctx, $("verifyCode").value);

  /* Dynamic verification URL — same visual area as the template sample URL. */
  const verificationUrl =
    `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "")}verify.html?code=${encodeURIComponent($("verifyCode").value)}`;
  drawCentered(ctx, verificationUrl, 1365, 661, 260, 13, "Arial", ink, "400");

  generated = true;
  saved = false;
  setPreviewStatus("Certificate preview generated successfully.");
}

/* ---------------- SAVE ---------------- */

async function saveCertificate() {
  if (!generated) await renderCertificate();

  const student = selectedStudent();
  const course = selectedCourse();
  const institutionId = institutionForCertificate();

  if (!student || !course) {
    throw new Error("Student and course are required.");
  }

  if (!institutionId) {
    throw new Error("Institution is required.");
  }

  const issueDate = $("issueDate").value || todayISO();
  const expiryDate = $("expiryDate").value || null;
  const certificateNo = $("certificateNo").value;
  const certificateId = $("certificateId").value;
  const verifyCode = $("verifyCode").value;

  const verificationUrl =
    `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "")}verify.html?code=${encodeURIComponent(verifyCode)}`;

  const hashSource = [
    certificateNo,
    certificateId,
    verifyCode,
    student.id,
    student.student_id || "",
    course.id,
    issueDate,
    expiryDate || "",
    institutionId
  ].join("|");

  const hashCode = await sha256(hashSource);

  const payload = {
    institution_id: institutionId,
    student_id: student.id,
    course_id: course.id,
    certificate_no: certificateNo,
    certificate_id: certificateId,
    verify_code: verifyCode,
    hash_code: hashCode,
    issue_date: issueDate,
    expiry_date: expiryDate,
    status: $("status").value,
    certificate_url: null,
    pdf_url: null,
    qr_url: verificationUrl,
    student_name_snapshot: student.full_name || "",
    course_name_snapshot: course.name || "",
    issued_by: currentUser.id,
    certificate_type: $("certificateType").value || "Certificate of Completion",
    template_url: new URL("certificate-template.png", window.location.href).href,
    student_photo_url: student.photo_url || null,
    verification_url: verificationUrl
  };

  const { data, error } = await supabaseClient
    .from("certificates")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Certificate save error:", error);
    throw new Error(`Certificate save failed: ${error.message}`);
  }

  saved = true;
  showMessage(
    `Certificate saved successfully — ${data.certificate_no || certificateNo}`,
    "success"
  );
  setPreviewStatus("Certificate saved to Supabase successfully.");

  return data;
}

/* ---------------- DOWNLOAD ---------------- */

function downloadCanvas(filename = "GAAWOW-Certificate.png") {
  const canvas = $("certificateCanvas");

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png", 1.0);
  link.click();
}

async function downloadPDF() {
  if (!generated) await renderCertificate();

  const canvas = $("certificateCanvas");
  const image = canvas.toDataURL("image/png", 1.0);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: false
  });

  pdf.addImage(image, "PNG", 0, 0, 297, 210, undefined, "FAST");
  pdf.save(
    `${safeFileName($("studentName").value)}-${safeFileName($("courseName").value)}.pdf`
  );
}

function printCertificate() {
  if (!generated) {
    showMessage("Generate the certificate first.", "error");
    return;
  }

  const canvas = $("certificateCanvas");
  const image = canvas.toDataURL("image/png", 1.0);

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    showMessage("Popup blocked. Please allow popups for printing.", "error");
    return;
  }

  win.document.write(`
    <!doctype html>
    <html>
    <head>
      <title>GAAWOW Certificate</title>
      <style>
        @page{size:A4 landscape;margin:0}
        html,body{margin:0;padding:0;background:#fff}
        img{display:block;width:297mm;height:210mm;object-fit:fill}
      </style>
    </head>
    <body>
      <img src="${image}" alt="GAAWOW Certificate">
      <script>
        window.onload=function(){
          setTimeout(function(){window.print();},400);
        };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
}

function verifyOnline() {
  const code = $("verifyCode").value;
  if (!code) {
    showMessage("Verify code is missing.", "error");
    return;
  }
  window.location.href =
    `verify.html?code=${encodeURIComponent(code)}`;
}

/* ---------------- EVENTS ---------------- */

function setupEvents() {
  $("studentSelect").addEventListener("change", async () => {
    hideMessage();
    syncStudent();
    generated = false;
  });

  $("institutionSelect").addEventListener("change", async () => {
    if (isSuperAdmin()) {
      await loadCourses($("institutionSelect").value);
      generated = false;
    }
  });

  $("courseSelect").addEventListener("change", () => {
    syncCourse();
    generated = false;
  });

  $("issueDate").addEventListener("change", () => {
    if (!$("dateCompleted").value) {
      $("dateCompleted").value = $("issueDate").value;
    }
    generated = false;
  });

  $("generateBtn").addEventListener("click", async () => {
    try {
      hideMessage();
      setPreviewStatus("Generating HD certificate...");
      await renderCertificate();
      showMessage("Certificate preview generated successfully.", "success");
    } catch (e) {
      console.error(e);
      showMessage(e.message || "Unable to generate certificate.", "error");
      setPreviewStatus("Certificate generation failed.");
    }
  });

  $("saveBtn").addEventListener("click", async () => {
    try {
      hideMessage();
      await saveCertificate();
    } catch (e) {
      console.error(e);
      showMessage(e.message || "Unable to save certificate.", "error");
    }
  });

  $("pngBtn").addEventListener("click", async () => {
    try {
      hideMessage();
      if (!generated) await renderCertificate();
      downloadCanvas(
        `${safeFileName($("studentName").value)}-${safeFileName($("courseName").value)}.png`
      );
      showMessage("HD PNG downloaded.", "success");
    } catch (e) {
      showMessage(e.message || "PNG download failed.", "error");
    }
  });

  $("pdfBtn").addEventListener("click", async () => {
    try {
      hideMessage();
      await downloadPDF();
      showMessage("HD PDF downloaded.", "success");
    } catch (e) {
      console.error(e);
      showMessage(e.message || "PDF download failed.", "error");
    }
  });

  $("printBtn").addEventListener("click", () => {
    printCertificate();
  });

  $("verifyBtn").addEventListener("click", verifyOnline);

  $("backBtn").addEventListener("click", () => {
    window.location.href = "certificates.html";
  });
}

/* ---------------- INIT ---------------- */

async function init() {
  try {
    showMessage("Loading Certificate Generator...", "info");

    const authenticated = await loadAuth();
    if (!authenticated) return;

    await loadProfile();
    await loadOfficialTemplate();
    await loadInstitutions();

    await loadStudents();

    const initialInstitution =
      $("institutionSelect").value ||
      currentProfile?.institution_id ||
      "";

    await loadCourses(initialInstitution);

    generateCertificateNumbers();
    setDefaultDates();
    setupEvents();

    hideMessage();
    setPreviewStatus("Ready. Select a student and course, then Generate Preview.");
  } catch (e) {
    console.error("Certificate Generator initialization error:", e);
    showMessage(e.message || "Unable to initialize Certificate Generator.", "error");
    setPreviewStatus("Generator initialization failed.");
  }
}

document.addEventListener("DOMContentLoaded", init);
