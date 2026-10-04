/* =========================================================
   GAAWOW EMS
   STUDENTS.JS
   Version: 5.3
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     SUPABASE CONFIG
  ========================================================= */

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_ANON_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const { createClient } = window.supabase;

  const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


  /* =========================================================
     CONFIG
  ========================================================= */

  const TABLE_STUDENTS = "students";
  const TABLE_INSTITUTIONS = "institutions";

  const ACCOUNT_FUNCTION =
    "create-student-account";

  const MAX_PHOTO_SIZE =
    10 * 1024 * 1024;


  /* =========================================================
     STATE
  ========================================================= */

  let students = [];
  let institutions = [];

  let editingStudent = null;
  let selectedPhotoFile = null;

  let currentProfileStudent = null;

  let currentProfile = null;


  /* =========================================================
     DOM HELPERS
  ========================================================= */

  const $ = (id) =>
    document.getElementById(id);


  /* =========================================================
     ELEMENTS
  ========================================================= */

  const messageEl =
    $("message");

  const studentForm =
    $("studentForm");

  const institutionSelect =
    $("institutionSelect");

  const studentIdInput =
    $("studentId");

  const fullNameInput =
    $("fullName");

  const genderInput =
    $("gender");

  const dateOfBirthInput =
    $("dateOfBirth");

  const phoneInput =
    $("phone");

  const emailInput =
    $("email");

  const admissionDateInput =
    $("admissionDate");

  const statusInput =
    $("status");

  const addressInput =
    $("address");

  const photoInput =
    $("photoInput");

  const photoPreview =
    $("photoPreview");

  const photoPlaceholder =
    $("photoPlaceholder");

  const editStudentDbId =
    $("editStudentDbId");

  const formTitle =
    $("formTitle");

  const saveButton =
    $("saveButton");

  const resetFormButton =
    $("resetFormButton");

  const addStudentButton =
    $("addStudentButton");

  const refreshStudentsButton =
    $("refreshStudentsButton");

  const searchInput =
    $("searchInput");

  const statusFilter =
    $("statusFilter");

  const studentsTableBody =
    $("studentsTableBody");

  const totalStudents =
    $("totalStudents");

  const activeStudents =
    $("activeStudents");

  const graduatedStudents =
    $("graduatedStudents");

  const otherStudents =
    $("otherStudents");

  const progressWrap =
    $("progressWrap");

  const progressBar =
    $("progressBar");

  const progressText =
    $("progressText");

  const accountStatus =
    $("accountStatus");

  const createAccountButton =
    $("createAccountButton");

  const resetPasswordButton =
    $("resetPasswordButton");

  const profileModal =
    $("profileModal");

  const profileContent =
    $("profileContent");

  const closeProfileModal =
    $("closeProfileModal");


  /* =========================================================
     INITIALIZATION
  ========================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    init
  );


  async function init() {

    bindEvents();

    setDefaultAdmissionDate();

    await loadCurrentUser();

    await loadInstitutions();

    await loadStudents();

    resetForm();

  }


  /* =========================================================
     EVENTS
  ========================================================== */

  function bindEvents() {

    studentForm?.addEventListener(
      "submit",
      handleStudentSubmit
    );

    resetFormButton?.addEventListener(
      "click",
      resetForm
    );

    addStudentButton?.addEventListener(
      "click",
      () => {

        resetForm();

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      }
    );

    refreshStudentsButton?.addEventListener(
      "click",
      loadStudents
    );

    searchInput?.addEventListener(
      "input",
      renderStudents
    );

    statusFilter?.addEventListener(
      "change",
      renderStudents
    );

    photoInput?.addEventListener(
      "change",
      handlePhotoChange
    );

    institutionSelect?.addEventListener(
      "change",
      () => {

        if (
          !editingStudent
        ) {
          studentIdInput.value = "";
        }

      }
    );

    createAccountButton?.addEventListener(
      "click",
      handleCreateAccount
    );

    resetPasswordButton?.addEventListener(
      "click",
      handleResetPassword
    );

    closeProfileModal?.addEventListener(
      "click",
      closeProfile
    );

    profileModal?.addEventListener(
      "click",
      (event) => {

        if (
          event.target === profileModal
        ) {
          closeProfile();
        }

      }
    );

    document.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "Escape"
        ) {
          closeProfile();
        }

      }
    );

  }


  /* =========================================================
     CURRENT USER / SUPER ADMIN
  ========================================================== */

  async function loadCurrentUser() {

    try {

      const {
        data,
        error
      } =
        await supabaseClient.auth.getUser();

      if (error) {
        throw error;
      }

      currentProfile =
        data?.user || null;

    } catch (error) {

      console.error(
        "Auth user error:",
        error
      );

    }

  }


  async function isSuperAdmin() {

    /*
      IMPORTANT:
      Super Admin authorization must be enforced by
      Supabase RLS / server-side policy as well.

      This frontend check is only an additional UI guard.
    */

    try {

      const {
        data: userData,
        error: userError
      } =
        await supabaseClient.auth.getUser();

      if (
        userError ||
        !userData?.user
      ) {
        return false;
      }

      const user =
        userData.user;

      const role =
        user.app_metadata?.role ||
        user.user_metadata?.role ||
        "";

      return (
        String(role)
          .toLowerCase()
          .replace(/\s+/g, "_") ===
        "super_admin"
      );

    } catch (error) {

      console.error(
        "Super Admin check failed:",
        error
      );

      return false;

    }

  }


  /* =========================================================
     INSTITUTIONS
  ========================================================== */

  async function loadInstitutions() {

    institutionSelect.innerHTML =
      `<option value="">Loading institutions...</option>`;

    try {

      const {
        data,
        error
      } =
        await supabaseClient
          .from(TABLE_INSTITUTIONS)
          .select("*")
          .order("name", {
            ascending: true
          });

      if (error) {
        throw error;
      }

      institutions =
        data || [];

      renderInstitutionOptions();

    } catch (error) {

      console.error(
        "Institutions error:",
        error
      );

      institutionSelect.innerHTML =
        `<option value="">Unable to load institutions</option>`;

      showMessage(
        "Unable to load institutions. Check your Supabase table/RLS configuration.",
        "error"
      );

    }

  }


  function renderInstitutionOptions(
    selectedId = ""
  ) {

    institutionSelect.innerHTML =
      `<option value="">Select institution</option>`;

    institutions.forEach(
      institution => {

        const id =
          institution.id;

        const name =
          institution.name ||
          institution.institution_name ||
          institution.title ||
          `Institution ${id}`;

        const option =
          document.createElement("option");

        option.value =
          id;

        option.textContent =
          name;

        if (
          String(id) ===
          String(selectedId)
        ) {
          option.selected = true;
        }

        institutionSelect.appendChild(
          option
        );

      }
    );

  }


  /* =========================================================
     LOAD STUDENTS
  ========================================================== */

  async function loadStudents() {

    setProgress(
      true,
      15,
      "Loading students..."
    );

    try {

      const {
        data,
        error
      } =
        await supabaseClient
          .from(TABLE_STUDENTS)
          .select(`
            *
          `)
          .order(
            "created_at",
            {
              ascending: false
            }
          );

      if (error) {
        throw error;
      }

      students =
        data || [];

      renderStudents();

      updateStatistics();

      setProgress(
        false
      );

    } catch (error) {

      console.error(
        "Students loading error:",
        error
      );

      students = [];

      renderStudents();

      updateStatistics();

      setProgress(
        false
      );

      showMessage(
        getSupabaseErrorMessage(error),
        "error"
      );

    }

  }


  /* =========================================================
     RENDER STUDENTS
  ========================================================== */

  function renderStudents() {

    const search =
      String(
        searchInput?.value || ""
      )
        .trim()
        .toLowerCase();

    const filterStatus =
      statusFilter?.value || "";

    let filtered =
      students.filter(
        student => {

          const searchable = [

            student.student_id,

            student.full_name,

            student.phone,

            student.email,

            student.gender,

            getInstitutionName(
              student.institution_id
            )

          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !search ||
            searchable.includes(
              search
            );

          const matchesStatus =
            !filterStatus ||
            student.status ===
              filterStatus;

          return (
            matchesSearch &&
            matchesStatus
          );

        }
      );


    if (
      !filtered.length
    ) {

      studentsTableBody.innerHTML =
        `
        <tr>
          <td
            colspan="10"
            class="empty"
          >
            No students found.
          </td>
        </tr>
        `;

      return;

    }


    studentsTableBody.innerHTML =
      filtered
        .map(
          student =>
            createStudentRow(
              student
            )
        )
        .join("");


    bindRowActions();

  }


  function createStudentRow(
    student
  ) {

    const photo =
      student.photo_url ||
      student.photo ||
      "";

    const initials =
      getInitials(
        student.full_name
      );

    const accountEnabled =
      Boolean(
        student.account_enabled
      );

    const accountHTML =
      accountEnabled
        ?
        `<span class="status status-active">
          Active
        </span>`
        :
        `<span class="status status-inactive">
          No Account
        </span>`;


    return `
      <tr>

        <td>

          ${
            photo
              ?
              `
              <img
                src="${escapeAttribute(photo)}"
                class="student-photo"
                alt="Student"
                onerror="this.style.display='none'"
              >
              `
              :
              `
              <div class="initials">
                ${escapeHTML(initials)}
              </div>
              `
          }

        </td>


        <td>
          <strong>
            ${escapeHTML(
              student.student_id ||
              "Pending..."
            )}
          </strong>
        </td>


        <td>
          ${escapeHTML(
            student.full_name ||
            "-"
          )}
        </td>


        <td>
          ${escapeHTML(
            student.gender ||
            "-"
          )}
        </td>


        <td>
          ${escapeHTML(
            student.phone ||
            "-"
          )}
        </td>


        <td>
          ${escapeHTML(
            student.email ||
            "-"
          )}
        </td>


        <td>
          ${statusBadge(
            student.status
          )}
        </td>


        <td>
          ${formatDate(
            student.admission_date
          )}
        </td>


        <td>
          ${accountHTML}
        </td>


        <td>

          <div class="actions">

            <button
              type="button"
              class="btn-small action-view"
              data-action="view"
              data-id="${escapeAttribute(student.id)}"
            >
              View
            </button>


            <button
              type="button"
              class="btn-small action-edit"
              data-action="edit"
              data-id="${escapeAttribute(student.id)}"
            >
              Edit
            </button>


            ${
              accountEnabled
                ?
                `
                <button
                  type="button"
                  class="btn-small action-reset-password"
                  data-action="reset"
                  data-id="${escapeAttribute(student.id)}"
                >
                  Reset Password
                </button>
                `
                :
                `
                <button
                  type="button"
                  class="btn-small action-create-account"
                  data-action="account"
                  data-id="${escapeAttribute(student.id)}"
                >
                  Create Account
                </button>
                `
            }


            <button
              type="button"
              class="btn-small action-delete"
              data-action="delete"
              data-id="${escapeAttribute(student.id)}"
            >
              Delete
            </button>

          </div>

        </td>

      </tr>
    `;

  }


  /* =========================================================
     ROW ACTIONS
  ========================================================== */

  function bindRowActions() {

    document
      .querySelectorAll(
        "[data-action]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            async () => {

              const action =
                button.dataset.action;

              const id =
                button.dataset.id;

              const student =
                students.find(
                  item =>
                    String(item.id) ===
                    String(id)
                );

              if (!student) {
                return;
              }


              if (
                action === "view"
              ) {

                openProfile(
                  student
                );

              }


              if (
                action === "edit"
              ) {

                editStudent(
                  student
                );

              }


              if (
                action === "account"
              ) {

                await handleCreateAccountForStudent(
                  student
                );

              }


              if (
                action === "reset"
              ) {

                await handleResetPasswordForStudent(
                  student
                );

              }


              if (
                action === "delete"
              ) {

                await deleteStudent(
                  student
                );

              }

            }
          );

        }
      );

  }


  /* =========================================================
     STATISTICS
  ========================================================== */

  function updateStatistics() {

    const total =
      students.length;

    const active =
      students.filter(
        s =>
          s.status ===
          "active"
      ).length;

    const graduated =
      students.filter(
        s =>
          s.status ===
          "graduated"
      ).length;

    const other =
      total -
      active -
      graduated;


    totalStudents.textContent =
      total;

    activeStudents.textContent =
      active;

    graduatedStudents.textContent =
      graduated;

    otherStudents.textContent =
      other;

  }


  /* =========================================================
     FORM SUBMIT
  ========================================================== */

  async function handleStudentSubmit(
    event
  ) {

    event.preventDefault();

    clearMessage();

    const fullName =
      fullNameInput.value.trim();

    const institutionId =
      institutionSelect.value;

    const admissionDate =
      admissionDateInput.value;

    if (!institutionId) {

      showMessage(
        "Please select an institution.",
        "error"
      );

      institutionSelect.focus();

      return;

    }

    if (!fullName) {

      showMessage(
        "Please enter the student's full name.",
        "error"
      );

      fullNameInput.focus();

      return;

    }

    if (!admissionDate) {

      showMessage(
        "Please select the admission date.",
        "error"
      );

      admissionDateInput.focus();

      return;

    }


    saveButton.disabled =
      true;

    setProgress(
      true,
      20,
      editingStudent
        ? "Updating student..."
        : "Creating student..."
    );


    try {

      const payload = {

        institution_id:
          institutionId,

        full_name:
          fullName,

        gender:
          emptyToNull(
            genderInput.value
          ),

        date_of_birth:
          emptyToNull(
            dateOfBirthInput.value
          ),

        phone:
          emptyToNull(
            phoneInput.value.trim()
          ),

        email:
          emptyToNull(
            emailInput.value.trim()
          ),

        admission_date:
          admissionDate,

        status:
          statusInput.value,

        address:
          emptyToNull(
            addressInput.value.trim()
          )

      };


      /*
        NOTE:
        student_id is intentionally NOT included.

        Supabase trigger generates:
        GA-2026-000001
        GA-2026-000002
        ...
      */


      if (
        selectedPhotoFile
      ) {

        setProgress(
          true,
          35,
          "Uploading photo..."
        );

        const photoUrl =
          await uploadStudentPhoto(
            selectedPhotoFile
          );

        payload.photo_url =
          photoUrl;

      }


      setProgress(
        true,
        60,
        editingStudent
          ? "Saving changes..."
          : "Saving student..."
      );


      if (
        editingStudent
      ) {

        const {
          error
        } =
          await supabaseClient
            .from(TABLE_STUDENTS)
            .update(payload)
            .eq(
              "id",
              editingStudent.id
            );

        if (error) {
          throw error;
        }

        showMessage(
          "Student updated successfully.",
          "success"
        );

      } else {

        const {
          data,
          error
        } =
          await supabaseClient
            .from(TABLE_STUDENTS)
            .insert(
              payload
            )
            .select()
            .single();

        if (error) {
          throw error;
        }

        /*
          Trigger-generated student_id
          will be returned here.
        */

        if (
          data?.student_id
        ) {

          studentIdInput.value =
            data.student_id;

        }

        showMessage(
          `Student created successfully. Student ID: ${
            data?.student_id ||
            "Generated by Supabase"
          }`,
          "success"
        );

      }


      setProgress(
        true,
        90,
        "Refreshing student records..."
      );

      await loadStudents();

      if (
        !editingStudent
      ) {
        resetForm();
      }


    } catch (error) {

      console.error(
        "Save student error:",
        error
      );

      showMessage(
        getSupabaseErrorMessage(
          error
        ),
        "error"
      );

    } finally {

      saveButton.disabled =
        false;

      setProgress(
        false
      );

    }

  }


  /* =========================================================
     EDIT STUDENT
  ========================================================== */

  function editStudent(
    student
  ) {

    editingStudent =
      student;

    editStudentDbId.value =
      student.id || "";

    formTitle.textContent =
      "Edit Student";

    saveButton.textContent =
      "Update Student";


    renderInstitutionOptions(
      student.institution_id
    );


    studentIdInput.value =
      student.student_id ||
      "";


    fullNameInput.value =
      student.full_name ||
      "";

    genderInput.value =
      student.gender ||
      "";

    dateOfBirthInput.value =
      student.date_of_birth ||
      "";

    phoneInput.value =
      student.phone ||
      "";

    emailInput.value =
      student.email ||
      "";

    admissionDateInput.value =
      student.admission_date ||
      "";

    statusInput.value =
      student.status ||
      "active";

    addressInput.value =
      student.address ||
      "";


    selectedPhotoFile =
      null;

    if (
      student.photo_url
    ) {

      photoPreview.src =
        student.photo_url;

      photoPreview.style.display =
        "block";

      photoPlaceholder.style.display =
        "none";

    } else {

      clearPhotoPreview();

    }


    updateAccountSection(
      student
    );


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }


  /* =========================================================
     RESET FORM
  ========================================================== */

  function resetForm() {

    editingStudent =
      null;

    selectedPhotoFile =
      null;

    editStudentDbId.value =
      "";

    studentForm.reset();

    formTitle.textContent =
      "Add Student";

    saveButton.textContent =
      "Save Student";

    statusInput.value =
      "active";

    setDefaultAdmissionDate();

    studentIdInput.value =
      "";

    clearPhotoPreview();

    renderInstitutionOptions();

    updateAccountSection(
      null
    );

  }


  function setDefaultAdmissionDate() {

    if (
      !admissionDateInput.value
    ) {

      admissionDateInput.value =
        new Date()
          .toISOString()
          .slice(
            0,
            10
          );

    }

  }


  /* =========================================================
     PHOTO
  ========================================================== */

  function handlePhotoChange(
    event
  ) {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      file.size >
      MAX_PHOTO_SIZE
    ) {

      showMessage(
        "Photo must be 10MB or smaller.",
        "error"
      );

      photoInput.value =
        "";

      return;

    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp"
      ].includes(
        file.type
      )
    ) {

      showMessage(
        "Only JPG, PNG and WEBP images are allowed.",
        "error"
      );

      photoInput.value =
        "";

      return;

    }


    selectedPhotoFile =
      file;


    const reader =
      new FileReader();

    reader.onload =
      () => {

        photoPreview.src =
          reader.result;

        photoPreview.style.display =
          "block";

        photoPlaceholder.style.display =
          "none";

      };

    reader.readAsDataURL(
      file
    );

  }


  function clearPhotoPreview() {

    photoPreview.src =
      "";

    photoPreview.style.display =
      "none";

    photoPlaceholder.style.display =
      "block";

    if (
      photoInput
    ) {
      photoInput.value =
        "";
    }

  }


  /* =========================================================
     PHOTO UPLOAD
  ========================================================== */

  async function uploadStudentPhoto(
    file
  ) {

    /*
      This requires a Storage bucket named:
      student-photos

      Adjust bucket name only if your existing
      Supabase Storage bucket uses another name.
    */

    const extension =
      getFileExtension(
        file.name
      );

    const random =
      crypto.randomUUID();

    const path =
      `students/${random}.${extension}`;


    const {
      error
    } =
      await supabaseClient
        .storage
        .from(
          "student-photos"
        )
        .upload(
          path,
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
          "student-photos"
        )
        .getPublicUrl(
          path
        );


    return data.publicUrl;

  }


  /* =========================================================
     ACCOUNT SECTION
  ========================================================== */

  function updateAccountSection(
    student
  ) {

    if (!student) {

      accountStatus.textContent =
        "Save student first";

      accountStatus.className =
        "status status-inactive";

      createAccountButton.style.display =
        "none";

      resetPasswordButton.style.display =
        "none";

      return;

    }


    const enabled =
      Boolean(
        student.account_enabled
      );

    if (enabled) {

      accountStatus.textContent =
        "Active";

      accountStatus.className =
        "status status-active";

      createAccountButton.style.display =
        "none";

      resetPasswordButton.style.display =
        "inline-flex";

    } else {

      accountStatus.textContent =
        "No Account";

      accountStatus.className =
        "status status-inactive";

      createAccountButton.style.display =
        "inline-flex";

      resetPasswordButton.style.display =
        "none";

    }

  }


  /* =========================================================
     CREATE ACCOUNT - FORM
  ========================================================== */

  async function handleCreateAccount() {

    if (
      !editingStudent
    ) {

      showMessage(
        "Save the student record first.",
        "warning"
      );

      return;

    }

    await handleCreateAccountForStudent(
      editingStudent
    );

  }


  /* =========================================================
     CREATE ACCOUNT
  ========================================================== */

  async function handleCreateAccountForStudent(
    student
  ) {

    const allowed =
      await isSuperAdmin();

    if (!allowed) {

      showMessage(
        "Only Super Admin can create student accounts.",
        "error"
      );

      return;

    }


    if (
      !student?.student_id
    ) {

      showMessage(
        "Student ID has not been generated yet.",
        "error"
      );

      return;

    }


    const password =
      prompt(
        `Create login password for ${student.student_id}.\n\nMinimum 8 characters:`
      );


    if (
      password === null
    ) {
      return;
    }


    if (
      password.length < 8
    ) {

      showMessage(
        "Password must contain at least 8 characters.",
        "error"
      );

      return;

    }


    if (
      !confirm(
        `Create login account for ${student.full_name} (${student.student_id})?`
      )
    ) {
      return;
    }


    setProgress(
      true,
      30,
      "Creating secure student account..."
    );


    try {

      const {
        data: sessionData
      } =
        await supabaseClient.auth.getSession();


      const accessToken =
        sessionData?.session
          ?.access_token;


      if (
        !accessToken
      ) {

        throw new Error(
          "You are not logged in."
        );

      }


      setProgress(
        true,
        55,
        "Calling secure account service..."
      );


      const response =
        await fetch(
          `${SUPABASE_URL}/functions/v1/${ACCOUNT_FUNCTION}`,
          {
            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              "Authorization":
                `Bearer ${accessToken}`,

              "apikey":
                SUPABASE_ANON_KEY

            },

            body:
              JSON.stringify({

                student_id:
                  student.student_id,

                password:
                  password

              })

          }
        );


      const result =
        await response
          .json()
          .catch(
            () => ({})
          );


      if (
        !response.ok
      ) {

        throw new Error(
          result.error ||
          result.message ||
          `Account creation failed (${response.status}).`
        );

      }


      showMessage(
        "Student account created successfully.",
        "success"
      );


      setProgress(
        true,
        90,
        "Refreshing student account status..."
      );


      await loadStudents();


      const updated =
        students.find(
          s =>
            String(s.id) ===
            String(student.id)
        );


      if (
        updated
      ) {

        editingStudent =
          updated;

        updateAccountSection(
          updated
        );

      }


    } catch (error) {

      console.error(
        "Create account error:",
        error
      );

      showMessage(
        getSupabaseErrorMessage(
          error
        ),
        "error"
      );

    } finally {

      setProgress(
        false
      );

    }

  }


  /* =========================================================
     RESET PASSWORD
  ========================================================== */

  async function handleResetPassword() {

    if (
      !editingStudent
    ) {
      return;
    }

    await handleResetPasswordForStudent(
      editingStudent
    );

  }


  async function handleResetPasswordForStudent(
    student
  ) {

    const allowed =
      await isSuperAdmin();

    if (!allowed) {

      showMessage(
        "Only Super Admin can reset student passwords.",
        "error"
      );

      return;

    }


    if (
      !student?.student_id
    ) {

      showMessage(
        "Student ID is missing.",
        "error"
      );

      return;

    }


    const password =
      prompt(
        `Enter a new password for ${student.student_id}:\n\nMinimum 8 characters:`
      );


    if (
      password === null
    ) {
      return;
    }


    if (
      password.length < 8
    ) {

      showMessage(
        "Password must contain at least 8 characters.",
        "error"
      );

      return;

    }


    if (
      !confirm(
        `Reset password for ${student.full_name}?`
      )
    ) {
      return;
    }


    setProgress(
      true,
      35,
      "Resetting student password..."
    );


    try {

      const {
        data: sessionData
      } =
        await supabaseClient.auth.getSession();


      const accessToken =
        sessionData?.session
          ?.access_token;


      if (
        !accessToken
      ) {

        throw new Error(
          "You are not logged in."
        );

      }


      const response =
        await fetch(
          `${SUPABASE_URL}/functions/v1/${ACCOUNT_FUNCTION}`,
          {
            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              "Authorization":
                `Bearer ${accessToken}`,

              "apikey":
                SUPABASE_ANON_KEY

            },

            body:
              JSON.stringify({

                student_id:
                  student.student_id,

                password:
                  password,

                reset_password:
                  true

              })

          }
        );


      const result =
        await response
          .json()
          .catch(
            () => ({})
          );


      if (
        !response.ok
      ) {

        throw new Error(
          result.error ||
          result.message ||
          `Password reset failed (${response.status}).`
        );

      }


      showMessage(
        "Student password reset successfully.",
        "success"
      );


    } catch (error) {

      console.error(
        "Reset password error:",
        error
      );

      showMessage(
        getSupabaseErrorMessage(
          error
        ),
        "error"
      );

    } finally {

      setProgress(
        false
      );

    }

  }


  /* =========================================================
     DELETE STUDENT
  ========================================================== */

  async function deleteStudent(
    student
  ) {

    const allowed =
      await isSuperAdmin();

    if (!allowed) {

      showMessage(
        "Only Super Admin can delete students.",
        "error"
      );

      return;

    }


    const confirmed =
      confirm(
        `Delete student permanently?\n\n${student.full_name}\n${student.student_id}\n\nThis action cannot be undone.`
      );


    if (!confirmed) {
      return;
    }


    setProgress(
      true,
      40,
      "Deleting student..."
    );


    try {

      const {
        error
      } =
        await supabaseClient
          .from(TABLE_STUDENTS)
          .delete()
          .eq(
            "id",
            student.id
          );


      if (error) {
        throw error;
      }


      showMessage(
        "Student deleted successfully.",
        "success"
      );


      if (
        editingStudent &&
        String(editingStudent.id) ===
        String(student.id)
      ) {

        resetForm();

      }


      await loadStudents();


    } catch (error) {

      console.error(
        "Delete student error:",
        error
      );

      showMessage(
        getSupabaseErrorMessage(
          error
        ),
        "error"
      );

    } finally {

      setProgress(
        false
      );

    }

  }


  /* =========================================================
     PROFILE MODAL
  ========================================================== */

  function openProfile(
    student
  ) {

    currentProfileStudent =
      student;


    const photo =
      student.photo_url ||
      student.photo ||
      "";


    profileContent.innerHTML =
      `
      <div class="profile-top">

        ${
          photo
            ?
            `
            <img
              src="${escapeAttribute(photo)}"
              class="profile-photo"
              alt="Student photo"
            >
            `
            :
            `
            <div
              class="profile-photo"
              style="font-size:30px;"
            >
              👤
            </div>
            `
        }


        <div>

          <div class="profile-name">
            ${escapeHTML(
              student.full_name ||
              "-"
            )}
          </div>

          <div class="profile-id">
            ${escapeHTML(
              student.student_id ||
              "-"
            )}
          </div>

          <div style="margin-top:8px;">
            ${statusBadge(
              student.status
            )}
          </div>

        </div>

      </div>


      <div class="profile-grid">

        ${profileItem(
          "Institution",
          getInstitutionName(
            student.institution_id
          )
        )}

        ${profileItem(
          "Gender",
          student.gender
        )}

        ${profileItem(
          "Date of Birth",
          formatDate(
            student.date_of_birth
          )
        )}

        ${profileItem(
          "Phone",
          student.phone
        )}

        ${profileItem(
          "Email",
          student.email
        )}

        ${profileItem(
          "Admission Date",
          formatDate(
            student.admission_date
          )
        )}

        ${profileItem(
          "Account",
          student.account_enabled
            ? "Active"
            : "No Account"
        )}

        ${profileItem(
          "Address",
          student.address
        )}

      </div>
      `;


    profileModal.classList.add(
      "show"
    );

    profileModal.setAttribute(
      "aria-hidden",
      "false"
    );

  }


  function closeProfile() {

    profileModal.classList.remove(
      "show"
    );

    profileModal.setAttribute(
      "aria-hidden",
      "true"
    );

    currentProfileStudent =
      null;

  }


  function profileItem(
    label,
    value
  ) {

    return `
      <div class="profile-item">

        <strong>
          ${escapeHTML(
            label
          )}
        </strong>

        <span>
          ${escapeHTML(
            value ||
            "-"
          )}
        </span>

      </div>
    `;

  }


  /* =========================================================
     STATUS BADGE
  ========================================================== */

  function statusBadge(
    status
  ) {

    const normalized =
      String(
        status || ""
      )
        .toLowerCase();


    let className =
      "status status-inactive";

    let text =
      status ||
      "Unknown";


    if (
      normalized ===
      "active"
    ) {

      className =
        "status status-active";

      text =
        "Active";

    }


    if (
      normalized ===
      "graduated"
    ) {

      className =
        "status status-graduated";

      text =
        "Graduated";

    }


    if (
      normalized ===
      "suspended"
    ) {

      className =
        "status status-suspended";

      text =
        "Suspended";

    }


    if (
      normalized ===
      "inactive"
    ) {

      className =
        "status status-inactive";

      text =
        "Inactive";

    }


    return `
      <span class="${className}">
        ${escapeHTML(text)}
      </span>
    `;

  }


  /* =========================================================
     INSTITUTION NAME
  ========================================================== */

  function getInstitutionName(
    institutionId
  ) {

    if (
      !institutionId
    ) {
      return "-";
    }

    const institution =
      institutions.find(
        item =>
          String(item.id) ===
          String(institutionId)
      );


    if (!institution) {
      return "-";
    }


    return (
      institution.name ||
      institution.institution_name ||
      institution.title ||
      "-"
    );

  }


  /* =========================================================
     PROGRESS
  ========================================================== */

  function setProgress(
    visible,
    percent = 0,
    text = ""
  ) {

    if (!progressWrap) {
      return;
    }


    progressWrap.style.display =
      visible
        ? "block"
        : "none";


    if (
      progressBar
    ) {

      progressBar.style.width =
        `${percent}%`;

    }


    if (
      progressText
    ) {

      progressText.textContent =
        text;

    }

  }


  /* =========================================================
     MESSAGE
  ========================================================== */

  function showMessage(
    text,
    type = "success"
  ) {

    if (!messageEl) {
      return;
    }


    messageEl.textContent =
      text;

    messageEl.className =
      `message ${type}`;

    messageEl.style.display =
      "block";


    clearTimeout(
      showMessage.timer
    );


    showMessage.timer =
      setTimeout(
        () => {

          clearMessage();

        },
        7000
      );

  }


  function clearMessage() {

    if (!messageEl) {
      return;
    }

    messageEl.textContent =
      "";

    messageEl.className =
      "message";

    messageEl.style.display =
      "none";

  }


  /* =========================================================
     HELPERS
  ========================================================== */

  function emptyToNull(
    value
  ) {

    const v =
      String(
        value || ""
      ).trim();

    return v
      ? v
      : null;

  }


  function formatDate(
    value
  ) {

    if (!value) {
      return "-";
    }


    try {

      const date =
        new Date(
          `${value}T00:00:00`
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return value;
      }

      return date.toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );

    } catch {

      return value;

    }

  }


  function getInitials(
    name
  ) {

    if (!name) {
      return "ST";
    }


    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(
        part =>
          part
            .charAt(0)
            .toUpperCase()
      )
      .join("");

  }


  function getFileExtension(
    filename
  ) {

    const parts =
      filename
        .split(".");

    return (
      parts
        .pop()
        ?.toLowerCase() ||
      "jpg"
    );

  }


  function escapeHTML(
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


  function escapeAttribute(
    value
  ) {

    return escapeHTML(
      value
    );

  }


  function getSupabaseErrorMessage(
    error
  ) {

    if (!error) {
      return "An unknown error occurred.";
    }


    const message =
      error.message ||
      error.error_description ||
      error.details ||
      error.hint ||
      "An unknown error occurred.";


    if (
      message.includes(
        "duplicate key"
      )
    ) {

      return (
        "This record already exists. " +
        "Please check the Student ID or another unique field."
      );

    }


    if (
      message.includes(
        "row-level security"
      ) ||
      message.includes(
        "permission denied"
      )
    ) {

      return (
        "Permission denied by Supabase RLS. " +
        "Make sure your Super Admin policy allows this operation."
      );

    }


    return message;

  }


  /* =========================================================
     EXPOSE OPTIONAL DEBUG API
  ========================================================== */

  window.GAAWOWStudents = {

    reload:
      loadStudents,

    resetForm:
      resetForm,

    openProfile:
      openProfile,

    editStudent:
      editStudent,

    supabase:
      supabaseClient

  };


})();
