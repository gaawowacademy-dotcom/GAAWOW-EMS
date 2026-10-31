/* ============================================================
   GAAWOW EMS — ATTENDANCE MANAGEMENT V2 (Save / Publish / Unpublish)
   Scope: attendance.html only. Uses Supabase publishable key.
   Preserves existing schema, enum values, and RLS policies.
   Publishing uses existing columns: is_published, published_at, published_by
   (published_at / published_by are set by the existing DB trigger).
   ============================================================ */
(() => {
  "use strict";
  if (window.__gaawowAttendanceV2Loaded) return;
  window.__gaawowAttendanceV2Loaded = true;

  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";
  const STATUS = ["present", "absent", "late", "excused"];
  const STATUS_LABEL = {present:"Present · Jooga", absent:"Absent · Maqan", late:"Late · Daahay", excused:"Excused · Fasax la oggolaaday"};
  const REC_COLS = "id,institution_id,lesson_id,student_id,status,notes,recorded_by,recorded_at,is_published,published_at";
  const $ = id => document.getElementById(id);
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}
  });
  const state = {
    user:null, profile:null, institutions:[], classes:[], lessons:[], students:[],
    records:new Map(), draft:new Map(), selectedInstitution:"", selectedClass:"", selectedLesson:"", busy:false
  };

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function message(text, type="info") {
    const el = $("message"); el.textContent = text; el.className = `message show ${type}`;
    if (type === "success") window.setTimeout(() => { if (el.textContent === text) el.className = "message"; }, 6000);
  }
  function clearMessage(){ $("message").className = "message"; $("message").textContent = ""; }
  function setOptions(select, rows, valueFn, labelFn, placeholder, selected="") {
    select.innerHTML = "";
    const first = document.createElement("option"); first.value = ""; first.textContent = placeholder; select.appendChild(first);
    rows.forEach(row => { const opt=document.createElement("option"); opt.value=valueFn(row); opt.textContent=labelFn(row); select.appendChild(opt); });
    select.value = rows.some(r => valueFn(r) === selected) ? selected : "";
  }
  function lockSelect(id, locked=true){ $(id).disabled = locked || state.busy; }
  function selectedLesson(){ return state.lessons.find(x => x.id === state.selectedLesson) || null; }
  function dateLabel(value){ if(!value) return ""; const d=new Date(`${String(value).slice(0,10)}T00:00:00`); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(); }

  /* ---------- Publishing helpers ---------- */
  function publishInfo(){
    const total=state.students.length;
    const recs=state.students.map(s=>state.records.get(s.id)).filter(Boolean);
    const pub=recs.filter(r=>r.is_published===true).length;
    return {total, saved:recs.length, pub, unpub:recs.length-pub, complete: total>0 && recs.length===total};
  }
  function studentChanged(s){
    const r=state.records.get(s.id);
    const d=state.draft.get(s.id)||{status:"present",notes:""};
    if(!r) return true;
    return r.status!==d.status || (r.notes||"")!==String(d.notes||"").trim();
  }
  function isDirty(){ return state.students.some(studentChanged); }
  function renderPublishStatus(){
    const el=$("publishStatus"); if(!el) return;
    const i=publishInfo();
    let cls="idle", text="Publishing status: select a lesson";
    if(state.selectedLesson && i.total>0){
      if(i.complete && i.pub===i.total){cls="published";text="Published: Successfully published";}
      else if(i.pub===0){cls="draft";text="Draft: Not published";}
      else {cls="partial";text="Partially published: Records have inconsistent publishing states";}
    }
    el.className=`pub-badge ${cls}`; el.textContent=text;
  }
  function updateActions(){
    const i=publishInfo(), busy=state.busy;
    $("saveBtn").disabled = busy || !state.selectedLesson || state.students.length===0;
    $("publishBtn").disabled = busy || !i.complete || i.unpub===0;
    $("unpublishBtn").disabled = busy || i.pub===0;
    renderPublishStatus();
  }
  function setBusy(value){
    state.busy=value;
    $("reloadBtn").disabled=value; $("clearBtn").disabled=value;
    $("institution").disabled=value || (state.profile && state.profile.role!=="super_admin");
    $("class").disabled=value || !state.selectedInstitution || state.classes.length===0;
    $("lesson").disabled=value || !state.selectedClass || state.lessons.length===0;
    updateActions();
  }
  function assertAccess(lesson){
    if(!lesson || !state.students.length) throw new Error("Marka hore dooro cashar ay arday ku jiraan.");
    if(lesson.institution_id!==state.selectedInstitution || lesson.class_id!==state.selectedClass) throw new Error("Institution/Class/Lesson selection is inconsistent. Reload and try again.");
    if(state.profile.role!=="super_admin" && lesson.institution_id!==state.profile.institution_id) throw new Error("Access denied: institution mismatch.");
    if(state.profile.role==="teacher" && lesson.teacher_id!==state.user.id) throw new Error("Access denied: casharkan adiga laguma xilsaarin.");
  }
  async function verifyAuthorization(){
    const {data:{session},error}=await db.auth.getSession();
    if(error) throw new Error("Session lama hubin: "+error.message);
    if(!session || session.user.id!==state.user.id){window.location.replace("index.html");throw new Error("Login-kaaga wuu dhammaaday. Dib uga gal.");}
    const {data:p,error:pe}=await db.from("profiles").select("id,role,is_active,institution_id").eq("id",session.user.id).maybeSingle();
    if(pe) throw new Error("Authorization lama hubin: "+pe.message);
    if(!p || p.is_active!==true || !["super_admin","school_admin","teacher"].includes(p.role)) throw new Error("Access denied: akoonkaagu ma haysto rukhsad.");
    if(p.role!=="super_admin" && p.institution_id!==state.selectedInstitution) throw new Error("Access denied: cross-institution action blocked.");
    state.profile={...state.profile,...p};
  }
  async function refreshRecords(lesson){
    state.records.clear();
    if(!state.students.length) return;
    const {data,error}=await db.from("attendance").select(REC_COLS).eq("institution_id",lesson.institution_id).eq("lesson_id",lesson.id).in("student_id",state.students.map(s=>s.id));
    if(error) throw new Error("Attendance hore loo diiwaangeliyey lama akhrin: "+error.message);
    (data||[]).forEach(r=>state.records.set(r.student_id,r));
  }

  function resetStudents(text="Select a lesson to load students.") {
    state.students=[]; state.records.clear(); state.draft.clear(); renderStats();
    $("tableContainer").innerHTML=`<div class="empty">${esc(text)}</div>`;
    $("tableInfo").textContent=text; updateActions();
  }
  function renderStats(){
    const vals=state.students.map(s=>state.draft.get(s.id)?.status || "present");
    $("totalCount").textContent=String(vals.length);
    $("presentCount").textContent=String(vals.filter(v=>v==="present").length);
    $("absentCount").textContent=String(vals.filter(v=>v==="absent").length);
    $("otherCount").textContent=String(vals.filter(v=>v==="late"||v==="excused").length);
  }
  async function checkSession(){
    const {data:{session},error}=await db.auth.getSession();
    if(error) throw new Error("Session lama hubin: "+error.message);
    if(!session){ window.location.replace("index.html"); throw new Error("Login-kaaga wuu dhammaaday. Dib uga gal GAAWOW EMS."); }
    state.user=session.user;
    const {data:profile,error:profileError}=await db.from("profiles").select("id,full_name,email,role,is_active,institution_id").eq("id",session.user.id).maybeSingle();
    if(profileError) throw new Error("Profile lama akhrin: "+profileError.message);
    if(!profile) throw new Error("Profile-kaaga lagama helin. La xiriir maamulka.");
    if(profile.is_active !== true) throw new Error("Akoonkaagu ma aha active. La xiriir maamulka.");
    if(!["super_admin","school_admin","teacher"].includes(profile.role)) throw new Error("Access denied: Teacher, School Admin ama Super Admin ayaa geli kara.");
    if(profile.role !== "super_admin" && !profile.institution_id) throw new Error("Profile-kaagu ma laha institution_id. Maamulka ha saxo xogta.");
    state.profile=profile;
    $("identity").textContent=`${profile.full_name || profile.email || "EMS User"} · ${profile.role.replaceAll("_"," ")}`;
  }
  async function loadInstitutions(){
    const select=$("institution");
    let rows=[];
    if(state.profile.role === "super_admin"){
      const {data,error}=await db.from("institutions").select("id,name").order("name").limit(1000);
      if(error) throw new Error("Institutions lama akhrin. Hubi RLS/policy-ga institutions: "+error.message);
      rows=data||[];
    } else {
      const {data,error}=await db.from("institutions").select("id,name").eq("id",state.profile.institution_id).maybeSingle();
      if(error) throw new Error("Machadkaaga lama akhrin: "+error.message);
      if(data) rows=[data];
    }
    state.institutions=rows;
    setOptions(select,rows,x=>x.id,x=>x.name||"Institution","Select institution…",state.profile.role==="super_admin"?"":state.profile.institution_id);
    if(state.profile.role !== "super_admin") { select.value=state.profile.institution_id; select.disabled=true; }
    else select.disabled=false;
    if(state.profile.role !== "super_admin" && state.profile.institution_id){ state.selectedInstitution=state.profile.institution_id; await loadClasses(); }
    else { lockSelect("class",true); lockSelect("lesson",true); }
  }
  async function loadClasses(){
    state.selectedInstitution=$("institution").value;
    state.selectedClass=""; state.selectedLesson=""; state.classes=[]; state.lessons=[];
    resetStudents("Dooro fasal iyo cashar si ardayda loo soo bandhigo.");
    setOptions($("class"),[],x=>x.id,x=>x.name,"Select class…");
    setOptions($("lesson"),[],x=>x.id,x=>x.title,"Select lesson…"); $("lessonDate").value="";
    lockSelect("class",true); lockSelect("lesson",true);
    if(!state.selectedInstitution) return;
    let q=db.from("classes").select("id,institution_id,name,code,academic_year,teacher_id,is_active,status").eq("institution_id",state.selectedInstitution).order("name").limit(1000);
    if(state.profile.role === "teacher") q=q.eq("teacher_id",state.user.id);
    const {data,error}=await q;
    if(error) throw new Error("Fasallada lama akhrin: "+error.message);
    state.classes=(data||[]).filter(c=>c.is_active!==false && String(c.status||"active").toLowerCase()!=="inactive");
    setOptions($("class"),state.classes,x=>x.id,x=>[x.name||x.code||"Class",x.code,x.academic_year].filter(Boolean).join(" · "),"Select class…");
    lockSelect("class",false);
    if(!state.classes.length) message("Machadkan fasallo muuqda lagama helin. Hubi institution_id iyo rukhsadaha RLS.","info");
  }
  async function loadLessons(){
    state.selectedClass=$("class").value; state.selectedLesson=""; state.lessons=[];
    resetStudents("Dooro cashar si liiska ardayda loo soo bandhigo.");
    setOptions($("lesson"),[],x=>x.id,x=>x.title,"Select lesson…"); $("lessonDate").value=""; lockSelect("lesson",true);
    if(!state.selectedInstitution || !state.selectedClass) return;
    let q=db.from("lessons").select("id,institution_id,class_id,teacher_id,title,lesson_date,start_time,end_time,room").eq("institution_id",state.selectedInstitution).eq("class_id",state.selectedClass).order("lesson_date",{ascending:false}).limit(1000);
    if(state.profile.role === "teacher") q=q.eq("teacher_id",state.user.id);
    const {data,error}=await q;
    if(error) throw new Error("Casharrada lama akhrin: "+error.message);
    state.lessons=data||[];
    setOptions($("lesson"),state.lessons,x=>x.id,x=>`${x.title||"Lesson"}${x.lesson_date?" · "+dateLabel(x.lesson_date):""}${x.start_time?" · "+String(x.start_time).slice(0,5):""}`,"Select lesson…");
    lockSelect("lesson",false);
    if(!state.lessons.length) message("Fasalkan casharro loo xilsaaray lagama helin.","info");
  }
  async function loadStudents(){
    state.selectedLesson=$("lesson").value;
    state.draft.clear(); state.records.clear(); state.students=[]; renderStats();
    const lesson=selectedLesson();
    if(!lesson){ resetStudents("Dooro cashar si liiska ardayda loo soo bandhigo."); $("lessonDate").value=""; return; }
    if(lesson.institution_id!==state.selectedInstitution || lesson.class_id!==state.selectedClass) throw new Error("Casharka la doortay kuma jiro machadka/fasalka la doortay.");
    if(state.profile.role!=="super_admin" && lesson.institution_id!==state.profile.institution_id) throw new Error("Casharkani kama tirsana machadka profile-kaaga.");
    if(state.profile.role==="teacher" && lesson.teacher_id!==state.user.id) throw new Error("Casharkan macallin kale ayaa loo xilsaaray.");
    $("lessonDate").value=lesson.lesson_date ? dateLabel(lesson.lesson_date) : "Not set";
    $("tableContainer").innerHTML='<div class="empty">Loading students…</div>';
    updateActions();
    const {data:enrollments,error:enrollmentError}=await db.from("enrollments").select("student_id").eq("institution_id",lesson.institution_id).eq("class_id",lesson.class_id).eq("status","active").limit(5000);
    if(enrollmentError) throw new Error("Enrollments lama akhrin: "+enrollmentError.message);
    const ids=[...new Set((enrollments||[]).map(x=>x.student_id).filter(Boolean))];
    if(!ids.length){resetStudents("Fasalkan arday active ah oo enrollment leh lagama helin.");return;}
    const {data:students,error:studentsError}=await db.from("students").select("id,institution_id,student_id,full_name,status").eq("institution_id",lesson.institution_id).in("id",ids).order("full_name").limit(5000);
    if(studentsError) throw new Error("Ardayda lama akhrin: "+studentsError.message);
    state.students=(students||[]).filter(s=>!s.status || String(s.status).toLowerCase()==="active");
    await refreshRecords(lesson);
    state.students.forEach(s=>{const r=state.records.get(s.id);state.draft.set(s.id,{status:STATUS.includes(r?.status)?r.status:"present",notes:r?.notes||""});});
    renderStudents();
  }
  function recordCell(s){
    const r=state.records.get(s.id);
    if(!r) return '<span style="color:#64748b">New</span>';
    if(r.is_published===true) return '<span style="color:#166534;font-weight:700">Published</span>';
    return '<span style="color:#92400e;font-weight:700">Saved (draft)</span>';
  }
  function renderStudents(){
    const query=$("studentSearch").value.trim().toLowerCase();
    const filtered=state.students.filter(s=>`${s.full_name||""} ${s.student_id||""}`.toLowerCase().includes(query));
    if(!state.students.length){$("tableContainer").innerHTML='<div class="empty">Arday lama helin.</div>';$("tableInfo").textContent="0 students";renderStats();updateActions();return;}
    const rows=filtered.map(s=>{
      const d=state.draft.get(s.id)||{status:"present",notes:""};
      const opts=STATUS.map(v=>`<option value="${v}" ${d.status===v?"selected":""}>${STATUS_LABEL[v]}</option>`).join("");
      return `<tr data-student-id="${esc(s.id)}"><td><span class="student-name">${esc(s.full_name||"Unnamed student")}</span><span class="student-id">${esc(s.student_id||"")}</span></td><td><select class="status-select" data-status="${esc(d.status)}" data-field="status" aria-label="Attendance status for ${esc(s.full_name||s.student_id)}">${opts}</select></td><td><input class="notes" data-field="notes" type="text" maxlength="500" value="${esc(d.notes)}" placeholder="Optional note / cudurdaar" aria-label="Notes for ${esc(s.full_name||s.student_id)}"></td><td>${recordCell(s)}</td></tr>`;
    }).join("");
    $("tableContainer").innerHTML=filtered.length?`<div class="table-wrap"><table><thead><tr><th>Student / Arday</th><th>Attendance Status / Xaalad</th><th>Notes / Faahfaahin</th><th>Record</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Arday ku habboon raadinta lama helin.</div>';
    $("tableInfo").textContent=`Showing ${filtered.length} of ${state.students.length} students · ${state.records.size} existing records`;
    renderStats(); updateActions();
  }
  function syncDraftFromTable(event){
    const field=event.target.dataset.field; if(!field)return;
    const tr=event.target.closest("tr[data-student-id]");if(!tr)return;
    const id=tr.dataset.studentId;const current=state.draft.get(id)||{status:"present",notes:""};
    if(field==="status") { if(!STATUS.includes(event.target.value)) return; current.status=event.target.value; event.target.dataset.status=event.target.value; }
    else if(field==="notes") current.notes=event.target.value;
    state.draft.set(id,current); renderStats();
  }
  async function saveAttendance(){
    if(state.busy)return;
    const lesson=selectedLesson();
    try{ assertAccess(lesson); }catch(e){ return message(e.message,"error"); }
    const changed=state.students.filter(studentChanged);
    if(!changed.length) return message("Isbeddel la kaydin karo ma jiro. Attendance-ka waa la kaydiyey.","info");
    const willUnpublish=changed.some(s=>state.records.get(s.id)?.is_published===true);
    const confirmText=`Ma hubtaa inaad kaydinayso attendance-ka ${changed.length} arday ee ${lesson.title||"casharkan"}?`+(willUnpublish?"\n\nQeybaha hore loo daabacay ee la beddelay waxaa si toos ah loo unpublish-gareynayaa.":"");
    if(!window.confirm(confirmText))return;
    setBusy(true); clearMessage(); let saved=0, failed=[];
    try{
      await verifyAuthorization();
      for(const student of changed){
        const draft=state.draft.get(student.id)||{status:"present",notes:""};
        if(!STATUS.includes(draft.status)){failed.push(`${student.full_name}: invalid status`);continue;}
        const payload={institution_id:lesson.institution_id,lesson_id:lesson.id,student_id:student.id,status:draft.status,notes:String(draft.notes||"").trim()||null,recorded_by:state.user.id};
        const existing=state.records.get(student.id);
        const upd={status:payload.status,notes:payload.notes,recorded_by:payload.recorded_by};
        if(existing && existing.is_published===true) upd.is_published=false; // modified published record becomes draft
        let result;
        if(existing){
          result=await db.from("attendance").update(upd).eq("id",existing.id).eq("institution_id",lesson.institution_id).eq("lesson_id",lesson.id).select(REC_COLS).maybeSingle();
        } else {
          result=await db.from("attendance").insert(payload).select(REC_COLS).maybeSingle();
        }
        if(result.error || !result.data){
          let errorText=result.error?.message||"No row returned (check RLS/policy)";
          // A concurrent insert can hit the existing unique key. Re-read and update that row safely.
          if(!existing && result.error?.code==="23505"){
            const reread=await db.from("attendance").select("id,is_published").eq("institution_id",lesson.institution_id).eq("lesson_id",lesson.id).eq("student_id",student.id).maybeSingle();
            if(!reread.error&&reread.data){
              const u2={...upd}; if(reread.data.is_published===true) u2.is_published=false;
              const retry=await db.from("attendance").update(u2).eq("id",reread.data.id).eq("institution_id",lesson.institution_id).select("id").maybeSingle();
              if(!retry.error&&retry.data){saved++;continue;} errorText=retry.error?.message||errorText;
            }
          }
          failed.push(`${student.full_name||student.student_id}: ${errorText}`);continue;
        }
        state.records.set(student.id,result.data); saved++;
      }
      try{ await refreshRecords(lesson); }catch(e){ console.error(e); }
      if(failed.length){message(`Kaydinta qayb ahaan way dhacday: ${saved} waa la kaydiyey, ${failed.length} way fashilmeen. Sababaha ugu horreeya: ${failed.slice(0,3).join(" | ")}`,"error");}
      else message(`Attendance si guul leh ayaa loo kaydiyey: ${saved} arday.`,"success");
    }catch(e){console.error("GAAWOW Attendance save error",e);message("Kaydintu way fashilantay: "+(e?.message||String(e)),"error");}
    finally{setBusy(false);renderStudents();}
  }
  async function setPublished(flag){
    if(state.busy)return;
    const lesson=selectedLesson();
    try{ assertAccess(lesson); }catch(e){ return message(e.message,"error"); }
    let info=publishInfo();
    if(flag){
      if(!info.complete) return message(`Publish lama samayn karo: ${info.total-info.saved} arday ayaan weli attendance loo kaydin. Marka hore kaydi dhammaan ardayda.`,"error");
      if(isDirty()) return message("Isbeddello aan la kaydin ayaa jira. Marka hore riix Save Attendance, kadibna Publish.","error");
      if(info.unpub===0) return message("Attendance-ka horey ayaa loo daabacay.","info");
    } else if(info.pub===0) return message("Attendance daabacan ma jiro.","info");
    const txt=flag
      ?`Ma hubtaa inaad PUBLISH garaynayso attendance-ka ${info.total} arday ee ${lesson.title||"casharkan"}? Ardayda ayaa arki doona.`
      :`Ma hubtaa inaad UNPUBLISH garaynayso attendance-ka ${lesson.title||"casharkan"}? Xaaladaha iyo notes-ka waa la ilaalinayaa.`;
    if(!window.confirm(txt))return;
    setBusy(true); clearMessage();
    try{
      await verifyAuthorization();
      await refreshRecords(lesson);
      info=publishInfo();
      if(flag){
        if(!info.complete) throw new Error("Attendance wuu dhammaystiranayn. Dib u soo rar oo kaydi dhammaan ardayda.");
        if(isDirty()) throw new Error("Attendance-ka Supabase ku jira wuu ka duwan yahay waxa shaashadda ku jira. Save samee marka hore.");
      }
      const target=flag?info.unpub:info.pub;
      if(!target) throw new Error(flag?"Ma jiraan diiwaano la daabaco.":"Ma jiraan diiwaano la unpublish-gareeyo.");
      const {data,error}=await db.from("attendance").update({is_published:flag}).eq("institution_id",lesson.institution_id).eq("lesson_id",lesson.id).eq("is_published",!flag).in("student_id",state.students.map(s=>s.id)).select("id");
      if(error) throw new Error(error.message);
      const updated=(data||[]).length;
      await refreshRecords(lesson);
      if(updated!==target) throw new Error(`${updated} ka mid ah ${target} diiwaan ayaa la cusboonaysiiyey. Hubi RLS/policy-ga attendance.`);
      message(flag?`Attendance si guul leh ayaa loo daabacay: ${updated} diiwaan.`:`Attendance waa la unpublish-gareeyey: ${updated} diiwaan. Waad saxi kartaa oo mar kale daabici kartaa.`,"success");
    }catch(e){
      console.error("GAAWOW Attendance publish error",e);
      message((flag?"Publish":"Unpublish")+" way fashilantay: "+(e?.message||String(e)),"error");
    }finally{setBusy(false);renderStudents();}
  }
  async function reloadCurrent(){
    clearMessage();
    if(!state.selectedInstitution){await loadInstitutions();return;}
    if(!state.selectedClass){await loadClasses();return;}
    const previousLesson=state.selectedLesson;
    await loadLessons();
    if(previousLesson && state.lessons.some(x=>x.id===previousLesson)){
      state.selectedLesson=previousLesson; $("lesson").value=previousLesson; await loadStudents();
    }
  }
  function clearChanges(){
    if(!state.students.length)return;
    if(!window.confirm("Ma tirtirtaa isbeddellada aan weli la kaydin, oo dib ugu celisaa xogtii Supabase?"))return;
    state.students.forEach(s=>{const r=state.records.get(s.id);state.draft.set(s.id,{status:STATUS.includes(r?.status)?r.status:"present",notes:r?.notes||""});});renderStudents();message("Isbeddellada aan la kaydin waa la nadiifiyey.","info");
  }
  function bind(){
    $("institution").addEventListener("change",async()=>{clearMessage();try{await loadClasses();}catch(e){message(e.message,"error");}});
    $("class").addEventListener("change",async()=>{clearMessage();try{await loadLessons();}catch(e){message(e.message,"error");}});
    $("lesson").addEventListener("change",async()=>{clearMessage();try{await loadStudents();}catch(e){resetStudents("Could not load attendance data.");message(e.message,"error");}});
    $("studentSearch").addEventListener("input",renderStudents);
    $("tableContainer").addEventListener("change",syncDraftFromTable);
    $("tableContainer").addEventListener("input",syncDraftFromTable);
    $("saveBtn").addEventListener("click",saveAttendance);
    $("publishBtn").addEventListener("click",()=>setPublished(true));
    $("unpublishBtn").addEventListener("click",()=>setPublished(false));
    $("reloadBtn").addEventListener("click",async()=>{try{await reloadCurrent();message("Xogta waa la cusboonaysiiyey.","success");}catch(e){message(e.message,"error");}});
    $("clearBtn").addEventListener("click",clearChanges);
    $("logoutBtn").addEventListener("click",async()=>{const {error}=await db.auth.signOut();if(error)message("Logout error: "+error.message,"error");else window.location.replace("index.html");});
    db.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"||!session)window.location.replace("index.html");});
  }
  async function init(){
    $("year").textContent=String(new Date().getFullYear());bind();updateActions();
    try{await checkSession();await loadInstitutions();}
    catch(e){console.error("GAAWOW Attendance init error",e);message(e.message||String(e),"error");resetStudents("Attendance lama bilaabi karin. Akhri fariinta qaladka ee kore.");}
  }
  document.addEventListener("DOMContentLoaded",init);
})();
