// internal/passsecure/passsecure.go
// VISION AEGIS CORE ENTERPRISE — V6.1.1 PASS SECURE
// Gate de segurança enterprise. Inclui violations detalhadas para remediation.
package passsecure

import (
	"fmt"

	"github.com/visioncore/go-core/internal/security/policies"
	"github.com/visioncore/go-core/internal/security/types"
)

const (
	Engine  = "aegis-secure-core"
	Version = "6.1.1-aegis"
)

// SecureGates — gates individuais de segurança.
type SecureGates struct {
	SecretsOK      bool `json:"secrets_ok"`
	DependenciesOK bool `json:"dependencies_ok"`
	ContainersOK   bool `json:"containers_ok"`
	APIOK          bool `json:"api_ok"`
	PoliciesOK     bool `json:"policies_ok"`
}

// Result é o output completo do PASS SECURE com violations acionáveis.
type Result struct {
	PassSecure          bool                   `json:"pass_secure"`
	DeployAllowed       bool                   `json:"deploy_allowed"`
	SecurityScore       int                    `json:"security_score"`
	Engine              string                 `json:"engine"`
	Version             string                 `json:"version"`
	Gates               SecureGates            `json:"gates"`
	FailedGates         []string               `json:"failed_gates,omitempty"`
	Status              string                 `json:"status"` // "SECURE" | "FAIL"
	PolicySummary       string                 `json:"policy_summary"`
	Violations          int                    `json:"violations"` // retrocompat count
	BlockingTotal       int                    `json:"security_blocking_total"`
	ReportOnlyTotal     int                    `json:"security_report_only_total"`
	FalsePositiveCount  int                    `json:"security_false_positive_count"`
	RequiresReviewCount int                    `json:"security_requires_review_count"`
	NoiseCount          int                    `json:"security_noise_count"`
	Summary_            types.ViolationSummary `json:"violation_summary"`
}

// Evaluate executa o PASS SECURE para o root fornecido.
func Evaluate(root string) Result {
	policy := policies.Evaluate(root)
	violations := types.AnnotateDisposition(policy.Violations)
	vs := types.Build(violations)
	blockingTotal := types.BlockingCount(violations)

	gates := SecureGates{
		SecretsOK:      policy.SecretsOK,
		DependenciesOK: policy.DependenciesOK,
		ContainersOK:   policy.ContainersOK,
		APIOK:          policy.APIOK,
		PoliciesOK:     policy.OK,
	}

	type check struct {
		name string
		ok   bool
	}
	checks := []check{
		{"secrets_ok", gates.SecretsOK},
		{"dependencies_ok", gates.DependenciesOK},
		{"containers_ok", gates.ContainersOK},
		{"api_ok", gates.APIOK},
		{"policies_ok", gates.PoliciesOK},
	}

	var failedGates []string
	for _, c := range checks {
		if !c.ok {
			failedGates = append(failedGates, c.name)
		}
	}

	// Score: 100 - 20 por gate falhado
	score := 100 - (len(failedGates) * 20)
	if score < 0 {
		score = 0
	}

	// PASS SECURE falha somente se houver blocker real.
	passSecure := len(failedGates) == 0 && blockingTotal == 0
	status := "SECURE"
	if !passSecure {
		status = "FAIL"
	}

	return Result{
		PassSecure:          passSecure,
		DeployAllowed:       passSecure,
		SecurityScore:       score,
		Engine:              Engine,
		Version:             Version,
		Gates:               gates,
		FailedGates:         failedGates,
		Status:              status,
		PolicySummary:       policy.Summary,
		Violations:          vs.TotalCount,
		BlockingTotal:       blockingTotal,
		ReportOnlyTotal:     types.ReportOnlyCount(violations),
		FalsePositiveCount:  types.FalsePositiveCount(violations),
		RequiresReviewCount: types.RequiresReviewCount(violations),
		NoiseCount:          types.NoiseCount(violations),
		Summary_:            vs,
	}
}

func (r Result) Summary() string {
	if r.PassSecure {
		return fmt.Sprintf("PASS SECURE — score=%d deploy_allowed=true [%s]", r.SecurityScore, r.Version)
	}
	return fmt.Sprintf("PASS SECURE FAIL — score=%d failed_gates=%v violations=%d critical=%d high=%d",
		r.SecurityScore, r.FailedGates, r.Violations,
		r.Summary_.CriticalCount, r.Summary_.HighCount)
}

// AnnotateViolations aplica source_context e disposition a cada violation.
// Exposto como helper público para uso em mission.go sem import cycle.
func AnnotateViolations(violations []types.Violation) []types.Violation {
	return types.AnnotateDisposition(violations)
}
