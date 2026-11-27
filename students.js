
"use strict";

(() => {
  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";
  const ACCOUNT_FUNCTION = `${SUPABASE_URL}/functions/v1/create-student-account`;

  const $ = id => document.getElementById(id);

  const requiredIds = [
    "studentForm","institutionSelect","courseSelect","academicYearSelect",
    "classSelect","studentsTableBody","message","saveButton"
  ];

  for (const id of requiredIds) {
    if (!$(id)) {
      console.error("Missing HTML element:", id);
      alert("Students page HTML is incomplete. Missing: " + id);
      return;
    }
  }

  if (!window.supabase?.createClient) {
    alert("Supabase library could not load. Please refresh the page.");
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  let currentUser = null;
  let students = [];
  let institutions = [];
  let courses = [];
  let years = [];
  let classes = [];
  let selectedStudent = null;
  let currentPhotoUrl = null;
  let isEditing = false;

  function message(text, type = "success") {
    const el = $("message");
    el.textContent = text;
    el.className = "message " + type;
    el.style.display = "block";
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  function clearMessage() {
    $("message").textContent = "";
    $("message").className = "message";
    $("message").style.display = "none";
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    })[c]);
  }

  function setProgress(percent, text) {
    $("progressWrap").style.display = "block";
    $("progressBar").style.width = `${percent}%`;
    $("progressText").textContent = text || "";
  }

  function hideProgress() {
    $("progressWrap").style.display = "none";
    $("progressBar").style.width = "0%";
  }

  function setOptions(select, rows, placeholder, labelFn) {
    select.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    select.appendChild(first);

    rows.forEach(row => {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = labelFn(row);
      select.appendChild(option);
    });

    select.disabled = rows.length === 0;
  }

  function getInstitutionName(id) {
  return institutions.find(x => x.id === id)?.name || "Not assigned";
}

function getCourseName(id) {
  return allCourses.find(x => x.id === id)?.name || "Not assigned";
}

function getClassName(id) {
  return allClasses.find(x => x.id === id)?.name || "Not assigned";
}

function getYearName(id) {
  return allAcademicYears.find(x => x.id === id)?.year_name || "";
}

  async function loadInstitutions() {
    const {data, error} = await db
      .from("institutions")
      .select("id,name,code,is_active")
      .order("name");

    if (error) throw error;

    institutions = data || [];

    setOptions($("institutionSelect"), institutions, "Select institution", x => x.name);
    setOptions($("institutionFilter"), institutions, "All Institutions", x => x.name);

    $("institutionFilter").disabled = false;
  }

  async function loadCourses(institutionId, selectedId = "") {
    courses = [];
    setOptions($("courseSelect"), [], "Loading courses...", x => x.name);
    $("courseSelect").disabled = true;

    if (!institutionId) {
      $("courseSelect").innerHTML = '<option value="">Select institution first</option>';
      return;
    }

    const {data, error} = await db
      .from("courses")
      .select("id,institution_id,name,code,duration_months,fee,is_active")
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    courses = data || [];
    setOptions($("courseSelect"), courses, "Select course", x =>
      `${x.name}${x.code ? " (" + x.code + ")" : ""}`
    );

    if (selectedId && courses.some(x => x.id === selectedId)) {
      $("courseSelect").value = selectedId;
    }
  }

  async function loadYears(institutionId, selectedId = "") {
    years = [];
    $("academicYearSelect").innerHTML = '<option value="">Loading academic years...</option>';
    $("academicYearSelect").disabled = true;

    if (!institutionId) {
      $("academicYearSelect").innerHTML = '<option value="">Select institution first</option>';
      return;
    }

    const {data, error} = await db
      .from("academic_years")
      .select("id,institution_id,year_name,start_date,end_date,is_active,enrollment_start,enrollment_end")
      .eq("institution_id", institutionId)
      .order("start_date", {ascending: false});

    if (error) throw error;

    years = data || [];
    setOptions($("academicYearSelect"), years, "Select academic year", x =>
      x.year_name + (x.is_active ? " (Active)" : "")
    );

    if (selectedId && years.some(x => x.id === selectedId)) {
      $("academicYearSelect").value = selectedId;
    }
  }

  async function loadClasses(institutionId, courseId, yearId, selectedId = "") {
    classes = [];
    $("classSelect").innerHTML = '<option value="">Loading classes...</option>';
    $("classSelect").disabled = true;

    if (!institutionId || !courseId || !yearId) {
      $("classSelect").innerHTML = '<option value="">Select course and year first</option>';
      return;
    }

    const year = years.find(x => x.id === yearId);
    if (!year) return;

    const {data, error} = await db
      .from("classes")
      .select("id,institution_id,course_id,name,code,academic_year,is_active,status")
      .eq("institution_id", institutionId)
      .eq("course_id", courseId)
      .eq("academic_year", year.year_name)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    classes = data || [];
    setOptions($("classSelect"), classes, "Select class", x =>
      `${x.name}${x.code ? " (" + x.code + ")" : ""}`
    );

    if (selectedId && classes.some(x => x.id === selectedId)) {
      $("classSelect").value = selectedId;
    }
  }

  async function loadFilterCourses(institutionId) {
    $("courseFilter").innerHTML = '<option value="">All Courses</option>';
    $("courseFilter").disabled = true;
    $("classFilter").innerHTML = '<option value="">All Classes</option>';
    $("classFilter").disabled = true;

    if (!institutionId) {
      renderStudents();
      return;
    }

    const {data, error} = await db
      .from("courses")
      .select("id,name,code")
      .eq("institution_id", institutionId)
      .order("name");

    if (error) throw error;

    const opts = data || [];
    opts.forEach(row => {
      const o = document.createElement("option");
      o.value = row.id;
      o.textContent = row.name;
      $("courseFilter").appendChild(o);
    });

    $("courseFilter").disabled = false;
    renderStudents();
  }

  async function loadFilterClasses(institutionId, courseId) {
    $("classFilter").innerHTML = '<option value="">All Classes</option>';
    $("classFilter").disabled = true;

    if (!institutionId || !courseId) {
      renderStudents();
      return;
    }

    const {data, error} = await db
      .from("classes")
      .select("id,name,code")
      .eq("institution_id", institutionId)
      .eq("course_id", courseId)
      .order("name");

    if (error) throw error;

    (data || []).forEach(row => {
      const o = document.createElement("option");
      o.value = row.id;
      o.textContent = row.name;
      $("classFilter").appendChild(o);
    });

    $("classFilter").disabled = false;
    renderStudents();
  }

  async function loadStudents() {
    $("studentsTableBody").innerHTML =
      '<tr><td colspan="13" class="empty">Loading students...</td></tr>';

    const [studentResult, enrollmentResult] = await Promise.all([
      db.from("students")
        .select("*")
        .order("created_at", {ascending: false}),
      db.from("enrollments")
        .select("id,institution_id,student_id,course_id,class_id,academic_year_id,enrollment_number,enrollment_date,status,created_at")
        .order("created_at", {ascending: false})
    ]);

    if (studentResult.error) throw studentResult.error;
    if (enrollmentResult.error) throw enrollmentResult.error;

    const enrollmentRows = enrollmentResult.data || [];

    const latestEnrollment = new Map();
    enrollmentRows.forEach(e => {
      if (!latestEnrollment.has(e.student_id)) {
        latestEnrollment.set(e.student_id, e);
      }
    });

    students = (studentResult.data || []).map(s => ({
      ...s,
      enrollment: latestEnrollment.get(s.id) || null
    }));

    renderStudents();
  }

  function getFilteredStudents() {
    const institutionId = $("institutionFilter").value;
    const courseId = $("courseFilter").value;
    const classId = $("classFilter").value;
    const status = $("statusFilter").value;
    const search = $("searchInput").value.trim().toLowerCase();

    return students.filter(s => {
      const e = s.enrollment || {};

      if (institutionId && s.institution_id !== institutionId) return false;
      if (courseId && e.course_id !== courseId) return false;
      if (classId && e.class_id !== classId) return false;
      if (status && String(s.status).toLowerCase() !== status) return false;

      if (search) {
        const haystack = [
          s.full_name,s.student_id,s.phone,s.email,s.login_username,
          getInstitutionName(s.institution_id),
          getCourseName(e.course_id),
          getClassName(e.class_id)
        ].join(" ").toLowerCase();

        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }

  function renderStats(rows) {
    const total = rows.length;
    const active = rows.filter(s => String(s.status).toLowerCase() === "active").length;
    const graduated = rows.filter(s => String(s.status).toLowerCase() === "graduated").length;

    $("totalStudents").textContent = total;
    $("activeStudents").textContent = active;
    $("graduatedStudents").textContent = graduated;
    $("otherStudents").textContent = total - active - graduated;
  }

  function renderStudents() {
    const rows = getFilteredStudents();
    renderStats(rows);

    $("filterCount").textContent = `Showing ${rows.length} of ${students.length} students`;

    if (!rows.length) {
      $("studentsTableBody").innerHTML =
        '<tr><td colspan="13" class="empty">No students found.</td></tr>';
      return;
    }

    $("studentsTableBody").innerHTML = rows.map(s => {
      const e = s.enrollment || {};
      const name = escapeHTML(s.full_name || "Unnamed");
      const photo = s.photo_url
        ? `<img class="student-photo" src="${escapeHTML(s.photo_url)}" alt="Photo">`
        : `<span class="initials">${escapeHTML((s.full_name || "?").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase())}</span>`;

      const status = String(s.status || "unknown").toLowerCase();
      const account = s.auth_user_id || s.account_enabled
        ? '<span class="status status-active">Enabled</span>'
        : '<span class="status status-inactive">No Account</span>';

      return `
      <tr>
        <td>${photo}</td>
        <td>${escapeHTML(s.student_id || "Pending")}</td>
        <td>${name}</td>
        <td>${escapeHTML(getInstitutionName(s.institution_id))}</td>
        <td>${escapeHTML(getCourseName(e.course_id))}</td>
        <td>${escapeHTML(getClassName(e.class_id))}</td>
        <td>${escapeHTML(s.gender || "-")}</td>
        <td>${escapeHTML(s.phone || "-")}</td>
        <td>${escapeHTML(s.email || "-")}</td>
        <td><span class="status ${status === "active" || status === "graduated" ? "status-active" : "status-inactive"}">${escapeHTML(status)}</span></td>
        <td>${escapeHTML(s.admission_date || "-")}</td>
        <td>${account}</td>
        <td>
          <div class="actions">
            <button class="btn-small action-view" data-action="view" data-id="${s.id}">View</button>
            <button class="btn-small action-edit" data-action="edit" data-id="${s.id}">Edit</button>
            ${s.auth_user_id
              ? `<button class="btn-small action-reset-password" data-action="reset" data-id="${s.id}">Reset Password</button>`
              : `<button class="btn-small action-create-account" data-action="create" data-id="${s.id}">Create Account</button>`}
            <button class="btn-small action-delete" data-action="delete" data-id="${s.id}">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  function resetPhotoPreview() {
    currentPhotoUrl = null;
    $("photoInput").value = "";
    $("photoPreview").src = "";
    $("photoPreview").style.display = "none";
    $("photoPlaceholder").style.display = "flex";
  }

  function showPhoto(url) {
    if (!url) {
      resetPhotoPreview();
      return;
    }
    currentPhotoUrl = url;
    $("photoPreview").src = url;
    $("photoPreview").style.display = "block";
    $("photoPlaceholder").style.display = "none";
  }

  async function uploadPhoto(studentId) {
    const file = $("photoInput").files?.[0];
    if (!file) return currentPhotoUrl;

    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Photo must be smaller than 10 MB.");
    }

    const allowed = ["image/jpeg","image/png","image/webp"];
    if (!allowed.includes(file.type)) {
      throw new Error("Only JPG, PNG and WEBP photos are allowed.");
    }

    const ext = file.name.split(".").pop().toLowerCase();
    const path = `students/${studentId}/${crypto.randomUUID()}.${ext}`;

    const {error: uploadError} = await db.storage
      .from("student-photos")
      .upload(path, file, {upsert: false, contentType: file.type});

    if (uploadError) throw uploadError;

    const {data} = db.storage.from("student-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  function resetForm() {
    $("studentForm").reset();
    $("editStudentDbId").value = "";
    $("studentId").value = "";
    $("formTitle").textContent = "Add Student";
    $("saveButton").textContent = "Save Student & Enroll";
    $("institutionSelect").disabled = false;
    $("courseSelect").disabled = true;
    $("academicYearSelect").disabled = true;
    $("classSelect").disabled = true;
    $("courseSelect").innerHTML = '<option value="">Select institution first</option>';
    $("academicYearSelect").innerHTML = '<option value="">Select institution first</option>';
    $("classSelect").innerHTML = '<option value="">Select course and year first</option>';
    $("accountStatus").textContent = "No Account";
    $("accountStatus").className = "status status-inactive";
    $("createAccountButton").style.display = "none";
    $("resetPasswordButton").style.display = "none";
    selectedStudent = null;
    isEditing = false;
    resetPhotoPreview();
    hideProgress();
  }

  async function fillEditForm(student) {
    isEditing = true;
    selectedStudent = student;

    $("editStudentDbId").value = student.id;
    $("studentId").value = student.student_id || "";
    $("fullName").value = student.full_name || "";
    $("gender").value = student.gender || "";
    $("dateOfBirth").value = student.date_of_birth || "";
    $("phone").value = student.phone || "";
    $("email").value = student.email || "";
    $("admissionDate").value = student.admission_date || "";
    $("status").value = student.status || "active";
    $("address").value = student.address || "";

    $("institutionSelect").value = student.institution_id || "";
    $("institutionSelect").disabled = true;

    const e = student.enrollment || {};

    await loadCourses(student.institution_id, e.course_id);
    await loadYears(student.institution_id, e.academic_year_id);
    await loadClasses(student.institution_id, e.course_id, e.academic_year_id, e.class_id);

    $("courseSelect").disabled = true;
    $("academicYearSelect").disabled = true;
    $("classSelect").disabled = true;

    showPhoto(student.photo_url);

    $("formTitle").textContent = "Edit Student";
    $("saveButton").textContent = "Update Student";
    $("accountStatus").textContent = student.auth_user_id ? "Account Enabled" : "No Account";
    $("accountStatus").className = "status " + (student.auth_user_id ? "status-active" : "status-inactive");
    $("createAccountButton").style.display = student.auth_user_id ? "none" : "inline-block";
    $("resetPasswordButton").style.display = student.auth_user_id ? "inline-block" : "none";

    $("studentForm").scrollIntoView({behavior:"smooth"});
  }

  async function saveStudent(event) {
    event.preventDefault();
    clearMessage();

    const institutionId = $("institutionSelect").value;
    const courseId = $("courseSelect").value;
    const yearId = $("academicYearSelect").value;
    const classId = $("classSelect").value;
    const fullName = $("fullName").value.trim();
    const admissionDate = $("admissionDate").value;

    if (!institutionId || !courseId || !fullName || !admissionDate) {
      message("Please complete Institution, Course, Full Name and Admission Date.", "warning");
      return;
    }

    if (!isEditing && (!yearId || !classId)) {
      message("Please select Academic Year and Class before registering the student.", "warning");
      return;
    }

    $("saveButton").disabled = true;

    try {
      if (isEditing) {
        const studentId = $("editStudentDbId").value;

        setProgress(25, "Updating student information...");

        const {error} = await db.from("students").update({
          full_name: fullName,
          gender: $("gender").value || null,
          date_of_birth: $("dateOfBirth").value || null,
          phone: $("phone").value.trim() || null,
          email: $("email").value.trim() || null,
          address: $("address").value.trim() || null,
          admission_date: admissionDate,
          status: $("status").value
        }).eq("id", studentId);

        if (error) throw error;

        setProgress(65, "Uploading photo if selected...");
        const photoUrl = await uploadPhoto(studentId);

        if (photoUrl && photoUrl !== selectedStudent.photo_url) {
          const {error: photoError} = await db.from("students")
            .update({photo_url: photoUrl})
            .eq("id", studentId);
          if (photoError) throw photoError;
        }

        setProgress(100, "Update completed.");
        message("Student information updated successfully.", "success");

      } else {
        setProgress(20, "Creating student and enrollment...");

        const rpcArgs = {
          p_institution_id: institutionId,
          p_course_id: courseId,
          p_full_name: fullName,
          p_admission_date: admissionDate,
          p_gender: $("gender").value || null,
          p_date_of_birth: $("dateOfBirth").value || null,
          p_phone: $("phone").value.trim() || null,
          p_email: $("email").value.trim() || null,
          p_address: $("address").value.trim() || null,
          p_status: $("status").value
        };

        const {data, error} = await db.rpc("create_student_with_enrollment", rpcArgs);
        if (error) throw error;

        if (!data || data.success !== true || !data.student?.id) {
          throw new Error(data?.message || data?.error || "Student creation returned an unexpected result.");
        }

        const newStudentId = data.student.id;
        setProgress(55, "Linking academic year and class...");

        /*
          The current RPC does not accept class_id or academic_year_id.
          The enrollment is linked after creation using the existing RLS policy.
        */
        let enrollmentId = data.enrollment?.id || null;

        if (!enrollmentId) {
          const {data: enrollment, error: enrollmentError} = await db
            .from("enrollments")
            .select("id")
            .eq("student_id", newStudentId)
            .eq("institution_id", institutionId)
            .eq("course_id", courseId)
            .order("created_at", {ascending:false})
            .limit(1)
            .maybeSingle();

          if (enrollmentError) throw enrollmentError;
          enrollmentId = enrollment?.id;
        }

        if (!enrollmentId) {
          message(
            "Student was created, but the enrollment record could not be located. Please inspect the enrollment before trying again. Student ID: " +
            (data.student.student_id || newStudentId),
            "warning"
          );
          await loadStudents();
          resetForm();
          return;
        }

        const {data: updatedEnrollment, error: linkError} = await db
          .from("enrollments")
          .update({
            academic_year_id: yearId,
            class_id: classId
          })
          .eq("id", enrollmentId)
          .eq("institution_id", institutionId)
          .select("id");

        if (linkError) {
          message(
            "Student and enrollment were created, but Class/Academic Year linking failed. Do not register the student again. Error: " +
            linkError.message,
            "warning"
          );
          await loadStudents();
          resetForm();
          return;
        }

        if (!updatedEnrollment || updatedEnrollment.length === 0) {
          message(
            "Student was created, but the enrollment could not be updated. Check enrollment permissions and RLS before retrying.",
            "warning"
          );
          await loadStudents();
          resetForm();
          return;
        }

        setProgress(75, "Uploading student photo...");
        const photoUrl = await uploadPhoto(newStudentId);

        if (photoUrl) {
          const {error: photoError} = await db.from("students")
            .update({photo_url: photoUrl})
            .eq("id", newStudentId);
          if (photoError) throw photoError;
        }

        setProgress(100, "Registration completed.");
        message(
          "Student registered successfully. Student ID: " +
          (data.student.student_id || "Generated by database"),
          "success"
        );
      }

      await loadStudents();
      resetForm();

    } catch (error) {
      console.error("Save student error:", error);
      message(error.message || "Unable to save student.", "error");
    } finally {
      $("saveButton").disabled = false;
    }
  }

  async function callAccountFunction(action, student) {
    if (!student) throw new Error("Student record not found.");

    const {data: sessionData} = await db.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) throw new Error("Your login session has expired. Please sign in again.");

    const response = await fetch(ACCOUNT_FUNCTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_KEY
      },
      body: JSON.stringify({
        action,
        student_id: student.id,
        institution_id: student.institution_id
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || result.message || `Account request failed (${response.status}).`);
    }

    return result;
  }

  async function accountAction(action, student) {
    const question = action === "create"
      ? `Create a portal account for ${student.full_name}?`
      : `Reset the portal password for ${student.full_name}?`;

    if (!confirm(question)) return;

    try {
      message(action === "create" ? "Creating student account..." : "Resetting student password...", "warning");

      const result = await callAccountFunction(action, student);

      if (result.temporary_password) {
        alert(
          "Temporary password:\n\n" + result.temporary_password +
          "\n\nPlease provide it securely to the student."
        );
      }

      message(result.message || "Account operation completed.", "success");
      await loadStudents();

    } catch (error) {
      console.error("Account action error:", error);
      message(error.message, "error");
    }
  }

  async function deleteStudent(student) {
    const ok = confirm(
      `Delete ${student.full_name} (${student.student_id || student.id})?\n\nThis operation may be blocked by database relationships and RLS.`
    );

    if (!ok) return;

    try {
      const {error} = await db.from("students").delete().eq("id", student.id);
      if (error) throw error;

      message("Student deleted successfully.", "success");
      await loadStudents();

    } catch (error) {
      console.error("Delete student error:", error);
      message("Could not delete student: " + error.message, "error");
    }
  }

  function openProfile(student) {
    const e = student.enrollment || {};
    const photo = student.photo_url
      ? `<img class="profile-photo" src="${escapeHTML(student.photo_url)}" alt="Student photo">`
      : `<div class="photo-placeholder">👤</div>`;

    const fields = [
      ["Student ID", student.student_id],
      ["Institution", getInstitutionName(student.institution_id)],
      ["Course", getCourseName(e.course_id)],
      ["Class", getClassName(e.class_id)],
      ["Academic Year", getYearName(e.academic_year_id)],
      ["Full Name", student.full_name],
      ["Gender", student.gender],
      ["Date of Birth", student.date_of_birth],
      ["Phone", student.phone],
      ["Email", student.email],
      ["Admission Date", student.admission_date],
      ["Status", student.status],
      ["Address", student.address],
      ["Account", student.auth_user_id ? "Enabled" : "No Account"]
    ];

    $("profileContent").innerHTML = `
      <div class="profile-top">
        ${photo}
        <div>
          <div class="profile-name">${escapeHTML(student.full_name || "")}</div>
          <div class="profile-id">${escapeHTML(student.student_id || "")}</div>
        </div>
      </div>
      <div class="profile-grid">
        ${fields.map(([label,value]) => `
          <div class="profile-item">
            <strong>${escapeHTML(label)}</strong>
            <span>${escapeHTML(value || "-")}</span>
          </div>`).join("")}
      </div>`;

    $("profileModal").classList.add("show");
    $("profileModal").setAttribute("aria-hidden", "false");
  }

  function closeProfile() {
    $("profileModal").classList.remove("show");
    $("profileModal").setAttribute("aria-hidden", "true");
  }

  async function refreshAll() {
    clearMessage();
    try {
      await Promise.all([loadStudents()]);
      message("Student list refreshed.", "success");
    } catch (error) {
      message(error.message, "error");
    }
  }

  function bindEvents() {
    $("studentForm").addEventListener("submit", saveStudent);

    $("institutionSelect").addEventListener("change", async () => {
      try {
        await loadCourses($("institutionSelect").value);
        await loadYears($("institutionSelect").value);
        $("classSelect").innerHTML = '<option value="">Select course and year first</option>';
        $("classSelect").disabled = true;
      } catch (error) {
        message(error.message, "error");
      }
    });

    $("courseSelect").addEventListener("change", async () => {
      try {
        await loadClasses(
          $("institutionSelect").value,
          $("courseSelect").value,
          $("academicYearSelect").value
        );
      } catch (error) {
        message(error.message, "error");
      }
    });

    $("academicYearSelect").addEventListener("change", async () => {
      try {
        await loadClasses(
          $("institutionSelect").value,
          $("courseSelect").value,
          $("academicYearSelect").value
        );
      } catch (error) {
        message(error.message, "error");
      }
    });

    $("institutionFilter").addEventListener("change", async () => {
      try {
        await loadFilterCourses($("institutionFilter").value);
      } catch (error) {
        message(error.message, "error");
      }
    });

    $("courseFilter").addEventListener("change", async () => {
      try {
        await loadFilterClasses(
          $("institutionFilter").value,
          $("courseFilter").value
        );
      } catch (error) {
        message(error.message, "error");
      }
    });

    ["classFilter","statusFilter"].forEach(id => {
      $(id).addEventListener("change", renderStudents);
    });

    $("searchInput").addEventListener("input", renderStudents);

    $("resetFiltersButton").addEventListener("click", async () => {
      $("institutionFilter").value = "";
      $("courseFilter").innerHTML = '<option value="">All Courses</option>';
      $("courseFilter").disabled = true;
      $("classFilter").innerHTML = '<option value="">All Classes</option>';
      $("classFilter").disabled = true;
      $("statusFilter").value = "";
      $("searchInput").value = "";
      renderStudents();
    });

    $("addStudentButton").addEventListener("click", () => {
      resetForm();
      $("studentForm").scrollIntoView({behavior:"smooth"});
    });

    $("resetFormButton").addEventListener("click", resetForm);
    $("refreshStudentsButton").addEventListener("click", refreshAll);

    $("photoInput").addEventListener("change", () => {
      const file = $("photoInput").files?.[0];
      if (!file) return;

      if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
        message("Only JPG, PNG and WEBP photos are allowed.", "warning");
        $("photoInput").value = "";
        return;
      }

      const url = URL.createObjectURL(file);
      $("photoPreview").src = url;
      $("photoPreview").style.display = "block";
      $("photoPlaceholder").style.display = "none";
    });

    $("studentsTableBody").addEventListener("click", async event => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const student = students.find(s => s.id === button.dataset.id);
      if (!student) return;

      const action = button.dataset.action;

      try {
        if (action === "view") openProfile(student);
        if (action === "edit") await fillEditForm(student);
        if (action === "create") await accountAction("create", student);
        if (action === "reset") await accountAction("reset", student);
        if (action === "delete") await deleteStudent(student);
      } catch (error) {
        console.error(error);
        message(error.message, "error");
      }
    });

    $("createAccountButton").addEventListener("click", () => {
      if (selectedStudent) accountAction("create", selectedStudent);
    });

    $("resetPasswordButton").addEventListener("click", () => {
      if (selectedStudent) accountAction("reset", selectedStudent);
    });

    $("closeProfileModal").addEventListener("click", closeProfile);

    $("profileModal").addEventListener("click", event => {
      if (event.target === $("profileModal")) closeProfile();
    });
  }

  async function init() {
    try {
      const {data, error} = await db.auth.getSession();
      if (error) throw error;

      if (!data.session) {
        message("Your session is missing. Please sign in again.", "error");
        return;
      }

      currentUser = data.session.user;

      bindEvents();

      await loadInstitutions();
      await loadStudents();

      $("admissionDate").value = new Date().toISOString().slice(0,10);

    } catch (error) {
      console.error("Students initialization error:", error);
      message("Students page could not load: " + error.message, "error");
    }
  }

  init();
})();
