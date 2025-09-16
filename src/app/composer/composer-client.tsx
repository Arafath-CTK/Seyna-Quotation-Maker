'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Formik, Form, Field, FieldArray, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { computeTotals } from '@/lib/totals';

type QuoteItem = {
  productId?: string;
  productName: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  unitLabel: string;
  isTaxable: boolean;
};

type Customer = {
  name: string;
  vatNo?: string;
  addressLines: string[];
  contactName?: string;
  phone?: string;
  email?: string;
};

type Draft = {
  _id?: string;
  status?: 'draft' | 'finalized';
  currency: string;
  vatRate: number; // decimal on server, % in UI
  discount: { type: 'none' | 'percent' | 'amount'; value: number };
  customer: Customer;
  items: QuoteItem[];
  notes?: string;
};

const DraftYup = Yup.object({
  customer: Yup.object({
    name: Yup.string().required('Customer name is required'),
    vatNo: Yup.string().nullable(),
    addressText: Yup.string().nullable(),
    contactName: Yup.string().nullable(),
    phone: Yup.string().nullable(),
    email: Yup.string().email('Invalid email').nullable(),
  }),
  items: Yup.array().of(
    Yup.object({
      productName: Yup.string().required('Product name is required'),
      unitPrice: Yup.number().min(0).required('Unit price required'),
      quantity: Yup.number().min(0).required('Quantity required'),
      unitLabel: Yup.string().required('Unit required'),
      isTaxable: Yup.boolean().required(),
    }),
  ),
  discount: Yup.object({
    type: Yup.mixed<'none' | 'percent' | 'amount'>()
      .oneOf(['none', 'percent', 'amount'])
      .required(),
    value: Yup.number().min(0).required(),
  }),
  vatPercent: Yup.number().min(0).max(100).required(),
  currency: Yup.string().required(),
  notes: Yup.string().nullable(),
});

function toInitialValues(db?: any) {
  // Default currency & VAT: pull from settings on server in the future; for now safe defaults.
  const currency = db?.currency || 'BHD';
  const vatRate = typeof db?.vatRate === 'number' ? db.vatRate : 0.1;
  const items = (db?.items || []) as QuoteItem[];
  const cust = (db?.customer || {}) as Partial<Customer>;
  return {
    currency,
    vatPercent: Math.round(vatRate * 100 * 1000) / 1000,
    discount: db?.discount || { type: 'none', value: 0 },
    notes: db?.notes || '',
    customer: {
      name: cust.name || '',
      vatNo: cust.vatNo || '',
      addressText: (cust.addressLines || []).join('\n'),
      contactName: cust.contactName || '',
      phone: cust.phone || '',
      email: cust.email || '',
    },
    items: items.length
      ? items
      : [
          {
            productName: '',
            description: '',
            unitPrice: 0,
            quantity: 1,
            unitLabel: 'pcs',
            isTaxable: true,
          },
        ],
  };
}

function valuesToPayload(values: any): Draft {
  return {
    currency: values.currency,
    vatRate: Number(values.vatPercent) / 100,
    discount: { ...values.discount, value: Number(values.discount.value) || 0 },
    notes: values.notes || '',
    customer: {
      name: values.customer.name,
      vatNo: values.customer.vatNo || '',
      addressLines: (values.customer.addressText || '')
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean),
      contactName: values.customer.contactName || '',
      phone: values.customer.phone || '',
      email: values.customer.email || '',
    },
    items: (values.items || []).map((it: any) => ({
      productId: it.productId || undefined,
      productName: it.productName,
      description: it.description || '',
      unitPrice: Number(it.unitPrice) || 0,
      quantity: Number(it.quantity) || 0,
      unitLabel: it.unitLabel || 'pcs',
      isTaxable: !!it.isTaxable,
    })),
  };
}

type ProductDoc = {
  _id: string;
  name: string;
  sku?: string;
  defaultPrice: number;
  unitLabel: string;
  isTaxable: boolean;
};

export default function ComposerClient({ initialId }: { initialId?: string }) {
  const [draftId, setDraftId] = useState<string | undefined>(initialId);
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState<any>(toInitialValues());
  const [activeTab, setActiveTab] = useState<'customer' | 'items'>('customer');
  const [finalized, setFinalized] = useState<{ number?: string; totals?: any } | null>(null);

  const totals = useMemo(() => {
    return computeTotals({
      items: (initial.items || []) as any,
      discount: initial.discount,
      vatRate: Number(initial.vatPercent) / 100,
    });
  }, [initial.items, initial.discount, initial.vatPercent]);

  // Create a draft when landing without id
  useEffect(() => {
    const create = async () => {
      if (draftId) return;
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currency: 'BHD',
          vatRate: 0.1,
          discount: { type: 'none', value: 0 },
          notes: '',
          customer: { name: '', vatNo: '', addressLines: [] },
          items: [],
        }),
      });
      const data = await res.json();
      if (data?.id) setDraftId(data.id);
    };
    create();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load an existing draft if initialId present
  useEffect(() => {
    const load = async () => {
      if (!draftId || !initialId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/quotes/${draftId}`);
        if (res.ok) {
          const doc = await res.json();
          setInitial(toInitialValues(doc));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [draftId, initialId]);

  // Product search helper
  const searchProducts = useCallback(async (q: string): Promise<ProductDoc[]> => {
    const params = new URLSearchParams();
    params.set('limit', '20');
    if (q) params.set('search', q);
    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();
    return (data?.items || []) as ProductDoc[];
  }, []);

  const saveDraft = async () => {
    if (!draftId) return;
    const payload = valuesToPayload(initial);
    const res = await fetch(`/api/quotes/${draftId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d?.error || 'Save failed');
    }
  };

  const finalize = async () => {
    if (!draftId) return;
    await saveDraft();
    const res = await fetch(`/api/quotes/${draftId}/finalize`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setFinalized({ number: data.quoteNumber, totals: data.totals });
    } else {
      throw new Error(data?.error || 'Finalize failed');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-card border-border/50 rounded-2xl border p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('customer')}
              className={`relative rounded-xl px-6 py-3 font-medium transition-all duration-300 ${
                activeTab === 'customer'
                  ? 'from-accent to-accent/90 text-accent-foreground shadow-accent/25 bg-gradient-to-r shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Customer Details
              </div>
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`relative rounded-xl px-6 py-3 font-medium transition-all duration-300 ${
                activeTab === 'items'
                  ? 'from-accent to-accent/90 text-accent-foreground shadow-accent/25 bg-gradient-to-r shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Items & Pricing
              </div>
            </button>
          </div>

          <div className="bg-muted/50 border-border/50 flex items-center gap-2 rounded-xl border px-4 py-2">
            <div className="bg-success h-2 w-2 animate-pulse rounded-full"></div>
            <span className="text-muted-foreground text-sm font-medium">
              {draftId ? `Draft: ${draftId.slice(-8)}` : 'Creating draft...'}
            </span>
          </div>
        </div>

        <Formik
          enableReinitialize
          initialValues={initial}
          validationSchema={DraftYup}
          onSubmit={() => {}}
        >
          {({ values, setFieldValue, isSubmitting }) => {
            return (
              <Form className="space-y-8">
                {/* CUSTOMER TAB */}
                {activeTab === 'customer' && (
                  <div className="space-y-6">
                    <div className="from-card to-muted/20 border-border/50 rounded-2xl border bg-gradient-to-br p-8 shadow-sm">
                      <div className="mb-6 flex items-center gap-3">
                        <div className="from-accent/20 to-accent/10 rounded-lg bg-gradient-to-br p-2">
                          <svg
                            className="text-accent h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-foreground text-xl font-semibold">
                            Customer Information
                          </h2>
                          <p className="text-muted-foreground text-sm">
                            Enter your client's contact and billing details
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-foreground flex items-center gap-2 text-sm font-semibold">
                            <span className="text-destructive">*</span>
                            Company/Client Name
                          </label>
                          <Field
                            name="customer.name"
                            className="bg-input border-border focus:ring-ring placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                            placeholder="Enter company or client name"
                          />
                          <ErrorMessage
                            name="customer.name"
                            component="p"
                            className="text-destructive mt-1 flex items-center gap-1 text-xs"
                          >
                            {(msg) => (
                              <>
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {msg}
                              </>
                            )}
                          </ErrorMessage>
                        </div>

                        <div className="space-y-2">
                          <label className="text-foreground text-sm font-semibold">
                            VAT Registration Number
                          </label>
                          <Field
                            name="customer.vatNo"
                            className="bg-input border-border focus:ring-ring placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                            placeholder="VAT number (optional)"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-foreground text-sm font-semibold">
                            Contact Person
                          </label>
                          <Field
                            name="customer.contactName"
                            className="bg-input border-border focus:ring-ring placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                            placeholder="Primary contact name"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-foreground text-sm font-semibold">
                            Phone Number
                          </label>
                          <Field
                            name="customer.phone"
                            className="bg-input border-border focus:ring-ring placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className="text-foreground text-sm font-semibold">
                            Email Address
                          </label>
                          <Field
                            name="customer.email"
                            type="email"
                            className="bg-input border-border focus:ring-ring placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                            placeholder="client@company.com"
                          />
                          <ErrorMessage
                            name="customer.email"
                            component="p"
                            className="text-destructive mt-1 flex items-center gap-1 text-xs"
                          >
                            {(msg) => (
                              <>
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {msg}
                              </>
                            )}
                          </ErrorMessage>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className="text-foreground text-sm font-semibold">
                            Billing Address
                          </label>
                          <Field
                            as="textarea"
                            rows={4}
                            name="customer.addressText"
                            className="bg-input border-border focus:ring-ring placeholder:text-muted-foreground w-full resize-none rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                            placeholder="Enter billing address (one line per field)&#10;123 Business Street&#10;Suite 100&#10;City, State 12345&#10;Country"
                          />
                          <p className="text-muted-foreground text-xs">
                            Enter each line of the address on a separate line
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ITEMS TAB */}
                {activeTab === 'items' && (
                  <div className="space-y-6">
                    <div className="from-card to-muted/20 border-border/50 rounded-2xl border bg-gradient-to-br p-8 shadow-sm">
                      <div className="mb-6 flex items-center gap-3">
                        <div className="from-accent/20 to-accent/10 rounded-lg bg-gradient-to-br p-2">
                          <svg
                            className="text-accent h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-foreground text-xl font-semibold">Quote Items</h2>
                          <p className="text-muted-foreground text-sm">
                            Add products and services to your quote
                          </p>
                        </div>
                      </div>

                      <FieldArray name="items">
                        {(helpers) => (
                          <div className="space-y-4">
                            {(values.items as QuoteItem[]).map((it, idx) => (
                              <div
                                key={idx}
                                className="bg-muted/30 border-border/30 rounded-xl border p-6"
                              >
                                <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
                                  <div className="space-y-2 lg:col-span-4">
                                    <label className="text-foreground flex items-center gap-2 text-sm font-semibold">
                                      <span className="text-destructive">*</span>
                                      Product/Service
                                    </label>
                                    <Field
                                      name={`items.${idx}.productName`}
                                      className="bg-input border-border focus:ring-ring placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                                      placeholder="Enter product or service name"
                                    />
                                    <ProductQuickPick
                                      onPick={async (p) => {
                                        setFieldValue(`items.${idx}.productId`, p._id);
                                        setFieldValue(`items.${idx}.productName`, p.name);
                                        setFieldValue(`items.${idx}.unitPrice`, p.defaultPrice);
                                        setFieldValue(
                                          `items.${idx}.unitLabel`,
                                          p.unitLabel || 'pcs',
                                        );
                                        setFieldValue(`items.${idx}.isTaxable`, !!p.isTaxable);
                                      }}
                                      searchProducts={searchProducts}
                                    />
                                    <ErrorMessage
                                      name={`items.${idx}.productName`}
                                      component="p"
                                      className="text-destructive flex items-center gap-1 text-xs"
                                    >
                                      {(msg) => (
                                        <>
                                          <svg
                                            className="h-3 w-3"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                          {msg}
                                        </>
                                      )}
                                    </ErrorMessage>
                                  </div>

                                  <div className="space-y-2 lg:col-span-2">
                                    <label className="text-foreground text-sm font-semibold">
                                      Unit Price
                                    </label>
                                    <Field
                                      type="number"
                                      step="0.001"
                                      name={`items.${idx}.unitPrice`}
                                      className="bg-input border-border focus:ring-ring w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                                    />
                                  </div>

                                  <div className="space-y-2 lg:col-span-2">
                                    <label className="text-foreground text-sm font-semibold">
                                      Quantity
                                    </label>
                                    <Field
                                      type="number"
                                      step="0.001"
                                      name={`items.${idx}.quantity`}
                                      className="bg-input border-border focus:ring-ring w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                                    />
                                  </div>

                                  <div className="space-y-2 lg:col-span-2">
                                    <label className="text-foreground text-sm font-semibold">
                                      Unit
                                    </label>
                                    <Field
                                      name={`items.${idx}.unitLabel`}
                                      className="bg-input border-border focus:ring-ring w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                                      placeholder="pcs, hrs, etc."
                                    />
                                  </div>

                                  <div className="flex items-center justify-center gap-2 pt-6 lg:col-span-1">
                                    <Field
                                      type="checkbox"
                                      name={`items.${idx}.isTaxable`}
                                      className="text-accent bg-input border-border focus:ring-ring h-4 w-4 rounded focus:ring-2"
                                    />
                                    <span className="text-foreground text-sm font-medium">
                                      Taxable
                                    </span>
                                  </div>

                                  <div className="pt-6 lg:col-span-1">
                                    <button
                                      type="button"
                                      onClick={() => helpers.remove(idx)}
                                      className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 w-full rounded-xl border px-4 py-3 font-medium transition-all duration-200"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() =>
                                helpers.push({
                                  productName: '',
                                  description: '',
                                  unitPrice: 0,
                                  quantity: 1,
                                  unitLabel: 'pcs',
                                  isTaxable: true,
                                })
                              }
                              className="from-accent/10 to-accent/5 text-accent border-accent/20 hover:from-accent/20 hover:to-accent/10 flex w-full items-center justify-center gap-2 rounded-xl border bg-gradient-to-r px-6 py-4 font-medium transition-all duration-200"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6m0 6h6m-6 0H6"
                                />
                              </svg>
                              Add Line Item
                            </button>
                          </div>
                        )}
                      </FieldArray>
                    </div>

                    <div className="from-card to-muted/20 border-border/50 rounded-2xl border bg-gradient-to-br p-8 shadow-sm">
                      <div className="mb-6 flex items-center gap-3">
                        <div className="from-success/20 to-success/10 rounded-lg bg-gradient-to-br p-2">
                          <svg
                            className="text-success h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-foreground text-xl font-semibold">
                            Quote Configuration
                          </h2>
                          <p className="text-muted-foreground text-sm">
                            Set currency, tax rates, and discounts
                          </p>
                        </div>
                      </div>

                      <div className="mb-8 grid gap-6 md:grid-cols-4">
                        <div className="space-y-2">
                          <label className="text-foreground text-sm font-semibold">Currency</label>
                          <Field
                            as="select"
                            name="currency"
                            className="bg-input border-border focus:ring-ring w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                          >
                            {['BHD', 'USD', 'EUR', 'INR', 'AED'].map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </Field>
                        </div>

                        <div className="space-y-2">
                          <label className="text-foreground text-sm font-semibold">
                            VAT Rate (%)
                          </label>
                          <Field
                            type="number"
                            step="0.001"
                            min="0"
                            name="vatPercent"
                            className="bg-input border-border focus:ring-ring w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-foreground text-sm font-semibold">
                            Discount Type
                          </label>
                          <Field
                            as="select"
                            name="discount.type"
                            className="bg-input border-border focus:ring-ring w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                          >
                            <option value="none">No Discount</option>
                            <option value="percent">Percentage</option>
                            <option value="amount">Fixed Amount</option>
                          </Field>
                        </div>

                        <div className="space-y-2">
                          <label className="text-foreground text-sm font-semibold">
                            Discount Value
                          </label>
                          <Field
                            type="number"
                            step="0.001"
                            min="0"
                            name="discount.value"
                            className="bg-input border-border focus:ring-ring w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                          />
                        </div>
                      </div>

                      <div className="from-muted/50 to-muted/30 border-border/30 rounded-xl border bg-gradient-to-br p-6">
                        <h3 className="text-foreground mb-4 text-lg font-semibold">
                          Quote Summary
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-2">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="text-foreground font-medium">
                              {values.currency} {totals.subtotal.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="text-destructive font-medium">
                              - {values.currency} {totals.discountAmount.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-muted-foreground">Taxable Base</span>
                            <span className="text-foreground font-medium">
                              {values.currency} {totals.taxableBase.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-muted-foreground">
                              VAT ({values.vatPercent}%)
                            </span>
                            <span className="text-foreground font-medium">
                              {values.currency} {totals.vatAmount.toFixed(3)}
                            </span>
                          </div>
                          <div className="border-border/50 mt-3 border-t pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-foreground text-lg font-semibold">
                                Grand Total
                              </span>
                              <span className="from-success to-success/80 bg-gradient-to-r bg-clip-text text-2xl font-bold text-transparent">
                                {values.currency} {totals.grandTotal.toFixed(3)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="from-card to-muted/20 border-border/50 rounded-2xl border bg-gradient-to-br p-8 shadow-sm">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="from-accent/20 to-accent/10 rounded-lg bg-gradient-to-br p-2">
                          <svg
                            className="text-accent h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v9a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </div>
                        <div>
                          <label className="text-foreground text-lg font-semibold">
                            Additional Notes
                          </label>
                          <p className="text-muted-foreground text-sm">
                            Add terms, conditions, or special instructions
                          </p>
                        </div>
                      </div>
                      <Field
                        as="textarea"
                        rows={4}
                        name="notes"
                        className="bg-input border-border focus:ring-ring placeholder:text-muted-foreground w-full resize-none rounded-xl border px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                        placeholder="Enter any additional notes, terms, or conditions for this quote..."
                      />
                    </div>
                  </div>
                )}

                <div className="from-background/95 to-background/90 border-border/50 sticky bottom-0 rounded-t-2xl border-t bg-gradient-to-r p-6 backdrop-blur-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={saveDraft}
                        disabled={!draftId || isSubmitting}
                        className="from-accent to-accent/90 text-accent-foreground shadow-accent/25 hover:shadow-accent/40 flex items-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3 font-medium shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        Save Draft
                      </button>

                      <button
                        type="button"
                        onClick={finalize}
                        disabled={!draftId || isSubmitting}
                        className="from-success to-success/90 text-success-foreground shadow-success/25 hover:shadow-success/40 flex items-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3 font-medium shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Finalize Quote
                      </button>
                    </div>

                    {finalized && (
                      <div className="bg-success/10 text-success border-success/20 flex items-center gap-2 rounded-xl border px-4 py-2">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="font-medium">
                          Quote finalized as <strong>{finalized.number}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Form>
            );
          }}
        </Formik>
      </div>
    </div>
  );
}

function ProductQuickPick({
  onPick,
  searchProducts,
}: {
  onPick: (p: ProductDoc) => void;
  searchProducts: (q: string) => Promise<ProductDoc[]>;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState<ProductDoc[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await searchProducts(q);
      setRes(r);
    }, 250);
    return () => clearTimeout(t);
  }, [q, searchProducts]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-accent hover:text-accent/80 flex items-center gap-1 text-xs underline underline-offset-2 transition-colors duration-200"
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        Browse Products
      </button>

      {open && (
        <div className="bg-popover border-border absolute z-50 mt-2 w-96 rounded-xl border p-4 shadow-2xl">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="bg-input border-border focus:ring-ring mb-3 w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:border-transparent focus:ring-2"
          />
          <div className="max-h-64 space-y-1 overflow-auto">
            {res.map((p) => (
              <div
                key={p._id}
                className="hover:bg-muted/50 cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors duration-200"
                onClick={() => {
                  onPick(p);
                  setOpen(false);
                }}
              >
                <div className="text-foreground font-medium">{p.name}</div>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span>{p.unitLabel}</span>
                  <span>•</span>
                  <span>{p.defaultPrice.toFixed(3)}</span>
                  <span>•</span>
                  <span className={p.isTaxable ? 'text-success' : 'text-muted-foreground'}>
                    {p.isTaxable ? 'Taxable' : 'No tax'}
                  </span>
                </div>
              </div>
            ))}
            {res.length === 0 && (
              <div className="text-muted-foreground p-4 text-center text-sm">No products found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
