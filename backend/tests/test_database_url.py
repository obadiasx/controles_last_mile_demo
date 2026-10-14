from backend.app.core.database import _build_database_url


def test_build_database_url_escapes_reserved_password_chars():
    url = _build_database_url(
        user="erp_user",
        password="p@ss:word/with#chars",
        host="postgres",
        port="5432",
        database="erp_app",
    )

    assert url.host == "postgres"
    assert url.password == "p@ss:word/with#chars"
    assert "postgres:5432" in url.render_as_string(hide_password=False)
