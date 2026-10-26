/* =========================================================
   GAAWOW EMS — PARENT MANAGEMENT V2
   File: parent.js
   Database: Supabase
   Edge Function: create-parent-account

   SECURITY:
   - Uses the authenticated user's access token.
   - Never exposes the Service Role Key.
   - Requires an active Super Admin profile.
   ========================================================= */

"use strict";

/* =========================================================
   1. SUPABASE CONFIGURATION
   ========================================================= */

const PARENT_SUPABASE_URL =
  window.SUPABASE_URL ||
  "https://mytyvqwrxnxpxnxpiicj.supabase.co";

const PARENT_SUPABASE_ANON_KEY =
  window.SUPABASE_ANON_KEY ||
  window.SUPABASE_PUBLISHABLE_KEY ||
  "";

const PARENT_TABLE = "parents";
const PROFILE_TABLE = "profiles";
const PARENT_PHOTO_BUCKET = "parent-photos";

const PARENT_ACCOUNT_FUNCTION =
  `${PARENT_SUPABASE_URL}/functions/v1/create-parent-account`;

let parentSupabase = window.supabaseClient || null;

if (!parentSupabase) {
  if (
    window.supabase &&
    typeof window.supabase.createClient === "function" &&
    PARENT_SUPABASE_ANON_KEY
  ) {
    parentSupabase = window.supabase.createClient(
      PARENT_SUPABASE_URL,
      PARENT_SUPABASE_ANON_KEY
    );

    window.supabaseClient = parentSupabase;
  }
}

/* =========================================================
   2. GENERAL HELPERS
   ========================================================= */

function parentElement(id) {
  return document.getElementById(id);
}

function parentValue(id) {
  const element = parentElement(id);
  return element ? element.value.trim() : "";
}

function parentSetValue(id, value) {
  const element = parentElement(id);

  if (element) {
    element.value = value ?? "";
  }
}

function parentNotify(message, type = "info") {
  const container =
    parentElement("parentMessage") ||
    parentElement("message") ||
    parentElement("alertMessage");

  if (container) {
    container.textContent = String(message ?? "");
    container.className = `parent-message ${type}`;
    container.style.display = "block";
    container.setAttribute("role", "status");
    return;
  }

  if (type === "error") {
    console.error(message);
  } else {
    console.log(message);
  }
}

function parentShowBusy(
  show,
  message = "Fadlan sug..."
) {
  const busy =
    parentElement("parentLoading") ||
    parentElement("loading") ||
    parentElement("busyIndicator");

  if (busy) {
    busy.textContent = message;
    busy.style.display = show ? "block" : "none";
  }
}

function parentEscape(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value ?? "").replace(
    /[&<>"']/g,
    character => entities[character]
  );
}

function parentFormatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString();
}

function parentRequireClient() {
  if (!parentSupabase) {
    throw new Error(
      "Supabase client lama helin. Hubi in Supabase JS " +
      "iyo Supabase publishable key la soo geliyey."
    );
  }
}

/* =========================================================
   3. AUTHENTICATION AND ADMIN SESSION
   ========================================================= */

async function getAdminSession() {
  parentRequireClient();

  const {
    data: sessionData,
    error: sessionError
  } = await parentSupabase.auth.getSession();

  if (sessionError) {
    throw new Error(
      "Session-ka lama akhrin karin: " +
      sessionError.message
    );
  }

  const session = sessionData?.session;

  if (!session?.access_token || !session?.user?.id) {
    throw new Error(
      "Login session lama helin. Fadlan marka hore " +
      "gal GAAWOW EMS adigoo isticmaalaya Super Admin."
    );
  }

  const {
    data: profile,
    error: profileError
  } = await parentSupabase
    .from(PROFILE_TABLE)
    .select("id, role, is_active, institution_id")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      "Hubinta profile-ka way fashilantay: " +
      profileError.message
    );
  }

  if (
    !profile ||
    profile.role !== "super_admin" ||
    profile.is_active !== true
  ) {
    throw new Error(
      "Helitaan lama oggola. Waxaa loo baahan yahay " +
      "Super Admin firfircoon."
    );
  }

  return {
    session,
    profile
  };
}

/* =========================================================
   4. CALL EDGE FUNCTION
   ========================================================= */

async function callParentAccountFunction(payload) {
  const { session } = await getAdminSession();

  if (!PARENT_SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase publishable key lama helin."
    );
  }

  const response = await fetch(
    PARENT_ACCOUNT_FUNCTION,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": PARENT_SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    }
  );

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `Jawaabta server-ka lama akhrin karin. HTTP ${response.status}.`
    );
  }

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.error ||
      `Codsigu wuu fashilmay. HTTP ${response.status}.`
    );
  }

  return result;
}

/* =========================================================
   5. LOAD PARENTS
   ========================================================= */

async function loadParents() {
  try {
    parentRequireClient();
    await getAdminSession();

    parentShowBusy(
      true,
      "Waalidiinta ayaa la soo gelinayaa..."
    );

    const {
      data,
      error
    } = await parentSupabase
      .from(PARENT_TABLE)
      .select(`
        id,
        institution_id,
        profile_id,
        full_name,
        phone,
        email,
        address,
        occupation,
        created_at
      `)
      .order("created_at", {
        ascending: false
      });

    if (error) throw error;

    window.gaaowParents = data || [];

    renderParents(window.gaaowParents);
    updateParentStatistics(window.gaaowParents);

    return window.gaaowParents;

  } catch (error) {
    parentNotify(error.message, "error");
    return [];

  } finally {
    parentShowBusy(false);
  }
}

/* =========================================================
   6. RENDER PARENTS TABLE
   ========================================================= */

function renderParents(parents) {
  const tableBody =
    parentElement("parentsTableBody") ||
    parentElement("parentsList") ||
    parentElement("parentsTable");

  if (!tableBody) {
    console.warn(
      'Parents table lama helin. Hubi HTML element-ka ' +
      'id="parentsTableBody".'
    );
    return;
  }

  if (!Array.isArray(parents) || parents.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8"
            style="text-align:center;padding:24px">
          Weli lama diiwaangelin waalid.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = parents.map(parent => {
    const id = parentEscape(parent.id);

    return `
      <tr>
        <td>${parentEscape(parent.full_name)}</td>

        <td>${parentEscape(parent.phone || "—")}</td>

        <td>${parentEscape(parent.email || "—")}</td>

        <td>${parentEscape(parent.address || "—")}</td>

        <td>${parentEscape(parent.occupation || "—")}</td>

        <td>${parentEscape(
          parentFormatDate(parent.created_at)
        )}</td>

        <td>
          ${
            parent.profile_id
              ? "Akoon waa ku xiran yahay"
              : "Akoon lama xiriirin"
          }
        </td>

        <td>
          <button
            type="button"
            data-parent-action="edit"
            data-parent-id="${id}">
            Edit
          </button>

          <button
            type="button"
            data-parent-action="reset"
            data-parent-id="${id}"
            ${parent.profile_id ? "" : "disabled"}>
            Reset Password
          </button>

          <button
            type="button"
            data-parent-action="delete"
            data-parent-id="${id}">
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

/* =========================================================
   7. PARENT STATISTICS
   ========================================================= */

function updateParentStatistics(parents) {
  const list = Array.isArray(parents) ? parents : [];
  const count = list.length;

  const total =
    parentElement("totalParents") ||
    parentElement("parentTotal");

  if (total) {
    total.textContent = count;
  }

  const withAccounts = list.filter(
    parent => Boolean(parent.profile_id)
  ).length;

  const accountCount =
    parentElement("parentsWithAccounts") ||
    parentElement("parentAccounts");

  if (accountCount) {
    accountCount.textContent = withAccounts;
  }

  const noAccountCount =
    parentElement("parentsWithoutAccounts") ||
    parentElement("parentsPending");

  if (noAccountCount) {
    noAccountCount.textContent =
      count - withAccounts;
  }
}

/* =========================================================
   8. CREATE PARENT RECORD
   ========================================================= */

async function createParentRecord(parentData) {
  const { profile } = await getAdminSession();

  /*
   * Super Admin badanaa institution_id kuma xirna.
   * Sidaas darteed HTML-ku waa inuu bixiyaa
   * parentInstitution haddii database-ku u baahan yahay
   * institution gaar ah.
   */

  const institutionId =
    parentData.institution_id ||
    profile.institution_id ||
    null;

  if (!institutionId) {
    throw new Error(
      "Institution ID lama helin. Fadlan ku dar " +
      'HTML-ka dropdown leh id="parentInstitution", ' +
      "kadibna dooro hay'adda waalidka."
    );
  }

  const record = {
    institution_id: institutionId,
    full_name: parentData.full_name,
    phone: parentData.phone || null,
    email: parentData.email || null,
    address: parentData.address || null,
    occupation: parentData.occupation || null
  };

  const {
    data,
    error
  } = await parentSupabase
    .from(PARENT_TABLE)
    .insert(record)
    .select()
    .single();

  if (error) {
    throw new Error(
      "Diiwaanka waalidka lama abuuri karin: " +
      error.message
    );
  }

  return data;
}

/* =========================================================
   9. CREATE PARENT ACCOUNT
   ========================================================= */

async function createParentAccount(
  parentDbId,
  email,
  password
) {
  if (!parentDbId) {
    throw new Error(
      "Parent ID waa loo baahan yahay."
    );
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      "Geli email sax ah."
    );
  }

  if (!password || password.length < 8) {
    throw new Error(
      "Password-ku waa inuu leeyahay ugu yaraan 8 xaraf."
    );
  }

  return callParentAccountFunction({
    action: "create",
    parent_db_id: parentDbId,
    email,
    password
  });
}

/* =========================================================
   10. REGISTER PARENT FROM FORM
   Expected IDs:
   parentForm, parentName, parentPhone, parentEmail,
   parentAddress, parentOccupation, parentPassword,
   parentInstitution
   ========================================================= */

async function handleParentFormSubmit(event) {
  if (event) event.preventDefault();

  let createdParent = null;

  try {
    const fullName = parentValue("parentName");
    const phone = parentValue("parentPhone");
    const email = parentValue("parentEmail");
    const address = parentValue("parentAddress");
    const occupation = parentValue("parentOccupation");
    const password = parentValue("parentPassword");
    const institutionId = parentValue("parentInstitution");

    if (!fullName) {
      throw new Error("Geli magaca waalidka.");
    }

    if (!email) {
      throw new Error("Geli email-ka waalidka.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Email-ka aad gelisay sax ma aha.");
    }

    if (!password || password.length < 8) {
      throw new Error(
        "Geli password ugu yaraan 8 xaraf ah."
      );
    }

    parentShowBusy(
      true,
      "Waalidka iyo akoonkiisa ayaa la abuurayaa..."
    );

    createdParent = await createParentRecord({
      institution_id: institutionId,
      full_name: fullName,
      phone,
      email,
      address,
      occupation
    });

    try {
      await createParentAccount(
        createdParent.id,
        email,
        password
      );
    } catch (accountError) {
      console.error(
        "Abuurista akoonka waalidka way fashilantay:",
        accountError
      );

      throw new Error(
        "Diiwaanka waalidka waa la sameeyay, laakiin " +
        "akoontiisa lama abuurin. Ha ku celin diiwaangelinta. " +
        "Hubi Edge Function-ka create-parent-account. Sababta: " +
        accountError.message
      );
    }

    parentNotify(
      "Waalidka iyo akoonkiisa si guul leh ayaa loo abuuray.",
      "success"
    );

    const form = parentElement("parentForm");

    if (form) {
      form.reset();
    }

    await loadParents();

  } catch (error) {
    parentNotify(error.message, "error");

  } finally {
    parentShowBusy(false);
  }
}

/* =========================================================
   11. EDIT PARENT
   ========================================================= */

async function editParent(parentId) {
  try {
    await getAdminSession();

    const {
      data: parent,
      error
    } = await parentSupabase
      .from(PARENT_TABLE)
      .select("*")
      .eq("id", parentId)
      .single();

    if (error) throw error;

    const newName = prompt(
      "Magaca waalidka:",
      parent.full_name || ""
    );

    if (newName === null) return;

    if (!newName.trim()) {
      throw new Error(
        "Magacu ma bannaanaan karo."
      );
    }

    const newPhone = prompt(
      "Telefoonka waalidka:",
      parent.phone || ""
    );

    if (newPhone === null) return;

    const newEmail = prompt(
      "Email-ka waalidka:",
      parent.email || ""
    );

    if (newEmail === null) return;

    const newAddress = prompt(
      "Cinwaanka waalidka:",
      parent.address || ""
    );

    if (newAddress === null) return;

    const newOccupation = prompt(
      "Shaqada waalidka:",
      parent.occupation || ""
    );

    if (newOccupation === null) return;

    const {
      error: updateError
    } = await parentSupabase
      .from(PARENT_TABLE)
      .update({
        full_name: newName.trim(),
        phone: newPhone.trim() || null,
        email: newEmail.trim() || null,
        address: newAddress.trim() || null,
        occupation: newOccupation.trim() || null
      })
      .eq("id", parentId);

    if (updateError) throw updateError;

    parentNotify(
      "Xogta waalidka waa la cusboonaysiiyay.",
      "success"
    );

    await loadParents();

  } catch (error) {
    parentNotify(error.message, "error");
  }
}

/* =========================================================
   12. RESET PARENT PASSWORD
   ========================================================= */

async function resetParentPassword(parentId) {
  try {
    const parent = (
      window.gaaowParents || []
    ).find(item => item.id === parentId);

    if (!parent) {
      throw new Error("Waalidka lama helin.");
    }

    if (!parent.profile_id) {
      throw new Error(
        "Waalidkan weli ma laha akoon ku xiran."
      );
    }

    const newPassword = prompt(
      "Geli password cusub oo ugu yaraan 8 xaraf ah:"
    );

    if (newPassword === null) return;

    if (newPassword.length < 8) {
      throw new Error(
        "Password-ku waa inuu leeyahay ugu yaraan 8 xaraf."
      );
    }

    const result = await callParentAccountFunction({
      action: "reset",
      parent_db_id: parentId,
      password: newPassword
    });

    parentNotify(
      result.message ||
      "Password-ka waa la cusboonaysiiyay.",
      "success"
    );

  } catch (error) {
    parentNotify(error.message, "error");
  }
}

/* =========================================================
   13. ENABLE / DISABLE PARENT ACCOUNT
   ========================================================= */

async function setParentAccountStatus(
  parentId,
  isActive
) {
  try {
    await getAdminSession();

    const {
      data: parent,
      error: parentError
    } = await parentSupabase
      .from(PARENT_TABLE)
      .select("id, profile_id, full_name")
      .eq("id", parentId)
      .single();

    if (parentError) throw parentError;

    if (!parent.profile_id) {
      throw new Error(
        "Waalidkan ma laha profile account."
      );
    }

    const {
      error
    } = await parentSupabase
      .from(PROFILE_TABLE)
      .update({
        is_active: Boolean(isActive)
      })
      .eq("id", parent.profile_id);

    if (error) throw error;

    parentNotify(
      isActive
        ? "Akoonka waalidka waa la furay."
        : "Akoonka waalidka waa la joojiyay.",
      "success"
    );

    await loadParents();

  } catch (error) {
    parentNotify(error.message, "error");
  }
}

/* =========================================================
   14. DELETE PARENT RECORD
   Note: Does not delete the Supabase Auth user.
   ========================================================= */

async function deleteParent(parentId) {
  try {
    await getAdminSession();

    const parent = (
      window.gaaowParents || []
    ).find(item => item.id === parentId);

    if (!parent) {
      throw new Error("Waalidka lama helin.");
    }

    const confirmed = confirm(
      `Ma hubtaa inaad tirtirayso diiwaanka ` +
      `${parent.full_name}? ` +
      "Tallaabadani waxay saamayn kartaa xiriirrada " +
      "ardayda ee ku xiran waalidkan."
    );

    if (!confirmed) return;

    const {
      error
    } = await parentSupabase
      .from(PARENT_TABLE)
      .delete()
      .eq("id", parentId);

    if (error) {
      throw new Error(
        "Waalidka lama tirtiri karin. Hubi xiriirrada " +
        "ardayda iyo xeerarka database-ka. " +
        error.message
      );
    }

    parentNotify(
      "Diiwaanka waalidka waa la tirtiray.",
      "success"
    );

    await loadParents();

  } catch (error) {
    parentNotify(error.message, "error");
  }
}

/* =========================================================
   15. UPLOAD PARENT PHOTO
   Requires:
   - Storage bucket: parent-photos
   - HTML input: parentPhoto
   - Parent record with profile_id
   ========================================================= */

async function uploadParentPhoto(parentId) {
  try {
    await getAdminSession();

    const input = parentElement("parentPhoto");
    const file = input?.files?.[0];

    if (!file) {
      throw new Error(
        "Marka hore dooro sawirka waalidka."
      );
    }

    if (!file.type.startsWith("image/")) {
      throw new Error(
        "Faylku waa inuu noqdaa sawir."
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error(
        "Sawirku waa inuusan ka weynaan 5 MB."
      );
    }

    const {
      data: parent,
      error: parentError
    } = await parentSupabase
      .from(PARENT_TABLE)
      .select("id, profile_id")
      .eq("id", parentId)
      .single();

    if (parentError) throw parentError;

    if (!parent.profile_id) {
      throw new Error(
        "Waalidkan weli ma laha profile account."
      );
    }

    const extension = (
      file.name.split(".").pop() || "jpg"
    ).replace(/[^a-zA-Z0-9]/g, "");

    const filePath =
      `${parentId}/${Date.now()}.${extension}`;

    const {
      error: uploadError
    } = await parentSupabase.storage
      .from(PARENT_PHOTO_BUCKET)
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    /*
     * Bucket-ku waa inuu noqdaa public si public URL
     * loogu isticmaalo. Haddii uu private yahay,
     * isticmaal signed URL halkii public URL.
     */

    const {
      data: publicData
    } = parentSupabase.storage
      .from(PARENT_PHOTO_BUCKET)
      .getPublicUrl(filePath);

    const photoUrl = publicData?.publicUrl;

    if (!photoUrl) {
      throw new Error(
        "URL-ka sawirka lama helin."
      );
    }

    const {
      error: profileError
    } = await parentSupabase
      .from(PROFILE_TABLE)
      .update({
        avatar_url: photoUrl
      })
      .eq("id", parent.profile_id);

    if (profileError) throw profileError;

    parentNotify(
      "Sawirka waalidka waa la geliyay.",
      "success"
    );

  } catch (error) {
    parentNotify(error.message, "error");
  }
}

/* =========================================================
   16. SEARCH PARENTS
   ========================================================= */

function searchParents() {
  const query = parentValue(
    "parentSearch"
  ).toLowerCase();

  const filtered = (
    window.gaaowParents || []
  ).filter(parent => {
    return [
      parent.full_name,
      parent.phone,
      parent.email,
      parent.address,
      parent.occupation
    ].some(value =>
      String(value || "")
        .toLowerCase()
        .includes(query)
    );
  });

  renderParents(filtered);
}

/* =========================================================
   17. LOGOUT
   ========================================================= */

async function parentLogout() {
  try {
    parentRequireClient();

    const {
      error
    } = await parentSupabase.auth.signOut();

    if (error) throw error;

    window.location.href = "index.html";

  } catch (error) {
    parentNotify(error.message, "error");
  }
}

/* =========================================================
   18. INITIALIZE PAGE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    if (!parentSupabase) {
      parentNotify(
        "Supabase client lama helin. Hubi in Supabase JS " +
        "iyo configuration-ku ka horreeyaan parent.js.",
        "error"
      );
      return;
    }

    const form = parentElement("parentForm");

    if (form) {
      form.addEventListener(
        "submit",
        handleParentFormSubmit
      );
    }

    const search = parentElement("parentSearch");

    if (search) {
      search.addEventListener(
        "input",
        searchParents
      );
    }

    const refreshButton =
      parentElement("refreshParents");

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        loadParents
      );
    }

    const logoutButton =
      parentElement("parentLogout");

    if (logoutButton) {
      logoutButton.addEventListener(
        "click",
        parentLogout
      );
    }

    /*
     * Event delegation: waxay ka shaqaysaa badhamada
     * miiska xitaa marka xogta dib loo soo geliyo.
     */

    const tableBody =
      parentElement("parentsTableBody") ||
      parentElement("parentsList") ||
      parentElement("parentsTable");

    if (tableBody) {
      tableBody.addEventListener("click", event => {
        const button = event.target.closest(
          "button[data-parent-action]"
        );

        if (!button) return;

        const id = button.dataset.parentId;
        const action = button.dataset.parentAction;

        if (action === "edit") {
          editParent(id);
        } else if (action === "reset") {
          resetParentPassword(id);
        } else if (action === "delete") {
          deleteParent(id);
        }
      });
    }

    loadParents();
  }
);

/* =========================================================
   19. EXPOSE FUNCTIONS FOR HTML
   ========================================================= */

window.loadParents = loadParents;
window.createParentAccount = createParentAccount;
window.handleParentFormSubmit = handleParentFormSubmit;
window.editParent = editParent;
window.resetParentPassword = resetParentPassword;
window.setParentAccountStatus = setParentAccountStatus;
window.deleteParent = deleteParent;
window.uploadParentPhoto = uploadParentPhoto;
window.searchParents = searchParents;
window.parentLogout = parentLogout;
window.parentSetValue = parentSetValue;
