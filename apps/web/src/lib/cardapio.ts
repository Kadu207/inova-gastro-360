export interface CatalogCategory {
  id: string;
  name: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  category_id: string;
  category_name: string;
  image_url?: string | null;
}

export interface CartItem {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
}

export function filterProducts(
  products: CatalogProduct[],
  categoryId: string | null,
  search: string,
): CatalogProduct[] {
  const q = search.trim().toLowerCase();
  return products.filter((p) => {
    if (categoryId && p.category_id !== categoryId) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category_name.toLowerCase().includes(q)
    );
  });
}

export function addToCartItem(cart: CartItem[], product: Pick<CatalogProduct, "id" | "name" | "price_cents">): CartItem[] {
  const existing = cart.find((i) => i.productId === product.id);
  if (existing) {
    return cart.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
  }
  return [...cart, { productId: product.id, name: product.name, priceCents: product.price_cents, quantity: 1 }];
}

export function updateCartQuantity(cart: CartItem[], productId: string, delta: number): CartItem[] {
  return cart
    .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
    .filter((i) => i.quantity > 0);
}

export function cartTotalCents(cart: CartItem[]): number {
  return cart.reduce((s, i) => s + i.priceCents * i.quantity, 0);
}

export function validateGuestCheckout(name: string, phone: string): string | null {
  if (!name.trim()) return "Informe seu nome";
  if (!phone.trim() || phone.replace(/\D/g, "").length < 10) return "Informe um telefone válido";
  return null;
}
