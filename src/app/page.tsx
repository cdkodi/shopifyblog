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
          
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Phase 1: Topic Input
              </h2>
              <p className="text-gray-600 mb-4">
                Create and manage content topics with style preferences for future article generation.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <div>✅ Database schema enhanced</div>
                <div>✅ Topic management system</div>
                <div>✅ Style preference configuration</div>
                <div>🚧 Topic forms (coming next)</div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Tech Stack
              </h2>
              <div className="space-y-2 text-sm">
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
                  <span className="text-gray-600">Deployment:</span>
                  <span className="font-medium">Vercel</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 text-sm">
              🚀 <strong>Phase 1 Foundation Complete!</strong> Ready to build topic input forms and dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 