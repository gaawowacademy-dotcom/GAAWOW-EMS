(() => {
  "use strict";

  /*
   * GAAWOW ACADEMY
   * Authentication Letter
   *
   * This file is intentionally DOM-based so it matches
   * authentication-letter.html exactly.
   *
   * Security:
   * - Uses Supabase publishable/anon key only.
   * - Requires an authenticated EMS user.
   * - Never exposes a service-role key.
   * - Uses textContent for database values.
   * - Verification URL is fixed to the official EMS route.
   * - Only a certificate record selected by ?regen=... is loaded.
 * - Only certificate_type=authentication_letter is rendered.
 * - Student/course data is resolved from the linked database record first.
 * - Supabase RLS remains the authoritative database security layer.
   */

  const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const EMS_BASE =
    "https://gaawowacademy-dotcom.github.io/GAAWOW-EMS/";

  const VERIFY_PAGE =
    EMS_BASE + "verify-auth.html";

  const AUTHENTICATION_LETTER_TYPE =
    "authentication_letter";

  const $ = (id) => document.getElementById(id);

  let db = null;
  let currentUser = null;
  let currentRecord = null;

  function setText(id, value) {
    const el = $(id);
    if (!el) return;

    el.textContent =
      value === null ||
      value === undefined ||
      String(value).trim() === ""
        ? "—"
        : String(value);
  }

  function message(text, type = "info") {
    const el = $("systemMessage");
    if (!el) return;

    el.textContent = text;
    el.className = "system-message show " + type;
  }

  function clearMessage() {
    const el = $("systemMessage");
    if (!el) return;

    el.textContent = "";
    el.className = "system-message no-print";
  }

  function formatDate(value) {
    if (!value) return "—";

    const raw = String(value);
    const date = new Date(
      raw.length === 10 ? raw + "T00:00:00" : raw
    );

    if (Number.isNaN(date.getTime())) {
      return raw;
    }

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function getRecordId() {
    const params = new URLSearchParams(
      window.location.search
    );

    const id = (params.get("regen") || "").trim();

    /*
     * Accept UUIDs and other safe database IDs, but reject
     * control characters, HTML, slashes and excessively long input.
     */
    if (!id) return "";

    if (
      id.length > 120 ||
      !/^[A-Za-z0-9_-]+$/.test(id)
    ) {
      return "";
    }

    return id;
  }

  function setStatus(status) {
    const el = $("status");
    if (!el) return;

    const value =
      String(status || "VALID")
        .trim()
        .toUpperCase();

    el.textContent = value;
    el.className = "";

    if (value === "PENDING") {
      el.classList.add("status-pending");
    } else if (
      value === "EXPIRED" ||
      value === "REVOKED"
    ) {
      el.classList.add("status-" + value.toLowerCase());
    } else if (value === "ERROR") {
      el.classList.add("status-error");
    }
  }

 function buildVerifyUrl(code) {
    if (!code) return "";

    return VERIFY_PAGE + "?code=" + encodeURIComponent(String(code));
}

  function renderQR(url) {
    const box = $("qrcode");
    if (!box) return;

    box.innerHTML = "";

    if (!url) {
      box.textContent = "QR";
      return;
    }

    if (typeof window.QRCode === "undefined") {
      box.textContent = "QR unavailable";
      return;
    }

    new window.QRCode(box, {
      text: url,
      width: 110,
      height: 110,
      colorDark: "#0B1E63",
      colorLight: "#FFFFFF",
      correctLevel:
        window.QRCode.CorrectLevel.M
    });
  }

  async function createClient() {
    if (!window.supabase) {
      throw new Error(
        "Supabase library lama soo dejin."
      );
    }

    db = window.supabase.createClient(
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

    const { data, error } =
      await db.auth.getUser();

    if (error) {
      throw new Error(
        "Authentication error: " +
        error.message
      );
    }

    if (!data || !data.user) {
      throw new Error(
        "EMS login ayaa loo baahan yahay."
      );
    }

    currentUser = data.user;
  }

  async function loadCertificate(recordId) {
    const { data, error } =
      await db
        .from("certificates")
        .select("*")
        .eq("id", recordId)
        .maybeSingle();

    if (error) {
      throw new Error(
        "Certificate database error: " +
        error.message
      );
    }

    if (!data) {
      throw new Error(
        "Authentication Letter record lama helin."
      );
    }

    return data;
  }

  async function loadStudent(studentReference) {
    if (!studentReference) {
      return null;
    }

    /*
     * EMS normally stores the selected student's primary id
     * in certificates.student_id. The fallback supports installations
     * where student_id itself is the public Student ID.
     */

    const byId = await db
      .from("students")
      .select("*")
      .eq("id", studentReference)
      .maybeSingle();

    if (!byId.error && byId.data) {
      return byId.data;
    }

    const byStudentId = await db
      .from("students")
      .select("*")
      .eq("student_id", studentReference)
      .maybeSingle();

    if (!byStudentId.error && byStudentId.data) {
      return byStudentId.data;
    }

    return null;
  }

  async function loadCourse(courseReference) {
    if (!courseReference) {
      return null;
    }

    const byId = await db
      .from("courses")
      .select("*")
      .eq("id", courseReference)
      .maybeSingle();

    if (!byId.error && byId.data) {
      return byId.data;
    }

    const byCourseId = await db
      .from("courses")
      .select("*")
      .eq("course_id", courseReference)
      .maybeSingle();

    if (!byCourseId.error && byCourseId.data) {
      return byCourseId.data;
    }

    return null;
  }

  function studentName(student, certificate) {
    return (
      student?.full_name ||
      student?.student_name ||
      certificate?.student_name_snapshot ||
      certificate?.student_name ||
      "—"
    );
  }

  function studentPublicId(student, certificate) {
    return (
      student?.student_id ||
      certificate?.student_id ||
      "—"
    );
  }

  function admissionDate(student, certificate) {
    return (
      student?.admission_date ||
      certificate?.admission_date ||
      certificate?.date_started ||
      ""
    );
  }

  function courseName(course, certificate) {
    return (
      certificate?.course_name_snapshot ||
      certificate?.course_name ||
      course?.name ||
      course?.course_name ||
      course?.title ||
      "—"
    );
  }

  function courseId(course, certificate) {
    return (
      certificate?.course_id_public ||
      course?.course_id ||
      certificate?.course_id ||
      "—"
    );
  }

  function completionDate(certificate) {
    return (
      certificate?.date_completed ||
      certificate?.completion_date ||
      certificate?.issue_date ||
      ""
    );
  }

  function documentId(certificate) {
    return (
      certificate?.certificate_no ||
      certificate?.certificate_id ||
      certificate?.id ||
      "—"
    );
  }

  function verificationCode(certificate) {
    return (
      certificate?.verify_code ||
      certificate?.certificate_id ||
      certificate?.certificate_no ||
      ""
    );
  }

  function renderLetter(certificate, student, course) {
    currentRecord = certificate;

    const name = studentName(
      student,
      certificate
    );

    const publicStudentId =
      studentPublicId(
        student,
        certificate
      );

    const verifyCode =
      verificationCode(certificate);

    const verifyUrl =
  buildVerifyUrl(verifyCode);

    setStatus(
      certificate.status || "valid"
    );

    setText(
      "documentId",
      documentId(certificate)
    );

    setText(
      "issueDate",
      formatDate(certificate.issue_date)
    );

    setText(
      "studentName",
      name
    );

    setText(
      "studentId",
      publicStudentId
    );

    setText(
      "admissionDate",
      formatDate(
        admissionDate(
          student,
          certificate
        )
      )
    );

    setText(
      "course",
      courseName(course, certificate)
    );

    setText(
      "courseId",
      courseId(course, certificate)
    );

    setText(
      "completionDate",
      formatDate(
        completionDate(certificate)
      )
    );

    setText(
      "authenticatedOn",
      formatDate(
        certificate.issue_date
      )
    );

    setText(
      "verifyUrl",
      verifyUrl
    );

    renderQR(verifyUrl);

    document.title =
      "Authentication Letter - " +
      name;

    clearMessage();
  }

  function showError(error) {
    console.error(
      "GAAWOW Authentication Letter:",
      error
    );

    setStatus("ERROR");
    setText(
      "documentId",
      error?.message ||
        "Unable to load record."
    );

    setText("issueDate", "—");
    setText("studentName", "—");
    setText("studentId", "—");
    setText("admissionDate", "—");
    setText("course", "—");
    setText("courseId", "—");
    setText("completionDate", "—");
    setText("authenticatedOn", "—");
    setText("verifyUrl", "—");

    const qr = $("qrcode");
    if (qr) {
      qr.innerHTML = "";
      qr.textContent = "—";
    }

    message(
      error?.message ||
        "Authentication Letter lama furin.",
      "error"
    );
  }

  async function load() {
    try {
      clearMessage();

      const recordId =
        getRecordId();

      if (!recordId) {
        throw new Error(
          "Record ID lama helin. Ka fur Authentication Letter gudaha Certificates."
        );
      }

      await createClient();

      const certificate =
        await loadCertificate(recordId);

      /*
       * Only authentication letters are allowed on this page.
       * This prevents opening a normal certificate/diploma as
       * an Authentication Letter.
       */
      const type =
        String(
          certificate.certificate_type || ""
        ).toLowerCase();

      if (
        type &&
        type !== AUTHENTICATION_LETTER_TYPE
      ) {
        throw new Error(
          "Record-kan ma aha Authentication Letter."
        );
      }

      const [student, course] =
        await Promise.all([
          loadStudent(
            certificate.student_id
          ),
          loadCourse(
            certificate.course_id
          )
        ]);

      renderLetter(
        certificate,
        student,
        course
      );

    } catch (error) {
      showError(error);
    }
  }

  function printLetter() {
    if (!currentRecord) {
      message(
        "Record-ka lama load-gareyn. Print lama bilaabi karo.",
        "error"
      );
      return;
    }

    window.print();
  }

  function backToCertificates() {
    window.location.href =
      "certificates.html";
  }

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      $("printBtn")?.addEventListener(
        "click",
        printLetter
      );

      $("refreshBtn")?.addEventListener(
        "click",
        load
      );

      $("backBtn")?.addEventListener(
        "click",
        backToCertificates
      );

      load();
    }
  );
})();
