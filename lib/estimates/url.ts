type EstimatesUrlParams = {
  page?: number;
  q?: string;
  project?: string;
};

export function buildEstimatesUrl({ page, q, project }: EstimatesUrlParams) {
  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (project) {
    params.set("project", project);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/estimates?${query}` : "/estimates";
}
