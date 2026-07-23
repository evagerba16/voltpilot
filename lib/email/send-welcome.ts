type SendWelcomeEmailInput = {
  to: string;
  passwordSetupUrl: string;
};

export async function sendWelcomeEmail(input: SendWelcomeEmailInput) {
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
      subject: "Welcome to VoltPilot — set your password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <h2>Welcome to VoltPilot</h2>
          <p>Your subscription is active. Set your password to sign in and start estimating.</p>
          <p>
            <a href="${input.passwordSetupUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
              Set your password
            </a>
          </p>
          <p style="font-size: 12px; color: #6b7280;">If you did not subscribe to VoltPilot, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      sent: false,
      message: `Welcome email delivery failed: ${body}`,
    };
  }

  return {
    sent: true,
    message: "Welcome email sent.",
  };
}
