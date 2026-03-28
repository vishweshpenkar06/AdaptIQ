type HindsightConfig = {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  bankNamespace: string;
  bankId: string;
  recallEnrichmentEnabled: boolean;
  reflectOnRecovery: boolean;
};

function parseBoolean(value: string | undefined, defaultValue = false) {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

export function getHindsightConfig(): HindsightConfig {
  return {
    enabled: parseBoolean(process.env.HINDSIGHT_ENABLED, false),
    baseUrl: process.env.HINDSIGHT_API_BASE_URL ?? '',
    apiKey: process.env.HINDSIGHT_API_KEY ?? '',
    bankNamespace: process.env.HINDSIGHT_BANK_NAMESPACE ?? 'adaptiq_',
    bankId: process.env.HINDSIGHT_BANK_ID ?? '',
    recallEnrichmentEnabled: parseBoolean(process.env.HINDSIGHT_RECALL_ENRICHMENT_ENABLED, false),
    reflectOnRecovery: parseBoolean(process.env.HINDSIGHT_REFLECT_ON_RECOVERY, false),
  };
}

export function isHindsightConfigured(config = getHindsightConfig()) {
  return config.enabled && Boolean(config.baseUrl) && Boolean(config.apiKey);
}

export function getBankIdForUser(userId: string, config = getHindsightConfig()) {
  if (config.bankId) return config.bankId;
  return `${config.bankNamespace}${userId}`;
}
