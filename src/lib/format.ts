import { format, formatDistanceToNow } from "date-fns";

export const fmtNum = (n: number | null | undefined, digits = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(Number(n ?? 0));

export const fmtMoney = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n ?? 0));

export const fmtDate = (d: string | null | undefined) => (d ? format(new Date(d), "dd MMM yyyy") : "—");
export const fmtDateTime = (d: string | null | undefined) => (d ? format(new Date(d), "dd MMM yyyy, HH:mm") : "—");
export const fmtAgo = (d: string | null | undefined) => (d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : "—");

export function friendlyError(e: unknown): string {
  const err = e as { message?: string; code?: string };
  if (err?.code === "23505") {
    if (err.message?.includes("sku")) return "A product with this SKU already exists.";
    return "This record already exists.";
  }
  if (err?.code === "23503") return "This record is referenced elsewhere and cannot be removed.";
  if (err?.code === "23514") return "One of the values is invalid (quantities must be positive).";
  return err?.message ?? "Something went wrong. Please try again.";
}
