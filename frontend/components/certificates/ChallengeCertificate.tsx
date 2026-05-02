"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { format } from "date-fns";

interface ChallengeCertificateProps {
    name: string;
    type: string; // e.g. "Step 1 Passed Certificate"
    date: string;
    certificateId: string;
    balance?: number;
}

export interface ChallengeCertificateRef {
    download: () => void;
}

const ChallengeCertificate = forwardRef<ChallengeCertificateRef, ChallengeCertificateProps>(({
    name,
    type,
    date,
    certificateId,
    balance
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isGenerated, setIsGenerated] = useState(false);

    useImperativeHandle(ref, () => ({
        download: () => {
            const canvas = canvasRef.current;
            if (canvas) {
                const link = document.createElement("a");
                link.download = `DemoFunded-${type.replace(/\s+/g, '-')}-${certificateId.slice(0, 8)}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
            }
        }
    }));

    useEffect(() => {
        const generateCertificate = async () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            // Select Template based on type
            const isStep2 = type.toLowerCase().includes('step 2') || type.toLowerCase().includes('phase 2');
            const templateUrl = isStep2 
                ? "/certificates/step2_passed.png" 
                : "/certificates/step1_passed.png";

            // Load Background Image
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = templateUrl;

            img.onload = async () => {
                const scaleFactor = 3;
                canvas.width = img.width * scaleFactor;
                canvas.height = img.height * scaleFactor;
                ctx.scale(scaleFactor, scaleFactor);

                // Draw Background
                ctx.drawImage(img, 0, 0, img.width, img.height);

                // Configure Text Styles
                ctx.textBaseline = "middle";
                ctx.textAlign = "center";

                // Draw Name (Top Slot)
                ctx.font = "800 85px Sans-Serif";
                ctx.fillStyle = "#FFFFFF";
                ctx.letterSpacing = "-1px";
                
                const nameX = img.width * (1000 / 2000);
                const nameY = img.height * (880 / 1428);
                ctx.fillText(name.toUpperCase(), nameX, nameY);

                // Draw Account Size (Bottom Slot)
                const balanceStr = balance ? `$${balance.toLocaleString()}` : "";
                ctx.font = "600 45px Sans-Serif";
                ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
                ctx.letterSpacing = "4px";

                const sizeX = img.width * (1000 / 2000);
                const sizeY = img.height * (1000 / 1428);
                ctx.fillText(`${balanceStr} EVALUATION`, sizeX, sizeY);

                // Draw Date
                ctx.font = "400 28px Sans-Serif";
                ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
                ctx.letterSpacing = "0px";
                const dateX = img.width * (1450 / 2000);
                const dateY = img.height * (940 / 1428);
                ctx.fillText(format(new Date(date), "MMM dd, yyyy"), dateX, dateY);

                setIsGenerated(true);
            };

            img.onerror = () => {
                console.error("Failed to load certificate template. Ensure /public/certificates/ directory exists with templates.");
                // Fallback to a generic design if image fails
                setIsGenerated(true);
            };
        };

        generateCertificate();
    }, [name, type, date, certificateId]);

    return (
        <div className="relative w-full aspect-[1.4] rounded-xl overflow-hidden shadow-2xl bg-[#05080F]">
            <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
                style={{ opacity: isGenerated ? 1 : 0, transition: "opacity 0.5s ease-in" }}
            />
            {!isGenerated && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
                    Preparing Your Achievement...
                </div>
            )}
        </div>
    );
});

ChallengeCertificate.displayName = "ChallengeCertificate";

export default ChallengeCertificate;
