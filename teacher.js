/* =========================================================
   GAAWOW EMS — TEACHER MANAGEMENT V7.0
   Official rebuild: preserves Supabase, Super Admin security, teacher CRUD, institutions, filters and photo storage.
   Fixes JavaScript load guard and keeps teacher loading independent from institutions.
   ========================================================= */

const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiic.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const CREATE_TEACHER_FUNCTION_URL =
  `${SUPABASE_URL}/functions/v1/create-teacher-account`;
const DELETE_TEACHER_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/delete-teacher`;
const TEACHER_PHOTO_BUCKET = "teacher-photos";
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const REQUEST_TIMEOUT = 15000;

let supabaseClient = null;

if (!window.supabase) {
  window.addEventListener("DOMContentLoaded", () => {
    setTableMessage(
      "Supabase library was not loaded. Check the Supabase CDN script in teacher.html.",
      "empty"
    );
  }, { once: true });
} else {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let teachers = [];
let institutions = [];
let currentUser = null;
let currentProfile = null;
let selectedPhotoFile = null;

/* Tell the HTML bootstrap that teacher.js itself loaded successfully. */
window.__teacherJsLoaded = true;

window.addEventListener("error", event => {
  console.error("Teacher page JavaScript error:", event.error || event.message);
  const message = event.error?.message || event.message || "Unknown JavaScript error.";
  try { setTableMessage(`Teacher page error: ${message}`, "empty"); } catch (_) {}
});

window.addEventListener("unhandledrejection", event => {
  console.error("Teacher page promise error:", event.reason);
  const message = event.reason?.message || String(event.reason || "Unknown promise error.");
  try { setTableMessage(`Teacher page error: ${message}`, "empty"); } catch (_) {}
});

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.href);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.href;
  } catch (_) {
    return "";
  }
}

function photoPlaceholder(name = "Teacher") {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("") || "T";

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#0B1E63"/><text x="60" y="70" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#D4AF37">${initials}</text></svg>`
  )}`;
}

function setTableMessage(message, type = "empty") {
  const tbody = $("teachersTableBody");
  if (!tbody) return;

  const safe = escapeHtml(message);
  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="${type}">${safe}</td>
    </tr>`;
}

function setPhotoStatus(text = "") {
  const el = $("photoStatus");
  if (el) el.textContent = text;
}

function renderPhotoPreview(url, name = "Teacher") {
  const img = $("photoPreview");
  if (!img) return;

  const cleanUrl = normalizeUrl(url);
  img.dataset.currentUrl = cleanUrl;
  img.src = cleanUrl || photoPlaceholder(name);
  img.onerror = () => {
    img.onerror = null;
    img.src = photoPlaceholder(name);
  };
}

function clearPhotoSelection() {
  selectedPhotoFile = null;
  const input = $("photoFile");
  if (input) input.value = "";
  setPhotoStatus("");
}

function resetTeacherForm() {
  $("teacherForm")?.reset();
  $("editId").value = "";
  $("email").disabled = false;
  $("password").required = true;
  $("password").value = "";
  $("isActive").value = "true";
  clearPhotoSelection();
  renderPhotoPreview("", "Teacher");
}

function openAddTeacher() {
  resetTeacherForm();
  $("modalTitle").textContent = "Add Teacher";
  $("saveBtn").textContent = "Create Teacher";
  $("teacherModal").classList.add("show");
}

function closeTeacherModal() {
  $("teacherModal")?.classList.remove("show");
  clearPhotoSelection();
}

function closeViewModal() {
  $("viewModal")?.classList.remove("show");
}

function withTimeout(promise, label = "Request", ms = REQUEST_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000} seconds.`)), ms);
    })
  ]);
}

async function getSessionOrRedirect() {
  if (!supabaseClient) {
    setTableMessage("Supabase client is unavailable. Check teacher.html.", "empty");
    return null;
  }

  const { data, error } = await withTimeout(
    supabaseClient.auth.getSession(),
    "Checking login session"
  );

  if (error || !data?.session) {
    window.location.href = "./index.html";
    return null;
  }

  currentUser = data.session.user;
  return data.session;
}

async function checkAccess() {
  const session = await getSessionOrRedirect();
  if (!session) return false;

  let profileResult = await withTimeout(
    supabaseClient
      .from("profiles")
      .select("id,full_name,email,phone,avatar_url,role,institution_id,is_active")
      .eq("id", currentUser.id)
      .maybeSingle(),
    "Loading your profile"
  );

  /* Fallback if the deployed database/schema cache does not yet expose email. */
  if (profileResult.error && /email|column/i.test(profileResult.error.message || "")) {
    profileResult = await withTimeout(
      supabaseClient
        .from("profiles")
        .select("id,full_name,phone,avatar_url,role,institution_id,is_active")
        .eq("id", currentUser.id)
        .maybeSingle(),
      "Loading your profile"
    );
  }

  const { data: profile, error } = profileResult;

  if (error || !profile) {
    console.error("Profile error:", error);
    alert("Profile could not be loaded.\n\n" + (error?.message || "Profile not found."));
    window.location.href = "./dashboard.html";
    return false;
  }

  currentProfile = profile;

  if (profile.role !== "super_admin" || profile.is_active !== true) {
    alert("Access denied. Super Admin only.");
    window.location.href = "./dashboard.html";
    return false;
  }

  return true;
}

/* ---------------------------------------------------------
   INSTITUTIONS
   IMPORTANT: Failure here must NOT stop Teachers from loading.
   --------------------------------------------------------- */
async function loadInstitutions() {
  const filter = $("institutionFilter");
  const select = $("institutionId");

  if (filter) filter.innerHTML = `<option value="">All Institutions</option>`;
  if (select) select.innerHTML = `<option value="">Select Institution</option>`;

  const { data, error } = await withTimeout(
    supabaseClient
      .from("institutions")
      .select("id,name")
      .order("name", { ascending: true }),
    "Loading institutions"
  );

  if (error) throw error;

  institutions = data || [];

  institutions.forEach(institution => {
    if (filter) {
      const option = document.createElement("option");
      option.value = institution.id;
      option.textContent = institution.name || "Unnamed Institution";
      filter.appendChild(option);
    }

    if (select) {
      const option = document.createElement("option");
      option.value = institution.id;
      option.textContent = institution.name || "Unnamed Institution";
      select.appendChild(option);
    }
  });
}

/* ---------------------------------------------------------
   TEACHERS
   This now runs independently from loadInstitutions().
   --------------------------------------------------------- */
async function loadTeachers() {
  setTableMessage("Loading teachers...", "loading");

  let result = await withTimeout(
    supabaseClient
      .from("profiles")
      .select("id,full_name,email,phone,avatar_url,role,institution_id,is_active,created_at,updated_at")
      .eq("role", "teacher")
      .order("full_name", { ascending: true }),
    "Loading teachers"
  );

  /* Fallback for old schema cache without profiles.email. */
  if (result.error && /email|column/i.test(result.error.message || "")) {
    console.warn("profiles.email query failed. Retrying without email.", result.error.message);

    result = await withTimeout(
      supabaseClient
        .from("profiles")
        .select("id,full_name,phone,avatar_url,role,institution_id,is_active,created_at,updated_at")
        .eq("role", "teacher")
        .order("full_name", { ascending: true }),
      "Loading teachers"
    );
  }

  const { data, error } = result;

  if (error) {
    console.error("Teachers error:", error);
    setTableMessage(
      `Failed to load teachers. ${error.message || "Unknown Supabase error."}`,
      "empty"
    );
    return false;
  }

  teachers = (data || []).map(teacher => {
    const institution = institutions.find(item => item.id === teacher.institution_id);
    return {
      ...teacher,
      institution_name: institution?.name || "Unknown Institution"
    };
  });

  renderTeachers();
  return true;
}

function renderTeachers() {
  const tbody = $("teachersTableBody");
  if (!tbody) return;

  const search = String($("searchInput")?.value || "").toLowerCase().trim();
  const institutionId = $("institutionFilter")?.value || "";
  const status = $("statusFilter")?.value || "";

  const filtered = teachers.filter(teacher => {
    const haystack = [teacher.full_name, teacher.email, teacher.phone, teacher.id]
      .map(value => String(value || "").toLowerCase())
      .join(" ");

    const matchesSearch = !search || haystack.includes(search);
    const matchesInstitution = !institutionId || teacher.institution_id === institutionId;
    const matchesStatus =
      !status ||
      (status === "active" && teacher.is_active === true) ||
      (status === "inactive" && teacher.is_active === false);

    return matchesSearch && matchesInstitution && matchesStatus;
  });

  if (!filtered.length) {
    setTableMessage("No teachers found.", "empty");
    return;
  }

  tbody.innerHTML = filtered.map((teacher, index) => {
    const avatar = normalizeUrl(teacher.avatar_url) || photoPlaceholder(teacher.full_name);
    const statusClass = teacher.is_active ? "active" : "inactive";
    const statusText = teacher.is_active ? "Active" : "Inactive";
    const fallback = escapeHtml(photoPlaceholder(teacher.full_name));

    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="teacher-cell">
            <img class="teacher-thumb" src="${escapeHtml(avatar)}" alt="Teacher photo" onerror="this.onerror=null;this.src='${fallback}'">
            <div>
              <strong>${escapeHtml(teacher.full_name || "Unnamed Teacher")}</strong>
              <small>${escapeHtml(teacher.email || "No email")}</small>
            </div>
          </div>
        </td>
        <td>${escapeHtml(teacher.phone || "—")}</td>
        <td>${escapeHtml(teacher.institution_name || "—")}</td>
        <td>Teacher</td>
        <td><span class="status ${statusClass}">${statusText}</span></td>
        <td>
          <div class="actions">
            <button type="button" class="action-btn view" onclick="viewTeacher('${teacher.id}')">View</button>
            <button type="button" class="action-btn edit" onclick="editTeacher('${teacher.id}')">Edit</button>
            <button type="button" class="action-btn toggle" onclick="toggleTeacher('${teacher.id}')">${teacher.is_active ? "Disable" : "Activate"}</button>
            <button type="button" class="action-btn delete" onclick="deleteTeacher('${teacher.id}')">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

function editTeacher(id) {
  const teacher = teachers.find(item => item.id === id);
  if (!teacher) {
    alert("Teacher not found.");
    return;
  }

  $("editId").value = teacher.id;
  $("fullName").value = teacher.full_name || "";
  $("email").value = teacher.email || "";
  $("email").disabled = true;
  $("password").value = "";
  $("password").required = false;
  $("phone").value = teacher.phone || "";
  $("institutionId").value = teacher.institution_id || "";
  $("isActive").value = teacher.is_active ? "true" : "false";
  clearPhotoSelection();
  renderPhotoPreview(teacher.avatar_url, teacher.full_name);
  setPhotoStatus(teacher.avatar_url ? "Current photo" : "No photo uploaded");

  $("modalTitle").textContent = "Edit Teacher";
  $("saveBtn").textContent = "Update Teacher";
  $("teacherModal").classList.add("show");
}

function handlePhotoSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    event.target.value = "";
    selectedPhotoFile = null;
    setPhotoStatus("Only JPG, PNG, and WEBP images are allowed.");
    alert("Only JPG, PNG, and WEBP images are allowed.");
    return;
  }

  if (file.size > MAX_PHOTO_SIZE) {
    event.target.value = "";
    selectedPhotoFile = null;
    setPhotoStatus("Maximum photo size is 2 MB.");
    alert("Photo is too large. Maximum size is 2 MB.");
    return;
  }

  selectedPhotoFile = file;
  const previewUrl = URL.createObjectURL(file);
  renderPhotoPreview(previewUrl, $("fullName")?.value || "Teacher");
  setPhotoStatus(`${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`);
}

function fileExtension(file) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };
  return map[file.type] || "jpg";
}

async function uploadTeacherPhoto(teacherId, file) {
  if (!file) return null;

  const ext = fileExtension(file);
  const randomPart =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const path = `${teacherId}/${Date.now()}-${randomPart}.${ext}`;

  const { error: uploadError } = await withTimeout(
    supabaseClient.storage
      .from(TEACHER_PHOTO_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      }),
    "Uploading teacher photo"
  );

  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage
    .from(TEACHER_PHOTO_BUCKET)
    .getPublicUrl(path);

  const publicUrl = data?.publicUrl || "";
  if (!publicUrl) {
    throw new Error("Photo uploaded, but public URL could not be generated.");
  }

  return { path, publicUrl };
}

function storagePathFromPublicUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${TEACHER_PHOTO_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch (_) {
    return null;
  }
}

async function deleteOldTeacherPhoto(url) {
  const path = storagePathFromPublicUrl(url);
  if (!path) return;

  const { error } = await withTimeout(
    supabaseClient.storage
      .from(TEACHER_PHOTO_BUCKET)
      .remove([path]),
    "Deleting old teacher photo"
  );

  if (error) console.warn("Old teacher photo could not be removed:", error.message);
}

async function updateTeacherProfile(id, payload) {
  const { error } = await withTimeout(
    supabaseClient
      .from("profiles")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("role", "teacher"),
    "Updating teacher"
  );

  if (error) throw error;
}

async function createTeacher(payload, accessToken) {
async function createTeacher(payload, accessToken) {
  const response = await withTimeout(
    fetch(CREATE_TEACHER_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "apikey": SUPABASE_KEY
      },
      body: JSON.stringify(payload)
    }),
    "Creating teacher account"
  );

  let result = null;

  try {
    result = await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(
      result?.error ||
      result?.message ||
      `Create Teacher failed. HTTP ${response.status}`
    );
  }

  return result;
}
function extractCreatedTeacherId(result) {
  return (
    result?.teacher?.id ||
    result?.profile?.id ||
    result?.id ||
    result?.teacher_id ||
    result?.profile_id ||
    null
  );
}

async function findTeacherIdByEmail(email) {
  let result = await withTimeout(
    supabaseClient
      .from("profiles")
      .select("id,email,role")
      .eq("email", email)
      .eq("role", "teacher")
      .maybeSingle(),
    "Finding newly created teacher"
  );

  if (result.error && /email|column/i.test(result.error.message || "")) {
    throw new Error(
      "profiles.email is not available in the current database schema. Refresh Supabase schema cache and try again."
    );
  }

  if (result.error) throw result.error;
  return result.data?.id || null;
}

async function saveTeacher(event) {
  event.preventDefault();

  const saveBtn = $("saveBtn");
  const editId = $("editId").value.trim();
  const fullName = $("fullName").value.trim();
  const email = $("email").value.trim();
  const phone = $("phone").value.trim();
  const password = $("password").value;
  const institutionId = $("institutionId").value;
  const isActive = $("isActive").value === "true";

  if (!fullName) { alert("Please enter teacher name."); return; }
  if (!editId && !email) { alert("Please enter teacher email."); return; }
  if (!editId && !password) { alert("Please enter teacher password."); return; }
  if (!institutionId) { alert("Please select an institution."); return; }

  saveBtn.disabled = true;
  saveBtn.textContent = editId ? "Updating..." : "Creating...";

  try {
    if (editId) {
      const teacher = teachers.find(item => item.id === editId);
      if (!teacher) throw new Error("Teacher not found.");

      let newPhoto = null;
      if (selectedPhotoFile) {
        newPhoto = await uploadTeacherPhoto(editId, selectedPhotoFile);
      }

      await updateTeacherProfile(editId, {
        full_name: fullName,
        phone: phone || null,
        institution_id: institutionId,
        is_active: isActive,
        ...(newPhoto ? { avatar_url: newPhoto.publicUrl } : {})
      });

      if (newPhoto && teacher.avatar_url) {
        await deleteOldTeacherPhoto(teacher.avatar_url);
      }

      alert("Teacher updated successfully!");
      closeTeacherModal();
      await loadTeachers();
      return;
    }

    const session = await getSessionOrRedirect();
    if (!session) throw new Error("Your Super Admin session has expired. Please login again.");

    const result = await createTeacher({
      email,
      password,
      full_name: fullName,
      phone: phone || null,
      avatar_url: null,
      institution_id: institutionId,
      is_active: isActive
    }, session.access_token);

    let teacherId = extractCreatedTeacherId(result);

    if (!teacherId) {
      teacherId = await findTeacherIdByEmail(email);
    }

    if (!teacherId) {
      throw new Error(
        "Teacher account was created, but its profile ID could not be found. Refresh the Teachers page and check the new account."
      );
    }

    if (selectedPhotoFile) {
      const uploaded = await uploadTeacherPhoto(teacherId, selectedPhotoFile);
      await updateTeacherProfile(teacherId, { avatar_url: uploaded.publicUrl });
    }

    alert("Teacher account created successfully!");
    closeTeacherModal();
    await loadTeachers();
  } catch (error) {
    console.error("Teacher save error:", error);
    alert(`Failed to create/update teacher:\n\n${error.message || error}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = editId ? "Update Teacher" : "Create Teacher";
  }
}

function viewTeacher(id) {
  const teacher = teachers.find(item => item.id === id);
  if (!teacher) return;

  const avatar = normalizeUrl(teacher.avatar_url) || photoPlaceholder(teacher.full_name);

  $("viewContent").innerHTML = `
    <div class="profile-box">
      <img class="avatar-large" src="${escapeHtml(avatar)}" alt="Teacher photo" onerror="this.onerror=null;this.src='${escapeHtml(photoPlaceholder(teacher.full_name))}'">
      <div class="profile-info">
        <div class="profile-name">${escapeHtml(teacher.full_name || "Unnamed Teacher")}</div>
        <div class="detail"><strong>Email:</strong> ${escapeHtml(teacher.email || "Not provided")}</div>
        <div class="detail"><strong>Phone:</strong> ${escapeHtml(teacher.phone || "Not provided")}</div>
        <div class="detail"><strong>Institution:</strong> ${escapeHtml(teacher.institution_name || "Unknown")}</div>
        <div class="detail"><strong>Role:</strong> Teacher</div>
        <div class="detail"><strong>User ID:</strong> ${escapeHtml(teacher.id)}</div>
        <div class="detail"><strong>Status:</strong> ${teacher.is_active ? "Active" : "Inactive"}</div>
      </div>
    </div>`;

  $("viewModal").classList.add("show");
}

async function toggleTeacher(id) {
  const teacher = teachers.find(item => item.id === id);
  if (!teacher) return;

  const newStatus = !teacher.is_active;
  const action = newStatus ? "activate" : "disable";

  if (!confirm(`Are you sure you want to ${action} this teacher?`)) return;

  try {
    await updateTeacherProfile(id, { is_active: newStatus });
    await loadTeachers();
  } catch (error) {
    alert(`Failed to ${action} teacher:\n\n${error.message}`);
  }
}

async function deleteTeacher(id) {
  const teacher = teachers.find(item => item.id === id);
  if (!teacher) return;

  const confirmed = confirm(
    `Delete this teacher account?\n\n${teacher.full_name || ""}\n${teacher.email || ""}\n\nThis will remove the teacher account/profile.`
  );
  if (!confirmed) return;

  try {
    const session = await getSessionOrRedirect();
    if (!session) throw new Error("Your Super Admin session has expired. Please login again.");

    const response = await withTimeout(
      fetch(DELETE_TEACHER_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": SUPABASE_KEY
        },
        body: JSON.stringify({ teacher_id: id, id })
      }),
      "Deleting teacher account"
    );

    let result = null;
    try { result = await response.json(); } catch (_) {}

    if (!response.ok) {
      throw new Error(
        result?.error ||
        result?.message ||
        `Delete Teacher failed. HTTP ${response.status}`
      );
    }

    if (teacher.avatar_url) {
      await deleteOldTeacherPhoto(teacher.avatar_url);
    }

    alert("Teacher account deleted successfully.");
    await loadTeachers();
  } catch (error) {
    console.error("Delete teacher error:", error);
    alert(`Failed to delete teacher:\n\n${error.message || error}`);
  }
}

function setupEvents() {
  $("searchInput")?.addEventListener("input", renderTeachers);
  $("institutionFilter")?.addEventListener("change", renderTeachers);
  $("statusFilter")?.addEventListener("change", renderTeachers);
  $("teacherForm")?.addEventListener("submit", saveTeacher);
  $("photoFile")?.addEventListener("change", handlePhotoSelect);

  $("fullName")?.addEventListener("input", () => {
    if (!selectedPhotoFile) {
      renderPhotoPreview(
        $("photoPreview")?.dataset?.currentUrl || "",
        $("fullName").value || "Teacher"
      );
    }
  });

  $("teacherModal")?.addEventListener("click", event => {
    if (event.target.id === "teacherModal") closeTeacherModal();
  });

  $("viewModal")?.addEventListener("click", event => {
    if (event.target.id === "viewModal") closeViewModal();
  });
}

window.openAddTeacher = openAddTeacher;
window.closeTeacherModal = closeTeacherModal;
window.closeViewModal = closeViewModal;
window.editTeacher = editTeacher;
window.viewTeacher = viewTeacher;
window.toggleTeacher = toggleTeacher;
window.deleteTeacher = deleteTeacher;
window.handlePhotoSelect = handlePhotoSelect;
window.loadTeachers = loadTeachers;

window.addEventListener("DOMContentLoaded", async () => {
  setupEvents();
  setTableMessage("Checking Super Admin access...", "loading");

  try {
    if (!supabaseClient) {
      setTableMessage("Supabase client could not start. Check the Supabase script in teacher.html.", "empty");
      return;
    }

    const allowed = await checkAccess();
    if (!allowed) return;

    /*
      SIX-SAFETY-RULE UPDATE: 
      1) Do not delete existing working features.
      2) Do not block Teachers on Institutions.
      3) Never leave an endless Loading state.
      4) Preserve Super Admin security.
      5) Preserve Storage/photo functionality.
      6) Show the real error instead of hiding it.
    */
    const institutionPromise = loadInstitutions().catch(error => {
      console.warn("Institutions could not be loaded:", error);
      institutions = [];
      const filter = $("institutionFilter");
      const select = $("institutionId");
      if (filter) filter.innerHTML = `<option value="">All Institutions</option>`;
      if (select) select.innerHTML = `<option value="">Select Institution</option>`;
      return false;
    });

    /* Teachers load independently and is the critical page operation. */
    const teachersLoaded = await loadTeachers();

    /* Institution names may have finished after teachers. Re-render once more. */
    await institutionPromise;
    if (teachersLoaded) {
      teachers = teachers.map(teacher => ({
        ...teacher,
        institution_name: institutions.find(item => item.id === teacher.institution_id)?.name || teacher.institution_name || "Unknown Institution"
      }));
      renderTeachers();
    }
  } catch (error) {
    console.error("Teacher page initialization error:", error);
    setTableMessage(
      `Teacher page failed to load: ${error.message || error}`,
      "empty"
    );
  }
});
