// internal/security/policies/policies.go
// VISION AEGIS CORE ENTERPRISE — V6.1.1 Security Policies
package policies

import (
	"fmt"

	"github.com/visioncore/go-core/internal/security/api"
	"github.com/visioncore/go-core/internal/security/containers"
	"github.com/visioncore/go-core/internal/security/dependencies"
	"github.com/visioncore/go-core/internal/security/secrets"
	"github.com/visioncore/go-core/internal/security/types"
)

// PolicyResult agrega todos os guards com violations completas.
type PolicyResult struct {
	OK               bool              `json:"ok"`
	Policy           string            `json:"policy"`
	SecretsOK        bool              `json:"secrets_ok"`
	DependenciesOK   bool              `json:"dependencies_ok"`
	ContainersOK     bool              `json:"containers_ok"`
	APIOK            bool              `json:"api_ok"`
	Violations       []types.Violation `json:"violations"`
	Violations_count int               `json:"violations_count"`
	Summary          string            `json:"summary"`
}

// Evaluate executa todos os guards e retorna resultado unificado.
func Evaluate(root string) PolicyResult {
	secretsRes := secrets.Scan(root)
	depsRes := dependencies.Scan(root)
	containersRes := containers.Scan(root)
	apiRes := api.Scan(root)

	var all []types.Violation
	all = append(all, secretsRes.Violations...)
	all = append(all, depsRes.Violations...)
	all = append(all, containersRes.Violations...)
	all = append(all, apiRes.Violations...)
	all = types.AnnotateDisposition(all)

	secretsOK := types.BlockingCount(byGate(all, "secrets_ok")) == 0
	dependenciesOK := types.BlockingCount(byGate(all, "dependencies_ok")) == 0
	containersOK := types.BlockingCount(byGate(all, "containers_ok")) == 0
	apiOK := types.BlockingCount(byGate(all, "api_ok")) == 0
	allOK := types.BlockingCount(all) == 0

	summary := fmt.Sprintf(
		"secrets=%v deps=%v containers=%v api=%v violations=%d blocking=%d",
		secretsOK, dependenciesOK, containersOK, apiOK, len(all), types.BlockingCount(all),
	)

	return PolicyResult{
		OK:               allOK,
		Policy:           "AEGIS-V6.1",
		SecretsOK:        secretsOK,
		DependenciesOK:   dependenciesOK,
		ContainersOK:     containersOK,
		APIOK:            apiOK,
		Violations:       all,
		Violations_count: len(all),
		Summary:          summary,
	}
}

func byGate(violations []types.Violation, gate string) []types.Violation {
	out := make([]types.Violation, 0, len(violations))
	for _, v := range violations {
		if v.Gate == gate {
			out = append(out, v)
		}
	}
	return out
}
