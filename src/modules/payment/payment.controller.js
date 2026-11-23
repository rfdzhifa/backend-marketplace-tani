import { sendSuccess } from '../../shared/utils/response.js';
import { paymentService } from './payment.service.js';

export const paymentController = {
  async createSnapToken(req, res, next) {
    try {
      const paymentId = req.validated.params.paymentId;
      const data = await paymentService.createSnapToken(req.user.id, paymentId);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Snap token berhasil dibuat',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },

  async handleWebhook(req, res, next) {
    try {
      const data = await paymentService.handleMidtransWebhook(req.body);
      return sendSuccess(res, {
        statusCode: 200,
        message: data.message || 'Webhook berhasil diproses',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },
};

