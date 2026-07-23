import { FastifyInstance } from 'fastify';
import QRCode from 'qrcode';
import { db } from '../lib/database.js';

/** Public origin for QR payloads. Host-only SHORTLINK_DOMAIN → https://… */
export function resolveShortlinkBase(opts: {
  shortlinkBaseUrl?: string;
  shortlinkDomain?: string;
  protocol: string;
  hostname: string;
}): string {
  const fromBase = opts.shortlinkBaseUrl?.trim();
  if (fromBase) {
    return fromBase.replace(/\/$/, '');
  }

  const domain = opts.shortlinkDomain?.trim();
  if (domain) {
    if (/^https?:\/\//i.test(domain)) {
      return domain.replace(/\/$/, '');
    }
    return `https://${domain.replace(/^\/+|\/+$/g, '')}`;
  }

  return `${opts.protocol}://${opts.hostname}`.replace(/\/$/, '');
}

/**
 * QR Code Routes - Generate QR codes for links
 */
export async function qrRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/links/:id/qr
   * Generate QR code for a link
   *
   * Query parameters:
   * - format: 'png' | 'svg' (default: 'png')
   * - size: number 128-2048 (default: 512)
   * - color: hex color for foreground (default: '#000000')
   * - bgcolor: hex color for background (default: '#ffffff')
   *
   * Returns: QR code image (PNG or SVG)
   */
  fastify.get('/api/links/:id/qr', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as Record<string, string | undefined>;

    const format = (query.format || 'png') as 'png' | 'svg';
    const size = Math.min(Math.max(parseInt(query.size || '512', 10), 128), 2048);
    const color = query.color || '#000000';
    const bgcolor = query.bgcolor || '#ffffff';

    // Validate format
    if (!['png', 'svg'].includes(format)) {
      return reply.status(400).send({ error: 'Invalid format. Use "png" or "svg".' });
    }

    // Get link from database
    const result = await db.query(
      'SELECT short_code, original_url FROM links WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Link not found' });
    }

    const link = result.rows[0];

    const shortLinkBase = resolveShortlinkBase({
      shortlinkBaseUrl: process.env.SHORTLINK_BASE_URL,
      shortlinkDomain: process.env.SHORTLINK_DOMAIN,
      protocol: request.protocol,
      hostname: request.hostname,
    });
    const shortUrl = link.short_code
      ? `${shortLinkBase}/${link.short_code}`
      : link.original_url;

    // Include encoded URL so scheme/domain fixes bust stale Redis entries
    const cacheKey = `qr:v2:${id}:${format}:${size}:${color}:${bgcolor}:${shortUrl}`;

    // Try to get from cache
    if (fastify.redis) {
      try {
        const cached = await fastify.redis.get(cacheKey);
        if (cached) {
          fastify.log.info(`QR code cache hit: ${cacheKey}`);

          if (format === 'png') {
            const buffer = Buffer.from(cached, 'base64');
            return reply
              .type('image/png')
              .header('Cache-Control', 'public, max-age=86400')
              .send(buffer);
          } else {
            return reply
              .type('image/svg+xml')
              .header('Cache-Control', 'public, max-age=86400')
              .send(cached);
          }
        }
      } catch (error) {
        fastify.log.warn('Redis QR cache lookup failed');
      }
    }

    try {
      const options = {
        errorCorrectionLevel: 'M' as const,
        margin: 1,
        width: size,
        color: {
          dark: color,
          light: bgcolor,
        },
      };

      if (format === 'png') {
        const buffer = await QRCode.toBuffer(shortUrl, options);

        if (fastify.redis) {
          try {
            await fastify.redis.setex(cacheKey, 86400, buffer.toString('base64'));
          } catch (error) {
            fastify.log.warn('Failed to cache QR code');
          }
        }

        return reply
          .type('image/png')
          .header('Cache-Control', 'public, max-age=86400')
          .header('Content-Disposition', `inline; filename="qr-${link.short_code || 'code'}.png"`)
          .send(buffer);
      } else {
        const svg = await QRCode.toString(shortUrl, {
          ...options,
          type: 'svg',
        });

        if (fastify.redis) {
          try {
            await fastify.redis.setex(cacheKey, 86400, svg);
          } catch (error) {
            fastify.log.warn('Failed to cache QR code');
          }
        }

        return reply
          .type('image/svg+xml')
          .header('Cache-Control', 'public, max-age=86400')
          .header('Content-Disposition', `inline; filename="qr-${link.short_code || 'code'}.svg"`)
          .send(svg);
      }
    } catch (error: any) {
      fastify.log.error(`QR code generation failed: ${error.message}`);
      return reply.status(500).send({
        error: 'Failed to generate QR code',
        message: error.message
      });
    }
  });
}
