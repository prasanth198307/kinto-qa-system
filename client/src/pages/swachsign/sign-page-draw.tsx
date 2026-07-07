import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DrawTabProps {
  signerName: string;
  onSignerNameChange: (v: string) => void;
  onSubmit: (dataUrl: string) => void;
  loading?: boolean;
}

export default function DrawSignatureTab({ signerName, onSignerNameChange, onSubmit, loading }: DrawTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  function initCtx() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return { canvas, ctx };
  }

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const d = initCtx();
    if (!d) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const pos = getPos(e, d.canvas);
    d.ctx.beginPath();
    d.ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const d = initCtx();
    if (!d) return;
    const pos = getPos(e, d.canvas);
    d.ctx.lineTo(pos.x, pos.y);
    d.ctx.stroke();
  }

  function stopDraw() { setIsDrawing(false); }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function handleSubmit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSubmit(canvas.toDataURL("image/png"));
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Your Name</Label>
        <Input
          value={signerName}
          onChange={e => onSignerNameChange(e.target.value)}
          placeholder="Enter your full name"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="mb-2 block">Draw your signature below</Label>
        <canvas
          ref={canvasRef}
          width={560}
          height={150}
          className="border-2 border-dashed border-gray-300 rounded w-full cursor-crosshair bg-white touch-none"
          style={{ height: 120 }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        <Button size="sm" variant="outline" onClick={clearCanvas} className="mt-1">Clear</Button>
      </div>
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!hasDrawn || !signerName.trim() || loading}
      >
        {loading ? "Submitting..." : "Submit Drawn Signature"}
      </Button>
    </div>
  );
}
