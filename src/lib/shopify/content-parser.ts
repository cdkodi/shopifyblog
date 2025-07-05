import { marked } from 'marked';
import { uploadImageToShopify, ImageFile, ImageUploadResult } from './image-upload';

export interface ImageReference {
  originalSrc: string;
  alt: string;
  title?: string;
  markdownMatch: string;
  position: number;
}

export interface ProcessedContent {
  content: string;
  images: Array<{
    originalSrc: string;
    shopifyUrl: string;
    uploadResult: ImageUploadResult;
  }>;
  errors: string[];
}

/**
 * Extract image references from markdown content
 */
export function extractImageReferences(markdownContent: string): ImageReference[] {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]*)")?\)/g;
  const images: ImageReference[] = [];
  let match;

  while ((match = imageRegex.exec(markdownContent)) !== null) {
    images.push({
      originalSrc: match[2],
      alt: match[1] || '',
      title: match[3],
      markdownMatch: match[0],
      position: match.index
    });
  }

  return images;
}

/**
 * Process markdown content and upload images to Shopify
 */
export async function processContentWithImages(
  markdownContent: string,
  imageProvider: (src: string) => Promise<ImageFile | null>
): Promise<ProcessedContent> {
  const imageRefs = extractImageReferences(markdownContent);
  const errors: string[] = [];
  const processedImages: ProcessedContent['images'] = [];
  let updatedContent = markdownContent;

  // Process images sequentially to avoid rate limits
  for (const imageRef of imageRefs) {
    try {
      // Check if it's already a Shopify CDN URL
      if (isShopifyUrl(imageRef.originalSrc)) {
        continue;
      }

      // Get image file data
      const imageFile = await imageProvider(imageRef.originalSrc);
      if (!imageFile) {
        errors.push(`Could not load image: ${imageRef.originalSrc}`);
        continue;
      }

      // Upload to Shopify
      const uploadResult = await uploadImageToShopify(imageFile);
      if (!uploadResult.success) {
        errors.push(`Failed to upload ${imageRef.originalSrc}: ${uploadResult.errors.join(', ')}`);
        continue;
      }

      // Replace in content
      const newImageMarkdown = `![${imageRef.alt}](${uploadResult.url}${imageRef.title ? ` "${imageRef.title}"` : ''})`;
      updatedContent = updatedContent.replace(imageRef.markdownMatch, newImageMarkdown);

      processedImages.push({
        originalSrc: imageRef.originalSrc,
        shopifyUrl: uploadResult.url!,
        uploadResult
      });

      console.log(`✅ Uploaded image: ${imageRef.originalSrc} -> ${uploadResult.url}`);
    } catch (error) {
      errors.push(`Error processing image ${imageRef.originalSrc}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    content: updatedContent,
    images: processedImages,
    errors
  };
}

/**
 * Convert markdown to HTML with Shopify-hosted images
 */
export async function convertMarkdownToHTMLWithImages(
  markdownContent: string,
  imageProvider: (src: string) => Promise<ImageFile | null>
): Promise<{ html: string; images: ProcessedContent['images']; errors: string[] }> {
  // First process images
  const processed = await processContentWithImages(markdownContent, imageProvider);
  
  // Then convert to HTML
  const html = marked(processed.content, {
    gfm: true,
    breaks: true
  });

  return {
    html,
    images: processed.images,
    errors: processed.errors
  };
}

/**
 * Check if URL is already a Shopify CDN URL
 */
function isShopifyUrl(url: string): boolean {
  return url.includes('cdn.shopify.com') || url.includes('shopify.s3.amazonaws.com');
}

/**
 * Create image provider for base64 data URLs
 */
export function createBase64ImageProvider(): (src: string) => Promise<ImageFile | null> {
  return async (src: string): Promise<ImageFile | null> => {
    if (!src.startsWith('data:image/')) {
      return null;
    }

    try {
      const [header, base64Data] = src.split(',');
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate filename
      const extension = mimeType.split('/')[1] || 'jpg';
      const filename = `image-${Date.now()}.${extension}`;

      return {
        buffer,
        filename,
        mimeType,
        size: buffer.length
      };
    } catch (error) {
      console.error('Error processing base64 image:', error);
      return null;
    }
  };
}

/**
 * Create image provider for HTTP URLs
 */
export function createHttpImageProvider(): (src: string) => Promise<ImageFile | null> {
  return async (src: string): Promise<ImageFile | null> => {
    if (!src.startsWith('http://') && !src.startsWith('https://')) {
      return null;
    }

    try {
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      // Extract filename from URL or generate one
      const urlPath = new URL(src).pathname;
      const filename = urlPath.split('/').pop() || `image-${Date.now()}.jpg`;

      return {
        buffer,
        filename,
        mimeType: contentType,
        size: buffer.length
      };
    } catch (error) {
      console.error(`Error fetching image from ${src}:`, error);
      return null;
    }
  };
}

/**
 * Create combined image provider that handles multiple sources
 */
export function createCombinedImageProvider(): (src: string) => Promise<ImageFile | null> {
  const base64Provider = createBase64ImageProvider();
  const httpProvider = createHttpImageProvider();

  return async (src: string): Promise<ImageFile | null> => {
    if (src.startsWith('data:image/')) {
      return base64Provider(src);
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
      return httpProvider(src);
    }
    return null;
  };
}

/**
 * Optimize content for Shopify blog publishing
 */
export async function optimizeContentForShopify(
  markdownContent: string,
  options: {
    uploadImages?: boolean;
    imageProvider?: (src: string) => Promise<ImageFile | null>;
  } = {}
): Promise<{ html: string; images?: ProcessedContent['images']; errors: string[] }> {
  const { uploadImages = true, imageProvider = createCombinedImageProvider() } = options;

  if (uploadImages) {
    return convertMarkdownToHTMLWithImages(markdownContent, imageProvider);
  } else {
    // Just convert markdown to HTML without processing images
    const html = marked(markdownContent, {
      gfm: true,
      breaks: true
    });
    return { html, errors: [] };
  }
} 