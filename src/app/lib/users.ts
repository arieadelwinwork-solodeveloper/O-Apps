import { apiFetch } from "./api";
import type { EmployeeListItem } from "../types";

export interface BusinessUser {
  id: string;
  full_name: string;
  email?: string | null;
  role: string;
  is_active: boolean;
  base_salary: number;
  created_at?: string;
}

export async function listUsers(): Promise<BusinessUser[]> {
  const { users } = await apiFetch<{ users: BusinessUser[] }>("/api/users");
  return users;
}

export function toEmployeeListItem(u: BusinessUser): EmployeeListItem {
  return {
    id: u.id,
    name: u.full_name,
    email: u.email ?? null,
    role: u.role as EmployeeListItem["role"],
    isActive: u.is_active,
    baseSalary: u.base_salary,
    joinedAt: u.created_at ?? new Date().toISOString(),
  };
}

export async function createEmployee(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  baseSalary?: number;
}): Promise<void> {
  await apiFetch("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateEmployee(
  userId: string,
  patch: {
    fullName?: string;
    baseSalary?: number;
    isActive?: boolean;
  }
): Promise<void> {
  await apiFetch(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function updateUserSalary(
  userId: string,
  baseSalary: number
): Promise<void> {
  await updateEmployee(userId, { baseSalary });
}

export async function updateEmployeeStatus(
  userId: string,
  isActive: boolean
): Promise<void> {
  await apiFetch(`/api/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}
