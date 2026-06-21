import fs from "node:fs/promises"
import net from "node:net"
import type { PrinterConfig } from "../config"

export interface PrintSink {
  readonly mode: string
  print(data: Buffer): Promise<void>
}

class NetworkPrintSink implements PrintSink {
  readonly mode = "network"

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly timeoutMs: number,
  ) {}

  print(data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = net.connect({ host: this.host, port: this.port }, () => {
        socket.write(data, (err) => {
          if (err) {
            socket.destroy()
            reject(err)
            return
          }
          socket.end(() => resolve())
        })
      })

      socket.setTimeout(this.timeoutMs)
      socket.on("timeout", () => {
        socket.destroy()
        reject(new Error(`Timeout ao conectar impressora ${this.host}:${this.port}`))
      })
      socket.on("error", reject)
    })
  }
}

class FilePrintSink implements PrintSink {
  readonly mode = "file"

  constructor(private readonly devicePath: string) {}

  async print(data: Buffer): Promise<void> {
    await fs.writeFile(this.devicePath, data)
  }
}

class NoOpPrintSink implements PrintSink {
  readonly mode = "none"

  async print(_data: Buffer): Promise<void> {
    // Sem impressora — apenas log no poller
  }
}

export function createPrintSink(printer: PrinterConfig): PrintSink {
  if (printer.type === "network") {
    return new NetworkPrintSink(printer.host, printer.port, printer.timeoutMs)
  }
  if (printer.type === "file") {
    return new FilePrintSink(printer.device)
  }
  return new NoOpPrintSink()
}
