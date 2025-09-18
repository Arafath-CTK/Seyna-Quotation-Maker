'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, Package } from 'lucide-react';

type Product = {
  _id: string;
  name: string;
  unitLabel: string;
  defaultPrice: number;
  deleted?: boolean;
};

export default function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function openAdd() {
    setEditing({ _id: '', name: '', unitLabel: 'pcs', defaultPrice: 0 });
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setModalOpen(true);
  }

  async function saveProduct(p: Product) {
    const method = p._id ? 'PUT' : 'POST';
    const url = p._id ? `/api/products/${p._id}` : '/api/products';
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
    });
    if (res.ok) {
      setModalOpen(false);
      await loadProducts();
    }
  }

  async function softDelete(id: string) {
    if (!confirm('Mark this product as deleted?')) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadProducts();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="border-accent mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="text-accent h-5 w-5" />
          <h2 className="text-xl font-semibold">Product Catalog</h2>
        </div>
        <button
          onClick={openAdd}
          className="bg-accent hover:bg-accent/90 text-accent-foreground flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="border-border bg-card rounded-2xl border p-12 text-center">
          <Package className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">No products yet</h3>
          <p className="text-muted-foreground mb-6">
            Add your first product to get started with quotes.
          </p>
          <button
            onClick={openAdd}
            className="bg-accent hover:bg-accent/90 text-accent-foreground inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-border border-b">
                <tr>
                  <th className="text-foreground px-6 py-4 text-left text-sm font-medium">Name</th>
                  <th className="text-foreground px-6 py-4 text-center text-sm font-medium">
                    Unit
                  </th>
                  <th className="text-foreground px-6 py-4 text-right text-sm font-medium">
                    Default Price
                  </th>
                  <th className="text-foreground px-6 py-4 text-center text-sm font-medium">
                    Status
                  </th>
                  <th className="text-foreground px-6 py-4 text-center text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {products.map((p) => (
                  <tr
                    key={p._id}
                    className={`hover:bg-muted/30 transition-colors ${p.deleted ? 'opacity-50' : ''}`}
                  >
                    <td className="px-6 py-4 font-medium">{p.name}</td>
                    <td className="text-muted-foreground px-6 py-4 text-center">{p.unitLabel}</td>
                    <td className="px-6 py-4 text-right font-mono">{p.defaultPrice.toFixed(3)}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          p.deleted
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}
                      >
                        {p.deleted ? 'Deleted' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-accent hover:text-accent/80 rounded p-1 transition-colors"
                          title="Edit product"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {!p.deleted && (
                          <button
                            onClick={() => softDelete(p._id)}
                            className="rounded p-1 text-red-600 transition-colors hover:text-red-500"
                            title="Delete product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border-border w-full max-w-md rounded-2xl border shadow-2xl">
            <div className="border-border border-b p-6">
              <h2 className="text-xl font-semibold">
                {editing._id ? 'Edit Product' : 'Add Product'}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {editing._id ? 'Update product details' : 'Add a new product to your catalog'}
              </p>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium">Product Name</label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="border-input bg-background focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Unit Label</label>
                <input
                  value={editing.unitLabel}
                  onChange={(e) => setEditing({ ...editing, unitLabel: e.target.value })}
                  className="border-input bg-background focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  placeholder="e.g., pcs, kg, hours"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Default Price</label>
                <input
                  type="number"
                  step="0.001"
                  value={editing.defaultPrice}
                  onChange={(e) => setEditing({ ...editing, defaultPrice: Number(e.target.value) })}
                  className="border-input bg-background focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  placeholder="0.000"
                />
              </div>
            </div>

            <div className="border-border flex justify-end gap-3 border-t p-6">
              <button
                onClick={() => setModalOpen(false)}
                className="border-border hover:bg-muted/50 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                onClick={() => saveProduct(editing)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <Save className="h-4 w-4" /> Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
