(function() {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload")) return;
  for (const n of document.querySelectorAll('link[rel="modulepreload"]')) r(n);
  new MutationObserver((n) => {
    for (const o of n) if (o.type === "childList") for (const i of o.addedNodes) i.tagName === "LINK" && i.rel === "modulepreload" && r(i);
  }).observe(document, { childList: true, subtree: true });
  function t(n) {
    const o = {};
    return n.integrity && (o.integrity = n.integrity), n.referrerPolicy && (o.referrerPolicy = n.referrerPolicy), n.crossOrigin === "use-credentials" ? o.credentials = "include" : n.crossOrigin === "anonymous" ? o.credentials = "omit" : o.credentials = "same-origin", o;
  }
  function r(n) {
    if (n.ep) return;
    n.ep = true;
    const o = t(n);
    fetch(n.href, o);
  }
})();
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
    const r = e[1].match(/sub:assertion[^}]*rdfs:label\s+"([^"]+)"/);
    r && (this.template.label = r[1]);
    const n = this.content.match(/dct:description\s+"([^"]+)"/);
    n && (this.template.description = n[1]);
    const o = this.content.match(/nt:hasNanopubLabelPattern\s+"([^"]+)"/);
    o ? (this.template.labelPattern = o[1], console.log(`\u2705 Found label pattern: "${o[1]}"`)) : console.warn("\u26A0\uFE0F No nt:hasNanopubLabelPattern found in template");
    const i = this.content.match(/nt:hasTag\s+"([^"]+)"/);
    i && (this.template.tags = [i[1]]);
    const u = this.content.match(/nt:hasTargetNanopubType\s+(.+?)\s*[;.](?:\s|$)/s);
    if (u) {
      const c = u[1], d = /<([^>]+)>/g, f = [];
      let a;
      for (; (a = d.exec(c)) !== null; ) f.push(a[1]);
      this.template.types = f, console.log(`\u2705 Found ${f.length} target nanopub types:`, f);
    } else console.warn("\u26A0\uFE0F No nt:hasTargetNanopubType found in template");
  }
  parseLabels() {
    const e = /(<[^>]+>|[\w:]+)\s+rdfs:label\s+"([^"]+)"\s*[;.]/g;
    let t;
    for (; (t = e.exec(this.content)) !== null; ) {
      const r = this.cleanUri(t[1]), n = t[2];
      this.template.labels[r] = n;
    }
  }
  parsePlaceholders() {
    console.log("Parsing placeholders...");
    const e = /(sub:[\w-]+)\s+a\s+nt:([\w,\s]+(Placeholder|Resource)[^;.\n]*)[;.]/g;
    let t;
    for (; (t = e.exec(this.content)) !== null; ) {
      const r = t[1], n = t[2].trim(), o = t.index;
      let i = this.content.length;
      const c = this.content.substring(o).substring(1).search(/\n\s*(?:sub:[\w-]+\s+a\s+nt:|})/);
      c > 0 && (i = o + c + 1);
      const d = this.content.substring(o, i);
      console.log(`
--- Parsing ${r} ---`), console.log(`Block length: ${d.length} chars`), console.log(`Block preview: ${d.substring(0, 200)}...`);
      const f = n.split(",").map((_) => _.trim()), a = f[0].replace(/^nt:/, ""), l = { id: this.cleanUri(r), type: a, isLocalResource: f.some((_) => _.includes("LocalResource")), isIntroducedResource: f.some((_) => _.includes("IntroducedResource")), label: this.extractLabel(d), description: this.extractDescription(d), validation: this.extractValidation(d), possibleValuesFrom: null, possibleValuesFromApi: null, options: [], prefix: null, hasDatatype: null };
      if (a.includes("AutoEscapeUriPlaceholder")) {
        const _ = d.match(/nt:hasPrefix\s+"([^"]+)"/);
        _ && (l.prefix = _[1], console.log(`  \u2192 Found prefix for AutoEscapeUriPlaceholder: ${l.prefix}`));
      }
      const m = d.match(/nt:hasDatatype\s+<([^>]+)>/);
      if (m && (l.hasDatatype = m[1], console.log(`  \u2192 Found datatype: ${l.hasDatatype}`)), a.includes("RestrictedChoice")) {
        const _ = d.match(/nt:possibleValuesFrom\s+(?:<([^>]+)>|([\w-]+:[\w-]+))/);
        if (_) {
          const x = _[1] || _[2];
          if (x && x.includes(":") && !x.startsWith("http")) {
            const [E, F] = x.split(":"), N = this.content.match(new RegExp(`@prefix ${E}:\\s+<([^>]+)>`));
            N ? l.possibleValuesFrom = N[1] + F : l.possibleValuesFrom = x;
          } else l.possibleValuesFrom = x;
          console.log(`  \u2192 Will fetch options from: ${l.possibleValuesFrom}`);
        }
        const C = d.match(/nt:possibleValue\s+([\s\S]+?)(?:\s+\.(?:\s|$))/);
        if (C) {
          const x = C[1];
          console.log(`  \u2192 Raw value text: ${x.substring(0, 100)}...`);
          const E = [], F = /<([^>]+)>|([\w-]+:[\w-]+)/g;
          let N;
          for (; (N = F.exec(x)) !== null; ) E.push(N[1] || N[2]);
          E.length > 0 ? (l.options = E.map((j) => {
            let S = this.template.labels[j];
            return S || (j.startsWith("http") ? (S = j.replace(/^https?:\/\//, "").replace(/\/$/, ""), S = S.charAt(0).toUpperCase() + S.slice(1)) : j.includes(":") ? S = j.split(":")[1] : S = j), { value: j, label: S };
          }), console.log(`  \u2192 Found ${l.options.length} inline options:`, l.options.map((j) => j.label))) : console.warn("  \u2192 No values found in possibleValue text");
        }
      }
      if (a.includes("GuidedChoice")) {
        const _ = d.match(/nt:possibleValuesFromApi\s+"([^"]+)"/);
        _ && (l.possibleValuesFromApi = _[1]);
      }
      console.log(`Found placeholder: ${l.id} (${l.type})`), this.template.placeholders.push(l);
    }
    console.log(`Total placeholders found: ${this.template.placeholders.length}`);
  }
  async parsePlaceholderOptions() {
    for (const e of this.template.placeholders) if (e.possibleValuesFrom && e.options.length === 0) try {
      const t = e.possibleValuesFrom.replace(/^https?:\/\/(w3id\.org|purl\.org)\/np\//, "https://np.petapico.org/") + ".trig";
      console.log(`Fetching options for ${e.id} from ${t}`);
      const r = await fetch(t);
      if (!r.ok) {
        console.warn(`Failed to fetch options: HTTP ${r.status}`);
        continue;
      }
      const n = await r.text();
      console.log(`  \u2192 Fetched ${n.length} chars`);
      let o = "";
      const i = n.match(/@prefix sub:\s+<([^>]+)>/);
      i && (o = i[1]);
      const u = /<([^>]+)>\s+rdfs:label\s+"([^"]+)"/g, c = /(sub:[\w-]+)\s+rdfs:label\s+"([^"]+)"/g;
      e.options = [];
      let d = 0;
      for (const f of n.matchAll(u)) {
        d++;
        const a = f[1], l = f[2];
        console.log(`  \u2192 Match ${d} (full URI): URI=${a}, Label="${l}"`), a.includes("#assertion") || a.includes("#Head") || a.includes("#provenance") || a.includes("#pubinfo") || a.includes("ntemplate") || a.includes("rdf-syntax") || a.includes("XMLSchema") || a.includes("rdfs#") || a.includes("dc/terms") || a.includes("foaf/0.1") || a.includes("nanopub/x/") || a.includes("nanopub.org/nschema") || l.includes("Template:") || l.includes("Making a statement") || l.includes("is a") || l.includes("has type") || e.options.push({ value: a, label: l });
      }
      for (const f of n.matchAll(c)) {
        d++;
        const a = f[1], l = f[2], m = a.replace("sub:", ""), _ = o + m;
        console.log(`  \u2192 Match ${d} (prefixed): ${a} -> ${_}, Label="${l}"`), e.options.push({ value: _, label: l });
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
      const r = this.parseStatement(t);
      r && this.template.statements.push(r);
    }), console.log(`Parsed ${this.template.statements.length} statements`);
  }
  parseGroupedStatements() {
    const e = /(sub:st[\w.-]+)\s+a\s+[^;]*nt:GroupedStatement[^;]*;\s*nt:hasStatement\s+([^;.]+)/g;
    let t;
    for (; (t = e.exec(this.content)) !== null; ) {
      const r = t[1], n = t[2].split(",").map((o) => o.trim().replace(/^sub:/, ""));
      this.template.groupedStatements.push({ id: this.cleanUri(r), statements: n }), console.log(`Found grouped statement: ${r} with statements [${n.join(", ")}]`);
    }
  }
  findStatementIds() {
    const e = /* @__PURE__ */ new Set(), t = /nt:hasStatement\s+([^;.]+)/g;
    let r;
    for (; (r = t.exec(this.content)) !== null; ) r[1].split(",").map((i) => i.trim()).forEach((i) => {
      i.startsWith("sub:st") && e.add(i);
    });
    const n = /(sub:st[\w.-]+)\s+(?:a\s+nt:|rdf:)/g;
    for (; (r = n.exec(this.content)) !== null; ) e.add(r[1]);
    return Array.from(e).sort();
  }
  parseStatement(e) {
    const t = e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), r = new RegExp(`${t}\\s+(?:a\\s+[^;]+;\\s*)?(rdf:[\\s\\S]*?)(?=\\n\\s*(?:sub:[\\w.-]+|<[^>]+>)\\s+|\\n\\s*}|$)`, "i"), n = this.content.match(r);
    if (!n) return console.warn(`Could not find statement block for ${e}`), null;
    const o = n[1], i = o.match(/rdf:subject\s+(<[^>]+>|[\w:-]+)/), u = o.match(/rdf:predicate\s+(<[^>]+>|[\w:-]+)/), c = o.match(/rdf:object\s+(?:<([^>]+)>|([\w:-]+)|"([^"]+)")/);
    if (!i || !u || !c) return console.warn(`Incomplete statement ${e}:`, { subjMatch: !!i, predMatch: !!u, objMatch: !!c }), null;
    let d;
    c[1] ? d = c[1] : c[2] ? d = c[2] : c[3] && (d = c[3]);
    const a = n[0].match(/a\s+([^;.]+)/), l = a ? a[1].split(",").map((T) => T.trim()) : [], m = this.cleanUri(i[1]), _ = this.cleanUri(u[1]), C = this.cleanUri(d), x = i[1] === "nt:CREATOR", E = d === "nt:CREATOR", F = !x && this.isPlaceholder(m), N = this.isPlaceholder(_), j = !E && this.isPlaceholder(C) && !c[3], S = x ? "nt:CREATOR" : F ? null : this.expandUri(i[1]), te = this.expandUri(u[1]), ne = E ? "nt:CREATOR" : j || c[3] ? null : this.expandUri(d);
    return { id: this.cleanUri(e), subject: m, predicate: _, object: C, subjectIsPlaceholder: F, predicateIsPlaceholder: N, objectIsPlaceholder: j, subjectUri: S, predicateUri: te, objectUri: ne, isLiteralObject: !!c[3], repeatable: l.some((T) => T.includes("RepeatableStatement")), optional: l.some((T) => T.includes("OptionalStatement")), grouped: l.some((T) => T.includes("GroupedStatement")), types: l };
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
      const [t, r] = e.split(":", 2);
      if (this.template.prefixes[t]) return this.template.prefixes[t] + r;
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
    const t = {}, r = e.match(/nt:hasRegex\s+"([^"]+)"/);
    r && (t.regex = r[1]);
    const n = e.match(/nt:hasMinLength\s+"?(\d+)"?/);
    n && (t.minLength = parseInt(n[1]));
    const o = e.match(/nt:hasMaxLength\s+"?(\d+)"?/);
    return o && (t.maxLength = parseInt(o[1])), Object.keys(t).length > 0 ? t : void 0;
  }
  static async fetchAndParse(e) {
    let t = e;
    (e.startsWith("http://purl.org/np/") || e.startsWith("https://w3id.org/np/")) && (t = `https://np.petapico.org/${e.split("/").pop()}.trig`), console.log(`Fetching template from ${t}`);
    const r = await fetch(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    const n = await r.text();
    return await new q(n).parse();
  }
}
const re = { LiteralPlaceholder: (s) => {
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
  return console.log(`[RestrictedChoice] Rendering ${s.id} with ${((_a = s.options) == null ? void 0 : _a.length) || 0} options`), s.options && Array.isArray(s.options) ? s.options.forEach((t, r) => {
    const n = document.createElement("option");
    n.value = t.value || t, n.textContent = t.label || t.value || t, s.options.length === 1 && (n.selected = true), e.appendChild(n);
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
class se {
  constructor(e, t = {}) {
    this.template = e, this.options = { validateOnChange: true, showHelp: true, ...t }, this.labels = t.labels || e.labels || {}, this.formData = {}, this.eventListeners = { change: [], submit: [], preview: [] }, this.formElement = null;
  }
  getLabel(e) {
    var _a;
    if (!e) return "";
    if (e.startsWith("sub:") && !e.substring(4).includes(":")) {
      const t = e.replace(/^sub:/, ""), r = (_a = this.template.placeholders) == null ? void 0 : _a.find((n) => n.id === t);
      return (r == null ? void 0 : r.label) ? r.label : t.split(/[-_]/).map((n) => n.charAt(0).toUpperCase() + n.slice(1)).join(" ");
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
      const r = e.substring(0, t), n = e.substring(t + 1);
      if (this.template.prefixes && this.template.prefixes[r]) return this.template.prefixes[r] + n;
      const o = { dct: "http://purl.org/dc/terms/", foaf: "http://xmlns.com/foaf/0.1/", prov: "http://www.w3.org/ns/prov#", rdfs: "http://www.w3.org/2000/01/rdf-schema#", schema: "https://schema.org/", rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#" };
      if (o[r]) return o[r] + n;
    }
    return e;
  }
  parseUriLabel(e) {
    if (!e) return "";
    const t = { "dct:": "DC Terms: ", "foaf:": "FOAF: ", "prov:": "Provenance: ", "rdfs:": "RDFS: ", "schema:": "Schema: " };
    for (const [o, i] of Object.entries(t)) if (e.startsWith(o)) return e.substring(o.length).replace(/([a-z])([A-Z])/g, "$1 $2").split(/[-_]/).map((c) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()).join(" ");
    const r = e.split(/[#\/]/);
    let n = r[r.length - 1] || "";
    return !n && r.length > 1 && (n = r[r.length - 2]), n = n.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^(has|is)\s+/i, "").trim().split(" ").map((o) => o.charAt(0).toUpperCase() + o.slice(1).toLowerCase()).join(" "), n || e;
  }
  findPlaceholder(e) {
    var _a;
    if (!e) return null;
    const t = e.replace(/^sub:/, "");
    return (_a = this.template.placeholders) == null ? void 0 : _a.find((n) => n.id === t);
  }
  isFixedValue(e) {
    return !e || this.findPlaceholder(e) ? false : !!(e.startsWith("http") || e.startsWith("<") || !e.includes(":") && !e.includes("/") || e.includes(":"));
  }
  renderForm(e) {
    console.log("Rendering form with template:", this.template), this.formElement = document.createElement("form"), this.formElement.className = "nanopub-form";
    const t = document.createElement("div");
    t.className = "form-header";
    const r = document.createElement("h2");
    if (r.textContent = this.template.label || "Nanopublication Template", t.appendChild(r), this.template.description) {
      const o = document.createElement("p");
      o.className = "form-description", o.textContent = this.template.description, t.appendChild(o);
    }
    this.formElement.appendChild(t);
    const n = document.createElement("div");
    return n.className = "form-fields", this.renderFields(n), this.formElement.appendChild(n), this.formElement.appendChild(this.buildControls()), typeof e == "string" && (e = document.querySelector(e)), e && (e.innerHTML = "", e.appendChild(this.formElement), this.setupEventListeners()), this.formElement;
  }
  renderFields(e) {
    const t = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
    console.log("[renderFields] Processing statements...");
    let n = null, o = null;
    this.template.statements.forEach((i, u) => {
      const c = this.template.groupedStatements.find((l) => l.statements.includes(i.id));
      if (console.log(`  ${i.id}: parentGroup=${c == null ? void 0 : c.id}, processed=${t.has(c == null ? void 0 : c.id)}, subject=${i.subject}`), c && t.has(c.id)) {
        console.log("    \u2192 Skipping (group already processed)");
        return;
      }
      const d = this.findPlaceholder(i.subject), f = this.findPlaceholder(i.object), a = this.findPlaceholder(i.predicate);
      if (!d && !f && !a) {
        console.log("    \u2192 Skipping (all fixed - auto-filled statement)");
        return;
      }
      if (d && (d.type.includes("ExternalUriPlaceholder") || d.type.includes("UriPlaceholder")) && !a && !f) {
        console.log("    \u2192 Skipping (URI placeholder metadata statement)");
        return;
      }
      if (i.subject !== o) {
        if (n && (e.appendChild(n), n = null), this.template.statements.filter((m) => m.subject === i.subject).length > 1) {
          n = document.createElement("div"), n.className = "subject-group", n.style.cssText = "margin: 1.5rem 0; padding: 1.5rem; border: 2px solid #be2e78; border-radius: 8px; background: #f6d7e8; box-shadow: 0 1px 3px rgba(190, 46, 120, 0.1);";
          const m = this.findPlaceholder(i.subject);
          if (m && !r.has(m.id)) {
            const _ = document.createElement("div");
            _.className = "form-field subject-field";
            const C = document.createElement("label");
            C.className = "field-label subject-label", C.style.cssText = "font-weight: 600; font-size: 1.15em; color: #2b3456; margin-bottom: 0.75rem; display: block;", C.textContent = m.label || this.getLabel(i.subject), _.appendChild(C);
            const x = this.renderInput(m);
            if (x !== null) x.name = `${i.id}_subject`, x.id = `field_${i.id}_subject`, _.appendChild(x);
            else {
              const E = document.createElement("div");
              E.className = "field-value auto-generated", E.textContent = "(auto-generated)", _.appendChild(E);
            }
            n.appendChild(_), r.add(m.id);
          }
        }
        o = i.subject;
      }
      if (c) {
        console.log(`    \u2192 Rendering grouped statement ${c.id}`);
        const l = n || e;
        this.renderGroupedStatement(l, c, i, r), t.add(c.id);
      } else {
        console.log("    \u2192 Rendering individual statement");
        const l = n || e;
        this.renderStatement(l, i, r);
      }
    }), n && e.appendChild(n);
  }
  renderGroupedStatement(e, t, r, n = /* @__PURE__ */ new Set()) {
    const o = document.createElement("div");
    o.className = "form-field-group", r.repeatable && o.classList.add("repeatable-group"), r.optional && o.classList.add("optional-group");
    const i = t.statements.map((c) => this.template.statements.find((d) => d.id === c)).filter((c) => c), u = i[0];
    if (u) {
      const c = this.findPlaceholder(u.subject);
      if (c && !n.has(c.id)) {
        const d = document.createElement("div");
        d.className = "form-field";
        const f = document.createElement("label");
        f.className = "field-label", f.textContent = c.label || this.getLabel(u.subject), d.appendChild(f);
        const a = this.renderInput(c);
        a.name = `${u.id}_subject`, a.id = `field_${u.id}_subject`, d.appendChild(a), o.appendChild(d), n.add(c.id);
      }
    }
    i.forEach((c) => {
      this.renderStatementInGroup(o, c, n);
    }), r.repeatable && o.appendChild(this.buildRepeatableControls(r, null)), e.appendChild(o);
  }
  renderStatementInGroup(e, t, r = /* @__PURE__ */ new Set()) {
    console.log(`[renderStatementInGroup] ${t.id}:`, { predicate: t.predicate, object: t.object, isLiteralObject: t.isLiteralObject });
    const n = this.findPlaceholder(t.object), o = this.findPlaceholder(t.predicate);
    console.log("  objectPlaceholder:", n == null ? void 0 : n.id), console.log("  predicatePlaceholder:", o == null ? void 0 : o.id);
    const i = o && !r.has(o.id), u = n && !r.has(n.id);
    if (o && n && !i && !u) {
      console.log("  \u2192 SKIP (both placeholders already rendered)");
      return;
    }
    const c = this.getLabel(t.predicate);
    if (!n && !o) {
      console.log(`  \u2192 READONLY path: ${c} = ${t.object}`);
      const a = document.createElement("div");
      a.className = "form-field readonly-field";
      const l = document.createElement("label");
      l.className = "field-label", l.textContent = c;
      const m = document.createElement("div");
      m.className = "field-value", m.textContent = t.object, a.appendChild(l), a.appendChild(m), e.appendChild(a);
      return;
    }
    if (n && !u && !o) {
      console.log("  \u2192 SKIP (object placeholder already rendered)");
      return;
    }
    console.log("  \u2192 INPUT path");
    const d = document.createElement("div");
    d.className = "form-field", t.optional && (d.classList.add("optional"), setTimeout(() => {
      J(d, c);
    }, 0));
    const f = document.createElement("label");
    if (f.className = "field-label", f.textContent = c, d.appendChild(f), i) {
      const a = this.renderInput(o);
      a.name = `${t.id}_predicate`, a.id = `field_${t.id}_predicate`, d.appendChild(a), r.add(o.id);
    }
    if (u) {
      if (n.label) {
        const l = document.createElement("div");
        l.className = "field-help", l.textContent = n.label, d.appendChild(l);
      }
      const a = this.renderInput(n);
      a.name = t.id, a.id = `field_${t.id}`, d.appendChild(a), r.add(n.id);
    } else if (!n) {
      const a = document.createElement("div");
      a.className = "field-value", a.textContent = this.getLabel(t.object) || t.object, d.appendChild(a);
    }
    if (t.optional) {
      const a = document.createElement("span");
      a.className = "optional-badge", a.textContent = "optional", f.appendChild(a);
    }
    e.appendChild(d);
  }
  renderStatement(e, t, r = /* @__PURE__ */ new Set()) {
    const n = this.findPlaceholder(t.subject), o = this.findPlaceholder(t.predicate), i = this.findPlaceholder(t.object), u = this.getLabel(t.predicate), c = n && !r.has(n.id), d = o && !r.has(o.id), f = i && !r.has(i.id);
    if (!c && !d && !f && (o || i)) return;
    if (!o && !i && !c) {
      const l = document.createElement("div");
      l.className = "form-field readonly-field";
      const m = document.createElement("label");
      m.className = "field-label", m.textContent = u;
      const _ = document.createElement("div");
      _.className = "field-value", _.textContent = this.getLabel(t.object) || t.object, l.appendChild(m), l.appendChild(_), e.appendChild(l);
      return;
    }
    const a = document.createElement("div");
    if (a.className = "form-field", t.repeatable && a.classList.add("repeatable"), t.optional && (a.classList.add("optional"), setTimeout(() => {
      const l = o && o.label || u;
      J(a, l);
    }, 0)), c) {
      const l = document.createElement("label");
      l.className = "field-label", l.textContent = n.label || this.getLabel(t.subject), a.appendChild(l);
      const m = this.renderInput(n);
      if (m !== null) m.name = `${t.id}_subject`, m.id = `field_${t.id}_subject`, t.optional || (m.required = true), a.appendChild(m);
      else {
        const _ = document.createElement("div");
        _.className = "field-value auto-generated", _.textContent = "(auto-generated)", a.appendChild(_);
      }
      r.add(n.id);
    }
    if (d) {
      const l = document.createElement("label");
      l.className = "field-label", l.textContent = o.label || u, a.appendChild(l);
      const m = this.renderInput(o);
      m.name = `${t.id}_predicate`, m.id = `field_${t.id}_predicate`, t.optional || (m.required = true), a.appendChild(m), r.add(o.id);
    } else if (!o) {
      const l = document.createElement("label");
      if (l.className = "field-label", l.textContent = u, t.optional) {
        const m = document.createElement("span");
        m.className = "optional-badge", m.textContent = "optional", l.appendChild(m);
      }
      a.appendChild(l);
    }
    if (f) {
      const l = this.renderInput(i);
      if (l === null) {
        const m = document.createElement("div");
        m.className = "field-value auto-generated", m.textContent = i.label || t.object, a.appendChild(m);
      } else {
        if (i.label) {
          const m = document.createElement("div");
          m.className = "field-help", m.textContent = i.label, a.appendChild(m);
        }
        l.name = `${t.id}_object`, l.id = `field_${t.id}_object`, t.optional || (l.required = true), a.appendChild(l);
      }
      r.add(i.id);
    } else if (!i) {
      const l = document.createElement("div");
      l.className = "field-value", l.textContent = this.getLabel(t.object) || t.object, a.appendChild(l);
    }
    e.appendChild(a), t.repeatable && e.appendChild(this.buildRepeatableControls(t, null));
  }
  renderInput(e) {
    const t = e.type.split(",").map((n) => n.trim().replace(/^nt:/, ""));
    for (const n of t) {
      const o = re[n];
      if (o) return console.log(`Using component ${n} for placeholder ${e.id}`), o(e, this.options);
    }
    console.warn(`No component for types: ${e.type}`);
    const r = document.createElement("input");
    return r.type = "text", r.className = "form-input", r.placeholder = e.label || "", r;
  }
  buildRepeatableControls(e, t) {
    const r = document.createElement("div");
    r.className = "repeatable-controls", r.dataset.count = "1";
    const n = document.createElement("button");
    return n.type = "button", n.className = "btn-add-field", n.textContent = "+ Add Another", n.onclick = () => {
      const o = parseInt(r.dataset.count);
      r.dataset.count = o + 1;
      const i = this.buildRepeatableField(e, t, o);
      r.parentElement.insertBefore(i, r), this.emit("change", this.collectFormData());
    }, r.appendChild(n), r;
  }
  buildRepeatableField(e, t, r) {
    const n = document.createElement("div");
    n.className = "repeatable-field-group";
    const o = this.findPlaceholder(e.subject), i = this.findPlaceholder(e.predicate), u = this.findPlaceholder(e.object);
    let c = false;
    if (o) {
      const f = this.template.statements.filter((a) => a.subject === e.subject);
      c = f.length === 1, console.log(`[buildRepeatableField] Subject ${e.subject}:`, { occurrences: f.length, shouldRepeat: c });
    }
    if (o && c) {
      const f = document.createElement("div");
      f.className = "repeatable-field";
      const a = document.createElement("label");
      a.className = "field-label", a.textContent = o.label || this.getLabel(e.subject), f.appendChild(a);
      const l = this.renderInput(o);
      l.name = `${e.id}_subject_${r}`, l.id = `field_${e.id}_subject_${r}`, f.appendChild(l), n.appendChild(f);
    }
    if (i) {
      const f = document.createElement("div");
      f.className = "repeatable-field";
      const a = document.createElement("label");
      a.className = "field-label", a.textContent = i.label || this.getLabel(e.predicate), f.appendChild(a);
      const l = this.renderInput(i);
      l.name = `${e.id}_predicate_${r}`, l.id = `field_${e.id}_predicate_${r}`, f.appendChild(l), n.appendChild(f);
    }
    if (u) {
      const f = document.createElement("div");
      if (f.className = "repeatable-field", !i) {
        const l = document.createElement("label");
        l.className = "field-label", l.textContent = this.getLabel(e.predicate), f.appendChild(l);
      }
      if (u.label) {
        const l = document.createElement("div");
        l.className = "field-help", l.textContent = u.label, f.appendChild(l);
      }
      const a = this.renderInput(u);
      a.name = `${e.id}_object_${r}`, a.id = `field_${e.id}_object_${r}`, f.appendChild(a), n.appendChild(f);
    }
    const d = document.createElement("button");
    return d.type = "button", d.className = "btn-remove-field", d.textContent = "\xD7 Remove", d.onclick = () => {
      n.remove(), this.emit("change", this.collectFormData());
    }, n.appendChild(d), n;
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
    return this.formElement.querySelectorAll("input, select, textarea").forEach((r) => {
      r.name && r.value && (e[r.name] ? Array.isArray(e[r.name]) ? e[r.name].push(r.value) : e[r.name] = [e[r.name], r.value] : e[r.name] = r.value);
    }), e;
  }
  validateField(e) {
    let t = true, r = "";
    if (e.required && !e.value.trim()) t = false, r = "This field is required";
    else if (e.pattern && e.value) new RegExp(e.pattern).test(e.value) || (t = false, r = "Invalid format");
    else if (e.type === "url" && e.value) try {
      new URL(e.value);
    } catch {
      t = false, r = "Please enter a valid URL";
    }
    const n = e.closest(".form-field");
    if (n) {
      n.classList.toggle("error", !t);
      let o = n.querySelector(".error-message");
      t ? o && o.remove() : (o || (o = document.createElement("div"), o.className = "error-message", n.appendChild(o)), o.textContent = r);
    }
    return t;
  }
  validate() {
    const e = this.formElement.querySelectorAll("[required]");
    let t = true;
    const r = [];
    return e.forEach((n) => {
      this.validateField(n) || (t = false, r.push({ field: n.name, message: "Validation error" }));
    }), { isValid: t, errors: r };
  }
  on(e, t) {
    this.eventListeners[e] && this.eventListeners[e].push(t);
  }
  emit(e, t) {
    this.eventListeners[e] && this.eventListeners[e].forEach((r) => r(t));
  }
  destroy() {
    this.formElement && this.formElement.remove(), this.formElement = null, this.formData = {};
  }
}
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
  const r = t.querySelector(".optional-badge");
  r.style.cssText = `
    background: #e7f3ff;
    color: #0066cc;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.75em;
    font-weight: 600;
    margin-left: auto;
  `;
  const n = t.querySelector(".toggle-icon");
  n.style.cssText = `
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
  return i.className = "optional-content", i.style.cssText = `
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out, padding 0.3s ease-out;
    padding: 0;
  `, Array.from(s.children).forEach((d) => i.appendChild(d)), s.appendChild(t), s.appendChild(i), s.classList.add("collapsed"), t.addEventListener("click", () => {
    const d = s.classList.contains("collapsed");
    s.classList.toggle("collapsed"), d ? (n.style.transform = "rotate(90deg)", i.style.maxHeight = i.scrollHeight + "px", i.style.padding = "15px 0 0 0", t.style.background = "#e7f3ff", t.style.borderColor = "#0066cc", r.style.background = "#d1ecf1") : (n.style.transform = "rotate(0deg)", i.style.maxHeight = "0", i.style.padding = "0", t.style.background = "#f8f9fa", t.style.borderColor = "#dee2e6", r.style.background = "#e7f3ff");
  }), setTimeout(() => {
    const d = i.querySelectorAll("input, select, textarea");
    Array.from(d).some((a) => a.value && a.value.trim()) && s.classList.contains("collapsed") && t.click();
  }, 100), i.addEventListener("input", () => {
    s.classList.contains("collapsed") && t.click();
  }), s;
}
class oe {
  constructor(e) {
    var _a, _b;
    this.template = e, console.log("NanopubBuilder initialized with:", { uri: e.uri, labelPattern: e.labelPattern, types: ((_a = e.types) == null ? void 0 : _a.length) || 0, statements: ((_b = e.statements) == null ? void 0 : _b.length) || 0 });
  }
  async buildFromFormData(e, t = {}) {
    this.formData = e, this.metadata = t;
    const r = (/* @__PURE__ */ new Date()).toISOString(), n = this.generateRandomId(), o = `http://purl.org/nanopub/temp/${n}`;
    this.currentNanopubBaseUri = o;
    const i = this.buildPrefixes(n), u = this.buildHead(), c = this.buildAssertion(), d = this.buildProvenance(), f = this.buildPubinfo(r);
    return `${i}

${u}

${c}

${d}

${f}
`;
  }
  generateRandomId() {
    return Math.random().toString(36).substring(2, 15);
  }
  buildPrefixes(e) {
    const t = `http://purl.org/nanopub/temp/${e}`, r = [`@prefix this: <${t}> .`, `@prefix sub: <${t}#> .`, "@prefix np: <http://www.nanopub.org/nschema#> .", "@prefix dct: <http://purl.org/dc/terms/> .", "@prefix nt: <https://w3id.org/np/o/ntemplate/> .", "@prefix npx: <http://purl.org/nanopub/x/> .", "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .", "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .", "@prefix orcid: <https://orcid.org/> .", "@prefix prov: <http://www.w3.org/ns/prov#> .", "@prefix foaf: <http://xmlns.com/foaf/0.1/> .", "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ."];
    if (this.template.prefixes) for (const [n, o] of Object.entries(this.template.prefixes)) r.some((i) => i.includes(`@prefix ${n}:`)) || r.push(`@prefix ${n}: <${o}> .`);
    return r.join(`
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
    const e = [], t = this.template.statements.map((r) => r.id).sort((r, n) => {
      const o = parseInt(r.replace(/\D/g, "")), i = parseInt(n.replace(/\D/g, ""));
      return o - i;
    });
    for (const r of t) {
      const n = this.template.statements.find((i) => i.id === r);
      if (!n) continue;
      const o = this.getStatementInstances(n);
      for (const i of o) {
        const u = this.buildTriple(n, i);
        u && e.push(u);
      }
    }
    return `sub:assertion {
${e.join(`
`)}
}`;
  }
  getStatementInstances(e) {
    const t = [], r = this.getInstanceData(e, null);
    if (r && t.push(r), e.repeatable) for (let n = 1; n < 10; n++) {
      const o = this.getInstanceData(e, n);
      if (o) t.push(o);
      else break;
    }
    return t;
  }
  getInstanceData(e, t) {
    var _a, _b;
    const r = t ? `_${t}` : "", n = { subject: this.formData[`${e.id}_subject${r}`], predicate: this.formData[`${e.id}_predicate${r}`], object: this.formData[`${e.id}_object${r}`] }, o = (_a = this.template.placeholders) == null ? void 0 : _a.find((f) => f.id === e.subject), i = (_b = this.template.placeholders) == null ? void 0 : _b.find((f) => f.id === e.object);
    o && (o.isIntroducedResource || o.isLocalResource);
    const u = i && (i.isIntroducedResource || i.isLocalResource);
    if (!n.subject && e.subjectIsPlaceholder) {
      const f = e.subject, a = this.findPlaceholderValue(f);
      a && (n.subject = a);
    }
    if (!n.object && e.objectIsPlaceholder) {
      const f = e.object, a = this.findPlaceholderValue(f);
      a && (n.object = a);
    }
    n.subject && n.subject;
    const c = n.predicate && n.predicate !== "", d = n.object && n.object !== "";
    return e.optional && !d && !u || !e.optional && (e.objectIsPlaceholder && !d || e.predicateIsPlaceholder && !c) ? null : n;
  }
  buildTriple(e, t) {
    const r = this.metadata.creator || "https://orcid.org/0000-0000-0000-0000";
    let n = t.subject || e.subject, o;
    e.subjectUri === "nt:CREATOR" ? o = r.startsWith("orcid:") ? r : `orcid:${r.split("/").pop()}` : o = e.subjectIsPlaceholder ? this.resolveValue(n, e.subject) : this.formatUri(e.subjectUri);
    const i = t.predicate || e.predicate, u = e.predicateIsPlaceholder ? this.resolveValue(i, e.predicate) : this.formatUri(e.predicateUri);
    let c = t.object || e.object, d;
    return e.objectUri === "nt:CREATOR" ? d = r.startsWith("orcid:") ? r : `orcid:${r.split("/").pop()}` : d = e.objectIsPlaceholder ? this.resolveValue(c, e.object) : this.formatUri(e.objectUri), !o || !u || !d || o.startsWith("<") && o.endsWith(">") && !o.includes("://") || d.startsWith("<") && d.endsWith(">") && !d.includes("://") ? null : e.predicateUri === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" || u === "rdf:type" || u === "a" ? `  ${o} a ${d} .` : `  ${o} ${u} ${d} .`;
  }
  resolveValue(e, t) {
    var _a;
    if (!e || e === "") return null;
    if (e === "nt:CREATOR" || e === "CREATOR" || t === "nt:CREATOR" || t === "CREATOR") {
      const i = this.metadata.creator || "https://orcid.org/0000-0000-0000-0000";
      return i.startsWith("orcid:") ? i : `orcid:${i.split("/").pop()}`;
    }
    const r = t.replace("sub:", "");
    if (e === r || e === `sub:${r}`) return null;
    const n = (_a = this.template.placeholders) == null ? void 0 : _a.find((i) => i.id === r);
    if (n && (n.isIntroducedResource || n.isLocalResource)) return `<${this.currentNanopubBaseUri || "http://purl.org/nanopub/temp/unknown"}/${e}>`;
    if ((n == null ? void 0 : n.type) === "AutoEscapeUriPlaceholder" && n.prefix) {
      const i = encodeURIComponent(e).replace(/%20/g, "+");
      return `<${n.prefix}${i}>`;
    }
    if ((n == null ? void 0 : n.type) === "UriPlaceholder" || (n == null ? void 0 : n.type) === "GuidedChoicePlaceholder" || (n == null ? void 0 : n.type) === "ExternalUriPlaceholder" || e.startsWith("http://") || e.startsWith("https://")) return `<${e}>`;
    if (n == null ? void 0 : n.hasDatatype) return `"${e}"^^<${n.hasDatatype}>`;
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
    const t = this.metadata.creator || "https://orcid.org/0000-0002-1784-2920", r = this.metadata.creatorName || "Unknown", n = t.startsWith("orcid:") ? t : `orcid:${t.split("/").pop()}`, o = [`  ${n} foaf:name "${r}" .`, "", `  this: dct:created "${e}"^^xsd:dateTime;`, `    dct:creator ${n};`, "    dct:license <https://creativecommons.org/licenses/by/4.0/>"];
    if (((_a = this.template.types) == null ? void 0 : _a.length) > 0) {
      const u = this.template.types.map((c) => `<${c}>`).join(", ");
      o.push(`;
    npx:hasNanopubType ${u}`);
    }
    const i = [];
    for (const u of this.template.placeholders || []) if (u.isIntroducedResource) {
      const c = this.findPlaceholderValue(u.id);
      if (c) {
        const d = `${this.currentNanopubBaseUri}/${c}`;
        i.push(`<${d}>`);
      }
    }
    if (i.length > 0 && o.push(`;
    npx:introduces ${i.join(", ")}`), this.template.labelPattern) {
      const u = this.generateLabel();
      o.push(`;
    rdfs:label "${u}"`);
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
        const r = this.formData[`${t.id}_subject`];
        if (r) return r;
        if (t.repeatable) for (let n = 1; n < 10; n++) {
          const o = this.formData[`${t.id}_subject_${n}`];
          if (o) return o;
        }
      }
      if (t.object === e || t.object === `sub:${e}`) {
        const r = this.formData[`${t.id}_object`];
        if (r) return r;
        if (t.repeatable) for (let n = 1; n < 10; n++) {
          const o = this.formData[`${t.id}_object_${n}`];
          if (o) return o;
        }
      }
    }
    return null;
  }
  generateLabel() {
    let e = this.template.labelPattern || "Untitled";
    const t = [...e.matchAll(/\$\{(\w+)\}/g)];
    for (const r of t) {
      const n = r[1], o = this.findPlaceholderValue(n);
      o ? e = e.replace(r[0], o) : e = e.replace(r[0], "");
    }
    return e.trim();
  }
}
let p;
const Q = typeof TextDecoder < "u" ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }) : { decode: () => {
  throw Error("TextDecoder not available");
} };
typeof TextDecoder < "u" && Q.decode();
let A = null;
function W() {
  return (A === null || A.byteLength === 0) && (A = new Uint8Array(p.memory.buffer)), A;
}
function I(s, e) {
  return s = s >>> 0, Q.decode(W().subarray(s, s + e));
}
const L = new Array(128).fill(void 0);
L.push(void 0, null, true, false);
let D = L.length;
function b(s) {
  D === L.length && L.push(L.length + 1);
  const e = D;
  return D = L[e], L[e] = s, e;
}
function h(s) {
  return L[s];
}
function ie(s) {
  s < 132 || (L[s] = D, D = s);
}
function y(s) {
  const e = h(s);
  return ie(s), e;
}
let P = 0;
const B = typeof TextEncoder < "u" ? new TextEncoder("utf-8") : { encode: () => {
  throw Error("TextEncoder not available");
} }, ae = typeof B.encodeInto == "function" ? function(s, e) {
  return B.encodeInto(s, e);
} : function(s, e) {
  const t = B.encode(s);
  return e.set(t), { read: s.length, written: t.length };
};
function R(s, e, t) {
  if (t === void 0) {
    const u = B.encode(s), c = e(u.length, 1) >>> 0;
    return W().subarray(c, c + u.length).set(u), P = u.length, c;
  }
  let r = s.length, n = e(r, 1) >>> 0;
  const o = W();
  let i = 0;
  for (; i < r; i++) {
    const u = s.charCodeAt(i);
    if (u > 127) break;
    o[n + i] = u;
  }
  if (i !== r) {
    i !== 0 && (s = s.slice(i)), n = t(n, r, r = i + s.length * 3, 1) >>> 0;
    const u = W().subarray(n + i, n + r), c = ae(s, u);
    i += c.written, n = t(n, r, i, 1) >>> 0;
  }
  return P = i, n;
}
function k(s) {
  return s == null;
}
let M = null;
function g() {
  return (M === null || M.byteLength === 0) && (M = new Int32Array(p.memory.buffer)), M;
}
let O = null;
function le() {
  return (O === null || O.byteLength === 0) && (O = new Float64Array(p.memory.buffer)), O;
}
function H(s) {
  const e = typeof s;
  if (e == "number" || e == "boolean" || s == null) return `${s}`;
  if (e == "string") return `"${s}"`;
  if (e == "symbol") {
    const n = s.description;
    return n == null ? "Symbol" : `Symbol(${n})`;
  }
  if (e == "function") {
    const n = s.name;
    return typeof n == "string" && n.length > 0 ? `Function(${n})` : "Function";
  }
  if (Array.isArray(s)) {
    const n = s.length;
    let o = "[";
    n > 0 && (o += H(s[0]));
    for (let i = 1; i < n; i++) o += ", " + H(s[i]);
    return o += "]", o;
  }
  const t = /\[object ([^\]]+)\]/.exec(toString.call(s));
  let r;
  if (t.length > 1) r = t[1];
  else return toString.call(s);
  if (r == "Object") try {
    return "Object(" + JSON.stringify(s) + ")";
  } catch {
    return "Object";
  }
  return s instanceof Error ? `${s.name}: ${s.message}
${s.stack}` : r;
}
const X = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((s) => {
  p.__wbindgen_export_2.get(s.dtor)(s.a, s.b);
});
function ce(s, e, t, r) {
  const n = { a: s, b: e, cnt: 1, dtor: t }, o = (...i) => {
    n.cnt++;
    const u = n.a;
    n.a = 0;
    try {
      return r(u, n.b, ...i);
    } finally {
      --n.cnt === 0 ? (p.__wbindgen_export_2.get(n.dtor)(u, n.b), X.unregister(n)) : n.a = u;
    }
  };
  return o.original = n, X.register(o, n, n), o;
}
function de(s, e, t) {
  p._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h15d348a8f539de58(s, e, b(t));
}
function w(s, e) {
  try {
    return s.apply(this, e);
  } catch (t) {
    p.__wbindgen_exn_store(b(t));
  }
}
function ue(s, e, t, r) {
  p.wasm_bindgen__convert__closures__invoke2_mut__h2c289313db95095e(s, e, b(t), b(r));
}
function Y(s, e) {
  if (!(s instanceof e)) throw new Error(`expected instance of ${e.name}`);
  return s.ptr;
}
let V = 128;
function pe(s) {
  if (V == 1) throw new Error("out of js stack");
  return L[--V] = s, V;
}
const fe = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((s) => p.__wbg_keypair_free(s >>> 0));
class he {
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, fe.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    p.__wbg_keypair_free(e);
  }
  constructor() {
    try {
      const n = p.__wbindgen_add_to_stack_pointer(-16);
      p.keypair_new(n);
      var e = g()[n / 4 + 0], t = g()[n / 4 + 1], r = g()[n / 4 + 2];
      if (r) throw y(t);
      return this.__wbg_ptr = e >>> 0, this;
    } finally {
      p.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toJs() {
    try {
      const n = p.__wbindgen_add_to_stack_pointer(-16);
      p.keypair_toJs(n, this.__wbg_ptr);
      var e = g()[n / 4 + 0], t = g()[n / 4 + 1], r = g()[n / 4 + 2];
      if (r) throw y(t);
      return y(e);
    } finally {
      p.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
const Z = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((s) => p.__wbg_nanopub_free(s >>> 0));
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
    p.__wbg_nanopub_free(e);
  }
  constructor(e) {
    try {
      const o = p.__wbindgen_add_to_stack_pointer(-16);
      p.nanopub_new(o, b(e));
      var t = g()[o / 4 + 0], r = g()[o / 4 + 1], n = g()[o / 4 + 2];
      if (n) throw y(r);
      return this.__wbg_ptr = t >>> 0, this;
    } finally {
      p.__wbindgen_add_to_stack_pointer(16);
    }
  }
  check() {
    try {
      const n = this.__destroy_into_raw(), o = p.__wbindgen_add_to_stack_pointer(-16);
      p.nanopub_check(o, n);
      var e = g()[o / 4 + 0], t = g()[o / 4 + 1], r = g()[o / 4 + 2];
      if (r) throw y(t);
      return U.__wrap(e);
    } finally {
      p.__wbindgen_add_to_stack_pointer(16);
    }
  }
  sign(e) {
    try {
      const o = this.__destroy_into_raw(), i = p.__wbindgen_add_to_stack_pointer(-16);
      Y(e, K), p.nanopub_sign(i, o, e.__wbg_ptr);
      var t = g()[i / 4 + 0], r = g()[i / 4 + 1], n = g()[i / 4 + 2];
      if (n) throw y(r);
      return U.__wrap(t);
    } finally {
      p.__wbindgen_add_to_stack_pointer(16);
    }
  }
  publish(e, t) {
    try {
      const o = this.__destroy_into_raw();
      var r = k(t) ? 0 : R(t, p.__wbindgen_malloc, p.__wbindgen_realloc), n = P;
      const i = p.nanopub_publish(o, pe(e), r, n);
      return y(i);
    } finally {
      L[V++] = void 0;
    }
  }
  static fetch(e) {
    const t = R(e, p.__wbindgen_malloc, p.__wbindgen_realloc), r = P, n = p.nanopub_fetch(t, r);
    return y(n);
  }
  static publish_intro(e, t) {
    Y(e, K);
    const r = R(t, p.__wbindgen_malloc, p.__wbindgen_realloc), n = P, o = p.nanopub_publish_intro(e.__wbg_ptr, r, n);
    return y(o);
  }
  rdf() {
    let e, t;
    try {
      const d = p.__wbindgen_add_to_stack_pointer(-16);
      p.nanopub_rdf(d, this.__wbg_ptr);
      var r = g()[d / 4 + 0], n = g()[d / 4 + 1], o = g()[d / 4 + 2], i = g()[d / 4 + 3], u = r, c = n;
      if (i) throw u = 0, c = 0, y(o);
      return e = u, t = c, I(u, c);
    } finally {
      p.__wbindgen_add_to_stack_pointer(16), p.__wbindgen_free(e, t, 1);
    }
  }
  info() {
    try {
      const n = p.__wbindgen_add_to_stack_pointer(-16);
      p.nanopub_info(n, this.__wbg_ptr);
      var e = g()[n / 4 + 0], t = g()[n / 4 + 1], r = g()[n / 4 + 2];
      if (r) throw y(t);
      return y(e);
    } finally {
      p.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toString() {
    let e, t;
    try {
      const o = p.__wbindgen_add_to_stack_pointer(-16);
      p.nanopub_toString(o, this.__wbg_ptr);
      var r = g()[o / 4 + 0], n = g()[o / 4 + 1];
      return e = r, t = n, I(r, n);
    } finally {
      p.__wbindgen_add_to_stack_pointer(16), p.__wbindgen_free(e, t, 1);
    }
  }
}
const be = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((s) => p.__wbg_npprofile_free(s >>> 0));
class K {
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, be.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    p.__wbg_npprofile_free(e);
  }
  __getClassname() {
    let e, t;
    try {
      const o = p.__wbindgen_add_to_stack_pointer(-16);
      p.npprofile___getClassname(o, this.__wbg_ptr);
      var r = g()[o / 4 + 0], n = g()[o / 4 + 1];
      return e = r, t = n, I(r, n);
    } finally {
      p.__wbindgen_add_to_stack_pointer(16), p.__wbindgen_free(e, t, 1);
    }
  }
  constructor(e, t, r, n) {
    try {
      const _ = p.__wbindgen_add_to_stack_pointer(-16), C = R(e, p.__wbindgen_malloc, p.__wbindgen_realloc), x = P;
      var o = k(t) ? 0 : R(t, p.__wbindgen_malloc, p.__wbindgen_realloc), i = P, u = k(r) ? 0 : R(r, p.__wbindgen_malloc, p.__wbindgen_realloc), c = P, d = k(n) ? 0 : R(n, p.__wbindgen_malloc, p.__wbindgen_realloc), f = P;
      p.npprofile_new(_, C, x, o, i, u, c, d, f);
      var a = g()[_ / 4 + 0], l = g()[_ / 4 + 1], m = g()[_ / 4 + 2];
      if (m) throw y(l);
      return this.__wbg_ptr = a >>> 0, this;
    } finally {
      p.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toString() {
    let e, t;
    try {
      const o = p.__wbindgen_add_to_stack_pointer(-16);
      p.npprofile_toString(o, this.__wbg_ptr);
      var r = g()[o / 4 + 0], n = g()[o / 4 + 1];
      return e = r, t = n, I(r, n);
    } finally {
      p.__wbindgen_add_to_stack_pointer(16), p.__wbindgen_free(e, t, 1);
    }
  }
  toJs() {
    try {
      const n = p.__wbindgen_add_to_stack_pointer(-16);
      p.npprofile_toJs(n, this.__wbg_ptr);
      var e = g()[n / 4 + 0], t = g()[n / 4 + 1], r = g()[n / 4 + 2];
      if (r) throw y(t);
      return y(e);
    } finally {
      p.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
async function me(s, e) {
  if (typeof Response == "function" && s instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function") try {
      return await WebAssembly.instantiateStreaming(s, e);
    } catch (r) {
      if (s.headers.get("Content-Type") != "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", r);
      else throw r;
    }
    const t = await s.arrayBuffer();
    return await WebAssembly.instantiate(t, e);
  } else {
    const t = await WebAssembly.instantiate(s, e);
    return t instanceof WebAssembly.Instance ? { instance: t, module: s } : t;
  }
}
function ge() {
  const s = {};
  return s.wbg = {}, s.wbg.__wbg_nanopub_new = function(e) {
    const t = U.__wrap(e);
    return b(t);
  }, s.wbg.__wbindgen_string_new = function(e, t) {
    const r = I(e, t);
    return b(r);
  }, s.wbg.__wbg_call_b3ca7c6051f9bec1 = function() {
    return w(function(e, t, r) {
      const n = h(e).call(h(t), h(r));
      return b(n);
    }, arguments);
  }, s.wbg.__wbindgen_object_drop_ref = function(e) {
    y(e);
  }, s.wbg.__wbg_abort_2aa7521d5690750e = function(e) {
    h(e).abort();
  }, s.wbg.__wbg_new_72fb9a18b5ae2624 = function() {
    const e = new Object();
    return b(e);
  }, s.wbg.__wbg_set_1f9b04f170055d33 = function() {
    return w(function(e, t, r) {
      return Reflect.set(h(e), h(t), h(r));
    }, arguments);
  }, s.wbg.__wbg_new_ab6fd82b10560829 = function() {
    return w(function() {
      const e = new Headers();
      return b(e);
    }, arguments);
  }, s.wbg.__wbindgen_object_clone_ref = function(e) {
    const t = h(e);
    return b(t);
  }, s.wbg.__wbg_new_0d76b0581eca6298 = function() {
    return w(function() {
      const e = new AbortController();
      return b(e);
    }, arguments);
  }, s.wbg.__wbg_signal_a61f78a3478fd9bc = function(e) {
    const t = h(e).signal;
    return b(t);
  }, s.wbg.__wbg_append_7bfcb4937d1d5e29 = function() {
    return w(function(e, t, r, n, o) {
      h(e).append(I(t, r), I(n, o));
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
    const r = h(t).url, n = R(r, p.__wbindgen_malloc, p.__wbindgen_realloc), o = P;
    g()[e / 4 + 1] = o, g()[e / 4 + 0] = n;
  }, s.wbg.__wbg_headers_9620bfada380764a = function(e) {
    const t = h(e).headers;
    return b(t);
  }, s.wbg.__wbg_iterator_2cee6dadfd956dfa = function() {
    return b(Symbol.iterator);
  }, s.wbg.__wbg_get_e3c254076557e348 = function() {
    return w(function(e, t) {
      const r = Reflect.get(h(e), h(t));
      return b(r);
    }, arguments);
  }, s.wbg.__wbindgen_is_function = function(e) {
    return typeof h(e) == "function";
  }, s.wbg.__wbg_call_27c0f87801dedf93 = function() {
    return w(function(e, t) {
      const r = h(e).call(h(t));
      return b(r);
    }, arguments);
  }, s.wbg.__wbindgen_is_object = function(e) {
    const t = h(e);
    return typeof t == "object" && t !== null;
  }, s.wbg.__wbg_next_40fc327bfc8770e6 = function(e) {
    const t = h(e).next;
    return b(t);
  }, s.wbg.__wbg_next_196c84450b364254 = function() {
    return w(function(e) {
      const t = h(e).next();
      return b(t);
    }, arguments);
  }, s.wbg.__wbg_done_298b57d23c0fc80c = function(e) {
    return h(e).done;
  }, s.wbg.__wbg_value_d93c65011f51a456 = function(e) {
    const t = h(e).value;
    return b(t);
  }, s.wbg.__wbg_stringify_8887fe74e1c50d81 = function() {
    return w(function(e) {
      const t = JSON.stringify(h(e));
      return b(t);
    }, arguments);
  }, s.wbg.__wbindgen_string_get = function(e, t) {
    const r = h(t), n = typeof r == "string" ? r : void 0;
    var o = k(n) ? 0 : R(n, p.__wbindgen_malloc, p.__wbindgen_realloc), i = P;
    g()[e / 4 + 1] = i, g()[e / 4 + 0] = o;
  }, s.wbg.__wbg_text_450a059667fd91fd = function() {
    return w(function(e) {
      const t = h(e).text();
      return b(t);
    }, arguments);
  }, s.wbg.__wbg_new0_7d84e5b2cd9fdc73 = function() {
    return b(/* @__PURE__ */ new Date());
  }, s.wbg.__wbg_getTime_2bc4375165f02d15 = function(e) {
    return h(e).getTime();
  }, s.wbg.__wbg_crypto_1d1f22824a6a080c = function(e) {
    const t = h(e).crypto;
    return b(t);
  }, s.wbg.__wbg_process_4a72847cc503995b = function(e) {
    const t = h(e).process;
    return b(t);
  }, s.wbg.__wbg_versions_f686565e586dd935 = function(e) {
    const t = h(e).versions;
    return b(t);
  }, s.wbg.__wbg_node_104a2ff8d6ea03a2 = function(e) {
    const t = h(e).node;
    return b(t);
  }, s.wbg.__wbindgen_is_string = function(e) {
    return typeof h(e) == "string";
  }, s.wbg.__wbg_require_cca90b1a94a0255b = function() {
    return w(function() {
      const e = module.require;
      return b(e);
    }, arguments);
  }, s.wbg.__wbg_msCrypto_eb05e62b530a1508 = function(e) {
    const t = h(e).msCrypto;
    return b(t);
  }, s.wbg.__wbg_newwithlength_e9b4878cebadb3d3 = function(e) {
    const t = new Uint8Array(e >>> 0);
    return b(t);
  }, s.wbg.__wbindgen_memory = function() {
    const e = p.memory;
    return b(e);
  }, s.wbg.__wbg_buffer_12d079cc21e14bdb = function(e) {
    const t = h(e).buffer;
    return b(t);
  }, s.wbg.__wbg_newwithbyteoffsetandlength_aa4a17c33a06e5cb = function(e, t, r) {
    const n = new Uint8Array(h(e), t >>> 0, r >>> 0);
    return b(n);
  }, s.wbg.__wbg_randomFillSync_5c9c955aa56b6049 = function() {
    return w(function(e, t) {
      h(e).randomFillSync(y(t));
    }, arguments);
  }, s.wbg.__wbg_subarray_a1f73cd4b5b42fe1 = function(e, t, r) {
    const n = h(e).subarray(t >>> 0, r >>> 0);
    return b(n);
  }, s.wbg.__wbg_getRandomValues_3aa56aa6edec874c = function() {
    return w(function(e, t) {
      h(e).getRandomValues(h(t));
    }, arguments);
  }, s.wbg.__wbg_new_63b92bc8671ed464 = function(e) {
    const t = new Uint8Array(h(e));
    return b(t);
  }, s.wbg.__wbg_set_a47bac70306a19a7 = function(e, t, r) {
    h(e).set(h(t), r >>> 0);
  }, s.wbg.__wbg_self_ce0dbfc45cf2f5be = function() {
    return w(function() {
      const e = self.self;
      return b(e);
    }, arguments);
  }, s.wbg.__wbg_window_c6fb939a7f436783 = function() {
    return w(function() {
      const e = window.window;
      return b(e);
    }, arguments);
  }, s.wbg.__wbg_globalThis_d1e6af4856ba331b = function() {
    return w(function() {
      const e = globalThis.globalThis;
      return b(e);
    }, arguments);
  }, s.wbg.__wbg_global_207b558942527489 = function() {
    return w(function() {
      const e = global.global;
      return b(e);
    }, arguments);
  }, s.wbg.__wbindgen_is_undefined = function(e) {
    return h(e) === void 0;
  }, s.wbg.__wbg_newnoargs_e258087cd0daa0ea = function(e, t) {
    const r = new Function(I(e, t));
    return b(r);
  }, s.wbg.__wbg_new_16b304a2cfa7ff4a = function() {
    const e = new Array();
    return b(e);
  }, s.wbg.__wbg_apply_0a5aa603881e6d79 = function() {
    return w(function(e, t, r) {
      const n = Reflect.apply(h(e), h(t), h(r));
      return b(n);
    }, arguments);
  }, s.wbg.__wbindgen_number_get = function(e, t) {
    const r = h(t), n = typeof r == "number" ? r : void 0;
    le()[e / 8 + 1] = k(n) ? 0 : n, g()[e / 4 + 0] = !k(n);
  }, s.wbg.__wbg_new_81740750da40724f = function(e, t) {
    try {
      var r = { a: e, b: t }, n = (i, u) => {
        const c = r.a;
        r.a = 0;
        try {
          return ue(c, r.b, i, u);
        } finally {
          r.a = c;
        }
      };
      const o = new Promise(n);
      return b(o);
    } finally {
      r.a = r.b = 0;
    }
  }, s.wbg.__wbg_set_f975102236d3c502 = function(e, t, r) {
    h(e)[y(t)] = y(r);
  }, s.wbg.__wbindgen_cb_drop = function(e) {
    const t = y(e).original;
    return t.cnt-- == 1 ? (t.a = 0, true) : false;
  }, s.wbg.__wbg_has_0af94d20077affa2 = function() {
    return w(function(e, t) {
      return Reflect.has(h(e), h(t));
    }, arguments);
  }, s.wbg.__wbg_fetch_eadcbc7351113537 = function(e) {
    const t = fetch(h(e));
    return b(t);
  }, s.wbg.__wbg_fetch_921fad6ef9e883dd = function(e, t) {
    const r = h(e).fetch(h(t));
    return b(r);
  }, s.wbg.__wbindgen_debug_string = function(e, t) {
    const r = H(h(t)), n = R(r, p.__wbindgen_malloc, p.__wbindgen_realloc), o = P;
    g()[e / 4 + 1] = o, g()[e / 4 + 0] = n;
  }, s.wbg.__wbindgen_throw = function(e, t) {
    throw new Error(I(e, t));
  }, s.wbg.__wbg_then_0c86a60e8fcfe9f6 = function(e, t) {
    const r = h(e).then(h(t));
    return b(r);
  }, s.wbg.__wbg_queueMicrotask_481971b0d87f3dd4 = function(e) {
    queueMicrotask(h(e));
  }, s.wbg.__wbg_then_a73caa9a87991566 = function(e, t, r) {
    const n = h(e).then(h(t), h(r));
    return b(n);
  }, s.wbg.__wbg_queueMicrotask_3cbae2ec6b6cd3d6 = function(e) {
    const t = h(e).queueMicrotask;
    return b(t);
  }, s.wbg.__wbg_resolve_b0083a7967828ec8 = function(e) {
    const t = Promise.resolve(h(e));
    return b(t);
  }, s.wbg.__wbg_newwithstrandinit_3fd6fba4083ff2d0 = function() {
    return w(function(e, t, r) {
      const n = new Request(I(e, t), h(r));
      return b(n);
    }, arguments);
  }, s.wbg.__wbindgen_closure_wrapper3118 = function(e, t, r) {
    const n = ce(e, t, 173, de);
    return b(n);
  }, s;
}
function _e(s, e) {
  return p = s.exports, ee.__wbindgen_wasm_module = e, O = null, M = null, A = null, p.__wbindgen_start(), p;
}
async function ee(s) {
  if (p !== void 0) return p;
  typeof s > "u" && (s = new URL("/nanopub-create/assets/web_bg-CaMmR8bt.wasm", import.meta.url));
  const e = ge();
  (typeof s == "string" || typeof Request == "function" && s instanceof Request || typeof URL == "function" && s instanceof URL) && (s = fetch(s));
  const { instance: t, module: r } = await me(await s, e);
  return _e(t, r);
}
class we {
  constructor(e = {}) {
    this.options = { publishServer: e.publishServer || "https://np.petapico.org", theme: e.theme || "default", validateOnChange: e.validateOnChange !== false, showHelp: e.showHelp !== false, ...e }, this.template = null, this.formGenerator = null, this.builder = null, this.formData = {}, this.container = null, this.wasmInitialized = false, this.profile = null, this.credentials = null, this.listeners = { change: [], submit: [], error: [], publish: [], profileNeeded: [] }, this.initWasm(), this.loadCredentials();
  }
  async initWasm() {
    if (!this.wasmInitialized) try {
      await ee(), this.wasmInitialized = true, console.log("\u2713 WASM initialized successfully");
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
      const t = new he().toJs();
      return { privateKey: t.private, publicKey: t.public };
    } catch (e) {
      throw console.error("Key generation failed:", e), new Error("Failed to generate RSA keys");
    }
  }
  async setupProfile(e, t) {
    await this.ensureWasm();
    const r = this.normalizeOrcid(t);
    try {
      const n = await this.generateKeys();
      return this.profile = { name: e, orcid: r }, this.credentials = { ...n, orcid: r, name: e }, this.saveCredentials(), console.log("\u2713 Profile setup complete"), console.log("  ORCID:", r), console.log("  Name:", e), this.profile;
    } catch (n) {
      throw console.error("Profile setup failed:", n), n;
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
      this.template = await q.fetchAndParse(e), this.template.uri = this.template.uri || e, this.formGenerator = new se(this.template, { validateOnChange: this.options.validateOnChange, showHelp: this.options.showHelp, labels: this.template.labels }), this.formGenerator.on("change", (r) => {
        this.formData = r, this.emit("change", r);
      }), this.formGenerator.on("submit", async (r) => {
        if (this.formData = r.formData || r, !this.hasProfile()) {
          this.emit("profileNeeded", {});
          return;
        }
        try {
          const n = await this.generateNanopub();
          this.emit("submit", { trigContent: n, formData: this.formData });
        } catch (n) {
          this.emit("error", { type: "generation", error: n });
        }
      }), this.formGenerator.renderForm(t), this.builder = new oe(this.template);
    } catch (r) {
      throw this.emit("error", { type: "template", error: r }), r;
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
      const t = this.credentials.orcid || this.profile.orcid, r = this.credentials.name || this.profile.name;
      if (!t || !t.startsWith("https://orcid.org/")) throw new Error(`Invalid ORCID format: ${t}. Must start with https://orcid.org/`);
      console.log("\u{1F510} Creating profile and signing..."), console.log("  ORCID:", t), console.log("  Name:", r);
      const n = new K(this.credentials.privateKey, t, r);
      console.log("\u2705 Profile created"), console.log("\u{1F4DD} Signing nanopub...");
      const i = new U(e).sign(n);
      console.log("\u2705 Signed successfully"), console.log("  Signed type:", typeof i);
      const u = i.rdf();
      if (!this.options.publishServer) return console.log("\u{1F4E5} Download-only mode (no publish server configured)"), this.emit("publish", { uri: null, signedContent: u, downloadOnly: true }), { signedContent: u, downloadOnly: true };
      console.log("\u{1F4E4} Publishing to network..."), console.log("   Server:", this.options.publishServer);
      const c = await i.publish(n, this.options.publishServer);
      console.log("\u2705 Published successfully!"), console.log("\u{1F310} Result:", c);
      const d = typeof c == "string" ? c : c.uri || c.nanopub_uri;
      return this.emit("publish", { uri: d, signedContent: u }), { uri: d, nanopub_uri: d, signedContent: u };
    } catch (t) {
      throw console.error("\u274C Sign/Publish failed:", t), console.error("Error details:", t.message), this.emit("error", { type: "publish", error: t }), t;
    }
  }
  on(e, t) {
    this.listeners[e] && this.listeners[e].push(t);
  }
  emit(e, t) {
    this.listeners[e] && this.listeners[e].forEach((r) => r(t));
  }
}
let v = null, G = "";
async function ye() {
  try {
    v = new we({ publishServer: null }), v.on("change", (s) => {
      console.log("Form data changed:", s);
    }), v.on("submit", (s) => {
      console.log("Generated nanopub:", s.trigContent), G = s.trigContent, xe(s.trigContent);
    }), v.on("error", (s) => {
      console.error("Error:", s.type, s.error), $(`Error (${s.type}): ${s.error.message}`, "error");
    }), v.on("profileNeeded", () => {
      $("Please setup your profile first to sign nanopublications", "warning");
    }), console.log("\u2713 Creator initialized successfully"), z();
  } catch (s) {
    console.error("Failed to initialize:", s), $("Failed to initialize: " + s.message, "error");
  }
}
function z() {
  const s = document.getElementById("profile-status"), e = document.getElementById("profile-setup"), t = document.getElementById("profile-info");
  if (v.hasProfile()) {
    const r = v.getProfile();
    s.textContent = "Configured", s.className = "status success", e.classList.add("hidden"), t.classList.remove("hidden"), document.getElementById("profile-name").textContent = r.name;
    const n = document.getElementById("profile-orcid");
    r.orcid ? (n.textContent = r.orcid, n.href = r.orcid) : (n.textContent = "Not provided", n.href = "#");
    const o = v.exportKeys();
    document.getElementById("public-key-preview").textContent = o.publicKey;
  } else s.textContent = "Not configured", s.className = "status warning", e.classList.remove("hidden"), t.classList.add("hidden");
}
document.getElementById("setup-btn").addEventListener("click", async () => {
  const s = document.getElementById("name-input").value.trim(), e = document.getElementById("orcid-input").value.trim(), t = document.getElementById("setup-message"), r = document.getElementById("setup-btn");
  if (!s) {
    t.innerHTML = '<div class="error-message">Please enter your name</div>';
    return;
  }
  try {
    r.disabled = true, r.textContent = "Generating keys...", t.innerHTML = '<div class="info-message">\u2699\uFE0F Generating RSA keypair with nanopub-rs WASM...<br>This may take a few seconds.</div>', await v.setupProfile(s, e || null), t.innerHTML = '<div class="success-message">Profile created successfully! Your keys are stored in this browser.</div>', z(), setTimeout(() => {
      t.innerHTML = "";
    }, 5e3);
  } catch (n) {
    console.error("Profile setup failed:", n), t.innerHTML = `<div class="error-message">Failed: ${n.message}</div>`;
  } finally {
    r.disabled = false, r.textContent = "Generate Keys & Save Profile";
  }
});
document.getElementById("import-file").addEventListener("change", async (s) => {
  const e = s.target.files[0];
  if (!e) return;
  const t = document.getElementById("setup-message");
  try {
    const r = await e.text(), n = JSON.parse(r);
    if (!n.privateKey || !n.publicKey || !n.name) throw new Error("Invalid profile file format");
    v.importKeys(n), z(), t.innerHTML = '<div class="success-message">\u2713 Profile imported successfully!</div>', setTimeout(() => {
      t.innerHTML = "";
    }, 3e3);
  } catch (r) {
    console.error("Import failed:", r), t.innerHTML = `<div class="error-message">Import failed: ${r.message}</div>`;
  }
  s.target.value = "";
});
document.getElementById("export-btn").addEventListener("click", () => {
  try {
    const s = v.getProfile(), e = v.exportKeys(), t = { name: s.name, orcid: s.orcid, privateKey: e.privateKey, publicKey: e.publicKey, exportedAt: (/* @__PURE__ */ new Date()).toISOString() }, r = new Blob([JSON.stringify(t, null, 2)], { type: "application/json" }), n = URL.createObjectURL(r), o = document.createElement("a");
    o.href = n, o.download = `nanopub-profile-${s.name.replace(/\s+/g, "-").toLowerCase()}.json`, o.click(), URL.revokeObjectURL(n), $("\u2713 Profile exported!", "success");
  } catch (s) {
    console.error("Export failed:", s), $("Export failed: " + s.message, "error");
  }
});
document.getElementById("clear-btn").addEventListener("click", () => {
  confirm("Are you sure you want to clear your profile and keys? Make sure to export first if you want to keep them.") && (v.clearCredentials(), z(), $("Profile cleared", "info"));
});
document.getElementById("load-template-btn").addEventListener("click", async () => {
  const s = document.getElementById("template-uri").value.trim(), e = document.getElementById("template-container"), t = document.getElementById("template-message"), r = document.getElementById("load-template-btn");
  if (!s) {
    t.innerHTML = '<div class="error-message">Please enter a template URI</div>';
    return;
  }
  try {
    r.disabled = true, r.textContent = "Loading...", e.innerHTML = '<div class="loading">\u23F3 Loading template from network...</div>', t.innerHTML = "", await v.renderFromTemplateUri(s, e), t.innerHTML = '<div class="success-message">\u2713 Template loaded successfully!</div>', e.classList.add("template-loaded"), setTimeout(() => {
      t.innerHTML = "";
    }, 3e3);
  } catch (n) {
    console.error("Template load failed:", n), t.innerHTML = `<div class="error-message">Failed to load template: ${n.message}</div>`, e.innerHTML = '<div class="error-message">Failed to load template. Check console for details.</div>';
  } finally {
    r.disabled = false, r.textContent = "Load Template";
  }
});
function xe(s) {
  document.getElementById("preview-text").textContent = s, document.getElementById("preview-section").classList.remove("hidden");
}
document.getElementById("copy-btn").addEventListener("click", () => {
  const s = document.getElementById("preview-text").textContent;
  navigator.clipboard.writeText(s).then(() => {
    $("\u2713 Copied to clipboard!", "success");
  });
});
document.getElementById("sign-download-btn").addEventListener("click", () => {
  ve();
});
async function ve() {
  if (!G) {
    $("No nanopublication to sign", "warning");
    return;
  }
  if (!v.hasProfile()) {
    $("Please setup your profile first", "warning");
    return;
  }
  const s = document.getElementById("sign-download-btn");
  try {
    s.disabled = true, s.textContent = "Signing...", $("\u{1F510} Signing nanopublication...", "info");
    let t = (await v.publish(G)).signedContent.replace(/##/g, "#");
    const r = v.getProfile(), o = `nanopub-signed-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.trig`, i = new Blob([t], { type: "application/trig" }), u = URL.createObjectURL(i), c = document.createElement("a");
    c.href = u, c.download = o, c.click(), URL.revokeObjectURL(u), $("\u2705 Signed nanopub downloaded!", "success"), document.getElementById("preview-text").textContent = t;
  } catch (e) {
    console.error("Sign failed:", e), $(`Sign failed: ${e.message}`, "error");
  } finally {
    s.disabled = false, s.textContent = "Sign & Download";
  }
}
function $(s, e = "info") {
  const t = document.getElementById("messages"), r = document.createElement("div");
  r.className = `${e}-message`, r.textContent = s, r.style.marginBottom = "10px", r.style.animation = "slideIn 0.3s ease", t.appendChild(r), setTimeout(() => {
    r.style.animation = "slideOut 0.3s ease", setTimeout(() => r.remove(), 300);
  }, 5e3);
}
ye();
