from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Callable

from backend.app.domain.conferencia_fase import FaseConferenciaPedido


def deve_disparar_email_contingencia(fase_conferencia: str, total_incluidos: int) -> bool:
    return (
        fase_conferencia == FaseConferenciaPedido.PRONTO_PARA_INTEGRACAO.value
        and total_incluidos > 0
    )


def renderizar_template_notificacao_sidi(payload: dict) -> str:
    linhas = payload.get("linhas", [])
    linhas_txt = "\n".join(
        f"- Item {l['item']}: {l['produto']} | Qtd esperada: {l['quantidade_esperada']} | Status: {l['status_conferencia']}"
        for l in linhas
    )
    return (
        "Pedido pronto para lançamento manual no SIDI\n\n"
        f"Pedido: {payload['pedido_id']}\n"
        f"Fornecedor: {payload.get('fornecedor_principal') or 'N/A'}\n"
        f"Fase: {payload['fase_conferencia']}\n"
        f"Itens incluídos neste envio: {payload['total_incluidos']}\n"
        f"Itens excluídos neste envio: {payload['total_excluidos']}\n\n"
        "Detalhes das linhas:\n"
        f"{linhas_txt}\n"
    )


def enviar_email_contingencia_sidi(
    *,
    smtp_host: str,
    smtp_port: int,
    smtp_username: str,
    smtp_password: str,
    smtp_use_tls: bool,
    remetente: str,
    destinatarios: list[str],
    assunto: str,
    corpo: str,
    smtp_factory: Callable[..., smtplib.SMTP] | None = None,
    smtp_ssl_factory: Callable[..., smtplib.SMTP_SSL] | None = None,
) -> None:
    """Envia e-mail via SMTP.

    - Porta **465**: SSL implícito (`SMTP_SSL`), comum em provedores que exigem saída segura.
    - Outras portas (ex.: **587**): `SMTP` + STARTTLS quando `smtp_use_tls` é verdadeiro.
    """
    if not destinatarios:
        raise ValueError("Nenhum destinatário ativo configurado para notificação SIDI.")
    msg = EmailMessage()
    msg["From"] = remetente
    msg["To"] = ", ".join(destinatarios)
    msg["Subject"] = assunto
    msg.set_content(corpo)

    if smtp_port == 465:
        ssl_factory = smtp_ssl_factory or smtplib.SMTP_SSL
        with ssl_factory(smtp_host, smtp_port, timeout=20) as smtp:
            smtp.login(smtp_username, smtp_password)
            smtp.send_message(msg)
        return

    factory = smtp_factory or smtplib.SMTP
    with factory(smtp_host, smtp_port, timeout=20) as smtp:
        if smtp_use_tls:
            smtp.starttls()
        smtp.login(smtp_username, smtp_password)
        smtp.send_message(msg)
