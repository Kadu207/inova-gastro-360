import { describe, it, expect } from "vitest";
import {
  addToCartItem,
  cartTotalCents,
  filterProducts,
  updateCartQuantity,
  validateGuestCheckout,
  type CatalogProduct,
} from "./cardapio";

const products: CatalogProduct[] = [
  {
    id: "1",
    name: "Smash Burger",
    description: "Carne smash",
    price_cents: 2990,
    category_id: "c1",
    category_name: "Burgers",
  },
  {
    id: "2",
    name: "Coca-Cola",
    description: "350ml",
    price_cents: 890,
    category_id: "c2",
    category_name: "Bebidas",
  },
];

describe("cardapio helpers", () => {
  it("filtra por categoria", () => {
    expect(filterProducts(products, "c2", "").map((p) => p.id)).toEqual(["2"]);
  });

  it("filtra por busca", () => {
    expect(filterProducts(products, null, "smash").map((p) => p.id)).toEqual(["1"]);
  });

  it("adiciona e incrementa carrinho", () => {
    let cart = addToCartItem([], products[0]);
    cart = addToCartItem(cart, products[0]);
    expect(cart[0].quantity).toBe(2);
    expect(cartTotalCents(cart)).toBe(5980);
  });

  it("remove item ao zerar quantidade", () => {
    const cart = updateCartQuantity([{ productId: "1", name: "X", priceCents: 100, quantity: 1 }], "1", -1);
    expect(cart).toHaveLength(0);
  });

  it("valida checkout guest", () => {
    expect(validateGuestCheckout("", "11999999999")).toBeTruthy();
    expect(validateGuestCheckout("João", "11999999999")).toBeNull();
  });
});
