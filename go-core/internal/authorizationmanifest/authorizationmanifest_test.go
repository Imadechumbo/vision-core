package authorizationmanifest

import "testing"

func completeInput() AuthorizationInput {
	return AuthorizationInput{
		AuthorizationID: "authz-001", AuthorizedBy: "operator", AuthorizationSource: "local_authoritative_gate", Executor: "external_promotion_executor",
		Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "814c2e9", Target: "stable", Environment: "local", ExplicitAuthorization: true,
		Scope:             AuthorizationScope{Present: true, AllowedOperations: []string{"promote"}, ForbiddenOperations: []string{"deploy_from_mcp"}, AllowedTargets: []string{"stable"}, AllowedEnvironments: []string{"local"}, AllowedBranch: "v6-go-enterprise-runtime", AllowedCommitSHA: "814c2e9", MaxFilesChanged: 0, MaxActions: 3},
		Validity:          AuthorizationValidity{Present: true, IssuedAt: "2026-05-09T00:00:00Z", ExpiresAt: "2026-12-31T23:59:59Z", NotBefore: "2026-05-09T00:00:00Z", Timezone: "UTC", WithinWindow: true},
		Limits:            AuthorizationLimits{Present: true, MaxDurationSeconds: 900, MaxRetries: 1, RequireManualHold: true, RequireSingleExecutor: true, RequireIdempotency: true, RequireLockLease: true, RequireNoParallelExecution: true},
		Gates:             []AuthorizationGate{{Gate: "PASS_GOLD", Status: "pass", Source: "sddf_passgold_validator", ArtifactID: "pg-123", ArtifactType: "pass_gold_report", RealEvidence: true, RecognizedByAuthority: true}, {Gate: "PASS_SECURE", Status: "pass", Source: "passsecure_runner", ArtifactID: "ps-123", ArtifactType: "pass_secure_report", RealEvidence: true, RecognizedByAuthority: true}},
		RequiredArtifacts: []RequiredArtifact{{ID: "pg-123", Type: "pass_gold_report", Required: true, Present: true, Trusted: true}, {ID: "ps-123", Type: "pass_secure_report", Required: true, Present: true, Trusted: true}, {ID: "safety-001", Type: "safety_envelope", Required: true, Present: true, Trusted: true}, {ID: "contract-001", Type: "promotion_contract", Required: true, Present: true, Trusted: true}, {ID: "rehearsal-001", Type: "rehearsal_record", Required: true, Present: true, Trusted: true}},
		SafetyEnvelope:    SafetyEnvelopeReference{Present: true, EnvelopeID: "safety-001", Version: "V9.2", SafetyReadyDryRun: true, WouldAllowExternalExecutor: true, Referenced: true},
		PromotionContract: PromotionContractReference{Present: true, ContractID: "contract-001", Version: "V9.1", ExternallyEligibleDryRun: true, WouldAllowExternalExecutor: true, Referenced: true},
		Rehearsal:         RehearsalReference{Present: true, RehearsalID: "rehearsal-001", Version: "V9.3", RehearsalReadyDryRun: true, NoMutationProof: true, Referenced: true},
		Rollback:          RollbackAuthorization{Present: true, Mandatory: true, Strategy: "snapshot_restore", SnapshotRequired: true, ValidationRequired: true, ManualInterventionRequired: true},
		KillSwitch:        KillSwitchAuthorization{Present: true, Mandatory: true, Enabled: true, Trigger: "manual_or_policy", ManualOverride: true},
		Audit:             AuthorizationAudit{Present: true, AuditID: "authz-audit-001", RecordsAuthorizer: true, RecordsScope: true, RecordsGates: true, RecordsArtifacts: true, RecordsDecisions: true, RecordsExpiration: true, ImmutableTargetDeclared: true},
	}
}

func contains(items []string, want string) bool {
	for _, item := range items {
		if item == want {
			return true
		}
	}
	return false
}

func TestBuildAuthorizationBoundaryReadOnlyAndScopes(t *testing.T) {
	b := BuildAuthorizationBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly {
		t.Fatalf("boundary must be V9.4 dry-run/read-only: %+v", b)
	}
	for _, want := range []string{"read", "validate", "audit", "explain", "simulate authorization manifest"} {
		if !contains(b.MCPScope, want) {
			t.Fatalf("missing MCP scope %q", want)
		}
	}
	for _, want := range []string{"authorize_execution_inside_mcp", "promote", "deploy", "publish_status", "push", "PR", "write_memory", "call_external_executor", "acquire_real_lock", "perform_rollback", "write_manifest_file"} {
		if !contains(b.ForbiddenInsideMCP, want) {
			t.Fatalf("missing forbidden action %q", want)
		}
	}
}

func TestBuildAuthorizationManifestAlwaysBlocksMCPMutationAndPassUse(t *testing.T) {
	m := BuildAuthorizationManifest(completeInput())
	if m.PromotionAllowed || m.DeployAllowed || m.StatusPublishAllowed || m.MutationAllowed || m.MemoryWriteAllowed {
		t.Fatalf("MCP mutation flags must be false: %+v", m)
	}
	if m.UsableForPassGold || m.UsableForPassSecure {
		t.Fatalf("manifest cannot be usable for PASS gates")
	}
}

func TestValidateAuthorizationRequiredItemsAndUnsafeClaims(t *testing.T) {
	cases := []struct {
		name            string
		mutate          func(*AuthorizationInput)
		missing, unsafe string
	}{
		{"executor mcp", func(i *AuthorizationInput) { i.Executor = "mcp" }, "", "executor_mcp_not_allowed"},
		{"explicit false", func(i *AuthorizationInput) { i.ExplicitAuthorization = false }, "explicit_authorization", ""},
		{"authorized_by missing", func(i *AuthorizationInput) { i.AuthorizedBy = "" }, "authorized_by", ""},
		{"source missing", func(i *AuthorizationInput) { i.AuthorizationSource = "" }, "authorization_source", ""},
		{"identity fields missing", func(i *AuthorizationInput) {
			i.Project = ""
			i.Branch = ""
			i.CommitSHA = ""
			i.Target = ""
			i.Environment = ""
		}, "project", ""},
		{"scope missing", func(i *AuthorizationInput) { i.Scope = AuthorizationScope{} }, "scope", ""},
		{"validity missing", func(i *AuthorizationInput) { i.Validity = AuthorizationValidity{} }, "validity", ""},
		{"validity expired", func(i *AuthorizationInput) { i.Validity.Expired = true; i.Validity.WithinWindow = false }, "validity_valid", "authorization_expired"},
		{"limits missing", func(i *AuthorizationInput) { i.Limits = AuthorizationLimits{} }, "limits", ""},
		{"pass gold missing", func(i *AuthorizationInput) { i.Gates = i.Gates[1:] }, "PASS_GOLD_REAL", ""},
		{"pass secure missing", func(i *AuthorizationInput) { i.Gates = i.Gates[:1] }, "PASS_SECURE_REAL", ""},
		{"advisory gate", func(i *AuthorizationInput) {
			i.Gates[0].DryRun = true
			i.Gates[0].Synthesized = true
			i.Gates[0].Advisory = true
		}, "PASS_GOLD_REAL", "PASS_GOLD_dry_run_gate_used_as_real"},
		{"safety missing", func(i *AuthorizationInput) { i.SafetyEnvelope = SafetyEnvelopeReference{} }, "safety_envelope_reference", ""},
		{"contract missing", func(i *AuthorizationInput) { i.PromotionContract = PromotionContractReference{} }, "promotion_contract_reference", ""},
		{"rehearsal missing", func(i *AuthorizationInput) { i.Rehearsal = RehearsalReference{} }, "rehearsal_reference", ""},
		{"rollback not mandatory", func(i *AuthorizationInput) { i.Rollback.Mandatory = false }, "rollback_authorization_mandatory_valid", ""},
		{"kill switch disabled", func(i *AuthorizationInput) { i.KillSwitch.Enabled = false }, "kill_switch_authorization_enabled_valid", ""},
		{"audit missing", func(i *AuthorizationInput) { i.Audit = AuthorizationAudit{} }, "audit", ""},
		{"inside mcp flags", func(i *AuthorizationInput) {
			i.PromotionAllowed = true
			i.DeployAllowed = true
			i.StatusPublishAllowed = true
			i.MutationAllowed = true
			i.MemoryWriteAllowed = true
		}, "", "promotion_allowed_true_inside_mcp"},
		{"execution attempts", func(i *AuthorizationInput) {
			i.AttemptExternalCall = true
			i.FileWrite = true
			i.CommandExecution = true
			i.NetworkCall = true
		}, "", "attempt_external_call_true"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := completeInput()
			tc.mutate(&in)
			v := ValidateAuthorization(in)
			if v.Valid {
				t.Fatal("expected invalid")
			}
			if tc.missing != "" && !contains(v.MissingItems, tc.missing) {
				t.Fatalf("missing %q not found in %#v", tc.missing, v.MissingItems)
			}
			if tc.unsafe != "" && !contains(v.UnsafeClaims, tc.unsafe) {
				t.Fatalf("unsafe %q not found in %#v", tc.unsafe, v.UnsafeClaims)
			}
		})
	}
}

func TestCompleteManifestReadyDryRunOnly(t *testing.T) {
	m := BuildAuthorizationManifest(completeInput())
	if m.ManifestStatus != "authorization_ready_dry_run" || !m.WouldAuthorizeExternalExecutor {
		t.Fatalf("expected ready dry-run manifest: %+v", m)
	}
	if m.PromotionAllowed || m.DeployAllowed || m.StatusPublishAllowed || m.MutationAllowed || m.MemoryWriteAllowed {
		t.Fatal("ready manifest must still forbid MCP mutation")
	}
}

func TestAuditAuthorizationFindsExecutionExpirationAndPassClaim(t *testing.T) {
	in := completeInput()
	in.PromotionAllowed = true
	in.Validity.Expired = true
	in.PassGold = true
	a := AuditAuthorization(in)
	if !a.ExecutionAttemptFound || !a.ExpiredAuthorizationFound || !contains(a.UnsafeClaims, "pass_gold_claim_true") {
		t.Fatalf("audit did not detect expected issues: %+v", a)
	}
}

func TestExplainAuthorizationPassGoldExecutionAndRequiredGates(t *testing.T) {
	e := ExplainAuthorization(AuthorizationInput{})
	if len(e.WhyAuthorizationIsNotPassGold) == 0 || len(e.WhyAuthorizationIsNotExecution) == 0 {
		t.Fatalf("missing explanation: %+v", e)
	}
	if !contains(e.RequiredGates, "PASS_GOLD") || !contains(e.RequiredGates, "PASS_SECURE") {
		t.Fatalf("missing required gates: %+v", e.RequiredGates)
	}
}
