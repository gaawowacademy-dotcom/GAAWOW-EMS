/* GAAWOW EMS Seminar Certificate Generator v1
 * Independent module: does not modify certificate.js or existing certificates.
 * Requires seminar-certificate-template.webp beside this file.
 */
(function(){
'use strict';
const SUPABASE_URL='https://mytyvqwrxnxpxnxpiicj.supabase.co';
const SUPABASE_KEY='sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145';
const TABLE='seminar_certificates';
const TEMPLATE='./seminar-certificate-template.webp';
const $=id=>document.getElementById(id);
const canvas=$('canvas'),ctx=canvas.getContext('2d');
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let bg=new Image(),loaded=false,recordId=null,studentRows=[],institutionRows=[],lastVerifyUrl='';
function today(){return new Date().toISOString().slice(0,10)}
function code(prefix){return prefix+'-'+new Date().getFullYear()+'-'+Math.random().toString(36).slice(2,8).toUpperCase()}
function msg(text,type='info'){const e=$('message');e.className='msg '+type;e.textContent=text;}
function clearMsg(){const e=$('message');e.className='msg';e.textContent='';}
function setStatus(t){$('previewStatus').textContent=t;}
function escapeText(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fitText(text,x,y,maxW,font,color,align='center'){ctx.save();ctx.textAlign=align;ctx.fillStyle=color;ctx.font=font;let f=parseFloat(font.match(/(\d+)px/)?.[1]||30);while(ctx.measureText(text).width>maxW&&f>14){f-=1;ctx.font=font.replace(/\d+px/,f+'px');}ctx.fillText(text,x,y);ctx.restore();}
function draw(){
 if(!loaded){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#0B1E63';ctx.font='bold 32px Arial';ctx.textAlign='center';ctx.fillText('GAAWOW ACADEMY',768,420);return;}
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(bg,0,0,canvas.width,canvas.height);
 const name=$('recipient').value.trim(),title=$('seminarTitle').value.trim();
 const nameColor=$('nameColor').value,infoColor=$('infoColor').value;
 // Clean the recipient's writable area only. Keep the ornamental divider intact.
 ctx.save();ctx.fillStyle='#fff';ctx.fillRect(365,350,806,64);ctx.restore();
 fitText(name||'STUDENT NAME',768,393,1050,'bold 43px Cinzel, Georgia, serif',nameColor);
 // Seminar title: clear the template's blank underline field so the title cannot
 // collide with the fixed explanatory text printed below it.
 ctx.save();ctx.fillStyle='#fff';ctx.fillRect(340,486,850,38);ctx.restore();
 fitText(title||'SEMINAR TITLE',768,514,1000,'bold 30px Cinzel, Georgia, serif',nameColor);
 // Optional description is stored in the database but deliberately not rendered:
 // this template has no dedicated description area and rendering it caused overlap.
 const date=$('seminarDate').value?new Date($('seminarDate').value+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}):'';
 const venue=$('venue').value.trim();const cert=$('certificateNo').value;
 // Draw data in the blank space beneath each preprinted field label.
 fitText(date,390,636,355,'bold 20px Georgia, serif',infoColor);
 fitText(venue,785,636,355,'bold 20px Georgia, serif',infoColor);
 fitText(cert,1270,636,315,'bold 17px Georgia, serif',infoColor);
 // Signature titles and artwork are already part of the official template.
 // Typed signatory names remain in the form/database and are not overprinted
 // on top of the template's signature artwork and role labels.
 setStatus('Preview ready • 1536 × 857 px • Landscape');
}
function generateIds(){if(!$('certificateNo').value)$('certificateNo').value=code('GAA-SEM');if(!$('verifyCode').value)$('verifyCode').value=Math.random().toString(36).slice(2,10).toUpperCase();}
function getStudent(){return studentRows.find(s=>s.id===$('student').value)||null;}
function getInstitution(){return institutionRows.find(i=>i.id===$('institution').value)||null;}
async function loadInstitutions(){
 const {data,error}=await sb.from('institutions').select('id,name,logo_url').order('name');
 if(error){$('institution').innerHTML='<option value="">Could not load institutions</option>';msg('Institutions could not be loaded. Check login and institution table permissions: '+error.message,'error');return;}
 institutionRows=data||[];$('institution').innerHTML='<option value="">Select institution</option>'+institutionRows.map(i=>`<option value="${i.id}">${escapeText(i.name||'Institution')}</option>`).join('');
 const {data:userData}=await sb.auth.getUser();const user=userData?.user;
 if(user){const {data:profile}=await sb.from('profiles').select('institution_id,role').eq('id',user.id).maybeSingle();if(profile?.institution_id){$('institution').value=profile.institution_id;await loadStudents();}}
}
async function loadStudents(){
 const inst=$('institution').value;$('student').innerHTML='<option value="">Loading students…</option>';studentRows=[];$('recipient').value='';$('photoWrap').classList.add('hide');
 if(!inst){$('student').innerHTML='<option value="">Select institution first</option>';draw();return;}
 const {data,error}=await sb.from('students').select('id,full_name,student_id').eq('institution_id',inst).order('full_name');
 if(error){$('student').innerHTML='<option value="">Unable to load students</option>';msg('Student list could not load: '+error.message,'error');return;}
 studentRows=data||[];$('student').innerHTML='<option value="">Select student</option>'+studentRows.map(s=>`<option value="${s.id}">${escapeText(s.full_name)}${s.student_id?' · '+escapeText(s.student_id):''}</option>`).join('');
}
function studentChanged(){const s=getStudent();$('recipient').value=s?.full_name||'';draw();}
function verifyUrl(){return location.origin+location.pathname+'?verify='+encodeURIComponent($('verifyCode').value);}
async function save(){clearMsg();const s=getStudent(),i=getInstitution();if(!i||!s||!$('seminarTitle').value.trim()||!$('seminarDate').value||!$('venue').value.trim()){msg('Select institution and student, and complete Seminar Title, Date and Venue.','error');return;}
const {data:auth,error:authErr}=await sb.auth.getUser();if(authErr||!auth?.user){msg('Please sign in again before saving.','error');return;}
generateIds();const payload={institution_id:i.id,student_id:s.id,student_name_snapshot:s.full_name,seminar_title:$('seminarTitle').value.trim(),seminar_description:$('seminarDescription').value.trim()||null,seminar_date:$('seminarDate').value,venue:$('venue').value.trim(),certificate_no:$('certificateNo').value,verify_code:$('verifyCode').value,issue_date:$('issueDate').value||today(),registrar_name:$('registrar').value.trim()||null,director_name:$('director').value.trim()||null,status:'valid',issued_by:auth.user.id,verification_url:verifyUrl()};
$('saveBtn').disabled=true;try{const {data,error}=await sb.from(TABLE).insert(payload).select('*').single();if(error)throw error;recordId=data.id;lastVerifyUrl=data.verification_url||verifyUrl();msg('Certificate saved successfully. Record ID: '+recordId,'success');draw();}catch(e){msg('Save failed: '+(e.message||e.details||'Database error')+'. Confirm the seminar_certificates SQL table and RLS policies are installed.','error');}finally{$('saveBtn').disabled=false;}}
function downloadPNG(){draw();const a=document.createElement('a');a.download=($('certificateNo').value||'seminar-certificate')+'.png';a.href=canvas.toDataURL('image/png');a.click();}
function downloadPDF(){draw();const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,297,210);pdf.save(($('certificateNo').value||'seminar-certificate')+'.pdf');}
function printCert(){draw();const url=canvas.toDataURL('image/png');const w=window.open('','_blank');if(!w){msg('Popup blocked. Allow popups to print certificate.','error');return;}w.document.write('<!doctype html><html><head><title>Print Seminar Certificate</title><style>@page{size:A4 landscape;margin:0}html,body{margin:0;width:100%;height:100%}img{width:100vw;height:100vh;object-fit:contain}</style></head><body><img src="'+url+'"><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script></body></html>');w.document.close();}
async function verify(codeOverride){const code=(codeOverride||$('verifyCode').value).trim();if(!code){msg('Generate a verification code first.','error');return;}const {data,error}=await sb.rpc('verify_seminar_certificate',{p_verify_code:code});if(error){msg('Verification failed. Confirm the setup SQL is installed: '+error.message,'error');return;}const row=Array.isArray(data)?data[0]:data;if(!row){msg('Certificate not found. This code is not registered.','error');return;}const state=String(row.status||'').toUpperCase();msg(`${state==='VALID'?'VERIFIED':'RECORD FOUND'} • ${row.student_name} • ${row.seminar_title} • ${row.institution_name} • ${state}`,'success');}
$('institution').addEventListener('change',loadStudents);$('student').addEventListener('change',studentChanged);
['seminarTitle','seminarDescription','seminarDate','venue','registrar','director','nameColor','infoColor'].forEach(id=>$(id).addEventListener('input',draw));
$('previewBtn').addEventListener('click',()=>{generateIds();draw();msg('Preview generated. Review details before saving.','info');});$('saveBtn').addEventListener('click',save);$('pngBtn').addEventListener('click',downloadPNG);$('pdfBtn').addEventListener('click',downloadPDF);$('printBtn').addEventListener('click',printCert);$('verifyBtn').addEventListener('click',verify);
$('backBtn').addEventListener('click',()=>location.href='./dashboard.html');
$('issueDate').value=today();$('certificateNo').value=code('GAA-SEM');$('verifyCode').value=Math.random().toString(36).slice(2,10).toUpperCase();
bg.onload=()=>{loaded=true;draw();setStatus('Official background loaded. Fill in details to preview.');};bg.onerror=()=>{loaded=false;draw();msg('Template file missing. Upload seminar-certificate-template.webp beside the HTML and JS files.','error');};bg.src=TEMPLATE;
loadInstitutions();draw();
const publicCode=new URLSearchParams(location.search).get('verify');if(publicCode){$('verifyCode').value=publicCode;verify(publicCode);}
})();
