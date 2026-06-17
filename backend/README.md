# Distribuidora de Alimentos
API REST em Python/FastAPI para backend da Distribuidora de Alimentos.

## Execução

Como executar a partir da linha de comando:
```
cd \...\distribuidoradealimentos
.venv\Scripts\Activate.bat
python -r backend.main
```

## Testes

Na raiz do repositório (com o venv ativo):

```text
pip install -r requirements.txt -r requirements-dev.txt
pytest
```

Testes em `backend/tests/` (schemas, smoke da app FastAPI). O frontend usa Vitest: `cd frontend && npm install && npm test`.
