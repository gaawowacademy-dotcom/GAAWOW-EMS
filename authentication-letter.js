const AUTH_LETTER_SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const AUTH_LETTER_SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const authLetterSupabase =
  window.supabase.createClient(
    AUTH_LETTER_SUPABASE_URL,
    AUTH_LETTER_SUPABASE_KEY
  );

async function loadAuthenticationLetterRecord() {
  const params = new URLSearchParams(window.location.search);
  const regenId = params.get("regen");

  if (!regenId) return null;

  const { data, error } = await authLetterSupabase
    .from("certificates")
    .select("*")
    .eq("id", regenId)
    .single();

  if (error) {
    console.error("Authentication Letter record error:", error);
    alert("Unable to load the selected certificate record.");
    return null;
  }

  return data;
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

async function startAuthenticationLetter() {
  const { data, error } = await authLetterSupabase.auth.getSession();

  if (error || !data.session) {
    window.location.href = "index.html";
    return;
  }

  const record = await loadAuthenticationLetterRecord();
  if (!record) return;

  // Populate common fields when they exist in Authentication Letter.html.
  setValue("institutionSelect", record.institution_id || record.institution_name);
  setValue("studentSelect", record.student_id || record.student_name);
  setValue("courseSelect", record.course_id || record.course_name);
  setValue("certificateNo", record.certificate_no || record.certificate_number);
  setValue("certificateId", record.id);
  setValue("verifyCode", record.verify_code || record.verification_code);
  setValue("dateStarted", record.date_started || record.start_date);
  setValue("dateCompleted", record.date_completed || record.completion_date);
  setValue("issueDate", record.issue_date);
  setValue("expiryDate", record.expiry_date);
  setValue("status", record.status);
  setValue("studentName", record.student_name);
  setValue("courseName", record.course_name);
  setValue("directorName", record.director_name);
  setValue("academicHeadName", record.academic_head_name);

  window.authenticationLetterRecord = record;

  if (typeof window.renderAuthenticationLetter === "function") {
    window.renderAuthenticationLetter(record);
  }
}

document.addEventListener("DOMContentLoaded", startAuthenticationLetter);
