// @ts-nocheck
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function sha256hex(value: string | Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  const bytes = await subtle.digest('SHA-256', typeof value === 'string' ? encoder.encode(value) : value);
  return Array.from(new Uint8Array(bytes)).map((item) => item.toString(16).padStart(2, '0')).join('');
}

function b64toU8(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function u8ToB64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const DEFAULT_TOKEN_TIMEOUT_MS = 6000;

function normalizeTimeout(value?: number): number {
  const timeoutMs = Number(value);
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.max(1, Math.round(timeoutMs)) : DEFAULT_TOKEN_TIMEOUT_MS;
}

function createTimeoutError(timeoutMs: number): Error {
  const error = new Error(`Flixcloud token request timed out after ${timeoutMs}ms`);
  error.name = 'TimeoutError';
  return error;
}

function createAbortError(): Error {
  const error = new Error('Operation aborted');
  error.name = 'AbortError';
  return error;
}

function createDeadline(timeoutMs?: number, parentSignal?: AbortSignal | null) {
  const controller = new AbortController();
  const boundedTimeoutMs = normalizeTimeout(timeoutMs);
  let timeoutId: NodeJS.Timeout | null = null;
  let removeAbortListener: (() => void) | null = null;
  const timeoutError = createTimeoutError(boundedTimeoutMs);
  const abortError = createAbortError();
  const deadlinePromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort(timeoutError);
      reject(timeoutError);
    }, boundedTimeoutMs);

    if (parentSignal) {
      const abortFromParent = () => {
        if (!controller.signal.aborted) controller.abort(abortError);
        reject(abortError);
      };
      if (parentSignal.aborted) {
        abortFromParent();
      } else {
        parentSignal.addEventListener('abort', abortFromParent, { once: true });
        removeAbortListener = () => parentSignal.removeEventListener('abort', abortFromParent);
      }
    }
  });
  deadlinePromise.catch(() => {});
  return {
    signal: controller.signal,
    deadlinePromise,
    cancel() {
      if (timeoutId) clearTimeout(timeoutId);
      removeAbortListener?.();
    },
  };
}

async function fetchTokenBody(
  fetchImpl: typeof fetch,
  url: string,
  options: RequestInit,
  timeoutMs?: number,
  parentSignal?: AbortSignal | null
) {
  const deadline = createDeadline(timeoutMs, parentSignal);
  try {
    const response = (await Promise.race([
      fetchImpl(url, { ...options, signal: deadline.signal }),
      deadline.deadlinePromise,
    ])) as Response;
    const body = (await Promise.race([response.text(), deadline.deadlinePromise])) as string;
    return { response, body };
  } catch (error: any) {
    if (error?.code === 'STREAM_TIMEOUT' || error?.name === 'TimeoutError') throw error;
    if (deadline.signal.aborted) throw createAbortError();
    throw new Error('Flixcloud token request failed');
  } finally {
    deadline.cancel();
  }
}

async function deriveFields(seed: string) {
  let first = seed;
  for (let i = 0; i < 3; i++) first = await sha256hex(first + i);
  let second = first;
  for (let i = 0; i < 3; i++) second = await sha256hex(second + i);
  return {
    keyField: 'kf_' + first.substring(8, 16),
    ivField: 'ivf_' + first.substring(16, 24),
    containerName: 'cd_' + first.substring(24, 32),
    arrayName: 'ad_' + first.substring(32, 40),
    objectName: 'od_' + first.substring(40, 48),
    tokenField: first.substring(48, 64) + '_' + first.substring(56, 64),
    keyFrag2Field: second.substring(0, 16) + '_' + second.substring(16, 24),
  };
}

function extractSsrObj(html: string): string {
  const match = html.match(/\{type:"data",data:(\{)/);
  if (!match) throw new Error('SSR data block not found');
  let depth = 0;
  const start = html.indexOf('{', (match.index ?? 0) + match[0].length - 1);
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('SSR brace matching failed');
}

function parseJsLiteral(source: string): any {
  let index = 0;
  function whitespace() {
    while (index < source.length && /\s/.test(source[index])) index++;
  }
  function doubleString() {
    let out = '';
    index++;
    while (index < source.length && source[index] !== '"') {
      if (source[index] === '\\') {
        index++;
        out += ({ n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\' } as any)[source[index]] ?? source[index];
        index++;
      } else out += source[index++];
    }
    index++;
    return out;
  }
  function singleString() {
    let out = '';
    index++;
    while (index < source.length && source[index] !== "'") {
      if (source[index] === '\\') {
        index++;
        out += source[index] === "'" ? "'" : ({ n: '\n', t: '\t', r: '\r', '\\': '\\' } as any)[source[index]] ?? source[index];
        index++;
      } else out += source[index++];
    }
    index++;
    return out;
  }
  function key() {
    whitespace();
    if (source[index] === '"') return doubleString();
    if (source[index] === "'") return singleString();
    const match = source.slice(index).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
    if (!match) throw new Error(`Bad key at pos ${index}: ${source.slice(index, index + 20)}`);
    index += match[0].length;
    return match[0];
  }
  function object() {
    const out: Record<string, any> = {};
    index++;
    whitespace();
    while (index < source.length && source[index] !== '}') {
      if (source[index] === ',') {
        index++;
        whitespace();
        continue;
      }
      const property = key();
      whitespace();
      index++;
      out[property] = value();
      whitespace();
    }
    index++;
    return out;
  }
  function array() {
    const out: any[] = [];
    index++;
    whitespace();
    while (index < source.length && source[index] !== ']') {
      if (source[index] === ',') {
        index++;
        whitespace();
        continue;
      }
      out.push(value());
      whitespace();
    }
    index++;
    return out;
  }
  function value(): any {
    whitespace();
    if (source[index] === '{') return object();
    if (source[index] === '[') return array();
    if (source[index] === '"') return doubleString();
    if (source[index] === "'") return singleString();
    if (source.startsWith('true', index)) {
      index += 4;
      return true;
    }
    if (source.startsWith('false', index)) {
      index += 5;
      return false;
    }
    if (source.startsWith('null', index)) {
      index += 4;
      return null;
    }
    if (source.startsWith('undefined', index)) {
      index += 9;
      return null;
    }
    if (source.startsWith('!0', index)) {
      index += 2;
      return true;
    }
    if (source.startsWith('!1', index)) {
      index += 2;
      return false;
    }
    const match = source.slice(index).match(/^-?[\d.]+([eE][+-]?\d+)?/);
    if (match) {
      index += match[0].length;
      return parseFloat(match[0]);
    }
    throw new Error(`JS parse error at pos ${index}: ...${source.slice(index, index + 20)}`);
  }
  return value();
}

function parseWasmDecrypt(bytes: Uint8Array) {
  let position = 8;
  while (position < bytes.length) {
    const section = bytes[position++];
    let size = 0;
    let shift = 0;
    let next: number;
    do {
      next = bytes[position++];
      size |= (next & 127) << shift;
      shift += 7;
    } while (next & 128);
    if (section === 10) {
      position++;
      let bodySize = 0;
      let bodyShift = 0;
      do {
        next = bytes[position++];
        bodySize |= (next & 127) << bodyShift;
        bodyShift += 7;
      } while (next & 128);
      position += bodySize;
      break;
    }
    position += size;
  }
  let functionSize = 0;
  let functionShift = 0;
  let next: number;
  do {
    next = bytes[position++];
    functionSize |= (next & 127) << functionShift;
    functionShift += 7;
  } while (next & 128);
  const body = bytes.slice(position, position + functionSize);
  function leb(arr: Uint8Array, idx: number): [number, number] {
    let value = 0;
    let s = 0;
    let n: number;
    do {
      n = arr[idx++];
      value |= (n & 127) << s;
      s += 7;
    } while (n & 128);
    return [value, idx];
  }
  const xorEnd = [32, 2, 32, 5, 106, 45, 0, 0, 115, 33, 6];
  let transformStart = -1;
  outer: for (let i = 0; i < body.length - xorEnd.length; i++) {
    for (let j = 0; j < xorEnd.length; j++) if (body[i + j] !== xorEnd[j]) continue outer;
    transformStart = i + xorEnd.length;
    break;
  }
  if (transformStart < 0) throw new Error('WASM: transform start not found');
  let transformEnd = -1;
  let step = 36;
  for (let i = transformStart; i < body.length - 4; i++) {
    if (body[i] === 32 && body[i + 1] === 5 && body[i + 2] === 65) {
      const [value, nextIndex] = leb(body, i + 3);
      if (body[nextIndex] === 108) {
        transformEnd = i;
        step = value;
        break;
      }
    }
  }
  if (transformEnd < 0) throw new Error('WASM: keystream not found');
  const code = body.slice(transformStart, transformEnd);
  function transform(inputByte: number) {
    let local = inputByte & 255;
    const stack: number[] = [];
    let idx = 0;
    while (idx < code.length) {
      const opcode = code[idx++];
      if (opcode === 32) {
        const [localIndex, nextIndex] = leb(code, idx);
        idx = nextIndex;
        stack.push(localIndex === 6 ? local : 0);
      } else if (opcode === 33) {
        const [localIndex, nextIndex] = leb(code, idx);
        idx = nextIndex;
        const val = stack.pop() ?? 0;
        if (localIndex === 6) local = val & 255;
      } else if (opcode === 65) {
        const [value, nextIndex] = leb(code, idx);
        idx = nextIndex;
        stack.push(value);
      } else if (opcode === 106) {
        const right = stack.pop() ?? 0;
        const left = stack.pop() ?? 0;
        stack.push((left + right) & 255);
      } else if (opcode === 107) {
        const right = stack.pop() ?? 0;
        const left = stack.pop() ?? 0;
        stack.push((left - right + 256) & 255);
      } else if (opcode === 113) {
        const right = stack.pop() ?? 0;
        const left = stack.pop() ?? 0;
        stack.push(left & right & 255);
      } else if (opcode === 114) {
        const right = stack.pop() ?? 0;
        const left = stack.pop() ?? 0;
        stack.push((left | right) & 255);
      } else if (opcode === 115) {
        const right = stack.pop() ?? 0;
        const left = stack.pop() ?? 0;
        stack.push((left ^ right) & 255);
      } else if (opcode === 116) {
        const right = stack.pop() ?? 0;
        const left = stack.pop() ?? 0;
        stack.push((left << (right & 7)) & 255);
      } else if (opcode === 118) {
        const right = stack.pop() ?? 0;
        const left = stack.pop() ?? 0;
        stack.push((left >>> (right & 7)) & 255);
      }
    }
    return local;
  }
  return { step, transform };
}

function runDecrypt(
  wasmBytes: Uint8Array,
  fragment: Uint8Array,
  keyFragment: Uint8Array,
  token: Uint8Array,
  seed: number
): Uint8Array {
  const { step, transform } = parseWasmDecrypt(wasmBytes);
  const out = new Uint8Array(fragment.length);
  for (let i = 0; i < fragment.length; i++) {
    const value = fragment[i] ^ keyFragment[i] ^ ((token[i] & 255) || 0);
    out[i] = (transform(value) ^ (i * step + seed)) & 255;
  }
  return out;
}

function derivePkFromWasmBytes(wasmBytes: Uint8Array): string {
  try {
    let pos = 8;
    while (pos < wasmBytes.length) {
      const sectionId = wasmBytes[pos++];
      let sectionSize = 0;
      let shift = 0;
      while (pos < wasmBytes.length) {
        const byte = wasmBytes[pos++];
        sectionSize |= (byte & 0x7f) << shift;
        if ((byte & 0x80) === 0) break;
        shift += 7;
      }
      const sectionEnd = pos + sectionSize;

      if (sectionId === 11) {
        let count = 0;
        shift = 0;
        while (pos < sectionEnd) {
          const byte = wasmBytes[pos++];
          count |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        for (let s = 0; s < count; s++) {
          const flags = wasmBytes[pos++];
          if (flags === 0) {
            while (pos < sectionEnd && wasmBytes[pos++] !== 0x0b) {}
            let dataLen = 0;
            shift = 0;
            while (pos < sectionEnd) {
              const byte = wasmBytes[pos++];
              dataLen |= (byte & 0x7f) << shift;
              if ((byte & 0x80) === 0) break;
              shift += 7;
            }
            if (dataLen >= 64) {
              const part1 = wasmBytes.slice(pos, pos + 32);
              const part2 = wasmBytes.slice(pos + 32, pos + 64);
              const pkBytes = new Uint8Array(32);
              for (let i = 0; i < 32; i++) {
                pkBytes[i] = part1[i] ^ part2[i];
              }
              return u8ToB64(pkBytes);
            }
          }
        }
      }
      pos = sectionEnd;
    }
  } catch {
    // Ignore and fallback
  }
  return '';
}

export interface ExtractedFlixcloudResult {
  url: string;
  pk: string;
  subtitles: Array<{
    url: string;
    language?: string;
    label?: string;
    default?: boolean;
    format?: string;
  }>;
  thumbnails_vtt: string | null;
  video_title: string | null;
  intro_chapter: { start: number; end: number } | null;
  outro_chapter: { start: number; end: number } | null;
  video_id: string | null;
}

export async function extractFlixcloud(
  embedHtml: string,
  {
    fetchImpl = fetch,
    apiBase = 'https://flixcloud.cc',
    headers = {},
    referer,
    signal,
    timeoutMs = DEFAULT_TOKEN_TIMEOUT_MS,
  }: {
    fetchImpl?: typeof fetch;
    apiBase?: string;
    headers?: Record<string, string>;
    referer?: string;
    signal?: AbortSignal | null;
    timeoutMs?: number;
  } = {}
): Promise<ExtractedFlixcloudResult> {
  const data = parseJsLiteral(extractSsrObj(embedHtml));
  const seed = data.obfuscation_seed;
  if (!seed) {
    const error: any = new Error('obfuscation_seed missing');
    error.debug = { topKeys: Object.keys(data).slice(0, 20) };
    throw error;
  }
  const fields = await deriveFields(seed);
  const cryptoData = data.obfuscated_crypto_data;
  if (!cryptoData) {
    const error: any = new Error('obfuscated_crypto_data missing');
    error.debug = { fields, topKeys: Object.keys(data).slice(0, 20) };
    throw error;
  }
  const container = cryptoData[fields.containerName];
  if (!container) {
    const error: any = new Error(`containerName "${fields.containerName}" not in ocd`);
    error.debug = { fields, ocdKeys: Object.keys(cryptoData).slice(0, 10) };
    throw error;
  }
  const array = container[fields.arrayName];
  if (!array) {
    const error: any = new Error(`arrayName "${fields.arrayName}" not in container`);
    error.debug = { fields, containerKeys: Object.keys(container).slice(0, 10) };
    throw error;
  }
  const object = array[0][fields.objectName];
  if (!object) {
    const error: any = new Error(`objectName "${fields.objectName}" not in arr[0]`);
    error.debug = { fields, arr0Keys: Object.keys(array[0]).slice(0, 10) };
    throw error;
  }
  const fragment = b64toU8(object[fields.keyField]);
  const iv = b64toU8(object[fields.ivField]);
  const keyFragmentRaw = data[fields.keyFrag2Field];
  if (!keyFragmentRaw) {
    const error: any = new Error(`kf2 field "${fields.keyFrag2Field}" not in data`);
    error.debug = { fields, topKeys: Object.keys(data).slice(0, 20) };
    throw error;
  }
  const keyFragment = b64toU8(keyFragmentRaw);
  const token = data[fields.tokenField];
  if (!token) {
    const error: any = new Error(`tokenField "${fields.tokenField}" missing`);
    error.debug = { fields, topKeys: Object.keys(data).slice(0, 20) };
    throw error;
  }
  const tokenResult = await fetchTokenBody(
    fetchImpl,
    `${apiBase}/api/m3u8/${token}`,
    { headers: { ...headers, ...(referer ? { Referer: referer } : {}) } },
    timeoutMs,
    signal
  );
  const { response: tokenResponse, body: tokenBody } = tokenResult;
  if (!tokenResponse.ok) {
    throw new Error(`Token API ${tokenResponse.status}`);
  }

  let tokenData: any;
  try {
    tokenData = JSON.parse(tokenBody);
  } catch {
    throw new Error('Token API returned invalid JSON');
  }
  const videoKey = (await sha256hex(token + 'vid')).substring(0, 10);
  const tokenKey = (await sha256hex(token + 'key')).substring(0, 10);
  const videoBytes = b64toU8(tokenData[videoKey]);
  const tokenBytes = b64toU8(tokenData[tokenKey]);
  if (!videoBytes.length || !tokenBytes.length) {
    const error: any = new Error(`Token fields missing. vidKey="${videoKey}" keyKey="${tokenKey}"`);
    error.debug = { tokKeys: Object.keys(tokenData).slice(0, 10) };
    throw error;
  }
  const seedNumber = parseInt(seed.substring(0, 8), 16);
  const wasmPayload = b64toU8(data.w_payload ?? '');
  if (!wasmPayload.length) throw new Error('w_payload missing from embed data');
  let wasmOut: Uint8Array;
  try {
    wasmOut = runDecrypt(wasmPayload, fragment, keyFragment, tokenBytes, seedNumber);
  } catch (error: any) {
    error.wasmHex = Array.from(wasmPayload).map((item) => item.toString(16).padStart(2, '0')).join('');
    throw error;
  }
  const material = await crypto.subtle.importKey('raw', wasmOut, { name: 'PBKDF2' }, false, ['deriveBits']);
  const derived = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: encoder.encode(seed), iterations: 1e3, hash: 'SHA-256' },
      material,
      256
    )
  );
  for (let i = 0; i < 32; i++) derived[i] ^= seed.charCodeAt(i % seed.length);
  const aesKeyBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', derived));
  const aesKey = await crypto.subtle.importKey('raw', aesKeyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, aesKey, videoBytes);
  } catch (error: any) {
    error.debug = {
      seedInt: '0x' + seedNumber.toString(16),
      frag1Len: fragment.length,
      kf2Len: keyFragment.length,
      T_bytesLen: tokenBytes.length,
      ivLen: iv.length,
      v_bytesLen: videoBytes.length,
      wPayloadLen: wasmPayload.length,
      wasmOutHex: Array.from(wasmOut).map((item) => item.toString(16).padStart(2, '0')).join(''),
    };
    throw error;
  }
  const url = decoder.decode(plain).trim().replace(/\0+$/, '');
  if (!url.startsWith('http')) throw new Error(`Unexpected decrypted value: ${url.substring(0, 60)}`);

  let pk = derivePkFromWasmBytes(wasmPayload);
  if (!pk && typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function') {
    try {
      const wasmModule = await WebAssembly.instantiate(wasmPayload, {});
      const inst: any = wasmModule.instance;
      if (typeof inst?.exports?._c === 'function') {
        const g = inst.exports._c();
        const buf = new Uint8Array(inst.exports.memory.buffer).slice(g, g + 32);
        pk = u8ToB64(buf);
      }
    } catch (err: any) {
      console.warn('Failed to derive flixcloud __pk from wasm:', err.message);
    }
  }

  return {
    url,
    pk,
    subtitles: data.subtitles ?? [],
    thumbnails_vtt: data.thumbnails_vtt ?? null,
    video_title: data.video_title ?? null,
    intro_chapter: data.intro_chapter ?? null,
    outro_chapter: data.outro_chapter ?? null,
    video_id: data.video_id ?? null,
  };
}
