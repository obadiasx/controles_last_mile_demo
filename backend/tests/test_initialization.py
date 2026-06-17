import pytest

from backend.app.core import initialization


class _FakeConnection:
    def __init__(self, calls):
        self._calls = calls

    async def run_sync(self, fn):
        self._calls.append(fn)


class _FakeBeginContext:
    def __init__(self, calls):
        self._calls = calls

    async def __aenter__(self):
        return _FakeConnection(self._calls)

    async def __aexit__(self, *_args):
        return None


class _FakeEngine:
    def __init__(self, calls):
        self._calls = calls

    def begin(self):
        return _FakeBeginContext(self._calls)


@pytest.mark.asyncio
async def test_create_tables_runs_for_local_and_origem(monkeypatch):
    calls = []

    monkeypatch.setattr(initialization, "local_engine", _FakeEngine(calls))
    monkeypatch.setattr(initialization, "origem_engine", _FakeEngine(calls))

    await initialization.create_tables()

    assert calls == [
        initialization.Base.metadata.create_all,
        initialization.OrigemBase.metadata.create_all,
    ]
