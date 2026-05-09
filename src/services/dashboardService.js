import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

class DashboardService {
  async getStats() {
    const { data: tasks, count } = await supabase
      .from('tasks')
      .select('*, task_statuses(id, is_terminal)', { count: 'exact' })
      .eq('is_deleted', false);

    const completedTasks = tasks.filter(t => t.task_statuses?.is_terminal);
    const completedCount = completedTasks.length;

    const leadTimes = tasks
      .filter(t => t.created_at && t.closed_at)
      .map(t => {
        const created = new Date(t.created_at);
        const closed = new Date(t.closed_at);
        return (closed - created) / (24 * 60 * 60 * 1000);
      });

    const avgLeadTime = leadTimes.length
      ? (leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(1)
      : 0;

    const { data: statuses } = await supabase
      .from('task_statuses')
      .select('*')
      .order('sort_order');

    const tasksByStatus = {};
    for (const status of statuses) {
      tasksByStatus[status.name] = tasks.filter(t => t.current_status_id === status.id).length;
    }

    return {
      total_tasks: count || 0,
      completed_tasks: completedCount,
      completion_rate: count > 0 ? ((completedCount / count) * 100).toFixed(1) : 0,
      average_lead_time_days: avgLeadTime,
      tasks_by_status: tasksByStatus
    };
  }
}

export default new DashboardService();
