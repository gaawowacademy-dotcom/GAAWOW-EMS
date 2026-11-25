"use strict";

/* =========================================================
   GAAWOW EMS
   AUTHENTICATION LETTER GENERATOR  V1  (standalone)

   Flow
   1. Admin picks institution / student / programme.
   2. Financial clearance is checked with the existing database
      function gaawow_student_financially_cleared (scope
      "certificates"). Not cleared / cannot verify  -> blocked.
   3. A certificates row of type "authentication_letter" is
      created (or the student's existing valid one is reused), then
      the existing RPC admin_create_authentication_letter prepares
      the letter and the official page is opened.

   Uses the existing schema and RPCs only. No schema changes.
   ========================================================= */

(() => {
  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const CREATE_AUTH_LETTER_RPC = "admin_create_authentication_letter";
  const CLEARANCE_RPC = "gaawow_student_financially_cleared";
  const CLEARANCE_SCOPE = "certificates";

  const LOGIN_PAGE = "index.html";
  const LETTER_PAGE = "authentication-letter.html";
  const LIST_PAGE = "certificates.html?type=authentication_letter";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    document.body.innerHTML =
      "<h2 style='font-family:Arial;padding:25px;color:#a32323'>" +
      "Supabase library could not be loaded. Please reload the page.</h2>";
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const $ = id => document.getElementById(id);

  let currentUser = null;
  let currentProfile = null;
  let institutions = [];
  let students = [];
  let courses = [];
  let existingLetter = null;

  /* unknown | checking | cleared | blocked | error */
  let clearanceState = "unknown";
  let clearanceToken = 0;
  let existingToken = 0;
  let busy = false;

  /* ---------------- helpers ---------------- */

  function showMessage(text, type = "info") {
    const el = $("message");
    el.textContent = text;
    el.className = "message " + type;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideMessage() {
    const el = $("message");
    el.textContent = "";
    el.className = "message";
  }

  function todayISO() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 10);
  }

  function formatDate(value, fallback = "—") {
    if (!value) return fallback;
    const d = new Date(String(value).slice(0, 10) + "T00:00:00");
    if (Number.isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function role() {
    return String(currentProfile?.role || "").toLowerCase().trim();
  }

  const isSuperAdmin = () => role() === "super_admin";

  function randomCode(length) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    let out = "";
    for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
    return out;
  }

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0")).join("");
  }

  /* Same numbering scheme as the certificate generator, so the existing
     RPC and the official letter page treat these records identically. */
  function generateNumbers() {
    const year = new Date().getFullYear();
    const stamp = String(Date.now()).slice(-6);
    $("certificateNo").value = `CERT-${year}-${stamp}`;
    $("verifyCode").value = `GAW-${year}-${randomCode(8)}`;
    generateNumbers.certificateId = `CERT_GA_${year}_${stamp}_${randomCode(5)}`;
  }

  function verificationUrlFor(code) {
    const base = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "")}`;
    return `${base}${LETTER_PAGE}?code=${encodeURIComponent(code)}`;
  }

  function selectedInstitutionId() {
    return $("institutionSelect").value || currentProfile?.institution_id || "";
  }

  const selectedStudent = () => students.find(s => s.id === $("studentSelect").value) || null;
  const selectedCourse = () => courses.find(c => c.id === $("courseSelect").value) || null;

  /* ---------------- access ---------------- */

  async function loadAuth() {
    const { data, error } = await db.auth.getUser();
    if (error) throw new Error("Authentication error: " + error.message);
    if (!data?.user) {
      window.location.replace(LOGIN_PAGE);
      return false;
    }
    currentUser = data.user;
    return true;
  }

  async function loadProfile() {
    const { data, error } = await db
      .from("profiles")
      .select("id,full_name,role,institution_id,is_active")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) throw new Error("Profile database error: " + error.message);
    if (!data) throw new Error("Your EMS profile was not found.");
    if (data.is_active === false) throw new Error("Your EMS account is inactive.");

    currentProfile = data;

    if (!["super_admin", "school_admin"].includes(role())) {
      throw new Error("Only Super Admin and School Admin can generate authentication letters.");
    }
  }

  /* ---------------- data ---------------- */

  async function loadInstitutions() {
    const select = $("institutionSelect");
    select.innerHTML = `<option value="">Select institution</option>`;

    let query = db.from("institutions").select("id,name").order("name", { ascending: true });
    if (!isSuperAdmin() && currentProfile?.institution_id) {
      query = query.eq("id", currentProfile.institution_id);
    }

    const { data, error } = await query;
    if (error) throw new Error("Institutions database error: " + error.message);

    institutions = data || [];
    for (const item of institutions) {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      select.appendChild(opt);
    }

    if (currentProfile?.institution_id) {
      select.value = currentProfile.institution_id;
    } else if (institutions.length === 1) {
      select.value = institutions[0].id;
    }

    select.disabled = !isSuperAdmin();
  }

  async function loadStudents() {
    let query = db
      .from("students")
      .select("id,institution_id,student_id,full_name,photo_url,admission_date,status")
      .order("full_name", { ascending: true });

    if (!isSuperAdmin() && currentProfile?.institution_id) {
      query = query.eq("institution_id", currentProfile.institution_id);
    }

    const { data, error } = await query;
    if (error) throw new Error("Students database error: " + error.message);
    students = data || [];
  }

  function populateStudents() {
    const select = $("studentSelect");
    const inst = selectedInstitutionId();

    select.innerHTML = `<option value="">Select student</option>`;

    for (const s of students) {
      if (inst && s.institution_id !== inst) continue;
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.full_name || "Unnamed"} — ${s.student_id || s.id}`;
      select.appendChild(opt);
    }
  }

  async function loadCourses() {
    const select = $("courseSelect");
    const inst = selectedInstitutionId();

    select.innerHTML = `<option value="">Loading courses...</option>`;
    select.disabled = true;

    let query = db
      .from("courses")
      .select("id,institution_id,name,code,is_active")
      .order("name", { ascending: true });

    if (inst) query = query.eq("institution_id", inst);

    const { data, error } = await query;

    select.disabled = false;

    if (error) {
      courses = [];
      select.innerHTML = `<option value="">Course loading failed</option>`;
      throw new Error("Courses database error: " + error.message);
    }

    courses = (data || []).filter(c => c.is_active !== false);

    select.innerHTML =
      `<option value="">${courses.length ? "Select course" : "No active courses found"}</option>`;

    for (const c of courses) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.code ? `${c.name} (${c.code})` : c.name;
      select.appendChild(opt);
    }
  }

  /* ---------------- financial clearance ---------------- */

  function renderClearance(state, invoices = [], detail = "") {
    const box = $("clearanceBox");
    box.className = "clearance";
    box.replaceChildren();

    if (state === "hidden") return;

    box.classList.add(state);

    const title = document.createElement("strong");
    const text = document.createElement("div");

    if (state === "checking") {
      title.textContent = "Checking financial clearance...";
    } else if (state === "cleared") {
      title.textContent = "✔ Financially cleared";
      text.textContent = "No outstanding balance. The letter can be generated.";
    } else if (state === "blocked") {
      title.textContent = "✖ Not cleared — outstanding balance";
      text.textContent = "The letter cannot be generated until every invoice is paid.";
    } else {
      title.textContent = "✖ Clearance could not be verified";
      text.textContent = (detail || "Try again.") + " Generation stays blocked.";
    }

    box.append(title, text);

    if (state === "blocked" && invoices.length) {
      const ul = document.createElement("ul");
      for (const inv of invoices.slice(0, 6)) {
        const balance = Number(inv.amount || 0) - Number(inv.paid_amount || 0);
        const li = document.createElement("li");
        li.textContent =
          `${inv.invoice_number || "Invoice"} — ${balance.toFixed(2)} ${inv.currency || ""} due` +
          (inv.due_date ? ` (${formatDate(inv.due_date)})` : "");
        ul.appendChild(li);
      }
      box.appendChild(ul);
    }
  }

  async function fetchOutstandingInvoices(studentUuid) {
    try {
      const { data, error } = await db
        .from("invoices")
        .select("invoice_number,amount,paid_amount,currency,status,due_date")
        .eq("student_id", studentUuid)
        .order("due_date", { ascending: true });

      if (error || !Array.isArray(data)) return [];

      return data.filter(i =>
        String(i.status) !== "cancelled" &&
        Number(i.amount || 0) - Number(i.paid_amount || 0) > 0
      );
    } catch (_) {
      return [];
    }
  }

  async function askClearance(studentUuid) {
    const { data, error } = await db.rpc(CLEARANCE_RPC, {
      p_student_id: studentUuid,
      p_scope: CLEARANCE_SCOPE
    });
    if (error) throw new Error("Clearance check failed: " + error.message);
    return data === true;
  }

  async function updateClearance() {
    const token = ++clearanceToken;
    const student = selectedStudent();

    if (!student) {
      clearanceState = "unknown";
      renderClearance("hidden");
      updateButtons();
      return false;
    }

    clearanceState = "checking";
    renderClearance("checking");
    updateButtons();

    try {
      const cleared = await askClearance(student.id);
      if (token !== clearanceToken) return cleared;

      if (cleared) {
        clearanceState = "cleared";
        renderClearance("cleared");
      } else {
        const invoices = await fetchOutstandingInvoices(student.id);
        if (token !== clearanceToken) return false;
        clearanceState = "blocked";
        renderClearance("blocked", invoices);
      }

      updateButtons();
      return cleared;
    } catch (e) {
      console.error("Clearance error:", e);
      if (token === clearanceToken) {
        clearanceState = "error";
        renderClearance("error", [], e.message);
        updateButtons();
      }
      return false;   // fail closed
    }
  }

  /* ---------------- existing letter ---------------- */

  async function refreshExisting() {
    const token = ++existingToken;
    const student = selectedStudent();
    const course = selectedCourse();
    const box = $("existingBox");

    existingLetter = null;
    box.style.display = "none";
    box.textContent = "";

    if (!student || !course) {
      updateButtons();
      return;
    }

    const { data, error } = await db
      .from("certificates")
      .select("id,certificate_no,verify_code,status,issue_date,certificate_type")
      .eq("student_id", student.id)
      .eq("course_id", course.id)
      .eq("certificate_type", "authentication_letter")
      .eq("status", "valid")
      .order("created_at", { ascending: false })
      .limit(1);

    if (token !== existingToken) return;

    if (!error && Array.isArray(data) && data.length) {
      existingLetter = data[0];
      box.textContent =
        `A valid authentication letter already exists for this student and programme ` +
        `(${existingLetter.certificate_no}, issued ${formatDate(existingLetter.issue_date)}). ` +
        `Generating will open it instead of creating a duplicate.`;
      box.style.display = "block";
    }

    updateButtons();
  }

  /* ---------------- summary ---------------- */

  function updateSummary() {
    const student = selectedStudent();
    const course = selectedCourse();
    const inst = institutions.find(i => i.id === selectedInstitutionId());
    const issue = $("issueDate").value;
    const expiry = $("expiryDate").value;

    $("pName").textContent = student?.full_name || "Select a student";
    $("pSub").textContent = student
      ? `${student.student_id || ""}${course ? " • " + course.name : ""}`
      : "Student ID and programme will appear here.";

    $("fId").textContent = student?.student_id || "—";
    $("fCourse").textContent = course?.name || "—";
    $("fInst").textContent = inst?.name || "—";
    $("fAdmission").textContent = formatDate(student?.admission_date);
    $("fIssue").textContent = formatDate(issue);
    $("fExpiry").textContent = formatDate(expiry, "No expiry stated");

    const img = $("photoImg");
    const ph = $("photoPh");
    img.hidden = true;
    ph.hidden = false;
    img.removeAttribute("src");

    if (student?.photo_url && /^https:\/\//i.test(student.photo_url)) {
      img.onload = () => { img.hidden = false; ph.hidden = true; };
      img.onerror = () => { img.hidden = true; ph.hidden = false; };
      img.src = student.photo_url;
    }

    $("certifyText").textContent = student && course
      ? `This is to certify that ${student.full_name} (Student ID: ${student.student_id || "—"}) ` +
        `is a registered student of GAAWOW ACADEMY in the programme of ${course.name}` +
        (student.admission_date ? `, admitted on ${formatDate(student.admission_date)}` : "") +
        `. This letter is issued on ${formatDate(issue)} and may be verified online.`
      : "The official letter is generated once the student is financially cleared.";
  }

  function updateButtons() {
    const ready =
      Boolean(selectedStudent()) &&
      Boolean(selectedCourse()) &&
      clearanceState === "cleared" &&
      !busy;

    $("generateBtn").disabled = !ready;
    $("generateBtn").textContent = busy
      ? "Preparing official letter..."
      : existingLetter
        ? "Open Existing Authentication Letter"
        : "Generate Authentication Letter";
  }

  /* ---------------- generate ---------------- */

  async function assertCleared() {
    const student = selectedStudent();
    if (!student) throw new Error("Please select a student.");

    const cleared = await updateClearance();
    if (!cleared) {
      throw new Error(
        "Financial clearance required: this student has an unpaid balance or " +
        "clearance could not be verified. The letter was not created."
      );
    }
  }

  async function insertCertificateRow(student, course, institutionId) {
    const issueDate = $("issueDate").value || todayISO();
    const expiryDate = $("expiryDate").value || null;

    if (expiryDate && expiryDate < issueDate) {
      throw new Error("Expiry date cannot be earlier than the issue date.");
    }

    const certificateNo = $("certificateNo").value;
    const certificateId = generateNumbers.certificateId;
    const verifyCode = $("verifyCode").value;
    const verificationUrl = verificationUrlFor(verifyCode);

    const hashCode = await sha256([
      certificateNo, certificateId, verifyCode,
      student.id, student.student_id || "", course.id,
      issueDate, expiryDate || "", institutionId, "authentication_letter"
    ].join("|"));

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
      status: "valid",
      certificate_url: null,
      pdf_url: null,
      qr_url: verificationUrl,
      student_name_snapshot: student.full_name || "",
      course_name_snapshot: course.name || "",
      issued_by: currentUser.id,
      certificate_type: "authentication_letter",
      template_url: null,
      student_photo_url: student.photo_url || null,
      verification_url: verificationUrl
    };

    const { data, error } = await db
      .from("certificates")
      .insert(payload)
      .select("id,certificate_no,verify_code")
      .single();

    if (error) {
      if (error.code === "23505") {
        generateNumbers();   // fresh numbers for the next attempt
        throw new Error("A numbering collision occurred. New numbers were generated. Please press Generate again.");
      }
      throw new Error("Could not save the record: " + error.message);
    }

    return data;
  }

  async function generateLetter() {
    if (busy) return;

    const student = selectedStudent();
    const course = selectedCourse();
    const institutionId = selectedInstitutionId();

    if (!student || !course) {
      showMessage("Please select a student and a programme.", "error");
      return;
    }

    if (!institutionId) {
      showMessage("Institution is required.", "error");
      return;
    }

    busy = true;
    updateButtons();
    hideMessage();

    try {
      // 1. Database-side clearance, every time.
      await assertCleared();

      // 2. Reuse the student's valid letter, or create the record.
      let row = existingLetter;
      let created = false;

      if (!row) {
        row = await insertCertificateRow(student, course, institutionId);
        created = true;
      }

      // 3. Existing RPC prepares the official letter.
      showMessage("Preparing the official authentication letter...", "info");

      const { data, error } = await db.rpc(CREATE_AUTH_LETTER_RPC, {
        p_certificate_id: row.id
      });

      if (error) {
        throw new Error(
          (created
            ? "The record was saved, but the letter could not be prepared: "
            : "The letter could not be prepared: ") +
          (error.message || "unknown error") +
          (created ? " You can open it later from the Authentication Letters list." : "")
        );
      }

      const letter = Array.isArray(data) ? data[0] : data;

      if (!letter || typeof letter !== "object") {
        throw new Error("The database did not return the letter data.");
      }

      const returnedCode = String(letter.verification_code || "").trim();

      if (returnedCode.toUpperCase() !== String(row.verify_code).trim().toUpperCase()) {
        throw new Error("The letter code does not match the saved record.");
      }

      if (letter.certificate_id && String(letter.certificate_id) !== String(row.id)) {
        throw new Error("The returned record does not match the selected letter.");
      }

      showMessage(
        created ? "Letter created. Opening the official document..."
                : "Opening the existing official document...",
        "success"
      );

      const params = new URLSearchParams({ code: returnedCode, id: String(row.id) });
      window.location.assign(`${LETTER_PAGE}?${params.toString()}`);

    } catch (e) {
      console.error("Authentication letter generation failed:", e);
      showMessage(e.message || "Unable to generate the authentication letter.", "error");
    } finally {
      busy = false;
      updateButtons();
    }
  }

  /* ---------------- events + init ---------------- */

  function setupEvents() {
    $("institutionSelect").addEventListener("change", async () => {
      try {
        populateStudents();
        await loadCourses();
      } catch (e) {
        showMessage(e.message, "error");
      }
      await onSelectionChanged();
    });

    $("studentSelect").addEventListener("change", onSelectionChanged);
    $("courseSelect").addEventListener("change", onSelectionChanged);
    $("issueDate").addEventListener("change", updateSummary);
    $("expiryDate").addEventListener("change", updateSummary);

    $("generateBtn").addEventListener("click", generateLetter);
    $("backBtn").addEventListener("click", () => { window.location.href = LIST_PAGE; });
    $("listBtn").addEventListener("click", () => { window.location.href = LIST_PAGE; });
  }

  async function onSelectionChanged() {
    hideMessage();
    updateSummary();
    await Promise.all([updateClearance(), refreshExisting()]);
  }

  async function init() {
    try {
      showMessage("Loading Authentication Letter Generator...", "info");

      if (!(await loadAuth())) return;
      await loadProfile();
      await loadInstitutions();
      await loadStudents();
      populateStudents();
      await loadCourses();

      $("issueDate").value = todayISO();
      generateNumbers();
      setupEvents();
      updateSummary();
      updateButtons();
      hideMessage();
    } catch (e) {
      console.error("Initialization error:", e);
      showMessage(e.message || "Unable to initialize the generator.", "error");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
