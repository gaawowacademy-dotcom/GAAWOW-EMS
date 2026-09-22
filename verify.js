/* ============================================================
   GAAWOW EMS
   PUBLIC CERTIFICATE VERIFICATION  V1.0
   ------------------------------------------------------------
   No login required. Anyone who scans a certificate's QR code,
   or types its verify code, lands here and sees whether the
   certificate is genuine.

   Reads table "certificates" by verify_code. If RLS blocks
   anonymous reads, a clear message explains that to the visitor
   (see the note at the bottom of this file for the SQL needed).
   ============================================================ */

(() => {
  "use strict";

  const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const $ = (id) => document.getElementById(id);

  const STATUS_INFO = {
    valid:      { label: "VALID",      icon: "✔", cls: "ok",   heading: "Authentic Certificate" },
    graduated:  { label: "GRADUATED",  icon: "✔", cls: "ok",   heading: "Authentic Certificate" },
    pending:    { label: "PENDING",    icon: "⏳", cls: "warn", heading: "Certificate Pending" },
    expired:    { label: "EXPIRED",    icon: "⚠", cls: "warn", heading: "Certificate Expired" },
    revoked:    { label: "REVOKED",    icon: "✖", cls: "bad",  heading: "Certificate Revoked" }
  };

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "—";
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return escapeHtml(value);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function codeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("code") || "").trim();
  }

  function setResultView(html) {
    $("result").innerHTML = html;
    $("result").style.display = "block";
  }

  function showLoading() {
    setResultView(`
      <div class="panel neutral">
        <div class="spinner"></div>
        <p>Checking certificate...</p>
      </div>
    `);
  }

  function showNotFound(code) {
    setResultView(`
      <div class="panel bad">
        <div class="icon">✖</div>
        <h2>Certificate Not Found</h2>
        <p>No certificate matches the code
          <span class="code">${escapeHtml(code || "(empty)")}</span>.
          Check the QR code or the code printed on the certificate and try again.
        </p>
      </div>
    `);
  }

  function showBlocked(errorMessage) {
    setResultView(`
      <div class="panel bad">
        <div class="icon">⚠</div>
        <h2>Verification Unavailable</h2>
        <p>The certificate database could not be reached right now.</p>
        <p class="tech">${escapeHtml(errorMessage)}</p>
      </div>
    `);
  }

  function showCertificate(cert) {
    const statusKey = String(cert.status || "valid").toLowerCase();
    const info = STATUS_INFO[statusKey] || STATUS_INFO.valid;

    // A certificate can carry status "valid" but still have passed its
    // printed expiry date; flag that clearly even though the stored
    // status has not been changed yet.
    const today = new Date().toISOString().slice(0, 10);
    const pastExpiry = cert.expiry_date && cert.expiry_date < today && statusKey !== "revoked";
    const effective = pastExpiry ? STATUS_INFO.expired : info;

    setResultView(`
      <div class="panel ${effective.cls}">
        <div class="icon">${effective.icon}</div>
        <h2>${effective.heading}</h2>
        <div class="badge ${effective.cls}">${escapeHtml(pastExpiry ? "EXPIRED" : effective.label)}</div>

        <div class="cert-grid">
          <div class="cert-item"><strong>Student Name</strong><span>${escapeHtml(cert.student_name_snapshot || "—")}</span></div>
          <div class="cert-item"><strong>Course / Program</strong><span>${escapeHtml(cert.course_name_snapshot || "—")}</span></div>
          <div class="cert-item"><strong>Certificate No</strong><span>${escapeHtml(cert.certificate_no || "—")}</span></div>
          <div class="cert-item"><strong>Certificate Type</strong><span>${escapeHtml(cert.certificate_type || "—")}</span></div>
          <div class="cert-item"><strong>Issue Date</strong><span>${formatDate(cert.issue_date)}</span></div>
          <div class="cert-item"><strong>Expiry Date</strong><span>${formatDate(cert.expiry_date)}</span></div>
        </div>

        <p class="footnote">
          Issued by GAAWOW Academy • Verify code
          <span class="code">${escapeHtml(cert.verify_code || "")}</span>
        </p>
      </div>
    `);
  }

  async function verify(code) {
    if (!code) {
      setResultView(`
        <div class="panel neutral">
          <div class="icon">🔍</div>
          <h2>Enter a Verify Code</h2>
          <p>Scan the QR code on a GAAWOW certificate, or type its verify code below.</p>
        </div>
      `);
      return;
    }

    showLoading();

    try {
      const { data, error } = await supabaseClient
        .from("certificates")
        .select(`
          certificate_no,
          certificate_id,
          verify_code,
          student_name_snapshot,
          course_name_snapshot,
          certificate_type,
          issue_date,
          expiry_date,
          status
        `)
        .eq("verify_code", code)
        .maybeSingle();

      if (error) {
        // A permission error here almost always means anonymous visitors
        // are not allowed to read the certificates table yet.
        throw error;
      }

      if (!data) {
        showNotFound(code);
        return;
      }

      showCertificate(data);
    } catch (error) {
      console.error("Verify error:", error);
      showBlocked(error.message || String(error));
    }
  }

  function setupForm() {
    const form = $("verifyForm");
    const input = $("codeInput");
    if (!form || !input) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const code = input.value.trim();
      const url = new URL(window.location.href);
      if (code) url.searchParams.set("code", code);
      else url.searchParams.delete("code");
      window.history.replaceState({}, "", url);
      verify(code);
    });
  }

  function init() {
    const code = codeFromUrl();
    if ($("codeInput")) $("codeInput").value = code;
    setupForm();
    verify(code);
  }

  document.addEventListener("DOMContentLoaded", init);
})();

/* ------------------------------------------------------------
   REQUIRED DATABASE SETTING (run once in Supabase SQL Editor)
   ------------------------------------------------------------
   This page is public: no login. For it to work, anonymous
   visitors need read access to "certificates" (Row Level
   Security is on by default in Supabase). Run:

   create policy "Public can verify certificates"
   on certificates for select
   to anon
   using (true);

   If you would rather not expose every column publicly, create
   a view with just the fields above and point this script at
   that view instead of "certificates".
   ------------------------------------------------------------ */
