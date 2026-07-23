import type { ProjectArchiveFilter } from "@/lib/projects/types";

type ProjectsUrlParams = {
  page?: number;
  q?: string;
  sort?: string;
  order?: string;
  view?: ProjectArchiveFilter;
  status?: string;
  type?: string;
  customer?: string;
};

export function buildProjectsUrl({
  page,
  q,
  sort,
  order,
  view,
  status,
  type,
  customer,
}: ProjectsUrlParams) {
  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  if (sort) {
    params.set("sort", sort);
  }

  if (order) {
    params.set("order", order);
  }

  if (view && view !== "active") {
    params.set("view", view);
  }

  if (status) {
    params.set("status", status);
  }

  if (type) {
    params.set("type", type);
  }

  if (customer) {
    params.set("customer", customer);
  }

  const query = params.toString();
  return query ? `/projects?${query}` : "/projects";
}
