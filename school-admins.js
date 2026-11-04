(() => {
"use strict";

/* =====================================
   GAAWOW EMS SUPABASE CONFIGURATION
===================================== */

const SUPABASE_URL =
"https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
"sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const db = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);

const $ = id => document.getElementById(id);

let institutions = [];
let admins = [];
let currentAdminId = null;


/* =====================================
   NOTIFICATIONS
===================================== */

function notify(message,type="info"){

const box = $("notice");

box.textContent = message;
box.className = `notice show ${type}`;

box.scrollIntoView({
behavior:"smooth",
block:"nearest"
});

}


/* =====================================
   HTML SECURITY
===================================== */

function safe(value){

return String(value ?? "").replace(
/[&<>"']/g,
char => ({
"&":"&amp;",
"<":"&lt;",
">":"&gt;",
'"':"&quot;",
"'":"&#39;"
}[char])
);

}


/* =====================================
   EDGE FUNCTION ERROR HANDLING
===================================== */

async function invokeFunction(name,payload){

const {data,error} = await db.functions.invoke(
name,
{
body:payload
}
);

if(error){

let message = error.message || "Function request failed.";

try{

const result = await error.context?.json();

if(result?.message){
message = result.message;
}

}catch(_){}

throw new Error(message);

}

if(data && data.success === false){

throw new Error(
data.message || "Operation failed."
);

}

return data;

}


/* =====================================
   VERIFY SUPER ADMIN
===================================== */

async function verifySuperAdmin(){

const {
data:{session},
error:sessionError
} = await db.auth.getSession();

if(sessionError || !session){

location.replace("index.html");
return false;

}

const {data:profile,error} = await db
.from("profiles")
.select("id,role,is_active")
.eq("id",session.user.id)
.maybeSingle();

if(
error ||
!profile ||
profile.role !== "super_admin" ||
profile.is_active !== true
){

notify(
"Access denied. Active Super Admin only.",
"error"
);

setTimeout(()=>{
location.replace("index.html");
},2500);

return false;

}

return true;

}


/* =====================================
   TEST CONNECTION
===================================== */

async function testConnection(){

const button = $("testConnectionBtn");
const status = $("connectionStatus");

button.disabled = true;
button.textContent = "Testing...";

status.textContent = "Checking login and database connection...";

try{

const {
data:{session},
error:sessionError
} = await db.auth.getSession();

if(sessionError) throw sessionError;

if(!session){

throw new Error("No active login session found.");

}

const {data:profile,error:profileError} = await db
.from("profiles")
.select("id,role,is_active")
.eq("id",session.user.id)
.maybeSingle();

if(profileError) throw profileError;

if(
!profile ||
profile.role !== "super_admin" ||
profile.is_active !== true
){

throw new Error("Active Super Admin authorization failed.");

}

/* Read-only database check */

const {error:dbError} = await db
.from("institutions")
.select("id")
.limit(1);

if(dbError) throw dbError;

status.textContent =
"Session, Super Admin authorization and database connection verified.";

notify(
"Connection successful. Login, authorization and database are working.",
"success"
);

}catch(error){

console.error("Connection Test:",error);

status.textContent =
"Connection test failed: " + error.message;

notify(
error.message || "Connection test failed.",
"error"
);

}finally{

button.disabled = false;
button.textContent = "Test Connection";

}

}


/* =====================================
   LOAD INSTITUTIONS
===================================== */

async function loadInstitutions(){

const {data,error} = await db
.from("institutions")
.select("id,name,code,is_active")
.order("name");

if(error) throw error;

institutions = data || [];

const select = $("institution_id");

const activeInstitutions =
institutions.filter(item=>item.is_active);

select.innerHTML =
'<option value="">Select Institution</option>' +

activeInstitutions.map(item => `

<option value="${safe(item.id)}">
${safe(item.name)}
${item.code ? " ("+safe(item.code)+")" : ""}
</option>

`).join("");

if(!activeInstitutions.length){

select.innerHTML =
'<option value="">No active institution available</option>';

}

}


/* =====================================
   INSTITUTION NAME
===================================== */

function getInstitutionName(id){

const item = institutions.find(x => x.id === id);

if(!item) return "Not assigned";

return item.name + (
item.is_active ? "" : " (Inactive)"
);

}


/* =====================================
   LOAD SCHOOL ADMINS
===================================== */

async function loadAdmins(){

const {data,error} = await db
.from("profiles")
.select(`
id,
full_name,
email,
phone,
role,
is_active,
institution_id,
created_at,
is_primary_admin,
avatar_url
`)
.eq("role","school_admin")
.order("created_at",{ascending:false});

if(error) throw error;

admins = data || [];

renderAdmins();

}


/* =====================================
   RENDER STATISTICS
===================================== */

function renderStatistics(){

$("totalAdmins").textContent = admins.length;

$("activeAdmins").textContent =
admins.filter(x=>x.is_active).length;

$("inactiveAdmins").textContent =
admins.filter(x=>!x.is_active).length;

}


/* =====================================
   DISPLAY ADMIN TABLE
===================================== */

function renderAdmins(){

renderStatistics();

const query =
$("searchInput").value.trim().toLowerCase();

const status =
$("statusFilter").value;

const filtered = admins.filter(admin=>{

const searchable = [

admin.full_name,
admin.email,
admin.phone,
getInstitutionName(admin.institution_id)

].join(" ").toLowerCase();

const searchMatch = searchable.includes(query);

const statusMatch =
status === "all" ||
(status === "active" && admin.is_active) ||
(status === "inactive" && !admin.is_active);

return searchMatch && statusMatch;

});

const tbody = $("adminsTable");

if(!filtered.length){

tbody.innerHTML = `
<tr>
<td colspan="7" style="text-align:center;padding:25px">
No School Admin accounts found.
</td>
</tr>
`;

return;

}

tbody.innerHTML = filtered.map(admin=>{

const photo = admin.avatar_url ||
"https://i.ibb.co/4ZCRpm30/gaawow-logo.png";

const roleBadge = admin.is_primary_admin
? '<span class="primary-tag">PRIMARY ADMIN</span>'
: '<span class="additional-tag">ADDITIONAL ADMIN</span>';

return `

<tr>

<td>

<div class="admin-name">

<img
class="admin-avatar"
src="${safe(photo)}"
alt="Admin photo"
onerror="this.src='https://i.ibb.co/4ZCRpm30/gaawow-logo.png'">

<div>
<strong>${safe(admin.full_name || "Unnamed Admin")}</strong>
${admin.phone ? `<br>${safe(admin.phone)}` : ""}
</div>

</div>

</td>

<td>${safe(admin.email || "Not stored")}</td>

<td>

<select
class="assign-select"
data-id="${safe(admin.id)}"
aria-label="Institution assignment">

<option value="">Not assigned</option>

${institutions.filter(item=>item.is_active).map(item=>`

<option
value="${safe(item.id)}"
${item.id === admin.institution_id ? "selected" : ""}>

${safe(item.name)}

</option>

`).join("")}

</select>

</td>

<td>${roleBadge}</td>

<td>

<span class="status ${admin.is_active ? "active" : "inactive"}">

${admin.is_active ? "Active" : "Inactive"}

</span>

</td>

<td>
${admin.created_at
? new Date(admin.created_at).toLocaleDateString()
: "—"}
</td>

<td>

<button
class="small-btn edit-admin"
data-id="${safe(admin.id)}"
type="button">
Edit
</button>

<button
class="small-btn save-assignment"
data-id="${safe(admin.id)}"
type="button">
Save Institution
</button>

${admin.is_active ? `

<button
class="small-btn toggle-status danger"
data-id="${safe(admin.id)}"
data-active="true"
type="button">
Deactivate
</button>

` : `

<button
class="small-btn toggle-status"
data-id="${safe(admin.id)}"
data-active="false"
type="button">
Activate
</button>

`}

${admin.is_active && !admin.is_primary_admin ? `

<button
class="small-btn make-primary gold-btn"
data-id="${safe(admin.id)}"
type="button">
Make Primary
</button>

` : ""}

<button
class="small-btn remove-admin danger"
data-id="${safe(admin.id)}"
type="button">
Remove
</button>

</td>

</tr>

`;

}).join("");

}


/* =====================================
   CREATE SCHOOL ADMIN
===================================== */

async function createSchoolAdmin(event){

event.preventDefault();

const button = $("createBtn");

button.disabled = true;
button.textContent = "Creating...";

const payload = {

full_name: $("full_name").value.trim(),

email: $("email").value.trim().toLowerCase(),

password: $("password").value,

phone: $("phone").value.trim(),

institution_id: $("institution_id").value

};

const adminType = $("admin_type").value;

try{

if(!payload.institution_id){

throw new Error("Please select an institution.");

}

if(payload.password.length < 8){

throw new Error("Password must contain at least 8 characters.");

}

/*
Create Auth user through the deployed Edge Function.
Never create Auth users directly from browser.
*/

const data = await invokeFunction(
"create-school-admin",
payload
);

if(!data || !data.success){

throw new Error(
data?.message || "School Admin creation failed."
);

}

const createdAdmin =
data.school_admin ||
data.admin ||
null;

if(adminType === "primary"){

const newAdminId = createdAdmin?.id;

if(!newAdminId){

notify(
"Admin created, but Primary Admin assignment could not be completed because the creation function did not return the new admin ID.",
"error"
);

}else{

await invokeFunction(
"manage-school-admin",
{
action:"assign_primary",
admin_id:newAdminId
}
);

}

}

$("createAdminForm").reset();

notify(
adminType === "primary"
? "School Admin created and Primary Admin assignment requested."
: "Additional School Admin created successfully.",
"success"
);

await loadAdmins();

}catch(error){

console.error("Create School Admin:",error);

notify(
error.message || "Unable to create School Admin.",
"error"
);

}finally{

button.disabled = false;
button.textContent = "Create School Admin";

}

}


/* =====================================
   CHANGE INSTITUTION
===================================== */

async function saveInstitution(id){

const select = document.querySelector(
`.assign-select[data-id="${CSS.escape(id)}"]`
);

if(!select){

throw new Error("Institution selector not found.");

}

const institutionId = select.value;

if(!institutionId){

throw new Error("Please select an active institution.");

}

const admin = admins.find(x=>x.id === id);

if(!admin){

throw new Error("School Admin not found.");

}

if(admin.institution_id === institutionId){

notify("No institution changes were made.","info");
return;

}

if(!confirm(
"Change this School Admin's institution? The operation will be processed by the secure Edge Function."
)){

return;

}

await invokeFunction(
"manage-school-admin",
{
action:"change_institution",
admin_id:id,
institution_id:institutionId
}
);

notify(
"Institution change request completed successfully.",
"success"
);

await loadAdmins();

}


/* =====================================
   ACTIVATE / DEACTIVATE
===================================== */

async function changeStatus(id,currentStatus){

const nextStatus = !currentStatus;

const action = nextStatus
? "activate"
: "deactivate";

if(!confirm(
`Are you sure you want to ${action} this School Admin?`
)){

return;

}

/*
Edge Function handles Auth ban/unban
and profile active status.
*/

await invokeFunction(
"manage-school-admin",
{
action,
admin_id:id
}
);

notify(
`School Admin ${nextStatus ? "activated" : "deactivated"} successfully.`,
"success"
);

await loadAdmins();

}


/* =====================================
   ASSIGN PRIMARY ADMIN
===================================== */

async function assignPrimary(id){

const admin = admins.find(x=>x.id === id);

if(!admin) throw new Error("Admin not found.");

if(!admin.is_active){

throw new Error("Only an active School Admin can become Primary Admin.");

}

if(!admin.institution_id){

throw new Error("This Admin has no assigned institution.");

}

if(!confirm(
`Make ${admin.full_name} the Primary Admin of ${getInstitutionName(admin.institution_id)}?`
)){

return;

}

await invokeFunction(
"manage-school-admin",
{
action:"assign_primary",
admin_id:id
}
);

notify(
"Primary Admin assignment completed successfully.",
"success"
);

await loadAdmins();

}


/* =====================================
   SOFT REMOVE ADMIN
===================================== */

async function removeAdmin(id){

const admin = admins.find(x=>x.id === id);

if(!admin) throw new Error("Admin not found.");

if(admin.is_primary_admin){

throw new Error(
"Assign another Primary Admin before removing this Primary Admin."
);

}

if(!confirm(
`Soft remove ${admin.full_name}? This will deactivate the account without permanently deleting its records.`
)){

return;

}

await invokeFunction(
"manage-school-admin",
{
action:"remove",
admin_id:id
}
);

notify(
"School Admin was soft-removed successfully. Records were preserved.",
"success"
);

await loadAdmins();

}


/* =====================================
   OPEN EDIT MODAL
===================================== */

function openEditModal(id){

const admin = admins.find(x=>x.id === id);

if(!admin){

notify("School Admin not found.","error");
return;

}

currentAdminId = id;

$("edit_admin_id").value = id;
$("edit_full_name").value = admin.full_name || "";
$("edit_email").value = admin.email || "";
$("edit_phone").value = admin.phone || "";
$("edit_password").value = "";
$("edit_photo").value = "";

$("edit_photo_preview").src =
admin.avatar_url ||
"https://i.ibb.co/4ZCRpm30/gaawow-logo.png";

$("editModal").classList.add("show");

}


/* =====================================
   CLOSE EDIT MODAL
===================================== */

function closeEditModal(){

$("editModal").classList.remove("show");

currentAdminId = null;

$("editAdminForm").reset();

}


/* =====================================
   PHOTO PREVIEW
===================================== */

function previewPhoto(){

const file = $("edit_photo").files[0];

if(!file) return;

const allowedTypes = [
"image/jpeg",
"image/png",
"image/webp"
];

if(!allowedTypes.includes(file.type)){

notify("Only JPEG, PNG and WebP images are allowed.","error");

$("edit_photo").value = "";
return;

}

if(file.size > 2 * 1024 * 1024){

notify("Photo must not exceed 2MB.","error");

$("edit_photo").value = "";
return;

}

const reader = new FileReader();

reader.onload = event=>{

$("edit_photo_preview").src = event.target.result;

};

reader.readAsDataURL(file);

}


/* =====================================
   UPLOAD ADMIN PHOTO
===================================== */

async function uploadAdminPhoto(adminId,file){

if(!file) return null;

const allowedTypes = [
"image/jpeg",
"image/png",
"image/webp"
];

if(!allowedTypes.includes(file.type)){

throw new Error("Unsupported photo format.");

}

if(file.size > 2 * 1024 * 1024){

throw new Error("Photo must not exceed 2MB.");

}

const extension =
file.name.split(".").pop().toLowerCase();

const safeExtension =
["jpg","jpeg","png","webp"].includes(extension)
? extension
: "jpg";

const filePath =
`${adminId}/${Date.now()}.${safeExtension}`;

const {error:uploadError} = await db.storage
.from("school-admin-photos")
.upload(filePath,file,{
upsert:true,
contentType:file.type
});

if(uploadError) throw uploadError;

const {data} = db.storage
.from("school-admin-photos")
.getPublicUrl(filePath);

if(!data?.publicUrl){

throw new Error("Unable to generate photo URL.");

}

return data.publicUrl;

}


/* =====================================
   SAVE ADMIN PROFILE
===================================== */

async function saveAdminProfile(event){

event.preventDefault();

const button = $("saveEditBtn");

button.disabled = true;
button.textContent = "Saving...";

try{

const id = currentAdminId;

if(!id){

throw new Error("No School Admin selected.");

}

const fullName = $("edit_full_name").value.trim();
const email = $("edit_email").value.trim().toLowerCase();
const phone = $("edit_phone").value.trim();
const password = $("edit_password").value;

if(!fullName || !email){

throw new Error("Full Name and Email are required.");

}

if(password && password.length < 8){

throw new Error("New password must contain at least 8 characters.");

}

const payload = {

action:"update_profile",
admin_id:id,
full_name:fullName,
email,
phone

};

if(password){

payload.password = password;

}

const photoFile = $("edit_photo").files[0];

if(photoFile){

const photoUrl = await uploadAdminPhoto(id,photoFile);

payload.avatar_url = photoUrl;

}

/*
The manage-school-admin Edge Function
must accept update_profile.
*/

await invokeFunction(
"manage-school-admin",
payload
);

closeEditModal();

notify(
"School Admin profile updated successfully.",
"success"
);

await loadAdmins();

}catch(error){

console.error("Update School Admin:",error);

notify(
error.message || "Unable to update School Admin.",
"error"
);

}finally{

button.disabled = false;
button.textContent = "Save Changes";

}

}


/* =====================================
   EVENT HANDLERS
===================================== */

function bindEvents(){

$("createAdminForm").addEventListener(
"submit",
createSchoolAdmin
);

$("searchInput").addEventListener(
"input",
renderAdmins
);

$("statusFilter").addEventListener(
"change",
renderAdmins
);

$("testConnectionBtn").addEventListener(
"click",
testConnection
);

$("editAdminForm").addEventListener(
"submit",
saveAdminProfile
);

$("edit_photo").addEventListener(
"change",
previewPhoto
);

$("closeEditModal").addEventListener(
"click",
closeEditModal
);

$("cancelEditBtn").addEventListener(
"click",
closeEditModal
);

$("editModal").addEventListener(
"click",
event=>{

if(event.target === $("editModal")){
closeEditModal();
}

}
);

$("adminsTable").addEventListener(
"click",
async event=>{

const saveButton =
event.target.closest(".save-assignment");

const statusButton =
event.target.closest(".toggle-status");

const editButton =
event.target.closest(".edit-admin");

const primaryButton =
event.target.closest(".make-primary");

const removeButton =
event.target.closest(".remove-admin");

const clickedButton =
saveButton ||
statusButton ||
editButton ||
primaryButton ||
removeButton;

if(!clickedButton) return;

clickedButton.disabled = true;

try{

if(saveButton){

await saveInstitution(saveButton.dataset.id);

}

if(statusButton){

await changeStatus(
statusButton.dataset.id,
statusButton.dataset.active === "true"
);

}

if(editButton){

openEditModal(editButton.dataset.id);

}

if(primaryButton){

await assignPrimary(primaryButton.dataset.id);

}

if(removeButton){

await removeAdmin(removeButton.dataset.id);

}

}catch(error){

console.error("Admin Management:",error);

notify(
error.message || "Operation failed.",
"error"
);

}finally{

clickedButton.disabled = false;

}

}

);

}


/* =====================================
   INITIALIZATION
===================================== */

async function init(){

try{

const allowed = await verifySuperAdmin();

if(!allowed) return;

bindEvents();

await loadInstitutions();

await loadAdmins();

}catch(error){

console.error("School Admin Initialization:",error);

notify(
error.message || "Unable to initialize School Admin Management.",
"error"
);

}

}

document.addEventListener(
"DOMContentLoaded",
init
);

})();
