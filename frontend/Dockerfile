# Estágio 1: Build da aplicação
FROM node:20-alpine AS builder

WORKDIR /app

# Copia arquivos de dependências
COPY frontend/package*.json ./

# Instala dependências
RUN npm ci

# Copia o código fonte
COPY frontend/ .

# Variável para API base URL (usada pelo proxy reverso)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build da aplicação
RUN npm run build

# Estágio 2: Servir com Nginx
FROM nginx:alpine

# Remove configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia configuração customizada
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos do build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
