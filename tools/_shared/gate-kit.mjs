#!/usr/bin/env node
/**
 * Gate Kit — shared scaffolding for tools/*.mjs release-gate/ledger modules.
 *
 * Extracted from the ~30 near-identical modules under tools/ (manual-release-*,
 * unlock-*, real-release-*, supervised-release-*, release-rehearsal-*, etc).
 * Each of those modules repeated the same four pieces of ceremony: a `_locked()`
 * helper returning fixed-false flags, a `_sha256()` helper, hand-rolled hash-chain
 * append/verify logic, and an identical CLI-entry block.
 *
 * The actual business logic (which fields each module checks, in what order, with
 * what blocking reasons) stays local to each module — that logic differs per module
 * and is not safe to collapse into a generic rule table without losing readability.
 * Only the repeated mechanics move here.
 */

import { createHash } from 'crypto';

export function sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

/** Returns an object with every field in `fields` set to `false`. */
export function makeLockedFlags(fields) {
  const out = {};
  for (const f of fields) out[f] = false;
  return out;
}

/**
 * In-memory, append-only hash-chained ledger. Caller supplies the full event body
 * (module-specific field names, no chain_hash/prev_hash) — the ledger adds
 * `prev_hash`, computes `chain_hash` over `prev_hash + JSON.stringify(body+prev_hash)`,
 * and stores the entry. `verify()` walks the chain and recomputes each hash the same
 * way, so any module-specific field shape works as long as the same shape is passed
 * to `append()` every time.
 */
export class HashChainLedger {
  static GENESIS_HASH = '0'.repeat(64);
  #entries = [];

  reset() {
    this.#entries = [];
  }

  get size() {
    return this.#entries.length;
  }

  lastHash() {
    return this.#entries.length === 0
      ? HashChainLedger.GENESIS_HASH
      : this.#entries[this.#entries.length - 1].chain_hash;
  }

  append(body) {
    const prev_hash = this.lastHash();
    const withPrev = { ...body, prev_hash };
    const chain_hash = sha256(`${prev_hash}:${JSON.stringify(withPrev)}`);
    const entry = { ...withPrev, chain_hash };
    this.#entries.push(entry);
    return entry;
  }

  verify() {
    let prev = HashChainLedger.GENESIS_HASH;
    for (let i = 0; i < this.#entries.length; i++) {
      const { chain_hash, ...body } = this.#entries[i];
      const expected = sha256(`${prev}:${JSON.stringify(body)}`);
      if (chain_hash !== expected) {
        return { valid: false, entries: this.#entries.length, tampered_at_index: i };
      }
      prev = chain_hash;
    }
    return { valid: true, entries: this.#entries.length, tampered_at_index: null };
  }

  read() {
    return [...this.#entries];
  }
}

/**
 * Runs a module's `--json`/plain CLI entry. Call as the last line of a module,
 * guarded the same way the old inline blocks were:
 *   runGateCli({ argv: process.argv, moduleFilename: 'foo.mjs', fn, readyField: 'foo_ready', renderLines });
 */
export function runGateCli({ argv, moduleFilename, fn, readyField, renderLines, fixtureFlags = ['--fixture-mode', '--fixture'] }) {
  if (!(argv[1] && argv[1].endsWith(moduleFilename))) return;
  const args = argv.slice(2);
  const json = args.includes('--json');
  const fixture = fixtureFlags.some(f => args.includes(f));
  const result = fn({ fixture_mode: fixture });
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderLines(result).join('\n'));
  }
  process.exit(result[readyField] ? 0 : 1);
}
