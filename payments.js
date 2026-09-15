const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = null;

let payments = [];
let institutions = [];
let students = [];
let invoices = [];


// ======================================================
// START
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {

  document
    .getElementById("institutionId")
    .addEventListener(
      "change",
      loadStudentsForInstitution
    );

  document
    .getElementById("searchInput")
    .addEventListener(
      "input",
      renderPayments
    );

  document
    .getElementById("statusFilter")
    .addEventListener(
      "change",
      renderPayments
    );

  document
    .getElementById("paymentForm")
    .addEventListener(
      "submit",
      savePayment
    );

  await checkAuth();

});


// ======================================================
// AUTH
// ======================================================

async function checkAuth() {

  const {
    data: { session },
    error
  } = await db.auth.getSession();

  if (error || !session) {

    window.location.href =
      "index.html";

    return;
  }

  currentUser = session.user;


  const {
    data: profile,
    error: profileError
  } = await db
    .from("profiles")
    .select(
      "full_name, role, institution_id, is_active"
    )
    .eq("id", currentUser.id)
    .single();


  if (
    profileError ||
    !profile ||
    profile.role !== "super_admin" ||
    profile.is_active !== true
  ) {

    alert(
      "Access denied. Super Admin only."
    );

    await db.auth.signOut();

    window.location.href =
      "index.html";

    return;
  }


  await loadInstitutions();

  await loadPayments();

}


// ======================================================
// LOAD INSTITUTIONS
// ======================================================

async function loadInstitutions() {

  const select =
    document.getElementById(
      "institutionId"
    );

  select.innerHTML =
    '<option value="">Loading institutions...</option>';

  const {
    data,
    error
  } = await db
    .from("institutions")
    .select("id, name")
    .order("name", {
      ascending: true
    });


  if (error) {

    select.innerHTML =
      '<option value="">Unable to load institutions</option>';

    showMessage(
      "Institution loading error: " +
      error.message,
      "error"
    );

    console.error(
      "Institution error:",
      error
    );

    return;
  }


  institutions = data || [];


  select.innerHTML =
    '<option value="">Select Institution</option>';


  if (!institutions.length) {

    select.innerHTML =
      '<option value="">No institutions found</option>';

    return;
  }


  institutions.forEach(institution => {

    const option =
      document.createElement("option");

    option.value =
      institution.id;

    option.textContent =
      institution.name;

    select.appendChild(option);

  });

}


// ======================================================
// LOAD STUDENTS FOR SELECTED INSTITUTION
// ======================================================

async function loadStudentsForInstitution() {

  const institutionId =
    document.getElementById(
      "institutionId"
    ).value;


  const studentSelect =
    document.getElementById(
      "studentId"
    );

  const invoiceSelect =
    document.getElementById(
      "invoiceId"
    );


  students = [];
  invoices = [];


  studentSelect.innerHTML =
    '<option value="">Loading students...</option>';

  studentSelect.disabled = true;


  invoiceSelect.innerHTML =
    '<option value="">No Invoice</option>';


  if (!institutionId) {

    studentSelect.innerHTML =
      '<option value="">Select Institution First</option>';

    return;
  }


  // ====================================================
  // STUDENTS
  // ====================================================

  const {
    data: studentData,
    error: studentError
  } = await db
    .from("students")
    .select(
      "id, institution_id, student_id, full_name, status"
    )
    .eq(
      "institution_id",
      institutionId
    )
    .order("full_name", {
      ascending: true
    });


  if (studentError) {

    studentSelect.innerHTML =
      '<option value="">Unable to load students</option>';

    showMessage(
      "Student loading error: " +
      studentError.message,
      "error"
    );

    console.error(
      "Student error:",
      studentError
    );

    return;
  }


  students =
    studentData || [];


  studentSelect.innerHTML =
    '<option value="">Select Student</option>';


  if (!students.length) {

    studentSelect.innerHTML =
      '<option value="">No students found</option>';

    return;
  }


  students.forEach(student => {

    const option =
      document.createElement("option");

    option.value =
      student.id;

    option.textContent =
      `${student.full_name} — ${student.student_id}`;

    studentSelect.appendChild(option);

  });


  studentSelect.disabled = false;


  // ====================================================
  // INVOICES
  // ====================================================

  await loadInvoicesForInstitution(
    institutionId
  );

}


// ======================================================
// LOAD INVOICES
// ======================================================

async function loadInvoicesForInstitution(
  institutionId
) {

  const invoiceSelect =
    document.getElementById(
      "invoiceId"
    );


  const {
    data,
    error
  } = await db
    .from("invoices")
    .select("*")
    .eq(
      "institution_id",
      institutionId
    )
    .order("created_at", {
      ascending: false
    });


  if (error) {

    console.warn(
      "Invoice loading warning:",
      error.message
    );

    invoiceSelect.innerHTML =
      '<option value="">No Invoice</option>';

    return;
  }


  invoices =
    data || [];


  invoiceSelect.innerHTML =
    '<option value="">No Invoice</option>';


  invoices.forEach(invoice => {

    const option =
      document.createElement("option");

    option.value =
      invoice.id;

    const label =
      invoice.invoice_number ||
      invoice.reference ||
      invoice.id;

    option.textContent =
      label;

    invoiceSelect.appendChild(option);

  });

}


// ======================================================
// LOAD PAYMENTS
// ======================================================

async function loadPayments() {

  const tbody =
    document.getElementById(
      "paymentsTableBody"
    );


  tbody.innerHTML =
    `<tr>
      <td colspan="8" class="loading">
        Loading payments...
      </td>
    </tr>`;


  // Load payments WITHOUT nested students join.
  // Students are loaded separately.

  const {
    data,
    error
  } = await db
    .from("payments")
    .select("*")
    .order("created_at", {
      ascending: false
    });


  if (error) {

    tbody.innerHTML =
      `<tr>
        <td colspan="8" class="empty">
          Failed to load payments.
        </td>
      </tr>`;


    showMessage(
      "Payment loading error: " +
      error.message,
      "error"
    );


    console.error(
      "Payment error:",
      error
    );

    return;
  }


  payments =
    data || [];


  await loadAllStudentsForPayments();


  updateStats();

  renderPayments();

}


// ======================================================
// LOAD ALL STUDENTS FOR PAYMENT RECORDS
// ======================================================

async function loadAllStudentsForPayments() {

  const {
    data,
    error
  } = await db
    .from("students")
    .select(
      "id, student_id, full_name, institution_id"
    );


  if (error) {

    console.error(
      "Student map error:",
      error
    );

    return;
  }


  students =
    data || [];

}


// ======================================================
// SAVE PAYMENT
// ======================================================

async function savePayment(event) {

  event.preventDefault();


  const paymentId =
    document.getElementById(
      "paymentId"
    ).value;


  const institutionId =
    document.getElementById(
      "institutionId"
    ).value;


  const studentId =
    document.getElementById(
      "studentId"
    ).value;


  const invoiceId =
    document.getElementById(
      "invoiceId"
    ).value || null;


  const amount =
    Number(
      document.getElementById(
        "amount"
      ).value
    );


  const currency =
    document.getElementById(
      "currency"
    ).value
      .trim()
      .toUpperCase();


  const paymentMethod =
    document.getElementById(
      "paymentMethod"
    ).value || null;


  const provider =
    document.getElementById(
      "provider"
    ).value
      .trim() || null;


  const payerPhone =
    document.getElementById(
      "payerPhone"
    ).value
      .trim() || null;


  const providerTransactionId =
    document.getElementById(
      "providerTransactionId"
    ).value
      .trim() || null;


  const transactionReference =
    document.getElementById(
      "transactionReference"
    ).value
      .trim() || null;


  const status =
    document.getElementById(
      "status"
    ).value;


  const paidAtValue =
    document.getElementById(
      "paidAt"
    ).value;


  const paidAt =
    paidAtValue
      ? new Date(
          paidAtValue
        ).toISOString()
      : null;


  // ====================================================
  // VALIDATION
  // ====================================================

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


  if (
    Number.isNaN(amount) ||
    amount < 0
  ) {

    showMessage(
      "Please enter a valid amount.",
      "error"
    );

    return;
  }


  // ====================================================
  // IMPORTANT:
  // status MUST match payment_status enum exactly.
  //
  // pending
  // successful
  // failed
  // cancelled
  // refunded
  // ====================================================

  const paymentData = {

    institution_id:
      institutionId,

    invoice_id:
      invoiceId,

    student_id:
      studentId,

    amount:
      amount,

    currency:
      currency,

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
      {}

  };


  let result;


  // ====================================================
  // UPDATE
  // ====================================================

  if (paymentId) {

    result =
      await db
        .from("payments")
        .update(paymentData)
        .eq(
          "id",
          paymentId
        );

  }

  // ====================================================
  // INSERT
  // ====================================================

  else {

    result =
      await db
        .from("payments")
        .insert(
          paymentData
        );

  }


  if (result.error) {

    console.error(
      "Save payment error:",
      result.error
    );


    showMessage(
      "Payment error: " +
      result.error.message,
      "error"
    );


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
    document.getElementById(
      "paymentsTableBody"
    );


  const search =
    document.getElementById(
      "searchInput"
    ).value
      .toLowerCase()
      .trim();


  const statusFilter =
    document.getElementById(
      "statusFilter"
    ).value;


  const filtered =
    payments.filter(payment => {

      const student =
        students.find(
          s => s.id === payment.student_id
        );


      const studentName =
        (
          student?.full_name || ""
        ).toLowerCase();


      const studentCode =
        (
          student?.student_id || ""
        ).toLowerCase();


      const provider =
        (
          payment.provider || ""
        ).toLowerCase();


      const reference =
        (
          payment.transaction_reference || ""
        ).toLowerCase();


      const transaction =
        (
          payment.provider_transaction_id || ""
        ).toLowerCase();


      const matchesSearch =
        !search ||
        studentName.includes(search) ||
        studentCode.includes(search) ||
        provider.includes(search) ||
        reference.includes(search) ||
        transaction.includes(search);


      const matchesStatus =
        !statusFilter ||
        payment.status === statusFilter;


      return (
        matchesSearch &&
        matchesStatus
      );

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
        students.find(
          s => s.id === payment.student_id
        );


      const studentName =
        student?.full_name ||
        "Unknown Student";


      const studentCode =
        student?.student_id ||
        "";


      const amount =
        Number(
          payment.amount || 0
        ).toFixed(2);


      const currency =
        payment.currency ||
        "USD";


      const method =
        formatText(
          payment.payment_method
        );


      const provider =
        payment.provider ||
        "—";


      const reference =
        payment.transaction_reference ||
        "—";


      const status =
        payment.status ||
        "pending";


      const paidAt =
        payment.paid_at
          ? formatDate(
              payment.paid_at
            )
          : "—";


      return `

        <tr>

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
            <span class="status ${status}">
              ${formatText(status)}
            </span>
          </td>


          <td>
            ${escapeHtml(paidAt)}
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
// STATISTICS
// ======================================================

function updateStats() {

  const successful =
    payments.filter(
      p =>
        p.status === "successful"
    );


  const pending =
    payments.filter(
      p =>
        p.status === "pending"
    );


  const totalAmount =
    successful.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );


  document.getElementById(
    "totalPayments"
  ).textContent =
    payments.length;


  document.getElementById(
    "successfulPayments"
  ).textContent =
    successful.length;


  document.getElementById(
    "pendingPayments"
  ).textContent =
    pending.length;


  document.getElementById(
    "totalAmount"
  ).textContent =
    "$" +
    totalAmount.toFixed(2);

}


// ======================================================
// EDIT
// ======================================================

async function editPayment(id) {

  const payment =
    payments.find(
      p => p.id === id
    );


  if (!payment) {
    return;
  }


  document.getElementById(
    "paymentId"
  ).value =
    payment.id;


  const institutionSelect =
    document.getElementById(
      "institutionId"
    );


  institutionSelect.value =
    payment.institution_id;


  await loadStudentsForEdit(
    payment.institution_id,
    payment.student_id,
    payment.invoice_id
  );


  document.getElementById(
    "amount"
  ).value =
    payment.amount;


  document.getElementById(
    "currency"
  ).value =
    payment.currency ||
    "USD";


  document.getElementById(
    "paymentMethod"
  ).value =
    payment.payment_method ||
    "";


  document.getElementById(
    "provider"
  ).value =
    payment.provider ||
    "";


  document.getElementById(
    "payerPhone"
  ).value =
    payment.payer_phone ||
    "";


  document.getElementById(
    "providerTransactionId"
  ).value =
    payment.provider_transaction_id ||
    "";


  document.getElementById(
    "transactionReference"
  ).value =
    payment.transaction_reference ||
    "";


  document.getElementById(
    "status"
  ).value =
    payment.status ||
    "pending";


  if (payment.paid_at) {

    const date =
      new Date(
        payment.paid_at
      );


    const local =
      new Date(
        date.getTime() -
        date.getTimezoneOffset() *
        60000
      )
      .toISOString()
      .slice(0,16);


    document.getElementById(
      "paidAt"
    ).value =
      local;

  } else {

    document.getElementById(
      "paidAt"
    ).value =
      "";

  }


  document.getElementById(
    "formTitle"
  ).textContent =
    "Edit Payment";


  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

}


// ======================================================
// LOAD STUDENTS FOR EDIT
// ======================================================

async function loadStudentsForEdit(
  institutionId,
  selectedStudentId,
  selectedInvoiceId
) {

  const studentSelect =
    document.getElementById(
      "studentId"
    );


  const invoiceSelect =
    document.getElementById(
      "invoiceId"
    );


  const {
    data: studentData,
    error: studentError
  } = await db
    .from("students")
    .select(
      "id, student_id, full_name, institution_id"
    )
    .eq(
      "institution_id",
      institutionId
    )
    .order("full_name");


  if (studentError) {

    showMessage(
      "Student loading error: " +
      studentError.message,
      "error"
    );

    return;
  }


  students =
    studentData || [];


  studentSelect.innerHTML =
    '<option value="">Select Student</option>';


  students.forEach(student => {

    const option =
      document.createElement("option");

    option.value =
      student.id;

    option.textContent =
      `${student.full_name} — ${student.student_id}`;

    studentSelect.appendChild(option);

  });


  studentSelect.disabled = false;


  studentSelect.value =
    selectedStudentId;


  // Invoices

  const {
    data: invoiceData,
    error: invoiceError
  } = await db
    .from("invoices")
    .select("*")
    .eq(
      "institution_id",
      institutionId
    )
    .order("created_at", {
      ascending:false
    });


  invoiceSelect.innerHTML =
    '<option value="">No Invoice</option>';


  if (!invoiceError) {

    invoices =
      invoiceData || [];


    invoices.forEach(invoice => {

      const option =
        document.createElement("option");

      option.value =
        invoice.id;

      option.textContent =
        invoice.invoice_number ||
        invoice.reference ||
        invoice.id;

      invoiceSelect.appendChild(
        option
      );

    });


    invoiceSelect.value =
      selectedInvoiceId || "";

  }

}


// ======================================================
// DELETE
// ======================================================

async function deletePayment(id) {

  const payment =
    payments.find(
      p => p.id === id
    );


  if (!payment) {
    return;
  }


  const student =
    students.find(
      s => s.id === payment.student_id
    );


  const name =
    student?.full_name ||
    "this student";


  const confirmed =
    confirm(
      `Delete payment for ${name}?\n\nThis action cannot be undone.`
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } = await db
    .from("payments")
    .delete()
    .eq(
      "id",
      id
    );


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
// RESET
// ======================================================

function resetForm() {

  document.getElementById(
    "paymentForm"
  ).reset();


  document.getElementById(
    "paymentId"
  ).value =
    "";


  document.getElementById(
    "currency"
  ).value =
    "USD";


  document.getElementById(
    "status"
  ).value =
    "pending";


  document.getElementById(
    "studentId"
  ).innerHTML =
    '<option value="">Select Institution First</option>';


  document.getElementById(
    "studentId"
  ).disabled =
    true;


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

function showMessage(
  message,
  type
) {

  const box =
    document.getElementById(
      "message"
    );


  box.textContent =
    message;


  box.className =
    "message " + type;


  setTimeout(() => {

    box.className =
      "message";

  },5000);

}


// ======================================================
// HELPERS
// ======================================================

function formatText(value) {

  if (!value) {
    return "—";
  }


  return String(value)
    .replaceAll("_"," ")
    .replace(/\b\w/g,
      char =>
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

  return String(
    value ?? ""
  )
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;")
  .replaceAll('"',"&quot;")
  .replaceAll("'","&#039;");

}


// ======================================================
// BACK TO DASHBOARD
// ======================================================

function goBack() {

  window.location.href =
    "super-admin.html";

}
