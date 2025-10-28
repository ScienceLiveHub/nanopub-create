var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function() {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload")) return;
  for (const r of document.querySelectorAll('link[rel="modulepreload"]')) n(r);
  new MutationObserver((r) => {
    for (const o of r) if (o.type === "childList") for (const i of o.addedNodes) i.tagName === "LINK" && i.rel === "modulepreload" && n(i);
  }).observe(document, { childList: true, subtree: true });
  function t(r) {
    const o = {};
    return r.integrity && (o.integrity = r.integrity), r.referrerPolicy && (o.referrerPolicy = r.referrerPolicy), r.crossOrigin === "use-credentials" ? o.credentials = "include" : r.crossOrigin === "anonymous" ? o.credentials = "omit" : o.credentials = "same-origin", o;
  }
  function n(r) {
    if (r.ep) return;
    r.ep = true;
    const o = t(r);
    fetch(r.href, o);
  }
})();
class Q {
  constructor(e = null) {
    e ? this.storage = e : typeof localStorage < "u" ? this.storage = localStorage : this.storage = this.createInMemoryStorage();
  }
  createInMemoryStorage() {
    const e = {};
    return { getItem: (t) => e[t] || null, setItem: (t, n) => {
      e[t] = n;
    }, removeItem: (t) => {
      delete e[t];
    } };
  }
  getItem(e) {
    return this.storage.getItem(e);
  }
  setItem(e, t) {
    this.storage.setItem(e, t);
  }
  removeItem(e) {
    this.storage.removeItem(e);
  }
}
new Q();
class q {
  constructor(e = "") {
    this.content = e, this.template = { uri: null, label: null, description: null, labelPattern: null, tags: [], types: [], prefixes: {}, placeholders: [], statements: [], labels: {}, repeatablePlaceholderIds: [], groupedStatements: [] };
  }
  async parse() {
    if (!this.content) throw new Error("No template content to parse");
    return this.parsePrefixes(), this.parseTemplateMetadata(), this.parseLabels(), this.parsePlaceholders(), await this.parsePlaceholderOptions(), this.parseStatements(), this.identifyRepeatablePlaceholders(), console.log("\u2705 Template parsed:", { label: this.template.label, labelPattern: this.template.labelPattern, types: this.template.types.length, placeholders: this.template.placeholders.length, statements: this.template.statements.length }), this.template;
  }
  parsePrefixes() {
    const e = /@prefix\s+(\w+):\s+<([^>]+)>/g;
    let t;
    for (; (t = e.exec(this.content)) !== null; ) this.template.prefixes[t[1]] = t[2];
  }
  parseTemplateMetadata() {
    const e = this.content.match(/sub:assertion\s+{([^}]+)}/s);
    if (!e) return;
    const n = e[1].match(/sub:assertion[^}]*rdfs:label\s+"([^"]+)"/);
    n && (this.template.label = n[1]);
    const r = this.content.match(/dct:description\s+"([^"]+)"/);
    r && (this.template.description = r[1]);
    const o = this.content.match(/nt:hasNanopubLabelPattern\s+"([^"]+)"/);
    o ? (this.template.labelPattern = o[1], console.log(`\u2705 Found label pattern: "${o[1]}"`)) : console.warn("\u26A0\uFE0F No nt:hasNanopubLabelPattern found in template");
    const i = this.content.match(/nt:hasTag\s+"([^"]+)"/);
    i && (this.template.tags = [i[1]]);
    const a = this.content.match(/nt:hasTargetNanopubType\s+(.+?)\s*[;.](?:\s|$)/s);
    if (a) {
      const c = a[1], l = /<([^>]+)>/g, f = [];
      let p;
      for (; (p = l.exec(c)) !== null; ) f.push(p[1]);
      this.template.types = f, console.log(`\u2705 Found ${f.length} target nanopub types:`, f);
    } else console.warn("\u26A0\uFE0F No nt:hasTargetNanopubType found in template");
  }
  parseLabels() {
    const e = /(<[^>]+>|[\w:]+)\s+rdfs:label\s+"([^"]+)"\s*[;.]/g;
    let t;
    for (; (t = e.exec(this.content)) !== null; ) {
      const n = this.cleanUri(t[1]), r = t[2];
      this.template.labels[n] = r;
    }
  }
  parsePlaceholders() {
    console.log("Parsing placeholders...");
    const e = /(sub:[\w-]+)\s+a\s+nt:([\w,\s]+(Placeholder|Resource)[^;.\n]*)[;.]/g;
    let t;
    for (; (t = e.exec(this.content)) !== null; ) {
      const n = t[1], r = t[2].trim(), o = t.index;
      let i = this.content.length;
      const c = this.content.substring(o).substring(1).search(/\n\s*(?:sub:[\w-]+\s+a\s+nt:|})/);
      c > 0 && (i = o + c + 1);
      const l = this.content.substring(o, i);
      console.log(`
--- Parsing ${n} ---`), console.log(`Block length: ${l.length} chars`), console.log(`Block preview: ${l.substring(0, 200)}...`);
      const f = r.split(",").map((m) => m.trim()), p = f[0].replace(/^nt:/, ""), d = { id: this.cleanUri(n), type: p, isLocalResource: f.some((m) => m.includes("LocalResource")), isIntroducedResource: f.some((m) => m.includes("IntroducedResource")), label: this.extractLabel(l), description: this.extractDescription(l), validation: this.extractValidation(l), possibleValuesFrom: null, possibleValuesFromApi: null, options: [], prefix: null, hasDatatype: null };
      if (p.includes("AutoEscapeUriPlaceholder")) {
        const m = l.match(/nt:hasPrefix\s+"([^"]+)"/);
        m && (d.prefix = m[1], console.log(`  \u2192 Found prefix for AutoEscapeUriPlaceholder: ${d.prefix}`));
      }
      const b = l.match(/nt:hasDatatype\s+<([^>]+)>/);
      if (b && (d.hasDatatype = b[1], console.log(`  \u2192 Found datatype: ${d.hasDatatype}`)), p.includes("RestrictedChoice")) {
        const m = l.match(/nt:possibleValuesFrom\s+(?:<([^>]+)>|([\w-]+:[\w-]+))/);
        if (m) {
          const w = m[1] || m[2];
          if (w && w.includes(":") && !w.startsWith("http")) {
            const [j, L] = w.split(":"), P = this.content.match(new RegExp(`@prefix ${j}:\\s+<([^>]+)>`));
            P ? d.possibleValuesFrom = P[1] + L : d.possibleValuesFrom = w;
          } else d.possibleValuesFrom = w;
          console.log(`  \u2192 Will fetch options from: ${d.possibleValuesFrom}`);
        }
        const v = l.match(/nt:possibleValue\s+([\s\S]+?)(?:\s+\.(?:\s|$))/);
        if (v) {
          const w = v[1];
          console.log(`  \u2192 Raw value text: ${w.substring(0, 100)}...`);
          const j = [], L = /<([^>]+)>|([\w-]+:[\w-]+)/g;
          let P;
          for (; (P = L.exec(w)) !== null; ) j.push(P[1] || P[2]);
          j.length > 0 ? (d.options = j.map((C) => {
            let $ = this.template.labels[C];
            return $ || (C.startsWith("http") ? ($ = C.replace(/^https?:\/\//, "").replace(/\/$/, ""), $ = $.charAt(0).toUpperCase() + $.slice(1)) : C.includes(":") ? $ = C.split(":")[1] : $ = C), { value: C, label: $ };
          }), console.log(`  \u2192 Found ${d.options.length} inline options:`, d.options.map((C) => C.label))) : console.warn("  \u2192 No values found in possibleValue text");
        }
      }
      if (p.includes("GuidedChoice")) {
        const m = l.match(/nt:possibleValuesFromApi\s+"([^"]+)"/);
        m && (d.possibleValuesFromApi = m[1]);
      }
      console.log(`Found placeholder: ${d.id} (${d.type})`), this.template.placeholders.push(d);
    }
    console.log(`Total placeholders found: ${this.template.placeholders.length}`);
  }
  async parsePlaceholderOptions() {
    for (const e of this.template.placeholders) if (e.possibleValuesFrom && e.options.length === 0) try {
      const t = e.possibleValuesFrom.replace(/^https?:\/\/(w3id\.org|purl\.org)\/np\//, "https://np.petapico.org/") + ".trig";
      console.log(`Fetching options for ${e.id} from ${t}`);
      const n = await fetch(t);
      if (!n.ok) {
        console.warn(`Failed to fetch options: HTTP ${n.status}`);
        continue;
      }
      const r = await n.text();
      console.log(`  \u2192 Fetched ${r.length} chars`);
      let o = "";
      const i = r.match(/@prefix sub:\s+<([^>]+)>/);
      i && (o = i[1]);
      const a = /<([^>]+)>\s+rdfs:label\s+"([^"]+)"/g, c = /(sub:[\w-]+)\s+rdfs:label\s+"([^"]+)"/g;
      e.options = [];
      let l = 0;
      for (const f of r.matchAll(a)) {
        l++;
        const p = f[1], d = f[2];
        console.log(`  \u2192 Match ${l} (full URI): URI=${p}, Label="${d}"`), p.includes("#assertion") || p.includes("#Head") || p.includes("#provenance") || p.includes("#pubinfo") || p.includes("ntemplate") || p.includes("rdf-syntax") || p.includes("XMLSchema") || p.includes("rdfs#") || p.includes("dc/terms") || p.includes("foaf/0.1") || p.includes("nanopub/x/") || p.includes("nanopub.org/nschema") || d.includes("Template:") || d.includes("Making a statement") || d.includes("is a") || d.includes("has type") || e.options.push({ value: p, label: d });
      }
      for (const f of r.matchAll(c)) {
        l++;
        const p = f[1], d = f[2], b = p.replace("sub:", ""), m = o + b;
        console.log(`  \u2192 Match ${l} (prefixed): ${p} -> ${m}, Label="${d}"`), e.options.push({ value: m, label: d });
      }
      console.log(`  \u2192 Loaded ${e.options.length} options for ${e.id}`), e.options.length > 0 && console.log("  \u2192 First 3 options:", e.options.slice(0, 3).map((f) => f.label));
    } catch (t) {
      console.warn("Failed to fetch options for", e.id, t);
    }
  }
  parseStatements() {
    const e = this.findStatementIds();
    console.log(`Found ${e.length} statement IDs:`, e), this.parseGroupedStatements(), e.forEach((t) => {
      if (t.includes("-") && this.content.match(new RegExp(`${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+a\\s+nt:GroupedStatement`))) {
        console.log(`Skipping GroupedStatement marker: ${t}`);
        return;
      }
      const n = this.parseStatement(t);
      n && this.template.statements.push(n);
    }), console.log(`Parsed ${this.template.statements.length} statements`);
  }
  parseGroupedStatements() {
    const e = /(sub:st[\w.-]+)\s+a\s+[^;]*nt:GroupedStatement[^;]*;\s*nt:hasStatement\s+([^;.]+)/g;
    let t;
    for (; (t = e.exec(this.content)) !== null; ) {
      const n = t[1], r = t[2].split(",").map((o) => o.trim().replace(/^sub:/, ""));
      this.template.groupedStatements.push({ id: this.cleanUri(n), statements: r }), console.log(`Found grouped statement: ${n} with statements [${r.join(", ")}]`);
    }
  }
  findStatementIds() {
    const e = /* @__PURE__ */ new Set(), t = /nt:hasStatement\s+([^;.]+)/g;
    let n;
    for (; (n = t.exec(this.content)) !== null; ) n[1].split(",").map((i) => i.trim()).forEach((i) => {
      i.startsWith("sub:st") && e.add(i);
    });
    const r = /(sub:st[\w.-]+)\s+(?:a\s+nt:|rdf:)/g;
    for (; (n = r.exec(this.content)) !== null; ) e.add(n[1]);
    return Array.from(e).sort();
  }
  parseStatement(e) {
    const t = e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), n = new RegExp(`${t}\\s+(?:a\\s+[^;]+;\\s*)?(rdf:[\\s\\S]*?)(?=\\n\\s*(?:sub:[\\w.-]+|<[^>]+>)\\s+|\\n\\s*}|$)`, "i"), r = this.content.match(n);
    if (!r) return console.warn(`Could not find statement block for ${e}`), null;
    const o = r[1], i = o.match(/rdf:subject\s+(<[^>]+>|[\w:-]+)/), a = o.match(/rdf:predicate\s+(<[^>]+>|[\w:-]+)/), c = o.match(/rdf:object\s+(?:<([^>]+)>|([\w:-]+)|"([^"]+)")/);
    if (!i || !a || !c) return console.warn(`Incomplete statement ${e}:`, { subjMatch: !!i, predMatch: !!a, objMatch: !!c }), null;
    let l;
    c[1] ? l = c[1] : c[2] ? l = c[2] : c[3] && (l = c[3]);
    const p = r[0].match(/a\s+([^;.]+)/), d = p ? p[1].split(",").map((k) => k.trim()) : [], b = this.cleanUri(i[1]), m = this.cleanUri(a[1]), v = this.cleanUri(l), w = i[1] === "nt:CREATOR", j = l === "nt:CREATOR", L = !w && this.isPlaceholder(b), P = this.isPlaceholder(m), C = !j && this.isPlaceholder(v) && !c[3], $ = w ? "nt:CREATOR" : L ? null : this.expandUri(i[1]), re = this.expandUri(a[1]), se = j ? "nt:CREATOR" : C || c[3] ? null : this.expandUri(l);
    return { id: this.cleanUri(e), subject: b, predicate: m, object: v, subjectIsPlaceholder: L, predicateIsPlaceholder: P, objectIsPlaceholder: C, subjectUri: $, predicateUri: re, objectUri: se, isLiteralObject: !!c[3], repeatable: d.some((k) => k.includes("RepeatableStatement")), optional: d.some((k) => k.includes("OptionalStatement")), grouped: d.some((k) => k.includes("GroupedStatement")), types: d };
  }
  cleanUri(e) {
    return e && e.replace(/^<|>$/g, "").replace(/^"|"$/g, "").replace(/^sub:/, "").trim();
  }
  isPlaceholder(e) {
    return this.template.placeholders.some((t) => t.id === e);
  }
  getPlaceholder(e) {
    return this.template.placeholders.find((t) => t.id === e);
  }
  getStatement(e) {
    return this.template.statements.find((t) => t.id === e);
  }
  expandUri(e) {
    if (!e) return null;
    if (e = e.replace(/^<|>$/g, ""), e.startsWith("http://") || e.startsWith("https://")) return e;
    if (e.includes(":")) {
      const [t, n] = e.split(":", 2);
      if (this.template.prefixes[t]) return this.template.prefixes[t] + n;
    }
    return e;
  }
  identifyRepeatablePlaceholders() {
    const e = /* @__PURE__ */ new Set();
    this.template.statements.forEach((t) => {
      t.repeatable && (t.object && !t.object.startsWith("http") && e.add(t.object), t.predicate && !t.predicate.startsWith("http") && t.predicate !== "rdf:type" && e.add(t.predicate));
    }), this.template.repeatablePlaceholderIds = Array.from(e);
  }
  extractLabel(e) {
    const t = e.match(/rdfs:label\s+"([^"]+)"/);
    return t ? t[1] : null;
  }
  extractDescription(e) {
    const t = e.match(/dct:description\s+"([^"]+)"/);
    return t ? t[1] : null;
  }
  extractValidation(e) {
    const t = {}, n = e.match(/nt:hasRegex\s+"([^"]+)"/);
    n && (t.regex = n[1]);
    const r = e.match(/nt:hasMinLength\s+"?(\d+)"?/);
    r && (t.minLength = parseInt(r[1]));
    const o = e.match(/nt:hasMaxLength\s+"?(\d+)"?/);
    return o && (t.maxLength = parseInt(o[1])), Object.keys(t).length > 0 ? t : void 0;
  }
  static async fetchAndParse(e) {
    let t = e;
    (e.startsWith("http://purl.org/np/") || e.startsWith("https://w3id.org/np/")) && (t = `https://np.petapico.org/${e.split("/").pop()}.trig`), console.log(`Fetching template from ${t}`);
    const n = await fetch(t);
    if (!n.ok) throw new Error(`HTTP ${n.status}: ${n.statusText}`);
    const r = await n.text();
    return await new q(r).parse();
  }
}
class ee {
  constructor(e) {
    this.template = e;
  }
  detectSemanticGroups() {
    return [];
  }
  getAutofillRules() {
    return [];
  }
  customizeField(e, t) {
    return e;
  }
  validateForm(e) {
    return [];
  }
  findStatementsWithPredicate(e) {
    return this.template.statements.filter((t) => t.predicateUri === e);
  }
  findStatementsWithSubject(e) {
    return this.template.statements.filter((t) => t.subject === e);
  }
  findOptionalStatements() {
    return this.template.statements.filter((e) => e.optional);
  }
  findRequiredStatements() {
    return this.template.statements.filter((e) => !e.optional);
  }
}
class oe extends ee {
  detectSemanticGroups() {
    const e = [], t = this.template.statements.find((r) => r.predicateUri && r.predicateUri.includes("hasGeometry") && r.optional), n = this.template.statements.find((r) => r.predicateUri && r.predicateUri.includes("asWKT") && r.optional);
    return t && n && e.push({ id: "geometry-group", label: "\u{1F4CD} Geometry details (WKT format)", statements: [t.id, n.id], collapsible: true }), e;
  }
  getAutofillRules() {
    const e = this.template.statements.find((n) => n.predicateUri && n.predicateUri.includes("hasGeometry"));
    return e ? [{ trigger: "location", target: e.object, transform: (n) => n + "-geometry" }] : [];
  }
  customizeField(e, t) {
    var _a, _b;
    if (t.id === "wkt") {
      const n = document.createElement("div");
      n.className = "field-hint", n.innerHTML = "\u{1F4A1} Examples: <code>POINT(2.3 48.9)</code> or <code>POLYGON((7.5 44.3, 8.5 44.3, 8.5 44.9, 7.5 44.9, 7.5 44.3))</code>", (_a = e.parentElement) == null ? void 0 : _a.appendChild(n);
    }
    if (t.id === "paper") {
      const n = document.createElement("div");
      n.className = "field-hint", n.innerHTML = "\u{1F4A1} Format: <code>10.1234/example.2024</code>", (_b = e.parentElement) == null ? void 0 : _b.appendChild(n);
    }
    return e;
  }
}
class ie {
  static getCustomization(e) {
    const t = e.split("/").pop(), n = this.templates[t] || ee;
    return console.log(`[TemplateRegistry] Using ${n.name} for template ${t}`), n;
  }
  static register(e, t) {
    this.templates[e] = t, console.log(`[TemplateRegistry] Registered ${t.name} for ${e}`);
  }
}
__publicField(ie, "templates", { "RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao": oe });
const ae = { LiteralPlaceholder: (s) => {
  var _a;
  const e = document.createElement("input");
  return e.type = "text", e.className = "form-input", e.placeholder = s.label || "", ((_a = s.validation) == null ? void 0 : _a.regex) && (e.pattern = s.validation.regex), e;
}, LongLiteralPlaceholder: (s) => {
  const e = document.createElement("textarea");
  return e.className = "form-input", e.rows = 5, e.placeholder = s.label || "", e;
}, ExternalUriPlaceholder: (s) => {
  const e = document.createElement("input");
  return e.type = "url", e.className = "form-input", e.placeholder = s.label || "https://...", e;
}, UriPlaceholder: (s) => {
  const e = document.createElement("input");
  return e.type = "url", e.className = "form-input", e.placeholder = s.label || "https://...", e;
}, TrustyUriPlaceholder: (s) => {
  const e = document.createElement("input");
  return e.type = "url", e.className = "form-input", e.placeholder = s.label || "https://...", e;
}, RestrictedChoicePlaceholder: (s) => {
  var _a;
  const e = document.createElement("select");
  if (e.className = "form-select", s.options && s.options.length > 1) {
    const t = document.createElement("option");
    t.value = "", t.textContent = "Select...", e.appendChild(t);
  }
  return console.log(`[RestrictedChoice] Rendering ${s.id} with ${((_a = s.options) == null ? void 0 : _a.length) || 0} options`), s.options && Array.isArray(s.options) ? s.options.forEach((t, n) => {
    const r = document.createElement("option");
    r.value = t.value || t, r.textContent = t.label || t.value || t, s.options.length === 1 && (r.selected = true), e.appendChild(r);
  }) : console.warn(`[RestrictedChoice] No options found for ${s.id}`), e;
}, GuidedChoicePlaceholder: (s) => {
  const e = document.createElement("input");
  return e.type = "text", e.className = "form-input", e.placeholder = s.label || "Type to search...", e.setAttribute("data-guided-choice", "true"), e;
}, IntroducedResource: (s) => {
  const e = document.createElement("input");
  return e.type = "text", e.className = "form-input", e.placeholder = s.label || "Enter identifier", e;
}, LocalResource: (s) => {
  const e = document.createElement("input");
  return e.type = "text", e.className = "form-input", e.placeholder = s.label || "Enter identifier", e;
}, ValuePlaceholder: (s) => {
  const e = document.createElement("input");
  return e.type = "text", e.className = "form-input", e.placeholder = s.label || "Enter value", e;
}, AutoEscapeUriPlaceholder: (s) => {
  const e = document.createElement("input");
  return e.type = "text", e.className = "form-input", e.placeholder = s.label || "", e;
}, AgentPlaceholder: (s) => {
  const e = document.createElement("input");
  return e.type = "url", e.className = "form-input", e.placeholder = s.label || "https://orcid.org/...", e;
} };
function J(s, e) {
  s.classList.add("optional-collapsible");
  const t = document.createElement("div");
  t.className = "optional-toggle", t.innerHTML = `
    <span class="toggle-icon">\u25B6</span>
    <span class="toggle-label">${e}</span>
    <span class="optional-badge">Optional</span>
  `, t.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 12px;
    background: #f8f9fa;
    border: 2px solid #dee2e6;
    border-radius: 6px;
    margin-bottom: 0;
    transition: all 0.2s;
    user-select: none;
  `, t.addEventListener("mouseenter", () => {
    s.classList.contains("collapsed") && (t.style.background = "#e9ecef");
  }), t.addEventListener("mouseleave", () => {
    s.classList.contains("collapsed") && (t.style.background = "#f8f9fa");
  });
  const n = t.querySelector(".optional-badge");
  n.style.cssText = `
    background: #e7f3ff;
    color: #0066cc;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.75em;
    font-weight: 600;
    margin-left: auto;
  `;
  const r = t.querySelector(".toggle-icon");
  r.style.cssText = `
    transition: transform 0.2s;
    font-size: 0.8em;
    color: #666;
    min-width: 12px;
  `;
  const o = t.querySelector(".toggle-label");
  o.style.cssText = `
    font-weight: 500;
    color: #495057;
    flex: 1;
  `;
  const i = document.createElement("div");
  i.className = "optional-content", i.style.cssText = `
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out, padding 0.3s ease-out;
    padding: 0;
  `, Array.from(s.children).forEach((c) => i.appendChild(c)), s.appendChild(t), s.appendChild(i), s.classList.add("collapsed"), t.addEventListener("click", () => {
    const c = s.classList.contains("collapsed");
    s.classList.toggle("collapsed"), c ? (r.style.transform = "rotate(90deg)", i.style.maxHeight = i.scrollHeight + "px", i.style.padding = "15px 0 0 0", t.style.background = "#e7f3ff", t.style.borderColor = "#0066cc", n.style.background = "#d1ecf1", setTimeout(() => {
      s.classList.contains("collapsed") || (i.style.maxHeight = "none", i.style.overflow = "visible");
    }, 300)) : (i.style.maxHeight = i.scrollHeight + "px", i.style.overflow = "hidden", i.offsetHeight, setTimeout(() => {
      r.style.transform = "rotate(0deg)", i.style.maxHeight = "0", i.style.padding = "0", t.style.background = "#f8f9fa", t.style.borderColor = "#dee2e6", n.style.background = "#e7f3ff";
    }, 10));
  }), i.addEventListener("input", () => {
    s.classList.contains("collapsed") && t.click();
  }, true);
}
function le(s, e) {
  s.classList.add("optional-collapsible", "collapsed");
  const t = document.createElement("div");
  t.className = "optional-toggle", t.innerHTML = `
    <span class="toggle-icon">\u25B6</span>
    <span class="toggle-label">${e}</span>
    <span class="optional-badge">Optional</span>
  `, t.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 12px;
    background: #f8f9fa;
    border: 2px solid #dee2e6;
    border-radius: 6px;
    margin-bottom: 0;
    transition: all 0.2s;
    user-select: none;
  `;
  const n = t.querySelector(".optional-badge");
  n.style.cssText = `
    background: #e7f3ff;
    color: #0066cc;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.75em;
    font-weight: 600;
    margin-left: auto;
  `;
  const r = t.querySelector(".toggle-icon");
  r.style.cssText = `
    transition: transform 0.2s;
    font-size: 0.8em;
    color: #666;
    min-width: 12px;
  `;
  const o = t.querySelector(".toggle-label");
  o.style.cssText = `
    font-weight: 500;
    color: #495057;
    flex: 1;
  `;
  const i = document.createElement("div");
  i.className = "optional-content", i.style.cssText = `
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out, padding 0.3s ease-out;
    padding: 0;
  `, Array.from(s.children).forEach((c) => i.appendChild(c)), s.appendChild(t), s.appendChild(i), t.addEventListener("mouseenter", () => {
    s.classList.contains("collapsed") && (t.style.background = "#e9ecef");
  }), t.addEventListener("mouseleave", () => {
    s.classList.contains("collapsed") && (t.style.background = "#f8f9fa");
  }), t.addEventListener("click", () => {
    const c = s.classList.contains("collapsed");
    if (s.classList.toggle("collapsed"), c) {
      r.style.transform = "rotate(90deg)";
      const l = i.scrollHeight;
      i.style.maxHeight = l + "px", i.style.padding = "15px 0 0 0", t.style.background = "#e7f3ff", t.style.borderColor = "#0066cc", n.style.background = "#d1ecf1", setTimeout(() => {
        s.classList.contains("collapsed") || (i.style.maxHeight = "none", i.style.overflow = "visible");
      }, 300);
    } else i.style.maxHeight = i.scrollHeight + "px", i.style.overflow = "hidden", i.offsetHeight, setTimeout(() => {
      r.style.transform = "rotate(0deg)", i.style.maxHeight = "0", i.style.padding = "0", t.style.background = "#f8f9fa", t.style.borderColor = "#dee2e6", n.style.background = "#e7f3ff";
    }, 10);
  }), i.addEventListener("input", () => {
    s.classList.contains("collapsed") && t.click();
  }, true), i.addEventListener("focus", () => {
    s.classList.contains("collapsed") && t.click();
  }, true);
}
class ce {
  constructor() {
    this.rules = [];
  }
  addRule(e, t, n) {
    this.rules.push({ trigger: e, target: t, transform: n });
  }
  setupAll() {
    setTimeout(() => {
      const e = document.querySelectorAll("input, textarea, select");
      this.rules.forEach((t) => {
        e.forEach((n) => {
          (n.name || n.id || "").includes(t.trigger) && n.addEventListener("input", async (o) => {
            const i = o.target.value;
            i && e.forEach(async (a) => {
              if ((a.name || a.id || "").includes(t.target) && !a.value) {
                const l = await t.transform(i);
                a.value = l, a.dispatchEvent(new Event("input", { bubbles: true })), this.showFeedback(a);
              }
            });
          });
        });
      });
    }, 200);
  }
  showFeedback(e) {
    e.classList.add("auto-filled");
    const t = document.createElement("div");
    t.className = "auto-fill-indicator", t.textContent = "\u2728 Auto-filled", t.style.cssText = "font-size: 0.75em; color: #059669; margin-top: 4px;";
    const n = e.parentElement.querySelector(".auto-fill-indicator");
    n && n.remove(), e.parentElement.appendChild(t), setTimeout(() => {
      e.classList.remove("auto-filled"), t.remove();
    }, 3e3);
  }
}
class de {
  constructor(e, t = {}) {
    this.template = e, this.options = { validateOnChange: true, showHelp: true, ...t }, this.labels = t.labels || e.labels || {}, this.formData = {}, this.eventListeners = { change: [], submit: [], preview: [] }, this.formElement = null, this.autofillManager = new ce();
    const n = ie.getCustomization(e.uri);
    this.customization = new n(e), console.log(`[FormGenerator] Using customization: ${this.customization.constructor.name}`);
  }
  getLabel(e) {
    var _a;
    if (!e) return "";
    if (e.startsWith("sub:") && !e.substring(4).includes(":")) {
      const t = e.replace(/^sub:/, ""), n = (_a = this.template.placeholders) == null ? void 0 : _a.find((r) => r.id === t);
      return (n == null ? void 0 : n.label) ? n.label : t.split(/[-_]/).map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(" ");
    }
    if (this.labels[e]) {
      const t = this.labels[e];
      return typeof t == "string" ? t : t.label || t["@value"] || t.value || this.parseUriLabel(e);
    }
    if (!e.startsWith("http") && e.includes(":")) {
      const t = this.expandUri(e);
      if (t !== e && this.labels[t]) return this.labels[t];
    }
    return this.parseUriLabel(e);
  }
  expandUri(e) {
    if (!e || e.startsWith("http")) return e;
    const t = e.indexOf(":");
    if (t > 0) {
      const n = e.substring(0, t), r = e.substring(t + 1);
      if (this.template.prefixes && this.template.prefixes[n]) return this.template.prefixes[n] + r;
      const o = { dct: "http://purl.org/dc/terms/", foaf: "http://xmlns.com/foaf/0.1/", prov: "http://www.w3.org/ns/prov#", rdfs: "http://www.w3.org/2000/01/rdf-schema#", schema: "https://schema.org/", rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#" };
      if (o[n]) return o[n] + r;
    }
    return e;
  }
  parseUriLabel(e) {
    if (!e) return "";
    const t = { "dct:": "DC Terms: ", "foaf:": "FOAF: ", "prov:": "Provenance: ", "rdfs:": "RDFS: ", "schema:": "Schema: " };
    for (const [o, i] of Object.entries(t)) if (e.startsWith(o)) return e.substring(o.length).replace(/([a-z])([A-Z])/g, "$1 $2").split(/[-_]/).map((c) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()).join(" ");
    const n = e.split(/[#\/]/);
    let r = n[n.length - 1] || "";
    return !r && n.length > 1 && (r = n[n.length - 2]), r = r.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^(has|is)\s+/i, "").trim().split(" ").map((o) => o.charAt(0).toUpperCase() + o.slice(1).toLowerCase()).join(" "), r || e;
  }
  findPlaceholder(e) {
    var _a;
    if (!e) return null;
    const t = e.replace(/^sub:/, "");
    return (_a = this.template.placeholders) == null ? void 0 : _a.find((r) => r.id === t);
  }
  isFixedValue(e) {
    return !e || this.findPlaceholder(e) ? false : !!(e.startsWith("http") || e.startsWith("<") || !e.includes(":") && !e.includes("/") || e.includes(":"));
  }
  renderForm(e) {
    console.log("Rendering form with template:", this.template), this.formElement = document.createElement("form"), this.formElement.className = "nanopub-form";
    const t = document.createElement("div");
    t.className = "form-header";
    const n = document.createElement("h2");
    if (n.textContent = this.template.label || "Nanopublication Template", t.appendChild(n), this.template.description) {
      const o = document.createElement("p");
      o.className = "form-description", o.textContent = this.template.description, t.appendChild(o);
    }
    this.formElement.appendChild(t);
    const r = document.createElement("div");
    return r.className = "form-fields", this.renderFields(r), this.formElement.appendChild(r), this.formElement.appendChild(this.buildControls()), typeof e == "string" && (e = document.querySelector(e)), e && (e.innerHTML = "", e.appendChild(this.formElement), this.setupEventListeners()), this.formElement;
  }
  renderFields(e) {
    if (!this.template.statements || this.template.statements.length === 0) {
      e.innerHTML = '<div class="empty-state"><h3>No fields to display</h3></div>';
      return;
    }
    const t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set(), o = this.customization.detectSemanticGroups();
    console.log("[renderFields] Semantic groups:", o), this.customization.getAutofillRules().forEach((l) => {
      this.autofillManager.addRule(l.trigger, l.target, l.transform);
    }), this.autofillManager.setupAll(), console.log("[renderFields] Processing statements...");
    let a = null, c = null;
    this.template.statements.forEach((l, f) => {
      if (n.has(l.id)) {
        console.log(`  ${l.id}: \u2192 Skipping (already in semantic group)`);
        return;
      }
      const p = o.find((w) => w.statements.includes(l.id));
      if (p && !t.has(p.id)) {
        console.log(`  ${l.id}: \u2192 Part of semantic group ${p.id}`), a && (e.appendChild(a), a = null, c = null), this.renderSemanticGroup(e, p, r), p.statements.forEach((w) => n.add(w)), t.add(p.id);
        return;
      }
      const d = this.template.groupedStatements.find((w) => w.statements.includes(l.id));
      if (console.log(`  ${l.id}: parentGroup=${d == null ? void 0 : d.id}, processed=${t.has(d == null ? void 0 : d.id)}, subject=${l.subject}`), d && t.has(d.id)) {
        console.log("    \u2192 Skipping (group already processed)");
        return;
      }
      const b = this.findPlaceholder(l.subject), m = this.findPlaceholder(l.object), v = this.findPlaceholder(l.predicate);
      if (!b && !m && !v) {
        console.log("    \u2192 Skipping (all fixed - auto-filled statement)");
        return;
      }
      if (b && (b.type.includes("ExternalUriPlaceholder") || b.type.includes("UriPlaceholder")) && !v && !m) {
        console.log("    \u2192 Skipping (URI placeholder metadata statement)");
        return;
      }
      if (l.subject !== c) {
        if (a && (e.appendChild(a), a = null), this.template.statements.filter((j) => j.subject === l.subject).length > 1) {
          a = document.createElement("div"), a.className = "subject-group", a.style.cssText = "margin: 1.5rem 0; padding: 1.5rem; border: 2px solid #be2e78; border-radius: 8px; background: #f6d7e8; box-shadow: 0 1px 3px rgba(190, 46, 120, 0.1);";
          const j = this.findPlaceholder(l.subject);
          if (j && !r.has(j.id)) {
            const L = document.createElement("div");
            L.className = "form-field subject-field";
            const P = document.createElement("label");
            P.className = "field-label subject-label", P.style.cssText = "font-weight: 600; font-size: 1.15em; color: #2b3456; margin-bottom: 0.75rem; display: block;", P.textContent = j.label || this.getLabel(l.subject), L.appendChild(P);
            const C = this.renderInput(j);
            if (C !== null) C.name = `${l.id}_subject`, C.id = `field_${l.id}_subject`, L.appendChild(C);
            else {
              const $ = document.createElement("div");
              $.className = "field-value auto-generated", $.textContent = "(auto-generated)", L.appendChild($);
            }
            a.appendChild(L), r.add(j.id);
          }
        }
        c = l.subject;
      }
      if (d) {
        console.log(`    \u2192 Rendering grouped statement ${d.id}`);
        const w = a || e;
        this.renderGroupedStatement(w, d, l, r), t.add(d.id);
      } else {
        console.log("    \u2192 Rendering individual statement");
        const w = a || e;
        this.renderStatement(w, l, r);
      }
    }), a && e.appendChild(a);
  }
  renderGroupedStatement(e, t, n, r = /* @__PURE__ */ new Set()) {
    const o = document.createElement("div");
    o.className = "form-field-group", n.repeatable && o.classList.add("repeatable-group"), n.optional && o.classList.add("optional-group");
    const i = t.statements.map((c) => this.template.statements.find((l) => l.id === c)).filter((c) => c), a = i[0];
    if (a) {
      const c = this.findPlaceholder(a.subject);
      if (c && !r.has(c.id)) {
        const l = document.createElement("div");
        l.className = "form-field";
        const f = document.createElement("label");
        f.className = "field-label", f.textContent = c.label || this.getLabel(a.subject), l.appendChild(f);
        const p = this.renderInput(c);
        p.name = `${a.id}_subject`, p.id = `field_${a.id}_subject`, l.appendChild(p), o.appendChild(l), r.add(c.id);
      }
    }
    i.forEach((c) => {
      this.renderStatementInGroup(o, c, r);
    }), n.repeatable && o.appendChild(this.buildRepeatableControls(n, null)), e.appendChild(o);
  }
  renderStatementInGroup(e, t, n = /* @__PURE__ */ new Set(), r = false) {
    console.log(`[renderStatementInGroup] ${t.id}:`, { predicate: t.predicate, object: t.object, isLiteralObject: t.isLiteralObject });
    const o = this.findPlaceholder(t.object), i = this.findPlaceholder(t.predicate);
    console.log("  objectPlaceholder:", o == null ? void 0 : o.id), console.log("  predicatePlaceholder:", i == null ? void 0 : i.id);
    const a = i && !n.has(i.id), c = o && !n.has(o.id);
    if (i && o && !a && !c) {
      console.log("  \u2192 SKIP (both placeholders already rendered)");
      return;
    }
    const l = this.getLabel(t.predicate);
    if (!o && !i) {
      console.log(`  \u2192 READONLY path: ${l} = ${t.object}`);
      const d = document.createElement("div");
      d.className = "form-field readonly-field";
      const b = document.createElement("label");
      b.className = "field-label", b.textContent = l;
      const m = document.createElement("div");
      m.className = "field-value", m.textContent = t.object, d.appendChild(b), d.appendChild(m), e.appendChild(d);
      return;
    }
    if (o && !c && !i) {
      console.log("  \u2192 SKIP (object placeholder already rendered)");
      return;
    }
    console.log("  \u2192 INPUT path");
    const f = document.createElement("div");
    f.className = "form-field", t.optional && (f.classList.add("optional"), r || setTimeout(() => {
      J(f, l);
    }, 0));
    const p = document.createElement("label");
    if (p.className = "field-label", p.textContent = l, f.appendChild(p), a) {
      const d = this.renderInput(i);
      d.name = `${t.id}_predicate`, d.id = `field_${t.id}_predicate`, f.appendChild(d), n.add(i.id);
    }
    if (c) {
      if (o.label) {
        const b = document.createElement("div");
        b.className = "field-help", b.textContent = o.label, f.appendChild(b);
      }
      const d = this.renderInput(o);
      d.name = t.id, d.id = `field_${t.id}`, f.appendChild(d), n.add(o.id);
    } else if (!o) {
      const d = document.createElement("div");
      d.className = "field-value", d.textContent = this.getLabel(t.object) || t.object, f.appendChild(d);
    }
    if (t.optional) {
      const d = document.createElement("span");
      d.className = "optional-badge", d.textContent = "optional", p.appendChild(d);
    }
    e.appendChild(f);
  }
  renderStatement(e, t, n = /* @__PURE__ */ new Set(), r = false) {
    const o = this.findPlaceholder(t.subject), i = this.findPlaceholder(t.predicate), a = this.findPlaceholder(t.object), c = this.getLabel(t.predicate), l = o && !n.has(o.id), f = i && !n.has(i.id), p = a && !n.has(a.id);
    if (!l && !f && !p && (i || a)) return;
    if (!i && !a && !l) {
      const b = document.createElement("div");
      b.className = "form-field readonly-field";
      const m = document.createElement("label");
      m.className = "field-label", m.textContent = c;
      const v = document.createElement("div");
      v.className = "field-value", v.textContent = this.getLabel(t.object) || t.object, b.appendChild(m), b.appendChild(v), e.appendChild(b);
      return;
    }
    const d = document.createElement("div");
    if (d.className = "form-field", t.repeatable && d.classList.add("repeatable"), t.optional && (d.classList.add("optional"), r || setTimeout(() => {
      const b = i && i.label || c;
      J(d, b);
    }, 0)), l) {
      const b = document.createElement("label");
      b.className = "field-label", b.textContent = o.label || this.getLabel(t.subject), d.appendChild(b);
      const m = this.renderInput(o);
      if (m !== null) m.name = `${t.id}_subject`, m.id = `field_${t.id}_subject`, t.optional || (m.required = true), d.appendChild(m);
      else {
        const v = document.createElement("div");
        v.className = "field-value auto-generated", v.textContent = "(auto-generated)", d.appendChild(v);
      }
      n.add(o.id);
    }
    if (f) {
      const b = document.createElement("label");
      b.className = "field-label", b.textContent = i.label || c, d.appendChild(b);
      const m = this.renderInput(i);
      m.name = `${t.id}_predicate`, m.id = `field_${t.id}_predicate`, t.optional || (m.required = true), d.appendChild(m), n.add(i.id);
    } else if (!i) {
      const b = document.createElement("label");
      if (b.className = "field-label", b.textContent = c, t.optional) {
        const m = document.createElement("span");
        m.className = "optional-badge", m.textContent = "optional", b.appendChild(m);
      }
      d.appendChild(b);
    }
    if (p) {
      const b = this.renderInput(a);
      if (b === null) {
        const m = document.createElement("div");
        m.className = "field-value auto-generated", m.textContent = a.label || t.object, d.appendChild(m);
      } else {
        if (a.label) {
          const m = document.createElement("div");
          m.className = "field-help", m.textContent = a.label, d.appendChild(m);
        }
        b.name = `${t.id}_object`, b.id = `field_${t.id}_object`, t.optional || (b.required = true), d.appendChild(b);
      }
      n.add(a.id);
    } else if (!a) {
      const b = document.createElement("div");
      b.className = "field-value", b.textContent = this.getLabel(t.object) || t.object, d.appendChild(b);
    }
    e.appendChild(d), t.repeatable && e.appendChild(this.buildRepeatableControls(t, null));
  }
  renderInput(e) {
    const t = e.type.split(",").map((r) => r.trim().replace(/^nt:/, ""));
    for (const r of t) {
      const o = ae[r];
      if (o) return console.log(`Using component ${r} for placeholder ${e.id}`), o(e, this.options);
    }
    console.warn(`No component for types: ${e.type}`);
    const n = document.createElement("input");
    return n.type = "text", n.className = "form-input", n.placeholder = e.label || "", n;
  }
  buildRepeatableControls(e, t) {
    const n = document.createElement("div");
    n.className = "repeatable-controls", n.dataset.count = "1";
    const r = document.createElement("button");
    return r.type = "button", r.className = "btn-add-field", r.textContent = "+ Add Another", r.onclick = () => {
      const o = parseInt(n.dataset.count);
      n.dataset.count = o + 1;
      const i = this.buildRepeatableField(e, t, o);
      n.parentElement.insertBefore(i, n), this.emit("change", this.collectFormData());
    }, n.appendChild(r), n;
  }
  buildRepeatableField(e, t, n) {
    const r = document.createElement("div");
    r.className = "repeatable-field-group";
    const o = this.findPlaceholder(e.subject), i = this.findPlaceholder(e.predicate), a = this.findPlaceholder(e.object);
    let c = false;
    if (o) {
      const f = this.template.statements.filter((p) => p.subject === e.subject);
      c = f.length === 1, console.log(`[buildRepeatableField] Subject ${e.subject}:`, { occurrences: f.length, shouldRepeat: c });
    }
    if (o && c) {
      const f = document.createElement("div");
      f.className = "repeatable-field";
      const p = document.createElement("label");
      p.className = "field-label", p.textContent = o.label || this.getLabel(e.subject), f.appendChild(p);
      const d = this.renderInput(o);
      d.name = `${e.id}_subject_${n}`, d.id = `field_${e.id}_subject_${n}`, f.appendChild(d), r.appendChild(f);
    }
    if (i) {
      const f = document.createElement("div");
      f.className = "repeatable-field";
      const p = document.createElement("label");
      p.className = "field-label", p.textContent = i.label || this.getLabel(e.predicate), f.appendChild(p);
      const d = this.renderInput(i);
      d.name = `${e.id}_predicate_${n}`, d.id = `field_${e.id}_predicate_${n}`, f.appendChild(d), r.appendChild(f);
    }
    if (a) {
      const f = document.createElement("div");
      if (f.className = "repeatable-field", !i) {
        const d = document.createElement("label");
        d.className = "field-label", d.textContent = this.getLabel(e.predicate), f.appendChild(d);
      }
      if (a.label) {
        const d = document.createElement("div");
        d.className = "field-help", d.textContent = a.label, f.appendChild(d);
      }
      const p = this.renderInput(a);
      p.name = `${e.id}_object_${n}`, p.id = `field_${e.id}_object_${n}`, f.appendChild(p), r.appendChild(f);
    }
    const l = document.createElement("button");
    return l.type = "button", l.className = "btn-remove-field", l.textContent = "\xD7 Remove", l.onclick = () => {
      r.remove(), this.emit("change", this.collectFormData());
    }, r.appendChild(l), r;
  }
  buildControls() {
    const e = document.createElement("div");
    e.className = "form-controls";
    const t = document.createElement("button");
    return t.type = "submit", t.className = "btn btn-primary", t.textContent = "Create Nanopublication", e.appendChild(t), e;
  }
  setupEventListeners() {
    this.formElement.addEventListener("submit", (e) => {
      e.preventDefault();
      const t = this.validate();
      if (!t.isValid) {
        console.warn("Validation failed:", t.errors);
        return;
      }
      this.formData = this.collectFormData(), this.emit("submit", { formData: this.formData });
    }), this.options.validateOnChange && this.formElement.addEventListener("input", (e) => {
      e.target.matches("input, select, textarea") && this.validateField(e.target);
    });
  }
  handlePreview() {
    this.formData = this.collectFormData(), this.emit("preview", { formData: this.formData });
  }
  collectFormData() {
    const e = {};
    return this.formElement.querySelectorAll("input, select, textarea").forEach((n) => {
      n.name && n.value && (e[n.name] ? Array.isArray(e[n.name]) ? e[n.name].push(n.value) : e[n.name] = [e[n.name], n.value] : e[n.name] = n.value);
    }), e;
  }
  validateField(e) {
    let t = true, n = "";
    if (e.required && !e.value.trim()) t = false, n = "This field is required";
    else if (e.pattern && e.value) new RegExp(e.pattern).test(e.value) || (t = false, n = "Invalid format");
    else if (e.type === "url" && e.value) try {
      new URL(e.value);
    } catch {
      t = false, n = "Please enter a valid URL";
    }
    const r = e.closest(".form-field");
    if (r) {
      r.classList.toggle("error", !t);
      let o = r.querySelector(".error-message");
      t ? o && o.remove() : (o || (o = document.createElement("div"), o.className = "error-message", r.appendChild(o)), o.textContent = n);
    }
    return t;
  }
  validate() {
    const e = this.formElement.querySelectorAll("[required]");
    let t = true;
    const n = [];
    return e.forEach((r) => {
      this.validateField(r) || (t = false, n.push({ field: r.name, message: "Validation error" }));
    }), { isValid: t, errors: n };
  }
  on(e, t) {
    this.eventListeners[e] && this.eventListeners[e].push(t);
  }
  emit(e, t) {
    this.eventListeners[e] && this.eventListeners[e].forEach((n) => n(t));
  }
  destroy() {
    this.formElement && this.formElement.remove(), this.formElement = null, this.formData = {};
  }
  renderSemanticGroup(e, t, n = /* @__PURE__ */ new Set()) {
    const r = document.createElement("div");
    r.className = "semantic-group", r.style.cssText = "margin: 1.25rem 0;", t.statements.forEach((o) => {
      const i = this.template.statements.find((a) => a.id === o);
      i && this.renderStatement(r, i, n, true);
    }), t.collapsible && setTimeout(() => {
      le(r, t.label);
    }, 0), e.appendChild(r);
  }
}
class ue {
  constructor(e) {
    var _a, _b;
    this.template = e, console.log("NanopubBuilder initialized with:", { uri: e.uri, labelPattern: e.labelPattern, types: ((_a = e.types) == null ? void 0 : _a.length) || 0, statements: ((_b = e.statements) == null ? void 0 : _b.length) || 0 });
  }
  async buildFromFormData(e, t = {}) {
    this.formData = e, this.metadata = t;
    const n = (/* @__PURE__ */ new Date()).toISOString(), r = this.generateRandomId(), o = `http://purl.org/nanopub/temp/${r}`;
    this.currentNanopubBaseUri = o;
    const i = this.buildPrefixes(r), a = this.buildHead(), c = this.buildAssertion(), l = this.buildProvenance(), f = this.buildPubinfo(n);
    return `${i}

${a}

${c}

${l}

${f}
`;
  }
  generateRandomId() {
    return Math.random().toString(36).substring(2, 15);
  }
  buildPrefixes(e) {
    const t = `http://purl.org/nanopub/temp/${e}`, n = [`@prefix this: <${t}> .`, `@prefix sub: <${t}/> .`, "@prefix np: <http://www.nanopub.org/nschema#> .", "@prefix dct: <http://purl.org/dc/terms/> .", "@prefix nt: <https://w3id.org/np/o/ntemplate/> .", "@prefix npx: <http://purl.org/nanopub/x/> .", "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .", "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .", "@prefix orcid: <https://orcid.org/> .", "@prefix prov: <http://www.w3.org/ns/prov#> .", "@prefix foaf: <http://xmlns.com/foaf/0.1/> .", "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ."];
    if (this.template.prefixes) for (const [r, o] of Object.entries(this.template.prefixes)) n.some((i) => i.includes(`@prefix ${r}:`)) || n.push(`@prefix ${r}: <${o}> .`);
    return n.join(`
`);
  }
  buildHead() {
    return `sub:Head {
  this: a np:Nanopublication ;
    np:hasAssertion sub:assertion ;
    np:hasProvenance sub:provenance ;
    np:hasPublicationInfo sub:pubinfo .
}`;
  }
  buildAssertion() {
    const e = [], t = this.template.statements.map((n) => n.id).sort((n, r) => {
      const o = parseInt(n.replace(/\D/g, "")), i = parseInt(r.replace(/\D/g, ""));
      return o - i;
    });
    for (const n of t) {
      const r = this.template.statements.find((i) => i.id === n);
      if (!r) continue;
      const o = this.getStatementInstances(r);
      for (const i of o) {
        const a = this.buildTriple(r, i);
        a && e.push(a);
      }
    }
    return `sub:assertion {
${e.join(`
`)}
}`;
  }
  getStatementInstances(e) {
    const t = [], n = this.getInstanceData(e, null);
    if (n && t.push(n), e.repeatable) for (let r = 1; r < 10; r++) {
      const o = this.getInstanceData(e, r);
      if (o) t.push(o);
      else break;
    }
    return t;
  }
  getInstanceData(e, t) {
    var _a, _b;
    const n = t ? `_${t}` : "", r = { subject: this.formData[`${e.id}_subject${n}`], predicate: this.formData[`${e.id}_predicate${n}`], object: this.formData[`${e.id}_object${n}`] }, o = (_a = this.template.placeholders) == null ? void 0 : _a.find((f) => f.id === e.subject), i = (_b = this.template.placeholders) == null ? void 0 : _b.find((f) => f.id === e.object);
    o && (o.isIntroducedResource || o.isLocalResource);
    const a = i && (i.isIntroducedResource || i.isLocalResource);
    if (!r.subject && e.subjectIsPlaceholder) {
      const f = e.subject, p = this.findPlaceholderValue(f);
      p && (r.subject = p);
    }
    if (!r.object && e.objectIsPlaceholder) {
      const f = e.object, p = this.findPlaceholderValue(f);
      p && (r.object = p);
    }
    r.subject && r.subject;
    const c = r.predicate && r.predicate !== "", l = r.object && r.object !== "";
    return e.optional && !l && !a || !e.optional && (e.objectIsPlaceholder && !l || e.predicateIsPlaceholder && !c) ? null : r;
  }
  buildTriple(e, t) {
    const n = this.metadata.creator || "https://orcid.org/0000-0000-0000-0000";
    let r = t.subject || e.subject, o;
    e.subjectUri === "nt:CREATOR" ? o = n.startsWith("orcid:") ? n : `orcid:${n.split("/").pop()}` : o = e.subjectIsPlaceholder ? this.resolveValue(r, e.subject) : this.formatUri(e.subjectUri);
    const i = t.predicate || e.predicate, a = e.predicateIsPlaceholder ? this.resolveValue(i, e.predicate) : this.formatUri(e.predicateUri);
    let c = t.object || e.object, l;
    return e.objectUri === "nt:CREATOR" ? l = n.startsWith("orcid:") ? n : `orcid:${n.split("/").pop()}` : l = e.objectIsPlaceholder ? this.resolveValue(c, e.object) : this.formatUri(e.objectUri), !o || !a || !l || o.startsWith("<") && o.endsWith(">") && !o.includes("://") || l.startsWith("<") && l.endsWith(">") && !l.includes("://") ? null : e.predicateUri === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" || a === "rdf:type" || a === "a" ? `  ${o} a ${l} .` : `  ${o} ${a} ${l} .`;
  }
  resolveValue(e, t) {
    var _a;
    if (!e || e === "") return null;
    if (e === "nt:CREATOR" || e === "CREATOR" || t === "nt:CREATOR" || t === "CREATOR") {
      const i = this.metadata.creator || "https://orcid.org/0000-0000-0000-0000";
      return i.startsWith("orcid:") ? i : `orcid:${i.split("/").pop()}`;
    }
    const n = t.replace("sub:", "");
    if (e === n || e === `sub:${n}`) return null;
    const r = (_a = this.template.placeholders) == null ? void 0 : _a.find((i) => i.id === n);
    if (r && (r.isIntroducedResource || r.isLocalResource)) return `<${this.currentNanopubBaseUri || "http://purl.org/nanopub/temp/unknown"}/${e}>`;
    if ((r == null ? void 0 : r.type) === "AutoEscapeUriPlaceholder" && r.prefix) {
      const i = encodeURIComponent(e).replace(/%20/g, "+");
      return `<${r.prefix}${i}>`;
    }
    if ((r == null ? void 0 : r.type) === "UriPlaceholder" || (r == null ? void 0 : r.type) === "GuidedChoicePlaceholder" || (r == null ? void 0 : r.type) === "ExternalUriPlaceholder" || e.startsWith("http://") || e.startsWith("https://")) return `<${e}>`;
    if (r == null ? void 0 : r.hasDatatype) return `"${e}"^^<${r.hasDatatype}>`;
    if (e.includes(`
`)) {
      let i = e.replace(/"""/g, '\\"""');
      return i.endsWith('""') ? i = i.slice(0, -2) + '\\"\\""' : i.endsWith('"') && (i = i.slice(0, -1) + '\\"'), `"""${i}"""`;
    } else return `"${e.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  formatUri(e) {
    return e ? e.includes(":") && !e.includes("://") ? e : `<${e}>` : null;
  }
  buildProvenance() {
    const e = this.metadata.creator || "https://orcid.org/0000-0002-1784-2920";
    return `sub:provenance {
  sub:assertion prov:wasAttributedTo ${e.startsWith("orcid:") ? e : `orcid:${e.split("/").pop()}`} .
}`;
  }
  buildPubinfo(e) {
    var _a;
    const t = this.metadata.creator || "https://orcid.org/0000-0002-1784-2920", n = this.metadata.creatorName || "Unknown", r = t.startsWith("orcid:") ? t : `orcid:${t.split("/").pop()}`, o = [`  ${r} foaf:name "${n}" .`, "", `  this: dct:created "${e}"^^xsd:dateTime;`, `    dct:creator ${r};`, "    dct:license <https://creativecommons.org/licenses/by/4.0/>"];
    if (((_a = this.template.types) == null ? void 0 : _a.length) > 0) {
      const a = this.template.types.map((c) => `<${c}>`).join(", ");
      o.push(`;
    npx:hasNanopubType ${a}`);
    }
    const i = [];
    for (const a of this.template.placeholders || []) if (a.isIntroducedResource) {
      const c = this.findPlaceholderValue(a.id);
      if (c) {
        const l = `${this.currentNanopubBaseUri}/${c}`;
        i.push(`<${l}>`);
      }
    }
    if (i.length > 0 && o.push(`;
    npx:introduces ${i.join(", ")}`), this.template.labelPattern) {
      const a = this.generateLabel();
      o.push(`;
    rdfs:label "${a}"`);
    }
    return this.template.uri && o.push(`;
    nt:wasCreatedFromTemplate <${this.template.uri}>`), o.push(" ."), `sub:pubinfo {
${o.join(`
`)}
}`;
  }
  findPlaceholderValue(e) {
    for (const t of this.template.statements || []) {
      if (t.subject === e || t.subject === `sub:${e}`) {
        const n = this.formData[`${t.id}_subject`];
        if (n) return n;
        if (t.repeatable) for (let r = 1; r < 10; r++) {
          const o = this.formData[`${t.id}_subject_${r}`];
          if (o) return o;
        }
      }
      if (t.object === e || t.object === `sub:${e}`) {
        const n = this.formData[`${t.id}_object`];
        if (n) return n;
        if (t.repeatable) for (let r = 1; r < 10; r++) {
          const o = this.formData[`${t.id}_object_${r}`];
          if (o) return o;
        }
      }
    }
    return null;
  }
  generateLabel() {
    let e = this.template.labelPattern || "Untitled";
    const t = [...e.matchAll(/\$\{(\w+)\}/g)];
    for (const n of t) {
      const r = n[1], o = this.findPlaceholderValue(r);
      o ? e = e.replace(n[0], o) : e = e.replace(n[0], "");
    }
    return e.trim();
  }
}
let u;
const te = typeof TextDecoder < "u" ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }) : { decode: () => {
  throw Error("TextDecoder not available");
} };
typeof TextDecoder < "u" && te.decode();
let A = null;
function W() {
  return (A === null || A.byteLength === 0) && (A = new Uint8Array(u.memory.buffer)), A;
}
function T(s, e) {
  return s = s >>> 0, te.decode(W().subarray(s, s + e));
}
const R = new Array(128).fill(void 0);
R.push(void 0, null, true, false);
let D = R.length;
function g(s) {
  D === R.length && R.push(R.length + 1);
  const e = D;
  return D = R[e], R[e] = s, e;
}
function h(s) {
  return R[s];
}
function pe(s) {
  s < 132 || (R[s] = D, D = s);
}
function x(s) {
  const e = h(s);
  return pe(s), e;
}
let I = 0;
const B = typeof TextEncoder < "u" ? new TextEncoder("utf-8") : { encode: () => {
  throw Error("TextEncoder not available");
} }, fe = typeof B.encodeInto == "function" ? function(s, e) {
  return B.encodeInto(s, e);
} : function(s, e) {
  const t = B.encode(s);
  return e.set(t), { read: s.length, written: t.length };
};
function N(s, e, t) {
  if (t === void 0) {
    const a = B.encode(s), c = e(a.length, 1) >>> 0;
    return W().subarray(c, c + a.length).set(a), I = a.length, c;
  }
  let n = s.length, r = e(n, 1) >>> 0;
  const o = W();
  let i = 0;
  for (; i < n; i++) {
    const a = s.charCodeAt(i);
    if (a > 127) break;
    o[r + i] = a;
  }
  if (i !== n) {
    i !== 0 && (s = s.slice(i)), r = t(r, n, n = i + s.length * 3, 1) >>> 0;
    const a = W().subarray(r + i, r + n), c = fe(s, a);
    i += c.written, r = t(r, n, i, 1) >>> 0;
  }
  return I = i, r;
}
function F(s) {
  return s == null;
}
let M = null;
function _() {
  return (M === null || M.byteLength === 0) && (M = new Int32Array(u.memory.buffer)), M;
}
let O = null;
function he() {
  return (O === null || O.byteLength === 0) && (O = new Float64Array(u.memory.buffer)), O;
}
function V(s) {
  const e = typeof s;
  if (e == "number" || e == "boolean" || s == null) return `${s}`;
  if (e == "string") return `"${s}"`;
  if (e == "symbol") {
    const r = s.description;
    return r == null ? "Symbol" : `Symbol(${r})`;
  }
  if (e == "function") {
    const r = s.name;
    return typeof r == "string" && r.length > 0 ? `Function(${r})` : "Function";
  }
  if (Array.isArray(s)) {
    const r = s.length;
    let o = "[";
    r > 0 && (o += V(s[0]));
    for (let i = 1; i < r; i++) o += ", " + V(s[i]);
    return o += "]", o;
  }
  const t = /\[object ([^\]]+)\]/.exec(toString.call(s));
  let n;
  if (t.length > 1) n = t[1];
  else return toString.call(s);
  if (n == "Object") try {
    return "Object(" + JSON.stringify(s) + ")";
  } catch {
    return "Object";
  }
  return s instanceof Error ? `${s.name}: ${s.message}
${s.stack}` : n;
}
const Y = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((s) => {
  u.__wbindgen_export_2.get(s.dtor)(s.a, s.b);
});
function me(s, e, t, n) {
  const r = { a: s, b: e, cnt: 1, dtor: t }, o = (...i) => {
    r.cnt++;
    const a = r.a;
    r.a = 0;
    try {
      return n(a, r.b, ...i);
    } finally {
      --r.cnt === 0 ? (u.__wbindgen_export_2.get(r.dtor)(a, r.b), Y.unregister(r)) : r.a = a;
    }
  };
  return o.original = r, Y.register(o, r, r), o;
}
function be(s, e, t) {
  u._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h15d348a8f539de58(s, e, g(t));
}
function y(s, e) {
  try {
    return s.apply(this, e);
  } catch (t) {
    u.__wbindgen_exn_store(g(t));
  }
}
function ge(s, e, t, n) {
  u.wasm_bindgen__convert__closures__invoke2_mut__h2c289313db95095e(s, e, g(t), g(n));
}
function X(s, e) {
  if (!(s instanceof e)) throw new Error(`expected instance of ${e.name}`);
  return s.ptr;
}
let H = 128;
function _e(s) {
  if (H == 1) throw new Error("out of js stack");
  return R[--H] = s, H;
}
const we = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((s) => u.__wbg_keypair_free(s >>> 0));
class ye {
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, we.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    u.__wbg_keypair_free(e);
  }
  constructor() {
    try {
      const r = u.__wbindgen_add_to_stack_pointer(-16);
      u.keypair_new(r);
      var e = _()[r / 4 + 0], t = _()[r / 4 + 1], n = _()[r / 4 + 2];
      if (n) throw x(t);
      return this.__wbg_ptr = e >>> 0, this;
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toJs() {
    try {
      const r = u.__wbindgen_add_to_stack_pointer(-16);
      u.keypair_toJs(r, this.__wbg_ptr);
      var e = _()[r / 4 + 0], t = _()[r / 4 + 1], n = _()[r / 4 + 2];
      if (n) throw x(t);
      return x(e);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
const Z = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((s) => u.__wbg_nanopub_free(s >>> 0));
class U {
  static __wrap(e) {
    e = e >>> 0;
    const t = Object.create(U.prototype);
    return t.__wbg_ptr = e, Z.register(t, t.__wbg_ptr, t), t;
  }
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, Z.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    u.__wbg_nanopub_free(e);
  }
  constructor(e) {
    try {
      const o = u.__wbindgen_add_to_stack_pointer(-16);
      u.nanopub_new(o, g(e));
      var t = _()[o / 4 + 0], n = _()[o / 4 + 1], r = _()[o / 4 + 2];
      if (r) throw x(n);
      return this.__wbg_ptr = t >>> 0, this;
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
  check() {
    try {
      const r = this.__destroy_into_raw(), o = u.__wbindgen_add_to_stack_pointer(-16);
      u.nanopub_check(o, r);
      var e = _()[o / 4 + 0], t = _()[o / 4 + 1], n = _()[o / 4 + 2];
      if (n) throw x(t);
      return U.__wrap(e);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
  sign(e) {
    try {
      const o = this.__destroy_into_raw(), i = u.__wbindgen_add_to_stack_pointer(-16);
      X(e, G), u.nanopub_sign(i, o, e.__wbg_ptr);
      var t = _()[i / 4 + 0], n = _()[i / 4 + 1], r = _()[i / 4 + 2];
      if (r) throw x(n);
      return U.__wrap(t);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
  publish(e, t) {
    try {
      const o = this.__destroy_into_raw();
      var n = F(t) ? 0 : N(t, u.__wbindgen_malloc, u.__wbindgen_realloc), r = I;
      const i = u.nanopub_publish(o, _e(e), n, r);
      return x(i);
    } finally {
      R[H++] = void 0;
    }
  }
  static fetch(e) {
    const t = N(e, u.__wbindgen_malloc, u.__wbindgen_realloc), n = I, r = u.nanopub_fetch(t, n);
    return x(r);
  }
  static publish_intro(e, t) {
    X(e, G);
    const n = N(t, u.__wbindgen_malloc, u.__wbindgen_realloc), r = I, o = u.nanopub_publish_intro(e.__wbg_ptr, n, r);
    return x(o);
  }
  rdf() {
    let e, t;
    try {
      const l = u.__wbindgen_add_to_stack_pointer(-16);
      u.nanopub_rdf(l, this.__wbg_ptr);
      var n = _()[l / 4 + 0], r = _()[l / 4 + 1], o = _()[l / 4 + 2], i = _()[l / 4 + 3], a = n, c = r;
      if (i) throw a = 0, c = 0, x(o);
      return e = a, t = c, T(a, c);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16), u.__wbindgen_free(e, t, 1);
    }
  }
  info() {
    try {
      const r = u.__wbindgen_add_to_stack_pointer(-16);
      u.nanopub_info(r, this.__wbg_ptr);
      var e = _()[r / 4 + 0], t = _()[r / 4 + 1], n = _()[r / 4 + 2];
      if (n) throw x(t);
      return x(e);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toString() {
    let e, t;
    try {
      const o = u.__wbindgen_add_to_stack_pointer(-16);
      u.nanopub_toString(o, this.__wbg_ptr);
      var n = _()[o / 4 + 0], r = _()[o / 4 + 1];
      return e = n, t = r, T(n, r);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16), u.__wbindgen_free(e, t, 1);
    }
  }
}
const xe = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((s) => u.__wbg_npprofile_free(s >>> 0));
class G {
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, xe.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    u.__wbg_npprofile_free(e);
  }
  __getClassname() {
    let e, t;
    try {
      const o = u.__wbindgen_add_to_stack_pointer(-16);
      u.npprofile___getClassname(o, this.__wbg_ptr);
      var n = _()[o / 4 + 0], r = _()[o / 4 + 1];
      return e = n, t = r, T(n, r);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16), u.__wbindgen_free(e, t, 1);
    }
  }
  constructor(e, t, n, r) {
    try {
      const m = u.__wbindgen_add_to_stack_pointer(-16), v = N(e, u.__wbindgen_malloc, u.__wbindgen_realloc), w = I;
      var o = F(t) ? 0 : N(t, u.__wbindgen_malloc, u.__wbindgen_realloc), i = I, a = F(n) ? 0 : N(n, u.__wbindgen_malloc, u.__wbindgen_realloc), c = I, l = F(r) ? 0 : N(r, u.__wbindgen_malloc, u.__wbindgen_realloc), f = I;
      u.npprofile_new(m, v, w, o, i, a, c, l, f);
      var p = _()[m / 4 + 0], d = _()[m / 4 + 1], b = _()[m / 4 + 2];
      if (b) throw x(d);
      return this.__wbg_ptr = p >>> 0, this;
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toString() {
    let e, t;
    try {
      const o = u.__wbindgen_add_to_stack_pointer(-16);
      u.npprofile_toString(o, this.__wbg_ptr);
      var n = _()[o / 4 + 0], r = _()[o / 4 + 1];
      return e = n, t = r, T(n, r);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16), u.__wbindgen_free(e, t, 1);
    }
  }
  toJs() {
    try {
      const r = u.__wbindgen_add_to_stack_pointer(-16);
      u.npprofile_toJs(r, this.__wbg_ptr);
      var e = _()[r / 4 + 0], t = _()[r / 4 + 1], n = _()[r / 4 + 2];
      if (n) throw x(t);
      return x(e);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
async function ve(s, e) {
  if (typeof Response == "function" && s instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function") try {
      return await WebAssembly.instantiateStreaming(s, e);
    } catch (n) {
      if (s.headers.get("Content-Type") != "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", n);
      else throw n;
    }
    const t = await s.arrayBuffer();
    return await WebAssembly.instantiate(t, e);
  } else {
    const t = await WebAssembly.instantiate(s, e);
    return t instanceof WebAssembly.Instance ? { instance: t, module: s } : t;
  }
}
function Ce() {
  const s = {};
  return s.wbg = {}, s.wbg.__wbg_nanopub_new = function(e) {
    const t = U.__wrap(e);
    return g(t);
  }, s.wbg.__wbindgen_string_new = function(e, t) {
    const n = T(e, t);
    return g(n);
  }, s.wbg.__wbg_call_b3ca7c6051f9bec1 = function() {
    return y(function(e, t, n) {
      const r = h(e).call(h(t), h(n));
      return g(r);
    }, arguments);
  }, s.wbg.__wbindgen_object_drop_ref = function(e) {
    x(e);
  }, s.wbg.__wbg_abort_2aa7521d5690750e = function(e) {
    h(e).abort();
  }, s.wbg.__wbg_new_72fb9a18b5ae2624 = function() {
    const e = new Object();
    return g(e);
  }, s.wbg.__wbg_set_1f9b04f170055d33 = function() {
    return y(function(e, t, n) {
      return Reflect.set(h(e), h(t), h(n));
    }, arguments);
  }, s.wbg.__wbg_new_ab6fd82b10560829 = function() {
    return y(function() {
      const e = new Headers();
      return g(e);
    }, arguments);
  }, s.wbg.__wbindgen_object_clone_ref = function(e) {
    const t = h(e);
    return g(t);
  }, s.wbg.__wbg_new_0d76b0581eca6298 = function() {
    return y(function() {
      const e = new AbortController();
      return g(e);
    }, arguments);
  }, s.wbg.__wbg_signal_a61f78a3478fd9bc = function(e) {
    const t = h(e).signal;
    return g(t);
  }, s.wbg.__wbg_append_7bfcb4937d1d5e29 = function() {
    return y(function(e, t, n, r, o) {
      h(e).append(T(t, n), T(r, o));
    }, arguments);
  }, s.wbg.__wbg_instanceof_Response_849eb93e75734b6e = function(e) {
    let t;
    try {
      t = h(e) instanceof Response;
    } catch {
      t = false;
    }
    return t;
  }, s.wbg.__wbg_status_61a01141acd3cf74 = function(e) {
    return h(e).status;
  }, s.wbg.__wbg_url_5f6dc4009ac5f99d = function(e, t) {
    const n = h(t).url, r = N(n, u.__wbindgen_malloc, u.__wbindgen_realloc), o = I;
    _()[e / 4 + 1] = o, _()[e / 4 + 0] = r;
  }, s.wbg.__wbg_headers_9620bfada380764a = function(e) {
    const t = h(e).headers;
    return g(t);
  }, s.wbg.__wbg_iterator_2cee6dadfd956dfa = function() {
    return g(Symbol.iterator);
  }, s.wbg.__wbg_get_e3c254076557e348 = function() {
    return y(function(e, t) {
      const n = Reflect.get(h(e), h(t));
      return g(n);
    }, arguments);
  }, s.wbg.__wbindgen_is_function = function(e) {
    return typeof h(e) == "function";
  }, s.wbg.__wbg_call_27c0f87801dedf93 = function() {
    return y(function(e, t) {
      const n = h(e).call(h(t));
      return g(n);
    }, arguments);
  }, s.wbg.__wbindgen_is_object = function(e) {
    const t = h(e);
    return typeof t == "object" && t !== null;
  }, s.wbg.__wbg_next_40fc327bfc8770e6 = function(e) {
    const t = h(e).next;
    return g(t);
  }, s.wbg.__wbg_next_196c84450b364254 = function() {
    return y(function(e) {
      const t = h(e).next();
      return g(t);
    }, arguments);
  }, s.wbg.__wbg_done_298b57d23c0fc80c = function(e) {
    return h(e).done;
  }, s.wbg.__wbg_value_d93c65011f51a456 = function(e) {
    const t = h(e).value;
    return g(t);
  }, s.wbg.__wbg_stringify_8887fe74e1c50d81 = function() {
    return y(function(e) {
      const t = JSON.stringify(h(e));
      return g(t);
    }, arguments);
  }, s.wbg.__wbindgen_string_get = function(e, t) {
    const n = h(t), r = typeof n == "string" ? n : void 0;
    var o = F(r) ? 0 : N(r, u.__wbindgen_malloc, u.__wbindgen_realloc), i = I;
    _()[e / 4 + 1] = i, _()[e / 4 + 0] = o;
  }, s.wbg.__wbg_text_450a059667fd91fd = function() {
    return y(function(e) {
      const t = h(e).text();
      return g(t);
    }, arguments);
  }, s.wbg.__wbg_new0_7d84e5b2cd9fdc73 = function() {
    return g(/* @__PURE__ */ new Date());
  }, s.wbg.__wbg_getTime_2bc4375165f02d15 = function(e) {
    return h(e).getTime();
  }, s.wbg.__wbg_crypto_1d1f22824a6a080c = function(e) {
    const t = h(e).crypto;
    return g(t);
  }, s.wbg.__wbg_process_4a72847cc503995b = function(e) {
    const t = h(e).process;
    return g(t);
  }, s.wbg.__wbg_versions_f686565e586dd935 = function(e) {
    const t = h(e).versions;
    return g(t);
  }, s.wbg.__wbg_node_104a2ff8d6ea03a2 = function(e) {
    const t = h(e).node;
    return g(t);
  }, s.wbg.__wbindgen_is_string = function(e) {
    return typeof h(e) == "string";
  }, s.wbg.__wbg_require_cca90b1a94a0255b = function() {
    return y(function() {
      const e = module.require;
      return g(e);
    }, arguments);
  }, s.wbg.__wbg_msCrypto_eb05e62b530a1508 = function(e) {
    const t = h(e).msCrypto;
    return g(t);
  }, s.wbg.__wbg_newwithlength_e9b4878cebadb3d3 = function(e) {
    const t = new Uint8Array(e >>> 0);
    return g(t);
  }, s.wbg.__wbindgen_memory = function() {
    const e = u.memory;
    return g(e);
  }, s.wbg.__wbg_buffer_12d079cc21e14bdb = function(e) {
    const t = h(e).buffer;
    return g(t);
  }, s.wbg.__wbg_newwithbyteoffsetandlength_aa4a17c33a06e5cb = function(e, t, n) {
    const r = new Uint8Array(h(e), t >>> 0, n >>> 0);
    return g(r);
  }, s.wbg.__wbg_randomFillSync_5c9c955aa56b6049 = function() {
    return y(function(e, t) {
      h(e).randomFillSync(x(t));
    }, arguments);
  }, s.wbg.__wbg_subarray_a1f73cd4b5b42fe1 = function(e, t, n) {
    const r = h(e).subarray(t >>> 0, n >>> 0);
    return g(r);
  }, s.wbg.__wbg_getRandomValues_3aa56aa6edec874c = function() {
    return y(function(e, t) {
      h(e).getRandomValues(h(t));
    }, arguments);
  }, s.wbg.__wbg_new_63b92bc8671ed464 = function(e) {
    const t = new Uint8Array(h(e));
    return g(t);
  }, s.wbg.__wbg_set_a47bac70306a19a7 = function(e, t, n) {
    h(e).set(h(t), n >>> 0);
  }, s.wbg.__wbg_self_ce0dbfc45cf2f5be = function() {
    return y(function() {
      const e = self.self;
      return g(e);
    }, arguments);
  }, s.wbg.__wbg_window_c6fb939a7f436783 = function() {
    return y(function() {
      const e = window.window;
      return g(e);
    }, arguments);
  }, s.wbg.__wbg_globalThis_d1e6af4856ba331b = function() {
    return y(function() {
      const e = globalThis.globalThis;
      return g(e);
    }, arguments);
  }, s.wbg.__wbg_global_207b558942527489 = function() {
    return y(function() {
      const e = global.global;
      return g(e);
    }, arguments);
  }, s.wbg.__wbindgen_is_undefined = function(e) {
    return h(e) === void 0;
  }, s.wbg.__wbg_newnoargs_e258087cd0daa0ea = function(e, t) {
    const n = new Function(T(e, t));
    return g(n);
  }, s.wbg.__wbg_new_16b304a2cfa7ff4a = function() {
    const e = new Array();
    return g(e);
  }, s.wbg.__wbg_apply_0a5aa603881e6d79 = function() {
    return y(function(e, t, n) {
      const r = Reflect.apply(h(e), h(t), h(n));
      return g(r);
    }, arguments);
  }, s.wbg.__wbindgen_number_get = function(e, t) {
    const n = h(t), r = typeof n == "number" ? n : void 0;
    he()[e / 8 + 1] = F(r) ? 0 : r, _()[e / 4 + 0] = !F(r);
  }, s.wbg.__wbg_new_81740750da40724f = function(e, t) {
    try {
      var n = { a: e, b: t }, r = (i, a) => {
        const c = n.a;
        n.a = 0;
        try {
          return ge(c, n.b, i, a);
        } finally {
          n.a = c;
        }
      };
      const o = new Promise(r);
      return g(o);
    } finally {
      n.a = n.b = 0;
    }
  }, s.wbg.__wbg_set_f975102236d3c502 = function(e, t, n) {
    h(e)[x(t)] = x(n);
  }, s.wbg.__wbindgen_cb_drop = function(e) {
    const t = x(e).original;
    return t.cnt-- == 1 ? (t.a = 0, true) : false;
  }, s.wbg.__wbg_has_0af94d20077affa2 = function() {
    return y(function(e, t) {
      return Reflect.has(h(e), h(t));
    }, arguments);
  }, s.wbg.__wbg_fetch_eadcbc7351113537 = function(e) {
    const t = fetch(h(e));
    return g(t);
  }, s.wbg.__wbg_fetch_921fad6ef9e883dd = function(e, t) {
    const n = h(e).fetch(h(t));
    return g(n);
  }, s.wbg.__wbindgen_debug_string = function(e, t) {
    const n = V(h(t)), r = N(n, u.__wbindgen_malloc, u.__wbindgen_realloc), o = I;
    _()[e / 4 + 1] = o, _()[e / 4 + 0] = r;
  }, s.wbg.__wbindgen_throw = function(e, t) {
    throw new Error(T(e, t));
  }, s.wbg.__wbg_then_0c86a60e8fcfe9f6 = function(e, t) {
    const n = h(e).then(h(t));
    return g(n);
  }, s.wbg.__wbg_queueMicrotask_481971b0d87f3dd4 = function(e) {
    queueMicrotask(h(e));
  }, s.wbg.__wbg_then_a73caa9a87991566 = function(e, t, n) {
    const r = h(e).then(h(t), h(n));
    return g(r);
  }, s.wbg.__wbg_queueMicrotask_3cbae2ec6b6cd3d6 = function(e) {
    const t = h(e).queueMicrotask;
    return g(t);
  }, s.wbg.__wbg_resolve_b0083a7967828ec8 = function(e) {
    const t = Promise.resolve(h(e));
    return g(t);
  }, s.wbg.__wbg_newwithstrandinit_3fd6fba4083ff2d0 = function() {
    return y(function(e, t, n) {
      const r = new Request(T(e, t), h(n));
      return g(r);
    }, arguments);
  }, s.wbg.__wbindgen_closure_wrapper3118 = function(e, t, n) {
    const r = me(e, t, 173, be);
    return g(r);
  }, s;
}
function Ee(s, e) {
  return u = s.exports, ne.__wbindgen_wasm_module = e, O = null, M = null, A = null, u.__wbindgen_start(), u;
}
async function ne(s) {
  if (u !== void 0) return u;
  typeof s > "u" && (s = new URL("/nanopub-create/assets/web_bg-CaMmR8bt.wasm", import.meta.url));
  const e = Ce();
  (typeof s == "string" || typeof Request == "function" && s instanceof Request || typeof URL == "function" && s instanceof URL) && (s = fetch(s));
  const { instance: t, module: n } = await ve(await s, e);
  return Ee(t, n);
}
class je {
  constructor(e = {}) {
    this.options = { publishServer: e.publishServer || "https://np.petapico.org", theme: e.theme || "default", validateOnChange: e.validateOnChange !== false, showHelp: e.showHelp !== false, ...e }, this.storage = new Q(e.storage), this.template = null, this.formGenerator = null, this.builder = null, this.formData = {}, this.container = null, this.wasmInitialized = false, this.profile = null, this.credentials = null, this.listeners = { change: [], submit: [], error: [], publish: [], profileNeeded: [] }, this.initWasm(), this.loadCredentials();
  }
  async initWasm() {
    if (!this.wasmInitialized) try {
      await ne(), this.wasmInitialized = true, console.log("\u2713 WASM initialized successfully");
    } catch (e) {
      throw console.error("Failed to initialize WASM:", e), new Error("WASM initialization failed");
    }
  }
  async ensureWasm() {
    this.wasmInitialized || await this.initWasm();
  }
  async generateKeys() {
    await this.ensureWasm();
    try {
      const t = new ye().toJs();
      return { privateKey: t.private, publicKey: t.public };
    } catch (e) {
      throw console.error("Key generation failed:", e), new Error("Failed to generate RSA keys");
    }
  }
  async setupProfile(e, t) {
    await this.ensureWasm();
    const n = this.normalizeOrcid(t);
    try {
      const r = await this.generateKeys();
      return this.profile = { name: e, orcid: n }, this.credentials = { ...r, orcid: n, name: e }, this.saveCredentials(), console.log("\u2713 Profile setup complete"), console.log("  ORCID:", n), console.log("  Name:", e), this.profile;
    } catch (r) {
      throw console.error("Profile setup failed:", r), r;
    }
  }
  normalizeOrcid(e) {
    return e ? (e = e.trim(), e.startsWith("http") ? e : `https://orcid.org/${e}`) : null;
  }
  hasProfile() {
    return this.profile !== null && this.credentials !== null;
  }
  getProfile() {
    return this.profile;
  }
  exportKeys() {
    if (!this.credentials) throw new Error("No credentials to export");
    return { ...this.credentials };
  }
  importKeys(e) {
    if (!e.privateKey || !e.publicKey) throw new Error("Invalid profile data");
    this.profile = { name: e.name, orcid: this.normalizeOrcid(e.orcid) }, this.credentials = { privateKey: e.privateKey, publicKey: e.publicKey, orcid: this.normalizeOrcid(e.orcid), name: e.name }, this.saveCredentials();
  }
  saveCredentials() {
    if (!(!this.profile || !this.credentials)) try {
      const e = { profile: this.profile, credentials: this.credentials, savedAt: (/* @__PURE__ */ new Date()).toISOString() };
      this.storage.setItem("nanopub_profile", JSON.stringify(e)), console.log("\u2713 Profile saved to storage");
    } catch (e) {
      throw console.error("Failed to save credentials:", e), e;
    }
  }
  loadCredentials() {
    try {
      const e = this.storage.getItem("nanopub_profile");
      if (e) {
        const t = JSON.parse(e);
        return this.profile = t.profile, this.credentials = t.credentials, console.log("\u2713 Profile loaded from storage"), true;
      }
    } catch (e) {
      console.error("Failed to load credentials:", e);
    }
    return false;
  }
  clearCredentials() {
    this.profile = null, this.credentials = null;
    try {
      this.storage.removeItem("nanopub_profile"), console.log("\u2713 Profile cleared");
    } catch (e) {
      console.error("Failed to clear credentials:", e);
    }
  }
  async renderFromTemplateUri(e, t) {
    this.container = t;
    try {
      this.template = await q.fetchAndParse(e), this.template.uri = this.template.uri || e, this.formGenerator = new de(this.template, { validateOnChange: this.options.validateOnChange, showHelp: this.options.showHelp, labels: this.template.labels }), this.formGenerator.on("change", (n) => {
        this.formData = n, this.emit("change", n);
      }), this.formGenerator.on("submit", async (n) => {
        if (this.formData = n.formData || n, !this.hasProfile()) {
          this.emit("profileNeeded", {});
          return;
        }
        try {
          const r = await this.generateNanopub();
          this.emit("submit", { trigContent: r, formData: this.formData });
        } catch (r) {
          this.emit("error", { type: "generation", error: r });
        }
      }), this.formGenerator.renderForm(t), this.builder = new ue(this.template);
    } catch (n) {
      throw this.emit("error", { type: "template", error: n }), n;
    }
  }
  async generateNanopub() {
    if (!this.builder) throw new Error("No template loaded");
    const e = { creator: this.profile ? this.profile.orcid : null, creatorName: this.profile ? this.profile.name : null, created: (/* @__PURE__ */ new Date()).toISOString() };
    return await this.builder.buildFromFormData(this.formData, e);
  }
  async publish(e) {
    if (await this.ensureWasm(), !this.hasProfile()) throw new Error("Profile not configured. Cannot sign nanopublication.");
    try {
      const t = this.credentials.orcid || this.profile.orcid, n = this.credentials.name || this.profile.name;
      if (!t || !t.startsWith("https://orcid.org/")) throw new Error(`Invalid ORCID format: ${t}. Must start with https://orcid.org/`);
      console.log("\u{1F510} Creating profile and signing..."), console.log("  ORCID:", t), console.log("  Name:", n);
      const r = new G(this.credentials.privateKey, t, n);
      console.log("\u2705 Profile created"), console.log("\u{1F4DD} Signing nanopub...");
      const i = new U(e).sign(r);
      console.log("\u2705 Signed successfully"), console.log("  Signed type:", typeof i);
      const a = i.rdf();
      if (!this.options.publishServer) return console.log("\u{1F4E5} Download-only mode (no publish server configured)"), this.emit("publish", { uri: null, signedContent: a, downloadOnly: true }), { signedContent: a, downloadOnly: true };
      console.log("\u{1F4E4} Publishing to network..."), console.log("   Server:", this.options.publishServer);
      const c = await i.publish(r, this.options.publishServer);
      console.log("\u2705 Published successfully!"), console.log("\u{1F310} Result:", c);
      const l = typeof c == "string" ? c : c.uri || c.nanopub_uri;
      return this.emit("publish", { uri: l, signedContent: a }), { uri: l, nanopub_uri: l, signedContent: a };
    } catch (t) {
      throw console.error("\u274C Sign/Publish failed:", t), console.error("Error details:", t.message), this.emit("error", { type: "publish", error: t }), t;
    }
  }
  on(e, t) {
    this.listeners[e] && this.listeners[e].push(t);
  }
  emit(e, t) {
    this.listeners[e] && this.listeners[e].forEach((n) => n(t));
  }
}
let E = null, K = "";
async function $e() {
  try {
    E = new je({ publishServer: null }), E.on("change", (s) => {
      console.log("Form data changed:", s);
    }), E.on("submit", (s) => {
      console.log("Generated nanopub:", s.trigContent), K = s.trigContent, Pe(s.trigContent);
    }), E.on("error", (s) => {
      console.error("Error:", s.type, s.error), S(`Error (${s.type}): ${s.error.message}`, "error");
    }), E.on("profileNeeded", () => {
      S("Please setup your profile first to sign nanopublications", "warning");
    }), console.log("\u2713 Creator initialized successfully"), z();
  } catch (s) {
    console.error("Failed to initialize:", s), S("Failed to initialize: " + s.message, "error");
  }
}
function z() {
  const s = document.getElementById("profile-status"), e = document.getElementById("profile-setup"), t = document.getElementById("profile-info");
  if (E.hasProfile()) {
    const n = E.getProfile();
    s.textContent = "Configured", s.className = "status success", e.classList.add("hidden"), t.classList.remove("hidden"), document.getElementById("profile-name").textContent = n.name;
    const r = document.getElementById("profile-orcid");
    n.orcid ? (r.textContent = n.orcid, r.href = n.orcid) : (r.textContent = "Not provided", r.href = "#");
    const o = E.exportKeys();
    document.getElementById("public-key-preview").textContent = o.publicKey;
  } else s.textContent = "Not configured", s.className = "status warning", e.classList.remove("hidden"), t.classList.add("hidden");
}
document.getElementById("setup-btn").addEventListener("click", async () => {
  const s = document.getElementById("name-input").value.trim(), e = document.getElementById("orcid-input").value.trim(), t = document.getElementById("setup-message"), n = document.getElementById("setup-btn");
  if (!s) {
    t.innerHTML = '<div class="error-message">Please enter your name</div>';
    return;
  }
  try {
    n.disabled = true, n.textContent = "Generating keys...", t.innerHTML = '<div class="info-message">\u2699\uFE0F Generating RSA keypair with nanopub-rs WASM...<br>This may take a few seconds.</div>', await E.setupProfile(s, e || null), t.innerHTML = '<div class="success-message">Profile created successfully! Your keys are stored in this browser.</div>', z(), setTimeout(() => {
      t.innerHTML = "";
    }, 5e3);
  } catch (r) {
    console.error("Profile setup failed:", r), t.innerHTML = `<div class="error-message">Failed: ${r.message}</div>`;
  } finally {
    n.disabled = false, n.textContent = "Generate Keys & Save Profile";
  }
});
document.getElementById("import-file").addEventListener("change", async (s) => {
  const e = s.target.files[0];
  if (!e) return;
  const t = document.getElementById("setup-message");
  try {
    const n = await e.text(), r = JSON.parse(n);
    if (!r.privateKey || !r.publicKey || !r.name) throw new Error("Invalid profile file format");
    E.importKeys(r), z(), t.innerHTML = '<div class="success-message">\u2713 Profile imported successfully!</div>', setTimeout(() => {
      t.innerHTML = "";
    }, 3e3);
  } catch (n) {
    console.error("Import failed:", n), t.innerHTML = `<div class="error-message">Import failed: ${n.message}</div>`;
  }
  s.target.value = "";
});
document.getElementById("export-btn").addEventListener("click", () => {
  try {
    const s = E.getProfile(), e = E.exportKeys(), t = { name: s.name, orcid: s.orcid, privateKey: e.privateKey, publicKey: e.publicKey, exportedAt: (/* @__PURE__ */ new Date()).toISOString() }, n = new Blob([JSON.stringify(t, null, 2)], { type: "application/json" }), r = URL.createObjectURL(n), o = document.createElement("a");
    o.href = r, o.download = `nanopub-profile-${s.name.replace(/\s+/g, "-").toLowerCase()}.json`, o.click(), URL.revokeObjectURL(r), S("\u2713 Profile exported!", "success");
  } catch (s) {
    console.error("Export failed:", s), S("Export failed: " + s.message, "error");
  }
});
document.getElementById("clear-btn").addEventListener("click", () => {
  confirm("Are you sure you want to clear your profile and keys? Make sure to export first if you want to keep them.") && (E.clearCredentials(), z(), S("Profile cleared", "info"));
});
document.getElementById("load-template-btn").addEventListener("click", async () => {
  const s = document.getElementById("template-uri").value.trim(), e = document.getElementById("template-container"), t = document.getElementById("template-message"), n = document.getElementById("load-template-btn");
  if (!s) {
    t.innerHTML = '<div class="error-message">Please enter a template URI</div>';
    return;
  }
  try {
    n.disabled = true, n.textContent = "Loading...", e.innerHTML = '<div class="loading">\u23F3 Loading template from network...</div>', t.innerHTML = "", await E.renderFromTemplateUri(s, e), t.innerHTML = '<div class="success-message">\u2713 Template loaded successfully!</div>', e.classList.add("template-loaded"), setTimeout(() => {
      t.innerHTML = "";
    }, 3e3);
  } catch (r) {
    console.error("Template load failed:", r), t.innerHTML = `<div class="error-message">Failed to load template: ${r.message}</div>`, e.innerHTML = '<div class="error-message">Failed to load template. Check console for details.</div>';
  } finally {
    n.disabled = false, n.textContent = "Load Template";
  }
});
function Pe(s) {
  document.getElementById("preview-text").textContent = s, document.getElementById("preview-section").classList.remove("hidden");
}
document.getElementById("copy-btn").addEventListener("click", () => {
  const s = document.getElementById("preview-text").textContent;
  navigator.clipboard.writeText(s).then(() => {
    S("\u2713 Copied to clipboard!", "success");
  });
});
document.getElementById("sign-download-btn").addEventListener("click", () => {
  Le();
});
async function Le() {
  if (!K) {
    S("No nanopublication to sign", "warning");
    return;
  }
  if (!E.hasProfile()) {
    S("Please setup your profile first", "warning");
    return;
  }
  const s = document.getElementById("sign-download-btn");
  try {
    s.disabled = true, s.textContent = "Signing...", S("\u{1F510} Signing nanopublication...", "info");
    let t = (await E.publish(K)).signedContent;
    const n = E.getProfile(), o = `nanopub-signed-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.trig`, i = new Blob([t], { type: "application/trig" }), a = URL.createObjectURL(i), c = document.createElement("a");
    c.href = a, c.download = o, c.click(), URL.revokeObjectURL(a), S("\u2705 Signed nanopub downloaded!", "success"), document.getElementById("preview-text").textContent = t;
  } catch (e) {
    console.error("Sign failed:", e), S(`Sign failed: ${e.message}`, "error");
  } finally {
    s.disabled = false, s.textContent = "Sign & Download";
  }
}
function S(s, e = "info") {
  const t = document.getElementById("messages"), n = document.createElement("div");
  n.className = `${e}-message`, n.textContent = s, n.style.marginBottom = "10px", n.style.animation = "slideIn 0.3s ease", t.appendChild(n), setTimeout(() => {
    n.style.animation = "slideOut 0.3s ease", setTimeout(() => n.remove(), 300);
  }, 5e3);
}
$e();
