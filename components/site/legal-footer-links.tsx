import Link from "next/link";

export function LegalFooterLinks() {
  return (
    <p className="text-center text-xs text-muted-foreground">
      <Link
        href="/privacy"
        className="underline-offset-4 hover:text-foreground hover:underline"
      >
        Privacy
      </Link>
      {" · "}
      <Link
        href="/terms"
        className="underline-offset-4 hover:text-foreground hover:underline"
      >
        Terms
      </Link>
    </p>
  );
}
