import { notFound } from "next/navigation";

// notFound() menghentikan render, jadi segment ini tidak bisa divalidasi sebagai instant.
export const instant = false;

// Root layout ada di [lang], jadi URL yang tidak cocok dengan route mana pun tidak otomatis
// memakai [lang]/not-found.tsx. Catch-all ini mengarahkannya ke sana (dengan tema & bahasa aplikasi).
export default function MissingPage() {
  notFound();
}
