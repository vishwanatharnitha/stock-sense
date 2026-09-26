import { createFileRoute } from "@tanstack/react-router";
import { OperationsList } from "@/components/operations/OperationsList";

export const Route = createFileRoute("/_authenticated/transfers/")({
  head: () => ({
    meta: [
      { title: "Internal Transfers — StockSense" },
      { name: "description", content: "Move stock between warehouses and locations without changing company totals." },
      { property: "og:title", content: "Internal Transfers — StockSense" },
      { property: "og:description", content: "Move stock between warehouses and locations without changing company totals." },
    ],
  }),
  component: () => <OperationsList type="transfer" description="Move stock between warehouses and locations without changing company totals." />,
});
