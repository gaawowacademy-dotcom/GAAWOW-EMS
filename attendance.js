"use strict";

/* =========================================================
   GAAWOW EMS — ATTENDANCE MANAGEMENT
   Version 2.0

   Files:
   - attendance.html
   - attendance.js

   Supabase tables:
   - profiles
   - lessons
   - classes
   - enrollments
   - students
   - attendance

   IMPORTANT:
   Attendance date is derived from lessons.lesson_date.
   The attendance table has no separate attendance_date column.
   ========================================================= */

(() => {
  if (window.__gaawowAttendanceLoaded) {
    return;
  }

  window.__gaawowAttendanceLoaded = true;

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const $ = (id) => document.getElementById(id);

  const state = {
    user: null,
    profile: null,
    role: null,
    lessons: [],
    selectedLesson: null,
    students: [],
    draft: new Map(),
    attendanceRecords: new Map(),
    busy: false
  };

  const ALLOWED_ROLES = new Set([
    "teacher",
    "school_admin",
    "super_admin"
  ]);

  const VALID_STATUSES = new Set([
    "present",
    "absent",
    "late",
    "excused"
  ]);

  /* -------------------------------------------------------
     USER INTERFACE HELPERS
     ------------------------------------------------------- */

  function showMessage(type, message) {
    const ids = ["error", "success", "info"];

    ids.forEach((id) => {
      const element = $(id);

      if (element) {
        element.textContent = "";
        element.classList.remove("show");
      }
    });

    const target = $(type);

    if (!target) return;

    target.textContent = message;
    target.classList.add("show");
  }

  function clearMessages() {
    ["error", "success", "info"].forEach((id) => {
      const element = $(id);

      if (element) {
        element.textContent = "";
        element.classList.remove("show");
      }
    });
  }

  function showError(message) {
    showMessage("error", message);
  }

  function showSuccess(message) {
    showMessage("success", message);
  }

  function showInfo(message) {
    showMessage("info", message);
  }

  function setBusy(value, message = "Please wait...") {
    state.busy = Boolean(value);

    const busyElement = $("busy");

    if (busyElement) {
      busyElement.classList.toggle("show", state.busy);

      busyElement.innerHTML = state.busy
        ? `<i class="fa-solid fa-spinner fa-spin"></i> ${escapeHtml(message)}`
        : "";
    }

    [
      "lesson",
      "load",
      "clearSearch",
      "save"
    ].forEach((id) => {
      const element = $(id);

      if (element) {
        element.disabled = state.busy;
      }
    });

    updateSaveButton();
  }

  function updateSaveButton() {
    const button = $("save");

    if (!button) return;

    button.disabled =
      state.busy ||
      !state.selectedLesson ||
      state.students.length === 0;

    button.innerHTML = state.busy
      ? '<i class="fa-solid fa-spinner fa-spin"></i> Please wait...'
      : '<i class="fa-solid fa-floppy-disk"></i> Save Attendance';
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[char];
    });
  }

  function formatRole(role) {
    const labels = {
      super_admin: "Super Admin",
      school_admin: "School Admin",
      teacher: "Teacher"
    };

    return labels[role] || role || "Unknown";
  }

  function formatDate(value) {
    if (!value) return "Date not set";

    const date = String(value).slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }

    return date;
  }

  function getFriendlyError(error, fallback) {
    if (!error) return fallback;

    const message =
      error.message ||
      error.details ||
      error.hint ||
      fallback;

    return String(message);
  }

  function setEmptyRows(message, icon = "fa-users") {
    $("rows").innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <i class="fa-solid ${icon}"></i>
            ${escapeHtml(message)}
          </div>
        </td>
      </tr>
    `;

    $("visibleCount").textContent = "0 students shown";
  }

  function resetStats() {
    $("total").textContent = "0";
    $("present").textContent = "0";
    $("absent").textContent = "0";
    $("other").textContent = "0";
  }

  /* -------------------------------------------------------
     AUTHENTICATION AND PROFILE
     ------------------------------------------------------- */

  async function checkSession() {
    const {
      data: { session },
      error
    } = await db.auth.getSession();

    if (error) {
      throw new Error(
        "Could not check the login session: " + error.message
      );
    }

    if (!session || !session.user) {
      showError(
        "Your session has expired or you are not logged in. Please log in again."
      );

      window.setTimeout(() => {
        window.location.href = "index.html";
      }, 1800);

      return false;
    }

    state.user = session.user;

    return true;
  }

  async function loadProfile() {
    if (!state.user) {
      throw new Error("No authenticated user was found.");
    }

    const { data, error } = await db
      .from("profiles")
      .select(
        "id, full_name, email, role, is_active, institution_id"
      )
      .eq("id", state.user.id)
      .maybeSingle();

    if (error) {
      throw new Error(
        "Could not load your profile: " + error.message
      );
    }

    if (!data) {
      throw new Error(
        "Your Supabase Auth account does not have a matching profiles record."
      );
    }

    if (data.is_active !== true) {
      throw new Error(
        "Your account is inactive. Contact the Super Admin."
      );
    }

    if (!ALLOWED_ROLES.has(data.role)) {
      throw new Error(
        "Your account does not have permission to open Attendance Management."
      );
    }

    state.profile = data;
    state.role = data.role;

    const accountName =
      data.full_name ||
      data.email ||
      state.user.email ||
      "Signed-in user";

    const accountEmail =
      data.email ||
      state.user.email ||
      "";

    $("account").innerHTML = `
      <div class="account-info">
        <strong>Signed in as:</strong>
        ${escapeHtml(accountName)}
        ${accountEmail
          ? `<br><span>${escapeHtml(accountEmail)}</span>`
          : ""}
      </div>

      <span class="role-badge">
        ${escapeHtml(formatRole(data.role))}
      </span>
    `;

    if (
      data.role !== "super_admin" &&
      !data.institution_id
    ) {
      throw new Error(
        "Your profile does not have an institution_id. Ask the Super Admin to assign your institution."
      );
    }
  }

  /* -------------------------------------------------------
     LESSONS
     ------------------------------------------------------- */

  async function loadLessons() {
    clearMessages();

    setBusy(true, "Loading lessons...");

    try {
      let query = db
        .from("lessons")
        .select(
          "id, institution_id, class_id, teacher_id, title, lesson_date, start_time, end_time, room"
        )
        .order("lesson_date", { ascending: false })
        .limit(500);

      if (state.role === "teacher") {
        query = query.eq("teacher_id", state.user.id);
      } else if (state.role === "school_admin") {
        query = query.eq(
          "institution_id",
          state.profile.institution_id
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(
          "Could not load lessons: " + error.message
        );
      }

      let lessons = data || [];

      /*
       * For non-super-admin accounts, enforce the institution
       * boundary in the UI as an additional safeguard.
       * Supabase RLS remains the real security boundary.
       */
      if (
        state.role !== "super_admin" &&
        state.profile.institution_id
      ) {
        lessons = lessons.filter(
          (lesson) =>
            lesson.institution_id ===
            state.profile.institution_id
        );
      }

      state.lessons = lessons;

      const select = $("lesson");

      select.innerHTML =
        '<option value="">-- Select a lesson --</option>';

      if (lessons.length === 0) {
        setEmptyRows(
          "No lessons are available for your account.",
          "fa-book-open"
        );

        showInfo(
          state.role === "teacher"
            ? "No lessons are assigned to your teacher account. Ask the administrator to check lessons.teacher_id."
            : "No lessons were found for the selected institution or account."
        );

        clearStudentState();
        return;
      }

      const classIds = [
        ...new Set(
          lessons
            .map((lesson) => lesson.class_id)
            .filter(Boolean)
        )
      ];

      const classNames = new Map();

      if (classIds.length > 0) {
        const { data: classes, error: classError } = await db
          .from("classes")
          .select("id, name")
          .in("id", classIds);

        if (!classError && classes) {
          classes.forEach((item) => {
            classNames.set(item.id, item.name);
          });
        }
      }

      lessons.forEach((lesson) => {
        const option = document.createElement("option");

        option.value = lesson.id;

        const title =
          lesson.title ||
          "Untitled lesson";

        const className =
          classNames.get(lesson.class_id) ||
          "Class not found";

        const date =
          formatDate(lesson.lesson_date);

        option.textContent =
          `${title} | ${className} | ${date}`;

        select.appendChild(option);
      });

      if (lessons.length === 1) {
        select.value = lessons[0].id;
        await loadStudents();
      } else {
        clearStudentState();

        showInfo(
          "Choose a lesson from the list to load its enrolled students."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  function getSelectedLesson() {
    const lessonId = $("lesson").value;

    return (
      state.lessons.find(
        (lesson) => lesson.id === lessonId
      ) || null
    );
  }

  /* -------------------------------------------------------
     STUDENT AND ENROLLMENT LOADING
     ------------------------------------------------------- */

  function clearStudentState() {
    state.selectedLesson = null;
    state.students = [];
    state.draft = new Map();
    state.attendanceRecords = new Map();

    $("date").value = "";
    $("search").value = "";

    resetStats();

    setEmptyRows(
      "Select a lesson to display its enrolled students."
    );

    $("saveHint").textContent =
      "Select a lesson to load its enrolled students.";

    updateSaveButton();
  }

  async function loadStudents() {
    clearMessages();

    const lesson = getSelectedLesson();

    if (!lesson) {
      clearStudentState();

      showInfo("Please select a lesson first.");

      return;
    }

    setBusy(true, "Loading enrolled students...");

    try {
      state.selectedLesson = lesson;
      state.students = [];
      state.draft = new Map();
      state.attendanceRecords = new Map();

      $("date").value =
        lesson.lesson_date
          ? String(lesson.lesson_date).slice(0, 10)
          : "";

      resetStats();

      /*
       * Attendance is tied to a lesson.
       * A teacher should only load attendance for a lesson
       * assigned to their authenticated user ID.
       */
      if (
        state.role === "teacher" &&
        lesson.teacher_id !== state.user.id
      ) {
        throw new Error(
          "This lesson is not assigned to your teacher account."
        );
      }

      if (
        state.role !== "super_admin" &&
        lesson.institution_id !==
          state.profile.institution_id
      ) {
        throw new Error(
          "This lesson belongs to another institution."
        );
      }

      if (!lesson.class_id) {
        throw new Error(
          "This lesson does not have a class_id assigned."
        );
      }

      /*
       * Load active enrollments for this class and institution.
       */
      let enrollmentQuery = db
        .from("enrollments")
        .select("student_id, status")
        .eq("class_id", lesson.class_id)
        .eq("institution_id", lesson.institution_id)
        .eq("status", "active");

      const {
        data: enrollments,
        error: enrollmentError
      } = await enrollmentQuery;

      if (enrollmentError) {
        throw new Error(
          "Could not load class enrollments: " +
          enrollmentError.message
        );
      }

      const studentIds = [
        ...new Set(
          (enrollments || [])
            .map((item) => item.student_id)
            .filter(Boolean)
        )
      ];

      if (studentIds.length === 0) {
        state.students = [];

        setEmptyRows(
          "No active student enrollments were found for this class.",
          "fa-user-slash"
        );

        $("saveHint").textContent =
          "No enrolled students are available for this lesson.";

        updateStats();
        updateSaveButton();

        showInfo(
          "Check that students have active enrollments for this class and institution."
        );

        return;
      }

      /*
       * Fetch student records by their primary IDs.
       */
      const { data: students, error: studentsError } = await db
        .from("students")
        .select(
          "id, student_id, full_name, institution_id, status"
        )
        .in("id", studentIds)
        .eq("institution_id", lesson.institution_id)
        .eq("status", "active")
        .order("full_name", { ascending: true });

      if (studentsError) {
        throw new Error(
          "Could not load student records: " +
          studentsError.message
        );
      }

      state.students = students || [];

      if (state.students.length === 0) {
        setEmptyRows(
          "Enrollments were found, but no active student records matched the selected institution.",
          "fa-user-slash"
        );

        $("saveHint").textContent =
          "No active student records are available.";

        updateStats();
        updateSaveButton();

        showInfo(
          "Verify students.institution_id, students.status, and enrollments.student_id."
        );

        return;
      }

      /*
       * Load existing attendance for this lesson.
       */
      const { data: records, error: attendanceError } = await db
        .from("attendance")
        .select(
          "id, lesson_id, student_id, status, notes"
        )
        .eq("lesson_id", lesson.id)
        .eq("institution_id", lesson.institution_id)
        .in(
          "student_id",
          state.students.map((student) => student.id)
        );

      if (attendanceError) {
        throw new Error(
          "Students loaded, but existing attendance could not be read: " +
          attendanceError.message
        );
      }

      /*
       * Keep the original attendance row ID for updates.
       */
      (records || []).forEach((record) => {
        state.attendanceRecords.set(
          record.student_id,
          record
        );
      });

      /*
       * The draft map is the source of truth.
       * It is independent of visible table rows, so searching
       * cannot accidentally remove students from the save.
       */
      state.students.forEach((student) => {
        const existing =
          state.attendanceRecords.get(student.id);

        const status =
          existing && VALID_STATUSES.has(
            String(existing.status).toLowerCase()
          )
            ? String(existing.status).toLowerCase()
            : "present";

        state.draft.set(student.id, {
          status,
          notes: existing?.notes || ""
        });
      });

      renderStudents();
      updateStats();
      updateSaveButton();

      $("saveHint").textContent =
        `${state.students.length} student(s) loaded. Saving will include all loaded students, including students hidden by search.`;

      showSuccess(
        `${state.students.length} student(s) loaded successfully.`
      );
    } finally {
      setBusy(false);
    }
  }

  /* -------------------------------------------------------
     RENDERING AND SEARCH
     ------------------------------------------------------- */

  function getFilteredStudents() {
    const search = $("search").value
      .trim()
      .toLowerCase();

    if (!search) {
      return state.students;
    }

    return state.students.filter((student) => {
      const name = String(
        student.full_name || ""
      ).toLowerCase();

      const studentId = String(
        student.student_id || ""
      ).toLowerCase();

      return (
        name.includes(search) ||
        studentId.includes(search)
      );
    });
  }

  function renderStudents() {
    const rows = $("rows");
    const filteredStudents = getFilteredStudents();

    $("visibleCount").textContent =
      `${filteredStudents.length} of ${state.students.length} students shown`;

    if (state.students.length === 0) {
      setEmptyRows(
        "No students have been loaded for this lesson."
      );

      return;
    }

    if (filteredStudents.length === 0) {
      setEmptyRows(
        "No students match your search. Clear the search to see all students.",
        "fa-magnifying-glass"
      );

      return;
    }

    rows.innerHTML = "";

    filteredStudents.forEach((student, index) => {
      const draft = state.draft.get(student.id) || {
        status: "present",
        notes: ""
      };

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${index + 1}</td>

        <td>
          <div class="student-name">
            ${escapeHtml(student.full_name || "Unnamed student")}
          </div>
        </td>

        <td>
          ${escapeHtml(student.student_id || "No student ID")}
        </td>

        <td>
          <select
            class="status-select"
            data-student-id="${escapeHtml(student.id)}"
            aria-label="Attendance status"
          >
            <option value="present"
              ${draft.status === "present" ? "selected" : ""}>
              Present
            </option>

            <option value="absent"
              ${draft.status === "absent" ? "selected" : ""}>
              Absent
            </option>

            <option value="late"
              ${draft.status === "late" ? "selected" : ""}>
              Late
            </option>

            <option value="excused"
              ${draft.status === "excused" ? "selected" : ""}>
              Excused
            </option>
          </select>
        </td>

        <td>
          <input
            type="text"
            class="notes-input"
            data-student-id="${escapeHtml(student.id)}"
            value="${escapeHtml(draft.notes)}"
            maxlength="500"
            placeholder="Optional notes"
            aria-label="Attendance notes"
          >
        </td>
      `;

      rows.appendChild(tr);
    });
  }

  function updateStats() {
    const total = state.students.length;

    let present = 0;
    let absent = 0;
    let other = 0;

    state.students.forEach((student) => {
      const draft = state.draft.get(student.id);

      const status = String(
        draft?.status || "present"
      ).toLowerCase();

      if (status === "present") {
        present++;
      } else if (status === "absent") {
        absent++;
      } else {
        other++;
      }
    });

    $("total").textContent = total;
    $("present").textContent = present;
    $("absent").textContent = absent;
    $("other").textContent = other;
  }

  /*
   * Save changes in the draft map before rerendering.
   */
  function handleTableChange(event) {
    const target = event.target;

    const studentId = target.dataset.studentId;

    if (!studentId) return;

    const current = state.draft.get(studentId);

    if (!current) return;

    if (target.classList.contains("status-select")) {
      const status = target.value.toLowerCase();

      if (!VALID_STATUSES.has(status)) {
        showError("Invalid attendance status selected.");
        return;
      }

      current.status = status;
    }

    if (target.classList.contains("notes-input")) {
      current.notes = target.value;
    }

    state.draft.set(studentId, current);

    updateStats();
  }

  /* -------------------------------------------------------
     SAVE ATTENDANCE
     ------------------------------------------------------- */

  async function saveAttendance() {
    clearMessages();

    const lesson = state.selectedLesson;

    if (!lesson) {
      showError("Please select a lesson first.");
      return;
    }

    if (state.students.length === 0) {
      showError(
        "No students are loaded. Select a lesson and load its students first."
      );

      return;
    }

    if (
      state.role === "teacher" &&
      lesson.teacher_id !== state.user.id
    ) {
      showError(
        "You cannot save attendance for a lesson that is not assigned to you."
      );

      return;
    }

    if (
      state.role !== "super_admin" &&
      lesson.institution_id !==
        state.profile.institution_id
    ) {
      showError(
        "You cannot save attendance for another institution."
      );

      return;
    }

    /*
     * IMPORTANT:
     * Build the payload from state.students and state.draft.
     * Never build it from visible HTML table rows.
     * Therefore, a search filter cannot omit students.
     */
    const payloads = state.students.map((student) => {
      const draft = state.draft.get(student.id) || {
        status: "present",
        notes: ""
      };

      return {
        student_id: student.id,
        status: String(draft.status).toLowerCase(),
        notes: String(draft.notes || "").trim()
      };
    });

    const invalid = payloads.find(
      (item) => !VALID_STATUSES.has(item.status)
    );

    if (invalid) {
      showError(
        "One or more students have an invalid attendance status."
      );

      return;
    }

    const confirmed = window.confirm(
      `Save attendance for all ${payloads.length} loaded students?\n\n` +
      "Students hidden by search will also be included."
    );

    if (!confirmed) return;

    setBusy(true, "Saving attendance records...");

    try {
      let saved = 0;
      const failures = [];

      /*
       * Update existing rows using their attendance.id.
       * Insert a row when no existing attendance record exists.
       *
       * This avoids assuming a particular unique constraint
       * for Supabase upsert.
       */
      for (const item of payloads) {
        const existing =
          state.attendanceRecords.get(item.student_id);

        const row = {
          institution_id: lesson.institution_id,
          lesson_id: lesson.id,
          student_id: item.student_id,
          status: item.status,
          notes: item.notes || null,
          recorded_by: state.user.id
        };

        let result;

        if (existing && existing.id) {
          result = await db
            .from("attendance")
            .update(row)
            .eq("id", existing.id)
            .select(
              "id, lesson_id, student_id, status, notes"
            )
            .maybeSingle();
        } else {
          result = await db
            .from("attendance")
            .insert(row)
            .select(
              "id, lesson_id, student_id, status, notes"
            )
            .single();
        }

        if (result.error) {
          failures.push({
            studentId: item.student_id,
            error: result.error.message
          });

          continue;
        }

        if (result.data) {
          state.attendanceRecords.set(
            item.student_id,
            result.data
          );
        }

        saved++;
      }

      /*
       * Keep all the edits in the local draft map.
       * Successful records now have their saved row IDs.
       */
      renderStudents();
      updateStats();

      if (failures.length > 0) {
        const first = failures[0];

        console.error(
          "Attendance save failures:",
          failures
        );

        showError(
          `Saved ${saved} of ${payloads.length} attendance record(s). ` +
          `${failures.length} record(s) failed. ` +
          `First error: ${first.error}. ` +
          "Check Supabase attendance RLS policies, status enum values, and lesson assignment."
        );

        return;
      }

      showSuccess(
        `Attendance saved successfully for all ${saved} loaded students.`
      );

      $("saveHint").textContent =
        `Saved ${saved} attendance record(s).`;

    } catch (error) {
      console.error("Attendance save error:", error);

      showError(
        getFriendlyError(
          error,
          "An unexpected error occurred while saving attendance."
        )
      );
    } finally {
      setBusy(false);
    }
  }

  /* -------------------------------------------------------
     EVENTS
     ------------------------------------------------------- */

  function bindEvents() {
    $("lesson").addEventListener("change", async () => {
      clearMessages();

      if (!$("lesson").value) {
        clearStudentState();
        return;
      }

      try {
        await loadStudents();
      } catch (error) {
        console.error(error);

        showError(
          getFriendlyError(
            error,
            "Could not load the selected lesson."
          )
        );
      }
    });

    $("load").addEventListener("click", async () => {
      try {
        await loadStudents();
      } catch (error) {
        console.error(error);

        showError(
          getFriendlyError(
            error,
            "Could not reload students."
          )
        );
      }
    });

    $("search").addEventListener("input", () => {
      renderStudents();
    });

    $("clearSearch").addEventListener("click", () => {
      $("search").value = "";
      renderStudents();
    });

    $("rows").addEventListener(
      "change",
      handleTableChange
    );

    $("rows").addEventListener(
      "input",
      handleTableChange
    );

    $("save").addEventListener("click", async () => {
      await saveAttendance();
    });
  }

  /* -------------------------------------------------------
     INITIALIZATION
     ------------------------------------------------------- */

  async function init() {
    $("year").textContent = new Date().getFullYear();

    resetStats();

    setEmptyRows(
      "Checking authentication...",
      "fa-spinner fa-spin"
    );

    setBusy(true, "Checking account...");

    try {
      const hasSession = await checkSession();

      if (!hasSession) {
        return;
      }

      await loadProfile();

      bindEvents();

      await loadLessons();

    } catch (error) {
      console.error(
        "GAAWOW Attendance initialization error:",
        error
      );

      showError(
        getFriendlyError(
          error,
          "Attendance Management could not be initialized."
        )
      );

      setEmptyRows(
        "Attendance could not be loaded. Read the error message above.",
        "fa-triangle-exclamation"
      );
    } finally {
      setBusy(false);
    }
  }

  init();

})();
