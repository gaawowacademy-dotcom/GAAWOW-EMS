
/* =========================================================
   GAAWOW EMS — TEACHER MANAGEMENT
   VERSION: 10.1
   Compatible with: teacher.html V10.0

   Roles:
   - super_admin
   - school_admin

   Database:
   - teachers
   - profiles
   - institutions

   Edge Functions:
   - create-teacher-account
   - set-teacher-status
   ========================================================= */

window.__teacherJsLoaded = true;

(() => {
    "use strict";

    /* =====================================================
       1. SUPABASE CONFIGURATION
       ===================================================== */

    const SUPABASE_URL =
        "https://mytyvqwrxnxpxnxpiicj.supabase.co";

    const SUPABASE_KEY =
        "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

    const CREATE_FUNCTION = "create-teacher-account";
    const STATUS_FUNCTION = "set-teacher-status";
    const PHOTO_BUCKET = "teacher-photos";

    const DEFAULT_LOGO =
        "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";

    if (!window.supabase?.createClient) {
        console.error("Supabase library is not loaded.");
        return;
    }

    const { createClient } = window.supabase;

    const db = createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    /* =====================================================
       2. GLOBAL STATE
       ===================================================== */

    let currentUser = null;
    let currentProfile = null;
    let teachers = [];
    let institutions = [];
    let selectedPhoto = null;
    let previewObjectUrl = null;

    /* =====================================================
       3. HELPER FUNCTIONS
       ===================================================== */

    const $ = id => document.getElementById(id);

    function escapeHTML(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[character]
        );
    }

    function showMessage(message, type = "info") {
        const box = $("messageBox");

        if (!box) {
            console.error(message);
            return;
        }

        box.className = type;
        box.textContent = message;
        box.style.display = "block";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function clearMessage() {
        const box = $("messageBox");

        if (!box) return;

        box.style.display = "none";
        box.textContent = "";
        box.className = "";
    }

    function setSaving(state) {
        const button = $("saveBtn");

        if (!button) return;

        button.disabled = state;
        button.textContent = state
            ? "Please wait..."
            : "Save Teacher";
    }

    function getInstitutionName(institutionId) {
        const institution = institutions.find(
            item => item.id === institutionId
        );

        return institution
            ? institution.name
            : "Unknown Institution";
    }

    function isTeacherActive(teacher) {
        return (
            teacher.profile?.is_active === true &&
            String(teacher.status || "").toLowerCase() === "active"
        );
    }

    function releasePhotoPreview() {
        if (previewObjectUrl) {
            URL.revokeObjectURL(previewObjectUrl);
            previewObjectUrl = null;
        }
    }

    function getSessionToken() {
        return db.auth.getSession();
    }

    /* =====================================================
       4. AUTHENTICATION AND ROLE ACCESS
       ===================================================== */

    async function checkAccess() {
        const {
            data: { user },
            error
        } = await db.auth.getUser();

        if (error || !user) {
            throw new Error(
                "Please sign in first. Your login session may have expired."
            );
        }

        currentUser = user;

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

        if (profileError || !profile) {
            throw new Error(
                "Unable to load your user profile."
            );
        }

        if (!profile.is_active) {
            throw new Error("Your account is inactive.");
        }

        if (
            !["super_admin", "school_admin"].includes(profile.role)
        ) {
            throw new Error(
                "Access denied. Only Super Admin or School Admin can manage teachers."
            );
        }

        if (
            profile.role === "school_admin" &&
            !profile.institution_id
        ) {
            throw new Error(
                "Your School Admin account has no institution assigned."
            );
        }

        currentProfile = profile;

        updatePageForRole();
    }

    /* =====================================================
       5. ROLE-BASED PAGE CONFIGURATION
       ===================================================== */

    function updatePageForRole() {
        const banner = $("roleBanner");
        const superAdminLink = $("superAdminLink");
        const institutionFilter = $("institutionFilter");

        if (currentProfile.role === "school_admin") {
            if (superAdminLink) {
                superAdminLink.style.display = "none";
            }

            if (institutionFilter) {
                institutionFilter.disabled = true;
            }

            if (banner) {
                banner.style.display = "block";
                banner.textContent =
                    "School Admin access: You can manage teachers belonging to your assigned institution only.";
            }
        } else {
            if (superAdminLink) {
                superAdminLink.style.display = "inline-block";
            }

            if (institutionFilter) {
                institutionFilter.disabled = false;
            }

            if (banner) {
                banner.style.display = "none";
            }
        }
    }

    /* =====================================================
       6. LOAD INSTITUTIONS
       IMPORTANT: institutions table uses "name".
       It does NOT have "institution_name".
       ===================================================== */

    async function loadInstitutions() {
        let query = db
            .from("institutions")
            .select(`
                id,
                name,
                code,
                is_active,
                created_at
            `)
            .order("created_at", {
                ascending: true
            });

        if (currentProfile.role === "school_admin") {
            query = query.eq(
                "id",
                currentProfile.institution_id
            );
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        institutions = (data || []).map(item => ({
            ...item,
            name: item.name || item.code || "Institution"
        }));

        const options = institutions.map(item => `
            <option value="${escapeHTML(item.id)}">
                ${escapeHTML(item.name)}
            </option>
        `).join("");

        $("institutionId").innerHTML = `
            <option value="">Select Institution</option>
            ${options}
        `;

        if (currentProfile.role === "super_admin") {
            $("institutionFilter").innerHTML = `
                <option value="">All Institutions</option>
                ${options}
            `;
        } else {
            $("institutionFilter").innerHTML = options;

            $("institutionFilter").value =
                currentProfile.institution_id;

            $("institutionFilter").disabled = true;

            $("institutionId").value =
                currentProfile.institution_id;

            $("institutionId").disabled = true;
        }
    }

    /* =====================================================
       7. LOAD TEACHERS AND PROFILES
       ===================================================== */

    async function loadTeachers() {
        const tableBody = $("teachersTableBody");

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading">
                    Loading teachers...
                </td>
            </tr>
        `;

        let teacherQuery = db
            .from("teachers")
            .select(`
                id,
                institution_id,
                profile_id,
                teacher_id,
                full_name,
                email,
                phone,
                gender,
                qualification,
                specialization,
                employment_date,
                status,
                created_at,
                updated_at
            `)
            .order("created_at", {
                ascending: false
            });

        let profileQuery = db
            .from("profiles")
            .select(`
                id,
                institution_id,
                full_name,
                email,
                phone,
                avatar_url,
                role,
                is_active
            `)
            .eq("role", "teacher");

        if (currentProfile.role === "school_admin") {
            teacherQuery = teacherQuery.eq(
                "institution_id",
                currentProfile.institution_id
            );

            profileQuery = profileQuery.eq(
                "institution_id",
                currentProfile.institution_id
            );
        }

        const [
            teacherResult,
            profileResult
        ] = await Promise.all([
            teacherQuery,
            profileQuery
        ]);

        if (teacherResult.error) {
            throw teacherResult.error;
        }

        if (profileResult.error) {
            throw profileResult.error;
        }

        const profileMap = new Map(
            (profileResult.data || []).map(profile => [
                profile.id,
                profile
            ])
        );

        teachers = (teacherResult.data || []).map(teacher => ({
            ...teacher,
            profile: profileMap.get(teacher.profile_id) || null
        }));

        renderTeachers();
    }

    /* =====================================================
       8. RENDER TEACHER TABLE
       ===================================================== */

    function renderTeachers() {
        const searchTerm =
            $("searchInput").value.trim().toLowerCase();

        const institutionFilter =
            $("institutionFilter").value;

        const statusFilter =
            $("statusFilter").value;

        const filteredTeachers = teachers.filter(teacher => {
            const searchableText = [
                teacher.full_name,
                teacher.teacher_id,
                teacher.email,
                teacher.phone,
                teacher.id,
                teacher.profile?.email
            ].join(" ").toLowerCase();

            const matchesSearch =
                !searchTerm ||
                searchableText.includes(searchTerm);

            const matchesInstitution =
                !institutionFilter ||
                teacher.institution_id === institutionFilter;

            const active = isTeacherActive(teacher);

            let matchesStatus = true;

            if (statusFilter === "active") {
                matchesStatus = active;
            } else if (statusFilter === "inactive") {
                matchesStatus =
                    !!teacher.profile && !active;
            } else if (statusFilter === "missing") {
                matchesStatus = !teacher.profile;
            }

            return (
                matchesSearch &&
                matchesInstitution &&
                matchesStatus
            );
        });

        $("teacherCount").textContent =
            `${filteredTeachers.length} teacher(s)`;

        if (!filteredTeachers.length) {
            $("teachersTableBody").innerHTML = `
                <tr>
                    <td colspan="7" class="empty">
                        No teacher records found.
                    </td>
                </tr>
            `;
            return;
        }

        $("teachersTableBody").innerHTML =
            filteredTeachers.map((teacher, index) => {
                const active = isTeacherActive(teacher);

                const status = !teacher.profile
                    ? "Profile Missing"
                    : active
                        ? "Active"
                        : "Inactive";

                const badgeClass = !teacher.profile
                    ? "missing"
                    : active
                        ? "active"
                        : "inactive";

                const avatar = teacher.profile?.avatar_url;

                const avatarHTML = avatar
                    ? `
                        <img
                            class="avatar"
                            src="${escapeHTML(avatar)}"
                            alt="Teacher photo"
                        >
                    `
                    : `
                        <span class="avatar">
                            ${escapeHTML(
                                (teacher.full_name || "?")
                                    .trim()
                                    .charAt(0)
                                    .toUpperCase()
                            )}
                        </span>
                    `;

                return `
                    <tr>
                        <td>${index + 1}</td>

                        <td>
                            <div class="person">
                                ${avatarHTML}
                                <div>
                                    <strong>
                                        ${escapeHTML(teacher.full_name)}
                                    </strong>
                                    <small>
                                        ${escapeHTML(teacher.teacher_id)}
                                        ·
                                        ${escapeHTML(
                                            teacher.profile?.email ||
                                            teacher.email ||
                                            "No account email"
                                        )}
                                    </small>
                                </div>
                            </div>
                        </td>

                        <td>
                            ${escapeHTML(teacher.phone || "")}
                        </td>

                        <td>
                            ${escapeHTML(
                                getInstitutionName(teacher.institution_id)
                            )}
                        </td>

                        <td>
                            ${escapeHTML(teacher.qualification || "")}
                        </td>

                        <td>
                            <span class="badge ${badgeClass}">
                                ${status}
                            </span>
                        </td>

                        <td>
                            <button
                                class="btn btn-small btn-light"
                                data-action="view"
                                data-id="${escapeHTML(teacher.id)}"
                            >View</button>

                            <button
                                class="btn btn-small btn-blue"
                                data-action="edit"
                                data-id="${escapeHTML(teacher.id)}"
                            >Edit</button>

                            ${teacher.profile ? `
                                <button
                                    class="btn btn-small ${active ? "btn-danger" : "btn-gold"}"
                                    data-action="toggle"
                                    data-id="${escapeHTML(teacher.id)}"
                                    data-active="${active}"
                                >
                                    ${active ? "Deactivate" : "Activate"}
                                </button>
                            ` : ""}
                        </td>
                    </tr>
                `;
            }).join("");
    }

    /* =====================================================
       9. OPEN CREATE TEACHER MODAL
       ===================================================== */

    function openCreateTeacher() {
        clearMessage();
        releasePhotoPreview();

        selectedPhoto = null;

        $("teacherForm").reset();
        $("editId").value = "";

        $("modalTitle").textContent = "Add Teacher";

        $("password").required = true;
        $("password").disabled = false;

        $("email").disabled = false;
        $("teacherId").disabled = false;

        $("passwordHint").textContent =
            "(minimum 12 characters)";

        if (currentProfile.role === "school_admin") {
            $("institutionId").value =
                currentProfile.institution_id;

            $("institutionId").disabled = true;
        } else {
            $("institutionId").disabled = false;
        }

        $("photoPreview").src = DEFAULT_LOGO;
        $("photoStatus").textContent = "";

        $("teacherModal").classList.add("show");
    }

    /* =====================================================
       10. CLOSE MODAL
       ===================================================== */

    function closeTeacherModal() {
        $("teacherModal").classList.remove("show");

        releasePhotoPreview();
        selectedPhoto = null;
    }

    /* =====================================================
       11. FIND TEACHER
       ===================================================== */

    function findTeacher(recordId) {
        return teachers.find(
            teacher => teacher.id === recordId
        );
    }

    /* =====================================================
       12. OPEN EDIT TEACHER
       ===================================================== */

    function editTeacher(recordId) {
        const teacher = findTeacher(recordId);

        if (!teacher) {
            showMessage("Teacher record not found.", "error");
            return;
        }

        if (!teacher.profile) {
            showMessage(
                "This teacher has no matching login profile. Please investigate before editing.",
                "error"
            );
            return;
        }

        releasePhotoPreview();
        selectedPhoto = null;

        $("teacherForm").reset();
        $("editId").value = teacher.id;

        $("modalTitle").textContent = "Edit Teacher";

        $("fullName").value = teacher.full_name || "";

        $("email").value =
            teacher.profile.email ||
            teacher.email ||
            "";

        $("teacherId").value = teacher.teacher_id || "";
        $("phone").value = teacher.phone || "";
        $("gender").value = teacher.gender || "";
        $("qualification").value = teacher.qualification || "";
        $("specialization").value = teacher.specialization || "";
        $("employmentDate").value = teacher.employment_date || "";

        $("institutionId").value = teacher.institution_id;

        $("email").disabled = true;
        $("teacherId").disabled = true;
        $("password").disabled = true;
        $("password").required = false;

        $("passwordHint").textContent =
            "(not editable here)";

        $("institutionId").disabled = true;

        $("photoPreview").src =
            teacher.profile.avatar_url || DEFAULT_LOGO;

        $("photoStatus").textContent =
            "Choose a file only if you want to replace the current photo.";

        $("teacherModal").classList.add("show");
    }

    /* =====================================================
       13. VIEW TEACHER
       ===================================================== */

    function viewTeacher(recordId) {
        const teacher = findTeacher(recordId);

        if (!teacher) {
            showMessage("Teacher record not found.", "error");
            return;
        }

        const profile = teacher.profile || {};

        $("viewContent").innerHTML = `
            <div class="grid">
                <div>
                    <b>Full Name</b>
                    <p>${escapeHTML(teacher.full_name)}</p>
                </div>

                <div>
                    <b>Teacher ID</b>
                    <p>${escapeHTML(teacher.teacher_id)}</p>
                </div>

                <div>
                    <b>Email</b>
                    <p>${escapeHTML(
                        profile.email ||
                        teacher.email ||
                        "Not available"
                    )}</p>
                </div>

                <div>
                    <b>Phone</b>
                    <p>${escapeHTML(
                        teacher.phone || "Not available"
                    )}</p>
                </div>

                <div>
                    <b>Institution</b>
                    <p>${escapeHTML(
                        getInstitutionName(teacher.institution_id)
                    )}</p>
                </div>

                <div>
                    <b>Gender</b>
                    <p>${escapeHTML(
                        teacher.gender || "Not specified"
                    )}</p>
                </div>

                <div>
                    <b>Qualification</b>
                    <p>${escapeHTML(
                        teacher.qualification || "Not specified"
                    )}</p>
                </div>

                <div>
                    <b>Specialization</b>
                    <p>${escapeHTML(
                        teacher.specialization || "Not specified"
                    )}</p>
                </div>

                <div>
                    <b>Employment Date</b>
                    <p>${escapeHTML(
                        teacher.employment_date || "Not specified"
                    )}</p>
                </div>

                <div>
                    <b>Login Status</b>
                    <p>${
                        !teacher.profile
                            ? "Profile Missing"
                            : isTeacherActive(teacher)
                                ? "Active"
                                : "Inactive"
                    }</p>
                </div>
            </div>
        `;

        $("viewModal").classList.add("show");
    }

    /* =====================================================
       14. PHOTO UPLOAD
       Accepts an optional file so create flow can preserve
       the selected photo after closing the modal.
       ===================================================== */

    async function uploadTeacherPhoto(
        profileId,
        file = selectedPhoto
    ) {
        if (!file) {
            return null;
        }

        if (file.size > 2 * 1024 * 1024) {
            throw new Error(
                "Photo must be 2 MB or smaller."
            );
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            throw new Error(
                "Only JPG, PNG or WEBP photos are accepted."
            );
        }

        let extension = "jpg";

        if (file.type === "image/png") {
            extension = "png";
        } else if (file.type === "image/webp") {
            extension = "webp";
        }

        const filePath =
            `${profileId}/${Date.now()}.${extension}`;

        const { error } = await db.storage
            .from(PHOTO_BUCKET)
            .upload(
                filePath,
                file,
                {
                    upsert: false,
                    contentType: file.type
                }
            );

        if (error) {
            throw error;
        }

        const { data } = db.storage
            .from(PHOTO_BUCKET)
            .getPublicUrl(filePath);

        return data.publicUrl;
    }

    /* =====================================================
       15. CREATE / UPDATE TEACHER
       ===================================================== */

    async function saveTeacher(event) {
        event.preventDefault();

        clearMessage();
        setSaving(true);

        try {
            const recordId = $("editId").value;

            const commonData = {
                full_name: $("fullName").value.trim(),
                phone: $("phone").value.trim() || null,
                gender: $("gender").value || null,
                qualification:
                    $("qualification").value.trim() || null,
                specialization:
                    $("specialization").value.trim() || null,
                employment_date:
                    $("employmentDate").value || null
            };

            if (!commonData.full_name) {
                throw new Error(
                    "Enter the teacher's full name."
                );
            }

            /* =============================================
               UPDATE EXISTING TEACHER
               ============================================= */

            if (recordId) {
                const teacher = findTeacher(recordId);

                if (!teacher || !teacher.profile) {
                    throw new Error(
                        "Teacher or login profile not found."
                    );
                }

                const {
                    error: teacherUpdateError
                } = await db
                    .from("teachers")
                    .update(commonData)
                    .eq("id", teacher.id);

                if (teacherUpdateError) {
                    throw teacherUpdateError;
                }

                let photoUrl = null;
                let photoError = null;

                if (selectedPhoto) {
                    try {
                        photoUrl = await uploadTeacherPhoto(
                            teacher.profile_id
                        );
                    } catch (error) {
                        photoError = error;
                    }
                }

                const profileUpdate = {
                    full_name: commonData.full_name,
                    phone: commonData.phone
                };

                if (photoUrl) {
                    profileUpdate.avatar_url = photoUrl;
                }

                const {
                    error: profileUpdateError
                } = await db
                    .from("profiles")
                    .update(profileUpdate)
                    .eq("id", teacher.profile_id);

                if (profileUpdateError) {
                    throw profileUpdateError;
                }

                closeTeacherModal();
                await loadTeachers();

                if (photoError) {
                    showMessage(
                        "Teacher details saved, but photo upload failed: " +
                        photoError.message,
                        "error"
                    );
                } else {
                    showMessage(
                        "Teacher details updated successfully.",
                        "success"
                    );
                }

                return;
            }

            /* =============================================
               CREATE NEW TEACHER
               ============================================= */

            const email =
                $("email").value.trim().toLowerCase();

            const password =
                $("password").value;

            const institutionId =
                $("institutionId").value;

            const teacherId =
                $("teacherId").value.trim();

            if (!email) {
                throw new Error("Enter the teacher's email.");
            }

            if (password.length < 12) {
                throw new Error(
                    "Initial password must contain at least 12 characters."
                );
            }

            if (!institutionId) {
                throw new Error("Select an institution.");
            }

            if (!teacherId) {
                throw new Error("Enter the Teacher ID.");
            }

            if (
                currentProfile.role === "school_admin" &&
                institutionId !== currentProfile.institution_id
            ) {
                throw new Error(
                    "You can only create teachers in your own institution."
                );
            }

            const payload = {
                ...commonData,
                email,
                password,
                institution_id: institutionId,
                teacher_id: teacherId
            };

            const {
                data: { session }
            } = await getSessionToken();

            if (!session?.access_token) {
                throw new Error(
                    "Your login session expired. Sign in again."
                );
            }

            const response = await fetch(
                `${SUPABASE_URL}/functions/v1/${CREATE_FUNCTION}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization":
                            `Bearer ${session.access_token}`,
                        "apikey": SUPABASE_KEY
                    },
                    body: JSON.stringify(payload)
                }
            );

            const result =
                await response.json().catch(() => ({}));

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error ||
                    result.message ||
                    `Create teacher failed (${response.status}).`
                );
            }

            /*
             * IMPORTANT:
             * Save the selected file before closing the modal.
             * closeTeacherModal() clears selectedPhoto.
             */

            const photoForUpload = selectedPhoto;

            closeTeacherModal();

            await loadTeachers();

            if (
                photoForUpload &&
                result.teacher?.profile_id
            ) {
                try {
                    const photoUrl = await uploadTeacherPhoto(
                        result.teacher.profile_id,
                        photoForUpload
                    );

                    const {
                        error: photoSaveError
                    } = await db
                        .from("profiles")
                        .update({
                            avatar_url: photoUrl
                        })
                        .eq(
                            "id",
                            result.teacher.profile_id
                        );

                    if (photoSaveError) {
                        throw photoSaveError;
                    }

                    await loadTeachers();

                    showMessage(
                        "Teacher account created and photo uploaded successfully.",
                        "success"
                    );
                } catch (photoError) {
                    showMessage(
                        "Teacher account was created, but photo upload failed: " +
                        photoError.message,
                        "error"
                    );
                }
            } else {
                showMessage(
                    "Teacher account created successfully.",
                    "success"
                );
            }

        } catch (error) {
            console.error("Teacher save error:", error);

            showMessage(
                error.message ||
                "An unexpected error occurred.",
                "error"
            );
        } finally {
            setSaving(false);
        }
    }

    /* =====================================================
       16. ACTIVATE / DEACTIVATE TEACHER
       ===================================================== */

    async function toggleTeacherStatus(
        recordId,
        currentlyActive
    ) {
        const teacher = findTeacher(recordId);

        if (!teacher) {
            showMessage(
                "Teacher record not found.",
                "error"
            );
            return;
        }

        if (!teacher.profile) {
            showMessage(
                "Cannot change status: matching login profile is missing.",
                "error"
            );
            return;
        }

        const action =
            currentlyActive ? "deactivate" : "activate";

        const confirmation = confirm(
            `Are you sure you want to ${action} ${teacher.full_name}?\n\n` +
            (
                currentlyActive
                    ? "This will block the teacher's login."
                    : "This will restore the teacher's login."
            )
        );

        if (!confirmation) {
            return;
        }

        try {
            const {
                data: { session }
            } = await getSessionToken();

            if (!session?.access_token) {
                throw new Error(
                    "Your login session expired. Sign in again."
                );
            }

            const response = await fetch(
                `${SUPABASE_URL}/functions/v1/${STATUS_FUNCTION}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization":
                            `Bearer ${session.access_token}`,
                        "apikey": SUPABASE_KEY
                    },
                    body: JSON.stringify({
                        teacher_record_id: teacher.id,
                        is_active: !currentlyActive
                    })
                }
            );

            const result =
                await response.json().catch(() => ({}));

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    result.error ||
                    result.details ||
                    `Status update failed (${response.status}).`
                );
            }

            await loadTeachers();

            showMessage(
                result.message ||
                `Teacher ${action}d successfully.`,
                "success"
            );

        } catch (error) {
            console.error("Teacher status error:", error);

            showMessage(
                error.message ||
                "Unable to change teacher status.",
                "error"
            );
        }
    }

    /* =====================================================
       17. PHOTO PREVIEW
       ===================================================== */

    function setupPhotoPreview() {
        $("photoFile").addEventListener(
            "change",
            event => {
                releasePhotoPreview();

                selectedPhoto =
                    event.target.files?.[0] || null;

                if (!selectedPhoto) {
                    $("photoPreview").src = DEFAULT_LOGO;
                    $("photoStatus").textContent = "";
                    return;
                }

                previewObjectUrl =
                    URL.createObjectURL(selectedPhoto);

                $("photoPreview").src =
                    previewObjectUrl;

                $("photoStatus").textContent =
                    selectedPhoto.name;
            }
        );
    }

    /* =====================================================
       18. EVENT LISTENERS
       ===================================================== */

    function setupEvents() {
        $("createTeacherAccountBtn")
            .addEventListener("click", openCreateTeacher);

        $("closeTeacherModal")
            .addEventListener("click", closeTeacherModal);

        $("cancelTeacher")
            .addEventListener("click", closeTeacherModal);

        $("closeViewModal")
            .addEventListener("click", () => {
                $("viewModal").classList.remove("show");
            });

        $("teacherForm")
            .addEventListener("submit", saveTeacher);

        $("searchInput")
            .addEventListener("input", renderTeachers);

        $("institutionFilter")
            .addEventListener("change", renderTeachers);

        $("statusFilter")
            .addEventListener("change", renderTeachers);

        $("teachersTableBody")
            .addEventListener("click", event => {
                const button = event.target.closest(
                    "button[data-action]"
                );

                if (!button) {
                    return;
                }

                const recordId = button.dataset.id;
                const action = button.dataset.action;

                if (action === "view") {
                    viewTeacher(recordId);
                }

                if (action === "edit") {
                    editTeacher(recordId);
                }

                if (action === "toggle") {
                    toggleTeacherStatus(
                        recordId,
                        button.dataset.active === "true"
                    );
                }
            });

        setupPhotoPreview();
    }

    /* =====================================================
       19. INITIALIZE SYSTEM
       ===================================================== */

    async function initializeTeacherManagement() {
        setupEvents();

        try {
            await checkAccess();
            await loadInstitutions();
            await loadTeachers();

            console.log(
                "GAAWOW EMS Teacher Management V10.1 initialized."
            );

        } catch (error) {
            console.error(
                "Teacher Management Initialization Error:",
                error
            );

            showMessage(
                error.message ||
                "Unable to initialize Teacher Management.",
                "error"
            );

            $("teachersTableBody").innerHTML = `
                <tr>
                    <td colspan="7" class="empty">
                        Teacher list unavailable.
                    </td>
                </tr>
            `;
        }
    }

    /* =====================================================
       20. START
       ===================================================== */

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeTeacherManagement,
            { once: true }
        );
    } else {
        initializeTeacherManagement();
    }

})();
