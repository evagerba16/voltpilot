"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { CreateEstimateDialog } from "@/components/estimates/create-estimate-dialog";
import { EstimatesTable } from "@/components/estimates/estimates-table";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPageHeader } from "@/components/ui/list-page-header";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { cardClassName } from "@/lib/ui/form-classes";
import type { ProjectOption } from "@/lib/estimates/queries";
import type { EstimateListItem } from "@/lib/estimates/types";
import { buildEstimatesUrl } from "@/lib/estimates/url";

type EstimatesViewProps = {
  estimates: EstimateListItem[];
  projects: ProjectOption[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  projectFilter: string;
};

export function EstimatesView({
  estimates,
  projects,
  total,
  page,
  totalPages,
  search,
  projectFilter,
}: EstimatesViewProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEdit = can("estimates.edit");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const selectedProject = projects.find((project) => project.id === projectFilter);

  const navigate = useCallback(
    (params: { q?: string; project?: string }) => {
      router.replace(
        buildEstimatesUrl({
          q: params.q ?? search,
          project: params.project ?? projectFilter,
          page: 1,
        })
      );
    },
    [router, search, projectFilter]
  );

  const handleSearchChange = useCallback(
    (query: string) => navigate({ q: query }),
    [navigate]
  );

  const chips = [
    projectFilter && selectedProject
      ? {
          key: "project",
          label: "Project",
          value: selectedProject.project_name,
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

  return (
    <>
      <div className={cardClassName}>
        <ListPageHeader
          title="Estimate library"
          description="All your job estimates in one place—open any estimate to price line items and build proposals."
          action={
            canEdit ? (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus data-icon="inline-start" />
                Add estimate
              </Button>
            ) : undefined
          }
        />

        <FilterBar
          search={search}
          searchPlaceholder="Search by estimate title or notes..."
          onSearchChange={handleSearchChange}
          chips={chips}
          onClearChip={(key) => {
            if (key === "project") {
              navigate({ project: "" });
            }
          }}
          onClearAll={() => router.push(buildEstimatesUrl({ page: 1 }))}
          filters={
            <FilterSelect
              label="Filter by project"
              value={projectFilter}
              onChange={(value) => navigate({ project: value })}
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name} — {project.customer.company_name}
                </option>
              ))}
            </FilterSelect>
          }
        />
      </div>

      <EstimatesTable
        estimates={estimates}
        projects={projects}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        projectFilter={projectFilter}
        onCreateEstimate={canEdit ? () => setCreateDialogOpen(true) : undefined}
      />

      {canEdit ? (
        <CreateEstimateDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          projects={projects}
          defaultProjectId={projectFilter}
        />
      ) : null}
    </>
  );
}
