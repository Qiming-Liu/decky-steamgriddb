"""Adds a button to Steam store app pages through Steam's DevTools port.

Steam's web helper serves the Chrome DevTools protocol on 127.0.0.1:8080 (Decky
itself depends on it). Store pages are separate browser targets, so the button
is injected into each store app page; a CDP binding reports clicks back here and
they are forwarded to the frontend as a Decky event.
"""
import asyncio
import base64
import json
import os
import re
import struct
import time
from pathlib import Path
from urllib.request import urlopen

import decky  # type: ignore

CDP_HOST = '127.0.0.1'
CDP_PORT = 8080
BINDING = 'sgdbStoreArtwork'
EVENT = 'store_artwork'
STORE_APP_URL = re.compile(r'^https://store\.steampowered\.com/app/\d+')
POLL_SECONDS = 2
SCRIPT_TEMPLATE = (Path(__file__).with_name('store_button.js')).read_text(encoding='utf-8')


class CdpSession:
    """A minimal client for one DevTools target (text frames only)."""

    def __init__(self, ws_url):
        self.path = '/' + ws_url.split('/', 3)[3]
        self.reader = None
        self.writer = None
        self.next_id = 0
        self.pending = {}

    async def connect(self):
        self.reader, self.writer = await asyncio.wait_for(asyncio.open_connection(CDP_HOST, CDP_PORT), 5)
        key = base64.b64encode(os.urandom(16)).decode()
        self.writer.write((
            f'GET {self.path} HTTP/1.1\r\nHost: {CDP_HOST}:{CDP_PORT}\r\nUpgrade: websocket\r\n'
            f'Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'
        ).encode())
        await self.writer.drain()
        head = await asyncio.wait_for(self.reader.readuntil(b'\r\n\r\n'), 5)
        if b' 101 ' not in head.split(b'\r\n', 1)[0]:
            raise ConnectionError('DevTools refused the websocket')

    async def _send_frame(self, opcode, data):
        mask = os.urandom(4)
        n = len(data)
        if n < 126:
            header = bytes([0x80 | opcode, 0x80 | n])
        elif n < 65536:
            header = bytes([0x80 | opcode, 0xFE]) + struct.pack('>H', n)
        else:
            header = bytes([0x80 | opcode, 0xFF]) + struct.pack('>Q', n)
        self.writer.write(header + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))
        await self.writer.drain()

    async def send(self, method, params=None):
        """Sends a command and returns a future for its result."""
        self.next_id += 1
        future = asyncio.get_running_loop().create_future()
        self.pending[self.next_id] = future
        await self._send_frame(0x1, json.dumps({'id': self.next_id, 'method': method, 'params': params or {}}).encode())
        return future

    async def call(self, method, params=None, timeout=5):
        return await asyncio.wait_for(await self.send(method, params), timeout)

    async def messages(self):
        """Yields events; command results resolve their futures."""
        message = b''
        while True:
            b1, b2 = await self.reader.readexactly(2)
            n = b2 & 0x7F
            if n == 126:
                n = struct.unpack('>H', await self.reader.readexactly(2))[0]
            elif n == 127:
                n = struct.unpack('>Q', await self.reader.readexactly(8))[0]
            payload = await self.reader.readexactly(n)
            opcode = b1 & 0x0F
            if opcode == 0x8:
                return
            if opcode == 0x9:
                await self._send_frame(0xA, payload)
                continue
            if opcode == 0xA:
                continue
            message += payload
            if not b1 & 0x80:
                continue
            data = json.loads(message)
            message = b''
            future = self.pending.pop(data.get('id'), None)
            if future is not None:
                if not future.done():
                    future.set_result(data.get('result', data.get('error')))
            elif 'method' in data:
                yield data

    def close(self):
        if self.writer:
            self.writer.close()


class StoreButton:
    def __init__(self):
        self.label = ''
        self.sessions = {}  # target id -> (task, CdpSession)
        self.script_ids = {}  # target id -> new-document script identifier
        self.watcher = None
        # Start time first: the newest backend owns the button (see store_button.js).
        self.token = '%020d-%s' % (time.time_ns(), os.urandom(4).hex())

    def script(self):
        return (SCRIPT_TEMPLATE
                .replace('__SGDB_LABEL__', json.dumps(self.label))
                .replace('__SGDB_BINDING__', json.dumps(BINDING))
                .replace('__SGDB_OWNER__', json.dumps(self.token)))

    def start(self):
        if self.watcher is None:
            self.watcher = asyncio.get_running_loop().create_task(self._watch())

    async def set_label(self, label):
        self.label = label
        for target_id, (_, session) in list(self.sessions.items()):
            try:
                await self._install(target_id, session)
            except Exception:
                pass

    async def _install(self, target_id, session):
        old = self.script_ids.pop(target_id, None)
        if old:
            await session.call('Page.removeScriptToEvaluateOnNewDocument', {'identifier': old})
        # Runs on every later document of this target; the evaluate covers the current one.
        added = await session.call('Page.addScriptToEvaluateOnNewDocument', {'source': self.script()})
        if isinstance(added, dict) and added.get('identifier'):
            self.script_ids[target_id] = added['identifier']
        await session.call('Runtime.evaluate', {'expression': self.script()})

    async def _watch(self):
        while True:
            try:
                if self.label:
                    targets = await asyncio.get_running_loop().run_in_executor(None, _list_targets)
                    for target in targets:
                        if (target.get('type') == 'page' and STORE_APP_URL.match(target.get('url', ''))
                                and target.get('id') not in self.sessions and target.get('webSocketDebuggerUrl')):
                            session = CdpSession(target['webSocketDebuggerUrl'])
                            task = asyncio.get_running_loop().create_task(self._attach(target['id'], session))
                            self.sessions[target['id']] = (task, session)
            except Exception as e:
                decky.logger.debug('store button: listing targets failed: %s', e)
            await asyncio.sleep(POLL_SECONDS)

    async def _attach(self, target_id, session):
        try:
            await session.connect()
            reader = asyncio.get_running_loop().create_task(self._read(session))
            # Steam's CEF only runs new-document scripts with Page enabled and only exposes
            # bindings on new documents with Runtime enabled. Without these the button and its
            # binding vanish once the store view moves on to another game.
            await session.call('Page.enable')
            await session.call('Runtime.enable')
            await session.call('Runtime.addBinding', {'name': BINDING})
            await self._install(target_id, session)
            decky.logger.info('store button: attached to %s', target_id)
            await reader
        except Exception as e:
            decky.logger.debug('store button: target %s ended: %s', target_id, e)
        finally:
            session.close()
            self.sessions.pop(target_id, None)
            self.script_ids.pop(target_id, None)

    async def _read(self, session):
        async for event in session.messages():
            if event.get('method') != 'Runtime.bindingCalled':
                continue
            params = event.get('params', {})
            if params.get('name') != BINDING:
                continue
            try:
                payload = json.loads(params.get('payload', '{}'))
                appid = int(payload.get('appid'))
            except (TypeError, ValueError, AttributeError):
                continue
            # A newer backend instance (e.g. after a reload) owns the button now.
            if payload.get('owner') != self.token:
                continue
            await decky.emit(EVENT, appid)

    async def stop(self):
        if self.watcher:
            self.watcher.cancel()
            self.watcher = None
        for target_id, (task, session) in list(self.sessions.items()):
            try:
                script_id = self.script_ids.get(target_id)
                if script_id:
                    await session.call('Page.removeScriptToEvaluateOnNewDocument', {'identifier': script_id}, timeout=1)
                await session.call('Runtime.evaluate', {'expression': 'window.__sgdbStoreButton && window.__sgdbStoreButton.stop()'}, timeout=1)
                await session.call('Runtime.removeBinding', {'name': BINDING}, timeout=1)
            except Exception:
                pass
            task.cancel()
            session.close()
        self.sessions.clear()
        self.script_ids.clear()


def _list_targets():
    with urlopen(f'http://{CDP_HOST}:{CDP_PORT}/json/list', timeout=3) as res:
        return json.load(res)
