// Memicu "Save file" di browser untuk data yang sudah ada di memori (mis. hasil export).
// Di luar komponen: React Compiler melarang komponen menyentuh DOM global seperti ini.
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Lepas memori blob setelah browser mulai mengunduh.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
