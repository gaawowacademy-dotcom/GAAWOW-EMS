// ============================================
// SUPABASE
// ============================================

const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

let supabaseClient = null;

// If the first CDN in the HTML is blocked/slow, try these one by one.
// (Best permanent fix: download supabase.min.js and host it next to this file,
//  then add "./supabase.min.js" as the first item below.)
const SUPABASE_LIBS = [
  "./supabase.min.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js",
  "https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js",
  "https://fastly.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js",
  "https://gcore.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"
];

function loadScript(src, timeoutMs) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;

    const timer = setTimeout(() => {
      s.remove();
      reject(new Error("timeout"));
    }, timeoutMs || 8000);

    s.onload = () => { clearTimeout(timer); resolve(); };
    s.onerror = () => { clearTimeout(timer); s.remove(); reject(new Error("failed")); };

    document.head.appendChild(s);
  });
}

async function ensureSupabase() {

  if (supabaseClient) return true;

  if (!(window.supabase && window.supabase.createClient)) {
    for (const url of SUPABASE_LIBS) {
      try {
        await loadScript(url);
        if (window.supabase && window.supabase.createClient) break;
      } catch (e) {
        console.warn("Supabase library failed from:", url);
      }
    }
  }

  if (!(window.supabase && window.supabase.createClient)) return false;

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return true;
}


// ============================================
// GLOBAL VARIABLES
// ============================================

let students = [];
let institutions = [];

let currentUser = null;
let currentRole = null;
let currentInstitutionId = null;


// ============================================
// ELEMENTS
// ============================================

const studentsBody = document.getElementById("studentsBody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const studentForm = document.getElementById("studentForm");
const studentModal = document.getElementById("studentModal");
const viewModal = document.getElementById("viewModal");
const messageBox = document.getElementById("message");
const institutionSelect = document.getElementById("institutionId");
const institutionGroup = document.getElementById("institutionGroup");


// ============================================
// HELPERS
// ============================================

// Never let a request hang forever
function withTimeout(promise, ms, label) {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(
        (label || "Request") +
        " timed out. Check your internet connection and try again."
      ));
    }, ms || 15000);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = "message " + type;

  clearTimeout(showMessage._t);

  showMessage._t = setTimeout(() => {
    messageBox.className = "message";
  }, 5000);
}

// Shows a permanent error in the table (with Retry) instead of endless "Loading..."
function showFatal(text) {
  console.error("FATAL:", text);

  studentsBody.innerHTML = `
    <tr>
      <td colspan="7" class="empty">
        <div style="color:#991B1B; margin-bottom:12px;">
          ${escapeHtml(text)}
        </div>
        <button class="save" onclick="startStudentsPage()">Retry</button>
      </td>
    </tr>
  `;

  institutionSelect.innerHTML =
    `<option value="">Unable to load institutions</option>`;

  showMessage(text, "error");
}


// ============================================
// SESSION + PROFILE
// ============================================

async function checkSession() {

  const { data, error } = await withTimeout(
    supabaseClient.auth.getSession(),
    10000,
    "Session check"
  );

  if (error || !data.session) {
    window.location.href = "index.html";
    return false;
  }

  currentUser = data.session.user;

  const { data: profile, error: profileError } = await withTimeout(
    supabaseClient
      .from("profiles")
      .select("id, full_name, role, institution_id, is_active")
      .eq("id", currentUser.id)
      .maybeSingle(),
    10000,
    "Profile"
  );

  if (profileError) {
    showFatal("Unable to load user profile: " + profileError.message);
    return false;
  }

  if (!profile) {
    showFatal("User profile not found for this account.");
    return false;
  }

  if (profile.is_active === false) {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
    return false;
  }

  currentRole = profile.role;
  currentInstitutionId = profile.institution_id;

  return true;
}


function applyRoleUI() {
  if (currentRole === "super_admin") {
    institutionGroup.style.display = "flex";
    institutionSelect.required = true;
  } else {
    institutionGroup.style.display = "none";
    institutionSelect.required = false;
  }
}


// ============================================
// LOAD INSTITUTIONS
// ============================================

async function loadInstitutions() {

  try {

    let query = supabaseClient
      .from("institutions")
      .select("id, name")
      .order("name", { ascending: true });

    // Non super-admin only needs their own institution
    if (currentRole !== "super_admin") {
      if (!currentInstitutionId) return;
      query = query.eq("id", currentInstitutionId);
    }

    const { data, error } = await withTimeout(query, 15000, "Institutions");

    if (error) throw error;

    institutions = data || [];

    institutionSelect.innerHTML =
      `<option value="">Select Institution</option>`;

    institutions.forEach(institution => {
      const option = document.createElement("option");
      option.value = institution.id;
      option.textContent = institution.name;
      institutionSelect.appendChild(option);
    });

  } catch (err) {

    console.error("Load institutions error:", err);

    institutionSelect.innerHTML =
      `<option value="">Unable to load institutions</option>`;

    if (currentRole === "super_admin") {
      showMessage("Unable to load institutions: " + err.message, "error");
    }
  }
}


// ============================================
// LOAD STUDENTS
// ============================================

async function loadStudents(silent) {

  if (!silent) {
    studentsBody.innerHTML = `
      <tr>
        <td colspan="7" class="loading">Loading students...</td>
      </tr>
    `;
  }

  try {

    let query = supabaseClient
      .from("students")
      .select(`
        id,
        institution_id,
        student_id,
        full_name,
        gender,
        date_of_birth,
        phone,
        email,
        address,
        photo_url,
        admission_date,
        status,
        emergency_contact_name,
        emergency_contact_phone,
        created_at
      `);

    // Super Admin sees ALL students. Others: only their institution.
    if (currentRole !== "super_admin") {

      if (!currentInstitutionId) {
        studentsBody.innerHTML = `
          <tr>
            <td colspan="7" class="empty">
              Institution not assigned to this account.
            </td>
          </tr>
        `;
        return;
      }

      query = query.eq("institution_id", currentInstitutionId);
    }

    const { data, error } = await withTimeout(
      query.order("created_at", { ascending: false }),
      20000,
      "Students"
    );

    if (error) throw error;

    students = data || [];

    renderStudents();

  } catch (err) {
    showFatal("Unable to load students: " + err.message);
  }
}


// ============================================
// RENDER STUDENTS
// ============================================

function renderStudents() {

  const search = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;

  const filtered = students.filter(student => {

    const matchesSearch =
      !search ||
      (student.student_id || "").toLowerCase().includes(search) ||
      (student.full_name || "").toLowerCase().includes(search) ||
      (student.phone || "").toLowerCase().includes(search);

    const matchesStatus = !status || student.status === status;

    return matchesSearch && matchesStatus;
  });

  if (!filtered.length) {
    studentsBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty">No students found.</td>
      </tr>
    `;
    return;
  }

  studentsBody.innerHTML = filtered.map(student => `
    <tr>
      <td><strong>${escapeHtml(student.student_id || "-")}</strong></td>
      <td>${escapeHtml(student.full_name || "-")}</td>
      <td>${escapeHtml(student.gender || "-")}</td>
      <td>${escapeHtml(student.phone || "-")}</td>
      <td>
        <span class="status ${escapeHtml(student.status || "")}">
          ${escapeHtml(student.status || "-")}
        </span>
      </td>
      <td>${formatDate(student.admission_date)}</td>
      <td>
        <div class="actions">
          <button class="action-btn view" onclick="viewStudent('${student.id}')">View</button>
          <button class="action-btn edit" onclick="editStudent('${student.id}')">Edit</button>
          <button class="action-btn delete" onclick="deleteStudent('${student.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}


// ============================================
// OPEN ADD MODAL
// ============================================

function openAddModal() {

  studentForm.reset();

  document.getElementById("editId").value = "";
  document.getElementById("modalTitle").textContent = "Add Student";
  document.getElementById("saveButton").textContent = "Save Student";
  document.getElementById("saveButton").disabled = false;
  document.getElementById("status").value = "active";

  if (currentRole === "super_admin") {
    institutionSelect.value = "";
    institutionSelect.disabled = false;
  } else {
    institutionSelect.value = currentInstitutionId || "";
    institutionSelect.disabled = true;
  }

  studentModal.style.display = "block";
}


// ============================================
// EDIT STUDENT
// ============================================

function editStudent(id) {

  const student = students.find(item => item.id === id);
  if (!student) return;

  document.getElementById("editId").value = student.id;
  document.getElementById("studentId").value = student.student_id || "";
  document.getElementById("fullName").value = student.full_name || "";
  document.getElementById("gender").value = student.gender || "";
  document.getElementById("dateOfBirth").value = student.date_of_birth || "";
  document.getElementById("phone").value = student.phone || "";
  document.getElementById("email").value = student.email || "";
  document.getElementById("address").value = student.address || "";
  document.getElementById("admissionDate").value = student.admission_date || "";
  document.getElementById("status").value = student.status || "active";
  document.getElementById("emergencyContactName").value = student.emergency_contact_name || "";
  document.getElementById("emergencyContactPhone").value = student.emergency_contact_phone || "";
  document.getElementById("photoUrl").value = student.photo_url || "";

  institutionSelect.value = student.institution_id || "";
  institutionSelect.disabled = currentRole !== "super_admin";

  document.getElementById("modalTitle").textContent = "Edit Student";
  document.getElementById("saveButton").textContent = "Update Student";
  document.getElementById("saveButton").disabled = false;

  studentModal.style.display = "block";
}


// ============================================
// SAVE / UPDATE STUDENT
// ============================================

studentForm.addEventListener("submit", async function (event) {

  event.preventDefault();

  const saveButton = document.getElementById("saveButton");
  const editId = document.getElementById("editId").value;
  const idleText = editId ? "Update Student" : "Save Student";

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  try {

    let selectedInstitutionId = institutionSelect.value;

    if (currentRole !== "super_admin") {
      selectedInstitutionId = currentInstitutionId;
    }

    if (!selectedInstitutionId) {
      showMessage("Please select an institution.", "error");
      return;
    }

    const studentData = {
      student_id: document.getElementById("studentId").value.trim(),
      full_name: document.getElementById("fullName").value.trim(),
      gender: document.getElementById("gender").value || null,
      date_of_birth: document.getElementById("dateOfBirth").value || null,
      phone: document.getElementById("phone").value.trim() || null,
      email: document.getElementById("email").value.trim() || null,
      address: document.getElementById("address").value.trim() || null,
      admission_date: document.getElementById("admissionDate").value || null,
      status: document.getElementById("status").value,
      emergency_contact_name: document.getElementById("emergencyContactName").value.trim() || null,
      emergency_contact_phone: document.getElementById("emergencyContactPhone").value.trim() || null,
      photo_url: document.getElementById("photoUrl").value.trim() || null,
      institution_id: selectedInstitutionId
    };

    const request = editId
      ? supabaseClient.from("students").update(studentData).eq("id", editId)
      : supabaseClient.from("students").insert(studentData);

    const result = await withTimeout(request, 20000, "Save");

    if (result.error) {
      console.error("Save student error:", result.error);
      showMessage(result.error.message, "error");
      return;
    }

    closeModal();

    showMessage(
      editId ? "Student updated successfully." : "Student added successfully.",
      "success"
    );

    // Refresh list quietly (no "Loading..." flash)
    loadStudents(true);

  } catch (err) {
    console.error("Save student error:", err);
    showMessage(err.message, "error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = idleText;
  }
});


// ============================================
// VIEW STUDENT
// ============================================

function viewStudent(id) {

  const student = students.find(item => item.id === id);
  if (!student) return;

  const institution = institutions.find(
    item => item.id === student.institution_id
  );

  const institutionName = institution
    ? institution.name
    : student.institution_id || "-";

  const photo = student.photo_url
    ? `<img
         src="${escapeHtml(student.photo_url)}"
         style="width:90px;height:90px;object-fit:cover;border-radius:50%;margin-bottom:15px;">`
    : "";

  document.getElementById("studentDetails").innerHTML = `

    <div style="text-align:center;">
      ${photo}
      <h2 style="color:#0B1E63;">${escapeHtml(student.full_name || "-")}</h2>
      <p>${escapeHtml(student.student_id || "-")}</p>
    </div>

    <hr style="margin:18px 0;">

    <p><strong>Institution:</strong> ${escapeHtml(institutionName)}</p>
    <p><strong>Gender:</strong> ${escapeHtml(student.gender || "-")}</p>
    <p><strong>Date of Birth:</strong> ${formatDate(student.date_of_birth)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(student.phone || "-")}</p>
    <p><strong>Email:</strong> ${escapeHtml(student.email || "-")}</p>
    <p><strong>Address:</strong> ${escapeHtml(student.address || "-")}</p>
    <p><strong>Admission Date:</strong> ${formatDate(student.admission_date)}</p>
    <p><strong>Status:</strong> ${escapeHtml(student.status || "-")}</p>
    <p><strong>Emergency Contact:</strong> ${escapeHtml(student.emergency_contact_name || "-")}</p>
    <p><strong>Emergency Phone:</strong> ${escapeHtml(student.emergency_contact_phone || "-")}</p>
  `;

  viewModal.style.display = "block";
}


// ============================================
// DELETE STUDENT
// ============================================

async function deleteStudent(id) {

  const student = students.find(item => item.id === id);
  if (!student) return;

  if (!confirm(`Delete ${student.full_name}?`)) return;

  try {

    const { error } = await withTimeout(
      supabaseClient.from("students").delete().eq("id", id),
      15000,
      "Delete"
    );

    if (error) throw error;

    // Remove locally = instant UI update
    students = students.filter(item => item.id !== id);
    renderStudents();

    showMessage("Student deleted successfully.", "success");

  } catch (err) {
    console.error("Delete student error:", err);
    showMessage(err.message, "error");
  }
}


// ============================================
// MODAL FUNCTIONS
// ============================================

function closeModal() {
  studentModal.style.display = "none";
}

function closeViewModal() {
  viewModal.style.display = "none";
}


// ============================================
// SEARCH (debounced)
// ============================================

let searchTimer;

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderStudents, 150);
});

statusFilter.addEventListener("change", renderStudents);


// ============================================
// DASHBOARD
// ============================================

function goDashboard() {
  window.location.href = "dashboard.html";
}


// ============================================
// START
// ============================================

async function startStudentsPage() {

  const ready = await ensureSupabase();

  if (!ready) {
    showFatal(
      "Supabase library could not be loaded from any source. " +
      "Check your internet, turn off ad-blocker/VPN, or host supabase.min.js locally."
    );
    return;
  }

  try {

    const authenticated = await checkSession();
    if (!authenticated) return;

    applyRoleUI();

    // Load both at the same time (faster)
    await Promise.all([
      loadStudents(),
      loadInstitutions()
    ]);

  } catch (err) {
    showFatal(err.message || "Something went wrong.");
  }
}


startStudentsPage();
