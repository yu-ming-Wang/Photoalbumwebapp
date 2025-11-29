// src/App.tsx
import { useState } from "react";
import { Search, Upload } from "lucide-react";
import { SearchBar } from "./components/SearchBar";
import { PhotoGrid } from "./components/PhotoGrid";
import { UploadDialog } from "./components/UploadDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Photo, searchPhotos } from "./api";

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  const handleSearch = async (query: string) => {
    const trimmed = query.trim();
    setLastQuery(trimmed);

    if (!trimmed) {
      setPhotos([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchPhotos(trimmed);
      setPhotos(results);
    } catch (error) {
      console.error("Search error:", error);
      // Fallback demo data
      setPhotos([
        {
          url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
          labels: ["mountain", "landscape", "nature", "sunset"],
        },
        {
          url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
          labels: ["person", "portrait", "smile"],
        },
        {
          url: "https://images.unsplash.com/photo-1511367461989-f85a21fda167",
          labels: ["dog", "pet", "animal", "golden retriever"],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    // After uploading, rerun the last search if there was a query
    if (lastQuery) {
      handleSearch(lastQuery);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2">Smart Photo Album</h1>
          <p className="text-muted-foreground">
            Search your photos using natural language. Find people, objects,
            actions, landmarks and more.
          </p>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList>
            <TabsTrigger value="search" className="gap-2">
              <Search className="size-4" />
              Search Photos
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="size-4" />
              Upload Photos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-muted-foreground">
                  Searching your photos...
                </p>
              </div>
            ) : photos.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    Found {photos.length}{" "}
                    {photos.length === 1 ? "photo" : "photos"}
                  </p>
                </div>
                <PhotoGrid photos={photos} />
              </>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed">
                <Search className="size-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="mb-2">Start searching</h3>
                <p className="text-muted-foreground">
                  Try searching for objects, people, places, or activities
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Examples: "people smiling", "dogs in park", "sunset at
                  beach"
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload">
            <div className="bg-white rounded-lg p-8 border">
              <UploadDialog onSuccess={handleUploadSuccess} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
