package github

func BuildPassGoldStatus(gates GateSnapshot) StatusRequest {
	req := StatusRequest{State: "failure", Context: DefaultStatusContext, Description: "Blocked: PASS GOLD failed"}
	if !gates.PassSecure {
		req.Description = "Blocked: PASS SECURE failed"
		return req
	}
	if gates.SecurityBlockingTotal != 0 {
		req.Description = "Blocked: security findings remain"
		return req
	}
	if gates.PassGold && gates.PassSecure && gates.SecurityBlockingTotal == 0 {
		req.State = "success"
		req.Description = "PASS GOLD + PASS SECURE confirmed"
	}
	return req
}
