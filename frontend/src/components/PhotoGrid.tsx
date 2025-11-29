import { PhotoCard } from './PhotoCard';

interface Photo {
  url: string;
  labels?: string[];
}

interface PhotoGridProps {
  photos: Photo[];
}

export function PhotoGrid({ photos }: PhotoGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {photos.map((photo, index) => (
        <PhotoCard key={`${photo.url}-${index}`} photo={photo} />
      ))}
    </div>
  );
}
