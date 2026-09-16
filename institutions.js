// ==========================================
// GAAWOW EMS — INSTITUTIONS MANAGEMENT
// ==========================================

const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupKf1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


// ==========================================
// ELEMENTS
// ==========================================

const form =
  document.getElementById("institutionForm");

const saveBtn =
  document.getElementById("saveBtn");

const message =
  document.getElementById("message");

const body =
  document.getElementById("institutionsBody");

const searchInput =
  document.getElementById("searchInput");


// Store loaded institutions
let institutions = [];


// ==========================================
// DASHBOARD
// ==========================================

function goDashboard() {
  window.location.href = "dashboard.html";
}


// ==========================================
// SUPER ADMIN CHECK
// ==========================================

async function checkSuperAdmin() {

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();

  if (
    error ||
    !data.session
  ) {

    window.location.href =
      "index.html";

    return false;
  }


  const user =
    data.session.user;


  const {
    data: profile,
    error: profileError
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "full_name, role, is_active"
      )
      .eq(
        "id",
        user.id
      )
      .single();


  if (
    profileError ||
    !profile
  ) {

    console.error(
      profileError
    );

    alert(
      "Unable to load your profile."
    );

    return false;
  }


  if (
    profile.role !==
    "super_admin"
  ) {

    alert(
      "Access denied. Super Admin only."
    );

    window.location.href =
      "index.html";

    return false;
  }


  if (
    profile.is_active === false
  ) {

    alert(
      "Your account is inactive."
    );

    await supabaseClient
      .auth
      .signOut();

    window.location.href =
      "index.html";

    return false;
  }


  return true;
}


// ==========================================
// ADD INSTITUTION
// ==========================================

form.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();


    saveBtn.disabled = true;

    saveBtn.textContent =
      "ADDING...";


    message.style.color =
      "#0B4DA2";

    message.textContent =
      "Adding institution...";


    const name =
      document
        .getElementById("name")
        .value
        .trim();

    const code =
      document
        .getElementById("code")
        .value
        .trim()
        .toUpperCase();

    const email =
      document
        .getElementById("email")
        .value
        .trim();

    const phone =
      document
        .getElementById("phone")
        .value
        .trim();

    const address =
      document
        .getElementById("address")
        .value
        .trim();

    const city =
      document
        .getElementById("city")
        .value
        .trim();

    const country =
      document
        .getElementById("country")
        .value
        .trim();

    const logo_url =
      document
        .getElementById("logo_url")
        .value
        .trim();

    const website_url =
      document
        .getElementById("website_url")
        .value
        .trim();


    try {

      // Check duplicate code
      const {
        data: existing,
        error: duplicateError
      } =
        await supabaseClient
          .from("institutions")
          .select("id, name, code")
          .eq(
            "code",
            code
          )
          .maybeSingle();


      if (duplicateError) {
        throw duplicateError;
      }


      if (existing) {

        throw new Error(
          `Institution code "${code}" already exists.`
        );
      }


      // Insert institution
      const {
        data,
        error
      } =
        await supabaseClient
          .from("institutions")
          .insert([
            {
              name: name,
              code: code,
              email: email || null,
              phone: phone || null,
              address: address || null,
              city: city || null,
              country: country || "Somalia",
              logo_url: logo_url || null,
              website_url: website_url || null,
              is_active: true
            }
          ])
          .select()
          .single();


      if (error) {
        throw error;
      }


      console.log(
        "Institution added:",
        data
      );


      message.style.color =
        "#16A34A";

      message.textContent =
        `✓ Institution "${data.name}" added successfully.`;


      resetForm();


      await loadInstitutions();


    } catch (error) {

      console.error(
        "Add institution error:",
        error
      );


      message.style.color =
        "#DC2626";

      message.textContent =
        "✕ " +
        (
          error.message ||
          "Failed to add institution."
        );


    } finally {

      saveBtn.disabled = false;

      saveBtn.textContent =
        "ADD INSTITUTION";
    }

  }
);


// ==========================================
// LOAD INSTITUTIONS
// ==========================================

async function loadInstitutions() {

  body.innerHTML = `
    <tr>
      <td colspan="5" class="empty">
        Loading institutions...
      </td>
    </tr>
  `;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("institutions")
      .select(
        "id,name,code,email,phone,address,city,country,logo_url,website_url,is_active,created_at"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      error
    );

    body.innerHTML = `
      <tr>
        <td colspan="5" class="empty">
          Failed to load institutions.
        </td>
      </tr>
    `;

    return;
  }


  institutions =
    data || [];


  renderInstitutions(
    institutions
  );
}


// ==========================================
// RENDER
// ==========================================

function renderInstitutions(rows) {

  if (!rows.length) {

    body.innerHTML = `
      <tr>
        <td colspan="5" class="empty">
          No institutions found.
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML =
    rows.map(
      institution => {

        const statusClass =
          institution.is_active
            ? "active"
            : "inactive";

        const statusText =
          institution.is_active
            ? "ACTIVE"
            : "INACTIVE";


        return `
          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  institution.name || ""
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                institution.code || ""
              )}
            </td>

            <td>
              ${escapeHtml(
                institution.city || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                institution.phone || "-"
              )}
            </td>

            <td>
              <span class="status ${statusClass}">
                ${statusText}
              </span>
            </td>

          </tr>
        `;

      }
    ).join("");
}


// ==========================================
// SEARCH
// ==========================================

searchInput.addEventListener(
  "input",
  function() {

    const query =
      this.value
        .trim()
        .toLowerCase();


    if (!query) {

      renderInstitutions(
        institutions
      );

      return;
    }


    const filtered =
      institutions.filter(
        institution => {

          return [

            institution.name,

            institution.code,

            institution.city,

            institution.phone,

            institution.email

          ]
            .filter(Boolean)
            .some(
              value =>
                String(value)
                  .toLowerCase()
                  .includes(query)
            );
        }
      );


    renderInstitutions(
      filtered
    );
  }
);


// ==========================================
// RESET FORM
// ==========================================

function resetForm() {

  form.reset();

  document.getElementById(
    "country"
  ).value = "Somalia";

  message.textContent = "";
}


// ==========================================
// SAFE HTML
// ==========================================

function escapeHtml(value) {

  return String(value)
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


// ==========================================
// START
// ==========================================

async function startInstitutions() {

  const allowed =
    await checkSuperAdmin();


  if (!allowed) {
    return;
  }


  await loadInstitutions();
}


startInstitutions();
