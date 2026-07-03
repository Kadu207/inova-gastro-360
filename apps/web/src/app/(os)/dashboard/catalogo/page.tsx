"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import CatalogProductThumb from "@/components/catalog/CatalogProductThumb";
import ImageUploader from "@/components/catalog/ImageUploader";
import { API_BASE, formatBRL, getActiveBranchId, getToken } from "@/lib/api";

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

// Avaliado no load do módulo no browser (após login, com activeBranchId no storage)
const branchBase = `${API_BASE}/api/v1/branches/${getActiveBranchId()}/catalog/admin`;
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

function apiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  if (data.error === "forbidden") return "Sem permissão para esta filial — faça login novamente.";
  if (data.error === "validation_error") return "Dados inválidos — verifique os campos.";
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  return fallback;
}

export default function CatalogoAdminPage() {
  const [tab, setTab] = useState<"categories" | "products">("products");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const showMessage = useCallback((text: string, isError = false) => {
    setMessage(text);
    setMessageIsError(isError);
  }, []);

  const loadCategories = useCallback(async (): Promise<boolean> => {
    if (!getToken()) {
      showMessage("Sessão expirada — faça login novamente.", true);
      return false;
    }
    const res = await fetch(`${categoriesUrl}?includeInactive=1`, { headers: headers() });
    const data = (await res.json()) as { categories?: Category[] } & Record<string, unknown>;
    if (res.ok) {
      setCategories(data.categories ?? []);
      return true;
    }
    showMessage(apiErrorMessage(data, `Erro ao carregar categorias (${res.status})`), true);
    return false;
  }, [headers, showMessage]);

  const loadProducts = useCallback(async (): Promise<boolean> => {
    if (!getToken()) {
      showMessage("Sessão expirada — faça login novamente.", true);
      return false;
    }
    const res = await fetch(`${productsUrl}?includeUnavailable=1`, { headers: headers() });
    const data = (await res.json()) as { products?: Product[] } & Record<string, unknown>;
    if (res.ok) {
      setProducts(data.products ?? []);
      return true;
    }
    showMessage(apiErrorMessage(data, `Erro ao carregar produtos (${res.status})`), true);
    return false;
  }, [headers, showMessage]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    showMessage("");
    try {
      await Promise.all([loadCategories(), loadProducts()]);
    } finally {
      setLoading(false);
    }
  }, [loadCategories, loadProducts, showMessage]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selectableCategories = categories.filter((c) => c.is_active);
  const categoriesForSelect = selectableCategories.length > 0 ? selectableCategories : categories;

  useEffect(() => {
    if (!prodForm.categoryId && categoriesForSelect.length > 0) {
      setProdForm((f) => ({ ...f, categoryId: categoriesForSelect[0].id }));
    }
  }, [categoriesForSelect, prodForm.categoryId]);

  async function createCategory(e?: React.FormEvent) {
    e?.preventDefault();
    if (!getToken()) {
      showMessage("Sessão expirada — faça login novamente.", true);
      return;
    }
    if (!catForm.name.trim()) {
      showMessage("Informe o nome da categoria.", true);
      return;
    }
    setSaving(true);
    showMessage("");
    try {
      const res = await fetch(categoriesUrl, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          name: catForm.name.trim(),
          sortOrder: Number.parseInt(catForm.sortOrder, 10) || 0,
          isActive: true,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (res.ok) {
        setCatForm({ name: "", sortOrder: "0" });
        showMessage("Categoria adicionada.");
        await loadAll();
      } else {
        showMessage(apiErrorMessage(data, "Erro ao criar categoria"), true);
      }
    } catch {
      showMessage("Falha de rede ao criar categoria.", true);
    } finally {
      setSaving(false);
    }
  }

  async function saveCategoryEdit(id: string) {
    setSaving(true);
    showMessage("");
    try {
      const res = await fetch(`${categoriesUrl}/${id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({
          name: catEditForm.name.trim(),
          sortOrder: Number.parseInt(catEditForm.sortOrder, 10) || 0,
          isActive: catEditForm.isActive,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (res.ok) {
        setEditingCatId(null);
        showMessage("Categoria salva.");
        await loadAll();
      } else {
        showMessage(apiErrorMessage(data, "Erro ao salvar categoria"), true);
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(id: string) {
    if (!confirm("Excluir categoria? Só funciona se não houver produtos.")) return;
    const res = await fetch(`${categoriesUrl}/${id}`, { method: "DELETE", headers: headers() });
    const data = (await res.json()) as Record<string, unknown>;
    if (res.ok) {
      showMessage("Categoria excluída.");
      loadAll();
    } else {
      showMessage(
        data.error === "category_has_products" ? "Categoria possui produtos" : apiErrorMessage(data, "Erro"),
        true,
      );
    }
  }

  async function createProduct(e?: React.FormEvent) {
    e?.preventDefault();
    if (!getToken()) {
      showMessage("Sessão expirada — faça login novamente.", true);
      return;
    }
    if (categoriesForSelect.length === 0) {
      showMessage("Crie uma categoria antes de adicionar produtos.", true);
      setTab("categories");
      return;
    }
    const priceCents = parsePriceToCents(prodForm.price);
    if (!priceCents) {
      showMessage("Preço inválido — use formato 29,90", true);
      return;
    }
    if (!prodForm.name.trim()) {
      showMessage("Informe o nome do produto.", true);
      return;
    }
    setSaving(true);
    showMessage("");
    try {
      const res = await fetch(productsUrl, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          categoryId: prodForm.categoryId || categoriesForSelect[0].id,
          name: prodForm.name.trim(),
          description: prodForm.description.trim() || undefined,
          priceCents,
          isAvailable: prodForm.isAvailable,
        }),
      });
      const data = (await res.json()) as { product?: Product } & Record<string, unknown>;
      if (res.ok && data.product) {
        setProdForm((f) => ({ ...f, name: "", description: "", price: "" }));
        showMessage("Produto adicionado — envie a foto abaixo.");
        await loadProducts();
        setEditingProdId(data.product.id);
        setProdEditForm({
          name: data.product.name,
          description: data.product.description ?? "",
          price: centsToInput(data.product.price_cents),
          categoryId: data.product.category_id,
          isAvailable: data.product.is_available,
          imageUrl: data.product.image_url,
        });
      } else if (res.ok) {
        setProdForm((f) => ({ ...f, name: "", description: "", price: "" }));
        showMessage("Produto adicionado.");
        loadProducts();
      } else {
        showMessage(apiErrorMessage(data, "Erro ao criar produto"), true);
      }
    } catch {
      showMessage("Falha de rede ao criar produto.", true);
    } finally {
      setSaving(false);
    }
  }

  async function saveProductEdit(id: string) {
    const priceCents = parsePriceToCents(prodEditForm.price);
    if (!priceCents) {
      showMessage("Preço inválido", true);
      return;
    }
    setSaving(true);
    showMessage("");
    try {
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
      const data = (await res.json()) as Record<string, unknown>;
      if (res.ok) {
        setEditingProdId(null);
        showMessage("Produto salvo.");
        loadProducts();
      } else {
        showMessage(apiErrorMessage(data, "Erro ao salvar produto"), true);
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id: string) {
    if (!confirm("Excluir produto? Falha se já estiver em pedidos.")) return;
    const res = await fetch(`${productsUrl}/${id}`, { method: "DELETE", headers: headers() });
    const data = (await res.json()) as Record<string, unknown>;
    if (res.ok) loadProducts();
    else {
      showMessage(
        data.error === "product_has_orders" ? "Produto em pedidos — indisponibilize" : apiErrorMessage(data, "Erro"),
        true,
      );
    }
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
    showMessage("");
  }

  const canAddProduct = categoriesForSelect.length > 0 && !loading;

  return (
    <div className="os-page catalog-admin-page">
      <div className="catalog-admin-header">
        <div>
          <h2>Gestão do cardápio</h2>
          <p className="catalog-sub">
            Categorias, produtos e fotos da filial demo. Para enviar foto, use <strong>Editar</strong> no produto.
          </p>
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

      {message && (
        <p className={messageIsError ? "catalog-message catalog-message-error" : "catalog-message catalog-message-ok"}>
          {message}
        </p>
      )}

      {tab === "categories" && (
        <>
          <form
            className="catalog-admin-form"
            onSubmit={(e) => {
              e.preventDefault();
              void createCategory(e);
            }}
          >
            <h3>Nova categoria</h3>
            <div className="catalog-admin-form-row">
              <label>
                Nome
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex.: Pizzas, Porções"
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
              <button
                type="button"
                className="catalog-admin-btn-primary"
                disabled={saving}
                onClick={() => void createCategory()}
              >
                {saving ? "Salvando…" : "Adicionar"}
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
                        type="text"
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
                      <button type="button" disabled={saving} onClick={() => saveCategoryEdit(c.id)}>
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
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(c.id);
                            setCatEditForm({
                              name: c.name,
                              sortOrder: String(c.sort_order),
                              isActive: c.is_active,
                            });
                          }}
                        >
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
          {!canAddProduct && !loading && (
            <p className="catalog-message catalog-message-error">
              Nenhuma categoria disponível — adicione uma categoria na aba Categorias primeiro.
            </p>
          )}

          <form
            className="catalog-admin-form"
            onSubmit={(e) => {
              e.preventDefault();
              void createProduct(e);
            }}
          >
            <h3>Novo produto</h3>
            <div className="catalog-admin-form-row">
              <label>
                Nome
                <input
                  type="text"
                  value={prodForm.name}
                  onChange={(e) => setProdForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label>
                Preço (R$)
                <input
                  type="text"
                  inputMode="decimal"
                  value={prodForm.price}
                  onChange={(e) => setProdForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="29,90"
                />
              </label>
              <label>
                Categoria
                <select
                  value={prodForm.categoryId}
                  onChange={(e) => setProdForm((f) => ({ ...f, categoryId: e.target.value }))}
                  disabled={categoriesForSelect.length === 0}
                >
                  {categoriesForSelect.map((c) => (
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
              <button
                type="button"
                className="catalog-admin-btn-primary"
                disabled={!canAddProduct || saving}
                onClick={() => void createProduct()}
              >
                {saving ? "Salvando…" : "Adicionar"}
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
            <p className="catalog-admin-hint">
              Após adicionar, o formulário de foto abre automaticamente. Também pode clicar em <strong>Editar</strong>{" "}
              em qualquer produto da lista.
            </p>
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
                          type="text"
                          value={prodEditForm.name}
                          onChange={(e) => setProdEditForm((f) => ({ ...f, name: e.target.value }))}
                        />
                        <input
                          type="text"
                          inputMode="decimal"
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
                      <div className="catalog-admin-photo-block">
                        <h4>Foto do produto</h4>
                        <p className="catalog-admin-hint">JPEG, PNG ou WebP — até 5 MB</p>
                        <ImageUploader
                          productId={p.id}
                          currentImageUrl={prodEditForm.imageUrl}
                          onUploaded={(url) => {
                            setProdEditForm((f) => ({ ...f, imageUrl: url }));
                            loadProducts();
                            showMessage("Foto enviada com sucesso.");
                          }}
                        />
                      </div>
                      <div className="catalog-admin-actions">
                        <button type="button" disabled={saving} onClick={() => saveProductEdit(p.id)}>
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
                            {!p.image_url && " · sem foto"}
                          </span>
                        </span>
                      </div>
                      <div className="catalog-admin-actions">
                        <button type="button" onClick={() => startEditProduct(p)}>
                          Editar / Foto
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
