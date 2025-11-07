import { MediaResizer } from './MediaResizer';
import { Scissors } from 'lucide-react';

export function MediaResizerView() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Scissors className="w-8 h-8" />
          Media Resizer
        </h1>
        <p className="text-gray-600 mt-1">
          Automatically resize and optimize your images and videos for any social media platform
        </p>
      </div>

      <div className="max-w-3xl">
        <MediaResizer />

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">How it works:</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Upload your image or video file</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Select the target format based on your platform and post type (e.g., Instagram Post, Story, Reel)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Click "Resize Media" to automatically crop and optimize your file</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Download the optimized file ready for posting!</span>
            </li>
          </ul>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Instagram Formats</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Post:</strong> 1:1 square (1080×1080px)</li>
              <li>• <strong>Story:</strong> 9:16 vertical (1080×1920px)</li>
              <li>• <strong>Reel:</strong> 9:16 vertical (1080×1920px)</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Other Platforms</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Twitter:</strong> 16:9 (1200×675px)</li>
              <li>• <strong>Facebook:</strong> 1.91:1 (1200×630px)</li>
              <li>• <strong>LinkedIn:</strong> 1.91:1 (1200×627px)</li>
              <li>• <strong>TikTok:</strong> 9:16 vertical (1080×1920px)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
