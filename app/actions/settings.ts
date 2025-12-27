"use server";

import { prisma } from "@/lib/db";
import { createReadwiseClient } from "@/lib/readwise";
import { revalidatePath } from "next/cache";

export interface TriageSettings {
  staleNewsThreshold: number;
  staleArticleThreshold: number;
  staleDefaultThreshold: number;
}

export async function getSettings() {
  const settings = await prisma.settings.findUnique({
    where: { id: "main" },
  });
  return settings;
}

export async function getTriageSettings(): Promise<TriageSettings> {
  const settings = await prisma.settings.findUnique({
    where: { id: "main" },
    select: {
      staleNewsThreshold: true,
      staleArticleThreshold: true,
      staleDefaultThreshold: true,
    },
  });
  return {
    staleNewsThreshold: settings?.staleNewsThreshold ?? 30,
    staleArticleThreshold: settings?.staleArticleThreshold ?? 90,
    staleDefaultThreshold: settings?.staleDefaultThreshold ?? 180,
  };
}

export async function saveTriageSettings(settings: TriageSettings) {
  await prisma.settings.upsert({
    where: { id: "main" },
    update: {
      staleNewsThreshold: settings.staleNewsThreshold,
      staleArticleThreshold: settings.staleArticleThreshold,
      staleDefaultThreshold: settings.staleDefaultThreshold,
    },
    create: {
      id: "main",
      staleNewsThreshold: settings.staleNewsThreshold,
      staleArticleThreshold: settings.staleArticleThreshold,
      staleDefaultThreshold: settings.staleDefaultThreshold,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/triage");

  return { success: true };
}

export async function saveApiToken(token: string) {
  // Validate the token first
  const client = createReadwiseClient(token);
  const isValid = await client.validateToken();

  if (!isValid) {
    return { success: false, error: "Invalid API token" };
  }

  // Save the token
  await prisma.settings.upsert({
    where: { id: "main" },
    update: { apiToken: token },
    create: { id: "main", apiToken: token },
  });

  revalidatePath("/settings");
  revalidatePath("/");

  return { success: true };
}

export async function hasApiToken() {
  const settings = await prisma.settings.findUnique({
    where: { id: "main" },
    select: { apiToken: true },
  });
  return Boolean(settings?.apiToken);
}

export async function getApiToken() {
  const settings = await prisma.settings.findUnique({
    where: { id: "main" },
    select: { apiToken: true },
  });
  return settings?.apiToken ?? null;
}

export async function deleteApiToken() {
  await prisma.settings.update({
    where: { id: "main" },
    data: { apiToken: null },
  });

  revalidatePath("/settings");
  revalidatePath("/");

  return { success: true };
}

