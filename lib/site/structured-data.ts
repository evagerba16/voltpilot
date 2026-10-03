import { getSiteUrl } from "@/lib/site-url";

export const VOLTPILOT_FOUNDER_NAME = "Eva Gerba";

export function getSiteStructuredData() {
  const siteUrl = getSiteUrl();
  const organizationId = `${siteUrl}/#organization`;
  const founderId = `${siteUrl}/#founder`;
  const softwareId = `${siteUrl}/#software`;
  const websiteId = `${siteUrl}/#website`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": founderId,
        name: VOLTPILOT_FOUNDER_NAME,
        jobTitle: "Founder",
        worksFor: { "@id": organizationId },
      },
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "VoltPilot",
        url: siteUrl,
        founder: { "@id": founderId },
      },
      {
        "@type": "SoftwareApplication",
        "@id": softwareId,
        name: "VoltPilot",
        url: siteUrl,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Estimating and proposal software built for residential and commercial electrical contractors.",
        creator: { "@id": founderId },
        publisher: { "@id": organizationId },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: "VoltPilot",
        url: siteUrl,
        publisher: { "@id": organizationId },
      },
    ],
  };
}
