import dashboardService from '../services/dashboardService.js';
import APIResponse from '../utils/response.js';

class DashboardController {
  async getStats(req, res, next) {
    try {
      const stats = await dashboardService.getStats();
      res.json(APIResponse.success(stats));
    } catch (err) {
      next(err);
    }
  }
}

export default new DashboardController();
