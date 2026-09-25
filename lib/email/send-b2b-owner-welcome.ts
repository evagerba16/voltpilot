type SendB2BOwnerWelcomeEmailInput = {
  to: string;
  companyName: string;
  passwordSetupUrl: string;
};

export async function sendB2BOwnerWelcomeEmail(input: SendB2BOwnerWelcomeEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || "VoltPilot <onboarding@resend.dev>";

  if (!apiKey) {
    return {
      sent: false,
      message:
        "RESEND_API_KEY is not configured. Share the password setup link manually.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.to],
      subject: `Your VoltPilot company workspace for ${input.companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <h2>Your company workspace is ready</h2>
          <p>
            <strong>${input.companyName}</strong> is set up on VoltPilot. Set your password
            to sign in as the account owner, then invite your team from Settings → Team.
          </p>
          <p>
            <a href="${input.passwordSetupUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
              Set your password
            </a>
          </p>
          <p style="font-size: 12px; color: #6b7280;">This link expires after a short time. If you did not expect this email, you can ignore it.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      sent: false,
      message: `Owner welcome email failed: ${body}`,
    };
  }

  return {
    sent: true,
    message: "Owner welcome email sent.",
  };
}
