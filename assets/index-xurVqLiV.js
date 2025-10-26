(function() {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload")) return;
  for (const n of document.querySelectorAll('link[rel="modulepreload"]')) r(n);
  new MutationObserver((n) => {
    for (const s of n) if (s.type === "childList") for (const i of s.addedNodes) i.tagName === "LINK" && i.rel === "modulepreload" && r(i);
  }).observe(document, { childList: true, subtree: true });
  function t(n) {
    const s = {};
    return n.integrity && (s.integrity = n.integrity), n.referrerPolicy && (s.referrerPolicy = n.referrerPolicy), n.crossOrigin === "use-credentials" ? s.credentials = "include" : n.crossOrigin === "anonymous" ? s.credentials = "omit" : s.credentials = "same-origin", s;
  }
  function r(n) {
    if (n.ep) return;
    n.ep = true;
    const s = t(n);
    fetch(n.href, s);
  }
})();
class G {
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
    const s = this.content.match(/nt:hasNanopubLabelPattern\s+"([^"]+)"/);
    s ? (this.template.labelPattern = s[1], console.log(`\u2705 Found label pattern: "${s[1]}"`)) : console.warn("\u26A0\uFE0F No nt:hasNanopubLabelPattern found in template");
    const i = this.content.match(/nt:hasTag\s+"([^"]+)"/);
    i && (this.template.tags = [i[1]]);
    const p = this.content.match(/nt:hasTargetNanopubType\s+(.+?)\s*[;.](?:\s|$)/s);
    if (p) {
      const a = p[1], u = /<([^>]+)>/g, b = [];
      let c;
      for (; (c = u.exec(a)) !== null; ) b.push(c[1]);
      this.template.types = b, console.log(`\u2705 Found ${b.length} target nanopub types:`, b);
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
      const r = t[1], n = t[2].trim(), s = t.index;
      let i = this.content.length;
      const a = this.content.substring(s).substring(1).search(/\n\s*(?:sub:[\w-]+\s+a\s+nt:|})/);
      a > 0 && (i = s + a + 1);
      const u = this.content.substring(s, i);
      console.log(`
--- Parsing ${r} ---`), console.log(`Block length: ${u.length} chars`), console.log(`Block preview: ${u.substring(0, 200)}...`);
      const b = n.split(",").map((h) => h.trim()), c = b[0].replace(/^nt:/, ""), l = { id: this.cleanUri(r), type: c, isLocalResource: b.some((h) => h.includes("LocalResource")), isIntroducedResource: b.some((h) => h.includes("IntroducedResource")), label: this.extractLabel(u), description: this.extractDescription(u), validation: this.extractValidation(u), possibleValuesFrom: null, possibleValuesFromApi: null, options: [], prefix: null };
      if (c.includes("AutoEscapeUriPlaceholder")) {
        const h = u.match(/nt:hasPrefix\s+"([^"]+)"/);
        h && (l.prefix = h[1], console.log(`  \u2192 Found prefix for AutoEscapeUriPlaceholder: ${l.prefix}`));
      }
      if (c.includes("RestrictedChoice")) {
        const h = u.match(/nt:possibleValuesFrom\s+(?:<([^>]+)>|([\w-]+:[\w-]+))/);
        if (h) {
          const v = h[1] || h[2];
          if (v && v.includes(":") && !v.startsWith("http")) {
            const [C, I] = v.split(":"), N = this.content.match(new RegExp(`@prefix ${C}:\\s+<([^>]+)>`));
            N ? l.possibleValuesFrom = N[1] + I : l.possibleValuesFrom = v;
          } else l.possibleValuesFrom = v;
          console.log(`  \u2192 Will fetch options from: ${l.possibleValuesFrom}`);
        }
        const g = u.match(/nt:possibleValue\s+([\s\S]+?)(?:\s+\.(?:\s|$))/);
        if (g) {
          const v = g[1];
          console.log(`  \u2192 Raw value text: ${v.substring(0, 100)}...`);
          const C = [], I = /<([^>]+)>|([\w-]+:[\w-]+)/g;
          let N;
          for (; (N = I.exec(v)) !== null; ) C.push(N[1] || N[2]);
          C.length > 0 ? (l.options = C.map(($) => {
            let P = this.template.labels[$];
            return P || ($.startsWith("http") ? (P = $.replace(/^https?:\/\//, "").replace(/\/$/, ""), P = P.charAt(0).toUpperCase() + P.slice(1)) : $.includes(":") ? P = $.split(":")[1] : P = $), { value: $, label: P };
          }), console.log(`  \u2192 Found ${l.options.length} inline options:`, l.options.map(($) => $.label))) : console.warn("  \u2192 No values found in possibleValue text");
        }
      }
      if (c.includes("GuidedChoice")) {
        const h = u.match(/nt:possibleValuesFromApi\s+"([^"]+)"/);
        h && (l.possibleValuesFromApi = h[1]);
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
      let s = "";
      const i = n.match(/@prefix sub:\s+<([^>]+)>/);
      i && (s = i[1]);
      const p = /<([^>]+)>\s+rdfs:label\s+"([^"]+)"/g, a = /(sub:[\w-]+)\s+rdfs:label\s+"([^"]+)"/g;
      e.options = [];
      let u = 0;
      for (const b of n.matchAll(p)) {
        u++;
        const c = b[1], l = b[2];
        console.log(`  \u2192 Match ${u} (full URI): URI=${c}, Label="${l}"`), c.includes("#assertion") || c.includes("#Head") || c.includes("#provenance") || c.includes("#pubinfo") || c.includes("ntemplate") || c.includes("rdf-syntax") || c.includes("XMLSchema") || c.includes("rdfs#") || c.includes("dc/terms") || c.includes("foaf/0.1") || c.includes("nanopub/x/") || c.includes("nanopub.org/nschema") || l.includes("Template:") || l.includes("Making a statement") || l.includes("is a") || l.includes("has type") || e.options.push({ value: c, label: l });
      }
      for (const b of n.matchAll(a)) {
        u++;
        const c = b[1], l = b[2], h = c.replace("sub:", ""), g = s + h;
        console.log(`  \u2192 Match ${u} (prefixed): ${c} -> ${g}, Label="${l}"`), e.options.push({ value: g, label: l });
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
      const r = this.parseStatement(t);
      r && this.template.statements.push(r);
    }), console.log(`Parsed ${this.template.statements.length} statements`);
  }
  parseGroupedStatements() {
    const e = /(sub:st[\w.-]+)\s+a\s+[^;]*nt:GroupedStatement[^;]*;\s*nt:hasStatement\s+([^;.]+)/g;
    let t;
    for (; (t = e.exec(this.content)) !== null; ) {
      const r = t[1], n = t[2].split(",").map((s) => s.trim().replace(/^sub:/, ""));
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
    const s = n[1], i = s.match(/rdf:subject\s+(<[^>]+>|[\w:-]+)/), p = s.match(/rdf:predicate\s+(<[^>]+>|[\w:-]+)/), a = s.match(/rdf:object\s+(?:<([^>]+)>|([\w:-]+)|"([^"]+)")/);
    if (!i || !p || !a) return console.warn(`Incomplete statement ${e}:`, { subjMatch: !!i, predMatch: !!p, objMatch: !!a }), null;
    let u;
    a[1] ? u = a[1] : a[2] ? u = a[2] : a[3] && (u = a[3]);
    const c = n[0].match(/a\s+([^;.]+)/), l = c ? c[1].split(",").map((T) => T.trim()) : [], h = this.cleanUri(i[1]), g = this.cleanUri(p[1]), v = this.cleanUri(u), C = i[1] === "nt:CREATOR", I = u === "nt:CREATOR", N = !C && this.isPlaceholder(h), $ = this.isPlaceholder(g), P = !I && this.isPlaceholder(v) && !a[3], Q = C ? "nt:CREATOR" : N ? null : this.expandUri(i[1]), ee = this.expandUri(p[1]), te = I ? "nt:CREATOR" : P || a[3] ? null : this.expandUri(u);
    return { id: this.cleanUri(e), subject: h, predicate: g, object: v, subjectIsPlaceholder: N, predicateIsPlaceholder: $, objectIsPlaceholder: P, subjectUri: Q, predicateUri: ee, objectUri: te, isLiteralObject: !!a[3], repeatable: l.some((T) => T.includes("RepeatableStatement")), optional: l.some((T) => T.includes("OptionalStatement")), grouped: l.some((T) => T.includes("GroupedStatement")), types: l };
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
    const s = e.match(/nt:hasMaxLength\s+"?(\d+)"?/);
    return s && (t.maxLength = parseInt(s[1])), Object.keys(t).length > 0 ? t : void 0;
  }
  static async fetchAndParse(e) {
    let t = e;
    (e.startsWith("http://purl.org/np/") || e.startsWith("https://w3id.org/np/")) && (t = `https://np.petapico.org/${e.split("/").pop()}.trig`), console.log(`Fetching template from ${t}`);
    const r = await fetch(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    const n = await r.text();
    return await new G(n).parse();
  }
}
const ne = { LiteralPlaceholder: (o) => {
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
  return console.log(`[RestrictedChoice] Rendering ${o.id} with ${((_a = o.options) == null ? void 0 : _a.length) || 0} options`), o.options && Array.isArray(o.options) ? o.options.forEach((t, r) => {
    const n = document.createElement("option");
    n.value = t.value || t, n.textContent = t.label || t.value || t, o.options.length === 1 && (n.selected = true), e.appendChild(n);
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
class re {
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
      const s = { dct: "http://purl.org/dc/terms/", foaf: "http://xmlns.com/foaf/0.1/", prov: "http://www.w3.org/ns/prov#", rdfs: "http://www.w3.org/2000/01/rdf-schema#", schema: "https://schema.org/", rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#" };
      if (s[r]) return s[r] + n;
    }
    return e;
  }
  parseUriLabel(e) {
    if (!e) return "";
    const t = { "dct:": "DC Terms: ", "foaf:": "FOAF: ", "prov:": "Provenance: ", "rdfs:": "RDFS: ", "schema:": "Schema: " };
    for (const [s, i] of Object.entries(t)) if (e.startsWith(s)) return e.substring(s.length).replace(/([a-z])([A-Z])/g, "$1 $2").split(/[-_]/).map((a) => a.charAt(0).toUpperCase() + a.slice(1).toLowerCase()).join(" ");
    const r = e.split(/[#\/]/);
    let n = r[r.length - 1] || "";
    return !n && r.length > 1 && (n = r[r.length - 2]), n = n.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^(has|is)\s+/i, "").trim().split(" ").map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(" "), n || e;
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
      const s = document.createElement("p");
      s.className = "form-description", s.textContent = this.template.description, t.appendChild(s);
    }
    this.formElement.appendChild(t);
    const n = document.createElement("div");
    return n.className = "form-fields", this.renderFields(n), this.formElement.appendChild(n), this.formElement.appendChild(this.buildControls()), typeof e == "string" && (e = document.querySelector(e)), e && (e.innerHTML = "", e.appendChild(this.formElement), this.setupEventListeners()), this.formElement;
  }
  renderFields(e) {
    const t = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
    console.log("[renderFields] Processing statements...");
    let n = null, s = null;
    this.template.statements.forEach((i, p) => {
      const a = this.template.groupedStatements.find((l) => l.statements.includes(i.id));
      if (console.log(`  ${i.id}: parentGroup=${a == null ? void 0 : a.id}, processed=${t.has(a == null ? void 0 : a.id)}, subject=${i.subject}`), a && t.has(a.id)) {
        console.log("    \u2192 Skipping (group already processed)");
        return;
      }
      const u = this.findPlaceholder(i.subject), b = this.findPlaceholder(i.object), c = this.findPlaceholder(i.predicate);
      if (!u && !b && !c) {
        console.log("    \u2192 Skipping (all fixed - auto-filled statement)");
        return;
      }
      if (u && (u.type.includes("ExternalUriPlaceholder") || u.type.includes("UriPlaceholder")) && !c && !b) {
        console.log("    \u2192 Skipping (URI placeholder metadata statement)");
        return;
      }
      if (i.subject !== s) {
        if (n && (e.appendChild(n), n = null), this.template.statements.filter((h) => h.subject === i.subject).length > 1) {
          n = document.createElement("div"), n.className = "subject-group", n.style.cssText = "margin: 1.5rem 0; padding: 1.5rem; border: 2px solid #be2e78; border-radius: 8px; background: #f6d7e8; box-shadow: 0 1px 3px rgba(190, 46, 120, 0.1);";
          const h = this.findPlaceholder(i.subject);
          if (h && !r.has(h.id)) {
            const g = document.createElement("div");
            g.className = "form-field subject-field";
            const v = document.createElement("label");
            v.className = "field-label subject-label", v.style.cssText = "font-weight: 600; font-size: 1.15em; color: #2b3456; margin-bottom: 0.75rem; display: block;", v.textContent = h.label || this.getLabel(i.subject), g.appendChild(v);
            const C = this.renderInput(h);
            if (C !== null) C.name = `${i.id}_subject`, C.id = `field_${i.id}_subject`, g.appendChild(C);
            else {
              const I = document.createElement("div");
              I.className = "field-value auto-generated", I.textContent = "(auto-generated)", g.appendChild(I);
            }
            n.appendChild(g), r.add(h.id);
          }
        }
        s = i.subject;
      }
      if (a) {
        console.log(`    \u2192 Rendering grouped statement ${a.id}`);
        const l = n || e;
        this.renderGroupedStatement(l, a, i, r), t.add(a.id);
      } else {
        console.log("    \u2192 Rendering individual statement");
        const l = n || e;
        this.renderStatement(l, i, r);
      }
    }), n && e.appendChild(n);
  }
  renderGroupedStatement(e, t, r, n = /* @__PURE__ */ new Set()) {
    const s = document.createElement("div");
    s.className = "form-field-group", r.repeatable && s.classList.add("repeatable-group"), r.optional && s.classList.add("optional-group");
    const i = t.statements.map((a) => this.template.statements.find((u) => u.id === a)).filter((a) => a), p = i[0];
    if (p) {
      const a = this.findPlaceholder(p.subject);
      if (a && !n.has(a.id)) {
        const u = document.createElement("div");
        u.className = "form-field";
        const b = document.createElement("label");
        b.className = "field-label", b.textContent = a.label || this.getLabel(p.subject), u.appendChild(b);
        const c = this.renderInput(a);
        c.name = `${p.id}_subject`, c.id = `field_${p.id}_subject`, u.appendChild(c), s.appendChild(u), n.add(a.id);
      }
    }
    i.forEach((a) => {
      this.renderStatementInGroup(s, a, n);
    }), r.repeatable && s.appendChild(this.buildRepeatableControls(r, null)), e.appendChild(s);
  }
  renderStatementInGroup(e, t, r = /* @__PURE__ */ new Set()) {
    console.log(`[renderStatementInGroup] ${t.id}:`, { predicate: t.predicate, object: t.object, isLiteralObject: t.isLiteralObject });
    const n = this.findPlaceholder(t.object), s = this.findPlaceholder(t.predicate);
    console.log("  objectPlaceholder:", n == null ? void 0 : n.id), console.log("  predicatePlaceholder:", s == null ? void 0 : s.id);
    const i = s && !r.has(s.id), p = n && !r.has(n.id);
    if (s && n && !i && !p) {
      console.log("  \u2192 SKIP (both placeholders already rendered)");
      return;
    }
    const a = this.getLabel(t.predicate);
    if (!n && !s) {
      console.log(`  \u2192 READONLY path: ${a} = ${t.object}`);
      const c = document.createElement("div");
      c.className = "form-field readonly-field";
      const l = document.createElement("label");
      l.className = "field-label", l.textContent = a;
      const h = document.createElement("div");
      h.className = "field-value", h.textContent = t.object, c.appendChild(l), c.appendChild(h), e.appendChild(c);
      return;
    }
    if (n && !p && !s) {
      console.log("  \u2192 SKIP (object placeholder already rendered)");
      return;
    }
    console.log("  \u2192 INPUT path");
    const u = document.createElement("div");
    u.className = "form-field", t.optional && u.classList.add("optional");
    const b = document.createElement("label");
    if (b.className = "field-label", b.textContent = a, u.appendChild(b), i) {
      const c = this.renderInput(s);
      c.name = `${t.id}_predicate`, c.id = `field_${t.id}_predicate`, u.appendChild(c), r.add(s.id);
    }
    if (p) {
      if (n.label) {
        const l = document.createElement("div");
        l.className = "field-help", l.textContent = n.label, u.appendChild(l);
      }
      const c = this.renderInput(n);
      c.name = t.id, c.id = `field_${t.id}`, u.appendChild(c), r.add(n.id);
    } else if (!n) {
      const c = document.createElement("div");
      c.className = "field-value", c.textContent = this.getLabel(t.object) || t.object, u.appendChild(c);
    }
    if (t.optional) {
      const c = document.createElement("span");
      c.className = "optional-badge", c.textContent = "optional", b.appendChild(c);
    }
    e.appendChild(u);
  }
  renderStatement(e, t, r = /* @__PURE__ */ new Set()) {
    const n = this.findPlaceholder(t.subject), s = this.findPlaceholder(t.predicate), i = this.findPlaceholder(t.object), p = this.getLabel(t.predicate), a = n && !r.has(n.id), u = s && !r.has(s.id), b = i && !r.has(i.id);
    if (!a && !u && !b && (s || i)) return;
    if (!s && !i && !a) {
      const l = document.createElement("div");
      l.className = "form-field readonly-field";
      const h = document.createElement("label");
      h.className = "field-label", h.textContent = p;
      const g = document.createElement("div");
      g.className = "field-value", g.textContent = this.getLabel(t.object) || t.object, l.appendChild(h), l.appendChild(g), e.appendChild(l);
      return;
    }
    const c = document.createElement("div");
    if (c.className = "form-field", t.repeatable && c.classList.add("repeatable"), t.optional && c.classList.add("optional"), a) {
      const l = document.createElement("label");
      l.className = "field-label", l.textContent = n.label || this.getLabel(t.subject), c.appendChild(l);
      const h = this.renderInput(n);
      if (h !== null) h.name = `${t.id}_subject`, h.id = `field_${t.id}_subject`, t.optional || (h.required = true), c.appendChild(h);
      else {
        const g = document.createElement("div");
        g.className = "field-value auto-generated", g.textContent = "(auto-generated)", c.appendChild(g);
      }
      r.add(n.id);
    }
    if (u) {
      const l = document.createElement("label");
      l.className = "field-label", l.textContent = s.label || p, c.appendChild(l);
      const h = this.renderInput(s);
      h.name = `${t.id}_predicate`, h.id = `field_${t.id}_predicate`, t.optional || (h.required = true), c.appendChild(h), r.add(s.id);
    } else if (!s) {
      const l = document.createElement("label");
      if (l.className = "field-label", l.textContent = p, t.optional) {
        const h = document.createElement("span");
        h.className = "optional-badge", h.textContent = "optional", l.appendChild(h);
      }
      c.appendChild(l);
    }
    if (b) {
      const l = this.renderInput(i);
      if (l === null) {
        const h = document.createElement("div");
        h.className = "field-value auto-generated", h.textContent = i.label || t.object, c.appendChild(h);
      } else {
        if (i.label) {
          const h = document.createElement("div");
          h.className = "field-help", h.textContent = i.label, c.appendChild(h);
        }
        l.name = `${t.id}_object`, l.id = `field_${t.id}_object`, t.optional || (l.required = true), c.appendChild(l);
      }
      r.add(i.id);
    } else if (!i) {
      const l = document.createElement("div");
      l.className = "field-value", l.textContent = this.getLabel(t.object) || t.object, c.appendChild(l);
    }
    e.appendChild(c), t.repeatable && e.appendChild(this.buildRepeatableControls(t, null));
  }
  renderInput(e) {
    const t = e.type.split(",").map((n) => n.trim().replace(/^nt:/, ""));
    for (const n of t) {
      const s = ne[n];
      if (s) return console.log(`Using component ${n} for placeholder ${e.id}`), s(e, this.options);
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
      const s = parseInt(r.dataset.count);
      r.dataset.count = s + 1;
      const i = this.buildRepeatableField(e, t, s);
      r.parentElement.insertBefore(i, r), this.emit("change", this.collectFormData());
    }, r.appendChild(n), r;
  }
  buildRepeatableField(e, t, r) {
    const n = document.createElement("div");
    n.className = "repeatable-field-group";
    const s = this.findPlaceholder(e.subject), i = this.findPlaceholder(e.predicate), p = this.findPlaceholder(e.object);
    let a = false;
    if (s) {
      const b = this.template.statements.filter((c) => c.subject === e.subject);
      a = b.length === 1, console.log(`[buildRepeatableField] Subject ${e.subject}:`, { occurrences: b.length, shouldRepeat: a });
    }
    if (s && a) {
      const b = document.createElement("div");
      b.className = "repeatable-field";
      const c = document.createElement("label");
      c.className = "field-label", c.textContent = s.label || this.getLabel(e.subject), b.appendChild(c);
      const l = this.renderInput(s);
      l.name = `${e.id}_subject_${r}`, l.id = `field_${e.id}_subject_${r}`, b.appendChild(l), n.appendChild(b);
    }
    if (i) {
      const b = document.createElement("div");
      b.className = "repeatable-field";
      const c = document.createElement("label");
      c.className = "field-label", c.textContent = i.label || this.getLabel(e.predicate), b.appendChild(c);
      const l = this.renderInput(i);
      l.name = `${e.id}_predicate_${r}`, l.id = `field_${e.id}_predicate_${r}`, b.appendChild(l), n.appendChild(b);
    }
    if (p) {
      const b = document.createElement("div");
      if (b.className = "repeatable-field", !i) {
        const l = document.createElement("label");
        l.className = "field-label", l.textContent = this.getLabel(e.predicate), b.appendChild(l);
      }
      if (p.label) {
        const l = document.createElement("div");
        l.className = "field-help", l.textContent = p.label, b.appendChild(l);
      }
      const c = this.renderInput(p);
      c.name = `${e.id}_object_${r}`, c.id = `field_${e.id}_object_${r}`, b.appendChild(c), n.appendChild(b);
    }
    const u = document.createElement("button");
    return u.type = "button", u.className = "btn-remove-field", u.textContent = "\xD7 Remove", u.onclick = () => {
      n.remove(), this.emit("change", this.collectFormData());
    }, n.appendChild(u), n;
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
      let s = n.querySelector(".error-message");
      t ? s && s.remove() : (s || (s = document.createElement("div"), s.className = "error-message", n.appendChild(s)), s.textContent = r);
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
class oe {
  constructor(e) {
    var _a, _b;
    this.template = e, console.log("NanopubBuilder initialized with:", { uri: e.uri, labelPattern: e.labelPattern, types: ((_a = e.types) == null ? void 0 : _a.length) || 0, statements: ((_b = e.statements) == null ? void 0 : _b.length) || 0 });
  }
  async buildFromFormData(e, t = {}) {
    this.formData = e, this.metadata = t;
    const r = (/* @__PURE__ */ new Date()).toISOString(), n = this.generateRandomId(), s = this.buildPrefixes(n), i = this.buildHead(), p = this.buildAssertion(), a = this.buildProvenance(), u = this.buildPubinfo(r);
    return `${s}

${i}

${p}

${a}

${u}
`;
  }
  generateRandomId() {
    return Math.random().toString(36).substring(2, 15);
  }
  buildPrefixes(e) {
    const t = `http://purl.org/nanopub/temp/${e}`, r = [`@prefix this: <${t}> .`, `@prefix sub: <${t}#> .`, "@prefix np: <http://www.nanopub.org/nschema#> .", "@prefix dct: <http://purl.org/dc/terms/> .", "@prefix nt: <https://w3id.org/np/o/ntemplate/> .", "@prefix npx: <http://purl.org/nanopub/x/> .", "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .", "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .", "@prefix orcid: <https://orcid.org/> .", "@prefix prov: <http://www.w3.org/ns/prov#> .", "@prefix foaf: <http://xmlns.com/foaf/0.1/> .", "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ."];
    if (this.template.prefixes) for (const [n, s] of Object.entries(this.template.prefixes)) r.some((i) => i.includes(`@prefix ${n}:`)) || r.push(`@prefix ${n}: <${s}> .`);
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
      const s = parseInt(r.replace(/\D/g, "")), i = parseInt(n.replace(/\D/g, ""));
      return s - i;
    });
    for (const r of t) {
      const n = this.template.statements.find((i) => i.id === r);
      if (!n) continue;
      const s = this.getStatementInstances(n);
      for (const i of s) {
        const p = this.buildTriple(n, i);
        p && e.push(p);
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
      const s = this.getInstanceData(e, n);
      if (s) t.push(s);
      else break;
    }
    return t;
  }
  getInstanceData(e, t) {
    const r = t ? `_${t}` : "", n = { subject: this.formData[`${e.id}_subject${r}`], predicate: this.formData[`${e.id}_predicate${r}`], object: this.formData[`${e.id}_object${r}`] };
    if (!n.subject && e.subjectIsPlaceholder) {
      const p = e.subject;
      for (const a of this.template.statements) {
        if (a.subjectIsPlaceholder && a.subject === p) {
          const u = this.formData[`${a.id}_subject`];
          if (u) {
            n.subject = u;
            break;
          }
        }
        if (a.objectIsPlaceholder && a.object === p) {
          const u = this.formData[`${a.id}_object`];
          if (u) {
            n.subject = u;
            break;
          }
        }
      }
    }
    n.subject && n.subject;
    const s = n.predicate && n.predicate !== "", i = n.object && n.object !== "";
    return e.optional && !i || !e.optional && (e.objectIsPlaceholder && !i || e.predicateIsPlaceholder && !s) ? null : n;
  }
  buildTriple(e, t) {
    const r = this.metadata.creator || "https://orcid.org/0000-0000-0000-0000";
    let n = t.subject || e.subject, s;
    e.subjectUri === "nt:CREATOR" ? s = `<${r}>` : s = e.subjectIsPlaceholder ? this.resolveValue(n, e.subject) : this.formatUri(e.subjectUri);
    const i = t.predicate || e.predicate, p = e.predicateIsPlaceholder ? this.resolveValue(i, e.predicate) : this.formatUri(e.predicateUri);
    let a = t.object || e.object, u;
    return e.objectUri === "nt:CREATOR" ? u = `<${r}>` : u = e.objectIsPlaceholder ? this.resolveValue(a, e.object) : this.formatUri(e.objectUri), !s || !p || !u || s.startsWith("<") && s.endsWith(">") && !s.includes("://") || u.startsWith("<") && u.endsWith(">") && !u.includes("://") ? null : e.predicateUri === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" || p === "rdf:type" || p === "a" ? `  ${s} a ${u} .` : `  ${s} ${p} ${u} .`;
  }
  resolveValue(e, t) {
    var _a;
    if (!e || e === "") return null;
    if (e === "nt:CREATOR" || e === "CREATOR" || t === "nt:CREATOR" || t === "CREATOR") return `<${this.metadata.creator || "https://orcid.org/0000-0000-0000-0000"}>`;
    const r = t.replace("sub:", "");
    if (e === r || e === `sub:${r}`) return null;
    const n = (_a = this.template.placeholders) == null ? void 0 : _a.find((s) => s.id === r);
    if ((n == null ? void 0 : n.type) === "AutoEscapeUriPlaceholder" && n.prefix) {
      const s = encodeURIComponent(e).replace(/%20/g, "+");
      return `<${n.prefix}${s}>`;
    }
    return (n == null ? void 0 : n.type) === "UriPlaceholder" || (n == null ? void 0 : n.type) === "GuidedChoicePlaceholder" || (n == null ? void 0 : n.type) === "ExternalUriPlaceholder" || e.startsWith("http://") || e.startsWith("https://") ? `<${e}>` : e.includes(`
`) || e.length > 100 ? `"""${e}"""` : `"${e}"`;
  }
  formatUri(e) {
    return e ? e.includes(":") && !e.includes("://") ? e : `<${e}>` : null;
  }
  buildProvenance() {
    return `sub:provenance {
  sub:assertion prov:wasAttributedTo <${this.metadata.creator || "https://orcid.org/0000-0000-0000-0000"}> .
}`;
  }
  buildPubinfo(e) {
    var _a;
    const t = this.metadata.creator || "https://orcid.org/0000-0000-0000-0000", r = this.metadata.creatorName || "Unknown", n = [`  <${t}> foaf:name "${r}" .`, "", `  this: dct:created "${e}"^^xsd:dateTime;`, `    dct:creator <${t}>;`, "    dct:license <https://creativecommons.org/licenses/by/4.0/>"];
    if (((_a = this.template.types) == null ? void 0 : _a.length) > 0) {
      const s = this.template.types.map((i) => `<${i}>`).join(", ");
      n.push(`;
    npx:hasNanopubType ${s}`);
    }
    for (const s of this.template.placeholders || []) if (s.isIntroducedResource && s.prefix) {
      const i = this.findPlaceholderValue(s.id);
      if (i) {
        const p = encodeURIComponent(i).replace(/%20/g, "+");
        n.push(`;
    npx:introduces <${s.prefix}${p}>`);
      }
    }
    if (this.template.labelPattern) {
      const s = this.generateLabel();
      n.push(`;
    rdfs:label "${s}"`);
    }
    return this.template.uri && n.push(`;
    nt:wasCreatedFromTemplate <${this.template.uri}>`), n.push(" ."), `sub:pubinfo {
${n.join(`
`)}
}`;
  }
  findPlaceholderValue(e) {
    for (const t of this.template.statements || []) {
      if (t.subject === e || t.subject === `sub:${e}`) {
        const r = this.formData[`${t.id}_subject`];
        if (r) return r;
        if (t.repeatable) for (let n = 1; n < 10; n++) {
          const s = this.formData[`${t.id}_subject_${n}`];
          if (s) return s;
        }
      }
      if (t.object === e || t.object === `sub:${e}`) {
        const r = this.formData[`${t.id}_object`];
        if (r) return r;
        if (t.repeatable) for (let n = 1; n < 10; n++) {
          const s = this.formData[`${t.id}_object_${n}`];
          if (s) return s;
        }
      }
    }
    return null;
  }
  generateLabel() {
    let e = this.template.labelPattern || "Untitled";
    const t = [...e.matchAll(/\$\{(\w+)\}/g)];
    for (const r of t) {
      const n = r[1], s = this.findPlaceholderValue(n);
      s ? e = e.replace(r[0], s) : e = e.replace(r[0], "");
    }
    return e.trim();
  }
}
let d;
const Y = typeof TextDecoder < "u" ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }) : { decode: () => {
  throw Error("TextDecoder not available");
} };
typeof TextDecoder < "u" && Y.decode();
let M = null;
function D() {
  return (M === null || M.byteLength === 0) && (M = new Uint8Array(d.memory.buffer)), M;
}
function L(o, e) {
  return o = o >>> 0, Y.decode(D().subarray(o, o + e));
}
const S = new Array(128).fill(void 0);
S.push(void 0, null, true, false);
let A = S.length;
function m(o) {
  A === S.length && S.push(S.length + 1);
  const e = A;
  return A = S[e], S[e] = o, e;
}
function f(o) {
  return S[o];
}
function se(o) {
  o < 132 || (S[o] = A, A = o);
}
function y(o) {
  const e = f(o);
  return se(o), e;
}
let j = 0;
const B = typeof TextEncoder < "u" ? new TextEncoder("utf-8") : { encode: () => {
  throw Error("TextEncoder not available");
} }, ie = typeof B.encodeInto == "function" ? function(o, e) {
  return B.encodeInto(o, e);
} : function(o, e) {
  const t = B.encode(o);
  return e.set(t), { read: o.length, written: t.length };
};
function R(o, e, t) {
  if (t === void 0) {
    const p = B.encode(o), a = e(p.length, 1) >>> 0;
    return D().subarray(a, a + p.length).set(p), j = p.length, a;
  }
  let r = o.length, n = e(r, 1) >>> 0;
  const s = D();
  let i = 0;
  for (; i < r; i++) {
    const p = o.charCodeAt(i);
    if (p > 127) break;
    s[n + i] = p;
  }
  if (i !== r) {
    i !== 0 && (o = o.slice(i)), n = t(n, r, r = i + o.length * 3, 1) >>> 0;
    const p = D().subarray(n + i, n + r), a = ie(o, p);
    i += a.written, n = t(n, r, i, 1) >>> 0;
  }
  return j = i, n;
}
function F(o) {
  return o == null;
}
let O = null;
function _() {
  return (O === null || O.byteLength === 0) && (O = new Int32Array(d.memory.buffer)), O;
}
let U = null;
function ae() {
  return (U === null || U.byteLength === 0) && (U = new Float64Array(d.memory.buffer)), U;
}
function z(o) {
  const e = typeof o;
  if (e == "number" || e == "boolean" || o == null) return `${o}`;
  if (e == "string") return `"${o}"`;
  if (e == "symbol") {
    const n = o.description;
    return n == null ? "Symbol" : `Symbol(${n})`;
  }
  if (e == "function") {
    const n = o.name;
    return typeof n == "string" && n.length > 0 ? `Function(${n})` : "Function";
  }
  if (Array.isArray(o)) {
    const n = o.length;
    let s = "[";
    n > 0 && (s += z(o[0]));
    for (let i = 1; i < n; i++) s += ", " + z(o[i]);
    return s += "]", s;
  }
  const t = /\[object ([^\]]+)\]/.exec(toString.call(o));
  let r;
  if (t.length > 1) r = t[1];
  else return toString.call(o);
  if (r == "Object") try {
    return "Object(" + JSON.stringify(o) + ")";
  } catch {
    return "Object";
  }
  return o instanceof Error ? `${o.name}: ${o.message}
${o.stack}` : r;
}
const q = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((o) => {
  d.__wbindgen_export_2.get(o.dtor)(o.a, o.b);
});
function le(o, e, t, r) {
  const n = { a: o, b: e, cnt: 1, dtor: t }, s = (...i) => {
    n.cnt++;
    const p = n.a;
    n.a = 0;
    try {
      return r(p, n.b, ...i);
    } finally {
      --n.cnt === 0 ? (d.__wbindgen_export_2.get(n.dtor)(p, n.b), q.unregister(n)) : n.a = p;
    }
  };
  return s.original = n, q.register(s, n, n), s;
}
function ce(o, e, t) {
  d._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h15d348a8f539de58(o, e, m(t));
}
function w(o, e) {
  try {
    return o.apply(this, e);
  } catch (t) {
    d.__wbindgen_exn_store(m(t));
  }
}
function de(o, e, t, r) {
  d.wasm_bindgen__convert__closures__invoke2_mut__h2c289313db95095e(o, e, m(t), m(r));
}
function J(o, e) {
  if (!(o instanceof e)) throw new Error(`expected instance of ${e.name}`);
  return o.ptr;
}
let W = 128;
function ue(o) {
  if (W == 1) throw new Error("out of js stack");
  return S[--W] = o, W;
}
const pe = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((o) => d.__wbg_keypair_free(o >>> 0));
class fe {
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, pe.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    d.__wbg_keypair_free(e);
  }
  constructor() {
    try {
      const n = d.__wbindgen_add_to_stack_pointer(-16);
      d.keypair_new(n);
      var e = _()[n / 4 + 0], t = _()[n / 4 + 1], r = _()[n / 4 + 2];
      if (r) throw y(t);
      return this.__wbg_ptr = e >>> 0, this;
    } finally {
      d.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toJs() {
    try {
      const n = d.__wbindgen_add_to_stack_pointer(-16);
      d.keypair_toJs(n, this.__wbg_ptr);
      var e = _()[n / 4 + 0], t = _()[n / 4 + 1], r = _()[n / 4 + 2];
      if (r) throw y(t);
      return y(e);
    } finally {
      d.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
const X = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((o) => d.__wbg_nanopub_free(o >>> 0));
class k {
  static __wrap(e) {
    e = e >>> 0;
    const t = Object.create(k.prototype);
    return t.__wbg_ptr = e, X.register(t, t.__wbg_ptr, t), t;
  }
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, X.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    d.__wbg_nanopub_free(e);
  }
  constructor(e) {
    try {
      const s = d.__wbindgen_add_to_stack_pointer(-16);
      d.nanopub_new(s, m(e));
      var t = _()[s / 4 + 0], r = _()[s / 4 + 1], n = _()[s / 4 + 2];
      if (n) throw y(r);
      return this.__wbg_ptr = t >>> 0, this;
    } finally {
      d.__wbindgen_add_to_stack_pointer(16);
    }
  }
  check() {
    try {
      const n = this.__destroy_into_raw(), s = d.__wbindgen_add_to_stack_pointer(-16);
      d.nanopub_check(s, n);
      var e = _()[s / 4 + 0], t = _()[s / 4 + 1], r = _()[s / 4 + 2];
      if (r) throw y(t);
      return k.__wrap(e);
    } finally {
      d.__wbindgen_add_to_stack_pointer(16);
    }
  }
  sign(e) {
    try {
      const s = this.__destroy_into_raw(), i = d.__wbindgen_add_to_stack_pointer(-16);
      J(e, K), d.nanopub_sign(i, s, e.__wbg_ptr);
      var t = _()[i / 4 + 0], r = _()[i / 4 + 1], n = _()[i / 4 + 2];
      if (n) throw y(r);
      return k.__wrap(t);
    } finally {
      d.__wbindgen_add_to_stack_pointer(16);
    }
  }
  publish(e, t) {
    try {
      const s = this.__destroy_into_raw();
      var r = F(t) ? 0 : R(t, d.__wbindgen_malloc, d.__wbindgen_realloc), n = j;
      const i = d.nanopub_publish(s, ue(e), r, n);
      return y(i);
    } finally {
      S[W++] = void 0;
    }
  }
  static fetch(e) {
    const t = R(e, d.__wbindgen_malloc, d.__wbindgen_realloc), r = j, n = d.nanopub_fetch(t, r);
    return y(n);
  }
  static publish_intro(e, t) {
    J(e, K);
    const r = R(t, d.__wbindgen_malloc, d.__wbindgen_realloc), n = j, s = d.nanopub_publish_intro(e.__wbg_ptr, r, n);
    return y(s);
  }
  rdf() {
    let e, t;
    try {
      const u = d.__wbindgen_add_to_stack_pointer(-16);
      d.nanopub_rdf(u, this.__wbg_ptr);
      var r = _()[u / 4 + 0], n = _()[u / 4 + 1], s = _()[u / 4 + 2], i = _()[u / 4 + 3], p = r, a = n;
      if (i) throw p = 0, a = 0, y(s);
      return e = p, t = a, L(p, a);
    } finally {
      d.__wbindgen_add_to_stack_pointer(16), d.__wbindgen_free(e, t, 1);
    }
  }
  info() {
    try {
      const n = d.__wbindgen_add_to_stack_pointer(-16);
      d.nanopub_info(n, this.__wbg_ptr);
      var e = _()[n / 4 + 0], t = _()[n / 4 + 1], r = _()[n / 4 + 2];
      if (r) throw y(t);
      return y(e);
    } finally {
      d.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toString() {
    let e, t;
    try {
      const s = d.__wbindgen_add_to_stack_pointer(-16);
      d.nanopub_toString(s, this.__wbg_ptr);
      var r = _()[s / 4 + 0], n = _()[s / 4 + 1];
      return e = r, t = n, L(r, n);
    } finally {
      d.__wbindgen_add_to_stack_pointer(16), d.__wbindgen_free(e, t, 1);
    }
  }
}
const he = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((o) => d.__wbg_npprofile_free(o >>> 0));
class K {
  __destroy_into_raw() {
    const e = this.__wbg_ptr;
    return this.__wbg_ptr = 0, he.unregister(this), e;
  }
  free() {
    const e = this.__destroy_into_raw();
    d.__wbg_npprofile_free(e);
  }
  __getClassname() {
    let e, t;
    try {
      const s = d.__wbindgen_add_to_stack_pointer(-16);
      d.npprofile___getClassname(s, this.__wbg_ptr);
      var r = _()[s / 4 + 0], n = _()[s / 4 + 1];
      return e = r, t = n, L(r, n);
    } finally {
      d.__wbindgen_add_to_stack_pointer(16), d.__wbindgen_free(e, t, 1);
    }
  }
  constructor(e, t, r, n) {
    try {
      const g = d.__wbindgen_add_to_stack_pointer(-16), v = R(e, d.__wbindgen_malloc, d.__wbindgen_realloc), C = j;
      var s = F(t) ? 0 : R(t, d.__wbindgen_malloc, d.__wbindgen_realloc), i = j, p = F(r) ? 0 : R(r, d.__wbindgen_malloc, d.__wbindgen_realloc), a = j, u = F(n) ? 0 : R(n, d.__wbindgen_malloc, d.__wbindgen_realloc), b = j;
      d.npprofile_new(g, v, C, s, i, p, a, u, b);
      var c = _()[g / 4 + 0], l = _()[g / 4 + 1], h = _()[g / 4 + 2];
      if (h) throw y(l);
      return this.__wbg_ptr = c >>> 0, this;
    } finally {
      d.__wbindgen_add_to_stack_pointer(16);
    }
  }
  toString() {
    let e, t;
    try {
      const s = d.__wbindgen_add_to_stack_pointer(-16);
      d.npprofile_toString(s, this.__wbg_ptr);
      var r = _()[s / 4 + 0], n = _()[s / 4 + 1];
      return e = r, t = n, L(r, n);
    } finally {
      d.__wbindgen_add_to_stack_pointer(16), d.__wbindgen_free(e, t, 1);
    }
  }
  toJs() {
    try {
      const n = d.__wbindgen_add_to_stack_pointer(-16);
      d.npprofile_toJs(n, this.__wbg_ptr);
      var e = _()[n / 4 + 0], t = _()[n / 4 + 1], r = _()[n / 4 + 2];
      if (r) throw y(t);
      return y(e);
    } finally {
      d.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
async function be(o, e) {
  if (typeof Response == "function" && o instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function") try {
      return await WebAssembly.instantiateStreaming(o, e);
    } catch (r) {
      if (o.headers.get("Content-Type") != "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", r);
      else throw r;
    }
    const t = await o.arrayBuffer();
    return await WebAssembly.instantiate(t, e);
  } else {
    const t = await WebAssembly.instantiate(o, e);
    return t instanceof WebAssembly.Instance ? { instance: t, module: o } : t;
  }
}
function me() {
  const o = {};
  return o.wbg = {}, o.wbg.__wbg_nanopub_new = function(e) {
    const t = k.__wrap(e);
    return m(t);
  }, o.wbg.__wbindgen_string_new = function(e, t) {
    const r = L(e, t);
    return m(r);
  }, o.wbg.__wbg_call_b3ca7c6051f9bec1 = function() {
    return w(function(e, t, r) {
      const n = f(e).call(f(t), f(r));
      return m(n);
    }, arguments);
  }, o.wbg.__wbindgen_object_drop_ref = function(e) {
    y(e);
  }, o.wbg.__wbg_abort_2aa7521d5690750e = function(e) {
    f(e).abort();
  }, o.wbg.__wbg_new_72fb9a18b5ae2624 = function() {
    const e = new Object();
    return m(e);
  }, o.wbg.__wbg_set_1f9b04f170055d33 = function() {
    return w(function(e, t, r) {
      return Reflect.set(f(e), f(t), f(r));
    }, arguments);
  }, o.wbg.__wbg_new_ab6fd82b10560829 = function() {
    return w(function() {
      const e = new Headers();
      return m(e);
    }, arguments);
  }, o.wbg.__wbindgen_object_clone_ref = function(e) {
    const t = f(e);
    return m(t);
  }, o.wbg.__wbg_new_0d76b0581eca6298 = function() {
    return w(function() {
      const e = new AbortController();
      return m(e);
    }, arguments);
  }, o.wbg.__wbg_signal_a61f78a3478fd9bc = function(e) {
    const t = f(e).signal;
    return m(t);
  }, o.wbg.__wbg_append_7bfcb4937d1d5e29 = function() {
    return w(function(e, t, r, n, s) {
      f(e).append(L(t, r), L(n, s));
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
    const r = f(t).url, n = R(r, d.__wbindgen_malloc, d.__wbindgen_realloc), s = j;
    _()[e / 4 + 1] = s, _()[e / 4 + 0] = n;
  }, o.wbg.__wbg_headers_9620bfada380764a = function(e) {
    const t = f(e).headers;
    return m(t);
  }, o.wbg.__wbg_iterator_2cee6dadfd956dfa = function() {
    return m(Symbol.iterator);
  }, o.wbg.__wbg_get_e3c254076557e348 = function() {
    return w(function(e, t) {
      const r = Reflect.get(f(e), f(t));
      return m(r);
    }, arguments);
  }, o.wbg.__wbindgen_is_function = function(e) {
    return typeof f(e) == "function";
  }, o.wbg.__wbg_call_27c0f87801dedf93 = function() {
    return w(function(e, t) {
      const r = f(e).call(f(t));
      return m(r);
    }, arguments);
  }, o.wbg.__wbindgen_is_object = function(e) {
    const t = f(e);
    return typeof t == "object" && t !== null;
  }, o.wbg.__wbg_next_40fc327bfc8770e6 = function(e) {
    const t = f(e).next;
    return m(t);
  }, o.wbg.__wbg_next_196c84450b364254 = function() {
    return w(function(e) {
      const t = f(e).next();
      return m(t);
    }, arguments);
  }, o.wbg.__wbg_done_298b57d23c0fc80c = function(e) {
    return f(e).done;
  }, o.wbg.__wbg_value_d93c65011f51a456 = function(e) {
    const t = f(e).value;
    return m(t);
  }, o.wbg.__wbg_stringify_8887fe74e1c50d81 = function() {
    return w(function(e) {
      const t = JSON.stringify(f(e));
      return m(t);
    }, arguments);
  }, o.wbg.__wbindgen_string_get = function(e, t) {
    const r = f(t), n = typeof r == "string" ? r : void 0;
    var s = F(n) ? 0 : R(n, d.__wbindgen_malloc, d.__wbindgen_realloc), i = j;
    _()[e / 4 + 1] = i, _()[e / 4 + 0] = s;
  }, o.wbg.__wbg_text_450a059667fd91fd = function() {
    return w(function(e) {
      const t = f(e).text();
      return m(t);
    }, arguments);
  }, o.wbg.__wbg_new0_7d84e5b2cd9fdc73 = function() {
    return m(/* @__PURE__ */ new Date());
  }, o.wbg.__wbg_getTime_2bc4375165f02d15 = function(e) {
    return f(e).getTime();
  }, o.wbg.__wbg_crypto_1d1f22824a6a080c = function(e) {
    const t = f(e).crypto;
    return m(t);
  }, o.wbg.__wbg_process_4a72847cc503995b = function(e) {
    const t = f(e).process;
    return m(t);
  }, o.wbg.__wbg_versions_f686565e586dd935 = function(e) {
    const t = f(e).versions;
    return m(t);
  }, o.wbg.__wbg_node_104a2ff8d6ea03a2 = function(e) {
    const t = f(e).node;
    return m(t);
  }, o.wbg.__wbindgen_is_string = function(e) {
    return typeof f(e) == "string";
  }, o.wbg.__wbg_require_cca90b1a94a0255b = function() {
    return w(function() {
      const e = module.require;
      return m(e);
    }, arguments);
  }, o.wbg.__wbg_msCrypto_eb05e62b530a1508 = function(e) {
    const t = f(e).msCrypto;
    return m(t);
  }, o.wbg.__wbg_newwithlength_e9b4878cebadb3d3 = function(e) {
    const t = new Uint8Array(e >>> 0);
    return m(t);
  }, o.wbg.__wbindgen_memory = function() {
    const e = d.memory;
    return m(e);
  }, o.wbg.__wbg_buffer_12d079cc21e14bdb = function(e) {
    const t = f(e).buffer;
    return m(t);
  }, o.wbg.__wbg_newwithbyteoffsetandlength_aa4a17c33a06e5cb = function(e, t, r) {
    const n = new Uint8Array(f(e), t >>> 0, r >>> 0);
    return m(n);
  }, o.wbg.__wbg_randomFillSync_5c9c955aa56b6049 = function() {
    return w(function(e, t) {
      f(e).randomFillSync(y(t));
    }, arguments);
  }, o.wbg.__wbg_subarray_a1f73cd4b5b42fe1 = function(e, t, r) {
    const n = f(e).subarray(t >>> 0, r >>> 0);
    return m(n);
  }, o.wbg.__wbg_getRandomValues_3aa56aa6edec874c = function() {
    return w(function(e, t) {
      f(e).getRandomValues(f(t));
    }, arguments);
  }, o.wbg.__wbg_new_63b92bc8671ed464 = function(e) {
    const t = new Uint8Array(f(e));
    return m(t);
  }, o.wbg.__wbg_set_a47bac70306a19a7 = function(e, t, r) {
    f(e).set(f(t), r >>> 0);
  }, o.wbg.__wbg_self_ce0dbfc45cf2f5be = function() {
    return w(function() {
      const e = self.self;
      return m(e);
    }, arguments);
  }, o.wbg.__wbg_window_c6fb939a7f436783 = function() {
    return w(function() {
      const e = window.window;
      return m(e);
    }, arguments);
  }, o.wbg.__wbg_globalThis_d1e6af4856ba331b = function() {
    return w(function() {
      const e = globalThis.globalThis;
      return m(e);
    }, arguments);
  }, o.wbg.__wbg_global_207b558942527489 = function() {
    return w(function() {
      const e = global.global;
      return m(e);
    }, arguments);
  }, o.wbg.__wbindgen_is_undefined = function(e) {
    return f(e) === void 0;
  }, o.wbg.__wbg_newnoargs_e258087cd0daa0ea = function(e, t) {
    const r = new Function(L(e, t));
    return m(r);
  }, o.wbg.__wbg_new_16b304a2cfa7ff4a = function() {
    const e = new Array();
    return m(e);
  }, o.wbg.__wbg_apply_0a5aa603881e6d79 = function() {
    return w(function(e, t, r) {
      const n = Reflect.apply(f(e), f(t), f(r));
      return m(n);
    }, arguments);
  }, o.wbg.__wbindgen_number_get = function(e, t) {
    const r = f(t), n = typeof r == "number" ? r : void 0;
    ae()[e / 8 + 1] = F(n) ? 0 : n, _()[e / 4 + 0] = !F(n);
  }, o.wbg.__wbg_new_81740750da40724f = function(e, t) {
    try {
      var r = { a: e, b: t }, n = (i, p) => {
        const a = r.a;
        r.a = 0;
        try {
          return de(a, r.b, i, p);
        } finally {
          r.a = a;
        }
      };
      const s = new Promise(n);
      return m(s);
    } finally {
      r.a = r.b = 0;
    }
  }, o.wbg.__wbg_set_f975102236d3c502 = function(e, t, r) {
    f(e)[y(t)] = y(r);
  }, o.wbg.__wbindgen_cb_drop = function(e) {
    const t = y(e).original;
    return t.cnt-- == 1 ? (t.a = 0, true) : false;
  }, o.wbg.__wbg_has_0af94d20077affa2 = function() {
    return w(function(e, t) {
      return Reflect.has(f(e), f(t));
    }, arguments);
  }, o.wbg.__wbg_fetch_eadcbc7351113537 = function(e) {
    const t = fetch(f(e));
    return m(t);
  }, o.wbg.__wbg_fetch_921fad6ef9e883dd = function(e, t) {
    const r = f(e).fetch(f(t));
    return m(r);
  }, o.wbg.__wbindgen_debug_string = function(e, t) {
    const r = z(f(t)), n = R(r, d.__wbindgen_malloc, d.__wbindgen_realloc), s = j;
    _()[e / 4 + 1] = s, _()[e / 4 + 0] = n;
  }, o.wbg.__wbindgen_throw = function(e, t) {
    throw new Error(L(e, t));
  }, o.wbg.__wbg_then_0c86a60e8fcfe9f6 = function(e, t) {
    const r = f(e).then(f(t));
    return m(r);
  }, o.wbg.__wbg_queueMicrotask_481971b0d87f3dd4 = function(e) {
    queueMicrotask(f(e));
  }, o.wbg.__wbg_then_a73caa9a87991566 = function(e, t, r) {
    const n = f(e).then(f(t), f(r));
    return m(n);
  }, o.wbg.__wbg_queueMicrotask_3cbae2ec6b6cd3d6 = function(e) {
    const t = f(e).queueMicrotask;
    return m(t);
  }, o.wbg.__wbg_resolve_b0083a7967828ec8 = function(e) {
    const t = Promise.resolve(f(e));
    return m(t);
  }, o.wbg.__wbg_newwithstrandinit_3fd6fba4083ff2d0 = function() {
    return w(function(e, t, r) {
      const n = new Request(L(e, t), f(r));
      return m(n);
    }, arguments);
  }, o.wbg.__wbindgen_closure_wrapper3118 = function(e, t, r) {
    const n = le(e, t, 173, ce);
    return m(n);
  }, o;
}
function _e(o, e) {
  return d = o.exports, Z.__wbindgen_wasm_module = e, U = null, O = null, M = null, d.__wbindgen_start(), d;
}
async function Z(o) {
  if (d !== void 0) return d;
  typeof o > "u" && (o = new URL("/nanopub-create/assets/web_bg-CaMmR8bt.wasm", import.meta.url));
  const e = me();
  (typeof o == "string" || typeof Request == "function" && o instanceof Request || typeof URL == "function" && o instanceof URL) && (o = fetch(o));
  const { instance: t, module: r } = await be(await o, e);
  return _e(t, r);
}
class ge {
  constructor(e = {}) {
    this.options = { publishServer: e.publishServer || "https://np.petapico.org", theme: e.theme || "default", validateOnChange: e.validateOnChange !== false, showHelp: e.showHelp !== false, ...e }, this.template = null, this.formGenerator = null, this.builder = null, this.formData = {}, this.container = null, this.wasmInitialized = false, this.profile = null, this.credentials = null, this.listeners = { change: [], submit: [], error: [], publish: [], profileNeeded: [] }, this.initWasm(), this.loadCredentials();
  }
  async initWasm() {
    if (!this.wasmInitialized) try {
      await Z(), this.wasmInitialized = true, console.log("\u2713 WASM initialized successfully");
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
      const t = new fe().toJs();
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
      this.template = await G.fetchAndParse(e), this.template.uri = this.template.uri || e, this.formGenerator = new re(this.template, { validateOnChange: this.options.validateOnChange, showHelp: this.options.showHelp, labels: this.template.labels }), this.formGenerator.on("change", (r) => {
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
      const i = new k(e).sign(n);
      console.log("\u2705 Signed successfully"), console.log("  Signed type:", typeof i);
      const p = i.rdf();
      if (!this.options.publishServer) return console.log("\u{1F4E5} Download-only mode (no publish server configured)"), this.emit("publish", { uri: null, signedContent: p, downloadOnly: true }), { signedContent: p, downloadOnly: true };
      console.log("\u{1F4E4} Publishing to network..."), console.log("   Server:", this.options.publishServer);
      const a = await i.publish(n, this.options.publishServer);
      console.log("\u2705 Published successfully!"), console.log("\u{1F310} Result:", a);
      const u = typeof a == "string" ? a : a.uri || a.nanopub_uri;
      return this.emit("publish", { uri: u, signedContent: p }), { uri: u, nanopub_uri: u, signedContent: p };
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
let x = null, H = "";
async function we() {
  try {
    x = new ge({ publishServer: null }), x.on("change", (o) => {
      console.log("Form data changed:", o);
    }), x.on("submit", (o) => {
      console.log("Generated nanopub:", o.trigContent), H = o.trigContent, ye(o.trigContent);
    }), x.on("error", (o) => {
      console.error("Error:", o.type, o.error), E(`Error (${o.type}): ${o.error.message}`, "error");
    }), x.on("profileNeeded", () => {
      E("Please setup your profile first to sign nanopublications", "warning");
    }), console.log("\u2713 Creator initialized successfully"), V();
  } catch (o) {
    console.error("Failed to initialize:", o), E("Failed to initialize: " + o.message, "error");
  }
}
function V() {
  const o = document.getElementById("profile-status"), e = document.getElementById("profile-setup"), t = document.getElementById("profile-info");
  if (x.hasProfile()) {
    const r = x.getProfile();
    o.textContent = "Configured", o.className = "status success", e.classList.add("hidden"), t.classList.remove("hidden"), document.getElementById("profile-name").textContent = r.name;
    const n = document.getElementById("profile-orcid");
    r.orcid ? (n.textContent = r.orcid, n.href = r.orcid) : (n.textContent = "Not provided", n.href = "#");
    const s = x.exportKeys();
    document.getElementById("public-key-preview").textContent = s.publicKey;
  } else o.textContent = "Not configured", o.className = "status warning", e.classList.remove("hidden"), t.classList.add("hidden");
}
document.getElementById("setup-btn").addEventListener("click", async () => {
  const o = document.getElementById("name-input").value.trim(), e = document.getElementById("orcid-input").value.trim(), t = document.getElementById("setup-message"), r = document.getElementById("setup-btn");
  if (!o) {
    t.innerHTML = '<div class="error-message">Please enter your name</div>';
    return;
  }
  try {
    r.disabled = true, r.textContent = "Generating keys...", t.innerHTML = '<div class="info-message">\u2699\uFE0F Generating RSA keypair with nanopub-rs WASM...<br>This may take a few seconds.</div>', await x.setupProfile(o, e || null), t.innerHTML = '<div class="success-message">Profile created successfully! Your keys are stored in this browser.</div>', V(), setTimeout(() => {
      t.innerHTML = "";
    }, 5e3);
  } catch (n) {
    console.error("Profile setup failed:", n), t.innerHTML = `<div class="error-message">Failed: ${n.message}</div>`;
  } finally {
    r.disabled = false, r.textContent = "Generate Keys & Save Profile";
  }
});
document.getElementById("import-file").addEventListener("change", async (o) => {
  const e = o.target.files[0];
  if (!e) return;
  const t = document.getElementById("setup-message");
  try {
    const r = await e.text(), n = JSON.parse(r);
    if (!n.privateKey || !n.publicKey || !n.name) throw new Error("Invalid profile file format");
    x.importKeys(n), V(), t.innerHTML = '<div class="success-message">\u2713 Profile imported successfully!</div>', setTimeout(() => {
      t.innerHTML = "";
    }, 3e3);
  } catch (r) {
    console.error("Import failed:", r), t.innerHTML = `<div class="error-message">Import failed: ${r.message}</div>`;
  }
  o.target.value = "";
});
document.getElementById("export-btn").addEventListener("click", () => {
  try {
    const o = x.getProfile(), e = x.exportKeys(), t = { name: o.name, orcid: o.orcid, privateKey: e.privateKey, publicKey: e.publicKey, exportedAt: (/* @__PURE__ */ new Date()).toISOString() }, r = new Blob([JSON.stringify(t, null, 2)], { type: "application/json" }), n = URL.createObjectURL(r), s = document.createElement("a");
    s.href = n, s.download = `nanopub-profile-${o.name.replace(/\s+/g, "-").toLowerCase()}.json`, s.click(), URL.revokeObjectURL(n), E("\u2713 Profile exported!", "success");
  } catch (o) {
    console.error("Export failed:", o), E("Export failed: " + o.message, "error");
  }
});
document.getElementById("clear-btn").addEventListener("click", () => {
  confirm("Are you sure you want to clear your profile and keys? Make sure to export first if you want to keep them.") && (x.clearCredentials(), V(), E("Profile cleared", "info"));
});
document.getElementById("load-template-btn").addEventListener("click", async () => {
  const o = document.getElementById("template-uri").value.trim(), e = document.getElementById("template-container"), t = document.getElementById("template-message"), r = document.getElementById("load-template-btn");
  if (!o) {
    t.innerHTML = '<div class="error-message">Please enter a template URI</div>';
    return;
  }
  try {
    r.disabled = true, r.textContent = "Loading...", e.innerHTML = '<div class="loading">\u23F3 Loading template from network...</div>', t.innerHTML = "", await x.renderFromTemplateUri(o, e), t.innerHTML = '<div class="success-message">\u2713 Template loaded successfully!</div>', e.classList.add("template-loaded"), setTimeout(() => {
      t.innerHTML = "";
    }, 3e3);
  } catch (n) {
    console.error("Template load failed:", n), t.innerHTML = `<div class="error-message">Failed to load template: ${n.message}</div>`, e.innerHTML = '<div class="error-message">Failed to load template. Check console for details.</div>';
  } finally {
    r.disabled = false, r.textContent = "Load Template";
  }
});
function ye(o) {
  document.getElementById("preview-text").textContent = o, document.getElementById("preview-section").classList.remove("hidden");
}
document.getElementById("copy-btn").addEventListener("click", () => {
  const o = document.getElementById("preview-text").textContent;
  navigator.clipboard.writeText(o).then(() => {
    E("\u2713 Copied to clipboard!", "success");
  });
});
document.getElementById("sign-download-btn").addEventListener("click", () => {
  ve();
});
async function ve() {
  if (!H) {
    E("No nanopublication to sign", "warning");
    return;
  }
  if (!x.hasProfile()) {
    E("Please setup your profile first", "warning");
    return;
  }
  const o = document.getElementById("sign-download-btn");
  try {
    o.disabled = true, o.textContent = "Signing...", E("\u{1F510} Signing nanopublication...", "info");
    let t = (await x.publish(H)).signedContent.replace(/##/g, "#");
    const r = x.getProfile(), s = `nanopub-signed-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.trig`, i = new Blob([t], { type: "application/trig" }), p = URL.createObjectURL(i), a = document.createElement("a");
    a.href = p, a.download = s, a.click(), URL.revokeObjectURL(p), E("\u2705 Signed nanopub downloaded!", "success"), document.getElementById("preview-text").textContent = t;
  } catch (e) {
    console.error("Sign failed:", e), E(`Sign failed: ${e.message}`, "error");
  } finally {
    o.disabled = false, o.textContent = "Sign & Download";
  }
}
function E(o, e = "info") {
  const t = document.getElementById("messages"), r = document.createElement("div");
  r.className = `${e}-message`, r.textContent = o, r.style.marginBottom = "10px", r.style.animation = "slideIn 0.3s ease", t.appendChild(r), setTimeout(() => {
    r.style.animation = "slideOut 0.3s ease", setTimeout(() => r.remove(), 300);
  }, 5e3);
}
we();
