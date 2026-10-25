import api from "@/shared/lib/api";
import { IChangePasswordPayload, ILoginPayload } from "../types/type";

export const loginApi = async (payload: ILoginPayload) => {
  const res = await api.post("/auth/login", payload);

  return res.data;
};

export const logoutApi = async () => {
  const res = await api.post("/auth/logout");

  return res.data;
};

export const meApi = async () => {
  const res = await api.get("/auth/me");

  return res.data;
};

export const changePasswordApi = async (payload: IChangePasswordPayload) => {
  // POST, sama dengan route backend (auth.routes.ts). Sukses = 204 tanpa body.
  const res = await api.post("/auth/change-password", payload);

  return res.data;
};
