'use client';

import { useMemo, useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Building2, FileText, Hash, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type SettingsDoc = {
  company: {
    name: string;
    vatNo?: string;
    address?: string[]; // Stored as array
    footerText?: string;
    currency: string;
    defaultVatRate: number; // Stored as decimal (0.1 = 10%)
  };
  letterhead?: {
    url?: string;
    margins?: { top: number; right: number; bottom: number; left: number };
  };
  numbering?: {
    prefix?: string;
    yearReset?: boolean;
  };
};

const currencies = ['BHD', 'USD', 'EUR', 'INR', 'AED'];

const SettingsYup = Yup.object({
  company: Yup.object({
    name: Yup.string().required('Company name is required'),
    vatNo: Yup.string().nullable(),
    addressText: Yup.string().nullable(), // UI-only textarea; we’ll split to array
    footerText: Yup.string().nullable(),
    currency: Yup.string().required('Currency is required'),
    defaultVatPercent: Yup.number()
      .min(0, 'Must be >= 0')
      .max(100, 'Must be <= 100')
      .required('VAT % is required'),
  }),
  letterhead: Yup.object({
    url: Yup.string().url('Must be a valid URL').nullable().default(''),
    margins: Yup.object({
      top: Yup.number().min(0).required(),
      right: Yup.number().min(0).required(),
      bottom: Yup.number().min(0).required(),
      left: Yup.number().min(0).required(),
    }),
  }),
  numbering: Yup.object({
    prefix: Yup.string().required('Prefix is required'),
    yearReset: Yup.boolean().required(),
  }),
});

function toFormValues(db: SettingsDoc | null) {
  const company = db?.company || {
    name: '',
    vatNo: '',
    address: [],
    footerText: '',
    currency: 'BHD',
    defaultVatRate: 0.1,
  };
  const letterhead = db?.letterhead || {
    url: '',
    margins: { top: 24, right: 24, bottom: 24, left: 24 },
  };
  const numbering = db?.numbering || { prefix: 'QF', yearReset: true };

  return {
    company: {
      name: company.name,
      vatNo: company.vatNo || '',
      addressText: (company.address || []).join('\n'), // textarea
      footerText: company.footerText || '',
      currency: company.currency || 'BHD',
      defaultVatPercent: Math.round((company.defaultVatRate || 0) * 100 * 1000) / 1000, // show as %
    },
    letterhead: {
      url: letterhead.url || '',
      margins: { ...letterhead.margins },
    },
    numbering: {
      prefix: numbering.prefix || 'QF',
      yearReset: !!numbering.yearReset,
    },
  };
}

type FormValues = ReturnType<typeof toFormValues>;

function toPayload(values: FormValues): SettingsDoc {
  return {
    company: {
      name: values.company.name,
      vatNo: values.company.vatNo || '',
      address: (values.company.addressText || '')
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean),
      footerText: values.company.footerText || '',
      currency: values.company.currency,
      defaultVatRate: Number(values.company.defaultVatPercent) / 100, // convert % -> decimal
    },
    letterhead: {
      url: values.letterhead.url || '',
      margins: {
        top: Number(values.letterhead.margins.top) || 0,
        right: Number(values.letterhead.margins.right) || 0,
        bottom: Number(values.letterhead.margins.bottom) || 0,
        left: Number(values.letterhead.margins.left) || 0,
      },
    },
    numbering: {
      prefix: values.numbering.prefix,
      yearReset: !!values.numbering.yearReset,
    },
  };
}

export default function SettingsForm({ initialSettings }: { initialSettings: SettingsDoc | null }) {
  const initialValues = useMemo(() => toFormValues(initialSettings), [initialSettings]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize
      validationSchema={SettingsYup}
      onSubmit={async (
        values: FormValues,
        { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void },
      ) => {
        setSubmitting(true);
        setStatus('saving');
        setError(null);
        try {
          const payload = toPayload(values);
          const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error || 'Failed to save');
          }
          setStatus('saved');
        } catch (e: unknown) {
          setStatus('error');
          setError(
            e &&
              typeof e === 'object' &&
              'message' in e &&
              typeof (e as { message?: unknown }).message === 'string'
              ? (e as { message: string }).message
              : 'Save failed',
          );
        } finally {
          setSubmitting(false);
          setTimeout(() => setStatus('idle'), 3000);
        }
      }}
    >
      {({ isSubmitting }: { isSubmitting: boolean }) => (
        <Form className="space-y-8">
          <section id="company" className="group">
            <div className="border-border bg-card rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="border-border/50 from-accent/5 border-b bg-gradient-to-r to-transparent p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-accent/10 text-accent flex h-10 w-10 items-center justify-center rounded-xl">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-card-foreground text-xl font-semibold">
                      Company Information
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Basic details about your business
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-card-foreground text-sm font-medium">
                      Company Name <span className="text-destructive">*</span>
                    </label>
                    <Field
                      name="company.name"
                      className="border-input bg-input placeholder:text-muted-foreground focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                      placeholder="Enter your company name"
                    />
                    <ErrorMessage
                      name="company.name"
                      component="p"
                      className="text-destructive flex items-center gap-1 text-xs"
                    >
                      {(msg) => (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          {msg}
                        </>
                      )}
                    </ErrorMessage>
                  </div>

                  <div className="space-y-2">
                    <label className="text-card-foreground text-sm font-medium">VAT Number</label>
                    <Field
                      name="company.vatNo"
                      className="border-input bg-input placeholder:text-muted-foreground focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                      placeholder="Optional VAT number"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-card-foreground text-sm font-medium">
                      Business Address
                    </label>
                    <Field
                      as="textarea"
                      name="company.addressText"
                      rows={4}
                      className="border-input bg-input placeholder:text-muted-foreground focus:border-accent focus:ring-accent/20 w-full resize-none rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                      placeholder="Enter your business address (one line per row)"
                    />
                    <p className="text-muted-foreground text-xs">
                      Enter each line of your address on a separate line
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-card-foreground text-sm font-medium">
                      Currency <span className="text-destructive">*</span>
                    </label>
                    <Field
                      as="select"
                      name="company.currency"
                      className="border-input bg-input focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                    >
                      {currencies.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage
                      name="company.currency"
                      component="p"
                      className="text-destructive flex items-center gap-1 text-xs"
                    >
                      {(msg) => (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          {msg}
                        </>
                      )}
                    </ErrorMessage>
                  </div>

                  <div className="space-y-2">
                    <label className="text-card-foreground text-sm font-medium">
                      Default VAT Rate (%) <span className="text-destructive">*</span>
                    </label>
                    <Field
                      name="company.defaultVatPercent"
                      type="number"
                      step="0.001"
                      min="0"
                      max="100"
                      className="border-input bg-input placeholder:text-muted-foreground focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                      placeholder="e.g., 10.0"
                    />
                    <ErrorMessage
                      name="company.defaultVatPercent"
                      component="p"
                      className="text-destructive flex items-center gap-1 text-xs"
                    >
                      {(msg) => (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          {msg}
                        </>
                      )}
                    </ErrorMessage>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-card-foreground text-sm font-medium">Footer Text</label>
                    <Field
                      as="textarea"
                      name="company.footerText"
                      rows={3}
                      className="border-input bg-input placeholder:text-muted-foreground focus:border-accent focus:ring-accent/20 w-full resize-none rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                      placeholder="Optional footer text for documents"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="letterhead" className="group">
            <div className="border-border bg-card rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="border-border/50 from-accent/5 border-b bg-gradient-to-r to-transparent p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-accent/10 text-accent flex h-10 w-10 items-center justify-center rounded-xl">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-card-foreground text-xl font-semibold">
                      Letterhead & Margins
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Configure document appearance and spacing
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <label className="text-card-foreground text-sm font-medium">
                      Letterhead URL
                    </label>
                    <Field
                      name="letterhead.url"
                      className="border-input bg-input placeholder:text-muted-foreground focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                      placeholder="https://example.com/letterhead.png"
                    />
                    <ErrorMessage
                      name="letterhead.url"
                      component="p"
                      className="text-destructive flex items-center gap-1 text-xs"
                    >
                      {(msg) => (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          {msg}
                        </>
                      )}
                    </ErrorMessage>
                    <p className="text-muted-foreground text-xs">Supported formats: PNG, PDF</p>
                  </div>

                  <div>
                    <h3 className="text-card-foreground mb-4 text-sm font-medium">
                      Document Margins (pixels)
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        { name: 'letterhead.margins.top', label: 'Top' },
                        { name: 'letterhead.margins.right', label: 'Right' },
                        { name: 'letterhead.margins.bottom', label: 'Bottom' },
                        { name: 'letterhead.margins.left', label: 'Left' },
                      ].map(({ name, label }) => (
                        <div key={name} className="space-y-2">
                          <label className="text-card-foreground text-sm font-medium">
                            {label}
                          </label>
                          <Field
                            name={name}
                            type="number"
                            min="0"
                            className="border-input bg-input placeholder:text-muted-foreground focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                            placeholder="24"
                          />
                          <ErrorMessage
                            name={name}
                            component="p"
                            className="text-destructive flex items-center gap-1 text-xs"
                          >
                            {(msg) => (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                {msg}
                              </>
                            )}
                          </ErrorMessage>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="numbering" className="group">
            <div className="border-border bg-card rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="border-border/50 from-accent/5 border-b bg-gradient-to-r to-transparent p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-accent/10 text-accent flex h-10 w-10 items-center justify-center rounded-xl">
                    <Hash className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-card-foreground text-xl font-semibold">Quote Numbering</h2>
                    <p className="text-muted-foreground text-sm">
                      Configure how quotes are numbered
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-card-foreground text-sm font-medium">
                      Prefix <span className="text-destructive">*</span>
                    </label>
                    <Field
                      name="numbering.prefix"
                      className="border-input bg-input placeholder:text-muted-foreground focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                      placeholder="QF"
                    />
                    <ErrorMessage
                      name="numbering.prefix"
                      component="p"
                      className="text-destructive flex items-center gap-1 text-xs"
                    >
                      {(msg) => (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          {msg}
                        </>
                      )}
                    </ErrorMessage>
                    <p className="text-muted-foreground text-xs">
                      This will appear before the quote number (e.g., QF-2024-001)
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 pt-8">
                    <Field
                      id="yearReset"
                      name="numbering.yearReset"
                      type="checkbox"
                      className="border-input text-accent focus:ring-accent/20 h-5 w-5 rounded focus:ring-2 focus:ring-offset-2"
                    />
                    <div>
                      <label
                        htmlFor="yearReset"
                        className="text-card-foreground cursor-pointer text-sm font-medium"
                      >
                        Reset sequence yearly
                      </label>
                      <p className="text-muted-foreground text-xs">
                        Start numbering from 1 each new year
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="sticky bottom-6 z-10">
            <div className="border-border bg-card/95 rounded-2xl border p-6 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {status === 'saving' && (
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving changes...
                    </div>
                  )}
                  {status === 'saved' && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Settings saved successfully
                    </div>
                  )}
                  {status === 'error' && (
                    <div className="text-destructive flex items-center gap-2 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      Error: {error}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 focus:ring-accent/20 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium shadow-sm transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
}
