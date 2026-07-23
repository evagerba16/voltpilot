export class PermissionDeniedError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

export function isPermissionDenied(error: unknown) {
  return (
    error instanceof PermissionDeniedError ||
    (error instanceof Error &&
      error.message.includes("do not have permission"))
  );
}

export class AuthenticationRequiredError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

export function isAuthenticationRequired(error: unknown) {
  return (
    error instanceof AuthenticationRequiredError ||
    (error instanceof Error && error.message === "Authentication required.")
  );
}

export function apiErrorStatus(error: unknown) {
  if (isAuthenticationRequired(error)) return 401;
  if (isPermissionDenied(error)) return 403;
  return 500;
}

export function permissionDeniedStatus(error: unknown) {
  return apiErrorStatus(error);
}
