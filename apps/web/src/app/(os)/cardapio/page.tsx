"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CatalogProductThumb from "@/components/catalog/CatalogProductThumb";
import { API_BASE, formatBRL, getActiveBranchId, getToken } from "@/lib/api";
import {
  addToCartItem,
  cartTotalCents,
  filterProducts,
  updateCartQuantity,
  validateGuestCheckout,
  type CartItem,
  type CatalogCategory,
  type CatalogProduct,
} from "@/lib/cardapio";

type OrderChannel = "web" | "delivery";

export default function CardapioPage() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<OrderChannel>("web");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const checkoutKeyRef = useRef<string | null>(null);

  const isLoggedIn = typeof window !== "undefined" && !!getToken();
  const filtered = useMemo(() => filterProducts(products, categoryId, search), [products, categoryId, search]);
  const total = cartTotalCents(cart);

  useEffect(() => {
    const base = `${API_BASE}/api/v1/branches/${getActiveBranchId()}/catalog`;
    Promise.all([
      fetch(`${base}/categories`).then((r) => r.json()),
      fetch(`${base}/products`).then((r) => r.json()),
    ])
      .then(([catData, prodData]) => {
        setCategories(catData.categories ?? []);
        setProducts(prodData.products ?? []);
      })
      .catch(() => setMessage("Não foi possível carregar o cardápio. Tente novamente."));
  }, []);

  async function checkout() {
    if (!cart.length) return;
    const token = getToken();
    if (!token) {
      const err = validateGuestCheckout(customerName, customerPhone);
      if (err) {
        setMessage(err);
        return;
      }
    }
    if (!checkoutKeyRef.current) checkoutKeyRef.current = crypto.randomUUID();
    setIsCheckingOut(true);
    setMessage("");
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "Idempotency-Key": checkoutKeyRef.current,
      };
      if (token) headers.authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/v1/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          branchId: getActiveBranchId(),
          channel: channel === "delivery" ? "delivery" : "web",
          customerName: token ? undefined : customerName.trim(),
          customerPhone: token ? undefined : customerPhone.trim(),
          notes: notes.trim() || undefined,
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Pedido #${data.order.orderNumber} criado com sucesso!`);
        setCart([]);
        setNotes("");
        checkoutKeyRef.current = null;
      } else {
        setMessage(data.message ?? data.error ?? "Erro ao criar pedido");
      }
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <div className="catalog-page">
      <header className="catalog-header">
        <div>
          <p className="catalog-eyebrow">Cardápio online</p>
          <h1>Inova Gastro 360</h1>
          <p className="catalog-sub">Monte seu pedido — entrega ou retirada</p>
        </div>
        <div className="catalog-header-actions">
          {!isLoggedIn && (
            <Link href="/login" className="catalog-link">
              Entrar (equipe)
            </Link>
          )}
          <span className="catalog-cart-badge">Carrinho {formatBRL(total)}</span>
        </div>
      </header>

      {message && <p className="os-hint catalog-message">{message}</p>}

      <div className="catalog-toolbar">
        <input
          type="search"
          className="catalog-search"
          placeholder="Buscar produto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar produto"
        />
        <div className="catalog-channels" role="group" aria-label="Tipo de pedido">
          <button
            type="button"
            className={channel === "web" ? "active" : ""}
            onClick={() => setChannel("web")}
          >
            Retirada / Local
          </button>
          <button
            type="button"
            className={channel === "delivery" ? "active" : ""}
            onClick={() => setChannel("delivery")}
          >
            Delivery
          </button>
        </div>
      </div>

      <div className="catalog-category-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={!categoryId ? "active" : ""}
          onClick={() => setCategoryId(null)}
        >
          Todos
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            className={categoryId === c.id ? "active" : ""}
            onClick={() => setCategoryId(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="catalog-layout">
        <section className="catalog-grid" aria-label="Produtos">
          {filtered.length === 0 && <p className="catalog-empty">Nenhum produto encontrado.</p>}
          {filtered.map((p) => (
            <article key={p.id} className="catalog-product">
              <CatalogProductThumb name={p.name} imageUrl={p.image_url} />
              <div className="catalog-product-body">
                <p className="catalog-product-cat">{p.category_name}</p>
                <strong>{p.name}</strong>
                <p>{p.description}</p>
                <span className="catalog-price">{formatBRL(p.price_cents)}</span>
              </div>
              <button type="button" className="catalog-add-btn" onClick={() => setCart((prev) => addToCartItem(prev, p))}>
                Adicionar
              </button>
            </article>
          ))}
        </section>

        <aside className="catalog-cart" aria-label="Carrinho">
          <h2>Carrinho</h2>
          {cart.length === 0 && <p className="catalog-empty">Seu carrinho está vazio.</p>}
          <ul className="catalog-cart-list">
            {cart.map((i) => (
              <li key={i.productId}>
                <div>
                  <strong>{i.name}</strong>
                  <span>{formatBRL(i.priceCents * i.quantity)}</span>
                </div>
                <div className="catalog-qty">
                  <button type="button" aria-label="Diminuir" onClick={() => setCart((prev) => updateCartQuantity(prev, i.productId, -1))}>
                    −
                  </button>
                  <span>{i.quantity}</span>
                  <button type="button" aria-label="Aumentar" onClick={() => setCart((prev) => updateCartQuantity(prev, i.productId, 1))}>
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {!isLoggedIn && (
            <div className="catalog-guest-fields">
              <label>
                Nome
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu nome" />
              </label>
              <label>
                Telefone
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </label>
            </div>
          )}

          <label className="catalog-notes">
            Observações
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ex.: sem cebola" />
          </label>

          <p className="catalog-total">
            Total: <strong>{formatBRL(total)}</strong>
          </p>
          <button
            type="button"
            className="os-btn-primary catalog-checkout"
            onClick={checkout}
            disabled={!cart.length || isCheckingOut}
          >
            {isCheckingOut ? "Finalizando…" : "Finalizar pedido"}
          </button>
        </aside>
      </div>
    </div>
  );
}
