const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let institutions = [];
let exams = [];
let students = [];
let grades = [];

let editingId = null;


// ===============================
// START
// ===============================

document.addEventListener("DOMContentLoaded", init);

async function init() {

  try {

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
      window.location.href = "index.html";
      return;
    }

    currentUser = session.user;

    await checkSuperAdmin();

    await loadInstitutions();

    setupEvents();

    await loadGrades();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message || "Failed to load Grade Management.",
      "error"
    );
  }
}


// ===============================
// SUPER ADMIN CHECK
// ===============================

async function checkSuperAdmin() {

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", currentUser.id)
      .single();

  if (error) {
    throw error;
  }

  if (data.role !== "super_admin") {

    alert("Access denied. Super Admin only.");

    window.location.href = "super-admin.html";

    return;
  }
}


// ===============================
// EVENTS
// ===============================

function setupEvents() {

  document
    .getElementById("institutionSelect")
    .addEventListener("change", async function () {

      const institutionId = this.value;

      resetDependentFields();

      if (!institutionId) {
        return;
      }

      await loadExams(institutionId);

      await loadStudents(institutionId);

      await loadGrades();

    });


  document
    .getElementById("examSelect")
    .addEventListener("change", function () {

      const examId = this.value;

      if (!examId) {
        return;
      }

      const exam =
        exams.find(e => e.id === examId);

      if (exam) {

        document.getElementById("maxScoreInput").value =
          exam.max_score ?? "";

        calculateResult();
      }
    });


  document
    .getElementById("scoreInput")
    .addEventListener("input", calculateResult);


  document
    .getElementById("maxScoreInput")
    .addEventListener("input", calculateResult);


  document
    .getElementById("saveBtn")
    .addEventListener("click", saveGrade);


  document
    .getElementById("resetBtn")
    .addEventListener("click", resetForm);


  document
    .getElementById("searchInput")
    .addEventListener("input", renderGrades);


  document
    .getElementById("gradeFilter")
    .addEventListener("change", renderGrades);


  document
    .getElementById("publishFilter")
    .addEventListener("change", renderGrades);
}


// ===============================
// LOAD INSTITUTIONS
// ===============================

async function loadInstitutions() {

  const { data, error } =
    await supabaseClient
      .from("institutions")
      .select("id, name")
      .order("name");

  if (error) {
    throw error;
  }

  institutions = data || [];

  const select =
    document.getElementById("institutionSelect");

  select.innerHTML =
    `<option value="">Select institution</option>`;

  institutions.forEach(inst => {

    const option =
      document.createElement("option");

    option.value = inst.id;
    option.textContent = inst.name;

    select.appendChild(option);
  });
}


// ===============================
// LOAD EXAMS
// ===============================

async function loadExams(institutionId) {

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
        duration_minutes
      `)
      .eq("institution_id", institutionId)
      .order("exam_date", { ascending: false });

  if (error) {
    throw error;
  }

  exams = data || [];

  const select =
    document.getElementById("examSelect");

  select.innerHTML =
    `<option value="">Select exam</option>`;

  exams.forEach(exam => {

    const option =
      document.createElement("option");

    option.value = exam.id;

    const date =
      exam.exam_date
        ? ` — ${exam.exam_date}`
        : "";

    option.textContent =
      `${exam.title} (${exam.exam_type})${date}`;

    select.appendChild(option);
  });
}


// ===============================
// LOAD STUDENTS
// ===============================

async function loadStudents(institutionId) {

  const { data, error } =
    await supabaseClient
      .from("students")
      .select(`
        id,
        institution_id,
        student_id,
        full_name,
        status
      `)
      .eq("institution_id", institutionId)
      .eq("status", "active")
      .order("full_name");

  if (error) {
    throw error;
  }

  students = data || [];

  const select =
    document.getElementById("studentSelect");

  select.innerHTML =
    `<option value="">Select student</option>`;

  students.forEach(student => {

    const option =
      document.createElement("option");

    option.value = student.id;

    option.textContent =
      `${student.full_name} — ${student.student_id}`;

    select.appendChild(option);
  });
}


// ===============================
// CALCULATE RESULT
// ===============================

function calculateResult() {

  const score =
    Number(
      document.getElementById("scoreInput").value
    );

  const maxScore =
    Number(
      document.getElementById("maxScoreInput").value
    );

  const percentageInput =
    document.getElementById("percentageInput");

  const gradeInput =
    document.getElementById("gradeInput");


  if (
    !Number.isFinite(score) ||
    !Number.isFinite(maxScore) ||
    maxScore <= 0
  ) {

    percentageInput.value = "";
    gradeInput.value = "";

    return;
  }


  if (score < 0) {

    percentageInput.value = "";
    gradeInput.value = "";

    return;
  }


  if (score > maxScore) {

    percentageInput.value = "";
    gradeInput.value = "";

    showMessage(
      "Score cannot be greater than Max Score.",
      "error"
    );

    return;
  }


  const percentage =
    (score / maxScore) * 100;


  percentageInput.value =
    percentage.toFixed(2);


  gradeInput.value =
    calculateGrade(percentage);
}


// ===============================
// GRADING SYSTEM
// ===============================

function calculateGrade(percentage) {

  const p = Number(percentage);

  if (isNaN(p)) {
    return "";
  }

  if (p >= 90) return "A+";
  if (p >= 80) return "A";
  if (p >= 70) return "B";
  if (p >= 60) return "C";
  if (p >= 50) return "D";

  return "F";
}


// ===============================
// SAVE GRADE
// ===============================

async function saveGrade() {

  try {

    const institutionId =
      document.getElementById("institutionSelect").value;

    const examId =
      document.getElementById("examSelect").value;

    const studentId =
      document.getElementById("studentSelect").value;

    const score =
      Number(
        document.getElementById("scoreInput").value
      );

    const maxScore =
      Number(
        document.getElementById("maxScoreInput").value
      );

    const percentage =
      Number(
        document.getElementById("percentageInput").value
      );

    const grade =
      document.getElementById("gradeInput").value;

    const remarks =
      document.getElementById("remarksInput").value.trim();


    if (!institutionId) {
      showMessage("Please select an institution.", "error");
      return;
    }

    if (!examId) {
      showMessage("Please select an exam.", "error");
      return;
    }

    if (!studentId) {
      showMessage("Please select a student.", "error");
      return;
    }

    if (!Number.isFinite(score)) {
      showMessage("Please enter a valid score.", "error");
      return;
    }

    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      showMessage("Please enter a valid Max Score.", "error");
      return;
    }

    if (score > maxScore) {
      showMessage(
        "Score cannot be greater than Max Score.",
        "error"
      );
      return;
    }


    const calculatedPercentage =
      Number(((score / maxScore) * 100).toFixed(2));

    const calculatedGrade =
      calculateGrade(calculatedPercentage);


    const payload = {

      institution_id: institutionId,

      exam_id: examId,

      student_id: studentId,

      score: score,

      grade: calculatedGrade,

      remarks: remarks || null,

      entered_by: currentUser.id
    };


    let result;


    if (editingId) {

      result =
        await supabaseClient
          .from("grades")
          .update(payload)
          .eq("id", editingId)
          .select()
          .single();

    } else {

      result =
        await supabaseClient
          .from("grades")
          .insert(payload)
          .select()
          .single();
    }


    if (result.error) {

      if (
        result.error.code === "23505"
      ) {

        showMessage(
          "A grade already exists for this student and exam.",
          "error"
        );

        return;
      }

      throw result.error;
    }


    showMessage(
      editingId
        ? "Grade updated successfully."
        : "Grade saved successfully.",
      "success"
    );


    resetForm();

    await loadGrades();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message || "Failed to save grade.",
      "error"
    );
  }
}


// ===============================
// LOAD GRADES
// ===============================

async function loadGrades() {

  const loading =
    document.getElementById("tableLoading");

  const table =
    document.getElementById("gradesTable");

  loading.style.display = "block";

  table.classList.add("hidden");


  try {

    const institutionId =
      document.getElementById("institutionSelect").value;


    let query =
      supabaseClient
        .from("grades")
        .select(`
          id,
          institution_id,
          exam_id,
          student_id,
          score,
          grade,
          remarks,
          entered_by,
          created_at
        `)
        .order("created_at", {
          ascending: false
        });


    if (institutionId) {

      query =
        query.eq(
          "institution_id",
          institutionId
        );
    }


    const { data, error } =
      await query;


    if (error) {
      throw error;
    }


    grades = data || [];


    await enrichGrades();


    renderGrades();

    updateStats();

  } catch (error) {

    console.error(error);

    loading.textContent =
      error.message || "Failed to load grades.";

  } finally {

    loading.style.display = "none";

    table.classList.remove("hidden");
  }
}


// ===============================
// ENRICH GRADES
// ===============================

async function enrichGrades() {

  if (!grades.length) {
    return;
  }


  const studentIds =
    [...new Set(
      grades.map(g => g.student_id)
    )];


  const examIds =
    [...new Set(
      grades.map(g => g.exam_id)
    )];


  let studentMap = {};
  let examMap = {};


  if (studentIds.length) {

    const { data, error } =
      await supabaseClient
        .from("students")
        .select("id, full_name, student_id")
        .in("id", studentIds);

    if (!error) {

      (data || []).forEach(student => {

        studentMap[student.id] =
          student;
      });
    }
  }


  if (examIds.length) {

    const { data, error } =
      await supabaseClient
        .from("exams")
        .select(`
          id,
          title,
          exam_type,
          max_score,
          exam_date
        `)
        .in("id", examIds);

    if (!error) {

      (data || []).forEach(exam => {

        examMap[exam.id] =
          exam;
      });
    }
  }


  grades =
    grades.map(row => {

      const student =
        studentMap[row.student_id];

      const exam =
        examMap[row.exam_id];


      const examMax =
        exam?.max_score
          ? Number(exam.max_score)
          : 100;


      const percentage =
        examMax > 0
          ? (Number(row.score) / examMax) * 100
          : 0;


      return {

        ...row,

        studentName:
          student?.full_name ||
          "Unknown Student",

        studentCode:
          student?.student_id ||
          "",

        examTitle:
          exam?.title ||
          "Unknown Exam",

        examType:
          exam?.exam_type ||
          "",

        maxScore:
          examMax,

        percentage:
          Number(percentage.toFixed(2))
      };
    });
}


// ===============================
// RENDER
// ===============================

function renderGrades() {

  const body =
    document.getElementById("gradesBody");


  const search =
    document
      .getElementById("searchInput")
      .value
      .trim()
      .toLowerCase();


  const gradeFilter =
    document
      .getElementById("gradeFilter")
      .value;


  let filtered =
    grades.filter(row => {

      const searchable =
        `${row.studentName}
         ${row.studentCode}
         ${row.examTitle}
         ${row.examType}
         ${row.grade || ""}
         ${row.remarks || ""}`
          .toLowerCase();


      const matchesSearch =
        !search ||
        searchable.includes(search);


      const matchesGrade =
        !gradeFilter ||
        row.grade === gradeFilter;


      return matchesSearch && matchesGrade;
    });


  body.innerHTML = "";


  if (!filtered.length) {

    body.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center;padding:25px;">
          No grades found.
        </td>
      </tr>
    `;

    return;
  }


  filtered.forEach((row, index) => {

    const tr =
      document.createElement("tr");


    const gradeClass =
      getGradeClass(row.grade);


    tr.innerHTML = `

      <td>${index + 1}</td>

      <td>
        <strong>${escapeHtml(row.studentName)}</strong>
        <br>
        <small>${escapeHtml(row.studentCode)}</small>
      </td>

      <td>
        ${escapeHtml(row.examTitle)}
        <br>
        <small>${escapeHtml(row.examType)}</small>
      </td>

      <td>${formatNumber(row.score)}</td>

      <td>${formatNumber(row.maxScore)}</td>

      <td>
        <strong>${formatNumber(row.percentage)}%</strong>
      </td>

      <td>
        <span class="grade ${gradeClass}">
          ${escapeHtml(row.grade || "-")}
        </span>
      </td>

      <td>
        ${escapeHtml(row.remarks || "-")}
      </td>

      <td>
        <div class="actions">

          <button
            class="gold"
            onclick="editGrade('${row.id}')">
            Edit
          </button>

          <button
            class="danger"
            onclick="deleteGrade('${row.id}')">
            Delete
          </button>

        </div>
      </td>

    `;


    body.appendChild(tr);
  });
}


// ===============================
// EDIT
// ===============================

async function editGrade(id) {

  const row =
    grades.find(g => g.id === id);


  if (!row) {
    return;
  }


  const institutionSelect =
    document.getElementById("institutionSelect");


  institutionSelect.value =
    row.institution_id;


  await loadExams(row.institution_id);

  await loadStudents(row.institution_id);


  document.getElementById("examSelect").value =
    row.exam_id;


  document.getElementById("studentSelect").value =
    row.student_id;


  document.getElementById("scoreInput").value =
    row.score;


  document.getElementById("maxScoreInput").value =
    row.maxScore;


  document.getElementById("remarksInput").value =
    row.remarks || "";


  editingId = id;


  calculateResult();


  document.getElementById("saveBtn").textContent =
    "Update Grade";


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ===============================
// DELETE
// ===============================

async function deleteGrade(id) {

  const row =
    grades.find(g => g.id === id);


  if (!row) {
    return;
  }


  const confirmed =
    confirm(
      `Delete grade for ${row.studentName}?\n\n` +
      `${row.examTitle} — ${row.grade}`
    );


  if (!confirmed) {
    return;
  }


  try {

    const { error } =
      await supabaseClient
        .from("grades")
        .delete()
        .eq("id", id);


    if (error) {
      throw error;
    }


    showMessage(
      "Grade deleted successfully.",
      "success"
    );


    await loadGrades();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message || "Failed to delete grade.",
      "error"
    );
  }
}


// ===============================
// RESET
// ===============================

function resetForm() {

  editingId = null;


  document.getElementById("examSelect").value =
    "";

  document.getElementById("studentSelect").value =
    "";

  document.getElementById("scoreInput").value =
    "";

  document.getElementById("maxScoreInput").value =
    "";

  document.getElementById("percentageInput").value =
    "";

  document.getElementById("gradeInput").value =
    "";

  document.getElementById("remarksInput").value =
    "";


  document.getElementById("saveBtn").textContent =
    "Save Grade";
}


// ===============================
// RESET DEPENDENT FIELDS
// ===============================

function resetDependentFields() {

  exams = [];
  students = [];

  document.getElementById("examSelect").innerHTML =
    `<option value="">Select exam</option>`;

  document.getElementById("studentSelect").innerHTML =
    `<option value="">Select student</option>`;

  document.getElementById("scoreInput").value = "";
  document.getElementById("maxScoreInput").value = "";
  document.getElementById("percentageInput").value = "";
  document.getElementById("gradeInput").value = "";
  document.getElementById("remarksInput").value = "";
}


// ===============================
// STATS
// ===============================

function updateStats() {

  const total =
    grades.length;


  let top =
    0;

  let passed =
    0;

  let failed =
    0;

  let totalPercentage =
    0;


  grades.forEach(row => {

    const percentage =
      Number(row.percentage) || 0;


    totalPercentage +=
      percentage;


    if (
      row.grade === "A+" ||
      row.grade === "A"
    ) {
      top++;
    }


    if (percentage >= 50) {
      passed++;
    } else {
      failed++;
    }
  });


  const average =
    total > 0
      ? totalPercentage / total
      : 0;


  document.getElementById("totalGrades").textContent =
    total;


  document.getElementById("topGrades").textContent =
    top;


  document.getElementById("passedGrades").textContent =
    passed;


  document.getElementById("failedGrades").textContent =
    failed;


  document.getElementById("averageScore").textContent =
    `${average.toFixed(2)}%`;
}


// ===============================
// GRADE CLASS
// ===============================

function getGradeClass(grade) {

  switch (grade) {

    case "A+":
      return "grade-a-plus";

    case "A":
      return "grade-a";

    case "B":
      return "grade-b";

    case "C":
      return "grade-c";

    case "D":
      return "grade-d";

    case "F":
      return "grade-f";

    default:
      return "";
  }
}


// ===============================
// HELPERS
// ===============================

function formatNumber(value) {

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number % 1 === 0
    ? number.toString()
    : number.toFixed(2);
}


function escapeHtml(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function showMessage(text, type) {

  const box =
    document.getElementById("message");

  box.textContent =
    text;

  box.className =
    `message ${type}`;


  setTimeout(() => {

    box.className =
      "message";

  }, 4000);
}


// ===============================
// DASHBOARD
// ===============================

function goDashboard() {

  window.location.href =
    "super-admin.html";
}


// ===============================
// LOGOUT SAFETY
// ===============================

window.addEventListener(
  "error",
  event => {

    console.error(
      "Grades page error:",
      event.error
    );
  }
);
