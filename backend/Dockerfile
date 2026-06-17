# Imagem base leve (Python 3.12 slim)
FROM python:3.12-slim

# Evita buffering de saída no Python
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Instala dependências do sistema (necessárias para asyncpg/psycopg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código da aplicação (contexto de build = raiz do projeto)
COPY backend/ ./backend/

# Expõe a porta do FastAPI
EXPOSE 8000

# Comando de inicialização (executado a partir da raiz do projeto)
CMD ["python", "-m", "backend.main"]
