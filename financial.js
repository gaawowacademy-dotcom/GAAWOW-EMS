"use strict";

(() => {
  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  if (!window.supabase) {
    console.error("Supabase library is not loaded.");
    alert("Supabase lama soo shubin. Fadlan refresh samee.");
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const $ = id => document.getElementById(id);

  const S = {
    user: null,
    profile: null,
    inst: [],
    students: [],
    invoices: [],
    invoiceError: null,
    payments: [],
    paymentError: null,
    editingPayment: null,
    tab: "invPanel",

    // SCC state
    sccRequests: [],
    sccSteps: [],
    sccError: null,
    sccLoading: false,
    sccSubmitting: false
  };

  // ==========================================
  // SAFE HELPERS
  // ==========================================

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

  const cash = (n, cur = "USD") => {
    const amount = Number(n || 0);
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: cur
      }).format(amount);
    } catch {
      return amount.toFixed(2) + " " + cur;
    }
  };

  const fmtDate = v => {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString();
  };

  function on(id, event, handler) {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
  }

  function setValue(id, value) {
    const el = $(id);
    if (el) el.value = value;
  }

  function msg(message, kind = "success") {
    const e = $("alertBox");

    if (!e) {
      console.log(message);
      return;
    }

    e.textContent = message;
    e.className = "alert show " + (kind === "err" ? "error" : kind);

    clearTimeout(msg.timer);
    msg.timer = setTimeout(() => e.classList.remove("show"), 8500);
  }

  function fill(id, rows, val, label, first = "Choose...") {
    const e = $(id);
    if (!e) return;

    const old = e.value;
    e.innerHTML = "";

    if (first !== null) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = first;
      e.append(o);
    }

    (rows || []).forEach(r => {
      const o = document.createElement("option");
      o.value = val(r);
      o.textContent = label(r);
      e.append(o);
    });

    if ([...e.options].some(o => o.value === old)) {
      e.value = old;
    }
  }

  function student(id) {
    return S.students.find(x => x.id === id);
  }

  function invoice(id) {
    return S.invoices.find(x => x.id === id);
  }

  function payment(id) {
    return S.payments.find(x => x.id === id);
  }

  function studentLabel(id) {
    const s = student(id);
    return s ? `${s.full_name} (${s.student_id})` : "Unknown student";
  }

  function meta(p) {
    return p?.metadata && typeof p.metadata === "object" ? p.metadata : {};
  }

  // ==========================================
  // ROLE NORMALIZATION AND ACCESS CONTROL
  // ==========================================

  function normalizeRole(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  function role() {
    return normalizeRole(S.profile?.role);
  }

  function isSuperAdmin() {
    return role() === "super_admin";
  }

  function isInstitutionUser() {
    return ["school_admin", "finance_manager"].includes(role());
  }

  function isFinanceManager() {
    return role() === "finance_manager";
  }

  function canViewScc() {
    return isFinanceManager() || isSuperAdmin();
  }

  function institutionAllowed(id) {
    if (!id || !S.profile) return false;
    if (isSuperAdmin()) return true;

    return (
      isInstitutionUser() &&
      !!S.profile.institution_id &&
      String(id).toLowerCase() ===
        String(S.profile.institution_id).toLowerCase()
    );
  }

  function statusBadge(status) {
    const s = String(status || "pending").toLowerCase();
    return `<span class="status ${esc(s)}">${esc(s)}</span>`;
  }

  function balance(i) {
    return Math.max(Number(i.amount || 0) - Number(i.paid_amount || 0), 0);
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  async function auth() {
    const { data, error } = await db.auth.getSession();

    if (error) {
      console.error("SESSION ERROR:", error);
      throw error;
    }

    if (!data?.session?.user?.id) {
      msg("Fadlan marka hore ka gal GAAWOW EMS login-kaaga.", "err");
      setTimeout(() => { location.href = "login.html"; }, 1800);
      return false;
    }

    S.user = data.session.user;

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id,institution_id,full_name,role,is_active")
      .eq("id", S.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("PROFILE QUERY ERROR:", profileError);
      msg("Profile lama akhrin karin: " + profileError.message, "err");
      return false;
    }

    if (!profile) {
      msg("Profile-ka akoonka lama helin. La xiriir Super Admin.", "err");
      return false;
    }

    S.profile = { ...profile, role: normalizeRole(profile.role) };

    if (S.user.id !== S.profile.id) {
      msg("Auth ID iyo Profile ID isma waafaqaan.", "err");
      return false;
    }

    if (S.profile.is_active !== true) {
      msg("Akoonkaagu ma shaqeynayo. La xiriir Super Admin.", "err");
      await db.auth.signOut();
      setTimeout(() => { location.href = "login.html"; }, 1800);
      return false;
    }

    const allowed = ["super_admin", "school_admin", "finance_manager"];

    if (!allowed.includes(role())) {
      msg("Doorka akoonka lama aqoonsan: " + (profile.role || "Role missing"), "err");
      return false;
    }

    if (isInstitutionUser() && !S.profile.institution_id) {
      msg("Akoonkaaga looma qoondeyn machad.", "err");
      return false;
    }

    return true;
  }

  // ==========================================
  // INSTITUTIONS
  // ==========================================

  async function loadInstitutions() {
    let q = db
      .from("institutions")
      .select("id,name,code,is_active")
      .order("name")
      .limit(1000);

    if (isInstitutionUser()) {
      q = q.eq("id", S.profile.institution_id);
    }

    const { data, error } = await q;
    if (error) throw error;

    S.inst = (data || []).filter(x => x.is_active !== false);

    const val = x => x.id;
    const lab = x => `${x.name} (${x.code})`;

    fill("filterInst", S.inst, val, lab, "All Institutions");
    fill("invInst", S.inst, val, lab);
    fill("payInst", S.inst, val, lab, "All Institutions");
    fill("payFormInst", S.inst, val, lab);

    if (isInstitutionUser()) {
      ["filterInst", "invInst", "payInst", "payFormInst"].forEach(id => {
        if ($(id)) {
          $(id).value = S.profile.institution_id;
          $(id).disabled = true;
        }
      });
    }
  }

  // ==========================================
  // STUDENTS
  // ==========================================

  async function loadStudents() {
    let q = db
      .from("students")
      .select("id,institution_id,student_id,full_name,status")
      .order("full_name")
      .limit(3000);

    if (isInstitutionUser()) {
      q = q.eq("institution_id", S.profile.institution_id);
    }

    const { data, error } = await q;
    if (error) throw error;

    S.students = data || [];
    studentOptions();
  }

  function studentOptions() {
    const invInst = $("invInst")?.value || "";
    const payInst = $("payFormInst")?.value || "";

    fill(
      "invStudent",
      S.students.filter(s => !invInst || s.institution_id === invInst),
      s => s.id,
      s => `${s.full_name} (${s.student_id})`,
      "Select student"
    );

    fill(
      "payStudent",
      S.students.filter(s => !payInst || s.institution_id === payInst),
      s => s.id,
      s => `${s.full_name} (${s.student_id})`,
      "Select student"
    );

    invoiceOptions();
  }

  // ==========================================
  // SUCCESSFUL PAYMENT CALCULATIONS
  // ==========================================

  function successfulPayments(studentId, invoiceId = null) {
    return S.payments.filter(p =>
      p.student_id === studentId &&
      String(p.status || "").toLowerCase() === "successful" &&
      (!invoiceId || p.invoice_id === invoiceId)
    );
  }

  function totalByCurrency(rows) {
    const totals = {};

    rows.forEach(p => {
      const currency = String(p.currency || "USD").toUpperCase();
      totals[currency] = (totals[currency] || 0) + Number(p.amount || 0);
    });

    return totals;
  }

  function currencySummary(totals) {
    const entries = Object.entries(totals);

    return entries.length
      ? entries.map(([currency, amount]) => cash(amount, currency)).join(" + ")
      : cash(0, "USD");
  }

  // ==========================================
  // PAYMENT SUMMARY UI
  // ==========================================

  function ensurePaymentSummary() {
    if ($("paymentSummary")) return $("paymentSummary");

    const invoiceSelect = $("payInvoice");
    if (!invoiceSelect) return null;

    const panel = document.createElement("div");
    panel.id = "paymentSummary";
    panel.style.cssText = `
      margin:14px 0;
      padding:17px;
      border:1px solid #D4AF37;
      border-left:5px solid #0B1E63;
      border-radius:12px;
      background:#F5F7FA;
      color:#0B1E63;
      line-height:1.8;
      font-size:14px;
      box-shadow:0 3px 12px rgba(11,30,99,.06);
    `;

    invoiceSelect.insertAdjacentElement("afterend", panel);
    return panel;
  }

  function updatePaymentSummary() {
    const panel = ensurePaymentSummary();
    if (!panel) return;

    const studentId = $("payStudent")?.value || "";
    const invoiceId = $("payInvoice")?.value || "";

    if (!studentId) {
      panel.innerHTML = `
        <b>PAYMENT SUMMARY</b><br>
        Dooro arday si loo muujiyo lacagta uu bixiyey iyo haraaga.
      `;
      return;
    }

    const studentTotals = totalByCurrency(successfulPayments(studentId));

    let invoiceHTML = `
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #D4AF37">
        <b>INVOICE SUMMARY</b><br>
        Dooro invoice si loo muujiyo lacagta laga bixiyey iyo haraaga.
      </div>
    `;

    const selectedInvoice = invoice(invoiceId);

    if (selectedInvoice && selectedInvoice.student_id === studentId) {
      const invoicePayments = successfulPayments(studentId, selectedInvoice.id);

      const invoicePaid = invoicePayments
        .filter(p => String(p.currency || "USD").toUpperCase() === "USD")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const invoiceAmount = Number(selectedInvoice.amount || 0);
      const remaining = Math.max(invoiceAmount - invoicePaid, 0);

      const otherCurrencies = Object.fromEntries(
        Object.entries(totalByCurrency(invoicePayments))
          .filter(([currency]) => currency !== "USD")
      );

      invoiceHTML = `
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid #D4AF37">
          <b>INVOICE SUMMARY</b><br>
          Invoice Number: <b>${esc(selectedInvoice.invoice_number || "—")}</b><br>
          Invoice Amount: <b>${cash(invoiceAmount, "USD")}</b><br>
          Invoice Total Paid:
          <b style="color:#15803D">${cash(invoicePaid, "USD")}</b><br>
          Remaining Balance:
          <b style="color:${remaining > 0 ? "#B45309" : "#15803D"}">${cash(remaining, "USD")}</b>
          ${
            Object.keys(otherCurrencies).length
              ? `<br><small>Other successful currencies: ${esc(currencySummary(otherCurrencies))}</small>`
              : ""
          }
        </div>
      `;
    }

    panel.innerHTML = `
      <div style="font-weight:800;font-size:15px">PAYMENT SUMMARY</div>
      <div style="margin-top:8px">
        Student Total Paid:
        <b style="color:#15803D;font-size:16px">${esc(currencySummary(studentTotals))}</b>
      </div>
      <small>Wadarta lacagaha successful-ka ah ee ardaygan bixiyey.</small>
      ${invoiceHTML}
    `;
  }

  // ==========================================
  // INVOICE OPTIONS FOR PAYMENTS
  // ==========================================

  function invoiceOptions() {
    const st = $("payStudent")?.value || "";
    const inst = $("payFormInst")?.value || "";

    const rows = S.invoices.filter(i =>
      i.institution_id === inst &&
      (!st || i.student_id === st) &&
      balance(i) > 0 &&
      String(i.status).toLowerCase() !== "cancelled"
    );

    fill(
      "payInvoice",
      rows,
      i => i.id,
      i => `${i.invoice_number} • ${cash(i.amount)} • Balance: ${cash(balance(i))}`,
      "No invoice linked"
    );

    updatePaymentSummary();
  }

  // ==========================================
  // LOAD INVOICES
  // ==========================================

  async function loadInvoices() {
    S.invoiceError = null;

    try {
      let q = db
        .from("invoices")
        .select(`
          id,
          institution_id,
          student_id,
          invoice_number,
          description,
          amount,
          paid_amount,
          due_date,
          status,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(1500);

      if (isInstitutionUser()) {
        q = q.eq("institution_id", S.profile.institution_id);
      } else if ($("filterInst")?.value) {
        q = q.eq("institution_id", $("filterInst").value);
      }

      const { data, error } = await q;
      if (error) throw error;

      S.invoices = data || [];
      invoiceOptions();
      return S.invoices;

    } catch (e) {
      S.invoiceError = e.message || "Unable to load invoices";
      console.error("INVOICE LOAD ERROR:", e);
      throw e;
    }
  }

  // ==========================================
  // LOAD PAYMENTS
  // ==========================================

  async function loadPayments() {
    S.paymentError = null;

    try {
      let q = db
        .from("payments")
        .select(`
          id,
          institution_id,
          invoice_id,
          student_id,
          amount,
          currency,
          payment_method,
          transaction_reference,
          provider_transaction_id,
          payer_phone,
          status,
          paid_at,
          created_at,
          payment_reference,
          receipt_number,
          metadata
        `)
        .order("created_at", { ascending: false })
        .limit(2000);

      if (isInstitutionUser()) {
        q = q.eq("institution_id", S.profile.institution_id);
      } else if ($("payInst")?.value) {
        q = q.eq("institution_id", $("payInst").value);
      }

      const { data, error } = await q;
      if (error) throw error;

      S.payments = data || [];
      updatePaymentSummary();
      return S.payments;

    } catch (e) {
      S.paymentError = e.message || "Unable to load payments";
      console.error("PAYMENT LOAD ERROR:", e);
      throw e;
    }
  }

  // ==========================================
  // SCC: LOAD REQUESTS AND APPROVAL STEPS
  // ==========================================

  async function loadSccRequests() {
    S.sccError = null;
    S.sccLoading = true;

    if (!canViewScc()) {
      S.sccRequests = [];
      S.sccSteps = [];
      S.sccLoading = false;
      return;
    }

    try {
      let q = db
        .from("scc_requests")
        .select(`
          id,
          institution_id,
          student_id,
          fee_invoice_id,
          certificate_id,
          request_status,
          requested_by,
          requested_at,
          final_approved_at,
          issued_at,
          rejection_reason,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (isFinanceManager()) {
        q = q.eq("institution_id", S.profile.institution_id);
      } else if ($("filterInst")?.value) {
        q = q.eq("institution_id", $("filterInst").value);
      }

      const { data, error } = await q;
      if (error) throw error;

      S.sccRequests = data || [];

      if (!S.sccRequests.length) {
        S.sccSteps = [];
        return;
      }

      const requestIds = S.sccRequests.map(r => r.id);

      const { data: steps, error: stepsError } = await db
        .from("scc_approval_steps")
        .select(`
          id,
          request_id,
          institution_id,
          student_id,
          approval_stage,
          approval_status,
          assigned_role,
          signed_by,
          signed_at,
          comments,
          rejection_reason,
          created_at
        `)
        .in("request_id", requestIds);

      if (stepsError) throw stepsError;

      S.sccSteps = steps || [];

    } catch (e) {
      S.sccError = e.message || "Unable to load SCC requests";
      console.error("SCC LOAD ERROR:", e);
      throw e;

    } finally {
      S.sccLoading = false;
    }
  }

  function sccStep(requestId, stage) {
    return S.sccSteps.find(x =>
      x.request_id === requestId && x.approval_stage === stage
    );
  }

  function sccStageLabel(requestId, stage) {
    const step = sccStep(requestId, stage);

    if (!step) return statusBadge("missing");

    return `
      ${statusBadge(step.approval_status)}
      ${step.signed_at ? `<br><small>${esc(fmtDate(step.signed_at))}</small>` : ""}
    `;
  }

  // ==========================================
  // SCC: RENDER REQUESTS
  // ==========================================

  function sccMessageRow(text) {
    return `<tr><td colspan="8" class="empty">${text}</td></tr>`;
  }

  function renderScc() {
    const table = $("sccTable");
    if (!table) return;

    if (!canViewScc()) {
      table.innerHTML = sccMessageRow(
        "SCC Finance Clearance waxaa loogu talagalay Finance Manager iyo Super Admin."
      );
      return;
    }

    if (S.sccLoading) {
      table.innerHTML = sccMessageRow("Loading SCC requests...");
      return;
    }

    if (S.sccError) {
      table.innerHTML = sccMessageRow("SCC loading failed: " + esc(S.sccError));
      return;
    }

    if (!S.sccRequests.length) {
      table.innerHTML = sccMessageRow("No SCC requests found.");
      return;
    }

    table.innerHTML = S.sccRequests.map(r => {
      const inv = invoice(r.fee_invoice_id);
      const finance = sccStep(r.id, "finance");

      const financePending =
        finance &&
        finance.approval_status === "pending" &&
        finance.assigned_role === "finance_manager";

      const requestStatus = String(r.request_status || "").toLowerCase();

      const eligible =
        isFinanceManager() &&
        institutionAllowed(r.institution_id) &&
        financePending &&
        ["pending", "in_review"].includes(requestStatus) &&
        !r.final_approved_at &&
        !r.issued_at;

      const invoiceStatus = inv
        ? `
          ${statusBadge(inv.status)}
          <br>
          <small>${cash(inv.paid_amount || 0)} / ${cash(inv.amount || 0)}</small>
        `
        : `<span class="status missing">Invoice unavailable</span>`;

      return `
        <tr>
          <td>
            <b>${esc(studentLabel(r.student_id))}</b>
            <br>
            <small>${esc(r.id)}</small>
          </td>

          <td>${esc(fmtDate(r.requested_at || r.created_at))}</td>

          <td>
            ${inv ? esc(inv.invoice_number || "Invoice") : "Invoice not loaded"}
            <br>
            <b>${inv ? cash(inv.amount || 0) : "—"}</b>
          </td>

          <td>${invoiceStatus}</td>
          <td>${sccStageLabel(r.id, "finance")}</td>
          <td>${sccStageLabel(r.id, "academic")}</td>
          <td>${sccStageLabel(r.id, "director")}</td>

          <td>
            ${
              eligible
                ? `<button class="btn-green btn-small" data-scc-approve="${esc(r.id)}">
                     Approve Finance Clearance
                   </button>`
                : `<span class="form-note">${esc(r.request_status || "Pending")}</span>`
            }
          </td>
        </tr>
      `;
    }).join("");

    document.querySelectorAll("[data-scc-approve]").forEach(btn => {
      btn.onclick = () => approveSccFinance(btn.dataset.sccApprove);
    });
  }

  // ==========================================
  // SCC: FINANCE MANAGER APPROVAL
  // ==========================================

  async function approveSccFinance(requestId) {
    if (S.sccSubmitting) return;

    if (!isFinanceManager()) {
      return msg("Finance Manager keliya ayaa saxiixi kara Finance Clearance.", "err");
    }

    const request = S.sccRequests.find(x => x.id === requestId);

    if (!request) {
      return msg("SCC request lama helin.", "err");
    }

    if (!institutionAllowed(request.institution_id)) {
      return msg("Ma lihid oggolaanshaha SCC request-kan.", "err");
    }

    const finance = sccStep(requestId, "finance");

    if (
      !finance ||
      finance.approval_status !== "pending" ||
      finance.assigned_role !== "finance_manager"
    ) {
      return msg("Finance approval ma jiro ama hore ayaa loo saxiixay.", "err");
    }

    const requestStatus = String(request.request_status || "").toLowerCase();

    if (!["pending", "in_review"].includes(requestStatus)) {
      return msg("SCC request-kan ma aha xaalad la ansixin karo.", "err");
    }

    if (request.final_approved_at || request.issued_at) {
      return msg("SCC request-kan hore ayuu u maray final approval ama issuance.", "err");
    }

    const inv = invoice(request.fee_invoice_id);

    if (!inv) {
      return msg("Graduation invoice lama helin. Refresh samee.", "err");
    }

    if (
      Number(inv.amount) !== 35 ||
      String(inv.status || "").toLowerCase() !== "paid" ||
      Number(inv.paid_amount || 0) < 35
    ) {
      return msg(
        "Invoice-ka hadda ma muujinayo in Graduation Fee-ga USD $35 si buuxda loo bixiyey. Finance approval lama samayn karo.",
        "err"
      );
    }

    const confirmed = confirm(
      "Ma hubisay in ardaygu bixiyey Graduation Fee-ga USD $35?\n\n" +
      "Server-ka ayaa dib u hubin doona invoice-ka iyo successful payments-ka.\n\n" +
      "Haddii lacagtu aanay si buuxda u bixin, approval-ka waa la diidi doonaa."
    );

    if (!confirmed) return;

    const comments = prompt(
      "Finance Clearance comments (optional):",
      "Graduation fee verified."
    );

    if (comments === null) return;

    const btn = document.querySelector(`[data-scc-approve="${requestId}"]`);

    S.sccSubmitting = true;
    if (btn) btn.disabled = true;

    try {
      const { data, error } = await db.rpc("scc_finance_clearance", {
        p_request_id: requestId,
        p_comments: comments.trim() || null
      });

      if (error) throw error;

      if (!data || data.success !== true) {
        throw new Error(data?.message || "Finance Clearance was not completed.");
      }

      msg("Finance Clearance waa la ansixiyey. Codsiga waxaa loo gudbiyey Academic stage.");

      await loadSccRequests();
      renderScc();

    } catch (e) {
      console.error("SCC FINANCE APPROVAL ERROR:", e);
      msg("Finance Clearance lama ansixin: " + e.message, "err");

    } finally {
      S.sccSubmitting = false;
      if (btn) btn.disabled = false;
    }
  }

  // ==========================================
  // SEARCH
  // ==========================================

  function matches(text, query) {
    return !query || String(text || "").toLowerCase().includes(query);
  }

  // ==========================================
  // RENDER INVOICES
  // ==========================================

  function renderInvoices() {
    const table = $("invoiceTable");
    if (!table) return;

    if (S.invoiceError) {
      table.innerHTML = `
        <tr><td colspan="9" class="empty">
          Invoice loading failed: ${esc(S.invoiceError)}
        </td></tr>
      `;
      return;
    }

    const query = $("invoiceSearch")?.value.trim().toLowerCase() || "";

    const rows = S.invoices.filter(i =>
      matches([
        i.invoice_number,
        studentLabel(i.student_id),
        i.description,
        i.status
      ].join(" "), query)
    );

    table.innerHTML = rows.length
      ? rows.map(i => `
        <tr>
          <td><b>${esc(i.invoice_number || "Pending number")}</b></td>
          <td>${esc(studentLabel(i.student_id))}</td>
          <td>${esc(i.description || "—")}</td>
          <td>${cash(i.amount)}</td>
          <td>${cash(i.paid_amount)}</td>
          <td><b>${cash(balance(i))}</b></td>
          <td>${esc(i.due_date || "—")}</td>
          <td>${statusBadge(i.status)}</td>
          <td>
            <button class="btn-blue btn-small" data-invoice-print="${esc(i.id)}">
              View / Print
            </button>
          </td>
        </tr>
      `).join("")
      : `<tr><td colspan="9" class="empty">No invoices found.</td></tr>`;

    bindInvoiceButtons();
  }

  function bindInvoiceButtons() {
    document.querySelectorAll("[data-invoice-print]").forEach(b => {
      b.onclick = () => printInvoice(b.dataset.invoicePrint);
    });
  }

  // ==========================================
  // RENDER PAYMENTS
  // ==========================================

  function renderPayments() {
    const table = $("paymentTable");
    if (!table) return;

    if (S.paymentError) {
      table.innerHTML = `
        <tr><td colspan="8" class="empty">
          Payment loading failed: ${esc(S.paymentError)}
        </td></tr>
      `;
      return;
    }

    const query = $("paymentSearch")?.value.trim().toLowerCase() || "";
    const status = $("paymentStatusFilter")?.value || "";

    const rows = S.payments.filter(p => {
      const m = meta(p);

      const searchText = [
        p.payment_reference,
        p.receipt_number,
        studentLabel(p.student_id),
        p.payment_method,
        p.status,
        p.transaction_reference,
        p.provider_transaction_id,
        m.provider,
        m.sender_account
      ].join(" ");

      return matches(searchText, query) &&
        (!status || String(p.status).toLowerCase() === status);
    });

    table.innerHTML = rows.length
      ? rows.map(p => {
        const official =
          String(p.status).toLowerCase() === "successful" && !!p.receipt_number;

        const pending = String(p.status).toLowerCase() === "pending";

        return `
          <tr>
            <td><b>${esc(p.payment_reference || p.id)}</b></td>
            <td>${esc(studentLabel(p.student_id))}</td>
            <td>${cash(p.amount, p.currency || "USD")}</td>
            <td>${esc(p.payment_method || "—")}</td>
            <td>${esc(p.transaction_reference || "—")}</td>
            <td>${esc(fmtDate(p.paid_at || p.created_at))}</td>
            <td>${statusBadge(p.status)}</td>
            <td>
              ${pending ? `
                <button class="btn-green btn-small" data-review="${esc(p.id)}">
                  Review
                </button>
              ` : ""}

              <button class="btn-blue btn-small" data-print="${esc(p.id)}">
                ${official ? "Official Receipt" : "View Record"}
              </button>
            </td>
          </tr>
        `;
      }).join("")
      : `<tr><td colspan="8" class="empty">No payments found.</td></tr>`;

    bindPaymentButtons();
  }

  function bindPaymentButtons() {
    document.querySelectorAll("[data-print]").forEach(b => {
      b.onclick = () => printReceipt(b.dataset.print);
    });

    document.querySelectorAll("[data-review]").forEach(b => {
      b.onclick = () => openReview(b.dataset.review);
    });
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  function renderStats() {
    const valid = S.invoices.filter(i =>
      String(i.status).toLowerCase() !== "cancelled"
    );

    const received = S.payments.filter(p =>
      String(p.status).toLowerCase() === "successful"
    );

    const pending = S.payments.filter(p =>
      String(p.status).toLowerCase() === "pending"
    );

    const totalBalance = valid.reduce((sum, i) => sum + balance(i), 0);

    const totalUSD = received
      .filter(p => (p.currency || "USD") === "USD")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const totalSOS = received
      .filter(p => p.currency === "SOS")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    if ($("statInvoices")) $("statInvoices").textContent = S.invoices.length;

    if ($("statReceived")) {
      $("statReceived").textContent =
        cash(totalUSD, "USD") +
        (totalSOS > 0 ? " | " + cash(totalSOS, "SOS") : "");
    }

    if ($("statPending")) $("statPending").textContent = pending.length;

    if ($("statBalance")) $("statBalance").textContent = cash(totalBalance, "USD");
  }

  function render() {
    renderInvoices();
    renderPayments();
    renderStats();
    renderScc();
    invoiceOptions();
    updatePaymentSummary();
  }

  async function reload() {
    await loadInvoices();
    await loadPayments();

    if (canViewScc()) {
      await loadSccRequests();
    }

    render();
  }

  // ==========================================
  // FORM DISPLAY
  // ==========================================

  function hideForms() {
    ["invoiceFormWrap", "paymentFormWrap"].forEach(id => {
      if ($(id)) $(id).classList.add("hidden");
    });

    if ($("reviewModal")) $("reviewModal").classList.remove("show");
  }

  function openInvoiceForm() {
    if (!$("invoiceFormWrap")) return;

    hideForms();
    $("invoiceFormWrap").classList.remove("hidden");
    studentOptions();
    $("invoiceFormWrap").scrollIntoView({ behavior: "smooth" });
  }

  function openPaymentForm() {
    if (!$("paymentFormWrap")) return;

    hideForms();
    $("paymentFormWrap").classList.remove("hidden");

    setValue("payDate", new Date().toISOString().slice(0, 10));

    studentOptions();
    updatePaymentSummary();
    $("paymentFormWrap").scrollIntoView({ behavior: "smooth" });
  }

  // ==========================================
  // CREATE INVOICE
  // ==========================================

  async function saveInvoice(event) {
    event.preventDefault();

    const institution_id = $("invInst")?.value || "";
    const student_id = $("invStudent")?.value || "";
    const description = $("invDescription")?.value.trim() || "";
    const amount = Number($("invAmount")?.value);
    const due_date = $("invDueDate")?.value || null;

    const st = student(student_id);

    if (
      !institutionAllowed(institution_id) ||
      !st ||
      st.institution_id !== institution_id ||
      !description ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return msg("Hubi machadka, ardayga, sharaxaadda iyo lacagta.", "err");
    }

    const btn = $("saveInvoiceBtn");
    if (btn) btn.disabled = true;

    try {
      const { data, error } = await db
        .from("invoices")
        .insert({
          institution_id,
          student_id,
          description,
          amount,
          paid_amount: 0,
          due_date,
          status: "unpaid"
        })
        .select("id,invoice_number")
        .single();

      if (error) throw error;

      if ($("invoiceForm")) $("invoiceForm").reset();

      // reset() clears disabled institution selects' values for institution users
      if (isInstitutionUser()) {
        ["invInst", "payFormInst"].forEach(id => {
          if ($(id)) $(id).value = S.profile.institution_id;
        });
      }

      hideForms();

      try {
        await loadInvoices();
        render();
      } catch (refreshError) {
        console.error("Invoice saved but refresh failed:", refreshError);
        renderInvoices();
      }

      msg("Invoice waa la sameeyay. Number: " + (data?.invoice_number || "Database assigned"));

    } catch (e) {
      console.error("SAVE INVOICE ERROR:", e);
      msg("Invoice lama kaydin: " + e.message, "err");

    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ==========================================
  // CREATE PENDING PAYMENT
  // ==========================================

  async function savePayment(event) {
    event.preventDefault();

    const institution_id = $("payFormInst")?.value || "";
    const student_id = $("payStudent")?.value || "";
    const invoice_id = $("payInvoice")?.value || null;
    const amount = Number($("payAmount")?.value);
    const currency = $("payCurrency")?.value || "USD";
    const payment_method = $("payMethod")?.value || "";
    const transaction_reference = $("payReference")?.value.trim() || null;
    const payer_phone = $("payerPhone")?.value.trim() || null;
    const provider = $("payProvider")?.value.trim() || null;
    const sender_account = $("senderAccount")?.value.trim() || null;
    const receiver_account = $("receiverAccount")?.value.trim() || null;
    const payment_date = $("payDate")?.value || null;
    const notes = $("payNotes")?.value.trim() || null;

    const st = student(student_id);
    const iv = invoice(invoice_id);

    if (
      !institutionAllowed(institution_id) ||
      !st ||
      st.institution_id !== institution_id ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !payment_method
    ) {
      return msg("Fadlan hubi machadka, ardayga, lacagta iyo payment method.", "err");
    }

    if (
      invoice_id &&
      (
        !iv ||
        iv.student_id !== student_id ||
        iv.institution_id !== institution_id ||
        String(iv.status).toLowerCase() === "cancelled"
      )
    ) {
      return msg(
        "Invoice-ka waa inuu la mid yahay ardayga iyo machadka, mana noqon karo cancelled.",
        "err"
      );
    }

    if (invoice_id && currency !== "USD") {
      return msg(
        "Invoice-ka hadda USD ayuu ku salaysan yahay. SOS payment ku diiwaangeli adigoon invoice ku xirin.",
        "err"
      );
    }

    if (invoice_id && amount > balance(iv) + 0.001) {
      if (!confirm("Lacagtu waxay ka badan tahay balance-ka invoice-ka. Ma sii wadaysaa?")) {
        return;
      }
    }

    if (transaction_reference) {
      const duplicate = S.payments.some(p => {
        const existing = String(
          p.transaction_reference || p.provider_transaction_id || ""
        ).trim().toLowerCase();

        return (
          existing === transaction_reference.toLowerCase() &&
          String(p.status).toLowerCase() !== "failed"
        );
      });

      if (duplicate) {
        return msg("Transaction reference-kan horay ayuu u diiwaangashan yahay.", "err");
      }
    }

    const metadata = {
      source: "GAAWOW EMS Financial Management",
      provider,
      sender_account,
      receiver_account,
      payment_date,
      notes,
      manually_verified: false,
      recorded_by: S.user.id,
      recorded_by_name: S.profile.full_name || "Financial Administrator",
      recorded_at: new Date().toISOString()
    };

    const payload = {
      institution_id,
      student_id,
      invoice_id,
      amount,
      currency,
      payment_method,
      status: "pending",
      payer_phone,
      transaction_reference,
      paid_at: null,
      metadata
    };

    const btn = $("savePaymentBtn");
    if (btn) btn.disabled = true;

    try {
      const { data, error } = await db
        .from("payments")
        .insert(payload)
        .select("id,payment_reference,status")
        .single();

      if (error) throw error;

      if ($("paymentForm")) $("paymentForm").reset();

      if (isInstitutionUser()) {
        ["invInst", "payFormInst"].forEach(id => {
          if ($(id)) $(id).value = S.profile.institution_id;
        });
      }

      setValue("payDate", new Date().toISOString().slice(0, 10));

      hideForms();

      try {
        await loadPayments();
        await loadInvoices();
        render();
      } catch (refreshError) {
        console.error("Payment saved but refresh failed:", refreshError);
      }

      setTab("payPanel");

      msg(
        "Payment waxaa loo kaydiyay PENDING. Reference: " +
        (data?.payment_reference || data?.id) +
        ". Ansixin ayaa loo baahan yahay."
      );

    } catch (e) {
      console.error("SAVE PAYMENT ERROR:", e);
      msg("Payment lama kaydin: " + e.message, "err");

    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ==========================================
  // REVIEW PAYMENT
  // ==========================================

  function closeReview() {
    if ($("reviewModal")) $("reviewModal").classList.remove("show");
    S.editingPayment = null;
  }

  function openReview(id) {
    const p = payment(id);

    if (!p) {
      return msg("Payment lama helin.", "err");
    }

    if (!institutionAllowed(p.institution_id)) {
      return msg("Ma lihid oggolaanshaha payment-kan.", "err");
    }

    if (String(p.status).toLowerCase() !== "pending") {
      return msg("Kaliya payment pending ah ayaa la review-gareyn karaa.", "err");
    }

    const m = meta(p);

    S.editingPayment = id;

    if ($("reviewPaymentInfo")) {
      $("reviewPaymentInfo").innerHTML = `
        <b>Payment Reference:</b> ${esc(p.payment_reference || p.id)}<br>
        <b>Student:</b> ${esc(studentLabel(p.student_id))}<br>
        <b>Amount:</b> ${cash(p.amount, p.currency || "USD")}<br>
        <b>Method:</b> ${esc(p.payment_method || "—")}<br>
        <b>Provider:</b> ${esc(m.provider || "—")}<br>
        <b>Sender:</b> ${esc(m.sender_account || p.payer_phone || "—")}<br>
        <b>Receiver:</b> ${esc(m.receiver_account || "—")}<br>
        <b>Transaction:</b> ${esc(p.transaction_reference || "—")}<br>
        <b>Date:</b> ${esc(fmtDate(p.created_at))}
      `;
    }

    setValue("reviewStatus", "");
    setValue("reviewNote", "");

    if ($("reviewModal")) $("reviewModal").classList.add("show");
  }

  async function saveReview(event) {
    event.preventDefault();

    const p = payment(S.editingPayment);

    if (!p || !institutionAllowed(p.institution_id)) {
      return msg("Payment-kan lama helin ama ma lihid oggolaanshihiisa.", "err");
    }

    if (String(p.status).toLowerCase() !== "pending") {
      return msg("Payment-kan hadda pending ma aha. Refresh samee.", "err");
    }

    const status = $("reviewStatus")?.value || "";
    const review_note = $("reviewNote")?.value.trim() || "";

    if (!["successful", "failed", "cancelled"].includes(status)) {
      return msg("Dooro go'aan sax ah.", "err");
    }

    if (
      status === "successful" &&
      !confirm("Ma xaqiijisay in lacagta dhabta ah lagu helay account-ka GAAWOW Academy?")
    ) {
      return;
    }

    if (
      status !== "successful" &&
      !review_note &&
      !confirm("Review note lama gelin. Ma sii wadaysaa?")
    ) {
      return;
    }

    const btn = $("saveReviewBtn");
    if (btn) btn.disabled = true;

    try {
      const { data, error } = await db.functions.invoke("review-payment", {
        body: {
          payment_id: p.id,
          status,
          review_note
        }
      });

      if (error) throw error;

      if (!data || data.success !== true) {
        throw new Error(data?.message || "Payment review was not completed.");
      }

      if (status === "successful") {
        if (data.official_receipt_issued) {
          msg(
            "Payment waa la ansixiyay. Official Receipt: " +
            (data.payment?.receipt_number || "Issued")
          );
        } else {
          msg(
            "Payment waa la ansixiyay laakiin receipt number lama soo celin. Fadlan xaqiiji database-ka.",
            "err"
          );
        }
      } else {
        msg("Payment review waa la dhammeeyay: " + status);
      }

      closeReview();
      await reload();

    } catch (e) {
      console.error("PAYMENT REVIEW ERROR:", e);
      msg("Payment review failed: " + e.message, "err");

    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ==========================================
  // PRINT INVOICE (uses receipts.js)
  // ==========================================

  function receiptsReady() {
    if (window.GaawowReceipt) return true;

    msg(
      "receipts.js lama soo shubin. Ku dar <script src=\"receipts.js\"></script> financial.html.",
      "err"
    );

    return false;
  }

  function printInvoice(id) {
    const i = invoice(id);

    if (!i) {
      return msg("Invoice lama helin.", "err");
    }

    if (!receiptsReady()) return;

    const s = student(i.student_id);
    const inst = S.inst.find(x => x.id === i.institution_id);

    window.GaawowReceipt.invoice({
      invoice_number: i.invoice_number || "INVOICE",
      student_name: s?.full_name || "—",
      student_id_number: s?.student_id || "",
      institution_name: inst?.name || "—",
      issue_date: i.created_at,
      due_date: i.due_date,
      currency: "USD",
      description: i.description || "Education fees",
      amount: Number(i.amount || 0),
      paid_amount: Number(i.paid_amount || 0),
      balance: balance(i),
      status: i.status
    });
  }

  // ==========================================
  // PRINT PAYMENT / OFFICIAL RECEIPT (uses receipts.js)
  // ==========================================

  function printReceipt(id) {
    const p = payment(id);

    if (!p) {
      return msg("Payment lama helin.", "err");
    }

    const successful = String(p.status).toLowerCase() === "successful";

    if (successful && !p.receipt_number) {
      return msg(
        "Payment waa successful laakiin receipt number ma laha. Marka hore database-ka xaqiiji.",
        "err"
      );
    }

    if (!receiptsReady()) return;

    const official = successful && !!p.receipt_number;

    const m = meta(p);
    const s = student(p.student_id);
    const i = invoice(p.invoice_id);
    const inst = S.inst.find(x => x.id === p.institution_id);

    window.GaawowReceipt.payment({
      receipt_number: official ? p.receipt_number : "NOT ISSUED",
      payment_reference: p.payment_reference || p.id,
      student_name: s?.full_name || "—",
      institution_name: inst?.name || "—",
      payer_phone: m.sender_account || p.payer_phone || "",
      payment_method: p.payment_method || "—",
      transaction_reference: p.transaction_reference || "",
      payment_date: p.paid_at || p.created_at,
      invoice_number: i?.invoice_number || "No invoice linked",
      reviewed_by: m.reviewed_by_name || "",
      currency: p.currency || "USD",
      amount: Number(p.amount || 0),
      description: m.notes || (i?.description) || "Payment received",
      status: p.status
    });
  }

  // ==========================================
  // TABS
  // ==========================================

  function setTab(id) {
    const allowedTabs = ["invPanel", "payPanel", "sccPanel"];

    if (!allowedTabs.includes(id)) id = "invPanel";
    if (id === "sccPanel" && !canViewScc()) id = "invPanel";

    S.tab = id;

    allowedTabs.forEach(x => {
      if ($(x)) $(x).classList.toggle("active", x === id);
    });

    document.querySelectorAll("[data-tab]").forEach(b => {
      b.classList.toggle("active", b.dataset.tab === id);
    });

    if (id === "sccPanel") renderScc();
  }

  // ==========================================
  // EVENTS
  // ==========================================

  function events() {
    on("backDashboard", "click", () => {
      if (isFinanceManager()) return;

      location.href = isSuperAdmin() ? "dashboard.html" : "school-dashboard.html";
    });

    on("logout", "click", async () => {
      if (!confirm("Ma hubtaa inaad ka baxayso GAAWOW EMS?")) return;

      const { error } = await db.auth.signOut();

      if (error) {
        msg(error.message, "err");
        return;
      }

      location.href = "login.html";
    });

    on("newInvoiceBtn", "click", openInvoiceForm);
    on("newPaymentBtn", "click", openPaymentForm);

    on("closeInvoiceForm", "click", hideForms);
    on("cancelInvoiceBtn", "click", hideForms);
    on("closePaymentForm", "click", hideForms);
    on("cancelPaymentBtn", "click", hideForms);

    on("invoiceForm", "submit", saveInvoice);
    on("paymentForm", "submit", savePayment);
    on("reviewForm", "submit", saveReview);

    on("closeReviewModal", "click", closeReview);
    on("cancelReviewBtn", "click", closeReview);

    on("reviewModal", "click", e => {
      if (e.target === $("reviewModal")) closeReview();
    });

    document.querySelectorAll("[data-tab]").forEach(b => {
      b.onclick = () => setTab(b.dataset.tab);
    });

    on("invoiceSearch", "input", renderInvoices);
    on("paymentSearch", "input", renderPayments);
    on("paymentStatusFilter", "change", renderPayments);

    on("filterInst", "change", async () => {
      const btn = $("refreshInvoices");
      if (btn) btn.disabled = true;

      try {
        await loadInvoices();
        renderInvoices();
        renderStats();
        invoiceOptions();

        if (canViewScc()) {
          await loadSccRequests();
          renderScc();
        }

      } catch (e) {
        renderInvoices();
        msg("Invoice error: " + e.message, "err");

      } finally {
        if (btn) btn.disabled = false;
      }
    });

    on("payInst", "change", async () => {
      try {
        await loadPayments();
        renderPayments();
        renderStats();
        updatePaymentSummary();

      } catch (e) {
        renderPayments();
        msg("Payment error: " + e.message, "err");
      }
    });

    ["invInst", "payFormInst"].forEach(id => on(id, "change", studentOptions));

    on("payStudent", "change", () => {
      invoiceOptions();
      updatePaymentSummary();
    });

    on("payInvoice", "change", updatePaymentSummary);

    on("refreshInvoices", "click", async () => {
      const btn = $("refreshInvoices");
      if (btn) btn.disabled = true;

      try {
        await loadInvoices();
        renderInvoices();
        renderStats();
        invoiceOptions();
        msg("Invoices waa la cusbooneysiiyay.");

      } catch (e) {
        renderInvoices();
        msg("Invoice refresh failed: " + e.message, "err");

      } finally {
        if (btn) btn.disabled = false;
      }
    });

    on("refreshPayments", "click", async () => {
      const btn = $("refreshPayments");
      if (btn) btn.disabled = true;

      try {
        await loadPayments();
        renderPayments();
        renderStats();
        updatePaymentSummary();
        msg("Payments waa la cusbooneysiiyay.");

      } catch (e) {
        renderPayments();
        msg("Payment refresh failed: " + e.message, "err");

      } finally {
        if (btn) btn.disabled = false;
      }
    });

    on("refreshScc", "click", async () => {
      const btn = $("refreshScc");

      if (!canViewScc()) {
        return msg("SCC access looma oggola role-kan.", "err");
      }

      if (btn) btn.disabled = true;

      try {
        await loadSccRequests();
        renderScc();
        msg("SCC requests waa la cusbooneysiiyay.");

      } catch (e) {
        renderScc();
        msg("SCC refresh failed: " + e.message, "err");

      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  // ==========================================
  // INITIALIZE
  // ==========================================

  async function init() {
    try {
      const authenticated = await auth();
      if (!authenticated) return;

      events();

      if (isFinanceManager() && $("backDashboard")) {
        $("backDashboard").classList.add("hidden");
      }

      if (!canViewScc() && $("sccTab")) {
        $("sccTab").classList.add("hidden");
      }

      try {
        await loadInstitutions();
      } catch (e) {
        console.error("INSTITUTIONS ERROR:", e);
        msg("Institutions error: " + e.message, "err");
      }

      try {
        await loadStudents();
      } catch (e) {
        console.error("STUDENTS ERROR:", e);
        S.students = [];
        msg("Students error: " + e.message, "err");
      }

      try {
        await loadInvoices();
      } catch (e) {
        console.error("INVOICES ERROR:", e);
      }

      try {
        await loadPayments();
      } catch (e) {
        console.error("PAYMENTS ERROR:", e);
        S.payments = [];
        S.paymentError = e.message || "Unable to load payments";
      }

      if (canViewScc()) {
        try {
          await loadSccRequests();
        } catch (e) {
          console.error("SCC INITIAL LOAD ERROR:", e);
          S.sccRequests = [];
          S.sccSteps = [];
          S.sccError = e.message || "Unable to load SCC requests";
        }
      }

      render();

      const requested = sessionStorage.getItem("gaawowFinanceTab");
      const hash = location.hash.toLowerCase();

      let initialTab = "invPanel";

      if (hash.includes("scc") || requested === "sccPanel") {
        initialTab = "sccPanel";
      } else if (hash.includes("payment") || requested === "payPanel") {
        initialTab = "payPanel";
      }

      setTab(initialTab);
      sessionStorage.removeItem("gaawowFinanceTab");

      if (S.invoiceError) {
        msg("Invoice loading failed: " + S.invoiceError, "err");
      } else {
        msg("GAAWOW EMS Financial Management is connected.");
      }

    } catch (e) {
      console.error("Financial Management initialization:", e);
      msg("Portal setup error: " + e.message, "err");
    }
  }

  init();
})();
