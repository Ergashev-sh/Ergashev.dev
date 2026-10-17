"""Minimal GitHub JSON and media storage. No database server required."""
import asyncio
import base64
import json
import os
from pathlib import Path
from urllib.parse import quote
import httpx


class GitHubStore:
    def __init__(self):
        self.owner = os.environ['GH_OWNER']
        self.repo = os.environ['GH_REPO']
        self.branch = os.getenv('GH_BRANCH', 'main')
        self.token = os.environ['GH_TOKEN']
        self.client = httpx.AsyncClient(
            base_url=f'https://api.github.com/repos/{self.owner}/{self.repo}/',
            headers={
                'Authorization': f'Bearer {self.token}',
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            }, timeout=40.0,
        )
        self.lock = asyncio.Lock()

    async def close(self):
        await self.client.aclose()

    async def _get(self, path):
        response = await self.client.get('contents/' + quote(path, safe='/'), params={'ref': self.branch})
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()

    async def read_json(self, path, default):
        result = await self._get(path)
        if result is None:
            return default
        encoded = result.get('content', '').replace('\n', '')
        return json.loads(base64.b64decode(encoded).decode('utf-8'))

    async def _put(self, path, raw, description):
        current = await self._get(path)
        payload = {
            'message': description,
            'content': base64.b64encode(raw).decode('ascii'),
            'branch': self.branch,
        }
        if current:
            payload['sha'] = current['sha']
        result = await self.client.put('contents/' + quote(path, safe='/'), json=payload)
        result.raise_for_status()
        return result.json()

    async def transform_list(self, path, action, message):
        """Use one lock to avoid accidental overlapping JSON commits."""
        async with self.lock:
            current = await self.read_json(path, [])
            if not isinstance(current, list):
                raise ValueError(f'{path} must contain a JSON array')
            result = action(current)
            if result is None:
                result = current
            await self._put(path, (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode(), message)
            return result

    async def update_profile(self, field, value):
        async with self.lock:
            current = await self.read_json('data/profile.json', {})
            current[field] = value
            await self._put('data/profile.json', (json.dumps(current, ensure_ascii=False, indent=2) + '\n').encode(), 'admin: update profile')

    async def upload_image(self, content: bytes, filename: str):
        """Copied to GitHub so the website can serve it while the bot is OFF."""
        path = f'assets/uploads/{filename}'
        async with self.lock:
            await self._put(path, content, f'admin: upload image {filename}')
        return path
