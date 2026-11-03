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
   LOAD INSTITUTIONS
===================================== */

async function loadInstitutions(){

const {data,error} = await db
.from("institutions")
.select("id,name,code,is_active")
.eq("is_active",true)
.order("name");

if(error) throw error;

institutions = data || [];

const select = $("institution_id");

select.innerHTML =
'<option value="">Select Institution</option>' +

institutions.map(item => `

<option value="${safe(item.id)}">
${safe(item.name)}
${item.code ? " ("+safe(item.code)+")" : ""}
</option>

`).join("");

if(!institutions.length){

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

return item.name;

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
created_at
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
<td colspan="6" style="text-align:center;padding:25px">
No School Admin accounts found.
</td>
</tr>
`;

return;

}

tbody.innerHTML = filtered.map(admin=>`

<tr>

<td>
<strong>${safe(admin.full_name)}</strong>
${admin.phone ? `<br>${safe(admin.phone)}` : ""}
</td>

<td>${safe(admin.email || "Not stored")}</td>

<td>

<select
class="assign-select"
data-id="${safe(admin.id)}"
aria-label="Institution assignment">

<option value="">Not assigned</option>

${institutions.map(item=>`

<option
value="${safe(item.id)}"
${item.id === admin.institution_id ? "selected" : ""}>

${safe(item.name)}

</option>

`).join("")}

</select>

</td>

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
class="small-btn save-assignment"
data-id="${safe(admin.id)}"
type="button">

Save Institution

</button>

<button
class="small-btn toggle-status ${admin.is_active ? "danger" : ""}"
data-id="${safe(admin.id)}"
data-active="${admin.is_active}"
type="button">

${admin.is_active ? "Deactivate" : "Activate"}

</button>

</td>

</tr>

`).join("");

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

try{

if(!payload.institution_id){

throw new Error("Please select an institution.");

}

if(payload.password.length < 8){

throw new Error("Password must contain at least 8 characters.");

}

/*
Call deployed Supabase Edge Function.
Do not create Auth user from browser.
*/

const {data,error} = await db.functions.invoke(
"create-school-admin",
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

if(!data || !data.success){

throw new Error(
data?.message || "School Admin creation failed."
);

}

$("createAdminForm").reset();

notify(
`School Admin created successfully. Institution: ${data.institution || "Selected institution"}`,
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

const institutionId = select.value || null;

const {error} = await db
.from("profiles")
.update({
institution_id:institutionId
})
.eq("id",id)
.eq("role","school_admin");

if(error) throw error;

notify(
"Institution assignment updated successfully.",
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

const {error} = await db
.from("profiles")
.update({
is_active:nextStatus
})
.eq("id",id)
.eq("role","school_admin");

if(error) throw error;

notify(
`School Admin ${nextStatus ? "activated" : "deactivated"} successfully.`,
"success"
);

await loadAdmins();

}


/* =====================================
   EVENTS
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

$("adminsTable").addEventListener(
"click",
async event=>{

const saveButton =
event.target.closest(".save-assignment");

const statusButton =
event.target.closest(".toggle-status");

try{

if(saveButton){

saveButton.disabled = true;

await saveInstitution(saveButton.dataset.id);

}

if(statusButton){

statusButton.disabled = true;

await changeStatus(
statusButton.dataset.id,
statusButton.dataset.active === "true"
);

}

}catch(error){

console.error(error);

notify(
error.message || "Database update failed. Check RLS policies.",
"error"
);

}finally{

if(saveButton) saveButton.disabled = false;

if(statusButton) statusButton.disabled = false;

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
