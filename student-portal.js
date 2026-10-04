"use strict";

/* =========================================================
   GAAWOW ACADEMY EMS
   STUDENT PORTAL
   VERSION 20261004-1
   ========================================================= */


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


/* =========================================================
   DOM HELPER
   ========================================================= */

const $ = (id) =>
  document.getElementById(id);


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initPortal
);


/* =========================================================
   INITIALIZE PORTAL
   ========================================================= */

async function initPortal() {

  try {

    const {
      data: {
        session
      },
      error: sessionError
    } =
      await supabaseClient.auth.getSession();


    if (sessionError) {
      throw sessionError;
    }


    /* No login session */

    if (!session) {

      redirectToLogin();

      return;

    }


    const user =
      session.user;


    /* =====================================================
       GET STUDENT
       Uses auth_user_id
       ===================================================== */

    const {
      data: student,
      error: studentError
    } =
      await supabaseClient
        .from("students")
        .select(`
          id,
          institution_id,
          student_id,
          full_name,
          gender,
          date_of_birth,
          phone,
          email,
          address,
          photo_url,
          admission_date,
          status,
          account_enabled,
          auth_user_id
        `)
        .eq(
          "auth_user_id",
          user.id
        )
        .maybeSingle();


    if (studentError) {

      console.error(
        "Student query error:",
        studentError
      );

      throw new Error(
        "Student information could not be loaded."
      );

    }


    if (!student) {

      await supabaseClient.auth.signOut();

      throw new Error(
        "Student account is not linked to a student record."
      );

    }


    /* =====================================================
       VERIFY AUTH LINK
       ===================================================== */

    if (
      String(student.auth_user_id) !==
      String(user.id)
    ) {

      await supabaseClient.auth.signOut();

      throw new Error(
        "Student account verification failed."
      );

    }


    /* =====================================================
       ACCOUNT ENABLED
       ===================================================== */

    if (
      student.account_enabled === false
    ) {

      await supabaseClient.auth.signOut();

      throw new Error(
        "Student account-kan waa la xiray. Fadlan la xiriir maamulka."
      );

    }


    /* =====================================================
       STATUS
       ===================================================== */

    if (
      student.status &&
      String(student.status).toLowerCase() !==
        "active"
    ) {

      await supabaseClient.auth.signOut();

      throw new Error(
        "Student account-kan ma aha active."
      );

    }


    /* =====================================================
       RENDER STUDENT
       ===================================================== */

    renderStudent(
      student,
      user
    );


    /* =====================================================
       LOAD DASHBOARD
       ===================================================== */

    await Promise.allSettled([

      loadResults(student.id),

      loadCertificates(student.id),

      loadNotifications(student.id)

    ]);


    /* =====================================================
       SHOW PORTAL
       ===================================================== */

    $("portalLoading")
      .classList
      .add("hidden");


    $("portalApp")
      .classList
      .remove("hidden");


  }

  catch (error) {

    console.error(
      "Student Portal Error:",
      error
    );


    showFatalError(
      error.message ||
      "Unable to load Student Portal."
    );

  }

}


/* =========================================================
   RENDER STUDENT
   ========================================================= */

function renderStudent(
  student,
  user
) {

  const fullName =
    student.full_name ||
    "Student";


  $("studentNameTop").textContent =
    fullName;


  $("welcomeName").textContent =
    fullName;


  $("studentNumber").textContent =
    student.student_id ||
    "--";


  $("studentFullName").textContent =
    fullName;


  $("studentIdField").textContent =
    student.student_id ||
    "--";


  $("studentEmail").textContent =
    user.email ||
    student.email ||
    "--";


  $("studentPhone").textContent =
    student.phone ||
    "--";


  $("studentGender").textContent =
    student.gender ||
    "--";


  $("admissionDate").textContent =
    formatDate(
      student.admission_date
    );


  if (student.photo_url) {

    $("studentPhoto").src =
      student.photo_url;

  }

}


/* =========================================================
   RESULTS
   ========================================================= */

async function loadResults(
  studentId
) {

  const {
    data: results,
    error
  } =
    await supabaseClient
      .from("results")
      .select(`
        id,
        exam_id,
        subject_id,
        score,
        max_score,
        percentage,
        grade,
        remarks,
        is_published,
        created_at
      `)
      .eq(
        "student_id",
        studentId
      )
      .eq(
        "is_published",
        true
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Results error:",
      error
    );

    showResultsMessage(
      "Unable to load results."
    );

    return;

  }


  const rows =
    results || [];


  $("resultsCount").textContent =
    rows.length;


  if (!rows.length) {

    showResultsMessage(
      "No published academic results are available yet."
    );

    return;

  }


  const subjectIds = [
    ...new Set(
      rows
        .map(
          row => row.subject_id
        )
        .filter(Boolean)
    )
  ];


  const examIds = [
    ...new Set(
      rows
        .map(
          row => row.exam_id
        )
        .filter(Boolean)
    )
  ];


  let subjects = [];

  let exams = [];


  if (subjectIds.length) {

    const response =
      await supabaseClient
        .from("subjects")
        .select(
          "id, name, code"
        )
        .in(
          "id",
          subjectIds
        );


    if (!response.error) {

      subjects =
        response.data || [];

    }

  }


  if (examIds.length) {

    const response =
      await supabaseClient
        .from("exams")
        .select(
          "id, title, exam_type"
        )
        .in(
          "id",
          examIds
        );


    if (!response.error) {

      exams =
        response.data || [];

    }

  }


  const subjectMap =
    Object.fromEntries(
      subjects.map(
        item => [
          item.id,
          item
        ]
      )
    );


  const examMap =
    Object.fromEntries(
      exams.map(
        item => [
          item.id,
          item
        ]
      )
    );


  const body =
    $("resultsBody");


  body.innerHTML = "";


  rows.forEach(
    row => {

      const subject =
        subjectMap[
          row.subject_id
        ];


      const exam =
        examMap[
          row.exam_id
        ];


      const tr =
        document.createElement(
          "tr"
        );


      tr.innerHTML = `

        <td>
          ${escapeHtml(
            subject?.name ||
            "Subject"
          )}
        </td>

        <td>
          ${escapeHtml(
            exam?.title ||
            "Exam"
          )}
        </td>

        <td>
          ${escapeHtml(
            formatScore(
              row.score,
              row.max_score
            )
          )}
        </td>

        <td>
          ${escapeHtml(
            formatPercentage(
              row.percentage,
              row.score,
              row.max_score
            )
          )}
        </td>

        <td>
          <strong>
            ${escapeHtml(
              row.grade ||
              "--"
            )}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            row.remarks ||
            "--"
          )}
        </td>

      `;


      body.appendChild(
        tr
      );

    }
  );


  $("resultsMessage")
    .classList
    .add("hidden");


  $("resultsTable")
    .classList
    .remove("hidden");

}


/* =========================================================
   RESULTS MESSAGE
   ========================================================= */

function showResultsMessage(
  message
) {

  $("resultsMessage")
    .textContent =
    message;


  $("resultsMessage")
    .classList
    .remove("hidden");


  $("resultsTable")
    .classList
    .add("hidden");

}


/* =========================================================
   CERTIFICATES
   ========================================================= */

async function loadCertificates(
  studentId
) {

  const {
    data: certificates,
    error
  } =
    await supabaseClient
      .from("certificates")
      .select(`
        id,
        certificate_no,
        certificate_id,
        verify_code,
        certificate_type,
        issue_date,
        expiry_date,
        status,
        course_name_snapshot,
        certificate_url,
        pdf_url,
        verification_url,
        qr_url,
        student_photo_url
      `)
      .eq(
        "student_id",
        studentId
      )
      .order(
        "issue_date",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Certificates error:",
      error
    );


    $("certificatesMessage")
      .textContent =
      "Unable to load certificates.";

    return;

  }


  const rows =
    certificates || [];


  $("certificatesCount")
    .textContent =
    rows.length;


  const list =
    $("certificatesList");


  list.innerHTML = "";


  if (!rows.length) {

    $("certificatesMessage")
      .textContent =
      "No certificates are available yet.";

    return;

  }


  $("certificatesMessage")
    .classList
    .add("hidden");


  rows.forEach(
    cert => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "certificate-item";


      const type =
        cert.certificate_type ===
        "authentication_letter"
          ? "Authentication Letter"
          : "Certificate";


      const verifyUrl =
        cert.verification_url ||
        buildCertificateVerificationUrl(
          cert
        );


      item.innerHTML = `

        <div>

          <h3>
            ${escapeHtml(type)}
          </h3>

          <div class="certificate-meta">

            Certificate No:
            ${escapeHtml(
              cert.certificate_no ||
              "--"
            )}

            <br>

            Certificate ID:
            ${escapeHtml(
              cert.certificate_id ||
              "--"
            )}

            <br>

            Issue Date:
            ${escapeHtml(
              formatDate(
                cert.issue_date
              )
            )}

            <br>

            Status:
            ${escapeHtml(
              cert.status ||
              "--"
            )}

            ${
              cert.course_name_snapshot
                ? `
                  <br>
                  Course:
                  ${escapeHtml(
                    cert.course_name_snapshot
                  )}
                `
                : ""
            }

          </div>

        </div>


        <div class="certificate-actions">

          ${
            verifyUrl
              ? `
                <a
                  class="primary-btn"
                  href="${escapeAttribute(
                    verifyUrl
                  )}"
                  target="_blank"
                  rel="noopener"
                >
                  Verify
                </a>
              `
              : ""
          }


          ${
            cert.pdf_url
              ? `
                <a
                  class="secondary-btn"
                  href="${escapeAttribute(
                    cert.pdf_url
                  )}"
                  target="_blank"
                  rel="noopener"
                >
                  PDF
                </a>
              `
              : ""
          }


          ${
            cert.certificate_url
              ? `
                <a
                  class="secondary-btn"
                  href="${escapeAttribute(
                    cert.certificate_url
                  )}"
                  target="_blank"
                  rel="noopener"
                >
                  Document
                </a>
              `
              : ""
          }

        </div>

      `;


      list.appendChild(
        item
      );

    }
  );

}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

async function loadNotifications(
  studentId
) {

  const {
    data: notifications,
    error
  } =
    await supabaseClient
      .from("student_notifications")
      .select(`
        id,
        title,
        message,
        notification_type,
        is_read,
        created_at,
        read_at
      `)
      .eq(
        "student_id",
        studentId
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Notifications error:",
      error
    );


    $("notificationsList")
      .innerHTML = `
        <div class="empty-message">
          Unable to load notifications.
        </div>
      `;

    return;

  }


  const rows =
    notifications || [];


  const unread =
    rows.filter(
      item => !item.is_read
    ).length;


  $("notificationsCount")
    .textContent =
    unread;


  const list =
    $("notificationsList");


  list.innerHTML = "";


  if (!rows.length) {

    list.innerHTML = `
      <div class="empty-message">
        No notifications yet.
      </div>
    `;

    return;

  }


  rows.forEach(
    notification => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        `notification ${
          notification.is_read
            ? ""
            : "unread"
        }`;


      item.innerHTML = `

        <h3>
          ${escapeHtml(
            notification.title ||
            "Notification"
          )}
        </h3>

        <p>
          ${escapeHtml(
            notification.message ||
            ""
          )}
        </p>

        <small>
          ${escapeHtml(
            formatDateTime(
              notification.created_at
            )
          )}

          ${
            notification.is_read
              ? ""
              : " • Unread"
          }

        </small>

      `;


      if (
        !notification.is_read
      ) {

        item.style.cursor =
          "pointer";


        item.addEventListener(
          "click",
          () =>
            markNotificationRead(
              notification.id,
              studentId
            )
        );

      }


      list.appendChild(
        item
      );

    }
  );

}


/* =========================================================
   MARK NOTIFICATION READ
   ========================================================= */

async function markNotificationRead(
  notificationId,
  studentId
) {

  const {
    error
  } =
    await supabaseClient
      .from("student_notifications")
      .update({
        is_read: true,
        read_at:
          new Date().toISOString()
      })
      .eq(
        "id",
        notificationId
      );


  if (error) {

    console.error(
      "Notification update error:",
      error
    );

    return;

  }


  await loadNotifications(
    studentId
  );

}


/* =========================================================
   MARK ALL READ
   ========================================================= */

$("markAllReadBtn")?.addEventListener(
  "click",
  async () => {

    try {

      const {
        data: {
          session
        }
      } =
        await supabaseClient
          .auth
          .getSession();


      if (!session) {

        redirectToLogin();

        return;

      }


      const {
        data: student
      } =
        await supabaseClient
          .from("students")
          .select("id")
          .eq(
            "auth_user_id",
            session.user.id
          )
          .maybeSingle();


      if (!student) {
        return;
      }


      await supabaseClient
        .from("student_notifications")
        .update({
          is_read: true,
          read_at:
            new Date().toISOString()
        })
        .eq(
          "student_id",
          student.id
        )
        .eq(
          "is_read",
          false
        );


      await loadNotifications(
        student.id
      );

    }

    catch (error) {

      console.error(
        "Mark all read error:",
        error
      );

    }

  }
);


/* =========================================================
   LOGOUT
   ========================================================= */

$("logoutBtn")?.addEventListener(
  "click",
  async () => {

    await supabaseClient
      .auth
      .signOut();


    redirectToLogin();

  }
);


/* =========================================================
   AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  (
    event,
    session
  ) => {

    if (
      event === "SIGNED_OUT" ||
      !session
    ) {

      redirectToLogin();

    }

  }
);


/* =========================================================
   REDIRECT
   ========================================================= */

function redirectToLogin() {

  window.location.href =
    "student-login.html";

}


/* =========================================================
   FATAL ERROR
   ========================================================= */

function showFatalError(
  message
) {

  $("portalLoading").innerHTML = `

    <div style="
      max-width:520px;
      padding:30px;
      text-align:center;
    ">

      <div style="
        font-size:45px;
        margin-bottom:15px;
      ">
        🔐
      </div>

      <h2 style="
        color:#0B1E63;
        margin-bottom:10px;
      ">
        Student Portal
      </h2>

      <p style="
        color:#6B7280;
        line-height:1.6;
      ">
        ${escapeHtml(message)}
      </p>

      <button
        onclick="window.location.href='student-login.html'"
        style="
          margin-top:15px;
          border:0;
          background:#0B1E63;
          color:white;
          padding:11px 18px;
          border-radius:9px;
          cursor:pointer;
          font-weight:700;
        "
      >
        Back to Login
      </button>

    </div>

  `;

}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(
  value
) {

  if (!value) {
    return "--";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return value;

  }


  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );

}


/* =========================================================
   DATE + TIME
   ========================================================= */

function formatDateTime(
  value
) {

  if (!value) {
    return "--";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return value;

  }


  return date.toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


/* =========================================================
   SCORE
   ========================================================= */

function formatScore(
  score,
  maxScore
) {

  if (
    score === null ||
    score === undefined
  ) {

    return "--";

  }


  if (
    maxScore === null ||
    maxScore === undefined
  ) {

    return String(score);

  }


  return `${score} / ${maxScore}`;

}


/* =========================================================
   PERCENTAGE
   ========================================================= */

function formatPercentage(
  percentage,
  score,
  maxScore
) {

  if (
    percentage !== null &&
    percentage !== undefined
  ) {

    return `${Number(
      percentage
    ).toFixed(1)}%`;

  }


  if (
    score !== null &&
    maxScore &&
    Number(maxScore) > 0
  ) {

    return `${(
      Number(score) /
      Number(maxScore) *
      100
    ).toFixed(1)}%`;

  }


  return "--";

}


/* =========================================================
   CERTIFICATE URL
   ========================================================= */

function buildCertificateVerificationUrl(
  cert
) {

  if (
    cert.certificate_type ===
      "authentication_letter" &&
    cert.verify_code
  ) {

    return `verify-auth.html?code=${encodeURIComponent(
      cert.verify_code
    )}&id=${encodeURIComponent(
      cert.certificate_id || ""
    )}`;

  }


  if (
    cert.verify_code
  ) {

    return `verify.html?code=${encodeURIComponent(
      cert.verify_code
    )}`;

  }


  return null;

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================================================
   ESCAPE ATTRIBUTE
   ========================================================= */

function escapeAttribute(
  value
) {

  return escapeHtml(
    value
  );

}
