import { z } from "zod";

/** Shared primitives */

export const uuidSchema = z.string().uuid();

export const utmParametersSchema = z
  .object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    term: z.string().optional(),
    content: z.string().optional(),
  })
  .passthrough();

export const targetingRulesSchema = z
  .object({
    countries: z.array(z.string()).optional(),
    devices: z.array(z.enum(["ios", "android", "web"])).optional(),
    languages: z.array(z.string()).optional(),
  })
  .passthrough();

/** Core create/update Zod accepts these; responses may still list sdk_event. */
export const webhookEventSchema = z.enum([
  "click_event",
  "install_event",
  "conversion_event",
]);

export const webhookEventResponseSchema = z.enum([
  "click_event",
  "install_event",
  "conversion_event",
  "sdk_event",
]);

/** Links — requests (camelCase per Core Zod) */

export const createLinkRequestSchema = z.object({
  userId: uuidSchema.optional(),
  templateId: uuidSchema.optional(),
  originalUrl: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  iosAppStoreUrl: z.string().url().optional(),
  androidAppStoreUrl: z.string().url().optional(),
  webFallbackUrl: z.string().url().optional(),
  appScheme: z
    .string()
    .regex(/^[a-z][a-z0-9+.-]*$/)
    .optional(),
  iosUniversalLink: z.string().url().optional(),
  androidAppLink: z.string().url().optional(),
  deepLinkPath: z.string().optional(),
  deepLinkParameters: z.record(z.string(), z.any()).optional(),
  customCode: z.string().optional(),
  utmParameters: utmParametersSchema.optional(),
  targetingRules: targetingRulesSchema.optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImageUrl: z.string().url().optional(),
  ogType: z.string().optional(),
  attributionWindowHours: z.number().int().min(1).max(2160).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const updateLinkRequestSchema = createLinkRequestSchema
  .partial()
  .omit({ userId: true })
  .extend({
    isActive: z.boolean().optional(),
  });

/**
 * Core list/detail responses mix DB snake_case with camelCase aliases.
 * Accept both; normalize in client helpers when needed.
 */
export const linkSchema = z
  .object({
    id: uuidSchema,
    user_id: z.string().uuid().nullable().optional(),
    userId: z.string().uuid().optional(),
    template_id: z.string().uuid().nullable().optional(),
    template_slug: z.string().nullable().optional(),
    short_code: z.string().optional(),
    shortCode: z.string().optional(),
    original_url: z.string().optional(),
    originalUrl: z.string().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    ios_app_store_url: z.string().nullable().optional(),
    android_app_store_url: z.string().nullable().optional(),
    web_fallback_url: z.string().nullable().optional(),
    app_scheme: z.string().nullable().optional(),
    ios_universal_link: z.string().nullable().optional(),
    android_app_link: z.string().nullable().optional(),
    deep_link_path: z.string().nullable().optional(),
    deep_link_parameters: z.record(z.string(), z.any()).nullable().optional(),
    deepLinkParameters: z.record(z.string(), z.any()).nullable().optional(),
    utm_parameters: utmParametersSchema.nullable().optional(),
    utmParameters: utmParametersSchema.nullable().optional(),
    targeting_rules: targetingRulesSchema.nullable().optional(),
    targetingRules: targetingRulesSchema.nullable().optional(),
    og_title: z.string().nullable().optional(),
    og_description: z.string().nullable().optional(),
    og_image_url: z.string().nullable().optional(),
    og_type: z.string().nullable().optional(),
    attribution_window_hours: z.number().nullable().optional(),
    is_active: z.boolean().optional(),
    isActive: z.boolean().optional(),
    expires_at: z.string().nullable().optional(),
    expiresAt: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    click_count: z.union([z.number(), z.string()]).optional(),
    clickCount: z.number().optional(),
  })
  .passthrough();

export const linkListSchema = z.array(linkSchema);

export const deleteSuccessSchema = z
  .object({
    success: z.boolean().optional(),
    message: z.string().optional(),
  })
  .passthrough();

/** Analytics */

export const clicksByDateSchema = z.object({
  date: z.string(),
  clicks: z.number(),
});

export const analyticsOverviewSchema = z
  .object({
    totalClicks: z.number(),
    uniqueClicks: z.number(),
    clicksByDate: z.array(clicksByDateSchema).default([]),
    clicksByCountry: z
      .array(
        z.object({
          countryCode: z.string(),
          country: z.string(),
          clicks: z.number(),
        }),
      )
      .default([]),
    clicksByDevice: z
      .array(z.object({ device: z.string(), clicks: z.number() }))
      .default([]),
    clicksByPlatform: z
      .array(z.object({ platform: z.string(), clicks: z.number() }))
      .default([]),
    topLinks: z
      .array(
        z.object({
          id: z.string(),
          shortCode: z.string(),
          title: z.string().nullable(),
          originalUrl: z.string(),
          totalClicks: z.number(),
          uniqueClicks: z.number(),
        }),
      )
      .default([]),
  })
  .passthrough();

export const linkAnalyticsSchema = analyticsOverviewSchema;

/** Webhooks */

export const createWebhookRequestSchema = z.object({
  userId: uuidSchema.optional(),
  name: z.string().min(1).max(255),
  url: z.string().url(),
  events: z.array(webhookEventSchema).min(1),
  headers: z.record(z.string(), z.string()).optional(),
  retryCount: z.number().int().min(1).max(10).optional(),
  timeoutMs: z.number().int().min(1000).max(60000).optional(),
});

export const updateWebhookRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().optional(),
  events: z.array(webhookEventSchema).min(1).optional(),
  isActive: z.boolean().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  retryCount: z.number().int().min(1).max(10).optional(),
  timeoutMs: z.number().int().min(1000).max(60000).optional(),
});

export const webhookSchema = z
  .object({
    id: uuidSchema,
    user_id: z.string().uuid().nullable().optional(),
    name: z.string(),
    url: z.string(),
    secret: z.string().optional(),
    events: z.array(webhookEventResponseSchema),
    is_active: z.boolean().optional(),
    isActive: z.boolean().optional(),
    retry_count: z.number().optional(),
    timeout_ms: z.number().optional(),
    headers: z.record(z.string(), z.string()).nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const webhookListSchema = z.array(webhookSchema);

export const webhookTestResultSchema = z
  .object({
    success: z.boolean().optional(),
    status: z.number().optional(),
    message: z.string().optional(),
  })
  .passthrough();

/** Debug */

export const simulateRequestSchema = z.object({
  linkId: uuidSchema,
  userId: uuidSchema.optional(),
  deviceType: z.enum(["ios", "android", "web"]).optional(),
  userAgent: z.string().optional(),
  country: z.string().length(2).optional(),
  language: z.string().optional(),
  ipAddress: z.union([z.ipv4(), z.ipv6()]).optional(),
});

export const simulateResponseSchema = z
  .object({
    linkId: z.string().optional(),
    shortCode: z.string().optional(),
    deviceType: z.string().optional(),
    redirectUrl: z.string().nullable().optional(),
    targetingMatched: z.boolean().optional(),
    targetingDetails: z
      .object({
        countryMatch: z.boolean().nullable(),
        deviceMatch: z.boolean().nullable(),
        languageMatch: z.boolean().nullable(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const userAgentsResponseSchema = z
  .object({
    /** Legacy / mock shape */
    userAgents: z
      .array(
        z
          .object({
            name: z.string().optional(),
            deviceType: z.string().optional(),
            device: z.string().optional(),
            userAgent: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    /** Core debugRoutes shape */
    ios: z.array(z.record(z.string(), z.unknown())).optional(),
    android: z.array(z.record(z.string(), z.unknown())).optional(),
    web: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

export const countriesResponseSchema = z.object({
  countries: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
    }),
  ),
});

export const languagesResponseSchema = z.object({
  languages: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
    }),
  ),
});

/** Health / SDK / well-known */

export const healthSchema = z
  .object({
    status: z.string().optional(),
    ok: z.boolean().optional(),
  })
  .passthrough();

export const sdkHealthSchema = z.object({
  status: z.string(),
  version: z.string().optional(),
  timestamp: z.string().optional(),
});

export const attributionResponseSchema = z.record(z.string(), z.any());

export const appleAppSiteAssociationSchema = z
  .object({
    applinks: z
      .object({
        apps: z.array(z.any()).optional(),
        details: z.array(z.any()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const assetLinksSchema = z.array(
  z
    .object({
      relation: z.array(z.string()).optional(),
      target: z.record(z.string(), z.any()).optional(),
    })
    .passthrough(),
);

export const qrFormatSchema = z.enum(["png", "svg"]);

export const qrQuerySchema = z.object({
  format: qrFormatSchema.optional(),
  size: z.coerce.number().int().min(128).max(2048).optional(),
  color: z.string().optional(),
  bgcolor: z.string().optional(),
});

/** Inferred types */

export type CreateLinkRequest = z.infer<typeof createLinkRequestSchema>;
export type UpdateLinkRequest = z.infer<typeof updateLinkRequestSchema>;
export type Link = z.infer<typeof linkSchema>;
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;
export type CreateWebhookRequest = z.infer<typeof createWebhookRequestSchema>;
export type UpdateWebhookRequest = z.infer<typeof updateWebhookRequestSchema>;
export type Webhook = z.infer<typeof webhookSchema>;
export type SimulateRequest = z.infer<typeof simulateRequestSchema>;
export type SimulateResponse = z.infer<typeof simulateResponseSchema>;
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
