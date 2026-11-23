import { countActiveProductsBySeller } from '../marketplace/index.js';
import { getSellerOrderMetrics } from '../order/index.js';
import { getSellerRatingSummary } from '../review/index.js';

export const sellerDashboardService = {
  async getOverview(sellerId) {
    const [orderMetrics, jumlahProduk, rataRataRating] = await Promise.all([
      getSellerOrderMetrics(sellerId),
      countActiveProductsBySeller(sellerId),
      getSellerRatingSummary(sellerId),
    ]);

    return {
      totalPendapatan: orderMetrics.totalPendapatan,
      jumlahPesanan: orderMetrics.jumlahPesanan,
      jumlahProduk,
      rataRataRating,
    };
  },
};
