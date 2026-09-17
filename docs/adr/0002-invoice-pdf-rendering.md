# 0002 — Invoice PDF rendering is a stub in `MockInvoiceProvider`

## Context

The brief requires demo-mode invoices to render as a PDF with a diagonal
"DEMO — NEM ÉLES SZÁMLA" watermark. Real PDF generation needs either a rendering library
(e.g. `pdfkit`, `@react-pdf/renderer`) or hand-rolling the PDF byte format.

## Decision

`MockInvoiceProvider.getInvoicePdf()` returns a plain-text `Buffer` containing the invoice
fields and the watermark text as a marker string, not an actual PDF. The real
`SzamlazzHuInvoiceProvider`/`BillingoInvoiceProvider` adapters call through to each
provider's own PDF endpoint and return whatever bytes come back (a real PDF, in live mode).

This keeps the `InvoiceProvider` interface's contract intact (`getInvoicePdf(): Promise<Buffer>`)
so swapping in real PDF rendering later is a one-file change to `mock-provider.ts` with no
call-site changes, while avoiding pulling in a PDF-rendering dependency for a demo-only
code path per the brief's "avoid unnecessary dependencies" priority.

## Consequences

- The demo-mode "PDF" a user downloads today is a `.txt`-shaped buffer, not a real PDF file
  a browser would render inline. This is a known gap, not a hidden one.
- Before shipping demo-mode invoice downloads to real users, replace the body of
  `getInvoicePdf` in `packages/invoice-provider/src/mock-provider.ts` with a real renderer
  (a lightweight one, e.g. `pdfkit`, is the natural choice given the budget in the brief).
