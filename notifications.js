"use strict";

/* =========================================================
   GAAWOW EMS — NOTIFICATIONS MANAGEMENT V1
   Uses:
   - profiles
   - institutions
   - students
   - student_notifications

   Security:
   - Requires authenticated user
   - Requires active Super Admin or School Admin
   - Database RLS remains authoritative
   ========================================================= */

(() => {
  if (window.__gaawowNotificationsLoaded) return;
  window.__gaawowNotificationsLoaded = true;

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
    institutions: [],
    students: [],
    notifications: [],
    busy: false
  };

  const ADMIN_ROLES = new Set([
    "super_admin",
    "school_admin"
  ]);

  const NOTIFICATION_TYPES = new Set([
    "announcement",
    "exam",
    "attendance",
    "payment",
    "academic",
    "urgent"
  ]);

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return map[char];
    });
  }

  function showMessage(type, message) {
    ["error", "success", "info"].forEach((id) => {
      const element = $(id);
      element.textContent = "";
      element.classList.remove("show");
    });

    const element = $(type);

    if (!element) return;

    element.textContent = message;
    element.classList.add("show");
  }

  function clearMessages() {
    ["error", "success", "info"].forEach((id) => {
      $(id).textContent = "";
      $(id).classList.remove("show");
    });
  }

  function setBusy(value, message = "Please wait...") {
    state.busy = Boolean(value);

    $("busy").classList.toggle("show", state.busy);

    $("busy").innerHTML = state.busy
      ? `<i class="fa-solid fa-spinner fa-spin"></i> ${escapeHtml(message)}`
      : "";

    [
      "send",
      "refresh",
      "target",
      "institution",
      "student",
      "title",
      "type",
      "message"
    ].forEach((id) => {
      const element = $(id);
      if (element) element.disabled = state.busy;
    });
  }

  function errorText(error, fallback) {
    return String(
      error?.message ||
      error?.details ||
      error?.hint ||
      fallback
    );
  }

  function dateText(value) {
    if (!value) return "Unknown";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString();
  }

  function roleName(role) {
    return {
      super_admin: "Super Admin",
      school_admin: "School Admin"
    }[role] || role;
  }

  async function checkSession() {
    const {
      data: { session },
      error
    } = await db.auth.getSession();

    if (error) {
      throw new Error(
        "Could not check login session: " + error.message
      );
    }

    if (!session?.user) {
      showMessage(
        "error",
        "Please log in before opening Notifications Management."
      );

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1800);

      return false;
    }

    state.user = session.user;

    return true;
  }

  async function loadProfile() {
    const { data, error } = await db
      .from("profiles")
      .select(
        "id, full_name, email, role, is_active, institution_id"
      )
      .eq("id", state.user.id)
      .maybeSingle();

    if (error) {
      throw new Error(
        "Could not load profile: " + error.message
      );
    }

    if (!data) {
      throw new Error(
        "No profiles record matches the signed-in account."
      );
    }

    if (data.is_active === false) {
      throw new Error(
        "Your account is inactive. Contact the administrator."
      );
    }

    if (!ADMIN_ROLES.has(data.role)) {
      throw new Error(
        "Only Super Admin and School Admin can manage notifications."
      );
    }

    if (
      data.role === "school_admin" &&
      !data.institution_id
    ) {
      throw new Error(
        "Your School Admin account has no institution assigned."
      );
    }

    state.profile = data;
    state.role = data.role;

    $("account").innerHTML = `
      <div>
        <strong>Signed in:</strong>
        ${escapeHtml(
          data.full_name ||
          data.email ||
          state.user.email ||
          "Administrator"
        )}
        <br>
        <span style="color:#64748b;font-size:12px;">
          ${escapeHtml(data.email || state.user.email || "")}
        </span>
      </div>

      <span class="badge">
        ${escapeHtml(roleName(data.role))}
      </span>
    `;

    if (state.role === "school_admin") {
      $("target").innerHTML = `
        <option value="institution">My Institution</option>
        <option value="student">One Student</option>
      `;

      $("target").value = "institution";

      $("target").disabled = true;
    }
  }

  async function loadInstitutions() {
    let query = db
      .from("institutions")
      .select("id, name, code")
      .order("name", { ascending: true });

    if (state.role === "school_admin") {
      query = query.eq(
        "id",
        state.profile.institution_id
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        "Could not load institutions: " + error.message
      );
    }

    state.institutions = data || [];

    const select = $("institution");

    select.innerHTML =
      '<option value="">-- Select institution --</option>';

    state.institutions.forEach((institution) => {
      const option = document.createElement("option");

      option.value = institution.id;
      option.textContent =
        `${institution.name} (${institution.code || "No code"})`;

      select.appendChild(option);
    });

    if (state.role === "school_admin") {
      select.value = state.profile.institution_id;
      select.disabled = true;
    } else {
      select.disabled = false;
    }

    updateTargetFields();
  }

  async function loadStudentsForInstitution(institutionId) {
    state.students = [];

    const select = $("student");

    select.innerHTML =
      '<option value="">Loading students...</option>';

    if (!institutionId) {
      select.innerHTML =
        '<option value="">Select an institution first</option>';

      return;
    }

    let query = db
      .from("students")
      .select(
        "id, student_id, full_name, institution_id, status"
      )
      .eq("institution_id", institutionId)
      .order("full_name", { ascending: true })
      .limit(2000);

    /*
     * Only load active students for recipient selection.
     */
    query = query.eq("status", "active");

    const { data, error } = await query;

    if (error) {
      select.innerHTML =
        '<option value="">Could not load students</option>';

      throw new Error(
        "Could not load students: " + error.message
      );
    }

    state.students = data || [];

    select.innerHTML =
      '<option value="">-- Select student --</option>';

    state.students.forEach((student) => {
      const option = document.createElement("option");

      option.value = student.id;

      option.textContent =
        `${student.full_name} (${student.student_id || "No ID"})`;

      select.appendChild(option);
    });

    if (state.students.length === 0) {
      select.innerHTML =
        '<option value="">No active students found</option>';
    }
  }

  function updateTargetFields() {
    const target = $("target").value;

    $("institutionField").hidden = false;
    $("studentField").hidden = target !== "student";

    if (target === "all") {
      $("institutionField").hidden = true;
    }

    if (target === "student") {
      const institutionId = $("institution").value;

      if (institutionId) {
        loadStudentsForInstitution(institutionId)
          .catch((error) => {
            showMessage("error", errorText(
              error,
              "Could not load students."
            ));
          });
      } else {
        $("student").innerHTML =
          '<option value="">Select an institution first</option>';
      }
    }
  }

  async function getRecipients(target, institutionId, studentId) {
    if (target === "student") {
      if (!studentId) {
        throw new Error("Please select a student.");
      }

      const student = state.students.find(
        (item) => item.id === studentId
      );

      if (!student) {
        throw new Error(
          "The selected student is not available in the current institution."
        );
      }

      return [student.id];
    }

    let query = db
      .from("students")
      .select("id, institution_id")
      .eq("status", "active")
      .limit(5000);

    if (target === "institution") {
      if (!institutionId) {
        throw new Error("Please select an institution.");
      }

      query = query.eq(
        "institution_id",
        institutionId
      );
    }

    /*
     * School Admins are always restricted to their institution.
     */
    if (state.role === "school_admin") {
      query = query.eq(
        "institution_id",
        state.profile.institution_id
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        "Could not load notification recipients: " +
        error.message
      );
    }

    const ids = [
      ...new Set(
        (data || [])
          .map((student) => student.id)
          .filter(Boolean)
      )
    ];

    if (ids.length === 0) {
      throw new Error(
        "No active students were found for this notification."
      );
    }

    return ids;
  }

  async function createNotification(event) {
    event.preventDefault();

    clearMessages();

    const title = $("title").value.trim();
    const message = $("message").value.trim();
    const type = $("type").value;
    const target = $("target").value;
    const institutionId = $("institution").value;
    const studentId = $("student").value;

    if (!title || !message) {
      showMessage(
        "error",
        "Enter both a notification title and message."
      );

      return;
    }

    if (!NOTIFICATION_TYPES.has(type)) {
      showMessage(
        "error",
        "Please select a valid notification type."
      );

      return;
    }

    if (
      state.role === "school_admin" &&
      target === "all"
    ) {
      showMessage(
        "error",
        "School Admins cannot send notifications to all institutions."
      );

      return;
    }

    const targetLabel = {
      institution: "the selected institution",
      student: "the selected student",
      all: "all institutions"
    }[target];

    const confirmed = confirm(
      `Create this notification for ${targetLabel}?\n\n` +
      `Title: ${title}`
    );

    if (!confirmed) return;

    setBusy(true, "Preparing notification...");

    try {
      const recipients = await getRecipients(
        target,
        institutionId,
        studentId
      );

      const institutionName =
        state.institutions.find(
          (item) => item.id === institutionId
        )?.name || "";

      const confirmedAgain = confirm(
        `This will create ${recipients.length} notification record(s).\n\n` +
        `Title: ${title}\n` +
        `Recipient group: ${targetLabel}\n` +
        (institutionName
          ? `Institution: ${institutionName}\n`
          : "") +
        "\nContinue?"
      );

      if (!confirmedAgain) {
        return;
      }

      const createdAt = new Date().toISOString();

      /*
       * Insert records in batches.
       * The database schema has no institution_id column
       * on student_notifications, so we only insert known columns.
       */
      const batchSize = 100;
      let inserted = 0;

      for (
        let start = 0;
        start < recipients.length;
        start += batchSize
      ) {
        const batch = recipients
          .slice(start, start + batchSize)
          .map((recipientId) => ({
            student_id: recipientId,
            title,
            message,
            notification_type: type,
            is_read: false,
            read_at: null,
            created_at: createdAt
          }));

        const { error } = await db
          .from("student_notifications")
          .insert(batch);

        if (error) {
          throw new Error(
            `Inserted ${inserted} of ${recipients.length} notifications before an error occurred: ${error.message}`
          );
        }

        inserted += batch.length;
      }

      $("notificationForm").reset();

      await loadStudentsForInstitution(
        $("institution").value
      ).catch(() => {});

      await loadNotifications();

      showMessage(
        "success",
        `Notification created successfully for ${inserted} student(s).`
      );

    } catch (error) {
      console.error(
        "Create notification error:",
        error
      );

      showMessage(
        "error",
        errorText(
          error,
          "Could not create notification."
        )
      );
    } finally {
      setBusy(false);
      updateTargetFields();
    }
  }

  async function loadNotifications() {
    clearMessages();

    setBusy(true, "Loading notification history...");

    try {
      /*
       * Read rows allowed by the current user's RLS policies.
       * School Admins are filtered to their own institution
       * through the recipient students table after retrieval.
       */
      const { data, error } = await db
        .from("student_notifications")
        .select(
          "id, student_id, title, message, notification_type, is_read, read_at, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        throw new Error(
          "Could not load notification history: " +
          error.message
        );
      }

      let notifications = data || [];

      /*
       * For School Admins, keep only notifications whose
       * recipients belong to their institution.
       */
      if (state.role === "school_admin") {
        const studentIds = [
          ...new Set(
            notifications
              .map((item) => item.student_id)
              .filter(Boolean)
          )
        ];

        if (studentIds.length > 0) {
          const { data: students, error: studentError } = await db
            .from("students")
            .select("id")
            .eq(
              "institution_id",
              state.profile.institution_id
            )
            .in("id", studentIds);

          if (studentError) {
            throw new Error(
              "Could not verify notification recipients: " +
              studentError.message
            );
          }

          const allowedStudentIds = new Set(
            (students || []).map((item) => item.id)
          );

          notifications = notifications.filter(
            (item) => allowedStudentIds.has(item.student_id)
          );
        } else {
          notifications = [];
        }
      }

      state.notifications = notifications;

      await renderNotifications();
      updateStatistics();

    } finally {
      setBusy(false);
    }
  }

  async function renderNotifications() {
    const tbody = $("rows");

    if (state.notifications.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty">
              <i class="fa-solid fa-bell-slash"></i>
              No notifications found.
            </div>
          </td>
        </tr>
      `;

      return;
    }

    const studentIds = [
      ...new Set(
        state.notifications
          .map((item) => item.student_id)
          .filter(Boolean)
      )
    ];

    const studentMap = new Map();

    /*
     * Some RLS policies may restrict access to student rows.
     * If a name cannot be loaded, the notification still appears.
     */
    if (studentIds.length > 0) {
      const { data: students, error } = await db
        .from("students")
        .select("id, full_name, student_id")
        .in("id", studentIds);

      if (!error && students) {
        students.forEach((student) => {
          studentMap.set(student.id, student);
        });
      }
    }

    tbody.innerHTML = "";

    state.notifications.forEach((notification, index) => {
      const student = studentMap.get(
        notification.student_id
      );

      const recipientName = student
        ? `${student.full_name} (${student.student_id || "No ID"})`
        : notification.student_id;

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${index + 1}</td>

        <td>
          <div class="notification-title">
            ${escapeHtml(notification.title || "Untitled")}
          </div>

          <div class="notification-message">
            ${escapeHtml(notification.message || "")}
          </div>
        </td>

        <td>${escapeHtml(recipientName || "Unknown student")}</td>

        <td>${escapeHtml(notification.notification_type || "announcement")}</td>

        <td>
          ${
            notification.is_read
              ? `<span class="status-read">
                   <i class="fa-solid fa-circle-check"></i> Read
                 </span>`
              : `<span class="status-unread">
                   <i class="fa-solid fa-envelope"></i> Unread
                 </span>`
          }

          ${
            notification.read_at
              ? `<div class="hint">${escapeHtml(dateText(notification.read_at))}</div>`
              : ""
          }
        </td>

        <td>${escapeHtml(dateText(notification.created_at))}</td>

        <td>
          <button
            type="button"
            class="btn btn-danger delete-notification"
            data-id="${escapeHtml(notification.id)}"
          >
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  function updateStatistics() {
    const notifications = state.notifications;

    const uniqueStudents = new Set(
      notifications
        .map((item) => item.student_id)
        .filter(Boolean)
    );

    const readCount = notifications.filter(
      (item) => item.is_read === true
    ).length;

    const unreadCount = notifications.filter(
      (item) => item.is_read !== true
    ).length;

    $("total").textContent = notifications.length;
    $("recipients").textContent = uniqueStudents.size;
    $("read").textContent = readCount;
    $("unread").textContent = unreadCount;
  }

  async function deleteNotification(notificationId) {
    clearMessages();

    const notification = state.notifications.find(
      (item) => item.id === notificationId
    );

    if (!notification) {
      showMessage(
        "error",
        "This notification was not found in the current list."
      );

      return;
    }

    const confirmed = confirm(
      `Delete notification "${notification.title}"?\n\n` +
      "This action cannot be undone."
    );

    if (!confirmed) return;

    setBusy(true, "Deleting notification...");

    try {
      const { data, error } = await db
        .from("student_notifications")
        .delete()
        .eq("id", notificationId)
        .select("id");

      if (error) {
        throw new Error(
          "Could not delete notification: " +
          error.message
        );
      }

      if (!data || data.length === 0) {
        throw new Error(
          "No notification was deleted. Check your RLS delete policy and permissions."
        );
      }

      await loadNotifications();

      showMessage(
        "success",
        "Notification deleted successfully."
      );

    } catch (error) {
      console.error(
        "Delete notification error:",
        error
      );

      showMessage(
        "error",
        errorText(
          error,
          "Could not delete notification."
        )
      );
    } finally {
      setBusy(false);
    }
  }

  function bindEvents() {
    $("notificationForm").addEventListener(
      "submit",
      createNotification
    );

    $("target").addEventListener(
      "change",
      updateTargetFields
    );

    $("institution").addEventListener(
      "change",
      async () => {
        try {
          if ($("target").value === "student") {
            await loadStudentsForInstitution(
              $("institution").value
            );
          }
        } catch (error) {
          showMessage(
            "error",
            errorText(error, "Could not load students.")
          );
        }
      }
    );

    $("refresh").addEventListener(
      "click",
      async () => {
        try {
          await loadNotifications();

          showMessage(
            "success",
            "Notification history refreshed."
          );
        } catch (error) {
          showMessage(
            "error",
            errorText(error, "Refresh failed.")
          );
        }
      }
    );

    $("clearFilter").addEventListener(
      "click",
      async () => {
        try {
          await loadNotifications();
        } catch (error) {
          showMessage(
            "error",
            errorText(error, "Could not refresh notifications.")
          );
        }
      }
    );

    $("rows").addEventListener(
      "click",
      async (event) => {
        const button = event.target.closest(
          ".delete-notification"
        );

        if (!button) return;

        await deleteNotification(button.dataset.id);
      }
    );

    $("notificationForm").addEventListener(
      "reset",
      () => {
        setTimeout(() => {
          updateTargetFields();
        }, 0);
      }
    );
  }

  async function init() {
    $("year").textContent = new Date().getFullYear();

    setBusy(true, "Checking account...");

    try {
      const hasSession = await checkSession();

      if (!hasSession) return;

      await loadProfile();
      await loadInstitutions();

      bindEvents();

      await loadNotifications();

    } catch (error) {
      console.error(
        "Notifications initialization error:",
        error
      );

      showMessage(
        "error",
        errorText(
          error,
          "Notifications Management could not be initialized."
        )
      );

    } finally {
      setBusy(false);
    }
  }

  init();

})();
