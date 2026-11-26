/* GAAWOW EMS: WhatsApp click-to-chat buttons (Phase 1, no API, no cost).
   Adds a green WhatsApp button to every table row that has a phone number.
   Works on Students, Teachers and Parent Management pages. */
(function () {
  "use strict";
  var COUNTRY_CODE = "252"; // Somalia. Change if needed.
  var page = location.pathname.toLowerCase();
  var kind = page.indexOf("parent") > -1 ? "parent" : page.indexOf("teacher") > -1 ? "teacher" : "student";

  function normalize(raw) {
    var d = String(raw).replace(/[^\d+]/g, "");
    if (d.charAt(0) === "+") d = d.slice(1);
    else {
      d = d.replace(/^00/, "");
      if (d.indexOf(COUNTRY_CODE) !== 0) d = COUNTRY_CODE + d.replace(/^0+/, "");
    }
    return d.length >= 10 && d.length <= 15 ? d : "";
  }

  function greeting(name) {
    var who = kind === "teacher" ? "macallin " + name : name;
    return "Assalaamu calaykum " + who + ", waxaan ka nahay GAAWOW Academy. ";
  }

  function headerIndex(table, re) {
    var ths = table.querySelectorAll("thead th");
    for (var i = 0; i < ths.length; i++) {
      if (re.test(ths[i].textContent.trim().toLowerCase())) return i;
    }
    return -1;
  }

  function process() {
    document.querySelectorAll("table").forEach(function (table) {
      var phoneCol = headerIndex(table, /^(phone|contact)$/);
      var nameCol = headerIndex(table, /^(name|full name|teacher|parent|student)$/);
      var actCol = headerIndex(table, /^actions?$/);
      if (phoneCol < 0 || actCol < 0) return;
      table.querySelectorAll("tbody tr").forEach(function (tr) {
        if (tr.dataset.wa) return;
        var cells = tr.children;
        if (cells.length <= Math.max(phoneCol, actCol)) return;
        tr.dataset.wa = "1";
        var m = cells[phoneCol].textContent.match(/\+?\d[\d\s().-]{6,}\d/);
        var num = m ? normalize(m[0]) : "";
        if (!num) return;
        var nameCell = nameCol >= 0 ? cells[nameCol] : null;
        var name = nameCell ? ((nameCell.querySelector("strong,b") || nameCell).textContent || "").trim() : "";
        var a = document.createElement("a");
        a.href = "https://wa.me/" + num + "?text=" + encodeURIComponent(greeting(name || "ardayga"));
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "WhatsApp";
        a.title = "Fur WhatsApp";
        a.style.cssText = "display:inline-block;background:#25D366;color:#fff;border-radius:7px;padding:7px 9px;font-size:11px;font-weight:700;text-decoration:none;margin:2px";
        var box = cells[actCol].querySelector(".actions") || cells[actCol];
        box.appendChild(a);
      });
    });
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; process(); });
  }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  schedule();
})();
