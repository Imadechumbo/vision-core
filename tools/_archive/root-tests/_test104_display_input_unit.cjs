// Testa a logica exata adicionada no backend: const _tlInput98e = (body.display_input || message);
let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!cond) failures++;
}

function computeInput(body, message) {
  return (body.display_input || message);
}

// 1) com display_input presente, usa ele (texto limpo)
check(
  'usa display_input quando presente',
  computeInput({ display_input: 'teste 2' }, '[contexto anterior...] teste 2') === 'teste 2'
);

// 2) sem display_input, cai pro message (compat com chamadas antigas/outros fluxos)
check(
  'cai pro message quando display_input ausente',
  computeInput({}, 'mensagem direta sem prefixo') === 'mensagem direta sem prefixo'
);

// 3) display_input vazio/null não quebra, cai pro message
check(
  'display_input null cai pro message',
  computeInput({ display_input: null }, 'mensagem normal') === 'mensagem normal'
);
check(
  'display_input string vazia cai pro message (falsy)',
  computeInput({ display_input: '' }, 'mensagem normal') === 'mensagem normal'
);

console.log('');
console.log(failures === 0 ? '=== TODOS OS TESTES PASSARAM ===' : `=== ${failures} TESTE(S) FALHARAM ===`);
process.exit(failures > 0 ? 1 : 0);
