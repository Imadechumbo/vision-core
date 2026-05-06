// internal/testfixtures/fixtures.go
// VISION AEGIS CORE ENTERPRISE — V6.1.1-HARDEN-FIX
//
// Helpers de fixture para testes de segurança.
//
// PROPÓSITO: construir strings de teste em RUNTIME por concatenação, evitando
// que o compilador embuta literais completos no binário .test.exe, o que
// aciona o Windows Defender como PUA/malware.
//
// INVARIANTE: o valor final em runtime deve continuar acionando o scanner
// Aegis. Nenhuma regra é enfraquecida — apenas a forma de compilação muda.
package testfixtures

import "strings"

// ─── AWS ──────────────────────────────────────────────────────────────────────

// AWSAccessKey retorna um AWS Access Key ID sintético que aciona AEGIS_SECRET_001.
// Prefixo "AKIA" + sufixo alfanumérico de 16 chars — formato real: AKIA[A-Z0-9]{16}.
func AWSAccessKey() string {
	return "AKIA" + "IOSFODNN7" + "EXAMPLE"
}

// AWSKeyGoSource retorna um fragmento de código-fonte Go com a chave embutida.
func AWSKeyGoSource(varName string) string {
	return "package config\nconst " + varName + " = \"" + AWSAccessKey() + "\"\n"
}

// ─── GitHub ───────────────────────────────────────────────────────────────────

// GitHubPAT retorna um GitHub PAT clássico sintético que aciona AEGIS_SECRET_003.
// Formato real: ghp_[A-Za-z0-9]{36,}.
func GitHubPAT() string {
	return "ghp_" + strings.Repeat("A", 10) + strings.Repeat("B", 10) +
		strings.Repeat("C", 10) + strings.Repeat("D", 6)
}

// GitHubPATYAMLSource retorna um fragmento YAML com token embutido.
func GitHubPATYAMLSource() string {
	return "\ntoken: " + GitHubPAT() + "\n"
}

// ─── Stripe ───────────────────────────────────────────────────────────────────

// StripeSecretKey retorna uma Stripe Secret Key sintética que aciona AEGIS_SECRET_005.
// Formato real: sk_live_[A-Za-z0-9]{24,}.
func StripeSecretKey() string {
	return "sk_" + "live_" + strings.Repeat("A", 12) + strings.Repeat("B", 12)
}

// StripeKeyJSSource retorna um fragmento JS com a key embutida.
func StripeKeyJSSource() string {
	return "const stripe = require('stripe')('" + StripeSecretKey() + "');"
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

// JWTNoneAlgJSSource retorna código JS que usa algorithm:none — aciona AEGIS_API_001.
// Construído por partes para não embutir o padrão literal no binário.
func JWTNoneAlgJSSource() string {
	alg := "alg" + "or" + "ithm" // "algorithm"
	none := "no" + "ne"           // "none"
	return "\nconst token = jwt.sign(payload, secret, { " + alg + ": '" + none + "' });\n"
}

// ─── Auth bypass ──────────────────────────────────────────────────────────────

// AuthBypassGoSource retorna código Go com skipAuth=true — aciona AEGIS_API_005.
func AuthBypassGoSource() string {
	varName := "skip" + "Auth" // "skipAuth"
	return "package handler\nconst " + varName + " = true\n"
}

// AuthBypassJSSource retorna código JS com skipAuth=true.
func AuthBypassJSSource() string {
	varName := "skip" + "Auth" // "skipAuth"
	return "\nconst " + varName + " = true;\n"
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

// CORSWildcardJSSource retorna código JS com CORS wildcard — aciona AEGIS_API_004.
func CORSWildcardJSSource() string {
	origin := "ori" + "gin" // "origin"
	return "\napp.use(cors({ " + origin + ": '*' }));\n"
}

// ─── Sentinel / rollback fixture ─────────────────────────────────────────────

// RollbackSentinelContent retorna conteúdo de arquivo sentinela para teste de rollback.
// Usa Stripe key sintética — string não-crítica para o rollback test, mas
// evita literal completa no binário.
func RollbackSentinelContent() string {
	return "sk_" + "live_" + "FAKE_KEY_FOR_TESTING_ROLLBACK"
}
