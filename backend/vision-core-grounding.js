'use strict';

/* Grounding real contra alucinação sobre a identidade do próprio Vision Core.
   Achado real (2026-07): perguntas sobre a arquitetura/identidade do produto
   (SF vs Salesforce, qual modelo responde, onde roda) não tinham nenhum fato
   fixo injetado — o modelo respondia livremente e inventava, e o Archivist
   às vezes salvava essa resposta inventada como "contexto de missão anterior",
   reforçando a alucinação em conversas futuras (loop de autorreforço).
   Este módulo é a fonte única desses fatos — nenhum endpoint deve descrevê-los
   de memória. */

const VISION_CORE_FACTS_BLOCK = [
  `══════════════════════════════════════════════════════`,
  `VISION_CORE_FACTS_BLOCK — FATOS REAIS SOBRE O PRÓPRIO VISION CORE`,
  `══════════════════════════════════════════════════════`,
  ``,
  `Estes são os únicos fatos confiáveis sobre a identidade e infraestrutura do`,
  `Vision Core. Use-os para qualquer pergunta sobre o próprio produto — nunca`,
  `invente nomes de arquivo, endpoints, modelos ou infraestrutura fora daqui.`,
  ``,
  `IDENTIDADE DO PRODUTO:`,
  `- Vision Core é uma plataforma autônoma de correção/geração de software`,
  `  ("Vision AI Command"), com dois sistemas: Chat/Mission Control e Software Factory (SF).`,
  `- "SF" aqui SEMPRE significa Software Factory, o módulo interno de geração de projetos.`,
  `  SF NUNCA é Salesforce — Vision Core não integra, não deriva de, e não tem`,
  `  nenhuma relação com o produto Salesforce.`,
  ``,
  `MODELO/LLM:`,
  `- Vision Core chama múltiplos providers de LLM de terceiros via callLLM(), com`,
  `  fallback em cadeia: OpenRouter → Anthropic → Groq → DeepSeek → Gemini → Cerebras.`,
  `- Você (o modelo respondendo agora) é um desses providers, chamado pelo backend`,
  `  do Vision Core — você não É o Vision Core, você responde em nome dele.`,
  `- Não existe modelo próprio treinado do zero pelo Vision Core.`,
  ``,
  `INFRAESTRUTURA REAL:`,
  `- Frontend: Cloudflare Pages (visioncoreai.pages.dev).`,
  `- Backend: Node.js em AWS Elastic Beanstalk (vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com).`,
  `- Gateway: Cloudflare Worker (visioncore-api-gateway.weiganlight.workers.dev), proxy para o backend EB.`,
  `- Repositório: GitHub (github.com/Imadechumbo/vision-core).`,
  ``,
  `Se a pergunta pedir um fato sobre o Vision Core que não está neste bloco,`,
  `responda literalmente: "não tenho essa informação confirmada" — nunca invente.`
].join('\n');

/* Perguntas sobre a identidade/arquitetura do próprio Vision Core — não sobre
   o código do usuário. Padrões focados, testáveis individualmente, em vez de
   uma única regex monolítica. */
const PRODUCT_IDENTITY_PATTERNS = [
  /\bsalesforce\b/i,
  /qu[ae]l?\s+(modelo|llm|ia)\s+.{0,15}\b(voc[eê]|usa|é|roda)\b/i,
  /voc[eê]\s+(é|e)\s+(o\s+|a\s+)?(claude|gpt|chatgpt|gemini|llama|anthropic|openai)\b/i,
  /(infraestrutura|arquitetura|onde\s+(o\s+|a\s+)?vision\s*core\s+(roda|est[aá]\s+hospedad))/i,
  /vision\s*core\s+.{0,30}(infraestrutura|arquitetura|hospedad|roda\s+(em|onde)|deploy)/i
];

function isProductIdentityQuestion(message) {
  const text = String(message || '');
  return PRODUCT_IDENTITY_PATTERNS.some((re) => re.test(text));
}

const HEDGE_PHRASE = 'não tenho essa informação confirmada';

/* Nunca arquivar Q&A de identidade do produto (mesmo quando a resposta está
   certa) e nunca arquivar uma resposta que o próprio modelo marcou como
   incerta — é exatamente esse par que alimentava o loop de autorreforço. */
function isUnsafeToArchive(question, answer) {
  if (String(answer || '').toLowerCase().includes(HEDGE_PHRASE)) return true;
  return isProductIdentityQuestion(question);
}

module.exports = { VISION_CORE_FACTS_BLOCK, isProductIdentityQuestion, isUnsafeToArchive };
