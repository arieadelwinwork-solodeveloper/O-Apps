import { apiFetch } from "./api";

export interface BusinessUser {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  base_salary: number;
}

export async function listUsers(): Promise<BusinessUser[]> {
  const { users } = await apiFetch<{ users: BusinessUser[] }>("/api/users");
  return users;
}

export async function updateUserSalary(
  userId: string,
  baseSalary: number
): Promise<void> {
  await apiFetch(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ baseSalary }),
  });
}
