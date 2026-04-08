export const AWS_CONNECTOR_STUB = {
  name: "AWS Telemetry Connector",
  status: "Disconnected",
  description: "Ingests CloudTrail logs and AWS Config state into ControlLayer internal schema. Read-only.",
  ingest: async () => {
    console.log("Simulating AWS data ingestion...");
    // Normalizing to identity_event, config_state, policy_violation
    return [
      { type: 'identity_event', action: 'ConsoleLogin', actor: 'aws-user' },
      { type: 'config_state', resource: 's3-bucket-logs', state: 'private' }
    ];
  }
};
