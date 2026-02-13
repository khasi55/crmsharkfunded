import asyncio
import websockets
import json

async def test_ws():
    uri = "wss://bridge.sharkfunded.co/ws/stream/0"
    api_key = os.getenv("MT5_API_KEY", "")
    headers = {
        "X-API-Key": api_key,
        "ngrok-skip-browser-warning": "true"
    }
    print(f"Connecting to {uri} (with headers)...")
    try:
        async with websockets.connect(uri, extra_headers=headers) as websocket:
            print("✅ Connected to WebSocket server")
            
            # Since the server is broadcast-only for now, we just wait for messages
            print("Waiting for updates (Ctrl+C to stop)...")
            while True:
                message = await websocket.recv()
                data = json.loads(message)
                print(f"📥 Received: {data}")
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(test_ws())
    except KeyboardInterrupt:
        print("\nTest stopped.")
