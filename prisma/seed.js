import { prisma } from '../src/config/database.js';
import { hashPassword } from '../src/shared/utils/hash.js';

const SEED_PASSWORD = 'rahasia123';

const seedUsers = [
  { nama: 'Petani Budi', email: 'petani.budi@seed.local', noTelepon: '081200000001', role: 'SELLER' },
  { nama: 'Petani Siti', email: 'petani.siti@seed.local', noTelepon: '081200000002', role: 'SELLER' },
  { nama: 'Pembeli Andi', email: 'pembeli.andi@seed.local', noTelepon: '081200000003', role: 'BUYER' },
];

const productTemplates = [
  { nama: 'Cabai Merah', harga: 45000, stok: 25, satuan: 'kg', deskripsi: 'Cabai merah segar dipanen pagi hari.', ratingRataRata: 4.5, jumlahUlasan: 8 },
  { nama: 'Cabai Rawit', harga: 60000, stok: 15, satuan: 'kg', deskripsi: 'Cabai rawit pedas langsung dari kebun.' },
  { nama: 'Tomat', harga: 15000, stok: 40, satuan: 'kg', deskripsi: 'Tomat merah matang, segar dan manis.' },
  { nama: 'Bayam', harga: 5000, stok: 60, satuan: 'ikat', deskripsi: 'Bayam hijau organik.' },
  { nama: 'Wortel', harga: 12000, stok: 35, satuan: 'kg', deskripsi: 'Wortel segar dari dataran tinggi.' },
  { nama: 'Kentang', harga: 14000, stok: 50, satuan: 'kg', deskripsi: 'Kentang granola pilihan.' },
  { nama: 'Kol', harga: 8000, stok: 30, satuan: 'kg', deskripsi: 'Kol putih renyah.' },
  { nama: 'Brokoli', harga: 22000, stok: 20, satuan: 'kg', deskripsi: 'Brokoli hijau segar.' },
  { nama: 'Bawang Merah', harga: 38000, stok: 0, satuan: 'kg', deskripsi: 'Bawang merah lokal, stok sedang kosong.' },
  { nama: 'Bawang Putih', harga: 32000, stok: 18, satuan: 'kg', deskripsi: 'Bawang putih kating.' },
  { nama: 'Jagung Manis', harga: 9000, stok: 45, satuan: 'kg', deskripsi: 'Jagung manis siap rebus.' },
  { nama: 'Sawi Hijau', harga: 6000, stok: 55, satuan: 'ikat', deskripsi: 'Sawi hijau segar.' },
  { nama: 'Terong Ungu', harga: 11000, stok: 28, satuan: 'kg', deskripsi: 'Terong ungu mengkilap.' },
  { nama: 'Buncis (Dihapus)', harga: 13000, stok: 10, satuan: 'kg', deskripsi: 'Produk yang sudah dihapus.', deletedAt: new Date() },
];

async function seedProducts(sellers) {
  if ((await prisma.product.count()) > 0) {
    return;
  }

  for (const [index, template] of productTemplates.entries()) {
    await prisma.product.create({
      data: { ...template, sellerId: sellers[index % sellers.length].id },
    });
  }
}

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  const users = [];
  for (const user of seedUsers) {
    users.push(
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: { ...user, passwordHash },
      }),
    );
  }

  await seedProducts(users.filter((user) => user.role === 'SELLER'));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

