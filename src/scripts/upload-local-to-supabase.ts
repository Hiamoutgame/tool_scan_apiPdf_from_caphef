import 'dotenv/config';
import { SupabaseStorageService } from '../services/supabase-storage.service';

function getArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }

  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const localPath = getArgValue('--local') ?? getArgValue('-l');
  const remotePath = getArgValue('--remote') ?? getArgValue('-r');
  const bucket = getArgValue('--bucket') ?? getArgValue('-b');
  const contentType = getArgValue('--content-type');
  const cacheControl = getArgValue('--cache-control');
  const upsert = hasFlag('--upsert');

  if (!localPath) {
    throw new Error(
      'Missing --local argument. Example: npm run storage:upload -- --local asset/a.md --remote ocr/a.md --upsert',
    );
  }

  const service = new SupabaseStorageService();
  const result = await service.uploadLocalFile({
    localPath,
    remotePath,
    bucket,
    upsert,
    contentType,
    cacheControl,
  });

  console.log(JSON.stringify(result, null, 2));
}

void main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown upload error');
  }

  process.exitCode = 1;
});
