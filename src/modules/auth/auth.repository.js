import { prisma } from '../../config/database.js';

function toPublicUser(userRecord) {
  if (!userRecord) return null;
  return {
    id: userRecord.id,
    name: userRecord.nama,
    email: userRecord.email,
    phone: userRecord.noTelepon,
    role: userRecord.role,
  };
}

export const authRepository = {
  async findByEmail(email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) return null;

    return {
      ...toPublicUser(user),
      password_hash: user.passwordHash,
    };
  },

  async findById(id) {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    return toPublicUser(user);
  },

  async create({ name, email, phone, passwordHash, role }) {
    const created = await prisma.user.create({
      data: {
        nama: name,
        email: email.toLowerCase(),
        noTelepon: phone,
        passwordHash,
        role,
      },
    });

    return toPublicUser(created);
  },

  async updateProfile(id, { name, phone }) {
    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        nama: name,
        noTelepon: phone,
      },
    });

    return toPublicUser(updated);
  },
};

