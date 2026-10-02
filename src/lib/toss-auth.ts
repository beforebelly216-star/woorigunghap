import "server-only";
import { request as httpsRequest } from "node:https";
import { verifyTossIdentity, type TossLoginInput, type TossTransport } from "@/lib/toss-login-protocol";

export function isTossAuthConfigured() {
  return process.env.APPS_IN_TOSS_LOGIN_ENABLED === "true"
    && Boolean(process.env.APPS_IN_TOSS_APP_NAME && process.env.APPS_IN_TOSS_MTLS_CERT && process.env.APPS_IN_TOSS_MTLS_KEY);
}

const transport: TossTransport = (path, body, accessToken) => new Promise((resolve, reject) => {
  if (!isTossAuthConfigured()) return reject(new Error("toss_auth_unavailable"));
  const encoded = body ? JSON.stringify(body) : undefined;
  const request = httpsRequest({
    hostname: "apps-in-toss-api.toss.im", port: 443, path,
    method: body ? "POST" : "GET",
    cert: process.env.APPS_IN_TOSS_MTLS_CERT!.replace(/\\n/g, "\n"),
    key: process.env.APPS_IN_TOSS_MTLS_KEY!.replace(/\\n/g, "\n"),
    rejectUnauthorized: true,
    headers: {
      "Content-Type": "application/json",
      ...(encoded ? { "Content-Length": Buffer.byteLength(encoded) } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  }, (response) => {
    const chunks: Buffer[] = [];
    let size = 0;
    response.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 65536) request.destroy(new Error("toss_response_too_large"));
      else chunks.push(chunk);
    });
    response.on("error", reject);
    response.on("end", () => {
      if (response.statusCode !== 200) return reject(new Error("toss_request_failed"));
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new Error("toss_invalid_response")); }
    });
  });
  const deadline = setTimeout(() => request.destroy(new Error("toss_request_timeout")), 10000);
  request.on("close", () => clearTimeout(deadline));
  request.on("error", reject);
  request.end(encoded);
});

export function retrieveTossIdentity(input: TossLoginInput) {
  return verifyTossIdentity(input, transport);
}
