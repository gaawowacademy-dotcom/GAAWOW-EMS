Faylka: "exams.js"

'use strict';

/* =========================================================
   GAAWOW EMS — EXAMS MANAGEMENT
   One exam = one subject
   Save marks privately, then publish all reviewed results.
   ========================================================= */

(() => {
  const SUPABASE_URL =
    'https://mytyvqwrxnxpxnxpiicj.supabase.co';

  const SUPABASE_KEY =
    'sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145';

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  const $ = id => document.getElementById(id);

  const state = {
    user: null,
    profile: null,
    institutions: [],
    courses: [],
    classes: [],
    subjects: [],
    exams: [],
    students: [],
    selectedExam: null,
    editing: false,
    schemaReady: true
  };

  const esc = value =>
    String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  const norm = value =>
    String(value ?? '').toLowerCase().trim();

  const errText = error =>
    error?.message ||
    error?.details ||
    String(error || 'Unknown error');

  const toast = (message, type = 'success') => {
    const el = $('toast');

    el.textContent = message;
    el.className = `toast ${type}`;

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      el.classList.add('hidden');
    }, 5000);
  };

  const setBusy = (el, busy, text) => {
    if (!el) return;

    el.disabled = busy;

    if (busy) {
      el.dataset.oldText = el.innerHTML;
      el.innerHTML =
        text ||
        '<i class="fa-solid fa-spinner fa-spin"></i> Please wait…';
    } else if (el.dataset.oldText) {
      el.innerHTML = el.dataset.oldText;
      delete el.dataset.oldText;
    }
  };

  const selectOptions = (
    select,
    rows,
    labelFn,
    placeholder
  ) => {
    select.innerHTML =
      `<option value="">${esc(placeholder)}</option>` +
      rows.map(row =>
        `<option value="${esc(row.id)}">${esc(labelFn(row))}</option>`
      ).join('');
  };

  const parseType = type =>
    norm(type).replace(/_/g, ' ');

  const gradeFor = percentage => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    if (percentage >= 50) return 'E';
    return 'F';
  };

  async function checkSession() {
    const {
      data: { session },
      error
    } = await db.auth.getSession();

    if (error) throw error;

    if (!session?.user) {
      location.href = 'index.html';
      throw new Error('Login required.');
    }

    state.user = session.user;

    const {
      data: profile,
      error: profileError
    } = await db
      .from('profiles')
      .select(
        'id,full_name,email,role,is_active,institution_id'
      )
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (
      !profile ||
      profile.is_active !== true ||
      profile.role !== 'super_admin'
    ) {
      await db.auth.signOut();
      location.href = 'index.html';

      throw new Error(
        'This page is restricted to an active Super Admin.'
      );
    }

    state.profile = profile;

    $('userLabel').textContent =
      profile.full_name ||
      profile.email ||
      session.user.email ||
      'Super Admin';
  }

  async function loadInstitutions() {
    const { data, error } = await db
      .from('institutions')
      .select('id,name,code')
      .order('name');

    if (error) throw error;

    state.institutions = data || [];

    selectOptions(
      $('institutionSelect'),
      state.institutions,
      x => x.code ? `${x.name} (${x.code})` : x.name,
      'Select institution'
    );
  }

  async function loadCourses(
    institutionId,
    chosenId = ''
  ) {
    state.courses = [];
    state.classes = [];
    state.subjects = [];

    selectOptions(
      $('courseSelect'),
      [],
      x => x.name,
      institutionId
        ? 'Loading courses…'
        : 'Select institution first'
    );

    selectOptions(
      $('classSelect'),
      [],
      x => x.name,
      'Select course first'
    );

    selectOptions(
      $('subjectSelect'),
      [],
      x => x.name,
      'Select course first'
    );

    $('courseSelect').disabled = true;
    $('classSelect').disabled = true;
    $('subjectSelect').disabled = true;

    if (!institutionId) return;

    const { data, error } = await db
      .from('courses')
      .select(
        'id,institution_id,name,code,is_active'
      )
      .eq('institution_id', institutionId)
      .order('name');

    if (error) throw error;

    state.courses = (data || []).filter(
      x => x.is_active !== false
    );

    selectOptions(
      $('courseSelect'),
      state.courses,
      x => x.code ? `${x.name} (${x.code})` : x.name,
      'Select course'
    );

    $('courseSelect').disabled = false;

    if (chosenId) {
      $('courseSelect').value = chosenId;
      await onCourseChange();
    }
  }

  async function onCourseChange(
    chosenClassId = '',
    chosenSubjectId = ''
  ) {
    const institutionId =
      $('institutionSelect').value;

    const courseId =
      $('courseSelect').value;

    state.classes = [];
    state.subjects = [];

    selectOptions(
      $('classSelect'),
      [],
      x => x.name,
      courseId ? 'Loading classes…' : 'Select course first'
    );

    selectOptions(
      $('subjectSelect'),
      [],
      x => x.name,
      courseId ? 'Loading subjects…' : 'Select course first'
    );

    $('classSelect').disabled = true;
    $('subjectSelect').disabled = true;

    if (!courseId || !institutionId) return;

    const [classesResult, subjectsResult] =
      await Promise.all([
        db
          .from('classes')
          .select(
            'id,institution_id,course_id,name,code,is_active,status'
          )
          .eq('institution_id', institutionId)
          .eq('course_id', courseId)
          .order('name'),

        db
          .from('subjects')
          .select(
            'id,institution_id,course_id,name,code,max_score,is_active'
          )
          .eq('institution_id', institutionId)
          .eq('course_id', courseId)
          .order('name')
      ]);

    if (classesResult.error) {
      throw classesResult.error;
    }

    if (subjectsResult.error) {
      throw subjectsResult.error;
    }

    state.classes = (classesResult.data || [])
      .filter(x =>
        x.is_active !== false &&
        norm(x.status) !== 'inactive'
      );

    state.subjects = (subjectsResult.data || [])
      .filter(x => x.is_active !== false);

    selectOptions(
      $('classSelect'),
      state.classes,
      x => x.code ? `${x.name} (${x.code})` : x.name,
      'Select class'
    );

    selectOptions(
      $('subjectSelect'),
      state.subjects,
      x => `${x.name}${x.code ? ` (${x.code})` : ''}`,
      state.subjects.length
        ? 'Select one subject'
        : 'No active subjects for this course'
    );

    $('classSelect').disabled = false;
    $('subjectSelect').disabled = false;

    if (chosenClassId) {
      $('classSelect').value = chosenClassId;
    }

    if (chosenSubjectId) {
      $('subjectSelect').value = chosenSubjectId;
    }

    if (!state.subjects.length) {
      toast(
        'Koorsadan maadooyin active ah lagama helin subjects table.',
        'error'
      );
    }
  }

  async function loadExams() {
    const { data, error } = await db
      .from('exams')
      .select(
        'id,institution_id,course_id,class_id,subject_id,title,exam_type,exam_date,max_score,duration_minutes,description,created_by,created_at,updated_at'
      )
      .order('created_at', { ascending: false });

    if (error) {
      if (/subject_id|column/i.test(errText(error))) {
        state.schemaReady = false;

        $('schemaWarning').classList.remove('hidden');

        const fallback = await db
          .from('exams')
          .select(
            'id,institution_id,course_id,class_id,title,exam_type,exam_date,max_score,duration_minutes,description,created_by,created_at,updated_at'
          )
          .order('created_at', { ascending: false });

        if (fallback.error) throw fallback.error;

        state.exams = (fallback.data || []).map(
          x => ({ ...x, subject_id: null })
        );
      } else {
        throw error;
      }
    } else {
      state.exams = data || [];
    }

    await enrichExamNames();

    renderExams();
    renderStats();
  }

  async function enrichExamNames() {
    const ids = field =>
      [...new Set(
        state.exams.map(x => x[field]).filter(Boolean)
      )];

    const institutionIds = ids('institution_id');
    const courseIds = ids('course_id');
    const classIds = ids('class_id');
    const subjectIds = ids('subject_id');

    const [instR, courseR, classR, subjectR] =
      await Promise.all([
        institutionIds.length
          ? db.from('institutions')
              .select('id,name')
              .in('id', institutionIds)
          : Promise.resolve({ data: [], error: null }),

        courseIds.length
          ? db.from('courses')
              .select('id,name')
              .in('id', courseIds)
          : Promise.resolve({ data: [], error: null }),

        classIds.length
          ? db.from('classes')
              .select('id,name')
              .in('id', classIds)
          : Promise.resolve({ data: [], error: null }),

        subjectIds.length
          ? db.from('subjects')
              .select('id,name')
              .in('id', subjectIds)
          : Promise.resolve({ data: [], error: null })
      ]);

    for (const r of [
      instR,
      courseR,
      classR,
      subjectR
    ]) {
      if (r.error) throw r.error;
    }

    const map = rows =>
      new Map((rows || []).map(x => [x.id, x.name]));

    const im = map(instR.data);
    const cm = map(courseR.data);
    const clm = map(classR.data);
    const sm = map(subjectR.data);

    state.exams = state.exams.map(x => ({
      ...x,
      institution_name:
        im.get(x.institution_id) || 'Unknown institution',
      course_name:
        cm.get(x.course_id) || 'Unknown course',
      class_name:
        clm.get(x.class_id) || 'No class',
      subject_name:
        sm.get(x.subject_id) || 'Not assigned (legacy)'
    }));
  }

  function renderStats() {
    $('totalStat').textContent = state.exams.length;

    $('quizStat').textContent =
      state.exams.filter(
        x => norm(x.exam_type) === 'quiz'
      ).length;

    $('midtermStat').textContent =
      state.exams.filter(
        x => norm(x.exam_type) === 'midterm'
      ).length;

    $('finalStat').textContent =
      state.exams.filter(
        x => norm(x.exam_type) === 'final'
      ).length;
  }

  function renderExams() {
    const q = norm($('examSearch').value);
    const type = norm($('typeFilter').value);

    const rows = state.exams.filter(x =>
      (!type || norm(x.exam_type) === type) &&
      (!q || [
        x.title,
        x.subject_name,
        x.course_name,
        x.class_name,
        x.institution_name,
        x.exam_type
      ].some(v => norm(v).includes(q)))
    );

    const body = $('examTableBody');

    if (!rows.length) {
      body.innerHTML =
        '<tr><td colspan="7" class="empty">No matching exams found.</td></tr>';
      return;
    }

    body.innerHTML = rows.map(x => `
      <tr>
        <td>
          <strong>${esc(x.title)}</strong>
          <div style="color:#7b8495;margin-top:4px">
            ${esc(x.institution_name)}
          </div>
        </td>

        <td>
          ${esc(x.subject_name)}
          ${x.subject_id ? '' :
            '<div style="color:#b45309;margin-top:4px">Legacy record</div>'}
        </td>

        <td>
          ${esc(x.course_name)}
          <div style="color:#7b8495;margin-top:4px">
            ${esc(x.class_name)}
          </div>
        </td>

        <td>
          <span class="tag">${esc(parseType(x.exam_type))}</span>
        </td>

        <td>${esc(x.exam_date || 'Not set')}</td>
        <td>${esc(x.max_score)}</td>

        <td>
          <div class="row-actions">
            <button class="icon-btn"
              title="Load students / marks"
              data-action="students"
              data-id="${esc(x.id)}">
              <i class="fa-solid fa-users"></i>
            </button>

            <button class="icon-btn"
              title="Edit exam"
              data-action="edit"
              data-id="${esc(x.id)}">
              <i class="fa-solid fa-pen"></i>
            </button>

            <button class="icon-btn delete"
              title="Delete exam"
              data-action="delete"
              data-id="${esc(x.id)}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function resetForm() {
    $('examForm').reset();

    $('examId').value = '';
    $('maxScore').value = '100';

    $('formTitle').innerHTML =
      '<i class="fa-solid fa-square-plus"></i> Create Exam';

    $('saveExamBtn').innerHTML =
      '<i class="fa-solid fa-floppy-disk"></i> Save Exam';

    state.editing = false;

    selectOptions(
      $('courseSelect'), [], x => x.name,
      'Select institution first'
    );

    selectOptions(
      $('classSelect'), [], x => x.name,
      'Select course first'
    );

    selectOptions(
      $('subjectSelect'), [], x => x.name,
      'Select course first'
    );

    $('courseSelect').disabled = true;
    $('classSelect').disabled = true;
    $('subjectSelect').disabled = true;
  }

  async function saveExam(event) {
    event.preventDefault();

    if (!state.schemaReady) {
      toast(
        'Database-ka exams wuxuu u baahan yahay subject_id. Hubi schema-ga ka hor intaadan sii wadin.',
        'error'
      );
      return;
    }

    const institution_id =
      $('institutionSelect').value;

    const course_id =
      $('courseSelect').value;

    const class_id =
      $('classSelect').value;

    const subject_id =
      $('subjectSelect').value;

    const title =
      $('examTitle').value.trim();

    const exam_type =
      $('examType').value;

    const max_score =
      Number($('maxScore').value);

    if (
      !institution_id ||
      !course_id ||
      !class_id ||
      !subject_id ||
      !title
    ) {
      toast(
        'Fadlan buuxi institution, course, class, subject iyo exam title.',
        'error'
      );
      return;
    }

    if (!state.subjects.some(x => x.id === subject_id)) {
      toast(
        'Maadada la doortay kama tirsana koorsadan.',
        'error'
      );
      return;
    }

    if (!state.classes.some(x => x.id === class_id)) {
      toast(
        'Fasalka la doortay kuma jiro koorsadan.',
        'error'
      );
      return;
    }

    if (!Number.isFinite(max_score) || max_score <= 0) {
      toast(
        'Maximum Score waa inuu ka weynaadaa eber.',
        'error'
      );
      return;
    }

    const payload = {
      institution_id,
      course_id,
      class_id,
      subject_id,
      title,
      exam_type,
      exam_date: $('examDate').value || null,
      max_score,
      duration_minutes:
        $('duration').value
          ? Number($('duration').value)
          : null,
      description:
        $('description').value.trim() || null
    };

    const id = $('examId').value;

    if (!id) {
      payload.created_by = state.user.id;
    }

    setBusy(
      $('saveExamBtn'),
      true,
      '<i class="fa-solid fa-spinner fa-spin"></i> Saving…'
    );

    try {
      let result;

      if (id) {
        result = await db
          .from('exams')
          .update(payload)
          .eq('id', id)
          .select('id')
          .single();
      } else {
        result = await db
          .from('exams')
          .insert(payload)
          .select('id')
          .single();
      }

      if (result.error) throw result.error;

      toast(
        id
          ? 'Exam updated successfully.'
          : 'Exam created successfully.'
      );

      resetForm();
      await loadExams();

    } catch (e) {
      toast(
        `Could not save exam: ${errText(e)}`,
        'error'
      );
    } finally {
      setBusy($('saveExamBtn'), false);
    }
  }

  async function editExam(id) {
    const exam = state.exams.find(x => x.id === id);

    if (!exam) return;

    $('examId').value = exam.id;
    $('institutionSelect').value = exam.institution_id;

    await loadCourses(
      exam.institution_id,
      exam.course_id
    );

    await onCourseChange(
      exam.class_id,
      exam.subject_id
    );

    $('examTitle').value = exam.title || '';
    $('examType').value = exam.exam_type || 'quiz';
    $('examDate').value = exam.exam_date || '';
    $('maxScore').value = exam.max_score ?? 100;
    $('duration').value = exam.duration_minutes ?? '';
    $('description').value = exam.description || '';

    $('formTitle').innerHTML =
      '<i class="fa-solid fa-pen"></i> Edit Exam';

    $('saveExamBtn').innerHTML =
      '<i class="fa-solid fa-floppy-disk"></i> Update Exam';

    state.editing = true;

    $('examFormPanel').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  async function deleteExam(id) {
    const exam = state.exams.find(x => x.id === id);

    if (!exam) return;

    if (!confirm(
      `Delete "${exam.title}"? This cannot be undone.`
    )) return;

    try {
      const [r1, r2] = await Promise.all([
        db.from('results')
          .select('id', { count: 'exact', head: true })
          .eq('exam_id', id),

        db.from('grades')
          .select('id', { count: 'exact', head: true })
          .eq('exam_id', id)
      ]);

      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;

      if ((r1.count || 0) > 0 || (r2.count || 0) > 0) {
        toast(
          'Imtixaankan natiijooyin ayuu leeyahay. Lama tirtirin si xogta loo ilaaliyo.',
          'error'
        );
        return;
      }

      const { error } = await db
        .from('exams')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (state.selectedExam?.id === id) {
        clearStudents();
      }

      toast('Exam deleted.');
      await loadExams();

    } catch (e) {
      toast(
        `Delete failed: ${errText(e)}`,
        'error'
      );
    }
  }

  async function loadStudentsForExam(examId) {
    const exam = state.exams.find(x => x.id === examId);

    if (!exam) return;

    if (!exam.class_id || !exam.course_id) {
      toast(
        'Imtixaankan kuma xirna class/course.',
        'error'
      );
      return;
    }

    if (!exam.subject_id) {
      toast(
        'Imtixaankan ma laha maado. Edit exam oo dooro hal maado.',
        'error'
      );
      return;
    }

    state.selectedExam = exam;
    state.students = [];

    $('marksExamLabel').textContent =
      `${exam.title} · ${exam.subject_name}`;

    $('studentsTableBody').innerHTML =
      '<tr><td colspan="7" class="empty">Loading students…</td></tr>';

    $('saveMarksBtn').disabled = true;

    try {
      const {
        data: enrollments,
        error: eError
      } = await db
        .from('enrollments')
        .select(
          'student_id,status,course_id,class_id,institution_id'
        )
        .eq('institution_id', exam.institution_id)
        .eq('course_id', exam.course_id)
        .eq('class_id', exam.class_id);

      if (eError) throw eError;

      const activeEnrollments =
        (enrollments || []).filter(e =>
          ![
            'withdrawn',
            'cancelled',
            'inactive',
            'completed'
          ].includes(norm(e.status))
        );

      const ids = [
        ...new Set(
          activeEnrollments
            .map(e => e.student_id)
            .filter(Boolean)
        )
      ];

      if (!ids.length) {
        renderStudents();
        toast(
          'Fasalkan enrollment active ah lagama helin.',
          'error'
        );
        return;
      }

      const {
        data: students,
        error: sError
      } = await db
        .from('students')
        .select(
          'id,student_id,full_name,institution_id,status,photo_url'
        )
        .eq('institution_id', exam.institution_id)
        .in('id', ids)
        .order('full_name');

      if (sError) throw sError;

      const studentRows = students || [];

      const {
        data: existing,
        error: rError
      } = await db
        .from('results')
        .select(
          'id,student_id,exam_id,subject_id,score,max_score,percentage,grade,remarks,is_published'
        )
        .eq('exam_id', exam.id)
        .eq('subject_id', exam.subject_id)
        .in(
          'student_id',
          studentRows.map(s => s.id)
        );

      if (rError) throw rError;

      const resultMap = new Map(
        (existing || []).map(r => [r.student_id, r])
      );

      state.students = studentRows.map(s => {
        const result = resultMap.get(s.id) || null;

        return {
          ...s,
          result,
          score: result?.score ?? '',
          remarks: result?.remarks ?? ''
        };
      });

      renderStudents();

      $('saveMarksBtn').disabled = false;

      $('marksPanel').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

    } catch (e) {
      $('studentsTableBody').innerHTML =
        `<tr><td colspan="7" class="empty">${esc(errText(e))}</td></tr>`;

      toast(
        `Students could not be loaded: ${errText(e)}`,
        'error'
      );
    }
  }

  function renderStudents() {
    const q = norm($('studentSearch').value);

    const rows = state.students.filter(s =>
      !q ||
      norm(s.full_name).includes(q) ||
      norm(s.student_id).includes(q)
    );

    $('studentCount').textContent =
      `${rows.length} student${rows.length === 1 ? '' : 's'}`;

    if (!rows.length) {
      $('studentsTableBody').innerHTML =
        '<tr><td colspan="7" class="empty">No students match this search.</td></tr>';
      return;
    }

    const max = Number(state.selectedExam?.max_score || 100);

    $('studentsTableBody').innerHTML = rows.map((s, i) => {
      const score =
        s.score === '' ? '' : Number(s.score);

      const pct = score === ''
        ? ''
        : Math.round(score / max * 10000) / 100;

      const grade =
        pct === '' ? '' : gradeFor(pct);

      const published = s.result?.is_published === true;

      const photo = s.photo_url
        ? `<img src="${esc(s.photo_url)}"
             alt=""
             style="width:38px;height:38px;object-fit:cover;border-radius:50%;margin-right:8px;vertical-align:middle"
             onerror="this.style.display='none'">`
        : `<span style="display:inline-grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#edf3ff;color:#0B4DA2;margin-right:8px;vertical-align:middle">
             <i class="fa-solid fa-user"></i>
           </span>`;

      return `
        <tr data-student-row="${esc(s.id)}">
          <td>${i + 1}</td>

          <td>${esc(s.student_id || 'N/A')}</td>

          <td>
            <div style="display:flex;align-items:center;min-width:190px">
              ${photo}
              <div>
                <strong>${esc(s.full_name)}</strong>
                ${published
                  ? '<div style="color:#18794e;font-size:10px;font-weight:800">PUBLISHED</div>'
                  : '<div style="color:#9a6700;font-size:10px">Not published</div>'}
              </div>
            </div>
          </td>

          <td>
            <input
              class="score-input"
              type="number"
              min="0"
              max="${esc(max)}"
              step="0.01"
              inputmode="decimal"
              data-score-id="${esc(s.id)}"
              value="${esc(s.score)}"
              placeholder="0-${esc(max)}"
              ${published ? 'disabled title="Published results are locked"' : ''}
            >
          </td>

          <td data-pct-id="${esc(s.id)}">
            ${pct === '' ? '—' : `${pct}%`}
          </td>

          <td data-grade-id="${esc(s.id)}">
            ${grade === ''
              ? '—'
              : `<span class="grade-summary">${grade}</span>`}
          </td>

          <td>
            <input
              class="score-input"
              style="width:160px;max-width:100%"
              data-remarks-id="${esc(s.id)}"
              value="${esc(s.remarks)}"
              placeholder="Optional"
              ${published ? 'disabled title="Published results are locked"' : ''}
            >
          </td>
        </tr>
      `;
    }).join('');
  }

  function updateScorePreview(input) {
    const id = input.dataset.scoreId;
    const value = input.value;
    const max = Number(state.selectedExam?.max_score || 100);

    const pct = value === ''
      ? ''
      : Math.round((Number(value) / max) * 10000) / 100;

    const grade =
      pct === '' ? '' : gradeFor(pct);

    const p = $(
      `[data-pct-id="${CSS.escape(id)}"]`
    );

    const g = $(
      `[data-grade-id="${CSS.escape(id)}"]`
    );

    if (p) p.textContent =
      pct === '' ? '—' : `${pct}%`;

    if (g) {
      g.innerHTML = grade === ''
        ? '—'
        : `<span class="grade-summary">${grade}</span>`;
    }
  }

  async function saveMarks() {
    const exam = state.selectedExam;

    if (!exam || !state.students.length) {
      toast(
        'Marka hore dooro imtixaan oo soo rar ardayda.',
        'error'
      );
      return;
    }

    const max = Number(exam.max_score);

    const rows = state.students.map(s => {
      const input = $(
        `[data-score-id="${CSS.escape(s.id)}"]`
      );

      const remarksInput = $(
        `[data-remarks-id="${CSS.escape(s.id)}"]`
      );

      return {
        student: s,
        score: input
          ? (input.value.trim() === ''
              ? null
              : Number(input.value))
          : null,
        remarks: remarksInput
          ? (remarksInput.value.trim() || null)
          : s.remarks || null
      };
    });

    const invalid = rows.find(r =>
      !r.student.result?.is_published &&
      r.score !== null &&
      (
        !Number.isFinite(r.score) ||
        r.score < 0 ||
        r.score > max
      )
    );

    if (invalid) {
      toast(
        `Dhibcaha ${invalid.student.full_name} waa inay u dhexeeyaan 0 iyo ${max}.`,
        'error'
      );
      return;
    }

    setBusy(
      $('saveMarksBtn'),
      true,
      '<i class="fa-solid fa-spinner fa-spin"></i> Saving marks…'
    );

    try {
      let saved = 0;
      let skipped = 0;

      for (const row of rows) {
        // Published results are locked.
        if (row.student.result?.is_published) {
          skipped++;
          continue;
        }

        // A blank mark is not a zero and is not saved.
        if (row.score === null) {
          continue;
        }

        const percentage =
          Math.round((row.score / max) * 10000) / 100;

        const payload = {
          institution_id: exam.institution_id,
          student_id: row.student.id,
          exam_id: exam.id,
          subject_id: exam.subject_id,
          score: row.score,
          max_score: max,
          percentage,
          grade: gradeFor(percentage),
          remarks: row.remarks,
          is_published: false,
          created_by: state.user.id
        };

        const existing = row.student.result;

        let response;

        if (existing?.id) {
          response = await db
            .from('results')
            .update({
              score: payload.score,
              max_score: payload.max_score,
              percentage: payload.percentage,
              grade: payload.grade,
              remarks: payload.remarks,
              is_published: false
            })
            .eq('id', existing.id)
            .select(
              'id,student_id,exam_id,subject_id,score,max_score,percentage,grade,remarks,is_published'
            )
            .single();
        } else {
          response = await db
            .from('results')
            .insert(payload)
            .select(
              'id,student_id,exam_id,subject_id,score,max_score,percentage,grade,remarks,is_published'
            )
            .single();
        }

        if (response.error) {
          throw new Error(
            `${row.student.full_name}: ${errText(response.error)}`
          );
        }

        row.student.result = response.data;
        row.student.score = response.data.score;
        row.student.remarks = response.data.remarks || '';

        saved++;
      }

      renderStudents();

      toast(
        `Kaydinta waa dhammaatay. La kaydiyey: ${saved}. La ilaaliyey sababta oo ah hore ayaa loo daabacay: ${skipped}. Natiijooyinka cusub weli waa private.`
      );

    } catch (e) {
      toast(
        `Saving marks failed: ${errText(e)}`,
        'error'
      );
    } finally {
      setBusy($('saveMarksBtn'), false);
    }
  }

  /* =========================================================
     PUBLISH ALL
     Publishes completed, saved results for all exams that
     belong to the selected institution/course/class.
     ========================================================= */

  async function publishAllResults() {
    const anchor = state.selectedExam;

    if (!anchor) {
      toast(
        'Marka hore dooro imtixaan adigoo gujinaya Students. Kadib waxaad daabici kartaa natiijooyinka fasalkaas.',
        'error'
      );
      return;
    }

    const scopedExams = state.exams.filter(e =>
      e.institution_id === anchor.institution_id &&
      e.course_id === anchor.course_id &&
      e.class_id === anchor.class_id &&
      Boolean(e.subject_id)
    );

    if (!scopedExams.length) {
      toast('Fasalkan imtixaanno ku habboon lagama helin.', 'error');
      return;
    }

    const examIds = scopedExams.map(e => e.id);

    const confirmed = confirm(
      `Ma hubtaa inaad daabacayso dhammaan natiijooyinka la kaydiyey ee fasalkan?\n\n` +
      `Institution: ${anchor.institution_name}\n` +
      `Course: ${anchor.course_name}\n` +
      `Class: ${anchor.class_name}\n` +
      `Imtixaannada la hubinayo: ${scopedExams.length}\n\n` +
      `Kaliya natiijooyinka dhibcaha leh ayaa la daabici doonaa. Natiijooyinka madhan waa laga boodayaa.`
    );

    if (!confirmed) return;

    const button = $('publishAllBtn');

    setBusy(
      button,
      true,
      '<i class="fa-solid fa-spinner fa-spin"></i> Publishing…'
    );

    try {
      /*
       * First load saved results belonging to this exact class scope.
       * No marks are invented or created during publishing.
       */
      const {
        data: results,
        error: resultError
      } = await db
        .from('results')
        .select(
          'id,exam_id,student_id,score,max_score,is_published'
        )
        .eq('institution_id', anchor.institution_id)
        .in('exam_id', examIds);

      if (resultError) throw resultError;

      const ready = (results || []).filter(r =>
        r.score !== null &&
        r.score !== undefined &&
        r.max_score !== null &&
        Number(r.max_score) > 0
      );

      const unpublished = ready.filter(
        r => r.is_published !== true
      );

      if (!unpublished.length) {
        toast(
          `Ma jiraan natiijooyin cusub oo la daabacayo. Natiijooyin dhammaystiran: ${ready.length}.`,
          'error'
        );
        return;
      }

      /*
       * Publish the ready rows one by one.
       * If an update fails, stop and report the error.
       */
      let publishedCount = 0;

      for (const result of unpublished) {
        const { error } = await db
          .from('results')
          .update({ is_published: true })
          .eq('id', result.id)
          .eq('institution_id', anchor.institution_id)
          .eq('is_published', false);

        if (error) {
          throw new Error(
            `Natiijo lama daabicin. La daabiyey ka hor qaladka: ${publishedCount}. ${errText(error)}`
          );
        }

        publishedCount++;
      }

      /*
       * Refresh the selected exam so published rows become locked.
       */
      await loadStudentsForExam(anchor.id);

      toast(
        `Waa la daabacay ${publishedCount} natiijo. Natiijooyinkii hore loo daabacay iyo dhibcaha madhan lama beddelin.`
      );

    } catch (e) {
      toast(
        `Publish failed: ${errText(e)}`,
        'error'
      );
    } finally {
      setBusy(button, false);
    }
  }

  function clearStudents() {
    state.selectedExam = null;
    state.students = [];

    $('marksExamLabel').textContent =
      'Select an exam below';

    $('studentCount').textContent = '0 students';

    $('studentsTableBody').innerHTML =
      '<tr><td colspan="7" class="empty">Select “Students” on an exam record to load enrolled students.</td></tr>';

    $('saveMarksBtn').disabled = true;
    $('publishAllBtn').disabled = true;
  }

  async function handleTableClick(event) {
    const button = event.target.closest(
      'button[data-action]'
    );

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === 'students') {
      await loadStudentsForExam(id);
    }

    if (action === 'edit') {
      try {
        await editExam(id);
      } catch (e) {
        toast(errText(e), 'error');
      }
    }

    if (action === 'delete') {
      await deleteExam(id);
    }
  }

  async function init() {
    try {
      await checkSession();
      await loadInstitutions();
      await loadExams();
    } catch (e) {
      console.error('[GAAWOW Exams]', e);

      if (
        !String(errText(e)).includes('Login required') &&
        !String(errText(e)).includes('restricted')
      ) {
        toast(
          `Initialization failed: ${errText(e)}`,
          'error'
        );
      }
    }

    $('institutionSelect').addEventListener(
      'change',
      async () => {
        try {
          await loadCourses(
            $('institutionSelect').value
          );
        } catch (e) {
          toast(errText(e), 'error');
        }
      }
    );

    $('courseSelect').addEventListener(
      'change',
      async () => {
        try {
          await onCourseChange();
        } catch (e) {
          toast(errText(e), 'error');
        }
      }
    );

    $('subjectSelect').addEventListener(
      'change',
      () => {
        const subject = state.subjects.find(
          x => x.id === $('subjectSelect').value
        );

        if (subject && !$('examId').value) {
          $('examTitle').value =
            `${subject.name} - ${$('examType').selectedOptions[0]?.text || 'Exam'}`;

          if (subject.max_score) {
            $('maxScore').value = subject.max_score;
          }
        }
      }
    );

    $('examType').addEventListener(
      'change',
      () => {
        const subject = state.subjects.find(
          x => x.id === $('subjectSelect').value
        );

        if (subject && !$('examId').value) {
          $('examTitle').value =
            `${subject.name} - ${$('examType').selectedOptions[0]?.text || 'Exam'}`;
        }
      }
    );

    $('examForm').addEventListener(
      'submit',
      saveExam
    );

    $('resetFormBtn').addEventListener(
      'click',
      resetForm
    );

    $('newExamBtn').addEventListener(
      'click',
      () => {
        resetForm();

        $('examFormPanel').scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    );

    $('examSearch').addEventListener(
      'input',
      renderExams
    );

    $('typeFilter').addEventListener(
      'change',
      renderExams
    );

    $('examTableBody').addEventListener(
      'click',
      handleTableClick
    );

    $('studentSearch').addEventListener(
      'input',
      renderStudents
    );

    $('studentsTableBody').addEventListener(
      'input',
      event => {
        if (event.target.matches('[data-score-id]')) {
          updateScorePreview(event.target);
        }
      }
    );

    $('saveMarksBtn').addEventListener(
      'click',
      saveMarks
    );

    $('publishAllBtn').addEventListener(
      'click',
      publishAllResults
    );

    $('logoutBtn').addEventListener(
      'click',
      async () => {
        await db.auth.signOut();
        location.href = 'index.html';
      }
    );
  }

  document.addEventListener(
    'DOMContentLoaded',
    init
  );
})();
