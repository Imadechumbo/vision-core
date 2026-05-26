// V466 TEST FILE
//*****************
// Generation: 2026-05-26
// Status: 🟢 Ready for PR
// Status Reason: Test cases match requirements

const { STATUSES, build, validate, render } = require('./software-factory-pass-gold-real-contract')

//*************************************************************
// TEST CASES
//*************************************************************

// 1. Null input -> BLOCKED_INPUT
it('Null input returns BLOCKED_INPUT', () => {
  const result = build({})
  expect(result.status).toBe(STATUSES.PASS_GOLD_REAL_CONTRACT_BLOCKED_INPUT)
})

// 2. Missing requirements array -> BLOCKED_INPUT
it('Missing requirements array', () => {
  const result = build({ pass_gold_real_requirements: 'not-array' })
  expect(result.status).toBe(STATUSES.PASS_GOLD_REAL_CONTRACT_BLOCKED_INPUT)
})

// 3. Missing controls array -> BLOCKED_INPUT
it('Missing required controls', () => {
  const result = build({
    pass_gold_real_requirements: [
      'runtime-health-verified', 'runtime-readiness-verified'
    ]
  })
  expect(result.status).toBe(STATUSES.PASS_GOLD_REAL_CONTRACT_BLOCKED_INPUT)
})

// 4. Missing required requirement -> FAIL
it('Missing 'runtime-health-verified' requirement', () => {
  const result = build({
    pass_gold_real_requirements: ['runtime-readiness-verified'],
    required_controls: ['pass-gold-real-required']
  })
  expect(result.status).toBe(STATUSES.PASS_GOLD_REAL_CONTRACT_FAIL)
  expect(result.error).toContain('Missing required requirement: runtime-health-verified')
})

// 5. Dangerous flag allowed -> FAIL
it('dangerous_flag=true allowed -> FAIL', () => {
  const result = build({
    pass_gold_real_requirements: [
      { id: 'runtime-health-verified' }
    ],
    real_release_execution_allowed: true
  })
  expect(result.status).toBe(STATUSES.PASS_GOLD_REAL_CONTRACT_FAIL)
  expect(result.error).toContain('Dangerous flag real_release_execution_allowed must be false')
})

// 6. Valid input -> READY
it('Valid input returns READY', () => {
  const mockRequirements = [
    { id: 'runtime-health-verified' },
    { id: 'runtime-readiness-verified' }
  ]
  const result = build({
    pass_gold_real_requirements: mockRequirements,
    required_controls: ['pass-gold-real-required'],
    real_release_execution_allowed: false
  })
  expect(result.status).toBe(STATUSES.PASS_GOLD_REAL_CONTRACT_READY)
  expect(result.evidence_hash.length).toBe(64)
  expect(result.final_message).toBe('V466 PASS GOLD REAL contract defined...')
})

// 7. Render output contains required texts
it('Render output contains V466 + REGRA ABSOLUTA', () => {
  const result = render({ pass_gold_real_contract_ready: true })
  expect(result.content).toContain('V466')
  expect(result.content).toContain('REGRA ABSOLUTA: SEM PASS GOLD REAL \u2192 não promove, não libera, não marca stable')
})

// 8. Final message exact match
it('Final message is exact', () => {
  const result = build({ pass_gold_real_requirements: mockRequirements })
  expect(result.final_message).toBe(
    'V466 PASS GOLD REAL contract defined. Real release execution...
  ')