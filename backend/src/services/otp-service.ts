
import { getRedis } from '../lib/redis';
import crypto from 'crypto';

export class OTPService {
    private static PREFIX = 'otp:financial:';
    private static TTL = 300; // 5 minutes in seconds

    /**
     * Generate a 6-digit numeric OTP and store it in Redis
     * @param userId The ID of the user
     * @returns The generated OTP
     */
    static async generateOTP(userId: string): Promise<string> {
        const otp = crypto.randomInt(100000, 999999).toString();
        const key = `${this.PREFIX}${userId}`;

        const redis = getRedis();
        await redis.set(key, otp, 'EX', this.TTL);

        return otp;
    }

    /**
     * Verify an OTP provided by the user
     * @param userId The ID of the user
     * @param providedOTP The OTP entered by the user
     * @returns boolean indicating success
     */
    static async verifyOTP(userId: string, providedOTP: string): Promise<boolean> {
        const key = `${this.PREFIX}${userId}`;
        const redis = getRedis();
        const storedOTP = await redis.get(key);

        if (!storedOTP) {
            return false;
        }

        const isValid = storedOTP === providedOTP;

        if (isValid) {
            // Delete OTP after successful verification so it can't be reused
            await redis.del(key);
        }

        return isValid;
    }
}
