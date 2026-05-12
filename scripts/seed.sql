-- Clear existing data (optional)
-- DELETE FROM task_events;
-- DELETE FROM tasks;
-- DELETE FROM task_statuses;
-- DELETE FROM users;

-- 1. Insert users
INSERT INTO users (id, name, email, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Alice Smith', 'alice@example.com', NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'Bob Johnson', 'bob@example.com', NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 'Carol White', 'carol@example.com', NOW()),
  ('550e8400-e29b-41d4-a716-446655440004', 'David Brown', 'david@example.com', NOW())
ON CONFLICT DO NOTHING;

-- 2. Insert task statuses
INSERT INTO task_statuses (id, code, name, sort_order, is_terminal, color) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', 'pending', '未着手', 1, false, '#FFC107'),
  ('650e8400-e29b-41d4-a716-446655440002', 'in-progress', '進行中', 2, false, '#2196F3'),
  ('650e8400-e29b-41d4-a716-446655440003', 'completed', '完了', 3, true, '#4CAF50'),
  ('650e8400-e29b-41d4-a716-446655440004', 'archived', 'アーカイブ', 4, true, '#9E9E9E')
ON CONFLICT DO NOTHING;

-- 3. Insert tasks
INSERT INTO tasks (id, title, description, current_status_id, assigned_to, due_date, created_at, updated_at, closed_at, is_deleted) VALUES
  ('750e8400-e29b-41d4-a716-446655440001', 'API Server ダッシュボード実装', 'Project① 用ダッシュボード統計エンドポイント', '650e8400-e29b-41d4-a716-446655440003', 'alice@example.com', '2026-04-18', NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', false),
  ('750e8400-e29b-41d4-a716-446655440002', 'JWT 認証実装', 'Access Token / Refresh Token 機能', '650e8400-e29b-41d4-a716-446655440003', 'bob@example.com', '2026-04-15', NOW() - INTERVAL '25 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', false),
  ('750e8400-e29b-41d4-a716-446655440003', 'Rate Limiting 実装', 'DoS 対策、リクエスト制限', '650e8400-e29b-41d4-a716-446655440001', 'carol@example.com', '2026-05-20', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', null, false),
  ('750e8400-e29b-41d4-a716-446655440004', 'データベーススキーマ設計', 'users, tasks, task_statuses, task_events テーブル設計', '650e8400-e29b-41d4-a716-446655440003', 'david@example.com', '2026-04-10', NOW() - INTERVAL '30 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', false),
  ('750e8400-e29b-41d4-a716-446655440005', 'CORS 設定', 'Project①③④⑤ のドメイン許可', '650e8400-e29b-41d4-a716-446655440002', 'alice@example.com', '2026-05-15', NOW() - INTERVAL '7 days', NOW(), null, false),
  ('750e8400-e29b-41d4-a716-446655440006', 'テストスイート作成', 'Jest による API テスト', '650e8400-e29b-41d4-a716-446655440001', 'bob@example.com', '2026-05-25', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', null, false),
  ('750e8400-e29b-41d4-a716-446655440007', 'Swagger ドキュメント更新', 'OpenAPI 3.0.0 スペック最新化', '650e8400-e29b-41d4-a716-446655440002', 'carol@example.com', '2026-05-18', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days', null, false),
  ('750e8400-e29b-41d4-a716-446655440008', 'Project③ 知識DB 統合', 'pgvector と AI検索の連携', '650e8400-e29b-41d4-a716-446655440001', 'david@example.com', '2026-06-01', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', null, false),
  ('750e8400-e29b-41d4-a716-446655440009', 'エラーハンドリング改善', '統一エラーレスポンス形式', '650e8400-e29b-41d4-a716-446655440003', 'alice@example.com', '2026-04-25', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', false),
  ('750e8400-e29b-41d4-a716-446655440010', 'ロール管理（RBAC）実装', 'admin / editor / viewer の権限分離', '650e8400-e29b-41d4-a716-446655440001', 'bob@example.com', '2026-05-30', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', null, false)
ON CONFLICT DO NOTHING;

-- 4. Insert task events
INSERT INTO task_events (id, task_id, from_status_id, to_status_id, changed_by, occurred_at) VALUES
  ('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', 'alice@example.com', NOW() - INTERVAL '18 days'),
  ('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440003', 'alice@example.com', NOW() - INTERVAL '1 day'),
  ('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', 'bob@example.com', NOW() - INTERVAL '24 days'),
  ('850e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440003', 'bob@example.com', NOW() - INTERVAL '5 days'),
  ('850e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', 'david@example.com', NOW() - INTERVAL '28 days'),
  ('850e8400-e29b-41d4-a716-446655440006', '750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440003', 'david@example.com', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;
