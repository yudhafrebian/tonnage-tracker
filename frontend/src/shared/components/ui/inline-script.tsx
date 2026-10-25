"use client";

// Pola dari dokumentasi Next ("Preventing Flash"): skrip inline tetap jalan saat HTML pertama
// di-parse, tetapi saat React merender ulang di browser (mis. halaman 404 di root) tipenya
// "text/plain", jadi tidak dieksekusi ulang dan React tidak memperingatkan tag <script>.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
