import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function OpLink({ type, id, className, children }: { type: string; id: string; className?: string; children: ReactNode }) {
  if (type === "receipt") return <Link to="/receipts/$id" params={{ id }} className={className}>{children}</Link>;
  if (type === "delivery") return <Link to="/deliveries/$id" params={{ id }} className={className}>{children}</Link>;
  return <Link to="/transfers/$id" params={{ id }} className={className}>{children}</Link>;
}
