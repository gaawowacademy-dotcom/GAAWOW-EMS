/* GAAWOW EMS — AUTHENTICATION LETTER GENERATOR — FINAL FIX */
(() => {
  "use strict";

  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = window.GAAWOW_SUPABASE_KEY || "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";

  /* The first two are the intended Authentication Letter assets.
     certificate-template-v9.png remains only as a safe legacy fallback. */
  const TEMPLATE_CANDIDATES = [
    "./Authentication Letter.png",
    "./authentication-letter.png",
    "./certificate-template-v9.png"
  ];

  const W = 1200, H = 1697;
  const $ = id => document.getElementById(id);
  const canvas = $("certificateCanvas");
  const ctx = canvas?.getContext("2d");
  let db = null, user = null, profile = null, template = null;

  function msg(t, type="info") {
    const e = $("message");
    if (e) { e.textContent = t; e.className = `message ${type}`; }
  }
  function setStatus(t) {
    const e = $("previewStatus");
    if (e) e.textContent = t;
  }
  function val(id) { return $(id)?.value?.trim() || ""; }
  function setv(id, v) { if ($(id)) $(id).value = v ?? ""; }
  function today() { return new Date().toISOString().slice(0,10); }
  function dateText(s) {
    if (!s) return "";
    const d = new Date(`${s}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? s
      : d.toLocaleDateString("en-GB", {day:"2-digit", month:"long", year:"numeric"});
  }
  function rnd(n=6) {
    const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let x="";
    for(let i=0;i<n;i++) x += c[Math.floor(Math.random()*c.length)];
    return x;
  }
  function certNo() { return `GAA-AUTH-${new Date().getFullYear()}-${rnd()}`; }
  function certId() { return `GAA-AUTH-${Date.now().toString(36).toUpperCase()}-${rnd(4)}`; }
  function verifyCode() { return `AUTH-${rnd(8)}`; }
  function regenId() { return new URLSearchParams(location.search).get("regen"); }

  function institutionName() {
    const s=$("institutionSelect");
    return s?.selectedOptions?.[0]?.textContent?.trim() || "";
  }
  function courseName() {
    const s=$("courseSelect");
    return s?.selectedOptions?.[0]?.textContent?.trim() || val("courseName");
  }
  function studentName() {
    const s=$("studentSelect");
    return s?.selectedOptions?.[0]?.textContent?.trim() || val("studentName");
  }
  function profileInstitution() {
    return profile?.institution_id || profile?.institutionId || profile?.school_id || null;
  }
  function baseVerify() {
    const file = location.pathname.split("/").pop();
    const dir = location.pathname.slice(0, location.pathname.length - file.length);
    return `${location.origin}${dir}verify-auth.html?code=${encodeURIComponent(val("verifyCode"))}&id=${encodeURIComponent(val("certificateId"))}`;
  }

  function image(src, timeout=8000) {
    return new Promise((resolve, reject) => {
      const i = new Image();
      let done = false;
      const finish = (fn, value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        fn(value);
      };
      const timer = setTimeout(() => finish(reject, new Error(`Template timeout: ${src}`)), timeout);
      i.onload = () => finish(resolve, i);
      i.onerror = () => finish(reject, new Error(`Template not found: ${src}`));
      i.src = src;
    });
  }

  async function loadTemplate() {
    setStatus("Loading GAAWOW Authentication Letter template...");
    for (const src of TEMPLATE_CANDIDATES) {
      try {
        template = await image(src, 8000);
        setStatus(`Template loaded: ${src}`);
        return true;
      } catch (e) {
        console.warn(e.message);
      }
    }
    template = null;
    setStatus("Template lama helin.");
    msg("Authentication Letter template lama helin. Hubi in 'Authentication Letter.png' uu ku jiro root-ka GAAWOW EMS.", "error");
    return false;
  }

  async function auth() {
    if (!window.supabase) throw Error("Supabase CDN lama load-gareyn.");
    if (!SUPABASE_KEY || SUPABASE_KEY.includes("PASTE_YOUR")) {
      throw Error("GAAWOW_SUPABASE_KEY lama dejin.");
    }
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const {data,error} = await db.auth.getUser();
    if (error) throw error;
    if (!data?.user) throw Error("User login ma jiro.");
    user=data.user;
  }

  async function loadProfile() {
    if (!user) return;
    for (const q of [
      db.from("profiles").select("*").eq("id",user.id).maybeSingle(),
      db.from("profiles").select("*").eq("user_id",user.id).maybeSingle()
    ]) {
      try {
        const {data} = await q;
        if (data) { profile=data; return; }
      } catch(e) { console.warn(e); }
    }
  }

  async function institutions() {
    const s=$("institutionSelect");
    if(!s) return;
    s.innerHTML='<option value="">Loading...</option>';
    const {data,error}=await db.from("institutions").select("*").order("name");
    if(error) throw error;
    s.innerHTML='<option value="">Select institution</option>';
    (data||[]).forEach(r=>{
      const o=document.createElement("option");
      o.value=r.id||r.institution_id;
      o.textContent=r.name||r.institution_name||r.title||o.value;
      s.appendChild(o);
    });
    const pid=profileInstitution();
    if(pid){s.value=pid;s.disabled=true;}
  }

  async function students() {
    const s=$("studentSelect");
    if(!s) return;
    s.innerHTML='<option value="">Loading...</option>';
    let q=db.from("students").select("*").order("full_name");
    const iid=$("institutionSelect")?.value;
    if(iid) q=q.eq("institution_id",iid);
    const {data,error}=await q;
    if(error) throw error;
    s.innerHTML='<option value="">Select student</option>';
    (data||[]).forEach(r=>{
      const o=document.createElement("option");
      o.value=r.id||r.student_id;
      o.textContent=r.full_name||r.student_name||r.name||`${r.first_name||""} ${r.last_name||""}`.trim();
      o.dataset.photo=r.photo_url||r.profile_photo||r.student_photo_url||"";
      s.appendChild(o);
    });
  }

  async function courses() {
    const s=$("courseSelect");
    if(!s) return;
    s.innerHTML='<option value="">Loading...</option>';
    const {data,error}=await db.from("courses").select("*").order("name");
    if(error) throw error;
    s.innerHTML='<option value="">Select course</option>';
    (data||[]).forEach(r=>{
      const o=document.createElement("option");
      o.value=r.id||r.course_id;
      o.textContent=r.name||r.course_name||r.title||o.value;
      s.appendChild(o);
    });
  }

  function selectionFields() {
    setv("studentName",studentName());
    setv("courseName",courseName());
    const o=$("studentSelect")?.selectedOptions?.[0], photo=o?.dataset?.photo;
    if(photo && $("studentPhotoPreview")){
      $("studentPhotoPreview").src=photo;
      $("photoBox").style.display="block";
    } else if($("photoBox")) $("photoBox").style.display="none";
  }

  async function qr(text) {
    if(window.QRCode?.toDataURL)
      return new Promise((res,rej)=>QRCode.toDataURL(text,{width:300,margin:1},(e,u)=>e?rej(e):res(u)));
    if(window.qrcode?.toDataURL) return window.qrcode.toDataURL(text,{width:300,margin:1});
    return null;
  }

  function fit(text,max,start,min,family) {
    let n=start;
    while(n>min){
      ctx.font=`700 ${n}px ${family}`;
      if(ctx.measureText(text).width<=max) break;
      n--;
    }
    return n;
  }
  function center(text,x,y,max,o={}) {
    const family=o.family||"Arial";
    const n=fit(text,max,o.size||30,o.min||14,family);
    ctx.save();
    ctx.font=`${o.weight||700} ${n}px ${family}`;
    ctx.fillStyle=o.color||"#111827";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText(text,x,y);
    ctx.restore();
  }
  function text(text,x,y,o={}) {
    ctx.save();
    ctx.font=`${o.weight||400} ${o.size||20}px ${o.family||"Arial"}`;
    ctx.fillStyle=o.color||"#111827";
    ctx.textAlign=o.align||"left";
    ctx.textBaseline="middle";
    ctx.fillText(text,x,y);
    ctx.restore();
  }

  async function draw() {
    if(!ctx) throw Error("Canvas lama helin.");
    ctx.clearRect(0,0,W,H);
    if(template) ctx.drawImage(template,0,0,W,H);
    else {
      ctx.fillStyle="#fff";
      ctx.fillRect(0,0,W,H);
    }

    const sn=studentName()||"STUDENT NAME";
    const cn=courseName()||"Course Name";
    center(sn,W/2,565,900,{size:48,min:24,family:"Georgia",weight:700});
    center(cn,W/2,655,760,{size:30,min:18,color:"#0B1E63"});
    center(institutionName(),W/2,720,850,{size:24,min:14,color:"#374151"});
    text(val("certificateNo"),155,875,{size:20,weight:700});
    text(dateText(val("issueDate")),1045,875,{size:20,weight:700,align:"right"});
    text(dateText(val("dateStarted")),155,945,{size:18,color:"#374151"});
    text(dateText(val("dateCompleted")),1045,945,{size:18,color:"#374151"});
    text(val("directorName"),260,1325,{size:22,weight:700,family:"Georgia",align:"center"});
    text(val("academicHeadName"),940,1325,{size:22,weight:700,family:"Georgia",align:"center"});

    const u=baseVerify();
    try{
      const q=await qr(u);
      if(q){const i=await image(q,5000);ctx.drawImage(i,495,1410,210,210);}
    }catch(e){console.warn("QR:",e);}
    center(val("verifyCode"),W/2,1640,500,{size:18,min:12});
    setStatus(template ? "Authentication Letter preview ready." : "Preview ready without template.");
  }

  function identifiers(){
    if(!val("certificateNo")) setv("certificateNo",certNo());
    if(!val("certificateId")) setv("certificateId",certId());
    if(!val("verifyCode")) setv("verifyCode",verifyCode());
    if(!val("issueDate")) setv("issueDate",today());
  }

  function payload(){
    return {
      reference_no:val("certificateNo"),
      authentication_id:val("certificateId"),
      verification_code:val("verifyCode"),
      student_id:$("studentSelect")?.value||null,
      student_name:studentName(),
      course_id:$("courseSelect")?.value||null,
      course_name:courseName(),
      institution_id:$("institutionSelect")?.value||profileInstitution()||null,
      institution_name:institutionName(),
      date_started:val("dateStarted")||null,
      date_completed:val("dateCompleted")||null,
      issue_date:val("issueDate")||null,
      expiry_date:val("expiryDate")||null,
      status:val("status")||"valid",
      director_name:val("directorName"),
      academic_head_name:val("academicHeadName"),
      verification_url:baseVerify(),
      template_url:"./Authentication Letter.png",
      student_photo_url:$("studentPhotoPreview")?.src||null,
      user_id:user?.id||null
    };
  }

  async function save(){
    try{
      identifiers();
      if(!$("studentSelect")?.value) throw Error("Student dooro.");
      if(!$("courseSelect")?.value) throw Error("Course dooro.");
      await draw();

      const id=regenId();
      let r;
      if(id){
        r=await db.from("authentication_letters")
          .update(payload()).eq("id",id).select().single();
      }else{
        r=await db.from("authentication_letters")
          .insert(payload()).select().single();
      }
      if(r.error) throw r.error;

      if(r.data?.authentication_id) setv("certificateId",r.data.authentication_id);
      if(r.data?.verification_code) setv("verifyCode",r.data.verification_code);

      msg(id ? "Authentication Letter waa la cusboonaysiiyay." : "Authentication Letter waa la keydiyay.","success");
    }catch(e){
      console.error(e);
      msg(`Save error: ${e.message||e}`,"error");
    }
  }

  async function loadExisting(id){
    const {data,error}=await db.from("authentication_letters").select("*").eq("id",id).single();
    if(error) throw error;
    setv("certificateNo",data.reference_no);
    setv("certificateId",data.authentication_id);
    setv("verifyCode",data.verification_code);
    setv("dateStarted",data.date_started);
    setv("dateCompleted",data.date_completed);
    setv("issueDate",data.issue_date);
    setv("expiryDate",data.expiry_date);
    setv("status",data.status||"valid");
    setv("directorName",data.director_name);
    setv("academicHeadName",data.academic_head_name);
    if(data.institution_id) $("institutionSelect").value=data.institution_id;
    await students();
    if(data.student_id) $("studentSelect").value=data.student_id;
    if(data.course_id) $("courseSelect").value=data.course_id;
    selectionFields();
    await draw();
    msg("Regenerate mode: Authentication Letter waa la furay.","info");
  }

  function png(){
    const a=document.createElement("a");
    a.download=`${(val("studentName")||"student").replace(/[^a-z0-9]+/gi,"-")}-authentication-letter.png`;
    a.href=canvas.toDataURL("image/png");
    a.click();
  }

  function pdf(){
    if(!window.jspdf?.jsPDF) throw Error("jsPDF lama helin.");
    const {jsPDF}=window.jspdf;
    const p=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
    p.addImage(canvas.toDataURL("image/png"),"PNG",0,0,210,297);
    p.save(`${(val("studentName")||"student").replace(/[^a-z0-9]+/gi,"-")}-authentication-letter.pdf`);
  }

  function print(){
    const w=window.open("","_blank");
    if(!w) throw Error("Print window waa la xiray.");
    w.document.write(`<html><head><title>Authentication Letter</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}img{width:210mm;height:297mm;display:block}</style></head><body><img src="${canvas.toDataURL("image/png")}" onload="window.print()"></body></html>`);
    w.document.close();
  }

  function verify(){
    window.open(baseVerify(),"_blank","noopener,noreferrer");
  }

  function events(){
    $("studentSelect")?.addEventListener("change",selectionFields);
    $("courseSelect")?.addEventListener("change",selectionFields);
    $("institutionSelect")?.addEventListener("change",()=>students().catch(e=>msg(e.message,"error")));
    $("generateBtn")?.addEventListener("click",async()=>{
      try{identifiers();await draw();}catch(e){msg(`Generate error: ${e.message}`,"error");}
    });
    $("saveBtn")?.addEventListener("click",save);
    $("pngBtn")?.addEventListener("click",()=>{try{png();}catch(e){msg(e.message,"error");}});
    $("pdfBtn")?.addEventListener("click",()=>{try{pdf();}catch(e){msg(e.message,"error");}});
    $("printBtn")?.addEventListener("click",()=>{try{print();}catch(e){msg(e.message,"error");}});
    $("verifyBtn")?.addEventListener("click",verify);
    $("backBtn")?.addEventListener("click",()=>location.href="certificates.html");
  }

  async function init(){
    try{
      if(canvas){canvas.width=W;canvas.height=H;}
      await auth();
      await loadProfile();
      await loadTemplate();
      await institutions();
      await students();
      await courses();
      events();
      identifiers();
      if(regenId()) await loadExisting(regenId());
      else{
        setv("dateStarted",val("dateStarted")||today());
        await draw();
      }
    }catch(e){
      console.error(e);
      msg(`System error: ${e.message||e}`,"error");
      setStatus("Authentication Letter failed to initialize.");
    }
  }

  init();
})();
