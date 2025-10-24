# nanopub-create

A JavaScript library for creating nanopublications from templates with intuitive GUI forms.

## Features

- ✅ **Template-driven forms**: Automatically generate forms from nanopublication templates
- ✅ **Human-readable labels**: Fetches and displays rdfs:label for URIs
- ✅ **Smart field types**: Supports text, textarea, select, URL, and more
- ✅ **Repeatable fields**: Support for grouped and repeatable statements
- ✅ **Validation**: Built-in validation with regex support
- ✅ **React component**: Optional React wrapper for easy integration
- ✅ **WASM integration**: Optional Rust WASM backend for performance

## Installation

```bash
npm install nanopub-create
```

## Quick Start

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="node_modules/nanopub-create/src/styles/creator.css">
</head>
<body>
  <div id="form-container"></div>

  <script type="module">
    import { NanopubCreator } from 'nanopub-create';

    const creator = new NanopubCreator({
      container: '#form-container',
      validateOnChange: true,
      showHelp: true
    });

    // Load template and render form
    await creator.renderFromTemplateUri(
      'https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU'
    );

    // Listen to events
    creator.on('submit', async ({ trigContent, formData }) => {
      console.log('Nanopub created:', trigContent);
      
      // Optionally publish
      const result = await creator.publish(trigContent);
      console.log('Published:', result);
    });
  </script>
</body>
</html>
```

### React

```jsx
import React from 'react';
import { NanopubCreator } from 'nanopub-create/react';
import 'nanopub-create/styles';

function App() {
  const handleSubmit = ({ trigContent, formData }) => {
    console.log('Nanopub created:', trigContent);
  };

  return (
    <NanopubCreator
      templateUri="https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU"
      onSubmit={handleSubmit}
      publishServer="https://np.petapico.org/"
      autoPublish={false}
      validateOnChange={true}
      showHelp={true}
    />
  );
}
```

## API Reference

### NanopubCreator

#### Constructor Options

```javascript
const creator = new NanopubCreator({
  container: '#form-container',    // Container selector or element
  publishServer: 'https://np.petapico.org/', // Nanopub server
  validateOnChange: true,           // Validate fields on change
  showHelp: true,                   // Show help text
  autoPublish: false,               // Auto-publish on submit
  theme: 'default',                 // Theme name
  creator: 'https://orcid.org/...', // Creator ORCID
  creatorName: 'Your Name'          // Creator name
});
```

#### Methods

##### `renderFromTemplateUri(templateUri: string, container?: HTMLElement): Promise<HTMLFormElement>`

Loads a template from a URI and renders the form.

```javascript
await creator.renderFromTemplateUri(
  'https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU'
);
```

##### `renderFromTemplate(template: object, container?: HTMLElement): HTMLFormElement`

Renders a form from a parsed template object.

```javascript
const template = await parseTemplateFromUri(templateUri);
creator.renderFromTemplate(template);
```

##### `getFormData(): object`

Gets current form data.

```javascript
const formData = creator.getFormData();
console.log(formData);
```

##### `setFormData(data: object): void`

Sets form data programmatically.

```javascript
creator.setFormData({
  title: 'My Nanopublication',
  description: 'This is a test'
});
```

##### `generateTriG(metadata?: object): Promise<string>`

Generates TriG content without publishing.

```javascript
const trigContent = await creator.generateTriG({
  creator: 'https://orcid.org/0000-0001-2345-6789',
  creatorName: 'John Doe'
});
```

##### `publish(trigContent: string): Promise<object>`

Publishes a nanopublication to the server.

```javascript
const result = await creator.publish(trigContent);
console.log('Published URI:', result.uri);
```

#### Events

##### `on(event: string, callback: Function): void`

Registers event listeners.

**Available events:**

- `change`: Form data changed
- `submit`: Form submitted
- `error`: Error occurred
- `published`: Nanopublication published

```javascript
creator.on('change', (formData) => {
  console.log('Form changed:', formData);
});

creator.on('submit', ({ trigContent, formData }) => {
  console.log('Submitted:', trigContent);
});

creator.on('error', ({ type, error, errors }) => {
  console.error('Error:', type, error, errors);
});

creator.on('published', (result) => {
  console.log('Published:', result.uri);
});
```

## Template Structure

Templates are TriG-formatted nanopublications that define:

1. **Placeholders**: Form fields (text, textarea, select, URL, etc.)
2. **Statements**: RDF triple patterns with placeholders
3. **Metadata**: Labels, descriptions, validation rules

### Example Template Structure

```turtle
@prefix this: <http://example.org/template#> .
@prefix sub: <http://example.org/template#> .
@prefix nt: <https://w3id.org/np/o/ntemplate/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .

this: a nt:AssertionTemplate ;
  rdfs:label "Example Template" ;
  dct:description "A template for creating example nanopublications" ;
  nt:hasNanopubLabelPattern "Example: ${title}" .

# Placeholder definition
sub:title a nt:LiteralPlaceholder ;
  rdfs:label "Title" ;
  dct:description "The title of this nanopublication" ;
  nt:hasRegex "^.{3,200}$" .

sub:description a nt:LongLiteralPlaceholder ;
  rdfs:label "Description" ;
  dct:description "A detailed description" .

# Statement pattern
sub:statement1 rdf:subject sub:assertion ;
  rdf:predicate dct:title ;
  rdf:object sub:title .
```

## Advanced Usage

### Custom Label Fetching

The library automatically fetches labels for URIs, but you can provide custom labels:

```javascript
const creator = new NanopubCreator({
  container: '#form-container',
  labels: {
    'http://purl.org/dc/terms/title': 'Document Title',
    'http://purl.org/dc/terms/description': 'Document Description'
  }
});
```

### Repeatable Fields

Templates can define repeatable statements for lists:

```turtle
sub:statement1 a nt:RepeatableStatement ;
  rdf:subject sub:assertion ;
  rdf:predicate dct:subject ;
  rdf:object sub:keyword .
```

This creates a "+" button to add multiple values.

### Validation

Custom validation with regex:

```turtle
sub:email a nt:LiteralPlaceholder ;
  rdfs:label "Email" ;
  nt:hasRegex "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" .
```

### Select Fields (RestrictedChoicePlaceholder)

Load options from a nanopublication:

```turtle
sub:category a nt:RestrictedChoicePlaceholder ;
  rdfs:label "Category" ;
  nt:possibleValuesFrom <https://w3id.org/np/RA_categories> .
```

## Development

### Setup

```bash
git clone https://github.com/ScienceLiveHub/nanopub-create
cd nanopub-create
npm install
```

### Run Demo

```bash
npm run dev
```

Then open `http://localhost:5173/demo.html`

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## Architecture

```
nanopub-create/
├── src/
│   ├── core/
│   │   ├── templateParser.js    # Parses TriG templates
│   │   ├── formGenerator.js     # Generates HTML forms
│   │   ├── nanopubBuilder.js    # Builds TriG from form data
│   │   └── publisher.js         # Publishes to nanopub server
│   ├── react/
│   │   └── NanopubCreator.tsx   # React wrapper
│   ├── wasm/
│   │   └── bridge.js            # WASM integration (optional)
│   ├── styles/
│   │   └── creator.css          # Form styles
│   ├── index.js                 # Main entry point
│   └── react.js                 # React entry point
├── demo.html                    # Demo page
├── package.json
└── README.md
```

## Key Classes

### TemplateParser

Parses nanopublication templates and extracts:
- Placeholders (form fields)
- Statements (RDF patterns)
- Labels and metadata
- Validation rules

### FormGenerator

Generates HTML forms from templates with:
- Human-readable labels
- Field validation
- Repeatable fields
- Custom themes

### NanopubBuilder

Builds TriG content from form data:
- Substitutes placeholders
- Generates trusty URIs
- Adds provenance
- Signs nanopublications (with WASM)

### NanopubPublisher

Publishes nanopublications:
- HTTP POST to nanopub server
- Gets published URI
- Returns trusty URI

## Troubleshooting

### Form not rendering

Check the console for errors. Common issues:
- Template URI not accessible
- Missing CORS headers
- Invalid template structure

### Labels showing as URIs

If labels appear as full URIs instead of human-readable text:
1. Check that `parseWithLabels()` is called in templateParser
2. Verify labels are passed to FormGenerator
3. Check network tab for failed label fetches

### WASM errors

The library works without WASM using JavaScript fallback. If you need WASM:
1. Build the Rust WASM module separately
2. Place in `src/wasm/nanopub_rs.js`
3. The bridge will auto-detect and use it

## Integration with Zotero Plugin

This library is used by the Zotero Nanopub Plugin. Key integration points:

1. **PDF Selection**: Extract text from PDF and pre-fill forms
2. **Metadata**: Auto-populate DOI, title, authors from Zotero items
3. **Templates**: Use template URIs from plugin configuration
4. **Publishing**: Post to nanopub server and add result as note

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file

## Credits

Built for the [Knowledge Pixels](https://knowledgepixels.com/) ecosystem.

Part of the [ScienceLive Hub](https://github.com/ScienceLiveHub) project.

## Links

- [Nanopublications](http://nanopub.org/)
- [Nanodash](https://nanodash.knowledgepixels.com/)
- [YASGUI Query Interface](https://query.petapico.org/tools/full/yasgui.html)
- [Zotero Plugin](https://github.com/ScienceLiveHub/zotero-plugin-nanopub)
