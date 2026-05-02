// internal/passgold/passgold.go
// Vision Core Go Safe Core — PASS GOLD
// Decisão final. GOLD só se TODOS os gates forem true.
package passgold

// Gates é o conjunto de gates necessários.
type Gates struct {
	ScannerOK     bool `json:"scanner_ok"`
	FileopsOK     bool `json:"fileops_ok"`
	PatcherOK     bool `json:"patcher_ok"`
	ValidatorOK   bool `json:"validator_ok"`
	RollbackReady bool `json:"rollback_ready"`
	SecurityOK    bool `json:"security_ok"`
	LegacySafe    bool `json:"legacy_safe"`
}

// Result é o resultado final do PASS GOLD.
type Result struct {
	Status           string   `json:"status"` // "GOLD" | "FAIL"
	PassGold         bool     `json:"pass_gold"`
	PromotionAllowed bool     `json:"promotion_allowed"`
	RollbackReady    bool     `json:"rollback_ready"`
	Engine           string   `json:"engine"`
	Version          string   `json:"version"`
	Gates            Gates    `json:"gates"`
	FailedGates      []string `json:"failed_gates,omitempty"`
}

const (
	Engine  = "go-safe-core"
	Version = "5.6.0-go-safe-core"
)

// Evaluate computa o PASS GOLD dado os gates.
func Evaluate(g Gates) Result {
	res := Result{
		Engine:        Engine,
		Version:       Version,
		Gates:         g,
		RollbackReady: g.RollbackReady,
	}

	// Coletar gates que falharam
	checks := map[string]bool{
		"scanner_ok":     g.ScannerOK,
		"fileops_ok":     g.FileopsOK,
		"patcher_ok":     g.PatcherOK,
		"validator_ok":   g.ValidatorOK,
		"rollback_ready": g.RollbackReady,
		"security_ok":    g.SecurityOK,
		"legacy_safe":    g.LegacySafe,
	}

	// Ordem determinística
	order := []string{
		"scanner_ok", "fileops_ok", "patcher_ok",
		"validator_ok", "rollback_ready", "security_ok", "legacy_safe",
	}

	for _, name := range order {
		if !checks[name] {
			res.FailedGates = append(res.FailedGates, name)
		}
	}

	if len(res.FailedGates) == 0 {
		res.Status = "GOLD"
		res.PassGold = true
		res.PromotionAllowed = true
	} else {
		res.Status = "FAIL"
		res.PassGold = false
		res.PromotionAllowed = false
	}

	return res
}

// AllGatesOK retorna um Gates com todos os campos true.
// Útil para testes e self-test.
func AllGatesOK() Gates {
	return Gates{
		ScannerOK:     true,
		FileopsOK:     true,
		PatcherOK:     true,
		ValidatorOK:   true,
		RollbackReady: true,
		SecurityOK:    true,
		LegacySafe:    true,
	}
}
