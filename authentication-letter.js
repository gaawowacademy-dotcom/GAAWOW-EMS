(function () {
  'use strict';
  if (window.__gaawowAuthLetterLoaded) return;
  window.__gaawowAuthLetterLoaded = true;

  const $ = (id) => document.getElementById(id);
  const MSG = {
    noId: 'Authentication Letter record ID lama helin.',
    notFound: 'Authentication Letter record-ka lama helin.',
    wrongType: 'Record-kan ma aha Authentication Letter.',
    network: 'Waxaa dhacay cilad marka la soo akhrinayay xogta. Fadlan isku day mar kale.'
  };

  // Reuse the project's existing Supabase client. Checks the common globals
  // (no new URL/key is invented here).
  function getClient() {
    const g = window;
    const existing = g.supabaseClient || g.sb || g.db || g.supabaseDb ||
      (g.supabase && typeof g.supabase.from === 'function' ? g.supabase : null);
    if (existing) return existing;
    const url = g.SUPABASE_URL || g.supabaseUrl;
    const key = g.SUPABASE_ANON_KEY || g.supabaseAnonKey || g.SUPABASE_KEY;
    if (url && key && g.supabase && g.supabase.createClient) return g.supabase.createClient(url, key);
    return null;
  }

  function getRecordIdFromURL() {
    const v = new URLSearchParams(window.location.search).get('regen');
    return v ? v.trim() : '';
  }

  function formatDate(v) {
    if (!v) return 'N/A';
    const d = new Date(v);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  const txt = (v) => (v === null || v === undefined || String(v).trim() === '' ? 'N/A' : String(v));
  const normType = (t) => String(t || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

  function handleError(message) {
    $('loadingState').hidden = true;
    $('letter').hidden = true;
    $('errorMessage').textContent = message;
    $('errorState').hidden = false;
  }

  function isAuthRecord(rec) {
    if (normType(rec.certificate_type) === 'authentication_letter') return true;
    // Tolerate type values written differently by the Certificates module
    // (case, spaces, hyphens) and records identified by their own ID format.
    const t = normType(rec.certificate_type);
    if (t.includes('authentication')) return true;
    return !t && /^GAA-AUTH/i.test(rec.certificate_id || '');
  }

  async function fetchRecord(client, id) {
    // Try primary key first, then fall back to other identifiers.
    let res = await client.from('certificates').select('*').eq('id', id).maybeSingle();
    if (res.error && !/invalid input syntax/i.test(res.error.message || '')) throw res.error;
    if (res.data) return res.data;
    for (const col of ['certificate_id', 'certificate_no', 'verify_code']) {
      res = await client.from('certificates').select('*').eq(col, id).limit(1);
      if (!res.error && res.data && res.data.length) return res.data[0];
    }
    return null;
  }

  // Optional enrichment from the EXISTING RPC (read only). Failures are ignored.
  async function loadRpcExtras(client, rec) {
    try {
      const { data, error } = await client.rpc('verify_authentication_letter',
        { p_code: rec.verify_code, p_id: rec.certificate_id });
      if (error || !data) return {};
      return Array.isArray(data) ? (data[0] || {}) : data;
    } catch (e) { return {}; }
  }

  // Best-effort read of existing results. Never throws.
  async function loadAcademicResults(client, rec) {
    const tables = ['academic_results', 'results', 'exam_results', 'student_results'];
    for (const table of tables) {
      try {
        let q = client.from(table).select('*').eq('student_id', rec.student_id);
        const res = await q;
        if (res.error || !res.data || !res.data.length) continue;
        let rows = res.data;
        if (rec.course_id && rows.some((r) => r.course_id)) rows = rows.filter((r) => r.course_id === rec.course_id);
        if (!rows.length) continue;
        // Resolve subject names if only subject_id is present
        if (rows.some((r) => !r.subject_name && !r.subject && r.subject_id)) {
          const ids = [...new Set(rows.map((r) => r.subject_id).filter(Boolean))];
          const s = await client.from('subjects').select('*').in('id', ids);
          const map = {};
          (s.data || []).forEach((x) => { map[x.id] = x.name || x.subject_name || x.title; });
          rows = rows.map((r) => Object.assign({}, r, { subject_name: map[r.subject_id] }));
        }
        return rows;
      } catch (e) { /* try next */ }
    }
    return [];
  }

  function renderStudentInfo(rec, x) {
    $('studentName').textContent = txt(rec.student_name_snapshot || x.student_name);
    $('courseName').textContent = txt(rec.course_name_snapshot || x.course_name);
    $('institution').textContent = txt(x.institution_name || 'GAawow Academy');
    $('dateStarted').textContent = formatDate(x.date_started || rec.date_started || rec.start_date);
    $('dateCompleted').textContent = formatDate(x.date_completed || rec.date_completed || rec.end_date);
    $('issueDate').textContent = formatDate(rec.issue_date || x.issue_date);
    $('expiryDate').textContent = formatDate(rec.expiry_date || x.expiry_date);
    const url = rec.student_photo_url || x.student_photo_url;
    if (url) {
      const img = $('photo');
      img.onerror = () => { $('photoBox').hidden = true; };
      img.src = url;
      $('photoBox').hidden = false;
    }
  }

  function renderAuthenticationInfo(rec, x) {
    $('refNo').textContent = txt(rec.certificate_no || x.reference_no);
    $('authId').textContent = txt(rec.certificate_id || x.authentication_id);
    $('verifyCode').textContent = txt(rec.verify_code || x.verification_code);
  }

  function renderStatus(rec, x) {
    const s = String(rec.status || x.status || 'N/A');
    const el = $('status');
    el.textContent = s.toUpperCase();
    const k = s.toLowerCase();
    el.className = 'badge ' + (['valid', 'graduated'].includes(k) ? 'ok' : k === 'pending' ? 'warn' : ['expired', 'revoked'].includes(k) ? 'bad' : '');
  }

  function verifyUrl(rec, x) {
    const direct = rec.verification_url || x.verification_url;
    if (direct) return direct;
    const code = rec.verify_code || x.verification_code;
    const id = rec.certificate_id || x.authentication_id;
    if (!code) return '';
    const base = window.location.href.split('?')[0].replace(/[^/]*$/, '');
    return base + 'verify-auth.html?code=' + encodeURIComponent(code) + (id ? '&id=' + encodeURIComponent(id) : '');
  }

  function renderQRCode(url) {
    const box = $('qrcode');
    box.innerHTML = '';
    if (!url || typeof QRCode === 'undefined') { box.parentElement.hidden = true; return; }
    new QRCode(box, { text: url, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.M });
  }

  function renderAcademicResults(rows) {
    if (!rows || !rows.length) {
      $('resultsSection').hidden = true;
      $('noResults').hidden = false;
      return;
    }
    const body = $('resultsBody');
    body.innerHTML = '';
    let total = 0, count = 0;
    const pick = (r, keys) => { for (const k of keys) if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k]; return null; };
    rows.forEach((r) => {
      const mark = pick(r, ['marks', 'mark', 'score', 'obtained_marks']);
      const tr = document.createElement('tr');
      [pick(r, ['subject_name', 'subject', 'subject_title']), mark, pick(r, ['grade']), pick(r, ['result', 'status'])]
        .forEach((v) => { const td = document.createElement('td'); td.textContent = txt(v); tr.appendChild(td); });
      body.appendChild(tr);
      if (mark !== null && !isNaN(Number(mark))) { total += Number(mark); count++; }
    });
    const foot = $('resultsFoot');
    foot.innerHTML = '';
    if (count) {
      const avg = total / count;
      const tr = document.createElement('tr');
      const cells = ['Total / Average', total + ' / ' + avg.toFixed(1), '', ''];
      // Use stored overall grade/result if the rows carry one; never invent one.
      const last = rows[0];
      cells[2] = txt(last.final_grade || last.overall_grade || '');
      cells[3] = txt(last.final_result || last.overall_result || '');
      if (cells[2] === 'N/A') cells[2] = '';
      if (cells[3] === 'N/A') cells[3] = '';
      cells.forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
      foot.appendChild(tr);
    }
  }

  async function loadAuthenticationLetter() {
    const id = getRecordIdFromURL();
    if (!id) return handleError(MSG.noId);
    const client = getClient();
    if (!client) return handleError(MSG.network);
    let rec;
    try { rec = await fetchRecord(client, id); } catch (e) { console.error(e); return handleError(MSG.network); }
    if (!rec) return handleError(MSG.notFound);
    if (!isAuthRecord(rec)) return handleError(MSG.wrongType);

    const [extras, results] = await Promise.all([
      loadRpcExtras(client, rec),
      loadAcademicResults(client, rec).catch(() => [])
    ]);
    renderStudentInfo(rec, extras);
    renderAuthenticationInfo(rec, extras);
    renderStatus(rec, extras);
    renderAcademicResults(results);

    $('loadingState').hidden = true;
    $('letter').hidden = false;
    renderQRCode(verifyUrl(rec, extras));
    $('printBtn').disabled = false;
    document.title = 'Authentication Letter - ' + txt(rec.certificate_id);
  }

  function initializePage() {
    $('printBtn').addEventListener('click', () => window.print());
    loadAuthenticationLetter().catch((e) => { console.error(e); handleError(MSG.network); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializePage);
  else initializePage();
})();
