/**
 * Well-Known Routes for @linkforty/core
 *
 * Purpose: Serve domain verification files for iOS Universal Links and Android App Links
 *
 * Configuration via Environment Variables:
 * - IOS_TEAM_ID: Your Apple Developer Team ID (e.g., "ABC123XYZ")
 * - IOS_BUNDLE_ID: Your iOS app bundle identifier (e.g., "com.example.app")
 * - ANDROID_PACKAGE_NAME: Your Android package name (e.g., "com.example.app")
 * - ANDROID_SHA256_FINGERPRINTS: Comma-separated SHA-256 fingerprints (e.g., "AA:BB:CC:...,DD:EE:FF:...")
 *
 * These files must be served on the public SHORTLINK host (not the dashboard host).
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export function buildAasaPayload(teamId: string, bundleId: string) {
  return {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID: `${teamId}.${bundleId}`,
          paths: ['*'],
        },
      ],
    },
  };
}

async function sendAasa(_request: FastifyRequest, reply: FastifyReply) {
  const teamId = process.env.IOS_TEAM_ID;
  const bundleId = process.env.IOS_BUNDLE_ID;

  if (!teamId || !bundleId) {
    return reply.status(404).send({
      error: 'Configuration missing',
      message:
        'iOS app configuration not found. Please set IOS_TEAM_ID and IOS_BUNDLE_ID environment variables.',
      docs: 'https://docs.linkforty.com/guides/sdk-integration#ios-universal-links',
    });
  }

  // AASA must be: no .json extension, application/json, HTTPS in production.
  // Apple also fetches /apple-app-site-association (root) on some flows.
  return reply
    .header('Content-Type', 'application/json')
    .send(buildAasaPayload(teamId, bundleId));
}

export async function wellKnownRoutes(fastify: FastifyInstance) {
  /**
   * Apple App Site Association (AASA)
   * https://developer.apple.com/documentation/xcode/supporting-associated-domains
   */
  fastify.get('/.well-known/apple-app-site-association', sendAasa);
  fastify.get('/apple-app-site-association', sendAasa);

  /**
   * Digital Asset Links (assetlinks.json)
   * https://developer.android.com/training/app-links/verify-android-applinks
   *
   * Endpoint: GET /.well-known/assetlinks.json
   */
  fastify.get('/.well-known/assetlinks.json', async (request, reply) => {
    const packageName = process.env.ANDROID_PACKAGE_NAME;
    const fingerprintsEnv = process.env.ANDROID_SHA256_FINGERPRINTS;

    if (!packageName || !fingerprintsEnv) {
      return reply.status(404).send({
        error: 'Configuration missing',
        message:
          'Android app configuration not found. Please set ANDROID_PACKAGE_NAME and ANDROID_SHA256_FINGERPRINTS environment variables.',
        docs: 'https://docs.linkforty.com/guides/sdk-integration#android-app-links',
      });
    }

    const fingerprints = fingerprintsEnv
      .split(',')
      .map((fp) => fp.trim())
      .filter(Boolean);

    if (fingerprints.length === 0) {
      return reply.status(500).send({
        error: 'Invalid configuration',
        message:
          'ANDROID_SHA256_FINGERPRINTS is empty or invalid. Must be comma-separated list of SHA-256 fingerprints.',
        example:
          'ANDROID_SHA256_FINGERPRINTS=AA:BB:CC:DD:EE:FF:...,11:22:33:44:55:66:...',
      });
    }

    const assetlinks = [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ];

    return reply.header('Content-Type', 'application/json').send(assetlinks);
  });
}
