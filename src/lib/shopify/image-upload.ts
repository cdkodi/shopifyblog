import { shopifyClient } from './graphql-client';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  shopifyFileId?: string;
  errors: string[];
}

export interface ImageFile {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Upload image to Shopify Files API using staged uploads
 */
export async function uploadImageToShopify(imageFile: ImageFile): Promise<ImageUploadResult> {
  try {
    // Step 1: Create staged upload
    const stagedUpload = await createStagedUpload(imageFile);
    if (!stagedUpload.success) {
      return {
        success: false,
        errors: stagedUpload.errors
      };
    }

    // Step 2: Upload file to staged URL
    const uploadResult = await uploadToStagedTarget(
      imageFile, 
      stagedUpload.target!
    );
    if (!uploadResult.success) {
      return {
        success: false,
        errors: uploadResult.errors
      };
    }

    // Step 3: Create file in Shopify
    const fileResult = await createShopifyFile(
      stagedUpload.target!.resourceUrl,
      imageFile.filename
    );

    return fileResult;
  } catch (error) {
    console.error('Error uploading image to Shopify:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

interface StagedTarget {
  url: string;
  resourceUrl: string;
  parameters: Array<{ name: string; value: string }>;
}

interface StagedUploadResult {
  success: boolean;
  target?: StagedTarget;
  errors: string[];
}

/**
 * Create staged upload target
 */
async function createStagedUpload(imageFile: ImageFile): Promise<StagedUploadResult> {
  const mutation = `
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: [{
      filename: imageFile.filename,
      httpMethod: "POST",
      mimeType: imageFile.mimeType,
      resource: "FILE", // Use FILE instead of IMAGE for blog images
      fileSize: imageFile.size.toString()
    }]
  };

  try {
    const response = await shopifyClient.request(mutation, variables);
    
    if (response.stagedUploadsCreate.userErrors.length > 0) {
      return {
        success: false,
        errors: response.stagedUploadsCreate.userErrors.map((e: any) => e.message)
      };
    }

    const target = response.stagedUploadsCreate.stagedTargets[0];
    return {
      success: true,
      target,
      errors: []
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Failed to create staged upload']
    };
  }
}

/**
 * Upload file to staged target URL
 */
async function uploadToStagedTarget(
  imageFile: ImageFile, 
  target: StagedTarget
): Promise<{ success: boolean; errors: string[] }> {
  const FormData = require('form-data');
  
  try {
    const form = new FormData();
    
    // Add all parameters from Shopify
    target.parameters.forEach(({ name, value }) => {
      form.append(name, value);
    });
    
    // Add the file
    form.append('file', imageFile.buffer, {
      filename: imageFile.filename,
      contentType: imageFile.mimeType
    });

    // Determine headers based on upload target
    const headers: any = {
      ...form.getHeaders()
    };

    // Add Content-Length for AWS uploads, but not for Google Cloud
    if (target.url.includes('amazonaws.com')) {
      headers['Content-Length'] = imageFile.size + 5000; // AWS buffer
    }

    const response = await fetch(target.url, {
      method: 'POST',
      body: form,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        errors: [`Upload failed: ${response.status} ${response.statusText} - ${errorText}`]
      };
    }

    return {
      success: true,
      errors: []
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Upload to staged target failed']
    };
  }
}

/**
 * Create file in Shopify after successful upload
 */
async function createShopifyFile(
  resourceUrl: string, 
  filename: string
): Promise<ImageUploadResult> {
  const mutation = `
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          id
          url
          alt
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    files: [{
      alt: filename,
      contentType: "IMAGE",
      originalSource: resourceUrl
    }]
  };

  try {
    const response = await shopifyClient.request(mutation, variables);
    
    if (response.fileCreate.userErrors.length > 0) {
      return {
        success: false,
        errors: response.fileCreate.userErrors.map((e: any) => e.message)
      };
    }

    const file = response.fileCreate.files[0];
    return {
      success: true,
      url: file.url,
      shopifyFileId: file.id,
      errors: []
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Failed to create file in Shopify']
    };
  }
}

/**
 * Upload multiple images in parallel
 */
export async function uploadMultipleImages(
  images: ImageFile[]
): Promise<ImageUploadResult[]> {
  const uploadPromises = images.map(image => uploadImageToShopify(image));
  return Promise.all(uploadPromises);
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: ImageFile): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check file size (20MB limit)
  if (file.size > 20 * 1024 * 1024) {
    errors.push('Image file size exceeds 20MB limit');
  }
  
  // Check MIME type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.mimeType)) {
    errors.push(`Unsupported image type: ${file.mimeType}`);
  }
  
  // Check filename
  if (!file.filename || file.filename.startsWith('.')) {
    errors.push('Invalid filename');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
} 