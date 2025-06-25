import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileTextIcon, EditIcon, CheckCircleIcon, TrendingUpIcon } from 'lucide-react';

interface ArticleStatsProps {
  stats: {
    totalArticles: number;
    draftArticles: number;
    publishedArticles: number;
    totalWords: number;
  };
}

export function ArticleStats({ stats }: ArticleStatsProps) {
  const statCards = [
    {
      title: 'Total Articles',
      value: stats.totalArticles.toLocaleString(),
      icon: FileTextIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Draft Articles',
      value: stats.draftArticles.toLocaleString(),
      icon: EditIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Published Articles',
      value: stats.publishedArticles.toLocaleString(),
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Words',
      value: stats.totalWords.toLocaleString(),
      icon: TrendingUpIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <Card key={stat.title} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <IconComponent className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 