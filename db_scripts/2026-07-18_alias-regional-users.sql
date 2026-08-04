-- Create alias users without the _rst_ prefix to match test expectations in file 23
-- Tests use qa_ae_owner but DB has qa_rst_ae_owner — both point to same tenant

INSERT INTO users (id, username, password, role, role_id, tenant_id) VALUES
  ('qa-u-qa_ae_owner',   'qa_ae_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',          'qa-r-9022-a',  9022),
  ('qa-u-qa_ae_manager', 'qa_ae_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',        'qa-r-9022-m',  9022),
  ('qa-u-qa_ae_cashier', 'qa_ae_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',       'qa-r-9022-o',  9022),
  ('qa-u-qa_ae_acct',    'qa_ae_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager','qa-r-9022-am', 9022),

  ('qa-u-qa_us_owner',   'qa_us_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',          'qa-r-9023-a',  9023),
  ('qa-u-qa_us_manager', 'qa_us_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',        'qa-r-9023-m',  9023),
  ('qa-u-qa_us_cashier', 'qa_us_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',       'qa-r-9023-o',  9023),
  ('qa-u-qa_us_acct',    'qa_us_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager','qa-r-9023-am', 9023),

  ('qa-u-qa_eu_owner',   'qa_eu_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',          'qa-r-9024-a',  9024),
  ('qa-u-qa_eu_manager', 'qa_eu_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',        'qa-r-9024-m',  9024),
  ('qa-u-qa_eu_cashier', 'qa_eu_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',       'qa-r-9024-o',  9024),
  ('qa-u-qa_eu_acct',    'qa_eu_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager','qa-r-9024-am', 9024),

  ('qa-u-qa_sg_owner',   'qa_sg_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',          'qa-r-9025-a',  9025),
  ('qa-u-qa_sg_manager', 'qa_sg_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',        'qa-r-9025-m',  9025),
  ('qa-u-qa_sg_cashier', 'qa_sg_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',       'qa-r-9025-o',  9025),
  ('qa-u-qa_sg_acct',    'qa_sg_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager','qa-r-9025-am', 9025),

  ('qa-u-qa_au_owner',   'qa_au_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',          'qa-r-9026-a',  9026),
  ('qa-u-qa_au_manager', 'qa_au_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',        'qa-r-9026-m',  9026),
  ('qa-u-qa_au_cashier', 'qa_au_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',       'qa-r-9026-o',  9026),
  ('qa-u-qa_au_acct',    'qa_au_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager','qa-r-9026-am', 9026)
ON CONFLICT (id) DO NOTHING;
