/* =========================================================
   GAAWOW EMS - STUDENTS MANAGEMENT
   Stable version 14
   Preserves Supabase RPC and student account Edge Function
   ========================================================= */

(() => {
"use strict";

/* CONFIG */
const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";
const ACCOUNT_FUNCTION = SUPABASE_URL + "/functions/v1/create-student-account";
const PHOTO_BUCKET = "student-photos";

const $ = id => document.getElementById(id);

if (!window.supabase) {
 alert("Supabase library lama helin. Hubi CDN script-ka HTML.");
 return;
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* STATE */
let students = [];
let institutions = [];
let allCourses = [];
let allClasses = [];
let allAcademicYears = [];
let enrollments = [];
let editingStudentId = null;
let selectedStudent = null;
let currentPhotoUrl = null;
let isSaving = false;

/* HELPERS */
function escapeHTML(value) {
 return String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
 }[c]));
}

function value(id) {
 return $(id)?.value?.trim() || "";
}

function setValue(id, val) {
 if ($(id)) $(id).value = val ?? "";
}

function showMessage(message, type = "success") {
 const box = $("message");
 if (!box) {
  alert(message);
  return;
 }
 box.textContent = message;
 box.className = "message " + type;
 box.style.display = "block";
 window.clearTimeout(showMessage.timer);
 showMessage.timer = window.setTimeout(() => {
  box.style.display = "none";
 }, 6500);
}

function setLoading(button, loading, text = "Saving...") {
 if (!button) return;
 if (loading) {
  if (!button.dataset.oldText) button.dataset.oldText = button.textContent;
  button.disabled = true;
  button.textContent = text;
 } else {
  button.disabled = false;
  if (button.dataset.oldText) {
   button.textContent = button.dataset.oldText;
   delete button.dataset.oldText;
  }
 }
}

function dateOnly(date) {
 return date ? String(date).slice(0,10) : "";
}

function formatDate(date) {
 if (!date) return "—";
 const d = new Date(date);
 return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function normalizeStatus(status) {
 return String(status || "active").toLowerCase();
}

function getInstitutionName(id) {
 const item = institutions.find(x => x.id === id);
 return item?.name || item?.institution_name || item?.title || "Not assigned";
}

function getCourseName(id) {
 const item = allCourses.find(x => x.id === id);
 return item?.name || item?.course_name || "Not assigned";
}

function getClassName(id) {
 const item = allClasses.find(x => x.id === id);
 return item?.name || item?.class_name || "Not assigned";
}

function getYearName(id) {
 const item = allAcademicYears.find(x => x.id === id);
 return item?.year_name || "";
}

function getEnrollment(studentDbId) {
 return enrollments.find(e => e.student_id === studentDbId) || null;
}

function showProgress(show, percent = 0, message = "") {
 if ($("progressWrap")) $("progressWrap").style.display = show ? "block" : "none";
 if ($("progressBar")) $("progressBar").style.width = percent + "%";
 if ($("progressText")) $("progressText").textContent = message;
}

function setSelectOptions(id, rows, placeholder, labelFn) {
 const select = $(id);
 if (!select) return;

 const previous = select.value;
 select.innerHTML = "";

 const first = document.createElement("option");
 first.value = "";
 first.textContent = placeholder;
 select.appendChild(first);

 rows.forEach(row => {
  const option = document.createElement("option");
  option.value = row.id;
  option.textContent = labelFn(row);
  select.appendChild(option);
 });

 // Dropdown is enabled only when it has actual choices.
 select.disabled = rows.length === 0;

 if (previous && rows.some(row => String(row.id) === String(previous))) {
  select.value = previous;
 } else {
  select.value = "";
 }
}

/* LOAD REFERENCE DATA */
async function loadReferenceData() {
 const results = await Promise.all([
  db.from("institutions").select("*").order("name"),
  db.from("courses").select("*").order("name"),
  db.from("classes").select("*").order("name"),
  db.from("academic_years").select("*").order("year_name")
 ]);

 results.forEach(r => { if (r.error) throw r.error; });

 institutions = results[0].data || [];
 allCourses = results[1].data || [];
 allClasses = results[2].data || [];
 allAcademicYears = results[3].data || [];

 populateInstitutionDropdowns();
}

function populateInstitutionDropdowns() {
 const label = row => row.name || row.institution_name || row.title || "Institution";
 setSelectOptions("institutionSelect", institutions, "Select institution", label);
 setSelectOptions("institutionFilter", institutions, "All institutions", label);
}

/* REGISTRATION CASCADING DROPDOWNS */
function loadRegistrationCourses() {
 const institutionId = value("institutionSelect");

 const rows = allCourses.filter(c =>
  !institutionId || String(c.institution_id) === institutionId
 );

 setSelectOptions("courseSelect", rows, "Select course",
  r => r.name || r.course_name || "Course");

 setSelectOptions("academicYearSelect", [], "Select academic year",
  r => r.year_name);

 setSelectOptions("classSelect", [], "Select class",
  r => r.name || r.class_name || "Class");
}

function loadRegistrationYears() {
 const institutionId = value("institutionSelect");

 const rows = allAcademicYears.filter(y =>
  !institutionId || String(y.institution_id) === institutionId
 );

 setSelectOptions("academicYearSelect", rows, "Select academic year",
  r => r.year_name || "Academic year");

 setSelectOptions("classSelect", [], "Select class",
  r => r.name || r.class_name || "Class");
}

function loadRegistrationClasses() {
 const institutionId = value("institutionSelect");
 const courseId = value("courseSelect");
 const yearId = value("academicYearSelect");
 const year = allAcademicYears.find(y => String(y.id) === yearId);
 const yearName = year?.year_name || "";

 const rows = allClasses.filter(c => {
  const institutionMatch = !institutionId ||
   String(c.institution_id) === institutionId;
  const courseMatch = !courseId ||
   String(c.course_id) === courseId;
  const classYear = String(c.academic_year || "");
  const yearMatch = !yearName || !classYear || classYear === yearName;
  return institutionMatch && courseMatch && yearMatch;
 });

 setSelectOptions("classSelect", rows, "Select class",
  r => r.name || r.class_name || "Class");
}

/* FILTER DROPDOWNS */
function loadFilterCourses() {
 const institutionId = value("institutionFilter");

 const rows = allCourses.filter(c =>
  !institutionId || String(c.institution_id) === institutionId
 );

 setSelectOptions("courseFilter", rows, "All courses",
  r => r.name || r.course_name || "Course");

 setSelectOptions("classFilter", [], "All classes",
  r => r.name || r.class_name || "Class");
}

function loadFilterClasses() {
 const institutionId = value("institutionFilter");
 const courseId = value("courseFilter");

 const rows = allClasses.filter(c =>
  (!institutionId || String(c.institution_id) === institutionId) &&
  (!courseId || String(c.course_id) === courseId)
 );

 setSelectOptions("classFilter", rows, "All classes",
  r => r.name || r.class_name || "Class");

 renderStudents();
}

/* LOAD STUDENTS */
async function loadStudents() {
 const tbody = $("studentsTableBody");
 if (tbody) tbody.innerHTML =
  '<tr><td colspan="13" class="empty">Loading students...</td></tr>';

 const results = await Promise.all([
  db.from("students").select("*").order("created_at",{ascending:false}),
  db.from("enrollments")
   .select("id,institution_id,student_id,course_id,class_id,academic_year_id,enrollment_number,enrollment_date,start_date,end_date,status,created_at")
   .order("created_at",{ascending:false}),
  db.from("courses").select("id,institution_id,name,code"),
  db.from("classes").select("id,institution_id,course_id,name,code,academic_year"),
  db.from("academic_years").select("id,institution_id,year_name")
 ]);

 results.forEach(r => { if (r.error) throw r.error; });

 allCourses = results[2].data || [];
 allClasses = results[3].data || [];
 allAcademicYears = results[4].data || [];
 enrollments = results[1].data || [];

 const latest = new Map();
 enrollments.forEach(e => {
  if (!latest.has(e.student_id)) latest.set(e.student_id,e);
 });

 students = (results[0].data || []).map(s => ({
  ...s,
  enrollment: latest.get(s.id) || null
 }));

 renderStudents();
 updateStatistics();
}

/* TABLE */
function renderStudents() {
 const tbody = $("studentsTableBody");
 if (!tbody) return;

 const search = value("searchInput").toLowerCase();
 const institutionFilter = value("institutionFilter");
 const courseFilter = value("courseFilter");
 const classFilter = value("classFilter");
 const statusFilter = value("statusFilter");

 const filtered = students.filter(s => {
  const e = s.enrollment || getEnrollment(s.id);
  const institutionId = e?.institution_id || s.institution_id || "";
  const courseId = e?.course_id || "";
  const classId = e?.class_id || "";
  const status = normalizeStatus(s.status);

  const text = [
   s.student_id,s.full_name,s.phone,s.email,s.address
  ].join(" ").toLowerCase();

  return (!search || text.includes(search)) &&
   (!institutionFilter || String(institutionId) === institutionFilter) &&
   (!courseFilter || String(courseId) === courseFilter) &&
   (!classFilter || String(classId) === classFilter) &&
   (!statusFilter || status === statusFilter);
 });

 if ($("filterCount")) {
  $("filterCount").textContent = filtered.length + " of " + students.length + " students";
 }

 if (!filtered.length) {
  tbody.innerHTML = '<tr><td colspan="13" class="empty">No students found.</td></tr>';
  return;
 }

 tbody.innerHTML = filtered.map(s => {
  const e = s.enrollment || getEnrollment(s.id);
  const institutionId = e?.institution_id || s.institution_id || "";
  const courseId = e?.course_id || "";
  const classId = e?.class_id || "";
  const status = normalizeStatus(s.status);
  const photo = s.photo_url
   ? `<img src="${escapeHTML(s.photo_url)}" alt="Student" class="student-photo">`
   : `<div class="initials">${escapeHTML((s.full_name || "S").charAt(0).toUpperCase())}</div>`;

  const hasAccount = Boolean(s.auth_user_id || s.account_enabled);

  return `
   <tr data-student-id="${escapeHTML(s.id)}">
    <td>${photo}</td>
    <td><strong>${escapeHTML(s.student_id || "—")}</strong></td>
    <td>${escapeHTML(s.full_name || "—")}</td>
    <td>${escapeHTML(getInstitutionName(institutionId))}</td>
    <td>${escapeHTML(getCourseName(courseId))}</td>
    <td>${escapeHTML(getClassName(classId))}</td>
    <td>${escapeHTML(s.gender || "—")}</td>
    <td>${escapeHTML(s.phone || "—")}</td>
    <td>${escapeHTML(s.email || "—")}</td>
    <td><span class="status status-${escapeHTML(status)}">${escapeHTML(status)}</span></td>
    <td>${escapeHTML(formatDate(s.admission_date))}</td>
    <td><span class="status ${hasAccount ? "status-active" : "status-pending"}">${hasAccount ? "Enabled" : "No account"}</span></td>
    <td class="actions">
     <button type="button" class="btn-small action-view" data-action="view" data-id="${escapeHTML(s.id)}">View</button>
     <button type="button" class="btn-small action-edit" data-action="edit" data-id="${escapeHTML(s.id)}">Edit</button>
     <button type="button" class="btn-small action-create-account" data-action="account" data-id="${escapeHTML(s.id)}">Account</button>
     <button type="button" class="btn-small action-delete" data-action="delete" data-id="${escapeHTML(s.id)}">Delete</button>
    </td>
   </tr>`;
 }).join("");
}

/* STATISTICS */
function updateStatistics() {
 const total = students.length;
 const active = students.filter(s => normalizeStatus(s.status) === "active").length;
 const graduated = students.filter(s => normalizeStatus(s.status) === "graduated").length;

 if ($("totalStudents")) $("totalStudents").textContent = total;
 if ($("activeStudents")) $("activeStudents").textContent = active;
 if ($("graduatedStudents")) $("graduatedStudents").textContent = graduated;
 if ($("otherStudents")) $("otherStudents").textContent = total - active - graduated;
}

/* PHOTO */
async function uploadStudentPhoto(studentDbId) {
 const file = $("photoInput")?.files?.[0];
 if (!file) return currentPhotoUrl;

 if (!file.type.startsWith("image/")) throw new Error("Fadlan dooro sawir image ah.");
 if (file.size > 5 * 1024 * 1024) throw new Error("Sawirka waa inuu ka yaraadaa 5MB.");

 const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
 const path = "students/" + studentDbId + "/" + crypto.randomUUID() + "." + extension;

 const {error} = await db.storage.from(PHOTO_BUCKET).upload(path,file,{
  cacheControl:"3600",upsert:false,contentType:file.type
 });
 if (error) throw error;

 const {data} = db.storage.from(PHOTO_BUCKET).getPublicUrl(path);
 return data?.publicUrl || null;
}

function previewSelectedPhoto() {
 const file = $("photoInput")?.files?.[0];
 if (!file) return;

 if (!file.type.startsWith("image/")) {
  showMessage("Fadlan dooro sawir image ah.","error");
  $("photoInput").value = "";
  return;
 }

 if (file.size > 5 * 1024 * 1024) {
  showMessage("Sawirka waa inuu ka yaraadaa 5MB.","error");
  $("photoInput").value = "";
  return;
 }

 const reader = new FileReader();
 reader.onload = e => {
  if ($("photoPreview")) {
   $("photoPreview").src = e.target.result;
   $("photoPreview").style.display = "block";
  }
  if ($("photoPlaceholder")) $("photoPlaceholder").style.display = "none";
 };
 reader.readAsDataURL(file);
}

/* FORM */
function getStudentFormData() {
 return {
  institution_id:value("institutionSelect"),
  course_id:value("courseSelect"),
  academic_year_id:value("academicYearSelect"),
  class_id:value("classSelect"),
  full_name:value("fullName"),
  gender:value("gender") || null,
  date_of_birth:value("dateOfBirth") || null,
  phone:value("phone") || null,
  email:value("email") || null,
  admission_date:value("admissionDate"),
  status:value("status") || "active",
  address:value("address") || null
 };
}

function validateStudentForm(d) {
 if (!d.institution_id) throw new Error("Fadlan dooro Institution.");
 if (!d.course_id) throw new Error("Fadlan dooro Course.");
 if (!d.academic_year_id) throw new Error("Fadlan dooro Academic Year.");
 if (!d.class_id) throw new Error("Fadlan dooro Class.");
 if (!d.full_name) throw new Error("Fadlan geli magaca ardayga.");
 if (!d.admission_date) throw new Error("Fadlan geli Admission Date.");

 const c = allClasses.find(x => String(x.id) === d.class_id);
 if (!c) throw new Error("Class-ka la doortay lama helin.");
 if (String(c.institution_id) !== d.institution_id) {
  throw new Error("Class-kan kuma jiro Institution-ka la doortay.");
 }
 if (String(c.course_id) !== d.course_id) {
  throw new Error("Class-kan kuma jiro Course-ka la doortay.");
 }

 const year = allAcademicYears.find(x => String(x.id) === d.academic_year_id);
 if (!year || String(year.institution_id) !== d.institution_id) {
  throw new Error("Academic Year-ka la doortay kuma jiro Institution-kan.");
 }
}

/* CREATE STUDENT THROUGH EXISTING RPC */
async function createStudent(d) {
 const {data:result,error} = await db.rpc("create_student_with_enrollment",{
  p_institution_id:d.institution_id,
  p_course_id:d.course_id,
  p_full_name:d.full_name,
  p_admission_date:d.admission_date,
  p_gender:d.gender,
  p_date_of_birth:d.date_of_birth,
  p_phone:d.phone,
  p_email:d.email,
  p_address:d.address,
  p_status:d.status
 });

 if (error) throw error;

 const payload = result || {};
 const record = payload.student || payload.data?.student || payload;
 const studentDbId =
  record.id || payload.student_id_db || payload.student_db_id || payload.id;

 if (!studentDbId) {
  throw new Error("RPC-ga wuu jawaabay laakiin Student database ID lama helin. Hubi RPC response-ka ka hor registration kale.");
 }

 const {data:enrollment,error:enrollmentError} = await db
  .from("enrollments")
  .select("id,student_id")
  .eq("student_id",studentDbId)
  .order("created_at",{ascending:false})
  .limit(1)
  .maybeSingle();

 if (enrollmentError) throw enrollmentError;
 if (!enrollment?.id) {
  throw new Error("Student waa la sameeyay, laakiin enrollment lama helin. Ha ku celin registration-ka ilaa la hubiyo.");
 }

 const {error:linkError} = await db.from("enrollments")
  .update({
   institution_id:d.institution_id,
   course_id:d.course_id,
   class_id:d.class_id,
   academic_year_id:d.academic_year_id
  })
  .eq("id",enrollment.id);

 if (linkError) {
  throw new Error("Student waa la sameeyay, laakiin Class/Academic Year lama xiriirin. Enrollment ID: " + enrollment.id + ". Hubi RLS permission-ka enrollments.");
 }

 return studentDbId;
}

/* UPDATE STUDENT AND ITS CURRENT ENROLLMENT */
async function updateStudent(studentDbId,d) {
 const {error:studentError} = await db.from("students")
  .update({
   full_name:d.full_name,gender:d.gender,date_of_birth:d.date_of_birth,
   phone:d.phone,email:d.email,address:d.address,
   admission_date:d.admission_date,status:d.status
  })
  .eq("id",studentDbId);

 if (studentError) throw studentError;

 const enrollment = getEnrollment(studentDbId);

 if (enrollment?.id) {
  const {error:enrollmentError} = await db.from("enrollments")
   .update({
    institution_id:d.institution_id,
    course_id:d.course_id,
    class_id:d.class_id,
    academic_year_id:d.academic_year_id
   })
   .eq("id",enrollment.id);

  if (enrollmentError) {
   throw new Error("Xogta ardayga waa la cusboonaysiiyey, laakiin enrollment-ka lama cusboonaysiin: " + enrollmentError.message);
  }
 } else {
  throw new Error("Student-kan enrollment ma laha. Xogta ardayga waa la cusboonaysiiyey, laakiin enrollment cusub lama samayn.");
 }
}

/* SAVE */
async function saveStudent(event) {
 event?.preventDefault();
 if (isSaving) return;

 const button = $("saveButton");
 const d = getStudentFormData();

 try {
  validateStudentForm(d);
  isSaving = true;
  setLoading(button,true,"Saving...");
  showProgress(true,15,"Saving student information...");

  let studentDbId = editingStudentId;

  if (editingStudentId) {
   await updateStudent(editingStudentId,d);
  } else {
   studentDbId = await createStudent(d);
  }

  showProgress(true,65,"Uploading student photo...");
  const photoUrl = await uploadStudentPhoto(studentDbId);

  if (photoUrl) {
   const {error} = await db.from("students")
    .update({photo_url:photoUrl}).eq("id",studentDbId);
   if (error) throw error;
  }

  showProgress(true,100,"Finishing...");
  showMessage(editingStudentId ? "Student information updated successfully." : "Student registered successfully.","success");

  resetStudentForm();
  await loadStudents();

 } catch (error) {
  console.error("Save student error:",error);
  showMessage(error.message || "Student save failed.","error");
 } finally {
  isSaving = false;
  setLoading(button,false);
  showProgress(false);
 }
}

/* FORM RESET */
function resetStudentForm() {
 $("studentForm")?.reset();
 editingStudentId = null;
 currentPhotoUrl = null;
 selectedStudent = null;

 setValue("editStudentDbId","");
 if ($("saveButton")) $("saveButton").textContent = "Save Student & Enroll";
 if ($("formTitle")) $("formTitle").textContent = "Add Student";

 if ($("photoPreview")) {
  $("photoPreview").src = "";
  $("photoPreview").style.display = "none";
 }
 if ($("photoPlaceholder")) $("photoPlaceholder").style.display = "flex";
 if ($("photoInput")) $("photoInput").value = "";

 updateAccountControls(null);
 loadRegistrationCourses();
 loadRegistrationYears();
}

/* EDIT */
function editStudent(studentDbId) {
 const s = students.find(x => x.id === studentDbId);
 if (!s) return;

 const e = s.enrollment || getEnrollment(s.id);
 if (!e) {
  showMessage("Student-kan enrollment ma laha. Fadlan hubi database-ka ka hor edit.","error");
  return;
 }

 editingStudentId = s.id;
 selectedStudent = s;
 currentPhotoUrl = s.photo_url || null;

 setValue("editStudentDbId",s.id);
 setValue("studentId",s.student_id);
 setValue("fullName",s.full_name);
 setValue("gender",s.gender);
 setValue("dateOfBirth",dateOnly(s.date_of_birth));
 setValue("phone",s.phone);
 setValue("email",s.email);
 setValue("admissionDate",dateOnly(s.admission_date));
 setValue("status",s.status);
 setValue("address",s.address);

 setValue("institutionSelect",e.institution_id || s.institution_id || "");
 loadRegistrationCourses();

 setValue("courseSelect",e.course_id || "");
 loadRegistrationYears();

 setValue("academicYearSelect",e.academic_year_id || "");
 loadRegistrationClasses();

 setValue("classSelect",e.class_id || "");

 if ($("photoPreview")) {
  $("photoPreview").src = s.photo_url || "";
  $("photoPreview").style.display = s.photo_url ? "block" : "none";
 }
 if ($("photoPlaceholder")) $("photoPlaceholder").style.display = s.photo_url ? "none" : "flex";

 if ($("saveButton")) $("saveButton").textContent = "Update Student";
 if ($("formTitle")) $("formTitle").textContent = "Edit Student";

 updateAccountControls(s);
 $("studentForm")?.scrollIntoView({behavior:"smooth",block:"start"});
}

/* ACCOUNT CONTROL DISPLAY */
function updateAccountControls(student) {
 const hasAccount = Boolean(student?.auth_user_id || student?.account_enabled);
 if ($("accountStatus")) {
  $("accountStatus").textContent = hasAccount ? "Account Enabled" : "No Account";
  $("accountStatus").className = "status " + (hasAccount ? "status-active" : "status-inactive");
 }
 if ($("createAccountButton")) $("createAccountButton").style.display = student && !hasAccount ? "inline-block" : "none";
 if ($("resetPasswordButton")) $("resetPasswordButton").style.display = student && hasAccount ? "inline-block" : "none";
}

/* VIEW */
function viewStudent(studentDbId) {
 const s = students.find(x => x.id === studentDbId);
 if (!s) return;

 selectedStudent = s;
 updateAccountControls(s);

 const e = s.enrollment || getEnrollment(s.id);
 const photo = s.photo_url
  ? `<img src="${escapeHTML(s.photo_url)}" class="profile-photo" alt="Student photo">`
  : "";

 const items = [
  ["Student ID",s.student_id],["Institution",getInstitutionName(e?.institution_id || s.institution_id)],
  ["Course",getCourseName(e?.course_id)],["Class",getClassName(e?.class_id)],
  ["Academic Year",getYearName(e?.academic_year_id)],["Gender",s.gender],
  ["Date of Birth",formatDate(s.date_of_birth)],["Phone",s.phone],
  ["Email",s.email],["Admission Date",formatDate(s.admission_date)],
  ["Status",s.status],["Address",s.address],
  ["Portal Account",s.auth_user_id || s.account_enabled ? "Enabled" : "Not created"]
 ];

 $("profileContent").innerHTML = `
  <div class="profile-top">${photo}<div><div class="profile-name">${escapeHTML(s.full_name || "Student")}</div><div class="profile-id">${escapeHTML(s.student_id || "")}</div></div></div>
  <div class="profile-grid">
   ${items.map(([k,v]) => `<div class="profile-item"><strong>${escapeHTML(k)}</strong><span>${escapeHTML(v || "—")}</span></div>`).join("")}
  </div>`;

 $("profileModal").style.display = "flex";
 $("profileModal").classList.add("show");
 $("profileModal").classList.add("open");
 $("profileModal").setAttribute("aria-hidden","false");
}

function closeProfile() {
 if (!$("profileModal")) return;
 $("profileModal").style.display = "none";
 $("profileModal").classList.remove("show","open");
 $("profileModal").setAttribute("aria-hidden","true");
}

/* DELETE */
async function deleteStudent(studentDbId) {
 const s = students.find(x => x.id === studentDbId);
 if (!s) return;

 if (!confirm("Ma hubtaa inaad tirtirayso ardaygan?\n\n" + s.full_name + " (" + s.student_id + ")")) return;

 try {
  const {error} = await db.from("students").delete().eq("id",studentDbId);
  if (error) throw error;
  showMessage("Student deleted successfully.","success");
  await loadStudents();
 } catch (error) {
  console.error("Delete student error:",error);
  showMessage(error.message || "Student deletion failed. Hubi permissions iyo xiriirka records-ka.","error");
 }
}

/* EDGE FUNCTION AUTH */
async function getAccessToken() {
 const {data,error} = await db.auth.getSession();
 if (error) throw error;
 const token = data?.session?.access_token;
 if (!token) throw new Error("Fadlan marka hore login samee.");
 return token;
}

async function callStudentAccountFunction(payload) {
 let token = await getAccessToken();

 const send = accessToken => fetch(ACCOUNT_FUNCTION,{
  method:"POST",
  headers:{
   "Content-Type":"application/json",
   "apikey":SUPABASE_KEY,
   "Authorization":"Bearer " + accessToken
  },
  body:JSON.stringify(payload)
 });

 let response = await send(token);

 if (response.status === 401) {
  const {data,error} = await db.auth.refreshSession();
  if (error) throw error;
  token = data?.session?.access_token;
  if (!token) throw new Error("Session refresh failed. Fadlan dib u login samee.");
  response = await send(token);
 }

 let result;
 try {
  result = await response.json();
 } catch {
  throw new Error("Edge Function-ku ma soo celin JSON response sax ah.");
 }

 if (!response.ok || result.success === false) {
  throw new Error(result.error || result.message || "Student account operation failed (" + response.status + ").");
 }
 return result;
}

/* CREATE ACCOUNT */
async function createStudentAccount(studentDbId) {
 const s = students.find(x => x.id === studentDbId);
 if (!s) throw new Error("Student lama helin.");
 if (s.auth_user_id || s.account_enabled) {
  throw new Error("Student-kan account hore ayuu u leeyahay. Isticmaal Reset Password.");
 }

 const email = s.email || prompt("Geli email-ka student-ka:");
 if (!email) return;

 const password = prompt("Geli temporary password-ka student-ka:");
 if (!password) return;
 if (password.length < 6) throw new Error("Password-ku waa inuu ugu yaraan 6 xaraf noqdaa.");

 const result = await callStudentAccountFunction({
  action:"create",
  student_db_id:s.id,
  student_id:s.student_id,
  email:email,
  full_name:s.full_name,
  password:password
 });

 showMessage("Student account waa la sameeyay. " + (result.email || email),"success");
 await loadStudents();
}

/* RESET PASSWORD */
async function resetStudentPassword(studentDbId) {
 const s = students.find(x => x.id === studentDbId);
 if (!s) throw new Error("Student lama helin.");
 if (!s.auth_user_id && !s.account_enabled) {
  throw new Error("Student-kan account ma laha. Marka hore Create Account samee.");
 }

 const password = prompt("Geli password-ka cusub ee student-ka:");
 if (!password) return;
 if (password.length < 6) throw new Error("Password-ku waa inuu ugu yaraan 6 xaraf noqdaa.");

 const result = await callStudentAccountFunction({
  action:"reset",
  student_db_id:s.id,
  student_id:s.student_id,
  password:password
 });

 showMessage(result.message || "Student password successfully reset.","success");
 await loadStudents();
}

async function handleAccountAction(studentDbId) {
 const s = students.find(x => x.id === studentDbId);
 if (!s) return;

 try {
  if (s.auth_user_id || s.account_enabled) {
   if (confirm("Student account hore ayuu u jiraa.\nOK = Reset Password\nCancel = Jooji")) {
    await resetStudentPassword(studentDbId);
   }
  } else {
   await createStudentAccount(studentDbId);
  }
 } catch (error) {
  console.error("Student account error:",error);
  showMessage(error.message || "Account operation failed.","error");
 }
}

/* TABLE EVENTS */
function handleTableClick(event) {
 const button = event.target.closest("[data-action]");
 if (!button) return;

 const action = button.dataset.action;
 const id = button.dataset.id;
 if (!id) return;

 if (action === "view") viewStudent(id);
 if (action === "edit") editStudent(id);
 if (action === "delete") deleteStudent(id);
 if (action === "account") handleAccountAction(id);
}

/* FILTER RESET */
function resetFilters() {
 setValue("institutionFilter","");
 setValue("courseFilter","");
 setValue("classFilter","");
 setValue("statusFilter","");
 setValue("searchInput","");
 loadFilterCourses();
 loadFilterClasses();
 renderStudents();
}

/* EVENTS */
function bindEvents() {
 $("studentForm")?.addEventListener("submit",saveStudent);

 $("institutionSelect")?.addEventListener("change",() => {
  loadRegistrationCourses();
  loadRegistrationYears();
 });

 $("courseSelect")?.addEventListener("change",() => {
  loadRegistrationClasses();
 });

 $("academicYearSelect")?.addEventListener("change",() => {
  loadRegistrationClasses();
 });

 $("institutionFilter")?.addEventListener("change",() => {
  loadFilterCourses();
  loadFilterClasses();
 });

 $("courseFilter")?.addEventListener("change",loadFilterClasses);
 $("classFilter")?.addEventListener("change",renderStudents);
 $("statusFilter")?.addEventListener("change",renderStudents);
 $("searchInput")?.addEventListener("input",renderStudents);
 $("resetFiltersButton")?.addEventListener("click",resetFilters);
 $("resetFormButton")?.addEventListener("click",resetStudentForm);

 $("addStudentButton")?.addEventListener("click",() => {
  resetStudentForm();
  $("studentForm")?.scrollIntoView({behavior:"smooth",block:"start"});
 });

 $("refreshStudentsButton")?.addEventListener("click",async () => {
  try {
   await loadStudents();
   showMessage("Student list refreshed.","success");
  } catch (error) {
   showMessage(error.message,"error");
  }
 });

 $("photoInput")?.addEventListener("change",previewSelectedPhoto);
 $("studentsTableBody")?.addEventListener("click",handleTableClick);
 $("closeProfileModal")?.addEventListener("click",closeProfile);

 $("profileModal")?.addEventListener("click",event => {
  if (event.target === $("profileModal")) closeProfile();
 });

 $("createAccountButton")?.addEventListener("click",async () => {
  if (!selectedStudent) {
   showMessage("Marka hore dooro student.","error");
   return;
  }
  try {
   await createStudentAccount(selectedStudent.id);
  } catch (error) {
   showMessage(error.message,"error");
  }
 });

 $("resetPasswordButton")?.addEventListener("click",async () => {
  if (!selectedStudent) {
   showMessage("Marka hore dooro student.","error");
   return;
  }
  try {
   await resetStudentPassword(selectedStudent.id);
  } catch (error) {
   showMessage(error.message,"error");
  }
 });
}

/* INITIALIZATION */
async function initializeStudentsPage() {
 try {
  bindEvents();
  showProgress(true,10,"Loading institutions and courses...");

  await loadReferenceData();

  showProgress(true,55,"Loading student records...");
  await loadStudents();

  loadRegistrationCourses();
  loadRegistrationYears();
  loadFilterCourses();
  loadFilterClasses();

  updateAccountControls(null);
  showProgress(false);

  console.log("GAAWOW EMS Students module initialized.");
 } catch (error) {
  console.error("Students page initialization error:",error);
  showMessage("Students page loading failed: " + (error.message || error),"error");
  showProgress(false);
 }
}

if (document.readyState === "loading") {
 document.addEventListener("DOMContentLoaded",initializeStudentsPage);
} else {
 initializeStudentsPage();
}

})();
