const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const { createClient } =
  supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let payments = [];
let institutions = [];
let students = [];
let invoices = [];


// ======================================================
// INITIALIZE
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {

  document
    .getElementById("institutionId")
    .addEventListener("change", loadStudentsAndInvoices);

  document
    .getElementById("searchInput")
    .addEventListener("input", renderPayments);

  document
    .getElementById("statusFilter")
    .addEventListener("change", renderPayments);

  document
    .getElementById("paymentForm")
    .addEventListener("submit", savePayment);

  await checkAuth();
});


// ======================================================
// AUTHENTICATION
// ======================================================

async function checkAuth() {

  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error || !session) {
    window.location.href = "index.html";
    return;
  }

  currentUser = session.user;

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("full_name, role, institution_id, is_active")
      .eq("id", currentUser.id)
      .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "super_admin" ||
    profile.is_active !== true
  ) {
    alert("Access denied. Super Admin only.");
    await supabase.auth.signOut();
    window.location.href = "index.html";
    return;
  }

  await loadInstitutions();
  await loadPayments();
}


// ======================================================
// LOAD INSTITUTIONS
// ======================================================

async function loadInstitutions() {

  const { data, error } =
    await supabase
      .from("institutions")
      .select("*")
      .order("name");

  if (error) {
    showMessage(
      "Failed to load institutions: " + error.message,
      "error"
    );
    return;
  }

  institutions = data || [];

  const select =
    document.getElementById("institutionId");

  select.innerHTML =
    '<option value="">Select Institution</option>';

  institutions.forEach(inst => {

    const option =
      document.createElement("option");

    option.value = inst.id;
    option.textContent = inst.name;

    select.appendChild(option);
  });
}


// ======================================================
// LOAD STUDENTS + INVOICES
// ======================================================

async function loadStudentsAndInvoices() {

  const institutionId =
    document.getElementById("institutionId").value;

  const studentSelect =
    document.getElementById("studentId");

  const invoiceSelect =
    document.getElementById("invoiceId");

  studentSelect.innerHTML =
    '<option value="">Select Student</option>';

  invoiceSelect.innerHTML =
    '<option value="">No Invoice</option>';

  students = [];
  invoices = [];

  if (!institutionId) {

    studentSelect.disabled = true;

    return;
  }

  studentSelect.disabled = false;


  // --------------------------------------------------
  // STUDENTS
  // --------------------------------------------------

  const {
    data: studentData,
    error: studentError
  } = await supabase
    .from("students")
    .select("*")
    .eq("institution_id", institutionId)
    .order("full_name");

  if (studentError) {

    showMessage(
      "Failed to load students: " +
      studentError.message,
      "error"
    );

  } else {

    students = studentData || [];

    students.forEach(student => {

      const option =
        document.createElement("option");

      option.value = student.id;

      option.textContent =
        `${student.full_name || "Unnamed"} — ${student.student_id || ""}`;

      studentSelect.appendChild(option);
    });
  }


  // --------------------------------------------------
  // INVOICES
  // --------------------------------------------------

  const {
    data: invoiceData,
    error: invoiceError
  } = await supabase
    .from("invoices")
    .select("*")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false });

  if (!invoiceError && invoiceData) {

    invoices = invoiceData;

    invoices.forEach(invoice => {

      const option =
        document.createElement("option");

      option.value = invoice.id;

      const invoiceLabel =
        invoice.invoice_number ||
        invoice.reference ||
        invoice.id;

      option.textContent =
        invoiceLabel;

      invoiceSelect.appendChild(option);
    });
  }
}


// ======================================================
// LOAD PAYMENTS
// ======================================================

async function loadPayments() {

  const tbody =
    document.getElementById("paymentsTableBody");

  tbody.innerHTML =
    `<tr>
      <td colspan="8" class="loading">
        Loading payments...
      </td>
    </tr>`;

  const {
    data,
    error
  } = await supabase
    .from("payments")
    .select(`
      *,
      students (
        full_name,
        student_id
      )
    `)
    .order("created_at", {
      ascending: false
    });

  if (error) {

    tbody.innerHTML =
      `<tr>
        <td colspan="8" class="empty">
          Failed to load payments
        </td>
      </tr>`;

    showMessage(
      "Failed to load payments: " +
      error.message,
      "error"
    );

    return;
  }

  payments = data || [];

  updateStats();
  renderPayments();
}


// ======================================================
// SAVE PAYMENT
// ======================================================

async function savePayment(event) {

  event.preventDefault();

  const paymentId =
    document.getElementById("paymentId").value;

  const institutionId =
    document.getElementById("institutionId").value;

  const studentId =
    document.getElementById("studentId").value;

  const invoiceId =
    document.getElementById("invoiceId").value || null;

  const amount =
    Number(document.getElementById("amount").value);

  const currency =
    document.getElementById("currency").value
      .trim()
      .toUpperCase();

  const paymentMethod =
    document.getElementById("paymentMethod").value || null;

  const provider =
    document.getElementById("provider").value.trim() || null;

  const payerPhone =
    document.getElementById("payerPhone").value.trim() || null;

  const providerTransactionId =
    document
      .getElementById("providerTransactionId")
      .value
      .trim() || null;

  const transactionReference =
    document
      .getElementById("transactionReference")
      .value
      .trim() || null;

  const status =
    document.getElementById("status").value;

  const paidAtInput =
    document.getElementById("paidAt").value;

  const paidAt =
    paidAtInput
      ? new Date(paidAtInput).toISOString()
      : null;


  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  if (!institutionId) {
    showMessage(
      "Please select an institution.",
      "error"
    );
    return;
  }

  if (!studentId) {
    showMessage(
      "Please select a student.",
      "error"
    );
    return;
  }

  if (!amount || amount < 0) {
    showMessage(
      "Please enter a valid amount.",
      "error"
    );
    return;
  }


  // --------------------------------------------------
  // PAYMENT DATA
  // --------------------------------------------------

  const paymentData = {

    institution_id: institutionId,

    invoice_id: invoiceId,

    student_id: studentId,

    amount: amount,

    currency: currency,

    payment_method: paymentMethod,

    provider: provider,

    provider_transaction_id:
      providerTransactionId,

    transaction_reference:
      transactionReference,

    payer_phone: payerPhone,

    status: status,

    paid_at: paidAt,

    metadata: {}
  };


  let result;


  // --------------------------------------------------
  // UPDATE
  // --------------------------------------------------

  if (paymentId) {

    result =
      await supabase
        .from("payments")
        .update(paymentData)
        .eq("id", paymentId);

  }

  // --------------------------------------------------
  // INSERT
  // --------------------------------------------------

  else {

    result =
      await supabase
        .from("payments")
        .insert(paymentData);
  }


  if (result.error) {

    showMessage(
      "Payment error: " +
      result.error.message,
      "error"
    );

    console.error(result.error);

    return;
  }


  showMessage(
    paymentId
      ? "Payment updated successfully."
      : "Payment saved successfully.",
    "success"
  );

  resetForm();

  await loadPayments();
}


// ======================================================
// RENDER PAYMENTS
// ======================================================

function renderPayments() {

  const tbody =
    document.getElementById("paymentsTableBody");

  const search =
    document
      .getElementById("searchInput")
      .value
      .toLowerCase()
      .trim();

  const statusFilter =
    document.getElementById("statusFilter").value;


  const filtered =
    payments.filter(payment => {

      const student =
        payment.students || {};

      const studentName =
        (student.full_name || "").toLowerCase();

      const studentId =
        (student.student_id || "").toLowerCase();

      const provider =
        (payment.provider || "").toLowerCase();

      const reference =
        (payment.transaction_reference || "")
          .toLowerCase();

      const providerTxn =
        (payment.provider_transaction_id || "")
          .toLowerCase();

      const matchesSearch =
        !search ||
        studentName.includes(search) ||
        studentId.includes(search) ||
        provider.includes(search) ||
        reference.includes(search) ||
        providerTxn.includes(search);

      const matchesStatus =
        !statusFilter ||
        payment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });


  if (!filtered.length) {

    tbody.innerHTML =
      `<tr>
        <td colspan="8" class="empty">
          No payment records found.
        </td>
      </tr>`;

    return;
  }


  tbody.innerHTML =
    filtered.map(payment => {

      const student =
        payment.students || {};

      const studentName =
        student.full_name || "Unknown Student";

      const amount =
        Number(payment.amount || 0)
          .toFixed(2);

      const currency =
        payment.currency || "USD";

      const method =
        formatText(payment.payment_method);

      const provider =
        payment.provider || "—";

      const reference =
        payment.transaction_reference || "—";

      const status =
        payment.status || "pending";

      const paidAt =
        payment.paid_at
          ? formatDate(payment.paid_at)
          : "—";


      return `
        <tr>

          <td>
            <strong>${escapeHtml(studentName)}</strong>
            <br>
            <small>
              ${escapeHtml(student.student_id || "")}
            </small>
          </td>

          <td>
            <strong>
              ${escapeHtml(currency)}
              ${amount}
            </strong>
          </td>

          <td>
            ${escapeHtml(method)}
          </td>

          <td>
            ${escapeHtml(provider)}
          </td>

          <td>
            ${escapeHtml(reference)}
          </td>

          <td>
            <span class="status status-${status}">
              ${formatText(status)}
            </span>
          </td>

          <td>
            ${paidAt}
          </td>

          <td>

            <button
              class="action-btn edit"
              onclick="editPayment('${payment.id}')">
              Edit
            </button>

            <button
              class="action-btn delete"
              onclick="deletePayment('${payment.id}')">
              Delete
            </button>

          </td>

        </tr>
      `;

    }).join("");
}


// ======================================================
// UPDATE STATISTICS
// ======================================================

function updateStats() {

  const total =
    payments.length;

  const successful =
    payments.filter(
      p => p.status === "successful"
    );

  const pending =
    payments.filter(
      p => p.status === "pending"
    );

  const totalAmount =
    successful.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );


  document.getElementById(
    "totalPayments"
  ).textContent = total;


  document.getElementById(
    "successfulPayments"
  ).textContent = successful.length;


  document.getElementById(
    "pendingPayments"
  ).textContent = pending.length;


  document.getElementById(
    "totalAmount"
  ).textContent =
    "$" + totalAmount.toFixed(2);
}


// ======================================================
// EDIT PAYMENT
// ======================================================

async function editPayment(id) {

  const payment =
    payments.find(p => p.id === id);

  if (!payment) {
    return;
  }


  document.getElementById(
    "paymentId"
  ).value = payment.id;


  document.getElementById(
    "institutionId"
  ).value = payment.institution_id;


  await loadStudentsAndInvoices();


  document.getElementById(
    "studentId"
  ).value = payment.student_id;


  document.getElementById(
    "invoiceId"
  ).value = payment.invoice_id || "";


  document.getElementById(
    "amount"
  ).value = payment.amount;


  document.getElementById(
    "currency"
  ).value = payment.currency || "USD";


  document.getElementById(
    "paymentMethod"
  ).value =
    payment.payment_method || "";


  document.getElementById(
    "provider"
  ).value =
    payment.provider || "";


  document.getElementById(
    "payerPhone"
  ).value =
    payment.payer_phone || "";


  document.getElementById(
    "providerTransactionId"
  ).value =
    payment.provider_transaction_id || "";


  document.getElementById(
    "transactionReference"
  ).value =
    payment.transaction_reference || "";


  document.getElementById(
    "status"
  ).value =
    payment.status || "pending";


  if (payment.paid_at) {

    const date =
      new Date(payment.paid_at);

    const local =
      new Date(
        date.getTime() -
        date.getTimezoneOffset() * 60000
      )
      .toISOString()
      .slice(0, 16);

    document.getElementById(
      "paidAt"
    ).value = local;

  } else {

    document.getElementById(
      "paidAt"
    ).value = "";
  }


  document.getElementById(
    "formTitle"
  ).textContent =
    "Edit Payment";


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ======================================================
// DELETE PAYMENT
// ======================================================

async function deletePayment(id) {

  const payment =
    payments.find(p => p.id === id);

  if (!payment) {
    return;
  }


  const studentName =
    payment.students?.full_name ||
    "this student";


  const confirmed =
    confirm(
      `Delete payment for ${studentName}?\n\nThis action cannot be undone.`
    );


  if (!confirmed) {
    return;
  }


  const { error } =
    await supabase
      .from("payments")
      .delete()
      .eq("id", id);


  if (error) {

    showMessage(
      "Delete failed: " +
      error.message,
      "error"
    );

    return;
  }


  showMessage(
    "Payment deleted successfully.",
    "success"
  );


  await loadPayments();
}


// ======================================================
// RESET FORM
// ======================================================

function resetForm() {

  document.getElementById(
    "paymentForm"
  ).reset();


  document.getElementById(
    "paymentId"
  ).value = "";


  document.getElementById(
    "currency"
  ).value = "USD";


  document.getElementById(
    "status"
  ).value = "pending";


  document.getElementById(
    "studentId"
  ).innerHTML =
    '<option value="">Select Student</option>';


  document.getElementById(
    "studentId"
  ).disabled = true;


  document.getElementById(
    "invoiceId"
  ).innerHTML =
    '<option value="">No Invoice</option>';


  document.getElementById(
    "formTitle"
  ).textContent =
    "Add Payment";
}


// ======================================================
// MESSAGE
// ======================================================

function showMessage(message, type) {

  const box =
    document.getElementById("message");

  box.textContent = message;

  box.className =
    "message " + type;


  setTimeout(() => {

    box.className = "message";

  }, 5000);
}


// ======================================================
// FORMAT HELPERS
// ======================================================

function formatText(value) {

  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, char =>
      char.toUpperCase()
    );
}


function formatDate(value) {

  try {

    return new Date(value)
      .toLocaleString();

  } catch {

    return value;
  }
}


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ======================================================
// DASHBOARD
// ======================================================

function goBack() {

  window.location.href =
    "super-admin.html";
}
