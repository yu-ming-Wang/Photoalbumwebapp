import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Photo {
  url: string;
  labels?: string[];
}

interface PhotoCardProps {
  photo: Photo;
}

export function PhotoCard({ photo }: PhotoCardProps) {
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
      <a
        href={photo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="aspect-square relative overflow-hidden bg-slate-100">
          <ImageWithFallback
            src={photo.url}
            alt="Search result"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </a>

      {photo.labels && photo.labels.length > 0 && (
        <div className="p-4 space-y-2">
          <p className="text-sm text-muted-foreground">Detected Labels:</p>
          <div className="flex flex-wrap gap-2">
            {photo.labels.map((label, index) => (
              <Badge key={`${label}-${index}`} variant="secondary">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
