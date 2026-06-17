from backend.app.schemas.conferencia import SidiNotificacaoSmtpConfigBase
from backend.app.services.conferencia_notificacao_sidi import (
    deve_disparar_email_contingencia,
    enviar_email_contingencia_sidi,
    renderizar_template_notificacao_sidi,
)


def test_template_notificacao_sidi_renderiza_dados_do_pedido():
    body = renderizar_template_notificacao_sidi(
        {
            "pedido_id": 123,
            "fornecedor_principal": "Fornecedor XPTO",
            "fase_conferencia": "ProntoParaIntegracao",
            "total_incluidos": 2,
            "total_excluidos": 1,
            "linhas": [
                {
                    "item": 1,
                    "produto": "Tomate",
                    "quantidade_esperada": 10,
                    "status_conferencia": "FinalizadoParaIntegracao",
                }
            ],
        }
    )
    assert "Pedido: 123" in body
    assert "Fornecedor XPTO" in body
    assert "Item 1: Tomate" in body


def test_gatilho_email_so_dispara_quando_pedido_pronto_e_tem_incluidos():
    assert deve_disparar_email_contingencia("ProntoParaIntegracao", 1) is True
    assert deve_disparar_email_contingencia("AguardandoDecisaoFinanceiro", 1) is False
    assert deve_disparar_email_contingencia("ProntoParaIntegracao", 0) is False


def test_schema_smtp_modo_contingencia_padrao_false():
    cfg = SidiNotificacaoSmtpConfigBase(
        host="smtp.local",
        port=587,
        username="u",
        password="p",
        remetente_email="a@b.c",
    )
    assert cfg.modo_contingencia_email_automatico is False


def test_envio_email_usa_mock_smtp_sem_disparo_real():
    class FakeSmtp:
        def __init__(self, host, port, timeout):
            self.host = host
            self.port = port
            self.timeout = timeout
            self.started_tls = False
            self.logged = False
            self.sent = False

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def starttls(self):
            self.started_tls = True

        def login(self, username, password):
            self.logged = bool(username and password)

        def send_message(self, msg):
            self.sent = msg is not None

    instances = []

    def smtp_factory(host, port, timeout):
        smtp = FakeSmtp(host, port, timeout)
        instances.append(smtp)
        return smtp

    enviar_email_contingencia_sidi(
        smtp_host="smtp.example.com",
        smtp_port=587,
        smtp_username="user",
        smtp_password="pass",
        smtp_use_tls=True,
        remetente="compras@example.com",
        destinatarios=["a@example.com"],
        assunto="Teste",
        corpo="Corpo",
        smtp_factory=smtp_factory,
    )

    assert len(instances) == 1
    assert instances[0].started_tls is True
    assert instances[0].logged is True
    assert instances[0].sent is True


def test_envio_email_porta_465_usa_ssl_implicito_sem_starttls():
    """Porta 465: SMTP_SSL (SSL implícito), não STARTTLS."""

    class FakeSmtpSsl:
        def __init__(self, host, port, timeout):
            self.host = host
            self.port = port
            self.timeout = timeout
            self.started_tls = False
            self.logged = False
            self.sent = False

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def starttls(self):
            self.started_tls = True

        def login(self, username, password):
            self.logged = bool(username and password)

        def send_message(self, msg):
            self.sent = msg is not None

    instances = []

    def smtp_ssl_factory(host, port, timeout):
        smtp = FakeSmtpSsl(host, port, timeout)
        instances.append(smtp)
        return smtp

    enviar_email_contingencia_sidi(
        smtp_host="server9110.cloud.srv.br",
        smtp_port=465,
        smtp_username="user",
        smtp_password="pass",
        smtp_use_tls=True,
        remetente="compras@example.com",
        destinatarios=["a@example.com"],
        assunto="Teste",
        corpo="Corpo",
        smtp_ssl_factory=smtp_ssl_factory,
    )

    assert len(instances) == 1
    assert instances[0].port == 465
    assert instances[0].started_tls is False
    assert instances[0].logged is True
    assert instances[0].sent is True
