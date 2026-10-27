import { prisma } from '../src/config/database.js';
import { hashPassword } from '../src/shared/utils/hash.js';

const SEED_PASSWORD = 'rahasia123';

const seedUsers = [
  { nama: 'Petani Budi', email: 'petani.budi@seed.local', noTelepon: '081200000001', role: 'SELLER' },
  { nama: 'Petani Siti', email: 'petani.siti@seed.local', noTelepon: '081200000002', role: 'SELLER' },
  { nama: 'Pembeli Andi', email: 'pembeli.andi@seed.local', noTelepon: '081200000003', role: 'BUYER' },
];

const farmerProfiles = {
  'petani.budi@seed.local': {
    namaUsaha: 'Kebun Budi',
    deskripsi: 'Petani sayur lokal berpengalaman dari Lembang, menghasilkan sayuran segar tanpa pestisida berbahaya.',
    lokasi: 'Lembang, Bandung Barat',
    foto: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=600&q=80',
  },
  'petani.siti@seed.local': {
    namaUsaha: 'Kebun Siti',
    deskripsi: 'Menyediakan aneka cabai, tomat, dan rempah pilihan segar langsung petik dari kebun.',
    lokasi: 'Ciwidey, Kab. Bandung',
    foto: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
  },
};

// Foto produk: Wikimedia Commons (lisensi bebas; sumber lengkap di halaman file tiap URL).
const PRODUCT_IMAGES = {
  'Cabai Merah':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Chilli_Peppers%2C_greengrocers_display%2C_Redruth%2C_Cornwall_-_October_2022.jpg/960px-Chilli_Peppers%2C_greengrocers_display%2C_Redruth%2C_Cornwall_-_October_2022.jpg',
  'Cabai Rawit':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/A_Fat_Red_Cayenne_Pepper.jpg/960px-A_Fat_Red_Cayenne_Pepper.jpg',
  Tomat:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/Tomatoes_plain_and_sliced.jpg/960px-Tomatoes_plain_and_sliced.jpg',
  Bayam:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Spinach_leaves.jpg/960px-Spinach_leaves.jpg',
  Wortel:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Carrots_001.jpg/960px-Carrots_001.jpg',
  Kentang:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Potato_tubers_in_pail.jpg/960px-Potato_tubers_in_pail.jpg',
  Kol: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Fresh_Cabbage_vegetables.jpg/960px-Fresh_Cabbage_vegetables.jpg',
  Brokoli:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Broccoli_and_cross_section_edit.jpg/960px-Broccoli_and_cross_section_edit.jpg',
  'Bawang Merah':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Red_Onions.jpg/960px-Red_Onions.jpg',
  'Bawang Putih':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Garlic_bulbs_and_cloves.jpg/960px-Garlic_bulbs_and_cloves.jpg',
  'Jagung Manis':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Corn_on_the_cob_%28sweet_corn%29.jpg/960px-Corn_on_the_cob_%28sweet_corn%29.jpg',
  'Sawi Hijau':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Mustard_greens_on_a_tray.jpg/960px-Mustard_greens_on_a_tray.jpg',
  'Terong Ungu':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/Purple_Round_Eggplant.jpg/960px-Purple_Round_Eggplant.jpg',
};

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

async function backfillProductImages() {
  for (const [nama, gambarUrl] of Object.entries(PRODUCT_IMAGES)) {
    await prisma.product.updateMany({
      where: { nama, OR: [{ gambarUrl: null }, { gambarUrl: '' }] },
      data: { gambarUrl },
    });
  }
}

async function seedFarmerProfiles(sellers) {
  for (const seller of sellers) {
    const profile = farmerProfiles[seller.email];
    if (!profile) continue;

    await prisma.farmerProfile.upsert({
      where: { userId: seller.id },
      update: {},
      create: {
        userId: seller.id,
        ...profile,
      },
    });
  }
}

async function seedProducts(sellers) {
  if ((await prisma.product.count()) > 0) {
    await backfillProductImages();
    return;
  }

  for (const [index, template] of productTemplates.entries()) {
    await prisma.product.create({
      data: {
        ...template,
        gambarUrl: PRODUCT_IMAGES[template.nama],
        sellerId: sellers[index % sellers.length].id,
      },
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

  const sellers = users.filter((user) => user.role === 'SELLER');
  await seedFarmerProfiles(sellers);
  await seedProducts(sellers);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

