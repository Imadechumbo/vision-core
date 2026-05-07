// Package remediationharness proves V6.9 real remediation in an isolated root.
//
// The harness writes only to the caller-provided temporary root, creates a
// controlled vulnerable project there, then runs the same security, mapping,
// patcher, validator, rollback, PASS SECURE, PASS GOLD, and memory components
// used by the production runtime.
package remediationharness

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/visioncore/go-core/internal/fileops"
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

// Scenario describes one isolated vulnerable project fixture generated at runtime.
type Scenario struct {
	ID              string
	Name            string
	RuleID          string
	Category        string
	Severity        string
	FilePath        string
	BeforeContent   string
	ExpectedContent string
	MissionInput    string
}

// ScenarioResult captures every V6.9 acceptance signal for a harness scenario.
type ScenarioResult struct {
	ScenarioID                    string
	OK                            bool
	DetectedBlockingBefore        bool
	RuleMappingGeneratedOperation bool
	RealRemediationApplied        bool
	BlockingAfter                 int
	PassSecure                    bool
	PassGold                      bool
	RollbackReady                 bool
	MemoryRecorded                bool
	ChangedFiles                  []string
	Error                         string

	SourceContext           string
	Disposition             string
	FalsePositive           bool
	RuleMappingOperations   int
	RuleMappingRejected     int
	PatchExecutionOK        bool
	ValidatorOK             bool
	ScannerOK               bool
	FileopsOK               bool
	SecurityBlockingBefore  int
	BeforeRuleIDPresent     bool
	FinalContent            string
	SnapshotID              string
	MemoryEventID           string
	OperationStatuses       []string
	UsedSentinelFallback    bool
	SecurityViolationBefore bool
}

// Run executes the real remediation pipeline over a caller-owned temporary root.
func Run(root string, scenario Scenario) ScenarioResult {
	res := ScenarioResult{ScenarioID: scenario.ID}
	if strings.TrimSpace(root) == "" {
		res.Error = "root is required"
		return res
	}
	if strings.TrimSpace(scenario.FilePath) == "" {
		res.Error = "scenario file path is required"
		return res
	}
	if err := writeScenarioFile(root, scenario.FilePath, scenario.BeforeContent); err != nil {
		res.Error = err.Error()
		return res
	}

	missionID := "harness_" + scenario.ID + "_" + fmt.Sprint(time.Now().UnixNano())
	snapshotDir := filepath.Join(root, ".vision-snapshots")

	scanRes := scanner.Run(root)
	res.ScannerOK = scanRes.OK
	res.FileopsOK = fileops.ValidateSafePath(root, scenario.FilePath) == nil

	before := passsecure.Evaluate(root)
	beforeViolations := passsecure.AnnotateViolations(before.Summary_.Violations)
	res.SecurityBlockingBefore = types.BlockingCount(beforeViolations)

	mappingInputs := make([]planning.RuleMappingInput, 0)
	for _, v := range beforeViolations {
		if v.RuleID == scenario.RuleID {
			res.BeforeRuleIDPresent = true
			res.SourceContext = v.SourceContext
			res.Disposition = v.Disposition
			res.FalsePositive = v.FalsePositive
			res.SecurityViolationBefore = true
			if v.SourceContext == types.SourceContextProduction && v.Disposition == types.DispositionBlocking && !v.FalsePositive {
				res.DetectedBlockingBefore = true
			}
		}
		if v.SourceContext != types.SourceContextProduction || v.Disposition != types.DispositionBlocking || v.FalsePositive {
			continue
		}
		mappingInputs = append(mappingInputs, planning.RuleMappingInput{
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

	plan := planning.BuildPatchPlan(planning.PlanInput{
		MissionID:       missionID,
		IssueType:       scenario.Name,
		RootCause:       scenario.RuleID,
		Severity:        scenario.Severity,
		BlockingRuleIDs: []string{scenario.RuleID},
		BlockingFiles:   []string{scenario.FilePath},
		Root:            root,
	})
	beforeOps := len(plan.Operations)
	plan = planning.AttachOperationsFromViolations(root, plan, mappingInputs)
	res.RuleMappingOperations = len(plan.Operations) - beforeOps
	res.RuleMappingGeneratedOperation = res.RuleMappingOperations >= 1
	res.RuleMappingRejected = len(mappingInputs) - res.RuleMappingOperations

	if snap, snapRes := fileops.CreateSnapshot(root, scenario.FilePath, missionID, snapshotDir); snapRes.OK {
		res.SnapshotID = snap.ID
	}
	res.RollbackReady = rollback.Ready(snapshotDir)

	patchOps := make([]patcher.PatchOperation, 0, len(plan.Operations))
	for _, op := range plan.Operations {
		patchOps = append(patchOps, patcher.PatchOperation{
			File:          op.File,
			Description:   op.Description,
			OperationType: op.OperationType,
			Before:        op.Before,
			After:         op.After,
			Anchor:        op.Anchor,
			Status:        "pending",
		})
	}
	execRes := patcher.ExecuteSupervisedMultiFile(root, patcher.ExecutionPlanInput{
		MissionID:     missionID,
		TransactionID: missionID,
		ApplyMode:     plan.ApplyMode,
		TargetFiles:   plan.TargetFiles,
		Root:          root,
		Operations:    patchOps,
	}, snapshotDir)
	res.PatchExecutionOK = execRes.OK
	res.RealRemediationApplied = execRes.RealRemediationApplied
	res.ChangedFiles = append([]string{}, execRes.AppliedFiles...)
	for _, op := range execRes.Operations {
		res.OperationStatuses = append(res.OperationStatuses, op.Status)
		if op.File == planning.SafeSentinel {
			res.UsedSentinelFallback = true
		}
	}

	valRes := validator.Run(root, res.ChangedFiles)
	res.ValidatorOK = valRes.OK

	after := passsecure.Evaluate(root)
	res.BlockingAfter = after.BlockingTotal
	res.PassSecure = after.PassSecure

	gates := passgold.Gates{
		ScannerOK:     res.ScannerOK,
		FileopsOK:     res.FileopsOK,
		PatcherOK:     res.PatchExecutionOK,
		ValidatorOK:   res.ValidatorOK,
		RollbackReady: res.RollbackReady,
		SecurityOK:    res.ScannerOK && res.FileopsOK && res.PatchExecutionOK && res.BlockingAfter == 0,
		LegacySafe:    true,
		PassSecureOK:  res.PassSecure,
	}
	pg := passgold.Evaluate(gates)
	res.PassGold = pg.PassGold

	finalData, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(scenario.FilePath)))
	if err == nil {
		res.FinalContent = string(finalData)
	}

	if res.PassGold && res.PassSecure {
		eventID := "harness_mem_" + scenario.ID + "_" + fmt.Sprint(time.Now().UnixNano())
		err := memory.AppendRemediationEvent(root, memory.RemediationEvent{
			ID:                  eventID,
			Timestamp:           time.Now().UTC().Format(time.RFC3339Nano),
			MissionID:           missionID,
			TransactionID:       missionID,
			SnapshotID:          res.SnapshotID,
			Engine:              passgold.Engine,
			Version:             passgold.Version,
			IssueType:           scenario.Name,
			ProbableRootCause:   scenario.RuleID,
			SuggestedStrategy:   "v6.9 real remediation harness",
			Severity:            scenario.Severity,
			SecurityScoreBefore: before.SecurityScore,
			SecurityScoreAfter:  after.SecurityScore,
			BlockingBefore:      res.SecurityBlockingBefore,
			BlockingAfter:       res.BlockingAfter,
			RuleIDsBefore:       []string{scenario.RuleID},
			RuleIDsAfter:        []string{},
			FixedRuleIDs:        []string{scenario.RuleID},
			FilesBefore:         []string{scenario.FilePath},
			FilesAfter:          []string{},
			FixedFiles:          []string{scenario.FilePath},
			ChangedFiles:        res.ChangedFiles,
			DiffAvailable:       false,
			PatchedFiles:        len(res.ChangedFiles),
			TotalFiles:          len(plan.TargetFiles),
			PassSecure:          res.PassSecure,
			PassGold:            res.PassGold,
			DeployAllowed:       res.PassSecure,
			PromotionAllowed:    res.PassGold,
			RollbackReady:       res.RollbackReady,
			Outcome:             "gold",
		})
		if err == nil {
			res.MemoryRecorded = true
			res.MemoryEventID = eventID
		} else {
			res.Error = "memory record failed: " + err.Error()
		}
	}

	res.OK = res.DetectedBlockingBefore && res.RuleMappingGeneratedOperation && res.RealRemediationApplied &&
		res.BlockingAfter == 0 && res.PassSecure && res.PassGold && res.RollbackReady && res.MemoryRecorded &&
		strings.Contains(res.FinalContent, scenario.ExpectedContent)
	if !res.OK && res.Error == "" {
		res.Error = "scenario did not satisfy all V6.9 harness gates"
	}
	return res
}

func writeScenarioFile(root, relPath, content string) error {
	if !planning.IsSafeTarget(relPath) {
		return fmt.Errorf("unsafe scenario target: %s", relPath)
	}
	path := filepath.Join(root, filepath.FromSlash(relPath))
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(content), 0644)
}
