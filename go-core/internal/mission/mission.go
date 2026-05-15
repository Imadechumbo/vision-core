// internal/mission/mission.go
// Vision Core Go Safe Core — Mission Orchestrator V5.2
// Pipeline: scanner → fileops → snapshot → patcher (no-snapshot) → validator → rollback → passgold
//
// Fixes V5.2.1:
//  1. self-test usa .vision-test/ — nunca toca go.mod ou arquivos reais do projeto
//  2. snapshot único: criado aqui no step 3, patcher roda com DryRun=true para não duplicar
//  3. snapshotID retornado é snap.ID real de fileops.CreateSnapshot
//  4. rollback.Restore recebe root para resolver path absoluto corretamente
package mission

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/visioncore/go-core/internal/fileops"
	githubpr "github.com/visioncore/go-core/internal/github"
	"github.com/visioncore/go-core/internal/hermes"
	"github.com/visioncore/go-core/internal/memory"
	"github.com/visioncore/go-core/internal/passgold"
	"github.com/visioncore/go-core/internal/passsecure"
	"github.com/visioncore/go-core/internal/patcher"
	"github.com/visioncore/go-core/internal/planning"
	"github.com/visioncore/go-core/internal/rollback"
	"github.com/visioncore/go-core/internal/scanner"
	"github.com/visioncore/go-core/internal/security/types"
	"github.com/visioncore/go-core/internal/validator"
)

// EvidenceReceipt is the traceable proof of a real Go Core mission execution.
// Only Go Core generates this — backend must never fabricate or substitute it.
type EvidenceReceipt struct {
	ID          string   `json:"id"`
	MissionID   string   `json:"mission_id"`
	SnapshotID  *string  `json:"snapshot_id"`
	GatesHash   string   `json:"gates_hash"`
	IssuedAt    string   `json:"issued_at"`
	Result      string   `json:"result"` // "PASS" | "FAIL"
	PassGold    bool     `json:"pass_gold"`
	FailedGates []string `json:"failed_gates"`
	Source      string   `json:"source"` // always "go-core"
}

type Input struct {
	Root      string `json:"root"`
	InputText string `json:"input"`
	DryRun    bool   `json:"dry_run"`
}

type StepResult struct {
	Step    string `json:"step"`
	OK      bool   `json:"ok"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

type Output struct {
	OK                bool           `json:"ok"`
	Version           string         `json:"version"`
	MissionID         string         `json:"mission_id"`
	Engine            string         `json:"engine"`
	Status            string         `json:"status"`
	PassGold          bool           `json:"pass_gold"`
	PassSecure        bool           `json:"pass_secure"`
	SecurityScore     int            `json:"security_score"`
	DeployAllowed     bool           `json:"deploy_allowed"`
	PromotionAllowed  bool           `json:"promotion_allowed"`
	RollbackReady     bool           `json:"rollback_ready"`
	Summary           string         `json:"summary"`
	Steps             []string       `json:"steps"`
	StepResults       []StepResult   `json:"step_results"`
	Gates             passgold.Gates `json:"gates"`
	FailedGates       []string       `json:"failed_gates,omitempty"`
	SnapshotID        string         `json:"snapshot_id,omitempty"`
	RollbackApplied   bool           `json:"rollback_applied"`
	TransactionMode   bool           `json:"transaction_mode"`
	TransactionID     string         `json:"transaction_id,omitempty"`
	PatchedFiles      int            `json:"patched_files"`
	TotalFiles        int            `json:"total_files"`
	DurationMs        int64          `json:"duration_ms"`
	Error             string         `json:"error,omitempty"`
	HermesEnabled     bool           `json:"hermes_enabled"`
	IssueType         string         `json:"issue_type,omitempty"`
	ProbableRootCause string         `json:"probable_root_cause,omitempty"`
	Confidence        float64        `json:"confidence"`
	Severity          string         `json:"severity,omitempty"`
	SuggestedStrategy string         `json:"suggested_strategy,omitempty"`

	// V6.1.1 — Security Remediation Report; V6.1.2 adds disposition/noise splits.
	SecurityFailedGates          []string            `json:"security_failed_gates,omitempty"`
	SecurityViolations           []securityViolation `json:"security_violations,omitempty"`
	SecurityTotalViolations      int                 `json:"security_total_violations"`
	SecurityCriticalCount        int                 `json:"security_critical_count"`
	SecurityHighCount            int                 `json:"security_high_count"`
	SecurityMediumCount          int                 `json:"security_medium_count"`
	SecurityLowCount             int                 `json:"security_low_count"`
	SecurityBlockingTotal        int                 `json:"security_blocking_total"`
	SecurityBlockingViolations   []securityViolation `json:"security_blocking_violations,omitempty"`
	SecurityReportOnlyViolations []securityViolation `json:"security_report_only_violations,omitempty"`
	SecurityFalsePositiveCount   int                 `json:"security_false_positive_count"`
	SecurityRequiresReviewCount  int                 `json:"security_requires_review_count"`
	SecurityNoiseCount           int                 `json:"security_noise_count"`

	// V6.2 — passive remediation memory. These fields never influence security gates.
	MemoryRecorded bool   `json:"memory_recorded"`
	MemoryEventID  string `json:"memory_event_id,omitempty"`
	MemoryWarning  string `json:"memory_warning,omitempty"`
	// V6.4 — passive reuse suggestion (advisory-only, never alters security decisions)
	MemorySuggestionAvailable    bool    `json:"memory_suggestion_available"`
	MemorySuggestionConfidence   float64 `json:"memory_suggestion_confidence"`
	MemorySuggestionEventID      string  `json:"memory_suggestion_event_id,omitempty"`
	MemorySuggestionStrategy     string  `json:"memory_suggestion_strategy,omitempty"`
	MemorySuggestionPatchSummary string  `json:"memory_suggestion_patch_summary,omitempty"`
	MemorySuggestionMatches      int     `json:"memory_suggestion_matches"`
	// V6.5 — memory-guided patch planning (advisory/supervised)
	PatchPlanID               string                      `json:"patch_plan_id,omitempty"`
	PatchPlanStrategy         string                      `json:"patch_plan_strategy,omitempty"`
	PatchPlanMemoryGuided     bool                        `json:"patch_plan_memory_guided"`
	PatchPlanMemoryEventID    string                      `json:"patch_plan_memory_event_id,omitempty"`
	PatchPlanMemoryConfidence float64                     `json:"patch_plan_memory_confidence"`
	PatchPlanRiskLevel        string                      `json:"patch_plan_risk_level,omitempty"`
	PatchPlanApplyMode        string                      `json:"patch_plan_apply_mode,omitempty"`
	PatchPlanTargetFiles      []string                    `json:"patch_plan_target_files,omitempty"`
	PatchPlanOperations       []planning.PlannedOperation `json:"patch_plan_operations,omitempty"`
	// V6.6 — supervised multi-file patch execution result
	PatchExecutionID           string   `json:"patch_execution_id,omitempty"`
	PatchExecutionMode         string   `json:"patch_execution_mode,omitempty"`
	PatchExecutionOK           bool     `json:"patch_execution_ok"`
	PatchExecutionAppliedFiles []string `json:"patch_execution_applied_files,omitempty"`
	PatchExecutionSkippedFiles []string `json:"patch_execution_skipped_files,omitempty"`
	PatchExecutionFailedFiles  []string `json:"patch_execution_failed_files,omitempty"`
	PatchExecutionTotalFiles   int      `json:"patch_execution_total_files"`
	PatchExecutionPatchedFiles int      `json:"patch_execution_patched_files"`
	// V6.7 — real remediation operation stats
	RealRemediationEnabled    bool     `json:"real_remediation_enabled"`
	RealRemediationApplied    bool     `json:"real_remediation_applied"`
	RealRemediationOpsTotal   int      `json:"real_remediation_operations_total"`
	RealRemediationOpsApplied int      `json:"real_remediation_operations_applied"`
	RealRemediationOpsSkipped int      `json:"real_remediation_operations_skipped"`
	RealRemediationOpsFailed  int      `json:"real_remediation_operations_failed"`
	RealRemediationOpTypes    []string `json:"real_remediation_operation_types,omitempty"`
	// V6.8 — rule mapping stats
	RuleMappingEnabled         bool     `json:"rule_mapping_enabled"`
	RuleMappingOpsGenerated    int      `json:"rule_mapping_operations_generated"`
	RuleMappingOpsRejected     int      `json:"rule_mapping_operations_rejected"`
	RuleMappingRejectedReasons []string `json:"rule_mapping_rejected_reasons,omitempty"`
	// V7.0 — PASS GOLD gated GitHub PR planning (dry-run only by default)
	GitHubPRPlanID        string `json:"github_pr_plan_id,omitempty"`
	GitHubPRBranch        string `json:"github_pr_branch,omitempty"`
	GitHubPRCanOpen       bool   `json:"github_pr_can_open"`
	GitHubPRBlockReason   string `json:"github_pr_block_reason,omitempty"`
	GitHubPRTitle         string `json:"github_pr_title,omitempty"`
	GitHubPRStatusContext string `json:"github_pr_status_context"`
	GitHubPRStatusState   string `json:"github_pr_status_state"`
	GitHubPRDryRun        bool   `json:"github_pr_dry_run"`
	GitHubPROpened        bool   `json:"github_pr_opened"`
	// V14.4 — Real Go Core evidence receipt. Backend must not fabricate this.
	EvidenceReceipt *EvidenceReceipt `json:"evidence_receipt,omitempty"`
	BackendStub     bool             `json:"backend_stub"`
	EvidenceSource  string           `json:"evidence_source,omitempty"`

	// V6.3 internal — before-state telemetry, not serialised
	beforeTrace securityTrace `json:"-"`
}

// securityTrace holds production blocking violations captured BEFORE the patcher.
// Used only for memory learning and V6.8 rule mapping. NEVER influences security gates.
type securityTrace struct {
	RuleIDs      []string
	Files        []string
	Score        int
	Blocking     int
	RuleMappings []planning.RuleMappingInput // V6.8: ready for rule→op mapping
}

// securityViolation é a struct exposta no JSON da missão.
// Espelha types.Violation mas com json tags explícitas para clareza no output.
// V6.1.1-HARDEN: adiciona source_context para classificação de origem.
type securityViolation struct {
	Gate          string `json:"gate"`
	Category      string `json:"category"`
	Severity      string `json:"severity"`
	File          string `json:"file"`
	Line          int    `json:"line"`
	RuleID        string `json:"rule_id"`
	Message       string `json:"message"`
	Remediation   string `json:"remediation"`
	SourceContext string `json:"source_context,omitempty"`
	Disposition   string `json:"disposition"`
	NoiseReason   string `json:"noise_reason,omitempty"`
	FalsePositive bool   `json:"false_positive,omitempty"`
}

var v55Steps = []string{
	"scanner", "hermes", "fileops", "snapshot", "patcher",
	"validator", "rollback", "security", "passsecure", "passgold", "memory",
}

// Run executa o pipeline V5.5 com Hermes integrado ao runtime real.
func Run(input Input) Output {
	start := time.Now()
	missionID := "mission_" + shortID()
	snapshotDir := filepath.Join(input.Root, ".vision-snapshots")

	out := Output{
		Version:   passgold.Version,
		MissionID: missionID,
		Engine:    passgold.Engine,
		Steps:     v55Steps,
	}
	gates := passgold.Gates{}

	// ── STEP 1: Scanner ───────────────────────────────────────────
	scanRes := scanner.Run(input.Root)
	s1 := StepResult{Step: "scanner", OK: scanRes.OK}
	if scanRes.OK {
		s1.Message = fmt.Sprintf("scanned %d files, stack: %v", scanRes.FilesFound, scanRes.Stack)
		gates.ScannerOK = true
	} else {
		s1.Error = scanRes.Error
	}
	out.StepResults = append(out.StepResults, s1)

	// ── STEP 2: Hermes — diagnóstico e RCA antes de qualquer patch ─
	scannerEvidence := s1.Message
	diagnosis := hermes.Analyze(input.InputText, scannerEvidence)
	out.HermesEnabled = diagnosis.HermesEnabled
	out.IssueType = diagnosis.IssueType
	out.ProbableRootCause = diagnosis.ProbableRootCause
	out.Confidence = diagnosis.Confidence
	out.Severity = diagnosis.Severity
	out.SuggestedStrategy = diagnosis.SuggestedStrategy
	sHermes := StepResult{
		Step:    "hermes",
		OK:      diagnosis.HermesEnabled && diagnosis.Confidence > 0.70,
		Message: fmt.Sprintf("RCA: %s | confidence %.2f | severity %s", diagnosis.IssueType, diagnosis.Confidence, diagnosis.Severity),
	}
	if !sHermes.OK {
		sHermes.Error = "hermes confidence below PASS GOLD threshold"
	}
	out.StepResults = append(out.StepResults, sHermes)

	// ── V6.4: PASSIVE MEMORY SUGGESTION — advisory-only ──────────
	// Memory suggestion is advisory only.
	// It must never change PASS SECURE, PASS GOLD, deploy or promotion decisions.
	{
		mq := memory.RemediationQuery{
			IssueType:         out.IssueType,
			ProbableRootCause: out.ProbableRootCause,
			SuggestedStrategy: out.SuggestedStrategy,
			Severity:          out.Severity,
		}
		if matches, err := memory.FindSimilarRemediations(input.Root, mq); err == nil {
			sugg := memory.BuildSuggestion(matches)
			out.MemorySuggestionAvailable = sugg.Available
			out.MemorySuggestionConfidence = sugg.Confidence
			out.MemorySuggestionMatches = len(sugg.Matches)
			if sugg.Available {
				out.MemorySuggestionEventID = sugg.BestEventID
				out.MemorySuggestionStrategy = sugg.SuggestedStrategy
				out.MemorySuggestionPatchSummary = sugg.PatchSummary
			}
		}
		// memória indisponível é silenciosa — não bloqueia pipeline
	}

	// ── V6.8: RULE MAPPING — violation → planned operation ─────
	// Convert production/blocking violations into PlannedOperations.
	// Only rules in the V6.8 allowlist with deterministic before/after are mapped.
	// No secrets are emitted in mapping results. Fallback to sentinel if no ops.
	out.RuleMappingEnabled = true // capability always active in V6.8+

	// ── V6.5: MEMORY-GUIDED PATCH PLANNING — advisory/supervised ─
	// Memory-guided patch planning is advisory and supervised.
	// It cannot bypass validation, rollback, PASS SECURE or PASS GOLD.
	{
		planInput := planning.PlanInput{
			MissionID:         missionID,
			IssueType:         out.IssueType,
			RootCause:         out.ProbableRootCause,
			SuggestedStrategy: out.SuggestedStrategy,
			Severity:          out.Severity,
			Root:              input.Root,
			// BlockingRuleIDs and BlockingFiles populated after security scan;
			// at this point we use memory suggestion files as candidate input.
			MemorySuggestion: memory.RemediationSuggestion{
				Available:         out.MemorySuggestionAvailable,
				Confidence:        out.MemorySuggestionConfidence,
				BestEventID:       out.MemorySuggestionEventID,
				SuggestedStrategy: out.MemorySuggestionStrategy,
				PatchSummary:      out.MemorySuggestionPatchSummary,
			},
		}
		plan := planning.BuildPatchPlan(planInput)

		// V6.8: attach real operations from security violations
		if len(out.beforeTrace.RuleMappings) > 0 {
			prevOpCount := len(plan.Operations)
			plan = planning.AttachOperationsFromViolations(input.Root, plan, out.beforeTrace.RuleMappings)
			generated := len(plan.Operations) - prevOpCount
			out.RuleMappingOpsGenerated = generated
			out.RuleMappingOpsRejected = len(out.beforeTrace.RuleMappings) - generated
			// Collect rejection reasons (no secrets) from plan notes added by AttachOperationsFromViolations
			for _, note := range plan.Notes {
				if strings.Contains(note, "rule_mapping:") && strings.Contains(note, "—") {
					out.RuleMappingRejectedReasons = append(out.RuleMappingRejectedReasons, note)
				}
			}
		}

		out.PatchPlanID = plan.ID
		out.PatchPlanStrategy = plan.Strategy
		out.PatchPlanMemoryGuided = plan.MemoryGuided
		out.PatchPlanMemoryEventID = plan.MemoryEventID
		out.PatchPlanMemoryConfidence = plan.MemoryConfidence
		out.PatchPlanRiskLevel = plan.RiskLevel
		out.PatchPlanApplyMode = plan.ApplyMode
		out.PatchPlanTargetFiles = plan.TargetFiles
		out.PatchPlanOperations = plan.Operations
	}

	// ── STEP 3: FileOps — path safety ─────────────────────────────
	s2 := StepResult{Step: "fileops"}
	if err := fileops.ValidateSafePath(input.Root, "."); err == nil {
		s2.OK = true
		s2.Message = "root path safe, traversal blocked"
		gates.FileopsOK = true
	} else {
		s2.Error = err.Error()
	}
	out.StepResults = append(out.StepResults, s2)

	// ── STEP 3: Snapshot — criar ANTES do patch, UMA única vez ────
	// FIX 1: nunca usar go.mod ou arquivos reais em self-test
	// FIX 3: snapshotID = snap.ID real retornado por CreateSnapshot
	targetFile := selectTargetFile(input.Root, input.InputText)
	// V6.5: if plan has a production-safe target, use it instead of sentinel
	if len(out.PatchPlanTargetFiles) > 0 && out.PatchPlanTargetFiles[0] != planning.SafeSentinel {
		targetFile = out.PatchPlanTargetFiles[0]
	}
	s3 := StepResult{Step: "snapshot"}
	var snapshotID string
	var realSnap fileops.Snapshot

	if !input.DryRun {
		snap, snapRes := fileops.CreateSnapshot(input.Root, targetFile, missionID, snapshotDir)
		if snapRes.OK {
			realSnap = snap
			snapshotID = snap.ID // FIX 3: ID real, não hash inventado
			out.SnapshotID = snapshotID
			s3.OK = true
			s3.Message = fmt.Sprintf("snapshot %s for %s", snapshotID, targetFile)
		} else {
			s3.Error = "snapshot failed: " + snapRes.Error
		}
	} else {
		s3.OK = true
		s3.Message = "dry-run: snapshot skipped"
		realSnap = fileops.Snapshot{} // vazio
	}
	_ = realSnap
	out.StepResults = append(out.StepResults, s3)

	// ── V6.3: BEFORE-STATE CAPTURE — telemetria apenas, não bloqueia ─
	// Avaliação de segurança ANTES do patcher para memória de remediation.
	// NÃO altera pass_secure, pass_gold, gates ou qualquer decisão de segurança.
	{
		beforePS := passsecure.Evaluate(input.Root)
		beforeAnnotated := passsecure.AnnotateViolations(beforePS.Summary_.Violations)
		out.beforeTrace = buildSecurityTrace(beforeAnnotated, beforePS.SecurityScore)
	}

	// ── STEP 4: Patcher — V6.6 Supervised Multi-File Execution ──
	// V6.6: usa ExecuteSupervisedMultiFile sobre o PatchPlan da V6.5.
	// Snapshot criado internamente via ApplyBatch transacional.
	// ApplyMode="supervised" é obrigatório. "automatic" nunca é aceito.
	// V6.7: map PlannedOperation → patcher.PatchOperation to avoid import cycle
	var patchOps []patcher.PatchOperation
	for _, pop := range out.PatchPlanOperations {
		patchOps = append(patchOps, patcher.PatchOperation{
			File:          pop.File,
			Description:   pop.Description,
			OperationType: pop.OperationType,
			Before:        pop.Before,
			After:         pop.After,
			Anchor:        pop.Anchor,
			Status:        "pending",
		})
	}
	execInput := patcher.ExecutionPlanInput{
		MissionID:     missionID,
		TransactionID: "", // gerado internamente pelo ApplyBatch
		ApplyMode:     out.PatchPlanApplyMode,
		TargetFiles:   out.PatchPlanTargetFiles,
		Root:          input.Root,
		DryRun:        input.DryRun,
		Operations:    patchOps,
	}
	execRes := patcher.ExecuteSupervisedMultiFile(input.Root, execInput, snapshotDir)
	s4 := StepResult{Step: "patcher"}
	out.PatchExecutionID = execRes.ExecutionID
	out.PatchExecutionMode = out.PatchPlanApplyMode
	out.PatchExecutionOK = execRes.OK
	out.PatchExecutionAppliedFiles = execRes.AppliedFiles
	out.PatchExecutionSkippedFiles = execRes.SkippedFiles
	out.PatchExecutionFailedFiles = execRes.FailedFiles
	out.PatchExecutionTotalFiles = execRes.TotalFiles
	out.PatchExecutionPatchedFiles = execRes.PatchedFiles
	// V6.7 — real remediation stats from execution result
	out.RealRemediationEnabled = execRes.RealRemediationEnabled
	out.RealRemediationApplied = execRes.RealRemediationApplied
	out.RealRemediationOpsTotal = execRes.OperationsTotal
	out.RealRemediationOpsApplied = execRes.OperationsApplied
	out.RealRemediationOpsSkipped = execRes.OperationsSkipped
	out.RealRemediationOpsFailed = execRes.OperationsFailed
	out.RealRemediationOpTypes = execRes.OperationTypes
	if execRes.OK {
		s4.OK = true
		gates.PatcherOK = true
		if input.DryRun {
			s4.Message = fmt.Sprintf("dry-run: %d/%d files validated (exec: %s)",
				execRes.PatchedFiles, execRes.TotalFiles, execRes.ExecutionID)
		} else {
			s4.Message = fmt.Sprintf("supervised exec: %d/%d files applied (exec: %s tx: %s)",
				execRes.PatchedFiles, execRes.TotalFiles, execRes.ExecutionID, execRes.TransactionID)
		}
		out.TransactionMode = true
		out.TransactionID = execRes.TransactionID
		out.PatchedFiles = execRes.PatchedFiles
		out.TotalFiles = execRes.TotalFiles
	} else {
		if execRes.Error != "" {
			s4.Error = execRes.Error
		} else {
			s4.Error = fmt.Sprintf("supervised execution failed: %d file(s) failed",
				len(execRes.FailedFiles))
		}
		out.TransactionMode = true
		out.TransactionID = execRes.TransactionID
	}
	out.StepResults = append(out.StepResults, s4)

	// ── STEP 5: Validator ──────────────────────────────────────────
	var changedFiles []string
	if !input.DryRun && targetFile != "" {
		changedFiles = []string{targetFile}
	}
	valRes := validator.Run(input.Root, changedFiles)
	s5 := StepResult{Step: "validator"}
	allOK := true
	for _, c := range valRes.Checks {
		if !c.Passed {
			allOK = false
			break
		}
	}
	if allOK {
		s5.OK = true
		s5.Message = fmt.Sprintf("%d checks passed", len(valRes.Checks))
		gates.ValidatorOK = true
	} else {
		s5.OK = false
		for _, c := range valRes.Checks {
			if !c.Passed {
				s5.Error = c.Name + ": " + c.Message
				break
			}
		}
	}
	out.StepResults = append(out.StepResults, s5)

	// ── STEP 6: Rollback — automático se validator falhou ─────────
	// FIX 4: rollback.Restore recebe root para resolver path absoluto
	s6 := StepResult{Step: "rollback"}
	rbReady := rollback.Ready(snapshotDir)

	if !s5.OK && snapshotID != "" && !input.DryRun {
		rbResult := rollback.Restore(snapshotDir, snapshotID, input.Root)
		if rbResult.OK {
			s6.OK = true
			s6.Message = "rollback applied: restored to " + snapshotID
			out.RollbackApplied = true
		} else {
			s6.OK = false
			s6.Error = "rollback failed: " + rbResult.Error
		}
	} else {
		s6.OK = rbReady
		if rbReady {
			s6.Message = "rollback ready (not needed)"
		} else {
			s6.Message = "rollback dir unavailable"
		}
	}
	gates.RollbackReady = rbReady
	out.StepResults = append(out.StepResults, s6)

	// ── Security + Legacy ──────────────────────────────────────────
	gates.SecurityOK = gates.ScannerOK && gates.FileopsOK && gates.PatcherOK
	gates.LegacySafe = true

	// ── STEP 7: PASS SECURE — Aegis Security Runtime ──────────────
	psResult := passsecure.Evaluate(input.Root)
	sPassSecure := StepResult{
		Step: "passsecure",
		OK:   psResult.PassSecure,
	}
	if psResult.PassSecure {
		sPassSecure.Message = psResult.Summary()
		gates.PassSecureOK = true
	} else {
		sPassSecure.Error = psResult.Summary()
		gates.PassSecureOK = false
	}
	out.PassSecure = psResult.PassSecure
	out.SecurityScore = psResult.SecurityScore
	out.DeployAllowed = psResult.DeployAllowed
	out.SecurityFailedGates = psResult.FailedGates

	// Mapear violations para o tipo de saída da missão.
	// V6.1.2: anotar SourceContext + Disposition sem reduzir o total bruto.
	annotated := passsecure.AnnotateViolations(psResult.Summary_.Violations)
	vs := types.Build(annotated)
	out.SecurityTotalViolations = vs.TotalCount
	out.SecurityCriticalCount = vs.CriticalCount
	out.SecurityHighCount = vs.HighCount
	out.SecurityMediumCount = vs.MediumCount
	out.SecurityLowCount = vs.LowCount
	out.SecurityBlockingTotal = types.BlockingCount(annotated)
	out.SecurityFalsePositiveCount = types.FalsePositiveCount(annotated)
	out.SecurityRequiresReviewCount = types.RequiresReviewCount(annotated)
	out.SecurityNoiseCount = types.NoiseCount(annotated)
	out.SecurityViolations = mapSecurityViolations(vs.Violations)
	out.SecurityBlockingViolations = mapSecurityViolations(filterViolationsByDisposition(vs.Violations, types.DispositionBlocking))
	out.SecurityReportOnlyViolations = mapSecurityViolations(filterViolationsByDisposition(vs.Violations, types.DispositionReportOnly))
	out.StepResults = append(out.StepResults, sPassSecure)

	// ── PASS GOLD ──────────────────────────────────────────────────
	pg := passgold.Evaluate(gates)
	out.Gates = gates
	out.PassGold = pg.PassGold
	out.PromotionAllowed = pg.PromotionAllowed
	out.RollbackReady = pg.RollbackReady
	out.Status = pg.Status
	out.FailedGates = pg.FailedGates
	sPassGold := StepResult{Step: "passgold", OK: pg.PassGold}
	if pg.PassGold {
		sPassGold.Message = fmt.Sprintf("PASS GOLD — status=%s", pg.Status)
	} else {
		sPassGold.Error = fmt.Sprintf("PASS GOLD FAIL — gates: %v", pg.FailedGates)
	}
	out.StepResults = append(out.StepResults, sPassGold)
	if pg.PassGold && psResult.PassSecure {
		out.OK = true
		out.Summary = "V6.1 AEGIS RELEASE CANDIDATE — PASS GOLD + PASS SECURE confirmed."
	} else if pg.PassGold && !psResult.PassSecure {
		out.OK = false
		out.Summary = fmt.Sprintf("Mission BLOCKED. PASS GOLD=true but PASS SECURE=false. Security violations: %d", psResult.Violations)
	} else {
		out.OK = false
		out.Summary = fmt.Sprintf("Mission FAILED. Gates: %v", pg.FailedGates)
	}

	// V14.4 — Generate real evidence receipt from Go Core.
	// This is the only place where evidence_receipt is created.
	// Backend must never fabricate, substitute, or complement this.
	out.EvidenceReceipt = buildEvidenceReceipt(missionID, snapshotID, gates, pg)
	out.BackendStub = false
	out.EvidenceSource = "go-core"

	recordPassiveMemory(input.Root, &out)
	planGitHubPR(input, &out, changedFiles)
	out.DurationMs = time.Since(start).Milliseconds()
	return out
}

// selectTargetFile — FIX 1: nunca modifica go.mod do projeto.
// Usa arquivo sentinela em .vision-test/ isolado.
func selectTargetFile(root, _ string) string {
	testDir := filepath.Join(root, ".vision-test")
	if err := os.MkdirAll(testDir, 0755); err == nil {
		sentinel := filepath.Join(testDir, "mission.sentinel")
		_ = os.WriteFile(sentinel, []byte("vision-core-sentinel"), 0644)
		return filepath.Join(".vision-test", "mission.sentinel")
	}
	// fallback: apenas sentinel na raiz (não go.mod)
	sentinelPath := filepath.Join(root, ".vision-sentinel")
	_ = os.WriteFile(sentinelPath, []byte("vision-core-sentinel"), 0644)
	return ".vision-sentinel"
}

// buildBatchPlan constrói um BatchPlan V5.4 para o arquivo sentinela.
// Em V5.4 o pipeline usa BatchPlan mesmo para arquivo único,
// garantindo transaction_mode=true em todas as execuções.
func buildBatchPlan(missionID, targetFile string, input Input) patcher.BatchPlan {
	return patcher.BatchPlan{
		MissionID:   missionID,
		DryRun:      input.DryRun,
		Description: "V5.4 transactional mission: " + input.InputText,
		Files: []patcher.FilePlan{
			{
				File: targetFile,
				Ops: []patcher.Op{
					{
						Type:    "append",
						Content: fmt.Sprintf("\naudited:%s:%d\n", missionID, time.Now().UnixMilli()),
					},
				},
			},
		},
	}
}

func shortID() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// buildEvidenceReceipt generates the real evidence receipt from Go Core.
// The backend must never call this — it is internal to Go Core only.
func buildEvidenceReceipt(missionID, snapshotID string, gates passgold.Gates, pg passgold.Result) *EvidenceReceipt {
	gatesJSON, _ := json.Marshal(gates)
	hash := sha256.Sum256(gatesJSON)
	gatesHash := hex.EncodeToString(hash[:])[:16]

	result := "FAIL"
	if pg.PassGold {
		result = "PASS"
	}

	var snapID *string
	if snapshotID != "" {
		snapID = &snapshotID
	}

	failedGates := pg.FailedGates
	if failedGates == nil {
		failedGates = []string{}
	}

	return &EvidenceReceipt{
		ID:          "go_evr_" + shortID(),
		MissionID:   missionID,
		SnapshotID:  snapID,
		GatesHash:   gatesHash,
		IssuedAt:    time.Now().UTC().Format(time.RFC3339),
		Result:      result,
		PassGold:    pg.PassGold,
		FailedGates: failedGates,
		Source:      "go-core",
	}
}

func mapSecurityViolations(violations []types.Violation) []securityViolation {
	out := make([]securityViolation, 0, len(violations))
	for _, v := range violations {
		classified := types.ClassifyDisposition(v)
		out = append(out, securityViolation{
			Gate:          classified.Gate,
			Category:      classified.Category,
			Severity:      classified.Severity,
			File:          classified.File,
			Line:          classified.Line,
			RuleID:        classified.RuleID,
			Message:       classified.Message,
			Remediation:   classified.Remediation,
			SourceContext: classified.SourceContext,
			Disposition:   classified.Disposition,
			NoiseReason:   classified.NoiseReason,
			FalsePositive: classified.FalsePositive,
		})
	}
	return out
}

func filterViolationsByDisposition(violations []types.Violation, disposition string) []types.Violation {
	out := make([]types.Violation, 0, len(violations))
	for _, v := range violations {
		classified := types.ClassifyDisposition(v)
		if classified.Disposition == disposition {
			out = append(out, classified)
		}
	}
	return out
}

func recordPassiveMemory(root string, out *Output) {
	if out == nil || !memory.ShouldLearnFromMission(*out) {
		return
	}

	// V6.3: after-state from PASS SECURE result; before-state from captured trace.
	afterRuleIDs := productionRuleIDs(out.SecurityBlockingViolations)
	afterFiles := productionFiles(out.SecurityBlockingViolations)
	before := out.beforeTrace
	beforeRuleIDs := memory.DeduplicateStrings(before.RuleIDs)
	beforeFiles := memory.DeduplicateStrings(before.Files)
	fixedRuleIDs := memory.DiffStringSlices(beforeRuleIDs, afterRuleIDs)
	fixedFiles := memory.DiffStringSlices(beforeFiles, afterFiles)
	patchSummary := fmt.Sprintf("patched %d/%d file(s) via transaction %s",
		out.PatchedFiles, out.TotalFiles, out.TransactionID)
	changedFiles := memory.DeduplicateStrings(append(fixedFiles, afterFiles...))

	eventID := "mem_" + shortID()
	event := memory.RemediationEvent{
		ID:                  eventID,
		Timestamp:           time.Now().UTC().Format(time.RFC3339Nano),
		MissionID:           out.MissionID,
		TransactionID:       out.TransactionID,
		SnapshotID:          out.SnapshotID,
		Engine:              out.Engine,
		Version:             out.Version,
		IssueType:           out.IssueType,
		ProbableRootCause:   out.ProbableRootCause,
		SuggestedStrategy:   out.SuggestedStrategy,
		Confidence:          out.Confidence,
		Severity:            out.Severity,
		SecurityScoreBefore: before.Score,
		SecurityScoreAfter:  out.SecurityScore,
		BlockingBefore:      before.Blocking,
		BlockingAfter:       out.SecurityBlockingTotal,
		RuleIDs:             afterRuleIDs,
		Files:               afterFiles,
		RuleIDsBefore:       beforeRuleIDs,
		RuleIDsAfter:        afterRuleIDs,
		FixedRuleIDs:        fixedRuleIDs,
		FilesBefore:         beforeFiles,
		FilesAfter:          afterFiles,
		FixedFiles:          fixedFiles,
		PatchSummary:        patchSummary,
		ChangedFiles:        changedFiles,
		DiffAvailable:       false,
		PatchedFiles:        out.PatchedFiles,
		TotalFiles:          out.TotalFiles,
		PassSecure:          out.PassSecure,
		PassGold:            out.PassGold,
		DeployAllowed:       out.DeployAllowed,
		PromotionAllowed:    out.PromotionAllowed,
		RollbackReady:       out.RollbackReady,
		RollbackApplied:     out.RollbackApplied,
		Outcome:             "gold",
	}

	if err := memory.AppendRemediationEvent(root, event); err != nil {
		out.MemoryWarning = "memory record skipped: " + err.Error()
		out.StepResults = append(out.StepResults, StepResult{Step: "memory", OK: false, Error: out.MemoryWarning})
		return
	}
	out.MemoryRecorded = true
	out.MemoryEventID = eventID
	out.StepResults = append(out.StepResults, StepResult{Step: "memory", OK: true, Message: "remediation event recorded: " + eventID})
}

// buildSecurityTrace extracts production-only blocking violations for memory
// learning and V6.8 rule mapping. NEVER used for security decisions.
func buildSecurityTrace(violations []types.Violation, score int) securityTrace {
	var ruleIDs, files []string
	var ruleMappings []planning.RuleMappingInput
	seenRule := map[string]bool{}
	seenFile := map[string]bool{}
	blocking := 0
	blocked := map[string]bool{
		"": true, "test_fixture": true, "generated": true,
		"vendor": true, "snapshot": true, "unknown": true,
	}
	for _, v := range violations {
		if v.FalsePositive || v.Disposition != types.DispositionBlocking || blocked[v.SourceContext] {
			continue
		}
		blocking++
		if v.RuleID != "" && !seenRule[v.RuleID] {
			seenRule[v.RuleID] = true
			ruleIDs = append(ruleIDs, v.RuleID)
		}
		if v.File != "" && !seenFile[v.File] {
			seenFile[v.File] = true
			files = append(files, v.File)
		}
		// V6.8: build RuleMappingInput for every qualifying violation
		ruleMappings = append(ruleMappings, planning.RuleMappingInput{
			RuleID:        v.RuleID,
			Category:      v.Category,
			Severity:      v.Severity,
			File:          v.File,
			Line:          v.Line,
			Message:       v.Message,
			Remediation:   v.Remediation,
			SourceContext: v.SourceContext,
			Disposition:   v.Disposition,
			FalsePositive: v.FalsePositive,
		})
	}
	if ruleIDs == nil {
		ruleIDs = []string{}
	}
	if files == nil {
		files = []string{}
	}
	if ruleMappings == nil {
		ruleMappings = []planning.RuleMappingInput{}
	}
	return securityTrace{
		RuleIDs:      ruleIDs,
		Files:        files,
		Score:        score,
		Blocking:     blocking,
		RuleMappings: ruleMappings,
	}
}

func productionRuleIDs(violations []securityViolation) []string {
	seen := map[string]bool{}
	ids := []string{}
	for _, v := range violations {
		if !isProductionLearningViolation(v) || v.RuleID == "" {
			continue
		}
		if !seen[v.RuleID] {
			seen[v.RuleID] = true
			ids = append(ids, v.RuleID)
		}
	}
	return ids
}

func productionFiles(violations []securityViolation) []string {
	seen := map[string]bool{}
	files := []string{}
	for _, v := range violations {
		if !isProductionLearningViolation(v) || v.File == "" {
			continue
		}
		if !seen[v.File] {
			seen[v.File] = true
			files = append(files, v.File)
		}
	}
	return files
}

func isProductionLearningViolation(v securityViolation) bool {
	if v.FalsePositive || v.Disposition != types.DispositionBlocking {
		return false
	}
	blockedContexts := map[string]bool{
		"":             true,
		"unknown":      true,
		"test_fixture": true,
		"generated":    true,
		"vendor":       true,
		"snapshot":     true,
	}
	return !blockedContexts[v.SourceContext]
}

func planGitHubPR(input Input, out *Output, changedFiles []string) {
	if out == nil {
		return
	}
	plannedFiles := memory.DeduplicateStrings(append([]string{}, changedFiles...))
	if len(plannedFiles) == 0 {
		plannedFiles = memory.DeduplicateStrings(append(plannedFiles, out.PatchExecutionAppliedFiles...))
	}
	if len(plannedFiles) == 0 && out.PatchedFiles > 0 {
		plannedFiles = memory.DeduplicateStrings(append(plannedFiles, out.PatchPlanTargetFiles...))
	}
	gateSnapshot := githubpr.GateSnapshot{
		PassGold:              out.PassGold,
		PassSecure:            out.PassSecure,
		DeployAllowed:         out.DeployAllowed,
		PromotionAllowed:      out.PromotionAllowed,
		SecurityBlockingTotal: out.SecurityBlockingTotal,
		RollbackReady:         out.RollbackReady,
		ValidatorOK:           out.Gates.ValidatorOK,
		PatcherOK:             out.Gates.PatcherOK,
	}
	status := githubpr.BuildPassGoldStatus(gateSnapshot)
	plan := githubpr.BuildPRPlan(githubpr.PRPlanInput{
		MissionID:         out.MissionID,
		ChangedFiles:      plannedFiles,
		IssueType:         out.IssueType,
		SuggestedStrategy: out.SuggestedStrategy,
		PatchSummary:      fmt.Sprintf("patched %d/%d file(s) via transaction %s", out.PatchedFiles, out.TotalFiles, out.TransactionID),
		GateSnapshot:      gateSnapshot,
	})
	out.GitHubPRPlanID = plan.ID
	out.GitHubPRBranch = plan.WorkBranch
	out.GitHubPRCanOpen = plan.CanOpenPR
	out.GitHubPRBlockReason = plan.BlockReason
	out.GitHubPRTitle = plan.Title
	out.GitHubPRStatusContext = status.Context
	out.GitHubPRStatusState = status.State
	out.GitHubPRDryRun = true
	out.GitHubPROpened = false
}
