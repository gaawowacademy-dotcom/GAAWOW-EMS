/* =========================================================
   GAAWOW ACADEMY
   AUTHENTICATION LETTER
   COMPLETE JAVASCRIPT
   Version: 20261001-2
   ========================================================= */

"use strict";

/* =========================================================
   CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


/* =========================================================
   MESSAGES
   ========================================================= */

const MSG = {
  loading: "Loading GAAWOW Authentication Letter...",
  recordNotFound: "Authentication Letter record not found.",
  wrongType: "Record-kan ma aha Authentication Letter.",
  genericError: "Unable to load Authentication Letter.",
  retry: "Retry"
};


/* =========================================================
   HELPERS
   ========================================================= */

function $(selector) {
  return document.querySelector(selector);
}


function text(value, fallback = "N/A") {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value).trim();
}


function firstAvailable(...values) {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return null;
}


function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function normalizeType(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDate(value) {

  if (!value) {
    return "N/A";
  }

  const raw = String(value).trim();

  if (!raw) {
    return "N/A";
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}


/* =========================================================
   TIMEOUT
   ========================================================= */

function withTimeout(promise, milliseconds = 15000) {

  return Promise.race([
    promise,

    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Request timeout"));
      }, milliseconds);
    })
  ]);
}


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

let supabaseClient = null;


function getSupabase() {

  if (supabaseClient) {
    return supabaseClient;
  }

  if (!window.supabase) {
    throw new Error("Supabase library not loaded.");
  }

  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

  return supabaseClient;
}


/* =========================================================
   URL / RECORD ID
   ========================================================= */

function getURLParams() {

  const params = new URLSearchParams(
    window.location.search
  );

  return {
    regen: params.get("regen"),
    id: params.get("id"),
    record_id: params.get("record_id"),
    code: params.get("code")
  };
}


function getRecordIdFromURL() {

  const params = getURLParams();

  return firstAvailable(
    params.regen,
    params.record_id,
    params.id
  );
}


/* =========================================================
   AUTHENTICATION LETTER CHECK
   ========================================================= */

function isAuthenticationLetter(record) {

  if (!record) {
    return false;
  }

  const type = normalizeType(
    record.certificate_type
  );

  const certificateId =
    String(record.certificate_id || "")
      .toUpperCase();

  const certificateNo =
    String(record.certificate_no || "")
      .toUpperCase();

  if (
    type === "authentication_letter" ||
    type.includes("authentication")
  ) {
    return true;
  }

  if (
    certificateId.startsWith("GAA-AUTH-") ||
    certificateNo.startsWith("GAA-AUTH-")
  ) {
    return true;
  }

  return false;
}


/* =========================================================
   LOAD CERTIFICATE RECORD
   ========================================================= */

async function fetchAuthenticationRecord() {

  const supabase = getSupabase();
  const params = getURLParams();

  const recordId =
    getRecordIdFromURL();


  /* -------------------------------------------------------
     1. BY DATABASE UUID
     ------------------------------------------------------- */

  if (recordId) {

    try {

      const { data, error } =
        await withTimeout(
          supabase
            .from("certificates")
            .select("*")
            .eq("id", recordId)
            .maybeSingle()
        );

      if (!error && data) {
        return data;
      }

    } catch (error) {
      console.warn(
        "UUID lookup failed:",
        error
      );
    }
  }


  /* -------------------------------------------------------
     2. BY CERTIFICATE ID
     ------------------------------------------------------- */

  if (params.id) {

    try {

      const { data, error } =
        await withTimeout(
          supabase
            .from("certificates")
            .select("*")
            .eq(
              "certificate_id",
              params.id
            )
            .maybeSingle()
        );

      if (!error && data) {
        return data;
      }

    } catch (error) {
      console.warn(
        "Certificate ID lookup failed:",
        error
      );
    }
  }


  /* -------------------------------------------------------
     3. BY VERIFICATION CODE
     ------------------------------------------------------- */

  if (params.code) {

    try {

      const { data, error } =
        await withTimeout(
          supabase
            .from("certificates")
            .select("*")
            .eq(
              "verify_code",
              params.code
            )
            .maybeSingle()
        );

      if (!error && data) {
        return data;
      }

    } catch (error) {
      console.warn(
        "Verification code lookup failed:",
        error
      );
    }
  }


  return null;
}


/* =========================================================
   RPC EXTRA DATA
   ========================================================= */

async function loadAuthenticationExtras(record) {

  const supabase = getSupabase();

  if (!record) {
    return {};
  }

  const code =
    record.verify_code;

  const authId =
    record.certificate_id;


  if (!code) {
    return {};
  }


  try {

    const { data, error } =
      await withTimeout(

        supabase.rpc(
          "verify_authentication_letter",
          {
            p_code: code,
            p_id: authId || null
          }
        )

      );

    if (error) {

      console.warn(
        "Authentication RPC:",
        error
      );

      return {};
    }

    if (Array.isArray(data)) {
      return data[0] || {};
    }

    return data || {};

  } catch (error) {

    console.warn(
      "RPC failed:",
      error
    );

    return {};
  }
}


/* =========================================================
   STUDENT FALLBACK
   ========================================================= */

async function loadStudentFallback(record) {

  const supabase = getSupabase();

  if (!record?.student_id) {
    return {};
  }

  try {

    const { data, error } =
      await withTimeout(

        supabase
          .from("students")
          .select("*")
          .eq(
            "id",
            record.student_id
          )
          .maybeSingle()

      );

    if (error || !data) {
      return {};
    }

    return data;

  } catch (error) {

    console.warn(
      "Student fallback failed:",
      error
    );

    return {};
  }
}


/* =========================================================
   STUDENT INFORMATION
   ========================================================= */

function renderStudentInformation(
  record,
  extras,
  student
) {

  const studentName =
    firstAvailable(
      record.student_name_snapshot,
      extras.student_name,
      student.full_name,
      student.student_name,
      student.name
    );


  const courseName =
    firstAvailable(
      record.course_name_snapshot,
      extras.course_name,
      student.course_name,
      student.program,
      student.course
    );


  const photoURL =
    firstAvailable(
      record.student_photo_url,
      extras.student_photo_url,
      student.student_photo_url,
      student.photo_url,
      student.photo
    );


  /* -------------------------------------------------------
     IMPORTANT DATE FIX
     
     ONLY use Authentication Letter dates.
     
     Do NOT use:
     student.start_date
     admission_date
     enrollment_date
     join_date
     etc.
     
     This prevents unrelated dates such as
     23 December 2026 from appearing.
     ------------------------------------------------------- */

  const dateStarted =
    firstAvailable(
      extras.date_started,
      record.date_started
    );


  const dateCompleted =
    firstAvailable(
      extras.date_completed,
      record.date_completed
    );


  /* -------------------------------------------------------
     STUDENT NAME
     ------------------------------------------------------- */

  const studentNameSelectors = [
    "#studentName",
    "#student-name",
    "[data-field='student-name']",
    "[data-field='student_name']"
  ];


  studentNameSelectors.forEach(selector => {

    const el = $(selector);

    if (el) {
      el.textContent =
        text(studentName);
    }

  });


  /* -------------------------------------------------------
     COURSE
     ------------------------------------------------------- */

  const courseSelectors = [
    "#courseName",
    "#course-name",
    "[data-field='course-name']",
    "[data-field='course_name']"
  ];


  courseSelectors.forEach(selector => {

    const el = $(selector);

    if (el) {
      el.textContent =
        text(courseName);
    }

  });


  /* -------------------------------------------------------
     DATE STARTED
     ------------------------------------------------------- */

  const startedSelectors = [
    "#dateStarted",
    "#date-started",
    "#startDate",
    "#start-date",
    "[data-field='date-started']",
    "[data-field='date_started']"
  ];


  startedSelectors.forEach(selector => {

    const el = $(selector);

    if (el) {
      el.textContent =
        formatDate(dateStarted);
    }

  });


  /* -------------------------------------------------------
     DATE COMPLETED
     ------------------------------------------------------- */

  const completedSelectors = [
    "#dateCompleted",
    "#date-completed",
    "#completionDate",
    "#completion-date",
    "[data-field='date-completed']",
    "[data-field='date_completed']"
  ];


  completedSelectors.forEach(selector => {

    const el = $(selector);

    if (el) {
      el.textContent =
        formatDate(dateCompleted);
    }

  });


  /* -------------------------------------------------------
     PHOTO
     ------------------------------------------------------- */

  if (photoURL) {

    const photoSelectors = [
      "#studentPhoto",
      "#student-photo",
      ".student-photo",
      "[data-field='student-photo']"
    ];


    photoSelectors.forEach(selector => {

      const el = $(selector);

      if (!el) {
        return;
      }

      if (
        el.tagName === "IMG"
      ) {

        el.src = photoURL;

        el.style.display =
          "block";

      } else {

        el.style.backgroundImage =
          `url("${photoURL}")`;

      }

    });

  }
}


/* =========================================================
   AUTHENTICATION INFORMATION
   ========================================================= */

function renderAuthenticationInformation(
  record,
  extras
) {

  const referenceNo =
    firstAvailable(
      extras.reference_no,
      record.certificate_no
    );


  const authenticationId =
    firstAvailable(
      extras.authentication_id,
      record.certificate_id
    );


  const verificationCode =
    firstAvailable(
      extras.verification_code,
      record.verify_code
    );


  const mapping = {

    "#referenceNo":
      referenceNo,

    "#reference-no":
      referenceNo,

    "#authenticationId":
      authenticationId,

    "#authentication-id":
      authenticationId,

    "#verificationCode":
      verificationCode,

    "#verification-code":
      verificationCode

  };


  Object.entries(mapping)
    .forEach(([selector, value]) => {

      const el = $(selector);

      if (el) {
        el.textContent =
          text(value);
      }

    });
}


/* =========================================================
   STATUS
   ========================================================= */

function renderStatus(
  record,
  extras
) {

  const status =
    firstAvailable(
      extras.status,
      record.status
    );


  const statusSelectors = [
    "#status",
    "#documentStatus",
    "#document-status",
    "[data-field='status']"
  ];


  statusSelectors.forEach(selector => {

    const el = $(selector);

    if (!el) {
      return;
    }

    el.textContent =
      text(status, "VALID")
        .toUpperCase();

  });
}


/* =========================================================
   ISSUE / EXPIRY DATE
   ========================================================= */

function renderIssueDates(
  record,
  extras
) {

  const issueDate =
    firstAvailable(
      extras.issue_date,
      record.issue_date
    );


  const expiryDate =
    firstAvailable(
      extras.expiry_date,
      record.expiry_date
    );


  const issueSelectors = [
    "#issueDate",
    "#issue-date",
    "[data-field='issue-date']",
    "[data-field='issue_date']"
  ];


  issueSelectors.forEach(selector => {

    const el = $(selector);

    if (el) {
      el.textContent =
        formatDate(issueDate);
    }

  });


  const expirySelectors = [
    "#expiryDate",
    "#expiry-date",
    "[data-field='expiry-date']",
    "[data-field='expiry_date']"
  ];


  expirySelectors.forEach(selector => {

    const el = $(selector);

    if (el) {
      el.textContent =
        formatDate(expiryDate);
    }

  });
}


/* =========================================================
   VERIFICATION URL
   ========================================================= */

function getVerificationURL(
  record,
  extras
) {

  return firstAvailable(

    extras.verification_url,

    record.verification_url,

    record.certificate_url,

    `${window.location.origin}/verify-auth.html?code=${encodeURIComponent(
      record.verify_code || ""
    )}&id=${encodeURIComponent(
      record.certificate_id || ""
    )}`

  );

}


/* =========================================================
   QR CODE
   ========================================================= */

function renderQRCode(
  record,
  extras
) {

  const qrElement =
    $(
      "#qrcode"
    ) ||
    $(
      "#qrCode"
    ) ||
    $(
      "#qr-code"
    );


  if (!qrElement) {
    return;
  }


  const verificationURL =
    getVerificationURL(
      record,
      extras
    );


  qrElement.innerHTML = "";


  if (
    typeof QRCode === "undefined"
  ) {

    qrElement.textContent =
      "QR";

    return;
  }


  new QRCode(
    qrElement,
    {
      text: verificationURL,
      width: 130,
      height: 130,
      correctLevel:
        QRCode.CorrectLevel.M
    }
  );
}


/* =========================================================
   ACADEMIC RESULTS
   ========================================================= */

async function loadAcademicResults(
  record
) {

  const supabase = getSupabase();

  if (!record?.student_id) {
    return [];
  }


  try {

    const { data: results, error } =
      await withTimeout(

        supabase
          .from("results")
          .select("*")
          .eq(
            "student_id",
            record.student_id
          )
          .eq(
            "is_published",
            true
          )

      );


    if (error) {

      console.warn(
        "Results query:",
        error
      );

      return [];
    }


    if (!results?.length) {
      return [];
    }


    const subjectIds = [
      ...new Set(
        results
          .map(r =>
            r.subject_id
          )
          .filter(Boolean)
      )
    ];


    let subjects = [];


    if (subjectIds.length) {

      const response =
        await withTimeout(

          supabase
            .from("subjects")
            .select("*")
            .in(
              "id",
              subjectIds
            )

        );


      if (!response.error) {
        subjects =
          response.data || [];
      }
    }


    const subjectMap =
      new Map(
        subjects.map(subject => [
          subject.id,
          subject
        ])
      );


    const rows =
      results.map(result => {

        const subject =
          subjectMap.get(
            result.subject_id
          ) || {};


        const grade =
          firstAvailable(
            result.grade,
            result.final_grade,
            result.score_grade
          );


        const score =
          firstAvailable(
            result.score,
            result.mark,
            result.marks,
            result.total_score
          );


        return {

          subject:
            firstAvailable(
              result.subject_name,
              subject.name,
              subject.subject_name,
              "Subject"
            ),

          score,

          grade

        };

      });


    return rows;

  } catch (error) {

    console.warn(
      "Academic results failed:",
      error
    );

    return [];
  }
}


/* =========================================================
   RENDER ACADEMIC RESULTS
   ========================================================= */

function renderAcademicResults(
  rows
) {

  const container =
    $(
      "#academicResults"
    ) ||
    $(
      "#academic-results"
    ) ||
    $(
      "[data-section='academic-results']"
    );


  if (!container) {
    return;
  }


  if (!rows?.length) {

    container.innerHTML =
      `
        <div class="no-results">
          Academic results are not available.
        </div>
      `;

    return;
  }


  const tableRows =
    rows.map(row => {

      return `
        <tr>
          <td>${escapeHTML(
            text(row.subject)
          )}</td>

          <td>${escapeHTML(
            text(row.score)
          )}</td>

          <td>${escapeHTML(
            text(row.grade)
          )}</td>
        </tr>
      `;

    }).join("");


  container.innerHTML =
    `
      <table class="academic-results-table">

        <thead>

          <tr>
            <th>SUBJECT</th>
            <th>SCORE</th>
            <th>GRADE</th>
          </tr>

        </thead>

        <tbody>
          ${tableRows}
        </tbody>

      </table>
    `;
}


/* =========================================================
   G-FOUNDER / SCC LOCATION REMOVAL
   ========================================================= */

/*
   This removes only LOCATION text/field from the
   G-Founder / SCC signature area.

   It does NOT remove:
   - G-Founder
   - Director
   - Signature
   - Name
*/

function removeFounderLocation() {

  const selectors = [

    "#founderLocation",

    "#gFounderLocation",

    "#g-founder-location",

    "#sccLocation",

    "#scc-location",

    ".founder-location",

    ".g-founder-location",

    ".scc-location",

    "[data-field='founder-location']",

    "[data-field='g-founder-location']",

    "[data-field='scc-location']"

  ];


  selectors.forEach(selector => {

    document
      .querySelectorAll(selector)
      .forEach(el => {

        el.remove();

      });

  });


  /* -------------------------------------------------------
     Also remove a labelled Location line if it exists.
     Only inside founder / SCC blocks.
     ------------------------------------------------------- */

  const founderBlocks =
    document.querySelectorAll(
      ".founder, .g-founder, .gfounder, .scc, .signature-block"
    );


  founderBlocks.forEach(block => {

    const elements =
      block.querySelectorAll(
        "div, p, span, small, label"
      );


    elements.forEach(el => {

      const value =
        String(
          el.textContent || ""
        ).trim();


      if (
        /^location\s*:/i.test(value)
      ) {

        el.remove();

      }

    });

  });
}


/* =========================================================
   SHOW DOCUMENT
   ========================================================= */

function showDocument() {

  const loading =
    $(
      "#loading"
    ) ||
    $(
      ".loading"
    ) ||
    $(
      "#loader"
    );


  if (loading) {
    loading.style.display =
      "none";
  }


  const documentElement =
    $(
      "#authenticationLetter"
    ) ||
    $(
      ".authentication-letter"
    ) ||
    $(
      "#document"
    );


  if (documentElement) {

    documentElement.style.display =
      "";

    documentElement.classList.add(
      "loaded"
    );

  }


  document.body.classList.add(
    "document-loaded"
  );
}


/* =========================================================
   ERROR
   ========================================================= */

function showError(error) {

  console.error(
    "GAAWOW Authentication Letter:",
    error
  );


  const loading =
    $(
      "#loading"
    ) ||
    $(
      ".loading"
    ) ||
    $(
      "#loader"
    );


  if (loading) {

    loading.innerHTML =
      `
        <div class="error-message">

          <strong>
            ${escapeHTML(
              MSG.genericError
            )}
          </strong>

          <br><br>

          <button
            type="button"
            onclick="location.reload()"
          >
            ${MSG.retry}
          </button>

        </div>
      `;

  }

}


/* =========================================================
   MAIN LOADER
   ========================================================= */

async function loadAuthenticationLetter() {

  try {

    const loading =
      $(
        "#loading"
      ) ||
      $(
        ".loading"
      ) ||
      $(
        "#loader"
      );


    if (loading) {
      loading.textContent =
        MSG.loading;
    }


    /* -----------------------------------------------------
       RECORD
       ----------------------------------------------------- */

    const record =
      await fetchAuthenticationRecord();


    if (!record) {

      throw new Error(
        MSG.recordNotFound
      );

    }


    /* -----------------------------------------------------
       TYPE CHECK
       ----------------------------------------------------- */

    if (
      !isAuthenticationLetter(record)
    ) {

      throw new Error(
        MSG.wrongType
      );

    }


    /* -----------------------------------------------------
       EXTRA DATA
       ----------------------------------------------------- */

    const extras =
      await loadAuthenticationExtras(
        record
      );


    /* -----------------------------------------------------
       STUDENT FALLBACK
       ----------------------------------------------------- */

    const student =
      await loadStudentFallback(
        record
      );


    /* -----------------------------------------------------
       RENDER MAIN DOCUMENT
       ----------------------------------------------------- */

    renderStudentInformation(
      record,
      extras,
      student
    );


    renderAuthenticationInformation(
      record,
      extras
    );


    renderStatus(
      record,
      extras
    );


    renderIssueDates(
      record,
      extras
    );


    renderQRCode(
      record,
      extras
    );


    /* -----------------------------------------------------
       REMOVE LOCATION FROM G-FOUNDER / SCC
       ----------------------------------------------------- */

    removeFounderLocation();


    /* -----------------------------------------------------
       SHOW DOCUMENT FIRST
       ----------------------------------------------------- */

    showDocument();


    /* -----------------------------------------------------
       ACADEMIC RESULTS
       ----------------------------------------------------- */

    const academicRows =
      await loadAcademicResults(
        record
      );


    renderAcademicResults(
      academicRows
    );


    /* -----------------------------------------------------
       REMOVE LOCATION AGAIN
       In case academic rendering changed DOM.
       ----------------------------------------------------- */

    removeFounderLocation();


    console.log(
      "GAAWOW Authentication Letter loaded:",
      record
    );

  } catch (error) {

    showError(error);

  }
}


/* =========================================================
   PRINT
   ========================================================= */

function setupPrint() {

  const printButtons =
    document.querySelectorAll(
      "#printButton, #printBtn, .print-button"
    );


  printButtons.forEach(button => {

    button.addEventListener(
      "click",
      () => {
        window.print();
      }
    );

  });
}


/* =========================================================
   RETRY
   ========================================================= */

function setupRetry() {

  const retryButtons =
    document.querySelectorAll(
      "#retryButton, #retryBtn, .retry-button"
    );


  retryButtons.forEach(button => {

    button.addEventListener(
      "click",
      () => {
        loadAuthenticationLetter();
      }
    );

  });
}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupPrint();

    setupRetry();

    loadAuthenticationLetter();

  }
);
