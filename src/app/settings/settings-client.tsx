'use client';

import { useMemo, useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Building2, FileText, Hash, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SettingsDoc = {
  company: {
    name: string;
    vatNo?: string;
    address?: string[];
    footerText?: string;
    currency: string;
    defaultVatRate: number;
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
    addressText: Yup.string().nullable(),
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
      addressText: (company.address || []).join('\n'),
      footerText: company.footerText || '',
      currency: company.currency || 'BHD',
      defaultVatPercent: Math.round((company.defaultVatRate || 0) * 100 * 1000) / 1000,
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
      defaultVatRate: Number(values.company.defaultVatPercent) / 100,
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

export default function SettingsClient({
  initialSettings,
}: {
  initialSettings: SettingsDoc | null;
}) {
  const initialValues = useMemo(() => toFormValues(initialSettings), [initialSettings]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'company' | 'letterhead' | 'numbering'>('company');

  return (
    <div className="space-y-6">
      <div className="bg-card border-border rounded-lg border p-1">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('company')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-3 font-medium transition-all duration-200 ${
              activeTab === 'company'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Company
          </button>
          <button
            onClick={() => setActiveTab('letterhead')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-3 font-medium transition-all duration-200 ${
              activeTab === 'letterhead'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <FileText className="h-4 w-4" />
            Letterhead
          </button>
          <button
            onClick={() => setActiveTab('numbering')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-3 font-medium transition-all duration-200 ${
              activeTab === 'numbering'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Hash className="h-4 w-4" />
            Numbering
          </button>
        </div>
      </div>

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
        {({
          isSubmitting,
          values,
          setFieldValue,
        }: {
          isSubmitting: boolean;
          values: FormValues;
          setFieldValue: (field: string, value: any) => void;
        }) => (
          <Form className="space-y-6">
            {/* Company Tab */}
            {activeTab === 'company' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <Building2 className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Company Information</CardTitle>
                      <CardDescription>
                        Essential details about your business that appear on quotes
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-8 lg:grid-cols-2">
                    <div className="space-y-4">
                      <label className="text-foreground text-sm font-semibold">
                        Company Name <span className="text-destructive">*</span>
                      </label>
                      <Field
                        name="company.name"
                        className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                        placeholder="Enter your company name"
                      />
                      <ErrorMessage
                        name="company.name"
                        component="p"
                        className="text-destructive flex items-center gap-2 text-xs"
                      >
                        {(msg) => (
                          <>
                            <AlertCircle className="h-3 w-3" />
                            {msg}
                          </>
                        )}
                      </ErrorMessage>
                    </div>

                    <div className="space-y-4">
                      <label className="text-foreground text-sm font-semibold">VAT Number</label>
                      <Field
                        name="company.vatNo"
                        className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                        placeholder="Optional VAT registration number"
                      />
                    </div>

                    <div className="space-y-4 lg:col-span-2">
                      <label className="text-foreground text-sm font-semibold">
                        Business Address
                      </label>
                      <Field
                        as="textarea"
                        name="company.addressText"
                        rows={4}
                        className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full resize-none rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                        placeholder="Enter your complete business address&#10;Each line will appear on a separate line in quotes"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-foreground text-sm font-semibold">
                        Currency <span className="text-destructive">*</span>
                      </label>
                      <Field
                        as="select"
                        name="company.currency"
                        className="border-border bg-input text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                      >
                        {currencies.map((c) => (
                          <option key={c} value={c} className="bg-input text-foreground">
                            {c}
                          </option>
                        ))}
                      </Field>
                    </div>

                    <div className="space-y-4">
                      <label className="text-foreground text-sm font-semibold">
                        Default VAT Rate (%) <span className="text-destructive">*</span>
                      </label>
                      <Field
                        name="company.defaultVatPercent"
                        type="number"
                        step="0.001"
                        min="0"
                        max="100"
                        className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                        placeholder="e.g., 10.0"
                      />
                    </div>

                    <div className="space-y-4 lg:col-span-2">
                      <label className="text-foreground text-sm font-semibold">Footer Text</label>
                      <Field
                        as="textarea"
                        name="company.footerText"
                        rows={3}
                        className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full resize-none rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                        placeholder="Optional footer text that appears at the bottom of quotes"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Letterhead Tab */}
            {activeTab === 'letterhead' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <FileText className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Letterhead & Margins</CardTitle>
                      <CardDescription>
                        Configure document appearance and spacing for professional quotes
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-foreground text-sm font-semibold">
                        Letterhead URL
                      </label>
                      <Field
                        name="letterhead.url"
                        className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                        placeholder="https://example.com/letterhead.png"
                      />
                      <div className="bg-muted/30 rounded-lg p-4">
                        <p className="text-muted-foreground text-sm">
                          📄 Supported formats: PNG, PDF • Recommended size: 800x200px for best
                          results
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-foreground mb-6 text-lg font-semibold">
                        Document Margins
                      </h3>
                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          { name: 'letterhead.margins.top', label: 'Top', icon: '↑' },
                          { name: 'letterhead.margins.right', label: 'Right', icon: '→' },
                          { name: 'letterhead.margins.bottom', label: 'Bottom', icon: '↓' },
                          { name: 'letterhead.margins.left', label: 'Left', icon: '←' },
                        ].map(({ name, label, icon }) => (
                          <div key={name} className="space-y-4">
                            <label className="text-foreground flex items-center gap-2 text-sm font-semibold">
                              <span className="text-primary">{icon}</span>
                              {label}
                            </label>
                            <Field
                              name={name}
                              type="number"
                              min="0"
                              className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                              placeholder="24"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Numbering Tab */}
            {activeTab === 'numbering' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <Hash className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Quote Numbering</CardTitle>
                      <CardDescription>
                        Configure how your quotes are automatically numbered and organized
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-8 lg:grid-cols-2">
                    <div className="space-y-4">
                      <label className="text-foreground text-sm font-semibold">
                        Prefix <span className="text-destructive">*</span>
                      </label>
                      <Field
                        name="numbering.prefix"
                        className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                        placeholder="QF"
                      />
                      <div className="bg-muted/30 rounded-lg p-4">
                        <p className="text-muted-foreground text-sm">
                          📋 Example: &quot;QF&quot; will create quotes like QF-2024-001,
                          QF-2024-002, etc.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center space-y-6">
                      <div className="border-border bg-muted/30 flex items-center justify-between rounded-lg border p-6">
                        <div>
                          <label className="text-foreground text-sm font-semibold">
                            Reset sequence yearly
                          </label>
                          <p className="text-muted-foreground text-sm">
                            Start numbering from 001 each new year
                          </p>
                        </div>
                        <Toggle
                          pressed={values.numbering.yearReset}
                          onPressedChange={(pressed) =>
                            setFieldValue('numbering.yearReset', pressed)
                          }
                          size="default"
                        />
                      </div>

                      <div className="bg-primary/5 rounded-lg p-6">
                        <p className="text-primary text-sm font-medium">Preview:</p>
                        <p className="text-foreground font-mono text-lg">
                          {values.numbering.prefix}-{values.numbering.yearReset ? '2024' : ''}
                          {values.numbering.yearReset ? '-001' : '001'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sticky Save Section */}
            <div className="bg-background/95 border-border sticky bottom-0 rounded-t-lg border-t p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {status === 'saving' && (
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Loader2 className="text-primary h-4 w-4 animate-spin" />
                      <span>Saving changes...</span>
                    </div>
                  )}
                  {status === 'saved' && (
                    <div className="text-success flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span>Settings saved successfully</span>
                    </div>
                  )}
                  {status === 'error' && (
                    <div className="text-destructive flex items-center gap-2 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>Error: {error}</span>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium disabled:opacity-50"
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
          </Form>
        )}
      </Formik>
    </div>
  );
}
