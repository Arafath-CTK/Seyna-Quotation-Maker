'use client';

import { useCallback, useEffect, useState } from 'react';
import { Formik, Form, Field, FieldArray, ErrorMessage, getIn } from 'formik';
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
  Building,
  Mail,
  Phone,
  MapPin,
  Hash,
  DollarSign,
  Percent,
} from 'lucide-react';

/* =========================
   Decimal helpers (3 dp)
   ========================= */
const to3 = (n: any) => {
  const num = Number(n);
  if (!isFinite(num)) return 0;
  return Math.round(num * 1000) / 1000;
};
const add3 = (a: number, b: number) => to3(to3(a) + to3(b));
const mul3 = (a: number, b: number) => to3(to3(a) * to3(b));
const sub3 = (a: number, b: number) => to3(to3(a) - to3(b));

/* =========================
   Totals with decimal guards
   ========================= */
const computeTotals = ({ items, discount, vatRate }: any) => {
  const subtotal = (items as any[]).reduce((sum, item) => {
    return add3(sum, mul3(Number(item.unitPrice) || 0, Number(item.quantity) || 0));
  }, 0);

  let discountAmount = 0;
  if (discount?.type === 'percent') {
    discountAmount = to3(subtotal * (Number(discount.value) / 100));
  } else if (discount?.type === 'amount') {
    discountAmount = to3(Number(discount.value) || 0);
  }

  const afterDiscount = Math.max(0, sub3(subtotal, discountAmount));

  const taxablePortion = (items as any[]).reduce((sum, item) => {
    if (!item.isTaxable) return sum;
    return add3(sum, mul3(Number(item.unitPrice) || 0, Number(item.quantity) || 0));
  }, 0);

  let taxableBase = taxablePortion;
  if (subtotal > 0 && discountAmount > 0) {
    const share = taxablePortion / subtotal;
    taxableBase = Math.max(0, sub3(taxablePortion, to3(discountAmount * share)));
  }

  const vatAmount = Math.max(0, to3(taxableBase * (Number(vatRate) || 0)));
  const grandTotal = add3(afterDiscount, vatAmount);

  return {
    subtotal,
    discountAmount,
    taxableBase,
    vatAmount,
    grandTotal,
  };
};

/* =========================
   Types
   ========================= */
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

/* =========================
   Helpers
   ========================= */
const normalizeName = (s?: string) => (s || '').trim().toLowerCase();
function getDuplicateIndexes(items: any[]): number[] {
  const byId = new Map<string, number>();
  const byName = new Map<string, number>();
  const dups: number[] = [];
  items.forEach((it, i) => {
    const id = it.productId ? String(it.productId) : '';
    const nm = normalizeName(it.productName);
    if (id) {
      if (byId.has(id)) dups.push(i);
      else byId.set(id, i);
    } else if (nm) {
      if (byName.has(nm)) dups.push(i);
      else byName.set(nm, i);
    }
  });
  return dups;
}
function makeAllTouched(values: any): any {
  if (Array.isArray(values)) return values.map((v) => makeAllTouched(v));
  if (values && typeof values === 'object') {
    const out: any = {};
    for (const k of Object.keys(values)) out[k] = makeAllTouched(values[k]);
    return out;
  }
  return true;
}
function isValidItemStrict(it: any) {
  const nameOk = !!it.productName?.trim();
  const qtyOk = Number(it.quantity) > 0;
  const priceOk = Number(it.unitPrice) > 0;
  const unitOk = !!(it.unitLabel || '').toString().trim();
  return nameOk && qtyOk && priceOk && unitOk;
}

/* =========================
   Schemas
   ========================= */
const EditYup = Yup.object({
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
        unitPrice: Yup.number().min(0, 'Unit price must be ≥ 0').required('Unit price is required'),
        quantity: Yup.number().min(0, 'Quantity must be ≥ 0').required('Quantity is required'),
        unitLabel: Yup.string().required('Unit is required'),
        isTaxable: Yup.boolean().required(),
      }),
    )
    .min(1, 'At least one item is required'),
  discount: Yup.object({
    type: Yup.mixed<'none' | 'percent' | 'amount'>()
      .oneOf(['none', 'percent', 'amount'])
      .required(),
    value: Yup.number().min(0, 'Discount value must be ≥ 0').required(),
  }),
  vatPercent: Yup.number()
    .min(0, 'VAT rate must be ≥ 0')
    .max(100, 'VAT rate cannot exceed 100%')
    .required(),
  currency: Yup.string().required('Currency is required'),
  notes: Yup.string().nullable(),
});

const ItemFinalizeYup = Yup.object({
  productName: Yup.string()
    .trim()
    .min(1, 'Product name is required')
    .required('Product name is required'),
  unitPrice: Yup.number()
    .moreThan(0, 'Unit price must be greater than 0')
    .required('Unit price is required'),
  quantity: Yup.number()
    .moreThan(0, 'Quantity must be greater than 0')
    .required('Quantity is required'),
  unitLabel: Yup.string().trim().min(1, 'Unit is required').required('Unit is required'),
  isTaxable: Yup.boolean().required(),
});

const FinalizeYup = Yup.object({
  customer: Yup.object({
    name: Yup.string()
      .trim()
      .min(1, 'Customer name is required')
      .required('Customer name is required'),
    vatNo: Yup.string().nullable(),
    addressText: Yup.string().nullable(),
    contactName: Yup.string().nullable(),
    phone: Yup.string().nullable(),
    email: Yup.string().email('Please enter a valid email address').nullable(),
  }),
  items: Yup.array().of(ItemFinalizeYup).min(1, 'At least one item is required'),
  discount: Yup.object({
    type: Yup.mixed<'none' | 'percent' | 'amount'>()
      .oneOf(['none', 'percent', 'amount'])
      .required(),
    value: Yup.number()
      .required('Discount value is required')
      .when('type', {
        is: 'percent',
        then: (s) => s.min(0, 'Discount must be ≥ 0').max(100, 'Percentage cannot exceed 100'),
        otherwise: (s) => s.min(0, 'Discount must be ≥ 0'),
      }),
  }),
  vatPercent: Yup.number()
    .min(0, 'VAT rate must be ≥ 0')
    .max(100, 'VAT rate cannot exceed 100%')
    .required(),
  currency: Yup.string().required('Currency is required'),
  notes: Yup.string().nullable(),
}).test('discount-not-over-subtotal', 'Discount cannot exceed subtotal', (value) => {
  if (!value) return true;
  const items = (value.items || []) as any[];
  const subtotal = items.reduce(
    (sum, it) => add3(sum, mul3(Number(it.unitPrice) || 0, Number(it.quantity) || 0)),
    0,
  );
  const t = value.discount?.type;
  const v = Number(value.discount?.value || 0);
  if (t === 'amount') return v <= subtotal;
  return true;
});

/* =========================
   Init / payload
   ========================= */
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
    discount: { ...values.discount, value: to3(values.discount.value) || 0 },
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
      unitPrice: to3(it.unitPrice) || 0,
      quantity: to3(it.quantity) || 0,
      unitLabel: it.unitLabel || 'pcs',
      isTaxable: !!it.isTaxable,
    })),
  };
}

/* =========================
   Focus & error utils
   ========================= */
function focusByPath(path: string) {
  const m = path.match(/^items\.(\d+)\.(\w+)/);
  if (m) {
    const idx = Number(m[1]);
    const field = m[2];
    if (field === 'productName') {
      const el = document.getElementById(`product-input-${idx}`) as HTMLInputElement | null;
      if (el) {
        el.scrollIntoView({ block: 'center' });
        el.focus();
        return;
      }
    }
  }
  const el = document.querySelector<HTMLElement>(`[name="${path}"]`);
  if (el) {
    el.scrollIntoView({ block: 'center' });
    (el as HTMLInputElement).focus?.();
  }
}
function firstErrorPath(errObj: any, prefix = ''): string | null {
  if (!errObj) return null;
  if (typeof errObj === 'string') return prefix || null;
  if (Array.isArray(errObj)) {
    for (let i = 0; i < errObj.length; i++) {
      const p = firstErrorPath(errObj[i], `${prefix ? prefix + '.' : ''}${i}`);
      if (p) return p;
    }
    return null;
  }
  if (typeof errObj === 'object') {
    for (const k of Object.keys(errObj)) {
      const p = firstErrorPath(errObj[k], `${prefix ? prefix + '.' : ''}${k}`);
      if (p) return p;
    }
  }
  return null;
}
function yupToFormikErrors(yupErr: any) {
  const errors: any = {};
  if (yupErr?.inner?.length) {
    for (const e of yupErr.inner) {
      const path = e.path || '';
      if (!path) continue;
      const segs = path.split('.');
      let node = errors;
      for (let i = 0; i < segs.length - 1; i++) {
        const s = segs[i];
        node[s] ??= Number.isInteger(Number(segs[i + 1])) ? [] : {};
        node = node[s];
      }
      node[segs[segs.length - 1]] = e.message;
    }
  } else if (yupErr?.path) {
    errors[yupErr.path] = yupErr.message;
  }
  return errors;
}
/* flatten a subset of errors for bottom list */
function flattenErrors(err: any, pathPrefix = ''): string[] {
  if (!err) return [];
  if (typeof err === 'string') return [err];
  if (Array.isArray(err)) {
    return err.flatMap((e, i) => flattenErrors(e, `${pathPrefix} ${i + 1}`.trim()));
  }
  if (typeof err === 'object') {
    return Object.entries(err).flatMap(([k, v]) =>
      flattenErrors(v as any, pathPrefix ? `${pathPrefix}.${k}` : k),
    );
  }
  return [];
}

/* =========================
   Component
   ========================= */
export default function ComposerClient({ initialId }: { initialId?: string }) {
  const [draftId, setDraftId] = useState<string | undefined>(initialId);
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState<any>(toInitialValues());
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'items'>('customer');

  useEffect(() => {
    const load = async () => {
      if (!initialId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/quotes/${initialId}`);
        if (res.ok) {
          const doc = await res.json();
          setInitial(toInitialValues(doc));
          setDraftId(initialId);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [initialId]);

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

  const saveDraft = async (values: any) => {
    setSaving(true);
    try {
      const payload = valuesToPayload(values);

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
        validationSchema={EditYup}
        validateOnBlur
        validateOnChange
        onSubmit={() => {}}
      >
        {({ values, setFieldValue, errors, touched, setTouched, setErrors }) => {
          const totals = computeTotals({
            items: (values.items || []) as any,
            discount: values.discount,
            vatRate: Number(values.vatPercent) / 100,
          });

          const canDraft = () => {
            const hasCustomer = !!values?.customer?.name?.trim();
            const badRow = (values.items as QuoteItem[]).some(
              (it) => Number(it.unitPrice) < 0 || Number(it.quantity) < 0,
            );
            return hasCustomer && !badRow;
          };

          const hasCustomer = !!values?.customer?.name?.trim();
          const itemsArr = (values.items || []) as QuoteItem[];
          const allStrict = itemsArr.length > 0 && itemsArr.every(isValidItemStrict);
          const hasDupes = getDuplicateIndexes(itemsArr).length > 0;
          const canFinalizeVisual = hasCustomer && allStrict && !hasDupes;

          /** strict validation + UX before finalize */
          const handleFinalize = async () => {
            setTouched(makeAllTouched(values), true);

            let strictErrors: any = {};
            try {
              await FinalizeYup.validate(values, { abortEarly: false });
            } catch (yupErr: any) {
              strictErrors = yupToFormikErrors(yupErr);
            }

            // add duplicate errors
            const dupIdxs = getDuplicateIndexes(values.items || []);
            if (dupIdxs.length) {
              strictErrors.items ??= [];
              dupIdxs.forEach((idx) => {
                strictErrors.items[idx] ??= {};
                strictErrors.items[idx].productName = 'Duplicate product in quote';
              });
            }

            setErrors(strictErrors);
            const firstPath = firstErrorPath(strictErrors) || '';
            if (firstPath) {
              if (firstPath.startsWith('items.')) setActiveTab('items');
              else setActiveTab('customer');
              focusByPath(firstPath);
              return;
            }

            setFinalizing(true);
            try {
              const id = await saveDraft(values);
              const res = await fetch(`/api/quotes/${id}/finalize`, { method: 'POST' });
              const data = await res.json();
              if (!res.ok) throw new Error(data?.error || 'Finalize failed');
              window.location.href = `/quotes/${id}/preview`;
            } finally {
              setFinalizing(false);
            }
          };

          const draftAndExit = async () => {
            if (!canDraft) return;
            const id = await saveDraft(values);
            window.location.href = '/quotations';
            return id;
          };

          // already added products for filtering suggestions
          const existingIds = new Set<string>(
            (values.items || [])
              .map((it: any) => (it.productId ? String(it.productId) : ''))
              .filter(Boolean),
          );
          const existingNames = new Set<string>(
            (values.items || []).map((it: any) => normalizeName(it.productName)).filter(Boolean),
          );

          return (
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
                          <Field name="customer.name">
                            {({ field }: any) => (
                              <input
                                {...field}
                                className={`bg-input w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2 ${
                                  getIn(touched, 'customer.name') && getIn(errors, 'customer.name')
                                    ? 'border-destructive focus:ring-destructive/50'
                                    : 'border-border focus:ring-ring'
                                }`}
                                placeholder="Enter company or client name"
                              />
                            )}
                          </Field>
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
                          <Field name="customer.vatNo">
                            {({ field }: any) => (
                              <input
                                {...field}
                                className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                                placeholder="VAT number (optional)"
                              />
                            )}
                          </Field>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <Phone className="h-4 w-4" />
                            Phone Number
                          </label>
                          <Field name="customer.phone">
                            {({ field }: any) => (
                              <input
                                {...field}
                                className="bg-input border-border focus:ring-ring w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                                placeholder="+1 (555) 123-4567"
                              />
                            )}
                          </Field>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <Mail className="h-4 w-4" />
                            Email Address
                          </label>
                          <Field name="customer.email">
                            {({ field }: any) => (
                              <input
                                {...field}
                                type="email"
                                className={`bg-input w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2 ${
                                  getIn(touched, 'customer.email') &&
                                  getIn(errors, 'customer.email')
                                    ? 'border-destructive focus:ring-destructive/50'
                                    : 'border-border focus:ring-ring'
                                }`}
                                placeholder="client@company.com"
                              />
                            )}
                          </Field>
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
                          <Field name="customer.addressText">
                            {({ field }: any) => (
                              <textarea
                                {...field}
                                rows={4}
                                className="bg-input border-border focus:ring-ring w-full resize-none rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                                placeholder="Enter billing address (one line per field)&#10;123 Business Street&#10;Suite 100&#10;City, State 12345&#10;Country"
                              />
                            )}
                          </Field>
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
                            <CardDescription>
                              Add products and services to your quote
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <FieldArray name="items">
                          {(helpers) => (
                            <div className="space-y-4">
                              {(values.items as QuoteItem[]).map((item, idx) => {
                                const priceErr = getIn(errors, `items.${idx}.unitPrice`);
                                const priceTouched = getIn(touched, `items.${idx}.unitPrice`);
                                const qtyErr = getIn(errors, `items.${idx}.quantity`);
                                const qtyTouched = getIn(touched, `items.${idx}.quantity`);
                                const unitErr = getIn(errors, `items.${idx}.unitLabel`);
                                const unitTouched = getIn(touched, `items.${idx}.unitLabel`);
                                const nameErr = getIn(errors, `items.${idx}.productName`);
                                const nameTouched = getIn(touched, `items.${idx}.productName`);

                                return (
                                  <div
                                    key={idx}
                                    className="bg-muted/30 border-border rounded-lg border p-4"
                                  >
                                    <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
                                      <div className="space-y-2 lg:col-span-4">
                                        <label className="text-sm font-medium">
                                          Product/Service *
                                        </label>
                                        <Field name={`items.${idx}.productName`} type="hidden" />
                                        <ProductPicker
                                          index={idx}
                                          value={(values.items[idx] as any).productName}
                                          fetchProducts={searchProducts}
                                          excludeIds={existingIds}
                                          excludeNames={existingNames}
                                          onPick={(p) => {
                                            const exists = (values.items as any[]).some(
                                              (it, i) =>
                                                i !== idx &&
                                                ((p._id && it.productId === p._id) ||
                                                  normalizeName(it.productName) ===
                                                    normalizeName(p.name)),
                                            );
                                            if (exists) {
                                              {
                                                const next: any = { ...(errors as any) };
                                                next.items ??= [];
                                                next.items[idx] ??= {};
                                                next.items[idx].productName =
                                                  'Duplicate product in quote';
                                                setErrors(next);
                                              }
                                              focusByPath(`items.${idx}.productName`);
                                              return;
                                            }
                                            setFieldValue(`items.${idx}.productId`, p._id);
                                            setFieldValue(`items.${idx}.productName`, p.name);
                                            setFieldValue(
                                              `items.${idx}.unitPrice`,
                                              to3(p.defaultPrice),
                                            );
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
                                            const normalized = normalizeName(name);
                                            const exists = (values.items as any[]).some(
                                              (it) => normalizeName(it.productName) === normalized,
                                            );
                                            if (exists) {
                                              {
                                                const next: any = { ...(errors as any) };
                                                next.items ??= [];
                                                next.items[idx] ??= {};
                                                next.items[idx].productName =
                                                  'Duplicate product in quote';
                                                setErrors(next);
                                              }
                                              focusByPath(`items.${idx}.productName`);
                                              throw new Error('duplicate-product');
                                            }
                                            const res = await fetch('/api/products', {
                                              method: 'POST',
                                              headers: { 'content-type': 'application/json' },
                                              body: JSON.stringify({
                                                name,
                                                unitLabel:
                                                  (values.items[idx] as any).unitLabel || 'pcs',
                                                defaultPrice:
                                                  to3((values.items[idx] as any).unitPrice) || 0,
                                              }),
                                            });
                                            if (!res.ok) {
                                              const data = await res.json().catch(() => ({}));
                                              throw new Error(
                                                data?.error || 'Create product failed',
                                              );
                                            }
                                            const data = await res.json();
                                            return {
                                              _id: data.id,
                                              name,
                                              unitLabel:
                                                (values.items[idx] as any).unitLabel || 'pcs',
                                              defaultPrice:
                                                to3((values.items[idx] as any).unitPrice) || 0,
                                              isTaxable: true,
                                            } as ProductDoc;
                                          }}
                                        />
                                        {nameTouched && nameErr && (
                                          <p className="text-destructive text-sm">{nameErr}</p>
                                        )}
                                      </div>

                                      <div className="space-y-2 lg:col-span-2">
                                        <label className="flex items-center gap-2 text-sm font-medium">
                                          <DollarSign className="h-4 w-4" />
                                          Unit Price
                                        </label>
                                        <Field name={`items.${idx}.unitPrice`}>
                                          {({ field }: any) => (
                                            <input
                                              {...field}
                                              type="number"
                                              inputMode="decimal"
                                              step="0.001"
                                              onBlur={(e) => {
                                                const v = to3(e.target.value);
                                                setFieldValue(`items.${idx}.unitPrice`, v);
                                              }}
                                              className={`bg-input w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2 ${
                                                priceTouched && priceErr
                                                  ? 'border-destructive focus:ring-destructive/50'
                                                  : 'border-border focus:ring-ring'
                                              }`}
                                            />
                                          )}
                                        </Field>
                                        {priceTouched && priceErr && (
                                          <p className="text-destructive text-sm">
                                            {String(priceErr)}
                                          </p>
                                        )}
                                      </div>

                                      <div className="space-y-2 lg:col-span-2">
                                        <label className="text-sm font-medium">Quantity</label>
                                        <Field name={`items.${idx}.quantity`}>
                                          {({ field }: any) => (
                                            <input
                                              {...field}
                                              type="number"
                                              inputMode="decimal"
                                              step="0.001"
                                              onBlur={(e) => {
                                                const v = to3(e.target.value);
                                                setFieldValue(`items.${idx}.quantity`, v);
                                              }}
                                              className={`bg-input w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2 ${
                                                qtyTouched && qtyErr
                                                  ? 'border-destructive focus:ring-destructive/50'
                                                  : 'border-border focus:ring-ring'
                                              }`}
                                            />
                                          )}
                                        </Field>
                                        {qtyTouched && qtyErr && (
                                          <p className="text-destructive text-sm">
                                            {String(qtyErr)}
                                          </p>
                                        )}
                                      </div>

                                      <div className="space-y-2 lg:col-span-2">
                                        <label className="text-sm font-medium">Unit</label>
                                        <Field name={`items.${idx}.unitLabel`}>
                                          {({ field }: any) => (
                                            <input
                                              {...field}
                                              className={`bg-input w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2 ${
                                                unitTouched && unitErr
                                                  ? 'border-destructive focus:ring-destructive/50'
                                                  : 'border-border focus:ring-ring'
                                              }`}
                                              placeholder="pcs, hrs, etc."
                                            />
                                          )}
                                        </Field>
                                        {unitTouched && unitErr && (
                                          <p className="text-destructive text-sm">
                                            {String(unitErr)}
                                          </p>
                                        )}
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
                                );
                              })}

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
                            <CardDescription>
                              Set currency, tax rates, and discounts
                            </CardDescription>
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
                            <Field name="vatPercent">
                              {({ field }: any) => (
                                <input
                                  {...field}
                                  type="number"
                                  inputMode="decimal"
                                  step="0.001"
                                  min="0"
                                  onBlur={(e) => setFieldValue('vatPercent', to3(e.target.value))}
                                  className={`bg-input w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2 ${
                                    getIn(touched, 'vatPercent') && getIn(errors, 'vatPercent')
                                      ? 'border-destructive focus:ring-destructive/50'
                                      : 'border-border focus:ring-ring'
                                  }`}
                                />
                              )}
                            </Field>
                            <ErrorMessage
                              name="vatPercent"
                              component="p"
                              className="text-destructive text-sm"
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
                            <Field name="discount.value">
                              {({ field }: any) => (
                                <input
                                  {...field}
                                  type="number"
                                  inputMode="decimal"
                                  step="0.001"
                                  min="0"
                                  onBlur={(e) =>
                                    setFieldValue('discount.value', to3(e.target.value))
                                  }
                                  className={`bg-input w-full rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2 ${
                                    getIn(touched, 'discount.value') &&
                                    getIn(errors, 'discount.value')
                                      ? 'border-destructive focus:ring-destructive/50'
                                      : 'border-border focus:ring-ring'
                                  }`}
                                />
                              )}
                            </Field>
                            <ErrorMessage
                              name="discount.value"
                              component="p"
                              className="text-destructive text-sm"
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
                        <Field name="notes">
                          {({ field }: any) => (
                            <textarea
                              {...field}
                              rows={4}
                              className="bg-input border-border focus:ring-ring w-full resize-none rounded-lg border px-3 py-2 transition-all focus:border-transparent focus:ring-2"
                              placeholder="Enter any additional notes, terms, or conditions for this quote..."
                            />
                          )}
                        </Field>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* ===== Bottom sticky actions with explicit error list ===== */}
              <div className="bg-background/95 border-border sticky bottom-0 rounded-t-lg border-t p-6 backdrop-blur-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={draftAndExit}
                      disabled={!canDraft || saving}
                      variant="outline"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Saving...' : 'Save Draft'}
                    </Button>

                    <Button
                      type="button"
                      onClick={handleFinalize}
                      disabled={finalizing || !canFinalizeVisual}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {finalizing ? 'Finalizing...' : 'Finalize Quote'}
                    </Button>
                  </div>

                  {/* Concrete error summaries (first 5) */}
                  <div className="flex-1">
                    {Object.keys(errors).length > 0 ? (
                      <div className="bg-destructive/10 text-destructive border-destructive/30 max-h-28 overflow-auto rounded-lg border px-3 py-2 text-sm">
                        <ul className="list-disc pl-5">
                          {flattenErrors(errors)
                            .filter(Boolean)
                            .slice(0, 8)
                            .map((msg, i) => (
                              <li key={i}>{String(msg)}</li>
                            ))}
                        </ul>
                      </div>
                    ) : canFinalizeVisual ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-success">
                          Ready to finalize
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
}

/* =========================
   ProductPicker
   - excludes already-added products from suggestions
   - keeps id for focusing
   ========================= */
function ProductPicker({
  index,
  value,
  onPick,
  onCreate,
  fetchProducts,
  excludeIds,
  excludeNames,
}: {
  index: number;
  value: string;
  onPick: (p: ProductDoc) => void;
  onCreate: (name: string) => Promise<ProductDoc>;
  fetchProducts: (q: string) => Promise<ProductDoc[]>;
  excludeIds: Set<string>;
  excludeNames: Set<string>;
}) {
  const [q, setQ] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQ(value || '');
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetchProducts(q);
        // filter out already-added products
        const filtered = r.filter((p) => {
          if (excludeIds.has(String(p._id))) return false;
          if (excludeNames.has(normalizeName(p.name))) return false;
          return true;
        });
        setRes(filtered);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, open, fetchProducts, excludeIds, excludeNames]);

  const showCreate =
    q.trim().length > 0 &&
    !res.some((p) => normalizeName(p.name) === normalizeName(q)) &&
    !excludeNames.has(normalizeName(q));

  return (
    <div className="relative">
      <input
        id={`product-input-${index}`}
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
                  onPick({ ...p, defaultPrice: to3(p.defaultPrice) });
                  setQ(p.name);
                  setOpen(false);
                }}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-muted-foreground text-xs">
                  {p.unitLabel} • {to3(p.defaultPrice).toFixed(3)} {p.isTaxable ? '• Taxable' : ''}
                </div>
              </div>
            ))}
          {!loading && showCreate && (
            <div
              className="border-border hover:bg-muted cursor-pointer border-t px-3 py-2 text-sm transition-colors"
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => {
                try {
                  const created = await onCreate(q.trim());
                  onPick({ ...created, defaultPrice: to3(created.defaultPrice) });
                  setQ(created.name);
                  setOpen(false);
                } catch {
                  /* swallow duplicate/create errors */
                }
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
