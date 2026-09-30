(() => {
  "use strict";

  /* =========================================================
     GAAWOW ACADEMY
     AUTHENTICATION LETTER
     Stable loader: reads the selected record directly
     from public.certificates using the Supabase REST API.
     ========================================================= */

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const EMS_BASE =
    "https://gaawowacademy-dotcom.github.io/GAAWOW-EMS/";

  const VERIFY_PAGE =
    EMS_BASE + "verify-auth.html";

  const $ = id => document.getElementById(id);

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

  function setStatus(value) {
    const el = $("status");
    if (!el) return;

    const s = String(value || "VALID").toUpperCase();

    el.textContent = s;
    el.className = "";

    if (s === "PENDING") {
      el.classList.add("status-pending");
    } else if (s === "EXPIRED" || s === "REVOKED") {
      el.classList.add("status-" + s.toLowerCase());
    } else if (s === "ERROR") {
      el.classList.add("status-error");
    }
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
    const d = new Date(
      raw.length === 10
        ? raw + "T00:00:00"
        : raw
    );

    if (Number.isNaN(d.getTime())) {
      return raw;
    }

    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function getRecordId() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const id =
      (params.get("regen") || "").trim();

    if (!id) return "";

    if (
      id.length > 120 ||
      !/^[A-Za-z0-9_-]+$/.test(id)
    ) {
      return "";
    }

    return id;
  }

  function buildVerifyUrl(code, recordId) {
    if (!code) return "";

    const params = new URLSearchParams();

    params.set("code", String(code));

    if (recordId) {
      params.set("id", String(recordId));
    }

    return (
      VERIFY_PAGE +
      "?" +
      params.toString()
    );
  }

  function renderQR(url) {
    const box = $("qrcode");

    if (!box) return;

    box.innerHTML = "";

    if (!url) {
      box.textContent = "QR";
      return;
    }

    if (
      typeof window.QRCode ===
      "undefined"
    ) {
      box.textContent =
        "QR unavailable";
      return;
    }

    new window.QRCode(box, {
      text: url,
      width: 130,
      height: 130,
      colorDark: "#0B1E63",
      colorLight: "#FFFFFF",
      correctLevel:
        window.QRCode.CorrectLevel.M
    });
  }

  async function fetchJSON(url) {
    const controller =
      new AbortController();

    const timer =
      setTimeout(() => {
        controller.abort();
      }, 12000);

    try {
      const response =
        await fetch(url, {
          method: "GET",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization":
              "Bearer " + SUPABASE_KEY,
            "Accept":
              "application/json"
          },
          cache: "no-store",
          signal: controller.signal
        });

      const text =
        await response.text();

      let data = null;

      try {
        data = JSON.parse(text);
      } catch (_) {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          "HTTP " +
          response.status +
          ": " +
          (
            data?.message ||
            data?.hint ||
            data?.error ||
            text ||
            "Supabase request failed."
          )
        );
      }

      return data;

    } catch (error) {

      if (
        error.name ===
        "AbortError"
      ) {
        throw new Error(
          "Supabase timeout after 12 seconds."
        );
      }

      throw error;

    } finally {
      clearTimeout(timer);
    }
  }

  async function loadCertificate(id) {
    const select =
      "id,student_id,certificate_no,certificate_id,verify_code,issue_date,expiry_date,status,student_name_snapshot,certificate_type,course_id,course_name,course_name_snapshot,admission_date,date_started,date_completed,completion_date";

    const url =
      SUPABASE_URL +
      "/rest/v1/certificates" +
      "?select=" +
      encodeURIComponent(select) +
      "&id=eq." +
      encodeURIComponent(id) +
      "&limit=1";

    const rows =
      await fetchJSON(url);

    if (
      !Array.isArray(rows) ||
      !rows.length
    ) {
      throw new Error(
        "Authentication Letter record lama helin."
      );
    }

    const record = rows[0];

    const type =
      String(
        record.certificate_type ||
        ""
      ).toLowerCase();

    if (
      type &&
      type !==
        "authentication_letter"
    ) {
      throw new Error(
        "Record-kan ma aha Authentication Letter."
      );
    }

    return record;
  }

  async function loadStudent(studentReference) {
    if (!studentReference)
      return null;

    try {
      const select =
        "id,student_id,full_name,admission_date";

      let url =
        SUPABASE_URL +
        "/rest/v1/students" +
        "?select=" +
        encodeURIComponent(select) +
        "&id=eq." +
        encodeURIComponent(
          studentReference
        ) +
        "&limit=1";

      let rows =
        await fetchJSON(url);

      if (
        Array.isArray(rows) &&
        rows.length
      ) {
        return rows[0];
      }

      url =
        SUPABASE_URL +
        "/rest/v1/students" +
        "?select=" +
        encodeURIComponent(select) +
        "&student_id=eq." +
        encodeURIComponent(
          studentReference
        ) +
        "&limit=1";

      rows =
        await fetchJSON(url);

      return Array.isArray(rows) &&
        rows.length
        ? rows[0]
        : null;

    } catch (_) {
      /*
       * Student RLS may block public reads.
       * The certificate snapshot is still enough
       * to render the Authentication Letter.
       */
      return null;
    }
  }

  async function loadCourse(courseReference) {
    if (!courseReference)
      return null;

    try {
      const select =
        "id,course_id,name,course_name,title";

      let url =
        SUPABASE_URL +
        "/rest/v1/courses" +
        "?select=" +
        encodeURIComponent(select) +
        "&id=eq." +
        encodeURIComponent(
          courseReference
        ) +
        "&limit=1";

      let rows =
        await fetchJSON(url);

      if (
        Array.isArray(rows) &&
        rows.length
      ) {
        return rows[0];
      }

      url =
        SUPABASE_URL +
        "/rest/v1/courses" +
        "?select=" +
        encodeURIComponent(select) +
        "&course_id=eq." +
        encodeURIComponent(
          courseReference
        ) +
        "&limit=1";

      rows =
        await fetchJSON(url);

      return Array.isArray(rows) &&
        rows.length
        ? rows[0]
        : null;

    } catch (_) {
      return null;
    }
  }

  function getStudentName(
    student,
    record
  ) {
    return (
      student?.full_name ||
      record?.student_name_snapshot ||
      record?.student_name ||
      "—"
    );
  }

  function getStudentId(
    student,
    record
  ) {
    return (
      student?.student_id ||
      record?.student_id ||
      "—"
    );
  }

  function getAdmissionDate(
    student,
    record
  ) {
    return (
      student?.admission_date ||
      record?.admission_date ||
      record?.date_started ||
      ""
    );
  }

  function getCourseName(
    course,
    record
  ) {
    return (
      record?.course_name_snapshot ||
      record?.course_name ||
      course?.name ||
      course?.course_name ||
      course?.title ||
      "—"
    );
  }

  function getCourseId(
    course,
    record
  ) {
    return (
      record?.course_id_public ||
      course?.course_id ||
      record?.course_id ||
      "—"
    );
  }

  function getCompletionDate(
    record
  ) {
    return (
      record?.date_completed ||
      record?.completion_date ||
      record?.issue_date ||
      ""
    );
  }

  function getDocumentId(
    record
  ) {
    return (
      record?.certificate_no ||
      record?.certificate_id ||
      record?.id ||
      "—"
    );
  }

  function getVerifyCode(
    record
  ) {
    return (
      record?.verify_code ||
      record?.certificate_id ||
      record?.certificate_no ||
      ""
    );
  }

  function renderLetter(
    record,
    student,
    course
  ) {
    currentRecord = record;

    const name =
      getStudentName(
        student,
        record
      );

    const studentId =
      getStudentId(
        student,
        record
      );

    const admissionDate =
      getAdmissionDate(
        student,
        record
      );

    const courseName =
      getCourseName(
        course,
        record
      );

    const courseId =
      getCourseId(
        course,
        record
      );

    const completionDate =
      getCompletionDate(record);

    const documentId =
      getDocumentId(record);

    const verifyCode =
      getVerifyCode(record);

    const verifyUrl =
      buildVerifyUrl(
        verifyCode,
        record.id
      );

    setStatus(
      record.status ||
      "valid"
    );

    setText(
      "documentId",
      documentId
    );

    setText(
      "issueDate",
      formatDate(
        record.issue_date
      )
    );

    setText(
      "studentName",
      name
    );

    setText(
      "studentId",
      studentId
    );

    setText(
      "admissionDate",
      formatDate(
        admissionDate
      )
    );

    setText(
      "course",
      courseName
    );

    setText(
      "courseId",
      courseId
    );

    setText(
      "completionDate",
      formatDate(
        completionDate
      )
    );

    setText(
      "authenticatedOn",
      formatDate(
        record.issue_date
      )
    );

    setText(
      "verifyUrl",
      verifyUrl
    );

    renderQR(
      verifyUrl
    );

    document.title =
      "Authentication Letter - " +
      name;

    clearMessage();
  }

  function showError(error) {
    console.error(
      "GAAWOW AUTH LETTER ERROR:",
      error
    );

    setStatus("ERROR");

    setText(
      "documentId",
      error?.message ||
      "Unable to load record."
    );

    [
      "issueDate",
      "studentName",
      "studentId",
      "admissionDate",
      "course",
      "courseId",
      "completionDate",
      "authenticatedOn",
      "verifyUrl"
    ].forEach(id => {
      setText(id, "—");
    });

    const qr =
      $("qrcode");

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

      const id =
        getRecordId();

      if (!id) {
        throw new Error(
          "Record ID lama helin. Ka fur Authentication Letter gudaha Certificates."
        );
      }

      /*
       * IMPORTANT:
       * Do not wait for Supabase auth.getUser().
       * The selected certificate record is loaded directly.
       */
      const record =
        await loadCertificate(id);

      /*
       * Student/course are optional enrichments.
       * If their RLS blocks access, the certificate
       * snapshot still renders.
       */
      const results =
        await Promise.allSettled([
          loadStudent(
            record.student_id
          ),
          loadCourse(
            record.course_id
          )
        ]);

      const student =
        results[0].status === "fulfilled"
          ? results[0].value
          : null;

      const course =
        results[1].status === "fulfilled"
          ? results[1].value
          : null;

      renderLetter(
        record,
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
        "Record-ka lama load-gareyn.",
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
      $("printBtn")
        ?.addEventListener(
          "click",
          printLetter
        );

      $("refreshBtn")
        ?.addEventListener(
          "click",
          load
        );

      $("backBtn")
        ?.addEventListener(
          "click",
          backToCertificates
        );

      load();
    }
  );

})();
