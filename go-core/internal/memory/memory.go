// Package memory provides V6.2 passive remediation learning storage.
//
// The store is intentionally local JSONL instead of SQLite so the Go runtime
// remains zero-CGO, stable on Windows, and offline-first.
package memory

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strings"
)

const (
	StoreDirName  = ".vision-memory"
	StoreFileName = "remediation_events.jsonl"
)

// RemediationEvent is the passive audit/learning record written only after a
// mission is both PASS GOLD and PASS SECURE.
type RemediationEvent struct {
	ID                  string   `json:"id"`
	Timestamp           string   `json:"timestamp"`
	MissionID           string   `json:"mission_id"`
	TransactionID       string   `json:"transaction_id"`
	SnapshotID          string   `json:"snapshot_id"`
	Engine              string   `json:"engine"`
	Version             string   `json:"version"`
	IssueType           string   `json:"issue_type"`
	ProbableRootCause   string   `json:"probable_root_cause"`
	SuggestedStrategy   string   `json:"suggested_strategy"`
	Confidence          float64  `json:"confidence"`
	Severity            string   `json:"severity"`
	SecurityScoreBefore int      `json:"security_score_before"`
	SecurityScoreAfter  int      `json:"security_score_after"`
	BlockingBefore      int      `json:"blocking_before"`
	BlockingAfter       int      `json:"blocking_after"`
	RuleIDs             []string `json:"rule_ids"`
	Files               []string `json:"files"`
	PatchedFiles        int      `json:"patched_files"`
	TotalFiles          int      `json:"total_files"`
	PassSecure          bool     `json:"pass_secure"`
	PassGold            bool     `json:"pass_gold"`
	DeployAllowed       bool     `json:"deploy_allowed"`
	PromotionAllowed    bool     `json:"promotion_allowed"`
	RollbackReady       bool     `json:"rollback_ready"`
	RollbackApplied     bool     `json:"rollback_applied"`
	Outcome             string   `json:"outcome"`
}

// EnsureStore creates the local memory directory. The JSONL file is created on
// first append so empty stores do not imply learned remediations.
func EnsureStore(root string) error {
	if strings.TrimSpace(root) == "" {
		return errors.New("memory root is required")
	}
	return os.MkdirAll(storeDir(root), 0755)
}

// AppendRemediationEvent appends exactly one JSON object line to the local
// memory store.
func AppendRemediationEvent(root string, event RemediationEvent) error {
	if err := EnsureStore(root); err != nil {
		return err
	}
	if strings.TrimSpace(event.ID) == "" {
		return errors.New("remediation event id is required")
	}
	if strings.TrimSpace(event.Outcome) == "" {
		event.Outcome = "gold"
	}

	f, err := os.OpenFile(storeFile(root), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return err
	}
	defer f.Close()

	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	if _, err := f.Write(append(payload, '\n')); err != nil {
		return err
	}
	return nil
}

// ListRemediationEvents reads every valid event from the JSONL store in append
// order. A missing store is treated as an empty memory.
func ListRemediationEvents(root string) ([]RemediationEvent, error) {
	f, err := os.Open(storeFile(root))
	if err != nil {
		if os.IsNotExist(err) {
			return []RemediationEvent{}, nil
		}
		return nil, err
	}
	defer f.Close()

	events := []RemediationEvent{}
	scanner := bufio.NewScanner(f)
	line := 0
	for scanner.Scan() {
		line++
		raw := strings.TrimSpace(scanner.Text())
		if raw == "" {
			continue
		}
		var event RemediationEvent
		if err := json.Unmarshal([]byte(raw), &event); err != nil {
			return nil, fmt.Errorf("decode remediation event line %d: %w", line, err)
		}
		events = append(events, event)
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return events, nil
}

// ShouldLearnFromMission returns true only when the mission already reached
// PASS GOLD + PASS SECURE and no rollback or security blockers remain.
//
// The argument is intentionally accepted as any to avoid an import cycle with
// internal/mission while still supporting mission.Output and compatible test
// structs with the same exported fields.
func ShouldLearnFromMission(out any) bool {
	v := reflect.ValueOf(out)
	if !v.IsValid() {
		return false
	}
	if v.Kind() == reflect.Pointer {
		if v.IsNil() {
			return false
		}
		v = v.Elem()
	}
	if v.Kind() != reflect.Struct {
		return false
	}

	return boolField(v, "PassSecure") &&
		boolField(v, "PassGold") &&
		boolField(v, "DeployAllowed") &&
		boolField(v, "PromotionAllowed") &&
		!boolField(v, "RollbackApplied") &&
		intField(v, "SecurityBlockingTotal") == 0
}

func storeDir(root string) string {
	return filepath.Join(root, StoreDirName)
}

func storeFile(root string) string {
	return filepath.Join(storeDir(root), StoreFileName)
}

func boolField(v reflect.Value, name string) bool {
	f := v.FieldByName(name)
	return f.IsValid() && f.Kind() == reflect.Bool && f.Bool()
}

func intField(v reflect.Value, name string) int64 {
	f := v.FieldByName(name)
	if !f.IsValid() {
		return -1
	}
	switch f.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return f.Int()
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return int64(f.Uint())
	default:
		return -1
	}
}
