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

  async getBuyerOrders(req, res, next) {
    try {
      const { orders, meta } = await orderService.getBuyerOrders(req.user.id, req.validated.query);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Riwayat pesanan berhasil diambil',
        data: orders,
        meta,
      });
    } catch (err) {
      return next(err);
    }
  },

  async getBuyerOrderDetail(req, res, next) {
    try {
      const data = await orderService.getBuyerOrderDetail(req.user.id, req.validated.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Detail pesanan berhasil diambil',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },

  async getSellerOrders(req, res, next) {
    try {
      const { orders, meta } = await orderService.getSellerOrders(req.user.id, req.validated.query);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Daftar pesanan masuk berhasil diambil',
        data: orders,
        meta,
      });
    } catch (err) {
      return next(err);
    }
  },

  async getSellerOrderDetail(req, res, next) {
    try {
      const data = await orderService.getSellerOrderDetail(req.user.id, req.validated.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Detail pesanan masuk berhasil diambil',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },

  async processSellerOrder(req, res, next) {
    try {
      const data = await orderService.processSellerOrder(req.user.id, req.validated.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Pesanan berhasil diproses',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },

  async shipSellerOrder(req, res, next) {
    try {
      const data = await orderService.shipSellerOrder(req.user.id, req.validated.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Pesanan berhasil ditandai dikirim',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },

  async confirmOrderReceived(req, res, next) {
    try {
      const data = await orderService.confirmOrderReceived(req.user.id, req.validated.params.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Pesanan berhasil dikonfirmasi diterima',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },
};

