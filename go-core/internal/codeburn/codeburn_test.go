package codeburn_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/visioncore/go-core/internal/codeburn"
)

func TestEstimateLocalOfflineCostsZero(t *testing.T) {
	r := codeburn.Estimate(codeburn.EstimateInput{
		Operation: "patch", Provider: "local", Model: "offline",
		EstimatedTokensIn: 1000, EstimatedTokensOut: 500,
		MaxFiles: 10, MaxCommands: 10, MaxTokens: 100000,
		MaxRuntimeSeconds: 600, MaxEstimatedCostUSD: 1,
	})
	if !r.DryRun || !r.ReadOnly || r.Version != codeburn.Version {
		t.Fatalf("must be dry-run/read-only V8.3: %+v", r)
	}
	if r.EstimatedCostUSD != 0 {
		t.Fatalf("local/offline cost must be zero, got %v", r.EstimatedCostUSD)
	}
}

func TestPolicyCheckUnknownProviderBlocks(t *testing.T) {
	r := codeburn.PolicyCheck(codeburn.EstimateInput{Provider: "mystery", Model: "offline", RequireKnownProvider: true})
	if !r.Blocked {
		t.Fatalf("unknown provider must be blocked: %+v", r)
	}
	if !contains(r.BlockedReasons, "unknown provider") {
		t.Fatalf("expected unknown provider reason, got %#v", r.BlockedReasons)
	}
}

func TestDeployBlockedByDefault(t *testing.T) {
	r := codeburn.Estimate(codeburn.EstimateInput{Operation: "deploy", Provider: "local", Model: "offline"})
	if !r.Blocked || !contains(r.BlockedReasons, "deploy is blocked by default") {
		t.Fatalf("deploy must be blocked by default: %+v", r)
	}
}

func TestEnvAndTraversalBlockCritical(t *testing.T) {
	for _, files := range [][]string{{".env"}, {"../secret.txt"}} {
		r := codeburn.PolicyCheck(codeburn.EstimateInput{Files: files, Provider: "local", Model: "offline"})
		if !r.Blocked || r.RiskLevel != codeburn.RiskCritical {
			t.Fatalf("%v must block as critical: %+v", files, r)
		}
	}
}

func TestLimitsBlock(t *testing.T) {
	r := codeburn.Estimate(codeburn.EstimateInput{
		Provider: "openai", Model: "priced", Files: []string{"a.go", "b.go"}, Commands: []string{"go test", "go build"},
		EstimatedTokensIn: 1000, EstimatedTokensOut: 1000, EstimatedRuntimeSeconds: 20,
		MaxFiles: 1, MaxCommands: 1, MaxTokens: 100, MaxRuntimeSeconds: 1, MaxEstimatedCostUSD: 0.001,
	})
	if !r.Blocked {
		t.Fatalf("limits must block: %+v", r)
	}
	joined := strings.Join(r.BlockedReasons, "\n")
	for _, want := range []string{"file count", "command count", "estimated tokens", "estimated runtime", "estimated cost"} {
		if !strings.Contains(joined, want) {
			t.Fatalf("missing %q in reasons: %s", want, joined)
		}
	}
}

func TestBudgetPlanRecommendsCheapSafePath(t *testing.T) {
	r := codeburn.BudgetPlan(codeburn.BudgetPlanInput{MissionInput: "Corrigir CORS", BudgetUSD: 0.25, PreferredProvider: "unknown", MaxSteps: 5})
	if !r.DryRun || !r.ReadOnly || r.RecommendedProvider != "local" || r.RecommendedModel != "offline" || r.EstimatedCostUSD != 0 {
		t.Fatalf("budget plan must choose local/offline zero-cost path: %+v", r)
	}
	if len(r.Steps) == 0 || len(r.Steps) > 5 {
		t.Fatalf("expected bounded steps, got %#v", r.Steps)
	}
}

func TestExplainReturnsSummaryAndSafePath(t *testing.T) {
	r := codeburn.Explain(codeburn.ExplainInput{Estimate: codeburn.EstimateResult{Blocked: true, RiskLevel: codeburn.RiskHigh, BlockedReasons: []string{"cost exceeds limit"}}})
	if !r.DryRun || !r.ReadOnly || r.Version != codeburn.Version {
		t.Fatalf("explain must be dry-run/read-only V8.3: %+v", r)
	}
	if !r.Blocked || r.Summary == "" || len(r.SafePath) == 0 || !contains(r.Reasons, "cost exceeds limit") {
		b, _ := json.Marshal(r)
		t.Fatalf("explain must include summary, reasons, safe path: %s", b)
	}
}

func contains(items []string, needle string) bool {
	for _, item := range items {
		if strings.Contains(item, needle) {
			return true
		}
	}
	return false
}
