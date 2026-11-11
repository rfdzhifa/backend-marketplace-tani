import { sendSuccess } from '../../shared/utils/response.js';
import { orderService } from './order.service.js';

export const orderController = {
  async checkout(req, res, next) {
    try {
      const data = await orderService.checkout(req.user.id, req.body);
      return sendSuccess(res, {
        statusCode: 201,
        message: 'Checkout berhasil',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },
};
