const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

let currentUser = null;
let currentProfile = null;

let institutions = [];
let courses = [];
let classes = [];
let students = [];
let enrollments = [];

let editingId = null;


// ===============================
// INIT
// ===============================

document.addEventListener("DOMContentLoaded", async () => {

  try {

    const {
      data: { user },
      error
    } = await supabaseClient.auth.getUser();

    if (error || !user) {
      window.location.href = "index.html";
      return;
    }

    currentUser = user;

    await loadProfile();

    if (!currentProfile) {
      showMessage(
        "Profile not found.",
        "error"
      );
      return;
    }

    if (currentProfile.role !== "super_admin") {

      showMessage(
        "Access denied. Super Admin only.",
        "error"
      );

      return;
    }

    await loadInstitutions();
    await loadCourses();
    await loadClasses();
    await loadStudents();
    await loadEnrollments();

    setupEvents();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message || "Failed to load module.",
      "error"
    );

  }

});


// ===============================
// PROFILE
// ===============================

async function loadProfile() {

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  currentProfile = data;
}


// ===============================
// INSTITUTIONS
// ===============================

async function loadInstitutions() {

  const {
    data,
    error
  } = await supabaseClient
    .from("institutions")
    .select("*")
    .order("name");

  if (error) {
    throw error;
  }

  institutions = data || [];

  populateInstitutionFilters();
}


function populateInstitutionFilters() {

  const filter =
    document.getElementById("institutionFilter");

  const form =
    document.getElementById("formInstitution");

  filter.innerHTML =
    `<option value="">All Institutions</option>`;

  form.innerHTML =
    `<option value="">Select institution</option>`;

  institutions.forEach(inst => {

    filter.innerHTML += `
      <option value="${inst.id}">
        ${escapeHtml(inst.name)}
      </option>
    `;

    form.innerHTML += `
      <option value="${inst.id}">
        ${escapeHtml(inst.name)}
      </option>
    `;

  });

}


// ===============================
// COURSES
// ===============================

async function loadCourses() {

  const {
    data,
    error
  } = await supabaseClient
    .from("courses")
    .select(`
      id,
      institution_id,
      department_id,
      name,
      code,
      is_active
    `)
    .order("name");

  if (error) {
    throw error;
  }

  courses = data || [];

  populateCourseFilters();
}


function populateCourseFilters() {

  const filter =
    document.getElementById("courseFilter");

  const form =
    document.getElementById("formCourse");

  filter.innerHTML =
    `<option value="">All Courses</option>`;

  form.innerHTML =
    `<option value="">Select course</option>`;

  courses.forEach(course => {

    filter.innerHTML += `
      <option value="${course.id}">
        ${escapeHtml(course.name)}
        (${escapeHtml(course.code || "")})
      </option>
    `;

    form.innerHTML += `
      <option value="${course.id}">
        ${escapeHtml(course.name)}
        (${escapeHtml(course.code || "")})
      </option>
    `;

  });

}


// ===============================
// CLASSES
// ===============================

async function loadClasses() {

  const {
    data,
    error
  } = await supabaseClient
    .from("classes")
    .select(`
      id,
      institution_id,
      course_id,
      name,
      code,
      academic_year,
      is_active
    `)
    .order("name");

  if (error) {
    throw error;
  }

  classes = data || [];

  populateClassFilters();
}


function populateClassFilters() {

  const filter =
    document.getElementById("classFilter");

  const form =
    document.getElementById("formClass");

  filter.innerHTML =
    `<option value="">All Classes</option>`;

  form.innerHTML =
    `<option value="">Select class</option>`;

  classes.forEach(cls => {

    filter.innerHTML += `
      <option value="${cls.id}">
        ${escapeHtml(cls.name)}
        (${escapeHtml(cls.code || "")})
      </option>
    `;

    form.innerHTML += `
      <option value="${cls.id}">
        ${escapeHtml(cls.name)}
        (${escapeHtml(cls.code || "")})
      </option>
    `;

  });

}


// ===============================
// STUDENTS
// ===============================

async function loadStudents() {

  const {
    data,
    error
  } = await supabaseClient
    .from("students")
    .select(`
      id,
      institution_id,
      student_id,
      full_name,
      status
    `)
    .order("full_name");

  if (error) {
    throw error;
  }

  students = data || [];

  populateStudentDropdown();
}


function populateStudentDropdown(
  institutionId = ""
) {

  const select =
    document.getElementById("formStudent");

  select.innerHTML =
    `<option value="">Select student</option>`;

  students
    .filter(student => {

      if (!institutionId) {
        return true;
      }

      return student.institution_id === institutionId;

    })
    .forEach(student => {

      select.innerHTML += `
        <option value="${student.id}">
          ${escapeHtml(student.full_name)}
          — ${escapeHtml(student.student_id || "")}
        </option>
      `;

    });

}


// ===============================
// ENROLLMENTS
// ===============================

async function loadEnrollments() {

  const {
    data,
    error
  } = await supabaseClient
    .from("enrollments")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  enrollments = data || [];

  renderEnrollments();

}


// ===============================
// EVENTS
// ===============================

function setupEvents() {

  document
    .getElementById("institutionFilter")
    .addEventListener(
      "change",
      applyFilters
    );

  document
    .getElementById("courseFilter")
    .addEventListener(
      "change",
      applyFilters
    );

  document
    .getElementById("classFilter")
    .addEventListener(
      "change",
      applyFilters
    );

  document
    .getElementById("statusFilter")
    .addEventListener(
      "change",
      applyFilters
    );

  document
    .getElementById("searchInput")
    .addEventListener(
      "input",
      applyFilters
    );


  document
    .getElementById("formInstitution")
    .addEventListener(
      "change",
      () => {

        const institutionId =
          document.getElementById(
            "formInstitution"
          ).value;

        filterFormCourses(institutionId);
        filterFormClasses(institutionId);
        populateStudentDropdown(institutionId);

      }
    );


  document
    .getElementById("formCourse")
    .addEventListener(
      "change",
      () => {

        const institutionId =
          document.getElementById(
            "formInstitution"
          ).value;

        const courseId =
          document.getElementById(
            "formCourse"
          ).value;

        filterFormClasses(
          institutionId,
          courseId
        );

      }
    );

}


// ===============================
// FILTER FORM COURSES
// ===============================

function filterFormCourses(
  institutionId
) {

  const select =
    document.getElementById("formCourse");

  select.innerHTML =
    `<option value="">Select course</option>`;

  courses
    .filter(course =>
      !institutionId ||
      course.institution_id === institutionId
    )
    .forEach(course => {

      select.innerHTML += `
        <option value="${course.id}">
          ${escapeHtml(course.name)}
          (${escapeHtml(course.code || "")})
        </option>
      `;

    });

}


// ===============================
// FILTER FORM CLASSES
// ===============================

function filterFormClasses(
  institutionId = "",
  courseId = ""
) {

  const select =
    document.getElementById("formClass");

  select.innerHTML =
    `<option value="">Select class</option>`;

  classes
    .filter(cls => {

      if (
        institutionId &&
        cls.institution_id !== institutionId
      ) {
        return false;
      }

      if (
        courseId &&
        cls.course_id !== courseId
      ) {
        return false;
      }

      return true;

    })
    .forEach(cls => {

      select.innerHTML += `
        <option value="${cls.id}">
          ${escapeHtml(cls.name)}
          (${escapeHtml(cls.code || "")})
        </option>
      `;

    });

}


// ===============================
// RENDER
// ===============================

function renderEnrollments(
  filtered = null
) {

  const body =
    document.getElementById(
      "enrollmentTableBody"
    );

  const list =
    filtered || enrollments;

  updateStats(list);

  if (!list.length) {

    body.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          No enrollments found.
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML =
    list.map(enrollment => {

      const student =
        students.find(
          s => s.id === enrollment.student_id
        );

      const course =
        courses.find(
          c => c.id === enrollment.course_id
        );

      const cls =
        classes.find(
          c => c.id === enrollment.class_id
        );


      const studentName =
        student?.full_name || "Unknown";

      const studentId =
        student?.student_id || "—";

      const courseName =
        course?.name || "Unknown";

      const className =
        cls?.name || "—";


      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(studentName)}
            </strong>
          </td>

          <td>
            ${escapeHtml(studentId)}
          </td>

          <td>
            ${escapeHtml(courseName)}
          </td>

          <td>
            ${escapeHtml(className)}
          </td>

          <td>
            ${escapeHtml(
              enrollment.enrollment_number || "—"
            )}
          </td>

          <td>
            ${formatDate(
              enrollment.enrollment_date
            )}
          </td>

          <td>
            <span class="badge ${enrollment.status}">
              ${capitalize(
                enrollment.status
              )}
            </span>
          </td>

          <td>

            <div class="actions">

              <button
                class="btn-primary"
                onclick="editEnrollment('${enrollment.id}')"
              >
                Edit
              </button>

            </div>

          </td>

        </tr>
      `;

    }).join("");

}


// ===============================
// FILTER
// ===============================

function applyFilters() {

  const institutionId =
    document.getElementById(
      "institutionFilter"
    ).value;

  const courseId =
    document.getElementById(
      "courseFilter"
    ).value;

  const classId =
    document.getElementById(
      "classFilter"
    ).value;

  const status =
    document.getElementById(
      "statusFilter"
    ).value;

  const search =
    document.getElementById(
      "searchInput"
    ).value
    .toLowerCase()
    .trim();


  const filtered =
    enrollments.filter(enrollment => {

      if (
        institutionId &&
        enrollment.institution_id !== institutionId
      ) {
        return false;
      }

      if (
        courseId &&
        enrollment.course_id !== courseId
      ) {
        return false;
      }

      if (
        classId &&
        enrollment.class_id !== classId
      ) {
        return false;
      }

      if (
        status &&
        enrollment.status !== status
      ) {
        return false;
      }


      if (search) {

        const student =
          students.find(
            s => s.id === enrollment.student_id
          );

        const studentName =
          student?.full_name || "";

        const studentId =
          student?.student_id || "";

        const enrollmentNumber =
          enrollment.enrollment_number || "";


        const text =
          (
            studentName +
            " " +
            studentId +
            " " +
            enrollmentNumber
          ).toLowerCase();


        if (!text.includes(search)) {
          return false;
        }

      }

      return true;

    });


  renderEnrollments(filtered);

}


// ===============================
// STATS
// ===============================

function updateStats(list) {

  const total =
    list.length;

  const active =
    list.filter(
      e => e.status === "active"
    ).length;

  const completed =
    list.filter(
      e => e.status === "completed"
    ).length;

  const other =
    list.filter(
      e =>
        e.status === "dropped" ||
        e.status === "suspended"
    ).length;


  document.getElementById(
    "totalCount"
  ).textContent = total;

  document.getElementById(
    "activeCount"
  ).textContent = active;

  document.getElementById(
    "completedCount"
  ).textContent = completed;

  document.getElementById(
    "otherCount"
  ).textContent = other;

}


// ===============================
// MODAL
// ===============================

function openEnrollmentModal(
  enrollment = null
) {

  editingId =
    enrollment?.id || null;

  document.getElementById(
    "modalTitle"
  ).textContent =
    enrollment
      ? "Edit Enrollment"
      : "New Enrollment";


  document.getElementById(
    "formEnrollmentNumber"
  ).value =
    enrollment?.enrollment_number || "";


  document.getElementById(
    "formEnrollmentDate"
  ).value =
    enrollment?.enrollment_date ||
    getToday();


  document.getElementById(
    "formStartDate"
  ).value =
    enrollment?.start_date || "";


  document.getElementById(
    "formEndDate"
  ).value =
    enrollment?.end_date || "";


  document.getElementById(
    "formStatus"
  ).value =
    enrollment?.status || "active";


  document.getElementById(
    "formInstitution"
  ).value =
    enrollment?.institution_id || "";


  filterFormCourses(
    enrollment?.institution_id || ""
  );

  document.getElementById(
    "formCourse"
  ).value =
    enrollment?.course_id || "";


  filterFormClasses(
    enrollment?.institution_id || "",
    enrollment?.course_id || ""
  );

  document.getElementById(
    "formClass"
  ).value =
    enrollment?.class_id || "";


  populateStudentDropdown(
    enrollment?.institution_id || ""
  );

  document.getElementById(
    "formStudent"
  ).value =
    enrollment?.student_id || "";


  document.getElementById(
    "enrollmentModal"
  ).style.display = "block";

}


function closeEnrollmentModal() {

  document.getElementById(
    "enrollmentModal"
  ).style.display = "none";

  editingId = null;

}


// ===============================
// SAVE
// ===============================

async function saveEnrollment() {

  try {

    const institutionId =
      document.getElementById(
        "formInstitution"
      ).value;

    const courseId =
      document.getElementById(
        "formCourse"
      ).value;

    const classId =
      document.getElementById(
        "formClass"
      ).value || null;

    const studentId =
      document.getElementById(
        "formStudent"
      ).value;

    const enrollmentNumber =
      document.getElementById(
        "formEnrollmentNumber"
      ).value.trim() || null;

    const enrollmentDate =
      document.getElementById(
        "formEnrollmentDate"
      ).value;

    const startDate =
      document.getElementById(
        "formStartDate"
      ).value || null;

    const endDate =
      document.getElementById(
        "formEndDate"
      ).value || null;

    const status =
      document.getElementById(
        "formStatus"
      ).value;


    if (
      !institutionId ||
      !courseId ||
      !studentId ||
      !enrollmentDate
    ) {

      showMessage(
        "Please complete all required fields.",
        "error"
      );

      return;
    }


    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {

      showMessage(
        "End date cannot be before start date.",
        "error"
      );

      return;
    }


    const payload = {

      institution_id:
        institutionId,

      student_id:
        studentId,

      course_id:
        courseId,

      class_id:
        classId,

      enrollment_number:
        enrollmentNumber,

      enrollment_date:
        enrollmentDate,

      start_date:
        startDate,

      end_date:
        endDate,

      status:
        status

    };


    let result;


    if (editingId) {

      result =
        await supabaseClient
          .from("enrollments")
          .update(payload)
          .eq("id", editingId);

    } else {

      result =
        await supabaseClient
          .from("enrollments")
          .insert(payload);

    }


    if (result.error) {
      throw result.error;
    }


    closeEnrollmentModal();

    await loadEnrollments();

    showMessage(
      editingId
        ? "Enrollment updated successfully."
        : "Enrollment created successfully.",
      "success"
    );


  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "Failed to save enrollment.",
      "error"
    );

  }

}


// ===============================
// EDIT
// ===============================

function editEnrollment(id) {

  const enrollment =
    enrollments.find(
      e => e.id === id
    );

  if (!enrollment) {
    return;
  }

  openEnrollmentModal(
    enrollment
  );

}


// ===============================
// MESSAGE
// ===============================

function showMessage(
  text,
  type
) {

  const box =
    document.getElementById(
      "message"
    );

  box.textContent = text;

  box.className =
    "message " +
    (
      type === "success"
        ? "success-message"
        : "error-message"
    );

  box.style.display = "block";


  setTimeout(() => {

    box.style.display = "none";

  }, 5000);

}


// ===============================
// HELPERS
// ===============================

function formatDate(date) {

  if (!date) {
    return "—";
  }

  return new Date(
    date + "T00:00:00"
  ).toLocaleDateString();

}


function getToday() {

  return new Date()
    .toISOString()
    .split("T")[0];

}


function capitalize(value) {

  if (!value) {
    return "";

  }

  return value
    .charAt(0)
    .toUpperCase() +
    value.slice(1);

}


function escapeHtml(value) {

  if (value === null ||
      value === undefined) {

    return "";

  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// Close modal by clicking outside

window.addEventListener(
  "click",
  event => {

    const modal =
      document.getElementById(
        "enrollmentModal"
      );

    if (event.target === modal) {
      closeEnrollmentModal();
    }

  }
);
