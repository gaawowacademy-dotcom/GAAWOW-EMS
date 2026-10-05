const SUPABASE_URL = "https://mytyvqwrxnxpxnxpiicj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

async function loadStudentPortal() {
  try {
    const {
      data: { user },
      error: authError
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      window.location.href = "login.html";
      return;
    }

    // 1. Profile-ka student-ka
    const { data: profile, error: profileError } =
      await supabaseClient
        .from("profiles")
        .select(`
          id,
          full_name,
          phone,
          avatar_url,
          role,
          is_active
        `)
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(profileError);
      alert("Unable to verify student profile.");
      return;
    }

    if (!profile) {
      alert("Student profile not found.");
      await supabaseClient.auth.signOut();
      window.location.href = "login.html";
      return;
    }

    // STUDENT ONLY
    if (profile.role !== "student") {
      alert("This account is not a student account.");
      await supabaseClient.auth.signOut();
      window.location.href = "login.html";
      return;
    }

    if (profile.is_active !== true) {
      alert("Your student account is inactive.");
      await supabaseClient.auth.signOut();
      window.location.href = "login.html";
      return;
    }

    // 2. Student record
    const { data: student, error: studentError } =
      await supabaseClient
        .from("students")
        .select(`
          id,
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
          auth_user_id,
          login_username,
          last_login_at
        `)
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (studentError) {
      console.error(studentError);
      alert("Unable to load student record.");
      return;
    }

    if (!student) {
      alert("Student record not linked to this account.");
      return;
    }

    if (student.account_enabled !== true) {
      alert("Student account is disabled.");
      await supabaseClient.auth.signOut();
      window.location.href = "login.html";
      return;
    }

    // 3. Display student information
    setText("studentName", student.full_name);
    setText("studentFullName", student.full_name);
    setText("studentId", student.student_id);
    setText("studentEmail", student.email || user.email || "—");
    setText("studentPhone", student.phone || profile.phone || "—");
    setText("studentStatus", student.status || "active");

    const photo = document.getElementById("studentPhoto");

    if (photo) {
      photo.src =
        student.photo_url ||
        profile.avatar_url ||
        "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";

      photo.onerror = () => {
        photo.src =
          "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";
      };
    }

    // 4. Update last login
    await supabaseClient
      .from("students")
      .update({
        last_login_at: new Date().toISOString()
      })
      .eq("id", student.id)
      .eq("auth_user_id", user.id);

    console.log("✅ Student portal loaded:", student.student_id);

  } catch (error) {
    console.error("Student portal error:", error);
    alert("Unable to load student portal.");
  }
}

function setText(id, value) {
  const el = document.getElementById(id);

  if (el) {
    el.textContent =
      value === null || value === undefined || value === ""
        ? "—"
        : value;
  }
}

async function logoutStudent() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  loadStudentPortal();

  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutStudent);
  }
});
