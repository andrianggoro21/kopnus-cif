import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dataDir = process.env.DATA_DIR ?? fileURLToPath(new URL('../testdata/', import.meta.url))
const port = Number(process.env.PORT ?? 3000)
const load = (file) => JSON.parse(readFileSync(join(dataDir, file), 'utf8'))

createServer((req, res) => {
  const send = (body, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  }
  const path = new URL(req.url, 'http://mock').pathname

  if (req.method === 'GET' && path === '/api/customer-information') return send(load('customers.json'))

  if (req.method === 'POST' && path === '/api/scoring') {
    let raw = ''
    req.on('data', (chunk) => (raw += chunk))
    req.on('end', () => {
      let noCif
      try {
        noCif = JSON.parse(raw).NO_CIF
      } catch {
        noCif = undefined
      }
      console.log(`scoring NO_CIF=${noCif}`)
      send(load('scoring.json')[noCif] ?? { score: null, error: 'CUSTOMER_NOT_FOUND' })
    })
    return
  }

  send({ error: 'NOT_FOUND' }, 404)
}).listen(port, () => console.log(`Mock Beeceptor siap di http://localhost:${port}`))
