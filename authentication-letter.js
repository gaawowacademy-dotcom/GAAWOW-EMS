/* GAAWOW EMS Authentication Letter v13
   A4 template renderer + schema-safe Supabase persistence.
*/
(() => {
  'use strict';

  const SUPABASE_URL = 'https://mytyvqwrxnxpxnxpiicj.supabase.co';
  const SUPABASE_KEY = window.GAAWOW_SUPABASE_KEY || 'sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145';
  const TEMPLATE = './Authentication Letter.png';
  const W = 1055, H = 1491;
  const $ = id => document.getElementById(id);
  const canvas = $('certificateCanvas');
  const ctx = canvas?.getContext('2d');
  let db = null, user = null, profile = null, template = null;
  const studentRows = [], courseRows = [];

  const G = {
    top: {
      reference: {x: 172, y: 346, max: 150},
      issued: {x: 421, y: 346, max: 145},
      verify: {x: 670, y: 346, max: 150},
      status: {x: 897, y: 346, max: 105}
    },
    student: {
      name: {x: 310, y: 478, max: 290},
      id: {x: 310, y: 539, max: 290},
      course: {x: 310, y: 601, max: 290},
      code: {x: 310, y: 662, max: 290},
      started: {x: 681, y: 478, max: 285},
      completed: {x: 681, y: 539, max: 285},
      grade: {x: 681, y: 601, max: 285},
      status: {x: 681, y: 662, max: 285}
    },
    photo: {x: 57, y: 444, w: 178, h: 210},
    body: {x: 62, y: 748, w: 930, maxLines: 5, line: 28},
    verification: {
      qr: {x: 80, y: 1179, size: 112},
      code: {x: 355, y: 1191, max: 390},
      status: {x: 355, y: 1247, max: 390},
      url: {x: 355, y: 1300, max: 600}
    }
  };

  function msg(t, type='info'){const e=$('message');if(e){e.textContent=t;e.className=`message ${type}`;}}
  function setStatus(t){const e=$('previewStatus');if(e)e.textContent=t;}
  function val(id){return $(id)?.value?.trim() || '';}
  function setv(id,v){if($(id))$(id).value=v ?? '';}
  function today(){return new Date().toISOString().slice(0,10);}
  function fmtDate(s){if(!s)return '';const d=new Date(`${s}T00:00:00`);return Number.isNaN(d.getTime())?String(s):d.toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});}
  function rnd(n=6){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<n;i++)s+=c[Math.floor(Math.random()*c.length)];return s;}
  function certNo(){return `GAA-AUTH-${new Date().getFullYear()}-${rnd(6)}`;}
  function certId(){return `GAA-AUTH-${Date.now().toString(36).toUpperCase()}-${rnd(4)}`;}
  function verifyCode(){return `AUTH-${new Date().getFullYear()}-${rnd(8)}`;}
  function regenId(){return new URLSearchParams(location.search).get('regen');}
  function textField(row){return row?.name || row?.full_name || row?.student_name || row?.course_name || row?.institution_name || row?.title || row?.label || row?.display_name || ''}
  function studentName(){const o=$('studentSelect')?.selectedOptions?.[0];return o?.dataset?.name || o?.textContent?.trim() || val('studentName');}
  function courseName(){const o=$('courseSelect')?.selectedOptions?.[0];return o?.dataset?.name || o?.textContent?.trim() || val('courseName');}
  function institutionName(){return $('institutionSelect')?.selectedOptions?.[0]?.textContent?.trim() || '';}
  function profileInstitution(){return profile?.institution_id || profile?.institutionId || profile?.school_id || null;}
  function baseVerify(){const dir=location.pathname.substring(0,location.pathname.lastIndexOf('/')+1);return `${location.origin}${dir}verify.html?code=${encodeURIComponent(val('verifyCode'))}&id=${encodeURIComponent(val('certificateId'))}`;}

  async function sha256(s){const b=new TextEncoder().encode(s);const h=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');}
  async function loadImage(src){return new Promise((resolve,reject)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});}
  async function loadTemplate(){try{template=await loadImage(TEMPLATE);setStatus('GAAWOW Authentication Letter template loaded.');}catch(e){try{template=await loadImage('./Authentication Letter.png');setStatus('GAAWOW template loaded.');}catch(err){throw Error('Authentication Letter PNG lama helin.');}}}

  async function auth(){if(!window.supabase)throw Error('Supabase CDN lama load-gareyn.');db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);const {data,error}=await db.auth.getUser();if(error)throw error;if(!data?.user)throw Error('User login ma jiro.');user=data.user;}
  async function loadProfile(){if(!user)return;for(const p of [{id:user.id},{user_id:user.id}]){const {data}=await db.from('profiles').select('*').match(p).maybeSingle();if(data){profile=data;return;}}}
  function optionText(r, kind){if(kind==='student')return r.full_name||r.student_name||r.name||r.display_name||[r.first_name,r.last_name].filter(Boolean).join(' ')||r.id||r.student_id||'Student';if(kind==='course')return r.name||r.course_name||r.title||r.program_name||r.label||r.id||r.course_id||'Course';return r.name||r.institution_name||r.title||r.label||r.id||r.institution_id||'Institution';}
  function byId(r){return r.id||r.student_id||r.course_id||r.institution_id;}
  function sortRows(a,b,kind){return optionText(a,kind).localeCompare(optionText(b,kind));}
  async function institutions(){const s=$('institutionSelect');if(!s)return;s.innerHTML='<option value="">Loading...</option>';const {data,error}=await db.from('institutions').select('*');if(error)throw error;s.innerHTML='<option value="">Select institution</option>';(data||[]).sort((a,b)=>sortRows(a,b,'institution')).forEach(r=>{const o=document.createElement('option');o.value=byId(r);o.textContent=optionText(r,'institution');o.dataset.name=o.textContent;s.appendChild(o);});const pid=profileInstitution();if(pid){s.value=pid;s.disabled=true;}}
  async function students(){const s=$('studentSelect');if(!s)return;s.innerHTML='<option value="">Loading...</option>';let q=db.from('students').select('*');const iid=$('institutionSelect')?.value;if(iid)q=q.eq('institution_id',iid);const {data,error}=await q;if(error)throw error;studentRows.splice(0,studentRows.length,...(data||[]));s.innerHTML='<option value="">Select student</option>';studentRows.sort((a,b)=>sortRows(a,b,'student')).forEach(r=>{const o=document.createElement('option');o.value=byId(r);o.textContent=optionText(r,'student');o.dataset.name=o.textContent;o.dataset.studentId=r.student_id||r.student_no||r.registration_no||r.admission_no||r.id||'';o.dataset.courseId=r.course_id||r.program_id||'';o.dataset.grade=r.grade||r.final_grade||r.result_grade||'';o.dataset.started=r.date_started||r.start_date||r.enrollment_date||'';o.dataset.completed=r.date_completed||r.completion_date||r.graduation_date||'';o.dataset.photo=r.photo_url||r.profile_photo||r.student_photo_url||r.avatar_url||r.photo||'';s.appendChild(o);});}
  async function courses(){const s=$('courseSelect');if(!s)return;s.innerHTML='<option value="">Loading...</option>';const {data,error}=await db.from('courses').select('*');if(error)throw error;courseRows.splice(0,courseRows.length,...(data||[]));s.innerHTML='<option value="">Select course</option>';courseRows.sort((a,b)=>sortRows(a,b,'course')).forEach(r=>{const o=document.createElement('option');o.value=byId(r);o.textContent=optionText(r,'course');o.dataset.name=o.textContent;o.dataset.code=r.code||r.course_code||r.courseCode||r.code_name||r.short_code||'';o.dataset.institutionId=r.institution_id||r.school_id||'';s.appendChild(o);});filterCourses();}
  function filterCourses(){const s=$('courseSelect'),iid=$('institutionSelect')?.value;if(!s)return;for(const o of [...s.options]){if(!o.value)continue;const row=courseRows.find(r=>String(byId(r))===String(o.value));const ci=row?.institution_id||row?.school_id||'';o.hidden=!!(iid&&ci&&String(ci)!==String(iid));}if(s.selectedOptions[0]?.hidden)s.value='';}
  function selectionFields(){const so=$('studentSelect')?.selectedOptions?.[0];const co=$('courseSelect')?.selectedOptions?.[0];if(so){setv('studentName',so.dataset.name||so.textContent);setv('studentIdPreview',so.dataset.studentId||so.value);if(so.dataset.started)setv('dateStarted',so.dataset.started);if(so.dataset.completed)setv('dateCompleted',so.dataset.completed);if(so.dataset.grade)setv('grade',so.dataset.grade);if(so.dataset.courseId)$('courseSelect').value=so.dataset.courseId;}const co2=$('courseSelect')?.selectedOptions?.[0];if(co2){setv('courseCode',co2.dataset.code||'');}renderPhoto(so?.dataset?.photo||'');}
  async function renderPhoto(url){const img=$('studentPhotoPreview'),box=$('photoBox');if(!url){if(box)box.style.display='none';return;}try{img.src=url;if(box)box.style.display='block';}catch(e){if(box)box.style.display='none';}}
  function identifiers(){if(!val('certificateNo'))setv('certificateNo',certNo());if(!val('certificateId'))setv('certificateId',certId());if(!val('verifyCode'))setv('verifyCode',verifyCode());if(!val('issueDate'))setv('issueDate',today());if(!$('directorName')?.value)setv('directorName','Dr. Osmaan Mohamed Ibraahin');if(!$('authorityName')?.value)setv('authorityName','GAAWOW ACADEMY');}

  function fontFit(text,max,start=22,min=11,weight=600,family='Arial'){let n=start;while(n>min){ctx.font=`${weight} ${n}px ${family}`;if(ctx.measureText(text).width<=max)break;n--;}return n;}
  function drawValue(s,x,y,max,{size=18,min=10,weight=600,color='#163a75',align='left',family='Arial'}={}){if(!s)return;const n=fontFit(String(s),max,size,min,weight,family);ctx.save();ctx.font=`${weight} ${n}px ${family}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(s),x,y);ctx.restore();}
  function wrap(text,maxWidth,size=17,weight=400){ctx.font=`${weight} ${size}px Arial`;const words=String(text).split(/\s+/);const lines=[];let line='';for(const w of words){const test=line?`${line} ${w}`:w;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w;}else line=test;}if(line)lines.push(line);return lines;}
  function drawBody(){const student=studentName()||'the student';const sid=val('studentIdPreview')||'the student ID';const inst=institutionName()||'GAAWOW TEST INSTITUTION';const course=courseName()||'the enrolled course';const grade=val('grade')||'the recorded grade';const start=fmtDate(val('dateStarted'))||'the stated start date';const end=fmtDate(val('dateCompleted'))||'the stated completion date';const body=`This letter confirms that ${student} (Student ID: ${sid}) was enrolled at ${inst} in ${course}. The academic record indicates a grade of ${grade}, with studies commencing on ${start} and completion recorded on ${end}. This document is issued by GAAWOW ACADEMY for official authentication and verification purposes.`;ctx.save();ctx.fillStyle='#243447';ctx.font='500 15px Arial';ctx.textAlign='left';ctx.textBaseline='top';let y=774;for(const line of wrap(body,880,15,500)){ctx.fillText(line,84,y);y+=22;}ctx.restore();}
  async function draw(){if(!ctx)throw Error('Canvas lama helin.');ctx.clearRect(0,0,W,H);ctx.drawImage(template,0,0,W,H);
    drawValue(val('certificateNo'),172,346,150,{size:14,min:9,weight:700});
    drawValue(fmtDate(val('issueDate')),421,346,145,{size:14,min:9,weight:600});
    drawValue(val('verifyCode'),670,346,150,{size:14,min:9,weight:700});
    drawValue((val('status')||'VALID').toUpperCase(),897,346,105,{size:14,min:9,weight:700});
    drawValue(studentName(),320,478,280,{size:17,min:10,weight:600});
    drawValue(val('studentIdPreview'),320,539,280,{size:17,min:10,weight:600});
    drawValue(courseName(),320,601,280,{size:17,min:10,weight:600});
    drawValue(val('courseCode'),320,662,280,{size:17,min:10,weight:600});
    drawValue(fmtDate(val('dateStarted')),691,478,275,{size:17,min:10,weight:600});
    drawValue(fmtDate(val('dateCompleted')),691,539,275,{size:17,min:10,weight:600});
    drawValue(val('grade'),691,601,275,{size:17,min:10,weight:700});
    drawValue((val('status')||'VALID').toUpperCase(),691,662,275,{size:17,min:10,weight:600});
    drawBody();
    const so=$('studentSelect')?.selectedOptions?.[0];const photo=so?.dataset?.photo||'';if(photo){try{const im=await loadImage(photo);ctx.save();ctx.beginPath();ctx.rect(G.photo.x,G.photo.y,G.photo.w,G.photo.h);ctx.clip();const scale=Math.max(G.photo.w/im.width,G.photo.h/im.height);const dw=im.width*scale,dh=im.height*scale;ctx.drawImage(im,G.photo.x+(G.photo.w-dw)/2,G.photo.y+(G.photo.h-dh)/2,dw,dh);ctx.restore();}catch(e){}}
    const u=baseVerify();
    // QR: render directly to an off-screen canvas. This is more reliable than loading a data URL as an Image.
    try{
      if(window.QRCode?.toCanvas){
        const qc=document.createElement('canvas');
        await new Promise((resolve,reject)=>QRCode.toCanvas(qc,u,{width:G.verification.qr.size,margin:1,errorCorrectionLevel:'M'},err=>err?reject(err):resolve()));
        ctx.save();
        ctx.fillStyle='#ffffff';
        ctx.fillRect(G.verification.qr.x-3,G.verification.qr.y-3,G.verification.qr.size+6,G.verification.qr.size+6);
        ctx.drawImage(qc,G.verification.qr.x,G.verification.qr.y,G.verification.qr.size,G.verification.qr.size);
        ctx.restore();
      }else if(window.QRCode?.toDataURL){
        const data=await new Promise((res,rej)=>QRCode.toDataURL(u,{width:G.verification.qr.size,margin:1,errorCorrectionLevel:'M'},(err,url)=>err?rej(err):res(url)));
        const qi=await loadImage(data);
        ctx.drawImage(qi,G.verification.qr.x,G.verification.qr.y,G.verification.qr.size,G.verification.qr.size);
      }else{throw new Error('QR library not loaded');}
    }catch(e){console.warn('QR render failed',e);}
    drawValue(val('verifyCode'),365,1191,380,{size:15,min:10,weight:700});
    drawValue((val('status')||'VALID').toUpperCase(),365,1247,380,{size:15,min:10,weight:700});
    drawValue(u,355,1300,600,{size:8,min:6,weight:500,color:'#344054'});
    setStatus('Authentication Letter preview ready.');
  }

  async function payload(){const core=`${val('certificateId')}|${val('certificateNo')}|${val('verifyCode')}|${$('studentSelect')?.value||''}|${$('courseSelect')?.value||''}|${val('issueDate')||''}`;const hash=await sha256(core);return{certificate_no:val('certificateNo'),certificate_id:val('certificateId'),verify_code:val('verifyCode'),hash_code:hash,student_id:$('studentSelect')?.value||null,student_name_snapshot:studentName(),course_id:$('courseSelect')?.value||null,course_name_snapshot:courseName(),institution_id:$('institutionSelect')?.value||profileInstitution()||null,institution_name_snapshot:institutionName(),date_started:val('dateStarted')||null,date_completed:val('dateCompleted')||null,issue_date:val('issueDate')||null,expiry_date:val('expiryDate')||null,status:val('status')||'valid',certificate_type:'authentication_letter',director_name:val('directorName')||'Dr. Osmaan Mohamed Ibraahin',verification_url:baseVerify(),template_url:TEMPLATE,user_id:user?.id||null};}
  function unknownColumn(msgText){const m=String(msgText||'').match(/Could not find the '([^']+)' column of 'certificates'/i)||String(msgText||'').match(/column ['"]([^'"]+)['"] of relation ['"]certificates['"]/i);return m?.[1]||null;}
  function notNullColumn(msgText){const m=String(msgText||'').match(/null value in column ['"]([^'"]+)['"] of relation ['"]certificates['"] violates not-null constraint/i);return m?.[1]||null;}
  function fallbackForColumn(column,p){const map={certificate_no:val('certificateNo'),certificate_id:val('certificateId'),verify_code:val('verifyCode'),hash_code:p.hash_code,student_id:$('studentSelect')?.value||null,student_name_snapshot:studentName(),course_id:$('courseSelect')?.value||null,course_name_snapshot:courseName(),institution_id:$('institutionSelect')?.value||profileInstitution()||null,institution_name_snapshot:institutionName(),issue_date:val('issueDate')||today(),status:val('status')||'valid',certificate_type:'authentication_letter',verification_url:baseVerify(),user_id:user?.id||null};return Object.prototype.hasOwnProperty.call(map,column)?map[column]:undefined;}
  async function persistSchemaSafe(p,id){let working={...p};for(let attempt=0;attempt<24;attempt++){const r=id?await db.from('certificates').update(working).eq('id',id).select().single():await db.from('certificates').insert(working).select().single();if(!r.error)return r;const message=r.error.message||String(r.error);const bad=unknownColumn(message);if(bad&&Object.prototype.hasOwnProperty.call(working,bad)){delete working[bad];continue;}const nn=notNullColumn(message);if(nn){const fallback=fallbackForColumn(nn,working);if(fallback!==undefined&&fallback!==null&&fallback!==''){working[nn]=fallback;continue;}}throw r.error;}throw new Error('Certificates schema could not be resolved after multiple safe attempts.');}
  async function save(){try{identifiers();if(!$('studentSelect')?.value)throw Error('Student dooro.');if(!$('courseSelect')?.value)throw Error('Course dooro.');await draw();const p=await payload();const id=regenId();await persistSchemaSafe(p,id);msg(id?'Authentication Letter waa la cusboonaysiiyay.':'Authentication Letter waa la keydiyay.','success');}catch(e){console.error(e);msg(`Save error: ${e.message||e}`,'error');}}
  async function loadExisting(id){const {data,error}=await db.from('certificates').select('*').eq('id',id).single();if(error)throw error;setv('certificateNo',data.certificate_no);setv('certificateId',data.certificate_id);setv('verifyCode',data.verify_code);setv('dateStarted',data.date_started);setv('dateCompleted',data.date_completed);setv('issueDate',data.issue_date);setv('expiryDate',data.expiry_date);setv('status',data.status||'valid');setv('directorName',data.director_name||'Dr. Osmaan Mohamed Ibraahin');if(data.institution_id)$('institutionSelect').value=data.institution_id;await students();if(data.student_id)$('studentSelect').value=data.student_id;selectionFields();if(data.course_id)$('courseSelect').value=data.course_id;selectionFields();await draw();msg('Regenerate mode: Authentication Letter waa la furay.','info');}
  function png(){const a=document.createElement('a');a.download=`${(studentName()||'student').replace(/[^a-z0-9]+/gi,'-')}-authentication-letter.png`;a.href=canvas.toDataURL('image/png');a.click();}
  function pdf(){if(!window.jspdf?.jsPDF)throw Error('jsPDF lama helin.');const {jsPDF}=window.jspdf,p=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});p.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297);p.save(`${(studentName()||'student').replace(/[^a-z0-9]+/gi,'-')}-authentication-letter.pdf`);}
  function print(){const w=window.open('','_blank');if(!w)throw Error('Print window waa la xiray.');w.document.write(`<html><head><title>Authentication Letter</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}img{width:210mm;height:297mm;display:block}</style></head><body><img src="${canvas.toDataURL('image/png')}" onload="window.print()"></body></html>`);w.document.close();}
  function verify(){window.open(baseVerify(),'_blank','noopener,noreferrer');}

  function fillGrades(){const s=$('grade');if(!s)return;['A+','A','A-','B+','B','B-','C+','C','C-','D+','D','F','PASS','MERIT','DISTINCTION','N/A'].forEach(g=>{const o=document.createElement('option');o.value=g;o.textContent=g;s.appendChild(o);});}
  function events(){
    $('studentSelect')?.addEventListener('change',async()=>{selectionFields();if(!$('courseSelect')?.value)selectionFields();await draw();});
    $('courseSelect')?.addEventListener('change',draw);
    $('institutionSelect')?.addEventListener('change',async()=>{try{await students();filterCourses();selectionFields();await draw();}catch(e){msg(e.message,'error');}});
    $('generateBtn')?.addEventListener('click',async()=>{try{identifiers();await draw();}catch(e){msg(`Generate error: ${e.message}`,'error');}});
    $('saveBtn')?.addEventListener('click',save);
    $('pngBtn')?.addEventListener('click',()=>{try{png();}catch(e){msg(e.message,'error');}});
    $('pdfBtn')?.addEventListener('click',()=>{try{pdf();}catch(e){msg(e.message,'error');}});
    $('printBtn')?.addEventListener('click',()=>{try{print();}catch(e){msg(e.message,'error');}});
    $('verifyBtn')?.addEventListener('click',verify);
    $('backBtn')?.addEventListener('click',()=>location.href='certificates.html');
  }
  async function init(){try{canvas.width=W;canvas.height=H;fillGrades();await auth();await loadProfile();await loadTemplate();await institutions();await students();await courses();events();identifiers();if(regenId())await loadExisting(regenId());else{setv('dateStarted',val('dateStarted')||today());setv('dateCompleted',val('dateCompleted')||today());await draw();}}catch(e){console.error(e);msg(`System error: ${e.message||e}`,'error');setStatus('Authentication Letter failed to initialize.');}}
  init();
})();
