import { getSiteStructuredData } from "@/lib/site/structured-data";

export function SiteJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(getSiteStructuredData()),
      }}
    />
  );
}
