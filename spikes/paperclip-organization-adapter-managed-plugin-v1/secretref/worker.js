import { createHmac, timingSafeEqual } from "node:crypto";
import { definePlugin, runWorker } from "file:///app/packages/plugins/sdk/dist/index.js";

let pluginContext = null;
const MAX_SKEW_MS = 5 * 60 * 1000;

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isSecretRef(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.type === "secret_ref" &&
    typeof value.secretId === "string" &&
    value.secretId.trim()
  );
}

function safeHexEqual(left, right) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
function verifySignature(secret, timestamp, rawBody, signatureHeader) {
  const received = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : "";
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return safeHexEqual(expected, received);
}

async function resolveCompanyHmacSecret(ctx, companyId) {
  const config = await ctx.config.get(companyId);
  const ref = config?.hmacSecret;
  if (!isSecretRef(ref)) throw new Error("wandora_hmac_secret_not_configured");
  return ctx.secrets.resolve(ref, { companyId, configPath: "hmacSecret" });
}

const plugin = definePlugin({
  multiCompanyConfig: true,
  async setup(ctx) {
    pluginContext = ctx;
    ctx.logger.info("wandora_control_plane_secretref_proof_ready");
  },
  async onWebhook(input) {
    if (!pluginContext) throw new Error("plugin_not_ready");
    if (input.endpointKey !== "employee-reconcile") throw new Error("unknown_endpoint");

    const body = input.parsedBody && typeof input.parsedBody === "object" ? input.parsedBody : {};
    const companyId = nonEmpty(body.companyId);
    const employeeKey = nonEmpty(body.employeeKey);
    const timestamp = nonEmpty(input.headers["x-wandora-timestamp"]);
    const signature = nonEmpty(input.headers["x-wandora-signature"]);
    if (!companyId || employeeKey !== "ana-commercial-secretref" || !timestamp || !signature) {
      throw new Error("invalid_wandora_request");
    }

    const numericTimestamp = Number(timestamp);
    if (!Number.isFinite(numericTimestamp) || Math.abs(Date.now() - numericTimestamp) > MAX_SKEW_MS) {
      throw new Error("stale_wandora_request");
    }

    const hmacSecret = await resolveCompanyHmacSecret(pluginContext, companyId);
    if (!verifySignature(hmacSecret, timestamp, input.rawBody, signature)) {
      throw new Error("invalid_wandora_signature");
    }

    const resolved = await pluginContext.agents.managed.reconcile(employeeKey, companyId);
    pluginContext.logger.info("wandora_employee_secretref_reconciled", {
      companyId,
      employeeKey,
      agentId: resolved.agentId,
      status: resolved.status
    });
  },
  async onHealth() {
    return {
      status: "ok",
      message: "Wandora secret-ref control-plane proof worker is running",
      details: { mode: "headless", managedAgentKey: "ana-commercial-secretref" }
    };
  }
});

export default plugin;
runWorker(plugin, import.meta.url);
