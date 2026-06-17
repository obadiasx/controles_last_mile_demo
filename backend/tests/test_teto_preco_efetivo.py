from backend.app.services.teto_preco_produto import calcular_teto_efetivo_por_unidade


def test_prioriza_teto_da_unidade_escolhida_mesmo_com_outras_regras():
    """CX 60 / 10 kg vs KG 7 — compra em CX com teto em CX usa 60, não unifica com KG."""
    vals = {"CX": 60.0, "KG": 7.0}
    kg = {"CX": 10.0, "KG": 1.0}
    assert calcular_teto_efetivo_por_unidade("CX", vals, kg) == 60.0


def test_apenas_um_outro_teto_converte_direto_sem_max():
    """Só KG com teto; compra em CX — usa a taxa única (7/kg × 10 kg/cx = 70)."""
    vals = {"KG": 7.0}
    kg = {"CX": 10.0, "KG": 1.0}
    assert calcular_teto_efetivo_por_unidade("CX", vals, kg) == 70.0


def test_duas_ou_mais_outras_usa_maior_r_por_kg():
    vals = {"CX": 60.0, "KG": 7.0}
    kg = {"CX": 10.0, "KG": 1.0, "UN": 0.5}
    assert calcular_teto_efetivo_por_unidade("UN", vals, kg) == max(60 / 10, 7 / 1) * 0.5


def test_sem_regra_retorna_zero():
    assert calcular_teto_efetivo_por_unidade("KG", {}, {"KG": 1.0}) == 0.0


def test_um_outro_sem_fator_kg_nao_converte():
    vals = {"UN": 5.0}
    kg = {"UN": 0.0, "CX": 10.0}
    assert calcular_teto_efetivo_por_unidade("CX", vals, kg) == 0.0
