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
	OK             bool              `json:"ok"`
	Policy         string            `json:"policy"`
	SecretsOK      bool              `json:"secrets_ok"`
	DependenciesOK bool              `json:"dependencies_ok"`
	ContainersOK   bool              `json:"containers_ok"`
	APIOK          bool              `json:"api_ok"`
	Violations     []types.Violation `json:"violations"`
	Violations_count int             `json:"violations_count"`
	Summary        string            `json:"summary"`
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

	allOK := secretsRes.OK && depsRes.OK && containersRes.OK && apiRes.OK

	summary := fmt.Sprintf(
		"secrets=%v deps=%v containers=%v api=%v violations=%d",
		secretsRes.OK, depsRes.OK, containersRes.OK, apiRes.OK, len(all),
	)

	return PolicyResult{
		OK:             allOK,
		Policy:         "AEGIS-V6.1",
		SecretsOK:      secretsRes.OK,
		DependenciesOK: depsRes.OK,
		ContainersOK:   containersRes.OK,
		APIOK:          apiRes.OK,
		Violations:     all,
		Violations_count: len(all),
		Summary:        summary,
	}
}
