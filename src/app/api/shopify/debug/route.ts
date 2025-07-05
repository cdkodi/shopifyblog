import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-07';

    const envCheck = {
      SHOPIFY_STORE_DOMAIN: {
        set: !!storeDomain,
        value: storeDomain ? `${storeDomain.substring(0, 10)}...` : 'NOT SET',
        length: storeDomain?.length || 0
      },
      SHOPIFY_ACCESS_TOKEN: {
        set: !!accessToken,
        value: accessToken ? `${accessToken.substring(0, 8)}...` : 'NOT SET',
        length: accessToken?.length || 0
      },
      SHOPIFY_API_VERSION: {
        set: !!apiVersion,
        value: apiVersion,
        length: apiVersion?.length || 0
      }
    };

    // Test basic GraphQL request
    let graphqlTest = null;
    let graphqlError = null;

    if (storeDomain && accessToken) {
      try {
        const response = await fetch(`https://${storeDomain}/admin/api/${apiVersion}/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify({
            query: `
              query {
                shop {
                  name
                  id
                }
              }
            `
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          graphqlTest = {
            success: true,
            status: response.status,
            shop: data.data?.shop || null
          };
        } else {
          graphqlTest = {
            success: false,
            status: response.status,
            error: data
          };
        }
      } catch (error) {
        graphqlError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      environmentVariables: envCheck,
      graphqlTest,
      graphqlError,
      recommendations: [
        storeDomain ? null : 'Set SHOPIFY_STORE_DOMAIN (format: your-store.myshopify.com)',
        accessToken ? null : 'Set SHOPIFY_ACCESS_TOKEN (get from Shopify Admin > Apps > Private apps)',
        !storeDomain?.includes('.myshopify.com') ? 'Store domain should end with .myshopify.com' : null,
        accessToken && accessToken.length < 30 ? 'Access token seems too short, verify it\'s correct' : null
      ].filter(Boolean)
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 