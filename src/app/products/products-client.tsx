'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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

  const columns: Column<Product>[] = [
    {
      key: 'name',
      label: 'Product Name',
      sortable: true,
      render: (product) => <span className="font-medium">{product.name}</span>,
    },
    {
      key: 'unitLabel',
      label: 'Unit',
      sortable: true,
      render: (product) => <span className="text-muted-foreground">{product.unitLabel}</span>,
    },
    {
      key: 'defaultPrice',
      label: 'Default Price',
      sortable: true,
      render: (product) => <span className="font-mono">{product.defaultPrice.toFixed(3)}</span>,
    },
    {
      key: 'deleted',
      label: 'Status',
      sortable: true,
      render: (product) => (
        <Badge variant={product.deleted ? 'destructive' : 'default'}>
          {product.deleted ? 'Deleted' : 'Active'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (product) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(product)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {!product.deleted && (
            <Button variant="ghost" size="sm" onClick={() => softDelete(product._id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Product Management</CardTitle>
              <CardDescription>Manage your product catalog and pricing</CardDescription>
            </div>
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAdd}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing?._id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                  <DialogDescription>
                    {editing?._id
                      ? 'Update product details below.'
                      : 'Enter product details to add to your catalog.'}
                  </DialogDescription>
                </DialogHeader>
                {editing && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name</Label>
                      <Input
                        id="name"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        placeholder="Enter product name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unitLabel">Unit Label</Label>
                      <Input
                        id="unitLabel"
                        value={editing.unitLabel}
                        onChange={(e) => setEditing({ ...editing, unitLabel: e.target.value })}
                        placeholder="e.g., pcs, kg, hours"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="defaultPrice">Default Price</Label>
                      <Input
                        id="defaultPrice"
                        type="number"
                        step="0.001"
                        value={editing.defaultPrice}
                        onChange={(e) =>
                          setEditing({ ...editing, defaultPrice: Number(e.target.value) })
                        }
                        placeholder="0.000"
                      />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => editing && saveProduct(editing)}>
                    {editing?._id ? 'Update Product' : 'Add Product'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={products}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search products..."
            emptyMessage="No products found. Add your first product to get started."
          />
        </CardContent>
      </Card>
    </div>
  );
}
