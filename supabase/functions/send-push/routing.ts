// Per-platform dispatch and dead-token selection for send-push. Kept free of
// side effects at import (index.ts calls Deno.serve) so it can be unit tested.
import { isDeadFcmToken, type PushSendResult } from './fcm.ts';

export interface TokenRow {
  token: string;
  platform: 'ios' | 'android';
}

type Data = Record<string, string> | undefined;
type Sender = (token: string, title: string, body: string, data: Data) => Promise<PushSendResult>;

export async function sendToDevices(
  rows: TokenRow[],
  title: string,
  body: string,
  data: Data,
  senders: { sendIos: Sender; sendAndroid: Sender },
): Promise<{ results: PushSendResult[]; deadTokens: string[] }> {
  const settled = await Promise.all(
    rows.map(async (row) => {
      const send = row.platform === 'android' ? senders.sendAndroid : senders.sendIos;
      let result: PushSendResult;
      try {
        result = await send(row.token, title, body, data);
      } catch (e) {
        result = {
          token: row.token,
          ok: false,
          status: 0,
          reason: e instanceof Error ? e.message : String(e),
        };
      }
      const dead =
        row.platform === 'android'
          ? isDeadFcmToken(result)
          : result.status === 410 || result.reason === 'BadDeviceToken';
      return { result, dead };
    }),
  );
  return {
    results: settled.map((s) => s.result),
    deadTokens: settled.filter((s) => s.dead).map((s) => s.result.token),
  };
}
