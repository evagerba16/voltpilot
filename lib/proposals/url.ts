type ProposalsUrlParams = {
  page?: number;
  q?: string;
  status?: string;
  project?: string;
  sort?: string;
  order?: string;
};

export function buildProposalsUrl({
  page,
  q,
  status,
  project,
  sort,
  order,
}: ProposalsUrlParams) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
  if (status) params.set("status", status);
  if (project) params.set("project", project);
  if (sort) params.set("sort", sort);
  if (order) params.set("order", order);

  const query = params.toString();
  return query ? `/proposals?${query}` : "/proposals";
}
