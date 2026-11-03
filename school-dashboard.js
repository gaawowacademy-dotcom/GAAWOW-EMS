/* =========================================================
   GAAWOW EMS
   SCHOOL ADMIN MANAGEMENT
   Secure Role-Based Access
   ========================================================= */

"use strict";

/* SUPABASE CONFIGURATION */

const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/* GLOBAL STATE */

let schoolAdmins = [];
let institutions = [];
let selectedAdminId = null;


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHtml(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}


function showMessage(message, type = "info") {

    const box = document.getElementById("pageMessage");

    box.textContent = message;
    box.className = "message " + type;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function getInstitutionName(id) {

    if (!id) {
        return "Not Assigned";
    }

    const institution = institutions.find(
        item => item.id === id
    );

    if (!institution) {
        return "Institution not found";
    }

    return (
        institution.name ||
        institution.institution_name ||
        institution.school_name ||
        institution.full_name ||
        institution.code ||
        "Institution"
    );
}


/* =========================================================
   AUTHENTICATION AND ROLE CHECK
   ========================================================= */

async function checkSuperAdminAccess() {

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error || !session) {

        window.location.replace("index.html");
        return false;

    }

    const userId = session.user.id;

    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("id,full_name,role,is_active,institution_id")
            .eq("id", userId)
            .maybeSingle();

    if (profileError || !profile) {

        alert("Unable to verify your account.");

        await supabaseClient.auth.signOut();

        window.location.replace("index.html");

        return false;

    }

    if (
        profile.role !== "super_admin" ||
        profile.is_active !== true
    ) {

        alert("Access denied. Super Admin permission required.");

        window.location.replace("index.html");

        return false;

    }

    return true;

}


/* =========================================================
   LOAD INSTITUTIONS
   ========================================================= */

async function loadInstitutions() {

    const { data, error } = await supabaseClient
        .from("institutions")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) {

        console.error("Institution loading error:", error);

        showMessage(
            "Unable to load institutions. Check your Supabase permissions and table schema.",
            "error"
        );

        return;

    }

    institutions = data || [];

    const createSelect =
        document.getElementById("adminInstitution");

    const assignSelect =
        document.getElementById("assignInstitution");

    const options = institutions.map(item => {

        const name = getInstitutionName(item.id);

        return `
            <option value="${escapeHtml(item.id)}">
                ${escapeHtml(name)}
            </option>
        `;

    }).join("");

    createSelect.innerHTML =
        `<option value="">Select institution</option>` + options;

    assignSelect.innerHTML =
        `<option value="">Select institution</option>` + options;

}


/* =========================================================
   LOAD SCHOOL ADMINS
   ========================================================= */

async function loadSchoolAdmins() {

    const tbody = document.getElementById("adminTableBody");

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="loading">
                Loading School Admins...
            </td>
        </tr>
    `;

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("id,full_name,role,is_active,institution_id")
        .eq("role", "school_admin")
        .order("full_name", { ascending: true });

    if (error) {

        console.error("School Admin loading error:", error);

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="loading">
                    Failed to load School Admins.
                </td>
            </tr>
        `;

        showMessage(
            "Could not load School Admin accounts. Check profiles table permissions.",
            "error"
        );

        return;

    }

    schoolAdmins = data || [];

    updateStatistics();

    renderSchoolAdmins();

}


/* =========================================================
   UPDATE STATISTICS
   ========================================================= */

function updateStatistics() {

    const total = schoolAdmins.length;

    const active = schoolAdmins.filter(
        admin => admin.is_active === true
    ).length;

    const inactive = total - active;

    document.getElementById("totalAdmins").textContent = total;

    document.getElementById("activeAdmins").textContent = active;

    document.getElementById("inactiveAdmins").textContent = inactive;

}


/* =========================================================
   RENDER SCHOOL ADMINS
   ========================================================= */

function renderSchoolAdmins(searchTerm = "") {

    const tbody = document.getElementById("adminTableBody");

    const query = searchTerm.toLowerCase().trim();

    const filtered = schoolAdmins.filter(admin => {

        const name = String(admin.full_name || "").toLowerCase();

        const institution = getInstitutionName(
            admin.institution_id
        ).toLowerCase();

        const id = String(admin.id || "").toLowerCase();

        return (
            name.includes(query) ||
            institution.includes(query) ||
            id.includes(query)
        );

    });

    if (!filtered.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="loading">
                    No School Admin accounts found.
                </td>
            </tr>
        `;

        return;

    }

    tbody.innerHTML = filtered.map((admin, index) => {

        const active = admin.is_active === true;

        const status = active
            ? `<span class="status-badge active">ACTIVE</span>`
            : `<span class="status-badge inactive">INACTIVE</span>`;

        const institution = getInstitutionName(
            admin.institution_id
        );

        return `
            <tr>

                <td>${index + 1}</td>

                <td>
                    <strong>${escapeHtml(admin.full_name || "Unnamed Admin")}</strong>
                </td>

                <td>
                    <small>${escapeHtml(admin.id)}</small>
                </td>

                <td>
                    ${escapeHtml(institution)}
                </td>

                <td>
                    ${status}
                </td>

                <td>

                    <button
                        class="action-btn assign-btn"
                        onclick="openAssignModal('${escapeHtml(admin.id)}')"
                    >
                        Assign
                    </button>

                    <button
                        class="action-btn toggle-btn"
                        onclick="toggleAdminStatus('${escapeHtml(admin.id)}')"
                    >
                        ${active ? "Deactivate" : "Activate"}
                    </button>

                </td>

            </tr>
        `;

    }).join("");

}


/* =========================================================
   CREATE SCHOOL ADMIN
   Uses secure Supabase Edge Function.
   ========================================================= */

async function createSchoolAdmin(event) {

    event.preventDefault();

    const name = document.getElementById("adminName").value.trim();

    const email = document.getElementById("adminEmail").value.trim();

    const password = document.getElementById("adminPassword").value;

    const institutionId =
        document.getElementById("adminInstitution").value;

    const button = document.getElementById("createAdminBtn");

    if (!name || !email || !password || !institutionId) {

        showMessage(
            "Please complete all fields.",
            "error"
        );

        return;

    }

    if (password.length < 8) {

        showMessage(
            "Password must contain at least 8 characters.",
            "error"
        );

        return;

    }

    if (!confirm(
        "Create a new School Admin account for " + name + "?"
    )) {

        return;

    }

    button.disabled = true;

    button.textContent = "Creating Account...";

    try {

        const {
            data: { session }
        } = await supabaseClient.auth.getSession();

        if (!session) {
            throw new Error("Your session has expired. Please log in again.");
        }

        const { data, error } = await supabaseClient.functions.invoke(
            "create-school-admin",
            {
                body: {
                    full_name: name,
                    email: email,
                    password: password,
                    institution_id: institutionId
                }
            }
        );

        if (error) {

            console.error("Edge Function error:", error);

            throw new Error(
                error.message ||
                "Unable to create School Admin account."
            );

        }

        if (data && data.error) {
            throw new Error(data.error);
        }

        document.getElementById("createAdminForm").reset();

        showMessage(
            "School Admin account created successfully.",
            "success"
        );

        await loadSchoolAdmins();

    } catch (error) {

        console.error("Create School Admin error:", error);

        showMessage(
            error.message || "Account creation failed.",
            "error"
        );

    } finally {

        button.disabled = false;

        button.textContent = "Create School Admin Account";

    }

}


/* =========================================================
   OPEN ASSIGNMENT MODAL
   ========================================================= */

function openAssignModal(adminId) {

    const admin = schoolAdmins.find(
        item => item.id === adminId
    );

    if (!admin) {
        return;
    }

    selectedAdminId = adminId;

    document.getElementById("assignAdminName").textContent =
        "Administrator: " + (admin.full_name || admin.id);

    document.getElementById("assignInstitution").value =
        admin.institution_id || "";

    document.getElementById("assignModal").classList.add("show");

}


function closeAssignModal() {

    document.getElementById("assignModal").classList.remove("show");

    selectedAdminId = null;

}


/* =========================================================
   SAVE INSTITUTION ASSIGNMENT
   ========================================================= */

async function saveInstitutionAssignment() {

    if (!selectedAdminId) {
        return;
    }

    const institutionId =
        document.getElementById("assignInstitution").value;

    if (!institutionId) {

        showMessage(
            "Please select an institution.",
            "error"
        );

        return;

    }

    const button =
        document.getElementById("saveAssignmentBtn");

    button.disabled = true;

    button.textContent = "Saving...";

    try {

        const { error } = await supabaseClient
            .from("profiles")
            .update({
                institution_id: institutionId
            })
            .eq("id", selectedAdminId)
            .eq("role", "school_admin");

        if (error) {
            throw error;
        }

        closeAssignModal();

        showMessage(
            "Institution assignment updated successfully.",
            "success"
        );

        await loadSchoolAdmins();

    } catch (error) {

        console.error("Assignment error:", error);

        showMessage(
            error.message ||
            "Could not update institution assignment.",
            "error"
        );

    } finally {

        button.disabled = false;

        button.textContent = "Save Assignment";

    }

}


/* =========================================================
   ACTIVATE / DEACTIVATE SCHOOL ADMIN
   ========================================================= */

async function toggleAdminStatus(adminId) {

    const admin = schoolAdmins.find(
        item => item.id === adminId
    );

    if (!admin) {
        return;
    }

    const newStatus = admin.is_active !== true;

    const action = newStatus ? "activate" : "deactivate";

    if (!confirm(
        "Are you sure you want to " +
        action +
        " this School Admin account?"
    )) {

        return;

    }

    try {

        const { error } = await supabaseClient
            .from("profiles")
            .update({
                is_active: newStatus
            })
            .eq("id", adminId)
            .eq("role", "school_admin");

        if (error) {
            throw error;
        }

        showMessage(
            "School Admin account " +
            (newStatus ? "activated" : "deactivated") +
            " successfully.",
            "success"
        );

        await loadSchoolAdmins();

    } catch (error) {

        console.error("Status update error:", error);

        showMessage(
            error.message ||
            "Unable to update account status.",
            "error"
        );

    }

}


/* =========================================================
   SEARCH
   ========================================================= */

document.getElementById("adminSearch").addEventListener(
    "input",
    function () {

        renderSchoolAdmins(this.value);

    }
);


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

document.getElementById("createAdminForm").addEventListener(
    "submit",
    createSchoolAdmin
);


document.getElementById("saveAssignmentBtn").addEventListener(
    "click",
    saveInstitutionAssignment
);


/* =========================================================
   START APPLICATION
   ========================================================= */

async function startSchoolAdminManagement() {

    const authorized = await checkSuperAdminAccess();

    if (!authorized) {
        return;
    }

    await loadInstitutions();

    await loadSchoolAdmins();

}


/* =========================================================
   AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange((event, session) => {

    if (event === "SIGNED_OUT" || !session) {

        window.location.replace("index.html");

    }

});


/* INITIALIZE */

document.addEventListener(
    "DOMContentLoaded",
    startSchoolAdminManagement
);
