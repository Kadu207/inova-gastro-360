"use client";

import { useState } from "react";
import { productDisplayImage, productInitial } from "@/lib/cardapio";

type Props = {
  name: string;
  imageUrl?: string | null;
};

export default function CatalogProductThumb({ name, imageUrl }: Props) {
  const src = productDisplayImage(imageUrl);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const showImage = src && !failed;

  return (
    <div className={`catalog-product-thumb${showImage && !loaded ? " is-loading" : ""}`} aria-hidden>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={loaded ? "is-loaded" : ""}
        />
      ) : (
        <span className="catalog-product-initial">{productInitial(name)}</span>
      )}
    </div>
  );
}
