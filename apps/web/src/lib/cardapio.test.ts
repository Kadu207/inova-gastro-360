import { describe, it, expect } from "vitest";
import {
  addToCartItem,
  cartTotalCents,
  filterProducts,
  isValidProductImageUrl,
  productDisplayImage,
  productInitial,
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
    image_url: "https://example.com/burger.jpg",
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

  it("aceita apenas image_url http(s)", () => {
    expect(isValidProductImageUrl("https://cdn.example/img.jpg")).toBe(true);
    expect(isValidProductImageUrl("javascript:alert(1)")).toBe(false);
    expect(isValidProductImageUrl(null)).toBe(false);
  });

  it("productDisplayImage retorna URL válida ou null", () => {
    expect(productDisplayImage(products[0].image_url)).toBe("https://example.com/burger.jpg");
    expect(productDisplayImage("javascript:x")).toBeNull();
  });

  it("reescreve CDN legado para /media/ no app", () => {
    const legacy =
      "https://cdn.inovatitech.com.br/inova-gastro-360/tenants/t1/branches/b1/products/p1/x.png";
    const resolved = productDisplayImage(legacy);
    expect(resolved).toContain("/media/inova-gastro-360/tenants/t1/");
    expect(resolved).not.toContain("cdn.inovatitech.com.br");
  });

  it("productInitial usa primeira letra", () => {
    expect(productInitial("Smash Burger")).toBe("S");
    expect(productInitial("")).toBe("?");
  });
});
