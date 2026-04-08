-- Demo requests table: captures inquiries from landing page "Book a Demo" form
CREATE TABLE IF NOT EXISTS demo_requests (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  company    VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  phone      VARCHAR(20),
  city       VARCHAR(100),
  message    TEXT,
  status     VARCHAR(20) NOT NULL DEFAULT 'new',   -- new | contacted | closed
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
