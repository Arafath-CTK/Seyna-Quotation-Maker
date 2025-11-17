// src/pdf/QuotePdf.tsx
import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const letterheadPath = path.resolve('./public/letterheads/ChalilCoLetterHead.svg');
const letterheadSvg = fs.readFileSync(letterheadPath, 'utf8');

const svgBuffer = Buffer.from(letterheadSvg);
const pngBuffer = await sharp(svgBuffer).png().toBuffer();
const letterheadBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;

const A4 = { width: 595.28, height: 841.89 };

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 32,
    fontSize: 10,
    color: '#111',
  },
  bgLetterhead: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: A4.width,
    height: A4.height,
  },
  header: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleBlock: { flexGrow: 1 },
  title: { fontSize: 20, fontWeight: 700 },
  meta: { marginTop: 4, color: '#555' },
  letterhead: {
    width: 120,
    height: 40,
    objectFit: 'contain',
    marginLeft: 16,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  col: { flex: 1 },
  label: { color: '#666', marginBottom: 4, fontSize: 9 },
  box: {
    padding: 8,
    border: '1px solid #E5E7EB',
    borderRadius: 4,
    minHeight: 40,
    color: '#0f172a',
  },
  table: {
    width: '100%',
    border: '1px solid #E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  thead: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
  },
  th: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontWeight: 700,
    fontSize: 10,
  },
  tr: {
    flexDirection: 'row',
    borderBottom: '1px solid #F3F4F6',
  },
  td: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 10,
  },
  right: { textAlign: 'right' },
  totals: {
    marginTop: 10,
    marginLeft: 'auto',
    width: 280,
    borderTop: '1px solid #E5E7EB',
    paddingTop: 8,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  grand: {
    marginTop: 6,
    borderTop: '1px solid #E5E7EB',
    paddingTop: 6,
    fontSize: 12,
    fontWeight: 700,
  },
  footer: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 24,
    fontSize: 9,
    color: '#666',
    borderTop: '1px solid #E5E7EB',
    paddingTop: 6,
  },

  /* watermark - tuned to stay centered and not wrap */
  watermarkWrap: {
    position: 'absolute',
    top: A4.height / 2 - 40,
    left: -220,
    width: A4.width + 440,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'rotate(-45deg)',
  },

  watermarkLine: {
    fontSize: 72,
    fontWeight: 700,
    color: '#0b1220',
    opacity: 0.08,
    textAlign: 'center',
    letterSpacing: 2,
  },

  watermarkLineSmall: {
    fontSize: 28,
    fontWeight: 600,
    color: '#0b1220',
    opacity: 0.1,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 3,
  },
});

type QuotePdfProps = {
  quote: any;
  isDraft: boolean;
};

const currency = (v: number, ccy: string) => `${ccy} ${Number(v || 0).toFixed(3)}`;

const QuotePdf: React.FC<QuotePdfProps> = ({ quote, isDraft }) => {
  const company = quote.companySnapshot || {};
  const customer = quote.customerSnapshot || quote.customer || {};
  const items = quote.items || [];
  const totals = quote.totals || {
    subtotal: 0,
    discountAmount: 0,
    taxableBase: 0,
    vatAmount: 0,
    grandTotal: 0,
  };

  const ccy = company.currency || quote.currency || 'BHD';
  const vatPercent = Math.round((company.vatRate || quote.vatRate || 0) * 100 * 1000) / 1000;

  const m = {
    top: quote?.settings?.letterhead?.margins?.top ?? 120,
    right: quote?.settings?.letterhead?.margins?.right ?? 32,
    bottom: quote?.settings?.letterhead?.margins?.bottom ?? 100,
    left: quote?.settings?.letterhead?.margins?.left ?? 32,
  };

  return (
    <Document>
      <Page
        size="A4"
        style={[
          styles.page,
          {
            paddingTop: m.top,
            paddingRight: m.right,
            paddingBottom: m.bottom,
            paddingLeft: m.left,
          },
        ]}
        wrap
      >
        <Image src={letterheadBase64} style={styles.bgLetterhead} fixed />

        <View style={styles.header} fixed>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Quotation</Text>
            <Text style={styles.meta}>
              {quote.quoteNumber ? `# ${quote.quoteNumber}` : ''}
              {quote.issueDate ? ` • ${new Date(quote.issueDate).toLocaleDateString()}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.label}>Bill To</Text>
            <View style={styles.box}>
              <Text>{customer.name || '-'}</Text>
              {customer.vatNo ? <Text>VAT: {customer.vatNo}</Text> : null}
              {(customer.addressLines || []).map((l: string, i: number) => (
                <Text key={i}>{l}</Text>
              ))}
              {customer.email ? <Text>{customer.email}</Text> : null}
              {customer.phone ? <Text>{customer.phone}</Text> : null}
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { flex: 5 }]}>Product / Service</Text>
            <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>Unit Price</Text>
            <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>Qty</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Unit</Text>
            <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>Line Total</Text>
          </View>

          <View wrap>
            {items.map((it: any, idx: number) => {
              const line = (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0);
              return (
                <View key={idx} style={styles.tr}>
                  <Text style={[styles.td, { flex: 5 }]}>
                    {it.productName || '-'}
                    {it.description ? ` — ${it.description}` : ''}
                    {it.isTaxable === false ? ' (Non-taxable)' : ''}
                  </Text>
                  <Text style={[styles.td, { flex: 2 }, styles.right]}>
                    {currency(it.unitPrice, ccy)}
                  </Text>
                  <Text style={[styles.td, { flex: 2 }, styles.right]}>
                    {Number(it.quantity || 0)}
                  </Text>
                  <Text style={[styles.td, { flex: 1 }, styles.right]}>{it.unitLabel || ''}</Text>
                  <Text style={[styles.td, { flex: 2 }, styles.right]}>{currency(line, ccy)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{currency(totals.subtotal, ccy)}</Text>
          </View>
          {totals.discountAmount > 0 ? (
            <View style={styles.totalsRow}>
              <Text>Discount</Text>
              <Text>- {currency(totals.discountAmount, ccy)}</Text>
            </View>
          ) : null}

          <View style={styles.totalsRow}>
            <Text>Taxable Base</Text>
            <Text>{currency(totals.taxableBase, ccy)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>VAT ({vatPercent}%)</Text>
            <Text>{currency(totals.vatAmount, ccy)}</Text>
          </View>

          <View style={styles.grand}>
            <View style={styles.totalsRow}>
              <Text>Grand Total</Text>
              <Text>{currency(totals.grandTotal, ccy)}</Text>
            </View>
          </View>
        </View>

        {quote.notes ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Notes</Text>
            <Text>{quote.notes}</Text>
          </View>
        ) : null}

        {company.footerText ? (
          <View style={styles.footer} fixed>
            <Text>{company.footerText}</Text>
          </View>
        ) : null}

        {/* WATERMARK - rendered last so it appears on top of everything */}
        {isDraft && (
          <View style={styles.watermarkWrap} fixed>
            <Text style={styles.watermarkLine}>DRAFT PREVIEW</Text>
            <Text style={styles.watermarkLineSmall}>— DO NOT USE —</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default QuotePdf;
