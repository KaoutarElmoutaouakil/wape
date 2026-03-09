import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";

/**
 * Read-only plan viewer with zoom support and a red marker at the NC annotation location.
 */
export default function PlanViewer({ planUrl, annotations, onClose }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (imgLoaded) drawAnnotations();
  }, [imgLoaded, annotations]);

  const drawAnnotations = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const paths = Array.isArray(annotations)
      ? annotations
      : (() => { try { return JSON.parse(annotations || "[]"); } catch { return []; } })();

    paths.forEach(p => {
      if (!p.points?.length) return;
      ctx.save();
      if (p.tool === "pin" || p.tool === "warning") {
        const [x, y] = p.points[0];
        ctx.font = "28px serif";
        ctx.fillText(p.tool === "pin" ? "📍" : "⚠️", x - 14, y + 10);
      } else {
        ctx.globalAlpha = p.tool === "highlight" ? 0.35 : 1;
        ctx.lineWidth = p.tool === "highlight" ? 20 : 3;
        ctx.strokeStyle = p.color || "#ef4444";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(p.points[0][0], p.points[0][1]);
        p.points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.stroke();
      }
      ctx.restore();
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-black/70 border-b border-white/10">
        <span className="text-white text-sm font-medium mr-auto">Plan Viewer — NC Location</span>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setZoom(z => Math.min(z + 0.25, 4))}>
          <ZoomIn className="w-3.5 h-3.5" /> Zoom In
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}>
          <ZoomOut className="w-3.5 h-3.5" /> Zoom Out
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setZoom(1)}>
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </Button>
        <span className="text-white/50 text-xs">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Scrollable plan area */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-6">
        <div className="relative inline-block" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
          {planUrl ? (
            <>
              <img
                ref={imgRef}
                src={planUrl}
                alt="Plan"
                className="block max-w-none"
                style={{ maxWidth: "90vw" }}
                onLoad={(e) => {
                  const canvas = canvasRef.current;
                  if (canvas) {
                    canvas.width = e.target.naturalWidth;
                    canvas.height = e.target.naturalHeight;
                    setImgLoaded(true);
                  }
                }}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
            </>
          ) : (
            <div className="text-white/50 text-sm p-8">No plan image available</div>
          )}
        </div>
      </div>
    </div>
  );
}