/* =========================================================
   GAAWOW EMS
   TEACHER MANAGEMENT
   teacher.js V5

   Features:
   - Super Admin only
   - Teacher Auth creation
   - profiles.email
   - Institution
   - Active / Inactive
   - Search
   - View
   - Edit
   - Delete via Edge Function
   - Teacher photo upload
   - Supabase Storage
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


const CREATE_TEACHER_FUNCTION_URL =
  `${SUPABASE_URL}/functions/v1/create-teacher`;


const DELETE_TEACHER_FUNCTION_URL =
  `${SUPABASE_URL}/functions/v1/delete-teacher`;


const TEACHER_PHOTO_BUCKET =
  "teacher-photos";


const MAX_PHOTO_SIZE =
  2 * 1024 * 1024;


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   STATE
   ========================================================= */

let teachers = [];

let institutions = [];

let currentUser = null;

let currentProfile = null;


/* =========================================================
   DEFAULT AVATAR
   ========================================================= */

const DEFAULT_AVATAR =
  "https://via.placeholder.com/120?text=Teacher";


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    try {

      await checkAccess();


      const searchInput =
        document.getElementById(
          "searchInput"
        );


      const institutionFilter =
        document.getElementById(
          "institutionFilter"
        );


      const statusFilter =
        document.getElementById(
          "statusFilter"
        );


      const teacherForm =
        document.getElementById(
          "teacherForm"
        );


      const photoFile =
        document.getElementById(
          "photoFile"
        );


      if (searchInput) {

        searchInput.addEventListener(
          "input",
          renderTeachers
        );

      }


      if (institutionFilter) {

        institutionFilter.addEventListener(
          "change",
          renderTeachers
        );

      }


      if (statusFilter) {

        statusFilter.addEventListener(
          "change",
          renderTeachers
        );

      }


      if (teacherForm) {

        teacherForm.addEventListener(
          "submit",
          saveTeacher
        );

      }


      if (photoFile) {

        photoFile.addEventListener(
          "change",
          handlePhotoSelect
        );

      }

    } catch (error) {

      console.error(
        "Teacher page initialization error:",
        error
      );

    }

  }
);


/* =========================================================
   ACCESS
   ========================================================= */

async function checkAccess() {

  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();


  if (
    sessionError ||
    !sessionData ||
    !sessionData.session
  ) {

    alert(
      "Your login session has expired. Please login again."
    );

    location.href =
      "index.html";

    return;
  }


  currentUser =
    sessionData.session.user;


  const {
    data: profile,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone,
        avatar_url,
        role,
        institution_id,
        is_active
      `)
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();


  if (error) {

    console.error(
      "Profile error:",
      error
    );

    alert(
      "Unable to verify your profile.\n\n" +
      error.message
    );

    location.href =
      "dashboard.html";

    return;
  }


  if (!profile) {

    alert(
      "Profile not found."
    );

    location.href =
      "dashboard.html";

    return;
  }


  currentProfile =
    profile;


  if (
    profile.role !==
    "super_admin"
  ) {

    alert(
      "Access denied.\n\nSuper Admin only."
    );

    location.href =
      "dashboard.html";

    return;
  }


  if (
    profile.is_active === false
  ) {

    alert(
      "Your account is inactive."
    );

    await supabaseClient.auth.signOut();

    location.href =
      "index.html";

    return;
  }


  await loadInstitutions();

  await loadTeachers();
}


/* =========================================================
   INSTITUTIONS
   ========================================================= */

async function loadInstitutions() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("institutions")
      .select(
        "id,name"
      )
      .order(
        "name",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "Institutions error:",
      error
    );

    alert(
      "Failed to load institutions:\n\n" +
      error.message
    );

    return;
  }


  institutions =
    data || [];


  const filter =
    document.getElementById(
      "institutionFilter"
    );


  const select =
    document.getElementById(
      "institutionId"
    );


  if (filter) {

    filter.innerHTML =
      `<option value="">
        All Institutions
      </option>`;

  }


  if (select) {

    select.innerHTML =
      `<option value="">
        Select Institution
      </option>`;

  }


  institutions.forEach(
    institution => {

      const name =
        escapeHtml(
          institution.name
        );


      if (filter) {

        filter.innerHTML +=
          `<option value="${institution.id}">
             ${name}
           </option>`;

      }


      if (select) {

        select.innerHTML +=
          `<option value="${institution.id}">
             ${name}
           </option>`;

      }

    }
  );

}


/* =========================================================
   LOAD TEACHERS
   ========================================================= */

async function loadTeachers() {

  const tbody =
    document.getElementById(
      "teachersTableBody"
    );


  if (tbody) {

    tbody.innerHTML =
      `<tr>
        <td
          colspan="7"
          class="loading"
        >
          Loading teachers...
        </td>
      </tr>`;

  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone,
        avatar_url,
        role,
        institution_id,
        is_active
      `)
      .eq(
        "role",
        "teacher"
      )
      .order(
        "full_name",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "Teachers error:",
      error
    );


    if (tbody) {

      tbody.innerHTML =
        `<tr>
          <td
            colspan="7"
            class="empty"
          >
            Failed to load teachers.
            <br><br>
            ${escapeHtml(error.message)}
          </td>
        </tr>`;

    }

    return;
  }


  teachers =
    (data || []).map(
      teacher => {

        const institution =
          institutions.find(
            item =>
              item.id ===
              teacher.institution_id
          );


        return {
          ...teacher,

          institution_name:
            institution
              ? institution.name
              : "Unknown Institution"
        };

      }
    );


  renderTeachers();
}


/* =========================================================
   RENDER
   ========================================================= */

function renderTeachers() {

  const tbody =
    document.getElementById(
      "teachersTableBody"
    );


  if (!tbody) return;


  const search =
    (
      document.getElementById(
        "searchInput"
      )?.value ||
      ""
    )
      .toLowerCase()
      .trim();


  const institutionId =
    document.getElementById(
      "institutionFilter"
    )?.value ||
    "";


  const status =
    document.getElementById(
      "statusFilter"
    )?.value ||
    "";


  const filtered =
    teachers.filter(
      teacher => {

        const fullName =
          String(
            teacher.full_name || ""
          ).toLowerCase();


        const email =
          String(
            teacher.email || ""
          ).toLowerCase();


        const phone =
          String(
            teacher.phone || ""
          ).toLowerCase();


        const id =
          String(
            teacher.id || ""
          ).toLowerCase();


        const matchesSearch =
          !search ||
          fullName.includes(search) ||
          email.includes(search) ||
          phone.includes(search) ||
          id.includes(search);


        const matchesInstitution =
          !institutionId ||
          teacher.institution_id ===
            institutionId;


        const matchesStatus =
          !status ||
          (
            status === "active" &&
            teacher.is_active === true
          ) ||
          (
            status === "inactive" &&
            teacher.is_active === false
          );


        return (
          matchesSearch &&
          matchesInstitution &&
          matchesStatus
        );

      }
    );


  if (!filtered.length) {

    tbody.innerHTML =
      `<tr>
        <td
          colspan="7"
          class="empty"
        >
          No teachers found.
        </td>
      </tr>`;

    return;
  }


  tbody.innerHTML =
    filtered
      .map(
        (teacher, index) => {

          const avatar =
            teacher.avatar_url ||
            DEFAULT_AVATAR;


          const statusClass =
            teacher.is_active
              ? "active"
              : "inactive";


          const statusText =
            teacher.is_active
              ? "Active"
              : "Inactive";


          return `
            <tr>

              <td>
                ${index + 1}
              </td>

              <td>

                <div class="teacher-cell">

                  <img
                    class="teacher-photo"
                    src="${escapeHtml(avatar)}"
                    alt="Teacher"
                    onerror="this.src='${DEFAULT_AVATAR}'"
                  >

                  <div>

                    <div class="teacher-name">
                      ${escapeHtml(
                        teacher.full_name ||
                        "Unnamed Teacher"
                      )}
                    </div>

                    <div class="teacher-email">
                      ${escapeHtml(
                        teacher.email ||
                        "Email not set"
                      )}
                    </div>

                  </div>

                </div>

              </td>

              <td>
                ${escapeHtml(
                  teacher.phone ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  teacher.institution_name ||
                  "—"
                )}
              </td>

              <td>
                Teacher
              </td>

              <td>

                <span
                  class="status ${statusClass}"
                >
                  ${statusText}
                </span>

              </td>

              <td>

                <div class="actions">

                  <button
                    type="button"
                    class="action-btn view"
                    onclick="viewTeacher('${teacher.id}')"
                  >
                    View
                  </button>

                  <button
                    type="button"
                    class="action-btn edit"
                    onclick="editTeacher('${teacher.id}')"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="action-btn toggle"
                    onclick="toggleTeacher('${teacher.id}')"
                  >
                    ${
                      teacher.is_active
                        ? "Disable"
                        : "Activate"
                    }
                  </button>

                  <button
                    type="button"
                    class="action-btn delete"
                    onclick="deleteTeacher('${teacher.id}')"
                  >
                    Delete
                  </button>

                </div>

              </td>

            </tr>
          `;

        }
      )
      .join("");
}


/* =========================================================
   OPEN ADD TEACHER
   ========================================================= */

function openAddTeacher() {

  document
    .getElementById(
      "teacherForm"
    )
    ?.reset();


  document.getElementById(
    "editId"
  ).value =
    "";


  document.getElementById(
    "modalTitle"
  ).textContent =
    "Add Teacher";


  document.getElementById(
    "saveBtn"
  ).textContent =
    "Create Teacher";


  const email =
    document.getElementById(
      "email"
    );


  email.disabled =
    false;


  email.readOnly =
    false;


  email.required =
    true;


  const password =
    document.getElementById(
      "password"
    );


  password.value =
    "";


  password.required =
    true;


  document.getElementById(
    "isActive"
  ).value =
    "true";


  resetPhoto();


  document.getElementById(
    "teacherModal"
  ).classList.add(
    "show"
  );
}


/* =========================================================
   CLOSE
   ========================================================= */

function closeTeacherModal() {

  document.getElementById(
    "teacherModal"
  )?.classList.remove(
    "show"
  );

}


/* =========================================================
   PHOTO SELECT
   ========================================================= */

function handlePhotoSelect(event) {

  const file =
    event.target.files?.[0];


  if (!file) {
    return;
  }


  const status =
    document.getElementById(
      "uploadStatus"
    );


  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];


  if (
    !allowedTypes.includes(
      file.type
    )
  ) {

    alert(
      "Invalid image type.\n\n" +
      "Please choose JPG, PNG or WEBP."
    );


    event.target.value =
      "";


    return;
  }


  if (
    file.size >
    MAX_PHOTO_SIZE
  ) {

    alert(
      "Image is too large.\n\n" +
      "Maximum allowed size is 2 MB."
    );


    event.target.value =
      "";


    return;
  }


  const reader =
    new FileReader();


  reader.onload =
    function () {

      document.getElementById(
        "photoPreview"
      ).src =
        reader.result;

    };


  reader.readAsDataURL(
    file
  );


  if (status) {

    status.textContent =
      `Selected: ${file.name}`;

    status.style.color =
      "#0b4da2";

  }

}


/* =========================================================
   UPLOAD PHOTO
   ========================================================= */

async function uploadTeacherPhoto(
  file,
  teacherId
) {

  if (!file) {
    return null;
  }


  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];


  if (
    !allowedTypes.includes(
      file.type
    )
  ) {

    throw new Error(
      "Only JPG, PNG and WEBP images are allowed."
    );

  }


  if (
    file.size >
    MAX_PHOTO_SIZE
  ) {

    throw new Error(
      "Teacher photo must be 2 MB or smaller."
    );

  }


  const extension =
    getFileExtension(
      file.name,
      file.type
    );


  const safeTeacherId =
    String(
      teacherId
    ).replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    );


  const uniquePart =
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;


  const filePath =
    `${safeTeacherId}/${uniquePart}.${extension}`;


  const status =
    document.getElementById(
      "uploadStatus"
    );


  if (status) {

    status.textContent =
      "Uploading photo...";

    status.style.color =
      "#0b4da2";

  }


  const {
    error
  } =
    await supabaseClient
      .storage
      .from(
        TEACHER_PHOTO_BUCKET
      )
      .upload(
        filePath,
        file,
        {
          cacheControl:
            "3600",

          upsert:
            false,

          contentType:
            file.type
        }
      );


  if (error) {
    throw error;
  }


  const {
    data
  } =
    supabaseClient
      .storage
      .from(
        TEACHER_PHOTO_BUCKET
      )
      .getPublicUrl(
        filePath
      );


  const publicUrl =
    data?.publicUrl;


  if (!publicUrl) {

    throw new Error(
      "Photo uploaded, but public URL could not be generated."
    );

  }


  if (status) {

    status.textContent =
      "Photo uploaded successfully.";

    status.style.color =
      "#16834b";

  }


  return publicUrl;
}


/* =========================================================
   DELETE OLD PHOTO
   ========================================================= */

async function deleteOldTeacherPhoto(
  avatarUrl
) {

  if (!avatarUrl) {
    return;
  }


  try {

    const marker =
      `/storage/v1/object/public/${TEACHER_PHOTO_BUCKET}/`;


    const position =
      avatarUrl.indexOf(
        marker
      );


    if (
      position === -1
    ) {

      return;

    }


    const filePath =
      decodeURIComponent(
        avatarUrl.substring(
          position +
          marker.length
        )
      );


    if (!filePath) {
      return;
    }


    await supabaseClient
      .storage
      .from(
        TEACHER_PHOTO_BUCKET
      )
      .remove([
        filePath
      ]);

  } catch (error) {

    console.warn(
      "Old teacher photo cleanup failed:",
      error
    );

  }

}


/* =========================================================
   SAVE TEACHER
   ========================================================= */

async function saveTeacher(
  event
) {

  event.preventDefault();


  const saveBtn =
    document.getElementById(
      "saveBtn"
    );


  const editId =
    document.getElementById(
      "editId"
    ).value.trim();


  const fullName =
    document.getElementById(
      "fullName"
    ).value.trim();


  const email =
    document.getElementById(
      "email"
    ).value.trim()
      .toLowerCase();


  const password =
    document.getElementById(
      "password"
    ).value;


  const phone =
    document.getElementById(
      "phone"
    ).value.trim();


  const institutionId =
    document.getElementById(
      "institutionId"
    ).value;


  const isActive =
    document.getElementById(
      "isActive"
    ).value ===
    "true";


  const photoInput =
    document.getElementById(
      "photoFile"
    );


  const selectedPhoto =
    photoInput?.files?.[0] ||
    null;


  /* -----------------------------------------
     VALIDATION
     ----------------------------------------- */

  if (!fullName) {

    alert(
      "Please enter teacher full name."
    );

    return;
  }


  if (
    !editId &&
    !email
  ) {

    alert(
      "Please enter teacher email."
    );

    return;
  }


  if (
    !editId &&
    !isValidEmail(email)
  ) {

    alert(
      "Please enter a valid email address."
    );

    return;
  }


  if (
    !editId &&
    !password
  ) {

    alert(
      "Please enter teacher password."
    );

    return;
  }


  if (
    !editId &&
    password.length < 6
  ) {

    alert(
      "Password must contain at least 6 characters."
    );

    return;
  }


  if (!institutionId) {

    alert(
      "Please select an institution."
    );

    return;
  }


  saveBtn.disabled =
    true;


  saveBtn.textContent =
    editId
      ? "Updating..."
      : "Creating...";


  try {

    /* =====================================================
       CREATE
       ===================================================== */

    if (!editId) {

      const {
        data: sessionData,
        error: sessionError
      } =
        await supabaseClient
          .auth
          .getSession();


      if (
        sessionError ||
        !sessionData?.session
      ) {

        throw new Error(
          "Your Super Admin session has expired. Please login again."
        );

      }


      const accessToken =
        sessionData
          .session
          .access_token;


      /* -----------------------------------------
         CREATE AUTH + PROFILE
         ----------------------------------------- */

      const response =
        await fetch(
          CREATE_TEACHER_FUNCTION_URL,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              "Authorization":
                `Bearer ${accessToken}`,

              "apikey":
                SUPABASE_KEY

            },

            body:
              JSON.stringify({

                email:
                  email,

                password:
                  password,

                full_name:
                  fullName,

                phone:
                  phone ||
                  null,

                avatar_url:
                  null,

                institution_id:
                  institutionId,

                is_active:
                  isActive

              })

          }
        );


      let result =
        null;


      try {

        result =
          await response.json();

      } catch {

        result =
          null;

      }


      if (!response.ok) {

        throw new Error(
          result?.error ||
          result?.message ||
          `Create Teacher failed. HTTP ${response.status}`
        );

      }


      if (
        result?.success === false
      ) {

        throw new Error(
          result.error ||
          "Teacher creation failed."
        );

      }


      const newTeacherId =
        result?.teacher?.id;


      /*
       * IMPORTANT:
       * Upload photo AFTER Auth/Profile creation.
       * This gives us the teacher UUID for the
       * storage folder.
       */

      if (
        selectedPhoto &&
        newTeacherId
      ) {

        try {

          const photoUrl =
            await uploadTeacherPhoto(
              selectedPhoto,
              newTeacherId
            );


          const {
            error:
              photoDbError
          } =
            await supabaseClient
              .from(
                "profiles"
              )
              .update({
                avatar_url:
                  photoUrl,

                updated_at:
                  new Date()
                    .toISOString()
              })
              .eq(
                "id",
                newTeacherId
              );


          if (
            photoDbError
          ) {

            /*
             * Profile exists.
             * Photo uploaded.
             * URL failed to save.
             *
             * Do not delete the teacher.
             */

            console.error(
              "Saving avatar URL failed:",
              photoDbError
            );

            alert(
              "Teacher account was created, but the photo URL could not be saved.\n\n" +
              photoDbError.message
            );

          }

        } catch (
          photoError
        ) {

          console.error(
            "Teacher photo upload error:",
            photoError
          );


          alert(
            "Teacher account was created, but the photo upload failed.\n\n" +
            photoError.message
          );

        }

      }


      alert(
        "Teacher account created successfully!"
      );


      closeTeacherModal();


      await loadTeachers();


      return;
    }


    /* =====================================================
       UPDATE EXISTING TEACHER
       ===================================================== */

    const existingTeacher =
      teachers.find(
        item =>
          item.id ===
          editId
      );


    if (!existingTeacher) {

      throw new Error(
        "Existing teacher record could not be found."
      );

    }


    let newPhotoUrl =
      existingTeacher.avatar_url ||
      null;


    /* -----------------------------------------
       UPLOAD NEW PHOTO IF SELECTED
       ----------------------------------------- */

    if (selectedPhoto) {

      newPhotoUrl =
        await uploadTeacherPhoto(
          selectedPhoto,
          editId
        );

    }


    /* -----------------------------------------
       UPDATE PROFILE
       ----------------------------------------- */

    const {
      error:
        updateError
    } =
      await supabaseClient
        .from(
          "profiles"
        )
        .update({

          full_name:
            fullName,

          phone:
            phone ||
            null,

          avatar_url:
            newPhotoUrl,

          institution_id:
            institutionId,

          is_active:
            isActive,

          updated_at:
            new Date()
              .toISOString()

        })
        .eq(
          "id",
          editId
        )
        .eq(
          "role",
          "teacher"
        );


    if (updateError) {

      /*
       * If a new photo was uploaded but profile
       * update failed, we intentionally do not
       * delete the old photo automatically.
       */

      throw updateError;

    }


    /* -----------------------------------------
       DELETE OLD PHOTO
       AFTER DB UPDATE SUCCESS
       ----------------------------------------- */

    if (
      selectedPhoto &&
      existingTeacher.avatar_url &&
      newPhotoUrl !==
        existingTeacher.avatar_url
    ) {

      await deleteOldTeacherPhoto(
        existingTeacher.avatar_url
      );

    }


    alert(
      "Teacher profile updated successfully!"
    );


    closeTeacherModal();


    await loadTeachers();


  } catch (error) {

    console.error(
      "Teacher Save Error:",
      error
    );


    alert(
      "Failed to create/update teacher:\n\n" +
      (
        error?.message ||
        "Unknown error"
      )
    );

  } finally {

    saveBtn.disabled =
      false;


    saveBtn.textContent =
      editId
        ? "Update Teacher"
        : "Create Teacher";

  }

}


/* =========================================================
   EDIT TEACHER
   ========================================================= */

function editTeacher(
  id
) {

  const teacher =
    teachers.find(
      item =>
        item.id === id
    );


  if (!teacher) {

    alert(
      "Teacher not found."
    );

    return;
  }


  document.getElementById(
    "editId"
  ).value =
    teacher.id;


  document.getElementById(
    "fullName"
  ).value =
    teacher.full_name ||
    "";


  /* -----------------------------------------
     EMAIL
     ----------------------------------------- */

  const email =
    document.getElementById(
      "email"
    );


  email.value =
    teacher.email ||
    "";


  email.disabled =
    true;


  email.readOnly =
    true;


  email.required =
    false;


  /* -----------------------------------------
     PASSWORD
     ----------------------------------------- */

  const password =
    document.getElementById(
      "password"
    );


  password.value =
    "";


  password.required =
    false;


  password.placeholder =
    "Leave empty to keep current password";


  /* -----------------------------------------
     OTHER FIELDS
     ----------------------------------------- */

  document.getElementById(
    "phone"
  ).value =
    teacher.phone ||
    "";


  document.getElementById(
    "institutionId"
  ).value =
    teacher.institution_id ||
    "";


  document.getElementById(
    "isActive"
  ).value =
    teacher.is_active
      ? "true"
      : "false";


  /* -----------------------------------------
     PHOTO
     ----------------------------------------- */

  document.getElementById(
    "photoPreview"
  ).src =
    teacher.avatar_url ||
    DEFAULT_AVATAR;


  document.getElementById(
    "photoFile"
  ).value =
    "";


  document.getElementById(
    "uploadStatus"
  ).textContent =
    teacher.avatar_url
      ? "Current photo"
      : "No photo uploaded";


  document.getElementById(
    "uploadStatus"
  ).style.color =
    "#777";


  /* -----------------------------------------
     MODAL
     ----------------------------------------- */

  document.getElementById(
    "modalTitle"
  ).textContent =
    "Edit Teacher";


  document.getElementById(
    "saveBtn"
  ).textContent =
    "Update Teacher";


  document.getElementById(
    "teacherModal"
  ).classList.add(
    "show"
  );

}


/* =========================================================
   VIEW TEACHER
   ========================================================= */

function viewTeacher(
  id
) {

  const teacher =
    teachers.find(
      item =>
        item.id === id
    );


  if (!teacher) {

    alert(
      "Teacher not found."
    );

    return;
  }


  const avatar =
    teacher.avatar_url ||
    DEFAULT_AVATAR;


  const content =
    document.getElementById(
      "viewContent"
    );


  content.innerHTML = `

    <div class="profile-box">

      <img
        class="avatar"
        src="${escapeHtml(avatar)}"
        alt="Teacher"
        onerror="this.src='${DEFAULT_AVATAR}'"
      >

      <div>

        <div class="profile-name">
          ${escapeHtml(
            teacher.full_name ||
            "Unnamed Teacher"
          )}
        </div>

        <div class="detail">
          <strong>Email:</strong>
          ${escapeHtml(
            teacher.email ||
            "Not provided"
          )}
        </div>

        <div class="detail">
          <strong>Role:</strong>
          Teacher
        </div>

        <div class="detail">
          <strong>Phone:</strong>
          ${escapeHtml(
            teacher.phone ||
            "Not provided"
          )}
        </div>

        <div class="detail">
          <strong>Institution:</strong>
          ${escapeHtml(
            teacher.institution_name ||
            "Unknown"
          )}
        </div>

        <div class="detail">
          <strong>User ID:</strong>
          ${escapeHtml(
            teacher.id
          )}
        </div>

        <div class="detail">
          <strong>Status:</strong>
          ${
            teacher.is_active
              ? "Active"
              : "Inactive"
          }
        </div>

      </div>

    </div>

  `;


  document.getElementById(
    "viewModal"
  ).classList.add(
    "show"
  );

}


/* =========================================================
   CLOSE VIEW
   ========================================================= */

function closeViewModal() {

  document.getElementById(
    "viewModal"
  )?.classList.remove(
    "show"
  );

}


/* =========================================================
   TOGGLE STATUS
   ========================================================= */

async function toggleTeacher(
  id
) {

  const teacher =
    teachers.find(
      item =>
        item.id === id
    );


  if (!teacher) {

    alert(
      "Teacher not found."
    );

    return;
  }


  const newStatus =
    !teacher.is_active;


  const action =
    newStatus
      ? "activate"
      : "disable";


  const confirmed =
    confirm(
      `Are you sure you want to ${action} this teacher?\n\n` +
      `${teacher.full_name || ""}`
    );


  if (!confirmed) {
    return;
  }


  try {

    const {
      error
    } =
      await supabaseClient
        .from(
          "profiles"
        )
        .update({

          is_active:
            newStatus,

          updated_at:
            new Date()
              .toISOString()

        })
        .eq(
          "id",
          id
        )
        .eq(
          "role",
          "teacher"
        );


    if (error) {
      throw error;
    }


    alert(
      newStatus
        ? "Teacher activated successfully."
        : "Teacher disabled successfully."
    );


    await loadTeachers();


  } catch (error) {

    console.error(
      "Toggle teacher error:",
      error
    );


    alert(
      "Failed to change teacher status:\n\n" +
      error.message
    );

  }

}


/* =========================================================
   DELETE TEACHER
   Uses delete-teacher Edge Function
   ========================================================= */

async function deleteTeacher(
  id
) {

  const teacher =
    teachers.find(
      item =>
        item.id === id
    );


  if (!teacher) {

    alert(
      "Teacher not found."
    );

    return;
  }


  const confirmed =
    confirm(

      "⚠️ DELETE TEACHER\n\n" +

      "Teacher: " +
      (
        teacher.full_name ||
        "Unnamed Teacher"
      ) +

      "\nEmail: " +
      (
        teacher.email ||
        "No email"
      ) +

      "\n\nThis will permanently delete:\n" +

      "• Teacher Profile\n" +

      "• Supabase Auth Account\n\n" +

      "This action cannot be undone.\n\n" +

      "Continue?"

    );


  if (!confirmed) {
    return;
  }


  try {

    const {
      data: sessionData,
      error: sessionError
    } =
      await supabaseClient
        .auth
        .getSession();


    if (
      sessionError ||
      !sessionData?.session
    ) {

      throw new Error(
        "Your Super Admin session has expired. Please login again."
      );

    }


    const accessToken =
      sessionData
        .session
        .access_token;


    const response =
      await fetch(
        DELETE_TEACHER_FUNCTION_URL,
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${accessToken}`,

            "apikey":
              SUPABASE_KEY

          },

          body:
            JSON.stringify({

              teacher_id:
                id

            })

        }
      );


    let result =
      null;


    try {

      result =
        await response.json();

    } catch {

      result =
        null;

    }


    if (!response.ok) {

      throw new Error(
        result?.error ||
        result?.message ||
        `Delete Teacher failed. HTTP ${response.status}`
      );

    }


    if (
      result?.success !== true
    ) {

      throw new Error(
        result?.error ||
        "Teacher deletion failed."
      );

    }


    alert(
      "Teacher profile and Auth account deleted successfully."
    );


    await loadTeachers();


  } catch (error) {

    console.error(
      "Delete Teacher Error:",
      error
    );


    alert(
      "Failed to delete teacher:\n\n" +
      (
        error?.message ||
        "Unknown error"
      )
    );

  }

}


/* =========================================================
   RESET PHOTO
   ========================================================= */

function resetPhoto() {

  const preview =
    document.getElementById(
      "photoPreview"
    );


  const input =
    document.getElementById(
      "photoFile"
    );


  const status =
    document.getElementById(
      "uploadStatus"
    );


  if (preview) {

    preview.src =
      DEFAULT_AVATAR;

  }


  if (input) {

    input.value =
      "";

  }


  if (status) {

    status.textContent =
      "No photo selected.";

    status.style.color =
      "#777";

  }

}


/* =========================================================
   FILE EXTENSION
   ========================================================= */

function getFileExtension(
  filename,
  mimeType
) {

  const name =
    String(
      filename || ""
    );


  const dot =
    name.lastIndexOf(
      "."
    );


  if (
    dot !== -1 &&
    dot <
      name.length - 1
  ) {

    const ext =
      name
        .substring(dot + 1)
        .toLowerCase();


    if (
      ["jpg", "jpeg", "png", "webp"]
        .includes(ext)
    ) {

      return ext ===
        "jpeg"
        ? "jpg"
        : ext;

    }

  }


  if (
    mimeType ===
    "image/png"
  ) {

    return "png";

  }


  if (
    mimeType ===
    "image/webp"
  ) {

    return "webp";

  }


  return "jpg";
}


/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function isValidEmail(
  email
) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(
  value
) {

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


/* =========================================================
   OUTSIDE MODAL CLICK
   ========================================================= */

document.addEventListener(
  "click",
  event => {

    if (
      event.target.id ===
      "teacherModal"
    ) {

      closeTeacherModal();

    }


    if (
      event.target.id ===
      "viewModal"
    ) {

      closeViewModal();

    }

  }
);


/* =========================================================
   ESC KEY
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      closeTeacherModal();

      closeViewModal();

    }

  }
);
