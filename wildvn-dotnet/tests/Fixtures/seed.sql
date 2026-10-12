-- SYNTHETIC TEST DATA ONLY. No production rows, OAuth credentials or service URLs.
-- Argon2id test password: wildvn-fixture-password; deterministic salt: wildvn-fixture-salt.
-- Generated offline with libargon2, m=65536,t=3,p=1; interoperability is a T07 check.

INSERT INTO taxonomy(id,parent_id,rank,scientific_name,name_vn,created_at,updated_at) VALUES
('10000000-0000-0000-0000-000000000001',NULL,'FAMILY','Bovidae','Họ Trâu bò','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z'),
('10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','GENUS','Pseudoryx','Chi Sao la','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z');

INSERT INTO ecosystems(id,name,slug,description,gallery_urls,species_count,created_at,updated_at) VALUES
('30000000-0000-0000-0000-000000000001','Rừng thử nghiệm','fixture-forest','Dữ liệu giả lập','["https://example.invalid/fixture/forest.webp"]',3,'2026-10-09T00:00:00Z','2026-10-09T00:00:00Z'),
('30000000-0000-0000-0000-000000000002','Đất ngập nước thử nghiệm','fixture-wetland','Dữ liệu giả lập','legacy non-JSON gallery',1,'2026-10-09T00:00:00Z','2026-10-09T00:00:00Z');

INSERT INTO species(id,taxonomy_id,ecosystem_id,slug,scientific_name,name_vn,name_en,synonyms,diet_type,habitat_type,
 conservation_status,publish_status,source_references,is_featured,gallery_urls,created_at,updated_at,deleted_at) VALUES
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001',
 'fixture-sao-la','Pseudoryx fixture','Sao la thử nghiệm','Synthetic saola',ARRAY['Tên đồng nghĩa','Fixture synonym'],'HERBIVORE',
 ARRAY['TERRESTRIAL','CANOPY']::"HabitatType"[],'CR','PUBLISHED','[{"title":"Nguồn thử nghiệm","url":"https://example.invalid/source"}]',true,
 '["https://example.invalid/fixture/saola.webp"]','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z',NULL),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',
 'fixture-published','Pseudoryx second','Loài công bố thử nghiệm',NULL,ARRAY[]::TEXT[],'HERBIVORE',
 ARRAY['FRESHWATER']::"HabitatType"[],'LC','PUBLISHED','[]',false,NULL,'2026-10-09T00:00:00Z','2026-10-09T00:00:00Z',NULL),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001',
 'fixture-draft','Pseudoryx draft','Bản nháp thử nghiệm',NULL,ARRAY[]::TEXT[],NULL,
 ARRAY[]::"HabitatType"[],'UNKNOWN_LEGACY','DRAFT','[]',false,'legacy malformed gallery',
 '2026-10-09T00:00:00Z','2026-10-09T00:00:00Z',NULL),
('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001',
 'fixture-deleted','Pseudoryx deleted','Loài xóa mềm thử nghiệm',NULL,ARRAY[]::TEXT[],NULL,
 ARRAY[]::"HabitatType"[],'DD','ARCHIVED','[]',false,NULL,'2026-10-09T00:00:00Z','2026-10-09T00:00:00Z','2026-10-09T01:00:00Z');

INSERT INTO species_media(id,species_id,type,url,caption,is_primary,created_at,updated_at) VALUES
('60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','IMAGE','https://example.invalid/fixture/saola.webp','Ảnh thử nghiệm',true,'2026-10-09T00:00:00Z','2026-10-09T00:00:00Z'),
('60000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','VIDEO','https://example.invalid/fixture/saola.mp4','Video thử nghiệm',false,'2026-10-09T00:00:00Z','2026-10-09T00:00:00Z'),
('60000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','AUDIO','https://example.invalid/fixture/saola.wav','Âm thanh thử nghiệm',false,'2026-10-09T00:00:00Z','2026-10-09T00:00:00Z');

INSERT INTO locations(id,name,type,slug,gallery_urls,created_at,updated_at) VALUES
('70000000-0000-0000-0000-000000000001','Vườn thử nghiệm','NATIONAL_PARK','fixture-park','["https://example.invalid/fixture/park.webp"]','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z');
INSERT INTO species_locations(species_id,location_id,distribution_type,created_at) VALUES
('20000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','ENDEMIC','2026-10-09T00:00:00Z');
INSERT INTO conservation_history(id,species_id,old_status,new_status,changed_at,source,created_at) VALUES
('80000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','EN','CR','2026-10-09','Synthetic reference','2026-10-09T00:00:00Z');

INSERT INTO users(id,username,email,password_hash,auth_provider,provider_id,role,created_at,updated_at,deleted_at) VALUES
('40000000-0000-0000-0000-000000000001','fixture-reader','reader@example.invalid',
 '$argon2id$v=19$m=65536,t=3,p=1$d2lsZHZuLWZpeHR1cmUtc2FsdA$3I1qs16UbZtOH58dJz6DDZf16+WGetsEr+wrLVjrFRw','LOCAL',NULL,'USER','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z',NULL),
('40000000-0000-0000-0000-000000000002','fixture-oauth','oauth@example.invalid',NULL,'GOOGLE','synthetic-provider-subject','USER','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z',NULL),
('40000000-0000-0000-0000-000000000003','fixture-deleted','deleted@example.invalid',NULL,'FACEBOOK','synthetic-deleted-subject','ADMIN','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z','2026-10-09T01:00:00Z');
INSERT INTO user_profiles(id,user_id,bio,headphone_preference,created_at,updated_at) VALUES
('90000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Tài khoản giả lập',true,'2026-10-09T00:00:00Z','2026-10-09T00:00:00Z');

-- Legacy services use username strings; schema permits unlinked username keys.
INSERT INTO user_favorites(user_id,species_id,created_at) VALUES
('fixture-reader','20000000-0000-0000-0000-000000000001','2026-10-09T00:00:00Z'),
('fixture-legacy-unlinked','20000000-0000-0000-0000-000000000003','2026-10-09T00:00:00Z');
INSERT INTO academy_progress(user_id,rp_points,streak_days,unlocked_species,completed_expeditions,last_active_date,created_at,updated_at) VALUES
('fixture-reader',120,2,'["20000000-0000-0000-0000-000000000001"]','["legacy-fixture-expedition"]','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z'),
('fixture-legacy-unlinked',0,0,'{"legacyMalformed":true}','[]','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z');

INSERT INTO chat_sessions(id,user_id,created_at,updated_at,expires_at) VALUES
('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z','2026-10-14T00:00:00Z'),
('50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','2026-10-01T00:00:00Z','2026-10-01T00:00:00Z','2026-10-06T00:00:00Z');
INSERT INTO chat_messages(id,session_id,role,content,created_at) VALUES
('a0000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','user','Loài thử nghiệm tại Việt Nam','2026-10-09T00:00:00Z'),
('a0000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','assistant','Phản hồi giả lập, không gọi model','2026-10-09T00:00:01Z'),
('a0000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000002','user','Expired fixture question','2026-10-01T00:00:00Z'),
('a0000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000002','assistant','Expired fixture answer','2026-10-01T00:00:01Z');

INSERT INTO ranks(id,name,name_vn,slug,min_xp,max_xp,sort_order,created_at) VALUES
('b0000000-0000-0000-0000-000000000001','Fixture Reader','Người đọc thử nghiệm','fixture-reader',0,100,1,'2026-10-09T00:00:00Z');
INSERT INTO user_sessions(id,user_id,refresh_token_hash,device_info,ip_address,created_at,expires_at) VALUES
('c0000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','synthetic-non-token-hash','{"fixture":true}','192.0.2.1','2026-10-09T00:00:00Z','2026-10-10T00:00:00Z');
INSERT INTO sync_failures(id,entity_id,entity_type,error_message,target,created_at,updated_at) VALUES
('d0000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','species','Synthetic failure for fixture','ELASTICSEARCH','2026-10-09T00:00:00Z','2026-10-09T00:00:00Z');
INSERT INTO search_suggestions_popularity(query,search_count,click_count,updated_at) VALUES
('fixture-query',3,1,'2026-10-09T00:00:00Z');
INSERT INTO user_affinities(entity_type,entity_value,user_id,score,updated_at) VALUES
('species','fixture-sao-la','40000000-0000-0000-0000-000000000001',0.2500,'2026-10-09T00:00:00Z');
