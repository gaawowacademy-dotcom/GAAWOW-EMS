/* GAAWOW EMS Authentication Letter Generator v16 */
(() => {
  "use strict";
  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";
  const W = 1055, H = 1491;
  const TEMPLATE = "./Authentication Letter.png";
  const $ = id => document.getElementById(id);
  const canvas = $("certificateCanvas"), ctx = canvas?.getContext("2d");
  let db, user, profile, template, founderPhoto=null;

  const today = () => new Date().toISOString().slice(0,10);
  const val = id => ($(id)?.value || "").trim();
  const setv = (id,v) => { if ($(id)) $(id).value = v ?? ""; };
  const rand = (n=8) => { const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s=""; for(let i=0;i<n;i++) s+=c[Math.floor(Math.random()*c.length)]; return s; };
  const dateText = s => { if(!s) return ""; const d=new Date(`${s}T00:00:00`); return Number.isNaN(d.getTime())?s:d.toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"}); };
  const msg = (t,type="info") => { const e=$("message"); if(e){e.textContent=t;e.className=`message ${type}`;} };
  const status = t => { const e=$("previewStatus"); if(e)e.textContent=t; };
  const institutionName = () => $("institutionSelect")?.selectedOptions?.[0]?.textContent?.trim() || "";
  const studentOption = () => $("studentSelect")?.selectedOptions?.[0];
  const courseOption = () => $("courseSelect")?.selectedOptions?.[0];
  const studentName = () => studentOption()?.dataset.name || studentOption()?.textContent?.trim() || val("studentName");
  const courseName = () => courseOption()?.dataset.name || courseOption()?.textContent?.trim() || val("courseName");
  const courseCode = () => courseOption()?.dataset.code || val("courseCode");
  const profileInstitution = () => profile?.institution_id || profile?.institutionId || profile?.school_id || null;
  const regenId = () => new URLSearchParams(location.search).get("regen");
  const verifyUrl = () => `${location.origin}${location.pathname.replace(/authentication-letter\.html$/i,"")}verify.html?code=${encodeURIComponent(val("verifyCode"))}&id=${encodeURIComponent(val("certificateId"))}`;

  function identifiers(){
    if(!val("certificateNo")) setv("certificateNo", `GAA-AUTH-${new Date().getFullYear()}-${rand(6)}`);
    if(!val("certificateId")) setv("certificateId", `GAA-AUTH-${Date.now().toString(36).toUpperCase()}-${rand(4)}`);
    if(!val("verifyCode")) setv("verifyCode", `AUTH-${new Date().getFullYear()}-${rand(8)}`);
    if(!val("issueDate")) setv("issueDate", today());
    if(!val("directorName")) setv("directorName", "Dr. Osmaan Mohamed Ibraahin");
    if(!val("authorityName")) setv("authorityName", "GAAWOW ACADEMY");
  }

  async function loadImage(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});}
  function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
  async function drawFounderPhoto(){
    if(!founderPhoto) return;
    try{
      const img=await loadImage(founderPhoto);
      ctx.save();
      // Founder portrait replaces the template's generic founder icon without disturbing the name/signature.
      ctx.beginPath(); ctx.arc(103,1006,31,0,Math.PI*2); ctx.clip();
      const scale=Math.max(62/img.width,62/img.height); const iw=img.width*scale, ih=img.height*scale;
      ctx.drawImage(img,103-iw/2,1006-ih/2,iw,ih);
      ctx.restore();
      ctx.save(); ctx.strokeStyle="#d4a72c"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(103,1006,31,0,Math.PI*2); ctx.stroke(); ctx.restore();
    }catch(e){console.warn('Founder photo',e);}
  }
  async function loadTemplate(){template=await loadImage(TEMPLATE);status("GAAWOW template loaded.");}
  async function auth(){
    if(!window.supabase) throw Error("Supabase library lama load-gareyn.");
    db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    const {data,error}=await db.auth.getUser();
    if(error) throw error;
    if(!data?.user) throw Error("User login ma jiro.");
    user=data.user;
  }
  async function loadProfile(){
    if(!user) return;
    const {data}=await db.from("profiles").select("*").or(`id.eq.${user.id},user_id.eq.${user.id}`).maybeSingle();
    if(data) profile=data;
  }

  function nameOf(r){ return r.full_name || r.student_name || r.name || [r.first_name,r.last_name].filter(Boolean).join(" ") || r.title || r.id || r.student_id || ""; }
  function courseOf(r){ return r.name || r.course_name || r.title || r.program_name || r.id || r.course_id || ""; }
  function codeOf(r){ return r.code || r.course_code || r.courseCode || r.program_code || ""; }

  async function loadInstitutions(){
    const s=$("institutionSelect"); if(!s)return;
    const {data,error}=await db.from("institutions").select("*"); if(error)throw error;
    s.innerHTML='<option value="">Select institution</option>';
    (data||[]).sort((a,b)=>String(a.name||a.institution_name||a.title||"").localeCompare(String(b.name||b.institution_name||b.title||""))).forEach(r=>{const o=document.createElement("option");o.value=r.id||r.institution_id;o.textContent=r.name||r.institution_name||r.title||o.value;s.appendChild(o);});
    const pi=profileInstitution(); if(pi){s.value=pi;s.disabled=true;}
  }
  async function loadStudents(){
    const s=$("studentSelect"); if(!s)return;
    const {data,error}=await db.from("students").select("*"); if(error)throw error;
    const iid=$("institutionSelect")?.value;
    const rows=(data||[]).filter(r=>!iid || String(r.institution_id||r.institutionId||r.school_id||"")===String(iid));
    s.innerHTML='<option value="">Select student</option>';
    rows.sort((a,b)=>nameOf(a).localeCompare(nameOf(b))).forEach(r=>{const o=document.createElement("option");o.value=r.id||r.student_id;o.textContent=nameOf(r);o.dataset.name=nameOf(r);o.dataset.photo=r.photo_url||r.profile_photo||r.student_photo_url||r.avatar_url||"";o.dataset.studentId=r.student_id||r.id||"";o.dataset.grade=r.grade||r.final_grade||r.result||"";o.dataset.started=r.date_started||r.start_date||r.enrollment_date||"";o.dataset.completed=r.date_completed||r.completion_date||r.graduation_date||"";o.dataset.courseId=r.course_id||r.program_id||"";s.appendChild(o);});
  }
  async function loadCourses(){
    const s=$("courseSelect"); if(!s)return;
    const {data,error}=await db.from("courses").select("*"); if(error)throw error;
    const iid=$("institutionSelect")?.value;
    const rows=(data||[]).filter(r=>!iid || !r.institution_id || String(r.institution_id)===String(iid));
    s.innerHTML='<option value="">Select course</option>';
    rows.sort((a,b)=>courseOf(a).localeCompare(courseOf(b))).forEach(r=>{const o=document.createElement("option");o.value=r.id||r.course_id;o.textContent=courseOf(r);o.dataset.name=courseOf(r);o.dataset.code=codeOf(r);s.appendChild(o);});
  }

  function syncStudent(){
    const o=studentOption();
    if(!o)return;
    setv("studentName",o.dataset.name||o.textContent);
    setv("studentIdPreview",o.dataset.studentId||o.value);
    if(o.dataset.grade) setv("grade",o.dataset.grade);
    if(o.dataset.started) setv("dateStarted",o.dataset.started);
    if(o.dataset.completed) setv("dateCompleted",o.dataset.completed);
    if(o.dataset.courseId){const cs=$("courseSelect"); if(cs){cs.value=o.dataset.courseId; if(!cs.value){const match=[...cs.options].find(x=>x.value===o.dataset.courseId);if(match)cs.value=match.value;}}}
    const photo=o.dataset.photo; const img=$("studentPhotoPreview"); const box=$("photoBox"); if(img&&box&&photo){img.src=photo;box.style.display="block";} else if(box) box.style.display="none";
  }
  function syncCourse(){setv("courseName",courseName());setv("courseCode",courseCode());}

  async function qrData(url){
    if(window.QRCode?.toDataURL) return new Promise((res,rej)=>QRCode.toDataURL(url,{width:220,margin:1,errorCorrectionLevel:"M"},(e,u)=>e?rej(e):res(u)));
    if(window.qrcode?.toDataURL) return window.qrcode.toDataURL(url,{width:220,margin:1,errorCorrectionLevel:"M"});
    throw Error("QR library lama load-gareyn.");
  }
  function fit(text,max,start,min=10){let n=start;while(n>min){ctx.font=`700 ${n}px Arial`;if(ctx.measureText(text).width<=max)break;n--;}return n;}
  function drawText(t,x,y,w,h,{size=16,min=9,weight=600,align="left",color="#10204f"}={}){if(!t)return;const n=fit(String(t),w,size,min);ctx.save();ctx.font=`${weight} ${n}px Arial`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline="middle";ctx.fillText(String(t),align==="center"?x:x,y);ctx.restore();}
  function wrap(text,x,y,maxWidth,lineHeight,maxLines=5){ctx.save();ctx.font="500 15px Arial";ctx.fillStyle="#27364a";ctx.textAlign="left";ctx.textBaseline="top";let words=String(text).split(/\s+/),line="",lines=[];for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;if(lines.length>=maxLines)break;}else line=test;}if(lines.length<maxLines&&line)lines.push(line);lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));ctx.restore();}

  async function draw(){
    identifiers(); if(!template) await loadTemplate(); ctx.clearRect(0,0,W,H); ctx.drawImage(template,0,0,W,H);
    const student=studentName(), sid=val("studentIdPreview")||studentOption()?.dataset.studentId||studentOption()?.value||"";
    const course=courseName(), code=courseCode(), grade=val("grade"), stat=val("status")||"VALID";
    const body=`This letter confirms that ${student} (Student ID: ${sid}) was enrolled at ${institutionName()||"GAAWOW ACADEMY"} in ${course||"the stated program"}. The academic record indicates a grade of ${grade||"the recorded grade"}, with studies commencing on ${dateText(val("dateStarted"))||"the stated start date"} and completion recorded on ${dateText(val("dateCompleted"))||"the stated completion date"}. This document is issued by GAAWOW ACADEMY for official authentication and verification purposes.`;
    // Exact 1055x1491 template coordinates. Values sit inside existing blue fields, never on labels.
    // Top metadata: keep labels/design fixed; values are aligned to the right side of their existing boxes.
    drawText(val("certificateNo"), 248, 344, 145, 22, {size:13,min:8,align:"right"});
    drawText(dateText(val("issueDate")), 482, 344, 132, 22, {size:13,min:8,align:"right"});
    drawText(val("verifyCode"), 737, 344, 150, 22, {size:13,min:8,align:"right"});
    drawText(stat.toUpperCase(), 968, 344, 118, 22, {size:13,min:8,align:"right"});
    // Student information: vertically centered inside the actual blue fields.
    drawText(student, 310, 472, 295, 25, {size:17,min:10});
    drawText(sid, 310, 532, 295, 25, {size:17,min:10});
    drawText(course, 310, 593, 295, 25, {size:17,min:10});
    drawText(code, 310, 654, 295, 25, {size:17,min:10});
    drawText(dateText(val("dateStarted")), 976, 472, 295, 25, {size:16,min:10,align:"right"});
    drawText(dateText(val("dateCompleted")), 976, 532, 295, 25, {size:16,min:10,align:"right"});
    drawText(grade, 976, 593, 295, 25, {size:17,min:10,align:"right"});
    drawText(stat.toUpperCase(), 976, 654, 295, 25, {size:17,min:10,align:"right"});
    wrap(body, 112, 760, 825, 23, 6);
    await drawFounderPhoto();
    // Verification section: move every value lower into its own field.
    drawText(val("verifyCode"), 760, 1180, 405, 22, {size:14,min:8,align:"right"});
    drawText(stat.toUpperCase(), 760, 1237, 405, 22, {size:14,min:8,align:"right"});
    drawText(verifyUrl(), 960, 1294, 650, 22, {size:9,min:6,align:"right",weight:500});
    try { const q=await qrData(verifyUrl()); const qi=await loadImage(q); ctx.drawImage(qi, 76, 1180, 126, 126); } catch(e){ console.warn("QR",e); }
    status("Authentication Letter preview ready.");
  }

  function payload(){
    return {
      certificate_no:val("certificateNo"), certificate_id:val("certificateId"), verify_code:val("verifyCode"),
      student_id:$("studentSelect")?.value||null, student_name_snapshot:studentName()||null,
      course_id:$("courseSelect")?.value||null, course_name_snapshot:courseName()||null,
      institution_id:$("institutionSelect")?.value||profileInstitution()||null, institution_name_snapshot:institutionName()||null,
      date_started:val("dateStarted")||null, date_completed:val("dateCompleted")||null, issue_date:val("issueDate")||null, expiry_date:val("expiryDate")||null,
      status:val("status")||"valid", certificate_type:"authentication_letter", director_name:val("directorName")||null,
      verification_url:verifyUrl(), template_url:TEMPLATE, user_id:user?.id||null,
      hash_code:crypto?.subtle ? null : `${val("certificateId")}-${val("verifyCode")}-${Date.now()}`
    };
  }
  async function sha256(s){if(!crypto?.subtle)return s;const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
  async function save(){
    try{
      identifiers(); if(!studentOption()?.value)throw Error("Student dooro."); if(!courseOption()?.value)throw Error("Course dooro."); await draw();
      const p=payload(); p.hash_code=await sha256(`${p.certificate_id}|${p.verify_code}|${p.student_id||""}|${p.course_id||""}`);
      const id=regenId(); let q=id?db.from("certificates").update(p).eq("id",id):db.from("certificates").insert(p);
      let r=await q.select().single();
      if(r.error){
        const m=String(r.error.message||""); const bad=m.match(/Could not find the '([^']+)' column/);
        if(bad && Object.prototype.hasOwnProperty.call(p,bad[1])){delete p[bad[1]];r=await (id?db.from("certificates").update(p).eq("id",id):db.from("certificates").insert(p)).select().single();}
      }
      if(r.error)throw r.error; msg(id?"Authentication Letter waa la cusboonaysiiyay.":"Authentication Letter waa la keydiyay.","success");
    }catch(e){console.error(e);msg(`Save error: ${e.message||e}`,"error");}
  }
  async function loadExisting(id){
    const {data,error}=await db.from("certificates").select("*").eq("id",id).single(); if(error)throw error;
    setv("certificateNo",data.certificate_no);setv("certificateId",data.certificate_id);setv("verifyCode",data.verify_code);setv("dateStarted",data.date_started);setv("dateCompleted",data.date_completed);setv("issueDate",data.issue_date);setv("expiryDate",data.expiry_date);setv("status",data.status||"valid");setv("directorName",data.director_name||"Dr. Osmaan Mohamed Ibraahin");
    if(data.institution_id){$("institutionSelect").value=data.institution_id;await loadStudents();await loadCourses();}
    if(data.student_id){$("studentSelect").value=data.student_id;syncStudent();}
    if(data.course_id)$("courseSelect").value=data.course_id;syncCourse();await draw();msg("Regenerate mode: Authentication Letter waa la furay.","info");
  }
  function png(){const a=document.createElement("a");a.download=`${(studentName()||"student").replace(/[^a-z0-9]+/gi,"-")}-authentication-letter.png`;a.href=canvas.toDataURL("image/png");a.click();}
  function pdf(){const {jsPDF}=window.jspdf||{};if(!jsPDF)throw Error("jsPDF lama helin.");const p=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});p.addImage(canvas.toDataURL("image/png"),"PNG",0,0,210,297);p.save(`${(studentName()||"student").replace(/[^a-z0-9]+/gi,"-")}-authentication-letter.pdf`);}
  function print(){const w=window.open("","_blank");if(!w)throw Error("Print window waa la xiray.");w.document.write(`<html><head><title>Authentication Letter</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}img{width:210mm;height:297mm;display:block}</style></head><body><img src="${canvas.toDataURL("image/png")}" onload="window.print()"></body></html>`);w.document.close();}
  function events(){
    $("institutionSelect")?.addEventListener("change",async()=>{try{await loadStudents();await loadCourses();}catch(e){msg(e.message,"error");}});
    $("studentSelect")?.addEventListener("change",async()=>{syncStudent();try{await draw();}catch(e){msg(e.message,"error");}});
    $("founderPhotoInput")?.addEventListener("change",async(e)=>{const f=e.target.files?.[0];if(!f)return;try{founderPhoto=await fileToDataURL(f);try{localStorage.setItem("gaawow_founder_photo",founderPhoto);}catch(_){} const img=$("founderPhotoPreview"),box=$("founderPhotoBox");if(img){img.src=founderPhoto;}if(box)box.style.display="block";await draw();}catch(err){msg(`Founder photo error: ${err.message||err}`,"error");}});
    $("courseSelect")?.addEventListener("change",async()=>{syncCourse();try{await draw();}catch(e){msg(e.message,"error");}});
    $("generateBtn")?.addEventListener("click",async()=>{try{identifiers();await draw();}catch(e){msg(`Generate error: ${e.message}`,"error");}});
    $("saveBtn")?.addEventListener("click",save); $("pngBtn")?.addEventListener("click",png); $("pdfBtn")?.addEventListener("click",pdf); $("printBtn")?.addEventListener("click",print); $("verifyBtn")?.addEventListener("click",()=>window.open(verifyUrl(),"_blank","noopener,noreferrer"));
    $("backBtn")?.addEventListener("click",()=>location.href="certificates.html");
  }
  async function init(){try{canvas.width=W;canvas.height=H;await auth();await loadProfile();await loadTemplate();await loadInstitutions();await loadStudents();await loadCourses();events();identifiers();
    try{ founderPhoto=localStorage.getItem("gaawow_founder_photo")||null; if(founderPhoto){const img=$("founderPhotoPreview"),box=$("founderPhotoBox");if(img)img.src=founderPhoto;if(box)box.style.display="block";} }catch(_){}
    if(regenId())await loadExisting(regenId());else await draw();}catch(e){console.error(e);msg(`System error: ${e.message||e}`,"error");status("Authentication Letter failed to initialize.");}}
  init();
})();
