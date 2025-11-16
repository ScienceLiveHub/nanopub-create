var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function() {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload")) return;
  for (const r of document.querySelectorAll('link[rel="modulepreload"]')) n(r);
  new MutationObserver((r) => {
    for (const i of r) if (i.type === "childList") for (const o of i.addedNodes) o.tagName === "LINK" && o.rel === "modulepreload" && n(o);
  }).observe(document, { childList: true, subtree: true });
  function t(r) {
    const i = {};
    return r.integrity && (i.integrity = r.integrity), r.referrerPolicy && (i.referrerPolicy = r.referrerPolicy), r.crossOrigin === "use-credentials" ? i.credentials = "include" : r.crossOrigin === "anonymous" ? i.credentials = "omit" : i.credentials = "same-origin", i;
  }
  function n(r) {
    if (r.ep) return;
    r.ep = true;
    const i = t(r);
    fetch(r.href, i);
  }
})();
class ne {
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
new ne();
class X {
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
    const i = this.content.match(/nt:hasNanopubLabelPattern\s+"([^"]+)"/);
    i ? (this.template.labelPattern = i[1], console.log(`\u2705 Found label pattern: "${i[1]}"`)) : console.warn("\u26A0\uFE0F No nt:hasNanopubLabelPattern found in template");
    const o = this.content.match(/nt:hasTag\s+"([^"]+)"/);
    o && (this.template.tags = [o[1]]);
    const l = this.content.match(/nt:hasTargetNanopubType\s+(.+?)\s*[;.](?:\s|$)/s);
    if (l) {
      const d = l[1], a = /<([^>]+)>/g, b = [];
      let p;
      for (; (p = a.exec(d)) !== null; ) b.push(p[1]);
      this.template.types = b, console.log(`\u2705 Found ${b.length} target nanopub types:`, b);
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
      const n = t[1], r = t[2].trim(), i = t.index;
      let o = this.content.length;
      const d = this.content.substring(i).substring(1).search(/\n\s*(?:sub:[\w-]+\s+a\s+nt:|})/);
      d > 0 && (o = i + d + 1);
      const a = this.content.substring(i, o);
      console.log(`
--- Parsing ${n} ---`), console.log(`Block length: ${a.length} chars`), console.log(`Block preview: ${a.substring(0, 200)}...`);
      const b = r.split(",").map((h) => h.trim()), p = b[0].replace(/^nt:/, ""), c = { id: this.cleanUri(n), type: p, isLocalResource: b.some((h) => h.includes("LocalResource")), isIntroducedResource: b.some((h) => h.includes("IntroducedResource")), label: this.extractLabel(a), description: this.extractDescription(a), validation: this.extractValidation(a), possibleValuesFrom: null, possibleValuesFromApi: null, options: [], prefix: null, hasDatatype: null };
      if (p.includes("AutoEscapeUriPlaceholder")) {
        const h = a.match(/nt:hasPrefix\s+"([^"]+)"/);
        h && (c.prefix = h[1], console.log(`  \u2192 Found prefix for AutoEscapeUriPlaceholder: ${c.prefix}`));
      }
      const f = a.match(/nt:hasDatatype\s+<([^>]+)>/);
      if (f && (c.hasDatatype = f[1], console.log(`  \u2192 Found datatype: ${c.hasDatatype}`)), p.includes("RestrictedChoice")) {
        const h = a.match(/nt:possibleValuesFrom\s+(?:<([^>]+)>|([\w-]+:[\w-]+))/);
        if (h) {
          const _ = h[1] || h[2];
          if (_ && _.includes(":") && !_.startsWith("http")) {
            const [x, j] = _.split(":"), S = this.content.match(new RegExp(`@prefix ${x}:\\s+<([^>]+)>`));
            S ? c.possibleValuesFrom = S[1] + j : c.possibleValuesFrom = _;
          } else c.possibleValuesFrom = _;
          console.log(`  \u2192 Will fetch options from: ${c.possibleValuesFrom}`);
        }
        const y = a.match(/nt:possibleValue\s+([\s\S]+?)(?:\s+\.(?:\s|$))/);
        if (y) {
          const _ = y[1];
          console.log(`  \u2192 Raw value text: ${_.substring(0, 100)}...`);
          const x = [], j = /<([^>]+)>|([\w-]+:[\w-]+)/g;
          let S;
          for (; (S = j.exec(_)) !== null; ) x.push(S[1] || S[2]);
          x.length > 0 ? (c.options = x.map((E) => {
            let $ = this.template.labels[E];
            return $ || (E.startsWith("http") ? ($ = E.replace(/^https?:\/\//, "").replace(/\/$/, ""), $ = $.charAt(0).toUpperCase() + $.slice(1)) : E.includes(":") ? $ = E.split(":")[1] : $ = E), { value: E, label: $ };
          }), console.log(`  \u2192 Found ${c.options.length} inline options:`, c.options.map((E) => E.label))) : console.warn("  \u2192 No values found in possibleValue text");
        }
      }
      if (p.includes("GuidedChoice")) {
        const h = a.match(/nt:possibleValuesFromApi\s+"([^"]+)"/);
        h && (c.possibleValuesFromApi = h[1]);
      }
      console.log(`Found placeholder: ${c.id} (${c.type})`), this.template.placeholders.push(c);
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
      let i = "";
      const o = r.match(/@prefix sub:\s+<([^>]+)>/);
      o && (i = o[1]);
      const l = /<([^>]+)>\s+rdfs:label\s+"([^"]+)"/g, d = /(sub:[\w-]+)\s+rdfs:label\s+"([^"]+)"/g;
      e.options = [];
      let a = 0;
      for (const b of r.matchAll(l)) {
        a++;
        const p = b[1], c = b[2];
        console.log(`  \u2192 Match ${a} (full URI): URI=${p}, Label="${c}"`), p.includes("#assertion") || p.includes("#Head") || p.includes("#provenance") || p.includes("#pubinfo") || p.includes("ntemplate") || p.includes("rdf-syntax") || p.includes("XMLSchema") || p.includes("rdfs#") || p.includes("dc/terms") || p.includes("foaf/0.1") || p.includes("nanopub/x/") || p.includes("nanopub.org/nschema") || c.includes("Template:") || c.includes("Making a statement") || c.includes("is a") || c.includes("has type") || e.options.push({ value: p, label: c });
      }
      for (const b of r.matchAll(d)) {
        a++;
        const p = b[1], c = b[2], f = p.replace("sub:", ""), h = i + f;
        console.log(`  \u2192 Match ${a} (prefixed): ${p} -> ${h}, Label="${c}"`), e.options.push({ value: h, label: c });
      }
      console.log(`  \u2192 Loaded ${e.options.length} options for ${e.id}`), e.options.length > 0 && console.log("  \u2192 First 3 options:", e.options.slice(0, 3).map((b) => b.label));
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
      const n = t[1], r = t[2].split(",").map((i) => i.trim().replace(/^sub:/, ""));
      this.template.groupedStatements.push({ id: this.cleanUri(n), statements: r }), console.log(`Found grouped statement: ${n} with statements [${r.join(", ")}]`);
    }
  }
  findStatementIds() {
    const e = /* @__PURE__ */ new Set(), t = /nt:hasStatement\s+([^;.]+)/g;
    let n;
    for (; (n = t.exec(this.content)) !== null; ) n[1].split(",").map((o) => o.trim()).forEach((o) => {
      o.startsWith("sub:st") && e.add(o);
    });
    const r = /(sub:st[\w.-]+)\s+(?:a\s+nt:|rdf:)/g;
    for (; (n = r.exec(this.content)) !== null; ) e.add(n[1]);
    return Array.from(e).sort();
  }
  parseStatement(e) {
    const t = e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), n = new RegExp(`${t}\\s+(?:a\\s+[^;]+;\\s*)?(rdf:[\\s\\S]*?)(?=\\n\\s*(?:sub:[\\w.-]+|<[^>]+>)\\s+|\\n\\s*}|$)`, "i"), r = this.content.match(n);
    if (!r) return console.warn(`Could not find statement block for ${e}`), null;
    const i = r[1], o = i.match(/rdf:subject\s+(<[^>]+>|[\w:-]+)/), l = i.match(/rdf:predicate\s+(<[^>]+>|[\w:-]+)/), d = i.match(/rdf:object\s+(?:<([^>]+)>|([\w:-]+)|"([^"]+)")/);
    if (!o || !l || !d) return console.warn(`Incomplete statement ${e}:`, { subjMatch: !!o, predMatch: !!l, objMatch: !!d }), null;
    let a;
    d[1] ? a = d[1] : d[2] ? a = d[2] : d[3] && (a = d[3]);
    const p = r[0].match(/a\s+([^;.]+)/), c = p ? p[1].split(",").map((N) => N.trim()) : [], f = this.cleanUri(o[1]), h = this.cleanUri(l[1]), y = this.cleanUri(a), _ = o[1] === "nt:CREATOR", x = a === "nt:CREATOR", j = !_ && this.isPlaceholder(f), S = this.isPlaceholder(h), E = !x && this.isPlaceholder(y) && !d[3], $ = _ ? "nt:CREATOR" : j ? null : this.expandUri(o[1]), ae = this.expandUri(l[1]), le = x ? "nt:CREATOR" : E || d[3] ? null : this.expandUri(a);
    return { id: this.cleanUri(e), subject: f, predicate: h, object: y, subjectIsPlaceholder: j, predicateIsPlaceholder: S, objectIsPlaceholder: E, subjectUri: $, predicateUri: ae, objectUri: le, isLiteralObject: !!d[3], repeatable: c.some((N) => N.includes("RepeatableStatement")), optional: c.some((N) => N.includes("OptionalStatement")), grouped: c.some((N) => N.includes("GroupedStatement")), types: c };
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
    const i = e.match(/nt:hasMaxLength\s+"?(\d+)"?/);
    return i && (t.maxLength = parseInt(i[1])), Object.keys(t).length > 0 ? t : void 0;
  }
  static async fetchAndParse(e) {
    let t = e;
    (e.startsWith("http://purl.org/np/") || e.startsWith("https://w3id.org/np/")) && (t = `https://np.petapico.org/${e.split("/").pop()}.trig`), console.log(`Fetching template from ${t}`);
    const n = await fetch(t);
    if (!n.ok) throw new Error(`HTTP ${n.status}: ${n.statusText}`);
    const r = await n.text();
    return await new X(r).parse();
  }
}
function W(...s) {
  return s.filter(Boolean).join(" ");
}
const Y = { primary: "submit-button", secondary: "button-secondary", add: "button-add", remove: "button-remove", outline: "px-3 py-2 border-2 border-nanopub-primary text-nanopub-primary hover:bg-nanopub-primary hover:text-white rounded-lg transition-all font-semibold", ghost: "px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all", link: "text-nanopub-primary hover:underline" }, ce = { sm: "text-sm px-3 py-1.5", default: "px-4 py-2", lg: "text-lg px-6 py-3", icon: "p-2" };
function q(s = {}) {
  const { variant: e = "primary", size: t = "default", label: n = "", type: r = "button", disabled: i = false, onClick: o, className: l, icon: d, iconPosition: a = "left", attrs: b = {} } = s, p = document.createElement("button");
  if (p.type = r, p.className = W(Y[e] || Y.primary, ce[t], l), d) {
    const c = document.createElement("span");
    c.innerHTML = d, c.className = a === "left" ? "mr-2" : "ml-2", a === "left" && p.appendChild(c);
  }
  if (n) {
    const c = document.createTextNode(n);
    p.appendChild(c);
  }
  if (d && a === "right") {
    const c = document.createElement("span");
    c.innerHTML = d, c.className = "ml-2", p.appendChild(c);
  }
  return i && (p.disabled = true), o && p.addEventListener("click", o), Object.entries(b).forEach(([c, f]) => {
    p.setAttribute(c, f);
  }), p;
}
function P(s = {}) {
  const { type: e = "text", name: t, id: n, value: r, placeholder: i, required: o = false, disabled: l = false, readonly: d = false, className: a, onChange: b, onInput: p, onBlur: c, onFocus: f, validationState: h = null, attrs: y = {} } = s, _ = document.createElement("input");
  return _.type = e, _.className = W("field-input", h === "valid" && "field-valid", h === "invalid" && "field-invalid", a), t && (_.name = t), n && (_.id = n), r !== void 0 && (_.value = r), i && (_.placeholder = i), o && (_.required = true), l && (_.disabled = true), d && (_.readOnly = true), b && _.addEventListener("change", b), p && _.addEventListener("input", p), c && _.addEventListener("blur", c), f && _.addEventListener("focus", f), Object.entries(y).forEach(([x, j]) => {
    _.setAttribute(x, j);
  }), _;
}
function G(s = {}) {
  const { label: e, inputOptions: t = {}, helpText: n, errorText: r, optional: i = false, className: o } = s, l = document.createElement("div");
  if (l.className = W("field-container", o), e) {
    const a = document.createElement("label");
    if (a.className = "field-label", a.textContent = e, i) {
      const b = document.createElement("span");
      b.className = "optional-badge", b.textContent = "optional", a.appendChild(b);
    }
    t.id && (a.htmlFor = t.id), l.appendChild(a);
  }
  const d = P(t);
  if (l.appendChild(d), n) {
    const a = document.createElement("p");
    a.className = "field-help", a.textContent = n, l.appendChild(a);
  }
  if (r) {
    const a = document.createElement("p");
    a.className = "text-error text-sm mt-1", a.textContent = r, l.appendChild(a);
  }
  return l;
}
function de(s = {}) {
  const { name: e, id: t, value: n, placeholder: r, rows: i = 4, required: o = false, disabled: l = false, readonly: d = false, autoResize: a = false, className: b, onChange: p, onInput: c, validationState: f = null, attrs: h = {} } = s, y = document.createElement("textarea");
  if (y.className = W("field-textarea", f === "valid" && "field-valid", f === "invalid" && "field-invalid", b), e && (y.name = e), t && (y.id = t), n !== void 0 && (y.value = n), r && (y.placeholder = r), y.rows = i, o && (y.required = true), l && (y.disabled = true), d && (y.readOnly = true), a) {
    const _ = () => {
      y.style.height = "auto", y.style.height = y.scrollHeight + "px";
    };
    y.addEventListener("input", _), setTimeout(_, 0);
  }
  return p && y.addEventListener("change", p), c && y.addEventListener("input", c), Object.entries(h).forEach(([_, x]) => {
    y.setAttribute(_, x);
  }), y;
}
function ue(s = {}) {
  const { name: e, id: t, value: n, items: r = [], placeholder: i, required: o = false, disabled: l = false, className: d, onChange: a, validationState: b = null, attrs: p = {} } = s, c = document.createElement("select");
  if (c.className = W("field-select", b === "valid" && "field-valid", b === "invalid" && "field-invalid", d), e && (c.name = e), t && (c.id = t), o && (c.required = true), l && (c.disabled = true), i) {
    const f = document.createElement("option");
    f.value = "", f.textContent = i, f.disabled = true, f.selected = !n, c.appendChild(f);
  }
  return r.forEach((f) => {
    const h = document.createElement("option");
    h.value = f.value, h.textContent = f.label, f.disabled && (h.disabled = true), n !== void 0 && f.value === n && (h.selected = true), c.appendChild(h);
  }), a && c.addEventListener("change", a), Object.entries(p).forEach(([f, h]) => {
    c.setAttribute(f, h);
  }), c;
}
class re {
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
class pe extends re {
  constructor(e) {
    super(e), this.tailwindCustomization = { customCSS: this.getCustomCSS(), containerClass: "template-geographical", fieldClasses: { wkt: "wkt-field field-textarea", location: "location-field field-input", paper: "doi-field field-input", quote: "field-textarea" }, groupClasses: { "geometry-group": "geometry-group", "paper-citation": "paper-citation" }, theme: { primary: "#059669", accent: "#fbbf24", background: "#f0fdf4" } };
  }
  getCustomCSS() {
    return `
      /* Geographical Template Styles - Inline Version */
      .template-geographical {
        --geo-primary: #059669;
        --geo-primary-light: #10b981;
        --geo-primary-lighter: #d1fae5;
        --geo-primary-lightest: #f0fdf4;
        --geo-accent: #fbbf24;
        --geo-accent-light: #fef3c7;
      }
      
      .template-geographical .geometry-group {
        background-color: var(--geo-primary-lightest);
        border-left: 4px solid var(--geo-primary);
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin: 1.5rem 0;
        box-shadow: 0 1px 3px rgba(5, 150, 105, 0.1);
      }
      
      .template-geographical .wkt-field {
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        font-size: 0.9em;
        background-color: #f8f9fa;
      }
      
      .template-geographical .paper-citation {
        background: var(--geo-accent-light);
        border-left: 3px solid var(--geo-accent);
        border-radius: 0.5rem;
        padding: 1.25rem;
        margin: 1rem 0;
      }
      
      .template-geographical .doi-field {
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        font-size: 0.9em;
      }
      
      .template-geographical .field-hint {
        margin-top: 0.5rem;
        padding: 0.625rem 0.875rem;
        background-color: var(--geo-primary-lightest);
        border-left: 3px solid var(--geo-primary-light);
        border-radius: 0.375rem;
        font-size: 0.85rem;
        color: rgb(5, 78, 59);
      }
      
      .template-geographical .field-hint code {
        background-color: white;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        font-size: 0.85em;
        color: var(--geo-primary);
        border: 1px solid var(--geo-primary-lighter);
      }
    `;
  }
  detectSemanticGroups() {
    const e = [], t = this.template.statements.find((o) => o.predicateUri && o.predicateUri.includes("hasGeometry") && o.optional), n = this.template.statements.find((o) => o.predicateUri && o.predicateUri.includes("asWKT") && o.optional);
    t && n && e.push({ id: "geometry-group", label: "\u{1F4CD} Geometry Details (WKT Format)", statements: [t.id, n.id], collapsible: true, cssClass: "geometry-group" });
    const r = this.template.statements.find((o) => o.predicateUri && (o.predicateUri.includes("cites") || o.predicateUri.includes("paper"))), i = this.template.statements.find((o) => o.predicateUri && o.predicateUri.includes("quote"));
    return r && i && e.push({ id: "paper-citation", label: "\u{1F4C4} Paper Citation & Evidence", statements: [r.id, i.id], collapsible: false, cssClass: "paper-citation" }), e;
  }
  getAutofillRules() {
    const e = [], t = this.template.statements.find((n) => n.predicateUri && n.predicateUri.includes("hasGeometry"));
    if (t) {
      const n = t.object;
      e.push({ trigger: "location", target: n, transform: (r) => r.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-geometry" });
    }
    return e;
  }
  customizeField(e, t) {
    var _a, _b, _c, _d, _e2, _f, _g, _h;
    if (t.id === "wkt" || ((_a = t.predicateUri) == null ? void 0 : _a.includes("asWKT"))) {
      const n = document.createElement("div");
      n.className = "field-hint", n.innerHTML = `
        \u{1F4A1} <strong>WKT Format Examples:</strong><br>
        Point: <code>POINT(2.3 48.9)</code><br>
        Polygon: <code>POLYGON((7.5 44.3, 8.5 44.3, 8.5 44.9, 7.5 44.9, 7.5 44.3))</code><br>
        <a href="https://en.wikipedia.org/wiki/Well-known_text_representation_of_geometry" target="_blank" style="color: inherit; text-decoration: underline;">Learn more about WKT</a>
      `, (_b = e.parentElement) == null ? void 0 : _b.appendChild(n);
    }
    if (t.id === "paper" || ((_c = t.predicateUri) == null ? void 0 : _c.includes("cites"))) {
      const n = document.createElement("div");
      n.className = "field-hint", n.innerHTML = "\u{1F4A1} Enter DOI in format: <code>10.1234/example.2024</code>", (_d = e.parentElement) == null ? void 0 : _d.appendChild(n);
    }
    if (t.id === "location" || ((_e2 = t.predicateUri) == null ? void 0 : _e2.includes("coverage"))) {
      const n = document.createElement("div");
      n.className = "field-hint", n.innerHTML = '\u{1F4A1} Examples: "Amazon Basin", "Northern Europe", "Mediterranean Region"', (_f = e.parentElement) == null ? void 0 : _f.appendChild(n);
    }
    if ((_g = t.predicateUri) == null ? void 0 : _g.includes("quote")) {
      const n = document.createElement("div");
      n.className = "field-hint", n.innerHTML = "\u{1F4A1} Copy the exact text from the paper that describes the geographical coverage", (_h = e.parentElement) == null ? void 0 : _h.appendChild(n);
    }
    return e;
  }
  getFormCustomizations() {
    return { title: "\u{1F30D} Geographical Coverage", description: "Document the geographical area or region covered by this research", submitButtonText: "Publish Geographical Coverage", containerClass: "template-geographical" };
  }
}
class fe {
  static getCustomization(e) {
    const t = e.split("/").pop(), n = this.templates[t] || re;
    return console.log(`[TemplateRegistry] Using ${n.name} for template ${t}`), n;
  }
  static register(e, t) {
    this.templates[e] = t, console.log(`[TemplateRegistry] Registered ${t.name} for ${e}`);
  }
}
__publicField(fe, "templates", { "RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao": pe });
const he = { LiteralPlaceholder: (s) => {
  var _a;
  return P({ type: "text", placeholder: s.label || "", attrs: ((_a = s.validation) == null ? void 0 : _a.regex) ? { pattern: s.validation.regex } : {} });
}, LongLiteralPlaceholder: (s) => de({ rows: 5, placeholder: s.label || "" }), ExternalUriPlaceholder: (s) => P({ type: "url", placeholder: s.label || "https://..." }), UriPlaceholder: (s) => P({ type: "url", placeholder: s.label || "https://..." }), TrustyUriPlaceholder: (s) => P({ type: "url", placeholder: s.label || "https://..." }), RestrictedChoicePlaceholder: (s) => {
  var _a;
  console.log(`[RestrictedChoice] Rendering ${s.id} with ${((_a = s.options) == null ? void 0 : _a.length) || 0} options`);
  const e = [];
  return s.options && Array.isArray(s.options) ? s.options.forEach((t) => {
    e.push({ value: t.value || t, label: t.label || t.value || t });
  }) : console.warn(`[RestrictedChoice] No options found for ${s.id}`), ue({ items: e, placeholder: e.length > 1 ? "Select..." : void 0, value: e.length === 1 ? e[0].value : void 0 });
}, GuidedChoicePlaceholder: (s) => P({ type: "text", placeholder: s.label || "Type to search...", attrs: { "data-guided-choice": "true" } }), IntroducedResource: (s) => P({ type: "text", placeholder: s.label || "Enter identifier" }), LocalResource: (s) => P({ type: "text", placeholder: s.label || "Enter identifier" }), ValuePlaceholder: (s) => P({ type: "text", placeholder: s.label || "Enter value" }), AutoEscapeUriPlaceholder: (s) => P({ type: "text", placeholder: s.label || "" }), AgentPlaceholder: (s) => P({ type: "url", placeholder: s.label || "https://orcid.org/..." }) };
function Z(s, e) {
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
  const i = t.querySelector(".toggle-label");
  i.style.cssText = `
    font-weight: 500;
    color: #495057;
    flex: 1;
  `;
  const o = document.createElement("div");
  o.className = "optional-content", o.style.cssText = `
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out, padding 0.3s ease-out;
    padding: 0;
  `, Array.from(s.children).forEach((d) => o.appendChild(d)), s.appendChild(t), s.appendChild(o), s.classList.add("collapsed"), t.addEventListener("click", () => {
    const d = s.classList.contains("collapsed");
    s.classList.toggle("collapsed"), d ? (r.style.transform = "rotate(90deg)", o.style.maxHeight = o.scrollHeight + "px", o.style.padding = "15px 0 0 0", t.style.background = "#e7f3ff", t.style.borderColor = "#0066cc", n.style.background = "#d1ecf1", setTimeout(() => {
      s.classList.contains("collapsed") || (o.style.maxHeight = "none", o.style.overflow = "visible");
    }, 300)) : (o.style.maxHeight = o.scrollHeight + "px", o.style.overflow = "hidden", o.offsetHeight, setTimeout(() => {
      r.style.transform = "rotate(0deg)", o.style.maxHeight = "0", o.style.padding = "0", t.style.background = "#f8f9fa", t.style.borderColor = "#dee2e6", n.style.background = "#e7f3ff";
    }, 10));
  }), o.addEventListener("input", () => {
    s.classList.contains("collapsed") && t.click();
  }, true);
}
function be(s, e) {
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
  const i = t.querySelector(".toggle-label");
  i.style.cssText = `
    font-weight: 500;
    color: #495057;
    flex: 1;
  `;
  const o = document.createElement("div");
  o.className = "optional-content", o.style.cssText = `
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out, padding 0.3s ease-out;
    padding: 0;
  `, Array.from(s.children).forEach((d) => o.appendChild(d)), s.appendChild(t), s.appendChild(o), t.addEventListener("mouseenter", () => {
    s.classList.contains("collapsed") && (t.style.background = "#e9ecef");
  }), t.addEventListener("mouseleave", () => {
    s.classList.contains("collapsed") && (t.style.background = "#f8f9fa");
  }), t.addEventListener("click", () => {
    const d = s.classList.contains("collapsed");
    if (s.classList.toggle("collapsed"), d) {
      r.style.transform = "rotate(90deg)";
      const a = o.scrollHeight;
      o.style.maxHeight = a + "px", o.style.padding = "15px 0 0 0", t.style.background = "#e7f3ff", t.style.borderColor = "#0066cc", n.style.background = "#d1ecf1", setTimeout(() => {
        s.classList.contains("collapsed") || (o.style.maxHeight = "none", o.style.overflow = "visible");
      }, 300);
    } else o.style.maxHeight = o.scrollHeight + "px", o.style.overflow = "hidden", o.offsetHeight, setTimeout(() => {
      r.style.transform = "rotate(0deg)", o.style.maxHeight = "0", o.style.padding = "0", t.style.background = "#f8f9fa", t.style.borderColor = "#dee2e6", n.style.background = "#e7f3ff";
    }, 10);
  }), o.addEventListener("input", () => {
    s.classList.contains("collapsed") && t.click();
  }, true), o.addEventListener("focus", () => {
    s.classList.contains("collapsed") && t.click();
  }, true);
}
class me {
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
          (n.name || n.id || "").includes(t.trigger) && n.addEventListener("input", async (i) => {
            const o = i.target.value;
            o && e.forEach(async (l) => {
              if ((l.name || l.id || "").includes(t.target) && !l.value) {
                const a = await t.transform(o);
                l.value = a, l.dispatchEvent(new Event("input", { bubbles: true })), this.showFeedback(l);
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
class ge {
  constructor(e, t = {}) {
    this.template = e, this.options = { validateOnChange: true, showHelp: true, ...t }, this.labels = t.labels || e.labels || {}, this.formData = {}, this.eventListeners = { change: [], submit: [], preview: [] }, this.formElement = null, this.autofillManager = new me();
    const n = fe.getCustomization(e.uri);
    this.customization = new n(e), console.log(`[FormGenerator] Using customization: ${this.customization.constructor.name}`), this.tailwindCustomization = e.customization || {}, this.tailwindCustomization.fieldClasses && console.log("[FormGenerator] Template has Tailwind customization");
  }
  getFieldClasses(e, t) {
    var _a;
    const r = { text: "field-input", email: "field-input", url: "field-input", textarea: "field-textarea", select: "field-select" }[t] || "field-input";
    return ((_a = this.tailwindCustomization.fieldClasses) == null ? void 0 : _a[e]) || r;
  }
  getGroupClasses(e) {
    var _a;
    return ((_a = this.tailwindCustomization.groupClasses) == null ? void 0 : _a[e]) || "assertion-box";
  }
  injectCustomStyles(e) {
    if (e.querySelectorAll("[data-template-styles]").forEach((n) => n.remove()), this.tailwindCustomization.customCSS) {
      const n = document.createElement("style");
      n.setAttribute("data-template-styles", "true"), n.textContent = this.tailwindCustomization.customCSS, e.prepend(n);
    }
    this.tailwindCustomization.theme && this.applyTheme(e, this.tailwindCustomization.theme);
  }
  applyTheme(e, t) {
    const n = [];
    if (t.primary && n.push(`--color-template-primary: ${t.primary}`), t.secondary && n.push(`--color-template-secondary: ${t.secondary}`), t.background && n.push(`--color-template-bg: ${t.background}`), t.border && n.push(`--color-template-border: ${t.border}`), n.length > 0) {
      const r = e.style.cssText;
      e.style.cssText = r + "; " + n.join("; ");
    }
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
      const i = { dct: "http://purl.org/dc/terms/", foaf: "http://xmlns.com/foaf/0.1/", prov: "http://www.w3.org/ns/prov#", rdfs: "http://www.w3.org/2000/01/rdf-schema#", schema: "https://schema.org/", rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#" };
      if (i[n]) return i[n] + r;
    }
    return e;
  }
  parseUriLabel(e) {
    if (!e) return "";
    const t = { "dct:": "DC Terms: ", "foaf:": "FOAF: ", "prov:": "Provenance: ", "rdfs:": "RDFS: ", "schema:": "Schema: " };
    for (const [i, o] of Object.entries(t)) if (e.startsWith(i)) return e.substring(i.length).replace(/([a-z])([A-Z])/g, "$1 $2").split(/[-_]/).map((d) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()).join(" ");
    const n = e.split(/[#\/]/);
    let r = n[n.length - 1] || "";
    return !r && n.length > 1 && (r = n[n.length - 2]), r = r.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^(has|is)\s+/i, "").trim().split(" ").map((i) => i.charAt(0).toUpperCase() + i.slice(1).toLowerCase()).join(" "), r || e;
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
    console.log("Rendering form with template:", this.template), this.formElement = document.createElement("form"), this.formElement.className = "form-container", typeof e == "string" && (e = document.querySelector(e)), e && this.injectCustomStyles(e);
    const t = document.createElement("div");
    t.className = "mb-6";
    const n = document.createElement("h2");
    if (n.className = "text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2", n.textContent = this.template.label || "Nanopublication Template", t.appendChild(n), this.template.description) {
      const i = document.createElement("p");
      i.className = "text-gray-600 dark:text-gray-400 text-sm", i.textContent = this.template.description, t.appendChild(i);
    }
    this.formElement.appendChild(t);
    const r = document.createElement("div");
    return r.className = "space-y-6", this.renderFields(r), this.formElement.appendChild(r), this.formElement.appendChild(this.buildControls()), typeof e == "string" && (e = document.querySelector(e)), e && (e.innerHTML = "", e.appendChild(this.formElement), this.setupEventListeners()), this.formElement;
  }
  renderFields(e) {
    if (!this.template.statements || this.template.statements.length === 0) {
      const a = document.createElement("div");
      a.className = "empty-state", a.innerHTML = '<h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">No fields to display</h3>', e.appendChild(a);
      return;
    }
    const t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set(), i = this.customization.detectSemanticGroups();
    console.log("[renderFields] Semantic groups:", i), this.customization.getAutofillRules().forEach((a) => {
      this.autofillManager.addRule(a.trigger, a.target, a.transform);
    }), this.autofillManager.setupAll(), console.log("[renderFields] Processing statements...");
    let l = null, d = null;
    this.template.statements.forEach((a, b) => {
      if (n.has(a.id)) {
        console.log(`  ${a.id}: \u2192 Skipping (already in semantic group)`);
        return;
      }
      const p = i.find((_) => _.statements.includes(a.id));
      if (p && !t.has(p.id)) {
        console.log(`  ${a.id}: \u2192 Part of semantic group ${p.id}`), l && (e.appendChild(l), l = null, d = null), this.renderSemanticGroup(e, p, r), p.statements.forEach((_) => n.add(_)), t.add(p.id);
        return;
      }
      const c = this.template.groupedStatements.find((_) => _.statements.includes(a.id));
      if (console.log(`  ${a.id}: parentGroup=${c == null ? void 0 : c.id}, processed=${t.has(c == null ? void 0 : c.id)}, subject=${a.subject}`), c && t.has(c.id)) {
        console.log("    \u2192 Skipping (group already processed)");
        return;
      }
      const f = this.findPlaceholder(a.subject), h = this.findPlaceholder(a.object), y = this.findPlaceholder(a.predicate);
      if (!f && !h && !y) {
        console.log("    \u2192 Skipping (all fixed - auto-filled statement)");
        return;
      }
      if (f && (f.type.includes("ExternalUriPlaceholder") || f.type.includes("UriPlaceholder")) && !y && !h) {
        console.log("    \u2192 Skipping (URI placeholder metadata statement)");
        return;
      }
      if (a.subject !== d) {
        if (l && (e.appendChild(l), l = null), this.template.statements.filter((x) => x.subject === a.subject).length > 1) {
          l = document.createElement("div"), l.className = "subject-group", l.style.cssText = "margin: 1.5rem 0; padding: 1.5rem; border: 2px solid #be2e78; border-radius: 8px; background: #f6d7e8; box-shadow: 0 1px 3px rgba(190, 46, 120, 0.1);";
          const x = this.findPlaceholder(a.subject);
          if (x && !r.has(x.id)) {
            const j = document.createElement("div");
            j.className = "form-field subject-field";
            const S = document.createElement("label");
            S.className = "field-label subject-label", S.style.cssText = "font-weight: 600; font-size: 1.15em; color: #2b3456; margin-bottom: 0.75rem; display: block;", S.textContent = x.label || this.getLabel(a.subject), j.appendChild(S);
            const E = this.renderInput(x);
            if (E !== null) E.name = `${a.id}_subject`, E.id = `field_${a.id}_subject`, j.appendChild(E);
            else {
              const $ = document.createElement("div");
              $.className = "field-value auto-generated", $.textContent = "(auto-generated)", j.appendChild($);
            }
            l.appendChild(j), r.add(x.id);
          }
        }
        d = a.subject;
      }
      if (c) {
        console.log(`    \u2192 Rendering grouped statement ${c.id}`);
        const _ = l || e;
        this.renderGroupedStatement(_, c, a, r), t.add(c.id);
      } else {
        console.log("    \u2192 Rendering individual statement");
        const _ = l || e;
        this.renderStatement(_, a, r);
      }
    }), l && e.appendChild(l);
  }
  renderGroupedStatement(e, t, n, r = /* @__PURE__ */ new Set()) {
    const i = document.createElement("div");
    i.className = "form-field-group", n.repeatable && i.classList.add("repeatable-group"), n.optional && i.classList.add("optional-group");
    const o = t.statements.map((d) => this.template.statements.find((a) => a.id === d)).filter((d) => d), l = o[0];
    if (l) {
      const d = this.findPlaceholder(l.subject);
      if (d && !r.has(d.id)) {
        const a = document.createElement("div");
        a.className = "form-field";
        const b = document.createElement("label");
        b.className = "field-label", b.textContent = d.label || this.getLabel(l.subject), a.appendChild(b);
        const p = this.renderInput(d);
        p.name = `${l.id}_subject`, p.id = `field_${l.id}_subject`, a.appendChild(p), i.appendChild(a), r.add(d.id);
      }
    }
    o.forEach((d) => {
      this.renderStatementInGroup(i, d, r);
    }), n.repeatable && i.appendChild(this.buildRepeatableControls(n, null)), e.appendChild(i);
  }
  renderStatementInGroup(e, t, n = /* @__PURE__ */ new Set(), r = false) {
    console.log(`[renderStatementInGroup] ${t.id}:`, { predicate: t.predicate, object: t.object, isLiteralObject: t.isLiteralObject });
    const i = this.findPlaceholder(t.object), o = this.findPlaceholder(t.predicate);
    console.log("  objectPlaceholder:", i == null ? void 0 : i.id), console.log("  predicatePlaceholder:", o == null ? void 0 : o.id);
    const l = o && !n.has(o.id), d = i && !n.has(i.id);
    if (o && i && !l && !d) {
      console.log("  \u2192 SKIP (both placeholders already rendered)");
      return;
    }
    const a = this.getLabel(t.predicate);
    if (!i && !o) {
      console.log(`  \u2192 READONLY path: ${a} = ${t.object}`);
      const c = document.createElement("div");
      c.className = "form-field readonly-field";
      const f = document.createElement("label");
      f.className = "field-label", f.textContent = a;
      const h = document.createElement("div");
      h.className = "field-value", h.textContent = t.object, c.appendChild(f), c.appendChild(h), e.appendChild(c);
      return;
    }
    if (i && !d && !o) {
      console.log("  \u2192 SKIP (object placeholder already rendered)");
      return;
    }
    console.log("  \u2192 INPUT path");
    const b = document.createElement("div");
    b.className = "form-field", t.optional && (b.classList.add("optional"), r || setTimeout(() => {
      Z(b, a);
    }, 0));
    const p = document.createElement("label");
    if (p.className = "field-label", p.textContent = a, b.appendChild(p), l) {
      const c = this.renderInput(o);
      c.name = `${t.id}_predicate`, c.id = `field_${t.id}_predicate`, b.appendChild(c), n.add(o.id);
    }
    if (d) {
      if (i.label) {
        const f = document.createElement("div");
        f.className = "field-help", f.textContent = i.label, b.appendChild(f);
      }
      const c = this.renderInput(i);
      c.name = t.id, c.id = `field_${t.id}`, b.appendChild(c), n.add(i.id);
    } else if (!i) {
      const c = document.createElement("div");
      c.className = "field-value", c.textContent = this.getLabel(t.object) || t.object, b.appendChild(c);
    }
    if (t.optional) {
      const c = document.createElement("span");
      c.className = "optional-badge", c.textContent = "optional", p.appendChild(c);
    }
    e.appendChild(b);
  }
  renderStatement(e, t, n = /* @__PURE__ */ new Set(), r = false) {
    const i = this.findPlaceholder(t.subject), o = this.findPlaceholder(t.predicate), l = this.findPlaceholder(t.object), d = this.getLabel(t.predicate), a = i && !n.has(i.id), b = o && !n.has(o.id), p = l && !n.has(l.id);
    if (!a && !b && !p && (o || l)) return;
    if (!o && !l && !a) {
      const f = document.createElement("div");
      f.className = "form-field readonly-field";
      const h = document.createElement("label");
      h.className = "field-label", h.textContent = d;
      const y = document.createElement("div");
      y.className = "field-value", y.textContent = this.getLabel(t.object) || t.object, f.appendChild(h), f.appendChild(y), e.appendChild(f);
      return;
    }
    const c = document.createElement("div");
    if (c.className = "form-field", t.repeatable && c.classList.add("repeatable"), t.optional && (c.classList.add("optional"), r || setTimeout(() => {
      const f = o && o.label || d;
      Z(c, f);
    }, 0)), a) {
      const f = document.createElement("label");
      f.className = "field-label", f.textContent = i.label || this.getLabel(t.subject), c.appendChild(f);
      const h = this.renderInput(i);
      if (h !== null) h.name = `${t.id}_subject`, h.id = `field_${t.id}_subject`, t.optional || (h.required = true), c.appendChild(h);
      else {
        const y = document.createElement("div");
        y.className = "field-value auto-generated", y.textContent = "(auto-generated)", c.appendChild(y);
      }
      n.add(i.id);
    }
    if (b) {
      const f = document.createElement("label");
      f.className = "field-label", f.textContent = o.label || d, c.appendChild(f);
      const h = this.renderInput(o);
      h.name = `${t.id}_predicate`, h.id = `field_${t.id}_predicate`, t.optional || (h.required = true), c.appendChild(h), n.add(o.id);
    } else if (!o) {
      const f = document.createElement("label");
      if (f.className = "field-label", f.textContent = d, t.optional) {
        const h = document.createElement("span");
        h.className = "optional-badge", h.textContent = "optional", f.appendChild(h);
      }
      c.appendChild(f);
    }
    if (p) {
      const f = this.renderInput(l);
      if (f === null) {
        const h = document.createElement("div");
        h.className = "field-value auto-generated", h.textContent = l.label || t.object, c.appendChild(h);
      } else {
        if (l.label) {
          const h = document.createElement("div");
          h.className = "field-help", h.textContent = l.label, c.appendChild(h);
        }
        f.name = `${t.id}_object`, f.id = `field_${t.id}_object`, t.optional || (f.required = true), c.appendChild(f);
      }
      n.add(l.id);
    } else if (!l) {
      const f = document.createElement("div");
      f.className = "field-value", f.textContent = this.getLabel(t.object) || t.object, c.appendChild(f);
    }
    e.appendChild(c), t.repeatable && e.appendChild(this.buildRepeatableControls(t, null));
  }
  renderInput(e) {
    const t = e.type.split(",").map((n) => n.trim().replace(/^nt:/, ""));
    for (const n of t) {
      const r = he[n];
      if (r) return console.log(`Using component ${n} for placeholder ${e.id}`), r(e, this.options);
    }
    return console.warn(`No component for types: ${e.type}`), P({ type: "text", placeholder: e.label || "", className: this.getFieldClasses(e.id, "text") });
  }
  buildRepeatableControls(e, t) {
    const n = document.createElement("div");
    n.className = "repeatable-controls", n.dataset.count = "1";
    const r = q({ variant: "add", type: "button", label: "Add Another", onClick: () => {
      const i = parseInt(n.dataset.count);
      n.dataset.count = i + 1;
      const o = this.buildRepeatableField(e, t, i);
      n.parentElement.insertBefore(o, n), this.emit("change", this.collectFormData());
    } });
    return n.appendChild(r), n;
  }
  buildRepeatableField(e, t, n) {
    const r = document.createElement("div");
    r.className = "repeatable-field-group";
    const i = this.findPlaceholder(e.subject), o = this.findPlaceholder(e.predicate), l = this.findPlaceholder(e.object);
    let d = false;
    if (i) {
      const b = this.template.statements.filter((p) => p.subject === e.subject);
      d = b.length === 1, console.log`[buildRepeatableField] Subject ${e.subject}:`, b.length;
    }
    if (i && d) {
      const b = G({ label: i.label || this.getLabel(e.subject), inputOptions: { ...this.getInputOptions(i), name: `${e.id}_subject_${n}`, id: `field_${e.id}_subject_${n}` }, className: "repeatable-field" });
      r.appendChild(b);
    }
    if (o) {
      const b = G({ label: o.label || this.getLabel(e.predicate), inputOptions: { ...this.getInputOptions(o), name: `${e.id}_predicate_${n}`, id: `field_${e.id}_predicate_${n}` }, className: "repeatable-field" });
      r.appendChild(b);
    }
    if (l) {
      const b = G({ label: o ? void 0 : this.getLabel(e.predicate), inputOptions: { ...this.getInputOptions(l), name: `${e.id}_object_${n}`, id: `field_${e.id}_object_${n}` }, helpText: l.label, className: "repeatable-field" });
      r.appendChild(b);
    }
    const a = q({ variant: "remove", type: "button", label: "\xD7 Remove", onClick: () => {
      r.remove(), this.emit("change", this.collectFormData());
    } });
    return r.appendChild(a), r;
  }
  getInputOptions(e) {
    return { type: this.getInputType(e), placeholder: e.label || "", className: this.getFieldClasses(e.id, this.getInputType(e)) };
  }
  buildControls() {
    const e = document.createElement("div");
    e.className = "form-controls";
    const t = q({ variant: "primary", type: "submit", label: "Create Nanopublication" });
    return e.appendChild(t), e;
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
      let i = r.querySelector(".error-message");
      t ? i && i.remove() : (i || (i = document.createElement("div"), i.className = "error-message", r.appendChild(i)), i.textContent = n);
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
    r.className = "semantic-group", r.style.cssText = "margin: 1.25rem 0;", t.statements.forEach((i) => {
      const o = this.template.statements.find((l) => l.id === i);
      o && this.renderStatement(r, o, n, true);
    }), t.collapsible && setTimeout(() => {
      be(r, t.label);
    }, 0), e.appendChild(r);
  }
}
class _e {
  constructor(e) {
    var _a, _b;
    this.template = e, console.log("NanopubBuilder initialized with:", { uri: e.uri, labelPattern: e.labelPattern, types: ((_a = e.types) == null ? void 0 : _a.length) || 0, statements: ((_b = e.statements) == null ? void 0 : _b.length) || 0 });
  }
  async buildFromFormData(e, t = {}) {
    this.formData = e, this.metadata = t;
    const n = (/* @__PURE__ */ new Date()).toISOString(), r = this.generateRandomId(), i = `http://purl.org/nanopub/temp/${r}`;
    this.currentNanopubBaseUri = i;
    const o = this.buildPrefixes(r), l = this.buildHead(), d = this.buildAssertion(), a = this.buildProvenance(), b = this.buildPubinfo(n);
    return `${o}

${l}

${d}

${a}

${b}
`;
  }
  generateRandomId() {
    return Math.random().toString(36).substring(2, 15);
  }
  buildPrefixes(e) {
    const t = `http://purl.org/nanopub/temp/${e}`, n = [`@prefix this: <${t}> .`, `@prefix sub: <${t}/> .`, "@prefix np: <http://www.nanopub.org/nschema#> .", "@prefix dct: <http://purl.org/dc/terms/> .", "@prefix nt: <https://w3id.org/np/o/ntemplate/> .", "@prefix npx: <http://purl.org/nanopub/x/> .", "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .", "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .", "@prefix orcid: <https://orcid.org/> .", "@prefix prov: <http://www.w3.org/ns/prov#> .", "@prefix foaf: <http://xmlns.com/foaf/0.1/> .", "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ."];
    if (this.template.prefixes) for (const [r, i] of Object.entries(this.template.prefixes)) n.some((o) => o.includes(`@prefix ${r}:`)) || n.push(`@prefix ${r}: <${i}> .`);
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
      const i = parseInt(n.replace(/\D/g, "")), o = parseInt(r.replace(/\D/g, ""));
      return i - o;
    });
    for (const n of t) {
      const r = this.template.statements.find((o) => o.id === n);
      if (!r) continue;
      const i = this.getStatementInstances(r);
      for (const o of i) {
        const l = this.buildTriple(r, o);
        l && e.push(l);
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
      const i = this.getInstanceData(e, r);
      if (i) t.push(i);
      else break;
    }
    return t;
  }
  getInstanceData(e, t) {
    var _a, _b;
    const n = t ? `_${t}` : "", r = { subject: this.formData[`${e.id}_subject${n}`], predicate: this.formData[`${e.id}_predicate${n}`], object: this.formData[`${e.id}_object${n}`] }, i = (_a = this.template.placeholders) == null ? void 0 : _a.find((b) => b.id === e.subject), o = (_b = this.template.placeholders) == null ? void 0 : _b.find((b) => b.id === e.object);
    i && (i.isIntroducedResource || i.isLocalResource);
    const l = o && (o.isIntroducedResource || o.isLocalResource);
    if (!r.subject && e.subjectIsPlaceholder) {
      const b = e.subject, p = this.findPlaceholderValue(b);
      p && (r.subject = p);
    }
    if (!r.object && e.objectIsPlaceholder) {
      const b = e.object, p = this.findPlaceholderValue(b);
      p && (r.object = p);
    }
    r.subject && r.subject;
    const d = r.predicate && r.predicate !== "", a = r.object && r.object !== "";
    return e.optional && !a && !l || !e.optional && (e.objectIsPlaceholder && !a || e.predicateIsPlaceholder && !d) ? null : r;
  }
  buildTriple(e, t) {
    const n = this.metadata.creator || "https://orcid.org/0000-0000-0000-0000";
    let r = t.subject || e.subject, i;
    e.subjectUri === "nt:CREATOR" ? i = n.startsWith("orcid:") ? n : `orcid:${n.split("/").pop()}` : i = e.subjectIsPlaceholder ? this.resolveValue(r, e.subject) : this.formatUri(e.subjectUri);
    const o = t.predicate || e.predicate, l = e.predicateIsPlaceholder ? this.resolveValue(o, e.predicate) : this.formatUri(e.predicateUri);
    let d = t.object || e.object, a;
    return e.objectUri === "nt:CREATOR" ? a = n.startsWith("orcid:") ? n : `orcid:${n.split("/").pop()}` : a = e.objectIsPlaceholder ? this.resolveValue(d, e.object) : this.formatUri(e.objectUri), !i || !l || !a || i.startsWith("<") && i.endsWith(">") && !i.includes("://") || a.startsWith("<") && a.endsWith(">") && !a.includes("://") ? null : e.predicateUri === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" || l === "rdf:type" || l === "a" ? `  ${i} a ${a} .` : `  ${i} ${l} ${a} .`;
  }
  resolveValue(e, t) {
    var _a;
    if (!e || e === "") return null;
    if (e === "nt:CREATOR" || e === "CREATOR" || t === "nt:CREATOR" || t === "CREATOR") {
      const o = this.metadata.creator || "https://orcid.org/0000-0000-0000-0000";
      return o.startsWith("orcid:") ? o : `orcid:${o.split("/").pop()}`;
    }
    const n = t.replace("sub:", "");
    if (e === n || e === `sub:${n}`) return null;
    const r = (_a = this.template.placeholders) == null ? void 0 : _a.find((o) => o.id === n);
    if (r && (r.isIntroducedResource || r.isLocalResource)) return `<${this.currentNanopubBaseUri || "http://purl.org/nanopub/temp/unknown"}/${e}>`;
    if ((r == null ? void 0 : r.type) === "AutoEscapeUriPlaceholder" && r.prefix) {
      const o = encodeURIComponent(e).replace(/%20/g, "+");
      return `<${r.prefix}${o}>`;
    }
    if ((r == null ? void 0 : r.type) === "UriPlaceholder" || (r == null ? void 0 : r.type) === "GuidedChoicePlaceholder" || (r == null ? void 0 : r.type) === "ExternalUriPlaceholder" || e.startsWith("http://") || e.startsWith("https://")) return `<${e}>`;
    if (r == null ? void 0 : r.hasDatatype) return `"${e}"^^<${r.hasDatatype}>`;
    if (e.includes(`
`)) {
      let o = e.replace(/"""/g, '\\"""');
      return o.endsWith('""') ? o = o.slice(0, -2) + '\\"\\""' : o.endsWith('"') && (o = o.slice(0, -1) + '\\"'), `"""${o}"""`;
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
    const t = this.metadata.creator || "https://orcid.org/0000-0002-1784-2920", n = this.metadata.creatorName || "Unknown", r = t.startsWith("orcid:") ? t : `orcid:${t.split("/").pop()}`, i = [`  ${r} foaf:name "${n}" .`, "", `  this: dct:created "${e}"^^xsd:dateTime;`, `    dct:creator ${r};`, "    dct:license <https://creativecommons.org/licenses/by/4.0/>"];
    if (((_a = this.template.types) == null ? void 0 : _a.length) > 0) {
      const l = this.template.types.map((d) => `<${d}>`).join(", ");
      i.push(`;
    npx:hasNanopubType ${l}`);
    }
    const o = [];
    for (const l of this.template.placeholders || []) if (l.isIntroducedResource) {
      const d = this.findPlaceholderValue(l.id);
      if (d) {
        const a = `${this.currentNanopubBaseUri}/${d}`;
        o.push(`<${a}>`);
      }
    }
    if (o.length > 0 && i.push(`;
    npx:introduces ${o.join(", ")}`), this.template.labelPattern) {
      const l = this.generateLabel();
      i.push(`;
    rdfs:label "${l}"`);
    }
    return this.template.uri && i.push(`;
    nt:wasCreatedFromTemplate <${this.template.uri}>`), i.push(" ."), `sub:pubinfo {
${i.join(`
`)}
}`;
  }
  findPlaceholderValue(e) {
    for (const t of this.template.statements || []) {
      if (t.subject === e || t.subject === `sub:${e}`) {
        const n = this.formData[`${t.id}_subject`];
        if (n) return n;
        if (t.repeatable) for (let r = 1; r < 10; r++) {
          const i = this.formData[`${t.id}_subject_${r}`];
          if (i) return i;
        }
      }
      if (t.object === e || t.object === `sub:${e}`) {
        const n = this.formData[`${t.id}_object`];
        if (n) return n;
        if (t.repeatable) for (let r = 1; r < 10; r++) {
          const i = this.formData[`${t.id}_object_${r}`];
          if (i) return i;
        }
      }
    }
    return null;
  }
  generateLabel() {
    let e = this.template.labelPattern || "Untitled";
    const t = [...e.matchAll(/\$\{(\w+)\}/g)];
    for (const n of t) {
      const r = n[1], i = this.findPlaceholderValue(r);
      i ? e = e.replace(n[0], i) : e = e.replace(n[0], "");
    }
    return e.trim();
  }
}
let u;
const se = typeof TextDecoder < "u" ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }) : { decode: () => {
  throw Error("TextDecoder not available");
} };
typeof TextDecoder < "u" && se.decode();
let O = null;
function B() {
  return (O === null || O.byteLength === 0) && (O = new Uint8Array(u.memory.buffer)), O;
}
function R(s, e) {
  return s = s >>> 0, se.decode(B().subarray(s, s + e));
}
const k = new Array(128).fill(void 0);
k.push(void 0, null, true, false);
let z = k.length;
function g(s) {
  z === k.length && k.push(k.length + 1);
  const e = z;
  return z = k[e], k[e] = s, e;
}
function m(s) {
  return k[s];
}
function we(s) {
  s < 132 || (k[s] = z, z = s);
}
function C(s) {
  const e = m(s);
  return we(s), e;
}
let I = 0;
const V = typeof TextEncoder < "u" ? new TextEncoder("utf-8") : { encode: () => {
  throw Error("TextEncoder not available");
} }, ye = typeof V.encodeInto == "function" ? function(s, e) {
  return V.encodeInto(s, e);
} : function(s, e) {
  const t = V.encode(s);
  return e.set(t), { read: s.length, written: t.length };
};
function T(s, e, t) {
  if (t === void 0) {
    const l = V.encode(s), d = e(l.length, 1) >>> 0;
    return B().subarray(d, d + l.length).set(l), I = l.length, d;
  }
  let n = s.length, r = e(n, 1) >>> 0;
  const i = B();
  let o = 0;
  for (; o < n; o++) {
    const l = s.charCodeAt(o);
    if (l > 127) break;
    i[r + o] = l;
  }
  if (o !== n) {
    o !== 0 && (s = s.slice(o)), r = t(r, n, n = o + s.length * 3, 1) >>> 0;
    const l = B().subarray(r + o, r + n), d = ye(s, l);
    o += d.written, r = t(r, n, o, 1) >>> 0;
  }
  return I = o, r;
}
function F(s) {
  return s == null;
}
let A = null;
function w() {
  return (A === null || A.byteLength === 0) && (A = new Int32Array(u.memory.buffer)), A;
}
let M = null;
function xe() {
  return (M === null || M.byteLength === 0) && (M = new Float64Array(u.memory.buffer)), M;
}
function K(s) {
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
    let i = "[";
    r > 0 && (i += K(s[0]));
    for (let o = 1; o < r; o++) i += ", " + K(s[o]);
    return i += "]", i;
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
const Q = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((s) => {
  u.__wbindgen_export_2.get(s.dtor)(s.a, s.b);
});
function ve(s, e, t, n) {
  const r = { a: s, b: e, cnt: 1, dtor: t }, i = (...o) => {
    r.cnt++;
    const l = r.a;
    r.a = 0;
    try {
      return n(l, r.b, ...o);
    } finally {
      --r.cnt === 0 ? (u.__wbindgen_export_2.get(r.dtor)(l, r.b), Q.unregister(r)) : r.a = l;
    }
  };
  return i.original = r, Q.register(i, r, r), i;
}
function Ce(s, e, t) {
  u._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h15d348a8f539de58(s, e, g(t));
}
function v(s, e) {
  try {
    return s.apply(this, e);
  } catch (t) {
    u.__wbindgen_exn_store(g(t));
  }
}
function Ee(s, e, t, n) {
  u.wasm_bindgen__convert__closures__invoke2_mut__h2c289313db95095e(s, e, g(t), g(n));
}
function ee(s, e) {
  if (!(s instanceof e)) throw new Error(`expected instance of ${e.name}`);
  return s.ptr;
}
let H = 128;
function je(s) {
  if (H == 1) throw new Error("out of js stack");
  return k[--H] = s, H;
}
const $e = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((s) => u.__wbg_keypair_free(s >>> 0));
class Se {
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, $e.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    u.__wbg_keypair_free(e);
  }
  constructor() {
    try {
      const r = u.__wbindgen_add_to_stack_pointer(-16);
      u.keypair_new(r);
      var e = w()[r / 4 + 0], t = w()[r / 4 + 1], n = w()[r / 4 + 2];
      if (n) throw C(t);
      return this.__wbg_ptr = e >>> 0, this;
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toJs() {
    try {
      const r = u.__wbindgen_add_to_stack_pointer(-16);
      u.keypair_toJs(r, this.__wbg_ptr);
      var e = w()[r / 4 + 0], t = w()[r / 4 + 1], n = w()[r / 4 + 2];
      if (n) throw C(t);
      return C(e);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
const te = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((s) => u.__wbg_nanopub_free(s >>> 0));
class U {
  static __wrap(e) {
    e = e >>> 0;
    const t = Object.create(U.prototype);
    return t.__wbg_ptr = e, te.register(t, t.__wbg_ptr, t), t;
  }
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, te.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    u.__wbg_nanopub_free(e);
  }
  constructor(e) {
    try {
      const i = u.__wbindgen_add_to_stack_pointer(-16);
      u.nanopub_new(i, g(e));
      var t = w()[i / 4 + 0], n = w()[i / 4 + 1], r = w()[i / 4 + 2];
      if (r) throw C(n);
      return this.__wbg_ptr = t >>> 0, this;
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
  check() {
    try {
      const r = this.__destroy_into_raw(), i = u.__wbindgen_add_to_stack_pointer(-16);
      u.nanopub_check(i, r);
      var e = w()[i / 4 + 0], t = w()[i / 4 + 1], n = w()[i / 4 + 2];
      if (n) throw C(t);
      return U.__wrap(e);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
  sign(e) {
    try {
      const i = this.__destroy_into_raw(), o = u.__wbindgen_add_to_stack_pointer(-16);
      ee(e, J), u.nanopub_sign(o, i, e.__wbg_ptr);
      var t = w()[o / 4 + 0], n = w()[o / 4 + 1], r = w()[o / 4 + 2];
      if (r) throw C(n);
      return U.__wrap(t);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
  publish(e, t) {
    try {
      const i = this.__destroy_into_raw();
      var n = F(t) ? 0 : T(t, u.__wbindgen_malloc, u.__wbindgen_realloc), r = I;
      const o = u.nanopub_publish(i, je(e), n, r);
      return C(o);
    } finally {
      k[H++] = void 0;
    }
  }
  static fetch(e) {
    const t = T(e, u.__wbindgen_malloc, u.__wbindgen_realloc), n = I, r = u.nanopub_fetch(t, n);
    return C(r);
  }
  static publish_intro(e, t) {
    ee(e, J);
    const n = T(t, u.__wbindgen_malloc, u.__wbindgen_realloc), r = I, i = u.nanopub_publish_intro(e.__wbg_ptr, n, r);
    return C(i);
  }
  rdf() {
    let e, t;
    try {
      const a = u.__wbindgen_add_to_stack_pointer(-16);
      u.nanopub_rdf(a, this.__wbg_ptr);
      var n = w()[a / 4 + 0], r = w()[a / 4 + 1], i = w()[a / 4 + 2], o = w()[a / 4 + 3], l = n, d = r;
      if (o) throw l = 0, d = 0, C(i);
      return e = l, t = d, R(l, d);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16), u.__wbindgen_free(e, t, 1);
    }
  }
  info() {
    try {
      const r = u.__wbindgen_add_to_stack_pointer(-16);
      u.nanopub_info(r, this.__wbg_ptr);
      var e = w()[r / 4 + 0], t = w()[r / 4 + 1], n = w()[r / 4 + 2];
      if (n) throw C(t);
      return C(e);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toString() {
    let e, t;
    try {
      const i = u.__wbindgen_add_to_stack_pointer(-16);
      u.nanopub_toString(i, this.__wbg_ptr);
      var n = w()[i / 4 + 0], r = w()[i / 4 + 1];
      return e = n, t = r, R(n, r);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16), u.__wbindgen_free(e, t, 1);
    }
  }
}
const Le = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((s) => u.__wbg_npprofile_free(s >>> 0));
class J {
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, Le.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    u.__wbg_npprofile_free(e);
  }
  __getClassname() {
    let e, t;
    try {
      const i = u.__wbindgen_add_to_stack_pointer(-16);
      u.npprofile___getClassname(i, this.__wbg_ptr);
      var n = w()[i / 4 + 0], r = w()[i / 4 + 1];
      return e = n, t = r, R(n, r);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16), u.__wbindgen_free(e, t, 1);
    }
  }
  constructor(e, t, n, r) {
    try {
      const h = u.__wbindgen_add_to_stack_pointer(-16), y = T(e, u.__wbindgen_malloc, u.__wbindgen_realloc), _ = I;
      var i = F(t) ? 0 : T(t, u.__wbindgen_malloc, u.__wbindgen_realloc), o = I, l = F(n) ? 0 : T(n, u.__wbindgen_malloc, u.__wbindgen_realloc), d = I, a = F(r) ? 0 : T(r, u.__wbindgen_malloc, u.__wbindgen_realloc), b = I;
      u.npprofile_new(h, y, _, i, o, l, d, a, b);
      var p = w()[h / 4 + 0], c = w()[h / 4 + 1], f = w()[h / 4 + 2];
      if (f) throw C(c);
      return this.__wbg_ptr = p >>> 0, this;
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toString() {
    let e, t;
    try {
      const i = u.__wbindgen_add_to_stack_pointer(-16);
      u.npprofile_toString(i, this.__wbg_ptr);
      var n = w()[i / 4 + 0], r = w()[i / 4 + 1];
      return e = n, t = r, R(n, r);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16), u.__wbindgen_free(e, t, 1);
    }
  }
  toJs() {
    try {
      const r = u.__wbindgen_add_to_stack_pointer(-16);
      u.npprofile_toJs(r, this.__wbg_ptr);
      var e = w()[r / 4 + 0], t = w()[r / 4 + 1], n = w()[r / 4 + 2];
      if (n) throw C(t);
      return C(e);
    } finally {
      u.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
async function Pe(s, e) {
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
function Ie() {
  const s = {};
  return s.wbg = {}, s.wbg.__wbg_nanopub_new = function(e) {
    const t = U.__wrap(e);
    return g(t);
  }, s.wbg.__wbindgen_string_new = function(e, t) {
    const n = R(e, t);
    return g(n);
  }, s.wbg.__wbg_call_b3ca7c6051f9bec1 = function() {
    return v(function(e, t, n) {
      const r = m(e).call(m(t), m(n));
      return g(r);
    }, arguments);
  }, s.wbg.__wbindgen_object_drop_ref = function(e) {
    C(e);
  }, s.wbg.__wbg_abort_2aa7521d5690750e = function(e) {
    m(e).abort();
  }, s.wbg.__wbg_new_72fb9a18b5ae2624 = function() {
    const e = new Object();
    return g(e);
  }, s.wbg.__wbg_set_1f9b04f170055d33 = function() {
    return v(function(e, t, n) {
      return Reflect.set(m(e), m(t), m(n));
    }, arguments);
  }, s.wbg.__wbg_new_ab6fd82b10560829 = function() {
    return v(function() {
      const e = new Headers();
      return g(e);
    }, arguments);
  }, s.wbg.__wbindgen_object_clone_ref = function(e) {
    const t = m(e);
    return g(t);
  }, s.wbg.__wbg_new_0d76b0581eca6298 = function() {
    return v(function() {
      const e = new AbortController();
      return g(e);
    }, arguments);
  }, s.wbg.__wbg_signal_a61f78a3478fd9bc = function(e) {
    const t = m(e).signal;
    return g(t);
  }, s.wbg.__wbg_append_7bfcb4937d1d5e29 = function() {
    return v(function(e, t, n, r, i) {
      m(e).append(R(t, n), R(r, i));
    }, arguments);
  }, s.wbg.__wbg_instanceof_Response_849eb93e75734b6e = function(e) {
    let t;
    try {
      t = m(e) instanceof Response;
    } catch {
      t = false;
    }
    return t;
  }, s.wbg.__wbg_status_61a01141acd3cf74 = function(e) {
    return m(e).status;
  }, s.wbg.__wbg_url_5f6dc4009ac5f99d = function(e, t) {
    const n = m(t).url, r = T(n, u.__wbindgen_malloc, u.__wbindgen_realloc), i = I;
    w()[e / 4 + 1] = i, w()[e / 4 + 0] = r;
  }, s.wbg.__wbg_headers_9620bfada380764a = function(e) {
    const t = m(e).headers;
    return g(t);
  }, s.wbg.__wbg_iterator_2cee6dadfd956dfa = function() {
    return g(Symbol.iterator);
  }, s.wbg.__wbg_get_e3c254076557e348 = function() {
    return v(function(e, t) {
      const n = Reflect.get(m(e), m(t));
      return g(n);
    }, arguments);
  }, s.wbg.__wbindgen_is_function = function(e) {
    return typeof m(e) == "function";
  }, s.wbg.__wbg_call_27c0f87801dedf93 = function() {
    return v(function(e, t) {
      const n = m(e).call(m(t));
      return g(n);
    }, arguments);
  }, s.wbg.__wbindgen_is_object = function(e) {
    const t = m(e);
    return typeof t == "object" && t !== null;
  }, s.wbg.__wbg_next_40fc327bfc8770e6 = function(e) {
    const t = m(e).next;
    return g(t);
  }, s.wbg.__wbg_next_196c84450b364254 = function() {
    return v(function(e) {
      const t = m(e).next();
      return g(t);
    }, arguments);
  }, s.wbg.__wbg_done_298b57d23c0fc80c = function(e) {
    return m(e).done;
  }, s.wbg.__wbg_value_d93c65011f51a456 = function(e) {
    const t = m(e).value;
    return g(t);
  }, s.wbg.__wbg_stringify_8887fe74e1c50d81 = function() {
    return v(function(e) {
      const t = JSON.stringify(m(e));
      return g(t);
    }, arguments);
  }, s.wbg.__wbindgen_string_get = function(e, t) {
    const n = m(t), r = typeof n == "string" ? n : void 0;
    var i = F(r) ? 0 : T(r, u.__wbindgen_malloc, u.__wbindgen_realloc), o = I;
    w()[e / 4 + 1] = o, w()[e / 4 + 0] = i;
  }, s.wbg.__wbg_text_450a059667fd91fd = function() {
    return v(function(e) {
      const t = m(e).text();
      return g(t);
    }, arguments);
  }, s.wbg.__wbg_new0_7d84e5b2cd9fdc73 = function() {
    return g(/* @__PURE__ */ new Date());
  }, s.wbg.__wbg_getTime_2bc4375165f02d15 = function(e) {
    return m(e).getTime();
  }, s.wbg.__wbg_crypto_1d1f22824a6a080c = function(e) {
    const t = m(e).crypto;
    return g(t);
  }, s.wbg.__wbg_process_4a72847cc503995b = function(e) {
    const t = m(e).process;
    return g(t);
  }, s.wbg.__wbg_versions_f686565e586dd935 = function(e) {
    const t = m(e).versions;
    return g(t);
  }, s.wbg.__wbg_node_104a2ff8d6ea03a2 = function(e) {
    const t = m(e).node;
    return g(t);
  }, s.wbg.__wbindgen_is_string = function(e) {
    return typeof m(e) == "string";
  }, s.wbg.__wbg_require_cca90b1a94a0255b = function() {
    return v(function() {
      const e = module.require;
      return g(e);
    }, arguments);
  }, s.wbg.__wbg_msCrypto_eb05e62b530a1508 = function(e) {
    const t = m(e).msCrypto;
    return g(t);
  }, s.wbg.__wbg_newwithlength_e9b4878cebadb3d3 = function(e) {
    const t = new Uint8Array(e >>> 0);
    return g(t);
  }, s.wbg.__wbindgen_memory = function() {
    const e = u.memory;
    return g(e);
  }, s.wbg.__wbg_buffer_12d079cc21e14bdb = function(e) {
    const t = m(e).buffer;
    return g(t);
  }, s.wbg.__wbg_newwithbyteoffsetandlength_aa4a17c33a06e5cb = function(e, t, n) {
    const r = new Uint8Array(m(e), t >>> 0, n >>> 0);
    return g(r);
  }, s.wbg.__wbg_randomFillSync_5c9c955aa56b6049 = function() {
    return v(function(e, t) {
      m(e).randomFillSync(C(t));
    }, arguments);
  }, s.wbg.__wbg_subarray_a1f73cd4b5b42fe1 = function(e, t, n) {
    const r = m(e).subarray(t >>> 0, n >>> 0);
    return g(r);
  }, s.wbg.__wbg_getRandomValues_3aa56aa6edec874c = function() {
    return v(function(e, t) {
      m(e).getRandomValues(m(t));
    }, arguments);
  }, s.wbg.__wbg_new_63b92bc8671ed464 = function(e) {
    const t = new Uint8Array(m(e));
    return g(t);
  }, s.wbg.__wbg_set_a47bac70306a19a7 = function(e, t, n) {
    m(e).set(m(t), n >>> 0);
  }, s.wbg.__wbg_self_ce0dbfc45cf2f5be = function() {
    return v(function() {
      const e = self.self;
      return g(e);
    }, arguments);
  }, s.wbg.__wbg_window_c6fb939a7f436783 = function() {
    return v(function() {
      const e = window.window;
      return g(e);
    }, arguments);
  }, s.wbg.__wbg_globalThis_d1e6af4856ba331b = function() {
    return v(function() {
      const e = globalThis.globalThis;
      return g(e);
    }, arguments);
  }, s.wbg.__wbg_global_207b558942527489 = function() {
    return v(function() {
      const e = global.global;
      return g(e);
    }, arguments);
  }, s.wbg.__wbindgen_is_undefined = function(e) {
    return m(e) === void 0;
  }, s.wbg.__wbg_newnoargs_e258087cd0daa0ea = function(e, t) {
    const n = new Function(R(e, t));
    return g(n);
  }, s.wbg.__wbg_new_16b304a2cfa7ff4a = function() {
    const e = new Array();
    return g(e);
  }, s.wbg.__wbg_apply_0a5aa603881e6d79 = function() {
    return v(function(e, t, n) {
      const r = Reflect.apply(m(e), m(t), m(n));
      return g(r);
    }, arguments);
  }, s.wbg.__wbindgen_number_get = function(e, t) {
    const n = m(t), r = typeof n == "number" ? n : void 0;
    xe()[e / 8 + 1] = F(r) ? 0 : r, w()[e / 4 + 0] = !F(r);
  }, s.wbg.__wbg_new_81740750da40724f = function(e, t) {
    try {
      var n = { a: e, b: t }, r = (o, l) => {
        const d = n.a;
        n.a = 0;
        try {
          return Ee(d, n.b, o, l);
        } finally {
          n.a = d;
        }
      };
      const i = new Promise(r);
      return g(i);
    } finally {
      n.a = n.b = 0;
    }
  }, s.wbg.__wbg_set_f975102236d3c502 = function(e, t, n) {
    m(e)[C(t)] = C(n);
  }, s.wbg.__wbindgen_cb_drop = function(e) {
    const t = C(e).original;
    return t.cnt-- == 1 ? (t.a = 0, true) : false;
  }, s.wbg.__wbg_has_0af94d20077affa2 = function() {
    return v(function(e, t) {
      return Reflect.has(m(e), m(t));
    }, arguments);
  }, s.wbg.__wbg_fetch_eadcbc7351113537 = function(e) {
    const t = fetch(m(e));
    return g(t);
  }, s.wbg.__wbg_fetch_921fad6ef9e883dd = function(e, t) {
    const n = m(e).fetch(m(t));
    return g(n);
  }, s.wbg.__wbindgen_debug_string = function(e, t) {
    const n = K(m(t)), r = T(n, u.__wbindgen_malloc, u.__wbindgen_realloc), i = I;
    w()[e / 4 + 1] = i, w()[e / 4 + 0] = r;
  }, s.wbg.__wbindgen_throw = function(e, t) {
    throw new Error(R(e, t));
  }, s.wbg.__wbg_then_0c86a60e8fcfe9f6 = function(e, t) {
    const n = m(e).then(m(t));
    return g(n);
  }, s.wbg.__wbg_queueMicrotask_481971b0d87f3dd4 = function(e) {
    queueMicrotask(m(e));
  }, s.wbg.__wbg_then_a73caa9a87991566 = function(e, t, n) {
    const r = m(e).then(m(t), m(n));
    return g(r);
  }, s.wbg.__wbg_queueMicrotask_3cbae2ec6b6cd3d6 = function(e) {
    const t = m(e).queueMicrotask;
    return g(t);
  }, s.wbg.__wbg_resolve_b0083a7967828ec8 = function(e) {
    const t = Promise.resolve(m(e));
    return g(t);
  }, s.wbg.__wbg_newwithstrandinit_3fd6fba4083ff2d0 = function() {
    return v(function(e, t, n) {
      const r = new Request(R(e, t), m(n));
      return g(r);
    }, arguments);
  }, s.wbg.__wbindgen_closure_wrapper3118 = function(e, t, n) {
    const r = ve(e, t, 173, Ce);
    return g(r);
  }, s;
}
function ke(s, e) {
  return u = s.exports, ie.__wbindgen_wasm_module = e, M = null, A = null, O = null, u.__wbindgen_start(), u;
}
async function ie(s) {
  if (u !== void 0) return u;
  typeof s > "u" && (s = new URL("/nanopub-create/assets/web_bg-CaMmR8bt.wasm", import.meta.url));
  const e = Ie();
  (typeof s == "string" || typeof Request == "function" && s instanceof Request || typeof URL == "function" && s instanceof URL) && (s = fetch(s));
  const { instance: t, module: n } = await Pe(await s, e);
  return ke(t, n);
}
class Re {
  constructor(e = {}) {
    this.options = { publishServer: e.publishServer || "https://np.petapico.org", theme: e.theme || "default", validateOnChange: e.validateOnChange !== false, showHelp: e.showHelp !== false, ...e }, this.storage = new ne(e.storage), this.template = null, this.formGenerator = null, this.builder = null, this.formData = {}, this.container = null, this.wasmInitialized = false, this.profile = null, this.credentials = null, this.listeners = { change: [], submit: [], error: [], publish: [], profileNeeded: [] }, this.initWasm(), this.loadCredentials();
  }
  async initWasm() {
    if (!this.wasmInitialized) try {
      await ie(), this.wasmInitialized = true, console.log("\u2713 WASM initialized successfully");
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
      const t = new Se().toJs();
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
      this.template = await X.fetchAndParse(e), this.template.uri = this.template.uri || e, this.formGenerator = new ge(this.template, { validateOnChange: this.options.validateOnChange, showHelp: this.options.showHelp, labels: this.template.labels }), this.formGenerator.on("change", (n) => {
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
      }), this.formGenerator.renderForm(t), this.builder = new _e(this.template);
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
      const r = new J(this.credentials.privateKey, t, n);
      console.log("\u2705 Profile created"), console.log("\u{1F4DD} Signing nanopub...");
      const o = new U(e).sign(r);
      console.log("\u2705 Signed successfully"), console.log("  Signed type:", typeof o);
      const l = o.rdf();
      if (!this.options.publishServer) return console.log("\u{1F4E5} Download-only mode (no publish server configured)"), this.emit("publish", { uri: null, signedContent: l, downloadOnly: true }), { signedContent: l, downloadOnly: true };
      console.log("\u{1F4E4} Publishing to network..."), console.log("   Server:", this.options.publishServer);
      const d = await o.publish(r, this.options.publishServer);
      console.log("\u2705 Published successfully!"), console.log("\u{1F310} Result:", d);
      const a = typeof d == "string" ? d : d.uri || d.nanopub_uri;
      return this.emit("publish", { uri: a, signedContent: l }), { uri: a, nanopub_uri: a, signedContent: l };
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
let L = null, D = null;
function Te() {
  document.body.classList.toggle("dark-mode"), document.getElementById("template-container").classList.toggle("dark");
}
window.toggleDarkMode = Te;
async function Ne() {
  try {
    L = new Re({ publishServer: null }), console.log("\u2713 Creator initialized successfully"), Fe(), oe();
  } catch (s) {
    console.error("Failed to initialize creator:", s), alert("Failed to initialize creator: " + s.message);
  }
}
function Fe() {
  L.on("submit", ({ trigContent: s }) => {
    D = s, document.getElementById("preview-content").textContent = s, document.getElementById("nanopub-preview").style.display = "block", document.getElementById("nanopub-preview").scrollIntoView({ behavior: "smooth" }), document.getElementById("result-message").innerHTML = "";
  }), L.on("publish", ({ signedContent: s }) => {
    const e = new Blob([s], { type: "application/trig" }), t = URL.createObjectURL(e), n = document.createElement("a");
    n.href = t, n.download = `nanopub-signed-${(/* @__PURE__ */ new Date()).toISOString()}.trig`, document.body.appendChild(n), n.click(), document.body.removeChild(n), URL.revokeObjectURL(t), document.getElementById("result-message").innerHTML = '<div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; border: 1px solid #c3e6cb;">\u2705 Signed and downloaded!</div>';
  }), L.on("error", ({ error: s }) => {
    document.getElementById("result-message").innerHTML = `<div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; border: 1px solid #f5c6cb;">\u274C Error: ${s.message}</div>`;
  }), L.on("profileNeeded", () => {
    alert("Please set up your profile first!");
  });
}
function oe() {
  const s = L && L.profile, e = document.getElementById("profile-status"), t = document.getElementById("profile-setup"), n = document.getElementById("profile-info");
  s ? (e.textContent = "Configured", e.className = "status success", t.classList.add("hidden"), n.classList.remove("hidden"), document.getElementById("profile-name").textContent = L.profile.name, document.getElementById("profile-orcid").textContent = L.profile.orcid || "N/A", document.getElementById("profile-orcid").href = L.profile.orcid || "#") : (e.textContent = "Not configured", e.className = "status warning", t.classList.remove("hidden"), n.classList.add("hidden"));
}
document.getElementById("setup-btn").addEventListener("click", async () => {
  const s = document.getElementById("name-input").value.trim(), e = document.getElementById("orcid-input").value.trim();
  if (!s) {
    alert("Please enter your name");
    return;
  }
  try {
    await L.setupProfile({ name: s, orcid: e }), oe(), document.getElementById("setup-message").innerHTML = '<div style="color: #155724; background: #d4edda; padding: 10px; border-radius: 4px; margin-top: 10px;">Profile created successfully!</div>';
  } catch (t) {
    alert("Failed to setup profile: " + t.message);
  }
});
document.getElementById("load-template-btn").addEventListener("click", async () => {
  const s = document.getElementById("template-uri").value.trim();
  if (!s) {
    alert("Please enter a template URI");
    return;
  }
  try {
    const e = document.getElementById("template-container");
    e.innerHTML = '<div class="loading">Loading template...</div>', document.body.classList.contains("dark-mode") && e.classList.add("dark"), await L.renderFromTemplateUri(s, e), document.getElementById("nanopub-preview").style.display = "none";
  } catch (e) {
    document.getElementById("template-container").innerHTML = '<div style="color: #721c24; background: #f8d7da; padding: 15px; border-radius: 4px;">Error: ' + e.message + "</div>";
  }
});
document.getElementById("sign-download-btn").addEventListener("click", async () => {
  if (D) try {
    document.getElementById("sign-download-btn").disabled = true, document.getElementById("sign-download-btn").textContent = "\u{1F510} Signing...", await L.publish(D), document.getElementById("sign-download-btn").disabled = false, document.getElementById("sign-download-btn").textContent = "\u{1F510} Sign & Download";
  } catch {
    document.getElementById("sign-download-btn").disabled = false, document.getElementById("sign-download-btn").textContent = "\u{1F510} Sign & Download";
  }
});
document.getElementById("copy-btn").addEventListener("click", () => {
  D && navigator.clipboard.writeText(D).then(() => {
    const s = document.getElementById("copy-btn");
    s.textContent = "\u2713 Copied!", setTimeout(() => s.textContent = "\u{1F4CB} Copy", 2e3);
  });
});
Ne();
