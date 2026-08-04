-- KYC document storage for Nidhi members
-- Admin uploads Aadhaar/PAN/Photo, approves or rejects per document, then sets kyc_status on the member.

CREATE TABLE IF NOT EXISTS nidhi_kyc_documents (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  member_id        TEXT NOT NULL,
  doc_type         VARCHAR(50) NOT NULL,   -- aadhar_front, aadhar_back, pan, photo, address_proof
  file_name        VARCHAR(255),
  file_data        TEXT,                   -- base64 or URL
  mime_type        VARCHAR(100),
  uploaded_by      VARCHAR(200),
  status           VARCHAR(30)  DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by      VARCHAR(200),
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nidhi_kyc_docs_member ON nidhi_kyc_documents (tenant_id, member_id);

-- Reminder log (shared with WhatsApp reminder engine)
CREATE TABLE IF NOT EXISTS nidhi_reminder_log (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  member_id      TEXT,
  reminder_type  VARCHAR(50),              -- emi_due, fd_maturity, kyc_pending
  message        TEXT,
  status         VARCHAR(30) DEFAULT 'sent', -- sent, failed
  sent_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nidhi_reminder_log_tenant ON nidhi_reminder_log (tenant_id, sent_at DESC);
