# nanopub-create

> JavaScript library for creating and publishing nanopublications from templates with interactive forms

Create nanopublications using templates from the [Knowledge Pixels network](https://knowledgepixels.com/) with an easy-to-use form interface. Built with vanilla JavaScript and powered by [nanopub-rs WASM](https://github.com/vemonet/nanopub-rs) for signing and publishing.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

## ✨ Features

- **Template-based creation** - Load any nanopub template by URI
- **Auto-generated forms** - Dynamic forms from template placeholders
- **Built-in signing** - RSA key generation and nanopub signing via WASM
- **Network publishing** - Publish directly to nanopub network
- **Type handling** - Automatically handles `nt:ASSERTION`, `nt:CREATOR`, and other special placeholders
- **Smart labels** - Extracts human-readable labels from URIs and patterns
- **Nanodash compatible** - Generates nanopubs matching nanodash output format

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/ScienceLiveHub/nanopub-create.git
cd nanopub-create
npm install
```

### Development

```bash
# Start dev server
npm run dev

# Open browser to http://localhost:3000/demo/index.html
```

### Try It Out

#### Using the Demo

1. **Setup Profile**
   - Enter your name
   - Add ORCID (optional)
   - Click "Generate Keys & Save Profile"

2. **Load a Template**
   - Try: `https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo`
   - Click "Load Template"

3. **Fill the Form**
   - Enter values for all fields
   - Click "Create Nanopublication"

4. **Sign & Download**
   - Review the preview (unsigned nanopub in TriG format)
   - Click "Sign & Download" to sign and download the nanopublication

#### Publishing Your Signed Nanopublication

After downloading your signed nanopublication file (e.g., `nanopub-signed-2025-10-26T16-03-01-925Z.trig`), you can publish it to the nanopub network:

**Using curl:**
```bash
curl -X POST https://np.knowledgepixels.com/ \
  -H "Content-Type: application/trig" \
  --data-binary @nanopub-signed-2025-10-26T16-03-01-925Z.trig
```

**Using nanopub-rs CLI:**
```bash
# Install nanopub CLI (if not already installed)
cargo install nanopub

# Publish your signed nanopub
nanopub publish nanopub-signed-2025-10-26T16-03-01-925Z.trig
```

**Viewing Your Published Nanopub:**

After successful publication, you'll receive a nanopub URI like:
```
https://w3id.org/np/RAbc123...
```

View it in Nanodash:
```
https://nanodash.knowledgepixels.com/explore?id=https://w3id.org/np/RAbc123...
```

Or search for your nanopubs by ORCID at [Nanodash](https://nanodash.knowledgepixels.com/)

## 📖 Usage

### As a Library

```javascript
import { NanopubCreator } from './src/index.js';

// Initialize
const creator = new NanopubCreator();
await creator.init();

// Setup profile
await creator.setupProfile('Your Name', 'https://orcid.org/0000-0002-1234-5678');

// Load template and render form
const templateUri = 'https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo';
const container = document.getElementById('form-container');
await creator.renderFromTemplateUri(templateUri, container);

// Listen for nanopub creation
creator.on('create', ({ trigContent }) => {
  console.log('Created nanopub:', trigContent);
});

// Publish
await creator.publish(trigContent);
```

### Programmatic Creation

```javascript
// Create without form UI
const template = await creator.loadTemplate(templateUri);
const formData = {
  'st01_subject': 'https://doi.org/10.1234/example',
  'st02_predicate': 'http://purl.org/spar/cito/cites',
  'st02_object': 'https://doi.org/10.5678/cited'
};

const trigContent = await creator.createNanopub(template, formData);
```

## 🏗️ Project Structure

```
nanopub-create/
├── src/
│   ├── core/
│   │   ├── nanopubBuilder.js      # Generates TriG from templates
│   │   ├── templateParser.js      # Parses nanopub templates
│   │   └── formGenerator.js       # Creates HTML forms
│   ├── utils/
│   │   └── labelFetcher.js        # Fetches URI labels
│   ├── styles/
│   │   └── creator.css            # UI styling
│   └── index.js                   # Main entry point
├── demo/
│   └── index.html                 # Demo page
├── package.json
├── vite.config.js
├── LICENSE
└── README.md
```

## 🔧 How It Works

### 1. Template Parsing
```javascript
// Fetches and parses template
const template = await templateParser.parse(templateContent);

// Extracts:
// - Placeholders (form fields)
// - Statements (RDF structure)
// - Metadata (types, labels, patterns)
```

### 2. Form Generation
```javascript
// Creates HTML form from placeholders
formGenerator.render(template, container);

// Supports:
// - Text inputs (LiteralPlaceholder)
// - Textareas (LongLiteralPlaceholder)
// - Dropdowns (RestrictedChoicePlaceholder)
// - URL inputs (ExternalUriPlaceholder)
```

### 3. Nanopub Building
```javascript
// Generates TriG format
const trig = await nanopubBuilder.buildFromFormData(formData, metadata);

// Handles:
// - Special placeholders (nt:ASSERTION, nt:CREATOR)
// - Label patterns (${placeholder} replacement)
// - Multi-line strings (triple quotes)
// - Type declarations (npx:hasNanopubType)
```

### 4. Signing & Publishing
```javascript
// Sign with WASM
const signed = await nanopubSign.sign(trig, privateKey);

// Publish to network
const uri = await nanopubSign.publish(signed);
```

## 📝 Template Support

Supports all standard nanopub template types:

| Placeholder Type | Form Element | Example |
|-----------------|--------------|---------|
| `LiteralPlaceholder` | Text input | Short text |
| `LongLiteralPlaceholder` | Textarea | Multi-line text |
| `ExternalUriPlaceholder` | URL input | DOI, URL |
| `UriPlaceholder` | URL input | Any URI |
| `RestrictedChoicePlaceholder` | Dropdown | Predefined options |
| `GuidedChoicePlaceholder` | Autocomplete | Search-based |
| `IntroducedResource` | Text input | New resource |

### Special Placeholders

- `nt:ASSERTION` → Replaced with `sub:assertion`
- `nt:CREATOR` → Replaced with user's ORCID

### Label Patterns

Templates can include dynamic labels:
```turtle
nt:hasNanopubLabelPattern "Citations for: ${article}"
```

Automatically extracts values and generates:
```turtle
rdfs:label "Citations for: 10.1145/3460210.3493546"
```

## 🎯 Example Templates

### Citation Template
```
https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo
```
Declare citations with CiTO - create citation relationships between papers.

### Comment Template
```
https://w3id.org/np/RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI
```
Comment on or evaluate papers - add quotes and commentary.

### More Templates
Browse available templates at [Nanodash](https://nanodash.knowledgepixels.com/)

## 🔒 Profile Management

### Generate Keys
```javascript
await creator.setupProfile('Your Name', 'https://orcid.org/0000-0002-1234-5678');
```

Keys are stored in browser `localStorage` and never leave your machine.

### Export Profile
```javascript
const keys = creator.exportKeys();
// Download as JSON for backup
```

### Import Profile
```javascript
creator.importKeys(profileData);
// Restore from backup
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Clear cache and restart
npx vite --force
```

### Configuration

**vite.config.js:**
```javascript
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  optimizeDeps: {
    exclude: ['@nanopub/sign']  // CRITICAL for WASM
  }
});
```

## 📦 Dependencies

### Runtime
- `@nanopub/sign` - WASM library for signing/publishing

### Development
- `vite` - Build tool and dev server
- `vite-plugin-wasm` - WASM support
- `vite-plugin-top-level-await` - Top-level await support

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### Double Hash `##` in Signed URIs

There's a known issue with `@nanopub/sign` WASM where signed nanopubs contain `##` instead of `#` in graph URIs. This causes publishing to fail with "Invalid IRI" errors.

**Workaround in `index.html`:**
```javascript
// In signAndDownload() function around line 701
let signedContent = result.signedContent.replace(/##/g, '#');
```

This fix is already applied in the demo. See [GitHub issue](https://github.com/vemonet/nanopub-rs/issues) for status.

### WASM Not Loading
```bash
# Clear cache and restart
npx vite --force
```

### Types Not Showing
Check that `templateParser.js` searches entire template:
```javascript
// Should be this.content, not assertionBlock
const typesMatch = this.content.match(/nt:hasTargetNanopubType/);
```

### Label Pattern Not Working
Verify pattern is being parsed:
```javascript
// Should search this.content
const patternMatch = this.content.match(/nt:hasNanopubLabelPattern/);
```

### Correct Prefix Format
The `sub:` prefix should have `#` at the end (this is correct):
```javascript
`@prefix sub: <${baseUri}#> .`  // ✓ Correct - matches nanodash format
```

## 📚 Resources

- [Nanopub Documentation](https://nanopub.net/)
- [Knowledge Pixels](https://knowledgepixels.com/)
- [nanopub-rs WASM](https://github.com/vemonet/nanopub-rs)
- [Nanodash](https://nanodash.knowledgepixels.com/)
- [CiTO Ontology](https://sparontologies.github.io/cito/current/cito.html)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 👥 Authors

**ScienceLive Hub**
- GitHub: [@ScienceLiveHub](https://github.com/ScienceLiveHub)
- Website: [sciencelive4all.org](https://sciencelive4all.org)

## 🙏 Acknowledgments

- Built on [nanopub-rs](https://github.com/vemonet/nanopub-rs) by [@vemonet](https://github.com/vemonet)
- Template system from [Knowledge Pixels](https://knowledgepixels.com/)
- Compatible with [Nanodash](https://nanodash.knowledgepixels.com/)

## 🌟 Star History

If you find this project useful, please consider giving it a star! ⭐

---

**Questions?** Open an issue or visit our [discussions](https://github.com/ScienceLiveHub/nanopub-create/discussions)
