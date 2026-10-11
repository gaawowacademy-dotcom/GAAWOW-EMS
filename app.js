"use strict";

/* =========================================================
   GAAWOW EMS — SECURE LOGIN V9
   Single System Login
   Supabase Auth + profiles.role
   No dependency on Teacher Login HTML elements
   ========================================================= */

(() => {
  const SUPABASE_URL =
    "https://mytyvqwrxnxpxnxpiicj.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2AvWfup";

  const CLIENT_KEY = "gaawowEMSLoginClient";

  const ROLE_ROUTES = {
    super_admin: "dashboard.html",
    school_admin: "school-dashboard.html",
    teacher: "teacher-portal.html",
    parent: "parent.html",
    student: "student.html"
  };

  let supabaseClient = null;
  let isSubmitting = false;

  function byId(...ids) {
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) return element;
    }
    return null;
  }

  function showMessage(message, type = "error") {
    let box = byId(
      "login-message",
      "loginMessage",
      "error-message",
      "errorMessage",
      "message"
    );

    if (!box) {
      box = document.createElement("div");
      box.id = "login-message";
      box.setAttribute("role", "alert");
      box.setAttribute("aria-live", "polite");

      const form = byId("login-form", "loginForm");

      if (form && form.parentNode) {
        form.parentNode.insertBefore(box, form);
      } else {
        document.body.prepend(box);
      }
    }

    box.textContent = message;
    box.style.display = "block";
    box.style.padding = "12px";
    box.style.margin = "12px 0";
    box.style.borderRadius = "8px";
    box.style.fontSize = "14px";
    box.style.lineHeight = "1.5";
    box.style.color = type === "success" ? "#155724" : "#842029";
    box.style.background =
      type === "success" ? "#d4edda" : "#f8d7da";
    box.style.border =
      type === "success"
        ? "1px solid #c3e6cb"
        : "1px solid #f5c2c7";
  }

  function clearMessage() {
    const box = byId(
      "login-message",
      "loginMessage",
      "error-message",
      "errorMessage",
      "message"
    );

    if (box) {
      box.textContent = "";
      box.style.display = "none";
    }
  }

  function setLoading(loading) {
    const button = byId(
      "login-button",
      "loginButton",
      "submit-login",
      "submitLogin",
      "login-btn"
    );

    if (!button) return;

    if (!button.dataset.originalText) {
      button.dataset.originalText =
        button.textContent.trim() || "Login";
    }

    button.disabled = loading;
    button.textContent = loading
      ? "Checking credentials..."
      : button.dataset.originalText;
  }

  function normalizeRole(role) {
    return String(role || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  function getClient() {
    if (supabaseClient) return supabaseClient;

    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ) {
      throw new Error(
        "Supabase library lama soo dejin. Hubi index.html."
      );
    }

    if (
      typeof SUPABASE_URL !== "string" ||
      !SUPABASE_URL.startsWith("https://") ||
      !SUPABASE_KEY
    ) {
      throw new Error("Supabase configuration sax ma aha.");
    }

    /*
     * Hal client oo keliya.
     * session persistence waa muhiim si login-ku u sii jiro.
     */
    supabaseClient = window.supabase.createClient(
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

    window[CLIENT_KEY] = supabaseClient;

    return supabaseClient;
  }

  async function getAuthorizedProfile(userId) {
    const client = getClient();

    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, role, is_active, institution_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Profile lookup failed:", error);
      throw new Error(
        "Akoonka waa la xaqiijiyey, laakiin profile-ka lama akhrin karin. Hubi profiles RLS iyo xogta profile-ka."
      );
    }

    if (!data) {
      throw new Error(
        "Profile-ka isticmaalaha lama helin. Ma jiro wax isbeddel SQL ah oo si toos ah loo samaynayo."
      );
    }

    if (data.is_active === false) {
      throw new Error(
        "Akoonka waa la joojiyey. La xiriir maamulka GAAWOW EMS."
      );
    }

    const role = normalizeRole(data.role);

    if (!Object.prototype.hasOwnProperty.call(ROLE_ROUTES, role)) {
      throw new Error(
        "Doorka akoonka lama aqoonsan. La xiriir Super Admin."
      );
    }

    return {
      ...data,
      role,
      route: ROLE_ROUTES[role]
    };
  }

  async function login(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (isSubmitting) return;

    clearMessage();

    const emailInput = byId(
      "email",
      "login-email",
      "loginEmail",
      "user-email"
    );

    const passwordInput = byId(
      "password",
      "login-password",
      "loginPassword",
      "user-password"
    );

    if (!emailInput || !passwordInput) {
      showMessage(
        "Email ama Password field lama helin. Hubi IDs-ka ku jira index.html."
      );
      console.error("Login inputs not found.");
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage("Fadlan geli Email iyo Password.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage("Fadlan geli email sax ah.");
      return;
    }

    isSubmitting = true;
    setLoading(true);

    try {
      const client = getClient();

      /*
       * STEP 1: Authenticate with Supabase.
       */
      const { data: authData, error: authError } =
        await client.auth.signInWithPassword({
          email,
          password
        });

      if (authError) {
        console.error("Supabase authentication failed:", authError);

        if (
          authError.message &&
          /invalid login credentials/i.test(authError.message)
        ) {
          throw new Error(
            "Email ama Password waa khaldan yahay."
          );
        }

        if (
          authError.message &&
          /email not confirmed/i.test(authError.message)
        ) {
          throw new Error(
            "Email-ka weli lama xaqiijin. La xiriir maamulka."
          );
        }

        throw new Error(
          "Gelitaanka Supabase wuu fashilmay. Hubi xogta akoonka iyo Supabase Auth."
        );
      }

      if (!authData.user || !authData.session) {
        throw new Error(
          "Supabase ma soo celin user iyo session sax ah."
        );
      }

      /*
       * STEP 2: Read profiles.role.
       */
      let profile;

      try {
        profile = await getAuthorizedProfile(authData.user.id);
      } catch (profileError) {
        /*
         * Fail closed: logout haddii profile-ka ama rukhsadda
         * aan la xaqiijin karin.
         */
        await client.auth.signOut();
        throw profileError;
      }

      /*
       * STEP 3: Navigate according to verified role.
       */
      showMessage(
        "Login waa guulaystay. Waxaa lagu gelinayaa boggaaga...",
        "success"
      );

      console.info("Authorized login:", {
        role: profile.role,
        userId: authData.user.id,
        route: profile.route
      });

      window.location.replace(profile.route);

    } catch (error) {
      console.error("Login error:", error);

      showMessage(
        error && error.message
          ? error.message
          : "Khalad lama filaan ah ayaa dhacay."
      );

    } finally {
      isSubmitting = false;
      setLoading(false);
    }
  }

  function initializeLogin() {
    /*
     * Teacher Login elements are optional.
     * Missing elements must never stop System Login.
     */
    const form = byId("login-form", "loginForm");

    const button = byId(
      "login-button",
      "loginButton",
      "submit-login",
      "submitLogin",
      "login-btn"
    );

    if (form) {
      form.addEventListener("submit", login);
    } else if (button) {
      button.addEventListener("click", login);
    } else {
      console.error(
        "Login form/button lama helin. Hubi index.html IDs."
      );
      showMessage(
        "Login button lama helin. Hubi HTML-ka bogga."
      );
      return;
    }

    /*
     * Optional password visibility button.
     */
    const togglePassword = byId(
      "toggle-password",
      "togglePassword",
      "show-password"
    );

    const passwordInput = byId(
      "password",
      "login-password",
      "loginPassword",
      "user-password"
    );

    if (togglePassword && passwordInput) {
      togglePassword.addEventListener("click", () => {
        const hidden = passwordInput.type === "password";

        passwordInput.type = hidden ? "text" : "password";
        togglePassword.setAttribute(
          "aria-pressed",
          String(hidden)
        );
      });
    }

    console.info("GAAWOW EMS Login V9 initialized.");
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeLogin,
      { once: true }
    );
  } else {
    initializeLogin();
  }

  /*
   * Optional diagnostic access for testing.
   * Does not expose the password or service-role key.
   */
  window.GAAWOW_LOGIN = Object.freeze({
    version: "9.0",
    testConnection: async () => {
      try {
        const client = getClient();
        const { data, error } = await client.auth.getSession();

        if (error) throw error;

        return {
          ok: true,
          sessionExists: Boolean(data.session),
          message: "Supabase client wuu shaqaynayaa."
        };
      } catch (error) {
        return {
          ok: false,
          message: error.message || "Supabase connection failed."
        };
      }
    }
  });
})();
