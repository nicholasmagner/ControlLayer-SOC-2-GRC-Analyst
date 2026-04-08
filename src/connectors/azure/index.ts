export const AZURE_CONNECTOR_STUB = {
  name: "Azure Telemetry Connector",
  status: "Disconnected",
  description: "Ingests Azure Resource Graph and Activity Logs into ControlLayer internal schema. Read-only.",
  ingest: async () => {
    console.log("Simulating Azure data ingestion...");
    // Normalizing to identity_event, config_state, policy_violation
    return [
      { type: 'identity_event', action: 'SignIn', actor: 'azure-user@company.com' },
      { type: 'config_state', resource: 'storage-account-blob', state: 'public_access_disabled' }
    ];
  }
};
