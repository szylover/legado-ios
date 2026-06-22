import type { ParsedLocalBook, ParsedLocalChapter } from './types';

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

interface ManifestItem {
  href: string;
  mediaType: string;
  properties: string;
}

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function stripFragment(href: string): string {
  return href.split('#')[0];
}

function normalizeZipPath(base: string, href: string): string {
  const raw = stripFragment(href).replace(/\\/g, '/');
  const parts = `${base}${raw}`.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

function parentPath(path: string): string {
  const i = path.lastIndexOf('/');
  return i >= 0 ? path.slice(0, i + 1) : '';
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml');
}

function textOf(doc: Document, tag: string): string {
  return doc.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
}

function attr(el: Element, name: string): string {
  return el.getAttribute(name) ?? '';
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const Ctor = globalThis.DecompressionStream;
  if (!Ctor) {
    throw new Error('当前浏览器不支持解压 EPUB（缺少 DecompressionStream）');
  }
  const stream = new Blob([toArrayBuffer(data)]).stream()
    .pipeThrough(new Ctor('deflate-raw' as CompressionFormat));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

class ZipReader {
  private bytes: Uint8Array;
  private view: DataView;
  private entries = new Map<string, ZipEntry>();

  constructor(buffer: ArrayBuffer) {
    this.bytes = new Uint8Array(buffer);
    this.view = new DataView(buffer);
    this.readCentralDirectory();
  }

  names(): string[] {
    return [...this.entries.keys()];
  }

  async text(name: string): Promise<string> {
    return new TextDecoder('utf-8').decode(await this.bytesOf(name));
  }

  async dataUrl(name: string, mediaType: string): Promise<string | undefined> {
    const bytes = await this.bytesOf(name).catch(() => undefined);
    if (!bytes) return undefined;
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(new Blob([toArrayBuffer(bytes)], { type: mediaType }));
    });
  }

  private readCentralDirectory(): void {
    const min = Math.max(0, this.bytes.length - 0xffff - 22);
    let eocd = -1;
    for (let i = this.bytes.length - 22; i >= min; i--) {
      if (readU32(this.view, i) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error('EPUB ZIP 目录损坏');

    const total = readU16(this.view, eocd + 10);
    let offset = readU32(this.view, eocd + 16);
    const decoder = new TextDecoder('utf-8');

    for (let i = 0; i < total; i++) {
      if (readU32(this.view, offset) !== 0x02014b50) throw new Error('EPUB ZIP 文件头损坏');
      const method = readU16(this.view, offset + 10);
      const compressedSize = readU32(this.view, offset + 20);
      const nameLen = readU16(this.view, offset + 28);
      const extraLen = readU16(this.view, offset + 30);
      const commentLen = readU16(this.view, offset + 32);
      const localHeaderOffset = readU32(this.view, offset + 42);
      const nameBytes = this.bytes.subarray(offset + 46, offset + 46 + nameLen);
      const name = decoder.decode(nameBytes);
      this.entries.set(name, { name, method, compressedSize, localHeaderOffset });
      offset += 46 + nameLen + extraLen + commentLen;
    }
  }

  private async bytesOf(name: string): Promise<Uint8Array> {
    const entry = this.entries.get(name) ?? this.entries.get(decodeURIComponent(name));
    if (!entry) throw new Error(`EPUB 缺少文件: ${name}`);
    const offset = entry.localHeaderOffset;
    if (readU32(this.view, offset) !== 0x04034b50) throw new Error('EPUB ZIP 本地文件头损坏');
    const nameLen = readU16(this.view, offset + 26);
    const extraLen = readU16(this.view, offset + 28);
    const start = offset + 30 + nameLen + extraLen;
    const compressed = this.bytes.subarray(start, start + entry.compressedSize);
    if (entry.method === 0) return compressed;
    if (entry.method === 8) return inflateRaw(compressed);
    throw new Error(`EPUB 压缩方式不支持: ${entry.method}`);
  }
}

function htmlToText(html: string): { title: string; content: string } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,nav,header,footer').forEach(el => el.remove());
  const title = doc.querySelector('h1,h2,h3,title')?.textContent?.trim() ?? '';
  const blocks = [...doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,pre')]
    .map(el => el.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean);
  const content = blocks.length
    ? blocks.filter((line, i) => i === 0 || line !== blocks[i - 1]).join('\n\n')
    : (doc.body.textContent ?? '').replace(/\s+/g, '\n').trim();
  return { title, content };
}

function getManifestItemPath(
  manifest: Map<string, ManifestItem>,
  base: string,
  predicate: (item: ManifestItem) => boolean,
): { path: string; item: ManifestItem } | undefined {
  for (const item of manifest.values()) {
    if (predicate(item)) return { path: normalizeZipPath(base, item.href), item };
  }
  return undefined;
}

export async function parseEpub(file: File): Promise<ParsedLocalBook> {
  const zip = new ZipReader(await file.arrayBuffer());
  if (!zip.names().includes('META-INF/container.xml')) throw new Error('不是有效的 EPUB 文件');

  const container = parseXml(await zip.text('META-INF/container.xml'));
  const opfPath = attr(container.getElementsByTagName('rootfile')[0], 'full-path');
  if (!opfPath) throw new Error('EPUB 缺少 OPF 描述文件');

  const opf = parseXml(await zip.text(opfPath));
  const base = parentPath(opfPath);
  const manifest = new Map<string, ManifestItem>();
  [...opf.getElementsByTagName('item')].forEach(item => {
    manifest.set(attr(item, 'id'), {
      href: attr(item, 'href'),
      mediaType: attr(item, 'media-type'),
      properties: attr(item, 'properties'),
    });
  });

  const name = textOf(opf, 'dc:title') || textOf(opf, 'title') || file.name.replace(/\.epub$/i, '');
  const author = textOf(opf, 'dc:creator') || textOf(opf, 'creator');
  const intro = textOf(opf, 'dc:description') || textOf(opf, 'description') || undefined;
  const coverId = [...opf.getElementsByTagName('meta')]
    .find(meta => attr(meta, 'name') === 'cover')
    ?.getAttribute('content') ?? '';
  const coverItem = (coverId && manifest.get(coverId))
    ? { path: normalizeZipPath(base, manifest.get(coverId)!.href), item: manifest.get(coverId)! }
    : getManifestItemPath(manifest, base, item => item.properties.split(/\s+/).includes('cover-image'));
  const coverUrl = coverItem
    ? await zip.dataUrl(coverItem.path, coverItem.item.mediaType)
    : undefined;

  const chapters: ParsedLocalChapter[] = [];
  for (const itemRef of opf.getElementsByTagName('itemref')) {
    const item = manifest.get(attr(itemRef, 'idref'));
    if (!item || !/x?html/i.test(item.mediaType)) continue;
    const path = normalizeZipPath(base, item.href);
    const { title, content } = htmlToText(await zip.text(path));
    if (!content) continue;
    chapters.push({
      title: title || decodeURIComponent(stripFragment(item.href).split('/').pop() ?? `第 ${chapters.length + 1} 章`),
      content,
      href: path,
    });
  }

  if (!chapters.length) throw new Error('EPUB 未解析到正文目录');
  return { name, author, coverUrl, intro, chapters };
}
