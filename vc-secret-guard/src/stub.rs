//! Fase 1 escopo: SOMENTE `scan` está implementado (spec §10, Fase 1).
//! `watch`, `install-hooks`, `report` e `policy` são stubs deliberados que
//! nunca fingem sucesso — imprimem que são planejados para uma fase futura e
//! saem com código 2 (erro de execução), nunca 0.

pub fn stub(command: &str, phase_note: &str) -> i32 {
    eprintln!(
        "vc-secret-guard {command}: planejado — {phase_note}. Não implementado ainda \
         (ver docs/VC_SECRET_GUARD_RUST_SPEC.md §10)."
    );
    2
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stub_always_returns_exit_code_two_never_zero_or_one() {
        assert_eq!(stub("watch", "fase 3"), 2);
        assert_eq!(stub("install-hooks", "fase 2"), 2);
        assert_eq!(stub("report", "fase 3"), 2);
        assert_eq!(stub("policy", "fase 1 (subcomandos)"), 2);
    }
}
