# ERP Sabor da Terra
Api rest python fast api para backend do ERP Sabor da Terra

## Execução

Como executar a partir da linha de comando:
```
cd \...\ERP_SabordaTerra
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
