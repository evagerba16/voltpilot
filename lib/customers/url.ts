type CustomersUrlParams = {
  page?: number;
  q?: string;
  sort?: string;
  order?: string;
};

export function buildCustomersUrl({
  page,
  q,
  sort,
  order,
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

  const query = params.toString();
  return query ? `/customers?${query}` : "/customers";
}
