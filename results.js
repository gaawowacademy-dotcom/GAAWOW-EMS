const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const { createClient } =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

let currentUser = null;
let currentProfile = null;

let students = [];
let existingResults = [];

let selectedInstitution = "";
let selectedCourse = "";
let selectedClass = "";
let selectedExam = "";
let selectedSubject = "";

const institutionSelect =
  document.getElementById("institutionSelect");

const courseSelect =
  document.getElementById("courseSelect");

const classSelect =
  document.getElementById("classSelect");

const examSelect =
  document.getElementById("examSelect");

const subjectSelect =
  document.getElementById("subjectSelect");

const studentSearch =
  document.getElementById("studentSearch");

const tableSearch =
  document.getElementById("tableSearch");

const resultsBody =
  document.getElementById("resultsBody");

const saveBtn =
  document.getElementById("saveBtn");

const resetBtn =
  document.getElementById("resetBtn");

const messageBox =
  document.getElementById("message");

const examInfo =
  document.getElementById("examInfo");

const statusText =
  document.getElementById("statusText");


// --------------------------------------------------
// INIT
// --------------------------------------------------

document.addEventListener("DOMContentLoaded", init);

async function init() {

  try {

    const {
      data: {
        user
      },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      window.location.href = "index.html";
      return;
    }

    currentUser = user;

    const {
      data: profile,
      error: profileError
    } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        institution_id,
        is_active
      `)
      .eq("id", currentUser.id)
      .single();

    if (profileError || !profile) {
      showMessage(
        "User profile not found.",
        "error"
      );
      return;
    }

    currentProfile = profile;

    if (profile.role !== "super_admin") {

      showMessage(
        "Access denied. Only Super Admin can manage results.",
        "error"
      );

      saveBtn.disabled = true;
      return;
    }

    await loadInstitutions();

  } catch (error) {

    console.error(error);

    showMessage(
      "System error: " + error.message,
      "error"
    );
  }
}


// --------------------------------------------------
// INSTITUTIONS
// --------------------------------------------------

async function loadInstitutions() {

  const {
    data,
    error
  } = await supabase
    .from("institutions")
    .select("id,name")
    .order("name");

  if (error) {
    showMessage(
      "Could not load institutions: " +
      error.message,
      "error"
    );
    return;
  }

  institutionSelect.innerHTML =
    `<option value="">Select institution</option>`;

  (data || []).forEach(inst => {

    const option =
      document.createElement("option");

    option.value = inst.id;
    option.textContent = inst.name;

    institutionSelect.appendChild(option);
  });
}


// --------------------------------------------------
// COURSES
// --------------------------------------------------

async function loadCourses() {

  resetSelect(
    courseSelect,
    "Select course"
  );

  resetSelect(
    classSelect,
    "Select class"
  );

  resetSelect(
    examSelect,
    "Select exam"
  );

  resetSelect(
    subjectSelect,
    "Select subject"
  );

  students = [];
  existingResults = [];

  clearResultsTable();

  if (!selectedInstitution) {
    courseSelect.disabled = true;
    return;
  }

  const {
    data,
    error
  } = await supabase
    .from("courses")
    .select(`
      id,
      name,
      code,
      department_id
    `)
    .eq(
      "institution_id",
      selectedInstitution
    )
    .eq(
      "is_active",
      true
    )
    .order("name");

  if (error) {

    showMessage(
      "Could not load courses: " +
      error.message,
      "error"
    );

    return;
  }

  data.forEach(course => {

    const option =
      document.createElement("option");

    option.value = course.id;

    option.textContent =
      course.code
        ? `${course.name} (${course.code})`
        : course.name;

    courseSelect.appendChild(option);
  });

  courseSelect.disabled = false;
}


// --------------------------------------------------
// CLASSES
// --------------------------------------------------

async function loadClasses() {

  resetSelect(
    classSelect,
    "Select class"
  );

  resetSelect(
    examSelect,
    "Select exam"
  );

  resetSelect(
    subjectSelect,
    "Select subject"
  );

  clearResultsTable();

  if (!selectedCourse) {

    classSelect.disabled = true;
    return;
  }

  const {
    data,
    error
  } = await supabase
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
      selectedInstitution
    )
    .eq(
      "course_id",
      selectedCourse
    )
    .eq(
      "is_active",
      true
    )
    .order("name");

  if (error) {

    showMessage(
      "Could not load classes: " +
      error.message,
      "error"
    );

    return;
  }

  data.forEach(item => {

    const option =
      document.createElement("option");

    option.value = item.id;

    let text = item.name;

    if (item.code) {
      text += ` (${item.code})`;
    }

    if (item.academic_year) {
      text += ` — ${item.academic_year}`;
    }

    option.textContent = text;

    classSelect.appendChild(option);
  });

  classSelect.disabled = false;
}


// --------------------------------------------------
// EXAMS
// --------------------------------------------------

async function loadExams() {

  resetSelect(
    examSelect,
    "Select exam"
  );

  resetSelect(
    subjectSelect,
    "Select subject"
  );

  clearResultsTable();

  if (!selectedClass) {

    examSelect.disabled = true;
    return;
  }

  const {
    data,
    error
  } = await supabase
    .from("exams")
    .select(`
      id,
      title,
      exam_type,
      exam_date,
      max_score,
      duration_minutes,
      description
    `)
    .eq(
      "institution_id",
      selectedInstitution
    )
    .eq(
      "course_id",
      selectedCourse
    )
    .eq(
      "class_id",
      selectedClass
    )
    .order(
      "exam_date",
      {
        ascending: false
      }
    );

  if (error) {

    showMessage(
      "Could not load exams: " +
      error.message,
      "error"
    );

    return;
  }

  data.forEach(exam => {

    const option =
      document.createElement("option");

    option.value = exam.id;

    option.textContent =
      `${exam.title} — ${formatExamType(exam.exam_type)}`;

    examSelect.appendChild(option);
  });

  examSelect.disabled = false;
}


// --------------------------------------------------
// SUBJECTS
// --------------------------------------------------

async function loadSubjects() {

  resetSelect(
    subjectSelect,
    "Select subject"
  );

  clearResultsTable();

  if (!selectedCourse) {

    subjectSelect.disabled = true;
    return;
  }

  const {
    data,
    error
  } = await supabase
    .from("subjects")
    .select(`
      id,
      name,
      code,
      max_score
    `)
    .eq(
      "institution_id",
      selectedInstitution
    )
    .eq(
      "course_id",
      selectedCourse
    )
    .eq(
      "is_active",
      true
    )
    .order("name");

  if (error) {

    showMessage(
      "Could not load subjects: " +
      error.message,
      "error"
    );

    return;
  }

  data.forEach(subject => {

    const option =
      document.createElement("option");

    option.value = subject.id;

    option.textContent =
      subject.code
        ? `${subject.name} (${subject.code}) — Max ${subject.max_score}`
        : `${subject.name} — Max ${subject.max_score}`;

    option.dataset.maxScore =
      subject.max_score;

    subjectSelect.appendChild(option);
  });

  subjectSelect.disabled = false;
}


// --------------------------------------------------
// STUDENTS
// --------------------------------------------------

async function loadStudentsAndResults() {

  clearResultsTable();

  if (
    !selectedClass ||
    !selectedExam ||
    !selectedSubject
  ) {
    return;
  }

  statusText.textContent =
    "Loading enrolled students...";

  const {
    data: enrollments,
    error: enrollmentError
  } = await supabase
    .from("enrollments")
    .select(`
      student_id
    `)
    .eq(
      "institution_id",
      selectedInstitution
    )
    .eq(
      "class_id",
      selectedClass
    )
    .eq(
      "status",
      "active"
    );

  if (enrollmentError) {

    showMessage(
      "Could not load enrollments: " +
      enrollmentError.message,
      "error"
    );

    return;
  }

  const studentIds =
    [...new Set(
      (enrollments || [])
        .map(row => row.student_id)
        .filter(Boolean)
    )];

  if (!studentIds.length) {

    students = [];

    updateStats();

    resultsBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty">
          No active students are enrolled in this class.
        </td>
      </tr>
    `;

    statusText.textContent =
      "No active students found.";

    saveBtn.disabled = true;

    return;
  }

  const {
    data: studentData,
    error: studentError
  } = await supabase
    .from("students")
    .select(`
      id,
      student_id,
      full_name,
      gender,
      status
    `)
    .in(
      "id",
      studentIds
    )
    .eq(
      "institution_id",
      selectedInstitution
    )
    .order("full_name");

  if (studentError) {

    showMessage(
      "Could not load students: " +
      studentError.message,
      "error"
    );

    return;
  }

  students = studentData || [];

  const {
    data: resultsData,
    error: resultsError
  } = await supabase
    .from("results")
    .select(`
      id,
      student_id,
      score,
      max_score,
      percentage,
      grade,
      remarks,
      is_published
    `)
    .eq(
      "institution_id",
      selectedInstitution
    )
    .eq(
      "exam_id",
      selectedExam
    )
    .eq(
      "subject_id",
      selectedSubject
    );

  if (resultsError) {

    showMessage(
      "Could not load existing results: " +
      resultsError.message,
      "error"
    );

    return;
  }

  existingResults =
    resultsData || [];

  renderResultsTable();

  updateStats();

  saveBtn.disabled =
    students.length === 0;

  statusText.textContent =
    `${students.length} active student(s) loaded.`;

  await showExamInfo();
}


// --------------------------------------------------
// RENDER TABLE
// --------------------------------------------------

function renderResultsTable() {

  const search =
    (
      tableSearch.value ||
      studentSearch.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const filtered =
    students.filter(student => {

      const name =
        (student.full_name || "")
          .toLowerCase();

      const id =
        (student.student_id || "")
          .toLowerCase();

      return (
        !search ||
        name.includes(search) ||
        id.includes(search)
      );
    });

  if (!filtered.length) {

    resultsBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty">
          No matching students found.
        </td>
      </tr>
    `;

    return;
  }

  resultsBody.innerHTML = "";

  filtered.forEach(
    (student, index) => {

      const existing =
        existingResults.find(
          result =>
            result.student_id === student.id
        );

      const score =
        existing &&
        existing.score !== null
          ? existing.score
          : "";

      const maxScore =
        existing &&
        existing.max_score !== null
          ? existing.max_score
          : getSelectedSubjectMaxScore();

      const percentage =
        existing &&
        existing.percentage !== null
          ? Number(existing.percentage)
          : calculatePercentage(
              score,
              maxScore
            );

      const grade =
        existing &&
        existing.grade
          ? existing.grade
          : calculateGrade(percentage);

      const remarks =
        existing &&
        existing.remarks
          ? existing.remarks
          : "";

      const published =
        existing &&
        existing.is_published === true;

      const tr =
        document.createElement("tr");

      tr.dataset.studentId =
        student.id;

      tr.dataset.resultId =
        existing?.id || "";

      tr.innerHTML = `

        <td>
          ${index + 1}
        </td>

        <td>
          <div class="student-name">
            ${escapeHtml(
              student.full_name || "Unnamed"
            )}
          </div>

          <div class="student-id">
            ${escapeHtml(
              student.student_id || ""
            )}
          </div>
        </td>

        <td>
          <input
            class="score-input score"
            type="number"
            min="0"
            step="0.01"
            value="${score}"
            data-field="score"
            placeholder="Score"
          >
        </td>

        <td>
          <input
            class="score-input max-score"
            type="number"
            min="0"
            step="0.01"
            value="${maxScore}"
            data-field="max_score"
          >
        </td>

        <td>
          <span class="percentage">
            ${formatPercentage(percentage)}
          </span>
        </td>

        <td>
          <span class="grade">
            ${grade || "—"}
          </span>
        </td>

        <td>
          <input
            type="text"
            class="remarks"
            value="${escapeAttribute(remarks)}"
            placeholder="Remarks..."
          >
        </td>

        <td style="text-align:center;">
          <input
            type="checkbox"
            class="published"
            ${published ? "checked" : ""}
          >
        </td>

        <td>
          <button
            class="danger delete-result"
            ${existing ? "" : "disabled"}
          >
            Delete
          </button>
        </td>
      `;

      resultsBody.appendChild(tr);
    }
  );

  attachRowEvents();
}


// --------------------------------------------------
// ROW EVENTS
// --------------------------------------------------

function attachRowEvents() {

  document
    .querySelectorAll(".score, .max-score")
    .forEach(input => {

      input.addEventListener(
        "input",
        function () {

          const row =
            this.closest("tr");

          updateRowCalculation(row);

          updateStats();
        }
      );
    });

  document
    .querySelectorAll(".delete-result")
    .forEach(button => {

      button.addEventListener(
        "click",
        async function () {

          const row =
            this.closest("tr");

          const resultId =
            row.dataset.resultId;

          if (!resultId) return;

          const confirmed =
            confirm(
              "Delete this student's result?"
            );

          if (!confirmed) return;

          await deleteResult(
            resultId,
            row.dataset.studentId
          );
        }
      );
    });
}


// --------------------------------------------------
// CALCULATE ROW
// --------------------------------------------------

function updateRowCalculation(row) {

  const scoreInput =
    row.querySelector(".score");

  const maxInput =
    row.querySelector(".max-score");

  const percentageEl =
    row.querySelector(".percentage");

  const gradeEl =
    row.querySelector(".grade");

  const score =
    parseFloat(scoreInput.value);

  const maxScore =
    parseFloat(maxInput.value);

  const percentage =
    calculatePercentage(
      score,
      maxScore
    );

  const grade =
    calculateGrade(percentage);

  percentageEl.textContent =
    formatPercentage(percentage);

  gradeEl.textContent =
    grade || "—";
}


// --------------------------------------------------
// SAVE ALL RESULTS
// --------------------------------------------------

async function saveResults() {

  if (
    !selectedInstitution ||
    !selectedExam ||
    !selectedSubject
  ) {

    showMessage(
      "Please select institution, exam and subject first.",
      "error"
    );

    return;
  }

  if (!students.length) {

    showMessage(
      "No students available.",
      "error"
    );

    return;
  }

  saveBtn.disabled = true;

  saveBtn.textContent =
    "Saving...";

  try {

    const rows =
      Array.from(
        resultsBody.querySelectorAll("tr[data-student-id]")
      );

    for (const row of rows) {

      const studentId =
        row.dataset.studentId;

      const scoreInput =
        row.querySelector(".score");

      const maxInput =
        row.querySelector(".max-score");

      const remarksInput =
        row.querySelector(".remarks");

      const publishedInput =
        row.querySelector(".published");

      const score =
        parseFloat(
          scoreInput.value
        );

      const maxScore =
        parseFloat(
          maxInput.value
        );

      const remarks =
        remarksInput.value.trim();

      const isPublished =
        publishedInput.checked;

      // Skip completely empty rows
      if (
        isNaN(score) &&
        !remarks &&
        !isPublished
      ) {
        continue;
      }

      if (
        isNaN(score) ||
        isNaN(maxScore) ||
        maxScore <= 0
      ) {

        throw new Error(
          "Invalid score or max score for one of the students."
        );
      }

      if (score < 0) {

        throw new Error(
          "Score cannot be negative."
        );
      }

      if (score > maxScore) {

        throw new Error(
          `Score cannot be greater than max score. Student ID: ${getStudentId(studentId)}`
        );
      }

      const percentage =
        Number(
          (
            (score / maxScore) *
            100
          ).toFixed(2)
        );

      const grade =
        calculateGrade(percentage);

      const existing =
        existingResults.find(
          result =>
            result.student_id === studentId
        );

      const payload = {

        institution_id:
          selectedInstitution,

        student_id:
          studentId,

        exam_id:
          selectedExam,

        subject_id:
          selectedSubject,

        score:
          score,

        max_score:
          maxScore,

        percentage:
          percentage,

        grade:
          grade,

        remarks:
          remarks || null,

        is_published:
          isPublished,

        created_by:
          currentUser.id,

        updated_at:
          new Date().toISOString()
      };

      let response;

      if (existing) {

        response =
          await supabase
            .from("results")
            .update({
              score:
                payload.score,

              max_score:
                payload.max_score,

              percentage:
                payload.percentage,

              grade:
                payload.grade,

              remarks:
                payload.remarks,

              is_published:
                payload.is_published,

              updated_at:
                payload.updated_at
            })
            .eq(
              "id",
              existing.id
            );

      } else {

        response =
          await supabase
            .from("results")
            .insert({
              institution_id:
                payload.institution_id,

              student_id:
                payload.student_id,

              exam_id:
                payload.exam_id,

              subject_id:
                payload.subject_id,

              score:
                payload.score,

              max_score:
                payload.max_score,

              percentage:
                payload.percentage,

              grade:
                payload.grade,

              remarks:
                payload.remarks,

              is_published:
                payload.is_published,

              created_by:
                payload.created_by
            });
      }

      if (response.error) {
        throw response.error;
      }
    }

    showMessage(
      "Results saved successfully.",
      "success"
    );

    await loadStudentsAndResults();

  } catch (error) {

    console.error(error);

    showMessage(
      "Could not save results: " +
      error.message,
      "error"
    );

  } finally {

    saveBtn.disabled =
      students.length === 0;

    saveBtn.textContent =
      "Save Results";
  }
}


// --------------------------------------------------
// DELETE RESULT
// --------------------------------------------------

async function deleteResult(
  resultId,
  studentId
) {

  try {

    const {
      error
    } = await supabase
      .from("results")
      .delete()
      .eq(
        "id",
        resultId
      );

    if (error) {
      throw error;
    }

    existingResults =
      existingResults.filter(
        result =>
          result.id !== resultId
      );

    renderResultsTable();

    updateStats();

    showMessage(
      `Result deleted for ${getStudentName(studentId)}.`,
      "success"
    );

  } catch (error) {

    console.error(error);

    showMessage(
      "Could not delete result: " +
      error.message,
      "error"
    );
  }
}


// --------------------------------------------------
// EXAM INFO
// --------------------------------------------------

async function showExamInfo() {

  if (!selectedExam) {

    examInfo.style.display =
      "none";

    return;
  }

  const {
    data,
    error
  } = await supabase
    .from("exams")
    .select(`
      title,
      exam_type,
      exam_date,
      max_score,
      duration_minutes,
      description
    `)
    .eq(
      "id",
      selectedExam
    )
    .single();

  if (error || !data) {
    return;
  }

  examInfo.innerHTML = `
    <strong>${escapeHtml(data.title)}</strong>
    &nbsp; • &nbsp;
    ${formatExamType(data.exam_type)}
    ${data.exam_date
      ? `&nbsp; • &nbsp; ${data.exam_date}`
      : ""}
    ${data.max_score !== null
      ? `&nbsp; • &nbsp; Exam Max Score: ${data.max_score}`
      : ""}
    ${data.duration_minutes
      ? `&nbsp; • &nbsp; ${data.duration_minutes} minutes`
      : ""}
  `;

  examInfo.style.display =
    "block";
}


// --------------------------------------------------
// STATS
// --------------------------------------------------

function updateStats() {

  document.getElementById(
    "totalStudents"
  ).textContent =
    students.length;

  const rows =
    Array.from(
      resultsBody.querySelectorAll(
        "tr[data-student-id]"
      )
    );

  let entered = 0;
  let published = 0;
  let passed = 0;
  let percentageTotal = 0;
  let percentageCount = 0;

  rows.forEach(row => {

    const score =
      parseFloat(
        row.querySelector(".score")?.value
      );

    const maxScore =
      parseFloat(
        row.querySelector(".max-score")?.value
      );

    if (
      !isNaN(score) &&
      !isNaN(maxScore) &&
      maxScore > 0
    ) {

      entered++;

      const percentage =
        calculatePercentage(
          score,
          maxScore
        );

      percentageTotal +=
        percentage;

      percentageCount++;

      if (percentage >= 50) {
        passed++;
      }
    }

    const published =
      row.querySelector(
        ".published"
      )?.checked;

    if (published) {
      published++;
    }
  });

  document.getElementById(
    "enteredResults"
  ).textContent =
    entered;

  document.getElementById(
    "publishedResults"
  ).textContent =
    published;

  document.getElementById(
    "passResults"
  ).textContent =
    passed;

  const average =
    percentageCount
      ? (
          percentageTotal /
          percentageCount
        ).toFixed(1)
      : "0";

  document.getElementById(
    "averageScore"
  ).textContent =
    `${average}%`;
}


// --------------------------------------------------
// EVENT LISTENERS
// --------------------------------------------------

institutionSelect.addEventListener(
  "change",
  async function () {

    selectedInstitution =
      this.value;

    selectedCourse = "";
    selectedClass = "";
    selectedExam = "";
    selectedSubject = "";

    await loadCourses();
  }
);


courseSelect.addEventListener(
  "change",
  async function () {

    selectedCourse =
      this.value;

    selectedClass = "";
    selectedExam = "";
    selectedSubject = "";

    await loadClasses();

    await loadSubjects();
  }
);


classSelect.addEventListener(
  "change",
  async function () {

    selectedClass =
      this.value;

    selectedExam = "";
    selectedSubject = "";

    await loadExams();

    clearResultsTable();
  }
);


examSelect.addEventListener(
  "change",
  async function () {

    selectedExam =
      this.value;

    selectedSubject = "";

    await loadSubjects();

    if (
      selectedExam &&
      selectedSubject
    ) {
      await loadStudentsAndResults();
    }

    if (selectedExam) {
      await showExamInfo();
    }
  }
);


subjectSelect.addEventListener(
  "change",
  async function () {

    selectedSubject =
      this.value;

    if (
      selectedClass &&
      selectedExam &&
      selectedSubject
    ) {

      await loadStudentsAndResults();

    } else {

      clearResultsTable();
    }
  }
);


studentSearch.addEventListener(
  "input",
  function () {

    tableSearch.value =
      this.value;

    renderResultsTable();
  }
);


tableSearch.addEventListener(
  "input",
  function () {

    studentSearch.value =
      this.value;

    renderResultsTable();
  }
);


saveBtn.addEventListener(
  "click",
  saveResults
);


resetBtn.addEventListener(
  "click",
  async function () {

    studentSearch.value = "";
    tableSearch.value = "";

    if (
      selectedClass &&
      selectedExam &&
      selectedSubject
    ) {

      await loadStudentsAndResults();

    } else {

      clearResultsTable();
    }
  }
);


// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function resetSelect(
  select,
  placeholder
) {

  select.innerHTML =
    `<option value="">${placeholder}</option>`;

  select.disabled = true;
}


function clearResultsTable() {

  students = [];
  existingResults = [];

  resultsBody.innerHTML = `
    <tr>
      <td colspan="9" class="empty">
        Select academic context to load students.
      </td>
    </tr>
  `;

  updateStats();

  saveBtn.disabled = true;

  examInfo.style.display =
    "none";

  statusText.textContent =
    "Select institution, course, class, exam and subject.";
}


function getSelectedSubjectMaxScore() {

  const option =
    subjectSelect.options[
      subjectSelect.selectedIndex
    ];

  if (!option) {
    return "";
  }

  return option.dataset.maxScore || "";
}


function calculatePercentage(
  score,
  maxScore
) {

  const s =
    parseFloat(score);

  const m =
    parseFloat(maxScore);

  if (
    isNaN(s) ||
    isNaN(m) ||
    m <= 0
  ) {
    return 0;
  }

  return Number(
    (
      (s / m) *
      100
    ).toFixed(2)
  );
}


function calculateGrade(
  percentage
) {

  const p =
    Number(percentage);

  if (isNaN(p)) {
    return "";
  }

  if (p >= 80) return "A";
  if (p >= 70) return "B";
  if (p >= 60) return "C";
  if (p >= 50) return "D";

  return "F";
}


function formatPercentage(
  percentage
) {

  if (
    percentage === null ||
    percentage === undefined ||
    percentage === "" ||
    isNaN(Number(percentage))
  ) {
    return "—";
  }

  return `${Number(percentage).toFixed(2)}%`;
}


function formatExamType(
  type
) {

  if (!type) {
    return "";
  }

  return type
    .charAt(0)
    .toUpperCase() +
    type.slice(1);
}


function getStudentName(
  studentId
) {

  const student =
    students.find(
      item =>
        item.id === studentId
    );

  return student
    ? student.full_name
    : "student";
}


function getStudentId(
  studentId
) {

  const student =
    students.find(
      item =>
        item.id === studentId
    );

  return student
    ? student.student_id
    : studentId;
}


function escapeHtml(
  value
) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function escapeAttribute(
  value
) {

  return escapeHtml(value);
}


function showMessage(
  message,
  type
) {

  messageBox.textContent =
    message;

  messageBox.className =
    `message ${type}`;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  setTimeout(() => {

    messageBox.className =
      "message";

  }, 5000);
}
