import { sendSuccess } from '../../shared/utils/response.js';
import { cartService } from './cart.service.js';

export const cartController = {
  async getCart(req, res, next) {
    try {
      const data = await cartService.getCart(req.user.id);
      return sendSuccess(res, { data });
    } catch (err) {
      return next(err);
    }
  },

  async addItem(req, res, next) {
    try {
      const data = await cartService.addItem(req.user.id, req.body);
      return sendSuccess(res, {
        statusCode: 201,
        message: 'Produk berhasil ditambahkan ke keranjang',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },

  async updateItem(req, res, next) {
    try {
      const itemId = req.validated.params.id;
      const data = await cartService.updateItem(req.user.id, itemId, req.body);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Keranjang berhasil diperbarui',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },

  async removeItem(req, res, next) {
    try {
      const itemId = req.validated.params.id;
      const data = await cartService.removeItem(req.user.id, itemId);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Produk berhasil dihapus dari keranjang',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },
};

