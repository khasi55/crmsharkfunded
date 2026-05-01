import { supabase } from '../lib/supabase';
import { EmailService } from './email-service';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import fs from 'fs/promises';

export class CertificateService {
    private static TEMPLATES_DIR = path.join(__dirname, '../../../../frontend/public/certificates');
    private static BUCKET_NAME = 'certificates';

    /**
     * Issue a certificate for a user passing a challenge phase
     */
    static async issueCertificate(userId: string, challengeId: string, challengeType: string) {
        try {
            // 1. Determine title and type based on challengeType
            let title = 'Achievement Certificate';
            let description = '';
            let type = 'achievement';
            let templateName = 'step1_passed.png';

            const leanType = challengeType.toLowerCase();
            if (leanType.includes('phase 1') || leanType.includes('phase_1') || leanType.includes('step 1')) {
                title = 'Step 1 Passed Certificate';
                description = 'Successfully completed Step 1 of the Trading Evaluation.';
                templateName = 'step1_passed.png';
            } else if (leanType.includes('phase 2') || leanType.includes('phase_2') || leanType.includes('step 2')) {
                title = 'Step 2 Passed Certificate';
                description = 'Successfully completed Step 2 of the Trading Evaluation.';
                templateName = 'step2_passed.png';
            } else if (leanType.includes('funded')) {
                title = 'Funded Trader Certificate';
                description = 'Officially recognized as a SharkFunded Trader.';
                templateName = 'step2_passed.png'; // Fallback to step 2 or a funded template
            }

            // 2. Fetch User Profile and Challenge Details
            const [profileRes, challengeRes] = await Promise.all([
                supabase.from('profiles').select('email, full_name').eq('id', userId).single(),
                supabase.from('challenges').select('balance').eq('id', challengeId).single()
            ]);

            const fullName = profileRes.data?.full_name || 'Trader';
            const balance = challengeRes.data?.balance ? `$${challengeRes.data.balance.toLocaleString()}` : '';
            
            const dateStr = new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: '2-digit', 
                year: 'numeric' 
            });

            // 3. Generate High-Quality JPG using Sharp
            const templatePath = path.join(this.TEMPLATES_DIR, templateName);
            const metadata = await sharp(templatePath).metadata();
            const width = metadata.width || 2000;
            const height = metadata.height || 1428;

            const scaleX = width / 2000;
            const scaleY = height / 1428;

            // Positioning for Name and Account Size in the dual-line glow box
            // Top slot for Name, Bottom slot for Account Size
            const nameX = 1000 * scaleX; // Centered in box
            const nameY = 880 * scaleY;
            const sizeX = 1000 * scaleX; 
            const sizeY = 1000 * scaleY;
            const dateX = 1450 * scaleX; // Moved back to right slot for now
            const dateY = 940 * scaleY;

            const svgOverlay = Buffer.from(`
                <svg width="${width}" height="${height}">
                    <style>
                        .name { font-family: 'Sans-Serif'; font-size: ${85 * scaleY}px; fill: white; font-weight: 800; letter-spacing: -1px; }
                        .size { font-family: 'Sans-Serif'; font-size: ${45 * scaleY}px; fill: rgba(255,255,255,0.9); font-weight: 600; text-transform: uppercase; letter-spacing: 4px; }
                        .date { font-family: 'Sans-Serif'; font-size: ${28 * scaleY}px; fill: rgba(255,255,255,0.6); font-weight: 400; }
                    </style>
                    <text x="${nameX}" y="${nameY}" class="name" text-anchor="middle">${fullName.toUpperCase()}</text>
                    <text x="${sizeX}" y="${sizeY}" class="size" text-anchor="middle">${balance} EVALUATION</text>
                    <text x="${dateX}" y="${dateY}" class="date" text-anchor="middle">${dateStr}</text>
                </svg>
            `);

            const jpgBuffer = await sharp(templatePath)
                .composite([{ input: svgOverlay, top: 0, left: 0 }])
                .jpeg({ quality: 95 })
                .toBuffer();

            // 4. Generate PDF using pdf-lib
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([width, height]);
            const embeddedJpg = await pdfDoc.embedJpg(jpgBuffer);
            page.drawImage(embeddedJpg, {
                x: 0,
                y: 0,
                width: width,
                height: height,
            });
            const pdfBuffer = await pdfDoc.save();

            // 5. Upload to Supabase Storage
            const timestamp = Date.now();
            const jpgPath = `${userId}/${timestamp}_${type}.jpg`;
            const pdfPath = `${userId}/${timestamp}_${type}.pdf`;

            // Ensure bucket exists
            await this.ensureBucket();

            const [jpgUpload, pdfUpload] = await Promise.all([
                supabase.storage.from(this.BUCKET_NAME).upload(jpgPath, jpgBuffer, { contentType: 'image/jpeg', upsert: true }),
                supabase.storage.from(this.BUCKET_NAME).upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true })
            ]);

            if (jpgUpload.error) throw jpgUpload.error;
            if (pdfUpload.error) throw pdfUpload.error;

            const { data: { publicUrl: imageUrl } } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(jpgPath);
            const { data: { publicUrl: pdfUrl } } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(pdfPath);

            // 6. Insert into certificates table
            const { data: certificate, error } = await supabase
                .from('certificates')
                .insert({
                    user_id: userId,
                    challenge_id: challengeId,
                    title,
                    description: `${description} PDF Copy: ${pdfUrl}`,
                    type,
                    image_url: imageUrl,
                    status: 'issued',
                    issued_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // 7. Trigger Email with PDF Attachment
            if (profileRes.data?.email) {
                await EmailService.sendAchievementCertificate(
                    profileRes.data.email,
                    fullName,
                    title,
                    dateStr,
                    pdfBuffer
                );
            }

            return certificate;
        } catch (error) {
            console.error('Certificate issuance failed:', error);
            return null;
        }
    }

    private static async ensureBucket() {
        const { data: buckets } = await supabase.storage.listBuckets();
        if (!buckets?.some(b => b.name === this.BUCKET_NAME)) {
            await supabase.storage.createBucket(this.BUCKET_NAME, { public: true });
        }
    }
}
