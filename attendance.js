const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = null;
let institutions = [];
let courses = [];
let classes = [];
let lessons = [];
let attendanceRows = [];

const institutionSelect = document.getElementById("institutionSelect");
const courseSelect = document.getElementById("courseSelect");
const classSelect = document.getElementById("classSelect");
const lessonSelect = document.getElementById("lessonSelect");
const attendanceDate = document.getElementById("attendanceDate");
const studentSearch = document.getElementById("studentSearch");
const attendanceBody = document.getElementById("attendanceBody");

const totalCount = document.getElementById("totalCount");
const presentCount = document.getElementById("presentCount");
const absentCount = document.getElementById("absentCount");
const lateCount = document.getElementById("lateCount");
const excusedCount = document.getElementById("excusedCount");

const lessonInfo = document.getElementById("lessonInfo");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const allPresentBtn = document.getElementById("allPresentBtn");
const allAbsentBtn = document.getElementById("allAbsentBtn");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setToday();

  try {
    const {
      data: { session },
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) throw sessionError;

    if (!session) {
      window.location.href = "index.html";
      return;
    }

    currentUser = session.user;

    await checkSuperAdmin();
    await loadInstitutions();

  } catch (error) {
    console.error(error);
    showMessage("Unable to initialize Attendance module.", "error");
  }
}

/* =========================
   AUTH / ROLE
========================= */

async function checkSuperAdmin() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, full_name, role, institution_id")
    .eq("id", currentUser.id)
    .single();

  if (error) throw error;

  if (data.role !== "super_admin") {
    alert("Access denied. Super Admin only.");
    window.location.href = "index.html";
    return;
  }
}

/* =========================
   INSTITUTIONS
========================= */

async function loadInstitutions() {
  const { data, error } = await supabaseClient
    .from("institutions")
    .select("id, name")
    .order("name");

  if (error) {
    console.error(error);
    showMessage("Failed to load institutions.", "error");
    return;
  }

  institutions = data || [];

  institutionSelect.innerHTML =
    `<option value="">Select Institution</option>` +
    institutions
      .map(i => `<option value="${i.id}">${escapeHtml(i.name)}</option>`)
      .join("");

  clearSelect(courseSelect, "Select Course");
  clearSelect(classSelect, "Select Class");
  clearSelect(lessonSelect, "Select Lesson");

  resetAttendanceTable();
}

/* =========================
   COURSES
========================= */

institutionSelect.addEventListener("change", async () => {
  const institutionId = institutionSelect.value;

  clearSelect(courseSelect, "Select Course");
  clearSelect(classSelect, "Select Class");
  clearSelect(lessonSelect, "Select Lesson");

  resetAttendanceTable();

  if (!institutionId) return;

  await loadCourses(institutionId);
});

async function loadCourses(institutionId) {
  const { data, error } = await supabaseClient
    .from("courses")
    .select("id, name, code")
    .eq("institution_id", institutionId)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error(error);
    showMessage("Failed to load courses.", "error");
    return;
  }

  courses = data || [];

  courseSelect.innerHTML =
    `<option value="">Select Course</option>` +
    courses
      .map(c =>
        `<option value="${c.id}">
          ${escapeHtml(c.name)}${c.code ? ` (${escapeHtml(c.code)})` : ""}
        </option>`
      )
      .join("");
}

/* =========================
   CLASSES
========================= */

courseSelect.addEventListener("change", async () => {
  const institutionId = institutionSelect.value;
  const courseId = courseSelect.value;

  clearSelect(classSelect, "Select Class");
  clearSelect(lessonSelect, "Select Lesson");

  resetAttendanceTable();

  if (!institutionId || !courseId) return;

  await loadClasses(institutionId, courseId);
});

async function loadClasses(institutionId, courseId) {
  const { data, error } = await supabaseClient
    .from("classes")
    .select("id, name, code, academic_year, room")
    .eq("institution_id", institutionId)
    .eq("course_id", courseId)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error(error);
    showMessage("Failed to load classes.", "error");
    return;
  }

  classes = data || [];

  classSelect.innerHTML =
    `<option value="">Select Class</option>` +
    classes
      .map(c =>
        `<option value="${c.id}">
          ${escapeHtml(c.name)}
          ${c.code ? ` (${escapeHtml(c.code)})` : ""}
          ${c.academic_year ? ` - ${escapeHtml(c.academic_year)}` : ""}
        </option>`
      )
      .join("");
}

/* =========================
   LESSONS
========================= */

classSelect.addEventListener("change", async () => {
  const classId = classSelect.value;

  clearSelect(lessonSelect, "Select Lesson");
  resetAttendanceTable();

  if (!classId) return;

  await loadLessons(classId);
});

async function loadLessons(classId) {
  const institutionId = institutionSelect.value;

  const { data, error } = await supabaseClient
    .from("lessons")
    .select(`
      id,
      class_id,
      institution_id,
      teacher_id,
      title,
      description,
      lesson_date,
      start_time,
      end_time,
      room
    `)
    .eq("class_id", classId)
    .eq("institution_id", institutionId)
    .order("lesson_date", { ascending: false })
    .order("start_time", { ascending: true });

  if (error) {
    console.error(error);
    showMessage("Failed to load lessons.", "error");
    return;
  }

  lessons = data || [];

  lessonSelect.innerHTML =
    `<option value="">Select Lesson</option>` +
    lessons
      .map(l => {
        const date = formatDate(l.lesson_date);
        const time = formatTimeRange(l.start_time, l.end_time);

        return `
          <option value="${l.id}">
            ${escapeHtml(l.title)} — ${date}${time ? ` — ${time}` : ""}
          </option>
        `;
      })
      .join("");
}

/* =========================
   LESSON CHANGE
========================= */

lessonSelect.addEventListener("change", async () => {
  const lessonId = lessonSelect.value;

  resetAttendanceTable();

  if (!lessonId) {
    lessonInfo.innerHTML = "";
    return;
  }

  const lesson = lessons.find(l => l.id === lessonId);

  if (!lesson) return;

  showLessonInfo(lesson);

  attendanceDate.value = lesson.lesson_date || getToday();

  await loadStudentsAndAttendance(lesson);
});

/* =========================
   LOAD STUDENTS
========================= */

async function loadStudentsAndAttendance(lesson) {
  attendanceBody.innerHTML = `
    <tr>
      <td colspan="5" class="loading">
        Loading students...
      </td>
    </tr>
  `;

  const { data: enrollments, error: enrollmentError } =
    await supabaseClient
      .from("enrollments")
      .select(`
        id,
        student_id,
        class_id,
        institution_id,
        status
      `)
      .eq("institution_id", lesson.institution_id)
      .eq("class_id", lesson.class_id)
      .eq("status", "active");

  if (enrollmentError) {
    console.error(enrollmentError);
    showMessage("Failed to load enrollments.", "error");
    return;
  }

  if (!enrollments || enrollments.length === 0) {
    attendanceRows = [];
    renderAttendanceTable();

    showMessage(
      "No active students are enrolled in this class.",
      "info"
    );

    return;
  }

  const studentIds = enrollments.map(e => e.student_id);

  const { data: students, error: studentError } =
    await supabaseClient
      .from("students")
      .select(`
        id,
        student_id,
        full_name,
        gender,
        phone,
        email,
        status
      `)
      .in("id", studentIds)
      .eq("status", "active")
      .order("full_name");

  if (studentError) {
    console.error(studentError);
    showMessage("Failed to load students.", "error");
    return;
  }

  const { data: existingAttendance, error: attendanceError } =
    await supabaseClient
      .from("attendance")
      .select(`
        id,
        student_id,
        status,
        notes,
        recorded_by,
        recorded_at
      `)
      .eq("lesson_id", lesson.id)
      .eq("institution_id", lesson.institution_id);

  if (attendanceError) {
    console.error(attendanceError);
    showMessage("Failed to load existing attendance.", "error");
    return;
  }

  const attendanceMap = new Map(
    (existingAttendance || []).map(row => [
      row.student_id,
      row
    ])
  );

  attendanceRows = (students || []).map(student => {
    const existing = attendanceMap.get(student.id);

    return {
      student_id: student.id,
      student_code: student.student_id,
      full_name: student.full_name,
      gender: student.gender,
      phone: student.phone,
      email: student.email,

      attendance_id: existing?.id || null,
      status: existing?.status || "present",
      notes: existing?.notes || ""
    };
  });

  renderAttendanceTable();
}

/* =========================
   RENDER TABLE
========================= */

function renderAttendanceTable() {
  if (!attendanceRows.length) {
    attendanceBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty">
          No students found.
        </td>
      </tr>
    `;

    updateStats();
    return;
  }

  attendanceBody.innerHTML = attendanceRows
    .map((row, index) => `
      <tr data-index="${index}">
        <td>
          <div class="student-name">
            ${escapeHtml(row.full_name || "Unnamed Student")}
          </div>
          <div class="student-id">
            ${escapeHtml(row.student_code || "")}
          </div>
        </td>

        <td>
          ${escapeHtml(row.gender || "-")}
        </td>

        <td>
          <select
            class="attendance-status"
            data-index="${index}"
          >
            <option value="present" ${row.status === "present" ? "selected" : ""}>
              Present
            </option>

            <option value="absent" ${row.status === "absent" ? "selected" : ""}>
              Absent
            </option>

            <option value="late" ${row.status === "late" ? "selected" : ""}>
              Late
            </option>

            <option value="excused" ${row.status === "excused" ? "selected" : ""}>
              Excused
            </option>
          </select>
        </td>

        <td>
          <input
            type="text"
            class="attendance-notes"
            data-index="${index}"
            value="${escapeAttribute(row.notes || "")}"
            placeholder="Optional notes"
          >
        </td>

        <td>
          <span class="status-badge ${getStatusClass(row.status)}">
            ${capitalize(row.status)}
          </span>
        </td>
      </tr>
    `)
    .join("");

  document.querySelectorAll(".attendance-status")
    .forEach(select => {
      select.addEventListener("change", e => {
        const index = Number(e.target.dataset.index);

        attendanceRows[index].status = e.target.value;

        updateBadge(index);
        updateStats();
      });
    });

  document.querySelectorAll(".attendance-notes")
    .forEach(input => {
      input.addEventListener("input", e => {
        const index = Number(e.target.dataset.index);

        attendanceRows[index].notes = e.target.value;
      });
    });

  updateStats();
}

/* =========================
   SEARCH
========================= */

if (studentSearch) {
  studentSearch.addEventListener("input", () => {
    const search = studentSearch.value
      .trim()
      .toLowerCase();

    document.querySelectorAll("#attendanceBody tr")
      .forEach(row => {
        const text = row.textContent.toLowerCase();

        row.style.display =
          !search || text.includes(search)
            ? ""
            : "none";
      });
  });
}

/* =========================
   QUICK ACTIONS
========================= */

if (allPresentBtn) {
  allPresentBtn.addEventListener("click", () => {
    markAll("present");
  });
}

if (allAbsentBtn) {
  allAbsentBtn.addEventListener("click", () => {
    markAll("absent");
  });
}

function markAll(status) {
  attendanceRows.forEach(row => {
    row.status = status;
  });

  document.querySelectorAll(".attendance-status")
    .forEach(select => {
      select.value = status;
    });

  attendanceRows.forEach((_, index) => {
    updateBadge(index);
  });

  updateStats();
}

/* =========================
   SAVE ATTENDANCE
========================= */

if (saveBtn) {
  saveBtn.addEventListener("click", saveAttendance);
}

async function saveAttendance() {
  if (!institutionSelect.value) {
    showMessage("Please select an institution.", "error");
    return;
  }

  if (!classSelect.value) {
    showMessage("Please select a class.", "error");
    return;
  }

  if (!lessonSelect.value) {
    showMessage("Please select a lesson.", "error");
    return;
  }

  if (!attendanceRows.length) {
    showMessage("There are no students to save.", "error");
    return;
  }

  const lesson = lessons.find(
    l => l.id === lessonSelect.value
  );

  if (!lesson) {
    showMessage("Selected lesson was not found.", "error");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    for (const row of attendanceRows) {
      const payload = {
        institution_id: institutionSelect.value,
        lesson_id: lesson.id,
        student_id: row.student_id,
        status: row.status,
        notes: row.notes || null,
        recorded_by: currentUser.id,
        recorded_at: new Date().toISOString()
      };

      if (row.attendance_id) {
        const { error } = await supabaseClient
          .from("attendance")
          .update(payload)
          .eq("id", row.attendance_id);

        if (error) throw error;

      } else {
        const { data, error } = await supabaseClient
          .from("attendance")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;

        row.attendance_id = data.id;
      }
    }

    showMessage(
      "Attendance saved successfully.",
      "success"
    );

    updateStats();

  } catch (error) {
    console.error("Save attendance error:", error);

    showMessage(
      error.message || "Failed to save attendance.",
      "error"
    );

  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Attendance";
  }
}

/* =========================
   RESET
========================= */

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    attendanceRows = [];
    resetAttendanceTable();

    if (studentSearch) {
      studentSearch.value = "";
    }

    lessonInfo.innerHTML = "";
    lessonSelect.value = "";
  });
}

function resetAttendanceTable() {
  attendanceRows = [];

  if (attendanceBody) {
    attendanceBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty">
          Select a lesson to load students.
        </td>
      </tr>
    `;
  }

  updateStats();
}

/* =========================
   LESSON INFO
========================= */

function showLessonInfo(lesson) {
  const time = formatTimeRange(
    lesson.start_time,
    lesson.end_time
  );

  lessonInfo.innerHTML = `
    <div class="lesson-info-card">
      <div>
        <strong>Lesson</strong>
        <span>${escapeHtml(lesson.title || "-")}</span>
      </div>

      <div>
        <strong>Date</strong>
        <span>${formatDate(lesson.lesson_date)}</span>
      </div>

      <div>
        <strong>Time</strong>
        <span>${time || "-"}</span>
      </div>

      <div>
        <strong>Room</strong>
        <span>${escapeHtml(lesson.room || "-")}</span>
      </div>
    </div>
  `;
}

/* =========================
   STATS
========================= */

function updateStats() {
  const total = attendanceRows.length;

  const present = attendanceRows.filter(
    r => r.status === "present"
  ).length;

  const absent = attendanceRows.filter(
    r => r.status === "absent"
  ).length;

  const late = attendanceRows.filter(
    r => r.status === "late"
  ).length;

  const excused = attendanceRows.filter(
    r => r.status === "excused"
  ).length;

  if (totalCount) totalCount.textContent = total;
  if (presentCount) presentCount.textContent = present;
  if (absentCount) absentCount.textContent = absent;
  if (lateCount) lateCount.textContent = late;
  if (excusedCount) excusedCount.textContent = excused;
}

/* =========================
   UPDATE BADGE
========================= */

function updateBadge(index) {
  const row = document.querySelector(
    `tr[data-index="${index}"]`
  );

  if (!row) return;

  const badge = row.querySelector(".status-badge");

  if (!badge) return;

  const status = attendanceRows[index].status;

  badge.className =
    `status-badge ${getStatusClass(status)}`;

  badge.textContent = capitalize(status);
}

/* =========================
   HELPERS
========================= */

function clearSelect(select, placeholder) {
  if (!select) return;

  select.innerHTML =
    `<option value="">${placeholder}</option>`;

  select.value = "";
}

function setToday() {
  if (attendanceDate) {
    attendanceDate.value = getToday();
  }
}

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value + "T00:00:00");

  if (Number.isNaN(date.getTime())) {
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

function formatTimeRange(start, end) {
  if (!start && !end) return "";

  const formatTime = time => {
    if (!time) return "";

    const parts = time.split(":");

    let hour = Number(parts[0]);
    const minute = parts[1] || "00";

    const ampm = hour >= 12 ? "PM" : "AM";

    hour = hour % 12;

    if (hour === 0) {
      hour = 12;
    }

    return `${hour}:${minute} ${ampm}`;
  };

  if (start && end) {
    return `${formatTime(start)} - ${formatTime(end)}`;
  }

  return formatTime(start || end);
}

function getStatusClass(status) {
  switch (status) {
    case "present":
      return "status-present";

    case "absent":
      return "status-absent";

    case "late":
      return "status-late";

    case "excused":
      return "status-excused";

    default:
      return "";
  }
}

function capitalize(value) {
  if (!value) return "";

  return value.charAt(0).toUpperCase() +
    value.slice(1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

/* =========================
   MESSAGE
========================= */

function showMessage(message, type = "info") {
  let box = document.getElementById("messageBox");

  if (!box) {
    box = document.createElement("div");
    box.id = "messageBox";

    box.style.position = "fixed";
    box.style.top = "20px";
    box.style.right = "20px";
    box.style.zIndex = "9999";
    box.style.maxWidth = "360px";
    box.style.padding = "14px 18px";
    box.style.borderRadius = "12px";
    box.style.fontWeight = "600";
    box.style.boxShadow = "0 10px 30px rgba(0,0,0,.15)";

    document.body.appendChild(box);
  }

  if (type === "success") {
    box.style.background = "#16A34A";
    box.style.color = "#fff";
  } else if (type === "error") {
    box.style.background = "#DC2626";
    box.style.color = "#fff";
  } else {
    box.style.background = "#0B4DA2";
    box.style.color = "#fff";
  }

  box.textContent = message;
  box.style.display = "block";

  clearTimeout(window.messageTimer);

  window.messageTimer = setTimeout(() => {
    box.style.display = "none";
  }, 4000);
}
