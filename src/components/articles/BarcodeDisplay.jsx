import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function BarcodeDisplay({ barcodeId, articleName, showDownload = true }) {
  const svgRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!barcodeId || !svgRef.current) return;
    import("jsbarcode").then(({ default: JsBarcode }) => {
      try {
        JsBarcode(svgRef.current, barcodeId, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 12,
          margin: 8,
          background: "#ffffff",
          lineColor: "#000000",
        });
        setError(false);
      } catch {
        setError(true);
      }
    });
  }, [barcodeId]);

  const downloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `barcode_${barcodeId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async (perPage = 8) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Render barcode to canvas first
    const canvas = document.createElement("canvas");
    const JsBarcode = (await import("jsbarcode")).default;
    JsBarcode(canvas, barcodeId, {
      format: "CODE128",
      width: 3,
      height: 80,
      displayValue: true,
      fontSize: 14,
      margin: 10,
      background: "#ffffff",
      lineColor: "#000000",
    });
    const imgData = canvas.toDataURL("image/png");

    const cols = 2;
    const rows = perPage / cols;
    const cellW = 90;
    const cellH = 55;
    const marginX = 10;
    const marginY = 15;

    let count = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = marginX + c * (cellW + 5);
        const y = marginY + r * (cellH + 8);
        doc.setDrawColor(200, 200, 200);
        doc.rect(x, y, cellW, cellH);
        doc.addImage(imgData, "PNG", x + 5, y + 4, cellW - 10, cellH - 18);
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.text(articleName || "", x + cellW / 2, y + cellH - 10, { align: "center" });
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(barcodeId, x + cellW / 2, y + cellH - 5, { align: "center" });
        count++;
      }
    }

    doc.save(`barcodes_${barcodeId}_${perPage}x.pdf`);
  };

  if (!barcodeId) return null;
  if (error) return <p className="text-xs text-muted-foreground font-mono">{barcodeId}</p>;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg ref={svgRef} />
      {showDownload && (
        <div className="flex gap-2 flex-wrap justify-center">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={downloadSVG}>
            <Download className="w-3 h-3" /> Download SVG
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => downloadPDF(8)}>
            <Download className="w-3 h-3" /> PDF (8/page)
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => downloadPDF(16)}>
            <Download className="w-3 h-3" /> PDF (16/page)
          </Button>
        </div>
      )}
    </div>
  );
}