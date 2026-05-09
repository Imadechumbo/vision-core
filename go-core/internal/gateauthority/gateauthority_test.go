package gateauthority

import "testing"

func realGoldEvidence() GateEvidence {
	return GateEvidence{Gate: "PASS_GOLD", Status: "pass", Source: "sddf_passgold_validator", ArtifactID: "pg-123", ArtifactType: "pass_gold_report", DryRun: false, RealEvidence: true, Synthesized: false}
}

func realSecureEvidence() GateEvidence {
	return GateEvidence{Gate: "PASS_SECURE", Status: "pass", Source: "passsecure_runner", ArtifactID: "ps-123", ArtifactType: "pass_secure_report", DryRun: false, RealEvidence: true, Synthesized: false}
}

func hasString(items []string, want string) bool {
	for _, item := range items {
		if item == want {
			return true
		}
	}
	return false
}

func TestBuildAuthorityPolicyReadOnlyDryRun(t *testing.T) {
	p := BuildAuthorityPolicy()
	if p.Version != Version || !p.DryRun || !p.ReadOnly {
		t.Fatalf("policy must be V9.0 dry-run/read-only: %+v", p)
	}
	if !hasString(p.RequiredGates, "PASS_GOLD") || !hasString(p.RequiredGates, "PASS_SECURE") {
		t.Fatalf("required gates missing: %+v", p.RequiredGates)
	}
}

func TestNormalizeGateEvidenceRejectsDryRunAsRealGate(t *testing.T) {
	ev := realGoldEvidence()
	ev.DryRun = true
	got := NormalizeGateEvidence(GateAuthorityInput{Evidence: ev})
	if len(got) != 1 || got[0].UsableAsRealGate {
		t.Fatalf("dry-run evidence must not be usable as a real gate: %+v", got)
	}
}

func TestNormalizeGateEvidenceRejectsAdvisorySources(t *testing.T) {
	for _, source := range []string{"dashboard", "readiness", "evidenceledger"} {
		ev := realGoldEvidence()
		ev.Source = source
		got := NormalizeGateEvidence(GateAuthorityInput{Evidence: ev})
		if len(got) != 1 || got[0].UsableAsRealGate || got[0].AuthorizedSource {
			t.Fatalf("source %s must be rejected as real gate: %+v", source, got)
		}
	}
}

func TestNormalizeGateEvidenceAcceptsValidPassGoldReal(t *testing.T) {
	got := NormalizeGateEvidence(GateAuthorityInput{Evidence: realGoldEvidence()})
	if len(got) != 1 || !got[0].UsableAsRealGate || !got[0].AuthorizedSource {
		t.Fatalf("valid PASS_GOLD evidence should be usable: %+v", got)
	}
}

func TestDecideGateRecognizesValidPassGoldReal(t *testing.T) {
	got := DecideGate(GateAuthorityInput{Gate: "PASS_GOLD", Evidence: realGoldEvidence()})
	if got.Status != "recognized_real_gate" || !got.Recognized || !got.Valid || got.Blocked {
		t.Fatalf("expected recognized real gate: %+v", got)
	}
}

func TestDecideGateRejectsSynthesized(t *testing.T) {
	ev := realGoldEvidence()
	ev.Synthesized = true
	got := DecideGate(GateAuthorityInput{Gate: "PASS_GOLD", Evidence: ev})
	if got.Status != "rejected_synthesized_gate" || !got.Blocked || got.Valid {
		t.Fatalf("expected synthesized rejection: %+v", got)
	}
}

func TestDecideGateRejectsMissingArtifact(t *testing.T) {
	ev := realGoldEvidence()
	ev.ArtifactID = ""
	got := DecideGate(GateAuthorityInput{Gate: "PASS_GOLD", Evidence: ev})
	if got.Status != "rejected_missing_artifact" || !got.Blocked || got.Valid {
		t.Fatalf("expected missing artifact rejection: %+v", got)
	}
}

func TestDecideGateRejectsUnauthorizedSource(t *testing.T) {
	ev := realGoldEvidence()
	ev.Source = "dashboard"
	got := DecideGate(GateAuthorityInput{Gate: "PASS_GOLD", Evidence: ev})
	if got.Status != "rejected_unauthorized_source" || !got.Blocked || got.Valid {
		t.Fatalf("expected unauthorized source rejection: %+v", got)
	}
}

func TestBuildAuthoritySnapshotPartialRealGates(t *testing.T) {
	got := BuildAuthoritySnapshot(GateAuthorityInput{Evidences: []GateEvidence{realGoldEvidence()}})
	if got.AuthorityStatus != "partial_real_gates" || !got.PassGoldReal || got.PassSecureReal || !hasString(got.MissingGates, "PASS_SECURE_REAL") {
		t.Fatalf("expected partial real gates with missing PASS_SECURE_REAL: %+v", got)
	}
}

func TestBuildAuthoritySnapshotAllRealGatesStillBlocksPromotionAndDeploy(t *testing.T) {
	got := BuildAuthoritySnapshot(GateAuthorityInput{Evidences: []GateEvidence{realGoldEvidence(), realSecureEvidence()}})
	if got.AuthorityStatus != "all_real_gates_recognized" || !got.PassGoldReal || !got.PassSecureReal {
		t.Fatalf("expected all real gates recognized: %+v", got)
	}
	if got.PromotionAllowed || got.DeployAllowed || got.StatusPublishAllowed || got.MutationAllowed || got.MemoryWriteAllowed {
		t.Fatalf("recognized gates must not permit execution: %+v", got)
	}
}

func TestAuditGateAuthorityDetectsDryRunGateClaim(t *testing.T) {
	ev := realGoldEvidence()
	ev.DryRun = true
	got := AuditGateAuthority(GateAuthorityInput{Evidence: ev})
	if !got.DryRunGateClaimFound || !got.UnsafeClaimsFound {
		t.Fatalf("expected dry-run gate claim detection: %+v", got)
	}
}

func TestAuditGateAuthorityDetectsSynthesizedGateAttempt(t *testing.T) {
	ev := realGoldEvidence()
	ev.Synthesized = true
	got := AuditGateAuthority(GateAuthorityInput{Evidence: ev})
	if !got.SynthesizedGateAttemptFound || !got.UnsafeClaimsFound {
		t.Fatalf("expected synthesized gate detection: %+v", got)
	}
}

func TestAuditGateAuthorityDetectsUnauthorizedSource(t *testing.T) {
	ev := realGoldEvidence()
	ev.Source = "readiness"
	got := AuditGateAuthority(GateAuthorityInput{Evidence: ev})
	if !got.UnauthorizedGateFound || !got.UnsafeClaimsFound {
		t.Fatalf("expected unauthorized gate detection: %+v", got)
	}
}

func TestAuditGateAuthorityDetectsPromotionAllowed(t *testing.T) {
	ev := realGoldEvidence()
	ev.PromotionAllowed = true
	got := AuditGateAuthority(GateAuthorityInput{Evidence: ev})
	if !got.UnsafeClaimsFound || !hasString(got.UnsafeClaims, "promotion_allowed=true is forbidden in MCP gate authority") {
		t.Fatalf("expected promotion_allowed unsafe claim: %+v", got)
	}
}

func TestExplainGateAuthorityReturnsWhyNotPromoted(t *testing.T) {
	got := ExplainGateAuthority(GateAuthorityInput{Gate: "PASS_GOLD", Source: "dashboard"})
	if len(got.WhyNotPromoted) == 0 {
		t.Fatalf("expected why_not_promoted: %+v", got)
	}
}

func TestRequiredGatesAlwaysContainPassGoldAndPassSecure(t *testing.T) {
	checks := [][]string{
		BuildAuthorityPolicy().RequiredGates,
		DecideGate(GateAuthorityInput{Gate: "PASS_GOLD", Evidence: realGoldEvidence()}).RequiredGates,
		BuildAuthoritySnapshot(GateAuthorityInput{}).RequiredGates,
		ExplainGateAuthority(GateAuthorityInput{}).RequiredGates,
	}
	for _, gates := range checks {
		if !hasString(gates, "PASS_GOLD") || !hasString(gates, "PASS_SECURE") {
			t.Fatalf("required gates missing PASS_GOLD/PASS_SECURE: %+v", gates)
		}
	}
}
