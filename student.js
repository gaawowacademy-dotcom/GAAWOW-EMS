(() => {
"use strict";

const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupKf1b_s0RjIbAi5g_RqLCs145";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
});
const $ = id => document.getElementById(id);

function text(id,value){const e=$(id);if(e)e.textContent=value==null||value===""?"—":String(value);}
function fmtDate(v){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});}
function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[c]));}
function showStatus(msg,type="info"){const e=$("status");if(!e)return;e.className=`status show ${type}`;e.textContent=msg;}
function clearStatus(){const e=$("status");if(e)e.className="status";}

async function currentUser(){
  const {data,error}=await supabase.auth.getUser();
  if(error)throw error;
  return data.user;
}

async function loadStudent(user){
  const {data,error}=await supabase.from("students").select(`
    id,student_id,full_name,email,phone,gender,date_of_birth,
    enrollment_date,admission_date,status,photo_url,auth_user_id,account_enabled,
    institution_id,department_id,course_id,class_id
  `).eq("auth_user_id",user.id).maybeSingle();
  if(error)throw error;
  if(!data)throw new Error("Student profile was not found or is not linked to this login account.");
  if(data.auth_user_id!==user.id)throw new Error("Student account verification failed.");
  return data;
}

async function tryRows(table, filters){
  for(const filter of filters){
    try{
      let q=supabase.from(table).select("*");
      for(const [column,value] of Object.entries(filter)) q=q.eq(column,value);
      const {data,error}=await q;
      if(!error && Array.isArray(data) && data.length) return data;
    }catch(e){console.warn(`${table} lookup:`,e);}
  }
  return [];
}

async function tryOneById(table,id){
  if(!id)return null;
  try{
    const {data,error}=await supabase.from(table).select("*").eq("id",id).maybeSingle();
    if(!error&&data)return data;
  }catch(e){console.warn(`${table} id lookup:`,e);}
  return null;
}

function firstValue(obj,keys){
  for(const k of keys){if(obj&&obj[k]!==undefined&&obj[k]!==null&&String(obj[k]).trim()!=="")return obj[k];}
  return null;
}

async function loadNamedRelation(tableNames,id){
  if(!id)return null;
  for(const table of tableNames){
    const row=await tryOneById(table,id);
    if(row)return row;
  }
  return null;
}

async function loadInstitution(student){
  return loadNamedRelation(["institutions"],student.institution_id);
}

async function loadAcademicRelations(student){
  const [department,course,studentClass]=await Promise.all([
    loadNamedRelation(["departments","academic_departments"],student.department_id),
    loadNamedRelation(["courses","academic_courses","programs"],student.course_id),
    loadNamedRelation(["classes","academic_classes","student_classes"],student.class_id)
  ]);
  return {department,course,studentClass};
}

async function loadPortalRows(table,student,user){
  return tryRows(table,[
    {student_id:student.id},
    {student_db_id:student.id},
    {student_uuid:student.id},
    {auth_user_id:user.id},
    {student_id:student.student_id}
  ]);
}

function relationName(row,fallback){
  return firstValue(row,["name","title","course_name","course_title","department_name","class_name","program_name","label"])||fallback||null;
}

function renderStudent(s,institution,relations,user){
  text("welcomeName",s.full_name||"Student");
  text("studentId",s.student_id);
  text("courseName",relationName(relations.course,s.course_id));
  text("institutionName",institution?.name||s.institution_id);
  text("accountStatus",s.account_enabled?"Active":"Disabled");
  text("fullName",s.full_name);
  text("email",s.email||user.email);
  text("phone",s.phone); text("gender",s.gender);
  text("dob",fmtDate(s.date_of_birth));
  text("enrollmentDate",fmtDate(s.enrollment_date||s.admission_date));
  text("departmentName",relationName(relations.department,s.department_id));
  text("academicCourse",relationName(relations.course,s.course_id));
  text("className",relationName(relations.studentClass,s.class_id));
  text("academicStatus",s.status);

  const img=$("studentPhoto");
  if(img){
    if(s.photo_url){img.src=s.photo_url;img.alt=`Photo of ${s.full_name||"student"}`;}
    else {img.removeAttribute("src");img.alt="No student photo";}
  }
}

function valueFor(row,keys,fallback="—"){
  const v=firstValue(row,keys);
  return v===null?fallback:v;
}

function renderGrades(rows){
  const box=$("gradesBox");if(!box)return;
  if(!rows.length){box.className="box empty";box.textContent="No grade records available yet.";return;}
  box.className="box records";
  box.innerHTML=rows.map((r,i)=>`
    <article class="record-card">
      <div class="record-head"><strong>${esc(valueFor(r,["subject_name","subject","subject_title","course_name","title"],`Subject ${i+1}`))}</strong><span>${esc(valueFor(r,["grade","letter_grade"],"—"))}</span></div>
      <div class="record-grid">
        <div><small>Score</small><b>${esc(valueFor(r,["score","mark","marks","total_score"]))}</b></div>
        <div><small>Exam</small><b>${esc(valueFor(r,["exam_name","exam","assessment","assessment_name"]))}</b></div>
        <div><small>Semester</small><b>${esc(valueFor(r,["semester","term","academic_term"]))}</b></div>
        <div><small>Date</small><b>${esc(fmtDate(firstValue(r,["exam_date","date","created_at"])))}</b></div>
      </div>
    </article>`).join("");
}

function renderCertificates(rows){
  const box=$("certificatesBox");if(!box)return;
  if(!rows.length){box.className="box empty";box.textContent="No certificates available yet.";return;}
  box.className="box records";
  box.innerHTML=rows.map((r,i)=>`
    <article class="record-card">
      <div class="record-head"><strong>${esc(valueFor(r,["certificate_name","title","name","certificate_title"],`Certificate ${i+1}`))}</strong><span>${esc(valueFor(r,["status","certificate_status"],"Issued"))}</span></div>
      <div class="record-grid">
        <div><small>Certificate No.</small><b>${esc(valueFor(r,["certificate_number","certificate_no","number","serial_number"]))}</b></div>
        <div><small>Issue Date</small><b>${esc(fmtDate(firstValue(r,["issue_date","issued_at","date","created_at"])))}</b></div>
        <div><small>Course</small><b>${esc(valueFor(r,["course_name","course","program_name"]))}</b></div>
        <div><small>Verification</small><b>${esc(valueFor(r,["verification_code","verification_id"]))}</b></div>
      </div>
    </article>`).join("");
}

function renderPayments(rows){
  const box=$("paymentsBox");if(!box)return;
  if(!rows.length){box.className="box empty";box.textContent="No payment records available yet.";return;}
  box.className="box records";
  box.innerHTML=rows.map((r,i)=>`
    <article class="record-card">
      <div class="record-head"><strong>${esc(valueFor(r,["description","payment_type","title","invoice_number"],`Payment ${i+1}`))}</strong><span>${esc(valueFor(r,["status","payment_status"],"—"))}</span></div>
      <div class="record-grid">
        <div><small>Amount</small><b>${esc(valueFor(r,["amount","paid_amount","total_amount","fee"]))}</b></div>
        <div><small>Method</small><b>${esc(valueFor(r,["payment_method","method","paid_via"]))}</b></div>
        <div><small>Receipt / Invoice</small><b>${esc(valueFor(r,["receipt_number","receipt_no","invoice_number","transaction_id"]))}</b></div>
        <div><small>Date</small><b>${esc(fmtDate(firstValue(r,["payment_date","paid_at","date","created_at"])))}</b></div>
      </div>
    </article>`).join("");
}

async function loadPortal(){
  try{
    clearStatus();
    const user=await currentUser();
    if(!user){window.location.replace("index.html");return;}
    showStatus("Loading your complete student portal...","info");

    const student=await loadStudent(user);
    const [institution,relations]=await Promise.all([loadInstitution(student),loadAcademicRelations(student)]);
    renderStudent(student,institution,relations,user);

    const [grades,certificates,payments]=await Promise.all([
      loadPortalRows("grades",student,user),
      loadPortalRows("certificates",student,user),
      loadPortalRows("payments",student,user)
    ]);

    renderGrades(grades);
    renderCertificates(certificates);
    renderPayments(payments);

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
