const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

let currentUser = null;
let editingId = null;
let allSubjects = [];
let allCourses = [];

const institutionSelect =
  document.getElementById("institutionSelect");

const courseSelect =
  document.getElementById("courseSelect");

const subjectForm =
  document.getElementById("subjectForm");

const subjectName =
  document.getElementById("subjectName");

const subjectCode =
  document.getElementById("subjectCode");

const maxScore =
  document.getElementById("maxScore");

const statusSelect =
  document.getElementById("statusSelect");

const subjectsTable =
  document.getElementById("subjectsTable");

const searchInput =
  document.getElementById("searchInput");

const messageBox =
  document.getElementById("message");


// ================================
// START
// ================================

document.addEventListener("DOMContentLoaded", init);

async function init() {

  try {

    const {
      data: {
        session
      },
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session) {
      window.location.href = "index.html";
      return;
    }

    currentUser = session.user;

    await checkSuperAdmin();

    await loadInstitutions();

    await loadCourses();

    await loadSubjects();

    updateStats();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message || "Unable to load Subjects Management.",
      "error"
    );
  }
}


// ================================
// SUPER ADMIN CHECK
// ================================

async function checkSuperAdmin() {

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select("full_name, role, institution_id, is_active")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Profile not found.");
  }

  if (data.role !== "super_admin") {

    alert(
      "Access denied. Super Admin only."
    );

    window.location.href =
      "super-admin.html";

    return;
  }

  if (data.is_active === false) {

    alert(
      "Your account is inactive."
    );

    await supabaseClient.auth.signOut();

    window.location.href =
      "index.html";
  }
}


// ================================
// LOAD INSTITUTIONS
// ================================

async function loadInstitutions() {

  const {
    data,
    error
  } = await supabaseClient
    .from("institutions")
    .select("id, name")
    .order("name");

  if (error) {
    throw error;
  }

  institutionSelect.innerHTML =
    `<option value="">Select institution</option>`;

  (data || []).forEach(institution => {

    const option =
      document.createElement("option");

    option.value =
      institution.id;

    option.textContent =
      institution.name;

    institutionSelect.appendChild(
      option
    );
  });
}


// ================================
// LOAD COURSES
// ================================

async function loadCourses() {

  const {
    data,
    error
  } = await supabaseClient
    .from("courses")
    .select(`
      id,
      institution_id,
      name,
      code
    `)
    .order("name");

  if (error) {
    throw error;
  }

  allCourses = data || [];

  renderCourseOptions();

  document.getElementById("totalCourses")
    .textContent = allCourses.length;
}


// ================================
// COURSE FILTER
// ================================

institutionSelect.addEventListener(
  "change",
  () => {
    renderCourseOptions();
  }
);

function renderCourseOptions() {

  const institutionId =
    institutionSelect.value;

  courseSelect.innerHTML =
    `<option value="">Select course (optional)</option>`;

  const filteredCourses =
    institutionId
      ? allCourses.filter(
          course =>
            course.institution_id ===
            institutionId
        )
      : allCourses;

  filteredCourses.forEach(course => {

    const option =
      document.createElement("option");

    option.value =
      course.id;

    option.textContent =
      course.code
        ? `${course.name} (${course.code})`
        : course.name;

    courseSelect.appendChild(
      option
    );
  });
}


// ================================
// LOAD SUBJECTS
// ================================

async function loadSubjects() {

  subjectsTable.innerHTML =
    `<tr>
      <td colspan="7" class="loading">
        Loading subjects...
      </td>
    </tr>`;

  const {
    data,
    error
  } = await supabaseClient
    .from("subjects")
    .select(`
      id,
      institution_id,
      course_id,
      name,
      code,
      max_score,
      is_active,
      created_at
    `)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  allSubjects = data || [];

  renderSubjects(
    allSubjects
  );

  updateStats();
}


// ================================
// RENDER SUBJECTS
// ================================

function renderSubjects(subjects) {

  if (!subjects.length) {

    subjectsTable.innerHTML =
      `<tr>
        <td colspan="7" class="loading">
          No subjects found.
        </td>
      </tr>`;

    return;
  }

  subjectsTable.innerHTML = "";

  subjects.forEach(
    (subject, index) => {

      const course =
        allCourses.find(
          c => c.id === subject.course_id
        );

      const courseName =
        course
          ? (
              course.code
                ? `${course.name} (${course.code})`
                : course.name
            )
          : "—";

      const row =
        document.createElement("tr");

      row.innerHTML = `
        <td>${index + 1}</td>

        <td>
          <strong>
            ${escapeHtml(subject.name)}
          </strong>
        </td>

        <td>
          ${subject.code
            ? escapeHtml(subject.code)
            : "—"}
        </td>

        <td>
          ${escapeHtml(courseName)}
        </td>

        <td>
          ${Number(subject.max_score)}
        </td>

        <td>
          <span class="badge ${
            subject.is_active
              ? "active"
              : "inactive"
          }">
            ${
              subject.is_active
                ? "Active"
                : "Inactive"
            }
          </span>
        </td>

        <td>
          <div class="actions">

            <button
              class="edit"
              onclick="editSubject('${subject.id}')">
              Edit
            </button>

            <button
              class="danger"
              onclick="deleteSubject('${subject.id}')">
              Delete
            </button>

          </div>
        </td>
      `;

      subjectsTable.appendChild(row);
    }
  );
}


// ================================
// SEARCH
// ================================

searchInput.addEventListener(
  "input",
  () => {

    const query =
      searchInput.value
        .trim()
        .toLowerCase();

    if (!query) {

      renderSubjects(
        allSubjects
      );

      return;
    }

    const filtered =
      allSubjects.filter(
        subject => {

          const course =
            allCourses.find(
              c =>
                c.id ===
                subject.course_id
            );

          const courseName =
            course
              ? course.name
              : "";

          const text =
            `
              ${subject.name}
              ${subject.code || ""}
              ${courseName}
            `.toLowerCase();

          return text.includes(query);
        }
      );

    renderSubjects(filtered);
  }
);


// ================================
// SAVE / UPDATE
// ================================

subjectForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    try {

      const institutionId =
        institutionSelect.value;

      const courseId =
        courseSelect.value || null;

      const name =
        subjectName.value.trim();

      const code =
        subjectCode.value.trim() || null;

      const score =
        Number(maxScore.value);

      const isActive =
        statusSelect.value === "true";


      if (!institutionId) {

        showMessage(
          "Please select an institution.",
          "error"
        );

        return;
      }

      if (!name) {

        showMessage(
          "Subject name is required.",
          "error"
        );

        return;
      }

      if (!score || score <= 0) {

        showMessage(
          "Max Score must be greater than 0.",
          "error"
        );

        return;
      }


      const payload = {
        institution_id: institutionId,
        course_id: courseId,
        name: name,
        code: code,
        max_score: score,
        is_active: isActive,
        updated_at: new Date().toISOString()
      };


      const saveBtn =
        document.getElementById("saveBtn");

      saveBtn.disabled = true;

      saveBtn.textContent =
        editingId
          ? "Updating..."
          : "Saving...";


      if (editingId) {

        const {
          error
        } = await supabaseClient
          .from("subjects")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          throw error;
        }

        showMessage(
          "Subject updated successfully.",
          "success"
        );

      } else {

        const {
          error
        } = await supabaseClient
          .from("subjects")
          .insert([payload]);

        if (error) {
          throw error;
        }

        showMessage(
          "Subject created successfully.",
          "success"
        );
      }


      resetForm();

      await loadSubjects();

    } catch (error) {

      console.error(error);

      showMessage(
        error.message ||
        "Unable to save subject.",
        "error"
      );

    } finally {

      const saveBtn =
        document.getElementById("saveBtn");

      saveBtn.disabled = false;

      saveBtn.textContent =
        editingId
          ? "Update Subject"
          : "+ Save Subject";
    }
  }
);


// ================================
// EDIT
// ================================

window.editSubject =
async function(id) {

  const subject =
    allSubjects.find(
      item => item.id === id
    );

  if (!subject) {
    return;
  }

  editingId = id;

  document.getElementById(
    "formTitle"
  ).textContent =
    "Edit Subject";

  document.getElementById(
    "saveBtn"
  ).textContent =
    "Update Subject";


  institutionSelect.value =
    subject.institution_id;

  renderCourseOptions();

  courseSelect.value =
    subject.course_id || "";

  subjectName.value =
    subject.name || "";

  subjectCode.value =
    subject.code || "";

  maxScore.value =
    subject.max_score || 100;

  statusSelect.value =
    subject.is_active
      ? "true"
      : "false";


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};


// ================================
// DELETE
// ================================

window.deleteSubject =
async function(id) {

  const subject =
    allSubjects.find(
      item => item.id === id
    );

  if (!subject) {
    return;
  }

  const confirmed =
    confirm(
      `Delete subject "${subject.name}"?`
    );

  if (!confirmed) {
    return;
  }


  try {

    // Check whether results use this subject
    const {
      count,
      error: checkError
    } = await supabaseClient
      .from("results")
      .select(
        "id",
        {
          count: "exact",
          head: true
        }
      )
      .eq("subject_id", id);

    if (checkError) {
      throw checkError;
    }

    if (count && count > 0) {

      showMessage(
        "This subject cannot be deleted because results already exist for it. Set it to Inactive instead.",
        "error"
      );

      return;
    }


    const {
      error
    } = await supabaseClient
      .from("subjects")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    showMessage(
      "Subject deleted successfully.",
      "success"
    );

    await loadSubjects();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "Unable to delete subject.",
      "error"
    );
  }
};


// ================================
// RESET
// ================================

window.resetForm =
function() {

  editingId = null;

  subjectForm.reset();

  maxScore.value = 100;

  statusSelect.value = "true";

  courseSelect.innerHTML =
    `<option value="">
      Select course (optional)
    </option>`;

  document.getElementById(
    "formTitle"
  ).textContent =
    "Add New Subject";

  document.getElementById(
    "saveBtn"
  ).textContent =
    "+ Save Subject";

  institutionSelect.value = "";

  searchInput.value = "";

  renderSubjects(
    allSubjects
  );
};


// ================================
// STATS
// ================================

function updateStats() {

  const total =
    allSubjects.length;

  const active =
    allSubjects.filter(
      s => s.is_active
    ).length;

  const inactive =
    allSubjects.filter(
      s => !s.is_active
    ).length;

  document.getElementById(
    "totalSubjects"
  ).textContent = total;

  document.getElementById(
    "activeSubjects"
  ).textContent = active;

  document.getElementById(
    "inactiveSubjects"
  ).textContent = inactive;

  document.getElementById(
    "totalCourses"
  ).textContent =
    allCourses.length;
}


// ================================
// MESSAGE
// ================================

function showMessage(
  message,
  type
) {

  messageBox.textContent =
    message;

  messageBox.className =
    `message ${type}`;

  messageBox.style.display =
    "block";

  setTimeout(() => {

    messageBox.style.display =
      "none";

  }, 5000);
}


// ================================
// HTML ESCAPE
// ================================

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ================================
// DASHBOARD
// ================================

window.goDashboard =
function() {

  window.location.href =
    "super-admin.html";
};
