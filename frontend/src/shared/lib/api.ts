import axios from "axios";

const api = axios.create({
  // Relatif: request ke origin frontend sendiri, lalu diteruskan ke backend oleh rewrites di
  // next.config.ts. Cookie login jadi milik domain frontend, sehingga proxy.ts bisa membacanya
  // walau frontend (Vercel) dan backend (Render) beda domain.
  baseURL: "/api/v1",
  withCredentials: true,
  // Wajib untuk POST/PUT/DELETE: backend menolak tanpa header ini (proteksi CSRF).
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

// Request dengan responseType "blob" (mis. export Excel) juga menerima body ERROR sebagai Blob.
// Ubah kembali ke JSON supaya apiErrorMessage bisa membaca error.code seperti request lain.
api.interceptors.response.use(undefined, async (error) => {
  const data = axios.isAxiosError(error) ? error.response?.data : undefined;
  if (data instanceof Blob && data.type.includes("json")) {
    try {
      error.response.data = JSON.parse(await data.text());
    } catch {
      // Bukan JSON valid: biarkan apa adanya.
    }
  }
  return Promise.reject(error);
});

export default api;