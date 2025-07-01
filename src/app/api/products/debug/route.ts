import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    console.log('🔍 Testing Supabase connection...');
    
    // Check if shopify_products table exists and get count
    const { count, error: countError } = await supabase
      .from('shopify_products')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting product count:', countError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: countError.message,
        step: 'counting_products'
      });
    }

    console.log(`📊 Total products in database: ${count}`);

    // Get first 3 products as sample
    const { data: sampleProducts, error: sampleError } = await supabase
      .from('shopify_products')
      .select('id, title, handle, status, collections, tags')
      .limit(3);

    if (sampleError) {
      console.error('❌ Error getting sample products:', sampleError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch sample products',
        details: sampleError.message,
        productCount: count,
        step: 'fetching_sample'
      });
    }

    // Get active products count
    const { count: activeCount, error: activeError } = await supabase
      .from('shopify_products')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    return NextResponse.json({
      success: true,
      debug: {
        totalProducts: count,
        activeProducts: activeCount,
        sampleProducts: sampleProducts || [],
        databaseConnected: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('🚨 Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Unknown error',
      step: 'general_error'
    }, { status: 500 });
  }
} 