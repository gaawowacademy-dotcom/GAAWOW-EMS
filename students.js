
/* =========================================================
   GAAWOW EMS - STUDENTS MANAGEMENT
   FIXED COMPLETE VERSION
   Institution -> Course -> Academic Year -> Class
   Student list / filters / photo / account management

   Preserves:
   - Existing Supabase project and publishable key
   - create_student_with_enrollment RPC
   - student-photos Storage bucket
   - create-student-account Edge Function
   - Existing account request payload
   ========================================================= */

(() => {
  "use strict";

  /* ---------------- CONFIGURATION ---------------- */

  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjAi5g_RqLCs145";
  const ACCOUNT_FUNCTION = SUPABASE_URL + "/functions/v1/create-student-account";
  const PHOTO_BUCKET = "student-photos";

  const $ = id => document.getElementById(id);

  if (!window.supabase) {
    console.error("Supabase library is not loaded.");
    alert("Supabase library lama helin. Hubi CDN script-ka HTML.");
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ---------------- STATE ---------------- */

  let students = [];
  let institutions = [];
  let allCourses = [];
  let allClasses = [];
  let allAcademicYears = [];
  let enrollments = [];

  let editingStudentId = null;
  let selectedStudent = null;
  let currentPhotoUrl = null;
  let isSaving = false;
  let messageTimer = null;

  /* ---------------- HELPERS ---------------- */

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function value(id) {
    return $(id)?.value?.trim() || "";
  }

  function setValue(id, val) {
    if ($(id)) $(id).value = val ?? "";
  }

  function showMessage(message, type = "success") {
    const box = $("message");

    if (!box) {
      alert(message);
      return;
    }

    if (messageTimer) clearTimeout(messageTimer);

    box.textContent = message;
    box.className = "message " + type;
    box.style.display = "block";

    messageTimer = window.setTimeout(() => {
      box.style.display = "none";
      box.className = "message";
    }, 6000);
  }

  function setLoading(button, loading, text = "Saving...") {
    if (!button) return;

    if (loading) {
      button.dataset.oldText = button.textContent;
      button.disabled = true;
      button.textContent = text;
    } else {
      button.disabled = false;
      button.textContent = button.dataset.oldText || button.textContent;
      delete button.dataset.oldText;
    }
  }

  function dateOnly(date) {
    return date ? String(date).slice(0, 10) : "";
  }

  function formatDate(date) {
    if (!date) return "—";
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  }

  function normalizeStatus(status) {
    return String(status || "active").toLowerCase();
  }

  function getInstitutionName(id) {
    const item = institutions.find(x => x.id === id);
    return item?.name || item?.institution_name || item?.title || "Not assigned";
  }

  function getCourseName(id) {
    const item = allCourses.find(x => x.id === id);
    return item?.name || item?.course_name || "Not assigned";
  }

  function getClassName(id) {
    const item = allClasses.find(x => x.id === id);
    return item?.name || item?.class_name || "Not assigned";
  }

  function getYearName(id) {
    const item = allAcademicYears.find(x => x.id === id);
    return item?.year_name || "";
  }

  function getEnrollment(studentDbId) {
    return enrollments.find(e => e.student_id === studentDbId) || null;
  }

  function getStudentPhoto(student) {
    return student?.photo_url || "";
  }

  function showProgress(show, percent = 0, message = "") {
    if ($("progressWrap")) {
      $("progressWrap").style.display = show ? "block" : "none";
    }

    if ($("progressBar")) {
      $("progressBar").style.width = Math.max(0, Math.min(100, percent)) + "%";
    }

    if ($("progressText")) {
      $("progressText").textContent = message;
    }
  }

  /* ---------------- DROPDOWN HELPER ---------------- */

  function setSelectOptions(elementId, rows, placeholder, labelFn, options = {}) {
    const select = $(elementId);
    if (!select) return;

    const previous = select.value;
    const shouldDisableWhenEmpty = options.disableWhenEmpty !== false;

    select.innerHTML = "";

    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    select.appendChild(first);

    (rows || []).forEach(row => {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = labelFn(row);
      select.appendChild(option);
    });

    select.disabled = shouldDisableWhenEmpty && (!rows || rows.length === 0);

    if (previous && (rows || []).some(row => String(row.id) === String(previous))) {
      select.value = previous;
    } else {
      select.value = "";
    }
  }

  /* ---------------- LOAD REFERENCE DATA ---------------- */

  async function loadReferenceData() {
    const [
      institutionResult,
      courseResult,
      classResult,
      yearResult
    ] = await Promise.all([
      db.from("institutions").select("*").order("name"),
      db.from("courses").select("*").order("name"),
      db.from("classes").select("*").order("name"),
      db.from("academic_years").select("*").order("year_name")
    ]);

    if (institutionResult.error) throw institutionResult.error;
    if (courseResult.error) throw courseResult.error;
    if (classResult.error) throw classResult.error;
    if (yearResult.error) throw yearResult.error;

    institutions = institutionResult.data || [];
    allCourses = courseResult.data || [];
    allClasses = classResult.data || [];
    allAcademicYears = yearResult.data || [];

    populateInstitutionDropdowns();
  }

  function populateInstitutionDropdowns() {
    const label = row =>
      row.name || row.institution_name || row.title || "Institution";

    setSelectOptions(
      "institutionSelect",
      institutions,
      "Select institution",
      label,
      { disableWhenEmpty: true }
    );

    setSelectOptions(
      "institutionFilter",
      institutions,
      "All institutions",
      label,
      { disableWhenEmpty: false }
    );
  }

  /* ---------------- REGISTRATION DROPDOWNS ---------------- */

  function loadRegistrationCourses() {
    const institutionId = value("institutionSelect");

    const rows = allCourses.filter(course =>
      institutionId && String(course.institution_id) === String(institutionId)
    );

    setSelectOptions(
      "courseSelect",
      rows,
      institutionId ? "Select course" : "Select institution first",
      row => row.name || row.course_name || "Course"
    );

    setSelectOptions(
      "classSelect",
      [],
      "Select course and year first",
      row => row.name
    );
  }

  function loadRegistrationYears() {
    const institutionId = value("institutionSelect");

    const rows = allAcademicYears.filter(year =>
      institutionId && String(year.institution_id) === String(institutionId)
    );

    setSelectOptions(
      "academicYearSelect",
      rows,
      institutionId ? "Select academic year" : "Select institution first",
      row => row.year_name || "Academic Year"
    );

    setSelectOptions(
      "classSelect",
      [],
      "Select course and year first",
      row => row.name
    );
  }

  function loadRegistrationClasses() {
    const institutionId = value("institutionSelect");
    const courseId = value("courseSelect");
    const yearId = value("academicYearSelect");

    const selectedYear = allAcademicYears.find(
      item => String(item.id) === String(yearId)
    );

    const yearName = String(selectedYear?.year_name || "");

    const rows = allClasses.filter(item => {
      const institutionMatch =
        institutionId && String(item.institution_id) === String(institutionId);

      const courseMatch =
        courseId && String(item.course_id) === String(courseId);

      const classYear = String(item.academic_year || "");
      const yearMatch = !classYear || !yearName || classYear === yearName;

      return institutionMatch && courseMatch && yearMatch;
    });

    setSelectOptions(
      "classSelect",
      rows,
      !courseId ? "Select course first" :
        !yearId ? "Select academic year first" : "Select class",
      row => row.name || row.class_name || "Class"
    );
  }

  /* ---------------- FILTER DROPDOWNS ---------------- */

  function loadFilterCourses() {
    const institutionId = value("institutionFilter");

    const rows = allCourses.filter(course =>
      !institutionId || String(course.institution_id) === String(institutionId)
    );

    setSelectOptions(
      "courseFilter",
      rows,
      "All courses",
      row => row.name || row.course_name || "Course",
      { disableWhenEmpty: false }
    );

    setSelectOptions(
      "classFilter",
      [],
      "All classes",
      row => row.name,
      { disableWhenEmpty: false }
    );
  }

  function loadFilterClasses() {
    const institutionId = value("institutionFilter");
    const courseId = value("courseFilter");

    const rows = allClasses.filter(item => {
      const institutionMatch =
        !institutionId || String(item.institution_id) === String(institutionId);

      const courseMatch =
        !courseId || String(item.course_id) === String(courseId);

      return institutionMatch && courseMatch;
    });

    setSelectOptions(
      "classFilter",
      rows,
      "All classes",
      row => row.name || row.class_name || "Class",
      { disableWhenEmpty: false }
    );

    renderStudents();
  }

  /* ---------------- LOAD STUDENTS ---------------- */

  async function loadStudents() {
    const table = $("studentsTableBody");

    if (table) {
      table.innerHTML =
        '<tr><td colspan="13" class="empty">Loading students...</td></tr>';
    }

    const [
      studentResult,
      enrollmentResult,
      courseResult,
      classResult,
      yearResult
    ] = await Promise.all([
      db.from("students")
        .select("*")
        .order("created_at", { ascending: false }),

      db.from("enrollments")
        .select("id,institution_id,student_id,course_id,class_id,academic_year_id,enrollment_number,enrollment_date,start_date,end_date,status,created_at")
        .order("created_at", { ascending: false }),

      db.from("courses").select("id,institution_id,name,code"),
      db.from("classes").select("id,institution_id,course_id,name,code,academic_year"),
      db.from("academic_years").select("id,institution_id,year_name")
    ]);

    if (studentResult.error) throw studentResult.error;
    if (enrollmentResult.error) throw enrollmentResult.error;
    if (courseResult.error) throw courseResult.error;
    if (classResult.error) throw classResult.error;
    if (yearResult.error) throw yearResult.error;

    allCourses = courseResult.data || [];
    allClasses = classResult.data || [];
    allAcademicYears = yearResult.data || [];
    enrollments = enrollmentResult.data || [];

    const latestEnrollment = new Map();

    enrollments.forEach(enrollment => {
      if (!latestEnrollment.has(enrollment.student_id)) {
        latestEnrollment.set(enrollment.student_id, enrollment);
      }
    });

    students = (studentResult.data || []).map(student => ({
      ...student,
      enrollment: latestEnrollment.get(student.id) || null
    }));

    renderStudents();
    updateStatistics();
    updateAccountControls();
  }

  /* ---------------- STUDENT TABLE ---------------- */

  function renderStudents() {
    const tbody = $("studentsTableBody");
    if (!tbody) return;

    const search = value("searchInput").toLowerCase();
    const institutionFilter = value("institutionFilter");
    const courseFilter = value("courseFilter");
    const classFilter = value("classFilter");
    const statusFilter = value("statusFilter");

    const filtered = students.filter(student => {
      const enrollment = student.enrollment || getEnrollment(student.id);

      const institutionId =
        enrollment?.institution_id || student.institution_id || "";

      const courseId = enrollment?.course_id || "";
      const classId = enrollment?.class_id || "";
      const status = normalizeStatus(student.status);

      const searchable = [
        student.student_id,
        student.full_name,
        student.phone,
        student.email,
        student.address
      ].join(" ").toLowerCase();

      if (search && !searchable.includes(search)) return false;
      if (institutionFilter && String(institutionId) !== String(institutionFilter)) return false;
      if (courseFilter && String(courseId) !== String(courseFilter)) return false;
      if (classFilter && String(classId) !== String(classFilter)) return false;
      if (statusFilter && status !== statusFilter) return false;

      return true;
    });

    if ($("filterCount")) {
      $("filterCount").textContent =
        filtered.length + " of " + students.length + " students";
    }

    if (!filtered.length) {
      tbody.innerHTML =
        '<tr><td colspan="13" class="empty">No students found.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(student => {
      const enrollment = student.enrollment || getEnrollment(student.id);

      const institutionId =
        enrollment?.institution_id || student.institution_id || "";

      const courseId = enrollment?.course_id || "";
      const classId = enrollment?.class_id || "";
      const status = normalizeStatus(student.status);

      const photo = getStudentPhoto(student);

      const photoHTML = photo
        ? '<img src="' + escapeHTML(photo) +
          '" alt="Student" class="student-photo" loading="lazy">'
        : '<div class="initials">' +
          escapeHTML((student.full_name || "S").charAt(0).toUpperCase()) +
          "</div>";

      const accountActive =
        Boolean(student.auth_user_id) || Boolean(student.account_enabled);

      return `
        <tr data-student-id="${escapeHTML(student.id)}">
          <td>${photoHTML}</td>
          <td><strong>${escapeHTML(student.student_id || "—")}</strong></td>
          <td>${escapeHTML(student.full_name || "—")}</td>
          <td>${escapeHTML(getInstitutionName(institutionId))}</td>
          <td>${escapeHTML(getCourseName(courseId))}</td>
          <td>${escapeHTML(getClassName(classId))}</td>
          <td>${escapeHTML(student.gender || "—")}</td>
          <td>${escapeHTML(student.phone || "—")}</td>
          <td>${escapeHTML(student.email || "—")}</td>
          <td><span class="status status-${escapeHTML(status)}">${escapeHTML(status)}</span></td>
          <td>${escapeHTML(formatDate(student.admission_date))}</td>
          <td>
            <span class="status ${accountActive ? "status-active" : "status-inactive"}">
              ${accountActive ? "Enabled" : "No account"}
            </span>
          </td>
          <td>
            <div class="actions">
              <button type="button" class="btn-small action-view" data-action="view" data-id="${escapeHTML(student.id)}">View</button>
              <button type="button" class="btn-small action-edit" data-action="edit" data-id="${escapeHTML(student.id)}">Edit</button>
              <button type="button" class="btn-small action-create-account" data-action="account" data-id="${escapeHTML(student.id)}">Account</button>
              <button type="button" class="btn-small action-delete" data-action="delete" data-id="${escapeHTML(student.id)}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  /* ---------------- STATISTICS ---------------- */

  function updateStatistics() {
    const total = students.length;
    const active = students.filter(s => normalizeStatus(s.status) === "active").length;
    const graduated = students.filter(s => normalizeStatus(s.status) === "graduated").length;
    const other = total - active - graduated;

    if ($("totalStudents")) $("totalStudents").textContent = total;
    if ($("activeStudents")) $("activeStudents").textContent = active;
    if ($("graduatedStudents")) $("graduatedStudents").textContent = graduated;
    if ($("otherStudents")) $("otherStudents").textContent = other;
  }

  /* ---------------- ACCOUNT BUTTONS IN FORM ---------------- */

  function updateAccountControls() {
    const createButton = $("createAccountButton");
    const resetButton = $("resetPasswordButton");
    const statusLabel = $("accountStatus");

    const student = selectedStudent;
    const hasAccount = Boolean(
      student && (student.auth_user_id || student.account_enabled)
    );

    if (createButton) createButton.style.display =
      student && !hasAccount ? "inline-block" : "none";

    if (resetButton) resetButton.style.display =
      student && hasAccount ? "inline-block" : "none";

    if (statusLabel) {
      statusLabel.textContent = hasAccount ? "Account Enabled" : "No Account";
      statusLabel.className = "status " +
        (hasAccount ? "status-active" : "status-inactive");
    }
  }

  /* ---------------- PHOTO UPLOAD ---------------- */

  async function uploadStudentPhoto(studentDbId) {
    const file = $("photoInput")?.files?.[0];

    if (!file) return currentPhotoUrl;

    if (!file.type.startsWith("image/")) {
      throw new Error("Fadlan dooro sawir image ah.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Sawirka waa inuu ka yaraadaa 5MB.");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Sawirka waa inuu noqdaa JPG, PNG ama WEBP.");
    }

    const extension = file.type === "image/png" ? "png" :
      file.type === "image/webp" ? "webp" : "jpg";

    const uniqueName = crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now() + "-" + Math.random().toString(36).slice(2);

    const path = "students/" + studentDbId + "/" + uniqueName + "." + extension;

    const { error: uploadError } = await db.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    const { data } = db.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  }

  function previewSelectedPhoto() {
    const file = $("photoInput")?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage("Fadlan dooro sawir sax ah.", "error");
      $("photoInput").value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("Sawirka waa inuu ka yaraadaa 5MB.", "error");
      $("photoInput").value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = event => {
      if ($("photoPreview")) {
        $("photoPreview").src = event.target.result;
        $("photoPreview").style.display = "block";
      }

      if ($("photoPlaceholder")) {
        $("photoPlaceholder").style.display = "none";
      }
    };

    reader.readAsDataURL(file);
  }

  /* ---------------- FORM DATA ---------------- */

  function getStudentFormData() {
    return {
      institution_id: value("institutionSelect"),
      course_id: value("courseSelect"),
      academic_year_id: value("academicYearSelect"),
      class_id: value("classSelect"),
      full_name: value("fullName"),
      gender: value("gender") || null,
      date_of_birth: value("dateOfBirth") || null,
      phone: value("phone") || null,
      email: value("email") || null,
      admission_date: value("admissionDate"),
      status: value("status") || "active",
      address: value("address") || null
    };
  }

  function validateStudentForm(data) {
    if (!data.institution_id) throw new Error("Fadlan dooro Institution.");
    if (!data.course_id) throw new Error("Fadlan dooro Course.");
    if (!data.academic_year_id) throw new Error("Fadlan dooro Academic Year.");
    if (!data.class_id) throw new Error("Fadlan dooro Class.");
    if (!data.full_name) throw new Error("Fadlan geli magaca ardayga.");
    if (!data.admission_date) throw new Error("Fadlan geli Admission Date.");

    const selectedCourse = allCourses.find(
      item => String(item.id) === String(data.course_id)
    );

    const selectedYear = allAcademicYears.find(
      item => String(item.id) === String(data.academic_year_id)
    );

    const selectedClass = allClasses.find(
      item => String(item.id) === String(data.class_id)
    );

    if (!selectedCourse) throw new Error("Course-ka la doortay lama helin.");
    if (!selectedYear) throw new Error("Academic Year-ka la doortay lama helin.");
    if (!selectedClass) throw new Error("Class-ka la doortay lama helin.");

    if (String(selectedCourse.institution_id) !== String(data.institution_id)) {
      throw new Error("Course-kan kuma jiro Institution-ka la doortay.");
    }

    if (String(selectedYear.institution_id) !== String(data.institution_id)) {
      throw new Error("Academic Year-kan kuma jiro Institution-ka la doortay.");
    }

    if (String(selectedClass.institution_id) !== String(data.institution_id)) {
      throw new Error("Class-kan kuma jiro Institution-ka la doortay.");
    }

    if (String(selectedClass.course_id) !== String(data.course_id)) {
      throw new Error("Class-kan kuma jiro Course-ka la doortay.");
    }

    const classYear = String(selectedClass.academic_year || "");
    const yearName = String(selectedYear.year_name || "");

    if (classYear && yearName && classYear !== yearName) {
      throw new Error("Class-kan kuma jiro Academic Year-ka la doortay.");
    }
  }

  /* ---------------- CREATE STUDENT + ENROLLMENT ---------------- */

  async function createStudent(data) {
    const { data: result, error } = await db.rpc(
      "create_student_with_enrollment",
      {
        p_institution_id: data.institution_id,
        p_course_id: data.course_id,
        p_full_name: data.full_name,
        p_admission_date: data.admission_date,
        p_gender: data.gender,
        p_date_of_birth: data.date_of_birth,
        p_phone: data.phone,
        p_email: data.email,
        p_address: data.address,
        p_status: data.status
      }
    );

    if (error) throw error;

    const payload = result || {};
    const studentRecord =
      payload.student || payload.data?.student || payload;

    const studentDbId =
      studentRecord.id ||
      payload.student_id_db ||
      payload.student_db_id ||
      payload.id;

    if (!studentDbId) {
      throw new Error(
        "RPC response kuma jiro Student Database ID. Hubi jawaabta RPC-ga ka hor registration kale."
      );
    }

    const { data: enrollment, error: enrollmentError } = await db
      .from("enrollments")
      .select("id,student_id")
      .eq("student_id", studentDbId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (enrollmentError) throw enrollmentError;

    if (!enrollment?.id) {
      throw new Error(
        "Student waa la sameeyay, laakiin enrollment lama helin. Ha ku celin registration-ka ilaa xogta la hubiyo."
      );
    }

    const { error: linkError } = await db
      .from("enrollments")
      .update({
        institution_id: data.institution_id,
        course_id: data.course_id,
        class_id: data.class_id,
        academic_year_id: data.academic_year_id
      })
      .eq("id", enrollment.id);

    if (linkError) {
      console.error("Enrollment class/year linking failed:", linkError);

      throw new Error(
        "Student waa la sameeyay, laakiin Class/Academic Year laguma xiriirin. " +
        "Enrollment ID: " + enrollment.id +
        ". Hubi RLS permission-ka enrollments. Ha ku celin registration-ka."
      );
    }

    return { studentDbId, rpcResult: payload };
  }

  /* ---------------- UPDATE STUDENT ---------------- */

  async function updateStudent(studentDbId, data) {
    const updateData = {
      full_name: data.full_name,
      gender: data.gender,
      date_of_birth: data.date_of_birth,
      phone: data.phone,
      email: data.email,
      address: data.address,
      admission_date: data.admission_date,
      status: data.status
    };

    const { error } = await db
      .from("students")
      .update(updateData)
      .eq("id", studentDbId);

    if (error) throw error;

    // Existing enrollment is intentionally not changed during profile editing.
    // This preserves the existing enrollment workflow and records.
  }

  /* ---------------- SAVE STUDENT ---------------- */

  async function saveStudent(event) {
    event?.preventDefault();
    if (isSaving) return;

    const button = $("saveButton");
    const data = getStudentFormData();
    const wasEditing = Boolean(editingStudentId);

    try {
      validateStudentForm(data);

      isSaving = true;
      setLoading(button, true, "Saving...");
      showProgress(true, 15, "Saving student information...");

      let studentDbId = editingStudentId;

      if (wasEditing) {
        await updateStudent(editingStudentId, data);
      } else {
        const created = await createStudent(data);
        studentDbId = created.studentDbId;
      }

      showProgress(true, 65, "Uploading student photo...");

      const photoUrl = await uploadStudentPhoto(studentDbId);

      if (photoUrl) {
        const { error: photoError } = await db
          .from("students")
          .update({ photo_url: photoUrl })
          .eq("id", studentDbId);

        if (photoError) throw photoError;
        currentPhotoUrl = photoUrl;
      }

      showProgress(true, 100, "Finishing...");

      showMessage(
        wasEditing ? "Student information updated successfully." :
          "Student registered successfully.",
        "success"
      );

      resetStudentForm();
      await loadStudents();

    } catch (error) {
      console.error("Save student error:", error);
      showMessage(error.message || "Student save failed.", "error");
    } finally {
      isSaving = false;
      setLoading(button, false);
      showProgress(false);
    }
  }

  /* ---------------- RESET FORM ---------------- */

  function resetStudentForm() {
    $("studentForm")?.reset();

    editingStudentId = null;
    selectedStudent = null;
    currentPhotoUrl = null;

    setValue("editStudentDbId", "");

    if ($("saveButton")) {
      $("saveButton").textContent = "Save Student & Enroll";
    }

    if ($("formTitle")) {
      $("formTitle").textContent = "Add Student";
    }

    if ($("studentId")) {
      $("studentId").value = "";
      $("studentId").placeholder = "Generated automatically";
    }

    if ($("photoPreview")) {
      $("photoPreview").src = "";
      $("photoPreview").style.display = "none";
    }

    if ($("photoPlaceholder")) {
      $("photoPlaceholder").style.display = "flex";
    }

    if ($("photoInput")) $("photoInput").value = "";

    loadRegistrationCourses();
    loadRegistrationYears();

    setSelectOptions("classSelect", [], "Select course and year first", row => row.name);
    updateAccountControls();
  }

  /* ---------------- EDIT STUDENT ---------------- */

  function editStudent(studentDbId) {
    const student = students.find(s => String(s.id) === String(studentDbId));
    if (!student) return;

    editingStudentId = student.id;
    selectedStudent = student;
    currentPhotoUrl = student.photo_url || null;

    const enrollment = student.enrollment || getEnrollment(student.id);

    setValue("editStudentDbId", student.id);
    setValue("studentId", student.student_id);
    setValue("fullName", student.full_name);
    setValue("gender", student.gender);
    setValue("dateOfBirth", dateOnly(student.date_of_birth));
    setValue("phone", student.phone);
    setValue("email", student.email);
    setValue("admissionDate", dateOnly(student.admission_date));
    setValue("status", student.status);
    setValue("address", student.address);

    const institutionId =
      enrollment?.institution_id || student.institution_id || "";

    setValue("institutionSelect", institutionId);
    loadRegistrationCourses();
    setValue("courseSelect", enrollment?.course_id || "");

    loadRegistrationYears();
    setValue("academicYearSelect", enrollment?.academic_year_id || "");

    loadRegistrationClasses();
    setValue("classSelect", enrollment?.class_id || "");

    if ($("photoPreview")) {
      $("photoPreview").src = student.photo_url || "";
      $("photoPreview").style.display = student.photo_url ? "block" : "none";
    }

    if ($("photoPlaceholder")) {
      $("photoPlaceholder").style.display = student.photo_url ? "none" : "flex";
    }

    if ($("photoInput")) $("photoInput").value = "";

    if ($("saveButton")) $("saveButton").textContent = "Update Student";
    if ($("formTitle")) $("formTitle").textContent = "Edit Student";

    updateAccountControls();

    $("studentForm")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  /* ---------------- VIEW STUDENT ---------------- */

  function profileItem(label, content) {
    return `
      <div class="profile-item">
        <strong>${escapeHTML(label)}</strong>
        <span>${escapeHTML(content || "—")}</span>
      </div>
    `;
  }

  function viewStudent(studentDbId) {
    const student = students.find(s => String(s.id) === String(studentDbId));
    if (!student) return;

    selectedStudent = student;
    const enrollment = student.enrollment || getEnrollment(student.id);

    const institutionId =
      enrollment?.institution_id || student.institution_id || "";

    const hasAccount = Boolean(student.auth_user_id || student.account_enabled);

    const photo = student.photo_url
      ? `<img src="${escapeHTML(student.photo_url)}" alt="Student photo" class="profile-photo">`
      : `<div class="initials" style="width:90px;height:90px;font-size:30px">${escapeHTML((student.full_name || "S").charAt(0).toUpperCase())}</div>`;

    const content = `
      <div class="profile-top">
        ${photo}
        <div>
          <div class="profile-name">${escapeHTML(student.full_name || "Student")}</div>
          <div class="profile-id">${escapeHTML(student.student_id || "No Student ID")}</div>
          <p style="margin-top:8px">
            <span class="status ${hasAccount ? "status-active" : "status-inactive"}">
              ${hasAccount ? "Account Enabled" : "No Account"}
            </span>
          </p>
        </div>
      </div>

      <div class="profile-grid">
        ${profileItem("Institution", getInstitutionName(institutionId))}
        ${profileItem("Course", getCourseName(enrollment?.course_id))}
        ${profileItem("Class", getClassName(enrollment?.class_id))}
        ${profileItem("Academic Year", getYearName(enrollment?.academic_year_id))}
        ${profileItem("Gender", student.gender)}
        ${profileItem("Date of Birth", formatDate(student.date_of_birth))}
        ${profileItem("Phone", student.phone)}
        ${profileItem("Email", student.email)}
        ${profileItem("Admission Date", formatDate(student.admission_date))}
        ${profileItem("Status", student.status)}
        ${profileItem("Address", student.address)}
        ${profileItem("Portal Account", hasAccount ? "Enabled" : "Not created")}
      </div>
    `;

    if ($("profileContent")) $("profileContent").innerHTML = content;

    if ($("profileModal")) {
      $("profileModal").classList.add("show");
      $("profileModal").setAttribute("aria-hidden", "false");
    }

    updateAccountControls();
  }

  function closeProfile() {
    if ($("profileModal")) {
      $("profileModal").classList.remove("show");
      $("profileModal").setAttribute("aria-hidden", "true");
    }
  }

  /* ---------------- DELETE STUDENT ---------------- */

  async function deleteStudent(studentDbId) {
    const student = students.find(s => String(s.id) === String(studentDbId));
    if (!student) return;

    const confirmed = window.confirm(
      "Ma hubtaa inaad tirtirayso ardaygan?\n\n" +
      student.full_name + " (" + student.student_id + ")"
    );

    if (!confirmed) return;

    try {
      const { error } = await db
        .from("students")
        .delete()
        .eq("id", studentDbId);

      if (error) throw error;

      showMessage("Student deleted successfully.", "success");
      await loadStudents();

    } catch (error) {
      console.error("Delete student error:", error);
      showMessage(
        error.message || "Student deletion failed. Hubi permissions iyo xiriirka records-ka.",
        "error"
      );
    }
  }

  /* ---------------- EDGE FUNCTION: ACCOUNT ---------------- */

  async function getAccessToken() {
    const { data, error } = await db.auth.getSession();
    if (error) throw error;

    const token = data?.session?.access_token;

    if (!token) {
      throw new Error("Fadlan marka hore login samee.");
    }

    return token;
  }

  async function callStudentAccountFunction(payload) {
    let token = await getAccessToken();

    async function sendRequest(accessToken) {
      return fetch(ACCOUNT_FUNCTION, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + accessToken
        },
        body: JSON.stringify(payload)
      });
    }

    let response = await sendRequest(token);

    if (response.status === 401) {
      const { data, error } = await db.auth.refreshSession();
      if (error) throw error;

      token = data?.session?.access_token;

      if (!token) {
        throw new Error("Session refresh failed. Fadlan dib u login samee.");
      }

      response = await sendRequest(token);
    }

    let result = {};

    try {
      result = await response.json();
    } catch {
      throw new Error("Edge Function-ku ma soo celin JSON response sax ah.");
    }

    if (!response.ok || result.success === false) {
      throw new Error(
        result.error || result.message ||
        "Student account operation failed (" + response.status + ")."
      );
    }

    return result;
  }

  /* ---------------- CREATE STUDENT ACCOUNT ---------------- */

  async function createStudentAccount(studentDbId) {
    const student = students.find(s => String(s.id) === String(studentDbId));
    if (!student) throw new Error("Student lama helin.");

    if (student.auth_user_id || student.account_enabled) {
      throw new Error("Student-kan account hore ayuu u leeyahay. Isticmaal Reset Password.");
    }

    const email = student.email || window.prompt("Geli email-ka student-ka:");
    if (!email) return;

    const password = window.prompt("Geli temporary password-ka student-ka:");
    if (!password) return;

    if (password.length < 6) {
      throw new Error("Password-ku waa inuu ugu yaraan 6 xaraf noqdaa.");
    }

    const result = await callStudentAccountFunction({
      action: "create",
      student_db_id: student.id,
      student_id: student.student_id,
      email: email,
      full_name: student.full_name,
      password: password
    });

    showMessage(
      "Student account waa la sameeyay. " + (result.email || email),
      "success"
    );

    await loadStudents();
  }

  /* ---------------- RESET STUDENT PASSWORD ---------------- */

  async function resetStudentPassword(studentDbId) {
    const student = students.find(s => String(s.id) === String(studentDbId));
    if (!student) throw new Error("Student lama helin.");

    if (!student.auth_user_id && !student.account_enabled) {
      throw new Error("Student-kan account ma laha. Marka hore Create Account samee.");
    }

    const password = window.prompt("Geli password-ka cusub ee student-ka:");
    if (!password) return;

    if (password.length < 6) {
      throw new Error("Password-ku waa inuu ugu yaraan 6 xaraf noqdaa.");
    }

    const result = await callStudentAccountFunction({
      action: "reset",
      student_db_id: student.id,
      student_id: student.student_id,
      password: password
    });

    showMessage(
      result.message || "Student password successfully reset.",
      "success"
    );

    await loadStudents();
  }

  async function handleAccountAction(studentDbId) {
    const student = students.find(s => String(s.id) === String(studentDbId));
    if (!student) return;

    try {
      if (student.auth_user_id || student.account_enabled) {
        const reset = window.confirm(
          "Student account hore ayuu u jiraa.\n" +
          "OK = Reset Password\nCancel = Jooji"
        );

        if (reset) await resetStudentPassword(studentDbId);
      } else {
        await createStudentAccount(studentDbId);
      }
    } catch (error) {
      console.error("Student account error:", error);
      showMessage(error.message || "Account operation failed.", "error");
    }
  }

  /* ---------------- TABLE ACTION EVENTS ---------------- */

  function handleTableClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const studentDbId = button.dataset.id;
    if (!studentDbId) return;

    if (action === "view") viewStudent(studentDbId);
    if (action === "edit") editStudent(studentDbId);
    if (action === "delete") deleteStudent(studentDbId);
    if (action === "account") handleAccountAction(studentDbId);
  }

  /* ---------------- RESET FILTERS ---------------- */

  function resetFilters() {
    setValue("institutionFilter", "");
    setValue("courseFilter", "");
    setValue("classFilter", "");
    setValue("statusFilter", "");
    setValue("searchInput", "");

    loadFilterCourses();
    loadFilterClasses();
    renderStudents();
  }

  /* ---------------- EVENT LISTENERS ---------------- */

  function bindEvents() {
    $("studentForm")?.addEventListener("submit", saveStudent);

    $("institutionSelect")?.addEventListener("change", () => {
      loadRegistrationCourses();
      loadRegistrationYears();
    });

    $("courseSelect")?.addEventListener("change", () => {
      loadRegistrationClasses();
    });

    $("academicYearSelect")?.addEventListener("change", () => {
      loadRegistrationClasses();
    });

    $("institutionFilter")?.addEventListener("change", () => {
      loadFilterCourses();
      loadFilterClasses();
    });

    $("courseFilter")?.addEventListener("change", loadFilterClasses);

    ["classFilter", "statusFilter"].forEach(id => {
      $(id)?.addEventListener("change", renderStudents);
    });

    $("searchInput")?.addEventListener("input", renderStudents);

    $("resetFiltersButton")?.addEventListener("click", resetFilters);

    $("refreshStudentsButton")?.addEventListener("click", async () => {
      try {
        await loadReferenceData();
        await loadStudents();
        loadRegistrationCourses();
        loadRegistrationYears();
        loadFilterCourses();
        loadFilterClasses();
        showMessage("Student list refreshed.", "success");
      } catch (error) {
        console.error(error);
        showMessage(error.message || "Refresh failed.", "error");
      }
    });

    $("resetFormButton")?.addEventListener("click", resetStudentForm);

    $("addStudentButton")?.addEventListener("click", () => {
      resetStudentForm();
      $("studentForm")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    $("photoInput")?.addEventListener("change", previewSelectedPhoto);

    $("studentsTableBody")?.addEventListener("click", handleTableClick);

    $("closeProfileModal")?.addEventListener("click", closeProfile);

    $("profileModal")?.addEventListener("click", event => {
      if (event.target === $("profileModal")) closeProfile();
    });

    $("createAccountButton")?.addEventListener("click", async () => {
      if (!selectedStudent) {
        showMessage("Marka hore dooro student.", "error");
        return;
      }

      try {
        await createStudentAccount(selectedStudent.id);
      } catch (error) {
        showMessage(error.message, "error");
      }
    });

    $("resetPasswordButton")?.addEventListener("click", async () => {
      if (!selectedStudent) {
        showMessage("Marka hore dooro student.", "error");
        return;
      }

      try {
        await resetStudentPassword(selectedStudent.id);
      } catch (error) {
        showMessage(error.message, "error");
      }
    });
  }

  /* ---------------- INITIALIZATION ---------------- */

  async function initializeStudentsPage() {
    try {
      bindEvents();

      showProgress(true, 10, "Loading institutions and courses...");

      await loadReferenceData();

      showProgress(true, 55, "Loading student records...");

      await loadStudents();

      // Initialize dropdowns after reference data and student data are ready.
      loadRegistrationCourses();
      loadRegistrationYears();
      loadFilterCourses();
      loadFilterClasses();

      showProgress(false);

      console.log("GAAWOW EMS Students module initialized.");

    } catch (error) {
      console.error("Students page initialization error:", error);

      showMessage(
        "Students page loading failed: " + (error.message || error),
        "error"
      );

      showProgress(false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeStudentsPage);
  } else {
    initializeStudentsPage();
  }

})();
