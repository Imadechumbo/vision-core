// internal/memory/reuse.go
// VISION AEGIS CORE ENTERPRISE — V6.4 REMEDIATION MEMORY REUSE
//
// REGRA CENTRAL:
//   Memória pode SUGERIR. Memória NÃO pode DECIDIR.
//   Aegis / PASS SECURE / PASS GOLD continuam soberanos.
//
// Esta camada é advisory-only. Nada aqui pode alterar:
//   pass_secure, pass_gold, deploy_allowed, promotion_allowed,
//   severity, disposition, security_blocking_total, security_score.
package memory

import "sort"

// ─── Query types ─────────────────────────────────────────────────────────────

// RemediationQuery descreve o contexto atual da missão para busca de memória.
type RemediationQuery struct {
	IssueType         string   `json:"issue_type"`
	ProbableRootCause string   `json:"probable_root_cause"`
	SuggestedStrategy string   `json:"suggested_strategy"`
	RuleIDs           []string `json:"rule_ids"`
	Files             []string `json:"files"`
	Severity          string   `json:"severity"`
}

// RemediationMatch representa um evento de memória que fez match com a query.
type RemediationMatch struct {
	EventID          string   `json:"event_id"`
	MissionID        string   `json:"mission_id"`
	Score            float64  `json:"score"`
	MatchedRuleIDs   []string `json:"matched_rule_ids"`
	MatchedFiles     []string `json:"matched_files"`
	MatchedIssueType bool     `json:"matched_issue_type"`
	MatchedStrategy  bool     `json:"matched_strategy"`
	PatchSummary     string   `json:"patch_summary"`
	Outcome          string   `json:"outcome"`
}

// RemediationSuggestion é o resultado da consulta passiva.
// Advisory-only — NÃO altera decisões de segurança.
type RemediationSuggestion struct {
	Available         bool               `json:"available"`
	Confidence        float64            `json:"confidence"`
	BestEventID       string             `json:"best_event_id,omitempty"`
	SuggestedStrategy string             `json:"suggested_strategy,omitempty"`
	PatchSummary      string             `json:"patch_summary,omitempty"`
	Matches           []RemediationMatch `json:"matches,omitempty"`
}

// ─── Query engine ─────────────────────────────────────────────────────────────

// FindSimilarRemediations lê a memória local e retorna eventos ranqueados por
// similaridade com a query. Considera somente eventos com outcome="gold",
// pass_gold=true, pass_secure=true e rollback_applied=false.
func FindSimilarRemediations(root string, query RemediationQuery) ([]RemediationMatch, error) {
	events, err := ListRemediationEvents(root)
	if err != nil {
		return []RemediationMatch{}, nil // memória ausente = sem sugestão
	}
	return RankRemediationMatches(events, query), nil
}

// RankRemediationMatches pontua e ordena eventos por similaridade com a query.
//
// Pontuação (soma limitada a 1.0):
//   +0.35 issue_type igual
//   +0.25 suggested_strategy igual
//   +0.25 interseção proporcional de rule_ids
//   +0.10 interseção proporcional de files
//   +0.05 severity igual
func RankRemediationMatches(events []RemediationEvent, query RemediationQuery) []RemediationMatch {
	var matches []RemediationMatch
	for _, e := range events {
		if !isEligibleForSuggestion(e) {
			continue
		}
		score, match := scoreEvent(e, query)
		if score <= 0 {
			continue
		}
		match.Score = clamp(score, 0.0, 1.0)
		matches = append(matches, match)
	}
	// ordenar por score decrescente, eventID crescente (determinístico)
	sort.Slice(matches, func(i, j int) bool {
		if matches[i].Score != matches[j].Score {
			return matches[i].Score > matches[j].Score
		}
		return matches[i].EventID < matches[j].EventID
	})
	return matches
}

// BuildSuggestion constrói uma RemediationSuggestion a partir dos matches.
// Se não houver matches, retorna available=false.
// Advisory-only — não toma decisões de segurança.
func BuildSuggestion(matches []RemediationMatch) RemediationSuggestion {
	if len(matches) == 0 {
		return RemediationSuggestion{Available: false, Matches: []RemediationMatch{}}
	}
	best := matches[0]
	return RemediationSuggestion{
		Available:         true,
		Confidence:        best.Score,
		BestEventID:       best.EventID,
		SuggestedStrategy: best.PatchSummary, // patch_summary como estratégia sugerida
		PatchSummary:      best.PatchSummary,
		Matches:           matches,
	}
}

// ─── Eligibility ─────────────────────────────────────────────────────────────

// isEligibleForSuggestion valida que o evento é um aprendizado positivo válido.
// Eventos corrompidos, failed, rolled_back ou test_fixture não são elegíveis.
func isEligibleForSuggestion(e RemediationEvent) bool {
	if !e.PassGold || !e.PassSecure {
		return false
	}
	if e.RollbackApplied {
		return false
	}
	if e.Outcome != "gold" && e.Outcome != "" {
		return false
	}
	if e.ID == "" {
		return false // evento corrompido
	}
	return true
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

func scoreEvent(e RemediationEvent, q RemediationQuery) (float64, RemediationMatch) {
	var score float64
	match := RemediationMatch{
		EventID:   e.ID,
		MissionID: e.MissionID,
		Outcome:   e.Outcome,
		PatchSummary: e.PatchSummary,
	}

	// +0.35 issue_type
	if q.IssueType != "" && e.IssueType == q.IssueType {
		score += 0.35
		match.MatchedIssueType = true
	}

	// +0.25 suggested_strategy
	if q.SuggestedStrategy != "" && e.SuggestedStrategy == q.SuggestedStrategy {
		score += 0.25
		match.MatchedStrategy = true
	}

	// +0.25 rule_ids interseção proporcional
	if len(q.RuleIDs) > 0 {
		eventRules := toSet(e.RuleIDsBefore)
		if len(eventRules) == 0 {
			eventRules = toSet(e.RuleIDs) // V6.2 compat
		}
		intersect := intersection(q.RuleIDs, eventRules)
		if len(intersect) > 0 {
			ratio := float64(len(intersect)) / float64(max(len(q.RuleIDs), len(eventRules)))
			score += 0.25 * ratio
			match.MatchedRuleIDs = intersect
		}
	}

	// +0.10 files interseção proporcional
	if len(q.Files) > 0 {
		eventFiles := toSet(e.FilesBefore)
		if len(eventFiles) == 0 {
			eventFiles = toSet(e.Files) // V6.2 compat
		}
		intersect := intersection(q.Files, eventFiles)
		if len(intersect) > 0 {
			ratio := float64(len(intersect)) / float64(max(len(q.Files), len(eventFiles)))
			score += 0.10 * ratio
			match.MatchedFiles = intersect
		}
	}

	// +0.05 severity
	if q.Severity != "" && e.Severity == q.Severity {
		score += 0.05
	}

	return score, match
}

// ─── Set helpers ──────────────────────────────────────────────────────────────

func toSet(ss []string) map[string]bool {
	m := make(map[string]bool, len(ss))
	for _, s := range ss {
		if s != "" {
			m[s] = true
		}
	}
	return m
}

func intersection(slice []string, set map[string]bool) []string {
	var out []string
	seen := map[string]bool{}
	for _, s := range slice {
		if s != "" && set[s] && !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	return out
}

func clamp(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
