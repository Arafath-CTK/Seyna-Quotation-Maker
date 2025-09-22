'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Formik, Form, Field, FieldArray, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Package,
  Calculator,
  FileText,
  Plus,
  Trash2,
  Save,
  Check,
  Eye,
  Building,
  Mail,
  Phone,
  MapPin,
  Hash,
  DollarSign,
  Percent,
} from 'lucide-react';

const computeTotals = ({ items, discount, vatRate }: any) => {
  const subtotal = items.reduce((sum: number, item: any) => {
    return sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
  }, 0);

  let discountAmount = 0;
  if (discount.type === 'percent') {
    discountAmount = subtotal * (Number(discount.value) / 100);
  } else if (discount.type === 'amount') {
    discountAmount = Number(discount.value);
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxableBase =
    items.reduce((sum: number, item: any) => {
      if (!item.isTaxable) return sum;
      const itemTotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
      return sum + itemTotal;
    }, 0) -
    discountAmount * (items.filter((i: any) => i.isTaxable).length / items.length || 0);

  const vatAmount = Math.max(0, taxableBase * vatRate);
  const grandTotal = afterDiscount + vatAmount;

  return {
    subtotal,
    discountAmount,
    taxableBase: Math.max(0, taxableBase),
    vatAmount,
    grandTotal: Math.max(0, grandTotal),
  };
};

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
  vatRate: number;
  discount: { type: 'none' | 'percent' | 'amount'; value: number };
  customer: Customer;
  items: QuoteItem[];
  notes?: string;
};

type ProductDoc = {
  _id: string;
  name: string;
  unitLabel: string;
  defaultPrice: number;
  isTaxable: boolean;
};

const DraftYup = Yup.object({
  customer: Yup.object({
    name: Yup.string().required('Customer name is required'),
    vatNo: Yup.string().nullable(),
    addressText: Yup.string().nullable(),
    contactName: Yup.string().nullable(),
    phone: Yup.string().nullable(),
    email: Yup.string().email('Please enter a valid email address').nullable(),
  }),
  items: Yup.array()
    .of(
      Yup.object({
        productName: Yup.string().required('Product name is required'),
        unitPrice: Yup.number().min(0, 'Price must be positive').required('Unit price is required'),
        quantity: Yup.number().min(0, 'Quantity must be positive').required('Quantity is required'),
        unitLabel: Yup.string().required('Unit is required'),
        isTaxable: Yup.boolean().required(),
      }),
    )
    .min(1, 'At least one item is required'),
  discount: Yup.object({
    type: Yup.mixed<'none' | 'percent' | 'amount'>()
      .oneOf(['none', 'percent', 'amount'])
      .required(),
    value: Yup.number().min(0, 'Discount value must be positive').required(),
  }),
  vatPercent: Yup.number()
    .min(0, 'VAT rate must be positive')
    .max(100, 'VAT rate cannot exceed 100%')
    .required(),
  currency: Yup.string().required('Currency is required'),
  notes: Yup.string().nullable(),
});

function toInitialValues(db?: any) {
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

export default function ComposerClient({ initialId }: { initialId?: string }) {
  const [draftId, setDraftId] = useState<string | undefined>(initialId);
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState<any>(toInitialValues());
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'items'>('customer');

  const totals = useMemo(() => {
    return computeTotals({
      items: (initial.items || []) as any,
      discount: initial.discount,
      vatRate: Number(initial.vatPercent) / 100,
    });
  }, [initial.items, initial.discount, initial.vatPercent]);

  const canPreview = useMemo(() => {
    const items = (initial.items || []) as QuoteItem[];
    const hasItem = items.some(
      (it) => it.productName && Number(it.quantity) > 0 && Number(it.unitPrice) >= 0,
    );
    const hasCustomer = !!initial?.customer?.name?.trim();
    return hasItem && hasCustomer;
  }, [initial]);

  const canFinalize = useMemo(() => {
    const items = (initial.items || []) as QuoteItem[];
    const validItems = items.filter(
      (it) => it.productName && Number(it.quantity) > 0 && Number(it.unitPrice) >= 0,
    );
    return validItems.length > 0 && !!initial?.customer?.name?.trim();
  }, [initial]);

  // Load existing draft
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

  const searchProducts = useCallback(async (q: string): Promise<ProductDoc[]> => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (q) params.set('search', q);
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      return (data?.items || []) as ProductDoc[];
    } catch (error) {
      console.error('Product search failed:', error);
      return [];
    }
  }, []);

  const saveDraft = async () => {
    setSaving(true);
    try {
      const payload = valuesToPayload(initial);

      if (!draftId) {
        const res = await fetch('/api/quotes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Create draft failed');
        setDraftId(data.id);
        return data.id as string;
      } else {
        const res = await fetch(`/api/quotes/${draftId}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d?.error || 'Save failed');
        }
        return draftId;
      }
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    if (!canFinalize) throw new Error('Please complete required fields before finalizing.');

    setFinalizing(true);
    try {
      const id = await saveDraft();
      const res = await fetch(`/api/quotes/${id}/finalize`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Finalize failed');

      window.open(`/api/quotes/${id}/pdf`, '_blank', 'noopener');
      window.location.href = '/quotations';
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground">Loading quote...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="bg-card border-border rounded-lg border p-1">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('customer')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-3 font-medium transition-all duration-200 ${
              activeTab === 'customer'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <User className="h-4 w-4" />
            Customer Details
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-3 font-medium transition-all duration-200 ${
              activeTab === 'items'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Package className="h-4 w-4" />
            Items & Pricing
          </button>
        </div>
      </div>

      <Formik
        enableReinitialize
        initialValues={initial}
        validationSchema={DraftYup}
        onSubmit={() => {}}
      >
        {({ values, setFieldValue, errors }) => (
          <Form className="space-y-6">
            <div className="tab-content">
              {activeTab === 'customer' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 rounded-lg p-2">
                        <User className="text-primary h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle>Customer Information</CardTitle>
                        <CardDescription>
                          Enter your client&#39;s contact and billing details
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <Building className="h-4 w-4" />
                          Company/Client Name *
                        </label>
                        <Field
                          name="customer.name"
                          className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                          placeholder="Enter company or client name"
                        />
                        <ErrorMessage
                          name="customer.name"
                          component="p"
                          className="text-destructive text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <Hash className="h-4 w-4" />
                          VAT Registration Number
                        </label>
                        <Field
                          name="customer.vatNo"
                          className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                          placeholder="VAT number (optional)"
                        />
                      </div>

                      {/* <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <User className="h-4 w-4" />
                          Contact Person
                        </label>
                        <Field
                          name="customer.contactName"
                          className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                          placeholder="Primary contact name"
                        />
                      </div> */}

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <Phone className="h-4 w-4" />
                          Phone Number
                        </label>
                        <Field
                          name="customer.phone"
                          className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <Mail className="h-4 w-4" />
                          Email Address
                        </label>
                        <Field
                          name="customer.email"
                          type="email"
                          className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                          placeholder="client@company.com"
                        />
                        <ErrorMessage
                          name="customer.email"
                          component="p"
                          className="text-destructive text-sm"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <MapPin className="h-4 w-4" />
                          Billing Address
                        </label>
                        <Field
                          as="textarea"
                          rows={4}
                          name="customer.addressText"
                          className="bg-input border-border focus:ring-ring w-full resize-none rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                          placeholder="Enter billing address (one line per field)&#10;123 Business Street&#10;Suite 100&#10;City, State 12345&#10;Country"
                        />
                        <p className="text-muted-foreground text-xs">
                          Enter each line of the address on a separate line
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'items' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-lg p-2">
                          <Package className="text-primary h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle>Quote Items</CardTitle>
                          <CardDescription>Add products and services to your quote</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <FieldArray name="items">
                        {(helpers) => (
                          <div className="space-y-4">
                            {(values.items as QuoteItem[]).map((item, idx) => (
                              <div
                                key={idx}
                                className="bg-muted/30 border-border rounded-lg border p-4"
                              >
                                <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
                                  <div className="space-y-2 lg:col-span-4">
                                    <label className="text-sm font-medium">Product/Service *</label>
                                    <Field name={`items.${idx}.productName`} type="hidden" />
                                    <ProductPicker
                                      value={(values.items[idx] as any).productName}
                                      fetchProducts={searchProducts}
                                      onPick={(p) => {
                                        setFieldValue(`items.${idx}.productId`, p._id);
                                        setFieldValue(`items.${idx}.productName`, p.name);
                                        setFieldValue(`items.${idx}.unitPrice`, p.defaultPrice);
                                        setFieldValue(
                                          `items.${idx}.unitLabel`,
                                          p.unitLabel || 'pcs',
                                        );
                                        setFieldValue(
                                          `items.${idx}.isTaxable`,
                                          p.isTaxable ?? true,
                                        );
                                      }}
                                      onCreate={async (name) => {
                                        const res = await fetch('/api/products', {
                                          method: 'POST',
                                          headers: { 'content-type': 'application/json' },
                                          body: JSON.stringify({
                                            name,
                                            unitLabel:
                                              (values.items[idx] as any).unitLabel || 'pcs',
                                            defaultPrice:
                                              Number((values.items[idx] as any).unitPrice) || 0,
                                          }),
                                        });
                                        if (!res.ok) {
                                          const data = await res.json().catch(() => ({}));
                                          throw new Error(data?.error || 'Create product failed');
                                        }
                                        const data = await res.json();
                                        return {
                                          _id: data.id,
                                          name,
                                          unitLabel: (values.items[idx] as any).unitLabel || 'pcs',
                                          defaultPrice:
                                            Number((values.items[idx] as any).unitPrice) || 0,
                                          isTaxable: true,
                                        } as ProductDoc;
                                      }}
                                    />
                                    <ErrorMessage
                                      name={`items.${idx}.productName`}
                                      component="p"
                                      className="text-destructive text-sm"
                                    />
                                  </div>

                                  <div className="space-y-2 lg:col-span-2">
                                    <label className="flex items-center gap-2 text-sm font-medium">
                                      <DollarSign className="h-4 w-4" />
                                      Unit Price
                                    </label>
                                    <Field
                                      type="number"
                                      step="0.001"
                                      name={`items.${idx}.unitPrice`}
                                      className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                                    />
                                  </div>

                                  <div className="space-y-2 lg:col-span-2">
                                    <label className="text-sm font-medium">Quantity</label>
                                    <Field
                                      type="number"
                                      step="0.001"
                                      name={`items.${idx}.quantity`}
                                      className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                                    />
                                  </div>

                                  <div className="space-y-2 lg:col-span-2">
                                    <label className="text-sm font-medium">Unit</label>
                                    <Field
                                      name={`items.${idx}.unitLabel`}
                                      className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                                      placeholder="pcs, hrs, etc."
                                    />
                                  </div>

                                  <div className="flex items-center justify-center gap-2 pt-6 lg:col-span-1">
                                    <Field
                                      type="checkbox"
                                      name={`items.${idx}.isTaxable`}
                                      className="text-primary bg-input border-border focus:ring-ring h-4 w-4 rounded focus:ring-2"
                                    />
                                    <span className="text-sm font-medium">Taxable</span>
                                  </div>

                                  <div className="pt-6 lg:col-span-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => helpers.remove(idx)}
                                      className="text-destructive border-destructive/20 hover:bg-destructive/10 w-full"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}

                            <Button
                              type="button"
                              variant="outline"
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
                              className="border-primary/50 text-primary hover:bg-primary/5 w-full border-dashed"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Line Item
                            </Button>
                          </div>
                        )}
                      </FieldArray>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-lg p-2">
                          <Calculator className="text-primary h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle>Quote Configuration</CardTitle>
                          <CardDescription>Set currency, tax rates, and discounts</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Currency</label>
                          <Field
                            as="select"
                            name="currency"
                            className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                          >
                            {['BHD', 'USD', 'EUR', 'INR', 'AED'].map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </Field>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <Percent className="h-4 w-4" />
                            VAT Rate (%)
                          </label>
                          <Field
                            type="number"
                            step="0.001"
                            min="0"
                            name="vatPercent"
                            className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Discount Type</label>
                          <Field
                            as="select"
                            name="discount.type"
                            className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                          >
                            <option value="none">No Discount</option>
                            <option value="percent">Percentage</option>
                            <option value="amount">Fixed Amount</option>
                          </Field>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Discount Value</label>
                          <Field
                            type="number"
                            step="0.001"
                            min="0"
                            name="discount.value"
                            className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                          />
                        </div>
                      </div>

                      <div className="bg-muted/50 border-border rounded-lg border p-6">
                        <h3 className="mb-4 text-lg font-semibold">Quote Summary</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-2">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium">
                              {values.currency} {totals.subtotal.toFixed(3)}
                            </span>
                          </div>
                          {totals.discountAmount > 0 && (
                            <div className="flex items-center justify-between py-2">
                              <span className="text-muted-foreground">Discount</span>
                              <span className="text-destructive font-medium">
                                - {values.currency} {totals.discountAmount.toFixed(3)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between py-2">
                            <span className="text-muted-foreground">Taxable Base</span>
                            <span className="font-medium">
                              {values.currency} {totals.taxableBase.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-muted-foreground">
                              VAT ({values.vatPercent}%)
                            </span>
                            <span className="font-medium">
                              {values.currency} {totals.vatAmount.toFixed(3)}
                            </span>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-lg font-semibold">Grand Total</span>
                            <span className="text-primary text-2xl font-bold">
                              {values.currency} {totals.grandTotal.toFixed(3)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-lg p-2">
                          <FileText className="text-primary h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle>Additional Notes</CardTitle>
                          <CardDescription>
                            Add terms, conditions, or special instructions
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Field
                        as="textarea"
                        rows={4}
                        name="notes"
                        className="bg-input border-border focus:ring-ring w-full resize-none rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                        placeholder="Enter any additional notes, terms, or conditions for this quote..."
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <div className="bg-background/95 border-border sticky bottom-0 rounded-t-lg border-t p-6 backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" onClick={saveDraft} disabled={saving} variant="outline">
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Draft'}
                  </Button>

                  <Button
                    type="button"
                    onClick={finalize}
                    disabled={!canFinalize || finalizing}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {finalizing ? 'Finalizing...' : 'Finalize Quote'}
                  </Button>

                  {canPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        const id = draftId || (await saveDraft());
                        window.open(`/quotes/${id}/preview`, '_blank', 'noopener');
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {Object.keys(errors).length > 0 && (
                    <Badge variant="destructive">{Object.keys(errors).length} error(s)</Badge>
                  )}
                  {canFinalize && (
                    <Badge variant="default" className="bg-success">
                      Ready to finalize
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}

function ProductPicker({
  value,
  onPick,
  onCreate,
  fetchProducts,
}: {
  value: string;
  onPick: (p: ProductDoc) => void;
  onCreate: (name: string) => Promise<ProductDoc>;
  fetchProducts: (q: string) => Promise<ProductDoc[]>;
}) {
  const [q, setQ] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetchProducts(q);
        setRes(r);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, open, fetchProducts]);

  const showCreate =
    q.trim().length > 0 && !res.some((p) => p.name.toLowerCase() === q.trim().toLowerCase());

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Type to search products…"
        className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
      />
      {open && (
        <div className="bg-popover border-border absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border shadow-lg">
          {loading && (
            <div className="text-muted-foreground p-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="border-primary h-4 w-4 animate-spin rounded-full border-b-2"></div>
                Searching…
              </div>
            </div>
          )}
          {!loading &&
            res.map((p) => (
              <div
                key={p._id}
                className="hover:bg-muted cursor-pointer px-3 py-2 text-sm transition-colors"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(p);
                  setQ(p.name);
                  setOpen(false);
                }}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-muted-foreground text-xs">
                  {p.unitLabel} • {p.defaultPrice.toFixed(3)} {p.isTaxable ? '• Taxable' : ''}
                </div>
              </div>
            ))}
          {!loading && showCreate && (
            <div
              className="border-border hover:bg-muted cursor-pointer border-t px-3 py-2 text-sm transition-colors"
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => {
                const created = await onCreate(q.trim());
                onPick(created);
                setQ(created.name);
                setOpen(false);
              }}
            >
              <div className="text-primary flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create &quot;{q.trim()}&quot;
              </div>
            </div>
          )}
          {!loading && res.length === 0 && !showCreate && (
            <div className="text-muted-foreground p-3 text-sm">No matches found</div>
          )}
        </div>
      )}
    </div>
  );
}
