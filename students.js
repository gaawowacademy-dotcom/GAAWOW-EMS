/* ============================================================
   GAAWOW EMS - students.js V7 (synced with student-account-modal)
   - Browser uses ONLY the Supabase publishable/anon key.
   - Account create/reset goes through the Edge Function:
       /functions/v1/create-student-account
   - "Create Account" opens the modal (window.openStudentAccountModal)
     and listens for the "studentAccountCreate" event from it.
   ============================================================ */

/* ---- Visible error reporter (so errors never give a blank page) ---- */
(function () {
  function showErr(msg) {
    const pre = document.createElement("pre");
    pre.style.cssText =
      "background:#fee;color:#900;padding:10px;margin:0;white-space:pre-wrap;position:relative;z-index:999999;font-size:12px";
    pre.textContent = msg;
    (document.body || document.documentElement).prepend(pre);
  }
  window.addEventListener("error", (e) =>
    showErr(`${e.message}\n${e.filename || ""}:${e.lineno || ""}`)
  );
  window.addEventListener("unhandledrejection", (e) =>
    showErr(String(e.reason?.message || e.reason))
  );
})();

(() => {
  "use strict";

  async function ensureSupabaseBrowser() {
    const ok = () =>
      !!(window.supabase && typeof window.supabase.createClient === "function");
    if (ok()) return true;

    const existing = document.querySelector(
      'script[data-gaawow-supabase-loader="true"]'
    );
    if (existing) {
      await new Promise((resolve) => {
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", finish, { once: true });
        setTimeout(finish, 8000);
      });
      return ok();
    }

    await new Promise((resolve) => {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      script.async = true;
      script.dataset.gaawowSupabaseLoader = "true";
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
      setTimeout(resolve, 10000);
    });

    return ok();
  }

  async function boot() {
    const supabaseReady = await ensureSupabaseBrowser();

    if (!supabaseReady) {
      console.error("GAAWOW Students: Supabase browser library is not loaded.");
      const message = document.getElementById("message");
      if (message) {
        message.textContent =
          "System could not start: Supabase library is not loaded. Please refresh the page.";
        message.className = "message error";
        message.style.display = "block";
      }
      return;
    }

    const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";
    const ACCOUNT_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-student-account`;

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    // ------------------------------------------------------------
    // DOM
    // ------------------------------------------------------------
    const $ = (id) => document.getElementById(id);

    const els = {
      message: $("message"),
      form: $("studentForm"),
      formTitle: $("formTitle"),
      editStudentDbId: $("editStudentDbId"),

      institutionSelect: $("institutionSelect"),
      studentId: $("studentId"),
      fullName: $("fullName"),
      gender: $("gender"),
      dateOfBirth: $("dateOfBirth"),
      phone: $("phone"),
      email: $("email"),
      admissionDate: $("admissionDate"),
      status: $("status"),
      address: $("address"),

      photoInput: $("photoInput"),
      photoPreview: $("photoPreview"),
      photoPlaceholder: $("photoPlaceholder"),

      accountStatus: $("accountStatus"),
      createAccountButton: $("createAccountButton"),
      resetPasswordButton: $("resetPasswordButton"),

      progressWrap: $("progressWrap"),
      progressBar: $("progressBar"),
      progressText: $("progressText"),

      saveButton: $("saveButton"),
      resetFormButton: $("resetFormButton"),
      addStudentButton: $("addStudentButton"),
      refreshStudentsButton: $("refreshStudentsButton"),

      searchInput: $("searchInput"),
      statusFilter: $("statusFilter"),
      studentsTableBody: $("studentsTableBody"),

      totalStudents: $("totalStudents"),
      activeStudents: $("activeStudents"),
      graduatedStudents: $("graduatedStudents"),
      otherStudents: $("otherStudents"),

      profileModal: $("profileModal"),
      closeProfileModal: $("closeProfileModal"),
      profileContent: $("profileContent"),
    };

    let students = [];
    let editingStudent = null;
    let searchTimer = null;

    // ------------------------------------------------------------
    // Responsive table fix
    // ------------------------------------------------------------
    function ensureResponsiveStudentTable() {
      const tbody = els.studentsTableBody;
      if (!tbody) return;
      const table = tbody.closest("table");
      if (!table) return;

      let wrapper = table.parentElement;
      if (!wrapper?.classList.contains("students-table-scroll")) {
        wrapper = document.createElement("div");
        wrapper.className = "students-table-scroll";
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }

      if (!document.getElementById("studentsResponsiveStyles")) {
        const style = document.createElement("style");
        style.id = "studentsResponsiveStyles";
        style.textContent = `
          html, body { max-width: 100%; overflow-x: hidden; }
          .students-table-scroll {
            width: 100%; max-width: 100%;
            overflow-x: auto; overflow-y: visible;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-x: contain;
            scrollbar-width: thin; border-radius: 12px;
          }
          .students-table-scroll table {
            width: max-content; min-width: 1050px;
            max-width: none; table-layout: auto;
          }
          .students-table-scroll th, .students-table-scroll td { white-space: nowrap; }
          .students-table-scroll td:nth-child(3),
          .students-table-scroll td:nth-child(6) {
            white-space: normal; min-width: 150px; max-width: 260px;
          }
          .students-table-scroll .actions {
            display: flex; flex-wrap: wrap; gap: 6px; min-width: 250px;
          }
          @media (max-width: 768px) {
            .students-table-scroll th, .students-table-scroll td { padding: 8px 10px; }
            .students-table-scroll .btn-small { min-height: 34px; }
          }
        `;
        document.head.appendChild(style);
      }

      if (!wrapper.querySelector(".students-table-scroll-hint")) {
        const hint = document.createElement("div");
        hint.className = "students-table-scroll-hint";
        hint.textContent = "Swipe left/right to view all student columns";
        hint.style.cssText =
          "font-size:12px;color:#64748b;padding:7px 2px 0;text-align:center;";
        wrapper.appendChild(hint);
      }
    }

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------
    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function showMessage(text, type = "success") {
      if (!els.message) return;
      els.message.textContent = text;
      els.message.className = `message ${type}`;
      els.message.style.display = "block";
      els.message.style.whiteSpace = "pre-line";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function hideMessage() {
      if (!els.message) return;
      els.message.style.display = "none";
      els.message.textContent = "";
      els.message.className = "message";
    }

    function setProgress(percent, text = "") {
      if (!els.progressWrap) return;
      els.progressWrap.style.display = "block";
      if (els.progressBar) {
        els.progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
      }
      if (els.progressText) els.progressText.textContent = text;
    }

    function hideProgress() {
      if (!els.progressWrap) return;
      els.progressWrap.style.display = "none";
      if (els.progressBar) els.progressBar.style.width = "0%";
      if (els.progressText) els.progressText.textContent = "";
    }

    function formatDate(value) {
      if (!value) return "—";
      try {
        return new Intl.DateTimeFormat("en-GB", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        }).format(new Date(value));
      } catch {
        return value;
      }
    }

    function statusBadge(status) {
      const normalized = String(status ?? "").toLowerCase();
      const className =
        normalized === "active"
          ? "status-active"
          : normalized === "graduated"
          ? "status-graduated"
          : normalized === "suspended"
          ? "status-suspended"
          : "status-inactive";
      return `<span class="status ${className}">${escapeHtml(status || "inactive")}</span>`;
    }

    function accountBadge(student) {
      if (student.auth_user_id) {
        return `<span class="status status-active">Account Active</span>`;
      }
      return `<span class="status status-inactive">No Account</span>`;
    }

    function getInitials(name) {
      const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return "ST";
      return parts.slice(0, 2).map((x) => x[0].toUpperCase()).join("");
    }

    function placeholderAvatar(name) {
      return `<div class="initials" aria-label="Student">${escapeHtml(getInitials(name))}</div>`;
    }

    function todayISO() {
      return new Date().toISOString().slice(0, 10);
    }

    // ------------------------------------------------------------
    // Supabase session
    // ------------------------------------------------------------
    async function getSessionOrThrow() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session?.access_token) {
        throw new Error("Access denied or login session expired. Please login again.");
      }
      return session;
    }

    async function refreshSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();
      if (error) {
        console.warn("SESSION REFRESH:", error);
        return null;
      }
      return session;
    }

    // ------------------------------------------------------------
    // Edge Function request
    // ------------------------------------------------------------
    async function callAccountFunction(payload) {
      const session = await getSessionOrThrow();

      async function request(currentSession) {
        return fetch(ACCOUNT_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      let response = await request(session);

      if (response.status === 401) {
        const refreshed = await refreshSession();
        if (!refreshed?.access_token) {
          throw new Error("Access denied or login session expired. Please login again.");
        }
        response = await request(refreshed);
      }

      let result = null;
      try {
        result = await response.json();
      } catch {
        throw new Error(`Edge Function returned invalid JSON (${response.status}).`);
      }

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            `Student account request failed (${response.status}).`
        );
      }
      return result;
    }

    // ------------------------------------------------------------
    // Institutions
    // ------------------------------------------------------------
    async function loadInstitutions() {
      if (!els.institutionSelect) return;

      els.institutionSelect.innerHTML = `<option value="">Loading institutions...</option>`;

      const { data, error } = await supabase
        .from("institutions")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("INSTITUTIONS ERROR:", error);
        els.institutionSelect.innerHTML = `<option value="">Unable to load institutions</option>`;
        showMessage(`Institutions could not be loaded: ${error.message}`, "error");
        return;
      }

      els.institutionSelect.innerHTML = `<option value="">Select institution</option>`;
      for (const institution of data ?? []) {
        const option = document.createElement("option");
        option.value = institution.id;
        option.textContent = institution.name || institution.id;
        els.institutionSelect.appendChild(option);
      }
    }

    // ------------------------------------------------------------
    // Student ID  (GA-2026-000119)
    // ------------------------------------------------------------
    async function generateNextStudentId() {
      const year = new Date().getFullYear();

      const { data, error } = await supabase
        .from("students")
        .select("student_id")
        .like("student_id", `GA-${year}-%`)
        .order("student_id", { ascending: false })
        .limit(1);

      if (error) {
        console.error("STUDENT ID ERROR:", error);
        throw new Error(`Unable to generate Student ID: ${error.message}`);
      }

      let nextNumber = 1;
      const latest = data?.[0]?.student_id ?? "";
      const match = latest.match(new RegExp(`^GA-${year}-(\\d+)$`));
      if (match) nextNumber = Number(match[1]) + 1;

      return `GA-${year}-${String(nextNumber).padStart(6, "0")}`;
    }

    // ------------------------------------------------------------
    // Load students
    // ------------------------------------------------------------
    async function loadStudents() {
      if (!els.studentsTableBody) return;

      els.studentsTableBody.innerHTML = `
        <tr><td colspan="10" class="empty">Loading students...</td></tr>`;

      let query = supabase
        .from("students")
        .select(`
          id, institution_id, student_id, full_name, gender, date_of_birth,
          phone, email, address, photo_url, admission_date, status,
          emergency_contact_name, emergency_contact_phone,
          created_at, updated_at, account_enabled, auth_user_id,
          login_username, account_created_at, last_login_at, password_changed_at
        `)
        .order("created_at", { ascending: false });

      const selectedStatus = els.statusFilter?.value?.trim();
      if (selectedStatus) query = query.eq("status", selectedStatus);

      const { data, error } = await query;

      if (error) {
        console.error("STUDENTS LOAD ERROR:", error);
        els.studentsTableBody.innerHTML = `
          <tr><td colspan="10" class="empty">Could not load students.</td></tr>`;
        showMessage(`Students could not be loaded: ${error.message}`, "error");
        return;
      }

      students = data ?? [];
      renderStudents();
      updateStats();
    }

    // ------------------------------------------------------------
    // Search/filter
    // ------------------------------------------------------------
    function getFilteredStudents() {
      const term = String(els.searchInput?.value ?? "").trim().toLowerCase();
      if (!term) return students;

      return students.filter((student) =>
        [
          student.student_id,
          student.full_name,
          student.phone,
          student.email,
          student.gender,
          student.status,
          student.login_username,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    }

    // ------------------------------------------------------------
    // Render
    // ------------------------------------------------------------
    function renderStudents() {
      const filtered = getFilteredStudents();

      if (!filtered.length) {
        els.studentsTableBody.innerHTML = `
          <tr><td colspan="10" class="empty">No students found.</td></tr>`;
        return;
      }

      els.studentsTableBody.innerHTML = filtered
        .map((student) => {
          // onerror no longer contains nested quotes / HTML (fixes broken attribute)
          const photo = student.photo_url
            ? `<img
                src="${escapeHtml(student.photo_url)}"
                class="student-photo"
                alt="Student photo"
                data-initials="${escapeHtml(getInitials(student.full_name))}"
                onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'initials',textContent:this.dataset.initials}))"
              >`
            : placeholderAvatar(student.full_name);

          return `
            <tr>
              <td>${photo}</td>
              <td><strong>${escapeHtml(student.student_id)}</strong></td>
              <td><strong>${escapeHtml(student.full_name)}</strong></td>
              <td>${escapeHtml(student.gender || "—")}</td>
              <td>${escapeHtml(student.phone || "—")}</td>
              <td>${escapeHtml(student.email || "—")}</td>
              <td>${statusBadge(student.status)}</td>
              <td>${escapeHtml(formatDate(student.admission_date))}</td>
              <td>${accountBadge(student)}</td>
              <td>
                <div class="actions">
                  <button type="button" class="btn-small action-view" data-action="view" data-id="${escapeHtml(student.id)}">View</button>
                  <button type="button" class="btn-small action-edit" data-action="edit" data-id="${escapeHtml(student.id)}">Edit</button>
                  ${
                    student.auth_user_id
                      ? `<button type="button" class="btn-small action-reset-password" data-action="reset" data-id="${escapeHtml(student.id)}">Reset Password</button>`
                      : `<button type="button" class="btn-small action-create-account" data-action="create-account" data-id="${escapeHtml(student.id)}">Create Account</button>`
                  }
                  <button type="button" class="btn-small action-delete" data-action="delete" data-id="${escapeHtml(student.id)}">Delete</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("");
    }

    function updateStats() {
      const total = students.length;
      const active = students.filter((x) => String(x.status).toLowerCase() === "active").length;
      const graduated = students.filter((x) => String(x.status).toLowerCase() === "graduated").length;
      const other = total - active - graduated;

      if (els.totalStudents) els.totalStudents.textContent = total;
      if (els.activeStudents) els.activeStudents.textContent = active;
      if (els.graduatedStudents) els.graduatedStudents.textContent = graduated;
      if (els.otherStudents) els.otherStudents.textContent = other;
    }

    // ------------------------------------------------------------
    // Photo
    // ------------------------------------------------------------
    function previewPhoto() {
      const file = els.photoInput?.files?.[0];

      if (!file) {
        clearPhotoPreview();
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        els.photoInput.value = "";
        showMessage("Photo is too large. Maximum size is 10MB.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (els.photoPreview) {
          els.photoPreview.src = reader.result;
          els.photoPreview.style.display = "block";
        }
        if (els.photoPlaceholder) els.photoPlaceholder.style.display = "none";
      };
      reader.readAsDataURL(file);
    }

    function clearPhotoPreview() {
      if (els.photoPreview) {
        els.photoPreview.removeAttribute("src");
        els.photoPreview.style.display = "none";
      }
      if (els.photoPlaceholder) els.photoPlaceholder.style.display = "block";
    }

    async function uploadPhoto(studentDbId, file) {
      if (!file) return null;

      setProgress(35, "Uploading student photo...");

      const extension =
        file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";

      const path = `students/${studentDbId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from("student-photos")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (error) throw new Error(`Photo upload failed: ${error.message}`);

      const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
      return data.publicUrl;
    }

    // ------------------------------------------------------------
    // Form
    // ------------------------------------------------------------
    function resetAccountUI() {
      if (els.accountStatus) {
        els.accountStatus.textContent = "No Account";
        els.accountStatus.className = "status status-inactive";
      }
      if (els.createAccountButton) els.createAccountButton.style.display = "none";
      if (els.resetPasswordButton) els.resetPasswordButton.style.display = "none";
    }

    function updateAccountUI(student) {
      if (!student) {
        resetAccountUI();
        return;
      }

      if (student.auth_user_id) {
        if (els.accountStatus) {
          els.accountStatus.textContent = student.account_enabled
            ? "Account Active"
            : "Account Disabled";
          els.accountStatus.className = student.account_enabled
            ? "status status-active"
            : "status status-inactive";
        }
        if (els.createAccountButton) els.createAccountButton.style.display = "none";
        if (els.resetPasswordButton) els.resetPasswordButton.style.display = "inline-flex";
      } else {
        if (els.accountStatus) {
          els.accountStatus.textContent = "No Account";
          els.accountStatus.className = "status status-inactive";
        }
        if (els.createAccountButton) els.createAccountButton.style.display = "inline-flex";
        if (els.resetPasswordButton) els.resetPasswordButton.style.display = "none";
      }
    }

    function clearForm() {
      editingStudent = null;

      if (els.form) els.form.reset();
      if (els.editStudentDbId) els.editStudentDbId.value = "";
      if (els.formTitle) els.formTitle.textContent = "Add Student";
      if (els.saveButton) els.saveButton.textContent = "Save Student";

      clearPhotoPreview();
      resetAccountUI();

      if (els.admissionDate) els.admissionDate.value = todayISO();
      if (els.status) els.status.value = "active";

      generateNextStudentId()
        .then((id) => {
          if (!editingStudent && els.studentId) els.studentId.value = id;
        })
        .catch((error) => {
          console.error(error);
          if (els.studentId) els.studentId.value = "";
          showMessage(error.message, "error");
        });

      hideProgress();
    }

    function fillForm(student) {
      editingStudent = student;

      if (els.editStudentDbId) els.editStudentDbId.value = student.id;
      if (els.institutionSelect) els.institutionSelect.value = student.institution_id ?? "";
      if (els.studentId) els.studentId.value = student.student_id ?? "";
      if (els.fullName) els.fullName.value = student.full_name ?? "";
      if (els.gender) els.gender.value = student.gender ?? "";
      if (els.dateOfBirth) els.dateOfBirth.value = student.date_of_birth ?? "";
      if (els.phone) els.phone.value = student.phone ?? "";
      if (els.email) els.email.value = student.email ?? "";
      if (els.admissionDate) els.admissionDate.value = student.admission_date ?? "";
      if (els.status) els.status.value = student.status ?? "active";
      if (els.address) els.address.value = student.address ?? "";

      if (student.photo_url) {
        if (els.photoPreview) {
          els.photoPreview.src = student.photo_url;
          els.photoPreview.style.display = "block";
        }
        if (els.photoPlaceholder) els.photoPlaceholder.style.display = "none";
      } else {
        clearPhotoPreview();
      }

      if (els.formTitle) els.formTitle.textContent = `Edit Student — ${student.student_id}`;
      if (els.saveButton) els.saveButton.textContent = "Update Student";

      updateAccountUI(student);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function formData() {
      const value = (el, fallback = "") => (el ? el.value : fallback);
      return {
        institution_id: value(els.institutionSelect) || null,
        student_id: value(els.studentId).trim(),
        full_name: value(els.fullName).trim(),
        gender: value(els.gender) || null,
        date_of_birth: value(els.dateOfBirth) || null,
        phone: value(els.phone).trim() || null,
        email: value(els.email).trim().toLowerCase() || null,
        admission_date: value(els.admissionDate),
        status: value(els.status),
        address: value(els.address).trim() || null,
      };
    }

    // ------------------------------------------------------------
    // Save student
    // ------------------------------------------------------------
    async function saveStudent(event) {
      event.preventDefault();
      hideMessage();

      const values = formData();

      if (!values.institution_id) return showMessage("Please select an institution.", "error");
      if (!values.student_id) return showMessage("Student ID could not be generated.", "error");
      if (!values.full_name) return showMessage("Full name is required.", "error");
      if (!values.admission_date) return showMessage("Admission date is required.", "error");

      if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        return showMessage("Please enter a valid email address.", "error");
      }

      if (els.saveButton) els.saveButton.disabled = true;

      try {
        setProgress(15, "Saving student record...");

        let studentDbId;

        if (editingStudent) {
          const { error } = await supabase
            .from("students")
            .update({
              institution_id: values.institution_id,
              full_name: values.full_name,
              gender: values.gender,
              date_of_birth: values.date_of_birth,
              phone: values.phone,
              email: values.email,
              admission_date: values.admission_date,
              status: values.status,
              address: values.address,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingStudent.id);

          if (error) throw error;
          studentDbId = editingStudent.id;
        } else {
          const { data, error } = await supabase
            .from("students")
            .insert({ ...values })
            .select("*")
            .single();

          if (error) throw error;
          studentDbId = data.id;
          setProgress(30, "Student created.");
        }

        const file = els.photoInput?.files?.[0];
        if (file) {
          const photoUrl = await uploadPhoto(studentDbId, file);
          if (photoUrl) {
            const { error: photoUpdateError } = await supabase
              .from("students")
              .update({ photo_url: photoUrl, updated_at: new Date().toISOString() })
              .eq("id", studentDbId);
            if (photoUpdateError) throw photoUpdateError;
          }
        }

        showMessage(
          editingStudent
            ? "Student record updated successfully."
            : `Student ${values.student_id} created successfully.`,
          "success"
        );

        setProgress(100, "Completed.");
        await loadStudents();
        setTimeout(clearForm, 300);
      } catch (error) {
        console.error("SAVE STUDENT ERROR:", error);
        showMessage(error?.message || "Student could not be saved.", "error");
      } finally {
        if (els.saveButton) els.saveButton.disabled = false;
        setTimeout(hideProgress, 500);
      }
    }

    // ------------------------------------------------------------
    // Student account: CREATE (modal) / RESET (prompt)
    // ------------------------------------------------------------
    function generateTemporaryPassword() {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
    }

    function askPassword(title) {
      const generated = generateTemporaryPassword();

      const password = window.prompt(
        `${title}\n\nEnter a password with at least 8 characters.\n\nSuggested temporary password:\n${generated}`,
        generated
      );

      if (password === null) return null;

      const value = password.trim();
      if (value.length < 8) {
        showMessage("Password must contain at least 8 characters.", "error");
        return null;
      }
      return value;
    }

    // Opens the modal. The modal's "Create Account" button fires the
    // "studentAccountCreate" event, handled by handleModalCreate() below.
    function createStudentAccount(student) {
      if (!student?.id) return;

      if (student.auth_user_id) {
        showMessage("This student already has an account. Use Reset Password.", "warning");
        return;
      }

      if (typeof window.openStudentAccountModal !== "function") {
        showMessage(
          "Account modal is missing from the page. Add the student-account-modal HTML before students.js.",
          "error"
        );
        return;
      }

      window.openStudentAccountModal(student);
    }

    async function handleModalCreate(event) {
      event.preventDefault(); // tells the modal that students.js handles it

      const d = event.detail || {};
      window.hideStudentAccountError?.();
      window.setStudentAccountLoading?.(true);

      try {
        const student =
          students.find((x) => x.id === d.student_db_id) ||
          (editingStudent?.id === d.student_db_id ? editingStudent : null);

        if (!student) throw new Error("Student record not found. Refresh the page and try again.");
        if (student.auth_user_id) throw new Error("This student already has an account.");

        // If the email was typed/changed in the modal, save it to the student first.
        if ((student.email || "") !== d.email) {
          const { error: emailError } = await supabase
            .from("students")
            .update({ email: d.email, updated_at: new Date().toISOString() })
            .eq("id", student.id);
          if (emailError) throw new Error(`Could not save email: ${emailError.message}`);
        }

        await callAccountFunction({
          action: "create",
          student_db_id: student.id,
          student_id: student.student_id,
          email: d.email,
          full_name: student.full_name,
          password: d.password,
        });

        window.showStudentAccountSuccess?.({
          full_name: student.full_name,
          email: d.email,
          password: d.password,
        });

        await loadStudents();

        const fresh = students.find((x) => x.id === student.id);
        if (fresh && editingStudent?.id === fresh.id) {
          editingStudent = fresh;
          if (els.email) els.email.value = fresh.email ?? "";
          updateAccountUI(fresh);
        }
      } catch (error) {
        console.error("CREATE STUDENT ACCOUNT ERROR:", error);
        window.showStudentAccountError?.(
          error?.message || "Student account could not be created."
        );
      } finally {
        window.setStudentAccountLoading?.(false);
      }
    }

    async function resetStudentPassword(student) {
      if (!student?.auth_user_id) {
        showMessage("This student has no login account.", "warning");
        return;
      }

      const password = askPassword(`Reset password for ${student.full_name}`);
      if (!password) return;

      const confirmed = window.confirm(
        `Reset password for ${student.full_name}?\n\nStudent ID: ${student.student_id}`
      );
      if (!confirmed) return;

      try {
        setProgress(20, "Resetting student password...");

        const result = await callAccountFunction({
          action: "reset",
          student_db_id: student.id,
          student_id: student.student_id,
          password,
        });

        setProgress(100, "Password reset successfully.");

        showMessage(
          `${result.message || "Password reset."}\n\nNew temporary password: ${password}`,
          "success"
        );

        await loadStudents();
      } catch (error) {
        console.error("RESET PASSWORD ERROR:", error);
        showMessage(error?.message || "Password could not be reset.", "error");
      } finally {
        setTimeout(hideProgress, 800);
      }
    }

    // ------------------------------------------------------------
    // Delete
    // ------------------------------------------------------------
    async function deleteStudent(student) {
      if (!student?.id) return;

      const confirmed = window.confirm(
        `DELETE STUDENT?\n\n${student.full_name}\n${student.student_id}\n\nThis removes the student record.`
      );
      if (!confirmed) return;

      try {
        const { error } = await supabase.from("students").delete().eq("id", student.id);
        if (error) throw error;

        showMessage("Student deleted successfully.", "success");
        await loadStudents();

        if (editingStudent?.id === student.id) clearForm();
      } catch (error) {
        console.error("DELETE STUDENT ERROR:", error);
        showMessage(`Student could not be deleted: ${error.message}`, "error");
      }
    }

    // ------------------------------------------------------------
    // Profile modal
    // ------------------------------------------------------------
    function showProfile(student) {
      if (!els.profileContent || !els.profileModal) {
        showMessage("Student profile modal is not available in this HTML.", "error");
        return;
      }

      const photo = student.photo_url
        ? `<img src="${escapeHtml(student.photo_url)}" class="profile-photo" alt="Student photo">`
        : placeholderAvatar(student.full_name);

      const item = (label, value) => `
        <div class="profile-item">
          <strong>${label}</strong>
          <span>${escapeHtml(value || "—")}</span>
        </div>`;

      els.profileContent.innerHTML = `
        <div class="profile-top">
          ${photo}
          <div>
            <div class="profile-name">${escapeHtml(student.full_name)}</div>
            <div class="profile-id">${escapeHtml(student.student_id)}</div>
            <div style="margin-top:8px;">
              ${statusBadge(student.status)}
              ${accountBadge(student)}
            </div>
          </div>
        </div>

        <div class="profile-grid">
          ${item("Institution ID", student.institution_id)}
          ${item("Gender", student.gender)}
          ${item("Date of Birth", student.date_of_birth ? formatDate(student.date_of_birth) : "")}
          ${item("Phone", student.phone)}
          ${item("Email", student.email)}
          ${item("Admission Date", student.admission_date ? formatDate(student.admission_date) : "")}
          ${item("Login Username", student.login_username)}
          ${item("Account Created", student.account_created_at ? formatDate(student.account_created_at) : "")}
          ${item("Last Login", student.last_login_at ? formatDate(student.last_login_at) : "")}
          ${item("Address", student.address)}
        </div>
      `;

      els.profileModal.classList.add("show");
      els.profileModal.setAttribute("aria-hidden", "false");
    }

    function closeProfile() {
      if (!els.profileModal) return;
      els.profileModal.classList.remove("show");
      els.profileModal.setAttribute("aria-hidden", "true");
    }

    // ------------------------------------------------------------
    // Table actions
    // ------------------------------------------------------------
    async function handleTableAction(event) {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const student = students.find((x) => x.id === button.dataset.id);

      if (!student) {
        showMessage("Student record is no longer available. Refresh the page.", "warning");
        return;
      }

      if (action === "view") return showProfile(student);
      if (action === "edit") return fillForm(student);
      if (action === "create-account") return createStudentAccount(student);
      if (action === "reset") return resetStudentPassword(student);
      if (action === "delete") return deleteStudent(student);
    }

    // ------------------------------------------------------------
    // Events
    // ------------------------------------------------------------
    function bindEvents() {
      els.form?.addEventListener("submit", saveStudent);
      els.photoInput?.addEventListener("change", previewPhoto);

      els.resetFormButton?.addEventListener("click", () => {
        clearForm();
        hideMessage();
      });

      els.addStudentButton?.addEventListener("click", () => {
        clearForm();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      els.refreshStudentsButton?.addEventListener("click", loadStudents);
      els.statusFilter?.addEventListener("change", loadStudents);

      els.searchInput?.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(renderStudents, 120);
      });

      els.studentsTableBody?.addEventListener("click", handleTableAction);

      els.createAccountButton?.addEventListener("click", () => {
        if (editingStudent) createStudentAccount(editingStudent);
      });

      els.resetPasswordButton?.addEventListener("click", async () => {
        if (editingStudent) await resetStudentPassword(editingStudent);
      });

      els.closeProfileModal?.addEventListener("click", closeProfile);

      els.profileModal?.addEventListener("click", (event) => {
        if (event.target === els.profileModal) closeProfile();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeProfile();
      });

      // Modal -> students.js bridge
      document.addEventListener("studentAccountCreate", handleModalCreate);

      supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          showMessage("Your login session has ended. Please login again.", "warning");
        }
      });
    }

    // ------------------------------------------------------------
    // Startup
    // ------------------------------------------------------------
    async function init() {
      try {
        hideMessage();

        const session = await getSessionOrThrow();
        console.log("GAAWOW Students V7 session:", session.user.id);

        bindEvents();
        ensureResponsiveStudentTable();

        await loadInstitutions();
        await loadStudents();

        clearForm();
      } catch (error) {
        console.error("STUDENTS INIT ERROR:", error);

        showMessage(error?.message || "Unable to initialize Students page.", "error");

        if (els.studentsTableBody) {
          els.studentsTableBody.innerHTML = `
            <tr><td colspan="10" class="empty">Login session required.</td></tr>`;
        }
      }
    }

    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => boot().catch((error) => console.error("GAAWOW Students boot error:", error)),
      { once: true }
    );
  } else {
    boot().catch((error) => console.error("GAAWOW Students boot error:", error));
  }
})();
