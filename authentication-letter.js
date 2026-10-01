/* =========================================================
   GAAWOW ACADEMY EMS
   AUTHENTICATION LETTER
   PRODUCTION JS - FIXED VERSION
   ========================================================= */

(function () {

  "use strict";

  /* =======================================================
     PREVENT DUPLICATE EXECUTION
  ======================================================= */

  if (window.__gaawowAuthenticationLetterLoaded) {
    return;
  }

  window.__gaawowAuthenticationLetterLoaded = true;


  /* =======================================================
     CONFIGURATION
  ======================================================= */

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";


  /* =======================================================
     MESSAGES
  ======================================================= */

  const MSG = {

    noId:
      "Record ID lama helin. Ka fur Authentication Letter gudaha Certificates.",

    notFound:
      "Authentication Letter record-ka lama helin.",

    wrongType:
      "Record-kan ma aha Authentication Letter.",

    network:
      "Waxaa dhacay qalad markii Authentication Letter la soo dejinayay."

  };


  /* =======================================================
     DOM HELPER
  ======================================================= */

  function $(id) {

    return document.getElementById(id);

  }


  /* =======================================================
     SAFE TEXT
  ======================================================= */

  function text(value) {

    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {

      return "N/A";

    }

    return String(value);

  }


  /* =======================================================
     FIRST AVAILABLE
  ======================================================= */

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


  /* =======================================================
     HTML ESCAPE
  ======================================================= */

  function escapeHTML(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  /* =======================================================
     NORMALIZE
  ======================================================= */

  function normalizeType(value) {

    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

  }


  /* =======================================================
     DATE FORMAT
  ======================================================= */

  function formatDate(value) {

    if (!value) {

      return "N/A";

    }

    let dateValue =
      String(value).trim();


    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        dateValue
      )
    ) {

      dateValue += "T00:00:00Z";

    }


    const date =
      new Date(dateValue);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return text(value);

    }


    return date.toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC"
      }
    );

  }


  /* =======================================================
     TIMEOUT HELPER
  ======================================================= */

  function withTimeout(
    promise,
    milliseconds = 12000
  ) {

    return Promise.race([

      promise,

      new Promise(
        (_, reject) => {

          setTimeout(
            () => {

              reject(
                new Error(
                  "Request timeout"
                )
              );

            },
            milliseconds
          );

        }
      )

    ]);

  }


  /* =======================================================
     ERROR DISPLAY
  ======================================================= */

  function showError(
    message,
    detail = ""
  ) {

    console.error(
      "[GAAWOW Authentication Letter]",
      detail || message
    );


    const loading =
      $("loadingState");

    const letter =
      $("letter");

    const errorState =
      $("errorState");

    const errorMessage =
      $("errorMessage");

    const errorDetail =
      $("errorDetail");


    if (loading) {

      loading.hidden = true;

    }


    if (letter) {

      letter.hidden = true;

    }


    if (errorMessage) {

      errorMessage.textContent =
        message;

    }


    if (errorDetail) {

      errorDetail.textContent =
        detail
          ? "Faahfaahin farsamo: " + detail
          : "";

    }


    if (errorState) {

      errorState.hidden = false;

    }

  }


  /* =======================================================
     SUPABASE CLIENT
  ======================================================= */

  let db = null;


  function createSupabaseClient() {

    const possibleClients = [

      window.supabaseClient,

      window.sb,

      window.db,

      window.supabaseDb,

      window.supabaseInstance,

      window._supabase

    ];


    for (const client of possibleClients) {

      try {

        if (
          client &&
          typeof client.from === "function" &&
          typeof client.rpc === "function"
        ) {

          return client;

        }

      } catch (error) {

        console.warn(
          "Invalid Supabase client:",
          error
        );

      }

    }


    if (
      window.supabase &&
      typeof window.supabase.createClient ===
      "function"
    ) {

      return window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

    }


    return null;

  }


  /* =======================================================
     GET RECORD ID
     Supports:
       ?regen=UUID
       ?id=UUID
       ?record_id=UUID
     ======================================================= */

  function getRecordIdFromURL() {

    const params =
      new URLSearchParams(
        window.location.search
      );


    const value =
      firstAvailable(

        params.get("regen"),

        params.get("id"),

        params.get("record_id")

      );


    return value
      ? String(value).trim()
      : "";

  }


  /* =======================================================
     AUTHENTICATION LETTER TYPE CHECK
  ======================================================= */

  function isAuthenticationLetter(
    record
  ) {

    if (!record) {

      return false;

    }


    const type =
      normalizeType(
        record.certificate_type
      );


    if (
      type ===
      "authentication_letter"
    ) {

      return true;

    }


    if (
      type.includes(
        "authentication"
      )
    ) {

      return true;

    }


    if (
      /^GAA-AUTH/i.test(
        String(
          record.certificate_id || ""
        )
      )
    ) {

      return true;

    }


    if (
      /^GAA-AUTH/i.test(
        String(
          record.certificate_no || ""
        )
      )
    ) {

      return true;

    }


    return false;

  }


  /* =======================================================
     FETCH AUTHENTICATION RECORD
  ======================================================= */

  async function fetchAuthenticationRecord(
    client,
    recordId
  ) {

    if (!client) {

      throw new Error(
        "Supabase client lama helin."
      );

    }


    /* -----------------------------------------------------
       1. PRIMARY: certificates.id
       ----------------------------------------------------- */

    try {

      const response =
        await withTimeout(

          client
            .from("certificates")
            .select("*")
            .eq("id", recordId)
            .maybeSingle(),

          12000

        );


      if (
        !response.error &&
        response.data
      ) {

        return response.data;

      }

    } catch (error) {

      console.warn(
        "Primary record lookup failed:",
        error
      );

    }


    /* -----------------------------------------------------
       2. certificate_id
       ----------------------------------------------------- */

    try {

      const response =
        await withTimeout(

          client
            .from("certificates")
            .select("*")
            .eq(
              "certificate_id",
              recordId
            )
            .limit(1),

          12000

        );


      if (
        !response.error &&
        response.data &&
        response.data.length
      ) {

        return response.data[0];

      }

    } catch (error) {

      console.warn(
        "certificate_id lookup failed:",
        error
      );

    }


    /* -----------------------------------------------------
       3. certificate_no
       ----------------------------------------------------- */

    try {

      const response =
        await withTimeout(

          client
            .from("certificates")
            .select("*")
            .eq(
              "certificate_no",
              recordId
            )
            .limit(1),

          12000

        );


      if (
        !response.error &&
        response.data &&
        response.data.length
      ) {

        return response.data[0];

      }

    } catch (error) {

      console.warn(
        "certificate_no lookup failed:",
        error
      );

    }


    /* -----------------------------------------------------
       4. verify_code
       ----------------------------------------------------- */

    try {

      const response =
        await withTimeout(

          client
            .from("certificates")
            .select("*")
            .eq(
              "verify_code",
              recordId
            )
            .limit(1),

          12000

        );


      if (
        !response.error &&
        response.data &&
        response.data.length
      ) {

        return response.data[0];

      }

    } catch (error) {

      console.warn(
        "verify_code lookup failed:",
        error
      );

    }


    return null;

  }


  /* =======================================================
     RPC ENRICHMENT
  ======================================================= */

  async function loadAuthenticationExtras(
    client,
    record
  ) {

    if (
      !record ||
      !record.verify_code ||
      !record.certificate_id
    ) {

      return {};

    }


    try {

      const response =
        await withTimeout(

          client.rpc(
            "verify_authentication_letter",
            {
              p_code:
                record.verify_code,

              p_id:
                record.certificate_id
            }
          ),

          10000

        );


      if (
        response.error ||
        !response.data
      ) {

        console.warn(
          "Authentication RPC:",
          response.error
        );

        return {};

      }


      return Array.isArray(
        response.data
      )
        ? (
            response.data[0] ||
            {}
          )
        : response.data;

    } catch (error) {

      console.warn(
        "Authentication RPC failed:",
        error
      );

      return {};

    }

  }


  /* =======================================================
     STUDENT FALLBACK
  ======================================================= */

  async function loadStudentFallback(
    client,
    record
  ) {

    if (
      !record ||
      !record.student_id
    ) {

      return {};

    }


    try {

      const response =
        await withTimeout(

          client
            .from("students")
            .select("*")
            .eq(
              "id",
              record.student_id
            )
            .maybeSingle(),

          10000

        );


      if (
        response.error ||
        !response.data
      ) {

        return {};

      }


      return response.data;

    } catch (error) {

      console.warn(
        "Student fallback failed:",
        error
      );

      return {};

    }

  }


  /* =======================================================
     RENDER STUDENT
  ======================================================= */

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

        student.name,

        student.student_name

      );


    const courseName =
      firstAvailable(

        record.course_name_snapshot,

        extras.course_name,

        record.course_name,

        student.course_name

      );


    const institutionName =
      firstAvailable(

        extras.institution_name,

        record.institution_name,

        "Gaawow Academy"

      );


    const studentNameEl =
      $("studentName");

    const courseNameEl =
      $("courseName");

    const institutionEl =
      $("institution");


    if (studentNameEl) {

      studentNameEl.textContent =
        text(studentName);

    }


    if (courseNameEl) {

      courseNameEl.textContent =
        text(courseName);

    }


    if (institutionEl) {

      institutionEl.textContent =
        text(institutionName);

    }


    /* =====================================================
       DATE STARTED
       ===================================================== */

    const dateStarted =
      firstAvailable(

        extras.date_started,

        extras.start_date,

        extras.admission_date,

        extras.date_admitted,

        record.date_started,

        record.start_date,

        record.admission_date,

        record.date_admitted,

        student.date_started,

        student.start_date,

        student.admission_date,

        student.date_admitted,

        student.enrollment_date,

        student.enrolled_date,

        student.join_date,

        student.start_date_of_study

      );


    /* =====================================================
       DATE COMPLETED
       ===================================================== */

    const dateCompleted =
      firstAvailable(

        extras.date_completed,

        extras.completion_date,

        extras.end_date,

        extras.date_finished,

        record.date_completed,

        record.completion_date,

        record.end_date,

        record.date_finished,

        student.date_completed,

        student.completion_date,

        student.end_date,

        student.date_finished,

        student.graduation_date,

        student.completed_date,

        student.completionDate

      );


    const issueDate =
      firstAvailable(

        record.issue_date,

        extras.issue_date

      );


    const expiryDate =
      firstAvailable(

        record.expiry_date,

        extras.expiry_date

      );


    if ($("dateStarted")) {

      $("dateStarted").textContent =
        formatDate(dateStarted);

    }


    if ($("dateCompleted")) {

      $("dateCompleted").textContent =
        formatDate(dateCompleted);

    }


    if ($("issueDate")) {

      $("issueDate").textContent =
        formatDate(issueDate);

    }


    if ($("expiryDate")) {

      $("expiryDate").textContent =
        formatDate(expiryDate);

    }


    /* =====================================================
       STUDENT PHOTO
       ===================================================== */

    const photoURL =
      firstAvailable(

        record.student_photo_url,

        extras.student_photo_url,

        student.student_photo_url,

        student.photo_url,

        student.photo

      );


    const photoBox =
      $("photoBox");

    const photo =
      $("photo");


    if (
      photoURL &&
      photoBox &&
      photo
    ) {

      photoBox.hidden = false;


      photo.onerror =
        function () {

          photoBox.hidden = true;

        };


      photo.onload =
        function () {

          photoBox.hidden = false;

        };


      photo.src =
        String(photoURL);

    } else if (photoBox) {

      photoBox.hidden = true;

    }

  }


  /* =======================================================
     AUTHENTICATION INFORMATION
  ======================================================= */

  function renderAuthenticationInformation(
    record,
    extras
  ) {

    const refNo =
      firstAvailable(

        record.certificate_no,

        extras.reference_no

      );


    const authId =
      firstAvailable(

        record.certificate_id,

        extras.authentication_id

      );


    const verifyCode =
      firstAvailable(

        record.verify_code,

        extras.verification_code

      );


    if ($("refNo")) {

      $("refNo").textContent =
        text(refNo);

    }


    if ($("authId")) {

      $("authId").textContent =
        text(authId);

    }


    if ($("verifyCode")) {

      $("verifyCode").textContent =
        text(verifyCode);

    }

  }


  /* =======================================================
     STATUS
  ======================================================= */

  function renderStatus(
    record,
    extras
  ) {

    const statusElement =
      $("status");


    if (!statusElement) {

      return;

    }


    const rawStatus =
      String(
        firstAvailable(

          record.status,

          extras.status,

          "N/A"

        )
      ).trim();


    statusElement.textContent =
      rawStatus.toUpperCase();


    statusElement.className =
      "badge";


    const normalized =
      rawStatus.toLowerCase();


    if (
      normalized === "valid" ||
      normalized === "graduated"
    ) {

      statusElement.classList.add(
        "ok"
      );

    } else if (
      normalized === "pending"
    ) {

      statusElement.classList.add(
        "warn"
      );

    } else if (
      normalized === "expired" ||
      normalized === "revoked"
    ) {

      statusElement.classList.add(
        "bad"
      );

    }

  }


  /* =======================================================
     VERIFICATION URL
  ======================================================= */

  function getVerificationURL(
    record,
    extras
  ) {

    const storedURL =
      firstAvailable(

        record.verification_url,

        extras.verification_url

      );


    if (storedURL) {

      return String(storedURL);

    }


    const code =
      firstAvailable(

        record.verify_code,

        extras.verification_code

      );


    const authId =
      firstAvailable(

        record.certificate_id,

        extras.authentication_id

      );


    if (!code) {

      return "";

    }


    const currentURL =
      new URL(
        window.location.href
      );


    const basePath =
      currentURL.pathname
        .replace(
          /[^/]*$/,
          ""
        );


    let url =
      currentURL.origin +
      basePath +
      "verify-auth.html?code=" +
      encodeURIComponent(
        code
      );


    if (authId) {

      url +=
        "&id=" +
        encodeURIComponent(
          authId
        );

    }


    return url;

  }


  /* =======================================================
     QR CODE
  ======================================================= */

  function renderQRCode(
    verificationURL
  ) {

    const box =
      $("qrcode");


    if (!box) {

      return;

    }


    box.innerHTML = "";


    if (
      !verificationURL
    ) {

      box.innerHTML =
        "<span style=\"font-size:7px;color:#697386;text-align:center;\">QR unavailable</span>";

      return;

    }


    if (
      typeof QRCode ===
      "undefined"
    ) {

      console.warn(
        "QRCode library not loaded."
      );


      box.innerHTML =
        "<span style=\"font-size:7px;color:#697386;text-align:center;\">QR unavailable</span>";

      return;

    }


    try {

      new QRCode(
        box,
        {
          text:
            verificationURL,

          width:
            180,

          height:
            180,

          correctLevel:
            QRCode.CorrectLevel.M
        }
      );

    } catch (error) {

      console.error(
        "QR generation failed:",
        error
      );

    }

  }


  /* =======================================================
     LOAD ACADEMIC RESULTS
     OPTIONAL
     ======================================================= */

  async function loadAcademicResults(
    client,
    record
  ) {

    try {

      if (
        !record ||
        !record.student_id
      ) {

        return [];

      }


      const response =
        await withTimeout(

          client
            .from("results")
            .select(`
              id,
              student_id,
              exam_id,
              subject_id,
              score,
              max_score,
              percentage,
              grade,
              remarks,
              is_published
            `)
            .eq(
              "student_id",
              record.student_id
            )
            .eq(
              "is_published",
              true
            ),

          10000

        );


      if (
        response.error
      ) {

        console.warn(
          "Results unavailable:",
          response.error
        );

        return [];

      }


      let rows =
        response.data || [];


      if (!rows.length) {

        return [];

      }


      /* -----------------------------------------------------
         SUBJECTS
         ----------------------------------------------------- */

      const subjectIDs =
        [
          ...new Set(

            rows
              .map(
                row =>
                  row.subject_id
              )
              .filter(Boolean)

          )
        ];


      let subjects = [];


      if (subjectIDs.length) {

        try {

          const subjectResponse =
            await withTimeout(

              client
                .from("subjects")
                .select(
                  "id,name,code"
                )
                .in(
                  "id",
                  subjectIDs
                ),

              8000

            );


          if (
            !subjectResponse.error
          ) {

            subjects =
              subjectResponse.data || [];

          }

        } catch (error) {

          console.warn(
            "Subjects unavailable:",
            error
          );

        }

      }


      const subjectMap =
        new Map();


      subjects.forEach(
        subject => {

          subjectMap.set(
            subject.id,
            subject
          );

        }
      );


      /* -----------------------------------------------------
         EXAMS
         ----------------------------------------------------- */

      const examIDs =
        [
          ...new Set(

            rows
              .map(
                row =>
                  row.exam_id
              )
              .filter(Boolean)

          )
        ];


      let exams = [];


      if (examIDs.length) {

        try {

          const examResponse =
            await withTimeout(

              client
                .from("exams")
                .select(
                  "id,title,exam_type,exam_date,course_id"
                )
                .in(
                  "id",
                  examIDs
                ),

              8000

            );


          if (
            !examResponse.error
          ) {

            exams =
              examResponse.data || [];

          }

        } catch (error) {

          console.warn(
            "Exams unavailable:",
            error
          );

        }

      }


      const examMap =
        new Map();


      exams.forEach(
        exam => {

          examMap.set(
            exam.id,
            exam
          );

        }
      );


      /* -----------------------------------------------------
         ENRICH ROWS
         ----------------------------------------------------- */

      rows =
        rows.map(
          row => {

            const subject =
              subjectMap.get(
                row.subject_id
              ) || {};


            const exam =
              examMap.get(
                row.exam_id
              ) || {};


            return {

              ...row,

              subject_name:
                subject.name ||
                subject.code ||
                "Unknown Subject",

              subject_code:
                subject.code ||
                "",

              exam_title:
                exam.title ||
                "",

              exam_type:
                exam.exam_type ||
                "",

              exam_date:
                exam.exam_date ||
                null,

              course_id:
                exam.course_id ||
                null

            };

          }
        );


      /* -----------------------------------------------------
         COURSE FILTER
         ----------------------------------------------------- */

      if (record.course_id) {

        const courseRows =
          rows.filter(
            row =>
              String(
                row.course_id
              ) ===
              String(
                record.course_id
              )
          );


        if (courseRows.length) {

          rows =
            courseRows;

        }

      }


      /* -----------------------------------------------------
         FINAL EXAM FILTER
         ----------------------------------------------------- */

      const finalRows =
        rows.filter(
          row =>
            String(
              row.exam_type || ""
            )
              .trim()
              .toLowerCase() ===
            "final"
        );


      if (finalRows.length) {

        rows =
          finalRows;

      }


      /* -----------------------------------------------------
         SORT
         ----------------------------------------------------- */

      rows.sort(
        (a, b) =>
          String(
            a.subject_name || ""
          ).localeCompare(
            String(
              b.subject_name || ""
            )
          )
      );


      /* -----------------------------------------------------
         REMOVE DUPLICATES
         ----------------------------------------------------- */

      const unique =
        new Map();


      rows.forEach(
        row => {

          const key =
            row.subject_id ||
            row.subject_name;


          if (
            !unique.has(key)
          ) {

            unique.set(
              key,
              row
            );

          }

        }
      );


      return Array.from(
        unique.values()
      );

    } catch (error) {

      console.warn(
        "Academic results failed:",
        error
      );

      return [];

    }

  }


  /* =======================================================
     GRADE
  ======================================================= */

  function calculateGrade(
    percentage
  ) {

    const p =
      Number(
        percentage
      );


    if (
      Number.isNaN(p)
    ) {

      return "";

    }


    if (p >= 90) return "A+";
    if (p >= 80) return "A";
    if (p >= 70) return "B";
    if (p >= 60) return "C";
    if (p >= 50) return "D";

    return "F";

  }


  /* =======================================================
     RESULT
  ======================================================= */

  function calculateResult(
    percentage,
    grade
  ) {

    const p =
      Number(
        percentage
      );


    if (
      !Number.isNaN(p)
    ) {

      return p >= 50
        ? "PASS"
        : "FAIL";

    }


    return String(
      grade || ""
    ).toUpperCase() === "F"
      ? "FAIL"
      : "PASS";

  }


  /* =======================================================
     RENDER ACADEMIC RESULTS
     ======================================================= */

  function renderAcademicResults(
    rows
  ) {

    const section =
      $("resultsSection");

    const noResults =
      $("noResults");

    const body =
      $("resultsBody");

    const foot =
      $("resultsFoot");


    if (!section || !body || !foot) {

      return;

    }


    body.innerHTML = "";

    foot.innerHTML = "";


    if (
      !rows ||
      !rows.length
    ) {

      section.hidden = true;

      if (noResults) {

        noResults.hidden = false;

      }

      return;

    }


    section.hidden = false;


    if (noResults) {

      noResults.hidden = true;

    }


    let total = 0;

    let totalMax = 0;

    let count = 0;

    let passed = 0;


    rows.forEach(
      row => {

        const score =
          Number(
            row.score
          );


        const maxScore =
          Number(
            row.max_score
          );


        let percentage =
          Number(
            row.percentage
          );


        if (
          Number.isNaN(
            percentage
          ) &&
          !Number.isNaN(score) &&
          !Number.isNaN(maxScore) &&
          maxScore > 0
        ) {

          percentage =
            (
              score /
              maxScore
            ) * 100;

        }


        const grade =
          row.grade ||
          calculateGrade(
            percentage
          );


        const result =
          calculateResult(
            percentage,
            grade
          );


        if (
          !Number.isNaN(score)
        ) {

          total += score;

          count++;

        }


        if (
          !Number.isNaN(maxScore)
        ) {

          totalMax += maxScore;

        }


        if (
          result === "PASS"
        ) {

          passed++;

        }


        const tr =
          document.createElement(
            "tr"
          );


        const subjectCell =
          document.createElement(
            "td"
          );


        subjectCell.textContent =
          text(
            row.subject_name
          );


        const markCell =
          document.createElement(
            "td"
          );


        markCell.textContent =
          !Number.isNaN(score)

            ? (
                !Number.isNaN(maxScore)

                  ? `${score} / ${maxScore}`

                  : String(score)
              )

            : "N/A";


        const gradeCell =
          document.createElement(
            "td"
          );


        gradeCell.textContent =
          text(
            grade
          );


        const resultCell =
          document.createElement(
            "td"
          );


        resultCell.textContent =
          result;


        resultCell.classList.add(
          result === "PASS"
            ? "pass"
            : "fail"
        );


        tr.appendChild(
          subjectCell
        );

        tr.appendChild(
          markCell
        );

        tr.appendChild(
          gradeCell
        );

        tr.appendChild(
          resultCell
        );


        body.appendChild(
          tr
        );

      }
    );


    /* -----------------------------------------------------
       SUMMARY
       ----------------------------------------------------- */

    const summary =
      document.createElement(
        "tr"
      );


    const label =
      document.createElement(
        "td"
      );


    label.textContent =
      "TOTAL / AVERAGE";


    const marks =
      document.createElement(
        "td"
      );


    marks.textContent =
      totalMax > 0

        ? `${total} / ${totalMax}`

        : String(total);


    const grade =
      document.createElement(
        "td"
      );


    let averagePercentage = 0;


    if (
      totalMax > 0
    ) {

      averagePercentage =
        (
          total /
          totalMax
        ) * 100;

    } else if (
      count > 0
    ) {

      averagePercentage =
        total /
        count;

    }


    grade.textContent =
      calculateGrade(
        averagePercentage
      ) || "N/A";


    const result =
      document.createElement(
        "td"
      );


    result.textContent =
      passed === rows.length
        ? "PASS"
        : "REVIEW";


    summary.appendChild(
      label
    );

    summary.appendChild(
      marks
    );

    summary.appendChild(
      grade
    );

    summary.appendChild(
      result
    );


    foot.appendChild(
      summary
    );

  }


  /* =======================================================
     SHOW LETTER
     ======================================================= */

  function showLetter() {

    const loading =
      $("loadingState");

    const error =
      $("errorState");

    const letter =
      $("letter");

    const printBtn =
      $("printBtn");


    if (loading) {

      loading.hidden = true;

    }


    if (error) {

      error.hidden = true;

    }


    if (letter) {

      letter.hidden = false;

    }


    if (printBtn) {

      printBtn.disabled = false;

    }

  }


  /* =======================================================
     LOAD EVERYTHING
     ======================================================= */

  async function loadAuthenticationLetter() {

    console.log(
      "[GAAWOW] Authentication Letter loading..."
    );


    const recordId =
      getRecordIdFromURL();


    /* -----------------------------------------------------
       URL CHECK
       ----------------------------------------------------- */

    if (!recordId) {

      showError(
        MSG.noId
      );

      return;

    }


    console.log(
      "[GAAWOW] Record ID:",
      recordId
    );


    /* -----------------------------------------------------
       SUPABASE
       ----------------------------------------------------- */

    db =
      createSupabaseClient();


    if (!db) {

      showError(
        MSG.network,
        "Supabase client lama helin."
      );

      return;

    }


    let record = null;


    /* -----------------------------------------------------
       RECORD
       ----------------------------------------------------- */

    try {

      record =
        await fetchAuthenticationRecord(
          db,
          recordId
        );

    } catch (error) {

      showError(
        MSG.network,
        error.message ||
        String(error)
      );

      return;

    }


    console.log(
      "[GAAWOW] Record:",
      record
    );


    /* -----------------------------------------------------
       RECORD NOT FOUND
       ----------------------------------------------------- */

    if (!record) {

      showError(
        MSG.notFound,
        "Record ID: " +
        recordId
      );

      return;

    }


    /* -----------------------------------------------------
       TYPE CHECK
       ----------------------------------------------------- */

    if (
      !isAuthenticationLetter(
        record
      )
    ) {

      showError(
        MSG.wrongType,

        "certificate_type = " +
        String(
          record.certificate_type ||
          "NULL"
        )

      );

      return;

    }


    console.log(
      "[GAAWOW] Authentication Letter confirmed."
    );


    /* =====================================================
       LOAD CORE DATA FIRST
       ===================================================== */

    let extras = {};

    let student = {};

    let results = [];


    /*
      RPC + Student + Results are optional.

      They are loaded independently so one failure
      cannot keep the entire document stuck on Loading.
    */

    try {

      extras =
        await loadAuthenticationExtras(
          db,
          record
        );

    } catch (error) {

      console.warn(
        "Extras failed:",
        error
      );

      extras = {};

    }


    try {

      student =
        await loadStudentFallback(
          db,
          record
        );

    } catch (error) {

      console.warn(
        "Student fallback failed:",
        error
      );

      student = {};

    }


    /*
      Render the main document BEFORE academic results.
    */

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


    const verificationURL =
      getVerificationURL(
        record,
        extras
      );


    renderQRCode(
      verificationURL
    );


    /*
      IMPORTANT:
      Show document now.
      Results cannot block it.
    */

    showLetter();


    /* =====================================================
       ACADEMIC RESULTS AFTER DOCUMENT IS VISIBLE
       ===================================================== */

    try {

      results =
        await loadAcademicResults(
          db,
          record
        );

    } catch (error) {

      console.warn(
        "Academic results failed:",
        error
      );

      results = [];

    }


    try {

      renderAcademicResults(
        results
      );

    } catch (error) {

      console.warn(
        "Academic results rendering failed:",
        error
      );

    }


    /* =====================================================
       TITLE
       ===================================================== */

    document.title =
      "Authentication Letter - " +
      text(
        record.certificate_id
      );


    console.log(
      "[GAAWOW] Authentication Letter loaded successfully."
    );

  }


  /* =======================================================
     INITIALIZATION
     ======================================================= */

  function initializePage() {

    console.log(
      "[GAAWOW] Authentication Letter JS initialized."
    );


    const printBtn =
      $("printBtn");


    const retryBtn =
      $("retryBtn");


    /* -----------------------------------------------------
       PRINT
       ----------------------------------------------------- */

    if (printBtn) {

      printBtn.disabled = true;


      printBtn.addEventListener(
        "click",
        function () {

          window.print();

        }
      );

    }


    /* -----------------------------------------------------
       RETRY
       ----------------------------------------------------- */

    if (retryBtn) {

      retryBtn.addEventListener(
        "click",
        function () {

          const error =
            $("errorState");

          const loading =
            $("loadingState");

          const letter =
            $("letter");


          if (error) {

            error.hidden = true;

          }


          if (loading) {

            loading.hidden = false;

          }


          if (letter) {

            letter.hidden = true;

          }


          if (printBtn) {

            printBtn.disabled = true;

          }


          loadAuthenticationLetter()
            .catch(
              function (error) {

                showError(
                  MSG.network,
                  error.message ||
                  String(error)
                );

              }
            );

        }
      );

    }


    /* -----------------------------------------------------
       INITIAL LOAD
       ----------------------------------------------------- */

    loadAuthenticationLetter()
      .catch(
        function (error) {

          console.error(
            "[GAAWOW] Fatal error:",
            error
          );


          showError(
            MSG.network,
            error.message ||
            String(error)
          );

        }
      );

  }


  /* =======================================================
     START
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializePage,
      {
        once: true
      }
    );

  } else {

    initializePage();

  }


})();
