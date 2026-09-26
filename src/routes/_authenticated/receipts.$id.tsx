import { createFileRoute } from "@tanstack/react-router";
import { OperationDetail } from "@/components/operations/OperationDetail";

export const Route = createFileRoute("/_authenticated/receipts/$id")({
  head: () => ({
    meta: [
      { title: "Receipt document — StockSense" },
      { name: "description", content: "Document lines, availability and validation for this operation." },
      { property: "og:title", content: "Receipts — StockSense" },
      { property: "og:description", content: "Document lines, availability and validation for this operation." },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <OperationDetail type="receipt" id={id} />;
}
