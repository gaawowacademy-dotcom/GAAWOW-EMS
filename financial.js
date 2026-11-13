
"use strict";

(() => {
  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = id => document.getElementById(id);

  const S = {
    user: null,
    profile: null,
    inst: [],
    students: [],
    invoices: [],
    payments: [],
    editingPayment: null,
    tab: "invPanel"
  };

  const LOGO_URL = "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  const cash = (n, cur = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur
    }).format(Number(n || 0));

  const fmtDate = v => v ? new Date(v).toLocaleString() : "—";

  function msg(t, kind = "ok") {
    const e = $("msg");
    e.textContent = t;
    e.className = "message show " + kind;
    setTimeout(() => e.classList.remove("show"), 8500);
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

    rows.forEach(r => {
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
    return s ? `${s.full_name} (${s.student_id})` : "Student";
  }

  function meta(p) {
    return p && p.metadata && typeof p.metadata === "object"
      ? p.metadata
      : {};
  }

  function isSuperAdmin() {
    return S.profile?.role === "super_admin";
  }

  function isFinanceManager() {
    return S.profile?.role === "finance_manager";
  }

  function isInstitutionUser() {
    return ["school_admin", "finance_manager"].includes(S.profile?.role);
  }

  // --------------------------------------------------
  // AUTHENTICATION
  // --------------------------------------------------

  async function auth() {
    const { data: { session }, error } = await db.auth.getSession();

    if (error) throw error;

    if (!session) {
      msg("Fadlan marka hore ka gal GAAWOW EMS login-kaaga caadiga ah.", "err");
      return false;
    }

    S.user = session.user;

    const r = await db
      .from("profiles")
      .select("id,institution_id,full_name,role,is_active")
      .eq("id", session.user.id)
      .maybeSingle();

    if (r.error) throw r.error;

    S.profile = r.data;

    const allowed = [
      "super_admin",
      "school_admin",
      "finance_manager"
    ];

    if (
      !S.profile ||
      !S.profile.is_active ||
      !allowed.includes(S.profile.role)
    ) {
      msg("Access denied: account-kan ma laha oggolaanshaha Financial Management.", "err");
      return false;
    }

    if (isInstitutionUser() && !S.profile.institution_id) {
      msg("Account-kan weli looma qoondeyn machad.", "err");
      return false;
    }

    return true;
  }

  // --------------------------------------------------
  // INSTITUTIONS
  // --------------------------------------------------

  async function loadInstitutions() {
    const r = await db
      .from("institutions")
      .select("id,name,code,is_active")
      .order("name")
      .limit(1000);

    if (r.error) throw r.error;

    S.inst = (r.data || []).filter(x => x.is_active !== false);

    if (isInstitutionUser()) {
      S.inst = S.inst.filter(x => x.id === S.profile.institution_id);
    }

    fill(
      "filterInst",
      S.inst,
      x => x.id,
      x => `${x.name} (${x.code})`,
      null
    );

    fill(
      "invInst",
      S.inst,
      x => x.id,
      x => `${x.name} (${x.code})`
    );

    fill(
      "payInst",
      S.inst,
      x => x.id,
      x => `${x.name} (${x.code})`
    );

    if (S.profile.institution_id) {
      ["filterInst", "invInst", "payInst"].forEach(id => {
        if ($(id)) $(id).value = S.profile.institution_id;
      });
    }

    // Institution-bound accounts cannot switch institutions.
    if (isInstitutionUser()) {
      ["filterInst", "invInst", "payInst"].forEach(id => {
        if ($(id)) $(id).disabled = true;
      });
    }
  }

  // --------------------------------------------------
  // STUDENTS
  // --------------------------------------------------

  async function loadStudents() {
    let q = db
      .from("students")
      .select("id,institution_id,student_id,full_name,status")
      .order("full_name")
      .limit(3000);

    if (isInstitutionUser()) {
      q = q.eq("institution_id", S.profile.institution_id);
    }

    const r = await q;

    if (r.error) throw r.error;

    S.students = r.data || [];
    studentOptions();
  }

  function studentOptions() {
    if (!$("invInst")) return;

    const fi = $("filterInst").value;
    const ii = $("invInst").value || fi;
    const pi = $("payInst").value || fi;

    fill(
      "invStudent",
      S.students.filter(s => !ii || s.institution_id === ii),
      s => s.id,
      s => `${s.full_name} (${s.student_id})`
    );

    fill(
      "payStudent",
      S.students.filter(s => !pi || s.institution_id === pi),
      s => s.id,
      s => `${s.full_name} (${s.student_id})`
    );

    invoiceOptions();
  }

  function invoiceOptions() {
    if (!$("payInvoice")) return;

    const st = $("payStudent").value;
    const inst = $("payInst").value;

    fill(
      "payInvoice",
      S.invoices.filter(i =>
        i.institution_id === inst &&
        (!st || i.student_id === st) &&
        String(i.status).toLowerCase() !== "cancelled"
      ),
      i => i.id,
      i => `${i.invoice_number} • ${cash(i.amount)} • balance ${cash(
        Math.max(Number(i.amount) - Number(i.paid_amount || 0), 0)
      )}`,
      "No invoice linked"
    );
  }

  // --------------------------------------------------
  // LOAD FINANCIAL RECORDS
  // --------------------------------------------------

  async function loadInvoices() {
    let q = db
      .from("invoices")
      .select(
        "id,institution_id,student_id,invoice_number,description,amount,paid_amount,due_date,status,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(1500);

    if (isInstitutionUser()) {
      q = q.eq("institution_id", S.profile.institution_id);
    } else if ($("filterInst").value) {
      q = q.eq("institution_id", $("filterInst").value);
    }

    const r = await q;

    if (r.error) throw r.error;

    S.invoices = r.data || [];
  }

  async function loadPayments() {
    let q = db
      .from("payments")
      .select(
        "id,institution_id,invoice_id,student_id,amount,currency,payment_method,transaction_reference,provider_transaction_id,payer_phone,status,paid_at,created_at,payment_reference,receipt_number,metadata"
      )
      .order("created_at", { ascending: false })
      .limit(2000);

    if (isInstitutionUser()) {
      q = q.eq("institution_id", S.profile.institution_id);
    } else if ($("filterInst").value) {
      q = q.eq("institution_id", $("filterInst").value);
    }

    const r = await q;

    if (r.error) throw r.error;

    S.payments = r.data || [];
  }

  function matches(v) {
    const t = $("search").value.toLowerCase().trim();
    return !t || String(v || "").toLowerCase().includes(t);
  }

  function statusBadge(s) {
    return `<span class="badge ${esc(String(s || "pending").toLowerCase())}">${esc(s || "pending")}</span>`;
  }

  // --------------------------------------------------
  // RENDER TABLES AND STATISTICS
  // --------------------------------------------------

  function render() {
    const invs = S.invoices.filter(i =>
      matches([
        i.invoice_number,
        studentLabel(i.student_id),
        i.description,
        i.status
      ].join(" "))
    );

    $("invRows").innerHTML = invs.length
      ? invs.map(i => `
        <tr>
          <td><b>${esc(i.invoice_number)}</b></td>
          <td>${esc(studentLabel(i.student_id))}</td>
          <td>${esc(i.description || "—")}</td>
          <td>${cash(i.amount)}</td>
          <td>${cash(i.paid_amount)}</td>
          <td><b>${cash(Math.max(Number(i.amount) - Number(i.paid_amount || 0), 0))}</b></td>
          <td>${statusBadge(i.status)}</td>
          <td>${esc(i.due_date || "—")}</td>
          <td><button class="secondary" data-invoice-print="${esc(i.id)}">View / Print</button></td>
        </tr>
      `).join("")
      : '<tr><td colspan="9" class="empty">No invoices found.</td></tr>';

    let pays = S.payments.filter(p =>
      matches([
        p.payment_reference,
        p.receipt_number,
        studentLabel(p.student_id),
        p.payment_method,
        p.status,
        p.transaction_reference,
        p.provider_transaction_id,
        meta(p).provider,
        meta(p).sender_account
      ].join(" "))
    );

    const sf = $("paymentStatusFilter")?.value || "all";
    const mf = $("paymentMethodFilter")?.value || "all";

    pays = pays.filter(p =>
      (sf === "all" || String(p.status).toLowerCase() === sf) &&
      (mf === "all" || p.payment_method === mf)
    );

    $("payRows").innerHTML = pays.length
      ? pays.map(p => {
          const m = meta(p);
          const successful =
            String(p.status).toLowerCase() === "successful" &&
            !!p.receipt_number;

          const pending = String(p.status).toLowerCase() === "pending";

          return `
            <tr>
              <td><b>${esc(p.payment_reference || "Payment")}</b></td>
              <td>${esc(p.receipt_number || "Not issued")}</td>
              <td>${esc(studentLabel(p.student_id))}</td>
              <td>${cash(p.amount, p.currency || "USD")}</td>
              <td>${esc(p.payment_method || "—")}<br><small>${esc(m.provider || "")}</small></td>
              <td>${statusBadge(p.status)}</td>
              <td>${esc(fmtDate(p.paid_at || p.created_at))}</td>
              <td class="actions">
                ${pending
                  ? `<button class="primary" data-review="${esc(p.id)}">Review</button>`
                  : ""}
                <button class="secondary" data-print="${esc(p.id)}">
                  ${successful ? "Official receipt" : "View record"}
                </button>
              </td>
            </tr>
          `;
        }).join("")
      : '<tr><td colspan="8" class="empty">No payments match the selected filters.</td></tr>';

    const valid = S.invoices.filter(
      i => String(i.status).toLowerCase() !== "cancelled"
    );

    const sum = status =>
      S.payments
        .filter(p => String(p.status).toLowerCase() === status)
        .reduce((a, p) => a + Number(p.amount || 0), 0);

    $("count").textContent = S.invoices.length;

    $("billed").textContent = cash(
      valid.reduce((a, i) => a + Number(i.amount || 0), 0)
    );

    $("collected").textContent = cash(sum("successful"));

    $("outstanding").textContent = cash(
      valid.reduce(
        (a, i) => a + Math.max(
          Number(i.amount || 0) - Number(i.paid_amount || 0), 0
        ),
        0
      )
    );

    $("pendingTotal").textContent = cash(sum("pending"));
    $("failedTotal").textContent = cash(sum("failed"));
    $("cancelledTotal").textContent = cash(sum("cancelled") + sum("refunded"));

    $("successfulCount").textContent = S.payments.filter(
      p => String(p.status).toLowerCase() === "successful"
    ).length;

    const invTotal = valid.reduce((a, i) => a + Number(i.amount || 0), 0);
    const invPaid = valid.reduce((a, i) => a + Number(i.paid_amount || 0), 0);
    const invBalance = valid.reduce(
      (a, i) => a + Math.max(Number(i.amount || 0) - Number(i.paid_amount || 0), 0),
      0
    );

    if ($("invTotal")) $("invTotal").textContent = cash(invTotal);
    if ($("invPaid")) $("invPaid").textContent = cash(invPaid);
    if ($("invBalance")) $("invBalance").textContent = cash(invBalance);

    if ($("invUnpaid")) {
      $("invUnpaid").textContent = valid.filter(
        i => String(i.status || "").toLowerCase() === "unpaid"
      ).length;
    }

    if ($("payReceived")) $("payReceived").textContent = cash(sum("successful"));
    if ($("payPending")) $("payPending").textContent = cash(sum("pending"));
    if ($("payFailed")) $("payFailed").textContent = cash(sum("failed"));

    if ($("payReceipts")) {
      $("payReceipts").textContent = S.payments.filter(
        p => String(p.status).toLowerCase() === "successful" && !!p.receipt_number
      ).length;
    }

    document.querySelectorAll("[data-print]").forEach(b => {
      b.onclick = () => printReceipt(b.dataset.print);
    });

    document.querySelectorAll("[data-invoice-print]").forEach(b => {
      b.onclick = () => printInvoice(b.dataset.invoicePrint);
    });

    document.querySelectorAll("[data-review]").forEach(b => {
      b.onclick = () => openPayment(b.dataset.review, true);
    });

    invoiceOptions();
  }

  async function reload() {
    await loadInvoices();
    await loadPayments();
    render();
  }

  // --------------------------------------------------
  // FORMS
  // --------------------------------------------------

  function panel(id) {
    ["invForm", "payForm", "reviewForm"].forEach(x => {
      if ($(x)) $(x).classList.add("hidden");
    });

    if (id && $(id)) $(id).classList.remove("hidden");
  }

  function clearPayForm() {
    S.editingPayment = null;

    $("payForm").querySelector("h3").textContent = "Record Payment";

    [
      "payAmount",
      "phone",
      "receiver",
      "txref"
    ].forEach(id => $(id).value = "");

    $("provider").value = "";
    $("savePay").textContent = "Save payment";
  }

  function openPayment(id, reviewOnly) {
    const p = payment(id);

    if (!p) return msg("Payment not found.", "err");

    if (!reviewOnly || String(p.status).toLowerCase() !== "pending") {
      return msg("Only pending payments can be reviewed. Existing payment records cannot be edited here.", "err");
    }

    const m = meta(p);

    S.editingPayment = id;

    $("reviewTitle").textContent =
      "Review Payment • " + (p.payment_reference || "");

    $("reviewSummary").innerHTML = `
      <b>Student:</b> ${esc(studentLabel(p.student_id))}<br>
      <b>Amount:</b> ${cash(p.amount, p.currency || "USD")}<br>
      <b>Provider:</b> ${esc(m.provider || "—")}<br>
      <b>Sender:</b> ${esc(m.sender_account || p.payer_phone || "—")}<br>
      <b>Receiver:</b> ${esc(m.receiver_account || "—")}<br>
      <b>Transaction:</b> ${esc(p.transaction_reference || p.provider_transaction_id || "—")}<br>
      <b>Current status:</b> ${esc(p.status)}
    `;

    $("reviewStatus").value = "successful";
    $("reviewNote").value = "";

    panel("reviewForm");
  }

  // --------------------------------------------------
  // CREATE INVOICE
  // --------------------------------------------------

  async function saveInvoice() {
    const institution_id = $("invInst").value;
    const student_id = $("invStudent").value;
    const description = $("description").value.trim();
    const amount = Number($("amount").value);
    const due_date = $("due").value || null;
    const st = student(student_id);

    if (
      !institution_id ||
      !st ||
      st.institution_id !== institution_id ||
      !description ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return msg("Choose matching institution/student, description and valid amount.", "err");
    }

    if (
      isInstitutionUser() &&
      institution_id !== S.profile.institution_id
    ) {
      return msg("You cannot create an invoice for another institution.", "err");
    }

    $("saveInv").disabled = true;

    try {
      const { error } = await db.from("invoices").insert({
        institution_id,
        student_id,
        description,
        amount,
        paid_amount: 0,
        due_date,
        status: "unpaid"
      });

      if (error) throw error;

      msg("Invoice created successfully.");

      ["description", "amount", "due"].forEach(id => $(id).value = "");

      panel();
      await reload();

    } catch (e) {
      msg("Invoice not saved: " + e.message, "err");
    } finally {
      $("saveInv").disabled = false;
    }
  }

  // --------------------------------------------------
  // RECORD PAYMENT - ALWAYS PENDING
  // --------------------------------------------------

  async function savePayment() {
    const institution_id = $("payInst").value;
    const student_id = $("payStudent").value;
    const invoice_id = $("payInvoice").value || null;
    const amount = Number($("payAmount").value);
    const payment_method = $("method").value;
    const payer_phone = $("phone").value.trim() || null;
    const transaction_reference = $("txref").value.trim() || null;
    const provider = $("provider").value || null;
    const receiver_account = $("receiver").value.trim() || null;

    const st = student(student_id);
    const iv = invoice(invoice_id);

    if (
      !institution_id ||
      !st ||
      st.institution_id !== institution_id ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return msg("Choose matching institution/student and enter a valid amount.", "err");
    }

    if (
      isInstitutionUser() &&
      institution_id !== S.profile.institution_id
    ) {
      return msg("You cannot record payments for another institution.", "err");
    }

    if (
      invoice_id &&
      (!iv || iv.student_id !== student_id || iv.institution_id !== institution_id)
    ) {
      return msg("Invoice must match the selected student and institution.", "err");
    }

    if (
      transaction_reference &&
      S.payments.some(p =>
        String(
          p.transaction_reference || p.provider_transaction_id || ""
        ).trim().toLowerCase() === transaction_reference.toLowerCase() &&
        String(p.status).toLowerCase() !== "failed"
      )
    ) {
      return msg("Duplicate transaction reference detected. Check existing payment records.", "err");
    }

    if (
      invoice_id &&
      amount > Math.max(Number(iv.amount) - Number(iv.paid_amount || 0), 0) + 0.001 &&
      !confirm("The payment amount is greater than the invoice balance. Record it as pending anyway?")
    ) {
      return;
    }

    const metadata = {
      source: "GAAWOW EMS Financial Portal",
      provider,
      sender_account: payer_phone,
      receiver_account,
      manually_verified: false,
      recorded_by: S.user.id,
      recorded_by_name: S.profile.full_name || "Financial user",
      recorded_at: new Date().toISOString()
    };

    const payload = {
      institution_id,
      student_id,
      invoice_id,
      amount,
      currency: "USD",
      payment_method,
      status: "pending",
      payer_phone,
      transaction_reference,
      paid_at: null,
      metadata
    };

    $("savePay").disabled = true;

    try {
      const r = await db
        .from("payments")
        .insert(payload)
        .select("id,payment_reference,status")
        .single();

      if (r.error) throw r.error;

      msg(
        "Payment recorded as PENDING. Reference: " +
        (r.data.payment_reference || "Assigned by database") +
        ". It must be reviewed before an official receipt can be issued."
      );

      clearPayForm();
      panel();
      await reload();
      setTab("payPanel");

    } catch (e) {
      msg("Payment not saved: " + e.message, "err");
    } finally {
      $("savePay").disabled = false;
    }
  }

  // --------------------------------------------------
  // REVIEW PAYMENT - EDGE FUNCTION ONLY
  // --------------------------------------------------

  async function saveReview() {
    const p = payment(S.editingPayment);

    if (!p) return msg("Select a payment first.", "err");

    if (String(p.status).toLowerCase() !== "pending") {
      return msg("This payment is no longer pending. Refresh the records.", "err");
    }

    const status = $("reviewStatus").value;
    const review_note = $("reviewNote").value.trim();

    if (!["successful", "failed", "cancelled"].includes(status)) {
      return msg("Choose a valid review decision.", "err");
    }

    if (
      status === "successful" &&
      !confirm("Confirm that you independently verified that the money was actually received?")
    ) {
      return;
    }

    if (
      status !== "successful" &&
      !review_note &&
      !confirm("No review note was entered. Continue with this decision?")
    ) {
      return;
    }

    $("saveReview").disabled = true;

    try {
      // All status changes go through the protected Edge Function.
      const { data, error } = await db.functions.invoke(
        "review-payment",
        {
          body: {
            payment_id: p.id,
            status,
            review_note
          }
        }
      );

      if (error) throw error;

      if (!data || data.success !== true) {
        throw new Error(data?.message || "Payment review was not completed.");
      }

      if (status === "successful") {
        if (data.official_receipt_issued) {
          msg("Payment approved. Official receipt: " +
            (data.payment?.receipt_number || "Issued"));
        } else {
          msg("Payment approved, but the database did not return a receipt number. Please verify the payment record.", "err");
        }
      } else {
        msg("Payment review completed: " + status);
      }

      panel();
      S.editingPayment = null;

      await reload();

    } catch (e) {
      console.error("Payment review error:", e);
      msg("Payment review failed: " + e.message, "err");
    } finally {
      $("saveReview").disabled = false;
    }
  }

  // --------------------------------------------------
  // PRINT INVOICE
  // --------------------------------------------------

  function printInvoice(id) {
    const i = invoice(id);

    if (!i) return msg("Invoice not found.", "err");

    const s = student(i.student_id);
    const inst = S.inst.find(x => x.id === i.institution_id);
    const paid = Number(i.paid_amount || 0);
    const amount = Number(i.amount || 0);
    const balance = Math.max(amount - paid, 0);

    const w = window.open("", "_blank", "width=900,height=950");

    if (!w) return msg("Allow pop-ups to print the invoice.", "err");

    w.document.write(`
      <!doctype html>
      <html>
      <head>
      <title>Invoice ${esc(i.invoice_number)}</title>
      <style>
      *{box-sizing:border-box}
      body{font:15px Arial;padding:35px;color:#172554;position:relative;background:#fff}
      body:before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background-image:url("${esc(LOGO_URL)}");background-repeat:no-repeat;background-position:center;background-size:300px auto;opacity:.075}
      header{background:#0B1E63;color:#fff;padding:22px;border-bottom:5px solid #D4AF37;display:flex;align-items:center;gap:18px}
      header .logo{width:76px;height:76px;object-fit:contain;background:#fff;border-radius:10px;padding:5px}
      table{width:100%;border-collapse:collapse;margin-top:24px}
      td{padding:12px;border:1px solid #ddd}
      .amount{font-size:22px;font-weight:bold}
      footer{margin-top:50px;display:flex;justify-content:space-between}
      @media print{body{padding:12mm}}
      </style>
      </head>
      <body>
      <header>
        <img class="logo" src="${esc(LOGO_URL)}" alt="GAAWOW Academy logo">
        <div>
          <h1>GAAWOW ACADEMY</h1>
          ILAYSKA AQOONTA IYO XIRFADDA<br>
          Burhakaba, Bay, Somalia<br>
          <b>OFFICIAL INVOICE</b>
        </div>
      </header>
      <h2>${esc(i.invoice_number)}</h2>
      <p>
        <b>Institution:</b> ${esc(inst?.name || "Institution")}<br>
        <b>Student:</b> ${esc(s?.full_name || "Student")} (${esc(s?.student_id || "")})<br>
        <b>Issue date:</b> ${esc(i.created_at ? new Date(i.created_at).toLocaleDateString() : new Date().toLocaleDateString())}
      </p>
      <table>
        <tr><td>Description</td><td>${esc(i.description || "Education fees")}</td></tr>
        <tr><td>Invoice amount</td><td>${cash(amount)}</td></tr>
        <tr><td>Paid amount</td><td>${cash(paid)}</td></tr>
        <tr><td>Balance</td><td class="amount">${cash(balance)}</td></tr>
        <tr><td>Status</td><td>${esc(i.status)}</td></tr>
        <tr><td>Due date</td><td>${esc(i.due_date || "—")}</td></tr>
      </table>
      <footer>
        <div>Issued by GAAWOW EMS</div>
        <div>Authorized signature: Dr Osmaan Gaawow</div>
      </footer>
      <script>window.onload=()=>window.print()<\/script>
      </body>
      </html>
    `);

    w.document.close();
  }

  // --------------------------------------------------
  // PRINT PAYMENT RECORD / OFFICIAL RECEIPT
  // --------------------------------------------------

  function printReceipt(id) {
    const p = payment(id);

    if (!p) return msg("Payment not found.", "err");

    const success = String(p.status).toLowerCase() === "successful";

    // Never label an unconfirmed payment as an official receipt.
    if (success && !p.receipt_number) {
      return msg("Payment is marked successful but has no receipt number. Verify its database record before printing.", "err");
    }

    const m = meta(p);
    const s = student(p.student_id);
    const i = invoice(p.invoice_id);
    const inst = S.inst.find(x => x.id === p.institution_id);

    const official = success && !!p.receipt_number;
    const documentNumber = official ? p.receipt_number : "NOT ISSUED";

    const w = window.open("", "_blank", "width=900,height=950");

    if (!w) return msg("Allow pop-ups to print the payment record.", "err");

    w.document.write(`
      <!doctype html>
      <html>
      <head>
      <title>${official ? "Official Receipt" : "Payment Record"} ${esc(documentNumber)}</title>
      <style>
      *{box-sizing:border-box}
      body{font:14px Arial;color:#172554;padding:30px;background:#fff}
      .receipt{max-width:760px;margin:auto;border:2px solid #0B1E63;padding:28px}
      .head{background:linear-gradient(110deg,#0B1E63,#0B4DA2);color:white;padding:20px;border-bottom:5px solid #D4AF37;display:flex;align-items:center;gap:16px}
      .logo{width:78px;height:78px;object-fit:contain;background:#fff;border-radius:10px;padding:5px}
      .brand{min-width:0;flex:1}
      h1{margin:0}
      .stamp{float:right;border:2px solid ${official ? "#15803d" : "#b45309"};color:${official ? "#15803d" : "#b45309"};padding:8px;font-weight:bold}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      td{padding:11px;border-bottom:1px solid #ddd}
      .amount{font-size:21px;font-weight:bold;color:#0B1E63}
      .foot{display:flex;justify-content:space-between;gap:25px;margin-top:45px}
      .note{background:#fff7dd;border:1px solid #f3df9b;padding:12px;margin-top:15px;line-height:1.5}
      @media print{body{padding:12mm}}
      </style>
      </head>
      <body>
      <div class="receipt">
        <div class="head">
          <img class="logo" src="${esc(LOGO_URL)}" alt="GAAWOW Academy logo">
          <div class="brand">
            <div class="stamp">${official ? "PAYMENT CONFIRMED" : "NOT AN OFFICIAL RECEIPT"}</div>
            <h1>GAAWOW ACADEMY</h1>
            ILAYSKA AQOONTA IYO XIRFADDA<br>
            Burhakaba, Bay, Somalia
          </div>
        </div>

        <h2>${official ? "OFFICIAL PAYMENT RECEIPT" : "PAYMENT RECORD"}</h2>

        <table>
          <tr><td>Receipt Number</td><td><b>${esc(documentNumber)}</b></td></tr>
          <tr><td>Payment Reference</td><td>${esc(p.payment_reference || p.id)}</td></tr>
          <tr><td>Institution</td><td>${esc(inst?.name || "—")}</td></tr>
          <tr><td>Student Name / ID</td><td>${esc(s?.full_name || "Student")} / ${esc(s?.student_id || "—")}</td></tr>
          <tr><td>Invoice</td><td>${esc(i?.invoice_number || "No invoice linked")}</td></tr>
          <tr><td>Provider / Wallet / Bank</td><td>${esc(m.provider || p.payment_method || "—")}</td></tr>
          <tr><td>Payment method</td><td>${esc(p.payment_method || "—")}</td></tr>
          <tr><td>Sender account</td><td>${esc(m.sender_account || p.payer_phone || "—")}</td></tr>
          <tr><td>Receiver account</td><td>${esc(m.receiver_account || "—")}</td></tr>
          <tr><td>Transaction reference</td><td>${esc(p.transaction_reference || p.provider_transaction_id || "—")}</td></tr>
          <tr><td>Payment date</td><td>${esc(fmtDate(p.paid_at || p.created_at))}</td></tr>
          <tr><td>Amount recorded</td><td class="amount">${cash(p.amount, p.currency || "USD")}</td></tr>
          <tr><td>Status</td><td><b>${esc(String(p.status).toUpperCase())}</b></td></tr>
          <tr><td>Reviewed by</td><td>${esc(m.reviewed_by_name || "—")}</td></tr>
          <tr><td>Review note</td><td>${esc(m.review_note || "—")}</td></tr>
        </table>

        ${official ? "" : `
          <div class="note">
            This document is a payment record only. It is not proof of successful receipt
            and must not be used as an official payment receipt.
            Official receipt issuance requires payment approval.
          </div>
        `}

        <div class="foot">
          <div>Issued by GAAWOW EMS<br>Keep this document for your records.</div>
          <div>Authorized signature:<br><br><b>Dr Osmaan Gaawow</b></div>
        </div>
      </div>
      <script>window.onload=()=>window.print()<\/script>
      </body>
      </html>
    `);

    w.document.close();
  }

  // --------------------------------------------------
  // TABS AND EVENTS
  // --------------------------------------------------

  function setTab(id) {
    S.tab = id;

    ["invPanel", "payPanel"].forEach(x => {
      $(x).classList.toggle("hidden", x !== id);
    });

    document.querySelectorAll("[data-tab]").forEach(b => {
      b.classList.toggle("active", b.dataset.tab === id);
    });
  }

  function events() {
    $("refresh").onclick = async () => {
      try {
        await loadStudents();
        await reload();
        msg("Data refreshed.");
      } catch (e) {
        msg(e.message, "err");
      }
    };

    $("logout").onclick = async () => {
      if (confirm("Sign out of GAAWOW EMS?")) {
        await db.auth.signOut();
        location.href = "index.html";
      }
    };

    const addInvoice = () => {
      panel("invForm");
      studentOptions();
    };

    $("addInv").onclick = addInvoice;

    if ($("addInvPanel")) {
      $("addInvPanel").onclick = addInvoice;
    }

    const addPay = () => {
      clearPayForm();
      studentOptions();
      panel("payForm");
    };

    $("addPay").onclick = addPay;

    if ($("addPayInPanel")) {
      $("addPayInPanel").onclick = addPay;
    }

    $("saveInv").onclick = saveInvoice;
    $("savePay").onclick = savePayment;
    $("saveReview").onclick = saveReview;

    document.querySelectorAll(".cancel").forEach(b => {
      b.onclick = () => {
        panel();
        S.editingPayment = null;
      };
    });

    document.querySelectorAll("[data-tab]").forEach(b => {
      b.onclick = () => setTab(b.dataset.tab);
    });

    $("search").oninput = render;

    ["paymentStatusFilter", "paymentMethodFilter"].forEach(id => {
      if ($(id)) $(id).onchange = render;
    });

    $("filterInst").onchange = async () => {
      if (isInstitutionUser()) {
        $("filterInst").value = S.profile.institution_id;
        return;
      }

      try {
        await reload();
        studentOptions();
      } catch (e) {
        msg(e.message, "err");
      }
    };

    ["invInst", "payInst"].forEach(id => {
      $(id).onchange = studentOptions;
    });

    $("payStudent").onchange = invoiceOptions;
  }

  // --------------------------------------------------
  // INITIALIZE
  // --------------------------------------------------

  async function init() {
    events();

    try {
      if (!await auth()) return;

      await loadInstitutions();
      await loadStudents();
      await reload();

      const requested = sessionStorage.getItem("gaawowFinanceTab");

      setTab(
        location.hash.toLowerCase().includes("payment") ||
        requested === "payPanel"
          ? "payPanel"
          : "invPanel"
      );

      sessionStorage.removeItem("gaawowFinanceTab");

      msg("GAAWOW EMS Financial Management is connected.");

    } catch (e) {
      console.error(e);
      msg("Portal setup error: " + e.message, "err");
    }
  }

  init();
})();
