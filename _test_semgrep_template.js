// Teste: \${ em template literal — previne interpolação?
const $VAR = null; // simula variável null se JS tentasse interpolar

try {
  const content = `rules:\n  - id: no-sql-injection\n    pattern: $DB.query(\`...\${$VAR}...\`)\n`;
  console.log('OK — length:', content.length);
  console.log('Contains literal ${$VAR}?', content.includes('${$VAR}'));
  console.log('VAR got interpolated?', content.includes('null') || content.includes('undefined'));
  console.log('snippet:', content.slice(content.indexOf('$DB'), content.indexOf('$DB')+40));
} catch(e) {
  console.error('RUNTIME ERROR:', e.message);
}

// Teste 2: sem escape
try {
  const x = null;
  // eslint-disable-next-line no-template-curly-in-string
  const t2 = `test ${x.provider} end`;
  console.log('t2:', t2);
} catch(e) {
  console.error('NULL.PROVIDER ERROR:', e.message);
}
