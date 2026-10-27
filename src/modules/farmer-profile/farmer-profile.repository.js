import { prisma } from '../../config/database.js';

function toProfileData(record) {
  if (!record) return null;
  return {
    farmName: record.namaUsaha,
    description: record.deskripsi,
    location: record.lokasi,
    photoUrl: record.foto,
  };
}

export const farmerProfileRepository = {
  toProfileData,

  findSellerWithProfile(sellerId) {
    return prisma.user.findFirst({
      where: {
        id: Number(sellerId),
        role: 'SELLER',
      },
      select: {
        id: true,
        nama: true,
        farmerProfile: {
          select: {
            namaUsaha: true,
            deskripsi: true,
            lokasi: true,
            foto: true,
          },
        },
      },
    });
  },

  findByUserId(userId) {
    return prisma.farmerProfile.findUnique({
      where: { userId: Number(userId) },
    });
  },

  upsertByUserId(userId, { farmName, description, location, photoUrl }) {
    const data = {
      namaUsaha: farmName,
      deskripsi: description,
      lokasi: location,
      foto: photoUrl ?? null,
    };

    return prisma.farmerProfile.upsert({
      where: { userId: Number(userId) },
      update: data,
      create: {
        ...data,
        userId: Number(userId),
      },
    });
  },
};

