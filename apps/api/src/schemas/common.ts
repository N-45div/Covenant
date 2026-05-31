import { z } from "zod";

export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Expected an EVM address")
  .transform((value) => value.toLowerCase() as `0x${string}`);

export const policyTemplateIdSchema = z.enum([
  "conservative-investor",
  "dca-only",
  "tokenized-asset-basket",
  "agent-sandbox",
  "high-risk-with-approval"
]);

