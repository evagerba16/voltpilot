type SendProposalEmailInput = {
  to: string;
  customerName: string;
  companyName: string;
  proposalNumber: string;
  proposalTitle: string;
  amountLabel: string;
  subject: string;
  message: string;
  portalUrl: string;
};

export async function sendProposalEmail(input: SendProposalEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || "VoltPilot <onboarding@resend.dev>";

  if (!apiKey) {
    return {
      sent: false,
      message:
        "RESEND_API_KEY is not configured. Copy the customer portal link and send it manually.",
    };
  }

  const htmlMessage = input.message
    .split("\n")
    .map((line) => `<p>${line || "&nbsp;"}</p>`)
    .join("");

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
          <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em;">VoltPilot Proposal</p>
          <h2 style="margin: 0 0 12px;">${input.proposalTitle}</h2>
          <p><strong>${input.companyName}</strong> has shared proposal <strong>${input.proposalNumber}</strong> for <strong>${input.amountLabel}</strong>.</p>
          ${htmlMessage}
          <p style="margin: 24px 0;">
            <a href="${input.portalUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
              View proposal
            </a>
          </p>
          <p style="font-size: 12px; color: #6b7280;">Prepared for ${input.customerName}. You can review, download, accept, decline, and sign electronically in the secure customer portal.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      sent: false,
      message: `Email delivery failed: ${body}`,
    };
  }

  return {
    sent: true,
    message: "Proposal email sent.",
  };
}

export function buildDefaultProposalEmail(input: {
  companyName: string;
  customerName: string;
  proposalNumber: string;
  projectName: string;
  amountLabel: string;
}) {
  return {
    subject: `${input.companyName} proposal ${input.proposalNumber} — ${input.projectName}`,
    message: `Hello ${input.customerName},

Please review the attached proposal for ${input.projectName}. The total investment is ${input.amountLabel}.

Use the secure link below to view the full proposal, download the PDF, and accept or decline electronically.

Thank you,
${input.companyName}`,
  };
}
