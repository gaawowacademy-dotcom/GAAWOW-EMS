
"use strict";

/* =========================================================
   GAAWOW EMS - FINANCE MANAGER DASHBOARD
   Secure institution-based access
   Payment verification through review-payment Edge Function
   ========================================================= */

(() => {
  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const REVIEW_FUNCTION = "review-payment";
  const PAGE_SIZE = 100;

  if (!window.supabase) {
    showStartupError(
      "Supabase library lama helin. Hubi internet-ka iyo Supabase script."
    );
    return;
  }

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  let currentUser = null;
  let currentProfile = null;
  let currentInstitution = null;
  let reviewInProgress = new Set();

  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------
  // GENERAL HELPERS
  // ---------------------------------------------------------

  function showStartupError(message) {
    const loading = $("loadingScreen");
    const error = $("accessError");

    if (loading) loading.hidden = true;

    if (error) {
      error.hidden = false;
      error.textContent = message;
    }
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value ?? "";
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function formatMoney(amount, currency = "USD") {
    const number = Number(amount || 0);

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 2
      }).format(number);
    } catch {
      return `${number.toFixed(2)} ${currency || "USD"}`;
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function shortReference(value) {
    if (!value) return "—";
    return String(value).slice(0, 8).toUpperCase();
  }

  function statusClass(status) {
    const safeStatus = String(status || "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    return `status-${safeStatus}`;
  }

  function showMessage(id, message, type = "info") {
    const element = $(id);
    if (!element) return;

    element.textContent = message;
    element.classList.remove("message-info", "message-error");

    element.classList.add(
      type === "error" ? "message-error" : "message-info"
    );

    element.hidden = false;
    element.style.display = "block";
  }

  function hideMessage(id) {
    const element = $(id);

    if (element) {
      element.hidden = true;
      element.style.display = "none";
    }
  }

  function logError(section, error) {
    console.error(
      `[GAAWOW Finance] ${section}:`,
      error?.message || error
    );
  }

  function showDashboard() {
    const loading = $("loadingScreen");
    const app = $("dashboardApp");
    const error = $("accessError");

    if (loading) loading.hidden = true;
    if (error) error.hidden = true;
    if (app) app.hidden = false;
  }

  // ---------------------------------------------------------
  // AUTHENTICATION AND PROFILE VERIFICATION
  // ---------------------------------------------------------

  async function initializeDashboard() {
    try {
      const {
        data: { session },
        error: sessionError
      } = await db.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session) {
        window.location.replace("index.html");
        return;
      }

      currentUser = session.user;

      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("id, full_name, role, is_active, institution_id")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        throw new Error("Account profile lama helin.");
      }

      if (
        profile.role !== "finance_manager" ||
        profile.is_active !== true ||
        !profile.institution_id
      ) {
        await db.auth.signOut();

        showStartupError(
          "Access denied. Account-kan ma aha Finance Manager firfircoon oo machad loo qoondeeyey."
        );
        return;
      }

      currentProfile = profile;

      await loadInstitution();

      displayProfile();
      setupNavigation();
      setupLogout();
      setupPaymentReview();

      showDashboard();

      await loadDashboardData();

    } catch (error) {
      logError("Account verification", error);

      showStartupError(
        "Dashboard lama furi karin: " +
        (error.message || "Hubi internet-ka iyo account-ka.")
      );
    }
  }

  // ---------------------------------------------------------
  // INSTITUTION
  // ---------------------------------------------------------

  async function loadInstitution() {
    const { data, error } = await db
      .from("institutions")
      .select("id, name, code")
      .eq("id", currentProfile.institution_id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error("Machadka Finance Manager-ka lama helin.");
    }

    currentInstitution = data;
  }

  // ---------------------------------------------------------
  // PROFILE DISPLAY
  // ---------------------------------------------------------

  function displayProfile() {
    const name = currentProfile.full_name || "Finance Manager";
    const institution = currentInstitution?.name || "—";

    setText("managerName", name);
    setText("welcomeName", name);
    setText("institutionName", "Institution: " + institution);

    setText("profileName", name);
    setText("profileRole", "Finance Manager");
    setText("profileInstitution", institution);
    setText("profileStatus", "Active");
    setText("profileId", currentProfile.id);

    const avatar = $("managerAvatar");

    if (avatar) {
      const initials = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");

      avatar.textContent = initials || "FM";
    }
  }

  // ---------------------------------------------------------
  // DASHBOARD DATA
  // ---------------------------------------------------------

  async function loadDashboardData() {
    setText("totalInvoices", "...");
    setText("verifiedPayments", "...");
    setText("pendingPayments", "...");
    setText("graduationRequests", "--");

    await Promise.allSettled([
      loadInvoiceStatistics(),
      loadPaymentStatistics(),
      loadInvoiceRecords(),
      loadPaymentRecords()
    ]);

    setText("graduationRequests", "--");
  }

  async function loadInvoiceStatistics() {
    try {
      const { count, error } = await db
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("institution_id", currentProfile.institution_id);

      if (error) throw error;

      setText("totalInvoices", count ?? 0);

    } catch (error) {
      logError("Invoice statistics", error);
      setText("totalInvoices", "—");
    }
  }

  async function loadPaymentStatistics() {
    try {
      const [successfulResult, pendingResult] =
        await Promise.all([
          db
            .from("payments")
            .select("id", { count: "exact", head: true })
            .eq("institution_id", currentProfile.institution_id)
            .eq("status", "successful"),

          db
            .from("payments")
            .select("id", { count: "exact", head: true })
            .eq("institution_id", currentProfile.institution_id)
            .eq("status", "pending")
        ]);

      if (successfulResult.error) throw successfulResult.error;
      if (pendingResult.error) throw pendingResult.error;

      setText("verifiedPayments", successfulResult.count ?? 0);
      setText("pendingPayments", pendingResult.count ?? 0);

    } catch (error) {
      logError("Payment statistics", error);
      setText("verifiedPayments", "—");
      setText("pendingPayments", "—");
    }
  }

  // ---------------------------------------------------------
  // TABLE RENDERER
  // ---------------------------------------------------------

  function renderTableBody(tbodyId, rows, columnCount) {
    const tbody = $(tbodyId);

    if (!tbody) {
      console.warn("Table body not found:", tbodyId);
      return;
    }

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${columnCount}" class="empty-state">
            No records found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.join("");
  }

  // ---------------------------------------------------------
  // INVOICE RECORDS
  // ---------------------------------------------------------

  async function loadInvoiceRecords() {
    showMessage("invoiceMessage", "Loading invoice records...");

    try {
      const { data, error } = await db
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
          created_at,
          currency
        `)
        .eq("institution_id", currentProfile.institution_id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const invoices = data || [];

      const rows = invoices.map((invoice) => {
        const amount = Number(invoice.amount || 0);
        const paid = Number(invoice.paid_amount || 0);
        const balance = Math.max(amount - paid, 0);
        const currency = invoice.currency || "USD";

        return `
          <tr>
            <td>${escapeHTML(
              invoice.invoice_number || shortReference(invoice.id)
            )}</td>
            <td title="${escapeHTML(invoice.student_id || "")}">
              ${escapeHTML(shortReference(invoice.student_id))}
            </td>
            <td>${escapeHTML(formatMoney(amount, currency))}</td>
            <td>${escapeHTML(formatMoney(paid, currency))}</td>
            <td>${escapeHTML(formatMoney(balance, currency))}</td>
            <td>
              <span class="status-badge ${statusClass(invoice.status)}">
                ${escapeHTML(invoice.status || "unknown")}
              </span>
            </td>
            <td>${escapeHTML(formatDate(invoice.due_date))}</td>
          </tr>
        `;
      });

      renderTableBody("invoiceTable", rows, 7);

      if (invoices.length === 0) {
        showMessage(
          "invoiceMessage",
          "No invoices found for this institution."
        );
      } else {
        hideMessage("invoiceMessage");
      }

    } catch (error) {
      logError("Invoice records", error);

      showMessage(
        "invoiceMessage",
        "Invoice records lama soo qaadi karin. Hubi database permissions ama RLS.",
        "error"
      );

      renderTableBody("invoiceTable", [], 7);
    }
  }

  // ---------------------------------------------------------
  // PAYMENT RECORDS
  // ---------------------------------------------------------

  async function loadPaymentRecords() {
    showMessage("paymentMessage", "Loading payment records...");

    try {
      const { data, error } = await db
        .from("payments")
        .select(`
          id,
          institution_id,
          invoice_id,
          student_id,
          amount,
          currency,
          payment_method,
          status,
          paid_at,
          created_at,
          payment_reference,
          receipt_number,
          transaction_reference
        `)
        .eq("institution_id", currentProfile.institution_id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const payments = data || [];

      const rows = payments.map((payment) => {
        const reference =
          payment.receipt_number ||
          payment.payment_reference ||
          payment.transaction_reference ||
          shortReference(payment.id);

        const paymentDate = payment.paid_at || payment.created_at;

        const actionCell = payment.status === "pending"
          ? `
            <button
              type="button"
              class="verify-payment-btn"
              data-review-payment="${escapeHTML(payment.id)}"
              data-payment-reference="${escapeHTML(payment.payment_reference || "")}"
              data-payment-amount="${escapeHTML(payment.amount)}"
              data-payment-currency="${escapeHTML(payment.currency || "USD")}"
              data-payment-method="${escapeHTML(payment.payment_method || "—")}"
            >
              <i class="fas fa-check-circle"></i>
              Verify Payment
            </button>
          `
          : payment.status === "successful"
            ? `
              <span class="receipt-label">
                <i class="fas fa-receipt"></i>
                ${escapeHTML(payment.receipt_number || "Verified")}
              </span>
            `
            : `<span class="action-muted">No action</span>`;

        return `
          <tr>
            <td>${escapeHTML(reference)}</td>
            <td title="${escapeHTML(payment.student_id || "")}">
              ${escapeHTML(shortReference(payment.student_id))}
            </td>
            <td>${escapeHTML(
              formatMoney(payment.amount, payment.currency || "USD")
            )}</td>
            <td>${escapeHTML(payment.payment_method || "—")}</td>
            <td>
              <span class="status-badge ${statusClass(payment.status)}">
                ${escapeHTML(payment.status || "unknown")}
              </span>
            </td>
            <td>${escapeHTML(formatDate(paymentDate))}</td>
            <td>${actionCell}</td>
          </tr>
        `;
      });

      renderTableBody("paymentTable", rows, 7);

      if (payments.length === 0) {
        showMessage(
          "paymentMessage",
          "No payment records found for this institution."
        );
      } else {
        hideMessage("paymentMessage");
      }

    } catch (error) {
      logError("Payment records", error);

      showMessage(
        "paymentMessage",
        "Payment records lama soo qaadi karin. Hubi database permissions ama RLS.",
        "error"
      );

      renderTableBody("paymentTable", [], 7);
    }
  }

  // ---------------------------------------------------------
  // SECURE PAYMENT REVIEW
  // Calls the deployed review-payment Edge Function.
  // Does not update payment status directly from browser.
  // ---------------------------------------------------------

  function setupPaymentReview() {
    const table = $("paymentTable");

    if (!table) {
      console.warn("paymentTable lama helin.");
      return;
    }

    table.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-review-payment]");

      if (!button) return;

      const paymentId = button.dataset.reviewPayment;
      const reference = button.dataset.paymentReference || paymentId;
      const amount = button.dataset.paymentAmount;
      const currency = button.dataset.paymentCurrency || "USD";
      const method = button.dataset.paymentMethod || "—";

      if (!paymentId || reviewInProgress.has(paymentId)) return;

      const confirmed = window.confirm(
        "MA HUBTAA IN LACAGTU SOO DHACDAY?\n\n" +
        "Payment Reference: " + reference + "\n" +
        "Amount: " + formatMoney(amount, currency) + "\n" +
        "Method: " + method + "\n\n" +
        "Haddii aad xaqiijisay lacagta, dooro OK si loo ansixiyo.\n" +
        "Ansixinta waxay soo saaraysaa receipt rasmi ah."
      );

      if (!confirmed) return;

      reviewInProgress.add(paymentId);
      button.disabled = true;
      button.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Verifying...';

      try {
        // Ensure the authenticated session still exists.
        const {
          data: { session },
          error: sessionError
        } = await db.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
          throw new Error("Session-kaagu wuu dhammaaday. Dib u gal.");
        }

        const { data, error } = await db.functions.invoke(
          REVIEW_FUNCTION,
          {
            body: {
              payment_id: paymentId,
              status: "successful",
              review_note: "Verified by Finance Manager after confirming receipt of funds."
            }
          }
        );

        if (error) {
          let detail = error.message || "Edge Function error";

          if (error.context && typeof error.context.json === "function") {
            try {
              const body = await error.context.json();
              detail = body.error || body.message || detail;
            } catch {
              // Keep the original error message.
            }
          }

          throw new Error(detail);
        }

        if (!data || data.success !== true) {
          throw new Error(
            data?.error ||
            data?.message ||
            "Payment review lama xaqiijin. Hubi Edge Function response."
          );
        }

        const receiptNumber =
          data.receipt_number ||
          data.payment?.receipt_number ||
          data.review?.receipt_number ||
          data.data?.receipt_number ||
          null;

        window.alert(
          "PAYMENT SI GUUL LEH AYAA LOO ANSIXIYAY.\n\n" +
          "Reference: " + reference + "\n" +
          "Receipt: " + (receiptNumber || "Ka hubi payment records") +
          "\n\nInvoice iyo receipt-ka hadda dib ayaa loo cusboonaysiinayaa."
        );

        await loadDashboardData();

      } catch (error) {
        logError("Payment verification", error);

        window.alert(
          "PAYMENT LAMA ANSIXIN.\n\n" +
          (error.message || "Khalad aan la aqoon ayaa dhacay.") +
          "\n\nFadlan hubi Edge Function logs ka hor intaadan mar kale isku dayin."
        );

        // Refresh from database to avoid showing stale status.
        await Promise.allSettled([
          loadPaymentStatistics(),
          loadPaymentRecords(),
          loadInvoiceRecords()
        ]);

      } finally {
        reviewInProgress.delete(paymentId);
      }
    });
  }

  // ---------------------------------------------------------
  // NAVIGATION
  // ---------------------------------------------------------

  function setupNavigation() {
    const pageTitles = {
      overview: "Finance Overview",
      invoices: "Student Invoices",
      payments: "Payments Verification",
      graduation: "Graduation Fee Clearance",
      reports: "Financial Reports",
      profile: "My Profile"
    };

    document.addEventListener("click", (event) => {
      const navItem = event.target.closest("[data-section]");

      if (!navItem) return;

      const sectionName = navItem.dataset.section;
      const targetSection = $("section-" + sectionName);

      if (!targetSection) return;

      document.querySelectorAll(".page-section").forEach((section) => {
        section.classList.remove("active");
      });

      targetSection.classList.add("active");

      document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.remove("active");
      });

      document.querySelectorAll(
        `.nav-link[data-section="${sectionName}"]`
      ).forEach((link) => {
        link.classList.add("active");
      });

      setText(
        "pageTitle",
        pageTitles[sectionName] || "Finance Dashboard"
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }

  // ---------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------

  function setupLogout() {
    const logoutButton = $("logoutBtn");

    if (!logoutButton) return;

    logoutButton.addEventListener("click", async () => {
      const confirmed = window.confirm(
        "Ma hubtaa inaad ka baxdo Finance Manager Dashboard?"
      );

      if (!confirmed) return;

      logoutButton.disabled = true;

      const { error } = await db.auth.signOut();

      if (error) {
        logoutButton.disabled = false;
        alert("Logout failed: " + error.message);
        return;
      }

      window.location.replace("index.html");
    });
  }

  // ---------------------------------------------------------
  // AUTH SESSION LISTENER
  // ---------------------------------------------------------

  db.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      window.location.replace("index.html");
    }
  });

  // ---------------------------------------------------------
  // START
  // ---------------------------------------------------------

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeDashboard
    );
  } else {
    initializeDashboard();
  }

})();
