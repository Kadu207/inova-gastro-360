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

/** Aceita apenas URLs http(s) — evita javascript: em image_url do catálogo. */
export function isValidProductImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** CDN legado (não servido na VPS) → proxy /media/ no domínio do app. */
const LEGACY_CDN_PREFIX = "https://cdn.inovatitech.com.br/inova-gastro-360";

function mediaBaseFromApp(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/media/inova-gastro-360`;
  }
  const api = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  return api ? `${api}/media/inova-gastro-360` : "/media/inova-gastro-360";
}

export function resolveProductImageUrl(url: string | null | undefined): string | null {
  if (!isValidProductImageUrl(url)) return null;
  let u = url!.trim();
  if (u.startsWith(LEGACY_CDN_PREFIX)) {
    u = `${mediaBaseFromApp()}${u.slice(LEGACY_CDN_PREFIX.length)}`;
  }
  return u;
}

export function productDisplayImage(url: string | null | undefined): string | null {
  return resolveProductImageUrl(url);
}

export function productInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
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
