const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

let currentUser = null;
let editingId = null;

let allPayments = [];
let allStudents = [];
let allInvoices = [];

const institutionSelect =
  document.getElementById("institutionSelect");

const studentSelect =
  document.getElementById("studentSelect");

const invoiceSelect =
  document.getElementById("invoiceSelect");

const paymentForm =
  document.getElementById("paymentForm");

const searchInput =
  document.getElementById("searchInput");

const statusFilter =
  document.getElementById("statusFilter");


// ========================================
// INIT
// ========================================

document.addEventListener(
  "DOMContentLoaded",
  init
);

async function init() {

  try {

    const {
      data: {
        session
      },
      error
    } = await supabaseClient.auth.getSession();

    if (error) throw error;

    if (!session) {
      window.location.href = "index.html";
      return;
    }

    currentUser = session.user;

    await checkSuperAdmin();

    await loadInstitutions();

    await loadStudents();

    await loadInvoices();

    await loadPayments();

    updateStats();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "Unable to load Payments Management.",
      "error"
    );
  }
}


// ========================================
// SUPER ADMIN
// ========================================

async function checkSuperAdmin() {

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select(
      "full_name, role, institution_id, is_active"
    )
    .eq("id", currentUser.id)
    .single();

  if (error) throw error;

  if (!data) {
    throw new Error("Profile not found.");
  }

  if (data.role !== "super_admin") {

    alert(
      "Access denied. Super Admin only."
    );

    window.location.href =
      "super-admin.html";

    return;
  }

  if (data.is_active === false) {

    await supabaseClient.auth.signOut();

    window.location.href =
      "index.html";
  }
}


// ========================================
// INSTITUTIONS
// ========================================

async function loadInstitutions() {

  const {
    data,
    error
  } = await supabaseClient
    .from("institutions")
    .select("id,name")
    .order("name");

  if (error) throw error;

  institutionSelect.innerHTML =
    `<option value="">Select institution</option>`;

  (data || []).forEach(item => {

    const option =
      document.createElement("option");

    option.value = item.id;
    option.textContent = item.name;

    institutionSelect.appendChild(option);
  });
}


// ========================================
// STUDENTS
// ========================================

async function loadStudents() {

  const {
    data,
    error
  } = await supabaseClient
    .from("students")
    .select(`
      id,
      institution_id,
      student_id,
      full_name
    `)
    .order("full_name");

  if (error) throw error;

  allStudents = data || [];

  renderStudentOptions();
}


institutionSelect.addEventListener(
  "change",
  () => {

    renderStudentOptions();
    renderInvoiceOptions();
  }
);


function renderStudentOptions() {

  const institutionId =
    institutionSelect.value;

  studentSelect.innerHTML =
    `<option value="">Select student</option>`;

  const students =
    institutionId
      ? allStudents.filter(
          student =>
            student.institution_id ===
            institutionId
        )
      : allStudents;

  students.forEach(student => {

    const option =
      document.createElement("option");

    option.value = student.id;

    option.textContent =
      student.student_id
        ? `${student.full_name} (${student.student_id})`
        : student.full_name;

    studentSelect.appendChild(option);
  });
}


// ========================================
// INVOICES
// ========================================

async function loadInvoices() {

  const {
    data,
    error
  } = await supabaseClient
    .from("invoices")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {

    console.warn(
      "Invoice loading warning:",
      error.message
    );

    allInvoices = [];
    return;
  }

  allInvoices = data || [];

  renderInvoiceOptions();
}


function renderInvoiceOptions() {

  const institutionId =
    institutionSelect.value;

  invoiceSelect.innerHTML =
    `<option value="">No invoice / optional</option>`;

  let invoices =
    institutionId
      ? allInvoices.filter(
          invoice =>
            invoice.institution_id ===
            institutionId
        )
      : allInvoices;

  invoices.forEach(invoice => {

    const option =
      document.createElement("option");

    option.value = invoice.id;

    const label =
      invoice.invoice_number ||
      invoice.reference ||
      invoice.id.substring(0, 8);

    option.textContent = label;

    invoiceSelect.appendChild(option);
  });
}


// ========================================
// LOAD PAYMENTS
// ========================================

async function loadPayments() {

  const {
    data,
    error
  } = await supabaseClient
    .from("payments")
    .select(`
      id,
      institution_id,
      invoice_id,
      student_id,
      amount,
      currency,
      payment_method,
      provider,
      provider_transaction_id,
      transaction_reference,
      payer_phone,
      status,
      paid_at,
      metadata,
      created_at,
      updated_at
    `)
    .order("created_at", {
      ascending: false
    });

  if (error) throw error;

  allPayments = data || [];

  renderPayments(
    allPayments
  );

  updateStats();
}


// ========================================
// RENDER
// ========================================

function renderPayments(payments) {

  const table =
    document.getElementById(
      "paymentsTable"
    );

  if (!payments.length) {

    table.innerHTML =
      `<tr>
        <td colspan="10" class="loading">
          No payments found.
        </td>
      </tr>`;

    return;
  }

  table.innerHTML = "";

  payments.forEach(
    (payment, index) => {

      const student =
        allStudents.find(
          s =>
            s.id ===
            payment.student_id
        );

      const studentName =
        student
          ? student.full_name
          : "Unknown Student";

      const studentCode =
        student?.student_id
          ? ` (${student.student_id})`
          : "";

      const method =
        payment.payment_method
          ? formatText(
              payment.payment_method
            )
          : "—";

      const reference =
        payment.transaction_reference ||
        payment.provider_transaction_id ||
        "—";

      const paidAt =
        payment.paid_at
          ? formatDate(
              payment.paid_at
            )
          : "—";

      const status =
        String(payment.status || "")
          .toLowerCase();

      const row =
        document.createElement("tr");

      row.innerHTML = `
        <td>${index + 1}</td>

        <td>
          <strong>
            ${escapeHtml(studentName)}
          </strong>
          <br>
          <small>
            ${escapeHtml(studentCode)}
          </small>
        </td>

        <td>
          <strong>
            ${Number(payment.amount).toFixed(2)}
          </strong>
        </td>

        <td>
          ${escapeHtml(payment.currency || "")}
        </td>

        <td>
          ${escapeHtml(method)}
        </td>

        <td>
          ${escapeHtml(payment.provider || "—")}
        </td>

        <td>
          ${escapeHtml(reference)}
        </td>

        <td>
          <span class="badge ${status}">
            ${escapeHtml(
              formatText(status)
            )}
          </span>
        </td>

        <td>
          ${paidAt}
        </td>

        <td>
          <div class="actions">

            <button
              class="edit"
              onclick="editPayment('${payment.id}')">
              Edit
            </button>

            <button
              class="danger"
              onclick="deletePayment('${payment.id}')">
              Delete
            </button>

          </div>
        </td>
      `;

      table.appendChild(row);
    }
  );
}


// ========================================
// SEARCH + FILTER
// ========================================

searchInput.addEventListener(
  "input",
  filterPayments
);

statusFilter.addEventListener(
  "change",
  filterPayments
);


function filterPayments() {

  const query =
    searchInput.value
      .trim()
      .toLowerCase();

  const status =
    statusFilter.value
      .toLowerCase();

  const filtered =
    allPayments.filter(payment => {

      const student =
        allStudents.find(
          s =>
            s.id ===
            payment.student_id
        );

      const text = `
        ${student?.full_name || ""}
        ${student?.student_id || ""}
        ${payment.provider || ""}
        ${payment.transaction_reference || ""}
        ${payment.provider_transaction_id || ""}
        ${payment.payer_phone || ""}
        ${payment.payment_method || ""}
        ${payment.currency || ""}
      `.toLowerCase();

      const matchesSearch =
        !query ||
        text.includes(query);

      const matchesStatus =
        !status ||
        String(payment.status)
          .toLowerCase() === status;

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  renderPayments(filtered);
}


// ========================================
// SAVE / UPDATE
// ========================================

paymentForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    try {

      const institutionId =
        institutionSelect.value;

      const studentId =
        studentSelect.value;

      const invoiceId =
        invoiceSelect.value || null;

      const amount =
        Number(
          document.getElementById(
            "amount"
          ).value
        );

      const currency =
        document.getElementById(
          "currency"
        ).value.trim();

      const paymentMethod =
        document.getElementById(
          "paymentMethod"
        ).value || null;

      const provider =
        document.getElementById(
          "provider"
        ).value.trim() || null;

      const providerTransactionId =
        document.getElementById(
          "providerTransactionId"
        ).value.trim() || null;

      const transactionReference =
        document.getElementById(
          "transactionReference"
        ).value.trim() || null;

      const payerPhone =
        document.getElementById(
          "payerPhone"
        ).value.trim() || null;

      const status =
        document.getElementById(
          "status"
        ).value;

      const paidAtInput =
        document.getElementById(
          "paidAt"
        ).value;

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

      if (!amount || amount <= 0) {
        showMessage(
          "Amount must be greater than 0.",
          "error"
        );
        return;
      }

      if (!currency) {
        showMessage(
          "Currency is required.",
          "error"
        );
        return;
      }


      const paidAt =
        paidAtInput
          ? new Date(
              paidAtInput
            ).toISOString()
          : null;


      const payload = {

        institution_id:
          institutionId,

        invoice_id:
          invoiceId,

        student_id:
          studentId,

        amount:
          amount,

        currency:
          currency.toUpperCase(),

        payment_method:
          paymentMethod,

        provider:
          provider,

        provider_transaction_id:
          providerTransactionId,

        transaction_reference:
          transactionReference,

        payer_phone:
          payerPhone,

        status:
          status,

        paid_at:
          paidAt,

        metadata:
          {},

        updated_at:
          new Date().toISOString()
      };


      const saveBtn =
        document.getElementById(
          "saveBtn"
        );

      saveBtn.disabled = true;

      saveBtn.textContent =
        editingId
          ? "Updating..."
          : "Saving...";


      if (editingId) {

        const {
          error
        } = await supabaseClient
          .from("payments")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;

        showMessage(
          "Payment updated successfully.",
          "success"
        );

      } else {

        const {
          error
        } = await supabaseClient
          .from("payments")
          .insert([payload]);

        if (error) throw error;

        showMessage(
          "Payment created successfully.",
          "success"
        );
      }


      resetForm();

      await loadPayments();

    } catch (error) {

      console.error(error);

      showMessage(
        error.message ||
        "Unable to save payment.",
        "error"
      );

    } finally {

      const saveBtn =
        document.getElementById(
          "saveBtn"
        );

      saveBtn.disabled = false;

      saveBtn.textContent =
        editingId
          ? "Update Payment"
          : "+ Save Payment";
    }
  }
);


// ========================================
// EDIT
// ========================================

window.editPayment =
function(id) {

  const payment =
    allPayments.find(
      p => p.id === id
    );

  if (!payment) return;

  editingId = id;

  document.getElementById(
    "formTitle"
  ).textContent =
    "Edit Payment";

  document.getElementById(
    "saveBtn"
  ).textContent =
    "Update Payment";


  institutionSelect.value =
    payment.institution_id;

  renderStudentOptions();

  renderInvoiceOptions();

  studentSelect.value =
    payment.student_id;

  invoiceSelect.value =
    payment.invoice_id || "";


  document.getElementById(
    "amount"
  ).value =
    payment.amount;

  document.getElementById(
    "currency"
  ).value =
    payment.currency || "USD";

  document.getElementById(
    "paymentMethod"
  ).value =
    payment.payment_method || "";

  document.getElementById(
    "provider"
  ).value =
    payment.provider || "";

  document.getElementById(
    "providerTransactionId"
  ).value =
    payment.provider_transaction_id || "";

  document.getElementById(
    "transactionReference"
  ).value =
    payment.transaction_reference || "";

  document.getElementById(
    "payerPhone"
  ).value =
    payment.payer_phone || "";

  document.getElementById(
    "status"
  ).value =
    payment.status || "paid";


  if (payment.paid_at) {

    const date =
      new Date(payment.paid_at);

    const local =
      new Date(
        date.getTime() -
        date.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0,16);

    document.getElementById(
      "paidAt"
    ).value = local;

  } else {

    document.getElementById(
      "paidAt"
    ).value = "";
  }


  window.scrollTo({
    top:0,
    behavior:"smooth"
  });
};


// ========================================
// DELETE
// ========================================

window.deletePayment =
async function(id) {

  const payment =
    allPayments.find(
      p => p.id === id
    );

  if (!payment) return;

  const confirmed =
    confirm(
      `Delete payment of ${payment.amount} ${payment.currency}?`
    );

  if (!confirmed) return;


  try {

    const {
      error
    } = await supabaseClient
      .from("payments")
      .delete()
      .eq("id", id);

    if (error) throw error;

    showMessage(
      "Payment deleted successfully.",
      "success"
    );

    await loadPayments();

  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "Unable to delete payment.",
      "error"
    );
  }
};


// ========================================
// RESET
// ========================================

window.resetForm =
function() {

  editingId = null;

  paymentForm.reset();

  institutionSelect.value = "";

  studentSelect.innerHTML =
    `<option value="">
      Select student
    </option>`;

  invoiceSelect.innerHTML =
    `<option value="">
      No invoice / optional
    </option>`;

  document.getElementById(
    "currency"
  ).value = "USD";

  document.getElementById(
    "status"
  ).value = "paid";

  document.getElementById(
    "formTitle"
  ).textContent =
    "Add New Payment";

  document.getElementById(
    "saveBtn"
  ).textContent =
    "+ Save Payment";
};


// ========================================
// STATS
// ========================================

function updateStats() {

  const total =
    allPayments.length;

  const paid =
    allPayments.filter(
      p =>
        String(p.status)
          .toLowerCase() === "paid"
    ).length;

  const pending =
    allPayments.filter(
      p =>
        String(p.status)
          .toLowerCase() === "pending"
    ).length;

  const totalAmount =
    allPayments
      .filter(
        p =>
          String(p.status)
            .toLowerCase() === "paid"
      )
      .reduce(
        (sum,p) =>
          sum + Number(p.amount || 0),
        0
      );


  document.getElementById(
    "totalPayments"
  ).textContent = total;

  document.getElementById(
    "paidPayments"
  ).textContent = paid;

  document.getElementById(
    "pendingPayments"
  ).textContent = pending;

  document.getElementById(
    "totalAmount"
  ).textContent =
    `$${totalAmount.toFixed(2)}`;
}


// ========================================
// HELPERS
// ========================================

function formatText(value) {

  return String(value || "")
    .replaceAll("_"," ")
    .replace(
      /\b\w/g,
      char => char.toUpperCase()
    );
}


function formatDate(value) {

  return new Date(value)
    .toLocaleString();
}


function escapeHtml(value) {

  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}


function showMessage(
  message,
  type
) {

  const box =
    document.getElementById(
      "message"
    );

  box.textContent = message;

  box.className =
    `message ${type}`;

  box.style.display =
    "block";

  setTimeout(() => {
    box.style.display = "none";
  },5000);
}


// ========================================
// DASHBOARD
// ========================================

window.goDashboard =
function() {

  window.location.href =
    "super-admin.html";
};
