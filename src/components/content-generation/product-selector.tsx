'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductForContentGeneration } from '@/lib/supabase/shopify-products';

interface ProductSelectorProps {
  selectedProducts: ProductForContentGeneration[];
  onProductsChange: (products: ProductForContentGeneration[]) => void;
  maxProducts?: number;
  contentTopic?: string;
  preferredCollections?: string[];
  isDevMode?: boolean;
}

interface ProductWithRelevance extends ProductForContentGeneration {
  relevanceScore?: number;
  matchReason?: string;
}

// Mock products for development mode
const mockProducts: ProductForContentGeneration[] = [
  {
    handle: 'madhubani-ganesha-painting',
    title: 'Traditional Madhubani Ganesha Painting',
    description: 'Authentic handpainted Madhubani art featuring Lord Ganesha in traditional Bihar style.',
    product_type: 'Art',
    collections: ['Madhubani Art', 'Ganesha Collection'],
    tags: ['madhubani', 'ganesha', 'traditional', 'handpainted', 'bihar'],
    relevanceKeywords: ['madhubani', 'art', 'ganesha', 'traditional', 'painting']
  },
  {
    handle: 'pichwai-krishna-lotus',
    title: 'Pichwai Krishna on Lotus Painting',
    description: 'Exquisite Pichwai artwork depicting Lord Krishna seated on a lotus, painted in traditional Rajasthani style.',
    product_type: 'Art',
    collections: ['Pichwai Art', 'Krishna Collection'],
    tags: ['pichwai', 'krishna', 'lotus', 'rajasthani', 'traditional'],
    relevanceKeywords: ['pichwai', 'art', 'krishna', 'lotus', 'traditional', 'painting']
  },
  {
    handle: 'kerala-mural-kathakali',
    title: 'Kerala Mural Kathakali Dancer',
    description: 'Vibrant Kerala mural painting showcasing a Kathakali dancer in traditional costume and makeup.',
    product_type: 'Art',
    collections: ['Kerala Mural', 'Dance Forms'],
    tags: ['kerala', 'mural', 'kathakali', 'dance', 'traditional'],
    relevanceKeywords: ['kerala', 'mural', 'kathakali', 'dance', 'art']
  },
  {
    handle: 'pattachitra-jagannath',
    title: 'Pattachitra Lord Jagannath',
    description: 'Classic Pattachitra painting of Lord Jagannath in traditional Odisha style with intricate detailing.',
    product_type: 'Art',
    collections: ['Pattachitra Art', 'Traditional Art'],
    tags: ['pattachitra', 'jagannath', 'odisha', 'traditional', 'intricate'],
    relevanceKeywords: ['pattachitra', 'art', 'jagannath', 'traditional', 'odisha']
  },
  {
    handle: 'home-decor-brass-ganesha',
    title: 'Brass Ganesha Statue for Home Decor',
    description: 'Beautiful brass statue of Lord Ganesha, perfect for home decoration and spiritual ambiance.',
    product_type: 'Home Decor',
    collections: ['Home Decor', 'Ganesha Collection'],
    tags: ['brass', 'ganesha', 'home-decor', 'statue', 'spiritual'],
    relevanceKeywords: ['home', 'decor', 'brass', 'ganesha', 'spiritual']
  },
  {
    handle: 'traditional-wall-hanging',
    title: 'Traditional Indian Wall Hanging',
    description: 'Handcrafted traditional wall hanging featuring intricate Indian motifs and vibrant colors.',
    product_type: 'Home Decor',
    collections: ['Home Decor', 'Traditional Art'],
    tags: ['wall-hanging', 'traditional', 'handcrafted', 'motifs', 'colorful'],
    relevanceKeywords: ['wall', 'hanging', 'traditional', 'home', 'decor']
  }
];

export function ProductSelector({ 
  selectedProducts, 
  onProductsChange, 
  maxProducts = 5, 
  contentTopic = '',
  preferredCollections = [],
  isDevMode = true
}: ProductSelectorProps) {
  const [availableProducts, setAvailableProducts] = useState<ProductWithRelevance[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [showManualBrowser, setShowManualBrowser] = useState(false);

  // Product discovery function - moved outside useEffect so it can be called manually
  const discoverProducts = useCallback(async () => {
    console.log('🔍 ProductSelector: discoverProducts called with:', { 
      contentTopic, 
      isDevMode, 
      preferredCollections 
    });
    console.log('🔍 ProductSelector triggered. Topic length:', contentTopic?.length || 0);
    
    if (!contentTopic) {
      console.log('❌ No contentTopic provided, skipping product discovery');
      return;
    }

    setLoading(true);
    try {
        let products: ProductForContentGeneration[];
        
        if (isDevMode) {
          // Use mock data in development mode
          products = mockProducts.filter(product => {
            const topicLower = contentTopic.toLowerCase();
            return (
              product.title.toLowerCase().includes(topicLower) ||
              product.description.toLowerCase().includes(topicLower) ||
              product.tags.some(tag => topicLower.includes(tag.toLowerCase())) ||
              product.collections.some(col => topicLower.includes(col.toLowerCase().replace(/\s+/g, '')))
            );
          });
                  } else {
            // Use POST search endpoint which works better for topic-based searches
            console.log('🛒 Searching products for topic:', contentTopic);
            
            // Extract search terms from the topic
            const searchTerms = [
              contentTopic,
              ...contentTopic.toLowerCase().split(/\s+/).filter(word => word.length > 2)
            ];
            
            // Try the topic as a whole first
            let response = await fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                searchQuery: contentTopic,
                limit: 20
              })
            });
            
            let result = await response.json();
            products = result.success ? result.data.products : [];
            
            console.log('🛒 Direct topic search found:', products.length, 'products');
            
            // If we didn't find enough products, try individual terms
            if (products.length < 5) {
              for (const term of searchTerms.slice(1)) {
                const termResponse = await fetch('/api/products', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    searchQuery: term,
                    limit: 10
                  })
                });
                
                const termResult = await termResponse.json();
                if (termResult.success && termResult.data.products) {
                  // Add new products (avoid duplicates)
                  const newProducts = termResult.data.products.filter((newP: ProductForContentGeneration) => 
                    !products.some((existingP: ProductForContentGeneration) => existingP.handle === newP.handle)
                  );
                  products.push(...newProducts);
                }
              }
              console.log('🛒 After additional searches, total products:', products.length);
            }
            
            if (products.length === 0) {
              console.warn('❌ No products found, using mock data as fallback');
              products = mockProducts;
            }
          }

        // Calculate relevance scores and add match reasons
        const productsWithRelevance: ProductWithRelevance[] = products.map(product => {
          const relevanceScore = calculateRelevanceScore(product, contentTopic, preferredCollections);
          const matchReason = getMatchReason(product, contentTopic, preferredCollections);
          
          return {
            ...product,
            relevanceScore,
            matchReason
          };
        });

        // Sort by relevance score
        productsWithRelevance.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

        setAvailableProducts(productsWithRelevance);
      } catch (error) {
        console.error('Error discovering products:', error);
        // Fallback to mock data
        setAvailableProducts(mockProducts.map(product => ({
          ...product,
          relevanceScore: 0.5,
          matchReason: 'Fallback selection'
        })));
      } finally {
        setLoading(false);
      }
    }, [contentTopic, isDevMode]);

  // Auto-discover products when content topic changes
  useEffect(() => {
    discoverProducts();
  }, [discoverProducts]);

  // Filter products based on search and collection
  const filteredProducts = availableProducts.filter(product => {
    const matchesSearch = !searchQuery || 
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCollection = !selectedCollection ||
      product.collections.includes(selectedCollection);

    return matchesSearch && matchesCollection;
  });

  const calculateRelevanceScore = (
    product: ProductForContentGeneration, 
    topic: string, 
    collections: string[]
  ): number => {
    let score = 0;
    const topicLower = topic.toLowerCase();
    const topicWords = topicLower.split(/\s+/).filter(word => word.length > 2);

    // Collection preference bonus
    if (collections.some(col => product.collections.includes(col))) {
      score += 0.4;
    }

    // Title match - check both full topic and individual words
    const titleLower = product.title.toLowerCase();
    if (titleLower.includes(topicLower)) {
      score += 0.5; // Exact phrase match gets high score
    } else {
      // Check individual words
      const titleWordMatches = topicWords.filter(word => titleLower.includes(word));
      score += titleWordMatches.length * 0.2;
    }

    // Tag matches - improved matching logic
    const productTagsLower = product.tags.map(tag => tag.toLowerCase());
    
    // Check for exact topic match in tags
    if (productTagsLower.some(tag => tag === topicLower)) {
      score += 0.6; // Exact tag match
    } else {
      // Check individual words and partial matches
      topicWords.forEach(word => {
        productTagsLower.forEach(tag => {
          if (tag.includes(word) || word.includes(tag)) {
            score += 0.15;
          }
        });
      });
    }

    // Description match
    const descLower = product.description.toLowerCase();
    if (descLower.includes(topicLower)) {
      score += 0.3;
    } else {
      const descWordMatches = topicWords.filter(word => descLower.includes(word));
      score += descWordMatches.length * 0.1;
    }

    return Math.min(score, 1); // Cap at 1
  };

  const getMatchReason = (
    product: ProductForContentGeneration, 
    topic: string, 
    collections: string[]
  ): string => {
    const reasons = [];
    const topicLower = topic.toLowerCase();
    const topicWords = topicLower.split(/\s+/).filter(word => word.length > 2);

    if (collections.some(col => product.collections.includes(col))) {
      reasons.push('Preferred collection');
    }

    const titleLower = product.title.toLowerCase();
    if (titleLower.includes(topicLower)) {
      reasons.push('Title match');
    } else {
      const titleWordMatches = topicWords.filter(word => titleLower.includes(word));
      if (titleWordMatches.length > 0) {
        reasons.push(`Title: ${titleWordMatches[0]}`);
      }
    }

    const productTagsLower = product.tags.map(tag => tag.toLowerCase());
    
    // Check for exact topic match in tags
    const exactTagMatch = productTagsLower.find(tag => tag === topicLower);
    if (exactTagMatch) {
      reasons.push(`Tag: ${exactTagMatch}`);
    } else {
      // Check individual word matches
      const tagWordMatches: string[] = [];
      topicWords.forEach(word => {
        const matchingTag = productTagsLower.find(tag => tag.includes(word) || word.includes(tag));
        if (matchingTag && !tagWordMatches.includes(matchingTag)) {
          tagWordMatches.push(matchingTag);
        }
      });
      if (tagWordMatches.length > 0) {
        reasons.push(`Tag: ${tagWordMatches[0]}`);
      }
    }

    const descLower = product.description.toLowerCase();
    if (descLower.includes(topicLower)) {
      reasons.push('Description match');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Semantic relevance';
  };

  const toggleProductSelection = (product: ProductForContentGeneration) => {
    const isSelected = selectedProducts.some(p => p.handle === product.handle);
    
    if (isSelected) {
      // Remove product
      onProductsChange(selectedProducts.filter(p => p.handle !== product.handle));
    } else {
      // Add product (if under limit)
      if (selectedProducts.length < maxProducts) {
        onProductsChange([...selectedProducts, product]);
      }
    }
  };

  const getUniqueCollections = () => {
    const collections = new Set<string>();
    availableProducts.forEach(product => {
      product.collections.forEach(collection => collections.add(collection));
    });
    return Array.from(collections).sort();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Product Selection</h3>
          <p className="text-sm text-gray-500">
            {selectedProducts.length} of {maxProducts} products selected
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setLoading(true);
              try {
                // Force refresh product discovery
                await discoverProducts();
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading || !contentTopic}
          >
            {loading ? '🔄' : '🔍'} Refresh Suggestions
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowManualBrowser(!showManualBrowser)}
          >
            {showManualBrowser ? 'Hide Browser' : 'Browse All'}
          </Button>
        </div>
      </div>

      {/* Auto-discovered Products */}
      {!showManualBrowser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Suggested Products {contentTopic && `for "${contentTopic}"`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <p>🔍 Discovering relevant products...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {filteredProducts.slice(0, 8).map(product => (
                  <ProductCard
                    key={product.handle}
                    product={product}
                    isSelected={selectedProducts.some(p => p.handle === product.handle)}
                    onToggle={() => toggleProductSelection(product)}
                    canSelect={selectedProducts.length < maxProducts || selectedProducts.some(p => p.handle === product.handle)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No products found for this topic.</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setShowManualBrowser(true)}
                >
                  Browse all products
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Product Browser */}
      {showManualBrowser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Browse All Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="search">Search Products</Label>
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, description, or tags..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="collection">Filter by Collection</Label>
                <select
                  id="collection"
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Collections</option>
                  {getUniqueCollections().map(collection => (
                    <option key={collection} value={collection}>
                      {collection}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.handle}
                  product={product}
                  isSelected={selectedProducts.some(p => p.handle === product.handle)}
                  onToggle={() => toggleProductSelection(product)}
                  canSelect={selectedProducts.length < maxProducts || selectedProducts.some(p => p.handle === product.handle)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Products Summary */}
      {selectedProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedProducts.map(product => (
                <div 
                  key={product.handle}
                  className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{product.title}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {product.collections.slice(0, 2).map(collection => (
                        <Badge key={collection} variant="outline" className="text-xs">
                          {collection}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleProductSelection(product)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Product Card Component
interface ProductCardProps {
  product: ProductWithRelevance;
  isSelected: boolean;
  onToggle: () => void;
  canSelect: boolean;
}

function ProductCard({ product, isSelected, onToggle, canSelect }: ProductCardProps) {
  return (
    <div className={`
      p-3 border rounded-lg transition-all cursor-pointer
      ${isSelected 
        ? 'border-blue-500 bg-blue-50' 
        : 'border-gray-200 hover:border-gray-300'
      }
      ${!canSelect && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1" onClick={canSelect ? onToggle : undefined}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-sm">{product.title}</h4>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {product.description}
              </p>
            </div>
            {product.relevanceScore !== undefined && (
              <div className="ml-2 flex flex-col items-end">
                <div className="text-xs text-gray-500">
                  {Math.round(product.relevanceScore * 100)}% match
                </div>
                {product.matchReason && (
                  <div className="text-xs text-blue-600 mt-1">
                    {product.matchReason}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1 mt-2">
            {product.collections.slice(0, 3).map(collection => (
              <Badge key={collection} variant="outline" className="text-xs">
                {collection}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="ml-3">
          <Button
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            disabled={!canSelect && !isSelected}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        </div>
      </div>
    </div>
  );
} 