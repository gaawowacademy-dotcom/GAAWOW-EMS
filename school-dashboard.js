/* GAAWOW EMS School Admin Dashboard
 * Depends on the same Supabase URL and publishable/anon key used by app.js.
 * Does not expose service-role credentials. Does not grant database permissions.
 */
(() => {
  'use strict';
  const SUPABASE_URL = 'https://mytyvqwrxnxpxnxpiicj.supabase.co';
  // Copy the EXISTING publishable/anon key from app.js into this value before deployment.
  // Never place a service_role key in browser code.
  const SUPABASE_ANON_KEY = 'PASTE_EXISTING_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE';
  const $ = (id) => document.getElementById(id);
  const notice = $('notice');
  const setNotice = (message, type='') => { notice.textContent = message; notice.className = `notice ${type}`.trim(); };
  const modules = [
    {group:'People & Admissions',items:[
      ['Students','students.html','👨‍🎓','Manage enrolled students'],
      ['Teachers','teacher.html','👩‍🏫','Teacher records and assignments'],
      ['Parents','parents.html','👪','Parent and guardian records'],
      ['Enrollment','enrollment.html','📝','Student enrollment records']
    ]},
    {group:'Academic Management',items:[
      ['Departments','departments.html','🏢','Academic departments'],
      ['Courses','courses.html','📚','Courses offered by your institution'],
      ['Classes','classes.html','🏫','Classes and cohorts'],
      ['Subjects','subjects.html','📖','Subjects and curriculum'],
      ['Lessons','lessons.html','🗓️','Lessons and teaching schedule'],
      ['Attendance','attendance.html','✅','Daily attendance records'],
      ['Exams','exams.html','🧾','Examinations'],
      ['Grades','grades.html','📊','Student grades and results']
    ]},
    {group:'Finance',items:[
      ['Financial','financial.html','💳','Financial overview'],
      ['Payments','payments.html','💰','Payment records'],
      ['Mobile Money','mobile-money.html','📱','Mobile money transactions'],
      ['Invoices','invoices.html','🧮','Student invoices']
    ]},
    {group:'Reports & Administration',items:[
      ['Certificates','certificates.html','🎓','Certificates and issuance'],
      ['Reports','reports.html','📈','Institution reports'],
      ['Notifications','notifications.html','🔔','System notifications'],
      ['Support','support.html','🛟','Support requests'],
      ['Settings','settings.html','⚙️','Institution settings']
    ]}
  ];
  let sb = null;
  function renderNav() {
    const nav = $('moduleNav'); nav.innerHTML = '';
    modules.forEach(group => {
      const wrap = document.createElement('div'); wrap.className = 'nav-group';
      const title = document.createElement('div'); title.className = 'nav-title'; title.textContent = group.group; wrap.appendChild(title);
      group.items.forEach(([name,url,icon]) => { const a=document.createElement('a'); a.className='nav-link'; a.href=url; a.innerHTML=`<span class="nav-icon" aria-hidden="true">${icon}</span><span></span>`; a.querySelector('span:last-child').textContent=name; wrap.appendChild(a); });
      nav.appendChild(wrap);
    });
  }
  function renderCards(filter='') {
    const grid=$('moduleGrid'); grid.innerHTML=''; let count=0;
    modules.forEach(group => group.items.forEach(([name,url,icon,description]) => {
      if (!`${name} ${description} ${group.group}`.toLowerCase().includes(filter.toLowerCase())) return;
      count++; const a=document.createElement('a'); a.className='module-card'; a.href=url;
      a.innerHTML=`<div class="card-top"><span class="card-icon" aria-hidden="true">${icon}</span><span class="card-arrow">↗</span></div><h3></h3><p></p>`;
      a.querySelector('h3').textContent=name; a.querySelector('p').textContent=description; grid.appendChild(a);
    }));
    if (!count) grid.innerHTML='<div class="empty">No modules match your search.</div>';
  }
  async function signOut() { try { if(sb) await sb.auth.signOut(); } finally { location.replace('index.html'); } }
  async function init() {
    $('year').textContent=new Date().getFullYear(); renderNav(); renderCards();
    $('moduleSearch').addEventListener('input',e=>renderCards(e.target.value));
    $('signOutBtn').addEventListener('click',signOut);
    $('menuBtn').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
    if (!window.supabase?.createClient) { setNotice('Supabase library failed to load. Check your internet connection.','error'); return; }
    if (SUPABASE_ANON_KEY.startsWith('PASTE_')) { setNotice('Setup required: copy the existing publishable/anon key from app.js into school-dashboard.js. No secret service-role key is needed.','error'); return; }
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
    const {data:{session},error:sessionError}=await sb.auth.getSession();
    if(sessionError || !session) { location.replace('index.html'); return; }
    const {data:profile,error}=await sb.from('profiles').select('id,full_name,role,is_active,institution_id').eq('id',session.user.id).maybeSingle();
    if(error || !profile) { setNotice('Your profile could not be verified. Contact the system administrator.','error'); return; }
    if(profile.role!=='school_admin' || profile.is_active!==true || !profile.institution_id) { setNotice('Access denied. This page is only for an active School Admin account linked to an institution.','error'); await sb.auth.signOut(); location.replace('index.html'); return; }
    $('adminName').textContent=profile.full_name || session.user.email || 'School Administrator';
    const {data:institution,error:instError}=await sb.from('institutions').select('name').eq('id',profile.institution_id).maybeSingle();
    $('schoolName').textContent=(!instError && institution?.name) || 'My Institution';
    setNotice('Signed in securely. Module links open existing GAAWOW EMS pages. Each page and Supabase RLS must independently authorize School Admin access.','success');
  }
  init().catch(err=>{ console.error('School dashboard initialization failed:',err); setNotice('Dashboard could not initialize. Check browser console and Supabase configuration.','error'); });
})();
