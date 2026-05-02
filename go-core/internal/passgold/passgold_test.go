package passgold

import "testing"

func TestEvaluate_AllOK(t *testing.T) {
	res := Evaluate(AllGatesOK())
	if !res.PassGold {
		t.Error("expected PASS GOLD with all gates OK")
	}
	if res.Status != "GOLD" {
		t.Errorf("expected status GOLD, got %s", res.Status)
	}
	if !res.PromotionAllowed {
		t.Error("expected promotion_allowed=true")
	}
	if res.Engine != Engine {
		t.Errorf("expected engine %s, got %s", Engine, res.Engine)
	}
	if res.Version != Version {
		t.Errorf("expected version %s, got %s", Version, res.Version)
	}
	if len(res.FailedGates) != 0 {
		t.Errorf("expected no failed gates, got %v", res.FailedGates)
	}
}

func TestEvaluate_OneFail(t *testing.T) {
	g := AllGatesOK()
	g.ScannerOK = false
	res := Evaluate(g)
	if res.PassGold {
		t.Error("should not PASS GOLD with scanner_ok=false")
	}
	if res.Status != "FAIL" {
		t.Errorf("expected FAIL, got %s", res.Status)
	}
	if res.PromotionAllowed {
		t.Error("promotion_allowed must be false on FAIL")
	}
	found := false
	for _, f := range res.FailedGates {
		if f == "scanner_ok" {
			found = true
		}
	}
	if !found {
		t.Error("scanner_ok should be in failed_gates")
	}
}

func TestEvaluate_RollbackFail(t *testing.T) {
	g := AllGatesOK()
	g.RollbackReady = false
	res := Evaluate(g)
	if res.PassGold {
		t.Error("should fail if rollback not ready")
	}
}

func TestEvaluate_AllFail(t *testing.T) {
	res := Evaluate(Gates{})
	if res.PassGold {
		t.Error("should fail with no gates")
	}
	if len(res.FailedGates) != 7 {
		t.Errorf("expected 7 failed gates, got %d", len(res.FailedGates))
	}
}
