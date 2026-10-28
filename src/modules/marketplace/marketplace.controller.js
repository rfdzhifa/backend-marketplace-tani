import { sendSuccess } from '../../shared/utils/response.js';
import { marketplaceService } from './marketplace.service.js';

export const marketplaceController = {
  async listProducts(req, res, next) {
    try {
      const { items, meta } = await marketplaceService.listProducts(req.validated.query);
      return sendSuccess(res, { data: items, meta });
    } catch (err) {
      return next(err);
    }
  },

  async getProductDetail(req, res, next) {
    try {
      const product = await marketplaceService.getProductDetail(req.validated.params.id);
      return sendSuccess(res, { data: product });
    } catch (err) {
      return next(err);
    }
  },

  async listSellerProducts(req, res, next) {
    try {
      const { items, meta } = await marketplaceService.listSellerProducts(
        req.user.id,
        req.validated.query,
      );
      return sendSuccess(res, { data: items, meta });
    } catch (err) {
      return next(err);
    }
  },

  async getSellerProduct(req, res, next) {
    try {
      const data = await marketplaceService.getSellerProduct(
        req.user.id,
        req.validated.params.id,
      );
      return sendSuccess(res, { data });
    } catch (err) {
      return next(err);
    }
  },

  async createSellerProduct(req, res, next) {
    try {
      const data = await marketplaceService.createSellerProduct(
        req.user.id,
        req.body,
      );
      return sendSuccess(res, {
        statusCode: 201,
        message: 'Produk berhasil disimpan',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },

  async updateSellerProduct(req, res, next) {
    try {
      const data = await marketplaceService.updateSellerProduct(
        req.user.id,
        req.validated.params.id,
        req.body,
      );
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Produk berhasil diperbarui',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },

  async updateSellerProductStock(req, res, next) {
    try {
      const data = await marketplaceService.updateSellerProductStock(
        req.user.id,
        req.validated.params.id,
        req.body.stock,
      );
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Stok berhasil diperbarui',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },

  async deleteSellerProduct(req, res, next) {
    try {
      const data = await marketplaceService.deleteSellerProduct(
        req.user.id,
        req.validated.params.id,
      );
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Produk berhasil dihapus',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },
};
