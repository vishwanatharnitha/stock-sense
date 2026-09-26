import { createFileRoute } from "@tanstack/react-router";
import { OperationsList } from "@/components/operations/OperationsList";

export const Route = createFileRoute("/_authenticated/deliveries/")({
  head: () => ({
    meta: [
      { title: "Delivery Orders — StockSense" },
      { name: "description", content: "Outgoing shipments to customers. Deliveries cannot exceed available stock." },
      { property: "og:title", content: "Delivery Orders — StockSense" },
      { property: "og:description", content: "Outgoing shipments to customers. Deliveries cannot exceed available stock." },
    ],
  }),
  component: () => <OperationsList type="delivery" description="Outgoing shipments to customers. Deliveries cannot exceed available stock." />,
});
