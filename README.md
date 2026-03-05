# 📉 Price Monitor — Monitoramento de Preços e Disponibilidade

Um sistema pronto para produção que rastreia preços de produtos de e-commerce e notifica os usuários por e-mail e WhatsApp quando os preços caem para o valor desejado.

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                          Docker Compose                         │
│                                                                 │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Frontend │    │   FastAPI    │    │  PostgreSQL (db)      │  │
│  │  React   │───▶│  Backend     │───▶│  (produtos, preços,  │  │
│  │  Nginx   │    │  :8020       │    │   usuários, alertas) │  │
│  │  :3010   │    └──────┬───────┘    └──────────────────────┘  │
│  └──────────┘           │                                       │
│                         ▼                                       │
│                  ┌──────────────┐    ┌──────────────────────┐  │
│                  │    Redis     │    │   Celery Worker      │  │
│                  │  (broker +   │◀──▶│  (price checks,      │  │
│                  │   results)   │    │   notifications)     │  │
│                  │  :6379       │    └──────────────────────┘  │
│                  └──────────────┘    ┌──────────────────────┐  │
│                                      │   Celery Beat        │  │
│                                      │  (scheduler — 1min)  │  │
│                                      └──────────────────────┘  │
│                                      ┌──────────────────────┐  │
│                                      │   Flower             │  │
│                                      │  (task monitor :5555)│  │
│                                      └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Estrutura do Projeto

```
price_app/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              # JWT auth dependency
│   │   │   └── v1/
│   │   │       ├── auth.py          # Register / Login endpoints
│   │   │       ├── users.py         # User profile endpoints
│   │   │       ├── products.py      # Product CRUD + search
│   │   │       ├── price_history.py # Price history endpoint
│   │   │       └── alerts.py        # Alert log endpoint
│   │   ├── core/
│   │   │   ├── logging.py           # Structured logging setup
│   │   │   └── security.py          # JWT + bcrypt helpers
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── product.py
│   │   │   ├── price_history.py
│   │   │   └── alert.py
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── scraper.py           # Polite HTTP scraper + MercadoLivre API
│   │   │   └── notification.py      # Email (SMTP/SendGrid) + WhatsApp (Twilio/Z-API)
│   │   ├── workers/
│   │   │   ├── celery_app.py        # Celery app + beat schedule
│   │   │   └── tasks.py             # Price check tasks
│   │   ├── config.py                # Pydantic-settings configuration
│   │   ├── database.py              # Async SQLAlchemy engine
│   │   └── main.py                  # FastAPI app + lifespan
│   ├── alembic/                     # Database migrations
│   │   ├── env.py
│   │   └── versions/
│   │       └── 0001_initial.py
│   ├── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/client.js            # Axios client + interceptors
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── PriceChart.jsx       # Recharts line chart
│   │   │   └── AddProductModal.jsx  # Search + add product flow
│   │   ├── context/AuthContext.jsx  # JWT auth state
│   │   └── pages/
│   │       ├── Dashboard.jsx        # Main monitoring panel
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── ProductDetail.jsx    # Chart + alert history
│   │       ├── AlertsPage.jsx
│   │       └── ProfilePage.jsx
│   ├── nginx.conf                   # Nginx with /api proxy + SPA fallback
│   ├── Dockerfile                   # Multi-stage: Vite build → Nginx
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
├── .env.example
├── .env                             # (not committed — your local copy)
└── README.md
```

---

## 🚀 Início Rápido

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+

### 1. Clonar e configurar variáveis de ambiente

```bash
git clone https://github.com/john-lenes/price_app.git
cd price_app

# Criar arquivo .env a partir do exemplo
cp .env.example .env
```

Edite o `.env` e preencha suas credenciais (e-mail, WhatsApp, etc.).

> ⚠️ **Importante:** Altere `SECRET_KEY` para um valor aleatório longo antes de qualquer deploy.

### 2. Subir todos os serviços

```bash
docker compose up --build -d
```

Aguarde alguns segundos enquanto os containers inicializam. O backend executa as migrações do Alembic automaticamente na primeira subida.

### 3. Acessar a aplicação

| Serviço | URL |
|---|---|
| **Frontend (React)** | http://localhost:3010 |
| **API (FastAPI)** | http://localhost:8020 |
| **Swagger UI** | http://localhost:8020/docs |
| **Redoc** | http://localhost:8020/redoc |
| **Flower (Celery)** | http://localhost:5555 |

### 4. Criar seu primeiro usuário

Acesse http://localhost:3010, clique em **Criar conta** e preencha seus dados.

> 💡 **Usuário de teste disponível:**
> - **E-mail:** `teste@teste.com`
> - **Senha:** `Teste@123`

---

## ⚙️ Configuração de Notificações

### E-mail via Gmail (SMTP)

1. Ative a [verificação em dois fatores](https://myaccount.google.com/security) no Gmail.
2. Gere uma [senha de app](https://myaccount.google.com/apppasswords).
3. No `.env`:
   ```env
   SMTP_USER=seu@gmail.com
   SMTP_PASSWORD=sua_senha_de_app
   EMAILS_FROM_EMAIL=seu@gmail.com
   ```

### WhatsApp via Twilio

1. Crie uma conta em [twilio.com](https://www.twilio.com/).
2. Ative o [WhatsApp Sandbox](https://www.twilio.com/console/sms/whatsapp/sandbox).
3. No `.env`:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```
4. Os usuários devem ativar o número WhatsApp no perfil e ativar "Alertas por WhatsApp".

### WhatsApp via Z-API (alternativa)

1. Configure seu plano em [z-api.io](https://z-api.io/).
2. No `.env`:
   ```env
   USE_ZAPI=true
   ZAPI_INSTANCE_ID=seu_instance_id
   ZAPI_TOKEN=seu_token
   ZAPI_CLIENT_TOKEN=seu_client_token
   ```

---

## 🔧 Comandos Úteis

```bash
# Ver logs de todos os serviços
docker compose logs -f

# Ver logs apenas do backend
docker compose logs -f backend

# Ver logs do worker Celery
docker compose logs -f celery-worker

# Executar migrações manualmente
docker compose exec backend alembic upgrade head

# Gerar nova migração após alterar models
docker compose exec backend alembic revision --autogenerate -m "describe change"

# Acessar o banco de dados (psql)
docker compose exec db psql -U price_user -d price_monitor

# Reiniciar apenas o backend
docker compose restart backend

# Derrubar tudo (mantém volumes)
docker compose down

# Derrubar tudo e apagar dados (⚠️ CUIDADO)
docker compose down -v
```

---

## 🔄 Fluxo de Verificação de Preços

```
Celery Beat (1 min)
    │
    ▼
dispatch_due_product_checks()
    │ Para cada produto ativo com next_check ≤ agora:
    ▼
check_product_price(product_id)   ◀── Celery Worker
    │
    ├── scrape_product_price(url)  ── HTTP polido + BeautifulSoup + JSON-LD
    │
    ├── Salva PriceHistory
    │
    ├── Atualiza Product (current_price, lowest, highest, last_checked_at)
    │
    └── Se price ≤ target_price AND NOT alert_sent:
            ├── send_email_alert()      (SMTP ou SendGrid)
            ├── send_whatsapp_alert()   (Twilio ou Z-API)
            ├── Salva Alert record
            └── product.alert_sent = True  ← deduplicação
```

**Deduplicação:** O flag `alert_sent` garante que o usuário receba no máximo 1 alerta por ciclo de queda. Ele é resetado automaticamente quando o preço sobe acima do alvo novamente ou quando o usuário muda o preço alvo.

---

## 🛡️ Scraping Responsável

O scraper foi projetado para ser respeitoso:

- **Atraso aleatório** de 2 a 5 segundos entre requisições (configurável via `REQUEST_DELAY_MIN/MAX`)
- **User-Agent** de navegador real para identificação adequada
- **Exponential backoff** em erros 429/503
- **Preferência por APIs oficiais** — a busca de produtos usa a API pública do Mercado Livre (sem scraping)
- **Rate limit** embutido no Celery worker (`--concurrency=4`)

---

## 🗄️ Banco de Dados

### Migrações com Alembic

```bash
# Aplicar todas as migrações pendentes
docker compose exec backend alembic upgrade head

# Ver histórico de migrações
docker compose exec backend alembic history

# Reverter 1 migração
docker compose exec backend alembic downgrade -1
```

### Schema resumido

| Tabela | Descrição |
|---|---|
| `users` | Usuários com preferências de notificação |
| `products` | Produtos monitorados com preço alvo |
| `price_history` | Histórico de preços por produto |
| `alerts` | Log de alertas enviados |

---

## 📊 Monitoramento da Fila (Flower)

Acesse http://localhost:5555 para visualizar:
- Tasks em execução / pendentes / falhas
- Workers ativos
- Histórico de tarefas
- Estatísticas de throughput

---

## 🔒 Segurança

- Senhas armazenadas com **bcrypt 4.0.1 + passlib 1.7.4** (custo 12)
- Autenticação via **JWT** com expiração configurável
- Usuário não-root nos containers Docker
- Variáveis sensíveis via `.env` (nunca hardcoded)
- CORS configurado explicitamente para `localhost:3010`

---

## 📦 Variáveis de Ambiente Completas

Veja [.env.example](.env.example) para a lista completa com descrições.

---

## 🤝 Contribuindo

1. Fork o repositório: https://github.com/john-lenes/price_app
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

---

## 📋 Changelog

### v1.0.0 — 05/03/2026
- 🎉 Lançamento inicial com stack completo (FastAPI + React + Celery + PostgreSQL)
- ✅ Frontend servido na porta **3010** via Nginx
- ✅ API disponível na porta **8020**
- 🔧 Fix: `bcrypt==4.0.1` fixado para compatibilidade com `passlib 1.7.4`
- 🔧 Fix: removido `broker_connection_retry` depreciado do Celery

---

## 📄 Licença

MIT — veja [LICENSE](LICENSE) para detalhes.
