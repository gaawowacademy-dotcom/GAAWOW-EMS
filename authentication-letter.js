const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ids = [
  "recordId","referenceNo","dateIssued","verificationCode","topStatus",
  "studentName","studentId","courseName","courseCode","dateStarted",
  "dateCompleted","grade","studentStatus","letterBody","directorName",
  "awardingAuthority","verificationStatus","verificationUrl"
];

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);

function todayISO(){ return new Date().toISOString().slice(0,10); }
function clean(v){ return v == null ? "" : String(v); }
function esc(v){ return clean(v).trim(); }

function setMessage(msg, error=false){
  const el=$("message");
  el.textContent=msg;
  el.style.background=error ? "#fff0f0" : "#edf5ff";
  el.style.color=error ? "#a32121" : "#1d4f8d";
}

function setField(id,value){
  if($(id)) $(id).value=clean(value);
}

function formatDate(v){
  if(!v) return "";
  const s=String(v);
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  return s;
}

function first(obj, keys){
  for(const k of keys){
    if(obj && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") return obj[k];
  }
  return "";
}

function mapCertificate(row){
  const student = first(row,["student_name","studentName","name"]);
  const course = first(row,["course_name","courseName","program_name","program","course"]);
  const code = first(row,["course_code","courseCode","code"]);
  const sid = first(row,["student_id","studentId","registration_no","registration_number"]);
  const started = first(row,["date_started","dateStarted","start_date","startDate"]);
  const completed = first(row,["date_completed","dateCompleted","completion_date","completionDate"]);
  const issued = first(row,["issue_date","issueDate","issued_at","created_at"]);
  const certNo = first(row,["certificate_no","certificateNo","certificate_number","reference_no","referenceNo","id"]);
  const verify = first(row,["verify_code","verifyCode","verification_code","verificationCode"]);
  const status = first(row,["status","certificate_status"]);
  const grade = first(row,["grade","final_grade","result"]);
  const photo = first(row,["student_photo","studentPhoto","photo_url","photo"]);
  const authority = first(row,["awarding_authority","awardingAuthority","institution_name","institution"]);
  const director = first(row,["director_name","directorName"]);

  setField("referenceNo", certNo ? `GAA-${certNo}` : "");
  setField("dateIssued", formatDate(issued) || todayISO());
  setField("verificationCode", verify || makeVerifyCode());
  setField("topStatus", status || "AUTHENTICATED");
  setField("studentName", student);
  setField("studentId", sid);
  setField("courseName", course);
  setField("courseCode", code);
  setField("dateStarted", formatDate(started));
  setField("dateCompleted", formatDate(completed));
  setField("grade", grade);
  setField("studentStatus", status || "COMPLETED");
  if(authority) setField("awardingAuthority", authority);
  if(director) setField("directorName", director);
  if(photo) setPhoto(photo);
  const vc = esc($("verificationCode").value);
  setField("verificationUrl", buildVerifyUrl(vc));
  render();
}

function makeVerifyCode(){
  return "GA-" + Math.random().toString(36).slice(2,8).toUpperCase() + "-" +
         Math.random().toString(36).slice(2,6).toUpperCase();
}

function buildVerifyUrl(code){
  if(!code) return "";
  return `${location.origin}${location.pathname.replace(/authentication-letter\.html$/i,"")}verification.html?code=${encodeURIComponent(code)}`;
}

async function loadCertificate(){
  const id=esc($("recordId").value);
  if(!id){ setMessage("Enter the Certificate / Record ID first.",true); return; }
  setMessage("Loading certificate record...");
  const {data,error}=await supabaseClient.from("certificates").select("*").eq("id",id).maybeSingle();
  if(error){ setMessage("Supabase error: "+error.message,true); return; }
  if(!data){ setMessage("No certificate record found for this ID.",true); return; }
  mapCertificate(data);
  setMessage("Certificate data loaded successfully.");
}

async function checkAuth(){
  const {data:{user}}=await supabaseClient.auth.getUser();
  if(!user) return true; // allow preview/manual entry; dashboard controls access
  return true;
}

function collect(){
  const data={};
  ids.forEach(id=>data[id]=$(id)?.value || "");
  data.saved_at=new Date().toISOString();
  return data;
}

async function saveLetter(){
  const data=collect();
  if(!data.referenceNo || !data.studentName || !data.courseName || !data.verificationCode){
    setMessage("Reference No., Student Name, Course and Verification Code are required.",true);
    return;
  }
  const recordId=data.recordId;
  const payload={
    certificate_id: recordId || null,
    reference_no:data.referenceNo,
    date_issued:data.dateIssued || null,
    verification_code:data.verificationCode,
    status:data.topStatus,
    student_name:data.studentName,
    student_id:data.studentId,
    course_name:data.courseName,
    course_code:data.courseCode,
    date_started:data.dateStarted || null,
    date_completed:data.dateCompleted || null,
    grade:data.grade,
    student_status:data.studentStatus,
    letter_body:data.letterBody,
    director_name:data.directorName,
    awarding_authority:data.awardingAuthority,
    verification_status:data.verificationStatus,
    verification_url:data.verificationUrl
  };

  // Primary persistence: authentication_letters table.
  const {error}=await supabaseClient.from("authentication_letters").upsert(
    payload,
    {onConflict:"certificate_id"}
  );

  if(error){
    // Safe fallback so the document still works before the table is created.
    localStorage.setItem("gaawow_auth_letter_"+(recordId||data.referenceNo),JSON.stringify(data));
    setMessage("Saved locally. Create the authentication_letters table to enable Supabase saving.",true);
    return;
  }
  setMessage("Authentication Letter saved to Supabase.");
}

function loadLocal(){
  const key="gaawow_auth_letter_"+esc($("recordId").value);
  const raw=localStorage.getItem(key);
  if(!raw) return false;
  try{
    const d=JSON.parse(raw);
    ids.forEach(id=>{ if(d[id]!==undefined) setField(id,d[id]); });
    render(); setMessage("Saved Authentication Letter loaded from this device."); return true;
  }catch(e){ return false; }
}

function setPhoto(src){
  if(!src) return;
  const img=$("previewPhoto");
  img.src=src; img.style.display="block";
}

$("studentPhoto").addEventListener("change",()=>{
  const file=$("studentPhoto").files?.[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{ setPhoto(e.target.result); };
  reader.readAsDataURL(file);
});

function text(id){ return esc($(id)?.value); }

function render(){
  const pairs={
    pReference:text("referenceNo"),pIssued:text("dateIssued"),pVCode:text("verificationCode"),
    pTopStatus:text("topStatus"),pStudentName:text("studentName"),pStudentId:text("studentId"),
    pCourse:text("courseName"),pCourseCode:text("courseCode"),pStarted:text("dateStarted"),
    pCompleted:text("dateCompleted"),pGrade:text("grade"),pStudentStatus:text("studentStatus"),
    pDirector:text("directorName"),pAuthority:text("awardingAuthority"),
    pVerCode:text("verificationCode"),pVerStatus:text("verificationStatus"),
    pVerUrl:text("verificationUrl")
  };
  Object.entries(pairs).forEach(([id,v])=>$(id).textContent=v);
  $("pLetter").textContent=text("letterBody");

  $("qr").innerHTML="";
  const code=text("verificationCode");
  if(code && window.QRCode){
    new QRCode($("qr"),{
      text: text("verificationUrl") || buildVerifyUrl(code),
      width:120,height:120,
      colorDark:"#063b8f",colorLight:"#ffffff",
      correctLevel:QRCode.CorrectLevel.H
    });
  }
}

async function capture(){
  return await html2canvas($("paper"),{
    scale:2,useCORS:true,backgroundColor:"#ffffff",
    width:1087,height:1536
  });
}

async function downloadPNG(){
  const canvas=await capture();
  const a=document.createElement("a");
  a.download=(text("referenceNo")||"Authentication-Letter")+".png";
  a.href=canvas.toDataURL("image/png");
  a.click();
}

async function downloadPDF(){
  const canvas=await capture();
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  pdf.addImage(canvas.toDataURL("image/jpeg",.95),"JPEG",0,0,210,297);
  pdf.save((text("referenceNo")||"Authentication-Letter")+".pdf");
}

ids.forEach(id=>$(id)?.addEventListener("input",render));
$("loadBtn").addEventListener("click",loadCertificate);
$("saveBtn").addEventListener("click",saveLetter);
$("pngBtn").addEventListener("click",downloadPNG);
$("pdfBtn").addEventListener("click",downloadPDF);
$("printBtn").addEventListener("click",()=>window.print());

(async function init(){
  setField("dateIssued",todayISO());
  setField("verificationCode",makeVerifyCode());
  setField("verificationUrl",buildVerifyUrl($("verificationCode").value));

  const regen=params.get("regen");
  if(regen){
    setField("recordId",regen);
    await loadCertificate();
    if(!text("studentName")) loadLocal();
  }else{
    render();
  }
})();
