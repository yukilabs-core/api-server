import { createClient } from '@supabase/supabase-js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Load .env file
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key] = value;
});

const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_KEY
);

async function seed() {
  try {
    console.log('🌱 Seeding test data...\n');

    // 1. Clear existing data (optional - comment out if you want to keep existing data)
    // await supabase.from('task_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // await supabase.from('task_statuses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Create users
    console.log('📝 Creating users...');
    const users = [
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Alice Smith', email: 'alice@example.com' },
      { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Bob Johnson', email: 'bob@example.com' },
      { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Carol White', email: 'carol@example.com' },
      { id: '550e8400-e29b-41d4-a716-446655440004', name: 'David Brown', email: 'david@example.com' },
    ];

    const { error: userError } = await supabase
      .from('users')
      .insert(users)
      .select();

    if (userError && !userError.message.includes('duplicate')) {
      throw userError;
    }
    console.log(`✅ Created ${users.length} users\n`);

    // 3. Create task statuses
    console.log('📋 Creating task statuses...');
    const statuses = [
      {
        id: '650e8400-e29b-41d4-a716-446655440001',
        code: 'pending',
        name: '未着手',
        sort_order: 1,
        is_terminal: false,
        color: '#FFC107',
      },
      {
        id: '650e8400-e29b-41d4-a716-446655440002',
        code: 'in-progress',
        name: '進行中',
        sort_order: 2,
        is_terminal: false,
        color: '#2196F3',
      },
      {
        id: '650e8400-e29b-41d4-a716-446655440003',
        code: 'completed',
        name: '完了',
        sort_order: 3,
        is_terminal: true,
        color: '#4CAF50',
      },
      {
        id: '650e8400-e29b-41d4-a716-446655440004',
        code: 'archived',
        name: 'アーカイブ',
        sort_order: 4,
        is_terminal: true,
        color: '#9E9E9E',
      },
    ];

    const { error: statusError } = await supabase
      .from('task_statuses')
      .insert(statuses)
      .select();

    if (statusError && !statusError.message.includes('duplicate')) {
      throw statusError;
    }
    console.log(`✅ Created ${statuses.length} statuses\n`);

    // 4. Create tasks
    console.log('🎯 Creating tasks...');
    const now = new Date().toISOString();
    const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const tasks = [
      {
        id: '750e8400-e29b-41d4-a716-446655440001',
        title: 'API Server ダッシュボード実装',
        description: 'Project① 用ダッシュボード統計エンドポイント',
        current_status_id: '650e8400-e29b-41d4-a716-446655440003',
        assigned_to: 'alice@example.com',
        due_date: '2026-04-18',
        created_at: daysAgo(20),
        updated_at: daysAgo(1),
        closed_at: daysAgo(1),
        is_deleted: false,
      },
      {
        id: '750e8400-e29b-41d4-a716-446655440002',
        title: 'JWT 認証実装',
        description: 'Access Token / Refresh Token 機能',
        current_status_id: '650e8400-e29b-41d4-a716-446655440003',
        assigned_to: 'bob@example.com',
        due_date: '2026-04-15',
        created_at: daysAgo(25),
        updated_at: daysAgo(5),
        closed_at: daysAgo(5),
        is_deleted: false,
      },
      {
        id: '750e8400-e29b-41d4-a716-446655440003',
        title: 'Rate Limiting 実装',
        description: 'DoS 対策、リクエスト制限',
        current_status_id: '650e8400-e29b-41d4-a716-446655440001',
        assigned_to: 'carol@example.com',
        due_date: '2026-05-20',
        created_at: daysAgo(5),
        updated_at: daysAgo(3),
        closed_at: null,
        is_deleted: false,
      },
      {
        id: '750e8400-e29b-41d4-a716-446655440004',
        title: 'データベーススキーマ設計',
        description: 'users, tasks, task_statuses, task_events テーブル設計',
        current_status_id: '650e8400-e29b-41d4-a716-446655440003',
        assigned_to: 'david@example.com',
        due_date: '2026-04-10',
        created_at: daysAgo(30),
        updated_at: daysAgo(10),
        closed_at: daysAgo(10),
        is_deleted: false,
      },
      {
        id: '750e8400-e29b-41d4-a716-446655440005',
        title: 'CORS 設定',
        description: 'Project①③④⑤ のドメイン許可',
        current_status_id: '650e8400-e29b-41d4-a716-446655440002',
        assigned_to: 'alice@example.com',
        due_date: '2026-05-15',
        created_at: daysAgo(7),
        updated_at: now,
        closed_at: null,
        is_deleted: false,
      },
      {
        id: '750e8400-e29b-41d4-a716-446655440006',
        title: 'テストスイート作成',
        description: 'Jest による API テスト',
        current_status_id: '650e8400-e29b-41d4-a716-446655440001',
        assigned_to: 'bob@example.com',
        due_date: '2026-05-25',
        created_at: daysAgo(3),
        updated_at: daysAgo(3),
        closed_at: null,
        is_deleted: false,
      },
      {
        id: '750e8400-e29b-41d4-a716-446655440007',
        title: 'Swagger ドキュメント更新',
        description: 'OpenAPI 3.0.0 スペック最新化',
        current_status_id: '650e8400-e29b-41d4-a716-446655440002',
        assigned_to: 'carol@example.com',
        due_date: '2026-05-18',
        created_at: daysAgo(5),
        updated_at: daysAgo(2),
        closed_at: null,
        is_deleted: false,
      },
      {
        id: '750e8400-e29b-41d4-a716-446655440008',
        title: 'Project③ 知識DB 統合',
        description: 'pgvector と AI検索の連携',
        current_status_id: '650e8400-e29b-41d4-a716-446655440001',
        assigned_to: 'david@example.com',
        due_date: '2026-06-01',
        created_at: daysAgo(2),
        updated_at: daysAgo(2),
        closed_at: null,
        is_deleted: false,
      },
      {
        id: '750e8400-e29b-41d4-a716-446655440009',
        title: 'エラーハンドリング改善',
        description: '統一エラーレスポンス形式',
        current_status_id: '650e8400-e29b-41d4-a716-446655440003',
        assigned_to: 'alice@example.com',
        due_date: '2026-04-25',
        created_at: daysAgo(15),
        updated_at: daysAgo(2),
        closed_at: daysAgo(2),
        is_deleted: false,
      },
      {
        id: '750e8400-e29b-41d4-a716-446655440010',
        title: 'ロール管理（RBAC）実装',
        description: 'admin / editor / viewer の権限分離',
        current_status_id: '650e8400-e29b-41d4-a716-446655440001',
        assigned_to: 'bob@example.com',
        due_date: '2026-05-30',
        created_at: daysAgo(4),
        updated_at: daysAgo(4),
        closed_at: null,
        is_deleted: false,
      },
    ];

    const { error: taskError } = await supabase
      .from('tasks')
      .insert(tasks)
      .select();

    if (taskError && !taskError.message.includes('duplicate')) {
      throw taskError;
    }
    console.log(`✅ Created ${tasks.length} tasks\n`);

    // 5. Create task events (status transitions)
    console.log('📊 Creating task events...');
    const events = [
      {
        id: '850e8400-e29b-41d4-a716-446655440001',
        task_id: '750e8400-e29b-41d4-a716-446655440001',
        from_status_id: '650e8400-e29b-41d4-a716-446655440001',
        to_status_id: '650e8400-e29b-41d4-a716-446655440002',
        changed_by: 'alice@example.com',
        occurred_at: daysAgo(18),
      },
      {
        id: '850e8400-e29b-41d4-a716-446655440002',
        task_id: '750e8400-e29b-41d4-a716-446655440001',
        from_status_id: '650e8400-e29b-41d4-a716-446655440002',
        to_status_id: '650e8400-e29b-41d4-a716-446655440003',
        changed_by: 'alice@example.com',
        occurred_at: daysAgo(1),
      },
      {
        id: '850e8400-e29b-41d4-a716-446655440003',
        task_id: '750e8400-e29b-41d4-a716-446655440002',
        from_status_id: '650e8400-e29b-41d4-a716-446655440001',
        to_status_id: '650e8400-e29b-41d4-a716-446655440002',
        changed_by: 'bob@example.com',
        occurred_at: daysAgo(24),
      },
      {
        id: '850e8400-e29b-41d4-a716-446655440004',
        task_id: '750e8400-e29b-41d4-a716-446655440002',
        from_status_id: '650e8400-e29b-41d4-a716-446655440002',
        to_status_id: '650e8400-e29b-41d4-a716-446655440003',
        changed_by: 'bob@example.com',
        occurred_at: daysAgo(5),
      },
      {
        id: '850e8400-e29b-41d4-a716-446655440005',
        task_id: '750e8400-e29b-41d4-a716-446655440004',
        from_status_id: '650e8400-e29b-41d4-a716-446655440001',
        to_status_id: '650e8400-e29b-41d4-a716-446655440002',
        changed_by: 'david@example.com',
        occurred_at: daysAgo(28),
      },
      {
        id: '850e8400-e29b-41d4-a716-446655440006',
        task_id: '750e8400-e29b-41d4-a716-446655440004',
        from_status_id: '650e8400-e29b-41d4-a716-446655440002',
        to_status_id: '650e8400-e29b-41d4-a716-446655440003',
        changed_by: 'david@example.com',
        occurred_at: daysAgo(10),
      },
    ];

    const { error: eventError } = await supabase
      .from('task_events')
      .insert(events)
      .select();

    if (eventError && !eventError.message.includes('duplicate')) {
      throw eventError;
    }
    console.log(`✅ Created ${events.length} task events\n`);

    console.log('🎉 Seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Task Statuses: ${statuses.length}`);
    console.log(`   - Tasks: ${tasks.length}`);
    console.log(`   - Task Events: ${events.length}`);
    console.log('\n✨ Ready for testing!');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

await seed();
