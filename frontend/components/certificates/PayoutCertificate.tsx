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
                // Set high-resolution canvas size (3x for absolute crispness)
                const scaleFactor = 3;
                canvas.width = img.width * scaleFactor;
                canvas.height = img.height * scaleFactor;

                // Scale context to match
                ctx.scale(scaleFactor, scaleFactor);

                // Draw Background
                ctx.drawImage(img, 0, 0, img.width, img.height);

                // Configure Text Styles
                const centerX = img.width / 2;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                // Helper for Rounded Rect
                const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
                    ctx.beginPath();
                    ctx.moveTo(x + radius, y);
                    ctx.lineTo(x + width - radius, y);
                    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
                    ctx.lineTo(x + width, y + height - radius);
                    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                    ctx.lineTo(x + radius, y + height);
                    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
                    ctx.lineTo(x, y + radius);
                    ctx.quadraticCurveTo(x, y, x + radius, y);
                    ctx.closePath();
                    ctx.fill();
                };

                // Name Style - Using Serif for a premium look, matching template
                ctx.font = "500 68px Serif";
                ctx.fillStyle = "#FFFFFF";
                ctx.shadowColor = "rgba(0,0,0,0.4)";
                ctx.shadowBlur = 15;
                // Position: moved up to 46.5% to clear "PROFIT SHARE"
                ctx.fillText(name, centerX, img.height * 0.465);

                // Amount Style
                ctx.font = "bold 72px Sans-Serif";

                // Gradient Fill: #9CF0FF -> #44A1FA
                const amountY = img.height * 0.61;
                const gradient = ctx.createLinearGradient(0, amountY - 40, 0, amountY + 40);
                gradient.addColorStop(0, "#9CF0FF");
                gradient.addColorStop(1, "#44A1FA");

                ctx.fillStyle = gradient;
                ctx.shadowColor = "rgba(68, 161, 250, 0.4)";
                ctx.shadowBlur = 25;

                ctx.fillText(
                    `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    centerX,
                    amountY
                );

                // Date Style
                ctx.font = "300 24px Sans-Serif";
                ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
                ctx.shadowBlur = 0;
                // Position: roughly 66% down
                ctx.fillText(format(new Date(date), "MMMM dd, yyyy"), centerX, img.height * 0.665);

                // QR Code Generation
                try {
                    // QR Data uses the Transaction Hash/ID - Link to Tronscan for TX hashes
                    // If it's a standard hash (hex string), we link it. If it's a URL or contains SF-, we use as is.
                    let qrContent = transactionId;
                    const isHash = /^[a-fA-F0-9]{64}$/.test(transactionId);

                    if (isHash) {
                        qrContent = `https://tronscan.org/#/transaction/${transactionId}`;
                    } else if (transactionId.length > 30 && !transactionId.includes('http')) {
                        // Fallback for long strings that might be hashes on other networks
                        qrContent = `https://tronscan.org/#/transaction/${transactionId}`;
                    }

                    const qrDataUrl = await QRCode.toDataURL(qrContent, {
                        width: 400, // Even higher res QR
                        margin: 1,
                        color: {
                            dark: "#000000",
                            light: "#00000000" // Transparent light part so it fits on our box
                        }
                    });

                    const qrImg = new Image();
                    qrImg.src = qrDataUrl;
                    qrImg.onload = () => {
                        // Position QR Code (Bottom Left)
                        // Adjusted coordinates: moved even further left from 0.068 to 0.055 to hide background artifact
                        const qrSize = 135;
                        const qrPadding = 10;
                        const qrX = img.width * 0.055;
                        const qrY = img.height * 0.88 - qrSize;

                        // Draw white background for QR with rounded corners
                        ctx.fillStyle = "#FFFFFF";
                        ctx.shadowColor = "none"; // Removed shadow to fix ghosting/white edge issues
                        ctx.shadowBlur = 0;
                        drawRoundedRect(
                            qrX - qrPadding,
                            qrY - qrPadding,
                            qrSize + (qrPadding * 2),
                            qrSize + (qrPadding * 2),
                            14
                        );

                        // Draw QR
                        ctx.shadowColor = "none";
                        ctx.shadowBlur = 0;
                        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

                        setIsGenerated(true);
                    };
                } catch (err) {
                    console.error("QR Generation Error", err);
                    setIsGenerated(true);
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
