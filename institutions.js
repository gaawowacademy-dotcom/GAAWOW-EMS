const SUPABASE_URL =
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


// ===============================
// DASHBOARD
// ===============================

function goDashboard() {
  window.location.href = "dashboard.html";
}


// ===============================
// CHECK SUPER ADMIN
// ===============================

async function checkSuperAdmin() {

  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();

  console.log("SESSION:", sessionData);
  console.log("SESSION ERROR:", sessionError);

  if (
    sessionError ||
    !sessionData.session
  ) {

    alert(
      "Session not found. Please login again."
    );

    window.location.href =
      "index.html";

    return false;
  }


  const user =
    sessionData.session.user;

  console.log(
    "LOGGED USER:",
    user.id,
    user.email
  );


  const {
    data: profile,
    error: profileError
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "id, full_name, role, institution_id, is_active"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();


  console.log(
    "PROFILE:",
    profile
  );

  console.log(
    "PROFILE ERROR:",
    profileError
  );


  if (profileError) {

    alert(
      "Unable to load your profile.\n\n" +
      profileError.message
    );

    return false;
  }


  if (!profile) {

    alert(
      "No profile found for this login account."
    );

    return false;
  }


  if (
    profile.role !==
    "super_admin"
  ) {

    alert(
      "Access denied.\n\n" +
      "Your current role is: " +
      profile.role
    );

    window.location.href =
      "index.html";

    return false;
  }


  if (
    profile.is_active === false
  ) {

    alert(
      "Your Super Admin account is inactive."
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


// ===============================
// ADD INSTITUTION
// ===============================

const institutionForm =
  document.getElementById(
    "institutionForm"
  );


if (institutionForm) {

  institutionForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      const submitButton =
        document.getElementById(
          "addInstitutionBtn"
        );


      const message =
        document.getElementById(
          "formMessage"
        );


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


      const website_url =
        document
          .getElementById("website_url")
          .value
          .trim();


      const logo_url =
        document
          .getElementById("logo_url")
          .value
          .trim();


      if (!name) {

        alert(
          "Please enter institution name."
        );

        return;
      }


      if (!code) {

        alert(
          "Please enter institution code."
        );

        return;
      }


      submitButton.disabled =
        true;

      submitButton.textContent =
        "ADDING...";


      if (message) {

        message.textContent =
          "Checking institution...";
      }


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

        console.error(
          "Duplicate check error:",
          duplicateError
        );

        if (message) {

          message.textContent =
            "Error checking institution: " +
            duplicateError.message;
        }

        submitButton.disabled =
          false;

        submitButton.textContent =
          "ADD INSTITUTION";

        return;
      }


      if (existing) {

        if (message) {

          message.textContent =
            "Institution code already exists: " +
            existing.code;
        }

        submitButton.disabled =
          false;

        submitButton.textContent =
          "ADD INSTITUTION";

        return;
      }


      // Insert institution

      if (message) {

        message.textContent =
          "Creating institution...";
      }


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
              email:
                email || null,
              phone:
                phone || null,
              address:
                address || null,
              city:
                city || null,
              country:
                country || "Somalia",
              website_url:
                website_url || null,
              logo_url:
                logo_url || null,
              is_active:
                true
            }
          ])
          .select()
          .single();


      if (error) {

        console.error(
          "ADD INSTITUTION ERROR:",
          error
        );


        if (message) {

          message.textContent =
            "Unable to add institution: " +
            error.message;
        }


        submitButton.disabled =
          false;

        submitButton.textContent =
          "ADD INSTITUTION";

        return;
      }


      console.log(
        "Institution created:",
        data
      );


      if (message) {

        message.textContent =
          "✓ Institution \"" +
          name +
          "\" added successfully.";
      }


      alert(
        "Institution added successfully!"
      );


      institutionForm.reset();


      const countryInput =
        document.getElementById(
          "country"
        );

      if (countryInput) {
        countryInput.value =
          "Somalia";
      }


      submitButton.disabled =
        false;

      submitButton.textContent =
        "ADD INSTITUTION";


      await loadInstitutions();

    }
  );
}


// ===============================
// LOAD INSTITUTIONS
// ===============================

let allInstitutions = [];


async function loadInstitutions() {

  const tableBody =
    document.getElementById(
      "institutionsTableBody"
    );


  if (tableBody) {

    tableBody.innerHTML =
      `
      <tr>
        <td colspan="5"
            style="text-align:center;padding:30px;">
          Loading institutions...
        </td>
      </tr>
      `;
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("institutions")
      .select(
        "id, name, code, email, phone, address, city, country, logo_url, website_url, is_active, created_at, updated_at"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "LOAD INSTITUTIONS ERROR:",
      error
    );


    if (tableBody) {

      tableBody.innerHTML =
        `
        <tr>
          <td colspan="5"
              style="text-align:center;padding:30px;color:#dc2626;">
            Unable to load institutions:<br>
            ${escapeHTML(error.message)}
          </td>
        </tr>
        `;
    }

    return;
  }


  allInstitutions =
    data || [];


  renderInstitutions(
    allInstitutions
  );
}


// ===============================
// RENDER INSTITUTIONS
// ===============================

function renderInstitutions(
  institutions
) {

  const tableBody =
    document.getElementById(
      "institutionsTableBody"
    );


  if (!tableBody) {
    return;
  }


  if (
    !institutions ||
    institutions.length === 0
  ) {

    tableBody.innerHTML =
      `
      <tr>
        <td colspan="5"
            style="text-align:center;padding:30px;">
          No institutions found.
        </td>
      </tr>
      `;

    return;
  }


  tableBody.innerHTML =
    institutions
      .map(
        function (institution) {

          const status =
            institution.is_active
              ? "ACTIVE"
              : "INACTIVE";


          const statusClass =
            institution.is_active
              ? "status-active"
              : "status-inactive";


          return `
            <tr>

              <td>
                <strong>
                  ${escapeHTML(
                    institution.name
                  )}
                </strong>
              </td>

              <td>
                ${escapeHTML(
                  institution.code || "-"
                )}
              </td>

              <td>
                ${escapeHTML(
                  institution.city || "-"
                )}
              </td>

              <td>
                ${escapeHTML(
                  institution.phone || "-"
                )}
              </td>

              <td>
                <span class="${statusClass}">
                  ${status}
                </span>
              </td>

            </tr>
          `;
        }
      )
      .join("");
}


// ===============================
// SEARCH
// ===============================

const searchInput =
  document.getElementById(
    "searchInput"
  );


if (searchInput) {

  searchInput.addEventListener(
    "input",
    function () {

      const search =
        this.value
          .trim()
          .toLowerCase();


      if (!search) {

        renderInstitutions(
          allInstitutions
        );

        return;
      }


      const filtered =
        allInstitutions.filter(
          function (institution) {

            return (

              (
                institution.name ||
                ""
              )
                .toLowerCase()
                .includes(search)

              ||

              (
                institution.code ||
                ""
              )
                .toLowerCase()
                .includes(search)

              ||

              (
                institution.city ||
                ""
              )
                .toLowerCase()
                .includes(search)

              ||

              (
                institution.phone ||
                ""
              )
                .toLowerCase()
                .includes(search)

              ||

              (
                institution.email ||
                ""
              )
                .toLowerCase()
                .includes(search)

            );

          }
        );


      renderInstitutions(
        filtered
      );

    }
  );
}


// ===============================
// ESCAPE HTML
// ===============================

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


// ===============================
// CLEAR FORM
// ===============================

const clearBtn =
  document.getElementById(
    "clearBtn"
  );


if (clearBtn) {

  clearBtn.addEventListener(
    "click",
    function () {

      if (institutionForm) {
        institutionForm.reset();
      }


      const countryInput =
        document.getElementById(
          "country"
        );

      if (countryInput) {
        countryInput.value =
          "Somalia";
      }


      const message =
        document.getElementById(
          "formMessage"
        );

      if (message) {
        message.textContent = "";
      }

    }
  );
}


// ===============================
// START
// ===============================

async function startInstitutionsPage() {

  const allowed =
    await checkSuperAdmin();


  if (!allowed) {
    return;
  }


  await loadInstitutions();
}


startInstitutionsPage();
