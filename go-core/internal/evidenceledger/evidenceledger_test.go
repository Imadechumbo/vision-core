package evidenceledger

import "testing"

func dryRunInput() EvidenceInput {
	return EvidenceInput{MissionInput: "CORS origin blocked", Operation: "mission", Evidences: []map[string]interface{}{{"source": "contract_registry", "tool": "vision.contract_audit", "category": "contract", "gate": "CONTRACT", "status": "pass", "dry_run": true, "read_only": true, "summary": "contract audit conflicts_found=false"}}}
}

func has(xs []string, want string) bool {
	for _, x := range xs {
		if x == want {
			return true
		}
	}
	return false
}

func TestBuildLedgerAlwaysV88DryRunReadOnly(t *testing.T) {
	s := BuildLedger(dryRunInput())
	if s.Version != Version || !s.DryRun || !s.ReadOnly {
		t.Fatalf("expected V8.8 dry_run/read_only snapshot: %+v", s)
	}
}

func TestBuildLedgerEmptyBlocked(t *testing.T) {
	s := BuildLedger(EvidenceInput{})
	if s.LedgerStatus != "empty" || !s.Blocked {
		t.Fatalf("empty ledger must be blocked with empty status: %+v", s)
	}
}

func TestDryRunEvidenceNotUsableForPassGold(t *testing.T) {
	recs := NormalizeEvidence(EvidenceInput{Evidences: []map[string]interface{}{{"source": "dashboard", "tool": "vision.dashboard_snapshot", "gate": "PASS_GOLD", "status": "pass", "dry_run": true, "pass_gold": true}}})
	if len(recs) != 1 || recs[0].UsableForPassGold || recs[0].UsableForPassSecure {
		t.Fatalf("dry-run evidence must not be usable for pass gates: %+v", recs)
	}
}

func TestDryRunEvidenceMissingPassGates(t *testing.T) {
	s := BuildLedger(dryRunInput())
	if !has(s.GatesMissing, "PASS_GOLD") || !has(s.GatesMissing, "PASS_SECURE") {
		t.Fatalf("dry-run evidence must miss PASS_GOLD/PASS_SECURE: %+v", s.GatesMissing)
	}
}

func TestValidateBlocksPassGoldTrueWithDryRun(t *testing.T) {
	v := ValidateEvidence(EvidenceInput{Evidences: []map[string]interface{}{{"source": "dashboard", "tool": "vision.dashboard_snapshot", "status": "pass", "dry_run": true, "pass_gold": true}}})
	if v.Valid || !v.Blocked || len(v.UnsafeClaims) == 0 {
		t.Fatalf("pass_gold dry-run claim must be unsafe: %+v", v)
	}
}

func TestValidateBlocksDeployAllowedInsideMCP(t *testing.T) {
	v := ValidateEvidence(EvidenceInput{Evidences: []map[string]interface{}{{"source": "dashboard", "tool": "vision.dashboard_snapshot", "status": "pass", "deploy_allowed": true}}})
	if v.Valid || !v.Blocked || len(v.UnsafeClaims) == 0 {
		t.Fatalf("deploy_allowed claim must be unsafe: %+v", v)
	}
}

func TestValidateDetectsMissingRealPassEvidence(t *testing.T) {
	v := ValidateEvidence(dryRunInput())
	if !has(v.MissingEvidence, "PASS_GOLD_REAL") || !has(v.MissingEvidence, "PASS_SECURE_REAL") {
		t.Fatalf("must detect missing real pass evidence: %+v", v.MissingEvidence)
	}
}

func TestValidateDetectsContradictionSameGateSource(t *testing.T) {
	v := ValidateEvidence(EvidenceInput{Evidences: []map[string]interface{}{{"source": "guard", "tool": "vision.contract_audit", "gate": "PASS_GOLD", "status": "pass", "real_evidence": true}, {"source": "guard", "tool": "vision.contract_audit", "gate": "PASS_GOLD", "status": "fail", "real_evidence": true}}})
	if len(v.Contradictions) == 0 || !v.Blocked {
		t.Fatalf("must detect contradiction: %+v", v)
	}
}

func TestSummarizeDryRunOnlyStrength(t *testing.T) {
	s := SummarizeEvidence(dryRunInput())
	if s.EvidenceStrength != "dry_run_only" {
		t.Fatalf("expected dry_run_only, got %+v", s)
	}
}

func TestAuditLedgerDetectsUnsafeClaims(t *testing.T) {
	a := AuditLedger(EvidenceInput{Evidences: []map[string]interface{}{{"source": "dashboard", "tool": "vision.dashboard_snapshot", "dry_run": true, "pass_gold": true}}})
	if !a.UnsafeClaimsFound || len(a.UnsafeClaims) == 0 {
		t.Fatalf("audit must detect unsafe claims: %+v", a)
	}
}

func TestAuditConsistentDryRunNoConflict(t *testing.T) {
	a := AuditLedger(dryRunInput())
	if a.ConflictsFound {
		t.Fatalf("consistent dry-run evidence should have no conflicts: %+v", a)
	}
}

func TestExplainEvidenceWhyNotPassGold(t *testing.T) {
	e := ExplainEvidence(EvidenceInput{Tool: "vision.contract_audit", Source: "contract_registry"})
	if len(e.WhyNotPassGold) == 0 {
		t.Fatalf("explain must include why_not_pass_gold: %+v", e)
	}
}

func TestMutatingToolEvidenceIsUnsafe(t *testing.T) {
	v := ValidateEvidence(EvidenceInput{Evidences: []map[string]interface{}{{"source": "patcher", "tool": "vision.apply_patch", "status": "pass"}}})
	if len(v.UnsafeClaims) == 0 {
		t.Fatalf("mutating tool as evidence must be unsafe: %+v", v)
	}
}

func TestRequiredGatesAlwaysContainPassGoldAndPassSecure(t *testing.T) {
	for _, gates := range [][]string{BuildLedger(EvidenceInput{}).RequiredGates, ValidateEvidence(EvidenceInput{}).RequiredGates, SummarizeEvidence(EvidenceInput{}).RequiredGates, ExplainEvidence(EvidenceInput{}).RequiredGates} {
		if !has(gates, "PASS_GOLD") || !has(gates, "PASS_SECURE") {
			t.Fatalf("required gates missing PASS_GOLD/PASS_SECURE: %+v", gates)
		}
	}
}
