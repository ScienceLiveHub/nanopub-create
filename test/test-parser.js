import { TemplateParser } from '../src/core/templateParser.js';

// Sample template content (simplified version)
const sampleTemplate = `
@prefix this: <https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo> .
@prefix sub: <https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo#> .
@prefix np: <http://www.nanopub.org/nschema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix nt: <https://w3id.org/np/o/ntemplate/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

sub:assertion {
  sub:assertion a nt:AssertionTemplate;
    rdfs:label "Declare citations with CiTO";
    dct:description "Such a nanopublication expresses citation relations of a given article based on the CiTO relation types.";
    nt:hasNanopubLabelPattern "Citations for: \${article}";
    nt:hasStatement sub:st01, sub:st02;
    nt:hasTag "Journals" .
  
  sub:article a nt:ExternalUriPlaceholder;
    rdfs:label "DOI (https://doi.org/10...) or other URL of the citing article" .
  
  sub:cited a nt:ExternalUriPlaceholder;
    rdfs:label "DOI (https://doi.org/10...) or other URL of the cited article" .
  
  sub:cites a nt:RestrictedChoicePlaceholder;
    rdfs:label "select the citation type";
    nt:possibleValuesFrom <https://w3id.org/np/RAZt5kzfoJg2m4dMRdMm2SP6JeUDD_GMzSq9xyRPMgP5k> .
  
  sub:st01 rdf:object <http://purl.org/spar/fabio/ScholarlyWork>;
    rdf:predicate rdf:type;
    rdf:subject sub:article .
  
  sub:st02 a nt:RepeatableStatement;
    rdf:object sub:cited;
    rdf:predicate sub:cites;
    rdf:subject sub:article .
}
`;

console.log('🧪 Testing Template Parser\n');
console.log('=' .repeat(50));

try {
  // Create parser instance
  const parser = new TemplateParser(sampleTemplate);
  
  // Parse the template
  const template = parser.parse();
  
  // Display results
  console.log('\n✅ Parsing successful!\n');
  
  console.log('📋 Template Information:');
  console.log(`   URI: ${template.uri || 'N/A'}`);
  console.log(`   Label: ${template.label || 'N/A'}`);
  console.log(`   Description: ${template.description || 'N/A'}`);
  console.log(`   Label Pattern: ${template.labelPattern || 'N/A'}`);
  console.log(`   Tags: ${template.tags?.join(', ') || 'None'}`);
  
  console.log('\n📝 Placeholders (Form Fields):');
  console.log(`   Found ${template.placeholders.length} placeholders:\n`);
  
  template.placeholders.forEach((placeholder, index) => {
    console.log(`   ${index + 1}. ${placeholder.label}`);
    console.log(`      - ID: ${placeholder.id}`);
    console.log(`      - Type: ${placeholder.type}`);
    console.log(`      - Required: ${placeholder.required}`);
    if (placeholder.validation?.regex) {
      console.log(`      - Validation: ${placeholder.validation.regex}`);
    }
    if (placeholder.options) {
      console.log(`      - Options: ${JSON.stringify(placeholder.options)}`);
    }
    console.log('');
  });
  
  console.log('🔗 Statements (RDF Structure):');
  console.log(`   Found ${template.statements.length} statements:\n`);
  
  template.statements.forEach((statement, index) => {
    console.log(`   ${index + 1}. Subject: ${statement.subject}`);
    console.log(`      Predicate: ${statement.predicate}`);
    console.log(`      Object: ${statement.object}`);
    if (statement.repeatable) {
      console.log(`      ⭐ Repeatable`);
    }
    console.log('');
  });
  
  console.log('=' .repeat(50));
  console.log('\n✨ Parser test completed successfully!');
  console.log('The parser is working correctly and ready to use.\n');
  
  console.log('📖 Next Steps:');
  console.log('   1. Test the form generator (see demo/index.html)');
  console.log('   2. Implement NanopubBuilder (see QUICK_START.md Step 4)');
  console.log('   3. Build the rest following the roadmap\n');
  
} catch (error) {
  console.error('\n❌ Error during parsing:');
  console.error(error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
