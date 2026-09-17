const SUPABASE_URL =
"https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
"sb_publishable_2AvWfupkF1_b0RjIbAi5g_RqLCs145";

const { createClient } = supabase;

const db =
createClient(
SUPABASE_URL,
SUPABASE_KEY
);


const $ = id =>
document.getElementById(id);


let currentVerifyUrl = "";

let currentRecord = null;


/*
====================================================
GAAWOW TEMPLATE ASSETS
====================================================
*/

const assets = {

certificate:
"./assets/certificate-template.png",

/*
Diploma currently uses the approved
GAAWOW certificate artwork as HD base.
Database type remains diploma.
*/
diploma:
"./assets/certificate-template.png",

authentication_letter:
"./assets/authentication-letter-template.png"

};


/*
====================================================
STATUS
====================================================
*/

function msg(text, success = false){

$("status").textContent = text;

$("status").style.background =
success
? "#DCFCE7"
: "#F3F4F6";

}


/*
====================================================
DATE
====================================================
*/

function fmt(date){

return date || "—";

}


/*
====================================================
RANDOM CODE
====================================================
*/

function randomCode(length){

const chars =
"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

let result = "";

for(let i=0;i<length;i++){

result +=
chars[
Math.floor(
Math.random() * chars.length
)
];

}

return result;

}


/*
====================================================
SHA256
====================================================
*/

async function sha256(text){

const data =
new TextEncoder().encode(text);

const hash =
await crypto.subtle.digest(
"SHA-256",
data
);

return [...new Uint8Array(hash)]
.map(
x => x.toString(16).padStart(2,"0")
)
.join("");

}


/*
====================================================
LOAD INSTITUTIONS
====================================================
*/

async function load(){

try{

const {
data,
error
} =
await db
.from("institutions")
.select("id,name")
.order("name");


if(error)
throw error;


$("institution").innerHTML =

'<option value="">Select institution</option>' +

(data || [])
.map(
item =>

`<option value="${item.id}">
${item.name}
</option>`
)
.join("");


$("issueDate").value =
new Date()
.toISOString()
.slice(0,10);


$("templateBg").src =
assets.certificate;


msg(
"Ready. Select Institution, Student and Course."
);


}catch(error){

msg(
"Supabase error: " +
error.message
);

}

}


/*
====================================================
INSTITUTION CHANGE
====================================================
*/

$("institution").onchange =
async function(){

const institutionId =
$("institution").value;


$("student").innerHTML =
'<option value="">Loading students…</option>';

$("course").innerHTML =
'<option value="">Loading courses…</option>';


if(!institutionId)
return;


const [
studentsResult,
coursesResult
] =

await Promise.all([

db
.from("students")
.select(
"id,student_id,full_name,photo_url,status"
)
.eq(
"institution_id",
institutionId
)
.order("full_name"),


db
.from("courses")
.select("id,name")
.eq(
"institution_id",
institutionId
)
.order("name")

]);


$("student").innerHTML =

'<option value="">Select student</option>' +

(studentsResult.data || [])
.filter(
student =>
student.status === "active"
)
.map(
student =>

`<option
value="${student.id}"
data-photo="${encodeURIComponent(student.photo_url || "")}"
data-sid="${student.student_id || ""}"
>
${student.full_name}
 — ${student.student_id || ""}
</option>`
)
.join("");


$("course").innerHTML =

'<option value="">Select course</option>' +

(coursesResult.data || [])
.map(
course =>

`<option value="${course.id}">
${course.name}
</option>`
)
.join("");

};


/*
====================================================
STUDENT CHANGE
====================================================
*/

$("student").onchange =
function(){

const option =
$("student").selectedOptions[0];


if(!option)
return;


const name =
option.textContent
.split(" — ")[0]
.trim();


const photo =
decodeURIComponent(
option.dataset.photo || ""
);


$("photoUrl").value =
photo;


$("studentName").textContent =
name;


$("metaStudentId").textContent =
"Student ID: " +
(option.dataset.sid || "—");


if(photo){

$("studentPhoto").src =
photo;

$("studentPhoto").style.display =
"block";

}

};


/*
====================================================
COURSE CHANGE
====================================================
*/

$("course").onchange =
function(){

$("courseName").textContent =
$("course")
.selectedOptions[0]
?.textContent
.trim()
||
"COURSE NAME";

};


/*
====================================================
TEMPLATE CHANGE
====================================================
*/

$("template").onchange =
function(){

const type =
$("template").value;


$("templateBg").src =
assets[type] ||
assets.certificate;


document.body.classList.toggle(
"letter",
type === "authentication_letter"
);


if(type === "diploma"){

msg(
"Diploma mode selected. Approved GAAWOW HD artwork will be used."
);

}

};


/*
====================================================
SIGNATURES
====================================================
*/

$("director").oninput =
function(){

$("directorText").textContent =
this.value;

};


$("academicHead").oninput =
function(){

$("academicText").textContent =
this.value;

};


/*
====================================================
BUILD CERTIFICATE
====================================================
*/

async function build(){

const institutionId =
$("institution").value;

const studentId =
$("student").value;

const courseId =
$("course").value;


if(
!institutionId ||
!studentId ||
!courseId
){

throw new Error(
"Please select Institution, Student and Course."
);

}


/*
GET STUDENT
*/

const studentResult =
await db
.from("students")
.select("*")
.eq("id",studentId)
.single();


if(studentResult.error)
throw studentResult.error;


const student =
studentResult.data;


/*
GET COURSE
*/

const courseResult =
await db
.from("courses")
.select("*")
.eq("id",courseId)
.single();


if(courseResult.error)
throw courseResult.error;


const course =
courseResult.data;


const issueDate =
$("issueDate").value;


const expiryDate =
$("expiryDate").value ||
null;


const year =
new Date(issueDate).getFullYear();


/*
IDENTIFIERS
*/

const certificateNo =
`GA-CERT-${year}-${randomCode(6)}`;


const certificateId =
`GA-ID-${randomCode(10)}`;


const verifyCode =
`GAW-${year}-${randomCode(8)}`;


/*
VERIFICATION URL
*/

const verificationUrl =

`${location.origin}` +

`${location.pathname
.replace(
"certificate-generator-v3.html",
"verify.html"
)}` +

`?code=${encodeURIComponent(
verifyCode
)}`;


/*
HASH
*/

const hash =
await sha256(

[
certificateNo,
certificateId,
verifyCode,
studentId,
courseId,
issueDate

].join("|")

);


currentVerifyUrl =
verificationUrl;


currentRecord = {

institutionId,
studentId,
courseId,

student,
course,

issueDate,
expiryDate,

certificateNo,
certificateId,
verifyCode,

hash,
verificationUrl

};


/*
UPDATE PREVIEW
*/

$("certIdText").textContent =
certificateId;


$("certNoText").textContent =
certificateNo;


$("issueText").textContent =
fmt(issueDate);


$("expiryText").textContent =
fmt(expiryDate);


$("verifyText").textContent =
verificationUrl;


$("studentName").textContent =
student.full_name ||
"STUDENT NAME";


$("courseName").textContent =
course.name ||
"COURSE NAME";


$("metaStudentId").textContent =
"Student ID: " +
(student.student_id || "—");


const photo =
$("photoUrl").value ||
student.photo_url ||
"";


if(photo){

$("studentPhoto").src =
photo;

$("studentPhoto").style.display =
"block";

}


/*
QR
*/

$("qrBox").innerHTML = "";


new QRCode(
$("qrBox"),
{
text:verificationUrl,
width:112,
height:112,
correctLevel:
QRCode.CorrectLevel.H
}
);


return currentRecord;

}


/*
====================================================
GENERATE + SAVE
====================================================
*/

$("generate").onclick =
async function(){

try{

msg(
"Generating HD document…"
);


const record =
await build();


const type =
$("template").value;


const userResult =
await db.auth.getUser();


const user =
userResult.data;


const row = {

institution_id:
record.institutionId,

student_id:
record.studentId,

course_id:
record.courseId,

certificate_no:
record.certificateNo,

certificate_id:
record.certificateId,

verify_code:
record.verifyCode,

hash_code:
record.hash,

issue_date:
record.issueDate,

expiry_date:
record.expiryDate,

status:
"valid",

certificate_url:
record.verificationUrl,

pdf_url:
null,

qr_url:
record.verificationUrl,

student_name_snapshot:
record.student.full_name,

course_name_snapshot:
record.course.name,

issued_by:
user?.user?.id || null,

certificate_type:
type,

template_url:
assets[type] || null,

student_photo_url:
$("photoUrl").value ||
record.student.photo_url ||
null,

verification_url:
record.verificationUrl

};


const result =
await db
.from("certificates")
.insert(row);


if(result.error)
throw result.error;


msg(
"Saved successfully: " +
record.certificateNo,
true
);


}catch(error){

msg(
"Error: " +
error.message
);

}

};


/*
====================================================
HD PDF
====================================================
*/

$("pdf").onclick =
async function(){

try{

if(!currentRecord){

await build();

}


const canvas =
await html2canvas(
$("certificateCanvas"),
{
scale:3,
useCORS:true,
backgroundColor:"#FFFFFF"
}
);


const { jsPDF } =
window.jspdf;


const pdf =
new jsPDF({

orientation:"landscape",

unit:"px",

format:[
canvas.width,
canvas.height
],

hotfixes:[
"px_scaling"
]

});


pdf.addImage(

canvas.toDataURL(
"image/png"
),

"PNG",

0,
0,

canvas.width,
canvas.height

);


pdf.save(

(
currentRecord?.certificateNo ||
"GAAWOW-Certificate"
)
+
".pdf"

);


}catch(error){

msg(
"PDF error: " +
error.message
);

}

};


/*
====================================================
PRINT
====================================================
*/

$("print").onclick =
async function(){

try{

if(!currentRecord){

await build();

}


const canvas =
await html2canvas(
$("certificateCanvas"),
{
scale:2,
useCORS:true,
backgroundColor:"#FFFFFF"
}
);


const image =
canvas.toDataURL(
"image/png"
);


const win =
window.open(
"",
"_blank"
);


win.document.write(`

<!DOCTYPE html>

<html>

<head>

<title>
GAAWOW Certificate
</title>

<style>

html,
body{
margin:0;
padding:0;
background:white;
}

img{
width:100%;
display:block;
}

</style>

</head>

<body>

<img src="${image}">

<script>

window.onload=function(){

window.print();

};

<\/script>

</body>

</html>

`);


win.document.close();


}catch(error){

msg(
"Print error: " +
error.message
);

}

};


/*
====================================================
VERIFY
====================================================
*/

$("verify").onclick =
function(){

if(currentVerifyUrl){

location.href =
currentVerifyUrl;

}else{

msg(
"Generate the certificate first."
);

}

};


/*
====================================================
CLEAR
====================================================
*/

$("clear").onclick =
function(){

location.reload();

};


/*
====================================================
START
====================================================
*/

load();
