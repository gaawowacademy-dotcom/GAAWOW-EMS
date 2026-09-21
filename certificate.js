/* =========================================================
   GAAWOW EMS
   CERTIFICATE GENERATOR V9.1
   CLEAN-TEMPLATE / DATABASE-SAFE

   Template (placeholder text already removed):
   ./certificate-template-v9.png

   V9 no longer erases anything at runtime. The template ships
   with empty fields, so every value is drawn on clean paper and
   nothing looks patched or "edited".

   Uses existing certificates schema only. No schema changes.
   ========================================================= */

const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* V9.1 template: student values, signature names and footer contact
   text are ALL removed, so they are drawn by this script. Do not point
   this at an older clean template (the footer text would print twice). */
const TEMPLATE_FILE = "certificate-template-v9.png";
/* Same V9 image; extra names cover GitHub adding "-1" / "-2" to a re-upload. */
const TEMPLATE_CANDIDATES = [
  `./${TEMPLATE_FILE}`,
  "./certificate-template-v9-1.png",
  "./certificate-template-v9-2.png",
  "./certificate-template-v9 (1).png"
];
let loadedTemplateName = TEMPLATE_FILE;

/* Optional: full public site address used inside the QR code, e.g.
   "https://gaawowacademy.com/". Leave "" to use the folder this page is in. */
const VERIFY_BASE_URL = "";

/* Footer + signature defaults (director / academic head can also be typed
   in the form fields directorName / academicHeadName). */
const CONTACT = {
  address: "Burhakaba, Bay, Somalia",
  phones: ["+252 615 228 824", "+252 625 228 824"]
};
const DEFAULT_DIRECTOR = "Abdirahman H. Mohamed";
const DEFAULT_ACADEMIC_HEAD = "Hodan Yusuf";

/* Supabase storage buckets tried when photo_url is only a file path. */
const PHOTO_BUCKETS = ["student-photos", "student_photos", "students", "photos", "avatars", "profile-photos", "uploads"];

/* Layout coordinates are in the 1536x1024 template space.
   The canvas is rendered at SCALE x for a sharper HD export. */
const W = 1536;
const H = 1024;
const SCALE = 2;

const NAVY = "#0A1A44";
const INK = "#111827";
const SANS = "Arial, Helvetica, sans-serif";
const SCRIPT = '"Great Vibes", "Snell Roundhand", cursive';
const SERIF = '"Cinzel", Georgia, "Times New Roman", serif';

const LAYOUT = {
  // left information column (baseline y)
  fieldX: 120,
  fieldSize: 18,
  fieldMaxWidth: 255,
  studentIdY: 488,
  certificateIdY: 558,
  courseY: 627,
  dateStartedY: 692,
  dateCompletedY: 755,
  dateIssuedY: 818,

  // status pill
  pill: { x: 120, y: 866, w: 145, h: 31, r: 4 },

  // centre block
  centerX: 812,
  nameY: 550,
  nameSize: 78,
  nameMaxWidth: 610,
  courseMainY: 691,
  courseMainSize: 40,
  courseMainMaxWidth: 425,

  // student photo (circle inside the gold ring, cut by the ribbon)
  photo: { cx: 211, cy: 299, r: 109, cutY: 386, x: 102, y: 190, w: 218, h: 196 },

  // QR (inside the gold frame, above the VERIFY CERTIFICATE button)
  qr: { x: 1284, y: 424, size: 158 },

  // signatures (names sit on the gold line, labels stay in the template)
  directorX: 528,
  academicHeadX: 1080,
  signatureY: 858,
  signatureSize: 32,
  directorMaxWidth: 240,
  academicHeadMaxWidth: 190,

  // footer (white text on the navy bar)
  footerSize: 15,
  addressX: 149,
  addressY: 997,
  addressMaxWidth: 190,
  phoneX: 437,
  phoneY1: 987,
  phoneY2: 1005,
  phoneMaxWidth: 185
};

const STATUS_STYLES = {
  valid:     { text: "VALID",     color: "#166534", border: "#1D8B33" },
  graduated: { text: "GRADUATED", color: "#166534", border: "#1D8B33" },
  pending:   { text: "PENDING",   color: "#92400E", border: "#D97706" },
  expired:   { text: "EXPIRED",   color: "#4B5563", border: "#6B7280" },
  revoked:   { text: "REVOKED",   color: "#991B1B", border: "#DC2626" }
};

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

function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";
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

function verificationUrlFor(code) {
  let base = VERIFY_BASE_URL
    ? VERIFY_BASE_URL.replace(/\/?$/, "/")
    : `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "")}`;
  return `${base}verify.html?code=${encodeURIComponent(code)}`;
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

/* ---------------- TEMPLATE + FONTS ---------------- */

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
      templateImage = await loadImage(url, false);
      loadedTemplateName = path.replace("./", "");
      setPreviewStatus(`Official template loaded: ${path.replace("./", "")}`);
      drawTemplateOnly();
      return;
    } catch (e) {
      console.warn("Template load failed:", path, e);
      lastError = e;
    }
  }

  throw new Error(
    `${TEMPLATE_FILE} was not found in the GAAWOW-EMS root. ` +
    `Upload it next to certificate.html. (${lastError?.message || ""})`
  );
}

/* Canvas does not download web fonts by itself. Without this the name and
   course are drawn in a fallback font on the first render. */
async function ensureFonts() {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.all([
      document.fonts.load('400 78px "Great Vibes"', "Student Name"),
      document.fonts.load('700 40px "Cinzel"', "COURSE NAME"),
      document.fonts.load('500 40px "Cinzel"', "COURSE NAME")
    ]);
    await document.fonts.ready;
  } catch (e) {
    console.warn("Font preload failed, fallback fonts will be used:", e);
  }
}

function prepareCanvas() {
  const canvas = $("certificateCanvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;

  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(templateImage, 0, 0, W, H);
  return { canvas, ctx };
}

function drawTemplateOnly() {
  if (!templateImage || !$("certificateCanvas")) return;
  prepareCanvas();
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

function fitSize(ctx, text, maxWidth, startSize, family, weight, minSize = 12) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 1;
  }
  return size;
}

/* All text is drawn on the ALPHABETIC baseline so it sits on the same
   line as the template labels. */
function drawText(ctx, text, x, baselineY, opts) {
  const {
    size, family, color, weight = "400", align = "left",
    maxWidth = null, minSize = 12
  } = opts;

  const finalSize = maxWidth
    ? fitSize(ctx, text, maxWidth, size, family, weight, minSize)
    : size;

  ctx.font = `${weight} ${finalSize}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, baselineY);
}

function valueOf(id, fallback = "") {
  return $(id)?.value?.trim() || fallback;
}

function drawField(ctx, text, baselineY) {
  drawText(ctx, text || "—", LAYOUT.fieldX, baselineY, {
    size: LAYOUT.fieldSize,
    family: SANS,
    color: INK,
    maxWidth: LAYOUT.fieldMaxWidth
  });
}

function drawStatusPill(ctx, statusValue) {
  const style = STATUS_STYLES[String(statusValue || "valid").toLowerCase()]
    || STATUS_STYLES.valid;
  const p = LAYOUT.pill;

  roundedRect(ctx, p.x + 1, p.y + 1, p.w - 2, p.h - 2, p.r);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = style.border;
  ctx.stroke();

  drawText(ctx, style.text, p.x + p.w / 2, p.y + p.h / 2 + 6, {
    size: 18,
    family: SANS,
    color: style.color,
    weight: "700",
    align: "center",
    maxWidth: p.w - 20
  });
}

/* ---------------- STUDENT PHOTO ---------------- */

function storageRefFromUrl(url) {
  const m = String(url).match(/\/storage\/v1\/object\/(?:public|sign|authenticated)?\/?([^/]+)\/([^?]+)/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

/* Fetch as a blob so the canvas never gets tainted, then decode. */
async function loadPhotoFromUrl(url) {
  let blobError = null;

  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (blob.type && !blob.type.startsWith("image/")) {
      throw new Error(`not an image (${blob.type})`);
    }
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await loadImage(objectUrl, false);
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    }
  } catch (e) {
    blobError = e;
  }

  // Second chance: plain CORS image element.
  try {
    return await loadImage(url, true);
  } catch (e) {
    const reason = String(blobError?.message || "");
    throw new Error(
      /HTTP \d+/.test(reason) ? reason : `blocked or unreachable (${reason || "CORS/network"})`
    );
  }
}

/* Builds every address worth trying for a stored photo value. */
async function photoCandidates(raw) {
  const value = String(raw || "").trim();
  const out = [];
  const add = u => { if (u && !out.includes(u)) out.push(u); };

  if (/^(https?:|data:|blob:)/i.test(value)) {
    add(value);
    if (/\s/.test(value)) add(encodeURI(value));
    if (value.includes("/storage/v1/object/") &&
        !/\/storage\/v1\/object\/(public|sign|authenticated)\//.test(value)) {
      add(value.replace("/storage/v1/object/", "/storage/v1/object/public/"));
    }
    const ref = storageRefFromUrl(value);
    if (ref) {
      try {
        const { data } = await supabaseClient.storage
          .from(ref.bucket).createSignedUrl(ref.path, 600);
        if (data?.signedUrl) add(data.signedUrl);
      } catch (e) { /* ignore */ }
    }
    return out;
  }

  // Only a storage path was saved (e.g. "student-photos/abc.jpg" or "abc.jpg").
  const path = value.replace(/^\/+/, "");
  const parts = path.split("/");
  const guesses = [];
  if (parts.length > 1) guesses.push({ bucket: parts[0], path: parts.slice(1).join("/") });
  for (const b of PHOTO_BUCKETS) guesses.push({ bucket: b, path });

  for (const g of guesses) {
    try {
      const { data } = supabaseClient.storage.from(g.bucket).getPublicUrl(g.path);
      add(data?.publicUrl);
    } catch (e) { /* ignore */ }
  }
  for (const g of guesses.slice(0, 3)) {
    try {
      const { data } = await supabaseClient.storage
        .from(g.bucket).createSignedUrl(g.path, 600);
      if (data?.signedUrl) add(data.signedUrl);
    } catch (e) { /* ignore */ }
  }
  return out;
}

/* Returns { img } on success or { error } with a readable reason. */
async function loadStudentPhoto(rawUrl) {
  if (!rawUrl) return { img: null, error: null };

  const candidates = await photoCandidates(rawUrl);
  let lastReason = "no usable address";

  for (const url of candidates) {
    try {
      return { img: await loadPhotoFromUrl(url), error: null };
    } catch (e) {
      lastReason = e.message || String(e);
      console.warn("Photo attempt failed:", url, lastReason);
    }
  }
  return { img: null, error: lastReason };
}

/* The photo is cut at cutY so the template ribbon stays visible. */
function drawStudentPhoto(ctx, img) {
  if (!img) return;
  const P = LAYOUT.photo;

  ctx.save();
  ctx.beginPath();
  ctx.arc(P.cx, P.cy, P.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(0, 0, W, P.cutY);
  ctx.clip();

  // "cover" fit, keeping the face (upper part of the picture) visible
  const ratio = Math.max(P.w / img.naturalWidth, P.h / img.naturalHeight);
  const sw = img.naturalWidth * ratio;
  const sh = img.naturalHeight * ratio;
  const dx = P.x + (P.w - sw) / 2;
  const dy = P.y - (sh - P.h) * 0.25;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(P.cx - P.r, P.cy - P.r, P.r * 2, P.r * 2);
  ctx.drawImage(img, dx, dy, sw, sh);
  ctx.restore();
}

/* ---------------- QR CODE ---------------- */

const QR_FALLBACK_SCRIPTS = [
  "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js",
  "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Script failed: ${src}`));
    document.head.appendChild(el);
  });
}

/* Returns "qrcode" (qrcode@1.5.3), "generator" (qrcode-generator) or null. */
async function ensureQRLibrary() {
  const which = () => {
    if (window.QRCode && typeof window.QRCode.toCanvas === "function") return "qrcode";
    if (typeof window.qrcode === "function") return "generator";
    return null;
  };

  if (which()) return which();

  for (const src of QR_FALLBACK_SCRIPTS) {
    try {
      await loadScript(src);
      if (which()) return which();
    } catch (e) {
      console.warn(e.message);
    }
  }
  return null;
}

/* Draws the QR on a private canvas with a whole number of pixels per module,
   so it is perfectly sharp and scannable at any zoom. */
async function makeQRCanvas(text, targetPx) {
  const lib = await ensureQRLibrary();
  if (!lib) {
    throw new Error("QR code library could not be loaded. Check the internet connection and try again.");
  }

  const canvas = document.createElement("canvas");

  if (lib === "qrcode") {
    await QRCode.toCanvas(canvas, text, {
      width: targetPx,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" }
    });
    return canvas;
  }

  const qr = window.qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 2;
  const cell = Math.max(1, Math.floor(targetPx / (n + quiet * 2)));
  const size = cell * (n + quiet * 2);
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d");
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, size, size);
  c.fillStyle = "#000000";
  for (let r = 0; r < n; r++) {
    for (let col = 0; col < n; col++) {
      if (qr.isDark(r, col)) c.fillRect((col + quiet) * cell, (r + quiet) * cell, cell, cell);
    }
  }
  return canvas;
}

async function drawQR(ctx, code) {
  if (!code) throw new Error("Verify code is missing, QR code cannot be created.");

  const Q = LAYOUT.qr;
  const qrCanvas = await makeQRCanvas(verificationUrlFor(code), Q.size * SCALE);

  ctx.save();
  ctx.imageSmoothingEnabled = false;   // keep QR modules razor sharp
  ctx.drawImage(qrCanvas, Q.x, Q.y, Q.size, Q.size);
  ctx.restore();
}

/* ---------------- RENDER ---------------- */

async function renderCertificate() {
  if (!templateImage) {
    throw new Error("Certificate template is not loaded.");
  }

  const student = selectedStudent();
  const course = selectedCourse();

  if (!student) throw new Error("Please select a student.");
  if (!course) throw new Error("Please select a course.");

  await ensureFonts();

  // The template is clean, so we simply draw on top of it.
  const { ctx } = prepareCanvas();

  /* Student photo (ribbon stays visible) */
  const photo = await loadStudentPhoto(student.photo_url);
  drawStudentPhoto(ctx, photo.img);

  /* Left information column */
  drawField(ctx, student.student_id, LAYOUT.studentIdY);
  drawField(ctx, $("certificateId").value, LAYOUT.certificateIdY);
  drawField(ctx, course.name, LAYOUT.courseY);
  drawField(ctx, formatDate($("dateStarted").value), LAYOUT.dateStartedY);
  drawField(ctx, formatDate($("dateCompleted").value), LAYOUT.dateCompletedY);
  drawField(ctx, formatDate($("issueDate").value), LAYOUT.dateIssuedY);

  /* Status */
  drawStatusPill(ctx, $("status").value);

  /* Student name */
  drawText(ctx, student.full_name || "Student Name", LAYOUT.centerX, LAYOUT.nameY, {
    size: LAYOUT.nameSize,
    family: SCRIPT,
    color: NAVY,
    align: "center",
    maxWidth: LAYOUT.nameMaxWidth,
    minSize: 34
  });

  /* Course name */
  drawText(ctx, (course.name || "Course Name").toUpperCase(), LAYOUT.centerX, LAYOUT.courseMainY, {
    size: LAYOUT.courseMainSize,
    family: SERIF,
    color: NAVY,
    weight: "700",
    align: "center",
    maxWidth: LAYOUT.courseMainMaxWidth,
    minSize: 20
  });

  /* Signatures */
  drawText(ctx, valueOf("directorName", DEFAULT_DIRECTOR), LAYOUT.directorX, LAYOUT.signatureY, {
    size: LAYOUT.signatureSize, family: SCRIPT, color: NAVY, align: "center",
    maxWidth: LAYOUT.directorMaxWidth, minSize: 18
  });
  drawText(ctx, valueOf("academicHeadName", DEFAULT_ACADEMIC_HEAD), LAYOUT.academicHeadX, LAYOUT.signatureY, {
    size: LAYOUT.signatureSize, family: SCRIPT, color: NAVY, align: "center",
    maxWidth: LAYOUT.academicHeadMaxWidth, minSize: 18
  });

  /* Footer contact (white on the navy bar) */
  drawText(ctx, CONTACT.address, LAYOUT.addressX, LAYOUT.addressY, {
    size: LAYOUT.footerSize, family: SANS, color: "#ffffff",
    maxWidth: LAYOUT.addressMaxWidth
  });
  drawText(ctx, CONTACT.phones[0], LAYOUT.phoneX, LAYOUT.phoneY1, {
    size: LAYOUT.footerSize, family: SANS, color: "#ffffff",
    maxWidth: LAYOUT.phoneMaxWidth
  });
  if (CONTACT.phones[1]) {
    drawText(ctx, CONTACT.phones[1], LAYOUT.phoneX, LAYOUT.phoneY2, {
      size: LAYOUT.footerSize, family: SANS, color: "#ffffff",
      maxWidth: LAYOUT.phoneMaxWidth
    });
  }

  /* QR code */
  let qrError = null;
  try {
    await drawQR(ctx, $("verifyCode").value);
  } catch (e) {
    console.error("QR error:", e);
    qrError = e.message || "QR code could not be created.";
  }

  generated = !qrError;
  saved = false;

  if (qrError) {
    setPreviewStatus("QR code failed.");
    throw new Error(qrError);
  }

  if (student.photo_url && !photo.img) {
    setPreviewStatus("Preview generated, but the student photo could not be loaded.");
    showMessage(
      `Student photo could not be loaded: ${photo.error}. ` +
      `Stored value: ${String(student.photo_url).slice(0, 90)}`,
      "error"
    );
    return false;
  }

  setPreviewStatus("Certificate preview generated successfully.");
  return true;
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

  const verificationUrl = verificationUrlFor(verifyCode);

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
    template_url: new URL(loadedTemplateName, window.location.href).href,
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

/* The template is 3:2 (1536x1024), so the PDF/print page uses the same
   ratio (297 x 198 mm). A4 (297 x 210) would stretch the design. */
const PAGE_W_MM = 297;
const PAGE_H_MM = 198;

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
    format: [PAGE_W_MM, PAGE_H_MM],
    compress: true
  });

  pdf.addImage(image, "PNG", 0, 0, PAGE_W_MM, PAGE_H_MM, undefined, "FAST");
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
        @page{size:${PAGE_W_MM}mm ${PAGE_H_MM}mm;margin:0}
        html,body{margin:0;padding:0;background:#fff}
        img{display:block;width:${PAGE_W_MM}mm;height:${PAGE_H_MM}mm}
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

function markDirty() {
  generated = false;
}

function setupEvents() {
  $("studentSelect").addEventListener("change", () => {
    hideMessage();
    syncStudent();
    markDirty();
  });

  $("institutionSelect").addEventListener("change", async () => {
    if (isSuperAdmin()) {
      try {
        await loadCourses($("institutionSelect").value);
      } catch (e) {
        showMessage(e.message || "Unable to load courses.", "error");
      }
      markDirty();
    }
  });

  $("courseSelect").addEventListener("change", () => {
    syncCourse();
    markDirty();
  });

  $("issueDate").addEventListener("change", () => {
    if (!$("dateCompleted").value) {
      $("dateCompleted").value = $("issueDate").value;
    }
    markDirty();
  });

  // Anything that appears on the certificate invalidates the preview.
  ["dateStarted", "dateCompleted", "status", "expiryDate", "certificateType"]
    .forEach(id => $(id)?.addEventListener("change", markDirty));

  $("generateBtn").addEventListener("click", async () => {
    try {
      hideMessage();
      setPreviewStatus("Generating HD certificate...");
      const ok = await renderCertificate();
      if (ok) showMessage("Certificate preview generated successfully.", "success");
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
    ensureFonts();   // warm the web fonts while the user picks a student

    hideMessage();
    setPreviewStatus("Ready. Select a student and course, then Generate Preview.");
  } catch (e) {
    console.error("Certificate Generator initialization error:", e);
    showMessage(e.message || "Unable to initialize Certificate Generator.", "error");
    setPreviewStatus("Generator initialization failed.");
  }
}

document.addEventListener("DOMContentLoaded", init);
