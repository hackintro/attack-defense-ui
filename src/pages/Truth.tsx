import reality from '@/assets/truth.mp4';
import { useEffect, useRef, useState } from 'react';

interface TruthProps {
  onDataUpdate: (data: Date) => void;
}

export default function Truth({ onDataUpdate }: TruthProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
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
      <h1 className="text-destructive mb-8 text-center text-2xl font-bold italic">
        Is any of it real?
      </h1>

      <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-lg">
        {!isLoaded && (
          <div className="bg-card absolute inset-0 flex items-center justify-center">
            <div className="text-muted-foreground inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          </div>
        )}

        <video
          ref={videoRef}
          className="h-auto max-h-[70vh] w-full"
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
