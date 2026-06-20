"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE, DEMO_BRANCH_ID, formatBRL } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  category_name: string;
}

interface CartItem {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
}

export default function CardapioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const checkoutKeyRef = useRef<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/branches/${DEMO_BRANCH_ID}/catalog/products`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setMessage("API offline — inicie o api-gateway"));
  }, []);

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { productId: p.id, name: p.name, priceCents: p.price_cents, quantity: 1 }];
    });
  }

  async function checkout() {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    if (!checkoutKeyRef.current) {
      checkoutKeyRef.current = crypto.randomUUID();
    }
    setIsCheckingOut(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/orders`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
          "Idempotency-Key": checkoutKeyRef.current,
        },
        body: JSON.stringify({
          branchId: DEMO_BRANCH_ID,
          channel: "web",
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Pedido #${data.order.orderNumber} criado!`);
        setCart([]);
        checkoutKeyRef.current = null;
      } else {
        setMessage(data.error ?? "Erro ao criar pedido");
      }
    } finally {
      setIsCheckingOut(false);
    }
  }

  const total = cart.reduce((s, i) => s + i.priceCents * i.quantity, 0);

  return (
    <div className="os-page">
      {message && <p className="os-hint">{message}</p>}
      <div className="split">
        <section>
          {products.map((p) => (
            <article key={p.id} className="product-card">
              <div>
                <strong>{p.name}</strong>
                <p>{p.description}</p>
                <span>{formatBRL(p.price_cents)}</span>
              </div>
              <button type="button" onClick={() => addToCart(p)}>
                Adicionar
              </button>
            </article>
          ))}
        </section>
        <aside className="cart">
          <h2>Carrinho</h2>
          {cart.map((i) => (
            <p key={i.productId}>
              {i.quantity}x {i.name} — {formatBRL(i.priceCents * i.quantity)}
            </p>
          ))}
          <p>
            <strong>Total: {formatBRL(total)}</strong>
          </p>
          <button type="button" className="os-btn-primary" onClick={checkout} disabled={!cart.length || isCheckingOut}>
            {isCheckingOut ? "Finalizando…" : "Finalizar pedido"}
          </button>
        </aside>
      </div>
    </div>
  );
}
