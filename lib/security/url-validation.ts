const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const DATA_IMAGE_PATTERN = /^data:image\/(png|jpeg|jpg|webp);base64,[a-zA-Z0-9+/=]+$/;

export function assertSafeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function assertHexColor(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed || !HEX_COLOR_PATTERN.test(trimmed)) {
    return fallback;
  }

  return trimmed.toLowerCase();
}

export function assertSignatureDataUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (!DATA_IMAGE_PATTERN.test(trimmed)) {
    return null;
  }

  if (trimmed.length > 500_000) {
    return null;
  }

  return trimmed;
}

export const MAX_PORTAL_COMMENT_LENGTH = 2000;
export const MAX_PORTAL_SIGNER_NAME_LENGTH = 120;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_AI_USER_MESSAGE_LENGTH = 4000;
export const MAX_SEARCH_QUERY_LENGTH = 200;

export function assertValidEmail(value: string): string | null {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed || trimmed.length > MAX_EMAIL_LENGTH) {
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}
