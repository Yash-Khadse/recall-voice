import { configured, json } from '@/lib/server/context';
export const dynamic = 'force-dynamic';
export async function GET() {
  return json({configured:configured(),mode:'cloud',status:configured()?'configured_unverified':'not_configured',voiceVerified:false,languages:['en','hi','te'],message:configured()?'Configuration present; provider connectivity and speech quality require a live test.':'Cloud accounts are not configured. Local mode is available after setup.'});
}
