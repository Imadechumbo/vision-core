// internal/planning/planning.go
// VISION AEGIS CORE ENTERPRISE — V6.5 MEMORY-GUIDED PATCH PLANNING
//
// Memory-guided patch planning is advisory and supervised.
// It cannot bypass validation, rollback, PASS SECURE or PASS GOLD.
//
// REGRAS:
//   - ApplyMode nunca é "automatic" nesta versão.
//   - RequiresValidation e RequiresRollback são sempre true.
//   - test_fixture / report_only / false_positive nunca entram em TargetFiles.
//   - Todos os TargetFiles passam por validação de path seguro.
//   - Memória pode orientar o plano; nunca pode liberar segurança.
package planning

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/visioncore/go-core/internal/memory"
)

// ─── Sentinel fallback ───────────────────────────────────────────────────────

const safeSentinel = ".vision-test/mission.sentinel"

// SafeSentinel is the exported safe fallback target path.
const SafeSentinel = safeSentinel

// ─── Types ───────────────────────────────────────────────────────────────────

// PlannedOperation descreve uma operação de remediation planejada.
// Evita import cycle com o pacote patcher — mapeado em mission.go.
type PlannedOperation struct {
	File          string `json:"file"`
	Description   string `json:"description"`
	OperationType string `json:"operation_type"` // noop | redaction | exact_replace | policy_fix | append_guarded
	Before        string `json:"before,omitempty"`
	After         string `json:"after,omitempty"`
	Anchor        string `json:"anchor,omitempty"`
}

// PatchPlan descreve o plano de patch supervisionado gerado pelo planning engine.
// Este plano é advisory: o patcher ainda executa, valida e pode fazer rollback
// independente do conteúdo do plano.
type PatchPlan struct {
	ID                 string   `json:"id"`
	MissionID          string   `json:"mission_id"`
	IssueType          string   `json:"issue_type"`
	RootCause          string   `json:"root_cause"`
	Strategy           string   `json:"strategy"`
	TargetFiles        []string `json:"target_files"`
	CandidateRuleIDs   []string `json:"candidate_rule_ids"`
	MemoryGuided       bool     `json:"memory_guided"`
	MemoryEventID      string   `json:"memory_event_id,omitempty"`
	MemoryConfidence   float64  `json:"memory_confidence"`
	MemoryPatchSummary string   `json:"memory_patch_summary,omitempty"`
	RiskLevel          string   `json:"risk_level"` // low | medium | high
	RequiresValidation bool     `json:"requires_validation"`
	RequiresRollback   bool     `json:"requires_rollback"`
	ApplyMode          string             `json:"apply_mode"` // supervised (never automatic in V6.5)
	Operations         []PlannedOperation `json:"operations,omitempty"`
	Notes              []string           `json:"notes,omitempty"`
}

// PlanInput é o contexto passado pelo mission.Run para construir o plano.
type PlanInput struct {
	MissionID         string
	IssueType         string
	RootCause         string
	SuggestedStrategy string
	Severity          string
	BlockingRuleIDs   []string
	BlockingFiles     []string
	Root              string // project root, used for path validation
	MemorySuggestion  memory.RemediationSuggestion
	// V6.7 — explicit operations to attach to plan (must have before/after for replace types)
	Operations        []PlannedOperation
}

// ─── BuildPatchPlan ───────────────────────────────────────────────────────────

// BuildPatchPlan constrói um PatchPlan supervisionado a partir do contexto da
// missão e da sugestão passiva de memória.
//
// Regras de memória:
//   - confidence >= 0.60 → MemoryGuided=true, usar strategy da memória
//   - confidence <  0.60 → MemoryGuided=false, usar Hermes strategy
//
// Regras invariantes:
//   - RequiresValidation = true, sempre
//   - RequiresRollback   = true, sempre
//   - ApplyMode          = "supervised", sempre (nunca "automatic" em V6.5)
func BuildPatchPlan(input PlanInput) PatchPlan {
	planID := "plan_" + shortID()

	// ── Estratégia ─────────────────────────────────────────────────
	strategy := input.SuggestedStrategy
	memoryGuided := false
	memoryEventID := ""
	memoryConfidence := 0.0
	memoryPatchSummary := ""

	if input.MemorySuggestion.Available && input.MemorySuggestion.Confidence >= 0.60 {
		memoryGuided = true
		memoryEventID = input.MemorySuggestion.BestEventID
		memoryConfidence = input.MemorySuggestion.Confidence
		memoryPatchSummary = input.MemorySuggestion.PatchSummary
		// combinar: memória como primário, Hermes como fallback contextual
		if input.MemorySuggestion.SuggestedStrategy != "" {
			strategy = input.MemorySuggestion.SuggestedStrategy
		}
	}
	if strategy == "" {
		strategy = "supervised_patch"
	}

	// ── Risk level ─────────────────────────────────────────────────
	riskLevel := severityToRisk(input.Severity)

	// ── Target files ───────────────────────────────────────────────
	targetFiles, notes := resolveTargetFiles(input.BlockingFiles, input.Root)

	// ── Candidate rule IDs ─────────────────────────────────────────
	candidateRuleIDs := deduplicateStrings(input.BlockingRuleIDs)
	if candidateRuleIDs == nil {
		candidateRuleIDs = []string{}
	}

	// ── Governance note ────────────────────────────────────────────
	notes = append(notes,
		"Memory-guided patch planning is advisory and supervised.",
		"Validation, rollback, PASS SECURE and PASS GOLD remain sovereign.",
	)
	if memoryGuided {
		notes = append(notes,
			fmt.Sprintf("Memory guidance from event %s (confidence=%.2f).", memoryEventID, memoryConfidence),
		)
	}

	return PatchPlan{
		ID:                 planID,
		MissionID:          input.MissionID,
		IssueType:          input.IssueType,
		RootCause:          input.RootCause,
		Strategy:           strategy,
		TargetFiles:        targetFiles,
		CandidateRuleIDs:   candidateRuleIDs,
		MemoryGuided:       memoryGuided,
		MemoryEventID:      memoryEventID,
		MemoryConfidence:   memoryConfidence,
		MemoryPatchSummary: memoryPatchSummary,
		RiskLevel:          riskLevel,
		RequiresValidation: true,
		RequiresRollback:   true,
		ApplyMode:          "supervised",
		Operations:         input.Operations,
		Notes:              notes,
	}
}

// ─── Path validation ──────────────────────────────────────────────────────────

// resolveTargetFiles valida cada arquivo candidato e descarta os inseguros.
// Retorna a lista de arquivos válidos + notas de descarte.
// Se nenhum arquivo passar, retorna o sentinel seguro.
func resolveTargetFiles(candidates []string, root string) ([]string, []string) {
	var valid []string
	var notes []string

	for _, f := range candidates {
		if f == "" {
			continue
		}
		if !isSafeTarget(f) {
			notes = append(notes, fmt.Sprintf("target discarded (%s): failed safety validation", f))
			continue
		}
		valid = append(valid, f)
	}

	if len(valid) == 0 {
		notes = append(notes, "no valid production targets — using safe sentinel")
		return []string{safeSentinel}, notes
	}
	return valid, notes
}

// isSafeTarget validates that a target path is safe to use as a patch target.
// Rejects: empty, dot, absolute paths, path traversal, test fixtures,
// and any path containing a blocked directory segment.
func isSafeTarget(path string) bool {
	raw := strings.TrimSpace(path)
	if raw == "" {
		return false
	}

	if filepath.IsAbs(raw) {
		return false
	}

	cleaned := filepath.ToSlash(filepath.Clean(raw))

	if cleaned == "." || cleaned == "" {
		return false
	}

	if strings.HasPrefix(cleaned, "/") {
		return false
	}

	if strings.Contains(cleaned, "..") {
		return false
	}

	if strings.HasSuffix(cleaned, "_test.go") {
		return false
	}

	blockedParts := map[string]bool{
		".git":              true,
		".vision-memory":    true,
		".vision-snapshots": true,
		"node_modules":      true,
		"vendor":            true,
		"dist":              true,
		"build":             true,
		".next":             true,
	}

	for _, part := range strings.Split(cleaned, "/") {
		if blockedParts[part] {
			return false
		}
	}

	return true
}

// IsSafeTarget is the exported version of isSafeTarget.
// Used by patcher and other packages that need path safety validation
// without importing fileops directly.
func IsSafeTarget(path string) bool {
	return isSafeTarget(path)
}

// ─── Risk / severity ─────────────────────────────────────────────────────────

func severityToRisk(severity string) string {
	switch strings.ToUpper(severity) {
	case "CRITICAL", "HIGH":
		return "high"
	case "MEDIUM":
		return "medium"
	case "LOW":
		return "low"
	default:
		return "medium" // default conservador
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func deduplicateStrings(ss []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, s := range ss {
		if s != "" && !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	return out
}

// shortID gera um identificador curto determinístico-ish para planos.
// Usa timestamp de nanosegundos em base36 truncado.
func shortID() string {
	// importar time via init — usado apenas para ID
	return fmt.Sprintf("%08x", planCounter())
}

var planCounterN uint32

func planCounter() uint32 {
	planCounterN++
	return planCounterN
}
