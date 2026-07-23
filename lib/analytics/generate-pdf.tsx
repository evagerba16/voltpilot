import { renderToBuffer } from "@react-pdf/renderer";

import { AnalyticsPdfDocument } from "@/lib/analytics/pdf-document";
import type { AnalyticsData } from "@/lib/analytics/types";

export async function generateAnalyticsPdfBuffer(data: AnalyticsData) {
  return renderToBuffer(<AnalyticsPdfDocument data={data} />);
}
