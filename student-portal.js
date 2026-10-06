(() => {
"use strict";

const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = id => document.getElementById(id);
const esc = v => String(v ?? "—").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const date = v => v ? new Date(v).toLocaleDateString() : "—";
const num = v => v === null || v === undefined ? "—" : Number(v).toLocaleString();
function msg(text, type="error"){ const e=$("message"); e.textContent=text; e.className=`message ${type}`; }
function empty(tbody, cols, text="No records found"){ $(tbody).innerHTML=`<tr><td colspan="${cols}" class="empty">${esc(text)}</td></tr>`; }

async function query(table, columns, filters=[]) {
  let q = sb.from(table).select(columns);
  for (const [method, field, value] of filters) q = q[method](field, value);
  const {data,error}=await q;
  if(error) throw new Error(`${table}: ${error.message}`);
  return data || [];
}

async function init(){
  try{
    const {data:{session}} = await sb.auth.getSession();
    if(!session?.user){ location.href="login.html"; return; }

    const students = await query("students",
      "id,institution_id,profile_id,student_id,full_name,gender,date_of_birth,phone,email,address,photo_url,admission_date,status,account_enabled,auth_user_id",
      [["eq","auth_user_id",session.user.id]]
    );
    if(!students.length) throw new Error("Student record was not found for this login account.");
    const student = students[0];

    let enrollments = await query("enrollments",
      "id,institution_id,student_id,course_id,class_id,enrollment_number,enrollment_date,start_date,end_date,status",
      [["eq","student_id",student.id]]
    );
    enrollments.sort((a,b)=>String(b.enrollment_date||"").localeCompare(String(a.enrollment_date||"")));
    const enrollment = enrollments[0] || null;

    let course=null, cls=null, dept=null, institution=null;
    if(enrollment?.course_id){
      const rows=await query("courses","id,institution_id,department_id,name,code,description,duration_months,fee,is_active",[["eq","id",enrollment.course_id]]);
      course=rows[0]||null;
      if(course?.department_id){
        const d=await query("departments","id,institution_id,name,code,description,is_active",[["eq","id",course.department_id]]);
        dept=d[0]||null;
      }
    }
    if(enrollment?.class_id){
      const c=await query("classes","id,institution_id,course_id,name,code,academic_year,room,start_date,end_date,is_active,status",[["eq","id",enrollment.class_id]]);
      cls=c[0]||null;
    }
    if(student.institution_id){
      const i=await query("institutions","id,name,code,email,phone,address,city,country,logo_url,website_url,is_active",[["eq","id",student.institution_id]]);
      institution=i[0]||null;
    }

    const [progress,grades,certificates,payments] = await Promise.all([
      query("academic_progress","id,institution_id,student_id,course_id,academic_year,total_courses,completed_courses,attendance_percentage,average_score,remarks,created_at,updated_at",[["eq","student_id",student.id]]),
      query("grades","id,institution_id,exam_id,student_id,score,grade,remarks,created_at,updated_at",[["eq","student_id",student.id]]),
      query("certificates","id,institution_id,student_id,course_id,certificate_no,certificate_id,verify_code,issue_date,expiry_date,status,certificate_url,pdf_url,qr_url,student_name_snapshot,course_name_snapshot,verification_url,created_at",[["eq","student_id",student.id]]),
      query("payments","id,institution_id,invoice_id,student_id,amount,currency,payment_method,provider,provider_transaction_id,transaction_reference,status,paid_at,created_at",[["eq","student_id",student.id]])
    ]);

    render(student,enrollment,course,cls,dept,institution,progress,grades,certificates,payments);
    $("loading").style.display="none"; $("portal").style.display="block";
  }catch(e){
    console.error(e); $("loading").style.display="none"; msg(e.message || "Unable to load portal.");
  }
}

function render(s,e,c,cl,d,i,p,g,cert,pay){
  $("studentName").textContent=s.full_name||"Student";
  $("studentId").textContent=s.student_id||"";
  $("studentStatus").textContent=String(s.status||"—");
  if(s.photo_url){ $("photo").outerHTML=`<img id="photo" class="avatar" src="${esc(s.photo_url)}" alt="Student photo">`; }

  $("courseName").textContent=c?.name||"—";
  $("className").textContent=cl?.name||"—";
  $("departmentName").textContent=d?.name||"—";
  const latest=p[0];
  $("averageScore").textContent=latest?.average_score!=null ? `${num(latest.average_score)}%` : "—";

  $("academicInfo").innerHTML=[
    ["Course Code",c?.code],["Class Code",cl?.code],["Academic Year",cl?.academic_year||latest?.academic_year],
    ["Department Code",d?.code],["Enrollment No.",e?.enrollment_number],["Enrollment Date",date(e?.enrollment_date)],
    ["Start Date",date(e?.start_date)],["End Date",date(e?.end_date)],["Institution",i?.name]
  ].map(x=>`<div class="item"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join("");

  if(!p.length) empty("progressBody",6); else $("progressBody").innerHTML=p.map(x=>`<tr><td>${esc(x.academic_year)}</td><td>${esc(x.total_courses)}</td><td>${esc(x.completed_courses)}</td><td>${x.attendance_percentage!=null?esc(x.attendance_percentage)+"%":"—"}</td><td>${x.average_score!=null?esc(x.average_score)+"%":"—"}</td><td>${esc(x.remarks)}</td></tr>`).join("");

  if(!g.length) empty("gradesBody",4); else $("gradesBody").innerHTML=g.map(x=>`<tr><td>${esc(x.score)}</td><td><span class="status">${esc(x.grade)}</span></td><td>${esc(x.remarks)}</td><td>${date(x.created_at)}</td></tr>`).join("");

  if(!cert.length) empty("certificatesBody",6); else $("certificatesBody").innerHTML=cert.map(x=>{
    const link=x.verification_url||x.certificate_url||x.pdf_url||"";
    return `<tr><td>${esc(x.certificate_no||x.certificate_id)}</td><td>${esc(x.course_name_snapshot)}</td><td>${date(x.issue_date)}</td><td>${date(x.expiry_date)}</td><td><span class="status">${esc(x.status)}</span></td><td>${link?`<a href="${esc(link)}" target="_blank" rel="noopener">Open</a>`:"—"}</td></tr>`;
  }).join("");

  if(!pay.length) empty("paymentsBody",6); else $("paymentsBody").innerHTML=pay.map(x=>`<tr><td class="money">${esc(num(x.amount))}</td><td>${esc(x.currency)}</td><td>${esc(x.payment_method)}</td><td>${esc(x.transaction_reference||x.provider_transaction_id)}</td><td><span class="status">${esc(x.status)}</span></td><td>${date(x.paid_at)}</td></tr>`).join("");

  $("profileInfo").innerHTML=[
    ["Full Name",s.full_name],["Student ID",s.student_id],["Gender",s.gender],["Date of Birth",date(s.date_of_birth)],
    ["Phone",s.phone],["Email",s.email],["Address",s.address],["Admission Date",date(s.admission_date)],
    ["Institution",i?.name],["City",i?.city],["Country",i?.country],["Account Enabled",s.account_enabled?"Yes":"No"]
  ].map(x=>`<div class="item"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join("");
}

$("logoutBtn").addEventListener("click",async()=>{await sb.auth.signOut();location.href="login.html";});
sb.auth.onAuthStateChange((event)=>{ if(event==="SIGNED_OUT") location.href="login.html"; });
init();
})();
