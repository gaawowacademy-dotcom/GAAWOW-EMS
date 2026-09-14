const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const { createClient } = supabase;

const db = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = null;
let institutions = [];
let departments = [];
let courses = [];

document.addEventListener("DOMContentLoaded", async () => {

  document
    .getElementById("searchInput")
    .addEventListener("input", renderCourses);

  document
    .getElementById("institutionFilter")
    .addEventListener("change", renderCourses);

  document
    .getElementById("departmentFilter")
    .addEventListener("change", renderCourses);

  document
    .getElementById("statusFilter")
    .addEventListener("change", renderCourses);

  document
    .getElementById("institutionId")
    .addEventListener("change", updateModalDepartments);

  document
    .getElementById("courseForm")
    .addEventListener("submit", saveCourse);

  await checkAccess();
});


/* =========================
   ACCESS
========================= */

async function checkAccess() {

  try {

    const {
      data: {
        user
      },
      error
    } = await db.auth.getUser();

    if (error || !user) {
      window.location.href = "index.html";
      return;
    }

    currentUser = user;

    const {
      data: profile,
      error: profileError
    } = await db
      .from("profiles")
      .select("id, full_name, role, institution_id, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      showMessage(
        "Unable to load your profile.",
        "error"
      );
      return;
    }

    if (
      profile.role !== "super_admin" ||
      profile.is_active === false
    ) {
      alert("Access denied. Super Admin only.");
      window.location.href = "super-admin.html";
      return;
    }

    await loadInstitutions();
    await loadDepartments();
    await loadCourses();

  } catch (error) {

    console.error(error);

    showMessage(
      "Unexpected error while loading Courses Management.",
      "error"
    );
  }
}


/* =========================
   INSTITUTIONS
========================= */

async function loadInstitutions() {

  const {
    data,
    error
  } = await db
    .from("institutions")
    .select("id, name")
    .order("name");

  if (error) {
    console.error(error);

    showMessage(
      "Failed to load institutions: " + error.message,
      "error"
    );

    return;
  }

  institutions = data || [];

  const filter =
    document.getElementById("institutionFilter");

  const modalSelect =
    document.getElementById("institutionId");

  filter.innerHTML =
    `<option value="">All Institutions</option>`;

  modalSelect.innerHTML =
    `<option value="">Select Institution</option>`;

  institutions.forEach(inst => {

    filter.innerHTML += `
      <option value="${inst.id}">
        ${escapeHtml(inst.name)}
      </option>
    `;

    modalSelect.innerHTML += `
      <option value="${inst.id}">
        ${escapeHtml(inst.name)}
      </option>
    `;
  });
}


/* =========================
   DEPARTMENTS
========================= */

async function loadDepartments() {

  const {
    data,
    error
  } = await db
    .from("departments")
    .select(
      "id, institution_id, name, code, is_active"
    )
    .order("name");

  if (error) {

    console.error(error);

    showMessage(
      "Failed to load departments: " + error.message,
      "error"
    );

    departments = [];
    return;
  }

  departments = data || [];

  populateDepartmentFilter();

  updateModalDepartments();

}


function populateDepartmentFilter() {

  const select =
    document.getElementById("departmentFilter");

  select.innerHTML =
    `<option value="">All Departments</option>`;

  departments.forEach(dept => {

    select.innerHTML += `
      <option value="${dept.id}">
        ${escapeHtml(dept.name)}
      </option>
    `;
  });
}


function updateModalDepartments() {

  const institutionId =
    document.getElementById("institutionId").value;

  const select =
    document.getElementById("departmentId");

  select.innerHTML =
    `<option value="">No Department</option>`;

  const filtered =
    departments.filter(dept =>
      !institutionId ||
      dept.institution_id === institutionId
    );

  filtered.forEach(dept => {

    if (dept.is_active === false) return;

    select.innerHTML += `
      <option value="${dept.id}">
        ${escapeHtml(dept.name)}
      </option>
    `;
  });
}


/* =========================
   COURSES
========================= */

async function loadCourses() {

  const tbody =
    document.getElementById("coursesTableBody");

  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="loading">
        Loading courses...
      </td>
    </tr>
  `;

  const {
    data,
    error
  } = await db
    .from("courses")
    .select(`
      id,
      institution_id,
      department_id,
      name,
      code,
      description,
      duration_months,
      fee,
      is_active,
      created_at,
      updated_at
    `)
    .order("name");

  if (error) {

    console.error(error);

    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          Failed to load courses.
        </td>
      </tr>
    `;

    showMessage(
      "Failed to load courses: " + error.message,
      "error"
    );

    return;
  }

  courses = data || [];

  updateStats();
  renderCourses();
}


/* =========================
   RENDER
========================= */

function renderCourses() {

  const tbody =
    document.getElementById("coursesTableBody");

  const search =
    document
      .getElementById("searchInput")
      .value
      .trim()
      .toLowerCase();

  const institutionId =
    document.getElementById(
      "institutionFilter"
    ).value;

  const departmentId =
    document.getElementById(
      "departmentFilter"
    ).value;

  const status =
    document.getElementById(
      "statusFilter"
    ).value;

  const filtered =
    courses.filter(course => {

      const institution =
        institutions.find(
          i => i.id === course.institution_id
        );

      const department =
        departments.find(
          d => d.id === course.department_id
        );

      const matchesSearch =
        !search ||
        course.name
          .toLowerCase()
          .includes(search) ||
        course.code
          .toLowerCase()
          .includes(search);

      const matchesInstitution =
        !institutionId ||
        course.institution_id === institutionId;

      const matchesDepartment =
        !departmentId ||
        course.department_id === departmentId;

      const matchesStatus =
        status === "" ||
        String(course.is_active) === status;

      return (
        matchesSearch &&
        matchesInstitution &&
        matchesDepartment &&
        matchesStatus
      );
    });

  if (!filtered.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          No courses found.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = filtered.map(course => {

    const institution =
      institutions.find(
        i => i.id === course.institution_id
      );

    const department =
      departments.find(
        d => d.id === course.department_id
      );

    const duration =
      course.duration_months
        ? `${course.duration_months} month(s)`
        : "—";

    const fee =
      Number(course.fee || 0)
        .toLocaleString();

    return `
      <tr>

        <td>
          <div class="course-name">
            ${escapeHtml(course.name)}
          </div>
        </td>

        <td>
          <span class="code">
            ${escapeHtml(course.code)}
          </span>
        </td>

        <td>
          ${institution
            ? escapeHtml(institution.name)
            : "—"}
        </td>

        <td>
          ${department
            ? escapeHtml(department.name)
            : "—"}
        </td>

        <td>
          ${duration}
        </td>

        <td>
          ${fee}
        </td>

        <td>
          <span class="status ${
            course.is_active
              ? "active"
              : "inactive"
          }">
            ${
              course.is_active
                ? "Active"
                : "Inactive"
            }
          </span>
        </td>

        <td>

          <div class="actions">

            <button
              class="action-btn edit-btn"
              onclick="editCourse('${course.id}')"
            >
              Edit
            </button>

            <button
              class="action-btn toggle-btn"
              onclick="toggleCourse(
                '${course.id}',
                ${course.is_active}
              )"
            >
              ${
                course.is_active
                  ? "Deactivate"
                  : "Activate"
              }
            </button>

          </div>

        </td>

      </tr>
    `;
  }).join("");
}


/* =========================
   STATS
========================= */

function updateStats() {

  const total =
    courses.length;

  const active =
    courses.filter(
      c => c.is_active
    ).length;

  const inactive =
    courses.filter(
      c => !c.is_active
    ).length;

  document.getElementById(
    "totalCourses"
  ).textContent = total;

  document.getElementById(
    "activeCourses"
  ).textContent = active;

  document.getElementById(
    "inactiveCourses"
  ).textContent = inactive;
}


/* =========================
   ADD
========================= */

function openAddModal() {

  document.getElementById(
    "courseForm"
  ).reset();

  document.getElementById(
    "courseId"
  ).value = "";

  document.getElementById(
    "modalTitle"
  ).textContent = "Add Course";

  document.getElementById(
    "isActive"
  ).value = "true";

  updateModalDepartments();

  document.getElementById(
    "courseModal"
  ).style.display = "block";
}


/* =========================
   EDIT
========================= */

function editCourse(id) {

  const course =
    courses.find(c => c.id === id);

  if (!course) {
    alert("Course not found.");
    return;
  }

  document.getElementById(
    "courseId"
  ).value = course.id;

  document.getElementById(
    "institutionId"
  ).value = course.institution_id;

  updateModalDepartments();

  document.getElementById(
    "departmentId"
  ).value =
    course.department_id || "";

  document.getElementById(
    "courseName"
  ).value = course.name || "";

  document.getElementById(
    "courseCode"
  ).value = course.code || "";

  document.getElementById(
    "durationMonths"
  ).value =
    course.duration_months || "";

  document.getElementById(
    "fee"
  ).value =
    course.fee ?? "";

  document.getElementById(
    "description"
  ).value =
    course.description || "";

  document.getElementById(
    "isActive"
  ).value =
    String(course.is_active);

  document.getElementById(
    "modalTitle"
  ).textContent = "Edit Course";

  document.getElementById(
    "courseModal"
  ).style.display = "block";
}


/* =========================
   SAVE
========================= */

async function saveCourse(event) {

  event.preventDefault();

  const id =
    document.getElementById("courseId").value;

  const institution_id =
    document.getElementById("institutionId").value;

  const department_id =
    document.getElementById("departmentId").value ||
    null;

  const name =
    document.getElementById("courseName")
      .value
      .trim();

  const code =
    document.getElementById("courseCode")
      .value
      .trim()
      .toUpperCase();

  const description =
    document.getElementById("description")
      .value
      .trim() || null;

  const durationValue =
    document.getElementById("durationMonths")
      .value;

  const duration_months =
    durationValue
      ? Number(durationValue)
      : null;

  const fee =
    Number(
      document.getElementById("fee").value
    );

  const is_active =
    document.getElementById("isActive").value === "true";


  if (!institution_id) {
    alert("Please select an institution.");
    return;
  }

  if (!name) {
    alert("Please enter course name.");
    return;
  }

  if (!code) {
    alert("Please enter course code.");
    return;
  }

  if (Number.isNaN(fee) || fee < 0) {
    alert("Please enter a valid fee.");
    return;
  }


  const payload = {
    institution_id,
    department_id,
    name,
    code,
    description,
    duration_months,
    fee,
    is_active
  };


  const saveButton =
    document.querySelector(".save-btn");

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";


  try {

    let result;

    if (id) {

      result = await db
        .from("courses")
        .update({
          ...payload,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

    } else {

      result = await db
        .from("courses")
        .insert(payload);

    }


    if (result.error) {
      throw result.error;
    }


    closeModal();

    showMessage(
      id
        ? "Course updated successfully."
        : "Course created successfully.",
      "success"
    );

    await loadCourses();

  } catch (error) {

    console.error(error);

    showMessage(
      "Failed to save course: " +
      error.message,
      "error"
    );

  } finally {

    saveButton.disabled = false;
    saveButton.textContent = "Save Course";
  }
}


/* =========================
   ACTIVATE / DEACTIVATE
========================= */

async function toggleCourse(
  id,
  currentStatus
) {

  const action =
    currentStatus
      ? "deactivate"
      : "activate";

  const confirmed =
    confirm(
      `Are you sure you want to ${action} this course?`
    );

  if (!confirmed) return;


  try {

    const {
      error
    } = await db
      .from("courses")
      .update({
        is_active: !currentStatus,
        updated_at:
          new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    showMessage(
      `Course ${action}d successfully.`,
      "success"
    );

    await loadCourses();

  } catch (error) {

    console.error(error);

    showMessage(
      "Failed to update course: " +
      error.message,
      "error"
    );
  }
}


/* =========================
   MODAL
========================= */

function closeModal() {

  document.getElementById(
    "courseModal"
  ).style.display = "none";
}


window.addEventListener(
  "click",
  function(event) {

    const modal =
      document.getElementById("courseModal");

    if (event.target === modal) {
      closeModal();
    }
  }
);


/* =========================
   MESSAGE
========================= */

function showMessage(
  message,
  type
) {

  const box =
    document.getElementById("message");

  box.textContent = message;

  box.style.display = "block";

  if (type === "success") {

    box.style.background = "#DCFCE7";
    box.style.color = "#166534";

  } else {

    box.style.background = "#FEE2E2";
    box.style.color = "#991B1B";
  }

  setTimeout(() => {
    box.style.display = "none";
  }, 5000);
}


/* =========================
   SECURITY
========================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
