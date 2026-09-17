const CONFIG={
 SUPABASE_URL:"https://mytyvqwrxnxpxnxpiicj.supabase.co",
 SUPABASE_KEY:"sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145",
 LOGO:"https://i.ibb.co/4ZCRpm30/gaawow-logo.png",
 VERIFY:"https://gaawowacademy-dotcom.github.io/GAAWOW-EMS/verify.html"
};

const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const date=v=>v?new Date(v+"T00:00:00").toLocaleDateString("en-GB"):"—";

function rand(n=8){
 const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
 return Array.from({length:n},()=>c[Math.floor(Math.random()*c.length)]).join("");
}

function ids(){
 const y=new Date().getFullYear();
 $("certificate_no").value=`GA-C-${y}-${Math.floor(1000+Math.random()*9000)}-${rand(6)}`;
 $("certificate_id").value=`CERT_GA_${y}_${rand(8)}`;
 $("verify_code").value=rand(8);
}

async function students(){
 const r=await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/students?select=*&order=full_name.asc`,{
  headers:{apikey:CONFIG.SUPABASE_KEY,Authorization:"Bearer "+CONFIG.SUPABASE_KEY}
 });
 if(!r.ok)throw Error(await r.text());
 return r.json();
}

async function loadStudents(){
 try{
  const list=await students(), s=$("student_select");
  s.innerHTML='<option value="">— Select registered student —</option>';
  list.forEach(x=>{
   const o=document.createElement("option");
   o.value=x.student_id||x.id;
   o.textContent=`${x.full_name||"Unnamed"} — ${x.student_id||""}`;
   o.dataset.data=JSON.stringify(x);
   s.appendChild(o);
  });
 }catch(e){msg("Unable to load students: "+e.message,"err")}
}

function chooseStudent(){
 const o=$("student_select").selectedOptions[0];
 if(!o||!o.dataset.data)return;
 const x=JSON.parse(o.dataset.data);
 $("student_name").value=x.full_name||"";
 $("student_id").value=x.student_id||"";
 $("photo_url").value=x.photo_url||"";
}

function generate(){
 if(!$("student_name").value.trim()||!$("course_name").value.trim())
  return msg("Select a student and enter/select the course first.","err");

 ids();
 const today=new Date().toISOString().slice(0,10);
 if(!$("issue_date").value)$("issue_date").value=today;
 if(!$("completion_date").value)$("completion_date").value=today;
 render();
 msg("Certificate generated successfully.","ok");
}

function render(){
 const x=Object.fromEntries([
  "student_name","student_id","certificate_id","certificate_no",
  "verify_code","course_name","start_date","completion_date",
  "issue_date","status","photo_url","director_name","signatory_name"
 ].map(k=>[k,$(k)?.value||""]));

 const verify=CONFIG.VERIFY+"?certificate="+encodeURIComponent(x.verify_code);
 $("sheet").innerHTML=`
 <div class="cert">
  <div class="wm">G</div>
  <div class="corner tl"></div><div class="corner tr"></div>
  <div class="corner bl"></div><div class="corner br"></div>

  <aside class="left">
   <div class="photo"><img src="${esc(x.photo_url||"https://via.placeholder.com/250x310?text=STUDENT")}"></div>
   <div class="meta"><b>STUDENT ID</b>${esc(x.student_id||"—")}</div>
   <div class="meta"><b>CERTIFICATE NO.</b>${esc(x.certificate_no||"—")}</div>
   <div class="meta"><b>COMPLETED</b>${date(x.completion_date)}</div>
   <div class="meta"><b>ISSUED</b>${date(x.issue_date)}</div>
  </aside>

  <main class="center">
   <img class="logo" src="${CONFIG.LOGO}">
   <div class="academy">GAAWOW ACADEMY</div>
   <div class="motto">Ilayska Aqoonta iyo Xirfadda</div>
   <div class="title">CERTIFICATE</div>
   <div class="sub">OF COMPLETION</div>
   <div class="present">This certificate is proudly presented to</div>
   <div class="student">${esc(x.student_name||"STUDENT NAME")}</div>
   <div class="text">for successfully completing the required training and demonstrating satisfactory achievement in</div>
   <div class="course">${esc(x.course_name||"COURSE NAME")}</div>
   <div class="location">Bur Hakaba Bay, Somalia</div>
   <div class="id">Certificate ID: <b>${esc(x.certificate_id||"—")}</b></div>
  </main>

  <aside class="right">
   <b class="verify">VERIFY</b>
   <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(verify)}">
   <b>${esc(x.verify_code||"—")}</b>
   <small>Scan QR code to verify</small>
  </aside>

  <div class="signatures">
   <div><div class="line"></div><b>${esc(x.director_name||"ACADEMY DIRECTOR")}</b><small>Academy Director</small></div>
   <div class="seal">GAAWOW<br>ACADEMY</div>
   <div><div class="line"></div><b>${esc(x.signatory_name||"AUTHORIZED SIGNATORY")}</b><small>Authorized Signature</small></div>
  </div>
  <div class="footer">Bur Hakaba Bay, Somalia • 615228824 / 625228824 • GAAWOW Academy</div>
 </div>`;
}

async function save(){
 const p={
  certificate_no:$("certificate_no").value,
  certificate_id:$("certificate_id").value,
  verify_code:$("verify_code").value,
  student_name:$("student_name").value,
  course_name:$("course_name").value,
  issue_date:$("issue_date").value||null,
  expiry_date:null,
  status:($("status").value||"completed").toLowerCase()
 };
 if(!p.student_name||!p.course_name||!p.certificate_no)
  return msg("Generate the certificate first.","err");

 try{
  const r=await fetch(CONFIG.SUPABASE_URL+"/rest/v1/certificates",{
   method:"POST",
   headers:{apikey:CONFIG.SUPABASE_KEY,Authorization:"Bearer "+CONFIG.SUPABASE_KEY,
    "Content-Type":"application/json",Prefer:"return=minimal"},
   body:JSON.stringify(p)
  });
  if(!r.ok)throw Error(await r.text());
  msg("Certificate saved successfully to Supabase.","ok");
 }catch(e){msg("Certificate was NOT saved.<br>"+esc(e.message),"err")}
}

async function download(){
 if(!$("certificate_no").value)generate();
 if(typeof html2canvas==="undefined")
  return msg("HD download library is loading. Please try again.","err");
 const canvas=await html2canvas($("sheet"),{scale:3,useCORS:true,backgroundColor:"#fff"});
 const a=document.createElement("a");
 a.download=($("certificate_no").value||"GAAWOW-Certificate")+".png";
 a.href=canvas.toDataURL("image/png");
 a.click();
}

function msg(t,c){$("msg").innerHTML=`<div class="msg ${c}">${t}</div>`}

document.addEventListener("DOMContentLoaded",()=>{
 loadStudents();
 $("student_select").onchange=chooseStudent;
 $("generateBtn").onclick=generate;
 $("previewBtn").onclick=render;
 $("saveBtn").onclick=save;
 $("downloadBtn").onclick=download;
 $("printBtn").onclick=()=>window.print();
 $("newBtn").onclick=()=>location.reload();
});
