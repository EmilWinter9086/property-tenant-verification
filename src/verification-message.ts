export type VerificationContext = {
  name: string;
  propertyName: string;
  verificationLink: string;
};

export function verificationEmail(input: VerificationContext) {
  return {
    subject: `Verify access to ${input.propertyName}`,
    body: `Hello ${input.name}, verify your tenant workspace: ${input.verificationLink}`,
  };
}
