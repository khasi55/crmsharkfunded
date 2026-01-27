
import { updateLeaderboardScores } from '../services/leaderboard-service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
    const competitionId = 'e9e0d221-4925-4437-9572-90ea8bc22c2c';
    console.log(` Triggering leaderboard update for ${competitionId}...`);
    await updateLeaderboardScores(competitionId);
    console.log(" Leaderboard update completed.");
    process.exit(0);
}

main();
