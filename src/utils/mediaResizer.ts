export type MediaType = 'instagram-post' | 'instagram-story' | 'instagram-reel' | 'twitter-post' | 'facebook-post' | 'linkedin-post' | 'tiktok-video';

export interface MediaDimensions {
  width: number;
  height: number;
  aspectRatio: string;
  maxSize?: number;
}

export const MEDIA_SPECS: Record<MediaType, MediaDimensions> = {
  'instagram-post': {
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    maxSize: 8 * 1024 * 1024,
  },
  'instagram-story': {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    maxSize: 8 * 1024 * 1024,
  },
  'instagram-reel': {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    maxSize: 100 * 1024 * 1024,
  },
  'twitter-post': {
    width: 1200,
    height: 675,
    aspectRatio: '16:9',
    maxSize: 5 * 1024 * 1024,
  },
  'facebook-post': {
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    maxSize: 10 * 1024 * 1024,
  },
  'linkedin-post': {
    width: 1200,
    height: 627,
    aspectRatio: '1.91:1',
    maxSize: 5 * 1024 * 1024,
  },
  'tiktok-video': {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    maxSize: 287 * 1024 * 1024,
  },
};

export interface ResizeResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number;
  originalSize: number;
}

export type CropPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';

export const resizeImage = async (
  file: File,
  mediaType: MediaType,
  quality: number = 0.92,
  cropPosition: CropPosition = 'center'
): Promise<ResizeResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const specs = MEDIA_SPECS[mediaType];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        let sourceWidth = img.width;
        let sourceHeight = img.height;
        let sourceX = 0;
        let sourceY = 0;

        const targetAspect = specs.width / specs.height;
        const sourceAspect = sourceWidth / sourceHeight;

        if (sourceAspect > targetAspect) {
          sourceWidth = sourceHeight * targetAspect;
          switch (cropPosition) {
            case 'left':
              sourceX = 0;
              break;
            case 'right':
              sourceX = img.width - sourceWidth;
              break;
            case 'center':
            default:
              sourceX = (img.width - sourceWidth) / 2;
          }
        } else {
          sourceHeight = sourceWidth / targetAspect;
          switch (cropPosition) {
            case 'top':
              sourceY = 0;
              break;
            case 'bottom':
              sourceY = img.height - sourceHeight;
              break;
            case 'center':
            default:
              sourceY = (img.height - sourceHeight) / 2;
          }
        }

        canvas.width = specs.width;
        canvas.height = specs.height;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        console.log('Canvas setup:', { width: canvas.width, height: canvas.height, quality });
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );
        console.log('Image drawn successfully');

        // Create blob with proper compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            console.log('✅ Blob created:', { size: blob.size, type: blob.type, quality });

            // If blob is still too large (> 10MB), recompress with lower quality
            if (blob.size > 10 * 1024 * 1024) {
              console.log('⚠️ Blob too large, recompressing with quality 0.6');
              canvas.toBlob(
                (recompressedBlob) => {
                  if (!recompressedBlob) {
                    reject(new Error('Failed to recompress'));
                    return;
                  }
                  console.log('✅ Recompressed:', { was: blob.size, now: recompressedBlob.size });
                  const url = URL.createObjectURL(recompressedBlob);
                  resolve({
                    blob: recompressedBlob,
                    url,
                    width: specs.width,
                    height: specs.height,
                    size: recompressedBlob.size,
                    originalSize: file.size,
                  });
                },
                'image/jpeg',
                0.6
              );
              return;
            }

            // Use data URL for smaller files, blob URL for larger
            let url: string;
            if (blob.size < 5 * 1024 * 1024) {
              url = canvas.toDataURL('image/jpeg', quality);
              console.log('✅ Using data URL');
            } else {
              url = URL.createObjectURL(blob);
              console.log('✅ Using blob URL');
            }

            resolve({
              blob,
              url,
              width: specs.width,
              height: specs.height,
              size: blob.size,
              originalSize: file.size,
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

export const resizeVideo = async (
  file: File,
  mediaType: MediaType
): Promise<ResizeResult> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const specs = MEDIA_SPECS[mediaType];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = specs.width;
      canvas.height = specs.height;

      video.currentTime = 1;

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create thumbnail'));
              return;
            }

            resolve({
              blob: file,
              url: url,
              width: video.videoWidth,
              height: video.videoHeight,
              size: file.size,
              originalSize: file.size,
            });

            URL.revokeObjectURL(url);
          },
          'image/jpeg',
          0.8
        );
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };

    video.src = url;
  });
};

export const detectMediaType = (platform: string, aspectRatio?: number): MediaType => {
  if (!aspectRatio) {
    if (platform === 'instagram') return 'instagram-post';
    if (platform === 'twitter') return 'twitter-post';
    if (platform === 'facebook') return 'facebook-post';
    if (platform === 'linkedin') return 'linkedin-post';
    return 'instagram-post';
  }

  if (aspectRatio >= 0.5 && aspectRatio <= 0.6) {
    if (platform === 'instagram') return 'instagram-story';
    if (platform === 'tiktok') return 'tiktok-video';
    return 'instagram-reel';
  }

  if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
    return 'instagram-post';
  }

  if (aspectRatio >= 1.5 && aspectRatio <= 2.0) {
    if (platform === 'twitter') return 'twitter-post';
    if (platform === 'facebook') return 'facebook-post';
    if (platform === 'linkedin') return 'linkedin-post';
  }

  return 'instagram-post';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const getMediaTypeLabel = (mediaType: MediaType): string => {
  const labels: Record<MediaType, string> = {
    'instagram-post': 'Instagram Post (1:1)',
    'instagram-story': 'Instagram Story (9:16)',
    'instagram-reel': 'Instagram Reel (9:16)',
    'twitter-post': 'Twitter Post (16:9)',
    'facebook-post': 'Facebook Post (1.91:1)',
    'linkedin-post': 'LinkedIn Post (1.91:1)',
    'tiktok-video': 'TikTok Video (9:16)',
  };
  return labels[mediaType];
};
