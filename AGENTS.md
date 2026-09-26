<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# StockSense — architecture rules

- All stock changes go through database procedures (`confirm_operation`, `validate_operation`, `cancel_operation`, `apply_adjustment`); clients have read-only access to `stock`, `adjustments`, `stock_ledger` — guarantees stock and ledger change atomically together.
- Receipts, deliveries and transfers share one `operations` + `operation_lines` model with a `type` column — one workflow, one validator, less duplicated logic.
- UI reads/writes only via `src/services/inventory.ts` (query options + mutations); pure derivations live in `src/lib/inventory-logic.ts` — keeps pages thin and data access in one place.
- Single-company workspace: every signed-in user shares inventory data (RLS `to authenticated`) — matches a team inventory tool.
- Light forest-and-mint design system in `src/styles.css`, with JetBrains Mono headings and Work Sans body; use `panel`, `num`, `grid-bg` utilities — keeps the selected presentation consistent.
- Public stock demo is a self-contained in-memory simulation and never writes inventory data — protects real stock while allowing visitors to explore the movement flow.
