/* ============================================================
   GAAWOW EMS
   STUDENTS MODULE V5.1
   ------------------------------------------------------------
   V5.1 = V5.0 + PHOTOS THAT WORK EVERYWHERE
   - Every photo is EXIF-corrected, cropped to a square (face kept
     near the top) and saved as a 800x800 JPEG. The Certificate
     Generator draws it inside a circle, so it always fits.
   - After upload the photo link is TESTED. If the public link does
     not open (private bucket), a long-lived signed link is saved
     instead, so the certificate can still load it.
   - Clear warning when the photo could not be opened.
   - Everything else (IDs, roles, schema) is unchanged.
   ============================================================ */

(() => {
  "use strict";

  /* ------------------------------------------------------------
     CONFIG
  ------------------------------------------------------------ */

  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const PHOTO_BUCKET = "student-photos";
  const LOAD_TIMEOUT = 15000;

  const PHOTO_RAW_MAX = 10 * 1024 * 1024;   // photo taken from the phone
  const PHOTO_OUTPUT = 800;                 // final square size (px)
  const PHOTO_QUALITY = 0.9;
  const PHOTO_FACE_BIAS = 0.15;             // 0 = top, 0.5 = centre (portrait photos)
  const SIGNED_URL_SECONDS = 60 * 60 * 24 * 365 * 10;   // 10 years


  /* ------------------------------------------------------------
     SUPABASE CLIENT
  ------------------------------------------------------------ */

  if (!window.supabase) {
    document.addEventListener("DOMContentLoaded", () => {
      const box = document.getElementById("message");
      if (box) {
        box.className = "message error";
        box.textContent = "Supabase library failed to load. Please refresh the page.";
      }
    });
    return;
  }

  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });


  /* ------------------------------------------------------------
     STATE
  ------------------------------------------------------------ */

  let currentUser = null;
  let currentProfile = null;

  let institutions = [];
  let students = [];

  let editingStudent = null;
  let isSaving = false;
  let initialized = false;

  let photoTask = null;      // promise of the photo being prepared
  let pendingPhoto = null;   // { blob, previewUrl } ready to upload


  /* ------------------------------------------------------------
     HELPERS
  ------------------------------------------------------------ */

  const $ = (id) => document.getElementById(id);

  function showMessage(message, type = "success") {
    const box = $("message");
    if (!box) return;
    box.className = `message ${type}`;
    box.textContent = message;
    box.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearMessage() {
    const box = $("message");
    if (!box) return;
    box.className = "message";
    box.textContent = "";
    box.style.display = "none";
  }

  function getErrorMessage(error) {
    if (!error) return "Unknown error";
    return (
      error.message ||
      error.error_description ||
      error.details ||
      error.hint ||
      String(error)
    );
  }

  function withTimeout(promise, ms = LOAD_TIMEOUT) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Request timed out. Please check Supabase connection or RLS policies."));
        }, ms);
      })
    ]);
  }

  function createUUID() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getInitials(name) {
    const value = String(name || "").trim();
    if (!value) return "?";
    return value
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("");
  }

  function statusHtml(status) {
    const value = status || "active";
    const className = `status-${String(value).toLowerCase()}`;
    return `<span class="status ${className}">${escapeHtml(value)}</span>`;
  }

  function formatDate(date) {
    if (!date) return "—";
    try {
      const d = new Date(`${date}T00:00:00`);
      if (Number.isNaN(d.getTime())) return escapeHtml(date);
      return d.toLocaleDateString();
    } catch {
      return escapeHtml(date);
    }
  }


  /* ------------------------------------------------------------
     CONNECTION TEST (informational only)
  ------------------------------------------------------------ */

  async function checkSupabaseConnection() {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
        method: "GET",
        headers: { apikey: SUPABASE_KEY }
      });
      if (!response.ok) {
        throw new Error(`Supabase connection returned HTTP ${response.status}`);
      }
      return true;
    } catch (error) {
      console.warn("Supabase connection check:", getErrorMessage(error));
      return false;
    }
  }


  /* ------------------------------------------------------------
     CURRENT USER + PROFILE  (profiles.id = auth user id)
  ------------------------------------------------------------ */

  async function loadCurrentUser() {
    const { data, error } = await withTimeout(supabaseClient.auth.getUser());
    if (error) throw error;
    if (!data || !data.user) {
      throw new Error("No authenticated user found. Please login again.");
    }
    currentUser = data.user;
    return currentUser;
  }

  async function loadCurrentProfile() {
    if (!currentUser) throw new Error("Authenticated user is missing.");

    const { data, error } = await withTimeout(
      supabaseClient
        .from("profiles")
        .select("id,institution_id,full_name,role,is_active")
        .eq("id", currentUser.id)
        .maybeSingle()
    );

    if (error) throw error;
    if (!data) throw new Error("Your profile was not found in the profiles table.");
    if (data.is_active === false) throw new Error("Your EMS profile is inactive.");

    currentProfile = data;
    return currentProfile;
  }

  function isSuperAdmin() {
    return currentProfile && currentProfile.role === "super_admin";
  }

  function canAccessStudentsModule() {
    if (!currentProfile) return false;
    return ["super_admin", "school_admin", "teacher"].includes(currentProfile.role);
  }


  /* ------------------------------------------------------------
     INSTITUTIONS
  ------------------------------------------------------------ */

  async function loadInstitutions() {
    let query = supabaseClient
      .from("institutions")
      .select("id,name")
      .order("name", { ascending: true });

    if (!isSuperAdmin()) {
      if (!currentProfile.institution_id) {
        throw new Error("Your profile has no institution assigned.");
      }
      query = query.eq("id", currentProfile.institution_id);
    }

    const { data, error } = await withTimeout(query);
    if (error) throw error;

    institutions = data || [];
    renderInstitutionSelect();
  }

  function renderInstitutionSelect() {
    const select = $("institutionSelect");
    if (!select) return;

    select.innerHTML = "";

    if (!institutions.length) {
      select.innerHTML = `<option value="">No institution available</option>`;
      return;
    }

    institutions.forEach((institution) => {
      const option = document.createElement("option");
      option.value = institution.id;
      option.textContent = institution.name;
      select.appendChild(option);
    });

    if (!isSuperAdmin() && currentProfile.institution_id) {
      select.value = currentProfile.institution_id;
      select.disabled = true;
    } else {
      select.disabled = false;
      if (institutions.length === 1) select.value = institutions[0].id;
    }
  }


  /* ------------------------------------------------------------
     LOAD STUDENTS
  ------------------------------------------------------------ */

  async function loadStudents() {
    const tbody = $("studentsTableBody");

    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty">Loading students...</td></tr>`;
    }

    try {
      let query = supabaseClient
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
          created_at,
          updated_at
        `)
        .order("created_at", { ascending: false });

      if (!isSuperAdmin()) {
        if (!currentProfile.institution_id) {
          throw new Error("No institution is assigned to your profile.");
        }
        query = query.eq("institution_id", currentProfile.institution_id);
      }

      const { data, error } = await withTimeout(query);
      if (error) throw error;

      students = data || [];
      updateStats();
      renderStudents();
    } catch (error) {
      console.error("loadStudents error:", error);
      students = [];
      updateStats();

      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="empty">
              <strong>Students loading failed.</strong><br>
              ${escapeHtml(getErrorMessage(error))}
            </td>
          </tr>
        `;
      }

      showMessage(`Students loading failed: ${getErrorMessage(error)}`, "error");
    }
  }

  function updateStats() {
    const total = students.length;
    const active = students.filter((s) => s.status === "active").length;
    const graduated = students.filter((s) => s.status === "graduated").length;
    const other = total - active - graduated;

    if ($("totalStudents")) $("totalStudents").textContent = total;
    if ($("activeStudents")) $("activeStudents").textContent = active;
    if ($("graduatedStudents")) $("graduatedStudents").textContent = graduated;
    if ($("otherStudents")) $("otherStudents").textContent = other;
  }


  /* ------------------------------------------------------------
     FILTER + RENDER
  ------------------------------------------------------------ */

  function getFilteredStudents() {
    const search = ($("searchInput")?.value || "").trim().toLowerCase();
    const status = $("statusFilter")?.value || "";

    return students.filter((student) => {
      const searchable = [
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

      return (!search || searchable.includes(search)) &&
             (!status || student.status === status);
    });
  }

  function renderStudents() {
    const tbody = $("studentsTableBody");
    if (!tbody) return;

    const filtered = getFilteredStudents();

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty">No students found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((student) => {
      const photo = student.photo_url
        ? `<img class="student-photo" src="${escapeHtml(student.photo_url)}"
                alt="${escapeHtml(student.full_name)}" loading="lazy"
                onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'initials',title:'Photo link does not open',textContent:'!'}))">`
        : `<div class="initials">${escapeHtml(getInitials(student.full_name))}</div>`;

      return `
        <tr>
          <td>${photo}</td>
          <td><strong>${escapeHtml(student.student_id || "—")}</strong></td>
          <td>${escapeHtml(student.full_name || "—")}</td>
          <td>${escapeHtml(student.gender || "—")}</td>
          <td>${escapeHtml(student.phone || "—")}</td>
          <td>${escapeHtml(student.email || "—")}</td>
          <td>${statusHtml(student.status)}</td>
          <td>${formatDate(student.admission_date)}</td>
          <td>
            <div class="actions">
              <button type="button" class="btn-small action-view"
                data-action="view" data-id="${escapeHtml(student.id)}">View</button>
              <button type="button" class="btn-small action-edit"
                data-action="edit" data-id="${escapeHtml(student.id)}">Edit</button>
              <button type="button" class="btn-small action-delete"
                data-action="delete" data-id="${escapeHtml(student.id)}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }


  /* ------------------------------------------------------------
     FORM DATA + VALIDATION
  ------------------------------------------------------------ */

  function getFormData() {
    return {
      institution_id: $("institutionSelect")?.value || null,
      student_id: $("studentId")?.value.trim() || null,
      full_name: $("fullName")?.value.trim() || null,
      gender: $("gender")?.value || null,
      date_of_birth: $("dateOfBirth")?.value || null,
      phone: $("phone")?.value.trim() || null,
      email: $("email")?.value.trim() || null,
      address: $("address")?.value.trim() || null,
      admission_date: $("admissionDate")?.value || null,
      status: $("status")?.value || "active"
    };
  }

  function validateForm(data) {
    if (!data.institution_id) throw new Error("Please select an institution.");
    if (!data.student_id) throw new Error("Student ID is required.");
    if (!data.full_name) throw new Error("Student full name is required.");
    if (!data.status) throw new Error("Student status is required.");

    if (!isSuperAdmin() && data.institution_id !== currentProfile.institution_id) {
      throw new Error("You can only manage students in your institution.");
    }
  }


  /* ------------------------------------------------------------
     PHOTO: VALIDATE, NORMALISE, PREVIEW
  ------------------------------------------------------------ */

  function validatePhoto(file) {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Photo must be JPG, PNG, or WEBP.");
    }
    if (file.size > PHOTO_RAW_MAX) {
      throw new Error("Photo size must not exceed 10MB.");
    }
  }

  function readImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("This photo could not be read. Try another picture."));
      };
      img.src = url;
    });
  }

  /* Square crop (face stays near the top), EXIF rotation applied by the
     browser while drawing, exported as JPEG. */
  async function normalizePhoto(file) {
    const img = await readImage(file);

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new Error("This photo has no readable size.");

    const side = Math.min(w, h);
    const sx = w > h ? (w - side) / 2 : 0;
    const sy = h > w ? (h - side) * PHOTO_FACE_BIAS : 0;
    const out = Math.min(PHOTO_OUTPUT, side);

    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out, out);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", PHOTO_QUALITY)
    );

    if (!blob) throw new Error("The photo could not be processed.");
    return blob;
  }

  function showPhotoPreview(src) {
    const preview = $("photoPreview");
    const placeholder = $("photoPlaceholder");
    if (!preview || !placeholder) return;

    if (src) {
      preview.src = src;
      preview.style.display = "block";
      placeholder.style.display = "none";
    } else {
      preview.style.display = "none";
      preview.removeAttribute("src");
      placeholder.style.display = "block";
    }
  }

  function clearPendingPhoto() {
    if (pendingPhoto?.previewUrl) URL.revokeObjectURL(pendingPhoto.previewUrl);
    pendingPhoto = null;
    photoTask = null;
  }

  function handlePhotoPreview() {
    const input = $("photoInput");
    if (!input) return;

    clearPendingPhoto();

    const file = input.files?.[0];

    if (!file) {
      showPhotoPreview(editingStudent?.photo_url || null);
      return;
    }

    photoTask = (async () => {
      try {
        validatePhoto(file);
        const blob = await normalizePhoto(file);
        const previewUrl = URL.createObjectURL(blob);
        pendingPhoto = { blob, previewUrl };
        showPhotoPreview(previewUrl);
      } catch (error) {
        input.value = "";
        pendingPhoto = null;
        showPhotoPreview(editingStudent?.photo_url || null);
        showMessage(getErrorMessage(error), "error");
      }
    })();
  }


  /* ------------------------------------------------------------
     PROGRESS
  ------------------------------------------------------------ */

  function setProgress(percent, text) {
    const wrap = $("progressWrap");
    const bar = $("progressBar");
    const label = $("progressText");

    if (wrap) wrap.style.display = "block";
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    if (label) label.textContent = text || `${percent}%`;
  }

  function hideProgress() {
    const wrap = $("progressWrap");
    const bar = $("progressBar");
    const label = $("progressText");

    if (wrap) wrap.style.display = "none";
    if (bar) bar.style.width = "0%";
    if (label) label.textContent = "";
  }


  /* ------------------------------------------------------------
     UPLOAD PHOTO (with link verification)
  ------------------------------------------------------------ */

  /* True only when the link really returns an image. */
  async function photoLinkWorks(url) {
    try {
      const response = await fetch(url, { method: "GET", cache: "no-store" });
      if (!response.ok) return false;
      const type = response.headers.get("content-type") || "";
      return type.startsWith("image/");
    } catch {
      return false;
    }
  }

  /* Returns { url, signed }. */
  async function uploadStudentPhoto(studentDbId, file) {
    if (!file) return null;

    const filePath = `students/${studentDbId}/${Date.now()}-${createUUID()}.jpg`;

    setProgress(15, "Uploading student photo...");

    const { error } = await supabaseClient.storage
      .from(PHOTO_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg"
      });

    if (error) throw error;

    setProgress(60, "Creating photo URL...");

    const { data } = supabaseClient.storage.from(PHOTO_BUCKET).getPublicUrl(filePath);

    if (!data || !data.publicUrl) {
      throw new Error("Photo uploaded but public URL could not be created.");
    }

    setProgress(75, "Checking that the photo opens...");

    if (await photoLinkWorks(data.publicUrl)) {
      setProgress(100, "Photo uploaded successfully.");
      return { url: data.publicUrl, signed: false };
    }

    /* Public link does not open: the bucket is private. Use a signed link
       so the certificate and the students list can still show the photo. */
    const signedResult = await supabaseClient.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(filePath, SIGNED_URL_SECONDS);

    const signedUrl = signedResult?.data?.signedUrl;

    if (signedUrl && (await photoLinkWorks(signedUrl))) {
      setProgress(100, "Photo uploaded successfully.");
      return { url: signedUrl, signed: true };
    }

    throw new Error(
      "Photo was uploaded but its link does not open. " +
      `Make the "${PHOTO_BUCKET}" storage bucket public, or allow authenticated users to read it.`
    );
  }

  async function savePhotoForStudent(studentDbId, photoFile, extraFields = {}) {
    const uploaded = await uploadStudentPhoto(studentDbId, photoFile);
    if (!uploaded) return { photoError: null, photoNotice: null };

    const { error } = await withTimeout(
      supabaseClient
        .from("students")
        .update({ photo_url: uploaded.url, ...extraFields })
        .eq("id", studentDbId)
    );

    if (error) throw error;

    return {
      photoError: null,
      photoNotice: uploaded.signed
        ? "The storage bucket is private, so a private photo link was saved. Making the bucket public is recommended."
        : null
    };
  }


  /* ------------------------------------------------------------
     CREATE / UPDATE STUDENT
  ------------------------------------------------------------ */

  async function createStudent(data, photoFile) {
    const studentDbId = createUUID();

    const insertData = {
      id: studentDbId,
      institution_id: data.institution_id,
      student_id: data.student_id,
      full_name: data.full_name,
      gender: data.gender,
      date_of_birth: data.date_of_birth,
      phone: data.phone,
      email: data.email,
      address: data.address,
      admission_date: data.admission_date,
      status: data.status
    };

    const { error } = await withTimeout(
      supabaseClient.from("students").insert(insertData)
    );

    if (error) throw error;

    let result = { photoError: null, photoNotice: null };

    if (photoFile) {
      try {
        result = await savePhotoForStudent(studentDbId, photoFile);
      } catch (photoErr) {
        console.error("Photo upload error:", photoErr);
        result = { photoError: getErrorMessage(photoErr), photoNotice: null };
      }
    }

    return { studentDbId, ...result };
  }

  async function updateStudent(studentDbId, data, photoFile) {
    const { error } = await withTimeout(
      supabaseClient
        .from("students")
        .update({
          institution_id: data.institution_id,
          student_id: data.student_id,
          full_name: data.full_name,
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          phone: data.phone,
          email: data.email,
          address: data.address,
          admission_date: data.admission_date,
          status: data.status,
          updated_at: new Date().toISOString()
        })
        .eq("id", studentDbId)
    );

    if (error) throw error;

    let result = { photoError: null, photoNotice: null };

    if (photoFile) {
      try {
        result = await savePhotoForStudent(studentDbId, photoFile, {
          updated_at: new Date().toISOString()
        });
      } catch (photoErr) {
        console.error("Photo upload error:", photoErr);
        result = { photoError: getErrorMessage(photoErr), photoNotice: null };
      }
    }

    return result;
  }


  /* ------------------------------------------------------------
     SUBMIT
  ------------------------------------------------------------ */

  async function handleStudentSubmit(event) {
    event.preventDefault();

    if (isSaving) return;

    if (!canAccessStudentsModule()) {
      showMessage("You do not have permission to manage students.", "error");
      return;
    }

    clearMessage();

    try {
      const data = getFormData();
      validateForm(data);

      // Wait until a freshly chosen photo has been prepared.
      if (photoTask) await photoTask;

      const chosen = $("photoInput")?.files?.[0] || null;
      const photoFile = pendingPhoto ? pendingPhoto.blob : null;

      if (chosen && !photoFile) {
        throw new Error("The selected photo could not be prepared. Choose it again.");
      }

      isSaving = true;

      const saveButton = $("saveButton");
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = editingStudent ? "Updating..." : "Saving...";
      }

      const wasEditing = !!editingStudent;
      const result = wasEditing
        ? await updateStudent(editingStudent.id, data, photoFile)
        : await createStudent(data, photoFile);

      if (result && result.photoError) {
        showMessage(
          wasEditing
            ? `STUDENT DATA UPDATED. But the new photo was not saved: ${result.photoError}`
            : `STUDENT SAVED SUCCESSFULLY. But the photo was not saved: ${result.photoError}`,
          "warning"
        );
      } else if (result && result.photoNotice) {
        showMessage(
          `${wasEditing ? "STUDENT DATA UPDATED" : "STUDENT SAVED"} SUCCESSFULLY. ${result.photoNotice}`,
          "warning"
        );
      } else {
        showMessage(
          wasEditing
            ? "STUDENT DATA UPDATED SUCCESSFULLY."
            : "STUDENT SAVED SUCCESSFULLY.",
          "success"
        );
      }

      await loadStudents();
      resetStudentForm();
    } catch (error) {
      console.error("Student save error:", error);
      showMessage(`Student save failed: ${getErrorMessage(error)}`, "error");
    } finally {
      isSaving = false;
      hideProgress();

      const saveButton = $("saveButton");
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = editingStudent ? "Update Student" : "Save Student";
      }
    }
  }


  /* ------------------------------------------------------------
     RESET FORM
  ------------------------------------------------------------ */

  function resetStudentForm() {
    const form = $("studentForm");
    if (form) form.reset();

    clearPendingPhoto();
    editingStudent = null;

    if ($("editStudentDbId")) $("editStudentDbId").value = "";
    if ($("formTitle")) $("formTitle").textContent = "Add Student";
    if ($("saveButton")) $("saveButton").textContent = "Save Student";
    if ($("photoInput")) $("photoInput").value = "";
    if ($("status")) $("status").value = "active";

    showPhotoPreview(null);
    renderInstitutionSelect();
    hideProgress();
  }


  /* ------------------------------------------------------------
     EDIT
  ------------------------------------------------------------ */

  function editStudent(id) {
    const student = students.find((s) => String(s.id) === String(id));

    if (!student) {
      showMessage("Student record not found.", "error");
      return;
    }

    if (!isSuperAdmin() && student.institution_id !== currentProfile.institution_id) {
      showMessage("You cannot edit this student.", "error");
      return;
    }

    clearPendingPhoto();
    if ($("photoInput")) $("photoInput").value = "";

    editingStudent = student;

    if ($("editStudentDbId")) $("editStudentDbId").value = student.id;
    if ($("formTitle")) $("formTitle").textContent = "Edit Student";
    if ($("saveButton")) $("saveButton").textContent = "Update Student";

    if ($("institutionSelect")) $("institutionSelect").value = student.institution_id || "";
    if ($("studentId")) $("studentId").value = student.student_id || "";
    if ($("fullName")) $("fullName").value = student.full_name || "";
    if ($("gender")) $("gender").value = student.gender || "";
    if ($("dateOfBirth")) $("dateOfBirth").value = student.date_of_birth || "";
    if ($("phone")) $("phone").value = student.phone || "";
    if ($("email")) $("email").value = student.email || "";
    if ($("address")) $("address").value = student.address || "";
    if ($("admissionDate")) $("admissionDate").value = student.admission_date || "";
    if ($("status")) $("status").value = student.status || "active";

    showPhotoPreview(student.photo_url || null);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }


  /* ------------------------------------------------------------
     VIEW PROFILE
  ------------------------------------------------------------ */

  function viewStudent(id) {
    const student = students.find((s) => String(s.id) === String(id));

    if (!student) {
      showMessage("Student record not found.", "error");
      return;
    }

    const modal = $("profileModal");
    const content = $("profileContent");
    if (!modal || !content) return;

    const photo = student.photo_url
      ? `<img class="profile-photo" src="${escapeHtml(student.photo_url)}"
              alt="${escapeHtml(student.full_name)}">`
      : `<div class="profile-photo initials">${escapeHtml(getInitials(student.full_name))}</div>`;

    content.innerHTML = `
      <div class="profile-top">
        ${photo}
        <div>
          <div class="profile-name">${escapeHtml(student.full_name || "—")}</div>
          <div class="profile-id">${escapeHtml(student.student_id || "—")}</div>
          <div style="margin-top:8px;">${statusHtml(student.status)}</div>
        </div>
      </div>

      <div class="profile-grid">
        <div class="profile-item"><strong>Gender</strong>
          <span>${escapeHtml(student.gender || "—")}</span></div>
        <div class="profile-item"><strong>Date of Birth</strong>
          <span>${formatDate(student.date_of_birth)}</span></div>
        <div class="profile-item"><strong>Phone</strong>
          <span>${escapeHtml(student.phone || "—")}</span></div>
        <div class="profile-item"><strong>Email</strong>
          <span>${escapeHtml(student.email || "—")}</span></div>
        <div class="profile-item"><strong>Admission Date</strong>
          <span>${formatDate(student.admission_date)}</span></div>
        <div class="profile-item"><strong>Address</strong>
          <span>${escapeHtml(student.address || "—")}</span></div>
        <div class="profile-item"><strong>Emergency Contact</strong>
          <span>${escapeHtml(student.emergency_contact_name || "—")}</span></div>
        <div class="profile-item"><strong>Emergency Phone</strong>
          <span>${escapeHtml(student.emergency_contact_phone || "—")}</span></div>
      </div>
    `;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeProfileModal() {
    const modal = $("profileModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }


  /* ------------------------------------------------------------
     DELETE
  ------------------------------------------------------------ */

  async function deleteStudent(id) {
    if (!canAccessStudentsModule()) {
      showMessage("You do not have permission to delete students.", "error");
      return;
    }

    const student = students.find((s) => String(s.id) === String(id));

    if (!student) {
      showMessage("Student record not found.", "error");
      return;
    }

    if (!isSuperAdmin() && student.institution_id !== currentProfile.institution_id) {
      showMessage("You cannot delete this student.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Delete student "${student.full_name}" (${student.student_id})?`
    );
    if (!confirmed) return;

    try {
      showMessage("Deleting student...", "warning");

      const { error } = await withTimeout(
        supabaseClient.from("students").delete().eq("id", id)
      );

      if (error) throw error;

      showMessage("STUDENT DELETED SUCCESSFULLY.", "success");
      await loadStudents();
    } catch (error) {
      console.error("Delete student error:", error);
      showMessage(`Student delete failed: ${getErrorMessage(error)}`, "error");
    }
  }


  /* ------------------------------------------------------------
     TABLE CLICK + EVENTS
  ------------------------------------------------------------ */

  function handleTableClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;
    if (!id) return;

    if (action === "view") viewStudent(id);
    else if (action === "edit") editStudent(id);
    else if (action === "delete") deleteStudent(id);
  }

  function setupEventListeners() {
    $("studentForm")?.addEventListener("submit", handleStudentSubmit);
    $("photoInput")?.addEventListener("change", handlePhotoPreview);
    $("searchInput")?.addEventListener("input", renderStudents);
    $("statusFilter")?.addEventListener("change", renderStudents);
    $("resetFormButton")?.addEventListener("click", resetStudentForm);

    $("addStudentButton")?.addEventListener("click", () => {
      resetStudentForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    $("refreshStudentsButton")?.addEventListener("click", async () => {
      clearMessage();
      await loadStudents();
    });

    $("studentsTableBody")?.addEventListener("click", handleTableClick);
    $("closeProfileModal")?.addEventListener("click", closeProfileModal);

    const modal = $("profileModal");
    if (modal) {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeProfileModal();
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeProfileModal();
    });
  }


  /* ------------------------------------------------------------
     REQUIRED DOM CHECK + INIT
  ------------------------------------------------------------ */

  function checkRequiredElements() {
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

    const missing = required.filter((id) => !$(id));

    if (missing.length) {
      throw new Error(
        `Students page is missing required HTML elements: ${missing.join(", ")}`
      );
    }
  }

  async function initStudentsPage() {
    if (initialized) return;
    initialized = true;

    try {
      checkRequiredElements();
      clearMessage();

      await checkSupabaseConnection();
      await loadCurrentUser();
      await loadCurrentProfile();

      if (!canAccessStudentsModule()) {
        throw new Error(
          `Role "${currentProfile.role}" does not have access to the Students module.`
        );
      }

      setupEventListeners();
      await loadInstitutions();
      await loadStudents();
      resetStudentForm();
      clearMessage();
    } catch (error) {
      console.error("Students module initialization error:", error);

      const tbody = $("studentsTableBody");
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="empty">
              <strong>Students module failed to load.</strong><br>
              ${escapeHtml(getErrorMessage(error))}
            </td>
          </tr>
        `;
      }

      showMessage(`Students module error: ${getErrorMessage(error)}`, "error");
    }
  }


  /* ------------------------------------------------------------
     GLOBAL FUNCTIONS + BOOT
  ------------------------------------------------------------ */

  window.viewStudent = viewStudent;
  window.editStudent = editStudent;
  window.deleteStudent = deleteStudent;
  window.closeProfileModal = closeProfileModal;
  window.resetStudentForm = resetStudentForm;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStudentsPage, { once: true });
  } else {
    initStudentsPage();
  }
})();
