const SUPABASE_URL="https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_KEY="sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id), params=new URLSearchParams(location.search);

function v(id){return ($(id)?.value||"").trim()}
function set(id,x){if($(id))$(id).value=x==null?"":String(x)}
function msg(t,e=false){$("msg").textContent=t;$("msg").style.background=e?"#fff0f0":"#edf5ff";$("msg").style.color=e?"#a32121":"#1d4f8d"}
function iso(x){if(!x)return"";let s=String(x);return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):s}
function pick(o,keys){for(const k of keys)if(o?.[k]!=null&&String(o[k]).trim()!=="")return o[k];return""}
function year(){return new Date().getFullYear()}
function makeRef(cert){
  const raw=String(cert||"").replace(/[^A-Za-z0-9]/g,"").slice(-8).toUpperCase();
  return `AUTH-${year()}-${raw||Math.random().toString(36).slice(2,8).toUpperCase()}`;
}
function makeCode(){return"GA-"+cryptoRandom(6)+"-"+cryptoRandom(4)}
function cryptoRandom(n){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let out="";if(window.crypto?.getRandomValues){const a=new Uint32Array(n);crypto.getRandomValues(a);for(let x of a)out+=chars[x%chars.length]}else for(let i=0;i<n;i++)out+=chars[Math.floor(Math.random()*chars.length)];return out}
function verifyUrl(c){return `${location.origin}${location.pathname.replace(/authentication-letter\.html$/i,"")}verification.html?code=${encodeURIComponent(c)}`}

async function byId(table,id){
  if(!id)return null;
  const {data,error}=await supabaseClient.from(table).select("*").eq("id",id).maybeSingle();
  return error?null:data;
}
async function loadRelated(cert){
  let student=null,institution=null;
  const sid=pick(cert,["student_id","studentId"]);
  const iid=pick(cert,["institution_id","institutionId"]);
  if(sid) student=await byId("students",sid);
  if(iid) institution=await byId("institutions",iid);
  return {student,institution};
}

function defaultLetter(data){
 const institution=data.institution||"GAAWOW ACADEMY";
 return `TO WHOM IT MAY CONCERN,

This is to certify that ${data.student||"the above-named student"} has successfully completed the ${data.course||"academic program"} at ${institution}. According to the academic record maintained by the institution, the student completed the program on ${data.completed||"the date stated above"} with a grade of ${data.grade||"N/A"}.

This authentication letter is issued for official verification purposes. The information may be verified using the verification code and QR code provided below.`;
}

function apply(cert,student,institution){
 const s={...cert,...(student||{})}, i={...institution};
 const studentName=pick(s,["student_name","studentName","full_name","name"]);
 const studentId=pick(s,["student_id","studentId","registration_no","registration_number"]);
 const course=pick(s,["course_name","courseName","program_name","program","course"]);
 const courseCode=pick(s,["course_code","courseCode"]);
 const started=iso(pick(s,["date_started","dateStarted","start_date","startDate"]));
 const completed=iso(pick(s,["date_completed","dateCompleted","completion_date","completionDate"]));
 const issued=iso(pick(s,["issue_date","issueDate","issued_at","created_at"]))||new Date().toISOString().slice(0,10);
 const grade=pick(s,["grade","final_grade","result","final_result"]);
 const status=pick(s,["status","certificate_status"])||"COMPLETED";
 const photo=pick(s,["student_photo","studentPhoto","photo_url","photo","image_url"]);
 const institutionName=pick(i,["name","institution_name","institutionName","title"])||pick(cert,["institution_name","institutionName","institution"]);
 const director=pick(i,["director_name","directorName","founder_name","founderName"])||pick(cert,["director_name","directorName"])||"Dr. Osmaan Mohamed Ibraahin";
 const authority=institutionName||"GAAWOW ACADEMY";
 const certNo=pick(cert,["certificate_no","certificateNo","certificate_number","serial_number","id"]);
 set("referenceNo",makeRef(certNo)); set("dateIssued",issued); set("verificationCode",pick(cert,["verify_code","verifyCode","verification_code","verificationCode"])||makeCode());
 set("topStatus","AUTHENTICATED");set("institutionName",institutionName);set("studentName",studentName);set("studentId",studentId);
 set("courseName",course);set("courseCode",courseCode);set("dateStarted",started);set("dateCompleted",completed);set("grade",grade);set("studentStatus",status);set("studentPhotoUrl",photo);
 set("directorName",director);set("awardingAuthority",authority);set("verificationStatus","AUTHENTIC");set("verificationUrl",verifyUrl(v("verificationCode")));
 if(!v("letterBody"))set("letterBody",defaultLetter({institution:institutionName,student:studentName,course,completed,grade}));
 if(photo)showPhoto(photo);
 render();
}

function showPhoto(src){if(!src)return;const im=$("previewPhoto");im.src=src;im.style.display="block"}
$("studentPhoto").addEventListener("change",e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=x=>showPhoto(x.target.result);r.readAsDataURL(f)});

function render(){
 const m={pReference:"referenceNo",pIssued:"dateIssued",pVCode:"verificationCode",pTopStatus:"topStatus",pStudentName:"studentName",pStudentId:"studentId",pCourse:"courseName",pCourseCode:"courseCode",pStarted:"dateStarted",pCompleted:"dateCompleted",pGrade:"grade",pStudentStatus:"studentStatus",pDirector:"directorName",pAuthority:"awardingAuthority",pVerCode:"verificationCode",pVerStatus:"verificationStatus",pVerUrl:"verificationUrl"};
 Object.entries(m).forEach(([a,b])=>$(a).textContent=v(b));$("pLetter").textContent=v("letterBody");
 $("qr").innerHTML="";const code=v("verificationCode"),url=v("verificationUrl");if(code&&window.QRCode)new QRCode($("qr"),{text:url,width:112,height:112,colorDark:"#063b8f",colorLight:"#fff",correctLevel:QRCode.CorrectLevel.H});
}

async function load(){
 const id=v("recordId");if(!id){msg("Certificate Record ID is required.",true);return}
 msg("Loading certificate, student and institution data...");
 const {data:cert,error}=await supabaseClient.from("certificates").select("*").eq("id",id).maybeSingle();
 if(error){msg("Certificate query error: "+error.message,true);return}
 if(!cert){msg("Certificate record not found.",true);return}
 const {student,institution}=await loadRelated(cert);
 apply(cert,student,institution);
 msg("All available certificate, student and institution data loaded automatically.");
}

async function save(){
 const recordId=v("recordId");
 if(!recordId){msg("No Certificate Record ID.",true);return}
 const payload={certificate_id:recordId,reference_no:v("referenceNo"),date_issued:v("dateIssued")||null,verification_code:v("verificationCode"),status:v("topStatus"),student_name:v("studentName"),student_id:v("studentId"),course_name:v("courseName"),course_code:v("courseCode"),date_started:v("dateStarted")||null,date_completed:v("dateCompleted")||null,grade:v("grade"),student_status:v("studentStatus"),letter_body:v("letterBody"),director_name:v("directorName"),awarding_authority:v("awardingAuthority"),verification_status:v("verificationStatus"),verification_url:v("verificationUrl"),updated_at:new Date().toISOString()};
 const {error}=await supabaseClient.from("authentication_letters").upsert(payload,{onConflict:"certificate_id"});
 if(error){msg("Save failed: "+error.message+". Run authentication_letters.sql first.",true);return}
 msg("Authentication Letter saved successfully.");
}

async function capture(){return html2canvas($("paper"),{scale:2,useCORS:true,backgroundColor:"#fff"})}
async function png(){const c=await capture(),a=document.createElement("a");a.download=v("referenceNo")+".png";a.href=c.toDataURL("image/png");a.click()}
async function pdf(){const c=await capture(),{jsPDF}=window.jspdf,p=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});p.addImage(c.toDataURL("image/jpeg",.96),"JPEG",0,0,210,297);p.save(v("referenceNo")+".pdf")}

$("loadBtn").onclick=load;$("saveBtn").onclick=save;$("pngBtn").onclick=png;$("pdfBtn").onclick=pdf;$("printBtn").onclick=()=>print();
$("letterBody").addEventListener("input",render);$("directorName").addEventListener("input",render);$("awardingAuthority").addEventListener("input",render);$("verificationStatus").addEventListener("input",render);

(async function(){
 const id=params.get("regen");if(id){set("recordId",id);await load()}else{set("referenceNo",makeRef("NEW"));set("verificationCode",makeCode());set("dateIssued",new Date().toISOString().slice(0,10));set("verificationUrl",verifyUrl(v("verificationCode")));set("topStatus","AUTHENTICATED");render()}
})();
