// internal/security/types/types.go
// VISION AEGIS CORE ENTERPRISE — V6.1.1-HARDEN
// Tipos compartilhados entre todos os guards de segurança.
package types

import (
	"path/filepath"
	"strings"
)

// Severity levels for violations.
const (
	SeverityCritical = "CRITICAL"
	SeverityHigh     = "HIGH"
	SeverityMedium   = "MEDIUM"
	SeverityLow      = "LOW"
)

// SourceContext classifica a origem do arquivo onde a violação foi encontrada.
// Determina se a violação é produção real ou artefato de teste/build.
const (
	SourceContextProduction = "production"
	SourceContextTestFixture = "test_fixture"
	SourceContextGenerated  = "generated"
	SourceContextVendor     = "vendor"
	SourceContextSnapshot   = "snapshot"
	SourceContextUnknown    = "unknown"
)

// Violation representa uma violação de segurança estruturada e acionável.
type Violation struct {
	Gate          string `json:"gate"`          // secrets_ok | api_ok | dependencies_ok | containers_ok | policies_ok
	Category      string `json:"category"`      // secrets | api | dependencies | containers | policy
	Severity      string `json:"severity"`      // CRITICAL | HIGH | MEDIUM | LOW
	File          string `json:"file"`          // caminho relativo ao root
	Line          int    `json:"line"`          // linha (0 = arquivo inteiro)
	RuleID        string `json:"rule_id"`       // AEGIS_SECRET_001, etc.
	Message       string `json:"message"`       // descrição objetiva
	Remediation   string `json:"remediation"`   // correção sugerida
	SourceContext string `json:"source_context,omitempty"` // production | test_fixture | generated | vendor | snapshot | unknown
}

// ViolationSummary agrega contagens por severidade.
type ViolationSummary struct {
	Violations    []Violation `json:"violations"`
	TotalCount    int         `json:"total_count"`
	CriticalCount int         `json:"critical_count"`
	HighCount     int         `json:"high_count"`
	MediumCount   int         `json:"medium_count"`
	LowCount      int         `json:"low_count"`
}

// Build constrói um ViolationSummary a partir de uma lista de violations.
func Build(violations []Violation) ViolationSummary {
	s := ViolationSummary{Violations: violations, TotalCount: len(violations)}
	for _, v := range violations {
		switch v.Severity {
		case SeverityCritical:
			s.CriticalCount++
		case SeverityHigh:
			s.HighCount++
		case SeverityMedium:
			s.MediumCount++
		case SeverityLow:
			s.LowCount++
		}
	}
	return s
}

// HasBlockers retorna true se há CRITICAL ou HIGH — bloqueia PASS SECURE.
// Nota V6.1.1-HARDEN: HasBlockers considera TODAS as violations, incluindo
// test_fixture. Filtragem decisória está agendada para V6.1.2.
func (s ViolationSummary) HasBlockers() bool {
	return s.CriticalCount > 0 || s.HighCount > 0
}

// ClassifySourceContext determina o SourceContext de um arquivo
// com base em seu caminho relativo ao root do projeto.
//
// Regras (em ordem de precedência):
//  1. *_test.go               → test_fixture
//  2. vendor/ node_modules/   → vendor
//  3. dist/ build/ .next/     → generated
//  4. .vision-snapshots/      → snapshot
//  5. .vision-test/           → generated
//  6. qualquer outro          → production
func ClassifySourceContext(relPath string) string {
	if relPath == "" {
		return SourceContextUnknown
	}

	// normalizar separadores
	norm := filepath.ToSlash(relPath)
	base := filepath.Base(norm)

	// 1. arquivos de teste Go
	if strings.HasSuffix(base, "_test.go") {
		return SourceContextTestFixture
	}

	// 2. vendor / node_modules — qualquer segmento do path
	for _, seg := range strings.Split(norm, "/") {
		switch seg {
		case "vendor", "node_modules":
			return SourceContextVendor
		}
	}

	// 3. artefatos de build / gerados
	for _, seg := range strings.Split(norm, "/") {
		switch seg {
		case "dist", "build", ".next":
			return SourceContextGenerated
		}
	}

	// 4. snapshots do vision-core
	if strings.Contains(norm, ".vision-snapshots") {
		return SourceContextSnapshot
	}

	// 5. diretório de test isolado do vision-core
	if strings.Contains(norm, ".vision-test") {
		return SourceContextGenerated
	}

	return SourceContextProduction
}

// Annotate preenche SourceContext em cada Violation da lista.
// Não modifica violações que já tenham SourceContext definido.
func Annotate(violations []Violation) []Violation {
	out := make([]Violation, len(violations))
	for i, v := range violations {
		if v.SourceContext == "" {
			v.SourceContext = ClassifySourceContext(v.File)
		}
		out[i] = v
	}
	return out
}
