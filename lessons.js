"use strict";

/* =========================================================
GAAWOW EMS — LESSONS MANAGEMENT V1
Supabase + Classes + Teachers + Institutions

Existing database tables are used.
No database schema or RLS policies are modified.
========================================================= */

(() => {
if (window.__gaawowLessonsLoaded) return;
window.__gaawowLessonsLoaded = true;

const SUPABASE_URL =
"https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
"sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const client = window.supabase?.createClient
? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
: null;

const $ = id => document.getElementById(id);

const state = {
user: null,
profile: null,
role: "",
institutions: [],
classes: [],
teachers: [],
lessons: [],
loading: false
};

const isSuperAdmin = () => state.role === "super_admin";
const isSchoolAdmin = () => state.role === "school_admin";
const isTeacher = () => state.role === "teacher";

const canManageInstitution = () =>
isSuperAdmin() || isSchoolAdmin();

function escapeHTML(value) {
return String(value ?? "").replace(/[&<>"']/g, ch => ({
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'"
})[ch]);
}

function notice(message, type = "info") {
const el = $("notice");
el.className = "notice show ${type}";
el.textContent = message;
}

function clearNotice() {
$("notice").className = "notice";
$("notice").textContent = "";
}

function friendlyError(error) {
const message = error?.message || String(error);

if (/row-level security|permission denied|not allowed/i.test(message)) {
  return "Supabase ayaa diiday hawshan sababtoo ah rukhsadaha RLS. Hubi role-ka iyo policies-ka jira. Ha damin RLS.";
}

if (/foreign key|violates.*constraint/i.test(message)) {
  return "Database-ku ma oggolaan hawshan sababtoo ah casharku wuxuu ku xirnaan karaa xog kale.";
}

return message;

}

function todayLocal() {
const d = new Date();

return [
  d.getFullYear(),
  String(d.getMonth() + 1).padStart(2, "0"),
  String(d.getDate()).padStart(2, "0")
].join("-");

}

function institutionName(id) {
return state.institutions.find(x => x.id === id)?.name || "Institution";
}

function className(id) {
const item = state.classes.find(x => x.id === id);

if (!item) return "Class";

return `${item.name || "Class"}${item.code ? " (" + item.code + ")" : ""}`;

}

function teacherName(id) {
const item = state.teachers.find(x => x.id === id);

return item?.full_name || item?.email || "Teacher";

}

function timeText(value) {
return value ? String(value).slice(0, 5) : "—";
}

function setBusy(value) {
state.loading = value;
$("saveLessonBtn").disabled = value;
$("refreshBtn").disabled = value;
$("addLessonBtn").disabled = value;

$("saveLessonBtn").textContent =
  value ? "Saving..." : "Save Lesson";

}

function openModal() {
$("lessonModal").classList.add("open");
}

function closeModal() {
$("lessonModal").classList.remove("open");
$("lessonForm").reset();
$("lessonId").value = "";
$("institutionId").disabled = false;
$("teacherId").disabled = false;
$("modalTitle").textContent = "Add Lesson";
$("saveLessonBtn").textContent = "Save Lesson";
}

async function init() {
if (!client) {
notice(
"Supabase library failed to load. Check your internet connection.",
"error"
);
return;
}

try {
  const {
    data: { session },
    error: sessionError
  } = await client.auth.getSession();

  if (sessionError) throw sessionError;

  if (!session?.user) {
    window.location.href = "index.html";
    return;
  }

  state.user = session.user;

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id,full_name,email,role,is_active,institution_id")
    .eq("id", state.user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!profile || profile.is_active !== true) {
    notice(
      "Active EMS profile not found. Contact your administrator.",
      "error"
    );
    return;
  }

  state.profile = profile;
  state.role = String(profile.role || "").toLowerCase();

  if (!["super_admin", "school_admin", "teacher"].includes(state.role)) {
    notice("Your account cannot access Lessons Management.", "error");
    return;
  }

  if (!isSuperAdmin() && !profile.institution_id) {
    notice(
      "Your profile has no institution assigned. Ask the administrator to correct it.",
      "error"
    );
    return;
  }

  $("roleBadge").textContent =
    state.role.replaceAll("_", " ").toUpperCase();

  bindEvents();

  await loadInstitutions();
  await loadReferenceData();
  await loadLessons();

} catch (error) {
  console.error("Lessons initialization:", error);
  notice(
    "Unable to initialize Lessons Management: " + friendlyError(error),
    "error"
  );
}

}

function bindEvents() {
$("addLessonBtn").addEventListener("click", async () => {
clearNotice();

  $("lessonForm").reset();
  $("lessonId").value = "";
  $("lessonDate").value = todayLocal();

  $("modalTitle").textContent = "Add Lesson";
  $("saveLessonBtn").textContent = "Save Lesson";

  if (isSuperAdmin()) {
    $("institutionId").disabled = false;
    $("institutionId").value = "";
  } else {
    $("institutionId").value = state.profile.institution_id;
    $("institutionId").disabled = true;
  }

  $("teacherId").disabled = false;

  await refreshFormOptions();

  if (isTeacher()) {
    $("teacherId").value = state.user.id;
    $("teacherId").disabled = true;
  }

  openModal();
});

$("closeModalBtn").addEventListener("click", closeModal);
$("cancelModalBtn").addEventListener("click", closeModal);

$("lessonModal").addEventListener("click", event => {
  if (event.target === $("lessonModal")) closeModal();
});

$("institutionId").addEventListener("change", refreshFormOptions);

$("filterInstitution").addEventListener("change", async () => {
  await loadFilterClasses();
  renderLessons();
});

$("filterClass").addEventListener("change", renderLessons);
$("searchLessons").addEventListener("input", renderLessons);

$("refreshBtn").addEventListener("click", async () => {
  clearNotice();

  try {
    await loadReferenceData();
    await loadLessons();
    notice("Lesson list refreshed.", "success");
  } catch (error) {
    notice(friendlyError(error), "error");
  }
});

$("lessonForm").addEventListener("submit", saveLesson);

}

async function loadInstitutions() {
let query = client
.from("institutions")
.select("id,name")
.order("name");

if (!isSuperAdmin()) {
  query = query.eq("id", state.profile.institution_id);
}

const { data, error } = await query;

if (error) throw error;

state.institutions = data || [];

const options = state.institutions.map(item =>
  `<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)}</option>`
).join("");

$("institutionId").innerHTML =
  `<option value="">Select Institution</option>${options}`;

$("filterInstitution").innerHTML = isSuperAdmin()
  ? `<option value="">All Institutions</option>${options}`
  : options;

if (!isSuperAdmin()) {
  $("institutionId").value = state.profile.institution_id;
  $("institutionId").disabled = true;

  $("filterInstitution").value =
    state.profile.institution_id;
}

}

async function loadReferenceData() {
let classQuery = client
.from("classes")
.select("id,institution_id,course_id,name,code,academic_year,teacher_id,room")
.order("name");

if (!isSuperAdmin()) {
  classQuery = classQuery.eq(
    "institution_id",
    state.profile.institution_id
  );
}

const {
  data: classes,
  error: classError
} = await classQuery;

if (classError) throw classError;

state.classes = classes || [];

let teacherQuery = client
  .from("profiles")
  .select("id,full_name,email,role,is_active,institution_id")
  .eq("role", "teacher")
  .eq("is_active", true)
  .order("full_name");

if (!isSuperAdmin()) {
  teacherQuery = teacherQuery.eq(
    "institution_id",
    state.profile.institution_id
  );
}

const {
  data: teachers,
  error: teacherError
} = await teacherQuery;

if (teacherError) throw teacherError;

state.teachers = teachers || [];

await loadFilterClasses();

}

async function loadFilterClasses() {
const institutionId = $("filterInstitution").value;

let items = state.classes;

if (institutionId) {
  items = items.filter(
    item => item.institution_id === institutionId
  );
}

if (isTeacher()) {
  items = items.filter(
    item => item.teacher_id === state.user.id
  );
}

$("filterClass").innerHTML =
  `<option value="">All Classes</option>` +
  items.map(item =>
    `<option value="${escapeHTML(item.id)}">${
      escapeHTML(className(item.id))
    }</option>`
  ).join("");

}

async function refreshFormOptions() {
const institutionId = $("institutionId").value;

let classes = state.classes.filter(
  item => item.institution_id === institutionId
);

let teachers = state.teachers.filter(
  item => item.institution_id === institutionId
);

if (isTeacher()) {
  classes = classes.filter(
    item => item.teacher_id === state.user.id
  );

  teachers = teachers.filter(
    item => item.id === state.user.id
  );
}

$("classId").innerHTML =
  `<option value="">Select Class</option>` +
  classes.map(item =>
    `<option value="${escapeHTML(item.id)}">${
      escapeHTML(className(item.id))
    }</option>`
  ).join("");

$("teacherId").innerHTML =
  `<option value="">Select Teacher</option>` +
  teachers.map(item =>
    `<option value="${escapeHTML(item.id)}">${
      escapeHTML(teacherName(item.id))
    }</option>`
  ).join("");

if (isTeacher()) {
  $("teacherId").value = state.user.id;
  $("teacherId").disabled = true;
}

}

async function loadLessons() {
$("lessonsRows").innerHTML =
"<tr><td colspan="8" class="empty">Loading lessons...</td></tr>";

let query = client
  .from("lessons")
  .select(
    "id,institution_id,class_id,teacher_id,title,description,lesson_date,start_time,end_time,room"
  )
  .order("lesson_date", { ascending: false })
  .order("start_time", { ascending: true });

if (!isSuperAdmin()) {
  query = query.eq(
    "institution_id",
    state.profile.institution_id
  );
}

if (isTeacher()) {
  query = query.eq("teacher_id", state.user.id);
}

const { data, error } = await query;

if (error) {
  console.error(error);

  $("lessonsRows").innerHTML =
    `<tr><td colspan="8" class="empty">${
      escapeHTML(friendlyError(error))
    }</td></tr>`;

  notice("Could not load lessons: " + friendlyError(error), "error");
  return;
}

state.lessons = data || [];
renderLessons();

}

function renderLessons() {
const institutionFilter = $("filterInstitution").value;
const classFilter = $("filterClass").value;
const search = $("searchLessons").value.trim().toLowerCase();

const items = state.lessons.filter(lesson => {
  if (
    institutionFilter &&
    lesson.institution_id !== institutionFilter
  ) return false;

  if (classFilter && lesson.class_id !== classFilter) {
    return false;
  }

  const text = [
    lesson.title,
    lesson.description,
    lesson.room,
    institutionName(lesson.institution_id),
    className(lesson.class_id),
    teacherName(lesson.teacher_id)
  ].join(" ").toLowerCase();

  return !search || text.includes(search);
});

$("lessonCount").textContent = items.length;

if (!items.length) {
  $("lessonsRows").innerHTML =
    `<tr><td colspan="8" class="empty">No lessons found. Click Add Lesson to create one.</td></tr>`;
  return;
}

$("lessonsRows").innerHTML = items.map(lesson => `
  <tr>
    <td><strong>${escapeHTML(lesson.title || "Untitled")}</strong>
      ${lesson.description
        ? `<div style="margin-top:5px;color:#64748B">${escapeHTML(lesson.description)}</div>`
        : ""}
    </td>
    <td>${escapeHTML(institutionName(lesson.institution_id))}</td>
    <td>${escapeHTML(className(lesson.class_id))}</td>
    <td>${escapeHTML(teacherName(lesson.teacher_id))}</td>
    <td>${escapeHTML(lesson.lesson_date || "—")}</td>
    <td>${escapeHTML(timeText(lesson.start_time))}–${escapeHTML(timeText(lesson.end_time))}</td>
    <td>${escapeHTML(lesson.room || "—")}</td>
    <td>
      <div class="actions">
        <button class="btn light"
          data-action="edit"
          data-id="${escapeHTML(lesson.id)}"
          type="button">Edit</button>
        <button class="btn danger"
          data-action="delete"
          data-id="${escapeHTML(lesson.id)}"
          type="button">Delete</button>
      </div>
    </td>
  </tr>
`).join("");

$("lessonsRows").querySelectorAll("[data-action]").forEach(button => {
  button.addEventListener("click", () => {
    const lesson = state.lessons.find(
      item => item.id === button.dataset.id
    );

    if (!lesson) return;

    if (button.dataset.action === "edit") {
      editLesson(lesson);
    }

    if (button.dataset.action === "delete") {
      deleteLesson(lesson);
    }
  });
});

}

async function editLesson(lesson) {
clearNotice();

if (
  !canManageInstitution() &&
  !(isTeacher() && lesson.teacher_id === state.user.id)
) {
  notice("You cannot edit this lesson.", "error");
  return;
}

$("lessonForm").reset();
$("lessonId").value = lesson.id;
$("modalTitle").textContent = "Edit Lesson";

$("institutionId").value = lesson.institution_id;
$("institutionId").disabled = !isSuperAdmin();

$("teacherId").disabled = false;

await refreshFormOptions();

$("classId").value = lesson.class_id;
$("teacherId").value = lesson.teacher_id;
$("lessonTitle").value = lesson.title || "";
$("lessonDate").value = lesson.lesson_date || "";
$("startTime").value = timeText(lesson.start_time) === "—"
  ? "" : timeText(lesson.start_time);
$("endTime").value = timeText(lesson.end_time) === "—"
  ? "" : timeText(lesson.end_time);
$("room").value = lesson.room || "";
$("description").value = lesson.description || "";

if (isTeacher()) {
  $("teacherId").value = state.user.id;
  $("teacherId").disabled = true;
}

$("saveLessonBtn").textContent = "Update Lesson";
openModal();

}

async function saveLesson(event) {
event.preventDefault();

if (state.loading) return;

clearNotice();

const lessonId = $("lessonId").value || null;
const institutionId = $("institutionId").value;
const classId = $("classId").value;
const teacherId = isTeacher()
  ? state.user.id
  : $("teacherId").value;

const title = $("lessonTitle").value.trim();
const lessonDate = $("lessonDate").value;
const startTime = $("startTime").value;
const endTime = $("endTime").value;
const room = $("room").value.trim() || null;
const description = $("description").value.trim() || null;

if (
  !institutionId || !classId || !teacherId ||
  !title || !lessonDate || !startTime || !endTime
) {
  notice("Please complete all required fields.", "error");
  return;
}

if (endTime <= startTime) {
  notice("End time must be later than start time.", "error");
  return;
}

const selectedClass = state.classes.find(
  item => item.id === classId
);

if (
  !selectedClass ||
  selectedClass.institution_id !== institutionId
) {
  notice(
    "The selected class does not belong to the selected institution.",
    "error"
  );
  return;
}

const selectedTeacher = state.teachers.find(
  item => item.id === teacherId
);

if (
  !selectedTeacher ||
  selectedTeacher.institution_id !== institutionId
) {
  notice(
    "The selected teacher does not belong to the selected institution or is inactive.",
    "error"
  );
  return;
}

if (
  isTeacher() &&
  selectedClass.teacher_id !== state.user.id
) {
  notice(
    "You can only assign lessons to a class assigned to your profile.",
    "error"
  );
  return;
}

const payload = {
  institution_id: institutionId,
  class_id: classId,
  teacher_id: teacherId,
  title,
  description,
  lesson_date: lessonDate,
  start_time: startTime,
  end_time: endTime,
  room
};

setBusy(true);

try {
  let result;

  if (lessonId) {
    result = await client
      .from("lessons")
      .update(payload)
      .eq("id", lessonId)
      .select("id")
      .maybeSingle();
  } else {
    result = await client
      .from("lessons")
      .insert(payload)
      .select("id")
      .maybeSingle();
  }

  if (result.error) throw result.error;

  if (!result.data) {
    throw new Error(
      "No lesson row was returned. RLS may have blocked the operation."
    );
  }

  closeModal();

  notice(
    lessonId
      ? "Lesson updated successfully."
      : "Lesson created successfully.",
    "success"
  );

  await loadLessons();

} catch (error) {
  console.error("Save lesson:", error);

  notice(
    "Lesson was not saved: " + friendlyError(error),
    "error"
  );
} finally {
  setBusy(false);
}

}

async function deleteLesson(lesson) {
const confirmed = confirm(
"Delete lesson "${lesson.title || "Untitled lesson"}"?\n\n" +
"This action cannot be undone. The database may prevent deletion if attendance records depend on this lesson."
);

if (!confirmed) return;

clearNotice();

try {
  const { error } = await client
    .from("lessons")
    .delete()
    .eq("id", lesson.id);

  if (error) throw error;

  notice("Lesson deleted successfully.", "success");

  await loadLessons();

} catch (error) {
  console.error("Delete lesson:", error);

  notice(
    "Lesson was not deleted: " + friendlyError(error),
    "error"
  );
}

}

init();
})();
