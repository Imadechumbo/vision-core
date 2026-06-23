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

// Disposition values describe how PASS SECURE treats a detected violation.
// Violations are always detected and reported; only blocking violations fail
// PASS SECURE automatically.
const (
	DispositionBlocking       = "blocking"
	DispositionReportOnly     = "report_only"
	DispositionAcceptedNoise  = "accepted_noise"
	DispositionRequiresReview = "requires_review"
)

const (
	NoiseReasonTestFixture = "test fixture used to validate scanner rule"
	NoiseReasonGenerated   = "generated artifact, not source of truth"
	NoiseReasonSnapshot    = "rollback/snapshot artifact"
	NoiseReasonVendor      = "third-party/vendor code requires dependency policy review"
	NoiseReasonUnknown     = "unknown source context requires manual review"
)

// SourceContext classifica a origem do arquivo onde a violação foi encontrada.
// Determina se a violação é produção real ou artefato de teste/build.
const (
	SourceContextProduction  = "production"
	SourceContextTestFixture = "test_fixture"
	SourceContextGenerated   = "generated"
	SourceContextVendor      = "vendor"
	SourceContextSnapshot    = "snapshot"
	SourceContextUnknown     = "unknown"
)

// Violation representa uma violação de segurança estruturada e acionável.
type Violation struct {
	Gate          string `json:"gate"`                     // secrets_ok | api_ok | dependencies_ok | containers_ok | policies_ok
	Category      string `json:"category"`                 // secrets | api | dependencies | containers | policy
	Severity      string `json:"severity"`                 // CRITICAL | HIGH | MEDIUM | LOW
	File          string `json:"file"`                     // caminho relativo ao root
	Line          int    `json:"line"`                     // linha (0 = arquivo inteiro)
	RuleID        string `json:"rule_id"`                  // AEGIS_SECRET_001, etc.
	Message       string `json:"message"`                  // descrição objetiva
	Remediation   string `json:"remediation"`              // correção sugerida
	SourceContext string `json:"source_context,omitempty"` // production | test_fixture | generated | vendor | snapshot | unknown
	Disposition   string `json:"disposition,omitempty"`    // blocking | report_only | accepted_noise | requires_review
	NoiseReason   string `json:"noise_reason,omitempty"`   // motivo quando classificado como ruído/revisão
	FalsePositive bool   `json:"false_positive,omitempty"` // true quando política considera falso positivo conhecido
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

// HasBlockers retorna true quando há violations com disposition=blocking.
func (s ViolationSummary) HasBlockers() bool {
	return BlockingCount(s.Violations) > 0
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

	// 3b. frontend bundles — arquivos JS/CSS gerados (minificados ou concatenados)
	// Padrões: *-bundle.js, *-bundle.css, *.min.js, *.min.css,
	//          vision-core-*.js dentro de frontend/assets/
	if strings.HasSuffix(base, "-bundle.js") ||
		strings.HasSuffix(base, "-bundle.css") ||
		strings.HasSuffix(base, ".min.js") ||
		strings.HasSuffix(base, ".min.css") ||
		(strings.Contains(norm, "frontend/assets/") &&
			strings.HasPrefix(base, "vision-core-") &&
			strings.HasSuffix(base, ".js")) {
		return SourceContextGenerated
	}

	// 4. snapshots do vision-core
	if strings.Contains(norm, ".vision-snapshots") {
		return SourceContextSnapshot
	}

	// 5. diretório de test isolado do vision-core
	if strings.Contains(norm, ".vision-test") {
		return SourceContextGenerated
	}

	// 6. §132: fixture dirs and archive dirs are test fixtures (not production code)
	for _, seg := range strings.Split(norm, "/") {
		if seg == "_fixture_stress" || seg == "_archive" || seg == "tools/_archive" {
			return SourceContextTestFixture
		}
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

// ClassifyDisposition aplica a política V6.1.2 de decisão sem ocultar a
// violação. A severidade original permanece intacta; somente os campos de
// disposição/ruído são anotados.
func ClassifyDisposition(v Violation) Violation {
	if v.SourceContext == "" {
		v.SourceContext = ClassifySourceContext(v.File)
	}

	// Reset classification-owned fields so reclassification is deterministic.
	v.Disposition = ""
	v.NoiseReason = ""
	v.FalsePositive = false

	switch v.SourceContext {
	case SourceContextTestFixture:
		v.Disposition = DispositionReportOnly
		v.FalsePositive = true
		v.NoiseReason = NoiseReasonTestFixture
	case SourceContextGenerated:
		v.Disposition = DispositionReportOnly
		v.FalsePositive = true
		v.NoiseReason = NoiseReasonGenerated
	case SourceContextSnapshot:
		v.Disposition = DispositionReportOnly
		v.FalsePositive = true
		v.NoiseReason = NoiseReasonSnapshot
	case SourceContextVendor:
		v.Disposition = DispositionRequiresReview
		v.NoiseReason = NoiseReasonVendor
	case SourceContextUnknown:
		v.Disposition = DispositionRequiresReview
		v.NoiseReason = NoiseReasonUnknown
	case SourceContextProduction:
		v.Disposition = productionDisposition(v)
	default:
		v.SourceContext = SourceContextUnknown
		v.Disposition = DispositionRequiresReview
		v.NoiseReason = NoiseReasonUnknown
	}

	return v
}

func productionDisposition(v Violation) string {
	switch v.Severity {
	case SeverityCritical, SeverityHigh:
		return DispositionBlocking
	case SeverityMedium:
		if isProductionMediumBlockingRule(v.RuleID) {
			return DispositionBlocking
		}
		return DispositionReportOnly
	case SeverityLow:
		return DispositionReportOnly
	default:
		return DispositionRequiresReview
	}
}

func isProductionMediumBlockingRule(ruleID string) bool {
	switch ruleID {
	case "AEGIS_API_004", "AEGIS_API_006", "AEGIS_API_007", "AEGIS_API_008":
		return true
	}
	return strings.HasPrefix(ruleID, "AEGIS_SECRET_") || strings.HasPrefix(ruleID, "AEGIS_POLICY_")
}

// AnnotateDisposition preenche source_context e disposition em cada Violation.
func AnnotateDisposition(violations []Violation) []Violation {
	out := make([]Violation, len(violations))
	for i, v := range violations {
		out[i] = ClassifyDisposition(v)
	}
	return out
}

func BlockingCount(violations []Violation) int {
	return countByDisposition(violations, DispositionBlocking)
}

func ReportOnlyCount(violations []Violation) int {
	return countByDisposition(violations, DispositionReportOnly)
}

func FalsePositiveCount(violations []Violation) int {
	count := 0
	for _, v := range violations {
		if ClassifyDisposition(v).FalsePositive {
			count++
		}
	}
	return count
}

func RequiresReviewCount(violations []Violation) int {
	return countByDisposition(violations, DispositionRequiresReview)
}

func NoiseCount(violations []Violation) int {
	count := 0
	for _, v := range violations {
		classified := ClassifyDisposition(v)
		if classified.FalsePositive || classified.Disposition == DispositionAcceptedNoise {
			count++
		}
	}
	return count
}

func countByDisposition(violations []Violation, disposition string) int {
	count := 0
	for _, v := range violations {
		if ClassifyDisposition(v).Disposition == disposition {
			count++
		}
	}
	return count
}
