/* GAAWOW EMS Seminar Certificate: photo + signatures + layout controls.
   Works with seminar-certificate.js, which calls window.GAA_EXTRAS(ctx) at the end of draw(). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "gaawowSeminarLayout";
  var DEFAULTS = { photoOn: true, photoX: 1330, photoY: 150, photoSize: 150, sigOn: true,
    regX: 390, regY: 748, dirX: 1146, dirY: 748, sigSize: 44, namesOn: false };
  var L = {};
  try { L = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch (e) { L = Object.assign({}, DEFAULTS); }

  var FONT_REG = "'Mrs Saint Delafield','Brush Script MT',cursive";
  var FONT_DIR = "'Herr Von Muellerhoff','Brush Script MT',cursive";
  var sb = window.supabase ? window.supabase.createClient(
    "https://mytyvqwrxnxpxnxpiicj.supabase.co", "sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145") : null;

  var photo = new Image();
  var uploaded = false;
  var IDS = { photoOn: "lyPhotoOn", photoX: "lyPhotoX", photoY: "lyPhotoY", photoSize: "lyPhotoSize",
    sigOn: "lySigOn", regX: "lyRegX", regY: "lyRegY", dirX: "lyDirX", dirY: "lyDirY",
    sigSize: "lySigSize", namesOn: "lyNamesOn" };

  function redraw() { var t = $("seminarTitle"); if (t) t.dispatchEvent(new Event("input")); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) {} }
  photo.onload = redraw;
  photo.onerror = function () { if (!uploaded) redraw(); };

  function ink(name) { return String(name || "").replace(/^(dr|eng|prof|mr|mrs|ms)\.?\s+/i, "").trim(); }

  function drawPhoto(ctx) {
    if (!L.photoOn || !photo.complete || !photo.naturalWidth) return;
    var r = L.photoSize / 2, x = L.photoX, y = L.photoY;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    var s = Math.max(2 * r / photo.naturalWidth, 2 * r / photo.naturalHeight);
    var w = photo.naturalWidth * s, h = photo.naturalHeight * s;
    ctx.drawImage(photo, x - w / 2, y - h / 2, w, h);
    ctx.restore();
    ctx.save();
    ctx.lineWidth = 7; ctx.strokeStyle = "#D4AF37";
    ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = "#8B6818";
    ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function sign(ctx, text, x, y, family) {
    if (!text) return;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-0.05);
    ctx.fillStyle = "#10245E"; ctx.textAlign = "center";
    var size = L.sigSize;
    ctx.font = size + "px " + family;
    while (ctx.measureText(text).width > 340 && size > 18) { size -= 2; ctx.font = size + "px " + family; }
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  function typedName(ctx, text, x, y) {
    if (!text) return;
    ctx.save();
    ctx.fillStyle = "#1D2B49"; ctx.textAlign = "center"; ctx.font = "bold 15px Georgia, serif";
    ctx.fillText(text, x, y + 26);
    ctx.restore();
  }

  window.GAA_EXTRAS = function (ctx) {
    drawPhoto(ctx);
    if (L.sigOn) {
      var reg = $("registrar").value.trim(), dir = $("director").value.trim();
      sign(ctx, ink(reg), L.regX, L.regY, FONT_REG);
      sign(ctx, ink(dir), L.dirX, L.dirY, FONT_DIR);
      if (L.namesOn) { typedName(ctx, reg, L.regX, L.regY); typedName(ctx, dir, L.dirX, L.dirY); }
    }
  };

  // Controls
  Object.keys(IDS).forEach(function (k) {
    var el = $(IDS[k]); if (!el) return;
    var out = el.type === "range" ? el.parentNode.querySelector("b") : null;
    if (el.type === "checkbox") el.checked = !!L[k]; else el.value = L[k];
    if (out) out.textContent = L[k];
    el.addEventListener("input", function () {
      L[k] = el.type === "checkbox" ? el.checked : Number(el.value);
      if (out) out.textContent = L[k];
      save(); redraw();
    });
  });
  $("lyReset").addEventListener("click", function () {
    L = Object.assign({}, DEFAULTS); save();
    Object.keys(IDS).forEach(function (k) {
      var el = $(IDS[k]); if (!el) return;
      if (el.type === "checkbox") el.checked = !!L[k]; else el.value = L[k];
      var b = el.type === "range" ? el.parentNode.querySelector("b") : null; if (b) b.textContent = L[k];
    });
    redraw();
  });

  // Photo source: student's saved photo, or an uploaded file
  function useStudentPhoto() {
    uploaded = false;
    var id = $("student").value, wrap = $("photoWrap"), img = $("studentPhoto");
    if (!id || !sb) { photo.removeAttribute("src"); wrap.classList.add("hide"); redraw(); return; }
    sb.from("students").select("photo_url").eq("id", id).maybeSingle().then(function (r) {
      var url = r && r.data && r.data.photo_url;
      if (url && /^https:\/\//i.test(url)) {
        photo.crossOrigin = "anonymous";
        photo.src = url;
        img.src = url; wrap.classList.remove("hide");
      } else { photo.removeAttribute("src"); wrap.classList.add("hide"); redraw(); }
    });
  }
  $("student").addEventListener("change", useStudentPhoto);
  $("photoReset").addEventListener("click", function () { $("photoFile").value = ""; useStudentPhoto(); });
  $("photoFile").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 3 * 1024 * 1024) {
      alert("Choose a JPG, PNG or WEBP photo under 3 MB."); e.target.value = ""; return;
    }
    var fr = new FileReader();
    fr.onload = function () {
      uploaded = true; photo.removeAttribute("crossorigin"); photo.crossOrigin = null;
      photo.src = fr.result; $("studentPhoto").src = fr.result; $("photoWrap").classList.remove("hide");
    };
    fr.readAsDataURL(f);
  });

  // Redraw when handwriting fonts are ready
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load("40px 'Mrs Saint Delafield'"), document.fonts.load("40px 'Herr Von Muellerhoff'")])
      .then(redraw).catch(function () {});
  }
  redraw();
})();
