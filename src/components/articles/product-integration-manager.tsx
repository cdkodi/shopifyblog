import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { ShopifyProductService } from '@/lib/supabase/shopify-products';

interface ProductSuggestion {
  id: string;
  article_id: string | null;
  product_id: string | null;
  suggestion_type: string | null;
  relevance_score: number | null;
  position_in_content?: number | null;
  link_text?: string | null;
  utm_campaign?: string | null;
  is_approved: boolean | null;
  created_at: string | null;
  // Joined product data
  product: {
    id: string;
    title: string;
    handle: string;
    description?: string | null;
    product_type?: string | null;
    collections: any;
    tags: any;
    price_min?: number | null;
    price_max?: number | null;
    shopify_url?: string | null;
  } | null;
}

interface ProductIntegrationManagerProps {
  articleId: string;
  articleTitle: string;
  articleContent: string;
  onUpdate?: () => void;
}

export function ProductIntegrationManager({ 
  articleId, 
  articleTitle, 
  articleContent,
  onUpdate 
}: ProductIntegrationManagerProps) {
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProduct, setAddingProduct] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [linkText, setLinkText] = useState('');
  const [positionInContent, setPositionInContent] = useState<number>(1);
  const [dropdownInfo, setDropdownInfo] = useState<string>('');

  useEffect(() => {
    loadSuggestions();
    loadAvailableProducts();
  }, [articleId]);

  const loadSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('article_product_suggestions')
        .select(`
          *,
          product:shopify_products(*)
        `)
        .eq('article_id', articleId)
        .order('relevance_score', { ascending: false });

      if (error) {
        console.error('Error loading suggestions:', error);
        return;
      }

      setSuggestions(data || []);
    } catch (err) {
      console.error('Unexpected error loading suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableProducts = async () => {
    try {
      // Get only products relevant to this article's art form
      const titleWords = articleTitle.toLowerCase().split(' ').filter(word => word.length > 3);
      const contentWords = articleContent.toLowerCase().split(' ').filter(word => word.length > 3);
      const keywords = [...new Set([...titleWords, ...contentWords.slice(0, 10)])];
      
      console.log('🔍 Loading available products for article:', {
        title: articleTitle,
        extractedKeywords: keywords.slice(0, 5)
      });

      // First try strict art form filtering
      const strictProducts = await ShopifyProductService.getStrictArtFormProducts(
        articleTitle,
        keywords.slice(0, 5)
      );

      if (strictProducts.length > 0) {
        console.log('✅ Found strict art form products for dropdown:', strictProducts.length);
        setAvailableProducts(strictProducts);
        setDropdownInfo(`Found ${strictProducts.length} products matching your article topic`);
      } else {
        console.log('🔍 No strict matches, falling back to all products for manual selection');
        // If no strict matches, load all products but indicate this in UI
        const allProducts = await ShopifyProductService.getAllActiveProducts();
        setAvailableProducts(allProducts);
        setDropdownInfo(`No topic-specific products found. Showing all ${allProducts.length} products for manual selection`);
      }
    } catch (err) {
      console.error('Error loading available products:', err);
      // Fallback to all products
      const allProducts = await ShopifyProductService.getAllActiveProducts();
      setAvailableProducts(allProducts);
      setDropdownInfo(`Error loading topic products. Showing all ${allProducts.length} products`);
    }
  };

  const generateAutoSuggestions = async () => {
    try {
      setLoading(true);
      
      console.log('🎯 Article Integration - Generating STRICT suggestions for:', {
        title: articleTitle,
        contentLength: articleContent.length
      });
      
      // Extract keywords from article title and content
      const titleWords = articleTitle.toLowerCase().split(' ').filter(word => word.length > 3);
      const contentWords = articleContent.toLowerCase().split(' ').filter(word => word.length > 3);
      const keywords = [...new Set([...titleWords, ...contentWords.slice(0, 10)])];
      
      console.log('🔧 Extracted keywords for art form detection:', keywords.slice(0, 5));
      
      // Use STRICT art form filtering - no fallbacks
      const strictProducts = await ShopifyProductService.getStrictArtFormProducts(
        articleTitle,
        keywords.slice(0, 5)
      );
      
      console.log('🎯 Strict art form filtering results:', {
        productsFound: strictProducts.length,
        titles: strictProducts.map((p: any) => p.title).slice(0, 3)
      });

      if (strictProducts.length === 0) {
        alert(`No products found that specifically match your article topic.\n\nTo add products manually:\n1. Click "Add Product"\n2. Search through available products\n3. Select relevant items\n\nThis ensures only genuinely relevant products are suggested.`);
        return;
      }

      // Create suggestions for ALL found products (they're all highly relevant)
      const newSuggestions = strictProducts.map((product: any, index: number) => ({
        article_id: articleId,
        product_handle: product.handle,
        suggestion_type: 'auto' as const,
        relevance_score: product.relevanceScore || (95 - index * 2),
        position_in_content: index + 1,
        link_text: `Learn more about ${product.title}`,
        utm_campaign: 'strict_art_form_suggestion',
        is_approved: false
      }));

      console.log('🎯 Creating strict suggestions for products:', newSuggestions.map((s: any) => s.product_handle));

      // Insert suggestions into database
      for (const suggestion of newSuggestions) {
        try {
          // Get the actual product ID from the database
          const { data: productData, error: productError } = await supabase
            .from('shopify_products')
            .select('id')
            .eq('handle', suggestion.product_handle)
            .single();

          if (productError) {
            console.error('🔧 Error finding product by handle:', suggestion.product_handle, productError);
            continue;
          }

          if (productData) {
            const { error: insertError } = await supabase
              .from('article_product_suggestions')
              .insert({
                article_id: suggestion.article_id,
                product_id: productData.id,
                suggestion_type: suggestion.suggestion_type,
                relevance_score: suggestion.relevance_score,
                position_in_content: suggestion.position_in_content,
                link_text: suggestion.link_text,
                utm_campaign: suggestion.utm_campaign,
                is_approved: suggestion.is_approved
              });

            if (insertError) {
              console.error('🔧 Error inserting suggestion:', insertError);
            } else {
              console.log('✅ Successfully created strict suggestion for:', suggestion.product_handle);
            }
          }
        } catch (err) {
          console.error('🔧 Unexpected error creating suggestion:', err);
        }
      }

      // Reload suggestions to show new ones
      await loadSuggestions();
      onUpdate?.();
      
      // Show success message
      alert(`✅ Found ${strictProducts.length} highly relevant products for your article!\n\nAll suggestions have 90%+ relevance to your topic.`);
      
    } catch (err) {
      console.error('Error generating strict auto suggestions:', err);
      alert('Error generating suggestions. Please try again or add products manually.');
    } finally {
      setLoading(false);
    }
  };

  const addManualSuggestion = async () => {
    // Validation with user feedback
    if (!selectedProduct) {
      alert('Please select a product first.');
      return;
    }
    
    if (!linkText.trim()) {
      alert('Please enter link text (e.g., "Check out this beautiful artwork").');
      return;
    }

    setAddingProduct(true);
    try {
      console.log('🔧 Adding manual suggestion:', {
        selectedProduct,
        linkText,
        positionInContent,
        articleId
      });

      // Get the product ID from the database
      const { data: productData, error: productError } = await supabase
        .from('shopify_products')
        .select('id, title')
        .eq('handle', selectedProduct)
        .single();

      if (productError) {
        console.error('Error finding product:', productError);
        alert('Error finding the selected product. Please try again.');
        return;
      }

      if (!productData) {
        console.error('Product not found for handle:', selectedProduct);
        alert('Selected product not found in database. Please try selecting a different product.');
        return;
      }

      console.log('✅ Found product:', productData);

      // Insert the suggestion
      const { error: insertError } = await supabase
        .from('article_product_suggestions')
        .insert({
          article_id: articleId,
          product_id: productData.id,
          suggestion_type: 'manual',
          relevance_score: 75, // Default score for manual additions
          position_in_content: positionInContent,
          link_text: linkText.trim(),
          utm_campaign: 'manual_suggestion',
          is_approved: false
        });

      if (insertError) {
        console.error('Error inserting suggestion:', insertError);
        alert(`Error adding product suggestion: ${insertError.message}`);
        return;
      }

      console.log('✅ Successfully added manual suggestion');

      // Success feedback
      alert(`✅ Product suggestion added successfully!\n\n"${linkText}" will appear after paragraph ${positionInContent}.`);

      // Reset form and close dialog
      setSelectedProduct('');
      setLinkText('');
      setPositionInContent(1);
      setShowAddDialog(false);

      // Reload suggestions to show the new one
      await loadSuggestions();
      onUpdate?.();
      
    } catch (err) {
      console.error('Unexpected error adding suggestion:', err);
      alert(`Unexpected error: ${err}. Please try again.`);
    } finally {
      setAddingProduct(false);
    }
  };

  const updateSuggestionStatus = async (suggestionId: string, isApproved: boolean) => {
    try {
      const { error } = await supabase
        .from('article_product_suggestions')
        .update({ is_approved: isApproved })
        .eq('id', suggestionId);

      if (error) {
        console.error('Error updating suggestion status:', error);
        return;
      }

      // Update local state
      setSuggestions(prev => 
        prev.map(s => 
          s.id === suggestionId 
            ? { ...s, is_approved: isApproved }
            : s
        )
      );

      onUpdate?.();
    } catch (err) {
      console.error('Unexpected error updating suggestion:', err);
    }
  };

  const removeSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('article_product_suggestions')
        .delete()
        .eq('id', suggestionId);

      if (error) {
        console.error('Error removing suggestion:', error);
        return;
      }

      // Update local state
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      onUpdate?.();
    } catch (err) {
      console.error('Unexpected error removing suggestion:', err);
    }
  };

  const getRelevanceColor = (score: number | null) => {
    if (!score) return 'text-gray-600 bg-gray-50';
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSuggestionTypeColor = (type: string | null) => {
    if (!type) return 'bg-gray-100 text-gray-800';
    const colors = {
      auto: 'bg-blue-100 text-blue-800',
      manual: 'bg-purple-100 text-purple-800',
      editor_added: 'bg-green-100 text-green-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Generate HTML preview of article with product links
  const generateArticlePreview = (): string => {
    if (!articleContent || suggestions.length === 0) {
      return `<div class="article-preview">
        <h1>${articleTitle}</h1>
        <div class="content">${articleContent.replace(/\n/g, '<br>')}</div>
        <p><em>No product links added yet.</em></p>
      </div>`;
    }

    let content = articleContent;
    const approvedSuggestions = suggestions.filter(s => s.is_approved);
    
    if (approvedSuggestions.length === 0) {
      return `<div class="article-preview">
        <h1>${articleTitle}</h1>
        <div class="content">${content.replace(/\n/g, '<br>')}</div>
        <p><em>No approved product links yet. Approve suggestions to see them in preview.</em></p>
      </div>`;
    }

    // Sort suggestions by position
    const sortedSuggestions = [...approvedSuggestions].sort((a, b) => 
      (a.position_in_content || 0) - (b.position_in_content || 0)
    );

    // Split content into paragraphs
    const paragraphs = content.split(/\n\s*\n/);
    let htmlContent = '';

    sortedSuggestions.forEach((suggestion, index) => {
      if (!suggestion.product) return;
      
      const position = suggestion.position_in_content || (index + 1);
      const paragraphIndex = Math.min(position - 1, paragraphs.length - 1);
      
      if (paragraphs[paragraphIndex] && !paragraphs[paragraphIndex].includes('🔗')) {
        const productLink = `<a href="${suggestion.product.shopify_url || '#'}" target="_blank" class="product-link" style="color: #2563eb; text-decoration: underline; font-weight: 500;">🔗 ${suggestion.link_text}</a>`;
        paragraphs[paragraphIndex] += `\n\n${productLink}`;
      }
    });

    htmlContent = paragraphs.join('<br><br>');

    return `<div class="article-preview" style="max-height: 500px; overflow-y: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">
      <h1 style="color: #1f2937; margin-bottom: 20px; font-size: 24px; font-weight: bold;">${articleTitle}</h1>
      <div class="content" style="line-height: 1.6; color: #374151;">${htmlContent}</div>
      <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px;">Product Links Added:</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${approvedSuggestions.filter(s => s.product).map(s => 
            `<li style="margin-bottom: 5px;">${s.product!.title} (Position ${s.position_in_content})</li>`
          ).join('')}
        </ul>
      </div>
    </div>`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading product suggestions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Product Integration</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                // Test search functionality
                try {
                  console.log('🧪 Testing strict search for article:', articleTitle);
                  const titleWords = articleTitle.toLowerCase().split(' ').filter(word => word.length > 3);
                  const testProducts = await ShopifyProductService.getStrictArtFormProducts(
                    articleTitle,
                    titleWords.slice(0, 3)
                  );
                  
                  if (testProducts.length > 0) {
                    const productList = testProducts.map((p: any) => 
                      `• ${p.title} (${p.relevanceScore}% relevant)`
                    ).join('\n');
                    alert(`✅ Found ${testProducts.length} strict matches:\n\n${productList}`);
                  } else {
                    alert('❌ No strict matches found for this article topic');
                  }
                } catch (err) {
                  alert(`Test failed: ${err}`);
                }
              }}
              disabled={loading}
            >
              🧪 Test Strict Search
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={generateAutoSuggestions}
              disabled={loading}
            >
              🎯 Generate Suggestions
            </Button>
            {suggestions.filter(s => s.is_approved).length > 0 && (
              <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    👁️ Preview Article
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Article Preview with Product Links</DialogTitle>
                  </DialogHeader>
                  <div dangerouslySetInnerHTML={{ __html: generateArticlePreview() }} />
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">+ Add Product</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Product Suggestion</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {dropdownInfo && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
                      ℹ️ {dropdownInfo}
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Product</label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProducts.map((product) => (
                          <SelectItem key={product.handle} value={product.handle}>
                            {product.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Link Text</label>
                    <Input
                      placeholder="e.g., Check out this beautiful artwork"
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Position in Content</label>
                    <Input
                      type="number"
                      min="1"
                      value={positionInContent}
                      onChange={(e) => setPositionInContent(parseInt(e.target.value) || 1)}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Position 1 = after 1st paragraph, Position 2 = after 2nd paragraph, etc.
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={addManualSuggestion}
                      disabled={addingProduct || !selectedProduct || !linkText.trim()}
                    >
                      {addingProduct ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Adding...
                        </>
                      ) : (
                        'Add Suggestion'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-lg mb-2">No product suggestions yet</div>
            <p className="text-gray-500 mb-4">
              Generate automatic suggestions based on your article topic
            </p>
            <Button onClick={generateAutoSuggestions}>
              🎯 Generate Strict Suggestions
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{suggestions.length} product suggestion{suggestions.length !== 1 ? 's' : ''}</span>
              <span>{suggestions.filter(s => s.is_approved).length} approved</span>
            </div>
            
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {suggestion.product?.title || 'Unknown Product'}
                      </h4>
                      <Badge className={getSuggestionTypeColor(suggestion.suggestion_type)}>
                        {suggestion.suggestion_type === 'auto' ? 'strict-match' : suggestion.suggestion_type}
                      </Badge>
                      <Badge 
                        className={`${getRelevanceColor(suggestion.relevance_score)} border-0`}
                      >
                        {suggestion.relevance_score}% relevant
                      </Badge>
                      {suggestion.is_approved && (
                        <Badge className="bg-green-100 text-green-800">
                          ✓ Approved & Linked
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {suggestion.product?.description?.substring(0, 100)}...
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>🔗 {suggestion.link_text}</span>
                      <span>📍 After paragraph {suggestion.position_in_content}</span>
                      {suggestion.product?.price_min && (
                        <span>💰 ₹{suggestion.product.price_min}</span>
                      )}
                    </div>
                    
                    {suggestion.product?.tags && suggestion.product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {suggestion.product.tags.slice(0, 3).map((tag: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {suggestion.product.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{suggestion.product.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {!suggestion.is_approved ? (
                      <Button 
                        size="sm" 
                        onClick={() => updateSuggestionStatus(suggestion.id, true)}
                      >
                        Approve & Link
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => updateSuggestionStatus(suggestion.id, false)}
                      >
                        Unapprove
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => removeSuggestion(suggestion.id)}
                    >
                      Remove
                    </Button>
                    
                    {suggestion.product?.shopify_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(suggestion.product!.shopify_url || '#', '_blank')}
                      >
                        View Product
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 