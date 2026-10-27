import { prisma } from '../../config/database.js';

const productInclude = {
  select: {
    id: true,
    nama: true,
    harga: true,
    satuan: true,
    stok: true,
    gambarUrl: true,
    deletedAt: true,
    seller: {
      select: {
        id: true,
        nama: true,
        farmerProfile: {
          select: {
            namaUsaha: true,
          },
        },
      },
    },
  },
};

export const cartRepository = {
  findByBuyerId(buyerId, client = prisma) {
    return client.cart.findUnique({
      where: { buyerId },
      include: {
        items: {
          orderBy: { id: 'asc' },
          include: {
            product: productInclude,
          },
        },
      },
    });
  },

  upsertCart(buyerId, client = prisma) {
    return client.cart.upsert({
      where: { buyerId },
      update: {},
      create: { buyerId },
    });
  },

  findItemById(itemId, client = prisma) {
    return client.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: productInclude,
      },
    });
  },

  findItemByCartAndProduct(cartId, productId, client = prisma) {
    return client.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
    });
  },

  upsertItem({ cartId, productId, jumlah, subtotal }, client = prisma) {
    return client.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
      update: {
        jumlah,
        subtotal,
      },
      create: {
        cartId,
        productId,
        jumlah,
        subtotal,
      },
    });
  },

  updateItem(itemId, { jumlah, subtotal }, client = prisma) {
    return client.cartItem.update({
      where: { id: itemId },
      data: {
        jumlah,
        subtotal,
      },
    });
  },

  deleteItem(itemId, client = prisma) {
    return client.cartItem.delete({
      where: { id: itemId },
    });
  },

  findItemsByCartId(cartId, client = prisma) {
    return client.cartItem.findMany({
      where: { cartId },
      select: { subtotal: true },
    });
  },

  updateCartTotal(cartId, totalHarga, client = prisma) {
    return client.cart.update({
      where: { id: cartId },
      data: { totalHarga },
    });
  },
};

