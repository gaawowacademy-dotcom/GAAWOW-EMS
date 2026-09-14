const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


let institutions = [];
let courses = [];
let teachers = [];
let classes = [];


document.addEventListener(
  "DOMContentLoaded",
  async () => {

    document
      .getElementById("searchInput")
      .addEventListener(
        "input",
        renderClasses
      );


    document
      .getElementById("institutionFilter")
      .addEventListener(
        "change",
        renderClasses
      );


    document
      .getElementById("courseFilter")
      .addEventListener(
        "change",
        renderClasses
      );


    document
      .getElementById("statusFilter")
      .addEventListener(
        "change",
        renderClasses
      );


    document
      .getElementById("institutionId")
      .addEventListener(
        "change",
        updateModalCourses
      );


    document
      .getElementById("classForm")
      .addEventListener(
        "submit",
        saveClass
      );


    await checkAccess();

  }
);


/* =========================
   ACCESS
========================= */

async function checkAccess() {

  try {

    const {
      data: {
        user
      },
      error
    } = await db.auth.getUser();


    if (error || !user) {

      window.location.href =
        "index.html";

      return;
    }


    const {
      data: profile,
      error: profileError
    } = await db
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        institution_id,
        is_active
      `)
      .eq("id", user.id)
      .single();


    if (
      profileError ||
      !profile
    ) {

      showMessage(
        "Unable to load your profile.",
        "error"
      );

      return;
    }


    if (
      profile.role !== "super_admin" ||
      profile.is_active === false
    ) {

      alert(
        "Access denied. Super Admin only."
      );

      window.location.href =
        "super-admin.html";

      return;
    }


    await loadInstitutions();

    await loadCourses();

    await loadTeachers();

    await loadClasses();

  } catch (error) {

    console.error(error);

    showMessage(
      "Unexpected error: " +
      error.message,
      "error"
    );

  }

}


/* =========================
   INSTITUTIONS
========================= */

async function loadInstitutions() {

  const {
    data,
    error
  } = await db
    .from("institutions")
    .select("id, name")
    .order("name");


  if (error) {

    console.error(error);

    showMessage(
      "Failed to load institutions: " +
      error.message,
      "error"
    );

    return;
  }


  institutions = data || [];


  const filter =
    document.getElementById(
      "institutionFilter"
    );


  const modalSelect =
    document.getElementById(
      "institutionId"
    );


  filter.innerHTML =
    `<option value="">
      All Institutions
    </option>`;


  modalSelect.innerHTML =
    `<option value="">
      Select Institution
    </option>`;


  institutions.forEach(
    institution => {

      filter.innerHTML += `
        <option value="${institution.id}">
          ${escapeHtml(
            institution.name
          )}
        </option>
      `;


      modalSelect.innerHTML += `
        <option value="${institution.id}">
          ${escapeHtml(
            institution.name
          )}
        </option>
      `;

    }
  );

}


/* =========================
   COURSES
========================= */

async function loadCourses() {

  const {
    data,
    error
  } = await db
    .from("courses")
    .select(`
      id,
      institution_id,
      name,
      code,
      is_active
    `)
    .order("name");


  if (error) {

    console.error(error);

    showMessage(
      "Failed to load courses: " +
      error.message,
      "error"
    );

    return;
  }


  courses = data || [];


  const filter =
    document.getElementById(
      "courseFilter"
    );


  filter.innerHTML =
    `<option value="">
      All Courses
    </option>`;


  courses.forEach(course => {

    filter.innerHTML += `
      <option value="${course.id}">
        ${escapeHtml(
          course.name
        )} (${escapeHtml(
          course.code
        )})
      </option>
    `;

  });


  updateModalCourses();

}


/* =========================
   TEACHERS
========================= */

async function loadTeachers() {

  const {
    data,
    error
  } = await db
    .from("profiles")
    .select(`
      id,
      full_name,
      institution_id,
      role,
      is_active
    `)
    .eq("role", "teacher")
    .order("full_name");


  if (error) {

    console.error(
      "Teacher loading error:",
      error
    );

    teachers = [];

    return;
  }


  teachers = data || [];

}


/* =========================
   MODAL COURSES
========================= */

function updateModalCourses() {

  const institutionId =
    document.getElementById(
      "institutionId"
    ).value;


  const select =
    document.getElementById(
      "courseId"
    );


  select.innerHTML =
    `<option value="">
      Select Course
    </option>`;


  const filteredCourses =
    courses.filter(course => {

      if (!institutionId) {
        return course.is_active !== false;
      }

      return (
        course.institution_id ===
        institutionId &&
        course.is_active !== false
      );

    });


  filteredCourses.forEach(
    course => {

      select.innerHTML += `
        <option value="${course.id}">
          ${escapeHtml(
            course.name
          )}
          (${escapeHtml(
            course.code
          )})
        </option>
      `;

    }
  );

}


/* =========================
   CLASSES
========================= */

async function loadClasses() {

  const tbody =
    document.getElementById(
      "classesTableBody"
    );


  tbody.innerHTML = `
    <tr>
      <td colspan="10"
          class="loading">
        Loading classes...
      </td>
    </tr>
  `;


  const {
    data,
    error
  } = await db
    .from("classes")
    .select(`
      id,
      institution_id,
      course_id,
      name,
      code,
      academic_year,
      teacher_id,
      room,
      start_date,
      end_date,
      is_active,
      created_at,
      updated_at
    `)
    .order("name");


  if (error) {

    console.error(error);


    tbody.innerHTML = `
      <tr>
        <td colspan="10"
            class="empty">
          Failed to load classes.
        </td>
      </tr>
    `;


    showMessage(
      "Failed to load classes: " +
      error.message,
      "error"
    );

    return;
  }


  classes = data || [];


  updateStats();

  renderClasses();

}


/* =========================
   RENDER
========================= */

function renderClasses() {

  const tbody =
    document.getElementById(
      "classesTableBody"
    );


  const search =
    document
      .getElementById(
        "searchInput"
      )
      .value
      .trim()
      .toLowerCase();


  const institutionId =
    document.getElementById(
      "institutionFilter"
    ).value;


  const courseId =
    document.getElementById(
      "courseFilter"
    ).value;


  const status =
    document.getElementById(
      "statusFilter"
    ).value;


  const filtered =
    classes.filter(item => {

      const matchesSearch =
        !search ||
        item.name
          .toLowerCase()
          .includes(search) ||
        item.code
          .toLowerCase()
          .includes(search);


      const matchesInstitution =
        !institutionId ||
        item.institution_id ===
        institutionId;


      const matchesCourse =
        !courseId ||
        item.course_id ===
        courseId;


      const matchesStatus =
        status === "" ||
        String(item.is_active) ===
        status;


      return (
        matchesSearch &&
        matchesInstitution &&
        matchesCourse &&
        matchesStatus
      );

    });


  if (!filtered.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="10"
            class="empty">
          No classes found.
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML =
    filtered.map(item => {

      const institution =
        institutions.find(
          i =>
            i.id ===
            item.institution_id
        );


      const course =
        courses.find(
          c =>
            c.id ===
            item.course_id
        );


      const teacher =
        teachers.find(
          t =>
            t.id ===
            item.teacher_id
        );


      const schedule =
        formatSchedule(
          item.start_date,
          item.end_date
        );


      return `
        <tr>

          <td>
            <div class="class-name">
              ${escapeHtml(
                item.name
              )}
            </div>
          </td>


          <td>
            <span class="code">
              ${escapeHtml(
                item.code
              )}
            </span>
          </td>


          <td>
            ${
              institution
                ? escapeHtml(
                    institution.name
                  )
                : "—"
            }
          </td>


          <td>
            ${
              course
                ? escapeHtml(
                    course.name
                  )
                : "—"
            }
          </td>


          <td>
            ${
              item.academic_year
                ? escapeHtml(
                    item.academic_year
                  )
                : "—"
            }
          </td>


          <td>
            ${
              teacher
                ? escapeHtml(
                    teacher.full_name
                  )
                : "Not assigned"
            }
          </td>


          <td>
            ${
              item.room
                ? escapeHtml(
                    item.room
                  )
                : "—"
            }
          </td>


          <td>
            ${schedule}
          </td>


          <td>

            <span class="status ${
              item.is_active
                ? "active"
                : "inactive"
            }">

              ${
                item.is_active
                  ? "Active"
                  : "Inactive"
              }

            </span>

          </td>


          <td>

            <div class="actions">

              <button
                class="action-btn edit-btn"
                onclick="editClass(
                  '${item.id}'
                )"
              >
                Edit
              </button>


              <button
                class="action-btn toggle-btn"
                onclick="toggleClass(
                  '${item.id}',
                  ${item.is_active}
                )"
              >
                ${
                  item.is_active
                    ? "Deactivate"
                    : "Activate"
                }
              </button>

            </div>

          </td>

        </tr>
      `;

    }).join("");

}


/* =========================
   STATS
========================= */

function updateStats() {

  const total =
    classes.length;


  const active =
    classes.filter(
      item =>
        item.is_active
    ).length;


  const inactive =
    classes.filter(
      item =>
        !item.is_active
    ).length;


  document.getElementById(
    "totalClasses"
  ).textContent = total;


  document.getElementById(
    "activeClasses"
  ).textContent = active;


  document.getElementById(
    "inactiveClasses"
  ).textContent = inactive;

}


/* =========================
   ADD CLASS
========================= */

function openAddModal() {

  document
    .getElementById(
      "classForm"
    )
    .reset();


  document.getElementById(
    "classId"
  ).value = "";


  document.getElementById(
    "modalTitle"
  ).textContent =
    "Add Class";


  document.getElementById(
    "isActive"
  ).value =
    "true";


  updateModalCourses();


  document.getElementById(
    "classModal"
  ).style.display =
    "block";

}


/* =========================
   EDIT CLASS
========================= */

function editClass(id) {

  const item =
    classes.find(
      c => c.id === id
    );


  if (!item) {

    alert(
      "Class not found."
    );

    return;
  }


  document.getElementById(
    "classId"
  ).value =
    item.id;


  document.getElementById(
    "institutionId"
  ).value =
    item.institution_id;


  updateModalCourses();


  document.getElementById(
    "courseId"
  ).value =
    item.course_id;


  document.getElementById(
    "className"
  ).value =
    item.name || "";


  document.getElementById(
    "classCode"
  ).value =
    item.code || "";


  document.getElementById(
    "academicYear"
  ).value =
    item.academic_year || "";


  populateTeacherSelect(
    item.institution_id
  );


  document.getElementById(
    "teacherId"
  ).value =
    item.teacher_id || "";


  document.getElementById(
    "room"
  ).value =
    item.room || "";


  document.getElementById(
    "startDate"
  ).value =
    item.start_date || "";


  document.getElementById(
    "endDate"
  ).value =
    item.end_date || "";


  document.getElementById(
    "isActive"
  ).value =
    String(
      item.is_active
    );


  document.getElementById(
    "modalTitle"
  ).textContent =
    "Edit Class";


  document.getElementById(
    "classModal"
  ).style.display =
    "block";

}


/* =========================
   TEACHER DROPDOWN
========================= */

document.addEventListener(
  "change",
  event => {

    if (
      event.target.id ===
      "institutionId"
    ) {

      populateTeacherSelect(
        event.target.value
      );

    }

  }
);


function populateTeacherSelect(
  institutionId
) {

  const select =
    document.getElementById(
      "teacherId"
    );


  select.innerHTML = `
    <option value="">
      No Teacher Assigned
    </option>
  `;


  const filtered =
    teachers.filter(
      teacher => {

        if (!institutionId) {
          return (
            teacher.is_active !== false
          );
        }

        return (
          teacher.institution_id ===
          institutionId &&
          teacher.is_active !== false
        );

      }
    );


  filtered.forEach(
    teacher => {

      select.innerHTML += `
        <option value="${teacher.id}">
          ${escapeHtml(
            teacher.full_name
          )}
        </option>
      `;

    }
  );

}


/* =========================
   SAVE CLASS
========================= */

async function saveClass(event) {

  event.preventDefault();


  const id =
    document.getElementById(
      "classId"
    ).value;


  const institution_id =
    document.getElementById(
      "institutionId"
    ).value;


  const course_id =
    document.getElementById(
      "courseId"
    ).value;


  const name =
    document.getElementById(
      "className"
    ).value
      .trim();


  const code =
    document.getElementById(
      "classCode"
    ).value
      .trim()
      .toUpperCase();


  const academic_year =
    document.getElementById(
      "academicYear"
    ).value
      .trim() || null;


  const teacher_id =
    document.getElementById(
      "teacherId"
    ).value || null;


  const room =
    document.getElementById(
      "room"
    ).value
      .trim() || null;


  const start_date =
    document.getElementById(
      "startDate"
    ).value || null;


  const end_date =
    document.getElementById(
      "endDate"
    ).value || null;


  const is_active =
    document.getElementById(
      "isActive"
    ).value === "true";


  if (!institution_id) {

    alert(
      "Please select an institution."
    );

    return;
  }


  if (!course_id) {

    alert(
      "Please select a course."
    );

    return;
  }


  if (!name) {

    alert(
      "Please enter class name."
    );

    return;
  }


  if (!code) {

    alert(
      "Please enter class code."
    );

    return;
  }


  if (
    start_date &&
    end_date &&
    end_date < start_date
  ) {

    alert(
      "End date cannot be before start date."
    );

    return;
  }


  const payload = {

    institution_id,

    course_id,

    name,

    code,

    academic_year,

    teacher_id,

    room,

    start_date,

    end_date,

    is_active

  };


  const button =
    document.querySelector(
      ".save-btn"
    );


  button.disabled = true;

  button.textContent =
    "Saving...";


  try {

    let result;


    if (id) {

      result = await db
        .from("classes")
        .update({

          ...payload,

          updated_at:
            new Date()
              .toISOString()

        })
        .eq(
          "id",
          id
        );

    } else {

      result = await db
        .from("classes")
        .insert(
          payload
        );

    }


    if (result.error) {
      throw result.error;
    }


    closeModal();


    showMessage(
      id
        ? "Class updated successfully."
        : "Class created successfully.",
      "success"
    );


    await loadClasses();


  } catch (error) {

    console.error(error);


    showMessage(
      "Failed to save class: " +
      error.message,
      "error"
    );


  } finally {

    button.disabled = false;

    button.textContent =
      "Save Class";

  }

}


/* =========================
   ACTIVATE / DEACTIVATE
========================= */

async function toggleClass(
  id,
  currentStatus
) {

  const action =
    currentStatus
      ? "deactivate"
      : "activate";


  const confirmed =
    confirm(
      `Are you sure you want to ${action} this class?`
    );


  if (!confirmed) {
    return;
  }


  try {

    const {
      error
    } = await db
      .from("classes")
      .update({

        is_active:
          !currentStatus,

        updated_at:
          new Date()
            .toISOString()

      })
      .eq(
        "id",
        id
      );


    if (error) {
      throw error;
    }


    showMessage(
      `Class ${action}d successfully.`,
      "success"
    );


    await loadClasses();


  } catch (error) {

    console.error(error);


    showMessage(
      "Failed to update class: " +
      error.message,
      "error"
    );

  }

}


/* =========================
   MODAL
========================= */

function closeModal() {

  document.getElementById(
    "classModal"
  ).style.display =
    "none";

}


window.addEventListener(
  "click",
  event => {

    const modal =
      document.getElementById(
        "classModal"
      );


    if (
      event.target === modal
    ) {

      closeModal();

    }

  }
);


/* =========================
   MESSAGE
========================= */

function showMessage(
  message,
  type
) {

  const box =
    document.getElementById(
      "message"
    );


  box.textContent =
    message;


  box.style.display =
    "block";


  if (
    type === "success"
  ) {

    box.style.background =
      "#DCFCE7";

    box.style.color =
      "#166534";

  } else {

    box.style.background =
      "#FEE2E2";

    box.style.color =
      "#991B1B";

  }


  setTimeout(
    () => {
      box.style.display =
        "none";
    },
    5000
  );

}


/* =========================
   DATE FORMAT
========================= */

function formatSchedule(
  start,
  end
) {

  if (!start && !end) {
    return "—";
  }

  if (start && end) {
    return `
      ${escapeHtml(start)}
      →
      ${escapeHtml(end)}
    `;
  }

  return escapeHtml(
    start || end
  );

}


/* =========================
   SECURITY
========================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}
