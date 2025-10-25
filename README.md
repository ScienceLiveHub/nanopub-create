# Nanopub Creator

A JavaScript library for creating nanopublications from templates with an intuitive form interface.

## 🚀 Features

- **Template Parsing**: Automatically parse nanopublication templates in TriG/Turtle format
- **Dynamic Form Generation**: Generate user-friendly forms from template definitions
- **Visual Grouping**: Intelligently groups related statements by subject
- **Science Live Branding**: Beautiful UI with purple/magenta color palette
- **Multiple Input Types**: Support for text, textarea, dropdowns, URIs, dates, and more
- **Validation**: Built-in validation for required fields and data types
- **Auto-generated Resources**: Smart handling of LocalResource and IntroducedResource placeholders

## 📦 Installation

```bash
npm install nanopub-create
```

Or include directly in your HTML:

```html
<link rel="stylesheet" href="path/to/creator.css">
<script type="module" src="path/to/index.js"></script>
```

## 🎯 Quick Start

### Basic Usage

```javascript
import NanopubCreator from 'nanopub-create';

// Create a creator instance
const creator = new NanopubCreator({
  publishServer: 'https://np.petapico.org/',
  validateOnChange: true,
  showHelp: true
});

// Render form from template URI
const container = document.getElementById('form-container');
await creator.renderFromTemplateUri(
  'https://w3id.org/np/RA...',
  container
);

// Listen for form submission
creator.on('submit', ({ trigContent, formData }) => {
  console.log('Generated nanopublication:', trigContent);
  console.log('Form data:', formData);
});
```

### Complete Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nanopub Creator Demo</title>
  <link rel="stylesheet" href="./creator.css">
</head>
<body>
  <div id="app"></div>

  <script type="module">
    import NanopubCreator from './index.js';
    
    const creator = new NanopubCreator({
      publishServer: 'https://np.petapico.org/',
      validateOnChange: true
    });

    // Handle events
    creator.on('change', (data) => {
      console.log('Form changed:', data);
    });

    creator.on('submit', ({ trigContent }) => {
      console.log('Nanopublication created!');
      downloadFile(trigContent, 'nanopub.trig');
    });

    creator.on('error', ({ type, error }) => {
      console.error(`${type}:`, error);
    });

    // Load template
    await creator.renderFromTemplateUri(
      'https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo',
      document.getElementById('app')
    );

    function downloadFile(content, filename) {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>
```

## 🎨 Styling

The library uses Science Live color palette. You can customize by overriding CSS variables:

```css
:root {
  --primary: #BE2E78;          /* Magenta */
  --primary-hover: #9e1e5e;    /* Darker magenta */
  --secondary: #2b3456;         /* Navy blue */
  --secondary-dark: #131d43;    /* Deep navy */
  --pink-light: #f6d7e8;        /* Light pink background */
  --pink-border: #be2e78;       /* Pink border */
}
```

## 📚 API Reference

### Constructor Options

```javascript
new NanopubCreator(options)
```

**Options:**
- `publishServer` (string): Nanopublication server URL. Default: `'https://np.petapico.org/'`
- `validateOnChange` (boolean): Validate form on every change. Default: `false`
- `showHelp` (boolean): Show help text for fields. Default: `true`

### Methods

#### `renderFromTemplateUri(uri, container)`
Fetch and render a template from a URI.

**Parameters:**
- `uri` (string): Template nanopublication URI
- `container` (HTMLElement): DOM element to render form into

**Returns:** Promise<void>

```javascript
await creator.renderFromTemplateUri(
  'https://w3id.org/np/RA...',
  document.getElementById('form-container')
);
```

#### `renderFromTemplate(template, container)`
Render a form from a parsed template object.

**Parameters:**
- `template` (object): Parsed template object
- `container` (HTMLElement): DOM element to render form into

```javascript
const template = await parser.parse(trigContent);
creator.renderFromTemplate(template, container);
```

#### `on(event, callback)`
Subscribe to events.

**Events:**
- `'change'`: Form data changed - `(data) => {}`
- `'submit'`: Form submitted - `({ trigContent, formData }) => {}`
- `'error'`: Error occurred - `({ type, error }) => {}`

```javascript
creator.on('submit', ({ trigContent, formData }) => {
  console.log('Generated:', trigContent);
});
```

#### `destroy()`
Clean up and remove form.

```javascript
creator.destroy();
```

## 🧩 Template Parser

For advanced usage, you can use the template parser directly:

```javascript
import { TemplateParser } from './core/templateParser.js';

const trigContent = `
  @prefix this: <https://w3id.org/np/RA...> .
  @prefix sub: <https://w3id.org/np/RA...#> .
  @prefix nt: <https://w3id.org/np/o/ntemplate/> .
  
  sub:assertion {
    # Your template definition
  }
`;

const parser = new TemplateParser(trigContent);
const template = await parser.parse();

console.log('Placeholders:', template.placeholders);
console.log('Statements:', template.statements);
console.log('Grouped statements:', template.groupedStatements);
```

## 📋 Supported Placeholder Types

The library supports all standard nanopublication template placeholder types:

| Type | Description | Input Type |
|------|-------------|------------|
| `LiteralPlaceholder` | Short text | Text input |
| `LongLiteralPlaceholder` | Long text | Textarea |
| `RestrictedChoicePlaceholder` | Predefined options | Dropdown |
| `UriPlaceholder` | URI/URL | URL input |
| `ExternalUriPlaceholder` | External URI | URL input |
| `TrustyUriPlaceholder` | Trusty URI | URL input with validation |
| `IntroducedResource` | Auto-generated resource | Read-only |
| `LocalResource` | Auto-generated local resource | Read-only |
| `ValuePlaceholder` | Generic value | Text input |
| `AgentPlaceholder` | Agent (ORCID) | URL input |
| `DatePlaceholder` | Date | Date input |

## 🎯 Template Examples

### Simple Citation Template

```turtle
sub:article a nt:ExternalUriPlaceholder;
  rdfs:label "DOI or URL of the citing article" .

sub:cites a nt:RestrictedChoicePlaceholder;
  rdfs:label "Citation type";
  nt:possibleValue cito:cites, cito:citesAsAuthority .

sub:cited a nt:ExternalUriPlaceholder;
  rdfs:label "DOI or URL of the cited article" .

sub:st01 rdf:object sub:cites;
  rdf:predicate sub:article;
  rdf:subject sub:cited .
```

### With External Options

```turtle
sub:relation a nt:RestrictedChoicePlaceholder;
  rdfs:label "choose relation";
  nt:possibleValuesFrom <https://w3id.org/np/RAJb...> .
```

The parser will automatically fetch and populate the dropdown options.

## 🔧 Advanced Features

### Visual Grouping

Statements with the same subject are automatically grouped together visually with a colored box:

```turtle
# These will be grouped together
sub:st1 rdf:subject sub:annotation;
  rdf:predicate rdf:type;
  rdf:object oa:Annotation .

sub:st2 rdf:subject sub:annotation;
  rdf:predicate oa:hasBody;
  rdf:object sub:body .
```

### Auto-generated Resources

LocalResource and IntroducedResource placeholders are automatically handled and shown as "(auto-generated)":

```turtle
sub:annotation a nt:IntroducedResource, nt:LocalResource;
  rdfs:label "this annotation" .
```

### Hidden Metadata Statements

Statements that only describe URI types are automatically hidden from the form:

```turtle
# This is hidden (metadata only)
sub:SamplePreparation rdf:type prov:Activity .
```

## 🐛 Troubleshooting

### Form not rendering
- Check console for errors
- Verify template URI is accessible
- Ensure CSS file is loaded

### Dropdown showing URIs instead of labels
- Check that labels are defined in template
- Verify `nt:possibleValuesFrom` URL is accessible

### Buttons have wrong colors
- Ensure `creator.css` is loaded after other stylesheets
- Check CSS variable values in browser dev tools

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📞 Support

- Issues: [GitHub Issues](https://github.com/your-repo/nanopub-create/issues)
- Discussions: [GitHub Discussions](https://github.com/your-repo/nanopub-create/discussions)
- Email: support@sciencelive4all.org

## 🙏 Acknowledgments

Built with support from:
- [Nanopublication ecosystem](http://nanopub.org/)
- [Knowledge Pixels](https://knowledgepixels.com/)
- [Science Live](https://sciencelive4all.org/)

---

Made with 💜 by the Science Live team
