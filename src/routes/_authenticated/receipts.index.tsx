import { createFileRoute } from "@tanstack/react-router";
import { OperationsList } from "@/components/operations/OperationsList";

export const Route = createFileRoute("/_authenticated/receipts/")({
  head: () => ({
    meta: [
      { title: "Receipts — StockSense" },
      { name: "description", content: "Incoming goods from suppliers. Validating a receipt increases stock and writes to the ledger." },
      { property: "og:title", content: "Receipts — StockSense" },
      { property: "og:description", content: "Incoming goods from suppliers. Validating a receipt increases stock and writes to the ledger." },
    ],
  }),
  component: () => <OperationsList type="receipt" description="Incoming goods from suppliers. Validating a receipt increases stock and writes to the ledger." />,
});
