/* GAAWOW EMS — AUTHENTICATION LETTER GENERATOR v2
   GAAWOW branded, clean field mapping, automatic Reference No / ID / Verify Code,
   dependent Institution -> Student -> Course dropdowns, Grade dropdown,
   regenerate/update support, A4 portrait PNG/PDF/Print.
*/
(() => {
  "use strict";

  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";
  const TEMPLATE_CANDIDATES = [
    "./Authentication%20Letter.png",
    "./Authentication Letter.png",
    "./authentication-letter.png"
  ];

  const W = 1055;
  const H = 1491;
  const $ = id => document.getElementById(id);

  let db = null;
  let user = null;
  let profile = null;
  let template = null;
  let institutions = [];
  let students = [];
  let courses = [];
  let generated = false;
  let regenRow = null;

  const CONTACT = {
    address: "Burhakaba, Bay, Somalia",
    phones: ["+252 615 228 824", "+252 625 228 824"]
  };

  const DEFAULT_DIRECTOR = "Dr. Osmaan Mohamed Ibraahin";
  const DEFAULT_AUTHORITY = "GAAWOW ACADEMY";

  const GRADES = [
    "A+","A","A-","B+","B","B-","C+","C","C-","D+","D","F",
    "PASS","MERIT","DISTINCTION","N/A"
  ];

  const STATUS = ["valid","graduated","pending","expired","revoked"];

  // Coordinates are based on the supplied GAAWOW ACADEMY Authentication Letter.png.
  // All values are drawn INSIDE the template boxes; the background/design is never erased.
  const L = {
    refNo:        {x: 173, y: 333, w: 170, h: 34},
    issueDate:    {x: 422, y: 333, w: 165, h: 34},
    verifyCode:   {x: 670, y: 333, w: 170, h: 34},
    topStatus:    {x: 897, y: 333, w: 160, h: 34},

    photo:        {x: 54, y: 440, w: 188, h: 220},

    studentName:  {x: 310, y: 464, w: 305, h: 36},
    studentId:    {x: 310, y: 526, w: 305, h: 36},
    courseName:   {x: 310, y: 588, w: 305, h: 36},
    courseCode:   {x: 310, y: 650, w: 305, h: 36},

    dateStarted:  {x: 685, y: 464, w: 300, h: 36},
    dateDone:     {x: 685, y: 526, w: 300, h: 36},
    grade:        {x: 685, y: 588, w: 300, h: 36},
    status:       {x: 685, y: 650, w: 300, h: 36},

    // "To Whom It May Concern" body box.
    body:         {x: 60, y: 738, w: 935, h: 183},

    // Official Authentication section.
    authority:    {x: 735, y: 1018, w: 230, h: 30},

    // Verification section.
    qr:           {x: 77, y: 1173, size: 126},
    verCode:      {x: 365, y: 1164, w: 425, h: 34},
    verStatus:    {x: 365, y: 1229, w: 425, h: 30},
    verUrl:       {x: 365, y: 1289, w: 630, h: 28}
  };

  function msg(text, type="info") {
    const e = $("message");
    if (!e) return;
    e.textContent = text || "";
    e.className = text ? `message ${type}` : "message";
  }

  function statusText(text) {
    const e = $("previewStatus");
    if (e) e.textContent = text;
  }

  function val(id) {
    return $(id)?.value?.trim() || "";
  }

  function setv(id, value) {
    if ($(id)) $(id).value = value ?? "";
  }

  function todayISO() {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0,10);
  }

  function dateText(value) {
    if (!value) return "";
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? value
      : d.toLocaleDateString("en-GB", {day:"2-digit", month:"long", year:"numeric"});
  }

  function randomCode(length=6) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let out = "";
    for (let i=0;i<length;i++) out += chars[bytes[i] % chars.length];
    return out;
  }

  function referenceNo() {
    return `GAA-AUTH-${new Date().getFullYear()}-${randomCode(6)}`;
  }

  function authenticationId() {
    return `GAA-AUTH-${Date.now().toString(36).toUpperCase()}-${randomCode(4)}`;
  }

  function verifyCode() {
    return `AUTH-${new Date().getFullYear()}-${randomCode(8)}`;
  }

  function regenId() {
    return new URLSearchParams(location.search).get("regen");
  }

  function role() {
    return String(profile?.role || "").toLowerCase().trim();
  }

  function isSuperAdmin() {
    return role() === "super_admin";
  }

  function institutionIdForProfile() {
    return profile?.institution_id || profile?.institutionId || profile?.school_id || null;
  }

  function selectedText(id) {
    const s = $(id);
    return s?.selectedOptions?.[0]?.dataset?.label ||
           s?.selectedOptions?.[0]?.textContent?.trim() || "";
  }

  function institutionName() { return selectedText("institutionSelect"); }
  function studentName() { return selectedText("studentSelect") || val("studentName"); }

  function selectedStudent() {
    return students.find(s => String(s.id) === String($("studentSelect")?.value)) || null;
  }

  function selectedCourse() {
    return courses.find(c => String(c.id) === String($("courseSelect")?.value)) || null;
  }

  function courseName() {
    return courseDisplayName(selectedCourse()) || selectedText("courseSelect") || val("courseName");
  }

  function courseCode() {
    const c = selectedCourse();
    return courseDisplayCode(c);
  }

  function studentId() {
    const s = selectedStudent();
    return s?.student_id || s?.admission_no || s?.registration_no || "";
  }

  function studentPhotoUrl() {
    const s = selectedStudent();
    return s?.photo_url || s?.profile_photo || s?.student_photo_url || s?.avatar_url || "";
  }

  function baseVerifyUrl() {
    const code = encodeURIComponent(val("verifyCode"));
    const id = encodeURIComponent(val("certificateId"));
    const base = location.origin + location.pathname.replace(/[^/]+$/, "");
    return `${base}verify.html?code=${code}&id=${id}`;
  }

  async function loadImage(src) {
    return new Promise((resolve,reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.crossOrigin = "anonymous";
      img.onerror = () => reject(new Error(`Image load failed: ${src}`));
      img.src = src;
    });
  }

  async function loadTemplate() {
    let last = null;
    for (const src of TEMPLATE_CANDIDATES) {
      try {
        template = await loadImage(src);
        statusText(`GAAWOW template loaded: ${src}`);
        return;
      } catch (e) { last = e; }
    }
    throw new Error(`Authentication Letter.png lama helin. ${last?.message || ""}`);
  }

  async function auth() {
    if (!window.supabase) throw new Error("Supabase CDN lama load-gareyn.");
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}
    });
    const {data,error} = await db.auth.getUser();
    if (error) throw new Error(`Authentication error: ${error.message}`);
    if (!data?.user) {
      location.href = "index.html";
      return false;
    }
    user = data.user;
    return true;
  }

  async function loadProfile() {
    const {data,error} = await db.from("profiles")
      .select("*")
      .eq("id",user.id)
      .maybeSingle();

    if (error) throw new Error(`Profile database error: ${error.message}`);
    if (!data) throw new Error("EMS profile lama helin.");
    if (data.is_active === false) throw new Error("EMS account-ka waa inactive.");
    profile = data;
  }

  async function loadInstitutions() {
    const s = $("institutionSelect");
    if (!s) return;

    s.innerHTML = `<option value="">Loading institutions...</option>`;

    let q = db.from("institutions").select("*");
    if (!isSuperAdmin() && institutionIdForProfile()) {
      q = q.eq("id", institutionIdForProfile());
    }

    const {data,error} = await q;
    if (error) throw new Error(`Institutions database error: ${error.message}`);

    institutions = (data || []).slice().sort((a,b) => String(a.name || a.title || a.institution_name || a.id || "").localeCompare(String(b.name || b.title || b.institution_name || b.id || "")));
    s.innerHTML = `<option value="">Select institution</option>`;

    institutions.forEach(r => {
      const o = document.createElement("option");
      o.value = r.id;
      o.textContent = r.name || r.title || r.institution_name || r.school_name || r.id;
      s.appendChild(o);
    });

    if (institutionIdForProfile()) s.value = institutionIdForProfile();
    s.disabled = !isSuperAdmin() && !!institutionIdForProfile();

    await loadStudents();
    await loadCourses(s.value || institutionIdForProfile() || "");
  }

  async function loadStudents() {
    const s = $("studentSelect");
    if (!s) return;

    s.innerHTML = `<option value="">Loading students...</option>`;

    // IMPORTANT: the GAAWOW students table does not have first_name/last_name
    // columns in the current schema. Use the real row shape instead of naming
    // optional columns in the SELECT, so the dropdown works across existing EMS data.
    let q = db.from("students").select("*");

    const iid = $("institutionSelect")?.value || institutionIdForProfile();
    if (iid) q = q.eq("institution_id",iid);

    const {data,error} = await q;
    if (error) throw new Error(`Students database error: ${error.message}`);
    students = (data || []).slice().sort((a,b) => String(studentDisplayName(a)).localeCompare(String(studentDisplayName(b))));

    populateStudents();
  }

  function studentDisplayName(r) {
    if (!r) return "Unnamed";
    return r.full_name || r.name || r.student_name || [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || r.admission_name || "Unnamed";
  }

  function populateStudents() {
    const s = $("studentSelect");
    s.innerHTML = `<option value="">Select student</option>`;

    students.forEach(r => {
      const o = document.createElement("option");
      o.value = r.id;
      o.textContent = `${studentDisplayName(r)}${r.student_id ? ` — ${r.student_id}` : ""}`;
      o.dataset.photo = r.photo_url || r.profile_photo || r.student_photo_url || r.avatar_url || "";
      s.appendChild(o);
    });
  }

  async function loadCourses(institutionId) {
    const s = $("courseSelect");
    if (!s) return;

    s.innerHTML = `<option value="">Loading courses...</option>`;
    s.disabled = true;

    let q = db.from("courses").select("*");
    if (institutionId) q = q.eq("institution_id",institutionId);

    const {data,error} = await q;
    if (error) throw new Error(`Courses database error: ${error.message}`);

    courses = (data || []).filter(c => c.is_active !== false).sort((a,b) => String(courseDisplayName(a)).localeCompare(String(courseDisplayName(b))));
    s.innerHTML = `<option value="">${courses.length ? "Select course" : "No active courses found"}</option>`;

    courses.forEach(r => {
      const o = document.createElement("option");
      o.value = r.id;
      const code = courseDisplayCode(r);
      const name = courseDisplayName(r);
      o.textContent = code ? `${name} (${code})` : name;
      s.appendChild(o);
    });

    s.disabled = false;
  }

  function courseDisplayName(c) {
    return c?.name || c?.title || c?.course_name || c?.program_name || c?.course_title || c?.label || c?.id || "Unnamed Course";
  }

  function courseDisplayCode(c) {
    return c?.code || c?.courseCode || c?.course_code || c?.code_name || c?.course_id_code || c?.course_number || c?.course_no || "";
  }

  function populateGradeSelect() {
    const s = $("grade");
    if (!s) return;
    s.innerHTML = `<option value="">Select grade</option>` +
      GRADES.map(g => `<option value="${g}">${g}</option>`).join("");
  }

  function populateStatusSelect() {
    const s = $("status");
    if (!s) return;
    s.innerHTML = STATUS.map(x => `<option value="${x}">${x.toUpperCase()}</option>`).join("");
    s.value = "valid";
  }

  function syncStudent() {
    const s = selectedStudent();
    setv("studentName", studentDisplayName(s));
    setv("studentIdPreview", s?.student_id || s?.admission_no || s?.registration_no || "");
    setv("dateStarted", s?.admission_date || s?.date_started || "");
    if (s?.grade && $("grade")?.options) {
      const exists = Array.from($("grade").options).some(o => o.value === String(s.grade));
      if (exists) $("grade").value = String(s.grade);
    }

    const photo = studentPhotoUrl();
    const box = $("photoBox");
    const img = $("studentPhotoPreview");
    if (photo && img && box) {
      img.src = photo;
      box.style.display = "block";
    } else if (box) {
      box.style.display = "none";
    }

    if (s?.institution_id && isSuperAdmin()) {
      $("institutionSelect").value = s.institution_id;
      loadCourses(s.institution_id).catch(e => msg(e.message,"error"));
    }

    // If the student has an existing status, use it only when it matches the form.
    if (s?.status && STATUS.includes(String(s.status).toLowerCase())) {
      $("status").value = String(s.status).toLowerCase();
    }
  }

  function syncCourse() {
    const c = selectedCourse();
    setv("courseName", courseDisplayName(c));
    setv("courseCode", courseDisplayCode(c));
  }

  function identifiers() {
    if (!val("certificateNo")) setv("certificateNo", referenceNo());
    if (!val("certificateId")) setv("certificateId", authenticationId());
    if (!val("verifyCode")) setv("verifyCode", verifyCode());
    if (!val("issueDate")) setv("issueDate", todayISO());
    if (!val("dateCompleted")) setv("dateCompleted", val("issueDate"));
    if (!val("status")) setv("status", "valid");
    if (!val("grade")) setv("grade", "");
    if (!val("directorName")) setv("directorName", DEFAULT_DIRECTOR);
    if (!val("authorityName")) setv("authorityName", DEFAULT_AUTHORITY);
  }

  function escapeForCanvas(text) {
    return String(text || "").replace(/\s+/g," ").trim();
  }

  function fitText(ctx, text, maxWidth, size, family="Arial", weight="400", minSize=10) {
    let n = size;
    while (n > minSize) {
      ctx.font = `${weight} ${n}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) return n;
      n -= 1;
    }
    return n;
  }

  function drawBoxText(ctx, text, box, opts={}) {
    const t = escapeForCanvas(text) || "—";
    const family = opts.family || "Arial, Helvetica, sans-serif";
    const weight = opts.weight || "600";
    const color = opts.color || "#0A1A44";
    const size = opts.size || 18;
    const align = opts.align || "left";
    const pad = opts.pad ?? 8;
    const max = box.w - pad*2;
    const n = fitText(ctx,t,max,size,family,weight,opts.minSize || 10);

    ctx.save();
    ctx.font = `${weight} ${n}px ${family}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    const x = align === "center" ? box.x + box.w/2 : align === "right" ? box.x + box.w - pad : box.x + pad;
    ctx.fillText(t,x,box.y + box.h/2);
    ctx.restore();
  }

  function wrapLines(ctx,text,maxWidth,maxLines=5) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) line = next;
      else {
        if (line) lines.push(line);
        line = word;
        if (lines.length >= maxLines-1) break;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    return lines;
  }

  function bodyText() {
    const inst = institutionName() || "the institution";
    const st = studentName() || "the student";
    const sid = studentId() || "the student ID";
    const course = courseName() || "the stated program/course";
    const grade = val("grade") || "the recorded grade";
    const start = dateText(val("dateStarted")) || "the stated start date";
    const done = dateText(val("dateCompleted")) || "the stated completion date";

    return `This letter confirms that ${st} (Student ID: ${sid}) was enrolled at ${inst} in ${course}. The academic record indicates a grade of ${grade}, with studies commencing on ${start} and completion recorded on ${done}. This document is issued by GAAWOW ACADEMY for official authentication and verification purposes.`;
  }

  async function makeQR(text) {
    // Prefer the bundled CDN library. If it is unavailable, use a remote QR image
    // service as a fallback so the verification QR is still generated.
    if (window.QRCode?.toDataURL) {
      try {
        return await new Promise((resolve,reject) => {
          window.QRCode.toDataURL(text,{width:500,margin:1,errorCorrectionLevel:"M"},(e,u)=>e?reject(e):resolve(u));
        });
      } catch (e) {
        console.warn("Local QR generation failed, using fallback.", e);
      }
    }
    const fallback = "https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=4&data=" + encodeURIComponent(text);
    return fallback;
  }

  async function drawStudentPhoto(ctx,url) {
    if (!url) return;
    try {
      const img = await loadImage(url);
      const p = L.photo;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(p.x,p.y,p.w,p.h,8);
      ctx.clip();

      const ratio = Math.max(p.w/img.naturalWidth,p.h/img.naturalHeight);
      const sw = img.naturalWidth*ratio, sh = img.naturalHeight*ratio;
      const dx = p.x+(p.w-sw)/2, dy = p.y+(p.h-sh)/2;
      ctx.drawImage(img,dx,dy,sw,sh);
      ctx.restore();
    } catch(e) {
      console.warn("Student photo could not be drawn:",e);
    }
  }

  async function draw() {
    if (!template) throw new Error("GAAWOW Authentication Letter template lama load-garin.");

    identifiers();

    const canvas = $("certificateCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = W;
    canvas.height = H;

    ctx.clearRect(0,0,W,H);
    ctx.drawImage(template,0,0,W,H);

    // Top metadata — each value is kept inside its own box.
    drawBoxText(ctx,val("certificateNo"),L.refNo,{size:17,weight:"700"});
    drawBoxText(ctx,dateText(val("issueDate")),L.issueDate,{size:16,weight:"700"});
    drawBoxText(ctx,val("verifyCode"),L.verifyCode,{size:16,weight:"700"});
    drawBoxText(ctx,(val("status")||"valid").toUpperCase(),L.topStatus,{size:16,weight:"700",align:"center"});

    // Student information.
    await drawStudentPhoto(ctx,studentPhotoUrl());
    drawBoxText(ctx,studentName(),L.studentName,{size:17,weight:"700"});
    drawBoxText(ctx,studentId(),L.studentId,{size:17,weight:"700"});
    drawBoxText(ctx,courseName(),L.courseName,{size:16,weight:"700"});
    drawBoxText(ctx,courseCode(),L.courseCode,{size:16,weight:"700"});
    drawBoxText(ctx,dateText(val("dateStarted")),L.dateStarted,{size:15,weight:"600"});
    drawBoxText(ctx,dateText(val("dateCompleted")),L.dateDone,{size:15,weight:"600"});
    drawBoxText(ctx,val("grade"),L.grade,{size:17,weight:"800",align:"center"});
    drawBoxText(ctx,(val("status")||"valid").toUpperCase(),L.status,{size:15,weight:"700"});

    // Body paragraph — contained inside the body area, no overlap with lower sections.
    ctx.save();
    ctx.font = `500 17px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = "#172554";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const lines = wrapLines(ctx,bodyText(),L.body.w-28,7);
    const lineH = 25;
    lines.forEach((line,i)=>ctx.fillText(line,L.body.x+14,L.body.y+18+i*lineH));
    ctx.restore();

    // Official authority — template already contains Founder & Director.

    // Verification QR and data.
    try {
      const qrUrl = await makeQR(baseVerifyUrl());
      const qrImg = await loadImage(qrUrl);
      // Cover only the placeholder inside the printed QR frame.
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(68, 1170, 144, 130);
      ctx.restore();
      ctx.drawImage(qrImg,L.qr.x,L.qr.y,L.qr.size,L.qr.size);
    } catch(e) {
      console.warn("QR draw failed:",e);
    }

    drawBoxText(ctx,val("verifyCode"),L.verCode,{size:16,weight:"700"});
    drawBoxText(ctx,"VERIFIED / VALID",L.verStatus,{size:15,weight:"700"});
    drawBoxText(ctx,baseVerifyUrl(),L.verUrl,{size:10,weight:"600",minSize:7,pad:6});

    statusText("GAAWOW Authentication Letter — Preview ready.");
    generated = true;
  }

  function payload(includeGrade=true) {
    const p = {
      certificate_no: val("certificateNo"),
      certificate_id: val("certificateId"),
      verify_code: val("verifyCode"),
      student_id: $("studentSelect")?.value || null,
      student_name: studentName(),
      course_id: $("courseSelect")?.value || null,
      course_name: courseName(),
      institution_id: $("institutionSelect")?.value || institutionIdForProfile() || null,
      institution_name: institutionName(),
      date_started: val("dateStarted") || null,
      date_completed: val("dateCompleted") || null,
      issue_date: val("issueDate") || null,
      expiry_date: val("expiryDate") || null,
      status: val("status") || "valid",
      certificate_type: "authentication_letter",
      director_name: val("directorName"),
      verification_url: baseVerifyUrl(),
      template_url: "./Authentication Letter.png",
      user_id: user?.id || null
    };
    if (includeGrade) p.grade = val("grade") || null;
    return p;
  }

  function gradeColumnError(error) {
    const s = String(error?.message || "").toLowerCase();
    return s.includes("grade") && (
      s.includes("column") || s.includes("schema") || s.includes("pgrst204") || s.includes("does not exist")
    );
  }

  function missingColumnName(error) {
    const s = String(error?.message || error || "");
    let m = s.match(/Could not find the '([^']+)' column/i);
    if (m) return m[1];
    m = s.match(/column\s+[\w.]+\.([\w]+)\s+does not exist/i);
    if (m) return m[1];
    m = s.match(/column\s+["']?([\w]+)["']?\s+does not exist/i);
    return m ? m[1] : null;
  }

  async function writeCertificate(id, originalPayload) {
    const candidate = { ...originalPayload };
    const ignored = [];

    // Some installations have a smaller certificates schema. If PostgREST
    // reports an unknown column, remove only that field and retry. This keeps
    // optional metadata from blocking the whole Authentication Letter save.
    for (let attempt = 0; attempt < 12; attempt++) {
      const result = id
        ? await db.from("certificates").update(candidate).eq("id", id).select("*").single()
        : await db.from("certificates").insert(candidate).select("*").single();

      if (!result.error) return { result, ignored };

      const missing = missingColumnName(result.error);
      if (!missing || !(missing in candidate)) return { result, ignored };

      ignored.push(missing);
      delete candidate[missing];
    }

    return {
      result: { error: new Error("Certificates schema contains too many unsupported columns."), data: null },
      ignored
    };
  }

  async function save() {
    try {
      identifiers();

      if (!$('institutionSelect')?.value && !institutionIdForProfile()) throw new Error("Institution dooro.");
      if (!$('studentSelect')?.value) throw new Error("Student dooro.");
      if (!$('courseSelect')?.value) throw new Error("Course dooro.");
      if (!val("grade")) throw new Error("Grade dooro.");

      await draw();

      const id = regenId();
      const write = await writeCertificate(id, payload(true));
      if (write.result.error) throw write.result.error;

      const ignored = write.ignored || [];
      if (ignored.length) {
        msg(`Authentication Letter waa la keydiyay. Database-ku ma laha column(s): ${ignored.join(", ")}. Xogtaas document-ka way ku jirtaa.`, "info");
      } else {
        msg(id ? "Authentication Letter waa la cusboonaysiiyay." : "Authentication Letter waa la keydiyay.", "success");
      }
      statusText(id ? "Existing Authentication Letter updated." : "Authentication Letter saved successfully.");
    } catch(e) {
      console.error(e);
      msg(`Save error: ${e.message || e}`, "error");
    }
  }

  async function loadExisting(id) {
    const {data,error} = await db.from("certificates").select("*").eq("id",id).single();
    if (error) throw new Error(`Existing record load failed: ${error.message}`);

    regenRow = data;
    setv("certificateNo",data.certificate_no);
    setv("certificateId",data.certificate_id);
    setv("verifyCode",data.verify_code);
    setv("dateStarted",data.date_started || data.issue_date);
    setv("dateCompleted",data.date_completed || data.issue_date);
    setv("issueDate",data.issue_date || todayISO());
    setv("expiryDate",data.expiry_date);
    setv("status",data.status || "valid");
    setv("directorName",data.director_name || DEFAULT_DIRECTOR);
    setv("authorityName",data.authority_name || DEFAULT_AUTHORITY);

    if (data.institution_id) {
      $("institutionSelect").value = data.institution_id;
      await loadStudents();
      await loadCourses(data.institution_id);
    }
    if (data.student_id) $("studentSelect").value = data.student_id;
    syncStudent();
    if (data.course_id) $("courseSelect").value = data.course_id;
    syncCourse();

    if (data.grade && $("grade")?.querySelector(`option[value="${CSS.escape(String(data.grade))}"]`)) {
      $("grade").value = String(data.grade);
    }

    await draw();
    msg("Regenerate mode: xogtii hore waa la soo celiyay.","info");
  }

  function downloadPNG() {
    if (!generated) throw new Error("Marka hore Generate Preview samee.");
    const a = document.createElement("a");
    a.download = `${(studentName() || "student").replace(/[^\w\-]+/g,"_")}-authentication-letter.png`;
    a.href = $("certificateCanvas").toDataURL("image/png",1);
    a.click();
  }

  function downloadPDF() {
    if (!generated) throw new Error("Marka hore Generate Preview samee.");
    if (!window.jspdf?.jsPDF) throw new Error("jsPDF lama helin.");
    const {jsPDF} = window.jspdf;
    const pdf = new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
    pdf.addImage($("certificateCanvas").toDataURL("image/png",1),"PNG",0,0,210,297,undefined,"FAST");
    pdf.save(`${(studentName() || "student").replace(/[^\w\-]+/g,"_")}-authentication-letter.pdf`);
  }

  function printHD() {
    if (!generated) throw new Error("Marka hore Generate Preview samee.");
    const w = window.open("","_blank");
    if (!w) throw new Error("Popup blocked. Allow popups for printing.");
    const image = $("certificateCanvas").toDataURL("image/png",1);
    w.document.write(`<!doctype html><html><head><title>GAAWOW Authentication Letter</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}img{display:block;width:210mm;height:297mm}</style></head><body><img src="${image}" alt="GAAWOW Authentication Letter"><script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script></body></html>`);
    w.document.close();
  }

  function verifyOnline() {
    const code = val("verifyCode");
    if (!code) return msg("Verify Code ma jiro.","error");
    location.href = `verify.html?code=${encodeURIComponent(code)}`;
  }

  function setupEvents() {
    $("institutionSelect")?.addEventListener("change",async()=>{
      try {
        await loadStudents();
        await loadCourses($("institutionSelect").value);
        setv("courseName","");
        setv("courseCode","");
        setv("studentName","");
      } catch(e) { msg(e.message,"error"); }
    });

    $("studentSelect")?.addEventListener("change",()=>{
      syncStudent();
      generated = false;
    });

    $("courseSelect")?.addEventListener("change",()=>{
      syncCourse();
      generated = false;
    });

    ["grade","dateStarted","dateCompleted","issueDate","expiryDate","status"].forEach(id=>{
      $(id)?.addEventListener("change",()=>generated=false);
    });

    $("generateBtn")?.addEventListener("click",async()=>{
      try { msg(""); identifiers(); await draw(); msg("Preview waa diyaar.","success"); }
      catch(e){ console.error(e); msg(`Generate error: ${e.message}`,"error"); }
    });

    $("saveBtn")?.addEventListener("click",save);
    $("pngBtn")?.addEventListener("click",()=>{try{downloadPNG()}catch(e){msg(e.message,"error")}});
    $("pdfBtn")?.addEventListener("click",()=>{try{downloadPDF()}catch(e){msg(e.message,"error")}});
    $("printBtn")?.addEventListener("click",()=>{try{printHD()}catch(e){msg(e.message,"error")}});
    $("verifyBtn")?.addEventListener("click",verifyOnline);
    $("backBtn")?.addEventListener("click",()=>location.href="certificates.html");
  }

  async function init() {
    try {
      statusText("Loading GAAWOW Authentication Letter...");
      if (!(await auth())) return;
      await loadProfile();
      await loadTemplate();
      populateGradeSelect();
      populateStatusSelect();
      await loadInstitutions();
      setupEvents();
      identifiers();

      const id = regenId();
      if (id) {
        await loadExisting(id);
      } else {
        syncStudent();
        syncCourse();
        await draw();
      }
    } catch(e) {
      console.error(e);
      msg(e.message || "Authentication Letter initialization failed.","error");
      statusText("Initialization failed.");
    }
  }

  document.addEventListener("DOMContentLoaded",init);
})();
