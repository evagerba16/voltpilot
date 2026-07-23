"use client";

import { formatCurrency, formatPercent } from "@/lib/estimates/calculations";
import type { EstimateTotals } from "@/lib/estimates/types";

type EstimateSummaryProps = {
  totals: EstimateTotals;
  overheadPercent: number;
  contingencyPercent: number;
  profitMarginPercent: number;
  taxPercent: number;
  onOverheadChange: (value: number) => void;
  onContingencyChange: (value: number) => void;
  onProfitMarginChange: (value: number) => void;
  onTaxChange: (value: number) => void;
};

const percentInputClassName =
  "h-8 w-20 rounded border border-input bg-background px-2 text-right text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

function SummaryRow({
  label,
  amount,
  percent,
  onPercentChange,
  emphasized = false,
  muted = false,
}: {
  label: string;
  amount: number;
  percent?: number;
  onPercentChange?: (value: number) => void;
  emphasized?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={
        emphasized
          ? "flex items-center justify-between border-t border-border pt-3"
          : "flex items-center justify-between py-1.5"
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={
            emphasized
              ? "text-sm font-semibold"
              : muted
                ? "text-xs text-muted-foreground"
                : "text-sm text-muted-foreground"
          }
        >
          {label}
        </span>
        {onPercentChange ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              step="0.1"
              value={Number.isFinite(percent) ? percent : 0}
              onChange={(event) => onPercentChange(Number(event.target.value))}
              className={percentInputClassName}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        ) : null}
      </div>
      <span
        className={
          emphasized
            ? "text-lg font-bold tabular-nums"
            : muted
              ? "text-xs font-medium tabular-nums text-muted-foreground"
              : "text-sm font-medium tabular-nums"
        }
      >
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

export function EstimateSummary({
  totals,
  overheadPercent,
  contingencyPercent,
  profitMarginPercent,
  taxPercent,
  onOverheadChange,
  onContingencyChange,
  onProfitMarginChange,
  onTaxChange,
}: EstimateSummaryProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">Estimate summary</h2>
        <p className="text-sm text-muted-foreground">
          Adjust markups and see your bid price update as you edit line items.
        </p>
      </div>

      <div className="space-y-1 px-5 py-4">
        <p className="pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Direct costs
        </p>
        <SummaryRow label="Total labor cost" amount={totals.laborTotal} muted />
        <SummaryRow label="Total material cost" amount={totals.materialsTotal} muted />
        <SummaryRow label="Total equipment cost" amount={totals.equipmentTotal} muted />
        <SummaryRow
          label="Total subcontractor cost"
          amount={totals.subcontractorsTotal}
          muted
        />
        <SummaryRow
          label="Miscellaneous costs"
          amount={totals.miscellaneousTotal}
          muted
        />
        <SummaryRow label="Total direct cost" amount={totals.directCost} />

        <p className="border-t border-border/60 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Markups
        </p>
        <SummaryRow
          label="Overhead"
          amount={totals.overheadAmount}
          percent={overheadPercent}
          onPercentChange={onOverheadChange}
        />
        <SummaryRow
          label="Contingency"
          amount={totals.contingencyAmount}
          percent={contingencyPercent}
          onPercentChange={onContingencyChange}
        />
        <SummaryRow
          label="Profit"
          amount={totals.profitAmount}
          percent={profitMarginPercent}
          onPercentChange={onProfitMarginChange}
        />
        <SummaryRow
          label="Tax"
          amount={totals.taxAmount}
          percent={taxPercent}
          onPercentChange={onTaxChange}
        />

        <SummaryRow
          label="Final selling price"
          amount={totals.finalSellingPrice}
          emphasized
        />

        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
          <span className="text-sm font-medium">Gross margin</span>
          <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatPercent(totals.grossMarginPercent)}
          </span>
        </div>
      </div>
    </div>
  );
}
