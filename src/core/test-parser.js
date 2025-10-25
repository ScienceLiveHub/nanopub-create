/**
 * Test script for TemplateParser
 * Tests parsing of nanopub templates with multi-line statement definitions
 */

import { TemplateParser } from './templateParser.js';
import { readFileSync } from 'fs';

// Test with actual template content
const testTemplate = `@prefix this: <https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo> .
@prefix sub: <https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo#> .
@prefix np: <http://www.nanopub.org/nschema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix nt: <https://w3id.org/np/o/ntemplate/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

sub:assertion {
  <http://purl.org/spar/fabio/ScholarlyWork> rdfs:label "scholarly paper - any kind of scholarly work, such as an article, book, etc." .
  
  rdf:type rdfs:label "is a" .
  
  sub:article a nt:ExternalUriPlaceholder;
    rdfs:label "DOI (https://doi.org/10...) or other URL of the citing article" .
  
  sub:assertion dct:description "Such a nanopublication expresses citation relations of a given article based on the CiTO relation types.";
    a nt:AssertionTemplate;
    rdfs:label "Declare citations with CiTO";
    nt:hasNanopubLabelPattern "Citations for: \${article}";
    nt:hasStatement sub:st01, sub:st02;
    nt:hasTag "Journals" .
  
  sub:cited a nt:ExternalUriPlaceholder;
    rdfs:label "DOI (https://doi.org/10...) or other URL of the cited article" .
  
  sub:cites a nt:RestrictedChoicePlaceholder;
    rdfs:label "select the citation type";
    nt:possibleValuesFrom <https://w3id.org/np/RAZt5kzfoJg2m4dMRdMm2SP6JeUDD_GMzSq9xyRPMgP5k> .
  
  sub:st01 rdf:object <http://purl.org/spar/fabio/ScholarlyWork>;
    rdf:predicate rdf:type;
    rdf:subject sub:article .
  
  sub:st02 rdf:object sub:cited;
    rdf:predicate sub:cites;
    rdf:subject sub:article;
    a nt:RepeatableStatement .
}`;

console.log('🧪 Testing TemplateParser with actual template format\n');
console.log('=' .repeat(60));

async function runTests() {
  try {
    // Test 1: Parse the template
    console.log('\n📝 Test 1: Parsing template...');
    const parser = new TemplateParser(testTemplate);
    const template = await parser.parse();
    
    // Test 2: Verify prefixes
    console.log('\n✓ Test 2: Prefixes');
    console.log(`   Found ${Object.keys(template.prefixes).length} prefixes`);
    console.assert(Object.keys(template.prefixes).length >= 7, 'Should have at least 7 prefixes');
    
    // Test 3: Verify metadata
    console.log('\n✓ Test 3: Metadata');
    console.log(`   Label: ${template.label}`);
    console.log(`   Description: ${template.description?.substring(0, 50)}...`);
    console.assert(template.label === 'Declare citations with CiTO', 'Label should match');
    console.assert(template.description !== null, 'Description should exist');
    
    // Test 4: Verify placeholders
    console.log('\n✓ Test 4: Placeholders');
    console.log(`   Found ${template.placeholders.length} placeholders:`);
    template.placeholders.forEach(p => {
      console.log(`     - ${p.id}: ${p.label} (${p.type})`);
    });
    console.assert(template.placeholders.length === 3, 'Should have 3 placeholders');
    
    // Test 5: Verify statements - THE CRITICAL TEST
    console.log('\n✓ Test 5: Statements (CRITICAL)');
    console.log(`   Found ${template.statements.length} statements:`);
    template.statements.forEach(s => {
      console.log(`     - ${s.id}:`);
      console.log(`       subject: ${s.subject}`);
      console.log(`       predicate: ${s.predicate}`);
      console.log(`       object: ${s.object}`);
      console.log(`       repeatable: ${s.repeatable}`);
    });
    
    if (template.statements.length === 0) {
      console.error('\n❌ FAILED: No statements parsed!');
      console.log('\nDebugging statement parsing...');
      
      // Debug: Check if statement IDs are found
      const ids = parser.findStatementIds();
      console.log('   Statement IDs found:', ids);
      
      // Debug: Try to parse each statement manually
      ids.forEach(id => {
        console.log(`\n   Attempting to parse ${id}...`);
        const stmt = parser.parseStatement(id);
        console.log(`   Result:`, stmt);
      });
      
      process.exit(1);
    }
    
    console.assert(template.statements.length === 2, 'Should have 2 statements');
    console.assert(template.statements[0].subject.includes('article'), 'First statement subject should be article');
    console.assert(template.statements[1].repeatable === true, 'Second statement should be repeatable');
    
    // Test 6: Verify labels
    console.log('\n✓ Test 6: Labels');
    console.log(`   Found ${Object.keys(template.labels).length} labels`);
    Object.entries(template.labels).forEach(([uri, label]) => {
      console.log(`     ${uri}: "${label}"`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('\n📊 Summary:');
    console.log(`   Prefixes: ${Object.keys(template.prefixes).length}`);
    console.log(`   Placeholders: ${template.placeholders.length}`);
    console.log(`   Statements: ${template.statements.length} ✓`);
    console.log(`   Labels: ${Object.keys(template.labels).length}`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
