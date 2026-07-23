import {
  DollarSign,
  FileText,
  FolderKanban,
  Percent,
  PencilLine,
} from "lucide-react";

export const MOCK_COMPANY_NAME = "Apex Electric Co.";

export const dashboardStats = [
  {
    title: "Active Projects",
    value: "24",
    change: "+3 from last month",
    changeType: "positive" as const,
    icon: FolderKanban,
  },
  {
    title: "Draft Estimates",
    value: "18",
    change: "6 due this week",
    changeType: "neutral" as const,
    icon: PencilLine,
  },
  {
    title: "Proposals Sent",
    value: "42",
    change: "+8 from last month",
    changeType: "positive" as const,
    icon: FileText,
  },
  {
    title: "Estimated Revenue",
    value: "$4.2M",
    change: "+12.4% YoY",
    changeType: "positive" as const,
    icon: DollarSign,
  },
  {
    title: "Average Project Margin",
    value: "28.4%",
    change: "+1.2% from last month",
    changeType: "positive" as const,
    icon: Percent,
  },
];

export const recentActivity = [
  {
    id: "1",
    action: "Proposal sent",
    project: "Riverside Medical Center — Phase 2",
    user: "James Rivera",
    time: "2 hours ago",
  },
  {
    id: "2",
    action: "Estimate approved",
    project: "Downtown Office Tower — Electrical",
    user: "Maria Santos",
    time: "5 hours ago",
  },
  {
    id: "3",
    action: "New project created",
    project: "Westfield Distribution Hub",
    user: "David Kim",
    time: "Yesterday",
  },
  {
    id: "4",
    action: "Estimate revised",
    project: "Harborview Retail Complex",
    user: "Sarah Chen",
    time: "Yesterday",
  },
  {
    id: "5",
    action: "Customer added",
    project: "Summit Health Partners",
    user: "James Rivera",
    time: "2 days ago",
  },
];
