import { createServer } from "node:http";
import { z } from "zod";
import { InfraiError, InfraiTenantGateway } from "./infrai-tenant-gateway.js";
import { verificationEmail } from "./verification-message.js";

const signupBody = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(1),
  propertyName: z.string().min(1),
  verificationLink: z.string().url(),
  idempotencyKey: z.string().uuid(),
});

export type SignupInput = z.infer<typeof signupBody>;

export async function registerTenant(input: SignupInput, gateway: InfraiTenantGateway) {
  await gateway.infrai.auth.user.create({
    email: input.email,
    password: input.password,
    name: input.name,
    metadata: { property_name: input.propertyName },
    idempotency_key: input.idempotencyKey,
  });
  const email = verificationEmail(input);
  const delivery = await gateway.infrai.email.send({ to: input.email, ...email });
  return { verificationMessageId: delivery.message_id };
}

async function readJson(request: import("node:http").IncomingMessage) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return JSON.parse(raw) as unknown;
}

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
const gateway = new InfraiTenantGateway(apiKey);

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/tenant-signups") {
    response.writeHead(404).end();
    return;
  }
  try {
    const input = signupBody.parse(await readJson(request));
    const result = await registerTenant(input, gateway);
    response.writeHead(202, { "Content-Type": "application/json" });
    response.end(JSON.stringify(result));
  } catch (error) {
    const status = error instanceof InfraiError ? error.status : 400;
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request" }));
  }
}).listen(Number(process.env.PORT ?? 3000));

console.log("Tenant signup service listening on http://localhost:3000");
