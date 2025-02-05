import { CategoryName } from '@/types/processed-post';
import { categoryLabels, categoryColors, categoryShapeMap } from '@/utils/category-utils';

interface MapLegendProps {
  categories: CategoryName[];
}

export function MapLegend({ categories }: MapLegendProps) {
  return (
    <div className="bg-white/90 p-4 rounded-lg shadow-lg">
      <h3 className="text-sm font-semibold mb-2">Categories</h3>
      <div className="space-y-2">
        {categories.map(category => (
          <div key={category} className="flex items-center gap-2">
            <div 
              className="w-4 h-4"
              style={{
                backgroundColor: categoryColors[category],
                clipPath: getShapeClipPath(categoryShapeMap[category])
              }}
            />
            <span className="text-sm text-gray-700">{categoryLabels[category]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getShapeClipPath(shape: string): string {
  switch (shape) {
    case 'triangle':
      return 'polygon(50% 0%, 0% 100%, 100% 100%)';
    case 'square':
      return 'none';
    case 'hexa':
      return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    case 'diamond':
      return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    case 'circle':
    default:
      return 'circle(50%)';
  }
} 