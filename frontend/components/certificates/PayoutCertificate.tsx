"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { format } from "date-fns";
import QRCode from "qrcode";

interface PayoutCertificateProps {
    name: string;
    amount: number;
    date: string;
    transactionId: string;
}

export interface PayoutCertificateRef {
    download: () => void;
}

const PayoutCertificate = forwardRef<PayoutCertificateRef, PayoutCertificateProps>(({
    name,
    amount,
    date,
    transactionId
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isGenerated, setIsGenerated] = useState(false);

    useImperativeHandle(ref, () => ({
        download: () => {
            const canvas = canvasRef.current;
            if (canvas) {
                const link = document.createElement("a");
                link.download = `SharkFunded-Certificate-${transactionId}.png`;
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

            // Load Background Image
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = "/certificate-template.png";

            img.onload = async () => {
                // Set canvas size to match image high-res
                canvas.width = img.width;
                canvas.height = img.height;

                // Draw Background
                ctx.drawImage(img, 0, 0);

                // Configure Text Styles
                const centerX = canvas.width / 2;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                // Name Style
                ctx.font = "500 60px Serif";
                ctx.fillStyle = "#FFFFFF";
                ctx.shadowColor = "rgba(0,0,0,0.5)";
                ctx.shadowBlur = 10;
                // Position: roughly 48% down
                ctx.fillText(name, centerX, canvas.height * 0.48);

                // Amount Style
                ctx.font = "600 60px Sans-Serif";

                // Gradient Fill: #9CF0FF -> #44A1FA
                // Text is at roughly 61% height. Font is 60px. Gradient from top of text to bottom.
                const amountY = canvas.height * 0.61;
                const gradient = ctx.createLinearGradient(0, amountY - 60, 0, amountY);
                gradient.addColorStop(0, "#9CF0FF");
                gradient.addColorStop(1, "#44A1FA");

                ctx.fillStyle = gradient;

                // Add a matching blue glow
                ctx.shadowColor = "rgba(68, 161, 250, 0.5)"; // #44A1FA with opacity
                ctx.shadowBlur = 20;

                // Position: roughly 61% down
                ctx.fillText(
                    `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    centerX,
                    amountY
                );

                // Date Style
                ctx.font = "20px Sans-Serif";
                ctx.fillStyle = "#D1D5DB"; // Gray-300
                ctx.shadowBlur = 0;
                // Position: roughly 66% down
                ctx.fillText(format(new Date(date), "MMMM dd, yyyy"), centerX, canvas.height * 0.66);

                // QR Code Generation
                try {
                    // QR Data: Verification URL
                    const qrUrl = `https://sharkfunded.com/verify/${transactionId}`; // Using Transaction ID for lookup
                    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
                        width: 150,
                        margin: 1,
                        color: {
                            dark: "#000000",
                            light: "#FFFFFF"
                        }
                    });

                    const qrImg = new Image();
                    qrImg.src = qrDataUrl;
                    qrImg.onload = () => {
                        // Position QR Code (Bottom Left)
                        const qrSize = 120; // Slightly smaller to look refined
                        const qrX = canvas.width * 0.08;
                        const qrY = canvas.height * 0.85 - qrSize;

                        // Draw white background for QR
                        ctx.fillStyle = "#FFFFFF";
                        ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

                        // Draw QR
                        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

                        setIsGenerated(true);
                    };
                } catch (err) {
                    console.error("QR Generation Error", err);
                    setIsGenerated(true); // Show anyway
                }
            };
        };

        generateCertificate();
    }, [name, amount, date, transactionId]);

    return (
        <div className="relative w-full aspect-[1.4] rounded-xl overflow-hidden shadow-2xl bg-black">
            <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
                style={{ opacity: isGenerated ? 1 : 0, transition: "opacity 0.5s ease-in" }}
            />
            {!isGenerated && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
                    Generating Certificate...
                </div>
            )}
        </div>
    );
});

PayoutCertificate.displayName = "PayoutCertificate";

export default PayoutCertificate;
