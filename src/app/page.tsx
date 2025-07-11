import Link from 'next/link'
import { Target, FileText, BookOpen, PenTool, Database, BarChart3 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center space-y-6 mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Content Management Hub
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Create, manage, and optimize your blog content with AI-powered tools. 
              From topic research to publication-ready articles.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Topics Card */}
            <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="p-8">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-200 transition-colors">
                  <Target className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Topic Research & Generation</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Research trending topics, analyze keywords, and generate complete articles with one click using our streamlined AI workflow.
                </p>
                <div className="space-y-3 mb-8">
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    Keyword research & analysis
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    One-click AI content generation
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    SEO-optimized articles
                  </div>
                </div>
                <Link 
                  href="/topics" 
                  className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Start with Topics
                </Link>
              </div>
            </div>

            {/* Content Generation Card - Temporarily Hidden */}
            {/*
            <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="p-8">
                <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-200 transition-colors">
                  <PenTool className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Content Creation</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Transform your topics into engaging, SEO-optimized articles using advanced AI writing tools.
                </p>
                <div className="space-y-3 mb-8">
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                    AI-powered writing
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                    SEO optimization
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                    Multiple content styles
                  </div>
                </div>
                <Link 
                  href="/content-generation" 
                  className="inline-flex items-center justify-center w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                >
                  <PenTool className="w-4 h-4 mr-2" />
                  Create Content
                </Link>
              </div>
            </div>
            */}

            {/* Articles Card */}
            <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="p-8">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-200 transition-colors">
                  <BookOpen className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Article Library</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Organize, edit, and manage your complete content library with powerful search and filtering tools.
                </p>
                <div className="space-y-3 mb-8">
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                    Content organization
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                    Advanced editing tools
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                    Performance tracking
                  </div>
                </div>
                <Link 
                  href="/articles" 
                  className="inline-flex items-center justify-center w-full px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  View Articles
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Streamlined Content Workflow</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                From research to published articles, manage your entire content creation process with our simplified Topics-first approach.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Research & Plan</h3>
                <p className="text-sm text-gray-600">Identify trending topics and plan your content strategy</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <PenTool className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Generate & Edit</h3>
                <p className="text-sm text-gray-600">Create high-quality content with one-click AI generation</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Manage & Optimize</h3>
                <p className="text-sm text-gray-600">Organize your library and track performance</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-4">Ready to Create Amazing Content?</h2>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                Start with topic research and generate complete articles with one click. 
                Your next great article is just a topic away.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/topics" 
                  className="inline-flex items-center justify-center px-8 py-3 bg-white text-blue-600 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Start with Topics
                </Link>
                <Link 
                  href="/articles" 
                  className="inline-flex items-center justify-center px-8 py-3 bg-blue-500 bg-opacity-20 text-white rounded-xl hover:bg-opacity-30 transition-colors font-medium border border-blue-300"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  View Articles
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 