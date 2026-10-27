import { prisma } from '../../config/database.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError.js';
import { findActiveById } from '../marketplace/index.js';
import { cartRepository } from './cart.repository.js';

function resolveSellerDisplayName(seller) {
  return seller.farmerProfile?.namaUsaha || seller.nama;
}

export function toCartResponse(cart) {
  if (!cart) {
    return {
      id: null,
      items: [],
      itemCount: 0,
      totalItems: 0,
      totalPrice: 0,
    };
  }

  const items = (cart.items || []).map((item) => {
    const currentPrice = Number(item.product.harga);
    const subtotal = currentPrice * item.jumlah;
    const isAvailable = item.product.deletedAt === null && item.product.stok >= item.jumlah;

    return {
      id: item.id,
      productId: item.productId,
      name: item.product.nama,
      imageUrl: item.product.gambarUrl,
      unit: item.product.satuan,
      price: currentPrice,
      quantity: item.jumlah,
      subtotal,
      stock: item.product.stok,
      isAvailable,
      seller: {
        id: item.product.seller.id,
        name: resolveSellerDisplayName(item.product.seller),
      },
    };
  });

  const itemCount = items.length;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    id: cart.id,
    items,
    itemCount,
    totalItems,
    totalPrice,
  };
}

export const cartService = {
  toCartResponse,

  async getCart(buyerId) {
    const cart = await cartRepository.findByBuyerId(buyerId);
    return toCartResponse(cart);
  },

  async addItem(buyerId, { productId, quantity }) {
    const product = await findActiveById(productId);
    if (!product) {
      throw new NotFoundError('Produk tidak ditemukan');
    }

    return prisma.$transaction(async (tx) => {
      const cart = await cartRepository.upsertCart(buyerId, tx);
      const existing = await cartRepository.findItemByCartAndProduct(cart.id, productId, tx);
      const targetQuantity = (existing?.jumlah || 0) + quantity;

      if (targetQuantity > product.stok) {
        throw new BadRequestError('Stok tidak mencukupi', [
          { field: 'quantity', message: 'Stok tidak mencukupi' },
        ]);
      }

      const subtotal = Number(product.harga) * targetQuantity;
      await cartRepository.upsertItem(
        { cartId: cart.id, productId, jumlah: targetQuantity, subtotal },
        tx,
      );

      const items = await cartRepository.findItemsByCartId(cart.id, tx);
      const totalHarga = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
      await cartRepository.updateCartTotal(cart.id, totalHarga, tx);

      const updatedCart = await cartRepository.findByBuyerId(buyerId, tx);
      return toCartResponse(updatedCart);
    });
  },

  async updateItem(buyerId, itemId, { quantity }) {
    const item = await cartRepository.findItemById(itemId);
    if (!item || item.cart.buyerId !== buyerId) {
      throw new NotFoundError('Item keranjang tidak ditemukan');
    }

    if (item.product.deletedAt !== null) {
      throw new BadRequestError('Produk tidak tersedia');
    }

    if (quantity > item.product.stok) {
      throw new BadRequestError('Stok tidak mencukupi', [
        { field: 'quantity', message: 'Stok tidak mencukupi' },
      ]);
    }

    return prisma.$transaction(async (tx) => {
      const subtotal = Number(item.product.harga) * quantity;
      await cartRepository.updateItem(itemId, { jumlah: quantity, subtotal }, tx);

      const items = await cartRepository.findItemsByCartId(item.cartId, tx);
      const totalHarga = items.reduce((sum, i) => sum + Number(i.subtotal), 0);
      await cartRepository.updateCartTotal(item.cartId, totalHarga, tx);

      const updatedCart = await cartRepository.findByBuyerId(buyerId, tx);
      return toCartResponse(updatedCart);
    });
  },

  async removeItem(buyerId, itemId) {
    const item = await cartRepository.findItemById(itemId);
    if (!item || item.cart.buyerId !== buyerId) {
      throw new NotFoundError('Item keranjang tidak ditemukan');
    }

    return prisma.$transaction(async (tx) => {
      await cartRepository.deleteItem(itemId, tx);

      const items = await cartRepository.findItemsByCartId(item.cartId, tx);
      const totalHarga = items.reduce((sum, i) => sum + Number(i.subtotal), 0);
      await cartRepository.updateCartTotal(item.cartId, totalHarga, tx);

      const updatedCart = await cartRepository.findByBuyerId(buyerId, tx);
      return toCartResponse(updatedCart);
    });
  },
};

