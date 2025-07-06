import { NextRequest, NextResponse } from 'next/server';
import { ShopifyFilesService } from '@/lib/shopify/files-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'browser';
    const query = searchParams.get('query');
    const articleTitle = searchParams.get('title');
    const articleContent = searchParams.get('content');
    const articleTags = searchParams.get('tags')?.split(',').filter(Boolean) || [];

    console.log('🖼️ Shopify Images API - GET request:', {
      action,
      query: query?.slice(0, 20),
      articleTitle: articleTitle?.slice(0, 30),
      hasContent: !!articleContent,
      tagsCount: articleTags.length
    });

    switch (action) {
      case 'browser':
        // Get complete image browser data
        const browserData = await ShopifyFilesService.getImageBrowserData(
          articleTitle || undefined,
          articleContent || undefined,
          articleTags
        );

        return NextResponse.json({
          success: true,
          data: browserData,
          meta: {
            suggestedCount: browserData.suggested.length,
            productsCount: browserData.products.length,
            filesCount: browserData.files.length,
            recentCount: browserData.recent.length
          }
        });

      case 'search':
        if (!query) {
          return NextResponse.json({
            success: false,
            error: 'Query parameter is required for search'
          }, { status: 400 });
        }

        const searchResults = await ShopifyFilesService.searchImages(query);
        return NextResponse.json({
          success: true,
          data: {
            images: searchResults,
            query,
            count: searchResults.length
          }
        });

      case 'suggestions':
        if (!articleTitle) {
          return NextResponse.json({
            success: false,
            error: 'Article title is required for suggestions'
          }, { status: 400 });
        }

        const suggestions = await ShopifyFilesService.getContextAwareImageSuggestions(
          articleTitle,
          articleContent || '',
          articleTags
        );

        return NextResponse.json({
          success: true,
          data: {
            suggestions,
            count: suggestions.length,
            context: {
              title: articleTitle,
              tagsCount: articleTags.length,
              hasContent: !!articleContent
            }
          }
        });

      case 'products':
        const productImages = await ShopifyFilesService.getProductImages();
        return NextResponse.json({
          success: true,
          data: {
            images: productImages,
            count: productImages.length
          }
        });

      case 'files':
        const limit = parseInt(searchParams.get('limit') || '50');
        const shopifyFiles = await ShopifyFilesService.getShopifyFiles(limit);
        
        // Filter only image files
        const imageFiles = shopifyFiles.filter(file => file.contentType === 'image');
        
        return NextResponse.json({
          success: true,
          data: {
            files: imageFiles,
            count: imageFiles.length,
            totalFiles: shopifyFiles.length
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: browser, search, suggestions, products, files'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Shopify Images API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch images',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, query, articleTitle, articleContent, articleTags } = body;

    console.log('🖼️ Shopify Images API - POST request:', {
      action,
      query: query?.slice(0, 20),
      articleTitle: articleTitle?.slice(0, 30),
      hasContent: !!articleContent,
      tagsCount: articleTags?.length || 0
    });

    switch (action) {
      case 'contextual-suggestions':
        if (!articleTitle) {
          return NextResponse.json({
            success: false,
            error: 'Article title is required for contextual suggestions'
          }, { status: 400 });
        }

        const suggestions = await ShopifyFilesService.getContextAwareImageSuggestions(
          articleTitle,
          articleContent || '',
          articleTags || []
        );

        return NextResponse.json({
          success: true,
          data: {
            suggestions,
            count: suggestions.length,
            context: {
              title: articleTitle,
              contentLength: articleContent?.length || 0,
              tagsCount: articleTags?.length || 0
            }
          }
        });

      case 'search':
        if (!query) {
          return NextResponse.json({
            success: false,
            error: 'Query is required for search'
          }, { status: 400 });
        }

        const searchResults = await ShopifyFilesService.searchImages(query);
        return NextResponse.json({
          success: true,
          data: {
            images: searchResults,
            query,
            count: searchResults.length
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action for POST request'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Shopify Images API POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process image request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 