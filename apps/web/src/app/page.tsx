"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ensureSession } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void ensureSession().then((ok) => {
      if (active) router.replace(ok ? "/dashboard" : "/login");
    });
    return () => {
      active = false;
    };
  }, [router]);

  return null;
}
