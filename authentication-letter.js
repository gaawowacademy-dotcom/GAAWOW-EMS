/* GAAWOW EMS Authentication Letter Generator v24 - Production Unified Engine */
(() => {
  "use strict";

  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";[span_2](start_span)[span_2](end_span)
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";[span_3](start_span)[span_3](end_span)
  const W = 1055, H = 1491;[span_4](start_span)[span_4](end_span)
  const TEMPLATE = "./Authentication Letter.png";[span_5](start_span)[span_5](end_span)

  const $ = id => document.getElementById(id);[span_6](start_span)[span_6](end_span)
  const canvas = $("certificateCanvas"), ctx = canvas?.getContext("2d");[span_7](start_span)[span_7](end_span)
  let db, user, profile, template, founderPhoto = null;[span_8](start_span)[span_8](end_span)

  const today = () => new Date().toISOString().slice(0, 10);[span_9](start_span)[span_9](end_span)
  const val = id => ($(id)?.value || "").trim();[span_10](start_span)[span_10](end_span)
  const setv = (id, v) => { if ($(id))$(id).value = v ?? ""; };[span_11](start_span)[span_11](end_span)
  const rand = (n = 8) => { const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };[span_12](start_span)[span_12](end_span)
  const dateText = s => { if (!s) return ""; const d = new Date(`${s}T00:00:00`); return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }); };[span_13](start_span)[span_13](end_span)
  const msg = (t, type = "info") => { const e = $("message"); if (e) { e.textContent = t; e.className = `message ${type}`; } };[span_14](start_span)[span_14](end_span)
  const status = t => { const e = $("previewStatus"); if (e) e.textContent = t; };[span_15](start_span)[span_15](end_span)
  
  const institutionName = () => $("institutionSelect")?.selectedOptions?.[0]?.textContent?.trim() || "";[span_16](start_span)[span_16](end_span)
  const studentOption = () => $("studentSelect")?.selectedOptions?.[0];[span_17](start_span)[span_17](end_span)
  const courseOption = () => $("courseSelect")?.selectedOptions?.[0];[span_18](start_span)[span_18](end_span)
  const studentName = () => studentOption()?.dataset.name || studentOption()?.textContent?.trim() || val("studentName");[span_19](start_span)[span_19](end_span)
  const courseName = () => courseOption()?.dataset.name || courseOption()?.textContent?.trim() || val("courseName");[span_20](start_span)[span_20](end_span)
  const courseCode = () => courseOption()?.dataset.code || val("courseCode");[span_21](start_span)[span_21](end_span)
  const profileInstitution = () => profile?.institution_id || profile?.institutionId || profile?.school_id || null;[span_22](start_span)[span_22](end_span)
  const regenId = () => new URLSearchParams(location.search).get("regen");[span_23](start_span)[span_23](end_span)
  const verifyUrl = () => `${location.origin}${location.pathname.replace(/authentication-letter\.html$/i, "")}verify.html?code=${encodeURIComponent(val("verifyCode"))}&id=${encodeURIComponent(val("certificateId"))}`;[span_24](start_span)[span_24](end_span)

  function identifiers() {
    if (!val("certificateNo")) setv("certificateNo", `GAA-AUTH-${new Date().getFullYear()}-${rand(6)}`);[span_25](start_span)[span_25](end_span)
    if (!val("certificateId")) setv("certificateId", `GAA-AUTH-${Date.now().toString(36).toUpperCase()}-${rand(4)}`);[span_26](start_span)[span_26](end_span)
    if (!val("verifyCode")) setv("verifyCode", `AUTH-${new Date().getFullYear()}-${rand(8)}`);[span_27](start_span)[span_27](end_span)
    if (!val("issueDate")) setv("issueDate", today());[span_28](start_span)[span_28](end_span)
    if (!val("directorName")) setv("directorName", "Dr. Osmaan Mohamed Ibraahin");[span_29](start_span)[span_29](end_span)
    if (!val("authorityName")) setv("authorityName", "GAAWOW ACADEMY");[span_30](start_span)[span_30](end_span)
  }

  async function loadImage(src) { return new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src; }); }[span_31](start_span)[span_31](end_span)
  function fileToDataURL(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); }); }[span_32](start_span)[span_32](end_span)

  async function loadTemplate() { template = await loadImage(TEMPLATE); status("GAAWOW template loaded."); }[span_33](start_span)[span_33](end_span)

  async function auth() {
    if (!window.supabase) throw Error("Supabase library lama load-gareyn.");[span_34](start_span)[span_34](end_span)
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });[span_35](start_span)[span_35](end_span)
    const { data, error } = await db.auth.getUser();[span_36](start_span)[span_36](end_span)
    if (error) {
      const em = String(error.message || error);[span_37](start_span)[span_37](end_span)
      if (/invalid api key|apikey/i.test(em)) throw Error("Supabase API key-ga waa invalid ama project-ka key-ga waa la beddelay.");[span_38](start_span)[span_38](end_span)
      throw error;[span_39](start_span)[span_39](end_span)
    }
    if (!data?.user) throw Error("User login ma jiro. Marka hore ka login garee GAAWOW EMS.");[span_40](start_span)[span_40](end_span)
    user = data.user;[span_41](start_span)[span_41](end_span)
  }

  async function loadProfile() {
    if (!user) return;[span_42](start_span)[span_42](end_span)
    const { data } = await db.from("profiles").select("*").or(`id.eq.${user.id},user_id.eq.${user.id}`).maybeSingle();[span_43](start_span)[span_43](end_span)
    if (data) profile = data;[span_44](start_span)[span_44](end_span)
  }

  const GRADE_OPTIONS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F", "PASS", "FAIL", "N/A"];[span_45](start_span)[span_45](end_span)
  const STATUS_OPTIONS = ["VALID", "PENDING", "EXPIRED", "REVOKED"];[span_46](start_span)[span_46](end_span)

  function populateGradeStatus() {
    const g = $("grade"), st = $("status");[span_47](start_span)[span_47](end_span)
    if (g) {
      const current = val("grade");[span_48](start_span)[span_48](end_span)
      g.innerHTML = '<option value="">Select grade</option>' + GRADE_OPTIONS.map(x => `<option value="${x}">${x}</option>`).join("");[span_49](start_span)[span_49](end_span)
      if (current && ![...g.options].some(o => o.value === current)) g.add(new Option(current, current));[span_50](start_span)[span_50](end_span)
      if (current) g.value = current;[span_51](start_span)[span_51](end_span)
    }
    if (st) {
      const current = val("status")?.toUpperCase() || "VALID";[span_52](start_span)[span_52](end_span)
      st.innerHTML = STATUS_OPTIONS.map(x => `<option value="${x}">${x}</option>`).join("");[span_53](start_span)[span_53](end_span)
      if (current && ![...st.options].some(o => o.value === current)) st.add(new Option(current, current));[span_54](start_span)[span_54](end_span)
      st.value = current;[span_55](start_span)[span_55](end_span)
    }
  }

  function nameOf(r) { return r.full_name || r.student_name || r.name || [r.first_name, r.last_name].filter(Boolean).join(" ") || r.title || r.id || r.student_id || ""; }[span_56](start_span)[span_56](end_span)
  function courseOf(r) { return r.name || r.course_name || r.title || r.program_name || r.id || r.course_id || ""; }[span_57](start_span)[span_57](end_span)
  function codeOf(r) { return r.code || r.course_code || r.courseCode || r.program_code || ""; }[span_58](start_span)[span_58](end_span)

  async function loadInstitutions() {
    const s = $("institutionSelect"); if (!s) return;[span_59](start_span)[span_59](end_span)
    const { data, error } = await db.from("institutions").select("*"); if (error) throw error;[span_60](start_span)[span_60](end_span)
    s.innerHTML = '<option value="">Select institution</option>';[span_61](start_span)[span_61](end_span)
    (data || []).sort((a, b) => String(a.name || a.institution_name || a.title || "").localeCompare(String(b.name || b.institution_name || b.title || ""))).forEach(r => { const o = document.createElement("option"); o.value = r.id || r.institution_id; o.textContent = r.name || r.institution_name || r.title || o.value; s.appendChild(o); });[span_62](start_span)[span_62](end_span)
    const pi = profileInstitution(); if (pi) { s.value = pi; s.disabled = true; }[span_63](start_span)[span_63](end_span)
  }

  async function loadStudents() {
    const s = $("studentSelect"); if (!s) return;[span_64](start_span)[span_64](end_span)
    const { data, error } = await db.from("students").select("*"); if (error) throw error;[span_65](start_span)[span_65](end_span)
    const iid = $("institutionSelect")?.value;[span_66](start_span)[span_66](end_span)
    const rows = (data || []).filter(r => !iid || String(r.institution_id || r.institutionId || r.school_id || "") === String(iid));[span_67](start_span)[span_67](end_span)
    s.innerHTML = '<option value="">Select student</option>';[span_68](start_span)[span_68](end_span)
    rows.sort((a, b) => nameOf(a).localeCompare(nameOf(b))).forEach(r => { const o = document.createElement("option"); o.value = r.id || r.student_id; o.textContent = nameOf(r); o.dataset.name = nameOf(r); o.dataset.photo = r.photo_url || r.profile_photo || r.student_photo_url || r.avatar_url || ""; o.dataset.studentId = r.student_id || r.id || ""; o.dataset.grade = r.grade || r.final_grade || r.result || ""; o.dataset.started = r.date_started || r.start_date || r.enrollment_date || ""; o.dataset.completed = r.date_completed || r.completion_date || r.graduation_date || ""; o.dataset.courseId = r.course_id || r.program_id || ""; s.appendChild(o); });[span_69](start_span)[span_69](end_span)
  }

  async function loadCourses() {
    const s = $("courseSelect"); if (!s) return;[span_70](start_span)[span_70](end_span)
    const { data, error } = await db.from("courses").select("*"); if (error) throw error;[span_71](start_span)[span_71](end_span)
    const iid = $("institutionSelect")?.value;[span_72](start_span)[span_72](end_span)
    const rows = (data || []).filter(r => !iid || !r.institution_id || String(r.institution_id) === String(iid));[span_73](start_span)[span_73](end_span)
    s.innerHTML = '<option value="">Select course</option>';[span_74](start_span)[span_74](end_span)
    rows.sort((a, b) => courseOf(a).localeCompare(courseOf(b))).forEach(r => { const o = document.createElement("option"); o.value = r.id || r.course_id; o.textContent = courseOf(r); o.dataset.name = courseOf(r); o.dataset.code = codeOf(r); s.appendChild(o); });[span_75](start_span)[span_75](end_span)
  }

  function syncStudent() {
    const o = studentOption();
    if (!o) return;
    setv("studentName", o.dataset.name || o.textContent);[span_76](start_span)[span_76](end_span)
    setv("studentIdPreview", o.dataset.studentId || o.value);[span_77](start_span)[span_77](end_span)
    if (o.dataset.grade) { const g = o.dataset.grade; const sel = $("grade"); if (sel && ![...sel.options].some(x => x.value === g)) sel.add(new Option(g, g)); setv("grade", g); }[span_78](start_span)[span_78](end_span)
    if (o.dataset.started) setv("dateStarted", o.dataset.started);[span_79](start_span)[span_79](end_span)
    if (o.dataset.completed) setv("dateCompleted", o.dataset.completed);[span_80](start_span)[span_80](end_span)
    if (o.dataset.courseId) { const cs = $("courseSelect"); if (cs) { cs.value = o.dataset.courseId; if (!cs.value) { const match = [...cs.options].find(x => x.value === o.dataset.courseId); if (match) cs.value = match.value; } } }[span_81](start_span)[span_81](end_span)
    const photo = o.dataset.photo; const img = $("studentPhotoPreview"); const box = $("photoBox"); if (img && box && photo) { img.src = photo; box.style.display = "block"; } else if (box) box.style.display = "none";[span_82](start_span)[span_82](end_span)
  }

  function syncCourse() { setv("courseName", courseName()); setv("courseCode", courseCode()); }[span_83](start_span)[span_83](end_span)

  async function qrData(url) {
    const opts = { width: 300, margin: 1, errorCorrectionLevel: "M", color: { dark: "#10204f", light: "#ffffff" } };[span_84](start_span)[span_84](end_span)
    if (window.QRCode?.toDataURL) {
      try {
        const out = QRCode.toDataURL(url, opts);[span_85](start_span)[span_85](end_span)
        return typeof out?.then === "function" ? await out : await new Promise((res, rej) => QRCode.toDataURL(url, opts, (e, u) => e ? rej(e) : res(u)));[span_86](start_span)[span_86](end_span)
      } catch (e) { console.warn("Local QR generator failed", e); }[span_87](start_span)[span_87](end_span)
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(url)}`;[span_88](start_span)[span_88](end_span)
  }

  /* =========================================================
     CORE REUSABLE BOX-BASED RENDERING ENGINE
     ========================================================= */
  function fitTextToBox(text, box, options = {}) {
    if (!text) return;
    const {
      fontWeight = "700",
      fontFamily = "Arial, sans-serif",
      startingFontSize = 16,
      minimumFontSize = 8,
      align = "center",
      color = "#10204f"
    } = options;

    let fontSize = startingFontSize;
    const boxWidth = Math.max(10, box.right - box.left);
    const boxHeight = Math.max(10, box.bottom - box.top);
    const centerX = box.left + boxWidth / 2;
    const centerY = box.top + boxHeight / 2;

    ctx.save();
    do {
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const textWidth = ctx.measureText(String(text)).width;
      if (textWidth <= boxWidth - 10 && fontSize <= boxHeight) {
        break;
      }
      fontSize -= 0.5;
    } while (fontSize > minimumFontSize);

    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";

    const x = align === "center" ? centerX : (align === "left" ? box.left + 5 : box.right - 5);
    ctx.fillText(String(text), x, centerY);
    ctx.restore();
  }

  /* Specialized Cropped Photo Drawer */
  function drawPhotoInBox(img, box, borderRadius = 6) {
    if (!img) return;
    const w = box.right - box.left;
    const h = box.bottom - box.top;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(box.left, box.top, w, h, borderRadius);
    ctx.clip();
    const scale = Math.max(w / img.width, h / img.height);
    const iw = img.width * scale, ih = img.height * scale;
    ctx.drawImage(img, box.left + (w - iw) / 2, box.top + (h - ih) / 2, iw, ih);
    ctx.restore();
  }

  /* Wrap Text for "To Whom It May Concern" Section */
  function wrapTextInBox(text, box, lineHeight = 22, maxLines = 6, options = {}) {
    if (!text) return;
    const { fontSize = 14, color = "#27364a" } = options;
    const maxWidth = box.right - box.left;
    
    ctx.save();
    ctx.font = `500 ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const words = String(text).split(/\s+/);
    let line = "";
    const lines = [];

    for (const word of words) {
      const testLine = line ? line + " " + word : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
        if (lines.length >= maxLines) break;
      } else {
        line = testLine;
      }
    }
    if (lines.length < maxLines && line) lines.push(line);

    lines.forEach((l, i) => ctx.fillText(l, box.left, box.top + i * lineHeight));
    ctx.restore();
  }

  /* =========================================================
     DRAWING SUB-FUNCTIONS
     ========================================================= */
  
  function drawTopInfoBoxes() {
    fitTextToBox(val("certificateNo"), { left: 92, top: 326, right: 258, bottom: 359 }, { startingFontSize: 13, minimumFontSize: 8 });
    fitTextToBox(dateText(val("issueDate")), { left: 340, top: 326, right: 492, bottom: 359 }, { startingFontSize: 13, minimumFontSize: 8 });
    fitTextToBox(val("verifyCode"), { left: 575, top: 326, right: 747, bottom: 359 }, { startingFontSize: 13, minimumFontSize: 8 });
    fitTextToBox((val("status") || "VALID").toUpperCase(), { left: 829, top: 326, right: 977, bottom: 359 }, { startingFontSize: 13, minimumFontSize: 8 });
  }

  async function drawStudentPhoto() {
    const o = studentOption();
    const src = o?.dataset.photo || "";
    if (!src) return;
    try {
      const img = await loadImage(src);
      drawPhotoInBox(img, { left: 54, top: 441, right: 236, bottom: 657 }, 8);
    } catch (e) { console.warn("Student photo render error", e); }
  }

  function drawStudentFields() {
    const student = studentName();
    const sid = val("studentIdPreview") || studentOption()?.dataset.studentId || studentOption()?.value || "";
    const course = courseName();
    const code = courseCode();
    const grade = val("grade");
    const stat = (val("status") || "VALID").toUpperCase();

    fitTextToBox(student, { left: 310, top: 454, right: 607, bottom: 487 }, { startingFontSize: 16, minimumFontSize: 9 });
    fitTextToBox(sid, { left: 310, top: 515, right: 607, bottom: 548 }, { startingFontSize: 16, minimumFontSize: 9 });
    fitTextToBox(course, { left: 310, top: 576, right: 607, bottom: 609 }, { startingFontSize: 16, minimumFontSize: 9 });
    fitTextToBox(code, { left: 310, top: 637, right: 607, bottom: 670 }, { startingFontSize: 16, minimumFontSize: 9 });

    fitTextToBox(dateText(val("dateStarted")), { left: 681, top: 454, right: 976, bottom: 487 }, { startingFontSize: 15, minimumFontSize: 9 });
    fitTextToBox(dateText(val("dateCompleted")), { left: 681, top: 515, right: 976, bottom: 548 }, { startingFontSize: 15, minimumFontSize: 9 });
    fitTextToBox(grade, { left: 681, top: 576, right: 976, bottom: 609 }, { startingFontSize: 16, minimumFontSize: 9 });
    fitTextToBox(stat, { left: 681, top: 637, right: 976, bottom: 670 }, { startingFontSize: 16, minimumFontSize: 9 });
  }

  function drawToWhomItMayConcern() {
    const student = studentName();
    const sid = val("studentIdPreview") || studentOption()?.dataset.studentId || studentOption()?.value || "";
    const course = courseName();
    const grade = val("grade");
    
    const bodyText = `This letter confirms that ${student} (Student ID: ${sid}) was enrolled at ${institutionName() || "GAAWOW ACADEMY"} in ${course || "the stated program"}. The academic record indicates a grade of ${grade || "the recorded grade"}, with studies commencing on ${dateText(val("dateStarted")) || "the stated start date"} and completion recorded on ${dateText(val("dateCompleted")) || "the stated completion date"}. This document is issued by GAAWOW ACADEMY for official authentication and verification purposes.`;

    wrapTextInBox(bodyText, { left: 112, top: 760, right: 937, bottom: 898 }, 23, 6, { fontSize: 14 });
  }

  async function drawFounderPhoto() {
    if (!founderPhoto) return;
    try {
      const img = await loadImage(founderPhoto);
      ctx.save();
      ctx.beginPath();
      ctx.arc(103, 1042, 31, 0, Math.PI * 2);
      ctx.clip();
      const scale = Math.max(62 / img.width, 62 / img.height);
      const iw = img.width * scale, ih = img.height * scale;
      ctx.drawImage(img, 103 - iw / 2, 1042 - ih / 2, iw, ih);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "#d4a72c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(103, 1042, 31, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } catch (e) { console.warn("Founder photo render error", e); }
  }

  function drawVerificationFields() {
    fitTextToBox(val("verifyCode"), { left: 355, top: 1163, right: 767, bottom: 1196 }, { startingFontSize: 14, minimumFontSize: 8 });
    fitTextToBox((val("status") || "VALID").toUpperCase(), { left: 355, top: 1222, right: 767, bottom: 1255 }, { startingFontSize: 14, minimumFontSize: 8 });
    
    /* Strict Box Bound for Verification URL to never cover Scan To Verify area */
    fitTextToBox(verifyUrl(), { left: 355, top: 1280, right: 755, bottom: 1313 }, {
      startingFontSize: 10,
      minimumFontSize: 5,
      fontWeight: "500",
      color: "#0B4DA2"
    });
  }

  async function drawQRCode() {
    try {
      const q = await qrData(verifyUrl());
      const qi = await loadImage(q);
      const qrSize = 126, qrX = 71, qrY = 1183;

      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6);
      ctx.drawImage(qi, qrX, qrY, qrSize, qrSize);
      ctx.restore();
    } catch (e) { console.warn("QR Render Error", e); }
  }

  /* =========================================================
     AUTHORITATIVE UNIFIED RENDER PIPELINE
     ========================================================= */
  async function renderAuthenticationLetter() {
    identifiers();
    if (!template) await loadTemplate();

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(template, 0, 0, W, H);

    drawTopInfoBoxes();
    await drawStudentPhoto();
    drawStudentFields();
    drawToWhomItMayConcern();
    await drawFounderPhoto();
    drawVerificationFields();
    await drawQRCode();

    status("Authentication Letter preview ready.");
  }

  /* Database Logic */
  function payload() {
    return {
      certificate_no: val("certificateNo"),
      certificate_id: val("certificateId"),
      verify_code: val("verifyCode"),
      student_id: $("studentSelect")?.value || null,
      student_name_snapshot: studentName() || null,
      course_id: $("courseSelect")?.value || null,
      course_name_snapshot: courseName() || null,
      institution_id: $("institutionSelect")?.value || profileInstitution() || null,
      institution_name_snapshot: institutionName() || null,
      date_started: val("dateStarted") || null,
      date_completed: val("dateCompleted") || null,
      issue_date: val("issueDate") || null,
      expiry_date: val("expiryDate") || null,
      status: (val("status") || "valid").toLowerCase(),
      certificate_type: "authentication_letter",
      director_name: val("directorName") || null,
      verification_url: verifyUrl(),
      template_url: TEMPLATE,
      user_id: user?.id || null,
      hash_code: crypto?.subtle ? null : `${val("certificateId")}-${val("verifyCode")}-${Date.now()}`
    };
  }

  async function sha256(s) {
    if (!crypto?.subtle) return s;
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  }

  async function save() {
    try {
      identifiers();
      if (!studentOption()?.value) throw Error("Fadhlan dooro Student.");
      if (!courseOption()?.value) throw Error("Fadhlan dooro Course.");
      await renderAuthenticationLetter();

      const p = payload();
      p.hash_code = await sha256(`${p.certificate_id}|${p.verify_code}|${p.student_id || ""}|${p.course_id || ""}`);

      const id = regenId();
      let q = id ? db.from("certificates").update(p).eq("id", id) : db.from("certificates").insert(p);
      let r = await q.select().single();

      if (r.error) {
        const m = String(r.error.message || "");
        const bad = m.match(/Could not find the '([^']+)' column/);
        if (bad && Object.prototype.hasOwnProperty.call(p, bad[1])) {
          delete p[bad[1]];
          r = await (id ? db.from("certificates").update(p).eq("id", id) : db.from("certificates").insert(p)).select().single();
        }
      }
      if (r.error) throw r.error;
      msg(id ? "Authentication Letter waa la cusboonaysiiyay." : "Authentication Letter waa la keydiyay.", "success");
    } catch (e) {
      console.error(e);
      msg(`Save error: ${e.message || e}`, "error");
    }
  }

  async function loadExisting(id) {
    const { data, error } = await db.from("certificates").select("*").eq("id", id).single();
    if (error) throw error;

    setv("certificateNo", data.certificate_no);
    setv("certificateId", data.certificate_id);
    setv("verifyCode", data.verify_code);
    setv("dateStarted", data.date_started);
    setv("dateCompleted", data.date_completed);
    setv("issueDate", data.issue_date);
    setv("expiryDate", data.expiry_date);
    setv("status", (data.status || "valid").toUpperCase());
    setv("directorName", data.director_name || "Dr. Osmaan Mohamed Ibraahin");

    if (data.institution_id) { $("institutionSelect").value = data.institution_id; await loadStudents(); await loadCourses(); }
    if (data.student_id) { $("studentSelect").value = data.student_id; syncStudent(); }
    if (data.course_id) { $("courseSelect").value = data.course_id; syncCourse(); }

    await renderAuthenticationLetter();
    msg("Regenerate mode: Authentication Letter waa la furay.", "info");
  }

  /* Export Functions */
  function png() {
    const a = document.createElement("a");
    a.download = `${(studentName() || "student").replace(/[^a-z0-9]+/gi, "-")}-authentication-letter.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  }

  function pdf() {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) throw Error("jsPDF library lama helin.");
    const p = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    p.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
    p.save(`${(studentName() || "student").replace(/[^a-z0-9]+/gi, "-")}-authentication-letter.pdf`);
  }

  function print() {
    const w = window.open("", "_blank");
    if (!w) throw Error("Print window waa la xiray.");
    w.document.write(`<html><head><title>Authentication Letter</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}img{width:210mm;height:297mm;display:block}</style></head><body><img src="${canvas.toDataURL("image/png")}" onload="window.print()"></body></html>`);
    w.document.close();
  }

  /* Event Handlers */
  function events() {
    $("institutionSelect")?.addEventListener("change", async () => { try { await loadStudents(); await loadCourses(); } catch (e) { msg(e.message, "error"); } });
    $("studentSelect")?.addEventListener("change", async () => { syncStudent(); try { await renderAuthenticationLetter(); } catch (e) { msg(e.message, "error"); } });
    $("courseSelect")?.addEventListener("change", async () => { syncCourse(); try { await renderAuthenticationLetter(); } catch (e) { msg(e.message, "error"); } });
    
    $("founderPhotoInput")?.addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        founderPhoto = await fileToDataURL(f);
        try { localStorage.setItem("gaawow_founder_photo", founderPhoto); } catch (_) {}
        const img = $("founderPhotoPreview"), box = $("founderPhotoBox");
        if (img) img.src = founderPhoto;
        if (box) box.style.display = "block";
        await renderAuthenticationLetter();
      } catch (err) { msg(`Founder photo error: ${err.message || err}`, "error"); }
    });

    $("grade")?.addEventListener("change", async () => { try { await renderAuthenticationLetter(); } catch (e) { msg(e.message, "error"); } });
    $("status")?.addEventListener("change", async () => { try { await renderAuthenticationLetter(); } catch (e) { msg(e.message, "error"); } });
    
    $("generateBtn")?.addEventListener("click", async () => { try { identifiers(); await renderAuthenticationLetter(); } catch (e) { msg(`Generate error: ${e.message}`, "error"); } });
    $("saveBtn")?.addEventListener("click", save);
    $("pngBtn")?.addEventListener("click", png);
    $("pdfBtn")?.addEventListener("click", pdf);
    $("printBtn")?.addEventListener("click", print);
    $("verifyBtn")?.addEventListener("click", () => window.open(verifyUrl(), "_blank", "noopener,noreferrer"));
    $("backBtn")?.addEventListener("click", () => location.href = "certificates.html");
  }

  /* Initialization */
  async function init() {
    try {
      canvas.width = W; canvas.height = H;
      await auth();
      await loadProfile();
      await loadTemplate();
      await loadInstitutions();
      await loadStudents();
      await loadCourses();
      
      events();
      identifiers();
      populateGradeStatus();

      try {
        founderPhoto = localStorage.getItem("gaawow_founder_photo") || null;
        if (founderPhoto) {
          const img = $("founderPhotoPreview"), box = $("founderPhotoBox");
          if (img) img.src = founderPhoto;
          if (box) box.style.display = "block";
        }
      } catch (_) {}

      if (regenId()) await loadExisting(regenId());
      else await renderAuthenticationLetter();

    } catch (e) {
      console.error(e);
      msg(`System error: ${e.message || e}`, "error");
      status("Authentication Letter failed to initialize.");
    }
  }

  init();
})();
