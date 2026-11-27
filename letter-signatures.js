/* GAAWOW EMS: official signature blocks for the Authentication Letter.
   Left : Academic Registrar  - Eng. Moscab Osmaan Mohamed
   Right: Director / Founder  - Dr. Osmaan Mohamed Ibraahin
   Signatures are written in an official handwriting-style font.
   Add to authentication-letter.html, just before </body>:
   <script src="letter-signatures.js?v=1"></script>  */
(function () {
  "use strict";

  var PEOPLE = {
    registrar: {
      ink: "Moscab Osmaan Mohamed",
      font: "'Mrs Saint Delafield','Brush Script MT',cursive",
      name: "Eng. Moscab Osmaan Mohamed",
      title: "Academic Registrar"
    },
    director: {
      ink: "Osmaan Mohamed Ibraahin",
      font: "'Herr Von Muellerhoff','Brush Script MT',cursive",
      name: "Dr. Osmaan Mohamed Ibraahin",
      title: "Director / Founder"
    }
  };

  // Handwriting fonts
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Herr+Von+Muellerhoff&family=Mrs+Saint+Delafield&display=swap";
  document.head.appendChild(link);

  // Styles
  var css = document.createElement("style");
  css.textContent =
    ".signature-block .signature-space{height:36px;display:flex;align-items:flex-end;justify-content:center}" +
    ".signature-block .sig-ink{font-size:32px;line-height:.9;color:#10245E;white-space:nowrap;transform:rotate(-3deg);margin-bottom:-3px;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".signature-block .sig-org{display:block;margin-top:2px;color:#65718A;font-size:6.5px;font-weight:800;letter-spacing:.5px;text-transform:uppercase}" +
    "@media(max-width:850px){.signature-block .signature-space{height:30px}.signature-block .sig-ink{font-size:23px}.signature-block .sig-org{font-size:5.2px}}" +
    "@media print{.signature-block .signature-space{height:24px}.signature-block .sig-ink{font-size:26px}}";
  document.head.appendChild(css);

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function apply() {
    var blocks = document.querySelectorAll(".signature-block");
    if (!blocks.length) return;
    blocks.forEach(function (block, i) {
      if (block.dataset.signed) return;
      var isRegistrar = /registrar/i.test(block.textContent) || i === 0;
      var p = isRegistrar ? PEOPLE.registrar : PEOPLE.director;
      block.dataset.signed = "1";
      block.innerHTML =
        '<div class="signature-space"><div class="sig-ink" style="font-family:' + p.font + '">' + esc(p.ink) + "</div></div>" +
        '<div class="signature-line"></div>' +
        "<strong>" + esc(p.name) + "</strong>" +
        '<span class="sig-org">' + esc(p.title) + " · GAAWOW ACADEMY</span>";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
  // If the page redraws the footer later, apply again to new blocks.
  new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
})();
