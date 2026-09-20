import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createJiti } from 'jiti'
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const { renderReport } = await createJiti(import.meta.url).import('../src/components/report/QueueReportPdf.ts')
const fonts = {
  regular: readFileSync(new URL('../public/fonts/Sarabun-Regular.ttf', import.meta.url)),
  bold: readFileSync(new URL('../public/fonts/Sarabun-Bold.ttf', import.meta.url)),
}
const canonical = (text) => text.replace(/\s+/gu, '')
  .replace(/\u0e4d([\u0e48-\u0e4b]?)\u0e32/gu, '$1\u0e33')
// Synthetic text only. Include vowels first encountered in opposite orders,
// tone marks, Latin O, digits, repeated names and names that contain another.
const names = ['คำ', 'มาลัย', 'น้ำ', 'กำ', 'น้ํา', 'นํ้า', 'คำ', 'คำแก้ว', 'O3 Test']

for (const groupBy of ['room', 'doctor']) {
  for (const reverse of [false, true]) {
    for (const filterLabel of ['All operating rooms', 'ห้อง OR-201 · ทดสอบน้ำ']) {
      test(`Thai PDF round trip: ${groupBy}, reverse=${reverse}, ${filterLabel}`, async () => {
        const ordered = reverse ? [...names].reverse() : names
        const rows = Array.from({ length: 36 }, (_, i) => ({
          id: i + 1, hn: String(i + 1).padStart(7, '0'),
          fullName: ordered[i % ordered.length], date: '2026-09-20',
          queueOrder: i + 1, room: 'OR-201', age: 30, gender: 'male',
          status: 'Upcoming', doctorLicense: 'synthetic',
          procedure: 'ทดสอบน้ำและภาษาไทย O3',
        }))
        const doc = renderReport(PDFDocument, fonts, rows, {
          mode: 'admin', groupBy, filterLabel, rangeLabel: 'All dates',
          printedBy: 'synthetic', doctorNames: { synthetic: 'แพทย์ทดสอบคำ' },
        })
        const chunks = []
        for await (const chunk of doc) chunks.push(chunk)
        const task = getDocument({ data: new Uint8Array(Buffer.concat(chunks)) })
        try {
          const pdf = await task.promise
          assert.ok(pdf.numPages > 1, 'Exercise repeated table headers and page breaks')
          const actual = []
          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const content = await (await pdf.getPage(pageNumber)).getTextContent()
            const items = content.items.filter((item) => 'str' in item)
            const header = items.find((item) => item.str === 'Patient name')
            if (!header) continue
            const age = items.find((item) => item.str.startsWith('Age/'))
            const queue = items.find((item) => ['Qu', 'Queue'].includes(item.str))
            let name = null
            const flush = () => { if (name !== null) actual.push(canonical(name)); name = null }
            for (const item of items.slice(items.indexOf(queue) + 1)) {
              const x = item.transform[4]
              if (Math.abs(x - queue.transform[4]) < 1 && /^\d+$/.test(item.str.trim())) {
                flush(); name = ''; continue
              }
              if (item.str.startsWith('Page ') || x < queue.transform[4] - 1) { flush(); continue }
              if (name !== null && x >= header.transform[4] - 1 && x < age.transform[4] - 1) name += item.str
            }
            flush()
          }
          assert.deepEqual(actual.sort(), rows.map((row) => canonical(row.fullName)).sort())
        } finally { await task.destroy() }
      })
    }
  }
}
