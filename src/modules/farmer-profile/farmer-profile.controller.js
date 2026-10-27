import { sendSuccess } from '../../shared/utils/response.js';
import { farmerProfileService } from './farmer-profile.service.js';

export const farmerProfileController = {
  async getFarmerProfile(req, res, next) {
    try {
      const data = await farmerProfileService.getPublicProfile(req.validated.params.id);
      return sendSuccess(res, { data });
    } catch (err) {
      return next(err);
    }
  },

  async getMyFarmerProfile(req, res, next) {
    try {
      const data = await farmerProfileService.getMyProfile(req.user.id);
      return sendSuccess(res, { data });
    } catch (err) {
      return next(err);
    }
  },

  async upsertMyFarmerProfile(req, res, next) {
    try {
      const data = await farmerProfileService.upsertMyProfile(req.user.id, req.body);
      return sendSuccess(res, {
        message: 'Profil petani berhasil disimpan',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },
};

