-- Extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────
-- TABELA: usuarios
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  senha_hash  TEXT        NOT NULL,
  cargo       TEXT,
  ativo       BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────
-- SEQUÊNCIA + TABELA: recibos
-- ──────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS recibos_numero_seq START 1000;

CREATE TABLE IF NOT EXISTS recibos (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_recibo     INTEGER     NOT NULL UNIQUE DEFAULT nextval('recibos_numero_seq'),
  cliente_nome      TEXT        NOT NULL,
  usuario_id        UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  pdf_gerado_por    UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  pdf_url           TEXT,
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tax         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            TEXT        NOT NULL DEFAULT 'GERADO',
  issue_date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date          DATE,
  data_hora_geracao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recibos DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_recibos_usuario_id   ON recibos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_recibos_criado_em    ON recibos (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_recibos_cliente_nome ON recibos (cliente_nome);

-- ──────────────────────────────────────────────
-- TABELA: itens_recibo
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itens_recibo (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  recibo_id         UUID          NOT NULL REFERENCES recibos(id) ON DELETE CASCADE,
  descricao_servico TEXT          NOT NULL,
  veiculo           TEXT,
  vin               TEXT,
  quantidade        NUMERIC(10,2) NOT NULL DEFAULT 1,
  valor_unitario    NUMERIC(12,2) NOT NULL,
  tax_percent       NUMERIC(6,4)  NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_total       NUMERIC(12,2) NOT NULL,
  criado_em         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE itens_recibo DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_itens_recibo_id ON itens_recibo (recibo_id);
