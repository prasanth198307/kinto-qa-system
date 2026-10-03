BEGIN;
-- Tulasi Beverages FIFO fix
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('3ce7954b-3e2f-4d15-8f6e-2a3258e6c750','65d1e1e1-34ea-4302-81dc-138fc0c4d717','4f1945a9-c8e1-4c71-8684-091cb6f62cec','b854155b-5829-48f3-8b91-c38cd49f3015','5abbed70-1aac-43e8-bcd1-08d4137bb444','2c07d53f-d475-4ce9-8bfb-a099bb88777f','98bae41b-f914-4bd7-a898-d521d7a7acf4','334f292b-1e54-4c4a-8fbd-b16f26ba8243','5513417b-5f45-4faa-a7e0-f547aa58391d');
DELETE FROM journal_lines WHERE journal_id IN ('c72707d0-8f2c-4a3c-a136-ee244942ea0a','91a9c8c8-c71e-46c9-93f6-acf51c04c1fc','de0881c9-e1fd-44bb-8ffb-dce10dc16694','4e60e94a-98c0-44aa-b21b-c7bd465bc493');
DELETE FROM journal_entries WHERE id IN ('c72707d0-8f2c-4a3c-a136-ee244942ea0a','91a9c8c8-c71e-46c9-93f6-acf51c04c1fc','de0881c9-e1fd-44bb-8ffb-dce10dc16694','4e60e94a-98c0-44aa-b21b-c7bd465bc493');
DELETE FROM invoice_payments WHERE id IN ('8116c9b3-7176-44c9-a7b1-37726ca93dce','64613edd-5af2-4cc1-815f-40fba9d47f3e','f2681f81-f616-4642-9e15-b7578cef2951','d3d08f7f-f4d2-46fc-8f9e-a0f27ab48d49');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('3e9c3c41-f413-40c7-9a31-f25389b48e16','df5163db-08d9-40f9-9ce9-7faee7096285','2025-04-12',1080000,'cash','received','VY-40-A',1,1,NOW(),NOW()),
('40de7b54-feae-46e3-9252-04fee631b5b7','df5163db-08d9-40f9-9ce9-7faee7096285','2025-05-08',3000000,'cash','received','VY-40-B',1,1,NOW(),NOW()),
('29e76673-11e2-44ef-b6ea-a21ec40bf021','df5163db-08d9-40f9-9ce9-7faee7096285','2025-05-23',1420000,'cash','received','VY-40-C',1,1,NOW(),NOW()),
('138a299d-55b1-43db-b30e-2c700a5165db','b45b097f-6ed0-4288-b97a-1a7063262778','2025-05-23',1980100,'cash','received','VY-125-A',1,1,NOW(),NOW()),
('fa449b57-d6f2-4b26-8d62-4c001dd05664','b45b097f-6ed0-4288-b97a-1a7063262778','2025-05-23',2899900,'cash','received','VY-125-B',1,1,NOW(),NOW()),
('1bc319ad-33d5-4bbd-907e-1f8812854047','b45b097f-6ed0-4288-b97a-1a7063262778','2025-06-06',1000000,'cash','received','VY-125-C',1,1,NOW(),NOW()),
('32f11423-3776-4a43-9e2d-4d1295aa81b2','b45b097f-6ed0-4288-b97a-1a7063262778','2025-06-12',520100,'cash','received','VY-125-D',1,1,NOW(),NOW()),
('8a99283d-156e-4203-ac54-ea702cb03034','7d176a21-961b-4bb0-ae9c-492c71e9d2c4','2025-06-12',479900,'cash','received','VY-144-A',1,1,NOW(),NOW()),
('60ad1dd4-aba9-443d-8efc-5dd540948b39','7d176a21-961b-4bb0-ae9c-492c71e9d2c4','2025-06-14',650000,'cash','received','VY-144-B',1,1,NOW(),NOW()),
('24e8905e-ef07-42a8-a9e2-940820db1960','7d176a21-961b-4bb0-ae9c-492c71e9d2c4','2025-07-12',175300,'cash','received','VY-144-C',1,1,NOW(),NOW()),
('fd7f8e84-6e6c-450b-80d2-cc5da1374b58','7d176a21-961b-4bb0-ae9c-492c71e9d2c4','2025-07-12',4420000,'cash','received','VY-144-D',1,1,NOW(),NOW()),
('5229a6b0-818d-4cfc-80b3-67360bcfe524','298de002-6183-4c4e-825e-80c28f1b05de','2025-07-12',904700,'cash','received','VY-167-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('eae554c1-86a7-4f15-9fbf-c6d2d6e50562','JRN-20261003-0305','2025-04-12','payment','3e9c3c41-f413-40c7-9a31-f25389b48e16','Payment from Tulasi Beverages - VY-40-A','posted',1,1080000,1080000,1,1,NOW(),NOW()),
('425cce3a-1c35-48aa-aedc-6b4911220f5c','JRN-20261003-0306','2025-05-08','payment','40de7b54-feae-46e3-9252-04fee631b5b7','Payment from Tulasi Beverages - VY-40-B','posted',1,3000000,3000000,1,1,NOW(),NOW()),
('cc299467-3062-4bb5-9f5b-1ef2f82d7af5','JRN-20261003-0307','2025-05-23','payment','29e76673-11e2-44ef-b6ea-a21ec40bf021','Payment from Tulasi Beverages - VY-40-C','posted',1,1420000,1420000,1,1,NOW(),NOW()),
('56981ff9-e5f6-47a9-9669-522fbbf877fe','JRN-20261003-0308','2025-05-23','payment','138a299d-55b1-43db-b30e-2c700a5165db','Payment from Tulasi Beverages - VY-125-A','posted',1,1980100,1980100,1,1,NOW(),NOW()),
('66a8a165-5709-4a5c-b38a-256991ee5d4f','JRN-20261003-0309','2025-05-23','payment','fa449b57-d6f2-4b26-8d62-4c001dd05664','Payment from Tulasi Beverages - VY-125-B','posted',1,2899900,2899900,1,1,NOW(),NOW()),
('17f9a848-089c-45f9-bac1-c97965284fec','JRN-20261003-0310','2025-06-06','payment','1bc319ad-33d5-4bbd-907e-1f8812854047','Payment from Tulasi Beverages - VY-125-C','posted',1,1000000,1000000,1,1,NOW(),NOW()),
('cf01e259-f702-4971-8860-48342daa47aa','JRN-20261003-0311','2025-06-12','payment','32f11423-3776-4a43-9e2d-4d1295aa81b2','Payment from Tulasi Beverages - VY-125-D','posted',1,520100,520100,1,1,NOW(),NOW()),
('50a9a0df-db3c-4b7a-bcf9-3731595756e9','JRN-20261003-0312','2025-06-12','payment','8a99283d-156e-4203-ac54-ea702cb03034','Payment from Tulasi Beverages - VY-144-A','posted',1,479900,479900,1,1,NOW(),NOW()),
('5b9c2aaf-9193-4a37-8816-6059ed190d94','JRN-20261003-0313','2025-06-14','payment','60ad1dd4-aba9-443d-8efc-5dd540948b39','Payment from Tulasi Beverages - VY-144-B','posted',1,650000,650000,1,1,NOW(),NOW()),
('c1e3a779-ca4c-4c33-9de0-78976caabb96','JRN-20261003-0314','2025-07-12','payment','24e8905e-ef07-42a8-a9e2-940820db1960','Payment from Tulasi Beverages - VY-144-C','posted',1,175300,175300,1,1,NOW(),NOW()),
('c45f44cb-114b-4c11-85c2-8c0dc466ef68','JRN-20261003-0315','2025-07-12','payment','fd7f8e84-6e6c-450b-80d2-cc5da1374b58','Payment from Tulasi Beverages - VY-144-D','posted',1,4420000,4420000,1,1,NOW(),NOW()),
('46c36328-bd39-42c4-90ea-867fdea835fc','JRN-20261003-0316','2025-07-12','payment','5229a6b0-818d-4cfc-80b3-67360bcfe524','Payment from Tulasi Beverages - VY-167-A','posted',1,904700,904700,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('f4b59c44-11c4-46f3-8c39-f73b11fe84f1','eae554c1-86a7-4f15-9fbf-c6d2d6e50562','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1080000,0,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('90a4d4d3-8a3c-4d6d-8b2c-1648ad682366','eae554c1-86a7-4f15-9fbf-c6d2d6e50562','9f0596af-fef5-4f51-9943-cec0dba2f3f2',0,1080000,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('43171615-9de5-4138-bffd-f82644327d80','425cce3a-1c35-48aa-aedc-6b4911220f5c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3000000,0,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('ed970753-fd40-41c8-8756-ecaed6ef7f5b','425cce3a-1c35-48aa-aedc-6b4911220f5c','9f0596af-fef5-4f51-9943-cec0dba2f3f2',0,3000000,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('3591a76b-25cd-4c46-a7df-b940a65cb096','cc299467-3062-4bb5-9f5b-1ef2f82d7af5','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1420000,0,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('fc99e852-a874-44b8-b7b4-4a1ed5526467','cc299467-3062-4bb5-9f5b-1ef2f82d7af5','9f0596af-fef5-4f51-9943-cec0dba2f3f2',0,1420000,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('c3c8960d-24ad-4e83-b34e-814a3d0631c5','56981ff9-e5f6-47a9-9669-522fbbf877fe','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1980100,0,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('ca1e371c-1cbc-4560-b9d5-d04202f8a116','56981ff9-e5f6-47a9-9669-522fbbf877fe','9f0596af-fef5-4f51-9943-cec0dba2f3f2',0,1980100,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('4a8f3111-8f74-4e21-8101-c9feffe4f299','66a8a165-5709-4a5c-b38a-256991ee5d4f','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2899900,0,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('329c05b9-dd62-4039-978a-7d481c17514f','66a8a165-5709-4a5c-b38a-256991ee5d4f','9f0596af-fef5-4f51-9943-cec0dba2f3f2',0,2899900,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('023bcb57-d514-4bfa-a46c-ab23fdd275e5','17f9a848-089c-45f9-bac1-c97965284fec','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1000000,0,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('c0deb65b-1da8-496a-b5ae-519fc1760ecf','17f9a848-089c-45f9-bac1-c97965284fec','9f0596af-fef5-4f51-9943-cec0dba2f3f2',0,1000000,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('6a6962d8-7764-4f5c-a30b-cf0b9bf7b004','cf01e259-f702-4971-8860-48342daa47aa','23d1cabd-e89f-4bd8-a208-91f59c3898c2',520100,0,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('47818ad8-dc9a-4e43-9b2d-865b28d9b410','cf01e259-f702-4971-8860-48342daa47aa','9f0596af-fef5-4f51-9943-cec0dba2f3f2',0,520100,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('c6cf94b0-8284-4edb-9fa8-8c60e328f645','50a9a0df-db3c-4b7a-bcf9-3731595756e9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',479900,0,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('7b699e8e-b9ce-4cf2-a6eb-2095bfc2bb0c','50a9a0df-db3c-4b7a-bcf9-3731595756e9','9f0596af-fef5-4f51-9943-cec0dba2f3f2',0,479900,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('2860f8d7-2375-4c5c-9105-e082c9944e10','5b9c2aaf-9193-4a37-8816-6059ed190d94','23d1cabd-e89f-4bd8-a208-91f59c3898c2',650000,0,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('3d12c93b-9f57-4587-b23b-44186195732c','5b9c2aaf-9193-4a37-8816-6059ed190d94','9f0596af-fef5-4f51-9943-cec0dba2f3f2',0,650000,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('393a111b-30d4-4f0e-a445-480ca2cdbdb1','c1e3a779-ca4c-4c33-9de0-78976caabb96','23d1cabd-e89f-4bd8-a208-91f59c3898c2',175300,0,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('b1a03519-ad98-40df-b1d2-a657c74b2e9f','c1e3a779-ca4c-4c33-9de0-78976caabb96','9f0596af-fef5-4f51-9943-cec0dba2f3f2',0,175300,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('4371b43e-ca77-40cd-8c41-e50bdc97a465','c45f44cb-114b-4c11-85c2-8c0dc466ef68','23d1cabd-e89f-4bd8-a208-91f59c3898c2',4420000,0,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('3117cc8f-5fd2-488f-a134-7bf8f08e1d64','c45f44cb-114b-4c11-85c2-8c0dc466ef68','9f0596af-fef5-4f51-9943-cec0dba2f3f2',0,4420000,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('ffa0878f-07b6-4c47-9f94-663602a23d12','46c36328-bd39-42c4-90ea-867fdea835fc','23d1cabd-e89f-4bd8-a208-91f59c3898c2',904700,0,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1),
('e04a3e59-9cb8-4f92-b61d-b569e384889f','46c36328-bd39-42c4-90ea-867fdea835fc','9f0596af-fef5-4f51-9943-cec0dba2f3f2',0,904700,NULL,NULL,'Tulasi Beverages','Payment receipt',1,NOW(),1);
COMMIT;