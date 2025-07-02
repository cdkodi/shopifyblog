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
  article_id: string;
  product_id: string;
  suggestion_type: 'auto' | 'manual' | 'editor_added';
  relevance_score: number;
  position_in_content?: number;
  link_text?: string;
  utm_campaign?: string;
  is_approved: boolean;
  created_at: string;
  // Joined product data
  product: {
    id: string;
    title: string;
    handle: string;
    description?: string;
    product_type?: string;
    collections: string[];
    tags: string[];
    price_min?: number;
    price_max?: number;
    shopify_url?: string;
  };
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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [linkText, setLinkText] = useState('');
  const [positionInContent, setPositionInContent] = useState<number>(1);

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
      // Get all active products for manual selection
      const products = await ShopifyProductService.getAllActiveProducts();
      setAvailableProducts(products);
    } catch (err) {
      console.error('Error loading available products:', err);
    }
  };

  const generateAutoSuggestions = async () => {
    try {
      setLoading(true);
      
      console.log('🔧 Article Integration - Generating suggestions for:', {
        title: articleTitle,
        contentLength: articleContent.length
      });
      
      // Extract basic keywords from article title and content for matching
      const titleWords = articleTitle.toLowerCase().split(' ').filter(word => word.length > 3);
      const contentWords = articleContent.toLowerCase().split(' ').filter(word => word.length > 3);
      const keywords = [...new Set([...titleWords, ...contentWords.slice(0, 10)])];
      
      console.log('🔧 Extracted keywords:', keywords.slice(0, 5));
      
      // Use the GET API method that works with getRelevantProducts
      const searchParams = new URLSearchParams({
        topic: articleTitle,
        keywords: keywords.slice(0, 5).join(','),
        limit: '10'
      });
      
      const searchResponse = await fetch(`/api/products?${searchParams}`, {
        method: 'GET'
      });

      let relevantProducts = [];
      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.success && searchResult.data?.products) {
          relevantProducts = searchResult.data.products;
          console.log('🔧 Found relevant products via GET API:', relevantProducts.map((p: any) => ({
            title: p.title,
            tags: p.tags,
            relevanceScore: p.relevanceScore
          })));
        } else {
          console.error('🔧 GET API search failed:', searchResult.error);
        }
      } else {
        console.error('🔧 GET API request failed:', searchResponse.status);
      }

      // Fallback to service method if API fails
      if (relevantProducts.length === 0) {
        console.log('🔧 Falling back to service method...');
        relevantProducts = await ShopifyProductService.getRelevantProducts(
          articleTitle,
          keywords.slice(0, 5)
        );
        
        console.log('🔧 Service method results:', relevantProducts.map(p => ({
          title: p.title,
          tags: p.tags,
          relevanceScore: (p as any).relevanceScore
        })));
      }

      if (relevantProducts.length === 0) {
        alert('No relevant products found. Try adding products manually or check if Madhubani products exist in the database.');
        return;
      }

      // Create suggestions for top 5 most relevant products
      const newSuggestions = relevantProducts.slice(0, 5).map((product: any, index: number) => ({
        article_id: articleId,
        product_handle: product.handle, // Store handle for lookup
        suggestion_type: 'auto' as const,
        relevance_score: product.relevanceScore || Math.max(90 - index * 10, 50),
        position_in_content: index + 1,
        link_text: `Learn more about ${product.title}`,
        utm_campaign: 'auto_suggestion',
        is_approved: false
      }));

      console.log('🔧 Creating suggestions for products:', newSuggestions.map((s: any) => s.product_handle));

      // Insert suggestions into database
      for (const suggestion of newSuggestions) {
        try {
          // First, get the actual product ID from the database
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
              console.log('🔧 Successfully created suggestion for:', suggestion.product_handle);
            }
          } else {
            console.error('🔧 Product not found for handle:', suggestion.product_handle);
          }
        } catch (err) {
          console.error('🔧 Unexpected error creating suggestion:', err);
        }
      }

      // Reload suggestions
      await loadSuggestions();
      onUpdate?.();
    } catch (err) {
      console.error('Error generating auto suggestions:', err);
      alert('Error generating suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addManualSuggestion = async () => {
    if (!selectedProduct || !linkText) return;

    try {
      // Get the product ID from the database
      const { data: productData } = await supabase
        .from('shopify_products')
        .select('id')
        .eq('handle', selectedProduct)
        .single();

      if (!productData) {
        console.error('Product not found');
        return;
      }

      const { error } = await supabase
        .from('article_product_suggestions')
        .insert({
          article_id: articleId,
          product_id: productData.id,
          suggestion_type: 'manual',
          relevance_score: 75, // Default score for manual additions
          position_in_content: positionInContent,
          link_text: linkText,
          utm_campaign: 'manual_suggestion',
          is_approved: false
        });

      if (error) {
        console.error('Error adding suggestion:', error);
        return;
      }

      // Reset form and close dialog
      setSelectedProduct('');
      setLinkText('');
      setPositionInContent(1);
      setShowAddDialog(false);

      // Reload suggestions
      await loadSuggestions();
      onUpdate?.();
    } catch (err) {
      console.error('Unexpected error adding suggestion:', err);
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

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSuggestionTypeColor = (type: string) => {
    const colors = {
      auto: 'bg-blue-100 text-blue-800',
      manual: 'bg-purple-100 text-purple-800',
      editor_added: 'bg-green-100 text-green-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
                  console.log('🧪 Testing search for article:', articleTitle);
                  const testParams = new URLSearchParams({
                    topic: articleTitle,
                    keywords: 'madhubani,art,traditional',
                    limit: '5'
                  });
                  const response = await fetch(`/api/products?${testParams}`, {
                    method: 'GET'
                  });
                  
                  if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data?.products) {
                      const products = result.data.products;
                      const productList = products.map((p: any) => 
                        `• ${p.title} (tags: ${p.tags?.join(', ') || 'none'})`
                      ).join('\n');
                      alert(`Found ${products.length} products:\n\n${productList}`);
                    } else {
                      alert(`Search failed: ${result.error || 'No products found'}`);
                    }
                  } else {
                    alert(`API error: ${response.status}`);
                  }
                } catch (err) {
                  alert(`Test failed: ${err}`);
                }
              }}
              disabled={loading}
            >
              🧪 Test Search
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={generateAutoSuggestions}
              disabled={loading}
            >
              🤖 Generate Suggestions
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">+ Add Product</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Product Suggestion</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
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
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addManualSuggestion}>
                      Add Suggestion
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
              Generate automatic suggestions or add products manually
            </p>
            <Button onClick={generateAutoSuggestions}>
              🤖 Generate Auto Suggestions
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
                        {suggestion.product.title}
                      </h4>
                      <Badge className={getSuggestionTypeColor(suggestion.suggestion_type)}>
                        {suggestion.suggestion_type}
                      </Badge>
                      <Badge 
                        className={`${getRelevanceColor(suggestion.relevance_score)} border-0`}
                      >
                        {suggestion.relevance_score}% relevant
                      </Badge>
                      {suggestion.is_approved && (
                        <Badge className="bg-green-100 text-green-800">
                          ✓ Approved
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {suggestion.product.description?.substring(0, 100)}...
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>🔗 {suggestion.link_text}</span>
                      <span>📍 Position: {suggestion.position_in_content}</span>
                      {suggestion.product.price_min && (
                        <span>💰 ${suggestion.product.price_min}</span>
                      )}
                    </div>
                    
                    {suggestion.product.tags && suggestion.product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {suggestion.product.tags.slice(0, 3).map((tag, idx) => (
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
                        Approve
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
                    
                    {suggestion.product.shopify_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(suggestion.product.shopify_url, '_blank')}
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