import { OcrMarkdownService } from '../services/ocr-markdown.service';

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
  const inputPath = getArgValue('--input') ?? getArgValue('-i');
  const outputPath = getArgValue('--output') ?? getArgValue('-o');
  const overwrite = hasFlag('--overwrite');

  if (!inputPath) {
    throw new Error(
      'Missing --input argument. Example: npm run ocr:md -- --input asset/a.json --output asset/a.md',
    );
  }

  const service = new OcrMarkdownService();
  const result = await service.convertJsonFileToMarkdown({
    inputPath,
    outputPath,
    overwrite,
  });

  console.log(JSON.stringify(result, null, 2));
}

void main();
