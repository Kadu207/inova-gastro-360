"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import CatalogProductThumb from "@/components/catalog/CatalogProductThumb";
import ImageUploader from "@/components/catalog/ImageUploader";
import { API_BASE, DEMO_BRANCH_ID, formatBRL, getToken } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  category_id: string;
  category_name: string;
  is_available: boolean;
}

const branchBase = `${API_BASE}/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin`;
const categoriesUrl = `${branchBase}/categories`;
const productsUrl = `${branchBase}/products`;

function parsePriceToCents(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  const num = Number.parseFloat(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100);
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export default function CatalogoAdminPage() {
  const [tab, setTab] = useState<"categories" | "products">("products");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [catForm, setCatForm] = useState({ name: "", sortOrder: "0" });
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catEditForm, setCatEditForm] = useState({ name: "", sortOrder: "0", isActive: true });

  const [prodForm, setProdForm] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    isAvailable: true,
  });
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [prodEditForm, setProdEditForm] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    isAvailable: true,
    imageUrl: null as string | null,
  });

  const headers = useCallback((json = true): Record<string, string> => {
    const token = getToken();
    return {
      ...(json ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const loadCategories = useCallback(async () => {
    const res = await fetch(`${categoriesUrl}?includeInactive=1`, { headers: headers() });
    const data = await res.json();
    if (res.ok) setCategories(data.categories ?? []);
  }, [headers]);

  const loadProducts = useCallback(async () => {
    const res = await fetch(`${productsUrl}?includeUnavailable=1`, { headers: headers() });
    const data = await res.json();
    if (res.ok) setProducts(data.products ?? []);
  }, [headers]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadCategories(), loadProducts()]);
    } finally {
      setLoading(false);
    }
  }, [loadCategories, loadProducts]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!prodForm.categoryId && categories.length > 0) {
      setProdForm((f) => ({ ...f, categoryId: categories.find((c) => c.is_active)?.id ?? categories[0].id }));
    }
  }, [categories, prodForm.categoryId]);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch(categoriesUrl, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        name: catForm.name.trim(),
        sortOrder: Number.parseInt(catForm.sortOrder, 10) || 0,
        isActive: true,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setCatForm({ name: "", sortOrder: "0" });
      loadAll();
    } else {
      setMessage(data.message ?? data.error ?? "Erro ao criar categoria");
    }
  }

  async function saveCategoryEdit(id: string) {
    setMessage("");
    const res = await fetch(`${categoriesUrl}/${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({
        name: catEditForm.name.trim(),
        sortOrder: Number.parseInt(catEditForm.sortOrder, 10) || 0,
        isActive: catEditForm.isActive,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setEditingCatId(null);
      loadAll();
    } else {
      setMessage(data.error ?? "Erro ao salvar categoria");
    }
  }

  async function removeCategory(id: string) {
    if (!confirm("Excluir categoria? Só funciona se não houver produtos.")) return;
    const res = await fetch(`${categoriesUrl}/${id}`, { method: "DELETE", headers: headers() });
    const data = await res.json();
    if (res.ok) loadAll();
    else setMessage(data.error === "category_has_products" ? "Categoria possui produtos" : data.error ?? "Erro");
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const priceCents = parsePriceToCents(prodForm.price);
    if (!priceCents) {
      setMessage("Preço inválido");
      return;
    }
    const res = await fetch(productsUrl, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        categoryId: prodForm.categoryId,
        name: prodForm.name.trim(),
        description: prodForm.description.trim() || undefined,
        priceCents,
        isAvailable: prodForm.isAvailable,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setProdForm((f) => ({ ...f, name: "", description: "", price: "" }));
      loadProducts();
      setTab("products");
    } else {
      setMessage(data.error ?? "Erro ao criar produto");
    }
  }

  async function saveProductEdit(id: string) {
    setMessage("");
    const priceCents = parsePriceToCents(prodEditForm.price);
    if (!priceCents) {
      setMessage("Preço inválido");
      return;
    }
    const res = await fetch(`${productsUrl}/${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({
        categoryId: prodEditForm.categoryId,
        name: prodEditForm.name.trim(),
        description: prodEditForm.description.trim() || null,
        priceCents,
        isAvailable: prodEditForm.isAvailable,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setEditingProdId(null);
      loadProducts();
    } else {
      setMessage(data.error ?? "Erro ao salvar produto");
    }
  }

  async function removeProduct(id: string) {
    if (!confirm("Excluir produto? Falha se já estiver em pedidos.")) return;
    const res = await fetch(`${productsUrl}/${id}`, { method: "DELETE", headers: headers() });
    const data = await res.json();
    if (res.ok) loadProducts();
    else setMessage(data.error === "product_has_orders" ? "Produto em pedidos — indisponibilize" : data.error ?? "Erro");
  }

  function startEditProduct(p: Product) {
    setEditingProdId(p.id);
    setProdEditForm({
      name: p.name,
      description: p.description ?? "",
      price: centsToInput(p.price_cents),
      categoryId: p.category_id,
      isAvailable: p.is_available,
      imageUrl: p.image_url,
    });
  }

  const activeCategories = categories.filter((c) => c.is_active);

  return (
    <div className="os-page catalog-admin-page">
      <div className="catalog-admin-header">
        <div>
          <h2>Gestão do cardápio</h2>
          <p className="catalog-sub">Categorias, produtos e fotos da filial demo.</p>
        </div>
        <Link href="/cardapio" className="catalog-link" target="_blank" rel="noopener noreferrer">
          Ver cardápio público ↗
        </Link>
      </div>

      <div className="catalog-admin-tabs">
        <button
          type="button"
          className={tab === "products" ? "is-active" : ""}
          onClick={() => setTab("products")}
        >
          Produtos
        </button>
        <button
          type="button"
          className={tab === "categories" ? "is-active" : ""}
          onClick={() => setTab("categories")}
        >
          Categorias
        </button>
      </div>

      {message && <p className="os-hint catalog-message">{message}</p>}

      {tab === "categories" && (
        <>
          <form className="catalog-admin-form" onSubmit={createCategory}>
            <h3>Nova categoria</h3>
            <div className="catalog-admin-form-row">
              <label>
                Nome
                <input
                  value={catForm.name}
                  onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex.: Pizzas, Porções"
                  required
                />
              </label>
              <label>
                Ordem
                <input
                  type="number"
                  min={0}
                  value={catForm.sortOrder}
                  onChange={(e) => setCatForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </label>
              <button type="submit" className="os-btn-primary">
                Adicionar
              </button>
            </div>
          </form>

          <section className="catalog-admin-list">
            <h3>Categorias {loading ? "…" : `(${categories.length})`}</h3>
            <ul>
              {categories.map((c) => (
                <li key={c.id} className="catalog-admin-item">
                  {editingCatId === c.id ? (
                    <div className="catalog-admin-form-row">
                      <input
                        value={catEditForm.name}
                        onChange={(e) => setCatEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                      <input
                        type="number"
                        min={0}
                        value={catEditForm.sortOrder}
                        onChange={(e) => setCatEditForm((f) => ({ ...f, sortOrder: e.target.value }))}
                      />
                      <label className="catalog-admin-check">
                        <input
                          type="checkbox"
                          checked={catEditForm.isActive}
                          onChange={(e) => setCatEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                        />
                        Ativa
                      </label>
                      <button type="button" onClick={() => saveCategoryEdit(c.id)}>
                        Salvar
                      </button>
                      <button type="button" onClick={() => setEditingCatId(null)}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>
                        <strong>{c.name}</strong>
                        <span className="catalog-admin-meta">
                          ordem {c.sort_order} · {c.is_active ? "ativa" : "inativa"}
                        </span>
                      </span>
                      <div className="catalog-admin-actions">
                        <button type="button" onClick={() => {
                          setEditingCatId(c.id);
                          setCatEditForm({
                            name: c.name,
                            sortOrder: String(c.sort_order),
                            isActive: c.is_active,
                          });
                        }}>
                          Editar
                        </button>
                        <button type="button" onClick={() => removeCategory(c.id)}>
                          Excluir
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {tab === "products" && (
        <>
          <form className="catalog-admin-form" onSubmit={createProduct}>
            <h3>Novo produto</h3>
            <div className="catalog-admin-form-row">
              <label>
                Nome
                <input
                  value={prodForm.name}
                  onChange={(e) => setProdForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                Preço (R$)
                <input
                  value={prodForm.price}
                  onChange={(e) => setProdForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="29,90"
                  required
                />
              </label>
              <label>
                Categoria
                <select
                  value={prodForm.categoryId}
                  onChange={(e) => setProdForm((f) => ({ ...f, categoryId: e.target.value }))}
                  required
                >
                  {activeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="catalog-admin-check">
                <input
                  type="checkbox"
                  checked={prodForm.isAvailable}
                  onChange={(e) => setProdForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                />
                Disponível
              </label>
              <button type="submit" className="os-btn-primary" disabled={activeCategories.length === 0}>
                Adicionar
              </button>
            </div>
            <label className="catalog-admin-full">
              Descrição
              <textarea
                value={prodForm.description}
                onChange={(e) => setProdForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </label>
          </form>

          <section className="catalog-admin-list">
            <h3>Produtos {loading ? "…" : `(${products.length})`}</h3>
            <ul className="catalog-admin-products">
              {products.map((p) => (
                <li key={p.id} className="catalog-admin-product-item">
                  {editingProdId === p.id ? (
                    <div className="catalog-admin-product-edit">
                      <div className="catalog-admin-product-preview">
                        <CatalogProductThumb name={prodEditForm.name} imageUrl={prodEditForm.imageUrl} />
                      </div>
                      <div className="catalog-admin-form-row">
                        <input
                          value={prodEditForm.name}
                          onChange={(e) => setProdEditForm((f) => ({ ...f, name: e.target.value }))}
                        />
                        <input
                          value={prodEditForm.price}
                          onChange={(e) => setProdEditForm((f) => ({ ...f, price: e.target.value }))}
                        />
                        <select
                          value={prodEditForm.categoryId}
                          onChange={(e) => setProdEditForm((f) => ({ ...f, categoryId: e.target.value }))}
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <label className="catalog-admin-check">
                          <input
                            type="checkbox"
                            checked={prodEditForm.isAvailable}
                            onChange={(e) =>
                              setProdEditForm((f) => ({ ...f, isAvailable: e.target.checked }))
                            }
                          />
                          Disponível
                        </label>
                      </div>
                      <textarea
                        value={prodEditForm.description}
                        onChange={(e) => setProdEditForm((f) => ({ ...f, description: e.target.value }))}
                        rows={2}
                      />
                      <ImageUploader
                        productId={p.id}
                        currentImageUrl={prodEditForm.imageUrl}
                        onUploaded={(url) => {
                          setProdEditForm((f) => ({ ...f, imageUrl: url }));
                          loadProducts();
                        }}
                      />
                      <div className="catalog-admin-actions">
                        <button type="button" onClick={() => saveProductEdit(p.id)}>
                          Salvar
                        </button>
                        <button type="button" onClick={() => setEditingProdId(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="catalog-admin-product-row">
                        <CatalogProductThumb name={p.name} imageUrl={p.image_url} />
                        <span>
                          <strong>{p.name}</strong>
                          <span className="catalog-admin-meta">
                            {formatBRL(p.price_cents)} · {p.category_name} ·{" "}
                            {p.is_available ? "disponível" : "indisponível"}
                          </span>
                        </span>
                      </div>
                      <div className="catalog-admin-actions">
                        <button type="button" onClick={() => startEditProduct(p)}>
                          Editar
                        </button>
                        <button type="button" onClick={() => removeProduct(p.id)}>
                          Excluir
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
