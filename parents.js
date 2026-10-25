/* =========================================================
   GAAWOW EMS
   Parent Management System
   Supabase + Institution / Course / Class / Student
   ========================================================= */

"use strict";

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// =========================================================
// APPLICATION STATE
// =========================================================

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

let currentPage = 1;
const pageSize = 15;

// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();

  try {
    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession();

    if (error) throw error;

    if (!session) {
      window.location.href = "index.html";
      return;
    }

    currentUser = session.user;

    await loadProfile();

    if (
      !currentProfile ||
      currentProfile.role !== "super_admin" ||
      currentProfile.is_active === false
    ) {
      alert("Access denied. Super Admin access is required.");
      window.location.href = "dashboard.html";
      return;
    }

    await loadBaseData();
    await loadAllManagementData();

  } catch (error) {
    console.error("Parent Management initialization error:", error);

    showToast(
      errorMessage(
        error,
        "Could not initialize Parent Management."
      ),
      true
    );
  }
}

// =========================================================
// EVENT LISTENERS
// =========================================================

function bindEvents() {
  byId("addParentBtn").addEventListener(
    "click",
    openAddParent
  );

  byId("parentForm").addEventListener(
    "submit",
    saveParent
  );

  byId("searchInput").addEventListener(
    "input",
    applyFilters
  );

  byId("institutionFilter").addEventListener(
    "change",
    applyFilters
  );

  byId("clearFiltersBtn").addEventListener("click", () => {
    byId("searchInput").value = "";
    byId("institutionFilter").value = "";
    currentPage = 1;
    applyFilters();
  });

  byId("refreshBtn").addEventListener(
    "click",
    refreshAll
  );

  byId("prevPageBtn").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderParents();
    }
  });

  byId("nextPageBtn").addEventListener("click", () => {
    if (currentPage * pageSize < filteredParents.length) {
      currentPage++;
      renderParents();
    }
  });

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
      closeModal(button.dataset.close);
    });
  });

  ["parentModal", "linksModal"].forEach(modalId => {
    byId(modalId).addEventListener("click", event => {
      if (event.target === byId(modalId)) {
        closeModal(modalId);
      }
    });
  });

  byId("linkCourseSelect").addEventListener(
    "change",
    onLinkCourseChange
  );

  byId("linkClassSelect").addEventListener(
    "change",
    onLinkClassChange
  );

  byId("linkStudentBtn").addEventListener(
    "click",
    linkStudent
  );

  byId("parentsTableBody").addEventListener(
    "click",
    handleTableAction
  );

  byId("linkedStudentsList").addEventListener(
    "click",
    handleLinkedAction
  );
}

// =========================================================
// PROFILE AND AUTHORIZATION
// =========================================================

async function loadProfile() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,role,is_active,full_name,institution_id")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) throw error;

  currentProfile = data;
}

// =========================================================
// LOAD DATABASE TABLES
// =========================================================

async function loadBaseData() {
  const results = await Promise.all([
    supabaseClient
      .from("institutions")
      .select("id,name,code,is_active")
      .order("name"),

    supabaseClient
      .from("students")
      .select("id,institution_id,student_id,full_name,status")
      .order("full_name"),

    supabaseClient
      .from("courses")
      .select("id,institution_id,name,code,is_active")
      .order("name"),

    supabaseClient
      .from("classes")
      .select(
        "id,institution_id,course_id,name,code,academic_year,is_active,status"
      )
      .order("name"),

    supabaseClient
      .from("enrollments")
      .select(
        "id,institution_id,student_id,course_id,class_id,status,enrollment_date"
      )
  ]);

  for (const result of results) {
    if (result.error) {
      throw result.error;
    }
  }

  institutions = results[0].data || [];
  students = results[1].data || [];
  courses = results[2].data || [];
  classes = results[3].data || [];
  enrollments = results[4].data || [];

  populateInstitutionSelects();
}

async function loadAllManagementData() {
  await Promise.all([
    loadParents(),
    loadLinks()
  ]);

  updateStats();
  applyFilters();
}

async function loadParents() {
  const { data, error } = await supabaseClient
    .from("parents")
    .select(
      "id,institution_id,profile_id,full_name,phone,email,address,occupation,created_at,updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  parents = data || [];
}

async function loadLinks() {
  const { data, error } = await supabaseClient
    .from("parent_students")
    .select(
      "id,institution_id,parent_id,student_id,relationship,is_primary,created_at"
    );

  if (error) throw error;

  links = data || [];
}

// =========================================================
// INSTITUTION DROPDOWNS
// =========================================================

function populateInstitutionSelects() {
  const options = institutions.map(institution => {
    const label =
      institution.name +
      (institution.code ? ` (${institution.code})` : "");

    return `
      <option value="${escapeHtml(institution.id)}">
        ${escapeHtml(label)}
      </option>
    `;
  }).join("");

  byId("institutionFilter").innerHTML =
    `<option value="">All institutions</option>` + options;

  const oldValue = byId("parentInstitution").value;

  byId("parentInstitution").innerHTML =
    `<option value="">Select institution</option>` + options;

  if (institutions.some(item => item.id === oldValue)) {
    byId("parentInstitution").value = oldValue;
  }

  byId("totalInstitutions").textContent =
    institutions.length;
}

// =========================================================
// SEARCH AND FILTER
// =========================================================

function applyFilters() {
  const query = byId("searchInput")
    .value
    .trim()
    .toLowerCase();

  const institutionId =
    byId("institutionFilter").value;

  filteredParents = parents.filter(parent => {
    const searchableText = [
      parent.full_name,
      parent.phone,
      parent.email,
      parent.occupation,
      parent.address
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !query || searchableText.includes(query);

    const matchesInstitution =
      !institutionId ||
      parent.institution_id === institutionId;

    return matchesSearch && matchesInstitution;
  });

  currentPage = 1;

  renderParents();
  updateStats();
}

// =========================================================
// RENDER PARENT TABLE
// =========================================================

function renderParents() {
  const tbody = byId("parentsTableBody");

  const start = (currentPage - 1) * pageSize;

  const visibleParents = filteredParents.slice(
    start,
    start + pageSize
  );

  if (!visibleParents.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          No parent records found.
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = visibleParents.map(parent => {
      const institution = institutions.find(
        item => item.id === parent.institution_id
      );

      const parentLinks = links.filter(
        link => link.parent_id === parent.id
      );

      const initials = (parent.full_name || "P")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0] || "")
        .join("")
        .toUpperCase();

      return `
        <tr>
          <td>
            <div class="person">
              <div class="avatar">
                ${escapeHtml(initials)}
              </div>

              <div>
                <strong>
                  ${escapeHtml(parent.full_name || "Unnamed parent")}
                </strong>

                <small>
                  ${escapeHtml(parent.occupation || "Parent/Guardian")}
                </small>
              </div>
            </div>
          </td>

          <td>
            ${
              parent.phone
                ? `<div>${escapeHtml(parent.phone)}</div>`
                : ""
            }

            ${
              parent.email
                ? `<small>${escapeHtml(parent.email)}</small>`
                : ""
            }

            ${
              !parent.phone && !parent.email
                ? "<small>Not provided</small>"
                : ""
            }
          </td>

          <td>
            ${escapeHtml(institution?.name || "Institution unavailable")}
          </td>

          <td>
            <span class="badge">
              ${parentLinks.length} linked
            </span>
          </td>

          <td>${formatDate(parent.created_at)}</td>

          <td>
            <div class="actions">

              <button
                class="btn btn-muted btn-sm"
                data-action="edit"
                data-id="${escapeHtml(parent.id)}"
                title="Edit parent">
                <i class="fa-solid fa-pen"></i>
              </button>

              <button
                class="btn btn-blue btn-sm"
                data-action="links"
                data-id="${escapeHtml(parent.id)}">
                <i class="fa-solid fa-link"></i>
                Students
              </button>

              <button
                class="btn btn-danger btn-sm"
                data-action="delete"
                data-id="${escapeHtml(parent.id)}"
                title="Delete parent">
                <i class="fa-solid fa-trash"></i>
              </button>

            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  const totalPages = Math.max(
    1,
    Math.ceil(filteredParents.length / pageSize)
  );

  byId("tableSummary").textContent =
    filteredParents.length
      ? `Showing ${start + 1}-${Math.min(
          start + pageSize,
          filteredParents.length
        )} of ${filteredParents.length} parents`
      : "Showing 0 parents";

  byId("prevPageBtn").disabled = currentPage <= 1;
  byId("nextPageBtn").disabled =
    currentPage >= totalPages;

  byId("prevPageBtn").style.opacity =
    currentPage <= 1 ? ".45" : "1";

  byId("nextPageBtn").style.opacity =
    currentPage >= totalPages ? ".45" : "1";
}

// =========================================================
// STATISTICS
// =========================================================

function updateStats() {
  byId("totalParents").textContent =
    parents.length;

  const linkedParentIds = new Set(
    links.map(link => link.parent_id)
  );

  byId("linkedParents").textContent =
    parents.filter(parent =>
      linkedParentIds.has(parent.id)
    ).length;

  byId("totalLinks").textContent =
    links.length;

  byId("totalInstitutions").textContent =
    institutions.length;
}

// =========================================================
// ADD PARENT
// =========================================================

function openAddParent() {
  editingParentId = null;

  byId("parentForm").reset();

  byId("parentModalTitle").textContent =
    "Add Parent";

  byId("saveParentBtn").innerHTML =
    '<i class="fa-solid fa-floppy-disk"></i> Save Parent';

  openModal("parentModal");
}

// =========================================================
// EDIT PARENT
// =========================================================

function openEditParent(parentId) {
  const parent = parents.find(
    item => item.id === parentId
  );

  if (!parent) {
    showToast("Parent record was not found.", true);
    return;
  }

  editingParentId = parent.id;

  byId("parentForm").reset();

  byId("parentInstitution").value =
    parent.institution_id || "";

  byId("parentFullName").value =
    parent.full_name || "";

  byId("parentPhone").value =
    parent.phone || "";

  byId("parentEmail").value =
    parent.email || "";

  byId("parentOccupation").value =
    parent.occupation || "";

  byId("parentAddress").value =
    parent.address || "";

  byId("parentModalTitle").textContent =
    "Edit Parent";

  byId("saveParentBtn").innerHTML =
    '<i class="fa-solid fa-floppy-disk"></i> Update Parent';

  openModal("parentModal");
}

// =========================================================
// SAVE PARENT
// =========================================================

async function saveParent(event) {
  event.preventDefault();

  const button = byId("saveParentBtn");

  const payload = {
    institution_id: byId("parentInstitution").value,
    full_name: byId("parentFullName").value.trim(),
    phone: cleanOrNull(byId("parentPhone").value),
    email: cleanOrNull(byId("parentEmail").value),
    occupation: cleanOrNull(byId("parentOccupation").value),
    address: cleanOrNull(byId("parentAddress").value),
    updated_at: new Date().toISOString()
  };

  if (!payload.institution_id || !payload.full_name) {
    showToast(
      "Institution and full name are required.",
      true
    );
    return;
  }

  button.disabled = true;

  try {
    if (editingParentId) {
      const { error } = await supabaseClient
        .from("parents")
        .update(payload)
        .eq("id", editingParentId);

      if (error) throw error;

      showToast("Parent updated successfully.");

    } else {
      const { error } = await supabaseClient
        .from("parents")
        .insert(payload);

      if (error) throw error;

      showToast("Parent added successfully.");
    }

    closeModal("parentModal");

    await loadParents();
    await loadLinks();

    applyFilters();

  } catch (error) {
    console.error("Save parent error:", error);

    showToast(
      errorMessage(
        error,
        "Could not save parent."
      ),
      true
    );

  } finally {
    button.disabled = false;
  }
}

// =========================================================
// TABLE ACTIONS
// =========================================================

async function handleTableAction(event) {
  const button = event.target.closest(
    "button[data-action]"
  );

  if (!button) return;

  const parentId = button.dataset.id;
  const action = button.dataset.action;

  if (action === "edit") {
    openEditParent(parentId);
  }

  if (action === "links") {
    await manageLinks(parentId);
  }

  if (action === "delete") {
    await deleteParent(parentId);
  }
}

// =========================================================
// DELETE PARENT
// =========================================================

async function deleteParent(parentId) {
  const parent = parents.find(
    item => item.id === parentId
  );

  if (!parent) return;

  const relationshipCount = links.filter(
    link => link.parent_id === parentId
  ).length;

  const confirmed = confirm(
    `Delete parent "${parent.full_name}" and remove ${relationshipCount} linked student relationship(s)? This cannot be undone.`
  );

  if (!confirmed) return;

  try {
    if (relationshipCount > 0) {
      const { error: linksError } = await supabaseClient
        .from("parent_students")
        .delete()
        .eq("parent_id", parentId);

      if (linksError) throw linksError;
    }

    const { error } = await supabaseClient
      .from("parents")
      .delete()
      .eq("id", parentId);

    if (error) throw error;

    showToast("Parent and student links deleted.");

    await loadParents();
    await loadLinks();

    applyFilters();

  } catch (error) {
    console.error("Delete parent error:", error);

    showToast(
      errorMessage(
        error,
        "Could not delete parent."
      ),
      true
    );
  }
}

// =========================================================
// OPEN STUDENT LINK MANAGEMENT
// =========================================================

async function manageLinks(parentId) {
  selectedParent = parents.find(
    parent => parent.id === parentId
  );

  if (!selectedParent) {
    showToast("Parent record was not found.", true);
    return;
  }

  const institution = institutions.find(
    item => item.id === selectedParent.institution_id
  );

  byId("linksModalTitle").textContent =
    `Students for ${selectedParent.full_name}`;

  byId("selectedParentInfo").innerHTML = `
    <strong>${escapeHtml(selectedParent.full_name)}</strong>
    <br>
    Institution: ${escapeHtml(institution?.name || "Unknown")}
    <br>
    <small>Select a course, class, and enrolled student.</small>
  `;

  byId("relationshipSelect").value = "Father";
  byId("primaryCheck").checked = false;

  byId("linkCourseSelect").innerHTML =
    '<option value="">Select course</option>';

  byId("linkClassSelect").innerHTML =
    '<option value="">Select course first</option>';

  byId("linkStudentSelect").innerHTML =
    '<option value="">Select class first</option>';

  byId("linkClassSelect").disabled = true;
  byId("linkStudentSelect").disabled = true;

  const parentCourses = courses.filter(course =>
    course.institution_id === selectedParent.institution_id &&
    course.is_active !== false
  );

  byId("linkCourseSelect").innerHTML +=
    parentCourses.map(course => `
      <option value="${escapeHtml(course.id)}">
        ${escapeHtml(course.name)}
        ${course.code ? ` (${escapeHtml(course.code)})` : ""}
      </option>
    `).join("");

  renderLinkedStudents();

  openModal("linksModal");
}

// =========================================================
// COURSE SELECTED: LOAD CLASSES
// =========================================================

function onLinkCourseChange() {
  if (!selectedParent) return;

  const courseId =
    byId("linkCourseSelect").value;

  byId("linkClassSelect").innerHTML =
    '<option value="">Select class</option>';

  byId("linkStudentSelect").innerHTML =
    '<option value="">Select class first</option>';

  byId("linkStudentSelect").disabled = true;

  const matchingClasses = classes.filter(item => {
    const sameInstitution =
      item.institution_id === selectedParent.institution_id;

    const sameCourse =
      item.course_id === courseId;

    const active =
      item.is_active !== false;

    const statusAllowed =
      !item.status ||
      ["active", "open", "in_progress"].includes(
        String(item.status).toLowerCase()
      );

    return (
      sameInstitution &&
      sameCourse &&
      active &&
      statusAllowed
    );
  });

  byId("linkClassSelect").innerHTML +=
    matchingClasses.map(item => {
      const label = [
        item.name,
        item.code,
        item.academic_year
      ].filter(Boolean).join(" · ");

      return `
        <option value="${escapeHtml(item.id)}">
          ${escapeHtml(label)}
        </option>
      `;
    }).join("");

  byId("linkClassSelect").disabled =
    !courseId;
}

// =========================================================
// CLASS SELECTED: LOAD ENROLLED STUDENTS
// =========================================================

function onLinkClassChange() {
  if (!selectedParent) return;

  const courseId =
    byId("linkCourseSelect").value;

  const classId =
    byId("linkClassSelect").value;

  const alreadyLinked = new Set(
    links
      .filter(link =>
        link.parent_id === selectedParent.id
      )
      .map(link => link.student_id)
  );

  const validEnrollments = enrollments.filter(enrollment =>
    enrollment.institution_id === selectedParent.institution_id &&
    enrollment.course_id === courseId &&
    enrollment.class_id === classId &&
    isCurrentEnrollment(enrollment.status)
  );

  const enrolledStudentIds = new Set(
    validEnrollments.map(enrollment => enrollment.student_id)
  );

  const matchingStudents = students
    .filter(student =>
      student.institution_id === selectedParent.institution_id &&
      enrolledStudentIds.has(student.id) &&
      !alreadyLinked.has(student.id)
    )
    .sort((a, b) =>
      (a.full_name || "").localeCompare(b.full_name || "")
    );

  byId("linkStudentSelect").innerHTML =
    '<option value="">Select student</option>' +
    matchingStudents.map(student => `
      <option value="${escapeHtml(student.id)}">
        ${escapeHtml(student.full_name || "Unnamed student")}
        ·
        ${escapeHtml(student.student_id || "No student ID")}
      </option>
    `).join("");

  byId("linkStudentSelect").disabled =
    !classId;

  if (classId && matchingStudents.length === 0) {
    byId("linkStudentSelect").innerHTML =
      '<option value="">No eligible unlinked students in this class</option>';
  }
}

// =========================================================
// ENROLLMENT STATUS VALIDATION
// =========================================================

function isCurrentEnrollment(status) {
  if (status == null || status === "") {
    return true;
  }

  const normalizedStatus =
    String(status).toLowerCase();

  return ![
    "completed",
    "dropped",
    "suspended",
    "cancelled",
    "canceled"
  ].includes(normalizedStatus);
}

// =========================================================
// LINK STUDENT TO PARENT
// =========================================================

async function linkStudent() {
  if (!selectedParent) return;

  const courseId =
    byId("linkCourseSelect").value;

  const classId =
    byId("linkClassSelect").value;

  const studentId =
    byId("linkStudentSelect").value;

  const relationship =
    byId("relationshipSelect").value;

  const isPrimary =
    byId("primaryCheck").checked;

  if (!courseId || !classId || !studentId) {
    showToast(
      "Select a course, class, and student first.",
      true
    );
    return;
  }

  const validEnrollment = enrollments.some(enrollment =>
    enrollment.student_id === studentId &&
    enrollment.course_id === courseId &&
    enrollment.class_id === classId &&
    enrollment.institution_id === selectedParent.institution_id &&
    isCurrentEnrollment(enrollment.status)
  );

  if (!validEnrollment) {
    showToast(
      "This student is not enrolled in the selected class.",
      true
    );
    return;
  }

  const existingLink = links.some(link =>
    link.parent_id === selectedParent.id &&
    link.student_id === studentId
  );

  if (existingLink) {
    showToast(
      "This student is already linked to this parent.",
      true
    );
    return;
  }

  const button = byId("linkStudentBtn");

  button.disabled = true;

  try {
    /*
      If the new relationship is marked primary,
      first remove the primary flag from other parent
      relationships for this student.

      This depends on the applicable Supabase RLS
      policies permitting this update.
    */

    if (isPrimary) {
      const { error: primaryError } = await supabaseClient
        .from("parent_students")
        .update({ is_primary: false })
        .eq("student_id", studentId)
        .eq("institution_id", selectedParent.institution_id)
        .eq("is_primary", true);

      if (primaryError) throw primaryError;
    }

    const { error } = await supabaseClient
      .from("parent_students")
      .insert({
        institution_id: selectedParent.institution_id,
        parent_id: selectedParent.id,
        student_id: studentId,
        relationship: relationship,
        is_primary: isPrimary
      });

    if (error) throw error;

    showToast("Student linked successfully.");

    await loadLinks();

    renderLinkedStudents();
    onLinkClassChange();
    updateStats();
    renderParents();

  } catch (error) {
    console.error("Link student error:", error);

    showToast(
      errorMessage(
        error,
        "Could not link student. Check Supabase permissions and constraints."
      ),
      true
    );

  } finally {
    button.disabled = false;
  }
}

// =========================================================
// RENDER LINKED STUDENTS
// =========================================================

function renderLinkedStudents() {
  const target =
    byId("linkedStudentsList");

  const parentLinks = links.filter(link =>
    link.parent_id === selectedParent?.id
  );

  if (!parentLinks.length) {
    target.innerHTML = `
      <div class="empty">
        No linked students yet.
        Choose a course and class above.
      </div>
    `;
    return;
  }

  target.innerHTML = parentLinks.map(link => {
    const student = students.find(
      item => item.id === link.student_id
    );

    return `
      <div class="linkeditem">

        <div>
          <strong>
            ${escapeHtml(student?.full_name || "Student record unavailable")}

            ${
              link.is_primary
                ? '<span class="primarytag">PRIMARY</span>'
                : ""
            }
          </strong>

          <small>
            ${escapeHtml(student?.student_id || "")}
            ${student?.student_id ? " · " : ""}
            ${escapeHtml(link.relationship || "Other")}
          </small>
        </div>

        <button
          class="btn btn-danger btn-sm"
          data-unlink="${escapeHtml(link.id)}">
          <i class="fa-solid fa-link-slash"></i>
          Unlink
        </button>

      </div>
    `;
  }).join("");
}

// =========================================================
// UNLINK STUDENT
// =========================================================

async function handleLinkedAction(event) {
  const button = event.target.closest(
    "button[data-unlink]"
  );

  if (!button) return;

  const linkId = button.dataset.unlink;

  const link = links.find(
    item => item.id === linkId
  );

  if (!link) return;

  const student = students.find(
    item => item.id === link.student_id
  );

  const confirmed = confirm(
    `Unlink ${student?.full_name || "this student"} from ${selectedParent?.full_name || "this parent"}?`
  );

  if (!confirmed) return;

  try {
    const { error } = await supabaseClient
      .from("parent_students")
      .delete()
      .eq("id", linkId);

    if (error) throw error;

    showToast("Student unlinked successfully.");

    await loadLinks();

    renderLinkedStudents();
    onLinkClassChange();
    updateStats();
    renderParents();

  } catch (error) {
    console.error("Unlink student error:", error);

    showToast(
      errorMessage(
        error,
        "Could not unlink student."
      ),
      true
    );
  }
}

// =========================================================
// REFRESH
// =========================================================

async function refreshAll() {
  const button = byId("refreshBtn");

  button.disabled = true;

  try {
    await loadBaseData();
    await loadAllManagementData();

    showToast("Parent records refreshed.");

  } catch (error) {
    console.error("Refresh error:", error);

    showToast(
      errorMessage(error, "Refresh failed."),
      true
    );

  } finally {
    button.disabled = false;
  }
}

// =========================================================
// MODAL HELPERS
// =========================================================

function openModal(id) {
  byId(id).classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  byId(id).classList.remove("open");

  if (!document.querySelector(".modal.open")) {
    document.body.style.overflow = "";
  }
}

// =========================================================
// GENERAL HELPERS
// =========================================================

function byId(id) {
  return document.getElementById(id);
}

function cleanOrNull(value) {
  const result = String(value || "").trim();

  return result ? result : null;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );
}

function showToast(message, isError = false) {
  const toast = byId("toast");

  toast.textContent = message;

  toast.classList.toggle("error", isError);
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 5000);
}

function errorMessage(error, fallback) {
  const message =
    error?.message ||
    error?.details ||
    error?.hint;

  if (!message) return fallback;

  if (/row-level security|permission denied|not allowed/i.test(message)) {
    return (
      "Supabase database security (RLS) denied this action. " +
      "Check the policies for the signed-in Super Admin."
    );
  }

  return `${fallback} ${message}`;
}
