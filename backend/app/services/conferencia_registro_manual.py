def validar_registro_manual_existente(
    ja_existe_registro: bool,
    observacao: str | None,
) -> None:
    if ja_existe_registro and not (observacao or "").strip():
        raise ValueError(
            "Pedido já possui registro manual de envio SIDI. "
            "Informe observação para registrar novo evento."
        )
