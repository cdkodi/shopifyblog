import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Shopify Blog CMS
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive content management system with SEO optimization, 
            workflow management, and automated publishing capabilities.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Phase 1: Topic Management
              </h2>
              <p className="text-gray-600 mb-4">
                Create and manage content topics with style preferences for future article generation.
              </p>
              <div className="space-y-2 text-sm text-gray-500 mb-6">
                <div>✅ Topic input forms with validation</div>
                <div>✅ Style preference configuration</div>
                <div>✅ Topic dashboard with filtering</div>
                <div>✅ Full CRUD operations</div>
                <div>✅ Responsive design</div>
              </div>
              <Link 
                href="/topics"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
              >
                Manage Topics →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Phase 2: AI Content Generation
              </h2>
              <p className="text-gray-600 mb-4">
                Generate SEO-optimized content using AI providers and keyword research.
              </p>
              <div className="space-y-2 text-sm text-gray-500 mb-6">
                <div>✅ Multi-AI provider integration</div>
                <div>✅ DataForSEO keyword research</div>
                <div>✅ Template-based generation</div>
                <div>✅ Cost optimization</div>
                <div>✅ Real-time SEO scoring</div>
              </div>
              <Link 
                href="/content-generation"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600 text-white hover:bg-green-700 h-10 px-4 py-2 w-full"
              >
                Generate Content →
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Tech Stack
              </h2>
              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Frontend:</span>
                  <span className="font-medium">Next.js 14 + React</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Database:</span>
                  <span className="font-medium">Supabase PostgreSQL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Styling:</span>
                  <span className="font-medium">Tailwind + Shadcn UI</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Forms:</span>
                  <span className="font-medium">React Hook Form + Zod</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Deployment:</span>
                  <span className="font-medium">Vercel</span>
                </div>
              </div>
              <div className="text-center">
                <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Production Ready
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🎉 Phase 1 Complete!
              </h3>
              <p className="text-gray-700 mb-4">
                Your topic management system is ready for use. Create topics with style preferences, 
                filter and search through your content ideas, and prepare for the next phase of automated content generation.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link 
                  href="/topics"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  Start Managing Topics
                </Link>
                <a 
                  href="https://github.com/cdkodi/shopifyblog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  View Source Code
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 