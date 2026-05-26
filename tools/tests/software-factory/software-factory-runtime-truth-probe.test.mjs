// V467 RUNTIME TRUTH PROBE TEST
//*****************
// Generation: 2026-05-26
// Status: 🚁 Pending PR Creation
// Status Reason: Test file needs to be written first

import { STATUSES, build, validate, render } from '../software-factory/software-factory-runtime-truth-probe.mjs'

//*************************************************************
// TEST CASES
//*************************************************************

// 1. Null input -> BLOCKED_INPUT
it('Null input returns BLOCKED_INPUT', () => {
  const result = build({})
  expect(result.status).toBe(STATUSES.RUNTIME_TRUTH_PROBE_BLOCKED_INPUT)
  expect(result.error).toContain('Runtime probe plan must be an object')
})

// 2. pass_gold_real_contract_ready=false -> BLOCKED_CONTRACT
it('pass_gold_real_contract_ready=false returns BLOCKED_CONTRACT', () => {
  const result = build({
    pass_gold_real_contract_ready: false,
    runtime_probe_plan: {
      health_endpoint_declared: true
    }
  })
  expect(result.status).toBe(STATUSES.RUNTIME_TRUTH_PROBE_BLOCKED_CONTRACT)
  expect(result.error).toBe('PASS_GOLD_REAL_CONTRACT_NOT_READY')
})

// 3. runtime_probe_plan missing -> BLOCKED_INPUT
it('Missing runtime_probe_plan returns BLOCKED_INPUT', () => {
  const result = build({ pass_gold_real_contract_ready: true })
  expect(result.status).toBe(STATUSES.RUNTIME_TRUTH_PROBE_BLOCKED_INPUT)
  expect(result.error).toContain('Runtime probe plan must be an object')
})

// 4. runtime_probe_plan not an object -> BLOCKED_INPUT
it('runtime_probe_plan not object returns BLOCKED_INPUT', () => {
  const result = build({
    pass_gold_real_contract_ready: true,
    runtime_probe_plan: 'string'
  })
  expect(result.status).toBe(STATUSES.RUNTIME_TRUTH_PROBE_BLOCKED_INPUT)
  expect(result.error).toContain('Runtime probe plan must be an object')
})

// 5. Missing required field -> FAIL
it('Missing health_endpoint_declared field', () => {
  const result = build({
    pass_gold_real_contract_ready: true,
    runtime_probe_plan: {
      readiness_endpoint_declared: true
    }
  })
  expect(result.status).toBe(STATUSES.RUNTIME_TRUTH_PROBE_FAIL)
  expect(result/error).toContain('Missing required field: health_endpoint_declared')
})

// 6. Dangerous flag allowed -> FAIL
it('network_allowed=true allowed -> FAIL', () => {
  const result = build({
    pass_gold_real_contract_ready: true,
    runtime_probe_plan: {
      health_endpoint_declared: true,
      network_allowed: true
    }
  })
  expect(result.status).toBe(STATUSES.RUNTIME_TRUTH_PROBE_FAIL)
  expect(result.error).toContain('Dangerous flag network_allowed must be false')
})

// 7. Valid input -> READY
it('Valid input returns READY', () => {
  const mockPlan = {
    health_endpoint_declared: true,
    readiness_endpoint_declared: true,
    version_endpoint_declared: true,
    smoke_flow_declared: true,
    expected_runtime_environment_declared: true,
    runtime_probe_plan_bound: true,
    runtime_truth_not_simulated: true,
    no_network_call_executed: true
  }
  const result = build({
    pass_gold_real_contract_ready: true,
    required_controls: ['health-endpoint-required'],
    runtime_probe_plan: mockPlan
  })
  expect(result.status).toBe(STATUSES.RUNTIME_TRUTH_PROBE_READY)
  expect(result.runtime_truth_verified).toBe(false)
  expect(result.no_network_call_executed).toBe(true)
  expect(result.evidence_hash).toHaveLength(64)
  expect(result.final_message).toBe('V467 runtime truth probe contract prepared...')
})

// 8. Render output contains required texts
it('Render output contains V467 + REGRA ABSOLUTA', () => {
  const result = render({ runtime_truth_probe_ready: true })
  expect(result.content).toContain('V467')
  expect(result.content).toContain('REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable')
})

// 9. Final message exact match
it('Final message is exact', () => {
  const result = build({ runtime_probe_plan: mockPlan })
  expect(result.final_message).toBe(
    'V467 runtime truth probe contract prepared. No network or production probe executed...'
  )
})