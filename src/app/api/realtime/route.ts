import { NextRequest } from 'next/server';
import { realtimeEmitter } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const responseStream = new ReadableStream({
    start(controller) {
      // Send initial keeping alive message
      controller.enqueue(': keepalive\n\n');

      const onUpdate = (eventData: any) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(eventData)}\n\n`);
        } catch (e) {
          // If connection closed or stream is locked
        }
      };

      realtimeEmitter.on('update', onUpdate);

      // Send heartbeat every 15s to keep connections open
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(': ping\n\n');
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Clean up when client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        realtimeEmitter.off('update', onUpdate);
        try {
          controller.close();
        } catch (e) {}
      });
    }
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
