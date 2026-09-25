const DEFAULT_CONTACT_EMAIL = "hello@voltpilot.io";

export function getSiteContactEmail() {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_EMAIL;
}

export function getSiteContactMailto(subject = "VoltPilot inquiry") {
  const email = getSiteContactEmail();
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
