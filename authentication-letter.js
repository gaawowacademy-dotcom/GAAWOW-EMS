(() => {
  'use strict';

  const SUPABASE_URL = 'https://mytyvqwrxnxpxnxpiicj.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145';
  const TEMPLATE = './authentication-letter.png';
  const W = 1055;
  const H = 1491;

  const $ = id => document.getElementById(id);
  const canvas = $('certificateCanvas');
  const ctx = canvas.getContext('2d');
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  let user = null;
  let profile = null;
  let templateImage = null;
  let currentRecord = null;

  const qs = new URLSearchParams(location.search);
  const regenId = qs.get('regen');

  const get = id => ($(id)?.value || '').trim();
  const set = (id, value) => { if ($(id)) $(id).value = value ?? ''; };

  function message(text, type = 'info') {
    const box = $('message');
    if (!box) return;
    box.textContent = text || '';
    box.className = text ? `message ${type}` : 'message';
    box.style.display = text ? 'block' : 'none';
  }

  function status(text) {
    if ($('previewStatus')) $('previewStatus').textContent = text;
  }

  function randomCode(length = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    crypto.getRandomValues(new Uint32Array(length)).forEach(n => out += chars[n % chars.length]);
    return out;
  }

  function dateToday() { return new Date().toISOString().slice(0, 10); }
  function authNo() { return `GAA-AUTH-${new Date().getFullYear()}-${randomCode(6)}`; }
  function authId() { return `GAA-AUTH-${Date.now().toString(36).toUpperCase()}-${randomCode(4)}`; }
  function verifyCode() { return `AUTH-${randomCode(8)}`; }

  function prettyDate(value) {
    if (!value) return '';
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function selectedText(id) {
    const el = $(id);
    return el?.selectedOptions?.[0]?.textContent?.trim() || '';
  }

  function institutionName() { return selectedText('institutionSelect'); }
  function studentName() { return selectedText('studentSelect') || get('studentName'); }
  function courseName() { return selectedText('courseSelect') || get('courseName'); }

  function profileInstitutionId() {
    return profile?.institution_id || profile?.institutionId || profile?.school_id || null;
  }

  function verifyUrl() {
    const code = encodeURIComponent(get('verifyCode'));
    const id = encodeURIComponent(get('certificateId'));
    return `${location.origin}/verify.html?code=${code}&id=${id}`;
  }

  async function getUser() {
    const { data, error } = await db.auth.getUser();
    if (error) throw error;
    if (!data?.user) {
      location.href = 'index.html';
      throw new Error('Please login first.');
    }
    user = data.user;
  }

  async function getProfile() {
    const { data, error } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('EMS profile not found.');
    if (data.is_active === false) throw new Error('Your EMS account is inactive.');
    profile = data;
  }

  async function loadTemplate() {
    templateImage = new Image();
    templateImage.src = TEMPLATE;
    await new Promise((resolve, reject) => {
      templateImage.onload = resolve;
      templateImage.onerror = () => reject(new Error('authentication-letter.png lama helin.'));
    });
    status('Authentication Letter template loaded.');
  }

  async function loadInstitutions() {
    const select = $('institutionSelect');
    if (!select) return;
    const { data, error } = await db.from('institutions').select('*').order('name');
    if (error) throw error;
    select.innerHTML = '<option value="">Select institution</option>';
    (data || []).forEach(row => {
      const opt = document.createElement('option');
      opt.value = row.id || row.institution_id;
      opt.textContent = row.name || row.institution_name || row.title || opt.value;
      select.appendChild(opt);
    });
    const own = profileInstitutionId();
    if (own && [...select.options].some(o => o.value === String(own))) {
      select.value = own;
      if (profile.role !== 'super_admin') select.disabled = true;
    }
  }

  async function loadStudents() {
    const select = $('studentSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Loading students...</option>';
    let query = db.from('students').select('*').order('full_name');
    const institutionId = $('institutionSelect')?.value;
    if (institutionId) query = query.eq('institution_id', institutionId);
    const { data, error } = await query;
    if (error) throw error;
    select.innerHTML = '<option value="">Select student</option>';
    (data || []).forEach(row => {
      const opt = document.createElement('option');
      opt.value = row.id || row.student_id;
      opt.textContent = row.full_name || row.student_name || row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || opt.value;
      opt.dataset.photo = row.photo_url || row.profile_photo || row.student_photo_url || '';
      select.appendChild(opt);
    });
  }

  async function loadCourses() {
    const select = $('courseSelect');
    if (!select) return;
    const { data, error } = await db.from('courses').select('*').order('name');
    if (error) throw error;
    select.innerHTML = '<option value="">Select course</option>';
    (data || []).forEach(row => {
      const opt = document.createElement('option');
      opt.value = row.id || row.course_id;
      opt.textContent = row.name || row.course_name || row.title || opt.value;
      select.appendChild(opt);
    });
  }

  function setStudentDetails() {
    set('studentName', studentName());
    set('courseName', courseName());
    const opt = $('studentSelect')?.selectedOptions?.[0];
    const photo = opt?.dataset?.photo;
    if (photo && $('studentPhotoPreview')) {
      $('studentPhotoPreview').src = photo;
      $('photoBox').style.display = 'block';
    } else if ($('photoBox')) {
      $('photoBox').style.display = 'none';
    }
  }

  function ensureIds() {
    if (!get('certificateNo')) set('certificateNo', authNo());
    if (!get('certificateId')) set('certificateId', authId());
    if (!get('verifyCode')) set('verifyCode', verifyCode());
    if (!get('issueDate')) set('issueDate', dateToday());
    if (!get('status')) set('status', 'valid');
  }

  function fitFont(text, maxWidth, start, min, family = 'Arial') {
    let size = start;
    while (size > min) {
      ctx.font = `700 ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size--;
    }
    return size;
  }

  function centered(text, x, y, maxWidth, options = {}) {
    if (!text) return;
    const family = options.family || 'Arial';
    const size = fitFont(text, maxWidth, options.size || 30, options.min || 14, family);
    ctx.save();
    ctx.font = `${options.weight || 700} ${size}px ${family}`;
    ctx.fillStyle = options.color || '#111827';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawText(text, x, y, options = {}) {
    if (!text) return;
    ctx.save();
    ctx.font = `${options.weight || 400} ${options.size || 20}px ${options.family || 'Arial'}`;
    ctx.fillStyle = options.color || '#111827';
    ctx.textAlign = options.align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  async function makeQr(dataUrlText) {
    if (!window.QRCode?.toDataURL) return null;
    return await new Promise((resolve, reject) => {
      QRCode.toDataURL(dataUrlText, { width: 260, margin: 1, errorCorrectionLevel: 'M' }, (err, url) => err ? reject(err) : resolve(url));
    });
  }

  async function render() {
    ensureIds();
    setStudentDetails();
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(templateImage, 0, 0, W, H);

    // Text is placed in the designed white/content areas. The template itself is never altered.
    centered(studentName() || 'STUDENT NAME', W / 2, 520, 850, { size: 46, min: 22, family: 'Georgia', weight: 700, color: '#0B1E63' });
    centered(courseName() || 'COURSE / PROGRAM', W / 2, 604, 760, { size: 30, min: 18, color: '#111827' });
    centered(institutionName() || 'GAAWOW ACADEMY', W / 2, 666, 820, { size: 23, min: 14, color: '#374151' });

    drawText(get('certificateNo'), 145, 812, { size: 19, weight: 700 });
    drawText(prettyDate(get('issueDate')), 910, 812, { size: 19, weight: 700, align: 'right' });
    drawText(prettyDate(get('dateStarted')), 145, 879, { size: 17, color: '#374151' });
    drawText(prettyDate(get('dateCompleted')), 910, 879, { size: 17, color: '#374151', align: 'right' });

    centered(get('directorName'), 270, 1180, 300, { size: 19, min: 12, family: 'Georgia', weight: 700 });
    centered(get('academicHeadName'), 785, 1180, 300, { size: 19, min: 12, family: 'Georgia', weight: 700 });

    try {
      const qrUrl = await makeQr(verifyUrl());
      if (qrUrl) {
        const qrImage = new Image();
        qrImage.src = qrUrl;
        await new Promise((resolve, reject) => { qrImage.onload = resolve; qrImage.onerror = reject; });
        ctx.drawImage(qrImage, (W - 150) / 2, 1275, 150, 150);
      }
    } catch (e) { console.warn('QR render failed', e); }

    centered(get('verifyCode'), W / 2, 1455, 500, { size: 17, min: 11, weight: 700, color: '#0B1E63' });
    status('Authentication Letter preview ready.');
  }

  function dbPayload() {
    return {
      certificate_no: get('certificateNo'),
      certificate_id: get('certificateId'),
      verify_code: get('verifyCode'),
      student_id: $('studentSelect')?.value || null,
      student_name_snapshot: studentName(),
      course_id: $('courseSelect')?.value || null,
      course_name_snapshot: courseName(),
      institution_id: $('institutionSelect')?.value || profileInstitutionId() || null,
      date_started: get('dateStarted') || null,
      date_completed: get('dateCompleted') || null,
      issue_date: get('issueDate') || null,
      expiry_date: get('expiryDate') || null,
      status: get('status') || 'valid',
      certificate_type: 'authentication_letter',
      director_name: get('directorName'),
      academic_head_name: get('academicHeadName'),
      verification_url: verifyUrl()
    };
  }

  async function save() {
    try {
      ensureIds();
      if (!$('studentSelect')?.value) throw new Error('Student dooro.');
      if (!$('courseSelect')?.value) throw new Error('Course dooro.');
      await render();

      const payload = dbPayload();
      let result;
      if (regenId) {
        result = await db.from('certificates').update(payload).eq('id', regenId).select().single();
      } else {
        result = await db.from('certificates').insert(payload).select().single();
      }
      if (result.error) throw result.error;
      currentRecord = result.data;
      message(regenId ? 'Authentication Letter waa la cusboonaysiiyay.' : 'Authentication Letter waa la keydiyay.', 'success');
    } catch (e) {
      console.error(e);
      message(`Save error: ${e.message || e}`, 'error');
    }
  }

  async function loadExisting() {
    if (!regenId) return;
    const { data, error } = await db.from('certificates').select('*').eq('id', regenId).single();
    if (error) throw error;
    currentRecord = data;

    set('certificateNo', data.certificate_no);
    set('certificateId', data.certificate_id);
    set('verifyCode', data.verify_code);
    set('dateStarted', data.date_started || '');
    set('dateCompleted', data.date_completed || '');
    set('issueDate', data.issue_date || '');
    set('expiryDate', data.expiry_date || '');
    set('status', data.status || 'valid');

    if (data.institution_id) $('institutionSelect').value = data.institution_id;
    await loadStudents();
    if (data.student_id) $('studentSelect').value = data.student_id;
    if (data.course_id) $('courseSelect').value = data.course_id;

    set('studentName', data.student_name_snapshot || '');
    set('courseName', data.course_name_snapshot || '');
    setStudentDetails();
    await render();
    message('Regenerate mode: Authentication Letter waa la furay.', 'info');
  }

  function downloadPng() {
    const name = (studentName() || 'student').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    const a = document.createElement('a');
    a.download = `${name || 'student'}-authentication-letter.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  function downloadPdf() {
    if (!window.jspdf?.jsPDF) throw new Error('PDF library lama helin.');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
    const name = (studentName() || 'student').replace(/[^a-z0-9]+/gi, '-');
    pdf.save(`${name}-authentication-letter.pdf`);
  }

  function printDocument() {
    const win = window.open('', '_blank');
    if (!win) throw new Error('Print window waa la xiray.');
    win.document.write(`<!doctype html><html><head><title>Authentication Letter</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}img{width:210mm;height:297mm;display:block}</style></head><body><img src="${canvas.toDataURL('image/png')}" onload="window.print()"></body></html>`);
    win.document.close();
  }

  function verifyOnline() {
    window.open(verifyUrl(), '_blank', 'noopener,noreferrer');
  }

  function bind() {
    $('studentSelect')?.addEventListener('change', () => { setStudentDetails(); render().catch(e => message(e.message, 'error')); });
    $('courseSelect')?.addEventListener('change', () => { setStudentDetails(); render().catch(e => message(e.message, 'error')); });
    $('institutionSelect')?.addEventListener('change', () => loadStudents().catch(e => message(e.message, 'error')));
    $('generateBtn')?.addEventListener('click', () => render().catch(e => message(`Generate error: ${e.message}`, 'error')));
    $('saveBtn')?.addEventListener('click', save);
    $('pngBtn')?.addEventListener('click', () => { try { downloadPng(); } catch (e) { message(e.message, 'error'); } });
    $('pdfBtn')?.addEventListener('click', () => { try { downloadPdf(); } catch (e) { message(e.message, 'error'); } });
    $('printBtn')?.addEventListener('click', () => { try { printDocument(); } catch (e) { message(e.message, 'error'); } });
    $('verifyBtn')?.addEventListener('click', verifyOnline);
    $('backBtn')?.addEventListener('click', () => location.href = 'certificates.html');
  }

  async function init() {
    try {
      canvas.width = W;
      canvas.height = H;
      await getUser();
      await getProfile();
      await loadTemplate();
      await loadInstitutions();
      await loadStudents();
      await loadCourses();
      bind();
      ensureIds();
      if (regenId) await loadExisting();
      else {
        set('dateStarted', get('dateStarted') || dateToday());
        await render();
      }
    } catch (e) {
      console.error(e);
      message(`System error: ${e.message || e}`, 'error');
      status('Authentication Letter initialization failed.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
