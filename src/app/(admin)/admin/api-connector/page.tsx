import { ApiConnectorClient } from './api-connector-client';

export default function ApiConnectorPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">AI-Powered API Connector</h1>
        <p className="text-muted-foreground">
          Define new API integrations with intelligent suggestions from our AI assistant.
        </p>
      </div>

      <ApiConnectorClient />
    </div>
  );
}
