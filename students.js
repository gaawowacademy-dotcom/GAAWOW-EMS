
/* ============================================================
   GAAWOW EMS - STUDENTS.JS
   Supabase connection and API key validation
   ============================================================ */

(() => {
  "use strict";

  function boot() {
    const message = document.getElementById("message");

    function showStartupError(text) {
      console.error("GAAWOW STUDENTS:", text);
      if (message) {
        message.textContent = text;
        message.className = "message error";
        message.style.display = "block";
      }
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      showStartupError(
        "Supabase library lama soo dejin. Hubi internet-ka kadibna dib u fur bogga."
      );
      return;
    }

    const SUPABASE_URL =
      "https://mytyvqwrxnxpxnxpiicj.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

    const ACCOUNT_FUNCTION_URL =
      `${SUPABASE_URL}/functions/v1/create-student-account`;

    const supabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY.trim(),
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    // Validate the Publishable Key using the apikey header only.
    async function verifySupabaseKey() {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: "GET",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY.trim()
        }
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Supabase API key waa la diiday. Ka hubi Publishable Key-ga mashruuca mytyvqwrxnxpxnxpiicj."
        );
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Supabase connection failed (${response.status}). ${detail}`
        );
      }

      return true;
    }

    const $ = id => document.getElementById(id);

    const els = {
      message: $("message"),
      form: $("studentForm"),
      formTitle: $("formTitle"),
      editStudentDbId: $("editStudentDbId"),
      institutionSelect: $("institutionSelect"),
      courseSelect: $("courseSelect"),
      courseHint: $("courseHint"),
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
      profileContent: $("profileContent")
    };

    let students = [];
    let editingStudent = null;
    let searchTimer = null;
    let courses = [];

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
      els.progressBar.style.width =
        `${Math.max(0, Math.min(100, percent))}%`;
      els.progressText.textContent = text;
    }

    function hideProgress() {
      if (!els.progressWrap) return;
      els.progressWrap.style.display = "none";
      els.progressBar.style.width = "0%";
      els.progressText.textContent = "";
    }

    function todayISO() {
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 10);
    }

    function formatDate(value) {
      if (!value) return "—";
      try {
        return new Intl.DateTimeFormat("en-GB", {
          year: "numeric", month: "short", day: "2-digit"
        }).format(new Date(value));
      } catch {
        return value;
      }
    }

    function statusBadge(status) {
      const normalized = String(status ?? "").toLowerCase();
      const className = normalized === "active"
        ? "status-active"
        : "status-inactive";
      return `<span class="status ${className}">${escapeHtml(status || "inactive")}</span>`;
    }

    function accountBadge(student) {
      return student.auth_user_id
        ? `<span class="status status-active">Account Active</span>`
        : `<span class="status status-inactive">No Account</span>`;
    }

    function getInitials(name) {
      const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
      return parts.length
        ? parts.slice(0, 2).map(x => x[0].toUpperCase()).join("")
        : "ST";
    }

    function placeholderAvatar(name) {
      return `<div class="initials" aria-label="Student">${escapeHtml(getInitials(name))}</div>`;
    }

    async function getSessionOrThrow() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session?.access_token) {
        throw new Error("Login session expired. Please login again.");
      }
      return session;
    }

    async function refreshSession() {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn("SESSION REFRESH:", error);
        return null;
      }
      return session;
    }

    async function callAccountFunction(payload) {
      let session = await getSessionOrThrow();

      async function request(currentSession) {
        return fetch(ACCOUNT_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${currentSession.access_token}`
          },
          body: JSON.stringify(payload)
        });
      }

      let response = await request(session);

      if (response.status === 401) {
        const refreshed = await refreshSession();
        if (!refreshed?.access_token) {
          throw new Error("Login session expired. Please login again.");
        }
        response = await request(refreshed);
      }

      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error(`Edge Function returned invalid JSON (${response.status}).`);
      }

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.error || result?.message ||
          `Student account request failed (${response.status}).`
        );
      }

      return result;
    }

    async function loadInstitutions() {
      els.institutionSelect.innerHTML =
        `<option value="">Loading institutions...</option>`;

      const { data, error } = await supabase
        .from("institutions")
        .select("id,name")
        .order("name", { ascending: true });

      if (error) {
        console.error("INSTITUTIONS ERROR:", error);
        els.institutionSelect.innerHTML =
          `<option value="">Unable to load institutions</option>`;
        showMessage(`Institutions could not be loaded: ${error.message}`, "error");
        return;
      }

      els.institutionSelect.innerHTML =
        `<option value="">Select institution</option>`;

      for (const institution of data ?? []) {
        const option = document.createElement("option");
        option.value = institution.id;
        option.textContent = institution.name || institution.id;
        els.institutionSelect.appendChild(option);
      }
    }

    async function loadCourses(institutionId, selectedCourseId = "") {
      courses = [];
      els.courseSelect.disabled = true;
      els.courseSelect.innerHTML =
        `<option value="">Loading courses...</option>`;

      if (!institutionId) {
        els.courseSelect.innerHTML =
          `<option value="">Select institution first</option>`;
        return;
      }

      const { data, error } = await supabase
        .from("courses")
        .select("id,institution_id,name,code,duration_months,fee,is_active")
        .eq("institution_id", institutionId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("COURSES ERROR:", error);
        els.courseSelect.innerHTML =
          `<option value="">Unable to load courses</option>`;
        showMessage(`Courses could not be loaded: ${error.message}`, "error");
        return;
      }

      courses = data ?? [];
      els.courseSelect.innerHTML =
        `<option value="">Select course / program</option>`;

      for (const course of courses) {
        const option = document.createElement("option");
        option.value = course.id;
        option.textContent =
          `${course.name}${course.code ? ` (${course.code})` : ""}`;
        els.courseSelect.appendChild(option);
      }

      els.courseSelect.disabled = courses.length === 0;

      if (selectedCourseId) {
        let oldCourse = courses.find(c => c.id === selectedCourseId);

        if (!oldCourse) {
          const { data: inactiveCourse, error: oldError } = await supabase
            .from("courses")
            .select("id,name,code")
            .eq("id", selectedCourseId)
            .maybeSingle();

          if (!oldError && inactiveCourse) {
            const option = document.createElement("option");
            option.value = inactiveCourse.id;
            option.textContent =
              `${inactiveCourse.name}${inactiveCourse.code ? ` (${inactiveCourse.code})` : ""} — Existing course`;
            els.courseSelect.appendChild(option);
          }
        }

        els.courseSelect.value = selectedCourseId;
      }

      if (els.courseHint) {
        els.courseHint.textContent = courses.length
          ? `${courses.length} active course(s) available.`
          : "No active courses found for this institution.";
      }
    }

    async function loadStudents() {
      els.studentsTableBody.innerHTML =
        `<tr><td colspan="10" class="empty">Loading students...</td></tr>`;

      let query = supabase
        .from("students")
        .select(`
          id,institution_id,student_id,full_name,gender,date_of_birth,
          phone,email,address,photo_url,admission_date,status,
          emergency_contact_name,emergency_contact_phone,
          created_at,updated_at,account_enabled,auth_user_id,
          login_username,account_created_at,last_login_at,password_changed_at
        `)
        .order("created_at", { ascending: false });

      const selectedStatus = els.statusFilter?.value?.trim();
      if (selectedStatus) query = query.eq("status", selectedStatus);

      const { data, error } = await query;

      if (error) {
        console.error("STUDENTS LOAD ERROR:", error);
        els.studentsTableBody.innerHTML =
          `<tr><td colspan="10" class="empty">Could not load students.</td></tr>`;
        showMessage(`Students could not be loaded: ${error.message}`, "error");
        return;
      }

      students = data ?? [];
      renderStudents();
      updateStats();
    }

    function getFilteredStudents() {
      const term = String(els.searchInput?.value ?? "").trim().toLowerCase();
      if (!term) return students;

      return students.filter(student => {
        const searchable = [
          student.student_id, student.full_name, student.phone,
          student.email, student.gender, student.status, student.login_username
        ].filter(Boolean).join(" ").toLowerCase();

        return searchable.includes(term);
      });
    }

    function renderStudents() {
      const filtered = getFilteredStudents();

      if (!filtered.length) {
        els.studentsTableBody.innerHTML =
          `<tr><td colspan="10" class="empty">No students found.</td></tr>`;
        return;
      }

      els.studentsTableBody.innerHTML = filtered.map(student => {
        const photo = student.photo_url
          ? `<img src="${escapeHtml(student.photo_url)}" class="student-photo" alt="Student photo">`
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
      }).join("");
    }

    function updateStats() {
      const total = students.length;
      const active = students.filter(x => String(x.status).toLowerCase() === "active").length;
      const graduated = students.filter(x => String(x.status).toLowerCase() === "graduated").length;

      els.totalStudents.textContent = total;
      els.activeStudents.textContent = active;
      els.graduatedStudents.textContent = graduated;
      els.otherStudents.textContent = total - active - graduated;
    }

    function clearPhotoPreview() {
      els.photoPreview.removeAttribute("src");
      els.photoPreview.style.display = "none";
      els.photoPlaceholder.style.display = "flex";
    }

    function previewPhoto() {
      const file = els.photoInput.files?.[0];

      if (!file) {
        clearPhotoPreview();
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        els.photoInput.value = "";
        showMessage("Photo is too large. Maximum size is 10MB.", "error");
        return;
      }

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        els.photoInput.value = "";
        showMessage("Please select a JPG, PNG or WEBP image.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        els.photoPreview.src = reader.result;
        els.photoPreview.style.display = "block";
        els.photoPlaceholder.style.display = "none";
      };
      reader.readAsDataURL(file);
    }

    async function uploadPhoto(studentDbId, file) {
      if (!file) return null;

      setProgress(65, "Uploading student photo...");

      const extension = file.type === "image/png"
        ? "png"
        : file.type === "image/webp" ? "webp" : "jpg";

      const uniquePart = crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const path = `students/${studentDbId}/${uniquePart}.${extension}`;

      const { error } = await supabase.storage
        .from("student-photos")
        .upload(path, file, {
          upsert: false,
          contentType: file.type
        });

      if (error) throw new Error(`Photo upload failed: ${error.message}`);

      const { data } = supabase.storage
        .from("student-photos")
        .getPublicUrl(path);

      return data.publicUrl;
    }

    async function saveStudentPhoto(studentId) {
      const file = els.photoInput.files?.[0];
      if (!file) return null;

      try {
        const photoUrl = await uploadPhoto(studentId, file);
        if (!photoUrl) return null;

        const { error } = await supabase
          .from("students")
          .update({ photo_url: photoUrl })
          .eq("id", studentId);

        if (error) throw error;
        return photoUrl;
      } catch (error) {
        console.error("PHOTO SAVE ERROR:", error);
        showMessage(
          `Student was saved, but photo upload failed: ${error.message}`,
          "warning"
        );
        return null;
      }
    }

    function resetAccountUI() {
      els.accountStatus.textContent = "No Account";
      els.accountStatus.className = "status status-inactive";
      els.createAccountButton.style.display = "none";
      els.resetPasswordButton.style.display = "none";
    }

    function updateAccountUI(student) {
      if (!student) {
        resetAccountUI();
        return;
      }

      if (student.auth_user_id) {
        els.accountStatus.textContent = student.account_enabled
          ? "Account Active" : "Account Disabled";
        els.accountStatus.className = student.account_enabled
          ? "status status-active" : "status status-inactive";
        els.createAccountButton.style.display = "none";
        els.resetPasswordButton.style.display = "inline-flex";
      } else {
        els.accountStatus.textContent = "No Account";
        els.accountStatus.className = "status status-inactive";
        els.createAccountButton.style.display = "inline-flex";
        els.resetPasswordButton.style.display = "none";
      }
    }

    function clearForm() {
      editingStudent = null;
      els.form.reset();
      els.editStudentDbId.value = "";
      els.formTitle.textContent = "Add Student";
      els.saveButton.textContent = "Save Student & Enroll";
      els.studentId.value = "";
      els.studentId.placeholder = "Generated automatically";
      els.institutionSelect.disabled = false;
      els.courseSelect.disabled = true;
      els.courseSelect.innerHTML =
        `<option value="">Select institution first</option>`;
      if (els.courseHint) {
        els.courseHint.textContent =
          "Choose the course the student is registering for.";
      }
      courses = [];
      clearPhotoPreview();
      resetAccountUI();
      els.admissionDate.value = todayISO();
      els.status.value = "active";
      hideProgress();
    }

    async function fillForm(student) {
      editingStudent = student;
      els.editStudentDbId.value = student.id;
      els.institutionSelect.value = student.institution_id ?? "";
      els.institutionSelect.disabled = true;

      await loadCourses(student.institution_id);

      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("course_id,enrollment_number,academic_year_id,status")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (enrollmentError) {
        console.warn("EXISTING ENROLLMENT LOOKUP:", enrollmentError);
      }

      if (enrollment?.course_id) {
        await loadCourses(student.institution_id, enrollment.course_id);
        els.courseSelect.disabled = true;
        els.courseHint.textContent =
          `Existing enrollment: ${enrollment.enrollment_number || "Number unavailable"}. Course is not changed when editing.`;
      } else {
        els.courseSelect.disabled = true;
        els.courseSelect.innerHTML =
          `<option value="">No enrollment found</option>`;
        els.courseHint.textContent =
          "No existing enrollment found. Editing will not create a new enrollment.";
      }

      els.studentId.value = student.student_id ?? "";
      els.fullName.value = student.full_name ?? "";
      els.gender.value = student.gender ?? "";
      els.dateOfBirth.value = student.date_of_birth ?? "";
      els.phone.value = student.phone ?? "";
      els.email.value = student.email ?? "";
      els.admissionDate.value = student.admission_date ?? "";
      els.status.value = student.status ?? "active";
      els.address.value = student.address ?? "";

      if (student.photo_url) {
        els.photoPreview.src = student.photo_url;
        els.photoPreview.style.display = "block";
        els.photoPlaceholder.style.display = "none";
      } else {
        clearPhotoPreview();
      }

      els.formTitle.textContent = `Edit Student — ${student.student_id}`;
      els.saveButton.textContent = "Update Student";
      updateAccountUI(student);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function formData() {
      return {
        institution_id: els.institutionSelect.value || null,
        course_id: els.courseSelect.value || null,
        full_name: els.fullName.value.trim(),
        gender: els.gender.value || null,
        date_of_birth: els.dateOfBirth.value || null,
        phone: els.phone.value.trim() || null,
        email: els.email.value.trim().toLowerCase() || null,
        admission_date: els.admissionDate.value,
        status: els.status.value,
        address: els.address.value.trim() || null
      };
    }

    async function saveStudent(event) {
      event.preventDefault();
      hideMessage();

      const values = formData();

      if (!values.institution_id) {
        showMessage("Please select an institution.", "error");
        return;
      }
      if (!values.full_name) {
        showMessage("Full name is required.", "error");
        return;
      }
      if (!values.admission_date) {
        showMessage("Admission date is required.", "error");
        return;
      }
      if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        showMessage("Please enter a valid email address.", "error");
        return;
      }
      if (!editingStudent && !values.course_id) {
        showMessage("Please select the student's course before saving.", "error");
        els.courseSelect.focus();
        return;
      }

      els.saveButton.disabled = true;

      try {
        let savedStudentId;
        let successText;

        if (editingStudent) {
          setProgress(20, "Updating student record...");

          const { error } = await supabase
            .from("students")
            .update({
              full_name: values.full_name,
              gender: values.gender,
              date_of_birth: values.date_of_birth,
              phone: values.phone,
              email: values.email,
              admission_date: values.admission_date,
              status: values.status,
              address: values.address
            })
            .eq("id", editingStudent.id);

          if (error) throw error;

          savedStudentId = editingStudent.id;
          successText =
            "Student updated successfully. Existing enrollment was not changed.";

        } else {
          setProgress(20, "Creating student and course enrollment...");

          const { data, error } = await supabase.rpc(
            "create_student_with_enrollment",
            {
              p_institution_id: values.institution_id,
              p_course_id: values.course_id,
              p_full_name: values.full_name,
              p_admission_date: values.admission_date,
              p_gender: values.gender,
              p_date_of_birth: values.date_of_birth,
              p_phone: values.phone,
              p_email: values.email,
              p_address: values.address,
              p_status: values.status
            }
          );

          if (error) throw error;

          if (!data?.success || !data?.student?.id || !data?.enrollment?.id) {
            throw new Error(
              "RPC response does not match the expected student/enrollment structure. Check the database function before retrying."
            );
          }

          savedStudentId = data.student.id;
          successText =
            `Student ${data.student.student_id} created successfully.\n` +
            `Enrollment: ${data.enrollment.enrollment_number}\n` +
            `Status: ${data.enrollment.status}`;
        }

        if (savedStudentId && els.photoInput.files?.[0]) {
          await saveStudentPhoto(savedStudentId);
        }

        setProgress(90, "Refreshing student records...");
        await loadStudents();

        showMessage(successText, "success");
        setProgress(100, "Completed.");

        setTimeout(clearForm, 500);

      } catch (error) {
        console.error("SAVE STUDENT ERROR:", error);
        showMessage(error?.message || "Student could not be saved.", "error");
      } finally {
        els.saveButton.disabled = false;
        setTimeout(hideProgress, 1200);
      }
    }

    function generateTemporaryPassword() {
      const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, byte => chars[byte % chars.length]).join("");
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

    async function createStudentAccount(student) {
      if (!student?.id) return;

      if (student.auth_user_id) {
        showMessage("This student already has an account. Use Reset Password.", "warning");
        return;
      }
      if (!student.email) {
        showMessage("Add a valid student email first, then save the student.", "warning");
        return;
      }

      const password = askPassword(`Create login account for ${student.full_name}`);
      if (!password) return;

      if (!window.confirm(
        `Create student login account?\n\nStudent: ${student.full_name}\nID: ${student.student_id}\nEmail: ${student.email}`
      )) return;

      try {
        setProgress(20, "Creating student account...");

        const result = await callAccountFunction({
          action: "create",
          student_db_id: student.id,
          student_id: student.student_id,
          email: student.email,
          full_name: student.full_name,
          password
        });

        showMessage(
          `${result.message}\n\nUsername: ${student.email}\nTemporary password: ${password}`,
          "success"
        );

        await loadStudents();
        const fresh = students.find(x => x.id === student.id);
        if (fresh) {
          updateAccountUI(fresh);
          editingStudent = fresh;
        }
      } catch (error) {
        console.error("CREATE STUDENT ACCOUNT ERROR:", error);
        showMessage(error?.message || "Student account could not be created.", "error");
      } finally {
        setTimeout(hideProgress, 800);
      }
    }

    async function resetStudentPassword(student) {
      if (!student?.auth_user_id) {
        showMessage("This student has no login account.", "warning");
        return;
      }

      const password = askPassword(`Reset password for ${student.full_name}`);
      if (!password) return;

      if (!window.confirm(
        `Reset password for ${student.full_name}?\n\nStudent ID: ${student.student_id}`
      )) return;

      try {
        setProgress(20, "Resetting student password...");

        const result = await callAccountFunction({
          action: "reset",
          student_db_id: student.id,
          student_id: student.student_id,
          password
        });

        showMessage(
          `${result.message}\n\nNew temporary password: ${password}`,
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

    async function deleteStudent(student) {
      if (!student?.id) return;

      if (!window.confirm(
        `DELETE STUDENT?\n\n${student.full_name}\n${student.student_id}\n\nThe linked enrollment record may also be deleted.`
      )) return;

      try {
        const { error } = await supabase
          .from("students")
          .delete()
          .eq("id", student.id);

        if (error) throw error;

        showMessage("Student deleted successfully.", "success");
        await loadStudents();
        if (editingStudent?.id === student.id) clearForm();

      } catch (error) {
        console.error("DELETE STUDENT ERROR:", error);
        showMessage(`Student could not be deleted: ${error.message}`, "error");
      }
    }

    function showProfile(student) {
      const photo = student.photo_url
        ? `<img src="${escapeHtml(student.photo_url)}" class="profile-photo" alt="Student photo">`
        : placeholderAvatar(student.full_name);

      els.profileContent.innerHTML = `
        <div class="profile-top">
          ${photo}
          <div>
            <div class="profile-name">${escapeHtml(student.full_name)}</div>
            <div class="profile-id">${escapeHtml(student.student_id)}</div>
            <div style="margin-top:8px;">
              ${statusBadge(student.status)} ${accountBadge(student)}
            </div>
          </div>
        </div>
        <div class="profile-grid">
          <div class="profile-item"><strong>Institution ID</strong><span>${escapeHtml(student.institution_id || "—")}</span></div>
          <div class="profile-item"><strong>Gender</strong><span>${escapeHtml(student.gender || "—")}</span></div>
          <div class="profile-item"><strong>Date of Birth</strong><span>${escapeHtml(formatDate(student.date_of_birth))}</span></div>
          <div class="profile-item"><strong>Phone</strong><span>${escapeHtml(student.phone || "—")}</span></div>
          <div class="profile-item"><strong>Email</strong><span>${escapeHtml(student.email || "—")}</span></div>
          <div class="profile-item"><strong>Admission Date</strong><span>${escapeHtml(formatDate(student.admission_date))}</span></div>
          <div class="profile-item"><strong>Login Username</strong><span>${escapeHtml(student.login_username || "—")}</span></div>
          <div class="profile-item"><strong>Account Created</strong><span>${escapeHtml(formatDate(student.account_created_at))}</span></div>
          <div class="profile-item"><strong>Last Login</strong><span>${escapeHtml(formatDate(student.last_login_at))}</span></div>
          <div class="profile-item"><strong>Address</strong><span>${escapeHtml(student.address || "—")}</span></div>
        </div>
      `;

      els.profileModal.classList.add("show");
      els.profileModal.setAttribute("aria-hidden", "false");
    }

    function closeProfile() {
      els.profileModal.classList.remove("show");
      els.profileModal.setAttribute("aria-hidden", "true");
    }

    async function handleTableAction(event) {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const student = students.find(x => x.id === button.dataset.id);
      if (!student) {
        showMessage("Student record is no longer available. Refresh the page.", "warning");
        return;
      }

      switch (button.dataset.action) {
        case "view":
          showProfile(student);
          break;
        case "edit":
          await fillForm(student);
          break;
        case "create-account":
          await createStudentAccount(student);
          break;
        case "reset":
          await resetStudentPassword(student);
          break;
        case "delete":
          await deleteStudent(student);
          break;
      }
    }

    function bindEvents() {
      els.form.addEventListener("submit", saveStudent);
      els.photoInput.addEventListener("change", previewPhoto);

      els.institutionSelect.addEventListener("change", async () => {
        if (editingStudent) return;
        await loadCourses(els.institutionSelect.value);
      });

      els.resetFormButton.addEventListener("click", () => {
        clearForm();
        hideMessage();
      });

      els.addStudentButton.addEventListener("click", () => {
        clearForm();
        hideMessage();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      els.refreshStudentsButton.addEventListener("click", loadStudents);
      els.statusFilter.addEventListener("change", loadStudents);

      els.searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(renderStudents, 120);
      });

      els.studentsTableBody.addEventListener("click", handleTableAction);

      els.createAccountButton.addEventListener("click", () => {
        if (editingStudent) createStudentAccount(editingStudent);
      });

      els.resetPasswordButton.addEventListener("click", () => {
        if (editingStudent) resetStudentPassword(editingStudent);
      });

      els.closeProfileModal.addEventListener("click", closeProfile);

      els.profileModal.addEventListener("click", event => {
        if (event.target === els.profileModal) closeProfile();
      });

      document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeProfile();
      });

      supabase.auth.onAuthStateChange(event => {
        if (event === "SIGNED_OUT") {
          showMessage("Your login session has ended. Please login again.", "warning");
        }
      });
    }

    async function init() {
      try {
        hideMessage();

        setProgress(10, "Checking Supabase connection...");
        await verifySupabaseKey();

        setProgress(25, "Checking login session...");
        const session = await getSessionOrThrow();
        console.log("GAAWOW Students session:", session.user.id);

        bindEvents();

        setProgress(45, "Loading institutions...");
        await loadInstitutions();

        setProgress(70, "Loading students...");
        await loadStudents();

        clearForm();
        hideProgress();

      } catch (error) {
        console.error("STUDENTS INIT ERROR:", error);
        showMessage(
          error?.message || "Unable to initialize Students page.",
          "error"
        );

        if (els.studentsTableBody) {
          els.studentsTableBody.innerHTML =
            `<tr><td colspan="10" class="empty">Unable to load students. Check connection and login.</td></tr>`;
        }
        hideProgress();
      }
    }

    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
