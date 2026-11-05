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

  const allowedRoles = ["super_admin", "school_admin"];

  if (!allowedRoles.includes(profile.role)) {
    showNotice("Access denied. Admin access is required.", "error");

    setTimeout(() => {
      window.location.href =
        profile.role === "teacher"
          ? "teacher-portal.html"
          : profile.role === "student"
          ? "student.html"
          : profile.role === "parent"
          ? "parent.html"
          : "index.html";
    }, 1500);

    return false;
  }

  if (
    profile.role === "school_admin" &&
    !profile.institution_id
  ) {
    showNotice(
      "School Admin account has no assigned institution.",
      "error"
    );
    return false;
  }

  state.profile = profile;

  return true;
}
