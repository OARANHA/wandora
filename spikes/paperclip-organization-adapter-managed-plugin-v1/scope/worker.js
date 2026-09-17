import { definePlugin, runWorker } from "file:///app/packages/plugins/sdk/dist/index.js";

let pluginContext = null;

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const plugin = definePlugin({
  multiCompanyConfig: true,
  async setup(ctx) {
    pluginContext = ctx;
    ctx.logger.info("wandora_control_plane_scope_proof_ready");
  },
  async onWebhook(input) {
    if (!pluginContext) throw new Error("plugin_not_ready");
    if (input.endpointKey !== "scope-probe") throw new Error("unknown_endpoint");
    const body = input.parsedBody && typeof input.parsedBody === "object" ? input.parsedBody : {};
    const targetCompanyId = nonEmpty(body.targetCompanyId);
    if (!targetCompanyId) throw new Error("target_company_required");
    const resolved = await pluginContext.agents.managed.reconcile("scope-probe-agent", targetCompanyId);
    pluginContext.logger.info("wandora_scope_probe_reconciled", {
      targetCompanyId,
      agentId: resolved.agentId,
      status: resolved.status
    });
  },
  async onHealth() {
    return { status: "ok", message: "Wandora company-scope proof worker is running" };
  }
});

export default plugin;
runWorker(plugin, import.meta.url);
