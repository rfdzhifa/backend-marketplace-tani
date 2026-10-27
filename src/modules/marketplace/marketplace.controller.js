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
};

