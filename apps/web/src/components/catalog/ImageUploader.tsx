"use client";

import { useRef, useState } from "react";
import { API_BASE, getActiveBranchId, getToken } from "@/lib/api";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5_242_880;

type Props = {
  productId: string;
  currentImageUrl?: string | null;
  onUploaded: (publicUrl: string | null) => void;
};

export default function ImageUploader({ productId, currentImageUrl, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const base = `${API_BASE}/api/v1/branches/${getActiveBranchId()}/catalog/admin/products/${productId}`;

  function authHeaders(json = false): Record<string, string> {
    const token = getToken();
    const h: Record<string, string> = {};
    if (token) h.authorization = `Bearer ${token}`;
    if (json) h["content-type"] = "application/json";
    return h;
  }

  async function patchImageUrl(publicUrl: string | null) {
    const res = await fetch(base, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify({ imageUrl: publicUrl }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Erro ao salvar URL da imagem");
    }
    onUploaded(publicUrl);
  }

  async function uploadMultipart(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${base}/image`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    let data: { message?: string; error?: string; publicUrl?: string; product?: { image_url?: string } };
    try {
      data = await res.json();
    } catch {
      throw new Error(res.ok ? "Resposta inválida da API" : `Upload falhou (${res.status})`);
    }
    if (!res.ok) {
      throw new Error(data.message ?? data.error ?? `Upload falhou (${res.status})`);
    }
    onUploaded(data.publicUrl ?? data.product?.image_url ?? null);
  }

  async function uploadImage(file: File) {
    await uploadMultipart(file);
  }

  async function handleFile(file: File) {
    if (!getToken()) {
      setMessage("Sessão expirada — faça login novamente.");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage("Use JPEG, PNG ou WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      setMessage("Arquivo acima de 5MB");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      await uploadImage(file);
      setMessage("Foto enviada");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Erro no upload";
      setMessage(
        text === "Failed to fetch"
          ? "Falha de rede — verifique login e tente novamente"
          : text,
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeImage() {
    if (!confirm("Remover foto do produto?")) return;
    setBusy(true);
    setMessage("");
    try {
      await patchImageUrl(null);
      setMessage("Foto removida");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="catalog-image-uploader">
      <input
        ref={inputRef}
        id={`photo-${productId}`}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        disabled={busy}
        className="catalog-image-uploader-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <button
        type="button"
        className="catalog-admin-btn-primary catalog-image-uploader-btn"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Enviando…" : currentImageUrl ? "Trocar foto" : "Escolher foto"}
      </button>
      {currentImageUrl && (
        <button type="button" className="catalog-image-uploader-remove" disabled={busy} onClick={() => void removeImage()}>
          Remover foto
        </button>
      )}
      {message && (
        <span className={message.includes("enviada") ? "catalog-message-ok" : "catalog-admin-meta"}>{message}</span>
      )}
    </div>
  );
}
