import { supabase } from '../lib/supabase';
async function test() {
  const reqId = "some-id";
  const userId = "b09a2679-3120-4007-9ebd-eee583c95990"; // sample
  const walletAddress = "test-wallet";

  // Simulate without eq
  console.log("Without eq:");
  console.log(
    supabase.from('payout_requests')
    .update({
        wallet_address: walletAddress,
        metadata: {
            payout_destination_updated: walletAddress,
            update_reason: 'Admin requested update'
        }
    }).url.toString() as any
  );

  // Simulate with eq
  console.log("With eq:");
  console.log(
    supabase.from('payout_requests')
    .update({
        wallet_address: walletAddress,
        metadata: {
            payout_destination_updated: walletAddress,
            update_reason: 'Admin requested update'
        }
    }).eq("id", reqId).url.toString() as any
  );
}
test();
