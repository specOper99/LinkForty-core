/**
 * Well-Known Routes for @linkforty/core
 *
 * Purpose: Serve domain verification files for iOS Universal Links and Android App Links
 *
 * Configuration via Environment Variables:
 * - IOS_TEAM_ID: Your Apple Developer Team ID (e.g., "ABC123XYZ")
 * - IOS_BUNDLE_ID: Your iOS app bundle identifier (e.g., "com.example.app")
 * - ANDROID_PACKAGE_NAME: Your Android package name (e.g., "com.example.app")
 * - ANDROID_SHA256_FINGERPRINTS: Comma-separated SHA-256 fingerprints
 *
 * These files must be served on the public SHORTLINK host (not the dashboard host).
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/** Modern (appIDs/components) + legacy (appID/paths) for broad iOS support. */
export function buildAasaPayload(teamId: string, bundleId: string) {
  const appId = `${teamId}.${bundleId}`;
  return {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID: appId,
          appIDs: [appId],
          paths: [
            'NOT /.well-known/*',
            'NOT /apple-app-site-association',
            'NOT /api/*',
            '*',
          ],
          components: [
            { '/': '/.well-known/*', exclude: true, comment: 'AASA / assetlinks' },
            { '/': '/apple-app-site-association', exclude: true },
            { '/': '/api/*', exclude: true, comment: 'Core API' },
            { '/': '*', comment: 'All shortlinks and paths' },
          ],
        },
      ],
    },
  };
}

async function sendAasa(_request: FastifyRequest, reply: FastifyReply) {
  const teamId = process.env.IOS_TEAM_ID?.trim();
  const bundleId = process.env.IOS_BUNDLE_ID?.trim();

  if (!teamId || !bundleId) {
    return reply.status(404).send({
      error: 'Configuration missing',
      message:
        'iOS app configuration not found. Please set IOS_TEAM_ID and IOS_BUNDLE_ID environment variables.',
      docs: 'https://docs.linkforty.com/guides/sdk-integration#ios-universal-links',
    });
  }

  // No redirects, application/json, HTTPS — required by Apple.
  return reply
    .header('Content-Type', 'application/json')
    .header('Cache-Control', 'public, max-age=300')
    .send(buildAasaPayload(teamId, bundleId));
}

export async function wellKnownRoutes(fastify: FastifyInstance) {
  fastify.get('/.well-known/apple-app-site-association', sendAasa);
  fastify.get('/apple-app-site-association', sendAasa);

  fastify.get('/.well-known/assetlinks.json', async (_request, reply) => {
    const packageName = process.env.ANDROID_PACKAGE_NAME?.trim();
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
      .filter(Boolean)
      // Digital Asset Links / Play Console use uppercase hex
      .map((fp) => fp.toUpperCase());

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

    return reply
      .header('Content-Type', 'application/json')
      .header('Cache-Control', 'public, max-age=300')
      .send(assetlinks);
  });
}
