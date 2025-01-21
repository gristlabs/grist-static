import { GristLoginSystem } from 'app/server/lib/GristServer';
import { getMinimalLoginSystem } from 'app/server/lib/MinimalLogin';

export async function getCoreLoginSystem(): Promise<GristLoginSystem> {
  return await getMinimalLoginSystem();
}
