import type React from "react";
import { useState, useRef } from "react";
import { Upload, X, ImageIcon, Tag } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { uploadPhotoToS3ViaApiGateway } from "../api";

interface UploadDialogProps {
  onSuccess: () => void;
}

export function UploadDialog({ onSuccess }: UploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [customLabels, setCustomLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setUploadSuccess(false);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddLabel = () => {
    const trimmedLabel = labelInput.trim();
    if (trimmedLabel && !customLabels.includes(trimmedLabel)) {
      setCustomLabels([...customLabels, trimmedLabel]);
      setLabelInput("");
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setCustomLabels(customLabels.filter((label) => label !== labelToRemove));
  };

  const hasPendingLabel = !!labelInput.trim();

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLabel();
    }
  };

  const handleUpload = async () => {
    if (hasPendingLabel) {
      alert('Please click "Add Label" to add your custom label before uploading.');
      return;
    }

    if (!selectedFile) return;

    setIsUploading(true);
    try {
      console.log("Upload Details:", {
        file: selectedFile.name,
        customLabels,
      });

      // Key call: PUT /photos/{objectKey} with x-amz-meta-customLabels as metadata
      await uploadPhotoToS3ViaApiGateway({
        file: selectedFile,
        customLabels,
      });

      setUploadSuccess(true);
      setTimeout(() => {
        onSuccess();
        resetForm();
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setCustomLabels([]);
    setLabelInput("");
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">Upload Photo</h2>
        <p className="text-muted-foreground">
          Upload a photo and add custom labels. Rekognition will automatically
          detect objects, people, and scenes.
        </p>
      </div>

      {/* File Upload */}
      <div className="space-y-4">
        <Label htmlFor="photo-upload">Select Photo</Label>
        <div className="flex gap-4">
          <Input
            id="photo-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="flex-1"
          />
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="relative w-full max-w-md mx-auto">
            <div className="aspect-video relative overflow-hidden rounded-lg border bg-slate-100">
              <ImageWithFallback
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetForm}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Custom Labels */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="custom-labels">Custom Labels (Optional)</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Add custom labels like names or specific descriptions
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="custom-labels"
              type="text"
              placeholder="e.g., Sam, Sally, Family Vacation"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddLabel}
            disabled={!labelInput.trim()}
          >
            Add Label
          </Button>
        </div>

        {/* Display Custom Labels */}
        {customLabels.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm">Custom Labels to Upload:</p>
            <div className="flex flex-wrap gap-2">
              {customLabels.map((label, index) => (
                <Badge
                  key={`${label}-${index}`}
                  variant="default"
                  className="gap-2 pr-1"
                >
                  {label}
                  <button
                    onClick={() => handleRemoveLabel(label)}
                    className="hover:bg-white/20 rounded p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Header:{" "}
              <code className="bg-slate-100 px-2 py-1 rounded">
                x-amz-meta-customLabels: {customLabels.join(", ")}
              </code>
            </p>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className="flex gap-4 pt-4">
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading || hasPendingLabel}
          className="flex-1"
        >
          {isUploading ? (
            <>
              <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Uploading...
            </>
          ) : uploadSuccess ? (
            <>Upload Successful!</>
          ) : (
            <>
              <Upload className="size-4 mr-2" />
              Upload Photo
            </>
          )}
        </Button>
        {selectedFile && !isUploading && (
          <Button variant="outline" onClick={resetForm}>
            Cancel
          </Button>
        )}
      </div>

      {uploadSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">
            Photo uploaded successfully! Rekognition is processing the image.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <div className="flex gap-2">
          <ImageIcon className="size-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm">
              <strong>How it works:</strong>
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>AWS Rekognition automatically detects labels in your photo</li>
              <li>Your custom labels are added via the x-amz-meta-customLabels header</li>
              <li>All labels are indexed in ElasticSearch for intelligent search</li>
              <li>Use natural language to search across all labels</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
