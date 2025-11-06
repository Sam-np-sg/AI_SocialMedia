import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Upload, Image as ImageIcon, Video, Download, Loader2, Scissors, Check } from 'lucide-react';
import {
  resizeImage,
  resizeVideo,
  MediaType,
  MEDIA_SPECS,
  formatFileSize,
  getMediaTypeLabel,
  detectMediaType,
  ResizeResult,
} from '../utils/mediaResizer';

interface MediaResizerProps {
  platform?: string;
  onMediaProcessed?: (result: ResizeResult, mediaType: MediaType) => void;
}

export function MediaResizer({ platform = 'instagram', onMediaProcessed }: MediaResizerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>('instagram-post');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ResizeResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaTypes: MediaType[] = [
    'instagram-post',
    'instagram-story',
    'instagram-reel',
    'twitter-post',
    'facebook-post',
    'linkedin-post',
    'tiktok-video',
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setResult(null);

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const detectedType = detectMediaType(platform, aspectRatio);
        setSelectedMediaType(detectedType);
        URL.revokeObjectURL(previewUrl);
      };
      img.src = previewUrl;
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        const aspectRatio = video.videoWidth / video.videoHeight;
        const detectedType = detectMediaType(platform, aspectRatio);
        setSelectedMediaType(detectedType);
        URL.revokeObjectURL(previewUrl);
      };
      video.src = previewUrl;
    }
  };

  const handleResize = async () => {
    if (!selectedFile) return;

    setProcessing(true);

    try {
      let resizeResult: ResizeResult;

      if (selectedFile.type.startsWith('image/')) {
        resizeResult = await resizeImage(selectedFile, selectedMediaType);
      } else if (selectedFile.type.startsWith('video/')) {
        resizeResult = await resizeVideo(selectedFile, selectedMediaType);
      } else {
        throw new Error('Unsupported file type');
      }

      setResult(resizeResult);

      if (onMediaProcessed) {
        onMediaProcessed(resizeResult, selectedMediaType);
      }
    } catch (error: any) {
      console.error('Error resizing media:', error);
      alert(error.message || 'Failed to resize media');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const link = document.createElement('a');
    link.href = result.url;
    link.download = `resized-${selectedMediaType}-${Date.now()}.jpg`;
    link.click();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const specs = MEDIA_SPECS[selectedMediaType];
  const isVideo = selectedFile?.type.startsWith('video/');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="w-5 h-5" />
          Media Resizer for Social Platforms
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="mb-2 block">Upload Media</Label>
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              id="media-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
            {selectedFile && (
              <Button onClick={handleReset} variant="outline">
                Reset
              </Button>
            )}
          </div>
          {selectedFile && (
            <p className="text-sm text-gray-600 mt-2">
              {isVideo ? <Video className="w-4 h-4 inline mr-1" /> : <ImageIcon className="w-4 h-4 inline mr-1" />}
              {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </p>
          )}
        </div>

        {selectedFile && (
          <>
            <div>
              <Label className="mb-2 block">Target Format</Label>
              <div className="grid grid-cols-2 gap-2">
                {mediaTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedMediaType(type)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedMediaType === type
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700'
                    }`}
                  >
                    {getMediaTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm text-gray-900">Output Specifications</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Dimensions:</span>
                  <span className="ml-2 font-medium">{specs.width} × {specs.height}px</span>
                </div>
                <div>
                  <span className="text-gray-600">Aspect Ratio:</span>
                  <span className="ml-2 font-medium">{specs.aspectRatio}</span>
                </div>
                <div>
                  <span className="text-gray-600">Max Size:</span>
                  <span className="ml-2 font-medium">{formatFileSize(specs.maxSize || 0)}</span>
                </div>
              </div>
            </div>

            {preview && !result && (
              <div>
                <Label className="mb-2 block">Original Preview</Label>
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  {isVideo ? (
                    <video src={preview} controls className="w-full max-h-64 object-contain bg-black" />
                  ) : (
                    <img src={preview} alt="Preview" className="w-full max-h-64 object-contain bg-black" />
                  )}
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Resized Preview</Label>
                    <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Processed
                    </span>
                  </div>
                  <div className="border-2 border-green-300 rounded-lg overflow-hidden">
                    <img src={result.url} alt="Resized" className="w-full max-h-64 object-contain bg-black" />
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm text-gray-900">Results</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Original Size:</span>
                      <span className="ml-2 font-medium">{formatFileSize(result.originalSize)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">New Size:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {formatFileSize(result.size)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Saved:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {formatFileSize(result.originalSize - result.size)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Reduction:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {((1 - result.size / result.originalSize) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <Button onClick={handleDownload} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Resized Media
                </Button>
              </div>
            )}

            {!result && (
              <Button
                onClick={handleResize}
                disabled={processing}
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4 mr-2" />
                    Resize Media
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
