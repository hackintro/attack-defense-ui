import { useEffect, useRef, useState } from 'react';
import reality from '@/assets/truth.mp4';

export default function Truth({ theme, currentTheme, onDataUpdate }) {
  const videoRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    onDataUpdate(new Date());
  }, [onDataUpdate]);

  const handleVideoLoad = () => {
    setIsLoaded(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <main className="container mx-auto flex-1 px-4 py-6">
      <h1 className="mb-8 text-center text-2xl font-bold italic text-red-500">Is any of it real?</h1>

      <div className="relative aspect-video md:aspect-video aspect-auto h-screen md:h-auto w-full overflow-hidden rounded-lg">
        {!isLoaded && (
          <div
            className={`absolute inset-0 flex items-center justify-center ${currentTheme.svgBackground}`}
          >
            <div
              className={`inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent ${currentTheme.textSecondary}`}
            ></div>
          </div>
        )}

        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          onLoadedData={handleVideoLoad}
          controls
          preload="metadata"
        >
          <source src={reality} type="video/mp4" />
        </video>
      </div>
    </main>
  );
}
