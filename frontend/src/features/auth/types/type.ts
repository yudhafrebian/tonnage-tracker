import { Role } from "@/shared/lib/permissions";

export interface ILoginPayload {
  username: string;
  password: string;
}

export interface IChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export type Me = {
    id:string;
    username: string;
    name: string;
    role: Role;
}