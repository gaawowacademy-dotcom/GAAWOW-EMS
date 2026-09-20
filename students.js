/* =========================================================
GAAWOW EMS
STUDENTS MODULE V4.1 FINAL

Database:

- Supabase
- students
- profiles
- institutions

Storage:

- student-photos

IMPORTANT:

- profiles.user_id DOES NOT EXIST
- profiles.id = auth.users.id
- HTML + JS IDs fully matched
- One initialization only
- DOM null-safe
- Photo upload supported
- Super Admin sees all institutions
- Other roles see only their institution
  ========================================================= */

"use strict";

/* =========================================================
CONFIGURATION
========================================================= */

const SUPABASE_URL =
"https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
"sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const PHOTO_BUCKET = "student-photos";

/* =========================================================
SUPABASE CLIENT
========================================================= */

if (!window.supabase) {
console.error("Supabase library was not loaded.");
throw new Error("Supabase library was not loaded.");
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

/* =========================================================
GLOBAL STATE
========================================================= */

let currentUser = null;
let currentProfile = null;
let institutions = [];
let students = [];
let editingStudent = null;
let isSaving = false;

/* =========================================================
DOM HELPER
========================================================= */

function $(id) {
return document.getElementById(id);
}

/* =========================================================
UUID HELPER
========================================================= */

function generateUUID() {

if (
window.crypto &&
typeof window.crypto.randomUUID === "function"
) {
return window.crypto.randomUUID();
}

if (
window.crypto &&
typeof window.crypto.getRandomValues === "function"
) {

const bytes =
  new Uint8Array(16);

window.crypto.getRandomValues(bytes);

bytes[6] =
  (bytes[6] & 0x0f) | 0x40;

bytes[8] =
  (bytes[8] & 0x3f) | 0x80;

const hex =
  Array.from(bytes)
    .map(b =>
      b.toString(16).padStart(2, "0")
    )
    .join("");

return (
  hex.substring(0, 8) + "-" +
  hex.substring(8, 12) + "-" +
  hex.substring(12, 16) + "-" +
  hex.substring(16, 20) + "-" +
  hex.substring(20)
);

}

throw new Error(
"This browser does not support secure UUID generation."
);
}

/* =========================================================
MESSAGE
========================================================= */

function showMessage(
message,
type = "info",
duration = 5000
) {

const box = $("message");

if (!box) {
console.warn(
"Message element not found:",
message
);
return;
}

box.className = "";
box.textContent = message;

if (type === "success") {
box.classList.add("success");
} else if (type === "error") {
box.classList.add("error");
} else {
box.classList.add("info");
}

box.style.display = "block";

window.clearTimeout(
showMessage.timer
);

if (duration > 0) {

showMessage.timer =
  window.setTimeout(() => {

    if (box) {
      box.style.display = "none";
      box.textContent = "";
      box.className = "";
    }

  }, duration);

}
}

function clearMessage() {

const box = $("message");

if (!box) return;

box.style.display = "none";
box.textContent = "";
box.className = "";
}

/* =========================================================
ERROR HELPER
========================================================= */

function getErrorMessage(error) {

if (!error) {
return "Unknown error.";
}

if (typeof error === "string") {
return error;
}

return (
error.message ||
error.error_description ||
error.details ||
error.hint ||
"Unknown error."
);
}

/* =========================================================
SUPABASE CONNECTION CHECK
========================================================= */

async function checkSupabaseConnection() {

try {

const response =
  await fetch(
    `${SUPABASE_URL}/auth/v1/settings`,
    {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY
      }
    }
  );

return response.ok;

} catch (error) {

console.warn(
  "Supabase connection test failed:",
  error
);

return false;

}
}

/* =========================================================
AUTHENTICATION
========================================================= */

async function loadCurrentUser() {

const {
data,
error
} =
await supabaseClient.auth.getUser();

if (error) {
throw error;
}

if (!data || !data.user) {

throw new Error(
  "No authenticated user found. Please login again."
);

}

currentUser = data.user;

return currentUser;
}

/* =========================================================
LOAD PROFILE

IMPORTANT:
profiles.user_id DOES NOT EXIST.

Current schema uses:
profiles.id = auth.users.id
========================================================= */

async function loadCurrentProfile() {

if (!currentUser) {
throw new Error(
"User is not authenticated."
);
}

const {
data,
error
} =
await supabaseClient
.from("profiles")
.select("id, institution_id, full_name, role, is_active")
.eq(
"id",
currentUser.id
)
.maybeSingle();

if (error) {
throw error;
}

if (!data) {

throw new Error(
  "Your profile was not found in the profiles table."
);

}

if (data.is_active === false) {

throw new Error(
  "Your account is inactive."
);

}

currentProfile = data;

return data;
}

/* =========================================================
ROLE HELPERS
========================================================= */

function isSuperAdmin() {

return (
currentProfile &&
currentProfile.role === "super_admin"
);
}

function isSchoolAdmin() {

return (
currentProfile &&
(
currentProfile.role === "school_admin" ||
currentProfile.role === "super_admin"
)
);
}

/* =========================================================
LOAD INSTITUTIONS
========================================================= */

async function loadInstitutions() {

let query =
supabaseClient
.from("institutions")
.select("id, name")
.order(
"name",
{
ascending: true
}
);

if (!isSuperAdmin()) {

if (!currentProfile.institution_id) {

  throw new Error(
    "Your profile does not have an institution assigned."
  );
}

query =
  query.eq(
    "id",
    currentProfile.institution_id
  );

}

const {
data,
error
} = await query;

if (error) {
throw error;
}

institutions = data || [];

renderInstitutionSelect();

return institutions;
}

/* =========================================================
RENDER INSTITUTION SELECT
========================================================= */

function renderInstitutionSelect() {

const select =
$("institutionSelect");

if (!select) {
return;
}

select.innerHTML = "";

const placeholder =
document.createElement("option");

placeholder.value = "";
placeholder.textContent =
"Select Institution";

select.appendChild(
placeholder
);

institutions.forEach(
institution => {

  const option =
    document.createElement("option");

  option.value =
    institution.id;

  option.textContent =
    institution.name ||
    "Unnamed Institution";

  select.appendChild(option);
}

);

if (
!isSuperAdmin() &&
currentProfile &&
currentProfile.institution_id
) {

select.value =
  currentProfile.institution_id;

select.disabled = true;

} else {

select.disabled = false;

}
}

/* =========================================================
LOAD STUDENTS
========================================================= */

async function loadStudents() {

const body =
$("studentsTableBody");

if (body) {

body.innerHTML = `
  <tr>
    <td colspan="9">
      <div class="loading">
        Loading students...
      </div>
    </td>
  </tr>
`;

}

let query =
supabaseClient
.from("students")
.select("id, institution_id, profile_id, student_id, full_name, gender, date_of_birth, phone, email, address, photo_url, admission_date, status, emergency_contact_name, emergency_contact_phone, created_at, updated_at")
.order(
"created_at",
{
ascending: false
}
);

if (!isSuperAdmin()) {

if (!currentProfile.institution_id) {

  throw new Error(
    "Your profile does not have an institution."
  );
}

query =
  query.eq(
    "institution_id",
    currentProfile.institution_id
  );

}

const {
data,
error
} = await query;

if (error) {
throw error;
}

students = data || [];

renderStats();
renderStudents();

return students;
}

/* =========================================================
STATS
========================================================= */

function renderStats() {

const total =
students.length;

const active =
students.filter(
student =>
student.status === "active"
).length;

const graduated =
students.filter(
student =>
student.status === "graduated"
).length;

const other =
Math.max(
0,
total - active - graduated
);

const totalEl =
$("totalStudents");

const activeEl =
$("activeStudents");

const graduatedEl =
$("graduatedStudents");

const otherEl =
$("otherStudents");

if (totalEl) {
totalEl.textContent =
total;
}

if (activeEl) {
activeEl.textContent =
active;
}

if (graduatedEl) {
graduatedEl.textContent =
graduated;
}

if (otherEl) {
otherEl.textContent =
other;
}
}

/* =========================================================
SEARCH / FILTER
========================================================= */

function getFilteredStudents() {

const searchEl =
$("searchInput");

const statusEl =
$("statusFilter");

const search =
searchEl
? searchEl.value
.trim()
.toLowerCase()
: "";

const status =
statusEl
? statusEl.value
: "";

return students.filter(
student => {

  const matchesStatus =
    !status ||
    student.status === status;

  if (!search) {
    return matchesStatus;
  }

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

  return (
    matchesStatus &&
    searchable.includes(search)
  );
}

);
}

/* =========================================================
ESCAPE HTML
========================================================= */

function escapeHtml(value) {

if (
value === null ||
value === undefined
) {
return "";
}

return String(value)
.replace(
/&/g,
"&"
)
.replace(
/</g,
"<"
)
.replace(
/>/g,
">"
)
.replace(
/"/g,
"""
)
.replace(
/'/g,
"'"
);
}

/* =========================================================
INITIALS
========================================================= */

function getInitials(name) {

if (!name) {
return "?";
}

const parts =
String(name)
.trim()
.split(/\s+/);

if (!parts.length) {
return "?";
}

if (parts.length === 1) {

return parts[0]
  .substring(0, 2)
  .toUpperCase();

}

return (
parts[0][0] +
parts[parts.length - 1][0]
).toUpperCase();
}

/* =========================================================
STATUS HTML
========================================================= */

function statusHtml(status) {

const safeStatus =
status || "inactive";

return "<span class="status status-${escapeHtml(safeStatus)}"> ${escapeHtml(safeStatus)} </span>";
}

/* =========================================================
FORMAT DATE
========================================================= */

function formatDate(dateValue) {

if (!dateValue) {
return "—";
}

const date =
new Date(dateValue);

if (
Number.isNaN(
date.getTime()
)
) {
return escapeHtml(
dateValue
);
}

return date.toLocaleDateString(
"en-GB",
{
day: "2-digit",
month: "short",
year: "numeric"
}
);
}

/* =========================================================
RENDER STUDENTS
========================================================= */

function renderStudents() {

const body =
$("studentsTableBody");

if (!body) {

console.error(
  "Missing #studentsTableBody"
);

return;

}

const filtered =
getFilteredStudents();

if (!filtered.length) {

body.innerHTML = `
  <tr>
    <td colspan="9">
      <div class="empty">
        <strong>No students found</strong>
        Try changing your search or status filter.
      </div>
    </td>
  </tr>
`;

return;

}

body.innerHTML =
filtered
.map(student => {

    let photoHtml;

    if (student.photo_url) {

      photoHtml = `
        <img
          class="student-photo"
          src="${escapeHtml(student.photo_url)}"
          alt="${escapeHtml(student.full_name)}"
          loading="lazy"
          onerror="
            this.style.display='none';
            if(this.nextElementSibling){
              this.nextElementSibling.style.display='flex';
            }
          "
        />

        <div
          class="avatar"
          style="display:none"
        >
          ${escapeHtml(
            getInitials(
              student.full_name
            )
          )}
        </div>
      `;

    } else {

      photoHtml = `
        <div class="avatar">
          ${escapeHtml(
            getInitials(
              student.full_name
            )
          )}
        </div>
      `;
    }

    return `
      <tr>

        <td>
          ${photoHtml}
        </td>

        <td>
          <strong>
            ${escapeHtml(
              student.student_id
            )}
          </strong>
        </td>

        <td>
          <strong>
            ${escapeHtml(
              student.full_name
            )}
          </strong>
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

          <div class="actions">

            <button
              type="button"
              class="btn btn-small btn-primary"
              data-action="view"
              data-id="${escapeHtml(student.id)}"
            >
              View
            </button>

            <button
              type="button"
              class="btn btn-small btn-gold"
              data-action="edit"
              data-id="${escapeHtml(student.id)}"
            >
              Edit
            </button>

            <button
              type="button"
              class="btn btn-small btn-danger"
              data-action="delete"
              data-id="${escapeHtml(student.id)}"
            >
              Delete
            </button>

          </div>

        </td>

      </tr>
    `;
  })
  .join("");

}

/* =========================================================
FORM DATA
========================================================= */

function getFormData() {

const value =
id => {

  const element =
    $(id);

  return element
    ? element.value
    : "";
};

return {

institution_id:
  value("institutionSelect"),

student_id:
  value("studentId")
    .trim(),

full_name:
  value("fullName")
    .trim(),

gender:
  value("gender") || null,

date_of_birth:
  value("dateOfBirth") || null,

phone:
  value("phone")
    .trim() || null,

email:
  value("email")
    .trim() || null,

address:
  value("address")
    .trim() || null,

admission_date:
  value("admissionDate") || null,

status:
  value("status") ||
  "active"

};
}

/* =========================================================
VALIDATE FORM
========================================================= */

function validateForm(data) {

if (!data.institution_id) {

throw new Error(
  "Please select an institution."
);

}

if (!data.student_id) {

throw new Error(
  "Student ID is required."
);

}

if (!data.full_name) {

throw new Error(
  "Student full name is required."
);

}

if (!data.status) {

throw new Error(
  "Student status is required."
);

}

if (
!isSuperAdmin() &&
currentProfile &&
currentProfile.institution_id !==
data.institution_id
) {

throw new Error(
  "You can only manage students in your own institution."
);

}
}

/* =========================================================
PHOTO VALIDATION
========================================================= */

function validatePhoto(file) {

if (!file) {
return;
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
  "Photo must be JPG, PNG, or WEBP."
);

}

const maxSize =
5 * 1024 * 1024;

if (file.size > maxSize) {

throw new Error(
  "Photo must be smaller than 5MB."
);

}
}

/* =========================================================
PHOTO PREVIEW
========================================================= */

function handlePhotoPreview() {

const input =
$("photoInput");

const preview =
$("photoPreview");

const placeholder =
$("photoPlaceholder");

if (!input) {
return;
}

const file =
input.files &&
input.files[0];

if (!file) {

if (preview) {
  preview.src = "";
  preview.style.display =
    "none";
}

if (placeholder) {
  placeholder.style.display =
    "flex";
}

return;

}

try {

validatePhoto(file);

} catch (error) {

input.value = "";

if (preview) {
  preview.src = "";
  preview.style.display =
    "none";
}

if (placeholder) {
  placeholder.style.display =
    "flex";
}

showMessage(
  getErrorMessage(error),
  "error"
);

return;

}

const reader =
new FileReader();

reader.onload =
event => {

  if (preview) {

    preview.src =
      event.target.result;

    preview.style.display =
      "block";
  }

  if (placeholder) {

    placeholder.style.display =
      "none";
  }
};

reader.readAsDataURL(file);
}

/* =========================================================
FILE EXTENSION
========================================================= */

function getFileExtension(file) {

if (!file) {
return "jpg";
}

const name =
file.name || "";

const parts =
name.split(".");

if (parts.length < 2) {
return "jpg";
}

const extension =
parts[
parts.length - 1
]
.toLowerCase()
.replace(
/[^a-z0-9]/g,
""
);

return extension || "jpg";
}

/* =========================================================
PROGRESS
========================================================= */

function setProgress(
percent,
text
) {

const wrap =
$("progressWrap");

const bar =
$("progressBar");

const label =
$("progressText");

if (wrap) {
wrap.style.display =
"block";
}

if (bar) {

bar.style.width =
  `${Math.max(
    0,
    Math.min(
      100,
      percent
    )
  )}%`;

}

if (label) {
label.textContent =
text || "Processing...";
}
}

function hideProgress() {

const wrap =
$("progressWrap");

if (wrap) {
wrap.style.display =
"none";
}
}

/* =========================================================
UPLOAD PHOTO
========================================================= */

async function uploadStudentPhoto(
studentDbId,
file
) {

if (!studentDbId) {

throw new Error(
  "Student database ID is missing."
);

}

if (!file) {
return null;
}

validatePhoto(file);

const extension =
getFileExtension(file);

const uniqueName =
"${Date.now()}-${generateUUID()}.${extension}";

const filePath =
"students/${studentDbId}/${uniqueName}";

setProgress(
10,
"Uploading student photo..."
);

const {
error
} =
await supabaseClient
.storage
.from(PHOTO_BUCKET)
.upload(
filePath,
file,
{
cacheControl: "3600",
contentType: file.type,
upsert: false
}
);

if (error) {
throw error;
}

setProgress(
90,
"Preparing photo URL..."
);

const {
data
} =
supabaseClient
.storage
.from(PHOTO_BUCKET)
.getPublicUrl(
filePath
);

if (
!data ||
!data.publicUrl
) {

throw new Error(
  "Photo uploaded, but public URL could not be created."
);

}

setProgress(
100,
"Photo uploaded successfully."
);

return data.publicUrl;
}

/* =========================================================
CREATE STUDENT
========================================================= */

async function createStudent(
payload,
photoFile
) {

const studentDbId =
generateUUID();

const insertPayload = {

id:
  studentDbId,

institution_id:
  payload.institution_id,

student_id:
  payload.student_id,

full_name:
  payload.full_name,

gender:
  payload.gender,

date_of_birth:
  payload.date_of_birth,

phone:
  payload.phone,

email:
  payload.email,

address:
  payload.address,

admission_date:
  payload.admission_date,

status:
  payload.status

};

const {
error: insertError
} =
await supabaseClient
.from("students")
.insert(
insertPayload
);

if (insertError) {
throw insertError;
}

if (!photoFile) {

return {
  success: true,
  photoUploaded: false,
  studentDbId
};

}

try {

const photoUrl =
  await uploadStudentPhoto(
    studentDbId,
    photoFile
  );

const {
  error: photoUpdateError
} =
  await supabaseClient
    .from("students")
    .update({
      photo_url:
        photoUrl,

      updated_at:
        new Date().toISOString()
    })
    .eq(
      "id",
      studentDbId
    );

if (photoUpdateError) {

  return {
    success: true,
    photoError:
      photoUpdateError,
    studentDbId
  };
}

return {
  success: true,
  photoUploaded: true,
  studentDbId
};

} catch (photoError) {

return {
  success: true,
  photoError,
  studentDbId
};

}
}

/* =========================================================
UPDATE STUDENT
========================================================= */

async function updateStudent(
studentDbId,
payload,
photoFile
) {

if (!studentDbId) {

throw new Error(
  "Student database ID is missing."
);

}

const updatePayload = {

institution_id:
  payload.institution_id,

student_id:
  payload.student_id,

full_name:
  payload.full_name,

gender:
  payload.gender,

date_of_birth:
  payload.date_of_birth,

phone:
  payload.phone,

email:
  payload.email,

address:
  payload.address,

admission_date:
  payload.admission_date,

status:
  payload.status,

updated_at:
  new Date().toISOString()

};

const {
error: updateError
} =
await supabaseClient
.from("students")
.update(
updatePayload
)
.eq(
"id",
studentDbId
);

if (updateError) {
throw updateError;
}

if (!photoFile) {

return {
  success: true,
  photoUploaded: false
};

}

try {

const photoUrl =
  await uploadStudentPhoto(
    studentDbId,
    photoFile
  );

const {
  error: photoUpdateError
} =
  await supabaseClient
    .from("students")
    .update({
      photo_url:
        photoUrl,

      updated_at:
        new Date().toISOString()
    })
    .eq(
      "id",
      studentDbId
    );

if (photoUpdateError) {

  return {
    success: true,
    photoError:
      photoUpdateError
  };
}

return {
  success: true,
  photoUploaded: true
};

} catch (photoError) {

return {
  success: true,
  photoError
};

}
}

/* =========================================================
SAVE FORM
========================================================= */

async function handleStudentSubmit(
event
) {

event.preventDefault();

if (isSaving) {
return;
}

isSaving = true;

clearMessage();

const saveButton =
$("saveButton");

if (saveButton) {

saveButton.disabled =
  true;

saveButton.textContent =
  editingStudent
    ? "UPDATING..."
    : "SAVING...";

}

try {

const payload =
  getFormData();

validateForm(payload);

const photoInput =
  $("photoInput");

const photoFile =
  photoInput &&
  photoInput.files &&
  photoInput.files[0]
    ? photoInput.files[0]
    : null;

if (photoFile) {
  validatePhoto(photoFile);
}

let result;

if (editingStudent) {

  result =
    await updateStudent(
      editingStudent.id,
      payload,
      photoFile
    );

  if (
    result &&
    result.photoError
  ) {

    showMessage(
      "STUDENT DATA UPDATED. Photo upload failed: " +
      getErrorMessage(
        result.photoError
      ),
      "error",
      9000
    );

  } else {

    showMessage(
      "STUDENT DATA UPDATED SUCCESSFULLY.",
      "success"
    );
  }

} else {

  result =
    await createStudent(
      payload,
      photoFile
    );

  if (
    result &&
    result.photoError
  ) {

    showMessage(
      "STUDENT SAVED SUCCESSFULLY. Photo upload failed: " +
      getErrorMessage(
        result.photoError
      ),
      "error",
      9000
    );

  } else {

    showMessage(
      photoFile
        ? "STUDENT SAVED SUCCESSFULLY. Photo uploaded successfully."
        : "STUDENT SAVED SUCCESSFULLY.",
      "success"
    );
  }
}

await loadStudents();

resetStudentForm();

} catch (error) {

console.error(
  "Student save error:",
  error
);

showMessage(
  getErrorMessage(error),
  "error",
  9000
);

} finally {

isSaving = false;

hideProgress();

if (saveButton) {

  saveButton.disabled =
    false;

  saveButton.textContent =
    "SAVE STUDENT";
}

}
}

/* =========================================================
RESET FORM
========================================================= */

function resetStudentForm() {

editingStudent = null;

const form =
$("studentForm");

if (form) {
form.reset();
}

const editId =
$("editStudentDbId");

if (editId) {
editId.value = "";
}

const formTitle =
$("formTitle");

if (formTitle) {
formTitle.textContent =
"Add New Student";
}

const saveButton =
$("saveButton");

if (saveButton) {
saveButton.textContent =
"SAVE STUDENT";
}

const preview =
$("photoPreview");

if (preview) {

preview.src = "";

preview.style.display =
  "none";

}

const placeholder =
$("photoPlaceholder");

if (placeholder) {

placeholder.style.display =
  "flex";

}

const photoInput =
$("photoInput");

if (photoInput) {
photoInput.value = "";
}

hideProgress();

const institutionSelect =
$("institutionSelect");

if (
institutionSelect &&
!isSuperAdmin() &&
currentProfile &&
currentProfile.institution_id
) {

institutionSelect.value =
  currentProfile.institution_id;

}

const status =
$("status");

if (status) {
status.value =
"active";
}

const admissionDate =
$("admissionDate");

if (
admissionDate &&
!admissionDate.value
) {

admissionDate.value =
  new Date()
    .toISOString()
    .split("T")[0];

}
}

/* =========================================================
EDIT STUDENT
========================================================= */

function editStudent(
studentDbId
) {

const student =
students.find(
item =>
item.id ===
studentDbId
);

if (!student) {

showMessage(
  "Student record was not found.",
  "error"
);

return;

}

editingStudent =
student;

const editId =
$("editStudentDbId");

if (editId) {
editId.value =
student.id;
}

const institution =
$("institutionSelect");

if (institution) {

institution.value =
  student.institution_id || "";

}

const fields = {

studentId:
  student.student_id || "",

fullName:
  student.full_name || "",

gender:
  student.gender || "",

dateOfBirth:
  student.date_of_birth || "",

phone:
  student.phone || "",

email:
  student.email || "",

address:
  student.address || "",

admissionDate:
  student.admission_date || "",

status:
  student.status ||
  "active"

};

Object.entries(fields)
.forEach(
([id, value]) => {

    const element =
      $(id);

    if (element) {
      element.value =
        value;
    }
  }
);

const preview =
$("photoPreview");

const placeholder =
$("photoPlaceholder");

if (
preview &&
student.photo_url
) {

preview.src =
  student.photo_url;

preview.style.display =
  "block";

if (placeholder) {
  placeholder.style.display =
    "none";
}

} else {

if (preview) {

  preview.src = "";

  preview.style.display =
    "none";
}

if (placeholder) {
  placeholder.style.display =
    "flex";
}

}

const formTitle =
$("formTitle");

if (formTitle) {
formTitle.textContent =
"Edit Student";
}

const saveButton =
$("saveButton");

if (saveButton) {
saveButton.textContent =
"UPDATE STUDENT";
}

window.scrollTo({
top: 0,
behavior: "smooth"
});
}

/* =========================================================
VIEW STUDENT
========================================================= */

function viewStudent(
studentDbId
) {

const student =
students.find(
item =>
item.id ===
studentDbId
);

if (!student) {

showMessage(
  "Student record was not found.",
  "error"
);

return;

}

const modal =
$("profileModal");

const content =
$("profileContent");

if (
!modal ||
!content
) {

console.error(
  "Profile modal DOM elements are missing."
);

return;

}

const institution =
institutions.find(
item =>
item.id ===
student.institution_id
);

const photoHtml =
student.photo_url
? "<img class="profile-photo" src="${escapeHtml(student.photo_url)}" alt="${escapeHtml(student.full_name)}" />"
: "<div class="profile-photo" style=" display:flex; align-items:center; justify-content:center; background:#0B1E63; color:white; font-weight:800; font-size:25px; " > ${escapeHtml( getInitials( student.full_name ) )} </div>";

content.innerHTML = `

<div class="profile-top">

  ${photoHtml}

  <div>

    <div class="profile-name">
      ${escapeHtml(
        student.full_name
      )}
    </div>

    <div class="profile-id">
      Student ID:
      <strong>
        ${escapeHtml(
          student.student_id
        )}
      </strong>
    </div>

  </div>

</div>

<div class="profile-grid">

  <div class="profile-item">
    <small>Institution</small>
    <strong>
      ${escapeHtml(
        institution
          ? institution.name
          : "—"
      )}
    </strong>
  </div>

  <div class="profile-item">
    <small>Status</small>
    <strong>
      ${statusHtml(
        student.status
      )}
    </strong>
  </div>

  <div class="profile-item">
    <small>Gender</small>
    <strong>
      ${escapeHtml(
        student.gender || "—"
      )}
    </strong>
  </div>

  <div class="profile-item">
    <small>Date of Birth</small>
    <strong>
      ${formatDate(
        student.date_of_birth
      )}
    </strong>
  </div>

  <div class="profile-item">
    <small>Phone</small>
    <strong>
      ${escapeHtml(
        student.phone || "—"
      )}
    </strong>
  </div>

  <div class="profile-item">
    <small>Email</small>
    <strong>
      ${escapeHtml(
        student.email || "—"
      )}
    </strong>
  </div>

  <div class="profile-item">
    <small>Admission Date</small>
    <strong>
      ${formatDate(
        student.admission_date
      )}
    </strong>
  </div>

  <div class="profile-item">
    <small>Created</small>
    <strong>
      ${formatDate(
        student.created_at
      )}
    </strong>
  </div>

  <div class="profile-item">
    <small>Emergency Contact</small>
    <strong>
      ${escapeHtml(
        student.emergency_contact_name ||
        "—"
      )}
    </strong>
  </div>

  <div class="profile-item">
    <small>Emergency Phone</small>
    <strong>
      ${escapeHtml(
        student.emergency_contact_phone ||
        "—"
      )}
    </strong>
  </div>

  <div
    class="profile-item"
    style="grid-column:1/-1"
  >
    <small>Address</small>
    <strong>
      ${escapeHtml(
        student.address ||
        "—"
      )}
    </strong>
  </div>

</div>

`;

modal.classList.add("show");

modal.setAttribute(
"aria-hidden",
"false"
);
}

/* =========================================================
CLOSE PROFILE MODAL
========================================================= */

function closeProfileModal() {

const modal =
$("profileModal");

if (!modal) {
return;
}

modal.classList.remove(
"show"
);

modal.setAttribute(
"aria-hidden",
"true"
);
}

/* =========================================================
DELETE STUDENT
========================================================= */

async function deleteStudent(
studentDbId
) {

const student =
students.find(
item =>
item.id ===
studentDbId
);

if (!student) {

showMessage(
  "Student record was not found.",
  "error"
);

return;

}

const confirmed =
window.confirm(
"Are you sure you want to delete "${student.full_name}"?\n\nThis action cannot be undone."
);

if (!confirmed) {
return;
}

try {

showMessage(
  "Deleting student...",
  "info",
  0
);

const {
  error
} =
  await supabaseClient
    .from("students")
    .delete()
    .eq(
      "id",
      studentDbId
    );

if (error) {
  throw error;
}

await loadStudents();

showMessage(
  "STUDENT DELETED SUCCESSFULLY.",
  "success"
);

} catch (error) {

console.error(
  "Delete student error:",
  error
);

showMessage(
  "Delete failed: " +
  getErrorMessage(error),
  "error",
  9000
);

}
}

/* =========================================================
TABLE ACTION HANDLER
========================================================= */

function handleTableClick(
event
) {

const button =
event.target.closest(
"button[data-action]"
);

if (!button) {
return;
}

const action =
button.dataset.action;

const id =
button.dataset.id;

if (!id) {
return;
}

if (action === "view") {

viewStudent(id);

} else if (action === "edit") {

editStudent(id);

} else if (action === "delete") {

deleteStudent(id);

}
}

/* =========================================================
EVENT LISTENERS
========================================================= */

function setupEventListeners() {

const form =
$("studentForm");

if (form) {

form.addEventListener(
  "submit",
  handleStudentSubmit
);

}

const resetButton =
$("resetFormButton");

if (resetButton) {

resetButton.addEventListener(
  "click",
  resetStudentForm
);

}

const addButton =
$("addStudentButton");

if (addButton) {

addButton.addEventListener(
  "click",
  () => {

    resetStudentForm();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
);

}

const photoInput =
$("photoInput");

if (photoInput) {

photoInput.addEventListener(
  "change",
  handlePhotoPreview
);

}

const searchInput =
$("searchInput");

if (searchInput) {

searchInput.addEventListener(
  "input",
  renderStudents
);

}

const statusFilter =
$("statusFilter");

if (statusFilter) {

statusFilter.addEventListener(
  "change",
  renderStudents
);

}

const tableBody =
$("studentsTableBody");

if (tableBody) {

tableBody.addEventListener(
  "click",
  handleTableClick
);

}

const closeModal =
$("closeProfileModal");

if (closeModal) {

closeModal.addEventListener(
  "click",
  closeProfileModal
);

}

const modal =
$("profileModal");

if (modal) {

modal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      modal
    ) {
      closeProfileModal();
    }
  }
);

}

document.addEventListener(
"keydown",
event => {

  if (
    event.key ===
    "Escape"
  ) {
    closeProfileModal();
  }
},
{
  once: false
}

);
}

/* =========================================================
INITIALIZATION
========================================================= */

async function initStudentsPage() {

console.log(
"GAAWOW EMS Students V4.1 starting..."
);

try {

const requiredIds = [
  "message",
  "totalStudents",
  "activeStudents",
  "graduatedStudents",
  "otherStudents",
  "studentForm",
  "institutionSelect",
  "studentId",
  "fullName",
  "gender",
  "dateOfBirth",
  "phone",
  "email",
  "address",
  "admissionDate",
  "status",
  "photoInput",
  "photoPreview",
  "photoPlaceholder",
  "progressWrap",
  "progressBar",
  "progressText",
  "saveButton",
  "resetFormButton",
  "addStudentButton",
  "searchInput",
  "statusFilter",
  "studentsTableBody",
  "profileModal",
  "profileContent",
  "closeProfileModal"
];

const missingIds =
  requiredIds.filter(
    id => !$(id)
  );

if (missingIds.length) {

  throw new Error(
    "Students page HTML is incomplete. Missing: " +
    missingIds.join(", ")
  );
}

const connected =
  await checkSupabaseConnection();

if (!connected) {

  console.warn(
    "Supabase connection test failed; continuing with authentication."
  );
}

await loadCurrentUser();

await loadCurrentProfile();

console.log(
  "Logged user:",
  currentUser.email
);

console.log(
  "Profile:",
  currentProfile
);

setupEventListeners();

await loadInstitutions();

await loadStudents();

resetStudentForm();

console.log(
  "GAAWOW EMS Students V4.1 loaded successfully."
);

} catch (error) {

console.error(
  "Students initialization failed:",
  error
);

showMessage(
  "Students module error: " +
  getErrorMessage(error),
  "error",
  0
);

}
}

/* =========================================================
START ONCE
========================================================= */

if (
document.readyState ===
"loading"
) {

document.addEventListener(
"DOMContentLoaded",
initStudentsPage,
{
once: true
}
);

} else {

initStudentsPage();
}

/* =========================================================
OPTIONAL GLOBAL FUNCTIONS
========================================================= */

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
