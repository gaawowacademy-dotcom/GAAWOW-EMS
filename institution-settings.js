
"use strict";

/* =========================================================
   GAAWOW EMS
   INSTITUTION SETTINGS V1
   Super Admin + School Admin
   Supabase RLS protected
   ========================================================= */

(() => {
  // -------------------------------------------------------
  // 1. SUPABASE CONFIGURATION
  // -------------------------------------------------------

  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

  const LOGIN_PAGE = "index.html";
  const SUPER_ADMIN_DASHBOARD = "dashboard.html";
  const SCHOOL_ADMIN_DASHBOARD = "school-dashboard.html";
  const LOGO_BUCKET = "institution-logos";
  const MAX_LOGO_SIZE = 2 * 1024 * 1024;

  if (!window.supabase) {
    document.body.innerHTML =
      "<h2 style='font-family:Arial;padding:25px;color:#a32323'>" +
      "Supabase library could not be loaded. Please reload the page." +
      "</h2>";
    return;
  }

  const db = window.supabase.createClient(
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

  // -------------------------------------------------------
  // 2. PAGE ELEMENTS
  // -------------------------------------------------------

  const $ = id => document.getElementById(id);

  const notice = $("pageNotice");
  const settingsContent = $("settingsContent");
  const selectorBox = $("institutionSelector");
  const institutionSelect = $("institutionSelect");
  const roleBadge = $("roleBadge");
  const saveBtn = $("saveBtn");
  const uploadLogoBtn = $("uploadLogoBtn");

  let currentUser = null;
  let currentProfile = null;
  let currentInstitution = null;
  let currentRole = null;
  let loadingSettings = false;

  // -------------------------------------------------------
  // 3. MESSAGES
  // -------------------------------------------------------

  function showNotice(message, type = "info") {
    notice.textContent = message;
    notice.className = "notice show " + type;
  }

  function hideNotice() {
    notice.textContent = "";
    notice.className = "notice";
  }

  function setBusy(button, busy, busyText, normalText) {
    if (!button) return;

    button.disabled = busy;
    button.textContent = busy ? busyText : normalText;
  }

  function redirectToLogin() {
    window.location.replace(LOGIN_PAGE);
  }

  function safeText(value) {
    return String(value ?? "").trim();
  }

  function validHex(value) {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
  }

  function optionalValue(value) {
    const cleaned = safeText(value);
    return cleaned || null;
  }

  function validateOptionalUrl(value, label) {
    const cleaned = safeText(value);

    if (!cleaned) return null;

    try {
      const parsed = new URL(cleaned);

      if (
        parsed.protocol !== "https:" &&
        parsed.protocol !== "http:"
      ) {
        throw new Error();
      }

      return cleaned;
    } catch {
      throw new Error(
        label + " must be a valid URL beginning with https:// or http://."
      );
    }
  }

  // -------------------------------------------------------
  // 4. AUTHENTICATION AND ROLE CHECK
  // -------------------------------------------------------

  async function verifyAccess() {
    showNotice("Checking your account permissions...", "info");

    const {
      data: sessionData,
      error: sessionError
    } = await db.auth.getSession();

    if (sessionError) throw sessionError;

    if (!sessionData.session) {
      redirectToLogin();
      return false;
    }

    const {
      data: userData,
      error: userError
    } = await db.auth.getUser();

    if (userError || !userData.user) {
      redirectToLogin();
      return false;
    }

    currentUser = userData.user;

    const {
      data: profile,
      error: profileError
    } = await db
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        is_active,
        institution_id
      `)
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      await db.auth.signOut();
      redirectToLogin();
      return false;
    }

    if (profile.is_active !== true) {
      showNotice(
        "Your account is inactive. Contact the system administrator.",
        "error"
      );

      await db.auth.signOut();
      setTimeout(redirectToLogin, 2000);
      return false;
    }

    if (
      profile.role !== "super_admin" &&
      profile.role !== "school_admin"
    ) {
      showNotice(
        "Access denied. Institution Settings is available only to Super Admin and School Admin.",
        "error"
      );

      setTimeout(redirectToLogin, 2500);
      return false;
    }

    if (
      profile.role === "school_admin" &&
      !profile.institution_id
    ) {
      throw new Error(
        "Your School Admin account has no assigned institution."
      );
    }

    currentProfile = profile;
    currentRole = profile.role;

    roleBadge.textContent =
      currentRole === "super_admin"
        ? "SUPER ADMIN"
        : "SCHOOL ADMIN";

    $("backLink").href =
      currentRole === "super_admin"
        ? SUPER_ADMIN_DASHBOARD
        : SCHOOL_ADMIN_DASHBOARD;

    if (currentRole === "super_admin") {
      await loadInstitutionList();
    } else {
      selectorBox.hidden = true;

      await loadInstitutionSettings(
        profile.institution_id
      );
    }

    return true;
  }

  // -------------------------------------------------------
  // 5. SUPER ADMIN INSTITUTION LIST
  // -------------------------------------------------------

  async function loadInstitutionList() {
    showNotice("Loading institutions...", "info");

    const {
      data: institutions,
      error
    } = await db
      .from("institutions")
      .select("id,name,code,is_active")
      .order("name", { ascending: true });

    if (error) throw error;

    if (!institutions || institutions.length === 0) {
      throw new Error("No institutions were found.");
    }

    institutionSelect.innerHTML = "";

    institutions.forEach(institution => {
      const option = document.createElement("option");

      option.value = institution.id;

      option.textContent =
        institution.name +
        (institution.is_active === false
          ? " (Inactive)"
          : "");

      institutionSelect.appendChild(option);
    });

    selectorBox.hidden = false;

    institutionSelect.addEventListener(
      "change",
      async () => {
        const selectedId = institutionSelect.value;

        if (!selectedId) return;

        try {
          await loadInstitutionSettings(selectedId);
        } catch (error) {
          console.error(error);

          showNotice(
            error.message || "Unable to load institution settings.",
            "error"
          );
        }
      }
    );

    await loadInstitutionSettings(institutions[0].id);
  }

  // -------------------------------------------------------
  // 6. LOAD ONE INSTITUTION AND ITS SETTINGS
  // -------------------------------------------------------

  async function loadInstitutionSettings(institutionId) {
    if (loadingSettings) return;

    loadingSettings = true;
    settingsContent.hidden = true;
    currentInstitution = null;

    showNotice("Loading institution settings...", "info");

    try {
      const {
        data: institution,
        error: institutionError
      } = await db
        .from("institutions")
        .select(`
          id,
          name,
          code,
          email,
          phone,
          address,
          city,
          country,
          logo_url,
          website_url,
          is_active
        `)
        .eq("id", institutionId)
        .maybeSingle();

      if (institutionError) throw institutionError;

      if (!institution) {
        throw new Error(
          "Institution not found or access is not permitted."
        );
      }

      if (
        currentRole === "school_admin" &&
        institution.id !== currentProfile.institution_id
      ) {
        throw new Error(
          "You are not permitted to access another institution."
        );
      }

      currentInstitution = institution;

      const [
        institutionSettingsResult,
        monthlyFeeResult,
        graduationFeeResult
      ] = await Promise.all([
        db
          .from("institution_settings")
          .select("*")
          .eq("institution_id", institutionId)
          .maybeSingle(),

        db
          .from("monthly_fee_settings")
          .select("*")
          .eq("institution_id", institutionId)
          .maybeSingle(),

        db
          .from("graduation_fee_settings")
          .select("*")
          .eq("institution_id", institutionId)
          .maybeSingle()
      ]);

      if (institutionSettingsResult.error) {
        throw institutionSettingsResult.error;
      }

      if (monthlyFeeResult.error) {
        throw monthlyFeeResult.error;
      }

      if (graduationFeeResult.error) {
        throw graduationFeeResult.error;
      }

      fillInstitutionForm(
        institution,
        institutionSettingsResult.data,
        monthlyFeeResult.data,
        graduationFeeResult.data
      );

      settingsContent.hidden = false;
      hideNotice();

    } finally {
      loadingSettings = false;
    }
  }

  // -------------------------------------------------------
  // 7. FILL FORM WITH DATABASE VALUES
  // -------------------------------------------------------

  function fillInstitutionForm(
    institution,
    settings,
    monthlyFee,
    graduationFee
  ) {
    $("institutionName").value =
      institution.name || "";

    $("institutionEmail").value =
      institution.email || "";

    $("institutionPhone").value =
      institution.phone || "";

    $("institutionAddress").value =
      institution.address || "";

    $("institutionCity").value =
      institution.city || "";

    $("institutionCountry").value =
      institution.country || "Somalia";

    $("institutionWebsite").value =
      institution.website_url || "";

    $("institutionMotto").value =
      settings?.motto || "";

    $("primaryColor").value =
      settings?.primary_color || "#00154F";

    $("secondaryColor").value =
      settings?.secondary_color || "#F4AF1B";

    $("accentColor").value =
      settings?.accent_color || "#2E7D32";

    $("backgroundColor").value =
      settings?.background_color || "#FFFFFF";

    $("textColor").value =
      settings?.text_color || "#172033";

    $("headerColor").value =
      settings?.header_color || "#00154F";

    $("footerColor").value =
      settings?.footer_color || "#00154F";

    $("templateName").value =
      settings?.template_name || "gaawow_official";

    $("certificatePrefix").value =
      settings?.certificate_prefix || "GAA";

    $("certificateTemplate").value =
      settings?.certificate_template_url || "";

    $("sccTemplate").value =
      settings?.scc_template_url || "";

    $("receiptTemplate").value =
      settings?.receipt_template_url || "";

    $("reportTemplate").value =
      settings?.report_template_url || "";

    $("enableQrVerification").checked =
      settings?.enable_qr_verification !== false;

    // Monthly fee settings
    $("monthlyFeeAmount").value =
      monthlyFee?.amount ?? "";

    $("monthlyFeeCurrency").value =
      monthlyFee?.currency || "USD";

    $("monthlyDueDay").value =
      String(monthlyFee?.due_day ?? 0);

    $("monthlyFeeActive").checked =
      monthlyFee?.is_active === true;

    // Graduation fee settings
    $("graduationFeeAmount").value =
      graduationFee?.amount ?? "";

    $("graduationFeeCurrency").value =
      graduationFee?.currency || "USD";

    $("graduationFeeActive").checked =
      graduationFee?.is_active === true;

    // Existing logo
    $("logoPreview").src =
      institution.logo_url ||
      "https://i.ibb.co/4ZCRpm30/gaawow-logo.png";

    $("logoFile").value = "";

    updatePreview();
  }

  // -------------------------------------------------------
  // 8. LIVE BRANDING PREVIEW
  // -------------------------------------------------------

  function updatePreview() {
    const headerColor = $("headerColor").value;
    const footerColor = $("footerColor").value;
    const backgroundColor = $("backgroundColor").value;
    const textColor = $("textColor").value;
    const institutionName =
      safeText($("institutionName").value) ||
      "Official Institution Name";

    const motto =
      safeText($("institutionMotto").value) ||
      "Institution Motto";

    $("previewHeader").style.backgroundColor =
      headerColor;

    $("previewFooter").style.backgroundColor =
      footerColor;

    $("previewContent").style.backgroundColor =
      backgroundColor;

    $("previewContent").style.color =
      textColor;

    $("previewContent").innerHTML = "";

    const nameElement = document.createElement("strong");
    nameElement.textContent = institutionName;

    const mottoElement = document.createElement("p");
    mottoElement.textContent = motto;

    const documentElement = document.createElement("span");
    documentElement.textContent =
      "Certificate / Official Document";

    $("previewContent").append(
      nameElement,
      mottoElement,
      documentElement
    );
  }

  [
    "primaryColor",
    "secondaryColor",
    "accentColor",
    "backgroundColor",
    "textColor",
    "headerColor",
    "footerColor",
    "institutionName",
    "institutionMotto"
  ].forEach(id => {
    $(id).addEventListener("input", updatePreview);
  });

  // -------------------------------------------------------
  // 9. SAVE INSTITUTION INFORMATION AND SETTINGS
  // -------------------------------------------------------

  async function saveInstitutionSettings() {
    if (!currentInstitution) {
      throw new Error("Please select an institution first.");
    }

    if (
      currentRole === "school_admin" &&
      currentInstitution.id !== currentProfile.institution_id
    ) {
      throw new Error(
        "You cannot change another institution's settings."
      );
    }

    const institutionName =
      safeText($("institutionName").value);

    if (!institutionName) {
      throw new Error("Institution name is required.");
    }

    const colorIds = [
      "primaryColor",
      "secondaryColor",
      "accentColor",
      "backgroundColor",
      "textColor",
      "headerColor",
      "footerColor"
    ];

    for (const id of colorIds) {
      if (!validHex($(id).value)) {
        throw new Error("Please enter valid template colors.");
      }
    }

    const websiteUrl = validateOptionalUrl(
      $("institutionWebsite").value,
      "Institution website"
    );

    const certificateTemplateUrl = validateOptionalUrl(
      $("certificateTemplate").value,
      "Certificate template URL"
    );

    const sccTemplateUrl = validateOptionalUrl(
      $("sccTemplate").value,
      "SCC template URL"
    );

    const receiptTemplateUrl = validateOptionalUrl(
      $("receiptTemplate").value,
      "Receipt template URL"
    );

    const reportTemplateUrl = validateOptionalUrl(
      $("reportTemplate").value,
      "Report template URL"
    );

    const institutionId = currentInstitution.id;

    // -----------------------------------------------
    // A. UPDATE INSTITUTION INFORMATION
    // -----------------------------------------------

    const institutionPayload = {
      name: institutionName,
      email: optionalValue($("institutionEmail").value),
      phone: optionalValue($("institutionPhone").value),
      address: optionalValue($("institutionAddress").value),
      city: optionalValue($("institutionCity").value),
      country: optionalValue($("institutionCountry").value),
      website_url: websiteUrl,
      updated_at: new Date().toISOString()
    };

    const {
      data: updatedInstitution,
      error: institutionError
    } = await db
      .from("institutions")
      .update(institutionPayload)
      .eq("id", institutionId)
      .select("id,name")
      .maybeSingle();

    if (institutionError) throw institutionError;

    if (!updatedInstitution) {
      throw new Error(
        "Institution information was not updated. Check your permissions."
      );
    }

    // -----------------------------------------------
    // B. SAVE BRANDING AND DOCUMENT SETTINGS
    // -----------------------------------------------

    const settingsPayload = {
      institution_id: institutionId,

      motto: optionalValue($("institutionMotto").value),

      primary_color: $("primaryColor").value,
      secondary_color: $("secondaryColor").value,
      accent_color: $("accentColor").value,
      background_color: $("backgroundColor").value,
      text_color: $("textColor").value,
      header_color: $("headerColor").value,
      footer_color: $("footerColor").value,

      template_name:
        safeText($("templateName").value) ||
        "gaawow_official",

      certificate_template_url: certificateTemplateUrl,
      scc_template_url: sccTemplateUrl,
      receipt_template_url: receiptTemplateUrl,
      report_template_url: reportTemplateUrl,

      certificate_prefix:
        safeText($("certificatePrefix").value) || "GAA",

      enable_qr_verification:
        $("enableQrVerification").checked
    };

    const {
      error: settingsError
    } = await db
      .from("institution_settings")
      .upsert(
        settingsPayload,
        { onConflict: "institution_id" }
      );

    if (settingsError) throw settingsError;

    // -----------------------------------------------
    // C. SAVE MONTHLY FEE IF AMOUNT IS PROVIDED
    // -----------------------------------------------

    const monthlyAmountText =
      safeText($("monthlyFeeAmount").value);

    if (monthlyAmountText !== "") {
      const monthlyAmount = Number(monthlyAmountText);

      if (
        !Number.isFinite(monthlyAmount) ||
        monthlyAmount < 0
      ) {
        throw new Error("Monthly Fee amount is invalid.");
      }

      const dueDay = Number($("monthlyDueDay").value);

      if (
        !Number.isInteger(dueDay) ||
        dueDay < 0 ||
        dueDay > 28
      ) {
        throw new Error("Monthly Fee due day is invalid.");
      }

      const {
        error: monthlyError
      } = await db
        .from("monthly_fee_settings")
        .upsert(
          {
            institution_id: institutionId,
            amount: monthlyAmount,
            currency: $("monthlyFeeCurrency").value,
            is_active: $("monthlyFeeActive").checked,
            due_day: dueDay,
            updated_by: currentUser.id
          },
          { onConflict: "institution_id" }
        );

      if (monthlyError) throw monthlyError;
    }

    // -----------------------------------------------
    // D. SAVE GRADUATION FEE IF AMOUNT IS PROVIDED
    // -----------------------------------------------

    const graduationAmountText =
      safeText($("graduationFeeAmount").value);

    if (graduationAmountText !== "") {
      const graduationAmount =
        Number(graduationAmountText);

      if (
        !Number.isFinite(graduationAmount) ||
        graduationAmount < 0
      ) {
        throw new Error("Graduation Fee amount is invalid.");
      }

      const {
        error: graduationError
      } = await db
        .from("graduation_fee_settings")
        .upsert(
          {
            institution_id: institutionId,
            amount: graduationAmount,
            currency: $("graduationFeeCurrency").value,
            is_active: $("graduationFeeActive").checked,
            updated_by: currentUser.id
          },
          { onConflict: "institution_id" }
        );

      if (graduationError) throw graduationError;
    }

    currentInstitution.name = institutionName;
    currentInstitution.email = institutionPayload.email;
    currentInstitution.phone = institutionPayload.phone;
    currentInstitution.address = institutionPayload.address;
    currentInstitution.city = institutionPayload.city;
    currentInstitution.country = institutionPayload.country;
    currentInstitution.website_url = websiteUrl;

    // Update selected institution label for Super Admin
    if (
      currentRole === "super_admin" &&
      institutionSelect.selectedOptions.length
    ) {
      institutionSelect.selectedOptions[0].textContent =
        institutionName;
    }

    showNotice(
      "Institution settings saved successfully.",
      "success"
    );
  }

  saveBtn.addEventListener("click", async () => {
    setBusy(
      saveBtn,
      true,
      "Saving settings...",
      "Save Institution Settings"
    );

    try {
      await saveInstitutionSettings();
    } catch (error) {
      console.error("Settings save error:", error);

      showNotice(
        error.message || "Unable to save institution settings.",
        "error"
      );
    } finally {
      setBusy(
        saveBtn,
        false,
        "Saving settings...",
        "Save Institution Settings"
      );
    }
  });

  // -------------------------------------------------------
  // 10. UPLOAD INSTITUTION LOGO
  // -------------------------------------------------------

  async function uploadInstitutionLogo() {
    if (!currentInstitution) {
      throw new Error("Please select an institution first.");
    }

    if (
      currentRole === "school_admin" &&
      currentInstitution.id !== currentProfile.institution_id
    ) {
      throw new Error(
        "You cannot upload a logo for another institution."
      );
    }

    const file = $("logoFile").files[0];

    if (!file) {
      throw new Error("Please choose a logo image first.");
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "Only JPG, PNG and WebP logo images are allowed."
      );
    }

    if (file.size > MAX_LOGO_SIZE) {
      throw new Error("Logo file must not exceed 2 MB.");
    }

    const extensionMap = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp"
    };

    const extension = extensionMap[file.type];

    const safeFileName =
      "logo-" +
      Date.now() +
      "-" +
      Math.floor(Math.random() * 100000) +
      "." +
      extension;

    const storagePath =
      currentInstitution.id + "/" + safeFileName;

    // Upload new file. Existing logo is not deleted.
    const {
      error: uploadError
    } = await db.storage
      .from(LOGO_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    const {
      data: publicUrlData
    } = db.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(storagePath);

    const newLogoUrl = publicUrlData.publicUrl;

    // Update institution only after successful upload.
    const {
      data: updated,
      error: updateError
    } = await db
      .from("institutions")
      .update({
        logo_url: newLogoUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", currentInstitution.id)
      .select("id,logo_url")
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updated) {
      throw new Error(
        "Logo uploaded, but institution logo URL could not be updated. Contact Super Admin."
      );
    }

    currentInstitution.logo_url = newLogoUrl;

    $("logoPreview").src = newLogoUrl;
    $("logoFile").value = "";

    showNotice(
      "New institution logo uploaded and saved successfully.",
      "success"
    );
  }

  uploadLogoBtn.addEventListener("click", async () => {
    setBusy(
      uploadLogoBtn,
      true,
      "Uploading...",
      "Upload Logo"
    );

    try {
      await uploadInstitutionLogo();
    } catch (error) {
      console.error("Logo upload error:", error);

      showNotice(
        error.message || "Logo upload failed.",
        "error"
      );
    } finally {
      setBusy(
        uploadLogoBtn,
        false,
        "Uploading...",
        "Upload Logo"
      );
    }
  });

  // -------------------------------------------------------
  // 11. RELOAD SETTINGS
  // -------------------------------------------------------

  $("reloadBtn").addEventListener("click", async () => {
    if (!currentInstitution) return;

    $("reloadBtn").disabled = true;

    try {
      await loadInstitutionSettings(currentInstitution.id);

      showNotice(
        "Settings reloaded from the database.",
        "success"
      );
    } catch (error) {
      console.error(error);

      showNotice(
        error.message || "Unable to reload settings.",
        "error"
      );
    } finally {
      $("reloadBtn").disabled = false;
    }
  });

  // -------------------------------------------------------
  // 12. START PAGE
  // -------------------------------------------------------

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await verifyAccess();
    } catch (error) {
      console.error("Institution Settings Error:", error);

      showNotice(
        error.message ||
        "An unexpected error occurred while loading Institution Settings.",
        "error"
      );
    }
  });

})();
