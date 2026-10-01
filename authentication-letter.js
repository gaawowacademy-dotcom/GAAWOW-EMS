/* =========================================================
   GAAWOW ACADEMY EMS
   AUTHENTICATION LETTER
   Complete Production JavaScript
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
     HELPERS
  ======================================================= */

  const $ = function (id) {
    return document.getElementById(id);
  };


  const MSG = {

    noId:
      "Authentication Letter record ID lama helin.",

    notFound:
      "Authentication Letter record-ka lama helin.",

    wrongType:
      "Record-kan ma aha Authentication Letter.",

    network:
      "Waxaa dhacay cilad marka la soo akhrinayay xogta. Fadlan isku day mar kale."

  };


  /* =======================================================
     SUPABASE CLIENT
  ======================================================= */

  let db = null;


  function createSupabaseClient() {

    /*
      Reuse an existing EMS client if one is already available.
      Otherwise use the same public Supabase configuration
      already used by the existing EMS.
    */

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

        // Ignore invalid global client.

      }

    }


    /*
      window.supabase is normally the Supabase library,
      not the actual client.
    */

    if (
      window.supabase &&
      typeof window.supabase.createClient === "function"
    ) {

      return window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

    }


    return null;
  }


  /* =======================================================
     URL
  ======================================================= */

  function getRecordIdFromURL() {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const value =
      params.get("regen");

    return value
      ? value.trim()
      : "";

  }


  /* =======================================================
     NORMALIZATION
  ======================================================= */

  function normalizeType(value) {

    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

  }


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
     DATE
  ======================================================= */

  function formatDate(value) {

    if (!value) {
      return "N/A";
    }


    let dateValue =
      String(value);


    /*
      Avoid timezone shifting for YYYY-MM-DD.
    */

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        dateValue
      )
    ) {

      dateValue +=
        "T00:00:00Z";

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
     ERROR
  ======================================================= */

  function showError(
    message,
    detail = ""
  ) {

    console.error(
      "[GAawow Authentication Letter]",
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
     RECORD TYPE
  ======================================================= */

  function isAuthenticationLetter(
    record
  ) {

    const type =
      normalizeType(
        record.certificate_type
      );


    /*
      Primary check.
    */

    if (
      type ===
      "authentication_letter"
    ) {

      return true;

    }


    /*
      Compatibility with older records.
    */

    if (
      type.includes(
        "authentication"
      )
    ) {

      return true;

    }


    /*
      Existing GAawow Authentication IDs
      are an additional safety fallback.
    */

    if (
      !type &&
      /^GAA-AUTH/i.test(
        String(
          record.certificate_id || ""
        )
      )
    ) {

      return true;

    }


    return false;

  }


  /* =======================================================
     FETCH CERTIFICATE RECORD
  ======================================================= */

  async function fetchAuthenticationRecord(
    client,
    recordId
  ) {

    /*
      PRIMARY:
      The regen parameter normally contains
      certificates.id.
    */

    let response =
      await client
        .from("certificates")
        .select("*")
        .eq("id", recordId)
        .maybeSingle();


    /*
      UUID type mismatch can happen if somebody
      accidentally supplies certificate_id or
      another identifier.

      Do not let that break the page.
    */

    if (
      response.error &&
      !/invalid input syntax/i.test(
        response.error.message || ""
      )
    ) {

      throw response.error;

    }


    if (response.data) {

      return response.data;

    }


    /*
      Compatibility fallback:
      certificate_id
    */

    response =
      await client
        .from("certificates")
        .select("*")
        .eq(
          "certificate_id",
          recordId
        )
        .limit(1);


    if (
      !response.error &&
      response.data &&
      response.data.length
    ) {

      return response.data[0];

    }


    /*
      Compatibility fallback:
      certificate_no
    */

    response =
      await client
        .from("certificates")
        .select("*")
        .eq(
          "certificate_no",
          recordId
        )
        .limit(1);


    if (
      !response.error &&
      response.data &&
      response.data.length
    ) {

      return response.data[0];

    }


    /*
      Compatibility fallback:
      verify_code
    */

    response =
      await client
        .from("certificates")
        .select("*")
        .eq(
          "verify_code",
          recordId
        )
        .limit(1);


    if (
      !response.error &&
      response.data &&
      response.data.length
    ) {

      return response.data[0];

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

    try {

      if (
        !record.verify_code ||
        !record.certificate_id
      ) {

        return {};

      }


      const response =
        await client.rpc(
          "verify_authentication_letter",
          {
            p_code:
              record.verify_code,

            p_id:
              record.certificate_id
          }
        );


      if (
        response.error ||
        !response.data
      ) {

        return {};

      }


      const data =
        Array.isArray(
          response.data
        )
          ? response.data[0]
          : response.data;


      return data || {};

    } catch (error) {

      /*
        RPC enrichment is optional.
        Authentication Letter must continue
        even if RPC enrichment fails.
      */

      console.warn(
        "Authentication RPC enrichment failed:",
        error
      );

      return {};

    }

  }


  /* =======================================================
  /* =======================================================
   STUDENT DATA FALLBACK
   ======================================================= */

async function loadStudentFallback(
  client,
  record
) {

  if (!record.student_id) {
    return {};
  }

  try {

    const response =
      await client
        .from("students")
        .select("*")
        .eq(
          "id",
          record.student_id
        )
        .maybeSingle();


    if (
      response.error ||
      !response.data
    ) {

      console.warn(
        "Student fallback unavailable:",
        response.error
      );

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
     RENDER STUDENT INFORMATION
  ======================================================= */

  function renderStudentInformation(
    record,
    extras,
    student
  ) {

    const studentName =
      record.student_name_snapshot ||
      extras.student_name ||
      student.full_name;


    const courseName =
      record.course_name_snapshot ||
      extras.course_name;


    $("studentName").textContent =
      text(studentName);


    $("courseName").textContent =
      text(courseName);


    $("institution").textContent =
      text(
        extras.institution_name ||
        "GAawow Academy"
      );


    $("dateStarted").textContent =
      formatDate(
        extras.date_started ||
        record.date_started ||
        record.start_date
      );


    $("dateCompleted").textContent =
      formatDate(
        extras.date_completed ||
        record.date_completed ||
        record.end_date
      );


    $("issueDate").textContent =
      formatDate(
        record.issue_date ||
        extras.issue_date
      );


    $("expiryDate").textContent =
      formatDate(
        record.expiry_date ||
        extras.expiry_date
      );


    /*
      Student Photo
    */

    const photoURL =
      record.student_photo_url ||
      extras.student_photo_url;


    const photoBox =
      $("photoBox");

    const photo =
      $("photo");


    if (
      photoURL &&
      photoBox &&
      photo
    ) {

      photo.onerror =
        function () {

          photoBox.hidden = true;

        };


      photo.onload =
        function () {

          photoBox.hidden = false;

        };


      photo.src =
        photoURL;

    } else {

      photoBox.hidden =
        true;

    }

  }


  /* =======================================================
     AUTHENTICATION INFORMATION
  ======================================================= */

  function renderAuthenticationInformation(
    record,
    extras
  ) {

    $("refNo").textContent =
      text(
        record.certificate_no ||
        extras.reference_no
      );


    $("authId").textContent =
      text(
        record.certificate_id ||
        extras.authentication_id
      );


    $("verifyCode").textContent =
      text(
        record.verify_code ||
        extras.verification_code
      );

  }


  /* =======================================================
     STATUS
  ======================================================= */

  function renderStatus(
    record,
    extras
  ) {

    const rawStatus =
      String(
        record.status ||
        extras.status ||
        "N/A"
      ).trim();


    const status =
      $("status");


    status.textContent =
      rawStatus.toUpperCase();


    status.className =
      "badge";


    const normalized =
      rawStatus.toLowerCase();


    if (
      normalized === "valid" ||
      normalized === "graduated"
    ) {

      status.classList.add(
        "ok"
      );

    }


    else if (
      normalized === "pending"
    ) {

      status.classList.add(
        "warn"
      );

    }


    else if (
      normalized === "expired" ||
      normalized === "revoked"
    ) {

      status.classList.add(
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

    /*
      1. Existing stored URL
    */

    if (
      record.verification_url
    ) {

      return record.verification_url;

    }


    if (
      extras.verification_url
    ) {

      return extras.verification_url;

    }


    const code =
      record.verify_code ||
      extras.verification_code;


    const authId =
      record.certificate_id ||
      extras.authentication_id;


    if (!code) {

      return "";

    }


    /*
      Build the existing GAawow
      verify-auth.html URL.
    */

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
      encodeURIComponent(code);


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
      !verificationURL ||
      typeof QRCode === "undefined"
    ) {

      box.innerHTML = `
        <span
          style="
            font-size:7px;
            color:#697386;
            text-align:center;
          "
        >
          QR unavailable
        </span>
      `;

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
        "QR generation error:",
        error
      );

    }

  }


  /* =======================================================
     ACADEMIC RESULTS
  ======================================================= */

  async function loadAcademicResults(
    client,
    record
  ) {

    /*
      Results are OPTIONAL.

      If anything fails here,
      return [].

      The Authentication Letter
      must still open.
    */

    try {

      if (!record.student_id) {

        return [];

      }


      /*
        Load published results for
        this student.

        Existing results.js uses:
        results.student_id
        results.exam_id
        results.subject_id
        results.score
        results.max_score
        results.percentage
        results.grade
        results.is_published
      */

      const resultResponse =
        await client
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
          );


      if (
        resultResponse.error
      ) {

        console.warn(
          "Academic results unavailable:",
          resultResponse.error
        );

        return [];

      }


      let rows =
        resultResponse.data ||
        [];


      if (!rows.length) {

        return [];

      }


      /*
        Load subjects.
      */

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

        const subjectResponse =
          await client
            .from("subjects")
            .select(`
              id,
              name,
              code
            `)
            .in(
              "id",
              subjectIDs
            );


        if (
          !subjectResponse.error
        ) {

          subjects =
            subjectResponse.data ||
            [];

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


      /*
        Load exams.
      */

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

        const examResponse =
          await client
            .from("exams")
            .select(`
              id,
              title,
              exam_type,
              exam_date,
              course_id
            `)
            .in(
              "id",
              examIDs
            );


        if (
          !examResponse.error
        ) {

          exams =
            examResponse.data ||
            [];

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


      /*
        Add subject + exam information.
      */

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


      /*
        If the certificate is tied to a course,
        prefer results from that course.
      */

      if (record.course_id) {

        const courseRows =
          rows.filter(
            row =>
              row.course_id ===
              record.course_id
          );


        if (courseRows.length) {

          rows =
            courseRows;

        }

      }


      /*
        Prefer FINAL exam results when
        a final exam exists.

        This avoids showing quiz/midterm
        duplicates on the official letter.
      */

      const finalRows =
        rows.filter(
          row =>
            String(
              row.exam_type || ""
            ).toLowerCase() ===
            "final"
        );


      if (finalRows.length) {

        rows =
          finalRows;

      }


      /*
        Sort by subject name.
      */

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


      /*
        If duplicate results for the
        same subject exist, retain the
        most recent row.
      */

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
        "Academic results loading failed:",
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


    /*
      Same grading logic already
      used by the existing results.js.
    */

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


    /*
      Existing EMS grading system
      considers 50% as pass.
    */

    if (
      !Number.isNaN(p)
    ) {

      return p >= 50
        ? "PASS"
        : "FAIL";

    }


    if (
      String(
        grade || ""
      ).toUpperCase() === "F"
    ) {

      return "FAIL";

    }


    return "PASS";

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


    body.innerHTML = "";

    foot.innerHTML = "";


    /*
      NO RESULTS:
      Do not break Authentication Letter.
    */

    if (
      !rows ||
      !rows.length
    ) {

      section.hidden =
        true;

      noResults.hidden =
        false;

      return;

    }


    section.hidden =
      false;

    noResults.hidden =
      true;


    let total =
      0;

    let totalMax =
      0;

    let count =
      0;

    let passed =
      0;


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

          totalMax +=
            maxScore;

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


        if (
          !Number.isNaN(score)
        ) {

          markCell.textContent =
            !Number.isNaN(maxScore)
              ? `${score} / ${maxScore}`
              : String(score);

        } else {

          markCell.textContent =
            "N/A";

        }


        const gradeCell =
          document.createElement(
            "td"
          );


        gradeCell.textContent =
          text(grade);


        const resultCell =
          document.createElement(
            "td"
          );


        resultCell.textContent =
          result;


        if (
          result === "PASS"
        ) {

          resultCell.classList.add(
            "pass"
          );

        } else {

          resultCell.classList.add(
            "fail"
          );

        }


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


    /*
      Summary
    */

    const summary =
      document.createElement(
        "tr"
      );


    const summaryLabel =
      document.createElement(
        "td"
      );


    summaryLabel.textContent =
      "TOTAL / AVERAGE";


    const summaryMarks =
      document.createElement(
        "td"
      );


    let average =
      0;


    if (count > 0) {

      average =
        total /
        count;

    }


    summaryMarks.textContent =
      totalMax > 0
        ? `${total} / ${totalMax}`
        : String(total);


    const summaryGrade =
      document.createElement(
        "td"
      );


    if (count > 0) {

      summaryGrade.textContent =
        calculateGrade(
          (
            total /
            (
              totalMax ||
              count
            )
          ) * 100
        );

    } else {

      summaryGrade.textContent =
        "N/A";

    }


    const summaryResult =
      document.createElement(
        "td"
      );


    summaryResult.textContent =
      passed === rows.length
        ? "PASS"
        : "REVIEW";


    summary.appendChild(
      summaryLabel
    );

    summary.appendChild(
      summaryMarks
    );

    summary.appendChild(
      summaryGrade
    );

    summary.appendChild(
      summaryResult
    );


    foot.appendChild(
      summary
    );

  }


  /* =======================================================
     LOAD EVERYTHING
  ======================================================= */

  async function loadAuthenticationLetter() {

    const recordId =
      getRecordIdFromURL();


    /*
      1. Check URL
    */

    if (!recordId) {

      showError(
        MSG.noId
      );

      return;

    }


    /*
      2. Supabase client
    */

    db =
      createSupabaseClient();


    if (!db) {

      showError(
        MSG.network,
        "Supabase client lama helin."
      );

      return;

    }


    let record;


    /*
      3. Load certificate record
    */

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


    /*
      4. Record not found
    */

    if (!record) {

      showError(
        MSG.notFound
      );

      return;

    }


    /*
      5. Confirm Authentication Letter
    */

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


    /*
      6. Load optional data.

      Important:
      Academic Results failure
      MUST NOT break the letter.
    */

    const extrasPromise =
      loadAuthenticationExtras(
        db,
        record
      );


    const studentPromise =
      loadStudentFallback(
        db,
        record
      );


    const resultsPromise =
      loadAcademicResults(
        db,
        record
      );


    const [
      extras,
      student,
      results
    ] =
      await Promise.all([
        extrasPromise,
        studentPromise,
        resultsPromise
      ]);


    /*
      7. Render
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


    renderAcademicResults(
      results
    );


    /*
      8. QR
    */

    const verificationURL =
      getVerificationURL(
        record,
        extras
      );


    renderQRCode(
      verificationURL
    );


    /*
      9. Show document
    */

    $("loadingState").hidden =
      true;

    $("errorState").hidden =
      true;

    $("letter").hidden =
      false;


    $("printBtn").disabled =
      false;


    /*
      10. Document title
    */

    document.title =
      "Authentication Letter - " +
      text(
        record.certificate_id
      );

  }


  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initializePage() {

    const printBtn =
      $("printBtn");


    const retryBtn =
      $("retryBtn");


    if (printBtn) {

      printBtn.addEventListener(
        "click",
        function () {

          window.print();

        }
      );

    }


    if (retryBtn) {

      retryBtn.addEventListener(
        "click",
        function () {

          $("errorState").hidden =
            true;

          $("loadingState").hidden =
            false;

          $("letter").hidden =
            true;

          if (printBtn) {
            printBtn.disabled =
              true;
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
