-- 1. Chèn dữ liệu phân loại (Taxonomy) - Bắt buộc để làm Foreign Key
INSERT INTO taxonomy (id, rank, scientific_name, name_vn, created_at, updated_at) 
VALUES 
  ('11111111-0000-0000-0000-000000000001', 'GENUS', 'Panthera', 'Chi Báo', NOW(), NOW()),
  ('11111111-0000-0000-0000-000000000002', 'GENUS', 'Elephas', 'Chi Voi', NOW(), NOW()),
  ('11111111-0000-0000-0000-000000000003', 'GENUS', 'Rafetus', 'Chi Rùa', NOW(), NOW()),
  ('11111111-0000-0000-0000-000000000004', 'GENUS', 'Antigone', 'Chi Sếu', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 2. Chèn dữ liệu loài (Species)
INSERT INTO species (
  id, taxonomy_id, slug, scientific_name, name_vn, conservation_status, 
  identification_desc, name, category, habitat, thumbnail_url, is_featured, created_at, updated_at
) 
VALUES 
  (
    '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 
    'ho-ong-duong', 'Panthera tigris corbetti', 'Hổ Đông Dương', 'EN', 
    'Phân loài hổ bản địa Đông Nam Á, có kích thước nhỏ và tối màu hơn hổ Bengal. Số lượng ngoài tự nhiên cực kỳ hiếm.', 
    'Hổ Đông Dương', 'Động vật có vú', 'Rừng nhiệt đới', 
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Indochinese_tiger.jpg/800px-Indochinese_tiger.jpg', true, NOW(), NOW()
  ),
  (
    '22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 
    'voi-chau-a', 'Elephas maximus', 'Voi Châu Á', 'EN', 
    'Loài voi duy nhất còn tồn tại ở Châu Á, phân bố rải rác ở Tây Nguyên và một số tỉnh miền Trung Việt Nam.', 
    'Voi Châu Á', 'Động vật có vú', 'Rừng thường xanh', 
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Asian_Elephant_in_Bandipur.jpg/800px-Asian_Elephant_in_Bandipur.jpg', true, NOW(), NOW()
  ),
  (
    '22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 
    'rua-hoan-kiem', 'Rafetus swinhoei', 'Rùa Hoàn Kiếm', 'CR', 
    'Loài rùa mai mềm khổng lồ vô cùng nguy cấp, gắn liền với truyền thuyết lịch sử thiêng liêng ở Hồ Gươm.', 
    'Rùa Hoàn Kiếm', 'Bò sát', 'Sông hồ nước ngọt', 
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Rafetus_swinhoei_01.jpg/800px-Rafetus_swinhoei_01.jpg', true, NOW(), NOW()
  ),
  (
    '22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 
    'seu-dau-do', 'Antigone antigone', 'Sếu Đầu Đỏ', 'VU', 
    'Loài chim bay được cao nhất thế giới, từng thường xuyên di cư về Vườn quốc gia Tràm Chim (Đồng Tháp) vào mùa khô.', 
    'Sếu Đầu Đỏ', 'Chim', 'Đầm lầy ngập nước', 
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Sarus_Crane.jpg/800px-Sarus_Crane.jpg', true, NOW(), NOW()
  )
ON CONFLICT DO NOTHING;
