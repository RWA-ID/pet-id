CREATE TABLE pets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain       TEXT NOT NULL UNIQUE,
  parent_domain   TEXT NOT NULL,
  full_ens        TEXT GENERATED ALWAYS AS (subdomain || '.' || parent_domain) STORED,

  species         TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  name            TEXT NOT NULL,
  breed           TEXT,
  age_years       NUMERIC(4,1),
  color           TEXT,
  sex             TEXT CHECK (sex IN ('male', 'female', 'unknown')),
  bio             TEXT,
  emergency_notes TEXT,
  photo_cid       TEXT,
  photo_temp_url  TEXT,

  owner_name      TEXT,
  owner_phone     TEXT,
  owner_email     TEXT NOT NULL,

  template_id     TEXT NOT NULL,

  page_cid        TEXT,
  contenthash     TEXT,
  tx_hash         TEXT,
  ipfs_gateway_url TEXT,

  -- Helio payment (replaces Stripe)
  helio_payment_id     TEXT UNIQUE,
  amount_paid_cents    INTEGER,
  currency             TEXT DEFAULT 'usd',
  paid_at              TIMESTAMPTZ,

  is_crypto_flow  BOOLEAN DEFAULT FALSE,
  wallet_address  TEXT,

  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'minting', 'live', 'failed')),
  error_message   TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pets_subdomain ON pets(subdomain);
CREATE INDEX idx_pets_helio_payment ON pets(helio_payment_id);
CREATE INDEX idx_pets_status ON pets(status);
CREATE INDEX idx_pets_owner_email ON pets(owner_email);

CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      UUID REFERENCES pets(id),
  event       TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_live_pets" ON pets
  FOR SELECT USING (status = 'live');
