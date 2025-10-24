# nanopub-create

A JavaScript/TypeScript library for creating nanopublications from templates. Part of the Science Live Hub ecosystem.

## 🚀 Features

- **Template-based creation** - Generate nanopublications from TriG templates
- **Interactive forms** - Automatically generate user-friendly forms from templates
- **Variable predicates** - Support for templates with dynamic predicates (e.g., citation types)
- **Repeatable fields** - Add multiple instances of fields (authors, citations, etc.)
- **Validation** - Built-in validation for required fields, URIs, and patterns
- **React support** - Pre-built React component for easy integration
- **WASM-ready** - Architecture supports Rust/WASM for crypto operations
- **No dependencies** - Vanilla JS core with optional React wrapper

## 📦 Installation

```bash
npm install @sciencelivehub/nanopub-create
```

## 🎯 Quick Start

### Vanilla JavaScript

```javascript
import NanopubCreator from '@sciencelivehub/nanopub-create';
import '@sciencelivehub/nanopub-create/styles';

const creator = new NanopubCreator({
  publishServer: 'https://np.petapico.org/',
  theme: 'default'
});

// Render form from template
await creator.renderFromTemplateUri(
  'https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU',
  '#creator-container'
);

// Listen to events
creator.on('submit', async ({ trigContent }) => {
  console.log('Generated nanopublication:', trigContent);
});
```

### React

```jsx
import { NanopubCreator } from '@sciencelivehub/nanopub-create/react';
import '@sciencelivehub/nanopub-create/styles';

function App() {
  return (
    <NanopubCreator
      templateUri="https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU"
      onSubmit={({ trigContent }) => {
        console.log('Generated:', trigContent);
      }}
      publishServer="https://np.petapico.org/"
      autoPublish={false}
    />
  );
}
```

## 📖 API Reference

### NanopubCreator Class

#### Constructor Options

```javascript
const creator = new NanopubCreator({
  container: '#my-container',        // Container selector or element
  templateUri: 'https://...',        // Template URI to load
  publishServer: 'https://...',      // Nanopub server URL
  theme: 'default',                  // UI theme
  validateOnChange: true,            // Validate fields on change
  showHelp: true,                    // Show help text
  autoPublish: false,                // Auto-publish on submit
  creator: 'https://orcid.org/...',  // Creator ORCID
  creatorName: 'Your Name',          // Creator name
  creatorOrcid: '0000-0000-0000-0000' // Creator ORCID ID
});
```

#### Methods

**renderFromTemplateUri(templateUri, container)**
```javascript
await creator.renderFromTemplateUri(
  'https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU',
  '#container'
);
```

**renderFromTemplate(template, container)**
```javascript
const template = await parseTemplateFromUri(templateUri);
creator.renderFromTemplate(template, '#container');
```

**generateTriG(metadata)**
```javascript
const trigContent = await creator.generateTriG({
  creator: 'https://orcid.org/0000-0000-0000-0000',
  creatorName: 'Jane Researcher'
});
```

**publish(trigContent)**
```javascript
const result = await creator.publish(trigContent);
console.log('Published:', result.uri);
```

**setFormData(data)**
```javascript
creator.setFormData({
  title: 'My Paper Title',
  abstract: 'This is the abstract...'
});
```

**getFormData()**
```javascript
const data = creator.getFormData();
```

**on(event, callback)**
```javascript
creator.on('change', (data) => console.log('Form changed:', data));
creator.on('submit', ({ trigContent }) => console.log('Submitted:', trigContent));
creator.on('error', ({ type, error }) => console.error('Error:', error));
creator.on('published', (result) => console.log('Published:', result));
```

**destroy()**
```javascript
creator.destroy(); // Clean up
```

### React Component Props

```typescript
interface NanopubCreatorProps {
  templateUri: string;                // Required: Template URI
  onSubmit?: (data) => void;          // Submit handler
  onChange?: (data) => void;          // Change handler
  onError?: (error) => void;          // Error handler
  onPublished?: (result) => void;     // Publish handler
  publishServer?: string;             // Server URL
  autoPublish?: boolean;              // Auto-publish
  theme?: string;                     // UI theme
  validateOnChange?: boolean;         // Validate on change
  showHelp?: boolean;                 // Show help text
  creator?: string;                   // Creator URI
  creatorName?: string;               // Creator name
  creatorOrcid?: string;              // Creator ORCID
  className?: string;                 // CSS class
}
```

## 🏗️ Architecture

### Hybrid JavaScript + Rust/WASM

```
┌─────────────────────────────────────────────┐
│          User Interface (JS/React)          │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
  ┌──────────┐ ┌─────────┐ ┌──────────┐
  │ Template │ │  Form   │ │ Nanopub  │
  │  Parser  │ │Generator│ │ Builder  │
  └──────────┘ └─────────┘ └──────────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │ nanopub-rs (WASM)  │
                    │  • Sign            │
                    │  • Validate        │
                    │  • Publish         │
                    └────────────────────┘
```

### File Structure

```
nanopub-create/
├── src/
│   ├── index.js              # Main entry point
│   ├── react.js              # React exports
│   ├── core/
│   │   ├── templateParser.js # Parse TriG templates
│   │   ├── formGenerator.js  # Generate HTML forms
│   │   ├── nanopubBuilder.js # Build nanopubs
│   │   └── publisher.js      # Publish nanopubs
│   ├── wasm/
│   │   └── bridge.js         # WASM bridge
│   ├── react/
│   │   └── NanopubCreator.tsx # React component
│   └── styles/
│       └── creator.css       # Styles
├── demo/
│   └── index.html            # Demo page
├── dist/                     # Built files
├── package.json
├── vite.config.js
└── README.md
```

## 🛠️ Development

### Prerequisites

- Node.js 20+
- npm or yarn

### Setup

```bash
# Clone repository
git clone https://github.com/ScienceLiveHub/nanopub-create.git
cd nanopub-create

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Build

```bash
# Build library
npm run build

# Build demo
npm run build:demo
```

### Scripts

- `npm run dev` - Start dev server with demo
- `npm run build` - Build library for distribution
- `npm run build:demo` - Build demo site
- `npm run preview` - Preview built demo
- `npm run test` - Run tests
- `npm run lint` - Lint code

## 🎨 Customization

### Themes

Customize appearance with CSS variables:

```css
.nanopub-creator {
  --primary-color: #1976d2;
  --error-color: #d32f2f;
  --border-color: #ddd;
  --background: white;
  --text-color: #333;
}
```

### Custom Validation

```javascript
const creator = new NanopubCreator({
  customValidation: {
    email: (value) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
  }
});
```

## 🔗 Integration

### Zotero Plugin

This library is used in the [Zotero Nanopub Plugin](https://github.com/ScienceLiveHub/zotero-plugin-nanopub):

```javascript
// In Zotero plugin
import NanopubCreator from 'nanopub-create';

const creator = new NanopubCreator({
  container: dialogElement,
  templateUri: templateUrl
});

creator.on('submit', async ({ trigContent }) => {
  // Open nanodash with pre-filled content
  window.open(`https://nanodash.knowledgepixels.com/publish?...`);
});
```

### Science Live Platform

Integrate with Science Live:

```javascript
import NanopubCreator from '@sciencelivehub/nanopub-create';

const creator = new NanopubCreator({
  publishServer: 'https://np.petapico.org/',
  creator: userOrcid,
  autoPublish: true
});

creator.on('published', (result) => {
  // Add to Science Live feed
  scienceLive.addNanopub(result.uri);
});
```

## 📝 Template Format

Templates use TriG format with nanopub-template annotations:

```turtle
@prefix this: <https://w3id.org/np/RAexample> .
@prefix nt: <https://w3id.org/np/o/ntemplate/> .

this: a nt:AssertionTemplate ;
  rdfs:label "Example Template" ;
  nt:hasStatement sub:st1 .

sub:title a nt:LiteralPlaceholder ;
  rdfs:label "Title" ;
  nt:hasRegex ".*" .

sub:st1 rdf:subject sub:work ;
  rdf:predicate dct:title ;
  rdf:object sub:title .
```

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- **Demo**: [https://sciencel ivehub.github.io/nanopub-create](https://sciencelivehub.github.io/nanopub-create)
- **GitHub**: [https://github.com/ScienceLiveHub/nanopub-create](https://github.com/ScienceLiveHub/nanopub-create)
- **Science Live**: [https://science.live](https://science.live)
- **Nanopub**: [http://nanopub.org](http://nanopub.org)
- **Knowledge Pixels**: [https://knowledgepixels.com](https://knowledgepixels.com)

## 📚 Related Projects

- [nanopub-view](https://github.com/ScienceLiveHub/nanopub-view) - Display nanopublications
- [zotero-plugin-nanopub](https://github.com/ScienceLiveHub/zotero-plugin-nanopub) - Zotero integration
- [nanopub-rs](https://github.com/vemonet/nanopub-rs) - Rust nanopub library
