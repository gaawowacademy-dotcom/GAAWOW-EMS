(() => {
"use strict";

const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
});
const $ = id => document.getElementById(id);

function text(id,value){const e=$(id);if(e)e.textContent=value==null||value===""?"—":String(value);}
function fmtDate(v){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString();}
function showStatus(msg,type="info"){const e=$("status");e.className=`status show ${type}`;e.textContent=msg;}
function clearStatus(){ $("status").className="status"; }

async function currentUser(){
  const {data,error}=await supabase.auth.getUser();
  if(error)throw error;
  return data.user;
}

async function loadStudent(user){
  const {data,error}=await supabase.from("students").select(`
    id,student_id,full_name,email,phone,gender,date_of_birth,
    enrollment_date,status,photo_url,auth_user_id,account_enabled,
    institution_id,department_id,course_id,class_id
  `).eq("auth_user_id",user.id).maybeSingle();

  if(error)throw error;
  if(!data)throw new Error("Student profile was not found or is not linked to this login account.");
  if(data.auth_user_id!==user.id)throw new Error("Student account verification failed.");
  return data;
}

async function loadInstitution(student){
  if(!student.institution_id)return null;
  const {data,error}=await supabase.from("institutions").select("id,name").eq("id",student.institution_id).maybeSingle();
  if(error){console.warn("Institution:",error.message);return null;}
  return data;
}

async function optionalRows(table,studentDbId){
  try{
    const {data,error}=await supabase.from(table).select("*").eq("student_id",studentDbId);
    if(error){console.warn(`${table}:`,error.message);return[];}
    return data||[];
  }catch(e){console.warn(table,e);return[];}
}

function renderStudent(s,institution,user){
  text("welcomeName",s.full_name||"Student");
  text("studentId",s.student_id);
  text("courseName",s.course_id);
  text("institutionName",institution?.name||s.institution_id);
  text("accountStatus",s.account_enabled?"Active":"Disabled");
  text("fullName",s.full_name);
  text("email",s.email||user.email);
  text("phone",s.phone); text("gender",s.gender);
  text("dob",fmtDate(s.date_of_birth));
  text("enrollmentDate",fmtDate(s.enrollment_date));
  text("departmentName",s.department_id);
  text("academicCourse",s.course_id);
  text("className",s.class_id);
  text("academicStatus",s.status);

  const img=$("studentPhoto");
  if(s.photo_url)img.src=s.photo_url; else img.alt="No student photo";
}

function renderGeneric(id,rows,kind){
  const box=$(id);if(!box)return;
  if(!rows.length){box.className="box empty";box.textContent=`No ${kind} records available yet.`;return;}
  box.className="box";
  box.innerHTML=rows.map(r=>{
    let a=r.subject_name??r.subject??r.title??r.certificate_name??r.name??kind;
    let b=r.grade??r.score??r.mark??r.status??r.certificate_number??r.amount??"—";
    return `<div class="detail" style="margin-bottom:8px"><span>${String(a)}</span><strong>${String(b)}</strong></div>`;
  }).join("");
}

async function loadPortal(){
  try{
    clearStatus();
    const user=await currentUser();
    if(!user){window.location.replace("index.html");return;}
    showStatus("Loading your student profile...","info");

    const student=await loadStudent(user);
    const institution=await loadInstitution(student);
    renderStudent(student,institution,user);

    const [grades,certificates,payments]=await Promise.all([
      optionalRows("grades",student.id),
      optionalRows("certificates",student.id),
      optionalRows("payments",student.id)
    ]);

    renderGeneric("gradesBox",grades,"grade");
    renderGeneric("certificatesBox",certificates,"certificate");
    renderGeneric("paymentsBox",payments,"payment");

    showStatus("Student portal loaded successfully.","success");
    setTimeout(clearStatus,2500);
  }catch(error){
    console.error("STUDENT PORTAL ERROR:",error);
    showStatus(error?.message||"Unable to load student portal.","error");
  }
}

$("logoutBtn")?.addEventListener("click",async()=>{
  const b=$("logoutBtn");b.disabled=true;b.textContent="LOGGING OUT...";
  const {error}=await supabase.auth.signOut();
  if(error){console.error(error);b.disabled=false;b.textContent="LOGOUT";showStatus("Logout failed.","error");return;}
  sessionStorage.clear();window.location.replace("index.html");
});

supabase.auth.onAuthStateChange((event,session)=>{
  if(event==="SIGNED_OUT"&&!session)window.location.replace("index.html");
});

loadPortal();
})();