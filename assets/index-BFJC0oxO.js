(function() {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload")) return;
  for (const r of document.querySelectorAll('link[rel="modulepreload"]')) n(r);
  new MutationObserver((r) => {
    for (const s of r) if (s.type === "childList") for (const i of s.addedNodes) i.tagName === "LINK" && i.rel === "modulepreload" && n(i);
  }).observe(document, { childList: true, subtree: true });
  function t(r) {
    const s = {};
    return r.integrity && (s.integrity = r.integrity), r.referrerPolicy && (s.referrerPolicy = r.referrerPolicy), r.crossOrigin === "use-credentials" ? s.credentials = "include" : r.crossOrigin === "anonymous" ? s.credentials = "omit" : s.credentials = "same-origin", s;
  }
  function n(r) {
    if (r.ep) return;
    r.ep = true;
    const s = t(r);
    fetch(r.href, s);
  }
})();
class H {
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
    const s = this.content.match(/nt:hasNanopubLabelPattern\s+"([^"]+)"/);
    s ? (this.template.labelPattern = s[1], console.log(`\u2705 Found label pattern: "${s[1]}"`)) : console.warn("\u26A0\uFE0F No nt:hasNanopubLabelPattern found in template");
    const i = this.content.match(/nt:hasTag\s+"([^"]+)"/);
    i && (this.template.tags = [i[1]]);
    const c = this.content.match(/nt:hasTargetNanopubType\s+(.+?)\s*[;.](?:\s|$)/s);
    if (c) {
      const a = c[1], d = /<([^>]+)>/g, m = [];
      let u;
      for (; (u = d.exec(a)) !== null; ) m.push(u[1]);
      this.template.types = m, console.log(`\u2705 Found ${m.length} target nanopub types:`, m);
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
      const n = t[1], r = t[2].trim(), s = t.index;
      let i = this.content.length;
      const a = this.content.substring(s).substring(1).search(/\n\s*(?:sub:[\w-]+\s+a\s+nt:|})/);
      a > 0 && (i = s + a + 1);
      const d = this.content.substring(s, i);
      console.log(`
--- Parsing ${n} ---`), console.log(`Block length: ${d.length} chars`), console.log(`Block preview: ${d.substring(0, 200)}...`);
      const m = r.split(",").map((h) => h.trim()), u = m[0].replace(/^nt:/, ""), p = { id: this.cleanUri(n), type: u, isLocalResource: m.some((h) => h.includes("LocalResource")), label: this.extractLabel(d), description: this.extractDescription(d), validation: this.extractValidation(d), possibleValuesFrom: null, possibleValuesFromApi: null, options: [] };
      if (u.includes("RestrictedChoice")) {
        const h = d.match(/nt:possibleValuesFrom\s+(?:<([^>]+)>|([\w-]+:[\w-]+))/);
        if (h) {
          const x = h[1] || h[2];
          if (x && x.includes(":") && !x.startsWith("http")) {
            const [C, N] = x.split(":"), k = this.content.match(new RegExp(`@prefix ${C}:\\s+<([^>]+)>`));
            k ? p.possibleValuesFrom = k[1] + N : p.possibleValuesFrom = x;
          } else p.possibleValuesFrom = x;
          console.log(`  \u2192 Will fetch options from: ${p.possibleValuesFrom}`);
        }
        const _ = d.match(/nt:possibleValue\s+([\s\S]+?)(?:\s+\.(?:\s|$))/);
        if (_) {
          const x = _[1];
          console.log(`  \u2192 Raw value text: ${x.substring(0, 100)}...`);
          const C = [], N = /<([^>]+)>|([\w-]+:[\w-]+)/g;
          let k;
          for (; (k = N.exec(x)) !== null; ) C.push(k[1] || k[2]);
          C.length > 0 ? (p.options = C.map((L) => {
            let I = this.template.labels[L];
            return I || (L.startsWith("http") ? (I = L.replace(/^https?:\/\//, "").replace(/\/$/, ""), I = I.charAt(0).toUpperCase() + I.slice(1)) : L.includes(":") ? I = L.split(":")[1] : I = L), { value: L, label: I };
          }), console.log(`  \u2192 Found ${p.options.length} inline options:`, p.options.map((L) => L.label))) : console.warn("  \u2192 No values found in possibleValue text");
        }
      }
      if (u.includes("GuidedChoice")) {
        const h = d.match(/nt:possibleValuesFromApi\s+"([^"]+)"/);
        h && (p.possibleValuesFromApi = h[1]);
      }
      console.log(`Found placeholder: ${p.id} (${p.type})`), this.template.placeholders.push(p);
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
      let s = "";
      const i = r.match(/@prefix sub:\s+<([^>]+)>/);
      i && (s = i[1]);
      const c = /<([^>]+)>\s+rdfs:label\s+"([^"]+)"/g, a = /(sub:[\w-]+)\s+rdfs:label\s+"([^"]+)"/g;
      e.options = [];
      let d = 0;
      for (const m of r.matchAll(c)) {
        d++;
        const u = m[1], p = m[2];
        console.log(`  \u2192 Match ${d} (full URI): URI=${u}, Label="${p}"`), u.includes("#assertion") || u.includes("#Head") || u.includes("#provenance") || u.includes("#pubinfo") || u.includes("ntemplate") || u.includes("rdf-syntax") || u.includes("XMLSchema") || u.includes("rdfs#") || u.includes("dc/terms") || u.includes("foaf/0.1") || u.includes("nanopub/x/") || u.includes("nanopub.org/nschema") || p.includes("Template:") || p.includes("Making a statement") || p.includes("is a") || p.includes("has type") || e.options.push({ value: u, label: p });
      }
      for (const m of r.matchAll(a)) {
        d++;
        const u = m[1], p = m[2], h = u.replace("sub:", ""), _ = s + h;
        console.log(`  \u2192 Match ${d} (prefixed): ${u} -> ${_}, Label="${p}"`), e.options.push({ value: _, label: p });
      }
      console.log(`  \u2192 Loaded ${e.options.length} options for ${e.id}`), e.options.length > 0 && console.log("  \u2192 First 3 options:", e.options.slice(0, 3).map((m) => m.label));
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
      const n = t[1], r = t[2].split(",").map((s) => s.trim().replace(/^sub:/, ""));
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
    const s = r[1], i = s.match(/rdf:subject\s+(<[^>]+>|[\w:-]+)/), c = s.match(/rdf:predicate\s+(<[^>]+>|[\w:-]+)/), a = s.match(/rdf:object\s+(?:<([^>]+)>|([\w:-]+)|"([^"]+)")/);
    if (!i || !c || !a) return console.warn(`Incomplete statement ${e}:`, { subjMatch: !!i, predMatch: !!c, objMatch: !!a }), null;
    let d;
    a[1] ? d = a[1] : a[2] ? d = a[2] : a[3] && (d = a[3]);
    const u = r[0].match(/a\s+([^;.]+)/), p = u ? u[1].split(",").map((h) => h.trim()) : [];
    return { id: this.cleanUri(e), subject: this.cleanUri(i[1]), predicate: this.cleanUri(c[1]), object: d, isLiteralObject: !!a[3], repeatable: p.some((h) => h.includes("RepeatableStatement")), optional: p.some((h) => h.includes("OptionalStatement")), grouped: p.some((h) => h.includes("GroupedStatement")), types: p };
  }
  cleanUri(e) {
    return e && e.replace(/^<|>$/g, "").replace(/^"|"$/g, "").replace(/^sub:/, "").trim();
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
    const s = e.match(/nt:hasMaxLength\s+"?(\d+)"?/);
    return s && (t.maxLength = parseInt(s[1])), Object.keys(t).length > 0 ? t : void 0;
  }
  static async fetchAndParse(e) {
    let t = e;
    (e.startsWith("http://purl.org/np/") || e.startsWith("https://w3id.org/np/")) && (t = `https://np.petapico.org/${e.split("/").pop()}.trig`), console.log(`Fetching template from ${t}`);
    const n = await fetch(t);
    if (!n.ok) throw new Error(`HTTP ${n.status}: ${n.statusText}`);
    const r = await n.text();
    return await new H(r).parse();
  }
}
const Z = { LiteralPlaceholder: (o) => {
  var _a;
  const e = document.createElement("input");
  return e.type = "text", e.className = "form-input", e.placeholder = o.label || "", ((_a = o.validation) == null ? void 0 : _a.regex) && (e.pattern = o.validation.regex), e;
}, LongLiteralPlaceholder: (o) => {
  const e = document.createElement("textarea");
  return e.className = "form-input", e.rows = 5, e.placeholder = o.label || "", e;
}, ExternalUriPlaceholder: (o) => {
  const e = document.createElement("input");
  return e.type = "url", e.className = "form-input", e.placeholder = o.label || "https://...", e;
}, UriPlaceholder: (o) => {
  const e = document.createElement("input");
  return e.type = "url", e.className = "form-input", e.placeholder = o.label || "https://...", e;
}, TrustyUriPlaceholder: (o) => {
  const e = document.createElement("input");
  return e.type = "url", e.className = "form-input", e.placeholder = o.label || "https://...", e;
}, RestrictedChoicePlaceholder: (o) => {
  var _a;
  const e = document.createElement("select");
  if (e.className = "form-select", o.options && o.options.length > 1) {
    const t = document.createElement("option");
    t.value = "", t.textContent = "Select...", e.appendChild(t);
  }
  return console.log(`[RestrictedChoice] Rendering ${o.id} with ${((_a = o.options) == null ? void 0 : _a.length) || 0} options`), o.options && Array.isArray(o.options) ? o.options.forEach((t, n) => {
    const r = document.createElement("option");
    r.value = t.value || t, r.textContent = t.label || t.value || t, o.options.length === 1 && (r.selected = true), e.appendChild(r);
  }) : console.warn(`[RestrictedChoice] No options found for ${o.id}`), e;
}, GuidedChoicePlaceholder: (o) => {
  const e = document.createElement("input");
  return e.type = "text", e.className = "form-input", e.placeholder = o.label || "Type to search...", e.setAttribute("data-guided-choice", "true"), e;
}, IntroducedResource: (o) => {
  const e = document.createElement("input");
  return e.type = "text", e.className = "form-input", e.placeholder = o.label || "", e;
}, LocalResource: (o) => null, IntroducedResource: (o) => null, ValuePlaceholder: (o) => {
  const e = document.createElement("input");
  return e.type = "text", e.className = "form-input", e.placeholder = o.label || "Enter value", e;
}, AutoEscapeUriPlaceholder: (o) => {
  const e = document.createElement("input");
  return e.type = "text", e.className = "form-input", e.placeholder = o.label || "", e;
}, AgentPlaceholder: (o) => {
  const e = document.createElement("input");
  return e.type = "url", e.className = "form-input", e.placeholder = o.label || "https://orcid.org/...", e;
} };
class Q {
  constructor(e, t = {}) {
    this.template = e, this.options = { validateOnChange: true, showHelp: true, ...t }, this.labels = t.labels || e.labels || {}, this.formData = {}, this.eventListeners = { change: [], submit: [], preview: [] }, this.formElement = null;
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
      const s = { dct: "http://purl.org/dc/terms/", foaf: "http://xmlns.com/foaf/0.1/", prov: "http://www.w3.org/ns/prov#", rdfs: "http://www.w3.org/2000/01/rdf-schema#", schema: "https://schema.org/", rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#" };
      if (s[n]) return s[n] + r;
    }
    return e;
  }
  parseUriLabel(e) {
    if (!e) return "";
    const t = { "dct:": "DC Terms: ", "foaf:": "FOAF: ", "prov:": "Provenance: ", "rdfs:": "RDFS: ", "schema:": "Schema: " };
    for (const [s, i] of Object.entries(t)) if (e.startsWith(s)) return e.substring(s.length).replace(/([a-z])([A-Z])/g, "$1 $2").split(/[-_]/).map((a) => a.charAt(0).toUpperCase() + a.slice(1).toLowerCase()).join(" ");
    const n = e.split(/[#\/]/);
    let r = n[n.length - 1] || "";
    return !r && n.length > 1 && (r = n[n.length - 2]), r = r.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^(has|is)\s+/i, "").trim().split(" ").map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(" "), r || e;
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
      const s = document.createElement("p");
      s.className = "form-description", s.textContent = this.template.description, t.appendChild(s);
    }
    this.formElement.appendChild(t);
    const r = document.createElement("div");
    return r.className = "form-fields", this.renderFields(r), this.formElement.appendChild(r), this.formElement.appendChild(this.buildControls()), typeof e == "string" && (e = document.querySelector(e)), e && (e.innerHTML = "", e.appendChild(this.formElement), this.setupEventListeners()), this.formElement;
  }
  renderFields(e) {
    const t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set();
    console.log("[renderFields] Processing statements...");
    let r = null, s = null;
    this.template.statements.forEach((i, c) => {
      const a = this.template.groupedStatements.find((p) => p.statements.includes(i.id));
      if (console.log(`  ${i.id}: parentGroup=${a == null ? void 0 : a.id}, processed=${t.has(a == null ? void 0 : a.id)}, subject=${i.subject}`), a && t.has(a.id)) {
        console.log("    \u2192 Skipping (group already processed)");
        return;
      }
      const d = this.findPlaceholder(i.subject), m = this.findPlaceholder(i.object), u = this.findPlaceholder(i.predicate);
      if (!d && !m && !u) {
        console.log("    \u2192 Skipping (all fixed - auto-filled statement)");
        return;
      }
      if (d && (d.type.includes("ExternalUriPlaceholder") || d.type.includes("UriPlaceholder")) && !u && !m) {
        console.log("    \u2192 Skipping (URI placeholder metadata statement)");
        return;
      }
      if (i.subject !== s) {
        if (r && (e.appendChild(r), r = null), this.template.statements.filter((h) => h.subject === i.subject).length > 1) {
          r = document.createElement("div"), r.className = "subject-group", r.style.cssText = "margin: 1.5rem 0; padding: 1.5rem; border: 2px solid #be2e78; border-radius: 8px; background: #f6d7e8; box-shadow: 0 1px 3px rgba(190, 46, 120, 0.1);";
          const h = this.findPlaceholder(i.subject);
          if (h && !n.has(h.id)) {
            const _ = document.createElement("div");
            _.className = "form-field subject-field";
            const x = document.createElement("label");
            x.className = "field-label subject-label", x.style.cssText = "font-weight: 600; font-size: 1.15em; color: #2b3456; margin-bottom: 0.75rem; display: block;", x.textContent = h.label || this.getLabel(i.subject), _.appendChild(x);
            const C = this.renderInput(h);
            if (C !== null) C.name = `${i.id}_subject`, C.id = `field_${i.id}_subject`, _.appendChild(C);
            else {
              const N = document.createElement("div");
              N.className = "field-value auto-generated", N.textContent = "(auto-generated)", _.appendChild(N);
            }
            r.appendChild(_), n.add(h.id);
          }
        }
        s = i.subject;
      }
      if (a) {
        console.log(`    \u2192 Rendering grouped statement ${a.id}`);
        const p = r || e;
        this.renderGroupedStatement(p, a, i, n), t.add(a.id);
      } else {
        console.log("    \u2192 Rendering individual statement");
        const p = r || e;
        this.renderStatement(p, i, n);
      }
    }), r && e.appendChild(r);
  }
  renderGroupedStatement(e, t, n, r = /* @__PURE__ */ new Set()) {
    const s = document.createElement("div");
    s.className = "form-field-group", n.repeatable && s.classList.add("repeatable-group"), n.optional && s.classList.add("optional-group");
    const i = t.statements.map((a) => this.template.statements.find((d) => d.id === a)).filter((a) => a), c = i[0];
    if (c) {
      const a = this.findPlaceholder(c.subject);
      if (a && !r.has(a.id)) {
        const d = document.createElement("div");
        d.className = "form-field";
        const m = document.createElement("label");
        m.className = "field-label", m.textContent = a.label || this.getLabel(c.subject), d.appendChild(m);
        const u = this.renderInput(a);
        u.name = `${c.id}_subject`, u.id = `field_${c.id}_subject`, d.appendChild(u), s.appendChild(d), r.add(a.id);
      }
    }
    i.forEach((a) => {
      this.renderStatementInGroup(s, a, r);
    }), n.repeatable && s.appendChild(this.buildRepeatableControls(n, null)), e.appendChild(s);
  }
  renderStatementInGroup(e, t, n = /* @__PURE__ */ new Set()) {
    console.log(`[renderStatementInGroup] ${t.id}:`, { predicate: t.predicate, object: t.object, isLiteralObject: t.isLiteralObject });
    const r = this.findPlaceholder(t.object), s = this.findPlaceholder(t.predicate);
    console.log("  objectPlaceholder:", r == null ? void 0 : r.id), console.log("  predicatePlaceholder:", s == null ? void 0 : s.id);
    const i = s && !n.has(s.id), c = r && !n.has(r.id);
    if (s && r && !i && !c) {
      console.log("  \u2192 SKIP (both placeholders already rendered)");
      return;
    }
    const a = this.getLabel(t.predicate);
    if (!r && !s) {
      console.log(`  \u2192 READONLY path: ${a} = ${t.object}`);
      const u = document.createElement("div");
      u.className = "form-field readonly-field";
      const p = document.createElement("label");
      p.className = "field-label", p.textContent = a;
      const h = document.createElement("div");
      h.className = "field-value", h.textContent = t.object, u.appendChild(p), u.appendChild(h), e.appendChild(u);
      return;
    }
    if (r && !c && !s) {
      console.log("  \u2192 SKIP (object placeholder already rendered)");
      return;
    }
    console.log("  \u2192 INPUT path");
    const d = document.createElement("div");
    d.className = "form-field", t.optional && d.classList.add("optional");
    const m = document.createElement("label");
    if (m.className = "field-label", m.textContent = a, d.appendChild(m), i) {
      const u = this.renderInput(s);
      u.name = `${t.id}_predicate`, u.id = `field_${t.id}_predicate`, d.appendChild(u), n.add(s.id);
    }
    if (c) {
      if (r.label) {
        const p = document.createElement("div");
        p.className = "field-help", p.textContent = r.label, d.appendChild(p);
      }
      const u = this.renderInput(r);
      u.name = t.id, u.id = `field_${t.id}`, d.appendChild(u), n.add(r.id);
    } else if (!r) {
      const u = document.createElement("div");
      u.className = "field-value", u.textContent = this.getLabel(t.object) || t.object, d.appendChild(u);
    }
    if (t.optional) {
      const u = document.createElement("span");
      u.className = "optional-badge", u.textContent = "optional", m.appendChild(u);
    }
    e.appendChild(d);
  }
  renderStatement(e, t, n = /* @__PURE__ */ new Set()) {
    const r = this.findPlaceholder(t.subject), s = this.findPlaceholder(t.predicate), i = this.findPlaceholder(t.object), c = this.getLabel(t.predicate), a = r && !n.has(r.id), d = s && !n.has(s.id), m = i && !n.has(i.id);
    if (!a && !d && !m && (s || i)) return;
    if (!s && !i && !a) {
      const p = document.createElement("div");
      p.className = "form-field readonly-field";
      const h = document.createElement("label");
      h.className = "field-label", h.textContent = c;
      const _ = document.createElement("div");
      _.className = "field-value", _.textContent = this.getLabel(t.object) || t.object, p.appendChild(h), p.appendChild(_), e.appendChild(p);
      return;
    }
    const u = document.createElement("div");
    if (u.className = "form-field", t.repeatable && u.classList.add("repeatable"), t.optional && u.classList.add("optional"), a) {
      const p = document.createElement("label");
      p.className = "field-label", p.textContent = r.label || this.getLabel(t.subject), u.appendChild(p);
      const h = this.renderInput(r);
      if (h !== null) h.name = `${t.id}_subject`, h.id = `field_${t.id}_subject`, t.optional || (h.required = true), u.appendChild(h);
      else {
        const _ = document.createElement("div");
        _.className = "field-value auto-generated", _.textContent = "(auto-generated)", u.appendChild(_);
      }
      n.add(r.id);
    }
    if (d) {
      const p = document.createElement("label");
      p.className = "field-label", p.textContent = s.label || c, u.appendChild(p);
      const h = this.renderInput(s);
      h.name = `${t.id}_predicate`, h.id = `field_${t.id}_predicate`, t.optional || (h.required = true), u.appendChild(h), n.add(s.id);
    } else if (!s) {
      const p = document.createElement("label");
      if (p.className = "field-label", p.textContent = c, t.optional) {
        const h = document.createElement("span");
        h.className = "optional-badge", h.textContent = "optional", p.appendChild(h);
      }
      u.appendChild(p);
    }
    if (m) {
      const p = this.renderInput(i);
      if (p === null) {
        const h = document.createElement("div");
        h.className = "field-value auto-generated", h.textContent = i.label || t.object, u.appendChild(h);
      } else {
        if (i.label) {
          const h = document.createElement("div");
          h.className = "field-help", h.textContent = i.label, u.appendChild(h);
        }
        p.name = `${t.id}_object`, p.id = `field_${t.id}_object`, t.optional || (p.required = true), u.appendChild(p);
      }
      n.add(i.id);
    } else if (!i) {
      const p = document.createElement("div");
      p.className = "field-value", p.textContent = this.getLabel(t.object) || t.object, u.appendChild(p);
    }
    e.appendChild(u), t.repeatable && e.appendChild(this.buildRepeatableControls(t, null));
  }
  renderInput(e) {
    const t = e.type.split(",").map((r) => r.trim().replace(/^nt:/, ""));
    for (const r of t) {
      const s = Z[r];
      if (s) return console.log(`Using component ${r} for placeholder ${e.id}`), s(e, this.options);
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
      const s = parseInt(n.dataset.count);
      n.dataset.count = s + 1;
      const i = this.buildRepeatableField(e, t, s);
      n.parentElement.insertBefore(i, n), this.emit("change", this.collectFormData());
    }, n.appendChild(r), n;
  }
  buildRepeatableField(e, t, n) {
    const r = document.createElement("div");
    r.className = "repeatable-field-group";
    const s = this.findPlaceholder(e.subject), i = this.findPlaceholder(e.predicate), c = this.findPlaceholder(e.object);
    if (s) {
      const d = document.createElement("div");
      d.className = "repeatable-field";
      const m = this.renderInput(s);
      m.name = `${e.id}_subject_${n}`, m.id = `field_${e.id}_subject_${n}`, d.appendChild(m), r.appendChild(d);
    }
    if (i) {
      const d = document.createElement("div");
      d.className = "repeatable-field";
      const m = this.renderInput(i);
      m.name = `${e.id}_predicate_${n}`, m.id = `field_${e.id}_predicate_${n}`, d.appendChild(m), r.appendChild(d);
    }
    if (c) {
      const d = document.createElement("div");
      d.className = "repeatable-field";
      const m = this.renderInput(c);
      m.name = `${e.id}_object_${n}`, m.id = `field_${e.id}_object_${n}`, d.appendChild(m), r.appendChild(d);
    }
    const a = document.createElement("button");
    return a.type = "button", a.className = "btn-remove-field", a.textContent = "\xD7 Remove", a.onclick = () => r.remove(), r.appendChild(a), r;
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
      let s = r.querySelector(".error-message");
      t ? s && s.remove() : (s || (s = document.createElement("div"), s.className = "error-message", r.appendChild(s)), s.textContent = n);
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
}
class ee {
  constructor(e) {
    var _a;
    this.template = e, this.templateUri = e.uri || e.id || e.templateUri || null, this.template.labelPattern = e.labelPattern || e.nanopubLabelPattern || null, this.template.types = e.types || e.nanopubTypes || [], console.log("NanopubBuilder initialized with template URI:", this.templateUri), console.log("Label pattern:", this.template.labelPattern), console.log("Types from template:", this.template.types), console.log("Types array length:", ((_a = this.template.types) == null ? void 0 : _a.length) || 0);
  }
  async buildFromFormData(e, t = {}) {
    this.formData = e, this.metadata = t;
    const n = (/* @__PURE__ */ new Date()).toISOString(), r = this.generateRandomId(), s = `http://purl.org/nanopub/temp/${r}`, i = this.buildPrefixes(r), c = this.buildHead(s, r), a = this.buildAssertion(s, e, r), d = this.buildProvenance(s, e, t), m = this.buildPubinfo(s, n, t);
    return `${i}

${c}

${a}

${d}

${m}
`;
  }
  generateRandomId() {
    return Math.random().toString(36).substring(2, 15);
  }
  buildPrefixes(e) {
    const t = `http://purl.org/nanopub/temp/${e}`, n = [`@prefix this: <${t}> .`, `@prefix sub: <${t}#> .`, "@prefix np: <http://www.nanopub.org/nschema#> .", "@prefix dct: <http://purl.org/dc/terms/> .", "@prefix nt: <https://w3id.org/np/o/ntemplate/> .", "@prefix npx: <http://purl.org/nanopub/x/> .", "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .", "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .", "@prefix orcid: <https://orcid.org/> .", "@prefix prov: <http://www.w3.org/ns/prov#> .", "@prefix foaf: <http://xmlns.com/foaf/0.1/> .", "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ."];
    if (this.template.prefixes) for (const [r, s] of Object.entries(this.template.prefixes)) n.some((i) => i.includes(`@prefix ${r}:`)) || n.push(`@prefix ${r}: <${s}> .`);
    return n.join(`
`);
  }
  buildHead(e, t) {
    return `sub:Head {
  this: a np:Nanopublication ;
    np:hasAssertion sub:assertion ;
    np:hasProvenance sub:provenance ;
    np:hasPublicationInfo sub:pubinfo .
}`;
  }
  buildAssertion(e, t, n) {
    return `sub:assertion {
${this.buildStatements(t).join(`
`)}
}`;
  }
  buildStatements(e) {
    const t = [], n = {};
    for (const [r, s] of Object.entries(e)) {
      if (!s) continue;
      const i = r.match(/^(st\d+)_(subject|predicate|object)$/);
      if (i) {
        const [, c, a] = i;
        n[c] || (n[c] = {}), n[c][a] = s;
      }
    }
    for (const [r, s] of Object.entries(n)) if (s.subject && s.predicate && s.object) {
      const i = this.formatValue(s.subject, "subject"), c = this.formatValue(s.predicate, "predicate"), a = this.formatValue(s.object, "object"), d = this.hasStatementType(r);
      d ? (t.push(`  ${i} a ${d};`), t.push(`    ${c} ${a} .`)) : t.push(`  ${i} ${c} ${a} .`);
    }
    return t;
  }
  hasStatementType(e) {
    if (!this.template.statements) return null;
    const t = this.template.statements.find((n) => n.id === e);
    return !t || !t.subjectType ? null : this.formatValue(t.subjectType, "type");
  }
  formatValue(e, t = "any") {
    return e ? e.startsWith("http://") || e.startsWith("https://") ? `<${e}>` : e.includes(":") && !e.includes("://") || e.startsWith("<") && e.endsWith(">") ? e : t === "object" && (e.includes(`
`) || e.length > 100) ? `"""${e}"""` : `"${e}"` : '""';
  }
  buildProvenance(e, t, n) {
    const r = n.creator || "https://orcid.org/0000-0000-0000-0000";
    return `sub:provenance {
  sub:assertion prov:wasAttributedTo ${this.formatValue(r)} .
}`;
  }
  buildPubinfo(e, t, n) {
    const r = n.creator || "https://orcid.org/0000-0000-0000-0000", s = n.creatorName || "Unknown", i = [`  ${this.formatValue(r)} foaf:name "${s}" .`, "", `  this: dct:created "${t}"^^xsd:dateTime;`, `    dct:creator ${this.formatValue(r)};`, "    dct:license <https://creativecommons.org/licenses/by/4.0/>"];
    if (this.template.types && this.template.types.length > 0) {
      console.log("\u{1F4DD} Adding types to pubinfo:", this.template.types);
      const c = this.template.types.map((a) => `<${a}>`).join(", ");
      console.log("  \u2705 Types formatted:", c), i.push(`;
    npx:hasNanopubType ${c}`);
    }
    if (this.template.labelPattern) {
      const c = this.generateLabel();
      i.push(`;
    rdfs:label "${c}"`);
    }
    return this.templateUri && i.push(`;
    nt:wasCreatedFromTemplate <${this.templateUri}>`), i.push(" ."), `sub:pubinfo {
${i.join(`
`)}
}`;
  }
  generateLabel() {
    var _a;
    if (!this.template.labelPattern) return "Untitled";
    let e = this.template.labelPattern;
    console.log("Applying label pattern:", e), console.log("Form data for pattern:", this.formData);
    const t = /\$\{(\w+)\}/g, n = [...e.matchAll(t)];
    for (const r of n) {
      const s = r[1];
      console.log(`  \u{1F50D} Looking for placeholder: "${s}"`);
      let i = null;
      if (this.formData[s] && (i = this.formData[s], console.log(`    Direct lookup formData["${s}"]:`, i)), !i) for (const [c, a] of Object.entries(this.formData)) {
        console.log(`    Checking formData["${c}"] = ${a}`);
        const d = c.match(/^(st\d+)_(subject|predicate|object)$/);
        if (d) {
          const [, m, u] = d;
          console.log(`      Statement ${m} ${u} = "${s}"`);
          const p = (_a = this.template.statements) == null ? void 0 : _a.find((h) => h.id === m);
          if (p && (p[u] === s || p[u] === `sub:${s}`)) {
            i = a, console.log(`    \u2705 Found ${s} in ${c}:`, i);
            break;
          }
        }
      }
      if (i) {
        let c = i;
        if (i.startsWith("http://") || i.startsWith("https://")) {
          const a = i.split("/"), d = a[a.length - 1];
          d && d.length > 0 && (c = d, console.log(`    \u{1F4DD} Extracted from URI: "${c}"`));
        }
        e = e.replace(r[0], c);
      }
    }
    return console.log("\u{1F3F7}\uFE0F Final label after pattern replacement:", e), e;
  }
}
let l;
const X = typeof TextDecoder < "u" ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }) : { decode: () => {
  throw Error("TextDecoder not available");
} };
typeof TextDecoder < "u" && X.decode();
let T = null;
function U() {
  return (T === null || T.byteLength === 0) && (T = new Uint8Array(l.memory.buffer)), T;
}
function P(o, e) {
  return o = o >>> 0, X.decode(U().subarray(o, o + e));
}
const j = new Array(128).fill(void 0);
j.push(void 0, null, true, false);
let A = j.length;
function b(o) {
  A === j.length && j.push(j.length + 1);
  const e = A;
  return A = j[e], j[e] = o, e;
}
function f(o) {
  return j[o];
}
function te(o) {
  o < 132 || (j[o] = A, A = o);
}
function y(o) {
  const e = f(o);
  return te(o), e;
}
let $ = 0;
const D = typeof TextEncoder < "u" ? new TextEncoder("utf-8") : { encode: () => {
  throw Error("TextEncoder not available");
} }, ne = typeof D.encodeInto == "function" ? function(o, e) {
  return D.encodeInto(o, e);
} : function(o, e) {
  const t = D.encode(o);
  return e.set(t), { read: o.length, written: t.length };
};
function S(o, e, t) {
  if (t === void 0) {
    const c = D.encode(o), a = e(c.length, 1) >>> 0;
    return U().subarray(a, a + c.length).set(c), $ = c.length, a;
  }
  let n = o.length, r = e(n, 1) >>> 0;
  const s = U();
  let i = 0;
  for (; i < n; i++) {
    const c = o.charCodeAt(i);
    if (c > 127) break;
    s[r + i] = c;
  }
  if (i !== n) {
    i !== 0 && (o = o.slice(i)), r = t(r, n, n = i + o.length * 3, 1) >>> 0;
    const c = U().subarray(r + i, r + n), a = ne(o, c);
    i += a.written, r = t(r, n, i, 1) >>> 0;
  }
  return $ = i, r;
}
function R(o) {
  return o == null;
}
let M = null;
function g() {
  return (M === null || M.byteLength === 0) && (M = new Int32Array(l.memory.buffer)), M;
}
let O = null;
function re() {
  return (O === null || O.byteLength === 0) && (O = new Float64Array(l.memory.buffer)), O;
}
function V(o) {
  const e = typeof o;
  if (e == "number" || e == "boolean" || o == null) return `${o}`;
  if (e == "string") return `"${o}"`;
  if (e == "symbol") {
    const r = o.description;
    return r == null ? "Symbol" : `Symbol(${r})`;
  }
  if (e == "function") {
    const r = o.name;
    return typeof r == "string" && r.length > 0 ? `Function(${r})` : "Function";
  }
  if (Array.isArray(o)) {
    const r = o.length;
    let s = "[";
    r > 0 && (s += V(o[0]));
    for (let i = 1; i < r; i++) s += ", " + V(o[i]);
    return s += "]", s;
  }
  const t = /\[object ([^\]]+)\]/.exec(toString.call(o));
  let n;
  if (t.length > 1) n = t[1];
  else return toString.call(o);
  if (n == "Object") try {
    return "Object(" + JSON.stringify(o) + ")";
  } catch {
    return "Object";
  }
  return o instanceof Error ? `${o.name}: ${o.message}
${o.stack}` : n;
}
const G = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((o) => {
  l.__wbindgen_export_2.get(o.dtor)(o.a, o.b);
});
function oe(o, e, t, n) {
  const r = { a: o, b: e, cnt: 1, dtor: t }, s = (...i) => {
    r.cnt++;
    const c = r.a;
    r.a = 0;
    try {
      return n(c, r.b, ...i);
    } finally {
      --r.cnt === 0 ? (l.__wbindgen_export_2.get(r.dtor)(c, r.b), G.unregister(r)) : r.a = c;
    }
  };
  return s.original = r, G.register(s, r, r), s;
}
function se(o, e, t) {
  l._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h15d348a8f539de58(o, e, b(t));
}
function w(o, e) {
  try {
    return o.apply(this, e);
  } catch (t) {
    l.__wbindgen_exn_store(b(t));
  }
}
function ie(o, e, t, n) {
  l.wasm_bindgen__convert__closures__invoke2_mut__h2c289313db95095e(o, e, b(t), b(n));
}
function q(o, e) {
  if (!(o instanceof e)) throw new Error(`expected instance of ${e.name}`);
  return o.ptr;
}
let B = 128;
function ae(o) {
  if (B == 1) throw new Error("out of js stack");
  return j[--B] = o, B;
}
const le = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((o) => l.__wbg_keypair_free(o >>> 0));
class ce {
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, le.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    l.__wbg_keypair_free(e);
  }
  constructor() {
    try {
      const r = l.__wbindgen_add_to_stack_pointer(-16);
      l.keypair_new(r);
      var e = g()[r / 4 + 0], t = g()[r / 4 + 1], n = g()[r / 4 + 2];
      if (n) throw y(t);
      return this.__wbg_ptr = e >>> 0, this;
    } finally {
      l.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toJs() {
    try {
      const r = l.__wbindgen_add_to_stack_pointer(-16);
      l.keypair_toJs(r, this.__wbg_ptr);
      var e = g()[r / 4 + 0], t = g()[r / 4 + 1], n = g()[r / 4 + 2];
      if (n) throw y(t);
      return y(e);
    } finally {
      l.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
const J = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((o) => l.__wbg_nanopub_free(o >>> 0));
class F {
  static __wrap(e) {
    e = e >>> 0;
    const t = Object.create(F.prototype);
    return t.__wbg_ptr = e, J.register(t, t.__wbg_ptr, t), t;
  }
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, J.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    l.__wbg_nanopub_free(e);
  }
  constructor(e) {
    try {
      const s = l.__wbindgen_add_to_stack_pointer(-16);
      l.nanopub_new(s, b(e));
      var t = g()[s / 4 + 0], n = g()[s / 4 + 1], r = g()[s / 4 + 2];
      if (r) throw y(n);
      return this.__wbg_ptr = t >>> 0, this;
    } finally {
      l.__wbindgen_add_to_stack_pointer(16);
    }
  }
  check() {
    try {
      const r = this.__destroy_into_raw(), s = l.__wbindgen_add_to_stack_pointer(-16);
      l.nanopub_check(s, r);
      var e = g()[s / 4 + 0], t = g()[s / 4 + 1], n = g()[s / 4 + 2];
      if (n) throw y(t);
      return F.__wrap(e);
    } finally {
      l.__wbindgen_add_to_stack_pointer(16);
    }
  }
  sign(e) {
    try {
      const s = this.__destroy_into_raw(), i = l.__wbindgen_add_to_stack_pointer(-16);
      q(e, z), l.nanopub_sign(i, s, e.__wbg_ptr);
      var t = g()[i / 4 + 0], n = g()[i / 4 + 1], r = g()[i / 4 + 2];
      if (r) throw y(n);
      return F.__wrap(t);
    } finally {
      l.__wbindgen_add_to_stack_pointer(16);
    }
  }
  publish(e, t) {
    try {
      const s = this.__destroy_into_raw();
      var n = R(t) ? 0 : S(t, l.__wbindgen_malloc, l.__wbindgen_realloc), r = $;
      const i = l.nanopub_publish(s, ae(e), n, r);
      return y(i);
    } finally {
      j[B++] = void 0;
    }
  }
  static fetch(e) {
    const t = S(e, l.__wbindgen_malloc, l.__wbindgen_realloc), n = $, r = l.nanopub_fetch(t, n);
    return y(r);
  }
  static publish_intro(e, t) {
    q(e, z);
    const n = S(t, l.__wbindgen_malloc, l.__wbindgen_realloc), r = $, s = l.nanopub_publish_intro(e.__wbg_ptr, n, r);
    return y(s);
  }
  rdf() {
    let e, t;
    try {
      const d = l.__wbindgen_add_to_stack_pointer(-16);
      l.nanopub_rdf(d, this.__wbg_ptr);
      var n = g()[d / 4 + 0], r = g()[d / 4 + 1], s = g()[d / 4 + 2], i = g()[d / 4 + 3], c = n, a = r;
      if (i) throw c = 0, a = 0, y(s);
      return e = c, t = a, P(c, a);
    } finally {
      l.__wbindgen_add_to_stack_pointer(16), l.__wbindgen_free(e, t, 1);
    }
  }
  info() {
    try {
      const r = l.__wbindgen_add_to_stack_pointer(-16);
      l.nanopub_info(r, this.__wbg_ptr);
      var e = g()[r / 4 + 0], t = g()[r / 4 + 1], n = g()[r / 4 + 2];
      if (n) throw y(t);
      return y(e);
    } finally {
      l.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toString() {
    let e, t;
    try {
      const s = l.__wbindgen_add_to_stack_pointer(-16);
      l.nanopub_toString(s, this.__wbg_ptr);
      var n = g()[s / 4 + 0], r = g()[s / 4 + 1];
      return e = n, t = r, P(n, r);
    } finally {
      l.__wbindgen_add_to_stack_pointer(16), l.__wbindgen_free(e, t, 1);
    }
  }
}
const de = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((o) => l.__wbg_npprofile_free(o >>> 0));
class z {
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, de.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    l.__wbg_npprofile_free(e);
  }
  __getClassname() {
    let e, t;
    try {
      const s = l.__wbindgen_add_to_stack_pointer(-16);
      l.npprofile___getClassname(s, this.__wbg_ptr);
      var n = g()[s / 4 + 0], r = g()[s / 4 + 1];
      return e = n, t = r, P(n, r);
    } finally {
      l.__wbindgen_add_to_stack_pointer(16), l.__wbindgen_free(e, t, 1);
    }
  }
  constructor(e, t, n, r) {
    try {
      const _ = l.__wbindgen_add_to_stack_pointer(-16), x = S(e, l.__wbindgen_malloc, l.__wbindgen_realloc), C = $;
      var s = R(t) ? 0 : S(t, l.__wbindgen_malloc, l.__wbindgen_realloc), i = $, c = R(n) ? 0 : S(n, l.__wbindgen_malloc, l.__wbindgen_realloc), a = $, d = R(r) ? 0 : S(r, l.__wbindgen_malloc, l.__wbindgen_realloc), m = $;
      l.npprofile_new(_, x, C, s, i, c, a, d, m);
      var u = g()[_ / 4 + 0], p = g()[_ / 4 + 1], h = g()[_ / 4 + 2];
      if (h) throw y(p);
      return this.__wbg_ptr = u >>> 0, this;
    } finally {
      l.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toString() {
    let e, t;
    try {
      const s = l.__wbindgen_add_to_stack_pointer(-16);
      l.npprofile_toString(s, this.__wbg_ptr);
      var n = g()[s / 4 + 0], r = g()[s / 4 + 1];
      return e = n, t = r, P(n, r);
    } finally {
      l.__wbindgen_add_to_stack_pointer(16), l.__wbindgen_free(e, t, 1);
    }
  }
  toJs() {
    try {
      const r = l.__wbindgen_add_to_stack_pointer(-16);
      l.npprofile_toJs(r, this.__wbg_ptr);
      var e = g()[r / 4 + 0], t = g()[r / 4 + 1], n = g()[r / 4 + 2];
      if (n) throw y(t);
      return y(e);
    } finally {
      l.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
async function ue(o, e) {
  if (typeof Response == "function" && o instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function") try {
      return await WebAssembly.instantiateStreaming(o, e);
    } catch (n) {
      if (o.headers.get("Content-Type") != "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", n);
      else throw n;
    }
    const t = await o.arrayBuffer();
    return await WebAssembly.instantiate(t, e);
  } else {
    const t = await WebAssembly.instantiate(o, e);
    return t instanceof WebAssembly.Instance ? { instance: t, module: o } : t;
  }
}
function pe() {
  const o = {};
  return o.wbg = {}, o.wbg.__wbg_nanopub_new = function(e) {
    const t = F.__wrap(e);
    return b(t);
  }, o.wbg.__wbindgen_string_new = function(e, t) {
    const n = P(e, t);
    return b(n);
  }, o.wbg.__wbg_call_b3ca7c6051f9bec1 = function() {
    return w(function(e, t, n) {
      const r = f(e).call(f(t), f(n));
      return b(r);
    }, arguments);
  }, o.wbg.__wbindgen_object_drop_ref = function(e) {
    y(e);
  }, o.wbg.__wbg_abort_2aa7521d5690750e = function(e) {
    f(e).abort();
  }, o.wbg.__wbg_new_72fb9a18b5ae2624 = function() {
    const e = new Object();
    return b(e);
  }, o.wbg.__wbg_set_1f9b04f170055d33 = function() {
    return w(function(e, t, n) {
      return Reflect.set(f(e), f(t), f(n));
    }, arguments);
  }, o.wbg.__wbg_new_ab6fd82b10560829 = function() {
    return w(function() {
      const e = new Headers();
      return b(e);
    }, arguments);
  }, o.wbg.__wbindgen_object_clone_ref = function(e) {
    const t = f(e);
    return b(t);
  }, o.wbg.__wbg_new_0d76b0581eca6298 = function() {
    return w(function() {
      const e = new AbortController();
      return b(e);
    }, arguments);
  }, o.wbg.__wbg_signal_a61f78a3478fd9bc = function(e) {
    const t = f(e).signal;
    return b(t);
  }, o.wbg.__wbg_append_7bfcb4937d1d5e29 = function() {
    return w(function(e, t, n, r, s) {
      f(e).append(P(t, n), P(r, s));
    }, arguments);
  }, o.wbg.__wbg_instanceof_Response_849eb93e75734b6e = function(e) {
    let t;
    try {
      t = f(e) instanceof Response;
    } catch {
      t = false;
    }
    return t;
  }, o.wbg.__wbg_status_61a01141acd3cf74 = function(e) {
    return f(e).status;
  }, o.wbg.__wbg_url_5f6dc4009ac5f99d = function(e, t) {
    const n = f(t).url, r = S(n, l.__wbindgen_malloc, l.__wbindgen_realloc), s = $;
    g()[e / 4 + 1] = s, g()[e / 4 + 0] = r;
  }, o.wbg.__wbg_headers_9620bfada380764a = function(e) {
    const t = f(e).headers;
    return b(t);
  }, o.wbg.__wbg_iterator_2cee6dadfd956dfa = function() {
    return b(Symbol.iterator);
  }, o.wbg.__wbg_get_e3c254076557e348 = function() {
    return w(function(e, t) {
      const n = Reflect.get(f(e), f(t));
      return b(n);
    }, arguments);
  }, o.wbg.__wbindgen_is_function = function(e) {
    return typeof f(e) == "function";
  }, o.wbg.__wbg_call_27c0f87801dedf93 = function() {
    return w(function(e, t) {
      const n = f(e).call(f(t));
      return b(n);
    }, arguments);
  }, o.wbg.__wbindgen_is_object = function(e) {
    const t = f(e);
    return typeof t == "object" && t !== null;
  }, o.wbg.__wbg_next_40fc327bfc8770e6 = function(e) {
    const t = f(e).next;
    return b(t);
  }, o.wbg.__wbg_next_196c84450b364254 = function() {
    return w(function(e) {
      const t = f(e).next();
      return b(t);
    }, arguments);
  }, o.wbg.__wbg_done_298b57d23c0fc80c = function(e) {
    return f(e).done;
  }, o.wbg.__wbg_value_d93c65011f51a456 = function(e) {
    const t = f(e).value;
    return b(t);
  }, o.wbg.__wbg_stringify_8887fe74e1c50d81 = function() {
    return w(function(e) {
      const t = JSON.stringify(f(e));
      return b(t);
    }, arguments);
  }, o.wbg.__wbindgen_string_get = function(e, t) {
    const n = f(t), r = typeof n == "string" ? n : void 0;
    var s = R(r) ? 0 : S(r, l.__wbindgen_malloc, l.__wbindgen_realloc), i = $;
    g()[e / 4 + 1] = i, g()[e / 4 + 0] = s;
  }, o.wbg.__wbg_text_450a059667fd91fd = function() {
    return w(function(e) {
      const t = f(e).text();
      return b(t);
    }, arguments);
  }, o.wbg.__wbg_new0_7d84e5b2cd9fdc73 = function() {
    return b(/* @__PURE__ */ new Date());
  }, o.wbg.__wbg_getTime_2bc4375165f02d15 = function(e) {
    return f(e).getTime();
  }, o.wbg.__wbg_crypto_1d1f22824a6a080c = function(e) {
    const t = f(e).crypto;
    return b(t);
  }, o.wbg.__wbg_process_4a72847cc503995b = function(e) {
    const t = f(e).process;
    return b(t);
  }, o.wbg.__wbg_versions_f686565e586dd935 = function(e) {
    const t = f(e).versions;
    return b(t);
  }, o.wbg.__wbg_node_104a2ff8d6ea03a2 = function(e) {
    const t = f(e).node;
    return b(t);
  }, o.wbg.__wbindgen_is_string = function(e) {
    return typeof f(e) == "string";
  }, o.wbg.__wbg_require_cca90b1a94a0255b = function() {
    return w(function() {
      const e = module.require;
      return b(e);
    }, arguments);
  }, o.wbg.__wbg_msCrypto_eb05e62b530a1508 = function(e) {
    const t = f(e).msCrypto;
    return b(t);
  }, o.wbg.__wbg_newwithlength_e9b4878cebadb3d3 = function(e) {
    const t = new Uint8Array(e >>> 0);
    return b(t);
  }, o.wbg.__wbindgen_memory = function() {
    const e = l.memory;
    return b(e);
  }, o.wbg.__wbg_buffer_12d079cc21e14bdb = function(e) {
    const t = f(e).buffer;
    return b(t);
  }, o.wbg.__wbg_newwithbyteoffsetandlength_aa4a17c33a06e5cb = function(e, t, n) {
    const r = new Uint8Array(f(e), t >>> 0, n >>> 0);
    return b(r);
  }, o.wbg.__wbg_randomFillSync_5c9c955aa56b6049 = function() {
    return w(function(e, t) {
      f(e).randomFillSync(y(t));
    }, arguments);
  }, o.wbg.__wbg_subarray_a1f73cd4b5b42fe1 = function(e, t, n) {
    const r = f(e).subarray(t >>> 0, n >>> 0);
    return b(r);
  }, o.wbg.__wbg_getRandomValues_3aa56aa6edec874c = function() {
    return w(function(e, t) {
      f(e).getRandomValues(f(t));
    }, arguments);
  }, o.wbg.__wbg_new_63b92bc8671ed464 = function(e) {
    const t = new Uint8Array(f(e));
    return b(t);
  }, o.wbg.__wbg_set_a47bac70306a19a7 = function(e, t, n) {
    f(e).set(f(t), n >>> 0);
  }, o.wbg.__wbg_self_ce0dbfc45cf2f5be = function() {
    return w(function() {
      const e = self.self;
      return b(e);
    }, arguments);
  }, o.wbg.__wbg_window_c6fb939a7f436783 = function() {
    return w(function() {
      const e = window.window;
      return b(e);
    }, arguments);
  }, o.wbg.__wbg_globalThis_d1e6af4856ba331b = function() {
    return w(function() {
      const e = globalThis.globalThis;
      return b(e);
    }, arguments);
  }, o.wbg.__wbg_global_207b558942527489 = function() {
    return w(function() {
      const e = global.global;
      return b(e);
    }, arguments);
  }, o.wbg.__wbindgen_is_undefined = function(e) {
    return f(e) === void 0;
  }, o.wbg.__wbg_newnoargs_e258087cd0daa0ea = function(e, t) {
    const n = new Function(P(e, t));
    return b(n);
  }, o.wbg.__wbg_new_16b304a2cfa7ff4a = function() {
    const e = new Array();
    return b(e);
  }, o.wbg.__wbg_apply_0a5aa603881e6d79 = function() {
    return w(function(e, t, n) {
      const r = Reflect.apply(f(e), f(t), f(n));
      return b(r);
    }, arguments);
  }, o.wbg.__wbindgen_number_get = function(e, t) {
    const n = f(t), r = typeof n == "number" ? n : void 0;
    re()[e / 8 + 1] = R(r) ? 0 : r, g()[e / 4 + 0] = !R(r);
  }, o.wbg.__wbg_new_81740750da40724f = function(e, t) {
    try {
      var n = { a: e, b: t }, r = (i, c) => {
        const a = n.a;
        n.a = 0;
        try {
          return ie(a, n.b, i, c);
        } finally {
          n.a = a;
        }
      };
      const s = new Promise(r);
      return b(s);
    } finally {
      n.a = n.b = 0;
    }
  }, o.wbg.__wbg_set_f975102236d3c502 = function(e, t, n) {
    f(e)[y(t)] = y(n);
  }, o.wbg.__wbindgen_cb_drop = function(e) {
    const t = y(e).original;
    return t.cnt-- == 1 ? (t.a = 0, true) : false;
  }, o.wbg.__wbg_has_0af94d20077affa2 = function() {
    return w(function(e, t) {
      return Reflect.has(f(e), f(t));
    }, arguments);
  }, o.wbg.__wbg_fetch_eadcbc7351113537 = function(e) {
    const t = fetch(f(e));
    return b(t);
  }, o.wbg.__wbg_fetch_921fad6ef9e883dd = function(e, t) {
    const n = f(e).fetch(f(t));
    return b(n);
  }, o.wbg.__wbindgen_debug_string = function(e, t) {
    const n = V(f(t)), r = S(n, l.__wbindgen_malloc, l.__wbindgen_realloc), s = $;
    g()[e / 4 + 1] = s, g()[e / 4 + 0] = r;
  }, o.wbg.__wbindgen_throw = function(e, t) {
    throw new Error(P(e, t));
  }, o.wbg.__wbg_then_0c86a60e8fcfe9f6 = function(e, t) {
    const n = f(e).then(f(t));
    return b(n);
  }, o.wbg.__wbg_queueMicrotask_481971b0d87f3dd4 = function(e) {
    queueMicrotask(f(e));
  }, o.wbg.__wbg_then_a73caa9a87991566 = function(e, t, n) {
    const r = f(e).then(f(t), f(n));
    return b(r);
  }, o.wbg.__wbg_queueMicrotask_3cbae2ec6b6cd3d6 = function(e) {
    const t = f(e).queueMicrotask;
    return b(t);
  }, o.wbg.__wbg_resolve_b0083a7967828ec8 = function(e) {
    const t = Promise.resolve(f(e));
    return b(t);
  }, o.wbg.__wbg_newwithstrandinit_3fd6fba4083ff2d0 = function() {
    return w(function(e, t, n) {
      const r = new Request(P(e, t), f(n));
      return b(r);
    }, arguments);
  }, o.wbg.__wbindgen_closure_wrapper3118 = function(e, t, n) {
    const r = oe(e, t, 173, se);
    return b(r);
  }, o;
}
function fe(o, e) {
  return l = o.exports, Y.__wbindgen_wasm_module = e, O = null, M = null, T = null, l.__wbindgen_start(), l;
}
async function Y(o) {
  if (l !== void 0) return l;
  typeof o > "u" && (o = new URL("/nanopub-create/assets/web_bg-CaMmR8bt.wasm", import.meta.url));
  const e = pe();
  (typeof o == "string" || typeof Request == "function" && o instanceof Request || typeof URL == "function" && o instanceof URL) && (o = fetch(o));
  const { instance: t, module: n } = await ue(await o, e);
  return fe(t, n);
}
class he {
  constructor(e = {}) {
    this.options = { publishServer: e.publishServer || "https://np.petapico.org", theme: e.theme || "default", validateOnChange: e.validateOnChange !== false, showHelp: e.showHelp !== false, ...e }, this.template = null, this.formGenerator = null, this.builder = null, this.formData = {}, this.container = null, this.wasmInitialized = false, this.profile = null, this.credentials = null, this.listeners = { change: [], submit: [], error: [], publish: [], profileNeeded: [] }, this.initWasm(), this.loadCredentials();
  }
  async initWasm() {
    if (!this.wasmInitialized) try {
      await Y(), this.wasmInitialized = true, console.log("\u2713 WASM initialized successfully");
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
      const t = new ce().toJs();
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
      localStorage.setItem("nanopub_profile", JSON.stringify(e)), console.log("\u2713 Profile saved to localStorage");
    } catch (e) {
      console.error("Failed to save credentials:", e);
    }
  }
  loadCredentials() {
    try {
      const e = localStorage.getItem("nanopub_profile");
      if (e) {
        const t = JSON.parse(e);
        return this.profile = t.profile, this.credentials = t.credentials, console.log("\u2713 Profile loaded from localStorage"), true;
      }
    } catch (e) {
      console.error("Failed to load credentials:", e);
    }
    return false;
  }
  clearCredentials() {
    this.profile = null, this.credentials = null;
    try {
      localStorage.removeItem("nanopub_profile"), console.log("\u2713 Profile cleared");
    } catch (e) {
      console.error("Failed to clear credentials:", e);
    }
  }
  async renderFromTemplateUri(e, t) {
    this.container = t;
    try {
      this.template = await H.fetchAndParse(e), this.template.uri = this.template.uri || e, this.formGenerator = new Q(this.template, { validateOnChange: this.options.validateOnChange, showHelp: this.options.showHelp, labels: this.template.labels }), this.formGenerator.on("change", (n) => {
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
      }), this.formGenerator.renderForm(t), this.builder = new ee(this.template);
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
      const r = new z(this.credentials.privateKey, t, n);
      console.log("\u2705 Profile created"), console.log("\u{1F4DD} Signing nanopub...");
      const i = new F(e).sign(r);
      console.log("\u2705 Signed successfully"), console.log("  Signed type:", typeof i);
      const c = i.rdf();
      if (!this.options.publishServer) return console.log("\u{1F4E5} Download-only mode (no publish server configured)"), this.emit("publish", { uri: null, signedContent: c, downloadOnly: true }), { signedContent: c, downloadOnly: true };
      console.log("\u{1F4E4} Publishing to network..."), console.log("   Server:", this.options.publishServer);
      const a = await i.publish(r, this.options.publishServer);
      console.log("\u2705 Published successfully!"), console.log("\u{1F310} Result:", a);
      const d = typeof a == "string" ? a : a.uri || a.nanopub_uri;
      return this.emit("publish", { uri: d, signedContent: c }), { uri: d, nanopub_uri: d, signedContent: c };
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
let v = null, K = "";
async function be() {
  try {
    v = new he({ publishServer: null }), v.on("change", (o) => {
      console.log("Form data changed:", o);
    }), v.on("submit", (o) => {
      console.log("Generated nanopub:", o.trigContent), K = o.trigContent, me(o.trigContent);
    }), v.on("error", (o) => {
      console.error("Error:", o.type, o.error), E(`Error (${o.type}): ${o.error.message}`, "error");
    }), v.on("profileNeeded", () => {
      E("Please setup your profile first to sign nanopublications", "warning");
    }), console.log("\u2713 Creator initialized successfully"), W();
  } catch (o) {
    console.error("Failed to initialize:", o), E("Failed to initialize: " + o.message, "error");
  }
}
function W() {
  const o = document.getElementById("profile-status"), e = document.getElementById("profile-setup"), t = document.getElementById("profile-info");
  if (v.hasProfile()) {
    const n = v.getProfile();
    o.textContent = "Configured", o.className = "status success", e.classList.add("hidden"), t.classList.remove("hidden"), document.getElementById("profile-name").textContent = n.name;
    const r = document.getElementById("profile-orcid");
    n.orcid ? (r.textContent = n.orcid, r.href = n.orcid) : (r.textContent = "Not provided", r.href = "#");
    const s = v.exportKeys();
    document.getElementById("public-key-preview").textContent = s.publicKey;
  } else o.textContent = "Not configured", o.className = "status warning", e.classList.remove("hidden"), t.classList.add("hidden");
}
document.getElementById("setup-btn").addEventListener("click", async () => {
  const o = document.getElementById("name-input").value.trim(), e = document.getElementById("orcid-input").value.trim(), t = document.getElementById("setup-message"), n = document.getElementById("setup-btn");
  if (!o) {
    t.innerHTML = '<div class="error-message">Please enter your name</div>';
    return;
  }
  try {
    n.disabled = true, n.textContent = "Generating keys...", t.innerHTML = '<div class="info-message">\u2699\uFE0F Generating RSA keypair with nanopub-rs WASM...<br>This may take a few seconds.</div>', await v.setupProfile(o, e || null), t.innerHTML = '<div class="success-message">Profile created successfully! Your keys are stored in this browser.</div>', W(), setTimeout(() => {
      t.innerHTML = "";
    }, 5e3);
  } catch (r) {
    console.error("Profile setup failed:", r), t.innerHTML = `<div class="error-message">Failed: ${r.message}</div>`;
  } finally {
    n.disabled = false, n.textContent = "Generate Keys & Save Profile";
  }
});
document.getElementById("import-file").addEventListener("change", async (o) => {
  const e = o.target.files[0];
  if (!e) return;
  const t = document.getElementById("setup-message");
  try {
    const n = await e.text(), r = JSON.parse(n);
    if (!r.privateKey || !r.publicKey || !r.name) throw new Error("Invalid profile file format");
    v.importKeys(r), W(), t.innerHTML = '<div class="success-message">\u2713 Profile imported successfully!</div>', setTimeout(() => {
      t.innerHTML = "";
    }, 3e3);
  } catch (n) {
    console.error("Import failed:", n), t.innerHTML = `<div class="error-message">Import failed: ${n.message}</div>`;
  }
  o.target.value = "";
});
document.getElementById("export-btn").addEventListener("click", () => {
  try {
    const o = v.getProfile(), e = v.exportKeys(), t = { name: o.name, orcid: o.orcid, privateKey: e.privateKey, publicKey: e.publicKey, exportedAt: (/* @__PURE__ */ new Date()).toISOString() }, n = new Blob([JSON.stringify(t, null, 2)], { type: "application/json" }), r = URL.createObjectURL(n), s = document.createElement("a");
    s.href = r, s.download = `nanopub-profile-${o.name.replace(/\s+/g, "-").toLowerCase()}.json`, s.click(), URL.revokeObjectURL(r), E("\u2713 Profile exported!", "success");
  } catch (o) {
    console.error("Export failed:", o), E("Export failed: " + o.message, "error");
  }
});
document.getElementById("clear-btn").addEventListener("click", () => {
  confirm("Are you sure you want to clear your profile and keys? Make sure to export first if you want to keep them.") && (v.clearCredentials(), W(), E("Profile cleared", "info"));
});
document.getElementById("load-template-btn").addEventListener("click", async () => {
  const o = document.getElementById("template-uri").value.trim(), e = document.getElementById("template-container"), t = document.getElementById("template-message"), n = document.getElementById("load-template-btn");
  if (!o) {
    t.innerHTML = '<div class="error-message">Please enter a template URI</div>';
    return;
  }
  try {
    n.disabled = true, n.textContent = "Loading...", e.innerHTML = '<div class="loading">\u23F3 Loading template from network...</div>', t.innerHTML = "", await v.renderFromTemplateUri(o, e), t.innerHTML = '<div class="success-message">\u2713 Template loaded successfully!</div>', e.classList.add("template-loaded"), setTimeout(() => {
      t.innerHTML = "";
    }, 3e3);
  } catch (r) {
    console.error("Template load failed:", r), t.innerHTML = `<div class="error-message">Failed to load template: ${r.message}</div>`, e.innerHTML = '<div class="error-message">Failed to load template. Check console for details.</div>';
  } finally {
    n.disabled = false, n.textContent = "Load Template";
  }
});
function me(o) {
  document.getElementById("preview-text").textContent = o, document.getElementById("preview-section").classList.remove("hidden");
}
document.getElementById("copy-btn").addEventListener("click", () => {
  const o = document.getElementById("preview-text").textContent;
  navigator.clipboard.writeText(o).then(() => {
    E("\u2713 Copied to clipboard!", "success");
  });
});
document.getElementById("sign-download-btn").addEventListener("click", () => {
  ge();
});
async function ge() {
  if (!K) {
    E("No nanopublication to sign", "warning");
    return;
  }
  if (!v.hasProfile()) {
    E("Please setup your profile first", "warning");
    return;
  }
  const o = document.getElementById("sign-download-btn");
  try {
    o.disabled = true, o.textContent = "Signing...", E("\u{1F510} Signing nanopublication...", "info");
    let t = (await v.publish(K)).signedContent.replace(/##/g, "#");
    const n = v.getProfile(), s = `nanopub-signed-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.trig`, i = new Blob([t], { type: "application/trig" }), c = URL.createObjectURL(i), a = document.createElement("a");
    a.href = c, a.download = s, a.click(), URL.revokeObjectURL(c), E("\u2705 Signed nanopub downloaded!", "success"), document.getElementById("preview-text").textContent = t;
  } catch (e) {
    console.error("Sign failed:", e), E(`Sign failed: ${e.message}`, "error");
  } finally {
    o.disabled = false, o.textContent = "Sign & Download";
  }
}
function E(o, e = "info") {
  const t = document.getElementById("messages"), n = document.createElement("div");
  n.className = `${e}-message`, n.textContent = o, n.style.marginBottom = "10px", n.style.animation = "slideIn 0.3s ease", t.appendChild(n), setTimeout(() => {
    n.style.animation = "slideOut 0.3s ease", setTimeout(() => n.remove(), 300);
  }, 5e3);
}
be();
