// @ts-check
/*
 * Webring widget v1: <webring-nav member="ID"> custom element.
 * Plain JavaScript, no dependencies, no network calls. The links point at the
 * ring's own /ring/* redirect routes, and the ring's address is taken from this
 * script's own src. Markup is built with createElement/textContent only.
 */
(function () {
  "use strict";

  var TAG = "webring-nav";
  var ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

  var script = /** @type {HTMLScriptElement | null} */ (document.currentScript);
  var origin = "";
  try {
    origin = script && script.src ? new URL(script.src).origin : "";
  } catch {
    origin = "";
  }
  // No usable origin or no custom elements: do nothing, so the fallback links
  // inside <webring-nav> keep working.
  if (!origin || !window.customElements || customElements.get(TAG)) return;

  var name =
    (script && script.getAttribute("data-name")) || new URL(origin).hostname;

  var CSS =
    ":host{display:inline-block;color:var(--webring-color,inherit);" +
    "font:var(--webring-font,inherit)}" +
    ":host([hidden]){display:none}" +
    "nav{display:flex;flex-wrap:wrap;align-items:center;" +
    "gap:var(--webring-gap,.75em);padding:.5em .75em;" +
    "border:1px solid var(--webring-border,rgba(128,128,128,.45));" +
    "border-radius:var(--webring-radius,0);" +
    "background:var(--webring-background,transparent)}" +
    "a{color:inherit;text-decoration:underline;text-underline-offset:.2em}" +
    "a:hover{text-decoration-thickness:2px}" +
    "a:focus-visible{outline:2px solid currentColor;outline-offset:2px}" +
    ".title{font-size:.85em;opacity:.8}";

  /** @type {CSSStyleSheet | null} */
  var sheet = null;

  /** @param {ShadowRoot} root */
  function applyStyles(root) {
    if (
      "adoptedStyleSheets" in root &&
      typeof CSSStyleSheet !== "undefined" &&
      "replaceSync" in CSSStyleSheet.prototype
    ) {
      try {
        if (!sheet) {
          sheet = new CSSStyleSheet();
          sheet.replaceSync(CSS);
        }
        root.adoptedStyleSheets = [sheet];
        return;
      } catch {
        // fall through to a <style> element
      }
    }
    var style = document.createElement("style");
    style.textContent = CSS;
    root.appendChild(style);
  }

  class WebringNav extends HTMLElement {
    static get observedAttributes() {
      return ["member", "compact"];
    }

    connectedCallback() {
      this.render();
    }

    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }

    render() {
      var member = this.getAttribute("member");
      // Invalid or missing member: leave the light-DOM fallback links visible.
      if (!member || !ID_RE.test(member)) return;

      var id = encodeURIComponent(member);
      var compact = this.hasAttribute("compact");
      var root = this.shadowRoot || this.attachShadow({ mode: "open" });
      while (root.firstChild) root.removeChild(root.firstChild);
      applyStyles(root);

      var nav = document.createElement("nav");
      nav.setAttribute("aria-label", "Webring");

      if (!compact) {
        var title = document.createElement("a");
        title.className = "title";
        title.href = origin + "/";
        title.textContent = name;
        nav.appendChild(title);
      }

      // [label, icon, href, where the icon sits in the full (non-compact) look]
      var items = [
        ["Previous", "\u2190", origin + "/ring/prev/" + id, "before"],
        ["Random", "\u21BB", origin + "/ring/random?from=" + id, ""],
        ["Next", "\u2192", origin + "/ring/next/" + id, "after"],
      ];
      for (var i = 0; i < items.length; i++) {
        var label = items[i][0];
        var icon = items[i][1];
        var link = document.createElement("a");
        link.href = items[i][2];
        if (compact) {
          link.textContent = icon;
          link.setAttribute("aria-label", label);
        } else {
          var text = document.createTextNode(label);
          var arrow = document.createElement("span");
          arrow.setAttribute("aria-hidden", "true");
          arrow.textContent = icon;
          if (items[i][3] === "before") {
            link.appendChild(arrow);
            link.appendChild(document.createTextNode(" "));
            link.appendChild(text);
          } else if (items[i][3] === "after") {
            link.appendChild(text);
            link.appendChild(document.createTextNode(" "));
            link.appendChild(arrow);
          } else {
            link.appendChild(text);
          }
        }
        nav.appendChild(link);
      }

      root.appendChild(nav);
    }
  }

  customElements.define(TAG, WebringNav);
})();
