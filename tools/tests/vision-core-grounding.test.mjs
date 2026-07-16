import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { VISION_CORE_FACTS_BLOCK, isProductIdentityQuestion, isUnsafeToArchive } =
  require('../../backend/vision-core-grounding.js');

/* isProductIdentityQuestion — positivos */
assert.equal(isProductIdentityQuestion('SF é a mesma coisa que Salesforce?'), true, 'SF vs Salesforce deve disparar');
assert.equal(isProductIdentityQuestion('Qual modelo você usa por trás do chat?'), true, 'pergunta de modelo deve disparar');
assert.equal(isProductIdentityQuestion('Você é o Claude ou o GPT?'), true, 'pergunta de identidade de modelo deve disparar');
assert.equal(isProductIdentityQuestion('Qual a infraestrutura real do Vision Core?'), true, 'pergunta de infraestrutura deve disparar');
assert.equal(isProductIdentityQuestion('Onde o Vision Core roda hoje?'), true, 'pergunta de onde roda deve disparar');

/* isProductIdentityQuestion — negativos */
assert.equal(isProductIdentityQuestion('Corrija esse bug no auth.js, o token expira com < em vez de <='), false, 'bug de código do usuário não deve disparar');
assert.equal(isProductIdentityQuestion('Como funciona o useEffect do React?'), false, 'pergunta técnica genérica não deve disparar');
assert.equal(isProductIdentityQuestion(''), false, 'mensagem vazia não deve disparar');

/* isUnsafeToArchive — hedge na resposta bloqueia arquivamento, mesmo com pergunta neutra */
assert.equal(
  isUnsafeToArchive('Como faço deploy desse projeto?', 'não tenho essa informação confirmada sobre isso.'),
  true,
  'resposta com hedge deve ser insegura para arquivar'
);

/* isUnsafeToArchive — pergunta de identidade do produto é insegura mesmo com resposta correta */
assert.equal(
  isUnsafeToArchive('SF é a mesma coisa que Salesforce?', 'Não. SF é Software Factory, módulo interno do Vision Core.'),
  true,
  'pergunta de identidade do produto nunca deve ser arquivada, mesmo respondida corretamente'
);

/* isUnsafeToArchive — missão comum de código, resposta normal: seguro arquivar */
assert.equal(
  isUnsafeToArchive('Corrija o bug de paginação em list.js', 'Causa raiz: offset calculado com off-by-one em list.js:42.'),
  false,
  'missão de código comum sem hedge deve ser segura para arquivar'
);

/* VISION_CORE_FACTS_BLOCK — sanidade do conteúdo fixo */
assert.match(VISION_CORE_FACTS_BLOCK, /SF NUNCA é Salesforce/, 'bloco deve conter a trava SF vs Salesforce');
assert.match(VISION_CORE_FACTS_BLOCK, /Cloudflare Pages/, 'bloco deve conter a infra real do frontend');
assert.match(VISION_CORE_FACTS_BLOCK, /Elastic Beanstalk/, 'bloco deve conter a infra real do backend');
assert.match(VISION_CORE_FACTS_BLOCK, /não tenho essa informação confirmada/, 'bloco deve conter a frase-hedge literal usada pelo filtro do Archivist');

console.log('vision-core-grounding: PASS (16/16)');
