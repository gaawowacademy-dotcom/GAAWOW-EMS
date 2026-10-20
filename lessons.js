"use strict";

/* =========================================================
   GAAWOW EMS — LESSONS MANAGEMENT V2
   Supabase + Institutions + Classes + Teachers + Lessons

   Uses existing database tables.
   Does not modify database schema or RLS policies.
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
    loading: false,
    initialized: false
  };

  const isSuperAdmin = () => state.role === "super_admin";
  const isSchoolAdmin = () => state.role === "school_admin";
  const isTeacher = () => state.role === "teacher";

  const canManageInstitution = () =>
    isSuperAdmin() || isSchoolAdmin();

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function notice(message, type = "info") {
    const el = $("notice");
    if (!el) {
      console[type === "error" ? "error" : "log"](message);
      return;
    }

    el.className = `notice show ${type}`;
    el.textContent = String(message ?? "");
  }

  function clearNotice() {
    const el = $("notice");
    if (!el) return;

    el.className = "notice";
    el.textContent = "";
  }

  function friendlyError(error) {
    const message = error?.message || String(error);

    if (/row-level security|permission denied|not allowed/i.test(message)) {
      return "Supabase wuxuu diiday hawshan sababtoo ah rukhsadaha RLS. Hubi role-ka iyo policies-ka jira. Ha damin RLS.";
    }

    if (/foreign key|violates.*constraint/i.test(message)) {
      return "Database-ku wuu diiday hawshan sababtoo ah xog kale ayuu casharku ku xiran yahay. Hubi Institution, Class iyo Teacher.";
    }

    if (/failed to fetch|networkerror|fetch failed/i.test(message)) {
      return "Xiriirka Supabase ayaa fashilmay. Hubi internet-ka oo isku day Refresh.";
    }

    if (/does not exist|schema cache/i.test(message)) {
      return "Jadwal ama column database-ka laga codsaday lama helin. Waxaa loo baahan yahay in la hubiyo magacyada columns-ka.";
    }

    return message;
  }

  function todayLocal() {
    const date = new Date();

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function institutionName(id) {
    return state.institutions.find(item => item.id === id)?.name
      || "Institution";
  }

  function className(id) {
    const item = state.classes.find(entry => entry.id === id);

    if (!item) return "Class";

    return `${item.name || "Class"}${item.code ? ` (${item.code})` : ""}`;
  }

  function teacherName(id) {
    const item = state.teachers.find(entry => entry.id === id);

    return item?.full_name || item?.email || "Teacher";
  }

  function timeText(value) {
    return value ? String(value).slice(0, 5) : "—";
  }

  function requiredElement(id) {
    const element = $(id);

    if (!element) {
      throw new Error(
        `HTML element "${id}" lama helin. Hubi in lessons.html iyo lessons.js is waafaqaan.`
      );
    }

    return element;
  }

  function setBusy(value) {
    state.loading = value;

    const saveButton = $("saveLessonBtn");
    const refreshButton = $("refreshBtn");
    const addButton = $("addLessonBtn");

    if (saveButton) saveButton.disabled = value;
    if (refreshButton) refreshButton.disabled = value;
    if (addButton) addButton.disabled = value;

    if (saveButton && !value) {
      saveButton.textContent = $("lessonId")?.value
        ? "Update Lesson"
        : "Save Lesson";
    } else if (saveButton) {
      saveButton.textContent = "Saving...";
    }
  }

  function openModal() {
    requiredElement("lessonModal").classList.add("open");
  }

  function closeModal() {
    const modal = $("lessonModal");
    const form = $("lessonForm");

    if (modal) modal.classList.remove("open");
    if (form) form.reset();

    if ($("lessonId")) $("lessonId").value = "";

    if ($("institutionId")) {
      $("institutionId").disabled = !isSuperAdmin();

      if (!isSuperAdmin() && state.profile) {
        $("institutionId").value = state.profile.institution_id;
      }
    }

    if ($("teacherId")) {
      $("teacherId").disabled = isTeacher();
    }

    if ($("modalTitle")) $("modalTitle").textContent = "Add Lesson";

    if ($("saveLessonBtn")) {
      $("saveLessonBtn").textContent = "Save Lesson";
    }
  }

  async function init() {
    try {
      if (!client) {
        throw new Error(
          "Supabase library lama soo degin. Hubi in Supabase JavaScript CDN uu ka horreeyo lessons.js."
        );
      }

      requiredElement("notice");
      requiredElement("institutionId");
      requiredElement("filterInstitution");
      requiredElement("filterClass");
      requiredElement("lessonsRows");

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
        throw new Error(
          "Active EMS profile lama helin. La xiriir maamulka."
        );
      }

      state.profile = profile;
      state.role = String(profile.role || "").toLowerCase();

      if (!["super_admin", "school_admin", "teacher"].includes(state.role)) {
        throw new Error(
          "Akoontani ma laha rukhsad ay ku geli karto Lessons Management."
        );
      }

      if (!isSuperAdmin() && !profile.institution_id) {
        throw new Error(
          "Profile-kaagu kuma xirna Institution. Maamulaha ha saxo institution_id."
        );
      }

      if ($("roleBadge")) {
        $("roleBadge").textContent =
          state.role.replaceAll("_", " ").toUpperCase();
      }

      bindEvents();

      notice("Loading institutions...", "info");
      await loadInstitutions();

      notice("Loading classes and teachers...", "info");
      await loadReferenceData();

      notice("Loading lessons...", "info");
      await loadLessons();

      state.initialized = true;
      clearNotice();

    } catch (error) {
      console.error("GAAWOW Lessons initialization:", error);

      notice(
        "Lessons Management ma furmin: " + friendlyError(error),
        "error"
      );
    }
  }

  function bindEvents() {
    requiredElement("addLessonBtn").addEventListener("click", async () => {
      try {
        clearNotice();

        requiredElement("lessonForm").reset();
        requiredElement("lessonId").value = "";
        requiredElement("lessonDate").value = todayLocal();

        requiredElement("modalTitle").textContent = "Add Lesson";
        requiredElement("saveLessonBtn").textContent = "Save Lesson";

        if (isSuperAdmin()) {
          requiredElement("institutionId").disabled = false;
          requiredElement("institutionId").value = "";
        } else {
          requiredElement("institutionId").value =
            state.profile.institution_id;
          requiredElement("institutionId").disabled = true;
        }

        requiredElement("teacherId").disabled = false;

        await refreshFormOptions();
        openModal();

      } catch (error) {
        console.error("Open lesson form:", error);
        notice(friendlyError(error), "error");
      }
    });

    requiredElement("closeModalBtn").addEventListener("click", closeModal);
    requiredElement("cancelModalBtn").addEventListener("click", closeModal);

    requiredElement("lessonModal").addEventListener("click", event => {
      if (event.target === $("lessonModal")) closeModal();
    });

    requiredElement("institutionId").addEventListener("change", async () => {
      try {
        await refreshFormOptions();
      } catch (error) {
        notice(friendlyError(error), "error");
      }
    });

    requiredElement("filterInstitution").addEventListener("change", async () => {
      try {
        await loadFilterClasses();
        renderLessons();
      } catch (error) {
        notice(friendlyError(error), "error");
      }
    });

    requiredElement("filterClass").addEventListener("change", renderLessons);
    requiredElement("searchLessons").addEventListener("input", renderLessons);

    requiredElement("refreshBtn").addEventListener("click", async () => {
      if (state.loading) return;

      clearNotice();

      try {
        await loadInstitutions();
        await loadReferenceData();
        await loadLessons();

        notice("Lesson list refreshed.", "success");
      } catch (error) {
        console.error("Refresh lessons:", error);
        notice(friendlyError(error), "error");
      }
    });

    requiredElement("lessonForm").addEventListener("submit", saveLesson);
  }

  async function loadInstitutions() {
    const institutionSelect = requiredElement("institutionId");
    const filterSelect = requiredElement("filterInstitution");

    institutionSelect.innerHTML =
      '<option value="">Loading institutions...</option>';

    filterSelect.innerHTML =
      '<option value="">Loading institutions...</option>';

    let query = client
      .from("institutions")
      .select("id,name")
      .order("name");

    if (!isSuperAdmin()) {
      query = query.eq("id", state.profile.institution_id);
    }

    const { data, error } = await query;

    if (error) {
      institutionSelect.innerHTML =
        '<option value="">Could not load institutions</option>';

      filterSelect.innerHTML =
        '<option value="">Could not load institutions</option>';

      console.error("Load institutions error:", error);
      throw new Error(
        "Institution lama soo rari karin. " + friendlyError(error)
      );
    }

    state.institutions = data || [];

    if (!state.institutions.length) {
      institutionSelect.innerHTML =
        '<option value="">No institution available</option>';

      filterSelect.innerHTML =
        '<option value="">No institution available</option>';

      throw new Error(
        "Institution xogtiisa lama helin. Hubi in institution-ku jiro iyo in akhriska RLS loo oggol yahay."
      );
    }

    const options = state.institutions.map(item =>
      `<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)}</option>`
    ).join("");

    institutionSelect.innerHTML =
      `<option value="">Select Institution</option>${options}`;

    filterSelect.innerHTML = isSuperAdmin()
      ? `<option value="">All Institutions</option>${options}`
      : options;

    if (!isSuperAdmin()) {
      institutionSelect.value = state.profile.institution_id;
      institutionSelect.disabled = true;

      filterSelect.value = state.profile.institution_id;
    } else {
      institutionSelect.disabled = false;
    }
  }

  async function loadReferenceData() {
    let classQuery = client
      .from("classes")
      .select(
        "id,institution_id,course_id,name,code,academic_year,teacher_id,room"
      )
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
    const filter = requiredElement("filterInstitution");
    const selectedInstitution = filter.value;

    let items = state.classes;

    if (selectedInstitution) {
      items = items.filter(
        item => item.institution_id === selectedInstitution
      );
    }

    if (isTeacher()) {
      items = items.filter(
        item => item.teacher_id === state.user.id
      );
    }

    requiredElement("filterClass").innerHTML =
      '<option value="">All Classes</option>' +
      items.map(item =>
        `<option value="${escapeHTML(item.id)}">${escapeHTML(className(item.id))}</option>`
      ).join("");
  }

  async function refreshFormOptions() {
    const institutionId = requiredElement("institutionId").value;

    const classes = state.classes.filter(
      item => item.institution_id === institutionId
    );

    let teachers = state.teachers.filter(
      item => item.institution_id === institutionId
    );

    let allowedClasses = classes;

    if (isTeacher()) {
      allowedClasses = classes.filter(
        item => item.teacher_id === state.user.id
      );

      teachers = teachers.filter(
        item => item.id === state.user.id
      );
    }

    requiredElement("classId").innerHTML =
      '<option value="">Select Class</option>' +
      allowedClasses.map(item =>
        `<option value="${escapeHTML(item.id)}">${escapeHTML(className(item.id))}</option>`
      ).join("");

    requiredElement("teacherId").innerHTML =
      '<option value="">Select Teacher</option>' +
      teachers.map(item =>
        `<option value="${escapeHTML(item.id)}">${escapeHTML(teacherName(item.id))}</option>`
      ).join("");

    if (isTeacher()) {
      requiredElement("teacherId").value = state.user.id;
      requiredElement("teacherId").disabled = true;
    } else {
      requiredElement("teacherId").disabled = false;
    }
  }

  async function loadLessons() {
    const rows = requiredElement("lessonsRows");

    rows.innerHTML =
      '<tr><td colspan="8" class="empty">Loading lessons...</td></tr>';

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
      console.error("Load lessons error:", error);

      rows.innerHTML =
        `<tr><td colspan="8" class="empty">${escapeHTML(friendlyError(error))}</td></tr>`;

      notice("Could not load lessons: " + friendlyError(error), "error");
      return;
    }

    state.lessons = data || [];
    renderLessons();
  }

  function renderLessons() {
    const institutionFilter = requiredElement("filterInstitution").value;
    const classFilter = requiredElement("filterClass").value;
    const search = requiredElement("searchLessons").value.trim().toLowerCase();

    const items = state.lessons.filter(lesson => {
      if (
        institutionFilter &&
        lesson.institution_id !== institutionFilter
      ) return false;

      if (classFilter && lesson.class_id !== classFilter) return false;

      const searchableText = [
        lesson.title,
        lesson.description,
        lesson.room,
        institutionName(lesson.institution_id),
        className(lesson.class_id),
        teacherName(lesson.teacher_id)
      ].join(" ").toLowerCase();

      return !search || searchableText.includes(search);
    });

    requiredElement("lessonCount").textContent = items.length;

    if (!items.length) {
      requiredElement("lessonsRows").innerHTML =
        '<tr><td colspan="8" class="empty">No lessons found. Click Add Lesson to create one.</td></tr>';
      return;
    }

    requiredElement("lessonsRows").innerHTML = items.map(lesson => `
      <tr>
        <td>
          <strong>${escapeHTML(lesson.title || "Untitled")}</strong>
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

    requiredElement("lessonsRows")
      .querySelectorAll("[data-action]")
      .forEach(button => {
        button.addEventListener("click", async () => {
          const lesson = state.lessons.find(
            item => item.id === button.dataset.id
          );

          if (!lesson) return;

          try {
            if (button.dataset.action === "edit") {
              await editLesson(lesson);
            } else if (button.dataset.action === "delete") {
              await deleteLesson(lesson);
            }
          } catch (error) {
            console.error("Lesson action:", error);
            notice(friendlyError(error), "error");
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

    requiredElement("lessonForm").reset();
    requiredElement("lessonId").value = lesson.id;
    requiredElement("modalTitle").textContent = "Edit Lesson";

    requiredElement("institutionId").value = lesson.institution_id;
    requiredElement("institutionId").disabled = !isSuperAdmin();

    await refreshFormOptions();

    requiredElement("classId").value = lesson.class_id;
    requiredElement("teacherId").value = lesson.teacher_id;
    requiredElement("lessonTitle").value = lesson.title || "";
    requiredElement("lessonDate").value = lesson.lesson_date || "";
    requiredElement("startTime").value = timeText(lesson.start_time) === "—"
      ? ""
      : timeText(lesson.start_time);
    requiredElement("endTime").value = timeText(lesson.end_time) === "—"
      ? ""
      : timeText(lesson.end_time);
    requiredElement("room").value = lesson.room || "";
    requiredElement("description").value = lesson.description || "";

    if (isTeacher()) {
      requiredElement("teacherId").value = state.user.id;
      requiredElement("teacherId").disabled = true;
    }

    requiredElement("saveLessonBtn").textContent = "Update Lesson";
    openModal();
  }

  async function saveLesson(event) {
    event.preventDefault();

    if (state.loading) return;

    clearNotice();

    const lessonId = requiredElement("lessonId").value || null;
    const institutionId = requiredElement("institutionId").value;
    const classId = requiredElement("classId").value;
    const teacherId = isTeacher()
      ? state.user.id
      : requiredElement("teacherId").value;

    const title = requiredElement("lessonTitle").value.trim();
    const lessonDate = requiredElement("lessonDate").value;
    const startTime = requiredElement("startTime").value;
    const endTime = requiredElement("endTime").value;
    const room = requiredElement("room").value.trim() || null;
    const description =
      requiredElement("description").value.trim() || null;

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
      if (lessonId) {
        const { error } = await client
          .from("lessons")
          .update(payload)
          .eq("id", lessonId);

        if (error) throw error;
      } else {
        const { error } = await client
          .from("lessons")
          .insert(payload);

        if (error) throw error;
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
    if (
      !canManageInstitution() &&
      !(isTeacher() && lesson.teacher_id === state.user.id)
    ) {
      notice("You cannot delete this lesson.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Delete lesson "${lesson.title || "Untitled lesson"}"?\n\n` +
      "This action cannot be undone. Related records may prevent deletion."
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
