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
let currentProfile = null;

let institutions = [];
let courses = [];
let classes = [];
let exams = [];

let editingExamId = null;

/* =========================
   DOM
========================= */

const institutionSelect =
  document.getElementById("institutionSelect");

const courseSelect =
  document.getElementById("courseSelect");

const classSelect =
  document.getElementById("classSelect");

const examTitle =
  document.getElementById("examTitle");

const examType =
  document.getElementById("examType");

const examDate =
  document.getElementById("examDate");

const maxScore =
  document.getElementById("maxScore");

const duration =
  document.getElementById("duration");

const description =
  document.getElementById("description");

const saveBtn =
  document.getElementById("saveBtn");

const resetBtn =
  document.getElementById("resetBtn");

const examBody =
  document.getElementById("examBody");

const searchInput =
  document.getElementById("searchInput");

const filterType =
  document.getElementById("filterType");

const formTitle =
  document.getElementById("formTitle");

const examPanel =
  document.getElementById("examPanel");

/* =========================
   INIT
========================= */

document.addEventListener(
  "DOMContentLoaded",
  init
);

async function init() {

  try {

    const {
      data: { session },
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) throw error;

    if (!session) {
      window.location.href =
        "index.html";
      return;
    }

    currentUser =
      session.user;

    await loadProfile();

    if (
      !currentProfile ||
      currentProfile.role !==
      "super_admin"
    ) {

      alert(
        "Access denied. Super Admin only."
      );

      window.location.href =
        "index.html";

      return;
    }

    await loadInstitutions();

    await loadAllExams();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "Failed to initialize Exams.",
      "error"
    );
  }
}

/* =========================
   PROFILE
========================= */

async function loadProfile() {

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        institution_id
      `)
      .eq("id", currentUser.id)
      .single();

  if (error) throw error;

  currentProfile = data;
}

/* =========================
   INSTITUTIONS
========================= */

async function loadInstitutions() {

  const { data, error } =
    await supabaseClient
      .from("institutions")
      .select(`
        id,
        name
      `)
      .order("name");

  if (error) throw error;

  institutions =
    data || [];

  institutionSelect.innerHTML =
    `<option value="">
      Select Institution
    </option>` +
    institutions
      .map(
        institution => `
          <option value="${institution.id}">
            ${escapeHtml(
              institution.name
            )}
          </option>
        `
      )
      .join("");
}

/* =========================
   COURSE CHANGE
========================= */

institutionSelect.addEventListener(
  "change",
  async () => {

    const institutionId =
      institutionSelect.value;

    clearSelect(
      courseSelect,
      "Select Course"
    );

    clearSelect(
      classSelect,
      "Select Class"
    );

    if (!institutionId) return;

    await loadCourses(
      institutionId
    );
  }
);

/* =========================
   COURSES
========================= */

async function loadCourses(
  institutionId
) {

  const { data, error } =
    await supabaseClient
      .from("courses")
      .select(`
        id,
        name,
        code
      `)
      .eq(
        "institution_id",
        institutionId
      )
      .eq(
        "is_active",
        true
      )
      .order("name");

  if (error) {

    console.error(error);

    showMessage(
      "Failed to load courses.",
      "error"
    );

    return;
  }

  courses =
    data || [];

  courseSelect.innerHTML =
    `<option value="">
      Select Course
    </option>` +
    courses
      .map(
        course => `
          <option value="${course.id}">
            ${escapeHtml(
              course.name
            )}
            ${
              course.code
                ? ` (${escapeHtml(
                    course.code
                  )})`
                : ""
            }
          </option>
        `
      )
      .join("");
}

/* =========================
   COURSE CHANGE
========================= */

courseSelect.addEventListener(
  "change",
  async () => {

    const institutionId =
      institutionSelect.value;

    const courseId =
      courseSelect.value;

    clearSelect(
      classSelect,
      "Select Class"
    );

    if (
      !institutionId ||
      !courseId
    ) return;

    await loadClasses(
      institutionId,
      courseId
    );
  }
);

/* =========================
   CLASSES
========================= */

async function loadClasses(
  institutionId,
  courseId
) {

  const { data, error } =
    await supabaseClient
      .from("classes")
      .select(`
        id,
        name,
        code,
        academic_year,
        room
      `)
      .eq(
        "institution_id",
        institutionId
      )
      .eq(
        "course_id",
        courseId
      )
      .eq(
        "is_active",
        true
      )
      .order("name");

  if (error) {

    console.error(error);

    showMessage(
      "Failed to load classes.",
      "error"
    );

    return;
  }

  classes =
    data || [];

  classSelect.innerHTML =
    `<option value="">
      Select Class
    </option>` +
    classes
      .map(
        item => `
          <option value="${item.id}">
            ${escapeHtml(
              item.name
            )}
            ${
              item.code
                ? ` (${escapeHtml(
                    item.code
                  )})`
                : ""
            }
            ${
              item.academic_year
                ? ` - ${escapeHtml(
                    item.academic_year
                  )}`
                : ""
            }
          </option>
        `
      )
      .join("");
}

/* =========================
   SAVE
========================= */

saveBtn.addEventListener(
  "click",
  saveExam
);

async function saveExam() {

  const institutionId =
    institutionSelect.value;

  const courseId =
    courseSelect.value;

  const classId =
    classSelect.value || null;

  const title =
    examTitle.value.trim();

  const type =
    examType.value;

  const date =
    examDate.value || null;

  const score =
    Number(maxScore.value);

  const durationValue =
    duration.value
      ? Number(duration.value)
      : null;

  const desc =
    description.value.trim() ||
    null;

  /* VALIDATION */

  if (!institutionId) {
    showMessage(
      "Please select an institution.",
      "error"
    );
    return;
  }

  if (!courseId) {
    showMessage(
      "Please select a course.",
      "error"
    );
    return;
  }

  if (!title) {
    showMessage(
      "Please enter exam title.",
      "error"
    );
    return;
  }

  if (!type) {
    showMessage(
      "Please select exam type.",
      "error"
    );
    return;
  }

  if (
    !maxScore.value ||
    score <= 0
  ) {
    showMessage(
      "Maximum score must be greater than 0.",
      "error"
    );
    return;
  }

  if (
    durationValue !== null &&
    durationValue <= 0
  ) {
    showMessage(
      "Duration must be greater than 0.",
      "error"
    );
    return;
  }

  const payload = {

    institution_id:
      institutionId,

    course_id:
      courseId,

    class_id:
      classId,

    title:
      title,

    exam_type:
      type,

    exam_date:
      date,

    max_score:
      score,

    duration_minutes:
      durationValue,

    description:
      desc
  };

  saveBtn.disabled = true;

  saveBtn.textContent =
    editingExamId
      ? "Updating..."
      : "Creating...";

  try {

    if (editingExamId) {

      const { error } =
        await supabaseClient
          .from("exams")
          .update({
            ...payload,
            updated_at:
              new Date().toISOString()
          })
          .eq(
            "id",
            editingExamId
          );

      if (error) throw error;

      showMessage(
        "Exam updated successfully.",
        "success"
      );

    } else {

      const { error } =
        await supabaseClient
          .from("exams")
          .insert({
            ...payload,
            created_by:
              currentUser.id
          });

      if (error) throw error;

      showMessage(
        "Exam created successfully.",
        "success"
      );
    }

    resetForm();

    await loadAllExams();

  } catch (error) {

    console.error(
      "Save exam error:",
      error
    );

    showMessage(
      error.message ||
      "Failed to save exam.",
      "error"
    );

  } finally {

    saveBtn.disabled =
      false;

    saveBtn.textContent =
      editingExamId
        ? "Update Exam"
        : "Create Exam";
  }
}

/* =========================
   LOAD EXAMS
========================= */

async function loadAllExams() {

  examBody.innerHTML = `
    <tr>
      <td colspan="8" class="loading">
        Loading exams...
      </td>
    </tr>
  `;

  const { data, error } =
    await supabaseClient
      .from("exams")
      .select(`
        id,
        institution_id,
        course_id,
        class_id,
        title,
        exam_type,
        exam_date,
        max_score,
        duration_minutes,
        description,
        created_by,
        created_at,
        updated_at
      `)
      .order(
        "exam_date",
        {
          ascending: false
        }
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {

    console.error(error);

    examBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          Failed to load exams.
        </td>
      </tr>
    `;

    showMessage(
      "Failed to load exams.",
      "error"
    );

    return;
  }

  exams =
    data || [];

  renderExams();
  updateStats();
}

/* =========================
   RENDER
========================= */

function renderExams() {

  const search =
    searchInput.value
      .trim()
      .toLowerCase();

  const type =
    filterType.value;

  const filtered =
    exams.filter(exam => {

      const matchesSearch =
        !search ||
        exam.title
          .toLowerCase()
          .includes(search);

      const matchesType =
        !type ||
        exam.exam_type === type;

      return (
        matchesSearch &&
        matchesType
      );
    });

  if (!filtered.length) {

    examBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          No exams found.
        </td>
      </tr>
    `;

    return;
  }

  examBody.innerHTML =
    filtered
      .map(
        exam => {

          const institution =
            institutions.find(
              item =>
                item.id ===
                exam.institution_id
            );

          const course =
            courses.find(
              item =>
                item.id ===
                exam.course_id
            );

          const classItem =
            classes.find(
              item =>
                item.id ===
                exam.class_id
            );

          return `
            <tr>

              <td>
                <strong>
                  ${escapeHtml(
                    exam.title
                  )}
                </strong>

                ${
                  exam.duration_minutes
                    ? `
                      <div style="
                        font-size:11px;
                        color:#6b7280;
                        margin-top:4px;
                      ">
                        ${exam.duration_minutes}
                        minutes
                      </div>
                    `
                    : ""
                }
              </td>

              <td>
                ${
                  institution
                    ? escapeHtml(
                        institution.name
                      )
                    : "-"
                }
              </td>

              <td>
                ${
                  course
                    ? escapeHtml(
                        course.name
                      )
                    : "-"
                }
              </td>

              <td>
                ${
                  classItem
                    ? escapeHtml(
                        classItem.name
                      )
                    : "-"
                }
              </td>

              <td>
                <span class="badge">
                  ${escapeHtml(
                    exam.exam_type
                  )}
                </span>
              </td>

              <td>
                ${formatDate(
                  exam.exam_date
                )}
              </td>

              <td>
                <strong>
                  ${Number(
                    exam.max_score
                  )}
                </strong>
              </td>

              <td>

                <div class="row-actions">

                  <button
                    class="gold small-btn"
                    onclick="editExam('${exam.id}')"
                  >
                    Edit
                  </button>

                  <button
                    class="danger small-btn"
                    onclick="deleteExam('${exam.id}')"
                  >
                    Delete
                  </button>

                </div>

              </td>

            </tr>
          `;
        }
      )
      .join("");
}

/* =========================
   SEARCH / FILTER
========================= */

searchInput.addEventListener(
  "input",
  renderExams
);

filterType.addEventListener(
  "change",
  renderExams
);

/* =========================
   EDIT
========================= */

async function editExam(id) {

  const exam =
    exams.find(
      item =>
        item.id === id
    );

  if (!exam) return;

  editingExamId =
    exam.id;

  institutionSelect.value =
    exam.institution_id;

  await loadCourses(
    exam.institution_id
  );

  courseSelect.value =
    exam.course_id;

  await loadClasses(
    exam.institution_id,
    exam.course_id
  );

  classSelect.value =
    exam.class_id || "";

  examTitle.value =
    exam.title || "";

  examType.value =
    exam.exam_type || "";

  examDate.value =
    exam.exam_date || "";

  maxScore.value =
    exam.max_score || "";

  duration.value =
    exam.duration_minutes || "";

  description.value =
    exam.description || "";

  formTitle.textContent =
    "Edit Exam";

  saveBtn.textContent =
    "Update Exam";

  examPanel.classList.add(
    "edit-mode"
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================
   DELETE
========================= */

async function deleteExam(id) {

  const exam =
    exams.find(
      item =>
        item.id === id
    );

  if (!exam) return;

  const confirmed =
    confirm(
      `Delete "${exam.title}"?\n\n` +
      `This action cannot be undone.`
    );

  if (!confirmed) return;

  try {

    /*
      First check whether
      results/grades already
      reference this exam.
    */

    const { count: resultsCount,
      error: resultsCheckError } =
      await supabaseClient
        .from("results")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "exam_id",
          id
        );

    if (resultsCheckError) {
      throw resultsCheckError;
    }

    const { count: gradesCount,
      error: gradesCheckError } =
      await supabaseClient
        .from("grades")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "exam_id",
          id
        );

    if (gradesCheckError) {
      throw gradesCheckError;
    }

    if (
      (resultsCount || 0) > 0 ||
      (gradesCount || 0) > 0
    ) {

      showMessage(
        "This exam has results/grades. Delete those records first.",
        "error"
      );

      return;
    }

    const { error } =
      await supabaseClient
        .from("exams")
        .delete()
        .eq(
          "id",
          id
        );

    if (error) throw error;

    showMessage(
      "Exam deleted successfully.",
      "success"
    );

    await loadAllExams();

  } catch (error) {

    console.error(
      "Delete exam error:",
      error
    );

    showMessage(
      error.message ||
      "Failed to delete exam.",
      "error"
    );
  }
}

/* =========================
   RESET FORM
========================= */

resetBtn.addEventListener(
  "click",
  resetForm
);

function resetForm() {

  editingExamId =
    null;

  institutionSelect.value =
    "";

  clearSelect(
    courseSelect,
    "Select Course"
  );

  clearSelect(
    classSelect,
    "Select Class"
  );

  examTitle.value =
    "";

  examType.value =
    "";

  examDate.value =
    "";

  maxScore.value =
    "";

  duration.value =
    "";

  description.value =
    "";

  formTitle.textContent =
    "Create New Exam";

  saveBtn.textContent =
    "Create Exam";

  examPanel.classList.remove(
    "edit-mode"
  );
}

/* =========================
   STATS
========================= */

function updateStats() {

  const total =
    exams.length;

  const quizzes =
    exams.filter(
      e => e.exam_type === "quiz"
    ).length;

  const midterms =
    exams.filter(
      e => e.exam_type === "midterm"
    ).length;

  const finals =
    exams.filter(
      e => e.exam_type === "final"
    ).length;

  document.getElementById(
    "totalCount"
  ).textContent = total;

  document.getElementById(
    "quizCount"
  ).textContent = quizzes;

  document.getElementById(
    "midtermCount"
  ).textContent = midterms;

  document.getElementById(
    "finalCount"
  ).textContent = finals;
}

/* =========================
   HELPERS
========================= */

function clearSelect(
  select,
  placeholder
) {

  select.innerHTML =
    `<option value="">
      ${placeholder}
    </option>`;

  select.value =
    "";
}

function formatDate(value) {

  if (!value) return "-";

  const date =
    new Date(
      value + "T00:00:00"
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

/* =========================
   MESSAGE
========================= */

function showMessage(
  message,
  type = "info"
) {

  const box =
    document.getElementById(
      "messageBox"
    );

  box.className =
    `message ${type}`;

  box.textContent =
    message;

  box.style.display =
    "block";

  clearTimeout(
    window.messageTimer
  );

  window.messageTimer =
    setTimeout(
      () => {
        box.style.display =
          "none";
      },
      4500
    );
}
