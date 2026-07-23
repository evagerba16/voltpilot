import {
  Briefcase,
  CircleDollarSign,
  FileText,
  TrendingUp,
} from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency } from "@/lib/projects/format";

type ProjectsStatsProps = {
  activeProjects: number;
  estimatingProjects: number;
  proposalsSent: number;
  estimatedRevenue: number;
};

export function ProjectsStats({
  activeProjects,
  estimatingProjects,
  proposalsSent,
  estimatedRevenue,
}: ProjectsStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Active projects"
        value={String(activeProjects)}
        change="Open jobs in your pipeline"
        icon={Briefcase}
      />
      <StatCard
        title="Estimating"
        value={String(estimatingProjects)}
        change="Bids in progress"
        icon={FileText}
      />
      <StatCard
        title="Proposals sent"
        value={String(proposalsSent)}
        change="Waiting on a decision"
        icon={TrendingUp}
      />
      <StatCard
        title="Pipeline value"
        value={formatCurrency(estimatedRevenue)}
        change="Total estimated contract value"
        icon={CircleDollarSign}
      />
    </div>
  );
}
