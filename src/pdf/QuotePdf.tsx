import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { QuoteDoc } from '@/lib/quote-schemas';

const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(3) : '0.000');

export default function QuotePdf({ quote }: { quote: QuoteDoc }) {
  const company = quote.companySnapshot || {
    companyName: '',
    vatNo: '',
    address: [],
    footerText: '',
    currency: quote.currency,
    vatRate: quote.vatRate,
    letterheadUrl: '',
    margins: { top: 24, right: 24, bottom: 24, left: 24 },
  };
  const customer = quote.customerSnapshot || quote.customer;

  const pad = company.margins || { top: 24, right: 24, bottom: 24, left: 24 };

  const styles = StyleSheet.create({
    page: {
      fontSize: 11,
      paddingTop: pad.top,
      paddingRight: pad.right,
      paddingBottom: pad.bottom,
      paddingLeft: pad.left,
      fontFamily: 'Helvetica',
    },
    letterhead: { width: '100%', marginBottom: 12 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    title: { fontSize: 18, fontWeight: 700 },
    small: { fontSize: 10, color: '#555' },
    box: { border: '1 solid #ddd', padding: 8, borderRadius: 4 },
    section: { marginBottom: 10 },
    label: { fontSize: 9, color: '#666', marginBottom: 2 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#f2f2f2', border: '1 solid #ddd' },
    tableRow: {
      flexDirection: 'row',
      borderLeft: '1 solid #ddd',
      borderRight: '1 solid #ddd',
      borderBottom: '1 solid #eee',
    },
    th: { padding: 6, fontSize: 10, fontWeight: 700, borderRight: '1 solid #ddd' },
    td: { padding: 6, fontSize: 10, borderRight: '1 solid #eee' },
    colName: { flex: 5 },
    colQty: { flex: 1, textAlign: 'right' as const },
    colUnit: { flex: 1.2, textAlign: 'center' as const },
    colPrice: { flex: 2, textAlign: 'right' as const },
    colTotal: { flex: 2, textAlign: 'right' as const },
    totalsBox: {
      marginTop: 8,
      alignSelf: 'flex-end',
      width: 260,
      border: '1 solid #ddd',
      borderRadius: 4,
    },
    totalsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 6,
      borderBottom: '1 solid #eee',
    },
    totalsStrong: { fontWeight: 700 },
    notes: { fontSize: 10, marginTop: 10 },
    footer: {
      position: 'absolute',
      left: pad.left,
      right: pad.right,
      bottom: 10,
      fontSize: 9,
      color: '#666',
      borderTop: '1 solid #eee',
      paddingTop: 6,
    },
  });

  const number = quote.quoteNumber ? `#${quote.quoteNumber}` : '';
  const issue = quote.issueDate ? new Date(quote.issueDate).toLocaleDateString() : '';
  const cur = quote.currency || company.currency || 'BHD';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Letterhead image */}
        {company.letterheadUrl ? (
          <Image src={company.letterheadUrl} style={styles.letterhead} />
        ) : null}

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Quotation {number}</Text>
            {issue ? <Text style={styles.small}>Date: {issue}</Text> : null}
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: 700 }}>{company.companyName}</Text>
            {company.vatNo ? <Text style={styles.small}>VAT No: {company.vatNo}</Text> : null}
            {company.address?.map((l, i) => (
              <Text key={i} style={styles.small}>
                {l}
              </Text>
            ))}
          </View>
        </View>

        {/* Parties */}
        <View style={[styles.section, { flexDirection: 'row', gap: 8 }]}>
          <View style={[styles.box, { flex: 1 }]}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={{ fontWeight: 700 }}>{customer?.name || ''}</Text>
            {customer?.vatNo ? <Text style={styles.small}>VAT No: {customer.vatNo}</Text> : null}
            {customer?.addressLines?.map((l, i) => (
              <Text key={i} style={styles.small}>
                {l}
              </Text>
            ))}
            {customer?.contactName ? (
              <Text style={styles.small}>Attn: {customer.contactName}</Text>
            ) : null}
            {customer?.email ? <Text style={styles.small}>{customer.email}</Text> : null}
            {customer?.phone ? <Text style={styles.small}>{customer.phone}</Text> : null}
          </View>
          <View style={[styles.box, { width: 180 }]}>
            <Text style={styles.label}>Summary</Text>
            <Text style={styles.small}>Currency: {cur}</Text>
            <Text style={styles.small}>VAT: {(quote.vatRate ?? company.vatRate ?? 0) * 100}%</Text>
            {quote.status === 'finalized' && quote.totals ? (
              <Text style={[styles.small, { fontWeight: 700 }]}>
                Total: {cur} {fmt(quote.totals.grandTotal)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colName]}>Product</Text>
          <Text style={[styles.th, styles.colQty]}>Qty</Text>
          <Text style={[styles.th, styles.colUnit]}>Unit</Text>
          <Text style={[styles.th, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.th, styles.colTotal]}>Line Total</Text>
        </View>

        {(quote.items || []).map((it, idx) => {
          const line = (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0);
          return (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.td, styles.colName]}>
                {it.productName}
                {it.description ? ` — ${it.description}` : ''}
              </Text>
              <Text style={[styles.td, styles.colQty]}>{fmt(Number(it.quantity) || 0)}</Text>
              <Text style={[styles.td, styles.colUnit]}>{it.unitLabel || 'pcs'}</Text>
              <Text style={[styles.td, styles.colPrice]}>
                {cur} {fmt(Number(it.unitPrice) || 0)}
              </Text>
              <Text style={[styles.td, styles.colTotal]}>
                {cur} {fmt(line)}
              </Text>
            </View>
          );
        })}

        {/* Totals */}
        {quote.totals && (
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text>Subtotal</Text>
              <Text>
                {cur} {fmt(quote.totals.subtotal)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text>Discount</Text>
              <Text>
                - {cur} {fmt(quote.totals.discountAmount)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text>Taxable Base</Text>
              <Text>
                {cur} {fmt(quote.totals.taxableBase)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text>VAT</Text>
              <Text>
                {cur} {fmt(quote.totals.vatAmount)}
              </Text>
            </View>
            <View style={[styles.totalsRow, { borderBottom: '0 solid transparent' }]}>
              <Text style={styles.totalsStrong}>Grand Total</Text>
              <Text style={styles.totalsStrong}>
                {cur} {fmt(quote.totals.grandTotal)}
              </Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {quote.notes ? <Text style={styles.notes}>Notes: {quote.notes}</Text> : null}

        {/* Footer */}
        {company.footerText ? <Text style={styles.footer}>{company.footerText}</Text> : null}
      </Page>
    </Document>
  );
}
