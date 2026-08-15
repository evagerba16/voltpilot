import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";

type DashboardHeaderProps = {
  organizationName: string;
  displayName: string;
  isPortfolioEmpty: boolean;
};

export function DashboardHeader({
  organizationName,
  displayName,
  isPortfolioEmpty,
}: DashboardHeaderProps) {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        <DashboardGreeting displayName={displayName} />
      </h1>
      <p className="text-sm text-muted-foreground">
        {isPortfolioEmpty
          ? "Your morning briefing starts here."
          : organizationName}
      </p>
    </header>
  );
}
