type ProposalNotificationEmailInput = {
  to: string;
  subject: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  companyName: string;
};

export async function sendProposalNotificationEmail(
  input: ProposalNotificationEmailInput
) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || "VoltPilot <onboarding@resend.dev>";

  if (!apiKey) {
    return {
      sent: false,
      message: "RESEND_API_KEY is not configured.",
    };
  }

  const htmlBody = input.body
    .split("\n")
    .map((line) => `<p style="margin: 0 0 12px;">${line || "&nbsp;"}</p>`)
    .join("");

  const ctaBlock =
    input.ctaUrl && input.ctaLabel ?
      `<p style="margin: 24px 0;">
        <a href="${input.ctaUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
          ${input.ctaLabel}
        </a>
      </p>`
    : "";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.to],
      subject: input.subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 640px;">
          <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em;">VoltPilot Proposal Update</p>
          <h2 style="margin: 0 0 12px;">${input.headline}</h2>
          ${htmlBody}
          ${ctaBlock}
          <p style="font-size: 12px; color: #6b7280;">${input.companyName} · VoltPilot proposal tracking</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      sent: false,
      message: `Notification email failed: ${body}`,
    };
  }

  return {
    sent: true,
    message: "Notification sent.",
  };
}
