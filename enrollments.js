"use strict";

/*
 * GAAWOW EMS - Enrollment Management
 *
 * Required tables:
 * institutions, students, courses, classes, enrollments, profiles
 *
 * Security:
 * - Requires a signed-in Supabase user.
 * - Relies on database RLS policies for authorization.
 * - Never disables RLS.
 * - Does not create Auth accounts.
 */

const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";

/*
 * Use your project's publishable/anon key.
 * Never put a service_role key in browser JavaScript.
 */
const SUPABASE_ANON_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const $ = (id) => document.getElementById(id);

const state = {
  user: null,
  profile: null,
  institutions: [],
  students: [],
  courses: [],
  classes: [],
  enrollments: [],
  editingId: null,
  busy: false
};

const STATUS_LABELS = {
  active: "Active",
  completed: "Completed",
  suspended: "Suspended",
  dropped: "Dropped"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showMessage(message, type = "info", target = "pageMessage") {
  const element = $(target);
  if (!element) return;

  element.textContent = message;
  element.className = `message show ${type}`;
}

function clearMessage(target = "pageMessage") {
  const element = $(target);
  if (!element) return;

  element.textContent = "";
  element.className = "message";
}

function setBusy(busy) {
  state.busy = busy;

  const saveButton = $("saveBtn");
  if (saveButton) {
    saveButton.disabled = busy;
    saveButton.innerHTML = busy
      ? '<i class="fa-solid fa-spinner fa-spin"></i> Please wait...'
      : '<i class="fa-solid fa-floppy-disk"></i> Save Enrollment';
  }

  const refreshButton = $("refreshBtn");
  if (refreshButton) refreshButton.disabled = busy;
}

function setOptions(selectId, rows, valueField, labelFunction, placeholder) {
  const select = $(selectId);
  if (!select) return;

  const oldValue = select.value;

  select.innerHTML = "";

  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);

  for (const row of rows) {
    const option = document.createElement("option");
    option.value = row[valueField];
    option.textContent = labelFunction(row);
    select.appendChild(option);
  }

  if (rows.some((row) => String(row[valueField]) === oldValue)) {
    select.value = oldValue;
  }
}

function institutionName(row) {
  return row.name || row.institution_name || row.id;
}

function studentLabel(row) {
  const studentId = row.student_id || "";
  const fullName = row.full_name || row.name || "Unnamed student";
  return `${studentId} - ${fullName}`;
}

function courseLabel(row) {
  return `${row.name || "Unnamed course"}${row.code ? ` (${row.code})` : ""}`;
}

function classLabel(row) {
  return `${row.name || "Unnamed class"}${row.code ? ` (${row.code})` : ""}`;
}

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString();
}

function statusBadge(status) {
  const safeStatus = STATUS_LABELS[status] ? status : "unknown";
  const label = STATUS_LABELS[safeStatus] || safeStatus;

  return `<span class="badge badge-${escapeHtml(safeStatus)}">${escapeHtml(label)}</span>`;
}

function isSuperAdmin() {
  return state.profile?.role === "super_admin";
}

function getSelectedInstitutionId() {
  return $("institutionSelect").value;
}

function getSelectedCourseId() {
  return $("courseSelect").value;
}

function getSelectedClassId() {
  return $("classSelect").value;
}

function selectedStudentId() {
  return $("studentSelect").value;
}

function filteredStudents(institutionId) {
  return state.students.filter((student) =>
    student.institution_id === institutionId
  );
}

function filteredCourses(institutionId) {
  return state.courses.filter((course) =>
    course.institution_id === institutionId &&
    course.is_active !== false
  );
}

function filteredClasses(institutionId, courseId) {
  return state.classes.filter((classRow) =>
    classRow.institution_id === institutionId &&
    classRow.course_id === courseId &&
    classRow.is_active !== false &&
    classRow.status !== "inactive"
  );
}

async function requireSignedInUser() {
  const { data, error } = await db.auth.getSession();

  if (error) throw error;

  const user = data.session?.user;
  if (!user) {
    showMessage(
      "Your session is missing. Please sign in through the official GAAWOW EMS login page.",
      "error"
    );
    $("enrollmentForm").querySelectorAll("input, select, button").forEach((el) => {
      el.disabled = true;
    });
    return false;
  }

  state.user = user;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, full_name, role, institution_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!profile || profile.is_active === false) {
    throw new Error("Your active GAAWOW EMS profile could not be verified.");
  }

  state.profile = profile;

  if (!["super_admin", "school_admin"].includes(profile.role)) {
    throw new Error(
      "You do not have permission to manage student enrollments."
    );
  }

  return true;
}

async function loadInstitutions() {
  /*
   * RLS must limit this query to institutions the current user
   * is allowed to access.
   */
  const { data, error } = await db
    .from("institutions")
    .select("*")
    .order("name");

  if (error) throw error;

  state.institutions = data || [];

  setOptions(
    "institutionSelect",
    state.institutions,
    "id",
    institutionName,
    "Select institution"
  );

  setOptions(
    "filterInstitution",
    state.institutions,
    "id",
    institutionName,
    "All accessible institutions"
  );

  /*
   * For a school admin, default to their own institution.
   * For a super admin, do not guess which institution they want.
   */
  if (state.profile.role === "school_admin" && state.profile.institution_id) {
    $("institutionSelect").value = state.profile.institution_id;
    $("institutionSelect").disabled = true;
    $("filterInstitution").value = state.profile.institution_id;
    $("filterInstitution").disabled = true;
  }
}

async function loadReferenceData() {
  const [studentsResult, coursesResult, classesResult] = await Promise.all([
    db.from("students")
      .select("id, student_id, full_name, institution_id")
      .order("student_id"),

    db.from("courses")
      .select("id, name, code, institution_id, is_active")
      .order("name"),

    db.from("classes")
      .select("id, name, code, institution_id, course_id, is_active, status")
      .order("name")
  ]);

  if (studentsResult.error) throw studentsResult.error;
  if (coursesResult.error) throw coursesResult.error;
  if (classesResult.error) throw classesResult.error;

  state.students = studentsResult.data || [];
  state.courses = coursesResult.data || [];
  state.classes = classesResult.data || [];

  populateDependentFields();
}

function populateDependentFields() {
  const institutionId = getSelectedInstitutionId();
  const courseId = getSelectedCourseId();

  const students = institutionId ? filteredStudents(institutionId) : [];
  const courses = institutionId ? filteredCourses(institutionId) : [];
  const classes = institutionId && courseId
    ? filteredClasses(institutionId, courseId)
    : [];

  setOptions(
    "studentSelect",
    students,
    "id",
    studentLabel,
    institutionId ? "Select student" : "Select institution first"
  );

  setOptions(
    "courseSelect",
    courses,
    "id",
    courseLabel,
    institutionId ? "Select course" : "Select institution first"
  );

  setOptions(
    "classSelect",
    classes,
    "id",
    classLabel,
    courseId ? "Select class" : "Select course first"
  );
}

async function loadEnrollments() {
  /*
   * These joins assume the normal foreign-key relationships:
   * enrollments.student_id -> students.id
   * enrollments.course_id -> courses.id
   * enrollments.class_id -> classes.id
   *
   * If PostgREST reports an ambiguous/missing relationship,
   * we must adjust the select to match your exact FK names.
   */
  const { data, error } = await db
    .from("enrollments")
    .select(`
      id,
      institution_id,
      student_id,
      course_id,
      class_id,
      enrollment_number,
      enrollment_date,
      start_date,
      end_date,
      status,
      students!enrollments_student_id_fkey (
        id,
        student_id,
        full_name,
        institution_id
      ),
      courses!enrollments_course_id_fkey (
        id,
        name,
        code
      ),
      classes!enrollments_class_id_fkey (
        id,
        name,
        code
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    /*
     * Do not silently hide an API/schema error.
     * The user needs the real message to diagnose relationships.
     */
    throw error;
  }

  state.enrollments = data || [];
  renderEnrollments();
  renderStats();
}

function renderStats() {
  const rows = state.enrollments;

  $("totalCount").textContent = rows.length;
  $("activeCount").textContent =
    rows.filter((row) => row.status === "active").length;
  $("completedCount").textContent =
    rows.filter((row) => row.status === "completed").length;
  $("otherCount").textContent =
    rows.filter((row) => ["suspended", "dropped"].includes(row.status)).length;
}

function renderEnrollments() {
  const search = $("searchInput").value.trim().toLowerCase();
  const institutionId = $("filterInstitution").value;
  const courseId = $("filterCourse").value;
  const status = $("filterStatus").value;

  const rows = state.enrollments.filter((row) => {
    const student = row.students || {};
    const matchesSearch =
      !search ||
      String(student.full_name || "").toLowerCase().includes(search) ||
      String(student.student_id || "").toLowerCase().includes(search);

    return matchesSearch &&
      (!institutionId || row.institution_id === institutionId) &&
      (!courseId || row.course_id === courseId) &&
      (!status || row.status === status);
  });

  $("resultLabel").textContent = `${rows.length} record${rows.length === 1 ? "" : "s"}`;

  const body = $("enrollmentTableBody");

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7" class="empty">
          No enrollment records found for the selected filters.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows.map((row) => {
    const student = row.students || {};
    const course = row.courses || {};
    const classRow = row.classes || {};

    return `
      <tr>
        <td>${escapeHtml(student.student_id || "—")}</td>
        <td>${escapeHtml(student.full_name || "Unknown student")}</td>
        <td>${escapeHtml(course.name || "—")}</td>
        <td>${escapeHtml(classRow.name || "—")}</td>
        <td>${escapeHtml(formatDate(row.enrollment_date))}</td>
        <td>${statusBadge(row.status)}</td>
        <td class="no-print">
          <div class="actions">
            <button
              class="btn btn-light"
              type="button"
              data-action="edit"
              data-id="${escapeHtml(row.id)}"
              title="Edit enrollment"
            >
              <i class="fa-solid fa-pen"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openForm() {
  clearMessage("formMessage");
  $("formPanel").hidden = false;
  $("formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeForm() {
  $("formPanel").hidden = true;
  $("enrollmentForm").reset();
  $("enrollmentId").value = "";
  state.editingId = null;

  if (state.profile?.role === "school_admin") {
    $("institutionSelect").value = state.profile.institution_id || "";
  }

  $("enrollmentDate").value = todayISO();
  $("startDate").value = todayISO();
  $("statusSelect").value = "active";

  populateDependentFields();
  clearMessage("formMessage");
}

async function startNewEnrollment() {
  closeForm();

  if (state.profile?.role === "super_admin") {
    $("institutionSelect").disabled = false;
    $("institutionSelect").value = "";
  } else {
    $("institutionSelect").disabled = true;
  }

  $("studentSelect").disabled = false;
  $("courseSelect").disabled = false;
  $("classSelect").disabled = false;

  openForm();
}

function openEditForm(enrollmentId) {
  const row = state.enrollments.find((item) => item.id === enrollmentId);

  if (!row) {
    showMessage("Enrollment record was not found. Refresh and try again.", "error");
    return;
  }

  closeForm();

  state.editingId = row.id;
  $("enrollmentId").value = row.id;
  $("formTitle").innerHTML =
    '<i class="fa-solid fa-pen"></i> Edit Enrollment';

  $("institutionSelect").value = row.institution_id;
  populateDependentFields();

  $("studentSelect").value = row.student_id;
  $("courseSelect").value = row.course_id;
  populateDependentFields();
  $("classSelect").value = row.class_id;

  $("enrollmentDate").value = row.enrollment_date || todayISO();
  $("startDate").value = row.start_date || "";
  $("endDate").value = row.end_date || "";
  $("statusSelect").value = row.status || "active";

  /*
   * Do not allow changing the student/institution through edit.
   * This avoids accidental cross-institution reassignment.
   */
  $("institutionSelect").disabled = true;
  $("studentSelect").disabled = true;
  $("courseSelect").disabled = true;
  $("classSelect").disabled = false;

  openForm();
}

async function validateSelection() {
  const institutionId = getSelectedInstitutionId();
  const studentId = selectedStudentId();
  const courseId = getSelectedCourseId();
  const classId = getSelectedClassId();

  if (!institutionId || !studentId || !courseId || !classId) {
    throw new Error("Select an institution, student, course and class.");
  }

  const student = state.students.find((item) => item.id === studentId);
  const course = state.courses.find((item) => item.id === courseId);
  const classRow = state.classes.find((item) => item.id === classId);

  if (!student || student.institution_id !== institutionId) {
    throw new Error("The selected student does not belong to this institution.");
  }

  if (!course || course.institution_id !== institutionId) {
    throw new Error("The selected course does not belong to this institution.");
  }

  if (
    !classRow ||
    classRow.institution_id !== institutionId ||
    classRow.course_id !== courseId
  ) {
    throw new Error("The selected class does not match this institution and course.");
  }

  return { institutionId, studentId, courseId, classId };
}

async function saveEnrollment(event) {
  event.preventDefault();

  if (state.busy) return;

  setBusy(true);
  clearMessage("formMessage");

  try {
    const selection = await validateSelection();

    const payload = {
      institution_id: selection.institutionId,
      student_id: selection.studentId,
      course_id: selection.courseId,
      class_id: selection.classId,
      enrollment_date: $("enrollmentDate").value,
      start_date: $("startDate").value || null,
      end_date: $("endDate").value || null,
      status: $("statusSelect").value
    };

    if (!payload.enrollment_date) {
      throw new Error("Enrollment date is required.");
    }

    if (
      payload.start_date &&
      payload.end_date &&
      payload.end_date < payload.start_date
    ) {
      throw new Error("End date cannot be earlier than start date.");
    }

    if (state.editingId) {
      /*
       * Update only the selected enrollment record.
       * RLS must verify the user's permission.
       */
      const { error } = await db
        .from("enrollments")
        .update({
          class_id: payload.class_id,
          enrollment_date: payload.enrollment_date,
          start_date: payload.start_date,
          end_date: payload.end_date,
          status: payload.status
        })
        .eq("id", state.editingId)
        .eq("institution_id", payload.institution_id);

      if (error) throw error;

      showMessage("Enrollment updated successfully.", "success", "formMessage");
    } else {
      /*
       * Prevent creating a duplicate enrollment for the same student.
       * The database should also have a suitable unique constraint.
       */
      const { data: existing, error: existingError } = await db
        .from("enrollments")
        .select("id, status")
        .eq("student_id", payload.student_id)
        .limit(1);

      if (existingError) throw existingError;

      if (existing && existing.length) {
        throw new Error(
          "This student already has an enrollment. Edit the existing record instead."
        );
      }

      const { error } = await db
        .from("enrollments")
        .insert(payload);

      if (error) throw error;

      showMessage("Enrollment created successfully.", "success", "formMessage");
    }

    await loadEnrollments();

    window.setTimeout(() => {
      closeForm();
      showMessage("Enrollment records refreshed.", "success");
    }, 700);
  } catch (error) {
    console.error("Enrollment save failed:", error);

    showMessage(
      error?.message || "Could not save enrollment. Check your connection and permissions.",
      "error",
      "formMessage"
    );
  } finally {
    setBusy(false);
  }
}

async function loadFilterCourses() {
  const institutionId = $("filterInstitution").value;

  const rows = institutionId
    ? filteredCourses(institutionId)
    : state.courses;

  setOptions(
    "filterCourse",
    rows,
    "id",
    courseLabel,
    "All courses"
  );
}

async function refreshAll() {
  if (state.busy) return;

  setBusy(true);
  clearMessage();

  try {
    await loadEnrollments();
    showMessage("Enrollment records refreshed.", "success");
  } catch (error) {
    console.error("Enrollment refresh failed:", error);
    showMessage(
      error?.message || "Could not refresh enrollment records.",
      "error"
    );
  } finally {
    setBusy(false);
  }
}

function attachEvents() {
  $("newEnrollmentBtn").addEventListener("click", startNewEnrollment);
  $("closeFormBtn").addEventListener("click", closeForm);
  $("cancelFormBtn").addEventListener("click", closeForm);
  $("refreshBtn").addEventListener("click", refreshAll);
  $("printBtn").addEventListener("click", () => window.print());

  $("enrollmentForm").addEventListener("submit", saveEnrollment);

  $("institutionSelect").addEventListener("change", () => {
    $("courseSelect").value = "";
    populateDependentFields();
  });

  $("courseSelect").addEventListener("change", () => {
    $("classSelect").value = "";
    populateDependentFields();
  });

  $("searchInput").addEventListener("input", renderEnrollments);
  $("filterStatus").addEventListener("change", renderEnrollments);

  $("filterInstitution").addEventListener("change", async () => {
    await loadFilterCourses();
    renderEnrollments();
  });

  $("filterCourse").addEventListener("change", renderEnrollments);

  $("enrollmentTableBody").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='edit']");
    if (!button) return;

    openEditForm(button.dataset.id);
  });
}

async function boot() {
  $("enrollmentDate").value = todayISO();
  $("startDate").value = todayISO();

  attachEvents();

  try {
    const authenticated = await requireSignedInUser();
    if (!authenticated) return;

    await loadInstitutions();
    await loadReferenceData();
    await loadFilterCourses();
    await loadEnrollments();

    showMessage("Enrollment Management is ready.", "success");
  } catch (error) {
    console.error("Enrollment boot failed:", error);

    showMessage(
      `Could not initialize Enrollment Management: ${error?.message || "Unknown error"}`,
      "error"
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
