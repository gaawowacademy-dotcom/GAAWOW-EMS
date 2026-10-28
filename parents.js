/* =========================================================
   GAAWOW EMS — PARENT MANAGEMENT
   Parent CRUD, student linking, portal account create/reset.
   Keep service-role credentials inside the Supabase Edge Function only.
   ========================================================= */

const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";
const PARENT_ACCOUNT_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-parent-account`;

let supabaseClient = null;

let currentUser = null;
let currentProfile = null;
let parents = [];
let filteredParents = [];
let institutions = [];
let students = [];
let courses = [];
let classes = [];
let enrollments = [];
let links = [];
let editingParentId = null;
let selectedParent = null;
let accountParentId = null;
let parentAccountAction = "create";
let currentPage = 1;
const pageSize = 10;
let toastTimer = null;

window.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      setTableMessage("Supabase library did not load. Check your internet connection, then refresh this page.");
      return;
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    bindEvents();
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user) {
      showToast("Please sign in to GAAWOW EMS first.", true);
      setTableMessage("You are not signed in. Please sign in, then open Parent Management.");
      return;
    }
    currentUser = session.user;
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id,full_name,role,is_active,institution_id")
      .eq("id", currentUser.id)
      .maybeSingle();
    if (profileError) throw profileError;
    currentProfile = profile;
    if (!profile || profile.role !== "super_admin" || profile.is_active !== true) {
      setTableMessage("Active Super Admin access is required to manage parent accounts.");
      showToast("Active Super Admin access is required.", true);
      document.querySelector("main")?.classList.add("loading");
      return;
    }
    await withTimeout(loadBaseData(), 20000, "Loading institutions, students, courses, classes, or enrollments took too long. Check the browser Console and Supabase connection.");
    await withTimeout(loadParents(), 20000, "Loading parent records took too long. Check Supabase connectivity and permissions.");
    await withTimeout(loadLinks(), 20000, "Loading parent-student links took too long. Check Supabase connectivity and permissions.");
    fillInstitutionFilter();
    applyFilters();
    updateStats();
  } catch (error) {
    console.error("Parent Management initialization failed:", error);
    const message = errorMessage(error, "Could not load Parent Management.");
    try { setTableMessage(message); } catch (uiError) { console.error("Could not update Parent Management error message:", uiError); }
    try { showToast(message, true); } catch (uiError) { console.error("Could not show Parent Management toast:", uiError); }
  }
}

function bindEvents() {
  byId("addParentBtn").addEventListener("click", () => openParentModal());
  byId("refreshBtn").addEventListener("click", refreshAll);
  byId("searchInput").addEventListener("input", applyFilters);
  byId("institutionFilter").addEventListener("change", applyFilters);
  byId("accountFilter").addEventListener("change", applyFilters);
  byId("prevPageBtn").addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderParents(); } });
  byId("nextPageBtn").addEventListener("click", () => { const max = Math.max(1, Math.ceil(filteredParents.length / pageSize)); if (currentPage < max) { currentPage++; renderParents(); } });
  byId("parentForm").addEventListener("submit", saveParent);
  byId("parentAccountForm").addEventListener("submit", submitParentAccount);
  byId("linkCourse").addEventListener("change", () => { populateClassOptions(); populateStudentOptions(); });
  byId("linkClass").addEventListener("change", populateStudentOptions);
  byId("linkStudentBtn").addEventListener("click", linkStudent);
  document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.close)));
  document.querySelectorAll(".modal").forEach(modal => modal.addEventListener("click", event => { if (event.target === modal) closeModal(modal.id); }));
  byId("parentsTableBody").addEventListener("click", handleTableAction);
  byId("linkedStudentsList").addEventListener("click", handleLinkedStudentAction);
  document.addEventListener("keydown", event => { if (event.key === "Escape") document.querySelectorAll(".modal.show").forEach(modal => closeModal(modal.id)); });
}

async function refreshAll() {
  const button = byId("refreshBtn");
  button.disabled = true;
  try {
    await loadBaseData();
    await loadParents();
    await loadLinks();
    fillInstitutionFilter();
    applyFilters();
    updateStats();
    showToast("Parent records refreshed.");
  } catch (error) {
    showToast(errorMessage(error, "Refresh failed."), true);
  } finally { button.disabled = false; }
}

async function loadBaseData() {
  const results = await Promise.all([
    supabaseClient.from("institutions").select("id,name,code").order("name"),
    supabaseClient.from("students").select("id,institution_id,student_id,full_name,status").order("full_name"),
    supabaseClient.from("courses").select("id,institution_id,name,code,is_active").order("name"),
    supabaseClient.from("classes").select("id,institution_id,course_id,name,code,is_active,status").order("name"),
    supabaseClient.from("enrollments").select("id,student_id,course_id,class_id,status")
  ]);
  const labels = ["institutions", "students", "courses", "classes", "enrollments"];
  results.forEach((result, index) => { if (result.error) throw new Error(`${labels[index]}: ${result.error.message}`); });
  institutions = results[0].data || [];
  students = results[1].data || [];
  courses = results[2].data || [];
  classes = results[3].data || [];
  enrollments = results[4].data || [];
  populateInstitutionOptions();
  populateCourseOptions();
}

async function loadParents() {
  const { data, error } = await supabaseClient.from("parents")
    .select("id,institution_id,profile_id,full_name,phone,email,address,occupation,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  parents = data || [];
}

async function loadLinks() {
  const { data, error } = await supabaseClient.from("parent_students")
    .select("id,parent_id,student_id,relationship,is_primary,created_at");
  if (error) throw error;
  links = data || [];
}

function fillInstitutionFilter() {
  const select = byId("institutionFilter");
  const old = select.value;
  select.innerHTML = `<option value="">All institutions</option>` + institutions.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name || item.code || "Institution")}</option>`).join("");
  if ([...select.options].some(option => option.value === old)) select.value = old;
}

function populateInstitutionOptions() {
  const select = byId("parentInstitution");
  const old = select.value;
  select.innerHTML = `<option value="">Select institution</option>` + institutions.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name || item.code || "Institution")}</option>`).join("");
  if ([...select.options].some(option => option.value === old)) select.value = old;
}

function populateCourseOptions() {
  const select = byId("linkCourse");
  const old = select.value;
  select.innerHTML = `<option value="">All courses</option>` + courses.filter(isActiveRecord).map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name || item.course_name || item.code || "Course")}</option>`).join("");
  if ([...select.options].some(option => option.value === old)) select.value = old;
  populateClassOptions();
  populateStudentOptions();
}

function populateClassOptions() {
  const courseId = byId("linkCourse").value;
  const select = byId("linkClass");
  const old = select.value;
  const available = classes.filter(item => isActiveRecord(item) && (!courseId || item.course_id === courseId));
  select.innerHTML = `<option value="">All classes</option>` + available.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name || item.class_name || item.code || "Class")}</option>`).join("");
  if ([...select.options].some(option => option.value === old)) select.value = old;
}

function populateStudentOptions() {
  const courseId = byId("linkCourse").value;
  const classId = byId("linkClass").value;
  const parentInstitutionId = selectedParent?.institution_id;
  const linkedStudentIds = new Set(links.filter(item => item.parent_id === selectedParent?.id).map(item => item.student_id));
  const enrolledStudentIds = new Set(enrollments.filter(item => isActiveEnrollment(item) && (!courseId || item.course_id === courseId) && (!classId || item.class_id === classId)).map(item => item.student_id));
  const available = students.filter(student => {
    if (parentInstitutionId && student.institution_id && student.institution_id !== parentInstitutionId) return false;
    if (linkedStudentIds.has(student.id)) return false;
    if (courseId || classId) return enrolledStudentIds.has(student.id);
    return isActiveRecord(student);
  });
  const select = byId("linkStudent");
  select.innerHTML = `<option value="">Select student</option>` + available.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.full_name || "Student")} — ${escapeHtml(item.student_id || shortId(item.id))}</option>`).join("");
}

function applyFilters() {
  const query = byId("searchInput").value.trim().toLowerCase();
  const institutionId = byId("institutionFilter").value;
  const account = byId("accountFilter").value;
  filteredParents = parents.filter(parent => {
    const text = [parent.full_name, parent.email, parent.phone, parent.address, parent.occupation].join(" ").toLowerCase();
    if (query && !text.includes(query)) return false;
    if (institutionId && parent.institution_id !== institutionId) return false;
    if (account === "linked" && !parent.profile_id) return false;
    if (account === "not-linked" && parent.profile_id) return false;
    return true;
  });
  currentPage = 1;
  renderParents();
  updateStats();
}

function renderParents() {
  const tbody = byId("parentsTableBody");
  if (!filteredParents.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty"><i class="fa-solid fa-users-slash"></i><br>No parent records match your search.</td></tr>`;
    byId("pageInfo").textContent = "Showing 0 parents";
    byId("prevPageBtn").disabled = true;
    byId("nextPageBtn").disabled = true;
    return;
  }
  const maxPage = Math.max(1, Math.ceil(filteredParents.length / pageSize));
  currentPage = Math.min(currentPage, maxPage);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filteredParents.slice(start, start + pageSize);
  tbody.innerHTML = pageRows.map(parent => {
    const institution = institutions.find(item => item.id === parent.institution_id);
    const parentLinks = links.filter(item => item.parent_id === parent.id);
    const linkedCount = parentLinks.length;
    const initials = initialsFor(parent.full_name);
    return `<tr>
      <td><div class="person"><div class="avatar">${escapeHtml(initials)}</div><div><b>${escapeHtml(parent.full_name || "Unnamed parent")}</b><small>${escapeHtml(parent.occupation || "Parent / guardian")}</small></div></div></td>
      <td><div>${escapeHtml(parent.phone || "No phone")}</div><small class="muted">${escapeHtml(parent.email || "No email")}</small></td>
      <td>${escapeHtml(institution?.name || institution?.code || "Not set")}</td>
      <td><span class="badge">${linkedCount} student${linkedCount === 1 ? "" : "s"}</span></td>
      <td>${parent.profile_id ? `<span class="badge ok"><i class="fa-solid fa-circle-check"></i>&nbsp; Linked</span>` : `<span class="badge warn"><i class="fa-solid fa-circle-exclamation"></i>&nbsp; No account</span>`}</td>
      <td>${escapeHtml(formatDate(parent.created_at))}</td>
      <td><div class="actions">
        <button class="btn btn-light btn-sm" data-action="edit" data-id="${escapeHtml(parent.id)}" title="Edit parent"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="btn btn-light btn-sm" data-action="students" data-id="${escapeHtml(parent.id)}" title="Manage linked students"><i class="fa-solid fa-children"></i> Students</button>
        <button class="btn btn-primary btn-sm" data-action="account" data-id="${escapeHtml(parent.id)}" title="${parent.profile_id ? "Reset parent password" : "Create parent account"}"><i class="fa-solid ${parent.profile_id ? "fa-key" : "fa-user-shield"}"></i> ${parent.profile_id ? "Reset Password" : "Create Account"}</button>
        <button class="btn btn-danger btn-sm" data-action="delete" data-id="${escapeHtml(parent.id)}" title="Delete parent record"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join("");
  byId("pageInfo").textContent = `Showing ${start + 1}–${Math.min(start + pageSize, filteredParents.length)} of ${filteredParents.length} parents`;
  byId("prevPageBtn").disabled = currentPage <= 1;
  byId("nextPageBtn").disabled = currentPage >= maxPage;
}

function updateStats() {
  byId("totalParents").textContent = String(parents.length);
  byId("linkedParents").textContent = String(parents.filter(parent => parent.profile_id).length);
  byId("totalLinks").textContent = String(links.length);
  byId("totalInstitutions").textContent = String(institutions.length);
}

function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const parentId = button.dataset.id;
  if (action === "edit") openParentModal(parentId);
  if (action === "students") openLinksModal(parentId);
  if (action === "account") openParentAccount(parentId);
  if (action === "delete") deleteParent(parentId);
}

function openParentModal(parentId = null) {
  editingParentId = parentId;
  byId("parentForm").reset();
  const parent = parentId ? parents.find(item => item.id === parentId) : null;
  byId("parentModalTitle").textContent = parent ? "Edit Parent" : "Add Parent";
  byId("saveParentBtn").innerHTML = `<i class="fa-solid fa-floppy-disk"></i> ${parent ? "Save Changes" : "Save Parent"}`;
  if (parent) {
    byId("parentInstitution").value = parent.institution_id || "";
    byId("parentFullName").value = parent.full_name || "";
    byId("parentPhone").value = parent.phone || "";
    byId("parentEmail").value = parent.email || "";
    byId("parentOccupation").value = parent.occupation || "";
    byId("parentAddress").value = parent.address || "";
  }
  openModal("parentModal");
}

async function saveParent(event) {
  event.preventDefault();
  const button = byId("saveParentBtn");
  button.disabled = true;
  const payload = {
    institution_id: byId("parentInstitution").value || null,
    full_name: byId("parentFullName").value.trim(),
    phone: cleanOrNull(byId("parentPhone").value),
    email: cleanOrNull(byId("parentEmail").value)?.toLowerCase() || null,
    occupation: cleanOrNull(byId("parentOccupation").value),
    address: cleanOrNull(byId("parentAddress").value)
  };
  try {
    if (!payload.full_name) throw new Error("Enter the parent's full name.");
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) throw new Error("Enter a valid email address.");
    let result;
    if (editingParentId) {
      result = await supabaseClient.from("parents").update(payload).eq("id", editingParentId).select("id").single();
    } else {
      result = await supabaseClient.from("parents").insert(payload).select("id").single();
    }
    if (result.error) throw result.error;
    closeModal("parentModal");
    await loadParents();
    applyFilters();
    showToast(editingParentId ? "Parent details updated." : "Parent record created.");
  } catch (error) {
    console.error("Save parent failed:", error);
    showToast(errorMessage(error, "Could not save parent."), true);
  } finally { button.disabled = false; }
}

function openLinksModal(parentId) {
  const parent = parents.find(item => item.id === parentId);
  if (!parent) return showToast("Parent record was not found.", true);
  selectedParent = parent;
  byId("linksModalTitle").textContent = `Student Links: ${parent.full_name}`;
  byId("linksParentInfo").textContent = `Parent: ${parent.full_name}. Students listed here must belong to the same institution when their institution is set.`;
  byId("linkCourse").value = "";
  byId("linkClass").value = "";
  byId("linkStudent").value = "";
  byId("linkRelationship").value = "parent";
  byId("linkPrimary").checked = false;
  populateCourseOptions();
  renderLinkedStudents();
  openModal("linksModal");
}

function renderLinkedStudents() {
  const parent = selectedParent;
  if (!parent) return;
  const parentLinks = links.filter(item => item.parent_id === parent.id);
  if (!parentLinks.length) {
    byId("linkedStudentsList").innerHTML = `<div class="empty">No students linked yet.</div>`;
    populateStudentOptions();
    return;
  }
  byId("linkedStudentsList").innerHTML = parentLinks.map(link => {
    const student = students.find(item => item.id === link.student_id);
    return `<div class="linkrow"><div><b>${escapeHtml(student?.full_name || "Student record unavailable")}</b><small>${escapeHtml(student?.student_id || shortId(link.student_id))} · ${escapeHtml(link.relationship || "parent")}${link.is_primary ? " · Primary" : ""}</small></div><button class="btn btn-danger btn-sm" data-link-action="unlink" data-link-id="${escapeHtml(link.id)}" type="button"><i class="fa-solid fa-link-slash"></i> Unlink</button></div>`;
  }).join("");
  populateStudentOptions();
}

async function linkStudent() {
  if (!selectedParent) return;
  const studentId = byId("linkStudent").value;
  if (!studentId) return showToast("Select a student first.", true);
  const student = students.find(item => item.id === studentId);
  if (!student) return showToast("Student record was not found.", true);
  if (selectedParent.institution_id && student.institution_id && selectedParent.institution_id !== student.institution_id) {
    return showToast("This student belongs to a different institution.", true);
  }
  const button = byId("linkStudentBtn");
  button.disabled = true;
  try {
    const alreadyLinked = links.some(item => item.parent_id === selectedParent.id && item.student_id === studentId);
    if (alreadyLinked) throw new Error("This student is already linked to this parent.");
    const payload = {
      parent_id: selectedParent.id,
      student_id: studentId,
      relationship: byId("linkRelationship").value || "parent",
      is_primary: byId("linkPrimary").checked
    };
    if (payload.is_primary) {
      const { error: primaryError } = await supabaseClient.from("parent_students").update({ is_primary: false }).eq("parent_id", selectedParent.id);
      if (primaryError) throw primaryError;
    }
    const { error } = await supabaseClient.from("parent_students").insert(payload);
    if (error) throw error;
    await loadLinks();
    renderLinkedStudents();
    renderParents();
    updateStats();
    showToast("Student linked to parent successfully.");
  } catch (error) {
    console.error("Link student failed:", error);
    showToast(errorMessage(error, "Could not link student."), true);
  } finally { button.disabled = false; }
}

async function handleLinkedStudentAction(event) {
  const button = event.target.closest("button[data-link-action]");
  if (!button || button.dataset.linkAction !== "unlink") return;
  const link = links.find(item => item.id === button.dataset.linkId);
  if (!link) return showToast("Student link was not found.", true);
  if (!confirm("Unlink this student from the parent? The student record will not be deleted.")) return;
  button.disabled = true;
  try {
    const { error } = await supabaseClient.from("parent_students").delete().eq("id", link.id);
    if (error) throw error;
    await loadLinks();
    renderLinkedStudents();
    renderParents();
    updateStats();
    showToast("Student unlinked.");
  } catch (error) {
    showToast(errorMessage(error, "Could not unlink student."), true);
  } finally { button.disabled = false; }
}

function openParentAccount(parentId) {
  const parent = parents.find(item => item.id === parentId);
  if (!parent) { showToast("Parent record was not found.", true); return; }
  if (!parent.email) {
    showToast("This parent has no email. Edit the parent record and add an email first.", true);
    return;
  }
  accountParentId = parent.id;
  parentAccountAction = parent.profile_id ? "reset" : "create";
  byId("parentAccountForm").reset();
  byId("accountParentEmail").value = parent.email;
  byId("accountParentEmail").readOnly = parentAccountAction === "reset";
  byId("parentAccountTitle").textContent = parentAccountAction === "reset" ? "Reset Parent Password" : "Create Parent Account";
  byId("parentAccountInfo").textContent = parentAccountAction === "reset"
    ? `An account is already linked to ${parent.full_name}. Enter a new password to reset it.`
    : `Create a secure parent portal login for ${parent.full_name}. The account will be linked to this parent record.`;
  byId("saveParentAccountBtn").innerHTML = parentAccountAction === "reset"
    ? '<i class="fa-solid fa-key"></i> Reset Password'
    : '<i class="fa-solid fa-user-shield"></i> Create Account';
  openModal("parentAccountModal");
}

async function submitParentAccount(event) {
  event.preventDefault();
  const parent = parents.find(item => item.id === accountParentId);
  if (!parent) { showToast("Parent record was not found.", true); return; }
  const email = byId("accountParentEmail").value.trim().toLowerCase();
  const password = byId("accountParentPassword").value;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Enter a valid email address.", true); return;
  }
  if (password.length < 8) { showToast("Password must contain at least 8 characters.", true); return; }
  const button = byId("saveParentAccountBtn");
  button.disabled = true;
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Please wait...';
  try {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.access_token) throw new Error("Your login session has expired. Sign in again and retry.");
    const response = await fetch(PARENT_ACCOUNT_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        action: parentAccountAction,
        parent_db_id: parent.id,
        institution_id: parent.institution_id,
        email,
        password,
        full_name: parent.full_name,
        phone: parent.phone
      })
    });
    const responseText = await response.text();
    let result = {};
    try { result = responseText ? JSON.parse(responseText) : {}; }
    catch { result = { error: responseText || "The server returned an unreadable response." }; }

    if (!response.ok || result.success !== true) {
      const parts = [result.error || `Parent account request failed (HTTP ${response.status}).`];
      if (result.code) parts.push(`Code: ${result.code}`);
      if (result.details) parts.push(`Details: ${result.details}`);
      if (result.hint) parts.push(`Hint: ${result.hint}`);
      const err = new Error(parts.join(" | "));
      err.status = response.status;
      err.payload = result;
      throw err;
    }
    closeModal("parentAccountModal");
    byId("parentAccountForm").reset();
    await loadParents();
    applyFilters();
    showToast(parentAccountAction === "reset" ? "Parent password reset successfully." : "Parent account created and linked successfully.");
  } catch (error) {
    console.error("Parent account request failed:", {
      message: error?.message,
      status: error?.status,
      payload: error?.payload,
      error
    });
    showToast(errorMessage(error, "Could not complete the parent account action."), true);
  } finally {
    button.disabled = false;
    button.innerHTML = originalText;
  }
}

async function deleteParent(parentId) {
  const parent = parents.find(item => item.id === parentId);
  if (!parent) return showToast("Parent record was not found.", true);
  if (parent.profile_id) {
    showToast("This parent has a portal account linked. Do not delete the record here; unlink/disable the account safely first.", true);
    return;
  }
  if (!confirm(`Delete parent record for ${parent.full_name}? This will also remove its student links. This cannot be undone.`)) return;
  try {
    const { error: linkError } = await supabaseClient.from("parent_students").delete().eq("parent_id", parentId);
    if (linkError) throw linkError;
    const { error } = await supabaseClient.from("parents").delete().eq("id", parentId);
    if (error) throw error;
    await loadParents();
    await loadLinks();
    applyFilters();
    showToast("Parent record deleted.");
  } catch (error) {
    console.error("Delete parent failed:", error);
    showToast(errorMessage(error, "Could not delete parent."), true);
  }
}

function openModal(id) { byId(id).classList.add("show"); document.body.style.overflow = "hidden"; }
function closeModal(id) {
  const modal = byId(id);
  if (modal) modal.classList.remove("show");
  if (!document.querySelector(".modal.show")) document.body.style.overflow = "";
  if (id === "linksModal") { selectedParent = null; }
  if (id === "parentAccountModal") { accountParentId = null; byId("accountParentEmail").readOnly = false; }
}
function setTableMessage(message) { byId("parentsTableBody").innerHTML = `<tr><td colspan="7" class="empty"><i class="fa-solid fa-circle-info"></i><br>${escapeHtml(message)}</td></tr>`; }
function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })
  ]).finally(() => clearTimeout(timer));
}
function byId(id) { const element = document.getElementById(id); if (!element) throw new Error(`Missing required HTML element: #${id}`); return element; }
function cleanOrNull(value) { const result = String(value ?? "").trim(); return result || null; }
function initialsFor(name) { return String(name || "P").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join("") || "P"; }
function shortId(value) { return String(value || "").slice(0, 8); }
function formatDate(value) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
function isActiveRecord(item) { return item?.is_active !== false && item?.status !== "inactive" && item?.status !== "disabled"; }
function isActiveEnrollment(item) { const status = item?.status || "active"; return ["active", "enrolled", "completed"].includes(String(status).toLowerCase()); }
function escapeHtml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function errorMessage(error, fallback) { return error?.message || error?.error_description || (typeof error === "string" ? error : fallback); }
function showToast(message, isError = false) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.className = `toast show ${isError ? "error" : "success"}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = "toast"; }, 5000);
}
