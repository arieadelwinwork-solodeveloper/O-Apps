import { apiFetch } from "./api";
import type {
  Service,
  ServiceStage,
  MessageTemplate,
  CommissionType,
  TemplateType,
  ServiceUnit,
} from "../types";

// ---------- Services ----------
export interface ServiceInput {
  name: string;
  price: number;
  unit: ServiceUnit;
  isActive?: boolean;
}

export async function listServices(): Promise<Service[]> {
  const { services } = await apiFetch<{ services: Service[] }>("/api/services");
  return services;
}

export async function createService(input: ServiceInput): Promise<Service> {
  const { service } = await apiFetch<{ service: Service }>("/api/services", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return service;
}

export async function updateService(
  id: string,
  input: Partial<ServiceInput>
): Promise<void> {
  await apiFetch(`/api/services/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteService(id: string): Promise<void> {
  await apiFetch(`/api/services/${id}`, { method: "DELETE" });
}

// ---------- Service stages ----------
export interface StageInput {
  name: string;
  sortOrder?: number;
  commissionType: CommissionType;
  commissionValue: number;
}

export async function createStage(
  serviceId: string,
  input: StageInput
): Promise<ServiceStage> {
  const { stage } = await apiFetch<{ stage: ServiceStage }>(
    `/api/services/${serviceId}/stages`,
    { method: "POST", body: JSON.stringify(input) }
  );
  return stage;
}

export async function updateStage(
  serviceId: string,
  stageId: string,
  input: Partial<StageInput>
): Promise<void> {
  await apiFetch(`/api/services/${serviceId}/stages/${stageId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteStage(
  serviceId: string,
  stageId: string
): Promise<void> {
  await apiFetch(`/api/services/${serviceId}/stages/${stageId}`, {
    method: "DELETE",
  });
}

// ---------- Templates ----------
export interface TemplateInput {
  type: TemplateType;
  name: string;
  body: string;
  isDefault?: boolean;
}

export async function listTemplates(): Promise<MessageTemplate[]> {
  const { templates } = await apiFetch<{ templates: MessageTemplate[] }>(
    "/api/templates"
  );
  return templates;
}

export async function createTemplate(
  input: TemplateInput
): Promise<MessageTemplate> {
  const { template } = await apiFetch<{ template: MessageTemplate }>(
    "/api/templates",
    { method: "POST", body: JSON.stringify(input) }
  );
  return template;
}

export async function updateTemplate(
  id: string,
  input: Partial<TemplateInput>
): Promise<void> {
  await apiFetch(`/api/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiFetch(`/api/templates/${id}`, { method: "DELETE" });
}
