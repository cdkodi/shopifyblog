import { PublishedContent } from '@/components/content-generation/content-editor';
import fetch from 'node-fetch';

export interface BlogPlatform {
  id: string;
  name: string;
  apiEndpoint?: string;
  requiresAuth: boolean;
  supportedFormats: string[];
}

export interface PublishingResult {
  success: boolean;
  url?: string;
  error?: string;
  platformId: string;
}

export class BlogIntegrationService {
  private static instance: BlogIntegrationService;
  private platforms: BlogPlatform[] = [
    {
      id: 'shopify',
      name: 'Shopify Blog',
      apiEndpoint: '/admin/api/2023-10/blogs/{blog_id}/articles.json',
      requiresAuth: true,
      supportedFormats: ['html', 'markdown']
    },
    {
      id: 'wordpress',
      name: 'WordPress',
      apiEndpoint: '/wp-json/wp/v2/posts',
      requiresAuth: true,
      supportedFormats: ['html', 'markdown']
    },
    {
      id: 'webflow',
      name: 'Webflow CMS',
      apiEndpoint: '/collections/{collection_id}/items',
      requiresAuth: true,
      supportedFormats: ['html']
    },
    {
      id: 'ghost',
      name: 'Ghost',
      apiEndpoint: '/ghost/api/v3/admin/posts',
      requiresAuth: true,
      supportedFormats: ['html', 'markdown']
    },
    {
      id: 'medium',
      name: 'Medium',
      apiEndpoint: '/v1/users/{userId}/posts',
      requiresAuth: true,
      supportedFormats: ['markdown', 'html']
    }
  ];

  public static getInstance(): BlogIntegrationService {
    if (!BlogIntegrationService.instance) {
      BlogIntegrationService.instance = new BlogIntegrationService();
    }
    return BlogIntegrationService.instance;
  }

  public getPlatforms(): BlogPlatform[] {
    return this.platforms;
  }

  /**
   * Publishes an article to Shopify Blog using the GraphQL Admin API.
   * @param content PublishedContent (from Supabase/article editor)
   * @param blogId Shopify Blog GID (e.g., 'gid://shopify/Blog/96953336105')
   * @param apiKey Shopify Admin API access token
   * @param shopDomain Your Shopify store domain (e.g., 'your-store.myshopify.com')
   */
  public async publishToShopify(
    content: PublishedContent,
    blogId: string,
    apiKey: string,
    shopDomain: string
  ): Promise<PublishingResult> {
    try {
      // Map Supabase article to Shopify fields
      const articleInput = {
        title: content.editedContent.title,
        bodyHtml: this.convertMarkdownToHtml(content.editedContent.content),
        author: 'Editor',
        tags: content.editedContent.tags,
        published: true
      };

      const mutation = `
        mutation articleCreate($input: ArticleInput!) {
          articleCreate(blogId: "${blogId}", article: $input) {
            article {
              id
              title
              handle
              url
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await fetch(`https://${shopDomain}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': apiKey
        },
        body: JSON.stringify({
          query: mutation,
          variables: { input: articleInput }
        })
      });

      const data = await response.json();
      const result = data.data?.articleCreate;
      if (result?.userErrors && result.userErrors.length > 0) {
        return {
          success: false,
          error: result.userErrors.map((e: any) => e.message).join('; '),
          platformId: 'shopify'
        };
      }
      if (result?.article) {
        return {
          success: true,
          url: result.article.url,
          platformId: 'shopify'
        };
      }
      return {
        success: false,
        error: 'Unknown error or no article returned',
        platformId: 'shopify'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platformId: 'shopify'
      };
    }
  }

  public async publishToWordPress(content: PublishedContent, siteUrl: string, username: string, appPassword: string): Promise<PublishingResult> {
    try {
      const postData = {
        title: content.editedContent.title,
        content: this.convertMarkdownToHtml(content.editedContent.content),
        excerpt: content.editedContent.metaDescription,
        slug: content.editedContent.slug,
        status: 'publish',
        tags: content.editedContent.tags.map(tag => ({ name: tag })),
        featured_media: content.editedContent.featuredImage ? await this.uploadImage(content.editedContent.featuredImage, 'wordpress') : undefined,
        date: content.editedContent.scheduledDate || new Date().toISOString()
      };

      // Mock successful WordPress response
      const mockResponse = {
        id: Math.floor(Math.random() * 10000),
        link: `${siteUrl}/${postData.slug}`
      };

      return {
        success: true,
        url: mockResponse.link,
        platformId: 'wordpress'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platformId: 'wordpress'
      };
    }
  }

  public async publishToGhost(content: PublishedContent, apiUrl: string, apiKey: string): Promise<PublishingResult> {
    try {
      const postData = {
        posts: [{
          title: content.editedContent.title,
          html: this.convertMarkdownToHtml(content.editedContent.content),
          slug: content.editedContent.slug,
          meta_description: content.editedContent.metaDescription,
          tags: content.editedContent.tags.map(tag => ({ name: tag })),
          status: 'published',
          published_at: content.editedContent.scheduledDate || new Date().toISOString(),
          feature_image: content.editedContent.featuredImage
        }]
      };

      // Mock successful Ghost response
      const mockResponse = {
        posts: [{
          id: Math.floor(Math.random() * 10000),
          url: `${apiUrl.replace('/ghost/api/v3/admin', '')}/${postData.posts[0].slug}`
        }]
      };

      return {
        success: true,
        url: mockResponse.posts[0].url,
        platformId: 'ghost'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platformId: 'ghost'
      };
    }
  }

  public async saveAsDraft(content: PublishedContent): Promise<PublishingResult> {
    try {
      // Save to local storage or database
      const draftId = `draft_${Date.now()}`;
      const draftData = {
        id: draftId,
        ...content,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(draftId, JSON.stringify(draftData));

      return {
        success: true,
        url: `/drafts/${draftId}`,
        platformId: 'draft'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to save draft',
        platformId: 'draft'
      };
    }
  }

  public async exportAsFiles(content: PublishedContent): Promise<{ markdown: string; html: string; json: string }> {
    const markdownContent = this.formatAsMarkdown(content);
    const htmlContent = this.convertMarkdownToHtml(content.editedContent.content);
    const jsonContent = JSON.stringify(content, null, 2);

    return {
      markdown: markdownContent,
      html: htmlContent,
      json: jsonContent
    };
  }

  private convertMarkdownToHtml(markdown: string): string {
    // Simple markdown to HTML conversion
    // In a real implementation, you'd use a proper markdown parser
    return markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<h|<\/p>)(.+)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '');
  }

  private formatAsMarkdown(content: PublishedContent): string {
    const frontMatter = `---
title: "${content.editedContent.title}"
slug: "${content.editedContent.slug}"
description: "${content.editedContent.metaDescription}"
tags: [${content.editedContent.tags.map(tag => `"${tag}"`).join(', ')}]
date: "${content.editedContent.scheduledDate || new Date().toISOString()}"
${content.editedContent.featuredImage ? `featured_image: "${content.editedContent.featuredImage}"` : ''}
seo_score: ${Math.round((content.seoOptimizations.keywordDensity + content.seoOptimizations.readabilityScore + content.seoOptimizations.headingsStructure) / 3)}
word_count: ${content.editedContent.content.split(' ').length}
reading_time: ${Math.ceil(content.editedContent.content.split(' ').length / 200)}
ai_provider: "${content.generatedContent.metadata.aiProvider}"
generation_cost: ${content.generatedContent.metadata.cost}
---

`;

    return frontMatter + content.editedContent.content;
  }

  private async uploadImage(imageUrl: string, platform: string): Promise<number | undefined> {
    // Mock image upload - in real implementation, this would upload to the platform's media library
    return Math.floor(Math.random() * 10000);
  }
}

export const blogIntegration = BlogIntegrationService.getInstance(); 