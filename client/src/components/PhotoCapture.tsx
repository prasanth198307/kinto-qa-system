import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PhotoCaptureProps {
  taskId: string;
  onPhotoCapture: (taskId: string, photoUrl: string) => void;
  photos?: string[];
  onPhotoRemove?: (taskId: string, photoUrl: string) => void;
}

export function PhotoCapture({ taskId, onPhotoCapture, photos = [], onPhotoRemove }: PhotoCaptureProps) {
  const [capturing, setCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      setStream(mediaStream);
      setCapturing(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Could not access camera. Please check permissions or use file upload instead.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0);
        const photoUrl = canvas.toDataURL('image/jpeg', 0.8);
        onPhotoCapture(taskId, photoUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const photoUrl = reader.result as string;
        onPhotoCapture(taskId, photoUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (photoUrl: string) => {
    if (onPhotoRemove) {
      onPhotoRemove(taskId, photoUrl);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {!capturing && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={startCamera}
              data-testid={`button-camera-${taskId}`}
            >
              <Camera className="w-4 h-4 mr-1" />
              Camera
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              data-testid={`button-upload-${taskId}`}
            >
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              data-testid={`input-file-${taskId}`}
            />
          </>
        )}
      </div>

      {capturing && (
        <Card className="p-4 space-y-2">
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-md"
              autoPlay
              playsInline
              data-testid={`video-preview-${taskId}`}
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={capturePhoto}
              data-testid={`button-capture-${taskId}`}
            >
              <Camera className="w-4 h-4 mr-1" />
              Capture
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={stopCamera}
              data-testid={`button-cancel-camera-${taskId}`}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo, index) => (
            <Card key={index} className="relative p-2">
              <img 
                src={photo} 
                alt={`Photo ${index + 1}`} 
                className="w-full h-32 object-cover rounded"
                data-testid={`img-photo-${taskId}-${index}`}
              />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={() => handleRemovePhoto(photo)}
                data-testid={`button-remove-photo-${taskId}-${index}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
