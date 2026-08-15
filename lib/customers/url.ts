type CustomersUrlParams = {
  page?: number;
  q?: string;
  sort?: string;
  order?: string;
  projects?: string;
  notes?: string;
  status?: string;
};

export function buildCustomersUrl({
  page,
  q,
  sort,
  order,
  projects,
  notes,
  status,
}: CustomersUrlParams) {
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

  if (projects && projects !== "all") {
    params.set("projects", projects);
  }

  if (notes && notes !== "all") {
    params.set("notes", notes);
  }

  if (status && status !== "all") {
    params.set("status", status);
  }

  const query = params.toString();
  return query ? `/customers?${query}` : "/customers";
}
