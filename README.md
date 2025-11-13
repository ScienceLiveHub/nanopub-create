# nanopub-create

> JavaScript library for creating and publishing nanopublications from templates with interactive forms

Create nanopublications using templates from the [Knowledge Pixels network](https://knowledgepixels.com/) with an easy-to-use form interface. Built with vanilla JavaScript and powered by [nanopub-rs WASM](https://github.com/vemonet/nanopub-rs) for signing and publishing.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

## Features

- **Template-based creation** - Load any nanopub template by URI
- **Auto-generated forms** - Dynamic forms from template placeholders
- **Template customization** - Add custom styles and behavior per template type
- **Built-in signing** - RSA key generation and nanopub signing via WASM
- **Network publishing** - Publish directly to nanopub network
- **Type handling** - Automatically handles `nt:ASSERTION`, `nt:CREATOR`, and other special placeholders
- **Smart labels** - Extracts human-readable labels from URIs and patterns
- **Valid nanopubs** - Generates standards-compliant nanopublications with trusty URIs

## Quick Start

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

# Open browser to http://localhost:3000/nanopub-create/demo/index.html 
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

You can view your published nanopublication using the companion library [nanopub-view](https://github.com/ScienceLiveHub/nanopub-view).

## Usage

### As a Library

```javascript
import NanopubCreator from '@sciencelivehub/nanopub-create';

// Initialize
const creator = new NanopubCreator({
  publishServer: null  // Set to null for signing only, or provide server URL for publishing
});

// Initialize WASM
await creator.initWasm();

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

// Sign the nanopub
const signedContent = await creator.publish(trigContent);

// The signed nanopub can then be published to a nanopub server
```

### Programmatic Creation

```javascript
// For programmatic creation without a form UI, you can use the lower-level APIs:

import { TemplateParser } from '@sciencelivehub/nanopub-create';
import { NanopubBuilder } from '@sciencelivehub/nanopub-create';

// Parse template
const parser = new TemplateParser();
const template = await parser.fetchTemplate(templateUri);
await parser.parseTemplate();

// Build nanopub from form data
const builder = new NanopubBuilder(parser.template);
const formData = {
  'st01_subject': 'https://doi.org/10.1234/example',
  'st02_predicate': 'http://purl.org/spar/cito/cites',
  'st02_object': 'https://doi.org/10.5678/cited'
};

const trigContent = await builder.buildFromFormData(formData, {
  creator: 'https://orcid.org/0000-0002-1234-5678',
  creatorName: 'Your Name'
});

// Then sign with the creator instance
const signedContent = await creator.publish(trigContent);
```

## Template Customization

nanopub-create supports custom styling and behavior for different template types through a flexible customization system.

### Available Templates

**Geographical Coverage** - Document geographical coverage of research
```
https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao
```

**Citation with CiTO** - Create citation relationships between papers
```
https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo
```

**Comment on Paper** - Add quotes and commentary to papers
```
https://w3id.org/np/RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI
```

Browse more templates at [Knowledge Pixels](https://knowledgepixels.com/) or explore existing nanopublications to find templates.

### Creating Custom Templates

To add custom styling and behavior for a template:

1. **Create a template class** in `src/templates/[name]/[name]Template.js`
2. **Create template styles** in `src/styles/templates/[name].css`
3. **Register the template** in `src/templates/registry.js`
4. **Import the styles** in `src/styles/styles-index.css`

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions on creating custom template styles.

### Example: Geographical Template

The geographical template demonstrates the customization system:

**Custom styling** - Green theme for geography-related forms
```css
.template-geographical {
  --geo-primary: #059669;
}
```

**Field grouping** - Groups geometry and WKT fields together
```javascript
detectSemanticGroups() {
  return [{
    id: 'geometry-group',
    label: 'Geometry Details (WKT Format)',
    statements: [geometryLinkStmt.id, wktStmt.id],
    collapsible: true
  }];
}
```

**Auto-fill rules** - Automatically derives geometry ID from location
```javascript
getAutofillRules() {
  return [{
    trigger: 'location',
    target: 'geometry-id',
    transform: (value) => value.toLowerCase().replace(/\s+/g, '-')
  }];
}
```

**Field hints** - Provides helpful examples for WKT format
```javascript
customizeField(field, placeholder) {
  if (placeholder.id === 'wkt') {
    const hint = document.createElement('div');
    hint.innerHTML = 'WKT Format Example: POINT(2.3 48.9)';
    field.parentElement?.appendChild(hint);
  }
}
```

## Project Structure

```
nanopub-create/
├── src/
│   ├── core/
│   │   ├── nanopubBuilder.js      # Generates TriG from templates
│   │   ├── templateParser.js      # Parses nanopub templates
│   │   └── formGenerator.js       # Creates HTML forms
│   ├── templates/
│   │   ├── registry.js            # Template customization registry
│   │   ├── base/
│   │   │   └── baseTemplate.js    # Base customization class
│   │   └── geographical/
│   │       └── geographicalTemplate.js  # Example customization
│   ├── components/
│   │   └── ui/                    # Reusable UI components
│   ├── styles/
│   │   ├── tailwind.base.css      # Base Tailwind utilities
│   │   ├── styles-index.css       # Main CSS entry point
│   │   └── templates/
│   │       └── geographical.css   # Template-specific styles
│   ├── utils/
│   │   └── labelFetcher.js        # Fetches URI labels
│   └── index.js                   # Main entry point
├── demo/
│   └── index.html                 # Demo page
├── package.json
├── vite.config.js
├── CONTRIBUTING.md                # Template customization guide
├── LICENSE
└── README.md
```

## How It Works

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

## Template Support

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

- `nt:ASSERTION` - Replaced with `sub:assertion`
- `nt:CREATOR` - Replaced with user's ORCID

### Label Patterns

Templates can include dynamic labels:
```turtle
nt:hasNanopubLabelPattern "Citations for: ${article}"
```

Automatically extracts values and generates:
```turtle
rdfs:label "Citations for: 10.1145/3460210.3493546"
```

## Profile Management

### Generate Keys and Setup Profile
```javascript
await creator.initWasm();
await creator.setupProfile('Your Name', 'https://orcid.org/0000-0002-1234-5678');
```

Keys are stored in browser `localStorage` and never leave your machine.

### Check Profile Status
```javascript
const hasProfile = creator.hasProfile();
const profile = creator.getProfile(); // Returns { name, orcid }
```

### Export Profile
```javascript
const keys = creator.exportKeys();
// Save as JSON for backup
```

### Import Profile
```javascript
creator.importKeys(profileData);
// Restore from backup
```

### Clear Credentials
```javascript
creator.clearCredentials();
// Removes stored profile and keys
```

## Development

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

## Dependencies

### Runtime
- `@nanopub/sign` - WASM library for signing/publishing

### Development
- `vite` - Build tool and dev server
- `vite-plugin-wasm` - WASM support
- `vite-plugin-top-level-await` - Top-level await support

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- How to create custom template styles
- Code style guidelines
- Pull request process

## Troubleshooting

### Hash URIs vs Slash URIs

The `@nanopub/sign` WASM library generates hash-based URIs (`#`) for nanopub graphs. **nanopub-create uses these hash URIs as-is** to maintain cryptographic integrity.

**Why hash URIs are used:**
- Required for trusty URI validation (cryptographic hash verification)
- Changing URIs after signing breaks the trusty hash
- Hash URIs are still valid and functional nanopublications
- Compatible with the nanopub network and ecosystem

**Output format:**
```turtle
PREFIX sub: <https://w3id.org/np/RA...#> .

GRAPH <https://w3id.org/np/RA...#/Head> {
  this: np:hasAssertion <...#/assertion> .
}
```

**Note on slash URIs:**
While slash-based URIs (`/`) are more RESTful and HTTP dereferenceable, converting hash URIs to slash URIs after signing breaks the trusty hash validation, preventing publication to the nanopub network. The WASM library would need to be modified to generate slash URIs natively for this to work.

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

## Resources

- [Nanopub Documentation](https://nanopub.net/)
- [Knowledge Pixels](https://knowledgepixels.com/)
- [nanopub-rs WASM](https://github.com/vemonet/nanopub-rs)
- [nanopub-view](https://github.com/ScienceLiveHub/nanopub-view) - Companion library for viewing nanopublications
- [CiTO Ontology](https://sparontologies.github.io/cito/current/cito.html)

## License

MIT License - see [LICENSE](LICENSE) file for details

## Authors

**ScienceLive Hub**
- GitHub: [@ScienceLiveHub](https://github.com/ScienceLiveHub)
- Website: [sciencelive4all.org](https://sciencelive4all.org)

## Acknowledgments

- Built on [nanopub-rs](https://github.com/vemonet/nanopub-rs) by [@vemonet](https://github.com/vemonet)
- Template system from [Knowledge Pixels](https://knowledgepixels.com/)
- Part of the ScienceLive ecosystem with companion library [nanopub-view](https://github.com/ScienceLiveHub/nanopub-view)

---

**Questions?** Open an issue or visit our [discussions](https://github.com/ScienceLiveHub/nanopub-create/discussions)
