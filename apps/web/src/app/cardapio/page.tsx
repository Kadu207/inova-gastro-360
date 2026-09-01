"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CatalogProductThumb from "@/components/catalog/CatalogProductThumb";
import {
  API_BASE,
  createOrderPayment,
  formatBRL,
  fetchPaymentsStatus,
  getActiveBranchId,
  getOrderPaymentStatus,
  getToken,
} from "@/lib/api";
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
type PayMethod = "pix" | "card";

interface PendingOrder {
  id: string;
  orderNumber: number;
  totalCents: number;
}

export default function CardapioPage() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<OrderChannel>("web");
  const [payMethod, setPayMethod] = useState<PayMethod>("pix");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixCopy, setPixCopy] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [onlinePaymentAvailable, setOnlinePaymentAvailable] = useState<boolean | null>(null);
  const checkoutKeyRef = useRef<string | null>(null);

  const isLoggedIn = typeof window !== "undefined" && !!getToken();
  const filtered = useMemo(() => filterProducts(products, categoryId, search), [products, categoryId, search]);
  const total = cartTotalCents(cart);
  const branchId = getActiveBranchId();

  useEffect(() => {
    const base = `${API_BASE}/api/v1/branches/${branchId}/catalog`;
    Promise.all([
      fetch(`${base}/categories`).then((r) => r.json()),
      fetch(`${base}/products`).then((r) => r.json()),
    ])
      .then(([catData, prodData]) => {
        setCategories(catData.categories ?? []);
        setProducts(prodData.products ?? []);
      })
      .catch(() => setMessage("Não foi possível carregar o cardápio. Tente novamente."));

    fetchPaymentsStatus()
      .then((st) => setOnlinePaymentAvailable(st.deliveryOnlinePayment))
      .catch(() => setOnlinePaymentAvailable(false));
  }, [branchId]);

  useEffect(() => {
    if (!pendingOrder || paymentStatus === "paid") return;
    const t = setInterval(async () => {
      try {
        const st = await getOrderPaymentStatus(branchId, pendingOrder.id, customerPhone);
        setPaymentStatus(st.paymentStatus);
        if (st.paymentStatus === "paid") {
          setMessage(`Pagamento confirmado! Pedido #${pendingOrder.orderNumber}.`);
        }
      } catch {
        /* polling silencioso */
      }
    }, 4000);
    return () => clearInterval(t);
  }, [pendingOrder, paymentStatus, branchId, customerPhone]);

  const countdown = useMemo(() => {
    if (!expiresAt) return "";
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return "Expirado";
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }, [expiresAt, paymentStatus]);

  async function startPayment(order: PendingOrder) {
    if (payMethod === "card") {
      const pay = await createOrderPayment(branchId, order.id, "card", customerPhone);
      if (pay.card?.redirectUrl) {
        window.location.href = pay.card.redirectUrl;
        return;
      }
    }
    const pay = await createOrderPayment(branchId, order.id, "pix", customerPhone);
    setPixQr(pay.pix?.qrCodeBase64 ?? null);
    setPixCopy(pay.pix?.copyPaste ?? null);
    setExpiresAt(pay.expiresAt);
    setPaymentStatus("pending");
  }

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
          branchId,
          channel: channel === "delivery" ? "delivery" : "web",
          customerName: token ? undefined : customerName.trim(),
          customerPhone: token ? undefined : customerPhone.trim(),
          notes: notes.trim() || undefined,
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const po: PendingOrder = {
          id: data.order.id,
          orderNumber: data.order.orderNumber,
          totalCents: data.order.totalCents,
        };
        setCart([]);
        setNotes("");
        checkoutKeyRef.current = null;

        if (channel === "delivery") {
          if (onlinePaymentAvailable) {
            setPendingOrder(po);
            setMessage(`Pedido #${po.orderNumber} criado. Pague para confirmar.`);
            await startPayment(po);
          } else {
            setMessage(
              `Pedido #${po.orderNumber} registrado! Pagamento online em breve — combine pagamento na entrega.`,
            );
          }
        } else {
          setMessage(`Pedido #${po.orderNumber} criado com sucesso!`);
        }
      } else {
        setMessage(data.message ?? data.error ?? "Erro ao criar pedido");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao processar pagamento");
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

      {pendingOrder && paymentStatus !== "paid" && (
        <section className="catalog-pix-panel os-panel" aria-live="polite">
          <h2>Pagamento — Pedido #{pendingOrder.orderNumber}</h2>
          <p>Total: {formatBRL(pendingOrder.totalCents)}</p>
          {payMethod === "pix" && pixCopy && (
            <>
              {pixQr && (
                <img
                  src={`data:image/png;base64,${pixQr}`}
                  alt="QR Code PIX"
                  width={200}
                  height={200}
                  className="catalog-pix-qr"
                />
              )}
              <label className="catalog-pix-copy">
                Copia e cola
                <textarea readOnly value={pixCopy} rows={3} />
              </label>
              <button
                type="button"
                className="os-btn-outline"
                onClick={() => navigator.clipboard.writeText(pixCopy)}
              >
                Copiar código PIX
              </button>
              {expiresAt && <p className="os-muted">Expira em: {countdown}</p>}
            </>
          )}
          {paymentStatus === "expired" && (
            <button type="button" className="os-btn-primary" onClick={() => startPayment(pendingOrder)}>
              Gerar novo PIX
            </button>
          )}
        </section>
      )}

      {!pendingOrder && (
        <>
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
              <button type="button" className={channel === "web" ? "active" : ""} onClick={() => setChannel("web")}>
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

          {channel === "delivery" && onlinePaymentAvailable && (
            <div className="catalog-channels" role="group" aria-label="Forma de pagamento">
              <button type="button" className={payMethod === "pix" ? "active" : ""} onClick={() => setPayMethod("pix")}>
                PIX
              </button>
              <button type="button" className={payMethod === "card" ? "active" : ""} onClick={() => setPayMethod("card")}>
                Cartão
              </button>
            </div>
          )}

          {channel === "delivery" && onlinePaymentAvailable === false && (
            <p className="os-hint">
              Pagamento online (PIX/cartão) será ativado na entrega do sistema. Por enquanto, pague na entrega.
            </p>
          )}

          <div className="catalog-category-tabs" role="tablist">
            <button type="button" role="tab" className={!categoryId ? "active" : ""} onClick={() => setCategoryId(null)}>
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
              <button type="button" className="os-btn-primary catalog-checkout" onClick={checkout} disabled={!cart.length || isCheckingOut}>
                {isCheckingOut
                  ? "Finalizando…"
                  : channel === "delivery"
                    ? onlinePaymentAvailable
                      ? "Pedir e pagar"
                      : "Pedir delivery"
                    : "Finalizar pedido"}
              </button>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
