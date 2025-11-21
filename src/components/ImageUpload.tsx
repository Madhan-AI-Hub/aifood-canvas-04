/**
 * Production-grade ImageUpload component for food image uploads to Supabase Storage
 * Handles file validation, compression, and secure uploads with progress tracking
 */

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  Loader2,
  CheckCircle,
  AlertTriangle,
  Camera
} from "lucide-react";

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void;
  onImageRemoved: () => void;
  disabled?: boolean;
  existingImageUrl?: string;
  maxSizeBytes?: number;
  acceptedFormats?: string[];
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const COMPRESSION_QUALITY = 0.8;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;

export default function ImageUpload({
  onImageUploaded,
  onImageRemoved,
  disabled = false,
  existingImageUrl,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  acceptedFormats = ACCEPTED_FORMATS
}: ImageUploadProps) {
  // State management
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Compress image before upload
  const compressImage = useCallback((file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          COMPRESSION_QUALITY
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      return `File type not supported. Please use: ${acceptedFormats.map(f => f.split('/')[1]).join(', ')}`;
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      return `File size too large. Maximum size: ${Math.round(maxSizeBytes / (1024 * 1024))}MB`;
    }

    return null;
  }, [acceptedFormats, maxSizeBytes]);

  // Upload file to Supabase Storage
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    if (!user?.id) throw new Error('User not authenticated');

    // Generate unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    try {
      // Compress image
      const compressedFile = await compressImage(file);
      
      // Upload to storage
      const { data, error } = await supabase.storage
        .from('meal-images')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('meal-images')
        .getPublicUrl(data.path);

      return urlData.publicUrl;

    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, [user?.id, compressImage]);

  // Handle file selection/drop
  const handleFile = useCallback(async (file: File) => {
    setError(null);
    
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      toast({
        title: "Invalid File",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    // Upload file
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress (since Supabase doesn't provide real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const imageUrl = await uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Clean up preview URL
      URL.revokeObjectURL(preview);

      onImageUploaded(imageUrl);
      
      toast({
        title: "Image Uploaded",
        description: "Your food image has been uploaded successfully.",
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setError(errorMessage);
      
      // Clean up on error
      URL.revokeObjectURL(preview);
      setPreviewUrl(existingImageUrl || null);
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [validateFile, uploadFile, onImageUploaded, existingImageUrl, toast]);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile, disabled, isUploading]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input value to allow re-uploading same file
    e.target.value = '';
  }, [handleFile]);

  // Handle remove image
  const handleRemove = useCallback(async () => {
    if (previewUrl && !previewUrl.startsWith('blob:')) {
      // If it's an uploaded image, try to delete from storage
      try {
        const path = previewUrl.split('/').slice(-2).join('/'); // Extract path
        await supabase.storage.from('meal-images').remove([path]);
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    }
    
    setPreviewUrl(null);
    setError(null);
    onImageRemoved();
  }, [previewUrl, onImageRemoved]);

  // Open file dialog
  const openFileDialog = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Food Image
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Upload Area or Preview */}
        {previewUrl ? (
          // Image Preview
          <div className="relative">
            <img
              src={previewUrl}
              alt="Food preview"
              className="w-full h-48 object-cover rounded-lg border"
            />
            
            {/* Remove button */}
            {!isUploading && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={handleRemove}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {/* Upload progress overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <div className="bg-white rounded-lg p-4 w-3/4 max-w-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Uploading...</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {uploadProgress}% complete
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Upload Area
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center space-y-4 transition-colors cursor-pointer
              ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-muted/50'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <div className="space-y-2">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Drop your food image here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              disabled={disabled || isUploading}
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Choose File
                </>
              )}
            </Button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {previewUrl && !isUploading && !error && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Image ready! This will be attached to your meal entry.
            </AlertDescription>
          </Alert>
        )}

        {/* File Requirements */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>Supported formats: {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}</p>
          <p>Maximum size: {Math.round(maxSizeBytes / (1024 * 1024))}MB</p>
          <p>Images will be automatically compressed for optimal performance</p>
        </div>
      </CardContent>
    </Card>
  );
}