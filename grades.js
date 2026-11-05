
"use strict";

/* =========================================================
   GAAWOW EMS — GRADE MANAGEMENT V2

   Roles:
   1. Super Admin: all institutions.
   2. School Admin: own institution only.

   Published reports:
   1. Prefer published subject rows from results.
   2. Use grades only for missing subjects.
   3. Ignore aggregate scores greater than exam maximum.
   4. Never add aggregate totals to subject scores.

   Database / SQL is not altered by this file.
   ========================================================= */

(() => {
  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const $ = id => document.getElementById(id);

  const state = {
    user: null,
    profile: null,
    institutions: [],
    students: [],
    exams: [],
    grades: [],
    results: [],
    subjects: [],
    reportStudentId: null
  };

  const isSchoolAdmin = () =>
    state.profile?.role === "school_admin";

  const isSuperAdmin = () =>
    state.profile?.role === "super_admin";

  const ownInstitutionId = () =>
    state.profile?.institution_id || null;

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function percent(score, maximum) {
    maximum = number(maximum);
    return maximum > 0
      ? number(score) / maximum * 100
      : 0;
  }

  function calculateGrade(value) {
    if (value >= 90) return "A+";
    if (value >= 80) return "A";
    if (value >= 70) return "B";
    if (value >= 60) return "C";
    if (value >= 50) return "D";
    return "F";
  }

  function gradeStyle(grade) {
    return String(grade || "").toUpperCase() === "F"
      ? "fail"
      : "pass";
  }

  function normalise(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function showNotice(message, type = "info") {
    const box = $("notice");
    if (!box) {
      console[type === "error" ? "error" : "log"](message);
      return;
    }

    box.textContent = message;
    box.className = `notice show ${type}`;

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    if (type === "success") {
      setTimeout(() => {
        box.className = "notice";
      }, 4500);
    }
  }

  function clearNotice() {
    if (!$("notice")) return;
    $("notice").className = "notice";
    $("notice").textContent = "";
  }

  function findStudent(id) {
    return state.students.find(student => student.id === id);
  }

  function findExam(id) {
    return state.exams.find(exam => exam.id === id);
  }

  function findSubject(id) {
    return state.subjects.find(subject => subject.id === id);
  }

  function examTitle(id) {
    return findExam(id)?.title || "Untitled exam";
  }

  function examMaximum(id) {
    return number(findExam(id)?.max_score, 100) || 100;
  }

  function studentName(id) {
    return findStudent(id)?.full_name || "Unknown student";
  }

  function subjectNameFromResult(result) {
    const subject = findSubject(result.subject_id);
    return subject?.name || examTitle(result.exam_id);
  }

  function institutionName(institutionId) {
    const institution = state.institutions.find(
      item => item.id === institutionId
    );

    return institution?.name ||
      institution?.institution_name ||
      institution?.code ||
      "GAAWOW Academy";
  }

  async function checkAccess() {
    const {
      data: { session },
      error: sessionError
    } = await db.auth.getSession();

    if (sessionError) throw sessionError;

    if (!session) {
      window.location.href = "index.html";
      return false;
    }

    state.user = session.user;

    const { data: profile, error } = await db
      .from("profiles")
      .select("id, full_name, role, institution_id, is_active")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!profile || profile.is_active === false) {
      await db.auth.signOut();
      window.location.href = "index.html";
      return false;
    }

    state.profile = profile;

    if (!["super_admin", "school_admin"].includes(profile.role)) {
      showNotice(
        "Access denied. This page is for authorized administrators.",
        "error"
      );

      setTimeout(() => {
        window.location.href =
          profile.role === "teacher"
            ? "teacher-portal.html"
            : profile.role === "student"
              ? "student.html"
              : profile.role === "parent"
                ? "parent.html"
                : "dashboard.html";
      }, 1500);

      return false;
    }

    if (isSchoolAdmin() && !profile.institution_id) {
      showNotice(
        "Your School Admin account has no institution assigned. Contact Super Admin.",
        "error"
      );
      return false;
    }

    return true;
  }

  async function loadAll() {
    clearNotice();

    try {
      const schoolAdmin = isSchoolAdmin();
      const institutionId = ownInstitutionId();

      let institutionsQuery = db
        .from("institutions")
        .select("*")
        .order("name");

      let studentsQuery = db
        .from("students")
        .select("*")
        .order("full_name");

      let examsQuery = db
        .from("exams")
        .select("*")
        .order("title");

      let gradesQuery = db
        .from("grades")
        .select("*")
        .order("created_at", { ascending: false });

      let resultsQuery = db
        .from("results")
        .select("*")
        .order("created_at", { ascending: false });

      let subjectsQuery = db
        .from("subjects")
        .select("*")
        .order("name");

      if (schoolAdmin) {
        institutionsQuery = institutionsQuery.eq("id", institutionId);
        studentsQuery = studentsQuery.eq("institution_id", institutionId);
        examsQuery = examsQuery.eq("institution_id", institutionId);
        gradesQuery = gradesQuery.eq("institution_id", institutionId);
        resultsQuery = resultsQuery.eq("institution_id", institutionId);
        subjectsQuery = subjectsQuery.eq("institution_id", institutionId);
      }

      const requests = await Promise.all([
        institutionsQuery,
        studentsQuery,
        examsQuery,
        gradesQuery,
        resultsQuery,
        subjectsQuery
      ]);

      const tableNames = [
        "institutions",
        "students",
        "exams",
        "grades",
        "results",
        "subjects"
      ];

      for (let i = 0; i < requests.length; i++) {
        if (requests[i].error) {
          throw new Error(
            `${tableNames[i]}: ${requests[i].error.message}`
          );
        }
      }

      state.institutions = requests[0].data || [];
      state.students = requests[1].data || [];
      state.exams = requests[2].data || [];
      state.grades = requests[3].data || [];
      state.results = requests[4].data || [];
      state.subjects = requests[5].data || [];

      populateSelects();
      renderStats();
      renderGradeTable();

      if (state.reportStudentId) {
        renderStudentReport(state.reportStudentId);
      }
    } catch (error) {
      console.error("Grade Management loading error:", error);

      showNotice(
        "Could not load data: " +
        error.message +
        ". Check Supabase table access and RLS policies.",
        "error"
      );
    }
  }

  function fillSelect(
    select,
    rows,
    valueFn,
    labelFn,
    placeholder
  ) {
    if (!select) return;

    const previous = select.value;

    select.innerHTML =
      `<option value="">${escapeHTML(placeholder)}</option>` +
      rows.map(row => `
        <option value="${escapeHTML(valueFn(row))}">
          ${escapeHTML(labelFn(row))}
        </option>
      `).join("");

    if (rows.some(row => String(valueFn(row)) === previous)) {
      select.value = previous;
    }
  }

  function lockSchoolAdminInstitutionSelects() {
    if (!isSchoolAdmin()) return;

    const institutionId = ownInstitutionId();

    [
      "institutionSelect",
      "institutionFilter",
      "reportInstitutionSelect"
    ].forEach(id => {
      const select = $(id);
      if (!select) return;

      select.value = institutionId;
      select.disabled = true;
    });
  }

  function populateSelects() {
    const institutions = state.institutions;

    fillSelect(
      $("institutionSelect"),
      institutions,
      x => x.id,
      x => x.name || x.institution_name || x.code || x.id,
      "Select institution"
    );

    fillSelect(
      $("institutionFilter"),
      institutions,
      x => x.id,
      x => x.name || x.institution_name || x.code || x.id,
      "All institutions"
    );

    fillSelect(
      $("reportInstitutionSelect"),
      institutions,
      x => x.id,
      x => x.name || x.institution_name || x.code || x.id,
      "All institutions"
    );

    fillSelect(
      $("studentSelect"),
      state.students,
      x => x.id,
      x => `${x.full_name || "Unnamed"}${x.student_id ? " • " + x.student_id : ""}`,
      "Select student"
    );

    fillSelect(
      $("reportStudentSelect"),
      state.students,
      x => x.id,
      x => `${x.full_name || "Unnamed"}${x.student_id ? " • " + x.student_id : ""}`,
      "Select student"
    );

    if (isSchoolAdmin()) {
      lockSchoolAdminInstitutionSelects();

      $("institutionSelect").value = ownInstitutionId();
      $("institutionFilter").value = ownInstitutionId();
      $("reportInstitutionSelect").value = ownInstitutionId();
    }

    updateExamOptions();
  }

  function updateExamOptions() {
    const institutionId = isSchoolAdmin()
      ? ownInstitutionId()
      : $("institutionSelect").value;

    const exams = state.exams.filter(exam =>
      (!institutionId || exam.institution_id === institutionId)
    );

    fillSelect(
      $("examSelect"),
      exams,
      x => x.id,
      x => `${x.title || "Untitled exam"} (${number(x.max_score, 100)} marks)`,
      "Select exam / subject"
    );

    updateMaximum();
  }

  function updateMaximum() {
    const exam = findExam($("examSelect").value);
    const maximum = number(exam?.max_score, 100) || 100;

    $("maxScoreInput").value = maximum;

    updateScorePreview();
  }

  function updateScorePreview() {
    const score = number($("scoreInput").value);
    const maximum = number($("maxScoreInput").value, 100) || 100;
    const value = percent(score, maximum);

    $("percentInput").value = value.toFixed(2) + "%";
    $("gradeInput").value = calculateGrade(value);
  }

  /*
   * Exclude aggregate records where recorded score exceeds
   * the maximum score of the linked exam.
   */
  function getSubjectGradeRows() {
    return state.grades.filter(row => {
      const maximum = examMaximum(row.exam_id);
      const score = number(row.score);

      return score >= 0 && score <= maximum;
    });
  }

  function renderStats() {
    const published = state.results.filter(row =>
      row.is_published === true
    );

    const studentIds = new Set(
      published.map(row => row.student_id)
    );

    const percentages = published
      .filter(row => number(row.max_score) > 0)
      .map(row => percent(row.score, row.max_score));

    const average = percentages.length
      ? percentages.reduce((a, b) => a + b, 0) / percentages.length
      : 0;

    $("statRecords").textContent = state.grades.length;
    $("statStudents").textContent = studentIds.size;
    $("statPublished").textContent = published.length;
    $("statAverage").textContent = average.toFixed(1) + "%";
  }

  function renderGradeTable() {
    const query = normalise($("gradeSearch").value);

    const institutionId = isSchoolAdmin()
      ? ownInstitutionId()
      : $("institutionFilter").value;

    const rows = getSubjectGradeRows().filter(row => {
      const student = findStudent(row.student_id);
      const exam = findExam(row.exam_id);

      const text = normalise(
        `${student?.full_name || ""} ${student?.student_id || ""} ${exam?.title || ""}`
      );

      return (!institutionId || row.institution_id === institutionId) &&
        (!query || text.includes(query));
    });

    $("gradeCountLabel").textContent =
      `${rows.length} subject records`;

    const body = $("gradesTableBody");

    if (!rows.length) {
      body.innerHTML = `
        <tr>
          <td colspan="6" class="empty">No grade records found.</td>
        </tr>
      `;
      return;
    }

    body.innerHTML = rows.map(row => {
      const maximum = examMaximum(row.exam_id);
      const p = percent(row.score, maximum);
      const grade = row.grade || calculateGrade(p);
      const student = findStudent(row.student_id);

      return `
        <tr>
          <td>
            <strong>${escapeHTML(student?.full_name || "Unknown")}</strong><br>
            <small>${escapeHTML(student?.student_id || "")}</small>
          </td>

          <td>${escapeHTML(examTitle(row.exam_id))}</td>

          <td>${number(row.score).toFixed(2)} / ${maximum}</td>

          <td>${p.toFixed(1)}%</td>

          <td>
            <span class="pill ${gradeStyle(grade)}">
              ${escapeHTML(grade)}
            </span>
          </td>

          <td>
            <button class="btn btn-light btn-small"
                    data-edit="${escapeHTML(row.id)}"
                    title="Edit grade">
              <i class="fa-solid fa-pen"></i>
            </button>

            <button class="btn btn-danger btn-small"
                    data-delete="${escapeHTML(row.id)}"
                    title="Delete grade">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function saveGrade(event) {
    event.preventDefault();

    const id = $("gradeId").value;

    const institutionId = isSchoolAdmin()
      ? ownInstitutionId()
      : $("institutionSelect").value;

    const examId = $("examSelect").value;
    const studentId = $("studentSelect").value;
    const score = Number($("scoreInput").value);

    const exam = findExam(examId);
    const student = findStudent(studentId);
    const maximum = examMaximum(examId);

    if (
      !institutionId ||
      !examId ||
      !studentId ||
      !exam ||
      !student ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > maximum
    ) {
      showNotice(
        `Choose institution, exam and student. Score must be between 0 and ${maximum}.`,
        "error"
      );
      return;
    }

    if (
      exam.institution_id !== institutionId ||
      student.institution_id !== institutionId ||
      (isSchoolAdmin() && institutionId !== ownInstitutionId())
    ) {
      showNotice(
        "Security check failed. The exam and student must belong to your institution.",
        "error"
      );
      return;
    }

    if (id) {
      const existing = state.grades.find(row => row.id === id);

      if (
        !existing ||
        (isSchoolAdmin() &&
          existing.institution_id !== ownInstitutionId())
      ) {
        showNotice("You cannot edit this grade record.", "error");
        return;
      }
    }

    const payload = {
      institution_id: institutionId,
      exam_id: examId,
      student_id: studentId,
      score: score,
      grade: calculateGrade(percent(score, maximum)),
      remarks: $("remarksInput").value.trim() || null,
      entered_by: state.user.id
    };

    $("saveGradeBtn").disabled = true;

    try {
      let response;

      if (id) {
        response = await db
          .from("grades")
          .update(payload)
          .eq("id", id)
          .eq("institution_id", institutionId);
      } else {
        response = await db
          .from("grades")
          .insert(payload);
      }

      if (response.error) throw response.error;

      showNotice(
        id ? "Grade updated successfully." : "Grade saved successfully.",
        "success"
      );

      resetForm();
      await loadAll();
    } catch (error) {
      console.error(error);

      showNotice(
        "Could not save grade: " + error.message,
        "error"
      );
    } finally {
      $("saveGradeBtn").disabled = false;
    }
  }

  function editGrade(id) {
    const row = state.grades.find(item => item.id === id);

    if (!row) return;

    if (
      isSchoolAdmin() &&
      row.institution_id !== ownInstitutionId()
    ) {
      showNotice("You cannot edit another institution's grade.", "error");
      return;
    }

    $("gradeId").value = row.id;
    $("institutionSelect").value = row.institution_id || "";

    updateExamOptions();

    $("examSelect").value = row.exam_id || "";
    $("studentSelect").value = row.student_id || "";
    $("scoreInput").value = row.score;
    $("remarksInput").value = row.remarks || "";

    updateMaximum();

    $("saveGradeBtn").innerHTML =
      '<i class="fa-solid fa-floppy-disk"></i> Update Grade';

    $("entryCard").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  async function deleteGrade(id) {
    const row = state.grades.find(item => item.id === id);

    if (!row) return;

    if (
      isSchoolAdmin() &&
      row.institution_id !== ownInstitutionId()
    ) {
      showNotice("You cannot delete another institution's grade.", "error");
      return;
    }

    const confirmed = confirm(
      `Delete the grade record for ${studentName(row.student_id)} / ${examTitle(row.exam_id)}?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    try {
      let query = db
        .from("grades")
        .delete()
        .eq("id", id);

      if (isSchoolAdmin()) {
        query = query.eq("institution_id", ownInstitutionId());
      }

      const { error } = await query;

      if (error) throw error;

      showNotice("Grade record deleted.", "success");

      await loadAll();
    } catch (error) {
      showNotice(
        "Could not delete grade: " + error.message,
        "error"
      );
    }
  }

  function resetForm() {
    $("gradeForm").reset();

    $("gradeId").value = "";
    $("maxScoreInput").value = "100";
    $("percentInput").value = "0%";
    $("gradeInput").value = "F";

    $("saveGradeBtn").innerHTML =
      '<i class="fa-solid fa-floppy-disk"></i> Save Grade';

    if (isSchoolAdmin()) {
      $("institutionSelect").value = ownInstitutionId();
    }

    updateExamOptions();
  }

  /*
   * Published results are preferred.
   * Grades are fallback only for missing subjects.
   * Aggregate totals above exam maximum are ignored.
   */
  function buildReport(studentId) {
    const student = findStudent(studentId);

    if (!student) return null;

    if (
      isSchoolAdmin() &&
      student.institution_id !== ownInstitutionId()
    ) {
      return null;
    }

    const subjectMap = new Map();

    const published = state.results.filter(row =>
      row.student_id === studentId &&
      row.is_published === true &&
      (!isSchoolAdmin() ||
        row.institution_id === ownInstitutionId())
    );

    published.forEach(row => {
      const name = subjectNameFromResult(row);
      const key = normalise(name);

      if (!key) return;

      const candidate = {
        key,
        name,
        score: number(row.score),
        maximum: number(row.max_score, 100) || 100,
        grade: row.grade || null,
        source: "results",
        published: true,
        updated: String(row.updated_at || row.created_at || "")
      };

      const previous = subjectMap.get(key);

      if (!previous || candidate.updated > previous.updated) {
        subjectMap.set(key, candidate);
      }
    });

    getSubjectGradeRows()
      .filter(row =>
        row.student_id === studentId &&
        (!isSchoolAdmin() ||
          row.institution_id === ownInstitutionId())
      )
      .forEach(row => {
        const name = examTitle(row.exam_id);
        const key = normalise(name);

        if (!key || subjectMap.has(key)) return;

        const maximum = examMaximum(row.exam_id);

        subjectMap.set(key, {
          key,
          name,
          score: number(row.score),
          maximum,
          grade: row.grade || null,
          source: "grades",
          published: false,
          updated: String(row.updated_at || row.created_at || "")
        });
      });

    const subjects = [...subjectMap.values()]
      .sort((a, b) => a.name.localeCompare(b.name));

    const totalScore = subjects.reduce(
      (sum, row) => sum + row.score,
      0
    );

    const totalMaximum = subjects.reduce(
      (sum, row) => sum + row.maximum,
      0
    );

    const overallPercentage = totalMaximum > 0
      ? totalScore / totalMaximum * 100
      : 0;

    const passed = subjects.filter(
      row => percent(row.score, row.maximum) >= 50
    ).length;

    const failed = subjects.length - passed;

    return {
      student,
      subjects,
      totalScore,
      totalMaximum,
      overallPercentage,
      overallGrade: calculateGrade(overallPercentage),
      passed,
      failed,
      publishedCount: subjects.filter(row => row.published).length
    };
  }

  function renderStudentReport(studentId) {
    const report = buildReport(studentId);
    const container = $("reportContainer");

    if (!report || !report.subjects.length) {
      container.innerHTML = `
        <div class="empty">
          No subject results found for this student.
        </div>
      `;
      return;
    }

    state.reportStudentId = studentId;

    const student = report.student;

    const rows = report.subjects.map((subject, index) => {
      const p = percent(subject.score, subject.maximum);
      const grade = subject.grade || calculateGrade(p);
      const status = p >= 50 ? "PASS" : "FAIL";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHTML(subject.name)}</td>
          <td>${subject.score.toFixed(2)}</td>
          <td>${subject.maximum.toFixed(2)}</td>
          <td>${p.toFixed(2)}%</td>
          <td>${escapeHTML(grade)}</td>
          <td>
            <span class="pill ${gradeStyle(grade)}">${status}</span>
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <div class="report-brand">
        <img
          src="https://i.ibb.co/4ZCRpm30/gaawow-logo.png"
          alt="GAAWOW Academy Logo">

        <div>
          <h2>GAAWOW ACADEMY</h2>
          <p>ILAYSKA AQOONTA IYO XIRFADDA</p>
          <p>BURHAKABA, BAY, SOMALIA</p>
          <p><strong>STUDENT ACADEMIC RESULT REPORT</strong></p>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px">
        <div>
          <strong>Student Name:</strong>
          ${escapeHTML(student.full_name || "Unknown")}
          <br>
          <strong>Student ID:</strong>
          ${escapeHTML(student.student_id || "N/A")}
          <br>
          <strong>Institution:</strong>
          ${escapeHTML(institutionName(student.institution_id))}
        </div>

        <div>
          <strong>Report Date:</strong>
          ${new Date().toLocaleDateString()}
          <br>
          <strong>Results:</strong>
          ${report.publishedCount} published subject(s)
        </div>
      </div>

      <div class="summary">
        <div class="summary-box">
          <span>TOTAL SCORE</span>
          <strong>${report.totalScore.toFixed(2)}</strong>
        </div>

        <div class="summary-box">
          <span>MAXIMUM SCORE</span>
          <strong>${report.totalMaximum.toFixed(2)}</strong>
        </div>

        <div class="summary-box">
          <span>OVERALL PERCENTAGE</span>
          <strong>${report.overallPercentage.toFixed(2)}%</strong>
        </div>

        <div class="summary-box">
          <span>OVERALL GRADE</span>
          <strong>${report.overallGrade}</strong>
        </div>
      </div>

      <h3>Subject Results</h3>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Subject</th>
              <th>Score</th>
              <th>Maximum</th>
              <th>Percentage</th>
              <th>Grade</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>${rows}</tbody>

          <tfoot>
            <tr>
              <th colspan="2">TOTAL (${report.subjects.length} subjects)</th>
              <th>${report.totalScore.toFixed(2)}</th>
              <th>${report.totalMaximum.toFixed(2)}</th>
              <th>${report.overallPercentage.toFixed(2)}%</th>
              <th>${report.overallGrade}</th>
              <th>${report.failed ? report.failed + " failed" : "All passed"}</th>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <span class="pill pass">Passed: ${report.passed}</span>
        <span class="pill fail">Failed: ${report.failed}</span>
        <span class="pill">Subjects: ${report.subjects.length}</span>
      </div>

      <div class="report-footer">
        <div class="signature">Registrar / Academic Office</div>
        <div class="signature">Director, GAAWOW Academy</div>
      </div>

      <p style="font-size:10px;color:#64748B;margin-top:22px;line-height:1.6">
        Report policy: published subject results are preferred.
        Grade records are used only when no published result exists
        for the same subject. Aggregate records are excluded from
        subject totals. Verify conflicting source scores before
        issuing an official transcript.
      </p>
    `;
  }

  function viewReport() {
    const studentId = $("reportStudentSelect").value;

    const institutionId = isSchoolAdmin()
      ? ownInstitutionId()
      : $("reportInstitutionSelect").value;

    if (!studentId) {
      showNotice("Please select a student first.", "error");
      return;
    }

    const student = findStudent(studentId);

    if (
      !student ||
      (institutionId &&
        student.institution_id !== institutionId) ||
      (isSchoolAdmin() &&
        student.institution_id !== ownInstitutionId())
    ) {
      showNotice(
        "The selected student does not belong to your institution.",
        "error"
      );
      return;
    }

    clearNotice();
    renderStudentReport(studentId);
  }

  function bindEvents() {
    $("gradeForm").addEventListener("submit", saveGrade);

    $("institutionSelect").addEventListener(
      "change",
      () => {
        if (isSchoolAdmin()) {
          $("institutionSelect").value = ownInstitutionId();
        }
        updateExamOptions();
      }
    );

    $("examSelect").addEventListener(
      "change",
      updateMaximum
    );

    $("scoreInput").addEventListener(
      "input",
      updateScorePreview
    );

    $("gradeSearch").addEventListener(
      "input",
      renderGradeTable
    );

    $("institutionFilter").addEventListener(
      "change",
      () => {
        if (isSchoolAdmin()) {
          $("institutionFilter").value = ownInstitutionId();
        }
        renderGradeTable();
      }
    );

    $("gradesTableBody").addEventListener("click", event => {
      const editButton = event.target.closest("[data-edit]");
      const deleteButton = event.target.closest("[data-delete]");

      if (editButton) editGrade(editButton.dataset.edit);
      if (deleteButton) deleteGrade(deleteButton.dataset.delete);
    });

    $("resetFormBtn").addEventListener("click", resetForm);

    $("newGradeBtn").addEventListener("click", () => {
      resetForm();

      $("entryCard").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    $("viewReportBtn").addEventListener("click", viewReport);

    $("reportStudentSelect").addEventListener("change", () => {
      const id = $("reportStudentSelect").value;

      if (id) {
        renderStudentReport(id);
      }
    });

    $("reportInstitutionSelect").addEventListener("change", () => {
      if (isSchoolAdmin()) {
        $("reportInstitutionSelect").value = ownInstitutionId();
      }
    });

    $("printReportBtn").addEventListener("click", () => {
      if (!$("reportContainer").querySelector("table")) {
        viewReport();
      }

      if ($("reportContainer").querySelector("table")) {
        window.print();
      }
    });

    $("refreshBtn").addEventListener("click", loadAll);

    $("signOutBtn").addEventListener("click", async () => {
      const { error } = await db.auth.signOut();

      if (error) {
        showNotice(error.message, "error");
      } else {
        window.location.href = "index.html";
      }
    });
  }

  async function init() {
    bindEvents();

    try {
      const allowed = await checkAccess();

      if (allowed) {
        await loadAll();
      }
    } catch (error) {
      console.error(error);

      showNotice(
        "Access or loading error: " + error.message,
        "error"
      );
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
