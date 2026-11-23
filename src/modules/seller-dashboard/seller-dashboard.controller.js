import { sendSuccess } from '../../shared/utils/response.js';
import { sellerDashboardService } from './seller-dashboard.service.js';

export const sellerDashboardController = {
  async getOverview(req, res, next) {
    try {
      const data = await sellerDashboardService.getOverview(req.user.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Ringkasan dashboard seller berhasil diambil',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },
};
