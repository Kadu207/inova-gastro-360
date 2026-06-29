"use client";

import { useRef, useState } from "react";
import { API_BASE, DEMO_BRANCH_ID, getToken } from "@/lib/api";

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

  const base = `${API_BASE}/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/products/${productId}`;

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
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? data.error ?? "Upload falhou");
    onUploaded(data.publicUrl ?? data.product?.image_url ?? null);
  }

  async function uploadPresign(file: File) {
    const presignRes = await fetch(`${base}/image/presign`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ contentType: file.type, contentLength: file.size }),
    });
    const presignData = await presignRes.json();

    if (presignRes.status === 503 && presignData.error === "storage_not_configured") {
      await uploadMultipart(file);
      return;
    }
    if (!presignRes.ok) {
      throw new Error(presignData.error ?? "Presign falhou");
    }

    const putRes = await fetch(presignData.uploadUrl, {
      method: presignData.method ?? "PUT",
      headers: presignData.headers ?? { "Content-Type": file.type },
      body: file,
    });

    if (!putRes.ok) {
      await uploadMultipart(file);
      return;
    }

    await patchImageUrl(presignData.publicUrl);
  }

  async function handleFile(file: File) {
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
      await uploadPresign(file);
      setMessage("Foto enviada");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro no upload");
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
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {currentImageUrl && (
        <button type="button" disabled={busy} onClick={() => void removeImage()}>
          Remover foto
        </button>
      )}
      {message && <span className="catalog-admin-meta">{message}</span>}
    </div>
  );
}
