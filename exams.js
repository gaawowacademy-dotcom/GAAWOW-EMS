'use strict';

/* GAAWOW EMS Exams Management
   Rule: one exam belongs to one subject.
   Scores are written to results and synchronized to grades for the existing Grades page. */
(() => {
  const SUPABASE_URL = 'https://mytyvqwrxnxpxnxpiicj.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const $ = id => document.getElementById(id);
  const state = { user:null, profile:null, institutions:[], courses:[], classes:[], subjects:[], exams:[], students:[], selectedExam:null, studentGrade:{student:null,rows:[]}, schemaReady:true, initialized:false };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = value => String(value ?? '').toLowerCase().trim();
  const errText = error => error?.message || error?.details || error?.hint || String(error || 'Unknown error');
  const toast = (message, type='success') => {
    const el=$('toast'); el.textContent=message; el.className=`toast ${type}`;
    clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.add('hidden'),6500);
  };
  const setBusy = (el,busy,text) => {
    if(!el)return;
    if(busy){if(!el.dataset.oldText)el.dataset.oldText=el.innerHTML;el.disabled=true;el.innerHTML=text||'<i class="fa-solid fa-spinner fa-spin"></i> Please wait…';}
    else{el.disabled=false;if(el.dataset.oldText){el.innerHTML=el.dataset.oldText;delete el.dataset.oldText;}}
  };
  const selectOptions = (select,rows,labelFn,placeholder) => {
    select.innerHTML=`<option value="">${esc(placeholder)}</option>`+(rows||[]).map(row=>`<option value="${esc(row.id)}">${esc(labelFn(row))}</option>`).join('');
  };
  const parseType = type => norm(type).replace(/_/g,' ');
  const gradeFor = percentage => percentage>=90?'A+':percentage>=80?'A':percentage>=70?'B':percentage>=60?'C':percentage>=50?'D':'F';
  const activeStatus = status => !['withdrawn','cancelled','inactive','completed','suspended'].includes(norm(status));

  async function checkSession(){
    const {data:{session},error}=await db.auth.getSession();
    if(error)throw error;
    if(!session?.user){location.replace('index.html');return false;}
    state.user=session.user;
    const {data:profile,error:profileError}=await db.from('profiles').select('id,full_name,email,role,is_active,institution_id').eq('id',session.user.id).maybeSingle();
    if(profileError)throw profileError;
    if(!profile||profile.is_active!==true||profile.role!=='super_admin'){
      await db.auth.signOut();location.replace('index.html');return false;
    }
    state.profile=profile;$('userLabel').textContent=profile.full_name||profile.email||session.user.email||'Super Admin';
    return true;
  }

  async function loadInstitutions(){
    const {data,error}=await db.from('institutions').select('id,name,code').order('name');
    if(error)throw error;
    state.institutions=data||[];
    selectOptions($('institutionSelect'),state.institutions,x=>x.code?`${x.name} (${x.code})`:x.name,'Select institution');
    selectOptions($('studentInstitutionSelect'),state.institutions,x=>x.code?`${x.name} (${x.code})`:x.name,'Select institution');
  }

  function resetDependentSelectors(coursePlaceholder='Select institution first'){
    state.courses=[];state.classes=[];state.subjects=[];
    selectOptions($('courseSelect'),[],x=>x.name,coursePlaceholder);
    selectOptions($('classSelect'),[],x=>x.name,'Select course first');
    selectOptions($('subjectSelect'),[],x=>x.name,'Select course first');
    $('courseSelect').disabled=$('classSelect').disabled=$('subjectSelect').disabled=true;
  }

  async function loadCourses(institutionId,chosenCourseId=''){
    resetDependentSelectors(institutionId?'Loading courses…':'Select institution first');
    if(!institutionId)return;
    const {data,error}=await db.from('courses').select('id,institution_id,name,code,is_active').eq('institution_id',institutionId).order('name');
    if(error)throw error;
    state.courses=(data||[]).filter(x=>x.is_active!==false);
    selectOptions($('courseSelect'),state.courses,x=>x.code?`${x.name} (${x.code})`:x.name,'Select course');
    $('courseSelect').disabled=false;
    if(chosenCourseId){$('courseSelect').value=chosenCourseId;if($('courseSelect').value)await onCourseChange();}
  }

  async function onCourseChange(chosenClassId='',chosenSubjectId=''){
    const institutionId=$('institutionSelect').value,courseId=$('courseSelect').value;
    state.classes=[];state.subjects=[];
    selectOptions($('classSelect'),[],x=>x.name,courseId?'Loading classes…':'Select course first');
    selectOptions($('subjectSelect'),[],x=>x.name,courseId?'Loading subjects…':'Select course first');
    $('classSelect').disabled=$('subjectSelect').disabled=true;
    if(!institutionId||!courseId)return;
    const [classResult,subjectResult]=await Promise.all([
      db.from('classes').select('id,institution_id,course_id,name,code,is_active,status').eq('institution_id',institutionId).eq('course_id',courseId).order('name'),
      db.from('subjects').select('id,institution_id,course_id,name,code,max_score,is_active').eq('institution_id',institutionId).eq('course_id',courseId).order('name')
    ]);
    if(classResult.error)throw classResult.error;
    if(subjectResult.error)throw subjectResult.error;
    state.classes=(classResult.data||[]).filter(x=>x.is_active!==false&&norm(x.status)!=='inactive');
    state.subjects=(subjectResult.data||[]).filter(x=>x.is_active!==false);
    selectOptions($('classSelect'),state.classes,x=>x.code?`${x.name} (${x.code})`:x.name,'Select class');
    selectOptions($('subjectSelect'),state.subjects,x=>`${x.name}${x.code?` (${x.code})`:''}`,state.subjects.length?'Select one subject':'No active subjects for this course');
    $('classSelect').disabled=false;$('subjectSelect').disabled=false;
    if(chosenClassId)$('classSelect').value=chosenClassId;
    if(chosenSubjectId)$('subjectSelect').value=chosenSubjectId;
    if(!state.classes.length)toast('Koorsadan fasallo active ah lagama helin classes table.','error');
    if(!state.subjects.length)toast('Koorsadan maadooyin active ah lagama helin subjects table.','error');
  }

  async function loadExams(){
    const {data,error}=await db.from('exams').select('id,institution_id,course_id,class_id,subject_id,title,exam_type,exam_date,max_score,duration_minutes,description,created_by,created_at,updated_at').order('created_at',{ascending:false});
    if(error){
      if(/subject_id|column/i.test(errText(error))){state.schemaReady=false;$('schemaWarning').classList.remove('hidden');throw new Error('Column exams.subject_id lama akhrin karo. Fadlan hubi schema-ga database-ka.');}
      throw error;
    }
    state.schemaReady=true;$('schemaWarning').classList.add('hidden');state.exams=data||[];
    await enrichExamNames();renderExams();renderStats();
  }

  async function enrichExamNames(){
    const unique=key=>[...new Set(state.exams.map(x=>x[key]).filter(Boolean))];
    const institutionIds=unique('institution_id'),courseIds=unique('course_id'),classIds=unique('class_id'),subjectIds=unique('subject_id');
    const [ir,cr,clr,sr]=await Promise.all([
      institutionIds.length?db.from('institutions').select('id,name').in('id',institutionIds):Promise.resolve({data:[],error:null}),
      courseIds.length?db.from('courses').select('id,name').in('id',courseIds):Promise.resolve({data:[],error:null}),
      classIds.length?db.from('classes').select('id,name').in('id',classIds):Promise.resolve({data:[],error:null}),
      subjectIds.length?db.from('subjects').select('id,name').in('id',subjectIds):Promise.resolve({data:[],error:null})
    ]);
    for(const r of [ir,cr,clr,sr])if(r.error)throw r.error;
    const map=rows=>new Map((rows||[]).map(x=>[x.id,x.name]));
    const im=map(ir.data),cm=map(cr.data),clm=map(clr.data),sm=map(sr.data);
    state.exams=state.exams.map(x=>({...x,institution_name:im.get(x.institution_id)||'Unknown institution',course_name:cm.get(x.course_id)||'Unknown course',class_name:clm.get(x.class_id)||'No class',subject_name:sm.get(x.subject_id)||'Not assigned (legacy)'}));
  }

  function renderStats(){
    $('totalStat').textContent=state.exams.length;
    $('quizStat').textContent=state.exams.filter(x=>norm(x.exam_type)==='quiz').length;
    $('midtermStat').textContent=state.exams.filter(x=>norm(x.exam_type)==='midterm').length;
    $('finalStat').textContent=state.exams.filter(x=>norm(x.exam_type)==='final').length;
  }

  function renderExams(){
    const q=norm($('examSearch').value),type=norm($('typeFilter').value);
    const rows=state.exams.filter(x=>(!type||norm(x.exam_type)===type)&&(!q||[x.title,x.subject_name,x.course_name,x.class_name,x.institution_name,x.exam_type].some(v=>norm(v).includes(q))));
    const body=$('examTableBody');
    if(!rows.length){body.innerHTML='<tr><td colspan="7" class="empty">No matching exams found.</td></tr>';return;}
    body.innerHTML=rows.map(x=>`<tr>
      <td><strong>${esc(x.title)}</strong><div style="color:#7b8495;margin-top:4px">${esc(x.institution_name)}</div></td>
      <td>${esc(x.subject_name)}${x.subject_id?'':'<div style="color:#b45309;margin-top:4px">Legacy record</div>'}</td>
      <td>${esc(x.course_name)}<div style="color:#7b8495;margin-top:4px">${esc(x.class_name)}</div></td>
      <td><span class="tag">${esc(parseType(x.exam_type))}</span></td><td>${esc(x.exam_date||'Not set')}</td><td>${esc(x.max_score)}</td>
      <td><div class="row-actions"><button class="icon-btn" title="Load students / marks" aria-label="Load students" data-action="students" data-id="${esc(x.id)}"><i class="fa-solid fa-users"></i></button><button class="icon-btn" title="Edit exam" aria-label="Edit exam" data-action="edit" data-id="${esc(x.id)}"><i class="fa-solid fa-pen"></i></button><button class="icon-btn delete" title="Delete exam" aria-label="Delete exam" data-action="delete" data-id="${esc(x.id)}"><i class="fa-solid fa-trash"></i></button></div></td>
    </tr>`).join('');
  }

  function resetForm(){
    $('examForm').reset();$('examId').value='';$('maxScore').value='100';$('formTitle').innerHTML='<i class="fa-solid fa-square-plus"></i> Create Exam';
    $('saveExamBtn').innerHTML='<i class="fa-solid fa-floppy-disk"></i> Save Exam';state.editing=false;
    resetDependentSelectors();
  }

  // Find the one-subject exam selected in the form and load its full enrolled class roster.
  async function loadSelectedSubjectRoster(){
    const institutionId=$('institutionSelect').value;
    const courseId=$('courseSelect').value;
    const classId=$('classSelect').value;
    const subjectId=$('subjectSelect').value;
    if(!institutionId||!courseId||!classId||!subjectId){
      toast('Dooro Institution, Course, Class iyo hal Subject marka hore.','error');
      return;
    }
    const matches=state.exams
      .filter(e=>e.institution_id===institutionId&&e.course_id===courseId&&e.class_id===classId&&e.subject_id===subjectId)
      .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
    if(!matches.length){
      toast('Imtixaan maadadan u gaar ah weli ma jiro. Riix Save Exam marka hore; kadib ardayda si toos ah ayaa loo soo rari doonaa.','info');
      return;
    }
    await loadStudentsForExam(matches[0].id);
  }

  async function saveExam(event){
    event.preventDefault();
    if(!state.schemaReady){toast('Database-ka exams.subject_id lama heli karo.','error');return;}
    const institution_id=$('institutionSelect').value,course_id=$('courseSelect').value,class_id=$('classSelect').value,subject_id=$('subjectSelect').value;
    const title=$('examTitle').value.trim(),exam_type=$('examType').value,max_score=Number($('maxScore').value);
    if(!institution_id||!course_id||!class_id||!subject_id||!title){toast('Buuxi institution, course, class, subject iyo exam title.','error');return;}
    if(!state.subjects.some(x=>x.id===subject_id)){toast('Maadada la doortay kuma jirto koorsadan. Dib u dooro.','error');return;}
    if(!state.classes.some(x=>x.id===class_id)){toast('Fasalka la doortay kuma jiro koorsadan.','error');return;}
    if(!Number.isFinite(max_score)||max_score<=0||max_score>1000){toast('Maximum Score waa inuu u dhexeeyaa 0 iyo 1000.','error');return;}
    const payload={institution_id,course_id,class_id,subject_id,title,exam_type,exam_date:$('examDate').value||null,max_score,duration_minutes:$('duration').value?Number($('duration').value):null,description:$('description').value.trim()||null};
    const id=$('examId').value;
    // Prevent accidental duplicate exams with the same institution, class, subject, type and title.
    const duplicate=state.exams.find(x=>x.id!==id&&x.institution_id===institution_id&&x.class_id===class_id&&x.subject_id===subject_id&&norm(x.exam_type)===norm(exam_type)&&norm(x.title)===norm(title));
    if(duplicate){toast('Imtixaan magac, fasal, maado iyo nooc isku mid ah horay ayuu u jiraa.','error');return;}
    if(!id)payload.created_by=state.user.id;
    setBusy($('saveExamBtn'),true,'<i class="fa-solid fa-spinner fa-spin"></i> Saving…');
    try{
      const response=id?await db.from('exams').update(payload).eq('id',id).select('id').single():await db.from('exams').insert(payload).select('id').single();
      if(response.error)throw response.error;
      const savedExamId=response.data?.id||id;
      toast(id?'Imtixaanka waa la cusboonaysiiyey.':'Imtixaanka waa la sameeyey. Hal maado ayaa ku xiran.');
      resetForm();
      await loadExams();
      if(savedExamId)await loadStudentsForExam(savedExamId);
    }catch(e){toast(`Could not save exam: ${errText(e)}`,'error');}
    finally{setBusy($('saveExamBtn'),false);}
  }

  async function editExam(id){
    const exam=state.exams.find(x=>x.id===id);if(!exam)return;
    $('examId').value=exam.id;$('institutionSelect').value=exam.institution_id;
    await loadCourses(exam.institution_id,exam.course_id);
    await onCourseChange(exam.class_id,exam.subject_id);
    $('examTitle').value=exam.title||'';$('examType').value=exam.exam_type||'quiz';$('examDate').value=exam.exam_date||'';
    $('maxScore').value=exam.max_score??100;$('duration').value=exam.duration_minutes??'';$('description').value=exam.description||'';
    $('formTitle').innerHTML='<i class="fa-solid fa-pen"></i> Edit Exam';$('saveExamBtn').innerHTML='<i class="fa-solid fa-floppy-disk"></i> Update Exam';state.editing=true;
    $('examFormPanel').scrollIntoView({behavior:'smooth',block:'start'});
    if(!exam.subject_id)toast('Imtixaankan waa legacy record. Dooro maado si aad u cusboonaysiiso.','info');
  }

  async function deleteExam(id){
    const exam=state.exams.find(x=>x.id===id);if(!exam)return;
    if(!confirm(`Delete “${exam.title}”? Natiijooyin ku xiran lama tirtirayo.`))return;
    try{
      const [rr,gr]=await Promise.all([
        db.from('results').select('id',{count:'exact',head:true}).eq('exam_id',id),
        db.from('grades').select('id',{count:'exact',head:true}).eq('exam_id',id)
      ]);
      if(rr.error)throw rr.error;if(gr.error)throw gr.error;
      if((rr.count||0)>0||(gr.count||0)>0){toast('Imtixaankan wuxuu leeyahay natiijooyin/dhibco. Lama tirtirin si xogta ardayda loo ilaaliyo.','error');return;}
      const {error}=await db.from('exams').delete().eq('id',id);if(error)throw error;
      if(state.selectedExam?.id===id)clearStudents();toast('Imtixaanka waa la tirtiray.');await loadExams();
    }catch(e){toast(`Delete failed: ${errText(e)}`,'error');}
  }

  async function loadStudentsForExam(examId){
    const exam=state.exams.find(x=>String(x.id)===String(examId));
    if(!exam){toast('Imtixaanka la doortay lagama helin liiska. Dib u cusboonaysii bogga.','error');return;}
    if(!exam.class_id||!exam.course_id){toast('Imtixaankan class/course kuma xirna. Edit garee oo ku xiro fasal sax ah.','error');return;}

    state.selectedExam=exam;
    state.students=[];
    $('studentSearch').value='';
    $('marksExamLabel').textContent=`${exam.title}${exam.subject_name?` · ${exam.subject_name}`:''}`;
    $('studentsTableBody').innerHTML='<tr><td colspan="8" class="empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading enrolled students…</td></tr>';
    $('studentCount').textContent='Loading…';
    $('saveMarksBtn').disabled=true;
    $('publishExamResultsBtn').disabled=true;

    try{
      // First look for enrollments matching institution + course + class.
      const exact=await db.from('enrollments')
        .select('student_id,status,course_id,class_id,institution_id')
        .eq('institution_id',exam.institution_id)
        .eq('course_id',exam.course_id)
        .eq('class_id',exam.class_id);
      if(exact.error)throw new Error(`Enrollments query failed: ${errText(exact.error)}`);
      let enrollmentRows=(exact.data||[]).filter(e=>activeStatus(e.status));

      // Some legacy enrollments have a stale/missing course_id. If there are no active
      // exact matches, retry using institution + class and then filter active enrollments.
      if(!enrollmentRows.length){
        const fallback=await db.from('enrollments')
          .select('student_id,status,course_id,class_id,institution_id')
          .eq('institution_id',exam.institution_id)
          .eq('class_id',exam.class_id);
        if(fallback.error)throw new Error(`Class enrollments query failed: ${errText(fallback.error)}`);
        enrollmentRows=(fallback.data||[]).filter(e=>activeStatus(e.status));
      }
      const enrollmentIds=[...new Set(enrollmentRows.map(e=>String(e.student_id||'').trim()).filter(Boolean))];
      if(!enrollmentIds.length){
        $('studentsTableBody').innerHTML='<tr><td colspan="8" class="empty">Enrollment arday oo active ah lagama helin fasalkan.</td></tr>';
        $('studentCount').textContent='0 students';
        toast('Arday lama helin. Hubi enrollments-ka fasalkan iyo status-kooda (active).','error');
        return;
      }

      // Support both common schemas: enrollments.student_id -> students.id (UUID),
      // or older records that store students.student_id (e.g. GA-2026-000123).
      const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const uuidIds=enrollmentIds.filter(id=>uuidPattern.test(id));
      const publicIds=enrollmentIds.filter(id=>!uuidPattern.test(id));
      const studentQueries=[];
      if(uuidIds.length)studentQueries.push(db.from('students').select('id,student_id,full_name,institution_id,status,photo_url,profile_id').in('id',uuidIds));
      if(publicIds.length)studentQueries.push(db.from('students').select('id,student_id,full_name,institution_id,status,photo_url,profile_id').in('student_id',publicIds));
      const studentResponses=await Promise.all(studentQueries);
      const failedStudentQuery=studentResponses.find(r=>r.error);
      if(failedStudentQuery)throw new Error(`Students query failed: ${errText(failedStudentQuery.error)}`);
      let studentRows=[...new Map(studentResponses.flatMap(r=>r.data||[]).map(s=>[s.id,s])).values()];

      // If a deployment has mixed identifier formats, make one safe fallback lookup
      // using both identifier columns without ever sending public IDs to the UUID column.
      if(!studentRows.length && uuidIds.length && publicIds.length){
        const [byId,byCode]=await Promise.all([
          db.from('students').select('id,student_id,full_name,institution_id,status,photo_url,profile_id').in('id',uuidIds),
          db.from('students').select('id,student_id,full_name,institution_id,status,photo_url,profile_id').in('student_id',publicIds)
        ]);
        if(byId.error)throw byId.error;if(byCode.error)throw byCode.error;
        studentRows=[...new Map([...(byId.data||[]),...(byCode.data||[])].map(s=>[s.id,s])).values()];
      }
      studentRows=studentRows.filter(s=>activeStatus(s.status));
      if(!studentRows.length){
        $('studentsTableBody').innerHTML='<tr><td colspan="8" class="empty">Enrollment waa la helay, laakiin ardayda lagama waafajin students table.</td></tr>';
        $('studentCount').textContent='0 students';
        toast('Enrollment waa jiraa, laakiin student_id lama waafajin students.id ama students.student_id. Hubi xiriirka labada table.','error');
        return;
      }

      // Keep only students belonging to this institution where that field is populated.
      studentRows=studentRows.filter(s=>!s.institution_id||s.institution_id===exam.institution_id);
      // Fetch profile.avatar_url only as a fallback; students.photo_url has priority.
      studentRows=await loadStudentPhotos(studentRows);
      studentRows.sort((a,b)=>String(a.full_name||'').localeCompare(String(b.full_name||'')));
      const studentIds=studentRows.map(s=>s.id);
      const [resultsResponse,gradesResponse]=await Promise.all([
        db.from('results').select('id,student_id,exam_id,subject_id,score,max_score,percentage,grade,remarks,is_published,created_at,updated_at').eq('exam_id',exam.id).in('student_id',studentIds),
        db.from('grades').select('id,student_id,exam_id,score,grade,remarks,created_at,updated_at').eq('exam_id',exam.id).in('student_id',studentIds)
      ]);
      if(resultsResponse.error)throw new Error(`Results lookup failed: ${errText(resultsResponse.error)}`);
      if(gradesResponse.error)throw new Error(`Grades lookup failed: ${errText(gradesResponse.error)}`);
      const latestByStudent=rows=>{
        const map=new Map();
        for(const row of (rows||[]).sort((a,b)=>new Date(a.updated_at||a.created_at||0)-new Date(b.updated_at||b.created_at||0)))map.set(row.student_id,row);
        return map;
      };
      // Match old results by exam + student, even if subject_id is blank/mismatched.
      // Existing duplicate historical rows are not deleted automatically.
      const resultMap=latestByStudent(resultsResponse.data),gradeMap=latestByStudent(gradesResponse.data);
      state.students=studentRows.map(student=>{
        const result=resultMap.get(student.id)||null;
        const gradeRow=gradeMap.get(student.id)||null;
        return {...student,result,gradeRow,score:result?.score??gradeRow?.score??'',remarks:result?.remarks??gradeRow?.remarks??''};
      });
      renderStudents();
      $('saveMarksBtn').disabled=false;
      $('publishExamResultsBtn').disabled=false;
      $('marksPanel').scrollIntoView({behavior:'smooth',block:'start'});
      toast(`${state.students.length} arday ayaa la soo raray. Geli dhibcaha kadib Save Marks.`,'success');
    }catch(e){
      console.error('[GAAWOW Exams] loadStudentsForExam failed',e);
      $('studentsTableBody').innerHTML=`<tr><td colspan="8" class="empty">Ardayda lama soo rari karin: ${esc(errText(e))}</td></tr>`;
      $('studentCount').textContent='Load failed';
      $('saveMarksBtn').disabled=true;
      $('publishExamResultsBtn').disabled=true;
      toast(`Ardayda lama soo rari karin: ${errText(e)}`,'error');
    }
  }

  // Load photos from students.photo_url first, then profiles.avatar_url as fallback.
  async function loadStudentPhotos(studentRows){
    const profileIds=[...new Set(studentRows.map(s=>s.profile_id).filter(Boolean))];
    const profilesById=new Map();
    if(profileIds.length){
      const {data,error}=await db.from('profiles').select('id,avatar_url').in('id',profileIds);
      if(error){
        // Profile photos are optional. Do not block the exam roster if RLS denies this lookup.
        console.warn('[GAAWOW Exams] Could not load profile photos:',errText(error));
      }else{
        for(const profile of (data||[])){
          if(profile.avatar_url)profilesById.set(profile.id,String(profile.avatar_url).trim());
        }
      }
    }
    return studentRows.map(student=>{
      const ownPhoto=typeof student.photo_url==='string'?student.photo_url.trim():'';
      const profilePhoto=profilesById.get(student.profile_id)||'';
      return {...student,photo_url:ownPhoto||profilePhoto};
    });
  }

  function renderStudents(){
    const q=norm($('studentSearch').value);
    const rows=state.students.filter(s=>!q||norm(s.full_name).includes(q)||norm(s.student_id).includes(q));
    $('studentCount').textContent=`${rows.length} student${rows.length===1?'':'s'}`;
    if(!rows.length){
      const message=state.students.length?'No students match this search.':'Select an exam to load enrolled students.';
      $('studentsTableBody').innerHTML=`<tr><td colspan="8" class="empty">${message}</td></tr>`;
      return;
    }
    const max=Number(state.selectedExam?.max_score||100);
    $('studentsTableBody').innerHTML=rows.map((s,i)=>{
      const score=s.score===''?'':Number(s.score);
      const pct=score===''?'':Math.round(score/max*10000)/100;
      const grade=pct===''?'':gradeFor(pct);
      const published=s.result?.is_published?'<div style="color:#18794e;font-size:10px;margin-top:4px">Published result</div>':'';
      const photoUrl=typeof s.photo_url==='string'?s.photo_url.trim():'';
      const photo=photoUrl
        ? `<img src="${esc(photoUrl)}" alt="${esc(s.full_name||'Student')} photo" loading="lazy" referrerpolicy="no-referrer" style="width:42px;height:42px;object-fit:cover;border-radius:50%;border:2px solid #e2e8f0;display:block" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          + `<span aria-label="No photo" title="No photo available" style="display:none;width:42px;height:42px;border-radius:50%;background:#eef2ff;color:#334155;align-items:center;justify-content:center;font-weight:700;font-size:12px">${esc(String(s.full_name||'S').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'S')}</span>`
        : `<span aria-label="No photo" title="No photo available" style="display:flex;width:42px;height:42px;border-radius:50%;background:#eef2ff;color:#334155;align-items:center;justify-content:center;font-weight:700;font-size:12px">${esc(String(s.full_name||'S').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'S')}</span>`;
      return `<tr data-student-row="${esc(s.id)}">
        <td>${i+1}</td>
        <td>${photo}</td>
        <td>${esc(s.student_id||'N/A')}</td>
        <td><strong>${esc(s.full_name)}</strong>${published}</td>
        <td><input class="score-input" type="number" min="0" max="${esc(max)}" step="0.01" inputmode="decimal" aria-label="Score for ${esc(s.full_name)}" data-score-id="${esc(s.id)}" value="${esc(s.score)}" placeholder="0-${esc(max)}"></td>
        <td data-pct-id="${esc(s.id)}">${pct===''?'—':`${pct}%`}</td>
        <td data-grade-id="${esc(s.id)}">${grade===''?'—':`<span class="grade-summary">${grade}</span>`}</td>
        <td><input class="score-input" style="width:160px;max-width:100%" data-remarks-id="${esc(s.id)}" aria-label="Remarks for ${esc(s.full_name)}" value="${esc(s.remarks)}" placeholder="Optional"></td>
      </tr>`;
    }).join('');
  }

  function updateScorePreview(input){
    const id=input.dataset.scoreId,value=input.value,max=Number(state.selectedExam?.max_score||100);
    const pct=value===''?'':Math.round(Number(value)/max*10000)/100,grade=pct===''?'':gradeFor(pct);
    const p=document.querySelector(`[data-pct-id="${CSS.escape(id)}"]`),g=document.querySelector(`[data-grade-id="${CSS.escape(id)}"]`);
    if(p)p.textContent=pct===''?'—':`${pct}%`;if(g)g.innerHTML=grade===''?'—':`<span class="grade-summary">${grade}</span>`;
  }

  async function saveResultRow(exam,student,row){
    const maxScore=Number(exam.max_score);
    const score=Number(row.score);
    if(!Number.isFinite(maxScore)||maxScore<=0)throw new Error('Maximum Score waa inuu ka weyn yahay 0.');
    if(!Number.isFinite(score)||score<0||score>maxScore)throw new Error(`Dhibcuhu waa inay u dhexeeyaan 0 iyo ${maxScore}.`);
    if(!exam.institution_id||!exam.id||!student?.id)throw new Error('Xogta institution, exam ama student ayaa maqan.');
    if(!exam.subject_id)throw new Error('Imtixaankan subject_id kuma xirna. Ku xiro maado ka hor intaadan kaydin Results.');

    const percentage=Math.round((score/maxScore)*10000)/100;
    const finalGrade=gradeFor(percentage);
    let existingResult=student.result||null;
    if(!existingResult?.id){
      const existingResponse=await db.from('results')
        .select('id,is_published,created_by')
        .eq('exam_id',exam.id).eq('student_id',student.id)
        .limit(1).maybeSingle();
      if(existingResponse.error)throw new Error(`Could not check existing result: ${errText(existingResponse.error)}`);
      existingResult=existingResponse.data||null;
    }

    /*
      The database has UNIQUE (exam_id, student_id) on results.
      Upsert is safer than SELECT-then-INSERT and also repairs stale institution_id
      values on existing result rows. Keep published results published when updating.
    */
    const resultPayload={
      institution_id:exam.institution_id,
      student_id:student.id,
      exam_id:exam.id,
      subject_id:exam.subject_id,
      score,
      max_score:maxScore,
      percentage,
      grade:finalGrade,
      remarks:row.remarks||null,
      is_published:existingResult?.is_published===true,
      updated_at:new Date().toISOString()
    };
    if(!existingResult?.id)resultPayload.created_by=state.user.id;

    const resultResponse=await db.from('results')
      .upsert(resultPayload,{onConflict:'exam_id,student_id'})
      .select('id,institution_id,student_id,exam_id,subject_id,score,max_score,percentage,grade,remarks,is_published,created_by,created_at,updated_at')
      .single();
    if(resultResponse.error)throw new Error(`Results save failed: ${errText(resultResponse.error)}`);
    const result=resultResponse.data;

    // grades has UNIQUE (exam_id, student_id). Use the exam's real institution_id,
    // not the possibly stale institution_id from an older results record.
    const gradePayload={
      institution_id:exam.institution_id,
      exam_id:exam.id,
      student_id:student.id,
      score,
      grade:finalGrade,
      remarks:row.remarks||null,
      entered_by:state.profile?.id||state.user.id,
      updated_at:new Date().toISOString()
    };
    const gradeResponse=await db.from('grades')
      .upsert(gradePayload,{onConflict:'exam_id,student_id'})
      .select('id,institution_id,student_id,exam_id,score,grade,remarks,entered_by,created_at,updated_at')
      .single();
    if(gradeResponse.error){
      student.result=result;
      throw new Error(`Results waa la kaydiyey, laakiin Grades lama waafajin: ${errText(gradeResponse.error)}`);
    }

    student.result=result;
    student.gradeRow=gradeResponse.data;
    student.score=result.score;
    student.remarks=result.remarks||'';
  }

  async function saveMarks(){
    const exam=state.selectedExam;if(!exam||!state.students.length){toast('Marka hore dooro imtixaan oo soo rar ardayda.','error');return;}
    const max=Number(exam.max_score);
    const rows=state.students.map(student=>{
      const scoreInput=document.querySelector(`[data-score-id="${CSS.escape(student.id)}"]`),remarksInput=document.querySelector(`[data-remarks-id="${CSS.escape(student.id)}"]`);
      const raw=scoreInput?.value??'';
      return {student,score:raw.trim()===''?null:Number(raw),remarks:remarksInput?.value?.trim()||null};
    });
    const invalid=rows.find(r=>r.score!==null&&(!Number.isFinite(r.score)||r.score<0||r.score>max));
    if(invalid){toast(`Dhibcaha ${invalid.student.full_name} waa inuu u dhexeeyaa 0 iyo ${max}.`,'error');return;}
    const entered=rows.filter(r=>r.score!==null);
    if(!entered.length){toast('Ma jiro dhibic la geliyey. Dhibcaha madhan lama kaydinayo.','info');return;}
    setBusy($('saveMarksBtn'),true,'<i class="fa-solid fa-spinner fa-spin"></i> Saving marks…');
    let saved=0;
    try{
      for(const row of entered){await saveResultRow(exam,row.student,row);saved++;}
      toast(`Dhibcaha ${saved} arday waa la kaydiyey, waxaana lala waafajiyey Grades.`);renderStudents();
    }catch(e){toast(`Kaydintu waxay gaartay ${saved}/${entered.length} arday. ${errText(e)}`,'error');renderStudents();}
    finally{setBusy($('saveMarksBtn'),false);}
  }

  function resetStudentGradingSelectors(level='institution'){
    if(level==='institution'){
      $('studentCourseSelect').innerHTML='<option value="">Select institution first</option>';$('studentCourseSelect').disabled=true;
      $('studentClassSelect').innerHTML='<option value="">Select course first</option>';$('studentClassSelect').disabled=true;
      $('studentSubjectFilter').innerHTML='<option value="">All subjects</option>';$('studentSubjectFilter').disabled=true;
      $('studentSelect').innerHTML='<option value="">Select class first</option>';$('studentSelect').disabled=true;
    } else if(level==='course'){
      $('studentClassSelect').innerHTML='<option value="">Select course first</option>';$('studentClassSelect').disabled=true;
      $('studentSubjectFilter').innerHTML='<option value="">All subjects</option>';$('studentSubjectFilter').disabled=true;
      $('studentSelect').innerHTML='<option value="">Select class first</option>';$('studentSelect').disabled=true;
    } else if(level==='class'){
      $('studentSubjectFilter').innerHTML='<option value="">All subjects</option>';$('studentSubjectFilter').disabled=true;
      $('studentSelect').innerHTML='<option value="">Select class first</option>';$('studentSelect').disabled=true;
    }
    state.studentGrade={student:null,rows:[]};$('saveStudentSubjectsBtn').disabled=true;$('publishClassResultsBtn').disabled=true;
    $('studentSubjectsBody').innerHTML='<tr><td colspan="9" class="empty">Dooro Institution, Course, Class iyo Student.</td></tr>';
  }

  async function loadStudentGradeCourses(){
    resetStudentGradingSelectors('institution');
    const institutionId=$('studentInstitutionSelect').value;if(!institutionId)return;
    const {data,error}=await db.from('courses').select('id,institution_id,name,code,is_active').eq('institution_id',institutionId).order('name');
    if(error)throw error;
    const rows=(data||[]).filter(x=>x.is_active!==false);
    selectOptions($('studentCourseSelect'),rows,x=>x.code?`${x.name} (${x.code})`:x.name,'Select course');$('studentCourseSelect').disabled=false;
  }

  async function loadStudentGradeClasses(){
    resetStudentGradingSelectors('course');
    const institutionId=$('studentInstitutionSelect').value,courseId=$('studentCourseSelect').value;if(!institutionId||!courseId)return;
    const {data,error}=await db.from('classes').select('id,institution_id,course_id,name,code,is_active,status').eq('institution_id',institutionId).eq('course_id',courseId).order('name');
    if(error)throw error;
    const rows=(data||[]).filter(x=>x.is_active!==false&&norm(x.status)!=='inactive');
    selectOptions($('studentClassSelect'),rows,x=>x.code?`${x.name} (${x.code})`:x.name,'Select class');$('studentClassSelect').disabled=false;
  }

  async function loadStudentGradeStudents(){
    resetStudentGradingSelectors('class');
    const institutionId=$('studentInstitutionSelect').value,courseId=$('studentCourseSelect').value,classId=$('studentClassSelect').value;
    if(!institutionId||!courseId||!classId)return;
    const subjectFilter=$('studentSubjectFilter');
    const classExams=state.exams.filter(e=>e.institution_id===institutionId&&e.course_id===courseId&&e.class_id===classId&&e.subject_id);
    const subjectMap=new Map(classExams.map(e=>[e.subject_id,e.subject_name||'Subject']));
    subjectFilter.innerHTML='<option value="">All subjects</option>'+[...subjectMap.entries()].sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');
    subjectFilter.disabled=subjectMap.size===0;
    const {data:enrollments,error:eError}=await db.from('enrollments').select('student_id,status').eq('institution_id',institutionId).eq('course_id',courseId).eq('class_id',classId);
    if(eError)throw eError;
    const ids=[...new Set((enrollments||[]).filter(e=>activeStatus(e.status)).map(e=>e.student_id).filter(Boolean))];
    if(!ids.length){selectOptions($('studentSelect'),[],x=>x.full_name,'No enrolled students');$('studentSelect').disabled=true;toast('Fasalkan arday active ah lagama helin enrollments.','error');return;}
    const {data,error}=await db.from('students').select('id,student_id,full_name,institution_id,status').eq('institution_id',institutionId).in('id',ids).order('full_name');
    if(error)throw error;
    const students=(data||[]).filter(s=>activeStatus(s.status));
    selectOptions($('studentSelect'),students,x=>`${x.full_name} (${x.student_id||'No ID'})`,'Select student');$('studentSelect').disabled=false;
  }

  async function loadStudentSubjects(){
    const institutionId=$('studentInstitutionSelect').value,courseId=$('studentCourseSelect').value,classId=$('studentClassSelect').value,studentId=$('studentSelect').value;
    if(!institutionId||!courseId||!classId||!studentId){toast('Dooro Institution, Course, Class iyo Student.','error');return;}
    const studentLabel=$('studentSelect').selectedOptions[0]?.text||'Selected student';
    $('studentSubjectsBody').innerHTML='<tr><td colspan="9" class="empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading subjects and exams…</td></tr>';
    $('saveStudentSubjectsBtn').disabled=true;
    try{
      const studentResponse=await db.from('students').select('id,student_id,full_name,institution_id,status').eq('id',studentId).eq('institution_id',institutionId).single();
      if(studentResponse.error)throw studentResponse.error;
      const student=studentResponse.data;
      const selectedSubjectId=$('studentSubjectFilter').value;
      const exams=state.exams.filter(e=>e.institution_id===institutionId&&e.course_id===courseId&&e.class_id===classId&&e.subject_id&&(!selectedSubjectId||e.subject_id===selectedSubjectId));
      if(!exams.length){state.studentGrade={student,rows:[]};renderStudentSubjects();toast(`${studentLabel}: imtixaan/maado loo sameeyey fasalkan lama helin.`,'info');return;}
      const examIds=exams.map(e=>e.id);
      const [rr,gr]=await Promise.all([
        db.from('results').select('id,student_id,exam_id,subject_id,score,max_score,percentage,grade,remarks,is_published,created_at,updated_at').eq('student_id',student.id).in('exam_id',examIds),
        db.from('grades').select('id,student_id,exam_id,score,grade,remarks,created_at,updated_at').eq('student_id',student.id).in('exam_id',examIds)
      ]);
      if(rr.error)throw rr.error;if(gr.error)throw gr.error;
      const latest=rows=>{const m=new Map();for(const r of (rows||[]).sort((a,b)=>new Date(a.updated_at||a.created_at||0)-new Date(b.updated_at||b.created_at||0)))m.set(r.exam_id,r);return m;};
      const resultMap=latest(rr.data),gradeMap=latest(gr.data);
      state.studentGrade={student,rows:exams.map(exam=>{const result=resultMap.get(exam.id)||null,gradeRow=gradeMap.get(exam.id)||null;return {exam,result,gradeRow,score:result?.score??gradeRow?.score??'',remarks:result?.remarks??gradeRow?.remarks??''};})};
      renderStudentSubjects();$('saveStudentSubjectsBtn').disabled=false;$('publishClassResultsBtn').disabled=false;
    }catch(e){$('studentSubjectsBody').innerHTML=`<tr><td colspan="9" class="empty">Unable to load student subjects: ${esc(errText(e))}</td></tr>`;toast(`Student subjects could not be loaded: ${errText(e)}`,'error');}
  }

  function renderStudentSubjects(){
    const {student,rows}=state.studentGrade;
    if(!student||!rows.length){$('studentSubjectsBody').innerHTML='<tr><td colspan="9" class="empty">Ardaygan imtixaan maado ku xiran lagama helin fasalkan.</td></tr>';return;}
    $('studentSubjectsBody').innerHTML=rows.map((row,i)=>{
      const exam=row.exam,max=Number(exam.max_score||100),score=row.score==null?'':row.score,pct=score===''?'':Math.round(Number(score)/max*10000)/100,grade=pct===''?'':gradeFor(pct);
      const status=row.result?.is_published?'<span class="tag" style="background:#eaf8f0;color:#17633e">Published</span>':'<span class="tag">Private / Draft</span>';
      return `<tr><td>${i+1}</td><td><strong>${esc(exam.subject_name||'Subject')}</strong><div style="color:#7b8495;margin-top:4px">${esc(exam.title)}</div></td><td>${esc(parseType(exam.exam_type))}</td><td>${esc(max)}</td><td><input class="score-input" type="number" min="0" max="${esc(max)}" step="0.01" inputmode="decimal" data-student-exam-score="${esc(exam.id)}" value="${esc(score)}" placeholder="0-${esc(max)}" aria-label="Score for ${esc(exam.title)}"></td><td data-student-exam-pct="${esc(exam.id)}">${pct===''?'—':pct+'%'}</td><td data-student-exam-grade="${esc(exam.id)}">${grade||'—'}</td><td><input class="score-input" style="width:160px;max-width:100%" data-student-exam-remarks="${esc(exam.id)}" value="${esc(row.remarks||'')}" placeholder="Optional remarks"></td><td>${status}</td></tr>`;
    }).join('');
  }

  function updateStudentSubjectPreview(input){
    const examId=input.dataset.studentExamScore,row=state.studentGrade.rows.find(x=>x.exam.id===examId);if(!row)return;
    const raw=input.value,max=Number(row.exam.max_score||100),pct=raw.trim()===''?'':Math.round(Number(raw)/max*10000)/100,grade=pct===''?'':gradeFor(pct);
    const p=document.querySelector(`[data-student-exam-pct="${CSS.escape(examId)}"]`),g=document.querySelector(`[data-student-exam-grade="${CSS.escape(examId)}"]`);
    if(p)p.textContent=pct===''?'—':pct+'%';if(g)g.textContent=grade||'—';
  }

  async function saveStudentSubjectMarks(){
    const {student,rows}=state.studentGrade;if(!student||!rows.length){toast('Marka hore dooro arday oo soo rar maaddooyinkiisa.','error');return;}
    const values=rows.map(row=>{const input=document.querySelector(`[data-student-exam-score="${CSS.escape(row.exam.id)}"]`),remarks=document.querySelector(`[data-student-exam-remarks="${CSS.escape(row.exam.id)}"]`),raw=input?.value??'';return {...row,score:raw.trim()===''?null:Number(raw),newRemarks:remarks?.value?.trim()||null};});
    const invalid=values.find(r=>r.score!==null&&(!Number.isFinite(r.score)||r.score<0||r.score>Number(r.exam.max_score||100)));
    if(invalid){toast(`${invalid.exam.subject_name}: dhibcuhu waa inay u dhexeeyaan 0 iyo ${invalid.exam.max_score}.`,'error');return;}
    const entered=values.filter(r=>r.score!==null);if(!entered.length){toast('Ma jiro dhibic la geliyey. Dhibcaha madhan lama kaydinayo.','info');return;}
    setBusy($('saveStudentSubjectsBtn'),true,'<i class="fa-solid fa-spinner fa-spin"></i> Saving…');let saved=0;
    try{
      for(const row of entered){
        const studentRecord={...student,result:row.result,gradeRow:row.gradeRow};
        await saveResultRow(row.exam,studentRecord,{score:row.score,remarks:row.newRemarks});
        row.result=studentRecord.result;row.gradeRow=studentRecord.gradeRow;row.score=row.result.score;row.remarks=row.result.remarks||'';saved++;
      }
      toast(`Waxaa la kaydiyey ${saved} natiijo oo loogu talagalay ${student.full_name}. Natiijooyinka cusub weli waa private.`);renderStudentSubjects();
    }catch(e){toast(`Kaydintu waxay gaartay ${saved}/${entered.length}. ${errText(e)}`,'error');renderStudentSubjects();}
    finally{setBusy($('saveStudentSubjectsBtn'),false);}
  }

  function clearStudents(){
    state.selectedExam=null;state.students=[];$('marksExamLabel').textContent='Select an exam below';$('studentCount').textContent='0 students';
    $('studentsTableBody').innerHTML='<tr><td colspan="8" class="empty">Select the students button on an exam record to load enrolled students.</td></tr>';$('saveMarksBtn').disabled=true;$('publishExamResultsBtn').disabled=true;
  }

  async function publishAllClassResults(){
    const institutionId=$('studentInstitutionSelect').value,courseId=$('studentCourseSelect').value,classId=$('studentClassSelect').value;
    if(!institutionId||!courseId||!classId){toast('Dooro Institution, Course iyo Class marka hore.','error');return;}
    const exams=state.exams.filter(e=>e.institution_id===institutionId&&e.course_id===courseId&&e.class_id===classId&&e.subject_id);
    if(!exams.length){toast('Fasalkan imtixaanno maado ku xiran lagama helin.','error');return;}
    if(!confirm('Ma daabacaysaa dhammaan natiijooyinka la kaydiyey ee fasalkan? Kaliya natiijooyinka hore loo kaydiyey ayaa la daabacayaa.'))return;
    setBusy($('publishClassResultsBtn'),true,'<i class="fa-solid fa-spinner fa-spin"></i> Publishing all…');
    try{
      const {data:enrollments,error:eError}=await db.from('enrollments').select('student_id,status').eq('institution_id',institutionId).eq('course_id',courseId).eq('class_id',classId);
      if(eError)throw eError;
      const studentIds=[...new Set((enrollments||[]).filter(e=>activeStatus(e.status)).map(e=>e.student_id).filter(Boolean))];
      if(!studentIds.length){toast('Fasalkan arday active ah lagama helin.','error');return;}
      const examIds=exams.map(e=>e.id);
      const {data,error}=await db.from('results').update({is_published:true}).eq('institution_id',institutionId).in('exam_id',examIds).in('student_id',studentIds).select('id');
      if(error)throw error;
      const count=(data||[]).length;
      if(!count){toast('Natiijooyin la kaydiyey lama helin. Marka hore geli dhibcaha oo Save samee.','info');return;}
      toast(`Guul! ${count} natiijo ayaa la daabacay fasalkan. Ardaydu waxay ka arki karaan Student Portal.`);
      if(state.studentGrade.student)await loadStudentSubjects();
      if(state.selectedExam&&state.selectedExam.institution_id===institutionId&&state.selectedExam.course_id===courseId&&state.selectedExam.class_id===classId)await loadStudentsForExam(state.selectedExam.id);
    }catch(e){toast(`Publish all failed: ${errText(e)}`,'error');}
    finally{setBusy($('publishClassResultsBtn'),false);}
  }

  async function publishSelectedExamResults(){
    const exam=state.selectedExam;if(!exam||!state.students.length){toast('Marka hore dooro imtixaan oo soo rar ardayda.','error');return;}
    const ids=state.students.map(s=>s.id);if(!ids.length)return;
    if(!confirm(`Ma daabacaysaa natiijooyinka la kaydiyey ee “${exam.title}”? Ardaydu waxay arki doonaan natiijooyinkan Student Portal-kooda.`))return;
    setBusy($('publishExamResultsBtn'),true,'<i class="fa-solid fa-spinner fa-spin"></i> Publishing…');
    try{
      const {data,error}=await db.from('results').update({is_published:true}).eq('exam_id',exam.id).eq('institution_id',exam.institution_id).in('student_id',ids).select('id');
      if(error)throw error;
      const count=(data||[]).length;if(!count){toast('Natiijooyin kaydsan oo la daabici karo lama helin. Marka hore Save Marks samee.','info');return;}
      toast(`Waxaa la daabacay ${count} natiijo. Ardaydu waxay ku arki karaan Student Portal.`);await loadStudentsForExam(exam.id);
    }catch(e){toast(`Publish failed: ${errText(e)}`,'error');}
    finally{setBusy($('publishExamResultsBtn'),false);}
  }

  async function handleTableClick(event){
    const button=event.target.closest('button[data-action]');if(!button)return;
    const id=button.dataset.id,action=button.dataset.action;
    try{
      if(action==='students')await loadStudentsForExam(id);
      if(action==='edit')await editExam(id);
      if(action==='delete')await deleteExam(id);
    }catch(e){
      console.error('[GAAWOW Exams action]',action,e);
      toast(`${action==='students'?'Ardayda lama soo rari karin':action==='edit'?'Imtixaanka lama furi karin':'Tallaabadu way fashilantay'}: ${errText(e)}`,'error');
    }
  }

  function bindEvents(){
    $('institutionSelect').addEventListener('change',async()=>{try{resetFormIfNeeded();await loadCourses($('institutionSelect').value);}catch(e){toast(errText(e),'error');}});
    $('courseSelect').addEventListener('change',async()=>{try{await onCourseChange();}catch(e){toast(errText(e),'error');}});
    $('subjectSelect').addEventListener('change',async()=>{
      const subject=state.subjects.find(x=>x.id===$('subjectSelect').value);
      if(subject&&!$('examId').value){$('examTitle').value=`${subject.name} - ${$('examType').selectedOptions[0]?.text||'Exam'}`;if(subject.max_score)$('maxScore').value=subject.max_score;}
      // If this subject already has an exam for the selected class, show its students immediately.
      if(subject&&$('institutionSelect').value&&$('courseSelect').value&&$('classSelect').value){
        const existing=state.exams.find(e=>e.institution_id===$('institutionSelect').value&&e.course_id===$('courseSelect').value&&e.class_id===$('classSelect').value&&e.subject_id===subject.id);
        if(existing){try{await loadStudentsForExam(existing.id);}catch(e){toast(`Ardayda lama soo rari karin: ${errText(e)}`,'error');}}
      }
    });
    $('loadSelectedSubjectBtn').addEventListener('click',async()=>{
      try{await loadSelectedSubjectRoster();}catch(e){toast(`Ardayda lama soo rari karin: ${errText(e)}`,'error');}
    });
    $('examType').addEventListener('change',()=>{const subject=state.subjects.find(x=>x.id===$('subjectSelect').value);if(subject&&!$('examId').value)$('examTitle').value=`${subject.name} - ${$('examType').selectedOptions[0]?.text||'Exam'}`;});
    $('examForm').addEventListener('submit',saveExam);$('resetFormBtn').addEventListener('click',resetForm);
    $('newExamBtn').addEventListener('click',()=>{resetForm();$('examFormPanel').scrollIntoView({behavior:'smooth',block:'start'});});
    $('examSearch').addEventListener('input',renderExams);$('typeFilter').addEventListener('change',renderExams);
    $('examTableBody').addEventListener('click',handleTableClick);$('studentSearch').addEventListener('input',renderStudents);
    $('studentsTableBody').addEventListener('input',event=>{if(event.target.matches('[data-score-id]'))updateScorePreview(event.target);});
    $('saveMarksBtn').addEventListener('click',saveMarks);$('publishExamResultsBtn').addEventListener('click',publishSelectedExamResults);
    $('studentInstitutionSelect').addEventListener('change',async()=>{try{await loadStudentGradeCourses();}catch(e){toast(errText(e),'error');}});
    $('studentCourseSelect').addEventListener('change',async()=>{try{await loadStudentGradeClasses();}catch(e){toast(errText(e),'error');}});
    $('studentClassSelect').addEventListener('change',async()=>{try{await loadStudentGradeStudents();}catch(e){toast(errText(e),'error');}});
    $('studentSubjectFilter').addEventListener('change',async()=>{if($('studentSelect').value){try{await loadStudentSubjects();}catch(e){toast(errText(e),'error');}}});
    $('studentSelect').addEventListener('change',async()=>{if($('studentSelect').value){await loadStudentSubjects();}else{state.studentGrade={student:null,rows:[]};$('studentSubjectsBody').innerHTML='<tr><td colspan="9" class="empty">Dooro arday si maaddooyinkiisa loo soo bandhigo.</td></tr>';$('saveStudentSubjectsBtn').disabled=true;$('publishClassResultsBtn').disabled=true;}});
    $('loadStudentSubjectsBtn').addEventListener('click',loadStudentSubjects);$('saveStudentSubjectsBtn').addEventListener('click',saveStudentSubjectMarks);$('publishClassResultsBtn').addEventListener('click',publishAllClassResults);
    $('studentSubjectsBody').addEventListener('input',event=>{if(event.target.matches('[data-student-exam-score]'))updateStudentSubjectPreview(event.target);});
    $('logoutBtn').addEventListener('click',async()=>{try{await db.auth.signOut();}finally{location.href='index.html';}});
  }
  function resetFormIfNeeded(){
    // Changing institution while editing should not accidentally keep a stale subject/class selection.
    if($('examId').value){$('examId').value='';$('formTitle').innerHTML='<i class="fa-solid fa-square-plus"></i> Create Exam';$('saveExamBtn').innerHTML='<i class="fa-solid fa-floppy-disk"></i> Save Exam';state.editing=false;}
  }

  async function init(){
    bindEvents();
    try{
      const allowed=await checkSession();if(!allowed)return;
      await loadInstitutions();await loadExams();state.initialized=true;
    }catch(e){
      console.error('[GAAWOW Exams]',e);
      const message=errText(e);
      if(!/login required|restricted/i.test(message))toast(`Initialization failed: ${message}`,'error');
    }
  }
  document.addEventListener('DOMContentLoaded',init);
})();
