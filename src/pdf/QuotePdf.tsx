import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 32,
    fontSize: 10,
    color: '#111',
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
});

type QuotePdfProps = {
  quote: any;
};

const currency = (v: number, ccy: string) => `${ccy} ${Number(v || 0).toFixed(3)}`;

const QuotePdf: React.FC<QuotePdfProps> = ({ quote }) => {
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

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Quotation</Text>
            <Text style={styles.meta}>
              {quote.quoteNumber ? `# ${quote.quoteNumber} ` : ''}
              {quote.issueDate ? `• ${new Date(quote.issueDate).toLocaleDateString()}` : ''}
            </Text>
          </View>
          {company.letterheadUrl ? (
            <Image src={company.letterheadUrl} style={styles.letterhead} />
          ) : null}
        </View>

        {/* Parties */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.label}>From</Text>
            <View style={styles.box}>
              <Text>{company.companyName || 'Company'}</Text>
              {company.vatNo ? <Text>VAT: {company.vatNo}</Text> : null}
              {(company.address || []).map((l: string, i: number) => (
                <Text key={i}>{l}</Text>
              ))}
            </View>
          </View>
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

        {/* Items Table */}
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

        {/* Totals */}
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

        {/* Notes */}
        {quote.notes ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Notes</Text>
            <Text>{quote.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        {company.footerText ? (
          <View style={styles.footer} fixed>
            <Text>{company.footerText}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
};

export default QuotePdf;
