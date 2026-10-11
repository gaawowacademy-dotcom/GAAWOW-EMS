/* ============================================================
   GAAWOW EMS — TEACHER MANAGEMENT V8.1
   Supabase + GitHub Pages

   FEATURES:
   1. Super Admin authorization
   2. Secure teacher account creation through Edge Function
   3. Teacher listing and search
   4. Institution filtering
   5. Active/inactive status filtering
   6. Teacher profile viewing
   7. Teacher profile editing
   8. Teacher activation/deactivation
   9. Teacher deletion through Edge Function
   10. Teacher photo upload and storage
   11. Request timeout and error reporting
   12. JavaScript initialization guard

   IMPORTANT:
   - Never place the Supabase service-role key here.
   - Keep create-teacher-account secured server-side.
   ============================================================ */

"use strict";

/* ============================================================
   CONFIGURATION
   ============================================================ */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const CREATE_TEACHER_FUNCTION_URL =
  `${SUPABASE_URL}/functions/v1/create-teacher-account`;

const DELETE_TEACHER_FUNCTION_URL =
  `${SUPABASE_URL}/functions/v1/delete-teacher`;

const TEACHER_PHOTO_BUCKET = "teacher-photos";

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const REQUEST_TIMEOUT = 15000;

/* ============================================================
   APPLICATION STATE
   ============================================================ */

let supabaseClient = null;

let teachers = [];
let institutions = [];

let currentUser = null;
let currentProfile = null;

let selectedPhotoFile = null;

/* ============================================================
   JAVASCRIPT LOAD GUARD
   ============================================================ */

window.__teacherJsLoaded = true;

/* ============================================================
   SUPABASE INITIALIZATION
   ============================================================ */

if (!window.supabase) {
  console.error(
    "Supabase library unavailable. Check the CDN script in teacher.html."
  );
} else {
  try {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );
  } catch (error) {
    console.error(
      "Could not initialize Supabase:",
      error
    );
  }
}

/* ============================================================
   GLOBAL ERROR HANDLING
   ============================================================ */

window.addEventListener("error", event => {
  console.error(
    "[GAAWOW TEACHER] JavaScript error:",
    event.error || event.message
  );
});

window.addEventListener("unhandledrejection", event => {
  console.error(
    "[GAAWOW TEACHER] Promise error:",
    event.reason
  );
});

/* ============================================================
   DOM HELPERS
   ============================================================ */

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
    const parsed = new URL(
      url,
      window.location.href
    );

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return "";
    }

    return parsed.href;
  } catch (_) {
    return "";
  }
}

/* ============================================================
   MESSAGE HELPERS
   ============================================================ */

function setTableMessage(
  message,
  type = "empty"
) {
  const tbody = $("teachersTableBody");

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="${escapeHtml(type)}">
        ${escapeHtml(message)}
      </td>
    </tr>
  `;
}

function showMessage(message) {
  const box = $("messageBox");

  if (!box) {
    alert(message);
    return;
  }

  box.textContent = message;
  box.hidden = false;

  window.setTimeout(() => {
    box.hidden = true;
  }, 6000);
}

/* ============================================================
   PHOTO HELPERS
   ============================================================ */

function photoPlaceholder(name = "Teacher") {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || "T";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="120"
         height="120"
         viewBox="0 0 120 120">
      <rect width="120"
            height="120"
            rx="60"
            fill="#0B1E63"/>
      <text x="60"
            y="70"
            text-anchor="middle"
            font-family="Arial,sans-serif"
            font-size="42"
            font-weight="700"
            fill="#D4AF37">${initials}</text>
    </svg>
  `;

  return (
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(svg)
  );
}

function setPhotoStatus(text = "") {
  const element = $("photoStatus");

  if (element) {
    element.textContent = text;
  }
}

function renderPhotoPreview(
  url,
  name = "Teacher"
) {
  const img = $("photoPreview");

  if (!img) return;

  const cleanUrl = normalizeUrl(url);

  img.dataset.currentUrl = cleanUrl;

  img.src =
    cleanUrl || photoPlaceholder(name);

  img.onerror = function () {
    img.onerror = null;
    img.src = photoPlaceholder(name);
  };
}

function clearPhotoSelection() {
  selectedPhotoFile = null;

  const input = $("photoFile");

  if (input) {
    input.value = "";
  }

  setPhotoStatus("");
}

/* ============================================================
   FORM RESET AND MODALS
   ============================================================ */

function resetTeacherForm() {
  const form = $("teacherForm");

  if (form) {
    form.reset();
  }

  if ($("editId")) {
    $("editId").value = "";
  }

  if ($("email")) {
    $("email").disabled = false;
  }

  if ($("teacherId")) {
    $("teacherId").disabled = false;
    $("teacherId").required = true;
    $("teacherId").value = "";
  }

  if ($("password")) {
    $("password").required = true;
    $("password").value = "";
  }

  if ($("isActive")) {
    $("isActive").value = "true";
  }

  clearPhotoSelection();

  renderPhotoPreview("", "Teacher");
}

function openAddTeacher() {
  resetTeacherForm();

  if ($("modalTitle")) {
    $("modalTitle").textContent =
      "Create Teacher Account";
  }

  if ($("saveBtn")) {
    $("saveBtn").textContent =
      "Create Teacher Account";
  }

  $("teacherModal")?.classList.add("show");

  $("teacherModal")?.setAttribute(
    "aria-hidden",
    "false"
  );
}

function closeTeacherModal() {
  $("teacherModal")?.classList.remove("show");

  $("teacherModal")?.setAttribute(
    "aria-hidden",
    "true"
  );

  clearPhotoSelection();
}

function closeViewModal() {
  $("viewModal")?.classList.remove("show");

  $("viewModal")?.setAttribute(
    "aria-hidden",
    "true"
  );
}

/* ============================================================
   REQUEST TIMEOUT
   ============================================================ */

function withTimeout(
  promise,
  label = "Request",
  ms = REQUEST_TIMEOUT
) {
  let timer;

  const timeoutPromise = new Promise(
    (_, reject) => {
      timer = window.setTimeout(() => {
        reject(
          new Error(
            `${label} timed out after ${ms / 1000} seconds.`
          )
        );
      }, ms);
    }
  );

  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => {
    window.clearTimeout(timer);
  });
}

/* ============================================================
   AUTHENTICATION
   ============================================================ */

async function getSessionOrRedirect() {
  if (!supabaseClient) {
    setTableMessage(
      "Supabase client is unavailable. Check teacher.html.",
      "empty"
    );

    return null;
  }

  let result;

  try {
    result = await withTimeout(
      supabaseClient.auth.getSession(),
      "Checking login session"
    );
  } catch (error) {
    console.error(
      "Session verification failed:",
      error
    );

    setTableMessage(
      "Could not verify your login session. Reload the page and sign in again.",
      "empty"
    );

    return null;
  }

  const session = result?.data?.session;

  if (result?.error || !session) {
    window.location.href = "./index.html";
    return null;
  }

  currentUser = session.user;

  return session;
}

/* ============================================================
   SUPER ADMIN ACCESS CONTROL
   ============================================================ */

async function checkAccess() {
  const session = await getSessionOrRedirect();

  if (!session || !currentUser) {
    return false;
  }

  let profileResult;

  try {
    profileResult = await withTimeout(
      supabaseClient
        .from("profiles")
        .select(
          "id,full_name,email,phone,avatar_url,role,institution_id,is_active"
        )
        .eq("id", currentUser.id)
        .maybeSingle(),
      "Loading your profile"
    );
  } catch (error) {
    console.error(
      "Profile request failed:",
      error
    );

    setTableMessage(
      `Profile request failed: ${error.message}`,
      "empty"
    );

    return false;
  }

  /*
   * Fallback for a database schema without profiles.email.
   */
  if (
    profileResult.error &&
    /email|column/i.test(
      profileResult.error.message || ""
    )
  ) {
    profileResult = await withTimeout(
      supabaseClient
        .from("profiles")
        .select(
          "id,full_name,phone,avatar_url,role,institution_id,is_active"
        )
        .eq("id", currentUser.id)
        .maybeSingle(),
      "Loading your profile"
    );
  }

  const profile = profileResult?.data;
  const error = profileResult?.error;

  if (error || !profile) {
    console.error(
      "Profile could not be loaded:",
      error
    );

    alert(
      "Your profile could not be loaded.\n\n" +
      (error?.message || "Profile not found.")
    );

    window.location.href = "./dashboard.html";

    return false;
  }

  currentProfile = profile;

  if (
    profile.role !== "super_admin" ||
    profile.is_active !== true
  ) {
    alert(
      "Access denied. Super Admin access is required."
    );

    window.location.href = "./dashboard.html";

    return false;
  }

  return true;
}

/* ============================================================
   INSTITUTIONS
   ============================================================ */

async function loadInstitutions() {
  const filter = $("institutionFilter");
  const select = $("institutionId");

  if (filter) {
    filter.innerHTML =
      '<option value="">All Institutions</option>';
  }

  if (select) {
    select.innerHTML =
      '<option value="">Select Institution</option>';
  }

  const { data, error } = await withTimeout(
    supabaseClient
      .from("institutions")
      .select("id,name")
      .order("name", {
        ascending: true
      }),
    "Loading institutions"
  );

  if (error) {
    throw error;
  }

  institutions = data || [];

  institutions.forEach(institution => {
    if (filter) {
      const option =
        document.createElement("option");

      option.value = institution.id;

      option.textContent =
        institution.name || "Unnamed Institution";

      filter.appendChild(option);
    }

    if (select) {
      const option =
        document.createElement("option");

      option.value = institution.id;

      option.textContent =
        institution.name || "Unnamed Institution";

      select.appendChild(option);
    }
  });

  return institutions;
}

/* ============================================================
   LOAD TEACHERS
   ============================================================ */

async function loadTeachers() {
  setTableMessage(
    "Loading teachers...",
    "loading"
  );

  let result;

  try {
    result = await withTimeout(
      supabaseClient
        .from("profiles")
        .select(
          "id,full_name,email,phone,avatar_url,role,institution_id,is_active,created_at,updated_at"
        )
        .eq("role", "teacher")
        .order("full_name", {
          ascending: true
        }),
      "Loading teachers"
    );
  } catch (error) {
    console.error(
      "Teacher loading request failed:",
      error
    );

    setTableMessage(
      `Failed to load teachers: ${error.message}`,
      "empty"
    );

    return false;
  }

  /*
   * Retry without email if that column is unavailable.
   */
  if (
    result.error &&
    /email|column/i.test(
      result.error.message || ""
    )
  ) {
    result = await withTimeout(
      supabaseClient
        .from("profiles")
        .select(
          "id,full_name,phone,avatar_url,role,institution_id,is_active,created_at,updated_at"
        )
        .eq("role", "teacher")
        .order("full_name", {
          ascending: true
        }),
      "Loading teachers"
    );
  }

  const { data, error } = result;

  if (error) {
    console.error(
      "Teachers query failed:",
      error
    );

    setTableMessage(
      `Failed to load teachers: ${error.message}`,
      "empty"
    );

    return false;
  }

  teachers = (data || []).map(teacher => {
    const institution = institutions.find(
      item => item.id === teacher.institution_id
    );

    return {
      ...teacher,
      institution_name:
        institution?.name || "Unknown Institution"
    };
  });

  renderTeachers();

  return true;
}

/* ============================================================
   RENDER TEACHER TABLE
   ============================================================ */

function renderTeachers() {
  const tbody = $("teachersTableBody");

  if (!tbody) return;

  const search = String(
    $("searchInput")?.value || ""
  ).toLowerCase().trim();

  const institutionId =
    $("institutionFilter")?.value || "";

  const status =
    $("statusFilter")?.value || "";

  const filtered = teachers.filter(teacher => {
    const haystack = [
      teacher.full_name,
      teacher.email,
      teacher.phone,
      teacher.id
    ]
      .map(value =>
        String(value || "").toLowerCase()
      )
      .join(" ");

    const matchesSearch =
      !search || haystack.includes(search);

    const matchesInstitution =
      !institutionId ||
      teacher.institution_id === institutionId;

    const matchesStatus =
      !status ||
      (
        status === "active" &&
        teacher.is_active === true
      ) ||
      (
        status === "inactive" &&
        teacher.is_active === false
      );

    return (
      matchesSearch &&
      matchesInstitution &&
      matchesStatus
    );
  });

  if (!filtered.length) {
    setTableMessage(
      "No teachers found.",
      "empty"
    );

    return;
  }

  tbody.innerHTML = filtered.map(
    (teacher, index) => {
      const avatar =
        normalizeUrl(teacher.avatar_url) ||
        photoPlaceholder(teacher.full_name);

      const statusClass =
        teacher.is_active ? "active" : "inactive";

      const statusText =
        teacher.is_active ? "Active" : "Inactive";

      const teacherId =
        escapeHtml(teacher.id);

      const fallback =
        escapeHtml(
          photoPlaceholder(teacher.full_name)
        );

      return `
        <tr>
          <td>${index + 1}</td>

          <td>
            <div class="teacher-cell">
              <img
                class="teacher-thumb"
                src="${escapeHtml(avatar)}"
                alt="Teacher photo"
                onerror="this.onerror=null;this.src='${fallback}'"
              >

              <div>
                <strong>
                  ${escapeHtml(
                    teacher.full_name || "Unnamed Teacher"
                  )}
                </strong>

                <small>
                  ${escapeHtml(
                    teacher.email || "No email"
                  )}
                </small>
              </div>
            </div>
          </td>

          <td>
            ${escapeHtml(teacher.phone || "—")}
          </td>

          <td>
            ${escapeHtml(
              teacher.institution_name || "—"
            )}
          </td>

          <td>Teacher</td>

          <td>
            <span class="status ${statusClass}">
              ${statusText}
            </span>
          </td>

          <td>
            <div class="actions">
              <button
                type="button"
                class="action-btn view"
                onclick="viewTeacher('${teacherId}')"
              >View</button>

              <button
                type="button"
                class="action-btn edit"
                onclick="editTeacher('${teacherId}')"
              >Edit</button>

              <button
                type="button"
                class="action-btn toggle"
                onclick="toggleTeacher('${teacherId}')"
              >${teacher.is_active ? "Disable" : "Activate"}</button>

              <button
                type="button"
                class="action-btn delete"
                onclick="deleteTeacher('${teacherId}')"
              >Delete</button>
            </div>
          </td>
        </tr>
      `;
    }
  ).join("");
}

/* ============================================================
   EDIT TEACHER
   ============================================================ */

function editTeacher(id) {
  const teacher = teachers.find(
    item => item.id === id
  );

  if (!teacher) {
    alert("Teacher not found.");
    return;
  }

  $("editId").value = teacher.id;

  $("fullName").value =
    teacher.full_name || "";

  $("email").value =
    teacher.email || "";

  $("email").disabled = true;

  $("teacherId").value = "";

  $("teacherId").disabled = true;

  $("teacherId").required = false;

  $("password").value = "";

  $("password").required = false;

  $("phone").value =
    teacher.phone || "";

  $("institutionId").value =
    teacher.institution_id || "";

  $("isActive").value =
    teacher.is_active ? "true" : "false";

  clearPhotoSelection();

  renderPhotoPreview(
    teacher.avatar_url,
    teacher.full_name
  );

  setPhotoStatus(
    teacher.avatar_url
      ? "Current photo"
      : "No photo uploaded"
  );

  $("modalTitle").textContent =
    "Edit Teacher";

  $("saveBtn").textContent =
    "Update Teacher";

  $("teacherModal").classList.add("show");

  $("teacherModal").setAttribute(
    "aria-hidden",
    "false"
  );
}

/* ============================================================
   PHOTO SELECTION
   ============================================================ */

function handlePhotoSelect(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    event.target.value = "";

    selectedPhotoFile = null;

    setPhotoStatus(
      "Only JPG, PNG and WEBP images are allowed."
    );

    alert(
      "Only JPG, PNG and WEBP images are allowed."
    );

    return;
  }

  if (file.size > MAX_PHOTO_SIZE) {
    event.target.value = "";

    selectedPhotoFile = null;

    setPhotoStatus(
      "Maximum photo size is 2 MB."
    );

    alert(
      "Photo is too large. Maximum size is 2 MB."
    );

    return;
  }

  selectedPhotoFile = file;

  const previewUrl =
    URL.createObjectURL(file);

  renderPhotoPreview(
    previewUrl,
    $("fullName")?.value || "Teacher"
  );

  setPhotoStatus(
    `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`
  );
}

function fileExtension(file) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  return map[file.type] || "jpg";
}

/* ============================================================
   UPLOAD TEACHER PHOTO
   ============================================================ */

async function uploadTeacherPhoto(
  teacherId,
  file
) {
  if (!file) return null;

  const ext = fileExtension(file);

  const randomPart =
    typeof crypto !== "undefined" &&
    crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  const path =
    `${teacherId}/${Date.now()}-${randomPart}.${ext}`;

  const { error: uploadError } =
    await withTimeout(
      supabaseClient.storage
        .from(TEACHER_PHOTO_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        }),
      "Uploading teacher photo"
    );

  if (uploadError) {
    throw uploadError;
  }

  const { data } =
    supabaseClient.storage
      .from(TEACHER_PHOTO_BUCKET)
      .getPublicUrl(path);

  const publicUrl =
    data?.publicUrl || "";

  if (!publicUrl) {
    throw new Error(
      "Photo uploaded, but its public URL could not be generated."
    );
  }

  return {
    path,
    publicUrl
  };
}

/* ============================================================
   DELETE OLD TEACHER PHOTO
   ============================================================ */

function storagePathFromPublicUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    const marker =
      `/storage/v1/object/public/${TEACHER_PHOTO_BUCKET}/`;

    const index =
      parsed.pathname.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return decodeURIComponent(
      parsed.pathname.slice(
        index + marker.length
      )
    );
  } catch (_) {
    return null;
  }
}

async function deleteOldTeacherPhoto(url) {
  const path =
    storagePathFromPublicUrl(url);

  if (!path) return;

  const { error } = await withTimeout(
    supabaseClient.storage
      .from(TEACHER_PHOTO_BUCKET)
      .remove([path]),
    "Deleting old teacher photo"
  );

  if (error) {
    console.warn(
      "Old photo could not be removed:",
      error.message
    );
  }
}

/* ============================================================
   UPDATE TEACHER PROFILE
   ============================================================ */

async function updateTeacherProfile(
  id,
  payload
) {
  const { error } = await withTimeout(
    supabaseClient
      .from("profiles")
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("role", "teacher"),
    "Updating teacher"
  );

  if (error) {
    throw error;
  }
}

/* ============================================================
   CREATE TEACHER ACCOUNT V8.1
   FIXED: only ONE function declaration
   ============================================================ */

async function createTeacher(
  payload,
  accessToken
) {
  if (!supabaseClient) {
    throw new Error(
      "Supabase client is unavailable. Reload the page."
    );
  }

  let token = accessToken;

  if (!token) {
    const {
      data,
      error: sessionError
    } = await withTimeout(
      supabaseClient.auth.getSession(),
      "Checking login session"
    );

    if (sessionError) {
      throw new Error(
        `Could not verify login session: ${sessionError.message}`
      );
    }

    token =
      data?.session?.access_token;
  }

  if (!token) {
    throw new Error(
      "Your login session is missing or expired. Please sign in again."
    );
  }

  const requiredFields = [
    "full_name",
    "email",
    "institution_id",
    "teacher_id",
    "password"
  ];

  const missingFields =
    requiredFields.filter(field => {
      return !String(
        payload?.[field] ?? ""
      ).trim();
    });

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required fields: ${missingFields.join(", ")}`
    );
  }

  let response;

  try {
    response = await withTimeout(
      fetch(
        CREATE_TEACHER_FUNCTION_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${token}`
          },

          body: JSON.stringify(payload)
        }
      ),
      "Creating teacher account"
    );
  } catch (error) {
    console.error(
      "[GAAWOW TEACHER] Edge Function request failed:",
      error
    );

    throw new Error(
      error?.message ||
      "Could not connect to the teacher account service."
    );
  }

  let result;

  try {
    result = await response.json();
  } catch (_) {
    throw new Error(
      `Supabase returned an unreadable response. HTTP ${response.status}. Check the Edge Function logs.`
    );
  }

  console.info(
    "[GAAWOW TEACHER] Create account response:",
    {
      httpStatus: response.status,
      success: result?.success,
      error: result?.error,
      details: result?.details,
      database_code: result?.database_code,
      database_details: result?.database_details,
      database_hint: result?.database_hint
    }
  );

  if (
    !response.ok ||
    result?.success === false ||
    result?.error
  ) {
    const errorParts = [];

    if (result?.error) {
      errorParts.push(result.error);
    }

    if (result?.details) {
      errorParts.push(
        `Technical details: ${result.details}`
      );
    }

    if (result?.database_code) {
      errorParts.push(
        `Database code: ${result.database_code}`
      );
    }

    if (result?.database_details) {
      errorParts.push(
        `Database details: ${result.database_details}`
      );
    }

    if (result?.database_hint) {
      errorParts.push(
        `Database hint: ${result.database_hint}`
      );
    }

    errorParts.push(
      `HTTP status: ${response.status}`
    );

    throw new Error(
      errorParts.join("\n")
    );
  }

  if (result?.success !== true) {
    throw new Error(
      "The server did not confirm teacher account creation."
    );
  }

  return result;
}

/* ============================================================
   FIND CREATED TEACHER PROFILE
   ============================================================ */

async function findTeacherProfileIdByEmail(
  email
) {
  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  const result = await withTimeout(
    supabaseClient
      .from("profiles")
      .select("id,email,role")
      .ilike("email", normalizedEmail)
      .eq("role", "teacher")
      .maybeSingle(),
    "Finding newly created teacher profile"
  );

  if (result.error) {
    throw new Error(
      "The account may have been created, but profile lookup failed: " +
      result.error.message
    );
  }

  return result.data?.id || null;
}

/* ============================================================
   SAVE TEACHER
   ============================================================ */

async function saveTeacher(event) {
  event.preventDefault();

  const saveBtn = $("saveBtn");

  if (!saveBtn) {
    alert(
      "Create Teacher Account button was not found."
    );

    return;
  }

  const editId =
    $("editId").value.trim();

  const fullName =
    $("fullName").value.trim();

  const email =
    $("email").value.trim().toLowerCase();

  const teacherCode =
    $("teacherId")?.value.trim() || "";

  const phone =
    $("phone").value.trim();

  const password =
    $("password").value;

  const institutionId =
    $("institutionId").value;

  const isActive =
    $("isActive").value === "true";

  if (!fullName) {
    alert(
      "Please enter the teacher's full name."
    );

    return;
  }

  if (!institutionId) {
    alert(
      "Please select an institution."
    );

    return;
  }

  if (!editId) {
    if (!email) {
      alert(
        "Please enter the teacher's email."
      );

      return;
    }

    if (!teacherCode) {
      alert(
        "Please enter a unique Teacher ID."
      );

      return;
    }

    if (password.length < 12) {
      alert(
        "Password must contain at least 12 characters."
      );

      return;
    }
  }

  saveBtn.disabled = true;

  saveBtn.textContent =
    editId
      ? "Updating..."
      : "Creating Account...";

  try {
    /* ---------------- EDIT EXISTING TEACHER ---------------- */

    if (editId) {
      const teacher = teachers.find(
        item => item.id === editId
      );

      if (!teacher) {
        throw new Error(
          "Teacher profile could not be found."
        );
      }

      let uploadedPhoto = null;

      if (selectedPhotoFile) {
        uploadedPhoto =
          await uploadTeacherPhoto(
            editId,
            selectedPhotoFile
          );
      }

      await updateTeacherProfile(
        editId,
        {
          full_name: fullName,
          phone: phone || null,
          institution_id: institutionId,
          is_active: isActive,

          ...(uploadedPhoto
            ? {
                avatar_url:
                  uploadedPhoto.publicUrl
              }
            : {})
        }
      );

      if (
        uploadedPhoto &&
        teacher.avatar_url
      ) {
        await deleteOldTeacherPhoto(
          teacher.avatar_url
        );
      }

      alert(
        "Teacher updated successfully."
      );

      closeTeacherModal();

      await loadTeachers();

      return;
    }

    /* ---------------- CREATE NEW TEACHER ---------------- */

    const session =
      await getSessionOrRedirect();

    if (!session?.access_token) {
      throw new Error(
        "Your login session has expired. Please sign in again."
      );
    }

    await createTeacher(
      {
        full_name: fullName,
        email,
        password,
        phone: phone || null,
        institution_id: institutionId,
        teacher_id: teacherCode,
        is_active: isActive
      },
      session.access_token
    );

    const profileId =
      await findTeacherProfileIdByEmail(
        email
      );

    if (!profileId) {
      throw new Error(
        "The account request completed, but the teacher profile could not be found. Check Supabase Auth, profiles and teachers before trying again, to avoid creating a duplicate account."
      );
    }

    if (selectedPhotoFile) {
      const uploadedPhoto =
        await uploadTeacherPhoto(
          profileId,
          selectedPhotoFile
        );

      await updateTeacherProfile(
        profileId,
        {
          avatar_url:
            uploadedPhoto.publicUrl
        }
      );
    }

    if (!isActive) {
      await updateTeacherProfile(
        profileId,
        {
          is_active: false
        }
      );
    }

    alert(
      "Teacher account created successfully!\n\n" +
      `Name: ${fullName}\n` +
      `Email: ${email}\n` +
      `Teacher ID: ${teacherCode}\n\n` +
      "The teacher account was created. Confirm the configured email-confirmation and login process before sharing access."
    );

    closeTeacherModal();

    await loadTeachers();

  } catch (error) {
    console.error(
      "[GAAWOW TEACHER] Save operation failed:",
      error
    );

    alert(
      "Failed to create/update teacher account.\n\n" +
      (error?.message || String(error))
    );

  } finally {
    saveBtn.disabled = false;

    saveBtn.textContent =
      $("editId")?.value
        ? "Update Teacher"
        : "Create Teacher Account";
  }
}

/* ============================================================
   VIEW TEACHER PROFILE
   ============================================================ */

function viewTeacher(id) {
  const teacher = teachers.find(
    item => item.id === id
  );

  if (!teacher) {
    alert("Teacher not found.");
    return;
  }

  const avatar =
    normalizeUrl(teacher.avatar_url) ||
    photoPlaceholder(teacher.full_name);

  $("viewContent").innerHTML = `
    <div class="profile-box">

      <img
        class="avatar-large"
        src="${escapeHtml(avatar)}"
        alt="Teacher photo"
      >

      <div class="profile-info">

        <div class="profile-name">
          ${escapeHtml(
            teacher.full_name || "Unnamed Teacher"
          )}
        </div>

        <div class="detail">
          <strong>Email:</strong>
          ${escapeHtml(
            teacher.email || "Not provided"
          )}
        </div>

        <div class="detail">
          <strong>Phone:</strong>
          ${escapeHtml(
            teacher.phone || "Not provided"
          )}
        </div>

        <div class="detail">
          <strong>Institution:</strong>
          ${escapeHtml(
            teacher.institution_name || "Unknown"
          )}
        </div>

        <div class="detail">
          <strong>Role:</strong>
          Teacher
        </div>

        <div class="detail">
          <strong>User ID:</strong>
          ${escapeHtml(teacher.id)}
        </div>

        <div class="detail">
          <strong>Status:</strong>
          ${teacher.is_active ? "Active" : "Inactive"}
        </div>

      </div>
    </div>
  `;

  $("viewModal").classList.add("show");

  $("viewModal").setAttribute(
    "aria-hidden",
    "false"
  );
}

/* ============================================================
   ACTIVATE / DEACTIVATE TEACHER
   ============================================================ */

async function toggleTeacher(id) {
  const teacher = teachers.find(
    item => item.id === id
  );

  if (!teacher) return;

  const newStatus =
    !teacher.is_active;

  const action =
    newStatus ? "activate" : "disable";

  if (
    !confirm(
      `Are you sure you want to ${action} this teacher?`
    )
  ) {
    return;
  }

  try {
    await updateTeacherProfile(
      id,
      {
        is_active: newStatus
      }
    );

    await loadTeachers();

    showMessage(
      `Teacher ${action}d successfully.`
    );

  } catch (error) {
    console.error(
      "Teacher status update failed:",
      error
    );

    alert(
      `Failed to ${action} teacher:\n\n` +
      (error?.message || error)
    );
  }
}

/* ============================================================
   DELETE TEACHER ACCOUNT
   ============================================================ */

async function deleteTeacher(id) {
  const teacher = teachers.find(
    item => item.id === id
  );

  if (!teacher) return;

  const confirmed = confirm(
    "Delete this teacher account?\n\n" +
    `${teacher.full_name || ""}\n` +
    `${teacher.email || ""}\n\n` +
    "This action may permanently remove account data."
  );

  if (!confirmed) return;

  try {
    const session =
      await getSessionOrRedirect();

    if (!session?.access_token) {
      throw new Error(
        "Your Super Admin session has expired. Please sign in again."
      );
    }

    const response = await withTimeout(
      fetch(
        DELETE_TEACHER_FUNCTION_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "Authorization":
              `Bearer ${session.access_token}`,
            "apikey": SUPABASE_KEY
          },

          body: JSON.stringify({
            teacher_id: id,
            id
          })
        }
      ),
      "Deleting teacher account"
    );

    let result = null;

    try {
      result = await response.json();
    } catch (_) {
      // A non-JSON error is handled below.
    }

    if (
      !response.ok ||
      result?.success === false ||
      result?.error
    ) {
      throw new Error(
        result?.details
          ? `${result.error || "Delete failed"}: ${result.details}`
          : (
              result?.error ||
              result?.message ||
              `Delete Teacher failed. HTTP ${response.status}`
            )
      );
    }

    if (teacher.avatar_url) {
      await deleteOldTeacherPhoto(
        teacher.avatar_url
      );
    }

    alert(
      "Teacher account deleted successfully."
    );

    await loadTeachers();

  } catch (error) {
    console.error(
      "Delete teacher error:",
      error
    );

    alert(
      "Failed to delete teacher:\n\n" +
      (error?.message || String(error))
    );
  }
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

function setupEvents() {
  $("searchInput")?.addEventListener(
    "input",
    renderTeachers
  );

  $("institutionFilter")?.addEventListener(
    "change",
    renderTeachers
  );

  $("statusFilter")?.addEventListener(
    "change",
    renderTeachers
  );

  $("teacherForm")?.addEventListener(
    "submit",
    saveTeacher
  );

  $("photoFile")?.addEventListener(
    "change",
    handlePhotoSelect
  );

  $("fullName")?.addEventListener(
    "input",
    () => {
      if (!selectedPhotoFile) {
        renderPhotoPreview(
          $("photoPreview")?.dataset?.currentUrl || "",
          $("fullName")?.value || "Teacher"
        );
      }
    }
  );

  $("teacherModal")?.addEventListener(
    "click",
    event => {
      if (event.target.id === "teacherModal") {
        closeTeacherModal();
      }
    }
  );

  $("viewModal")?.addEventListener(
    "click",
    event => {
      if (event.target.id === "viewModal") {
        closeViewModal();
      }
    }
  );
}

/* ============================================================
   GLOBAL FUNCTIONS FOR HTML BUTTONS
   ============================================================ */

window.openAddTeacher = openAddTeacher;
window.closeTeacherModal = closeTeacherModal;
window.closeViewModal = closeViewModal;

window.editTeacher = editTeacher;
window.viewTeacher = viewTeacher;
window.toggleTeacher = toggleTeacher;
window.deleteTeacher = deleteTeacher;

window.handlePhotoSelect = handlePhotoSelect;
window.loadTeachers = loadTeachers;

/* ============================================================
   PAGE INITIALIZATION
   ============================================================ */

window.addEventListener(
  "DOMContentLoaded",
  async () => {
    setupEvents();

    setTableMessage(
      "Checking Super Admin access...",
      "loading"
    );

    try {
      if (!supabaseClient) {
        setTableMessage(
          "Supabase client could not start. Check the Supabase CDN script in teacher.html.",
          "empty"
        );

        return;
      }

      const allowed =
        await checkAccess();

      if (!allowed) return;

      /*
       * Institution loading is independent from teacher loading.
       * An institution error must not block the teacher query.
       */

      const institutionPromise =
        loadInstitutions().catch(error => {
          console.error(
            "Institutions could not be loaded:",
            error
          );

          institutions = [];

          if ($("institutionFilter")) {
            $("institutionFilter").innerHTML =
              '<option value="">All Institutions</option>';
          }

          if ($("institutionId")) {
            $("institutionId").innerHTML =
              '<option value="">Select Institution</option>';
          }

          return false;
        });

      const teachersLoaded =
        await loadTeachers();

      await institutionPromise;

      if (teachersLoaded) {
        teachers = teachers.map(teacher => {
          const institution =
            institutions.find(
              item =>
                item.id === teacher.institution_id
            );

          return {
            ...teacher,

            institution_name:
              institution?.name ||
              "Unknown Institution"
          };
        });

        renderTeachers();
      }

    } catch (error) {
      console.error(
        "Teacher page initialization error:",
        error
      );

      setTableMessage(
        `Teacher page failed to load: ${error.message || error}`,
        "empty"
      );
    }
  },
  { once: true }
);
