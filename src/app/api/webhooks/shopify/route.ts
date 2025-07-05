import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyShopifyWebhook, 
  handleArticleWebhook, 
  handleBlogWebhook,
  isValidWebhookEvent,
  ShopifyWebhookEvent,
  ShopifyArticleWebhookPayload,
  ShopifyBlogWebhookPayload
} from '@/lib/shopify/webhook-handler';

/**
 * POST /api/webhooks/shopify
 * Handle Shopify webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    
    // Get webhook headers
    const signature = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic');
    const shopDomain = request.headers.get('x-shopify-shop-domain');
    
    // Validate required headers
    if (!signature || !topic || !shopDomain) {
      console.error('Missing required webhook headers:', { signature: !!signature, topic, shopDomain });
      return NextResponse.json(
        { error: 'Missing required webhook headers' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('SHOPIFY_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const isValid = verifyShopifyWebhook(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Validate event type
    if (!isValidWebhookEvent(topic)) {
      console.log(`Unsupported webhook event: ${topic}`);
      return NextResponse.json(
        { message: `Unsupported event: ${topic}` },
        { status: 200 }
      );
    }

    // Parse the payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error('Invalid JSON payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    console.log(`📦 Received Shopify webhook: ${topic}`, {
      shopDomain,
      payloadKeys: Object.keys(payload)
    });

    // Handle the webhook based on event type
    let result;
    
    if (topic.startsWith('articles/')) {
      result = await handleArticleWebhook(topic as ShopifyWebhookEvent, payload as ShopifyArticleWebhookPayload);
    } else if (topic.startsWith('blogs/')) {
      result = await handleBlogWebhook(topic as ShopifyWebhookEvent, payload as ShopifyBlogWebhookPayload);
    } else {
      return NextResponse.json(
        { message: `Unsupported event category: ${topic}` },
        { status: 200 }
      );
    }

    // Return appropriate response
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      console.error(`Webhook processing failed for ${topic}:`, result.errors);
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          details: result.errors
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing Shopify webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/shopify
 * Return webhook configuration info (for debugging)
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/webhooks/shopify',
    method: 'POST',
    headers: {
      'x-shopify-hmac-sha256': 'Required - Webhook signature',
      'x-shopify-topic': 'Required - Event type (e.g., articles/create)',
      'x-shopify-shop-domain': 'Required - Shop domain'
    },
    supportedEvents: [
      'articles/create',
      'articles/update',
      'articles/delete',
      'blogs/create',
      'blogs/update',
      'blogs/delete'
    ],
    environment: {
      webhookSecretConfigured: !!process.env.SHOPIFY_WEBHOOK_SECRET,
      shopifyConfigured: !!(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ACCESS_TOKEN)
    }
  });
} 