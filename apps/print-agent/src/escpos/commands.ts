/** Comandos ESC/POS mínimos (sem dependência nativa). */

export const ESC = 0x1b
export const GS = 0x1d
export const LF = 0x0a

export function init(): Buffer {
  return Buffer.from([ESC, 0x40])
}

export function align(mode: "left" | "center" | "right"): Buffer {
  const n = mode === "left" ? 0 : mode === "center" ? 1 : 2
  return Buffer.from([ESC, 0x61, n])
}

export function bold(on: boolean): Buffer {
  return Buffer.from([ESC, 0x45, on ? 1 : 0])
}

export function doubleSize(on: boolean): Buffer {
  return Buffer.from([GS, 0x21, on ? 0x11 : 0x00])
}

export function cut(): Buffer {
  return Buffer.from([GS, 0x56, 0x00])
}

export function textLine(line: string): Buffer {
  const normalized = line.normalize("NFC").replace(/[^\x20-\x7E\xA0-\xFF\n\r]/g, "?")
  return Buffer.concat([Buffer.from(normalized, "latin1"), Buffer.from([LF])])
}

export function separator(char = "-", width = 32): Buffer {
  return textLine(char.repeat(width))
}

export function concat(chunks: Buffer[]): Buffer {
  return Buffer.concat(chunks)
}
