import pytest

from backend.app.services.conferencia_registro_manual import (
    validar_registro_manual_existente,
)


def test_bloqueia_registro_duplicado_sem_observacao():
    with pytest.raises(ValueError):
        validar_registro_manual_existente(True, "")


def test_permite_registro_duplicado_com_observacao():
    validar_registro_manual_existente(True, "Reenvio autorizado pela coordenação.")


def test_permite_primeiro_registro_sem_observacao():
    validar_registro_manual_existente(False, None)
