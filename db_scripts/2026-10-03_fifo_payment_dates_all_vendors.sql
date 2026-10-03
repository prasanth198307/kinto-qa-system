BEGIN;

-- ======= ADADA SIVAJI =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('0e41a7aa-d868-44b5-b2a2-e59bbd719065','a8653007-9bb7-406f-b4df-f34cf90703b1');
DELETE FROM journal_lines WHERE journal_id IN ('a06eefcf-d484-4f99-a1d1-49a9205bf1dc');
DELETE FROM journal_entries WHERE id IN ('a06eefcf-d484-4f99-a1d1-49a9205bf1dc');
DELETE FROM invoice_payments WHERE id IN ('f30e2679-d6b7-496e-80b6-a86301a7c274');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('59b21c2e-be20-4ae9-8c6b-e32c89f4bcfc','e7c4ed0d-ba36-4a0e-a8d1-7274c530f681','2025-06-26',1500000,'cash','received','VY-157-A',1,1,NOW(),NOW()),
('3ca94567-ebf7-4e9f-a170-5c580522e532','e7c4ed0d-ba36-4a0e-a8d1-7274c530f681','2025-06-30',1800000,'cash','received','VY-157-B',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('e5d3f892-454a-4fe6-a385-fa0ae0338df4','JRN-20261003-0001','2025-06-26','payment','59b21c2e-be20-4ae9-8c6b-e32c89f4bcfc','Payment from ADADA SIVAJI - VY-157-A','posted',1,1500000,1500000,1,1,NOW(),NOW()),
('a68d1bce-166e-4b4a-b6d8-a90ea839a1c2','JRN-20261003-0002','2025-06-30','payment','3ca94567-ebf7-4e9f-a170-5c580522e532','Payment from ADADA SIVAJI - VY-157-B','posted',1,1800000,1800000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('7912cea9-23da-4f57-8bb2-f755197eee0e','e5d3f892-454a-4fe6-a385-fa0ae0338df4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1500000,0,NULL,NULL,'ADADA SIVAJI','Payment receipt',1,NOW(),1),
('c8bf1ced-9f8e-4bda-9297-dfa3fd42cb98','e5d3f892-454a-4fe6-a385-fa0ae0338df4','3ef1b487-8b94-46c8-843d-7e99a97be58f',0,1500000,NULL,NULL,'ADADA SIVAJI','Payment receipt',1,NOW(),1),
('f275ce5f-e5b2-4083-9bf5-980cc095114b','a68d1bce-166e-4b4a-b6d8-a90ea839a1c2','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1800000,0,NULL,NULL,'ADADA SIVAJI','Payment receipt',1,NOW(),1),
('2eedfb16-e7ca-4f0a-8daa-7ed945b3fe67','a68d1bce-166e-4b4a-b6d8-a90ea839a1c2','3ef1b487-8b94-46c8-843d-7e99a97be58f',0,1800000,NULL,NULL,'ADADA SIVAJI','Payment receipt',1,NOW(),1);

-- ======= ADHOC SRINIVASA PETROLEUM =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('bbbcf3ae-9ef8-4053-b7d6-03afda1a25e8');
DELETE FROM journal_lines WHERE journal_id IN ('6a1a233b-5cc2-4100-b2e9-57122091031b');
DELETE FROM journal_entries WHERE id IN ('6a1a233b-5cc2-4100-b2e9-57122091031b');
DELETE FROM invoice_payments WHERE id IN ('df3c3bea-9994-431b-95f8-87ce01e5b5c8');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('cb01b5c1-2f7e-4cc8-a700-6160d698ef2b','d29eaa52-07bf-434b-95f7-eb018193ff87','2025-10-16',378100,'cash','received','VY-298-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('5d05c1c1-8254-47a6-ace3-48c17e54319a','JRN-20261003-0003','2025-10-16','payment','cb01b5c1-2f7e-4cc8-a700-6160d698ef2b','Payment from ADHOC SRINIVASA PETROLEUM - VY-298-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('1470cfc0-c061-4516-9e70-93a0af8463e1','5d05c1c1-8254-47a6-ace3-48c17e54319a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'ADHOC SRINIVASA PETROLEUM','Payment receipt',1,NOW(),1),
('33459aba-794a-4517-9dee-a7c426aa8826','5d05c1c1-8254-47a6-ace3-48c17e54319a','ad3f6761-7479-4882-8072-a7be0d9f8ef2',0,378100,NULL,NULL,'ADHOC SRINIVASA PETROLEUM','Payment receipt',1,NOW(),1);

-- ======= ANUPAMA GUEST HOUSE =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('3394c91a-8077-46c1-bee1-9b9773138fbc','091c79b8-3108-44ac-899f-8f0ae48c3c49');
DELETE FROM journal_lines WHERE journal_id IN ('4da2310f-fd62-4826-be78-335c19048168','a3156c70-5901-48d8-9040-17400ab0984f');
DELETE FROM journal_entries WHERE id IN ('4da2310f-fd62-4826-be78-335c19048168','a3156c70-5901-48d8-9040-17400ab0984f');
DELETE FROM invoice_payments WHERE id IN ('855b101d-987e-48ed-acdb-20120c1cedb2','1c2a9f76-6eef-4919-b702-b3cc03cab051');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('7e4d3754-b67b-4e77-b12a-e894b3e4d98d','9a26a5a7-f18c-4fc9-bdbd-b5a07730047b','2025-07-09',3639600,'cash','received','VY-205-A',1,1,NOW(),NOW()),
('86df502a-38a7-4bb9-8ee8-925a6a36efdb','687055b4-462d-46da-9a52-e783df84b5e4','2025-07-09',3564200,'cash','received','VY-203-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('c602e33a-ba38-4855-8639-782460f1c1a2','JRN-20261003-0004','2025-07-09','payment','7e4d3754-b67b-4e77-b12a-e894b3e4d98d','Payment from ANUPAMA GUEST HOUSE - VY-205-A','posted',1,3639600,3639600,1,1,NOW(),NOW()),
('f6b65b9e-d75b-4348-ae3e-cbee2d61bff0','JRN-20261003-0005','2025-07-09','payment','86df502a-38a7-4bb9-8ee8-925a6a36efdb','Payment from ANUPAMA GUEST HOUSE - VY-203-A','posted',1,3564200,3564200,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('a9a3b46a-3a29-4eac-8932-eb8c43e76126','c602e33a-ba38-4855-8639-782460f1c1a2','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3639600,0,NULL,NULL,'ANUPAMA GUEST HOUSE','Payment receipt',1,NOW(),1),
('63857a3e-9445-4b82-95f3-a393317df4dd','c602e33a-ba38-4855-8639-782460f1c1a2','95680d55-bd4f-4263-8e6b-431ab5c4ece9',0,3639600,NULL,NULL,'ANUPAMA GUEST HOUSE','Payment receipt',1,NOW(),1),
('a12b9043-6455-4f63-8fbb-7dc72676bc3a','f6b65b9e-d75b-4348-ae3e-cbee2d61bff0','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3564200,0,NULL,NULL,'ANUPAMA GUEST HOUSE','Payment receipt',1,NOW(),1),
('5af97e36-b214-45f6-b7e8-fda9a6bffd30','f6b65b9e-d75b-4348-ae3e-cbee2d61bff0','95680d55-bd4f-4263-8e6b-431ab5c4ece9',0,3564200,NULL,NULL,'ANUPAMA GUEST HOUSE','Payment receipt',1,NOW(),1);

-- ======= ARNEPALLI ATCHUTHA RAO =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('4684b5b9-97d1-4958-b3bf-8f7506fbfa19');
DELETE FROM journal_lines WHERE journal_id IN ('28d0b227-983f-42b3-8758-2af1030f738c');
DELETE FROM journal_entries WHERE id IN ('28d0b227-983f-42b3-8758-2af1030f738c');
DELETE FROM invoice_payments WHERE id IN ('1ed64cdd-a7ce-4598-89cd-f120732a98d1');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('a5cbd3f6-e400-4c6e-b528-8f097087745f','ae86bc8f-62b2-46ef-8a7a-9b9b3c4b0cd8','2025-05-14',4375000,'cash','received','VY-134-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('394dea3f-d3b6-4868-9d1e-12a73acf516b','JRN-20261003-0006','2025-05-14','payment','a5cbd3f6-e400-4c6e-b528-8f097087745f','Payment from ARNEPALLI ATCHUTHA RAO - VY-134-A','posted',1,4375000,4375000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('8724c379-003d-4b8c-a782-797f18cbbeaa','394dea3f-d3b6-4868-9d1e-12a73acf516b','23d1cabd-e89f-4bd8-a208-91f59c3898c2',4375000,0,NULL,NULL,'ARNEPALLI ATCHUTHA RAO','Payment receipt',1,NOW(),1),
('13872744-dc99-47c1-96ff-674a00562ae4','394dea3f-d3b6-4868-9d1e-12a73acf516b','07f1e2fb-7792-4d62-9630-78b06dac3cf7',0,4375000,NULL,NULL,'ARNEPALLI ATCHUTHA RAO','Payment receipt',1,NOW(),1);

-- ======= ASR MURTHY VISAKH =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('01ded316-b76d-4ac6-b0c0-3e31251dec08','851b0807-c3f5-449e-9507-371fe0d5a2fc');
DELETE FROM journal_lines WHERE journal_id IN ('892feafe-40fb-420a-9b1e-38e7752e0a6b','851a59f6-8b62-4095-a5a7-131b6fed2659');
DELETE FROM journal_entries WHERE id IN ('892feafe-40fb-420a-9b1e-38e7752e0a6b','851a59f6-8b62-4095-a5a7-131b6fed2659');
DELETE FROM invoice_payments WHERE id IN ('23bc6b80-6afc-4b43-b895-c710265085c1','62c4fd3f-6780-469c-ad3e-a7d54f17ccb9');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('e0e635e3-1972-4802-b835-b08ac27b8a96','bab2e265-2ddc-49d6-b302-3adcccab022f','2025-08-20',258100,'cash','received','VY-247-A',1,1,NOW(),NOW()),
('0102bc2a-6e4e-4553-ae8b-228f0006da7c','08c18991-9116-478e-b68d-b8c3d7a6aadc','2025-10-16',378100,'cash','received','VY-281-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('c324aebd-2905-4bb6-828e-cb786657bdb4','JRN-20261003-0007','2025-08-20','payment','e0e635e3-1972-4802-b835-b08ac27b8a96','Payment from ASR MURTHY VISAKH - VY-247-A','posted',1,258100,258100,1,1,NOW(),NOW()),
('309fd2a3-ee07-4181-beae-463037fe3b3c','JRN-20261003-0008','2025-10-16','payment','0102bc2a-6e4e-4553-ae8b-228f0006da7c','Payment from ASR MURTHY VISAKH - VY-281-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('75645d33-acab-4f1e-b53f-b4eea4615eb1','c324aebd-2905-4bb6-828e-cb786657bdb4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',258100,0,NULL,NULL,'ASR MURTHY VISAKH','Payment receipt',1,NOW(),1),
('4eb06890-37ea-4de5-9353-1b05004fa828','c324aebd-2905-4bb6-828e-cb786657bdb4','edaa6699-1ee5-46bd-8cce-456f8676fc57',0,258100,NULL,NULL,'ASR MURTHY VISAKH','Payment receipt',1,NOW(),1),
('61ce2fbe-d006-402a-9692-e705043b9267','309fd2a3-ee07-4181-beae-463037fe3b3c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'ASR MURTHY VISAKH','Payment receipt',1,NOW(),1),
('29b0c033-0c81-4366-af47-1430ed59171c','309fd2a3-ee07-4181-beae-463037fe3b3c','edaa6699-1ee5-46bd-8cce-456f8676fc57',0,378100,NULL,NULL,'ASR MURTHY VISAKH','Payment receipt',1,NOW(),1);

-- ======= BHSR HIGHWAY SER STN VAD =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('750f7907-83b7-4329-b075-eb50792b023f');
DELETE FROM journal_lines WHERE journal_id IN ('4578abc2-3bf4-498d-ad49-29f8f14b6f69');
DELETE FROM journal_entries WHERE id IN ('4578abc2-3bf4-498d-ad49-29f8f14b6f69');
DELETE FROM invoice_payments WHERE id IN ('fa82999d-68fc-4ba0-8ea7-3c67640f0fe4');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('fe67fbe4-576c-4cd1-a22b-5918f3f06033','d7594d8f-0f14-4937-bbcd-54e445f719aa','2025-08-20',292100,'cash','received','VY-249-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('44a80a03-4e5c-462d-bd94-fb2ecb28d51e','JRN-20261003-0009','2025-08-20','payment','fe67fbe4-576c-4cd1-a22b-5918f3f06033','Payment from BHSR HIGHWAY SER STN VAD - VY-249-A','posted',1,292100,292100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('3baf6b45-6ee7-4b4c-adb4-ab1065fde5a9','44a80a03-4e5c-462d-bd94-fb2ecb28d51e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',292100,0,NULL,NULL,'BHSR HIGHWAY SER STN VAD','Payment receipt',1,NOW(),1),
('53ddc4fe-5584-473a-bb3a-081b0afe4f6b','44a80a03-4e5c-462d-bd94-fb2ecb28d51e','08e7e382-65dc-4574-b94b-2d9cf372acc8',0,292100,NULL,NULL,'BHSR HIGHWAY SER STN VAD','Payment receipt',1,NOW(),1);

-- ======= Beemarasetty Satya Siva Kumar =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('aa6b930b-a544-4bdf-aaa6-c76f27165053');
DELETE FROM journal_lines WHERE journal_id IN ('48014ba3-ab6a-4802-a418-ad63db3bb299');
DELETE FROM journal_entries WHERE id IN ('48014ba3-ab6a-4802-a418-ad63db3bb299');
DELETE FROM invoice_payments WHERE id IN ('16d5c6f1-4a12-47d6-abdd-ee1f1c4aa162');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('9afbb9cd-4843-4047-b9e0-19b663f0e4e6','c355f6e8-d971-4098-b7af-dd61ee0311e1','2025-10-30',1200000,'cash','received','VY-316-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('e2083f38-520f-4ab0-9e76-422549f65f51','JRN-20261003-0010','2025-10-30','payment','9afbb9cd-4843-4047-b9e0-19b663f0e4e6','Payment from Beemarasetty Satya Siva Kumar - VY-316-A','posted',1,1200000,1200000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('60da363d-dc0e-43ab-9d43-287b6c2cb80b','e2083f38-520f-4ab0-9e76-422549f65f51','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1200000,0,NULL,NULL,'Beemarasetty Satya Siva Kumar','Payment receipt',1,NOW(),1),
('1b08f109-a6ba-4f08-8724-f4405f7b0e67','e2083f38-520f-4ab0-9e76-422549f65f51','523b68e0-588c-47d1-a033-0fe6514792ad',0,1200000,NULL,NULL,'Beemarasetty Satya Siva Kumar','Payment receipt',1,NOW(),1);

-- ======= Bhuvaneswari Agencies =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('4d5eebcf-e0e3-44f3-a86d-8bb3950e1adb','7f2b6945-498a-4741-91fb-9ff25421b20d','315ee3db-377e-4f51-8b39-21c38c9ab9b5','7e2b5e75-736e-4cc7-aa38-6ef5254d1b76','427056b1-a061-4be7-92d9-c002cbe9b572','d3fef2d2-ed62-4547-9ece-2ab3357f1300','358b4393-f083-41da-8412-86db1454948f');
DELETE FROM journal_lines WHERE journal_id IN ('b488113f-ac35-4301-b151-c2c3695a1320','44a4b87c-9085-4767-88ed-2a9061325a58','c0127a6c-b6d2-4ea5-933d-16c0749a0481');
DELETE FROM journal_entries WHERE id IN ('b488113f-ac35-4301-b151-c2c3695a1320','44a4b87c-9085-4767-88ed-2a9061325a58','c0127a6c-b6d2-4ea5-933d-16c0749a0481');
DELETE FROM invoice_payments WHERE id IN ('9797173f-b016-47c1-8279-c95689e515d8','e95961d2-caf4-43b8-bf00-8f95279ef12b','aed234e5-b07e-4593-acbd-af0f914aaf31');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('38542bd8-47be-45b7-ab8d-bccb01dca189','928371b7-a9d9-476e-9034-d4cc44d41e4c','2025-04-15',2220100,'cash','received','VY-39-A',1,1,NOW(),NOW()),
('26951db6-550f-48a4-830b-dd5622f1151a','928371b7-a9d9-476e-9034-d4cc44d41e4c','2025-04-21',2000000,'cash','received','VY-39-B',1,1,NOW(),NOW()),
('1b639b69-cda9-4cbb-a3b9-594194a5bd53','cf578cba-c588-49e1-8e68-c49ec1edd872','2025-05-23',2000000,'cash','received','VY-126-A',1,1,NOW(),NOW()),
('b41f3821-89b8-4d2a-8214-a49384a2779a','cf578cba-c588-49e1-8e68-c49ec1edd872','2025-05-30',1150000,'cash','received','VY-126-B',1,1,NOW(),NOW()),
('ef40c460-f781-4dfc-9e64-b2679e9ad905','cf578cba-c588-49e1-8e68-c49ec1edd872','2025-06-26',75000,'cash','received','VY-126-C',1,1,NOW(),NOW()),
('9287aafa-dd04-4e95-85db-c6a983aa833f','baa0ca73-a576-4e13-9907-000f223754af','2025-06-26',2925000,'cash','received','VY-168-A',1,1,NOW(),NOW()),
('8e0cf34b-8bd6-4887-9fab-f794ad0adf78','baa0ca73-a576-4e13-9907-000f223754af','2025-06-30',1250500,'cash','received','VY-168-B',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('978a308d-482e-4b18-ab4e-f897dad8dd86','JRN-20261003-0011','2025-04-15','payment','38542bd8-47be-45b7-ab8d-bccb01dca189','Payment from Bhuvaneswari Agencies - VY-39-A','posted',1,2220100,2220100,1,1,NOW(),NOW()),
('75ce6e36-ace6-4a5f-97b2-a06979b73696','JRN-20261003-0012','2025-04-21','payment','26951db6-550f-48a4-830b-dd5622f1151a','Payment from Bhuvaneswari Agencies - VY-39-B','posted',1,2000000,2000000,1,1,NOW(),NOW()),
('01227295-b3b0-474b-8354-718fff2ecf1c','JRN-20261003-0013','2025-05-23','payment','1b639b69-cda9-4cbb-a3b9-594194a5bd53','Payment from Bhuvaneswari Agencies - VY-126-A','posted',1,2000000,2000000,1,1,NOW(),NOW()),
('33ccc424-92a8-4908-bd67-a63b879c7d69','JRN-20261003-0014','2025-05-30','payment','b41f3821-89b8-4d2a-8214-a49384a2779a','Payment from Bhuvaneswari Agencies - VY-126-B','posted',1,1150000,1150000,1,1,NOW(),NOW()),
('d161ab4f-9096-413e-aff9-1a21cda722a6','JRN-20261003-0015','2025-06-26','payment','ef40c460-f781-4dfc-9e64-b2679e9ad905','Payment from Bhuvaneswari Agencies - VY-126-C','posted',1,75000,75000,1,1,NOW(),NOW()),
('55b9fd4e-eb1a-4da7-ace7-54a66652694c','JRN-20261003-0016','2025-06-26','payment','9287aafa-dd04-4e95-85db-c6a983aa833f','Payment from Bhuvaneswari Agencies - VY-168-A','posted',1,2925000,2925000,1,1,NOW(),NOW()),
('d526c6cd-feca-4dd2-976a-10bdcc55a0b9','JRN-20261003-0017','2025-06-30','payment','8e0cf34b-8bd6-4887-9fab-f794ad0adf78','Payment from Bhuvaneswari Agencies - VY-168-B','posted',1,1250500,1250500,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('f787278d-5d59-4960-8af5-835364bd4879','978a308d-482e-4b18-ab4e-f897dad8dd86','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2220100,0,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1),
('a0b4ccec-04c7-434e-ba75-e01b7bae23a2','978a308d-482e-4b18-ab4e-f897dad8dd86','3617ab1f-16e0-4887-a9d9-9e4c13563e0f',0,2220100,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1),
('0fb5860a-3216-4356-a3da-9def610ae823','75ce6e36-ace6-4a5f-97b2-a06979b73696','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2000000,0,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1),
('739a91b2-a18d-4247-86c7-c5ff6fb62383','75ce6e36-ace6-4a5f-97b2-a06979b73696','3617ab1f-16e0-4887-a9d9-9e4c13563e0f',0,2000000,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1),
('e0815b8f-e5b9-4070-a4c9-2c7e693eeef7','01227295-b3b0-474b-8354-718fff2ecf1c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2000000,0,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1),
('41924158-24f0-445f-aff3-1f8e9a876bd3','01227295-b3b0-474b-8354-718fff2ecf1c','3617ab1f-16e0-4887-a9d9-9e4c13563e0f',0,2000000,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1),
('c3990bbd-3cf2-43ff-83ee-1e2c98f647ba','33ccc424-92a8-4908-bd67-a63b879c7d69','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1150000,0,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1),
('4baa71e5-a884-4f38-8401-e6d362af6cba','33ccc424-92a8-4908-bd67-a63b879c7d69','3617ab1f-16e0-4887-a9d9-9e4c13563e0f',0,1150000,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1),
('62875b22-b555-450f-93f7-7e3632fcd140','d161ab4f-9096-413e-aff9-1a21cda722a6','23d1cabd-e89f-4bd8-a208-91f59c3898c2',75000,0,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1),
('4b7a2fb3-dbdc-475b-8990-29cfa4a290c9','d161ab4f-9096-413e-aff9-1a21cda722a6','3617ab1f-16e0-4887-a9d9-9e4c13563e0f',0,75000,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1),
('65799f82-9c59-47d3-9885-634e8f6f2367','55b9fd4e-eb1a-4da7-ace7-54a66652694c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2925000,0,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1),
('6cd4e948-4fae-4897-b85a-52e310516de9','55b9fd4e-eb1a-4da7-ace7-54a66652694c','3617ab1f-16e0-4887-a9d9-9e4c13563e0f',0,2925000,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1),
('00a01095-f25d-4403-9bfc-395531280789','d526c6cd-feca-4dd2-976a-10bdcc55a0b9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1250500,0,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1),
('c74b8df2-8ef7-44db-bcec-ee1da5a67030','d526c6cd-feca-4dd2-976a-10bdcc55a0b9','3617ab1f-16e0-4887-a9d9-9e4c13563e0f',0,1250500,NULL,NULL,'Bhuvaneswari Agencies','Payment receipt',1,NOW(),1);

-- ======= BrowAnts Innovations =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('b86abcd8-4ec4-4ef7-ba15-c3193139d029','56eed4e8-381a-40a0-b5be-786a773656ed','b526acaa-fc1d-4876-bed2-6eeb54615007','6edd84d4-6e9e-45fa-bcdf-a50227cfa2db','ffe8e14c-57ae-4f97-b535-e0833713d4cf','843cc883-6a5a-4012-8f0a-40f74a68d8ac');
DELETE FROM journal_lines WHERE journal_id IN ('ddf73b8a-47d5-4449-bb40-e2136fc6e60e','e7682ba1-68ad-4d5e-bca1-d1e070526c64','f2bd29b4-f424-411b-8998-a44926454620','b5dafce8-4f5c-42b0-9be7-e4464707320c','f9728e6d-b101-4231-bae2-540ea441a8d0','1a71e75e-93a2-44d4-b505-de18df1ce2e9','30835146-5164-4e85-b788-ad853b1a23e6','cce5b067-53e3-4a5d-93e4-778ef1cfb261','03f3dd13-273d-4955-bf58-b5d32893c05d','b7d7ad77-9c5b-493d-936e-2ca1964d5f4c','eb75c1d4-2de1-47dc-96ad-914869146ce8','817edb9f-4c32-4beb-b2c4-668949b4c088','8221467d-f322-414d-985a-27af43060617','189966d8-75ef-4f18-94d7-9345d0b50bed','e7d4347a-afbc-4ae4-bf5c-bac991cd5f7a','230723b1-1b1c-46d1-95b2-83f8f227c5ca','53de084d-b867-4c20-b6b0-64247c6f6c1d');
DELETE FROM journal_entries WHERE id IN ('ddf73b8a-47d5-4449-bb40-e2136fc6e60e','e7682ba1-68ad-4d5e-bca1-d1e070526c64','f2bd29b4-f424-411b-8998-a44926454620','b5dafce8-4f5c-42b0-9be7-e4464707320c','f9728e6d-b101-4231-bae2-540ea441a8d0','1a71e75e-93a2-44d4-b505-de18df1ce2e9','30835146-5164-4e85-b788-ad853b1a23e6','cce5b067-53e3-4a5d-93e4-778ef1cfb261','03f3dd13-273d-4955-bf58-b5d32893c05d','b7d7ad77-9c5b-493d-936e-2ca1964d5f4c','eb75c1d4-2de1-47dc-96ad-914869146ce8','817edb9f-4c32-4beb-b2c4-668949b4c088','8221467d-f322-414d-985a-27af43060617','189966d8-75ef-4f18-94d7-9345d0b50bed','e7d4347a-afbc-4ae4-bf5c-bac991cd5f7a','230723b1-1b1c-46d1-95b2-83f8f227c5ca','53de084d-b867-4c20-b6b0-64247c6f6c1d');
DELETE FROM invoice_payments WHERE id IN ('a9c2e08c-75a4-4534-b09b-58cbdd52d09a','30d4a4fa-d4bd-4e69-8d40-b3b4ba3b62d8','7eb44951-af6e-4160-866f-e98e6c897abd','b6ebc5d9-05e5-4368-b7f3-13eab5f3fd3c','cb5e1aeb-2203-4c07-a750-a7e77ae21886','d00535d2-b325-4cde-9728-2b513e22ad18','5dcbfa7f-56b4-4b69-95f9-f7ac4dca9bb6','1aa9faa4-2980-4a7c-b36f-7796d672cd84','22e0fdb1-7890-4116-9aab-cd742509f998','6b70da72-3c7b-43ce-931d-cd0e81ff31e0','064d6bd0-ee21-4efa-be7a-1c0fff627a1b','88a8aa5b-9e1b-472f-962a-5202bf09213d','5238313c-7afa-4230-ba85-4b5174ded392','e996cea2-2458-47cc-ae7e-76bdfd2d3f55','6e7786e8-39e4-41ac-95e8-7ec23595560d','6413eafe-fa73-4d93-a8cb-26f678f05747','313f4cd1-af63-415a-bcff-a75f2b7bb7cb');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('104ca567-0cbf-4a8b-bcfb-61e51ad703f5','7e01b548-75c0-46b7-bac5-c72ccb1ae0ce','2025-03-14',2644900,'cash','received','VY-1-A',1,1,NOW(),NOW()),
('d411f9be-bb95-498e-9ece-6fd47f0dcf35','7e01b548-75c0-46b7-bac5-c72ccb1ae0ce','2025-03-14',2644900,'cash','received','VY-1-B',1,1,NOW(),NOW()),
('75825c94-7ea0-4e90-9c02-71ac98d113e7','7e01b548-75c0-46b7-bac5-c72ccb1ae0ce','2025-03-14',2348300,'cash','received','VY-1-C',1,1,NOW(),NOW()),
('1bf54cf6-5da9-4fe4-ae4f-e3c8b99bb310','19e42960-9f49-4e4e-9b95-77ffe9fc2c65','2025-03-14',157400,'cash','received','VY-2-A',1,1,NOW(),NOW()),
('b9587816-e376-4b60-a1f4-93bdb9780329','19e42960-9f49-4e4e-9b95-77ffe9fc2c65','2025-03-14',2505700,'cash','received','VY-2-B',1,1,NOW(),NOW()),
('e78a343d-dc94-4112-ba5d-cb0f791ddba0','19e42960-9f49-4e4e-9b95-77ffe9fc2c65','2025-03-14',4975000,'cash','received','VY-2-C',1,1,NOW(),NOW()),
('4a26130f-5a8c-47e4-9b69-50a76a30afe0','e053e887-5d5a-40ed-b6d1-ca236e270a71','2025-03-14',2505700,'cash','received','VY-4-A',1,1,NOW(),NOW()),
('c2986a84-a96e-473c-bbe5-6f850e204299','34e217f5-9f28-4fa8-b9c3-142527a05c92','2025-03-14',157400,'cash','received','VY-6-A',1,1,NOW(),NOW()),
('32cfe451-d7ab-452a-b2da-eb22779a3f7b','34e217f5-9f28-4fa8-b9c3-142527a05c92','2025-03-14',2348300,'cash','received','VY-6-B',1,1,NOW(),NOW()),
('92a1a4fb-0939-49b3-abf4-c3da4be59c15','7157e6e9-c234-48c0-b31c-725806f6619a','2025-03-14',2644900,'cash','received','VY-11-A',1,1,NOW(),NOW()),
('5b930a4a-d4d6-4cff-85bc-81f01d0b33e6','8fe41057-d577-45d5-aab9-bf060fb809f3','2025-03-14',2644900,'cash','received','VY-12-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('17e7b98c-31c5-423b-8bcd-50d5eb06e59a','JRN-20261003-0018','2025-03-14','payment','104ca567-0cbf-4a8b-bcfb-61e51ad703f5','Payment from BrowAnts Innovations - VY-1-A','posted',1,2644900,2644900,1,1,NOW(),NOW()),
('e50f93fd-f624-40d7-814d-444f31e91b94','JRN-20261003-0019','2025-03-14','payment','d411f9be-bb95-498e-9ece-6fd47f0dcf35','Payment from BrowAnts Innovations - VY-1-B','posted',1,2644900,2644900,1,1,NOW(),NOW()),
('9c472e62-010e-4880-92ac-d4ef4ca2b42e','JRN-20261003-0020','2025-03-14','payment','75825c94-7ea0-4e90-9c02-71ac98d113e7','Payment from BrowAnts Innovations - VY-1-C','posted',1,2348300,2348300,1,1,NOW(),NOW()),
('95a5e313-0740-436a-9896-b4cff8faefc0','JRN-20261003-0021','2025-03-14','payment','1bf54cf6-5da9-4fe4-ae4f-e3c8b99bb310','Payment from BrowAnts Innovations - VY-2-A','posted',1,157400,157400,1,1,NOW(),NOW()),
('dbbc4189-a9c2-4694-8cbf-898bcf90f3dd','JRN-20261003-0022','2025-03-14','payment','b9587816-e376-4b60-a1f4-93bdb9780329','Payment from BrowAnts Innovations - VY-2-B','posted',1,2505700,2505700,1,1,NOW(),NOW()),
('bdacc7b0-b4c0-4fd8-9bb7-46b4d539aebd','JRN-20261003-0023','2025-03-14','payment','e78a343d-dc94-4112-ba5d-cb0f791ddba0','Payment from BrowAnts Innovations - VY-2-C','posted',1,4975000,4975000,1,1,NOW(),NOW()),
('c05e1cf4-76f9-4a54-a2f6-413d78c0e153','JRN-20261003-0024','2025-03-14','payment','4a26130f-5a8c-47e4-9b69-50a76a30afe0','Payment from BrowAnts Innovations - VY-4-A','posted',1,2505700,2505700,1,1,NOW(),NOW()),
('5ee149dd-ada0-4b5c-9784-967ff1fb1c16','JRN-20261003-0025','2025-03-14','payment','c2986a84-a96e-473c-bbe5-6f850e204299','Payment from BrowAnts Innovations - VY-6-A','posted',1,157400,157400,1,1,NOW(),NOW()),
('43243c09-69cb-4af7-a067-cf8e1a7c4ce4','JRN-20261003-0026','2025-03-14','payment','32cfe451-d7ab-452a-b2da-eb22779a3f7b','Payment from BrowAnts Innovations - VY-6-B','posted',1,2348300,2348300,1,1,NOW(),NOW()),
('738fc70e-944f-4461-b85e-0f48b2f801fb','JRN-20261003-0027','2025-03-14','payment','92a1a4fb-0939-49b3-abf4-c3da4be59c15','Payment from BrowAnts Innovations - VY-11-A','posted',1,2644900,2644900,1,1,NOW(),NOW()),
('7e01c956-9598-47ec-af08-e36d4e65a23e','JRN-20261003-0028','2025-03-14','payment','5b930a4a-d4d6-4cff-85bc-81f01d0b33e6','Payment from BrowAnts Innovations - VY-12-A','posted',1,2644900,2644900,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('ed5791d1-07a7-480e-9f17-6afd779d19b1','17e7b98c-31c5-423b-8bcd-50d5eb06e59a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2644900,0,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('568c8b82-157a-4318-bafe-9dd500db233c','17e7b98c-31c5-423b-8bcd-50d5eb06e59a','cb91ad4a-1767-41e2-821e-5cb872643f6f',0,2644900,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('b30cab02-24e1-4b37-90b5-4ca53541b095','e50f93fd-f624-40d7-814d-444f31e91b94','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2644900,0,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('6ed0c155-8865-4923-9fa2-b4b6e9a3f6a4','e50f93fd-f624-40d7-814d-444f31e91b94','cb91ad4a-1767-41e2-821e-5cb872643f6f',0,2644900,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('0c723617-27ba-4cec-b6ad-712c39fc0b88','9c472e62-010e-4880-92ac-d4ef4ca2b42e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2348300,0,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('3ae45335-f8b7-42e6-b624-f9ddc7a77a52','9c472e62-010e-4880-92ac-d4ef4ca2b42e','cb91ad4a-1767-41e2-821e-5cb872643f6f',0,2348300,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('80b73c5c-8793-417c-8eaf-b0d0b33ab15c','95a5e313-0740-436a-9896-b4cff8faefc0','23d1cabd-e89f-4bd8-a208-91f59c3898c2',157400,0,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('ebace15a-4a07-45ec-a26f-e0190a1889da','95a5e313-0740-436a-9896-b4cff8faefc0','cb91ad4a-1767-41e2-821e-5cb872643f6f',0,157400,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('0b16ca8a-737a-473a-9ef0-0cd264c54856','dbbc4189-a9c2-4694-8cbf-898bcf90f3dd','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2505700,0,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('5fc9afaf-7db7-4088-9164-9aba742e4e86','dbbc4189-a9c2-4694-8cbf-898bcf90f3dd','cb91ad4a-1767-41e2-821e-5cb872643f6f',0,2505700,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('2bd430e5-b9a1-4f77-8180-32859344232c','bdacc7b0-b4c0-4fd8-9bb7-46b4d539aebd','23d1cabd-e89f-4bd8-a208-91f59c3898c2',4975000,0,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('416a6f75-bc55-42d1-808a-05d19af8812f','bdacc7b0-b4c0-4fd8-9bb7-46b4d539aebd','cb91ad4a-1767-41e2-821e-5cb872643f6f',0,4975000,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('c0f28206-1745-4f67-a416-004e2a663b51','c05e1cf4-76f9-4a54-a2f6-413d78c0e153','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2505700,0,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('cead2e29-662e-4057-8a9a-06df5729a667','c05e1cf4-76f9-4a54-a2f6-413d78c0e153','cb91ad4a-1767-41e2-821e-5cb872643f6f',0,2505700,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('97f51174-467e-4d55-b658-668ee617a6cf','5ee149dd-ada0-4b5c-9784-967ff1fb1c16','23d1cabd-e89f-4bd8-a208-91f59c3898c2',157400,0,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('d6ac15c8-a363-4c09-b449-52c33b911cd6','5ee149dd-ada0-4b5c-9784-967ff1fb1c16','cb91ad4a-1767-41e2-821e-5cb872643f6f',0,157400,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('06646f56-647b-4b7a-9fc2-b3cbf6923158','43243c09-69cb-4af7-a067-cf8e1a7c4ce4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2348300,0,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('f467aa85-51f0-40ec-9896-182dc4748470','43243c09-69cb-4af7-a067-cf8e1a7c4ce4','cb91ad4a-1767-41e2-821e-5cb872643f6f',0,2348300,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('202dd442-255b-4105-99aa-de72fcbd56d5','738fc70e-944f-4461-b85e-0f48b2f801fb','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2644900,0,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('28a235a3-5b13-469c-b3b1-cd3d451cacad','738fc70e-944f-4461-b85e-0f48b2f801fb','cb91ad4a-1767-41e2-821e-5cb872643f6f',0,2644900,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('a530e85a-7299-4dec-a199-ef012fb19bec','7e01c956-9598-47ec-af08-e36d4e65a23e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2644900,0,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1),
('352e53c4-f857-41ad-9d0d-28f0bf9ff373','7e01c956-9598-47ec-af08-e36d4e65a23e','cb91ad4a-1767-41e2-821e-5cb872643f6f',0,2644900,NULL,NULL,'BrowAnts Innovations','Payment receipt',1,NOW(),1);

-- ======= COCO GOPALAPATNAM (Old SIMHACHALAM DEVASTHANAM) =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('49c9f435-e17e-4d99-be3d-cb9af5658c4d','4f9efeb1-ef51-40e7-8e38-7f8e2afcb9f0');
DELETE FROM journal_lines WHERE journal_id IN ('f2eaaade-f494-4fa4-9173-43aa49a6c3b8','da802f82-9f81-4055-bbf9-0e058bbab2c1');
DELETE FROM journal_entries WHERE id IN ('f2eaaade-f494-4fa4-9173-43aa49a6c3b8','da802f82-9f81-4055-bbf9-0e058bbab2c1');
DELETE FROM invoice_payments WHERE id IN ('13a2dc36-b7e8-43c6-9cbd-d00d3a09a61e','04fc8cb6-2cd3-4441-b3fb-a9eb57e5eb0b');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('12422b5f-9fb8-451a-98a4-0e91c142fade','3dc86780-a79b-49c5-8d87-afcaa6c17e39','2025-08-20',172100,'cash','received','VY-248-A',1,1,NOW(),NOW()),
('e34d18ab-4310-425b-b390-6fab417ac0fb','15c03dc8-01db-4c32-82d7-ce5eb7097498','2025-10-16',378100,'cash','received','VY-299-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('19a8c8ce-d113-4c8f-bb28-ed09370c072b','JRN-20261003-0029','2025-08-20','payment','12422b5f-9fb8-451a-98a4-0e91c142fade','Payment from COCO GOPALAPATNAM (Old SIMHACHALAM DEVASTHANAM) - VY-248-A','posted',1,172100,172100,1,1,NOW(),NOW()),
('b7803ec7-3524-47d2-84df-71277cc5044d','JRN-20261003-0030','2025-10-16','payment','e34d18ab-4310-425b-b390-6fab417ac0fb','Payment from COCO GOPALAPATNAM (Old SIMHACHALAM DEVASTHANAM) - VY-299-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('13a43a5f-a09d-4b21-a56b-4e1ff4121a29','19a8c8ce-d113-4c8f-bb28-ed09370c072b','23d1cabd-e89f-4bd8-a208-91f59c3898c2',172100,0,NULL,NULL,'COCO GOPALAPATNAM (Old SIMHACHALAM DEVASTHANAM)','Payment receipt',1,NOW(),1),
('dcb131cb-9b2f-43d8-a0b9-096d7fb5837f','19a8c8ce-d113-4c8f-bb28-ed09370c072b','fe471eee-7527-4317-bde1-19733593535d',0,172100,NULL,NULL,'COCO GOPALAPATNAM (Old SIMHACHALAM DEVASTHANAM)','Payment receipt',1,NOW(),1),
('6d5f0120-260d-42ae-bccb-3b214166b8f7','b7803ec7-3524-47d2-84df-71277cc5044d','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'COCO GOPALAPATNAM (Old SIMHACHALAM DEVASTHANAM)','Payment receipt',1,NOW(),1),
('b456b1f5-7007-402b-a889-74ceca4e36eb','b7803ec7-3524-47d2-84df-71277cc5044d','fe471eee-7527-4317-bde1-19733593535d',0,378100,NULL,NULL,'COCO GOPALAPATNAM (Old SIMHACHALAM DEVASTHANAM)','Payment receipt',1,NOW(),1);

-- ======= Chitturi Rajesh =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('4cca0bbc-3c06-4f85-9a9e-2bcefb0c99ab','5aa9446d-601c-45d1-ac4a-b10398918688','9a66051d-bf66-4e41-a52a-75d7a34e0d8c','fe1b2cb5-0bcc-4f2e-92fd-f8c777fed46e','0729b77f-1f8c-4616-a57e-0eccde3829a6','da6eaa29-833d-4a98-b08b-1cbc8f052075');
DELETE FROM journal_lines WHERE journal_id IN ('e05377ff-00d8-4927-96f4-6d72fbce0a58','9a272617-0c87-4f35-992c-47081ba86a9d','b27d33e1-1503-4401-b89e-8963a035037f');
DELETE FROM journal_entries WHERE id IN ('e05377ff-00d8-4927-96f4-6d72fbce0a58','9a272617-0c87-4f35-992c-47081ba86a9d','b27d33e1-1503-4401-b89e-8963a035037f');
DELETE FROM invoice_payments WHERE id IN ('7850f229-556f-47d5-adaf-b10c58a1a531','63cc9c9d-d993-4fa8-a691-d67f858adbb0','d4a4a08c-7b2c-439d-b34c-0f0ec683c5d2');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('9954e068-0604-420a-88cd-ab672fe74166','279aab57-4fd5-4364-87ed-36b971cd3d94','2025-03-22',574900,'cash','received','VY-10-A',1,1,NOW(),NOW()),
('5fa0874a-219b-4297-a0ea-533c26e87020','279aab57-4fd5-4364-87ed-36b971cd3d94','2025-05-30',1900000,'cash','received','VY-10-B',1,1,NOW(),NOW()),
('5bf310c0-18f3-47b3-a6d4-41934278e31e','279aab57-4fd5-4364-87ed-36b971cd3d94','2025-06-17',1850000,'cash','received','VY-10-C',1,1,NOW(),NOW()),
('b10dd746-997a-4646-9b39-a96ec914e595','279aab57-4fd5-4364-87ed-36b971cd3d94','2025-07-05',125000,'cash','received','VY-10-D',1,1,NOW(),NOW()),
('712acc27-042f-4394-b9d4-f1441e4619a6','c674215c-a95c-4db6-9c5b-c67751ea7010','2025-07-05',475000,'cash','received','VY-143-A',1,1,NOW(),NOW()),
('c5fe1fea-92a4-4240-9210-b8175af54087','c674215c-a95c-4db6-9c5b-c67751ea7010','2025-07-14',1050000,'cash','received','VY-143-B',1,1,NOW(),NOW()),
('15ae11b5-aac1-4ab8-a44d-05ba66dac044','c674215c-a95c-4db6-9c5b-c67751ea7010','2025-08-13',1465000,'cash','received','VY-143-C',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('69da0397-2b73-4def-9bc6-0b43f89467a1','JRN-20261003-0031','2025-03-22','payment','9954e068-0604-420a-88cd-ab672fe74166','Payment from Chitturi Rajesh - VY-10-A','posted',1,574900,574900,1,1,NOW(),NOW()),
('05b906cf-a649-401e-9e6f-e418fb28f981','JRN-20261003-0032','2025-05-30','payment','5fa0874a-219b-4297-a0ea-533c26e87020','Payment from Chitturi Rajesh - VY-10-B','posted',1,1900000,1900000,1,1,NOW(),NOW()),
('ecd0b410-55d0-4ad2-ba27-c14f80309b7b','JRN-20261003-0033','2025-06-17','payment','5bf310c0-18f3-47b3-a6d4-41934278e31e','Payment from Chitturi Rajesh - VY-10-C','posted',1,1850000,1850000,1,1,NOW(),NOW()),
('04c38cce-b912-41e8-aecd-e1c5ed56024c','JRN-20261003-0034','2025-07-05','payment','b10dd746-997a-4646-9b39-a96ec914e595','Payment from Chitturi Rajesh - VY-10-D','posted',1,125000,125000,1,1,NOW(),NOW()),
('29e583ac-63d2-4482-ac31-30cb39424897','JRN-20261003-0035','2025-07-05','payment','712acc27-042f-4394-b9d4-f1441e4619a6','Payment from Chitturi Rajesh - VY-143-A','posted',1,475000,475000,1,1,NOW(),NOW()),
('17283f0c-747e-4706-936e-118dd83e673f','JRN-20261003-0036','2025-07-14','payment','c5fe1fea-92a4-4240-9210-b8175af54087','Payment from Chitturi Rajesh - VY-143-B','posted',1,1050000,1050000,1,1,NOW(),NOW()),
('02e49769-1dfa-4e45-896b-f37ad7b079a1','JRN-20261003-0037','2025-08-13','payment','15ae11b5-aac1-4ab8-a44d-05ba66dac044','Payment from Chitturi Rajesh - VY-143-C','posted',1,1465000,1465000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('d2893193-815f-4884-9fee-4a35b89ef237','69da0397-2b73-4def-9bc6-0b43f89467a1','23d1cabd-e89f-4bd8-a208-91f59c3898c2',574900,0,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1),
('11181181-287a-468d-8db7-75c4c44d5432','69da0397-2b73-4def-9bc6-0b43f89467a1','20acc770-8ae4-4b43-b360-052b74178563',0,574900,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1),
('71f115e0-16ba-4940-9cbe-44a46e08c626','05b906cf-a649-401e-9e6f-e418fb28f981','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1900000,0,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1),
('9c85a701-3620-42cf-b467-1693c64c8e87','05b906cf-a649-401e-9e6f-e418fb28f981','20acc770-8ae4-4b43-b360-052b74178563',0,1900000,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1),
('9f1158d2-6d37-485e-b869-3c3298009bb5','ecd0b410-55d0-4ad2-ba27-c14f80309b7b','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1850000,0,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1),
('b67460ce-9ac3-4176-b4bc-109f1ce5bc7f','ecd0b410-55d0-4ad2-ba27-c14f80309b7b','20acc770-8ae4-4b43-b360-052b74178563',0,1850000,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1),
('730187f3-5968-46c7-a1ea-88f50c22f1ca','04c38cce-b912-41e8-aecd-e1c5ed56024c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',125000,0,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1),
('9f7f86af-b23e-408c-b4e8-02d607ebf688','04c38cce-b912-41e8-aecd-e1c5ed56024c','20acc770-8ae4-4b43-b360-052b74178563',0,125000,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1),
('59ead8bf-2f55-47e1-b36b-2026138c058d','29e583ac-63d2-4482-ac31-30cb39424897','23d1cabd-e89f-4bd8-a208-91f59c3898c2',475000,0,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1),
('9a4b4d2c-0e1c-45e8-b451-7778ff844a39','29e583ac-63d2-4482-ac31-30cb39424897','20acc770-8ae4-4b43-b360-052b74178563',0,475000,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1),
('b9f9ec9c-5d40-4b7e-ae44-1e9d26d4a610','17283f0c-747e-4706-936e-118dd83e673f','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1050000,0,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1),
('1b7040ad-44f6-40bd-8748-27e15baee6b8','17283f0c-747e-4706-936e-118dd83e673f','20acc770-8ae4-4b43-b360-052b74178563',0,1050000,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1),
('770a69b5-176b-49b9-9f6e-86cddcd7b53e','02e49769-1dfa-4e45-896b-f37ad7b079a1','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1465000,0,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1),
('f9b5f80a-3629-413b-b1b3-5a963da340eb','02e49769-1dfa-4e45-896b-f37ad7b079a1','20acc770-8ae4-4b43-b360-052b74178563',0,1465000,NULL,NULL,'Chitturi Rajesh','Payment receipt',1,NOW(),1);

-- ======= D V RAMACHANDRARAJU =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('ee2078eb-fd93-43a5-99b4-951f49b9a9f0','7b5396e1-d305-4bb7-9e5f-3845e7315e22');
DELETE FROM journal_lines WHERE journal_id IN ('b52d55b4-031e-484a-a0fc-304982fdb210','bddde59c-53a3-4273-9cac-42d1fa0842e7');
DELETE FROM journal_entries WHERE id IN ('b52d55b4-031e-484a-a0fc-304982fdb210','bddde59c-53a3-4273-9cac-42d1fa0842e7');
DELETE FROM invoice_payments WHERE id IN ('753a9337-0a9e-484f-af48-9b65ed49a3bc','04052556-22bf-4f0b-b2d2-3f344bebc831');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('a67a9db5-91fd-46be-b87f-1467a04342ec','49f53d72-41c5-43c7-a37d-87083bf88b0e','2025-08-20',68800,'cash','received','VY-253-A',1,1,NOW(),NOW()),
('23fec870-bedf-4cbf-9285-de99e0d9dd7f','821c636f-fe29-4202-a1c0-317a89a9495d','2025-10-16',378100,'cash','received','VY-282-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('9926040b-4d34-4ac6-9551-3d33f8fbde17','JRN-20261003-0038','2025-08-20','payment','a67a9db5-91fd-46be-b87f-1467a04342ec','Payment from D V RAMACHANDRARAJU - VY-253-A','posted',1,68800,68800,1,1,NOW(),NOW()),
('3851926e-bbbf-46c6-ac4d-58e9d3acaea4','JRN-20261003-0039','2025-10-16','payment','23fec870-bedf-4cbf-9285-de99e0d9dd7f','Payment from D V RAMACHANDRARAJU - VY-282-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('6df17b65-e482-4986-a74f-4f81e15929ee','9926040b-4d34-4ac6-9551-3d33f8fbde17','23d1cabd-e89f-4bd8-a208-91f59c3898c2',68800,0,NULL,NULL,'D V RAMACHANDRARAJU','Payment receipt',1,NOW(),1),
('c778b2ff-3bf0-48f9-a894-d197c035314f','9926040b-4d34-4ac6-9551-3d33f8fbde17','39f3acd5-c869-411c-bfa8-72e7172e6587',0,68800,NULL,NULL,'D V RAMACHANDRARAJU','Payment receipt',1,NOW(),1),
('d5ed85c7-e17c-4a79-ae79-5d782e121c35','3851926e-bbbf-46c6-ac4d-58e9d3acaea4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'D V RAMACHANDRARAJU','Payment receipt',1,NOW(),1),
('026a27ac-bfb8-4f14-b849-a3c48dee00f3','3851926e-bbbf-46c6-ac4d-58e9d3acaea4','39f3acd5-c869-411c-bfa8-72e7172e6587',0,378100,NULL,NULL,'D V RAMACHANDRARAJU','Payment receipt',1,NOW(),1);

-- ======= DUDI SRINU =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('6b05814f-936d-4005-aefe-eab54b9b67b2','c51c1cf0-15a4-4bae-b61c-e74f9ce1efcd');
DELETE FROM journal_lines WHERE journal_id IN ('e71a7c3b-aab2-481f-8fa7-7dd4a8940c14','e5926a74-2da6-4575-a4ea-54e63bc4b140');
DELETE FROM journal_entries WHERE id IN ('e71a7c3b-aab2-481f-8fa7-7dd4a8940c14','e5926a74-2da6-4575-a4ea-54e63bc4b140');
DELETE FROM invoice_payments WHERE id IN ('561efff0-17d1-49d1-87ee-c02d57f29097','4c014e1e-4a9e-48cf-a347-8f508166d058');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('aff4a78e-dfcf-4cbf-8ab2-a8ec07f1e047','7716a4ba-2904-481f-82e8-d16069ded5d1','2025-06-27',1500000,'cash','received','VY-191-A',1,1,NOW(),NOW()),
('d19347dc-8587-446d-a9c7-c7c5c8e66709','7716a4ba-2904-481f-82e8-d16069ded5d1','2025-06-30',1770000,'cash','received','VY-191-B',1,1,NOW(),NOW()),
('3813938b-7d1e-41c5-bcec-12aa83f3908b','446299f9-52bd-4e05-a2d5-4252e3997d24','2025-06-30',30000,'cash','received','VY-200-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('adc2988c-5989-41e9-8b85-726e28c239f9','JRN-20261003-0040','2025-06-27','payment','aff4a78e-dfcf-4cbf-8ab2-a8ec07f1e047','Payment from DUDI SRINU - VY-191-A','posted',1,1500000,1500000,1,1,NOW(),NOW()),
('7736d38a-5a14-4491-81cd-a0d32dc9d45e','JRN-20261003-0041','2025-06-30','payment','d19347dc-8587-446d-a9c7-c7c5c8e66709','Payment from DUDI SRINU - VY-191-B','posted',1,1770000,1770000,1,1,NOW(),NOW()),
('03254d3c-45e9-49f6-a245-a9b74bcf470c','JRN-20261003-0042','2025-06-30','payment','3813938b-7d1e-41c5-bcec-12aa83f3908b','Payment from DUDI SRINU - VY-200-A','posted',1,30000,30000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('14cf4966-a106-4930-b6b8-b4ad75ff10e2','adc2988c-5989-41e9-8b85-726e28c239f9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1500000,0,NULL,NULL,'DUDI SRINU','Payment receipt',1,NOW(),1),
('45fbcf57-a537-4078-9148-4570b42a7238','adc2988c-5989-41e9-8b85-726e28c239f9','27205ac4-522e-42ba-a244-46801a56f2fd',0,1500000,NULL,NULL,'DUDI SRINU','Payment receipt',1,NOW(),1),
('a932c850-2e9d-4c6b-9f55-8b39b6628c49','7736d38a-5a14-4491-81cd-a0d32dc9d45e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1770000,0,NULL,NULL,'DUDI SRINU','Payment receipt',1,NOW(),1),
('a204e054-168b-4f9d-ab3e-872244697ee1','7736d38a-5a14-4491-81cd-a0d32dc9d45e','27205ac4-522e-42ba-a244-46801a56f2fd',0,1770000,NULL,NULL,'DUDI SRINU','Payment receipt',1,NOW(),1),
('a1b53aef-90b7-4904-b3c4-94cb5d0c2f79','03254d3c-45e9-49f6-a245-a9b74bcf470c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',30000,0,NULL,NULL,'DUDI SRINU','Payment receipt',1,NOW(),1),
('a5636ef9-87b2-4b45-8c47-cf61609d737b','03254d3c-45e9-49f6-a245-a9b74bcf470c','27205ac4-522e-42ba-a244-46801a56f2fd',0,30000,NULL,NULL,'DUDI SRINU','Payment receipt',1,NOW(),1);

-- ======= GAYATHRI AGENCIES, GAJUW =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('941b9058-4a07-445c-9012-e9ca10b6d8b4');
DELETE FROM journal_lines WHERE journal_id IN ('b1514833-5774-4164-bbfb-6b176862d9c5');
DELETE FROM journal_entries WHERE id IN ('b1514833-5774-4164-bbfb-6b176862d9c5');
DELETE FROM invoice_payments WHERE id IN ('e5c43f1f-fb20-4e25-acfb-0a82ad94fd68');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('6c8fc3c4-6dd1-4081-a6c8-0cfa7e09b181','088d63b6-b82e-4bbb-b1b6-cd46528f44f6','2025-08-20',240000,'cash','received','VY-254-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('892ee688-b478-4b54-8581-de7082ea1ba6','JRN-20261003-0043','2025-08-20','payment','6c8fc3c4-6dd1-4081-a6c8-0cfa7e09b181','Payment from GAYATHRI AGENCIES, GAJUW - VY-254-A','posted',1,240000,240000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('46716e44-c79f-416c-af05-022401c9869e','892ee688-b478-4b54-8581-de7082ea1ba6','23d1cabd-e89f-4bd8-a208-91f59c3898c2',240000,0,NULL,NULL,'GAYATHRI AGENCIES, GAJUW','Payment receipt',1,NOW(),1),
('c87b10a9-0742-48ad-aa79-fb4dbb569ad9','892ee688-b478-4b54-8581-de7082ea1ba6','c557c586-340b-46e4-8159-256a7d656b32',0,240000,NULL,NULL,'GAYATHRI AGENCIES, GAJUW','Payment receipt',1,NOW(),1);

-- ======= GEDELA SRINIVASARAO =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('d9b5ade5-5211-4c43-b691-778151101c91');
DELETE FROM journal_lines WHERE journal_id IN ('c8181c24-9eef-45ff-8aab-572f8019b182');
DELETE FROM journal_entries WHERE id IN ('c8181c24-9eef-45ff-8aab-572f8019b182');
DELETE FROM invoice_payments WHERE id IN ('82928733-1b92-4efe-a4ee-1e0d2012c342');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('a2ab0223-cb3a-4c04-af5b-237d7f06e23b','14926c92-9550-4e5e-86ce-33a353edda26','2025-05-23',1300000,'cash','received','VY-136-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('01562415-dff6-4be8-bc1a-2dbda8b72d73','JRN-20261003-0044','2025-05-23','payment','a2ab0223-cb3a-4c04-af5b-237d7f06e23b','Payment from GEDELA SRINIVASARAO - VY-136-A','posted',1,1300000,1300000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('9216ec86-f810-4bba-936f-3279ece517d2','01562415-dff6-4be8-bc1a-2dbda8b72d73','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1300000,0,NULL,NULL,'GEDELA SRINIVASARAO','Payment receipt',1,NOW(),1),
('45edcf5e-2480-4f90-88d3-8ef344237834','01562415-dff6-4be8-bc1a-2dbda8b72d73','563b6a35-9d8e-48e8-b3a1-dc088a8e2834',0,1300000,NULL,NULL,'GEDELA SRINIVASARAO','Payment receipt',1,NOW(),1);

-- ======= GEDELA SRINUVASURAO =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('1f1a07c4-ba11-4b62-8b17-ee7bdfbeabae','2e39edf3-43ad-4470-b6f5-308e6452afe1','98c716ae-4715-4a51-a880-b48f57d0a3a7');
DELETE FROM journal_lines WHERE journal_id IN ('08c9be49-095f-451b-a89d-19b26f26769c','5bd1eb69-896a-4c38-979e-da9a21943e78');
DELETE FROM journal_entries WHERE id IN ('08c9be49-095f-451b-a89d-19b26f26769c','5bd1eb69-896a-4c38-979e-da9a21943e78');
DELETE FROM invoice_payments WHERE id IN ('a2cb0848-94f1-4b8e-a854-93381b6e618b','663e7330-2b8d-45f2-9c6a-095bca0860ae');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('3081e0f7-577c-4879-8f1b-6b63024bca7e','9f9ba4ec-4d44-4b20-85f5-816855b7d94c','2025-04-07',517600,'cash','received','VY-45-A',1,1,NOW(),NOW()),
('ee821e06-9dbb-4755-b11e-28ab70e4c519','9f9ba4ec-4d44-4b20-85f5-816855b7d94c','2025-05-23',517500,'cash','received','VY-45-B',1,1,NOW(),NOW()),
('19f2fc90-4880-49f7-bd38-3c6e8c8af5f5','9f9ba4ec-4d44-4b20-85f5-816855b7d94c','2025-05-23',577500,'cash','received','VY-45-C',1,1,NOW(),NOW()),
('e95d9862-550f-4983-8164-c5f00a5c1cd6','2288c2c3-d29e-415a-9416-2138c7ee468d','2025-05-23',517500,'cash','received','VY-49-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('b59b9ef7-a5b0-44da-a664-80b3fccf98d2','JRN-20261003-0045','2025-04-07','payment','3081e0f7-577c-4879-8f1b-6b63024bca7e','Payment from GEDELA SRINUVASURAO - VY-45-A','posted',1,517600,517600,1,1,NOW(),NOW()),
('867bea4a-4e45-42a0-87ee-9ca95501b58a','JRN-20261003-0046','2025-05-23','payment','ee821e06-9dbb-4755-b11e-28ab70e4c519','Payment from GEDELA SRINUVASURAO - VY-45-B','posted',1,517500,517500,1,1,NOW(),NOW()),
('4b3b2085-68ca-4c64-80ca-4286373bf4ab','JRN-20261003-0047','2025-05-23','payment','19f2fc90-4880-49f7-bd38-3c6e8c8af5f5','Payment from GEDELA SRINUVASURAO - VY-45-C','posted',1,577500,577500,1,1,NOW(),NOW()),
('1930196b-acf9-4f40-814c-c9852996ad51','JRN-20261003-0048','2025-05-23','payment','e95d9862-550f-4983-8164-c5f00a5c1cd6','Payment from GEDELA SRINUVASURAO - VY-49-A','posted',1,517500,517500,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('ed4ea24b-efbf-44bc-a123-e498853330a2','b59b9ef7-a5b0-44da-a664-80b3fccf98d2','23d1cabd-e89f-4bd8-a208-91f59c3898c2',517600,0,NULL,NULL,'GEDELA SRINUVASURAO','Payment receipt',1,NOW(),1),
('53cab28f-7725-470f-9628-4bbc6e71d895','b59b9ef7-a5b0-44da-a664-80b3fccf98d2','0ead06bc-6ac6-40b9-937f-f1ff534c6991',0,517600,NULL,NULL,'GEDELA SRINUVASURAO','Payment receipt',1,NOW(),1),
('caaab716-4a9b-403e-9b95-4dbe30e1ade5','867bea4a-4e45-42a0-87ee-9ca95501b58a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',517500,0,NULL,NULL,'GEDELA SRINUVASURAO','Payment receipt',1,NOW(),1),
('8278565e-9595-40d7-b69a-fab102cc9915','867bea4a-4e45-42a0-87ee-9ca95501b58a','0ead06bc-6ac6-40b9-937f-f1ff534c6991',0,517500,NULL,NULL,'GEDELA SRINUVASURAO','Payment receipt',1,NOW(),1),
('54dfbdf9-2471-4e74-b458-ab18ad43f32d','4b3b2085-68ca-4c64-80ca-4286373bf4ab','23d1cabd-e89f-4bd8-a208-91f59c3898c2',577500,0,NULL,NULL,'GEDELA SRINUVASURAO','Payment receipt',1,NOW(),1),
('23c61119-6007-4933-805e-9fa20e67a26f','4b3b2085-68ca-4c64-80ca-4286373bf4ab','0ead06bc-6ac6-40b9-937f-f1ff534c6991',0,577500,NULL,NULL,'GEDELA SRINUVASURAO','Payment receipt',1,NOW(),1),
('c9fa4927-2223-4733-8c81-30398b4a7cf9','1930196b-acf9-4f40-814c-c9852996ad51','23d1cabd-e89f-4bd8-a208-91f59c3898c2',517500,0,NULL,NULL,'GEDELA SRINUVASURAO','Payment receipt',1,NOW(),1),
('4121cca0-996e-452c-b299-79bafe481dcf','1930196b-acf9-4f40-814c-c9852996ad51','0ead06bc-6ac6-40b9-937f-f1ff534c6991',0,517500,NULL,NULL,'GEDELA SRINUVASURAO','Payment receipt',1,NOW(),1);

-- ======= Golla Nagendra Rao =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('4a6ffc52-899f-44f6-8226-783358c87d9e');
DELETE FROM journal_lines WHERE journal_id IN ('4fc1d523-4bbe-4de1-9869-f25455776f37');
DELETE FROM journal_entries WHERE id IN ('4fc1d523-4bbe-4de1-9869-f25455776f37');
DELETE FROM invoice_payments WHERE id IN ('02680fa5-d7d6-4cb1-bdff-52119dcb3c88');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('4fbaeebf-4aed-4bc1-9922-3d4c270338e8','d1a33255-83f5-48b3-8943-1d51f7dea9f8','2025-06-12',2150000,'cash','received','VY-150-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('9c4071f2-a0f9-42bb-ad59-001ea2b8a603','JRN-20261003-0049','2025-06-12','payment','4fbaeebf-4aed-4bc1-9922-3d4c270338e8','Payment from Golla Nagendra Rao - VY-150-A','posted',1,2150000,2150000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('a3fc8765-d84a-4ce3-a86a-d80143a62ee1','9c4071f2-a0f9-42bb-ad59-001ea2b8a603','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2150000,0,NULL,NULL,'Golla Nagendra Rao','Payment receipt',1,NOW(),1),
('b7b218d0-ad1c-4049-8377-0047e47098ca','9c4071f2-a0f9-42bb-ad59-001ea2b8a603','b43f369b-9997-40d3-bc55-5b09fc2850f6',0,2150000,NULL,NULL,'Golla Nagendra Rao','Payment receipt',1,NOW(),1);

-- ======= HP SERVICE CENTER GOSALA =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('06e5bbee-770e-4e68-b746-3c1bb80e424b');
DELETE FROM journal_lines WHERE journal_id IN ('54987110-da25-470b-9058-365ab3472b1c');
DELETE FROM journal_entries WHERE id IN ('54987110-da25-470b-9058-365ab3472b1c');
DELETE FROM invoice_payments WHERE id IN ('cfc5de0d-c8a3-4c1d-b585-cee350626f3a');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('03276f36-c4bf-450c-9854-90574ef53bf8','30ead876-e000-4069-83ac-162e6a4d23f3','2025-10-16',378100,'cash','received','VY-290-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('23d09396-f6db-429f-bae6-4d5ee33b7330','JRN-20261003-0050','2025-10-16','payment','03276f36-c4bf-450c-9854-90574ef53bf8','Payment from HP SERVICE CENTER GOSALA - VY-290-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('5554e30b-9522-49a0-9f35-f78d7b290092','23d09396-f6db-429f-bae6-4d5ee33b7330','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'HP SERVICE CENTER GOSALA','Payment receipt',1,NOW(),1),
('ad4e292d-2c2f-4113-8f9b-8a9f3237621a','23d09396-f6db-429f-bae6-4d5ee33b7330','528f60f2-ae86-45fb-a133-84af8c916380',0,378100,NULL,NULL,'HP SERVICE CENTER GOSALA','Payment receipt',1,NOW(),1);

-- ======= INDHU DRINKING WATER SUPPLY =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('54df5291-fcd1-4f88-a81b-63ca8876b918','c5981db4-45fb-461e-80b9-e831b01e7940','b965c4e9-487f-4e6a-b704-4184f0791988','bcb44551-bbdf-4b37-a47f-2bcf621931f0');
DELETE FROM journal_lines WHERE journal_id IN ('516bf486-eff5-4d94-be31-70c92e27f72e','35194293-5781-423a-a5a3-089c0e785489');
DELETE FROM journal_entries WHERE id IN ('516bf486-eff5-4d94-be31-70c92e27f72e','35194293-5781-423a-a5a3-089c0e785489');
DELETE FROM invoice_payments WHERE id IN ('511f1246-2971-45e1-8765-9059785551fe','cf776c90-61bc-41f8-b263-23fc1e04d84c');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('b73e2a67-e873-4af9-a31c-8bbb0804516a','1274227e-49e5-42a9-9f75-e43e7bb6f104','2025-05-10',1275000,'cash','received','VY-99-A',1,1,NOW(),NOW()),
('1012b0c9-ccdd-49fa-9e5a-15ee105600a1','1274227e-49e5-42a9-9f75-e43e7bb6f104','2025-06-06',800000,'cash','received','VY-99-B',1,1,NOW(),NOW()),
('20db626b-444e-4544-aa11-6668499eca0d','4ea1ccbe-cb23-4a5a-9de1-715d5fb45f6c','2025-06-06',400000,'cash','received','VY-137-A',1,1,NOW(),NOW()),
('6d5d7e1c-84ab-4983-b607-afef5dd0d0f5','4ea1ccbe-cb23-4a5a-9de1-715d5fb45f6c','2025-06-09',1200000,'cash','received','VY-137-B',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('7ec5fa8d-75cd-4f8a-acbd-fb61240a66b5','JRN-20261003-0051','2025-05-10','payment','b73e2a67-e873-4af9-a31c-8bbb0804516a','Payment from INDHU DRINKING WATER SUPPLY - VY-99-A','posted',1,1275000,1275000,1,1,NOW(),NOW()),
('45e99573-662e-4f21-b42e-3242ae7b7378','JRN-20261003-0052','2025-06-06','payment','1012b0c9-ccdd-49fa-9e5a-15ee105600a1','Payment from INDHU DRINKING WATER SUPPLY - VY-99-B','posted',1,800000,800000,1,1,NOW(),NOW()),
('17e684ba-47b4-4fd6-a8cf-563f7ea6eb16','JRN-20261003-0053','2025-06-06','payment','20db626b-444e-4544-aa11-6668499eca0d','Payment from INDHU DRINKING WATER SUPPLY - VY-137-A','posted',1,400000,400000,1,1,NOW(),NOW()),
('ba66d325-0aae-4602-9c6d-2a9f448bd776','JRN-20261003-0054','2025-06-09','payment','6d5d7e1c-84ab-4983-b607-afef5dd0d0f5','Payment from INDHU DRINKING WATER SUPPLY - VY-137-B','posted',1,1200000,1200000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('e0cd7dd7-0625-4a6f-8e47-11e5f8de42ba','7ec5fa8d-75cd-4f8a-acbd-fb61240a66b5','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1275000,0,NULL,NULL,'INDHU DRINKING WATER SUPPLY','Payment receipt',1,NOW(),1),
('714c1d3a-b647-4c16-87ec-89d23a5e487a','7ec5fa8d-75cd-4f8a-acbd-fb61240a66b5','4917a1e6-09c6-4915-999f-d140c5bc5e01',0,1275000,NULL,NULL,'INDHU DRINKING WATER SUPPLY','Payment receipt',1,NOW(),1),
('64f58bb9-4816-43b0-a393-9187294a2397','45e99573-662e-4f21-b42e-3242ae7b7378','23d1cabd-e89f-4bd8-a208-91f59c3898c2',800000,0,NULL,NULL,'INDHU DRINKING WATER SUPPLY','Payment receipt',1,NOW(),1),
('b87c45aa-ca7b-4229-bdec-e9e1d732da7d','45e99573-662e-4f21-b42e-3242ae7b7378','4917a1e6-09c6-4915-999f-d140c5bc5e01',0,800000,NULL,NULL,'INDHU DRINKING WATER SUPPLY','Payment receipt',1,NOW(),1),
('e8c7c70e-bb2d-4228-88f0-b026b67248dd','17e684ba-47b4-4fd6-a8cf-563f7ea6eb16','23d1cabd-e89f-4bd8-a208-91f59c3898c2',400000,0,NULL,NULL,'INDHU DRINKING WATER SUPPLY','Payment receipt',1,NOW(),1),
('42fb92fb-0ea6-4386-a25a-db23828dcf27','17e684ba-47b4-4fd6-a8cf-563f7ea6eb16','4917a1e6-09c6-4915-999f-d140c5bc5e01',0,400000,NULL,NULL,'INDHU DRINKING WATER SUPPLY','Payment receipt',1,NOW(),1),
('7d78b68e-8920-411e-ae74-f0c9255f79a5','ba66d325-0aae-4602-9c6d-2a9f448bd776','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1200000,0,NULL,NULL,'INDHU DRINKING WATER SUPPLY','Payment receipt',1,NOW(),1),
('26a9634a-8a80-40be-a21f-94b8cf9886b8','ba66d325-0aae-4602-9c6d-2a9f448bd776','4917a1e6-09c6-4915-999f-d140c5bc5e01',0,1200000,NULL,NULL,'INDHU DRINKING WATER SUPPLY','Payment receipt',1,NOW(),1);

-- ======= JSN TRADERS =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('5a134d61-bf6f-4eb1-b92d-5d650c89803a');
DELETE FROM journal_lines WHERE journal_id IN ('4765b85e-f691-4a7c-9dc9-62f6bf7cb0c2');
DELETE FROM journal_entries WHERE id IN ('4765b85e-f691-4a7c-9dc9-62f6bf7cb0c2');
DELETE FROM invoice_payments WHERE id IN ('497f7827-d47b-4926-a252-7d9a2b97b595');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('5f95beaa-2f5b-43ce-a36c-dcb8fc1c32cf','a9ad1fbc-2ce0-4ba7-96b8-4deab802a9a1','2025-06-13',1000000,'cash','received','VY-160-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('1d564633-4321-43b0-9d46-950c53ca7344','JRN-20261003-0055','2025-06-13','payment','5f95beaa-2f5b-43ce-a36c-dcb8fc1c32cf','Payment from JSN TRADERS - VY-160-A','posted',1,1000000,1000000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('9a3370a8-7adf-4145-a5cb-38e13df48097','1d564633-4321-43b0-9d46-950c53ca7344','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1000000,0,NULL,NULL,'JSN TRADERS','Payment receipt',1,NOW(),1),
('1791f371-a285-4cbc-8280-ebd76e54861a','1d564633-4321-43b0-9d46-950c53ca7344','8b6f2a30-7ff2-440a-9a1f-8010c7b5aedd',0,1000000,NULL,NULL,'JSN TRADERS','Payment receipt',1,NOW(),1);

-- ======= KARIMAJJI GOVIND =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('be05ba8e-3806-4763-9eb2-bce8cbfb261c','48ea4640-d19b-4783-852e-58e386988a9e');
DELETE FROM journal_lines WHERE journal_id IN ('741eed01-e9c5-49f6-b63e-f585c1a91fd9','85704ed2-6a19-41d0-a362-cb5ff5b8afcd');
DELETE FROM journal_entries WHERE id IN ('741eed01-e9c5-49f6-b63e-f585c1a91fd9','85704ed2-6a19-41d0-a362-cb5ff5b8afcd');
DELETE FROM invoice_payments WHERE id IN ('081c6a5d-79a9-44e5-af4f-5352403fefae','4d90160c-3b67-4e12-bc62-161c9ebae2c2');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('bc22db84-0843-48ba-bdbe-2133afe3077a','de571dbb-c01d-44be-bef3-4350fa95d108','2025-06-17',3150000,'cash','received','VY-182-A',1,1,NOW(),NOW()),
('294fc987-8a11-4e4c-afe6-614820a77b74','1bbe96f3-4578-442c-8fcf-9ca9b90480fa','2025-07-07',3150000,'cash','received','VY-187-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('1128f526-8902-4d1b-a0c0-33048450e967','JRN-20261003-0056','2025-06-17','payment','bc22db84-0843-48ba-bdbe-2133afe3077a','Payment from KARIMAJJI GOVIND - VY-182-A','posted',1,3150000,3150000,1,1,NOW(),NOW()),
('2c96337a-e72d-499f-9dd9-037a1c976780','JRN-20261003-0057','2025-07-07','payment','294fc987-8a11-4e4c-afe6-614820a77b74','Payment from KARIMAJJI GOVIND - VY-187-A','posted',1,3150000,3150000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('4fe27103-456d-48a0-9169-4aecbed779cf','1128f526-8902-4d1b-a0c0-33048450e967','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3150000,0,NULL,NULL,'KARIMAJJI GOVIND','Payment receipt',1,NOW(),1),
('fb69f1fa-be90-4606-8f70-5ed1df65b2d3','1128f526-8902-4d1b-a0c0-33048450e967','ab07ab27-a6e8-4667-b52a-87ba202abcf7',0,3150000,NULL,NULL,'KARIMAJJI GOVIND','Payment receipt',1,NOW(),1),
('ba0624cc-8ce6-4250-a4c6-c5a182ac3c9a','2c96337a-e72d-499f-9dd9-037a1c976780','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3150000,0,NULL,NULL,'KARIMAJJI GOVIND','Payment receipt',1,NOW(),1),
('fb628590-60d0-405b-8d1c-b3dc77221dfd','2c96337a-e72d-499f-9dd9-037a1c976780','ab07ab27-a6e8-4667-b52a-87ba202abcf7',0,3150000,NULL,NULL,'KARIMAJJI GOVIND','Payment receipt',1,NOW(),1);

-- ======= KARUNAMAYA PETROLEUM VIS =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('3b831896-3876-43b9-b65c-6e4d6db9d2bb');
DELETE FROM journal_lines WHERE journal_id IN ('ab1ed0c0-2661-440e-a41a-eaacbbebfef1');
DELETE FROM journal_entries WHERE id IN ('ab1ed0c0-2661-440e-a41a-eaacbbebfef1');
DELETE FROM invoice_payments WHERE id IN ('6589fdc7-8396-49df-b6c1-bf6d36b6c275');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('16b079f8-74bd-4cd0-bc93-7cc7208826fb','d0b5577f-7986-4c2a-810d-cb41fc1876df','2025-08-20',232100,'cash','received','VY-250-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('184c0957-9887-47ad-892a-e5f959bc4459','JRN-20261003-0058','2025-08-20','payment','16b079f8-74bd-4cd0-bc93-7cc7208826fb','Payment from KARUNAMAYA PETROLEUM VIS - VY-250-A','posted',1,232100,232100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('37cc3f4c-cabb-464b-aa24-319fe6839799','184c0957-9887-47ad-892a-e5f959bc4459','23d1cabd-e89f-4bd8-a208-91f59c3898c2',232100,0,NULL,NULL,'KARUNAMAYA PETROLEUM VIS','Payment receipt',1,NOW(),1),
('bfeb6f2c-3cad-43cb-9a8b-6fb7bc1056a6','184c0957-9887-47ad-892a-e5f959bc4459','0601a013-63c0-47e2-bf58-47318c204232',0,232100,NULL,NULL,'KARUNAMAYA PETROLEUM VIS','Payment receipt',1,NOW(),1);

-- ======= KEERTHI ICE CREAM PARLOUR-NAIDU =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('27ed246f-e73a-4503-b218-bdf4342c3b21','ee68a44b-da38-426b-bdbe-ccd720cae1f0');
DELETE FROM journal_lines WHERE journal_id IN ('e5577f92-5cc2-4c0b-8605-c3f5cedbb1e0','5cba8fee-9747-4567-b3b0-ee9ea98f90ac');
DELETE FROM journal_entries WHERE id IN ('e5577f92-5cc2-4c0b-8605-c3f5cedbb1e0','5cba8fee-9747-4567-b3b0-ee9ea98f90ac');
DELETE FROM invoice_payments WHERE id IN ('b4b61af0-c163-4d96-a4e3-c1631c49b7a0','fd2aad4b-703a-4e2c-9876-448dcc2aa62d');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('1cb894a3-adf9-49f8-8387-267d4074033e','06813ef9-3de4-4c7f-a935-40347e7aa532','2025-05-15',1200000,'cash','received','VY-120-A',1,1,NOW(),NOW()),
('c4aa9a38-d483-4953-8a3c-9d8c118303f2','06813ef9-3de4-4c7f-a935-40347e7aa532','2025-06-21',100,'cash','received','VY-120-B',1,1,NOW(),NOW()),
('da5f5a90-a4af-48bc-bfd2-883bf36f7a9e','8f0b4aae-c631-4d66-935d-ed81ccc0e76f','2025-06-21',2319900,'cash','received','VY-142-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('92450154-6c0c-44db-a0e5-710593fb8111','JRN-20261003-0059','2025-05-15','payment','1cb894a3-adf9-49f8-8387-267d4074033e','Payment from KEERTHI ICE CREAM PARLOUR-NAIDU - VY-120-A','posted',1,1200000,1200000,1,1,NOW(),NOW()),
('f6bb7b6b-519c-4a07-9240-cd03f0889d3a','JRN-20261003-0060','2025-06-21','payment','c4aa9a38-d483-4953-8a3c-9d8c118303f2','Payment from KEERTHI ICE CREAM PARLOUR-NAIDU - VY-120-B','posted',1,100,100,1,1,NOW(),NOW()),
('79dd0887-7362-4afd-82d5-ca2f0fdefdf7','JRN-20261003-0061','2025-06-21','payment','da5f5a90-a4af-48bc-bfd2-883bf36f7a9e','Payment from KEERTHI ICE CREAM PARLOUR-NAIDU - VY-142-A','posted',1,2319900,2319900,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('dd7a80da-2f38-4005-aef7-2e2487bc8059','92450154-6c0c-44db-a0e5-710593fb8111','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1200000,0,NULL,NULL,'KEERTHI ICE CREAM PARLOUR-NAIDU','Payment receipt',1,NOW(),1),
('a7491c8a-30b1-4a24-a215-a91ca3c3a38c','92450154-6c0c-44db-a0e5-710593fb8111','08a3158d-2111-43c6-9a45-16d3e146f266',0,1200000,NULL,NULL,'KEERTHI ICE CREAM PARLOUR-NAIDU','Payment receipt',1,NOW(),1),
('3ecf4732-913d-42a2-80a5-3c03068b179e','f6bb7b6b-519c-4a07-9240-cd03f0889d3a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',100,0,NULL,NULL,'KEERTHI ICE CREAM PARLOUR-NAIDU','Payment receipt',1,NOW(),1),
('82eb4dbc-320f-4447-86ec-65694d74a69e','f6bb7b6b-519c-4a07-9240-cd03f0889d3a','08a3158d-2111-43c6-9a45-16d3e146f266',0,100,NULL,NULL,'KEERTHI ICE CREAM PARLOUR-NAIDU','Payment receipt',1,NOW(),1),
('930f26dc-2794-402e-948e-4b75de40b82a','79dd0887-7362-4afd-82d5-ca2f0fdefdf7','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2319900,0,NULL,NULL,'KEERTHI ICE CREAM PARLOUR-NAIDU','Payment receipt',1,NOW(),1),
('783bedcf-6621-4869-8299-60f57953cbee','79dd0887-7362-4afd-82d5-ca2f0fdefdf7','08a3158d-2111-43c6-9a45-16d3e146f266',0,2319900,NULL,NULL,'KEERTHI ICE CREAM PARLOUR-NAIDU','Payment receipt',1,NOW(),1);

-- ======= KOLLI SATYANARAYANA =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('d40b61d2-c656-49ec-b4a0-d085ae50d2cb');
DELETE FROM journal_lines WHERE journal_id IN ('9310e145-5b43-498a-b45f-d86572deef06');
DELETE FROM journal_entries WHERE id IN ('9310e145-5b43-498a-b45f-d86572deef06');
DELETE FROM invoice_payments WHERE id IN ('bca45550-7073-4125-85f1-b24a90829ab3');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('39b611ef-f779-450e-937e-9e98ec5b817a','d7e6414d-46d7-4e87-9814-c057ba6d5ef5','2025-05-17',3775000,'cash','received','VY-133-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('bbb9690b-a825-40c5-9fa8-4ab07c9130b9','JRN-20261003-0062','2025-05-17','payment','39b611ef-f779-450e-937e-9e98ec5b817a','Payment from KOLLI SATYANARAYANA - VY-133-A','posted',1,3775000,3775000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('0d182452-b532-47cc-8057-d4ef95f00f42','bbb9690b-a825-40c5-9fa8-4ab07c9130b9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3775000,0,NULL,NULL,'KOLLI SATYANARAYANA','Payment receipt',1,NOW(),1),
('5f2d1b77-88b3-4541-833f-ce2d7aab00c5','bbb9690b-a825-40c5-9fa8-4ab07c9130b9','993ae0c1-c77f-47a2-bd03-1b88ae917b93',0,3775000,NULL,NULL,'KOLLI SATYANARAYANA','Payment receipt',1,NOW(),1);

-- ======= KORADA HARISH =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('4b86086f-5b85-4c6d-b0f5-05941336ce3a');
DELETE FROM journal_lines WHERE journal_id IN ('47d699f2-d477-4732-a952-3ea3032fff43');
DELETE FROM journal_entries WHERE id IN ('47d699f2-d477-4732-a952-3ea3032fff43');
DELETE FROM invoice_payments WHERE id IN ('b6a66a2a-0af4-4622-8717-007ce94606ff');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('82fd370a-eda5-4274-b896-acf9bb035355','a1db81c7-21e1-415a-9d1f-ba1bf6bf427c','2025-07-30',2625000,'cash','received','VY-219-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('b63aa54a-c81f-427c-8ce7-b37c8665900e','JRN-20261003-0063','2025-07-30','payment','82fd370a-eda5-4274-b896-acf9bb035355','Payment from KORADA HARISH - VY-219-A','posted',1,2625000,2625000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('898152ad-e03e-402b-bc7b-9330d20e5549','b63aa54a-c81f-427c-8ce7-b37c8665900e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2625000,0,NULL,NULL,'KORADA HARISH','Payment receipt',1,NOW(),1),
('d328c197-81ae-4f32-9ea1-fd0dde98de02','b63aa54a-c81f-427c-8ce7-b37c8665900e','6ac71de0-0ed3-405e-90a7-da420351a5bc',0,2625000,NULL,NULL,'KORADA HARISH','Payment receipt',1,NOW(),1);

-- ======= KORADA RAMANANDAM =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('1b0572f9-6e42-4578-b436-94f8cd4a8802','7b380396-4525-43d7-9e06-163c5b7cfcbc','51ed67f8-8337-409e-9479-d28c4a03f0af','b92bd98c-8e68-4961-8577-3129981819a7','33f377d4-972a-4d2d-a8ab-14f1d6587bba','8a8d8b65-1f49-4699-bdb4-b0d6027a370f','3d0885f2-b9f6-4b00-a812-2c3fcdd192b7','f403a916-c6ff-464b-835c-f0b8c6b41352','c953b2d3-9966-449d-b042-b13b8b1692a1','aa5880bb-64bb-4551-b761-23b10955b23d','6c2a2cfd-62c2-47ff-b402-7029a5ffa8bc');
DELETE FROM journal_lines WHERE journal_id IN ('da078f09-bf6e-43f6-ae97-68a3a74c53b2','d823df65-4722-4ffb-be2d-0bd1f462611a','ae2dd0a3-82a8-424e-bde9-83bf2e5efe0c','50726a6d-175d-42c8-8129-ae7d2316431f','7624f7b8-6426-4851-9736-999db89ee9a2','c51b3098-e932-4e5f-9b73-1cb05f650035','38000cc8-a8a1-4f04-99dd-0a347833022f','5eeacea9-3f73-42c7-b808-10cd6aa95540');
DELETE FROM journal_entries WHERE id IN ('da078f09-bf6e-43f6-ae97-68a3a74c53b2','d823df65-4722-4ffb-be2d-0bd1f462611a','ae2dd0a3-82a8-424e-bde9-83bf2e5efe0c','50726a6d-175d-42c8-8129-ae7d2316431f','7624f7b8-6426-4851-9736-999db89ee9a2','c51b3098-e932-4e5f-9b73-1cb05f650035','38000cc8-a8a1-4f04-99dd-0a347833022f','5eeacea9-3f73-42c7-b808-10cd6aa95540');
DELETE FROM invoice_payments WHERE id IN ('36b84972-a655-4d93-bea3-24edddccdc9b','0c94b691-42c9-44c2-9f05-acbf922aac8d','f13ec25f-9a8b-4943-b0a3-ff667fc1077c','88cd33f7-0655-4e56-8d8b-317eea2957a8','d9dbbc7a-1a39-4abe-9695-dee6138b7109','a1f6f527-b2a7-4670-aaeb-d03a3a6496e9','0fceb0df-9293-4bcf-8434-c8b58c6fd9f3','b05519ff-bc8b-4674-9633-adb667f60aca');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('44be8acb-7bd7-4d5b-8fda-0597daa2fe68','23ebbe2a-aedf-48a2-8697-f3d83cb4846b','2025-06-19',2050000,'cash','received','VY-174-A',1,1,NOW(),NOW()),
('9db7e255-8708-4a4e-9804-5b49be1dc2af','051e0f27-49bd-4266-ad9e-677ab59d846f','2025-06-19',50000,'cash','received','VY-183-A',1,1,NOW(),NOW()),
('8584d580-4caf-464c-aff2-2ec069816e2e','051e0f27-49bd-4266-ad9e-677ab59d846f','2025-06-26',900000,'cash','received','VY-183-B',1,1,NOW(),NOW()),
('97883671-03b4-403d-9baa-ff6497ffe7fc','4c1fb3c6-2e2b-45ca-966a-0fc517ce190d','2025-06-26',1050000,'cash','received','VY-193-A',1,1,NOW(),NOW()),
('fb070342-5b42-437d-a4f8-f9f33e55cc18','4c1fb3c6-2e2b-45ca-966a-0fc517ce190d','2025-06-26',50000,'cash','received','VY-193-B',1,1,NOW(),NOW()),
('5b86606e-195d-4a69-a0b5-f487f3c7d79b','4c1fb3c6-2e2b-45ca-966a-0fc517ce190d','2025-07-14',1962500,'cash','received','VY-193-C',1,1,NOW(),NOW()),
('f9fef852-dea5-4dcf-8200-32155fe45cf5','4c1fb3c6-2e2b-45ca-966a-0fc517ce190d','2025-07-14',88,'cash','received','VY-193-D',1,1,NOW(),NOW()),
('b72af290-d61d-412a-8854-68b16a76dcc6','a076e0a9-c53f-49af-adf8-62ee26942980','2025-07-14',1037412,'cash','received','VY-209-A',1,1,NOW(),NOW()),
('936949db-ca2f-4f76-bada-7ad4f4522f3c','a076e0a9-c53f-49af-adf8-62ee26942980','2025-08-06',1842588,'cash','received','VY-209-B',1,1,NOW(),NOW()),
('b11cd6dd-cc13-40f5-ba6f-b01352e9475e','7d10620e-1e21-43e3-82f1-e3dc7834d5dc','2025-08-06',1157412,'cash','received','VY-222-A',1,1,NOW(),NOW()),
('74364f16-8bfb-43a8-827b-126bc8a3e5cb','7d10620e-1e21-43e3-82f1-e3dc7834d5dc','2025-08-21',1842588,'cash','received','VY-222-B',1,1,NOW(),NOW()),
('d62fe663-0aab-41da-9492-28725e3ccbaa','5f863632-6c01-43b8-9148-2099fdb2525d','2025-08-21',1157412,'cash','received','VY-259-A',1,1,NOW(),NOW()),
('c5e23a77-ba15-42ac-80f8-a39a812b042b','5f863632-6c01-43b8-9148-2099fdb2525d','2025-09-10',1917488,'cash','received','VY-259-B',1,1,NOW(),NOW()),
('1bc1a89c-ffa7-49ad-80a0-9e888b2fd482','25259e12-3a98-4325-ba67-1073b6403298','2025-09-10',1062512,'cash','received','VY-265-A',1,1,NOW(),NOW()),
('0a6616d0-c508-4175-b6b9-2bfb89054055','25259e12-3a98-4325-ba67-1073b6403298','2025-10-16',2002488,'cash','received','VY-265-B',1,1,NOW(),NOW()),
('79ce269d-386d-4b09-847b-581de6143af8','864fd4fa-93c4-47dd-b80c-b96de3b33dbd','2025-10-16',1097512,'cash','received','VY-314-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('6852999c-ab86-4416-b984-b0547cb7bbda','JRN-20261003-0064','2025-06-19','payment','44be8acb-7bd7-4d5b-8fda-0597daa2fe68','Payment from KORADA RAMANANDAM - VY-174-A','posted',1,2050000,2050000,1,1,NOW(),NOW()),
('c17ad7a4-5d00-4b17-a889-3994b668add2','JRN-20261003-0065','2025-06-19','payment','9db7e255-8708-4a4e-9804-5b49be1dc2af','Payment from KORADA RAMANANDAM - VY-183-A','posted',1,50000,50000,1,1,NOW(),NOW()),
('dcd06813-bd1a-4131-a336-f2273bc42499','JRN-20261003-0066','2025-06-26','payment','8584d580-4caf-464c-aff2-2ec069816e2e','Payment from KORADA RAMANANDAM - VY-183-B','posted',1,900000,900000,1,1,NOW(),NOW()),
('9632e04d-c715-4767-adaf-699e4481ad36','JRN-20261003-0067','2025-06-26','payment','97883671-03b4-403d-9baa-ff6497ffe7fc','Payment from KORADA RAMANANDAM - VY-193-A','posted',1,1050000,1050000,1,1,NOW(),NOW()),
('b056e883-99a3-4d50-9b18-39fad6cd6aa4','JRN-20261003-0068','2025-06-26','payment','fb070342-5b42-437d-a4f8-f9f33e55cc18','Payment from KORADA RAMANANDAM - VY-193-B','posted',1,50000,50000,1,1,NOW(),NOW()),
('96a3a87c-937b-43f3-b94c-1c75fac0c061','JRN-20261003-0069','2025-07-14','payment','5b86606e-195d-4a69-a0b5-f487f3c7d79b','Payment from KORADA RAMANANDAM - VY-193-C','posted',1,1962500,1962500,1,1,NOW(),NOW()),
('9ab4ce8a-2855-4bf1-8fe3-0e2f6746983a','JRN-20261003-0070','2025-07-14','payment','f9fef852-dea5-4dcf-8200-32155fe45cf5','Payment from KORADA RAMANANDAM - VY-193-D','posted',1,88,88,1,1,NOW(),NOW()),
('ee33bda8-bdef-47a8-85e0-ed58a5cd57f4','JRN-20261003-0071','2025-07-14','payment','b72af290-d61d-412a-8854-68b16a76dcc6','Payment from KORADA RAMANANDAM - VY-209-A','posted',1,1037412,1037412,1,1,NOW(),NOW()),
('8d553ee0-0b97-4a95-a84b-9f714fbb08f3','JRN-20261003-0072','2025-08-06','payment','936949db-ca2f-4f76-bada-7ad4f4522f3c','Payment from KORADA RAMANANDAM - VY-209-B','posted',1,1842588,1842588,1,1,NOW(),NOW()),
('ad51f4e4-6413-4622-9bda-440e99c98d50','JRN-20261003-0073','2025-08-06','payment','b11cd6dd-cc13-40f5-ba6f-b01352e9475e','Payment from KORADA RAMANANDAM - VY-222-A','posted',1,1157412,1157412,1,1,NOW(),NOW()),
('2236dfd5-e667-4503-93f9-1d0324044dfa','JRN-20261003-0074','2025-08-21','payment','74364f16-8bfb-43a8-827b-126bc8a3e5cb','Payment from KORADA RAMANANDAM - VY-222-B','posted',1,1842588,1842588,1,1,NOW(),NOW()),
('2b39b1ac-f08e-4235-84fb-1bb5ce387fe5','JRN-20261003-0075','2025-08-21','payment','d62fe663-0aab-41da-9492-28725e3ccbaa','Payment from KORADA RAMANANDAM - VY-259-A','posted',1,1157412,1157412,1,1,NOW(),NOW()),
('8f80cb78-5a5c-4acc-98c1-55722b967c52','JRN-20261003-0076','2025-09-10','payment','c5e23a77-ba15-42ac-80f8-a39a812b042b','Payment from KORADA RAMANANDAM - VY-259-B','posted',1,1917488,1917488,1,1,NOW(),NOW()),
('597dacf3-a8fe-4080-9589-4f6885739820','JRN-20261003-0077','2025-09-10','payment','1bc1a89c-ffa7-49ad-80a0-9e888b2fd482','Payment from KORADA RAMANANDAM - VY-265-A','posted',1,1062512,1062512,1,1,NOW(),NOW()),
('12309d00-3719-41c7-87c9-8eea886ae9c3','JRN-20261003-0078','2025-10-16','payment','0a6616d0-c508-4175-b6b9-2bfb89054055','Payment from KORADA RAMANANDAM - VY-265-B','posted',1,2002488,2002488,1,1,NOW(),NOW()),
('11f5c0be-269f-435d-a3de-9f8ebff73564','JRN-20261003-0079','2025-10-16','payment','79ce269d-386d-4b09-847b-581de6143af8','Payment from KORADA RAMANANDAM - VY-314-A','posted',1,1097512,1097512,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('84e5aa8b-dd1a-48e0-a729-eb88b6ca0f02','6852999c-ab86-4416-b984-b0547cb7bbda','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2050000,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('54e4518c-d420-43e6-8c87-2bc083c0ff33','6852999c-ab86-4416-b984-b0547cb7bbda','b7e307cd-5821-4121-abab-32e250e86b30',0,2050000,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('7a1b4aa1-d7cf-41f5-9482-e4b6636a4665','c17ad7a4-5d00-4b17-a889-3994b668add2','23d1cabd-e89f-4bd8-a208-91f59c3898c2',50000,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('c8e2a9af-1e55-433d-bfcb-b1c23ecb1f6a','c17ad7a4-5d00-4b17-a889-3994b668add2','b7e307cd-5821-4121-abab-32e250e86b30',0,50000,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('1ac772e0-025b-4d26-810d-a361c1b838bc','dcd06813-bd1a-4131-a336-f2273bc42499','23d1cabd-e89f-4bd8-a208-91f59c3898c2',900000,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('f0f5c9e2-e263-447d-9f6d-5d6529db5fc4','dcd06813-bd1a-4131-a336-f2273bc42499','b7e307cd-5821-4121-abab-32e250e86b30',0,900000,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('e2dfb35c-0b89-4edd-a3d6-bc48472937b7','9632e04d-c715-4767-adaf-699e4481ad36','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1050000,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('cb0eaf74-cd22-4e2d-a260-f911dc5e8a58','9632e04d-c715-4767-adaf-699e4481ad36','b7e307cd-5821-4121-abab-32e250e86b30',0,1050000,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('862ceebf-5ed1-4094-8842-ef349c7511b2','b056e883-99a3-4d50-9b18-39fad6cd6aa4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',50000,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('7473c6fc-068a-42bf-9e7d-a6851ff4409c','b056e883-99a3-4d50-9b18-39fad6cd6aa4','b7e307cd-5821-4121-abab-32e250e86b30',0,50000,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('65dd9c88-4d55-49c3-a0ec-b7f44600608f','96a3a87c-937b-43f3-b94c-1c75fac0c061','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1962500,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('ad8a835e-d370-4ab2-ac2c-98d073b816bc','96a3a87c-937b-43f3-b94c-1c75fac0c061','b7e307cd-5821-4121-abab-32e250e86b30',0,1962500,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('943737a5-49a2-4d76-886e-df0991810023','9ab4ce8a-2855-4bf1-8fe3-0e2f6746983a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',88,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('268f7112-33af-4f10-8639-82c43334dae5','9ab4ce8a-2855-4bf1-8fe3-0e2f6746983a','b7e307cd-5821-4121-abab-32e250e86b30',0,88,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('967a176c-2316-4ca7-80af-48efceeef4ae','ee33bda8-bdef-47a8-85e0-ed58a5cd57f4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1037412,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('8b113b7a-24e5-4f7d-8bef-50a375810e07','ee33bda8-bdef-47a8-85e0-ed58a5cd57f4','b7e307cd-5821-4121-abab-32e250e86b30',0,1037412,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('be025e6b-10cd-4363-be00-d517d008a7da','8d553ee0-0b97-4a95-a84b-9f714fbb08f3','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1842588,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('e4f33562-d20e-4aaf-8a21-352e3fdf0a79','8d553ee0-0b97-4a95-a84b-9f714fbb08f3','b7e307cd-5821-4121-abab-32e250e86b30',0,1842588,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('5373d4d9-a811-4a48-b587-c92ce21e33b3','ad51f4e4-6413-4622-9bda-440e99c98d50','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1157412,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('e8741065-fe20-4b88-8a5d-2e382ee9375f','ad51f4e4-6413-4622-9bda-440e99c98d50','b7e307cd-5821-4121-abab-32e250e86b30',0,1157412,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('54b818bf-02e3-4f41-9ad6-547e7d6eb852','2236dfd5-e667-4503-93f9-1d0324044dfa','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1842588,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('4446276d-4a84-40b1-952e-74c5c288ca6a','2236dfd5-e667-4503-93f9-1d0324044dfa','b7e307cd-5821-4121-abab-32e250e86b30',0,1842588,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('7914933f-4f63-4bcc-a9dc-51e483d65037','2b39b1ac-f08e-4235-84fb-1bb5ce387fe5','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1157412,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('4935fee6-256b-4529-a7b5-f7b937a14570','2b39b1ac-f08e-4235-84fb-1bb5ce387fe5','b7e307cd-5821-4121-abab-32e250e86b30',0,1157412,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('a3871d50-202b-4e6a-9a53-3e2e9628099d','8f80cb78-5a5c-4acc-98c1-55722b967c52','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1917488,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('7c4af841-aa54-4cb3-8a9a-937f74c78a8e','8f80cb78-5a5c-4acc-98c1-55722b967c52','b7e307cd-5821-4121-abab-32e250e86b30',0,1917488,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('a9be1af4-8a93-4fb1-b147-06c8ae102867','597dacf3-a8fe-4080-9589-4f6885739820','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1062512,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('1cd91615-7c6b-4cd9-bddb-3ec81e75091b','597dacf3-a8fe-4080-9589-4f6885739820','b7e307cd-5821-4121-abab-32e250e86b30',0,1062512,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('c87cbbbf-38af-470c-b789-75d565946608','12309d00-3719-41c7-87c9-8eea886ae9c3','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2002488,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('8e0e92ea-02f0-4c72-b770-79f1b1ccce9f','12309d00-3719-41c7-87c9-8eea886ae9c3','b7e307cd-5821-4121-abab-32e250e86b30',0,2002488,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('01cafe70-9bf4-411d-91ee-25be2cd6c942','11f5c0be-269f-435d-a3de-9f8ebff73564','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1097512,0,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1),
('28f5b570-1cf5-45e9-b861-aba41fd7dd03','11f5c0be-269f-435d-a3de-9f8ebff73564','b7e307cd-5821-4121-abab-32e250e86b30',0,1097512,NULL,NULL,'KORADA RAMANANDAM','Payment receipt',1,NOW(),1);

-- ======= KOTA PRAVEEN =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('391ea277-2919-44da-a865-9ab65e4e5bbd','313ea39a-6cc6-4c30-b02f-f17fb1ab73c1','4a1855fc-dfb9-4d44-a32c-f1809d4d6e99');
DELETE FROM journal_lines WHERE journal_id IN ('b0c24edd-ad8e-4c72-989f-1cba9df759f3');
DELETE FROM journal_entries WHERE id IN ('b0c24edd-ad8e-4c72-989f-1cba9df759f3');
DELETE FROM invoice_payments WHERE id IN ('b8addb73-4b53-4384-b5d1-481bd449defa');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('e0099d4e-2fc4-4254-bd77-894c2a7e9d86','58adec14-5b86-478f-b2d0-f8fc97165c55','2025-06-09',1500000,'cash','received','VY-172-A',1,1,NOW(),NOW()),
('7d7901be-1b44-433b-848f-a8f8f56b957a','58adec14-5b86-478f-b2d0-f8fc97165c55','2025-06-21',1000000,'cash','received','VY-172-B',1,1,NOW(),NOW()),
('38a9e31c-469e-4148-9004-a9c3fda8dd9b','58adec14-5b86-478f-b2d0-f8fc97165c55','2025-06-26',600000,'cash','received','VY-172-C',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('570887c3-ef1a-4472-a0c7-d3d7d99bd33f','JRN-20261003-0080','2025-06-09','payment','e0099d4e-2fc4-4254-bd77-894c2a7e9d86','Payment from KOTA PRAVEEN - VY-172-A','posted',1,1500000,1500000,1,1,NOW(),NOW()),
('098bfa58-2c35-403d-83d1-5785b1858962','JRN-20261003-0081','2025-06-21','payment','7d7901be-1b44-433b-848f-a8f8f56b957a','Payment from KOTA PRAVEEN - VY-172-B','posted',1,1000000,1000000,1,1,NOW(),NOW()),
('03e7cfb1-5c1d-448c-b4b9-f526b9d83759','JRN-20261003-0082','2025-06-26','payment','38a9e31c-469e-4148-9004-a9c3fda8dd9b','Payment from KOTA PRAVEEN - VY-172-C','posted',1,600000,600000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('4f37f139-55b2-4f36-9aa5-8f0266a5d35d','570887c3-ef1a-4472-a0c7-d3d7d99bd33f','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1500000,0,NULL,NULL,'KOTA PRAVEEN','Payment receipt',1,NOW(),1),
('83738503-6811-476a-b1a9-5489d28ba716','570887c3-ef1a-4472-a0c7-d3d7d99bd33f','6cfdccf2-c11c-49f1-b609-d6f936c5a3f0',0,1500000,NULL,NULL,'KOTA PRAVEEN','Payment receipt',1,NOW(),1),
('cd0b1e8e-0ee6-48f4-91cc-f530c48a045a','098bfa58-2c35-403d-83d1-5785b1858962','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1000000,0,NULL,NULL,'KOTA PRAVEEN','Payment receipt',1,NOW(),1),
('b6f34a34-39fb-4348-af6c-23fe640ed427','098bfa58-2c35-403d-83d1-5785b1858962','6cfdccf2-c11c-49f1-b609-d6f936c5a3f0',0,1000000,NULL,NULL,'KOTA PRAVEEN','Payment receipt',1,NOW(),1),
('d6e82d99-f522-42a1-8dcb-c63bf43089ec','03e7cfb1-5c1d-448c-b4b9-f526b9d83759','23d1cabd-e89f-4bd8-a208-91f59c3898c2',600000,0,NULL,NULL,'KOTA PRAVEEN','Payment receipt',1,NOW(),1),
('d45b51a7-14ac-4ced-983d-aa5c08544613','03e7cfb1-5c1d-448c-b4b9-f526b9d83759','6cfdccf2-c11c-49f1-b609-d6f936c5a3f0',0,600000,NULL,NULL,'KOTA PRAVEEN','Payment receipt',1,NOW(),1);

-- ======= Kapuganti Anuradha =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('f78f81df-7a50-475e-8a28-72bb3e6d90e4','dae87dd2-5f44-47ac-adc6-c0bf031964ab','35c6dd20-5c19-4c4f-b0f1-185c20a43040','94984902-09c3-4816-87c9-8007f8a3ec8c','f9c313ee-ca19-4466-ad0b-0dce75039451');
DELETE FROM journal_lines WHERE journal_id IN ('7ea936e0-5049-4845-9499-8ed3f3f70f1b','4b851113-72e1-4900-a964-819a25920daa','1f75bbc0-2ca0-4be4-a73e-a21bb0632858','cb40a820-1a46-4938-9036-2ca656097f09');
DELETE FROM journal_entries WHERE id IN ('7ea936e0-5049-4845-9499-8ed3f3f70f1b','4b851113-72e1-4900-a964-819a25920daa','1f75bbc0-2ca0-4be4-a73e-a21bb0632858','cb40a820-1a46-4938-9036-2ca656097f09');
DELETE FROM invoice_payments WHERE id IN ('d181f032-ef03-40d3-b6a6-2ffe47add820','60c62316-4f7a-4eb9-a828-106c83a6666b','7092fc4f-052e-420a-8390-fffcfd213a0a','2d096282-db35-45fa-ae8c-13a33478df92');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('9e4b3dae-86cb-4c86-a953-4488d9886236','aa7d1dbe-7a7f-4f80-a6d1-a6d3919952ea','2025-03-10',3120200,'cash','received','VY-7-A',1,1,NOW(),NOW()),
('6f2556d1-86e4-4c0a-97da-3c4a3157bc35','364a5187-4dde-4683-87c2-ab001f426ba7','2025-03-10',128000,'cash','received','VY-8-A',1,1,NOW(),NOW()),
('d8d8e7af-0a41-41c7-9a62-55475d3d2f3b','364a5187-4dde-4683-87c2-ab001f426ba7','2025-03-10',3120200,'cash','received','VY-8-B',1,1,NOW(),NOW()),
('d2744e79-edc1-48fb-80ee-41fe541d6f78','f850b069-5fb5-4ab6-8a7c-4e4f72ff1555','2025-03-25',3430000,'cash','received','VY-21-A',1,1,NOW(),NOW()),
('f2556e53-9370-4406-bb4b-9778bda1cae0','f850b069-5fb5-4ab6-8a7c-4e4f72ff1555','2025-04-14',2200,'cash','received','VY-21-B',1,1,NOW(),NOW()),
('c7cb8572-5eb8-4254-8dc8-50bb6089816c','6f343de3-45bf-4b53-aed3-e314d3f8a72f','2025-04-14',3297800,'cash','received','VY-29-A',1,1,NOW(),NOW()),
('852af7f1-a134-4daf-b999-31793c2503dd','6f343de3-45bf-4b53-aed3-e314d3f8a72f','2025-04-21',120200,'cash','received','VY-29-B',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('07c2e945-87a7-4f6d-97a0-ef9c758e78cd','JRN-20261003-0083','2025-03-10','payment','9e4b3dae-86cb-4c86-a953-4488d9886236','Payment from Kapuganti Anuradha - VY-7-A','posted',1,3120200,3120200,1,1,NOW(),NOW()),
('16667fa2-363c-4044-9eb3-6231c0039107','JRN-20261003-0084','2025-03-10','payment','6f2556d1-86e4-4c0a-97da-3c4a3157bc35','Payment from Kapuganti Anuradha - VY-8-A','posted',1,128000,128000,1,1,NOW(),NOW()),
('8f612f14-ed61-479e-bb7a-137dd2195e88','JRN-20261003-0085','2025-03-10','payment','d8d8e7af-0a41-41c7-9a62-55475d3d2f3b','Payment from Kapuganti Anuradha - VY-8-B','posted',1,3120200,3120200,1,1,NOW(),NOW()),
('2bbeb6b2-6eb7-4816-b3fe-ef5ba7ee4494','JRN-20261003-0086','2025-03-25','payment','d2744e79-edc1-48fb-80ee-41fe541d6f78','Payment from Kapuganti Anuradha - VY-21-A','posted',1,3430000,3430000,1,1,NOW(),NOW()),
('c351bee9-55fd-499e-afd7-45fc8f82c167','JRN-20261003-0087','2025-04-14','payment','f2556e53-9370-4406-bb4b-9778bda1cae0','Payment from Kapuganti Anuradha - VY-21-B','posted',1,2200,2200,1,1,NOW(),NOW()),
('9aba7366-a28c-4893-9fd9-fddd093b543e','JRN-20261003-0088','2025-04-14','payment','c7cb8572-5eb8-4254-8dc8-50bb6089816c','Payment from Kapuganti Anuradha - VY-29-A','posted',1,3297800,3297800,1,1,NOW(),NOW()),
('44b49526-4360-4064-91a0-e6d15929de83','JRN-20261003-0089','2025-04-21','payment','852af7f1-a134-4daf-b999-31793c2503dd','Payment from Kapuganti Anuradha - VY-29-B','posted',1,120200,120200,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('4d1de4f3-96f6-4db0-a0fb-5c9905d40dc8','07c2e945-87a7-4f6d-97a0-ef9c758e78cd','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3120200,0,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1),
('1044fe91-39e7-45b5-8681-b091da90e875','07c2e945-87a7-4f6d-97a0-ef9c758e78cd','7cd45b7b-0e0e-400c-b7e4-9037d7691d5f',0,3120200,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1),
('60bb5818-4bf3-4dd0-92e0-853f95cb9423','16667fa2-363c-4044-9eb3-6231c0039107','23d1cabd-e89f-4bd8-a208-91f59c3898c2',128000,0,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1),
('ce0d0223-c89a-45ac-aed9-85aeefb7317e','16667fa2-363c-4044-9eb3-6231c0039107','7cd45b7b-0e0e-400c-b7e4-9037d7691d5f',0,128000,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1),
('2062d4c0-63fc-4217-8570-ad8c0a4e86d5','8f612f14-ed61-479e-bb7a-137dd2195e88','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3120200,0,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1),
('04026ff1-27d9-40a8-a6a7-2642646b4466','8f612f14-ed61-479e-bb7a-137dd2195e88','7cd45b7b-0e0e-400c-b7e4-9037d7691d5f',0,3120200,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1),
('0531a324-4935-4a6f-be1b-bd551d13c10e','2bbeb6b2-6eb7-4816-b3fe-ef5ba7ee4494','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3430000,0,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1),
('bc0d4aff-8e1b-44fa-98f1-0df11da72fbf','2bbeb6b2-6eb7-4816-b3fe-ef5ba7ee4494','7cd45b7b-0e0e-400c-b7e4-9037d7691d5f',0,3430000,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1),
('e81cc94e-428e-4feb-8c66-e3ba4a5871c9','c351bee9-55fd-499e-afd7-45fc8f82c167','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2200,0,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1),
('f9796085-80ed-4665-b7e9-cbf753affcb7','c351bee9-55fd-499e-afd7-45fc8f82c167','7cd45b7b-0e0e-400c-b7e4-9037d7691d5f',0,2200,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1),
('f747390a-f018-4f22-a68b-17e2f0614f39','9aba7366-a28c-4893-9fd9-fddd093b543e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3297800,0,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1),
('2a1e8b2e-791f-4e8a-b474-9ef49eadc0bb','9aba7366-a28c-4893-9fd9-fddd093b543e','7cd45b7b-0e0e-400c-b7e4-9037d7691d5f',0,3297800,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1),
('249c8a08-0e86-425b-b506-d6d054166517','44b49526-4360-4064-91a0-e6d15929de83','23d1cabd-e89f-4bd8-a208-91f59c3898c2',120200,0,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1),
('6c7fa101-012c-4c3c-9099-b266950fee93','44b49526-4360-4064-91a0-e6d15929de83','7cd45b7b-0e0e-400c-b7e4-9037d7691d5f',0,120200,NULL,NULL,'Kapuganti Anuradha','Payment receipt',1,NOW(),1);

-- ======= Kinto-Arilova warehouse =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('8beacb6d-8f3e-4d29-a04a-8a86348619af');
DELETE FROM journal_lines WHERE journal_id IN ('de62f82d-8739-4291-9608-060ec0f5d6a0','7689a001-a720-4136-92fe-1e3e2711a671');
DELETE FROM journal_entries WHERE id IN ('de62f82d-8739-4291-9608-060ec0f5d6a0','7689a001-a720-4136-92fe-1e3e2711a671');
DELETE FROM invoice_payments WHERE id IN ('9f700bbe-44f0-4aab-96d6-b5cadd951737','6dc2e238-1e2f-4908-86b2-af060a296ace');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('f50c9926-8a02-45b1-8c40-fc1af7f7e28a','e1f28deb-857c-486d-aab1-fd68bdbb819f','2025-07-22',10700000,'cash','received','VY-215-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('3320a2a5-06a8-4a83-b3f2-d5846f965fd5','JRN-20261003-0090','2025-07-22','payment','f50c9926-8a02-45b1-8c40-fc1af7f7e28a','Payment from Kinto-Arilova warehouse - VY-215-A','posted',1,10700000,10700000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('86572147-92f6-4639-ac78-29328bc5631b','3320a2a5-06a8-4a83-b3f2-d5846f965fd5','23d1cabd-e89f-4bd8-a208-91f59c3898c2',10700000,0,NULL,NULL,'Kinto-Arilova warehouse','Payment receipt',1,NOW(),1),
('c5f15311-9733-4831-9c0e-1d9865ff0896','3320a2a5-06a8-4a83-b3f2-d5846f965fd5','eeaf2550-99a1-4dd7-9ec8-b47b20847ba2',0,10700000,NULL,NULL,'Kinto-Arilova warehouse','Payment receipt',1,NOW(),1);

-- ======= Kollati Ratnam =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('ca8ce129-60a6-46d0-b17a-1610eb2dc02a');
DELETE FROM journal_lines WHERE journal_id IN ('a1f8d435-8c9d-43e6-bea9-04f640b4f492');
DELETE FROM journal_entries WHERE id IN ('a1f8d435-8c9d-43e6-bea9-04f640b4f492');
DELETE FROM invoice_payments WHERE id IN ('81d4fbd5-5ab7-44b0-9418-1cdfa90627d1');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('7f5d2538-785d-4aee-8b45-ba393fd8a87c','5d10695b-32f2-463b-bf8e-5095ef83901e','2025-03-25',4900000,'cash','received','VY-25-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('c17a8f65-5907-4897-9570-8444704bcc7c','JRN-20261003-0091','2025-03-25','payment','7f5d2538-785d-4aee-8b45-ba393fd8a87c','Payment from Kollati Ratnam - VY-25-A','posted',1,4900000,4900000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('7a2a1e7d-33b5-4699-8f10-f699f7f95b30','c17a8f65-5907-4897-9570-8444704bcc7c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',4900000,0,NULL,NULL,'Kollati Ratnam','Payment receipt',1,NOW(),1),
('f86660b9-8b57-4d9a-87f0-1ff7780e1389','c17a8f65-5907-4897-9570-8444704bcc7c','39132c58-eb24-47b1-9047-c47212050853',0,4900000,NULL,NULL,'Kollati Ratnam','Payment receipt',1,NOW(),1);

-- ======= Kurati Sai Charan =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('4088c38f-2e16-44a1-99ec-4762d03d25b6','3d6ff8d9-0b54-48f4-9576-67987a6f15f0','c2c17496-331a-42f0-bbc2-13eecbba4c3a');
DELETE FROM journal_lines WHERE journal_id IN ('0de29a58-0ffb-4b44-9193-6a0d07693913');
DELETE FROM journal_entries WHERE id IN ('0de29a58-0ffb-4b44-9193-6a0d07693913');
DELETE FROM invoice_payments WHERE id IN ('cff19a41-8a1e-450b-9cc5-591669c56cc2');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('b5a30e52-52a7-49eb-85a6-a58b5582fd20','08496759-90a0-487c-9c05-97567b61db24','2025-03-25',200000,'cash','received','VY-26-A',1,1,NOW(),NOW()),
('1912a559-3900-41a3-a3cc-f895ccf01636','08496759-90a0-487c-9c05-97567b61db24','2025-04-01',3350000,'cash','received','VY-26-B',1,1,NOW(),NOW()),
('c6e57f40-9ee9-4c7a-b47b-a97e507cfde9','08496759-90a0-487c-9c05-97567b61db24','2025-04-06',900000,'cash','received','VY-26-C',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('9398d58c-3584-48ee-b8b3-6e85e206a269','JRN-20261003-0092','2025-03-25','payment','b5a30e52-52a7-49eb-85a6-a58b5582fd20','Payment from Kurati Sai Charan - VY-26-A','posted',1,200000,200000,1,1,NOW(),NOW()),
('d9a03b0e-2133-4787-b685-3963b73ac721','JRN-20261003-0093','2025-04-01','payment','1912a559-3900-41a3-a3cc-f895ccf01636','Payment from Kurati Sai Charan - VY-26-B','posted',1,3350000,3350000,1,1,NOW(),NOW()),
('79634be6-e4ce-4738-8586-9adb0fc7e890','JRN-20261003-0094','2025-04-06','payment','c6e57f40-9ee9-4c7a-b47b-a97e507cfde9','Payment from Kurati Sai Charan - VY-26-C','posted',1,900000,900000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('c01a4844-1032-4bd6-9921-782816245cdb','9398d58c-3584-48ee-b8b3-6e85e206a269','23d1cabd-e89f-4bd8-a208-91f59c3898c2',200000,0,NULL,NULL,'Kurati Sai Charan','Payment receipt',1,NOW(),1),
('da1a9a80-995f-4ba8-8cef-831b255b2f17','9398d58c-3584-48ee-b8b3-6e85e206a269','bdf58590-15f1-40b3-9fb4-3561265d16b4',0,200000,NULL,NULL,'Kurati Sai Charan','Payment receipt',1,NOW(),1),
('bc49b4f8-928c-4206-9f8c-f036c4ea7452','d9a03b0e-2133-4787-b685-3963b73ac721','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3350000,0,NULL,NULL,'Kurati Sai Charan','Payment receipt',1,NOW(),1),
('c4767e09-81a9-4d8e-b735-db3a72131779','d9a03b0e-2133-4787-b685-3963b73ac721','bdf58590-15f1-40b3-9fb4-3561265d16b4',0,3350000,NULL,NULL,'Kurati Sai Charan','Payment receipt',1,NOW(),1),
('dc873984-3985-460c-820c-15b7227f9546','79634be6-e4ce-4738-8586-9adb0fc7e890','23d1cabd-e89f-4bd8-a208-91f59c3898c2',900000,0,NULL,NULL,'Kurati Sai Charan','Payment receipt',1,NOW(),1),
('1e77d92e-30e0-4b74-8a16-3169af59bba9','79634be6-e4ce-4738-8586-9adb0fc7e890','bdf58590-15f1-40b3-9fb4-3561265d16b4',0,900000,NULL,NULL,'Kurati Sai Charan','Payment receipt',1,NOW(),1);

-- ======= LALAM HARISH =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('d57e5dfb-15c4-4cd0-86a5-3f5b1cc50d78','7e9d0e2b-93cd-4a2b-a24e-4b31bbf08953','b169d693-7104-40a0-960a-81a905e3375e','c8d6c3e5-54ff-4b64-96f4-f14d0d365fc2','1ee307c9-e0be-4060-b73d-e123ad0527bd');
DELETE FROM journal_lines WHERE journal_id IN ('42dd58d5-5085-4e54-93a3-13ee8d71d355','127d30c5-ac39-4914-b210-3f92871ff765');
DELETE FROM journal_entries WHERE id IN ('42dd58d5-5085-4e54-93a3-13ee8d71d355','127d30c5-ac39-4914-b210-3f92871ff765');
DELETE FROM invoice_payments WHERE id IN ('89df881e-208d-4ead-b658-528cdf165a12','8e6d14df-2bf5-4d17-980d-7faba7357243');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('a98d9666-2dfc-4371-a363-135d9d61baee','af530bb2-cf14-43f2-b7d8-abe9c73ed5e1','2025-06-30',1500000,'cash','received','VY-201-A',1,1,NOW(),NOW()),
('1b5e307f-483b-4f19-81a3-8d9847cc7a49','af530bb2-cf14-43f2-b7d8-abe9c73ed5e1','2025-07-12',1500000,'cash','received','VY-201-B',1,1,NOW(),NOW()),
('3c3f1bdc-5631-40c0-a3b7-95a66ff10d5c','af530bb2-cf14-43f2-b7d8-abe9c73ed5e1','2025-07-22',300000,'cash','received','VY-201-C',1,1,NOW(),NOW()),
('0631113b-9b0c-4a8d-a432-c4977a8a974b','a52ad56d-6871-44c1-9255-bf5542815d4d','2025-07-22',1000000,'cash','received','VY-216-A',1,1,NOW(),NOW()),
('c4fd2a2d-014f-45ba-8099-ab58ff564b8d','a52ad56d-6871-44c1-9255-bf5542815d4d','2025-07-28',540000,'cash','received','VY-216-B',1,1,NOW(),NOW()),
('7f6caa80-5c27-415b-9cee-eb61d27872bf','a52ad56d-6871-44c1-9255-bf5542815d4d','2025-08-01',1500100,'cash','received','VY-216-C',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('7295e7e7-fde9-444a-bd12-0e4d31433bb6','JRN-20261003-0095','2025-06-30','payment','a98d9666-2dfc-4371-a363-135d9d61baee','Payment from LALAM HARISH - VY-201-A','posted',1,1500000,1500000,1,1,NOW(),NOW()),
('1636828f-05d9-4657-813c-1d4bc4ac8606','JRN-20261003-0096','2025-07-12','payment','1b5e307f-483b-4f19-81a3-8d9847cc7a49','Payment from LALAM HARISH - VY-201-B','posted',1,1500000,1500000,1,1,NOW(),NOW()),
('4972a984-3696-49c3-bf35-be27234900e4','JRN-20261003-0097','2025-07-22','payment','3c3f1bdc-5631-40c0-a3b7-95a66ff10d5c','Payment from LALAM HARISH - VY-201-C','posted',1,300000,300000,1,1,NOW(),NOW()),
('71e74533-0848-4202-a6f9-9e4d3bfa0777','JRN-20261003-0098','2025-07-22','payment','0631113b-9b0c-4a8d-a432-c4977a8a974b','Payment from LALAM HARISH - VY-216-A','posted',1,1000000,1000000,1,1,NOW(),NOW()),
('8ac378f6-e3be-4e83-90cb-6fd55af19f5c','JRN-20261003-0099','2025-07-28','payment','c4fd2a2d-014f-45ba-8099-ab58ff564b8d','Payment from LALAM HARISH - VY-216-B','posted',1,540000,540000,1,1,NOW(),NOW()),
('54d5af38-a48e-4824-b4a1-a24342dd07d3','JRN-20261003-0100','2025-08-01','payment','7f6caa80-5c27-415b-9cee-eb61d27872bf','Payment from LALAM HARISH - VY-216-C','posted',1,1500100,1500100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('8f82287f-daa6-4737-8fac-8244c91fa261','7295e7e7-fde9-444a-bd12-0e4d31433bb6','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1500000,0,NULL,NULL,'LALAM HARISH','Payment receipt',1,NOW(),1),
('2ac1f31c-450b-44e5-a009-e33c32f12096','7295e7e7-fde9-444a-bd12-0e4d31433bb6','32d961bc-43ae-45b3-8cc3-7e6b0082b235',0,1500000,NULL,NULL,'LALAM HARISH','Payment receipt',1,NOW(),1),
('7b54a745-ba82-4a08-a7b5-4d69a203ac33','1636828f-05d9-4657-813c-1d4bc4ac8606','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1500000,0,NULL,NULL,'LALAM HARISH','Payment receipt',1,NOW(),1),
('ac11fdcd-2a2a-4d65-97e6-7d2f4c9795a0','1636828f-05d9-4657-813c-1d4bc4ac8606','32d961bc-43ae-45b3-8cc3-7e6b0082b235',0,1500000,NULL,NULL,'LALAM HARISH','Payment receipt',1,NOW(),1),
('0bd9e0ce-f8a1-4e01-a74d-ececc30957be','4972a984-3696-49c3-bf35-be27234900e4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',300000,0,NULL,NULL,'LALAM HARISH','Payment receipt',1,NOW(),1),
('9a6be544-9593-437c-8c6e-0158bab4004f','4972a984-3696-49c3-bf35-be27234900e4','32d961bc-43ae-45b3-8cc3-7e6b0082b235',0,300000,NULL,NULL,'LALAM HARISH','Payment receipt',1,NOW(),1),
('8c3d4e4e-51e6-4f03-9131-62b79b9741fe','71e74533-0848-4202-a6f9-9e4d3bfa0777','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1000000,0,NULL,NULL,'LALAM HARISH','Payment receipt',1,NOW(),1),
('e788846e-32b3-48fb-8bda-e18ccfa926ec','71e74533-0848-4202-a6f9-9e4d3bfa0777','32d961bc-43ae-45b3-8cc3-7e6b0082b235',0,1000000,NULL,NULL,'LALAM HARISH','Payment receipt',1,NOW(),1),
('76cd669b-6641-479c-b973-a45d645b254d','8ac378f6-e3be-4e83-90cb-6fd55af19f5c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',540000,0,NULL,NULL,'LALAM HARISH','Payment receipt',1,NOW(),1),
('aaada7ba-5511-4dc2-bc9d-8f8e6d56e9e1','8ac378f6-e3be-4e83-90cb-6fd55af19f5c','32d961bc-43ae-45b3-8cc3-7e6b0082b235',0,540000,NULL,NULL,'LALAM HARISH','Payment receipt',1,NOW(),1),
('cb41928b-107f-4c4f-a569-d3c48bbd3688','54d5af38-a48e-4824-b4a1-a24342dd07d3','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1500100,0,NULL,NULL,'LALAM HARISH','Payment receipt',1,NOW(),1),
('88cdc72b-3146-48a0-a2dd-b826e29242e4','54d5af38-a48e-4824-b4a1-a24342dd07d3','32d961bc-43ae-45b3-8cc3-7e6b0082b235',0,1500100,NULL,NULL,'LALAM HARISH','Payment receipt',1,NOW(),1);

-- ======= M/s SRI VENKATESWARA FUELS FILLING STN =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('506bf194-6ae8-4f5a-91e8-f26f39408881');
DELETE FROM journal_lines WHERE journal_id IN ('d2560d8d-1a49-4db3-ad0f-b4cd3676fbc8');
DELETE FROM journal_entries WHERE id IN ('d2560d8d-1a49-4db3-ad0f-b4cd3676fbc8');
DELETE FROM invoice_payments WHERE id IN ('19fe154c-226e-43eb-8953-8b95f6f65cc9');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('0ac6d49c-03e8-4262-9328-d688bad46494','cac068ec-edf7-4964-99c5-c44871f36a4c','2025-10-16',378100,'cash','received','VY-306-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('c33de50c-f299-47a8-9f4d-beae49969682','JRN-20261003-0101','2025-10-16','payment','0ac6d49c-03e8-4262-9328-d688bad46494','Payment from M/s SRI VENKATESWARA FUELS FILLING STN - VY-306-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('61b8e394-c115-4f34-aca6-65d76393366f','c33de50c-f299-47a8-9f4d-beae49969682','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'M/s SRI VENKATESWARA FUELS FILLING STN','Payment receipt',1,NOW(),1),
('61e8d722-db91-4411-9d80-e1d54f6bd528','c33de50c-f299-47a8-9f4d-beae49969682','3da921a8-addc-4950-92d2-ba867e35207c',0,378100,NULL,NULL,'M/s SRI VENKATESWARA FUELS FILLING STN','Payment receipt',1,NOW(),1);

-- ======= MANASA HP GAS AGENCY =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('03034145-63b1-4b73-96a2-eaaa5f9a8908');
DELETE FROM journal_lines WHERE journal_id IN ('a597305a-0b8d-4e3e-a4b9-cdc9f1ff3221');
DELETE FROM journal_entries WHERE id IN ('a597305a-0b8d-4e3e-a4b9-cdc9f1ff3221');
DELETE FROM invoice_payments WHERE id IN ('2be1f5e4-c9a5-4357-9e17-e5258e2c8ab4');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('f605dfa0-a5f7-4097-ac80-49739f69b78f','3c17dd5a-9b2a-41f4-ae62-2296d1e18ce4','2025-04-02',1200100,'cash','received','VY-37-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('435bb150-774a-4b25-97b1-ff42771c85b2','JRN-20261003-0102','2025-04-02','payment','f605dfa0-a5f7-4097-ac80-49739f69b78f','Payment from MANASA HP GAS AGENCY - VY-37-A','posted',1,1200100,1200100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('aa86ad16-dc36-437f-855b-307a1da4ce3b','435bb150-774a-4b25-97b1-ff42771c85b2','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1200100,0,NULL,NULL,'MANASA HP GAS AGENCY','Payment receipt',1,NOW(),1),
('3cecbdd2-7caa-441d-9eaf-c17ff193d046','435bb150-774a-4b25-97b1-ff42771c85b2','d60aa98d-5e77-4082-8a5c-e56de425146c',0,1200100,NULL,NULL,'MANASA HP GAS AGENCY','Payment receipt',1,NOW(),1);

-- ======= MANISHA ENTERPRISES =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('711b37ad-48e7-4255-98b5-ac265d946cd2');
DELETE FROM journal_lines WHERE journal_id IN ('eac084e0-dfbd-4337-ada3-a6dfda734047');
DELETE FROM journal_entries WHERE id IN ('eac084e0-dfbd-4337-ada3-a6dfda734047');
DELETE FROM invoice_payments WHERE id IN ('9bd54256-7380-4b37-a4f8-de2e7fe54d75');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('fe57a01e-7dea-4e12-b145-57adaff4029a','048b8f48-ae60-47f4-bd90-e8af99203c36','2025-06-28',6400000,'cash','received','VY-173-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('d6129bfb-9712-40ba-bbfa-88b14d847b31','JRN-20261003-0103','2025-06-28','payment','fe57a01e-7dea-4e12-b145-57adaff4029a','Payment from MANISHA ENTERPRISES - VY-173-A','posted',1,6400000,6400000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('dd133c21-b2bf-452b-b034-e8ab70d08d0d','d6129bfb-9712-40ba-bbfa-88b14d847b31','23d1cabd-e89f-4bd8-a208-91f59c3898c2',6400000,0,NULL,NULL,'MANISHA ENTERPRISES','Payment receipt',1,NOW(),1),
('b016811d-5db9-4687-9365-733b52d1d266','d6129bfb-9712-40ba-bbfa-88b14d847b31','fea76272-e633-4736-aece-498de7e878ed',0,6400000,NULL,NULL,'MANISHA ENTERPRISES','Payment receipt',1,NOW(),1);

-- ======= MS HIGHWAY PETROLEUM CENTRE KANCHARAPALM (alone MS Site) =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('da2be187-222f-4144-802e-7ecfaf838be2');
DELETE FROM journal_lines WHERE journal_id IN ('dff25dd1-77e3-40bb-9482-f29481dcd6ed');
DELETE FROM journal_entries WHERE id IN ('dff25dd1-77e3-40bb-9482-f29481dcd6ed');
DELETE FROM invoice_payments WHERE id IN ('2c46ac19-003b-4e51-b79a-9dd027d0db34');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('b3a269a9-d0b2-464d-a8bb-0a405176ad06','07165964-65e8-4c8c-a6d8-b2a6e673c39b','2025-10-16',378100,'cash','received','VY-284-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('0c191999-7e39-4730-a0e1-05e9d886bcb4','JRN-20261003-0104','2025-10-16','payment','b3a269a9-d0b2-464d-a8bb-0a405176ad06','Payment from MS HIGHWAY PETROLEUM CENTRE KANCHARAPALM (alone MS Site) - VY-284-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('20e3e3f2-d1e2-4b0a-a86d-13d6a4d7565a','0c191999-7e39-4730-a0e1-05e9d886bcb4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MS HIGHWAY PETROLEUM CENTRE KANCHARAPALM (alone MS Site)','Payment receipt',1,NOW(),1),
('559e62f5-3089-410f-a759-6fe09c595be0','0c191999-7e39-4730-a0e1-05e9d886bcb4','c5003298-6322-4633-ac82-50e93baa369e',0,378100,NULL,NULL,'MS HIGHWAY PETROLEUM CENTRE KANCHARAPALM (alone MS Site)','Payment receipt',1,NOW(),1);

-- ======= MS HSD SRI POLAMAMBA FILLING STATION =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('eff44208-7567-46d1-938a-67309f93a1cd');
DELETE FROM journal_lines WHERE journal_id IN ('2487746c-c424-4b98-80bf-74d37c91ffe7');
DELETE FROM journal_entries WHERE id IN ('2487746c-c424-4b98-80bf-74d37c91ffe7');
DELETE FROM invoice_payments WHERE id IN ('dd0d38f2-cb2c-4058-a8a7-e9aa39dc68bb');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('fb8690eb-2d0e-4207-8f49-3a0bc6894043','7f0d8246-8a04-4d4e-bfff-ab8ce9add349','2025-10-16',378100,'cash','received','VY-285-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('212bf5a7-e863-476c-b279-fa759e7d02e4','JRN-20261003-0105','2025-10-16','payment','fb8690eb-2d0e-4207-8f49-3a0bc6894043','Payment from MS HSD SRI POLAMAMBA FILLING STATION - VY-285-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('ff5f9ed4-a19c-45bb-9a92-9f1f1451eedd','212bf5a7-e863-476c-b279-fa759e7d02e4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MS HSD SRI POLAMAMBA FILLING STATION','Payment receipt',1,NOW(),1),
('3830d944-634c-4125-b0e3-d44d3ecfb75a','212bf5a7-e863-476c-b279-fa759e7d02e4','3acc9739-574b-4127-8db4-65bd2738509a',0,378100,NULL,NULL,'MS HSD SRI POLAMAMBA FILLING STATION','Payment receipt',1,NOW(),1);

-- ======= MSHSD BHANU FUEL FILLING STN VSP =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('48c5038e-5144-4ef6-b31f-d30c697ce8fa');
DELETE FROM journal_lines WHERE journal_id IN ('9a20639c-5fd1-4593-8b03-d52ef0f1efaa');
DELETE FROM journal_entries WHERE id IN ('9a20639c-5fd1-4593-8b03-d52ef0f1efaa');
DELETE FROM invoice_payments WHERE id IN ('c279c804-7894-4593-8ed3-dbaa7580e577');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('7b17bd3b-dc27-439d-82e8-ea0e3bc8dead','a0f8a3c6-bdd8-4b1d-b7d5-7b2c7d342104','2025-10-16',378100,'cash','received','VY-297-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('485c1560-1175-4d28-98dc-ab6f33cd1b1a','JRN-20261003-0106','2025-10-16','payment','7b17bd3b-dc27-439d-82e8-ea0e3bc8dead','Payment from MSHSD BHANU FUEL FILLING STN VSP - VY-297-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('d8c75f3c-c363-4c69-b380-c9d302e7db6a','485c1560-1175-4d28-98dc-ab6f33cd1b1a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MSHSD BHANU FUEL FILLING STN VSP','Payment receipt',1,NOW(),1),
('dd229d14-2472-4b6f-b25c-d06d4b0b01c3','485c1560-1175-4d28-98dc-ab6f33cd1b1a','4795cdd9-e24f-45b3-8102-89b872920cf6',0,378100,NULL,NULL,'MSHSD BHANU FUEL FILLING STN VSP','Payment receipt',1,NOW(),1);

-- ======= MSHSD HP Auto Care Centre Resapuvanipalm =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('c07fa055-82b4-44a4-a2fa-e1e4fbc949d7');
DELETE FROM journal_lines WHERE journal_id IN ('dd7ffbf8-267c-4f5f-a11c-e2af8c30f84a');
DELETE FROM journal_entries WHERE id IN ('dd7ffbf8-267c-4f5f-a11c-e2af8c30f84a');
DELETE FROM invoice_payments WHERE id IN ('d2c6b5a0-341b-4a8e-b7af-e44c6986d293');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('f94194d4-7cf8-4121-a502-1f2b016d275c','85120bf9-4f22-4332-8988-9955bf855405','2025-10-16',378100,'cash','received','VY-287-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('6c5136d0-7f31-4288-b3ef-38c2bb454e37','JRN-20261003-0107','2025-10-16','payment','f94194d4-7cf8-4121-a502-1f2b016d275c','Payment from MSHSD HP Auto Care Centre Resapuvanipalm - VY-287-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('2a4b670c-b92a-402a-98ae-b47313846091','6c5136d0-7f31-4288-b3ef-38c2bb454e37','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MSHSD HP Auto Care Centre Resapuvanipalm','Payment receipt',1,NOW(),1),
('45ea5d05-1288-4a71-a8f5-c5ef3c6bf555','6c5136d0-7f31-4288-b3ef-38c2bb454e37','559fe317-763d-4f20-8329-1570e99e4435',0,378100,NULL,NULL,'MSHSD HP Auto Care Centre Resapuvanipalm','Payment receipt',1,NOW(),1);

-- ======= MSHSD KAN SONS VISAKHAPATNAM =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('c1b19235-6ed0-487d-a77a-44b3609da2b3');
DELETE FROM journal_lines WHERE journal_id IN ('2e096718-73f3-4c6d-8f08-f9786417fc1b');
DELETE FROM journal_entries WHERE id IN ('2e096718-73f3-4c6d-8f08-f9786417fc1b');
DELETE FROM invoice_payments WHERE id IN ('456815cc-3786-42c8-9e0b-a53dde758814');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('e3b3e1db-1d00-49bd-a84a-212eaab70370','a2d7241e-5020-476e-953e-2773ea2ba94a','2025-10-16',378100,'cash','received','VY-283-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('24d0ebc6-34c3-4c39-8238-6bcddc3d4a6e','JRN-20261003-0108','2025-10-16','payment','e3b3e1db-1d00-49bd-a84a-212eaab70370','Payment from MSHSD KAN SONS VISAKHAPATNAM - VY-283-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('9f7554a8-62cb-4320-b0fe-54cd8d7eb139','24d0ebc6-34c3-4c39-8238-6bcddc3d4a6e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MSHSD KAN SONS VISAKHAPATNAM','Payment receipt',1,NOW(),1),
('b25465ce-ef36-462e-ab86-a5ed6a83e1d0','24d0ebc6-34c3-4c39-8238-6bcddc3d4a6e','fda3ab88-19e3-41db-a546-c3cf35f1516e',0,378100,NULL,NULL,'MSHSD KAN SONS VISAKHAPATNAM','Payment receipt',1,NOW(),1);

-- ======= MSHSD LALITHA GOWRI PETROLEUM CENTRE =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('473924ca-153d-4814-ba55-45a51a92f992');
DELETE FROM journal_lines WHERE journal_id IN ('475b8e38-1607-4d4f-9c6d-48bf8ab4ec67');
DELETE FROM journal_entries WHERE id IN ('475b8e38-1607-4d4f-9c6d-48bf8ab4ec67');
DELETE FROM invoice_payments WHERE id IN ('7526057d-21e3-4aec-b668-588580121452');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('ec983e1a-2d8b-49b6-a76b-6bf6883ad156','7372ad69-2567-4151-9206-7947514be831','2025-10-16',378100,'cash','received','VY-304-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('d920591e-6c7a-41c1-9548-6c85b3021cf4','JRN-20261003-0109','2025-10-16','payment','ec983e1a-2d8b-49b6-a76b-6bf6883ad156','Payment from MSHSD LALITHA GOWRI PETROLEUM CENTRE - VY-304-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('22e5dbad-68bc-42ed-b8d0-71740ca4607d','d920591e-6c7a-41c1-9548-6c85b3021cf4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MSHSD LALITHA GOWRI PETROLEUM CENTRE','Payment receipt',1,NOW(),1),
('5323f8f4-788d-4a31-b902-7d18355a890f','d920591e-6c7a-41c1-9548-6c85b3021cf4','1c8725c5-db92-4f7e-bdc8-b31351673cf8',0,378100,NULL,NULL,'MSHSD LALITHA GOWRI PETROLEUM CENTRE','Payment receipt',1,NOW(),1);

-- ======= MSHSD MAHALAKSHMI FUELS BHEMILI =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('1f024a68-764d-4dba-9b63-52a2d09c3fa2');
DELETE FROM journal_lines WHERE journal_id IN ('b3c45bcd-e1fe-4549-98b3-12d16f917af8');
DELETE FROM journal_entries WHERE id IN ('b3c45bcd-e1fe-4549-98b3-12d16f917af8');
DELETE FROM invoice_payments WHERE id IN ('ac9d548a-51fb-42da-9877-f8f759692845');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('114fde03-6875-432f-bd46-7affee02c67e','b53e36fc-04e3-4d9b-bd54-45863dab15ce','2025-10-16',378100,'cash','received','VY-302-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('95e10df0-696c-487d-b3b6-e0ce898ff4e2','JRN-20261003-0110','2025-10-16','payment','114fde03-6875-432f-bd46-7affee02c67e','Payment from MSHSD MAHALAKSHMI FUELS BHEMILI - VY-302-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('2dc1b76b-89f5-495c-822e-9af8c940d326','95e10df0-696c-487d-b3b6-e0ce898ff4e2','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MSHSD MAHALAKSHMI FUELS BHEMILI','Payment receipt',1,NOW(),1),
('2f7ac897-372f-4620-8ed9-31e260ff88ec','95e10df0-696c-487d-b3b6-e0ce898ff4e2','635234eb-20b9-46a3-b272-fb7e03e50a6e',0,378100,NULL,NULL,'MSHSD MAHALAKSHMI FUELS BHEMILI','Payment receipt',1,NOW(),1);

-- ======= MSHSD MUMMANA PETROLEUM PEDAGANTYADA =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('eac6602b-de28-4d38-9665-06896632f71d');
DELETE FROM journal_lines WHERE journal_id IN ('11c77e2f-c915-4244-8ea4-848ba6ab47b5');
DELETE FROM journal_entries WHERE id IN ('11c77e2f-c915-4244-8ea4-848ba6ab47b5');
DELETE FROM invoice_payments WHERE id IN ('39fb01be-ebfb-45fc-a60b-36e5222ce80e');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('0902f860-b8b0-4766-a5d8-f1350b74df92','d58442f6-01c2-404e-9035-55c71a892c3c','2025-10-16',378100,'cash','received','VY-293-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('50f6b25a-1519-47b2-9572-0b83100bb93e','JRN-20261003-0111','2025-10-16','payment','0902f860-b8b0-4766-a5d8-f1350b74df92','Payment from MSHSD MUMMANA PETROLEUM PEDAGANTYADA - VY-293-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('2e353d71-7547-4be2-bc90-f6a381b42604','50f6b25a-1519-47b2-9572-0b83100bb93e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MSHSD MUMMANA PETROLEUM PEDAGANTYADA','Payment receipt',1,NOW(),1),
('78560a97-550d-4cf9-a938-253095a13f0e','50f6b25a-1519-47b2-9572-0b83100bb93e','a42f6c0c-83d4-4121-a4be-2b678b2de82a',0,378100,NULL,NULL,'MSHSD MUMMANA PETROLEUM PEDAGANTYADA','Payment receipt',1,NOW(),1);

-- ======= MSHSD PARVATI PETROLEUM SONTHYAM =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('d4eef8f3-e881-4774-a77b-4f49d2103cb2');
DELETE FROM journal_lines WHERE journal_id IN ('20074c48-c73b-4d89-a67f-210609d1dcd0');
DELETE FROM journal_entries WHERE id IN ('20074c48-c73b-4d89-a67f-210609d1dcd0');
DELETE FROM invoice_payments WHERE id IN ('bbac6d92-7eef-428d-aba0-6889a8372f5b');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('c0e3cd9c-427f-435a-b277-7e09de5c6608','2637d336-f40b-45ae-9d72-87e1c6702d02','2025-10-16',378100,'cash','received','VY-301-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('55ad235d-b848-428c-8a8a-24b396dad7b1','JRN-20261003-0112','2025-10-16','payment','c0e3cd9c-427f-435a-b277-7e09de5c6608','Payment from MSHSD PARVATI PETROLEUM SONTHYAM - VY-301-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('554343fc-a7b1-4131-9adf-fec53399fbdd','55ad235d-b848-428c-8a8a-24b396dad7b1','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MSHSD PARVATI PETROLEUM SONTHYAM','Payment receipt',1,NOW(),1),
('8b96bc32-4f56-4838-9c98-9ce47d628beb','55ad235d-b848-428c-8a8a-24b396dad7b1','3695dbf3-6a68-42d7-81c1-ca20d4b2b5c7',0,378100,NULL,NULL,'MSHSD PARVATI PETROLEUM SONTHYAM','Payment receipt',1,NOW(),1);

-- ======= MSHSD S V FILLING STATION GAJUWAKA =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('f2698fe8-92ec-4548-9f23-fcc7875d1036');
DELETE FROM journal_lines WHERE journal_id IN ('b78fc0f3-ffa2-49f3-ae68-8eb42aae3530');
DELETE FROM journal_entries WHERE id IN ('b78fc0f3-ffa2-49f3-ae68-8eb42aae3530');
DELETE FROM invoice_payments WHERE id IN ('8eb732d3-eaf4-485d-99fe-1a9b95a2c1ad');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('828369b1-9b90-4273-9ee3-664d8e3aa84d','d4be3598-7c0d-42b7-b2ef-ec99a340bb96','2025-10-16',378100,'cash','received','VY-296-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('aa33d493-665f-4ffe-8b37-6527bbc0c6ce','JRN-20261003-0113','2025-10-16','payment','828369b1-9b90-4273-9ee3-664d8e3aa84d','Payment from MSHSD S V FILLING STATION GAJUWAKA - VY-296-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('c8a5fd0f-a3ab-4a5a-b464-7751652f3fde','aa33d493-665f-4ffe-8b37-6527bbc0c6ce','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MSHSD S V FILLING STATION GAJUWAKA','Payment receipt',1,NOW(),1),
('e9805502-a068-478c-af9b-59f91f889880','aa33d493-665f-4ffe-8b37-6527bbc0c6ce','c006ecbe-0ee4-42d1-ba48-72668c704789',0,378100,NULL,NULL,'MSHSD S V FILLING STATION GAJUWAKA','Payment receipt',1,NOW(),1);

-- ======= MSHSD SREE VENKAYAMMA KANIKI REDDY AGN =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('9ce310a5-305e-473d-b9d9-0f2b7466d4d3');
DELETE FROM journal_lines WHERE journal_id IN ('a5b4d09d-2b65-46e5-a5fb-6ac3200afb4e');
DELETE FROM journal_entries WHERE id IN ('a5b4d09d-2b65-46e5-a5fb-6ac3200afb4e');
DELETE FROM invoice_payments WHERE id IN ('c4084513-a552-43d3-b90a-395d43796e56');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('0a33b721-16f0-4121-aaf0-0235a1755aa7','71240aee-8192-4a14-a16c-6f076de943b6','2025-10-16',378100,'cash','received','VY-295-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('ce0b3e29-f67d-45be-be2d-d88c9befef49','JRN-20261003-0114','2025-10-16','payment','0a33b721-16f0-4121-aaf0-0235a1755aa7','Payment from MSHSD SREE VENKAYAMMA KANIKI REDDY AGN - VY-295-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('6755f60a-6c5d-4120-a6d4-191f2aa8abfe','ce0b3e29-f67d-45be-be2d-d88c9befef49','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MSHSD SREE VENKAYAMMA KANIKI REDDY AGN','Payment receipt',1,NOW(),1),
('917bed8a-d430-4c3e-865f-a82fcbe0cc4a','ce0b3e29-f67d-45be-be2d-d88c9befef49','f1c4b676-0b92-4f3c-95b5-c361241c86e9',0,378100,NULL,NULL,'MSHSD SREE VENKAYAMMA KANIKI REDDY AGN','Payment receipt',1,NOW(),1);

-- ======= MSHSD SRI SRINIVASA FLG STN PAPARAJUPALM =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('80cedec3-e4a4-4e40-9129-c7b1fa439384');
DELETE FROM journal_lines WHERE journal_id IN ('6f46dd9e-bf8c-47c3-9c3f-a2f6875e9353');
DELETE FROM journal_entries WHERE id IN ('6f46dd9e-bf8c-47c3-9c3f-a2f6875e9353');
DELETE FROM invoice_payments WHERE id IN ('27404d55-8701-40d7-ba2b-a8e9737ea2d2');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('c92737e8-4965-4914-9682-3d38a4b4cf9c','42e46973-80ea-4e4b-9c43-9dc54c4d05cd','2025-10-16',378100,'cash','received','VY-294-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('3d110daa-e31f-4de7-bd1a-9edb4d7bf8f2','JRN-20261003-0115','2025-10-16','payment','c92737e8-4965-4914-9682-3d38a4b4cf9c','Payment from MSHSD SRI SRINIVASA FLG STN PAPARAJUPALM - VY-294-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('dc41b14a-ceb8-4796-a2f8-ae148cd63628','3d110daa-e31f-4de7-bd1a-9edb4d7bf8f2','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MSHSD SRI SRINIVASA FLG STN PAPARAJUPALM','Payment receipt',1,NOW(),1),
('a69fa744-93b2-43b3-bc92-ba0ad9d44c51','3d110daa-e31f-4de7-bd1a-9edb4d7bf8f2','03b7682b-a146-4afb-934a-eeb0a4c0b0dd',0,378100,NULL,NULL,'MSHSD SRI SRINIVASA FLG STN PAPARAJUPALM','Payment receipt',1,NOW(),1);

-- ======= MSHSD SRI VENKATA SAI MAHALAKSHMI AGN =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('0b070032-bdbc-49bd-8e6a-9570511f4ef8');
DELETE FROM journal_lines WHERE journal_id IN ('22a8d5b3-32ea-42b7-ad9a-190737d1aec7');
DELETE FROM journal_entries WHERE id IN ('22a8d5b3-32ea-42b7-ad9a-190737d1aec7');
DELETE FROM invoice_payments WHERE id IN ('68c00588-886e-464b-939a-8f85f590f93f');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('b82df904-7042-45de-a85b-9c677102dc52','d4a9f8a4-60af-4e4c-bb9b-1c4545c2b72a','2025-10-16',378100,'cash','received','VY-308-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('88e15520-cf6d-419a-8699-2efcb0500260','JRN-20261003-0116','2025-10-16','payment','b82df904-7042-45de-a85b-9c677102dc52','Payment from MSHSD SRI VENKATA SAI MAHALAKSHMI AGN - VY-308-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('262c60ea-9342-40be-95c4-7889474235b1','88e15520-cf6d-419a-8699-2efcb0500260','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MSHSD SRI VENKATA SAI MAHALAKSHMI AGN','Payment receipt',1,NOW(),1),
('8a5685ae-022b-4be2-b9bd-57c8476d6c61','88e15520-cf6d-419a-8699-2efcb0500260','0091c689-6309-4209-aa13-520262205391',0,378100,NULL,NULL,'MSHSD SRI VENKATA SAI MAHALAKSHMI AGN','Payment receipt',1,NOW(),1);

-- ======= MSHSD SRI VENKATESWARA FUEL FLG STN VSP =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('ecbb262b-ea94-4e86-a5de-6ed344156d1f');
DELETE FROM journal_lines WHERE journal_id IN ('12598b6f-2a7f-49b4-bf7a-51f435581262');
DELETE FROM journal_entries WHERE id IN ('12598b6f-2a7f-49b4-bf7a-51f435581262');
DELETE FROM invoice_payments WHERE id IN ('b7eb7fc3-7936-430c-8b9f-484ebb9e23a0');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('810f14cf-ca79-4caa-aef6-6a9c8e2658f2','1801d01f-65a2-4366-b51b-a1477e5eefcf','2025-10-16',378100,'cash','received','VY-286-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('913eef27-50e9-498e-94c6-7bfdfe426b77','JRN-20261003-0117','2025-10-16','payment','810f14cf-ca79-4caa-aef6-6a9c8e2658f2','Payment from MSHSD SRI VENKATESWARA FUEL FLG STN VSP - VY-286-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('fbece753-e314-4509-a48a-8000aacef3ee','913eef27-50e9-498e-94c6-7bfdfe426b77','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'MSHSD SRI VENKATESWARA FUEL FLG STN VSP','Payment receipt',1,NOW(),1),
('bc176fcd-2c53-441a-909b-a8398de40e47','913eef27-50e9-498e-94c6-7bfdfe426b77','b5feb80c-57bf-4fb1-9fe4-3a947cb00421',0,378100,NULL,NULL,'MSHSD SRI VENKATESWARA FUEL FLG STN VSP','Payment receipt',1,NOW(),1);

-- ======= MSHSD VISALAKSHI FILLING STATION RAMPURM =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('0380ac68-a7b3-4fe1-af52-37828e4eec40','49fba1b8-aed0-4860-9902-e75bb0a38e65');
DELETE FROM journal_lines WHERE journal_id IN ('d2ee0ade-0751-48c5-8da9-1a8427dce3da','804d8f3d-c151-4eb6-ae38-bf6a55eef81a');
DELETE FROM journal_entries WHERE id IN ('d2ee0ade-0751-48c5-8da9-1a8427dce3da','804d8f3d-c151-4eb6-ae38-bf6a55eef81a');
DELETE FROM invoice_payments WHERE id IN ('7a8e6043-7895-4a92-a590-7d52ada503bb','1bbf3bbf-6939-47b4-8cd5-542fe8ef5934');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('5b39d213-b6f8-439d-b31e-285a4f986d8b','ad4bbc85-3728-427a-a7e9-771c69f0bb28','2025-09-09',172100,'cash','received','VY-256-A',1,1,NOW(),NOW()),
('30059d30-b298-4958-a129-6888b2b5bd90','d44a2b66-b934-449e-9270-f2177b73a04f','2025-10-16',344200,'cash','received','VY-305-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('a0232340-646a-4abb-91ba-de6e88b0bb0f','JRN-20261003-0118','2025-09-09','payment','5b39d213-b6f8-439d-b31e-285a4f986d8b','Payment from MSHSD VISALAKSHI FILLING STATION RAMPURM - VY-256-A','posted',1,172100,172100,1,1,NOW(),NOW()),
('ae5320d6-364f-4bc2-993b-33757ac45e47','JRN-20261003-0119','2025-10-16','payment','30059d30-b298-4958-a129-6888b2b5bd90','Payment from MSHSD VISALAKSHI FILLING STATION RAMPURM - VY-305-A','posted',1,344200,344200,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('a985c513-f407-4670-93f2-377e361b80ad','a0232340-646a-4abb-91ba-de6e88b0bb0f','23d1cabd-e89f-4bd8-a208-91f59c3898c2',172100,0,NULL,NULL,'MSHSD VISALAKSHI FILLING STATION RAMPURM','Payment receipt',1,NOW(),1),
('f9971bdc-eb5c-4831-8d1f-2027d37d6a7b','a0232340-646a-4abb-91ba-de6e88b0bb0f','eedad28e-8a90-4832-bd39-3d05bb8fd095',0,172100,NULL,NULL,'MSHSD VISALAKSHI FILLING STATION RAMPURM','Payment receipt',1,NOW(),1),
('907cae7e-062a-4e15-81b2-1d22da88c483','ae5320d6-364f-4bc2-993b-33757ac45e47','23d1cabd-e89f-4bd8-a208-91f59c3898c2',344200,0,NULL,NULL,'MSHSD VISALAKSHI FILLING STATION RAMPURM','Payment receipt',1,NOW(),1),
('40a36757-d1c3-4534-8859-626b46e0d11d','ae5320d6-364f-4bc2-993b-33757ac45e47','eedad28e-8a90-4832-bd39-3d05bb8fd095',0,344200,NULL,NULL,'MSHSD VISALAKSHI FILLING STATION RAMPURM','Payment receipt',1,NOW(),1);

-- ======= NAMADI RAJENDRA PRASAD =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('54b57cd4-39af-40ac-b449-aced2692f028');
DELETE FROM journal_lines WHERE journal_id IN ('8b9ca44e-d8e0-4e66-9df4-18f31992312c');
DELETE FROM journal_entries WHERE id IN ('8b9ca44e-d8e0-4e66-9df4-18f31992312c');
DELETE FROM invoice_payments WHERE id IN ('4618a7d6-6e70-4d1d-8353-19c46bbdc2ce');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('ebb9a161-54a4-4544-ba8c-3c7e46887b0d','898f0a92-097e-4725-8f63-b2393deb4ca6','2025-06-10',1000000,'cash','received','VY-169-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('32a23f6f-7705-40f6-9a17-321efa745165','JRN-20261003-0120','2025-06-10','payment','ebb9a161-54a4-4544-ba8c-3c7e46887b0d','Payment from NAMADI RAJENDRA PRASAD - VY-169-A','posted',1,1000000,1000000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('8c24b2b8-8e0a-41b7-b48f-f3a462d0bbff','32a23f6f-7705-40f6-9a17-321efa745165','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1000000,0,NULL,NULL,'NAMADI RAJENDRA PRASAD','Payment receipt',1,NOW(),1),
('ac4d5a02-de30-475d-9e4e-09836edb73b9','32a23f6f-7705-40f6-9a17-321efa745165','a0b174ea-fbeb-4b2c-93e9-4947a9d55c84',0,1000000,NULL,NULL,'NAMADI RAJENDRA PRASAD','Payment receipt',1,NOW(),1);

-- ======= P VENKATA MUKHESWARA RAO =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('f2bc8a7c-b69f-4774-8f7a-1821e814c765');
DELETE FROM journal_lines WHERE journal_id IN ('6df38e27-8c97-4ba7-ac6d-83cca8e52104');
DELETE FROM journal_entries WHERE id IN ('6df38e27-8c97-4ba7-ac6d-83cca8e52104');
DELETE FROM invoice_payments WHERE id IN ('060cf29c-0167-4e59-9906-20f5ce60c02a');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('2633f565-d23b-49ef-9aab-cca3f36bf447','a6440017-2abc-41d5-a9aa-6a9e1bb7f210','2025-07-28',3180000,'cash','received','VY-218-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('b83e2937-0b94-4ff8-acea-2463a1e8312b','JRN-20261003-0121','2025-07-28','payment','2633f565-d23b-49ef-9aab-cca3f36bf447','Payment from P VENKATA MUKHESWARA RAO - VY-218-A','posted',1,3180000,3180000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('ee189e9a-caad-40fc-80b3-2155a32ba955','b83e2937-0b94-4ff8-acea-2463a1e8312b','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3180000,0,NULL,NULL,'P VENKATA MUKHESWARA RAO','Payment receipt',1,NOW(),1),
('d9172d20-dde2-4619-9fc0-1ef66fd64447','b83e2937-0b94-4ff8-acea-2463a1e8312b','a9eb9fc4-8f20-4a1b-8a2c-47202a319646',0,3180000,NULL,NULL,'P VENKATA MUKHESWARA RAO','Payment receipt',1,NOW(),1);

-- ======= PADALA CHANIKYA =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('0385965e-c762-4c8c-9887-e373b4ccc33e','d121ed5d-cfa4-47b9-b623-456e52707ef6','eec79d81-41a7-490b-822a-e695a2f56e25','ca2dc00f-157f-47b2-90f8-572c835dca8a','7e10048d-818e-418d-833d-85f1576ee230','29a726c8-b9d2-4cee-8d7e-3ebb759c7adc');
DELETE FROM journal_lines WHERE journal_id IN ('ebe2974d-96bf-42a6-90da-851cfb583d85','1b684797-0cda-4c7c-81de-3c07c6fbbb8e','c1536105-e9d5-4e31-a617-2d5ae49bd1a2','3f708331-7222-4e57-8943-e7185ac86ccf','10203648-d3a6-44a9-861f-33836ef22d52');
DELETE FROM journal_entries WHERE id IN ('ebe2974d-96bf-42a6-90da-851cfb583d85','1b684797-0cda-4c7c-81de-3c07c6fbbb8e','c1536105-e9d5-4e31-a617-2d5ae49bd1a2','3f708331-7222-4e57-8943-e7185ac86ccf','10203648-d3a6-44a9-861f-33836ef22d52');
DELETE FROM invoice_payments WHERE id IN ('919bc113-0976-48e3-91e2-17800d883216','d5b55b3a-d45f-4d75-b9f9-032355db76d5','0145aa4e-40cf-4b77-905a-0328d6c6bc6b','48829aa8-8067-49b7-9327-771e7259791b','92009493-f2ea-4cde-aaec-f365eee22d39');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('237e868e-74d0-4653-bbae-98bae823e093','46284f90-20d5-47a3-8bed-5c27f82410a8','2025-06-12',3000000,'cash','received','VY-176-A',1,1,NOW(),NOW()),
('06988c9e-1a2f-47d1-b790-983e5219c81a','46284f90-20d5-47a3-8bed-5c27f82410a8','2025-06-13',210000,'cash','received','VY-176-B',1,1,NOW(),NOW()),
('f3786b2c-5ee1-47ee-b280-a246c84d32c5','32ddb260-ed18-4d75-b529-36807b7f2ce3','2025-06-13',790100,'cash','received','VY-179-A',1,1,NOW(),NOW()),
('eab0893a-1d7b-4c57-aa40-90555d8fecf3','32ddb260-ed18-4d75-b529-36807b7f2ce3','2025-06-21',210000,'cash','received','VY-179-B',1,1,NOW(),NOW()),
('98df0551-ee53-45d3-8fc0-f0fcc131af49','69e33071-a295-48fa-ade5-dc7547e033db','2025-06-21',2974048,'cash','received','VY-190-A',1,1,NOW(),NOW()),
('a83a6637-7514-4030-8e93-baf48a9ad247','1fb0b448-92ee-45a3-986a-60b9d9f90285','2025-06-21',265952,'cash','received','VY-189-A',1,1,NOW(),NOW()),
('788af86c-8ec9-45be-a12d-942e1593f5d7','1fb0b448-92ee-45a3-986a-60b9d9f90285','2025-06-26',424000,'cash','received','VY-189-B',1,1,NOW(),NOW()),
('23f76c5d-99b4-4db0-afa8-3b363238a1a4','1fb0b448-92ee-45a3-986a-60b9d9f90285','2025-07-14',2000000,'cash','received','VY-189-C',1,1,NOW(),NOW()),
('9c82cb34-8238-4c0d-8bd9-7cb04d73432c','1fb0b448-92ee-45a3-986a-60b9d9f90285','2025-07-17',760048,'cash','received','VY-189-D',1,1,NOW(),NOW()),
('d2b49904-6e4b-4809-8144-e33898e8a011','61b35645-b722-4714-bdf2-59c09d473014','2025-07-17',429952,'cash','received','VY-208-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('3264166c-e4b1-4974-8741-45a1e9488981','JRN-20261003-0122','2025-06-12','payment','237e868e-74d0-4653-bbae-98bae823e093','Payment from PADALA CHANIKYA - VY-176-A','posted',1,3000000,3000000,1,1,NOW(),NOW()),
('f9807f88-c771-456d-bfe2-068cdaa2c7ed','JRN-20261003-0123','2025-06-13','payment','06988c9e-1a2f-47d1-b790-983e5219c81a','Payment from PADALA CHANIKYA - VY-176-B','posted',1,210000,210000,1,1,NOW(),NOW()),
('853dd90d-005b-4472-a2bb-893f45a46983','JRN-20261003-0124','2025-06-13','payment','f3786b2c-5ee1-47ee-b280-a246c84d32c5','Payment from PADALA CHANIKYA - VY-179-A','posted',1,790100,790100,1,1,NOW(),NOW()),
('59a75ec3-1a39-469a-931c-66b4ca9e659f','JRN-20261003-0125','2025-06-21','payment','eab0893a-1d7b-4c57-aa40-90555d8fecf3','Payment from PADALA CHANIKYA - VY-179-B','posted',1,210000,210000,1,1,NOW(),NOW()),
('cb4a1218-4ded-4b25-84e1-f864d6304544','JRN-20261003-0126','2025-06-21','payment','98df0551-ee53-45d3-8fc0-f0fcc131af49','Payment from PADALA CHANIKYA - VY-190-A','posted',1,2974048,2974048,1,1,NOW(),NOW()),
('9bdf8913-3fa4-4321-90ae-d1d9c1f18805','JRN-20261003-0127','2025-06-21','payment','a83a6637-7514-4030-8e93-baf48a9ad247','Payment from PADALA CHANIKYA - VY-189-A','posted',1,265952,265952,1,1,NOW(),NOW()),
('5a8f1da3-7949-45d9-a5ba-f9f6b6e4c6c9','JRN-20261003-0128','2025-06-26','payment','788af86c-8ec9-45be-a12d-942e1593f5d7','Payment from PADALA CHANIKYA - VY-189-B','posted',1,424000,424000,1,1,NOW(),NOW()),
('986c7e3f-6add-4a25-941a-a2a7401eb122','JRN-20261003-0129','2025-07-14','payment','23f76c5d-99b4-4db0-afa8-3b363238a1a4','Payment from PADALA CHANIKYA - VY-189-C','posted',1,2000000,2000000,1,1,NOW(),NOW()),
('042c06cc-00bd-4bd6-8976-b3d364f824c9','JRN-20261003-0130','2025-07-17','payment','9c82cb34-8238-4c0d-8bd9-7cb04d73432c','Payment from PADALA CHANIKYA - VY-189-D','posted',1,760048,760048,1,1,NOW(),NOW()),
('3ea3ddf8-afea-44fd-b532-5bf68ea0a04f','JRN-20261003-0131','2025-07-17','payment','d2b49904-6e4b-4809-8144-e33898e8a011','Payment from PADALA CHANIKYA - VY-208-A','posted',1,429952,429952,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('f62a3810-d8e4-4530-b16b-c958dd9da15a','3264166c-e4b1-4974-8741-45a1e9488981','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3000000,0,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('ed557810-cf8d-4508-8fb5-840ca4f7c3e0','3264166c-e4b1-4974-8741-45a1e9488981','616f90ba-74ca-466c-9f0f-a834ef1b22dd',0,3000000,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('399d2e4a-9b78-4e8c-894a-57658740831d','f9807f88-c771-456d-bfe2-068cdaa2c7ed','23d1cabd-e89f-4bd8-a208-91f59c3898c2',210000,0,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('45f43d89-1eaf-49ea-a065-cfb63ae62a35','f9807f88-c771-456d-bfe2-068cdaa2c7ed','616f90ba-74ca-466c-9f0f-a834ef1b22dd',0,210000,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('20c1cf6e-2b18-4d21-a03c-87d297bc49a0','853dd90d-005b-4472-a2bb-893f45a46983','23d1cabd-e89f-4bd8-a208-91f59c3898c2',790100,0,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('9e81cff7-4bdd-4128-a021-17ac61eafc33','853dd90d-005b-4472-a2bb-893f45a46983','616f90ba-74ca-466c-9f0f-a834ef1b22dd',0,790100,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('b3f05bd7-dacb-4b31-ac45-7f19671cc143','59a75ec3-1a39-469a-931c-66b4ca9e659f','23d1cabd-e89f-4bd8-a208-91f59c3898c2',210000,0,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('e4c8b7ab-1cd3-4b15-b66a-e85c34427fb0','59a75ec3-1a39-469a-931c-66b4ca9e659f','616f90ba-74ca-466c-9f0f-a834ef1b22dd',0,210000,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('673ca29f-f41b-42de-802d-c05896e47d44','cb4a1218-4ded-4b25-84e1-f864d6304544','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2974048,0,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('26dd0248-d014-45d9-8304-09447c9c6b8a','cb4a1218-4ded-4b25-84e1-f864d6304544','616f90ba-74ca-466c-9f0f-a834ef1b22dd',0,2974048,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('3d875ac4-faeb-41b5-a186-cc1281585ca0','9bdf8913-3fa4-4321-90ae-d1d9c1f18805','23d1cabd-e89f-4bd8-a208-91f59c3898c2',265952,0,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('b380d2ae-0791-4c46-9f58-170043dd0fe8','9bdf8913-3fa4-4321-90ae-d1d9c1f18805','616f90ba-74ca-466c-9f0f-a834ef1b22dd',0,265952,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('13841463-05b4-4a12-895d-f3634dc6c6b8','5a8f1da3-7949-45d9-a5ba-f9f6b6e4c6c9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',424000,0,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('1d6f1c00-b24b-4086-acb1-668d4c0dc087','5a8f1da3-7949-45d9-a5ba-f9f6b6e4c6c9','616f90ba-74ca-466c-9f0f-a834ef1b22dd',0,424000,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('f14dd9c6-b20d-4503-8654-655deecdcf81','986c7e3f-6add-4a25-941a-a2a7401eb122','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2000000,0,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('a1c69635-19df-4839-98e6-fee4cfec6db8','986c7e3f-6add-4a25-941a-a2a7401eb122','616f90ba-74ca-466c-9f0f-a834ef1b22dd',0,2000000,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('b83277dc-1298-4618-a4d4-682a6292fe75','042c06cc-00bd-4bd6-8976-b3d364f824c9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',760048,0,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('8456cd53-3015-49fd-9372-de931d15a892','042c06cc-00bd-4bd6-8976-b3d364f824c9','616f90ba-74ca-466c-9f0f-a834ef1b22dd',0,760048,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('54f89275-f1b3-416e-8608-121a0ad99347','3ea3ddf8-afea-44fd-b532-5bf68ea0a04f','23d1cabd-e89f-4bd8-a208-91f59c3898c2',429952,0,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1),
('2cbfe77b-8f28-4723-8e91-f9c082bc1ea9','3ea3ddf8-afea-44fd-b532-5bf68ea0a04f','616f90ba-74ca-466c-9f0f-a834ef1b22dd',0,429952,NULL,NULL,'PADALA CHANIKYA','Payment receipt',1,NOW(),1);

-- ======= PEST CONTROL MANAGEMENT PVT LTD =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('6b244de5-e780-4c87-85d5-ed0e5b1eb0b2','6ef9496f-d61c-42f5-924a-e02ba99113e1','2c0b0030-9b2a-49a6-9278-ee92773d107d');
DELETE FROM journal_lines WHERE journal_id IN ('86f36c7f-8f3e-4528-b781-73a0225350c6','621347ba-7ebc-4e0d-a45e-b7fc9da7ec49','59507713-c39a-4aa7-87a0-5bb883599750');
DELETE FROM journal_entries WHERE id IN ('86f36c7f-8f3e-4528-b781-73a0225350c6','621347ba-7ebc-4e0d-a45e-b7fc9da7ec49','59507713-c39a-4aa7-87a0-5bb883599750');
DELETE FROM invoice_payments WHERE id IN ('f24058ef-2b78-46cb-a41e-8d9fd46e68f7','968bfcb4-20fe-4904-80a4-1f30b20e758a','d9b73b7c-26d4-477f-a558-f38de8afcd2b');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('708d0ae8-f82f-4564-88f2-c34e3b7c78f2','980fdccf-8533-445a-9a6f-818890d09630','2025-08-20',206100,'cash','received','VY-255-A',1,1,NOW(),NOW()),
('2244fcee-685e-4c82-8060-3dc0cd2778aa','d6a5fe46-d076-4227-8f33-45f2626a3b0d','2025-08-28',700600,'cash','received','VY-261-A',1,1,NOW(),NOW()),
('e653cb78-0402-4654-baac-de02b418d3c4','35720274-e2c2-4c9a-8fb9-8b78938cfe95','2025-10-16',378100,'cash','received','VY-288-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('298f3dc8-477a-4456-807e-c16415b52137','JRN-20261003-0132','2025-08-20','payment','708d0ae8-f82f-4564-88f2-c34e3b7c78f2','Payment from PEST CONTROL MANAGEMENT PVT LTD - VY-255-A','posted',1,206100,206100,1,1,NOW(),NOW()),
('17b2fc3d-49fc-46af-a92c-ccf6478e0e04','JRN-20261003-0133','2025-08-28','payment','2244fcee-685e-4c82-8060-3dc0cd2778aa','Payment from PEST CONTROL MANAGEMENT PVT LTD - VY-261-A','posted',1,700600,700600,1,1,NOW(),NOW()),
('729a6311-1f01-40f3-960b-0c79eb5a7b02','JRN-20261003-0134','2025-10-16','payment','e653cb78-0402-4654-baac-de02b418d3c4','Payment from PEST CONTROL MANAGEMENT PVT LTD - VY-288-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('bee7dd27-2db3-43d8-b815-5a1793a23895','298f3dc8-477a-4456-807e-c16415b52137','23d1cabd-e89f-4bd8-a208-91f59c3898c2',206100,0,NULL,NULL,'PEST CONTROL MANAGEMENT PVT LTD','Payment receipt',1,NOW(),1),
('ef21e76f-4aee-403d-be66-ebb249b5fdbb','298f3dc8-477a-4456-807e-c16415b52137','8dbe284a-feb3-469a-9112-c39aaf5d054f',0,206100,NULL,NULL,'PEST CONTROL MANAGEMENT PVT LTD','Payment receipt',1,NOW(),1),
('29a4fe3b-4ed9-4c47-9d88-fc8cc55e7e91','17b2fc3d-49fc-46af-a92c-ccf6478e0e04','23d1cabd-e89f-4bd8-a208-91f59c3898c2',700600,0,NULL,NULL,'PEST CONTROL MANAGEMENT PVT LTD','Payment receipt',1,NOW(),1),
('152d2f3f-23e5-48b6-aabf-4ff6dfdfb3e7','17b2fc3d-49fc-46af-a92c-ccf6478e0e04','8dbe284a-feb3-469a-9112-c39aaf5d054f',0,700600,NULL,NULL,'PEST CONTROL MANAGEMENT PVT LTD','Payment receipt',1,NOW(),1),
('e5014ab9-632a-424e-aa97-97b517342fde','729a6311-1f01-40f3-960b-0c79eb5a7b02','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'PEST CONTROL MANAGEMENT PVT LTD','Payment receipt',1,NOW(),1),
('a5de18c2-3a06-4655-82c0-7e3bb81b976b','729a6311-1f01-40f3-960b-0c79eb5a7b02','8dbe284a-feb3-469a-9112-c39aaf5d054f',0,378100,NULL,NULL,'PEST CONTROL MANAGEMENT PVT LTD','Payment receipt',1,NOW(),1);

-- ======= PODUGU ANNAJI RAO =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('5861e0f2-75b4-43af-af29-6b12cc1f61ac','5fe8fd0d-1eb3-495e-be89-25b569b2f903','e0ef3425-a3f5-4de6-9894-0036b8cf75fe','7a7901a0-5e10-47f3-872d-ed473a7006ab','cbed7a76-d6a8-4377-9664-24179a8bff80');
DELETE FROM journal_lines WHERE journal_id IN ('281d3611-272f-413c-99fe-1cd30f918bd2','3481592a-9ed1-45e9-a7c6-012612ebc9e0','9166ee15-efb0-414d-8002-40af9ba315a5','1e7285bc-2ace-402c-8d67-9a6fddee8657');
DELETE FROM journal_entries WHERE id IN ('281d3611-272f-413c-99fe-1cd30f918bd2','3481592a-9ed1-45e9-a7c6-012612ebc9e0','9166ee15-efb0-414d-8002-40af9ba315a5','1e7285bc-2ace-402c-8d67-9a6fddee8657');
DELETE FROM invoice_payments WHERE id IN ('03a1fc2e-2631-43f2-ab4e-8a69486b4164','6a856d20-6835-4778-bb53-39efeda51cdf','e763eae8-2b52-48b8-b739-8e5e3e4a685f','3724ff20-c523-4747-8f8d-8b71a3853c22');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('a50fcfe3-0426-40fc-a80d-23c7b8906210','01db1cb8-964f-4099-bcd2-7c21356d394d','2025-07-07',2100000,'cash','received','VY-184-A',1,1,NOW(),NOW()),
('b839f485-e0d3-480a-8a38-a72cc53b3fd0','de9bde13-3fb9-40d8-a668-83e1eb3683c1','2025-07-18',2550000,'cash','received','VY-211-A',1,1,NOW(),NOW()),
('5748c257-5bb2-454a-877a-f63895c64ea7','de9bde13-3fb9-40d8-a668-83e1eb3683c1','2025-07-19',600000,'cash','received','VY-211-B',1,1,NOW(),NOW()),
('567d3d14-d05c-4114-bc51-a1f31cd9f744','f670f72b-5d70-4a02-a644-6cdfd953e4db','2025-08-21',3140000,'cash','received','VY-258-A',1,1,NOW(),NOW()),
('f74c2fec-aa4c-48f4-999a-ea1e33c07992','a1d5d187-4e13-4e01-b4a9-0e177d92bef7','2025-10-16',3125000,'cash','received','VY-311-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('c332ca2c-ab40-436b-80d6-b4de077638cd','JRN-20261003-0135','2025-07-07','payment','a50fcfe3-0426-40fc-a80d-23c7b8906210','Payment from PODUGU ANNAJI RAO - VY-184-A','posted',1,2100000,2100000,1,1,NOW(),NOW()),
('a5a1ab28-ed33-4725-8070-5e18f12bf38b','JRN-20261003-0136','2025-07-18','payment','b839f485-e0d3-480a-8a38-a72cc53b3fd0','Payment from PODUGU ANNAJI RAO - VY-211-A','posted',1,2550000,2550000,1,1,NOW(),NOW()),
('b3e2e039-0c21-4ba2-ada8-537c6f38807e','JRN-20261003-0137','2025-07-19','payment','5748c257-5bb2-454a-877a-f63895c64ea7','Payment from PODUGU ANNAJI RAO - VY-211-B','posted',1,600000,600000,1,1,NOW(),NOW()),
('48db2d09-f7de-4f8e-aa80-8bb5b26bd4c9','JRN-20261003-0138','2025-08-21','payment','567d3d14-d05c-4114-bc51-a1f31cd9f744','Payment from PODUGU ANNAJI RAO - VY-258-A','posted',1,3140000,3140000,1,1,NOW(),NOW()),
('6c42abed-4331-475f-b26f-939ff382ab52','JRN-20261003-0139','2025-10-16','payment','f74c2fec-aa4c-48f4-999a-ea1e33c07992','Payment from PODUGU ANNAJI RAO - VY-311-A','posted',1,3125000,3125000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('e81b5f28-679a-4b44-95bb-b4e50fca81f7','c332ca2c-ab40-436b-80d6-b4de077638cd','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2100000,0,NULL,NULL,'PODUGU ANNAJI RAO','Payment receipt',1,NOW(),1),
('bd6b2909-5dfe-4d1a-af42-4f0509b1a1a4','c332ca2c-ab40-436b-80d6-b4de077638cd','3e59f495-e314-4f39-bc4c-3c62bcfad6a1',0,2100000,NULL,NULL,'PODUGU ANNAJI RAO','Payment receipt',1,NOW(),1),
('2015e9ed-c7bd-4d8e-8ce5-7511d1b21c43','a5a1ab28-ed33-4725-8070-5e18f12bf38b','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2550000,0,NULL,NULL,'PODUGU ANNAJI RAO','Payment receipt',1,NOW(),1),
('2090bfa7-c8b7-493b-b83d-626843f2d150','a5a1ab28-ed33-4725-8070-5e18f12bf38b','3e59f495-e314-4f39-bc4c-3c62bcfad6a1',0,2550000,NULL,NULL,'PODUGU ANNAJI RAO','Payment receipt',1,NOW(),1),
('1b5a479e-1c37-4791-b3aa-d47f531e3d9a','b3e2e039-0c21-4ba2-ada8-537c6f38807e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',600000,0,NULL,NULL,'PODUGU ANNAJI RAO','Payment receipt',1,NOW(),1),
('ebab5bfd-376b-45fc-81f2-a2687336b23d','b3e2e039-0c21-4ba2-ada8-537c6f38807e','3e59f495-e314-4f39-bc4c-3c62bcfad6a1',0,600000,NULL,NULL,'PODUGU ANNAJI RAO','Payment receipt',1,NOW(),1),
('57aaaa7f-1659-4f52-a80f-98cf9052af67','48db2d09-f7de-4f8e-aa80-8bb5b26bd4c9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3140000,0,NULL,NULL,'PODUGU ANNAJI RAO','Payment receipt',1,NOW(),1),
('c3814d99-0b08-4bfc-af17-8b3da06c49f5','48db2d09-f7de-4f8e-aa80-8bb5b26bd4c9','3e59f495-e314-4f39-bc4c-3c62bcfad6a1',0,3140000,NULL,NULL,'PODUGU ANNAJI RAO','Payment receipt',1,NOW(),1),
('8186259f-edf9-4bd8-a8ce-12448f82f323','6c42abed-4331-475f-b26f-939ff382ab52','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3125000,0,NULL,NULL,'PODUGU ANNAJI RAO','Payment receipt',1,NOW(),1),
('a8eb1c63-fae2-4ccd-b588-c642320c31f1','6c42abed-4331-475f-b26f-939ff382ab52','3e59f495-e314-4f39-bc4c-3c62bcfad6a1',0,3125000,NULL,NULL,'PODUGU ANNAJI RAO','Payment receipt',1,NOW(),1);

-- ======= PUREJAL TECHNOLOGIES PRIVATE LIMITED =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('4868a4b7-4bc9-428d-ad66-5faedb735ed7','208dd938-eda5-42ba-b28b-078542b43251','d7be5272-3e6d-4c3a-9af2-f81386fa076c','1999c8af-1729-49d4-b38a-26c42e397526','76cd340d-6fed-4455-b22c-1606f86b00ff','4da2a15e-bcdb-4b62-917d-b32f8d0c3f88','f6c79d74-e8ef-407c-805d-13fd6bc29fcf','5f8f8a68-483d-4127-bf89-922718e516c9','09e3978d-f1a6-471d-86e1-c162a47e054c','61cb7f77-b858-4687-af6a-4b012a21d9da','64a3e248-884f-40c6-9503-2329019eb74e','02843332-fb44-4745-bf5a-28f83f60a31e','aa03be0c-05ee-4738-815f-3a1ddf324be9','dd031145-c6dd-4907-bcb2-23d1b223a9fd','a6eb7b9f-dfbc-4582-9498-3332c8b11a71','f2d4e85b-e909-47d4-9d9e-cfbf896ac64d','48b16ba1-0559-449d-8083-14081504917c','dfee5a72-a06c-409c-b36e-0ca4e1483b46','7f2df0b6-7cec-4bc5-8fef-6e6cc8190e63','53d2cb64-12fe-4077-9c32-d8c2b84861d9','e963040a-d1be-48b5-a84c-8b85a4bf33e9','6c807d3b-7292-48c8-9b74-412962e40f73','b074f711-e70e-4dbc-aff1-8cb729ce0536','5a75f687-cd58-49e6-ad49-40134e8c77e2','05ac8452-b457-4fe2-b2d3-3b816a78ddba');
DELETE FROM journal_lines WHERE journal_id IN ('617f4571-df5e-4d20-82d0-1f96ae11e8a5','a04e695b-7e30-4e86-b286-47e0ea721632','ca61a0e7-c7b5-4662-9256-25afaa0b55b1','fab5e9e5-cf3b-4561-b764-6a90745e6989','43cfa1c8-9c88-4bf1-b4f0-72291cc96ca8','700ebbd7-0334-498c-825e-9b3a561b4932','6811041c-5794-486f-ab03-cd6268105b28','dea8efea-a884-4529-9e8b-302dc807000b','980e4e83-e084-44fd-bd8f-40bd0de8f1da','3632aa3d-a0f8-4ea0-83a5-61c0d0505b96','ffe19745-fda2-4cfc-88a8-aae52a523d3f','511fd261-5159-412f-a141-2336ad0a43d0','4afaf880-cc28-4d37-83db-2ca84c83c25f','0f961ae9-e763-4437-98cb-9d2bf6a4442e','085e7eb4-3883-4ac1-976d-6a21f7b32a07','6003c136-03dd-4a04-b696-16440bed6a1e','4f4f5d29-5a6f-4388-b777-03ec80861721','16eaa065-01fd-4760-9511-950245b26bdd','aabdb952-1523-4aed-a921-bcb091f574a5');
DELETE FROM journal_entries WHERE id IN ('617f4571-df5e-4d20-82d0-1f96ae11e8a5','a04e695b-7e30-4e86-b286-47e0ea721632','ca61a0e7-c7b5-4662-9256-25afaa0b55b1','fab5e9e5-cf3b-4561-b764-6a90745e6989','43cfa1c8-9c88-4bf1-b4f0-72291cc96ca8','700ebbd7-0334-498c-825e-9b3a561b4932','6811041c-5794-486f-ab03-cd6268105b28','dea8efea-a884-4529-9e8b-302dc807000b','980e4e83-e084-44fd-bd8f-40bd0de8f1da','3632aa3d-a0f8-4ea0-83a5-61c0d0505b96','ffe19745-fda2-4cfc-88a8-aae52a523d3f','511fd261-5159-412f-a141-2336ad0a43d0','4afaf880-cc28-4d37-83db-2ca84c83c25f','0f961ae9-e763-4437-98cb-9d2bf6a4442e','085e7eb4-3883-4ac1-976d-6a21f7b32a07','6003c136-03dd-4a04-b696-16440bed6a1e','4f4f5d29-5a6f-4388-b777-03ec80861721','16eaa065-01fd-4760-9511-950245b26bdd','aabdb952-1523-4aed-a921-bcb091f574a5');
DELETE FROM invoice_payments WHERE id IN ('700c875d-5f92-45a6-a840-318e88ab3d74','a9177a30-31b8-419a-ad55-c1263d4433c4','b10441e4-e092-4f79-beac-0659a2a6f1b1','70116cb7-a12a-4d71-bfa9-a75fad42eb16','d5e80404-1c03-45d9-8ee1-1f6dd3fe6210','f60d07cc-b357-49fd-a761-a8d243a6581f','8035a0b5-62cb-4c96-9bab-067dd52bf56a','4d8a4ed6-2fcb-4ada-a842-ea8a951c3efc','11646a6e-e57c-42b3-94a0-dc9b9ce9cbd7','45dcd5aa-ad52-43a3-b932-967992e54f37','9a343c3b-a5c3-4ba1-99c3-a89c84472bc5','2c30bbda-1d1e-4a93-a1ee-c322db85f837','21468733-4e27-4311-a0b6-f9b620946303','71b3a9f4-cfce-488a-b629-14f1b6f32116','0ddeee82-9801-4f4e-854d-2b131d5ab592','5c731953-5705-4734-b3df-be5912d56204','fdd51a2b-40fd-4d04-a094-a41d460e96ee','70a2ccd0-2407-4e0d-85a2-c433cb335e4d','95c1d533-11f6-4395-b356-3289e91a53e4');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('b4e68bba-58cc-41cb-8308-9f1e2b8543eb','5b2d3cf9-d4ad-463a-b7de-fd297d556874','2025-05-16',2856400,'cash','received','VY-138-A',1,1,NOW(),NOW()),
('6b4a70a4-1407-46b5-9fcb-640f519c52ff','5b2d3cf9-d4ad-463a-b7de-fd297d556874','2025-05-16',4134800,'cash','received','VY-138-B',1,1,NOW(),NOW()),
('6500a4be-f4d6-4bff-ac1a-0d5d0fd27af0','113a3656-ee29-493c-aabf-273b6f2cb4b3','2025-05-16',2745200,'cash','received','VY-141-A',1,1,NOW(),NOW()),
('a44bc16c-f17f-43dd-a475-7b367ab5722b','113a3656-ee29-493c-aabf-273b6f2cb4b3','2025-05-16',111200,'cash','received','VY-141-B',1,1,NOW(),NOW()),
('a346db7c-0161-4ec3-8f70-66da9a65bcbf','bad1658c-7a41-402b-a6dd-ac5ead9ade1f','2025-05-16',6880000,'cash','received','VY-145-A',1,1,NOW(),NOW()),
('b319ccc1-68e9-435c-8383-b49543bfd064','bad1658c-7a41-402b-a6dd-ac5ead9ade1f','2025-05-16',2795700,'cash','received','VY-145-B',1,1,NOW(),NOW()),
('f82b8462-b9bd-4f84-974c-457cf5a6637d','a9c95b8b-0d4c-422c-8206-e0e1519ecbca','2025-05-16',476700,'cash','received','VY-146-A',1,1,NOW(),NOW()),
('37ee1de9-a271-4528-a981-c214170853ae','a9c95b8b-0d4c-422c-8206-e0e1519ecbca','2025-05-29',2160000,'cash','received','VY-146-B',1,1,NOW(),NOW()),
('d0859d93-969f-43cd-b157-afed20be4ded','a9c95b8b-0d4c-422c-8206-e0e1519ecbca','2025-05-29',4243300,'cash','received','VY-146-C',1,1,NOW(),NOW()),
('951cf804-289e-4a03-a1ce-d11bc9da045c','09449908-a953-4e80-a70b-049d1910f4aa','2025-05-29',2160000,'cash','received','VY-148-A',1,1,NOW(),NOW()),
('075735b7-983a-466e-8796-e0f1d2224d83','09449908-a953-4e80-a70b-049d1910f4aa','2025-05-29',1436700,'cash','received','VY-148-B',1,1,NOW(),NOW()),
('b2070c38-6507-4793-b6b6-858096c1bf86','09449908-a953-4e80-a70b-049d1910f4aa','2025-06-30',4203300,'cash','received','VY-148-C',1,1,NOW(),NOW()),
('1fcb9b6e-1d96-4973-af21-326e952c0b32','cc6ecd8e-ae70-4960-bb89-4d9596b41017','2025-06-30',2160000,'cash','received','VY-153-A',1,1,NOW(),NOW()),
('7c0b924c-d3e9-4549-ba1e-515b27ce07c5','cc6ecd8e-ae70-4960-bb89-4d9596b41017','2025-06-30',3636700,'cash','received','VY-153-B',1,1,NOW(),NOW()),
('7dded288-230b-4140-b2d3-84a9ea497599','cc6ecd8e-ae70-4960-bb89-4d9596b41017','2025-07-24',2003300,'cash','received','VY-153-C',1,1,NOW(),NOW()),
('a81e7ef0-da61-4323-8953-bc1af2d63cdc','9bdb0a74-9a2b-4a4e-aeec-f7e61b58053e','2025-07-24',2160000,'cash','received','VY-154-A',1,1,NOW(),NOW()),
('04969f33-e6c0-4067-998f-a2e5974f11d7','10fa389d-6255-4ef3-ad58-5acee7f0c6fe','2025-07-24',2160000,'cash','received','VY-180-A',1,1,NOW(),NOW()),
('61017c0c-6220-4b17-ab3e-5682cfed0ec2','368c2707-027b-4572-ae52-fc71cbfdd691','2025-07-24',3676700,'cash','received','VY-188-A',1,1,NOW(),NOW()),
('4ccff286-6333-4d1c-8a83-5d9b82ae44af','368c2707-027b-4572-ae52-fc71cbfdd691','2025-08-13',2563300,'cash','received','VY-188-B',1,1,NOW(),NOW()),
('ede9d4fe-c15d-44fe-a05a-59e3b3601b3e','00c55098-2c02-4a7c-a028-2afa0bc11ad9','2025-08-13',904000,'cash','received','VY-196-A',1,1,NOW(),NOW()),
('45140916-5883-441d-b047-11fccb3013a2','68d3f6e0-27e2-45b6-babd-d7db385139b8','2025-08-13',904000,'cash','received','VY-197-A',1,1,NOW(),NOW()),
('f2f92127-092f-492b-a76a-a30d58bed47a','356493f4-29b2-4d8e-8e41-c3ef8281347a','2025-08-13',904000,'cash','received','VY-199-A',1,1,NOW(),NOW()),
('0088ede0-92e7-49ae-914e-b82b73d766a6','31f804d6-bd50-4e3f-8b5d-7ed3ea7d3ba3','2025-08-13',4224700,'cash','received','VY-212-A',1,1,NOW(),NOW()),
('84e30394-b103-454c-9cc6-ae79d59ff6f7','31f804d6-bd50-4e3f-8b5d-7ed3ea7d3ba3','2025-09-30',2275300,'cash','received','VY-212-B',1,1,NOW(),NOW()),
('080bc515-1adc-4f22-9994-03ca19a5d861','7aaef231-3cd8-42d4-a66b-152747610359','2025-09-30',4820000,'cash','received','VY-244-A',1,1,NOW(),NOW()),
('b8c2b273-d236-4692-b192-9a167fb34bff','290a2a24-9d0f-43b4-9aa1-4a55cd9c79af','2025-09-30',504700,'cash','received','VY-268-A',1,1,NOW(),NOW()),
('59d251c3-86d7-426a-a4ee-2ba9ba30cf6a','290a2a24-9d0f-43b4-9aa1-4a55cd9c79af','2025-10-23',1295300,'cash','received','VY-268-B',1,1,NOW(),NOW()),
('01416212-69a8-4f06-bd5d-72225f688064','090260c9-f5f9-4694-81c6-eb4cfdd0d648','2025-10-23',1800000,'cash','received','VY-269-A',1,1,NOW(),NOW()),
('b713aeb3-90be-4ccd-b1a2-46ef6fc9b215','74fe9ccf-1fe5-432a-aa81-a45c87b7293a','2025-10-23',3705000,'cash','received','VY-274-A',1,1,NOW(),NOW()),
('eec8a637-95a2-4bb2-bd42-63617c6f7030','28f2e435-9df0-48e4-97ef-6bfe36841708','2025-10-23',3705000,'cash','received','VY-275-A',1,1,NOW(),NOW()),
('93a0ea8f-0534-43a1-a717-f2367075a6df','886c0169-0306-46d9-ba24-60b5fb6cc7af','2025-10-23',1575000,'cash','received','VY-276-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('edcae7cd-71e8-418b-a5b1-cd3d7a02803e','JRN-20261003-0140','2025-05-16','payment','b4e68bba-58cc-41cb-8308-9f1e2b8543eb','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-138-A','posted',1,2856400,2856400,1,1,NOW(),NOW()),
('a2a298df-a63a-4572-ad3a-789f3cd93083','JRN-20261003-0141','2025-05-16','payment','6b4a70a4-1407-46b5-9fcb-640f519c52ff','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-138-B','posted',1,4134800,4134800,1,1,NOW(),NOW()),
('6d4de961-c55b-4f78-92f7-39da2defdab9','JRN-20261003-0142','2025-05-16','payment','6500a4be-f4d6-4bff-ac1a-0d5d0fd27af0','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-141-A','posted',1,2745200,2745200,1,1,NOW(),NOW()),
('f0b6c7f7-83ad-42a9-be77-a15f2055b4ba','JRN-20261003-0143','2025-05-16','payment','a44bc16c-f17f-43dd-a475-7b367ab5722b','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-141-B','posted',1,111200,111200,1,1,NOW(),NOW()),
('1ec15751-99d5-4485-b840-d33c9169a617','JRN-20261003-0144','2025-05-16','payment','a346db7c-0161-4ec3-8f70-66da9a65bcbf','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-145-A','posted',1,6880000,6880000,1,1,NOW(),NOW()),
('ed0f4c5b-7d6e-4012-af52-e2756c0aad7a','JRN-20261003-0145','2025-05-16','payment','b319ccc1-68e9-435c-8383-b49543bfd064','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-145-B','posted',1,2795700,2795700,1,1,NOW(),NOW()),
('7dd24ce3-d0c7-4891-a2c3-0382ea441d41','JRN-20261003-0146','2025-05-16','payment','f82b8462-b9bd-4f84-974c-457cf5a6637d','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-146-A','posted',1,476700,476700,1,1,NOW(),NOW()),
('0b2c8e59-35d8-4cf7-a411-14dfb64484d5','JRN-20261003-0147','2025-05-29','payment','37ee1de9-a271-4528-a981-c214170853ae','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-146-B','posted',1,2160000,2160000,1,1,NOW(),NOW()),
('19030338-2c5d-41dd-8ab9-3aef6ee14677','JRN-20261003-0148','2025-05-29','payment','d0859d93-969f-43cd-b157-afed20be4ded','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-146-C','posted',1,4243300,4243300,1,1,NOW(),NOW()),
('928d86e1-722b-43cd-8b77-1eedb534a634','JRN-20261003-0149','2025-05-29','payment','951cf804-289e-4a03-a1ce-d11bc9da045c','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-148-A','posted',1,2160000,2160000,1,1,NOW(),NOW()),
('73eb8df3-b030-4f7c-9894-5a92c5746914','JRN-20261003-0150','2025-05-29','payment','075735b7-983a-466e-8796-e0f1d2224d83','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-148-B','posted',1,1436700,1436700,1,1,NOW(),NOW()),
('0191f646-4c83-410b-9c5c-57a01eb6cb98','JRN-20261003-0151','2025-06-30','payment','b2070c38-6507-4793-b6b6-858096c1bf86','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-148-C','posted',1,4203300,4203300,1,1,NOW(),NOW()),
('aa01ead6-6743-4585-92b4-2eabe403c12c','JRN-20261003-0152','2025-06-30','payment','1fcb9b6e-1d96-4973-af21-326e952c0b32','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-153-A','posted',1,2160000,2160000,1,1,NOW(),NOW()),
('f32e66df-6352-42a8-b0b5-9003c0e13eda','JRN-20261003-0153','2025-06-30','payment','7c0b924c-d3e9-4549-ba1e-515b27ce07c5','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-153-B','posted',1,3636700,3636700,1,1,NOW(),NOW()),
('03d1ccec-6737-42b3-96b0-c0c703e7dae8','JRN-20261003-0154','2025-07-24','payment','7dded288-230b-4140-b2d3-84a9ea497599','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-153-C','posted',1,2003300,2003300,1,1,NOW(),NOW()),
('04e7c03b-d796-416f-82a0-1b30442203ae','JRN-20261003-0155','2025-07-24','payment','a81e7ef0-da61-4323-8953-bc1af2d63cdc','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-154-A','posted',1,2160000,2160000,1,1,NOW(),NOW()),
('ff7d9d31-a358-49ef-a861-b252598639f8','JRN-20261003-0156','2025-07-24','payment','04969f33-e6c0-4067-998f-a2e5974f11d7','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-180-A','posted',1,2160000,2160000,1,1,NOW(),NOW()),
('220c9901-fc4d-4d34-9deb-f139946c86bf','JRN-20261003-0157','2025-07-24','payment','61017c0c-6220-4b17-ab3e-5682cfed0ec2','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-188-A','posted',1,3676700,3676700,1,1,NOW(),NOW()),
('8a39ad5d-2c2f-4033-b57c-bbed69640c39','JRN-20261003-0158','2025-08-13','payment','4ccff286-6333-4d1c-8a83-5d9b82ae44af','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-188-B','posted',1,2563300,2563300,1,1,NOW(),NOW()),
('4751d3f5-bf68-44cb-88a9-a9391825da05','JRN-20261003-0159','2025-08-13','payment','ede9d4fe-c15d-44fe-a05a-59e3b3601b3e','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-196-A','posted',1,904000,904000,1,1,NOW(),NOW()),
('e4c37557-ef5a-49ed-99a2-b18dcf7585aa','JRN-20261003-0160','2025-08-13','payment','45140916-5883-441d-b047-11fccb3013a2','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-197-A','posted',1,904000,904000,1,1,NOW(),NOW()),
('5cd628e7-41d1-4104-afcb-6d358e96643f','JRN-20261003-0161','2025-08-13','payment','f2f92127-092f-492b-a76a-a30d58bed47a','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-199-A','posted',1,904000,904000,1,1,NOW(),NOW()),
('dbba11c9-95cb-4471-ba52-4d7cce97b7dd','JRN-20261003-0162','2025-08-13','payment','0088ede0-92e7-49ae-914e-b82b73d766a6','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-212-A','posted',1,4224700,4224700,1,1,NOW(),NOW()),
('c21e2f0f-575f-4c26-87bf-b2cc171ce9bc','JRN-20261003-0163','2025-09-30','payment','84e30394-b103-454c-9cc6-ae79d59ff6f7','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-212-B','posted',1,2275300,2275300,1,1,NOW(),NOW()),
('a8e38465-989f-42bc-a234-4f3ba49ef6f4','JRN-20261003-0164','2025-09-30','payment','080bc515-1adc-4f22-9994-03ca19a5d861','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-244-A','posted',1,4820000,4820000,1,1,NOW(),NOW()),
('7dc197db-3b51-4b25-bdb6-54fd2c6374a0','JRN-20261003-0165','2025-09-30','payment','b8c2b273-d236-4692-b192-9a167fb34bff','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-268-A','posted',1,504700,504700,1,1,NOW(),NOW()),
('360b5d39-423a-49d7-93a7-5d2dddfcbc02','JRN-20261003-0166','2025-10-23','payment','59d251c3-86d7-426a-a4ee-2ba9ba30cf6a','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-268-B','posted',1,1295300,1295300,1,1,NOW(),NOW()),
('c7e9a591-3bed-47de-8d79-ed2f1c58a296','JRN-20261003-0167','2025-10-23','payment','01416212-69a8-4f06-bd5d-72225f688064','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-269-A','posted',1,1800000,1800000,1,1,NOW(),NOW()),
('4079c2f3-9291-490c-b3d5-b328928f0c9a','JRN-20261003-0168','2025-10-23','payment','b713aeb3-90be-4ccd-b1a2-46ef6fc9b215','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-274-A','posted',1,3705000,3705000,1,1,NOW(),NOW()),
('40bbc761-096b-4105-84b2-1ed9e7717c3b','JRN-20261003-0169','2025-10-23','payment','eec8a637-95a2-4bb2-bd42-63617c6f7030','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-275-A','posted',1,3705000,3705000,1,1,NOW(),NOW()),
('63d1572d-c822-4e4d-a1ab-096b18c2f6b4','JRN-20261003-0170','2025-10-23','payment','93a0ea8f-0534-43a1-a717-f2367075a6df','Payment from PUREJAL TECHNOLOGIES PRIVATE LIMITED - VY-276-A','posted',1,1575000,1575000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('b2d2d72f-9b64-4a29-9a64-63321c690263','edcae7cd-71e8-418b-a5b1-cd3d7a02803e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2856400,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('59c506ee-d593-40e1-88ed-b5feaf1cc78b','edcae7cd-71e8-418b-a5b1-cd3d7a02803e','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,2856400,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('0c889301-ad6f-48d4-b10f-be05964a972e','a2a298df-a63a-4572-ad3a-789f3cd93083','23d1cabd-e89f-4bd8-a208-91f59c3898c2',4134800,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('fcfbf26c-d021-40df-b4c6-3f17cbc82591','a2a298df-a63a-4572-ad3a-789f3cd93083','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,4134800,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('ec915f7b-c047-4c95-acc6-41a582decf44','6d4de961-c55b-4f78-92f7-39da2defdab9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2745200,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('3fa1b5dc-9b07-400a-912d-5e097a09e17f','6d4de961-c55b-4f78-92f7-39da2defdab9','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,2745200,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('83e7be5d-72b6-4431-9081-b4e75799387b','f0b6c7f7-83ad-42a9-be77-a15f2055b4ba','23d1cabd-e89f-4bd8-a208-91f59c3898c2',111200,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('281467f3-7f8d-4f01-b0cf-0874fbf2b125','f0b6c7f7-83ad-42a9-be77-a15f2055b4ba','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,111200,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('cda46b9f-4eb6-4a23-930c-0e27276e7723','1ec15751-99d5-4485-b840-d33c9169a617','23d1cabd-e89f-4bd8-a208-91f59c3898c2',6880000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('7661d35a-d335-465d-8a25-f03fe70611bf','1ec15751-99d5-4485-b840-d33c9169a617','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,6880000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('a7e74e13-0bfe-48a6-a75c-e149527a9ad7','ed0f4c5b-7d6e-4012-af52-e2756c0aad7a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2795700,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('686bebf5-c5b9-473e-92d1-651edbad2e8c','ed0f4c5b-7d6e-4012-af52-e2756c0aad7a','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,2795700,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('9e62ecc6-ae29-4c7d-b4b3-862dd68c9508','7dd24ce3-d0c7-4891-a2c3-0382ea441d41','23d1cabd-e89f-4bd8-a208-91f59c3898c2',476700,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('893e5e90-9774-4e46-bd08-096ee17ad904','7dd24ce3-d0c7-4891-a2c3-0382ea441d41','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,476700,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('7c308f27-0af8-4811-832a-bf059c87b3a4','0b2c8e59-35d8-4cf7-a411-14dfb64484d5','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2160000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('9621c2ff-996c-4765-8a79-784e108b1185','0b2c8e59-35d8-4cf7-a411-14dfb64484d5','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,2160000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('924b69e9-54ea-4050-85a2-21dbf3265327','19030338-2c5d-41dd-8ab9-3aef6ee14677','23d1cabd-e89f-4bd8-a208-91f59c3898c2',4243300,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('72e9ff8f-3bac-4b78-b2da-ea078b22f496','19030338-2c5d-41dd-8ab9-3aef6ee14677','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,4243300,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('2b3d325a-b657-4d87-9d1b-b05fa18366a8','928d86e1-722b-43cd-8b77-1eedb534a634','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2160000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('4fda33c5-f31a-47ff-88c1-85691e88e6c6','928d86e1-722b-43cd-8b77-1eedb534a634','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,2160000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('8148f42d-a5d2-40e3-ba35-ebceb5d375c1','73eb8df3-b030-4f7c-9894-5a92c5746914','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1436700,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('c96a33d2-77e4-4c04-b5a5-221f030b7f23','73eb8df3-b030-4f7c-9894-5a92c5746914','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,1436700,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('a3a30b0d-e8d7-4d5a-b604-beab6fa724cb','0191f646-4c83-410b-9c5c-57a01eb6cb98','23d1cabd-e89f-4bd8-a208-91f59c3898c2',4203300,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('f8ce3e6e-b872-4252-b39d-da0d860951b1','0191f646-4c83-410b-9c5c-57a01eb6cb98','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,4203300,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('c8098f68-e44e-4fb4-8541-e1c42f08b833','aa01ead6-6743-4585-92b4-2eabe403c12c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2160000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('2416c9b3-f39f-4b3c-b5db-6fa5b2519c4b','aa01ead6-6743-4585-92b4-2eabe403c12c','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,2160000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('fc5d168b-bb04-4270-b3c0-c30829e94135','f32e66df-6352-42a8-b0b5-9003c0e13eda','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3636700,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('52befd56-7eb6-4756-939b-3a4b1e11bd36','f32e66df-6352-42a8-b0b5-9003c0e13eda','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,3636700,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('fd61d3d7-1a15-4e4b-97fe-b3beb6b79ae6','03d1ccec-6737-42b3-96b0-c0c703e7dae8','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2003300,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('910560a6-f281-4932-bbc0-15aca0d1fa00','03d1ccec-6737-42b3-96b0-c0c703e7dae8','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,2003300,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('ff438d89-471e-4a87-9362-085ea47fb0d3','04e7c03b-d796-416f-82a0-1b30442203ae','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2160000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('b1ff4a93-1a38-4f45-ad02-c9628d555dbc','04e7c03b-d796-416f-82a0-1b30442203ae','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,2160000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('5cc88f29-4332-4d01-8466-0c7508193358','ff7d9d31-a358-49ef-a861-b252598639f8','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2160000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('6a0b9fc7-e447-42ff-aed6-7dea362422c5','ff7d9d31-a358-49ef-a861-b252598639f8','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,2160000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('2580214d-87c1-499d-9a77-9af32fd68745','220c9901-fc4d-4d34-9deb-f139946c86bf','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3676700,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('003ccd86-9db7-40a2-9f6c-440b6444272f','220c9901-fc4d-4d34-9deb-f139946c86bf','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,3676700,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('d52c4fa8-aa6f-44c8-80b9-cec52e459d72','8a39ad5d-2c2f-4033-b57c-bbed69640c39','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2563300,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('aed1c5e2-81eb-40e4-bc39-26abddf8857e','8a39ad5d-2c2f-4033-b57c-bbed69640c39','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,2563300,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('4041c124-23e3-4889-943f-dcf26192ebce','4751d3f5-bf68-44cb-88a9-a9391825da05','23d1cabd-e89f-4bd8-a208-91f59c3898c2',904000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('5a0e0e92-14b6-43e6-9eed-0480ef2b5af6','4751d3f5-bf68-44cb-88a9-a9391825da05','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,904000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('303de253-602a-48d8-89db-992204cf74cd','e4c37557-ef5a-49ed-99a2-b18dcf7585aa','23d1cabd-e89f-4bd8-a208-91f59c3898c2',904000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('e15849cf-258f-46b2-be22-3d58093572f5','e4c37557-ef5a-49ed-99a2-b18dcf7585aa','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,904000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('0622a4eb-b126-4ff2-b02b-5e2be1e6bc64','5cd628e7-41d1-4104-afcb-6d358e96643f','23d1cabd-e89f-4bd8-a208-91f59c3898c2',904000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('4b836c11-8949-4ecb-875c-85a6a07b0401','5cd628e7-41d1-4104-afcb-6d358e96643f','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,904000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('dcb5167a-f39c-4ea9-ab74-265e5d27332c','dbba11c9-95cb-4471-ba52-4d7cce97b7dd','23d1cabd-e89f-4bd8-a208-91f59c3898c2',4224700,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('52ec51db-3865-4cf7-af1e-bbfa0c8ffdb1','dbba11c9-95cb-4471-ba52-4d7cce97b7dd','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,4224700,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('1ac3f196-4aa0-4935-b714-1be3c0d40f43','c21e2f0f-575f-4c26-87bf-b2cc171ce9bc','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2275300,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('c5934b74-0900-4517-8d1b-7edd10f26e0b','c21e2f0f-575f-4c26-87bf-b2cc171ce9bc','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,2275300,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('f1a08bdf-d395-4098-97f9-2cc00eab1fef','a8e38465-989f-42bc-a234-4f3ba49ef6f4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',4820000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('7bf470c9-fc0a-4167-a4b0-1a974be94f10','a8e38465-989f-42bc-a234-4f3ba49ef6f4','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,4820000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('ef0652e8-114d-4cc1-99bc-34db1e36f390','7dc197db-3b51-4b25-bdb6-54fd2c6374a0','23d1cabd-e89f-4bd8-a208-91f59c3898c2',504700,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('a0fc416e-ba08-48e4-9047-7ef5083ef822','7dc197db-3b51-4b25-bdb6-54fd2c6374a0','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,504700,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('ef44acf1-cc12-4b6f-b311-6b4fc0203f10','360b5d39-423a-49d7-93a7-5d2dddfcbc02','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1295300,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('4b91e505-6e80-490f-938e-7fcf44cce0f5','360b5d39-423a-49d7-93a7-5d2dddfcbc02','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,1295300,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('29641ed9-86fc-4c56-a91c-98c389fde87a','c7e9a591-3bed-47de-8d79-ed2f1c58a296','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1800000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('9d4e3586-8a24-445c-acdd-222eef9c3934','c7e9a591-3bed-47de-8d79-ed2f1c58a296','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,1800000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('e8d52fd1-bf35-46b4-b6e9-1c588dd0dc4d','4079c2f3-9291-490c-b3d5-b328928f0c9a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3705000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('ffcd932f-e984-4bab-8f26-4fceb6762abc','4079c2f3-9291-490c-b3d5-b328928f0c9a','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,3705000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('fb8234a0-e2e9-4f6d-b75d-d5fedf007e91','40bbc761-096b-4105-84b2-1ed9e7717c3b','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3705000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('029cddd8-116c-40e5-ad63-e4afcb49b677','40bbc761-096b-4105-84b2-1ed9e7717c3b','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,3705000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('896934f2-3498-40bd-a40e-0cc7e2172877','63d1572d-c822-4e4d-a1ab-096b18c2f6b4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1575000,0,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1),
('cefe5ae7-d9e4-46be-99a0-2ae4132b9889','63d1572d-c822-4e4d-a1ab-096b18c2f6b4','99dd1706-7fb0-4bd9-8dd9-f69412d85d58',0,1575000,NULL,NULL,'PUREJAL TECHNOLOGIES PRIVATE LIMITED','Payment receipt',1,NOW(),1);

-- ======= Palacharala Venuprasad =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('7b1a48f3-2493-4078-b561-b30443a951b6','daef65e9-458d-4632-82af-ea89ff2c9692','d5593c54-3a77-4373-b9ef-1800422c4be7','2e1091b1-ee52-41d9-9620-e9a749d61a32','d1a64912-c1e0-4a2f-b5f1-50e37cd91a30','605104d3-1737-422e-b1b7-b4ba9a58f138','9aba0a1f-57fb-41e4-9ce0-6efce38dfdc7','9ada57fd-a4dd-4d76-b874-58e414438a43','097ef246-17d4-4990-b1be-4576c7f22eb8');
DELETE FROM journal_lines WHERE journal_id IN ('e51406ca-1531-4906-a2da-76368d1bf97e','92497ed8-93cf-4757-a8b0-9fc7ada949b9','540b7778-296e-4405-8df2-8e61e2574d09','bac95fd9-9290-42d1-9d9b-93f1f5f06c2c','8ce1aa4d-3951-4774-b69d-3a36e03ffdae','71d83686-0dab-4185-91df-3b995929a554');
DELETE FROM journal_entries WHERE id IN ('e51406ca-1531-4906-a2da-76368d1bf97e','92497ed8-93cf-4757-a8b0-9fc7ada949b9','540b7778-296e-4405-8df2-8e61e2574d09','bac95fd9-9290-42d1-9d9b-93f1f5f06c2c','8ce1aa4d-3951-4774-b69d-3a36e03ffdae','71d83686-0dab-4185-91df-3b995929a554');
DELETE FROM invoice_payments WHERE id IN ('81e1aa2f-e027-4fb4-97c4-3472729289c9','df39303d-0514-47e5-ad84-924dee915258','76b0b6aa-42de-4a36-8039-ac5889c9bcfd','666f1548-14a2-4d52-b754-96d4ac56264a','70e16e8f-3602-4bd4-a8f8-2ebb54f6ec20','78ffe3cf-6961-4fce-b5ec-20c34ada2798');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('eb4555f1-a685-43c9-a2b3-90e83d7dc103','5805f776-d727-4ebe-bc4d-d7412b6a5e8f','2025-03-17',3725000,'cash','received','VY-15-A',1,1,NOW(),NOW()),
('ee93d6e4-1f42-4a25-ab8a-ad41161904a0','f696b45d-f9e4-4cc2-949a-8e66226dd7c6','2025-05-09',2600000,'cash','received','VY-123-A',1,1,NOW(),NOW()),
('343af75c-ea52-4252-b9bc-041b44189ea1','f696b45d-f9e4-4cc2-949a-8e66226dd7c6','2025-05-12',1000000,'cash','received','VY-123-B',1,1,NOW(),NOW()),
('dbc9a17f-b507-47e3-8074-08ce6ff58e94','f696b45d-f9e4-4cc2-949a-8e66226dd7c6','2025-07-24',200,'cash','received','VY-123-C',1,1,NOW(),NOW()),
('89fd56b0-6cd2-49ea-956c-9f8fd96839e9','01eac45a-0275-4909-bcc9-4a7e543555ea','2025-07-24',2499800,'cash','received','VY-217-A',1,1,NOW(),NOW()),
('3a17bd6b-a0c6-42a5-97b3-2829334382cd','01eac45a-0275-4909-bcc9-4a7e543555ea','2025-07-28',850000,'cash','received','VY-217-B',1,1,NOW(),NOW()),
('86c3ae2b-6680-4dbd-9381-114cb205e78c','01eac45a-0275-4909-bcc9-4a7e543555ea','2025-09-12',200,'cash','received','VY-217-C',1,1,NOW(),NOW()),
('c475853f-d575-40f4-bee2-68bb80c74d75','0ff40290-282a-4015-8757-bead40436c5e','2025-09-12',3199900,'cash','received','VY-245-A',1,1,NOW(),NOW()),
('02609cb9-2f16-4b32-bc6f-37425697d2ab','0ff40290-282a-4015-8757-bead40436c5e','2025-09-27',200,'cash','received','VY-245-B',1,1,NOW(),NOW()),
('b798a50b-89d9-4f31-b45c-792b09d097ad','6220b34a-8883-4d8c-8926-bf24cd0e45ba','2025-09-27',3299800,'cash','received','VY-273-A',1,1,NOW(),NOW()),
('c49b524b-1e47-4ec6-b6e1-d1fc72966852','6220b34a-8883-4d8c-8926-bf24cd0e45ba','2025-10-12',200,'cash','received','VY-273-B',1,1,NOW(),NOW()),
('6fcdb14d-aa5b-4f39-9807-be97e6b00fb3','22da5b9a-15f3-4301-9efe-7aec006a9a98','2025-10-12',2149800,'cash','received','VY-315-A',1,1,NOW(),NOW()),
('11d2115e-7f57-4d9f-af01-11f922eeb0ce','22da5b9a-15f3-4301-9efe-7aec006a9a98','2025-10-16',1150000,'cash','received','VY-315-B',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('2a317af0-1f8b-40f7-9708-25ed24c80448','JRN-20261003-0171','2025-03-17','payment','eb4555f1-a685-43c9-a2b3-90e83d7dc103','Payment from Palacharala Venuprasad - VY-15-A','posted',1,3725000,3725000,1,1,NOW(),NOW()),
('e6caacc3-ec13-4f79-9caa-f7e219f7753a','JRN-20261003-0172','2025-05-09','payment','ee93d6e4-1f42-4a25-ab8a-ad41161904a0','Payment from Palacharala Venuprasad - VY-123-A','posted',1,2600000,2600000,1,1,NOW(),NOW()),
('7733d797-fb1d-4893-b967-126aebaf7227','JRN-20261003-0173','2025-05-12','payment','343af75c-ea52-4252-b9bc-041b44189ea1','Payment from Palacharala Venuprasad - VY-123-B','posted',1,1000000,1000000,1,1,NOW(),NOW()),
('6b043fb5-782d-4f33-bf60-36ee378dfa4a','JRN-20261003-0174','2025-07-24','payment','dbc9a17f-b507-47e3-8074-08ce6ff58e94','Payment from Palacharala Venuprasad - VY-123-C','posted',1,200,200,1,1,NOW(),NOW()),
('c981337e-ead3-4968-b127-47988bfcc7a5','JRN-20261003-0175','2025-07-24','payment','89fd56b0-6cd2-49ea-956c-9f8fd96839e9','Payment from Palacharala Venuprasad - VY-217-A','posted',1,2499800,2499800,1,1,NOW(),NOW()),
('95a27895-ea15-49d7-874a-2a00b1e7c8f9','JRN-20261003-0176','2025-07-28','payment','3a17bd6b-a0c6-42a5-97b3-2829334382cd','Payment from Palacharala Venuprasad - VY-217-B','posted',1,850000,850000,1,1,NOW(),NOW()),
('5fe7d343-7173-4b49-95eb-8cd08dad522f','JRN-20261003-0177','2025-09-12','payment','86c3ae2b-6680-4dbd-9381-114cb205e78c','Payment from Palacharala Venuprasad - VY-217-C','posted',1,200,200,1,1,NOW(),NOW()),
('55ef9dfb-d8e3-4d5d-b271-61b7dae4f4f1','JRN-20261003-0178','2025-09-12','payment','c475853f-d575-40f4-bee2-68bb80c74d75','Payment from Palacharala Venuprasad - VY-245-A','posted',1,3199900,3199900,1,1,NOW(),NOW()),
('5d957596-64dc-43d3-b047-dc5416b376ae','JRN-20261003-0179','2025-09-27','payment','02609cb9-2f16-4b32-bc6f-37425697d2ab','Payment from Palacharala Venuprasad - VY-245-B','posted',1,200,200,1,1,NOW(),NOW()),
('e57a5738-f019-4c2c-a206-ad119b29cb7f','JRN-20261003-0180','2025-09-27','payment','b798a50b-89d9-4f31-b45c-792b09d097ad','Payment from Palacharala Venuprasad - VY-273-A','posted',1,3299800,3299800,1,1,NOW(),NOW()),
('2a1b8b48-488b-46fa-a721-09b041355547','JRN-20261003-0181','2025-10-12','payment','c49b524b-1e47-4ec6-b6e1-d1fc72966852','Payment from Palacharala Venuprasad - VY-273-B','posted',1,200,200,1,1,NOW(),NOW()),
('f37d503a-a8e3-45a9-9eb1-5212efbc7007','JRN-20261003-0182','2025-10-12','payment','6fcdb14d-aa5b-4f39-9807-be97e6b00fb3','Payment from Palacharala Venuprasad - VY-315-A','posted',1,2149800,2149800,1,1,NOW(),NOW()),
('2ab4650f-9a37-4ec9-bf42-506fde5364b3','JRN-20261003-0183','2025-10-16','payment','11d2115e-7f57-4d9f-af01-11f922eeb0ce','Payment from Palacharala Venuprasad - VY-315-B','posted',1,1150000,1150000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('1b578804-872c-4f5c-9a4d-b3ba807e7d57','2a317af0-1f8b-40f7-9708-25ed24c80448','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3725000,0,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('eeeaf714-bfb0-406a-8c53-9b0a4e3ab044','2a317af0-1f8b-40f7-9708-25ed24c80448','63cf3a40-7642-48df-8b9a-f7a711e6c5ec',0,3725000,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('79e4a0a3-b180-45e7-b787-4db81314cb59','e6caacc3-ec13-4f79-9caa-f7e219f7753a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2600000,0,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('272642a8-1cea-4871-b7ba-d3c27aeca0b4','e6caacc3-ec13-4f79-9caa-f7e219f7753a','63cf3a40-7642-48df-8b9a-f7a711e6c5ec',0,2600000,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('2517496b-60b3-4f0b-81b7-145d612ac28c','7733d797-fb1d-4893-b967-126aebaf7227','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1000000,0,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('c57c523e-f9a9-472a-9774-6a63caf8b9ac','7733d797-fb1d-4893-b967-126aebaf7227','63cf3a40-7642-48df-8b9a-f7a711e6c5ec',0,1000000,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('99eae3e5-8ee3-4421-a39c-ae4dc5ae16a9','6b043fb5-782d-4f33-bf60-36ee378dfa4a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',200,0,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('97bc771e-b677-4400-abec-3e6a27868798','6b043fb5-782d-4f33-bf60-36ee378dfa4a','63cf3a40-7642-48df-8b9a-f7a711e6c5ec',0,200,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('f1091cb9-1449-40b4-84d8-5571da86d6e6','c981337e-ead3-4968-b127-47988bfcc7a5','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2499800,0,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('d3216aaa-9b4a-443a-a0de-04f3734b4df7','c981337e-ead3-4968-b127-47988bfcc7a5','63cf3a40-7642-48df-8b9a-f7a711e6c5ec',0,2499800,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('35f9d6eb-4610-4bfe-8f8a-01fc88869f70','95a27895-ea15-49d7-874a-2a00b1e7c8f9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',850000,0,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('5ab398b3-f117-4cec-84b4-6670444d24c0','95a27895-ea15-49d7-874a-2a00b1e7c8f9','63cf3a40-7642-48df-8b9a-f7a711e6c5ec',0,850000,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('897b966a-1f49-49d9-8c66-81d3ba51814e','5fe7d343-7173-4b49-95eb-8cd08dad522f','23d1cabd-e89f-4bd8-a208-91f59c3898c2',200,0,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('661592a6-2ac9-4653-8dee-76c827200b97','5fe7d343-7173-4b49-95eb-8cd08dad522f','63cf3a40-7642-48df-8b9a-f7a711e6c5ec',0,200,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('736361de-2376-4c5f-b615-57d920d27df3','55ef9dfb-d8e3-4d5d-b271-61b7dae4f4f1','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3199900,0,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('2b550574-31d6-4477-8f66-1d5a5dc99726','55ef9dfb-d8e3-4d5d-b271-61b7dae4f4f1','63cf3a40-7642-48df-8b9a-f7a711e6c5ec',0,3199900,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('1ac906fd-686f-4d5a-8ac3-1f58d8ca46de','5d957596-64dc-43d3-b047-dc5416b376ae','23d1cabd-e89f-4bd8-a208-91f59c3898c2',200,0,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('fcb24ecf-f649-4646-93ed-e512c18573aa','5d957596-64dc-43d3-b047-dc5416b376ae','63cf3a40-7642-48df-8b9a-f7a711e6c5ec',0,200,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('628c474f-6a32-46e4-ad2a-529a20ab282d','e57a5738-f019-4c2c-a206-ad119b29cb7f','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3299800,0,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('a952f654-d154-4aa6-a9e7-4007ec23f9cd','e57a5738-f019-4c2c-a206-ad119b29cb7f','63cf3a40-7642-48df-8b9a-f7a711e6c5ec',0,3299800,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('e0098f43-6a97-4b24-af45-846d3f27e261','2a1b8b48-488b-46fa-a721-09b041355547','23d1cabd-e89f-4bd8-a208-91f59c3898c2',200,0,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('d11e9577-3470-4ce6-9515-8b8383710e4d','2a1b8b48-488b-46fa-a721-09b041355547','63cf3a40-7642-48df-8b9a-f7a711e6c5ec',0,200,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('222eaf05-271b-4aa8-a0eb-ab5029252cc1','f37d503a-a8e3-45a9-9eb1-5212efbc7007','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2149800,0,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('6697d181-e9ff-4cb3-92e9-8a7444c480ab','f37d503a-a8e3-45a9-9eb1-5212efbc7007','63cf3a40-7642-48df-8b9a-f7a711e6c5ec',0,2149800,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('0a5d084b-a8e8-495b-8ba8-20219268df45','2ab4650f-9a37-4ec9-bf42-506fde5364b3','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1150000,0,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1),
('4c9f1200-d686-4737-8f3f-bb74f672783c','2ab4650f-9a37-4ec9-bf42-506fde5364b3','63cf3a40-7642-48df-8b9a-f7a711e6c5ec',0,1150000,NULL,NULL,'Palacharala Venuprasad','Payment receipt',1,NOW(),1);

-- ======= RAMALINGAM NAIDU GAS AGENCIES =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('fa49492b-d06a-46fa-b033-203941b40d61');
DELETE FROM journal_lines WHERE journal_id IN ('a4d50ff6-9540-414b-a1d8-2ebc7dacb9ba','9e4bd3e3-f453-41b4-acf8-55b3dbde513e');
DELETE FROM journal_entries WHERE id IN ('a4d50ff6-9540-414b-a1d8-2ebc7dacb9ba','9e4bd3e3-f453-41b4-acf8-55b3dbde513e');
DELETE FROM invoice_payments WHERE id IN ('9e690e87-fcd2-4f9c-902d-69c99c1e41a4','6506f6e2-ce82-4cef-a3cc-788fc7a82841');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('66642933-b045-425e-97fe-613f126b0ec0','296244f2-a660-41ab-aec0-acebf67ffbaf','2025-04-30',990000,'cash','received','VY-95-A',1,1,NOW(),NOW()),
('9009f61f-6164-4c7c-82fb-f6886c17611c','80127e29-ce96-4e74-a4fa-ec73f29c7e75','2025-04-30',390600,'cash','received','VY-111-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('af3544bc-5584-428e-aed6-5391ad493dfb','JRN-20261003-0184','2025-04-30','payment','66642933-b045-425e-97fe-613f126b0ec0','Payment from RAMALINGAM NAIDU GAS AGENCIES - VY-95-A','posted',1,990000,990000,1,1,NOW(),NOW()),
('8d183c99-4de7-498e-b5d8-105c1af957c9','JRN-20261003-0185','2025-04-30','payment','9009f61f-6164-4c7c-82fb-f6886c17611c','Payment from RAMALINGAM NAIDU GAS AGENCIES - VY-111-A','posted',1,390600,390600,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('2648a5aa-f549-4e73-a727-520ef790264b','af3544bc-5584-428e-aed6-5391ad493dfb','23d1cabd-e89f-4bd8-a208-91f59c3898c2',990000,0,NULL,NULL,'RAMALINGAM NAIDU GAS AGENCIES','Payment receipt',1,NOW(),1),
('eb85be50-4027-4010-a340-c93a75252679','af3544bc-5584-428e-aed6-5391ad493dfb','6bd9ffbe-733e-4787-b11a-800f29d7c558',0,990000,NULL,NULL,'RAMALINGAM NAIDU GAS AGENCIES','Payment receipt',1,NOW(),1),
('da61f877-e58f-456d-ad29-e375b6450ff3','8d183c99-4de7-498e-b5d8-105c1af957c9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',390600,0,NULL,NULL,'RAMALINGAM NAIDU GAS AGENCIES','Payment receipt',1,NOW(),1),
('fa0f1371-a787-4caf-8149-81060cdee782','8d183c99-4de7-498e-b5d8-105c1af957c9','6bd9ffbe-733e-4787-b11a-800f29d7c558',0,390600,NULL,NULL,'RAMALINGAM NAIDU GAS AGENCIES','Payment receipt',1,NOW(),1);

-- ======= S N S FUELS =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('754af3c8-636a-43c4-8f07-81d70e3d06da','b44374c0-abd8-4d13-9375-f8fa9079a4f5');
DELETE FROM journal_lines WHERE journal_id IN ('4fee9601-26ee-4263-b81c-2ee6edcdf88e');
DELETE FROM journal_entries WHERE id IN ('4fee9601-26ee-4263-b81c-2ee6edcdf88e');
DELETE FROM invoice_payments WHERE id IN ('87c976c0-e520-421e-8692-eed763f66b17');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('8bb67441-0635-4855-9946-ac5535d106e4','d2f32b29-3919-4543-bbbc-f6b75f21ba67','2025-10-16',378100,'cash','received','VY-307-A',1,1,NOW(),NOW()),
('cb304065-c689-432c-97d4-db59d1203fa2','d2f32b29-3919-4543-bbbc-f6b75f21ba67','2025-11-11',17900,'cash','received','VY-307-B',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('ba8e38e3-e4ea-4dca-ab37-a4827da06619','JRN-20261003-0186','2025-10-16','payment','8bb67441-0635-4855-9946-ac5535d106e4','Payment from S N S FUELS - VY-307-A','posted',1,378100,378100,1,1,NOW(),NOW()),
('9f53b238-8df4-4449-a4f1-2bab7a4206f1','JRN-20261003-0187','2025-11-11','payment','cb304065-c689-432c-97d4-db59d1203fa2','Payment from S N S FUELS - VY-307-B','posted',1,17900,17900,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('b332e9e0-a67a-4985-ba97-de70cc62f7bc','ba8e38e3-e4ea-4dca-ab37-a4827da06619','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'S N S FUELS','Payment receipt',1,NOW(),1),
('1b096bd5-9e16-4118-b304-dad31fac3898','ba8e38e3-e4ea-4dca-ab37-a4827da06619','7549fe9f-adc9-4c21-bcdc-aceb4cd4f77b',0,378100,NULL,NULL,'S N S FUELS','Payment receipt',1,NOW(),1),
('40ba691e-3ac7-4761-b143-dda583cf9f98','9f53b238-8df4-4449-a4f1-2bab7a4206f1','23d1cabd-e89f-4bd8-a208-91f59c3898c2',17900,0,NULL,NULL,'S N S FUELS','Payment receipt',1,NOW(),1),
('f6181345-0b88-4be3-9ded-2021e0d12ef4','9f53b238-8df4-4449-a4f1-2bab7a4206f1','7549fe9f-adc9-4c21-bcdc-aceb4cd4f77b',0,17900,NULL,NULL,'S N S FUELS','Payment receipt',1,NOW(),1);

-- ======= SAI VENKATESWARA FILLING STATION =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('a4dad3a6-060f-4505-b4e1-f50c0e851150','98c4e8ab-d29b-4774-8c85-531086091933');
DELETE FROM journal_lines WHERE journal_id IN ('7ec50e9e-b700-4e4e-b4f8-9ce20e9f6de5','3e337538-58d2-4807-8e9a-4a0630526fa9');
DELETE FROM journal_entries WHERE id IN ('7ec50e9e-b700-4e4e-b4f8-9ce20e9f6de5','3e337538-58d2-4807-8e9a-4a0630526fa9');
DELETE FROM invoice_payments WHERE id IN ('acf3afaa-3a9c-4654-9f91-b09a50f5f0aa','2a4d510d-81e0-47b9-8cb0-43004100c06a');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('75a1655f-c943-4862-b25c-c5bf4f4b1efa','15a679ba-0771-4499-8f76-cd09d9380f29','2025-08-28',120000,'cash','received','VY-260-A',1,1,NOW(),NOW()),
('79396b28-371a-4ddf-b147-dda0405498f2','7daeb0d2-ef86-4bbc-bc25-40d94d79101d','2025-10-16',378100,'cash','received','VY-303-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('4ea96777-85c3-4a46-a3f1-37465cb395c3','JRN-20261003-0188','2025-08-28','payment','75a1655f-c943-4862-b25c-c5bf4f4b1efa','Payment from SAI VENKATESWARA FILLING STATION - VY-260-A','posted',1,120000,120000,1,1,NOW(),NOW()),
('df71c707-7772-40d1-8613-9f9998885bbf','JRN-20261003-0189','2025-10-16','payment','79396b28-371a-4ddf-b147-dda0405498f2','Payment from SAI VENKATESWARA FILLING STATION - VY-303-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('2e20cd93-4389-4a5a-904c-4f8324c5e408','4ea96777-85c3-4a46-a3f1-37465cb395c3','23d1cabd-e89f-4bd8-a208-91f59c3898c2',120000,0,NULL,NULL,'SAI VENKATESWARA FILLING STATION','Payment receipt',1,NOW(),1),
('3fc55952-3301-401a-b759-f61353b3e948','4ea96777-85c3-4a46-a3f1-37465cb395c3','266f0c7b-e5ad-40c2-8570-dfe11c40e412',0,120000,NULL,NULL,'SAI VENKATESWARA FILLING STATION','Payment receipt',1,NOW(),1),
('3223325c-3380-4b76-89b5-49bf5028ebd2','df71c707-7772-40d1-8613-9f9998885bbf','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'SAI VENKATESWARA FILLING STATION','Payment receipt',1,NOW(),1),
('ff8451fa-76ac-4c08-a36c-e6d74323205a','df71c707-7772-40d1-8613-9f9998885bbf','266f0c7b-e5ad-40c2-8570-dfe11c40e412',0,378100,NULL,NULL,'SAI VENKATESWARA FILLING STATION','Payment receipt',1,NOW(),1);

-- ======= SAPTAGIRI SERVICE STATION =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('15d4abb4-95eb-4de7-be6d-fca6a68bfed1','adc7d402-2318-486f-aea2-943af4f42bc5');
DELETE FROM journal_lines WHERE journal_id IN ('8c06f1a2-0b10-4da1-ba56-a99c9f7d5670','eb9ddc5f-2686-443e-b637-34809333ac5f');
DELETE FROM journal_entries WHERE id IN ('8c06f1a2-0b10-4da1-ba56-a99c9f7d5670','eb9ddc5f-2686-443e-b637-34809333ac5f');
DELETE FROM invoice_payments WHERE id IN ('6d604dd2-18b7-473a-970e-096a45ca05f1','282370aa-752e-426b-8e2f-c732f0703d69');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('5e0e471e-6b38-45e4-a678-090f88920f2a','e54a5563-f84d-468b-9008-6a57af0e0147','2025-08-20',172100,'cash','received','VY-252-A',1,1,NOW(),NOW()),
('2daf1a3a-2428-477d-8315-9c737574b800','2e58f146-898f-48c2-bdc3-07bc50a025a7','2025-10-16',378100,'cash','received','VY-292-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('a862c9bb-6b26-4cdc-a247-45b480fcc4a4','JRN-20261003-0190','2025-08-20','payment','5e0e471e-6b38-45e4-a678-090f88920f2a','Payment from SAPTAGIRI SERVICE STATION - VY-252-A','posted',1,172100,172100,1,1,NOW(),NOW()),
('2e1355fc-5d53-4d90-8da5-5be096c2cf39','JRN-20261003-0191','2025-10-16','payment','2daf1a3a-2428-477d-8315-9c737574b800','Payment from SAPTAGIRI SERVICE STATION - VY-292-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('ee40095e-16c6-4524-aad6-345fbaadccb6','a862c9bb-6b26-4cdc-a247-45b480fcc4a4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',172100,0,NULL,NULL,'SAPTAGIRI SERVICE STATION','Payment receipt',1,NOW(),1),
('5ebef096-db78-4f34-a26d-58e7634b01d7','a862c9bb-6b26-4cdc-a247-45b480fcc4a4','3702d857-5d49-414f-95f9-4cc380012c8c',0,172100,NULL,NULL,'SAPTAGIRI SERVICE STATION','Payment receipt',1,NOW(),1),
('cb441a40-9468-4e98-aad5-6056aaf42268','2e1355fc-5d53-4d90-8da5-5be096c2cf39','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'SAPTAGIRI SERVICE STATION','Payment receipt',1,NOW(),1),
('a4c72b0c-5840-47a5-a73d-caa7e484b1c5','2e1355fc-5d53-4d90-8da5-5be096c2cf39','3702d857-5d49-414f-95f9-4cc380012c8c',0,378100,NULL,NULL,'SAPTAGIRI SERVICE STATION','Payment receipt',1,NOW(),1);

-- ======= SARIPILLI SOWMYA =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('54e6a70d-b4f2-4697-b27f-b123228413b7','d7746909-20d7-4a8a-9289-20987be1be9a');
DELETE FROM journal_lines WHERE journal_id IN ('310c5a91-df75-45a4-9a80-6b9d814e1b93','7f91a7d5-535c-4b83-ad3c-3bbde97345c9');
DELETE FROM journal_entries WHERE id IN ('310c5a91-df75-45a4-9a80-6b9d814e1b93','7f91a7d5-535c-4b83-ad3c-3bbde97345c9');
DELETE FROM invoice_payments WHERE id IN ('1cb0ad27-a76e-423b-b072-b10c28e129c6','92b39b4d-8801-4621-86f7-c9a04d3e4afe');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('3447a942-3b5a-4ce5-ade4-8adaf08563a5','05741304-5f32-41c3-acd3-50e0ccf6f18a','2025-07-19',3350000,'cash','received','VY-213-A',1,1,NOW(),NOW()),
('5fb7616d-20f3-4508-a53d-6644de565e94','12067712-337d-4c7c-a104-304ac60827b9','2025-08-21',3290000,'cash','received','VY-257-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('70ef393f-47ff-4289-8771-2bec1560bd91','JRN-20261003-0192','2025-07-19','payment','3447a942-3b5a-4ce5-ade4-8adaf08563a5','Payment from SARIPILLI SOWMYA - VY-213-A','posted',1,3350000,3350000,1,1,NOW(),NOW()),
('8500b801-54a1-4b95-83a0-3fcb296593d1','JRN-20261003-0193','2025-08-21','payment','5fb7616d-20f3-4508-a53d-6644de565e94','Payment from SARIPILLI SOWMYA - VY-257-A','posted',1,3290000,3290000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('94fd5cdf-1531-4a51-bd74-b46b24066b4f','70ef393f-47ff-4289-8771-2bec1560bd91','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3350000,0,NULL,NULL,'SARIPILLI SOWMYA','Payment receipt',1,NOW(),1),
('0c138c88-5bd3-4ec9-b1a1-2143cf57183e','70ef393f-47ff-4289-8771-2bec1560bd91','abd07b45-dfe9-4271-a928-cbb664f8aa8f',0,3350000,NULL,NULL,'SARIPILLI SOWMYA','Payment receipt',1,NOW(),1),
('b53626f2-5797-491f-b3a2-9c227b9d1819','8500b801-54a1-4b95-83a0-3fcb296593d1','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3290000,0,NULL,NULL,'SARIPILLI SOWMYA','Payment receipt',1,NOW(),1),
('9888bfa1-51ab-4daa-9fa5-9ceb9868e23d','8500b801-54a1-4b95-83a0-3fcb296593d1','abd07b45-dfe9-4271-a928-cbb664f8aa8f',0,3290000,NULL,NULL,'SARIPILLI SOWMYA','Payment receipt',1,NOW(),1);

-- ======= SD ENTERPRISES =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('7cd28d08-6ec8-42a7-9543-0227cd5a9618','fda29765-92e7-4b0a-86af-ec1dc6e4f48e','2e3a4f0b-e336-416e-bc2e-0793487224cc');
DELETE FROM journal_lines WHERE journal_id IN ('4b1f6409-a836-4b88-ac78-138470eb5f5e');
DELETE FROM journal_entries WHERE id IN ('4b1f6409-a836-4b88-ac78-138470eb5f5e');
DELETE FROM invoice_payments WHERE id IN ('4bf40a46-835c-4d6f-93e6-557b5a0cf8db');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('fa4153f1-7f16-4b04-8b7e-568a26e2172e','1a1bfc1a-c255-44b9-ade4-5e19172573ac','2025-05-15',4000000,'cash','received','VY-130-A',1,1,NOW(),NOW()),
('26dbf287-4d7e-4156-9baa-9d54665d3dd1','1a1bfc1a-c255-44b9-ade4-5e19172573ac','2025-06-06',2500000,'cash','received','VY-130-B',1,1,NOW(),NOW()),
('a5799d2e-d41b-4979-9a09-969ef49e2348','1a1bfc1a-c255-44b9-ade4-5e19172573ac','2025-06-20',2180000,'cash','received','VY-130-C',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('1a7ff173-3ad3-4aeb-aac0-a4dcf8ad7408','JRN-20261003-0194','2025-05-15','payment','fa4153f1-7f16-4b04-8b7e-568a26e2172e','Payment from SD ENTERPRISES - VY-130-A','posted',1,4000000,4000000,1,1,NOW(),NOW()),
('b999b9d2-6592-4742-90ef-b3c4d13cee2a','JRN-20261003-0195','2025-06-06','payment','26dbf287-4d7e-4156-9baa-9d54665d3dd1','Payment from SD ENTERPRISES - VY-130-B','posted',1,2500000,2500000,1,1,NOW(),NOW()),
('79bcb292-c798-44e7-b380-8f22a98ba66e','JRN-20261003-0196','2025-06-20','payment','a5799d2e-d41b-4979-9a09-969ef49e2348','Payment from SD ENTERPRISES - VY-130-C','posted',1,2180000,2180000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('e5baf132-5deb-4e05-b11e-180816d2a9e2','1a7ff173-3ad3-4aeb-aac0-a4dcf8ad7408','23d1cabd-e89f-4bd8-a208-91f59c3898c2',4000000,0,NULL,NULL,'SD ENTERPRISES','Payment receipt',1,NOW(),1),
('95e9785f-963b-4aa4-b673-f8dc1b39d5e3','1a7ff173-3ad3-4aeb-aac0-a4dcf8ad7408','8b62f8e9-10d2-4ef7-9071-df8d3bcdf9a0',0,4000000,NULL,NULL,'SD ENTERPRISES','Payment receipt',1,NOW(),1),
('19c99704-5808-4e82-b3e3-b97c9574e671','b999b9d2-6592-4742-90ef-b3c4d13cee2a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2500000,0,NULL,NULL,'SD ENTERPRISES','Payment receipt',1,NOW(),1),
('728b6d34-fcdf-4749-840b-d44b9efaefa5','b999b9d2-6592-4742-90ef-b3c4d13cee2a','8b62f8e9-10d2-4ef7-9071-df8d3bcdf9a0',0,2500000,NULL,NULL,'SD ENTERPRISES','Payment receipt',1,NOW(),1),
('628d5c85-2767-4010-9132-4d6ce8b63f16','79bcb292-c798-44e7-b380-8f22a98ba66e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2180000,0,NULL,NULL,'SD ENTERPRISES','Payment receipt',1,NOW(),1),
('4fe1157a-3814-4e12-bec0-aa1c35cd857c','79bcb292-c798-44e7-b380-8f22a98ba66e','8b62f8e9-10d2-4ef7-9071-df8d3bcdf9a0',0,2180000,NULL,NULL,'SD ENTERPRISES','Payment receipt',1,NOW(),1);

-- ======= SIRIPURAPU DEVUDU =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('b8357fce-fb79-4885-965c-3ea77642c589','172b6d26-2a28-4a06-854a-3ece5191faef');
DELETE FROM journal_lines WHERE journal_id IN ('7be9660f-53e8-45ff-aee4-0f18f89e929d');
DELETE FROM journal_entries WHERE id IN ('7be9660f-53e8-45ff-aee4-0f18f89e929d');
DELETE FROM invoice_payments WHERE id IN ('bcdbcc04-7f0a-46e6-9b52-2439ccb5afee');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('cd7d4b89-dd33-4790-95e5-fed570cd3bd5','5a1a0639-a3a8-485f-83a9-fe5589671046','2025-06-12',2650000,'cash','received','VY-177-A',1,1,NOW(),NOW()),
('50391714-7787-4c1e-a3cf-1f3b514c3bb3','5a1a0639-a3a8-485f-83a9-fe5589671046','2025-06-13',410000,'cash','received','VY-177-B',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('598c628d-a004-4ae6-bb62-9991544c9507','JRN-20261003-0197','2025-06-12','payment','cd7d4b89-dd33-4790-95e5-fed570cd3bd5','Payment from SIRIPURAPU DEVUDU - VY-177-A','posted',1,2650000,2650000,1,1,NOW(),NOW()),
('f39800d9-694b-4053-8cfc-a8bca7437366','JRN-20261003-0198','2025-06-13','payment','50391714-7787-4c1e-a3cf-1f3b514c3bb3','Payment from SIRIPURAPU DEVUDU - VY-177-B','posted',1,410000,410000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('fe4b92c2-aa95-4a36-95b8-ad5648952b1d','598c628d-a004-4ae6-bb62-9991544c9507','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2650000,0,NULL,NULL,'SIRIPURAPU DEVUDU','Payment receipt',1,NOW(),1),
('bd953448-3534-4a02-b660-ccf6c118c36b','598c628d-a004-4ae6-bb62-9991544c9507','0718e8a3-e177-4407-a6df-e716faeefcb3',0,2650000,NULL,NULL,'SIRIPURAPU DEVUDU','Payment receipt',1,NOW(),1),
('19e2ec18-5148-4cf0-93cd-286ac7ae8ee3','f39800d9-694b-4053-8cfc-a8bca7437366','23d1cabd-e89f-4bd8-a208-91f59c3898c2',410000,0,NULL,NULL,'SIRIPURAPU DEVUDU','Payment receipt',1,NOW(),1),
('d347b519-45d6-43c4-a178-1b8e74d8793e','f39800d9-694b-4053-8cfc-a8bca7437366','0718e8a3-e177-4407-a6df-e716faeefcb3',0,410000,NULL,NULL,'SIRIPURAPU DEVUDU','Payment receipt',1,NOW(),1);

-- ======= SRI LAXMI GANESH AGENCY =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('baf7cead-0334-458b-9476-ccf120243477','0a7b6877-a550-4aac-a47d-f42f1b70412f','2591d959-924b-4fa2-81ef-ae0114be3e81','f42b0720-151f-4160-8b87-d4931be2093b','dadb5e06-8992-40d4-8175-38e6db92b1a5','e79ef8ac-5e2e-46d7-b63a-5bfb4047e0f2','7bdef215-47dc-42ef-a65b-8ee79da44a83');
DELETE FROM journal_lines WHERE journal_id IN ('585b2da6-f37e-4b51-89c7-7df641c8a1d5','de1adb30-edd8-4a8c-ac64-de419ebb203d','5383de4f-8fb7-42a3-882e-e6663ebf3c61','ceedf6fd-8992-4e51-85e4-9fd8e3734385','ef1cf83e-d15a-482d-8c7a-b72a0f49ecd4');
DELETE FROM journal_entries WHERE id IN ('585b2da6-f37e-4b51-89c7-7df641c8a1d5','de1adb30-edd8-4a8c-ac64-de419ebb203d','5383de4f-8fb7-42a3-882e-e6663ebf3c61','ceedf6fd-8992-4e51-85e4-9fd8e3734385','ef1cf83e-d15a-482d-8c7a-b72a0f49ecd4');
DELETE FROM invoice_payments WHERE id IN ('069cb2c1-92d6-477b-8683-f37eb47dac93','372973be-fb4c-4c71-ad4b-cc61d74f129b','3a5d13dd-a64a-454a-ba48-5b683acabea1','e3471f6a-eaa2-4d42-8d8b-d1e1f901696a','f26bd58b-416e-4541-8770-725d3e465061');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('4b55644c-404c-47f1-8789-6efc795373a5','15db0402-c41a-4f0d-a0f5-ea04ba7ca7a0','2025-05-14',3100000,'cash','received','VY-127-A',1,1,NOW(),NOW()),
('f6dba60b-131c-4a72-8287-a840f37b3364','6ab96c7a-eccc-438a-bbe8-5dfe483aa3bd','2025-05-14',100000,'cash','received','VY-132-A',1,1,NOW(),NOW()),
('a3973a9b-9823-4a5b-9862-8b479f9ff21d','6ab96c7a-eccc-438a-bbe8-5dfe483aa3bd','2025-05-21',2500000,'cash','received','VY-132-B',1,1,NOW(),NOW()),
('31be74d0-35c3-4bef-8bc3-8890480be6d0','6ab96c7a-eccc-438a-bbe8-5dfe483aa3bd','2025-06-09',450100,'cash','received','VY-132-C',1,1,NOW(),NOW()),
('ff0d03a8-7f29-4805-aaa5-e3cdfc255694','7bdca648-547c-461a-b84d-61337c66b224','2025-06-09',2050100,'cash','received','VY-140-A',1,1,NOW(),NOW()),
('aea208d6-ad1c-435d-942c-2e529218f31a','7bdca648-547c-461a-b84d-61337c66b224','2025-06-09',1050000,'cash','received','VY-140-B',1,1,NOW(),NOW()),
('e387531a-a6a9-4341-9901-73a3995267a8','260ad0f2-fa97-45d1-9679-190316b34b41','2025-06-09',1950100,'cash','received','VY-151-A',1,1,NOW(),NOW()),
('313f2c69-a502-416b-a0e2-d0fe432552b1','260ad0f2-fa97-45d1-9679-190316b34b41','2025-06-09',100000,'cash','received','VY-151-B',1,1,NOW(),NOW()),
('36566570-f07d-4e76-82da-f34896eb578c','950cec1b-89e2-420a-abb7-48800c881324','2025-06-09',3000100,'cash','received','VY-165-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('cb7fca2e-ec31-4b34-b205-adfa9dd98b16','JRN-20261003-0199','2025-05-14','payment','4b55644c-404c-47f1-8789-6efc795373a5','Payment from SRI LAXMI GANESH AGENCY - VY-127-A','posted',1,3100000,3100000,1,1,NOW(),NOW()),
('c7a0c1ce-9c31-48bf-a203-dce8314af747','JRN-20261003-0200','2025-05-14','payment','f6dba60b-131c-4a72-8287-a840f37b3364','Payment from SRI LAXMI GANESH AGENCY - VY-132-A','posted',1,100000,100000,1,1,NOW(),NOW()),
('ef3667f6-a091-4292-abce-7feacd55a516','JRN-20261003-0201','2025-05-21','payment','a3973a9b-9823-4a5b-9862-8b479f9ff21d','Payment from SRI LAXMI GANESH AGENCY - VY-132-B','posted',1,2500000,2500000,1,1,NOW(),NOW()),
('c9b0ac27-2b6a-4368-99fb-908c2d86c47c','JRN-20261003-0202','2025-06-09','payment','31be74d0-35c3-4bef-8bc3-8890480be6d0','Payment from SRI LAXMI GANESH AGENCY - VY-132-C','posted',1,450100,450100,1,1,NOW(),NOW()),
('ea061d89-bc22-473c-8cd8-d83d5a53cb6a','JRN-20261003-0203','2025-06-09','payment','ff0d03a8-7f29-4805-aaa5-e3cdfc255694','Payment from SRI LAXMI GANESH AGENCY - VY-140-A','posted',1,2050100,2050100,1,1,NOW(),NOW()),
('af063845-fba8-4baf-a06a-693d54c7608c','JRN-20261003-0204','2025-06-09','payment','aea208d6-ad1c-435d-942c-2e529218f31a','Payment from SRI LAXMI GANESH AGENCY - VY-140-B','posted',1,1050000,1050000,1,1,NOW(),NOW()),
('c7a8a251-9329-48d5-b0f9-008dd83ca1fc','JRN-20261003-0205','2025-06-09','payment','e387531a-a6a9-4341-9901-73a3995267a8','Payment from SRI LAXMI GANESH AGENCY - VY-151-A','posted',1,1950100,1950100,1,1,NOW(),NOW()),
('e57471e8-4777-4499-a82f-b5fa0f1b9613','JRN-20261003-0206','2025-06-09','payment','313f2c69-a502-416b-a0e2-d0fe432552b1','Payment from SRI LAXMI GANESH AGENCY - VY-151-B','posted',1,100000,100000,1,1,NOW(),NOW()),
('d6c929e8-713d-4087-a84e-60f58e43c79b','JRN-20261003-0207','2025-06-09','payment','36566570-f07d-4e76-82da-f34896eb578c','Payment from SRI LAXMI GANESH AGENCY - VY-165-A','posted',1,3000100,3000100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('fc0e9d92-723b-4006-b065-71290be7227a','cb7fca2e-ec31-4b34-b205-adfa9dd98b16','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3100000,0,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('ee030726-5eb7-4b14-a0e4-5b12bb5b1ecc','cb7fca2e-ec31-4b34-b205-adfa9dd98b16','54458b15-b0a0-44d3-a58d-4102f185e729',0,3100000,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('b0a81332-3ef2-467f-9e38-a4136ec5f81d','c7a0c1ce-9c31-48bf-a203-dce8314af747','23d1cabd-e89f-4bd8-a208-91f59c3898c2',100000,0,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('7ede02bb-1b36-4a02-9476-353a2e2945da','c7a0c1ce-9c31-48bf-a203-dce8314af747','54458b15-b0a0-44d3-a58d-4102f185e729',0,100000,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('b171fedb-49f6-43e0-bc01-b3a2149247c9','ef3667f6-a091-4292-abce-7feacd55a516','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2500000,0,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('036324e5-f171-4c73-b187-3914982b17cf','ef3667f6-a091-4292-abce-7feacd55a516','54458b15-b0a0-44d3-a58d-4102f185e729',0,2500000,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('3ece2562-f025-40c3-b26a-d008665b1659','c9b0ac27-2b6a-4368-99fb-908c2d86c47c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',450100,0,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('ce026d33-a11a-4a00-abb1-93ee64d005bc','c9b0ac27-2b6a-4368-99fb-908c2d86c47c','54458b15-b0a0-44d3-a58d-4102f185e729',0,450100,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('0ab115d1-82da-4fa5-93f8-07c33e7306a6','ea061d89-bc22-473c-8cd8-d83d5a53cb6a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2050100,0,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('ec6694dd-cafc-48af-9f6f-11caaf00d855','ea061d89-bc22-473c-8cd8-d83d5a53cb6a','54458b15-b0a0-44d3-a58d-4102f185e729',0,2050100,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('a624205f-294d-4bbc-862c-34990e067ff1','af063845-fba8-4baf-a06a-693d54c7608c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1050000,0,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('971387cf-fd69-4e61-9d11-07b1e9109b29','af063845-fba8-4baf-a06a-693d54c7608c','54458b15-b0a0-44d3-a58d-4102f185e729',0,1050000,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('2ebfa58a-176b-4f45-bf19-ecb6f8656cf7','c7a8a251-9329-48d5-b0f9-008dd83ca1fc','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1950100,0,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('b7b47249-4dbf-447b-b610-d9adb73cfd7d','c7a8a251-9329-48d5-b0f9-008dd83ca1fc','54458b15-b0a0-44d3-a58d-4102f185e729',0,1950100,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('c2bc4311-2502-4849-8f10-0095425ddb91','e57471e8-4777-4499-a82f-b5fa0f1b9613','23d1cabd-e89f-4bd8-a208-91f59c3898c2',100000,0,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('ee07a98e-24e9-4b17-bc5f-2849ccdef5eb','e57471e8-4777-4499-a82f-b5fa0f1b9613','54458b15-b0a0-44d3-a58d-4102f185e729',0,100000,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('3d51d715-4a67-4874-9704-eeb8fcea9bf8','d6c929e8-713d-4087-a84e-60f58e43c79b','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3000100,0,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1),
('9ac3697a-3533-46a0-af37-dcb31ed84b2c','d6c929e8-713d-4087-a84e-60f58e43c79b','54458b15-b0a0-44d3-a58d-4102f185e729',0,3000100,NULL,NULL,'SRI LAXMI GANESH AGENCY','Payment receipt',1,NOW(),1);

-- ======= SRI SUDHARSAN TRADERS =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('e1c6e767-ac53-4cd3-afb0-8ce5b7e2329b','739dd8bf-98df-4be3-9e4d-d7a70d0cd0a0','909ecf8e-e378-4c18-92ed-f9287b18d151');
DELETE FROM journal_lines WHERE journal_id IN ('490cf03c-36f9-4ef8-9236-e8ae88086bc8','dbe4456a-a94b-4155-bb0d-e5ab5c2cbe31','9a25d6f7-4d88-4473-90c4-728c9ae36c55','ab7aa6f2-0176-49fc-9bf2-48f79dc2b7ac','9a2276b7-4524-4185-9f5f-8e78927ea9fa','3cfb8083-6abd-496b-8f12-c2c93aad8302');
DELETE FROM journal_entries WHERE id IN ('490cf03c-36f9-4ef8-9236-e8ae88086bc8','dbe4456a-a94b-4155-bb0d-e5ab5c2cbe31','9a25d6f7-4d88-4473-90c4-728c9ae36c55','ab7aa6f2-0176-49fc-9bf2-48f79dc2b7ac','9a2276b7-4524-4185-9f5f-8e78927ea9fa','3cfb8083-6abd-496b-8f12-c2c93aad8302');
DELETE FROM invoice_payments WHERE id IN ('71122565-a89f-476f-b020-38f95d8c1e10','de08fe4a-40ff-4c50-8c26-c9fd86ad5ab8','972908ba-bd18-40ca-aaae-7870b818fc15','6c0b1d95-f52f-482d-84ae-3b3fc8d48b53','d7b7e3c6-a0f7-4dcd-887a-d94ac5317a74','dc7a75e4-babb-45c1-9563-c23685038e93');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('27eba650-66f6-462b-a5b1-63e83925336b','77ea8190-7512-418c-a0b7-a0c160c0a3b0','2025-03-14',7638100,'cash','received','VY-3-A',1,1,NOW(),NOW()),
('7a1140e1-ec97-448f-9f65-4e550e1ab806','8d7499c8-38db-4fed-9a68-a5ffcf69bb40','2025-03-14',1185800,'cash','received','VY-5-A',1,1,NOW(),NOW()),
('15580e28-a499-4925-a5e4-0256b514c436','8d7499c8-38db-4fed-9a68-a5ffcf69bb40','2025-03-14',6450000,'cash','received','VY-5-B',1,1,NOW(),NOW()),
('76fd0b80-42df-40ff-9ae1-27c665406955','569cfb46-723b-4f69-8353-e6489f1d23f0','2025-03-14',1185800,'cash','received','VY-13-A',1,1,NOW(),NOW()),
('6ca66346-381e-49d4-897e-c05807cd67ef','569cfb46-723b-4f69-8353-e6489f1d23f0','2025-03-14',7638100,'cash','received','VY-13-B',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('40b2bfd4-b6e1-48f4-8f39-2b1d6236dac8','JRN-20261003-0208','2025-03-14','payment','27eba650-66f6-462b-a5b1-63e83925336b','Payment from SRI SUDHARSAN TRADERS - VY-3-A','posted',1,7638100,7638100,1,1,NOW(),NOW()),
('a23c66d9-c592-4d46-8e4d-9bd73c55ae82','JRN-20261003-0209','2025-03-14','payment','7a1140e1-ec97-448f-9f65-4e550e1ab806','Payment from SRI SUDHARSAN TRADERS - VY-5-A','posted',1,1185800,1185800,1,1,NOW(),NOW()),
('0e5bba38-0acb-4b3b-afa8-186b734dd830','JRN-20261003-0210','2025-03-14','payment','15580e28-a499-4925-a5e4-0256b514c436','Payment from SRI SUDHARSAN TRADERS - VY-5-B','posted',1,6450000,6450000,1,1,NOW(),NOW()),
('7fff4a37-8a7e-4c57-aea7-d071a696d62e','JRN-20261003-0211','2025-03-14','payment','76fd0b80-42df-40ff-9ae1-27c665406955','Payment from SRI SUDHARSAN TRADERS - VY-13-A','posted',1,1185800,1185800,1,1,NOW(),NOW()),
('85859895-a302-4fe5-8f86-545100331092','JRN-20261003-0212','2025-03-14','payment','6ca66346-381e-49d4-897e-c05807cd67ef','Payment from SRI SUDHARSAN TRADERS - VY-13-B','posted',1,7638100,7638100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('92f90f8a-f03f-4f18-be6f-4b129d7ba9f0','40b2bfd4-b6e1-48f4-8f39-2b1d6236dac8','23d1cabd-e89f-4bd8-a208-91f59c3898c2',7638100,0,NULL,NULL,'SRI SUDHARSAN TRADERS','Payment receipt',1,NOW(),1),
('b19dbcb2-c61b-4a0e-9ae3-b86f530a0b0a','40b2bfd4-b6e1-48f4-8f39-2b1d6236dac8','e60d5f38-0c31-4579-90f0-6d0dc64badc3',0,7638100,NULL,NULL,'SRI SUDHARSAN TRADERS','Payment receipt',1,NOW(),1),
('16c03c42-a36c-4b24-9334-97c1ef78d749','a23c66d9-c592-4d46-8e4d-9bd73c55ae82','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1185800,0,NULL,NULL,'SRI SUDHARSAN TRADERS','Payment receipt',1,NOW(),1),
('c8b5a97a-b3e2-4329-95b8-94740c4291e9','a23c66d9-c592-4d46-8e4d-9bd73c55ae82','e60d5f38-0c31-4579-90f0-6d0dc64badc3',0,1185800,NULL,NULL,'SRI SUDHARSAN TRADERS','Payment receipt',1,NOW(),1),
('f87d30af-e95e-4e05-94a5-bc8caec13232','0e5bba38-0acb-4b3b-afa8-186b734dd830','23d1cabd-e89f-4bd8-a208-91f59c3898c2',6450000,0,NULL,NULL,'SRI SUDHARSAN TRADERS','Payment receipt',1,NOW(),1),
('0174d633-e7ff-4d7b-93d4-fd655427ddd5','0e5bba38-0acb-4b3b-afa8-186b734dd830','e60d5f38-0c31-4579-90f0-6d0dc64badc3',0,6450000,NULL,NULL,'SRI SUDHARSAN TRADERS','Payment receipt',1,NOW(),1),
('bbe3ac63-8be6-4b5a-b980-a99ce431926e','7fff4a37-8a7e-4c57-aea7-d071a696d62e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1185800,0,NULL,NULL,'SRI SUDHARSAN TRADERS','Payment receipt',1,NOW(),1),
('d126a89a-fe02-4f8c-964c-1779c8e7e50b','7fff4a37-8a7e-4c57-aea7-d071a696d62e','e60d5f38-0c31-4579-90f0-6d0dc64badc3',0,1185800,NULL,NULL,'SRI SUDHARSAN TRADERS','Payment receipt',1,NOW(),1),
('521f075b-745a-4f95-95e9-044f571018ed','85859895-a302-4fe5-8f86-545100331092','23d1cabd-e89f-4bd8-a208-91f59c3898c2',7638100,0,NULL,NULL,'SRI SUDHARSAN TRADERS','Payment receipt',1,NOW(),1),
('2b236ee2-dee6-4cb3-9e5d-05cc3bb36c22','85859895-a302-4fe5-8f86-545100331092','e60d5f38-0c31-4579-90f0-6d0dc64badc3',0,7638100,NULL,NULL,'SRI SUDHARSAN TRADERS','Payment receipt',1,NOW(),1);

-- ======= SRI TARAKARAMA SCMALC CO PO SOCIETY =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('11fda944-0470-4cea-8456-0fe6521a8f54','3c85ff5d-da76-461e-b34e-14ce01b28455');
DELETE FROM journal_lines WHERE journal_id IN ('f1ca2dbe-b95c-4bf6-a294-87327229d3bd','d4b4f164-96a3-4aa8-a921-f84657632670');
DELETE FROM journal_entries WHERE id IN ('f1ca2dbe-b95c-4bf6-a294-87327229d3bd','d4b4f164-96a3-4aa8-a921-f84657632670');
DELETE FROM invoice_payments WHERE id IN ('fbfbf9fc-cc92-4c6d-9cc0-c7d8d1653831','91de838f-71a9-4619-a643-9f38e7f73059');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('94250b18-c7a0-4903-a904-ec60f72fa371','d38a2400-b5f1-4624-b0e2-c2f2f84de7ee','2025-05-01',7349700,'cash','received','VY-102-A',1,1,NOW(),NOW()),
('1eb0d649-f031-41fe-b269-6fc3980dfaf9','d38a2400-b5f1-4624-b0e2-c2f2f84de7ee','2025-05-01',3149900,'cash','received','VY-102-B',1,1,NOW(),NOW()),
('ec058374-eaed-469d-8ddd-825bd2f99c01','09fc52a8-ca1d-4ffe-9f77-efe1eda23d5a','2025-05-01',2349700,'cash','received','VY-103-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('6e2b8297-bd04-4479-98f2-473c3c2c4cc6','JRN-20261003-0213','2025-05-01','payment','94250b18-c7a0-4903-a904-ec60f72fa371','Payment from SRI TARAKARAMA SCMALC CO PO SOCIETY - VY-102-A','posted',1,7349700,7349700,1,1,NOW(),NOW()),
('e2068947-59f8-4728-aebe-9fc234a4a6e1','JRN-20261003-0214','2025-05-01','payment','1eb0d649-f031-41fe-b269-6fc3980dfaf9','Payment from SRI TARAKARAMA SCMALC CO PO SOCIETY - VY-102-B','posted',1,3149900,3149900,1,1,NOW(),NOW()),
('2befd3a3-8734-4fbf-983e-57a92d6e5536','JRN-20261003-0215','2025-05-01','payment','ec058374-eaed-469d-8ddd-825bd2f99c01','Payment from SRI TARAKARAMA SCMALC CO PO SOCIETY - VY-103-A','posted',1,2349700,2349700,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('e8abed99-fb72-48da-92ad-1b7232997fb8','6e2b8297-bd04-4479-98f2-473c3c2c4cc6','23d1cabd-e89f-4bd8-a208-91f59c3898c2',7349700,0,NULL,NULL,'SRI TARAKARAMA SCMALC CO PO SOCIETY','Payment receipt',1,NOW(),1),
('54c13af7-cea2-48cf-8c21-1bdd1ad23621','6e2b8297-bd04-4479-98f2-473c3c2c4cc6','ddee0606-d78a-4603-8d18-239f7cb1263a',0,7349700,NULL,NULL,'SRI TARAKARAMA SCMALC CO PO SOCIETY','Payment receipt',1,NOW(),1),
('7c259217-da41-4aec-98e4-4ed78e4c8d10','e2068947-59f8-4728-aebe-9fc234a4a6e1','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3149900,0,NULL,NULL,'SRI TARAKARAMA SCMALC CO PO SOCIETY','Payment receipt',1,NOW(),1),
('82ec3d72-115a-471f-b854-bba298b94fa6','e2068947-59f8-4728-aebe-9fc234a4a6e1','ddee0606-d78a-4603-8d18-239f7cb1263a',0,3149900,NULL,NULL,'SRI TARAKARAMA SCMALC CO PO SOCIETY','Payment receipt',1,NOW(),1),
('62ea84a2-f3c3-42c6-8880-a9a417818fc2','2befd3a3-8734-4fbf-983e-57a92d6e5536','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2349700,0,NULL,NULL,'SRI TARAKARAMA SCMALC CO PO SOCIETY','Payment receipt',1,NOW(),1),
('d2a70f43-7964-4930-8791-62a8c7c8a392','2befd3a3-8734-4fbf-983e-57a92d6e5536','ddee0606-d78a-4603-8d18-239f7cb1263a',0,2349700,NULL,NULL,'SRI TARAKARAMA SCMALC CO PO SOCIETY','Payment receipt',1,NOW(),1);

-- ======= SRI VARALAKSHMI AGENCIES =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('796188e4-2b23-46cd-9288-19ffb0670565','6d6b9147-6a34-4492-b66b-6469bb259190','1ff19460-58cc-4cc5-9332-ff841ff5f5b3','f89134c1-8569-41ed-ace8-d2bb9d8bcefc','2ae30418-7e77-45e8-8f34-cd22ecdeb1ee','28d60c58-8714-43d2-8426-4bc5796233a4');
DELETE FROM journal_lines WHERE journal_id IN ('74b409a6-59f5-42b3-94f9-76b81c953cca','6dfcc18e-cbc0-4983-b620-c9b86914c8ae');
DELETE FROM journal_entries WHERE id IN ('74b409a6-59f5-42b3-94f9-76b81c953cca','6dfcc18e-cbc0-4983-b620-c9b86914c8ae');
DELETE FROM invoice_payments WHERE id IN ('190f3638-6dbf-4074-a628-c1715a4a57e2','36a615b3-11b6-4aa8-8d66-ccc8f2ded6a2');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('bc37e494-ad83-469b-b322-ce81609f278e','ae726d61-4443-44a3-a20e-5f709bfefe9a','2025-04-21',3200000,'cash','received','VY-60-A',1,1,NOW(),NOW()),
('b1541717-17f2-4c1a-b1eb-64e6f80b9dd5','ae726d61-4443-44a3-a20e-5f709bfefe9a','2025-04-28',1000000,'cash','received','VY-60-B',1,1,NOW(),NOW()),
('cb113675-5b4e-4027-8034-b06c0683889b','ae726d61-4443-44a3-a20e-5f709bfefe9a','2025-05-19',200,'cash','received','VY-60-C',1,1,NOW(),NOW()),
('069214fd-4be8-4f07-8e95-cee8cb187b7a','ae726d61-4443-44a3-a20e-5f709bfefe9a','2025-05-19',1999800,'cash','received','VY-60-D',1,1,NOW(),NOW()),
('fa38d89e-99a5-449d-ac22-d9e91a3623b9','ae726d61-4443-44a3-a20e-5f709bfefe9a','2025-06-09',1000000,'cash','received','VY-60-E',1,1,NOW(),NOW()),
('395286f4-7052-4d78-88b3-305e8f0afd5e','ae726d61-4443-44a3-a20e-5f709bfefe9a','2025-06-10',1200200,'cash','received','VY-60-F',1,1,NOW(),NOW()),
('5ba02753-fec7-45f4-8330-1c8aa7c50df9','3a757a34-ecbe-4fb7-8aac-f6a7531fd01c','2025-06-10',99800,'cash','received','VY-129-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('2dc613ec-705a-4939-9f30-075fed512ad7','JRN-20261003-0216','2025-04-21','payment','bc37e494-ad83-469b-b322-ce81609f278e','Payment from SRI VARALAKSHMI AGENCIES - VY-60-A','posted',1,3200000,3200000,1,1,NOW(),NOW()),
('bb8eb7a4-3d63-4cf8-bdba-53a51c1559b7','JRN-20261003-0217','2025-04-28','payment','b1541717-17f2-4c1a-b1eb-64e6f80b9dd5','Payment from SRI VARALAKSHMI AGENCIES - VY-60-B','posted',1,1000000,1000000,1,1,NOW(),NOW()),
('7fe296ba-fa58-48bb-b6d1-4d12572a3375','JRN-20261003-0218','2025-05-19','payment','cb113675-5b4e-4027-8034-b06c0683889b','Payment from SRI VARALAKSHMI AGENCIES - VY-60-C','posted',1,200,200,1,1,NOW(),NOW()),
('a215e464-8d45-4074-bb48-e46e7f5fa509','JRN-20261003-0219','2025-05-19','payment','069214fd-4be8-4f07-8e95-cee8cb187b7a','Payment from SRI VARALAKSHMI AGENCIES - VY-60-D','posted',1,1999800,1999800,1,1,NOW(),NOW()),
('e788d2a9-ed8b-4add-b926-13167a4a5988','JRN-20261003-0220','2025-06-09','payment','fa38d89e-99a5-449d-ac22-d9e91a3623b9','Payment from SRI VARALAKSHMI AGENCIES - VY-60-E','posted',1,1000000,1000000,1,1,NOW(),NOW()),
('6e43d037-4a64-4b19-8c34-5c979f29b65a','JRN-20261003-0221','2025-06-10','payment','395286f4-7052-4d78-88b3-305e8f0afd5e','Payment from SRI VARALAKSHMI AGENCIES - VY-60-F','posted',1,1200200,1200200,1,1,NOW(),NOW()),
('e44135b0-98c4-47a9-bce4-a13e74dedd6a','JRN-20261003-0222','2025-06-10','payment','5ba02753-fec7-45f4-8330-1c8aa7c50df9','Payment from SRI VARALAKSHMI AGENCIES - VY-129-A','posted',1,99800,99800,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('dd63dd6e-d263-4fcf-9478-a4c2ecb69dd6','2dc613ec-705a-4939-9f30-075fed512ad7','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3200000,0,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1),
('e31c7c9d-95b4-4be6-a1ca-6c30e652bfa7','2dc613ec-705a-4939-9f30-075fed512ad7','d89de448-fb84-41a5-b908-42190cd4ed86',0,3200000,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1),
('6679a1e2-4edd-4c73-b67b-9f18bdae2a4e','bb8eb7a4-3d63-4cf8-bdba-53a51c1559b7','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1000000,0,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1),
('156028b0-17a9-4498-b701-b249e81bf998','bb8eb7a4-3d63-4cf8-bdba-53a51c1559b7','d89de448-fb84-41a5-b908-42190cd4ed86',0,1000000,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1),
('a1446817-9762-475e-a4c1-237d152f7831','7fe296ba-fa58-48bb-b6d1-4d12572a3375','23d1cabd-e89f-4bd8-a208-91f59c3898c2',200,0,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1),
('be27cbd9-a8ad-4210-a580-70f79dbc23c4','7fe296ba-fa58-48bb-b6d1-4d12572a3375','d89de448-fb84-41a5-b908-42190cd4ed86',0,200,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1),
('47029116-889f-474b-bf25-f37e8a798bdc','a215e464-8d45-4074-bb48-e46e7f5fa509','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1999800,0,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1),
('42bcac62-ed01-40c3-8ff8-0dbdac711622','a215e464-8d45-4074-bb48-e46e7f5fa509','d89de448-fb84-41a5-b908-42190cd4ed86',0,1999800,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1),
('cc83696a-8492-436c-9792-34b22f171730','e788d2a9-ed8b-4add-b926-13167a4a5988','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1000000,0,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1),
('2c051338-6f72-4a8b-a9a1-0cec02c20270','e788d2a9-ed8b-4add-b926-13167a4a5988','d89de448-fb84-41a5-b908-42190cd4ed86',0,1000000,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1),
('fe289850-37c0-4e8b-b9b5-49ad83c7ccbb','6e43d037-4a64-4b19-8c34-5c979f29b65a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1200200,0,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1),
('8cadb937-d696-43db-bfdb-99c1f44cc32d','6e43d037-4a64-4b19-8c34-5c979f29b65a','d89de448-fb84-41a5-b908-42190cd4ed86',0,1200200,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1),
('c3bd6cd3-34a4-4b99-b03f-c6bca78a7c03','e44135b0-98c4-47a9-bce4-a13e74dedd6a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',99800,0,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1),
('f2bc08bb-a613-4008-a4e7-edf8f22a7003','e44135b0-98c4-47a9-bce4-a13e74dedd6a','d89de448-fb84-41a5-b908-42190cd4ed86',0,99800,NULL,NULL,'SRI VARALAKSHMI AGENCIES','Payment receipt',1,NOW(),1);

-- ======= SRI VENKATA SHIVA SAI HP GAS AGENCY =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('7c1396ff-ad53-4df9-9ad4-884bcc5cbdec');
DELETE FROM journal_lines WHERE journal_id IN ('4acc5dab-be31-4e8a-9de2-2075198b015f');
DELETE FROM journal_entries WHERE id IN ('4acc5dab-be31-4e8a-9de2-2075198b015f');
DELETE FROM invoice_payments WHERE id IN ('a997bd09-59ef-4dc1-b5af-e051ff80f681');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('67416365-0346-42fa-84e6-2a2cd3445141','47bd9368-859a-4911-a721-ec59e429c55a','2025-04-21',2240800,'cash','received','VY-78-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('4be9232e-f51f-4a58-b3ac-688f74104cfe','JRN-20261003-0223','2025-04-21','payment','67416365-0346-42fa-84e6-2a2cd3445141','Payment from SRI VENKATA SHIVA SAI HP GAS AGENCY - VY-78-A','posted',1,2240800,2240800,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('816e3b6a-e52e-4b31-94f9-175b81066077','4be9232e-f51f-4a58-b3ac-688f74104cfe','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2240800,0,NULL,NULL,'SRI VENKATA SHIVA SAI HP GAS AGENCY','Payment receipt',1,NOW(),1),
('b4c52cdc-212d-4c5b-9f38-2371049d1955','4be9232e-f51f-4a58-b3ac-688f74104cfe','f5b9e641-d29a-44de-ac8d-b4f878f28dac',0,2240800,NULL,NULL,'SRI VENKATA SHIVA SAI HP GAS AGENCY','Payment receipt',1,NOW(),1);

-- ======= SRI VENKATESWARA FILLING STATION =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('ea0567cd-0d8d-49da-a27a-b779c1e8351b');
DELETE FROM journal_lines WHERE journal_id IN ('9146c4d7-921d-4613-ae35-7ba5cac939f3');
DELETE FROM journal_entries WHERE id IN ('9146c4d7-921d-4613-ae35-7ba5cac939f3');
DELETE FROM invoice_payments WHERE id IN ('a673251e-d22b-4528-9fe1-f86272b91aeb');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('a470da1f-62f4-4934-a30e-b1edd46d3217','5e0334bd-3a4a-40a3-a174-b4ae71320bea','2025-10-16',378100,'cash','received','VY-291-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('c3fb6a3e-47b1-4039-a689-c9ba03b765d8','JRN-20261003-0224','2025-10-16','payment','a470da1f-62f4-4934-a30e-b1edd46d3217','Payment from SRI VENKATESWARA FILLING STATION - VY-291-A','posted',1,378100,378100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('383e8164-b27d-4a1f-b46c-e08722188968','c3fb6a3e-47b1-4039-a689-c9ba03b765d8','23d1cabd-e89f-4bd8-a208-91f59c3898c2',378100,0,NULL,NULL,'SRI VENKATESWARA FILLING STATION','Payment receipt',1,NOW(),1),
('952a7281-82f0-428c-a99f-516e77d84100','c3fb6a3e-47b1-4039-a689-c9ba03b765d8','ef602aa6-e9b8-4961-906b-1e4d36e0571f',0,378100,NULL,NULL,'SRI VENKATESWARA FILLING STATION','Payment receipt',1,NOW(),1);

-- ======= SRI VENKATESWARA SERVICE STATION =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('3f0dc8c2-4cd1-4007-91dd-f6ed208daf15');
DELETE FROM journal_lines WHERE journal_id IN ('c3e67d02-127f-40f8-b559-05a16a8e4700','16753c64-642d-48f8-aec4-3d6bcb5978ae');
DELETE FROM journal_entries WHERE id IN ('c3e67d02-127f-40f8-b559-05a16a8e4700','16753c64-642d-48f8-aec4-3d6bcb5978ae');
DELETE FROM invoice_payments WHERE id IN ('921d14dc-6859-4b48-80b2-9d6900434a99','49c9b0f0-feef-456c-96fe-d722398829c1');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('85a07fcf-94ef-4f26-817e-479f677e757a','23fef4cc-4712-4590-946c-9d83da2379f6','2025-08-20',494500,'cash','received','VY-251-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('170273d2-89c6-4c64-a774-3107358d0011','JRN-20261003-0225','2025-08-20','payment','85a07fcf-94ef-4f26-817e-479f677e757a','Payment from SRI VENKATESWARA SERVICE STATION - VY-251-A','posted',1,494500,494500,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('2d10d0bc-0dda-4f84-945c-00e85528fc9b','170273d2-89c6-4c64-a774-3107358d0011','23d1cabd-e89f-4bd8-a208-91f59c3898c2',494500,0,NULL,NULL,'SRI VENKATESWARA SERVICE STATION','Payment receipt',1,NOW(),1),
('ea04c5e2-b544-4de8-a98a-613422588c45','170273d2-89c6-4c64-a774-3107358d0011','8eaa2f0b-829e-44e7-b068-171806a2fe44',0,494500,NULL,NULL,'SRI VENKATESWARA SERVICE STATION','Payment receipt',1,NOW(),1);

-- ======= SS Srinivasa Rao =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('35deae2d-8a1a-4512-bd5e-7f5d91081a45');
DELETE FROM journal_lines WHERE journal_id IN ('b530a883-4b44-48de-9b74-e6476475379b','497b9127-2fcd-464f-962e-f4286902b48e');
DELETE FROM journal_entries WHERE id IN ('b530a883-4b44-48de-9b74-e6476475379b','497b9127-2fcd-464f-962e-f4286902b48e');
DELETE FROM invoice_payments WHERE id IN ('41fe54ef-bfb6-4d6a-9cdd-a55726c27311','6e7c8512-484a-4ffb-bd9e-d87ba04b92c9');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('f61c02d5-bb27-4f71-b072-ca47cb1cd67c','a1a935ab-a22e-41d0-bed7-a1a5799f362f','2025-04-08',440000,'cash','received','VY-30-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('f46eb6b5-9ba0-4ce9-b400-97cb07bb8adf','JRN-20261003-0226','2025-04-08','payment','f61c02d5-bb27-4f71-b072-ca47cb1cd67c','Payment from SS Srinivasa Rao - VY-30-A','posted',1,440000,440000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('05b984cc-cbfe-4147-b1be-2705bdee1dd5','f46eb6b5-9ba0-4ce9-b400-97cb07bb8adf','23d1cabd-e89f-4bd8-a208-91f59c3898c2',440000,0,NULL,NULL,'SS Srinivasa Rao','Payment receipt',1,NOW(),1),
('cd7db940-2849-4418-a1eb-4172d25541ed','f46eb6b5-9ba0-4ce9-b400-97cb07bb8adf','1cddef6e-a6fc-4374-a69e-dc0f232e3f99',0,440000,NULL,NULL,'SS Srinivasa Rao','Payment receipt',1,NOW(),1);

-- ======= SVVSJSRN GANESH =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('625de9ec-2d69-4bd7-a880-e08e70464e81');
DELETE FROM journal_lines WHERE journal_id IN ('1e00c25e-e5ab-4571-b6e3-5d26a59d024f');
DELETE FROM journal_entries WHERE id IN ('1e00c25e-e5ab-4571-b6e3-5d26a59d024f');
DELETE FROM invoice_payments WHERE id IN ('11ae7879-0c02-4bc8-91c6-e6b0248f71da');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('eda4e6e3-a969-4bc8-a011-618512c2acca','496bb41d-ee05-41d8-b53f-f88e49ee4696','2025-07-15',2000000,'cash','received','VY-170-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('06be553e-2c9a-4fa7-9cd8-85312d51aad9','JRN-20261003-0227','2025-07-15','payment','eda4e6e3-a969-4bc8-a011-618512c2acca','Payment from SVVSJSRN GANESH - VY-170-A','posted',1,2000000,2000000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('7ce9bcca-43fb-454e-a7e5-8e5a76a13e06','06be553e-2c9a-4fa7-9cd8-85312d51aad9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2000000,0,NULL,NULL,'SVVSJSRN GANESH','Payment receipt',1,NOW(),1),
('ae43d669-a2c1-4174-ac82-543529ebb705','06be553e-2c9a-4fa7-9cd8-85312d51aad9','cd0169f0-3524-4e1f-a3e7-faeced62b4f8',0,2000000,NULL,NULL,'SVVSJSRN GANESH','Payment receipt',1,NOW(),1);

-- ======= SYNERGY SHIPPING PVT.LTD =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('36322a5f-329f-45ce-b388-07c75012314a');
DELETE FROM journal_lines WHERE journal_id IN ('998d6608-da56-41db-adc5-3743e37bd69e');
DELETE FROM journal_entries WHERE id IN ('998d6608-da56-41db-adc5-3743e37bd69e');
DELETE FROM invoice_payments WHERE id IN ('d3e20da8-35b3-4709-a8ce-f5f65dafdb24');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('97e0d666-b425-4680-a23b-61bea67ac9e6','376250a4-98ba-48f7-976e-0f8411f8bdbf','2025-07-14',2758800,'cash','received','VY-204-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('158415f8-6bf6-4481-9dfc-d5f90402d3e9','JRN-20261003-0228','2025-07-14','payment','97e0d666-b425-4680-a23b-61bea67ac9e6','Payment from SYNERGY SHIPPING PVT.LTD - VY-204-A','posted',1,2758800,2758800,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('6ca17254-43d9-4c05-a0c1-b856334ebd83','158415f8-6bf6-4481-9dfc-d5f90402d3e9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2758800,0,NULL,NULL,'SYNERGY SHIPPING PVT.LTD','Payment receipt',1,NOW(),1),
('8f951327-5403-4d1d-8d00-d9df99aaa340','158415f8-6bf6-4481-9dfc-d5f90402d3e9','e80a2d73-1bfe-413d-ab58-96da24c811d6',0,2758800,NULL,NULL,'SYNERGY SHIPPING PVT.LTD','Payment receipt',1,NOW(),1);

-- ======= Sivaramakrishna Enterprises =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('2fbeeb9b-5fd0-4481-b15f-a3a341fbc8aa','c5ac75ba-7886-46e3-a202-f354a9fbfbeb','65e22ae6-6f25-4bf4-8c22-1210312a72b0','b4d51fee-c669-4bdc-b9aa-8d0fcabdf1ba');
DELETE FROM journal_lines WHERE journal_id IN ('d6257751-36b1-4f1b-a62d-3a6d81eeff62');
DELETE FROM journal_entries WHERE id IN ('d6257751-36b1-4f1b-a62d-3a6d81eeff62');
DELETE FROM invoice_payments WHERE id IN ('baacf002-e396-492c-a414-2648f9de2fda');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('04b210bb-74ae-499b-8175-5fee3a5a4c27','938dfc38-4400-447e-8cca-c93495da0257','2025-04-14',8000000,'cash','received','VY-35-A',1,1,NOW(),NOW()),
('95ec68df-ef1e-443e-a676-d8df50b260ff','938dfc38-4400-447e-8cca-c93495da0257','2025-05-19',2000000,'cash','received','VY-35-B',1,1,NOW(),NOW()),
('25f67106-7722-493c-b680-e1221bed0322','938dfc38-4400-447e-8cca-c93495da0257','2025-06-12',1000000,'cash','received','VY-35-C',1,1,NOW(),NOW()),
('c9a99d0b-4f4d-4921-aad3-9a2a8e37cc14','938dfc38-4400-447e-8cca-c93495da0257','2025-06-12',60000,'cash','received','VY-35-D',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('2872813c-1bf9-40bd-bcaf-237eccbb85a6','JRN-20261003-0229','2025-04-14','payment','04b210bb-74ae-499b-8175-5fee3a5a4c27','Payment from Sivaramakrishna Enterprises - VY-35-A','posted',1,8000000,8000000,1,1,NOW(),NOW()),
('dec7c41c-2639-46f8-9e6b-edddc0bbb0d6','JRN-20261003-0230','2025-05-19','payment','95ec68df-ef1e-443e-a676-d8df50b260ff','Payment from Sivaramakrishna Enterprises - VY-35-B','posted',1,2000000,2000000,1,1,NOW(),NOW()),
('4074a8f3-bb99-4271-9882-5257c9f66a55','JRN-20261003-0231','2025-06-12','payment','25f67106-7722-493c-b680-e1221bed0322','Payment from Sivaramakrishna Enterprises - VY-35-C','posted',1,1000000,1000000,1,1,NOW(),NOW()),
('8d3ad5ca-082c-4347-9fe4-589dc194f453','JRN-20261003-0232','2025-06-12','payment','c9a99d0b-4f4d-4921-aad3-9a2a8e37cc14','Payment from Sivaramakrishna Enterprises - VY-35-D','posted',1,60000,60000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('67dc0aaa-ad79-4541-a4a9-b719a37d5269','2872813c-1bf9-40bd-bcaf-237eccbb85a6','23d1cabd-e89f-4bd8-a208-91f59c3898c2',8000000,0,NULL,NULL,'Sivaramakrishna Enterprises','Payment receipt',1,NOW(),1),
('f755fb80-c407-44c2-a621-827da9399b80','2872813c-1bf9-40bd-bcaf-237eccbb85a6','7c21a619-b0aa-4d6c-89a9-5f766e541964',0,8000000,NULL,NULL,'Sivaramakrishna Enterprises','Payment receipt',1,NOW(),1),
('8b116dec-efd5-45cc-9b3e-0183f5d6301e','dec7c41c-2639-46f8-9e6b-edddc0bbb0d6','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2000000,0,NULL,NULL,'Sivaramakrishna Enterprises','Payment receipt',1,NOW(),1),
('34e28be2-9e74-4d7d-95d3-e31621fff364','dec7c41c-2639-46f8-9e6b-edddc0bbb0d6','7c21a619-b0aa-4d6c-89a9-5f766e541964',0,2000000,NULL,NULL,'Sivaramakrishna Enterprises','Payment receipt',1,NOW(),1),
('d390d41a-d62b-4882-8630-a5d29c2774ad','4074a8f3-bb99-4271-9882-5257c9f66a55','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1000000,0,NULL,NULL,'Sivaramakrishna Enterprises','Payment receipt',1,NOW(),1),
('7a6c8ec1-735c-4b93-a064-b429076d73c8','4074a8f3-bb99-4271-9882-5257c9f66a55','7c21a619-b0aa-4d6c-89a9-5f766e541964',0,1000000,NULL,NULL,'Sivaramakrishna Enterprises','Payment receipt',1,NOW(),1),
('edba596f-ef7b-42b0-9b02-a4d4b1b5c501','8d3ad5ca-082c-4347-9fe4-589dc194f453','23d1cabd-e89f-4bd8-a208-91f59c3898c2',60000,0,NULL,NULL,'Sivaramakrishna Enterprises','Payment receipt',1,NOW(),1),
('230285bb-5600-4f8c-83e5-20f121d03d46','8d3ad5ca-082c-4347-9fe4-589dc194f453','7c21a619-b0aa-4d6c-89a9-5f766e541964',0,60000,NULL,NULL,'Sivaramakrishna Enterprises','Payment receipt',1,NOW(),1);

-- ======= Sri Kanthamma Talli Agencies =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('62fbe36f-bf83-4be3-bfe3-636646d60f57','f5ed5c78-b104-4094-b245-39dab211c6fb','ac690756-4644-434c-9add-68133fb8375c','136116ce-df91-47c7-9938-b489f25293bd','65eeb913-5a9a-4347-b12b-5515b8365254','05ab59d4-c80f-42dd-9176-1ce4497122a4','b9707aea-c44d-4abe-9626-7ab63ddf191b','8344f9e1-3dee-44be-bc0b-3cb45037c1a4','4e16a84c-2240-40cc-b373-bdb1f360bc00','8c2ee624-cd73-42fc-b399-ecfb453d6bd8','4eb9bf5d-2cb4-4ff3-b01f-623ba162327d','9980d115-f8d0-48d1-a57f-dedcb3c7be2b','7f597316-b269-46c6-bc35-4cd955a7aa84','c91440bf-4785-481f-b2c2-89b5276110ea','025e7963-4eda-4552-9544-685b9c7c54d2','8f0273e4-ec2d-433c-b1d1-e71715b225be');
DELETE FROM journal_lines WHERE journal_id IN ('b06973a7-25e5-4a08-80ae-1e85f5279c3a','812ddbbc-7dea-4bf3-97b5-b42a7c96cfee','41c3e38e-dbc7-4d37-9530-582d5d5314c5','d9fd470f-cdc6-4967-87cb-d290dfd035e1','08decec4-7888-49c1-9798-78d84837d820');
DELETE FROM journal_entries WHERE id IN ('b06973a7-25e5-4a08-80ae-1e85f5279c3a','812ddbbc-7dea-4bf3-97b5-b42a7c96cfee','41c3e38e-dbc7-4d37-9530-582d5d5314c5','d9fd470f-cdc6-4967-87cb-d290dfd035e1','08decec4-7888-49c1-9798-78d84837d820');
DELETE FROM invoice_payments WHERE id IN ('770f8243-1f12-4ec5-b3b1-1c6db2a2e0df','f759cd7c-8934-49d1-8dc5-b59e8a0e7358','dc8c57d5-6ae0-44bd-8a3f-7469ace51fdd','34cab4e1-bf82-4d75-882e-d71e33f8130e','49f8aca2-0145-4caf-9701-4ef19fcb6952');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('74653c58-0ae9-4fb6-b426-ea23716c52c9','23166b3f-42fc-4e6c-8224-74c5a9b53c9a','2025-03-17',2000000,'cash','received','VY-16-A',1,1,NOW(),NOW()),
('87549f91-2f20-485e-95af-311b1bf2e664','23166b3f-42fc-4e6c-8224-74c5a9b53c9a','2025-03-18',2500000,'cash','received','VY-16-B',1,1,NOW(),NOW()),
('a8ffefc5-dea8-4a67-a122-f3a502cf2b0c','23166b3f-42fc-4e6c-8224-74c5a9b53c9a','2025-04-01',353000,'cash','received','VY-16-C',1,1,NOW(),NOW()),
('628bdee1-c193-4342-a2a3-4676356e5f0f','0aa20480-0023-43fb-99eb-54ef1a61782d','2025-04-07',5175100,'cash','received','VY-42-A',1,1,NOW(),NOW()),
('19bbab04-f83d-40db-9466-38c6aa59be44','0aa20480-0023-43fb-99eb-54ef1a61782d','2025-04-12',1530100,'cash','received','VY-42-B',1,1,NOW(),NOW()),
('f79462c4-d6c6-48af-a4e4-3da8340a0cfc','b39451e3-957c-406a-8b45-9ec2b50efaca','2025-04-12',469900,'cash','received','VY-48-A',1,1,NOW(),NOW()),
('2f0234ed-1144-41ab-b5a4-1359332e111c','b39451e3-957c-406a-8b45-9ec2b50efaca','2025-04-21',2280000,'cash','received','VY-48-B',1,1,NOW(),NOW()),
('2ae13541-343d-42c6-9656-a1bfd32e71bb','b39451e3-957c-406a-8b45-9ec2b50efaca','2025-04-24',1530100,'cash','received','VY-48-C',1,1,NOW(),NOW()),
('c0a638ba-76a2-431b-83a1-ecded4e678f7','b39451e3-957c-406a-8b45-9ec2b50efaca','2025-04-24',469900,'cash','received','VY-48-D',1,1,NOW(),NOW()),
('e0008fe8-4082-4cdf-bc4a-321d0926852a','b39451e3-957c-406a-8b45-9ec2b50efaca','2025-05-09',425200,'cash','received','VY-48-E',1,1,NOW(),NOW()),
('c5056aa8-7559-4cc3-a04a-5febf069df81','86c675c5-d330-4cac-81b1-4ca82483ede4','2025-05-09',2074800,'cash','received','VY-124-A',1,1,NOW(),NOW()),
('daf72997-508d-4114-952e-938ff7b6c656','86c675c5-d330-4cac-81b1-4ca82483ede4','2025-05-16',2500000,'cash','received','VY-124-B',1,1,NOW(),NOW()),
('f7b7df78-ccd6-462f-a040-ac3043e2c46f','86c675c5-d330-4cac-81b1-4ca82483ede4','2025-05-27',2500000,'cash','received','VY-124-C',1,1,NOW(),NOW()),
('1794abb1-534b-4745-a94b-453abe4e50ca','86c675c5-d330-4cac-81b1-4ca82483ede4','2025-06-12',1600000,'cash','received','VY-124-D',1,1,NOW(),NOW()),
('524e9416-9d8a-4128-a605-92edce475514','86c675c5-d330-4cac-81b1-4ca82483ede4','2025-06-17',1000000,'cash','received','VY-124-E',1,1,NOW(),NOW()),
('2af4b9ac-dba7-45b5-b4f0-9f4d88997948','86c675c5-d330-4cac-81b1-4ca82483ede4','2025-07-08',475300,'cash','received','VY-124-F',1,1,NOW(),NOW()),
('cb0810d2-0135-42f4-9873-deeb52dc8952','3e15016d-7bd8-43a9-bd0f-75ca7b9b73fb','2025-07-08',2764700,'cash','received','VY-185-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('00ca99a9-6ed8-4ed5-9679-4c40cec7ff68','JRN-20261003-0233','2025-03-17','payment','74653c58-0ae9-4fb6-b426-ea23716c52c9','Payment from Sri Kanthamma Talli Agencies - VY-16-A','posted',1,2000000,2000000,1,1,NOW(),NOW()),
('b0b57f34-ee23-4a87-844e-669c349804b8','JRN-20261003-0234','2025-03-18','payment','87549f91-2f20-485e-95af-311b1bf2e664','Payment from Sri Kanthamma Talli Agencies - VY-16-B','posted',1,2500000,2500000,1,1,NOW(),NOW()),
('99c3761c-66f2-48b7-99a7-9aa7e5e7068b','JRN-20261003-0235','2025-04-01','payment','a8ffefc5-dea8-4a67-a122-f3a502cf2b0c','Payment from Sri Kanthamma Talli Agencies - VY-16-C','posted',1,353000,353000,1,1,NOW(),NOW()),
('1c43d3e5-8fd2-4bcc-8935-127d048964ab','JRN-20261003-0236','2025-04-07','payment','628bdee1-c193-4342-a2a3-4676356e5f0f','Payment from Sri Kanthamma Talli Agencies - VY-42-A','posted',1,5175100,5175100,1,1,NOW(),NOW()),
('5f3c2f30-6f25-4be4-9805-20b3b3e91f85','JRN-20261003-0237','2025-04-12','payment','19bbab04-f83d-40db-9466-38c6aa59be44','Payment from Sri Kanthamma Talli Agencies - VY-42-B','posted',1,1530100,1530100,1,1,NOW(),NOW()),
('dfe15fb7-0153-4846-9af1-0770519304fd','JRN-20261003-0238','2025-04-12','payment','f79462c4-d6c6-48af-a4e4-3da8340a0cfc','Payment from Sri Kanthamma Talli Agencies - VY-48-A','posted',1,469900,469900,1,1,NOW(),NOW()),
('d5981a85-e221-4bd7-9964-03bd531341c6','JRN-20261003-0239','2025-04-21','payment','2f0234ed-1144-41ab-b5a4-1359332e111c','Payment from Sri Kanthamma Talli Agencies - VY-48-B','posted',1,2280000,2280000,1,1,NOW(),NOW()),
('ae75a4a4-1d4a-4adf-8593-43243ea38856','JRN-20261003-0240','2025-04-24','payment','2ae13541-343d-42c6-9656-a1bfd32e71bb','Payment from Sri Kanthamma Talli Agencies - VY-48-C','posted',1,1530100,1530100,1,1,NOW(),NOW()),
('4c46c5d3-9ff8-4190-8fb6-c42ab128fc17','JRN-20261003-0241','2025-04-24','payment','c0a638ba-76a2-431b-83a1-ecded4e678f7','Payment from Sri Kanthamma Talli Agencies - VY-48-D','posted',1,469900,469900,1,1,NOW(),NOW()),
('e854b12b-c6b2-4fb9-93ab-e8e1b70cbbaa','JRN-20261003-0242','2025-05-09','payment','e0008fe8-4082-4cdf-bc4a-321d0926852a','Payment from Sri Kanthamma Talli Agencies - VY-48-E','posted',1,425200,425200,1,1,NOW(),NOW()),
('3cc1920c-8e29-4825-a127-6a45ba4069f6','JRN-20261003-0243','2025-05-09','payment','c5056aa8-7559-4cc3-a04a-5febf069df81','Payment from Sri Kanthamma Talli Agencies - VY-124-A','posted',1,2074800,2074800,1,1,NOW(),NOW()),
('9e5037ef-e92e-40fa-943b-70edbee7fc5b','JRN-20261003-0244','2025-05-16','payment','daf72997-508d-4114-952e-938ff7b6c656','Payment from Sri Kanthamma Talli Agencies - VY-124-B','posted',1,2500000,2500000,1,1,NOW(),NOW()),
('1966409a-5b10-4a63-ba1c-7b7f23143f00','JRN-20261003-0245','2025-05-27','payment','f7b7df78-ccd6-462f-a040-ac3043e2c46f','Payment from Sri Kanthamma Talli Agencies - VY-124-C','posted',1,2500000,2500000,1,1,NOW(),NOW()),
('5606bec7-241d-42e7-9c12-ce2f4d825126','JRN-20261003-0246','2025-06-12','payment','1794abb1-534b-4745-a94b-453abe4e50ca','Payment from Sri Kanthamma Talli Agencies - VY-124-D','posted',1,1600000,1600000,1,1,NOW(),NOW()),
('0e6525a9-7b07-4600-bb08-a638e027bb6b','JRN-20261003-0247','2025-06-17','payment','524e9416-9d8a-4128-a605-92edce475514','Payment from Sri Kanthamma Talli Agencies - VY-124-E','posted',1,1000000,1000000,1,1,NOW(),NOW()),
('43c913b7-2067-4ad4-9455-455d7a653996','JRN-20261003-0248','2025-07-08','payment','2af4b9ac-dba7-45b5-b4f0-9f4d88997948','Payment from Sri Kanthamma Talli Agencies - VY-124-F','posted',1,475300,475300,1,1,NOW(),NOW()),
('2072d4fc-7412-49ff-a51e-f407fe49b9cb','JRN-20261003-0249','2025-07-08','payment','cb0810d2-0135-42f4-9873-deeb52dc8952','Payment from Sri Kanthamma Talli Agencies - VY-185-A','posted',1,2764700,2764700,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('1f14ab58-2702-433b-a6b0-4ef86f5d4d5f','00ca99a9-6ed8-4ed5-9679-4c40cec7ff68','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2000000,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('8de28856-db56-4cbb-9bd5-861a9cafbfcc','00ca99a9-6ed8-4ed5-9679-4c40cec7ff68','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,2000000,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('fde4eab0-53b1-4888-8776-ae8b4adf5d70','b0b57f34-ee23-4a87-844e-669c349804b8','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2500000,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('b53748bb-8536-4664-acf3-0b2ae82c4f1b','b0b57f34-ee23-4a87-844e-669c349804b8','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,2500000,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('8338b39b-f7c7-44f4-83c0-fb09f58486c6','99c3761c-66f2-48b7-99a7-9aa7e5e7068b','23d1cabd-e89f-4bd8-a208-91f59c3898c2',353000,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('ade4872f-245d-4a86-907c-4fb15af9dac0','99c3761c-66f2-48b7-99a7-9aa7e5e7068b','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,353000,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('189a23fb-3db6-4329-b662-03d1b74fabc1','1c43d3e5-8fd2-4bcc-8935-127d048964ab','23d1cabd-e89f-4bd8-a208-91f59c3898c2',5175100,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('1599a8f6-e7ca-479d-9778-a5a5c858e045','1c43d3e5-8fd2-4bcc-8935-127d048964ab','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,5175100,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('b90563d7-e6d6-46f1-b1e0-4a8584c8f442','5f3c2f30-6f25-4be4-9805-20b3b3e91f85','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1530100,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('73ece997-86f0-4724-974d-996582a670d6','5f3c2f30-6f25-4be4-9805-20b3b3e91f85','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,1530100,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('c7c743c8-1066-4a6e-8533-1d73938fbc56','dfe15fb7-0153-4846-9af1-0770519304fd','23d1cabd-e89f-4bd8-a208-91f59c3898c2',469900,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('a7cc4fad-63c4-4cf1-bcbc-62a2971d7a86','dfe15fb7-0153-4846-9af1-0770519304fd','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,469900,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('11383c2c-75cf-43d3-be7c-126331b255a8','d5981a85-e221-4bd7-9964-03bd531341c6','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2280000,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('33e88ec1-5a03-4b3a-bc86-8c1abc2d34d2','d5981a85-e221-4bd7-9964-03bd531341c6','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,2280000,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('92fdb595-9414-4242-ac3d-858b0256774e','ae75a4a4-1d4a-4adf-8593-43243ea38856','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1530100,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('5c0267f5-3d8c-40c7-b120-b3ea9b0390cd','ae75a4a4-1d4a-4adf-8593-43243ea38856','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,1530100,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('638031f2-ba19-4556-a165-e8a8da95e747','4c46c5d3-9ff8-4190-8fb6-c42ab128fc17','23d1cabd-e89f-4bd8-a208-91f59c3898c2',469900,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('7606ce3b-b5ba-4da4-a3b6-f7a0e99a8dbf','4c46c5d3-9ff8-4190-8fb6-c42ab128fc17','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,469900,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('7cdccaa2-8e8c-49d4-bbbd-e83be924f26f','e854b12b-c6b2-4fb9-93ab-e8e1b70cbbaa','23d1cabd-e89f-4bd8-a208-91f59c3898c2',425200,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('0543ccaa-5deb-4c7b-993f-9e5ebf8ffd7a','e854b12b-c6b2-4fb9-93ab-e8e1b70cbbaa','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,425200,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('845638c0-401c-47dc-b7b2-199c56072d38','3cc1920c-8e29-4825-a127-6a45ba4069f6','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2074800,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('59c8b56c-7d14-4d0d-a6d8-c7788a0d08e0','3cc1920c-8e29-4825-a127-6a45ba4069f6','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,2074800,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('7e28355d-cb5a-4105-a465-30bbe492fdf1','9e5037ef-e92e-40fa-943b-70edbee7fc5b','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2500000,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('cc03d91d-6a91-495e-ba47-968bb7aee5a2','9e5037ef-e92e-40fa-943b-70edbee7fc5b','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,2500000,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('6946ea0e-32c4-4580-bd15-6d50ad4f8640','1966409a-5b10-4a63-ba1c-7b7f23143f00','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2500000,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('e53936a7-0121-4f88-a8c2-82119294f999','1966409a-5b10-4a63-ba1c-7b7f23143f00','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,2500000,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('d3a575f2-fe9e-4131-8920-d4a66bd9cf9f','5606bec7-241d-42e7-9c12-ce2f4d825126','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1600000,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('922b6b15-7b48-4947-99cb-b25345a0c875','5606bec7-241d-42e7-9c12-ce2f4d825126','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,1600000,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('c6ce6794-c37b-4a1f-ac5e-3d261b10872f','0e6525a9-7b07-4600-bb08-a638e027bb6b','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1000000,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('fb0caed7-c99b-4c12-9d82-f722b0fbfc2d','0e6525a9-7b07-4600-bb08-a638e027bb6b','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,1000000,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('b6f1fd74-8095-4a6e-8d7c-178c8f87c3a4','43c913b7-2067-4ad4-9455-455d7a653996','23d1cabd-e89f-4bd8-a208-91f59c3898c2',475300,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('93cd8ddc-91db-4e2e-96ab-0ee4aa9ab4c2','43c913b7-2067-4ad4-9455-455d7a653996','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,475300,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('822f8eb6-7574-4b20-a22b-b8fa07e8f996','2072d4fc-7412-49ff-a51e-f407fe49b9cb','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2764700,0,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1),
('115af274-fb5e-4e1f-96b7-4b4af270950d','2072d4fc-7412-49ff-a51e-f407fe49b9cb','b176693d-3516-44e1-a1d6-bb3a40ac11e3',0,2764700,NULL,NULL,'Sri Kanthamma Talli Agencies','Payment receipt',1,NOW(),1);

-- ======= Sri Krishna Milk Agencies =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('3852e894-4a23-4f2c-b3c4-52a67525c7f4','243fe807-310f-447c-ad6c-8b9d8d392237','d6157c04-fa25-4e45-b0e1-80fb98a49994','3aa9afec-0231-4fab-bdcd-4c01429b9213','d5d744ed-41b7-4a5e-9cbe-72724f213eb2','c58f2da9-7881-41fb-b7b4-76f48ca3858d','1fd1903d-d841-45c8-8135-346a4db5c74d');
DELETE FROM journal_lines WHERE journal_id IN ('9402349a-6299-4a4f-bbf1-9e24c1e38530','4f44da30-a1eb-4ade-8bf3-90cff5739f1b');
DELETE FROM journal_entries WHERE id IN ('9402349a-6299-4a4f-bbf1-9e24c1e38530','4f44da30-a1eb-4ade-8bf3-90cff5739f1b');
DELETE FROM invoice_payments WHERE id IN ('bc0b9c46-cc59-4cb1-8b6f-10d32bc753fa','1be13306-ae0c-4e21-b276-9595aa6acb1c');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('7bd1e2e3-51b5-40f3-8db4-28518b836739','f2425d45-9837-421a-8d3b-74eed80b23cf','2025-04-01',1576200,'cash','received','VY-17-A',1,1,NOW(),NOW()),
('634d1702-4e5c-4445-b12d-3e532e795838','f2425d45-9837-421a-8d3b-74eed80b23cf','2025-04-06',1000000,'cash','received','VY-17-B',1,1,NOW(),NOW()),
('247943dc-bcc3-4c8e-a155-885a86fa3581','f2425d45-9837-421a-8d3b-74eed80b23cf','2025-04-22',2020000,'cash','received','VY-17-C',1,1,NOW(),NOW()),
('aefe7e46-9dbc-4edc-a8bf-61eb364b62c4','fee8041b-e933-4ec2-9ba5-c0e2064b250b','2025-04-22',1080000,'cash','received','VY-76-A',1,1,NOW(),NOW()),
('e554430b-74c2-4ba4-bbcb-3d68d144cc3b','fee8041b-e933-4ec2-9ba5-c0e2064b250b','2025-05-08',2020000,'cash','received','VY-76-B',1,1,NOW(),NOW()),
('9433b335-59c3-428e-9873-9d99891535a1','fee8041b-e933-4ec2-9ba5-c0e2064b250b','2025-05-17',3700000,'cash','received','VY-76-C',1,1,NOW(),NOW()),
('6c09d929-bc8f-442d-8e48-afe75bd1cc7b','fee8041b-e933-4ec2-9ba5-c0e2064b250b','2025-05-19',1088500,'cash','received','VY-76-D',1,1,NOW(),NOW()),
('6e8771a4-3faa-410f-a164-398437cd8191','fee8041b-e933-4ec2-9ba5-c0e2064b250b','2025-05-19',2020000,'cash','received','VY-76-E',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('bf1f60d2-a77b-42ba-96fb-e307352849ea','JRN-20261003-0250','2025-04-01','payment','7bd1e2e3-51b5-40f3-8db4-28518b836739','Payment from Sri Krishna Milk Agencies - VY-17-A','posted',1,1576200,1576200,1,1,NOW(),NOW()),
('b9db33c4-ddf7-4f56-884e-9cf96ccbe7a5','JRN-20261003-0251','2025-04-06','payment','634d1702-4e5c-4445-b12d-3e532e795838','Payment from Sri Krishna Milk Agencies - VY-17-B','posted',1,1000000,1000000,1,1,NOW(),NOW()),
('a01b8cab-7a3e-4b92-9167-2421bf0f3155','JRN-20261003-0252','2025-04-22','payment','247943dc-bcc3-4c8e-a155-885a86fa3581','Payment from Sri Krishna Milk Agencies - VY-17-C','posted',1,2020000,2020000,1,1,NOW(),NOW()),
('802574bb-9aa9-45e4-98cd-b433cc5d9c31','JRN-20261003-0253','2025-04-22','payment','aefe7e46-9dbc-4edc-a8bf-61eb364b62c4','Payment from Sri Krishna Milk Agencies - VY-76-A','posted',1,1080000,1080000,1,1,NOW(),NOW()),
('3c662597-71db-4e50-9e06-db063a4d4c71','JRN-20261003-0254','2025-05-08','payment','e554430b-74c2-4ba4-bbcb-3d68d144cc3b','Payment from Sri Krishna Milk Agencies - VY-76-B','posted',1,2020000,2020000,1,1,NOW(),NOW()),
('c553ee4e-9979-4318-b603-d246534715d8','JRN-20261003-0255','2025-05-17','payment','9433b335-59c3-428e-9873-9d99891535a1','Payment from Sri Krishna Milk Agencies - VY-76-C','posted',1,3700000,3700000,1,1,NOW(),NOW()),
('45721384-348d-4893-aba7-7588243e1ba9','JRN-20261003-0256','2025-05-19','payment','6c09d929-bc8f-442d-8e48-afe75bd1cc7b','Payment from Sri Krishna Milk Agencies - VY-76-D','posted',1,1088500,1088500,1,1,NOW(),NOW()),
('3d244379-093f-4ee8-a457-907335003076','JRN-20261003-0257','2025-05-19','payment','6e8771a4-3faa-410f-a164-398437cd8191','Payment from Sri Krishna Milk Agencies - VY-76-E','posted',1,2020000,2020000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('7d71fc98-99cc-4e72-a8fc-c7ff42d84556','bf1f60d2-a77b-42ba-96fb-e307352849ea','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1576200,0,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('71b76334-fe99-431e-826b-bae0f92ddc76','bf1f60d2-a77b-42ba-96fb-e307352849ea','cc779740-6c52-41ba-9bfd-c7e816c08dc4',0,1576200,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('a6fee231-026e-4803-8b25-5a78bb503a25','b9db33c4-ddf7-4f56-884e-9cf96ccbe7a5','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1000000,0,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('88555a51-2a29-432a-9d67-efa5805773f5','b9db33c4-ddf7-4f56-884e-9cf96ccbe7a5','cc779740-6c52-41ba-9bfd-c7e816c08dc4',0,1000000,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('189c99cc-e189-4258-b9df-24232d11524a','a01b8cab-7a3e-4b92-9167-2421bf0f3155','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2020000,0,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('876ea5b4-c332-452e-bf77-41b09b95eca6','a01b8cab-7a3e-4b92-9167-2421bf0f3155','cc779740-6c52-41ba-9bfd-c7e816c08dc4',0,2020000,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('8466ea13-4b73-419f-8821-863dc79140e7','802574bb-9aa9-45e4-98cd-b433cc5d9c31','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1080000,0,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('8cf41887-e3f3-4c23-b51d-57304dccf569','802574bb-9aa9-45e4-98cd-b433cc5d9c31','cc779740-6c52-41ba-9bfd-c7e816c08dc4',0,1080000,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('c47e0c09-1cf4-4d77-bef0-6c35ebe52df8','3c662597-71db-4e50-9e06-db063a4d4c71','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2020000,0,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('cb1f7a1c-a82a-47da-9e94-370fdcffe506','3c662597-71db-4e50-9e06-db063a4d4c71','cc779740-6c52-41ba-9bfd-c7e816c08dc4',0,2020000,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('934785c6-58b6-4049-99d2-6b5de8c907a5','c553ee4e-9979-4318-b603-d246534715d8','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3700000,0,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('1330d717-52f4-44e1-b239-a05b7dd5137a','c553ee4e-9979-4318-b603-d246534715d8','cc779740-6c52-41ba-9bfd-c7e816c08dc4',0,3700000,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('f88e264e-e355-4571-ad96-5da4ba187146','45721384-348d-4893-aba7-7588243e1ba9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1088500,0,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('e25472de-c7bc-40a4-b331-6fd67815bbbf','45721384-348d-4893-aba7-7588243e1ba9','cc779740-6c52-41ba-9bfd-c7e816c08dc4',0,1088500,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('039cce51-f638-4b15-b5ed-f8505e24d4ad','3d244379-093f-4ee8-a457-907335003076','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2020000,0,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1),
('6743daa9-3f98-4673-af94-0ca40b3be69e','3d244379-093f-4ee8-a457-907335003076','cc779740-6c52-41ba-9bfd-c7e816c08dc4',0,2020000,NULL,NULL,'Sri Krishna Milk Agencies','Payment receipt',1,NOW(),1);

-- ======= Tenneti Manirathnam =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('b4949582-0093-4af9-8a64-7fa5db7ee089','e1a19d25-3a9e-4ff3-9b75-f22ca1905468');
DELETE FROM journal_lines WHERE journal_id IN ('0654ac3e-c7c7-45df-80bc-6f80a494bf1a','6af5b66f-c503-44c6-963f-f82c7ec39807');
DELETE FROM journal_entries WHERE id IN ('0654ac3e-c7c7-45df-80bc-6f80a494bf1a','6af5b66f-c503-44c6-963f-f82c7ec39807');
DELETE FROM invoice_payments WHERE id IN ('1f7ad645-ddde-4ad1-a2b3-a67c25ceaf06','d52b99ab-d012-4e86-80de-d6d80dc711de');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('13b1d700-ef60-4007-b776-3f7c451a3683','5022ce57-42c8-4431-83e9-c874275d12a9','2025-04-23',4403800,'cash','received','VY-81-A',1,1,NOW(),NOW()),
('d7c53b2d-b926-4f85-b0e5-fe638f153231','b1d84142-6d9c-417c-8d84-e4b346e91869','2025-06-28',791400,'cash','received','VY-158-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('8033fc9a-724f-483e-b1d4-f7b55c40a178','JRN-20261003-0258','2025-04-23','payment','13b1d700-ef60-4007-b776-3f7c451a3683','Payment from Tenneti Manirathnam - VY-81-A','posted',1,4403800,4403800,1,1,NOW(),NOW()),
('d9ae6abf-cb98-48c3-91ec-82aeed61069b','JRN-20261003-0259','2025-06-28','payment','d7c53b2d-b926-4f85-b0e5-fe638f153231','Payment from Tenneti Manirathnam - VY-158-A','posted',1,791400,791400,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('f139709b-9116-4dcb-bffd-17e5ee0f91c0','8033fc9a-724f-483e-b1d4-f7b55c40a178','23d1cabd-e89f-4bd8-a208-91f59c3898c2',4403800,0,NULL,NULL,'Tenneti Manirathnam','Payment receipt',1,NOW(),1),
('c93f5382-d1f3-4ff8-9085-bafdadbf13ef','8033fc9a-724f-483e-b1d4-f7b55c40a178','616b9043-2719-43d5-bfcf-c695f7ba6452',0,4403800,NULL,NULL,'Tenneti Manirathnam','Payment receipt',1,NOW(),1),
('51b9bfe5-c7c1-4e7c-a7a1-3e9809099f43','d9ae6abf-cb98-48c3-91ec-82aeed61069b','23d1cabd-e89f-4bd8-a208-91f59c3898c2',791400,0,NULL,NULL,'Tenneti Manirathnam','Payment receipt',1,NOW(),1),
('c087e3dd-079e-477a-8ed7-988743199bb2','d9ae6abf-cb98-48c3-91ec-82aeed61069b','616b9043-2719-43d5-bfcf-c695f7ba6452',0,791400,NULL,NULL,'Tenneti Manirathnam','Payment receipt',1,NOW(),1);

-- ======= Tenniti Sareen =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('b050c823-d69b-4f84-a13f-3dd4070685a1','67d48bc6-5925-4850-9d92-8e95fb523c81','d9752a4d-d0c3-4167-b4cb-4eb379416827','9ac106cb-5cbd-40c5-9bb9-30d75f81249d','b9641146-1724-4313-8de4-231a12cbfe62','9c7e64e4-34eb-4281-809a-dece8989eca4');
DELETE FROM journal_lines WHERE journal_id IN ('893a8e27-62de-4167-aa33-ef28a2398722','ae88fd9a-6725-4520-b6cd-104b79f68d3e');
DELETE FROM journal_entries WHERE id IN ('893a8e27-62de-4167-aa33-ef28a2398722','ae88fd9a-6725-4520-b6cd-104b79f68d3e');
DELETE FROM invoice_payments WHERE id IN ('fa9492de-778d-427a-83c7-3c90dcdfef52','08ab1951-b29f-496b-ab82-47e3df164126');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('3ded494f-ae0b-4acb-814d-f02963cb26df','ce938c6a-e66d-44c4-b332-43f64478ef43','2025-04-23',595200,'cash','received','VY-82-A',1,1,NOW(),NOW()),
('4f9250d5-0106-453d-9186-de16e1735c92','ce938c6a-e66d-44c4-b332-43f64478ef43','2025-05-05',2000000,'cash','received','VY-82-B',1,1,NOW(),NOW()),
('c02f1fdb-6749-4974-95dc-0292cf5e7b2e','ce938c6a-e66d-44c4-b332-43f64478ef43','2025-05-15',1800000,'cash','received','VY-82-C',1,1,NOW(),NOW()),
('93936216-8f99-47b5-99bd-c3c6e9adb0c8','ce938c6a-e66d-44c4-b332-43f64478ef43','2025-06-09',8600,'cash','received','VY-82-D',1,1,NOW(),NOW()),
('1b9a82e8-0c25-45a5-8dd9-6c8d6c6df669','766daeaf-36ad-4d03-837b-fcce01fb031f','2025-06-09',1991400,'cash','received','VY-159-A',1,1,NOW(),NOW()),
('27cbaf03-d310-421b-abec-353fb6e56785','766daeaf-36ad-4d03-837b-fcce01fb031f','2025-06-28',8600,'cash','received','VY-159-B',1,1,NOW(),NOW()),
('d97b0a1a-62ae-4ede-a30b-d34478dc9be4','766daeaf-36ad-4d03-837b-fcce01fb031f','2025-06-28',200000,'cash','received','VY-159-C',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('711c32af-596c-4f0d-b842-5eabdb63ff77','JRN-20261003-0260','2025-04-23','payment','3ded494f-ae0b-4acb-814d-f02963cb26df','Payment from Tenniti Sareen - VY-82-A','posted',1,595200,595200,1,1,NOW(),NOW()),
('85c8171a-52e1-4501-bcb2-fa6f9959a0e1','JRN-20261003-0261','2025-05-05','payment','4f9250d5-0106-453d-9186-de16e1735c92','Payment from Tenniti Sareen - VY-82-B','posted',1,2000000,2000000,1,1,NOW(),NOW()),
('b34691ce-dfe5-4b2a-a051-79e261d72c99','JRN-20261003-0262','2025-05-15','payment','c02f1fdb-6749-4974-95dc-0292cf5e7b2e','Payment from Tenniti Sareen - VY-82-C','posted',1,1800000,1800000,1,1,NOW(),NOW()),
('b280a076-2b95-4c27-b965-7ce894c115c2','JRN-20261003-0263','2025-06-09','payment','93936216-8f99-47b5-99bd-c3c6e9adb0c8','Payment from Tenniti Sareen - VY-82-D','posted',1,8600,8600,1,1,NOW(),NOW()),
('d44abce9-22cf-4443-abc1-f7f8cb3effb9','JRN-20261003-0264','2025-06-09','payment','1b9a82e8-0c25-45a5-8dd9-6c8d6c6df669','Payment from Tenniti Sareen - VY-159-A','posted',1,1991400,1991400,1,1,NOW(),NOW()),
('f80ef8a6-79b2-42f4-aeff-1a78258ba261','JRN-20261003-0265','2025-06-28','payment','27cbaf03-d310-421b-abec-353fb6e56785','Payment from Tenniti Sareen - VY-159-B','posted',1,8600,8600,1,1,NOW(),NOW()),
('d9599885-c7a8-436f-9a8e-8a0b8bd04299','JRN-20261003-0266','2025-06-28','payment','d97b0a1a-62ae-4ede-a30b-d34478dc9be4','Payment from Tenniti Sareen - VY-159-C','posted',1,200000,200000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('aff9275d-eaa8-49de-b130-2397c1c20f3a','711c32af-596c-4f0d-b842-5eabdb63ff77','23d1cabd-e89f-4bd8-a208-91f59c3898c2',595200,0,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1),
('831ce53a-3dcd-411c-86a9-65211a2c1cb3','711c32af-596c-4f0d-b842-5eabdb63ff77','53d75ed2-95fc-436b-bc2b-6b841655a586',0,595200,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1),
('90e31be1-59d1-4a00-8edb-4fb1c10a5f8a','85c8171a-52e1-4501-bcb2-fa6f9959a0e1','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2000000,0,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1),
('1d1cec76-e4e8-4e96-befe-fec3647d27a3','85c8171a-52e1-4501-bcb2-fa6f9959a0e1','53d75ed2-95fc-436b-bc2b-6b841655a586',0,2000000,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1),
('b5d4c7ee-ba96-401b-9a33-f585b8568a3d','b34691ce-dfe5-4b2a-a051-79e261d72c99','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1800000,0,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1),
('2971590e-a372-46ad-a381-e440d6195df6','b34691ce-dfe5-4b2a-a051-79e261d72c99','53d75ed2-95fc-436b-bc2b-6b841655a586',0,1800000,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1),
('6fb3e5f4-7a94-4950-ae20-8b0620fe19fd','b280a076-2b95-4c27-b965-7ce894c115c2','23d1cabd-e89f-4bd8-a208-91f59c3898c2',8600,0,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1),
('f95354e5-2461-455b-9ac4-5a11ad503626','b280a076-2b95-4c27-b965-7ce894c115c2','53d75ed2-95fc-436b-bc2b-6b841655a586',0,8600,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1),
('d35099a5-1801-4016-8f29-96473b4e7002','d44abce9-22cf-4443-abc1-f7f8cb3effb9','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1991400,0,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1),
('73cd564d-c947-4249-8a81-4bb312302e9b','d44abce9-22cf-4443-abc1-f7f8cb3effb9','53d75ed2-95fc-436b-bc2b-6b841655a586',0,1991400,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1),
('805549ed-c328-4600-a83e-f21280ed3911','f80ef8a6-79b2-42f4-aeff-1a78258ba261','23d1cabd-e89f-4bd8-a208-91f59c3898c2',8600,0,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1),
('404b827b-2a04-4818-9c9a-2427f4e09445','f80ef8a6-79b2-42f4-aeff-1a78258ba261','53d75ed2-95fc-436b-bc2b-6b841655a586',0,8600,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1),
('871c095d-57f2-4815-87b9-745b64ffd4e0','d9599885-c7a8-436f-9a8e-8a0b8bd04299','23d1cabd-e89f-4bd8-a208-91f59c3898c2',200000,0,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1),
('fe45bec4-4b1b-4cf2-a32b-ffc96640cb23','d9599885-c7a8-436f-9a8e-8a0b8bd04299','53d75ed2-95fc-436b-bc2b-6b841655a586',0,200000,NULL,NULL,'Tenniti Sareen','Payment receipt',1,NOW(),1);

-- ======= UPLANDS GAS SERVICE =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('9348a3fe-9de7-4f25-b3d2-d7893830cde6');
DELETE FROM journal_lines WHERE journal_id IN ('e223acac-8c0f-4759-8ad0-223df7065645','906a9c72-a63a-466c-97aa-7a2ae20e2515');
DELETE FROM journal_entries WHERE id IN ('e223acac-8c0f-4759-8ad0-223df7065645','906a9c72-a63a-466c-97aa-7a2ae20e2515');
DELETE FROM invoice_payments WHERE id IN ('3199807e-5577-41d9-9265-663e9b135493','09fe34f2-4405-4608-989d-156ead75cfbb');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('80748496-ee3b-4b2f-b32b-3df78752a453','22a15f7d-8cd0-4d6f-96b6-d6ceea6b0538','2025-09-09',1084100,'cash','received','VY-85-A',1,1,NOW(),NOW()),
('83f34197-10a4-4ad8-b069-c4889ffa0e5f','cedecea6-00e6-4e2e-ab9e-cf7962f57cbb','2025-09-09',361400,'cash','received','VY-264-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('cff9ff05-f375-4122-b489-0cf70845e15a','JRN-20261003-0267','2025-09-09','payment','80748496-ee3b-4b2f-b32b-3df78752a453','Payment from UPLANDS GAS SERVICE - VY-85-A','posted',1,1084100,1084100,1,1,NOW(),NOW()),
('6c0cc9b4-a1a9-432e-9e04-f6aeaf0d4755','JRN-20261003-0268','2025-09-09','payment','83f34197-10a4-4ad8-b069-c4889ffa0e5f','Payment from UPLANDS GAS SERVICE - VY-264-A','posted',1,361400,361400,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('0f14490c-e7d6-41ef-a63e-781d7ec8ec3e','cff9ff05-f375-4122-b489-0cf70845e15a','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1084100,0,NULL,NULL,'UPLANDS GAS SERVICE','Payment receipt',1,NOW(),1),
('deda2aad-d1fe-424b-b629-9f9e1f69be1c','cff9ff05-f375-4122-b489-0cf70845e15a','8696dec5-f351-4633-9fef-41e67e999dbc',0,1084100,NULL,NULL,'UPLANDS GAS SERVICE','Payment receipt',1,NOW(),1),
('24fec0fa-f1f3-40d2-8e0d-63f2ef61e8e3','6c0cc9b4-a1a9-432e-9e04-f6aeaf0d4755','23d1cabd-e89f-4bd8-a208-91f59c3898c2',361400,0,NULL,NULL,'UPLANDS GAS SERVICE','Payment receipt',1,NOW(),1),
('e3955a44-fd48-4db6-97d9-b0ecfabaccc8','6c0cc9b4-a1a9-432e-9e04-f6aeaf0d4755','8696dec5-f351-4633-9fef-41e67e999dbc',0,361400,NULL,NULL,'UPLANDS GAS SERVICE','Payment receipt',1,NOW(),1);

-- ======= Uttarakavatam Lakshmi Tarun =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('b4fc77a2-311d-4938-b015-31e3f4af5290','cfb05696-c476-4451-a72d-df3bc4d4e20d','4d1be0a1-2432-4326-843c-ab873ca574c5','298b86e7-ee4f-49fa-b14c-cf0050400064','f85a1901-5357-45e4-91e6-81f6fc420740');
DELETE FROM journal_lines WHERE journal_id IN ('ee0743b1-017d-4c39-8781-6686fd2765ea','a3457586-f38a-4afe-abf5-fabd14533e2c','fe6f6b22-5698-4ebf-b7f4-a2891713f400');
DELETE FROM journal_entries WHERE id IN ('ee0743b1-017d-4c39-8781-6686fd2765ea','a3457586-f38a-4afe-abf5-fabd14533e2c','fe6f6b22-5698-4ebf-b7f4-a2891713f400');
DELETE FROM invoice_payments WHERE id IN ('3b776e41-65fe-43a2-8ba4-34356a6da44c','d3e82f0b-1df8-4edc-bc18-8eb5f5380478','42f70d07-7b05-442f-8153-a489f965ffdb');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('374fe9b1-79db-4c43-8391-fe54957a21ce','c8d85720-22ef-49ff-9f21-6ed91537c796','2025-03-15',3612500,'cash','received','VY-14-A',1,1,NOW(),NOW()),
('718a342a-ec46-49fa-b882-b85345431182','89200ef8-a888-436f-b6db-41879b636e81','2025-05-10',2000000,'cash','received','VY-121-A',1,1,NOW(),NOW()),
('97ac9fdc-b446-4a52-a3de-226175e66489','89200ef8-a888-436f-b6db-41879b636e81','2025-05-16',1100000,'cash','received','VY-121-B',1,1,NOW(),NOW()),
('02a85981-767c-47f9-89a9-62022ed97e5a','89200ef8-a888-436f-b6db-41879b636e81','2025-05-17',350000,'cash','received','VY-121-C',1,1,NOW(),NOW()),
('769f0f92-2da3-499c-850d-3f11c39b0184','89200ef8-a888-436f-b6db-41879b636e81','2025-06-30',100,'cash','received','VY-121-D',1,1,NOW(),NOW()),
('db1a9ff1-d4fb-4a1c-8c84-fc527ed956b3','d0e6a6be-0a77-486f-aa49-9ab0ef44e04a','2025-06-30',1224900,'cash','received','VY-195-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('1c4e071f-53f4-4342-95e7-e7fe2bbe7310','JRN-20261003-0269','2025-03-15','payment','374fe9b1-79db-4c43-8391-fe54957a21ce','Payment from Uttarakavatam Lakshmi Tarun - VY-14-A','posted',1,3612500,3612500,1,1,NOW(),NOW()),
('41e4fef1-1e71-4c89-9e9b-871fd306fa01','JRN-20261003-0270','2025-05-10','payment','718a342a-ec46-49fa-b882-b85345431182','Payment from Uttarakavatam Lakshmi Tarun - VY-121-A','posted',1,2000000,2000000,1,1,NOW(),NOW()),
('1bd773ea-96ec-4360-94a4-6f3d20af922e','JRN-20261003-0271','2025-05-16','payment','97ac9fdc-b446-4a52-a3de-226175e66489','Payment from Uttarakavatam Lakshmi Tarun - VY-121-B','posted',1,1100000,1100000,1,1,NOW(),NOW()),
('d0661451-6e69-47b3-b664-65de7db51fce','JRN-20261003-0272','2025-05-17','payment','02a85981-767c-47f9-89a9-62022ed97e5a','Payment from Uttarakavatam Lakshmi Tarun - VY-121-C','posted',1,350000,350000,1,1,NOW(),NOW()),
('a8e54afb-69d9-4eed-bceb-45a66e4c0d7c','JRN-20261003-0273','2025-06-30','payment','769f0f92-2da3-499c-850d-3f11c39b0184','Payment from Uttarakavatam Lakshmi Tarun - VY-121-D','posted',1,100,100,1,1,NOW(),NOW()),
('6f3ae31e-95b0-4dbf-906d-4e4124f92377','JRN-20261003-0274','2025-06-30','payment','db1a9ff1-d4fb-4a1c-8c84-fc527ed956b3','Payment from Uttarakavatam Lakshmi Tarun - VY-195-A','posted',1,1224900,1224900,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('e483a295-b5b0-4ebb-aa1a-b718f015b075','1c4e071f-53f4-4342-95e7-e7fe2bbe7310','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3612500,0,NULL,NULL,'Uttarakavatam Lakshmi Tarun','Payment receipt',1,NOW(),1),
('4c079ec9-f1b3-4693-94e7-a36f8f663355','1c4e071f-53f4-4342-95e7-e7fe2bbe7310','c4e16a56-1748-4d5d-9795-8f38ca5aece6',0,3612500,NULL,NULL,'Uttarakavatam Lakshmi Tarun','Payment receipt',1,NOW(),1),
('bc3f41a8-cc3f-43f1-a271-f2fa16987bb1','41e4fef1-1e71-4c89-9e9b-871fd306fa01','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2000000,0,NULL,NULL,'Uttarakavatam Lakshmi Tarun','Payment receipt',1,NOW(),1),
('9860804c-48d3-4add-bbff-a577482536c4','41e4fef1-1e71-4c89-9e9b-871fd306fa01','c4e16a56-1748-4d5d-9795-8f38ca5aece6',0,2000000,NULL,NULL,'Uttarakavatam Lakshmi Tarun','Payment receipt',1,NOW(),1),
('eb01e95a-d35c-4508-a8a1-c0264b654575','1bd773ea-96ec-4360-94a4-6f3d20af922e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1100000,0,NULL,NULL,'Uttarakavatam Lakshmi Tarun','Payment receipt',1,NOW(),1),
('9a9a10ff-226d-4bc0-951d-0b207e4db162','1bd773ea-96ec-4360-94a4-6f3d20af922e','c4e16a56-1748-4d5d-9795-8f38ca5aece6',0,1100000,NULL,NULL,'Uttarakavatam Lakshmi Tarun','Payment receipt',1,NOW(),1),
('f0023201-bcf5-4d24-9683-b1f2202ff8a6','d0661451-6e69-47b3-b664-65de7db51fce','23d1cabd-e89f-4bd8-a208-91f59c3898c2',350000,0,NULL,NULL,'Uttarakavatam Lakshmi Tarun','Payment receipt',1,NOW(),1),
('5efb88af-f9a0-45d3-a784-93346f667811','d0661451-6e69-47b3-b664-65de7db51fce','c4e16a56-1748-4d5d-9795-8f38ca5aece6',0,350000,NULL,NULL,'Uttarakavatam Lakshmi Tarun','Payment receipt',1,NOW(),1),
('80616f65-72ce-4ce7-8bfc-8fc451f750af','a8e54afb-69d9-4eed-bceb-45a66e4c0d7c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',100,0,NULL,NULL,'Uttarakavatam Lakshmi Tarun','Payment receipt',1,NOW(),1),
('d5e7ae03-5bb1-4eb7-95df-7f2cf06876bb','a8e54afb-69d9-4eed-bceb-45a66e4c0d7c','c4e16a56-1748-4d5d-9795-8f38ca5aece6',0,100,NULL,NULL,'Uttarakavatam Lakshmi Tarun','Payment receipt',1,NOW(),1),
('728ce969-03a1-43e7-a466-762e67d38ccc','6f3ae31e-95b0-4dbf-906d-4e4124f92377','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1224900,0,NULL,NULL,'Uttarakavatam Lakshmi Tarun','Payment receipt',1,NOW(),1),
('77c8b58d-0a9d-450b-bd59-6e7ee99a7399','6f3ae31e-95b0-4dbf-906d-4e4124f92377','c4e16a56-1748-4d5d-9795-8f38ca5aece6',0,1224900,NULL,NULL,'Uttarakavatam Lakshmi Tarun','Payment receipt',1,NOW(),1);

-- ======= VENKATA VAISHNAVI ENTERPRISES =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('ac0b65dd-53bf-4626-b629-c5ad0afe02cf','611abf42-3f79-4945-9b89-2b93b837ff82','ac8a8a08-25b2-4a3a-a9dd-0b7daeb0df94','2d4f752d-5857-493d-bb65-ccd3af3f1833','883e29fc-eabd-40ba-8129-3d1dd934786a','ee969702-be18-4345-aa41-73152031e43e','1f34a80d-d209-4d40-8107-685ce5bbd42c','0044e33d-3d68-4eff-8075-f52e32c35308','4ff4eb01-ea03-46a6-a557-803172a09783','a78a86c6-013c-4db5-ae88-4b3c21514e61','7ad170ff-9a11-49a9-ae4b-d527e8d5e76e');
DELETE FROM journal_lines WHERE journal_id IN ('54ece8d1-241a-4652-8910-c1f59c80d004','2ed81f25-296a-4941-835f-49a35a5a024c','2b6aedcb-66f3-4c51-b996-630ca12d0c6d','34d70412-6b6b-494e-a263-513ee1bf69ac');
DELETE FROM journal_entries WHERE id IN ('54ece8d1-241a-4652-8910-c1f59c80d004','2ed81f25-296a-4941-835f-49a35a5a024c','2b6aedcb-66f3-4c51-b996-630ca12d0c6d','34d70412-6b6b-494e-a263-513ee1bf69ac');
DELETE FROM invoice_payments WHERE id IN ('30a2e62a-421b-417e-8f55-0458da2103a7','4a860711-598b-4816-a3aa-3bdb8b5583b5','a37aca60-c1b2-41a8-8c59-51b78fdaec1c','a08e3b2b-af6d-42e6-80cc-dbcf976cf59a');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('863d0cb1-ba85-4224-92e4-81917739e070','681004d1-55af-4d5e-82cd-8c9d20b761e9','2025-03-21',5000000,'cash','received','VY-20-A',1,1,NOW(),NOW()),
('20aa1c45-7e7e-4773-96f0-6e302997f27a','681004d1-55af-4d5e-82cd-8c9d20b761e9','2025-04-21',2000000,'cash','received','VY-20-B',1,1,NOW(),NOW()),
('2ca2c3f8-8387-42ed-beb2-e60623564493','681004d1-55af-4d5e-82cd-8c9d20b761e9','2025-05-10',2705400,'cash','received','VY-20-C',1,1,NOW(),NOW()),
('c3707300-61f7-4170-bf45-2bffbcdd21e8','7fd915f3-581e-423a-a6df-8fe56ec855f9','2025-05-10',1194600,'cash','received','VY-122-A',1,1,NOW(),NOW()),
('55a55e86-5d28-427b-8752-73353e28f5ab','7fd915f3-581e-423a-a6df-8fe56ec855f9','2025-05-19',5100000,'cash','received','VY-122-B',1,1,NOW(),NOW()),
('c7135cc3-2904-42e0-b7ed-84fa7a8aca8c','7fd915f3-581e-423a-a6df-8fe56ec855f9','2025-05-19',2000000,'cash','received','VY-122-C',1,1,NOW(),NOW()),
('3ae6e8b1-0a7b-4068-854c-781ce1d61b8d','7fd915f3-581e-423a-a6df-8fe56ec855f9','2025-06-14',2445400,'cash','received','VY-122-D',1,1,NOW(),NOW()),
('2c22315a-100b-49e9-8e34-990d8822ab07','2fcb5544-48a8-4d01-a94d-7c8dbbdccdce','2025-06-14',2554600,'cash','received','VY-161-A',1,1,NOW(),NOW()),
('a09a25bb-99ca-4f78-ab59-e9737cf347c5','2fcb5544-48a8-4d01-a94d-7c8dbbdccdce','2025-06-20',1460000,'cash','received','VY-161-B',1,1,NOW(),NOW()),
('3c151b17-e581-4bae-b636-2f9136103d2e','2fcb5544-48a8-4d01-a94d-7c8dbbdccdce','2025-06-21',985400,'cash','received','VY-161-C',1,1,NOW(),NOW()),
('8388db03-107e-42b2-b618-7c5ca16226ed','2fcb5544-48a8-4d01-a94d-7c8dbbdccdce','2025-06-21',3240200,'cash','received','VY-161-D',1,1,NOW(),NOW()),
('3a78f1c5-2ac1-4c64-a780-be96956325c6','2fcb5544-48a8-4d01-a94d-7c8dbbdccdce','2025-06-21',783400,'cash','received','VY-161-E',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('ff12782c-f744-4916-9d66-e4ad3d04b3a5','JRN-20261003-0275','2025-03-21','payment','863d0cb1-ba85-4224-92e4-81917739e070','Payment from VENKATA VAISHNAVI ENTERPRISES - VY-20-A','posted',1,5000000,5000000,1,1,NOW(),NOW()),
('ce1a61cf-790a-48a7-8c02-98a4d1c776f5','JRN-20261003-0276','2025-04-21','payment','20aa1c45-7e7e-4773-96f0-6e302997f27a','Payment from VENKATA VAISHNAVI ENTERPRISES - VY-20-B','posted',1,2000000,2000000,1,1,NOW(),NOW()),
('80d6d04e-6efe-47b8-adf4-1d6ea717be04','JRN-20261003-0277','2025-05-10','payment','2ca2c3f8-8387-42ed-beb2-e60623564493','Payment from VENKATA VAISHNAVI ENTERPRISES - VY-20-C','posted',1,2705400,2705400,1,1,NOW(),NOW()),
('8888f7f6-9310-4c29-a74f-1f095a6274e4','JRN-20261003-0278','2025-05-10','payment','c3707300-61f7-4170-bf45-2bffbcdd21e8','Payment from VENKATA VAISHNAVI ENTERPRISES - VY-122-A','posted',1,1194600,1194600,1,1,NOW(),NOW()),
('087e2826-0610-40c8-b8c1-6e1d23c30da7','JRN-20261003-0279','2025-05-19','payment','55a55e86-5d28-427b-8752-73353e28f5ab','Payment from VENKATA VAISHNAVI ENTERPRISES - VY-122-B','posted',1,5100000,5100000,1,1,NOW(),NOW()),
('59e4cabd-58e3-49c0-8568-970165dde93c','JRN-20261003-0280','2025-05-19','payment','c7135cc3-2904-42e0-b7ed-84fa7a8aca8c','Payment from VENKATA VAISHNAVI ENTERPRISES - VY-122-C','posted',1,2000000,2000000,1,1,NOW(),NOW()),
('fd35e0e3-6c8c-4090-b2d6-c8b56c76519f','JRN-20261003-0281','2025-06-14','payment','3ae6e8b1-0a7b-4068-854c-781ce1d61b8d','Payment from VENKATA VAISHNAVI ENTERPRISES - VY-122-D','posted',1,2445400,2445400,1,1,NOW(),NOW()),
('2b165ecd-c1a8-44aa-9aa2-34e58b622635','JRN-20261003-0282','2025-06-14','payment','2c22315a-100b-49e9-8e34-990d8822ab07','Payment from VENKATA VAISHNAVI ENTERPRISES - VY-161-A','posted',1,2554600,2554600,1,1,NOW(),NOW()),
('c13fedc4-66e2-419a-9bf3-c1e53fe9338c','JRN-20261003-0283','2025-06-20','payment','a09a25bb-99ca-4f78-ab59-e9737cf347c5','Payment from VENKATA VAISHNAVI ENTERPRISES - VY-161-B','posted',1,1460000,1460000,1,1,NOW(),NOW()),
('786010a4-82f7-4485-8cd7-bfbe57192f5f','JRN-20261003-0284','2025-06-21','payment','3c151b17-e581-4bae-b636-2f9136103d2e','Payment from VENKATA VAISHNAVI ENTERPRISES - VY-161-C','posted',1,985400,985400,1,1,NOW(),NOW()),
('f2e2aeee-5206-4699-b12d-659e57a1182f','JRN-20261003-0285','2025-06-21','payment','8388db03-107e-42b2-b618-7c5ca16226ed','Payment from VENKATA VAISHNAVI ENTERPRISES - VY-161-D','posted',1,3240200,3240200,1,1,NOW(),NOW()),
('28ff8f91-3b32-4f57-87bd-de3f16cc96ad','JRN-20261003-0286','2025-06-21','payment','3a78f1c5-2ac1-4c64-a780-be96956325c6','Payment from VENKATA VAISHNAVI ENTERPRISES - VY-161-E','posted',1,783400,783400,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('44d28034-c704-43e9-8d20-f2b2e81be285','ff12782c-f744-4916-9d66-e4ad3d04b3a5','23d1cabd-e89f-4bd8-a208-91f59c3898c2',5000000,0,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('118c19e2-49bc-4eb9-aac2-59e49b9a1a68','ff12782c-f744-4916-9d66-e4ad3d04b3a5','94941218-7773-4a72-b732-b9f5cb85e884',0,5000000,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('87e75a49-3b5b-45c7-a7aa-089e5050f4be','ce1a61cf-790a-48a7-8c02-98a4d1c776f5','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2000000,0,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('e85f39d4-11d6-4bee-baa6-220b148f725a','ce1a61cf-790a-48a7-8c02-98a4d1c776f5','94941218-7773-4a72-b732-b9f5cb85e884',0,2000000,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('882edd04-60f0-4e72-8941-05e0eed20bfb','80d6d04e-6efe-47b8-adf4-1d6ea717be04','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2705400,0,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('36a88d9e-36e9-48e3-80b9-af24cd8fcf3c','80d6d04e-6efe-47b8-adf4-1d6ea717be04','94941218-7773-4a72-b732-b9f5cb85e884',0,2705400,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('9e599425-06eb-44fd-8e2f-f7e9e9c7576e','8888f7f6-9310-4c29-a74f-1f095a6274e4','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1194600,0,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('22c29982-90ce-4ef3-9d05-824d0b7b17a4','8888f7f6-9310-4c29-a74f-1f095a6274e4','94941218-7773-4a72-b732-b9f5cb85e884',0,1194600,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('fad9167a-ced9-4458-b735-dc8a8a110b5e','087e2826-0610-40c8-b8c1-6e1d23c30da7','23d1cabd-e89f-4bd8-a208-91f59c3898c2',5100000,0,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('4427f555-0ec4-4b1e-b739-848f6b9683f8','087e2826-0610-40c8-b8c1-6e1d23c30da7','94941218-7773-4a72-b732-b9f5cb85e884',0,5100000,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('d805fc9f-1442-404a-91ca-1230e4fa6817','59e4cabd-58e3-49c0-8568-970165dde93c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2000000,0,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('7cd92f89-66c7-4a73-8d0c-d4cd05141414','59e4cabd-58e3-49c0-8568-970165dde93c','94941218-7773-4a72-b732-b9f5cb85e884',0,2000000,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('81e83bdc-5ab7-4ae1-b884-70662bba59d0','fd35e0e3-6c8c-4090-b2d6-c8b56c76519f','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2445400,0,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('90cc7dae-60db-4f78-b3f6-3eff39028bed','fd35e0e3-6c8c-4090-b2d6-c8b56c76519f','94941218-7773-4a72-b732-b9f5cb85e884',0,2445400,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('5977c1ce-e592-4edc-99db-ccf01acd2a8d','2b165ecd-c1a8-44aa-9aa2-34e58b622635','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2554600,0,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('ab25c71b-2806-418c-9ef7-a3834f558dfd','2b165ecd-c1a8-44aa-9aa2-34e58b622635','94941218-7773-4a72-b732-b9f5cb85e884',0,2554600,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('3a108e6a-dac2-4bca-aa05-80b1e9d1395e','c13fedc4-66e2-419a-9bf3-c1e53fe9338c','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1460000,0,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('d0217c4d-a76f-44ed-b604-881300a0642d','c13fedc4-66e2-419a-9bf3-c1e53fe9338c','94941218-7773-4a72-b732-b9f5cb85e884',0,1460000,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('7b859e95-ee19-4f46-b50d-c3b3e887f02c','786010a4-82f7-4485-8cd7-bfbe57192f5f','23d1cabd-e89f-4bd8-a208-91f59c3898c2',985400,0,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('7a33fb46-5f20-44a8-9d4c-21f78dea27cf','786010a4-82f7-4485-8cd7-bfbe57192f5f','94941218-7773-4a72-b732-b9f5cb85e884',0,985400,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('614de4cb-1aba-437b-9501-b096e2b1de13','f2e2aeee-5206-4699-b12d-659e57a1182f','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3240200,0,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('419770d3-0bf4-452b-9630-25d111aeff15','f2e2aeee-5206-4699-b12d-659e57a1182f','94941218-7773-4a72-b732-b9f5cb85e884',0,3240200,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('77a5d482-99ff-4e4a-b347-475d8eb082a6','28ff8f91-3b32-4f57-87bd-de3f16cc96ad','23d1cabd-e89f-4bd8-a208-91f59c3898c2',783400,0,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1),
('83ce25b5-d2d2-42fb-8338-7b2246fd09fc','28ff8f91-3b32-4f57-87bd-de3f16cc96ad','94941218-7773-4a72-b732-b9f5cb85e884',0,783400,NULL,NULL,'VENKATA VAISHNAVI ENTERPRISES','Payment receipt',1,NOW(),1);

-- ======= VISAKHA FILLING STATION =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('0ec50d39-19d7-4da3-8b89-1de459a248d3');
DELETE FROM journal_lines WHERE journal_id IN ('a73a5633-366a-44cc-8853-5f731eaa7fa2');
DELETE FROM journal_entries WHERE id IN ('a73a5633-366a-44cc-8853-5f731eaa7fa2');
DELETE FROM invoice_payments WHERE id IN ('f9ab0608-0fc1-48e0-ba57-d0ae250679ab');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('ffe64af1-5d02-4bc1-ab49-b5d0c9c348fb','cc44f9cc-e693-4df1-8639-c988a15e0c87','2025-09-24',600000,'cash','received','VY-267-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('b6e45802-7ebb-4e03-b298-e5106ad1438e','JRN-20261003-0287','2025-09-24','payment','ffe64af1-5d02-4bc1-ab49-b5d0c9c348fb','Payment from VISAKHA FILLING STATION - VY-267-A','posted',1,600000,600000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('0942858d-d2d2-4f0f-8169-84d3f439fe00','b6e45802-7ebb-4e03-b298-e5106ad1438e','23d1cabd-e89f-4bd8-a208-91f59c3898c2',600000,0,NULL,NULL,'VISAKHA FILLING STATION','Payment receipt',1,NOW(),1),
('b86ab95a-8939-4bf8-afc1-5c47a04b267a','b6e45802-7ebb-4e03-b298-e5106ad1438e','a07fbf8d-d395-4c0e-b244-153f90564296',0,600000,NULL,NULL,'VISAKHA FILLING STATION','Payment receipt',1,NOW(),1);

-- ======= Vuggina Narasingarao =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('ca12cb2c-bf2c-49ba-96c0-96ba1d9e9236','377f4898-8757-4e01-a560-370afdc2e9fb');
DELETE FROM journal_lines WHERE journal_id IN ('80bafd81-2458-4195-8d9a-0ea200a912a1');
DELETE FROM journal_entries WHERE id IN ('80bafd81-2458-4195-8d9a-0ea200a912a1');
DELETE FROM invoice_payments WHERE id IN ('7764796d-5147-40eb-836f-c69da4d23a71');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('290e5fc0-812c-4bdc-8a95-d7058fc03c62','81c91712-4e63-4da3-8106-d7782e027120','2025-05-04',850000,'cash','received','VY-74-A',1,1,NOW(),NOW()),
('a0042d0f-3d00-449e-9577-356dc1ffaf57','81c91712-4e63-4da3-8106-d7782e027120','2025-06-09',1000000,'cash','received','VY-74-B',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('8b0a65c6-3474-4cc7-a2f9-9c75bac63f88','JRN-20261003-0288','2025-05-04','payment','290e5fc0-812c-4bdc-8a95-d7058fc03c62','Payment from Vuggina Narasingarao - VY-74-A','posted',1,850000,850000,1,1,NOW(),NOW()),
('80b923a0-f686-4c54-ab38-2e3a57213a73','JRN-20261003-0289','2025-06-09','payment','a0042d0f-3d00-449e-9577-356dc1ffaf57','Payment from Vuggina Narasingarao - VY-74-B','posted',1,1000000,1000000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('e2bdf077-9f80-4015-899e-43d5efbd24c8','8b0a65c6-3474-4cc7-a2f9-9c75bac63f88','23d1cabd-e89f-4bd8-a208-91f59c3898c2',850000,0,NULL,NULL,'Vuggina Narasingarao','Payment receipt',1,NOW(),1),
('a8a278f2-3124-4325-9f60-b2599f855e7c','8b0a65c6-3474-4cc7-a2f9-9c75bac63f88','50cca34c-6a7b-42e4-b7f5-c452be0ecc30',0,850000,NULL,NULL,'Vuggina Narasingarao','Payment receipt',1,NOW(),1),
('f24a1704-6126-4841-a81b-677fe0a99e83','80b923a0-f686-4c54-ab38-2e3a57213a73','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1000000,0,NULL,NULL,'Vuggina Narasingarao','Payment receipt',1,NOW(),1),
('926f9046-e282-4cba-898e-db726e5895b4','80b923a0-f686-4c54-ab38-2e3a57213a73','50cca34c-6a7b-42e4-b7f5-c452be0ecc30',0,1000000,NULL,NULL,'Vuggina Narasingarao','Payment receipt',1,NOW(),1);

-- ======= Yalla Vasanth =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('5ca26c7b-a37a-4be8-97f7-62adc8a5261b','99a5bfef-3715-4d73-8cbe-7eacdc14ddfc','435d9747-1353-4171-9f57-1cc394d66ac9','78ee167e-5045-4d96-9198-f561c8503c07');
DELETE FROM journal_lines WHERE journal_id IN ('6c681b5b-5605-4cc5-9360-23878fa41ecd','6dc328e4-cc95-45da-a012-af6e43e1744c','9ecf0e8b-447a-4de9-953d-58c55b573f41');
DELETE FROM journal_entries WHERE id IN ('6c681b5b-5605-4cc5-9360-23878fa41ecd','6dc328e4-cc95-45da-a012-af6e43e1744c','9ecf0e8b-447a-4de9-953d-58c55b573f41');
DELETE FROM invoice_payments WHERE id IN ('48fa6daa-451b-4ebd-acc9-11a26f43428d','b487facd-55d4-40d8-a60c-fa6a62c96106','1e9b6d59-b837-4b24-8604-6827f20e0882');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('ce043df3-0a5d-4cd1-9372-0c406fbcb10a','12f05b9c-026e-4317-b7fa-77a5658caebe','2025-03-18',3550000,'cash','received','VY-18-A',1,1,NOW(),NOW()),
('b7829491-a9bc-4fc9-9aa3-15a15099c821','12f05b9c-026e-4317-b7fa-77a5658caebe','2025-04-21',200,'cash','received','VY-18-B',1,1,NOW(),NOW()),
('e143813b-efae-4f8e-80b7-a399873dee09','4df299dd-306a-4736-9acf-c6c3e1c32b36','2025-04-21',3629800,'cash','received','VY-80-A',1,1,NOW(),NOW()),
('d268444e-1be1-4e1d-914f-d387bc5fd8b0','4df299dd-306a-4736-9acf-c6c3e1c32b36','2025-06-09',500,'cash','received','VY-80-B',1,1,NOW(),NOW()),
('270396c9-e2be-4e1e-83a4-01490dce301d','9501fcaf-b208-41a4-b41d-c0d8ac9a1c6d','2025-06-09',799500,'cash','received','VY-162-A',1,1,NOW(),NOW()),
('bd3a6047-96a4-4b99-a6df-b7bddd4b811f','9501fcaf-b208-41a4-b41d-c0d8ac9a1c6d','2025-06-09',2830000,'cash','received','VY-162-B',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('e44c4015-68ea-4bf5-b0eb-67e0a519cfb0','JRN-20261003-0290','2025-03-18','payment','ce043df3-0a5d-4cd1-9372-0c406fbcb10a','Payment from Yalla Vasanth - VY-18-A','posted',1,3550000,3550000,1,1,NOW(),NOW()),
('6c660f15-da0e-4fba-9112-76277d9b84fb','JRN-20261003-0291','2025-04-21','payment','b7829491-a9bc-4fc9-9aa3-15a15099c821','Payment from Yalla Vasanth - VY-18-B','posted',1,200,200,1,1,NOW(),NOW()),
('e723601a-63ad-4d54-8795-ddb15b3c06b3','JRN-20261003-0292','2025-04-21','payment','e143813b-efae-4f8e-80b7-a399873dee09','Payment from Yalla Vasanth - VY-80-A','posted',1,3629800,3629800,1,1,NOW(),NOW()),
('cb77219d-f510-4d07-9a2a-6613de4334a2','JRN-20261003-0293','2025-06-09','payment','d268444e-1be1-4e1d-914f-d387bc5fd8b0','Payment from Yalla Vasanth - VY-80-B','posted',1,500,500,1,1,NOW(),NOW()),
('9d19c831-edab-4136-a7a0-ebed68920fba','JRN-20261003-0294','2025-06-09','payment','270396c9-e2be-4e1e-83a4-01490dce301d','Payment from Yalla Vasanth - VY-162-A','posted',1,799500,799500,1,1,NOW(),NOW()),
('58b5e990-6058-4e61-8199-174869c399fb','JRN-20261003-0295','2025-06-09','payment','bd3a6047-96a4-4b99-a6df-b7bddd4b811f','Payment from Yalla Vasanth - VY-162-B','posted',1,2830000,2830000,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('299b9979-705f-431d-a6d5-23b2c447195f','e44c4015-68ea-4bf5-b0eb-67e0a519cfb0','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3550000,0,NULL,NULL,'Yalla Vasanth','Payment receipt',1,NOW(),1),
('f1ed6022-c204-4f6b-9f21-320a160a4b50','e44c4015-68ea-4bf5-b0eb-67e0a519cfb0','2338b755-93d5-4aef-bb3c-9da641c0b3a9',0,3550000,NULL,NULL,'Yalla Vasanth','Payment receipt',1,NOW(),1),
('115b3280-9bda-491b-a7f1-06c307c2d0b1','6c660f15-da0e-4fba-9112-76277d9b84fb','23d1cabd-e89f-4bd8-a208-91f59c3898c2',200,0,NULL,NULL,'Yalla Vasanth','Payment receipt',1,NOW(),1),
('5424925f-55d8-4d3e-b9bc-7837d06d4ffa','6c660f15-da0e-4fba-9112-76277d9b84fb','2338b755-93d5-4aef-bb3c-9da641c0b3a9',0,200,NULL,NULL,'Yalla Vasanth','Payment receipt',1,NOW(),1),
('5b2ddaac-cf05-455a-b368-76bfc0015f06','e723601a-63ad-4d54-8795-ddb15b3c06b3','23d1cabd-e89f-4bd8-a208-91f59c3898c2',3629800,0,NULL,NULL,'Yalla Vasanth','Payment receipt',1,NOW(),1),
('82fa2f23-13de-45b1-9612-5fd5d97a94cd','e723601a-63ad-4d54-8795-ddb15b3c06b3','2338b755-93d5-4aef-bb3c-9da641c0b3a9',0,3629800,NULL,NULL,'Yalla Vasanth','Payment receipt',1,NOW(),1),
('24a3f9ce-65e9-4f3a-ae37-f58e20a7c8e3','cb77219d-f510-4d07-9a2a-6613de4334a2','23d1cabd-e89f-4bd8-a208-91f59c3898c2',500,0,NULL,NULL,'Yalla Vasanth','Payment receipt',1,NOW(),1),
('c1fccad3-46fe-4ac7-a0cf-46b1b6de3e50','cb77219d-f510-4d07-9a2a-6613de4334a2','2338b755-93d5-4aef-bb3c-9da641c0b3a9',0,500,NULL,NULL,'Yalla Vasanth','Payment receipt',1,NOW(),1),
('8285cd24-667f-4803-b269-714a10c52765','9d19c831-edab-4136-a7a0-ebed68920fba','23d1cabd-e89f-4bd8-a208-91f59c3898c2',799500,0,NULL,NULL,'Yalla Vasanth','Payment receipt',1,NOW(),1),
('f9627eae-2873-4d8e-b7b9-ee581e427075','9d19c831-edab-4136-a7a0-ebed68920fba','2338b755-93d5-4aef-bb3c-9da641c0b3a9',0,799500,NULL,NULL,'Yalla Vasanth','Payment receipt',1,NOW(),1),
('46d2a193-2388-41d5-97e9-08160f01d43a','58b5e990-6058-4e61-8199-174869c399fb','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2830000,0,NULL,NULL,'Yalla Vasanth','Payment receipt',1,NOW(),1),
('99c38057-402f-44e6-aafc-26d8b6e77afa','58b5e990-6058-4e61-8199-174869c399fb','2338b755-93d5-4aef-bb3c-9da641c0b3a9',0,2830000,NULL,NULL,'Yalla Vasanth','Payment receipt',1,NOW(),1);

-- ======= Yelleti Santoshi =======
UPDATE payment_evidence SET parent_payment_id = NULL WHERE id IN ('1a498769-d546-4514-956c-8528d9650153','4f46d196-3161-48d3-878d-09364403378b','93539e0f-974c-4e4f-887c-0c98b6330456','c714fc17-0f49-435a-ad53-6a9a0dd797ed','e6b41107-5129-474d-ab2f-dfee68e6995a','8672a4e9-cd2e-49c4-879a-a7f49a617d33','e2a0c87a-200e-495d-ac43-77eb1682b1b1');
DELETE FROM journal_lines WHERE journal_id IN ('9abfc267-2518-49d8-a28f-8d318688d196','d76d9dbc-89a0-478a-9deb-b2d75e532f32','6201f6d4-f39f-4628-a778-3996022a401f','f86e4b37-769b-4b79-8091-91a55c22e306');
DELETE FROM journal_entries WHERE id IN ('9abfc267-2518-49d8-a28f-8d318688d196','d76d9dbc-89a0-478a-9deb-b2d75e532f32','6201f6d4-f39f-4628-a778-3996022a401f','f86e4b37-769b-4b79-8091-91a55c22e306');
DELETE FROM invoice_payments WHERE id IN ('169079c7-fe8a-477c-b41f-a8e6eb481456','037b436f-2c12-43e0-bd09-73290b132db5','0ac225e9-04d2-4004-bcf4-53bc215cce1c','ea083710-72ea-47ad-b428-5ea19763e53e');
INSERT INTO invoice_payments (id,invoice_id,payment_date,amount,payment_method,payment_type,reference_number,record_status,tenant_id,created_at,updated_at) VALUES
('fc5efc03-71f7-4c3c-bceb-ef46afdd4994','6ad1d88b-55df-443d-957f-e3d48ab89898','2025-03-15',2000000,'cash','received','VY-9-A',1,1,NOW(),NOW()),
('2e113fab-aff6-4801-98f3-57a7fa5c84a1','6ad1d88b-55df-443d-957f-e3d48ab89898','2025-04-05',1300000,'cash','received','VY-9-B',1,1,NOW(),NOW()),
('37860891-ceb8-4baa-ade6-f80b5deeae48','6ad1d88b-55df-443d-957f-e3d48ab89898','2025-04-22',1239900,'cash','received','VY-9-C',1,1,NOW(),NOW()),
('5466dd1c-1f9c-4eb1-9c63-2d839a74b9e0','35c7ee99-1a04-4c3a-8818-d1f28b68140a','2025-04-22',100,'cash','received','VY-128-A',1,1,NOW(),NOW()),
('01582407-98bc-42f4-a51f-eba2c0f52b0f','35c7ee99-1a04-4c3a-8818-d1f28b68140a','2025-05-29',860000,'cash','received','VY-128-B',1,1,NOW(),NOW()),
('2f6a4992-e793-49bb-94cd-b9e8b4c24054','35c7ee99-1a04-4c3a-8818-d1f28b68140a','2025-05-31',2600,'cash','received','VY-128-C',1,1,NOW(),NOW()),
('42e2293a-15f4-426c-9f20-f71cc2bff5c1','35c7ee99-1a04-4c3a-8818-d1f28b68140a','2025-07-12',2010000,'cash','received','VY-128-D',1,1,NOW(),NOW()),
('38f71d90-03fc-4bb0-86e5-95794b7e8a98','35c7ee99-1a04-4c3a-8818-d1f28b68140a','2025-07-18',589900,'cash','received','VY-128-E',1,1,NOW(),NOW()),
('82db3113-d212-459d-bee7-87a8d7b13da7','526ad338-74b1-4b63-9b76-ac182b598396','2025-07-18',685100,'cash','received','VY-178-A',1,1,NOW(),NOW());
INSERT INTO journal_entries (id,journal_number,journal_date,source_type,source_id,description,status,is_auto_generated,total_debit,total_credit,record_status,tenant_id,created_at,updated_at) VALUES
('49d8df86-4c2b-46a5-bcfb-8ff874a6b036','JRN-20261003-0296','2025-03-15','payment','fc5efc03-71f7-4c3c-bceb-ef46afdd4994','Payment from Yelleti Santoshi - VY-9-A','posted',1,2000000,2000000,1,1,NOW(),NOW()),
('03c8172c-c3d4-49af-a1de-ddd37f0ddded','JRN-20261003-0297','2025-04-05','payment','2e113fab-aff6-4801-98f3-57a7fa5c84a1','Payment from Yelleti Santoshi - VY-9-B','posted',1,1300000,1300000,1,1,NOW(),NOW()),
('36502e2f-cb9d-4831-983d-1e6762b60bb1','JRN-20261003-0298','2025-04-22','payment','37860891-ceb8-4baa-ade6-f80b5deeae48','Payment from Yelleti Santoshi - VY-9-C','posted',1,1239900,1239900,1,1,NOW(),NOW()),
('801e6377-d09e-4823-bf91-8e8d5441563f','JRN-20261003-0299','2025-04-22','payment','5466dd1c-1f9c-4eb1-9c63-2d839a74b9e0','Payment from Yelleti Santoshi - VY-128-A','posted',1,100,100,1,1,NOW(),NOW()),
('7ffe6cc3-4535-4ad8-969d-49d00f4a660d','JRN-20261003-0300','2025-05-29','payment','01582407-98bc-42f4-a51f-eba2c0f52b0f','Payment from Yelleti Santoshi - VY-128-B','posted',1,860000,860000,1,1,NOW(),NOW()),
('350c023e-9a2e-4026-be32-7666f4edf6d5','JRN-20261003-0301','2025-05-31','payment','2f6a4992-e793-49bb-94cd-b9e8b4c24054','Payment from Yelleti Santoshi - VY-128-C','posted',1,2600,2600,1,1,NOW(),NOW()),
('c2707e6c-2e0b-4a4e-9913-16881c90dd80','JRN-20261003-0302','2025-07-12','payment','42e2293a-15f4-426c-9f20-f71cc2bff5c1','Payment from Yelleti Santoshi - VY-128-D','posted',1,2010000,2010000,1,1,NOW(),NOW()),
('404248d6-0f24-4917-88d1-0cbb8b839a23','JRN-20261003-0303','2025-07-18','payment','38f71d90-03fc-4bb0-86e5-95794b7e8a98','Payment from Yelleti Santoshi - VY-128-E','posted',1,589900,589900,1,1,NOW(),NOW()),
('e614ffb1-9288-4a5e-a466-5f51656a0ecb','JRN-20261003-0304','2025-07-18','payment','82db3113-d212-459d-bee7-87a8d7b13da7','Payment from Yelleti Santoshi - VY-178-A','posted',1,685100,685100,1,1,NOW(),NOW());
INSERT INTO journal_lines (id,journal_id,account_id,debit,credit,party_type,party_id,party_name,memo,record_status,created_at,tenant_id) VALUES
('4118d163-7199-410f-8653-c00d189a8584','49d8df86-4c2b-46a5-bcfb-8ff874a6b036','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2000000,0,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('367c2e56-1208-4a85-9b47-db33cc98dae8','49d8df86-4c2b-46a5-bcfb-8ff874a6b036','9beb46ee-9954-4631-9ea5-f44cadfe9abb',0,2000000,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('2c3ffbad-5d04-4d18-a1a3-1d8824dd7af2','03c8172c-c3d4-49af-a1de-ddd37f0ddded','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1300000,0,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('98b17e87-7997-4f30-a135-e6b08e697301','03c8172c-c3d4-49af-a1de-ddd37f0ddded','9beb46ee-9954-4631-9ea5-f44cadfe9abb',0,1300000,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('f171505a-5d92-478f-ad34-16bde5425ce5','36502e2f-cb9d-4831-983d-1e6762b60bb1','23d1cabd-e89f-4bd8-a208-91f59c3898c2',1239900,0,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('7c4a6d56-ab01-491c-9e65-b5270604f636','36502e2f-cb9d-4831-983d-1e6762b60bb1','9beb46ee-9954-4631-9ea5-f44cadfe9abb',0,1239900,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('eac5a9de-58ed-404e-9277-927ff16d8f8f','801e6377-d09e-4823-bf91-8e8d5441563f','23d1cabd-e89f-4bd8-a208-91f59c3898c2',100,0,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('99172308-31c8-4177-89ef-c987ddf60e14','801e6377-d09e-4823-bf91-8e8d5441563f','9beb46ee-9954-4631-9ea5-f44cadfe9abb',0,100,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('aece817c-bc24-42bb-9b22-eeb1ab0928eb','7ffe6cc3-4535-4ad8-969d-49d00f4a660d','23d1cabd-e89f-4bd8-a208-91f59c3898c2',860000,0,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('94b517d0-a3ce-481a-97de-294d0a8bf29b','7ffe6cc3-4535-4ad8-969d-49d00f4a660d','9beb46ee-9954-4631-9ea5-f44cadfe9abb',0,860000,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('8c0c43dc-340f-4bbd-95f5-68fb8eaf97a8','350c023e-9a2e-4026-be32-7666f4edf6d5','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2600,0,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('cdf801d0-af85-4a71-a01b-c87f7292b41a','350c023e-9a2e-4026-be32-7666f4edf6d5','9beb46ee-9954-4631-9ea5-f44cadfe9abb',0,2600,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('23f57f6b-d80e-4846-a16c-dcfa8e92d4aa','c2707e6c-2e0b-4a4e-9913-16881c90dd80','23d1cabd-e89f-4bd8-a208-91f59c3898c2',2010000,0,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('3fec08e2-63b6-45f4-81d9-0e1a7eae3797','c2707e6c-2e0b-4a4e-9913-16881c90dd80','9beb46ee-9954-4631-9ea5-f44cadfe9abb',0,2010000,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('b8264864-62f1-4dd0-8d60-04c585640990','404248d6-0f24-4917-88d1-0cbb8b839a23','23d1cabd-e89f-4bd8-a208-91f59c3898c2',589900,0,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('ba56a0f5-1e6f-4114-bcd4-8c5ba6d6fda7','404248d6-0f24-4917-88d1-0cbb8b839a23','9beb46ee-9954-4631-9ea5-f44cadfe9abb',0,589900,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('7613ee92-c02a-4e7e-b7c9-3bb63750c6ce','e614ffb1-9288-4a5e-a466-5f51656a0ecb','23d1cabd-e89f-4bd8-a208-91f59c3898c2',685100,0,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1),
('2c0a7b56-c682-445d-8307-6e08bf915afb','e614ffb1-9288-4a5e-a466-5f51656a0ecb','9beb46ee-9954-4631-9ea5-f44cadfe9abb',0,685100,NULL,NULL,'Yelleti Santoshi','Payment receipt',1,NOW(),1);

COMMIT;