/* ============================================================
   GAAWOW EMS
   STUDENTS MODULE V6.0
   ------------------------------------------------------------
   SUPER ADMIN ONLY
   ------------------------------------------------------------
   - Supabase generated immutable student_id
   - student_id NEVER inserted from JS
   - student_id NEVER updated from JS
   - Super Admin only
   - Student account creation
   - Student password reset
   - auth_user_id linking
   - account_enabled
   - Student photo upload
   - Search / filter
   - View / Edit / Delete
   - Safe admission date
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     CONFIG
     ============================================================ */

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const PHOTO_BUCKET =
    "student-photos";

  const LOAD_TIMEOUT =
    15000;

  const PHOTO_RAW_MAX =
    10 * 1024 * 1024;

  const PHOTO_OUTPUT =
    800;

  const PHOTO_QUALITY =
    0.9;

  const PHOTO_FACE_BIAS =
    0.15;

  const SIGNED_URL_SECONDS =
    60 * 60 * 24 * 365;

  /* ============================================================
     SUPABASE
     ============================================================ */

  if (!window.supabase) {
    document.addEventListener("DOMContentLoaded", () => {
      const box = document.getElementById("message");

      if (box) {
        box.className = "message error";
        box.textContent =
          "Supabase library failed to load.";
        box.style.display = "block";
      }
    });

    return;
  }

  const supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

  /* ============================================================
     STATE
     ============================================================ */

  let currentUser = null;
  let currentProfile = null;
  let students = [];
  let editingStudent = null;
  let isSaving = false;
  let initialized = false;

  let photoTask = null;
  let pendingPhoto = null;

  /* ============================================================
     HELPERS
     ============================================================ */

  const $ = id =>
    document.getElementById(id);

  function showMessage(message, type = "success") {
    const box = $("message");

    if (!box) return;

    box.className =
      `message ${type}`;

    box.textContent =
      message;

    box.style.display =
      "block";

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function clearMessage() {
    const box = $("message");

    if (!box) return;

    box.className = "message";
    box.textContent = "";
    box.style.display = "none";
  }

  function errorMessage(error) {
    if (!error) {
      return "Unknown error";
    }

    return (
      error.message ||
      error.error_description ||
      error.details ||
      error.hint ||
      String(error)
    );
  }

  function withTimeout(
    promise,
    ms = LOAD_TIMEOUT
  ) {
    return Promise.race([
      promise,

      new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              "Request timed out. Please check Supabase connection and RLS."
            )
          );
        }, ms);
      })
    ]);
  }

  function createUUID() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID ===
        "function"
    ) {
      return window.crypto.randomUUID();
    }

    return (
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
    ).replace(
      /[xy]/g,
      c => {
        const r =
          (Math.random() * 16) | 0;

        const v =
          c === "x"
            ? r
            : (r & 0x3) | 0x8;

        return v.toString(16);
      }
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
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function initials(name) {
    const value =
      String(name || "").trim();

    if (!value) return "?";

    return value
      .split(/\s+/)
      .slice(0, 2)
      .map(
        x =>
          x.charAt(0).toUpperCase()
      )
      .join("");
  }

  function today() {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }

  function formatDate(date) {
    if (!date) return "—";

    const d =
      new Date(`${date}T00:00:00`);

    if (Number.isNaN(d.getTime())) {
      return escapeHtml(date);
    }

    return d.toLocaleDateString();
  }

  function statusHtml(status) {
    const value =
      status || "active";

    return `
      <span class="status status-${escapeHtml(
        String(value).toLowerCase()
      )}">
        ${escapeHtml(value)}
      </span>
    `;
  }

  /* ============================================================
     AUTHENTICATION
     ============================================================ */

  async function loadCurrentUser() {
    const {
      data,
      error
    } = await withTimeout(
      supabaseClient.auth.getUser()
    );

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error(
        "No authenticated user found. Please login again."
      );
    }

    currentUser =
      data.user;

    return currentUser;
  }

  /* ============================================================
     SUPER ADMIN PROFILE
     ============================================================ */

  async function loadCurrentProfile() {
    const {
      data,
      error
    } = await withTimeout(
      supabaseClient
        .from("profiles")
        .select(
          "id,full_name,role,is_active"
        )
        .eq(
          "id",
          currentUser.id
        )
        .maybeSingle()
    );

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "Your profile was not found."
      );
    }

    if (data.is_active === false) {
      throw new Error(
        "Your profile is inactive."
      );
    }

    currentProfile =
      data;

    return data;
  }

  function isSuperAdmin() {
    return (
      currentProfile &&
      currentProfile.role ===
        "super_admin"
    );
  }

  function requireSuperAdmin() {
    if (!isSuperAdmin()) {
      throw new Error(
        "Super Admin permission required."
      );
    }
  }

  /* ============================================================
     LOAD STUDENTS
     ============================================================ */

  async function loadStudents() {
    requireSuperAdmin();

    const tbody =
      $("studentsTableBody");

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="empty">
            Loading students...
          </td>
        </tr>
      `;
    }

    const {
      data,
      error
    } = await withTimeout(
      supabaseClient
        .from("students")
        .select(`
          id,
          institution_id,
          profile_id,
          student_id,
          full_name,
          gender,
          date_of_birth,
          phone,
          email,
          address,
          photo_url,
          admission_date,
          status,
          emergency_contact_name,
          emergency_contact_phone,
          account_enabled,
          auth_user_id,
          created_at,
          updated_at
        `)
        .order(
          "created_at",
          {
            ascending: false
          }
        )
    );

    if (error) {
      throw error;
    }

    students =
      data || [];

    updateStats();
    renderStudents();
  }

  /* ============================================================
     STATS
     ============================================================ */

  function updateStats() {
    const total =
      students.length;

    const active =
      students.filter(
        s => s.status === "active"
      ).length;

    const graduated =
      students.filter(
        s => s.status === "graduated"
      ).length;

    const other =
      total -
      active -
      graduated;

    if ($("totalStudents"))
      $("totalStudents").textContent =
        total;

    if ($("activeStudents"))
      $("activeStudents").textContent =
        active;

    if ($("graduatedStudents"))
      $("graduatedStudents").textContent =
        graduated;

    if ($("otherStudents"))
      $("otherStudents").textContent =
        other;
  }

  /* ============================================================
     FILTER
     ============================================================ */

  function filteredStudents() {
    const search =
      (
        $("searchInput")?.value ||
        ""
      )
        .trim()
        .toLowerCase();

    const status =
      $("statusFilter")?.value ||
      "";

    return students.filter(student => {
      const text = [
        student.student_id,
        student.full_name,
        student.gender,
        student.phone,
        student.email,
        student.address,
        student.status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!search ||
          text.includes(search)) &&
        (!status ||
          student.status === status)
      );
    });
  }

  /* ============================================================
     ACCOUNT STATUS
     ============================================================ */

  function accountStatusHtml(student) {
    if (
      student.account_enabled === true &&
      student.auth_user_id
    ) {
      return `
        <span class="status status-active">
          Account Active
        </span>
      `;
    }

    return `
      <span class="status status-inactive">
        No Account
      </span>
    `;
  }

  /* ============================================================
     RENDER
     ============================================================ */

  function renderStudents() {
    const tbody =
      $("studentsTableBody");

    if (!tbody) return;

    const list =
      filteredStudents();

    if (!list.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="empty">
            No students found.
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML =
      list.map(student => {
        const photo =
          student.photo_url
            ? `
              <img
                class="student-photo"
                src="${escapeHtml(
                  student.photo_url
                )}"
                alt="${escapeHtml(
                  student.full_name
                )}"
                loading="lazy"
              >
            `
            : `
              <div class="initials">
                ${escapeHtml(
                  initials(
                    student.full_name
                  )
                )}
              </div>
            `;

        const accountButton =
          student.account_enabled &&
          student.auth_user_id
            ? `
              <button
                type="button"
                class="btn-small action-reset-password"
                data-action="reset-password"
                data-id="${escapeHtml(
                  student.id
                )}"
              >
                Reset Password
              </button>
            `
            : `
              <button
                type="button"
                class="btn-small action-create-account"
                data-action="create-account"
                data-id="${escapeHtml(
                  student.id
                )}"
              >
                Create Account
              </button>
            `;

        return `
          <tr>

            <td>
              ${photo}
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  student.student_id || "—"
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                student.full_name || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                student.gender || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                student.phone || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                student.email || "—"
              )}
            </td>

            <td>
              ${statusHtml(
                student.status
              )}
            </td>

            <td>
              ${formatDate(
                student.admission_date
              )}
            </td>

            <td>
              ${accountStatusHtml(
                student
              )}
            </td>

            <td>
              <div class="actions">

                <button
                  type="button"
                  class="btn-small action-view"
                  data-action="view"
                  data-id="${escapeHtml(
                    student.id
                  )}"
                >
                  View
                </button>

                <button
                  type="button"
                  class="btn-small action-edit"
                  data-action="edit"
                  data-id="${escapeHtml(
                    student.id
                  )}"
                >
                  Edit
                </button>

                ${accountButton}

                <button
                  type="button"
                  class="btn-small action-delete"
                  data-action="delete"
                  data-id="${escapeHtml(
                    student.id
                  )}"
                >
                  Delete
                </button>

              </div>
            </td>

          </tr>
        `;
      }).join("");
  }

  /* ============================================================
     FORM
     ============================================================ */

  function getFormData() {
    return {
      institution_id:
        $("institutionSelect")?.value ||
        null,

      full_name:
        $("fullName")?.value.trim() ||
        null,

      gender:
        $("gender")?.value ||
        null,

      date_of_birth:
        $("dateOfBirth")?.value ||
        null,

      phone:
        $("phone")?.value.trim() ||
        null,

      email:
        $("email")?.value.trim() ||
        null,

      address:
        $("address")?.value.trim() ||
        null,

      admission_date:
        $("admissionDate")?.value ||
        today(),

      status:
        $("status")?.value ||
        "active"
    };
  }

  function validateForm(data) {
    requireSuperAdmin();

    if (!data.institution_id) {
      throw new Error(
        "Please select an institution."
      );
    }

    if (!data.full_name) {
      throw new Error(
        "Student full name is required."
      );
    }

    if (!data.admission_date) {
      throw new Error(
        "Admission date is required."
      );
    }
  }

  /* ============================================================
     PHOTO
     ============================================================ */

  function validatePhoto(file) {
    if (!file) return;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowed.includes(file.type)) {
      throw new Error(
        "Photo must be JPG, PNG, or WEBP."
      );
    }

    if (file.size > PHOTO_RAW_MAX) {
      throw new Error(
        "Photo size must not exceed 10MB."
      );
    }
  }

  function readImage(file) {
    return new Promise(
      (resolve, reject) => {
        const url =
          URL.createObjectURL(file);

        const img =
          new Image();

        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(
            new Error(
              "Photo could not be read."
            )
          );
        };

        img.src = url;
      }
    );
  }

  async function normalizePhoto(file) {
    const img =
      await readImage(file);

    const w =
      img.naturalWidth;

    const h =
      img.naturalHeight;

    const side =
      Math.min(w, h);

    const sx =
      w > h
        ? (w - side) / 2
        : 0;

    const sy =
      h > w
        ? (h - side) * PHOTO_FACE_BIAS
        : 0;

    const out =
      Math.min(
        PHOTO_OUTPUT,
        side
      );

    const canvas =
      document.createElement("canvas");

    canvas.width = out;
    canvas.height = out;

    const ctx =
      canvas.getContext("2d");

    ctx.imageSmoothingQuality =
      "high";

    ctx.fillStyle =
      "#ffffff";

    ctx.fillRect(
      0,
      0,
      out,
      out
    );

    ctx.drawImage(
      img,
      sx,
      sy,
      side,
      side,
      0,
      0,
      out,
      out
    );

    return new Promise(
      (resolve, reject) => {
        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(
                new Error(
                  "Photo processing failed."
                )
              );
              return;
            }

            resolve(blob);
          },
          "image/jpeg",
          PHOTO_QUALITY
        );
      }
    );
  }

  function showPhotoPreview(src) {
    const preview =
      $("photoPreview");

    const placeholder =
      $("photoPlaceholder");

    if (
      !preview ||
      !placeholder
    ) {
      return;
    }

    if (src) {
      preview.src = src;
      preview.style.display =
        "block";

      placeholder.style.display =
        "none";
    } else {
      preview.style.display =
        "none";

      preview.removeAttribute("src");

      placeholder.style.display =
        "block";
    }
  }

  function clearPendingPhoto() {
    if (
      pendingPhoto?.previewUrl
    ) {
      URL.revokeObjectURL(
        pendingPhoto.previewUrl
      );
    }

    pendingPhoto = null;
    photoTask = null;
  }

  async function handlePhotoPreview() {
    const input =
      $("photoInput");

    if (!input) return;

    clearPendingPhoto();

    const file =
      input.files?.[0];

    if (!file) {
      showPhotoPreview(
        editingStudent?.photo_url ||
        null
      );

      return;
    }

    photoTask =
      (async () => {
        try {
          validatePhoto(file);

          const blob =
            await normalizePhoto(file);

          const previewUrl =
            URL.createObjectURL(
              blob
            );

          pendingPhoto = {
            blob,
            previewUrl
          };

          showPhotoPreview(
            previewUrl
          );

        } catch (error) {
          input.value = "";

          showPhotoPreview(
            editingStudent?.photo_url ||
            null
          );

          showMessage(
            errorMessage(error),
            "error"
          );
        }
      })();

    await photoTask;
  }

  /* ============================================================
     PHOTO UPLOAD
     ============================================================ */

  async function uploadStudentPhoto(
    studentId,
    blob
  ) {
    if (!blob) return null;

    const path =
      `students/${studentId}/${Date.now()}-${createUUID()}.jpg`;

    const {
      error
    } =
      await supabaseClient.storage
        .from(PHOTO_BUCKET)
        .upload(
          path,
          blob,
          {
            cacheControl: "3600",
            upsert: false,
            contentType:
              "image/jpeg"
          }
        );

    if (error) {
      throw error;
    }

    const {
      data
    } =
      supabaseClient.storage
        .from(PHOTO_BUCKET)
        .getPublicUrl(path);

    if (!data?.publicUrl) {
      throw new Error(
        "Photo uploaded but URL was not generated."
      );
    }

    return data.publicUrl;
  }

  /* ============================================================
     CREATE STUDENT
     ============================================================ */

  async function createStudent(
    data,
    photoBlob
  ) {
    requireSuperAdmin();

    const {
      data: created,
      error
    } =
      await withTimeout(
        supabaseClient
          .from("students")
          .insert({
            id: createUUID(),
            institution_id:
              data.institution_id,
            full_name:
              data.full_name,
            gender:
              data.gender,
            date_of_birth:
              data.date_of_birth,
            phone:
              data.phone,
            email:
              data.email,
            address:
              data.address,
            admission_date:
              data.admission_date ||
              today(),
            status:
              data.status
          })
          .select(
            "id,student_id"
          )
          .single()
      );

    if (error) {
      throw error;
    }

    if (!created?.student_id) {
      throw new Error(
        "Supabase did not generate Student ID. Check the database trigger."
      );
    }

    if (photoBlob) {
      try {
        const photoUrl =
          await uploadStudentPhoto(
            created.id,
            photoBlob
          );

        const {
          error: photoError
        } =
          await supabaseClient
            .from("students")
            .update({
              photo_url:
                photoUrl
            })
            .eq(
              "id",
              created.id
            );

        if (photoError) {
          throw photoError;
        }

      } catch (error) {
        console.error(
          "Photo error:",
          error
        );

        showMessage(
          `Student saved. Photo failed: ${errorMessage(error)}`,
          "warning"
        );
      }
    }

    return created;
  }

  /* ============================================================
     UPDATE STUDENT
     ============================================================ */

  async function updateStudent(
    id,
    data,
    photoBlob
  ) {
    requireSuperAdmin();

    const {
      error
    } =
      await withTimeout(
        supabaseClient
          .from("students")
          .update({
            institution_id:
              data.institution_id,
            full_name:
              data.full_name,
            gender:
              data.gender,
            date_of_birth:
              data.date_of_birth,
            phone:
              data.phone,
            email:
              data.email,
            address:
              data.address,
            admission_date:
              data.admission_date ||
              today(),
            status:
              data.status,
            updated_at:
              new Date().toISOString()
          })
          .eq(
            "id",
            id
          )
      );

    if (error) {
      throw error;
    }

    if (photoBlob) {
      const photoUrl =
        await uploadStudentPhoto(
          id,
          photoBlob
        );

      const {
        error: photoError
      } =
        await supabaseClient
          .from("students")
          .update({
            photo_url:
              photoUrl
          })
          .eq(
            "id",
            id
          );

      if (photoError) {
        throw photoError;
      }
    }
  }

  /* ============================================================
     SUBMIT
     ============================================================ */

  async function handleStudentSubmit(event) {
    event.preventDefault();

    if (isSaving) return;

    try {
      requireSuperAdmin();

      clearMessage();

      const data =
        getFormData();

      validateForm(data);

      if (photoTask) {
        await photoTask;
      }

      const photoBlob =
        pendingPhoto?.blob ||
        null;

      isSaving = true;

      const button =
        $("saveButton");

      if (button) {
        button.disabled = true;
        button.textContent =
          editingStudent
            ? "Updating..."
            : "Saving...";
      }

      if (editingStudent) {
        await updateStudent(
          editingStudent.id,
          data,
          photoBlob
        );

        showMessage(
          `STUDENT UPDATED SUCCESSFULLY. Student ID: ${editingStudent.student_id}`,
          "success"
        );

      } else {
        const created =
          await createStudent(
            data,
            photoBlob
          );

        showMessage(
          `STUDENT SAVED SUCCESSFULLY. Generated Student ID: ${created.student_id}`,
          "success"
        );
      }

      await loadStudents();

      resetStudentForm();

    } catch (error) {
      console.error(error);

      showMessage(
        `Student save failed: ${errorMessage(error)}`,
        "error"
      );

    } finally {
      isSaving = false;

      const button =
        $("saveButton");

      if (button) {
        button.disabled = false;

        button.textContent =
          editingStudent
            ? "Update Student"
            : "Save Student";
      }
    }
  }

  /* ============================================================
     RESET FORM
     ============================================================ */

  function resetStudentForm() {
    const form =
      $("studentForm");

    if (form) {
      form.reset();
    }

    clearPendingPhoto();

    editingStudent = null;

    if ($("formTitle"))
      $("formTitle").textContent =
        "Add Student";

    if ($("saveButton"))
      $("saveButton").textContent =
        "Save Student";

    if ($("studentId")) {
      $("studentId").value = "";
      $("studentId").readOnly = true;
    }

    if ($("status"))
      $("status").value =
        "active";

    if ($("admissionDate"))
      $("admissionDate").value =
        today();

    if ($("accountStatus")) {
      $("accountStatus").textContent =
        "No Account";
    }

    if ($("createAccountButton"))
      $("createAccountButton").style.display =
        "none";

    if ($("resetPasswordButton"))
      $("resetPasswordButton").style.display =
        "none";

    showPhotoPreview(null);
  }

  /* ============================================================
     EDIT
     ============================================================ */

  function editStudent(id) {
    requireSuperAdmin();

    const student =
      students.find(
        s =>
          String(s.id) ===
          String(id)
      );

    if (!student) {
      showMessage(
        "Student not found.",
        "error"
      );
      return;
    }

    editingStudent =
      student;

    if ($("formTitle"))
      $("formTitle").textContent =
        "Edit Student";

    if ($("saveButton"))
      $("saveButton").textContent =
        "Update Student";

    if ($("studentId")) {
      $("studentId").value =
        student.student_id || "";

      $("studentId").readOnly =
        true;
    }

    if ($("institutionSelect"))
      $("institutionSelect").value =
        student.institution_id || "";

    if ($("fullName"))
      $("fullName").value =
        student.full_name || "";

    if ($("gender"))
      $("gender").value =
        student.gender || "";

    if ($("dateOfBirth"))
      $("dateOfBirth").value =
        student.date_of_birth || "";

    if ($("phone"))
      $("phone").value =
        student.phone || "";

    if ($("email"))
      $("email").value =
        student.email || "";

    if ($("address"))
      $("address").value =
        student.address || "";

    if ($("admissionDate"))
      $("admissionDate").value =
        student.admission_date ||
        today();

    if ($("status"))
      $("status").value =
        student.status || "active";

    if ($("accountStatus")) {
      $("accountStatus").textContent =
        student.account_enabled &&
        student.auth_user_id
          ? "Account Active"
          : "No Account";
    }

    if ($("createAccountButton")) {
      $("createAccountButton")
        .style.display =
          student.account_enabled &&
          student.auth_user_id
            ? "none"
            : "inline-flex";
    }

    if ($("resetPasswordButton")) {
      $("resetPasswordButton")
        .style.display =
          student.account_enabled &&
          student.auth_user_id
            ? "inline-flex"
            : "none";
    }

    showPhotoPreview(
      student.photo_url ||
      null
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /* ============================================================
     PASSWORD
     ============================================================ */

  function askPassword(title) {
    const value =
      window.prompt(
        `${title}\n\nEnter temporary password (minimum 8 characters):`
      );

    if (value === null) {
      return null;
    }

    const password =
      value.trim();

    if (password.length < 8) {
      showMessage(
        "Password must contain at least 8 characters.",
        "error"
      );

      return null;
    }

    return password;
  }

  /* ============================================================
     ACCOUNT
     ============================================================ */

  async function studentAccount(
    id,
    reset = false
  ) {
    try {
      requireSuperAdmin();

      const student =
        students.find(
          s =>
            String(s.id) ===
            String(id)
        );

      if (!student) {
        throw new Error(
          "Student not found."
        );
      }

      if (
        student.status !==
        "active"
      ) {
        throw new Error(
          "Only active students can have an active account."
        );
      }

      const password =
        askPassword(
          reset
            ? "Reset Student Password"
            : "Create Student Account"
        );

      if (!password) return;

      const confirmed =
        window.confirm(
          reset
            ? `Reset password for ${student.full_name} (${student.student_id})?`
            : `Create account for ${student.full_name} (${student.student_id})?`
        );

      if (!confirmed) return;

      showMessage(
        reset
          ? "Resetting password..."
          : "Creating student account...",
        "warning"
      );

      const {
        data,
        error
      } =
        await withTimeout(
          supabaseClient.functions.invoke(
            "create-student-account",
            {
              body: {
                student_id:
                  student.student_id,

                password:
                  password,

                action:
                  reset
                    ? "reset"
                    : "create"
              }
            }
          )
        );

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
          "Student account operation failed."
        );
      }

      showMessage(
        reset
          ? `PASSWORD RESET SUCCESSFULLY: ${student.student_id}`
          : `STUDENT ACCOUNT CREATED SUCCESSFULLY: ${student.student_id}`,
        "success"
      );

      await loadStudents();

      if (editingStudent) {
        editingStudent =
          students.find(
            s =>
              String(s.id) ===
              String(student.id)
          ) ||
          null;
      }

    } catch (error) {
      console.error(
        "Student account error:",
        error
      );

      showMessage(
        `Account operation failed: ${errorMessage(error)}`,
        "error"
      );
    }
  }

  /* ============================================================
     VIEW
     ============================================================ */

  function viewStudent(id) {
    requireSuperAdmin();

    const student =
      students.find(
        s =>
          String(s.id) ===
          String(id)
      );

    if (!student) {
      showMessage(
        "Student not found.",
        "error"
      );
      return;
    }

    const modal =
      $("profileModal");

    const content =
      $("profileContent");

    if (!modal || !content) return;

    const photo =
      student.photo_url
        ? `
          <img
            class="profile-photo"
            src="${escapeHtml(
              student.photo_url
            )}"
            alt="${escapeHtml(
              student.full_name
            )}"
          >
        `
        : `
          <div class="profile-photo initials">
            ${escapeHtml(
              initials(
                student.full_name
              )
            )}
          </div>
        `;

    content.innerHTML = `
      <div class="profile-top">

        ${photo}

        <div>

          <div class="profile-name">
            ${escapeHtml(
              student.full_name
            )}
          </div>

          <div class="profile-id">
            ${escapeHtml(
              student.student_id
            )}
          </div>

          <div style="margin-top:8px;">
            ${statusHtml(
              student.status
            )}
          </div>

          <div style="margin-top:8px;">
            ${accountStatusHtml(
              student
            )}
          </div>

        </div>

      </div>

      <div class="profile-grid">

        <div class="profile-item">
          <strong>Gender</strong>
          <span>
            ${escapeHtml(
              student.gender || "—"
            )}
          </span>
        </div>

        <div class="profile-item">
          <strong>Date of Birth</strong>
          <span>
            ${formatDate(
              student.date_of_birth
            )}
          </span>
        </div>

        <div class="profile-item">
          <strong>Phone</strong>
          <span>
            ${escapeHtml(
              student.phone || "—"
            )}
          </span>
        </div>

        <div class="profile-item">
          <strong>Email</strong>
          <span>
            ${escapeHtml(
              student.email || "—"
            )}
          </span>
        </div>

        <div class="profile-item">
          <strong>Admission Date</strong>
          <span>
            ${formatDate(
              student.admission_date
            )}
          </span>
        </div>

        <div class="profile-item">
          <strong>Address</strong>
          <span>
            ${escapeHtml(
              student.address || "—"
            )}
          </span>
        </div>

        <div class="profile-item">
          <strong>Emergency Contact</strong>
          <span>
            ${escapeHtml(
              student.emergency_contact_name ||
              "—"
            )}
          </span>
        </div>

        <div class="profile-item">
          <strong>Emergency Phone</strong>
          <span>
            ${escapeHtml(
              student.emergency_contact_phone ||
              "—"
            )}
          </span>
        </div>

        <div class="profile-item">
          <strong>Account</strong>
          <span>
            ${accountStatusHtml(
              student
            )}
          </span>
        </div>

      </div>
    `;

    modal.classList.add("show");
    modal.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  function closeProfileModal() {
    const modal =
      $("profileModal");

    if (!modal) return;

    modal.classList.remove("show");

    modal.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  /* ============================================================
     DELETE
     ============================================================ */

  async function deleteStudent(id) {
    try {
      requireSuperAdmin();

      const student =
        students.find(
          s =>
            String(s.id) ===
            String(id)
        );

      if (!student) {
        throw new Error(
          "Student not found."
        );
      }

      const confirmed =
        window.confirm(
          `Delete "${student.full_name}" (${student.student_id})?`
        );

      if (!confirmed) return;

      showMessage(
        "Deleting student...",
        "warning"
      );

      const {
        error
      } =
        await withTimeout(
          supabaseClient
            .from("students")
            .delete()
            .eq(
              "id",
              id
            )
        );

      if (error) {
        throw error;
      }

      showMessage(
        "STUDENT DELETED SUCCESSFULLY.",
        "success"
      );

      await loadStudents();

    } catch (error) {
      console.error(error);

      showMessage(
        `Delete failed: ${errorMessage(error)}`,
        "error"
      );
    }
  }

  /* ============================================================
     TABLE EVENTS
     ============================================================ */

  function handleTableClick(event) {
    const button =
      event.target.closest(
        "button[data-action]"
      );

    if (!button) return;

    const action =
      button.dataset.action;

    const id =
      button.dataset.id;

    if (action === "view")
      viewStudent(id);

    if (action === "edit")
      editStudent(id);

    if (action === "delete")
      deleteStudent(id);

    if (action === "create-account")
      studentAccount(id, false);

    if (action === "reset-password")
      studentAccount(id, true);
  }

  /* ============================================================
     EVENTS
     ============================================================ */

  function setupEvents() {
    $("studentForm")
      ?.addEventListener(
        "submit",
        handleStudentSubmit
      );

    $("photoInput")
      ?.addEventListener(
        "change",
        handlePhotoPreview
      );

    $("searchInput")
      ?.addEventListener(
        "input",
        renderStudents
      );

    $("statusFilter")
      ?.addEventListener(
        "change",
        renderStudents
      );

    $("resetFormButton")
      ?.addEventListener(
        "click",
        resetStudentForm
      );

    $("addStudentButton")
      ?.addEventListener(
        "click",
        () => {
          resetStudentForm();

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        }
      );

    $("refreshStudentsButton")
      ?.addEventListener(
        "click",
        async () => {
          try {
            clearMessage();
            await loadStudents();
          } catch (error) {
            showMessage(
              errorMessage(error),
              "error"
            );
          }
        }
      );

    $("studentsTableBody")
      ?.addEventListener(
        "click",
        handleTableClick
      );

    $("closeProfileModal")
      ?.addEventListener(
        "click",
        closeProfileModal
      );

    $("createAccountButton")
      ?.addEventListener(
        "click",
        () => {
          if (editingStudent) {
            studentAccount(
              editingStudent.id,
              false
            );
          }
        }
      );

    $("resetPasswordButton")
      ?.addEventListener(
        "click",
        () => {
          if (editingStudent) {
            studentAccount(
              editingStudent.id,
              true
            );
          }
        }
      );

    $("profileModal")
      ?.addEventListener(
        "click",
        event => {
          if (
            event.target ===
            $("profileModal")
          ) {
            closeProfileModal();
          }
        }
      );

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key ===
          "Escape"
        ) {
          closeProfileModal();
        }
      }
    );
  }

  /* ============================================================
     REQUIRED DOM
     ============================================================ */

  function checkDOM() {
    const required = [
      "message",
      "totalStudents",
      "activeStudents",
      "graduatedStudents",
      "otherStudents",
      "studentForm",
      "institutionSelect",
      "studentId",
      "fullName",
      "status",
      "studentsTableBody"
    ];

    const missing =
      required.filter(
        id => !$(id)
      );

    if (missing.length) {
      throw new Error(
        `Missing HTML elements: ${missing.join(", ")}`
      );
    }
  }

  /* ============================================================
     INIT
     ============================================================ */

  async function init() {
    if (initialized) return;

    initialized = true;

    try {
      checkDOM();

      clearMessage();

      await loadCurrentUser();

      await loadCurrentProfile();

      requireSuperAdmin();

      setupEvents();

      await loadStudents();

      resetStudentForm();

    } catch (error) {
      console.error(
        "Students module initialization:",
        error
      );

      showMessage(
        `Students module error: ${errorMessage(error)}`,
        "error"
      );
    }
  }

  /* ============================================================
     GLOBAL
     ============================================================ */

  window.viewStudent =
    viewStudent;

  window.editStudent =
    editStudent;

  window.deleteStudent =
    deleteStudent;

  window.closeProfileModal =
    closeProfileModal;

  window.resetStudentForm =
    resetStudentForm;

  window.createStudentAccount =
    id =>
      studentAccount(
        id,
        false
      );

  window.resetStudentPassword =
    id =>
      studentAccount(
        id,
        true
      );

  /* ============================================================
     BOOT
     ============================================================ */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
