import {
  FileText,
  FolderKanban,
  Send,
  CircleDollarSign,
} from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency } from "@/lib/proposals/format";

type ProposalsStatsProps = {
  draft: number;
  sent: number;
  won: number;
  pipeline: number;
};

export function ProposalsStats({ draft, sent, won, pipeline }: ProposalsStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="In progress" value={String(draft)} icon={FileText} />
      <StatCard title="Sent or viewed" value={String(sent)} icon={Send} />
      <StatCard title="Accepted" value={String(won)} change="Won proposals" icon={FolderKanban} />
      <StatCard
        title="Open pipeline"
        value={formatCurrency(pipeline)}
        change="In progress + sent value"
        icon={CircleDollarSign}
      />
    </div>
  );
}
