import { createFileRoute } from "@tanstack/react-router";
import { OperationDetail } from "@/components/operations/OperationDetail";

export const Route = createFileRoute("/_authenticated/transfers/$id")({
  head: () => ({
    meta: [
      { title: "Internal Transfer document — StockSense" },
      { name: "description", content: "Document lines, availability and validation for this operation." },
      { property: "og:title", content: "Internal Transfers — StockSense" },
      { property: "og:description", content: "Document lines, availability and validation for this operation." },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <OperationDetail type="transfer" id={id} />;
}
