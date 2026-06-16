# Autobras Recibo — Backend API

Backend completo para geração de recibos/invoices em PDF da empresa **Autobras LLC**.

---

## Stack

- **Node.js 20** + **TypeScript**
- **Express 4**
- **Supabase** (PostgreSQL + Storage)
- **JWT** (jsonwebtoken + bcryptjs)
- **PDFKit** (geração de PDF)
- **Multer** (upload de arquivos em memória)
- **Zod** (validação de schema)

---

## Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com) com projeto criado
- npm ou yarn

---

## Setup local

### 1. Clone e instale

```bash
git clone <repo-url>
cd autobras-recibo
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
JWT_SECRET=minha_chave_super_secreta_com_32_chars_ou_mais
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
STORAGE_BUCKET_PRINTS=autobras-prints
STORAGE_BUCKET_PDFS=autobras-pdfs
```

> ⚠️ A `SUPABASE_SERVICE_ROLE_KEY` está em **Settings → API** no painel do Supabase. Use a chave `service_role`, nunca a `anon`.

### 3. Configure o banco de dados no Supabase

1. Acesse o painel do Supabase → **SQL Editor**
2. Cole o conteúdo de `sql/schema.sql` e execute
3. As 4 tabelas serão criadas automaticamente

### 4. Crie os buckets de Storage

No painel do Supabase → **Storage → New Bucket**:

| Bucket | Acesso público |
|--------|---------------|
| `autobras-prints` | ✅ Public |
| `autobras-pdfs` | ✅ Public |

### 5. Rode em modo desenvolvimento

```bash
npm run dev
```

O servidor inicia em `http://localhost:3000`.

---

## Scripts disponíveis

```bash
npm run dev      # Desenvolvimento com hot-reload (tsx watch)
npm run build    # Compila TypeScript → dist/
npm start        # Roda a versão compilada (produção)
```

---

## Endpoints da API

### Saúde
```
GET /health
```

---

### Auth

#### Registrar usuário
```
POST /auth/register
Content-Type: application/json

{
  "nome": "João Silva",
  "email": "joao@autobras.com",
  "senha": "senha123",
  "cargo": "Vendedor"
}
```

**Resposta 201:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "nome": "João Silva",
    "email": "joao@autobras.com",
    "cargo": "Vendedor",
    "ativo": true,
    "criado_em": "2024-01-01T00:00:00Z"
  }
}
```

---

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "joao@autobras.com",
  "senha": "senha123"
}
```

**Resposta 200:**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "nome": "João Silva",
      "email": "joao@autobras.com",
      "cargo": "Vendedor"
    }
  }
}
```

---

#### Meu perfil
```
GET /auth/me
Authorization: Bearer <token>
```

---

### Recibos

> Todos os endpoints de recibos requerem `Authorization: Bearer <token>`

---

#### Upload de prints (antes de criar o recibo)
```
POST /receipts/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: [arquivo1.jpg, arquivo2.jpg]
recibo_id: (opcional) uuid-do-recibo
```

**Resposta 201:**
```json
{
  "status": "success",
  "data": [
    { "id": "uuid", "url": "https://..." },
    { "id": "uuid", "url": "https://..." }
  ]
}
```

> Salve os `id` retornados para vincular ao recibo no próximo passo.

---

#### Criar recibo
```
POST /receipts
Authorization: Bearer <token>
Content-Type: application/json

{
  "cliente_nome": "Luizão Auto Parts",
  "issue_date": "2024-01-15",
  "due_date": "2024-01-22",
  "arquivos_ids": ["uuid-do-upload-1", "uuid-do-upload-2"],
  "itens": [
    {
      "descricao_servico": "Front Windshield",
      "veiculo": "2010 Subaru Legacy",
      "vin": "4S3BMBF63A3221502",
      "quantidade": 1,
      "valor_unitario": 170.00,
      "tax_percent": 0
    },
    {
      "descricao_servico": "Labor",
      "veiculo": "2010 Subaru Legacy",
      "quantidade": 1,
      "valor_unitario": 50.00,
      "tax_percent": 8.25
    }
  ]
}
```

**Resposta 201:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "numero_recibo": 1000,
    "cliente_nome": "Luizão Auto Parts",
    "subtotal": 220.00,
    "total_tax": 4.13,
    "total": 224.13,
    "status": "GERADO",
    "itens": [...]
  }
}
```

---

#### Gerar PDF
```
POST /receipts/:id/generate-pdf
Authorization: Bearer <token>
```

**Resposta 200:**
```json
{
  "status": "success",
  "data": {
    "pdf_url": "https://supabase.co/storage/v1/object/public/autobras-pdfs/..."
  }
}
```

---

#### Baixar/Visualizar PDF
```
GET /receipts/:id/pdf
Authorization: Bearer <token>
```

Redireciona (302) para a URL pública do PDF no Supabase Storage.

---

#### Listar recibos
```
GET /receipts?page=1&limit=20&cliente_nome=Luizão&data_inicio=2024-01-01
Authorization: Bearer <token>
```

**Query params disponíveis:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `page` | number | Página (default: 1) |
| `limit` | number | Itens por página (max: 100) |
| `cliente_nome` | string | Filtro parcial por nome |
| `numero_recibo` | number | Filtro por número |
| `usuario_id` | uuid | Filtro por usuário |
| `data_inicio` | YYYY-MM-DD | Data inicial |
| `data_fim` | YYYY-MM-DD | Data final |

---

#### Detalhe do recibo
```
GET /receipts/:id
Authorization: Bearer <token>
```

Retorna recibo com itens e arquivos vinculados.

---

#### Cancelar recibo
```
DELETE /receipts/:id
Authorization: Bearer <token>
```

Marca o recibo como `CANCELADO` (soft delete).

---

## Estrutura de pastas

```
src/
├── config/
│   ├── env.ts          # Validação de variáveis de ambiente
│   └── supabase.ts     # Cliente Supabase singleton
├── middlewares/
│   ├── auth.middleware.ts   # Verificação de JWT
│   ├── error.middleware.ts  # Handler global de erros
│   └── upload.middleware.ts # Multer (memória → Supabase Storage)
├── modules/
│   ├── auth/           # Login, registro, perfil
│   └── receipts/       # CRUD de recibos, upload, geração de PDF
│       └── pdf/        # Lógica de geração do PDF com PDFKit
├── shared/
│   ├── errors/         # AppError customizado
│   └── types/          # Tipos TypeScript compartilhados
├── app.ts              # Express app (middlewares + rotas)
└── server.ts           # Entry point
```

---

## Deploy no Render

### 1. Suba o código para o GitHub

```bash
git init
git add .
git commit -m "feat: backend inicial Autobras Recibo"
git remote add origin https://github.com/seu-usuario/autobras-recibo.git
git push -u origin main
```

### 2. Crie o Web Service no Render

1. Acesse [render.com](https://render.com) e faça login
2. Clique em **New → Web Service**
3. Conecte seu repositório GitHub
4. Configure:

| Campo | Valor |
|-------|-------|
| **Environment** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Node Version** | 20 |

### 3. Configure as variáveis de ambiente no Render

Em **Environment → Environment Variables**, adicione:

```
SUPABASE_URL              = https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGci...
JWT_SECRET                = sua_chave_32_chars_minimo
JWT_EXPIRES_IN            = 7d
NODE_ENV                  = production
PORT                      = 3000
STORAGE_BUCKET_PRINTS     = autobras-prints
STORAGE_BUCKET_PDFS       = autobras-pdfs
```

### 4. Deploy

Clique em **Create Web Service**. O Render fará o build e deploy automaticamente.

Após o deploy, sua API estará disponível em:
```
https://autobras-recibo-api.onrender.com
```

Teste com:
```
GET https://autobras-recibo-api.onrender.com/health
```

---

## Roadmap / Próximos passos

- [ ] OCR/IA para extração automática dos dados dos prints enviados
- [ ] Endpoint `PATCH /receipts/:id` para edição de recibo antes de gerar PDF
- [ ] Envio de PDF por e-mail (SendGrid/Resend)
- [ ] Role-based access control (admin vs. vendedor)
- [ ] Testes automatizados (Jest + Supertest)
