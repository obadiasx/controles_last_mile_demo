from backend.app.services.conferencia_financeiro_auth import pode_decidir_financeiro


def test_pode_decidir_financeiro_admin_nao_depende_da_checada():
    chamado = {"count": 0}

    def checker() -> bool:
        chamado["count"] += 1
        return False

    assert pode_decidir_financeiro("administrador", checker) is True
    assert chamado["count"] == 0


def test_pode_decidir_financeiro_respeita_resultado_do_double():
    assert pode_decidir_financeiro("financeiro", lambda: True) is True
    assert pode_decidir_financeiro("conferente", lambda: False) is False
