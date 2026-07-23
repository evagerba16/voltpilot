type SendInvitationEmailInput = {
  to: string;
  organizationName: string;
  inviterEmail: string;
  roleLabel: string;
  inviteUrl: string;
};

export async function sendInvitationEmail(input: SendInvitationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || "VoltPilot <onboarding@resend.dev>";

  if (!apiKey) {
    return {
      sent: false,
      inviteUrl: input.inviteUrl,
      message:
        "RESEND_API_KEY is not configured. Share the invite link manually.",
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
      subject: `You're invited to join ${input.organizationName} on VoltPilot`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <h2>Join ${input.organizationName} on VoltPilot</h2>
          <p>${input.inviterEmail} invited you to collaborate as <strong>${input.roleLabel}</strong>.</p>
          <p>VoltPilot helps residential and commercial electrical contractors create accurate estimates, professional proposals, and win more profitable jobs.</p>
          <p>
            <a href="${input.inviteUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
              Accept invitation
            </a>
          </p>
          <p style="font-size: 12px; color: #6b7280;">This invitation expires in 7 days.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      sent: false,
      inviteUrl: input.inviteUrl,
      message: `Email delivery failed: ${body}`,
    };
  }

  return {
    sent: true,
    inviteUrl: input.inviteUrl,
    message: "Invitation email sent.",
  };
}
