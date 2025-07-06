'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Image, Package, FileImage, Clock, Loader2, X } from 'lucide-react';

interface ShopifyImageSuggestion {
  url: string;
  alt: string;
  source: 'product' | 'file' | 'recent';
  relevance?: number;
  context?: string;
  productTitle?: string;
  productType?: string;
}

interface ImageBrowserData {
  suggested: ShopifyImageSuggestion[];
  products: ShopifyImageSuggestion[];
  files: ShopifyImageSuggestion[];
  recent: ShopifyImageSuggestion[];
}

interface ImageBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (imageUrl: string, alt: string) => void;
  articleTitle?: string;
  articleContent?: string;
  articleTags?: string[];
}

type TabType = 'suggested' | 'products' | 'files' | 'recent';

export function ImageBrowser({ 
  isOpen, 
  onClose, 
  onImageSelect, 
  articleTitle, 
  articleContent, 
  articleTags 
}: ImageBrowserProps) {
  const [activeTab, setActiveTab] = useState<TabType>('suggested');
  const [imageData, setImageData] = useState<ImageBrowserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ShopifyImageSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  // Fetch image data when dialog opens
  useEffect(() => {
    if (isOpen && !imageData) {
      fetchImageData();
    }
  }, [isOpen]);

  const fetchImageData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'browser'
      });

      if (articleTitle) params.append('title', articleTitle);
      if (articleContent) params.append('content', articleContent);
      if (articleTags && articleTags.length > 0) params.append('tags', articleTags.join(','));

      const response = await fetch(`/api/shopify/images?${params}`);
      const result = await response.json();

      if (result.success) {
        setImageData(result.data);
        console.log('📸 Image browser data loaded:', result.meta);
      } else {
        console.error('Failed to load image data:', result.error);
      }
    } catch (error) {
      console.error('Error fetching image data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/shopify/images?action=search&query=${encodeURIComponent(query)}`);
      const result = await response.json();

      if (result.success) {
        setSearchResults(result.data.images);
      } else {
        console.error('Search failed:', result.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching images:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleImageClick = (image: ShopifyImageSuggestion) => {
    onImageSelect(image.url, image.alt);
    onClose();
  };

  const getTabData = (): ShopifyImageSuggestion[] => {
    if (searchQuery.trim()) {
      return searchResults;
    }

    if (!imageData) return [];

    switch (activeTab) {
      case 'suggested':
        return imageData.suggested;
      case 'products':
        return imageData.products;
      case 'files':
        return imageData.files;
      case 'recent':
        return imageData.recent;
      default:
        return [];
    }
  };

  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case 'suggested':
        return <Image className="w-4 h-4" />;
      case 'products':
        return <Package className="w-4 h-4" />;
      case 'files':
        return <FileImage className="w-4 h-4" />;
      case 'recent':
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTabCount = (tab: TabType): number => {
    if (!imageData) return 0;
    switch (tab) {
      case 'suggested':
        return imageData.suggested.length;
      case 'products':
        return imageData.products.length;
      case 'files':
        return imageData.files.length;
      case 'recent':
        return imageData.recent.length;
      default:
        return 0;
    }
  };

  const tabData = getTabData();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Enhanced Image Browser
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Tabs */}
          {!searchQuery.trim() && (
            <div className="flex space-x-1 mb-4 border-b">
              {(['suggested', 'products', 'files', 'recent'] as TabType[]).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  {getTabIcon(tab)}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {!loading && (
                    <Badge variant="secondary" className="ml-1">
                      {getTabCount(tab)}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading images...</span>
              </div>
            ) : tabData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchQuery.trim() ? (
                  <>
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No images found for "{searchQuery}"</p>
                    <p className="text-sm mt-2">Try different keywords or browse other tabs</p>
                  </>
                ) : (
                  <>
                    <Image className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No images available in this category</p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tabData.map((image, index) => (
                  <Card
                    key={`${image.url}-${index}`}
                    className="cursor-pointer hover:shadow-lg transition-shadow group"
                    onClick={() => handleImageClick(image)}
                  >
                    <CardContent className="p-2">
                      <div className="relative aspect-square mb-2">
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="w-full h-full object-cover rounded"
                          loading="lazy"
                        />
                        {image.relevance && (
                          <Badge
                            variant="secondary"
                            className="absolute top-2 right-2 text-xs"
                          >
                            {image.relevance}%
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {image.productTitle || image.alt}
                      </div>
                      {image.context && (
                        <div className="text-xs text-gray-400 truncate">
                          {image.context}
                        </div>
                      )}
                      <Badge
                        variant="outline"
                        className="mt-1 text-xs"
                      >
                        {image.source}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              {searchQuery.trim() ? (
                `${tabData.length} search results`
              ) : (
                `${tabData.length} images in ${activeTab}`
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 