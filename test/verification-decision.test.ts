import test from "node:test";
import assert from "node:assert/strict";
import { verificationEmail } from "../src/verification-message.js";

test("a property name is carried into the verification message", () => {
  const message = verificationEmail({
    name: "Mina",
    propertyName: "Harbor Court",
    verificationLink: "https://portal.example.test/verify/tenant-42",
  });
  assert.equal(message.subject, "Verify access to Harbor Court");
  assert.match(message.body, /verify\/tenant-42/);
});
