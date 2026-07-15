/* Prismatic Care — accessibility toolbar.
   Self-contained: injects its own styles and UI, no dependencies.
   Loaded in <head> (not deferred) so saved settings apply before first paint,
   which avoids a flash of unscaled text for the people who need the setting.

   Controls: text size, contrast, link underlines, reduced motion.
   Preferences persist per browser in localStorage. */
(function () {
  "use strict";

  var KEY = "pc_a11y_v1";
  var SCALES = [100, 115, 130, 150]; // % of root font size; all site text is rem-based
  var root = document.documentElement;

  // ---------- state ----------
  var state = { scale: 100, contrast: false, underline: false, motion: null };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (SCALES.indexOf(s.scale) > -1) state.scale = s.scale;
        state.contrast = !!s.contrast;
        state.underline = !!s.underline;
        if (typeof s.motion === "boolean") state.motion = s.motion;
      }
    } catch (e) {}
    // If the person has never chosen, follow the operating system setting.
    if (state.motion === null) {
      try { state.motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
      catch (e) { state.motion = false; }
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function apply() {
    root.style.fontSize = state.scale === 100 ? "" : state.scale + "%";
    // Headings use clamp() with a vw term, which ignores root font-size. This
    // variable scales that term by the same factor so headings grow in step.
    if (state.scale === 100) root.style.removeProperty("--a11y-scale");
    else root.style.setProperty("--a11y-scale", String(state.scale / 100));
    root.classList.toggle("a11y-scaled", state.scale > 100);
    root.classList.toggle("a11y-contrast", state.contrast);
    root.classList.toggle("a11y-underline", state.underline);
    root.classList.toggle("a11y-reduce-motion", !!state.motion);
  }

  // ---------- styles ----------
  var CSS = [
    /* ===== overrides the toolbar controls ===== */
    /* High contrast: the site is fully tokenised, so re-pointing the tokens
       cascades everywhere without touching component CSS. */
    "html.a11y-contrast{--ink:#000000;--ink-soft:#1a1a1a;--ink-faint:#2b2b2b;--ink-2:#1a1a1a;",
    "--paper:#ffffff;--card:#ffffff;--panel:#ffffff;--panel-2:#ffffff;--line:#000000;}",
    /* Gradient text has poor contrast; fall back to the inherited text colour so it
       stays readable on both the dark hero and light sections. */
    "html.a11y-contrast .spec,html.a11y-contrast .hero h1 .spec{background:none !important;",
    "-webkit-background-clip:border-box !important;background-clip:border-box !important;",
    "-webkit-text-fill-color:currentColor !important;color:inherit !important;}",
    "html.a11y-contrast .card,html.a11y-contrast .req,html.a11y-contrast .ndis-card,",
    "html.a11y-contrast .post-card,html.a11y-contrast .staff-card{border:2px solid #000 !important;}",
    "html.a11y-contrast a:focus-visible,html.a11y-contrast button:focus-visible,",
    "html.a11y-contrast input:focus-visible,html.a11y-contrast textarea:focus-visible{",
    "outline:3px solid #000 !important;outline-offset:2px !important;}",

    /* Underline links (skips buttons so they keep their shape) */
    "html.a11y-underline a:not(.btn):not(.brand):not(.nav-cta){text-decoration:underline !important;text-underline-offset:2px;}",

    /* When text is enlarged, elements that normally sit on one line (buttons, chips,
       phone numbers) must be allowed to wrap, or they push the layout sideways on
       narrow phones. Only applies while a larger size is chosen. */
    /* Grid and flex children default to min-width:auto, meaning a track can never
       shrink below its content. Enlarged text then pushes layouts sideways. Neither
       page sets an intentional min-width, so clearing it while scaled is safe and
       fixes the whole class of overflow rather than patching each component. */
    "html.a11y-scaled body *:not(.a11y-panel):not(.a11y-panel *){min-width:0;}",
    /* At the largest sizes a single long word (e.g. "spectrum" in the hero) can be
       wider than a small phone's screen. Allow headings to break such words rather
       than push the page sideways; normal words are unaffected. */
    "html.a11y-scaled h1,html.a11y-scaled h2,html.a11y-scaled h3{overflow-wrap:break-word;hyphens:auto;}",
    "html.a11y-scaled .btn,html.a11y-scaled .res .tel{white-space:normal;}",
    "html.a11y-scaled .hero-chips>*,html.a11y-scaled .chip,html.a11y-scaled .tag,",
    "html.a11y-scaled .btn,html.a11y-scaled .more,html.a11y-scaled .tel{overflow-wrap:anywhere;}",

    /* Reduced motion, on request or from the OS setting */
    "html.a11y-reduce-motion *,html.a11y-reduce-motion *::before,html.a11y-reduce-motion *::after{",
    "animation-duration:.001ms !important;animation-delay:0s !important;animation-iteration-count:1 !important;",
    "transition-duration:.001ms !important;scroll-behavior:auto !important;}",

    /* ===== the widget itself ===== */
    ".a11y-launch{position:fixed;right:20px;bottom:20px;z-index:900;display:inline-flex;align-items:center;gap:.6em;",
    "background:#131019;color:#fff;border:2px solid #fff;border-radius:999px;cursor:pointer;",
    "font-family:'Inter',system-ui,sans-serif;font-size:.95rem;font-weight:600;padding:12px 20px 12px 16px;",
    "box-shadow:0 10px 30px -8px rgba(0,0,0,.5);transition:transform .18s ease,box-shadow .18s ease;}",
    ".a11y-launch:hover{transform:translateY(-2px);box-shadow:0 16px 36px -10px rgba(0,0,0,.55);}",
    ".a11y-launch:focus-visible{outline:3px solid #7B2FF7;outline-offset:3px;}",
    ".a11y-launch svg{width:22px;height:22px;flex:none;}",
    ".a11y-launch .a11y-launch-txt{white-space:nowrap;}",
    /* Mobile: compact circular badge, icon only */
    "@media (max-width:640px){.a11y-launch{padding:0;width:52px;height:52px;justify-content:center;right:14px;bottom:14px;}",
    ".a11y-launch .a11y-launch-txt{display:none;}}",

    ".a11y-panel{position:fixed;right:20px;bottom:84px;z-index:901;width:320px;max-width:calc(100vw - 32px);",
    "background:#fff;color:#131019;border:1px solid #e2dcea;border-radius:18px;overflow:hidden;",
    "box-shadow:0 30px 70px -20px rgba(19,16,25,.45);font-family:'Inter',system-ui,sans-serif;}",
    "@media (max-width:640px){.a11y-panel{right:14px;bottom:76px;}}",
    ".a11y-panel[hidden]{display:none;}",
    ".a11y-bar{height:4px;background:linear-gradient(100deg,#7B2FF7,#D6249F 22%,#FB5343 42%,#FF9A1F 58%,#2FBE5B 74%,#1FA2E0 88%,#3B5BDB);}",
    ".a11y-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 6px;}",
    ".a11y-head h2{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:700;font-size:1.15rem;margin:0;letter-spacing:-.01em;color:#131019;}",
    ".a11y-close{background:transparent;border:none;cursor:pointer;padding:6px;border-radius:8px;line-height:0;color:#4c4658;}",
    ".a11y-close:hover{background:#f3eff8;color:#131019;}",
    ".a11y-close:focus-visible{outline:3px solid #7B2FF7;outline-offset:1px;}",
    ".a11y-close svg{width:18px;height:18px;}",
    ".a11y-group{padding:12px 18px;border-top:1px solid #f0ecf6;}",
    ".a11y-group:first-of-type{border-top:none;}",
    ".a11y-label{font-family:'Space Mono',ui-monospace,monospace;font-size:.66rem;letter-spacing:.16em;text-transform:uppercase;color:#6f6880;margin:0 0 9px;}",
    ".a11y-seg{display:flex;gap:6px;}",
    ".a11y-seg button{flex:1;background:#fff;border:1.5px solid #e2dcea;border-radius:10px;cursor:pointer;",
    "padding:9px 4px;color:#131019;font-family:'Inter',system-ui,sans-serif;font-weight:600;line-height:1.1;}",
    ".a11y-seg button:hover{border-color:#131019;}",
    ".a11y-seg button:focus-visible{outline:3px solid #7B2FF7;outline-offset:1px;}",
    ".a11y-seg button[aria-pressed='true']{background:#131019;border-color:#131019;color:#fff;}",
    ".a11y-seg .s1{font-size:.8rem}.a11y-seg .s2{font-size:.95rem}.a11y-seg .s3{font-size:1.1rem}.a11y-seg .s4{font-size:1.28rem}",
    ".a11y-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;",
    "background:transparent;border:none;cursor:pointer;padding:8px 0;color:#131019;font-family:'Inter',system-ui,sans-serif;",
    "font-size:.95rem;font-weight:500;text-align:left;}",
    ".a11y-toggle:focus-visible{outline:3px solid #7B2FF7;outline-offset:2px;border-radius:8px;}",
    ".a11y-sw{flex:none;width:44px;height:26px;border-radius:999px;background:#d9d2e4;position:relative;transition:background .18s ease;}",
    ".a11y-sw::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;",
    "box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .18s ease;}",
    ".a11y-toggle[aria-pressed='true'] .a11y-sw{background:#2FBE5B;}",
    ".a11y-toggle[aria-pressed='true'] .a11y-sw::after{transform:translateX(18px);}",
    ".a11y-foot{padding:10px 18px 16px;}",
    ".a11y-reset{width:100%;background:#f3eff8;border:1.5px solid #e2dcea;border-radius:10px;cursor:pointer;padding:10px;",
    "font-family:'Inter',system-ui,sans-serif;font-size:.9rem;font-weight:600;color:#131019;}",
    ".a11y-reset:hover{border-color:#131019;}",
    ".a11y-reset:focus-visible{outline:3px solid #7B2FF7;outline-offset:1px;}",
    /* The widget keeps its own contrast treatment readable too */
    "html.a11y-contrast .a11y-panel{border:2px solid #000;}",
    "html.a11y-contrast .a11y-seg button{border-color:#000;}",
    "html.a11y-contrast .a11y-launch{border-color:#fff;background:#000;}"
  ].join("");

  function injectCSS() {
    var st = document.createElement("style");
    st.setAttribute("data-a11y", "");
    st.textContent = CSS;
    (document.head || root).appendChild(st);
  }

  // ---------- UI ----------
  var ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/>' +
    '<circle cx="12" cy="6.6" r="1.5" fill="currentColor"/>' +
    '<path d="M6.8 9.4h10.4M12 9.6v4.2m0 0 2.6 4.6M12 13.8l-2.6 4.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    "</svg>";
  var X = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  var launcher, panel, lastFocus = null;

  function build() {
    if (document.querySelector(".a11y-launch")) return;

    launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "a11y-launch";
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-controls", "a11yPanel");
    launcher.setAttribute("aria-haspopup", "dialog");
    launcher.setAttribute("aria-label", "Accessibility settings");
    launcher.innerHTML = ICON + '<span class="a11y-launch-txt">Accessibility</span>';

    panel = document.createElement("div");
    panel.className = "a11y-panel";
    panel.id = "a11yPanel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Accessibility settings");
    panel.innerHTML =
      '<div class="a11y-bar"></div>' +
      '<div class="a11y-head"><h2>Accessibility</h2>' +
        '<button type="button" class="a11y-close" aria-label="Close accessibility settings">' + X + "</button></div>" +
      '<div class="a11y-group"><p class="a11y-label" id="a11yTextLbl">Text size</p>' +
        '<div class="a11y-seg" role="group" aria-labelledby="a11yTextLbl">' +
          '<button type="button" class="s1" data-scale="100" aria-label="Normal text size">A</button>' +
          '<button type="button" class="s2" data-scale="115" aria-label="Large text size">A</button>' +
          '<button type="button" class="s3" data-scale="130" aria-label="Larger text size">A</button>' +
          '<button type="button" class="s4" data-scale="150" aria-label="Largest text size">A</button>' +
        "</div></div>" +
      '<div class="a11y-group"><p class="a11y-label" id="a11yConLbl">Contrast</p>' +
        '<div class="a11y-seg" role="group" aria-labelledby="a11yConLbl">' +
          '<button type="button" class="s2" data-contrast="0">Normal</button>' +
          '<button type="button" class="s2" data-contrast="1">High</button>' +
        "</div></div>" +
      '<div class="a11y-group">' +
        '<button type="button" class="a11y-toggle" data-toggle="underline" aria-pressed="false">' +
          "<span>Underline links</span><span class=\"a11y-sw\"></span></button>" +
        '<button type="button" class="a11y-toggle" data-toggle="motion" aria-pressed="false">' +
          "<span>Reduce motion</span><span class=\"a11y-sw\"></span></button>" +
      "</div>" +
      '<div class="a11y-foot"><button type="button" class="a11y-reset">Reset to defaults</button></div>';

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    launcher.addEventListener("click", function () { toggle(!isOpen()); });
    panel.querySelector(".a11y-close").addEventListener("click", function () { toggle(false); });

    panel.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-scale")) { state.scale = parseInt(b.getAttribute("data-scale"), 10); commit(); }
      else if (b.hasAttribute("data-contrast")) { state.contrast = b.getAttribute("data-contrast") === "1"; commit(); }
      else if (b.hasAttribute("data-toggle")) {
        var k = b.getAttribute("data-toggle");
        state[k] = !state[k];
        commit();
      } else if (b.classList.contains("a11y-reset")) {
        state.scale = 100; state.contrast = false; state.underline = false;
        try { state.motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e2) { state.motion = false; }
        commit();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) { toggle(false); }
    });
    document.addEventListener("click", function (e) {
      if (!isOpen()) return;
      if (panel.contains(e.target) || launcher.contains(e.target)) return;
      toggle(false);
    });

    sync();
  }

  function isOpen() { return !panel.hidden; }

  function toggle(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      lastFocus = document.activeElement;
      var first = panel.querySelector("button[data-scale]");
      if (first) first.focus();
    } else if (lastFocus && lastFocus.focus) {
      lastFocus.focus();
      lastFocus = null;
    }
  }

  function sync() {
    if (!panel) return;
    panel.querySelectorAll("button[data-scale]").forEach(function (b) {
      b.setAttribute("aria-pressed", parseInt(b.getAttribute("data-scale"), 10) === state.scale ? "true" : "false");
    });
    panel.querySelectorAll("button[data-contrast]").forEach(function (b) {
      b.setAttribute("aria-pressed", (b.getAttribute("data-contrast") === "1") === state.contrast ? "true" : "false");
    });
    panel.querySelectorAll("button[data-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", state[b.getAttribute("data-toggle")] ? "true" : "false");
    });
  }

  function commit() { apply(); save(); sync(); }

  // ---------- boot ----------
  load();
  apply();          // before first paint, so nothing flashes
  injectCSS();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();

  window.__a11y = { get: function () { return JSON.parse(JSON.stringify(state)); }, apply: apply };
})();
