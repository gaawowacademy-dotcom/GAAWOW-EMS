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

let parents = [];
let filteredParents = [];

let institutions = [];
let students = [];
let links = [];

let editingParentId = null;
let selectedParent = null;

let currentPage = 1;
const pageSize = 15;


/* =========================
   INIT
========================= */

document.addEventListener(
  "DOMContentLoaded",
  init
);


async function init() {

  try {

    setLoading(true);

    const {
      data,
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    currentUser =
      data?.session?.user;

    if (!currentUser) {

      window.location.href =
        "index.html";

      return;

    }


    await loadProfile();

    if (
      currentProfile.role !==
      "super_admin"
    ) {

      showNotice(
        "Access denied. Parent Management is available to Super Admin only.",
        "error"
      );

      setTimeout(() => {

        window.location.href =
          "dashboard.html";

      }, 2200);

      return;

    }


    await loadInstitutions();
    await loadStudents();
    await loadParents();
    await loadLinks();

    applyFilters();

  } catch (error) {

    console.error(error);

    showNotice(
      error.message ||
      "Unable to load Parent Management.",
      "error"
    );

  } finally {

    setLoading(false);

  }

}


/* =========================
   PROFILE
========================= */

async function loadProfile() {

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select(
      "id, full_name, role, institution_id, is_active"
    )
    .eq(
      "id",
      currentUser.id
    )
    .single();

  if (error) {
    throw error;
  }

  currentProfile = data;

  if (
    currentProfile.is_active !== true
  ) {
    throw new Error(
      "Your account is inactive."
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
  } = await supabaseClient
    .from("institutions")
    .select(
      "id, name, code, is_active"
    )
    .order(
      "name",
      {
        ascending:true
      }
    );

  if (error) {
    throw error;
  }

  institutions =
    data || [];

  const filters =
    document.getElementById(
      "institutionFilter"
    );

  const parentInstitution =
    document.getElementById(
      "parentInstitution"
    );

  institutions.forEach(inst => {

    const option1 =
      document.createElement("option");

    option1.value =
      inst.id;

    option1.textContent =
      inst.name;

    filters.appendChild(
      option1
    );


    const option2 =
      document.createElement("option");

    option2.value =
      inst.id;

    option2.textContent =
      inst.name;

    parentInstitution.appendChild(
      option2
    );

  });

}


/* =========================
   STUDENTS
========================= */

async function loadStudents() {

  const {
    data,
    error
  } = await supabaseClient
    .from("students")
    .select(
      "id, institution_id, student_id, full_name, status"
    )
    .order(
      "full_name",
      {
        ascending:true
      }
    );

  if (error) {
    throw error;
  }

  students =
    data || [];

}


/* =========================
   PARENTS
========================= */

async function loadParents() {

  const {
    data,
    error
  } = await supabaseClient
    .from("parents")
    .select(
      "id, institution_id, profile_id, full_name, phone, email, address, occupation, created_at, updated_at"
    )
    .order(
      "created_at",
      {
        ascending:false
      }
    );

  if (error) {
    throw error;
  }

  parents =
    data || [];

}


/* =========================
   LINKS
========================= */

async function loadLinks() {

  const {
    data,
    error
  } = await supabaseClient
    .from("parent_students")
    .select(
      "id, institution_id, parent_id, student_id, relationship, is_primary"
    );

  if (error) {
    throw error;
  }

  links =
    data || [];

}


/* =========================
   FILTER
========================= */

function applyFilters() {

  const search =
    document.getElementById(
      "searchInput"
    ).value
      .trim()
      .toLowerCase();

  const institutionId =
    document.getElementById(
      "institutionFilter"
    ).value;


  filteredParents =
    parents.filter(parent => {

      const text = [

        parent.full_name,
        parent.phone,
        parent.email,
        parent.address,
        parent.occupation

      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();


      return (
        (!search ||
          text.includes(search)) &&

        (!institutionId ||
          parent.institution_id ===
          institutionId)
      );

    });


  currentPage = 1;

  renderParents();

  updateStats();

}


/* =========================
   RENDER
========================= */

function renderParents() {

  const table =
    document.getElementById(
      "parentsTable"
    );

  const tbody =
    document.getElementById(
      "parentsBody"
    );

  const empty =
    document.getElementById(
      "empty"
    );


  tbody.innerHTML = "";


  if (
    filteredParents.length === 0
  ) {

    table.style.display =
      "none";

    empty.style.display =
      "block";

    updatePagination();

    return;

  }


  table.style.display =
    "table";

  empty.style.display =
    "none";


  const start =
    (currentPage - 1) *
    pageSize;

  const end =
    start + pageSize;

  const pageParents =
    filteredParents.slice(
      start,
      end
    );


  pageParents.forEach(
    parent => {

      const institution =
        institutions.find(
          x =>
            x.id ===
            parent.institution_id
        );


      const parentLinks =
        links.filter(
          x =>
            x.parent_id ===
            parent.id
        );


      const row =
        document.createElement("tr");


      row.innerHTML = `

        <td>
          <div class="parent-name">
            ${escapeHtml(
              parent.full_name ||
              "Unnamed Parent"
            )}
          </div>

          <div class="sub">
            ID: ${escapeHtml(
              shortId(parent.id)
            )}
          </div>
        </td>

        <td>
          <div>
            ${escapeHtml(
              parent.phone || "—"
            )}
          </div>

          <div class="sub">
            ${escapeHtml(
              parent.email || "—"
            )}
          </div>
        </td>

        <td>
          <strong>
            ${escapeHtml(
              institution?.name ||
              "—"
            )}
          </strong>

          ${
            institution?.code
              ? `
                <div class="sub">
                  ${escapeHtml(
                    institution.code
                  )}
                </div>
              `
              : ""
          }
        </td>

        <td>
          <span class="badge linked">
            ${parentLinks.length}
            Student${parentLinks.length === 1 ? "" : "s"}
          </span>
        </td>

        <td>
          <span class="badge active">
            Active
          </span>
        </td>

        <td>

          <div class="actions">

            <button
              class="btn btn-blue"
              onclick="editParent('${parent.id}')"
            >
              Edit
            </button>

            <button
              class="btn"
              onclick="manageLinks('${parent.id}')"
            >
              Students
            </button>

            <button
              class="btn btn-red"
              onclick="deleteParent('${parent.id}')"
            >
              Delete
            </button>

          </div>

        </td>

      `;


      tbody.appendChild(row);

    }
  );


  updatePagination();

}


/* =========================
   STATS
========================= */

function updateStats() {

  const total =
    parents.length;


  const active =
    parents.length;


  const linkedParentIds =
    new Set(
      links.map(
        x => x.parent_id
      )
    );


  document.getElementById(
    "totalParents"
  ).textContent =
    total;


  document.getElementById(
    "activeParents"
  ).textContent =
    active;


  document.getElementById(
    "linkedParents"
  ).textContent =
    linkedParentIds.size;


  document.getElementById(
    "totalLinks"
  ).textContent =
    links.length;

}


/* =========================
   ADD PARENT
========================= */

document.getElementById(
  "addParentBtn"
).addEventListener(
  "click",
  openAddParent
);


function openAddParent() {

  editingParentId =
    null;

  document.getElementById(
    "modalTitle"
  ).textContent =
    "Add Parent";

  document.getElementById(
    "saveParentBtn"
  ).textContent =
    "Save Parent";

  clearParentForm();

  document.getElementById(
    "parentModal"
  ).style.display =
    "block";

}


/* =========================
   EDIT PARENT
========================= */

window.editParent =
  function(parentId) {

    const parent =
      parents.find(
        x => x.id === parentId
      );

    if (!parent) {
      return;
    }

    editingParentId =
      parent.id;


    document.getElementById(
      "modalTitle"
    ).textContent =
      "Edit Parent";


    document.getElementById(
      "saveParentBtn"
    ).textContent =
      "Update Parent";


    document.getElementById(
      "parentInstitution"
    ).value =
      parent.institution_id ||
      "";


    document.getElementById(
      "parentName"
    ).value =
      parent.full_name ||
      "";


    document.getElementById(
      "parentPhone"
    ).value =
      parent.phone ||
      "";


    document.getElementById(
      "parentEmail"
    ).value =
      parent.email ||
      "";


    document.getElementById(
      "parentOccupation"
    ).value =
      parent.occupation ||
      "";


    document.getElementById(
      "parentAddress"
    ).value =
      parent.address ||
      "";


    document.getElementById(
      "parentModal"
    ).style.display =
      "block";

  };


/* =========================
   SAVE PARENT
========================= */

document.getElementById(
  "saveParentBtn"
).addEventListener(
  "click",
  saveParent
);


async function saveParent() {

  try {

    const institutionId =
      document.getElementById(
        "parentInstitution"
      ).value;

    const fullName =
      document.getElementById(
        "parentName"
      ).value.trim();

    const phone =
      document.getElementById(
        "parentPhone"
      ).value.trim();

    const email =
      document.getElementById(
        "parentEmail"
      ).value.trim();

    const occupation =
      document.getElementById(
        "parentOccupation"
      ).value.trim();

    const address =
      document.getElementById(
        "parentAddress"
      ).value.trim();


    if (!institutionId) {

      showNotice(
        "Please select an institution.",
        "error"
      );

      return;

    }


    if (!fullName) {

      showNotice(
        "Parent full name is required.",
        "error"
      );

      return;

    }


    const payload = {

      institution_id:
        institutionId,

      full_name:
        fullName,

      phone:
        phone || null,

      email:
        email || null,

      occupation:
        occupation || null,

      address:
        address || null,

      updated_at:
        new Date().toISOString()

    };


    let error;


    if (editingParentId) {

      const result =
        await supabaseClient
          .from("parents")
          .update(payload)
          .eq(
            "id",
            editingParentId
          );

      error =
        result.error;

    } else {

      const result =
        await supabaseClient
          .from("parents")
          .insert(payload);

      error =
        result.error;

    }


    if (error) {
      throw error;
    }


    closeParentModal();

    await loadParents();

    applyFilters();

    showNotice(
      editingParentId
        ? "Parent updated successfully."
        : "Parent created successfully.",
      "success"
    );


  } catch (error) {

    console.error(error);

    showNotice(
      error.message ||
      "Unable to save parent.",
      "error"
    );

  }

}


/* =========================
   DELETE PARENT
========================= */

window.deleteParent =
  async function(parentId) {

    const parent =
      parents.find(
        x => x.id === parentId
      );

    if (!parent) {
      return;
    }


    const parentLinks =
      links.filter(
        x =>
          x.parent_id ===
          parentId
      );


    const confirmed =
      confirm(
        `Delete parent "${parent.full_name}"?\n\n` +
        `Linked students: ${parentLinks.length}\n\n` +
        `This action cannot be undone.`
      );


    if (!confirmed) {
      return;
    }


    try {

      /*
       * Remove parent-student
       * relationships first.
       */

      if (parentLinks.length > 0) {

        const {
          error: linkError
        } =
          await supabaseClient
            .from("parent_students")
            .delete()
            .eq(
              "parent_id",
              parentId
            );

        if (linkError) {
          throw linkError;
        }

      }


      const {
        error
      } =
        await supabaseClient
          .from("parents")
          .delete()
          .eq(
            "id",
            parentId
          );


      if (error) {
        throw error;
      }


      await loadParents();
      await loadLinks();

      applyFilters();

      showNotice(
        "Parent deleted successfully.",
        "success"
      );


    } catch (error) {

      console.error(error);

      showNotice(
        error.message ||
        "Unable to delete parent.",
        "error"
      );

    }

  };


/* =========================
   MANAGE LINKS
========================= */

window.manageLinks =
  async function(parentId) {

    selectedParent =
      parents.find(
        x => x.id === parentId
      );


    if (!selectedParent) {
      return;
    }


    const institution =
      institutions.find(
        x =>
          x.id ===
          selectedParent.institution_id
      );


    document.getElementById(
      "linkParentInfo"
    ).innerHTML = `

      <div style="
        background:#F8FAFC;
        padding:12px;
        border-radius:9px;
        margin-bottom:15px;
      ">

        <strong style="color:#0B1E63;">
          ${escapeHtml(
            selectedParent.full_name
          )}
        </strong>

        <div class="sub">
          ${escapeHtml(
            institution?.name ||
            "Unknown Institution"
          )}
        </div>

      </div>

    `;


    await loadStudentOptions();

    renderLinkedStudents();


    document.getElementById(
      "linkModal"
    ).style.display =
      "block";

  };


/* =========================
   STUDENT OPTIONS
========================= */

async function loadStudentOptions() {

  const select =
    document.getElementById(
      "studentSelect"
    );


  select.innerHTML = `
    <option value="">
      Select student
    </option>
  `;


  if (!selectedParent) {
    return;
  }


  const linkedStudentIds =
    new Set(
      links
        .filter(
          x =>
            x.parent_id ===
            selectedParent.id
        )
        .map(
          x =>
            x.student_id
        )
    );


  students
    .filter(
      student =>
        student.institution_id ===
        selectedParent.institution_id
    )
    .forEach(
      student => {

        if (
          linkedStudentIds.has(
            student.id
          )
        ) {
          return;
        }


        const option =
          document.createElement(
            "option"
          );


        option.value =
          student.id;


        option.textContent =
          `${student.full_name} — ${student.student_id}`;


        select.appendChild(
          option
        );

      }
    );

}


/* =========================
   LINK STUDENT
========================= */

document.getElementById(
  "linkStudentBtn"
).addEventListener(
  "click",
  linkStudent
);


async function linkStudent() {

  if (!selectedParent) {
    return;
  }


  const studentId =
    document.getElementById(
      "studentSelect"
    ).value;


  const relationship =
    document.getElementById(
      "relationshipSelect"
    ).value;


  const isPrimary =
    document.getElementById(
      "primaryCheck"
    ).checked;


  if (!studentId) {

    showNotice(
      "Please select a student.",
      "error"
    );

    return;

  }


  try {

    /*
     * If primary is selected,
     * remove primary from other
     * parent links for this student.
     */

    if (isPrimary) {

      const {
        error: resetError
      } =
        await supabaseClient
          .from("parent_students")
          .update({
            is_primary:false
          })
          .eq(
            "student_id",
            studentId
          );

      if (resetError) {
        throw resetError;
      }

    }


    const {
      error
    } =
      await supabaseClient
        .from("parent_students")
        .insert({

          institution_id:
            selectedParent.institution_id,

          parent_id:
            selectedParent.id,

          student_id:
            studentId,

          relationship:
            relationship,

          is_primary:
            isPrimary

        });


    if (error) {
      throw error;
    }


    await loadLinks();

    await loadStudentOptions();

    renderLinkedStudents();

    applyFilters();


    document.getElementById(
      "studentSelect"
    ).value = "";


    document.getElementById(
      "primaryCheck"
    ).checked = false;


    showNotice(
      "Student linked successfully.",
      "success"
    );


  } catch (error) {

    console.error(error);

    showNotice(
      error.message ||
      "Unable to link student.",
      "error"
    );

  }

}


/* =========================
   RENDER LINKED STUDENTS
========================= */

function renderLinkedStudents() {

  const container =
    document.getElementById(
      "linkedStudents"
    );


  container.innerHTML = "";


  if (!selectedParent) {
    return;
  }


  const parentLinks =
    links.filter(
      x =>
        x.parent_id ===
        selectedParent.id
    );


  if (
    parentLinks.length === 0
  ) {

    container.innerHTML = `
      <div style="
        color:#6B7280;
        text-align:center;
        padding:20px;
      ">
        No students linked yet.
      </div>
    `;

    return;

  }


  parentLinks.forEach(
    link => {

      const student =
        students.find(
          x =>
            x.id ===
            link.student_id
        );


      const row =
        document.createElement(
          "div"
        );

      row.className =
        "student-row";


      row.innerHTML = `

        <div>

          <div class="student-name">
            ${escapeHtml(
              student?.full_name ||
              "Unknown Student"
            )}
          </div>

          <div class="sub">
            ${escapeHtml(
              student?.student_id ||
              ""
            )}
            ·
            ${escapeHtml(
              link.relationship ||
              "Other"
            )}

            ${
              link.is_primary
                ? " · Primary"
                : ""
            }
          </div>

        </div>

        <button
          class="btn btn-red"
          onclick="unlinkStudent('${link.id}')"
        >
          Unlink
        </button>

      `;


      container.appendChild(
        row
      );

    }
  );

}


/* =========================
   UNLINK STUDENT
========================= */

window.unlinkStudent =
  async function(linkId) {

    const confirmed =
      confirm(
        "Remove this parent–student relationship?"
      );


    if (!confirmed) {
      return;
    }


    try {

      const {
        error
      } =
        await supabaseClient
          .from("parent_students")
          .delete()
          .eq(
            "id",
            linkId
          );


      if (error) {
        throw error;
      }


      await loadLinks();

      await loadStudentOptions();

      renderLinkedStudents();

      applyFilters();


      showNotice(
        "Student unlinked successfully.",
        "success"
      );


    } catch (error) {

      console.error(error);

      showNotice(
        error.message ||
        "Unable to unlink student.",
        "error"
      );

    }

  };


/* =========================
   CLOSE MODALS
========================= */

document.getElementById(
  "closeParentModal"
).addEventListener(
  "click",
  closeParentModal
);


document.getElementById(
  "cancelParentBtn"
).addEventListener(
  "click",
  closeParentModal
);


document.getElementById(
  "closeLinkModal"
).addEventListener(
  "click",
  closeLinkModal
);


function closeParentModal() {

  document.getElementById(
    "parentModal"
  ).style.display =
    "none";

}


function closeLinkModal() {

  document.getElementById(
    "linkModal"
  ).style.display =
    "none";

  selectedParent =
    null;

}


/* =========================
   CLEAR FORM
========================= */

function clearParentForm() {

  document.getElementById(
    "parentInstitution"
  ).value = "";

  document.getElementById(
    "parentName"
  ).value = "";

  document.getElementById(
    "parentPhone"
  ).value = "";

  document.getElementById(
    "parentEmail"
  ).value = "";

  document.getElementById(
    "parentOccupation"
  ).value = "";

  document.getElementById(
    "parentAddress"
  ).value = "";

}


/* =========================
   FILTER EVENTS
========================= */

document.getElementById(
  "searchInput"
).addEventListener(
  "input",
  applyFilters
);


document.getElementById(
  "institutionFilter"
).addEventListener(
  "change",
  applyFilters
);


document.getElementById(
  "clearBtn"
).addEventListener(
  "click",
  () => {

    document.getElementById(
      "searchInput"
    ).value = "";

    document.getElementById(
      "institutionFilter"
    ).value = "";

    applyFilters();

  }
);


/* =========================
   PAGINATION
========================= */

document.getElementById(
  "prevBtn"
).addEventListener(
  "click",
  () => {

    if (currentPage > 1) {

      currentPage--;

      renderParents();

    }

  }
);


document.getElementById(
  "nextBtn"
).addEventListener(
  "click",
  () => {

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          filteredParents.length /
          pageSize
        )
      );


    if (
      currentPage <
      totalPages
    ) {

      currentPage++;

      renderParents();

    }

  }
);


function updatePagination() {

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredParents.length /
        pageSize
      )
    );


  document.getElementById(
    "pageInfo"
  ).textContent =
    `Page ${currentPage} of ${totalPages}`;


  document.getElementById(
    "prevBtn"
  ).disabled =
    currentPage <= 1;


  document.getElementById(
    "nextBtn"
  ).disabled =
    currentPage >= totalPages;

}


/* =========================
   HELPERS
========================= */

function setLoading(show) {

  document.getElementById(
    "loading"
  ).style.display =
    show
      ? "block"
      : "none";

}


function showNotice(
  message,
  type
) {

  const box =
    document.getElementById(
      "notice"
    );


  box.textContent =
    message;


  box.className =
    `notice ${type}`;


  box.style.display =
    "block";


  setTimeout(() => {

    box.style.display =
      "none";

  }, 3500);

}


function shortId(id) {

  if (!id) {
    return "";
  }

  if (id.length <= 15) {
    return id;
  }

  return (
    id.substring(0,8) +
    "..." +
    id.substring(id.length - 5)
  );

}


function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}
